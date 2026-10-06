import {grantChainshiftRights} from '../chainshift/privileges.js';
import {grantDeliveryRights,deliveryReady} from '../chainshift/delivery-store.js';
import {readFileSync} from 'node:fs';
import {publishLocalCandidate,validPublication} from '../chainshift/publication.js';
import {verifyManifest,type PuzzleManifest} from '../../shared/chainshift/manifest.js';
import {enrichedReferee} from '../../shared/chainshift/enrichment/graph-v2.js';
import {activateCanary} from '../attempts/activation.js';
import {grantResultRights} from '../guild/grants.js';
import {verifyGuild} from '../guild/projections.js';
import {verifyPersonal} from '../results/aggregates.js';
import { databaseConfig } from "./config.js";
import { Database } from "./pool.js";
import { migrate, schemaStatus, foundationTables } from "./migrations.js";
// Explicit commands only; never loads dotenv or prints driver exceptions.
async function main() {
  const command = process.argv[2];
  if (!["migrate", "status", "verify-personal", "verify-guild", "grant-results", "activate-canary", "grant-chainshift", "grant-chainshift-delivery", "verify-chainshift-delivery", "publish-chainshift-pilot"].includes(command)) throw new Error("command");
  const config = databaseConfig();
  if (config.mode !== "configured") throw new Error("configuration");
  const database = new Database(config);
  try {
    if (command === "migrate")
      console.log(
        JSON.stringify({
          status: "migrated",
          applied: await migrate(database),
        }),
      );
    const schema = await schemaStatus(database);
    console.log(
      JSON.stringify({
        status: schema === "compatible" ? "available" : "unavailable",
        schema,
      }),
    );
    if (schema !== "compatible") process.exitCode = 1;
    else if(command==='publish-chainshift-pilot'){
      if(['CHAINSHIFT_ARCADE_ENABLED','CHAINSHIFT_RANKED_ENABLED','CHAINSHIFT_DAILY_DELIVERY_ENABLED'].some(k=>process.env[k]==='true'))throw Error('disabled_flags_required');
      // Operator-reviewed manifest, never browser/message input. No generation, schedule or approval claim.
      const bytes=readFileSync(process.argv[3]);if(bytes.length>262144)throw Error('manifest');
      const manifest=JSON.parse(bytes.toString('utf8')) as PuzzleManifest;
      if(!verifyManifest(enrichedReferee,manifest))throw Error('manifest');
      await database.transaction(async c=>{
        const day=(await c.query("SELECT to_char(clock_timestamp() AT TIME ZONE 'America/New_York','YYYY-MM-DD') AS day")).rows[0].day;
        if(manifest.day!==day||process.env.CHAINSHIFT_DAILY_PILOT_DAY!==day)throw Error('pilot_day');
        const prior=(await c.query('SELECT *,day_key::text AS day_key,certificate=$2::jsonb AS same FROM arcade.chainshift_puzzles WHERE day_key=$1',[day,JSON.stringify(manifest)])).rows[0];
        if(prior){if(!validPublication(prior)||prior.same!==true)throw Error('conflict');}
        else await publishLocalCandidate(c,manifest);
      });
      console.log(JSON.stringify({status:'published',scope:'reviewed_chainshift_pilot',editorialApprovalChanged:false}));
    }
    else if(command==='verify-chainshift-delivery'){const ready=await deliveryReady(database);console.log(JSON.stringify({deliveryReady:ready}));if(!ready)process.exitCode=1;}
    else if(command==='grant-chainshift-delivery'){if(process.env.CHAINSHIFT_DAILY_DELIVERY_ENABLED==='true')throw Error('disabled_flags_required');await database.transaction(grantDeliveryRights);console.log(JSON.stringify({status:'granted',scope:'chainshift_delivery',credentialsChanged:false}));}
    else if(command==='activate-canary'){console.log(JSON.stringify(await database.transaction(c=>activateCanary(c))));}
    else if(command==='grant-chainshift'){if(process.env.CHAINSHIFT_RANKED_ENABLED==='true')throw Error('disabled_flags_required');await database.transaction(grantChainshiftRights);console.log(JSON.stringify({status:'granted',scope:'chainshift_runtime',credentialsChanged:false}));}
    else if(command==='grant-results') {
      if(['ARCADE_ATTEMPTS_ENABLED','OFFICIAL_SCORING_ENABLED','ARCADE_LEADERBOARDS_ENABLED'].some(k=>process.env[k]==='true'))throw Error('disabled_flags_required');
      await database.transaction(grantResultRights);console.log(JSON.stringify({status:'granted',scope:'result_runtime',credentialsChanged:false}));
    } else if (['verify-personal','verify-guild'].includes(command)) {
      const result=await (command==='verify-guild'?verifyGuild(database):verifyPersonal(database));
      console.log(JSON.stringify(result));
      if(result.status!=='consistent')process.exitCode=2;
    } else {
      // Names come exclusively from this static manifest; no identifier from input.
      for (const table of foundationTables) {
        const result = await database.query(
          `SELECT count(*)::text AS count FROM arcade.${table}`,
        );
        console.log(JSON.stringify({ table, rows: result.rows[0].count }));
      }
    }
  } finally {
    await database.close();
  }
}
main().catch(() => {
  console.error(
    JSON.stringify({ status: "failed", error: "database_command_failed" }),
  );
  process.exitCode = 1;
});
