import {describe,it,expect,vi} from 'vitest';
import request from 'supertest';
import {canonicalInvalid} from './canonical.js';
import {retryTransaction} from './transaction.js';
import {DatabaseError,safeDatabaseError,type Database} from '../database/pool.js';
import {createServerApp} from '../app.js';
import {loadServerConfig} from '../env.js';
import type {AttemptStore} from '../attempts/store.js';
const origin='https://123456789012345678.discordsays.com';
const config=loadServerConfig({DISCORD_CLIENT_ID:'123456789012345678',ALLOWED_ORIGINS:origin});
const headers={'X-Arcade-Origin':origin,'X-Arcade-Request':'1',Cookie:'__Host-arcade-session='+'a'.repeat(43)};
const paths=['/api/me/balance/stats','/api/me/balance/attempts','/api/me/balance/attempts/00000000-0000-4000-8000-000000000099'];
function fixture(enabled=true){
  const store={stats:vi.fn().mockResolvedValue({acceptedCount:'0'}),recent:vi.fn().mockResolvedValue({attempts:[]}),status:vi.fn().mockResolvedValue({state:'open'})};
  const persistence={check:vi.fn().mockResolvedValue({status:'available',schema:'compatible'}),close:async()=>{}};
  const app=createServerApp(config,{exchangeCode:async()=>({access_token:'unused'})},{attempts:enabled?{store:store as unknown as AttemptStore,persistence}:undefined});
  return {store,persistence,app};
}
describe('bounded invalid submission canonicalization',()=>{
  it('sorts nested object keys but preserves input order',()=>{
    expect(canonicalInvalid({z:1,a:{q:2,b:[2,1]}})).toBe(canonicalInvalid({a:{b:[2,1],q:2},z:1}));
    expect(canonicalInvalid([1,2])).not.toBe(canonicalInvalid([2,1]));
  });
  it('rejects excessive depth, nodes, bytes, undefined and nonfinite values',()=>{
    let nested:unknown=0;for(let n=0;n<18;n++)nested=[nested];
    for(const v of [nested,Array(16001).fill(0),'x'.repeat(65536),undefined,NaN,Infinity])expect(canonicalInvalid(v)).toBeNull();
  });
  it('handles prototype-looking keys without mutation',()=>{
    expect(canonicalInvalid(JSON.parse('{"__proto__":{"x":1}}'))).toBe('{"__proto__":{"x":1}}');
    expect(({} as Record<string,unknown>).x).toBeUndefined();
  });
});
describe('known rollback retry boundary',()=>{
  it.each(['40001','40P01'])('retries only a confirmed rollback %s',async code=>{
    const transaction=vi.fn().mockRejectedValueOnce(safeDatabaseError({code})).mockResolvedValue('committed');
    expect(await retryTransaction({transaction} as unknown as Database,async()=>null)).toBe('committed');expect(transaction).toHaveBeenCalledTimes(2);
  });
  it('bounds retries to three transactions',async()=>{
    const transaction=vi.fn().mockRejectedValue(new DatabaseError('transaction_retry'));
    await expect(retryTransaction({transaction} as unknown as Database,async()=>null)).rejects.toMatchObject({code:'transaction_retry'});expect(transaction).toHaveBeenCalledTimes(3);
  });
  it.each(['unavailable','timeout','constraint','closed','cancelled'] as const)('does not automatically retry %s, including ambiguous commits',async code=>{
    const transaction=vi.fn().mockRejectedValue(new DatabaseError(code));await expect(retryTransaction({transaction} as unknown as Database,async()=>null)).rejects.toThrow();expect(transaction).toHaveBeenCalledTimes(1);
  });
});
describe('personal result HTTP privacy',()=>{
  it.each(paths)('fails closed when disabled: %s',async path=>{
    const {app,store}=fixture(false);const r=await request(app).get(path).set(headers);expect(r.status).toBe(503);expect(r.body).toEqual({error:'official_results_unavailable'});expect(store.stats).not.toHaveBeenCalled();
  });
  it.each(paths)('supports same-origin GET with custom headers and no CSRF mutation: %s',async path=>{
    const {app}=fixture();const r=await request(app).get(path).set(headers);expect(r.status).toBe(200);expect(r.headers['cache-control']).toBe('no-store');expect(r.headers['x-arcade-diagnostic']).toMatch(/^[a-f0-9-]{36}$/);
  });
  it.each(paths)('rejects foreign origins, selectors and wrong methods: %s',async path=>{
    const {app}=fixture();expect((await request(app).get(path).set({...headers,Origin:'https://evil.example'})).status).toBe(403);
    expect((await request(app).get(path+'?playerId=foreign').set(headers)).status).toBe(400);
    expect((await request(app).get(path).set({...headers,Cookie:''})).status).toBe(401);
    expect((await request(app).post(path).set({...headers,Origin:origin}).send({})).status).toBe(405);
  });
  it('never leaks a driver exception and keeps health independent',async()=>{
    const {app,persistence}=fixture();persistence.check.mockRejectedValue(Error('PRIVATE_DATABASE_SENTINEL'));
    const r=await request(app).get(paths[0]).set(headers);expect(r.status).toBe(503);expect(r.body).toEqual({error:'official_results_unavailable'});expect(r.text).not.toContain('PRIVATE_DATABASE');expect((await request(app).get('/api/health')).status).toBe(200);
  });
});
