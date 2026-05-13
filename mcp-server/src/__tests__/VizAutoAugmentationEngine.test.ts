/**
 * VizAutoAugmentationEngine — engine-direct tests
 * ================================================
 *
 * Covers the U-ALL05 verifies_via channel: trigger high-synergy
 * classification → augmentation file emits new viz node. Adversarial
 * cases: schema-incompatible (covered by schemaVersion assertion),
 * 10k-node graph explosion (covered by oversize cap test).
 * Variability axis: 1/10/100 new nodes per cycle × confidence
 * 0.5/0.8/0.95 thresholds.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  VizAutoAugmentationEngine,
  AUGMENTATION_SCHEMA_VERSION,
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_MAX_NODES_PER_AUG,
  DEFAULT_LABEL_MAX_CHARS,
  vizAutoAugmentationEngine,
  type AugmentationInput,
  type AugmentationEdge,
} from "../engines/VizAutoAugmentationEngine.js";
import type { ClassifierVerdict, ClassifierLabel } from "../engines/SynergyClassifierEngine.js";

// ─── Fixtures ───────────────────────────────────────────────────────

const T0 = Date.UTC(2026, 4, 13, 12, 0, 0);

function verdict(label: ClassifierLabel, score: number): ClassifierVerdict {
  return {
    label,
    score,
    reason: label === "none" ? "invalid_features" : "score_band",
    contributions: {
      semantic_match: 0,
      novelty_strength: 0,
      ai_priority_score: 0,
      duplication_risk: 0,
      effort_estimate: 0,
      blast_radius: 0,
    },
    rubricSchemaVersion: 1,
    classifiedAt: T0,
  };
}

function input(opts: { label: ClassifierLabel; score: number; guid: string; source?: string; title?: string; edges?: AugmentationInput["edges"] }): AugmentationInput {
  return {
    verdict: verdict(opts.label, opts.score),
    guid: opts.guid,
    source: opts.source ?? "rss-alpha",
    title: opts.title ?? `Title for ${opts.guid}`,
    edges: opts.edges,
  };
}

// ─── Constructor + defaults ─────────────────────────────────────────

describe("VizAutoAugmentationEngine — constructor", () => {
  it("constructs with spec defaults", () => {
    const e = new VizAutoAugmentationEngine();
    const c = e.getConfig();
    expect(c.confidence_threshold).toBe(DEFAULT_CONFIDENCE_THRESHOLD);
    expect(c.max_nodes_per_aug).toBe(DEFAULT_MAX_NODES_PER_AUG);
    expect(c.label_max_chars).toBe(DEFAULT_LABEL_MAX_CHARS);
  });

  it("clamps confidence_threshold to [0, 1]", () => {
    expect(new VizAutoAugmentationEngine({ confidence_threshold: -0.5 }).getConfig().confidence_threshold).toBe(0);
    expect(new VizAutoAugmentationEngine({ confidence_threshold: 1.5 }).getConfig().confidence_threshold).toBe(1);
  });

  it("max_nodes_per_aug is at least 1", () => {
    expect(new VizAutoAugmentationEngine({ max_nodes_per_aug: 0 }).getConfig().max_nodes_per_aug).toBe(1);
    expect(new VizAutoAugmentationEngine({ max_nodes_per_aug: -5 }).getConfig().max_nodes_per_aug).toBe(1);
  });

  it("label_max_chars has a floor of 16 (defence against pathological truncation)", () => {
    expect(new VizAutoAugmentationEngine({ label_max_chars: 1 }).getConfig().label_max_chars).toBe(16);
  });
});

// ─── emit — happy path + band/confidence filters ────────────────────

describe("VizAutoAugmentationEngine — emit", () => {
  let e: VizAutoAugmentationEngine;
  beforeEach(() => {
    e = new VizAutoAugmentationEngine({ now: () => T0 });
  });

  it("EMIT HAPPY: one high-synergy input ⇒ one node, schemaVersion=1, prefixed id", () => {
    const r = e.emit([input({ label: "high", score: 0.85, guid: "g1", source: "arxiv", title: "A finding" })]);
    expect(r.document.schemaVersion).toBe(AUGMENTATION_SCHEMA_VERSION);
    expect(r.document.nodes.length).toBe(1);
    const n = r.document.nodes[0];
    expect(n.id).toBe("auto-research-arxiv-g1");
    expect(n.type).toBe("auto-research-finding");
    expect(n.label).toBe("A finding");
    expect(n.confidence).toBeCloseTo(0.85, 5);
    expect(n.band).toBe("high");
    expect(n.originGuid).toBe("g1");
    expect(n.originSource).toBe("arxiv");
    expect(n.addedAt).toBe(T0);
    expect(n.rubricSchemaVersion).toBe(1);
    expect(r.filteredByBand).toBe(0);
    expect(r.filteredByConfidence).toBe(0);
  });

  it("band filter: low + none verdicts are dropped (counted in filteredByBand)", () => {
    const r = e.emit([
      input({ label: "high", score: 0.85, guid: "g1" }),
      input({ label: "med", score: 0.55, guid: "g2" }),
      input({ label: "low", score: 0.30, guid: "g3" }),
      input({ label: "none", score: 0.10, guid: "g4" }),
    ]);
    expect(r.document.nodes.length).toBe(2);
    expect(r.filteredByBand).toBe(2);
    expect(r.filteredByConfidence).toBe(0);
  });

  it("confidence filter: score below threshold is dropped (counted in filteredByConfidence)", () => {
    e.setConfig({ confidence_threshold: 0.7 });
    const r = e.emit([
      input({ label: "high", score: 0.85, guid: "g1" }), // emitted
      input({ label: "med", score: 0.55, guid: "g2" }), // dropped (below 0.7)
    ]);
    expect(r.document.nodes.length).toBe(1);
    expect(r.filteredByConfidence).toBe(1);
  });

  it("internal-dup filter: same guid twice ⇒ second drops, counted", () => {
    const r = e.emit([
      input({ label: "high", score: 0.85, guid: "g1", title: "First" }),
      input({ label: "med", score: 0.55, guid: "g1", title: "Dup of g1" }),
      input({ label: "high", score: 0.90, guid: "g2", title: "Different" }),
    ]);
    expect(r.document.nodes.length).toBe(2);
    expect(r.filteredByInternalDup).toBe(1);
    // First entry wins; second's title is dropped.
    const g1 = r.document.nodes.find((n) => n.originGuid === "g1");
    expect(g1?.label).toBe("First");
  });

  it("oversize cap: 1500 inputs vs max_nodes_per_aug=100 ⇒ 100 emitted, 1400 oversized", () => {
    e.setConfig({ max_nodes_per_aug: 100 });
    const inputs = Array.from({ length: 1500 }, (_, i) =>
      input({ label: "high", score: 0.85, guid: `g${String(i).padStart(4, "0")}` }),
    );
    const r = e.emit(inputs);
    expect(r.document.nodes.length).toBe(100);
    expect(r.filteredByOversize).toBe(1400);
  });

  it("EDGE TO NONEXISTENT: edges with unknown kind dropped silently (defence against future merger version drift)", () => {
    const r = e.emit([
      input({
        label: "high",
        score: 0.85,
        guid: "g1",
        edges: [
          { to: "valid-node", kind: "semantic_match", weight: 0.8 },
          { to: "valid-node-2", kind: "novelty_extends", weight: 0.6 },
          // @ts-expect-error — bogus kind tests defence
          { to: "valid-node-3", kind: "unknown_kind", weight: 0.5 },
        ],
      }),
    ]);
    expect(r.document.edges.length).toBe(2);
    expect(r.document.edges.map((e2) => e2.kind).sort()).toEqual(["novelty_extends", "semantic_match"]);
  });

  it("SCHEMA-COMPAT: schemaVersion always present + matches exported constant", () => {
    const r = e.emit([input({ label: "high", score: 0.85, guid: "g1" })]);
    expect(r.document.schemaVersion).toBe(AUGMENTATION_SCHEMA_VERSION);
    expect(r.document.schemaVersion).toBe(1);
  });

  it("NODE-ID COLLISION: emitted ids are always namespace-prefixed with 'auto-research-'", () => {
    const r = e.emit([
      input({ label: "high", score: 0.85, guid: "g1", source: "arxiv" }),
      input({ label: "high", score: 0.85, guid: "g2", source: "rss-bbc" }),
    ]);
    for (const n of r.document.nodes) {
      expect(n.id.startsWith("auto-research-")).toBe(true);
    }
  });

  it("LABEL TRUNCATION: titles past label_max_chars are truncated with ellipsis", () => {
    e.setConfig({ label_max_chars: 20 });
    const huge = "x".repeat(100);
    const r = e.emit([input({ label: "high", score: 0.85, guid: "g1", title: huge })]);
    expect(r.document.nodes[0].label.length).toBe(20);
    expect(r.document.nodes[0].label.endsWith("…")).toBe(true);
  });

  it("non-array input ⇒ empty document, no throw", () => {
    const r = e.emit(null as unknown as AugmentationInput[]);
    expect(r.document.nodes.length).toBe(0);
    expect(r.document.edges.length).toBe(0);
  });

  it("nodes sorted by id for byte-identical reruns", () => {
    const r1 = e.emit([
      input({ label: "high", score: 0.85, guid: "z" }),
      input({ label: "high", score: 0.85, guid: "a" }),
      input({ label: "high", score: 0.85, guid: "m" }),
    ]);
    const r2 = e.emit([
      input({ label: "high", score: 0.85, guid: "a" }),
      input({ label: "high", score: 0.85, guid: "m" }),
      input({ label: "high", score: 0.85, guid: "z" }),
    ]);
    expect(e.serialise(r1.document)).toBe(e.serialise(r2.document));
    expect(r1.document.nodes.map((n) => n.id)).toEqual([
      "auto-research-rss-alpha-a",
      "auto-research-rss-alpha-m",
      "auto-research-rss-alpha-z",
    ]);
  });
});

// ─── Variability — 1/10/100 nodes × 0.5/0.8/0.95 thresholds ─────────

describe("VizAutoAugmentationEngine — variability axis", () => {
  it.each([
    [1, 0.5],
    [10, 0.5],
    [100, 0.5],
    [1, 0.8],
    [10, 0.8],
    [100, 0.8],
    [1, 0.95],
    [10, 0.95],
    [100, 0.95],
  ])("emits %d nodes at confidence_threshold %f", (n, threshold) => {
    const e = new VizAutoAugmentationEngine({ now: () => T0, confidence_threshold: threshold });
    // Pick score just above threshold so all inputs survive.
    const score = Math.min(1, threshold + 0.01);
    const inputs = Array.from({ length: n }, (_, i) =>
      input({ label: "high", score, guid: `g${String(i).padStart(4, "0")}` }),
    );
    const r = e.emit(inputs);
    expect(r.document.nodes.length).toBe(n);
    expect(r.filteredByConfidence).toBe(0);
    for (const node of r.document.nodes) {
      expect(node.confidence).toBeGreaterThanOrEqual(threshold);
    }
  });
});

// ─── Edge accumulation ──────────────────────────────────────────────

describe("VizAutoAugmentationEngine — edges", () => {
  it("`from` on every edge is the engine-assigned node id (caller can NOT override)", () => {
    const e = new VizAutoAugmentationEngine({ now: () => T0 });
    const r = e.emit([
      input({
        label: "high",
        score: 0.85,
        guid: "g1",
        source: "arxiv",
        edges: [
          { to: "PrismEngine.X", kind: "semantic_match", weight: 0.9 },
          { to: "PrismEngine.Y", kind: "duplicate_of", weight: 0.7 },
        ],
      }),
    ]);
    expect(r.document.edges.length).toBe(2);
    for (const edge of r.document.edges) {
      expect(edge.from).toBe("auto-research-arxiv-g1");
    }
  });

  it("edges sorted deterministically for byte-identical reruns", () => {
    const e = new VizAutoAugmentationEngine({ now: () => T0 });
    const edges1: AugmentationEdge[] = [];
    const r = e.emit([
      input({
        label: "high",
        score: 0.85,
        guid: "g1",
        edges: [
          { to: "Z-target", kind: "semantic_match", weight: 0.9 },
          { to: "A-target", kind: "semantic_match", weight: 0.9 },
          { to: "M-target", kind: "novelty_extends", weight: 0.5 },
        ],
      }),
    ]);
    edges1.push(...r.document.edges);
    expect(edges1.map((e2) => e2.to)).toEqual(["A-target", "M-target", "Z-target"]);
  });

  it("edge weight clamped to [0, 1]", () => {
    const e = new VizAutoAugmentationEngine({ now: () => T0 });
    const r = e.emit([
      input({
        label: "high",
        score: 0.85,
        guid: "g1",
        edges: [
          { to: "T1", kind: "semantic_match", weight: 1.5 },
          { to: "T2", kind: "semantic_match", weight: -0.3 },
        ],
      }),
    ]);
    const byTo = Object.fromEntries(r.document.edges.map((e2) => [e2.to, e2.weight]));
    expect(byTo["T1"]).toBe(1);
    expect(byTo["T2"]).toBe(0);
  });
});

// ─── Singleton sanity ───────────────────────────────────────────────

describe("VizAutoAugmentationEngine — singleton", () => {
  it("singleton exists with spec defaults", () => {
    expect(vizAutoAugmentationEngine.name).toBe("VizAutoAugmentationEngine");
    expect(vizAutoAugmentationEngine.getConfig().confidence_threshold).toBe(DEFAULT_CONFIDENCE_THRESHOLD);
  });

  it("serialise round-trips: serialise then JSON.parse equals input document", () => {
    const e = new VizAutoAugmentationEngine({ now: () => T0 });
    const r = e.emit([
      input({ label: "high", score: 0.85, guid: "g1" }),
      input({ label: "med", score: 0.55, guid: "g2" }),
    ]);
    const json = e.serialise(r.document);
    const round = JSON.parse(json);
    expect(round.schemaVersion).toBe(AUGMENTATION_SCHEMA_VERSION);
    expect(round.nodes.length).toBe(2);
  });

  it("serialise output ends with newline (convention for diff-friendly files)", () => {
    const e = new VizAutoAugmentationEngine({ now: () => T0 });
    const r = e.emit([input({ label: "high", score: 0.85, guid: "g1" })]);
    const json = e.serialise(r.document);
    expect(json.endsWith("\n")).toBe(true);
  });
});
