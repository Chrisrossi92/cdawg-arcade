import { randomUUID } from 'node:crypto';
import type { Database, SqlConnection } from '../database/pool.js';
import { digest, equal } from '../sessions/crypto.js';
import { RULESET } from './definition.js';
import { parseEvidence, replayBalance, type ReplayResult } from './replay.js';

export type AttemptError = 'expired_session' | 'csrf_invalid' | 'fresh_verification_required' | 'attempts_unavailable' | 'invalid_request' | 'not_found' | 'attempt_conflict' | 'retry_expired' | 'rate_limited';
export class AttemptFailure extends Error { constructor(readonly code: AttemptError) { super(code); } }
export interface Credentials { token: string; csrf: string; }
export interface AuthorizationView { attemptId: string; rulesetId: string; simulationDigest: string; validatorRevision: string; tickRate: number; maxTicks: number; issuedAt: string; submitDeadline: string; retryDeadline: string; state: string; }
export interface ResultView { attemptId: string; disposition: ReplayResult['disposition'] | 'expired'; ticks: number; reason: string; }
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
  private async authenticated(c:SqlConnection, credentials:Credentials):Promise<Outcome<Row>> {
    const row = (await c.query(`SELECT * FROM arcade.application_sessions
      WHERE token_digest=$1 AND origin_class='activity' AND transport='cookie'
      AND revoked_at IS NULL AND expires_at>clock_timestamp() AND idle_expires_at>clock_timestamp() FOR UPDATE`,[digest(credentials.token)])).rows[0];
    if (!row) return fail('expired_session');
    if (!equal(digest(credentials.csrf),row.csrf_digest ?? '')) return fail('csrf_invalid');
    await c.query('SELECT player_id FROM arcade.players WHERE player_id=$1 FOR UPDATE',[row.player_id]);
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
    if (!validAttemptId(attemptId) || !evidence) throw new AttemptFailure('invalid_request');
    // Parse into a bounded canonical representation, independent of caller key order.
    const bytes=Buffer.from(JSON.stringify(evidence)), evidenceDigest=digest(bytes.toString('utf8'));
    return this.unwrap(await this.db.transaction<Outcome<ResultView>>(async c=>{
      const auth=await this.authenticated(c,credentials); if ('error' in auth) return auth;
      const s=auth.value;
      const a=(await c.query('SELECT * FROM arcade.attempt_authorizations WHERE attempt_id=$1 AND player_id=$2 AND guild_id=$3 AND session_id=$4 FOR UPDATE',[attemptId,s.player_id,s.guild_id,s.session_id])).rows[0];
      if (!a) return fail('not_found');
      if (s.now >= a.retry_deadline) return fail('retry_expired');
      if (a.submission_digest) {
        if (a.submission_digest !== evidenceDigest) return fail('attempt_conflict');
        const result=(await c.query('SELECT disposition,ticks,reason_code FROM arcade.game_attempts WHERE attempt_id=$1',[attemptId])).rows[0];
        if (!result) return fail('attempt_conflict');
        return {value:{attemptId,disposition:result.disposition,ticks:result.ticks,reason:result.reason_code}};
      }
      if (!['open','expired'].includes(a.state) || a.version_id!==RULESET.versionId) return fail('attempt_conflict');
      const unavailable=await this.eligible(c,s,false); if (unavailable) return fail(unavailable);
      // Use server time after locking, never a client wall clock or a supplied score.
      const received=(await c.query('SELECT clock_timestamp() AS now')).rows[0].now as Date;
      if (s.expires_at <= received || s.idle_expires_at <= received) return fail('expired_session');
      let result:Omit<ReplayResult,'disposition'> & {disposition:ResultView['disposition']} = replayBalance(evidence);
      if (received >= a.submit_deadline || a.state==='expired') result={...result,disposition:'expired',ticks:0,reason:'invalid_evidence',failureDirection:null,failurePhase:null};
      else if (+received - +a.issued_at < RULESET.countdownMs + evidence.ticks*1000/RULESET.tickRate) result={...result,disposition:'rejected',ticks:0,reason:'invalid_evidence',failureDirection:null,failurePhase:null};
      const reason=result.disposition==='expired'?'submission_expired':(+received-+a.issued_at < RULESET.countdownMs+evidence.ticks*1000/RULESET.tickRate ? 'too_early' : result.reason);
      await c.query(`INSERT INTO arcade.game_attempts(attempt_id,player_id,guild_id,version_id,disposition,ticks,max_ticks,interruption_count,failure_direction,failure_phase,accepted_at,reason_code,evidence_digest,validator_revision)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,[attemptId,s.player_id,s.guild_id,RULESET.versionId,result.disposition,result.ticks,RULESET.maxTicks,result.interruptionCount,result.failureDirection,result.failurePhase,received,reason,evidenceDigest,RULESET.validatorRevision]);
      await c.query("INSERT INTO arcade.attempt_traces(attempt_id,encoding,evidence,expires_at) VALUES($1,'balance-edges-json-v1',$2,$3)",[attemptId,bytes,new Date(+received+7*86400000)]);
      await c.query("UPDATE arcade.attempt_authorizations SET state=$2,first_received_at=$3,submission_digest=$4 WHERE attempt_id=$1",[attemptId,result.disposition==='expired'?'expired':'submitted',received,evidenceDigest]);
      // Aggregates and record events intentionally have no write path in Phase 4D.
      return {value:{attemptId,disposition:result.disposition,ticks:result.ticks,reason}};
    }));
  }
  async purge():Promise<void> {
    await this.db.query('DELETE FROM arcade.attempt_traces WHERE expires_at<=clock_timestamp()');
    await this.db.query("UPDATE arcade.attempt_authorizations SET state='expired' WHERE state='open' AND submit_deadline<=clock_timestamp()");
  }
}
