/**
 * cronRegistryReconcile.test.ts — CLEANUP-MS0 / U-CLEANUP-G8
 *
 * Covers `.claude/helpers/cron-registry-reconcile.mjs`:
 *   - parseArgs (defaults, all flags, `--flag=value`, ttl-ms floor, errors)
 *   - parseCronListSnapshot (JSON array, JSONL, malformed, empty, non-string)
 *   - validateRegistry (happy, missing fields, duplicate ids, non-golf id,
 *                       extra-field preservation, real on-disk registry)
 *   - isGolfManaged (id prefix, slash-command match, regex, scriptHint,
 *                    real-registry prompts, foreign)
 *   - cronIdentity, liveCronExpr — null/empty/three-field fallback
 *   - classifyCron (ok, drift cronExpr, drift prompt, drift cronExpr-missing,
 *                   drift prompt-missing, orphan, foreign, classifier-mismatch)
 *   - diffRegistryVsCronList (each branch — missing, orphaned, drifted, ok,
 *                             foreign, disabled+live, disabled+no-live)
 *   - buildActionPlan (delete-before-create ordering, drift double-action,
 *                      scheduleUtc/scriptHint/expectedDurationMs threaded)
 *   - acquireReconcileClaim + releaseReconcileClaim with REAL
 *     CoordinationStoreEngine on `:memory:` (claim happy, conflict, refresh,
 *     release)
 *   - runReconcile end-to-end with injected fakes (happy, claim-conflict,
 *     no-claim, dry-run, registry-invalid, coord-factory-null, claim-before-read
 *     ordering enforced — loser sees empty plan)
 *
 * All assertions are concrete (no .toBeDefined() stubs); per the
 * per-file scrutiny gate (CLAUDE.md §PER-FILE SCRUTINY GATE).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hostname as osHostname } from "node:os";
import { execFileSync, spawnSync } from "node:child_process";

// @ts-expect-error — .mjs helper, no type declarations
import * as Reconcile from "../../../.claude/helpers/cron-registry-reconcile.mjs";

const HELPER_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../../.claude/helpers");
const REPO_ROOT = resolve(HELPER_DIR, "..", "..");
const REAL_REGISTRY_PATH = join(REPO_ROOT, "state/shared/golf-cron-registry.json");

// ──────────────────────────────────────────────────────────────────────────
// parseArgs
// ──────────────────────────────────────────────────────────────────────────
describe("parseArgs", () => {
  it("returns defaults on empty argv", () => {
    const out = Reconcile.parseArgs([]);
    expect(out.cronList).toBe(null);
    expect(out.sessionId).toBe(null);
    expect(out.ttlMs).toBe(Reconcile.__INTERNAL__.DEFAULT_TTL_MS);
    expect(out.noClaim).toBe(false);
    expect(out.dryRun).toBe(false);
    expect(out.json).toBe(false);
    expect(out.help).toBe(false);
  });

  it("accepts space-separated flag/value pairs", () => {
    const out = Reconcile.parseArgs([
      "--registry", "X/reg.json",
      "--cron-list", "snap.json",
      "--session-id", "claude-1234",
      "--db", "X/coord.db",
      "--ttl-ms", "600000",
      "--no-claim",
      "--dry-run",
      "--json",
    ]);
    expect(out.registry).toBe("X/reg.json");
    expect(out.cronList).toBe("snap.json");
    expect(out.sessionId).toBe("claude-1234");
    expect(out.db).toBe("X/coord.db");
    expect(out.ttlMs).toBe(600000);
    expect(out.noClaim).toBe(true);
    expect(out.dryRun).toBe(true);
    expect(out.json).toBe(true);
  });

  it("accepts `--flag=value` form (PowerShell-friendly)", () => {
    const out = Reconcile.parseArgs([
      "--registry=X/reg.json",
      "--session-id=claude-abc",
      "--ttl-ms=120000",
    ]);
    expect(out.registry).toBe("X/reg.json");
    expect(out.sessionId).toBe("claude-abc");
    expect(out.ttlMs).toBe(120000);
  });

  it("floors --ttl-ms to MIN_TTL_MS to prevent pathological values", () => {
    const out = Reconcile.parseArgs(["--ttl-ms", "1"]);
    expect(out.ttlMs).toBe(Reconcile.__INTERNAL__.MIN_TTL_MS);
    expect(out.ttlMs).toBeGreaterThanOrEqual(60_000);
  });

  it("rejects unknown flags", () => {
    expect(() => Reconcile.parseArgs(["--bogus"])).toThrow(/unknown flag/);
  });

  it("rejects flag with missing value", () => {
    expect(() => Reconcile.parseArgs(["--registry"])).toThrow(/requires a value/);
  });

  it("rejects non-numeric --ttl-ms", () => {
    expect(() => Reconcile.parseArgs(["--ttl-ms", "not-a-number"])).toThrow(/positive number/);
  });

  it("rejects malformed --now", () => {
    expect(() => Reconcile.parseArgs(["--now", "garbage"])).toThrow(/cannot parse ISO/);
  });

  it("accepts -h / --help short and long form", () => {
    expect(Reconcile.parseArgs(["--help"]).help).toBe(true);
    expect(Reconcile.parseArgs(["-h"]).help).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// parseCronListSnapshot
// ──────────────────────────────────────────────────────────────────────────
describe("parseCronListSnapshot", () => {
  it("returns [] + no warnings for empty string", () => {
    const r = Reconcile.parseCronListSnapshot("");
    expect(r.items).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it("parses a JSON array", () => {
    const r = Reconcile.parseCronListSnapshot('[{"id":"a"},{"id":"b"}]');
    expect(r.items.length).toBe(2);
    expect(r.items[0].id).toBe("a");
    expect(r.items[1].id).toBe("b");
    expect(r.warnings).toEqual([]);
  });

  it("parses JSONL (newline-delimited objects)", () => {
    const r = Reconcile.parseCronListSnapshot(
      '{"id":"a"}\n{"id":"b"}\n{"id":"c"}',
    );
    expect(r.items.length).toBe(3);
    expect(r.items.map((x: any) => x.id)).toEqual(["a", "b", "c"]);
    expect(r.warnings).toEqual([]);
  });

  it("collects malformed JSONL lines into warnings without throwing", () => {
    const r = Reconcile.parseCronListSnapshot(
      '{"id":"a"}\nNOT_JSON\n{"id":"b"}',
    );
    expect(r.items.length).toBe(2);
    expect(r.items.map((x: any) => x.id)).toEqual(["a", "b"]);
    expect(r.warnings.length).toBe(1);
    expect(r.warnings[0]).toMatch(/line 2/);
  });

  it("rejects non-object array elements silently (filter)", () => {
    const r = Reconcile.parseCronListSnapshot('[{"id":"a"}, "string", 42, null]');
    expect(r.items.length).toBe(1);
    expect(r.items[0].id).toBe("a");
  });

  it("handles non-string input gracefully", () => {
    const r = Reconcile.parseCronListSnapshot(123 as any);
    expect(r.items).toEqual([]);
    expect(r.warnings[0]).toMatch(/not a string/);
  });

  it("flags JSON-array that is not an array", () => {
    const r = Reconcile.parseCronListSnapshot('[42');  // malformed
    expect(r.items).toEqual([]);
    expect(r.warnings[0]).toMatch(/parse failed/);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// validateRegistry
// ──────────────────────────────────────────────────────────────────────────
const mkRegEntry = (over: any = {}) => ({
  id: "golf-foo",
  prompt: "Run scripts/golf-foo.mjs",
  cronExpr: "17 3 * * *",
  scheduleUtc: "03:17",
  description: "Foo cron",
  scriptHint: "scripts/golf-foo.mjs",
  expectedDurationMs: 60000,
  enabled: true,
  ...over,
});

describe("validateRegistry", () => {
  it("accepts a minimal valid registry", () => {
    const r = Reconcile.validateRegistry({
      schemaVersion: 1,
      crons: [mkRegEntry()],
    });
    expect(r.valid).toBe(true);
    expect(r.entries.length).toBe(1);
    expect(r.entries[0].id).toBe("golf-foo");
    expect(r.entries[0].scheduleUtc).toBe("03:17");
    expect(r.entries[0].scriptHint).toBe("scripts/golf-foo.mjs");
    expect(r.entries[0].expectedDurationMs).toBe(60000);
  });

  it("rejects wrong schemaVersion", () => {
    const r = Reconcile.validateRegistry({ schemaVersion: 2, crons: [mkRegEntry()] });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/schemaVersion/);
  });

  it("rejects missing crons array", () => {
    const r = Reconcile.validateRegistry({ schemaVersion: 1 });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/crons: not an array/);
  });

  it("rejects entry missing id/prompt/cronExpr", () => {
    const r1 = Reconcile.validateRegistry({ schemaVersion: 1, crons: [mkRegEntry({ id: undefined })] });
    expect(r1.valid).toBe(false);
    expect(r1.errors.some((e: string) => /missing id/.test(e))).toBe(true);
    const r2 = Reconcile.validateRegistry({ schemaVersion: 1, crons: [mkRegEntry({ prompt: undefined })] });
    expect(r2.valid).toBe(false);
    expect(r2.errors.some((e: string) => /missing prompt/.test(e))).toBe(true);
    const r3 = Reconcile.validateRegistry({ schemaVersion: 1, crons: [mkRegEntry({ cronExpr: undefined })] });
    expect(r3.valid).toBe(false);
    expect(r3.errors.some((e: string) => /missing cronExpr/.test(e))).toBe(true);
  });

  it("rejects duplicate id", () => {
    const r = Reconcile.validateRegistry({
      schemaVersion: 1,
      crons: [mkRegEntry(), mkRegEntry()],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e: string) => /duplicate id/.test(e))).toBe(true);
  });

  it("rejects non-golf-prefixed id", () => {
    const r = Reconcile.validateRegistry({
      schemaVersion: 1,
      crons: [mkRegEntry({ id: "notgolf-bad" })],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e: string) => /must start with "golf-"/.test(e))).toBe(true);
  });

  it("preserves top-level metadata into the meta field", () => {
    const r = Reconcile.validateRegistry({
      schemaVersion: 1,
      lockfileDir: ".cron-locks",
      timeBasis: "UTC",
      generator: "manual",
      notes: "ignore me",
      generatedAt: "2026-05-14T15:08:45.000Z",
      crons: [mkRegEntry()],
    });
    expect(r.valid).toBe(true);
    expect(r.meta.lockfileDir).toBe(".cron-locks");
    expect(r.meta.timeBasis).toBe("UTC");
    expect(r.meta.generator).toBe("manual");
    expect(r.meta.generatedAt).toBe("2026-05-14T15:08:45.000Z");
  });

  it("validates the REAL on-disk golf-cron-registry.json (E2 output)", () => {
    if (!existsSync(REAL_REGISTRY_PATH)) {
      // Skip if E2 has been reverted; we still pass because the rest covers it.
      return;
    }
    const raw = JSON.parse(readFileSync(REAL_REGISTRY_PATH, "utf8"));
    const r = Reconcile.validateRegistry(raw);
    expect(r.valid).toBe(true);
    expect(r.entries.length).toBeGreaterThanOrEqual(5);
    // Spot-check the 5 real entries — confirms we don't silently drop fields
    // the operator depends on.
    const ids = r.entries.map((e: any) => e.id);
    expect(ids).toContain("golf-stale-claim-sweep");
    expect(ids).toContain("golf-state-snapshot");
    expect(ids).toContain("golf-wiki-lint");
    expect(ids).toContain("golf-frontend-merge-nudge");
    expect(ids).toContain("golf-close-out-audit");
    for (const e of r.entries) {
      expect(e.id.startsWith("golf-")).toBe(true);
      expect(typeof e.prompt).toBe("string");
      expect(typeof e.cronExpr).toBe("string");
      expect(e.scriptHint).not.toBe(null);
      expect(typeof e.expectedDurationMs).toBe("number");
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────
// isGolfManaged — REAL registry prompts must classify true (was bug pre-fix)
// ──────────────────────────────────────────────────────────────────────────
describe("isGolfManaged", () => {
  const realEntries = [
    {
      id: "golf-stale-claim-sweep",
      prompt: "Run node .claude/helpers/handoff-staleness.mjs --json and surface any dead-owner handoffs or unknown-heartbeat claims to the chat bus. Future: this becomes /peer-audit when U-CLEANUP-B4 lands.",
      cronExpr: "17 3 * * *",
      scriptHint: ".claude/helpers/handoff-staleness.mjs --json",
    },
    {
      id: "golf-state-snapshot",
      prompt: "Run scripts/golf-state-snapshot.mjs --json and report deltas vs last 7 snapshots.",
      cronExpr: "23 4 * * *",
      scriptHint: "scripts/golf-state-snapshot.mjs --json",
    },
    {
      id: "golf-wiki-lint",
      prompt: "/wiki-lint",
      cronExpr: "31 5 * * *",
      scriptHint: "scripts/system-health/09-wiki-lint.ps1",
    },
    {
      id: "golf-frontend-merge-nudge",
      prompt: "/frontend-merge-plan",
      cronExpr: "43 6 * * *",
      scriptHint: "scripts/frontend-merge-nudge.mjs",
    },
    {
      id: "golf-close-out-audit",
      prompt: "/close-out-audit",
      cronExpr: "53 7 * * *",
      scriptHint: "scripts/audit-close-out-candidates.mjs",
    },
  ];

  it("matches by id prefix (golf-*)", () => {
    expect(Reconcile.isGolfManaged({ id: "golf-anything" }, [])).toBe(true);
  });

  it("matches by jobId prefix when id is missing", () => {
    expect(Reconcile.isGolfManaged({ jobId: "golf-xyz" }, [])).toBe(true);
  });

  it("matches a slash-command prompt (/wiki-lint et al)", () => {
    expect(Reconcile.isGolfManaged({ prompt: "/wiki-lint" }, [])).toBe(true);
    expect(Reconcile.isGolfManaged({ prompt: "/frontend-merge-plan" }, [])).toBe(true);
    expect(Reconcile.isGolfManaged({ prompt: "/close-out-audit" }, [])).toBe(true);
  });

  it("matches `Run scripts/golf-*` prompts", () => {
    expect(Reconcile.isGolfManaged(
      { prompt: "Run scripts/golf-state-snapshot.mjs --json and report deltas" }, [])).toBe(true);
  });

  it("matches `Run node .claude/helpers/...` prompts (path-prefix, the real registry uses it)", () => {
    expect(Reconcile.isGolfManaged(
      { prompt: "Run node .claude/helpers/handoff-staleness.mjs --json" }, [])).toBe(true);
  });

  it("matches via scriptHint equality against the registry", () => {
    const entries = [{ id: "golf-foo", prompt: "x", cronExpr: "y", scriptHint: "scripts/golf-foo.mjs", enabled: true } as any];
    expect(Reconcile.isGolfManaged({ jobId: "renamed-by-harness", scriptHint: "scripts/golf-foo.mjs" }, entries)).toBe(true);
  });

  it("matches via verbatim prompt equality against the registry (jobId rewritten)", () => {
    const entries = [{ id: "golf-foo", prompt: "Run something custom and unique", cronExpr: "y", scriptHint: null, enabled: true } as any];
    expect(Reconcile.isGolfManaged({ jobId: "renamed", prompt: "Run something custom and unique" }, entries)).toBe(true);
  });

  it("returns false for genuinely foreign crons", () => {
    expect(Reconcile.isGolfManaged({ id: "user-cron", prompt: "Run /random-thing" }, [])).toBe(false);
    expect(Reconcile.isGolfManaged({}, [])).toBe(false);
    expect(Reconcile.isGolfManaged(null, [])).toBe(false);
    expect(Reconcile.isGolfManaged(undefined, [])).toBe(false);
  });

  it("classifies ALL 5 REAL registry entries as golf-managed (post-fix coverage)", () => {
    // Simulate harness-rewritten jobIds with the prompt + scriptHint intact —
    // this is the failure mode P1-3 was about.
    for (const e of realEntries) {
      const rewritten = { jobId: "opaque-jobid-" + Math.random(), prompt: e.prompt, scriptHint: e.scriptHint };
      const classified = Reconcile.isGolfManaged(rewritten, realEntries.map((re) => ({ ...re, enabled: true })));
      expect(classified).toBe(true);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────
// cronIdentity + liveCronExpr
// ──────────────────────────────────────────────────────────────────────────
describe("cronIdentity", () => {
  it("prefers id over jobId", () => {
    expect(Reconcile.cronIdentity({ id: "a", jobId: "b" })).toBe("a");
  });
  it("falls back to jobId when id is missing", () => {
    expect(Reconcile.cronIdentity({ jobId: "b" })).toBe("b");
  });
  it("returns null when neither is present", () => {
    expect(Reconcile.cronIdentity({})).toBe(null);
    expect(Reconcile.cronIdentity(null)).toBe(null);
    expect(Reconcile.cronIdentity({ id: "" })).toBe(null);   // empty string
  });
});

describe("liveCronExpr", () => {
  it("prefers cronExpr", () => {
    expect(Reconcile.liveCronExpr({ cronExpr: "a", cron: "b", schedule: "c" })).toBe("a");
  });
  it("falls back to cron when cronExpr is missing", () => {
    expect(Reconcile.liveCronExpr({ cron: "b", schedule: "c" })).toBe("b");
  });
  it("falls back to schedule last", () => {
    expect(Reconcile.liveCronExpr({ schedule: "c" })).toBe("c");
  });
  it("returns null when none are present", () => {
    expect(Reconcile.liveCronExpr({})).toBe(null);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// classifyCron
// ──────────────────────────────────────────────────────────────────────────
describe("classifyCron", () => {
  const reg = [{
    id: "golf-foo",
    prompt: "Run scripts/golf-foo.mjs",
    cronExpr: "17 3 * * *",
    enabled: true,
    scriptHint: null,
  } as any];

  it("status=ok when id + cronExpr + prompt all match", () => {
    const v = Reconcile.classifyCron({ id: "golf-foo", cronExpr: "17 3 * * *", prompt: "Run scripts/golf-foo.mjs" }, reg);
    expect(v.status).toBe("ok");
    expect(v.entry.id).toBe("golf-foo");
  });

  it("status=drifted with cronExpr drift when expr differs", () => {
    const v = Reconcile.classifyCron({ id: "golf-foo", cronExpr: "00 3 * * *", prompt: "Run scripts/golf-foo.mjs" }, reg);
    expect(v.status).toBe("drifted");
    expect(v.drift).toContain("cronExpr");
  });

  it("status=drifted with prompt drift when prompt differs", () => {
    const v = Reconcile.classifyCron({ id: "golf-foo", cronExpr: "17 3 * * *", prompt: "DIFFERENT" }, reg);
    expect(v.status).toBe("drifted");
    expect(v.drift).toContain("prompt");
  });

  it("status=drifted with cronExpr-missing-from-live when expr is absent (P1.4 fix)", () => {
    const v = Reconcile.classifyCron({ id: "golf-foo", prompt: "Run scripts/golf-foo.mjs" }, reg);
    expect(v.status).toBe("drifted");
    expect(v.drift).toContain("cronExpr-missing-from-live");
  });

  it("status=drifted with prompt-missing-from-live when prompt is absent", () => {
    const v = Reconcile.classifyCron({ id: "golf-foo", cronExpr: "17 3 * * *" }, reg);
    expect(v.status).toBe("drifted");
    expect(v.drift).toContain("prompt-missing-from-live");
  });

  it("status=orphan when golf-managed but not in registry", () => {
    const v = Reconcile.classifyCron({ id: "golf-unknown", prompt: "Run scripts/golf-unknown.mjs" }, reg);
    expect(v.status).toBe("orphan");
  });

  it("status=foreign for non-golf crons", () => {
    const v = Reconcile.classifyCron({ id: "user-cron", prompt: "Run /something-else" }, reg);
    expect(v.status).toBe("foreign");
  });

  it("status=orphan with reason=no-id when prompt is golf but no id/jobId", () => {
    const v = Reconcile.classifyCron({ prompt: "/wiki-lint" }, reg);
    expect(v.status).toBe("orphan");
    expect((v as any).reason).toBe("no-id");
  });
});

// ──────────────────────────────────────────────────────────────────────────
// diffRegistryVsCronList — exhaustive coverage of every branch
// ──────────────────────────────────────────────────────────────────────────
describe("diffRegistryVsCronList", () => {
  const e = (id: string, over: any = {}) => ({
    id,
    prompt: `Run scripts/${id}.mjs`,
    cronExpr: "17 3 * * *",
    enabled: true,
    scriptHint: null,
    ...over,
  });

  it("flags missing when registry has it and cron-list does not", () => {
    const d = Reconcile.diffRegistryVsCronList([e("golf-a")], []);
    expect(d.missing.length).toBe(1);
    expect(d.missing[0].id).toBe("golf-a");
    expect(d.orphaned.length).toBe(0);
    expect(d.drifted.length).toBe(0);
    expect(d.ok.length).toBe(0);
  });

  it("flags ok when exact match", () => {
    const live = [{ id: "golf-a", cronExpr: "17 3 * * *", prompt: "Run scripts/golf-a.mjs" }];
    const d = Reconcile.diffRegistryVsCronList([e("golf-a")], live);
    expect(d.ok.length).toBe(1);
    expect(d.missing.length).toBe(0);
    expect(d.drifted.length).toBe(0);
    expect(d.orphaned.length).toBe(0);
  });

  it("flags drifted when id matches but cronExpr differs", () => {
    const live = [{ id: "golf-a", cronExpr: "00 0 * * *", prompt: "Run scripts/golf-a.mjs" }];
    const d = Reconcile.diffRegistryVsCronList([e("golf-a")], live);
    expect(d.drifted.length).toBe(1);
    expect(d.drifted[0].drift).toContain("cronExpr");
  });

  it("flags orphaned when live golf cron has no registry entry", () => {
    const live = [{ id: "golf-x", cronExpr: "00 0 * * *", prompt: "Run scripts/golf-x.mjs" }];
    const d = Reconcile.diffRegistryVsCronList([e("golf-a")], live);
    expect(d.orphaned.length).toBe(1);
    expect(d.orphaned[0].live.id).toBe("golf-x");
    expect(d.missing.length).toBe(1); // golf-a still missing
  });

  it("ignores foreign crons (non-golf)", () => {
    const live = [{ id: "user-cron", cronExpr: "00 0 * * *", prompt: "Run /unrelated" }];
    const d = Reconcile.diffRegistryVsCronList([e("golf-a")], live);
    expect(d.foreign.length).toBe(1);
    expect(d.orphaned.length).toBe(0);
    expect(d.missing.length).toBe(1);
  });

  it("flags disabled-registry-entry + live-cron as orphaned (P1-2 fix)", () => {
    // Operator disabled golf-a in registry — live cron should be torn down.
    const live = [{ id: "golf-a", cronExpr: "17 3 * * *", prompt: "Run scripts/golf-a.mjs" }];
    const d = Reconcile.diffRegistryVsCronList([e("golf-a", { enabled: false })], live);
    expect(d.orphaned.length).toBe(1);
    expect(d.orphaned[0].reason).toBe("registry-entry-disabled");
    expect(d.missing.length).toBe(0);
    expect(d.drifted.length).toBe(0);
    expect(d.ok.length).toBe(0);
  });

  it("ignores disabled-registry-entry without a live cron", () => {
    const d = Reconcile.diffRegistryVsCronList([e("golf-a", { enabled: false })], []);
    expect(d.missing.length).toBe(0);
    expect(d.orphaned.length).toBe(0);
  });

  it("flags cronExpr-missing-from-live drift at the diff+plan layer (P1.4 end-to-end)", () => {
    // P1-C anti-regression: the classifyCron unit-test covers the drift token,
    // but the operator-facing flow goes through diff + plan. Verify a live
    // cron with no cronExpr field (none of cronExpr/cron/schedule present) is
    // routed to drifted, then turned into delete+create by buildActionPlan.
    const live = [{ id: "golf-a", prompt: "Run scripts/golf-a.mjs" }];
    const d = Reconcile.diffRegistryVsCronList([e("golf-a")], live);
    expect(d.drifted.length).toBe(1);
    expect(d.drifted[0].drift).toContain("cronExpr-missing-from-live");
    const plan = Reconcile.buildActionPlan(d);
    expect(plan.deletes.length).toBe(1);
    expect(plan.deletes[0].reason).toMatch(/cronExpr-missing-from-live/);
    expect(plan.creates.length).toBe(1);
    expect(plan.creates[0].id).toBe("golf-a");
  });

  it("partitions the live cron table — each live cron in exactly one bucket", () => {
    const live = [
      { id: "golf-a", cronExpr: "17 3 * * *", prompt: "Run scripts/golf-a.mjs" }, // ok
      { id: "golf-b", cronExpr: "BAD", prompt: "Run scripts/golf-b.mjs" },       // drifted
      { id: "golf-orphan", cronExpr: "X", prompt: "Run scripts/golf-orphan.mjs" }, // orphaned
      { id: "user", cronExpr: "X", prompt: "Run /user" },                         // foreign
    ];
    const d = Reconcile.diffRegistryVsCronList([e("golf-a"), e("golf-b")], live);
    // golf-a → ok ; golf-b → drifted ; golf-orphan → orphaned ; user → foreign
    expect(d.ok.length + d.drifted.length + d.orphaned.length + d.foreign.length).toBe(4);
    expect(d.ok.length).toBe(1);
    expect(d.drifted.length).toBe(1);
    expect(d.orphaned.length).toBe(1);
    expect(d.foreign.length).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// buildActionPlan
// ──────────────────────────────────────────────────────────────────────────
describe("buildActionPlan", () => {
  it("emits empty plan when diff is empty", () => {
    const p = Reconcile.buildActionPlan({
      missing: [], orphaned: [], drifted: [], ok: [], foreign: [],
    });
    expect(p.deletes).toEqual([]);
    expect(p.creates).toEqual([]);
    expect(p.noopCount).toBe(0);
  });

  it("emits create-only actions for missing entries with FULL registry payload (P1-1 fix)", () => {
    const missing = [{
      id: "golf-a", prompt: "P", cronExpr: "17 3 * * *",
      scheduleUtc: "03:17", description: "desc",
      scriptHint: "scripts/golf-a.mjs", expectedDurationMs: 60000,
    }];
    const p = Reconcile.buildActionPlan({
      missing, orphaned: [], drifted: [], ok: [], foreign: [],
    });
    expect(p.creates.length).toBe(1);
    expect(p.deletes.length).toBe(0);
    const c = p.creates[0];
    expect(c.id).toBe("golf-a");
    expect(c.cronExpr).toBe("17 3 * * *");
    expect(c.scheduleUtc).toBe("03:17");
    expect(c.scriptHint).toBe("scripts/golf-a.mjs");
    expect(c.expectedDurationMs).toBe(60000);
    expect(c.description).toBe("desc");
    expect(c.reason).toBe("missing-from-cron-list");
  });

  it("emits delete-only actions for orphaned crons", () => {
    const orphaned = [{ live: { id: "golf-orph", cronExpr: "X", prompt: "Y" }, reason: "id-not-in-registry" }];
    const p = Reconcile.buildActionPlan({
      missing: [], orphaned, drifted: [], ok: [], foreign: [],
    });
    expect(p.deletes.length).toBe(1);
    expect(p.deletes[0].id).toBe("golf-orph");
    expect(p.deletes[0].reason).toBe("id-not-in-registry");
    expect(p.creates.length).toBe(0);
  });

  it("emits BOTH delete + create for drifted entries (delete-before-create order)", () => {
    const drifted = [{
      entry: { id: "golf-a", prompt: "NEW", cronExpr: "17 3 * * *", scheduleUtc: "03:17" },
      live:  { id: "golf-a", prompt: "OLD", cronExpr: "00 3 * * *" },
      drift: ["cronExpr", "prompt"],
    }];
    const p = Reconcile.buildActionPlan({
      missing: [], orphaned: [], drifted, ok: [], foreign: [],
    });
    expect(p.deletes.length).toBe(1);
    expect(p.creates.length).toBe(1);
    expect(p.deletes[0].id).toBe("golf-a");
    expect(p.deletes[0].reason).toMatch(/drifted:cronExpr,prompt/);
    expect(p.creates[0].id).toBe("golf-a");
    expect(p.creates[0].cronExpr).toBe("17 3 * * *");
    expect(p.creates[0].prompt).toBe("NEW");
    expect(p.creates[0].reason).toMatch(/re-register/);
  });

  it("counts noop (ok) entries separately", () => {
    const ok = [{ entry: {}, live: {} }, { entry: {}, live: {} }];
    const p = Reconcile.buildActionPlan({
      missing: [], orphaned: [], drifted: [], ok, foreign: [],
    });
    expect(p.noopCount).toBe(2);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// acquireReconcileClaim + releaseReconcileClaim — REAL engine, :memory: DB
// ──────────────────────────────────────────────────────────────────────────
describe("acquireReconcileClaim + releaseReconcileClaim", () => {
  // Lazy-import the real engine so the test file stays independent of the
  // helper's coordFactory plumbing.
  let CoordinationStoreEngine: any;
  beforeAll(async () => {
    const mod = await import("../engines/CoordinationStoreEngine.js");
    CoordinationStoreEngine = mod.CoordinationStoreEngine;
  });

  it("acquires + releases successfully on an empty DB", () => {
    const coord = new CoordinationStoreEngine({ dbPath: ":memory:" });
    const c = Reconcile.acquireReconcileClaim({
      coord, sessionId: "claude-test-1", ttlMs: 60000,
    });
    expect(c.acquired).toBe(true);
    expect(c.row.resource_path).toBe(Reconcile.__INTERNAL__.CLAIM_RESOURCE);
    expect(c.row.session_id).toBe("claude-test-1");
    expect(c.row.intent).toBe("cron-registry-reconcile");
    const released = Reconcile.releaseReconcileClaim({ coord, sessionId: "claude-test-1" });
    expect(released).toBe(true);
  });

  it("returns acquired:false on conflict from a different session", () => {
    const coord = new CoordinationStoreEngine({ dbPath: ":memory:" });
    Reconcile.acquireReconcileClaim({ coord, sessionId: "claude-A", ttlMs: 60000 });
    const c2 = Reconcile.acquireReconcileClaim({ coord, sessionId: "claude-B", ttlMs: 60000 });
    expect(c2.acquired).toBe(false);
    expect(c2.conflict.existing.session_id).toBe("claude-A");
  });

  it("refreshes TTL for same session (idempotent acquire)", () => {
    const coord = new CoordinationStoreEngine({ dbPath: ":memory:" });
    const c1 = Reconcile.acquireReconcileClaim({ coord, sessionId: "claude-A", ttlMs: 60000 });
    const c2 = Reconcile.acquireReconcileClaim({ coord, sessionId: "claude-A", ttlMs: 60000 });
    expect(c1.acquired).toBe(true);
    expect(c2.acquired).toBe(true);
    expect(c2.row.session_id).toBe("claude-A");
  });

  it("release returns false when session doesn't own the claim", () => {
    const coord = new CoordinationStoreEngine({ dbPath: ":memory:" });
    Reconcile.acquireReconcileClaim({ coord, sessionId: "claude-A", ttlMs: 60000 });
    const released = Reconcile.releaseReconcileClaim({ coord, sessionId: "claude-WRONG" });
    expect(released).toBe(false);
  });

  it("throws when sessionId is missing (programmer error)", () => {
    const coord = new CoordinationStoreEngine({ dbPath: ":memory:" });
    expect(() => Reconcile.acquireReconcileClaim({ coord, sessionId: "", ttlMs: 60000 })).toThrow(/sessionId/);
  });

  it("throws when coord is missing (programmer error)", () => {
    expect(() => Reconcile.acquireReconcileClaim({ coord: null, sessionId: "x", ttlMs: 60000 })).toThrow(/coord/);
  });

  it("passes hostname (P1-6 fix: hostname AND pc_name populated separately for cross-machine fleets)", () => {
    const coord = new CoordinationStoreEngine({ dbPath: ":memory:" });
    const c = Reconcile.acquireReconcileClaim({ coord, sessionId: "claude-X", ttlMs: 60000 });
    expect(c.acquired).toBe(true);
    // Both fields must be present on the row (schema contract).
    expect(c.row).toHaveProperty("hostname");
    expect(c.row).toHaveProperty("pc_name");
    expect(typeof c.row.hostname).toBe("string");
    expect(typeof c.row.pc_name).toBe("string");
    // pcName should mirror process.env.COMPUTERNAME (or "" when unset).
    expect(c.row.pc_name).toBe(process.env.COMPUTERNAME ?? "");
    // hostname() should mirror os.hostname() — non-empty on real hosts.
    // Skip the equality when osHostname() throws or returns empty (sandboxes).
    let realHn = "";
    try { realHn = osHostname() || ""; } catch { /* sandbox */ }
    if (realHn) {
      expect(c.row.hostname).toBe(realHn);
      expect(c.row.hostname.length).toBeGreaterThan(0);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────
// runReconcile — end-to-end with dependency-injected fakes
// ──────────────────────────────────────────────────────────────────────────
describe("runReconcile (e2e with fakes)", () => {
  /** Build a minimal fake CoordinationStoreEngine that satisfies the
   *  contract `runReconcile` uses: claim, release, close. Each instance
   *  shares an outer `claims` map so two factories on the same map simulate
   *  the on-disk WAL DB. */
  function makeFakeCoord(sharedClaims: Map<string, any>) {
    return {
      claim(input: any) {
        const existing = sharedClaims.get(input.resourcePath);
        if (existing && existing.session_id !== input.sessionId) {
          return { acquired: false, existing, reason: "already_claimed_by_other_session" };
        }
        const row = {
          resource_path: input.resourcePath,
          session_id: input.sessionId,
          pc_name: input.pcName,
          hostname: input.hostname,
          pid: input.pid,
          intent: input.intent,
          claimed_at: Date.now(),
          expires_at: Date.now() + input.ttlMs,
        };
        sharedClaims.set(input.resourcePath, row);
        return { acquired: true, row };
      },
      release(input: any) {
        const existing = sharedClaims.get(input.resourcePath);
        if (existing && existing.session_id === input.sessionId) {
          sharedClaims.delete(input.resourcePath);
          return true;
        }
        return false;
      },
      close() { /* no-op */ },
    };
  }

  const validRegistry = {
    schemaVersion: 1,
    lockfileDir: ".cron-locks",
    crons: [
      { id: "golf-a", prompt: "Run scripts/golf-a.mjs", cronExpr: "17 3 * * *", scheduleUtc: "03:17", scriptHint: "scripts/golf-a.mjs", expectedDurationMs: 60000, enabled: true },
      { id: "golf-b", prompt: "Run scripts/golf-b.mjs", cronExpr: "23 4 * * *", scheduleUtc: "04:23", scriptHint: "scripts/golf-b.mjs", expectedDurationMs: 30000, enabled: true },
    ],
  };

  it("happy path: claim acquired, registry+cron-list read, diff + plan computed", async () => {
    const claims = new Map();
    const out = await Reconcile.runReconcile({
      readRegistry: () => validRegistry,
      readCronList: async () => '[{"id":"golf-a","cronExpr":"17 3 * * *","prompt":"Run scripts/golf-a.mjs"}]',
      coordFactory: async () => makeFakeCoord(claims),
    }, {
      registry: "fake", cronList: "fake", sessionId: "claude-1",
      ttlMs: 60000, noClaim: false, dryRun: false, db: ":memory:",
    });

    expect(out.coord).not.toBe(null);
    expect(out.result.claim.acquired).toBe(true);
    expect(out.result.registry.entries).toBe(2);
    expect(out.result.cronList.items).toBe(1);
    expect(out.result.diff.ok).toBe(1);
    expect(out.result.diff.missing).toBe(1);
    expect(out.result.plan.creates.length).toBe(1);
    expect(out.result.plan.creates[0].id).toBe("golf-b");
    expect(out.result.errors).toEqual([]);
  });

  it("claim conflict: loser sees empty plan, registry+cron-list never read (P1.1 fix)", async () => {
    const claims = new Map();
    // First chat claims.
    const firstCoord = makeFakeCoord(claims);
    firstCoord.claim({
      resourcePath: Reconcile.__INTERNAL__.CLAIM_RESOURCE,
      sessionId: "claude-WINNER", pcName: "", hostname: "", pid: 1,
      intent: "cron-registry-reconcile", ttlMs: 60000,
    });

    let readRegistryCalls = 0;
    let readCronListCalls = 0;
    const out = await Reconcile.runReconcile({
      readRegistry: () => { readRegistryCalls++; return validRegistry; },
      readCronList: async () => { readCronListCalls++; return "[]"; },
      coordFactory: async () => makeFakeCoord(claims),
    }, {
      registry: "fake", cronList: "fake", sessionId: "claude-LOSER",
      ttlMs: 60000, noClaim: false, dryRun: false, db: ":memory:",
    });

    expect(out.result.claim.acquired).toBe(false);
    expect(out.result.claim.conflict.existing.session_id).toBe("claude-WINNER");
    expect(out.result.plan.creates).toEqual([]);
    expect(out.result.plan.deletes).toEqual([]);
    // CRITICAL: registry + cron-list were NOT read by the loser (claim-before-read).
    expect(readRegistryCalls).toBe(0);
    expect(readCronListCalls).toBe(0);
  });

  it("--no-claim: skip coord_sqlite, still compute plan", async () => {
    const out = await Reconcile.runReconcile({
      readRegistry: () => validRegistry,
      readCronList: async () => "[]",
      coordFactory: async () => { throw new Error("should-not-be-called"); },
    }, {
      registry: "fake", cronList: null, sessionId: "claude-test",
      ttlMs: 60000, noClaim: true, dryRun: false,
    });
    expect(out.coord).toBe(null);
    expect(out.result.claim.skipped).toBe(true);
    expect(out.result.claim.reason).toBe("no-claim");
    expect(out.result.plan.creates.length).toBe(2);   // both registry entries missing
  });

  it("--dry-run: skip claim, still compute plan", async () => {
    const out = await Reconcile.runReconcile({
      readRegistry: () => validRegistry,
      readCronList: async () => "[]",
      coordFactory: async () => { throw new Error("should-not-be-called"); },
    }, {
      registry: "fake", cronList: null, sessionId: "claude-test",
      ttlMs: 60000, noClaim: false, dryRun: true,
    });
    expect(out.result.claim.skipped).toBe(true);
    expect(out.result.claim.reason).toBe("dry-run");
    expect(out.result.plan.creates.length).toBe(2);
  });

  it("registry invalid: error surfaced, plan empty", async () => {
    const claims = new Map();
    const out = await Reconcile.runReconcile({
      readRegistry: () => ({ schemaVersion: 99, crons: [] }),
      readCronList: async () => "[]",
      coordFactory: async () => makeFakeCoord(claims),
    }, {
      registry: "fake", cronList: null, sessionId: "claude-test",
      ttlMs: 60000, noClaim: false, dryRun: false, db: ":memory:",
    });
    expect(out.result.errors.length).toBeGreaterThan(0);
    expect(out.result.errors[0]).toMatch(/registry-invalid/);
    expect(out.result.plan.creates).toEqual([]);
  });

  it("coord-factory returns null: error surfaced, claim marked not-acquired", async () => {
    const out = await Reconcile.runReconcile({
      readRegistry: () => validRegistry,
      readCronList: async () => "[]",
      coordFactory: async () => null,
    }, {
      registry: "fake", cronList: null, sessionId: "claude-test",
      ttlMs: 60000, noClaim: false, dryRun: false, db: ":memory:",
    });
    expect(out.coord).toBe(null);
    expect(out.result.claim.acquired).toBe(false);
    expect(out.result.errors).toContain("coord-factory-returned-null");
  });

  it("session attribution: sessionId carried into result even with --dry-run", async () => {
    const out = await Reconcile.runReconcile({
      readRegistry: () => validRegistry,
      readCronList: async () => "[]",
      coordFactory: async () => { throw new Error("should-not-be-called"); },
    }, {
      registry: "fake", cronList: null, sessionId: "claude-attrib-test",
      ttlMs: 60000, noClaim: false, dryRun: true,
    });
    expect(out.result.sessionId).toBe("claude-attrib-test");
  });

  it("idempotency: same registry+cron-list snapshot → same plan twice", async () => {
    const fn = async (claims: Map<string, any>) => Reconcile.runReconcile({
      readRegistry: () => validRegistry,
      readCronList: async () => '[{"id":"golf-a","cronExpr":"WRONG","prompt":"Run scripts/golf-a.mjs"}]',
      coordFactory: async () => makeFakeCoord(claims),
    }, {
      registry: "fake", cronList: "fake", sessionId: "claude-X",
      ttlMs: 60000, noClaim: false, dryRun: false, db: ":memory:",
    });
    const r1 = await fn(new Map());
    const r2 = await fn(new Map());
    expect(r1.result.plan).toEqual(r2.result.plan);
    // The plan should contain: delete golf-a (drifted), create golf-a + create golf-b
    expect(r1.result.plan.deletes.length).toBe(1);
    expect(r1.result.plan.creates.length).toBe(2);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// CLI enforcement (subprocess) — P1-B anti-regression for `--session-id`
// ──────────────────────────────────────────────────────────────────────────
describe("CLI session-id enforcement (subprocess)", () => {
  const HELPER_PATH = join(REPO_ROOT, ".claude/helpers/cron-registry-reconcile.mjs");

  it("exits 2 + stderr when --session-id is missing (even with --dry-run)", () => {
    // P1-B: the enforcement lives in main() which the runReconcile-based
    // tests never execute. A subprocess run is the only way to assert the
    // CLI guard still rejects a missing session-id under --dry-run.
    let stderr = "";
    let code = 0;
    try {
      execFileSync(process.execPath, [HELPER_PATH, "--dry-run"], {
        stdio: ["pipe", "pipe", "pipe"],
        // Closed stdin so the helper doesn't block waiting on a TTY pipe.
        input: "",
        timeout: 10_000,
        encoding: "utf8",
      });
    } catch (err: any) {
      code = err.status ?? -1;
      stderr = String(err.stderr ?? "");
    }
    expect(code).toBe(2);
    expect(stderr).toMatch(/--session-id is required/);
  });

  it("exits 2 + stderr when --session-id is missing (even with --no-claim)", () => {
    let stderr = "";
    let code = 0;
    try {
      execFileSync(process.execPath, [HELPER_PATH, "--no-claim"], {
        stdio: ["pipe", "pipe", "pipe"],
        input: "[]",
        timeout: 10_000,
        encoding: "utf8",
      });
    } catch (err: any) {
      code = err.status ?? -1;
      stderr = String(err.stderr ?? "");
    }
    expect(code).toBe(2);
    expect(stderr).toMatch(/--session-id is required/);
  });

  it("exits 2 + stderr on unknown flag", () => {
    let stderr = "";
    let code = 0;
    try {
      execFileSync(process.execPath, [HELPER_PATH, "--bogus"], {
        stdio: ["pipe", "pipe", "pipe"],
        input: "[]",
        timeout: 10_000,
        encoding: "utf8",
      });
    } catch (err: any) {
      code = err.status ?? -1;
      stderr = String(err.stderr ?? "");
    }
    expect(code).toBe(2);
    expect(stderr).toMatch(/unknown flag/);
  });

  it("exits 0 with --help (and writes usage to stderr)", () => {
    // spawnSync (not execFileSync) — we need both stdout AND stderr on the
    // success path, which execFileSync only surfaces on non-zero exit.
    const r = spawnSync(process.execPath, [HELPER_PATH, "--help"], {
      input: "",
      timeout: 10_000,
      encoding: "utf8",
    });
    expect(r.status).toBe(0);
    // Help is printed to stderr per the helper's printHelp() impl.
    const combined = String(r.stdout || "") + String(r.stderr || "");
    expect(combined).toMatch(/Usage:/);
    expect(combined).toMatch(/--registry/);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// __INTERNAL__ exports — pin caps + constants tests can reference
// ──────────────────────────────────────────────────────────────────────────
describe("__INTERNAL__ constants", () => {
  it("exports the claim resource path so other helpers can lock-coordinate", () => {
    expect(Reconcile.__INTERNAL__.CLAIM_RESOURCE).toBe("golf/cron-reconcile");
  });
  it("MIN_TTL_MS is at least 1 minute", () => {
    expect(Reconcile.__INTERNAL__.MIN_TTL_MS).toBeGreaterThanOrEqual(60_000);
  });
  it("MAX_STDIN_BYTES is at least 1 MiB (bounded but room for snapshot)", () => {
    expect(Reconcile.__INTERNAL__.MAX_STDIN_BYTES).toBeGreaterThanOrEqual(1024 * 1024);
  });
  it("SCHEMA_VERSION matches the registry's expected schemaVersion", () => {
    expect(Reconcile.__INTERNAL__.SCHEMA_VERSION).toBe(1);
  });
});

