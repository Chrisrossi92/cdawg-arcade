import {it,expect,vi} from 'vitest';
import {DOG_HEAD,dogHeadAvailable} from './play-button.js';
import {authoredDailyMessage} from './delivery.js';
import {ARCADE_APPLICATION_ID} from '../live-config.js';
import {matchesPayload,dailyMessageDigest} from '../discord-delivery.js';
const facts={puzzleId:'daily',day:'2026-10-31',start:'A',finish:'B',completedPlayers:0,shortestShifts:null,fastestAtShortestMs:null};
it('adds owned dog head without changing launch link, no-image fallback is complete',()=>{
 const p=authoredDailyMessage(facts,ARCADE_APPLICATION_ID),plain=authoredDailyMessage(facts,ARCADE_APPLICATION_ID,false),b=p.components[0].components[0];
 expect(b.emoji).toEqual(DOG_HEAD);expect(b.label).toBe('Play Today’s ChainShift');expect(b.style).toBe(5);
 expect(b.url).toBe(`https://discord.com/activities/${ARCADE_APPLICATION_ID}?custom_id=chainshift-today-v1`);
 expect(plain.components[0].components[0].emoji).toBeUndefined();expect(plain.components[0].components[0].url).toBe(b.url);
 expect(dailyMessageDigest(p)).not.toBe(dailyMessageDigest(plain));
 const message={id:'1566074432148213924',content:p.content,components:structuredClone(p.components)};
 expect(matchesPayload(message,p)).toBe(true);delete message.components[0].components[0].emoji;expect(matchesPayload(message,p)).toBe(false);expect(matchesPayload(message,plain)).toBe(true);
 message.components[0].components[0].emoji={...DOG_HEAD,id:'1566074432148213924'};expect(matchesPayload(message,p)).toBe(false);expect(matchesPayload(message,plain)).toBe(false);
});
it('verifies application emoji identity using GET only',async()=>{
 const f=vi.fn(async(_url:string,_init?:RequestInit)=>Response.json({...DOG_HEAD,available:true}));expect(await dogHeadAvailable('synthetic',f as typeof fetch)).toBe(true);
 expect(f.mock.calls[0]?.[0]).toBe(`https://discord.com/api/v10/applications/${ARCADE_APPLICATION_ID}/emojis/${DOG_HEAD.id}`);expect(f.mock.calls[0]?.[1]?.method).toBeUndefined();
});
it.each([{...DOG_HEAD,id:'wrong'},{...DOG_HEAD,name:'wrong'},{...DOG_HEAD,animated:true},{...DOG_HEAD,available:false}])('omits unavailable or mismatched decoration %j',async e=>expect(await dogHeadAvailable('synthetic',vi.fn(async()=>Response.json(e)) as typeof fetch)).toBe(false));
it('keeps a plain working link on HTTP and transport failure without retry',async()=>{
 const f=vi.fn(async()=>new Response('',{status:404}));expect(await dogHeadAvailable('synthetic',f as typeof fetch)).toBe(false);expect(f).toHaveBeenCalledTimes(1);
 const fail=vi.fn(async()=>{throw Error('offline');});expect(await dogHeadAvailable('synthetic',fail as typeof fetch)).toBe(false);expect(fail).toHaveBeenCalledTimes(1);
});
