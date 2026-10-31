import type {SqlConnection} from '../../database/pool.js';
import {displayName} from '../../guild/store.js';
import {DeliveryError} from '../discord-delivery.js';
import {CARD_GUILD,authoredScoreSql} from './ranking.js';
import type {LeaderboardCard} from './leaderboard-card.js';
/** Fail closed for any completed participant whose score cannot be scoped unambiguously to this community.
 * Authored attempts predate guild attribution; do not guess an origin from a shared player identity. */
export async function authoredCardFacts(c:SqlConnection,puzzleId:string,day:string):Promise<LeaderboardCard>{
 const r=(await c.query(`WITH approved AS(SELECT guild_id FROM arcade.guilds WHERE discord_guild_id=$2 AND status='enabled'),
 scored AS(SELECT a.player_id,p.display_name,a.elapsed_ms,a.completed_at,${authoredScoreSql} AS score,
 EXISTS(SELECT 1 FROM arcade.guild_participations gp WHERE gp.player_id=a.player_id AND gp.guild_id IN(SELECT guild_id FROM approved))
 AND NOT EXISTS(SELECT 1 FROM arcade.guild_participations gp WHERE gp.player_id=a.player_id AND gp.guild_id NOT IN(SELECT guild_id FROM approved)) AS scoped
 FROM arcade.chainshift_authored_attempts a JOIN arcade.players p USING(player_id) WHERE puzzle_id=$1 AND kind='daily' AND completed_at IS NOT NULL),
 ranked AS(SELECT *,rank() OVER(ORDER BY score DESC,elapsed_ms) AS place,row_number() OVER(ORDER BY score DESC,elapsed_ms,player_id) AS position FROM scored)
 SELECT (SELECT count(*) FROM approved)::int AS approved,(SELECT count(*) FROM arcade.guilds WHERE status='enabled')::int AS enabled,
 count(*)::int AS total,COALESCE(bool_and(scoped),true) AS scoped,max(completed_at) AS latest,
 COALESCE(jsonb_agg(jsonb_build_object('rank',place,'name',display_name,'score',score,'elapsedMs',elapsed_ms) ORDER BY position) FILTER(WHERE position<=5),'[]'::jsonb) AS rows FROM ranked`,[puzzleId,CARD_GUILD])).rows[0];
 if(!r||r.approved!==1||r.enabled!==1||r.scoped!==true)throw new DeliveryError('invalid_configuration');
 return {day,total:r.total,latestFinishAt:r.latest?new Date(r.latest).toISOString():null,rows:r.rows.map((v:any)=>({rank:Number(v.rank),name:displayName(v.name),score:Number(v.score),elapsedMs:Number(v.elapsedMs)}))};
}
