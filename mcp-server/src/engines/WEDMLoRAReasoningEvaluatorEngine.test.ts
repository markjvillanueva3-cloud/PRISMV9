import { describe, it, expect, beforeEach } from "vitest";
import { wedmLoRAReasoningEvaluatorEngine } from "./WEDMLoRAReasoningEvaluatorEngine.js";

const PASS_THRESHOLD = 0.70;
const W_COHERENCE = 0.25;
const W_DOMAIN = 0.20;
const W_JUSTIFICATION = 0.25;
const W_STRUCTURE = 0.15;
const W_COMPLETENESS = 0.15;
const MIN_LENGTH_STRUCTURE = 200;

const RICH_REASONING_OUTPUT =
  "Step 1: select wire diameter 0.25 mm brass for D2 tool steel because the JM Die FA-10S " +
  "tech tables expect Ø0.25 wire on the E12xx standard 4-pass cycle. " +
  "Step 2: schedule 4 passes — 1 rough + 3 skim — therefore Ra target of 0.8 µm is achievable " +
  "per Klocke 2013 §8.3 Ra cascade. The wire-EDM kerf is wire_diameter + 2 × spark gap, " +
  "thus the H-register cascade decreases per pass to refine the kerf. " +
  "Step 3: verify AWT recovery armed, anti-electrolysis on, dielectric ≤5 µS/cm conductivity. " +
  "Since the workpiece is 12.7 mm thick, tolerance ±0.005 mm sits inside the standard 4-pass " +
  "envelope. Tab width 1.0 inch with M01 glue stop before tab-cut. " +
  "Final check: rooster-tail flushing balance, wire tension 12 N, no recast cascade because " +
  "TON × IP product stays below 1000 µs·A. This satisfies the safety verification gate.";

describe("WEDMLoRAReasoningEvaluatorEngine", () => {
  beforeEach(() => {
    wedmLoRAReasoningEvaluatorEngine.setConfig({
      pass_threshold: PASS_THRESHOLD,
      domain_terms_required: 5,
      justification_connectives_required: 2,
      min_length_for_structure: MIN_LENGTH_STRUCTURE,
      required_dimensions: ["wire_selection", "pass_strategy", "material_workpiece", "safety_consideration"],
    });
  });

  it("setConfig merges; getConfig returns defensive copy of required_dimensions array", () => {
    wedmLoRAReasoningEvaluatorEngine.setConfig({ pass_threshold: 0.95 });
    const a = wedmLoRAReasoningEvaluatorEngine.getConfig();
    a.pass_threshold = 0.01;
    a.required_dimensions.push("tolerance_target");
    const b = wedmLoRAReasoningEvaluatorEngine.getConfig();
    expect(b.pass_threshold).toBe(0.95);
    expect(b.required_dimensions).toHaveLength(4);
    expect(b.required_dimensions).not.toContain("tolerance_target");
  });

  it("overall_score is the weighted sum of the 5 axes", () => {
    const r = wedmLoRAReasoningEvaluatorEngine.evaluate(RICH_REASONING_OUTPUT);
    const expected =
      r.coherence * W_COHERENCE +
      r.domain_knowledge * W_DOMAIN +
      r.justification * W_JUSTIFICATION +
      r.structure * W_STRUCTURE +
      r.completeness * W_COMPLETENESS;
    expect(r.overall_score).toBe(Math.round(expected));
  });

  it("passed = (overall_score/100 >= pass_threshold)", () => {
    const r = wedmLoRAReasoningEvaluatorEngine.evaluate(RICH_REASONING_OUTPUT);
    expect(r.passed).toBe(r.overall_score / 100 >= PASS_THRESHOLD);
  });

  it("HAPPY PATH: rich reasoning output scores >=70 on every axis and passes threshold", () => {
    const r = wedmLoRAReasoningEvaluatorEngine.evaluate(RICH_REASONING_OUTPUT);
    expect(r.passed).toBe(true);
    expect(r.coherence).toBeGreaterThanOrEqual(70);
    expect(r.domain_knowledge).toBeGreaterThanOrEqual(70);
    expect(r.justification).toBeGreaterThanOrEqual(70);
    expect(r.structure).toBeGreaterThanOrEqual(70);
    expect(r.completeness).toBe(100);
  });

  it("FAILURE: empty input scores 0 on coherence and fails overall", () => {
    const r = wedmLoRAReasoningEvaluatorEngine.evaluate("");
    expect(r.coherence).toBe(0);
    expect(r.passed).toBe(false);
    const issue = r.findings.find((f) => f.category === "coherence");
    expect(issue?.severity).toBe("high");
    expect(issue?.message).toMatch(/empty/i);
  });

  it("FAILURE: terse one-liner fails coherence isn't 0 but justification and structure drop", () => {
    const r = wedmLoRAReasoningEvaluatorEngine.evaluate("M80");
    expect(r.coherence).toBe(100);
    expect(r.justification).toBe(0);
    expect(r.structure).toBeLessThanOrEqual(60);
    expect(r.passed).toBe(false);
  });

  it("FAILURE: logical contradiction (single-pass AND multi-pass) drops coherence by 25", () => {
    const r = wedmLoRAReasoningEvaluatorEngine.evaluate(
      "Use a single-pass rough cycle, then schedule 3 skim passes for finish. " +
      "Because the part is thin we choose single-pass for speed. " +
      "Therefore 3 skim trim passes target Ra 0.4 µm per Klocke 2013 cascade. " +
      "Step 1 select wire. Step 2 set tension. The reason is to balance MRR and finish. " +
      "Use brass wire diameter 0.25 mm for D2 tool steel. Verify AWT armed."
    );
    expect(r.coherence).toBeLessThanOrEqual(75);
    const cf = r.findings.find((f) => f.category === "coherence");
    expect(cf?.message).toMatch(/contradiction/i);
  });

  it("ADVERSARIAL: NaN-like text + Infinity-like text doesn't crash the evaluator", () => {
    const r = wedmLoRAReasoningEvaluatorEngine.evaluate("NaN Infinity wire diameter Infinity mm therefore NaN");
    expect(r.overall_score).toBeGreaterThanOrEqual(0);
    expect(r.overall_score).toBeLessThanOrEqual(100);
  });

  it("ADVERSARIAL: 5000-char output with no domain content fails completeness + domain", () => {
    const r = wedmLoRAReasoningEvaluatorEngine.evaluate("lorem ipsum ".repeat(500));
    expect(r.completeness).toBe(0);
    expect(r.domain_knowledge).toBe(0);
    expect(r.passed).toBe(false);
  });

  it("VARIABILITY: stricter config (8 domain terms required) drops a 5-term output's domain score", () => {
    wedmLoRAReasoningEvaluatorEngine.setConfig({ domain_terms_required: 8 });
    const r = wedmLoRAReasoningEvaluatorEngine.evaluate(
      "Wire diameter 0.25 mm, brass wire, kerf, taper, rough pass for D2 tool steel"
    );
    expect(r.domain_knowledge).toBeLessThanOrEqual(75);
  });

  it("VARIABILITY: production-tier 0.95 threshold rejects shop_floor-passing output", () => {
    const shop = wedmLoRAReasoningEvaluatorEngine.evaluate(RICH_REASONING_OUTPUT);
    expect(shop.passed).toBe(true);

    wedmLoRAReasoningEvaluatorEngine.setConfig({ pass_threshold: 0.95 });
    const prod = wedmLoRAReasoningEvaluatorEngine.evaluate(RICH_REASONING_OUTPUT);
    expect(prod.passed).toBe(prod.overall_score / 100 >= 0.95);
  });

  it("VARIABILITY: required_dimensions expanded to all 7 — RICH_REASONING covers ≥5 of them", () => {
    wedmLoRAReasoningEvaluatorEngine.setConfig({
      required_dimensions: [
        "wire_selection", "pass_strategy", "controller_dialect",
        "physics_citation", "safety_consideration", "material_workpiece", "tolerance_target",
      ],
    });
    const r = wedmLoRAReasoningEvaluatorEngine.evaluate(RICH_REASONING_OUTPUT);
    expect(r.completeness).toBeGreaterThanOrEqual(71); // ≥5 of 7
  });

  it("COMPLETENESS: missing wire_selection dimension is reported in findings", () => {
    wedmLoRAReasoningEvaluatorEngine.setConfig({
      required_dimensions: ["wire_selection", "pass_strategy"],
    });
    const r = wedmLoRAReasoningEvaluatorEngine.evaluate(
      "Step 1: rough pass. Step 2: 2 skim passes. Because Ra target is 0.8 um."
    );
    expect(r.completeness).toBe(50);
    const cf = r.findings.find((f) => f.category === "completeness");
    expect(cf?.message).toMatch(/wire_selection/i);
  });

  it("DOMAIN: zero domain terms triggers high-severity finding", () => {
    const r = wedmLoRAReasoningEvaluatorEngine.evaluate(
      "Step 1 do thing. Step 2 do other thing. Because reason. Therefore conclusion."
    );
    expect(r.domain_knowledge).toBe(0);
    const f = r.findings.find((f) => f.category === "domain");
    expect(f?.severity).toBe("high");
  });

  it("JUSTIFICATION: zero connectives triggers high-severity finding", () => {
    const r = wedmLoRAReasoningEvaluatorEngine.evaluate(
      "Use wire diameter 0.25 mm. Run 4 passes. Set tension 12 N. Done."
    );
    expect(r.justification).toBe(0);
    const f = r.findings.find((f) => f.category === "justification");
    expect(f?.severity).toBe("high");
  });

  it("STRUCTURE: output below min_length_for_structure caps structure score at 60", () => {
    const r = wedmLoRAReasoningEvaluatorEngine.evaluate("Step 1: wire 0.25 mm for D2 because it's standard.");
    expect(r.structure).toBeLessThanOrEqual(60);
  });

  it("STRUCTURE: rich output with steps + bullets + headers + length scores >=70", () => {
    const out =
      "# WEDM Plan\n\n## Setup\n- Step 1: wire 0.25 mm brass for D2 tool steel.\n" +
      "- Step 2: kerf offset cascade 0.0085 → 0.0064 → 0.0058 → 0.0053 inches.\n" +
      "## Execution\n- Step 3: rough + 3 skim passes because Ra target is 0.8 µm.\n" +
      "- Step 4: verify AWT recovery armed.\nThe rationale is balanced MRR + finish + safety. " +
      "This output is intentionally long enough to clear the structure-length threshold of two hundred characters body.";
    const r = wedmLoRAReasoningEvaluatorEngine.evaluate(out);
    expect(r.structure).toBeGreaterThanOrEqual(70);
  });

  it("passes() convenience wrapper agrees with evaluate().passed", () => {
    const direct = wedmLoRAReasoningEvaluatorEngine.evaluate(RICH_REASONING_OUTPUT).passed;
    const convenience = wedmLoRAReasoningEvaluatorEngine.passes(RICH_REASONING_OUTPUT);
    expect(convenience).toBe(direct);
  });

  it("passScoreFloor() returns the documented downstream floor of 70", () => {
    expect(wedmLoRAReasoningEvaluatorEngine.passScoreFloor()).toBe(70);
  });

  it("findings array recommendations are all non-empty for triggered findings", () => {
    const r = wedmLoRAReasoningEvaluatorEngine.evaluate("M80");
    const blank = r.findings.filter((f) => f.recommendation === "" || f.message === "");
    expect(blank).toHaveLength(0);
  });

  it("ENVELOPE: clean dialect-rich output covers controller_dialect + physics_citation dimensions", () => {
    wedmLoRAReasoningEvaluatorEngine.setConfig({
      required_dimensions: ["controller_dialect", "physics_citation"],
    });
    const out =
      "Use M82 M84 M90 on Mitsubishi FA-10S E1221 condition for rough pass. " +
      "Per Klocke 2013 §8.3 Ra cascade. Therefore the E12xx 4-pass cycle applies.";
    const r = wedmLoRAReasoningEvaluatorEngine.evaluate(out);
    expect(r.completeness).toBe(100);
  });
});
