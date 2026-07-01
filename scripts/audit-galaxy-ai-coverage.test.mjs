/**
 * audit-galaxy-ai-coverage.test.mjs -- unit tests for the per-galaxy AI-training
 * coverage auditor (U-LORA-COVERAGE-AUDIT, slot:india 2026-06-10).
 *
 * R9: real reference values, no stubs. Pure functions tested hermetically;
 * runAudit validated against the live vault (R15 step-3).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  listBrainGalaxies,
  tallyPairsByGalaxy,
  auditGalaxyCoverage,
  runAudit,
} from "./audit-galaxy-ai-coverage.mjs";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "audit-galaxy-ai-coverage.mjs");

// ---- tallyPairsByGalaxy -----------------------------------------------------

test("tallyPairsByGalaxy counts pairs per galaxy, ignores untagged rows", () => {
  const examples = [
    { _galaxy: "mill" }, { _galaxy: "mill" }, { _galaxy: "wedm" }, {}, { _galaxy: "" },
  ];
  assert.deepEqual(tallyPairsByGalaxy(examples), { mill: 2, wedm: 1 });
});

test("tallyPairsByGalaxy on empty/garbage returns empty (edge case)", () => {
  assert.deepEqual(tallyPairsByGalaxy([]), {});
  assert.deepEqual(tallyPairsByGalaxy(null), {});
});

// ---- auditGalaxyCoverage ----------------------------------------------------

test("auditGalaxyCoverage reports full coverage when every brain has pairs", () => {
  const r = auditGalaxyCoverage(["mill", "wedm"], { mill: 5, wedm: 3 });
  assert.equal(r.totalBrains, 2);
  assert.equal(r.galaxiesWithPairs, 2);
  assert.equal(r.totalPairs, 8);
  assert.equal(r.dormantCount, 0);
  assert.equal(r.fullyCovered, true);
});

test("auditGalaxyCoverage flags a DORMANT galaxy (brain present, 0 pairs)", () => {
  // WHY: a galaxy whose synthesis brain exists but produced no training pairs
  // (e.g. every bullet too thin) is a dormant AI node -- the exact thing the
  // "no dormant nodes across all galaxies" goal must catch.
  const r = auditGalaxyCoverage(["mill", "wedm", "lathe"], { mill: 5, wedm: 0, lathe: 2 });
  assert.deepEqual(r.dormant, ["wedm"]);
  assert.equal(r.dormantCount, 1);
  assert.equal(r.fullyCovered, false);
});

test("auditGalaxyCoverage flags an ORPHAN (pairs but no brain) [adversarial]", () => {
  // WHY: a galaxy with training pairs but no source brain means the brain list and
  // the pair tags disagree -- a data-integrity bug worth surfacing.
  const r = auditGalaxyCoverage(["mill"], { mill: 5, ghost: 1 });
  assert.deepEqual(r.orphanPairs, ["ghost"]);
  assert.equal(r.fullyCovered, false);
});

// ---- listBrainGalaxies ------------------------------------------------------

test("listBrainGalaxies returns sorted galaxy slugs, excludes _meta + non-synthesis", () => {
  const fakeReaddir = () => ["wedm_synthesis.md", "mill_synthesis.md", "_meta_synthesis.md", "README.md"];
  assert.deepEqual(listBrainGalaxies("/x", fakeReaddir), ["mill", "wedm"]);
});

test("listBrainGalaxies on an unreadable dir returns [] (failure mode)", () => {
  const throwing = () => { throw new Error("ENOENT"); };
  assert.deepEqual(listBrainGalaxies("/nope", throwing), []);
});

// ---- runAudit (live R15 step-3 validation) ---------------------------------

test("runAudit confirms no dormant AI nodes across the live galaxy brains", () => {
  // WHY: the validation gate. Every galaxy brain on this host should yield LoRA
  // pairs (the synthesis sections are populated). A dormant galaxy here is a real
  // finding. Conservative floor so corpus growth does not false-fail.
  const r = runAudit();
  assert.ok(r.totalBrains >= 30, `expected >=30 galaxy brains, got ${r.totalBrains}`);
  assert.equal(r.dormantCount, 0, `dormant galaxies (brain but 0 pairs): ${r.dormant.join(", ")}`);
  assert.deepEqual(r.orphanPairs, [], "no pair should lack a source brain");
  assert.equal(r.fullyCovered, true, "all galaxy brains must have training signal");
});

// ---- CLI exit-code contract (subprocess; closes 3-of-3 B-P1) ----------------

function writeSynthFixture(dir, galaxy, bullet) {
  const md = [
    "---", "metadata:", `  galaxy: ${galaxy}`, "---",
    "## Recurring patterns",
    `- **Topic** ${bullet}`,
    "## Key decisions & rules",
    "## Open threads",
  ].join("\n");
  fs.writeFileSync(path.join(dir, `${galaxy}_synthesis.md`), md, "utf8");
}

test("CLI exits 0 when every brain has pairs (--dir fixture)", () => {
  // WHY: the gating side-effect (exit code) is the whole point of the tool -- a
  // cron/CI relies on it. A clean fixture (a brain with a substantial bullet) must
  // exit 0.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cov-clean-"));
  try {
    writeSynthFixture(dir, "cleanyx", "this bullet is comfortably longer than forty characters so it survives the gate.");
    const r = spawnSync(process.execPath, [SCRIPT, "--dir", dir, "--json"], { encoding: "utf8" });
    assert.equal(r.status, 0, `expected exit 0, got ${r.status}; stderr=${r.stderr}`);
    const out = JSON.parse(r.stdout);
    assert.equal(out.fullyCovered, true);
    assert.equal(out.dormantCount, 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("CLI exits 1 when a brain is DORMANT (--dir fixture, brain but 0 pairs)", () => {
  // WHY: a synthesis brain whose only bullet is too thin yields 0 pairs -> dormant
  // -> the tool MUST signal non-zero so a coverage gate fails loud. This is the
  // exit-code path reviewer B flagged as untested.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cov-dormant-"));
  try {
    writeSynthFixture(dir, "dormantyx", "short"); // bullet < 40 chars -> 0 pairs
    const r = spawnSync(process.execPath, [SCRIPT, "--dir", dir, "--json"], { encoding: "utf8" });
    assert.equal(r.status, 1, `expected exit 1 for a dormant brain, got ${r.status}; stderr=${r.stderr}`);
    const out = JSON.parse(r.stdout);
    assert.equal(out.fullyCovered, false);
    assert.deepEqual(out.dormant, ["dormantyx"]);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
