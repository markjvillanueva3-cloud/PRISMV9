---
name: reference_injection_throttle_tuning_2026_06_11
description: Settings env change (slot:alpha) cutting per-turn injection soak -- raised 4 injector throttles 60s->300s + disabled 2 dead per-turn hooks. Verified-safe, zero quality loss. DO NOT blindly revert.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.623Z
aliases: reference_injection_throttle_tuning_2026_06_11
---


# Per-turn injection-soak reduction (2026-06-11, slot:alpha) -- settings env, verified-safe

A Sonnet audit (routed per the model-routing directive) measured the fleet per-turn injection overhead at **~3,500-7,000 tokens/turn** across the UserPromptSubmit hook chain -> ~1.8M-3.6M tokens/session across 26 slots. This is the operator's "we're wasting a ton of tokens each turn" soak.

## Change applied (C:/Users/wompu/.claude/settings.json `env`, auto-mirrored to H:/.claude/settings.json)

**Throttle raises 60s -> 300s** on the 4 heaviest per-prompt injectors (each ~400-900 tok/turn):
- `PRISM_TRIBAL_DOMAIN_INJECT_THROTTLE_MS=300000`
- `PRISM_MASTER_INDEX_THROTTLE_MS=300000`
- `PRISM_MEMORY_INDEX_THROTTLE_MS=300000`
- `PRISM_WIKI_PRECHECK_THROTTLE_MS=300000`

**WHY SAFE (verified, not assumed):** all four read the SAME `scripts/lib/inject-throttle.mjs` `shouldThrottleInject({sessionId, prompt, ttlMs})` -- keyed on **identical prompt + session** within the TTL, NOT a blanket time window. A `/loop` re-submits the IDENTICAL prompt every tick, so the block content is byte-identical; suppressing the re-inject for 5min instead of 1min loses NOTHING. A DIFFERENT prompt (different hash) is never suppressed -> zero quality loss on varied work. Est saving ~2-4K tokens / 20-turn loop x 26 slots.

**Two dead per-turn hooks disabled:**
- `PRISM_MEMORY_RAG_DISABLED=1` -- `memory-rag-inject.mjs` is keyword-gated AND `precheckCoversPrompt()` defers to the always-on `memory-index-precheck-inject` whenever `PRISM_MEMORY_INDEX_INJECT != "0"`. That injector is ENABLED (=1, cross-checked live), so the rag inject path is dead. Disabling removes the per-turn node spawn; loses nothing while precheck stays on.
- `PRISM_PROMPT_CONTEXT_INJECT_OFF=1` -- `prompt-context-inject.mjs` is Phase-1 of a 2-phase plan (retire 24 legacy injectors) where Phase 2 NEVER landed; its context-bundle daemon "has been down for weeks" so it injects ~0 tokens (stale->throttled->suppressed). Disabling removes the spawn + prevents future duplication if the daemon ever restarts.

## Validated
Both C: + H: settings.json parse (no JSON corruption); all 6 keys present; `PRISM_MEMORY_INDEX_INJECT=1` guard confirmed. Takes effect on next hook spawn.

## Deferred (next iter) -- NOT yet done
- The Ollama prompt-rewriter hook (`prompt-rewriter-ollama.mjs`): VERIFIED a QUALITY tool, NOT dead weight -- do NOT disable. Re-enabled + IPv6-fixed 2026-06-09; produces real rewrites (conf 0.95); local inference is $0 GPU; PSN ledger "0.0k saved" is EXPECTED (it amplifies quality, does not save tokens). Disabling = quality loss, against the operator directive. The quality-preserving optimization is a SAME-PROMPT THROTTLE (cache the rewrite for identical prompt+session so /loop ticks don't re-infer+re-inject the identical restatement) via the existing `scripts/lib/inject-throttle.mjs` lib -- **DONE this session** (commit `52d3ae14e7`, U-REWRITER-SAME-PROMPT-THROTTLE, 4-case node:test subprocess oracle, knob `PRISM_PROMPT_REWRITE_THROTTLE_MS=300000`). (Near-miss: almost disabled it on a stale ledger + a misread "circuit-breaker superseded" commit note; reading the hook corrected it -- R12.)
- Per-slot domain-awareness hooks: **RESOLVED, no action** -- grep-verified ALL per-slot awareness injectors (foxtrot/delta/echo/xray/charlie x2/whiskey/slot-domain) ALREADY carry dedup/throttle. The subagent's "several may lack one" + its "whiskey has None" were FALSE (whiskey-lathe-context-inject IS in the has-dedup set) -- the 3rd subagent miss this session caught by verify-before-edit (saved 7 needless hook edits).
- Full audit table: returned by the Sonnet subagent this session.

DO NOT blindly revert these knobs (see [[feedback_settings_wiring_drift_2026_05_16]]) -- each is verified-safe with the rationale above. Pairs with [[reference_compaction_false_trigger_fix_2026_06_11]] (same session, the compaction false-trigger fix).
