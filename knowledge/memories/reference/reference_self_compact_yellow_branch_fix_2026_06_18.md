---
name: reference_self_compact_yellow_branch_fix_2026_06_18
description: "Operator: 'we built a system for you to initiate compaction when prudent, see why it's not activating.' ROOT CAUSE: deriveZebraDecision (scripts/lib/zulu-context-bundle.mjs) had GREEN(suppress) + RED/CRITICAL(compact) branches but NO YELLOW branch, so the 25-65% prudent-compaction band fell through to default noop -- /compact was only ever recommended at RED (>65%, near native ~95% autocompact). The ACTUATOR (self-compact.mjs) worked fine (dry-run resolved WT tab 'BRAVO'). Fix: YELLOW branch honoring the token-awareness writer's action + worstPct>=0.5 gate; inject surfaces the actionable self-compact command; fixed 3 dead zebra->zulu consumer imports + a dormant test."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.152Z
aliases: reference_self_compact_yellow_branch_fix_2026_06_18
---


# Self-compaction never activated: missing YELLOW branch (2026-06-18, slot:bravo)

## Symptom
Operator: model-invokable self-compaction (SELF-COMPACT-MS0) "isn't activating." The model
was never nudged to run `scripts/self-compact.mjs`, even deep in context.

## Diagnosis (the actuator was NOT the problem)
- `self-compact.mjs --dry-run --slot bravo` RESOLVED this chat's window (`hwnd, UIA-focused WT
  tab 'BRAVO'`) and WOULD SendKeys `/compact`. The June-13 "WT tab not named PRISM <slot>" gap is
  gone -- tabs are slot-named now. **Actuation works.**
- The gap is the DECISION layer. `slot-context-bundle-inject.mjs` surfaces a decision from
  `deriveZebraDecision` (`scripts/lib/zulu-context-bundle.mjs`). That function had:
  GREEN -> suppressCompact; RED/CRITICAL -> recommend compact; **NO YELLOW branch**. So YELLOW
  (the 25-65% prudent band) fell through to the default `recommend:"noop"`. The doc comment even
  promised "YELLOW -> /compact only with corroborating signal" but the code never implemented it.
- Net: /compact was only ever recommended at RED (>65%), i.e. right before the native ~95%
  autocompact -- defeating the whole "compact PROACTIVELY when prudent" purpose.
- LIVE PROOF: this chat at YELLOW 61.5%, action "wrap-up" -> decision read "noop" (suppressed).

## Fix (commit U-YELLOW-BRANCH + U-YELLOW-SCRUTINY-FIX)
1. **YELLOW branch** in `deriveZebraDecision`: honors the token-awareness writer's own `action`
   field (`wrap-up`/`compact`) AND gates on `worstPct >= 0.5` (the producer emits "wrap-up" for
   ALL of YELLOW, so without the pct gate every slot would nudge compact from 25% -- too eager;
   the gate makes it fire only past the band midpoint). Stale -> noop. Loop-running still wins.
2. **Actionable nudge**: `slot-context-bundle-inject.mjs` now surfaces the exact
   `node scripts/self-compact.mjs ...` command on `recommend:"compact"` (was just showing
   "compact" with no actuation path -> model never ran it).
3. **Completed the zebra->zulu rename**: the prior commit fixed only the TEST import; 3 LIVE
   consumers still imported the dead `zebra-context-bundle.mjs` (`zulu-context-load.mjs` +
   `zulu-context-fleet-dashboard.mjs` HARD-CRASHED on launch; `generate-chat-slot-nodes-features`
   silently degraded). Fixed all 3.
4. The test file (`zulu-context-bundle.test.mjs`) was itself DORMANT (stale import -> 137 tests
   never ran since the rename); fixing the import re-activated it. 139/139 now.
- Live-validated: real YELLOW/wrap-up/worstPct 0.70 -> recommend=compact. 3-of-3 PASS.

## Lessons
- A decision function with GREEN + RED branches but NO middle (YELLOW) branch silently no-ops the
  most important band -- the PROACTIVE one. When a zone enum has N values, every value needs an
  explicit branch or a documented default; a "should never reach here" middle is a real bug.
- "Fixed the stale import" must fix ALL consumers (grep the dead path repo-wide), not just the one
  you happened to run -- R12 partial-fix trap (scrutiny arm C caught it).
- When a consumer gates on a producer's signal, verify the producer actually EMITS the distinct
  values the consumer branches on (the writer emitted "wrap-up" for all YELLOW, so the consumer's
  3-way action split needed a worstPct gate to be real). Related:
  [[reference_self_compact_and_wt_actuation_dormant_2026_06_13]],
  [[reference_zebra_zulu_orphaned_importers_2026_06_12]].
