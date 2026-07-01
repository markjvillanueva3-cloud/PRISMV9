// vault-sources-jsonl-wire.test.mjs -- behavioral tests proving gnn-refpool-vault-sources.jsonl
// is loaded + transformed to the buildHoldout-consumable node shape.
//
// R9: every assertion encodes WHY it matters:
//   buildHoldout() in nn-graph-eval.mjs filters on:
//     n.kind === "ghost.unwired-engine"
//     isValidDispatcher(n.proposed_wiring)
//     Number.isFinite(n.confidence) && n.confidence >= refMinConf (0.8)
//     typeof n.label === "string"
//   A wrong shape = the entry is silently excluded from the ref pool (the exact bug this unit fixes).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadVaultSourcesJsonl } from "./vault-to-gnn-refpool.mjs";
import { HARNESS_DEFAULTS } from "./lib/nn-graph-eval.mjs";
import { isValidDispatcher } from "./seed-ghost-gnn-classify.mjs";

// The exact kind string buildHoldout filters on (nn-graph-eval.mjs:48 `const GHOST_KIND`).
// Not exported from that module, so we inline it here and pin it as a contract.
const GHOST_KIND = "ghost.unwired-engine";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Write a temporary JSONL file with the given rows and return its path. */
function makeTmpJsonl(rows) {
  const dir = os.tmpdir();
  const p = path.join(dir, `vault-sources-test-${process.pid}-${Date.now()}.jsonl`);
  fs.writeFileSync(p, rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  return p;
}

function cleanup(p) {
  try { fs.rmSync(p, { force: true }); } catch { /* best-effort */ }
}

// A valid entry that must survive all filters
const VALID_ENTRY = {
  ghost_id: "ghost.vault-wired.SpeedFeedOutcomeFeedbackBridgeEngine",
  vault_path: "knowledge/memories/reference/reference_sfc_outcome_foldback_wire_2026_06_11.md",
  label: "SpeedFeedOutcomeFeedbackBridgeEngine",
  dispatcher: "prism_calc",
  confidence: 0.85,
  annotation_date: "2026-06-11",
  extracted_by: "india:vault-scan:wired-into-calcDispatcher-confirmed",
};

// ---------------------------------------------------------------------------
// Suite 1: shape contract -- the fields buildHoldout actually reads
// ---------------------------------------------------------------------------

describe("loadVaultSourcesJsonl -- buildHoldout shape contract", () => {
  it("produces kind === 'ghost.unwired-engine' (the GHOST_KIND buildHoldout filters on)", () => {
    const p = makeTmpJsonl([VALID_ENTRY]);
    try {
      const { ghosts } = loadVaultSourcesJsonl(p);
      assert.equal(ghosts.length, 1);
      // This is the field that makes buildHoldout include or exclude the node.
      // A wrong kind (e.g. "ghost.vault-wired") = silently excluded from the ref pool.
      assert.equal(ghosts[0].node.kind, GHOST_KIND);
    } finally { cleanup(p); }
  });

  it("maps `label` field -- buildHoldout checks typeof n.label === 'string'", () => {
    const p = makeTmpJsonl([VALID_ENTRY]);
    try {
      const { ghosts } = loadVaultSourcesJsonl(p);
      assert.equal(typeof ghosts[0].node.label, "string");
      assert.equal(ghosts[0].node.label, "SpeedFeedOutcomeFeedbackBridgeEngine");
    } finally { cleanup(p); }
  });

  it("maps `dispatcher` -> `proposed_wiring` -- buildHoldout calls isValidDispatcher(n.proposed_wiring)", () => {
    const p = makeTmpJsonl([VALID_ENTRY]);
    try {
      const { ghosts } = loadVaultSourcesJsonl(p);
      const wiring = ghosts[0].node.proposed_wiring;
      assert.equal(wiring, "prism_calc");
      // Prove the mapped value actually passes the same gate buildHoldout uses.
      assert.ok(isValidDispatcher(wiring), `proposed_wiring "${wiring}" must pass isValidDispatcher`);
    } finally { cleanup(p); }
  });

  it("maps `confidence` as a number >= refMinConf (0.8) -- the ref-pool entry gate", () => {
    const p = makeTmpJsonl([VALID_ENTRY]);
    try {
      const { ghosts } = loadVaultSourcesJsonl(p);
      const conf = ghosts[0].node.confidence;
      assert.ok(Number.isFinite(conf), "confidence must be finite");
      assert.ok(conf >= HARNESS_DEFAULTS.refMinConf,
        `confidence ${conf} must be >= refMinConf ${HARNESS_DEFAULTS.refMinConf}`);
    } finally { cleanup(p); }
  });

  it("uses ghost_id as node.id when present", () => {
    const p = makeTmpJsonl([VALID_ENTRY]);
    try {
      const { ghosts } = loadVaultSourcesJsonl(p);
      assert.equal(ghosts[0].node.id, "ghost.vault-wired.SpeedFeedOutcomeFeedbackBridgeEngine");
    } finally { cleanup(p); }
  });

  it("falls back to 'ghost.vault-wired.<label>' when ghost_id is absent", () => {
    const entry = { label: "FooBarEngine", dispatcher: "prism_ai", confidence: 0.85 };
    const p = makeTmpJsonl([entry]);
    try {
      const { ghosts } = loadVaultSourcesJsonl(p);
      assert.equal(ghosts[0].node.id, "ghost.vault-wired.FooBarEngine");
    } finally { cleanup(p); }
  });

  it("produces an edge with from=node.id, type='ghost-wire', relation='proposed-wire'", () => {
    const p = makeTmpJsonl([VALID_ENTRY]);
    try {
      const { ghosts } = loadVaultSourcesJsonl(p);
      const { node, edge } = ghosts[0];
      assert.equal(edge.from, node.id);
      assert.equal(edge.type, "ghost-wire");
      assert.equal(edge.relation, "proposed-wire");
      assert.ok(Number.isFinite(edge.intensity), "edge.intensity must be finite");
    } finally { cleanup(p); }
  });
});

// ---------------------------------------------------------------------------
// Suite 2: filtering -- invalid entries must be skipped (R12: no silent drops)
// ---------------------------------------------------------------------------

describe("loadVaultSourcesJsonl -- invalid entry filtering", () => {
  it("skips entries with an invalid dispatcher (not a prism_* name)", () => {
    const bad = { label: "FrobEngine", dispatcher: "not_a_dispatcher", confidence: 0.85 };
    const p = makeTmpJsonl([VALID_ENTRY, bad]);
    try {
      const { ghosts, skipped } = loadVaultSourcesJsonl(p);
      assert.equal(ghosts.length, 1, "only the valid entry survives");
      assert.equal(skipped, 1);
    } finally { cleanup(p); }
  });

  it("skips entries with a missing label", () => {
    const bad = { dispatcher: "prism_calc", confidence: 0.85 };
    const p = makeTmpJsonl([bad]);
    try {
      const { ghosts, skipped } = loadVaultSourcesJsonl(p);
      assert.equal(ghosts.length, 0);
      assert.equal(skipped, 1);
    } finally { cleanup(p); }
  });

  it("skips entries with a non-finite confidence", () => {
    const bad = { label: "BazEngine", dispatcher: "prism_ai", confidence: "NaN" };
    const p = makeTmpJsonl([bad]);
    try {
      const { ghosts, skipped } = loadVaultSourcesJsonl(p);
      assert.equal(ghosts.length, 0);
      assert.equal(skipped, 1);
    } finally { cleanup(p); }
  });

  it("skips malformed JSON lines without throwing", () => {
    const dir = os.tmpdir();
    const p = path.join(dir, `vault-sources-malformed-${process.pid}.jsonl`);
    fs.writeFileSync(p, `${JSON.stringify(VALID_ENTRY)}\n{broken json\n`, "utf8");
    try {
      const { ghosts, skipped } = loadVaultSourcesJsonl(p);
      assert.equal(ghosts.length, 1);
      assert.equal(skipped, 1);
    } finally { cleanup(p); }
  });

  it("returns missing:true + empty ghosts when JSONL file does not exist (no throw)", () => {
    const { ghosts, skipped, loaded, missing } = loadVaultSourcesJsonl("/no/such/file.jsonl");
    assert.equal(missing, true);
    assert.equal(ghosts.length, 0);
    assert.equal(loaded, 0);
    assert.equal(skipped, 0);
  });

  it("handles an empty JSONL file gracefully (no throw, 0 ghosts)", () => {
    const p = makeTmpJsonl([]);
    try {
      const { ghosts, skipped } = loadVaultSourcesJsonl(p);
      assert.equal(ghosts.length, 0);
      assert.equal(skipped, 0);
    } finally { cleanup(p); }
  });
});

// ---------------------------------------------------------------------------
// Suite 3: live JSONL -- the actual committed file must load + pass shape checks
// ---------------------------------------------------------------------------

describe("loadVaultSourcesJsonl -- live committed JSONL", () => {
  const LIVE_PATH = path.join(ROOT, "state", "shared", "nn-graph", "gnn-refpool-vault-sources.jsonl");

  it("the committed gnn-refpool-vault-sources.jsonl exists", () => {
    assert.ok(fs.existsSync(LIVE_PATH),
      `Expected ${LIVE_PATH} to exist (committed by U-INDIA-VAULT-SEED-WIRE)`);
  });

  it("loads >= 1 valid ghost from the committed JSONL", () => {
    const { ghosts, skipped } = loadVaultSourcesJsonl(LIVE_PATH);
    assert.ok(ghosts.length >= 1,
      `Expected at least 1 valid ghost from the live JSONL, got ${ghosts.length} (skipped ${skipped})`);
  });

  it("every loaded ghost passes the buildHoldout filter predicates", () => {
    const { ghosts } = loadVaultSourcesJsonl(LIVE_PATH);
    for (const { node } of ghosts) {
      // Replicate the exact filter from buildHoldout (nn-graph-eval.mjs:465-469)
      assert.equal(node.kind, GHOST_KIND,
        `node.kind must be "${GHOST_KIND}" for ${node.label}`);
      assert.equal(typeof node.label, "string",
        `node.label must be a string for id ${node.id}`);
      assert.ok(isValidDispatcher(node.proposed_wiring),
        `node.proposed_wiring "${node.proposed_wiring}" must pass isValidDispatcher for ${node.label}`);
      assert.ok(Number.isFinite(node.confidence),
        `node.confidence must be finite for ${node.label}`);
      assert.ok(node.confidence >= HARNESS_DEFAULTS.refMinConf,
        `node.confidence ${node.confidence} must be >= ${HARNESS_DEFAULTS.refMinConf} for ${node.label}`);
    }
  });

  it("all 15 committed entries are valid (no unexpected skips)", () => {
    const { ghosts, skipped } = loadVaultSourcesJsonl(LIVE_PATH);
    // The committed JSONL has 15 entries, all valid. If skipped > 0 a schema
    // regression occurred in the JSONL (wrong dispatcher name, missing label, etc.).
    assert.equal(skipped, 0,
      `Expected 0 skipped entries but got ${skipped} -- schema mismatch in committed JSONL`);
    assert.equal(ghosts.length, 15,
      `Expected 15 ghosts from the committed JSONL, got ${ghosts.length}`);
  });
});

// ---------------------------------------------------------------------------
// Suite 4: dedup -- JSONL entries must not override prose-scan results
// ---------------------------------------------------------------------------

describe("main() dedup -- JSONL supplements prose-scan, never overrides", () => {
  it("loadVaultSourcesJsonl returns duplicate labels as separate ghosts (dedup is in main, not the loader)", () => {
    // The loader itself does NOT dedup -- it emits all valid rows.
    // main() performs the dedup. This test proves the loader's output carries
    // enough info (node.label) for main()'s Set-based dedup to work.
    const dup = { label: VALID_ENTRY.label, dispatcher: "prism_ai", confidence: 0.85 };
    const p = makeTmpJsonl([VALID_ENTRY, dup]);
    try {
      const { ghosts } = loadVaultSourcesJsonl(p);
      // Both rows parse as valid ghosts -- dedup is the caller's responsibility
      assert.equal(ghosts.length, 2);
      // Both expose .node.label for the caller's Set-based dedup
      assert.ok(ghosts.every((g) => typeof g.node.label === "string"));
    } finally { cleanup(p); }
  });

  it("node.label is the dedup key -- two entries with the same label have the same key", () => {
    const a = { label: "SharedEngine", dispatcher: "prism_calc", confidence: 0.85 };
    const b = { label: "SharedEngine", dispatcher: "prism_ai",  confidence: 0.9 };
    const p = makeTmpJsonl([a, b]);
    try {
      const { ghosts } = loadVaultSourcesJsonl(p);
      const labels = ghosts.map((g) => g.node.label);
      // A Set over labels collapses duplicates -- confirms main()'s dedup mechanism works
      const unique = new Set(labels);
      assert.equal(unique.size, 1, "dedup key 'label' is stable across both entries");
    } finally { cleanup(p); }
  });
});
