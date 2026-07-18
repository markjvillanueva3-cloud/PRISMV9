---
type: "chat-session"
source: "claude-code-cli"
session_id: "8b4b9149-3502-4570-8dd8-b4bc90fad6ab"
title: "Review the round-trip test at H:/prism/mcp-server/src/__tests__/calcDispatcher.u"
date: "2026-06-08"
first_ts: "2026-06-08T17:49:31.032Z"
last_ts: "2026-06-08T17:50:41.143Z"
cwd: "H:\\prism\\mcp-server"
messages: 24
user_msgs: 10
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/8b4b9149-3502-4570-8dd8-b4bc90fad6ab/subagents/agent-a98efc19a0b6dca8a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Review the round-trip test at H:/prism/mcp-server/src/__tests__/calcDispatcher.u

> **claude-code-cli** | 2026-06-08 | 24 msgs (10 user / 14 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/8b4b9149-3502-4570-8dd8-b4bc90fad6ab/subagents/agent-a98efc19a0b6dca8a.jsonl`

## Transcript

### User | 2026-06-08T17:49:31.032Z

Review the round-trip test at H:/prism/mcp-server/src/__tests__/calcDispatcher.uwire-sfc-trivendor.test.ts (15 tests, all passing). It verifies 3 newly-wired SFC dispatcher actions (speed_feed_tri_compare, speed_feed_exhaustive_sweep, speed_feed_downstream_packs) reach the surface via a MockMCPServer that captures the registered tool and invokes it by action name.

Weight your review on TEST INTENT (R9 — would each test FAIL if the wiring/code regressed?):
1. Are any assertions tautological or too weak (e.g. would pass even if the engine returned garbage)? Specifically scrutinize the tri_compare physics assertion (asserts prism.axes.vc_mpm > 50 for 6061 aluminum) — is that a real intent check or arbitrary?
2. Do the FAILURE-mode tests actually exercise the rejection path (bad material with no iso_group/name, unknown domain, NaN/negative diameter)? Would they pass against a handler that silently swallowed errors?
3. The wiring-reachability guard asserts the error text does NOT contain "unknown action" — is that a meaningful guard that would catch an unwired action?
4. The downstream_packs lifecycle tests (register→status shows registered=true, unregister→registered=false) — do they prove real state transitions or could they pass trivially?
5. Coverage completeness: happy + ≥3 failure + ≥2 adversarial + ≥3 variability spans — is the floor met for all 3 actions?
6. Determinism: the tri_compare test disables hsmadvisor/gwizard to avoid disk reads — is the test genuinely hermetic, or could it flake on CI?

Read the test file end-to-end. Grade PASS/FAIL with concrete line numbers. Flag P0/P1 only.

### Assistant | 2026-06-08T17:49:40.252Z

I'll review the test file for test intent and coverage depth.

### Assistant | 2026-06-08T17:49:40.315Z

[tool_use: Read]

### User | 2026-06-08T17:49:41.588Z

[tool_result] 1	/**
2	 * calcDispatcher — OSCAR-SFC-9AXIS-MS0 / U-OSC-WIRE-TRIVENDOR round-trip suite
3	 * ===========================================================================
4	 *
5	 * Verifies the 3 previously-orphaned SFC engines now reach the dispatcher
6	 * surface (the "wire unwired things / synergize the back end" directive):
7	 *   - speedFeedTriComparatorEngine        → speed_feed_tri_compare
8	
... [+11261 chars truncated]

### Assistant | 2026-06-08T17:49:45.052Z

Now let me analyze the test structure and content against the R9 intent criteria. I'll also check if there are any related engine files to understand the physics assertions better.

### Assistant | 2026-06-08T17:49:45.267Z

[tool_use: Glob]

### Assistant | 2026-06-08T17:49:45.659Z

[tool_use: Glob]

### Assistant | 2026-06-08T17:49:45.698Z

[tool_use: Glob]

### User | 2026-06-08T17:49:46.719Z

[tool_result] src\engines\SpeedFeedTriComparatorEngine.ts

### User | 2026-06-08T17:49:46.868Z

[tool_result] No files found

### User | 2026-06-08T17:49:46.980Z

[tool_result] src\engines\SpeedFeedDownstreamSubscriberEngine.ts

### Assistant | 2026-06-08T17:49:51.198Z

[tool_use: Glob]

### User | 2026-06-08T17:49:52.328Z

[tool_result] src\engines\SpeedFeedExhaustiveCombinationEngine.ts

### Assistant | 2026-06-08T17:49:55.088Z

Let me read the engine implementations to understand what assertions are valid.

### Assistant | 2026-06-08T17:49:55.259Z

[tool_use: Read]

### User | 2026-06-08T17:49:56.452Z

[tool_result] 1	/**
2	 * SpeedFeedTriComparatorEngine — unified PRISM vs HSMAdvisor vs G-Wizard comparison.
3	 *
4	 * The headline of OSCAR-SFC-3WAY-MS0. Stacks the three speed/feed "opinions" for ONE canonical
5	 * cut onto a single axis basis (PRISM-canonical metric: vc m/min, fz mm/tooth, rpm, feed mm/min,
6	 * mrr cm³/min) so an operator — or the self-tuning loop — can see at a glance where PRISM agrees
7	 
... [+5237 chars truncated]

### Assistant | 2026-06-08T17:49:59.785Z

I'll conduct the test intent review following R9 discipline — examining whether each assertion would FAIL if the code regressed.

### Assistant | 2026-06-08T17:50:00.390Z

[tool_use: Read]

### Assistant | 2026-06-08T17:50:00.786Z

[tool_use: Read]

### Assistant | 2026-06-08T17:50:01.106Z

[tool_use: Read]

### User | 2026-06-08T17:50:01.686Z

[tool_result] 100	  /** Inject an HSMAdvisor state instead of reading disk (tests / explicit replay). */
101	  hsmadvisor_state_override: z.unknown().optional(),
102	  hsmadvisor_settings_path: z.string().optional(),
103	  /** Inject a G-Wizard crib state instead of reading disk. */
104	  gwizard_state_override: z.unknown().optional(),
105	  gwizard_toolcrib_path: z.string().optional(),
106	  /** Select which G
... [+7368 chars truncated]

### User | 2026-06-08T17:50:02.004Z

[tool_result] 1	/**
2	 * SpeedFeedExhaustiveCombinationEngine — sample-and-log the SFC parameter
3	 * space across mill / lathe / wedm domains.
4	 *
5	 * Operator directive (2026-05-25): "run every logical combination through the
6	 * calculator and check results one by one. test and log as nodes in the
7	 * system for calculated results of every single logical combination that
8	 * can be inputed into our pris
... [+2762 chars truncated]

### User | 2026-06-08T17:50:02.504Z

[tool_result] 1	/**
2	 * SpeedFeedDownstreamSubscriberEngine — wires the 5 downstream PRISM consumers
3	 * to the SpeedFeedPropagationBridge so they auto-receive SFC updates without
4	 * having to call the orchestrator themselves.
5	 *
6	 * The bridge exists (U-OSC9-03). This engine REGISTERS the subscribers so
7	 * that the auto-emit event chain actually moves data into:
8	 *
9	 *   1. Post-processor pipeline 
... [+2892 chars truncated]

### Assistant | 2026-06-08T17:50:41.143Z

## Test Intent Review — calcDispatcher.uwire-sfc-trivendor.test.ts

**Overall Grade: PASS with 2 P1 findings (mitigation needed, not blockers)**

---

### Detailed Analysis by Criterion

#### 1. **Tautological vs. Real Intent Assertions**

**Lines 84–99 (speed_feed_tri_compare happy path):**
- Line 93: `expect(r.ok).toBe(true)` — weak, passes if ANY response comes back
- Line 96: `expect(Array.isArray(out.systems)).toBe(true)` — tautological; passes if the envelope structure exists, doesn't verify physics
- **Intent gap:** The test doesn't assert that PRISM opinion exists in the systems array. A stubbed handler returning `{ systems: [] }` would pass.

**Lines 101–125 (tri_compare with real physics — N-group aluminum):**
- **Line 124: `expect(prism!.axes!.vc_mpm).toBeGreaterThan(50)`** — **P1 FINDING**: This is NOT arbitrary but IS too weak.
  - **Why it's real:** 6061 aluminum (N-group) IS a high-speed material. 50 m/min is a known-low floor (even with dull tooling, modern carbide on Al runs 200–600 SFM = ~60–180 m/min). A regression to 0, null, or a hardcoded stub would fail this.
  - **Why it's weak:** The assertion doesn't verify the MAGNITUDE is CORRECT. A regressed stub returning 75 would pass. Better: `expect(prism!.axes!.vc_mpm).toBeGreaterThan(100)` (still conservative for 6061) OR source an expected value from the UltimateSpeedFeedEngine's Kienzle coefficients.
  - **Missing context:** No JSDoc comment links this to literature (Sandvik/Kennametal kc1.1 for N-group, or CNCCookbook table). Where does 50 come from?

**Recommendation:** Upgrade line 124 to `toBeGreaterThan(100)` and add a comment citing the expected Vc source (e.g., "CNCCookbook 6061-T6 roughing = 150–200 SFM ≈ 45–60 m/min; conservative floor 100 m/min").

---

#### 2. **Failure-Mode Tests: Do They Exercise Rejection Path?**

**Lines 127–134 (missing material schema field):**
- Line 129: `material: {}` — empty object missing BOTH iso_group AND name
- Line 133: `expect(String((r.data as { error?
... [+7482 chars truncated]
