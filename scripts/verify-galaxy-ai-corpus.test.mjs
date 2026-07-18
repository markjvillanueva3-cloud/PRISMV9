// scripts/verify-galaxy-ai-corpus.test.mjs
// Real reference-value/invariant tests for the AI-corpus synergy verifier (R9).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { listGalaxies, classifyCorpusSources, isGap } from "./verify-galaxy-ai-corpus.mjs";

// ---- listGalaxies ----------------------------------------------------------
test("listGalaxies: only dirs with a MEMORY.md count; sorted; absent root -> []", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "galverify-"));
  fs.mkdirSync(path.join(tmp, "mill")); fs.writeFileSync(path.join(tmp, "mill", "MEMORY.md"), "x");
  fs.mkdirSync(path.join(tmp, "cad")); fs.writeFileSync(path.join(tmp, "cad", "MEMORY.md"), "x");
  fs.mkdirSync(path.join(tmp, "notagalaxy"));                 // no MEMORY.md -> excluded
  fs.writeFileSync(path.join(tmp, "loose.md"), "x");          // a file, not a dir
  assert.deepEqual(listGalaxies(tmp), ["cad", "mill"]);
  assert.deepEqual(listGalaxies("H:/prism/__no_such_dir__"), []);
  fs.rmSync(tmp, { recursive: true, force: true });
});

// ---- classifyCorpusSources -------------------------------------------------
test("classifyCorpusSources: maps the bridge's source labels to synergy surfaces + counts wiki", () => {
  const docs = [
    { source: "mill/CLAUDE.md", text: "a" },
    { source: "mill/SOUL.md", text: "b" },
    { source: "mill/MEMORY.md", text: "c" },
    { source: "mill/AWARENESS.md", text: "d" },
    { source: "mill_synthesis.md", text: "e" },
    { source: "wiki/kienzle", text: "f" },
    { source: "wiki/taylor", text: "g" },
  ];
  const r = classifyCorpusSources(docs, "mill");
  assert.equal(r.claude, true); assert.equal(r.soul, true); assert.equal(r.memory, true);
  assert.equal(r.awareness, true); assert.equal(r.synthesis, true);
  assert.equal(r.wikiCount, 2); assert.equal(r.total, 7);
});

test("classifyCorpusSources: galaxy name is honored (no cross-galaxy false-positive)", () => {
  const docs = [{ source: "cad/MEMORY.md", text: "x" }, { source: "cad_synthesis.md", text: "y" }];
  const r = classifyCorpusSources(docs, "mill");      // classifying for 'mill', docs are 'cad'
  assert.equal(r.memory, false);                       // cad/MEMORY.md != mill/MEMORY.md
  assert.equal(r.synthesis, false);
});

test("classifyCorpusSources: empty / non-array -> all false, 0 (no throw)", () => {
  const r = classifyCorpusSources([], "mill");
  assert.equal(r.memory, false); assert.equal(r.wikiCount, 0); assert.equal(r.total, 0);
  const r2 = classifyCorpusSources(null, "mill");
  assert.equal(r2.total, 0);
});

// ---- isGap (synergy gate) --------------------------------------------------
test("isGap: missing synthesis OR zero wiki -> gap; both present -> not a gap", () => {
  assert.equal(isGap({ synthesis: true, wikiCount: 3 }), false);
  assert.equal(isGap({ synthesis: false, wikiCount: 3 }), true);   // no synthesis
  assert.equal(isGap({ synthesis: true, wikiCount: 0 }), true);    // no wiki
  assert.equal(isGap({ synthesis: false, wikiCount: 0 }), true);
});
