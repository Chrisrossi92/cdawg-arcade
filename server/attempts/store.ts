import {addAccepted,verifyPersonal} from '../results/aggregates.js';
import {canonicalInvalid} from '../results/canonical.js';
import {retryTransaction,ResultAbort} from '../results/transaction.js';
import { randomUUID } from 'node:crypto';
import type { Database, SqlConnection } from '../database/pool.js';
import { digest, equal } from '../sessions/crypto.js';
import { RULESET } from './definition.js';
import { parseEvidence, replayBalance, type ReplayResult } from './replay.js';

export type AttemptError = 'expired_session' | 'csrf_invalid' | 'fresh_verification_required' | 'attempts_unavailable' | 'invalid_request' | 'not_found' | 'attempt_conflict' | 'retry_expired' | 'rate_limited' | 'submission_conflict' | 'aggregate_mismatch';
export class AttemptFailure extends Error { constructor(readonly code: AttemptError) { super(code); } }
export interface Credentials { token: string; csrf: string; }
export interface AuthorizationView { attemptId: string; rulesetId: string; simulationDigest: string; validatorRevision: string; tickRate: number; maxTicks: number; issuedAt: string; submitDeadline: string; retryDeadline: string; state: string; }
export type ResultReason = 'accepted' | 'rejected_invalid_trace' | 'rejected_impossible_result' | 'rejected_interrupted' | 'rejected_version' | 'expired';
export interface ResultView { attemptId: string; disposition: ReplayResult['disposition'] | 'expired'; ticks: number; reason: ResultReason; }
type Row = Record<string, any>;
type Outcome<T> = {value:T} | {error:AttemptError};
const fail = (error:AttemptError) => ({error} as const);
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export const validAttemptId = (value:unknown): value is string => typeof value === 'string' && uuid.test(value);
export class AttemptStore {
  constructor(private db:Database) {}
  private unwrap<T>(outcome:Outcome<T>):T { if ('error' in outcome) throw new AttemptFailure(outcome.error); return outcome.value; }
  // Lock session before player, authorization and guild. All write paths use this order.
  // Return domain failures rather than throwing them through the DB's error sanitizer.
  private async authenticated(c:SqlConnection, credentials:Credentials, mutation=true):Promise<Outcome<Row>> {
    const row = (await c.query(`SELECT * FROM arcade.application_sessions
      WHERE token_digest=$1 AND origin_class='activity' AND transport='cookie'
      AND revoked_at IS NULL AND expires_at>clock_timestamp() AND idle_expires_at>clock_timestamp() ${mutation?'FOR UPDATE':''}`,[digest(credentials.token)])).rows[0];
    if (!row) return fail('expired_session');
    if (mutation && !equal(digest(credentials.csrf),row.csrf_digest ?? '')) return fail('csrf_invalid');
    if (mutation) await c.query('SELECT player_id FROM arcade.players WHERE player_id=$1 FOR UPDATE',[row.player_id]);
    // Locks may have waited; recheck absolute and idle expiry after acquiring all identity locks.
    const {now} = (await c.query('SELECT clock_timestamp() AS now')).rows[0];
    if (row.expires_at <= now || row.idle_expires_at <= now) return fail('expired_session');
    return {value:{...row,now}};
  }
  private async eligible(c:SqlConnection, row:Row, fresh:boolean):Promise<AttemptError | null> {
    const version = (await c.query('SELECT * FROM arcade.game_versions WHERE version_id=$1',[RULESET.versionId])).rows[0];
    if (!version || !version.issuance_enabled || version.ruleset_id!==RULESET.id || version.simulation_digest!==RULESET.simulationDigest ||
      version.validator_revision!==RULESET.validatorRevision || version.tick_rate!==RULESET.tickRate || version.max_ticks!==RULESET.maxTicks ||
      (version.submission_deadline && version.submission_deadline <= row.now)) return 'attempts_unavailable';
    const guild=(await c.query('SELECT status FROM arcade.guilds WHERE guild_id=$1 FOR SHARE',[row.guild_id])).rows[0];
    row.now = (await c.query('SELECT clock_timestamp() AS now')).rows[0].now;
    if (row.expires_at <= row.now || row.idle_expires_at <= row.now) return 'expired_session';
    if (version.submission_deadline && version.submission_deadline <= row.now) return 'attempts_unavailable';
    if (guild?.status !== 'enabled') return 'attempts_unavailable';
    if (fresh && (row.now - row.membership_verified_at > RULESET.membershipFreshMs || +row.membership_verified_at > +row.now + 5000)) return 'fresh_verification_required';
    return null;
  }
  private view(row:Row):AuthorizationView {
    return {attemptId:row.attempt_id,rulesetId:RULESET.id,simulationDigest:RULESET.simulationDigest,validatorRevision:RULESET.validatorRevision,
      tickRate:RULESET.tickRate,maxTicks:RULESET.maxTicks,issuedAt:row.issued_at.toISOString(),submitDeadline:row.submit_deadline.toISOString(),retryDeadline:row.retry_deadline.toISOString(),state:row.state};
  }
  async begin(credentials:Credentials,beginKey:string,rulesetId:string):Promise<AuthorizationView> {
    if (!validAttemptId(beginKey) || rulesetId!==RULESET.id) throw new AttemptFailure('invalid_request');
    return this.unwrap(await this.db.transaction<Outcome<AuthorizationView>>(async c=>{
      const auth=await this.authenticated(c,credentials); if ('error' in auth) return auth;
      const s=auth.value;
      await c.query("UPDATE arcade.attempt_authorizations SET state='expired' WHERE player_id=$1 AND state='open' AND submit_deadline<=clock_timestamp()",[s.player_id]);
      const existing=(await c.query('SELECT * FROM arcade.attempt_authorizations WHERE player_id=$1 AND begin_key=$2 FOR UPDATE',[s.player_id,beginKey])).rows[0];
      if (existing) {
        if (existing.session_id!==s.session_id || existing.guild_id!==s.guild_id || existing.version_id!==RULESET.versionId) return fail('attempt_conflict');
        if (s.now >= existing.retry_deadline) return fail('retry_expired');
        return {value:this.view(existing)};
      }
      const unavailable=await this.eligible(c,s,true); if (unavailable) return fail(unavailable);
      const open=await c.query("SELECT attempt_id FROM arcade.attempt_authorizations WHERE player_id=$1 AND game_key='balance' AND state='open'",[s.player_id]);
      if (open.rowCount) return fail('attempt_conflict');
      const recent=(await c.query("SELECT count(*)::int AS n FROM arcade.attempt_authorizations WHERE player_id=$1 AND issued_at>clock_timestamp()-interval '1 minute'",[s.player_id])).rows[0].n;
      if (recent>=20) return fail('rate_limited');
      const issued=(await c.query(`INSERT INTO arcade.attempt_authorizations(attempt_id,player_id,guild_id,version_id,session_id,begin_key,issued_at,submit_deadline,retry_deadline)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[randomUUID(),s.player_id,s.guild_id,RULESET.versionId,s.session_id,beginKey,s.now,new Date(+s.now+RULESET.submitWindowMs),new Date(+s.now+RULESET.retryWindowMs)])).rows[0];
      return {value:this.view(issued)};
    }));
  }
  async cancel(credentials:Credentials,attemptId:string):Promise<{state:'cancelled'}> {
    if (!validAttemptId(attemptId)) throw new AttemptFailure('invalid_request');
    return this.unwrap(await this.db.transaction<Outcome<{state:'cancelled'}>>(async c=>{
      const auth=await this.authenticated(c,credentials); if ('error' in auth) return auth;
      const s=auth.value;
      const a=(await c.query('SELECT * FROM arcade.attempt_authorizations WHERE attempt_id=$1 AND player_id=$2 AND guild_id=$3 AND session_id=$4 FOR UPDATE',[attemptId,s.player_id,s.guild_id,s.session_id])).rows[0];
      if (!a) return fail('not_found');
      if (!['open','cancelled'].includes(a.state)) return fail('attempt_conflict');
      await c.query("UPDATE arcade.attempt_authorizations SET state='cancelled' WHERE attempt_id=$1",[attemptId]);
      return {value:{state:'cancelled'}};
    }));
  }
  async submit(credentials:Credentials,attemptId:string,raw:unknown):Promise<ResultView> {
    const evidence=parseEvidence(raw);
    const canonical=evidence ? JSON.stringify(evidence) : canonicalInvalid(raw);
    if (!validAttemptId(attemptId) || canonical===null) throw new AttemptFailure('invalid_request');
    const bytes=Buffer.from(canonical),evidenceDigest=digest(canonical);
    try {return this.unwrap(await retryTransaction<Outcome<ResultView>>(this.db,async c=>{
      const auth=await this.authenticated(c,credentials);if ('error' in auth) return auth;
      const s=auth.value;
      const a=(await c.query('SELECT * FROM arcade.attempt_authorizations WHERE attempt_id=$1 AND player_id=$2 AND guild_id=$3 AND session_id=$4 FOR UPDATE',[attemptId,s.player_id,s.guild_id,s.session_id])).rows[0];
      if (!a) return fail('not_found');
      if (s.now>=a.retry_deadline) return fail('retry_expired');
      if (a.submission_digest) {
        if (a.submission_digest!==evidenceDigest) return fail('submission_conflict');
        const saved=(await c.query('SELECT disposition,ticks,reason_code FROM arcade.game_attempts WHERE attempt_id=$1',[attemptId])).rows[0];
        if (!saved) return fail('submission_conflict');
        return {value:{attemptId,disposition:saved.disposition,ticks:saved.ticks,reason:saved.reason_code}};
      }
      if (!['open','expired'].includes(a.state) || a.version_id!==RULESET.versionId) return fail('submission_conflict');
      const available=await this.eligible(c,s,false);
      if (available==='expired_session') return fail(available);
      const received=(await c.query('SELECT clock_timestamp() AS now')).rows[0].now as Date;
      if (s.expires_at<=received || s.idle_expires_at<=received) return fail('expired_session');
      let disposition:ResultView['disposition']='rejected',ticks=0;
      let reason:ResultReason='rejected_invalid_trace';
      let interruptions=evidence?.interruptions??0,failureDirection:ReplayResult['failureDirection']=null,failurePhase:ReplayResult['failurePhase']=null;
      if (received>=a.submit_deadline || a.state==='expired') {disposition='expired';reason='expired';}
      else if (available || (evidence && evidence.rulesetId!==RULESET.id)) reason='rejected_version';
      else if (evidence) {
        if (evidence.interruptions) {disposition='practice';reason='rejected_interrupted';}
        else if (+received-+a.issued_at<RULESET.countdownMs+evidence.ticks*1000/RULESET.tickRate) reason='rejected_impossible_result';
        else {
          const result=replayBalance(evidence);
          if (result.disposition==='accepted') {disposition='accepted';ticks=result.ticks;reason='accepted';failureDirection=result.failureDirection;failurePhase=result.failurePhase;}
          else reason=result.reason==='unsupported_ruleset'?'rejected_version':'rejected_impossible_result';
        }
      }
      // A mismatch is operational failure, never silently repaired or incremented.
      if (disposition==='accepted' && (await verifyPersonal(c,s.player_id,RULESET.versionId)).status!=='consistent') return fail('aggregate_mismatch');
      // Preserve a deterministic earlier-best tie order even within one clock microsecond.
      const recorded=(await c.query(`SELECT GREATEST(clock_timestamp(),COALESCE((SELECT last_accepted_at+interval '1 microsecond'
        FROM arcade.personal_game_stats WHERE player_id=$1 AND version_id=$2),'-infinity'::timestamptz))::text AS at`,[s.player_id,RULESET.versionId])).rows[0].at;
      await c.query(`INSERT INTO arcade.game_attempts(attempt_id,player_id,guild_id,version_id,disposition,ticks,max_ticks,interruption_count,failure_direction,failure_phase,accepted_at,reason_code,evidence_digest,validator_revision)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,[attemptId,s.player_id,s.guild_id,RULESET.versionId,disposition,ticks,RULESET.maxTicks,interruptions,failureDirection,failurePhase,recorded,reason,evidenceDigest,RULESET.validatorRevision]);
      if (disposition==='accepted') {
        await c.query("INSERT INTO arcade.attempt_traces(attempt_id,encoding,evidence,expires_at) VALUES($1,'balance-edges-json-v1',$2,$3::timestamptz+interval '7 days')",[attemptId,bytes,recorded]);
        await addAccepted(c,attemptId);
      }
      // Rejected/practice/expired traces are omitted; only bounded metadata/digest survive.
      await c.query("UPDATE arcade.attempt_authorizations SET state=$2,first_received_at=$3,submission_digest=$4 WHERE attempt_id=$1",[attemptId,disposition==='expired'?'expired':'submitted',received,evidenceDigest]);
      const end=(await c.query('SELECT clock_timestamp() AS now')).rows[0].now;
      if (s.expires_at<=end || s.idle_expires_at<=end) throw new ResultAbort('expired_session');
      return {value:{attemptId,disposition,ticks,reason}};
    }));}catch(error){if(error instanceof ResultAbort)throw new AttemptFailure(error.reason);throw error;}
  }
  async stats(token:string) {
    return this.unwrap(await this.db.transaction<Outcome<Record<string,unknown>>>(async c=>{
      // Read-only repeatable snapshot: verification and values refer to one committed state.
      await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
      const auth=await this.authenticated(c,{token,csrf:''},false);if ('error' in auth)return auth;
      const s=auth.value;
      if ((await verifyPersonal(c,s.player_id,RULESET.versionId)).status!=='consistent') return fail('aggregate_mismatch');
      const r=(await c.query(`SELECT s.official_count::text,s.total_ticks::text,s.best_ticks,s.best_attempt_id,s.first_accepted_at,s.last_accepted_at,
        round(s.total_ticks::numeric/s.official_count,6)::text AS average_ticks,
        round(s.total_ticks::numeric/s.official_count/60,6)::text AS average_seconds,
        round(s.best_ticks::numeric/60,6)::text AS best_seconds
        FROM arcade.personal_game_stats s WHERE player_id=$1 AND version_id=$2`,[s.player_id,RULESET.versionId])).rows[0];
      const enabled=(await c.query("SELECT 1 FROM arcade.game_versions v JOIN arcade.guilds g ON g.guild_id=$2 WHERE v.version_id=$1 AND v.issuance_enabled AND g.status='enabled' AND v.simulation_digest=$3 AND v.ruleset_id=$4 AND v.validator_revision=$5 AND v.tick_rate=$6 AND v.max_ticks=$7 AND (v.submission_deadline IS NULL OR v.submission_deadline>clock_timestamp())",[RULESET.versionId,s.guild_id,RULESET.simulationDigest,RULESET.id,RULESET.validatorRevision,RULESET.tickRate,RULESET.maxTicks])).rowCount===1;
      return {value:{rulesetId:RULESET.id,officialAvailable:enabled,acceptedCount:r?.official_count??'0',totalTicks:r?.total_ticks??'0',
        averageTicks:r?.average_ticks??'0.000000',averageSeconds:r?.average_seconds??'0.000000',
        best:r?{attemptId:r.best_attempt_id,ticks:r.best_ticks,seconds:r.best_seconds}:null,
        firstAcceptedAt:r?.first_accepted_at.toISOString()??null,lastAcceptedAt:r?.last_accepted_at.toISOString()??null}};
    }));
  }
  async recent(token:string) {
    return this.unwrap(await this.db.transaction<Outcome<Record<string,unknown>>>(async c=>{
      await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
      const auth=await this.authenticated(c,{token,csrf:''},false);if ('error' in auth)return auth;
      const rows=(await c.query(`SELECT attempt_id,ticks,accepted_at FROM arcade.game_attempts WHERE player_id=$1 AND version_id=$2 AND disposition='accepted'
        ORDER BY accepted_at DESC,attempt_id DESC LIMIT 20`,[auth.value.player_id,RULESET.versionId])).rows;
      return {value:{rulesetId:RULESET.id,attempts:rows.map(r=>({attemptId:r.attempt_id,ticks:r.ticks,acceptedAt:r.accepted_at.toISOString(),disposition:'accepted'}))}};
    }));
  }
  async status(token:string,attemptId:string) {
    if (!validAttemptId(attemptId)) throw new AttemptFailure('not_found');
    return this.unwrap(await this.db.transaction<Outcome<Record<string,unknown>>>(async c=>{
      await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
      const auth=await this.authenticated(c,{token,csrf:''},false);if ('error' in auth)return auth;
      const s=auth.value;
      const a=(await c.query(`SELECT a.state,a.submit_deadline,t.disposition,t.ticks,t.reason_code FROM arcade.attempt_authorizations a
        LEFT JOIN arcade.game_attempts t USING(attempt_id) WHERE a.attempt_id=$1 AND a.player_id=$2 AND a.guild_id=$3 AND a.version_id=$4`,[attemptId,s.player_id,s.guild_id,RULESET.versionId])).rows[0];
      if (!a)return fail('not_found');
      if(a.disposition)return {value:{attemptId,disposition:a.disposition,ticks:a.ticks,reason:a.reason_code}};
      const state=a.state==='open'&&a.submit_deadline<=s.now?'expired':a.state;
      return {value:{attemptId,state,outcome:state==='cancelled'?'practice_only':state}};
    }));
  }
  async purge():Promise<void> {
    await this.db.query('DELETE FROM arcade.attempt_traces WHERE expires_at<=clock_timestamp()');
    await this.db.query("UPDATE arcade.attempt_authorizations SET state='expired' WHERE state='open' AND submit_deadline<=clock_timestamp()");
  }
}
