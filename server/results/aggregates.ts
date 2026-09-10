import type {SqlConnection} from '../database/pool.js';
// All aggregation keys are server-derived. Integer totals stay bigint in Postgres.
export async function addAccepted(c:SqlConnection,attemptId:string):Promise<void> {
  await c.query(`INSERT INTO arcade.personal_game_stats(player_id,version_id,official_count,total_ticks,best_attempt_id,best_ticks,first_accepted_at,last_accepted_at)
    SELECT player_id,version_id,1,ticks,attempt_id,ticks,accepted_at,accepted_at FROM arcade.game_attempts WHERE attempt_id=$1 AND disposition='accepted'
    ON CONFLICT(player_id,version_id) DO UPDATE SET
      official_count=arcade.personal_game_stats.official_count+1,
      total_ticks=arcade.personal_game_stats.total_ticks+EXCLUDED.total_ticks,
      best_attempt_id=CASE WHEN EXCLUDED.best_ticks>arcade.personal_game_stats.best_ticks THEN EXCLUDED.best_attempt_id ELSE arcade.personal_game_stats.best_attempt_id END,
      best_ticks=GREATEST(arcade.personal_game_stats.best_ticks,EXCLUDED.best_ticks),
      first_accepted_at=LEAST(arcade.personal_game_stats.first_accepted_at,EXCLUDED.first_accepted_at),
      last_accepted_at=GREATEST(arcade.personal_game_stats.last_accepted_at,EXCLUDED.last_accepted_at)`,[attemptId]);
}
// The same pure reconstruction is used by owner reads and the explicit read-only CLI.
// A single SQL snapshot avoids false mismatches while another transaction commits.
export const reconstructed = `WITH facts AS (
  SELECT * FROM arcade.game_attempts WHERE disposition='accepted'
    AND ($1::uuid IS NULL OR player_id=$1) AND ($2::uuid IS NULL OR version_id=$2)
), totals AS (
  SELECT player_id,version_id,count(*)::bigint official_count,sum(ticks)::bigint total_ticks,
    min(accepted_at) first_accepted_at,max(accepted_at) last_accepted_at FROM facts GROUP BY player_id,version_id
), best AS (
  SELECT DISTINCT ON(player_id,version_id) player_id,version_id,attempt_id best_attempt_id,ticks best_ticks
  FROM facts ORDER BY player_id,version_id,ticks DESC,accepted_at,attempt_id
), expected AS (SELECT * FROM totals JOIN best USING(player_id,version_id)), stored AS (
 SELECT * FROM arcade.personal_game_stats WHERE ($1::uuid IS NULL OR player_id=$1) AND ($2::uuid IS NULL OR version_id=$2)
), differences AS (
 SELECT COALESCE(e.player_id,s.player_id) player_id,COALESCE(e.version_id,s.version_id) version_id
 FROM expected e FULL JOIN stored s USING(player_id,version_id)
 WHERE (e.official_count,e.total_ticks,e.best_attempt_id,e.best_ticks,e.first_accepted_at,e.last_accepted_at)
 IS DISTINCT FROM (s.official_count,s.total_ticks,s.best_attempt_id,s.best_ticks,s.first_accepted_at,s.last_accepted_at)
)`;
export async function verifyPersonal(c:SqlConnection,playerId:string|null=null,versionId:string|null=null) {
  const row=(await c.query(reconstructed+` SELECT (SELECT count(*)::text FROM expected) AS expected_groups,
    (SELECT count(*)::text FROM stored) AS stored_groups,(SELECT count(*)::text FROM differences) AS mismatches`,[playerId,versionId])).rows[0];
  return {status:row.mismatches==='0'?'consistent' as const:'mismatch' as const,expectedGroups:row.expected_groups as string,storedGroups:row.stored_groups as string,mismatches:row.mismatches as string};
}
