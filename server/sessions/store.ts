import { randomUUID } from 'node:crypto';
import type { Database, SqlConnection } from '../database/pool.js';
import { ChallengeVault, csrfFor, digest, equal, secret } from './crypto.js';
import type { VerifiedIdentity } from './discord.js';
export const IDLE_MS = 30 * 60_000, ABSOLUTE_MS = 8 * 60 * 60_000, CHALLENGE_MS = 5 * 60_000;
export class SessionFailure extends Error { constructor(readonly code: 'expired' | 'invalid_challenge' | 'account_changed' | 'csrf_invalid') { super(code); } }
interface Challenge { verifier: string; origin: string; prior: string | null; }
export interface SessionView { status: 'verified'; player: {id: string; displayName: string}; guild: {id: string}; expiresAt: string; idleExpiresAt: string; csrf: string; }
interface SessionRow { [key: string]: unknown; session_id: string; player_id: string; guild_id: string; discord_user_id: string; discord_guild_id: string; display_name: string; authenticated_at: Date; expires_at: Date; idle_expires_at: Date; csrf_digest: string; }
export class SessionStore {
  private vault = new ChallengeVault();
  constructor(private db: Database, private now = Date.now) {}
  private async row(c: SqlConnection, token: string, origin: string, lock = false): Promise<SessionRow | undefined> {
    return (await c.query<SessionRow>(`SELECT s.*,p.discord_user_id,p.display_name,g.discord_guild_id FROM arcade.application_sessions s
      JOIN arcade.players p USING(player_id) JOIN arcade.guilds g USING(guild_id)
      WHERE token_digest=$1 AND revoked_at IS NULL AND expires_at>$2 AND idle_expires_at>$2 AND origin_class=$3
      ${lock ? 'FOR UPDATE OF s' : ''}`, [digest(token), new Date(this.now()), origin.includes('.discordsays.com') ? 'activity' : 'browser'])).rows[0];
  }
  private view(row: SessionRow, token: string): SessionView {
    return {status:'verified',player:{id:row.discord_user_id,displayName:row.display_name},guild:{id:row.discord_guild_id},
      expiresAt:row.expires_at.toISOString(),idleExpiresAt:row.idle_expires_at.toISOString(),csrf:csrfFor(token)};
  }
  async me(token: string, origin: string): Promise<SessionView> {
    const row = await this.row(this.db,token,origin); if (!row) throw new SessionFailure('expired');
    // Polling does not extend idle lifetime. Renewal requires a fresh authorization.
    return this.view(row, token);
  }
  async checkCsrf(token: string, origin: string, csrf: string): Promise<void> {
    const row = await this.row(this.db,token,origin); if (!row) throw new SessionFailure('expired');
    if (!equal(digest(csrf),row.csrf_digest)) throw new SessionFailure('csrf_invalid');
  }
  async challenge(origin: string, prior: string | null, oldBinding?: string) {
    const binding = secret(), id = randomUUID(), verifier = secret();
    const value: Challenge = {verifier,origin,prior:prior ? digest(prior) : null};
    await this.db.transaction(async c => {
      await c.query('DELETE FROM arcade.auth_challenges WHERE expires_at <= $1 OR binding_digest=$2', [new Date(this.now()), oldBinding ? digest(oldBinding) : '']);
      await c.query('INSERT INTO arcade.auth_challenges(challenge_id,binding_digest,verifier_ciphertext,issued_at,expires_at) VALUES($1,$2,$3,$4,$5)',
        [id,digest(binding),this.vault.seal(JSON.stringify(value)),new Date(this.now()),new Date(this.now()+CHALLENGE_MS)]);
    });
    return {id,binding,codeChallenge:Buffer.from(digest(verifier),'hex').toString('base64url')};
  }
  async consume(id: string, binding: string, origin: string, prior: string | null): Promise<Challenge> {
    const result = await this.db.query('UPDATE arcade.auth_challenges SET consumed_at=$3 WHERE challenge_id=$1 AND binding_digest=$2 AND consumed_at IS NULL AND expires_at>$3 RETURNING verifier_ciphertext', [id,digest(binding),new Date(this.now())]);
    if (!result.rows[0]) throw new SessionFailure('invalid_challenge');
    try {
      const value = JSON.parse(this.vault.open(result.rows[0].verifier_ciphertext)) as Challenge;
      if (value.origin !== origin || value.prior !== (prior ? digest(prior) : null)) throw new Error(); return value;
    } catch { throw new SessionFailure('invalid_challenge'); }
  }
  async finish(id: string, binding: string, identity: VerifiedIdentity, origin: string, prior: string | null) {
    const token = secret(), now = new Date(this.now());
    const result = await this.db.transaction(async c => {
      const challenge = await c.query('DELETE FROM arcade.auth_challenges WHERE challenge_id=$1 AND binding_digest=$2 AND consumed_at IS NOT NULL AND expires_at>$3 RETURNING challenge_id',[id,digest(binding),now]);
      if (!challenge.rowCount) return {failure:'invalid_challenge' as const};
      let authenticated = now, expires = new Date(this.now()+ABSOLUTE_MS);
      if (prior) {
        const old = await this.row(c,prior,origin,true);
        if (!old) return {failure:'expired' as const};
        await c.query('UPDATE arcade.application_sessions SET revoked_at=$2 WHERE session_id=$1',[old.session_id,now]);
        if (old.discord_user_id !== identity.userId || old.discord_guild_id !== identity.guildId) return {failure:'account_changed' as const};
        authenticated = old.authenticated_at; expires = old.expires_at;
      }
      const player = (await c.query(`INSERT INTO arcade.players(player_id,discord_user_id,display_name,avatar_hash,profile_refreshed_at,last_active_at)
        VALUES($1,$2,$3,$4,$5,$5) ON CONFLICT(discord_user_id) DO UPDATE SET display_name=EXCLUDED.display_name,avatar_hash=EXCLUDED.avatar_hash,profile_refreshed_at=EXCLUDED.profile_refreshed_at,last_active_at=EXCLUDED.last_active_at RETURNING player_id`, [randomUUID(),identity.userId,identity.displayName,identity.avatarHash,now])).rows[0].player_id;
      // The instance API proves guild identity but supplies no guild display name.
      const guild = (await c.query(`INSERT INTO arcade.guilds(guild_id,discord_guild_id,display_name,first_seen_at,last_seen_at)
        VALUES($1,$2,'Discord server',$3,$3) ON CONFLICT(discord_guild_id) DO UPDATE SET last_seen_at=EXCLUDED.last_seen_at RETURNING guild_id`,[randomUUID(),identity.guildId,now])).rows[0].guild_id;
      await c.query(`INSERT INTO arcade.guild_participations(player_id,guild_id,first_seen_at,last_seen_at,membership_verified_at) VALUES($1,$2,$3,$3,$3)
        ON CONFLICT(player_id,guild_id) DO UPDATE SET last_seen_at=EXCLUDED.last_seen_at,membership_verified_at=EXCLUDED.membership_verified_at`,[player,guild,now]);
      await c.query(`INSERT INTO arcade.application_sessions(session_id,token_digest,player_id,guild_id,authenticated_at,expires_at,idle_expires_at,membership_verified_at,origin_class,transport,csrf_digest)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'cookie',$10)`,[randomUUID(),digest(token),player,guild,authenticated,expires,new Date(Math.min(this.now()+IDLE_MS,expires.getTime())),now,origin.includes('.discordsays.com')?'activity':'browser',digest(csrfFor(token))]);
      const row = await this.row(c,token,origin); return {view:this.view(row!,token)};
    });
    if ('failure' in result) throw new SessionFailure(result.failure!);
    return {token,view:result.view};
  }
  async cancel(binding: string): Promise<void> { await this.db.query('DELETE FROM arcade.auth_challenges WHERE binding_digest=$1',[digest(binding)]); }
  async logout(token: string | null, binding: string | null) {
    await this.db.transaction(async c => {
      if (binding) await c.query('DELETE FROM arcade.auth_challenges WHERE binding_digest=$1',[digest(binding)]);
      if (token) await c.query('UPDATE arcade.application_sessions SET revoked_at=COALESCE(revoked_at,$2) WHERE token_digest=$1',[digest(token),new Date(this.now())]);
    });
  }
  async discrepancy(token: string) {
    await this.db.query(`INSERT INTO arcade.security_events(event_id,event_type,reason_code,actor_reference,occurred_at,expires_at)
      SELECT $1::uuid,'identity_discrepancy','sdk_display_mismatch',$2::varchar(64),$3::timestamptz,$4::timestamptz WHERE NOT EXISTS
      (SELECT 1 FROM arcade.security_events WHERE actor_reference=$2 AND event_type='identity_discrepancy')`,
      [randomUUID(),digest(token),new Date(this.now()),new Date(this.now()+86400000)]);
  }
  async purge() {
    await this.db.query('DELETE FROM arcade.auth_challenges WHERE expires_at<=$1',[new Date(this.now())]);
    await this.db.query("DELETE FROM arcade.security_events WHERE expires_at<=$1 AND event_type='identity_discrepancy'",[new Date(this.now())]);
    await this.db.query('DELETE FROM arcade.application_sessions s WHERE expires_at<=$1 AND NOT EXISTS (SELECT 1 FROM arcade.attempt_authorizations a WHERE a.session_id=s.session_id)',[new Date(this.now()-86400000)]);
  }
}
