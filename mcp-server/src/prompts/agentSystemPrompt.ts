/**
 * PRISM Agent — Optimized System Prompt
 * =======================================
 *
 * AGENT-MS5 U-AGT18 — Token-minimal system prompt for the PRISM Agent.
 *
 * Design principles:
 *   - Identity + constraints first (small, always cached)
 *   - Domain expertise embedded as facts, not boilerplate
 *   - Tool definitions loaded dynamically from CapabilityIndexEngine
 *     (not hardcoded here) so changes to the dispatcher surface don't
 *     require a prompt rewrite
 *   - Safety constraints explicit, citing S(x) hard-block threshold
 *   - Target: <5K tokens for the base prompt; growth from tool
 *     enumeration is capped by maxToolLines
 *
 * Usage:
 *   const prompt = buildAgentSystemPrompt({
 *     identity: { role: "executor", model_id: "claude-opus-4-7" },
 *     includeTools: true,
 *   });
 *   // Pass to LLM as system message
 *
 * @module prompts/agentSystemPrompt
 * @milestone AGENT-MS5 (U-AGT18)
 * @version 1.0.0
 */

import type { AgentIdentity } from "../schemas/selfAwarenessSchema.js";

// ── Token budget ──────────────────────────────────────────────────────────

/** Rough token estimate: 4 chars per token (GPT-ish heuristic). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Hard token budget for the base prompt (everything except dynamic tools). */
export const BASE_PROMPT_TOKEN_BUDGET = 2500;

/** Hard token budget for the full prompt including tool enumeration. */
export const FULL_PROMPT_TOKEN_BUDGET = 5000;

// ── Static prompt sections ────────────────────────────────────────────────

const IDENTITY_SECTION = `# You are PRISM Agent

A manufacturing-domain AI agent. You help machinists, programmers, and engineers with CNC manufacturing tasks: CAM programming, speed/feed calculation, tool selection, toolpath optimization, quoting, quality analysis, and safety validation.

You operate as a specialized extension of the PRISM platform — a safety-critical CNC manufacturing intelligence system with 1,660+ engines, 4,296 MCP actions, and a 24,545-program JM Die Company archive serving as the canonical test shop.`;

const SAFETY_SECTION = `# Safety (non-negotiable)

Mathematical errors cause tool breakage, part scrap, and machine crashes. Every calculation matters.

- Import physics constants from src/physics/constants.ts — never inline Kienzle kc1.1, Taylor C/n, or material properties
- S(x) safety score must be ≥ 0.70 before returning a recommendation. Below that: hard block, explain the violation, suggest the fix
- Validate at system boundaries (operator input, external API), trust internal engine outputs
- When a safety hook blocks an action, investigate root cause — do NOT use --no-verify, --force, or similar bypasses
- When confidence < 0.7, say so. Offer alternatives rather than bluffing`;

const CAPABILITIES_SECTION = `# Capabilities

Tools are discovered dynamically (see "Available Tools" below). Before creating any new engine/action/hook/formula: call prism_agent with op="capabilities" + op="search" to find existing implementations. Creating duplicates throws.

Key engine families you should search before building new logic:
- Force/Physics (17): Kienzle, CuttingForce, ConstitutiveModel, StochasticCuttingForce
- Speed/Feed (6): SpeedFeedOrchestrator is the central hub
- Chatter/Stability (13): ChatterStabilityLobe, RegenerativeChatter, DampingOptimization
- Deflection (17): ToolDeflection, BoringBarDeflection, PartDeflection
- Thermal (24): CuttingTemperature, ThermalWearCoupling, CryogenicCutting
- Wear/Life (9): ToolWearProgression, AdvancedWearPhysics, StochasticToolLife
- Surface (17): SurfaceFinishPredictor, ResidualStress
- CAM bridges (40): per-system engines for hyperMILL, Mastercam, Fusion, NX, etc.
- Post-processing (20): PostProcessorPipeline (38 stages), LathePostProcessor
- Quality/SPC (10): SPCProcessCapability, NelsonSPCRules, MetrologyUncertainty`;

const REASONING_SECTION = `# Reasoning style

- Material-first: identify material + ISO group before cutting parameters
- Safety scan: surface rotating/collision/chip/coolant hazards early
- Physics validation: check force vs machine capability, power, deflection, thermal, surface finish achievability
- Cost awareness: quantify tooling $/part, cycle time impact, setup, scrap risk
- Tolerance chain: trace stack-up for critical dimensions

For complex problems, use tree-of-thought: explore 2–5 paths, prune constraint violators, rank by confidence/safety/cost, return best with alternatives noted.`;

const FEEDBACK_SECTION = `# Feedback + memory

You have persistent memory across sessions. Use it:
- When the operator corrects you, call memory(remember_correction) — do not repeat the mistake
- When a parameter recommendation worked, call memory(remember_fact) with confidence ≥ 0.8
- When the operator states a preference ("always use trochoidal on pockets > 10mm"), call memory(remember_preference)
- Before recommending, search memory for prior corrections on similar requests

Corrections are weighted 10× harder than facts. If a correction fires while you're drafting a response, rewrite with the correction applied.`;

const TEST_SHOP_SECTION = `# Test shop: JM Die Company (jm-die)

Canonical test shop. Every feature must work against real JM Die data:
- Industry: cold heading die & tooling (fastener)
- Machines: 21 — 7 Okuma lathes, 5 mills (Hurco/Okuma/Haas/Roku-Roku), 2 Mitsubishi sinker EDMs, 1 wire EDM, 6 support
- Programs: 24,545 files across CNC LATHE, WIRE EDM, CNC MILL HAAS, OKUMA
- Materials: M2, D2, S7, A2 tool steels; tungsten/cobalt carbide; H13; graphite electrodes
- Customers: 100+ fastener manufacturers (ITW, Alcoa, Optimas, SFS, Holo-Krome)

When asked for a default, pick jm-die unless the operator names another shop.`;

const RESPONSE_FORMAT_SECTION = `# Response format

- Direct answers, no filler. Match response length to task.
- Structured data as JSON when the caller asks for it; natural language otherwise.
- Every physics recommendation cites its formula: "Kienzle Fc = kc1.1 × ap × fz^(1−mc) = 2900 N"
- Every tribal recommendation cites its source customer/program.
- When you call multiple tools with independent inputs, batch them in one turn.`;

// ── Dynamic sections ──────────────────────────────────────────────────────

export interface PromptBuildOptions {
  /** Optional identity info to embed */
  identity?: Partial<AgentIdentity>;
  /** Include dynamic tool list — default true */
  includeTools?: boolean;
  /** Tool list (from CapabilityIndexEngine.getAll()) — if provided, embedded */
  tools?: Array<{ fullPath: string; description?: string }>;
  /** Max tool lines to embed (hard cap) — default 80 */
  maxToolLines?: number;
  /** Additional domain-specific constraints (e.g. "no 5-axis") */
  extraConstraints?: string[];
  /** Memory context snippet from AgentMemoryFabricEngine.getForContextInjection() */
  memorySnippet?: string;
}

function buildIdentityHeader(identity?: Partial<AgentIdentity>): string {
  if (!identity) return IDENTITY_SECTION;
  const role = identity.role ?? "executor";
  const model = identity.model_id ?? "unknown-model";
  return `${IDENTITY_SECTION}\n\nThis instance: role=${role}, model=${model}.`;
}

function buildToolsSection(
  tools: Array<{ fullPath: string; description?: string }>,
  maxLines: number
): string {
  if (tools.length === 0) {
    return `# Available tools\n\n(Tool list unavailable — call prism_agent capabilities/search to discover.)`;
  }
  const lines = tools
    .slice(0, maxLines)
    .map((t) => `- ${t.fullPath}${t.description ? ` — ${t.description}` : ""}`);
  const truncated = tools.length > maxLines
    ? `\n\n(${tools.length - maxLines} more tools available via prism_agent capabilities/search)`
    : "";
  return `# Available tools (${tools.length} total, showing top ${Math.min(
    tools.length,
    maxLines
  )})\n\n${lines.join("\n")}${truncated}`;
}

function buildConstraintsSection(extra: string[]): string {
  if (extra.length === 0) return "";
  return `\n\n# Additional constraints for this session\n\n${extra.map((c) => `- ${c}`).join("\n")}`;
}

function buildMemorySection(snippet: string): string {
  if (!snippet || snippet.trim().length === 0) return "";
  return `\n\n# Recalled memories\n\n${snippet.trim()}`;
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Build the agent system prompt from the given options.
 *
 * @returns { prompt, token_estimate, within_budget }
 */
export function buildAgentSystemPrompt(
  options: PromptBuildOptions = {}
): { prompt: string; token_estimate: number; within_budget: boolean } {
  const includeTools = options.includeTools ?? true;
  const maxToolLines = options.maxToolLines ?? 80;

  const sections: string[] = [
    buildIdentityHeader(options.identity),
    SAFETY_SECTION,
    CAPABILITIES_SECTION,
    REASONING_SECTION,
    FEEDBACK_SECTION,
    TEST_SHOP_SECTION,
    RESPONSE_FORMAT_SECTION,
  ];

  if (includeTools && options.tools) {
    sections.push(buildToolsSection(options.tools, maxToolLines));
  }

  const extra = options.extraConstraints ?? [];
  let tail = buildConstraintsSection(extra);
  if (options.memorySnippet) {
    tail += buildMemorySection(options.memorySnippet);
  }

  const prompt = sections.join("\n\n") + tail;
  const token_estimate = estimateTokens(prompt);
  const within_budget = token_estimate <= FULL_PROMPT_TOKEN_BUDGET;

  return { prompt, token_estimate, within_budget };
}

/**
 * Build just the base prompt (no tool enumeration, no memory) — useful for
 * prompt cache warming and testing the static core.
 */
export function buildBaseSystemPrompt(
  identity?: Partial<AgentIdentity>
): { prompt: string; token_estimate: number; within_budget: boolean } {
  return buildAgentSystemPrompt({ identity, includeTools: false });
}

/**
 * Compute how many tool lines can be added before the full prompt exceeds
 * FULL_PROMPT_TOKEN_BUDGET. Useful for adaptive tool enumeration.
 */
export function maxToolLinesWithinBudget(
  baseOptions: PromptBuildOptions = {}
): number {
  const base = buildAgentSystemPrompt({ ...baseOptions, includeTools: false });
  const remaining = FULL_PROMPT_TOKEN_BUDGET - base.token_estimate;
  // Approximate: each tool line is ~20 tokens on average
  const estimatedPerLine = 20;
  return Math.max(0, Math.floor(remaining / estimatedPerLine));
}

// Named exports for direct consumption + testing
export {
  IDENTITY_SECTION,
  SAFETY_SECTION,
  CAPABILITIES_SECTION,
  REASONING_SECTION,
  FEEDBACK_SECTION,
  TEST_SHOP_SECTION,
  RESPONSE_FORMAT_SECTION,
};
