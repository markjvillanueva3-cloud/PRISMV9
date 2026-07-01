/**
 * aiReasoningDispatcher.explain.test.ts — XAI explanation surface,
 * wired through prism_ai (U-WIRE10).
 *
 * Covers 3 actions on ReasoningExplainerEngine:
 *   - reasoning_explain         → explain(request) → Explanation
 *   - reasoning_explain_formula → explainFormula(formula, audience) → string
 *   - reasoning_reading_level   → getReadingLevelLabel(grade) → label
 *
 * Reference values come from the engine's own constant tables
 * (FORMULA_EXPLANATIONS map and reading-level threshold table at
 * grade ≤6/≤10/≤14/>14). Variability per group: three spanning
 * audiences for explain, three different formulas for explainFormula,
 * four reading-level grade bands.
 *
 * @milestone WIRE-MS0/U-WIRE10
 */

import { describe, it, expect } from "vitest";

import {
  executeAIReasoningAction,
  type AIReasoningAction,
} from "../tools/dispatchers/aiReasoningDispatcher.js";

async function invoke(
  action: AIReasoningAction,
  params: Record<string, unknown> = {},
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  return executeAIReasoningAction(action, params);
}

// ── ai_explain ───────────────────────────────────────────────────────────────

describe("aiReasoningDispatcher — ai_explain (Explanation generation)", () => {
  it("emits a recommendation explanation with summary, sections, citations, ID", async () => {
    const out = await invoke("reasoning_explain", {
      question: "Why are you recommending VC carbide for D2 tool steel?",
      audience: "machinist",
      context: {
        recommendation: "VC carbide insert with TiAlN coating, 80 m/min Vc",
      },
    });
    expect(out.success).toBe(true);
    const exp = out.data as {
      id: string; target: string; audience: string; summary: string;
      sections: Array<{ heading: string; content: string }>;
      citations: unknown[]; wordCount: number; readingLevelGrade: number;
      createdAt: string;
    };
    // ID prefix anchored to engine implementation
    expect(exp.id).toMatch(/^exp_\d+_[a-z0-9]+$/);
    expect(exp.audience).toBe("machinist");
    expect(exp.summary.length).toBeGreaterThan(0);
    expect(exp.wordCount).toBeGreaterThan(0);
    expect(exp.wordCount).toBeLessThanOrEqual(150); // machinist limit
    expect(exp.readingLevelGrade).toBeGreaterThanOrEqual(0);
    expect(typeof exp.createdAt).toBe("string");
    expect(exp.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("variability: engineer audience gets a 300-word ceiling vs machinist 150", async () => {
    const machinist = await invoke("reasoning_explain", {
      question: "Why use HSM for this pocket?",
      audience: "machinist",
      context: { recommendation: "Use trochoidal HSM strategy" },
    });
    const engineer = await invoke("reasoning_explain", {
      question: "Why use HSM for this pocket?",
      audience: "engineer",
      context: { recommendation: "Use trochoidal HSM strategy" },
    });
    const m = machinist.data as { wordCount: number; audience: string };
    const e = engineer.data as { wordCount: number; audience: string };
    expect(m.audience).toBe("machinist");
    expect(e.audience).toBe("engineer");
    expect(m.wordCount).toBeLessThanOrEqual(150);
    expect(e.wordCount).toBeLessThanOrEqual(300);
  });

  it("variability: auditor audience produces explanation up to 500 words", async () => {
    const out = await invoke("reasoning_explain", {
      question: "Justify the speed/feed values for compliance.",
      audience: "auditor",
      context: {
        calculation: {
          formula: "Fc = kc1.1 × ap × fz^(1-mc)",
          inputs: { kc11: 1800, ap: 2, fz: 0.1 },
          result: 320.5,
          unit: "N",
          source: "KienzleForceModel:P-group",
        },
      },
    });
    const exp = out.data as { audience: string; wordCount: number };
    expect(exp.audience).toBe("auditor");
    expect(exp.wordCount).toBeLessThanOrEqual(500);
  });

  it("respects custom maxWords override", async () => {
    const out = await invoke("reasoning_explain", {
      question: "Quick answer please.",
      audience: "engineer",
      maxWords: 50,
      context: { recommendation: "Use coolant flood" },
    });
    const exp = out.data as { wordCount: number };
    expect(exp.wordCount).toBeLessThanOrEqual(50);
  });

  it("Zod rejects empty question (boundary)", async () => {
    const out = await invoke("reasoning_explain", {
      question: "",
      context: { recommendation: "x" },
    });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/question/i);
  });

  it("Zod rejects unknown audience enum (adversarial)", async () => {
    const out = await invoke("reasoning_explain", {
      question: "Why?",
      audience: "robot",
      context: { recommendation: "x" },
    });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/audience/i);
  });

  it("Zod rejects maxWords > 2000 (range cap)", async () => {
    const out = await invoke("reasoning_explain", {
      question: "Why?",
      maxWords: 5000,
      context: { recommendation: "x" },
    });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/maxWords/i);
  });
});

// ── ai_explain_formula ──────────────────────────────────────────────────────

describe("aiReasoningDispatcher — ai_explain_formula (formula simplifier)", () => {
  it("known Kienzle formula returns canonical plain-language explanation", async () => {
    const out = await invoke("reasoning_explain_formula", {
      formula: "Fc = kc1.1 × ap × fz^(1-mc)",
      audience: "machinist",
    });
    expect(out.success).toBe(true);
    const data = out.data as { formula: string; audience: string; explanation: string };
    expect(data.formula).toBe("Fc = kc1.1 × ap × fz^(1-mc)");
    expect(data.audience).toBe("machinist");
    // Engine simplifies vocabulary for machinist audience —
    // "depth of cut" → "how deep we're cutting", so we check for "deep"
    // rather than "depth". "material" and "feed" survive the rewrite.
    expect(data.explanation).toMatch(/material/i);
    expect(data.explanation).toMatch(/deep/i);
    expect(data.explanation).toMatch(/feed/i);
  });

  it("known Taylor formula explains tool-life vs speed inverse relationship", async () => {
    const out = await invoke("reasoning_explain_formula", {
      formula: "T = (C/Vc)^(1/n)",
    });
    const data = out.data as { explanation: string };
    expect(data.explanation).toMatch(/tool life/i);
    expect(data.explanation).toMatch(/speed/i);
  });

  it("known surface-finish formula references feed and tool radius", async () => {
    const out = await invoke("reasoning_explain_formula", {
      formula: "Ra = (fz^2) / (32 × r)",
      audience: "engineer",
    });
    const data = out.data as { explanation: string };
    expect(data.explanation).toMatch(/feed/i);
    expect(data.explanation).toMatch(/radius/i);
  });

  it("unknown formula returns the generic fallback string with the formula echoed", async () => {
    const out = await invoke("reasoning_explain_formula", {
      formula: "U10_unknown_formula = x + y",
    });
    const data = out.data as { explanation: string };
    // Engine fallback: "This formula (X) calculates a key machining parameter."
    expect(data.explanation).toMatch(/U10_unknown_formula = x \+ y/);
    expect(data.explanation).toMatch(/calculates a key/i);
  });

  it("Zod rejects empty formula (boundary)", async () => {
    const out = await invoke("reasoning_explain_formula", { formula: "" });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/formula/i);
  });

  it("Zod rejects unknown audience (adversarial)", async () => {
    const out = await invoke("reasoning_explain_formula", {
      formula: "Fc = kc1.1 × ap × fz^(1-mc)",
      audience: "child",
    });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/audience/i);
  });
});

// ── ai_reading_level_label ──────────────────────────────────────────────────

describe("aiReasoningDispatcher — ai_reading_level_label (FK grade → label)", () => {
  it("variability: grade 5 → 'Easy to read' (≤6 band)", async () => {
    const out = await invoke("reasoning_reading_level", { grade: 5 });
    const data = out.data as { grade: number; label: string };
    expect(data.grade).toBe(5);
    expect(data.label).toBe("Easy to read");
  });

  it("variability: grade 8 → 'Moderate' (>6, ≤10 band)", async () => {
    const out = await invoke("reasoning_reading_level", { grade: 8 });
    expect((out.data as { label: string }).label).toBe("Moderate");
  });

  it("variability: grade 12 → 'Technical' (>10, ≤14 band)", async () => {
    const out = await invoke("reasoning_reading_level", { grade: 12 });
    expect((out.data as { label: string }).label).toBe("Technical");
  });

  it("variability: grade 18 → 'Expert level' (>14 band)", async () => {
    const out = await invoke("reasoning_reading_level", { grade: 18 });
    expect((out.data as { label: string }).label).toBe("Expert level");
  });

  it("boundary: grade 6 → 'Easy to read' (inclusive ≤6)", async () => {
    const out = await invoke("reasoning_reading_level", { grade: 6 });
    expect((out.data as { label: string }).label).toBe("Easy to read");
  });

  it("boundary: grade 6.01 → 'Moderate' (open >6)", async () => {
    const out = await invoke("reasoning_reading_level", { grade: 6.01 });
    expect((out.data as { label: string }).label).toBe("Moderate");
  });

  it("Zod rejects non-finite grade (NaN adversarial)", async () => {
    const out = await invoke("reasoning_reading_level", { grade: Number.NaN });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/grade/i);
  });

  it("Zod rejects Infinity grade (adversarial)", async () => {
    const out = await invoke("reasoning_reading_level", {
      grade: Number.POSITIVE_INFINITY,
    });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/grade/i);
  });
});
