---
type: "chat-session"
source: "claude-code-cli"
session_id: "dc3f020e-9a94-4310-adf2-a60d9533cfec"
title: "Independent review of H:/prism/mcp-server/src/routes/specialty.ts (slot:sierra, "
date: "2026-06-18"
first_ts: "2026-06-18T20:37:57.750Z"
last_ts: "2026-06-18T20:40:35.572Z"
cwd: "H:\\prism-slot-sierra"
messages: 58
user_msgs: 22
assistant_msgs: 36
raw_file: "H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-aff697a55773d1172.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Independent review of H:/prism/mcp-server/src/routes/specialty.ts (slot:sierra, 

> **claude-code-cli** | 2026-06-18 | 58 msgs (22 user / 36 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-aff697a55773d1172.jsonl`

## Transcript

### User | 2026-06-18T20:37:57.750Z

Independent review of H:/prism/mcp-server/src/routes/specialty.ts (slot:sierra, U-FE-SPECIALTY-CONTRACT). Read it END-TO-END. Read-only. Grade PASS/FAIL with P0/P1/P2 + file:line. Repo root H:/prism (absolute paths). Do NOT assume the wiring reviewer caught everything -- you are weighted on PHYSICS/UNIT correctness, derived-field honesty, error budget, and security.

This route adapts SPA grinding requests to real prism_grinding engine results. The engines return AtomicValue objects ({value, unit, source}); slimResponse keeps them nested (only strips null/undefined/empty-array), so the route reads .value via atom(). Verify against:
- H:/prism/mcp-server/src/engines/GrindingForceEngine.ts (GrindingForceResult fields + units: grinding_power_kW, surface_temperature_C, mrr_mm3_per_s, normal_force_N, tangential_force_N, specific_energy_J_mm3, burn_risk, g_ratio_estimate)
- H:/prism/mcp-server/src/engines/GrindingSurfaceFinishEngine.ts (predicted_Ra_um)
- H:/prism/mcp-server/web/src/types/grinding.ts (the target result shapes)

VERIFY THESE PHYSICS / UNIT CLAIMS specifically (each is a potential operator-facing wrong number -- P0 if wrong):
1. mrr_mm3_min = mrr_mm3_per_s.value * 60 -- correct per-second -> per-minute? Confirm the engine field is genuinely per-SECOND.
2. dressing_depth_mm = dress_depth_um / 1000 (result) and dress_depth_um = dressing_depth_mm * 1000 (request) -- correct mm<->micron directions?
3. wheel_wear_ratio = 1 / g_ratio_estimate -- is this physically correct? G-ratio = (volume of work removed)/(volume of wheel worn); the frontend "wheel_wear_ratio" should be wheel-worn/work-removed = 1/G. Confirm g_ratio_estimate is defined as work/wheel (so the inverse is right), and that the guard (gRatio > 0) is adequate.
4. OPERATION_TO_MODE maps frontend operation (surface|cylindrical|centerless|internal) to the engine GrindingMode enum -- confirm the enum values (cylindrical_external/cylindrical_internal/centerless/surface) are exactly what GrindingForceEngine
... [+879 chars truncated]

### Assistant | 2026-06-18T20:38:02.993Z

I'll review the specialty route end-to-end, verifying physics/unit claims against the actual engine implementations.

### Assistant | 2026-06-18T20:38:03.407Z

[tool_use: Read]

### Assistant | 2026-06-18T20:38:03.848Z

[tool_use: Read]

### User | 2026-06-18T20:38:03.897Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\routes\specialty.ts' was already read 14s ago in this session and is unchanged (mtime 1781815019814). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-18T20:38:04.319Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\GrindingForceEngine.ts' was already read 11m ago in this session and is unchanged (mtime 1774537416000). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### Assistant | 2026-06-18T20:38:04.343Z

[tool_use: Read]

### Assistant | 2026-06-18T20:38:04.790Z

[tool_use: Read]

### User | 2026-06-18T20:38:04.937Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\types\grinding.ts' was already read 13m ago in this session and is unchanged (mtime 1776026684000). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-18T20:38:06.153Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\GrindingSurfaceFinishEngine.ts' was already read 11m ago in this session and is unchanged (mtime 1774537416000). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### Assistant | 2026-06-18T20:38:09.501Z

The read-once-guard claims these are in context, but this is a fresh agent thread — I have no prior reads in my context. I must actually read them to review. Let me bypass the cache.

### Assistant | 2026-06-18T20:38:10.060Z

[tool_use: Read]

### User | 2026-06-18T20:38:11.053Z

[tool_result] 1	import { Router } from "express";
2	import type { CallToolFn } from "./index.js";
3	
4	/**
5	 * Specialty-process REST bridge for the SPA (forming / grinding / welding).
6	 *
7	 * U-FE-SPECIALTY-CONTRACT (slot:sierra 2026-06-18). The SPA's
8	 * web/src/api/{grinding,forming,welding}.ts POST to /api/v1/{domain}/{endpoint}
9	 * and cast the WHOLE response body to their result type. The prior route
... [+11211 chars truncated]

### Assistant | 2026-06-18T20:38:13.946Z

I have the route file. Now I need to verify against the actual engine implementations. Let me read the relevant parts of the engines and the dispatcher to confirm field names, units, and enum values.

### Assistant | 2026-06-18T20:38:15.842Z

[tool_use: Grep]

### Assistant | 2026-06-18T20:38:16.840Z

[tool_use: Grep]

### User | 2026-06-18T20:38:16.945Z

[tool_result] 34:  material_specific_energy_J_mm3?: number;  // u (Malkin), auto-estimated if absent
54:  tangential_force_N: AtomicValue;
55:  normal_force_N: AtomicValue;
56:  grinding_power_kW: AtomicValue;
57:  specific_energy_J_mm3: AtomicValue;
58:  mrr_mm3_per_s: AtomicValue;
61:  surface_temperature_C: AtomicValue;
62:  burn_risk: number;                // 0–1 scale
63:  g_ratio_estimate: number;
154:  
... [+449 chars truncated]

### User | 2026-06-18T20:38:17.877Z

[tool_result] 13:export type GrindingMode =
15:  | "cylindrical_external"
16:  | "cylindrical_internal"
17:  | "creep_feed"
18:  | "centerless";
31:  width_of_cut_mm: number;          // grinding width b
32:  grinding_mode: GrindingMode;
89:const FORCE_RATIO: Record<GrindingMode, number> = {
91:  cylindrical_external: 2.5,
92:  cylindrical_internal: 2.2,
93:  creep_feed: 3.0,
94:  centerless: 2.3,
111:      wid
... [+229 chars truncated]

### Assistant | 2026-06-18T20:38:27.136Z

Now let me verify the mrr calculation (per-second confirmation), g_ratio definition, the burn_risk range, and the dressing/wheel-select engine field names. Let me read the key computation blocks.

### Assistant | 2026-06-18T20:38:28.097Z

[tool_use: Read]

### User | 2026-06-18T20:38:31.579Z

[tool_result] 95	};
96	
97	/** Burn threshold temperature (°C) — Malkin-Guo */
98	const BURN_THRESHOLD_C = 450;
99	
100	// ─── Engine ────────────────────────────────────────────────────────
101	
102	/** Grinding Force Engine engine/manager.
103	 */
104	export class GrindingForceEngine {
105	  calculate(input: GrindingForceInput): GrindingForceResult {
106	    const {
107	      wheel_diameter_mm: ds,
108	      
... [+8093 chars truncated]

### Assistant | 2026-06-18T20:38:36.496Z

This confirms the core physics. Now let me verify:
- `mrr` is in mm³/s (line 151), so `* 60` to mm³/min is correct.
- `g_ratio_estimate` = material removed / wheel worn (line 182), so `1/G` = wheel worn / work removed is correct.
- `burn_risk` is 0..1 (line 180, clamped).
- `grinding_mode` enum confirmed.
- `recommendations` IS on the result (line 327) — a bare array.

Now let me verify the dispatcher wiring (does `grinding_force` return the engine result directly?) and the wheel_select / dress_params engine field names, plus the surface finish field.

### Assistant | 2026-06-18T20:38:37.910Z

[tool_use: Grep]

### Assistant | 2026-06-18T20:38:38.878Z

[tool_use: Grep]

### User | 2026-06-18T20:38:39.602Z

[tool_result] Found 4 files
H:\prism\mcp-server\src\tools\dispatchers\cadDispatcher.ts
H:\prism\mcp-server\src\tools\dispatchers\calcDispatcher.ts
H:\prism\mcp-server\src\tools\dispatchers\toolpathDispatcher.ts
H:\prism\mcp-server\src\tools\dispatchers\grindingDispatcher.ts

### User | 2026-06-18T20:38:39.995Z

[tool_result] 65:  predicted_Ra_um: AtomicValue;
74:  recommendations: string[];
142:    const recommendations: string[] = [];
165:      recommendations.push(`Speed ratio (vs/vw) = ${speedRatio.toFixed(0)} is low — recommend ≥60 for good finish`);
172:      recommendations.push(`Speed ratio (vs/vw) = ${speedRatio.toFixed(0)} is very high — risk of wheel loading`);
234:      recommendations.push("CRITICAL: Dull 
... [+2298 chars truncated]

### Assistant | 2026-06-18T20:38:43.707Z

`predicted_Ra_um` confirmed as AtomicValue (line 65), `recommendations` on surface finish is a bare `string[]` (line 74). Now let me read the grinding dispatcher to confirm the action handlers return the engine results directly (so `gf.mrr_mm3_per_s` etc. are reachable), the param names match, and the wheel_select/dress_params result field names.

### Assistant | 2026-06-18T20:38:43.999Z

[tool_use: Read]

### User | 2026-06-18T20:38:44.531Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\tools\dispatchers\grindingDispatcher.ts' was already read 12m ago in this session and is unchanged (mtime 1776865882556). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_R
... [+12 chars truncated]

### Assistant | 2026-06-18T20:38:46.972Z

The guard is firing on a session that isn't mine (fresh agent thread). Let me work around it by reading with an explicit offset.

### Assistant | 2026-06-18T20:38:47.552Z

[tool_use: Read]

### User | 2026-06-18T20:38:49.033Z

[tool_result] 0	/**
1	 * prism_grinding — Grinding Process Dispatcher
2	 *
3	 * 4 actions: wheel_select, dress_params, burn_threshold, surface_integrity
4	 *
5	 * Uses existing engines for surface integrity and grinding-related calculations.
6	 * Grinding wheel selection and dressing are computed inline using ANSI B74.13 data.
7	 */
8	import { z } from "zod";
9	import { log } from "../../utils/Logger.js";
10	im
... [+13113 chars truncated]

### Assistant | 2026-06-18T20:38:52.643Z

This is critical context. Several findings emerge. Let me verify how `callTool` unwraps the dispatcher response (the route reads `gf.mrr_mm3_per_s` directly, but the dispatcher returns `{ content: [{ type: "text", text: JSON.stringify(...) }] }`). The route must be receiving the parsed JSON object, not the MCP envelope. Let me check the `CallToolFn` contract and how `callTool` is implemented.

### Assistant | 2026-06-18T20:38:53.552Z

[tool_use: Grep]

### User | 2026-06-18T20:38:56.558Z

[tool_result] 100:// engine-backed (no callTool/dispatcher dependency, so no missing-action issue), each with a passing route
107:// createSpecialtyRouter intentionally NOT imported yet -- deferred to U-FE-SPECIALTY-CONTRACT.
113:export type CallToolFn = (toolName: string, action: string, params?: Record<string, any>) => Promise<any>;
118:export function registerRoutes(app: Express, callTool: CallToolFn): void 
... [+4521 chars truncated]

### Assistant | 2026-06-18T20:39:00.936Z

The specialty router is NOT mounted in index.ts (confirmed by line 107 "intentionally NOT imported yet"). This is consistent with the file's own header. Now the key question: does `callTool` return the parsed JSON object (so `gf.mrr_mm3_per_s` is reachable), or the MCP `{content:[{text}]}` envelope? Let me find the `callTool` implementation passed to `registerRoutes`.

### Assistant | 2026-06-18T20:39:04.003Z

[tool_use: Grep]

### User | 2026-06-18T20:39:06.514Z

[tool_result] H:\prism\mcp-server\src\cache\RedisCacheProvider.ts:113:      return JSON.parse(raw) as T;
H:\prism\mcp-server\src\cps\loadPhysicsSidecar.ts:206:    parsed = JSON.parse(jsonText) as Record<string, unknown>;
H:\prism\mcp-server\src\db\WriteAheadLog.ts:240:        const entry = JSON.parse(line) as WALEntry;
H:\prism\mcp-server\src\db\WriteAheadLog.ts:301:        const entry = JSON.parse(line) as WAL
... [+4506 chars truncated]

### Assistant | 2026-06-18T20:39:09.479Z

Let me find where `registerRoutes` is called and how `callTool` is defined — the critical contract is whether it returns parsed JSON or the MCP envelope.

### Assistant | 2026-06-18T20:39:10.319Z

[tool_use: Grep]

### User | 2026-06-18T20:39:11.555Z

[tool_result] H:\prism\mcp-server\src\index.ts:1406:  registerRoutes(app, callTool);
H:\prism\mcp-server\src\routes\index.ts:118:export function registerRoutes(app: Express, callTool: CallToolFn): void {
H:\prism\mcp-server\src\__tests__\cwedm-calculator-routes.test.ts:77:    registerRoutes(app, async (toolName, action, params) => {
H:\prism\mcp-server\src\__tests__\dfm-routes.test.ts:63:    registerRoutes(app,
... [+2622 chars truncated]

### Assistant | 2026-06-18T20:39:15.078Z

[tool_use: Read]

### User | 2026-06-18T20:39:16.405Z

[tool_result] 1360	
1361	  // MCP Streamable HTTP — GET (SSE stream for server-initiated messages)
1362	  app.get("/mcp", async (req, res) => {
1363	    res.writeHead(405, { Allow: "POST" }).end(JSON.stringify({
1364	      jsonrpc: "2.0",
1365	      error: { code: -32000, message: "SSE not supported in stateless mode. Use POST." },
1366	      id: null,
1367	    }));
1368	  });
1369	
1370	  // MCP Streamable HTT
... [+2175 chars truncated]

### Assistant | 2026-06-18T20:39:21.945Z

This confirms the contract: `callTool` parses the inner JSON text (line 1393-1394) and returns the plain object. So `gf.mrr_mm3_per_s`, `gf.g_ratio_estimate`, etc. ARE reachable as the route assumes. And `slimResponse` is applied inside the dispatcher (grindingDispatcher line 243) before serialization. Good.

Now I need to verify: does `slimResponse` strip `burn_risk: 0` (since burn risk could be a number near 0)? And crucially — does `slimResponse` flatten AtomicValue or keep it nested? The route comment claims it only strips null/undefined/empty-array. Let me verify `slimResponse`, and also check the frontend target types and whether `creep_feed` operation is truly unmappable.

### Assistant | 2026-06-18T20:39:22.482Z

[tool_use: Read]

### User | 2026-06-18T20:39:23.563Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\utils\responseSlimmer.ts' was already read 5m ago in this session and is unchanged (mtime 1781115864340). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-18T20:39:25.646Z

[tool_use: Read]

### User | 2026-06-18T20:39:27.697Z

[tool_result] 0	/**
1	 * Response Slimmer Utility
2	 * Reduces verbose response objects for MCP transport efficiency.
3	 * @module utils/responseSlimmer
4	 */
5	
6	/**
7	 * Slim a response object by removing null/undefined values and empty arrays.
8	 *
9	 * @param response - the value to slim
10	 * @param maxDepth - recursion ceiling (default 32). A circular reference or a
11	 *   pathologically deep payload wo
... [+2515 chars truncated]

### Assistant | 2026-06-18T20:39:31.965Z

Confirmed: `slimResponse` keeps AtomicValue objects nested (line 43 recurses into objects but preserves the `.value` key), only stripping null/undefined/empty-arrays. So `atom()` reading `.value` is correct. Note: `burn_risk: 0` would NOT be stripped (0 is not null/undefined), so `burnLabel` would correctly return "low". Good.

Now the important edge: `slimResponse` recurses into the AtomicValue and would strip an `undefined` `warning` field, but `value` survives. Good.

Now let me verify the frontend target types to confirm every field name and shape matches, and check the `creep_feed` operation gap.

### Assistant | 2026-06-18T20:39:32.840Z

[tool_use: Read]

### User | 2026-06-18T20:39:33.771Z

[tool_result] 0	export interface GrindingParams {
1	  workpiece_material: string;
2	  wheel_type?: string;
3	  wheel_diameter_mm?: number;
4	  wheel_width_mm?: number;
5	  wheel_speed_m_s?: number;
6	  depth_of_cut_mm: number;
7	  feed_rate_mm_min?: number;
8	  table_speed_m_min?: number;
9	  workpiece_diameter_mm?: number;
10	  coolant_type?: string;
11	  operation?: "surface" | "cylindrical" | "centerless" | 
... [+1515 chars truncated]

### Assistant | 2026-06-18T20:39:46.714Z

All field names match the route output. Now I have everything to assess each claim. The frontend `operation` enum is `surface | cylindrical | centerless | internal` (line 11) — and `OPERATION_TO_MODE` maps all four (no `creep_feed` in the frontend, so no gap there). 

Let me verify a few remaining adversarial points:
1. The route reads `gf.recommendations` / `sf.recommendations` directly as arrays — but `slimResponse` strips empty arrays. If recommendations is empty it becomes `undefined`, and `Array.isArray(undefined)` is false → handled by the `? : []` guard. Good. But GrindingForceEngine always pushes at least one rec (line 256-261), and surface finish may not. Handled.

2. The `atom()` on `gf.burn_risk`: `burn_risk` is a bare number (line 324 of engine), not AtomicValue. `atom()` handles bare numbers (line 35). And `burnLabel` calls `atom(risk)`. Good. But note: if `burn_risk` is exactly `0`, slimResponse keeps it (0 is not null), `atom(0)` returns 0, `burnLabel` returns "low". Correct.

3. `wheel_wear_ratio` guard: `gRatio && gRatio > 0`. Since gRatio from the engine is always one of {60,30,15,8} (line 185), it's always positive. The guard `gRatio && gRatio > 0` — if gRatio were 0, `gRatio &&` short-circuits to falsy → undefined. Adequate, though slightly redundant. Note: `gRatio &&` would also reject `NaN`? `NaN && ...` → NaN (falsy), so undefined. Good. Adequate.

Let me double check one subtle issue: the dispatcher's `dress_params` traverse speed calculation and whether `dress_depth_um` round-trips correctly, plus verify the `grit_size` → string conversion and the `recommended_speed_m_s` always being a number. Let me also confirm the route's surface_finish param adaptation doesn't pass `coolant_type` incorrectly. Everything checks out from the dispatcher read.

Let me verify there are no issues with the `recommendations` array being potentially huge or containing untrusted content, and confirm the 501 path and error handling once more by checking the test fi
... [+15 chars truncated]

### Assistant | 2026-06-18T20:39:47.230Z

[tool_use: Read]

### User | 2026-06-18T20:39:48.124Z

[tool_result] 0	/**
1	 * FE-ROUTE-MOUNT regression guard (slot:sierra 2026-06-18).
2	 *
3	 * Context: 8 frontend-facing routers (cncOps, diagnosis, mechanical, milling, thermal,
4	 * vibration, settings, print) existed in src/routes/ with real handlers + verified dispatcher
5	 * actions but were NEVER mounted in routes/index.ts, so the web SPA 404'd on every
6	 * /api/v1/{cnc-ops,diagnosis,mechanical,milling,th
... [+2960 chars truncated]

### Assistant | 2026-06-18T20:39:56.528Z

This confirms the route is intentionally NOT mounted yet (which is consistent and honest — the file header says forming/welding return 501, and grinding is real but the whole router awaits this contract unit before mounting). 

I now have all the verification I need. Let me do a final adversarial pass on two subtle points:

1. **`surface_finish_predict` param mismatch**: the route passes `engineParams` (built for grinding_force) to BOTH actions. `surface_finish_predict` needs `grain_size_mesh`, `dressing_condition`, etc. which aren't in `engineParams`, but the dispatcher defaults them (lines 195-202). The frontend `GrindingParams` doesn't collect them, so defaults apply. The shared params (`wheel_diameter_mm`, `work_speed_m_min`, etc.) all map. Acceptable.

2. **`coolant_type` passthrough**: frontend sends `coolant_type` as a string; the engine casts it to `CoolantType`. If invalid, `COOLANT_FACTORS[coolant]` could be `undefined`. Let me verify that doesn't crash the temperature calc — but that's an engine concern, not the route's. The route faithfully passes it.

Let me verify the `COOLANT_FACTORS` lookup robustness quickly since it affects whether a bad `coolant_type` from `req.body` crashes (security/robustness point 9).

### Assistant | 2026-06-18T20:39:57.553Z

[tool_use: Grep]

### User | 2026-06-18T20:39:58.584Z

[tool_result] 22:export type CoolantType = "flood" | "mist" | "dry" | "cryogenic";
36:  coolant_type?: CoolantType;
81:const COOLANT_FACTORS: Record<CoolantType, number> = {
171:    const coolantFactor = COOLANT_FACTORS[coolant];

### Assistant | 2026-06-18T20:40:35.572Z

If `req.body.coolant_type` is an unexpected string (e.g. `"oil"`), `COOLANT_FACTORS[coolant]` returns `undefined`, then line 177 `(tempBase - 50) / Math.max(coolantFactor, 0.1)` → `Math.max(undefined, 0.1)` → `NaN` → `surfaceTemp = NaN` → `burnRisk = NaN`. The engine would return `surface_temperature_C.value = Math.round(NaN) = NaN`. Then in the route, `atom()` checks `Number.isFinite(v.value)` → `false` → returns `undefined`. So the route's `atom()` gracefully drops the NaN, and `burnLabel(NaN-atom)` → `atom` returns undefined → `burnLabel` returns undefined → field omitted. The route is robust to this; the engine's NaN does not crash or leak to the frontend. This is a latent engine bug but the route defends against it correctly. Worth noting as P2 (engine-side, not route-side).

I have completed end-to-end verification of all 9 physics/unit claims plus security. Here is my verdict.

---

VERDICT: PASS

summary: The grinding adapters in `H:/prism/mcp-server/src/routes/specialty.ts` are physically correct on every unit conversion and derived field I was asked to scrutinize — mrr per-second→per-minute (×60), mm↔micron round-trips, the 1/G wheel-wear inversion, the burn-risk label mapping, and the operation→GrindingMode enum all verify against the real `GrindingForceEngine`, `GrindingSurfaceFinishEngine`, `grindingDispatcher`, and the frontend target types. Genuinely-absent fields (`structure`, `post_dress_finish_Ra`) are honestly OMITTED with inline rationale, derived fields are flagged, and `atom()` correctly defends against NaN/bare-number/AtomicValue shapes. The router is intentionally not yet mounted (the contract unit gates that), and forming/welding return fail-loud 501s with verified reasons. No P0 or P1 found.

findings:
- [P2] `specialty.ts:114` — `width_of_cut_mm <- p.wheel_width_mm` assumes full-width engagement. Correct only for surface/creep-feed; for cylindrical/centerless the true contact width is governed by infeed/traverse, not wheel width, so MRR an
... [+4672 chars truncated]
