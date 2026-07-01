---
name: fleet-injection-budget-audit-2026-06-11
description: "Fleet token-injection audit (slot:alpha, operator 'wasting tons of tokens each turn'). Empirical ~3.2KB/turn floor per slot x26. The 10-agent workflow's top quick-wins were MOSTLY FALSE POSITIVES (verify-before-act); the one real fix was prompt-context-inject's every-turn daemon-down notice. Context-bundle daemon DOWN ~32 days = the real structural issue (infra lane)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.574Z
aliases: reference_fleet_injection_budget_audit_2026_06_11
---


# Fleet injection-budget audit (slot:alpha 2026-06-11, operator-directed)

**Operator: "optimize token efficiency, context injection, prism awareness across the full fleet. I think we're wasting a ton of tokens each turn in each chat slot."** Ran a 10-agent ultracode Workflow (measure + classify all 60 UserPromptSubmit + 57 SessionStart injectors). Plan: `state/shared/specs/FLEET-INJECTION-BUDGET-AUDIT-2026-06-11.md`.

## Empirical (the trustworthy part -- live measure-injection-budget.mjs)
~**3,208 B/turn (~917 tok) per slot** at the identical-prompt floor; ~**9,247 B ceiling** with changing content. x up to 26 slots = the fleet bill. The operator's intuition is correct in aggregate.

## CRITICAL LESSON: a multi-agent audit's MAP is trustworthy, its per-hook CLAIMS are NOT
3 of the workflow's 4 "quick wins" were FALSE POSITIVES (sonnet agents miscounted). I verified each deterministically BEFORE acting (R12 + read-everything rule). Blindly applying #1 would have BROKEN fleet auto-resume.
- **"Dewire session-start-auto-resume x4 / pre-tool-savings-multi x4 / build-cache-guard x2"** -> FALSE. Each copy is under a DIFFERENT matcher (compact/clear/startup/resume; Glob/Grep/Write/Bash; Pre+Post events). NOT duplicates. Built `scripts/dedupe-settings-hook-wirings.mjs` (collapses ONLY event+matcher+command-identical entries, backs up, never deletes a hook) -> reports CLEAN.
- **mcp-broadcast-reconnect-inject "40B every turn"** -> FALSE. Signal-gated (`exitSilent()` when no active signal).
- **slot-context-bundle-inject "3000B never-dedups dominant lever"** -> ALREADY FIXED (routes through `dedupedContext`, U-OBS-SLOTBUNDLE-DEDUP alpha 2026-06-09; token-zone only included when !=GREEN so a steady slot dedup-suppresses).

## Real fix SHIPPED (commit 791f2073ac, U-FIBA-PROMPT-CONTEXT-THROTTLE)
`prompt-context-inject` re-emitted a 204B "context-bundle daemon down" notice EVERY turn, every slot, no dedup. Now throttled to 1/30min/session via `dedupedContext` + SUPPRESSED to 0B on repeat; naive `block.slice()` surrogate-guarded. LIVE: fire1=204B, fire2=0B.

## CORRECTED 2026-06-11 (post-compact): the daemon is NOT the big lever -- restart-alone is a TRAP. DO NOT restart it.
Initially flagged "restart the down context-bundle daemon (32 days, 46002min old) = highest-leverage fix" WITH a "verify it doesn't just ADD on top" caveat. VERIFIED the caveat is the reality:
- Producer `.claude/helpers/prism-awareness-bundle.mjs:266` = "Phase C1" -- the bundle aggregates brief+memory+position+claims+master-index+GSD, designed to REPLACE the injectors that compute the same data. But **Phase C1 (un-wire the replaced legacy injectors) was NEVER completed** -- all 60 legacy injectors are STILL wired in settings.json.
- So restarting the daemon emits the bundle (~2KB capped, every turn via prompt-context-inject's fresh path) ON TOP of the 60 still-wired legacy injectors = net WORSE.
- The bundle's content maps mostly to SessionStart injectors (claude-brief-inject/gsd-inject = once/session, already cheap) + dynamic every-turn searches (master-index/memory-index precheck = NOT substitutable by a static bundle). So even completing Phase C1 wouldn't cleanly help.
- **Leaving the daemon DOWN avoids duplication and is CORRECT.** The every-turn cost is the 60 legacy injectors themselves; reduce via per-injector dedup-wrap/gate/size-cap, NOT a daemon restart.
- Chat-bus correction posted (chat-1781194016377 supersedes chat-1781193502181). LESSON (again): verify your OWN prior claim before others act on it -- I reasoned "down -> runs legacy" without checking restart REDUCES vs ADDS.

## VERIFIED 2026-06-11 (post-compact): the every-turn static injection is ALREADY OPTIMIZED -- no big lever remains
Checked the every-turn static emitters directly: slot-domain-awareness-inject, slot-soul-inject, psn-leg-state-inject, ai-synergy-awareness-inject, psn-prompt-checklist-inject = ALL already route through the injection-dedup helper (1-line marker on repeat); rtk-savings-headline-inject is rate-limited (1/10min/session). So the static every-turn re-injection the operator suspected is already mitigated by mature dedup + rate-limit infra. The ONE real unfixed every-turn waste was prompt-context-inject (shipped 791f2073ac). The residual every-turn VARIABLE cost is the dynamic per-prompt prechecks (master-index/memory-index/obsidian-vault) that re-search each prompt -- they emit prompt-RELEVANT content (real value), so they correctly can't dedup. CONCLUSION: per-turn injection is well-optimized; further gains are marginal byte-shaving with diminishing returns. Don't re-chase the deduped static emitters.

## NEXT (low-risk, marginal -- only if specifically directed)
Dedup-wrap the keyword-gated static blocks that bypass the chokepoint (search-thoroughness 1104B, comprehensive-build-enforce 1612B [hard-block gate, touch its advisory emit only], auto-consensus-userprompt 331B) -- keyword-gated so per-turn impact is low. Related: [[reference_injection_dedup_fs_2026_06_11]] (the dedup chokepoint, 28 hooks) · [[lone-surrogate-api400-2026-06-10]] (surrogate guard).
