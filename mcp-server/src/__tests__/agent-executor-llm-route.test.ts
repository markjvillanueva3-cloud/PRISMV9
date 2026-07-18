/**
 * AgentExecutor LLM-route migration test (FREE-AI-MIGRATION/U-AGENT-EXECUTOR-LLM-ROUTE, slot:india).
 *
 * Verifies AgentExecutor.executeWithClaudeAPI was migrated from a DIRECT paid Anthropic SDK call
 * (`new Anthropic(...).messages.create`) to the free Ollama-first llmEngine substrate. Under
 * VITEST, llmEngine's test-hermeticity guard disables both default provider paths -> the substrate
 * returns its deterministic OFFLINE response. AgentExecutor's contract is "no simulation"
 * (safety-critical manufacturing), so an offline stub is NOT a real agent run -> executeWithClaudeAPI
 * THROWS (R12); executeTask catches it and returns a TaskResult with status:"failed".
 *
 * Three properties are proven through the REAL public entry point (executeAgent -> createTask ->
 * executeTask -> executeWithClaudeAPI), driven by a genuine built-in agent from the registry:
 *  1. ROUTING -- the failure error is the ladder-exhausted "No AI provider available" message,
 *     reachable only via the llmEngine offline path. The OLD SDK call would have thrown a network
 *     error, never this message -> the test fails on revert.
 *  2. SEAM FIX -- the pre-call `if(!hasValidApiKey()) throw "ANTHROPIC_API_KEY required..."` gate was
 *     removed; the error is NOT that old key-gate message.
 *  3. R12 NO-SIMULATION -- the offline result is FAILED with "Simulation/stub ... DISABLED", never a
 *     mode:"live" stub returned as a completed agent run.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { executeAgent } from "../engines/AgentExecutor.js";
import { agentRegistry } from "../registries/AgentRegistry.js";

// Built-in agents loaded by the AgentRegistry constructor (verified live: 9 built-ins).
const MATERIALS_AGENT = "AGT-EXPERT-MATERIALS";
const MACHINES_AGENT = "AGT-EXPERT-MACHINES";

// Make revert-detection environment-independent: with no ANTHROPIC_API_KEY, a REVERTED key-gate
// would surface "ANTHROPIC_API_KEY required" (failing the assertions below, as it must on revert).
// Saved/restored so the mutation never leaks to other test files in the same worker.
let savedKey: string | undefined;
beforeAll(() => { savedKey = process.env.ANTHROPIC_API_KEY; delete process.env.ANTHROPIC_API_KEY; });
afterAll(() => { if (savedKey !== undefined) process.env.ANTHROPIC_API_KEY = savedKey; });

describe("AgentExecutor -> free llmEngine substrate (routing + R12 no-simulation)", () => {
  it("the chosen agent is a real registered built-in (pre-req for the round-trip)", () => {
    const agent = agentRegistry.get(MATERIALS_AGENT);
    expect(agent?.name).toBe("Materials Expert"); // concrete reference value from the registry
  });

  it("routes agent execution through llmEngine; offline -> FAILED with the no-provider error (R12)", async () => {
    // retries:0 -> single attempt, no retry backoff delay; under hermeticity executeWithClaudeAPI
    // throws the offline error -> executeTask returns a failed TaskResult.
    const result = await executeAgent(MATERIALS_AGENT, { material: "4140 steel" }, { retries: 0 });
    expect(result.status).toBe("failed");
    // routed through llmEngine: offline (no provider) -> the migrated throw, not an SDK network error.
    expect(String(result.error)).toMatch(/No AI provider available/i);
    // R12 "no simulation" contract is enforced for safety-critical manufacturing.
    expect(String(result.error)).toMatch(/Simulation.*DISABLED/i);
    // the OLD pre-call key gate is gone (seam fix): it would have said "ANTHROPIC_API_KEY required".
    expect(String(result.error)).not.toMatch(/ANTHROPIC_API_KEY required/);
    // never a completed/live stub on an offline provider.
    expect(result.status).not.toBe("completed");
  });

  it("a second built-in agent is also offline-honest (variability across agents)", async () => {
    const agent = agentRegistry.get(MACHINES_AGENT);
    expect(agent?.name).toBe("Machine Expert");
    const result = await executeAgent(MACHINES_AGENT, { machine: "VMC-01" }, { retries: 0 });
    expect(result.status).toBe("failed");
    expect(String(result.error)).toMatch(/No AI provider available/i);
  });
});
