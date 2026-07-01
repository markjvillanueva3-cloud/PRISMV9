---
name: reference_session_once_gate_lib_2026_06_09
description: "Reusable scripts/lib/session-once-gate.mjs (seenThisSession/markSeenThisSession, fs-backed, fail-soft, 24h window, key=sessionId:key) extracted R7/R15 build-once from the inline _DOCTRINE_SESSION_KEY/_BACKEND_AUDIT_SESSION_KEY pattern. First consumer: pre-tool-savings-multi.mjs gates the node-no-rtk-wrap nudge once/session (R1-C2 from the ultracode discovery w3qho9bc3 — fired 2293x = 78% of the hook's nudges, advice-invariant, ~0 uptake). 3-of-3 PASS. Reviewer C: non-atomic RMW is SAFE here (idempotent last-writer-wins, worst case 1 extra nudge — vs the recall-counter ACCUMULATOR which needed withExclusiveLock). FOLLOW-UP: migrate the 3 mcp-route-suggest inline gates onto this lib."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.174Z
aliases: reference_session_once_gate_lib_2026_06_09
---


# Reusable session-once-gate lib + node-nudge gate (2026-06-09, slot:alpha)

Commit `<HEAD>` (U-OBS-NODE-NUDGE-SESSION-GATE). R1-C2 — the 2nd verified token-savings
survivor from the ultracode discovery Workflow `w3qho9bc3`
([[reference_obsidian_router_table_advise_disable_2026_06_09]] carries the full queue; R1-C1 + R1-C2 now DONE).

## The reusable asset (R7/R15 build-once)
`scripts/lib/session-once-gate.mjs`: `seenThisSession(rateFile, sessionId, key, windowMs)` +
`markSeenThisSession(...)`. fs-backed, FAIL-SOFT (read/write error or absent sessionId →
"not seen" → the nudge fires as before — degradation, never silent kill), 24h window (≈ one
session), key scheme `${sessionId}:${key}` so distinct nudges gate independently + a fresh
session re-fires, 2×window prune bounds the store. 7 R9 tests (mutation-verified: force
seenThisSession→false fails 5/7, drop the windowMs compare fails the expiry test).

This generalizes the inline `_DOCTRINE_SESSION_KEY`/`_BACKEND_AUDIT_SESSION_KEY`/`_FOOTER_SESSION_KEY`
clones in `mcp-route-suggest.mjs`. **FOLLOW-UP (not done this unit — avoids re-scrutinizing a
shipped gate):** migrate those 3 inline copies onto this lib so there's ONE canonical impl.

## The fix (R1-C2)
`pre-tool-savings-multi.mjs` node-no-rtk-wrap nudge fired **2293× = 78%** of the hook's 2935
nudges (verified vs the live ledger), re-injecting the advice-invariant "wrap node with rtk node"
reminder on every bare-node call for ~0 uptake. Gated to once/session at the EMIT layer (the
`classifyBashNode` classifier stays PURE); ONLY this detector gated (git-verbose/read/websearch
untouched); hard knob `PRISM_PTSM_BASHNODE_DISABLE` retained as the full-off fallback. Telemetry
records the suppression as `node-no-rtk-wrap-session-gated` (nudge:false) — all 3 downstream
consumers guard `nudge===true`, so it's never mis-counted as a savings.

## THE LESSON (reviewer-C, concurrency)
A non-atomic read-modify-write JSON store is SAFE for a session-once gate (idempotent
last-writer-wins: the value is always `Date.now()` for a fixed key; worst concurrent case is a
lost mark → the nudge fires ONE extra time, exactly the fail-soft posture). This is DIFFERENT
from `recall-counter-track` ([[reference_obsidian_recall_counter_serialize_2026_06_09]]) which is
an ACCUMULATOR (`count+1`) where a lost update permanently corrupts a number — that one NEEDED
`withExclusiveLock`. Rule: lock accumulators, not idempotent last-writer-wins sentinels.

## Remaining verified queue (act next, no Workflow re-run needed)
R4-C1 (filter 1135 phantom links from knowledge-link-audit) · R2-C1 (memory-index-search-lib:293
fallback blind to galaxy brains) · R3-C1 (embed 284 vault-only memos). Operator-gated: R5-C1/C3, R3-C2.
