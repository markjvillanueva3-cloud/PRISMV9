---
name: reference_large_read_digest_advisory_muted_working_2026_06_20
description: "large-read-digest-advisory is the fleet's top-firing nudge by fire-count (×3314 in the savings headline) but is CORRECTLY MUTED by advisory-decay (0/3314 conversion -> noise-suppressed). The 3314 is the probe COUNTER (bumpStats runs before the decay gate), NOT 3314 context injections. It is working-as-designed -- do NOT chase it as a runaway context-noise hook."
type: reference
slot: alpha
galaxy: token-optimization
source: prism-memory
synced: 2026-06-27T20:30:46.636Z
aliases: reference_large_read_digest_advisory_muted_working_2026_06_20
---


**VERIFIED 2026-06-20 (slot:alpha) -- do NOT chase `large-read-digest-advisory` as a runaway nudge.**

The session token-savings Stop headline reports `top: large-read-digest-advisory x3314` -- the fleet's #1 nudge by fire-count, 8x the next. A future chat (or I) could read that as a runaway context-noise hook to suppress. It is NOT. Verified live:

- `byHook["large-read-digest-advisory"]` in `mcp-server/data/state/ollama-offload-stats.json` = `{fired:3314, suggested:3314, offloaded:0, kept:0, tokensSaved:0}` -- 0.00% conversion, and **0 tokensSaved** (so it contributes NOTHING to the "~220k saved" headline; that's other ledgers like rtk).
- `decayDecision("large-read-digest-advisory")` (`scripts/lib/advisory-decay.mjs`) returns `{fire:false, muted:true, status:"noise", reason:"noise-suppressed"}` -- the advisory emission is **MUTED**.

**Why the count is high anyway (the key insight):** in `.claude/hooks/large-read-digest-advisory.mjs::main()`, `bumpStats()` (increments `fired`+`suggested`) runs at line ~174 BEFORE the `decayDecision` gate at line ~186. The header comment documents this deliberately: ".suggested was just bumped by bumpStats() so the probe counter advances even when muted." So `fired`/`suggested` is a PROBE COUNTER that advances on every large-read candidate regardless of whether the advisory was actually injected. Post-decay (the U-LARGE-READ-DECAY-WIRE fix, 2026-06-10, which closed the original 0/122 = 0% pre-wiring flood), the actual context injections are ~1-in-20 probes, not 3314.

**Conclusion:** the hook is working-as-designed; the decay machinery is muting the 0%-conversion advisory correctly. This is the THIRD apparent-gap-is-deliberate-design in the nudge subsystem this session (siblings: the route-suggest decay-actor takes>0 invariant + the classify() non-dominant verify-wiring choice -- see [[reference_mcp_route_suppress_isverbosebash_2026_06_20]]). Lesson reinforced: READ the hook + its live telemetry/decay-state before treating a high fire-count as a bug.

**Low-priority cosmetic residue (NOT fixed -- possibly intentional):** the savings-headline ranks nudges by raw `suggested`/`fired` count without flagging that a hook is decay-MUTED + 0-tokensSaved, so a dormant hook displays as the "top" nudge. If an operator wants the headline to distinguish active-vs-muted nudges, that's a small token-telemetry clarity unit in the alpha domain -- but it may be intentional (the probe counter IS the signal), so it needs an operator decision, not a unilateral "fix" (R8/R7).
