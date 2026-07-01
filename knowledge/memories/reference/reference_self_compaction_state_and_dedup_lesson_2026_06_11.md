---
name: reference_self_compaction_state_and_dedup_lesson_2026_06_11
description: Self-compaction TRUE state (Layer1 active fleet-wide; Layer2 zulu actuator opted-in 24/24 since 2026-05-22 grace-expired single-gated by task --dry-run; precompact-wait race FIXED) + the verify-before-build/dedup lesson (built a duplicate opt-in CLI, 2 reviewers caught it, reverted).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.151Z
aliases: reference_self_compaction_state_and_dedup_lesson_2026_06_11
---


# Self-compaction true state + the duplicate-CLI dedup lesson (2026-06-11, slot:alpha)

Operator /goal: "ensure chat self compaction is fully built and active across all chat slots."

## The TWO layers (verified this session)
- **Layer 1 = the meaningful autonomy** (work-until-autocompact -> author handoff just before -> resume).
  **ACTIVE FLEET-WIDE** by construction (global hooks): `precompact-auto-trigger` wired; the stale OS
  `PRECOMPACT_SOFT_TOKENS=99000000` disable is neutralized by the U2 `resolveThreshold` clamp
  (clampActive=true -> real 880K/940K fire); `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=95`. Proven live: this
  session itself resumed across a /compact via the per-agent handoff + `session-start-auto-resume`.
- **Layer 2 = the zulu idle-window ACTUATOR** (SendKeys-types `/precompact;/compact;/checkin-<slot>`
  into chat windows; scheduled task "PRISM Zulu Orchestrator" runs `zulu-orchestrator-sweep.mjs --once
  --dry-run --json`). TRUE state: **24/24 work slots opted-in since 2026-05-22** (canonical store
  `state/shared/zulu-opt-in.json`), **grace-EXPIRED**, so the **ONLY effective gate is the task
  `--dry-run` flag**. Live-fire switch = operator removes `--dry-run` from the scheduled task. Verify:
  `node scripts/lib/zulu-opt-in.mjs status`.

## What I actually fixed (the real wins)
- **Precompact-wait race FIXED** (commit `5aad20f5cd`, 67/67): `staggerAfterLine("/precompact")` returned
  the 5s `DEFAULT_STAGGER_MS`, so `/compact` landed ~5s later, mid-handoff-authoring. Added
  `DEFAULT_PRECOMPACT_WAIT_MS=75s` + a `/precompact` branch + `precompactWaitMs()` sweep helper (knob
  `PRISM_ZULU_PRECOMPACT_WAIT_MS`). Both scrutiny reviewers PASS.
- **Recovered a clean 13-day-old unclaimed zebra->zulu rename** rotting uncommitted in main tree (commit
  `1736b1c7c2`, pure 95/95 identifier swap, node --check OK, test 65/65, no dangling callers).

## THE LESSON (verify-before-build / dedup) -- [[feedback_never_claim_absence_without_deep_search]]
I built `scripts/zulu-opt-in.mjs` writing `zuluOptIn` onto `chat-slots.json` -- but the **canonical
opt-in system already existed** at `scripts/lib/zulu-opt-in.mjs` with its OWN store
`state/shared/zulu-opt-in.json` + `setOptIn`/`setOptInAll`/`applyOptInToSlotsDoc` + a full CLI. The
sweep calls `applyOptInToSlotsDoc()` which OVERWRITES `chat-slots.json`'s flag from that store every
pass, so my writes were wiped before `pickActionableSlots` -> my CLI was a **silent no-op that falsely
reported `{ok:true,changed:[21]}`** (R12 violation). **2 scrutiny reviewers (code-analyzer + reviewer)
caught it -> FAIL -> reverted** (commit `c29af6ee1d`). Why the field-on-chat-slots approach was wrong:
`chat-slots.mjs freshState()` builds a fresh SlotState on every claim and does NOT carry zuluOptIn -- a
slot re-claimed by a new chat would lose its opt-in; that is exactly why the canonical store is a
slot-keyed sidecar. **Search for an existing `<thing>-opt-in.mjs` / dedicated lib BEFORE building the
mechanism -- grepping chat-slots.mjs for "the write mechanism" was too shallow.** The per-file scrutiny
gate is what saved this. Sister memory: [[reference_autocompaction_model_handoff_u1u2_2026_06_11]].

## Token-efficiency half (same /goal) -- honest finding
The RTK/route/PSN substrate is **already well-optimized** (467K+24K tokens genuinely saved). The 4
"dead-route" W1 backlog items are FALSE gaps: `backendAuditChain`/`doctrineSurface` are already
per-session-gated (2026-06-09); `rtk-adoption-measure` is silent telemetry (0 injection);
`prompt-rewriter` injects 0 on its many failed-rewrites; the PSN aggregator correctly classifies all as
misses (not nudges). Real win shipped: archived 9 superseded `forge2-6`/`rgs2-5` skills out of the
SessionStart scan to `commands-archive/_superseded-forge-rgs/`. GOTCHA: `.claude/commands/_archive/` IS
scanned by Claude Code (re-namespaces as `_archive:NAME`) -- the correct non-scanned archive is the
`commands-archive/` SIBLING.
