---
title: Token-awareness stale-zone fix — staleness is not budget pressure
type: lesson
tags: [token-awareness, regression, budget, staleness, hooks, slot-zulu]
slot: zulu
milestone: TOKEN-AWARENESS-FIX
status: shipped
created: 2026-06-11
---

# Lesson: a sidecar's staleness must not corrupt its budget zone

## Symptom
Operator: the per-chat context/token-budget display was inaccurate. A chat sitting at `ctx=17%` (deeply GREEN) was shown as `🟡 zone=YELLOW · approaching budget` because its token-awareness sidecar was hours stale.

## Root cause
`scripts/lib/token-awareness-state.mjs::applyStaleness` called `bumpZoneForStale`, which forced a stale GREEN (or null) zone up to YELLOW "so an old fresh-looking sidecar can't lull the model." `.claude/statusline.mjs` mirrored the same bump for the HP bar.

## Why that is wrong
**Staleness is a freshness signal, not a budget signal** — orthogonal axes (R7: surface both, do not conflate). The sidecar writer refreshes on **every** `UserPromptSubmit` + `PostToolUse`, so staleness only accumulates during **idle** (no tool calls) — precisely when context is *stable*, not growing. The "stale GREEN is hiding a real 95%" scenario the bump defended against essentially cannot happen, because any heavy work refreshes the sidecar on each tool result. So the bump fabricated budget pressure with no evidence. The ctx *number* was always accurate (the writer prefers the API-authoritative usage block over byte estimates); only the *zone* lied.

## Fix
Keep the real measured zone in `applyStaleness`; set `stale` + `ageMs` only. The staleness is already surfaced on its own display line, so the model sees "GREEN 17% · ⚠ stale 5.3h" and reasons correctly. Removed the dead `bumpZoneForStale`; mirrored the de-bump in `statusline.mjs` (clone-don't-fork). `token-awareness-stop-advisory.mjs` gates on RED/CRITICAL, which the bump never produced — so no behavior change there.

## Generalizable rule
When a cached/sidecar value can go stale, communicate the *staleness* (flag + age) separately from the *value's severity*. Never overwrite a measured signal with a fabricated worse one just because it's old — surface the uncertainty and let the consumer judge. A stale measurement is "I don't know if this is current," not "this is bad."

## Evidence
Commit `384b05e265`. 47/47 tests (incl. operator-live-case: 17%-ctx + 5.3h-stale → GREEN; inverted regression oracle pins the fix). Live: `uniform` sidecar 513s-stale at ctx=40% → `GREEN stale=true` (was YELLOW). Memory: [[reference_token_awareness_stale_zone_fix_2026_06_11]].
