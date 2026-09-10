import {createHash} from 'node:crypto';
export type GuildEligibility=(discordGuild:string)=>boolean;
export interface CanaryConfig {allowsGuild:GuildEligibility; issuance:boolean;scoring:boolean;leaderboards:boolean;}
export function canaryConfig(env:NodeJS.ProcessEnv=process.env):CanaryConfig {
 const ids=(env.ARCADE_CANARY_GUILD_IDS??'').split(',').map(s=>s.trim()).filter(Boolean);
 // This rollout supports precisely one explicitly configured guild. Invalid config fails closed.
 const hash=env.ARCADE_CANARY_GUILD_HASH??'';
 const hashed=ids.length===0&&/^[a-f0-9]{64}$/.test(hash);
 const valid=!hash&&ids.length===1&&/^[1-9][0-9]{16,19}$/.test(ids[0]);
 return {allowsGuild:id=>hashed?createHash('sha256').update(id).digest('hex')===hash:valid&&id===ids[0],issuance:env.ARCADE_ATTEMPTS_ENABLED==='true',scoring:env.OFFICIAL_SCORING_ENABLED==='true',leaderboards:env.ARCADE_LEADERBOARDS_ENABLED==='true'};
}
export function officialAvailability(config:CanaryConfig,guild:string,status:string,activity:boolean) {
 if(!activity)return 'practice' as const;
 if(!config.allowsGuild(guild)||status!=='enabled')return 'other-server' as const;
 return config.issuance&&config.scoring&&config.leaderboards?'eligible' as const:'unavailable' as const;
}
