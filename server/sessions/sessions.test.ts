import {describe,it,expect,vi} from 'vitest';
import request from 'supertest';
import {ChallengeVault,secret,digest,csrfFor,equal} from './crypto';
import {DiscordIdentityProvider} from './discord';
import {createServerApp} from '../app';
import {loadServerConfig} from '../env';
import {SESSION_COOKIE,CHALLENGE_COOKIE,type SessionRuntime} from './routes';
const origin='https://arcade.example', activityOrigin='https://123456789012345678.discordsays.com';
const config=loadServerConfig({DISCORD_CLIENT_ID:'123456789012345678',DISCORD_CLIENT_SECRET:'DUMMY_SESSION_CLIENT_SECRET',DISCORD_REDIRECT_URI:'https://arcade.example',ALLOWED_ORIGINS:`${origin},${activityOrigin}`});
const user={id:'234567890123456789',username:'Synthetic',global_name:'Test Player',avatar:'a'.repeat(32),email:'private-unneeded@example.invalid'};
const activity={application_id:config.discordClientId,instance_id:'i-synthetic',location:{kind:'gc',guild_id:'345678901234567890',channel_id:'456789012345678901'},users:[user.id]};
function provider(objects:unknown[]) { const fetcher=vi.fn(async(_url: string | URL | Request, _init?: RequestInit)=>new Response(JSON.stringify(objects.shift()),{headers:{'Content-Type':'application/json'}}));return {fetcher,service:new DiscordIdentityProvider(config,'test-only-bot-credential',fetcher)}; }
const token=()=>({access_token:'test-only-provider-token',refresh_token:'not-retained',token_type:'Bearer',scope:'identify guilds'});
describe('session cryptographic material',()=>{
  it('has 256 bits of random material and no collisions in a bounded sample',()=>{const values=new Set(Array.from({length:1000},secret));expect(values.size).toBe(1000);for(const x of values)expect(x).toMatch(/^[A-Za-z0-9_-]{43}$/);});
  it('stores only digests and separates CSRF from the cookie',()=>{const x=secret();expect(digest(x)).toHaveLength(64);expect(csrfFor(x)).not.toBe(x);expect(equal(csrfFor(x),csrfFor(x))).toBe(true);expect(equal(csrfFor(x),csrfFor(secret()))).toBe(false);});
  it('encrypts verifiers with integrity protection',()=>{const vault=new ChallengeVault(),x=secret(),sealed=vault.seal(x);expect(sealed.toString()).not.toContain(x);expect(vault.open(sealed)).toBe(x);sealed[15]^=1;expect(()=>vault.open(sealed)).toThrow();});
  it('fails closed for unfinished challenges after process restart',()=>{const sealed=new ChallengeVault().seal(secret());expect(()=>new ChallengeVault().open(sealed)).toThrow();});
});
describe('authoritative Discord verification',()=>{
  it('uses PKCE, fixed API targets and distinct credentials; discards unnecessary data',async()=>{const {service,fetcher}=provider([token(),user,activity]);const result=await service.verify('synthetic-code','synthetic-verifier','i-synthetic',new AbortController().signal);expect(result).toEqual({identity:{userId:user.id,displayName:'Test Player',avatarHash:'a'.repeat(32),guildId:activity.location.guild_id},accessToken:'test-only-provider-token'});expect(String(fetcher.mock.calls[0][1]?.body)).toContain('code_verifier=synthetic-verifier');expect(fetcher.mock.calls[1][1]?.headers).toEqual({Authorization:'Bearer test-only-provider-token'});expect(fetcher.mock.calls[2][1]?.headers).toEqual({Authorization:'Bot test-only-bot-credential'});for(const args of fetcher.mock.calls)expect(args[1]?.redirect).toBe('error');});
  for(const [label,patch] of Object.entries({wrongApp:{application_id:'999999999999999999'},wrongInstance:{instance_id:'i-forged'},absentParticipant:{users:[]},privateChannel:{location:{kind:'pc'}},forgedGuild:{location:{kind:'gc',guild_id:345678901234567890}}})) it(`rejects ${label}`,async()=>{await expect(provider([token(),user,{...activity,...patch}]).service.verify('code','verifier','i-synthetic',new AbortController().signal)).rejects.toThrow('verification_unavailable');});
  it('rejects numeric snowflakes',async()=>{await expect(provider([token(),{...user,id:234567890123456789},activity]).service.verify('code','v','i-synthetic',new AbortController().signal)).rejects.toThrow();});
  it('does not accept arbitrary avatar URLs',async()=>{const result=await provider([token(),{...user,avatar:'https://evil.example/avatar'},activity]).service.verify('code','v','i-synthetic',new AbortController().signal);expect(result.identity.avatarHash).toBeNull();});
  it('sanitizes upstream errors including token-bearing exception messages',async()=>{const service=new DiscordIdentityProvider(config,'bot',vi.fn().mockRejectedValue(new Error('PRIVATE_TOKEN')));await expect(service.verify('code','v','i-synthetic',new AbortController().signal)).rejects.toThrow('verification_unavailable');});
  it('rejects missing identify scope',async()=>{await expect(provider([{...token(),scope:'guilds'}]).service.verify('code','v','i-synthetic',new AbortController().signal)).rejects.toThrow();});
  it('rejects oversized provider responses',async()=>{await expect(provider([{...token(),padding:'x'.repeat(70000)}]).service.verify('code','v','i-synthetic',new AbortController().signal)).rejects.toThrow();});
});
const unavailableApp=()=>createServerApp(config,{exchangeCode:async()=>({access_token:'legacy'})});
const headers=(o=origin)=>({'Origin':o,'X-Arcade-Origin':o,'X-Arcade-Request':'1'});
describe('session API boundaries',()=>{
  it('is disabled by default while liveness works',async()=>{const app=unavailableApp();await request(app).post('/api/auth/challenges').set(headers()).send({}).expect(503);await request(app).get('/api/health').expect(200);});
  it('rejects missing Origin on mutations',async()=>{await request(unavailableApp()).post('/api/logout').set({'X-Arcade-Origin':origin,'X-Arcade-Request':'1'}).send({}).expect(403);});
  it('rejects wrong Origin',async()=>{await request(unavailableApp()).post('/api/logout').set(headers('https://evil.example')).send({}).expect(403);});
  it('requires custom header for same-origin GET',async()=>{await request(unavailableApp()).get('/api/me').set('X-Arcade-Origin',origin).expect(403);});
  it('rejects wrong methods',async()=>{await request(unavailableApp()).get('/api/logout').set(headers()).expect(405);});
  it('accepts exact production and Activity CORS preflights',async()=>{for(const o of [origin,activityOrigin]){const r=await request(unavailableApp()).options('/api/session').set('Origin',o).expect(204);expect(r.headers['access-control-allow-origin']).toBe(o);expect(r.headers['access-control-allow-credentials']).toBe('true');}});
  const setup=()=>{const store={challenge:vi.fn().mockResolvedValue({id:'synthetic',binding:secret(),codeChallenge:secret()}),checkCsrf:vi.fn(),consume:vi.fn(),me:vi.fn()};const runtime={store,provider:{verify:vi.fn()},persistence:{check:async()=>({status:'available',schema:'compatible'})}} as unknown as SessionRuntime;return {store,app:createServerApp(config,{exchangeCode:async()=>({access_token:'legacy'})},{sessions:runtime})};};
  it('sets host-only HttpOnly secure partitioned challenge cookies',async()=>{const {app}=setup();const r=await request(app).post('/api/auth/challenges').set(headers()).send({}).expect(200);const cookies=String(r.headers['set-cookie']);for(const x of [CHALLENGE_COOKIE,'Secure','HttpOnly','Path=/','SameSite=None','Partitioned','Max-Age=300'])expect(cookies).toContain(x);expect(cookies).not.toContain('Domain=');});
  it('rejects forged authoritative fields before persistence',async()=>{const {app,store}=setup();await request(app).post('/api/auth/challenges').set(headers()).send({userId:user.id,guildId:activity.location.guild_id}).expect(400);expect(store.challenge).not.toHaveBeenCalled();});
  it('requires CSRF when an existing session cookie is present',async()=>{const {app,store}=setup();await request(app).post('/api/auth/challenges').set(headers()).set('Cookie',`${SESSION_COOKIE}=${secret()}`).send({}).expect(403);expect(store.challenge).not.toHaveBeenCalled();});
  it('requires JSON and bounds request bodies',async()=>{const {app}=setup();await request(app).post('/api/auth/challenges').set(headers()).send('plain').expect(415);await request(app).post('/api/auth/challenges').set(headers()).send({padding:'x'.repeat(5000)}).expect(413);});
  it('fails closed on unavailable persistence',async()=>{const {app,store}=setup();store.challenge.mockRejectedValue(new Error('PRIVATE_CONNECTION_URL'));const r=await request(app).post('/api/auth/challenges').set(headers()).send({}).expect(503);expect(r.text).not.toContain('PRIVATE');expect(r.headers['cache-control']).toBe('no-store');expect(r.headers['x-arcade-diagnostic']).toBeTruthy();});
});
