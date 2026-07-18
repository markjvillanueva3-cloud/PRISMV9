---
type: "chat-session"
source: "claude-code-cli"
session_id: "bf3268c7-79a4-4a1d-a16f-c6eed2a35d1a"
title: "Per-file scrutiny gate — Arm A. Review the wiring of `ToolCallThrottleEngine` in"
date: "2026-05-19"
first_ts: "2026-05-19T15:54:32.518Z"
last_ts: "2026-05-19T15:56:34.054Z"
cwd: "H:\\prism\\mcp-server"
messages: 14
user_msgs: 6
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/bf3268c7-79a4-4a1d-a16f-c6eed2a35d1a/subagents/agent-a3868fc6d152b9e16.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:25"
---

# Per-file scrutiny gate — Arm A. Review the wiring of `ToolCallThrottleEngine` in

> **claude-code-cli** | 2026-05-19 | 14 msgs (6 user / 8 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/bf3268c7-79a4-4a1d-a16f-c6eed2a35d1a/subagents/agent-a3868fc6d152b9e16.jsonl`

## Transcript

### User | 2026-05-19T15:54:32.518Z

Per-file scrutiny gate — Arm A. Review the wiring of `ToolCallThrottleEngine` into `prism_dev:tool_call_throttle` (unit U-WIRE-TOOL-CALL-THROTTLE, WIRE-UNWIRED-MS0).

**Files edited this session (read each end-to-end):**
1. `H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts` — added `"tool_call_throttle"` to ACTIONS array (around L505 after `"waste_detector"`) AND new `case "tool_call_throttle":` handler with inner switch over 5 ops, inserted after the `case "waste_detector":` block. Look for comment banner `// ── WIRE-UNWIRED-MS0/U-WIRE-TOOL-CALL-THROTTLE ──`.
2. `H:/prism/mcp-server/src/schemas/devActionSchemas.ts` — added `tool_call_throttle:` Zod schema to `ACTION_DEV_SCHEMAS` at end of record. Look for the same comment banner.
3. `H:/prism/mcp-server/src/__tests__/ToolCallThrottleEngineWiring.test.ts` — new wiring-gate test file (17 cases). Tests PASS (17/17).

**Engine being wired:** `H:/prism/mcp-server/src/engines/ToolCallThrottleEngine.ts` — singleton-instance `toolCallThrottleEngine`. 5 public methods: `check(tool)`, `setRule(tool, maxPerMinute, burstLimit?, cooldownMs?)`, `stats()`, `oneLiner()`, `reset()`. Default rules seed 8 common tools (Read/Grep/Glob/Edit/Bash/WebFetch/WebSearch/Agent).

**Sibling pattern (same wire today, iter-1):** `U-WIRE-WASTE-DETECTOR` — same op-discriminator pattern in the same dispatcher. ToolCallThrottle case immediately follows it; the comment banners are adjacent.

**Distinct from:** existing `tool_call_record` / `tool_call_analyze` / `tool_call_reset` (ToolCallTracker — passive observability surface). This new engine is the ACTIVE rate-limit/burst/cooldown decision gate.

**Things to verify (heavy on wiring correctness):**
- ACTIONS array syntax: `"tool_call_throttle"` correctly added with `as const;` terminator intact, no trailing-comma bug.
- z.enum(ACTIONS) at L565 flows through automatically.
- Schema correctness: `op` is z.enum (NOT z.string) over the 5 exact strings matching the dispatcher's inner switch ca
... [+1161 chars truncated]

### Assistant | 2026-05-19T15:54:48.517Z

I'll read all three files end-to-end now.

### Assistant | 2026-05-19T15:54:51.144Z

[tool_use: Read]

### Assistant | 2026-05-19T15:54:51.723Z

[tool_use: Read]

### Assistant | 2026-05-19T15:54:53.275Z

[tool_use: Read]

### User | 2026-05-19T15:55:01.985Z

[tool_result] 490	"wpl_calculate_duty_cycle", "wpl_calculate_frequency", "wpl_calculate_pulse_energy",
491	"wpl_get_max_ton", "wpl_validate", "wpl_calculate_safe_pulse", "wpl_get_config",
492	"hyp_get_prior", "hyp_prioritize", "hyp_get_tribal_endorsements",
493	"plug_get", "plug_list", "plug_list_by_kind", "plug_list_by_health",
494	"plug_summary", "plug_size",
495	"ccd_check_move", "ccd_validate_rapid_moves", 
... [+7074 chars truncated]

### User | 2026-05-19T15:55:04.064Z

[tool_result] 1	/**
2	 * Dev Action Schemas - Zod schemas for prism_dev dispatcher actions
3	 */
4	import { z } from "zod";
5	
6	// ── RoadmapIntelligenceEngine shared sub-schemas (ENGINE-WIRE: prism_dev roadmap_intel_* actions) ──
7	const _riMilestoneUnit = z.object({
8	  id: z.string(), name: z.string(), description: z.string(),
9	  estimated_hours: z.number().nonnegative().optional(),
10	  actual_hours: z.nu
... [+2182 chars truncated]

### User | 2026-05-19T15:55:08.096Z

[tool_result] 1	/**
2	 * ToolCallThrottleEngineWiring.test.ts
3	 *
4	 * WIRE-UNWIRED-MS0/U-WIRE-TOOL-CALL-THROTTLE wiring-gate test.
5	 *
6	 * Asserts ToolCallThrottleEngine is reachable via prism_dev:tool_call_throttle
7	 * (op-discriminator pattern) and that every one of the 5 engine methods
8	 * round-trips through the dispatcher case block.
9	 *
10	 * Pattern mirror: U-WIRE-WASTE-DETECTOR (sibling wire ship
... [+11740 chars truncated]

### Assistant | 2026-05-19T15:55:33.447Z

Now I need to read the actual case block in the dispatcher to verify the implementation details.

### Assistant | 2026-05-19T15:55:34.729Z

[tool_use: Grep]

### Assistant | 2026-05-19T15:55:35.791Z

[tool_use: Grep]

### User | 2026-05-19T15:56:02.342Z

[tool_result] 5947-            const tracker = new TokenEconomyTrackerEngine();
5948-            result = tracker.getSessionSummary(params.session_id || "");
5949-            break;
5950-          }
5951-          case "token_economy_set_budget": {
5952-            const { TokenEconomyTrackerEngine } = await import("../../engines/TokenEconomyTrackerEngine.js");
5953-            const tracker = new TokenEconomyT
... [+9024 chars truncated]

### User | 2026-05-19T15:56:08.890Z

[tool_result] 3875-  // a literal union of 8 values, so the enum makes the Parameters<> cast at the
3876-  // case site runtime-sound (lesson from U-WIRE-SESSION-EVENT-LOG 3d6aba4525).
3877-  waste_detector: z.object({
3878-    op: z.enum(["record", "check_read", "check_search", "check_output_size", "report", "oneliner", "reset"])
3879-      .describe("WasteDetectorEngine method discriminator"),
3880-    // ── 
... [+3887 chars truncated]

### Assistant | 2026-05-19T15:56:34.054Z

**PASS**

All wiring checks clear. Findings by priority:

**P0 — None.**

**P1 — None.**

**P2 (deferred, non-blocking):**

- `devActionSchemas.ts:3919` — `tool` field for `check` and `set_rule` is declared `.optional()`. The schema therefore accepts `{ op: "check" }` with no `tool` field and returns a valid parse result; the dispatcher's fail-loud guard (`if (!params.tool)`) then catches it at runtime. This is technically correct (the op-discriminated flat schema can't easily make `tool` conditionally required without `.superRefine()`), but a caller gets a schema-valid parse followed by a dispatcher error rather than a schema-level rejection. This is the same pattern used by the sibling `waste_detector` schema. Acceptable as-is; document it.

- `devActionSchemas.ts:3922` — `max_per_minute` is `.optional()` for the same reason. Same comment.

**P3:**

- The test at `ToolCallThrottleEngineWiring.test.ts:199` calls `e.oneLiner()` but the dispatcher surfaces this as `{ line: toolCallThrottleEngine.oneLiner() }`. The test exercises the engine method directly (fine for behavioral coverage) but does not assert the dispatcher's `{ line: ... }` wrapper shape. Not a wiring-gate regression risk given the source-grep at line 101 confirms the singleton, but a round-trip dispatcher stub test would be stronger.

**Wiring checklist — all items verified against actual file content:**

| Check | Result |
|---|---|
| `"tool_call_throttle"` in ACTIONS array with `] as const;` terminator intact | PASS (L510) |
| Trailing comma on `"waste_detector"` (not the terminator) | PASS (L503 ends with `,`) |
| `z.enum(ACTIONS)` at L580 flows through automatically | PASS |
| Schema `op` is `z.enum(["check","set_rule","stats","oneliner","reset"])` not `z.string` | PASS |
| All schema fields have `.describe()` | PASS |
| Lazy import: `await import("../../engines/ToolCallThrottleEngine.js")` | PASS (L6028) |
| Singleton destructure: `{ toolCallThrottleEngine }` not the class | PASS (L6028) |
| `new 
... [+680 chars truncated]
