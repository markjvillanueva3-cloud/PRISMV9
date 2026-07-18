---
name: reference_takeup_eval_denominator_fabricated_signal_2026_06_19
description: "Route take-rate audit's takeup-wiring-broken was a FALSE signal (live probe proved the credit path works); fix = an evaluations denominator that splits genuine-low-take-rate from never-exercised. Verify a 0/measurement-gap claim with a probe before chasing a wiring bug."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.217Z
aliases: reference_takeup_eval_denominator_fabricated_signal_2026_06_19
---


# Take-rate "takeup-wiring-broken" was a fabricated signal (2026-06-19, slot:alpha)

Commit `5752cc01af` [TOKEN-SAVINGS-PIVOT]/U-TAKEUP-EVAL-DENOMINATOR (cad-fusion-live-ms0).

## The fabricated signal (R12)
`scripts/audit-mcp-route-takerate.mjs::summarize()` reported `healthSignal: "takeup-wiring-broken"` for **every** dataset with `totalFires>0 && totalTakes===0` -- a definitive CLAIM the data could not support. The dashboard's own legend even said ">=50 fires + 0 takes = almost certainly a measurement gap" and "Do NOT suppress on a 0% take-rate that's a measurement artifact" -- so the false signal actively told the fleet NOT to act on what was actually a genuine signal, and pointed chats at a `verify-wiring` goose chase.

## The verification that settled it (the key move)
Instead of assuming "measurement gap" or "fleet doesn't route", I **ran a live probe** against the real sidecar: fed a real recent fire's session + an eligible action (`prism_session:action_search`) into `classifiersTakenBy` -> it returned `["isVerboseBash","doctrineSurface"]`. So the credit path **works**; `recent[]` carries `classifiers[]`+8-char `sessionId`; the session match (`fullUuid.startsWith(shortId)`) works. The 0 take-rate is **GENUINE** (across 672 fires the fleet never invoked an eligible MCP action / documented script route within the 600s window in-session -- MCP server frequently down + script-routes-via-Bash rare). NOT a wiring bug.

## The fix
`takeupTotals.evaluations` denominator: `mcp-route-takeup.mjs::_recordTakeup` now bumps it whenever the hook evaluates a **creditable** route (gated on `eligibleClassifiersFor(mcpAction) !== null` in `main()` -- so unmapped `prism_*:*` like `prism_cam:toolpath_generate` don't inflate it), even at 0 credit. `summarize()` then emits `genuine-low-take-rate` (evaluations>0 -> path proven live, fleet genuinely not routing -> actionable retune/suppress) vs legacy `takeup-wiring-broken` (evaluations===0 -> cause-unproven, kept). Backward-compatible (additive; existing tests green); `classify()` untouched so the `route-suggest-decay.mjs` consumer is unaffected. Live: dashboard flipped `takeup-wiring-broken` -> `genuine-low-take-rate`.

## Lesson
Before treating a 0/anomalous metric as a "measurement gap" / "wiring broken" -- or chasing the wiring -- **probe the actual path with real data** to prove whether it works. An audit that can't distinguish "instrument never ran" from "instrument ran, value is genuinely 0" emits a fabricated diagnosis; give it a denominator. Sibling of [[feedback_never_claim_absence_without_deep_search]] (prove, don't assume) and the false-positive detector-blind-spot family [[reference_audit_wired_via_engine_2026_06_10]]. Related: [[reference_alpha_autoloop_unwired_triage_2026_06_18]].
