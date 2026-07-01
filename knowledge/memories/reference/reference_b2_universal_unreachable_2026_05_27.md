---
name: reference-b2-universal-unreachable-2026-05-27
description: B2 wire-in arch finding — universal namespace classification unreachable through agent_memory_remember dispatcher because memory_type whitelist excludes doctrine-key strings
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.476Z
aliases: reference_b2_universal_unreachable_2026_05_27
---


# B2 — universal namespace unreachable via agent_memory_remember dispatcher (2026-05-27, slot:alpha)

## Finding (R12 fail-loud)

The memory-namespace-classifier's `UNIVERSAL_KEYWORDS` path matches against the `key` field (passed by the dispatcher as `memory_type`). The dispatcher's contract restricts `memory_type` to exactly 5 enum values: `{fact, preference, correction, context, tribal}`. Universal doctrine markers like `feedback_karpathy_discipline`, `feedback_r5_thru_r12`, etc. are not in that whitelist → the handler returns `Unknown memory_type: '...'` BEFORE the routingMeta block can attach.

**Caught by:** the E2E test `agent_memory_remember with wedm-keyword content + tribal type` in `mcp-server/src/__tests__/memoryDispatcher-namespace-routing.test.ts` (originally drafted as a universal-doctrine test, surfaced the gap when 0/26 passed).

## Why it matters

The classifier's universal-doctrine ranking (confidence 0.9 vs galaxy/fallback) is reachable today only through:
- Direct classifier invocation (e.g. memory_search-side filtering)
- The contract-helper layer (`computeRoutingMeta` in the test file)

Through `agent_memory_remember`, every memory is forced into a galaxy/ephemeral/slot-soul/fallback bucket — universal doctrine memories silently become whatever galaxy their content keyword-matches first. **Wrong home, every time.**

## Fix options (P1 follow-up — separate unit, NOT shipped in B2)

**Option A** — widen `memory_type` to accept doctrine-key strings (`feedback_*`, `reference_*`, etc.). Surgical but couples classifier semantics to dispatcher enum.

**Option B** — add a separate `key` parameter the dispatcher passes to the classifier verbatim. Cleanest separation. Classifier already accepts `key` as a distinct param.

**Option C** — bypass: callers needing universal classification call a different dispatcher action (e.g. `agent_memory_remember_universal`). Avoids touching existing surface but adds dispatcher surface area.

Recommendation: **B**. One new optional param (`key?: string`), default to `memory_type`. Classifier signature already supports it; only the dispatcher wire needs a 2-line change.

## Cross-refs

- B2 spec: `H:/prism/state/shared/specs/B2-MEMORY-NAMESPACE-ROUTER-WIRE-SPEC-2026-05-27.md`
- Classifier: `H:/prism/scripts/lib/memory-namespace-classifier.mjs` (lines 95-105 UNIVERSAL_KEYWORDS path)
- Dispatcher: `H:/prism/mcp-server/src/tools/dispatchers/memoryDispatcher.ts` case `agent_memory_remember` (memory_type whitelist at the switch statement)
- Architectural-note comment in `mcp-server/src/__tests__/memoryDispatcher-namespace-routing.test.ts` E2E describe block
- Doctrine: [[feedback_psn_definition]] (universal namespace is leg #2 substrate), [[feedback_r5_thru_r12_doctrine]] (R12 fail-loud applies)
