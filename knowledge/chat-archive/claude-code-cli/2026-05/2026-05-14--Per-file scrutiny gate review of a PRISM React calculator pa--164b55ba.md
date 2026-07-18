---
type: "chat-session"
source: "claude-code-cli"
session_id: "164b55ba-b212-49fb-9c09-bbe511ca233c"
title: "Per-file scrutiny gate review of a PRISM React calculator panel I just wired to "
date: "2026-05-14"
first_ts: "2026-05-14T20:19:33.838Z"
last_ts: "2026-05-14T20:28:13.066Z"
cwd: "H:\\prism"
messages: 35
user_msgs: 14
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/164b55ba-b212-49fb-9c09-bbe511ca233c/subagents/agent-a1ffbc43201ba2966.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# Per-file scrutiny gate review of a PRISM React calculator panel I just wired to 

> **claude-code-cli** | 2026-05-14 | 35 msgs (14 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/164b55ba-b212-49fb-9c09-bbe511ca233c/subagents/agent-a1ffbc43201ba2966.jsonl`

## Transcript

### User | 2026-05-14T20:19:33.838Z

Per-file scrutiny gate review of a PRISM React calculator panel I just wired to the backend. Weight your review toward: integration correctness, state management, error/fallback handling, and whether the preserved local offline math is byte-identical to the original.

FILE: H:/prism/mcp-server/web/src/components/calculator/WireEdmCostBreakdownPanel.tsx
Run `git diff HEAD -- mcp-server/web/src/components/calculator/WireEdmCostBreakdownPanel.tsx` from H:/prism to see what changed. Read the WHOLE file end-to-end.

CONTRACT (what this change must do):
Wire this previously pure-local-math panel to the backend `prism_edm:wedm_estimate_cost` action via `weCostEstimate()` in `H:/prism/mcp-server/web/src/api/wireEdm.ts`, KEEPING the local `estimateCost()` function as an offline fallback. Pattern (must match the sibling WireEdmFeasibilityPanel.tsx which was wired the same way): compute local model first; call the API; on success map the engine result onto the panel's display shape; on ANY failure (offline, HTTP/parse error, dispatcher error envelope, shape mismatch) fall back to local; show a LIVE/OFFLINE source badge.

VERIFY:
1. `estimateCost()` (the local model) must be UNCHANGED in computational behavior vs HEAD — diff it carefully. The only acceptable change is the `setup_cost`/`SETUP_HOURS` constant extraction (0.5 hrs — confirm the value is identical).
2. `buildCostInput()` must produce valid `WeCostEstimateParams` (see wireEdm.ts). It reuses `local.machine_time_hrs` as `cutting_hrs` — verify that's sound (the panel owns the time model, the engine owns the cost model; the engine route bridge in H:/prism/mcp-server/src/tools/dispatchers/edmDispatcher.ts case "wedm_estimate_cost" defaults cutting_hrs to 1 if absent). Verify `parseWireType()` correctly maps panel wire keys ("brass_0.25","coated_0.20","moly_0.18") to the backend WireType enum (brass|coated|molybdenum|tungsten|zinc_coated — see EDMCostDocumentationEngine.ts) and parses the diameter.
3. `mapCostResponse()` m
... [+1343 chars truncated]

### Assistant | 2026-05-14T20:19:38.826Z

I'll review this file thoroughly. Let me start by examining the diff and the file itself, along with the contract reference files.

### Assistant | 2026-05-14T20:19:39.719Z

[tool_use: Bash]

### Assistant | 2026-05-14T20:19:40.382Z

[tool_use: Read]

### User | 2026-05-14T20:19:43.831Z

[tool_result] 1	/**
2	 * WireEdmCostBreakdownPanel — Wire EDM cost estimation and breakdown.
3	 * Shows: wire cost, machine time, power, consumables, labor, per-pass progression.
4	 * Wire: prism_edm:wedm_estimate_cost (via /api/v1/edm/cost → weCostEstimate).
5	 *
6	 * Wiring contract: the panel computes its local time/cost model first — that is
7	 * the offline fallback AND it supplies the cutting-hours estima
... [+20507 chars truncated]

### User | 2026-05-14T20:20:06.856Z

[tool_result] warning: in the working copy of 'mcp-server/web/src/components/calculator/WireEdmCostBreakdownPanel.tsx', LF will be replaced by CRLF the next time Git touches it
diff --git a/mcp-server/web/src/components/calculator/WireEdmCostBreakdownPanel.tsx b/mcp-server/web/src/components/calculator/WireEdmCostBreakdownPanel.tsx
index 8729976c4..36813aa8a 100644
--- a/mcp-server/web/src/components/calculator
... [+11078 chars truncated]

### Assistant | 2026-05-14T20:20:12.436Z

Now let me read the contract reference files to verify the integration against actual backend interfaces.

### Assistant | 2026-05-14T20:20:13.423Z

[tool_use: Read]

### Assistant | 2026-05-14T20:20:13.793Z

[tool_use: Read]

### User | 2026-05-14T20:20:20.583Z

[tool_result] 1	/**
2	 * Wire EDM Calculator API — calls edmDispatcher (prism_edm) via /api/v1/edm/*
3	 *
4	 * Routes:
5	 *   /calculator-solve  — 6-engine orchestration (settings→multipass→cutting→corners→surface→cost)
6	 *   /wire              — legacy quick wire settings
7	 *   /multipass          — full multi-pass strategy
8	 *   /cost               — cost estimation
9	 *   /machines           — wire EDM ma
... [+26220 chars truncated]

### User | 2026-05-14T20:20:21.300Z

[tool_result] 1	/**
2	 * WireEdmFeasibilityPanel — Wire EDM feasibility assessment.
3	 * Shows: conductivity check, tolerance achievability, min inside radius,
4	 *        taper feasibility, overall go/no-go gate.
5	 * Wire: prism_edm:wedm_assess_feasibility
6	 */
7	
8	import { useState, useCallback } from 'react';
9	import { weFeasibility, type WeFeasibilityInput, type WeFeasibilityResult } from '../../api/wir
... [+23985 chars truncated]

### Assistant | 2026-05-14T20:20:25.480Z

Now let me check the backend dispatcher and engine to verify the contract.

### Assistant | 2026-05-14T20:20:26.457Z

[tool_use: Bash]

### Assistant | 2026-05-14T20:20:27.988Z

[tool_use: Bash]

### User | 2026-05-14T20:20:48.728Z

[tool_result] 236:  "wedm_estimate_cost", "wedm_generate_setup_sheet", "wedm_full_documentation",
798:          case "wedm_estimate_cost": {

### User | 2026-05-14T20:20:56.959Z

[tool_result] mcp-server/src/routes/edm.ts:257:  router.post("/cost", requirePermission("edm:read"), async (req, res, next) => {

### Assistant | 2026-05-14T20:21:00.040Z

[tool_use: Read]

### Assistant | 2026-05-14T20:21:00.814Z

[tool_use: Read]

### User | 2026-05-14T20:21:05.657Z

[tool_result] 790	            });
791	            result = engine.generate_gcode({ ...params, profiles: gcodeProfiles });
792	            break;
793	          }
794	
795	          // =================================================================
796	          // WEDM-P2P PIPELINE: 11. EDMCostDocumentationEngine
797	          // =================================================================
798	          c
... [+6405 chars truncated]

### User | 2026-05-14T20:21:05.901Z

[tool_result] 250	    async (req, res, next) => {
251	      try { res.json(await invoke("wedm_generate_gcode", req.body)); } catch (e) { next(e); }
252	    },
253	  );
254	
255	  // ── WEDM Pipeline: Cost + Documentation ─────────────────────────────
256	
257	  router.post("/cost", requirePermission("edm:read"), async (req, res, next) => {
258	    try { res.json(await invoke("wedm_estimate_cost", req.body)); } 
... [+1458 chars truncated]

### Assistant | 2026-05-14T20:21:08.967Z

Now let me check the EDMCostDocumentationEngine interfaces to verify the field mapping.

### Assistant | 2026-05-14T20:21:09.700Z

[tool_use: Read]

### User | 2026-05-14T20:21:11.633Z

[tool_result] 1	/**
2	 * EDMCostDocumentationEngine - WEDM cost estimate compatibility surface.
3	 *
4	 * Restores the cost/documentation engine expected by WEDM ERP routes while
5	 * using the current canonical WEDM constants for wire cost, shop rates, and
6	 * overhead/margin defaults.
7	 */
8	
9	import {
10	  WEDM_DEFAULT_RATES,
11	  lookupWireCostPerM,
12	} from "../physics/wedm-constants.js";
13	
14	export
... [+5356 chars truncated]

### Assistant | 2026-05-14T20:21:15.824Z

Let me check the engine's `estimateCost` method to verify how it handles the `total_per_part` (per-part vs quantity) and the wire cost computation.

### Assistant | 2026-05-14T20:21:17.453Z

[tool_use: Bash]

### User | 2026-05-14T20:21:34.953Z

[tool_result] 42:  wire_speed_mm_per_min: number;
49:  length_m: number;
50:  weight_kg: number;
132:  total_per_part: number;
133:  quantity_breaks: Array<{ qty: number; setup_amortized: number; cost_per_part: number; total: number }>;
135:  cost_drivers: Array<{ category: string; amount: number; pct_of_total: number }>;
224:  const lengthM = Math.max(0, input.wire_speed_mm_per_min * input.cutting_hrs * 60) / 
... [+256 chars truncated]

### Assistant | 2026-05-14T20:21:38.271Z

[tool_use: Read]

### User | 2026-05-14T20:21:40.706Z

[tool_result] 280	    if (cfg.per_cm2 && operation.area_cm2) cost += cfg.per_cm2 * operation.area_cm2;
281	    if (operation.batch_qty && operation.batch_qty > 1) cost /= Math.sqrt(operation.batch_qty);
282	    return { name: cfg.notes, op: operation.op, cost: money(cost), notes: cfg.notes };
283	  });
284	  return { items, total: money(items.reduce((sum, item) => sum + item.cost, 0)) };
285	}
286	
287	function
... [+3210 chars truncated]

### Assistant | 2026-05-14T20:21:43.379Z

I have everything I need. Let me verify the HEAD version of `estimateCost()` to confirm it's byte-identical aside from the constant extraction.

### Assistant | 2026-05-14T20:21:44.407Z

[tool_use: Bash]

### User | 2026-05-14T20:21:54.640Z

[tool_result] // Wire weight: kg per km by diameter
const WIRE_WEIGHT: Record<number, number> = {
  0.25: 0.35, 0.20: 0.22, 0.10: 0.056, 0.18: 0.23,
};

function estimateCost(
  material: string, thickness_mm: number, profile_length_mm: number,
  wire_type: string, num_passes: number, machine_rate_usd_hr: number,
): CostResult {
  const wire_dia = parseFloat(wire_type.split('_')[1] ?? '0.25') || 0.25;
  const w
... [+3156 chars truncated]

### Assistant | 2026-05-14T20:21:59.370Z

I now have a complete picture. Let me do final verification of the engine's `calculateWireCost` to confirm the `length_m` semantics, since `mapCostResponse` maps `a.wire.length_m` → `wire_length_m`.

### Assistant | 2026-05-14T20:22:00.753Z

[tool_use: Read]

### User | 2026-05-14T20:22:03.169Z

[tool_result] 218	      .filter(([, hrs]) => hrs > 0)
219	      .map(([phase, hrs]) => ({ phase, hrs, cost: money(hrs * rate) })),
220	  };
221	}
222	
223	function calculateWireCost(input: WireInput): WireCost {
224	  const lengthM = Math.max(0, input.wire_speed_mm_per_min * input.cutting_hrs * 60) / 1000;
225	  const weightKg = wireMassKg(lengthM, input.wire_diameter_mm, input.wire_type);
226	  const costPerM 
... [+763 chars truncated]

### Assistant | 2026-05-14T20:28:13.066Z

I have everything needed for a complete review.

---

# Per-File Scrutiny Review — WireEdmCostBreakdownPanel.tsx

**File:** `H:/prism/mcp-server/web/src/components/calculator/WireEdmCostBreakdownPanel.tsx`
**Grade: PASS** (with one P1 worth fixing and several P2 notes)

The wiring is correct, matches the sibling `WireEdmFeasibilityPanel.tsx` pattern, and the offline fallback is intact. No P0 issues. One P1 (a real per-part cost-model mismatch the operator will see) and a handful of P2/P3 notes.

---

## VERIFY checklist results

### 1. `estimateCost()` unchanged — PASS
Diffed the HEAD version (`git show HEAD:...`) against the working copy line-by-line. The **only** change inside `estimateCost()` is line 126: `const setup_cost = (0.5) * machine_rate_usd_hr;` → `const setup_cost = SETUP_HOURS * machine_rate_usd_hr;`, and `SETUP_HOURS = 0.5` (line 60). Value is identical, computation is byte-identical. Every other line — per-pass loop, speed model, wire/weight/total math, breakdown, quantity_breaks, return shape — is unchanged. Confirmed.

### 2. `buildCostInput()` produces valid `WeCostEstimateParams` — PASS
- All fields (`material`, `wire_type`, `wire_diameter_mm`, `machine_rate_per_hr`, `cutting_hrs`, `setup_hrs`, `num_profiles`, `quantity`, `thickness_mm`, `profile_length_mm`) are valid keys on `WeCostEstimateParams` (the interface has `[key: string]: unknown`, and all named keys exist at wireEdm.ts:466-487). Type-checks.
- **`cutting_hrs: local.machine_time_hrs` is sound.** The panel owns the time model; the engine owns the cost model. The dispatcher bridge (edmDispatcher.ts:813, 822, 827) feeds `params.cutting_hrs` into all three of `machine_time.cutting_hrs`, `wire.cutting_hrs`, and `consumables.cutting_hrs`, defaulting to `1` only if absent — here it's always present and non-negative (`total_time/60`, total_time ≥ 0). Correct.
- **`parseWireType()` is correct.** Panel keys are `brass_0.25`, `brass_0.20`, `brass_0.10`, `coated_0.25`, `coated_0.20`, `moly_0.18` (
... [+7524 chars truncated]
