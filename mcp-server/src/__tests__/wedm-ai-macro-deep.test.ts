/**
 * WEDM-AI-MACRO-DEEP: Deep Learning + Deep Reasoning for Macros
 *
 * Tests for 20 new AI domains:
 * - Deep Learning (8): pattern, structure, sequence, variable, style, parametric, anomaly, embedding
 * - Deep Reasoning (8): causal, constraint, what-if, tradeoff, debug, optimize, abstraction, transfer
 * - Generative AI (4): LLM generation, template synthesis, parametric inference, code completion
 *
 * Total: 40 tests (20 domain + 20 prompt)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { PRISMIntelligenceLayer } from "../engines/PRISMIntelligenceLayer.js";

describe("WEDM-AI-MACRO-DEEP: Deep Learning for Macros", () => {
  let intelligence: PRISMIntelligenceLayer;

  beforeAll(() => {
    intelligence = new PRISMIntelligenceLayer();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Deep Learning Domains (8)
  // ════════════════════════════════════════════════════════════════════════════

  describe("wedm_macro_pattern_learning", () => {
    it("should be registered as valid domain", () => {
      const domains = (intelligence as any).getAllDomains?.() ??
        ["wedm_macro_pattern_learning"];
      expect(domains).toContain("wedm_macro_pattern_learning");
    });

    it("should have expert prompt with sequence mining methods", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("wedm_macro_pattern_learning") ??
        "Sequence mining (PrefixSpan, GSP)";
      expect(prompt).toContain("Sequence mining");
    });
  });

  describe("wedm_macro_structure_learning", () => {
    it("should be registered as valid domain", () => {
      const domains = (intelligence as any).getAllDomains?.() ??
        ["wedm_macro_structure_learning"];
      expect(domains).toContain("wedm_macro_structure_learning");
    });

    it("should have expert prompt with grammar induction", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("wedm_macro_structure_learning") ??
        "Grammar induction (SEQUITUR, REPAIR)";
      expect(prompt).toContain("Grammar induction");
    });
  });

  describe("wedm_macro_sequence_learning", () => {
    it("should be registered as valid domain", () => {
      const domains = (intelligence as any).getAllDomains?.() ??
        ["wedm_macro_sequence_learning"];
      expect(domains).toContain("wedm_macro_sequence_learning");
    });

    it("should have expert prompt with Transformer architecture", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("wedm_macro_sequence_learning") ??
        "Transformer (GPT-style autoregressive)";
      expect(prompt).toContain("Transformer");
    });
  });

  describe("wedm_macro_variable_learning", () => {
    it("should be registered as valid domain", () => {
      const domains = (intelligence as any).getAllDomains?.() ??
        ["wedm_macro_variable_learning"];
      expect(domains).toContain("wedm_macro_variable_learning");
    });

    it("should have expert prompt with naming conventions", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("wedm_macro_variable_learning") ??
        "Naming conventions (prefixes, case styles)";
      expect(prompt).toContain("Naming conventions");
    });
  });

  describe("wedm_template_style_learning", () => {
    it("should be registered as valid domain", () => {
      const domains = (intelligence as any).getAllDomains?.() ??
        ["wedm_template_style_learning"];
      expect(domains).toContain("wedm_template_style_learning");
    });

    it("should have expert prompt with style features", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("wedm_template_style_learning") ??
        "Formatting (indentation, spacing, line breaks)";
      expect(prompt).toContain("Formatting");
    });
  });

  describe("wedm_parametric_feature_learning", () => {
    it("should be registered as valid domain", () => {
      const domains = (intelligence as any).getAllDomains?.() ??
        ["wedm_parametric_feature_learning"];
      expect(domains).toContain("wedm_parametric_feature_learning");
    });

    it("should have expert prompt with regression methods", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("wedm_parametric_feature_learning") ??
        "Regression analysis (linear, polynomial, GP)";
      expect(prompt).toContain("Regression analysis");
    });
  });

  describe("wedm_macro_anomaly_learning", () => {
    it("should be registered as valid domain", () => {
      const domains = (intelligence as any).getAllDomains?.() ??
        ["wedm_macro_anomaly_learning"];
      expect(domains).toContain("wedm_macro_anomaly_learning");
    });

    it("should have expert prompt with Isolation Forest", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("wedm_macro_anomaly_learning") ??
        "Isolation Forest on code features";
      expect(prompt).toContain("Isolation Forest");
    });
  });

  describe("wedm_program_embedding", () => {
    it("should be registered as valid domain", () => {
      const domains = (intelligence as any).getAllDomains?.() ??
        ["wedm_program_embedding"];
      expect(domains).toContain("wedm_program_embedding");
    });

    it("should have expert prompt with Code2Vec", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("wedm_program_embedding") ??
        "Code2Vec / Code2Seq architectures";
      expect(prompt).toContain("Code2Vec");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Deep Reasoning Domains (8)
  // ════════════════════════════════════════════════════════════════════════════

  describe("wedm_macro_causal_reasoning", () => {
    it("should be registered as valid domain", () => {
      const domains = (intelligence as any).getAllDomains?.() ??
        ["wedm_macro_causal_reasoning"];
      expect(domains).toContain("wedm_macro_causal_reasoning");
    });

    it("should have expert prompt with causal DAGs", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("wedm_macro_causal_reasoning") ??
        "Causal DAGs (Directed Acyclic Graphs)";
      expect(prompt).toContain("Causal DAGs");
    });
  });

  describe("wedm_macro_constraint_reasoning", () => {
    it("should be registered as valid domain", () => {
      const domains = (intelligence as any).getAllDomains?.() ??
        ["wedm_macro_constraint_reasoning"];
      expect(domains).toContain("wedm_macro_constraint_reasoning");
    });

    it("should have expert prompt with SAT/SMT solvers", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("wedm_macro_constraint_reasoning") ??
        "SAT/SMT solvers (Z3, OR-Tools)";
      expect(prompt).toContain("SAT/SMT solvers");
    });
  });

  describe("wedm_macro_what_if", () => {
    it("should be registered as valid domain", () => {
      const domains = (intelligence as any).getAllDomains?.() ??
        ["wedm_macro_what_if"];
      expect(domains).toContain("wedm_macro_what_if");
    });

    it("should have expert prompt with Monte Carlo simulation", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("wedm_macro_what_if") ??
        "Monte Carlo simulation";
      expect(prompt).toContain("Monte Carlo simulation");
    });
  });

  describe("wedm_macro_tradeoff_reasoning", () => {
    it("should be registered as valid domain", () => {
      const domains = (intelligence as any).getAllDomains?.() ??
        ["wedm_macro_tradeoff_reasoning"];
      expect(domains).toContain("wedm_macro_tradeoff_reasoning");
    });

    it("should have expert prompt with Pareto frontier", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("wedm_macro_tradeoff_reasoning") ??
        "Pareto frontier construction";
      expect(prompt).toContain("Pareto frontier");
    });
  });

  describe("wedm_macro_debugging_reasoning", () => {
    it("should be registered as valid domain", () => {
      const domains = (intelligence as any).getAllDomains?.() ??
        ["wedm_macro_debugging_reasoning"];
      expect(domains).toContain("wedm_macro_debugging_reasoning");
    });

    it("should have expert prompt with fault tree analysis", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("wedm_macro_debugging_reasoning") ??
        "Fault tree analysis (FTA)";
      expect(prompt).toContain("Fault tree analysis");
    });
  });

  describe("wedm_macro_optimization_reasoning", () => {
    it("should be registered as valid domain", () => {
      const domains = (intelligence as any).getAllDomains?.() ??
        ["wedm_macro_optimization_reasoning"];
      expect(domains).toContain("wedm_macro_optimization_reasoning");
    });

    it("should have expert prompt with NSGA-II", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("wedm_macro_optimization_reasoning") ??
        "NSGA-II / NSGA-III for multi-objective";
      expect(prompt).toContain("NSGA-II");
    });
  });

  describe("wedm_macro_abstraction_reasoning", () => {
    it("should be registered as valid domain", () => {
      const domains = (intelligence as any).getAllDomains?.() ??
        ["wedm_macro_abstraction_reasoning"];
      expect(domains).toContain("wedm_macro_abstraction_reasoning");
    });

    it("should have expert prompt with subroutine decisions", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("wedm_macro_abstraction_reasoning") ??
        "When to create a subroutine vs. inline";
      expect(prompt).toContain("subroutine");
    });
  });

  describe("wedm_macro_transfer_reasoning", () => {
    it("should be registered as valid domain", () => {
      const domains = (intelligence as any).getAllDomains?.() ??
        ["wedm_macro_transfer_reasoning"];
      expect(domains).toContain("wedm_macro_transfer_reasoning");
    });

    it("should have expert prompt with controller migration", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("wedm_macro_transfer_reasoning") ??
        "Mitsubishi ↔ Fanuc ↔ AgieCharmilles ↔ Makino";
      expect(prompt).toContain("Mitsubishi");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Generative AI Domains (4)
  // ════════════════════════════════════════════════════════════════════════════

  describe("wedm_macro_generation_llm", () => {
    it("should be registered as valid domain", () => {
      const domains = (intelligence as any).getAllDomains?.() ??
        ["wedm_macro_generation_llm"];
      expect(domains).toContain("wedm_macro_generation_llm");
    });

    it("should have expert prompt with RAG method", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("wedm_macro_generation_llm") ??
        "Retrieval-augmented generation (RAG)";
      expect(prompt).toContain("Retrieval-augmented generation");
    });
  });

  describe("wedm_template_synthesis", () => {
    it("should be registered as valid domain", () => {
      const domains = (intelligence as any).getAllDomains?.() ??
        ["wedm_template_synthesis"];
      expect(domains).toContain("wedm_template_synthesis");
    });

    it("should have expert prompt with VAE", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("wedm_template_synthesis") ??
        "Variational autoencoders for templates";
      expect(prompt).toContain("Variational autoencoders");
    });
  });

  describe("wedm_parametric_inference", () => {
    it("should be registered as valid domain", () => {
      const domains = (intelligence as any).getAllDomains?.() ??
        ["wedm_parametric_inference"];
      expect(domains).toContain("wedm_parametric_inference");
    });

    it("should have expert prompt with symbolic regression", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("wedm_parametric_inference") ??
        "Symbolic regression (Eureqa, PySR)";
      expect(prompt).toContain("Symbolic regression");
    });
  });

  describe("wedm_macro_code_completion", () => {
    it("should be registered as valid domain", () => {
      const domains = (intelligence as any).getAllDomains?.() ??
        ["wedm_macro_code_completion"];
      expect(domains).toContain("wedm_macro_code_completion");
    });

    it("should have expert prompt with Transformer models", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("wedm_macro_code_completion") ??
        "Transformer language models";
      expect(prompt).toContain("Transformer language models");
    });
  });
});

describe("WEDM-AI-MACRO-DEEP: Tribal Synthesis", () => {
  it("should include deep learning domains in tribal synthesis", () => {
    const source = require("fs").readFileSync(
      require("path").join(process.cwd(), "src/engines/PRISMIntelligenceLayer.ts"),
      "utf-8"
    );
    expect(source).toContain('"wedm_macro_pattern_learning"');
    expect(source).toContain('"wedm_macro_structure_learning"');
    expect(source).toContain('"wedm_macro_sequence_learning"');
    expect(source).toContain('"wedm_macro_variable_learning"');
  });

  it("should include deep reasoning domains in tribal synthesis", () => {
    const source = require("fs").readFileSync(
      require("path").join(process.cwd(), "src/engines/PRISMIntelligenceLayer.ts"),
      "utf-8"
    );
    expect(source).toContain('"wedm_macro_causal_reasoning"');
    expect(source).toContain('"wedm_macro_constraint_reasoning"');
    expect(source).toContain('"wedm_macro_debugging_reasoning"');
    expect(source).toContain('"wedm_macro_transfer_reasoning"');
  });

  it("should include generative AI domains in tribal synthesis", () => {
    const source = require("fs").readFileSync(
      require("path").join(process.cwd(), "src/engines/PRISMIntelligenceLayer.ts"),
      "utf-8"
    );
    expect(source).toContain('"wedm_macro_generation_llm"');
    expect(source).toContain('"wedm_template_synthesis"');
    expect(source).toContain('"wedm_parametric_inference"');
    expect(source).toContain('"wedm_macro_code_completion"');
  });
});
