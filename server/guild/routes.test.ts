import {describe,it,expect,vi} from 'vitest';
import request from 'supertest';
import {createServerApp} from '../app.js';
import {loadServerConfig} from '../env.js';
import {GuildStore,BoardFailure,displayName} from './store.js';
const origin='https://123456789012345678.discordsays.com',path='/api/guild/balance/leaderboard';
const headers={Origin:origin,'X-Arcade-Origin':origin,'X-Arcade-Request':'1',Cookie:'__Host-arcade-session='+'s'.repeat(43)};
function fixture(enabled=true){
 const store={leaderboard:vi.fn().mockResolvedValue({entries:[],ownEntry:null,record:null,nextCursor:null})};
 const persistence={check:vi.fn().mockResolvedValue({status:'available',schema:'compatible'}),close:async()=>{}};
 const app=createServerApp(loadServerConfig({DISCORD_CLIENT_ID:'123456789012345678',ALLOWED_ORIGINS:origin}),{exchangeCode:async()=>({access_token:'unused'})},{guild:enabled?{store:store as unknown as GuildStore,persistence}:undefined});return {app,store,persistence};
}
describe('guild API boundary',()=>{
 it('disabled never calls persistence or store',async()=>{const {app,store,persistence}=fixture(false);const r=await request(app).get(path).set(headers);expect(r.status).toBe(503);expect(r.body).toEqual({error:'leaderboard_unavailable'});expect(r.headers['cache-control']).toBe('no-store');expect(store.leaderboard).not.toHaveBeenCalled();expect(persistence.check).not.toHaveBeenCalled();});
 it.each(['https://evil.example','null','https://arcade.cdawgbot.xyz'])('rejects origin %s',async Origin=>{const {app,store}=fixture();expect((await request(app).get(path).set({...headers,Origin})).status).toBe(403);expect(store.leaderboard).not.toHaveBeenCalled();});
 it('rejects missing custom header and ambiguous cookies',async()=>{const {app,store}=fixture();expect((await request(app).get(path).set({...headers,'X-Arcade-Request':''})).status).toBe(403);for(const Cookie of ['',headers.Cookie+'; '+headers.Cookie,'__Host-arcade-session=bad'])expect((await request(app).get(path).set({...headers,Cookie})).status).toBe(401);expect(store.leaderboard).not.toHaveBeenCalled();});
 it('preflight has no database work; methods are limited',async()=>{const {app,persistence}=fixture();expect((await request(app).options(path).set('Origin',origin)).status).toBe(204);expect((await request(app).post(path).set(headers)).status).toBe(405);expect((await request(app).head(path).set(headers)).status).toBe(405);expect(persistence.check).not.toHaveBeenCalled();});
 it('dispatches only cookie and query, uses no-store',async()=>{const {app,store}=fixture();const r=await request(app).get(path+'?limit=25').set(headers);expect(r.status).toBe(200);expect(r.headers['cache-control']).toBe('no-store');expect(store.leaderboard).toHaveBeenCalledWith('s'.repeat(43),{limit:'25'});});
 it.each([['expired_session',401],['invalid_request',400],['invalid_cursor',400],['board_unavailable',503],['projection_mismatch',503]] as const)('sanitizes %s',async(code,status)=>{const {app,store}=fixture();store.leaderboard.mockRejectedValue(new BoardFailure(code));const r=await request(app).get(path).set(headers);expect(r.status).toBe(status);expect(r.body).toEqual({error:status===503?'leaderboard_unavailable':code});});
 it('sanitizes persistence and driver errors',async()=>{const {app,store,persistence}=fixture();persistence.check.mockRejectedValue(Error('PRIVATE_SENTINEL'));let r=await request(app).get(path).set(headers);expect(r.status).toBe(503);expect(JSON.stringify(r.body)).not.toContain('PRIVATE');expect(store.leaderboard).not.toHaveBeenCalled();persistence.check.mockResolvedValue({status:'available',schema:'compatible'});store.leaderboard.mockRejectedValue(Error('PRIVATE_SENTINEL'));r=await request(app).get(path).set(headers);expect(r.body).toEqual({error:'leaderboard_unavailable'});});
 it('bounds and escapes names, removes controls',()=>{expect(displayName('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&#39;');expect(displayName('😀'.repeat(100))).toBe('😀'.repeat(80));expect(displayName('\u202e\u0001')).toBe('Player');});
 it.each([{limit:'101'},{limit:'0'},{limit:'1.5'},{guild:'foreign'},{ruleset:'unknown'},{cursor:'invalid'}])('validates query before database access: %o',async q=>{const transaction=vi.fn();const store=new GuildStore({transaction} as never);await expect(store.leaderboard('synthetic',q)).rejects.toBeInstanceOf(BoardFailure);expect(transaction).not.toHaveBeenCalled();});
});
