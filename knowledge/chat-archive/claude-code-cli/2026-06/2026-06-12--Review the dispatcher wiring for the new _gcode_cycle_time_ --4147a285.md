---
type: "chat-session"
source: "claude-code-cli"
session_id: "4147a285-7a5a-42b1-a446-db6c05dfba3e"
title: "Review the dispatcher wiring for the new `gcode_cycle_time` action (slot charlie"
date: "2026-06-12"
first_ts: "2026-06-12T18:18:45.434Z"
last_ts: "2026-06-12T18:19:36.449Z"
cwd: "H:\\prism-slot-charlie"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism-slot-charlie/4147a285-7a5a-42b1-a446-db6c05dfba3e/subagents/agent-a69c310a3a70c8af9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:40"
---

# Review the dispatcher wiring for the new `gcode_cycle_time` action (slot charlie

> **claude-code-cli** | 2026-06-12 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism-slot-charlie
> Raw: `H:/.claude/projects/H--prism-slot-charlie/4147a285-7a5a-42b1-a446-db6c05dfba3e/subagents/agent-a69c310a3a70c8af9.jsonl`

## Transcript

### User | 2026-06-12T18:18:45.434Z

Review the dispatcher wiring for the new `gcode_cycle_time` action (slot charlie, unit U-QP-GCODE-TIME-WIRE). Verify the action enum, schema, and handler case all align across these files:
- `H:\prism\mcp-server\src\schemas\quotingActionSchemas.ts` — the `quotingActionEnum` must contain "gcode_cycle_time", `gcodeCycleTimeSchema` must be defined, and `QUOTING_ACTION_SCHEMAS` must map "gcode_cycle_time" -> gcodeCycleTimeSchema.
- `H:\prism\mcp-server\src\tools\dispatchers\quotingDispatcher.ts` — the `case "gcode_cycle_time":` handler must lazy-import CycleTimeEstimatorEngine, read params matching the schema (gcode, controller?, machine_profile?), and call estimateFromGCode.
- `H:\prism\mcp-server\src\__tests__\GCodeTimeWire.test.ts` — the round-trip test.

VERIFY (this is the exact class of bug PRISM has hit before — a dispatcher action that's in the handler map but NOT the z.enum passes the MockMCPServer test while production rejects it):
1. Is "gcode_cycle_time" in the `quotingActionEnum` z.enum (the production gate on server.tool)? The test asserts `quotingActionEnum.options.toContain("gcode_cycle_time")` — confirm that assertion can actually pass against the real enum.
2. Schema field names (gcode/controller/machine_profile) — do they EXACTLY match what the handler reads from parsed.data AND what the test passes in params? A mismatch (e.g. handler reads `d.gcode` but schema validates `text`) would 0-pass the engine.
3. The controller z.enum in the schema — does it match CycleTimeEstimatorEngine's ControllerType union exactly (fanuc/haas/siemens/heidenhain/mazak/okuma/hurco)?
4. Is the engine's estimateFromGCode signature `(gcode: string, config: {controller, machine_profile?})` matched by the call?
5. Does the existing `gcode_time_estimate` action (the inferior GCodeTimeEstimatorEngine) still work — i.e., the new action is ADDITIVE, not a replacement that broke the old one?

Report P0/P1 with file:line. Grade PASS or FAIL.

### Assistant | 2026-06-12T18:18:52.023Z

I'll systematically read all three files to verify the dispatcher wiring for `gcode_cycle_time`.

### Assistant | 2026-06-12T18:18:52.119Z

[tool_use: Read]

### Assistant | 2026-06-12T18:18:52.195Z

[tool_use: Read]

### Assistant | 2026-06-12T18:18:52.304Z

[tool_use: Read]

### User | 2026-06-12T18:18:53.922Z

[tool_result] 1	/**
2	 * U-QP-GCODE-TIME-WIRE (charlie 2026-06-12) -- wire the precise S-curve
3	 * CycleTimeEstimatorEngine into the quote path. Two seams:
4	 *   1. prism_quoting:gcode_cycle_time dispatcher action (precise engine exposed).
5	 *   2. InstantQuoteEngine: when input.gcode_program is present, cycle_time comes
6	 *      from the real G-code (deterministic) instead of the MRR/parametric estimate.
7
... [+6229 chars truncated]

### User | 2026-06-12T18:18:54.037Z

[tool_result] 1	/**
2	 * quotingActionSchemas — QUOTING-PIPELINE-MS0 / U-QP08
3	 *
4	 * Zod schemas + action enum for the new prism_quoting dispatcher.
5	 * Each action maps to a U-QP02..U-QP07 engine.
6	 */
7	import { z } from "zod";
8	
9	export const quotingActionEnum = z.enum([
10	  "camera_intake_route",      // U-QP02
11	  "insert_box_lookup",         // U-QP03
12	  "machine_tag_extract",       // U-QP04
1
... [+58732 chars truncated]

### User | 2026-06-12T18:18:55.577Z

[tool_result] 1	/**
2	 * quotingDispatcher — QUOTING-PIPELINE-MS0 / U-QP08
3	 *
4	 * MCP dispatcher for the camera-intake + quoting bridges.
5	 *
6	 * Actions:
7	 *   - camera_intake_route          → CameraIntakeRouterEngine.classify           (U-QP02)
8	 *   - insert_box_lookup            → InsertBoxToCatalogBridgeEngine.lookup       (U-QP03)
9	 *   - machine_tag_extract          → MachineServiceTagOCREngine.e
... [+41137 chars truncated]

### Assistant | 2026-06-12T18:18:58.903Z

All three files are now fully read. I have everything needed to answer all five verification questions.

Now I need to verify the engine itself to confirm the `estimateFromGCode` signature and `ControllerType` union.

### Assistant | 2026-06-12T18:19:00.270Z

[tool_use: Grep]

### User | 2026-06-12T18:19:01.654Z

[tool_result] 25:/** Supported CNC controller families. */
26:export type ControllerType = "fanuc" | "haas" | "siemens" | "heidenhain" | "mazak" | "okuma" | "hurco";
57:  controller: ControllerType;
106:  controller: ControllerType;
170:const MACHINE_PROFILES: Record<string, { controller: ControllerType; kinematics: MachineKinematics }> = {
172:    controller: "haas",
186:    controller: "haas",
201:    control
... [+1547 chars truncated]

### Assistant | 2026-06-12T18:19:04.052Z

I have everything needed. Let me now check the `CycleTimeConfig` type to confirm the exact signature shape.

### Assistant | 2026-06-12T18:19:04.847Z

[tool_use: Grep]

### User | 2026-06-12T18:19:06.142Z

[tool_result] 55:export interface CycleTimeConfig {
931:  resolveKinematics(config: CycleTimeConfig): MachineKinematics {
1012:  estimateFromGCode(gcode: string, config: CycleTimeConfig): CycleTimeResult {
1327:  identifyBottlenecks(gcode: string, config: CycleTimeConfig): BottleneckResult {

### Assistant | 2026-06-12T18:19:08.246Z

[tool_use: Read]

### User | 2026-06-12T18:19:10.201Z

[tool_result] 55	export interface CycleTimeConfig {
56	  /** Controller family — selects default kinematic profile */
57	  controller: ControllerType;
58	  /** Machine name key for built-in profiles (e.g., "haas_vf2") */
59	  machine_profile?: string;
60	  /** Custom kinematic overrides (merged on top of profile) */
61	  kinematics_override?: Partial<MachineKinematics>;
62	  /** Whether to include per-tool brea
... [+131 chars truncated]

### Assistant | 2026-06-12T18:19:36.449Z

All data is now in hand. Here is the complete wiring review.

---

## Dispatcher Wiring Review — `gcode_cycle_time` (U-QP-GCODE-TIME-WIRE)

### Engine reviewed
- `CycleTimeEstimatorEngine` (`H:\prism\mcp-server\src\engines\CycleTimeEstimatorEngine.ts`)

---

### Check 1 — z.enum entry

`quotingActionEnum` at `H:\prism\mcp-server\src\schemas\quotingActionSchemas.ts:35` contains `"gcode_cycle_time"` explicitly:

```
"gcode_cycle_time",  // U-QP-GCODE-TIME-WIRE
```

The test at `GCodeTimeWire.test.ts:68` asserts `quotingActionEnum.options.toContain("gcode_cycle_time")`. This assertion will pass against the real enum because the string is literally present. The production `server.tool(...)` call at `quotingDispatcher.ts:22-28` passes `quotingActionEnum` directly as the action validator — the z.enum gate is real and will accept this action.

Result: PASS.

---

### Check 2 — Schema field name alignment (gcode / controller / machine_profile)

Schema at `quotingActionSchemas.ts:343-348`:
```typescript
export const gcodeCycleTimeSchema = z.object({
  gcode: z.string(),
  controller: z.enum([...]).optional(),
  machine_profile: z.string().optional(),
});
```

Handler at `quotingDispatcher.ts:266-267`:
```typescript
const d = parsed.data as { gcode: string; controller?: ...; machine_profile?: string };
result = cycleTimeEstimatorEngine.estimateFromGCode(d.gcode, { controller: d.controller ?? "fanuc", machine_profile: d.machine_profile });
```

Test at `GCodeTimeWire.test.ts:73`:
```typescript
params: { gcode: PROG, controller: "haas", machine_profile: "haas_vf2" }
```

All three surfaces — schema, handler destructure, and test params — use exactly `gcode`, `controller`, and `machine_profile`. There is no aliasing mismatch (e.g. no `text` vs `gcode` confusion). The `QUOTING_ACTION_SCHEMAS` map at `quotingActionSchemas.ts:673` maps `gcode_cycle_time: gcodeCycleTimeSchema`.

Result: PASS.

---

### Check 3 — Controller z.enum vs ControllerType union

Schema enum at `quotingActio
... [+2696 chars truncated]
