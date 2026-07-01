---
type: "chat-session"
source: "claude-code-cli"
session_id: "ca9b9050-43d7-4390-93f4-e31f19be4b82"
title: "Per-file scrutiny (arm A, test-integrity) of TWO test files for U-HOTEL-OEE-DASH"
date: "2026-06-24"
first_ts: "2026-06-24T22:18:30.698Z"
last_ts: "2026-06-24T22:19:09.343Z"
cwd: "H:\\prism\\mcp-server"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--/ca9b9050-43d7-4390-93f4-e31f19be4b82/subagents/agent-a444c57c15b1ca14d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:38:48"
---

# Per-file scrutiny (arm A, test-integrity) of TWO test files for U-HOTEL-OEE-DASH

> **claude-code-cli** | 2026-06-24 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--/ca9b9050-43d7-4390-93f4-e31f19be4b82/subagents/agent-a444c57c15b1ca14d.jsonl`

## Transcript

### User | 2026-06-24T22:18:30.698Z

Per-file scrutiny (arm A, test-integrity) of TWO test files for U-HOTEL-OEE-DASHBOARD (gap #4). Read BOTH end-to-end:
1. `H:\prism\mcp-server\src\__tests__\OEECalculatorEngine.test.ts` (NEW, 12 engine tests)
2. The OEE additions in `H:\prism\mcp-server\src\__tests__\erp-rfq-routes.test.ts` (3 new route tests at the bottom + the `oee_losses`/`oee_trend` callTool mock branches ~line 88)

CONTEXT: I added `losses(input):OEELoss[]` + `trend(samples):OEETrendDay[]` to OEECalculatorEngine -- PURE projections of `calculate()`. They back the dead OEEDashboardPage Losses+Trends tabs via /erp/oee-losses + /erp/oee-trend. The page is fail-closed (empty array -> "Unavailable", never fabricated data). Reference values I hand-computed for the canonical input (planned 480/run 400/planned_dt 30/unplanned_dt 60/ideal 30s/total 700/good 680): six_big_losses breakdowns=36 setup=24 minor_stops=15 reduced_speed=35; reject COUNTS startup=4 prod=16 -> via idealCycleMin=0.5 -> startupMin=2.0 prodMin=8.0; worst-first sort [36,35,24,15,8,2].

VERIFY (R9 teeth -- cite file:line, flag P0/P1/P2, grade PASS/FAIL):
1. **Do the engine tests have REAL teeth?** Each losses() assertion pins an EXACT reference minute (36/24/15/35/2/8) + the right category -- would a wrong TPM bucket or a broken reject->minutes conversion FAIL the test? The worst-first `toEqual([36,35,24,15,8,2])` -- does it pin the sort (a no-sort or wrong-direction sort fails)? Confirm none are toBeDefined()/truthy stubs.
2. **The empty-body adversarial test** (`losses({})`): it asserts no-throw + no-Infinity + NaN-acceptable + minor_stops/reduced_speed==0. Is this the RIGHT contract (the upstream reject count is NaN from undefined-undefined, so quality minutes are NaN -> serialize to null -> FE drops; that's honest, not a bug)? Is asserting `minutes_lost not.toBe(Infinity)` meaningful (is Infinity even reachable, or is the test toothless on that axis)? Did I WEAKEN this test from an earlier `toBe(0)` -- if so, is the new assertion t
... [+1140 chars truncated]

### Assistant | 2026-06-24T22:18:32.650Z

I'll conduct a per-file scrutiny of the two test files for OEE tests. Let me start by reading both files end-to-end.

### Assistant | 2026-06-24T22:18:32.846Z

[tool_use: Read]

### Assistant | 2026-06-24T22:18:33.028Z

[tool_use: Read]

### User | 2026-06-24T22:18:33.792Z

[tool_result] 1	/**
2	 * OEECalculatorEngine.test.ts -- U-HOTEL-OEE-DASHBOARD (gap #4 of HOTEL-ERP-FRONTEND-WIRING-SPEC)
3	 *
4	 * The OEEDashboardPage Losses + Trends tabs had no backing engine projection -- losses()/trend()
5	 * were promised in the engine's header comment but never built, so /erp/oee-losses + /erp/oee-trend
6	 * had nothing to return. This unit adds losses(input):OEELoss[] + trend(samples):O
... [+10171 chars truncated]

### User | 2026-06-24T22:18:34.380Z

[tool_result] 1	/**
2	 * erp-rfq-routes.test.ts -- U-HOTEL-RFQ-ASSIGN (gap #2 of HOTEL-ERP-FRONTEND-WIRING-SPEC, slot:hotel)
3	 *
4	 * The RFQInbox page (web/src/pages/RFQInboxPage.tsx) had NO backing /erp/rfq* routes -> it was fully
5	 * dead (rfqList/rfqAssign/rfqUpdateStatus all 404'd). This unit wired 4 routes onto the existing
6	 * RFQToOrderOrchestratorEngine via businessDispatcher. This test drives the e
... [+13017 chars truncated]

### Assistant | 2026-06-24T22:19:09.343Z

I'll conduct a comprehensive per-file scrutiny of both test files for the OEE tests. Let me analyze each file end-to-end against the R9 criteria you've outlined.

## File 1: OEECalculatorEngine.test.ts

**VERDICT: PASS** (with qualifications)

### 1. Engine Tests Have Real Teeth ✓

**Lines 38-61 (losses() reference values test):**
- Asserts EXACT reference minutes: 36.0, 24.0, 15.0, 35.0, 2.0, 8.0 (the six_big_losses breakdown you hand-computed)
- Each value anchors to a specific TPM category (availability/performance/quality)
- **Would fail on:** wrong TPM bucket assignment, broken reject→minutes conversion (lines 108-116 specifically test the 0-ideal_cycle_time edge case), or incorrect minutes_lost arithmetic
- Not a stub — every `expect().toBe()` pins a concrete calculated output

**Lines 63-70 (worst-first sort):**
- `expect(mins).toEqual([36.0, 35.0, 24.0, 15.0, 8.0, 2.0])` — the EXACT sort order
- Stricter invariant check: lines 68-70 verify NON-INCREASING across all pairs
- **Would fail on:** missing sort, wrong sort direction, or unsorted output
- Load-bearing: a no-sort or reverse-sort definitely fails this

**Lines 72-84 (FE contract validation):**
- Checks id/name/category/minutes_lost/description are all present and well-formed
- `typeof l.minutes_lost === "number"` confirms no NaN serialization bugs at the boundary
- Not a stub, but less load-bearing than the reference-values tests above

### 2. Empty-Body Adversarial Test ✓ (Lines 86-106)

**R9 Contract Verification:**
- **Input:** `losses({} as OEEInput)` — all fields undefined
- **Expected behavior:** no throw, no Infinity, NaN acceptable (serializes to null on wire → FE drops)
- **Lines 98-100:** `Number.isFinite(l.minutes_lost) || Number.isNaN(l.minutes_lost)` — **HONEST contract**
  - Rejects only Infinity/−Infinity (the dangerous case you named)
  - Accepts NaN (which JSON.stringify → null, then FE parseLosses drops it)
  - **This is NOT a weakening** — the original test wrongly expected 0; the r
... [+6756 chars truncated]
