---
name: reference_tango_completion_harness_2026_06_14
description: TANGO-COMPLETION-HARNESS — the tango queue is ~100% polluted with shipped-but-unflushed units; verify-on-disk reconciler + 5th picker source + daily cron de-pollutes it. slot tango 2026-06-14.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.218Z
aliases: reference_tango_completion_harness_2026_06_14
---


**TANGO-COMPLETION-HARNESS** (slot tango, 2026-06-14, commit `0aee908e67`) — answers operator "use hermes, ollama and obsidian for harnessed loops/crons to finish all remaining tango tasks."

**THE FINDING (recon = 5 sonnet workflow agents):** the priority-queue surfaces ~3100 "tango-eligible" units, but a verify-on-disk audit found the top 20 are **20/20 ALREADY SHIPPED** — the queue is **~100% polluted** with shipped-but-unflushed work. The 4 existing shipped-detection sources in `shipped-units-source-of-truth.mjs` miss them because a unit often ships under a commit subject that does NOT contain its U-ID (e.g. U-CK11 shipped as "...PHASE2BC-V2-1") and its milestone envelope was never flipped complete. **So "finishing all remaining tango tasks" is mostly RECONCILIATION (tango's domain: discovery + anti-duplication), NOT building 3100 duplicates.** Verify-on-disk BEFORE building any queue unit — tango's law ([[reference_docker_hook_broker_built_closeout_2026_06_12]] is the same lesson).

**Build:**
- `shipped-units-source-of-truth.mjs` — NEW **source (e)** `readVerifiedShippedOverrides` reads `state/shared/verified-shipped-overrides.json` (U-* only), unioned into `buildShippedIdsUnion` (+ cache key + describe). Same benign failure direction as the bridge source (false-positive only hides from pickup, operator-recoverable). Also fixed a PRE-EXISTING drift failure: test #35 pinned commit `76dc1b53cb` (now 3690 commits back, past the 800 scan window → red on clean HEAD) → rewrote drift-resistant (assert every in-window bridge id lands in the union). 55/55.
- `scripts/tango-reconcile-queue.mjs` — verify-on-disk reconciler. For each eligible unit, extracts the U-* ids the picker checks (id-if-U-shaped + title-embedded U-*) and confirms shipped iff that **EXACT maximal U-* token** appears in a real commit subject. **Exact-maximal-token equality (NOT a boundary regex)** is collision-safe: `-` is valid WITHIN a unit-id, so a boundary match wrongly let "U-A1" match "U-A1-ARCHETYPE..." (a different unit). + 20-unit recon-seed (LLM-agent verify, commit-SHA evidence) for subject≠id cases. LIVE: **166 exact-commit-token + 20 seed = 185 verified-shipped, ALL U-*, 0 false-positives (definitively checked), 167 eligible de-polluted.** `--apply/--dry/--top/--json`.
- `scripts/tango-reconcile-queue.test.mjs` — 8 tests (exact, prefix NON-collision, token-past-100, no-U-token, case).
- `.claude/helpers/install-tango-reconcile-task.ps1` — durable daily cron (04:37 off-minute + AtLogOn, SYSTEM, bounded 10min). Operator registers once elevated: `! powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-tango-reconcile-task.ps1 -RunNow`.

**Measurement trap (R12):** my first spot-check flagged 16 false-positives, but a definitive check (every flagged id IS a real exact maximal token in some commit) proved **0 true false-positives** — the note `slice(0,100)` truncated before the token's position in long subjects, so my *validation* was wrong, not the matcher. Fixed: note now leads with the matched token.

**SAFE BY DESIGN:** writes an explicit override list (advisory); NEVER flips operator-authoritative milestone envelopes (respects "close-out audit never auto-flips" doctrine).

**Residual / honest scope:** the deterministic git-subject verify catches units whose commit subject contains their exact U-ID; deeper cases (subject ≠ id, not seeded) need an LLM-agent verify (ask-ollama / hermes) — the documented escalation the cron can add. Wiki: [[tango-completion-harness]]. Sister: [[reference_fleet_search_daemon_ms0_2026_06_14]].
