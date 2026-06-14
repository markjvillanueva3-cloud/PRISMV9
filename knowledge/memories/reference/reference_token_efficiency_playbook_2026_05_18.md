---
name: token-efficiency-playbook-watchdog-act
description: Backend-dev token-efficiency playbook (wiki) + stop-memory-size-watchdog patched warn→auto-compact; MEMORY.md recompacted under ceiling
aliases: reference_token_efficiency_playbook_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.972Z
---


2026-05-18, slot echo (claude-fbf28cc9), `/checkin-echo /loop /goal` — high-ROI token/context work.

Three shipped artifacts for backend-dev efficiency, token saving, and context retention:

**1. MEMORY.md recompacted.** It had crossed the 24,576-byte Anthropic-harness truncation ceiling again (25,593 B) — fleet-wide cross-session recall was *actively truncating*. Ran `scripts/memory-compact.mjs --force`: 25,593 → 19,587 B, 31 oldest index entries rotated to `MEMORY-ARCHIVE.md`, 77 kept.

**2. `stop-memory-size-watchdog.mjs` patched warn → ACT.** The Stop hook that guards MEMORY.md against the ceiling previously *only warned* (telling the operator to go run a compaction). It now auto-invokes `scripts/memory-compact.mjs` when over the WARN threshold — `memory-compact` is lock-guarded, atomic, verify-after-write, self-throttled 30m and fail-soft, so it is safe to call on every over-threshold Stop. The context-retention regression can no longer silently recur. New knob `PRISM_MEMORY_SIZE_WATCHDOG_NO_COMPACT=1` (advisory-only). 2 reviewer P1s fixed (NaN poison-input in `lastFireAgeMs`; `archived:0` advisory diagnostic).

**3. `knowledge/wiki/architecture/backend-dev-token-efficiency.md`** — the standing token-efficiency PLAYBOOK. Distinct from the point-in-time audits [[audit-token-savings-2026-05-17]] / [[audit-token-context-memory-2026-05-16]]: those are *findings*, this is the *operating procedure*. Query `/wiki-query backend-dev-token-efficiency`. Three levers — search-first (don't re-derive), route cheap work to Ollama, keep the conversation in cache.

**Doctrine — close the writer-without-reader loop.** The watchdog was a textbook instance of the [[audit-token-savings-2026-05-17]] insight: PRISM's savings layer is mostly *write-only* — detectors that trigger no action, classifiers whose output reaches no decision, caches with no readers. When building or auditing any savings mechanism, verify the measurement → action step is wired. A measurement nothing consumes saves zero tokens.

See [[backend-dev-token-efficiency]] for the full playbook · [[feedback_ollama_token_routing]] · [[feedback_obsidian_low_token_2nd_brain_protocol]].
