---
name: reference_slot_domain_dedup_2026_06_08
description: "TOKEN-SAVINGS-EXPAND/U-SLOT-DOMAIN-DEDUP (commit 8cd8d615e9, slot:alpha): slot-domain-awareness-inject.mjs adopts the injection-dedup lib — the ~1400-char/~350-token slot-domain table no longer re-injected byte-identically on every UserPromptSubmit. Fleet-wide (all 26 slots). Live-proven in production same session."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.952Z
aliases: reference_slot_domain_dedup_2026_06_08
---


**U-SLOT-DOMAIN-DEDUP (2026-06-08, slot:alpha, commit `8cd8d615e9`).** Shipped under the /goal "find high-value token savings" — converts requirement (2) from *found* to *shipped*, live-verified in production the same session.

## What
`.claude/hooks/slot-domain-awareness-inject.mjs` (a fleet-wide **UserPromptSubmit** hook) emitted a static ~26-row slot-domain table (~1400 chars / ~350 tokens) byte-identical on EVERY prompt of EVERY slot. Adopted the proven `scripts/lib/injection-dedup.mjs` lib (same pattern as `slot-soul-inject.mjs`): emit the full table on first-emit / 5-min-TTL-expiry / content-change, else a 122-char dedup marker (**~91% reduction on deduped prompts**). Shared sidecar `state/shared/dashboards/injection-dedup-cache.json`, hookTag `slot-domain-awareness:<sid8>` (namespaced — no collision with slot-soul's bucket in the shared file).

## Why it's safe (zero regression)
- **Content-keyed:** `hashBlock(block)` includes the `← YOU` marker + every domain row, so a slot re-bind or a `CHAT-SLOT-DOMAINS.md` edit changes the hash → re-emits fresh. (A naive once-per-session gate would suppress a changed table — the R9 test #3 proves this gate doesn't.)
- **Fail-soft polarity:** every error path emits the FULL block — sidecar read/write error → `cache={}` → first-emit; `PRISM_INJECTION_DEDUP_DISABLE=1` or missing `session_id` → full block. Dedup can only ever UNDER-save tokens, never drop a needed injection.
- Also tracks the hook in git for the first time (was running from an untracked file; settings points at `H:/prism/.claude/hooks/slot-domain-awareness-inject.mjs`).

## Tests / verify
6/6 (`node --test .claude/hooks/__tests__/slot-domain-awareness-dedup.test.mjs`): first-emit→full · repeat→marker · **content-change→re-emit (R9, mutation-verified — naive once-per-session impl FAILS it)** · disabled→full · no-sid→full · DISABLE-knob→silent. **3-of-3 scrutiny PASS** (arms A holistic + B test-integrity[mutation-tested] + C regression/IO, session claude-773b6557). Live: fresh sid=1400ch full → repeat=122ch marker; and the production injection this session shows `🔁 [slot-domain-awareness:db273e77] dedup — …not re-injected`.

## Pattern (reusable)
The injection-dedup lib (`hashBlock/shouldEmit/recordEmit/formatDedupedMarker/pruneExpired`) is the canonical way to stop re-injecting a static per-prompt block. Adopters so far: `slot-soul-inject.mjs`, now `slot-domain-awareness-inject.mjs`. Candidates NOT yet adopted are mostly dormant (discipline-expert-inject/karpathy-discipline-inject are unwired; alpha-token-domain-awareness is SessionStart=once/session so no benefit). **Latent coupling:** both adopters hard-code `DEDUP_TTL_MS=5min`; slot-domain calls `pruneExpired` (slot-soul does not), so slot-domain's prune evicts slot-soul's stale entries using the shared 5-min TTL — correct only while the TTLs stay equal.

## Goal-context (this session's /goal)
Part of the alpha /loop /goal (token-savings + context-retention + obsidian-wiring). Shipped this session: this dedup (#2 token-savings, live-proven) + F5 autoresume stale-window ([[reference_autoresume_stale_window_f5_2026_06_08]], #3 context-retention). Still open: **F3** (memory-relevance-inject.mjs lexical-only → add nomic-embed semantic stage — the obsidian-synergy keystone #4/#5; M-effort, high-blast-radius every-prompt hot path → build with FRESH budget) · F2 (handoff scan-storm) · the 4 rate-limited discovery lanes.

Related: [[reference_autoresume_stale_window_f5_2026_06_08]] · [[feedback_reflect_all_changes_post_update]] · injection-dedup lib (TOKEN-SAVINGS-EXPAND/U-[[reference_psn_injection_dedup_lib_2026_05_23|PSN-INJECTION-DEDUP-LIB]], 2026-05-23).
