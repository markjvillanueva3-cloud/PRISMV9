// Tests for viz-dual-registration-audit.mjs. Hermetic: each case builds a mini repo in a tmp dir
// (its own scripts/ + merge + generator stubs) and asserts the structured report -- no dependency on
// the live repo. Run directly: `node scripts/lib/viz-dual-registration-audit.test.mjs` (node:test
// auto-runs on exit; `node --test` reports 0 in this env per the harness note).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  auditDualRegistration,
  parseGeneratorArray,
  parseLoadOptional,
  extractGeneratorOutputs,
} from "./viz-dual-registration-audit.mjs";

/** Build a tmp repo: { fast:[], heavy:[], merge:[loadOptional names], gens:{file:src}, onDisk:[] }. */
function makeRepo({ fast = [], heavy = [], merge = [], gens = {}, onDisk = [] }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vizdr-"));
  const scriptsDir = path.join(root, "scripts");
  const libDir = path.join(scriptsDir, "lib");
  const vizDir = path.join(root, "state/shared/system-viz");
  fs.mkdirSync(libDir, { recursive: true });
  fs.mkdirSync(vizDir, { recursive: true });
  const arr = (name, items) => `const ${name} = [\n${items.map((i) => `  "${i}",`).join("\n")}\n];`;
  fs.writeFileSync(path.join(scriptsDir, "regen-viz.mjs"), `${arr("FAST", fast)}\n${arr("HEAVY", heavy)}\n`);
  fs.writeFileSync(
    path.join(scriptsDir, "merge-augmentations.mjs"),
    `function loadOptional(n){return null;}\n${merge.map((m) => `const x = loadOptional("${m}");`).join("\n")}\n`,
  );
  for (const [file, src] of Object.entries(gens)) fs.writeFileSync(path.join(scriptsDir, file), src);
  for (const f of onDisk) fs.writeFileSync(path.join(vizDir, f), "{}");
  return { root, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

// a generator that writes "<name>" via writeFileSync(OUT)
const genWrite = (name) =>
  `import fs from "node:fs";\nimport path from "node:path";\nconst VIZ_DIR = "state/shared/system-viz";\nconst OUT = path.join(VIZ_DIR, "${name}");\nfs.writeFileSync(OUT, "{}");\n`;
// a generator that writes its primary augmentation via atomicWriteText(OUT) + a side file via writeFileSync
const genAtomic = (name) =>
  `import { atomicWriteText } from "./lib/atomic-json.mjs";\nimport fs from "node:fs";\nimport path from "node:path";\nconst VIZ_DIR = "state/shared/system-viz";\nconst OUT = path.join(VIZ_DIR, "${name}");\nfs.writeFileSync(path.join(VIZ_DIR, ".${name}.baseline.json"), "{}");\natomicWriteText(OUT, "{}");\n`;
// a generator that writes a json via a runtime variable only (output unresolvable)
const genUnverifiable =
  `import fs from "node:fs";\nimport path from "node:path";\nconst VIZ_DIR = "state/shared/system-viz";\nconst nm = compute();\nfs.writeFileSync(path.join(VIZ_DIR, nm + ".json"), "{}");\n`;

test("clean: dual-registered generator (FAST + merge loadOptional) -> no issues", () => {
  const { root, cleanup } = makeRepo({
    fast: ["generate-good-features.mjs"],
    merge: ["good-features.json"],
    gens: { "generate-good-features.mjs": genWrite("good-features.json") },
  });
  const r = auditDualRegistration({ root });
  cleanup();
  assert.equal(r.summary.silentDiscards, 0);
  assert.equal(r.summary.crashRisks, 0);
  assert.equal(r.summary.orphanGenerators, 0);
  assert.equal(r.summary.clean, true);
});

test("crash-risk: FAST entry whose generator file does not exist", () => {
  const { root, cleanup } = makeRepo({ fast: ["generate-ghost-features.mjs"], merge: [] });
  const r = auditDualRegistration({ root });
  cleanup();
  assert.deepEqual(r.crashRisks, ["generate-ghost-features.mjs"]);
  assert.equal(r.summary.clean, false);
});

test("silent-discard: in FAST, emits augmentation, merge has NO loadOptional", () => {
  const { root, cleanup } = makeRepo({
    fast: ["generate-discard-features.mjs"],
    merge: [],
    gens: { "generate-discard-features.mjs": genWrite("discard-features.json") },
  });
  const r = auditDualRegistration({ root });
  cleanup();
  assert.equal(r.silentDiscards.length, 1);
  assert.equal(r.silentDiscards[0].file, "generate-discard-features.mjs");
  assert.deepEqual(r.silentDiscards[0].outputs, ["discard-features.json"]);
});

test("orphan: emits a fold output but is NOT in FAST -> never runs", () => {
  const { root, cleanup } = makeRepo({
    fast: [],
    merge: ["orphan-features.json"],
    gens: { "generate-orphan-features.mjs": genWrite("orphan-features.json") },
    onDisk: ["orphan-features.json"],
  });
  const r = auditDualRegistration({ root });
  cleanup();
  assert.equal(r.orphanGenerators.length, 1);
  assert.equal(r.orphanGenerators[0].file, "generate-orphan-features.mjs");
});

test("dangling consumer: merge loadOptional with no producer and not on disk", () => {
  const { root, cleanup } = makeRepo({ fast: [], merge: ["dangling-thing.json"], gens: {}, onDisk: [] });
  const r = auditDualRegistration({ root });
  cleanup();
  assert.deepEqual(r.danglingConsumers, ["dangling-thing.json"]);
});

test("adversarial: atomicWriteText(OUT) primary output is captured -> NOT a false discard", () => {
  // this is the cross-substrate v1 false-positive: primary written via atomicWriteText (not writeFileSync).
  const { root, cleanup } = makeRepo({
    fast: ["generate-atomic-features.mjs"],
    merge: ["atomic-features.json"],
    gens: { "generate-atomic-features.mjs": genAtomic("atomic-features.json") },
  });
  const r = auditDualRegistration({ root });
  cleanup();
  assert.equal(r.silentDiscards.length, 0, "atomicWriteText primary output must be recognized as consumed");
});

test("unverifiable: writes a json via a runtime var (output cannot be pinned)", () => {
  const { root, cleanup } = makeRepo({
    fast: ["generate-unverifiable-features.mjs"],
    merge: [],
    gens: { "generate-unverifiable-features.mjs": genUnverifiable },
  });
  const r = auditDualRegistration({ root });
  cleanup();
  assert.equal(r.summary.unverifiable, 1);
  assert.equal(r.summary.silentDiscards, 0, "unverifiable must NOT be asserted as a discard (R12)");
});

test("dashboard generator (non-fold json) is out of scope -> not flagged orphan", () => {
  const dash = `import fs from "node:fs";\nconst VIZ_DIR="state/shared/system-viz";\nfs.writeFileSync(VIZ_DIR+"/dashboard-data.json","{}");\n`;
  const { root, cleanup } = makeRepo({ fast: [], merge: [], gens: { "generate-dashboard.mjs": dash } });
  const r = auditDualRegistration({ root });
  cleanup();
  assert.equal(r.orphanGenerators.length, 0, "a non-fold json writer is not a graph-fold producer");
});

test("parseGeneratorArray skips commented-out entries", () => {
  const src = `const FAST = [\n  "generate-a.mjs",\n  // "generate-removed.mjs",\n  "generate-b.mjs",  // inline comment kept\n];`;
  assert.deepEqual(parseGeneratorArray(src, "FAST"), ["generate-a.mjs", "generate-b.mjs"]);
});

test("parseGeneratorArray: brackets inside comments never truncate the array (robust extractArrayBody)", () => {
  // A `[`/`]` inside a // comment must be ignored when finding the array bounds. The old raw
  // bracket-count drove depth past 0 on the UNBALANCED `[` below -> never reached depth 0 ->
  // returned null -> []. This is the same comment-bracket class that broke the drift-guard regex.
  const src = [
    "const HEAVY = [",
    '  "generate-a.mjs",  // too slow for FAST[] but ok',        // balanced [] in a comment
    '  "generate-b.mjs",  // [deprecated -- an UNBALANCED [ here', // unbalanced [ in a comment
    '  "generate-c.mjs",',
    "];",
  ].join("\n");
  assert.deepEqual(parseGeneratorArray(src, "HEAVY"), ["generate-a.mjs", "generate-b.mjs", "generate-c.mjs"]);
});

test("parseLoadOptional collects all loadOptional json names", () => {
  const src = `const a = loadOptional("one-augmentation.json");\nconst b = loadOptional('two-features.json');`;
  const s = parseLoadOptional(src);
  assert.equal(s.has("one-augmentation.json"), true);
  assert.equal(s.has("two-features.json"), true);
});

test("extractGeneratorOutputs: convention fallback captures *-augmentation.json const", () => {
  const src = `const OUT = path.join(VIZ_DIR, "thing-augmentation.json");\nsomeCustomWriter(OUT, data);`;
  const { outputs } = extractGeneratorOutputs(src);
  assert.equal(outputs.has("thing-augmentation.json"), true);
});

test("extractGeneratorOutputs: read-only input augmentation is NOT counted as output", () => {
  const src = `const inp = path.join(VIZ_DIR, "other-augmentation.json");\nconst data = loadJson(inp);`;
  const { outputs } = extractGeneratorOutputs(src);
  assert.equal(outputs.has("other-augmentation.json"), false);
});

test("extractGeneratorOutputs: resolves a slash-path OUT_PATH basename (U-VIZ-XGAL-DUALREG-PATHRESOLVE)", () => {
  // the common idiom: `export const OUT_PATH = path.join(ROOT, "state/shared/system-viz/x.json")`
  // -- a SINGLE string literal carrying slashes. Pre-fix the basename failed to pin -> resolvable:false
  // -> false "unverifiable" (this is exactly what hid the octopus-consensus + GNN-predicted-edges
  // cross-galaxy roosts, which ARE spliced).
  const src = `export const OUT_PATH = path.join(ROOT, "state/shared/system-viz/slashed-augmentation.json");\nfs.writeFileSync(OUT_PATH, "{}");`;
  const r = extractGeneratorOutputs(src);
  assert.equal(r.outputs.has("slashed-augmentation.json"), true, "slash-path basename pinned");
  assert.equal(r.resolvable, true, "resolvable once the basename is captured");
});

test("extractGeneratorOutputs: a `|| CONST` read-fallback input is NOT counted as an output", () => {
  // predicted-edges reads its input via `opts.edgesPath || EDGES_PATH` -- a slash-path INPUT const that
  // must NOT be mis-credited as a produced augmentation (a latent false-negative that would mask a real
  // dangling if the genuine producer were dropped). Only the generator's OWN written output counts.
  const src = `export const EDGES_PATH = path.join(ROOT, "state/shared/system-viz/edges-in-augmentation.json");\nexport const WROTE_PATH = path.join(ROOT, "state/shared/system-viz/edges-out-augmentation.json");\nconst edgesPath = opts.edgesPath || EDGES_PATH;\nconst data = JSON.parse(fs.readFileSync(edgesPath, "utf8"));\nfs.writeFileSync(WROTE_PATH, "{}");`;
  const r = extractGeneratorOutputs(src);
  assert.equal(r.outputs.has("edges-out-augmentation.json"), true, "own written output present");
  assert.equal(r.outputs.has("edges-in-augmentation.json"), false, "|| read-fallback input excluded");
});
