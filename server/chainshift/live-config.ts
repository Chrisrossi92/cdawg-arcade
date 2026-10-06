import {canaryConfig} from '../canary.js';
import {chainshiftServerEnabled} from '../../config/chainshift-release.js';
export const CHAINSHIFT_PILOT_CHANNEL = '1549149791915737129';
export const ARCADE_APPLICATION_ID = '1525643672194908330';
export const snowflake = (v:unknown):v is string => typeof v==='string' && /^[1-9][0-9]{16,19}$/.test(v);
export function approvedChannel(value:unknown):asserts value is typeof CHAINSHIFT_PILOT_CHANNEL {
 if(value!==CHAINSHIFT_PILOT_CHANNEL)throw new Error('Forbidden Chainshift destination');
}
export interface LiveDeliveryConfig {applicationId:string;channelId:string;pilotDay:string|null;allowsGuild:(id:string)=>boolean}
/** Capability, configuration and activation are distinct. No default posting or recurring audience expansion. */
export function liveDeliveryConfig(env:NodeJS.ProcessEnv=process.env):LiveDeliveryConfig|null {
 if(env.CHAINSHIFT_DAILY_DELIVERY_ENABLED!=='true'||!chainshiftServerEnabled(env)||env.ARCADE_SESSIONS_ENABLED!=='true'||
    env.CHAINSHIFT_DAILY_CHANNEL_ID!==CHAINSHIFT_PILOT_CHANNEL||env.DISCORD_CLIENT_ID!==ARCADE_APPLICATION_ID||
    !env.DISCORD_ARCADE_BOT_TOKEN)return null;
 const scope=env.CHAINSHIFT_DAILY_SCOPE??'pilot';
 if(!['pilot','daily'].includes(scope))return null;
 let pilotDay:string|null=null;
 if(scope==='pilot'){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(env.CHAINSHIFT_DAILY_PILOT_DAY??''))return null;
  pilotDay=env.CHAINSHIFT_DAILY_PILOT_DAY!;
  const date=new Date(pilotDay+'T12:00:00Z');
  if(!Number.isFinite(+date)||date.toISOString().slice(0,10)!==pilotDay)return null;
 }else if(env.CHAINSHIFT_DAILY_PILOT_DAY!==undefined)return null;
 const canary=canaryConfig(env);
 return {applicationId:ARCADE_APPLICATION_ID,channelId:CHAINSHIFT_PILOT_CHANNEL,pilotDay,allowsGuild:canary.allowsGuild};
}
