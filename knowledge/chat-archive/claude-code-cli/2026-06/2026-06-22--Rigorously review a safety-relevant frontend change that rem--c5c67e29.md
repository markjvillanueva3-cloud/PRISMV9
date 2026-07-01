---
type: "chat-session"
source: "claude-code-cli"
session_id: "c5c67e29-5b96-45c0-8c2e-63ed83affa16"
title: "Rigorously review a safety-relevant frontend change that removes inlined physics"
date: "2026-06-22"
first_ts: "2026-06-22T20:17:31.084Z"
last_ts: "2026-06-22T20:18:47.121Z"
cwd: "H:\\prism\\mcp-server\\web"
messages: 27
user_msgs: 11
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/c5c67e29-5b96-45c0-8c2e-63ed83affa16/subagents/agent-a38feafb1d7fe1deb.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Rigorously review a safety-relevant frontend change that removes inlined physics

> **claude-code-cli** | 2026-06-22 | 27 msgs (11 user / 16 assistant) | cwd: H:\prism\mcp-server\web
> Raw: `H:/.claude/projects/H--prism/c5c67e29-5b96-45c0-8c2e-63ed83affa16/subagents/agent-a38feafb1d7fe1deb.jsonl`

## Transcript

### User | 2026-06-22T20:17:31.084Z

Rigorously review a safety-relevant frontend change that removes inlined physics from the UI. Grade PASS or FAIL with P0/P1/P2 + file:line. Read ALL files end-to-end.

FILES:
1. H:/prism/mcp-server/web/src/components/sfc/AdvancedCharts.tsx (rewritten -- removed inlined TAYLOR {n,C} Record + client Math.pow(C/v,1/n); tool-life curve now fetched from the canonical backend)
2. H:/prism/mcp-server/web/src/lib/toolLifeCurve.ts (new -- pure curve builder)
3. H:/prism/mcp-server/web/src/__tests__/toolLifeCurve.test.ts (new -- 9 tests)
4. H:/prism/mcp-server/web/src/pages/SfcCalculatorPage.tsx (1-line: passes material={material?.id} to AdvancedCharts)

CONTEXT / INTENT: quebec's soul REFUSES "inlining-physics-or-safety-constants-in-components". The old AdvancedCharts inlined Taylor n/C constants per ISO group + computed tool life client-side -- a violation that risked a curve diverging from the canonical engine. The fix routes the tool-life curve through the EXISTING canonical endpoint sfcApi.toolLife (POST /api/v1/sfc/tool-life -> prism_calc:tool_life; request contract ToolLifeRequest{cutting_speed,feed,depth,material?,tool_material?} -> ToolLifeResult{tool_life_minutes,wear_rate} in types/sfc.ts).

VERIFY SPECIFICALLY:
- The inlined TAYLOR Record + ALL client-side tool-life Math.pow are GONE (grep the file -- no n/C constants, no (C/v)^(1/n) left). The UI renders engine output, never recomputes physics.
- The curve is genuinely canonical: buildToolLifeCurve samples speeds + calls the injected fetcher (sfcApi.toolLife unwrapped via .result) per speed; no fabricated physics.
- Loading + error + empty states are all present in ToolLifeChart (quebec soul: never ship a route without them). The useEffect cancels on unmount (no setState-after-unmount).
- The SurfaceFinishChart's Ra=f^2/(32r) remaining is acceptable (geometric identity, NOT a material/physics constant) -- confirm it is NOT a physics-constant violation.
- The helper test encodes intent (R9): asserts sampling range
... [+342 chars truncated]

### Assistant | 2026-06-22T20:17:42.702Z

I'll review this safety-relevant frontend change systematically. Let me read all the files end-to-end first.

### Assistant | 2026-06-22T20:17:43.183Z

[tool_use: Read]

### Assistant | 2026-06-22T20:17:43.645Z

[tool_use: Read]

### User | 2026-06-22T20:17:44.068Z

[tool_result] 1	import { useState, useMemo, useCallback, useRef, useEffect } from "react";
2	import {
3	  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
4	  ReferenceLine, ResponsiveContainer, BarChart, Bar, Cell,
5	} from "recharts";
6	import { Card } from "../ui";
7	import type { SfcCalculateResult } from "../../types/sfc";
8	import type { SfcParams } from "./ParameterPanel";
9	import type { MachineEn
... [+13501 chars truncated]

### Assistant | 2026-06-22T20:17:44.128Z

[tool_use: Read]

### Assistant | 2026-06-22T20:17:44.544Z

[tool_use: Read]

### User | 2026-06-22T20:17:44.636Z

[tool_result] 1	/**
2	 * Tool-life curve builder (QX3 -- de-inline Taylor physics from the UI).
3	 *
4	 * The SFC "Charts" tab used to draw the tool-life curve from a TAYLOR {n,C} Record
5	 * inlined in the component + a client-side `Math.pow(C/v, 1/n)`. That violates the
6	 * quebec rule "never inline physics/safety constants in components" AND risked a
7	 * curve that diverged from the canonical engine. This 
... [+3167 chars truncated]

### User | 2026-06-22T20:17:45.141Z

[tool_result] 1	/**
2	 * toolLifeCurve -- the canonical tool-life curve builder (QX3). Tests the intent
3	 * (R9): speeds are sampled around the operating point and ALWAYS include the
4	 * current speed; every point comes from the injected canonical fetcher (never an
5	 * inlined Taylor formula); the request carries feed/depth/material/tool; one
6	 * failed/non-plottable point degrades the curve, it does not ki
... [+5157 chars truncated]

### User | 2026-06-22T20:17:45.419Z

[tool_result] 1	import { useState, useCallback, useMemo, useEffect } from "react";
2	import SfcGateNotice from "../components/sfc/SfcGateNotice";
3	import SmartMaterialSelector from "../components/sfc/SmartMaterialSelector";
4	import OperationSelector from "../components/sfc/OperationSelector";
5	import SmartToolSelector from "../components/sfc/SmartToolSelector";
6	import SmartMachineSelector from "../componen
... [+15921 chars truncated]

### Assistant | 2026-06-22T20:17:50.230Z

Now let me verify the type contracts and the API surface to confirm the wiring is correct. Let me check the types and the sfcApi.

### Assistant | 2026-06-22T20:17:50.749Z

[tool_use: Read]

### Assistant | 2026-06-22T20:17:51.216Z

[tool_use: Read]

### User | 2026-06-22T20:17:51.778Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\api\sfc.ts' was already read 9m ago in this session and is unchanged (mtime 1782138366619). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T20:17:52.063Z

[tool_result] 1	/** Core speed & feed calculation request */
2	export interface SfcCalculateRequest {
3	  material: string;
4	  operation: string;
5	  material_hardness?: number;
6	  tool_material?: string;
7	  tool_diameter?: number;
8	  number_of_teeth?: number;
9	  depth?: number;
10	  width?: number;
11	  coolant?: string;
12	}
13	
14	/** Speed & feed result */
15	export interface SfcCalculateResult {
16	  
... [+2305 chars truncated]

### Assistant | 2026-06-22T20:17:57.322Z

The read-once guard says I read sfc.ts before, but I don't actually have its content in my current context window (this is a fresh task). Let me grep for the toolLife method to verify the wrapper contract.

### Assistant | 2026-06-22T20:17:57.924Z

[tool_use: Grep]

### User | 2026-06-22T20:17:59.414Z

[tool_result] 67-    post<DeflectionRequest, Wrapped<DeflectionResult>>("/deflection", params, signal),
68-
69-  powerTorque: (params: PowerTorqueRequest, signal?: AbortSignal) =>
70-    post<PowerTorqueRequest, Wrapped<PowerTorqueResult>>("/power-torque", params, signal),
71-
72-  surfaceFinish: (params: SurfaceFinishRequest, signal?: AbortSignal) =>
73-    post<SurfaceFinishRequest, Wrapped<SurfaceFinishResul
... [+200 chars truncated]

### Assistant | 2026-06-22T20:18:02.122Z

Now let me verify the `Wrapped<T>` type and the `post` helper to confirm `.result` unwrapping is correct, and confirm the old inlined Taylor constants are truly gone from the component.

### Assistant | 2026-06-22T20:18:03.515Z

[tool_use: Grep]

### User | 2026-06-22T20:18:04.567Z

[tool_result] 54:type Wrapped<T> = { result: T; safety?: SfcCalculateResult["safety"]; meta?: Record<string, unknown> };
58:    post<SfcCalculateRequest, Wrapped<SfcCalculateResult>>("/calculate", params, signal),
61:    post<CycleTimeRequest, Wrapped<CycleTimeResult>>("/cycle-time", params, signal),
64:    post<EngagementRequest, Wrapped<EngagementResult>>("/engagement", params, signal),
67:    post<Deflection
... [+346 chars truncated]

### Assistant | 2026-06-22T20:18:05.708Z

[tool_use: Grep]

### User | 2026-06-22T20:18:07.446Z

[tool_result] 33:// NOTE (QX3): the Taylor {n,C} constants + client-side life = (C/V)^(1/n) that used

### Assistant | 2026-06-22T20:18:14.181Z

The grep confirms the only remaining `TAYLOR`/`Math.pow`/`(C/V)^(1/n)` reference in AdvancedCharts.tsx is the explanatory NOTE comment at line 33 — no live inlined constants or client-side physics computation. The `Wrapped<T>` type confirms `.result` unwrapping is correct (line 54: `{ result: T; ... }`), and `toolLife` returns `Wrapped<ToolLifeResult>` so `.then((w) => w.result)` yields `ToolLifeResult` — type-safe.

Let me do a final sanity check on a couple of edge cases: confirm there's no `material` undefined issue (material is `string | undefined` threaded through), and verify `params.tool_diameter` exists on `SfcParams`, and that `result.feed_per_tooth` / `result.cutting_speed` exist (already confirmed in `SfcCalculateResult`). Let me check the `SfcParams` type and confirm `wear_rate` being required in the test fixtures matches the contract.

### Assistant | 2026-06-22T20:18:15.825Z

[tool_use: Grep]

### User | 2026-06-22T20:18:16.757Z

[tool_result] 5:export interface SfcParams {
6:  tool_diameter: number;
8:  depth: number;
10:  tool_material: string;
26:  Conservative: { depth: 0.5, width: 2 },
48:      if (field === "tool_material" || field === "coolant") {
70:      depth: preset?.depth ?? +(base.depth * scale).toFixed(2),
72:      tool_diameter: base.tool_diameter,
138:          value={displayVal(params.tool_diameter)}
139:          onCha
... [+269 chars truncated]

### Assistant | 2026-06-22T20:18:47.121Z

Confirmed: `SfcParams` has `tool_diameter: number`, `depth: number`, `tool_material: string`. All field references in `AdvancedCharts.tsx` are type-safe:
- `params.depth` (line 141) → `number` ✓
- `params.tool_material` (line 143) → `string`, threaded as optional `tool_material?: string` in `ToolLifeCurveBase` ✓
- `params.tool_diameter` (line 157) → `number` ✓
- `material?.id` (SfcCalculatorPage line 379) → `string | undefined`, matches `material?: string` prop ✓

I have read all four target files end-to-end plus the supporting contracts (`types/sfc.ts`, `api/sfc.ts` wrapper, `ParameterPanel` SfcParams). I have enough to render a verdict.

---

VERDICT: PASS

summary: The change cleanly de-inlines Taylor physics from the SFC charts UI. The inlined `TAYLOR {n,C}` Record and client-side `Math.pow(C/v, 1/n)` are fully removed (only an explanatory comment remains at AdvancedCharts.tsx:33); the tool-life curve is now sourced per-speed from the canonical `sfcApi.toolLife -> prism_calc:tool_life` endpoint via a pure, fetcher-injected builder. Loading/error/empty states, unmount cancellation, type-safe threading, and intent-encoding tests are all present and correct.

findings:
  - none (P0/P1/P2)

What I verified (auditable basis for the PASS):

1. Inlined physics GONE — Grep for `TAYLOR|Math\.pow|\^\(1/n\)|tool_life_minutes|life =` in `AdvancedCharts.tsx` returns only the NOTE comment at line 33. No `n`/`C` constant Record, no `(C/v)^(1/n)`, no client-side life recompute. The single physics-looking expression remaining is the geometric `Ra = f^2/(32r)` in `generateSurfaceFinishData` (AdvancedCharts.tsx:51) — see point 4.

2. Curve is genuinely canonical — `ToolLifeChart` (AdvancedCharts.tsx:174-195) calls `buildToolLifeCurve(base, (req) => sfcApi.toolLife(req).then((w) => w.result))`. Confirmed `Wrapped<T> = { result: T; ... }` (api/sfc.ts:54) and `toolLife: (params: ToolLifeRequest) => post<..., Wrapped<ToolLifeResult>>("/tool-life", ...)` (api/sfc.ts:75-76), so `.then(w
... [+3132 chars truncated]
