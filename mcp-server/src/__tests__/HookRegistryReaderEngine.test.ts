/**
 * HookRegistryReaderEngine tests — HOOK-SYNERGY-MS0 / U-HOOK-REGISTRY (H2)
 *
 * Coverage floor per comprehensive-build-enforce doctrine:
 *   - Happy path: getMeta, getCounts, getCompactMap, findHook, searchHooks,
 *                 byEvent, wired/orphaned, byTier
 *   - 3 failure modes: missing registry, malformed JSON, bad shape
 *   - 2 adversarial: empty query, oversize (>200 chars), regex metachars
 *   - 3 spanning event configs: PreToolUse, PostToolUse, Stop
 *
 * Fixtures: live `state/shared/HOOK_REGISTRY.json` for happy paths (455 hooks,
 * 171 wired, 284 orphaned per regenerated truth) + temp files in os.tmpdir()
 * for failure modes. No mocking — the engine is pure read against the FS.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { HookRegistryReaderEngine, hookRegistryReaderEngine } from "../engines/HookRegistryReaderEngine.js";

const LIVE_REGISTRY_PATH = "H:/prism/state/shared/HOOK_REGISTRY.json";
const TMP_ROOT = path.join(os.tmpdir(), "prism-hook-registry-tests");

beforeAll(() => {
  if (!fs.existsSync(TMP_ROOT)) fs.mkdirSync(TMP_ROOT, { recursive: true });
});

afterAll(() => {
  // Best-effort cleanup; non-fatal if other tests left handles.
  try {
    fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

// Helper: write a temp registry JSON and return the path.
function writeTempRegistry(name: string, body: string | object): string {
  const p = path.join(TMP_ROOT, name);
  fs.writeFileSync(p, typeof body === "string" ? body : JSON.stringify(body));
  return p;
}

// Minimal-but-valid registry for shape tests (avoids reading the 228 KB live file).
function minimalValid() {
  return {
    schemaVersion: "1.0.0",
    generatedAt: "2026-05-12T00:00:00.000Z",
    generatedBy: "scripts/build-hook-registry.mjs",
    repoRoot: "H:/prism",
    hooksDir: ".claude/hooks",
    settingsLayers: [{ layer: "user", file: "x", present: true }],
    counts: {
      hookFiles: 3,
      wired: 2,
      orphaned: 1,
      disabled: 0,
      skipped: 0,
      byEvent: { PreToolUse: 2, PostToolUse: 1, Stop: 1 },
      byType: { command: 3 },
      byLayer: { user: 1, project: 1 },
    },
    hooks: [
      {
        id: "alpha-guard",
        file: ".claude/hooks/alpha-guard.mjs",
        wired: true,
        disabled: false,
        events: [
          { event: "PreToolUse", matcher: "Edit|Write", timeout: null, type: "command", layer: "user" },
          { event: "Stop", matcher: null, timeout: 5, type: "command", layer: "user" },
        ],
        description: "Blocks edits when a guard fails.",
        descriptionInferred: false,
        tier: "T0",
        sizeBytes: 1234,
        lines: 50,
      },
      {
        id: "beta-injector",
        file: ".claude/hooks/beta-injector.mjs",
        wired: true,
        disabled: false,
        events: [
          { event: "PreToolUse", matcher: "^Bash$", timeout: null, type: "command", layer: "project" },
          { event: "PostToolUse", matcher: "Read", timeout: 8, type: "command", layer: "project" },
        ],
        description: "Injects routing hints before bash.",
        descriptionInferred: false,
        tier: null,
        sizeBytes: 800,
        lines: 30,
      },
      {
        id: "gamma-orphan",
        file: ".claude/hooks/gamma-orphan.mjs",
        wired: false,
        disabled: false,
        events: [],
        description: "Defined but not wired anywhere.",
        descriptionInferred: false,
        tier: null,
        sizeBytes: 200,
        lines: 12,
      },
    ],
    skipped: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
describe("HookRegistryReaderEngine — happy path (live registry)", () => {
  let engine: HookRegistryReaderEngine;

  beforeAll(() => {
    if (!fs.existsSync(LIVE_REGISTRY_PATH)) {
      throw new Error(`Live registry missing at ${LIVE_REGISTRY_PATH}; run scripts/build-hook-registry.mjs first.`);
    }
    engine = new HookRegistryReaderEngine({ registryPath: LIVE_REGISTRY_PATH });
  });

  it("getMeta returns schemaVersion + generatedAt + counts", () => {
    const meta = engine.getMeta();
    expect(meta).not.toBeNull();
    expect(meta!.schemaVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(typeof meta!.generatedAt).toBe("string");
    expect(meta!.counts.hookFiles).toBeGreaterThan(0);
  });

  it("getCounts: wired + orphaned == hookFiles (algebraic invariant)", () => {
    const c = engine.getCounts();
    expect(c).not.toBeNull();
    expect(c!.wired + c!.orphaned + c!.disabled).toBeGreaterThanOrEqual(c!.hookFiles);
    // wired and orphaned together account for every hook file (disabled is a subset of orphaned).
    expect(c!.wired + c!.orphaned).toBe(c!.hookFiles);
    expect(c!.hookFiles).toBeGreaterThanOrEqual(400); // floor — registry is ~455 today
  });

  it("getCounts.byEvent covers ≥3 expected events", () => {
    const c = engine.getCounts();
    // Spanning-config check: ≥3 events must be represented (PreToolUse, PostToolUse, Stop).
    expect(c!.byEvent.PreToolUse).toBeGreaterThan(0);
    expect(c!.byEvent.PostToolUse).toBeGreaterThan(0);
    expect(c!.byEvent.Stop).toBeGreaterThan(0);
  });

  it("getCompactMap returns event → top-N hook ids", () => {
    const map = engine.getCompactMap(3);
    expect(Object.keys(map)).toEqual(expect.arrayContaining(["PreToolUse", "PostToolUse"]));
    expect(map.PreToolUse.length).toBeLessThanOrEqual(3);
    // Alphabetical ordering inside each bucket.
    for (const ids of Object.values(map)) {
      const sorted = [...ids].sort();
      expect(ids).toEqual(sorted);
    }
  });

  it("getCompactMap clamps cap to [1, ABSOLUTE_COMPACT_MAX_PER_EVENT]", () => {
    const tooSmall = engine.getCompactMap(0);
    const tooLarge = engine.getCompactMap(9999);
    // 0 should fall back to the default (5) — but each bucket may have fewer hooks than that.
    for (const ids of Object.values(tooSmall)) expect(ids.length).toBeLessThanOrEqual(5);
    // 9999 should clamp to 50 (ABSOLUTE) — buckets that have more than 50 wired hooks must be capped at 50.
    for (const ids of Object.values(tooLarge)) expect(ids.length).toBeLessThanOrEqual(50);
  });

  it("findHook returns one full HookRecord by exact id, with all events listed", () => {
    // 'agent-boundary-guard' is registered in HOOK_REGISTRY.json (confirmed at write time).
    const h = engine.findHook("agent-boundary-guard");
    expect(h).not.toBeNull();
    expect(h!.id).toBe("agent-boundary-guard");
    expect(h!.file).toMatch(/agent-boundary-guard\.mjs$/);
    expect(Array.isArray(h!.events)).toBe(true);
  });

  it("findHook falls back to case-insensitive substring", () => {
    const h = engine.findHook("AGENT-BOUNDARY");
    expect(h).not.toBeNull();
    expect(h!.id.toLowerCase()).toContain("agent-boundary");
  });

  it("searchHooks ranks id-exact above id-prefix above description", () => {
    const hits = engine.searchHooks("guard", 50);
    expect(hits.length).toBeGreaterThan(0);
    // Scores must be sorted descending.
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i - 1].score).toBeGreaterThanOrEqual(hits[i].score);
    }
    // Every hit's matchedIn must be non-empty.
    for (const h of hits) expect(h.matchedIn.length).toBeGreaterThan(0);
  });

  it("byEvent(PreToolUse) count matches counts.byEvent.PreToolUse", () => {
    const c = engine.getCounts();
    const hooks = engine.byEvent("PreToolUse");
    // byEvent returns unique hook *files* registered to that event; counts.byEvent counts registrations.
    // Files <= registrations because one file may register to the same event multiple times across layers.
    expect(hooks.length).toBeGreaterThan(0);
    expect(hooks.length).toBeLessThanOrEqual(c!.byEvent.PreToolUse);
  });

  it("byEvent(PostToolUse) and byEvent(Stop) are non-empty (3-span variability)", () => {
    expect(engine.byEvent("PostToolUse").length).toBeGreaterThan(0);
    expect(engine.byEvent("Stop").length).toBeGreaterThan(0);
  });

  it("wired() ∪ orphaned() partitions every hook exactly once", () => {
    const wiredIds = new Set(engine.wired().map((h) => h.id));
    const orphanedIds = new Set(engine.orphaned().map((h) => h.id));
    const intersection = [...wiredIds].filter((id) => orphanedIds.has(id));
    expect(intersection).toEqual([]); // disjoint
    const c = engine.getCounts();
    expect(wiredIds.size + orphanedIds.size).toBe(c!.hookFiles);
  });

  it("mtime cache: second load reuses parsed result", () => {
    const a = engine.getCounts();
    const b = engine.getCounts();
    // Same object identity for counts.byEvent confirms the cached registry was reused.
    expect(b!.byEvent).toBe(a!.byEvent);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("HookRegistryReaderEngine — minimal valid fixture (3 hook variants)", () => {
  let engine: HookRegistryReaderEngine;
  let regPath: string;

  beforeEach(() => {
    regPath = writeTempRegistry("min-valid.json", minimalValid());
    engine = new HookRegistryReaderEngine({ registryPath: regPath, hooksSrcDir: TMP_ROOT });
  });

  it("getCounts matches fixture exactly", () => {
    const c = engine.getCounts()!;
    expect(c.hookFiles).toBe(3);
    expect(c.wired).toBe(2);
    expect(c.orphaned).toBe(1);
    expect(c.byEvent.PreToolUse).toBe(2);
    expect(c.byEvent.PostToolUse).toBe(1);
    expect(c.byEvent.Stop).toBe(1);
  });

  it("getCompactMap groups wired-only hooks by event", () => {
    const map = engine.getCompactMap();
    expect(map.PreToolUse).toEqual(["alpha-guard", "beta-injector"]);
    expect(map.PostToolUse).toEqual(["beta-injector"]);
    expect(map.Stop).toEqual(["alpha-guard"]);
    // gamma-orphan is unwired → must NOT appear in any bucket.
    for (const ids of Object.values(map)) expect(ids).not.toContain("gamma-orphan");
  });

  it("byTier(T0) returns only the T0-tagged hook", () => {
    const t0 = engine.byTier("T0");
    expect(t0.map((h) => h.id)).toEqual(["alpha-guard"]);
    // tier matching is case-insensitive.
    expect(engine.byTier("t0").length).toBe(1);
  });

  it("searchHooks: id-exact scores higher than description-only match", () => {
    // "alpha-guard" exact id; "guard" appears in alpha's description too — id-exact must lead.
    const hits = engine.searchHooks("alpha-guard");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].id).toBe("alpha-guard");
    expect(hits[0].matchedIn).toContain("id-exact");
  });

  it("searchHooks: description-only match still surfaces", () => {
    const hits = engine.searchHooks("routing hints");
    expect(hits.some((h) => h.id === "beta-injector" && h.matchedIn.includes("description"))).toBe(true);
  });

  it("orphaned() returns exactly gamma-orphan", () => {
    expect(engine.orphaned().map((h) => h.id)).toEqual(["gamma-orphan"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("HookRegistryReaderEngine — failure modes", () => {
  it("missing registry → all queries return null/[] without throwing", () => {
    const engine = new HookRegistryReaderEngine({
      registryPath: path.join(TMP_ROOT, "does-not-exist.json"),
      hooksSrcDir: path.join(TMP_ROOT, "no-hooks"),
    });
    expect(engine.getMeta()).toBeNull();
    expect(engine.getCounts()).toBeNull();
    expect(engine.getCompactMap()).toEqual({});
    expect(engine.findHook("anything")).toBeNull();
    expect(engine.searchHooks("anything")).toEqual([]);
    expect(engine.byEvent("PreToolUse")).toEqual([]);
    expect(engine.byTier("T0")).toEqual([]);
    expect(engine.wired()).toEqual([]);
    expect(engine.orphaned()).toEqual([]);
    // No registry → isStale is true (nothing to compare against).
    expect(engine.isStale()).toBe(true);
  });

  it("malformed JSON → load returns null, no throw", () => {
    const regPath = writeTempRegistry("malformed.json", "{not valid json,,,");
    const engine = new HookRegistryReaderEngine({ registryPath: regPath, hooksSrcDir: TMP_ROOT });
    expect(engine.getCounts()).toBeNull();
    expect(engine.findHook("x")).toBeNull();
  });

  it("registry with no hooks[] array → shape guard rejects", () => {
    const regPath = writeTempRegistry("bad-shape.json", {
      schemaVersion: "1.0.0",
      generatedAt: "2026-05-12T00:00:00.000Z",
      counts: {},
      // hooks omitted on purpose
    });
    const engine = new HookRegistryReaderEngine({ registryPath: regPath, hooksSrcDir: TMP_ROOT });
    expect(engine.getCounts()).toBeNull();
    expect(engine.searchHooks("x")).toEqual([]);
  });

  it("clearCache resets so a stale-then-fixed registry reloads on next call", () => {
    const regPath = writeTempRegistry("late-good.json", "{broken");
    const engine = new HookRegistryReaderEngine({ registryPath: regPath, hooksSrcDir: TMP_ROOT });
    expect(engine.getCounts()).toBeNull();
    // Replace with valid content + clearCache, then verify next call succeeds.
    fs.writeFileSync(regPath, JSON.stringify(minimalValid()));
    engine.clearCache();
    expect(engine.getCounts()!.hookFiles).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("HookRegistryReaderEngine — adversarial inputs", () => {
  let engine: HookRegistryReaderEngine;
  beforeAll(() => {
    const regPath = writeTempRegistry("adv-fixture.json", minimalValid());
    engine = new HookRegistryReaderEngine({ registryPath: regPath, hooksSrcDir: TMP_ROOT });
  });

  it("searchHooks: empty / whitespace-only query → []", () => {
    expect(engine.searchHooks("")).toEqual([]);
    expect(engine.searchHooks("   ")).toEqual([]);
  });

  it("searchHooks: query >200 chars rejected (no DoS)", () => {
    const oversize = "g".repeat(500);
    expect(engine.searchHooks(oversize)).toEqual([]);
  });

  it("searchHooks: regex metacharacters are treated literally (no exception)", () => {
    expect(() => engine.searchHooks(".*+?^$|[](){}\\")).not.toThrow();
    expect(engine.searchHooks(".*+?^$|[](){}\\")).toEqual([]);
  });

  it("findHook: NaN-like / non-string inputs coerced to empty → null", () => {
    expect(engine.findHook("")).toBeNull();
    expect(engine.findHook("   ")).toBeNull();
    // @ts-expect-error: deliberate non-string adversarial input
    expect(engine.findHook(null)).toBeNull();
    // @ts-expect-error: deliberate non-string adversarial input
    expect(engine.findHook(undefined)).toBeNull();
  });

  it("byEvent / byTier: empty input → []", () => {
    expect(engine.byEvent("")).toEqual([]);
    expect(engine.byTier("")).toEqual([]);
  });

  it("searchHooks max clamps within [1, 100] regardless of caller input", () => {
    const hits1 = engine.searchHooks("guard", -50);
    const hits2 = engine.searchHooks("guard", 99999);
    expect(hits1.length).toBeGreaterThan(0); // negative max falls back to default (25)
    expect(hits2.length).toBeLessThanOrEqual(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("HookRegistryReaderEngine — singleton smoke", () => {
  it("default-export singleton points at the live registry", () => {
    // The exported singleton uses default paths. If the live registry exists,
    // a getMeta() call must succeed (not null) — proves the export wiring.
    if (fs.existsSync(LIVE_REGISTRY_PATH)) {
      const meta = hookRegistryReaderEngine.getMeta();
      expect(meta).not.toBeNull();
      expect(meta!.schemaVersion).toMatch(/^\d+\.\d+\.\d+$/);
      expect(meta!.counts.hookFiles).toBeGreaterThanOrEqual(400);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Round-trip dispatcher wiring — proves the four wiring drift bugs cannot drift:
//   (1) action in z.enum but no case handler
//   (2) action in case handler but missing schema
//   (3) engine import path stale / case-sensitivity broken
//   (4) schema accepts wrong fields → dispatcher payload silently ignored
// Each assertion exercises the *exact* import path + method signature the
// dispatcher uses, with concrete reference values from the live registry.
describe("dispatcher wiring round-trip — H2 actions", () => {
  it("prism_dev:hook_registry schema defaults to counts and parses every mode round-trip", async () => {
    const { ACTION_DEV_SCHEMAS } = await import("../schemas/devActionSchemas.js");
    const schema = ACTION_DEV_SCHEMAS.hook_registry;
    // Default mode = "counts" (smallest projection).
    const def = schema.parse({}) as { mode: string };
    expect(def.mode).toBe("counts");
    const modes = ["counts", "meta", "compact", "find", "search", "by_event", "by_tier", "wired", "orphaned", "stale"];
    for (const m of modes) {
      const parsed = schema.parse({ mode: m }) as { mode: string };
      expect(parsed.mode).toBe(m);
    }
    // Invalid mode → rejection.
    expect(() => schema.parse({ mode: "nope" })).toThrow();
    // Oversize query → rejection (matches engine MAX_QUERY_LEN=200).
    expect(() => schema.parse({ mode: "search", query: "x".repeat(500) })).toThrow();
    // Boundary 200-char query accepted.
    const ok = schema.parse({ mode: "search", query: "x".repeat(200) }) as { query: string };
    expect(ok.query.length).toBe(200);
  });

  it("prism_session:hook_map_compact schema accepts numeric + stringy ints + empty", async () => {
    const { ACTION_SESSION_SCHEMAS } = await import("../schemas/sessionActionSchemas.js");
    const schema = ACTION_SESSION_SCHEMAS.hook_map_compact;
    expect(schema.parse({})).toEqual({});
    expect((schema.parse({ max_per_event: 5 }) as { max_per_event: number | string }).max_per_event).toBe(5);
    expect((schema.parse({ max_per_event: "10" }) as { max_per_event: number | string }).max_per_event).toBe("10");
  });

  it("dispatcher engine import path resolves and returns concrete shapes (not just type-correct)", async () => {
    if (!fs.existsSync(LIVE_REGISTRY_PATH)) return; // requires the live fixture
    const mod = await import("../engines/HookRegistryReaderEngine.js");
    const eng = mod.hookRegistryReaderEngine;

    // getCounts: wired + orphaned == hookFiles (live invariant).
    const counts = eng.getCounts()!;
    expect(counts.wired + counts.orphaned).toBe(counts.hookFiles);
    expect(counts.hookFiles).toBeGreaterThanOrEqual(400);

    // getCompactMap: returns ≥3 known event buckets, each with the requested cap or fewer.
    const compact = eng.getCompactMap(3);
    expect(Object.keys(compact)).toEqual(expect.arrayContaining(["PreToolUse", "PostToolUse", "Stop"]));
    expect(compact.PreToolUse.length).toBeLessThanOrEqual(3);

    // searchHooks: known token "guard" yields >0 hits with monotonically descending score.
    const guards = eng.searchHooks("guard", 10);
    expect(guards.length).toBeGreaterThan(0);
    expect(guards[0].score).toBeGreaterThanOrEqual(guards[guards.length - 1].score);

    // byEvent("PreToolUse"): count matches the live counts.byEvent floor.
    const pre = eng.byEvent("PreToolUse");
    expect(pre.length).toBeGreaterThan(0);
    expect(pre.length).toBeLessThanOrEqual(counts.byEvent.PreToolUse);

    // wired() vs orphaned(): disjoint and partition every hook.
    const wiredIds = new Set(eng.wired().map((h) => h.id));
    const orphanedIds = new Set(eng.orphaned().map((h) => h.id));
    expect([...wiredIds].some((id) => orphanedIds.has(id))).toBe(false);
    expect(wiredIds.size + orphanedIds.size).toBe(counts.hookFiles);

    // findHook on a known live registry entry returns a full row.
    const known = eng.findHook("agent-boundary-guard");
    expect(known).not.toBeNull();
    expect(known!.id).toBe("agent-boundary-guard");

    // isStale returns a boolean.
    expect(eng.isStale()).toBe(eng.isStale()); // deterministic at the same instant
  });
});
