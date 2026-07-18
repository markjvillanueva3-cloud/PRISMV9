---
type: "chat-session"
source: "claude-code-cli"
session_id: "d0133a03-9407-4bcc-9878-1b260a7a56cb"
title: "Review the WIRING + SCHEMA + integration of a GRPO engine into PRISM's prism_ai "
date: "2026-06-08"
first_ts: "2026-06-08T16:27:35.146Z"
last_ts: "2026-06-08T16:29:37.964Z"
cwd: "H:\\prism\\mcp-server"
messages: 32
user_msgs: 13
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/d0133a03-9407-4bcc-9878-1b260a7a56cb/subagents/agent-acec339eb17d4ec63.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# Review the WIRING + SCHEMA + integration of a GRPO engine into PRISM's prism_ai 

> **claude-code-cli** | 2026-06-08 | 32 msgs (13 user / 19 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/d0133a03-9407-4bcc-9878-1b260a7a56cb/subagents/agent-acec339eb17d4ec63.jsonl`

## Transcript

### User | 2026-06-08T16:27:35.146Z

Review the WIRING + SCHEMA + integration of a GRPO engine into PRISM's prism_ai dispatcher (H:/prism). Weight toward dispatcher-contract conformance, schema backward-compat, and round-trip completeness. Do NOT assume the algorithm reviewer caught wiring issues. Grade PASS/FAIL + P0/P1.

Verify independently (read + grep):
1. H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts — a new `group_normalize_reward` action. Confirm: (a) it's in the GRPO_ACTIONS tuple AND folded into ALL_AI_ACTIONS (the z.enum source) AND the AIAction type union AND ALL_AI_SCHEMAS; (b) the switch `case "group_normalize_reward"` lazy-imports GroupRelativeRewardNormalizerEngine and calls normalizeGroup; (c) it follows the same pattern as the `capability_probe` case. Run: grep -n "group_normalize_reward" on the file — expect it in enum, schema, and switch. Anti-regression: did action count INCREASE (never decrease)?
2. H:/prism/mcp-server/src/__tests__/grpo-dispatcher-e2e.test.ts — does it invoke THROUGH the dispatcher (executeAIReasoningAction), not the engine singleton? Does it assert the action is in ALL_AI_ACTIONS + the dispatcherDef enum accepts it? Are the 5 cases real round-trips?
3. H:/prism/mcp-server/src/schemas/policyExperienceSchema.ts — `group_advantage` added as OPTIONAL to ExperienceTupleSchema + AppendExperienceInputSchema. Verify it's `.optional()` (backward-compat: pre-GRPO tuples without it still validate under schemaVersion "1.0.0"). Is adding an optional field under the SAME literal version a safe additive change or does it need a version bump?
4. H:/prism/mcp-server/src/engines/PolicyExperienceLedgerEngine.ts — the append() tuple construction now conditionally includes group_advantage (only when provided). Verify the conditional spread `...(parsed.data.group_advantage !== undefined ? {...} : {})` keeps pre-GRPO tuples byte-identical (field absent, not null/undefined).

Context: 40/40 tests pass incl. a round-trip readback proving group_advantage persists + a
... [+108 chars truncated]

### Assistant | 2026-06-08T16:27:46.488Z

I'll independently verify the wiring, schema, and integration of the GRPO engine. Let me read the relevant files.

### Assistant | 2026-06-08T16:27:46.489Z

[tool_use: Bash]

### Assistant | 2026-06-08T16:27:50.607Z

[tool_use: Bash]

### Assistant | 2026-06-08T16:27:50.612Z

[tool_use: Bash]

### User | 2026-06-08T16:27:52.610Z

[tool_result] 254:  "group_normalize_reward",
258:  group_normalize_reward: z.record(z.string(), z.unknown()),
948:      // group_normalize_reward — ULTRACODE-SYNERGY-MS0/Order 3 (GRPO)
954:      case "group_normalize_reward": {

### User | 2026-06-08T16:27:56.610Z

[tool_result] H:/prism/mcp-server/src/schemas/policyExperienceSchema.ts:121:  group_advantage: z.number().optional(),
H:/prism/mcp-server/src/schemas/policyExperienceSchema.ts:136:  group_advantage: z.number().optional(),        // GRPO advantage (ULTRACODE-SYNERGY-MS0); additive-optional
H:/prism/mcp-server/src/engines/PolicyExperienceLedgerEngine.ts:92:      ...(parsed.data.group_advantage !== undefined ? { g
... [+52 chars truncated]

### User | 2026-06-08T16:27:56.694Z

[tool_result] 2: * Round-trip E2E: prism_ai:group_normalize_reward through the DISPATCHER
9:  executeAIReasoningAction,
11:  ALL_AI_ACTIONS,
14:describe("prism_ai:group_normalize_reward — dispatcher round-trip", () => {
16:    expect(ALL_AI_ACTIONS).toContain("group_normalize_reward");
19:      action: "group_normalize_reward",
26:    const res = await executeAIReasoningAction("group_normalize_reward", {
46:   
... [+242 chars truncated]

### Assistant | 2026-06-08T16:28:01.547Z

Good initial signals. Let me read the actual code sections to verify the wiring depth, not just the grep hits.

### Assistant | 2026-06-08T16:28:04.911Z

[tool_use: Read]

### Assistant | 2026-06-08T16:28:04.917Z

[tool_use: Read]

### User | 2026-06-08T16:28:08.639Z

[tool_result] 920	  // Validate params against schema (U-WIRE03: pass the schema MAP, not the per-action schema —
921	  // validateActionParams indexes the map by action; passing a single Zod object made it always pass).
922	  // U-AIMAX10: merged map covers both the legacy AI_REASONING_ACTIONS and the new AI_CAPABILITY_ACTIONS.
923	  const validation = validateActionParams(action, params, ALL_AI_SCHEMAS);
924	
... [+6280 chars truncated]

### User | 2026-06-08T16:28:08.648Z

[tool_result] 230	// probe. OllamaCapabilityProbeEngine does the live nvidia-smi + /api/tags I/O
231	// that ModelRoutingEngine (pure scorer) deliberately delegates to callers:
232	// detect the HardwareProfile, WDDM-correct free VRAM, list present + loaded +
233	// runnable Ollama models. Read-only; fail-soft (degrades to cloud_only on
234	// missing GPU / Ollama down). The keystone the Blackwell-AI consumers 
... [+5953 chars truncated]

### Assistant | 2026-06-08T16:28:12.945Z

The dispatcher wiring is fully verified. Now let me confirm the z.enum source uses ALL_AI_ACTIONS, check the dispatcherDef enum, and read the test + schema + engine in detail.

### Assistant | 2026-06-08T16:28:14.879Z

[tool_use: Bash]

### Assistant | 2026-06-08T16:28:15.210Z

[tool_use: Read]

### User | 2026-06-08T16:28:18.073Z

[tool_result] 1	/**
2	 * Round-trip E2E: prism_ai:group_normalize_reward through the DISPATCHER
3	 * (ULTRACODE-SYNERGY-MS0 Order 3). Per CLAUDE.md §ENGINE WIRING, the acceptance
4	 * criterion is invocation THROUGH the dispatcher, not just the engine singleton.
5	 * Run: npx vitest run src/__tests__/grpo-dispatcher-e2e.test.ts
6	 */
7	import { describe, it, expect } from "vitest";
8	import {
9	  executeAIReaso
... [+2954 chars truncated]

### User | 2026-06-08T16:28:25.487Z

[tool_result] 40:// ALL_AI_ACTIONS is the wire-level tuple used by z.enum(...); ALL_AI_SCHEMAS
47:// Zod validation. Adding them to ALL_AI_ACTIONS makes the switch exhaustive.
261:const ALL_AI_ACTIONS = [
907:    action: z.enum(ALL_AI_ACTIONS).describe("AI reasoning action to execute"),
2899:        // KEEP IN SYNC with the `voices` z.enum literal in aiReasoningActionSchemas.ts
4193:export { AI_REASONING_ACTION
... [+20 chars truncated]

### Assistant | 2026-06-08T16:28:33.201Z

Dispatcher def and z.enum are correctly sourced from `ALL_AI_ACTIONS` (line 907). The test imports `aiReasoningDispatcherDef` and verifies the input schema accepts the action. Let me verify line 907 context (the dispatcherDef shape) and read the schema + engine files.

### Assistant | 2026-06-08T16:28:34.558Z

[tool_use: Read]

### Assistant | 2026-06-08T16:28:34.934Z

[tool_use: Read]

### Assistant | 2026-06-08T16:28:34.942Z

[tool_use: Read]

### User | 2026-06-08T16:28:36.188Z

[tool_result] 895	  if (!_millAwareness) {
896	    const mod = await import("../../engines/MillAISelfAwarenessIntegrationEngine.js");
897	    _millAwareness = mod.millAISelfAwarenessIntegrationEngine;
898	  }
899	  return _millAwareness;
900	}
901	
902	/** Dispatcher definition for MCP registration */
903	export const aiReasoningDispatcherDef = {
904	  name: "prism_ai",
905	  description: "AI reasoning dispatch
... [+464 chars truncated]

### User | 2026-06-08T16:28:36.600Z

[tool_result] 60	   * normalized_z_score * weight * sign.
61	   */
62	  append(input: AppendExperienceInput): AppendResult {
63	    const parsed = AppendExperienceInputSchema.safeParse(input);
64	    if (!parsed.success) {
65	      return {
66	        ok: false,
67	        experience_id: "",
68	        reward_total: 0,
69	        path: "",
70	        warning: `schema validation failed: ${parsed.error.message}`,
... [+1855 chars truncated]

### User | 2026-06-08T16:28:36.603Z

[tool_result] 1	/**
2	 * Policy Experience Schema — U-LEARN-09
3	 * =======================================
4	 *
5	 * (s, a, r, s') tuple representation for offline RL. Written to
6	 * state/policy/experience.jsonl atomically by PolicyExperienceLedgerEngine.
7	 * RL-Specialist scrutiny (0.38) called out ratio-based rewards as a hacking
8	 * surface; this schema stores both raw + z-normalized components so
9	 * 
... [+6671 chars truncated]

### Assistant | 2026-06-08T16:28:43.582Z

I have everything I need to render a verdict. All four areas verified independently. Let me confirm the schemaVersion/SCHEMA_VERSION constant and check the `dispatcherError`/success-wrap path so I can confirm the empty/NaN test claims are honest.

### Assistant | 2026-06-08T16:28:45.810Z

[tool_use: Bash]

### User | 2026-06-08T16:28:54.906Z

[tool_result] 39:const SCHEMA_VERSION = "1.0.0" as const;
78:      schemaVersion: SCHEMA_VERSION,
---dispatcher success wrap---
3754:        result = { success: true, data: (mixerAgitatorEngine as any).calculate?.(params as any) ?? { engine: "MixerAgitatorEngine", note: "method not callable" } };
3759:        result = { success: true, data: (metrologyUncertaintyEngine as any).typeAEvaluation?.(params as any) ??
... [+1687 chars truncated]

### Assistant | 2026-06-08T16:29:03.963Z

Let me confirm how the GRPO `result` gets success-wrapped at the end of the switch, since the test asserts `res.success === true` and `res.data.ok`. The grep showed inline `{success:true, data:...}` patterns but the GRPO case sets `result = ...normalizeGroup(...)` directly. Let me check the function's return/wrap logic.

### Assistant | 2026-06-08T16:29:06.139Z

[tool_use: Bash]

### User | 2026-06-08T16:29:14.063Z

[tool_result] 883:  return wrapper(action, params);
891:  return _millFacade;
899:  return _millAwareness;
925:    return dispatcherError(validation.error ?? "Validation failed", action, "prism_ai");
1901:          return dispatcherError(`Unknown belief id: ${p.id}`, action, "prism_ai");
1984:          return dispatcherError("Missing required 'chain' parameter (ReasoningChain object)", action, "prism_ai");
2723
... [+465 chars truncated]

### Assistant | 2026-06-08T16:29:37.964Z

Confirmed. Line 4177 `return { success: true, data: slimmed }` is the terminal wrap — so the engine's `{ok, mode, advantages, source}` object becomes `res.data`, and the dispatcher success-wraps it even when the engine returns `ok:false`. The default case (line 4167) is an exhaustive guard with `_exhaustive` typing, confirming the `AIAction` union must include `GrpoAction` for tsc to pass — which it does (line 283). All claims verified.

---

## VERDICT: PASS

Wiring, schema, and integration all conform. 3-5 line summary:

The `group_normalize_reward` action is wired completely and correctly across all six required surfaces — `GRPO_ACTIONS` tuple (L253-255) → folded into `ALL_AI_ACTIONS` (L270, the `z.enum(ALL_AI_ACTIONS)` source at L907) → `AIAction` union (L283, which the exhaustive `_exhaustive` default at L4167 forces tsc to honor) → `ALL_AI_SCHEMAS` (L281, fed to `validateActionParams`) → switch case (L954) that lazy-imports `GroupRelativeRewardNormalizerEngine` and calls `normalizeGroup`, matching the `capability_probe` pattern exactly. Action count strictly INCREASED (additive tuple+spread, no deletions — anti-regression holds). The E2E test invokes through `executeAIReasoningAction` (the dispatcher, not the singleton), asserts membership in `ALL_AI_ACTIONS` AND `aiReasoningDispatcherDef.inputSchema.safeParse`, and the 5 cases are real round-trips (z-score reference {0,2}→{-1,+1}, 16-sample mean≈0, empty-group ok:false, NaN-poisoned ok:false with finite outputs — all consistent with the L4177 success-wrap of the engine's `{ok,...}` object). Schema change is a safe additive: `group_advantage: z.number().optional()` on both `ExperienceTupleSchema` (L121) and `AppendExperienceInputSchema` (L136); the conditional spread `...(parsed.data.group_advantage !== undefined ? {...} : {})` (Ledger L92) keeps pre-GRPO tuples byte-identical (field absent, not null), and the engine writes `schemaVersion: "1.0.0"` (L78) so older readers are unaffected.

P0: none.
P1: none.

N
... [+1110 chars truncated]
