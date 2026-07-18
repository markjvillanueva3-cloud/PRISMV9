---
name: reference_slotbundle_dedup_2026_06_09
description: "Token-savings win (R5-C1, ultracode round-2 #2): session-key-deduped the slot-context-bundle injector — the biggest measured per-prompt token sink (~1078 tok re-injected byte-identically EVERY prompt, zero dedup, vs 8 sibling injectors already using injection-dedup-emit.mjs). Wrapped the emit in dedupedContext('slot-context-bundle', summary, sessionId): content-hashed 5-min TTL, identical re-fire -> 1-line marker, changed content (diff prompt/token-zone) -> re-emits. LIVE: fire1=4344ch, fire2=120ch marker (~1056 tok saved/repeat). 3-of-3 PASS. Shared-cache races proven one-directionally benign (over-emit never wrongful-suppress)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.205Z
aliases: reference_slotbundle_dedup_2026_06_09
---


# slot-context-bundle injector dedup (2026-06-09, slot:alpha)

Commit `U-OBS-SLOTBUNDLE-DEDUP`. R5-C1 = round-2 ultracode (`wp9xijq9b`) item #2,
shipped after #1 (brain-lock). The biggest measured per-prompt token sink.

## The waste
`.claude/hooks/slot-context-bundle-inject.mjs` (UserPromptSubmit) emitted a ~1078-token
bundle (slot/galaxy/soul-refuses/bridge-units/token-zone + live-brain + cross-galaxy
card) byte-identically on EVERY prompt with ZERO dedup — while 8 sibling injectors
(foxtrot-mill-awareness, delta-cad-awareness, etc.) already wrap their emit in the
shared `scripts/lib/injection-dedup-emit.mjs`. Across a /loop (same goal re-fired
verbatim) the full bundle re-injected every iteration.

## The fix (1-line wrap of a fleet-proven lib)
`additionalContext: summary` -> `additionalContext: dedupedContext("slot-context-bundle", summary, sessionId)`.
Content-hashed, session-keyed (`tag:sid8`), 5-min TTL. Identical re-fire -> 1-line
marker; CHANGED content re-emits (a different prompt flips the cross-galaxy card; a
token-zone YELLOW->RED changes the summary — both verified in the 4096B hash window).
Fail-open on every path (no sid / lib throw / PRISM_INJECTION_DEDUP_DISABLE -> full emit).
LIVE: fire1=4344 chars, fire2 (same sid+prompt)=120-char marker (~1056 tok saved/repeat).

## Scrutiny (3-of-3 PASS, 0 P0/P1)
- A: triple-fire proved content-hash (diff prompt re-emits, not blanket-suppressed).
- B: token-zone line IS in the hash window so a zone change re-emits (no stale-marker
  stickiness). P2 (non-block): the lib's 4096B hash cap could suppress two prompts
  differing ONLY past byte 4096 — pre-existing lib characteristic, bounded + TTL + advisory.
- C: PROVED the unlocked shared-cache RMW is one-directionally BENIGN — corrupt/torn/
  lost-update -> over-EMIT (token waste), NEVER wrongful suppress (info loss);
  `recordEmit` immutable-merge can't fabricate a matching entry. 8-hex sid collision
  ~1e-7 and content-hash-guarded anyway.

## LESSON
A per-prompt UserPromptSubmit injector with STATIC content is a multiplicative token
sink (per prompt × per slot × per /loop iter). The fleet has a proven dedup lib
(`injection-dedup-emit.mjs::dedupedContext`) — every static-ish injector should wrap
its emit in it. The right dedup is CONTENT-HASHED (not blanket per-session), so a
genuinely-changed block still emits. Pairs with the route-suggest session-gates
([[reference_session_once_gate_lib_2026_06_09]]) — same "stop re-injecting static text"
class, different mechanism (content-hash TTL vs fire-once sentinel).

## Round-2 queue remaining (handoff)
#3 git-stash-push-u guard-hole · #4 filter generated stubs from embed-missing driver
(hard-dep for #8) · #5 session-gate isLargeRead nudge (836 fires/14 takeups) · #6
auto-execute find/search route · operator-gated #8 GPU re-embed 589 authored-missing files.
