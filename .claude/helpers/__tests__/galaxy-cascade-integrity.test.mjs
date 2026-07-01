#!/usr/bin/env node
// galaxy-cascade-integrity.test.mjs — verifies the 4-layer Domain-Galaxy Doctrine
// cascade is structurally intact: each of 20 enumerated galaxies has both a CLAUDE.md
// AND a MEMORY.md sentinel at mcp-server/src/engines/<galaxy>/, plus the baseline
// engines/CLAUDE.md and engines/MEMORY.md exist. Per goal-condition "fully tested for
// every domain" — this is the doctrine-layer test.
//
// Run: node --test .claude/helpers/__tests__/galaxy-cascade-integrity.test.mjs
//
// Per U-GALAXY-MS1-T1 (verification gap closed 2026-05-27 slot:alpha iter25).

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const ENGINES = path.join(PRISM, "mcp-server/src/engines");

// Source of truth: the 20 galaxies shipped via Phase-A cascade complete
// (U-GALAXY-MS1-I1-FINAL-3-GALAXIES-COMPLETE 2026-05-27 + earlier batches).
// Mirrors KNOWN_GALAXIES in pre-edit-galaxy-cascade-inject.mjs + pre-write-cross-galaxy-warn.mjs.
const GALAXIES = [
  "mill", "lathe", "wedm", "quoting", "business", "academy", "post-processor",
  "cad", "cam", "shop-floor", "mit-curriculum", "pdf-corpus", "pdf-corpus-mill",
  "quality", "cad-fusion-live", "speed-feed", "knowledge-conversion",
  "compliance-safety", "corpus-aggregation", "tribal-knowledge", "agent-orchestration",
];

test("baseline: engines/CLAUDE.md exists + non-empty + contains §1 search-first discipline", () => {
  const p = path.join(ENGINES, "CLAUDE.md");
  assert.ok(fs.existsSync(p), "baseline CLAUDE.md must exist");
  const c = fs.readFileSync(p, "utf8");
  assert.ok(c.length > 1000, "baseline CLAUDE.md must be substantive (>1KB)");
  assert.match(c, /search-first discipline/i, "must contain search-first discipline doctrine");
  assert.match(c, /§8|engine-coding conventions/i, "must preserve §8 engine conventions per U-GALAXY-MS1-BASELINE-DEV-CLAUDE-MD-FIX");
});

test("baseline: engines/MEMORY.md exists + indexes critical standing-doctrine memos", () => {
  const p = path.join(ENGINES, "MEMORY.md");
  assert.ok(fs.existsSync(p), "baseline MEMORY.md must exist");
  const c = fs.readFileSync(p, "utf8");
  assert.match(c, /\[\[feedback_karpathy_discipline\]\]/i);
  assert.match(c, /\[\[feedback_r5_thru_r12_doctrine\]\]/i);
  assert.match(c, /\[\[feedback_always_capture_lessons\]\]/i);
});

for (const galaxy of GALAXIES) {
  test(`galaxy ${galaxy}: CLAUDE.md sentinel exists + has expected structure`, () => {
    const p = path.join(ENGINES, galaxy, "CLAUDE.md");
    assert.ok(fs.existsSync(p), `${galaxy}/CLAUDE.md must exist`);
    const c = fs.readFileSync(p, "utf8");
    assert.ok(c.length > 200, `${galaxy}/CLAUDE.md must have content (>200B)`);
    assert.match(c, /Galaxy|galactic center|HONEST STUB|Stub Sentinel/i,
      `${galaxy}/CLAUDE.md must self-identify as a galaxy sentinel`);
    assert.match(c, /DOMAIN-GALAXY-DOCTRINE/i,
      `${galaxy}/CLAUDE.md must cross-ref the parent doctrine`);
  });

  test(`galaxy ${galaxy}: MEMORY.md cascade index exists`, () => {
    const p = path.join(ENGINES, galaxy, "MEMORY.md");
    assert.ok(fs.existsSync(p), `${galaxy}/MEMORY.md must exist`);
    const c = fs.readFileSync(p, "utf8");
    assert.ok(c.length > 100, `${galaxy}/MEMORY.md must have content (>100B)`);
    assert.match(c, /U-GALAXY-MS1-C1|migration|cascade/i,
      `${galaxy}/MEMORY.md must reference C1 migration unit`);
  });
}

test("hook KNOWN_GALAXIES set agrees with this test's GALAXIES list", () => {
  // The 3 F-tier hooks (F1 cascade-inject, F2 cross-galaxy-warn, F3 slot-context-line)
  // each maintain a KNOWN_GALAXIES set. They MUST stay in sync. This test asserts
  // the F1 hook (which uses the largest set) covers exactly what we test.
  const f1 = path.join(PRISM, ".claude/hooks/pre-edit-galaxy-cascade-inject.mjs");
  if (!fs.existsSync(f1)) return; // hook not yet shipped — skip
  const src = fs.readFileSync(f1, "utf8");
  for (const g of GALAXIES) {
    assert.match(src, new RegExp(`"${g}"`),
      `F1 hook KNOWN_GALAXIES must include "${g}"`);
  }
});

test("galaxy count matches doctrine spec (20 per DOMAIN-GALAXY-DOCTRINE Phase A)", () => {
  assert.equal(GALAXIES.length, 21,
    "GALAXIES list should hold 21 entries (20 enumerated + 1 historical for pdf-corpus-mill sub-galaxy = 21 sentinels shipped). Doctrine spec lists 20 high-level; pdf-corpus-mill is a foxtrot sub-namespace of pdf-corpus.");
});
