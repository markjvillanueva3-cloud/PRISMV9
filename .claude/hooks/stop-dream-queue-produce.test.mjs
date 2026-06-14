// .claude/hooks/stop-dream-queue-produce.test.mjs
// node --test .claude/hooks/stop-dream-queue-produce.test.mjs
//
// Integration tests for the dream-queue producer run(): single-slot + fleet
// (all-galaxies) sweep + skip paths, with an injected fake engine, plus ONE
// real dist-engine round-trip (R15 -- exercise the real propose() contract).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { run, produceForSlot, todayStr, defaultEngine } from "./stop-dream-queue-produce.mjs";

// Fake engine that echoes a non-empty batch (proves wiring + persistence).
const fakeEngine = {
  propose(req) {
    return {
      slot: req.slot,
      refuse_rules: [{ rule: "repeat-token", source_correction: "x", observed_count: 3 }],
      skills: req.error_patterns.length
        ? [{ name: "skill-x", reason: "y", triggering_pattern: "z", observed_count: 9 }]
        : [],
      filtered_correction_count: 1,
    };
  },
};

const emptyEngine = { propose: (req) => ({ slot: req.slot, refuse_rules: [], skills: [], filtered_correction_count: 0 }) };

test("run: single slot writes dream-<slot>-<date>.json with batch", async () => {
  const { mkdirSync } = await import("node:fs");
  const root = mkdtempSync(join(tmpdir(), "dream-produce-"));
  const soulsDir = join(root, "souls"); mkdirSync(soulsDir, { recursive: true });
  const memoryDir = join(root, "memory"); mkdirSync(memoryDir, { recursive: true });
  const queueDir = join(root, "queue");
  const ledgerPath = join(root, "ledger.jsonl");
  try {
    writeFileSync(join(soulsDir, "bravo.md"), "---\nslot: bravo\nrefuse_list:\n  - existing\n---\n");
    writeFileSync(join(memoryDir, "feedback_a.md"), "description: a correction\n");
    writeFileSync(ledgerPath, Array(4).fill(JSON.stringify({ trigger: "err-x" })).join("\n") + "\n");
    const now = Date.parse("2026-06-10T12:00:00Z");
    const r = await run({ slot: "bravo", soulsDir, memoryDir, queueDir, ledgerPath, engine: fakeEngine, now, allSlots: false });
    assert.equal(r.produced.length, 1);
    const outPath = join(queueDir, `dream-bravo-${todayStr(now)}.json`);
    assert.ok(existsSync(outPath), "queue file written");
    const doc = JSON.parse(readFileSync(outPath, "utf8"));
    assert.equal(doc.slot, "bravo");
    assert.equal(doc.batch.refuse_rules[0].rule, "repeat-token");
    assert.equal(doc.batch.skills[0].name, "skill-x");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("run: all-slots sweep writes one file per galaxy soul", async () => {
  const { mkdirSync } = await import("node:fs");
  const root = mkdtempSync(join(tmpdir(), "dream-produce-"));
  const soulsDir = join(root, "souls"); mkdirSync(soulsDir, { recursive: true });
  const memoryDir = join(root, "memory"); mkdirSync(memoryDir, { recursive: true });
  const queueDir = join(root, "queue");
  const ledgerPath = join(root, "ledger.jsonl");
  try {
    for (const s of ["alpha", "bravo", "kilo"]) {
      writeFileSync(join(soulsDir, `${s}.md`), `---\nslot: ${s}\nrefuse_list:\n  - existing\n---\n`);
    }
    writeFileSync(join(soulsDir, "README.md"), "not a slot");
    writeFileSync(join(memoryDir, "feedback_a.md"), "description: fleet-wide correction\n");
    writeFileSync(ledgerPath, Array(4).fill(JSON.stringify({ trigger: "err-y" })).join("\n") + "\n");
    const now = Date.parse("2026-06-10T12:00:00Z");
    const r = await run({ allSlots: true, soulsDir, memoryDir, queueDir, ledgerPath, engine: fakeEngine, now });
    assert.equal(r.produced.length, 3, "one batch per real soul (README excluded)");
    for (const s of ["alpha", "bravo", "kilo"]) {
      assert.ok(existsSync(join(queueDir, `dream-${s}-${todayStr(now)}.json`)), `${s} file written`);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("run: no signal (empty memory + empty ledger) writes nothing", async () => {
  const { mkdirSync } = await import("node:fs");
  const root = mkdtempSync(join(tmpdir(), "dream-produce-"));
  const soulsDir = join(root, "souls"); mkdirSync(soulsDir, { recursive: true });
  const memoryDir = join(root, "memory"); mkdirSync(memoryDir, { recursive: true });
  const queueDir = join(root, "queue");
  const ledgerPath = join(root, "ledger.jsonl");
  try {
    writeFileSync(join(soulsDir, "bravo.md"), "---\nslot: bravo\nrefuse_list:\n  - existing\n---\n");
    const now = Date.now();
    const r = await run({ slot: "bravo", soulsDir, memoryDir, queueDir, ledgerPath, engine: fakeEngine, now });
    assert.deepEqual(r.produced, []);
    assert.ok(!existsSync(queueDir), "no queue dir created when no signal");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("run: engine returns empty batch -> no file written (no empty spam)", async () => {
  const { mkdirSync } = await import("node:fs");
  const root = mkdtempSync(join(tmpdir(), "dream-produce-"));
  const soulsDir = join(root, "souls"); mkdirSync(soulsDir, { recursive: true });
  const memoryDir = join(root, "memory"); mkdirSync(memoryDir, { recursive: true });
  const queueDir = join(root, "queue");
  const ledgerPath = join(root, "ledger.jsonl");
  try {
    writeFileSync(join(soulsDir, "bravo.md"), "---\nslot: bravo\nrefuse_list:\n  - existing\n---\n");
    writeFileSync(join(memoryDir, "feedback_a.md"), "description: a correction\n");
    const now = Date.now();
    const r = await run({ slot: "bravo", soulsDir, memoryDir, queueDir, ledgerPath, engine: emptyEngine, now });
    assert.deepEqual(r.produced, []);
    assert.ok(!existsSync(join(queueDir, `dream-bravo-${todayStr(now)}.json`)), "no file for empty batch");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("run: REAL dist engine round-trip -- repeated correction graduates to a refuse-rule", async () => {
  const { mkdirSync } = await import("node:fs");
  const engine = await defaultEngine(); // mcp-server/dist/engines/DreamLoopProposalEngine.js
  const root = mkdtempSync(join(tmpdir(), "dream-produce-real-"));
  const soulsDir = join(root, "souls"); mkdirSync(soulsDir, { recursive: true });
  const memoryDir = join(root, "memory"); mkdirSync(memoryDir, { recursive: true });
  const queueDir = join(root, "queue");
  const ledgerPath = join(root, "ledger.jsonl");
  try {
    // refuse_list intentionally does NOT contain the correction token.
    writeFileSync(join(soulsDir, "bravo.md"), "---\nslot: bravo\nrefuse_list:\n  - unrelated-rule\n---\n");
    // Two feedback memories projecting to the SAME token (>= minRep 2 -> graduates).
    writeFileSync(join(memoryDir, "feedback_units1.md"), "description: always verify units mismatch before geometry\n");
    writeFileSync(join(memoryDir, "feedback_units2.md"), "description: always verify units mismatch before geometry\n");
    // An error pattern repeated >= minRep*2 (=4) -> graduates to a skill.
    writeFileSync(ledgerPath, Array(5).fill(JSON.stringify({ trigger: "git-lock-contention" })).join("\n") + "\n");
    const now = Date.parse("2026-06-10T12:00:00Z");
    const r = await run({ slot: "bravo", soulsDir, memoryDir, queueDir, ledgerPath, engine, now, allSlots: false });
    assert.equal(r.produced.length, 1, "real engine produced a batch");
    const b = r.produced[0].batch;
    assert.ok(b.refuse_rules.length >= 1, "repeated correction graduated to refuse-rule");
    assert.ok(b.refuse_rules[0].observed_count >= 2, "observed_count reflects repetition");
    assert.ok(b.skills.length >= 1, "repeated error pattern graduated to skill");
  } finally { rmSync(root, { recursive: true, force: true }); }
});
