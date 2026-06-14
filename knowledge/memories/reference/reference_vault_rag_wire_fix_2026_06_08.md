---
name: reference_vault_rag_wire_fix_2026_06_08
description: U-VAULT-RAG-WIRE — keyword memory-recall was dark fleet-wide; both recall surfaces were off. Wired memory-rag-inject (global settings). Verified live-fires.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.034Z
aliases: reference_vault_rag_wire_fix_2026_06_08
---


**Fix** (slot:sierra, 2026-06-08, U-VAULT-RAG-WIRE, OBSIDIAN-VAULT-OPS gap-A/P0). Found during the [[reference_obsidian_vault_audit_2026_06_08]].

## The bug
Keyword memory-recall ("remember", "recall", "last time", "context from", "earlier", "prior") fired **NOTHING** fleet-wide — BOTH recall surfaces were dark:
- `memory-index-precheck-inject.mjs` (always-on, ≥2 tokens) — **disabled** by `PRISM_MEMORY_INDEX_INJECT: "0"` (C: settings line 43, mirrored). See [[reference_memory_index_inject_disabled_finding_2026_06_01]].
- `memory-rag-inject.mjs` (keyword-gated fallback) — wired in **ZERO** settings (verified 0/0/0 C:/H:/repo), despite its own header L36 falsely claiming "Wired via H:/.claude/settings.json" (R12 stale-claim).

The rag hook's `precheckCoversPrompt()` returns `false` when `PRISM_MEMORY_INDEX_INJECT === "0"` (line 135-136) — so with precheck OFF it would NOT defer, it would actually FIRE. It just was never wired to run.

## The fix
Added `memory-rag-inject.mjs` to `C:/Users/wompu/.claude/settings.json` UserPromptSubmit (after `node-card-prefetch-inject`, timeout 4000). c-to-h-mirror replicated to `H:/.claude/settings.json`. **NOT** added to the repo-tracked `H:/prism/.claude/settings.json` (global layer is the active runtime; repo settings had an unrelated peer modification — left untouched).

## Verified (R12/R15 live)
- C: settings valid JSON; mirrored to H: (count 1/1).
- LIVE fire: `echo '{"prompt":"remember ... obsidian vault ..."}' | portable-node memory-rag-inject.mjs` → returns `🧠 Memory recall (top 3 vault hits)` injection. Hook fires + surfaces vault hits.

## Known follow-on (NOT this unit)
The memory embeddings/BM25 sidecars are STALE — dense recall arm "may miss recently-indexed memories until re-embed" (`build-memory-embeddings-sidecar.mjs --resume`). New memories aren't dense-recallable until re-embed. This is the U-VAULT-MAINT-CRON / index-freshness gap, tracked separately.

## Note for the fleet
Global settings (C: + H: mirror) ≠ repo settings (`H:/prism/.claude/settings.json`). The runtime loads the global layer; a wiring change there is NOT a git-committable artifact in this repo. Settings wiring also silently reverts across the multi-chat fleet ([[feedback_settings_wiring_drift_2026_05_16]]) — re-verify with the echo-pipe test, don't assume it stuck.
