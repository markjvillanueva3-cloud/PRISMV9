/**
 * regen-viz-seed-ghost-stage.test.mjs
 * NN-GRAPH-MS2 U1 — anti-regression guard for the reference-pool seed stage.
 *
 * Root cause this unit fixes: `seed-ghost-from-unwired.mjs` (the high-confidence
 * `ghost.unwired-engine` reference-pool generator) existed with an `--apply`
 * mode but was NOT a regen-viz stage, so every graph regen left
 * system-graph.json with 0 ghost nodes → nn-graph-eval defers
 * `insufficient-reference-pool` (poolSize:0) → the GNN tier-5 is permanently
 * DORMANT BY DATA. The fix wires it as a post-merge regen-viz stage.
 *
 * This is an orchestrator-wiring unit — the correct regression oracle is a
 * structural source guard (same class as the `grep -c decideMergePostState`
 * verify pattern in CLAUDE.md ## Recent regressions), not a full regen E2E.
 * It would FAIL on revert (stage removed / moved pre-merge / --apply dropped /
 * fail-loud removed) — that is exactly its job.
 *
 * Run: node --test scripts/__tests__/regen-viz-seed-ghost-stage.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = readFileSync(join(ROOT, "scripts", "regen-viz.mjs"), "utf8");

test("regen-viz invokes seed-ghost-from-unwired with --apply", () => {
  // The arg-pair must be exact: FAST[] stages are invoked arg-less, so the
  // only correct wiring is an explicit spawnSync with the "--apply" arg.
  assert.ok(
    SRC.includes('"seed-ghost-from-unwired.mjs"), "--apply"'),
    "seed-ghost-from-unwired.mjs must be invoked with the explicit --apply arg",
  );
});

test("the seed stage runs POST-merge (not in FAST[] / not pre-merge)", () => {
  const mergeIdx = SRC.indexOf("merge-augmentations.mjs");
  const seedIdx = SRC.indexOf('"seed-ghost-from-unwired.mjs"');
  assert.ok(mergeIdx > 0, "merge-augmentations stage must exist");
  assert.ok(seedIdx > 0, "seed-ghost stage must exist");
  assert.ok(
    seedIdx > mergeIdx,
    "seed-ghost MUST run after merge-augmentations — it writes system-graph.json " +
    "directly and a pre-merge pass would be wiped by the merge rebuild",
  );
  // Must NOT be sitting in the arg-less FAST[] array literal.
  const fastStart = SRC.indexOf("const FAST = [");
  const fastEnd = SRC.indexOf("];", fastStart);
  const fastBlock = SRC.slice(fastStart, fastEnd);
  assert.ok(
    !fastBlock.includes("seed-ghost-from-unwired"),
    "seed-ghost must NOT be in FAST[] (those stages get no args → no --apply)",
  );
});

test("the seed stage is fail-loud (increments failed on non-zero exit)", () => {
  const seedIdx = SRC.indexOf('"seed-ghost-from-unwired.mjs"');
  const tail = SRC.slice(seedIdx, seedIdx + 600);
  assert.match(tail, /sg\.status !== 0/, "must check the stage exit status");
  assert.match(tail, /seed-ghost-from-unwired failed/, "must log a loud failure");
  assert.match(tail, /failed\+\+/, "must increment the failed counter (fail-loud, R12)");
});

test("the seed stage precedes the read-only downstream consumers", () => {
  // executive-briefing / wiki-debt / obsidian-bridge read the graph — the
  // reference ghosts must already be seeded when they (and the out-of-band
  // nn-graph-eval) read system-graph.json.
  const seedIdx = SRC.indexOf('"seed-ghost-from-unwired.mjs"');
  const briefIdx = SRC.indexOf("generate-executive-briefing.mjs");
  assert.ok(briefIdx > 0, "executive-briefing stage must exist");
  assert.ok(
    seedIdx < briefIdx,
    "reference ghosts must be seeded before downstream graph readers run",
  );
});
