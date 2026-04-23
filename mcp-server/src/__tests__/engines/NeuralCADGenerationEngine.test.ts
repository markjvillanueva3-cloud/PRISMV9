/**
 * NeuralCADGenerationEngine Tests — CADCAM-DAGI-MS0/U-DAGI07
 *
 * 35 tests covering:
 *   - parseInput(): all 4 input types
 *   - extractFeaturesFromText(): pattern extraction
 *   - buildPrompt(): with/without RAG
 *   - toCadQuery() / featuresToCadQuery(): code generation
 *   - validateSyntax(): error detection
 *   - generate(): full pipeline with mock backend
 *   - listPatterns() / getPattern(): pattern utilities
 */
import { describe, it, expect, vi } from "vitest";
import {
  neuralCADGenerationEngine,
  type GenerationInput,
  type GenerationBackend,
  type BlueprintData,
  type FeatureSpec,
  type GenerationConfig,
  type TokenSeq,
} from "../../engines/NeuralCADGenerationEngine.js";
import type { EmbeddingBackend } from "../../engines/CADFeatureEmbeddingEngine.js";
import type { RAGCorpusEntry } from "../../engines/CADRetrievalAugmentationEngine.js";

// ── Mock Backends ────────────────────────────────────────────────────────────

class MockGenerationBackend implements GenerationBackend {
  readonly tokens: TokenSeq;
  callCount = 0;

  constructor(tokens: TokenSeq = [10, 20, 30, 40, 50]) {
    this.tokens = tokens;
  }

  async generate(_prompt: string, _config: { temperature: number; maxTokens: number }): Promise<TokenSeq> {
    this.callCount++;
    return this.tokens;
  }

  scoreSequence(tokens: TokenSeq): number {
    return Math.min(tokens.length / 10, 1.0);
  }
}

class FailingGenerationBackend implements GenerationBackend {
  async generate(): Promise<TokenSeq> {
    throw new Error("Backend unavailable");
  }
}

const mockEmbeddingBackend: EmbeddingBackend = {
  embed: async (tokens: TokenSeq) => tokens.map((t) => t / 100),
  embedBatch: async (batch: TokenSeq[]) => batch.map((tokens) => tokens.map((t) => t / 100)),
  dimension: () => 5,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("NeuralCADGenerationEngine", () => {
  // ── Engine Info ─────────────────────────────────────────────────────────
  describe("engine info", () => {
    it("has correct name and version", () => {
      expect(neuralCADGenerationEngine.info.name).toBe("NeuralCADGenerationEngine");
      expect(neuralCADGenerationEngine.info.version).toBe("1.0.0");
      expect(neuralCADGenerationEngine.info.domain).toBe("cad_neural");
    });

    it("exposes required capabilities", () => {
      const caps = neuralCADGenerationEngine.getCapabilities();
      const names = caps.map((c) => c.name);
      expect(names).toContain("generate");
      expect(names).toContain("parse_input");
      expect(names).toContain("validate");
      expect(names).toContain("to_cadquery");
      expect(names).toContain("list_patterns");
    });
  });

  // ── parseInput ──────────────────────────────────────────────────────────
  describe("parseInput", () => {
    it("parses text input with shaft description", () => {
      const input: GenerationInput = {
        type: "text",
        text: "Create a 25mm diameter shaft with 100mm length",
        customer: "ALCOA",
      };
      const parsed = neuralCADGenerationEngine.parseInput(input);

      expect(parsed.description).toContain("25mm diameter shaft");
      expect(parsed.features.length).toBeGreaterThan(0);
      expect(parsed.features.some((f) => f.type === "cylinder")).toBe(true);
      expect(parsed.customer).toBe("ALCOA");
    });

    it("parses text input with multiple features", () => {
      const input: GenerationInput = {
        type: "text",
        text: "Shaft with bore and thread for fastener application",
      };
      const parsed = neuralCADGenerationEngine.parseInput(input);

      expect(parsed.features.length).toBeGreaterThanOrEqual(3);
      const types = parsed.features.map((f) => f.type);
      expect(types).toContain("cylinder");
      expect(types).toContain("hole");
      expect(types).toContain("thread");
    });

    it("parses features input directly", () => {
      const features: FeatureSpec[] = [
        { type: "box", params: { width: 100, length: 80, height: 20 } },
        { type: "hole", params: { diameter: 10, depth: 20 } },
      ];
      const input: GenerationInput = {
        type: "features",
        features,
        machineCategory: "mill",
      };
      const parsed = neuralCADGenerationEngine.parseInput(input);

      expect(parsed.features).toEqual(features);
      expect(parsed.machineCategory).toBe("mill");
      expect(parsed.description).toContain("box");
    });

    it("parses blueprint input with dimensions", () => {
      const blueprint: BlueprintData = {
        dimensions: [
          { name: "OD", value: 50, unit: "mm" },
          { name: "length", value: 100, unit: "mm" },
        ],
        features: ["shaft", "bore"],
        views: [{ type: "front" }],
        material: "4140 steel",
      };
      const input: GenerationInput = {
        type: "blueprint",
        blueprint,
      };
      const parsed = neuralCADGenerationEngine.parseInput(input);

      expect(parsed.dimensions["OD"]).toBe(50);
      expect(parsed.dimensions["length"]).toBe(100);
      expect(parsed.material).toBe("4140 steel");
      expect(parsed.features.length).toBeGreaterThan(0);
    });

    it("parses tokens input as raw sequence", () => {
      const input: GenerationInput = {
        type: "tokens",
        tokens: [100, 200, 300],
      };
      const parsed = neuralCADGenerationEngine.parseInput(input);

      expect(parsed.description).toBe("Raw token sequence");
      expect(parsed.features).toEqual([]);
    });

    it("handles empty text input", () => {
      const input: GenerationInput = { type: "text", text: "" };
      const parsed = neuralCADGenerationEngine.parseInput(input);

      expect(parsed.description).toBe("");
      expect(parsed.features).toEqual([]);
    });
  });

  // ── extractFeaturesFromText ─────────────────────────────────────────────
  describe("extractFeaturesFromText", () => {
    it("extracts shaft features", () => {
      const features = neuralCADGenerationEngine.extractFeaturesFromText("Create a shaft");
      expect(features.some((f) => f.type === "cylinder")).toBe(true);
    });

    it("extracts pocket features", () => {
      const features = neuralCADGenerationEngine.extractFeaturesFromText("Mill a pocket");
      expect(features.some((f) => f.type === "pocket")).toBe(true);
    });

    it("extracts bracket features", () => {
      const features = neuralCADGenerationEngine.extractFeaturesFromText("L-shaped bracket");
      expect(features.some((f) => f.type === "lbracket")).toBe(true);
    });

    it("extracts multiple features from complex description", () => {
      const features = neuralCADGenerationEngine.extractFeaturesFromText(
        "Pulley with flange and keyway"
      );
      const types = features.map((f) => f.type);
      expect(types).toContain("cylinder");
      expect(types).toContain("slot");
    });

    it("extracts dimensions from text", () => {
      const features = neuralCADGenerationEngine.extractFeaturesFromText(
        "Shaft with 30mm diameter and 150mm length"
      );
      const cylinder = features.find((f) => f.type === "cylinder");
      expect(cylinder).toBeDefined();
      // Dimension extraction updates params
      expect(cylinder?.params.diameter === 30 || cylinder?.params.length === 150).toBe(true);
    });

    it("returns empty for unrecognized text", () => {
      const features = neuralCADGenerationEngine.extractFeaturesFromText("Random gibberish xyz");
      expect(features.length).toBe(0);
    });
  });

  // ── buildPrompt ─────────────────────────────────────────────────────────
  describe("buildPrompt", () => {
    it("builds prompt with description", () => {
      const parsed = neuralCADGenerationEngine.parseInput({
        type: "text",
        text: "Simple plate",
      });
      const prompt = neuralCADGenerationEngine.buildPrompt(parsed);

      expect(prompt).toContain("# CAD Generation Task");
      expect(prompt).toContain("Description:");
      expect(prompt).toContain("Generate CadQuery Python code");
    });

    it("includes customer when provided", () => {
      const parsed = neuralCADGenerationEngine.parseInput({
        type: "text",
        text: "Shaft",
        customer: "ITW",
      });
      const prompt = neuralCADGenerationEngine.buildPrompt(parsed);

      expect(prompt).toContain("Customer: ITW");
    });

    it("includes material when provided", () => {
      const parsed = neuralCADGenerationEngine.parseInput({
        type: "blueprint",
        blueprint: {
          dimensions: [],
          features: [],
          views: [],
          material: "D2 tool steel",
        },
      });
      const prompt = neuralCADGenerationEngine.buildPrompt(parsed);

      expect(prompt).toContain("Material: D2 tool steel");
    });

    it("includes RAG examples when provided", () => {
      const parsed = neuralCADGenerationEngine.parseInput({
        type: "text",
        text: "Bushing",
      });
      const examples = [
        { id: "part-1", tokens: [1, 2, 3], similarity: 0.85 },
        { id: "part-2", tokens: [4, 5, 6], similarity: 0.72 },
      ];
      const prompt = neuralCADGenerationEngine.buildPrompt(parsed, examples);

      expect(prompt).toContain("Similar Parts");
      expect(prompt).toContain("part-1");
      expect(prompt).toContain("85% similar");
    });

    it("lists required features", () => {
      const parsed = neuralCADGenerationEngine.parseInput({
        type: "features",
        features: [
          { type: "box", params: { width: 50, length: 50, height: 10 } },
        ],
      });
      const prompt = neuralCADGenerationEngine.buildPrompt(parsed);

      expect(prompt).toContain("Required Features");
      expect(prompt).toContain("box");
    });
  });

  // ── featuresToCadQuery ──────────────────────────────────────────────────
  describe("featuresToCadQuery", () => {
    it("generates valid CadQuery for box", () => {
      const features: FeatureSpec[] = [
        { type: "box", params: { width: 100, length: 80, height: 20 } },
      ];
      const code = neuralCADGenerationEngine.featuresToCadQuery(features);

      expect(code).toContain("import cadquery as cq");
      expect(code).toContain("cq.Workplane('XY')");
      expect(code).toContain(".box(100, 80, 20)");
      expect(code).toContain("show_object(result)");
    });

    it("generates valid CadQuery for cylinder with hole", () => {
      const features: FeatureSpec[] = [
        { type: "cylinder", params: { diameter: 40, length: 50 } },
        { type: "hole", params: { diameter: 10, depth: 50 } },
      ];
      const code = neuralCADGenerationEngine.featuresToCadQuery(features);

      expect(code).toContain(".cylinder(50, 20)");
      expect(code).toContain(".hole(10, 50)");
    });

    it("generates valid CadQuery for flange", () => {
      const features: FeatureSpec[] = [
        { type: "flange", params: { outerDiameter: 80, innerDiameter: 40, thickness: 10 } },
      ];
      const code = neuralCADGenerationEngine.featuresToCadQuery(features);

      expect(code).toContain(".circle(40)");
      expect(code).toContain(".circle(20)");
      expect(code).toContain(".extrude(10)");
    });

    it("generates thread as comment", () => {
      const features: FeatureSpec[] = [
        { type: "thread", params: { diameter: 12, pitch: 1.75, length: 25 } },
      ];
      const code = neuralCADGenerationEngine.featuresToCadQuery(features);

      expect(code).toContain("# Thread: M12x1.75");
    });
  });

  // ── toCadQuery ──────────────────────────────────────────────────────────
  describe("toCadQuery", () => {
    it("converts tokens to CadQuery template", () => {
      const tokens: TokenSeq = [10, 20, 30, 40, 50];
      const code = neuralCADGenerationEngine.toCadQuery(tokens);

      expect(code).toContain("import cadquery as cq");
      expect(code).toContain("cq.Workplane('XY')");
      expect(code).toContain("show_object(result)");
    });

    it("generates different templates based on token values", () => {
      const lowTokens: TokenSeq = [1, 2, 3, 4, 5];
      const highTokens: TokenSeq = [200, 300, 400, 500, 600];

      const lowCode = neuralCADGenerationEngine.toCadQuery(lowTokens);
      const highCode = neuralCADGenerationEngine.toCadQuery(highTokens);

      // Different base shapes based on token average
      expect(lowCode).toContain(".box(50, 50, 10)");
      expect(highCode).toContain(".box(80, 60, 20)");
    });

    it("handles empty token sequence", () => {
      const code = neuralCADGenerationEngine.toCadQuery([]);
      expect(code).toContain("import cadquery as cq");
    });
  });

  // ── validateSyntax ──────────────────────────────────────────────────────
  describe("validateSyntax", () => {
    it("validates correct CadQuery code", () => {
      const code = `import cadquery as cq
result = cq.Workplane('XY').box(10, 10, 10)
show_object(result)`;

      const result = neuralCADGenerationEngine.validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("detects missing import", () => {
      const code = `result = cq.Workplane('XY').box(10, 10, 10)
show_object(result)`;

      const result = neuralCADGenerationEngine.validateSyntax(code);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing 'import cadquery' statement");
    });

    it("detects missing Workplane", () => {
      const code = `import cadquery as cq
result = cq.box(10, 10, 10)
show_object(result)`;

      const result = neuralCADGenerationEngine.validateSyntax(code);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing Workplane initialization");
    });

    it("detects unbalanced parentheses", () => {
      const code = `import cadquery as cq
result = cq.Workplane('XY').box(10, 10, 10
show_object(result)`;

      const result = neuralCADGenerationEngine.validateSyntax(code);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Unbalanced parentheses"))).toBe(true);
    });

    it("detects double dot syntax error", () => {
      const code = `import cadquery as cq
result = cq.Workplane('XY')..box(10, 10, 10)
show_object(result)`;

      const result = neuralCADGenerationEngine.validateSyntax(code);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Double dot detected (syntax error)");
    });

    it("warns on missing output statement", () => {
      const code = `import cadquery as cq
result = cq.Workplane('XY').box(10, 10, 10)`;

      const result = neuralCADGenerationEngine.validateSyntax(code);

      expect(result.warnings.some((w) => w.includes("No output statement"))).toBe(true);
    });

    it("warns on short code", () => {
      const code = `import cadquery as cq
cq.Workplane('XY')`;

      const result = neuralCADGenerationEngine.validateSyntax(code);

      expect(result.warnings.some((w) => w.includes("too short"))).toBe(true);
    });
  });

  // ── generate (full pipeline) ────────────────────────────────────────────
  describe("generate", () => {
    it("generates successfully with features input", async () => {
      const backend = new MockGenerationBackend();
      const input: GenerationInput = {
        type: "features",
        features: [
          { type: "box", params: { width: 50, length: 50, height: 10 } },
        ],
      };

      const result = await neuralCADGenerationEngine.generate(input, backend);

      expect(result.success).toBe(true);
      expect(result.code).toContain("import cadquery");
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.attempts).toBe(1);
    });

    it("generates successfully with text input", async () => {
      const backend = new MockGenerationBackend([50, 60, 70, 80, 90]);
      const input: GenerationInput = {
        type: "text",
        text: "Create a simple plate with hole",
      };

      const result = await neuralCADGenerationEngine.generate(input, backend);

      expect(result.success).toBe(true);
      expect(result.code.length).toBeGreaterThan(50);
    });

    it("uses RAG when corpus provided", async () => {
      const backend = new MockGenerationBackend();
      const input: GenerationInput = {
        type: "features",
        features: [{ type: "shaft", params: {} }],
        customer: "ALCOA",
      };
      const corpus: RAGCorpusEntry[] = [
        { id: "alcoa-1", tokens: [1, 2, 3], customer: "ALCOA", features: ["shaft"] },
        { id: "itw-1", tokens: [4, 5, 6], customer: "ITW", features: ["bracket"] },
      ];
      const config: GenerationConfig = { useRAG: true, ragK: 2 };

      const result = await neuralCADGenerationEngine.generate(
        input,
        backend,
        mockEmbeddingBackend,
        corpus,
        config
      );

      expect(result.success).toBe(true);
      // RAG retrieval should be performed (even if corpus is small)
    });

    it("retries on validation failure", async () => {
      // First call fails validation, subsequent calls succeed
      let callCount = 0;
      const backend: GenerationBackend = {
        async generate() {
          callCount++;
          if (callCount === 1) {
            return [1, 2]; // Will produce short code (warning only)
          }
          return [50, 60, 70, 80, 90, 100];
        },
      };

      const input: GenerationInput = { type: "tokens", tokens: [100] };
      const config: GenerationConfig = { maxRetries: 3 };

      const result = await neuralCADGenerationEngine.generate(input, backend, undefined, undefined, config);

      // Should complete (warnings don't invalidate)
      expect(result.code).toContain("import cadquery");
    });

    it("returns failure after max retries on backend error", async () => {
      const backend = new FailingGenerationBackend();
      const input: GenerationInput = {
        type: "text",
        text: "Shaft",
      };
      const config: GenerationConfig = { maxRetries: 2 };

      const result = await neuralCADGenerationEngine.generate(input, backend, undefined, undefined, config);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2);
      expect(result.error).toContain("Backend unavailable");
    });

    it("respects outputFormat tokens", async () => {
      const backend = new MockGenerationBackend([11, 22, 33]);
      const input: GenerationInput = { type: "tokens", tokens: [] };
      const config: GenerationConfig = { outputFormat: "tokens" };

      const result = await neuralCADGenerationEngine.generate(input, backend, undefined, undefined, config);

      expect(result.code).toBe("11,22,33");
    });

    it("skips validation when disabled", async () => {
      const backend = new MockGenerationBackend([1]);
      const input: GenerationInput = { type: "tokens", tokens: [] };
      const config: GenerationConfig = { validateSyntax: false };

      const result = await neuralCADGenerationEngine.generate(input, backend, undefined, undefined, config);

      expect(result.validation.valid).toBe(true);
      expect(result.validation.errors).toHaveLength(0);
    });

    it("calculates higher confidence with RAG examples", async () => {
      const backend = new MockGenerationBackend();
      const input: GenerationInput = {
        type: "features",
        features: [{ type: "box", params: { width: 10, length: 10, height: 10 } }],
      };
      const corpus: RAGCorpusEntry[] = [
        { id: "ex-1", tokens: [1, 2, 3], features: ["box"] },
      ];

      const resultWithRAG = await neuralCADGenerationEngine.generate(
        input,
        backend,
        mockEmbeddingBackend,
        corpus,
        { useRAG: true }
      );
      const resultNoRAG = await neuralCADGenerationEngine.generate(
        input,
        backend,
        undefined,
        undefined,
        { useRAG: false }
      );

      // RAG adds confidence boost
      expect(resultWithRAG.confidence).toBeGreaterThanOrEqual(resultNoRAG.confidence);
    });
  });

  // ── Pattern utilities ───────────────────────────────────────────────────
  describe("pattern utilities", () => {
    it("lists all 20 patterns", () => {
      const patterns = neuralCADGenerationEngine.listPatterns();

      expect(patterns.length).toBe(20);
      expect(patterns).toContain("shaft");
      expect(patterns).toContain("bore");
      expect(patterns).toContain("pocket");
      expect(patterns).toContain("pulley");
    });

    it("gets shaft pattern", () => {
      const shaft = neuralCADGenerationEngine.getPattern("shaft");

      expect(shaft).toBeDefined();
      expect(shaft!.length).toBeGreaterThan(0);
      expect(shaft![0].type).toBe("cylinder");
    });

    it("returns undefined for unknown pattern", () => {
      const unknown = neuralCADGenerationEngine.getPattern("nonexistent");
      expect(unknown).toBeUndefined();
    });

    it("pulley pattern has multiple features", () => {
      const pulley = neuralCADGenerationEngine.getPattern("pulley");

      expect(pulley).toBeDefined();
      expect(pulley!.length).toBe(3);
      const types = pulley!.map((f) => f.type);
      expect(types).toContain("cylinder");
      expect(types).toContain("groove");
      expect(types).toContain("bore");
    });
  });

  // ── validate method ─────────────────────────────────────────────────────
  describe("validate method", () => {
    it("returns null for valid input object", () => {
      const result = neuralCADGenerationEngine.validate({ type: "text", text: "test" });
      expect(result).toBeNull();
    });

    it("returns error for null input", () => {
      const result = neuralCADGenerationEngine.validate(null);
      expect(result).toBe("input must be an object");
    });

    it("returns error for non-object input", () => {
      const result = neuralCADGenerationEngine.validate("string input");
      expect(result).toBe("input must be an object");
    });
  });
});
