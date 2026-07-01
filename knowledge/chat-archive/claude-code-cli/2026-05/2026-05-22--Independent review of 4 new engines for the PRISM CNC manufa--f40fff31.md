---
type: "chat-session"
source: "claude-code-cli"
session_id: "f40fff31-cb37-49ea-9b03-5d4d750b18f3"
title: "Independent review of 4 new engines for the PRISM CNC manufacturing platform (mi"
date: "2026-05-22"
first_ts: "2026-05-22T17:36:20.908Z"
last_ts: "2026-05-22T17:38:10.659Z"
cwd: "H:\\prism"
messages: 20
user_msgs: 9
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/f40fff31-cb37-49ea-9b03-5d4d750b18f3/subagents/agent-a700308adf9c46cfd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# Independent review of 4 new engines for the PRISM CNC manufacturing platform (mi

> **claude-code-cli** | 2026-05-22 | 20 msgs (9 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/f40fff31-cb37-49ea-9b03-5d4d750b18f3/subagents/agent-a700308adf9c46cfd.jsonl`

## Transcript

### User | 2026-05-22T17:36:20.908Z

Independent review of 4 new engines for the PRISM CNC manufacturing platform (milestone CAD-COMPLETE-MS0, a CAD-agent reliability layer). Read each engine + its test file end-to-end.

FILES (engine + test pairs, all under H:/prism/mcp-server/src/engines/):
1. UnitOfMeasureDisambiguationEngine.ts + .test.ts — resolves dimensional values (explicit "0.5 in" or implicit "0.5") to canonical mm; must NEVER silently guess an ambiguous value.
2. RiskTierClassifierEngine.ts + .test.ts — classifies a CAD op into low/medium/high/critical risk; unknown op kinds default MEDIUM not LOW.
3. CADAppCircuitBreakerEngine.ts + .test.ts — per-CAD-app circuit breaker (closed/open/half_open); injectable clock.
4. CADFallbackRoutingEngine.ts + .test.ts — routes a CAD op to the best available app when the preferred one is unavailable.

All 4 are committed (last 4 commits on HEAD, subjects "[CAD-COMPLETE-MS0]/U-AI-*"). All tests currently pass; the project `npx tsc --noEmit` reports 0 errors.

WHAT TO CHECK — flag P0 (correctness/safety bug), P1 (real defect), P2/P3 (minor):
- Logic correctness in each engine — wrong-result paths, off-by-one, float-precision traps, incorrect state transitions (esp. the circuit breaker's open→half_open→closed/open transitions and probe accounting).
- Safety invariants: UoM never returns high-confidence on a genuinely ambiguous value; RiskTier never under-rates a destructive op; FallbackRouter never selects a disabled/unavailable app.
- Edge cases: empty/null/garbage input, concurrency assumptions, unknown enum values, boundary values.
- Test integrity: do tests assert real reference values (not toBeDefined stubs)? Would each test FAIL if the engine logic regressed? Any critical untested path?
- Dead code, unreachable branches, misleading names.

Be concise — list findings with severity, skip praise. End with: "VERDICT: PASS" or "VERDICT: FAIL" (FAIL only if a P0 or P1 exists).

### Assistant | 2026-05-22T17:36:41.591Z

I'll review all 4 engine + test pairs end-to-end.

### Assistant | 2026-05-22T17:36:41.983Z

[tool_use: Read]

### Assistant | 2026-05-22T17:36:42.227Z

[tool_use: Read]

### Assistant | 2026-05-22T17:36:42.478Z

[tool_use: Read]

### Assistant | 2026-05-22T17:36:42.682Z

[tool_use: Read]

### User | 2026-05-22T17:37:10.610Z

[tool_result] 1	/**
2	 * UnitOfMeasureDisambiguationEngine — CAD-COMPLETE-MS0 / U-AI-03
3	 * ===============================================================
4	 *
5	 * Resolves dimensional values — explicit ("0.5\"", "12.7 mm") OR implicit
6	 * (a bare number "0.5") — to a canonical unit (millimetres) for the CAD
7	 * agent. The agent receives free-text dimensions from voice, blueprints,
8	 * and chat; a wrong m
... [+13033 chars truncated]

### User | 2026-05-22T17:37:10.633Z

[tool_result] 1	/**
2	 * RiskTierClassifierEngine — CAD-COMPLETE-MS0 / U-AI-12
3	 * ======================================================
4	 *
5	 * Classifies a CAD operation into a risk tier — low / medium / high /
6	 * critical — so the CAD agent knows which operations may run unattended
7	 * and which require operator confirmation. An autonomous boolean-cut on
8	 * an already-machined feature is unrecoverab
... [+9691 chars truncated]

### User | 2026-05-22T17:37:10.639Z

[tool_result] 1	/**
2	 * Tests — UnitOfMeasureDisambiguationEngine (CAD-COMPLETE-MS0 / U-AI-03)
3	 *
4	 * Reference conversions use the exact international inch (1 in = 25.4 mm).
5	 */
6	import { describe, it, expect } from "vitest";
7	import {
8	  UnitOfMeasureDisambiguationEngine,
9	  unitOfMeasureDisambiguationEngine,
10	} from "./UnitOfMeasureDisambiguationEngine.js";
11	
12	describe("UnitOfMeasureDisambigu
... [+6524 chars truncated]

### User | 2026-05-22T17:37:10.644Z

[tool_result] 1	/**
2	 * Tests — RiskTierClassifierEngine (CAD-COMPLETE-MS0 / U-AI-12)
3	 */
4	import { describe, it, expect } from "vitest";
5	import {
6	  RiskTierClassifierEngine,
7	  riskTierClassifierEngine,
8	} from "./RiskTierClassifierEngine.js";
9	
10	describe("RiskTierClassifierEngine — base tier from operation kind", () => {
11	  const e = new RiskTierClassifierEngine();
12	
13	  it("classifies a cos
... [+4974 chars truncated]

### Assistant | 2026-05-22T17:37:15.873Z

Now the remaining two engine pairs.

### Assistant | 2026-05-22T17:37:16.314Z

[tool_use: Read]

### Assistant | 2026-05-22T17:37:16.552Z

[tool_use: Read]

### Assistant | 2026-05-22T17:37:16.783Z

[tool_use: Read]

### Assistant | 2026-05-22T17:37:17.051Z

[tool_use: Read]

### User | 2026-05-22T17:37:32.008Z

[tool_result] 1	/**
2	 * CADAppCircuitBreakerEngine — CAD-COMPLETE-MS0 / U-AI-09
3	 * ========================================================
4	 *
5	 * A per-CAD-application circuit breaker. When a CAD adapter (Fusion 360,
6	 * hyperMILL, SolidWorks, …) starts failing, the breaker OPENS so the agent
7	 * stops hammering a dead app and can reroute (see CADFallbackRoutingEngine).
8	 * After a cooldown it goes HA
... [+10375 chars truncated]

### User | 2026-05-22T17:37:32.246Z

[tool_result] 1	/**
2	 * Tests — CADAppCircuitBreakerEngine (CAD-COMPLETE-MS0 / U-AI-09)
3	 *
4	 * Uses an injected clock so cooldown timing is deterministic.
5	 */
6	import { describe, it, expect } from "vitest";
7	import {
8	  CADAppCircuitBreakerEngine,
9	  cadAppCircuitBreakerEngine,
10	  createCADAppCircuitBreaker,
11	  DEFAULT_BREAKER_CONFIG,
12	} from "./CADAppCircuitBreakerEngine.js";
13	
14	/** A break
... [+6411 chars truncated]

### User | 2026-05-22T17:37:32.287Z

[tool_result] 1	/**
2	 * CADFallbackRoutingEngine — CAD-COMPLETE-MS0 / U-AI-01
3	 * ======================================================
4	 *
5	 * Routes a CAD operation to a CAD application: when the preferred app is
6	 * unavailable (its circuit breaker is OPEN — see CADAppCircuitBreakerEngine —
7	 * or it is disabled / lacks the needed capability) the router picks the
8	 * next-best AVAILABLE, CAPABLE app 
... [+7429 chars truncated]

### User | 2026-05-22T17:37:32.360Z

[tool_result] 1	/**
2	 * Tests — CADFallbackRoutingEngine (CAD-COMPLETE-MS0 / U-AI-01)
3	 */
4	import { describe, it, expect } from "vitest";
5	import {
6	  CADFallbackRoutingEngine,
7	  cadFallbackRoutingEngine,
8	  type CADAppProfile,
9	} from "./CADFallbackRoutingEngine.js";
10	
11	/** A router seeded with three CAD apps. */
12	function seeded() {
13	  const e = new CADFallbackRoutingEngine();
14	  e.registe
... [+5527 chars truncated]

### Assistant | 2026-05-22T17:38:10.659Z

I've read all 4 engine + test pairs end-to-end. Findings below.

## CADAppCircuitBreakerEngine

**P1 — `canProceed` half-open transition does not count its own probe against `halfOpenMaxProbes`; the breaker permits `halfOpenMaxProbes + 1` concurrent probes.**
`CADAppCircuitBreakerEngine.ts:123-132` — when the cooldown elapses, `canProceed` transitions OPEN→HALF_OPEN and hard-sets `b.halfOpenProbesInFlight = 1`, returning `allowed: true`. That first probe is correctly counted. But the transition path is the *only* path that ignores the `halfOpenMaxProbes` check at line 145. With the default `halfOpenMaxProbes: 1` this is benign. With `halfOpenMaxProbes` configured >1 it is still benign because line 145 gates subsequent calls. The actual defect is narrower but real: **the transition unconditionally sets `halfOpenProbesInFlight = 1` rather than incrementing.** If a stale `halfOpenProbesInFlight` value somehow persisted (it can't today because `transition`→`open` zeroes it, line 255), this would be fine. So this is *latent* — currently masked. Downgrading to P2: see below.

**P2 — `recordSuccess`/`recordFailure` decrement `halfOpenProbesInFlight` even when called in CLOSED/OPEN state with no probe outstanding.** Lines 167 and 189 only run inside the `state === "half_open"` branch, so this is actually safe. No defect — withdrawn.

**P2 — probe-slot leak on a transition race.** `canProceed` reserves a probe slot (`halfOpenProbesInFlight += 1`, line 154) but the slot is only released by a subsequent `recordSuccess`/`recordFailure`. If a caller invokes `canProceed` (gets `allowed: true`, slot reserved) and then never records an outcome (call throws before reaching record, or caller forgets), the probe slot leaks permanently — the breaker is stuck rejecting all future half-open trials at line 145 and can never close. There is no probe timeout/expiry. For a reliability layer this is a genuine wedge: one un-recorded probe permanently bricks recovery for that app. Not P1 only b
... [+7750 chars truncated]
