import { describe, it, expect } from "vitest";
import { databaseConfig } from "./config";
import { createPersistence } from "./readiness";
import { safeDatabaseError } from "./pool";
const local = {
  PERSISTENCE_CONFIGURED: "true",
  DATABASE_URL: "postgresql://arcade_test:fake@127.0.0.1/arcade_test_unit",
  DATABASE_TLS_MODE: "disable",
};
describe("persistence configuration", () => {
  it("never enables persistence from URL alone", () =>
    expect(databaseConfig({ DATABASE_URL: local.DATABASE_URL }).mode).toBe(
      "disabled",
    ));
  it("supports absent and explicitly disabled modes without a pool", () => {
    expect(databaseConfig({})).toEqual({
      mode: "absent",
      pool: undefined,
      officialScoringEnabled: false,
    });
    expect(
      databaseConfig({
        DATABASE_URL: "not-a-url",
        PERSISTENCE_CONFIGURED: "false",
      }).pool,
    ).toBeUndefined();
  });
  it("uses a bounded lazy local test pool with explicit opt in", () => {
    const c = databaseConfig(local);
    expect(c.mode).toBe("configured");
    expect(c.pool?.max).toBe(5);
    expect(c.officialScoringEnabled).toBe(false);
  });
  it.each([
    "postgresql://u:p@remote/production",
    "postgresql://u:p@127.0.0.1/production",
    "postgresql://u:p@127.0.0.1/arcade_test_unit?sslmode=disable",
    "https://u:p@127.0.0.1/arcade_test_unit",
  ])("rejects unsafe plaintext or URL options", (url) =>
    expect(databaseConfig({ ...local, DATABASE_URL: url }).mode).toBe(
      "invalid_configuration",
    ),
  );
  it("requires verified TLS for remote production", () =>
    expect(
      databaseConfig({
        ...local,
        DATABASE_URL: "postgresql://u:fake@db.example/arcade",
        DATABASE_TLS_MODE: "verify-full",
      }).pool?.ssl,
    ).toEqual({ rejectUnauthorized: true }));
  it("allows explicit Render private transport only on Render with an internal hostname", () => {
    const env = {
      ...local,
      DATABASE_URL: "postgresql://u:fake@dpg-testfixture-a/arcade",
      DATABASE_TLS_MODE: "render-internal",
      RENDER: "true",
    };
    expect(databaseConfig(env).pool?.ssl).toBe(false);
    expect(databaseConfig({ ...env, RENDER: undefined }).mode).toBe(
      "invalid_configuration",
    );
    expect(
      databaseConfig({
        ...env,
        DATABASE_URL: "postgresql://u:fake@public.example/arcade",
      }).mode,
    ).toBe("invalid_configuration");
  });
  it.each(["0", "11", "NaN", "1.5"])("rejects invalid pool bounds", (max) =>
    expect(databaseConfig({ ...local, DATABASE_POOL_MAX: max }).mode).toBe(
      "invalid_configuration",
    ),
  );
  it("allows persistence with scoring controlled independently", () => {
    const c = databaseConfig({ ...local, OFFICIAL_SCORING_ENABLED: "true" });
    expect(c.mode).toBe("configured");
    expect(c.officialScoringEnabled).toBe(false);
  });
  it("sanitizes driver errors without retaining their cause", () => {
    const e = safeDatabaseError({
      code: "23503",
      message: "postgresql://private:secret@host/db",
      detail: "SQL private",
    });
    expect(e.message).toBe("Database operation constraint");
    expect(JSON.stringify(e)).not.toContain("secret");
  });
});
describe("persistence readiness", () => {
  it("does not call a probe while absent or disabled", async () => {
    let calls = 0;
    for (const env of [{}, { DATABASE_URL: local.DATABASE_URL }]) {
      const p = createPersistence(databaseConfig(env), {
        probe: async () => {
          calls++;
          return "compatible";
        },
      });
      expect((await p.check()).status).toBe("unavailable");
      await p.close();
    }
    expect(calls).toBe(0);
  });
  it("coalesces parallel calls and caches failures as well as successes", async () => {
    let calls = 0,
      now = 0;
    const p = createPersistence(databaseConfig(local), {
      now: () => now,
      ttlMs: 100,
      probe: async () => {
        calls++;
        if (calls === 1) throw Error("secret");
        return "compatible";
      },
    });
    const results = await Promise.all(
      Array.from({ length: 100 }, () => p.check()),
    );
    expect(calls).toBe(1);
    expect(results.every((r) => r.schema === "unreachable")).toBe(true);
    await p.check();
    expect(calls).toBe(1);
    now = 101;
    expect((await p.check()).schema).toBe("compatible");
    expect(calls).toBe(2);
    await p.close();
    expect((await p.check()).schema).toBe("closed");
  });
  it.each([
    "empty",
    "too_old",
    "too_new",
    "checksum_mismatch",
    "incomplete",
  ] as const)("never marks incompatible schema available", async (schema) => {
    const p = createPersistence(databaseConfig(local), {
      probe: async () => schema,
    });
    expect(await p.check()).toEqual({ status: "unavailable", schema });
    await p.close();
  });
});
