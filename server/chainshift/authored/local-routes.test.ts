import {it,expect} from 'vitest';
import express from 'express';
import request from 'supertest';
import {randomUUID} from 'node:crypto';
import {localAuthoredRoutes} from './local-routes';
import {AuthoredService,FixedError} from './service';
const origin='http://127.0.0.1:5270';
function fixture(){const service=new AuthoredService(()=>Date.parse('2026-10-28T16:00:00Z'));const app=express();app.use('/api/chainshift-authored',localAuthoredRoutes(service,origin,async(req,write)=>{if(req.headers.cookie!=='synthetic=verified')throw new FixedError('expired_session');if(req.headers['x-arcade-player']!=='a')throw new FixedError('account_changed');if(write&&req.headers['x-arcade-csrf']!=='test-csrf')throw new FixedError('csrf_invalid');return {id:'a',name:'Local A'};}));return {service,app};}
const headers={'X-Arcade-Request':'1','X-Arcade-Origin':origin,'X-Arcade-Player':'a','X-Arcade-CSRF':'test-csrf',Origin:origin,Cookie:'synthetic=verified'};
it('safe authenticated home has five masked answers and no answer bank or certificate',async()=>{
 const {app}=fixture();const r=await request(app).get('/api/chainshift-authored/home').set(headers).expect(200);expect(r.headers['cache-control']).toBe('no-store');expect(r.body.daily.slots.filter((s:{endpoint:boolean})=>!s.endpoint)).toHaveLength(5);expect(JSON.stringify(r.body.daily)).not.toMatch(/CLUB|HOUSE|PARTY|LINE|DANCE|certificate|editorial|phrases|source/);expect(r.body.practice).toHaveLength(8);
});
it('rejects missing/foreign origin, missing session, player switch, wrong CSRF and score/time injection',async()=>{
 const {app}=fixture();await request(app).get('/api/chainshift-authored/home').expect(403);await request(app).get('/api/chainshift-authored/home').set({...headers,'X-Arcade-Origin':'https://foreign.invalid'}).expect(403);await request(app).get('/api/chainshift-authored/home').set({...headers,Cookie:'synthetic=wrong'}).expect(403);
 await request(app).get('/api/chainshift-authored/home').set({...headers,'X-Arcade-Player':'b'}).expect(403);
 const home=(await request(app).get('/api/chainshift-authored/home').set(headers)).body,path='/api/chainshift-authored/attempt/'+home.daily.id+'/action';
 const body={requestId:randomUUID(),revision:0,action:{kind:'start'}};
 await request(app).post(path).set({...headers,'X-Arcade-CSRF':'wrong'}).send(body).expect(403);await request(app).post(path).set(headers).send({...body,score:10000,elapsedMs:0}).expect(400);await request(app).post(path).set(headers).send({...body,action:{kind:'start',now:0}}).expect(400);await request(app).post(path).set(headers).send(body).expect(200);
});
it('same-id HTTP hint retry is one charge; practice cannot reveal the daily answer or join its board',async()=>{
 const {app}=fixture();let v=(await request(app).get('/api/chainshift-authored/home').set(headers)).body.daily;const action=async(body:object)=>request(app).post('/api/chainshift-authored/attempt/'+v.id+'/action').set(headers).send(body).expect(200);
 v=(await action({requestId:randomUUID(),revision:v.revision,action:{kind:'start'}})).body;const hint={requestId:randomUUID(),revision:v.revision,action:{kind:'hint'}};const first=(await action(hint)).body,second=(await action(hint)).body;expect(second.hints).toBe(1);expect(second.revision).toBe(first.revision);expect(second.slots[1].display).toBe('CL__');
 await request(app).post('/api/chainshift-authored/practice').set(headers).send({puzzleId:v.puzzle.id,requestId:randomUUID()}).expect(400);
 const practice=(await request(app).post('/api/chainshift-authored/practice').set(headers).send({puzzleId:'authored-p01',requestId:randomUUID()}).expect(200)).body;
 await request(app).get('/api/chainshift-authored/attempt/'+practice.id+'/board').set(headers).expect(409);
 const board=(await request(app).get('/api/chainshift-authored/attempt/'+v.id+'/board').set(headers).expect(200)).body;expect(board).toEqual([]);
});
it('rejects oversized/malformed JSON without returning internals or accepting a fabricated legacy score',async()=>{
 const {app}=fixture();await request(app).post('/api/chainshift-authored/practice').set(headers).send({puzzleId:'x'.repeat(3000),requestId:randomUUID()}).expect(413);
 const malformed=await request(app).post('/api/chainshift-authored/practice').set(headers).set('Content-Type','application/json').send('{bad json').expect(400);expect(malformed.body).toEqual({error:'invalid_request'});
 await request(app).post('/api/chainshift-authored/practice').set(headers).send({puzzleId:'chainshift-local-v2-001',requestId:randomUUID()}).expect(400);
});
