// scripts/wire-ai-systems-state-to-galaxies.test.mjs
// Real-value tests (R9). The load-bearing property is IDEMPOTENCY: re-running must never
// duplicate the block. Tested directly on the pure core + against the live 34-galaxy set.

import test from "node:test";
import assert from "node:assert/strict";

import {
  upsertMarkedBlock,
  listGalaxyMemories,
  listGalaxyClaudeMds,
  listSlotSouls,
  wireAll,
} from "./wire-ai-systems-state-to-galaxies.mjs";

const BEGIN = "<!-- B -->";
const END = "<!-- E -->";
const BLOCK = `${BEGIN}\nhello world\n${END}`;

test("upsertMarkedBlock: appends the block when markers are absent", () => {
  const out = upsertMarkedBlock("# Doc\nbody", BEGIN, END, BLOCK);
  assert.ok(out.includes(BLOCK), "block must be present");
  assert.ok(out.startsWith("# Doc\nbody"), "original content preserved");
});

test("upsertMarkedBlock: IDEMPOTENT -- applying twice yields the same result (no duplication)", () => {
  const once = upsertMarkedBlock("# Doc\nbody\n", BEGIN, END, BLOCK);
  const twice = upsertMarkedBlock(once, BEGIN, END, BLOCK);
  assert.equal(once, twice, "second application must be a no-op");
  assert.equal((twice.match(new RegExp(BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1, "exactly one begin marker");
});

test("upsertMarkedBlock: REPLACES an old block with new body (in place)", () => {
  const old = `head\n${BEGIN}\nOLD CONTENT\n${END}\ntail`;
  const next = upsertMarkedBlock(old, BEGIN, END, `${BEGIN}\nNEW CONTENT\n${END}`);
  assert.ok(next.includes("NEW CONTENT"), "new body present");
  assert.ok(!next.includes("OLD CONTENT"), "old body replaced");
  assert.ok(next.startsWith("head") && next.endsWith("tail"), "surrounding content preserved");
});

test("upsertMarkedBlock: handles empty/non-string content (edge case)", () => {
  assert.ok(upsertMarkedBlock("", BEGIN, END, BLOCK).includes(BLOCK));
  assert.ok(upsertMarkedBlock(null, BEGIN, END, BLOCK).includes(BLOCK));
});

test("listGalaxyMemories: finds the live galaxy MEMORY.md set (>=30, all end in MEMORY.md)", () => {
  const files = listGalaxyMemories();
  assert.ok(files.length >= 30, `expected >=30 galaxy brains, got ${files.length}`);
  assert.ok(files.every((f) => f.endsWith("MEMORY.md")), "every path is a MEMORY.md");
});

test("listGalaxyClaudeMds: finds the per-galaxy CLAUDE.md sentinels (>=30)", () => {
  const files = listGalaxyClaudeMds();
  assert.ok(files.length >= 30, `expected >=30 galaxy sentinels, got ${files.length}`);
  assert.ok(files.every((f) => f.endsWith("CLAUDE.md")), "every path is a CLAUDE.md");
});

test("listSlotSouls: finds the slot-soul files (>=20, all .md)", () => {
  const files = listSlotSouls();
  assert.ok(files.length >= 20, `expected >=20 souls, got ${files.length}`);
  assert.ok(files.every((f) => f.endsWith(".md")), "every path is a .md");
});

test("upsertMarkedBlock on a soul: EOF-append leaves the YAML frontmatter untouched", () => {
  const soul = "---\nslot: zulu\nrole: orchestrator\n---\n# Body\npersona text\n";
  const out = upsertMarkedBlock(soul, "<!-- B -->", "<!-- E -->", "<!-- B -->\nblock\n<!-- E -->");
  assert.ok(out.startsWith("---\nslot: zulu\nrole: orchestrator\n---\n"), "frontmatter intact at top");
  assert.ok(out.includes("# Body\npersona text"), "persona body preserved");
  assert.ok(out.indexOf("<!-- B -->") > out.indexOf("persona text"), "block appended AFTER the body, not in frontmatter");
});

test("wireAll --dry-run: evaluates all 4 surfaces (memories+claude.md+souls) without writing", () => {
  const r = wireAll({ dryRun: true });
  assert.ok(r.total >= 90, `expected >=90 surfaces (34 mem + 34 claude + ~28 souls), got ${r.total}`);
  for (const k of ["memories", "claudeMds", "souls"]) {
    assert.ok(r.surfaces[k], `surface ${k} reported`);
    assert.equal(r.surfaces[k].total, r.surfaces[k].wired + r.surfaces[k].alreadyCurrent + r.surfaces[k].missing, `${k} accounted for`);
  }
});
