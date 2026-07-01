---
type: "chat-session"
source: "claude-code-cli"
session_id: "0f3a0c22-434c-4b12-9967-54ebbcb52788"
title: "Reviewer A of three independent PRISM reviewers — holistic strict review. Unit U"
date: "2026-06-02"
first_ts: "2026-06-02T16:02:55.642Z"
last_ts: "2026-06-02T16:10:56.622Z"
cwd: "H:\\prism-slot-foxtrot"
messages: 37
user_msgs: 13
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism-slot-foxtrot/0f3a0c22-434c-4b12-9967-54ebbcb52788/subagents/agent-ae39be87ad087b492.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:45"
---

# Reviewer A of three independent PRISM reviewers — holistic strict review. Unit U

> **claude-code-cli** | 2026-06-02 | 37 msgs (13 user / 24 assistant) | cwd: H:\prism-slot-foxtrot
> Raw: `H:/.claude/projects/H--prism-slot-foxtrot/0f3a0c22-434c-4b12-9967-54ebbcb52788/subagents/agent-ae39be87ad087b492.jsonl`

## Transcript

### User | 2026-06-02T16:02:55.642Z

Reviewer A of three independent PRISM reviewers — holistic strict review. Unit U-MILL-TRIBAL-GROUND-TRAINER (slot foxtrot, worktree H:/prism-slot-foxtrot): apply JM Die shop-floor tribal speeds/feeds rules (MillTribalIntegrationEngine.getAdjustment → multiplicative rpm/feed factors, source-attributed) on top of the template library's baseline/SFC conditions per {iso, operation} cell. Composable with the SFC + machine grounding already shipped.

Review these 4 staged files end to end:
1. mcp-server/src/engines/MillToolpathTemplateLibraryEngine.ts (OP_TO_TRIBAL_OPERATION map + the tribal apply block in generateLibrary + TemplateEntry/Result tribal fields)
2. mcp-server/src/engines/MillTemplateTrainingHarnessEngine.ts (tribal_ground threading + tribal_adjusted_cells aggregation)
3. mcp-server/src/schemas/millActionSchemas.ts (tribal_ground on 3 actions)
4. mcp-server/src/__tests__/mill-tribal-ground-template.test.ts (8 tests, all passing; tribal_ground without sfc_ground so no SFC calls)

Key facts: getAdjustment(materialIso, operationType, toolType, toolDiameterMm) returns {rpm_factor, feed_factor, doc_factor, warnings, tips_applied} — defaults all factors to 1.0 (identity) for a no-match, multiplies matching JM_DIE_MILLING_TIPS signals. The unit applies rpm/feed factors only when a factor moved off 1.0; surfaces tips_applied for source attribution.

VERIFY (flag P0/P1 with file:line):
- Correctness: tribal applied AFTER groundCell (composable, doesn't corrupt the memo cache); Math.max(1, round(x*factor)) guards against zero/negative rpm/feed; only OP_TO_TRIBAL_OPERATION-mapped ops are eligible (unmapped → no forced wrong match).
- Fail-soft: no-match cell unchanged; tribal_ground off → no tribal fields; never throws.
- Source attribution (foxtrot soul: no anonymous tips): tribal_tips carries the applied tip ids.
- No physics constants (kc1.1/Taylor) inlined — these are tribal RULE factors from MillTribalIntegrationEngine, not physics canon.
- Test integrity (R9): doe
... [+336 chars truncated]

### Assistant | 2026-06-02T16:03:13.585Z

I'll review these 4 staged files end to end. Let me read them all.

### Assistant | 2026-06-02T16:03:14.544Z

[tool_use: Bash]

### User | 2026-06-02T16:04:04.451Z

[tool_result]  .mcp.json                                          |  16 +--
 mcp-server/data/state/ollama-offload-stats.json    |  13 ++-
 .../__tests__/mill-tribal-ground-template.test.ts  | 118 +++++++++++++++++++++
 .../engines/MillTemplateTrainingHarnessEngine.ts   |  18 ++++
 .../engines/MillToolpathTemplateLibraryEngine.ts   |  65 ++++++++++++
 mcp-server/src/schemas/millActionSchemas.ts        |   3 +
 6
... [+373 chars truncated]

### Assistant | 2026-06-02T16:04:06.609Z

Let me read all 4 files end to end.

### Assistant | 2026-06-02T16:04:07.073Z

[tool_use: Read]

### User | 2026-06-02T16:04:49.099Z

[tool_result] 1	/**
2	 * MillToolpathTemplateLibraryEngine — T2 (U-MILL-TEMPLATE-LIBRARY)
3	 *
4	 * Generates a parametric G-code TEMPLATE for every {operation × ISO material}
5	 * combination on a given controller, by delegating to GCodeTemplateEngine
6	 * (the canonical 6-controller × 13-op parametric generator wired in T1). This is
7	 * the "templates for every toolpath type with variable parameters and cutt
... [+34026 chars truncated]

### Assistant | 2026-06-02T16:04:53.522Z

Now let me read the other 3 files and the tribal engine's getAdjustment to verify the contract.

### Assistant | 2026-06-02T16:04:56.238Z

[tool_use: Read]

### User | 2026-06-02T16:05:18.642Z

[tool_result] 1	/**
2	 * MillTemplateTrainingHarnessEngine — T4 (U-MILL-TEMPLATE-TRAINING)
3	 *
4	 * Closes the loop for EVERY template in the toolpath-template library: for each
5	 * generatable {operation × ISO material} cell it builds a recommended course
6	 * (from the template's variable cutting conditions) + a simulated actual outcome,
7	 * then drives MillCourseClosedLoopEngine.closeLoop — which reconcil
... [+20587 chars truncated]

### Assistant | 2026-06-02T16:05:22.775Z

[tool_use: Read]

### User | 2026-06-02T16:05:38.431Z

[tool_result] 1	/**
2	 * mill-tribal-ground-template.test.ts — U-MILL-TRIBAL-GROUND-TRAINER (T2.7)
3	 *
4	 * Tribal grounding: JM Die shop-floor speeds/feeds rules (MillTribalIntegrationEngine) modulate the
5	 * template library's rpm/feed by multiplicative factors for an {iso, operation} cell, ON TOP of the
6	 * baseline or SFC-grounded conditions. Source-attributed (the applied tip ids ride through), fail-sof
... [+7648 chars truncated]

### Assistant | 2026-06-02T16:05:42.940Z

Now let me read the schema file and verify the tribal engine's `getAdjustment` contract.

### Assistant | 2026-06-02T16:05:43.469Z

[tool_use: Read]

### User | 2026-06-02T16:06:04.984Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1238 of 1707 total (29300 tokens, cap 25000). Call Read with offset=1239 limit=1238 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	/**
2	 * Mill Dispatcher Action Schemas
3	 * ===============================
4	 * Per-action Zod schem
... [+56986 chars truncated]

### Assistant | 2026-06-02T16:06:11.099Z

The 3 schema changes are confirmed (lines 320, 338, 370 add `tribal_ground` to the 3 actions). The 3 actions referenced in the test (`mill_template_library`, `mill_template_train_sweep`, `mill_fleet_closed_loop_test`) all have it. Now let me verify the critical contract: `getAdjustment` on `MillTribalIntegrationEngine` — its actual return shape and identity-default behavior.

### Assistant | 2026-06-02T16:06:12.467Z

[tool_use: Grep]

### User | 2026-06-02T16:06:18.200Z

[tool_result] 450:    // Store for use in getAdjustment()
451-    log.debug(`[MillTribal] Registered heuristic: ${h.id} — ${h.condition}`);
452-  }
453-
454-  private learnFromFailureMode(fm: FailureMode): void {
455-    // Failure modes are learned as negative examples
456-    const material = fm.material || "P";
457-    const opType = fm.operation || "rough_profile";
458-
459-    // Add with inverted paramete
... [+3288 chars truncated]

### Assistant | 2026-06-02T16:06:23.907Z

Let me see the rest of `getAdjustment` (the return and the heuristic tool-diameter caveat, which matters for the test's claim of "real adjustment"). Also the heuristic `applies_to_material`/`applies_to_operation` uses OR logic — that has a subtle interaction.

### Assistant | 2026-06-02T16:06:25.090Z

[tool_use: Read]

### User | 2026-06-02T16:06:37.947Z

[tool_result] 544	    }
545	
546	    // Check failure modes
547	    for (const fm of this.failureModes) {
548	      let matches = true;
549	
550	      if (fm.material && fm.material !== materialIso) matches = false;
551	      if (fm.operation && fm.operation !== operationType) matches = false;
552	
553	      if (matches && fm.severity === "critical") {
554	        warnings.push(`CAUTION: ${fm.description} — ${f
... [+988 chars truncated]

### Assistant | 2026-06-02T16:06:47.184Z

Confirmed the `getAdjustment` contract matches the unit's assumptions: defaults all factors to 1.0, multiplies matching signals/heuristics, returns `tips_applied`. Now one important subtlety I need to verify for the test's R9 integrity: the unit passes `tt.op` (the SFC op like `"milling"`/`"drilling"`) as `toolType` to `getAdjustment`, but `toolType` is **not used for matching** in `getAdjustment` (matching is only on `material_iso` + `operation_type`, plus heuristic `applies_to_*` and the `< 6mm` diameter rule). So `toolType` is effectively ignored for matching — that's harmless but worth noting. The diameter passed is `tt.diameter_mm` (e.g., 50 for facing, 12 for circular_pocket, 8 for drilling default), so the `< 6mm` heuristic won't fire for those — fine.

Let me confirm `tribalResult` is only set when tips were applied AND check a subtle edge: the `tribal_adjusted` field logic vs the `tribalAdjustedCells` counter. There's a discrepancy worth examining. Let me also check there are exactly 8 tests and they pass, and confirm the test "moved" assertion is real.

Let me run the test file to confirm all pass.

### Assistant | 2026-06-02T16:06:48.284Z

[tool_use: Bash]

### User | 2026-06-02T16:07:39.403Z

[tool_result]  DEPRECATED  `test.poolOptions` was removed in Vitest 4. All previous `poolOptions` are now top-level options. Please, refer to the migration guide: https://vitest.dev/guide/migration#pool-rework

 RUN  v4.1.5 H:/prism-slot-foxtrot/mcp-server

stderr | src/__tests__/mill-tribal-ground-template.test.ts
[INFO] [MillNeuralNetwork] Initialized network: 37-32-16-8-5

stderr | src/__tests__/mill-tribal-
... [+445 chars truncated]

### Assistant | 2026-06-02T16:07:48.557Z

All 8 tests pass. Now let me examine the one subtle correctness concern: the `tribal_adjusted` field on the entry vs the `tribalAdjustedCells` counter. There's a potential inconsistency. Let me trace it carefully.

In `generateLibrary` (lines 457-473):
- `moved = adj.rpm_factor !== 1 || adj.feed_factor !== 1` — if moved, increment `tribalAdjustedCells`.
- `tribalResult` is set only when `adj.tips_applied.length > 0`.
- Entry's `tribal_adjusted` (line 490) = `tribalResult ? (rpm_factor !== 1 || feed_factor !== 1) : undefined`.

Edge case: a tip could match (tips_applied non-empty) but have `doc_factor` only (rpm=feed=1.0). Then `moved=false` (counter not incremented), but `tribalResult` is set, and `tribal_adjusted = (1!==1 || 1!==1) = false`. Consistent — entry shows `tribal_adjusted: false`, counter not incremented. Good.

Reverse edge: could `moved=true` but `tips_applied.length===0`? Factors only move when a signal/heuristic/failure-mode matched, and every match pushes to `tipsApplied`. So `moved=true` implies `tips_applied.length>0`. Consistent — counter and `tribal_adjusted:true` agree. Let me verify there's no path where a factor moves without a tip push (e.g., failure-mode prevention factors).

Looking at `getAdjustment` failure-mode block (lines 553-559): when a critical failure mode matches, it applies `prevention.rpm/feed/doc` factors but does **NOT** push to `tipsApplied`. This is a real gap.

### Assistant | 2026-06-02T16:07:49.366Z

[tool_use: Read]

### User | 2026-06-02T16:08:44.920Z

[tool_result] 546	    // Check failure modes
547	    for (const fm of this.failureModes) {
548	      let matches = true;
549	
550	      if (fm.material && fm.material !== materialIso) matches = false;
551	      if (fm.operation && fm.operation !== operationType) matches = false;
552	
553	      if (matches && fm.severity === "critical") {
554	        warnings.push(`CAUTION: ${fm.description} — ${fm.cause}`);
555
... [+402 chars truncated]

### Assistant | 2026-06-02T16:08:57.837Z

Confirmed: a **critical failure-mode** match moves `rpm_factor`/`feed_factor` off 1.0 **without** pushing any id to `tips_applied`. This is in `getAdjustment` (a pre-existing engine, not in this unit's diff), but it directly affects this unit's foxtrot-soul source-attribution guarantee:

In `generateLibrary` (lines 463-471), if a failure-mode-only match occurs:
- `moved = true` → `tribalAdjustedCells += 1`, AND rpm/feed params are mutated.
- BUT `adj.tips_applied.length === 0` → `tribalResult` stays `undefined`.
- So the entry gets `tribal_adjusted: undefined`, `tribal_tips: undefined`, `tribal_rpm_factor: undefined`.

Result: **a cell whose rpm/feed was actually changed by a tribal rule is counted in `tribal_adjusted_cells` but carries NO source attribution and `tribal_adjusted` is not `true`.** This is a real correctness/attribution inconsistency: the counter and the per-cell flags disagree, and the foxtrot "no anonymous tips" doctrine is violated for the failure-mode path (the adjustment is applied silently with no tip id, and `warnings` from getAdjustment are also dropped — never surfaced on the entry).

Let me check whether any failure mode is registered that could actually trigger this in practice (to grade P0 vs P1), and confirm whether `warnings` from getAdjustment are captured anywhere.

### Assistant | 2026-06-02T16:08:59.501Z

[tool_use: Grep]

### User | 2026-06-02T16:09:24.113Z

[tool_result] 311:const JM_DIE_FAILURE_MODES: FailureMode[] = [
317:    prevention: { peck_depth: 0.5, feed: 0.8 },
327:    prevention: { rpm: 0.6, depth: 0.95 },
329:    severity: "critical",
336:    prevention: { rpm: 0.9, doc: 0.7 },
344:    prevention: { chip_load: 1.3, feed: 1.2 },
353:    prevention: { doc: 0.6, feed: 0.8 },
366:  private failureModes: FailureMode[] = [...JM_DIE_FAILURE_MODES];

### Assistant | 2026-06-02T16:09:28.660Z

Let me read the failure-mode definitions to determine if a critical one with rpm/feed prevention can match a tribal-eligible {iso, op} cell — that determines P0 vs P1 severity.

### Assistant | 2026-06-02T16:09:29.503Z

[tool_use: Read]

### User | 2026-06-02T16:09:50.691Z

[tool_result] 311	const JM_DIE_FAILURE_MODES: FailureMode[] = [
312	  {
313	    id: "FAIL-001",
314	    description: "Drill breakage in steel",
315	    symptoms: ["Snap sound", "Broken drill stub in hole", "Work scrap"],
316	    cause: "Peck depth too large, chip packing",
317	    prevention: { peck_depth: 0.5, feed: 0.8 },
318	    material: "P",
319	    operation: "peck_drill",
320	    severity: "high",
321	  
... [+1748 chars truncated]

### Assistant | 2026-06-02T16:10:17.017Z

This is the decisive fact for grading. Let me analyze the only `critical` failure mode:

- **FAIL-002** (Tap breakage): `severity: "critical"`, `prevention: { rpm: 0.6, depth: 0.95 }`, `operation: "tap"`, no material constraint.

It matches `operationType === "tap"`. Now check `OP_TO_TRIBAL_OPERATION` (lines 45-51): it maps `facing→"face"`, `circular_pocket→"rough_pocket"`, `profile→"rough_profile"`, `peck_drilling→"peck_drill"`, `chip_break_drilling→"peck_drill"`. **There is no mapping to `"tap"`** — `tapping` is unmapped, so it's never eligible for tribal grounding. Therefore FAIL-002 (the only critical failure mode, the only one that moves rpm/feed without a tip id) can **never** be reached through this unit's `OP_TO_TRIBAL_OPERATION` gate.

The other failure modes are `high`/`medium` severity → the `matches && fm.severity === "critical"` guard means they never apply factors at all. So **no currently-registered failure mode can move a factor for any tribal-eligible op in this unit.** The attribution gap is latent (depends on engine internals the unit doesn't control), not live.

This downgrades the finding from P0 to P1: the invariant "every counted tribal_adjusted_cell carries a tip id" holds today only by the coincidence that the sole anonymous-factor path (critical failure modes) is keyed to `tap`/`tapprofile`-ish ops outside `OP_TO_TRIBAL_OPERATION`. If echo/oscar ever adds a critical failure mode for `face`/`rough_pocket`/`rough_profile`/`peck_drill`, the counter would silently diverge from attribution and a foxtrot-doctrine "anonymous tip" would ship. The robust fix is to derive `moved`/`tribalAdjusted` from `tips_applied.length > 0` AND a factor move, or to count only attributed adjustments — making the invariant structural rather than incidental.

Let me verify two more things: (1) the memo-cache non-corruption claim (tribal applied to `params` after `groundCell`, and `groundCell`'s cached object isn't mutated), and (2) that `tips_applied` could be non-em
... [+1737 chars truncated]

### Assistant | 2026-06-02T16:10:19.166Z

[tool_use: Bash]

### User | 2026-06-02T16:10:33.801Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-02T16:10:56.622Z

No physics constants inlined. The only numeric additions are `Math.max(1, ...)` guards and factor comparisons against `1` (identity) — all structural, not physics canon. The tribal factors come from `MillTribalIntegrationEngine`, confirmed.

I have everything needed for a verdict. Let me record my summary findings.

VERDICT: PASS

BLOCKER: (none — no P0)

Notes (P1 + observations):

1. **P1 — Attribution/counter divergence latent in the failure-mode path.** `MillTribalIntegrationEngine.getAdjustment` (MillTribalIntegrationEngine.ts:553-559) applies critical-failure-mode `prevention.rpm/feed` factors **without** pushing any id into `tips_applied` (and drops its `warnings`). In `generateLibrary` (MillToolpathTemplateLibraryEngine.ts:463-471) `moved`/`tribalAdjustedCells` is keyed on factors, but `tribalResult`/`tribal_tips`/`tribal_adjusted` are keyed on `tips_applied.length>0`. So a failure-mode-only adjustment would be **counted** in `tribal_adjusted_cells` yet ship with `tribal_adjusted:undefined` and no tip id — violating the foxtrot "no anonymous tips" doctrine and making the counter disagree with the per-cell flags. **Not live today**: the only `critical` failure mode (FAIL-002, `operation:"tap"`) is unreachable because `OP_TO_TRIBAL_OPERATION` (lines 45-51) never maps to `"tap"`; all other failure modes are non-critical so apply nothing. The invariant holds by coincidence of the op map, not by construction. Robust fix: derive `moved`/`tribalAdjusted` from `tips_applied.length>0 && factor-moved`, or count only attributed adjustments — so a future critical failure-mode added by echo/oscar for an eligible op can't ship an anonymous adjustment.

2. **Correct composition + no cache corruption (verified).** Tribal applies strictly AFTER `groundCell`; it mutates the per-cell local `params` (fresh from `buildParams`), copying only scalar rpm/feed out of the memoized `GroundedCell` — the module cache object is never mutated. `Math.max(1, Math.round(x*factor))` guards ze
... [+1597 chars truncated]
