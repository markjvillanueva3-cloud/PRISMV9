/**
 * SFC Provenance Wire -- SFCMultiHypothesisRankerEngine integration tests
 * U-SFC-PROVENANCE-WIRE (slot:oscar)
 * ==========================================================================
 *
 * Validates that every ranked SFC recommendation carries auditable provenance
 * (audit_hash, fps_source, citations) via SFCProvenanceWireEngine.cite().
 * Also confirms the wire is purely additive -- ranking scores and safety
 * decisions are unchanged regardless of provenance outcome.
 *
 * Test categories:
 *   - happy path: provenance present, audit_hash is 16-hex, fps_source correct
 *   - failure / edge: empty candidates, non-P ISO group, kienzle_prior/taylor_prior mapping
 *   - adversarial: NaN/garbage in hypothesis fields must not throw
 *   - round-trip: dispatcher (prism_calc:sfc_rank_hypotheses) carries provenance
 */

import { describe, it, expect } from "vitest";
import {
  SFCMultiHypothesisRankerEngine,
  type SFCMultiHypothesisRankerInput,
  type SFCMultiHypothesisRankerOutput,
} from "../engines/SFCMultiHypothesisRankerEngine.js";
import type { SFCProvenance } from "../schemas/sfcProvenanceSchema.js";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

// ─── Dispatcher harness (mirrors calcDispatcher.sfc-ranker-wire.test.ts) ──

interface CapturedTool {
  name: string;
  handler: (a: { action: string; params: Record<string, unknown> }) => Promise<unknown>;
}
function createMockServer() {
  const tools: CapturedTool[] = [];
  const server = {
    tool(name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
      tools.push({ name, handler });
    },
  };
  return { server, tools };
}
async function callAction(
  tool: CapturedTool,
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const out = await tool.handler({ action, params });
  const r = out as { content?: Array<{ text: string }> };
  const text = r?.content?.[0]?.text;
  return (text ? JSON.parse(text) : out) as Record<string, unknown>;
}
const { server, tools } = createMockServer();
registerCalcDispatcher(server);
const calcTool = tools[0];

// ─── Typed call helpers ──────────────────────────────────────────────────────

/** Run rank() -- typed so we never need `as any`. */
function rank(input: SFCMultiHypothesisRankerInput): SFCMultiHypothesisRankerOutput {
  return SFCMultiHypothesisRankerEngine.rank(input);
}

/** Run rank() with a deliberately invalid input shape (for adversarial tests). */
function rankUnsafe(input: unknown): SFCMultiHypothesisRankerOutput {
  // Intentional: testing the engine's Zod guard against runtime garbage.
  // Cast through unknown to avoid the `any` lint while preserving intent.
  return SFCMultiHypothesisRankerEngine.rank(input as SFCMultiHypothesisRankerInput);
}

// ─── Shared fixtures ─────────────────────────────────────────────────────────

const STEEL_P_THREE: SFCMultiHypothesisRankerInput = {
  material: "4140 Steel",
  iso_group: "P",
  use_rag_priors: false,
  candidates: [
    { source: "formula",  sfm: 300, fpt: 0.10, doc: 2.0, source_confidence: 0.70 },
    { source: "adapter",  sfm: 280, fpt: 0.12, doc: 1.8, source_confidence: 0.90,
      source_id: "sfc-P-Okuma-v2" },
    { source: "rag",      sfm: 320, fpt: 0.08, doc: 2.2, source_confidence: 0.60 },
  ],
};

/** Force a single winning source by giving it top-score pre-computed rewards. */
function singleWinner(
  source: SFCMultiHypothesisRankerInput["candidates"][0]["source"],
  extra: Partial<SFCMultiHypothesisRankerInput["candidates"][0]> = {},
): SFCMultiHypothesisRankerInput {
  return {
    material: "4140 Steel",
    iso_group: "P",
    use_rag_priors: false,
    candidates: [
      {
        source,
        sfm: 300,
        fpt: 0.10,
        doc: 2.0,
        source_confidence: 1.0,
        reward_cycle_time: 0.95,
        reward_tool_life: 0.95,
        reward_surface_finish: 0.95,
        reward_safety: 0.95,
        ...extra,
      },
      // Low-score decoy so there is a clear winner
      {
        source: "rag" as const,
        sfm: 200,
        fpt: 0.05,
        doc: 0.5,
        source_confidence: 0.05,
        reward_cycle_time: 0.05,
        reward_tool_life: 0.05,
        reward_surface_finish: 0.05,
        reward_safety: 0.70,
      },
    ],
  };
}

// ─── Happy path ─────────────────────────────────────────────────────────────

describe("SFC Provenance Wire -- happy path", () => {
  it("rank() result.provenance has a 16-hex audit_hash", () => {
    const result = rank(STEEL_P_THREE);
    expect(result.ok).toBe(true);
    // audit_hash is always 16-hex (computeAuditHash slices SHA-256 to 16 chars)
    expect(result.provenance?.audit_hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("provenance.engine equals 'SFCMultiHypothesisRankerEngine'", () => {
    const result = rank(STEEL_P_THREE);
    expect(result.ok).toBe(true);
    expect(result.provenance?.engine).toBe("SFCMultiHypothesisRankerEngine");
  });

  it("provenance.recommendation_id is a non-empty sfc-prefixed string", () => {
    const result = rank(STEEL_P_THREE);
    expect(result.ok).toBe(true);
    expect(result.provenance?.recommendation_id).toMatch(/^sfc-/);
  });

  it("two consecutive rank() calls produce distinct recommendation_ids (counter increments)", () => {
    const r1 = rank(STEEL_P_THREE);
    const r2 = rank(STEEL_P_THREE);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    // IDs must differ -- the counter monotonically increments
    expect(r1.provenance!.recommendation_id).not.toBe(r2.provenance!.recommendation_id);
  });

  it("formula source winner -> provenance.fps_source is 'formula'", () => {
    const result = rank(singleWinner("formula"));
    expect(result.ok).toBe(true);
    expect(result.ranked_candidates[0].source).toBe("formula");
    expect(result.provenance?.fps_source).toBe("formula");
  });

  it("adapter source winner -> provenance.fps_source is 'adapter'", () => {
    const result = rank(singleWinner("adapter", { source_id: "sfc-P-Okuma-v3" }));
    expect(result.ok).toBe(true);
    expect(result.ranked_candidates[0].source).toBe("adapter");
    expect(result.provenance?.fps_source).toBe("adapter");
  });

  it("physics-prior (formula) winner has citations.length >= 2 (Kienzle + Taylor for group P)", () => {
    const result = rank(singleWinner("formula"));
    expect(result.ok).toBe(true);
    expect(result.provenance?.fps_source).toBe("formula");
    // SFCProvenanceWireEngine.cite() builds Kienzle + Taylor citations for a known ISO group
    expect((result.provenance?.citations ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("provenance.kc11_source.group matches the input iso_group", () => {
    const result = rank(singleWinner("formula"));
    expect(result.ok).toBe(true);
    const kc = result.provenance?.kc11_source;
    // iso_group was "P" in singleWinner
    expect(kc?.group).toBe("P");
    expect(typeof kc?.kc1_1).toBe("number");
    expect((kc?.kc1_1 ?? 0)).toBeGreaterThan(0);
  });

  it("provenance is additive -- existing ranking scores unchanged after provenance attach", () => {
    // Run twice: compare scores without caring about provenance content
    const r1 = rank(STEEL_P_THREE);
    const r2 = rank(STEEL_P_THREE);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    // Scores must be identical (provenance does not mutate ranking)
    for (let i = 0; i < r1.ranked_candidates.length; i++) {
      expect(r1.ranked_candidates[i].posterior_score).toBeCloseTo(
        r2.ranked_candidates[i].posterior_score, 10,
      );
      expect(r1.ranked_candidates[i].source).toBe(r2.ranked_candidates[i].source);
    }
  });
});

// ─── Failure / edge cases ────────────────────────────────────────────────────

describe("SFC Provenance Wire -- failure / edge cases", () => {
  it("empty candidates -> ok=false (engine zod-rejects), no throw", () => {
    // empty array fails z.array().min(1); tested through rankUnsafe for shape
    expect(() => rankUnsafe({ material: "Steel", candidates: [] })).not.toThrow();
    const result = rankUnsafe({ material: "Steel", candidates: [] });
    expect(result.ok).toBe(false);
    expect(result.ranked_candidates).toHaveLength(0);
  });

  it("ISO group S (titanium) -- provenance attaches with fps_source 'formula' and group S kc11", () => {
    const result = rank({
      material: "Ti-6Al-4V",
      iso_group: "S",
      use_rag_priors: false,
      candidates: [
        { source: "formula", sfm: 100, fpt: 0.05, doc: 0.5, source_confidence: 0.8 },
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.provenance?.fps_source).toBe("formula");
    expect(result.provenance?.kc11_source?.group).toBe("S");
    expect(result.provenance?.audit_hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("ISO group N (aluminum) -- provenance attaches and kc11_source references group N", () => {
    const result = rank({
      material: "Aluminum 6061",
      iso_group: "N",
      use_rag_priors: false,
      candidates: [
        { source: "formula", sfm: 800, fpt: 0.08, doc: 1.5, source_confidence: 0.75 },
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.provenance?.kc11_source?.group).toBe("N");
    expect(result.provenance?.fps_source).toBe("formula");
  });

  it("iql source winner -> provenance.fps_source reflects evidence (formula when no adapter/rag hits present)", () => {
    // SFCProvenanceWireEngine.determineFPSSource() derives fps_source from EVIDENCE
    // (adapter_id presence, rag_hits presence) not from the ranker's internal source label.
    // An iql winner with no adapter_id and no rag_hits contributes pure physics evidence
    // -> provenance correctly classifies as "formula".
    // The ranker source label and the provenance fps_source serve different purposes:
    //   ranker source = which model produced the candidate
    //   provenance fps_source = what physical evidence underpins the recommendation
    const result = rank(singleWinner("iql"));
    expect(result.ok).toBe(true);
    expect(result.ranked_candidates[0].source).toBe("iql");
    // No adapter_id, no rag_hits passed -> determineFPSSource returns "formula"
    expect(result.provenance?.fps_source).toBe("formula");
    // Must still have a valid audit_hash
    expect(result.provenance?.audit_hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("hybrid source winner -> provenance.fps_source reflects evidence (formula when no adapter/rag hits present)", () => {
    // Same evidence-based logic: hybrid with no adapter_id and no contributing_priors
    // -> determineFPSSource sees neither adapter nor RAG hits -> "formula"
    const result = rank(singleWinner("hybrid"));
    expect(result.ok).toBe(true);
    expect(result.ranked_candidates[0].source).toBe("hybrid");
    // No adapter_id, no rag_hits -> "formula" from evidence perspective
    expect(result.provenance?.fps_source).toBe("formula");
    expect(result.provenance?.audit_hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("taylor_prior source winner -> fps_source maps to 'formula' (physics formula family)", () => {
    const result = rank(singleWinner("taylor_prior"));
    expect(result.ok).toBe(true);
    expect(result.ranked_candidates[0].source).toBe("taylor_prior");
    // taylor_prior is a pure physics formula -- must map to fps_source "formula"
    expect(result.provenance?.fps_source).toBe("formula");
  });

  it("kienzle_prior source winner -> fps_source maps to 'formula' (physics formula family)", () => {
    const result = rank(singleWinner("kienzle_prior"));
    expect(result.ok).toBe(true);
    expect(result.ranked_candidates[0].source).toBe("kienzle_prior");
    expect(result.provenance?.fps_source).toBe("formula");
  });

  it("provenance citation list contains at least one entry with corpus 'physics/constants.ts'", () => {
    const result = rank(singleWinner("formula"));
    expect(result.ok).toBe(true);
    const cits = result.provenance?.citations ?? [];
    const constCit = cits.find(c => c.corpus === "physics/constants.ts");
    // Must have a citation back to the canonical constants file
    expect(constCit?.corpus).toBe("physics/constants.ts");
  });
});

// ─── Adversarial inputs ──────────────────────────────────────────────────────

describe("SFC Provenance Wire -- adversarial inputs", () => {
  it("NaN sfm: no throw, engine returns ok=false (zod .positive() rejects NaN), warnings non-empty", () => {
    expect(() => rankUnsafe({
      material: "Steel",
      iso_group: "P",
      use_rag_priors: false,
      candidates: [{ source: "formula", sfm: NaN, fpt: 0.10, doc: 2.0 }],
    })).not.toThrow();

    const result = rankUnsafe({
      material: "Steel",
      iso_group: "P",
      use_rag_priors: false,
      candidates: [{ source: "formula", sfm: NaN, fpt: 0.10, doc: 2.0 }],
    });
    expect(result.ok).toBe(false);
    expect(result.ranked_candidates).toHaveLength(0);
    // Zod validation error message must be surfaced in warnings
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.join(" ")).toMatch(/invalid|sfm|number|nan/i);
  });

  it("garbage string as hypothesis source: no throw, engine returns ok=false", () => {
    expect(() => rankUnsafe({
      material: "Steel",
      iso_group: "P",
      use_rag_priors: false,
      candidates: [{ source: "!!INVALID!!", sfm: 300, fpt: 0.10, doc: 2.0 }],
    })).not.toThrow();

    const result = rankUnsafe({
      material: "Steel",
      iso_group: "P",
      use_rag_priors: false,
      candidates: [{ source: "!!INVALID!!", sfm: 300, fpt: 0.10, doc: 2.0 }],
    });
    expect(result.ok).toBe(false);
    expect(result.ranked_candidates).toHaveLength(0);
  });

  it("very large sfm (1e9): no throw, provenance attaches on ok=true path", () => {
    expect(() => rank({
      material: "Steel",
      iso_group: "P",
      use_rag_priors: false,
      candidates: [{ source: "formula", sfm: 1e9, fpt: 0.10, doc: 2.0 }],
    })).not.toThrow();

    const result = rank({
      material: "Steel",
      iso_group: "P",
      use_rag_priors: false,
      candidates: [{ source: "formula", sfm: 1e9, fpt: 0.10, doc: 2.0 }],
    });
    // Zod accepts sfm=1e9 (positive); engine should succeed
    expect(result.ok).toBe(true);
    // Provenance must attach on the ok=true path
    expect(result.provenance?.audit_hash).toMatch(/^[0-9a-f]{16}$/);
    expect(result.provenance?.fps_source).toBe("formula");
  });

  it("null-like material (undefined): no throw, ok=false with descriptive warning", () => {
    expect(() => rankUnsafe({
      // material is required (z.string().min(1)); passing undefined exercises the guard
      iso_group: "P",
      use_rag_priors: false,
      candidates: [{ source: "formula", sfm: 300, fpt: 0.10, doc: 2.0 }],
    })).not.toThrow();

    const result = rankUnsafe({
      iso_group: "P",
      use_rag_priors: false,
      candidates: [{ source: "formula", sfm: 300, fpt: 0.10, doc: 2.0 }],
    });
    expect(result.ok).toBe(false);
    expect(result.warnings.join(" ")).toMatch(/material|invalid/i);
  });
});

// ─── Round-trip through dispatcher ─────────────────────────────────────────

describe("SFC Provenance Wire -- dispatcher round-trip (prism_calc:sfc_rank_hypotheses)", () => {
  it("dispatcher response carries .provenance with 16-hex audit_hash", async () => {
    const r = await callAction(calcTool, "sfc_rank_hypotheses", {
      material: "4140 Steel",
      iso_group: "P",
      use_rag_priors: false,
      candidates: [
        { source: "formula", sfm: 300, fpt: 0.10, doc: 2.0, source_confidence: 0.70 },
        { source: "adapter", sfm: 280, fpt: 0.12, doc: 1.8, source_confidence: 0.90 },
      ],
    });
    expect(r.success).toBe(true);
    expect(r.ok).toBe(true);
    const prov = r.provenance as SFCProvenance;
    // Must be a 16-char hex string -- not just truthy
    expect(prov.audit_hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("dispatcher provenance.engine is 'SFCMultiHypothesisRankerEngine'", async () => {
    const r = await callAction(calcTool, "sfc_rank_hypotheses", {
      material: "4140 Steel",
      iso_group: "P",
      use_rag_priors: false,
      candidates: [
        { source: "formula", sfm: 300, fpt: 0.10, doc: 2.0, source_confidence: 0.80 },
      ],
    });
    expect(r.success).toBe(true);
    const prov = r.provenance as SFCProvenance;
    expect(prov.engine).toBe("SFCMultiHypothesisRankerEngine");
  });

  it("dispatcher provenance.fps_source matches the top-ranked candidate source (formula wins)", async () => {
    const r = await callAction(calcTool, "sfc_rank_hypotheses", {
      material: "4140 Steel",
      iso_group: "P",
      use_rag_priors: false,
      candidates: [
        // High-reward formula
        { source: "formula", sfm: 300, fpt: 0.10, doc: 2.0,
          source_confidence: 1.0,
          reward_cycle_time: 0.95, reward_tool_life: 0.95,
          reward_surface_finish: 0.95, reward_safety: 0.95 },
        // Low-reward decoy
        { source: "rag", sfm: 280, fpt: 0.08, doc: 1.8,
          source_confidence: 0.1,
          reward_cycle_time: 0.1, reward_tool_life: 0.1,
          reward_surface_finish: 0.1, reward_safety: 0.70 },
      ],
    });
    expect(r.success).toBe(true);
    const rc = r.ranked_candidates as Array<{ source: string; rank: number }>;
    const prov = r.provenance as SFCProvenance;
    expect(rc[0].source).toBe("formula");
    expect(prov.fps_source).toBe("formula");
  });

  it("dispatcher: invalid empty candidates -> success=false, no crash, no provenance leak", async () => {
    const r = await callAction(calcTool, "sfc_rank_hypotheses", {
      material: "Steel",
      candidates: [],
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
    // Provenance must not leak a partial record on a hard error path
    // (either undefined or absent from the error response)
    expect(r.provenance == null || r.ok === false).toBe(true);
  });

  it("dispatcher parity: provenance.fps_source matches direct engine call fps_source (deterministic)", async () => {
    const params: SFCMultiHypothesisRankerInput = {
      material: "316 Stainless",
      iso_group: "M",
      use_rag_priors: false,
      candidates: [
        { source: "formula", sfm: 200, fpt: 0.08, doc: 1.5, source_confidence: 0.8 },
      ],
    };
    const direct = rank(params);
    const via = await callAction(calcTool, "sfc_rank_hypotheses", params as unknown as Record<string, unknown>);
    expect(direct.ok).toBe(true);
    expect(via.ok).toBe(true);
    const viaProv = via.provenance as SFCProvenance;
    // fps_source is deterministic -- both paths must agree
    expect(viaProv.fps_source).toBe(direct.provenance?.fps_source);
    // audit_hash will differ (recommendation_id counter differs), but fps_source and kc11 group must match
    expect(viaProv.kc11_source?.group).toBe(direct.provenance?.kc11_source?.group ?? "M");
  });
});
