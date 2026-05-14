/**
 * hook-orphan-scan.test.mjs — verification of CLEANUP-MS0 / U-CLEANUP-H3.
 *
 * Coverage floor:
 *   - happy path
 *   - >= 3 failure modes (missing registry / malformed JSON / non-array hooks)
 *   - >= 2 adversarial inputs (malformed JSONL, oversize firing counts)
 *   - >= 3 spanning variability configs (no-telemetry, telemetry-w-orphans,
 *     all-active w/ tier-mismatch)
 *   - round-trip CLI via main() with real file I/O
 *
 * Real reference values — no toBeDefined() / toBeUndefined() stubs.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  parseArgs,
  parseJsonl,
  buildFiringMap,
  canonicalHookId,
  classifyHook,
  buildReport,
  renderMarkdown,
  main,
  ISSUE,
  _internals,
} from "../hook-orphan-scan.mjs";

const NOW = "2026-05-14T00:00:00.000Z";
const NOW_MS = Date.parse(NOW);
const ONE_DAY = 24 * 60 * 60 * 1000;

// ──────────────────────────────────────────────────────────────────────
// fixture helpers
// ──────────────────────────────────────────────────────────────────────

function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), "hook-orphan-"));
  mkdirSync(join(root, "state/shared"), { recursive: true });
  return root;
}

function writeRegistry(root, body) {
  writeFileSync(
    join(root, "state/shared/HOOK_REGISTRY.json"),
    JSON.stringify(body),
    "utf-8",
  );
}

function writeJsonl(root, name, rows) {
  writeFileSync(
    join(root, `state/shared/${name}`),
    rows.map((r) => JSON.stringify(r)).join("\n"),
    "utf-8",
  );
}

function makeHook(id, opts = {}) {
  // Use `in` checks for tier/events/wired so callers can pass null/false/[]
  // explicitly without nullish-coalesce silently overriding them.
  return {
    id,
    file: opts.file ?? `.claude/hooks/${id}.mjs`,
    wired: "wired" in opts ? opts.wired : true,
    disabled: opts.disabled ?? false,
    events: "events" in opts ? opts.events : ["PreToolUse"],
    tier: "tier" in opts ? opts.tier : "T2",
    sizeBytes: 500,
    lines: 30,
  };
}

// ──────────────────────────────────────────────────────────────────────
// parseArgs
// ──────────────────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("defaults", () => {
    const a = parseArgs([]);
    expect(a.json).toBe(false);
    expect(a.windowDays).toBe(_internals.DEFAULT_WINDOW_DAYS);
    expect(a.registryPath).toBe(null);
    expect(a.latencyPath).toBe(null);
    expect(a.asyncPath).toBe(null);
  });

  it("all flags", () => {
    const a = parseArgs([
      "--json",
      "--window-days", "14",
      "--frozen-time", NOW,
      "--registry", "/r",
      "--latency", "/l",
      "--async", "/a",
      "--out-md", "/md",
      "--out-json", "/json",
    ]);
    expect(a.json).toBe(true);
    expect(a.windowDays).toBe(14);
    expect(a.frozenTime).toBe(NOW);
    expect(a.registryPath).toBe("/r");
    expect(a.latencyPath).toBe("/l");
    expect(a.asyncPath).toBe("/a");
  });

  it("--help / -h alias", () => {
    expect(parseArgs(["--help"]).help).toBe(true);
    expect(parseArgs(["-h"]).help).toBe(true);
  });

  it("--window-days rejects garbage values", () => {
    expect(parseArgs(["--window-days", "abc"]).windowDays).toBe(_internals.DEFAULT_WINDOW_DAYS);
    expect(parseArgs(["--window-days", "-5"]).windowDays).toBe(_internals.DEFAULT_WINDOW_DAYS);
    expect(parseArgs(["--window-days", "0"]).windowDays).toBe(_internals.DEFAULT_WINDOW_DAYS);
    expect(parseArgs(["--window-days", "21"]).windowDays).toBe(21);
  });
});

// ──────────────────────────────────────────────────────────────────────
// canonicalHookId
// ──────────────────────────────────────────────────────────────────────

describe("canonicalHookId", () => {
  it("strips path + extension", () => {
    expect(canonicalHookId("H:/prism/.claude/hooks/foo.mjs")).toBe("foo");
    expect(canonicalHookId(".claude/hooks/foo.mjs")).toBe("foo");
    expect(canonicalHookId("foo.mjs")).toBe("foo");
    expect(canonicalHookId("foo")).toBe("foo");
  });

  it("handles backslashes (Windows)", () => {
    expect(canonicalHookId(".claude\\hooks\\foo.mjs")).toBe("foo");
  });

  it("handles .js / .cjs", () => {
    expect(canonicalHookId("foo.js")).toBe("foo");
    expect(canonicalHookId("foo.cjs")).toBe("foo");
  });

  it("returns null for empty / non-string", () => {
    expect(canonicalHookId("")).toBe(null);
    expect(canonicalHookId(null)).toBe(null);
    expect(canonicalHookId(undefined)).toBe(null);
    expect(canonicalHookId(123)).toBe(null);
  });
});

// ──────────────────────────────────────────────────────────────────────
// parseJsonl
// ──────────────────────────────────────────────────────────────────────

describe("parseJsonl", () => {
  it("parses one-per-line JSON", () => {
    const out = parseJsonl(`{"a":1}\n{"b":2}\n{"c":3}`);
    expect(out).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  });

  it("skips malformed lines without crashing", () => {
    const out = parseJsonl(`{"ok":1}\n{not-json\n{"ok":2}\n\n`);
    expect(out).toEqual([{ ok: 1 }, { ok: 2 }]);
  });

  it("handles \\r\\n line endings", () => {
    const out = parseJsonl(`{"a":1}\r\n{"b":2}\r\n`);
    expect(out).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("empty string → empty array", () => {
    expect(parseJsonl("")).toEqual([]);
    expect(parseJsonl(null)).toEqual([]);
    expect(parseJsonl(undefined)).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────
// buildFiringMap
// ──────────────────────────────────────────────────────────────────────

describe("buildFiringMap", () => {
  it("aggregates fireCount + tracks lastFiredMs + blockCount", () => {
    const t1 = NOW_MS - 5 * ONE_DAY;
    const t2 = NOW_MS - 2 * ONE_DAY;
    const latencyEntries = [
      { ts: new Date(t1).toISOString(), hook: "foo", exitCode: 0 },
      { ts: new Date(t2).toISOString(), hook: "foo", exitCode: 1 }, // block
    ];
    const asyncEntries = [
      { ts: new Date(t1).toISOString(), hook: "bar", exitCode: 0 },
    ];
    const map = buildFiringMap({
      latencyEntries,
      asyncEntries,
      windowStartMs: NOW_MS - 30 * ONE_DAY,
    });
    expect(map.get("foo")).toEqual({ lastFiredMs: t2, fireCount: 2, blockCount: 1 });
    expect(map.get("bar")).toEqual({ lastFiredMs: t1, fireCount: 1, blockCount: 0 });
  });

  it("drops entries older than the window", () => {
    const old = NOW_MS - 120 * ONE_DAY;
    const map = buildFiringMap({
      latencyEntries: [{ ts: new Date(old).toISOString(), hook: "stale", exitCode: 0 }],
      asyncEntries: [],
      windowStartMs: NOW_MS - 30 * ONE_DAY,
    });
    expect(map.has("stale")).toBe(false);
  });

  it("accepts numeric ms ts", () => {
    const t = NOW_MS - ONE_DAY;
    const map = buildFiringMap({
      latencyEntries: [{ ts: t, hook: "numeric", exitCode: 0 }],
      asyncEntries: [],
      windowStartMs: NOW_MS - 30 * ONE_DAY,
    });
    expect(map.get("numeric")?.fireCount).toBe(1);
  });

  it("ignores entries with no hook name", () => {
    const map = buildFiringMap({
      latencyEntries: [
        { ts: NOW_MS - ONE_DAY, hook: "", exitCode: 0 },
        { ts: NOW_MS - ONE_DAY, exitCode: 0 },
      ],
      asyncEntries: [],
      windowStartMs: NOW_MS - 30 * ONE_DAY,
    });
    expect(map.size).toBe(0);
  });

  it("canonicalizes file-path hooks before bumping", () => {
    const map = buildFiringMap({
      latencyEntries: [
        { ts: NOW_MS - ONE_DAY, hook: ".claude/hooks/foo.mjs", exitCode: 0 },
        { ts: NOW_MS - 2 * ONE_DAY, hook: "foo", exitCode: 0 },
      ],
      asyncEntries: [],
      windowStartMs: NOW_MS - 30 * ONE_DAY,
    });
    expect(map.get("foo")?.fireCount).toBe(2);
  });
});

// ──────────────────────────────────────────────────────────────────────
// classifyHook
// ──────────────────────────────────────────────────────────────────────

describe("classifyHook", () => {
  it("wired + telemetry + 0 firings → dormant_30d", () => {
    const c = classifyHook({
      hook: makeHook("foo", { wired: true, tier: "T2", events: ["PreToolUse"] }),
      firingMap: new Map(),
      hasTelemetry: true,
      windowDays: 30,
      nowIso: NOW,
    });
    expect(c.issues).toContain(ISSUE.DORMANT_30D);
    expect(c.issues).not.toContain(ISSUE.NO_TELEMETRY);
  });

  it("wired + no telemetry → no_telemetry (NOT dormant)", () => {
    const c = classifyHook({
      hook: makeHook("foo", { wired: true, tier: "T2" }),
      firingMap: new Map(),
      hasTelemetry: false,
      windowDays: 30,
      nowIso: NOW,
    });
    expect(c.issues).toContain(ISSUE.NO_TELEMETRY);
    expect(c.issues).not.toContain(ISSUE.DORMANT_30D);
  });

  it("wired:false + not disabled → orphan_file", () => {
    const c = classifyHook({
      hook: makeHook("foo", { wired: false, tier: "T3" }),
      firingMap: new Map(),
      hasTelemetry: false,
      windowDays: 30,
      nowIso: NOW,
    });
    expect(c.issues).toContain(ISSUE.ORPHAN_FILE);
  });

  it("wired:false + disabled → NOT orphan (operator intentionally disabled)", () => {
    const c = classifyHook({
      hook: makeHook("foo", { wired: false, disabled: true, tier: "T3" }),
      firingMap: new Map(),
      hasTelemetry: false,
      windowDays: 30,
      nowIso: NOW,
    });
    expect(c.issues).not.toContain(ISSUE.ORPHAN_FILE);
  });

  it("T0 + telemetry + firings>0 + blocks==0 → tier_mismatch", () => {
    const fm = new Map();
    fm.set("foo", { lastFiredMs: NOW_MS - ONE_DAY, fireCount: 100, blockCount: 0 });
    const c = classifyHook({
      hook: makeHook("foo", { wired: true, tier: "T0" }),
      firingMap: fm,
      hasTelemetry: true,
      windowDays: 30,
      nowIso: NOW,
    });
    expect(c.issues).toContain(ISSUE.TIER_MISMATCH);
  });

  it("T0 + blocks>0 → no tier_mismatch", () => {
    const fm = new Map();
    fm.set("foo", { lastFiredMs: NOW_MS - ONE_DAY, fireCount: 100, blockCount: 5 });
    const c = classifyHook({
      hook: makeHook("foo", { wired: true, tier: "T0" }),
      firingMap: fm,
      hasTelemetry: true,
      windowDays: 30,
      nowIso: NOW,
    });
    expect(c.issues).not.toContain(ISSUE.TIER_MISMATCH);
  });

  it("missing tier frontmatter → missing_tier", () => {
    const c = classifyHook({
      hook: makeHook("foo", { wired: true, tier: null }),
      firingMap: new Map(),
      hasTelemetry: false,
      windowDays: 30,
      nowIso: NOW,
    });
    expect(c.issues).toContain(ISSUE.MISSING_TIER);
  });

  it("wired + events empty → missing_event", () => {
    const c = classifyHook({
      hook: makeHook("foo", { wired: true, events: [] }),
      firingMap: new Map(),
      hasTelemetry: false,
      windowDays: 30,
      nowIso: NOW,
    });
    expect(c.issues).toContain(ISSUE.MISSING_EVENT);
  });

  it("lastFiredIso + ageDays populated when firingMap has entry", () => {
    const fm = new Map();
    fm.set("foo", { lastFiredMs: NOW_MS - 5 * ONE_DAY, fireCount: 7, blockCount: 0 });
    const c = classifyHook({
      hook: makeHook("foo", { wired: true, tier: "T2" }),
      firingMap: fm,
      hasTelemetry: true,
      windowDays: 30,
      nowIso: NOW,
    });
    expect(c.firings).toBe(7);
    expect(c.lastFiredIso).toBe(new Date(NOW_MS - 5 * ONE_DAY).toISOString());
    expect(c.ageDays).toBe(5);
  });
});

// ──────────────────────────────────────────────────────────────────────
// buildReport — spanning variability
// ──────────────────────────────────────────────────────────────────────

describe("buildReport — variability cohorts", () => {
  // Cohort 1 of 3 — no telemetry: dormant detection skipped
  it("no-telemetry cohort surfaces orphan but not dormant", () => {
    const cs = [
      classifyHook({
        hook: makeHook("orphaned", { wired: false }),
        firingMap: new Map(),
        hasTelemetry: false,
        windowDays: 30,
        nowIso: NOW,
      }),
      classifyHook({
        hook: makeHook("wired-no-fires", { wired: true, tier: "T2" }),
        firingMap: new Map(),
        hasTelemetry: false,
        windowDays: 30,
        nowIso: NOW,
      }),
    ];
    const r = buildReport({
      classifiedHooks: cs,
      registry: { hooks: [] },
      hasTelemetry: false,
      windowDays: 30,
      nowIso: NOW,
      telemetryCounts: { latencyEntries: 0, asyncEntries: 0 },
    });
    expect(r.issueCounts.orphan_file).toBe(1);
    expect(r.issueCounts.dormant_30d).toBe(0); // skipped without telemetry
    expect(r.issueCounts.no_telemetry).toBe(1);
    expect(r.notes.some((n) => n.includes("telemetry"))).toBe(true);
  });

  // Cohort 2 of 3 — telemetry present, mixed: orphans + dormant + active
  it("telemetry-with-orphans cohort produces all categories", () => {
    const fm = new Map();
    fm.set("active", { lastFiredMs: NOW_MS - ONE_DAY, fireCount: 50, blockCount: 0 });
    const cs = [
      classifyHook({
        hook: makeHook("orphaned", { wired: false }),
        firingMap: fm,
        hasTelemetry: true,
        windowDays: 30,
        nowIso: NOW,
      }),
      classifyHook({
        hook: makeHook("dormant", { wired: true, tier: "T2" }),
        firingMap: fm,
        hasTelemetry: true,
        windowDays: 30,
        nowIso: NOW,
      }),
      classifyHook({
        hook: makeHook("active", { wired: true, tier: "T2" }),
        firingMap: fm,
        hasTelemetry: true,
        windowDays: 30,
        nowIso: NOW,
      }),
    ];
    const r = buildReport({
      classifiedHooks: cs,
      registry: { hooks: [] },
      hasTelemetry: true,
      windowDays: 30,
      nowIso: NOW,
      telemetryCounts: { latencyEntries: 50, asyncEntries: 0 },
    });
    expect(r.issueCounts.orphan_file).toBe(1);
    expect(r.issueCounts.dormant_30d).toBe(1);
    expect(r.issueCounts.no_telemetry).toBe(0);
  });

  // Cohort 3 of 3 — telemetry present, tier-mismatch surfaced
  it("tier-mismatch cohort surfaces T0 hooks without blocks", () => {
    const fm = new Map();
    fm.set("t0-no-blocks", { lastFiredMs: NOW_MS - ONE_DAY, fireCount: 200, blockCount: 0 });
    fm.set("t0-with-blocks", { lastFiredMs: NOW_MS - ONE_DAY, fireCount: 50, blockCount: 12 });
    const cs = [
      classifyHook({
        hook: makeHook("t0-no-blocks", { wired: true, tier: "T0" }),
        firingMap: fm,
        hasTelemetry: true,
        windowDays: 30,
        nowIso: NOW,
      }),
      classifyHook({
        hook: makeHook("t0-with-blocks", { wired: true, tier: "T0" }),
        firingMap: fm,
        hasTelemetry: true,
        windowDays: 30,
        nowIso: NOW,
      }),
    ];
    const r = buildReport({
      classifiedHooks: cs,
      registry: { hooks: [] },
      hasTelemetry: true,
      windowDays: 30,
      nowIso: NOW,
      telemetryCounts: { latencyEntries: 250, asyncEntries: 0 },
    });
    expect(r.issueCounts.tier_mismatch).toBe(1);
    expect(r.tierMismatch[0].id).toBe("t0-no-blocks");
  });
});

// ──────────────────────────────────────────────────────────────────────
// renderMarkdown
// ──────────────────────────────────────────────────────────────────────

describe("renderMarkdown", () => {
  it("renders telemetry availability + counts", () => {
    const r = buildReport({
      classifiedHooks: [],
      registry: { hooks: [] },
      hasTelemetry: true,
      windowDays: 30,
      nowIso: NOW,
      telemetryCounts: { latencyEntries: 42, asyncEntries: 7 },
    });
    const md = renderMarkdown(r);
    expect(md).toContain("# Hook Utilization Audit");
    expect(md).toContain("AVAILABLE");
    expect(md).toContain("(latency=42, async=7)");
    expect(md).toContain("CLEANUP-MS0 / U-CLEANUP-H3");
  });

  it("skips dormant + tier-mismatch sections when telemetry absent", () => {
    const r = buildReport({
      classifiedHooks: [],
      registry: { hooks: [] },
      hasTelemetry: false,
      windowDays: 30,
      nowIso: NOW,
      telemetryCounts: { latencyEntries: 0, asyncEntries: 0 },
    });
    const md = renderMarkdown(r);
    expect(md).toContain("ABSENT");
    expect(md).toContain("telemetry absent — dormant detection skipped");
    expect(md).toContain("telemetry absent — tier-mismatch detection skipped");
  });

  it("orphan section shows top-25 sorted by id", () => {
    const cs = [];
    for (let i = 99; i >= 0; i--) {
      const id = `hook${String(i).padStart(2, "0")}`;
      cs.push(
        classifyHook({
          hook: makeHook(id, { wired: false }),
          firingMap: new Map(),
          hasTelemetry: false,
          windowDays: 30,
          nowIso: NOW,
        }),
      );
    }
    const r = buildReport({
      classifiedHooks: cs,
      registry: { hooks: [] },
      hasTelemetry: false,
      windowDays: 30,
      nowIso: NOW,
      telemetryCounts: { latencyEntries: 0, asyncEntries: 0 },
    });
    const md = renderMarkdown(r);
    // Show only top 25 — hook00 .. hook24 present, hook25+ absent
    expect(md).toContain("hook00 ");
    expect(md).toContain("hook24 ");
    expect(md).not.toContain("hook25 ");
  });
});

// ──────────────────────────────────────────────────────────────────────
// main — round-trip CLI
// ──────────────────────────────────────────────────────────────────────

describe("main (round-trip)", () => {
  let root;
  let logs;
  let errs;

  beforeEach(() => {
    root = makeRepo();
    logs = [];
    errs = [];
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it("writes report from registry only (no telemetry)", async () => {
    writeRegistry(root, {
      schemaVersion: "1.0.0",
      generatedAt: NOW,
      counts: { hookFiles: 3, wired: 2 },
      hooks: [
        makeHook("alpha", { wired: true, tier: "T0", events: ["PreToolUse"] }),
        makeHook("beta", { wired: true, tier: "T2", events: ["UserPromptSubmit"] }),
        makeHook("gamma-orphan", { wired: false, tier: "T3", events: [] }),
      ],
    });
    const res = await main({
      argv: ["--frozen-time", NOW],
      repo: root,
      out: (...a) => logs.push(a.join(" ")),
      err: () => {},
    });
    expect(res.exitCode).toBe(0);

    const js = JSON.parse(
      readFileSync(join(root, "state/shared/HOOK_UTILIZATION_REPORT.json"), "utf-8"),
    );
    expect(js.schemaVersion).toBe(1);
    expect(js.hasTelemetry).toBe(false);
    expect(js.totals.hooks).toBe(3);
    expect(js.totals.wired).toBe(2);
    expect(js.issueCounts.orphan_file).toBe(1);
    expect(js.issueCounts.no_telemetry).toBe(2);
    expect(js.issueCounts.dormant_30d).toBe(0);

    const md = readFileSync(join(root, "state/shared/HOOK_UTILIZATION_REPORT.md"), "utf-8");
    expect(md).toContain("gamma-orphan");
    expect(md).toContain("ABSENT");
  });

  it("writes report combining registry + telemetry", async () => {
    const t1 = NOW_MS - 5 * ONE_DAY;
    writeRegistry(root, {
      hooks: [
        makeHook("alpha", { wired: true, tier: "T0", events: ["PreToolUse"] }),
        makeHook("beta", { wired: true, tier: "T2", events: ["PreToolUse"] }),
      ],
    });
    writeJsonl(root, "hook-latency.jsonl", [
      { ts: new Date(t1).toISOString(), hook: "alpha", exitCode: 0 },
      { ts: new Date(t1).toISOString(), hook: "alpha", exitCode: 1 }, // block
    ]);
    writeJsonl(root, "async-hook-results.jsonl", [
      { ts: new Date(t1).toISOString(), hook: "beta", exitCode: 0 },
    ]);

    const res = await main({
      argv: ["--frozen-time", NOW],
      repo: root,
      out: (...a) => logs.push(a.join(" ")),
      err: () => {},
    });
    expect(res.exitCode).toBe(0);
    const js = JSON.parse(
      readFileSync(join(root, "state/shared/HOOK_UTILIZATION_REPORT.json"), "utf-8"),
    );
    expect(js.hasTelemetry).toBe(true);
    expect(js.telemetryCounts.latencyEntries).toBe(2);
    expect(js.telemetryCounts.asyncEntries).toBe(1);
    expect(js.issueCounts.dormant_30d).toBe(0); // both fired
    expect(js.issueCounts.tier_mismatch).toBe(0); // alpha fired AND had a block
  });

  it("--json writes nothing + emits JSON to stdout", async () => {
    writeRegistry(root, { hooks: [] });
    const res = await main({
      argv: ["--json", "--frozen-time", NOW],
      repo: root,
      out: (...a) => logs.push(a.join(" ")),
      err: () => {},
    });
    expect(res.exitCode).toBe(0);
    expect(existsSync(join(root, "state/shared/HOOK_UTILIZATION_REPORT.md"))).toBe(false);
    expect(existsSync(join(root, "state/shared/HOOK_UTILIZATION_REPORT.json"))).toBe(false);
    const parsed = JSON.parse(logs.join("\n"));
    expect(parsed.schemaVersion).toBe(1);
  });

  it("--help short-circuits", async () => {
    writeRegistry(root, { hooks: [] });
    const res = await main({
      argv: ["--help"],
      repo: root,
      out: (...a) => logs.push(a.join(" ")),
      err: () => {},
    });
    expect(res.exitCode).toBe(0);
    expect(logs.join("\n")).toContain("Hook utilization audit");
  });

  it("fatal when registry missing", async () => {
    const res = await main({
      argv: ["--frozen-time", NOW],
      repo: root,
      out: () => {},
      err: (...a) => errs.push(a.join(" ")),
    });
    expect(res.exitCode).toBe(1);
    expect(errs.join("\n")).toMatch(/FATAL.*HOOK_REGISTRY/);
  });

  it("malformed registry JSON → exit 1", async () => {
    writeFileSync(join(root, "state/shared/HOOK_REGISTRY.json"), "{not-json", "utf-8");
    const res = await main({
      argv: ["--frozen-time", NOW],
      repo: root,
      out: () => {},
      err: (...a) => errs.push(a.join(" ")),
    });
    expect(res.exitCode).toBe(1);
  });

  it("registry.hooks not array → empty classification (graceful)", async () => {
    writeRegistry(root, { hooks: "not-an-array" });
    const res = await main({
      argv: ["--frozen-time", NOW],
      repo: root,
      out: () => {},
      err: () => {},
    });
    expect(res.exitCode).toBe(0);
    const js = JSON.parse(
      readFileSync(join(root, "state/shared/HOOK_UTILIZATION_REPORT.json"), "utf-8"),
    );
    expect(js.totals.hooks).toBe(0);
  });

  it("malformed JSONL lines are skipped — telemetry survives", async () => {
    const t1 = NOW_MS - ONE_DAY;
    writeRegistry(root, {
      hooks: [makeHook("alpha", { wired: true, tier: "T2" })],
    });
    writeFileSync(
      join(root, "state/shared/hook-latency.jsonl"),
      `{"ts":"${new Date(t1).toISOString()}","hook":"alpha","exitCode":0}\n{not-json\n`,
      "utf-8",
    );
    const res = await main({
      argv: ["--frozen-time", NOW],
      repo: root,
      out: () => {},
      err: () => {},
    });
    expect(res.exitCode).toBe(0);
    const js = JSON.parse(
      readFileSync(join(root, "state/shared/HOOK_UTILIZATION_REPORT.json"), "utf-8"),
    );
    expect(js.telemetryCounts.latencyEntries).toBe(1);
    expect(js.issueCounts.dormant_30d).toBe(0);
  });

  it("--window-days override propagates", async () => {
    const t1 = NOW_MS - 10 * ONE_DAY;
    writeRegistry(root, {
      hooks: [makeHook("alpha", { wired: true, tier: "T2" })],
    });
    writeJsonl(root, "hook-latency.jsonl", [
      { ts: new Date(t1).toISOString(), hook: "alpha", exitCode: 0 },
    ]);
    // Default 30d window → alpha fired within window → 0 dormant
    // 5d window → alpha (10d ago) is outside → dormant
    const res = await main({
      argv: ["--frozen-time", NOW, "--window-days", "5"],
      repo: root,
      out: () => {},
      err: () => {},
    });
    expect(res.exitCode).toBe(0);
    const js = JSON.parse(
      readFileSync(join(root, "state/shared/HOOK_UTILIZATION_REPORT.json"), "utf-8"),
    );
    expect(js.windowDays).toBe(5);
    expect(js.issueCounts.dormant_30d).toBe(1);
  });

  it("idempotent: re-running with same inputs produces identical files", async () => {
    writeRegistry(root, {
      hooks: [makeHook("alpha", { wired: true, tier: "T2" })],
    });
    await main({ argv: ["--frozen-time", NOW], repo: root, out: () => {}, err: () => {} });
    const md1 = readFileSync(join(root, "state/shared/HOOK_UTILIZATION_REPORT.md"), "utf-8");
    const js1 = readFileSync(join(root, "state/shared/HOOK_UTILIZATION_REPORT.json"), "utf-8");
    await main({ argv: ["--frozen-time", NOW], repo: root, out: () => {}, err: () => {} });
    const md2 = readFileSync(join(root, "state/shared/HOOK_UTILIZATION_REPORT.md"), "utf-8");
    const js2 = readFileSync(join(root, "state/shared/HOOK_UTILIZATION_REPORT.json"), "utf-8");
    expect(md1).toBe(md2);
    expect(js1).toBe(js2);
  });
});
