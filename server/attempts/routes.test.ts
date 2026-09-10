import {describe,it,expect,vi} from 'vitest';
import request from 'supertest';
import {createServerApp} from '../app.js';
import {loadServerConfig} from '../env.js';
import {AttemptFailure,type AttemptStore} from './store.js';
import {RULESET} from './definition.js';
const origin='https://123456789012345678.discordsays.com';
const config=loadServerConfig({DISCORD_CLIENT_ID:'123456789012345678',ALLOWED_ORIGINS:`${origin},https://arcade.cdawgbot.xyz`});
const headers={Origin:origin,'X-Arcade-Origin':origin,'X-Arcade-Request':'1','X-Arcade-CSRF':'c'.repeat(43),Cookie:'__Host-arcade-session='+'s'.repeat(43)};
const paths=['/api/balance/attempts','/api/balance/attempts/submit','/api/balance/attempts/cancel'];
function fixture(enabled=true){
  const store={begin:vi.fn().mockResolvedValue({state:'open'}),submit:vi.fn().mockResolvedValue({disposition:'accepted',ticks:42}),cancel:vi.fn().mockResolvedValue({state:'cancelled'})};
  const persistence={check:vi.fn().mockResolvedValue({status:'available',schema:'compatible'}),close:async()=>{}};
  const app=createServerApp(config,{exchangeCode:async()=>({access_token:'unused'})},{attempts:enabled?{store:store as unknown as AttemptStore,persistence}:undefined});
  return {app,store,persistence};
}
describe('attempt API boundary',()=>{
  it.each(paths)('stays unavailable when disabled: %s',async path=>{
    const {app,store}=fixture(false);const r=await request(app).post(path).set(headers).send({});expect(r.status).toBe(503);expect(r.body).toEqual({error:'attempts_unavailable'});expect(store.begin).not.toHaveBeenCalled();
  });
  it.each(paths)('requires exact Activity Origin and custom headers: %s',async path=>{
    const {app,store}=fixture();
    for(const bad of [undefined,'https://evil.example','https://arcade.cdawgbot.xyz']){
      const h={...headers};if(bad)h.Origin=bad;else delete (h as Partial<typeof h>).Origin;
      expect((await request(app).post(path).set(h).send({})).status).toBe(403);
    }
    const h={...headers};delete (h as Partial<typeof h>)['X-Arcade-Request'];
    expect((await request(app).post(path).set(h).send({})).status).toBe(403);expect(store.begin).not.toHaveBeenCalled();
  });
  it('handles preflight without authentication and forbids GET and HEAD',async()=>{
    const {app}=fixture();const r=await request(app).options(paths[0]).set('Origin',origin);expect(r.status).toBe(204);expect(r.headers['access-control-allow-credentials']).toBe('true');
    expect((await request(app).get(paths[0]).set(headers)).status).toBe(405);expect((await request(app).head(paths[0]).set(headers)).status).toBe(405);
  });
  it('requires an unambiguous cookie and CSRF companion',async()=>{
    const {app}=fixture();
    for(const cookie of ['',headers.Cookie+'; '+headers.Cookie,'__Host-arcade-session=invalid'])expect((await request(app).post(paths[0]).set({...headers,Cookie:cookie}).send({})).status).toBe(401);
    expect((await request(app).post(paths[0]).set({...headers,'X-Arcade-CSRF':''}).send({})).status).toBe(403);
  });
  it('enforces media, decompression, size, JSON and exact schema',async()=>{
    const {app,store}=fixture();
    expect((await request(app).post(paths[0]).set(headers).type('text').send('{}')).status).toBe(415);
    expect((await request(app).post(paths[0]).set({...headers,'Content-Encoding':'gzip'}).send({})).status).toBe(415);
    expect((await request(app).post(paths[1]).set(headers).send({evidence:'x'.repeat(70000)})).status).toBe(413);
    expect((await request(app).post(paths[0]).set(headers).type('json').send('{')).status).toBe(400);
    expect((await request(app).post(paths[0]).set(headers).send({beginKey:'id',rulesetId:RULESET.id,playerId:'forged'})).status).toBe(400);
    expect((await request(app).post(paths[0]+'?guildId=forged').set(headers).send({beginKey:'id',rulesetId:RULESET.id})).status).toBe(400);
    expect(store.begin).not.toHaveBeenCalled();
  });
  it('dispatches only session-derived credentials and returns no-store results',async()=>{
    const {app,store}=fixture();
    const r=await request(app).post(paths[0]).set(headers).send({beginKey:'synthetic',rulesetId:RULESET.id});expect(r.status).toBe(200);expect(r.headers['cache-control']).toBe('no-store');expect(r.headers['x-arcade-diagnostic']).toMatch(/^[a-f0-9-]{36}$/);
    expect(store.begin).toHaveBeenCalledWith({token:'s'.repeat(43),csrf:'c'.repeat(43)},'synthetic',RULESET.id);
  });
  it.each([['expired_session',401],['csrf_invalid',403],['not_found',404],['attempt_conflict',409],['fresh_verification_required',409],['retry_expired',409],['invalid_request',400],['attempts_unavailable',503]] as const)('sanitizes %s',async(code,status)=>{
    const {app,store}=fixture();store.begin.mockRejectedValue(new AttemptFailure(code));const r=await request(app).post(paths[0]).set(headers).send({beginKey:'id',rulesetId:RULESET.id});expect(r.status).toBe(status);expect(r.body).toEqual({error:code});
  });
  it('fails closed on a database outage and omits driver details',async()=>{
    const {app,store,persistence}=fixture();persistence.check.mockResolvedValue({status:'unavailable',schema:'unreachable'});
    expect((await request(app).post(paths[0]).set(headers).send({beginKey:'id',rulesetId:RULESET.id})).status).toBe(503);expect(store.begin).not.toHaveBeenCalled();
    persistence.check.mockRejectedValue(Error('PRIVATE_DRIVER_SENTINEL'));
    const r=await request(app).post(paths[0]).set(headers).send({beginKey:'id',rulesetId:RULESET.id});expect(r.status).toBe(503);expect(r.text).not.toContain('PRIVATE_DRIVER');
    expect((await request(app).get('/api/health')).status).toBe(200);
  });
  it('limits a caller without growing unbounded state',async()=>{
    const {app}=fixture();for(let n=0;n<120;n++)await request(app).post(paths[0]).set(headers).send({beginKey:'id',rulesetId:RULESET.id}).expect(200);
    const r=await request(app).post(paths[0]).set(headers).send({beginKey:'id',rulesetId:RULESET.id});expect(r.status).toBe(429);expect(r.headers['retry-after']).toBe('60');
  });
});
