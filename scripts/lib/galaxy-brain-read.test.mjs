// Real fixture-integration test for galaxy-brain-read (A-06 master-brain compound recall).
// R9: assertions encode WHY -- the fix is "injectors must read the MASTER brain, not only
// local synthesis", so the load-bearing test is "master.backPointer is found AND is the
// RIGHT galaxy's row (not a substring-trap sibling)". Uses a real tmp fixture, not mocks.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  extractBackPointer,
  extractCrossGalaxy,
  readGalaxyBrain,
  buildCompactBrainCard,
} from "./galaxy-brain-read.mjs";

// --- build a throwaway fixture prismRoot + master MEMORY.md ---
const root = fs.mkdtempSync(path.join(os.tmpdir(), "gbr-"));
const prismRoot = path.join(root, "prism");
const masterMemoryPath = path.join(root, "MEMORY.md");
function w(rel, txt) { const p = path.join(prismRoot, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, txt); }

w("knowledge/memories/patterns/mill_synthesis.md", "# mill synthesis\nKienzle/Taylor cutting physics, HSM strategies, 222 engines.");
w("mcp-server/src/engines/mill/CLAUDE.md", "# Mill galaxy doctrine");
w("mcp-server/src/engines/mill/MEMORY.md", "# Mill MEMORY");
fs.writeFileSync(masterMemoryPath, [
  "# PRISM Project Memory",
  "- [galaxy:lathe] mcp-server/src/engines/lathe/MEMORY.md -- Lathe Wizard",
  "- [galaxy:pdf-corpus-mill] mcp-server/src/engines/pdf-corpus-mill/MEMORY.md -- mill PDF extraction",
  "- [galaxy:mill] mcp-server/src/engines/mill/MEMORY.md -- mill galaxy (~222 engines)",
].join("\n"));

test("readGalaxyBrain reads the MASTER brain (the A-06 fix), not just local synthesis", () => {
  const b = readGalaxyBrain("mill", { prismRoot, masterMemoryPath });
  assert.equal(b.master.present, true);
  assert.ok(b.master.backPointer, "must find the master-brain back-pointer row");
  assert.match(b.master.backPointer, /\[galaxy:mill\] mcp-server\/src\/engines\/mill\/MEMORY\.md/);
});

test("back-pointer is the RIGHT galaxy -- 'mill' must NOT match 'pdf-corpus-mill' (substring trap)", () => {
  const b = readGalaxyBrain("mill", { prismRoot, masterMemoryPath });
  assert.doesNotMatch(b.master.backPointer, /pdf-corpus-mill/);
  // and the sibling resolves to ITS own row
  const sib = extractBackPointer(fs.readFileSync(masterMemoryPath, "utf8"), "pdf-corpus-mill");
  assert.match(sib, /\[galaxy:pdf-corpus-mill\]/);
});

test("local surfaces are read + counted, existence-checked", () => {
  const b = readGalaxyBrain("mill", { prismRoot, masterMemoryPath });
  assert.match(b.local.synthesis.excerpt, /Kienzle\/Taylor cutting physics/);
  assert.equal(b.local.soul, null);             // no SOUL.md in fixture -> null, not fabricated
  assert.equal(b.localPresent, 3);               // synthesis + claude + memory
});

test("R12 no fabrication: an absent galaxy yields nulls, not invented paths", () => {
  const b = readGalaxyBrain("ghostxyz", { prismRoot, masterMemoryPath });
  assert.equal(b.localPresent, 0);
  assert.equal(b.local.synthesis, null);
  assert.equal(b.master.present, true);          // master file exists...
  assert.equal(b.master.backPointer, null);      // ...but no row for a non-existent galaxy
});

test("includeMaster:false isolates to local (master omitted)", () => {
  const b = readGalaxyBrain("mill", { prismRoot, masterMemoryPath, includeMaster: false });
  assert.equal(b.master, null);
  assert.deepEqual(b.crossGalaxy, []);
});

test("extractCrossGalaxy returns the deduped fleet edge set", () => {
  const set = extractCrossGalaxy(fs.readFileSync(masterMemoryPath, "utf8"));
  assert.deepEqual([...set].sort(), ["lathe", "mill", "pdf-corpus-mill"]);
});

test("compact card carries BOTH a MASTER and a LOCAL signal (the synergy) and is bounded", () => {
  const b = readGalaxyBrain("mill", { prismRoot, masterMemoryPath });
  const card = buildCompactBrainCard(b, { maxChars: 1600 });
  assert.match(card, /MASTER brain: .*\[galaxy:mill\]/);   // master signal present
  assert.match(card, /LOCAL synthesis .*Kienzle/);          // local signal present
  assert.match(card, /fleet knows 3 galaxies/);             // cross-recall surfaced
  assert.ok(card.length <= 1600, "card must respect maxChars budget");
});

test("card degrades honestly when master is absent", () => {
  const b = readGalaxyBrain("mill", { prismRoot, masterMemoryPath: path.join(root, "nope.md") });
  const card = buildCompactBrainCard(b);
  assert.match(card, /MASTER brain: ABSENT/);
});

test("cleanup", () => { fs.rmSync(root, { recursive: true, force: true }); assert.ok(true); });
