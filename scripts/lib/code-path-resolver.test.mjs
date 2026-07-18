// code-path-resolver.test.mjs — proves the resolver actually resolves real nodes
// (the R12 "not a no-op" gate, per synthesis wf_7fae44ef-d77) + deterministic
// collision / fail-soft behavior.
//
// Two layers:
//   1. REAL-DATA: a deterministic 50-entry spread of the LIVE CODE_SYSTEM_INDEX is
//      resolved by basename + id-tail form; asserts ≥90% resolve AND 100% correct
//      path when resolved. This is the test that fails the instant the resolver
//      stops matching real engine/dispatcher labels (the embeddingHitCount=0 trap).
//   2. FIXTURE: a hand-built tmp index (via PRISM_CODE_SYSTEM_INDEX_PATH) pins the
//      ambiguity-refusal, id-tail, byName, and fail-soft contracts deterministically.
//
// Fresh module instance per test (distinct import URL) so the lib's mtime cache
// never leaks an index between cases.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const LIB = path.resolve(import.meta.dirname, "code-path-resolver.mjs");
const REAL_INDEX = path.resolve(import.meta.dirname, "..", "..", "mcp-server", "data", "docs", "CODE_SYSTEM_INDEX.json");

async function freshLib() {
  const url = "file://" + LIB.replace(/\\/g, "/") + "?t=" + Date.now() + "-" + Math.random();
  return await import(url);
}

function tmpIndex(codes) {
  const p = path.join(os.tmpdir(), `csi-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
  fs.writeFileSync(p, JSON.stringify({ _meta: { version: "test" }, codes }), "utf8");
  return p;
}

// =====================================================================
// REAL-DATA — the no-op guard against the live index.
// =====================================================================
test("real-data: basename + id-tail resolve to the entry's OWN path (≥90%, 100% correct)", async () => {
  delete process.env.PRISM_CODE_SYSTEM_INDEX_PATH; // use the live default index
  const lib = await freshLib();
  const idx = JSON.parse(fs.readFileSync(REAL_INDEX, "utf8"));
  const all = Object.values(idx.codes).filter((c) => c && typeof c.path === "string");
  assert.ok(all.length > 100, "live index should carry thousands of code entries");
  // deterministic spread sample of ~50 (every Nth — no Math.random in the assertion path)
  const step = Math.max(1, Math.floor(all.length / 50));
  const sample = all.filter((_, i) => i % step === 0).slice(0, 50);
  let resolved = 0;
  for (const c of sample) {
    const base = String(c.path).split("/").pop().replace(/\.[^.]+$/, "");
    const r = lib.resolveCodePath(base);
    if (r) {
      resolved++;
      assert.equal(r.path, c.path, `basename "${base}" resolved to a WRONG path`);
      // id-tail form ("eng.x.<base>") must resolve identically — proves the
      // find-cache dotted-id consumer path works, not just the display label.
      // Gated to dot-free basenames: test-file basenames ("X.test") have an
      // internal dot, so the synthetic dotted id's last-segment tail is "test";
      // those still resolve via the label/raw key (asserted above), just not via
      // the dot-split id-tail — which is the engine/dispatcher case the seam serves.
      if (!base.includes(".")) {
        assert.deepEqual(lib.resolveCodePath("eng.x." + base.toLowerCase()), r, "id-tail must match basename resolution");
      }
    }
  }
  assert.ok(resolved >= 45, `no-op guard: expected ≥45/50 real code nodes to resolve, got ${resolved}`);
});

// =====================================================================
// FIXTURE — deterministic contracts.
// =====================================================================
test("fixture: byName (suffix-stripped) AND byBasename both resolve", async () => {
  const p = tmpIndex({
    E1: { code: "E1", path: "src/engines/AHPEngine.ts", name: "AHP", category: "E" },
    D1: { code: "D1", path: "src/tools/dispatchers/calcDispatcher.ts", name: "calcDispatcher", category: "D" },
  });
  process.env.PRISM_CODE_SYSTEM_INDEX_PATH = p;
  try {
    const lib = await freshLib();
    assert.deepEqual(lib.resolveCodePath("AHP"), { path: "src/engines/AHPEngine.ts", repoPath: "mcp-server/src/engines/AHPEngine.ts", code: "E1", type: "engine" }, "stripped name → byName");
    assert.deepEqual(lib.resolveCodePath("AHPEngine"), { path: "src/engines/AHPEngine.ts", repoPath: "mcp-server/src/engines/AHPEngine.ts", code: "E1", type: "engine" }, "class name → byBasename");
    assert.equal(lib.resolveCodePath("calcDispatcher").path, "src/tools/dispatchers/calcDispatcher.ts");
    assert.equal(lib.resolveCodePath("calcDispatcher").type, "dispatcher", "category D → type dispatcher");
    assert.ok(lib.resolveCodePath("ahpengine"), "case-insensitive");
    assert.ok(!("line" in lib.resolveCodePath("AHP")), "no `line` key unless withLine requested");
  } finally { delete process.env.PRISM_CODE_SYSTEM_INDEX_PATH; fs.unlinkSync(p); }
});

test("fixture: id-tail form ('eng.calc.cuttingforceengine') resolves to the basename path", async () => {
  const p = tmpIndex({
    E1: { code: "E1", path: "src/engines/CuttingForceEngine.ts", name: "CuttingForce", category: "E" },
  });
  process.env.PRISM_CODE_SYSTEM_INDEX_PATH = p;
  try {
    const lib = await freshLib();
    assert.equal(lib.resolveCodePath("eng.calc.cuttingforceengine").path, "src/engines/CuttingForceEngine.ts");
    assert.equal(lib.idTail("eng.calc.cuttingforceengine"), "cuttingforceengine");
    assert.equal(lib.idTail("PlainLabel"), "PlainLabel");
    assert.equal(lib.idTail(null), "");
  } finally { delete process.env.PRISM_CODE_SYSTEM_INDEX_PATH; fs.unlinkSync(p); }
});

test("fixture: a colliding basename (2 distinct paths) is AMBIGUOUS → null (never a guessed path)", async () => {
  const p = tmpIndex({
    E1: { code: "E1", path: "src/engines/Foo.ts", name: "FooA", category: "E" },
    A1: { code: "A1", path: "src/algorithms/Foo.ts", name: "FooB", category: "A" },
  });
  process.env.PRISM_CODE_SYSTEM_INDEX_PATH = p;
  try {
    const lib = await freshLib();
    assert.equal(lib.resolveCodePath("Foo"), null, "basename 'Foo' maps to 2 paths → refuse");
    // but the unambiguous stripped names still resolve
    assert.equal(lib.resolveCodePath("FooA").path, "src/engines/Foo.ts");
    assert.equal(lib.resolveCodePath("FooB").path, "src/algorithms/Foo.ts");
  } finally { delete process.env.PRISM_CODE_SYSTEM_INDEX_PATH; fs.unlinkSync(p); }
});

test("fixture: unindexed name → null (fail-soft, no throw)", async () => {
  const p = tmpIndex({ E1: { code: "E1", path: "src/engines/AHPEngine.ts", name: "AHP", category: "E" } });
  process.env.PRISM_CODE_SYSTEM_INDEX_PATH = p;
  try {
    const lib = await freshLib();
    assert.equal(lib.resolveCodePath("viz-first-redirect"), null, "a hook (not in src/ code index) → null");
    assert.equal(lib.resolveCodePath("TotallyMadeUpEngine"), null);
    assert.equal(lib.resolveCodePath(""), null);
    assert.equal(lib.resolveCodePath(null), null);
    assert.equal(lib.resolveCodePath(42), null);
  } finally { delete process.env.PRISM_CODE_SYSTEM_INDEX_PATH; fs.unlinkSync(p); }
});

test("fixture: missing / malformed index → null (fail-soft, never throws)", async () => {
  // missing file
  process.env.PRISM_CODE_SYSTEM_INDEX_PATH = path.join(os.tmpdir(), `nope-${Date.now()}.json`);
  try {
    const lib = await freshLib();
    assert.equal(lib.resolveCodePath("AHPEngine"), null, "missing index → null");
  } finally { delete process.env.PRISM_CODE_SYSTEM_INDEX_PATH; }
  // malformed JSON
  const bad = path.join(os.tmpdir(), `bad-${Date.now()}.json`);
  fs.writeFileSync(bad, "{ not json", "utf8");
  process.env.PRISM_CODE_SYSTEM_INDEX_PATH = bad;
  try {
    const lib = await freshLib();
    assert.equal(lib.resolveCodePath("AHPEngine"), null, "malformed index → null");
  } finally { delete process.env.PRISM_CODE_SYSTEM_INDEX_PATH; fs.unlinkSync(bad); }
});

// =====================================================================
// EXTENSION — type, byCode shortcode, opt-in line (U-SV-NODE-PATH-TEMPLATE).
// =====================================================================
test("ext: DSL shortcode (byCode) resolves directly to path + type", async () => {
  const p = tmpIndex({
    E0001: { code: "E0001", path: "src/engines/AHPEngine.ts", name: "AHP", category: "E" },
    A0003: { code: "A0003", path: "src/algorithms/Kienzle.ts", name: "Kienzle", category: "A" },
  });
  process.env.PRISM_CODE_SYSTEM_INDEX_PATH = p;
  try {
    const lib = await freshLib();
    // shortcode is NOT a name/basename — only byCode can resolve it
    assert.deepEqual(lib.resolveCodePath("E0001"), { path: "src/engines/AHPEngine.ts", repoPath: "mcp-server/src/engines/AHPEngine.ts", code: "E0001", type: "engine" }, "shortcode → path");
    assert.equal(lib.resolveCodePath("e0001").path, "src/engines/AHPEngine.ts", "shortcode case-insensitive");
    assert.equal(lib.resolveCodePath("A0003").type, "algorithm", "category A → type algorithm");
    assert.equal(lib.resolveCodePath("Z9999"), null, "unknown shortcode → null");
  } finally { delete process.env.PRISM_CODE_SYSTEM_INDEX_PATH; fs.unlinkSync(p); }
});

test("ext: categoryToType maps known prefixes + falls back to lowercase", async () => {
  const lib = await freshLib();
  assert.equal(lib.__test.categoryToType("E"), "engine");
  assert.equal(lib.__test.categoryToType("d"), "dispatcher", "case-insensitive prefix");
  assert.equal(lib.__test.categoryToType("RG"), "registry");
  assert.equal(lib.__test.categoryToType("ZZ"), "zz", "unknown → lowercased passthrough");
  assert.equal(lib.__test.categoryToType(null), null);
  assert.equal(lib.__test.categoryToType(""), null);
});

test("ext: withLine resolves the export declaration line (one source-file read)", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "csi-src-"));
  fs.mkdirSync(path.join(root, "src", "engines"), { recursive: true });
  // line 1 = comment, 2 = import, 3 = `export class FooEngine`, 5 = singleton.
  fs.writeFileSync(
    path.join(root, "src", "engines", "FooEngine.ts"),
    "// header\nimport { x } from './x.js';\nexport class FooEngine {\n  run() {}\n}\nexport const fooEngine = new FooEngine();\n",
    "utf8"
  );
  const p = tmpIndex({ E1: { code: "E1", path: "src/engines/FooEngine.ts", name: "Foo", category: "E" } });
  process.env.PRISM_CODE_SYSTEM_INDEX_PATH = p;
  process.env.PRISM_CODE_SYSTEM_SRC_ROOT = root;
  try {
    const lib = await freshLib();
    const r = lib.resolveCodePath("FooEngine", { withLine: true });
    assert.equal(r.path, "src/engines/FooEngine.ts");
    assert.equal(r.type, "engine");
    assert.equal(r.line, 3, "should point at `export class FooEngine`");
    // default (no opts) must NOT carry a line key and must NOT read the source file
    assert.ok(!("line" in lib.resolveCodePath("FooEngine")), "no line without opt-in");
  } finally {
    delete process.env.PRISM_CODE_SYSTEM_INDEX_PATH;
    delete process.env.PRISM_CODE_SYSTEM_SRC_ROOT;
    fs.unlinkSync(p);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("ext: withLine fails soft when the source file is absent (path kept, line null)", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "csi-src-"));
  const p = tmpIndex({ E1: { code: "E1", path: "src/engines/GoneEngine.ts", name: "Gone", category: "E" } });
  process.env.PRISM_CODE_SYSTEM_INDEX_PATH = p;
  process.env.PRISM_CODE_SYSTEM_SRC_ROOT = root; // file does not exist under root
  try {
    const lib = await freshLib();
    const r = lib.resolveCodePath("GoneEngine", { withLine: true });
    assert.equal(r.path, "src/engines/GoneEngine.ts", "path still resolved");
    assert.equal(r.line, null, "missing source → line null, never throws");
  } finally {
    delete process.env.PRISM_CODE_SYSTEM_INDEX_PATH;
    delete process.env.PRISM_CODE_SYSTEM_SRC_ROOT;
    fs.unlinkSync(p);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("ext: withLine falls back to first top-level export when named decl is absent", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "csi-src-"));
  fs.mkdirSync(path.join(root, "src", "registries"), { recursive: true });
  // No `export ... ToolRegistry` decl; first export is on line 2.
  fs.writeFileSync(
    path.join(root, "src", "registries", "ToolRegistry.ts"),
    "const internal = 1;\nexport const REGISTRY = {};\n",
    "utf8"
  );
  const p = tmpIndex({ RG1: { code: "RG1", path: "src/registries/ToolRegistry.ts", name: "Tool", category: "RG" } });
  process.env.PRISM_CODE_SYSTEM_INDEX_PATH = p;
  process.env.PRISM_CODE_SYSTEM_SRC_ROOT = root;
  try {
    const lib = await freshLib();
    const r = lib.resolveCodePath("ToolRegistry", { withLine: true });
    assert.equal(r.type, "registry");
    assert.equal(r.line, 2, "fallback to first `export` line");
  } finally {
    delete process.env.PRISM_CODE_SYSTEM_INDEX_PATH;
    delete process.env.PRISM_CODE_SYSTEM_SRC_ROOT;
    fs.unlinkSync(p);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// =====================================================================
// repoPath — the directly-Readable path (P1 fix: bare src/... opened the
// untracked top-level dup; repoPath = <_meta.root>/path is the canonical source).
// =====================================================================
test("repoPath: respects a custom _meta.root; defaults to mcp-server when absent", async () => {
  // custom root
  let p = path.join(os.tmpdir(), `csi-root-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.json`);
  fs.writeFileSync(p, JSON.stringify({ _meta: { root: "packages/core/" }, codes: { E1: { code: "E1", path: "src/X.ts", name: "X", category: "E" } } }), "utf8");
  process.env.PRISM_CODE_SYSTEM_INDEX_PATH = p;
  try {
    let lib = await freshLib();
    const r = lib.resolveCodePath("X");
    assert.equal(r.path, "src/X.ts", "path stays index-root-relative (back-compat)");
    assert.equal(r.repoPath, "packages/core/src/X.ts", "repoPath honors _meta.root (trailing slash stripped)");
  } finally { delete process.env.PRISM_CODE_SYSTEM_INDEX_PATH; fs.unlinkSync(p); }
  // absent root → default "mcp-server"
  p = tmpIndex({ E1: { code: "E1", path: "src/X.ts", name: "X", category: "E" } });
  process.env.PRISM_CODE_SYSTEM_INDEX_PATH = p;
  try {
    const lib = await freshLib();
    assert.equal(lib.resolveCodePath("X").repoPath, "mcp-server/src/X.ts", "absent root → documented default");
  } finally { delete process.env.PRISM_CODE_SYSTEM_INDEX_PATH; fs.unlinkSync(p); }
});

test("repoPath: real engines resolve to a path that EXISTS from the repo root (not the untracked dup)", async () => {
  delete process.env.PRISM_CODE_SYSTEM_INDEX_PATH;
  const lib = await freshLib();
  const repoRoot = path.resolve(import.meta.dirname, "..", "..");
  for (const name of ["CuttingForceEngine", "AHPEngine"]) {
    const r = lib.resolveCodePath(name);
    assert.ok(r, `${name} must resolve`);
    assert.ok(r.repoPath.startsWith("mcp-server/"), `repoPath must carry the mcp-server/ prefix — got ${r.repoPath}`);
    assert.equal(r.repoPath, "mcp-server/" + r.path, "repoPath = root + path");
    // The load-bearing guard for the P1: the emitted path, read from the repo root,
    // must open a REAL file (the canonical mcp-server/src/... source — not the
    // git-ignored top-level src/ dup, and not a 404 on a clean tree).
    assert.ok(fs.existsSync(path.join(repoRoot, r.repoPath)), `repoPath ${r.repoPath} must exist from repo root`);
  }
});
