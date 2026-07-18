/**
 * QuotingTrainingStatusAction.test.ts — U-QP-TRAINING-STATUS-ACTION (charlie 2026-06-02)
 *
 * Proves the front-to-back synergy READ end to end:
 *   1. QuotingActiveFactorLoaderEngine.readLatestTrainingStatus() — the engine method
 *      (happy + missing + malformed + non-object + stale + adversarial inputs).
 *   2. Schema/enum wiring — prism_quoting:training_status is in the enum AND has a schema.
 *   3. Dispatcher round-trip — registerQuotingDispatcher → captured handler → invoke the
 *      action through the SAME path production uses (mock server captures the tool handler),
 *      asserting the wrapped { ok, training_status, active_factor } payload.
 *
 * The status snapshot is produced by scripts/quoting-train-cycle.mjs
 * (buildTrainingStatusSnapshot → state/shared/quoting/latest-training-status.json).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  QuotingActiveFactorLoaderEngine,
  quotingActiveFactorLoaderEngine,
  DEFAULT_TRAINING_STATUS_PATH,
} from "../engines/QuotingActiveFactorLoaderEngine.js";
import { resolveRepoRoot } from "../utils/resolve-repo-root.js";
import { quotingActionEnum, QUOTING_ACTION_SCHEMAS } from "../schemas/quotingActionSchemas.js";
import { registerQuotingDispatcher } from "../tools/dispatchers/quotingDispatcher.js";

let TMP = "";
async function writeStatus(name: string, body: unknown): Promise<string> {
  const p = join(TMP, name);
  await fs.writeFile(p, typeof body === "string" ? body : JSON.stringify(body), "utf-8");
  return p;
}

/** A realistic snapshot (subset of the 16-key buildTrainingStatusSnapshot output). */
function snapshot(tsIso: string): Record<string, unknown> {
  return {
    schemaVersion: "1.0.0",
    ts_iso: tsIso,
    ok: true,
    reason: null,
    baseline_source: "state/shared/quoting/baseline-records-corpus-with-real.json",
    baseline_fallback: { configured: "state/shared/quoting/baseline-records.json", used: "state/shared/quoting/baseline-records-corpus-with-real.json", configured_refused: true, configured_reasons: ["machine_name_customers"] },
    total_predicted: 47905,
    mape_pct: 71.0996,
    safe_to_activate: true,
    active_factor_written: false,
    active_factor_path: null,
    skip_reason: "writeIfSafe=false (dry-run mode)",
    psi_delta_fed_count: 0,
    baseline_warnings: ["synthetic_revenue_dominant=..."],
    data_source_coverage: { consumed_count: 2, available_count: 5, coverage_pct: 40, unconsumed_available: ["vendor_cost_index", "tool_purchases", "docustrata_invoices"] },
    real_distribution_match: null,
  };
}

beforeAll(async () => {
  TMP = await fs.mkdtemp(join(tmpdir(), "qp-training-status-"));
});
afterAll(async () => {
  try { await fs.rm(TMP, { recursive: true, force: true }); } catch { /* best-effort */ }
});

describe("readLatestTrainingStatus — engine method", () => {
  const engine = new QuotingActiveFactorLoaderEngine();

  it("happy: reads a fresh snapshot, ok + schemaVersion + ageMinutes + isStale=false", async () => {
    const path = await writeStatus("fresh.json", snapshot(new Date().toISOString()));
    const r = await engine.readLatestTrainingStatus({ path });
    expect(r.ok).toBe(true);
    expect(r.schemaVersion).toBe("1.0.0");
    expect(r.snapshot?.total_predicted).toBe(47905);
    expect(r.snapshot?.mape_pct).toBeCloseTo(71.0996, 3);
    const fb = r.snapshot?.baseline_fallback as { configured_refused?: boolean } | undefined;
    expect(fb?.configured_refused).toBe(true);
    expect(typeof r.ageMinutes).toBe("number");
    expect(r.ageMinutes).toBeLessThan(60);
    expect(r.isStale).toBe(false);
    expect(r.path).toBe(path);
  });

  it("failure 1 — missing file → ok:false, training-status-file-missing", async () => {
    const r = await engine.readLatestTrainingStatus({ path: join(TMP, "does-not-exist.json") });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("training-status-file-missing");
    expect(r.snapshot).toBe(undefined);
  });

  it("failure 2 — malformed JSON → ok:false, json-parse-failed", async () => {
    const path = await writeStatus("bad.json", "{ not valid json");
    const r = await engine.readLatestTrainingStatus({ path });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/^json-parse-failed/);
  });

  it("failure 3 — JSON array (non-object) → ok:false, training-status-not-an-object", async () => {
    const path = await writeStatus("arr.json", [1, 2, 3]);
    const r = await engine.readLatestTrainingStatus({ path });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("training-status-not-an-object");
  });

  it("stale: a >24h-old snapshot still returns ok:true but flags isStale", async () => {
    const old = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(); // 30h ago
    const path = await writeStatus("stale.json", snapshot(old));
    const r = await engine.readLatestTrainingStatus({ path });
    expect(r.ok).toBe(true);
    expect(r.isStale).toBe(true);
    expect(r.ageMinutes).toBeGreaterThan(24 * 60);
  });

  it("custom staleThresholdHours tightens the staleness flag", async () => {
    const twoHrsAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const path = await writeStatus("two-hours.json", snapshot(twoHrsAgo));
    expect((await engine.readLatestTrainingStatus({ path })).isStale).toBe(false); // default 24h
    expect((await engine.readLatestTrainingStatus({ path, staleThresholdHours: 1 })).isStale).toBe(true); // 1h
  });

  it("guard — non-positive staleThresholdHours falls back to the 24h default (not 0h)", async () => {
    const twoHrsAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const path = await writeStatus("guard.json", snapshot(twoHrsAgo));
    // 0/negative must NOT make every snapshot stale — the engine clamps to the 24h default.
    expect((await engine.readLatestTrainingStatus({ path, staleThresholdHours: 0 })).isStale).toBe(false);
    expect((await engine.readLatestTrainingStatus({ path, staleThresholdHours: -5 })).isStale).toBe(false);
  });

  it("failure 4 — read error on a directory path → ok:false, disk-read-error (not file-missing)", async () => {
    // TMP is a directory; fs.readFile on it throws EISDIR/EPERM — the non-ENOENT branch.
    const r = await engine.readLatestTrainingStatus({ path: TMP });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/^disk-read-error/);
    expect(r.reason).not.toBe("training-status-file-missing");
  });

  it("adversarial — non-object scalar JSON (a bare number) → ok:false, training-status-not-an-object", async () => {
    const path = await writeStatus("scalar.json", "42");
    const r = await engine.readLatestTrainingStatus({ path });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("training-status-not-an-object");
  });

  it("adversarial — snapshot without ts_iso → ageMinutes absent, isStale false (no crash)", async () => {
    const snap = snapshot("2026-01-01T00:00:00.000Z");
    delete snap.ts_iso;
    const path = await writeStatus("no-ts.json", snap);
    const r = await engine.readLatestTrainingStatus({ path });
    expect(r.ok).toBe(true);
    expect(r.ageMinutes).toBe(undefined);
    expect(r.isStale).toBe(false);
    expect(r.generated_at).toBe(undefined);
  });

  it("adversarial — unparseable ts_iso → ageMinutes absent, isStale false", async () => {
    const path = await writeStatus("bad-ts.json", snapshot("not-a-date"));
    const r = await engine.readLatestTrainingStatus({ path });
    expect(r.ok).toBe(true);
    expect(r.ageMinutes).toBe(undefined);
    expect(r.isStale).toBe(false);
  });

  it("default path points at the canonical status file", () => {
    expect(DEFAULT_TRAINING_STATUS_PATH).toMatch(/state[\\/]shared[\\/]quoting[\\/]latest-training-status\.json$/);
  });

  it("U-QP-CALIB-HEALTH-ROOT-FIX — default path anchors on the REPO ROOT (not process.cwd), so it resolves the real on-disk file regardless of server cwd", () => {
    // REGRESSION (charlie 2026-06-26): the production MCP server runs with cwd=mcp-server/,
    // so a process.cwd()-anchored default resolved to mcp-server/state/shared/... (file-missing)
    // while the train-cycle writes to the REPO ROOT state/shared/.... resolveRepoRoot() must
    // anchor the default at the repo root. Fail-on-revert: a cwd-anchored default would land
    // under mcp-server/ and NOT exist; the repo-root default points at the file the cycle writes.
    const repoRoot = resolveRepoRoot();
    expect(DEFAULT_TRAINING_STATUS_PATH).toBe(resolve(repoRoot, "state/shared/quoting/latest-training-status.json"));
    // The repo-root anchor must NOT live under mcp-server/ (the cwd-anchored bug location).
    expect(DEFAULT_TRAINING_STATUS_PATH).not.toMatch(/mcp-server[\\/]state[\\/]shared/);
  });
});

describe("schema/enum wiring", () => {
  it("training_status is in the action enum", () => {
    expect(quotingActionEnum.options).toContain("training_status");
  });

  it("training_status has a usable Zod schema in QUOTING_ACTION_SCHEMAS", () => {
    const schema = QUOTING_ACTION_SCHEMAS.training_status;
    expect(typeof schema.safeParse).toBe("function");
    expect(schema.safeParse({}).success).toBe(true);
  });

  it("schema accepts all-optional params", () => {
    expect(QUOTING_ACTION_SCHEMAS.training_status.safeParse({ statusPath: "x.json", staleThresholdHours: 6, includeActiveFactor: false }).success).toBe(true);
  });

  it("schema rejects invalid params (non-positive hours, wrong types)", () => {
    expect(QUOTING_ACTION_SCHEMAS.training_status.safeParse({ staleThresholdHours: -1 }).success).toBe(false);
    expect(QUOTING_ACTION_SCHEMAS.training_status.safeParse({ staleThresholdHours: "soon" }).success).toBe(false);
    expect(QUOTING_ACTION_SCHEMAS.training_status.safeParse({ includeActiveFactor: "yes" }).success).toBe(false);
  });
});

describe("dispatcher round-trip — invoke through the registered handler", () => {
  // Capture the REAL tool handler exactly as the MCP server would receive it; the SUT (the
  // dispatcher switch + engine) is real — only the server.tool registration is intercepted.
  let handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<any>;
  beforeAll(() => {
    const mockServer = {
      tool: (_name: string, _desc: string, _schema: unknown, h: any) => { handler = h; },
    };
    registerQuotingDispatcher(mockServer as unknown as Parameters<typeof registerQuotingDispatcher>[0]);
  });

  it("training_status returns the wrapped { ok, training_status, active_factor } payload", async () => {
    const path = await writeStatus("rt.json", snapshot(new Date().toISOString()));
    const res = await handler({ action: "training_status", params: { statusPath: path, includeActiveFactor: false } });
    expect(res.isError).not.toBe(true);
    const payload = JSON.parse(res.content[0].text);
    expect(payload.ok).toBe(true);
    expect(payload.training_status.snapshot.total_predicted).toBe(47905);
    expect(payload.training_status.snapshot.data_source_coverage.coverage_pct).toBe(40);
    expect(payload.active_factor).toBe(undefined); // includeActiveFactor:false omits it
  });

  it("training_status includes active_factor metadata by default (hasFactors boolean present)", async () => {
    const path = await writeStatus("rt2.json", snapshot(new Date().toISOString()));
    const res = await handler({ action: "training_status", params: { statusPath: path } });
    const payload = JSON.parse(res.content[0].text);
    expect(payload.ok).toBe(true);
    // active_factor is the active-calibration metadata read (may be ok:false if no active
    // factor on disk, but the field MUST be present with hasFactors boolean — never thrown).
    expect(typeof payload.active_factor.hasFactors).toBe("boolean");
  });

  it("missing status file round-trips as ok:false (not a thrown dispatcher error)", async () => {
    const res = await handler({ action: "training_status", params: { statusPath: join(TMP, "nope.json"), includeActiveFactor: false } });
    expect(res.isError).not.toBe(true);
    const payload = JSON.parse(res.content[0].text);
    expect(payload.ok).toBe(false);
    expect(payload.reason).toBe("training-status-file-missing");
  });

  it("invalid schema params → schema-validation-failed (isError)", async () => {
    const res = await handler({ action: "training_status", params: { staleThresholdHours: -5 } });
    expect(res.isError).toBe(true);
    const payload = JSON.parse(res.content[0].text);
    expect(payload.error).toBe("schema-validation-failed");
  });

  it("singleton exposes the method (engine is wired, not only the class)", () => {
    expect(typeof quotingActiveFactorLoaderEngine.readLatestTrainingStatus).toBe("function");
  });
});
