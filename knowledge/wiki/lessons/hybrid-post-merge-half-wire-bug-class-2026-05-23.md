---
title: "Half-wire bug class — action in z.enum + slimmer but no compute() call site"
type: lesson
domain: dispatcher-wiring
shipped: 2026-05-23
slot: india
commits: [42b44bd00a, 4c3c46f70a]
related:
  - hybrid-post-merge
  - response-slimmer-contract
  - r12-fail-loud
  - audit-unwired-engines-table-driven-action-map-detection
---

# Lesson: half-wire bug class — `hybrid_post_merge` (2026-05-23)

## What broke

The `hybrid_post_merge` action on `calcDispatcher.ts` was a **broken half-wire**:

1. Listed in the dispatcher's `z.enum` at line 719 — MCP advertised it as callable.
2. Had a response-slimmer case at line 264 reading fields the engine never emitted (`result.merged_gcode.length`, `result.conflicts.length`, `result.tool_map.size`).
3. **Had NO dispatch case calling `compute()`**. The action would skip the engine entirely; `result` would be `undefined`; the slimmer would then crash with `TypeError: Cannot read properties of undefined (reading 'length')`.

The engine's real return shape is `AtomicValue<MergeResult>`:
```ts
{ value: { program: { header, body, footer, total_lines, total_tools, tool_list, conflicts, transition_blocks }, segment_map, quality_score, warnings }, unit, formula, confidence }
```

The slimmer was reading fields from some EARLIER engine API that no longer existed — drift between engine evolution and the slimmer that was never caught because the dispatch case was missing, so the slimmer never ran in practice.

## How it hid from audits

Static-text audits (UNWIRED-ENGINE-AUDIT scanning for dispatcher refs to engine names) found `HybridPostMergeEngine` in `cross-cam-batch2.test.ts` and considered it "tested". They found `hybrid_post_merge` in `calcDispatcher.ts` z.enum and considered it "wired". Neither check confirmed there was an actual **case statement invoking the engine** — only that the engine string and action string both appeared somewhere in the codebase.

This is a class of bugs that requires **table-driven ACTION_MAP detection** (per [[reference_audit_unwired_engines_table_driven_action_map_detection]]): an audit that asserts every z.enum action name has a matching `case "name":` handler in the same dispatcher file, with at least one engine invocation in the case body.

## How it was fixed (2026-05-23, slot:india)

| Commit | Edit |
|---|---|
| `42b44bd00a` | Added dispatch case at line 8229 calling `hybridPostMergeEngine.compute(params)` (alphabetical insertion before `thermal_compensation_model`). Rewrote response-slimmer (line 264) to unwrap `AtomicValue` via `(result?.value ?? result)` then read `program.{total_lines, total_tools, conflicts.length, quality_score, warnings.length}` with safe-navigation. Added `execute(action, params)` wrapper on engine matching POST-ULT pattern for future dispatcher consistency. |
| `4c3c46f70a` | Added name-matched `HybridPostMergeEngine.test.ts` (15 it cases): compute() pipeline + execute() round-trip + **slimmer contract pinning test** that asserts the exact fields the calcDispatcher slimmer reads. If the engine shape ever changes those fields again, this test fails at CI before the slimmer crashes at runtime. |

## Why the test matters beyond this engine

The slimmer-contract pinning pattern should generalize across **every** calcDispatcher action with a slim case. Right now there are 50+ action-specific slim cases each reading fields off `result`, and there is no mechanism preventing engine API drift from silently breaking them again. A targeted contract test per engine, asserting the exact slimmer field accesses, would gate every refactor.

## R12 fail-loud relationship

This was an R12 anti-pattern in two layers:
- **Layer 1 (engine):** `compute()` itself returns a structured object with explicit field names. R12-conformant.
- **Layer 2 (dispatcher slimmer):** silently reads non-existent fields with no try/catch, no fallback, no schema check. Would crash at runtime with a generic `TypeError` instead of a useful error like "slimmer expected result.merged_gcode but engine returns result.value.program — engine API drift detected". This was an R12 violation: the slimmer should have failed loud at build time (TS) or at first invocation (runtime guard) rather than crashing 6 months later when someone first called the action.

The fix addresses Layer 2 by adding the contract test that fails at CI when the shape drifts — moving the failure surface earlier.

## Apply

- Before declaring a dispatcher action "wired" in an audit: assert (1) action in z.enum, (2) case statement exists in same dispatcher file, (3) case body invokes engine, (4) if slimmer case exists, slimmer fields exist on engine's return shape.
- For every action with a slimmer case: add a name-matched engine test that pins the slimmer field accesses as a contract.
- Audit tooling: graduate from substring-search-based wiring detection to AST-walk that confirms the case-handler-calls-engine chain.

Related: [[reference_india_iter4_hpm_wire_2026_05_23]] · [[reference_audit_unwired_engines_table_driven_action_map_detection]] · [[feedback_always_update_wiki_on_bug_finding]]
