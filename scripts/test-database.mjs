// Owns a new temporary loopback-only PostgreSQL cluster. Never accepts a database URL.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { once } from "node:events";
import { randomUUID, randomBytes } from "node:crypto";
import { Database } from "../build/server/database/pool.js";
import { databaseConfig } from "../build/server/database/config.js";
import {
  migrate,
  schemaStatus,
  readMigrations,
  foundationTables,
} from "../build/server/database/migrations.js";
const root = mkdtempSync(join(tmpdir(), "arcade-test-pg-"));
const marker = join(root, "ARCADE_DISPOSABLE_TEST_CLUSTER");
writeFileSync(marker, "owned by test-database.mjs");
let bin = process.env.ARCADE_TEST_PG_BIN;
if (!bin)
  try {
    bin = execFileSync("pg_config", ["--bindir"], { encoding: "utf8" }).trim();
  } catch {}
const useDocker = !bin || !existsSync(join(bin, "postgres"));
const container = "arcade-test-" + randomBytes(8).toString("hex");
const safeEnv = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => !key.startsWith("PG") && key !== "DATABASE_URL",
  ),
);
const execute = (file, args) =>
  execFileSync(file, args, { env: safeEnv, stdio: ["ignore", "pipe", "pipe"] });
// Official public image needs no Docker Hub credentials or credential-helper access.
const dockerConfig = join(root, "docker-client");
mkdirSync(dockerConfig);
writeFileSync(join(dockerConfig, "config.json"), '{"auths":{}}');
const docker = (args) => execute("docker", ["--config", dockerConfig, ...args]);
const pg = (name, args) =>
  useDocker
    ? docker([
        "exec",
        container,
        name,
        ...args.map((arg, i) =>
          args[i - 1] === "-p" ? "5432" : arg.replace(root, "/tmp"),
        ),
      ])
    : execute(join(bin, name), args);
let started = false,
  db,
  child;
let checks = 0;
let stage = "initialization";
const ok = (value) => {
  assert.ok(value);
  checks++;
};
const eq = (a, b) => {
  assert.deepEqual(a, b);
  checks++;
};
async function port() {
  const s = createServer();
  s.listen(0, "127.0.0.1");
  await once(s, "listening");
  const n = s.address().port;
  await new Promise((r) => s.close(r));
  return n;
}
const pgPort = await port();
const databaseName = "arcade_test_" + randomBytes(8).toString("hex");
const env = {
  PERSISTENCE_CONFIGURED: "true",
  DATABASE_URL: `postgresql://arcade_test@127.0.0.1:${pgPort}/${databaseName}`,
  DATABASE_TLS_MODE: "disable",
  DATABASE_POOL_MAX: "2",
  DATABASE_STATEMENT_TIMEOUT_MS: "2000",
  DATABASE_CONNECT_TIMEOUT_MS: "5000",
};
function verifyOwned() {
  const u = new URL(env.DATABASE_URL);
  assert.equal(u.hostname, "127.0.0.1");
  assert.match(u.pathname, /^\/arcade_test_[a-f0-9]{16}$/);
  assert.ok(existsSync(marker));
}
const migration = readMigrations();
const V = "00000000-0000-4000-8000-000000000001";
async function rejects(fn) {
  await assert.rejects(fn);
  checks++;
}
async function reset() {
  verifyOwned();
  await db.query("DROP SCHEMA IF EXISTS arcade CASCADE");
}
async function counts() {
  const out = {};
  for (const t of foundationTables)
    out[t] = (
      await db.query(`SELECT count(*)::integer AS n FROM arcade.${t}`)
    ).rows[0].n;
  return out;
}
async function identity() {
  const p = randomUUID(),
    g = randomUUID();
  await db.query(
    "INSERT INTO arcade.players VALUES($1,$2,'Test Player',NULL,now(),now(),now())",
    [
      p,
      String(
        100000000000000000n + BigInt("0x" + randomBytes(6).toString("hex")),
      ),
    ],
  );
  await db.query(
    "INSERT INTO arcade.guilds VALUES($1,$2,'Test Guild','disabled',now(),now())",
    [
      g,
      String(
        200000000000000000n + BigInt("0x" + randomBytes(6).toString("hex")),
      ),
    ],
  );
  await db.query(
    "INSERT INTO arcade.guild_participations VALUES($1,$2,now(),now(),now())",
    [p, g],
  );
  return { p, g };
}
async function authorize({ p, g }) {
  const a = randomUUID();
  await db.query(
    "INSERT INTO arcade.attempt_authorizations(attempt_id,player_id,guild_id,version_id,begin_key,issued_at,submit_deadline,retry_deadline) VALUES($1,$2,$3,$4,$5,now(),now()+interval '5 minutes',now()+interval '7 minutes')",
    [a, p, g, V, randomUUID()],
  );
  return a;
}
async function attempt(a, { p, g }, ticks = 60, interruptions = 0) {
  return db.query(
    "INSERT INTO arcade.game_attempts(attempt_id,player_id,guild_id,version_id,disposition,ticks,max_ticks,interruption_count,accepted_at,reason_code,evidence_digest,validator_revision) VALUES($1,$2,$3,$4,'accepted',$5,18000,$6,now(),'validated',$7,'test-only')",
    [a, p, g, V, ticks, interruptions, "a".repeat(64)],
  );
}
async function launch(overrides) {
  const release = JSON.parse(readFileSync("build/release.json", "utf8"));
  const n = await port();
  let logs = "";
  child = spawn(process.execPath, ["build/server/index.js"], {
    env: {
      PATH: process.env.PATH,
      NODE_ENV: "production",
      HOST: "127.0.0.1",
      PORT: String(n),
      DISCORD_CLIENT_ID: release.clientId,
      DISCORD_CLIENT_SECRET: "DUMMY_DATABASE_SMOKE_SECRET",
      DISCORD_REDIRECT_URI: "https://example.invalid",
      ALLOWED_ORIGINS: `https://arcade.cdawgbot.xyz,https://${release.clientId}.discordsays.com`,
      RELEASE_SHA: release.releaseSha,
      ...overrides,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (b) => (logs += b));
  child.stderr.on("data", (b) => (logs += b));
  const exit = once(child, "exit");
  const base = `http://127.0.0.1:${n}`;
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(base + "/api/health");
      return { base, exit, logs: () => logs };
    } catch {
      await new Promise((r) => setTimeout(r, 30));
    }
  }
  throw Error("test runtime did not start");
}
async function stop(run) {
  child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 13000);
  try {
    eq((await run.exit)[0], 0);
  } finally {
    clearTimeout(timer);
  }
  ok(!run.logs().includes(env.DATABASE_URL));
  ok(!/DUMMY_DATABASE_SMOKE_SECRET|postgresql:\/\//.test(run.logs()));
  child = undefined;
}
async function smoke(overrides, schema) {
  const run = await launch(overrides);
  try {
    for (const p of ["/api/health", "/api/ready", "/"])
      eq((await fetch(run.base + p)).status, 200);
    const r = await fetch(run.base + "/api/persistence/ready");
    eq(r.status, schema === "compatible" ? 200 : 503);
    const b = await r.json();
    eq(b.schema, schema);
    eq(Object.keys(b).sort(), ["releaseSha", "schema", "status", "version"]);
    ok(!JSON.stringify(b).includes(databaseName));
    const html = await (await fetch(run.base + "/")).text();
    ok(html.includes('<div id="root">'));
    for (const p of [
      "/api/session",
      "/api/balance/attempts",
      "/api/guild/balance/leaderboard",
    ])
      eq((await fetch(run.base + p)).status, ["/api/session","/api/balance/attempts"].includes(p) ? 403 : 404);
    const o='https://arcade.cdawgbot.xyz';
    const session=await fetch(run.base+'/api/auth/challenges',{method:'POST',headers:{Origin:o,'X-Arcade-Origin':o,'X-Arcade-Request':'1','Content-Type':'application/json'},body:'{}'});
    eq(session.status,503);
    const release=JSON.parse(readFileSync('build/release.json','utf8'));
    const activityOrigin=`https://${release.clientId}.discordsays.com`;
    const attempt=await fetch(run.base+'/api/balance/attempts',{method:'POST',headers:{Origin:activityOrigin,'X-Arcade-Origin':activityOrigin,'X-Arcade-Request':'1','X-Arcade-CSRF':'b'.repeat(43),Cookie:'__Host-arcade-session='+'a'.repeat(43),'Content-Type':'application/json'},body:JSON.stringify({beginKey:randomUUID(),rulesetId:'balance-replay-v1'})});
    eq(attempt.status,503);eq((await attempt.json()).error,'attempts_unavailable');
    for(const path of ['/api/me/balance/stats','/api/me/balance/attempts','/api/me/balance/attempts/00000000-0000-4000-8000-000000000099']) {
      const r=await fetch(run.base+path,{headers:{'X-Arcade-Origin':activityOrigin,'X-Arcade-Request':'1',Cookie:'__Host-arcade-session='+'a'.repeat(43)}});
      eq(r.status,503);eq((await r.json()).error,'official_results_unavailable');eq(r.headers.get('cache-control'),'no-store');
    }
  } finally {
    await stop(run);
  }
}
try {
  stage = "initdb";
  if (useDocker) {
    docker([
      "run",
      "--detach",
      "--rm",
      "--name",
      container,
      "--label",
      "arcade.disposable-test=true",
      "--tmpfs",
      "/var/lib/postgresql",
      "--publish",
      `127.0.0.1:${pgPort}:5432`,
      "--env",
      "POSTGRES_USER=arcade_test",
      "--env",
      "POSTGRES_HOST_AUTH_METHOD=trust",
      "postgres:18.6",
    ]);
    started = true;
    let ready = false;
    for (let i = 0; i < 120; i++) {
      try {
        pg("pg_isready", [
          "-h",
          "127.0.0.1",
          "-p",
          String(pgPort),
          "-U",
          "arcade_test",
        ]);
        ready = true;
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    assert.ok(ready, "disposable PostgreSQL did not start");
  } else {
    pg("initdb", [
      "-D",
      join(root, "data"),
      "-U",
      "arcade_test",
      "-A",
      "trust",
      "--no-locale",
      "-E",
      "UTF8",
    ]);
    stage = "start";
    pg("pg_ctl", [
      "-D",
      join(root, "data"),
      "-l",
      join(root, "postgres.log"),
      "-o",
      `-h 127.0.0.1 -p ${pgPort} -k ${root}`,
      "-w",
      "start",
    ]);
    started = true;
  }
  stage = "createdb";
  pg("createdb", [
    "-h",
    "127.0.0.1",
    "-p",
    String(pgPort),
    "-U",
    "arcade_test",
    databaseName,
  ]);
  verifyOwned();
  stage = "migrations";
  db = new Database(databaseConfig(env));
  eq(await schemaStatus(db), "empty");
  eq(await migrate(db), 1);
  eq(await migrate(db), 0);
  eq(await schemaStatus(db), "compatible");
  const seed = (
    await db.query(
      "SELECT simulation_digest,validator_revision,issuance_enabled,max_ticks,tick_rate FROM arcade.game_versions",
    )
  ).rows[0];
  eq(seed, {
    simulation_digest: null,
    validator_revision: "unimplemented",
    issuance_enabled: false,
    max_ticks: 18000,
    tick_rate: 60,
  });
  await rejects(() =>
    db.query("UPDATE arcade.game_versions SET issuance_enabled=true"),
  );
  await rejects(() =>
    db.query("UPDATE arcade.game_versions SET simulation_digest=$1", [
      "b".repeat(64),
    ]),
  );
  const changed = migration.map((m) => ({ ...m, checksum: "f".repeat(64) }));
  await rejects(() => migrate(db, changed));
  eq(await schemaStatus(db, changed), "checksum_mismatch");
  await db.query(
    "INSERT INTO arcade.schema_migrations VALUES(2,'002_future.sql',$1,now())",
    ["b".repeat(64)],
  );
  eq(await schemaStatus(db), "too_new");
  await db.query("DELETE FROM arcade.schema_migrations WHERE version=$1", [2]);
  await db.query("DELETE FROM arcade.schema_migrations");
  eq(await schemaStatus(db), "too_old");
  await reset();
  const failed = [
    {
      ...migration[0],
      sql: migration[0].sql + "; SELECT nonexistent_failure_function();",
    },
  ];
  await rejects(() => migrate(db, failed));
  eq(await schemaStatus(db), "empty");
  const interrupted = [
    { ...migration[0], sql: migration[0].sql + "; SELECT pg_sleep(3);" },
  ];
  await rejects(() => migrate(db, interrupted));
  eq(await schemaStatus(db), "empty");
  eq((await Promise.all([migrate(db), migrate(db)])).sort(), [0, 1]);
  const pooled = await Promise.all(
    Array.from({ length: 6 }, () =>
      db.query("SELECT pg_backend_pid() AS pid, pg_sleep(0.05)"),
    ),
  );
  ok(new Set(pooled.map((r) => r.rows[0].pid)).size <= 2);
  const closing = new Database(databaseConfig(env));
  const inflight = closing.query("SELECT pg_sleep(0.1)");
  await new Promise((r) => setTimeout(r, 20));
  await closing.close();
  await inflight;
  await rejects(() => closing.query("SELECT 1"));
  await closing.close();
  await db.query("ALTER TABLE arcade.security_events RENAME TO missing_events");
  eq(await schemaStatus(db), "incomplete");
  await db.query("ALTER TABLE arcade.missing_events RENAME TO security_events");
  stage = "constraints";
  const A = await identity(),
    B = await identity();
  const a = await authorize(A);
  await rejects(() => authorize(A));
  await rejects(() => attempt(a, B));
  await rejects(() => attempt(a, A, 0));
  await rejects(() => attempt(a, A, 18001));
  await rejects(() => attempt(a, A, 60, 1));
  await attempt(a, A);
  await rejects(() => attempt(a, A));
  await rejects(() =>
    db.query("UPDATE arcade.game_attempts SET ticks=61 WHERE attempt_id=$1", [
      a,
    ]),
  );
  const stats = (p, best = a) =>
    db.query(
      "INSERT INTO arcade.personal_game_stats VALUES($1,$2,1,60,$3,60,'accepted',now(),now())",
      [p, V, best],
    );
  await rejects(() => stats(B.p));
  await stats(A.p);
  const board = (p, g) =>
    db.query(
      "INSERT INTO arcade.guild_leaderboard_entries VALUES($1,$2,$3,$4,60,'accepted',now())",
      [g, V, p, a],
    );
  await rejects(() => board(B.p, A.g));
  await rejects(() => board(A.p, B.g));
  await board(A.p, A.g);
  await rejects(() =>
    db.query(
      "INSERT INTO arcade.guild_game_records VALUES($1,$2,$3,NULL,'accepted',1)",
      [A.g, V, a],
    ),
  );
  await db.query(
    "INSERT INTO arcade.guild_game_records VALUES($1,$2,$3,60,'accepted',1)",
    [A.g, V, a],
  );
  const event = () =>
    db.query(
      "INSERT INTO arcade.guild_record_events(event_id,guild_id,version_id,sequence,record_attempt_id,new_ticks) VALUES($1,$2,$3,1,$4,60)",
      [randomUUID(), A.g, V, a],
    );
  await event();
  await rejects(event);
  await rejects(() =>
    db.query("DELETE FROM arcade.players WHERE player_id=$1", [A.p]),
  );
  await rejects(() => db.query("SELECT pg_sleep($1)", [3]));
  eq((await db.query("SELECT 1 AS n")).rows[0].n, 1);
  await rejects(() =>
    db.transaction(async (c) => {
      await c.query(
        "INSERT INTO arcade.security_events VALUES($1,'test','rollback',NULL,now(),now()+interval '1 day')",
        [randomUUID()],
      );
      throw Error("sensitive sentinel");
    }),
  );
  eq(
    (await db.query("SELECT count(*)::integer n FROM arcade.security_events"))
      .rows[0].n,
    0,
  );
  // Logical backup and restore use only this owned disposable cluster.
  stage = "backup";
  pg("pg_dump", [
    "-h",
    "127.0.0.1",
    "-p",
    String(pgPort),
    "-U",
    "arcade_test",
    "-Fc",
    "-f",
    join(root, "backup.dump"),
    databaseName,
  ]);
  const restored = databaseName + "_restore";
  pg("createdb", [
    "-h",
    "127.0.0.1",
    "-p",
    String(pgPort),
    "-U",
    "arcade_test",
    restored,
  ]);
  pg("pg_restore", [
    "-h",
    "127.0.0.1",
    "-p",
    String(pgPort),
    "-U",
    "arcade_test",
    "-d",
    restored,
    join(root, "backup.dump"),
  ]);
  const restoreDb = new Database(
    databaseConfig({ ...env, DATABASE_URL: env.DATABASE_URL + "_restore" }),
  );
  eq(await schemaStatus(restoreDb), "compatible");
  eq(
    (
      await restoreDb.query(
        "SELECT count(*)::integer n FROM arcade.game_attempts",
      )
    ).rows[0].n,
    1,
  );
  await restoreDb.close();
  stage = "compiled matrix";
  await reset();
  await migrate(db);
  const before = await counts();
  await smoke({}, "absent");
  await smoke({ ...env, PERSISTENCE_CONFIGURED: "false", ARCADE_SESSIONS_ENABLED:"false", DISCORD_ARCADE_BOT_TOKEN:"DUMMY_SESSION_BOT" }, "disabled");
  await smoke(env, "compatible");
  eq(await counts(), before);
  const cli = execFileSync(
    process.execPath,
    ["build/server/database/cli.js", "status"],
    { env: { PATH: process.env.PATH, ...env }, encoding: "utf8" },
  );
  ok(!cli.includes(env.DATABASE_URL));
  ok(cli.includes("compatible"));
  try {
    execFileSync(
      process.execPath,
      ["build/server/database/cli.js", "migrate"],
      {
        env: {
          PATH: process.env.PATH,
          ...env,
          DATABASE_URL:
            "postgresql://private:SECRET_SENTINEL@invalid.example/production",
        },
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    assert.fail("invalid CLI unexpectedly succeeded");
  } catch (e) {
    eq(e.status, 1);
    eq(
      e.stderr.trim(),
      '{"status":"failed","error":"database_command_failed"}',
    );
    ok(!String(e.stdout).includes("SECRET_SENTINEL"));
  }
  await smoke(
    {
      ...env,
      ARCADE_SESSIONS_ENABLED:"true",OFFICIAL_SCORING_ENABLED:"false",DISCORD_ARCADE_BOT_TOKEN:"DUMMY_SESSION_BOT",
      DATABASE_URL: `postgresql://arcade_test@127.0.0.1:${await port()}/${databaseName}`,
    },
    "unreachable",
  );
  await db.query(
    "INSERT INTO arcade.schema_migrations VALUES(2,'002_future.sql',$1,now())",
    ["b".repeat(64)],
  );
  await smoke({...env,ARCADE_SESSIONS_ENABLED:"true",OFFICIAL_SCORING_ENABLED:"false",DISCORD_ARCADE_BOT_TOKEN:"DUMMY_SESSION_BOT"}, "too_new");
  await db.query("DELETE FROM arcade.schema_migrations WHERE version=$1", [2]);
  stage = "session integration";
  const {testSessions} = await import('./test-sessions.mjs');
  const {restrictedSessionRole} = await import('../build/server/sessions/privileges.js');
  eq(await restrictedSessionRole(db), false);
  const roleOutput=execFileSync(process.execPath,['scripts/provision-session-role.mjs'],{
    env:{PATH:process.env.PATH,...env,ARCADE_RUNTIME_PASSWORD:'synthetic_disposable_password_1234567890'},encoding:'utf8'});
  ok(!roleOutput.includes('synthetic_disposable_password'));
  const restrictedUrl=new URL(env.DATABASE_URL);restrictedUrl.username='arcade_session_runtime';restrictedUrl.password='synthetic_disposable_password_1234567890';
  const restrictedDb=new Database(databaseConfig({...env,DATABASE_URL:restrictedUrl.toString()}));
  try {
    eq(await restrictedSessionRole(restrictedDb),true);
    await rejects(()=>restrictedDb.query("UPDATE arcade.game_versions SET issuance_enabled=false"));
    await rejects(()=>restrictedDb.query("DELETE FROM arcade.game_attempts"));
    await rejects(()=>restrictedDb.query("CREATE TABLE arcade.forbidden_test(id int)"));
    await testSessions(restrictedDb);
    const enabled=await launch({...env,DATABASE_URL:restrictedUrl.toString(),ARCADE_SESSIONS_ENABLED:'true',OFFICIAL_SCORING_ENABLED:'false',DISCORD_ARCADE_BOT_TOKEN:'synthetic-bot'});
    try {
      const o='https://arcade.cdawgbot.xyz';
      const response=await fetch(enabled.base+'/api/auth/challenges',{method:'POST',headers:{Origin:o,'X-Arcade-Origin':o,'X-Arcade-Request':'1','Content-Type':'application/json'},body:'{}'});
      eq(response.status,200);ok(response.headers.get('set-cookie').includes('SameSite=None; Partitioned'));
      eq((await fetch(enabled.base+'/')).status,200);
    } finally {await stop(enabled);}
    stage = 'attempt integration';
    const {testAttempts} = await import('./test-attempts.mjs');
    await testAttempts(db,restrictedDb);
    stage='personal verification CLI';
    const verifyEnv={PATH:process.env.PATH,...env,DATABASE_URL:restrictedUrl.toString()};
    const verifyCli=()=>execFileSync(process.execPath,['build/server/database/cli.js','verify-personal'],{env:verifyEnv,encoding:'utf8',stdio:['ignore','pipe','pipe']});
    const summary=JSON.parse(verifyCli().trim().split('\n').at(-1));
    eq(summary.status,'consistent');eq(summary.mismatches,'0');eq(Object.keys(summary).sort(),['expectedGroups','mismatches','status','storedGroups']);
    const target=(await db.query('SELECT player_id,version_id,official_count::text FROM arcade.personal_game_stats LIMIT 1')).rows[0];
    await db.query('UPDATE arcade.personal_game_stats SET official_count=official_count+1 WHERE player_id=$1 AND version_id=$2',[target.player_id,target.version_id]);
    try{verifyCli();assert.fail('mismatch CLI unexpectedly succeeded');}catch(e){
      eq(e.status,2);const mismatch=JSON.parse(String(e.stdout).trim().split('\n').at(-1));eq(mismatch.status,'mismatch');eq(mismatch.mismatches,'1');
      ok(!String(e.stdout).includes(target.player_id));ok(!String(e.stdout).includes(verifyEnv.DATABASE_URL));
    }
    // The verifier must not repair. Only this disposable fixture restores its deliberate fault.
    eq((await db.query('SELECT official_count::text n FROM arcade.personal_game_stats WHERE player_id=$1 AND version_id=$2',[target.player_id,target.version_id])).rows[0].n,String(BigInt(target.official_count)+1n));
    await db.query('UPDATE arcade.personal_game_stats SET official_count=official_count-1 WHERE player_id=$1 AND version_id=$2',[target.player_id,target.version_id]);
    eq(await restrictedSessionRole(restrictedDb),true);
  } finally {await restrictedDb.close();}
  await smoke({...env,ARCADE_SESSIONS_ENABLED:'true',ARCADE_ATTEMPTS_ENABLED:'true',OFFICIAL_SCORING_ENABLED:'false',DISCORD_ARCADE_BOT_TOKEN:'synthetic-bot'}, 'compatible');
  stage = "database outage";
  const outage = await launch(env);
  try {
    eq((await fetch(outage.base + "/api/persistence/ready")).status, 200);
    if (useDocker) docker(["stop", "--time", "1", container]);
    else pg("pg_ctl", ["-D", join(root, "data"), "-m", "fast", "-w", "stop"]);
    started = false;
    await new Promise((r) => setTimeout(r, 10100));
    eq((await fetch(outage.base + "/api/persistence/ready")).status, 503);
    for (const path of ["/", "/api/health", "/api/ready"])
      eq((await fetch(outage.base + path)).status, 200);
  } finally {
    await stop(outage);
  }
  await db.close();
  await rejects(() => db.query("SELECT 1"));
  db = undefined;
  console.log(
    `Real ephemeral PostgreSQL integration and compiled fallback matrix passed: ${checks} checks; backup/restore passed; no production database used.`,
  );
} catch (error) {
  console.error(
    "Disposable database suite failed:",
    {
      stage,
      checks,
      type: error?.name,
      code: error?.code,
      status: error?.status,
    },
    error instanceof assert.AssertionError || error?.name === "DatabaseError"
      ? error.message
      : "sanitized database test failure",
  );
  process.exitCode = 1;
} finally {
  if (child && child.exitCode === null) child.kill("SIGKILL");
  await db?.close().catch(() => {});
  if (started)
    try {
      if (useDocker) docker(["rm", "--force", container]);
      else
        pg("pg_ctl", [
          "-D",
          join(root, "data"),
          "-m",
          "immediate",
          "-w",
          "stop",
        ]);
    } catch {}
  rmSync(root, { recursive: true, force: true });
}
