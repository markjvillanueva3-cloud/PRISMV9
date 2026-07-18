---
name: reference_self_compact_loop_race_2026_06_19
description: "self-compact.mjs SendKeys /compact is SUPERSEDED by a rapidly-re-firing autonomous loop -- the next loop prompt arrives before /compact executes, so the context never resets. Observed live (slot:alpha) at YELLOW 0.64->0.66, context grew 643K->661K after a \"sent\" self-compact."
type: reference
slot: alpha
galaxy: token-optimization
source: prism-memory
synced: 2026-06-27T20:30:47.152Z
aliases: reference_self_compact_loop_race_2026_06_19
---


**Finding (slot:alpha, verified live 2026-06-19):** `node scripts/self-compact.mjs` returned `{action:"sent", hwnd:526914, handoff:{wrote:true}}` and printed "SENT '/compact' to this chat's terminal. It fires when this turn ends." **But the context did NOT reset** — the token-zone stayed YELLOW and GREW (0.64/~643K -> 0.66/~661K) across the next turn. So the `/compact` keystroke never executed.

**Likely root cause:** in a rapidly-re-firing **autonomous loop** (the operator's `[... AUTONOMOUS BUILD LOOP ...]` directives re-fire a new prompt within seconds of a turn ending), the next prompt arrives and takes terminal focus / input BEFORE the queued SendKeys `/compact` lands and executes. The self-compact SendKeys is thus **incompatible with a fast loop** — it works for a manually-paced chat (where the turn genuinely ends and the terminal is idle), not for a loop that immediately re-prompts. (Distinct from, but compounding, the known WT-tab-naming actuation gap in [[reference_self_compact_and_wt_actuation_dormant_2026_06_13]] — here it reported a real hwnd + "sent", yet still didn't fire.)

**Implications / workarounds:**
1. In a fast autonomous loop, do NOT rely on self-compact to reset context — it silently no-ops (R12: it reports "sent" but the keystroke is superseded). Trust the NATIVE auto-compact (~95% / RED) instead, OR have the operator MANUALLY `/compact` (or briefly pause the loop so the queued `/compact` can land).
2. Per R6 (operator 2026-06-11): context growth alone is NOT a stop signal — continue delivering units and let native auto-compact fire at the threshold; the YELLOW "wrap-up" tooling advisory is overridden by R6 for an armed loop.
3. Follow-up candidate (fleet-hygiene/zulu owns the loop+compact machinery): make self-compact loop-aware — e.g. set a flag the loop-iteration-inject reads to defer the next prompt until /compact lands, or have the loop itself issue /compact rather than SendKeys racing the prompt. NOT alpha's to build unilaterally (loop orchestration = zulu/golf).
