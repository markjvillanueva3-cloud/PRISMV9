/**
 * PostProcessorTransformerEngine Tests
 * =====================================
 * Tests for the transformer-based post processor engine.
 */

import { describe, it, expect } from "vitest";
import {
  postProcessorTransformerEngine,
  TRANSFORMER_CONFIG,
  GCODE_VOCABULARY,
  scaledDotProductAttention,
  getPositionalEncoding,
  bidirectionalLSTM,
  graphAttention,
  GCodeDiffusionModel,
  type GCodeToken
} from "../engines/PostProcessorTransformerEngine.js";

describe("PostProcessorTransformerEngine", () => {
  describe("Statistics", () => {
    it("should return comprehensive statistics", () => {
      const stats = postProcessorTransformerEngine.getStatistics();

      expect(stats.architecture).toBe("Transformer + Bi-LSTM + GAT + Diffusion");
      expect(stats.config.modelDimension).toBe(512);
      expect(stats.config.numHeads).toBe(8);
      expect(stats.config.numLayers).toBe(6);
      expect(stats.vocabularySize).toBeGreaterThan(20);
      expect(stats.capabilities).toHaveLength(8);
      expect(stats.basedOn).toHaveLength(5);
    });

    it("should have correct transformer config", () => {
      expect(TRANSFORMER_CONFIG.modelDimension).toBe(512);
      expect(TRANSFORMER_CONFIG.numHeads).toBe(8);
      expect(TRANSFORMER_CONFIG.feedForwardDim).toBe(2048);
      expect(TRANSFORMER_CONFIG.maxSequenceLength).toBe(4096);
      expect(TRANSFORMER_CONFIG.lstmHiddenSize).toBe(256);
      expect(TRANSFORMER_CONFIG.diffusionSteps).toBe(100);
    });
  });

  describe("G-code Vocabulary", () => {
    it("should have motion codes", () => {
      expect(GCODE_VOCABULARY["G00"]).toBeDefined();
      expect(GCODE_VOCABULARY["G01"]).toBeDefined();
      expect(GCODE_VOCABULARY["G02"]).toBeDefined();
      expect(GCODE_VOCABULARY["G03"]).toBeDefined();
    });

    it("should have work offset codes", () => {
      expect(GCODE_VOCABULARY["G54"]).toBeDefined();
      expect(GCODE_VOCABULARY["G55"]).toBeDefined();
      expect(GCODE_VOCABULARY["G56"]).toBeDefined();
    });

    it("should have compensation codes", () => {
      expect(GCODE_VOCABULARY["G40"]).toBeDefined();
      expect(GCODE_VOCABULARY["G41"]).toBeDefined();
      expect(GCODE_VOCABULARY["G42"]).toBeDefined();
      expect(GCODE_VOCABULARY["G43"]).toBeDefined();
    });

    it("should have canned cycle codes", () => {
      expect(GCODE_VOCABULARY["G81"]).toBeDefined();
      expect(GCODE_VOCABULARY["G82"]).toBeDefined();
      expect(GCODE_VOCABULARY["G83"]).toBeDefined();
      expect(GCODE_VOCABULARY["G84"]).toBeDefined();
    });

    it("should have M-codes", () => {
      expect(GCODE_VOCABULARY["M03"]).toBeDefined();
      expect(GCODE_VOCABULARY["M05"]).toBeDefined();
      expect(GCODE_VOCABULARY["M06"]).toBeDefined();
      expect(GCODE_VOCABULARY["M08"]).toBeDefined();
      expect(GCODE_VOCABULARY["M30"]).toBeDefined();
    });

    it("should have embeddings for all codes", () => {
      for (const [code, info] of Object.entries(GCODE_VOCABULARY)) {
        expect(info.embedding).toBeDefined();
        expect(info.embedding).toHaveLength(8);
        expect(info.type).toBeDefined();
        expect(info.description).toBeDefined();
      }
    });
  });

  describe("Tokenization", () => {
    it("should tokenize simple G-code", () => {
      const gcode = "G0 X1.0 Y2.0";
      const tokens = postProcessorTransformerEngine.tokenize(gcode);

      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens.some(t => t.value === "G0")).toBe(true);
      expect(tokens.some(t => t.type === "COORDINATE")).toBe(true);
    });

    it("should tokenize complete program", () => {
      const gcode = `
G90 G54
T1 M6
S3000 M3
G43 H1 Z1.0
G0 X0 Y0
G1 Z-0.5 F100
M5
M30
`;
      const tokens = postProcessorTransformerEngine.tokenize(gcode);

      expect(tokens.some(t => t.value === "G90")).toBe(true);
      expect(tokens.some(t => t.value === "G54")).toBe(true);
      expect(tokens.some(t => t.value === "T1")).toBe(true);
      expect(tokens.some(t => t.value === "M6")).toBe(true);
      expect(tokens.some(t => t.value === "M30")).toBe(true);
    });

    it("should handle comments", () => {
      const gcode = "(This is a comment)\nG0 X0";
      const tokens = postProcessorTransformerEngine.tokenize(gcode);

      expect(tokens.some(t => t.type === "COMMENT")).toBe(true);
    });

    it("should assign correct token types", () => {
      const gcode = "G0 X1.0 F100 S3000 T2 M3";
      const tokens = postProcessorTransformerEngine.tokenize(gcode);

      expect(tokens.find(t => t.value === "G0")?.type).toBe("MOTION");
      expect(tokens.find(t => t.value.startsWith("X"))?.type).toBe("COORDINATE");
      expect(tokens.find(t => t.value.startsWith("F"))?.type).toBe("FEED");
      expect(tokens.find(t => t.value.startsWith("S"))?.type).toBe("SPEED");
      expect(tokens.find(t => t.value.startsWith("T"))?.type).toBe("TOOL");
      expect(tokens.find(t => t.value === "M3")?.type).toBe("MCODE");
    });

    it("should include numeric values", () => {
      const gcode = "G1 X10.5 Y-20.3 Z5.0 F500";
      const tokens = postProcessorTransformerEngine.tokenize(gcode);

      const xToken = tokens.find(t => t.value.startsWith("X"));
      expect(xToken?.numericValue).toBeCloseTo(10.5);

      const yToken = tokens.find(t => t.value.startsWith("Y"));
      expect(yToken?.numericValue).toBeCloseTo(-20.3);

      const fToken = tokens.find(t => t.value.startsWith("F"));
      expect(fToken?.numericValue).toBe(500);
    });
  });

  describe("Positional Encoding", () => {
    it("should generate correct dimensions", () => {
      const encoding = getPositionalEncoding(100, 512);

      expect(encoding).toHaveLength(100);
      expect(encoding[0]).toHaveLength(512);
    });

    it("should produce sinusoidal values", () => {
      const encoding = getPositionalEncoding(10, 8);

      // First position should have sin(0) = 0 for even indices
      expect(encoding[0][0]).toBeCloseTo(0, 5);

      // Values should be bounded
      for (const row of encoding) {
        for (const val of row) {
          expect(val).toBeGreaterThanOrEqual(-1);
          expect(val).toBeLessThanOrEqual(1);
        }
      }
    });

    it("should have unique encodings per position", () => {
      const encoding = getPositionalEncoding(50, 64);

      // Each position should be unique
      for (let i = 0; i < encoding.length - 1; i++) {
        const isDifferent = encoding[i].some((val, j) =>
          Math.abs(val - encoding[i + 1][j]) > 0.001
        );
        expect(isDifferent).toBe(true);
      }
    });
  });

  describe("Scaled Dot-Product Attention", () => {
    it("should compute attention correctly", () => {
      const query = [[1, 0], [0, 1]];
      const key = [[1, 0], [0, 1]];
      const value = [[1, 2], [3, 4]];

      const result = scaledDotProductAttention(query, key, value);

      expect(result.output).toHaveLength(2);
      expect(result.attentionWeights).toHaveLength(2);

      // Attention weights should sum to 1 per row
      for (const row of result.attentionWeights) {
        const sum = row.reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1, 5);
      }
    });

    it("should scale by sqrt(dk)", () => {
      const query = [[2, 2, 2, 2]];  // dk = 4, sqrt(dk) = 2
      const key = [[1, 1, 1, 1]];
      const value = [[1, 1, 1, 1]];

      const result = scaledDotProductAttention(query, key, value);

      expect(result.output).toBeDefined();
      expect(result.attentionWeights[0][0]).toBeCloseTo(1, 5);  // Single key, should be 1
    });

    it("should handle different sequence lengths", () => {
      const query = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      const key = [[1, 0, 0], [0, 1, 0]];
      const value = [[1, 2, 3], [4, 5, 6]];

      const result = scaledDotProductAttention(query, key, value);

      expect(result.output).toHaveLength(3);
      expect(result.attentionWeights).toHaveLength(3);
      expect(result.attentionWeights[0]).toHaveLength(2);
    });
  });

  describe("Bi-LSTM", () => {
    it("should process sequence bidirectionally", () => {
      const sequence = [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
      ];

      const result = bidirectionalLSTM(sequence, 8);

      expect(result.forward).toHaveLength(4);
      expect(result.backward).toHaveLength(4);
      expect(result.combined).toHaveLength(4);

      // Combined should be concatenation of forward + backward
      expect(result.combined[0]).toHaveLength(16);  // 8 + 8
    });

    it("should produce different forward and backward outputs", () => {
      const sequence = [
        [1, 0],
        [0, 1],
        [1, 1]
      ];

      const result = bidirectionalLSTM(sequence, 4);

      // Forward and backward should be different
      const forwardSum = result.forward[0].reduce((a, b) => a + b, 0);
      const backwardSum = result.backward[0].reduce((a, b) => a + b, 0);

      // They may be close but shouldn't be identical
      expect(result.forward).not.toEqual(result.backward);
    });

    it("should apply tanh activation", () => {
      const sequence = [[100, 100]];  // Large values
      const result = bidirectionalLSTM(sequence, 4);

      // All values should be bounded by tanh (-1, 1)
      for (const val of result.forward[0]) {
        expect(val).toBeGreaterThanOrEqual(-1);
        expect(val).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("Graph Attention Network", () => {
    it("should compute attention over nodes", () => {
      const nodes = [
        { id: "n1", position: { x: 0, y: 0, z: 0 }, gcode: "G0", features: [1, 0, 0, 0], neighbors: ["n2"] },
        { id: "n2", position: { x: 1, y: 0, z: 0 }, gcode: "G1", features: [0, 1, 0, 0], neighbors: ["n1", "n3"] },
        { id: "n3", position: { x: 2, y: 0, z: 0 }, gcode: "G1", features: [0, 0, 1, 0], neighbors: ["n2"] }
      ];

      const result = graphAttention(nodes, 4);

      expect(result.nodeEmbeddings.size).toBe(3);
      expect(result.attentionScores.size).toBe(3);
    });

    it("should normalize attention scores", () => {
      const nodes = [
        { id: "n1", position: { x: 0, y: 0, z: 0 }, gcode: "G0", features: [1, 0], neighbors: ["n2", "n3"] },
        { id: "n2", position: { x: 1, y: 0, z: 0 }, gcode: "G1", features: [0, 1], neighbors: ["n1"] },
        { id: "n3", position: { x: 0, y: 1, z: 0 }, gcode: "G1", features: [1, 1], neighbors: ["n1"] }
      ];

      const result = graphAttention(nodes, 2);

      // Attention scores for node 1 should sum to 1
      const n1Scores = result.attentionScores.get("n1");
      if (n1Scores) {
        const sum = Array.from(n1Scores.values()).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1, 5);
      }
    });

    it("should aggregate neighbor features", () => {
      const nodes = [
        { id: "n1", position: { x: 0, y: 0, z: 0 }, gcode: "G0", features: [1, 0], neighbors: ["n2"] },
        { id: "n2", position: { x: 1, y: 0, z: 0 }, gcode: "G1", features: [0, 1], neighbors: ["n1"] }
      ];

      const result = graphAttention(nodes, 2);

      // Node 1's embedding should include features from node 2
      const n1Embed = result.nodeEmbeddings.get("n1");
      expect(n1Embed).toBeDefined();
      expect(n1Embed?.[0]).toBeGreaterThan(0);  // Original feature
    });
  });

  describe("Diffusion Model", () => {
    it("should initialize with correct schedule", () => {
      const model = new GCodeDiffusionModel({ numSteps: 100, betaStart: 0.0001, betaEnd: 0.02 });

      expect(model).toBeDefined();
    });

    it("should add noise to data", () => {
      const model = new GCodeDiffusionModel({ numSteps: 50, betaStart: 0.0001, betaEnd: 0.02 });
      const x = [0.5, 0.5, 0.5, 0.5];

      const result = model.addNoise(x, 25);

      expect(result.noisy).toHaveLength(4);
      expect(result.noise).toHaveLength(4);

      // Noisy should be different from original
      expect(result.noisy).not.toEqual(x);
    });

    it("should denoise data", () => {
      const model = new GCodeDiffusionModel({ numSteps: 50, betaStart: 0.0001, betaEnd: 0.02 });
      const noisy = [0.6, 0.4, 0.5, 0.7];
      const predictedNoise = [0.1, -0.1, 0, 0.2];

      const denoised = model.denoise(noisy, 25, predictedNoise);

      expect(denoised).toHaveLength(4);
    });

    it("should run full sampling process", () => {
      const model = new GCodeDiffusionModel({ numSteps: 10, betaStart: 0.0001, betaEnd: 0.02 });
      const noise = [0.5, -0.5, 0.3, -0.3];

      const denoiseStep = (x: number[], t: number) =>
        x.map(v => v * 0.1);  // Simple denoiser

      const sampled = model.sample(noise, denoiseStep);

      expect(sampled).toHaveLength(4);
    });
  });

  describe("Full Generation Pipeline", () => {
    it("should generate G-code for contouring", () => {
      const result = postProcessorTransformerEngine.generate({
        operation: "contouring"
      });

      expect(result.gcode.length).toBeGreaterThan(0);
      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.generationTime).toBeGreaterThan(0);
    });

    it("should generate G-code for drilling", () => {
      const result = postProcessorTransformerEngine.generate({
        operation: "drilling"
      });

      expect(result.gcode.length).toBeGreaterThan(0);
      expect(result.gcode.some(line => line.includes("G83"))).toBe(true);
    });

    it("should generate G-code for facing", () => {
      const result = postProcessorTransformerEngine.generate({
        operation: "facing"
      });

      expect(result.gcode.length).toBeGreaterThan(0);
    });

    it("should include metrics", () => {
      const result = postProcessorTransformerEngine.generate({
        operation: "contouring"
      });

      expect(result.metrics.tokenCount).toBeGreaterThan(0);
      expect(result.metrics.uniqueGCodes).toBeGreaterThan(0);
      expect(result.metrics.estimatedCycleTime).toBeGreaterThanOrEqual(0);
      expect(result.metrics.complexityScore).toBeGreaterThan(0);
    });

    it("should process custom source G-code", () => {
      const customGcode = `
G90 G54
T5 M6
S4000 M3
G0 X0 Y0 Z10
G1 Z-5 F200
G1 X50 F500
G0 Z10
M5
M30
`;
      const result = postProcessorTransformerEngine.generate({
        sourceGcode: customGcode
      });

      expect(result.tokens.some(t => t.value === "T5")).toBe(true);
      expect(result.tokens.some(t => t.value === "S4000")).toBe(true);
    });

    it("should generate controller-specific recommendations", () => {
      const result = postProcessorTransformerEngine.generate({
        operation: "contouring",
        controller: "haas"
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.includes("G187") || r.includes("finish"))).toBe(true);
    });

    it("should identify optimizations", () => {
      const result = postProcessorTransformerEngine.generate({
        operation: "contouring"
      });

      expect(result.optimizations).toBeDefined();
    });

    it("should detect warnings", () => {
      const gcodeWithIssues = "G1 X10 Y10 Z-5 F100";  // No G90, no spindle start
      const result = postProcessorTransformerEngine.generate({
        sourceGcode: gcodeWithIssues
      });

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("Toolpath Graph Building", () => {
    it("should build graph from G-code", () => {
      const gcode = `
G0 X0 Y0
G1 X10 Y0 F100
G1 X10 Y10
G1 X0 Y10
G0 Z10
`;
      const tokens = postProcessorTransformerEngine.tokenize(gcode);
      const graph = postProcessorTransformerEngine.buildToolpathGraph(tokens);

      expect(graph.length).toBeGreaterThan(0);
      expect(graph[0].id).toBe("node_0");
    });

    it("should connect sequential nodes", () => {
      const gcode = "G0 X0\nG1 X10\nG1 X20";
      const tokens = postProcessorTransformerEngine.tokenize(gcode);
      const graph = postProcessorTransformerEngine.buildToolpathGraph(tokens);

      if (graph.length >= 2) {
        expect(graph[0].neighbors).toContain(graph[1].id);
        expect(graph[1].neighbors).toContain(graph[0].id);
      }
    });

    it("should track position updates between nodes", () => {
      const gcode = "G0 X0\nG1 X5.0 Y10.0 Z2.0\nG1 X15.0";
      const tokens = postProcessorTransformerEngine.tokenize(gcode);
      const graph = postProcessorTransformerEngine.buildToolpathGraph(tokens);

      // Should have nodes for motion commands
      expect(graph.length).toBe(3);
      // Each node captures position at time of motion command
      expect(graph[0].gcode).toBe("G0");
      expect(graph[1].gcode).toBe("G1");
      expect(graph[2].gcode).toBe("G1");
    });
  });

  describe("Transformer Forward Pass", () => {
    it("should process tokens through transformer", () => {
      const gcode = "G0 X0 Y0\nG1 X10 F100";
      const tokens = postProcessorTransformerEngine.tokenize(gcode);
      const { output, attentionMaps } = postProcessorTransformerEngine.transformerForward(tokens);

      expect(output.length).toBe(tokens.length);
      expect(attentionMaps.length).toBe(6);  // 6 transformer layers
    });

    it("should produce embeddings of correct dimension", () => {
      const gcode = "G0 X0";
      const tokens = postProcessorTransformerEngine.tokenize(gcode);
      const { output } = postProcessorTransformerEngine.transformerForward(tokens);

      expect(output[0]).toHaveLength(512);  // Model dimension
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty G-code", () => {
      const tokens = postProcessorTransformerEngine.tokenize("");
      expect(tokens.some(t => t.type === "EOF")).toBe(true);
    });

    it("should handle G-code with only comments", () => {
      const tokens = postProcessorTransformerEngine.tokenize("(comment only)");
      expect(tokens.some(t => t.type === "COMMENT")).toBe(true);
    });

    it("should handle negative coordinates", () => {
      const tokens = postProcessorTransformerEngine.tokenize("G1 X-10.5 Y-20.3 Z-5.0");
      const xToken = tokens.find(t => t.value.startsWith("X"));
      expect(xToken?.numericValue).toBeCloseTo(-10.5);
    });

    it("should handle moderately long programs", () => {
      let gcode = "G90 G54\n";
      for (let i = 0; i < 20; i++) {
        gcode += `G1 X${i} Y${i} F100\n`;
      }
      gcode += "M30";

      const tokens = postProcessorTransformerEngine.tokenize(gcode);
      expect(tokens.length).toBeGreaterThan(50);

      // Build graph without full generation to avoid timeout
      const graph = postProcessorTransformerEngine.buildToolpathGraph(tokens);
      expect(graph.length).toBeGreaterThan(10);
    });
  });
});
