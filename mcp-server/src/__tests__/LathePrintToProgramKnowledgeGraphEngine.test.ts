/**
 * LathePrintToProgramKnowledgeGraphEngine Tests — U-LTH44
 *
 * Knowledge graph ingestion, similarity queries, tool/customer/failure lookups,
 * import/export round-trip, traversal, variability.
 *
 * @milestone LATHE-MASTER U-LTH44
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  lathePrintToProgramKnowledgeGraphEngine,
  type IngestionInput,
} from "../engines/LathePrintToProgramKnowledgeGraphEngine.js";
import {
  lathePrintFeatureStrategySelectorEngine,
  type FeatureInput,
  type MaterialInput,
} from "../engines/LathePrintFeatureStrategySelectorEngine.js";
import {
  lathePrintSequencePlannerEngine,
  type StockInput,
} from "../engines/LathePrintSequencePlannerEngine.js";
import { lathePrintSetupSelectionEngine } from "../engines/LathePrintSetupSelectionEngine.js";
import { lathePrintToolpathGeneratorEngine } from "../engines/LathePrintToolpathGeneratorEngine.js";
import { lathePrintProgramEmitterEngine } from "../engines/LathePrintProgramEmitterEngine.js";
import { ACTIONS as camActions } from "../tools/dispatchers/camDispatcher.js";

const STEEL: MaterialInput = { name: "1018 Steel", iso_group: "P", tensile_strength_mpa: 440 };
const ALUM: MaterialInput = { name: "6061", iso_group: "N", tensile_strength_mpa: 310 };
const INCO: MaterialInput = { name: "Inconel 718", iso_group: "S", hardness_hrc: 36, tensile_strength_mpa: 1350 };

const JM_PART: FeatureInput[] = [
  { id: "F1", type: "face", diameter_mm: 25, depth_mm: 2 },
  { id: "F2", type: "od_turn", diameter_mm: 25, length_mm: 50 },
];

const STOCK: StockInput = { od_mm: 30, length_mm: 60, id_mm: 0 };

function buildIngestion(
  features: FeatureInput[],
  material: MaterialInput,
  customer: string,
  outcome?: IngestionInput["outcome"]
): IngestionInput {
  const strat = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(features, material);
  const seq = lathePrintSequencePlannerEngine.planSequence(strat, STOCK, features);
  const geo = lathePrintSetupSelectionEngine.inferGeometry(features);
  const loads = lathePrintSetupSelectionEngine.estimateLoads(seq, material);
  const setup = lathePrintSetupSelectionEngine.selectSetup(geo, material, loads);
  const tp = lathePrintToolpathGeneratorEngine.generateProgram(seq, features, material);
  const emitted = lathePrintProgramEmitterEngine.emit(tp, { controller: "fanuc" });

  return {
    strategy_plan: strat, sequence_plan: seq, setup, toolpath: tp, emitted,
    features, material, customer, outcome,
  };
}

describe("LathePrintToProgramKnowledgeGraphEngine", () => {
  beforeEach(() => {
    lathePrintToProgramKnowledgeGraphEngine.clear();
  });

  describe("Ingestion", () => {
    it("adds nodes and edges for a complete job", () => {
      const input = buildIngestion(JM_PART, STEEL, "ITW");
      const result = lathePrintToProgramKnowledgeGraphEngine.ingest(input);

      expect(result.job_id).toMatch(/^job_/);
      expect(result.nodes_added).toBeGreaterThan(5);
      expect(result.edges_added).toBeGreaterThan(5);
    });

    it("reuses material node across jobs (upsert)", () => {
      const in1 = buildIngestion(JM_PART, STEEL, "ITW");
      const in2 = buildIngestion(JM_PART, STEEL, "Alcoa");

      lathePrintToProgramKnowledgeGraphEngine.ingest(in1);
      const stats1 = lathePrintToProgramKnowledgeGraphEngine.getStats();

      lathePrintToProgramKnowledgeGraphEngine.ingest(in2);
      const stats2 = lathePrintToProgramKnowledgeGraphEngine.getStats();

      // Material "1018 Steel" should not be re-added
      expect(stats2.nodes_by_type.material).toBe(stats1.nodes_by_type.material);
    });

    it("ingestion with outcome creates outcome node", () => {
      const input = buildIngestion(JM_PART, STEEL, "ITW", {
        actual_cycle_time_sec: 450,
        scrap_count: 0,
        first_article_pass: true,
      });
      lathePrintToProgramKnowledgeGraphEngine.ingest(input);

      const stats = lathePrintToProgramKnowledgeGraphEngine.getStats();
      expect(stats.nodes_by_type.outcome).toBe(1);
    });
  });

  describe("Similarity Queries", () => {
    it("finds jobs matching material ISO group", () => {
      lathePrintToProgramKnowledgeGraphEngine.ingest(buildIngestion(JM_PART, STEEL, "C1"));
      lathePrintToProgramKnowledgeGraphEngine.ingest(buildIngestion(JM_PART, ALUM, "C2"));
      lathePrintToProgramKnowledgeGraphEngine.ingest(buildIngestion(JM_PART, INCO, "C3"));

      const result = lathePrintToProgramKnowledgeGraphEngine.findSimilarJobs({
        material_iso_group: "P",
      });

      expect(result.matches.length).toBe(1);
      expect(result.matches[0].similarity).toBe(1);
      expect(result.matches[0].reasons[0]).toContain("Material ISO group P matches");
    });

    it("finds jobs matching feature types", () => {
      lathePrintToProgramKnowledgeGraphEngine.ingest(buildIngestion(JM_PART, STEEL, "C1"));

      const result = lathePrintToProgramKnowledgeGraphEngine.findSimilarJobs({
        feature_types: ["face", "od_turn"],
      });

      expect(result.matches.length).toBe(1);
      expect(result.matches[0].reasons[0]).toContain("feature types match");
    });

    it("limit parameter caps results", () => {
      for (let i = 0; i < 5; i++) {
        lathePrintToProgramKnowledgeGraphEngine.ingest(buildIngestion(JM_PART, STEEL, `C${i}`));
      }

      const result = lathePrintToProgramKnowledgeGraphEngine.findSimilarJobs({
        material_iso_group: "P",
        limit: 2,
      });

      expect(result.matches.length).toBe(2);
    });

    it("min_similarity filters out low matches", () => {
      lathePrintToProgramKnowledgeGraphEngine.ingest(buildIngestion(JM_PART, STEEL, "C1"));

      const result = lathePrintToProgramKnowledgeGraphEngine.findSimilarJobs({
        material_iso_group: "S",  // doesn't match
        min_similarity: 0.9,
      });

      expect(result.matches.length).toBe(0);
    });
  });

  describe("Tool Lookup", () => {
    it("findToolsForMaterial returns all tools used on that material", () => {
      lathePrintToProgramKnowledgeGraphEngine.ingest(buildIngestion(JM_PART, INCO, "C1"));

      const tools = lathePrintToProgramKnowledgeGraphEngine.findToolsForMaterial("S");
      expect(tools.length).toBeGreaterThan(0);
    });

    it("returns empty array for unused material group", () => {
      lathePrintToProgramKnowledgeGraphEngine.ingest(buildIngestion(JM_PART, STEEL, "C1"));
      const tools = lathePrintToProgramKnowledgeGraphEngine.findToolsForMaterial("H");
      expect(tools).toEqual([]);
    });
  });

  describe("Customer Jobs", () => {
    it("findJobsForCustomer returns all jobs for that customer", () => {
      lathePrintToProgramKnowledgeGraphEngine.ingest(buildIngestion(JM_PART, STEEL, "ITW"));
      lathePrintToProgramKnowledgeGraphEngine.ingest(buildIngestion(JM_PART, ALUM, "ITW"));
      lathePrintToProgramKnowledgeGraphEngine.ingest(buildIngestion(JM_PART, INCO, "Alcoa"));

      const itwJobs = lathePrintToProgramKnowledgeGraphEngine.findJobsForCustomer("ITW");
      expect(itwJobs.length).toBe(2);

      const alcoaJobs = lathePrintToProgramKnowledgeGraphEngine.findJobsForCustomer("Alcoa");
      expect(alcoaJobs.length).toBe(1);
    });

    it("returns empty array for unknown customer", () => {
      lathePrintToProgramKnowledgeGraphEngine.ingest(buildIngestion(JM_PART, STEEL, "ITW"));
      const jobs = lathePrintToProgramKnowledgeGraphEngine.findJobsForCustomer("Unknown");
      expect(jobs).toEqual([]);
    });
  });

  describe("Failure Queries", () => {
    it("identifies failed jobs by scrap count", () => {
      lathePrintToProgramKnowledgeGraphEngine.ingest(
        buildIngestion(JM_PART, STEEL, "C1", { scrap_count: 3, first_article_pass: true })
      );
      lathePrintToProgramKnowledgeGraphEngine.ingest(
        buildIngestion(JM_PART, STEEL, "C2", { scrap_count: 0, first_article_pass: true })
      );

      const failures = lathePrintToProgramKnowledgeGraphEngine.findFailedJobs();
      expect(failures.length).toBe(1);
      expect(failures[0].outcome.properties.scrap_count).toBe(3);
    });

    it("identifies failed jobs by first_article_pass=false", () => {
      lathePrintToProgramKnowledgeGraphEngine.ingest(
        buildIngestion(JM_PART, STEEL, "C1", { scrap_count: 0, first_article_pass: false })
      );

      const failures = lathePrintToProgramKnowledgeGraphEngine.findFailedJobs();
      expect(failures.length).toBe(1);
    });
  });

  describe("Stats", () => {
    it("reports node and edge counts", () => {
      lathePrintToProgramKnowledgeGraphEngine.ingest(buildIngestion(JM_PART, STEEL, "ITW"));
      const stats = lathePrintToProgramKnowledgeGraphEngine.getStats();

      expect(stats.total_nodes).toBeGreaterThan(0);
      expect(stats.total_edges).toBeGreaterThan(0);
      expect(stats.nodes_by_type.job).toBe(1);
      expect(stats.nodes_by_type.material).toBe(1);
      expect(stats.nodes_by_type.customer).toBe(1);
    });
  });

  describe("Export/Import Round-trip", () => {
    it("export then import preserves graph", () => {
      lathePrintToProgramKnowledgeGraphEngine.ingest(buildIngestion(JM_PART, STEEL, "ITW"));
      const snapshot = lathePrintToProgramKnowledgeGraphEngine.exportGraph();
      expect(snapshot.node_count).toBeGreaterThan(0);

      // Clear and re-import
      lathePrintToProgramKnowledgeGraphEngine.clear();
      expect(lathePrintToProgramKnowledgeGraphEngine.getStats().total_nodes).toBe(0);

      lathePrintToProgramKnowledgeGraphEngine.importGraph(snapshot);
      const restored = lathePrintToProgramKnowledgeGraphEngine.getStats();
      expect(restored.total_nodes).toBe(snapshot.node_count);
      expect(restored.total_edges).toBe(snapshot.edge_count);
    });
  });

  describe("Traversal", () => {
    it("traverses connected nodes from job", () => {
      const res = lathePrintToProgramKnowledgeGraphEngine.ingest(buildIngestion(JM_PART, STEEL, "ITW"));
      const connected = lathePrintToProgramKnowledgeGraphEngine.traverse(res.job_id, 2);
      expect(connected.length).toBeGreaterThan(3);
    });

    it("depth 0 returns only start node", () => {
      const res = lathePrintToProgramKnowledgeGraphEngine.ingest(buildIngestion(JM_PART, STEEL, "ITW"));
      const connected = lathePrintToProgramKnowledgeGraphEngine.traverse(res.job_id, 0);
      expect(connected.length).toBe(1);
    });
  });

  describe("Adversarial Inputs", () => {
    it("throws on null input", () => {
      expect(() => {
        lathePrintToProgramKnowledgeGraphEngine.ingest(null as any);
      }).toThrow(/Invalid ingestion input/);
    });

    it("throws on missing strategy plan", () => {
      expect(() => {
        lathePrintToProgramKnowledgeGraphEngine.ingest({} as any);
      }).toThrow(/Missing strategy plan/);
    });

    it("throws on missing material", () => {
      const input = buildIngestion(JM_PART, STEEL, "ITW");
      delete (input as any).material;
      expect(() => {
        lathePrintToProgramKnowledgeGraphEngine.ingest(input);
      }).toThrow(/Missing material/);
    });

    it("throws when features not array", () => {
      const input = buildIngestion(JM_PART, STEEL, "ITW");
      (input as any).features = "bogus";
      expect(() => {
        lathePrintToProgramKnowledgeGraphEngine.ingest(input);
      }).toThrow(/array/);
    });

    it("rejects invalid similarity query limit", () => {
      expect(() => {
        lathePrintToProgramKnowledgeGraphEngine.findSimilarJobs({ limit: 0 } as any);
      }).toThrow();
    });

    it("handles empty graph queries gracefully", () => {
      const result = lathePrintToProgramKnowledgeGraphEngine.findSimilarJobs({
        material_iso_group: "P",
      });
      expect(result.matches).toEqual([]);
      expect(result.query_took_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Material Variability", () => {
    const materials: MaterialInput[] = [
      { name: "1018 Steel", iso_group: "P", tensile_strength_mpa: 440 },
      { name: "316 Stainless", iso_group: "M", tensile_strength_mpa: 580 },
      { name: "Gray Cast Iron", iso_group: "K", tensile_strength_mpa: 250 },
      { name: "Inconel 718", iso_group: "S", tensile_strength_mpa: 1350 },
    ];

    it.each(materials)("ingests job for $name (ISO $iso_group)", (mat) => {
      const result = lathePrintToProgramKnowledgeGraphEngine.ingest(
        buildIngestion(JM_PART, mat, "TestCustomer")
      );
      expect(result.job_id).toBeTruthy();
      expect(result.nodes_added).toBeGreaterThan(0);
    });
  });

  describe("Dispatcher Integration", () => {
    it("ACTIONS contains lathe_p2p_kg_ingest", () => {
      expect(camActions).toContain("lathe_p2p_kg_ingest");
    });
    it("ACTIONS contains lathe_p2p_kg_find_similar", () => {
      expect(camActions).toContain("lathe_p2p_kg_find_similar");
    });
    it("ACTIONS contains lathe_p2p_kg_tools_for_material", () => {
      expect(camActions).toContain("lathe_p2p_kg_tools_for_material");
    });
    it("ACTIONS contains lathe_p2p_kg_customer_jobs", () => {
      expect(camActions).toContain("lathe_p2p_kg_customer_jobs");
    });
    it("ACTIONS contains lathe_p2p_kg_failures", () => {
      expect(camActions).toContain("lathe_p2p_kg_failures");
    });
    it("ACTIONS contains lathe_p2p_kg_stats", () => {
      expect(camActions).toContain("lathe_p2p_kg_stats");
    });
    it("ACTIONS contains lathe_p2p_kg_export", () => {
      expect(camActions).toContain("lathe_p2p_kg_export");
    });
    it("ACTIONS contains lathe_p2p_kg_import", () => {
      expect(camActions).toContain("lathe_p2p_kg_import");
    });
    it("ACTIONS contains lathe_p2p_kg_traverse", () => {
      expect(camActions).toContain("lathe_p2p_kg_traverse");
    });
    it("ACTIONS contains lathe_p2p_kg_clear", () => {
      expect(camActions).toContain("lathe_p2p_kg_clear");
    });
  });
});
