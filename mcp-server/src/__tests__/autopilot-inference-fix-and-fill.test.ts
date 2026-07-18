/**
 * Dormant reasoning subsystem -- fix + fill gaps
 * (FREE-AI-MIGRATION/U-REASONING-FIX-AND-FILL, slot:india).
 *
 * Closes the three verified defects in the (previously dormant) reasoning orchestration layer that
 * sits on top of the now-free Ollama-first parallelAPICalls substrate:
 *
 *  BUG 1 -- AutoPilot.brainstorm (prism_autopilot_d:brainstorm_lenses): the dispatcher called a
 *    NON-EXISTENT ap.brainstorm() and threw on every invocation. A real public brainstorm(problem,
 *    context) now wraps the private brainstormReal, and the brainstorm gate no longer requires an
 *    ANTHROPIC_API_KEY -- so a keyless run does the REAL 7-lens brainstorm for free.
 *
 *  BUG 2 -- AutoPilotV2.generatePlan: referenced WORKING_TOOLS.calculations / WORKING_TOOLS.data,
 *    keys that DO NOT EXIST (-> undefined.slice -> TypeError on every plan-gen for calculation /
 *    data_lookup tasks). Both now point at the real `manufacturing` bucket (holds prism_data +
 *    prism_calc).
 *
 *  GAP -- prism_ai:inference_chain_run was a discovery-only stub (listChainTypes); it now executes a
 *    real multi-step chain via runInferenceChain when `steps` are provided, keeping discovery as the
 *    no-steps fallback.
 *
 * Hermetic: LLMEngine net-disables under VITEST (returns model:"offline" deterministically), so every
 * assertion here runs with zero network and is R12-honest (offline degrades to empty / "partial", never
 * fabricated output). Deleting ANTHROPIC_API_KEY models the keyless "free at launch" scenario; the
 * no-network guarantee comes from the VITEST LLMEngine offline guard, not from the key deletion.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { AutoPilot } from "../orchestration/AutoPilot.js";
import { runAutoPilotV2 } from "../orchestration/AutoPilotV2.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";
import { llmEngine } from "../engines/LLMEngine.js";

let savedKey: string | undefined;

beforeAll(() => {
  savedKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY; // the "free at launch" scenario (no Claude key)
});

afterEach(() => { vi.restoreAllMocks(); });

afterAll(() => {
  if (savedKey !== undefined) process.env.ANTHROPIC_API_KEY = savedKey;
});

describe("BUG 1 -- AutoPilot.brainstorm (was a non-existent method that threw)", () => {
  it("exists + is callable + returns the 7-lens BrainstormResult shape (no throw); reaches the free substrate", async () => {
    const ap = new AutoPilot();
    const spy = vi.spyOn(llmEngine, "query"); // call through -> offline under VITEST
    // Pre-fix this threw "ap.brainstorm is not a function". Post-fix it resolves with a real result.
    const r: any = await ap.brainstorm("optimize titanium roughing strategy", {});
    // WIRING PROOF: the brainstorm gate dropped its `!hasValidApiKey()` clause, so a keyless run no
    // longer short-circuits to the basic stub -- it actually fires the 7 parallel lens calls.
    expect(spy).toHaveBeenCalledTimes(7);
    expect(r.lensesApplied).toHaveLength(7);
    // Result shape the dispatcher destructures must all be present (arrays + synthesized approach).
    expect(Array.isArray(r.assumptions)).toBe(true);
    expect(Array.isArray(r.alternatives)).toBe(true);
    expect(Array.isArray(r.simplifications)).toBe(true);
    expect(r).toHaveProperty("optimizedApproach");
    expect(r).toHaveProperty("formulaUsed");
    // Offline -> every lens errors -> empty arrays + 0 successful calls (R12: no fabricated insight).
    expect(r.apiCalls).toBe(0);
    expect(r.assumptions).toHaveLength(0);
  });

  it("populates the lens arrays from a real free answer (Ollama-style success)", async () => {
    const ap = new AutoPilot();
    vi.spyOn(llmEngine, "query").mockResolvedValue({
      answer: '["insight one","insight two"]',
      context_used: [],
      model: "qwen2.5-coder:32b (ollama)",
      tokens_used: { input: 5, output: 10 },
      duration_ms: 3,
      cached: false,
    });
    const r: any = await ap.brainstorm("optimize titanium roughing", {});
    // All 7 lenses parsed the JSON array -> assumptions (lens 0) carries the parsed insights.
    expect(r.assumptions).toEqual(["insight one", "insight two"]);
    expect(r.apiCalls).toBe(7);
    // synthesizeApproach pulls from the populated lens arrays (simplifications lead).
    expect(r.optimizedApproach).toContain("Simplest");
  });
});

describe("BUG 2 -- AutoPilotV2.generatePlan (threw TypeError on a non-existent WORKING_TOOLS key)", () => {
  it("calculation task: plan-gen no longer throws; gather phase uses real manufacturing tools", async () => {
    // Pre-fix: generatePlan ran WORKING_TOOLS.calculations.slice -> TypeError -> execute() rejected.
    const result = await runAutoPilotV2("calculate cutting force for 4140 steel");
    const gather = result.plan.phases.find(p => p.id === "gather");
    expect(gather?.name).toBe("Gather Parameters");
    const tools = (gather?.tools || []).map(t => t.tool);
    expect(tools).toContain("prism:prism_data");
    expect(tools).toContain("prism:prism_calc");
  });

  it("data_lookup task: lookup phase resolves with the prism_data tool (was a crash)", async () => {
    const result = await runAutoPilotV2("look up material 4140 properties");
    const lookup = result.plan.phases.find(p => p.id === "lookup");
    expect(lookup?.name).toBe("Data Lookup");
    const tools = (lookup?.tools || []).map(t => t.tool);
    expect(tools).toContain("prism:prism_data");
  });
});

describe("GAP -- prism_ai:inference_chain_run (was a discovery-only stub, now a real executor)", () => {
  it("no steps: returns the discovery fallback (chain_types + guidance note)", async () => {
    const res: any = await executeAIReasoningAction("inference_chain_run", {});
    expect(res.success).toBe(true);
    expect(res.data.mode).toBe("discovery");
    expect(Array.isArray(res.data.chain_types)).toBe(true);
    expect(res.data.chain_types.length).toBeGreaterThanOrEqual(1);
    expect(res.data.note).toMatch(/steps/i);
    // Discovery fallback must NOT carry a chain-execution status.
    expect(res.data).not.toHaveProperty("status");
  });

  it("with steps: executes the real chain via runInferenceChain (a free Ollama-style answer completes it)", async () => {
    // A real free answer for the single step -> the chain completes (status "completed", 1 step done).
    // This proves the executor REALLY runs the chain through the free substrate, not the discovery stub.
    vi.spyOn(llmEngine, "query").mockResolvedValue({
      answer: "Problem class: thin-wall chatter.",
      context_used: [],
      model: "qwen2.5-coder:32b (ollama)",
      tokens_used: { input: 8, output: 16 },
      duration_ms: 4,
      cached: false,
    });
    const res: any = await executeAIReasoningAction("inference_chain_run", {
      steps: [{ name: "classify", prompt_template: "Classify the manufacturing problem.", model_tier: "haiku" }],
      input: {},
    });
    expect(res.success).toBe(true);
    // The REAL executor returns an InferenceChainResult, NOT the discovery stub's chain_types list.
    // status "completed" + the step's free answer in final_output is conclusive proof the chain ran
    // end-to-end (the stub can produce neither). (steps_completed is dropped by the response slimmer;
    // the engine's own runInferenceChain step-counter coverage lives in inference-chain-llm-wire.test.)
    expect(res.data.mode).toBe("execute");
    expect(res.data).not.toHaveProperty("chain_types");
    expect(res.data.status).toBe("completed");
    expect(res.data.final_output).toContain("thin-wall chatter");
  });
});
