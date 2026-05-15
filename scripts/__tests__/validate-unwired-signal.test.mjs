/**
 * validate-unwired-signal.test.mjs — companion tests for the U-HVA-UNWIRED-SIGNAL-VALIDATE script.
 *
 * Coverage: parseArgs · sampleDeterministic · makeRng · extractEngineList (5 schema variants)
 * · classifyConsumerFile · buildSearchPatterns (strong vs co-signal split) · scanEngine
 * (4 classifications: TRULY-UNWIRED / FALSE-POSITIVE-WIRED / WEAK-SIGNAL / EXEMPT)
 * · writeReport (path-safety guard).
 *
 * Hermetic — uses synthetic content fed into scanEngine via a contentCache Map,
 * so tests do NOT touch the real mcp-server/src tree.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  parseArgs,
  buildSearchPatterns,
  scanEngine,
  sampleDeterministic,
  makeRng,
  classifyConsumerFile,
  extractEngineList,
  writeReport,
  STRONG_CONSUMER_KINDS,
  DEFAULT_SAMPLE_SIZE,
  DEFAULT_SEED,
  DEFAULT_MAX_FP_RATE_PCT,
} from "../validate-unwired-signal.mjs";

// ── helpers ──────────────────────────────────────────────────────────────────

function seedCache(filesByRel) {
  const MCP_SRC = path.resolve("H:/prism/mcp-server/src");
  const consumerFiles = [];
  const contentCache = new Map();
  for (const [rel, content] of Object.entries(filesByRel)) {
    const abs = path.join(MCP_SRC, rel.replace(/\//g, path.sep));
    consumerFiles.push(abs);
    contentCache.set(abs, content);
  }
  return { consumerFiles, contentCache };
}

// ── parseArgs ────────────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("returns defaults for empty argv", () => {
    const a = parseArgs(["node", "script"]);
    expect(a.sample).toBe(DEFAULT_SAMPLE_SIZE);
    expect(a.seed).toBe(DEFAULT_SEED);
    expect(a.maxFpRate).toBe(DEFAULT_MAX_FP_RATE_PCT);
    expect(a.json).toBe(false);
    expect(a.verbose).toBe(false);
    expect(a.quiet).toBe(false);
    expect(a.all).toBe(false);
    expect(a.source).toBe(null);
    expect(a.report).toBe(null);
    expect(a.autoReport).toBe(false);
  });

  it("parses --sample / --seed / --max-fp-rate as numbers", () => {
    const a = parseArgs(["node", "script", "--sample", "100", "--seed", "7", "--max-fp-rate", "5"]);
    expect(a.sample).toBe(100);
    expect(a.seed).toBe(7);
    expect(a.maxFpRate).toBe(5);
  });

  it("parses --json / --verbose / --quiet / --all booleans", () => {
    const a = parseArgs(["node", "script", "--json", "--verbose", "--quiet", "--all"]);
    expect(a.json).toBe(true);
    expect(a.verbose).toBe(true);
    expect(a.quiet).toBe(true);
    expect(a.all).toBe(true);
  });

  it("parses --report and --auto-report", () => {
    const a = parseArgs(["node", "script", "--report", "/tmp/x.json", "--auto-report"]);
    expect(a.report).toBe("/tmp/x.json");
    expect(a.autoReport).toBe(true);
  });

  it("parses --source override", () => {
    const a = parseArgs(["node", "script", "--source", "/path/to/audit.json"]);
    expect(a.source).toBe("/path/to/audit.json");
  });
});

// ── makeRng + sampleDeterministic ────────────────────────────────────────────

describe("makeRng", () => {
  it("produces deterministic stream for a given seed", () => {
    const rng1 = makeRng(42);
    const rng2 = makeRng(42);
    const v1 = [rng1(), rng1(), rng1()];
    const v2 = [rng2(), rng2(), rng2()];
    expect(v1).toEqual(v2);
    expect(v1[0]).not.toBe(v1[1]);
  });

  it("different seeds produce different streams", () => {
    const rng1 = makeRng(42);
    const rng2 = makeRng(43);
    expect(rng1()).not.toBe(rng2());
  });

  it("returns values in [0, 1)", () => {
    const rng = makeRng(1);
    const values = Array.from({ length: 50 }, () => rng());
    expect(values.every(v => v >= 0 && v < 1)).toBe(true);
    expect(new Set(values).size).toBeGreaterThan(40);
  });
});

describe("sampleDeterministic", () => {
  it("returns n unique elements for n < arr.length", () => {
    const arr = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const sample = sampleDeterministic(arr, 3, 42);
    expect(sample).toHaveLength(3);
    expect(new Set(sample).size).toBe(3);
    expect(sample.every(s => arr.includes(s))).toBe(true);
  });

  it("returns full array when n >= arr.length", () => {
    const arr = ["a", "b", "c"];
    const sample = sampleDeterministic(arr, 10, 42);
    expect(sample.sort()).toEqual(["a", "b", "c"]);
  });

  it("same seed → identical sample", () => {
    const arr = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    const s1 = sampleDeterministic(arr, 5, 42);
    const s2 = sampleDeterministic(arr, 5, 42);
    expect(s1).toEqual(s2);
    expect(s1).toHaveLength(5);
  });

  it("different seeds → different samples", () => {
    const arr = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    const s1 = sampleDeterministic(arr, 5, 1);
    const s2 = sampleDeterministic(arr, 5, 9999);
    expect(s1).not.toEqual(s2);
  });
});

// ── extractEngineList (schema variants) ──────────────────────────────────────

describe("extractEngineList", () => {
  it("handles current audit schema { unwiredEngines: [{engine: 'X'}] }", () => {
    const out = extractEngineList({ unwiredEngines: [{ engine: "FooEngine", size_kb: 10 }] }, "test.json");
    expect(out).toEqual([expect.objectContaining({ name: "FooEngine", engine: "FooEngine", size_kb: 10 })]);
  });

  it("handles older audit schema { unwiredEngines: [{name: 'X'}] }", () => {
    const out = extractEngineList({ unwiredEngines: [{ name: "BarEngine" }] }, "test.json");
    expect(out).toEqual([expect.objectContaining({ name: "BarEngine" })]);
  });

  it("handles flat-string schema { unwiredEngines: ['X', 'Y'] }", () => {
    const out = extractEngineList({ unwiredEngines: ["Foo", "Bar"] }, "test.json");
    expect(out.map(e => e.name)).toEqual(["Foo", "Bar"]);
  });

  it("handles { engines: [...] } with classified:UNWIRED filter", () => {
    const audit = {
      engines: [
        { name: "WiredOne", classified: "WIRED-DIRECT" },
        { name: "UnwiredOne", classified: "UNWIRED" },
        { name: "UnwiredTwo", classification: "UNWIRED" },
      ],
    };
    const out = extractEngineList(audit, "test.json");
    expect(out.map(e => e.name).sort()).toEqual(["UnwiredOne", "UnwiredTwo"]);
  });

  it("handles { unwired: [...] } variant with basename field", () => {
    const out = extractEngineList({ unwired: [{ basename: "Quux" }] }, "test.json");
    expect(out).toEqual([expect.objectContaining({ name: "Quux" })]);
  });

  it("filters out entries with no resolvable name", () => {
    const out = extractEngineList({ unwiredEngines: [{ foo: "bar" }, { engine: "Real" }] }, "test.json");
    expect(out.map(e => e.name)).toEqual(["Real"]);
  });
});

// ── classifyConsumerFile ─────────────────────────────────────────────────────

describe("classifyConsumerFile", () => {
  const MCP_SRC = path.resolve("H:/prism/mcp-server/src");
  const p = (rel) => path.join(MCP_SRC, rel.replace(/\//g, path.sep));

  it("identifies dispatcher files", () => {
    expect(classifyConsumerFile(p("tools/dispatchers/fooDispatcher.ts"))).toBe("dispatcher");
  });
  it("identifies routes", () => {
    expect(classifyConsumerFile(p("routes/api/foo.ts"))).toBe("route");
  });
  it("identifies registries", () => {
    expect(classifyConsumerFile(p("registries/materials.ts"))).toBe("registry");
  });
  it("identifies hooks", () => {
    expect(classifyConsumerFile(p("hooks/extractionHooks.ts"))).toBe("hook");
  });
  it("identifies singletons by basename", () => {
    expect(classifyConsumerFile(p("engines/MyEngineSingleton.ts"))).toBe("singleton");
  });
  it("identifies orchestrators by basename regex", () => {
    expect(classifyConsumerFile(p("engines/PipelineOrchestratorEngine.ts"))).toBe("orchestrator");
  });
  it("falls back to cross-engine for engines/", () => {
    expect(classifyConsumerFile(p("engines/RegularEngine.ts"))).toBe("cross-engine");
  });
  it("identifies tests by .test.ts suffix", () => {
    expect(classifyConsumerFile(p("__tests__/foo.test.ts"))).toBe("test");
  });
});

// ── buildSearchPatterns (strong vs co-signal) ────────────────────────────────

describe("buildSearchPatterns", () => {
  it("exposes 8 strong strategies and 2 co-signal strategies", () => {
    const p = buildSearchPatterns("FooEngine");
    expect(Object.keys(p.strong).sort()).toEqual([
      "construct", "defaultOrNamespace", "dynamicImport", "dynamicImportPath",
      "instanceImport", "namedImport", "pathImport", "reExport",
    ]);
    expect(Object.keys(p.coSignal).sort()).toEqual(["propAccess", "typeRef"]);
  });

  it("namedImport matches real import, NOT comment mention", () => {
    const p = buildSearchPatterns("FooEngine");
    expect(p.strong.namedImport.test(`import { FooEngine } from "./bar";`)).toBe(true);
    expect(p.strong.namedImport.test(`// FooEngine is good`)).toBe(false);
  });

  it("pathImport matches engine basename in module path", () => {
    const p = buildSearchPatterns("FooEngine");
    expect(p.strong.pathImport.test(`import x from "../engines/FooEngine.js";`)).toBe(true);
    expect(p.strong.pathImport.test(`import x from "../engines/Other.js";`)).toBe(false);
  });

  it("propAccess (co-signal) matches `FooEngine.method`", () => {
    const p = buildSearchPatterns("FooEngine");
    expect(p.coSignal.propAccess.test(`return FooEngine.run()`)).toBe(true);
    expect(p.coSignal.propAccess.test(`return FooEngine`)).toBe(false);
  });

  it("respects PascalCase word boundary — FooEngine does NOT match FooEngineFoo", () => {
    const p = buildSearchPatterns("FooEngine");
    expect(p.strong.namedImport.test(`import { FooEngineFoo } from "./bar";`)).toBe(false);
    expect(p.strong.construct.test(`new FooEngineFoo()`)).toBe(false);
  });

  it("construct matches `new FooEngine(`", () => {
    const p = buildSearchPatterns("FooEngine");
    expect(p.strong.construct.test(`new FooEngine()`)).toBe(true);
    expect(p.strong.construct.test(`const x = new FooEngine(opts)`)).toBe(true);
    expect(p.strong.construct.test(`FooEngine.create()`)).toBe(false);
  });

  it("dynamicImport matches `import(\"../engines/FooEngine\")`", () => {
    const p = buildSearchPatterns("FooEngine");
    expect(p.strong.dynamicImport.test(`await import("../engines/FooEngine")`)).toBe(true);
    expect(p.strong.dynamicImport.test(`await import("../engines/Other")`)).toBe(false);
  });
});

// ── scanEngine (classification) ──────────────────────────────────────────────

describe("scanEngine", () => {
  it("classifies as FALSE-POSITIVE-WIRED when imported by a dispatcher", () => {
    const { consumerFiles, contentCache } = seedCache({
      "tools/dispatchers/fooDispatcher.ts": `import { TargetEngine } from "../../engines/TargetEngine.js";\nfunction handler() { new TargetEngine(); }`,
    });
    const r = scanEngine("TargetEngine", consumerFiles, contentCache);
    expect(r.classification).toBe("FALSE-POSITIVE-WIRED");
    expect(r.matches[0].consumerKind).toBe("dispatcher");
    expect(r.matches[0].strategies).toEqual(expect.arrayContaining(["namedImport", "construct"]));
  });

  it("classifies as FALSE-POSITIVE-WIRED when imported by a hook", () => {
    const { consumerFiles, contentCache } = seedCache({
      "hooks/extractionHooks.ts": `import { TargetEngine } from "../../engines/TargetEngine.js";`,
    });
    const r = scanEngine("TargetEngine", consumerFiles, contentCache);
    expect(r.classification).toBe("FALSE-POSITIVE-WIRED");
    expect(r.matches[0].consumerKind).toBe("hook");
  });

  it("classifies as TRULY-UNWIRED when only comment references exist", () => {
    const { consumerFiles, contentCache } = seedCache({
      "engines/Other.ts": `// see TargetEngine.run() docstring for details`,
    });
    const r = scanEngine("TargetEngine", consumerFiles, contentCache);
    expect(r.classification).toBe("TRULY-UNWIRED");
    expect(r.matches).toEqual([]);
  });

  it("classifies as WEAK-SIGNAL when wired only via cross-engine import", () => {
    const { consumerFiles, contentCache } = seedCache({
      "engines/PeerEngine.ts": `import { TargetEngine } from "../engines/TargetEngine.js";\nclass X { x = new TargetEngine(); }`,
    });
    const r = scanEngine("TargetEngine", consumerFiles, contentCache);
    expect(r.classification).toBe("WEAK-SIGNAL");
    expect(r.matches[0].consumerKind).toBe("cross-engine");
  });

  it("returns TRULY-UNWIRED when no consumer files reference the engine", () => {
    const { consumerFiles, contentCache } = seedCache({
      "tools/dispatchers/empty.ts": `function noop() {}`,
    });
    const r = scanEngine("TargetEngine", consumerFiles, contentCache);
    expect(r.classification).toBe("TRULY-UNWIRED");
  });

  it("strong-match-only gating: co-signal hit without strong match does NOT count", () => {
    const { consumerFiles, contentCache } = seedCache({
      "tools/dispatchers/fooDispatcher.ts": `const msg = "see TargetEngine.method for details";`,
    });
    const r = scanEngine("TargetEngine", consumerFiles, contentCache);
    expect(r.classification).toBe("TRULY-UNWIRED");
  });

  it("co-signal hits ARE included when accompanied by strong match", () => {
    const { consumerFiles, contentCache } = seedCache({
      "tools/dispatchers/fooDispatcher.ts": `import { TargetEngine } from "../../engines/TargetEngine.js";\nconst x: TargetEngine = new TargetEngine();\nTargetEngine.run();`,
    });
    const r = scanEngine("TargetEngine", consumerFiles, contentCache);
    expect(r.classification).toBe("FALSE-POSITIVE-WIRED");
    expect(r.matches[0].strategies).toEqual(expect.arrayContaining(["namedImport", "construct", "typeRef", "propAccess"]));
  });

  it("skips the engine's own file (self-reference does not count)", () => {
    const { consumerFiles, contentCache } = seedCache({
      "engines/TargetEngine.ts": `export class TargetEngine { run() { new TargetEngine(); } }`,
    });
    const r = scanEngine("TargetEngine", consumerFiles, contentCache);
    expect(r.classification).toBe("TRULY-UNWIRED");
    expect(r.matches).toEqual([]);
  });
});

// ── STRONG_CONSUMER_KINDS ────────────────────────────────────────────────────

describe("STRONG_CONSUMER_KINDS", () => {
  it("contains exactly the 6 strong wiring sites", () => {
    expect([...STRONG_CONSUMER_KINDS].sort()).toEqual([
      "dispatcher", "hook", "orchestrator", "registry", "route", "singleton",
    ]);
  });

  it("excludes test + cross-engine + other (weak signals)", () => {
    expect(STRONG_CONSUMER_KINDS.has("test")).toBe(false);
    expect(STRONG_CONSUMER_KINDS.has("cross-engine")).toBe(false);
    expect(STRONG_CONSUMER_KINDS.has("other")).toBe(false);
  });
});

// ── writeReport path-safety guard ────────────────────────────────────────────

describe("writeReport", () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vus-test-"));
  });
  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ }
  });

  it("refuses paths outside ROOT", () => {
    const r = writeReport({ x: 1 }, path.join(tmpDir, "outside.json"));
    expect(r).toBe(null);
  });

  it("writes JSON to disk when path is inside ROOT and round-trips correctly", () => {
    // Compute ROOT the same way the script does so case-resolution matches on Windows
    const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ""));
    const repoRoot = path.resolve(scriptDir, "..", "..");
    const reportPath = path.join(repoRoot, "state", "shared", `vus-test-${Date.now()}.json`);
    const r = writeReport({ x: 1, verdict: "PASS" }, reportPath);
    expect(r).toBe(path.resolve(reportPath));
    const content = JSON.parse(fs.readFileSync(r, "utf8"));
    expect(content.x).toBe(1);
    expect(content.verdict).toBe("PASS");
    fs.unlinkSync(r);
  });
});
