// scripts/lib/raw-graph-parse-guard.test.mjs
//
// Tests the pure scanner (positive/negative/adversarial) AND asserts the live
// invariant: ZERO scripts raw-parse the merged system-graph.json. The fleet
// assertion is the regression LOCK -- if a future edit reintroduces a raw
// `JSON.parse(readFileSync(<merged-graph>, "utf8"))`, this test fails loud.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scanForRawGraphParse, mergedGraphPathBindings, scanDirForRawGraphParse, scanTreeForRawGraphParse, defaultScanRoots, SCAN_ROOTS_REL } from "./raw-graph-parse-guard.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = join(HERE, "..");        // scripts/
const SCRIPTS_LIB_DIR = HERE;                 // scripts/lib/

// -- POSITIVE: the exact crash pattern is flagged --------------------------

test("flags a var-aliased raw utf8 parse of the merged graph", () => {
  const src = `
    const SYSTEM_GRAPH = \`\${ROOT}/state/shared/system-viz/system-graph.json\`;
    const g = JSON.parse(readFileSync(SYSTEM_GRAPH, "utf8"));
  `;
  const v = scanForRawGraphParse(src, "bad.mjs");
  assert.equal(v.length, 1);
  assert.match(v[0], /MERGED system-graph\.json/);
});

test("flags a bare-literal raw utf8 parse of the merged graph", () => {
  const src = `const g = JSON.parse(readFileSync("state/shared/system-viz/system-graph.json", "utf8"));`;
  const v = scanForRawGraphParse(src, "bad2.mjs");
  assert.equal(v.length, 1);
});

test("flags fs.readFileSync + utf-8 (dotted + dashed) variant", () => {
  const src = `
    const SG = "/x/system-graph.json";
    const g = JSON.parse(fs.readFileSync(SG, 'utf-8'));
  `;
  assert.equal(scanForRawGraphParse(src, "bad3.mjs").length, 1);
});

// -- NEGATIVE: safe / irrelevant reads are NOT flagged ---------------------

test("does NOT flag the small architecture-graph.json", () => {
  const src = `
    const ARCH = "/x/architecture-graph.json";
    const g = JSON.parse(readFileSync(ARCH, "utf8"));
  `;
  assert.deepEqual(scanForRawGraphParse(src, "arch.mjs"), []);
});

test("does NOT flag the system-graph-index.json sidecar", () => {
  const src = `
    const SIDECAR = "/x/system-graph-index.json";
    const g = JSON.parse(readFileSync(SIDECAR, "utf8"));
  `;
  assert.deepEqual(scanForRawGraphParse(src, "sidecar.mjs"), []);
});

test("does NOT flag a file that uses the cap-safe readGraphStreaming (exempt)", () => {
  const src = `
    import { readGraphStreaming } from "./graph-io.mjs";
    const SG = "/x/system-graph.json";
    const g = readGraphStreaming(SG);
  `;
  assert.deepEqual(scanForRawGraphParse(src, "safe.mjs"), []);
});

test("does NOT flag a commented-out raw parse (comment-stripped)", () => {
  const src = `
    const SG = "/x/system-graph.json";
    // const g = JSON.parse(readFileSync(SG, "utf8")); // old dangerous way
    /* JSON.parse(readFileSync(SG, "utf8")) */
  `;
  assert.deepEqual(scanForRawGraphParse(src, "commented.mjs"), []);
});

test("does NOT flag a Buffer read (no utf8 string materialization)", () => {
  const src = `
    const SG = "/x/system-graph.json";
    const buf = readFileSync(SG); const g = JSON.parse(buf.toString("utf8", 0, 10));
  `;
  // No JSON.parse(readFileSync(SG, "utf8")) direct form -> not flagged.
  assert.deepEqual(scanForRawGraphParse(src, "buffer.mjs"), []);
});

test("does NOT flag a file that never touches the merged graph", () => {
  const src = `const cfg = JSON.parse(readFileSync("config.json", "utf8"));`;
  assert.deepEqual(scanForRawGraphParse(src, "unrelated.mjs"), []);
});

test("does NOT flag a loop-reused var name (scope-ambiguous false positive)", () => {
  // Mirrors psn-synergy-collect.mjs: `path` is a loop var over SMALL files in
  // one fn AND the merged-graph var (read via a bounded-head reader) in another.
  // A flat scanner must not conflate the two scopes.
  const src = `
    function legA() {
      for (const path of candidates) {
        if (statSync(path).size > 8e6) { streamCount(path); continue; }
        const j = JSON.parse(readFileSync(path, "utf8")); // small candidate only
      }
    }
    function legB() {
      const path = resolve(ROOT, "state/shared/system-viz/system-graph.json");
      const meta = readJsonMetadataHead(path); // bounded-head, never raw-parsed
    }
  `;
  assert.deepEqual(scanForRawGraphParse(src, "psn-like.mjs"), []);
});

// -- mergedGraphPathBindings unit ------------------------------------------

test("mergedGraphPathBindings: binds merged graph var, not arch/index", () => {
  const { vars } = mergedGraphPathBindings(`
    const A = "/x/system-graph.json";
    const B = "/x/architecture-graph.json";
    const C = "/x/system-graph-index.json";
  `);
  assert.ok(vars.has("A"));
  assert.ok(!vars.has("B"));
  assert.ok(!vars.has("C"));
});

// -- adversarial: empty / non-string never throws --------------------------

test("safe on empty / non-string input", () => {
  for (const bad of ["", null, undefined, 42, {}]) {
    assert.deepEqual(scanForRawGraphParse(bad, "x"), []);
  }
});

// -- scanDirForRawGraphParse: dir walk skips fixtures, flags bad files ------

test("scanDirForRawGraphParse: skips *.test.mjs fixtures, flags a real .mjs", () => {
  const files = {
    "bad.mjs": `const SG = "/x/system-graph.json"; const j = JSON.parse(readFileSync(SG, "utf8"));`,
    "good.mjs": `import { readGraphStreaming } from "./graph-io.mjs"; const SG = "/x/system-graph.json"; const g = readGraphStreaming(SG);`,
    "fixture.test.mjs": `const SG = "/x/system-graph.json"; JSON.parse(readFileSync(SG, "utf8"));`,
  };
  const listDir = () => Object.keys(files);
  const readFile = (p) => files[p.split("/").pop()];
  const v = scanDirForRawGraphParse("d", readFile, listDir);
  assert.equal(v.length, 1);
  assert.match(v[0], /bad\.mjs/);
});

test("scanDirForRawGraphParse: unreadable dir / file degrades to empty (no throw)", () => {
  assert.deepEqual(scanDirForRawGraphParse("d", () => { throw new Error("x"); }, () => { throw new Error("y"); }), []);
});

// -- scanTreeForRawGraphParse: recursive walk (DI'd, in-memory) -------------

test("scanTreeForRawGraphParse: recurses subdirs, flags nested bad, skips test+node_modules+safe", () => {
  const dirEntries = {
    "root": [{ name: "keep.mjs", isDir: false }, { name: "sub", isDir: true }, { name: "node_modules", isDir: true }],
    "root/sub": [{ name: "bad.mjs", isDir: false }, { name: "frag.test.mjs", isDir: false }],
    "root/node_modules": [{ name: "dep.mjs", isDir: false }],
  };
  const fileSrc = {
    "root/keep.mjs": `import { readGraphStreaming } from "y"; const SG = "/x/system-graph.json"; readGraphStreaming(SG);`,
    "root/sub/bad.mjs": `const SG = "/x/system-graph.json"; const j = JSON.parse(readFileSync(SG, "utf8"));`,
    "root/sub/frag.test.mjs": `const SG = "/x/system-graph.json"; JSON.parse(readFileSync(SG, "utf8"));`,
    "root/node_modules/dep.mjs": `const SG = "/x/system-graph.json"; const j = JSON.parse(readFileSync(SG, "utf8"));`,
  };
  const listEntries = (d) => dirEntries[d] || [];
  const readFile = (p) => { if (!(p in fileSrc)) throw new Error("nf"); return fileSrc[p]; };
  const v = scanTreeForRawGraphParse("root", readFile, listEntries);
  assert.equal(v.length, 1);                 // ONLY the nested bad.mjs (keep=safe, frag=test, node_modules=skipped)
  assert.match(v[0], /root\/sub\/bad\.mjs/);
});

test("scanTreeForRawGraphParse: skips scratch (.tmp-/__tmp) files and symlinks (cross-slot false-block + cycle guard)", () => {
  const dirEntries = {
    "root": [
      { name: ".tmp-scratch.mjs", isDir: false },          // untracked scratch -> skip
      { name: "__tmp_probe.mjs", isDir: false },           // probe scratch -> skip
      { name: "link.mjs", isDir: false, isSymlink: true }, // symlinked file -> skip
      { name: "linkdir", isDir: true, isSymlink: true },   // symlinked dir -> do not recurse
      { name: "real.mjs", isDir: false },                  // committed, cap-safe -> exempt
    ],
    "root/linkdir": [{ name: "evil.mjs", isDir: false }],  // must never be reached
  };
  const RAW = `const SG = "/x/system-graph.json"; const j = JSON.parse(readFileSync(SG, "utf8"));`;
  const fileSrc = {
    "root/.tmp-scratch.mjs": RAW,
    "root/__tmp_probe.mjs": RAW,
    "root/link.mjs": RAW,
    "root/linkdir/evil.mjs": RAW,
    "root/real.mjs": `import { readGraphStreaming } from "y"; readGraphStreaming("/x/system-graph.json");`,
  };
  const listEntries = (d) => dirEntries[d] || [];
  const readFile = (p) => { if (!(p in fileSrc)) throw new Error("nf"); return fileSrc[p]; };
  // Every violator is scratch or behind a symlink -> all skipped; real.mjs is cap-safe -> 0.
  assert.deepEqual(scanTreeForRawGraphParse("root", readFile, listEntries), []);
});

test("scanTreeForRawGraphParse: unreadable root -> [] (no throw)", () => {
  assert.deepEqual(
    scanTreeForRawGraphParse("x", () => { throw new Error("y"); }, () => { throw new Error("z"); }),
    [],
  );
});

test("SCAN_ROOTS_REL covers .claude/hooks (the dir the scripts/-only scope missed)", () => {
  assert.ok(SCAN_ROOTS_REL.includes(".claude/hooks"));
  assert.ok(SCAN_ROOTS_REL.includes("scripts"));
  assert.deepEqual(defaultScanRoots("H:/prism").includes("H:/prism/.claude/hooks"), true);
});

// -- FLEET LOCK: zero file in ANY scan root raw-parses the merged graph ------

const REPO_ROOT = join(HERE, "..", "..");
function realListEntries(d) {
  return readdirSync(d, { withFileTypes: true }).map((e) => ({ name: e.name, isDir: e.isDirectory(), isSymlink: e.isSymbolicLink() }));
}

test("FLEET LOCK: no file in any scan root raw-parses the merged system-graph.json", () => {
  const rf = (p) => readFileSync(p, "utf8");
  const violations = defaultScanRoots(REPO_ROOT).flatMap((root) =>
    existsSync(root) ? scanTreeForRawGraphParse(root, rf, realListEntries) : [],
  );
  assert.deepEqual(
    violations,
    [],
    `Raw merged-graph utf8 parse(s) reintroduced -- will crash on the 512MiB string cap. `
    + `Route through readGraphStreaming (scripts/lib/graph-io.mjs):\n${violations.join("\n")}`,
  );
});
