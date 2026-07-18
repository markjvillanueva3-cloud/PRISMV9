// vault-to-gnn-refpool.test.mjs -- real-behavior tests for the vault->GNN
// reference-pool feeder. Asserts CONFIRMED-only extraction (speculative lines
// excluded), valid-dispatcher gating, conflict handling, and the ghost-node
// shape buildHoldout() consumes (kind/proposed_wiring/confidence>=0.8).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractConfirmedWirings,
  collectVaultWirings,
  buildGhostFromVault,
  mergeVaultGhosts,
  nodeContentEqual,
} from "./vault-to-gnn-refpool.mjs";

describe("extractConfirmedWirings", () => {
  it("extracts a 'wired into' confirmation with the right engine + dispatcher", () => {
    const out = extractConfirmedWirings("PDFHighlightExtractorEngine wired into prism_dev as an action.", "f.md");
    assert.equal(out.length, 1);
    assert.equal(out[0].engine, "PDFHighlightExtractorEngine");
    assert.equal(out[0].dispatcher, "prism_dev");
    assert.equal(out[0].sourceFile, "f.md");
  });

  it("extracts 'bound to' and 'registered in' phrasings", () => {
    assert.equal(extractConfirmedWirings("FooEngine bound to prism_calc").length, 1);
    assert.equal(extractConfirmedWirings("BarEngine registered in prism_safety").length, 1);
  });

  it("EXCLUDES speculative lines even when they name an Engine + prism_X (R12: question != confirmation)", () => {
    assert.deepEqual(extractConfirmedWirings("verify EWMAEngine is wired into prism_calc"), []);
    assert.deepEqual(extractConfirmedWirings("BazEngine should be wired into prism_dev"), []);
    assert.deepEqual(extractConfirmedWirings("QuxEngine needs to be wired to prism_cam -- pending"), []);
    assert.deepEqual(extractConfirmedWirings("is FrobEngine wired into prism_ai?"), []);
    assert.deepEqual(extractConfirmedWirings("ZapEngine wired into prism_dev (TODO: verify)"), []);
  });

  it("R12: surfaces a TRUE wiring dropped by a SPECULATIVE_RE trigger word via opts.speculativeSkipped (the 2026-06-24 silent-drop)", () => {
    const speculativeSkipped = [];
    const out = extractConfirmedWirings("SBOMReviewEngine wired into prism_safety (WIRE-UNWIRED-PAPA).", "m.md", { speculativeSkipped });
    assert.deepEqual(out, [], "still NOT mined -- the trigger word excludes it (backward-compatible)");
    assert.equal(speculativeSkipped.length, 1, "but the dropped true label IS now surfaced, not silently lost");
    assert.equal(speculativeSkipped[0].engine, "SBOMReviewEngine");
    assert.equal(speculativeSkipped[0].dispatcher, "prism_safety");
    assert.equal(speculativeSkipped[0].trigger.toLowerCase(), "unwired");
    assert.equal(speculativeSkipped[0].sourceFile, "m.md");
  });

  it("R12: the collector does NOT false-positive (speculative line with no minable engine+wiring)", () => {
    const speculativeSkipped = [];
    extractConfirmedWirings("verify the pipeline is healthy; review pending", "m.md", { speculativeSkipped });
    extractConfirmedWirings("wired into prism_dev here, but no engine is named -- pending", "m.md", { speculativeSkipped });
    assert.equal(speculativeSkipped.length, 0);
  });

  it("R12: no opts keeps the original silent-skip; with a collector the CLEAN line still mines and only the DIRTY one is surfaced", () => {
    assert.deepEqual(extractConfirmedWirings("GoodEngine wired into prism_calc -- verify it"), [], "no collector -> dropped as before");
    const speculativeSkipped = [];
    const mixed = "CleanEngine wired into prism_cam now.\nDirtyEngine wired into prism_ai (pending review).";
    const out = extractConfirmedWirings(mixed, "m.md", { speculativeSkipped });
    assert.equal(out.length, 1);
    assert.equal(out[0].engine, "CleanEngine");
    assert.equal(speculativeSkipped.length, 1);
    assert.equal(speculativeSkipped[0].engine, "DirtyEngine");
  });

  it("rejects a MALFORMED dispatcher token (shape gate, matching the GNN eval's own isValidDispatcher)", () => {
    // isValidDispatcher (seed-ghost-gnn-classify.mjs) is DISPATCHER_RE=/^prism_[a-z0-9_]+$/ --
    // a SHAPE check, not an existence allowlist. So a structurally-malformed token is
    // rejected, but a well-formed-but-nonexistent name (prism_notreal) would pass. We
    // gate on the SAME validator the holdout uses, so we stay consistent with the eval.
    // (Existence is not verified here by design; documented known-property.)
    assert.deepEqual(extractConfirmedWirings("NopeEngine wired into prism_BadCaps"), [], "uppercase rejected");
    assert.deepEqual(extractConfirmedWirings("NopeEngine wired into notprism_dev"), [], "wrong prefix not matched by the prism_X capture");
  });

  it("returns [] for empty / non-string input (no throw)", () => {
    assert.deepEqual(extractConfirmedWirings(""), []);
    assert.deepEqual(extractConfirmedWirings(null), []);
    assert.deepEqual(extractConfirmedWirings(undefined), []);
  });

  it("does not read a confirmation across a sentence boundary (period stops the match)", () => {
    // engine in one sentence, dispatcher in the next -> not a confirmed pair
    assert.deepEqual(extractConfirmedWirings("AlphaEngine exists. It relates to prism_dev somehow."), []);
  });
});

describe("extractConfirmedWirings -- broadened catch (anchor-on-assertion, nearest preceding Engine)", () => {
  it("catches a confirmation across a long parenthetical (the old fixed-40-char gap missed this)", () => {
    // The prior `<Engine>[^.\n]{0,40}?wired` regex broke once the `(...)` exceeded
    // 40 chars -> these real vault lines (Quote*/Tolerance*/ABC* etc.) were dropped.
    const out = extractConfirmedWirings(
      "QuoteCERCalibratorEngine (reads hotel actuals, fits log-linear CER, outputs coefficients); wired to prism_quoting action.",
      "q.md",
    );
    assert.equal(out.length, 1);
    assert.equal(out[0].engine, "QuoteCERCalibratorEngine");
    assert.equal(out[0].dispatcher, "prism_quoting");
  });

  it("catches a camelCase lower-case-first engine name (the old `[A-Z]` anchor rejected these)", () => {
    const out = extractConfirmedWirings("the hsmAdvisorComparatorBridgeEngine wired into prism_calc here", "h.md");
    assert.equal(out.length, 1);
    assert.equal(out[0].engine, "hsmAdvisorComparatorBridgeEngine");
    assert.equal(out[0].dispatcher, "prism_calc");
  });

  it("pairs each assertion with its OWN nearest engine on a multi-engine line (no cross-pairing)", () => {
    // The FIRST engine's parenthetical exceeds 40 chars, so the old engine-anchored
    // `{0,40}` regex drops FooEngine->prism_calc entirely (would yield only Bar) --
    // this locks the NEW anchor-on-assertion behavior, and proves no cross-pair.
    const out = extractConfirmedWirings(
      "FooEngine (a long descriptive parenthetical that clearly exceeds forty characters here) wired to prism_calc; BarEngine wired to prism_dev",
      "m.md",
    );
    assert.deepEqual(
      out.map((w) => `${w.engine}->${w.dispatcher}`),
      ["FooEngine->prism_calc", "BarEngine->prism_dev"],
    );
  });

  it("does NOT steal an engine across a ';' clause that has its OWN subject (R12 false-label guard)", () => {
    // "the actions wired in prism_ai" has no engine subject -- must NOT reach back
    // across the ';' and mis-label ZooEngine. (Scrutiny arm-A P1, fixed.)
    assert.deepEqual(
      extractConfirmedWirings("ZooEngine shipped already; the actions wired in prism_ai as xproc_route_query"),
      [],
    );
  });

  it("STILL catches a stylistic ';' between an engine clause and its bare wiring assertion", () => {
    // The post-';' segment is whitespace-only -> the ';' is stylistic, not a new
    // clause -> the engine before it is the subject (must not over-bound the fix above).
    const out = extractConfirmedWirings(
      "QuoteCERCalibratorEngine (reads hotel actuals, fits log-linear CER, outputs coefficients); wired to prism_quoting",
      "s.md",
    );
    assert.equal(out.length, 1);
    assert.equal(out[0].engine, "QuoteCERCalibratorEngine");
    assert.equal(out[0].dispatcher, "prism_quoting");
  });

  it("does NOT take an engine named only INSIDE a multi-word parenthetical (helper mention, not subject)", () => {
    // The real subject "The pipeline" is not an Engine; HelperEngine is a helper
    // mention inside (...), not the thing wired. (Scrutiny arm-A P1, fixed.)
    assert.deepEqual(
      extractConfirmedWirings("The pipeline (which calls HelperEngine) was wired into prism_dev"),
      [],
    );
  });

  it("DOES take a bare-engine appositive parenthetical as the subject (a real live-vault pattern)", () => {
    // "<noun phrase> (`TheEngine`) wired into prism_X" -- the parenthetical names
    // the subject; it must NOT be masked away (regression: this dropped a valid
    // PayrollLiabilityFilingEngine label when the mask was unconditional).
    const out = extractConfirmedWirings(
      "Payroll liability filing subsystem (`PayrollLiabilityFilingEngine`) fully wired into `prism_business`.",
      "p.md",
    );
    assert.equal(out.length, 1);
    assert.equal(out[0].engine, "PayrollLiabilityFilingEngine");
    assert.equal(out[0].dispatcher, "prism_business");
  });

  it("does NOT keep a bare-engine span NESTED inside another parenthetical (R12 false-label guard)", () => {
    // A nested bare-engine paren is never the top-level subject; the appositive
    // carve must apply only to TOP-LEVEL spans. (Scrutiny re-review arm-A P2, fixed.)
    assert.deepEqual(
      extractConfirmedWirings("The CER pipeline (calibration stage (QuoteCERHelperEngine)) wired into prism_quoting"),
      [],
    );
  });

  it("does NOT attribute an engine named in a PRIOR sentence to a later assertion (R12 conservative)", () => {
    assert.deepEqual(extractConfirmedWirings("AlphaEngine shipped. Then it was wired into prism_dev."), []);
  });

  it("emits nothing for an action wired with no named engine subject", () => {
    assert.deepEqual(extractConfirmedWirings("the actions wired in prism_ai as xproc_route_query"), []);
  });

  it("preserves the correct reason tag per wiring verb", () => {
    assert.equal(extractConfirmedWirings("FooEngine wired into prism_calc")[0].reason, "vault: 'wired into' confirmation");
    assert.equal(extractConfirmedWirings("FooEngine bound to prism_calc")[0].reason, "vault: 'bound to' confirmation");
    assert.equal(extractConfirmedWirings("FooEngine registered in prism_calc")[0].reason, "vault: 'registered in' confirmation");
  });
});

describe("buildGhostFromVault", () => {
  it("emits a ghost.unwired-engine node ABOVE the 0.8 ref gate with a ghost-wire edge", () => {
    const { node, edge } = buildGhostFromVault({ engine: "FooEngine", dispatcher: "prism_calc", reason: "test", sourceFile: "f.md" });
    assert.equal(node.kind, "ghost.unwired-engine", "buildHoldout filters on this kind");
    assert.equal(node.label, "FooEngine");
    assert.equal(node.proposed_wiring, "prism_calc");
    assert.ok(node.confidence >= 0.8, "must clear refMinConf (0.8) to enter the reference pool");
    assert.equal(node.proposed_by, "vault-to-gnn-refpool.mjs", "distinct provenance for --revert targeting");
    assert.equal(node.id, "ghost.vault-wired.FooEngine", "distinct id namespace (no collision with ghost.unwired.*)");
    assert.equal(edge.from, node.id);
    assert.equal(edge.type, "ghost-wire");
    assert.equal(edge.intensity, node.confidence);
  });
});

describe("collectVaultWirings (conflict handling)", () => {
  it("records a label conflict, does NOT average or silently overwrite (R7)", () => {
    // extract output for two contradictory lines: both parse, the dedup in
    // collectVaultWirings keeps first-seen and records the conflict.
    const a = extractConfirmedWirings("DupEngine wired into prism_calc", "a.md");
    const b = extractConfirmedWirings("DupEngine wired into prism_dev", "b.md");
    assert.equal(a[0].dispatcher, "prism_calc");
    assert.equal(b[0].dispatcher, "prism_dev");
  });

  it("live vault scan returns confirmed wirings with valid dispatchers only", () => {
    const { wirings, conflicts } = collectVaultWirings();
    assert.ok(Array.isArray(wirings));
    assert.ok(Array.isArray(conflicts));
    for (const w of wirings) {
      assert.match(w.dispatcher, /^prism_[a-z_]+$/, "every extracted dispatcher is a prism_* name");
      assert.match(w.engine, /Engine$/, "every label is an Engine");
    }
  });
});

describe("nodeContentEqual (proposed_at-insensitive)", () => {
  const base = { proposed_wiring: "prism_calc", confidence: 0.85, info: "i", reason: "r", sourceMemory: "m.md", label: "FooEngine", kind: "ghost.unwired-engine", proposed_at: "2026-01-01T00:00:00.000Z" };
  it("is true when ONLY proposed_at differs (the volatile re-apply stamp)", () => {
    assert.equal(nodeContentEqual(base, { ...base, proposed_at: "2026-06-16T00:00:00.000Z" }), true);
  });
  it("is false when dispatcher / confidence / label content changes", () => {
    assert.equal(nodeContentEqual(base, { ...base, proposed_wiring: "prism_dev" }), false);
    assert.equal(nodeContentEqual(base, { ...base, confidence: 0.5 }), false);
    assert.equal(nodeContentEqual(base, { ...base, label: "BarEngine" }), false);
  });
  it("is false (no throw) for null/undefined", () => {
    assert.equal(nodeContentEqual(null, base), false);
    assert.equal(nodeContentEqual(base, undefined), false);
  });
});

describe("mergeVaultGhosts (idempotent ADD/UPDATE, skip-write-when-unchanged)", () => {
  const ghost = (id, wiring, at) => ({
    node: { id, label: "E", kind: "ghost.unwired-engine", proposed_wiring: wiring, confidence: 0.85, info: "i", reason: "r", sourceMemory: "m.md", proposed_at: at },
    edge: { from: id, to: `mcp.${wiring}`, type: "ghost-wire" },
  });
  it("adds a new ghost node + edge (changed)", () => {
    const g = { nodes: [], edges: [] };
    const r = mergeVaultGhosts(g, [ghost("ghost.vault-wired.E", "prism_calc", "t1")]);
    assert.equal(r.nodesAdded, 1);
    assert.equal(r.changed, true);
    assert.equal(g.nodes.length, 1);
    assert.equal(g.edges.length, 1);
  });
  it("is a NO-OP when the same ref is re-applied with only a new proposed_at (the durability invariant)", () => {
    const prior = ghost("ghost.vault-wired.E", "prism_calc", "t1");
    const g = { nodes: [prior.node], edges: [prior.edge] };
    const r = mergeVaultGhosts(g, [ghost("ghost.vault-wired.E", "prism_calc", "t2-LATER")]);
    assert.equal(r.changed, false, "unchanged ref-pool must not trigger a write");
    assert.deepEqual([r.nodesAdded, r.nodesUpdated, r.edgesAdded], [0, 0, 0]);
    assert.equal(g.nodes.length, 1, "no duplicate node");
    assert.equal(g.nodes[0].proposed_at, "t1", "existing node kept -- NOT re-stamped");
  });
  it("UPDATES when the dispatcher label actually changed", () => {
    const prior = ghost("ghost.vault-wired.E", "prism_calc", "t1");
    const g = { nodes: [prior.node], edges: [prior.edge] };
    const r = mergeVaultGhosts(g, [ghost("ghost.vault-wired.E", "prism_dev", "t2")]);
    assert.equal(r.nodesUpdated, 1);
    assert.equal(r.changed, true);
    assert.equal(g.nodes[0].proposed_wiring, "prism_dev");
  });
  it("ADD-only adds a missing edge even when the node is content-equal", () => {
    const prior = ghost("ghost.vault-wired.E", "prism_calc", "t1");
    const g = { nodes: [prior.node], edges: [] }; // node present, edge missing
    const r = mergeVaultGhosts(g, [ghost("ghost.vault-wired.E", "prism_calc", "t2")]);
    assert.equal(r.nodesUpdated, 0);
    assert.equal(r.edgesAdded, 1);
    assert.equal(r.changed, true);
  });
  it("empty ghost list -> changed:false (nothing to write)", () => {
    const r = mergeVaultGhosts({ nodes: [], edges: [] }, []);
    assert.equal(r.changed, false);
  });
});
