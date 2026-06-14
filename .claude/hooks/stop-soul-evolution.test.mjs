// .claude/hooks/stop-soul-evolution.test.mjs
// node --test .claude/hooks/stop-soul-evolution.test.mjs
//
// Tests the de-duped run() of the soul-evolution Stop driver: novelty-gated
// refuse-rule proposal + .draft.md write, sourced via the shared dream-signal
// readers. Happy + failure + adversarial.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { run } from "./stop-soul-evolution.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "soul-evo-"));
  const soulsDir = join(root, "souls");
  const memoryDir = join(root, "memory");
  mkdirSync(soulsDir, { recursive: true });
  mkdirSync(memoryDir, { recursive: true });
  return { root, soulsDir, memoryDir };
}

test("run: happy -- novel correction proposes a refuse-rule + writes draft", () => {
  const { root, soulsDir, memoryDir } = fixture();
  try {
    writeFileSync(join(soulsDir, "bravo.md"), "---\nslot: bravo\nrefuse_list:\n  - unrelated-existing-rule\n---\n");
    writeFileSync(join(memoryDir, "feedback_x.md"), "description: never skip the dispatcher round-trip test\n");
    const r = run({ slot: "bravo", soulsDir, memoryDir, horizonSec: 86400, now: Date.now(), rerank: null });
    assert.ok(r.proposed.length >= 1, "novel correction proposed");
    assert.ok(existsSync(r.draftPath), "draft file written");
    const md = readFileSync(r.draftPath, "utf8");
    assert.match(md, /soul-evolution-draft/, "draft has the expected frontmatter kind");
    assert.match(md, /never-skip-the-dispatcher-round-trip-test/, "draft contains the derived rule slug");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("run: failure -- no recent corrections -> proposed empty, no draft", () => {
  const { root, soulsDir, memoryDir } = fixture();
  try {
    writeFileSync(join(soulsDir, "bravo.md"), "---\nslot: bravo\nrefuse_list:\n  - x\n---\n");
    const r = run({ slot: "bravo", soulsDir, memoryDir, horizonSec: 86400, now: Date.now() });
    assert.deepEqual(r.proposed, []);
    assert.ok(!existsSync(join(soulsDir, "bravo.draft.md")), "no draft written");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("run: failure -- slot unknown -> no-op", () => {
  const { root, soulsDir, memoryDir } = fixture();
  try {
    writeFileSync(join(memoryDir, "feedback_x.md"), "description: a correction\n");
    const r = run({ slot: "unknown", soulsDir, memoryDir });
    assert.deepEqual(r.proposed, []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("run: adversarial -- correction overlapping an existing rule (substring fallback) is skipped", () => {
  const { root, soulsDir, memoryDir } = fixture();
  try {
    // refuse_list rule is a substring of the correction -> substring fallback maxScore=1 -> skipped.
    writeFileSync(join(soulsDir, "bravo.md"), "---\nslot: bravo\nrefuse_list:\n  - always check units\n---\n");
    writeFileSync(join(memoryDir, "feedback_units.md"), "description: always check units first\n");
    const r = run({ slot: "bravo", soulsDir, memoryDir, horizonSec: 86400, now: Date.now(), rerank: null });
    assert.deepEqual(r.proposed, [], "overlapping correction skipped, not proposed");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("run: adversarial -- injected rerank high-score suppresses, low-score proposes", () => {
  const { root, soulsDir, memoryDir } = fixture();
  try {
    writeFileSync(join(soulsDir, "bravo.md"), "---\nslot: bravo\nrefuse_list:\n  - some-rule\n---\n");
    writeFileSync(join(memoryDir, "feedback_y.md"), "description: prefer atomic writes for shared state\n");
    const high = () => [{ candidate: "some-rule", score: 0.9 }]; // >= 0.5 novelty threshold -> skip
    const low = () => [{ candidate: "some-rule", score: 0.1 }];  // < 0.5 -> propose
    const rHigh = run({ slot: "bravo", soulsDir, memoryDir, horizonSec: 86400, now: Date.now(), rerank: high });
    assert.deepEqual(rHigh.proposed, [], "high rerank score suppresses");
    const rLow = run({ slot: "bravo", soulsDir, memoryDir, horizonSec: 86400, now: Date.now(), rerank: low });
    assert.ok(rLow.proposed.length >= 1, "low rerank score proposes");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("run: cap -- many novel corrections truncate to PRISM_SOUL_EVOLVE_MAX (default 25)", () => {
  const { root, soulsDir, memoryDir } = fixture();
  const prev = process.env.PRISM_SOUL_EVOLVE_MAX;
  delete process.env.PRISM_SOUL_EVOLVE_MAX; // exercise the default 25
  try {
    writeFileSync(join(soulsDir, "bravo.md"), "---\nslot: bravo\nrefuse_list:\n  - unrelated\n---\n");
    for (let i = 0; i < 30; i++) {
      writeFileSync(join(memoryDir, `feedback_${i}.md`), `description: distinct novel correction number ${i} about topic ${i}\n`);
    }
    const r = run({ slot: "bravo", soulsDir, memoryDir, horizonSec: 86400, now: Date.now(), rerank: null });
    assert.equal(r.proposed.length, 25, "capped to default 25");
    assert.equal(r.totalProposed, 30, "totalProposed reports the full count");
    assert.equal(r.truncated, 5, "truncated = total - cap");
  } finally {
    if (prev === undefined) delete process.env.PRISM_SOUL_EVOLVE_MAX; else process.env.PRISM_SOUL_EVOLVE_MAX = prev;
    rmSync(root, { recursive: true, force: true });
  }
});
