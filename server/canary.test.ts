import {describe,it,expect} from 'vitest';
import {canaryConfig,officialAvailability} from './canary';
const id='900000000000000001';
describe('private canary controls',()=>{
 it.each(['', 'bad',id+',900000000000000002'])('fails closed for invalid allowlist %s',value=>{expect(canaryConfig({ARCADE_CANARY_GUILD_IDS:value}).allowsGuild(id)).toBe(false);});
 it('requires exact guild and all explicit controls',()=>{const c=canaryConfig({ARCADE_CANARY_GUILD_IDS:id,ARCADE_ATTEMPTS_ENABLED:'true',OFFICIAL_SCORING_ENABLED:'true',ARCADE_LEADERBOARDS_ENABLED:'true'});expect(officialAvailability(c,id,'enabled',true)).toBe('eligible');expect(officialAvailability(c,'900000000000000002','enabled',true)).toBe('other-server');expect(officialAvailability(c,id,'disabled',true)).toBe('other-server');expect(officialAvailability(c,id,'enabled',false)).toBe('practice');expect(officialAvailability({...c,scoring:false},id,'enabled',true)).toBe('unavailable');expect(officialAvailability({...c,issuance:false},id,'enabled',true)).toBe('unavailable');expect(officialAvailability({...c,leaderboards:false},id,'enabled',true)).toBe('unavailable');});
});

it('supports a server-only hashed guild identifier without exposing the raw value',async()=>{
 const {createHash}=await import('node:crypto');const hash=createHash('sha256').update(id).digest('hex');
 expect(canaryConfig({ARCADE_CANARY_GUILD_HASH:hash}).allowsGuild(id)).toBe(true);
 expect(canaryConfig({ARCADE_CANARY_GUILD_HASH:hash}).allowsGuild('900000000000000002')).toBe(false);
 expect(canaryConfig({ARCADE_CANARY_GUILD_HASH:hash,ARCADE_CANARY_GUILD_IDS:id}).allowsGuild(id)).toBe(false);
});
