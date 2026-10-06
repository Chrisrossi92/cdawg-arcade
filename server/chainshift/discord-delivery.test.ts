import {describe,it,expect,vi,afterEach} from 'vitest';
import {DiscordDailyDelivery,DeliveryError,matchesPayload} from './discord-delivery.js';
import {CHAINSHIFT_PILOT_CHANNEL,ARCADE_APPLICATION_ID,liveDeliveryConfig} from './live-config.js';
import {dailyActivityMessage} from './projections.js';
import {scheduleDailyWorker,startDailyWorker} from './delivery-worker.js';
const facts={puzzleId:'daily-027',day:'2026-10-06',start:'black',finish:'party',completedPlayers:0,shortestShifts:null,fastestAtShortestMs:null};
const guild='123456789012345678',id='1549149791915737130',nonce='a'.repeat(24);
const config={applicationId:ARCADE_APPLICATION_ID,channelId:CHAINSHIFT_PILOT_CHANNEL,pilotDay:facts.day,allowsGuild:(v:string)=>v===guild};
const payload=dailyActivityMessage(facts,ARCADE_APPLICATION_ID);
const message=(patch={})=>({id,channel_id:CHAINSHIFT_PILOT_CHANNEL,author:{id:ARCADE_APPLICATION_ID,bot:true},nonce,...payload,...patch});
const response=(body:unknown,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers});
describe('narrow Discord daily adapter',()=>{
 it('creates with nonce enforcement, fixed supported launch CTA and no mentions or secrets in payload',async()=>{
  const fetcher=vi.fn(async()=>response(message()));const adapter=new DiscordDailyDelivery(config,'private-token',fetcher);
  expect((await adapter.create({...facts,route:['secretword'],playerId:'private'} as typeof facts,nonce)).id).toBe(id);
  const [url,options]=fetcher.mock.calls[0] as unknown as [string,RequestInit];
  expect(url).toBe('https://discord.com/api/v10/channels/'+CHAINSHIFT_PILOT_CHANNEL+'/messages');expect(options.method).toBe('POST');
  const body=JSON.parse(options.body as string);expect(body).toMatchObject({nonce,enforce_nonce:true,allowed_mentions:{parse:[]}});
  expect(body.components[0].components[0].url).toBe('https://discord.com/activities/'+ARCADE_APPLICATION_ID+'?custom_id=chainshift-today-v1');
  expect(options.redirect).toBe('error');expect(JSON.stringify(body)).not.toMatch(/private|secretword|route|certificate|playerId/);
 });
 it('edits only the persisted bot-owned message and suppresses mentions on PATCH',async()=>{
  const fetcher=vi.fn(async()=>response(message()));const adapter=new DiscordDailyDelivery(config,'synthetic',fetcher);await adapter.edit(id,facts);
  expect(fetcher.mock.calls).toHaveLength(2);expect((fetcher.mock.calls[0] as unknown as [string,RequestInit])[1].method).toBe('GET');
  const [url,options]=fetcher.mock.calls[1] as unknown as [string,RequestInit];expect(url).toContain('/messages/'+id);expect(options.method).toBe('PATCH');expect(JSON.parse(options.body as string).allowed_mentions).toEqual({parse:[]});
 });
 it.each([{channelId:'123456789012345678'},{channelId:''},{applicationId:'123456789012345678'}])('rejects unsupported config before HTTP %j',patch=>{
  const fetcher=vi.fn();expect(()=>new DiscordDailyDelivery({...config,...patch},'synthetic',fetcher)).toThrow();expect(fetcher).not.toHaveBeenCalled();
 });
 it.each([{author:{id:guild,bot:true}},{author:{id:ARCADE_APPLICATION_ID,bot:false}},{channel_id:guild},{id:'bad'},{nonce:'wrong'},{components:null},{webhook_id:guild}])('rejects malformed or foreign create reply %j',async patch=>{
  await expect(new DiscordDailyDelivery(config,'synthetic',async()=>response(message(patch))).create(facts,nonce)).rejects.toMatchObject({code:'malformed'});
 });
 it('never PATCHes another author',async()=>{const f=vi.fn(async()=>response(message({author:{id:guild,bot:true}})));await expect(new DiscordDailyDelivery(config,'synthetic',f).edit(id,facts)).rejects.toMatchObject({code:'malformed'});expect(f).toHaveBeenCalledTimes(1);});
 it.each([[403,'forbidden'],[401,'forbidden'],[404,'missing'],[400,'invalid_channel'],[500,'uncertain']])('classifies create HTTP %s without leaking response %s',async(status,code)=>{
  const adapter=new DiscordDailyDelivery(config,'secret-token',async()=>response({message:'private-body'},status as number));
  try{await adapter.create(facts,nonce);throw Error('expected failure');}catch(e){expect(e).toBeInstanceOf(DeliveryError);expect(e).toMatchObject({code});expect(String(e)).not.toMatch(/secret-token|private-body/);}
 });
 it('classifies lost create and lost edit distinctly',async()=>{
  const fail=async()=>{throw Error('private network detail');};await expect(new DiscordDailyDelivery(config,'synthetic',fail).create(facts,nonce)).rejects.toMatchObject({code:'uncertain'});
  await expect(new DiscordDailyDelivery(config,'synthetic',fail).edit(id,facts)).rejects.toMatchObject({code:'transient'});
 });
 it('honors body/header rate limits without sleeping or retrying inside HTTP',async()=>{
  let now=0;const f=vi.fn(async()=>response({retry_after:65},429,{'retry-after':'70'}));const a=new DiscordDailyDelivery(config,'synthetic',f,()=>now);
  await expect(a.create(facts,nonce)).rejects.toMatchObject({code:'rate_limited',retryMs:70000});
  now=69999;await expect(a.create(facts,nonce)).rejects.toMatchObject({code:'rate_limited'});expect(f).toHaveBeenCalledTimes(1);
 });
 it('respects exhausted success buckets on subsequent calls',async()=>{const f=vi.fn(async()=>response(message(),200,{'x-ratelimit-remaining':'0','x-ratelimit-reset-after':'90'}));const a=new DiscordDailyDelivery(config,'synthetic',f,()=>0);await a.create(facts,nonce);await expect(a.edit(id,facts)).rejects.toMatchObject({code:'rate_limited',retryMs:90000});expect(f).toHaveBeenCalledTimes(1);});
 it('validates channel type and approved guild',async()=>{const a=new DiscordDailyDelivery(config,'synthetic',async()=>response({id:CHAINSHIFT_PILOT_CHANNEL,guild_id:guild,type:0}));expect(await a.validateDestination()).toBe(guild);});
 it.each([{id:guild,guild_id:guild,type:0},{id:CHAINSHIFT_PILOT_CHANNEL,guild_id:'234567890123456789',type:0},{id:CHAINSHIFT_PILOT_CHANNEL,guild_id:guild,type:5}])('rejects wrong destination metadata %j',async raw=>await expect(new DiscordDailyDelivery(config,'synthetic',async()=>response(raw)).validateDestination()).rejects.toMatchObject({code:'invalid_channel'}));
 it('recovers nonce plus bot ownership from bounded history without POST',async()=>{const f=vi.fn(async()=>response([message(),message({id:'1549149791915737131',nonce:'foreign',author:{id:guild,bot:true}})]));const a=new DiscordDailyDelivery(config,'synthetic',f);expect((await a.recover(nonce,new Date('2026-09-01')))?.id).toBe(id);expect((f.mock.calls[0] as unknown as [string,RequestInit])[1].method).toBe('GET');});
 it('no match or deleted message does not invent recovery',async()=>{expect(await new DiscordDailyDelivery(config,'synthetic',async()=>response([])).recover(nonce,new Date('2026-09-01'))).toBeNull();});
 it('ambiguous recovery fails closed',async()=>await expect(new DiscordDailyDelivery(config,'synthetic',async()=>response([message(),message({id:'1549149791915737131'})])).recover(nonce,new Date('2026-09-01'))).rejects.toMatchObject({code:'malformed'}));
 it('incomplete history scan never adopts a message or retries POST',async()=>{
  const base=BigInt(id),f=vi.fn(async()=>response(Array.from({length:100},(_,i)=>message({id:(base-BigInt(i)).toString(),nonce:'other'}))));
  await expect(new DiscordDailyDelivery(config,'synthetic',f).recover(nonce,new Date('2026-09-01'))).rejects.toMatchObject({code:'malformed'});
  expect(f.mock.calls.length).toBeLessThanOrEqual(5);for(const call of f.mock.calls)expect((call as unknown as [string,RequestInit])[1].method).toBe('GET');
 });
 it('five full distinct pages remain uncertain even when one possible match was found',async()=>{
  let page=0;const base=BigInt(id),f=vi.fn(async()=>{const offset=page++*100;return response(Array.from({length:100},(_,i)=>message({id:(base-BigInt(offset+i)).toString(),nonce:offset+i===0?nonce:'other'})));});
  await expect(new DiscordDailyDelivery(config,'synthetic',f).recover(nonce,new Date('2026-09-01'))).rejects.toMatchObject({code:'uncertain'});expect(f).toHaveBeenCalledTimes(5);
 });
 it.each([0,-1,Infinity,86401])('invalid Retry-After %s fails closed',async retry_after=>await expect(new DiscordDailyDelivery(config,'synthetic',async()=>response({retry_after},429)).create(facts,nonce)).rejects.toMatchObject({code:'forbidden'}));
 it('recognizes payload when Discord adds component IDs',()=>expect(matchesPayload({id,content:payload.content,components:[{id:1,type:1,components:[{...payload.components[0].components[0],id:2}]}]},payload)).toBe(true));
 it('rejects oversized, invalid JSON and absent body responses',async()=>{for(const r of [new Response('x'.repeat(262145)),new Response('not-json'),new Response(null)])await expect(new DiscordDailyDelivery(config,'synthetic',async()=>r).create(facts,nonce)).rejects.toMatchObject({code:'malformed'});});
});
describe('independent activation gates',()=>{
 const env={CHAINSHIFT_ARCADE_ENABLED:'true',CHAINSHIFT_RANKED_ENABLED:'true',ARCADE_SESSIONS_ENABLED:'true',CHAINSHIFT_DAILY_DELIVERY_ENABLED:'true',CHAINSHIFT_DAILY_CHANNEL_ID:CHAINSHIFT_PILOT_CHANNEL,CHAINSHIFT_DAILY_PILOT_DAY:facts.day,DISCORD_CLIENT_ID:ARCADE_APPLICATION_ID,DISCORD_ARCADE_BOT_TOKEN:'synthetic',ARCADE_CANARY_GUILD_IDS:guild};
 it('default is off',async()=>{expect(liveDeliveryConfig({})).toBeNull();await startDailyWorker(undefined,{}).stop();});
 it.each(['true','false'])('game %s across ranked/delivery matrix',game=>{for(const ranked of ['true','false'])for(const delivery of ['true','false'])expect(!!liveDeliveryConfig({...env,CHAINSHIFT_ARCADE_ENABLED:game,CHAINSHIFT_RANKED_ENABLED:ranked,CHAINSHIFT_DAILY_DELIVERY_ENABLED:delivery})).toBe(game==='true'&&ranked==='true'&&delivery==='true');});
 it.each([{CHAINSHIFT_DAILY_CHANNEL_ID:''},{CHAINSHIFT_DAILY_CHANNEL_ID:guild},{CHAINSHIFT_DAILY_PILOT_DAY:'2026-02-30'},{CHAINSHIFT_DAILY_PILOT_DAY:'2026-99-99'},{ARCADE_SESSIONS_ENABLED:'false'},{DISCORD_ARCADE_BOT_TOKEN:''},{DISCORD_CLIENT_ID:guild}])('fails closed %j',patch=>expect(liveDeliveryConfig({...env,...patch})).toBeNull());
 it('valid explicit candidate still limits approved guild',()=>{const c=liveDeliveryConfig(env)!;expect(c.allowsGuild(guild)).toBe(true);expect(c.allowsGuild('234567890123456789')).toBe(false);});
 it('gameplay-ready environment cannot start delivery with a normal/off artifact',async()=>{
  const database={query:vi.fn(),exclusive:vi.fn()} as unknown as Parameters<typeof startDailyWorker>[0];
  await startDailyWorker(database,env,vi.fn(),false).stop();expect(database!.query).not.toHaveBeenCalled();expect(database!.exclusive).not.toHaveBeenCalled();
 });
 it.each(['TRUE','1','yes',''])('nonliteral delivery flag %s stays off',flag=>expect(liveDeliveryConfig({...env,CHAINSHIFT_DAILY_DELIVERY_ENABLED:flag})).toBeNull());
 it('continuous capability requires explicit daily scope with no ambiguous pilot day',()=>{
  expect(liveDeliveryConfig({...env,CHAINSHIFT_DAILY_SCOPE:'daily'})).toBeNull();
  expect(liveDeliveryConfig({...env,CHAINSHIFT_DAILY_SCOPE:'daily',CHAINSHIFT_DAILY_PILOT_DAY:undefined})?.pilotDay).toBeNull();
  expect(liveDeliveryConfig({...env,CHAINSHIFT_DAILY_SCOPE:'invalid'})).toBeNull();
 });
});
describe('bounded worker lifecycle',()=>{
 afterEach(()=>vi.useRealTimers());
 it('does not overlap and stop waits for in-flight work',async()=>{vi.useFakeTimers();let resolve!:(v:{state:'unchanged'})=>void;const run=vi.fn(()=>new Promise<{state:'unchanged'}>(r=>resolve=r)),report=vi.fn();const worker=scheduleDailyWorker(run,report,100);await vi.advanceTimersByTimeAsync(0);await vi.advanceTimersByTimeAsync(1000);expect(run).toHaveBeenCalledTimes(1);const stop=worker.stop();resolve({state:'unchanged'});await stop;await vi.advanceTimersByTimeAsync(1000);expect(run).toHaveBeenCalledTimes(1);});
 it.each(['blocked','outside_pilot'] as const)('halts on %s',async state=>{vi.useFakeTimers();const run=vi.fn(async()=>({state}));const w=scheduleDailyWorker(run,vi.fn(),100);await vi.advanceTimersByTimeAsync(1000);expect(run).toHaveBeenCalledTimes(1);await w.stop();});
 it('sanitizes failures and uses cadence, not a retry loop',async()=>{vi.useFakeTimers();const run=vi.fn(async()=>{throw Error('secret');}),report=vi.fn();const w=scheduleDailyWorker(run,report,100);await vi.advanceTimersByTimeAsync(0);expect(report).toHaveBeenCalledWith({state:'unavailable',error:'reconciliation_failed'});await vi.advanceTimersByTimeAsync(99);expect(run).toHaveBeenCalledTimes(1);await w.stop();});
});
