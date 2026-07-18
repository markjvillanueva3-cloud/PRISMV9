// scripts/ai-systems-fleet-state.test.mjs
// Real-value tests (R9): readers run against the LIVE AI-state surfaces so a regression in a
// reader (wrong key path, broken parse) FAILS the test. Ollama tested via failure path
// (unreachable URL) for determinism without a daemon.

import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";

import {
  readGnnState,
  readOctopusReach,
  readOffload,
  readSynergy,
  readOllamaModels,
  gatherState,
  buildNote,
} from "./ai-systems-fleet-state.mjs";

const ROOT = "H:/prism";

test("readGnnState: pulls AUROC + the selective-deploy gate point from live NN-EVAL", () => {
  const r = readGnnState();
  assert.equal(r.ok, true, "NN-EVAL.json must be readable");
  assert.ok(r.gate, "a selective-deploy curve gate point must be present");
  assert.ok(r.gate.tau >= 0.4 && r.gate.tau <= 1, `gate tau in range, got ${r.gate.tau}`);
  assert.ok(r.gate.coverage >= 0 && r.gate.coverage <= 1, "coverage in [0,1]");
  assert.ok(r.gate.brier >= 0, "brier non-negative");
});

test("readGnnState: missing file -> ok:false, never throws (edge case)", () => {
  const r = readGnnState(join(ROOT, "state/shared/nn-graph/__absent__.json"));
  assert.equal(r.ok, false);
  assert.equal(r.error, "nn-eval-missing");
});

test("readOctopusReach: counts consensus-outcome domains from live dir (>=1, hermes-zulu present)", () => {
  const r = readOctopusReach();
  assert.equal(r.ok, true);
  assert.ok(r.domainCount >= 1, `expected >=1 octopus domain, got ${r.domainCount}`);
  assert.ok(r.domains.some((d) => d.domain === "hermes-zulu" && d.records > 0), "hermes-zulu must have outcome records");
});

test("readOctopusReach: missing dir -> ok:false, domainCount 0 (edge case)", () => {
  const r = readOctopusReach(join(ROOT, "state/shared/__no_octopus__"));
  assert.equal(r.ok, false);
  assert.equal(r.domainCount, 0);
});

test("readOffload: parses offload counts + computes rate in [0,1] or null", () => {
  const r = readOffload();
  assert.equal(r.ok, true);
  assert.ok(Number.isInteger(r.offloaded) && r.offloaded >= 0, "offloaded is a count");
  assert.ok(Number.isInteger(r.keptOnClaude) && r.keptOnClaude >= 0, "keptOnClaude is a count");
  assert.ok(r.rate === null || (r.rate >= 0 && r.rate <= 1), "rate in [0,1] or null");
});

test("readSynergy: parses fleet mean + bands from the live audit (34 galaxies)", () => {
  const r = readSynergy();
  assert.equal(r.ok, true);
  assert.ok(Number.isFinite(r.mean), "mean synergy parses");
  assert.ok(r.strong !== null && r.weak !== null, "band counts parse");
  assert.ok(r.galaxies === null || r.galaxies >= 30, `galaxies plausible (>=30), got ${r.galaxies}`);
});

test("readOllamaModels: unreachable URL fails cleanly with empty models (deterministic)", async () => {
  const r = await readOllamaModels("http://127.0.0.1:6553", 1500);
  assert.equal(r.ok, false);
  assert.ok(Array.isArray(r.models) && r.models.length === 0, "models is an empty array on failure");
  assert.ok(typeof r.error === "string" && r.error.length > 0, "surfaces an error (fail-loud)");
});

test("buildNote: produces a recall-discoverable vault note with all AI-system sections", async () => {
  const state = await gatherState();
  const note = buildNote(state);
  assert.ok(note.includes("kind: ai-systems-state"), "frontmatter marks it recall-discoverable");
  assert.ok(note.includes("# AI-systems fleet state"), "has title");
  for (const h of ["## GNN", "## Octopus", "## RAG / CAG / Ollama offload", "## AI-synergy"]) {
    assert.ok(note.includes(h), `note must include section: ${h}`);
  }
  // ASCII-only (no smart quotes/em-dashes/emoji) in the generated note.
  assert.ok(!/[^\x00-\x7F]/.test(note), "note body must be ASCII-only");
});

test("gatherState: returns all five AI-system sub-states", async () => {
  const s = await gatherState();
  for (const k of ["gnn", "octopus", "offload", "synergy", "ollama"]) {
    assert.ok(Object.prototype.hasOwnProperty.call(s, k), `gatherState must include ${k}`);
  }
  assert.ok(typeof s.generatedAt === "string");
});
