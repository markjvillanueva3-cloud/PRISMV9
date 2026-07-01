---
name: token-awareness-stale-zone-fix-2026-06-11
description: "Operator-reported: per-chat budget display was inaccurate -- a GREEN ctx (17-40%) on a stale sidecar rendered YELLOW 'approaching budget'. Root cause: applyStaleness.bumpZoneForStale forced stale GREEN->YELLOW. Fix: keep the real measured zone; staleness != budget pressure. Commit 384b05e265."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.222Z
aliases: reference_token_awareness_stale_zone_fix_2026_06_11
---


**TOKEN-AWARENESS stale-zone fix (slot:zulu, 2026-06-11, commit `384b05e265`).** The operator: *"we should have a fresh budget, fix the system that is inaccurately telling each chat what their context and token budget is."*

## The bug (live-confirmed)
The token-awareness inject showed `🟡 zone=YELLOW · ctx=17% ... ⚠ sidecar stale (age=19219s > 180s) → approaching budget`. ctx=17% is deeply GREEN (<60%), yet displayed YELLOW "approaching budget." Root cause: `applyStaleness()` in `scripts/lib/token-awareness-state.mjs` called `bumpZoneForStale(zone)` which forced GREEN→YELLOW (and null→YELLOW) on ANY stale (>180s) read. The same bump was mirrored in `.claude/statusline.mjs` (HP bar).

## Why the bump was wrong (the key insight)
Staleness is a **freshness** signal, NOT a **budget** signal -- orthogonal (R7: surface both, don't conflate). The sidecar WRITER (`token-awareness-sidecar.mjs`) refreshes on EVERY UserPromptSubmit + PostToolUse, so staleness accumulates only during **IDLE** (no tool calls) -- exactly when ctx is STABLE, not growing. A session doing heavy work refreshes the sidecar on every tool result, so the "stale GREEN hides a real 95%" scenario the bump protected against essentially cannot occur. The 5.3h-stale case was a crashed/idle slot at a genuine 17% ctx. The bump fabricated pressure with zero evidence. The ctx NUMBER was always accurate (writer prefers the API-authoritative usage block); only the ZONE lied.

## The fix
`applyStaleness` now keeps the real measured zone; sets `stale` + `ageMs` only. The staleness is already surfaced on its own display line (inject lines 117-120, statusline `_stale`), so the model sees "GREEN 17% · ⚠ stale 5.3h" and reasons correctly -- not lulled, and not falsely alarmed. Removed dead `bumpZoneForStale`. Mirrored the de-bump in statusline (clone-don't-fork). Consumers verified safe: `token-awareness-stop-advisory.mjs` gates on RED/CRITICAL (the bump only ever produced YELLOW, so no behavior change there).

## Validation
47/47 tests (3 rewritten to corrected intent, +1 operator-live-case test asserting 17%-ctx/5.3h-stale → GREEN, +inverted regression oracle that pins the fix so a future dev can't re-add the bump). LIVE: `uniform` sidecar 513s-stale at ctx=40% now `zone=GREEN stale=true` (pre-fix: YELLOW). Fleet-wide -- single shared-lib fix covers all 26 slots. Wiki: [[token-awareness-stale-zone-fix]].
