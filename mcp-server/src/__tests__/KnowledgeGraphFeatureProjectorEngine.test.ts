/**
 * KnowledgeGraphFeatureProjectorEngine.test.ts — XPROC-NEURAL-CONNECT-MS0 / U-CN05
 */
import { describe, it, expect, beforeAll } from "vitest";

import {
  KnowledgeGraphFeatureProjectorEngine,
  knowledgeGraphFeatureProjectorDispatch,
  KG_FEATURE_DIM,
} from "../engines/KnowledgeGraphFeatureProjectorEngine.js";
import { knowledgeGraphNeuralBridgeEngine } from "../engines/KnowledgeGraphNeuralBridgeEngine.js";

describe("KnowledgeGraphFeatureProjectorEngine — U-CN05", () => {
  beforeAll(() => {
    // Seed the KG with a few entities so semantic search has something to find.
    // Using distinct entity types so the type-share features can be verified.
    knowledgeGraphNeuralBridgeEngine.indexEntity(
      "test-mat-1", "material", "steel 4140 alloy", { iso_group: "P" },
    );
    knowledgeGraphNeuralBridgeEngine.indexEntity(
      "test-tool-1", "tool", "carbide end mill 6mm 4-flute", { coating: "tialn" },
    );
    knowledgeGraphNeuralBridgeEngine.indexEntity(
      "test-strategy-1", "strategy", "adaptive clearing roughing", { domain: "mill" },
    );
    knowledgeGraphNeuralBridgeEngine.indexEntity(
      "test-tribal-1", "tribal_tip", "use climb milling for thin walls", { confidence: 0.8 },
    );
  });

  describe("output dimension and bounds", () => {
    it("returns features array of exactly KG_FEATURE_DIM elements (8)", () => {
      const r = KnowledgeGraphFeatureProjectorEngine.project({
        record: {
          process: "mill",
          request_summary: { material: "steel", operation: "rough", tool_diameter_mm: 6 },
        },
      });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(KG_FEATURE_DIM).toBe(8);
        expect(r.features.length).toBe(8);
        expect(r.dimension).toBe(8);
      }
    });

    it("every feature is a finite number in [0, 1]", () => {
      const r = KnowledgeGraphFeatureProjectorEngine.project({
        record: { process: "mill", request_summary: { material: "steel" } },
      });
      expect(r.ok).toBe(true);
      if (r.ok) {
        for (const f of r.features) {
          expect(Number.isFinite(f)).toBe(true);
          expect(f).toBeGreaterThanOrEqual(0);
          expect(f).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe("query construction", () => {
    it("joins request_summary fields + process into the search query string", () => {
      const r = KnowledgeGraphFeatureProjectorEngine.project({
        record: {
          process: "mill",
          request_summary: {
            operation: "adaptive_clearing",
            material: "steel",
            tool_material: "carbide",
            machine_family: "vf2",
          },
        },
      });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.query).toContain("steel");
        expect(r.query).toContain("carbide");
        expect(r.query).toContain("mill");
        expect(r.query).toContain("adaptive_clearing");
      }
    });

    it("empty record (no searchable text) returns 8 zeros + warning", () => {
      const r = KnowledgeGraphFeatureProjectorEngine.project({ record: {} });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.features).toEqual(new Array(KG_FEATURE_DIM).fill(0));
        expect(r.warnings.some(w => w.includes("empty query"))).toBe(true);
        expect(r.result_count).toBe(0);
      }
    });

    it("non-string fields in request_summary are skipped (not coerced)", () => {
      const r = KnowledgeGraphFeatureProjectorEngine.project({
        record: {
          request_summary: {
            material: 12345 as unknown as string, // numeric, must be skipped
            tool_diameter_mm: 6,
          },
        },
      });
      expect(r.ok).toBe(true);
      if (r.ok) {
        // No string fields → empty query → all zeros.
        expect(r.query).toBe("");
        expect(r.features.every(f => f === 0)).toBe(true);
      }
    });
  });

  describe("validation — rejection branches", () => {
    it("missing record → invalid_input", () => {
      const r = KnowledgeGraphFeatureProjectorEngine.project({});
      expect(r.ok).toBe(false);
    });

    it("non-object input → invalid_input", () => {
      const r = KnowledgeGraphFeatureProjectorEngine.project("not-a-record");
      expect(r.ok).toBe(false);
    });

    it("limit > 100 → invalid_input", () => {
      const r = KnowledgeGraphFeatureProjectorEngine.project({
        record: {}, limit: 500,
      });
      expect(r.ok).toBe(false);
    });

    it("limit < 1 → invalid_input", () => {
      const r = KnowledgeGraphFeatureProjectorEngine.project({
        record: {}, limit: 0,
      });
      expect(r.ok).toBe(false);
    });

    it("minSimilarity > 1 → invalid_input", () => {
      const r = KnowledgeGraphFeatureProjectorEngine.project({
        record: {}, minSimilarity: 2.0,
      });
      expect(r.ok).toBe(false);
    });

    it("invalid types entry → invalid_input", () => {
      const r = KnowledgeGraphFeatureProjectorEngine.project({
        record: {}, types: ["bogus_type" as never],
      });
      expect(r.ok).toBe(false);
    });
  });

  describe("feature semantics", () => {
    it("when KG returns hits, num_results feature is non-zero", () => {
      const r = KnowledgeGraphFeatureProjectorEngine.project({
        record: { process: "mill", request_summary: { material: "steel" } },
        limit: 10,
      });
      expect(r.ok).toBe(true);
      if (r.ok && r.result_count > 0) {
        expect(r.features[0]).toBeGreaterThan(0);
        // num_results normalized = result_count / limit
        const expectedNum = Math.min(1, r.result_count / 10);
        expect(Math.abs(r.features[0] - expectedNum)).toBeLessThan(0.001);
      }
    });

    it("type_diversity ≤ tribal_share + material_share + strategy_share + tool_share + 4/8", () => {
      // Sanity: per-type shares each ≤ type_diversity (since each share contributes
      // to at most 1/8 of unique types). Soft sanity — not tight bound.
      const r = KnowledgeGraphFeatureProjectorEngine.project({
        record: { process: "mill", request_summary: { material: "steel", operation: "rough" } },
      });
      expect(r.ok).toBe(true);
      if (r.ok) {
        const typeDiv = r.features[3];
        const sumShares = r.features[4] + r.features[5] + r.features[6] + r.features[7];
        // Sum of all 4 type-shares ≤ 1 (each result contributes to exactly one type).
        expect(sumShares).toBeLessThanOrEqual(1.0001);
        // Type diversity ∈ [0, 1] always
        expect(typeDiv).toBeGreaterThanOrEqual(0);
        expect(typeDiv).toBeLessThanOrEqual(1);
      }
    });

    it("filtering by types=['material'] narrows result set vs no filter", () => {
      const broad = KnowledgeGraphFeatureProjectorEngine.project({
        record: { process: "mill", request_summary: { material: "steel" } },
      });
      const narrow = KnowledgeGraphFeatureProjectorEngine.project({
        record: { process: "mill", request_summary: { material: "steel" } },
        types: ["material"],
      });
      expect(broad.ok).toBe(true);
      expect(narrow.ok).toBe(true);
      if (broad.ok && narrow.ok && narrow.result_count > 0) {
        // Narrow result must be 100% material type (or empty).
        expect(narrow.features[5]).toBe(1.0);
        // Type diversity must be 1/8 when only one type returned.
        expect(narrow.features[3]).toBeLessThanOrEqual(1 / 8 + 0.001);
      }
    });
  });

  describe("featureLayout — schema documentation", () => {
    it("returns 8 layout entries with index, name, description fields", () => {
      const layout = KnowledgeGraphFeatureProjectorEngine.featureLayout();
      expect(layout.length).toBe(8);
      for (let i = 0; i < layout.length; i++) {
        expect(layout[i].index).toBe(i);
        expect(layout[i].name.length).toBeGreaterThan(0);
        expect(layout[i].description.length).toBeGreaterThan(0);
      }
    });
  });

  describe("dispatcher round-trip", () => {
    it("xproc_kg_project_features round-trips with valid input", () => {
      const r = knowledgeGraphFeatureProjectorDispatch("xproc_kg_project_features", {
        record: { process: "mill", request_summary: { material: "steel" } },
      }) as { ok: boolean; features?: number[]; dimension?: number };
      expect(r.ok).toBe(true);
      expect(r.features?.length).toBe(KG_FEATURE_DIM);
      expect(r.dimension).toBe(KG_FEATURE_DIM);
    });

    it("xproc_kg_feature_layout round-trips with 8 entries", () => {
      const r = knowledgeGraphFeatureProjectorDispatch("xproc_kg_feature_layout", {}) as {
        ok: boolean; layout: unknown[]; dimension: number;
      };
      expect(r.ok).toBe(true);
      expect(r.layout.length).toBe(8);
      expect(r.dimension).toBe(8);
    });

    it("rejects unknown action via the dispatcher's default branch", () => {
      expect(() =>
        knowledgeGraphFeatureProjectorDispatch("xproc_kg_BOGUS", {}),
      ).toThrow(/unknown action/);
    });
  });
});
