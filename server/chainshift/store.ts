import {randomUUID} from 'node:crypto';
import {DatabaseError,type Database,type SqlConnection} from '../database/pool.js';
import {digest,equal} from '../sessions/crypto.js';
import {retryTransaction} from '../results/transaction.js';
import {displayName} from '../guild/store.js';
import {enrichedReferee} from '../../shared/chainshift/enrichment/graph-v2.js';
import type {DailyView,RankedAttempt,RankedReply,RankedBoard,RankedRoutes,RankedRow} from '../../shared/chainshift/competition.js';
import {safePuzzle,validPublication} from './publication.js';
export class ChainshiftFailure extends DatabaseError {
 constructor(readonly reason:'expired_session'|'csrf_invalid'|'account_changed'|'unavailable'|'not_found'|'invalid_request'|'state_conflict'|'request_conflict'|'completed'|'routes_locked'|'limit_reached'){super('cancelled');}
}
export interface RankedCredentials {token:string;playerId:string;csrf?:string}
type Row=Record<string,any>;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const error=(reason:ChainshiftFailure['reason']):never=>{throw new ChainshiftFailure(reason);};
export class ChainshiftStore {
 constructor(private db:Database,private allowsGuild:(id:string)=>boolean,private fixtureDay?:()=>string){}
 private async auth(c:SqlConnection,credentials:RankedCredentials,write=false):Promise<Row>{
  if(!/^[A-Za-z0-9_-]{43}$/.test(credentials.token)||!/^\d{17,20}$/.test(credentials.playerId))return error('expired_session');
  const s=(await c.query(`SELECT s.*,p.discord_user_id,p.display_name,g.discord_guild_id,g.status AS guild_status FROM arcade.application_sessions s
   JOIN arcade.players p USING(player_id) JOIN arcade.guilds g USING(guild_id)
   WHERE token_digest=$1 AND origin_class='activity' AND transport='cookie' AND revoked_at IS NULL
   AND expires_at>clock_timestamp() AND idle_expires_at>clock_timestamp() FOR ${write?'UPDATE':'SHARE'} OF s`,[digest(credentials.token)])).rows[0];
  if(!s)return error('expired_session');
  if(s.discord_user_id!==credentials.playerId)return error('account_changed');
  if(write&&!equal(digest(credentials.csrf??''),s.csrf_digest??''))return error('csrf_invalid');
  if(!this.allowsGuild(s.discord_guild_id)||s.guild_status!=='enabled')return error('unavailable');
  if(write)await c.query('SELECT player_id FROM arcade.players WHERE player_id=$1 FOR UPDATE',[s.player_id]);
  const now=(await c.query('SELECT clock_timestamp() AS now')).rows[0].now;
  if(s.expires_at<=now||s.idle_expires_at<=now)return error('expired_session');
  if(+s.membership_verified_at>+now+5000||+now-+s.membership_verified_at>30*60_000)return error('expired_session');
  return s;
 }
 private async puzzle(c:SqlConnection,id?:string):Promise<Row>{
  const p=(await c.query(`SELECT *,day_key::text AS day_key FROM arcade.chainshift_puzzles WHERE ${id?'puzzle_id=$1':"day_key=($1::text)::date"}`,
   [id??this.fixtureDay?.()??(await c.query("SELECT to_char(clock_timestamp() AT TIME ZONE 'America/New_York','YYYY-MM-DD') AS day")).rows[0].day])).rows[0];
  if(!p||!validPublication(p))return error('unavailable');return p;
 }
 private async attempt(c:SqlConnection,id:string,player:string,lock=false):Promise<Row>{
  if(!uuid.test(id))return error('invalid_request');
  const a=(await c.query(`SELECT *,floor(extract(epoch FROM(clock_timestamp()-claimed_at))*1000)::text AS running_ms FROM arcade.chainshift_attempts WHERE attempt_id=$1 AND player_id=$2 ${lock?'FOR UPDATE':''}`,[id,player])).rows[0];
  if(!a)return error('not_found');return a;
 }
 private async view(c:SqlConnection,a:Row,p?:Row):Promise<RankedAttempt>{
  const puzzle=p??await this.puzzle(c,a.puzzle_id);
  const timing=(await c.query('SELECT clock_timestamp() AS now,floor(extract(epoch FROM(clock_timestamp()-claimed_at))*1000)::text AS running_ms FROM arcade.chainshift_attempts WHERE attempt_id=$1',[a.attempt_id])).rows[0];const now=timing.now as Date;
  return {attemptId:a.attempt_id,puzzle:safePuzzle(puzzle),state:a.state,route:[...a.route],revision:a.revision,
   claimedAt:a.claimed_at.toISOString(),serverNow:now.toISOString(),completedAt:a.completed_at?.toISOString()??null,
   shifts:a.route.length-1,elapsedMs:a.state==='completed'?Number(a.elapsed_ms):Math.max(0,Number(timing.running_ms))};
 }
 async daily(credentials:RankedCredentials):Promise<DailyView>{return this.db.transaction(async c=>{
  const s=await this.auth(c,credentials);let p:Row;
  try{p=await this.puzzle(c);}catch(e){if(!(e instanceof ChainshiftFailure)||e.reason!=='unavailable')throw e;const open=(await c.query("SELECT puzzle_id FROM arcade.chainshift_attempts WHERE player_id=$1 AND state='active' ORDER BY claimed_at LIMIT 1",[s.player_id])).rows[0];if(!open)throw e;p=await this.puzzle(c,open.puzzle_id);}
  const a=(await c.query(`SELECT *,floor(extract(epoch FROM(clock_timestamp()-claimed_at))*1000)::text AS running_ms FROM arcade.chainshift_attempts
   WHERE player_id=$1 AND (puzzle_id=$2 OR state='active') ORDER BY (puzzle_id=$2) DESC,claimed_at LIMIT 1`,[s.player_id,p.puzzle_id])).rows[0];
  return {puzzle:safePuzzle(p),attempt:a?await this.view(c,a):null,player:{id:s.discord_user_id,displayName:displayName(s.display_name)}};
 });}
 async start(credentials:RankedCredentials,puzzleId:string):Promise<RankedReply>{return retryTransaction(this.db,async c=>{
  const s=await this.auth(c,credentials,true),p=await this.puzzle(c);
  if(puzzleId!==p.puzzle_id)return error('state_conflict');
  await c.query(`INSERT INTO arcade.chainshift_attempts(attempt_id,puzzle_id,player_id,launch_guild_id,route)
   VALUES($1,$2,$3,$4,$5) ON CONFLICT(player_id,puzzle_id) DO NOTHING`,[randomUUID(),p.puzzle_id,s.player_id,s.guild_id,[p.start_word]]);
  const a=(await c.query("SELECT *,floor(extract(epoch FROM(clock_timestamp()-claimed_at))*1000)::text AS running_ms FROM arcade.chainshift_attempts WHERE player_id=$1 AND puzzle_id=$2",[s.player_id,p.puzzle_id])).rows[0];
  return {attempt:await this.view(c,a,p),feedback:{kind:'none',text:a.state==='completed'?'Ranked attempt already completed.':'Ranked timer is running.'}};
 });}
 async resume(credentials:RankedCredentials,id:string):Promise<RankedAttempt>{return this.db.transaction(async c=>{
  const s=await this.auth(c,credentials);return this.view(c,await this.attempt(c,id,s.player_id));
 });}
 async mutate(credentials:RankedCredentials,id:string,requestId:string,revision:number,kind:'shift'|'backtrack',word?:string):Promise<RankedReply>{
  if(!uuid.test(requestId)||!Number.isSafeInteger(revision)||revision<0||revision>10000||(kind==='shift'&&(typeof word!=='string'||word.length>64)))return error('invalid_request');
  const hash=digest(JSON.stringify({revision,kind,word:word??null}));
  return retryTransaction(this.db,async c=>{
   const s=await this.auth(c,credentials,true),a=await this.attempt(c,id,s.player_id,true);
   const p=await this.puzzle(c,a.puzzle_id);
   const prior=(await c.query('SELECT request_digest,outcome FROM arcade.chainshift_actions WHERE attempt_id=$1 AND request_id=$2',[id,requestId])).rows[0];
   if(prior){if(prior.request_digest!==hash)return error('request_conflict');return {attempt:await this.view(c,await this.attempt(c,id,s.player_id),p),feedback:prior.outcome,duplicate:true};}
   if(a.state==='completed')return error('completed');
   if(a.revision!==revision)return error('state_conflict');
   if(a.revision>=10000)return error('limit_reached');
   let route=[...a.route],feedback:RankedReply['feedback']={kind:'none',text:'START cannot be removed.'};
   if(kind==='backtrack'&&route.length>1){const removed=route.pop()!;feedback={kind:'backtracked',text:`Back to ${route.at(-1)!.toUpperCase()}.`,removed};}
   if(kind==='shift'){
    const edge=enrichedReferee.lookupEdge(route.at(-1)!,word!);
    if(!edge)feedback={kind:'rejected',text:'Not a recognized shift.'};
    else {
     if(route.length>=2048)return error('limit_reached');route.push(edge.to);
     feedback=edge.to===p.finish_word?{kind:'completed',text:`Chain complete. ${route.length-1} shifts.`}:{kind:'accepted',text:edge.phrase};
    }
   }
   await c.query('UPDATE arcade.chainshift_attempts SET route=$2,revision=revision+1,state=$3 WHERE attempt_id=$1',[id,route,feedback.kind==='completed'?'completed':'active']);
   await c.query('INSERT INTO arcade.chainshift_actions(attempt_id,request_id,request_digest,outcome) VALUES($1,$2,$3,$4)',[id,requestId,hash,JSON.stringify(feedback)]);
   return {attempt:await this.view(c,await this.attempt(c,id,s.player_id),p),feedback};
  });
 }
 private async rankings(c:SqlConnection,s:Row,puzzleId:string,scope:'global'|'guild',reveal=false):Promise<{rows:(RankedRow&{route?:string[]})[];own:RankedRow|null}>{
  await this.puzzle(c,puzzleId);
  const project=(r:Row)=>({playerTag:digest(puzzleId+'/'+r.player_id).slice(0,20),displayName:displayName(r.display_name),shifts:r.final_shifts,elapsedMs:Number(r.elapsed_ms),rank:Number(r.rank),isYou:r.player_id===s.player_id,...(reveal?{route:r.route}: {})});
  const ranked=`WITH ranked AS (SELECT a.player_id,p.display_name,a.final_shifts,a.elapsed_ms${reveal?',a.route':''},rank() OVER(ORDER BY a.final_shifts,a.elapsed_ms) AS rank
   FROM arcade.chainshift_attempts a JOIN arcade.players p USING(player_id) WHERE a.puzzle_id=$1 AND a.state='completed'
   AND ($2::uuid IS NULL OR EXISTS(SELECT 1 FROM arcade.guild_participations gp WHERE gp.player_id=a.player_id AND gp.guild_id=$2
    AND gp.membership_verified_at>clock_timestamp()-interval '30 minutes'))) `;
  const args=[puzzleId,scope==='guild'?s.guild_id:null];
  const rows=(await c.query(ranked+'SELECT * FROM ranked ORDER BY final_shifts,elapsed_ms,player_id LIMIT 100',args)).rows.map(project);
  const own=(await c.query(ranked+'SELECT * FROM ranked WHERE player_id=$3',[...args,s.player_id])).rows[0];
  return {rows,own:own?project(own):null};
 }
 async leaderboard(credentials:RankedCredentials,puzzleId:string,scope:'global'|'guild'):Promise<RankedBoard>{return this.db.transaction(async c=>{
  const s=await this.auth(c,credentials),r=await this.rankings(c,s,puzzleId,scope);return {puzzleId,scope,...r,limit:100};
 });}
 async routes(credentials:RankedCredentials,puzzleId:string,scope:'global'|'guild'):Promise<RankedRoutes>{return this.db.transaction(async c=>{
  const s=await this.auth(c,credentials);
  if(!(await c.query("SELECT 1 FROM arcade.chainshift_attempts WHERE player_id=$1 AND puzzle_id=$2 AND state='completed'",[s.player_id,puzzleId])).rowCount)return error('routes_locked');
  const r=await this.rankings(c,s,puzzleId,scope,true);return {puzzleId,rows:r.rows as RankedRoutes['rows']};
 });}
}
