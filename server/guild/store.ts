import {canaryConfig,type GuildEligibility} from '../canary.js';
import type {Database} from '../database/pool.js';
import {digest} from '../sessions/crypto.js';
import {RULESET} from '../attempts/definition.js';
import {verifyGuild} from './projections.js';
export class BoardFailure extends Error {constructor(readonly code:'expired_session'|'board_unavailable'|'invalid_request'|'invalid_cursor'|'projection_mismatch'){super(code);}}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export function displayName(raw:string) {
  return Array.from(raw.normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'')).slice(0,80).join('').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))||'Player';
}
export interface BoardQuery {limit?:string;ruleset?:string;cursor?:string;}
export class GuildStore {
  constructor(private db:Database,private supported:readonly string[]=[RULESET.id],private allowsGuild:GuildEligibility=canaryConfig().allowsGuild){}
  async leaderboard(token:string,q:BoardQuery={}) {
    if(Object.keys(q).some(k=>!['limit','ruleset','cursor'].includes(k))||Object.values(q).some(v=>typeof v!=='string'))throw new BoardFailure('invalid_request');
    const limit=q.limit===undefined?25:Number(q.limit),ruleset=q.ruleset??RULESET.id;
    if((q.limit!==undefined&&!/^[1-9][0-9]{0,2}$/.test(q.limit))||limit>100||!this.supported.includes(ruleset))throw new BoardFailure('invalid_request');
    let cursor:{a:string;c:string}|null=null;
    if(q.cursor!==undefined){
      try{if(q.cursor.length>256||!q.cursor.length||!/^[A-Za-z0-9_-]+$/.test(q.cursor))throw Error();const data=JSON.parse(Buffer.from(q.cursor,'base64url').toString('utf8'));
        if(Object.keys(data).sort().join(',')!=='a,c'||!uuid.test(data.a)||!/^[a-f0-9]{64}$/.test(data.c)||Buffer.from(JSON.stringify(data)).toString('base64url')!==q.cursor)throw Error();cursor=data;
      }catch{throw new BoardFailure('invalid_cursor');}
    }
    // Return domain failures as values so the DB error sanitizer never sees personal errors.
    const result=await this.db.transaction(async c=>{
      await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
      const s=(await c.query(`SELECT s.player_id,s.guild_id,g.discord_guild_id FROM arcade.application_sessions s JOIN arcade.guilds g USING(guild_id)
        WHERE s.token_digest=$1 AND s.origin_class='activity' AND s.transport='cookie' AND s.revoked_at IS NULL
        AND s.expires_at>clock_timestamp() AND s.idle_expires_at>clock_timestamp() AND g.status='enabled'`,[digest(token)])).rows[0];
      if(!s)return {error:'expired_session' as const};
      if(!this.allowsGuild(s.discord_guild_id))return {error:'board_unavailable' as const};
      const v=(await c.query('SELECT version_id,issuance_enabled FROM arcade.game_versions WHERE game_key=$1 AND ruleset_id=$2',['balance',ruleset])).rows[0];
      if(!v)return {error:'board_unavailable' as const};
      if((await verifyGuild(c,s.guild_id,v.version_id)).status!=='consistent')return {error:'projection_mismatch' as const};
      const revision=(await c.query("SELECT COALESCE(max(accepted_at)::text,'empty') AS revision FROM arcade.game_attempts WHERE guild_id=$1 AND version_id=$2 AND disposition='accepted'",[s.guild_id,v.version_id])).rows[0].revision;
      const context=digest(s.guild_id+'/'+v.version_id+'/'+revision);
      let anchor:Record<string,any>|undefined;
      if(cursor){if(cursor.c!==context)return {error:'invalid_cursor' as const};anchor=(await c.query('SELECT best_ticks,best_accepted_at::text AS at,player_id FROM arcade.guild_leaderboard_entries WHERE guild_id=$1 AND version_id=$2 AND best_attempt_id=$3',[s.guild_id,v.version_id,cursor.a])).rows[0];if(!anchor)return {error:'invalid_cursor' as const};}
      const ranked=`WITH ranked AS (SELECT l.*,p.display_name,row_number() OVER(ORDER BY best_ticks DESC,best_accepted_at,l.player_id)::text AS rank
        FROM arcade.guild_leaderboard_entries l JOIN arcade.players p USING(player_id) WHERE guild_id=$1 AND version_id=$2)`;
      const rows=(await c.query(ranked+` SELECT * FROM ranked WHERE $3::integer IS NULL OR best_ticks<$3 OR
        (best_ticks=$3 AND (best_accepted_at,player_id)>($4::timestamptz,$5::uuid)) ORDER BY best_ticks DESC,best_accepted_at,player_id LIMIT $6`,[s.guild_id,v.version_id,anchor?.best_ticks??null,anchor?.at??null,anchor?.player_id??null,limit+1])).rows;
      const own=(await c.query(ranked+' SELECT * FROM ranked WHERE player_id=$3',[s.guild_id,v.version_id,s.player_id])).rows[0];
      const record=(await c.query(`SELECT r.sequence::text,a.ticks,a.accepted_at,a.player_id,p.display_name FROM arcade.guild_game_records r
        JOIN arcade.game_attempts a ON a.attempt_id=r.record_attempt_id JOIN arcade.players p ON p.player_id=a.player_id
        WHERE r.guild_id=$1 AND r.version_id=$2`,[s.guild_id,v.version_id])).rows[0];
      const page=rows.slice(0,limit);
      const safe=(r:Record<string,any>)=>({playerTag:digest(s.guild_id+'/'+r.player_id).slice(0,20),displayName:displayName(r.display_name),ticks:r.best_ticks,acceptedAt:r.best_accepted_at.toISOString(),rank:r.rank,isYou:r.player_id===s.player_id});
      return {value:{rulesetId:ruleset,archived:!v.issuance_enabled,entries:page.map(safe),ownEntry:own?{...safe(own),inPage:page.some(r=>r.player_id===s.player_id)}:null,
        record:record?{playerTag:digest(s.guild_id+'/'+record.player_id).slice(0,20),displayName:displayName(record.display_name),ticks:record.ticks,acceptedAt:record.accepted_at.toISOString(),sequence:record.sequence}:null,
        nextCursor:rows.length>limit?Buffer.from(JSON.stringify({a:page.at(-1)!.best_attempt_id,c:context})).toString('base64url'):null}};
    });
    if('error' in result)throw new BoardFailure(result.error!);return result.value;
  }
}
