/**
 * Tests for ai-synergy-audit-lib.mjs (AI-SYNERGY-AUDIT-MS0/U-AISYN-CORE, slot:charlie).
 * Real reference values (hand-computed from the weight model), not stubs (R9).
 * Run: node --test scripts/lib/ai-synergy-audit-lib.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AI_TERMS,
  DIMENSIONS,
  BANDS,
  GAP_FLOOR,
  distinctAiTerms,
  normalizeEngineName,
  classifyAiEngine,
  scoreGalaxyAiSynergy,
  rollupFleet,
} from "./ai-synergy-audit-lib.mjs";

// ---------------------------------------------------------------------------
// Invariants
// ---------------------------------------------------------------------------
test("DIMENSIONS weights sum to exactly 1.0", () => {
  const sum = DIMENSIONS.reduce((a, d) => a + d.weight, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, `weights sum=${sum}`);
  assert.equal(DIMENSIONS.length, 5);
});

// ---------------------------------------------------------------------------
// distinctAiTerms
// ---------------------------------------------------------------------------
test("distinctAiTerms: happy path counts DISTINCT terms", () => {
  const s = distinctAiTerms("This engine uses a GNN with LoRA and RAG.");
  assert.equal(s.size, 3); // gnn, lora, rag
});

test("distinctAiTerms: distinct, not frequency (repeats count once)", () => {
  const s = distinctAiTerms("neural neural neural neural");
  assert.equal(s.size, 1);
});

test("distinctAiTerms: empty + null -> empty set (no throw)", () => {
  assert.equal(distinctAiTerms("").size, 0);
  assert.equal(distinctAiTerms(null).size, 0);
  assert.equal(distinctAiTerms(undefined).size, 0);
  assert.equal(distinctAiTerms(42).size, 0);
});

test("distinctAiTerms: ADVERSARIAL no false positives (storage/drag/fragment/email/domain)", () => {
  // "rag" lives inside storage/drags/fragments but never on a word boundary.
  const s = distinctAiTerms("The storage engine emails domain data and drags fragments.");
  assert.equal(s.size, 0);
});

test("distinctAiTerms: ADVERSARIAL multi-word terms recognized; ambiguous 'tier-5' is NOT", () => {
  const s = distinctAiTerms("A retrieval-augmented cache-augmented GNN pipeline.");
  // retrieval-augmented, cache-augmented, gnn => 3 distinct
  assert.equal(s.size, 3);
  // "tier-5" is intentionally NOT an AI term (PRISM overloads it for hook/wiring tiers).
  assert.equal(distinctAiTerms("a tier-5 hook escalation").size, 0);
});

// ---------------------------------------------------------------------------
// normalizeEngineName / classifyAiEngine
// ---------------------------------------------------------------------------
test("normalizeEngineName splits camelCase + acronyms", () => {
  assert.equal(normalizeEngineName("IdeaBlockRagEngine.ts"), "idea block rag engine");
  assert.equal(normalizeEngineName("GraphSAGETrainer"), "graph sage trainer");
  assert.equal(normalizeEngineName("QuotingDeepReasoningBridgeEngine"), "quoting deep reasoning bridge engine");
});

test("classifyAiEngine: happy classifications", () => {
  assert.equal(classifyAiEngine("GraphSAGETrainer.ts"), "gnn");
  assert.equal(classifyAiEngine("MillLoRAEngine"), "lora");
  assert.equal(classifyAiEngine("IdeaBlockRagEngine.ts"), "rag");
  assert.equal(classifyAiEngine("QuotingDeepReasoningBridgeEngine.ts"), "bridge");
  assert.equal(classifyAiEngine("CrossProcessNeuralLearningEngine"), "neural");
  assert.equal(classifyAiEngine("EmbeddingPoolEngine"), "embedding");
});

test("classifyAiEngine: ADVERSARIAL non-AI names return null (no false positive)", () => {
  // ExplorationEngine contains 'lora' as a substring (exp-LORA-tion) but not as a token.
  assert.equal(classifyAiEngine("ExplorationEngine"), null);
  assert.equal(classifyAiEngine("StorageEngine"), null);
  assert.equal(classifyAiEngine("ShopConfigurationEngine"), null);
});

test("classifyAiEngine: invalid input -> null (no throw)", () => {
  assert.equal(classifyAiEngine(""), null);
  assert.equal(classifyAiEngine(null), null);
  assert.equal(classifyAiEngine(123), null);
});

// ---------------------------------------------------------------------------
// scoreGalaxyAiSynergy
// ---------------------------------------------------------------------------
test("scoreGalaxyAiSynergy: fully-synergized galaxy scores 1.0 / strong / no gaps", () => {
  const r = scoreGalaxyAiSynergy({
    galaxy: "ai-training",
    claudeMd: "Uses GNN, LoRA, RAG, neural deep-reasoning, embedding, CAG.",
    memoryMd: "GNN tier-5, LoRA adapters, RAG corpus, neural retrieval-augmented.",
    aiEngineCount: 5,
    bridgeCount: 2,
    hasSynthesis: true,
    inLoraDataset: true,
    edges: { ownedBySlot: true, documentedBy: true, consensusOf: true, embeds: true },
    hasAwarenessGen: true,
  });
  assert.equal(r.score, 1);
  assert.equal(r.band, "strong");
  assert.deepEqual(r.gaps, []);
  assert.equal(r.subScores.discoverability, 1);
  assert.equal(r.subScores.crossSubstrate, 1);
});

test("scoreGalaxyAiSynergy: AI-island galaxy scores 0.4 / weak / 3 gaps (reference value)", () => {
  // claudeMd has exactly 1 distinct AI term, memoryMd 0.
  // discoverability = 0.6*(1/3) + 0.4*0 = 0.2
  // ownsOrWiresAi  = 0 (no engines, no bridges)
  // vaultSynergy   = 0.6*1 + 0.4*1 = 1.0
  // crossSubstrate = 0.5 + 0.5 = 1.0 (ownedBySlot + documentedBy; consensus/embeds are bonus)
  // awarenessSurface = 0.3 (synthesis only)
  // total = .25*.2 + .25*0 + .20*1 + .20*1 + .10*.3 = .05+0+.2+.2+.03 = 0.48
  const r = scoreGalaxyAiSynergy({
    galaxy: "mill",
    claudeMd: "This galaxy has a neural net somewhere.",
    memoryMd: "Mill VMC-01..05, 222 engines.",
    aiEngineCount: 0,
    bridgeCount: 0,
    hasSynthesis: true,
    inLoraDataset: true,
    edges: { ownedBySlot: true, documentedBy: true, consensusOf: false, embeds: false },
    hasAwarenessGen: false,
  });
  assert.equal(r.subScores.discoverability, 0.2);
  assert.equal(r.subScores.ownsOrWiresAi, 0);
  assert.equal(r.subScores.vaultSynergy, 1);
  assert.equal(r.subScores.crossSubstrate, 1); // 0.5*owned + 0.5*documented (galaxy-grain edges = full)
  assert.equal(r.subScores.awarenessSurface, 0.3);
  assert.equal(r.score, 0.48);
  assert.equal(r.band, "partial"); // 0.48 >= 0.45
  assert.equal(r.gaps.length, 3);
  const gapDims = r.gaps.map((g) => g.dimension).sort();
  assert.deepEqual(gapDims, ["awarenessSurface", "discoverability", "ownsOrWiresAi"]);
  assert.equal(r.recommendations.length, 3);
});

test("scoreGalaxyAiSynergy: empty galaxy scores 0.0 / weak / all 5 gaps", () => {
  const r = scoreGalaxyAiSynergy({ galaxy: "void" });
  assert.equal(r.score, 0);
  assert.equal(r.band, "weak");
  assert.equal(r.gaps.length, 5);
});

test("scoreGalaxyAiSynergy: bridge alone = full wire (owns OR wires => max)", () => {
  // assetScore=0, bridgeScore=1 => ownsOrWiresAi = max(0, 1) = 1.0 (wired = synergized)
  const r = scoreGalaxyAiSynergy({ galaxy: "quoting", bridgeCount: 1, aiEngineCount: 0 });
  assert.equal(r.subScores.ownsOrWiresAi, 1);
});

test("scoreGalaxyAiSynergy: AI dispatcher action alone = full wire", () => {
  const r = scoreGalaxyAiSynergy({ galaxy: "mill", aiEngineCount: 0, bridgeCount: 0, aiDispatcherActions: 3 });
  assert.equal(r.subScores.ownsOrWiresAi, 1);
  assert.equal(r.signals.aiDispatcherActions, 3);
  // engines also -> full
  assert.equal(scoreGalaxyAiSynergy({ galaxy: "mill", aiEngineCount: 2, aiDispatcherActions: 1 }).subScores.ownsOrWiresAi, 1);
  // bridge + dispatcher -> full (max, no double-count)
  assert.equal(scoreGalaxyAiSynergy({ galaxy: "mill", bridgeCount: 1, aiDispatcherActions: 5 }).subScores.ownsOrWiresAi, 1);
});

test("scoreGalaxyAiSynergy: validated generic reasoning bridge = full wire (synergy=wired)", () => {
  const r = scoreGalaxyAiSynergy({ galaxy: "wiring", servedByReasoningBridge: true });
  assert.equal(r.subScores.ownsOrWiresAi, 1);
  assert.equal(r.signals.servedByReasoningBridge, true);
  assert.ok(!r.gaps.some((g) => g.dimension === "ownsOrWiresAi"));
  // NOT wired at all -> still 0 (a gap)
  assert.equal(scoreGalaxyAiSynergy({ galaxy: "wiring" }).subScores.ownsOrWiresAi, 0);
});

test("scoreGalaxyAiSynergy: fleet-hook awareness = 0.7 partial, dedicated-gen = 1.0 (R12 no over-claim)", () => {
  assert.equal(scoreGalaxyAiSynergy({ galaxy: "g", awarenessKind: "fleet-hook" }).subScores.awarenessSurface, 0.7);
  assert.equal(scoreGalaxyAiSynergy({ galaxy: "g", awarenessKind: "dedicated-gen" }).subScores.awarenessSurface, 1);
  // back-compat: hasAwarenessGen=true still maps to dedicated-gen (1.0)
  assert.equal(scoreGalaxyAiSynergy({ galaxy: "g", hasAwarenessGen: true }).subScores.awarenessSurface, 1);
  // synthesis-only fallback unchanged (0.3); nothing -> 0
  assert.equal(scoreGalaxyAiSynergy({ galaxy: "g", hasSynthesis: true }).subScores.awarenessSurface, 0.3);
  assert.equal(scoreGalaxyAiSynergy({ galaxy: "g" }).subScores.awarenessSurface, 0);
  // fleet-hook (0.7) still clears the 0.5 gap floor -> NOT reported as a gap
  const r = scoreGalaxyAiSynergy({ galaxy: "g", awarenessKind: "fleet-hook" });
  assert.ok(!r.gaps.some((x) => x.dimension === "awarenessSurface"));
});

test("scoreGalaxyAiSynergy: SOUL.md is an awareness surface (0.6) -- covers slotless galaxies", () => {
  // slotless galaxy: no hook, no gen, but a SOUL.md -> 0.6 (clears the 0.5 floor)
  const r = scoreGalaxyAiSynergy({ galaxy: "wiring", hasSoul: true, hasSynthesis: true });
  assert.equal(r.subScores.awarenessSurface, 0.6);
  assert.equal(r.signals.hasSoul, true);
  assert.ok(!r.gaps.some((x) => x.dimension === "awarenessSurface"));
  // MAX over surfaces: a slot-mapped galaxy with a soul keeps the higher fleet-hook 0.7
  assert.equal(scoreGalaxyAiSynergy({ galaxy: "g", awarenessKind: "fleet-hook", hasSoul: true }).subScores.awarenessSurface, 0.7);
  // dedicated-gen still wins at 1.0
  assert.equal(scoreGalaxyAiSynergy({ galaxy: "g", awarenessKind: "dedicated-gen", hasSoul: true }).subScores.awarenessSurface, 1);
  // synthesis-only (no soul) stays 0.3
  assert.equal(scoreGalaxyAiSynergy({ galaxy: "g", hasSynthesis: true }).subScores.awarenessSurface, 0.3);
});

test("scoreGalaxyAiSynergy: FAILURE throws on missing/empty galaxy", () => {
  assert.throws(() => scoreGalaxyAiSynergy({}), /galaxy/);
  assert.throws(() => scoreGalaxyAiSynergy({ galaxy: "" }), /galaxy/);
  assert.throws(() => scoreGalaxyAiSynergy({ galaxy: "   " }), /galaxy/);
  assert.throws(() => scoreGalaxyAiSynergy(null), /galaxy/);
});

test("scoreGalaxyAiSynergy: ADVERSARIAL NaN/negative counts clamp to 0, never crash", () => {
  const r = scoreGalaxyAiSynergy({
    galaxy: "x",
    aiEngineCount: NaN,
    bridgeCount: -5,
    claudeMd: 12345, // non-string -> treated as empty
  });
  assert.equal(r.subScores.ownsOrWiresAi, 0);
  assert.equal(r.subScores.discoverability, 0);
  assert.ok(r.score >= 0 && r.score <= 1);
});

test("scoreGalaxyAiSynergy: ADVERSARIAL score can never exceed 1 even with over-large counts", () => {
  const r = scoreGalaxyAiSynergy({
    galaxy: "x",
    claudeMd: "gnn lora rag cag neural embedding deep-reasoning deep-learning tier-5",
    memoryMd: "gnn lora rag neural embedding",
    aiEngineCount: 999,
    bridgeCount: 999,
    hasSynthesis: true,
    inLoraDataset: true,
    edges: { ownedBySlot: true, documentedBy: true, consensusOf: true, embeds: true },
    hasAwarenessGen: true,
  });
  assert.equal(r.score, 1);
  for (const v of Object.values(r.subScores)) assert.ok(v <= 1);
});

// ---------------------------------------------------------------------------
// rollupFleet
// ---------------------------------------------------------------------------
test("rollupFleet: 3-galaxy rollup mean/median/bands/coverage (reference values)", () => {
  const a = scoreGalaxyAiSynergy({
    galaxy: "a",
    claudeMd: "gnn lora rag",
    memoryMd: "gnn lora rag",
    aiEngineCount: 5,
    bridgeCount: 2,
    hasSynthesis: true,
    inLoraDataset: true,
    edges: { ownedBySlot: true, documentedBy: true, consensusOf: true, embeds: true },
    hasAwarenessGen: true,
  }); // score 1.0
  const b = scoreGalaxyAiSynergy({
    galaxy: "b",
    claudeMd: "neural",
    hasSynthesis: true,
    inLoraDataset: true,
    edges: { ownedBySlot: true, documentedBy: true },
  }); // score 0.48
  const c = scoreGalaxyAiSynergy({ galaxy: "c" }); // score 0.0

  const roll = rollupFleet([a, b, c]);
  assert.equal(roll.galaxies, 3);
  assert.equal(roll.medianScore, 0.48); // middle of [0, 0.48, 1.0]
  assert.equal(roll.meanScore, 0.493); // (0+0.48+1.0)/3 = 0.4933 -> round3
  assert.deepEqual(roll.bands, { strong: 1, partial: 1, weak: 1 });
  // discoverability: only 'a' passes (>=0.5)
  assert.equal(roll.dimensionCoverage.discoverability.passing, 1);
  assert.equal(roll.dimensionCoverage.discoverability.total, 3);
  // worst-first ordering
  assert.equal(roll.worst[0].galaxy, "c");
  assert.equal(roll.worst[0].score, 0);
});

test("rollupFleet: empty input -> zeroed rollup (no throw)", () => {
  const roll = rollupFleet([]);
  assert.equal(roll.galaxies, 0);
  assert.equal(roll.meanScore, 0);
  assert.deepEqual(roll.worst, []);
  assert.deepEqual(rollupFleet(null).bands, { strong: 0, partial: 0, weak: 0 });
});

test("AI_TERMS + GAP_FLOOR + BANDS exported sane", () => {
  assert.ok(Array.isArray(AI_TERMS) && AI_TERMS.length > 5);
  assert.equal(GAP_FLOOR, 0.5);
  assert.ok(BANDS.strong > BANDS.partial);
});
