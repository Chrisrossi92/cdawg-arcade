import {describe,it,expect} from 'vitest';
import {activityLaunchHint,chainshiftActivityUrl,CHAINSHIFT_ACTIVITY_CUSTOM_ID} from './activity-launch';
describe('Discord Activity launch bridge',()=>{
 it('generates only the documented Discord Activity link and a fixed navigation marker',()=>{
  expect(chainshiftActivityUrl('1525643672194908330')).toBe('https://discord.com/activities/1525643672194908330?custom_id=chainshift-today-v1');
  const url=new URL(chainshiftActivityUrl('1525643672194908330'));
  expect([...url.searchParams.keys()]).toEqual(['custom_id']);expect(url.hash).toBe('');
  expect(activityLaunchHint(CHAINSHIFT_ACTIVITY_CUSTOM_ID)).toBe('chainshift-today');
 });
 it.each([undefined,null,'','CHAINSHIFT-TODAY-V1','chainshift-today-v1&guild_id=123','https://evil.invalid',JSON.stringify({playerId:'123',puzzleId:'old',ranked:true}),{custom_id:CHAINSHIFT_ACTIVITY_CUSTOM_ID}])('ignores non-allowlisted handoff %j',input=>expect(activityLaunchHint(input)).toBeUndefined());
 it.each(['','123','1525643672194908330?guild_id=123','https://evil.invalid','01525643672194908330','1525643672194908330/other'])('rejects forged application configuration %s',id=>expect(()=>chainshiftActivityUrl(id)).toThrow('Invalid Activity application'));
});
