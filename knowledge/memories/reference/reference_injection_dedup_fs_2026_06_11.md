---
name: injection-dedup-fs-2026-06-11
description: Fleet-wide per-turn injection token cut — dedupeOrMarker FS wrapper + measure-injection-budget tool. The 3 heaviest non-deduped UserPromptSubmit injectors now dedup (~2.3KB/turn/chat saved).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.623Z
aliases: reference_injection_dedup_fs_2026_06_11
---


# Injection-dedup FS wrapper + budget tool (U-ALPHA-INJECT-DEDUP-FS, slot:alpha 2026-06-11)

**Operator directive:** "optimize token eating injections fleet wide. look for inefficiencies that is causing us to waste tokens every turn, fix for the entire fleet."

**Instrument (new, reusable):** `scripts/measure-injection-budget.mjs` runs every wired UserPromptSubmit hook against a fixed prompt TWICE and reports per-hook emit bytes (1st = full-freight, 2nd = does it self-dedup) + the total per-turn injection budget. Run it before/after any injection change. LIVE: **60 injectors, ~7.8KB first-emit, ~4.8KB steady before this fix.**

**Finding:** 3 injectors re-emitted byte-identical blocks every turn with NO dedup: `local-compute-intent` (1351B), `obsidian-vault-precheck` (835B), `ai-synergy-awareness` (467B) = **2653 B/turn wasted**. The shared pure lib `scripts/lib/injection-dedup.mjs` (alpha 2026-05-23) already had 8 adopters but these 3 never adopted it.

**Fix:** `scripts/lib/injection-dedup-fs.mjs` -- `dedupeOrMarker(block, {sessionId, hookName, root, ttlMs?})` is a thin FS wrapper over the pure lib so a hook adopts per-session dedup in ONE line instead of copy-pasting the 22-line sidecar dance (the 8 prior adopters each duplicate it -- this wrapper is the consolidation point). Pure lib stays FS-free/unit-testable; wrapper owns sidecar I/O identical to the canonical adopter (`slot-domain-awareness-inject`): same sidecar `state/shared/dashboards/injection-dedup-cache.json`, 5-min TTL, fail-soft (any error/no-session/empty-block -> emit full block = pre-dedup behavior). Knob `PRISM_INJECTION_DEDUP_DISABLE=1`.

**Validated:** steady-state injection 4835B -> 3208B (~34% on measured set); ~2.3KB/turn/chat -> ~66K tokens/100-turn session, x26 fleet ~1.7M tokens/session. 7/7 wrapper tests (first-emit, TTL dedup-hit, content-change re-emit, TTL-expiry, disable-knob, fail-soft, cross-session no-leak).

**Complementary to bravo's [[reference_injection_surface_token_audit_2026_06_10]]** (orthogonal levers): bravo = relevance-floor SUPPRESSION (stay silent on no-signal, e.g. cag-router no-signal route 290B->0B); alpha = content-hash DEDUP (don't re-emit identical content). Both compose.

**Next levers (fleet token-injection backlog, ROI-ordered):**
1. Migrate the 8 copy-paste adopters onto `dedupeOrMarker` (DRY; -22 lines each, single dedup path).
2. `comprehensive-build-enforce` (1612B first-emit) -- audit whether its self-dedup is optimal.
3. `auto-consensus-userprompt` (331B, NO-DEDUP) + `prompt-context-inject` (246B) -- next dedup candidates.
4. bravo's backlog: master-index relevance-floor (needs eval-harness), slot-injector gating audit, take-rate-driven prune. Do NOT suppress memory-index score:0.0 (RRF-scale display artifact, not noise).
5. SessionStart hooks (~55) -- the other recurring surface; cold-cache anchors already small, but audit for re-readers.
