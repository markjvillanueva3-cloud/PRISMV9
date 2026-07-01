#!/usr/bin/env node
/**
 * node-structural-features.test.mjs -- R9 tests for the leakage-safe structural feature lib
 * (U-GNN-STRUCT-FEATURES, slot:india 2026-06-25). Tests verify INTENT:
 *   - the leakage guard (an engine's OWN dispatcher label must NEVER appear in its own feature);
 *   - the separability rationale (same-class engines that keep similar company get high cosine,
 *     different-class engines get low cosine) -- the whole reason the feature could help leg #10;
 *   - the late-fusion alpha math (alpha=0 == text-only baseline, alpha=1 == structural-only);
 *   - graceful zero-fallback (no wired neighbours -> all-zero struct block, NOT a crash/NaN).
 *
 * Run: node scripts/lib/node-structural-features.test.mjs   (node:test auto-runs on exit)
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  extractImportedBasenames,
  buildEngineImportAdjacencyFromSources,
  buildClassList,
  dispatchersOf,
  neighborDispatcherHistogram,
  structuralVector,
  l2normalize,
  concatWeighted,
  loadEngineSources,
} from "./node-structural-features.mjs";

const close = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const dot = (a, b) => a.reduce((s, x, i) => s + x * (b[i] || 0), 0);
const cosine = (a, b) => {
  const na = Math.sqrt(dot(a, a)), nb = Math.sqrt(dot(b, b));
  return na === 0 || nb === 0 ? 0 : dot(a, b) / (na * nb);
};

// ---------------------------------------------------------------------------
// extractImportedBasenames
// ---------------------------------------------------------------------------
test("extractImportedBasenames: static, dynamic, side-effect, bare specifiers", () => {
  const src = [
    'import Foo from "./FooEngine.js";',
    'import { bar } from "../sub/BarEngine.ts";',
    'const x = await import("./BazEngine.mjs");',
    'import "./SideEffect.js";',
    'import nope from "lodash";',
  ].join("\n");
  assert.deepEqual(extractImportedBasenames(src), [
    "FooEngine", "BarEngine", "BazEngine", "SideEffect", "lodash",
  ]);
});

test("extractImportedBasenames: de-dups first-seen, handles empty/non-string", () => {
  const src = 'import A from "./AEngine.js";\nimport A2 from "./AEngine.js";';
  assert.deepEqual(extractImportedBasenames(src), ["AEngine"]);
  assert.deepEqual(extractImportedBasenames(""), []);
  assert.deepEqual(extractImportedBasenames(null), []);
  assert.deepEqual(extractImportedBasenames(42), []);
});

// ---------------------------------------------------------------------------
// buildEngineImportAdjacencyFromSources
// ---------------------------------------------------------------------------
test("buildEngineImportAdjacencyFromSources: only engine-name imports become edges", () => {
  const sources = new Map([
    ["FooEngine", 'import Bar from "./BarEngine.js"; import _ from "lodash";'],
    ["BarEngine", 'import Foo from "./FooEngine.js";'],
    ["BazEngine", "export const z = 1;"],
  ]);
  const adj = buildEngineImportAdjacencyFromSources(sources);
  assert.deepEqual([...adj.get("FooEngine")], ["BarEngine"]); // lodash dropped (not an engine)
  assert.deepEqual([...adj.get("BarEngine")], ["FooEngine"]);
  assert.deepEqual([...adj.get("BazEngine")], []);            // total: empty entry, not missing
  assert.equal(adj.size, 3);
});

test("buildEngineImportAdjacencyFromSources: self-import is never an edge (adversarial)", () => {
  const sources = new Map([
    ["SelfEngine", 'import Self from "./SelfEngine.js"; import Bar from "./BarEngine.js";'],
    ["BarEngine", "export const x = 1;"],
  ]);
  const adj = buildEngineImportAdjacencyFromSources(sources);
  assert.deepEqual([...adj.get("SelfEngine")], ["BarEngine"]); // self excluded
});

test("buildEngineImportAdjacencyFromSources: empty/invalid -> empty map", () => {
  assert.equal(buildEngineImportAdjacencyFromSources(new Map()).size, 0);
  assert.equal(buildEngineImportAdjacencyFromSources(null).size, 0);
  assert.equal(buildEngineImportAdjacencyFromSources([]).size, 0);
});

// ---------------------------------------------------------------------------
// buildClassList
// ---------------------------------------------------------------------------
test("buildClassList: sorted unique dispatcher axis", () => {
  const e2d = new Map([
    ["A", "prism_cam"], ["B", "prism_calc"], ["C", "prism_cam"], ["D", ""],
  ]);
  assert.deepEqual(buildClassList(e2d), ["prism_calc", "prism_cam"]);
  assert.deepEqual(buildClassList(null), []);
});

// ---------------------------------------------------------------------------
// neighborDispatcherHistogram  -- THE LEAKAGE GUARD
// ---------------------------------------------------------------------------
test("neighborDispatcherHistogram: tallies NEIGHBOURS' labels, never the engine's own", () => {
  const adj = new Map([["E", new Set(["N1", "N2", "N3"])]]);
  const e2d = new Map([
    ["N1", "prism_calc"], ["N2", "prism_calc"], ["N3", "prism_cam"],
    ["E", "prism_safety"], // E's OWN label
  ]);
  const hist = neighborDispatcherHistogram("E", adj, e2d);
  assert.equal(hist.get("prism_calc"), 2);
  assert.equal(hist.get("prism_cam"), 1);
  assert.equal(hist.has("prism_safety"), false, "E's own label must NOT leak into its histogram");
});

test("neighborDispatcherHistogram: LEAKAGE PROOF -- labeled engine, no wired neighbours -> EMPTY", () => {
  // E is wired (prism_safety) but imports only an UNwired neighbour. The honest feature is empty;
  // a regression that fell back to E's own one-hot label would make this non-empty and LEAK.
  const adj = new Map([["E", new Set(["Nx"])]]);
  const e2d = new Map([["E", "prism_safety"]]); // Nx has no dispatcher
  const hist = neighborDispatcherHistogram("E", adj, e2d);
  assert.equal(hist.size, 0, "no wired neighbours -> no signal -> own label must NOT be substituted");
});

test("neighborDispatcherHistogram: isolated engine + invalid inputs -> empty", () => {
  assert.equal(neighborDispatcherHistogram("E", new Map([["E", new Set()]]), new Map()).size, 0);
  assert.equal(neighborDispatcherHistogram("E", null, new Map()).size, 0);
  assert.equal(neighborDispatcherHistogram("E", new Map(), null).size, 0);
});

// ---------------------------------------------------------------------------
// structuralVector
// ---------------------------------------------------------------------------
test("structuralVector: L2-normalized class histogram over a fixed axis (includeDegree:false)", () => {
  const adj = new Map([["E", new Set(["N1", "N2", "N3"])]]);
  const e2d = new Map([["N1", "prism_calc"], ["N2", "prism_calc"], ["N3", "prism_cam"]]);
  const classList = ["prism_ai", "prism_calc", "prism_cam", "prism_safety"];
  const v = structuralVector("E", adj, e2d, classList, { includeDegree: false });
  // raw block [0,2,1,0] -> /sqrt(5)
  const r5 = Math.sqrt(5);
  assert.equal(v.length, 4);
  assert.ok(close(v[0], 0) && close(v[3], 0));
  assert.ok(close(v[1], 2 / r5), `calc ${v[1]} != ${2 / r5}`);
  assert.ok(close(v[2], 1 / r5), `cam ${v[2]} != ${1 / r5}`);
  assert.ok(close(dot(v, v), 1), "L2 norm of a non-empty block is 1");
});

test("structuralVector: ZERO-FALLBACK -- no wired neighbours -> all-zero block (no NaN)", () => {
  const adj = new Map([["E", new Set(["Nx"])]]);
  const e2d = new Map([["E", "prism_safety"]]);
  const classList = ["prism_calc", "prism_cam", "prism_safety"];
  const v = structuralVector("E", adj, e2d, classList, { includeDegree: false });
  assert.deepEqual(v, [0, 0, 0], "signal-less node -> all-zero struct block, NOT own-label one-hot");
  assert.ok(v.every(Number.isFinite), "no NaN from /0");
});

test("structuralVector: degree feature appended + bounded [0,1] (default includeDegree)", () => {
  const adj = new Map([["E", new Set(["N1", "N2"])]]);
  const e2d = new Map([["N1", "prism_calc"], ["N2", "prism_cam"]]);
  const classList = ["prism_calc", "prism_cam"];
  const v = structuralVector("E", adj, e2d, classList); // includeDegree default true
  assert.equal(v.length, classList.length + 1);
  const deg = v[v.length - 1];
  assert.ok(deg > 0 && deg <= 1, `degree feat ${deg} in (0,1]`);
  // log1p(2)/log(64) ~ 0.2640
  assert.ok(close(deg, Math.log1p(2) / Math.log(64), 1e-9));
});

// ---------------------------------------------------------------------------
// SEPARABILITY RATIONALE (the WHY) -- same-class company => high cosine
// ---------------------------------------------------------------------------
test("structuralVector: same-class engines (similar company) -> high cosine; cross-class -> low", () => {
  // Two calc-ish engines both import calc-wired neighbours; one cam-ish imports cam-wired ones.
  const adj = new Map([
    ["CalcA", new Set(["K1", "K2"])],
    ["CalcB", new Set(["K2", "K3"])],
    ["CamA", new Set(["M1", "M2"])],
  ]);
  const e2d = new Map([
    ["K1", "prism_calc"], ["K2", "prism_calc"], ["K3", "prism_calc"],
    ["M1", "prism_cam"], ["M2", "prism_cam"],
  ]);
  const cl = buildClassList(e2d); // ["prism_calc","prism_cam"]
  const opts = { includeDegree: false };
  const vCalcA = structuralVector("CalcA", adj, e2d, cl, opts);
  const vCalcB = structuralVector("CalcB", adj, e2d, cl, opts);
  const vCamA = structuralVector("CamA", adj, e2d, cl, opts);
  const sameClass = cosine(vCalcA, vCalcB);
  const crossClass = cosine(vCalcA, vCamA);
  assert.ok(close(sameClass, 1), `same-class cosine ${sameClass} should be ~1`);
  assert.ok(close(crossClass, 0), `cross-class cosine ${crossClass} should be ~0`);
  assert.ok(sameClass > crossClass + 0.5, "structural feature SEPARATES classes (the leg-#10 lever)");
});

// ---------------------------------------------------------------------------
// l2normalize
// ---------------------------------------------------------------------------
test("l2normalize: unit length, all-zero stays zero, NaN coerced", () => {
  const u = l2normalize([3, 4]);
  assert.ok(close(u[0], 0.6) && close(u[1], 0.8));
  assert.deepEqual(l2normalize([0, 0]), [0, 0]);  // no /0
  assert.deepEqual(l2normalize([]), []);
  const n = l2normalize([NaN, 1, Infinity]);
  assert.ok(n.every(Number.isFinite));
});

// ---------------------------------------------------------------------------
// concatWeighted -- late-fusion alpha math
// ---------------------------------------------------------------------------
test("concatWeighted: alpha trades text vs structural; blocks L2-normed then scaled", () => {
  const out = concatWeighted([3, 4], [0, 1], 0.5);
  // unit text [0.6,0.8] * 0.5, unit struct [0,1] * 0.5
  assert.deepEqual(out.map((x) => +x.toFixed(6)), [0.3, 0.4, 0, 0.5]);
});

test("concatWeighted: alpha=0 == text-only baseline (struct zeroed)", () => {
  const out = concatWeighted([3, 4], [9, 9], 0);
  assert.deepEqual(out.map((x) => +x.toFixed(6)), [0.6, 0.8, 0, 0]);
});

test("concatWeighted: alpha=1 == structural-only (text zeroed)", () => {
  const out = concatWeighted([3, 4], [0, 5], 1);
  assert.deepEqual(out.map((x) => +x.toFixed(6)), [0, 0, 0, 1]);
});

test("concatWeighted: empty/zero struct block -> graceful text-only (no NaN)", () => {
  const out = concatWeighted([3, 4], [], 0.5);
  assert.deepEqual(out.map((x) => +x.toFixed(6)), [0.3, 0.4]);
  const out2 = concatWeighted([3, 4], [0, 0], 0.5); // zero struct contributes nothing
  assert.deepEqual(out2.map((x) => +x.toFixed(6)), [0.3, 0.4, 0, 0]);
  assert.ok(out2.every(Number.isFinite));
});

test("concatWeighted: alpha clamped to [0,1]; non-finite -> 0 (text-only)", () => {
  assert.deepEqual(concatWeighted([1], [1], 5).map((x) => +x.toFixed(6)), [0, 1]);   // clamp to 1
  assert.deepEqual(concatWeighted([1], [1], -5).map((x) => +x.toFixed(6)), [1, 0]);  // clamp to 0
  assert.deepEqual(concatWeighted([1], [1], NaN).map((x) => +x.toFixed(6)), [1, 0]); // -> 0
});

// ---------------------------------------------------------------------------
// loadEngineSources -- injected FS (hermetic)
// ---------------------------------------------------------------------------
test("loadEngineSources: walks injected tree, keeps *Engine.ts, skips tests/decls", () => {
  const tree = {
    "/eng": ["FooEngine.ts", "BarEngine.test.ts", "types.d.ts", "sub", "notes.md"],
    "/eng/sub": ["BazEngine.ts"],
  };
  const fileSrc = {
    "/eng/FooEngine.ts": "// foo",
    "/eng/sub/BazEngine.ts": "// baz",
  };
  const readdirImpl = (d) => tree[d.split("\\").join("/")] ?? tree[d] ?? [];
  const readFileImpl = (p) => {
    const key = p.split("\\").join("/");
    if (key in fileSrc) return fileSrc[key];
    throw new Error("ENOENT");
  };
  const statImpl = (p) => ({ isDirectory: () => !/\.[a-z]+$/i.test(p.split("\\").join("/")) });
  const out = loadEngineSources("/eng", { readdirImpl, readFileImpl, statImpl });
  assert.deepEqual([...out.keys()].sort(), ["BazEngine", "FooEngine"]);
  assert.equal(out.get("FooEngine"), "// foo");
});

test("loadEngineSources: missing dir / invalid arg -> empty map (fail-soft)", () => {
  assert.equal(loadEngineSources("", {}).size, 0);
  assert.equal(loadEngineSources(null).size, 0);
  const out = loadEngineSources("/nope", { readdirImpl: () => { throw new Error("ENOENT"); } });
  assert.equal(out.size, 0);
});

// ---------------------------------------------------------------------------
// dispatchersOf -- robustness to BOTH map shapes (P1 fix: no silent all-zero)
// ---------------------------------------------------------------------------
test("dispatchersOf: string | Set | array | invalid", () => {
  assert.deepEqual(dispatchersOf("prism_cam"), ["prism_cam"]);
  assert.deepEqual(dispatchersOf(""), []);
  assert.deepEqual(dispatchersOf(new Set(["prism_cam", "prism_calc", ""])), ["prism_cam", "prism_calc"]);
  assert.deepEqual(dispatchersOf(["prism_ai", 5, null]), ["prism_ai"]);
  assert.deepEqual(dispatchersOf(null), []);
  assert.deepEqual(dispatchersOf(undefined), []);
});

test("buildClassList + histogram accept the RAW Set-valued buildEngineDispatcherMap (no silent zero)", () => {
  // The canonical producer returns Map<engine, Set<dispatcher>>. Passing it directly must NOT
  // silently yield an empty class axis / all-zero histogram (the P1 measurement-honesty hazard).
  const setMap = new Map([
    ["N1", new Set(["prism_calc"])],
    ["N2", new Set(["prism_calc", "prism_cam"])], // multi-wired neighbour
  ]);
  assert.deepEqual(buildClassList(setMap), ["prism_calc", "prism_cam"]);
  const adj = new Map([["E", new Set(["N1", "N2"])]]);
  const hist = neighborDispatcherHistogram("E", adj, setMap);
  assert.equal(hist.get("prism_calc"), 2); // N1 + N2
  assert.equal(hist.get("prism_cam"), 1);  // N2's second class counts too
});

// ---------------------------------------------------------------------------
// directed-edge asymmetry (load-bearing: an undirected union would change every histogram)
// ---------------------------------------------------------------------------
test("adjacency is DIRECTED: E imports N -> E sees N's class, N does NOT see E's", () => {
  const sources = new Map([
    ["EEngine", 'import N from "./NEngine.js";'],
    ["NEngine", "export const x = 1;"], // N imports nothing
  ]);
  const adj = buildEngineImportAdjacencyFromSources(sources);
  const e2d = new Map([["EEngine", "prism_cam"], ["NEngine", "prism_calc"]]);
  // E's histogram sees N (prism_calc); N's histogram is empty (N imports nobody).
  assert.equal(neighborDispatcherHistogram("EEngine", adj, e2d).get("prism_calc"), 1);
  assert.equal(neighborDispatcherHistogram("NEngine", adj, e2d).size, 0);
});

// ---------------------------------------------------------------------------
// degree-ON separability: the appended degree scalar injects a class-agnostic floor, but
// same-class must still beat cross-class (the deployed default uses includeDegree:true)
// ---------------------------------------------------------------------------
test("structuralVector includeDegree:true -- degree floor present, same-class still > cross-class", () => {
  const adj = new Map([
    ["CalcA", new Set(["K1", "K2"])],
    ["CalcB", new Set(["K2", "K3"])],
    ["CamA", new Set(["M1", "M2"])],
  ]);
  const e2d = new Map([
    ["K1", "prism_calc"], ["K2", "prism_calc"], ["K3", "prism_calc"],
    ["M1", "prism_cam"], ["M2", "prism_cam"],
  ]);
  const cl = buildClassList(e2d);
  const vA = structuralVector("CalcA", adj, e2d, cl); // includeDegree default true
  const vB = structuralVector("CalcB", adj, e2d, cl);
  const vCam = structuralVector("CamA", adj, e2d, cl);
  assert.equal(vA.length, cl.length + 1, "degree dim appended");
  const same = cosine(vA, vB);
  const cross = cosine(vA, vCam);
  // The shared degree dim (all three have 2 neighbours -> identical degree feat) lifts BOTH cosines,
  // but same-class must remain strictly greater than cross-class -- the feature still separates.
  assert.ok(same > cross, `degree-ON: same ${same.toFixed(4)} must exceed cross ${cross.toFixed(4)}`);
  assert.ok(cross > 0, "degree floor present (cross-class cosine is non-zero with degree on)");
});

// ---------------------------------------------------------------------------
// known-limitation: commented-out imports ARE captured (matches sibling wired-engine-mapper)
// ---------------------------------------------------------------------------
test("extractImportedBasenames: commented import is captured (documented limitation)", () => {
  // NOT comment-aware by design (R11 parity with wired-engine-mapper.extractEngineImports).
  const src = '// import Ghost from "./GhostEngine.js";\nimport Real from "./RealEngine.js";';
  assert.deepEqual(extractImportedBasenames(src), ["GhostEngine", "RealEngine"]);
});
