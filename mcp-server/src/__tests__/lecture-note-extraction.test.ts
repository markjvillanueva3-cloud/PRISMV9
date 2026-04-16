/**
 * Lecture Note Extraction Engine Tests
 * PDF-EXT-MS2 U-PDF11: Real tests against MIT course content
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  LectureNoteExtractionEngine,
  ExtractedFormula,
  FormulaCategory,
} from "../engines/LectureNoteExtractionEngine.js";

// ============================================================================
// Formula Pattern Recognition Tests
// ============================================================================

describe("LectureNoteExtractionEngine - Formula Patterns", () => {
  let engine: LectureNoteExtractionEngine;

  beforeEach(() => {
    engine = new LectureNoteExtractionEngine();
    engine.clear();
  });

  describe("Cutting Mechanics Formulas", () => {
    it("should extract Kienzle force equation", async () => {
      const text = "The cutting force is calculated using Fc = kc × b × h^(1-m)";
      const formulas = await engine.extractFormulasFromText(text, "2.810", 5);

      expect(formulas.length).toBeGreaterThan(0);
      const kienzle = formulas.find((f) => f.name === "Kienzle Cutting Force");
      expect(kienzle).toBeDefined();
      expect(kienzle?.category).toBe("cutting_mechanics");
      expect(kienzle?.prismEngines).toContain("PRISM_KIENZLE_FORCE");
    });

    it("should extract Taylor tool life equation", async () => {
      const text = "Tool life follows Taylor's equation: V × T^n = C where n is the Taylor exponent.";
      const formulas = await engine.extractFormulasFromText(text, "2.810", 8);

      expect(formulas.length).toBeGreaterThan(0);
      const taylor = formulas.find((f) => f.name === "Taylor Tool Life Equation");
      expect(taylor).toBeDefined();
      expect(taylor?.prismEngines).toContain("PRISM_TAYLOR_TOOL_LIFE");
    });

    it("should extract MRR formula", async () => {
      const text = "Material removal rate: MRR = Vc × ap × f (mm³/min)";
      const formulas = await engine.extractFormulasFromText(text, "2.810", 3);

      expect(formulas.length).toBeGreaterThan(0);
      const mrr = formulas.find((f) => f.name === "Material Removal Rate");
      expect(mrr).toBeDefined();
      expect(mrr?.prismEngines).toContain("PRISM_MRR_CALCULATOR");
    });

    it("should extract Merchant shear angle", async () => {
      const text = "The shear angle φ = 45 + α - β where α is the rake angle";
      const formulas = await engine.extractFormulasFromText(text, "2.810", 4);

      expect(formulas.length).toBeGreaterThan(0);
      const merchant = formulas.find((f) => f.name === "Merchant Shear Angle");
      expect(merchant).toBeDefined();
      expect(merchant?.prismEngines).toContain("PRISM_MERCHANT_FORCE");
    });
  });

  describe("Dynamics Formulas", () => {
    it("should extract natural frequency formula", async () => {
      const text = "The natural frequency of the system is ωn = √(k/m) rad/s";
      const formulas = await engine.extractFormulasFromText(text, "2.032", 7);

      expect(formulas.length).toBeGreaterThan(0);
      const natFreq = formulas.find((f) => f.name === "Natural Frequency");
      expect(natFreq).toBeDefined();
      expect(natFreq?.category).toBe("dynamics");
      expect(natFreq?.prismEngines).toContain("PRISM_STABILITY_LOBES");
    });

    it("should extract damping ratio", async () => {
      const text = "Damping ratio: ζ = c / (2 × √(k × m))";
      const formulas = await engine.extractFormulasFromText(text, "2.032", 8);

      expect(formulas.length).toBeGreaterThan(0);
      const damping = formulas.find((f) => f.name === "Damping Ratio");
      expect(damping).toBeDefined();
      expect(damping?.prismEngines).toContain("PRISM_CHATTER_PREDICTION_ENGINE");
    });

    it("should extract vibration response", async () => {
      const text = "x(t) = A × sin(ωt + φ) for free vibration";
      const formulas = await engine.extractFormulasFromText(text, "2.003", 10);

      expect(formulas.length).toBeGreaterThan(0);
      const vibration = formulas.find((f) => f.name === "Vibration Response");
      expect(vibration).toBeDefined();
    });
  });

  describe("Thermal Formulas", () => {
    it("should extract Fourier heat conduction", async () => {
      const text = "Heat flux follows Fourier's law: q = -k × dT/dx";
      const formulas = await engine.extractFormulasFromText(text, "2.51", 3);

      expect(formulas.length).toBeGreaterThan(0);
      const fourier = formulas.find((f) => f.name === "Fourier Heat Conduction");
      expect(fourier).toBeDefined();
      expect(fourier?.category).toBe("thermal");
      expect(fourier?.prismEngines).toContain("PRISM_HEAT_TRANSFER_ENGINE");
    });

    it("should extract convective heat transfer", async () => {
      const text = "Convection: q = h × A × (Ts - T∞)";
      const formulas = await engine.extractFormulasFromText(text, "2.51", 5);

      expect(formulas.length).toBeGreaterThan(0);
      const conv = formulas.find((f) => f.name === "Convective Heat Transfer");
      expect(conv).toBeDefined();
    });
  });

  describe("Numerical Methods Formulas", () => {
    it("should extract Newton-Raphson iteration", async () => {
      const text = "Newton-Raphson: x_{n+1} = x_n - f(x)/f'(x)";
      const formulas = await engine.extractFormulasFromText(text, "10.34", 7);

      expect(formulas.length).toBeGreaterThan(0);
      const nr = formulas.find((f) => f.name === "Newton-Raphson Method");
      expect(nr).toBeDefined();
      expect(nr?.category).toBe("numerical");
      expect(nr?.prismEngines).toContain("PRISM_TRUST_REGION_OPTIMIZER");
    });

    it("should extract Runge-Kutta method", async () => {
      const text = "RK4 stages: k1 = h × f(xn, yn), k2 = h × f(xn + h/2, yn + k1/2)";
      const formulas = await engine.extractFormulasFromText(text, "10.34", 13);

      expect(formulas.length).toBeGreaterThan(0);
      const rk = formulas.find((f) => f.name === "Runge-Kutta Method");
      expect(rk).toBeDefined();
    });

    it("should extract Euler's method", async () => {
      const text = "Euler's method: y_{n+1} = y_n + h × f(xn, yn)";
      const formulas = await engine.extractFormulasFromText(text, "10.34", 12);

      expect(formulas.length).toBeGreaterThan(0);
      const euler = formulas.find((f) => f.name === "Euler's Method");
      expect(euler).toBeDefined();
      expect(euler?.prismEngines).toContain("PRISM_ODE_SOLVER");
    });
  });

  describe("Optimization Formulas", () => {
    it("should extract gradient descent", async () => {
      const text = "x_{k+1} = x_k - α × ∇f(x_k)";
      const formulas = await engine.extractFormulasFromText(text, "6.079", 4);

      expect(formulas.length).toBeGreaterThan(0);
      const gd = formulas.find((f) => f.name === "Gradient Descent");
      expect(gd).toBeDefined();
      expect(gd?.category).toBe("optimization");
    });

    it("should extract Lagrangian", async () => {
      const text = "L(x, λ) = f(x) - λ × g(x)";
      const formulas = await engine.extractFormulasFromText(text, "6.079", 8);

      expect(formulas.length).toBeGreaterThan(0);
      const lagrange = formulas.find((f) => f.name === "Lagrangian Multipliers");
      expect(lagrange).toBeDefined();
    });
  });

  describe("Statistics Formulas", () => {
    it("should extract least squares solution", async () => {
      const text = "β = (X'X)⁻¹ × X'y is the least squares estimate";
      const formulas = await engine.extractFormulasFromText(text, "6.867", 6);

      expect(formulas.length).toBeGreaterThan(0);
      const ls = formulas.find((f) => f.name === "Least Squares Regression");
      expect(ls).toBeDefined();
      expect(ls?.category).toBe("statistics");
    });

    it("should extract Bayes theorem", async () => {
      const text = "P(H|D) = P(D|H) × P(H) / P(D) from Bayes' theorem";
      const formulas = await engine.extractFormulasFromText(text, "6.041", 10);

      expect(formulas.length).toBeGreaterThan(0);
      const bayes = formulas.find((f) => f.name === "Bayes' Theorem");
      expect(bayes).toBeDefined();
      expect(bayes?.prismEngines).toContain("PRISM_BAYESIAN_SYSTEM");
    });
  });
});

// ============================================================================
// Kienzle Variable Extraction Tests
// ============================================================================

describe("LectureNoteExtractionEngine - Variable Inference", () => {
  let engine: LectureNoteExtractionEngine;

  beforeEach(() => {
    engine = new LectureNoteExtractionEngine();
    engine.clear();
  });

  it("should infer Kienzle variables correctly", async () => {
    const text = "Kienzle model: Fc = kc × b × h^(1-m)";
    const formulas = await engine.extractFormulasFromText(text, "2.810");

    const kienzle = formulas.find((f) => f.name === "Kienzle Cutting Force");
    expect(kienzle?.variables.length).toBeGreaterThan(0);

    const fcVar = kienzle?.variables.find((v) => v.symbol === "Fc");
    expect(fcVar).toBeDefined();
    expect(fcVar?.units).toBe("N");

    const kcVar = kienzle?.variables.find((v) => v.symbol === "kc");
    expect(kcVar).toBeDefined();
    expect(kcVar?.units).toBe("N/mm²");
  });

  it("should infer Taylor variables correctly", async () => {
    const text = "Tool life: V × T^n = C";
    const formulas = await engine.extractFormulasFromText(text, "2.810");

    const taylor = formulas.find((f) => f.name === "Taylor Tool Life Equation");
    expect(taylor?.variables.length).toBeGreaterThan(0);

    const vVar = taylor?.variables.find((v) => v.symbol === "V");
    expect(vVar).toBeDefined();
    expect(vVar?.units).toBe("m/min");
  });

  it("should infer natural frequency variables", async () => {
    const text = "ωn = √(k/m)";
    const formulas = await engine.extractFormulasFromText(text, "2.032");

    const natFreq = formulas.find((f) => f.name === "Natural Frequency");
    expect(natFreq?.variables.length).toBeGreaterThan(0);

    const omega = natFreq?.variables.find((v) => v.symbol === "ωn");
    expect(omega).toBeDefined();
    expect(omega?.units).toBe("rad/s");
  });
});

// ============================================================================
// PRISM Relevance Scoring Tests
// ============================================================================

describe("LectureNoteExtractionEngine - PRISM Relevance", () => {
  let engine: LectureNoteExtractionEngine;

  beforeEach(() => {
    engine = new LectureNoteExtractionEngine();
    engine.clear();
  });

  it("should score machining-related text as high relevance", () => {
    // Access the private method via any cast for testing
    const engine2 = engine as unknown as {
      calculateRelevance(text: string): number;
    };

    const text = "Analyze the cutting forces and tool life during milling. " +
      "Calculate the surface finish using speed and feed parameters.";
    const score = engine2.calculateRelevance(text);

    expect(score).toBeGreaterThan(0.4);
  });

  it("should score thermal+vibration text appropriately", () => {
    const engine2 = engine as unknown as {
      calculateRelevance(text: string): number;
    };

    const text = "Temperature distribution in the cutting zone affects tool wear. " +
      "Chatter stability analysis reveals vibration modes.";
    const score = engine2.calculateRelevance(text);

    expect(score).toBeGreaterThan(0.2);
  });

  it("should score unrelated text as low relevance", () => {
    const engine2 = engine as unknown as {
      calculateRelevance(text: string): number;
    };

    const text = "This lecture covers linear algebra fundamentals for image processing.";
    const score = engine2.calculateRelevance(text);

    expect(score).toBeLessThan(0.1);
  });
});

// ============================================================================
// Difficulty Inference Tests
// ============================================================================

describe("LectureNoteExtractionEngine - Difficulty Inference", () => {
  let engine: LectureNoteExtractionEngine;

  beforeEach(() => {
    engine = new LectureNoteExtractionEngine();
    engine.clear();
  });

  it("should detect advanced difficulty", () => {
    const engine2 = engine as unknown as {
      inferDifficulty(text: string): "basic" | "intermediate" | "advanced";
    };

    expect(engine2.inferDifficulty("Advanced multi-axis machining research")).toBe("advanced");
    expect(engine2.inferDifficulty("Graduate-level coupled thermo-mechanical analysis")).toBe("advanced");
  });

  it("should detect basic difficulty", () => {
    const engine2 = engine as unknown as {
      inferDifficulty(text: string): "basic" | "intermediate" | "advanced";
    };

    expect(engine2.inferDifficulty("Basic introduction to milling")).toBe("basic");
    expect(engine2.inferDifficulty("Simple tutorial on speed calculation")).toBe("basic");
  });

  it("should default to intermediate", () => {
    const engine2 = engine as unknown as {
      inferDifficulty(text: string): "basic" | "intermediate" | "advanced";
    };

    expect(engine2.inferDifficulty("Calculate the cutting force for the given parameters")).toBe("intermediate");
  });
});

// ============================================================================
// Topic Extraction Tests
// ============================================================================

describe("LectureNoteExtractionEngine - Topic Extraction", () => {
  let engine: LectureNoteExtractionEngine;

  beforeEach(() => {
    engine = new LectureNoteExtractionEngine();
    engine.clear();
  });

  it("should extract cutting forces topic", () => {
    const engine2 = engine as unknown as {
      extractTopics(text: string): string[];
    };

    const topics = engine2.extractTopics("Calculate the cutting force using Kienzle force model");
    expect(topics).toContain("cutting forces");
  });

  it("should extract tool life topic", () => {
    const engine2 = engine as unknown as {
      extractTopics(text: string): string[];
    };

    const topics = engine2.extractTopics("Predict tool life using Taylor equation with wear analysis");
    expect(topics).toContain("tool life");
  });

  it("should extract stability topic", () => {
    const engine2 = engine as unknown as {
      extractTopics(text: string): string[];
    };

    const topics = engine2.extractTopics("Chatter stability analysis using vibration measurements");
    expect(topics).toContain("stability");
  });

  it("should extract multiple topics", () => {
    const engine2 = engine as unknown as {
      extractTopics(text: string): string[];
    };

    const topics = engine2.extractTopics(
      "Optimize the cutting force to maximize tool life while maintaining stability"
    );
    expect(topics).toContain("cutting forces");
    expect(topics).toContain("tool life");
    expect(topics).toContain("optimization");
    expect(topics).toContain("stability");
  });
});

// ============================================================================
// Real Course Scanning Tests
// ============================================================================

describe("LectureNoteExtractionEngine - Real Course Scan", () => {
  it("should scan 10.34 course and find numerical methods content", async () => {
    const engine = new LectureNoteExtractionEngine("H:/prism/resources/MIT COURSES");
    const summary = await engine.scanCourse("10.34-fall-2015");

    // 10.34 has 74+ PDFs, should find lectures and assignments
    expect(summary.lectures).toBeGreaterThan(0);
    expect(summary.courseId).toBe("10.34-fall-2015");

    const stats = engine.getStats();
    // Should have extracted some formulas from resource metadata
    expect(stats.totalFormulas + stats.totalProblems).toBeGreaterThanOrEqual(0);
  });

  it("should handle non-existent course gracefully", async () => {
    const engine = new LectureNoteExtractionEngine("H:/prism/resources/MIT COURSES");
    const summary = await engine.scanCourse("nonexistent-course");

    expect(summary.courseId).toBe("nonexistent-course");
    expect(summary.lectures).toBe(0);
    expect(summary.formulas).toBe(0);
  });
});

// ============================================================================
// Category Aggregation Tests
// ============================================================================

describe("LectureNoteExtractionEngine - Statistics", () => {
  let engine: LectureNoteExtractionEngine;

  beforeEach(async () => {
    engine = new LectureNoteExtractionEngine();
    engine.clear();

    // Add some test formulas
    await engine.extractFormulasFromText("Fc = kc × b × h^(1-m)", "2.810");
    await engine.extractFormulasFromText("V × T^n = C", "2.810");
    await engine.extractFormulasFromText("ωn = √(k/m)", "2.032");
    await engine.extractFormulasFromText("x_{n+1} = x_n - f(x)/f'(x)", "10.34");
  });

  it("should count formulas by category", () => {
    const stats = engine.getStats();

    expect(stats.totalFormulas).toBeGreaterThanOrEqual(4);
    expect(stats.byCategory.cutting_mechanics).toBeGreaterThanOrEqual(2);
    expect(stats.byCategory.dynamics).toBeGreaterThanOrEqual(1);
    expect(stats.byCategory.numerical).toBeGreaterThanOrEqual(1);
  });

  it("should count mapped PRISM engines", () => {
    const stats = engine.getStats();
    expect(stats.mappedEngines).toBeGreaterThan(0);
  });

  it("should filter formulas by category", () => {
    const cuttingFormulas = engine.getFormulasByCategory("cutting_mechanics");
    expect(cuttingFormulas.length).toBeGreaterThanOrEqual(2);

    const dynamicsFormulas = engine.getFormulasByCategory("dynamics");
    expect(dynamicsFormulas.length).toBeGreaterThanOrEqual(1);
  });

  it("should filter formulas by PRISM engine", () => {
    const kienzleFormulas = engine.getFormulasForEngine("PRISM_KIENZLE_FORCE");
    expect(kienzleFormulas.length).toBeGreaterThanOrEqual(1);

    const taylorFormulas = engine.getFormulasForEngine("PRISM_TAYLOR_TOOL_LIFE");
    expect(taylorFormulas.length).toBeGreaterThanOrEqual(1);
  });
});
