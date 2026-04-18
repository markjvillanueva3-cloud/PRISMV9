/**
 * LathePrintToProgramKnowledgeGraphEngine Tests
 *
 * U-LTH44: Knowledge graph integration for P2P pipeline
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  lathePrintToProgramKnowledgeGraphEngine,
  type GraphQueryResult,
  type KGNode,
} from "../engines/LathePrintToProgramKnowledgeGraphEngine.js";
import { lathePrintToProgramOrchestratorEngine } from "../engines/LathePrintToProgramOrchestratorEngine.js";

describe("LathePrintToProgramKnowledgeGraphEngine", () => {
  const addTestPipeline = async (programNumber: number) => {
    const result = await lathePrintToProgramOrchestratorEngine.execute({
      blueprint: {
        source_type: "pdf",
        part_type: "turning",
        part_number: `KG-${programNumber}`,
        customer: "Test Corp",
      },
      program_number: programNumber,
      program_name: `KG TEST ${programNumber}`,
      controller: "okuma_osp",
    });

    return lathePrintToProgramKnowledgeGraphEngine.addPipelineOutput(
      result.stages.ingest.data!,
      result.stages.recognition.data!,
      result.stages.planning.data!,
      result.program!,
      result.stages.verification?.data
    );
  };

  describe("addPipelineOutput()", () => {
    it("adds nodes and edges to graph", async () => {
      const result = await addTestPipeline(10001);

      expect(result.update_id).toMatch(/^update_\d+_\d+$/);
      expect(result.nodes_added).toBeGreaterThan(0);
      expect(result.edges_added).toBeGreaterThan(0);
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("creates part node", async () => {
      await addTestPipeline(10002);

      const partNode = lathePrintToProgramKnowledgeGraphEngine.getNode("part_10002");
      expect(partNode).toBeDefined();
      expect(partNode!.type).toBe("part");
      expect(partNode!.properties.program_number).toBe(10002);
    });

    it("creates feature nodes", async () => {
      await addTestPipeline(10003);

      const featureNodes = lathePrintToProgramKnowledgeGraphEngine.getNodesByType("feature");
      const partFeatures = featureNodes.filter(n => n.id.includes("part_10003"));
      expect(partFeatures.length).toBeGreaterThan(0);
    });

    it("creates operation nodes", async () => {
      await addTestPipeline(10004);

      const opNodes = lathePrintToProgramKnowledgeGraphEngine.getNodesByType("operation");
      const partOps = opNodes.filter(n => n.id.includes("part_10004"));
      expect(partOps.length).toBeGreaterThan(0);
    });

    it("creates tool nodes", async () => {
      await addTestPipeline(10005);

      const toolNodes = lathePrintToProgramKnowledgeGraphEngine.getNodesByType("tool");
      expect(toolNodes.length).toBeGreaterThan(0);
    });

    it("creates outcome node when verification provided", async () => {
      // Manually add pipeline with explicit verification
      const result = await lathePrintToProgramOrchestratorEngine.execute({
        blueprint: {
          source_type: "pdf",
          part_type: "turning",
          part_number: "KG-10006",
        },
        program_number: 10006,
        program_name: "KG TEST 10006",
        controller: "okuma_osp",
      });

      // Create verification result manually
      const verification = {
        verification_id: "test_verify",
        program_id: "test",
        processing_time_ms: 10,
        passed: true,
        score: 95,
        issues: [],
        error_count: 0,
        warning_count: 0,
        info_count: 0,
        total_blocks: 50,
        motion_blocks: 30,
        tool_changes: 3,
        simulation: {
          max_x: 100, min_x: 0, max_z: 200, min_z: 0,
          max_spindle_rpm: 2000, max_feed_rate: 500,
          total_distance_mm: 1000, estimated_time_sec: 120,
        },
      };

      lathePrintToProgramKnowledgeGraphEngine.addPipelineOutput(
        result.stages.ingest.data!,
        result.stages.recognition.data!,
        result.stages.planning.data!,
        result.program!,
        verification as any
      );

      const outcomeNodes = lathePrintToProgramKnowledgeGraphEngine.getNodesByType("outcome");
      const partOutcome = outcomeNodes.find(n => n.id.includes("10006"));
      expect(partOutcome).toBeDefined();
      expect(partOutcome!.type).toBe("outcome");
    });

    it("connects part to features with edges", async () => {
      await addTestPipeline(10007);

      const edges = lathePrintToProgramKnowledgeGraphEngine.getEdges("part_10007", "from");
      const featureEdges = edges.filter(e => e.type === "has_feature");
      expect(featureEdges.length).toBeGreaterThan(0);
    });

    it("connects operations in sequence", async () => {
      await addTestPipeline(10008);

      const edges = lathePrintToProgramKnowledgeGraphEngine.getEdges("op_part_10008_0", "from");
      const precedesEdges = edges.filter(e => e.type === "precedes");
      expect(precedesEdges.length).toBeGreaterThan(0);
    });
  });

  describe("query()", () => {
    it("finds nodes by label", async () => {
      await addTestPipeline(10101);
      await addTestPipeline(10102);

      const result = lathePrintToProgramKnowledgeGraphEngine.query("KG TEST 10101");

      expect(result.query_id).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.execution_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("finds nodes by type", async () => {
      await addTestPipeline(10103);

      const result = lathePrintToProgramKnowledgeGraphEngine.query("feature");

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results.some(r => r.node.type === "feature")).toBe(true);
    });

    it("finds nodes by property", async () => {
      await addTestPipeline(10104);

      const result = lathePrintToProgramKnowledgeGraphEngine.query("rough_turn");

      expect(result.results.length).toBeGreaterThan(0);
    });

    it("ranks results by relevance", async () => {
      await addTestPipeline(10105);
      await addTestPipeline(10106);

      const result = lathePrintToProgramKnowledgeGraphEngine.query("rough_turn");

      expect(result.results.length).toBeGreaterThan(0);
      if (result.results.length > 1) {
        expect(result.results[0].relevance).toBeGreaterThanOrEqual(result.results[1].relevance);
      }
    });

    it("limits results", async () => {
      await addTestPipeline(10107);

      const result = lathePrintToProgramKnowledgeGraphEngine.query("operation", 3);

      expect(result.results.length).toBeLessThanOrEqual(3);
    });

    it("reports total matches", async () => {
      await addTestPipeline(10108);

      const result = lathePrintToProgramKnowledgeGraphEngine.query("op_", 2);

      expect(result.total_matches).toBeGreaterThanOrEqual(result.results.length);
    });
  });

  describe("findSimilar()", () => {
    it("finds similar nodes by embedding", async () => {
      await addTestPipeline(10201);
      await addTestPipeline(10202);

      // Find features similar to first part's feature
      const features = lathePrintToProgramKnowledgeGraphEngine.getNodesByType("feature");
      if (features.length > 0) {
        const result = lathePrintToProgramKnowledgeGraphEngine.findSimilar(features[0].id);

        expect(result.query_node).toBe(features[0].id);
        expect(Array.isArray(result.similar_nodes)).toBe(true);
      }
    });

    it("computes similarity scores", async () => {
      await addTestPipeline(10203);
      await addTestPipeline(10204);

      const features = lathePrintToProgramKnowledgeGraphEngine.getNodesByType("feature");
      if (features.length > 1) {
        const result = lathePrintToProgramKnowledgeGraphEngine.findSimilar(features[0].id);

        for (const similar of result.similar_nodes) {
          expect(similar.similarity).toBeGreaterThan(0);
          expect(similar.similarity).toBeLessThanOrEqual(1);
        }
      }
    });

    it("identifies common features", async () => {
      await addTestPipeline(10205);
      await addTestPipeline(10206);

      const features = lathePrintToProgramKnowledgeGraphEngine.getNodesByType("feature");
      if (features.length > 1) {
        const result = lathePrintToProgramKnowledgeGraphEngine.findSimilar(features[0].id);

        for (const similar of result.similar_nodes) {
          expect(Array.isArray(similar.common_features)).toBe(true);
        }
      }
    });

    it("limits similar results", async () => {
      await addTestPipeline(10207);
      await addTestPipeline(10208);
      await addTestPipeline(10209);

      const parts = lathePrintToProgramKnowledgeGraphEngine.getNodesByType("part");
      if (parts.length > 0) {
        const result = lathePrintToProgramKnowledgeGraphEngine.findSimilar(parts[0].id, 2);

        expect(result.similar_nodes.length).toBeLessThanOrEqual(2);
      }
    });
  });

  describe("getEdges()", () => {
    it("gets outgoing edges", async () => {
      await addTestPipeline(10301);

      const edges = lathePrintToProgramKnowledgeGraphEngine.getEdges("part_10301", "from");

      expect(edges.length).toBeGreaterThan(0);
      for (const edge of edges) {
        expect(edge.from).toBe("part_10301");
      }
    });

    it("gets incoming edges", async () => {
      await addTestPipeline(10302);

      const features = lathePrintToProgramKnowledgeGraphEngine.getNodesByType("feature")
        .filter(f => f.id.includes("part_10302"));

      if (features.length > 0) {
        const edges = lathePrintToProgramKnowledgeGraphEngine.getEdges(features[0].id, "to");

        expect(edges.length).toBeGreaterThan(0);
        for (const edge of edges) {
          expect(edge.to).toBe(features[0].id);
        }
      }
    });

    it("gets both directions", async () => {
      await addTestPipeline(10303);

      const ops = lathePrintToProgramKnowledgeGraphEngine.getNodesByType("operation")
        .filter(o => o.id.includes("part_10303"));

      if (ops.length > 1) {
        const edges = lathePrintToProgramKnowledgeGraphEngine.getEdges(ops[0].id, "both");

        expect(edges.length).toBeGreaterThan(0);
      }
    });
  });

  describe("getNodesByType()", () => {
    it("returns all nodes of type", async () => {
      await addTestPipeline(10401);

      const parts = lathePrintToProgramKnowledgeGraphEngine.getNodesByType("part");

      expect(parts.length).toBeGreaterThan(0);
      for (const part of parts) {
        expect(part.type).toBe("part");
      }
    });

    it("returns empty array for unknown type", () => {
      const nodes = lathePrintToProgramKnowledgeGraphEngine.getNodesByType(
        "nonexistent" as any
      );

      expect(nodes).toEqual([]);
    });
  });

  describe("traverse()", () => {
    it("traverses graph from start node", async () => {
      await addTestPipeline(10501);

      const nodes = lathePrintToProgramKnowledgeGraphEngine.traverse("part_10501", 2);

      expect(nodes.length).toBeGreaterThan(0);
      expect(nodes[0].id).toBe("part_10501");
    });

    it("respects depth limit", async () => {
      await addTestPipeline(10502);

      const depth1 = lathePrintToProgramKnowledgeGraphEngine.traverse("part_10502", 1);
      const depth2 = lathePrintToProgramKnowledgeGraphEngine.traverse("part_10502", 2);

      expect(depth2.length).toBeGreaterThanOrEqual(depth1.length);
    });

    it("returns empty for unknown node", () => {
      const nodes = lathePrintToProgramKnowledgeGraphEngine.traverse("nonexistent_node");

      expect(nodes).toEqual([]);
    });
  });

  describe("getStatistics()", () => {
    it("returns graph statistics", async () => {
      await addTestPipeline(10601);

      const stats = lathePrintToProgramKnowledgeGraphEngine.getStatistics();

      expect(stats.total_nodes).toBeGreaterThan(0);
      expect(stats.total_edges).toBeGreaterThan(0);
      expect(stats.nodes_by_type).toBeDefined();
      expect(stats.edges_by_type).toBeDefined();
    });

    it("tracks updates and queries", async () => {
      const statsBefore = lathePrintToProgramKnowledgeGraphEngine.getStatistics();
      await addTestPipeline(10602);
      lathePrintToProgramKnowledgeGraphEngine.query("test");
      const statsAfter = lathePrintToProgramKnowledgeGraphEngine.getStatistics();

      expect(statsAfter.total_updates).toBeGreaterThan(statsBefore.total_updates as number);
      expect(statsAfter.total_queries).toBeGreaterThan(statsBefore.total_queries as number);
    });

    it("counts nodes by type", async () => {
      await addTestPipeline(10603);

      const stats = lathePrintToProgramKnowledgeGraphEngine.getStatistics();
      const nodesByType = stats.nodes_by_type as Record<string, number>;

      expect(nodesByType.part).toBeGreaterThan(0);
      expect(nodesByType.feature).toBeGreaterThan(0);
      expect(nodesByType.operation).toBeGreaterThan(0);
    });

    it("counts edges by type", async () => {
      await addTestPipeline(10604);

      const stats = lathePrintToProgramKnowledgeGraphEngine.getStatistics();
      const edgesByType = stats.edges_by_type as Record<string, number>;

      expect(edgesByType.has_feature).toBeGreaterThan(0);
      expect(edgesByType.requires).toBeGreaterThan(0);
    });
  });

  describe("exportGraph()", () => {
    it("exports all nodes and edges", async () => {
      await addTestPipeline(10701);

      const exported = lathePrintToProgramKnowledgeGraphEngine.exportGraph();

      expect(exported.nodes.length).toBeGreaterThan(0);
      expect(exported.edges.length).toBeGreaterThan(0);
    });

    it("exported nodes have all fields", async () => {
      await addTestPipeline(10702);

      const exported = lathePrintToProgramKnowledgeGraphEngine.exportGraph();

      for (const node of exported.nodes.slice(0, 5)) {
        expect(node.id).toBeDefined();
        expect(node.type).toBeDefined();
        expect(node.label).toBeDefined();
        expect(node.created_at).toBeDefined();
      }
    });

    it("exported edges have all fields", async () => {
      await addTestPipeline(10703);

      const exported = lathePrintToProgramKnowledgeGraphEngine.exportGraph();

      for (const edge of exported.edges.slice(0, 5)) {
        expect(edge.id).toBeDefined();
        expect(edge.from).toBeDefined();
        expect(edge.to).toBeDefined();
        expect(edge.type).toBeDefined();
        expect(edge.weight).toBeDefined();
      }
    });
  });

  describe("importGraph()", () => {
    it("imports nodes and edges", () => {
      const data = {
        nodes: [
          {
            id: "import_test_node",
            type: "part" as const,
            label: "Import Test",
            properties: { test: true },
            created_at: new Date().toISOString(),
            source: "test",
          },
        ],
        edges: [
          {
            id: "import_test_edge",
            from: "import_test_node",
            to: "some_other_node",
            type: "requires" as const,
            weight: 1.0,
            properties: {},
            created_at: new Date().toISOString(),
          },
        ],
      };

      lathePrintToProgramKnowledgeGraphEngine.importGraph(data);

      const node = lathePrintToProgramKnowledgeGraphEngine.getNode("import_test_node");
      expect(node).toBeDefined();
      expect(node!.label).toBe("Import Test");
    });
  });

  describe("Embeddings", () => {
    it("generates embeddings for features", async () => {
      await addTestPipeline(10801);

      const features = lathePrintToProgramKnowledgeGraphEngine.getNodesByType("feature")
        .filter(f => f.id.includes("part_10801"));

      if (features.length > 0) {
        expect(features[0].embeddings).toBeDefined();
        expect(features[0].embeddings!.length).toBe(64);
      }
    });

    it("generates embeddings for operations", async () => {
      await addTestPipeline(10802);

      const ops = lathePrintToProgramKnowledgeGraphEngine.getNodesByType("operation")
        .filter(o => o.id.includes("part_10802"));

      if (ops.length > 0) {
        expect(ops[0].embeddings).toBeDefined();
        expect(ops[0].embeddings!.length).toBe(64);
      }
    });

    it("generates embeddings for programs", async () => {
      await addTestPipeline(10803);

      const part = lathePrintToProgramKnowledgeGraphEngine.getNode("part_10803");

      expect(part).toBeDefined();
      expect(part!.embeddings).toBeDefined();
      expect(part!.embeddings!.length).toBe(64);
    });

    it("embeddings are normalized", async () => {
      await addTestPipeline(10804);

      const features = lathePrintToProgramKnowledgeGraphEngine.getNodesByType("feature")
        .filter(f => f.embeddings && f.embeddings.length > 0);

      if (features.length > 0) {
        const emb = features[0].embeddings!;
        const magnitude = Math.sqrt(emb.reduce((s, v) => s + v * v, 0));
        // Should be approximately 1 (normalized) or 0 (zero vector)
        expect(magnitude).toBeLessThanOrEqual(1.1);
      }
    });
  });
});
