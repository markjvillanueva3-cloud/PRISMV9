// scripts/lib/worklist-label-proposer.test.mjs
// Tests for the INDIA active-learning Ollama second-opinion proposer.
// Real intent (R9): the proposer can ONLY surface a valid dispatcher, agreement
// is computed against the GNN, and every Ollama failure mode degrades to "no
// proposal" (null) -- never a fabricated label. node:test + node:assert.
import { test } from "node:test";
import assert from "node:assert";
import {
  allowedFromWorklist,
  buildClassifyPrompt,
  proposeLabel,
  enrichWorklist,
  renderProposalMarkdown,
  balanceImpact,
} from "./worklist-label-proposer.mjs";

const ALLOWED = ["prism_cam", "prism_ai", "prism_calc"];

// ── allowedFromWorklist ──────────────────────────────────────────────────────
test("allowedFromWorklist: reads classDistribution keys (data-driven, no hardcode)", () => {
  const wl = { poolStats: { classDistribution: { prism_cam: 12, prism_ai: 6, prism_calc: 3 } } };
  assert.deepEqual(allowedFromWorklist(wl).sort(), ["prism_ai", "prism_calc", "prism_cam"]);
});
test("allowedFromWorklist: falls back to predictedDispatcher values when no dist", () => {
  const wl = { worklist: [{ predictedDispatcher: "prism_edm" }, { predictedDispatcher: "prism_ai" }, { predictedDispatcher: "prism_edm" }] };
  assert.deepEqual(allowedFromWorklist(wl).sort(), ["prism_ai", "prism_edm"]);
});
test("allowedFromWorklist: empty / null / malformed -> []", () => {
  assert.deepEqual(allowedFromWorklist(null), []);
  assert.deepEqual(allowedFromWorklist({}), []);
  assert.deepEqual(allowedFromWorklist({ poolStats: { classDistribution: { "": 1, "  ": 2 } } }), []);
});

// ── buildClassifyPrompt ──────────────────────────────────────────────────────
test("buildClassifyPrompt: lists allowed dispatchers + the engine name", () => {
  const p = buildClassifyPrompt("MillingForceEngine", "", ALLOWED);
  assert.match(p, /prism_cam, prism_ai, prism_calc/);
  assert.match(p, /MillingForceEngine/);
  assert.doesNotMatch(p, /source header/); // no card block when card empty
});
test("buildClassifyPrompt: includes + caps the card context when present", () => {
  const big = "x".repeat(5000);
  const p = buildClassifyPrompt("E", big, ALLOWED);
  assert.match(p, /source header/);
  // card capped at 1400 chars
  assert.ok(p.length < 2200, `prompt should cap the card, got ${p.length}`);
});

// ── proposeLabel (verifiedOffload + enumMember) ──────────────────────────────
test("proposeLabel: valid dispatcher from Ollama -> ollamaPred set (happy)", async () => {
  const r = await proposeLabel({ engine: "E", allowed: ALLOWED, run: async () => "prism_ai" });
  assert.equal(r.ollamaPred, "prism_ai");
  assert.equal(r.source, "ollama");
  assert.equal(r.verified, true);
});
test("proposeLabel: case/whitespace snaps to the canonical member (adversarial)", async () => {
  const r = await proposeLabel({ engine: "E", allowed: ALLOWED, run: async () => "  PRISM_CAM \n" });
  assert.equal(r.ollamaPred, "prism_cam", "near-match must snap to the canonical allowed id");
});
test("proposeLabel: OFF-LIST answer -> null (anti-hallucination, failure mode)", async () => {
  const r = await proposeLabel({ engine: "E", allowed: ALLOWED, run: async () => "prism_totally_made_up" });
  assert.equal(r.ollamaPred, null, "an off-list id must NOT become a label");
  assert.equal(r.source, "fallback");
});
test("proposeLabel: run THROWS -> null (failure mode)", async () => {
  const r = await proposeLabel({ engine: "E", allowed: ALLOWED, run: async () => { throw new Error("ollama down"); } });
  assert.equal(r.ollamaPred, null);
});
test("proposeLabel: empty / non-string Ollama output -> null (failure + adversarial)", async () => {
  assert.equal((await proposeLabel({ engine: "E", allowed: ALLOWED, run: async () => "" })).ollamaPred, null);
  assert.equal((await proposeLabel({ engine: "E", allowed: ALLOWED, run: async () => ({ rogue: 1 }) })).ollamaPred, null);
});
test("proposeLabel: missing run throws TypeError (contract)", async () => {
  await assert.rejects(() => proposeLabel({ engine: "E", allowed: ALLOWED }), /run must be a function/);
});

// ── enrichWorklist ───────────────────────────────────────────────────────────
test("enrichWorklist: computes agree / conflict / noProposal + rate (real intent)", () => {
  const wl = [
    { engine: "A", predictedDispatcher: "prism_cam", rank: 1 },
    { engine: "B", predictedDispatcher: "prism_ai", rank: 2 },
    { engine: "C", predictedDispatcher: "prism_calc", rank: 3 },
  ];
  const props = {
    A: { ollamaPred: "prism_cam" },   // agree
    B: { ollamaPred: "prism_calc" },  // conflict
    C: { ollamaPred: null },          // no proposal
  };
  const { worklist, stats } = enrichWorklist(wl, props);
  assert.equal(worklist[0].agree, true);
  assert.equal(worklist[1].agree, false);
  assert.equal(worklist[2].agree, null);
  assert.deepEqual(
    { total: stats.total, proposed: stats.proposed, agree: stats.agree, conflict: stats.conflict, noProposal: stats.noProposal },
    { total: 3, proposed: 2, agree: 1, conflict: 1, noProposal: 1 },
  );
  assert.equal(stats.agreementRate, 0.5);
});
test("enrichWorklist: empty worklist -> zeroed stats, rate 0 (edge)", () => {
  const { worklist, stats } = enrichWorklist([], {});
  assert.equal(worklist.length, 0);
  assert.equal(stats.agreementRate, 0);
  assert.equal(stats.proposed, 0);
});
test("enrichWorklist: a ghost with no GNN pred -> agree null even with a proposal (adversarial)", () => {
  const { worklist } = enrichWorklist([{ engine: "Z" }], { Z: { ollamaPred: "prism_ai" } });
  assert.equal(worklist[0].agree, null, "cannot agree/conflict without a GNN prediction");
});

// ── renderProposalMarkdown ───────────────────────────────────────────────────
test("renderProposalMarkdown: conflicts sorted first + carries the stats headline", () => {
  const enriched = [
    { engine: "A", predictedDispatcher: "prism_cam", confidence: 0.9, ollamaPred: "prism_cam", agree: true, rank: 1 },
    { engine: "B", predictedDispatcher: "prism_ai", confidence: 0.3, ollamaPred: "prism_calc", agree: false, rank: 2 },
  ];
  const md = renderProposalMarkdown(enriched, { total: 2, proposed: 2, agree: 1, conflict: 1, noProposal: 0, agreementRate: 0.5 });
  assert.match(md, /1\/2 agree/);
  // conflict row (B) must appear before the agree row (A)
  assert.ok(md.indexOf("`B`") < md.indexOf("`A`"), "CONFLICT must sort above agree for operator attention");
});
test("renderProposalMarkdown: empty enriched -> still renders a valid header (edge)", () => {
  const md = renderProposalMarkdown([], { total: 0, proposed: 0, agree: 0, conflict: 0, noProposal: 0, agreementRate: 0 });
  assert.match(md, /Ollama second-opinion/);
});

// ── balanceImpact + rebalance ordering (the class-collapse lever) ─────────────
test("balanceImpact: rarer class -> higher; majority -> 0; unseen -> 1; null -> 0", () => {
  const dist = { prism_cam: 12, prism_ai: 6, prism_turning: 2 };
  assert.equal(balanceImpact("prism_cam", dist), 0, "majority class -> 0 lift");
  assert.equal(balanceImpact("prism_turning", dist), Number((1 - 2 / 12).toFixed(3)), "rare class -> high lift");
  assert.equal(balanceImpact("prism_safety", dist), 1, "unseen class -> max lift (1.0)");
  assert.equal(balanceImpact(null, dist), 0, "no proposal -> 0");
  assert.equal(balanceImpact("prism_ai", {}), 1, "no distribution -> any label maximally informative");
});
test("renderProposalMarkdown: CONFLICTs ordered by rebalance impact + rebalance set surfaced", () => {
  // Two conflicts: X proposes the majority class (low lift), Y proposes a rare class (high lift).
  const enriched = [
    { engine: "X", predictedDispatcher: "prism_ai", confidence: 0.3, ollamaPred: "prism_cam", agree: false, rank: 1 },
    { engine: "Y", predictedDispatcher: "prism_cam", confidence: 0.3, ollamaPred: "prism_turning", agree: false, rank: 2 },
  ];
  const dist = { prism_cam: 12, prism_ai: 6, prism_turning: 2 };
  const md = renderProposalMarkdown(enriched, { total: 2, proposed: 2, agree: 0, conflict: 2, noProposal: 0, agreementRate: 0 }, dist);
  // Y (rare-class proposal, high lift) must sort ABOVE X (majority-class proposal, low lift)
  assert.ok(md.indexOf("`Y`") < md.indexOf("`X`"), "highest anti-collapse-lift conflict must come first");
  assert.match(md, /Rebalance set/);
  assert.match(md, /`Y`/); // Y (impact ~0.83 >= 0.5) is in the rebalance set
});
