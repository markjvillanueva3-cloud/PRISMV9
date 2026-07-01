---
type: "chat-session"
source: "claude-code-cli"
session_id: "930f37b5-d5cf-4924-8d86-d7713730da3d"
title: "Review the dispatcher wiring for U-CSFH-10-DISPATCHER-WIRE: two new actions adde"
date: "2026-06-12"
first_ts: "2026-06-12T03:34:06.777Z"
last_ts: "2026-06-12T03:35:45.893Z"
cwd: "H:\\prism-slot-oscar"
messages: 41
user_msgs: 17
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism-slot-oscar/930f37b5-d5cf-4924-8d86-d7713730da3d/subagents/agent-a110cb336d69915a5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:04"
---

# Review the dispatcher wiring for U-CSFH-10-DISPATCHER-WIRE: two new actions adde

> **claude-code-cli** | 2026-06-12 | 41 msgs (17 user / 24 assistant) | cwd: H:\prism-slot-oscar
> Raw: `H:/.claude/projects/H--prism-slot-oscar/930f37b5-d5cf-4924-8d86-d7713730da3d/subagents/agent-a110cb336d69915a5.jsonl`

## Transcript

### User | 2026-06-12T03:34:06.777Z

Review the dispatcher wiring for U-CSFH-10-DISPATCHER-WIRE: two new actions added to the prism_calc dispatcher.

See the exact diff:
  command git -C H:/prism-slot-oscar --no-pager diff -- mcp-server/src/tools/dispatchers/calcDispatcher.ts

(Run that to see ONLY my additions -- the file is 11k lines; my change is +78 lines: 2 entries in the ACTIONS array inside the SFC cluster + 2 case handlers after `sfc_hsmadvisor_calibrate`.)

The actions wire the CSFH combinatorial harness family (pure modules at mcp-server/src/data/sfc-combinatorial-{driver,compare,baseline-params}.ts) into the dispatcher graph:
- `sfc_combinatorial_sweep`: drives a BOUNDED sample of the cell space through the real SFC engine + gates + citation (CombinatorialSpeedFeedHarnessDriver.withRealEngine().drive), then compares vs cited vendor rows (SpeedFeedCombinatorialComparatorEngine.compare). Returns { requested, drive tallies, compare report }.
- `sfc_baseline_generic_params`: self-contained drive -> compare -> deriveBaseline (SpeedFeedBaselineGenericParamsEngine.deriveBaseline). Returns { requested, drive tallies, baseline report }.

Already verified: tsc --noEmit clean on calcDispatcher.ts; a round-trip E2E (registering the real dispatcher, calling both actions, real engine drove 3 cells) PASSED.

Verify the wiring contract:
- Both action names are added to the ACTIONS array (the z.enum source) AND have a matching `case` -- no orphan action, no orphan case? Action names snake_case?
- The handlers follow the dispatcher convention: lazy `await import("../../data/...js")` (NOT top-level), the `result = { success: true, data: ... }; break;` return shape, params accessed defensively?
- The cell-count CLAMP: `Math.max(1, Math.min(64, Math.floor(Number(params?.maxCells) || 8)))` -- is this a sound bound? Does it correctly default (unset/0/NaN -> 8), floor a valid value, and cap at 64? Is bounding the real engine (~2.5s/cell) at 64 cells a defensible synchronous-action limit (vs the 1716-cell offline sw
... [+796 chars truncated]

### Assistant | 2026-06-12T03:34:10.498Z

I'll start by reading the diff and relevant files in parallel.

### Assistant | 2026-06-12T03:34:11.093Z

[tool_use: Read]

### Assistant | 2026-06-12T03:34:11.524Z

[tool_use: Read]

### User | 2026-06-12T03:34:12.229Z

[tool_result] 1	import { z } from "zod";
2	import { log } from "../../utils/Logger.js";
3	import { hookExecutor, type HookPhase } from "../../engines/HookExecutor.js";
4	// HM-REV-MS1: Lazy-cached HyperMILL MaterialBridge (class-only export, cached after first use)
5	// eslint-disable-next-line @typescript-eslint/no-explicit-any
6	let _hmMatBridge: any = null;
7	import type { GearHobbingInput } from "../../engi
... [+5893 chars truncated]

### User | 2026-06-12T03:34:12.833Z

[tool_result] 1	/**
2	 * SFC combinatorial harness DRIVER -- the run loop that ties the harness together.
3	 * For each sampled cell (U-CSFH-04) it: maps the cell to an UltimateSpeedFeedInput,
4	 * runs the SFC engine, applies the per-cell GATES (U-CSFH-05), attaches a cited
5	 * vendor row (U-CSFH-03), and emits one DrivenCell record. The output is the
6	 * dataset U-CSFH-07/08 compare + derive baseline params
... [+7680 chars truncated]

### Assistant | 2026-06-12T03:34:14.973Z

Let me get the exact diff and read the remaining key files in parallel.

### Assistant | 2026-06-12T03:34:16.464Z

[tool_use: Grep]

### Assistant | 2026-06-12T03:34:16.948Z

[tool_use: Read]

### Assistant | 2026-06-12T03:34:17.614Z

[tool_use: Read]

### User | 2026-06-12T03:34:18.602Z

[tool_result] 1073-  \ OSCAR-SFC-9AXIS-MS0\U-OSC9-SHOPTOOL-RANK-ACTION: MRR-rank the operator's REAL Fusion shop tools for an input combo (frontend tooling-usage tracker spine)
1074-  "sfc_shop_tool_rank",
1075-  \ OSCAR-SFC-9AXIS-MS0\U-OSC9-14: tri-vendor batch comparator — PRISM vs HSMAdvisor-baseline vs G-Wizard at scale
1076-  "sfc_tri_vendor_batch_compare",
1077-  \ OSCAR-SFC-9AXIS-MS0\U-OSC9-DB-CLOSE-LOOP
... [+3091 chars truncated]

### User | 2026-06-12T03:34:20.969Z

[tool_result] 1	/**
2	 * SFC combinatorial COMPARE -- diffs each driven cell's PRISM result against its
3	 * CITED vendor row (U-CSFH-03) and classifies the per-cell agreement. Consumes the
4	 * DrivenCell[] the DRIVER (U-CSFH-06) emits; produces the per-cell verdicts +
5	 * delta distribution that BASELINE-PARAMS (U-CSFH-08) derives the per-regime moat
6	 * from. Reuse, not rewrite: the comparison tolerances +
... [+11295 chars truncated]

### User | 2026-06-12T03:34:22.075Z

[tool_result] 1	/**
2	 * SFC combinatorial BASELINE GENERIC PARAMS -- the moat. Folds the COMPARE report
3	 * (U-CSFH-07) into per-regime baseline parameters: a vc/fz envelope (from PRISM's
4	 * gate-pass driven cells) + a vendor BIAS and CONTAINMENT (from the feed-eligible
5	 * cited subset) + provenance, with thin / drilling / divergent regimes SEGREGATED or
6	 * flagged so a degenerate regime never silently 
... [+10810 chars truncated]

### Assistant | 2026-06-12T03:34:24.569Z

Now let me read the exact case handler bodies and check the ACTIONS array ordering context.

### Assistant | 2026-06-12T03:34:25.969Z

[tool_use: Read]

### Assistant | 2026-06-12T03:34:26.654Z

[tool_use: Read]

### User | 2026-06-12T03:34:27.383Z

[tool_result] 9205	            break;
9206	          }
9207	          // OSCAR-SFC-9AXIS-MS0/U-CSFH-10-DISPATCHER-WIRE (slot:oscar, 2026-06-11)
9208	          // Drive a BOUNDED sample of the CSFH combinatorial cell space through the real
9209	          // SFC engine + gates + citation, then compare each driven cell vs its cited
9210	          // vendor row. The real engine is ~2.5s/cell so the cell count is HA
... [+5780 chars truncated]

### User | 2026-06-12T03:34:28.043Z

[tool_result] 1055	  // OSCAR-SFC-9AXIS-MS0/U-OSC9-05: PSN decision-prior — Obsidian-brain + tribal + wiki
1056	  "sfc_psn_decision_prior",
1057	  // OSCAR-SFC-9AXIS-MS0/U-OSC9-06: chatter-stable RPM via Altintas SLD + RCSA
1058	  "sfc_chatter_stable_rpm",
1059	  // OSCAR-SFC-9AXIS-MS0/U-OSC9-07: exhaustive combination sweep — mill/lathe/wedm
1060	  "sfc_exhaustive_sweep",
1061	  // OSCAR-SFC-9AXIS-MS0/U-OSC9-0
... [+3079 chars truncated]

### Assistant | 2026-06-12T03:34:31.540Z

Now let me check the ACTIONS array structure (how z.enum is wired), verify no duplicate action names exist elsewhere, and check the relative path correctness.

### Assistant | 2026-06-12T03:34:33.048Z

[tool_use: Grep]

### Assistant | 2026-06-12T03:34:34.115Z

[tool_use: Grep]

### Assistant | 2026-06-12T03:34:34.363Z

[tool_use: Glob]

### User | 2026-06-12T03:34:34.391Z

[tool_result] 566-  return name.trim();
567-}
568-
569:const ACTIONS = [
570-  "cutting_force", "tool_life", "speed_feed", "flow_stress", "surface_finish",
571-  "mrr", "power", "torque", "power_torque", "chip_load", "stability", "deflection", "thermal",
572-  "cost_optimize", "multi_optimize", "productivity", "engagement",
--
1183-    "prism_calc",
1184-    "Manufacturing calculations: cutting force, tool life
... [+321 chars truncated]

### User | 2026-06-12T03:34:35.402Z

[tool_result] mcp-server\src\tools\dispatchers\calcDispatcher.ts:1081:  "sfc_combinatorial_sweep",
mcp-server\src\tools\dispatchers\calcDispatcher.ts:1082:  "sfc_baseline_generic_params",
mcp-server\src\tools\dispatchers\calcDispatcher.ts:9213:          case "sfc_combinatorial_sweep": {
mcp-server\src\tools\dispatchers\calcDispatcher.ts:9243:          case "sfc_baseline_generic_params": {

### User | 2026-06-12T03:34:35.762Z

[tool_result] mcp-server\src\data\sfc-combinatorial-axes.ts
mcp-server\src\data\sfc-combinatorial-axes.test.ts
mcp-server\src\data\sfc-combinatorial-validity.ts
mcp-server\src\data\sfc-combinatorial-gates.ts
mcp-server\src\data\sfc-combinatorial-datasource.ts
mcp-server\src\data\sfc-combinatorial-sampler.ts
mcp-server\src\data\sfc-combinatorial-driver.ts
mcp-server\src\data\sfc-combinatorial-compare.ts
mcp-serv
... [+48 chars truncated]

### Assistant | 2026-06-12T03:34:37.898Z

Now let me check for collision across all other dispatchers, verify the path depth is correct, and check for any non-ASCII characters in the new comments.

### Assistant | 2026-06-12T03:34:38.856Z

[tool_use: Grep]

### User | 2026-06-12T03:34:40.059Z

[tool_result] Found 1 file
mcp-server\src\tools\dispatchers\calcDispatcher.ts

### Assistant | 2026-06-12T03:34:40.283Z

[tool_use: Grep]

### User | 2026-06-12T03:34:40.284Z

[tool_result] <tool_use_error>InputValidationError: Grep failed due to the following issue:
An unexpected parameter `limit` was provided</tool_use_error>

### Assistant | 2026-06-12T03:34:41.067Z

[tool_use: Read]

### User | 2026-06-12T03:34:42.306Z

[tool_result] 569	const ACTIONS = [
570	  "cutting_force", "tool_life", "speed_feed", "flow_stress", "surface_finish",
571	  "mrr", "power", "torque", "power_torque", "chip_load", "stability", "deflection", "thermal",
572	  "cost_optimize", "multi_optimize", "productivity", "engagement",
573	  "trochoidal", "hsm", "scallop", "stepover", "cycle_time", "arc_fit", "arc_fit_kasa",

### Assistant | 2026-06-12T03:34:44.769Z

Good. Now check for non-ASCII in the new comment block specifically, and verify the action ordering context (what surrounds the two new entries in the ACTIONS array).

### Assistant | 2026-06-12T03:34:45.831Z

[tool_use: Grep]

### Assistant | 2026-06-12T03:34:46.621Z

[tool_use: Read]

### User | 2026-06-12T03:34:47.130Z

[tool_result] 357:      return { result: `StochTherm: μ=${result.value.mean_temp_c.toFixed(0)}°C σ=${result.value.std_dev_c.toFixed(0)}°C` };
373:      return { result: `CryoHT: h=${result.value.heat_transfer_coeff_W_m2K.toFixed(0)} W/m²K` };
375:      return { result: `CryoLife: ${result.value.cryo_tool_life_min.toFixed(1)}min (${result.value.improvement_factor.toFixed(1)}×)` };
385:      return { result: `Abl
... [+1875 chars truncated]

### User | 2026-06-12T03:34:48.660Z

[tool_result] 9190	            const { speedFeedVendorDeltaCalibrationBridgeEngine } = await import(
9191	              "../../engines/SpeedFeedVendorDeltaCalibrationBridgeEngine.js"
9192	            );
9193	            const hp = (params ?? {}) as {
9194	              require_exact_translation?: boolean;
9195	              max_abs_error_pct?: number;
9196	              job_id_prefix?: string;
9197	            
... [+815 chars truncated]

### Assistant | 2026-06-12T03:34:52.624Z

I have everything I need. Let me do one final check — verify the backslash comment anomaly I noticed in the grep output (lines 1079–1080 and 9207 showed `\ OSCAR` instead of `//`), and confirm the `Number(sp.maxCells) || 8` edge case for `maxCells=0`.

### Assistant | 2026-06-12T03:34:53.159Z

[tool_use: Read]

### User | 2026-06-12T03:34:54.412Z

[tool_result] 1079	  // OSCAR-SFC-9AXIS-MS0/U-CSFH-10-DISPATCHER-WIRE: combinatorial harness (CSFH) -- drive a BOUNDED sample of the cell
1080	  // space through the SFC engine + gate + citation, compare vs cited vendor rows, derive per-regime baseline params.
1081	  "sfc_combinatorial_sweep",
1082	  "sfc_baseline_generic_params",
1083	  // U-OSC9-HSMADVISOR-LIVE-WIRE: live PRISM-vs-HSMAdvisor compare + fold it
... [+36 chars truncated]

### Assistant | 2026-06-12T03:35:45.893Z

I have all the evidence needed. Here is the full wiring review.

---

## Dispatcher Wiring Review — U-CSFH-10-DISPATCHER-WIRE

### Engine / Module Summary

| Module | File | Class / Export |
|---|---|---|
| Driver | `mcp-server/src/data/sfc-combinatorial-driver.ts` | `CombinatorialSpeedFeedHarnessDriver` |
| Comparator | `mcp-server/src/data/sfc-combinatorial-compare.ts` | `SpeedFeedCombinatorialComparatorEngine` |
| Baseline | `mcp-server/src/data/sfc-combinatorial-baseline-params.ts` | `SpeedFeedBaselineGenericParamsEngine` |

---

### Check 1 — z.enum Entry

Both action names are present in the `ACTIONS` array at `calcDispatcher.ts:1081-1082`, which feeds `z.enum(ACTIONS)` at line 1186. The array is the single source of truth for the enum — no separate description/registry edit is needed.

- `sfc_combinatorial_sweep`: PRESENT at line 1081
- `sfc_baseline_generic_params`: PRESENT at line 1082
- Both are snake_case: PASS

**Result: PASS**

---

### Check 2 — Case Statement + Lazy Import

Both cases are present and use `await import(...)`:

- `case "sfc_combinatorial_sweep"` at line 9213: two lazy imports (`sfc-combinatorial-driver.js`, `sfc-combinatorial-compare.js`), both with the correct `await import("../../data/...")` pattern.
- `case "sfc_baseline_generic_params"` at line 9243: three lazy imports (same two plus `sfc-combinatorial-baseline-params.js`).

No top-level static import of any of the three modules exists in the file (the grep for `sfc_combinatorial` only matched lines in the ACTIONS array and the two case blocks — no import at the top of the file).

Both cases terminate with `result = { success: true, data: { ... } }; break;` — correct dispatcher return shape.

**Result: PASS**

---

### Check 3 — Import Paths

The dispatcher lives at `mcp-server/src/tools/dispatchers/calcDispatcher.ts`. The target files are at `mcp-server/src/data/sfc-combinatorial-*.ts`.

Path from `src/tools/dispatchers/` to `src/data/` is `../../data/` — two levels up from `dispat
... [+6237 chars truncated]
