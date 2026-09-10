import {randomUUID} from 'node:crypto';
import type {SqlConnection} from '../database/pool.js';

// Lock order: session -> player -> authorization -> personal -> entry -> record.
// Missing personal/entry rows are protected by the already-held player lock.
export async function lockGuild(c:SqlConnection,player:string,guild:string,version:string) {
  await c.query('SELECT player_id FROM arcade.personal_game_stats WHERE player_id=$1 AND version_id=$2 FOR UPDATE',[player,version]);
  await c.query('SELECT player_id FROM arcade.guild_leaderboard_entries WHERE guild_id=$1 AND version_id=$2 AND player_id=$3 FOR UPDATE',[guild,version,player]);
  await c.query('INSERT INTO arcade.guild_game_records(guild_id,version_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[guild,version]);
  await c.query('SELECT guild_id FROM arcade.guild_game_records WHERE guild_id=$1 AND version_id=$2 FOR UPDATE',[guild,version]);
}
// Caller holds the record row until COMMIT, including timestamp assignment and fact insertion.
export async function addGuildAccepted(c:SqlConnection,attemptId:string) {
  const a=(await c.query("SELECT *,accepted_at::text AS accepted_at FROM arcade.game_attempts WHERE attempt_id=$1 AND disposition='accepted'",[attemptId])).rows[0];
  if(!a)throw Error('accepted_fact_required');
  await c.query(`INSERT INTO arcade.guild_leaderboard_entries(guild_id,version_id,player_id,best_attempt_id,best_ticks,best_accepted_at)
    VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(guild_id,version_id,player_id) DO UPDATE SET
    best_attempt_id=EXCLUDED.best_attempt_id,best_ticks=EXCLUDED.best_ticks,best_accepted_at=EXCLUDED.best_accepted_at
    WHERE EXCLUDED.best_ticks>arcade.guild_leaderboard_entries.best_ticks`,[a.guild_id,a.version_id,a.player_id,attemptId,a.ticks,a.accepted_at]);
  const r=(await c.query('SELECT * FROM arcade.guild_game_records WHERE guild_id=$1 AND version_id=$2 FOR UPDATE',[a.guild_id,a.version_id])).rows[0];
  if(!r)throw Error('record_lock_required');
  if(r.record_ticks!==null&&a.ticks<=r.record_ticks)return;
  const sequence=(BigInt(r.sequence)+1n).toString();
  await c.query('UPDATE arcade.guild_game_records SET record_attempt_id=$3,record_ticks=$4,sequence=$5 WHERE guild_id=$1 AND version_id=$2',[a.guild_id,a.version_id,attemptId,a.ticks,sequence]);
  // No channel, content, delivery state, message ID or notification worker.
  await c.query(`INSERT INTO arcade.guild_record_events(event_id,guild_id,version_id,sequence,record_attempt_id,new_ticks,previous_attempt_id,previous_ticks,occurred_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[randomUUID(),a.guild_id,a.version_id,sequence,attemptId,a.ticks,r.record_attempt_id,r.record_ticks,a.accepted_at]);
}
// Metadata derives from durable immutable facts/events, never mutable current best/rank.
export async function resultMetadata(c:SqlConnection,attemptId:string) {
  const r=(await c.query(`SELECT
    NOT EXISTS(SELECT 1 FROM arcade.game_attempts p WHERE p.player_id=a.player_id AND p.version_id=a.version_id AND p.disposition='accepted'
      AND (p.accepted_at,p.attempt_id)<(a.accepted_at,a.attempt_id) AND p.ticks>=a.ticks) AS personal_best,
    NOT EXISTS(SELECT 1 FROM arcade.game_attempts p WHERE p.player_id=a.player_id AND p.guild_id=a.guild_id AND p.version_id=a.version_id AND p.disposition='accepted'
      AND (p.accepted_at,p.attempt_id)<(a.accepted_at,a.attempt_id) AND p.ticks>=a.ticks) AS guild_best,
    e.sequence::text FROM arcade.game_attempts a LEFT JOIN arcade.guild_record_events e ON e.record_attempt_id=a.attempt_id
    WHERE a.attempt_id=$1 AND a.disposition='accepted'`,[attemptId])).rows[0];
  return r?{personalBest:r.personal_best as boolean,guildBest:r.guild_best as boolean,newGuildRecord:r.sequence!==null,recordSequence:r.sequence as string|null}:{};
}
// Exclusions support administrative preview only. Competitive history is never rewritten here.
export const guildExpected=`WITH facts AS (
 SELECT * FROM arcade.game_attempts WHERE disposition='accepted'
 AND ($1::uuid IS NULL OR guild_id=$1) AND ($2::uuid IS NULL OR version_id=$2)
 AND NOT(player_id=ANY($3::uuid[]))
), best AS (
 SELECT DISTINCT ON(guild_id,version_id,player_id) guild_id,version_id,player_id,attempt_id,best_ticks,accepted_at FROM
 (SELECT *,ticks AS best_ticks FROM facts) f ORDER BY guild_id,version_id,player_id,ticks DESC,accepted_at,attempt_id
), running AS (
 SELECT *,max(ticks) OVER(PARTITION BY guild_id,version_id ORDER BY accepted_at,player_id,attempt_id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) prior_max FROM facts
), transitions AS (
 SELECT * FROM running WHERE ticks>COALESCE(prior_max,0)
), events AS (
 SELECT *,row_number() OVER w AS sequence,lag(attempt_id) OVER w AS previous_attempt_id,lag(ticks) OVER w AS previous_ticks
 FROM transitions WINDOW w AS (PARTITION BY guild_id,version_id ORDER BY accepted_at,player_id,attempt_id)
), records AS (
 SELECT DISTINCT ON(guild_id,version_id) * FROM events ORDER BY guild_id,version_id,sequence DESC
)`;
export async function verifyGuild(c:SqlConnection,guild:string|null=null,version:string|null=null) {
  const r=(await c.query(guildExpected+`, board_diff AS (
 SELECT 1 FROM best e FULL JOIN (SELECT * FROM arcade.guild_leaderboard_entries WHERE ($1::uuid IS NULL OR guild_id=$1) AND ($2::uuid IS NULL OR version_id=$2)) s USING(guild_id,version_id,player_id)
 WHERE (e.attempt_id,e.best_ticks,e.accepted_at) IS DISTINCT FROM(s.best_attempt_id,s.best_ticks,s.best_accepted_at)
), record_diff AS (
 SELECT 1 FROM records e FULL JOIN (SELECT * FROM arcade.guild_game_records WHERE sequence>0 AND ($1::uuid IS NULL OR guild_id=$1) AND ($2::uuid IS NULL OR version_id=$2)) s USING(guild_id,version_id)
 WHERE (e.attempt_id,e.ticks,e.sequence) IS DISTINCT FROM(s.record_attempt_id,s.record_ticks,s.sequence)
), event_diff AS (
 SELECT 1 FROM events e FULL JOIN (SELECT * FROM arcade.guild_record_events WHERE ($1::uuid IS NULL OR guild_id=$1) AND ($2::uuid IS NULL OR version_id=$2)) s USING(guild_id,version_id,sequence)
 WHERE (e.attempt_id,e.ticks,e.previous_attempt_id,e.previous_ticks,e.accepted_at)
 IS DISTINCT FROM(s.record_attempt_id,s.new_ticks,s.previous_attempt_id,s.previous_ticks,s.occurred_at)
) SELECT (SELECT count(*)::text FROM best) entries,(SELECT count(*)::text FROM records) records,
 (SELECT count(*)::text FROM events) events,(SELECT count(*)::text FROM board_diff) board_mismatches,
 (SELECT count(*)::text FROM record_diff) record_mismatches,(SELECT count(*)::text FROM event_diff) event_mismatches`,[guild,version,[]])).rows[0];
  return {status:[r.board_mismatches,r.record_mismatches,r.event_mismatches].every(n=>n==='0')?'consistent':'mismatch',entries:r.entries,records:r.records,events:r.events,boardMismatches:r.board_mismatches,recordMismatches:r.record_mismatches,eventMismatches:r.event_mismatches};
}
export async function previewExclusion(c:SqlConnection,guild:string,version:string,excludedPlayers:string[]) {
  // Explicit internal administrative/test preview; returns no names/IDs and performs no mutation.
  const r=(await c.query(guildExpected+` SELECT (SELECT count(*)::text FROM best) entries,
    (SELECT max(ticks) FROM records) AS record_ticks`,[guild,version,excludedPlayers])).rows[0];
  return {mode:'administrative_preview',entries:r.entries,recordTicks:r.record_ticks,competitiveEventsCreated:0};
}
