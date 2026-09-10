import {grantResultRights} from '../guild/grants.js';
import {verifyGuild} from '../guild/projections.js';
import {verifyPersonal} from '../results/aggregates.js';
import { databaseConfig } from "./config.js";
import { Database } from "./pool.js";
import { migrate, schemaStatus, foundationTables } from "./migrations.js";
// Explicit commands only; never loads dotenv or prints driver exceptions.
async function main() {
  const command = process.argv[2];
  if (!["migrate", "status", "verify-personal", "verify-guild", "grant-results"].includes(command)) throw new Error("command");
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
