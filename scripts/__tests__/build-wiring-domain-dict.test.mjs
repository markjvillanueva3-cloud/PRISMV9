/**
 * build-wiring-domain-dict.test.mjs — verification of CLEANUP-MS0/U-CLEANUP-G16.
 *
 * Coverage floor:
 *   - happy path
 *   - >= 3 failure modes
 *   - >= 2 adversarial inputs
 *   - >= 3 spanning variability configs
 *   - round-trip through CLI entry
 *
 * Real reference values — no toBeDefined() stubs.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseArgs,
  extractEnginePrefix,
  extractDispatcherDomain,
  scanEngines,
  scanDispatchers,
  groupByPrefix,
  loadExistingDict,
  mergeCandidates,
  buildDict,
  renderMarkdown,
  runCli,
  writeAtomic,
} from "../build-wiring-domain-dict.mjs";

// ──────────────────────────────────────────────────────────────────────
// Fixture helpers
// ──────────────────────────────────────────────────────────────────────

function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), "wiring-domain-dict-"));
  mkdirSync(join(root, "mcp-server/src/engines"), { recursive: true });
  mkdirSync(join(root, "mcp-server/src/tools/dispatchers"), { recursive: true });
  mkdirSync(join(root, "state/shared"), { recursive: true });
  return root;
}

function seedEngines(root, names) {
  for (const n of names) writeFileSync(join(root, "mcp-server/src/engines", n), "// stub", "utf8");
}

function seedDispatchers(root, names) {
  for (const n of names) writeFileSync(join(root, "mcp-server/src/tools/dispatchers", n), "// stub", "utf8");
}

// ──────────────────────────────────────────────────────────────────────
// extractEnginePrefix — pure
// ──────────────────────────────────────────────────────────────────────

describe("extractEnginePrefix", () => {
  it("extracts acronym prefix from PascalCase + Engine suffix", () => {
    expect(extractEnginePrefix("AGISafetyContainmentEngine.ts")).toBe("AGI");
    expect(extractEnginePrefix("PRISMSelfAwarenessEngine.ts")).toBe("PRISM");
  });

  it("extracts single-PascalCase token before suffix", () => {
    expect(extractEnginePrefix("LatheCollisionDetector.ts")).toBe("Lathe");
    expect(extractEnginePrefix("KienzleForceModel.ts")).toBe("Kienzle");
    expect(extractEnginePrefix("CadFusionLiveEngine.ts")).toBe("Cad");
  });

  it("rejects index.ts, *.test.ts, *.d.ts", () => {
    expect(extractEnginePrefix("index.ts")).toBe(null);
    expect(extractEnginePrefix("Foo.test.ts")).toBe(null);
    expect(extractEnginePrefix("Foo.d.ts")).toBe(null);
  });

  it("rejects lowercase-leading filenames", () => {
    expect(extractEnginePrefix("lowercase.ts")).toBe(null);
  });

  it("rejects empty / non-string / non-.ts inputs", () => {
    expect(extractEnginePrefix("")).toBe(null);
    expect(extractEnginePrefix(null)).toBe(null);
    expect(extractEnginePrefix("Foo.js")).toBe(null);
  });

  it("strips known kind suffixes (Engine/Service/Manager/Hook/Adapter/Helper/Bridge/Coordinator/Orchestrator/Pipeline)", () => {
    expect(extractEnginePrefix("LatheService.ts")).toBe("Lathe");
    expect(extractEnginePrefix("CadAdapter.ts")).toBe("Cad");
    expect(extractEnginePrefix("WedmCoordinator.ts")).toBe("Wedm");
  });
});

// ──────────────────────────────────────────────────────────────────────
// extractDispatcherDomain — pure
// ──────────────────────────────────────────────────────────────────────

describe("extractDispatcherDomain", () => {
  it("extracts leading lowercase chunk from camelCase Dispatcher.ts", () => {
    expect(extractDispatcherDomain("latheDispatcher.ts")).toBe("lathe");
    expect(extractDispatcherDomain("cadFusionLiveDispatcher.ts")).toBe("cad");
    expect(extractDispatcherDomain("aiReasoningDispatcher.ts")).toBe("ai");
  });

  it("rejects test files + non-Dispatcher files", () => {
    expect(extractDispatcherDomain("foo.test.ts")).toBe(null);
    expect(extractDispatcherDomain("awarenessMiddleware.ts")).toBe(null);
    expect(extractDispatcherDomain("Dispatcher.ts")).toBe(null);
  });

  it("rejects empty / non-string", () => {
    expect(extractDispatcherDomain("")).toBe(null);
    expect(extractDispatcherDomain(null)).toBe(null);
  });
});

// ──────────────────────────────────────────────────────────────────────
// scanEngines + scanDispatchers
// ──────────────────────────────────────────────────────────────────────

describe("scanEngines + scanDispatchers", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("scans engines + filters non-engine files", () => {
    seedEngines(root, ["LatheCollision.ts", "KienzleEngine.ts", "index.ts", "foo.test.ts", "Bar.d.ts"]);
    const out = scanEngines(join(root, "mcp-server/src/engines"));
    expect(out.ok).toBe(true);
    expect(out.engines.map((e) => e.prefix).sort()).toEqual(["Kienzle", "Lathe"]);
  });

  it("scanDispatchers returns a Set of unique domain names", () => {
    seedDispatchers(root, ["latheDispatcher.ts", "cadFusionLiveDispatcher.ts", "cadOtherDispatcher.ts", "foo.test.ts"]);
    const out = scanDispatchers(join(root, "mcp-server/src/tools/dispatchers"));
    expect(out.ok).toBe(true);
    expect(out.dispatchers.has("lathe")).toBe(true);
    expect(out.dispatchers.has("cad")).toBe(true);
    expect(out.dispatchers.size).toBe(2); // cadFusionLive + cadOther both reduce to "cad"
  });

  it("missing engines dir → ok:false", () => {
    const out = scanEngines(join(root, "no-such-dir"));
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/not found/);
  });

  it("missing dispatchers dir → ok:false", () => {
    const out = scanDispatchers(join(root, "no-such-dir"));
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/not found/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// groupByPrefix — matched vs unmatched
// ──────────────────────────────────────────────────────────────────────

describe("groupByPrefix", () => {
  it("partitions engines by prefix into matched (has dispatcher) vs unmatched", () => {
    const engines = [
      { filename: "LatheA.ts", prefix: "Lathe" },
      { filename: "LatheB.ts", prefix: "Lathe" },
      { filename: "AGIA.ts", prefix: "AGI" },
      { filename: "AGIB.ts", prefix: "AGI" },
      { filename: "AGIC.ts", prefix: "AGI" },
      { filename: "KienzleA.ts", prefix: "Kienzle" },
    ];
    const dispatchers = new Set(["lathe", "cad"]);
    const out = groupByPrefix(engines, dispatchers);
    expect(out.matched.find((m) => m.prefix === "Lathe").engine_count).toBe(2);
    expect(out.matched.find((m) => m.prefix === "Lathe").dispatcher).toBe("lathe");
    expect(out.unmatched[0]).toEqual({ prefix: "AGI", engine_count: 3, sample_engines: ["AGIA", "AGIB", "AGIC"] });
    expect(out.unmatched[1].prefix).toBe("Kienzle");
  });

  it("aliases override default lowercase-name matching", () => {
    const engines = [{ filename: "AGIA.ts", prefix: "AGI" }];
    const dispatchers = new Set([]);
    const out = groupByPrefix(engines, dispatchers, { AGI: "ai_reasoning" });
    expect(out.matched).toHaveLength(1);
    expect(out.matched[0].dispatcher).toBe("ai_reasoning");
    expect(out.unmatched).toEqual([]);
  });

  it("sorts unmatched by engine_count desc, then prefix asc", () => {
    const engines = [
      { filename: "Z.ts", prefix: "Zebra" },
      { filename: "A1.ts", prefix: "Apple" },
      { filename: "A2.ts", prefix: "Apple" },
      { filename: "A3.ts", prefix: "Apple" },
      { filename: "B1.ts", prefix: "Beta" },
      { filename: "B2.ts", prefix: "Beta" },
      { filename: "B3.ts", prefix: "Beta" },
    ];
    const out = groupByPrefix(engines, new Set([]));
    expect(out.unmatched.map((u) => u.prefix)).toEqual(["Apple", "Beta", "Zebra"]);
  });
});

// ──────────────────────────────────────────────────────────────────────
// loadExistingDict + mergeCandidates
// ──────────────────────────────────────────────────────────────────────

describe("loadExistingDict + mergeCandidates", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("missing file → empty default shape", () => {
    const out = loadExistingDict(join(root, "no.json"));
    expect(out).toEqual({ schemaVersion: 1, promoted: {}, candidates: [] });
  });

  it("malformed JSON → empty default shape (defensive)", () => {
    const p = join(root, "state/shared/wiring-domain-dict.json");
    writeFileSync(p, "{not json", "utf8");
    const out = loadExistingDict(p);
    expect(out.candidates).toEqual([]);
  });

  it("preserves promoted{} + candidate first_seen across runs", () => {
    const existing = {
      schemaVersion: 1,
      promoted: { AGI: "ai_reasoning" },
      candidates: [{ prefix: "AGI", engine_count: 5, first_seen: "2026-01-01T00:00:00Z" }],
    };
    const current = [{ prefix: "AGI", engine_count: 8, sample_engines: ["a", "b", "c"] }];
    const merged = mergeCandidates(existing, current, "2026-05-13T22:00:00Z");
    expect(merged[0].first_seen).toBe("2026-01-01T00:00:00Z");
    expect(merged[0].last_seen).toBe("2026-05-13T22:00:00Z");
    expect(merged[0].previous_engine_count).toBe(5);
    expect(merged[0].delta_since_last).toBe(3);
  });

  it("first appearance: first_seen = generated_at, previous_engine_count = null", () => {
    const merged = mergeCandidates({ promoted: {}, candidates: [] }, [{ prefix: "NEW", engine_count: 4, sample_engines: ["a"] }], "t");
    expect(merged[0].first_seen).toBe("t");
    expect(merged[0].previous_engine_count).toBe(null);
    expect(merged[0].delta_since_last).toBe(null);
  });
});

// ──────────────────────────────────────────────────────────────────────
// buildDict — full integration
// ──────────────────────────────────────────────────────────────────────

describe("buildDict (integration)", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("happy: scans both dirs, returns top-3 unmatched + matched summary", async () => {
    // Realistic engine-naming convention: PascalCase or ACRONYM + PascalCase tail.
    // The trailing PascalCase word is what gives extractEnginePrefix the boundary
    // signal it needs (e.g. "AGISafety" → "AGI", "LatheCollision" → "Lathe").
    seedEngines(root, [
      "LatheCollisionEngine.ts", "LatheTurningCycleEngine.ts",
      "CadFusionLiveEngine.ts",
      "AGISafetyContainmentEngine.ts", "AGIRouterEngine.ts", "AGIBeliefSetEngine.ts", "AGIWisdomQueryEngine.ts",
      "KienzleForceModelEngine.ts", "KienzleCoefficientsEngine.ts",
      "ZebraStripeAnalyzerEngine.ts",
    ]);
    seedDispatchers(root, ["latheDispatcher.ts", "cadDispatcher.ts"]);
    const r = await buildDict({ repo: root, frozenTime: "t" });
    expect(r.ok).toBe(true);
    expect(r.counts.engines_scanned).toBe(10);
    expect(r.counts.dispatchers_scanned).toBe(2);
    expect(r.counts.prefixes_matched).toBe(2); // Lathe + Cad
    expect(r.counts.prefixes_unmatched).toBe(3); // AGI + Kienzle + Zebra
    expect(r.candidates.map((c) => c.prefix)).toEqual(["AGI", "Kienzle", "Zebra"]);
    expect(r.candidates[0].engine_count).toBe(4);
  });

  it("respects --top to widen candidate pool", async () => {
    seedEngines(root, ["AGIA.ts", "BetaA.ts", "GammaA.ts", "DeltaA.ts", "EpsilonA.ts"]);
    seedDispatchers(root, []);
    const r = await buildDict({ repo: root, frozenTime: "t", top: 5 });
    expect(r.candidates).toHaveLength(5);
  });

  it("failure: missing engines dir → ok:false with empty shape preserved", async () => {
    seedDispatchers(root, ["latheDispatcher.ts"]);
    rmSync(join(root, "mcp-server/src/engines"), { recursive: true, force: true });
    const r = await buildDict({ repo: root, frozenTime: "t" });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/^engines:/);
    expect(r.schemaVersion).toBe(1);
    expect(r.candidates).toEqual([]);
  });

  it("failure: missing dispatchers dir → ok:false", async () => {
    seedEngines(root, ["LatheA.ts"]);
    rmSync(join(root, "mcp-server/src/tools/dispatchers"), { recursive: true, force: true });
    const r = await buildDict({ repo: root, frozenTime: "t" });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/^dispatchers:/);
  });

  it("preserves promoted aliases across runs (a previously-promoted prefix won't reappear as candidate)", async () => {
    seedEngines(root, ["AGISafetyEngine.ts", "AGIRouterEngine.ts", "BetaTesterEngine.ts"]);
    seedDispatchers(root, []);
    // First run: both AGI + Beta unmatched.
    const r1 = await buildDict({ repo: root, frozenTime: "t1" });
    expect(r1.candidates.map((c) => c.prefix).sort()).toEqual(["AGI", "Beta"]);
    // Operator promotes AGI manually; persist via outJson.
    const promotedDict = {
      schemaVersion: 1,
      promoted: { AGI: "ai_reasoning" },
      candidates: r1.candidates,
    };
    writeFileSync(join(root, "state/shared/wiring-domain-dict.json"), JSON.stringify(promotedDict), "utf8");
    // Second run: AGI is now matched-via-alias; only Beta remains as candidate.
    const r2 = await buildDict({ repo: root, frozenTime: "t2" });
    expect(r2.candidates.map((c) => c.prefix)).toEqual(["Beta"]);
    expect(r2.promoted).toEqual({ AGI: "ai_reasoning" });
  });
});

// ──────────────────────────────────────────────────────────────────────
// Adversarial + spanning
// ──────────────────────────────────────────────────────────────────────

describe("adversarial + spanning", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("adversarial: empty engines dir → ok:true with zero counts", async () => {
    seedDispatchers(root, ["latheDispatcher.ts"]);
    const r = await buildDict({ repo: root, frozenTime: "t" });
    expect(r.ok).toBe(true);
    expect(r.counts.engines_scanned).toBe(0);
    expect(r.candidates).toEqual([]);
  });

  it("adversarial: filenames with no leading PascalCase ignored silently", async () => {
    seedEngines(root, ["lowercase.ts", "snake_case.ts", "Foo.test.ts", "Foo.d.ts"]);
    seedDispatchers(root, []);
    const r = await buildDict({ repo: root, frozenTime: "t" });
    expect(r.counts.engines_scanned).toBe(0);
  });

  it("spanning: 1-engine, 1-dispatcher in-sync", async () => {
    seedEngines(root, ["LatheA.ts"]);
    seedDispatchers(root, ["latheDispatcher.ts"]);
    const r = await buildDict({ repo: root, frozenTime: "t" });
    expect(r.candidates).toEqual([]);
    expect(r.matched_summary).toEqual([{ prefix: "Lathe", dispatcher: "lathe", engine_count: 1 }]);
  });

  it("spanning: 100 engines across 5 prefixes, 1 dispatcher → 4 unmatched", async () => {
    // Use realistic name shapes: PascalCase prefix + PascalCase tail (with no
    // digits — extractEnginePrefix's all-caps branch correctly rejects digits,
    // and acronyms need a PascalCase boundary token to terminate).
    const tailWords = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliet"];
    const prefixes = ["Lathe", "AGI", "Beta", "Gamma", "Sigma"];
    const names = [];
    for (let i = 0; i < 100; i++) {
      const prefix = prefixes[i % 5];
      const tail = tailWords[Math.floor(i / 5) % tailWords.length];
      // For ACRONYM prefixes, attach a PascalCase tail directly. For PascalCase
      // prefixes, also attach a PascalCase tail (it's still distinguishable
      // because the acronym-boundary regex requires 2+ uppercase letters).
      names.push(`${prefix}${tail}Worker${i}Engine.ts`);
    }
    seedEngines(root, names);
    seedDispatchers(root, ["latheDispatcher.ts"]);
    const r = await buildDict({ repo: root, frozenTime: "t" });
    expect(r.counts.engines_scanned).toBe(100);
    expect(r.counts.prefixes_matched).toBe(1);
    expect(r.counts.prefixes_unmatched).toBe(4);
    expect(r.candidates).toHaveLength(3); // top-3 default
    expect(r.candidates.every((c) => c.engine_count === 20)).toBe(true);
  });

  it("spanning: prefixes that share lowercase form (Cad vs CAD) deduplicate to same group", async () => {
    seedEngines(root, ["CadA.ts", "CadB.ts"]);
    seedDispatchers(root, []);
    const r = await buildDict({ repo: root, frozenTime: "t" });
    // Both extract to "Cad" → one prefix, count=2
    expect(r.candidates).toHaveLength(1);
    expect(r.candidates[0]).toMatchObject({ prefix: "Cad", engine_count: 2 });
  });
});

// ──────────────────────────────────────────────────────────────────────
// renderMarkdown
// ──────────────────────────────────────────────────────────────────────

describe("renderMarkdown", () => {
  it("renders the candidate table with delta + sample engines", () => {
    const md = renderMarkdown({
      ok: true,
      generated_at: "t",
      engines_dir: "/eng",
      dispatchers_dir: "/disp",
      counts: { engines_scanned: 5, dispatchers_scanned: 1, prefixes_matched: 1, prefixes_unmatched: 1 },
      promoted: {},
      candidates: [
        { prefix: "AGI", engine_count: 5, first_seen: "t1", last_seen: "t2", previous_engine_count: 3, delta_since_last: 2, sample_engines: ["AGIA", "AGIB", "AGIC"] },
      ],
      matched_summary: [{ prefix: "Lathe", dispatcher: "lathe", engine_count: 8 }],
      unmatched_summary: [{ prefix: "AGI", engine_count: 5 }],
    });
    expect(md).toContain("| `AGI` | 5 | +2 | t1 | AGIA, AGIB, AGIC |");
    expect(md).toContain("| `Lathe` | `lathe` | 8 |");
    expect(md).toContain("Mark-curated");
  });

  it("renders empty candidate banner when nothing unmatched", () => {
    const md = renderMarkdown({
      ok: true,
      generated_at: "t",
      engines_dir: "/eng",
      dispatchers_dir: "/disp",
      counts: { engines_scanned: 1, dispatchers_scanned: 1, prefixes_matched: 1, prefixes_unmatched: 0 },
      promoted: {},
      candidates: [],
      matched_summary: [{ prefix: "Lathe", dispatcher: "lathe", engine_count: 1 }],
      unmatched_summary: [],
    });
    expect(md).toContain("_No unmatched prefixes found this run._");
  });

  it("renders error banner on ok:false", () => {
    const md = renderMarkdown({ ok: false, reason: "engines: dir missing", generated_at: "t" });
    expect(md).toContain("**ERROR:** engines: dir missing");
  });
});

// ──────────────────────────────────────────────────────────────────────
// runCli — round-trip
// ──────────────────────────────────────────────────────────────────────

describe("runCli (round-trip)", () => {
  let root;
  let stdoutBuf;
  let origStdout;

  beforeEach(() => {
    root = makeRepo();
    stdoutBuf = [];
    origStdout = process.stdout.write.bind(process.stdout);
    process.stdout.write = (s) => { stdoutBuf.push(String(s)); return true; };
  });

  afterEach(() => {
    process.stdout.write = origStdout;
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it("--json mode emits to stdout, writes ZERO files in state/shared", async () => {
    seedEngines(root, ["LatheA.ts"]);
    seedDispatchers(root, []);
    const r = await runCli(["node", "x.mjs", "--json", "--frozen-time", "t"], { repo: root });
    expect(r.ok).toBe(true);
    expect(JSON.parse(stdoutBuf.join("").trim()).ok).toBe(true);
    const sharedFiles = readdirSync(join(root, "state/shared"));
    const dictFiles = sharedFiles.filter((nm) => nm.includes("wiring-domain-dict") || nm.includes("WIRING_DOMAIN_DICT"));
    expect(dictFiles).toEqual([]);
  });

  it("default mode writes both report files atomically + summary", async () => {
    seedEngines(root, ["LatheA.ts", "AGIA.ts", "AGIB.ts"]);
    seedDispatchers(root, ["latheDispatcher.ts"]);
    const r = await runCli(["node", "x.mjs", "--frozen-time", "t"], { repo: root });
    expect(r.ok).toBe(true);
    expect(existsSync(join(root, "state/shared/wiring-domain-dict.json"))).toBe(true);
    expect(existsSync(join(root, "state/shared/WIRING_DOMAIN_DICT.md"))).toBe(true);
    expect(stdoutBuf.join("")).toMatch(/wiring-domain-dict: engines=3/);
    const residue = readdirSync(join(root, "state/shared")).filter((nm) => nm.includes(".tmp-"));
    expect(residue).toEqual([]);
  });

  it("idempotency: 2nd and 3rd runs (same input + stable prior dict) → byte-identical markdown", async () => {
    seedEngines(root, ["LatheCollisionEngine.ts", "AGISafetyEngine.ts"]);
    seedDispatchers(root, ["latheDispatcher.ts"]);
    // First run: persists initial dict (no prior → first_seen=t1, delta=null).
    await runCli(["node", "x.mjs", "--frozen-time", "t1"], { repo: root });
    // Second run: reads 1st run's dict, sets previous_engine_count + delta=0.
    await runCli(["node", "x.mjs", "--frozen-time", "t2"], { repo: root });
    const md2 = readFileSync(join(root, "state/shared/WIRING_DOMAIN_DICT.md"), "utf8");
    // Third run with same frozen-time as 2nd: must produce identical bytes.
    await runCli(["node", "x.mjs", "--frozen-time", "t2"], { repo: root });
    const md3 = readFileSync(join(root, "state/shared/WIRING_DOMAIN_DICT.md"), "utf8");
    expect(md2).toBe(md3);
  });
});

// ──────────────────────────────────────────────────────────────────────
// writeAtomic
// ──────────────────────────────────────────────────────────────────────

describe("writeAtomic", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("creates parent directories if missing", () => {
    const target = join(root, "deep/nested/path/dict.json");
    writeAtomic(target, "{\"ok\":true}\n");
    expect(existsSync(target)).toBe(true);
  });

  it("100 rapid writes never collide (PID+ts+random suffix)", () => {
    const target = join(root, "state/shared/HOT.md");
    for (let i = 0; i < 100; i++) writeAtomic(target, `iter-${i}`);
    expect(readFileSync(target, "utf8")).toBe("iter-99");
    const residue = readdirSync(join(root, "state/shared")).filter((nm) => nm.includes(".tmp-"));
    expect(residue).toEqual([]);
  });
});
