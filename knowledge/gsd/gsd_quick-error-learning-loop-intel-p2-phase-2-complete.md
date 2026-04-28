---
source: gsd_quick
section: ERROR LEARNING LOOP (INTEL P2 — Phase 2 complete)
slug: error-learning-loop-intel-p2-phase-2-complete
indexed_at: 2026-04-28T02:39:36.840Z
---

## ERROR LEARNING LOOP (INTEL P2 — Phase 2 complete)

```
Error captured by any of 4 hooks:
  error-block-capture / error-pattern-memory /
  error-recovery-memory / error-learner-hook
   ↓
unified-ledger-mirror.mjs (helper) → POST prism_guard:error_ledger_append
   ↓
UnifiedErrorLedgerEngine.append → UNIFIED_ERROR_LEDGER.jsonl (sha-1 dedup)
   ↓ (when Qdrant up)
QdrantMemoryEngine.remember kind=error → vector embedding
   ↓
NEXT TIME: error-block-prewarn fires PreToolUse →
  prism_guard:error_ledger_recall_similar → top-3 past errors injected
  → 100% capture coverage (was ~25% with local-only)
```
