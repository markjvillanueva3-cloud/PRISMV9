---
source: gsd_micro
section: Error Learning Loop (INTEL P2)
slug: error-learning-loop-intel-p2
indexed_at: 2026-04-28T02:50:03.684Z
---

## Error Learning Loop (INTEL P2)

```
Error captured by 4 PostToolUse hooks:
  error-block-capture / error-pattern-memory /
  error-recovery-memory / error-learner-hook
                ↓
unified-ledger-mirror.mjs (helper)
  POST prism_guard:error_ledger_append
                ↓
UnifiedErrorLedgerEngine.append
  → UNIFIED_ERROR_LEDGER.jsonl (sha-1 dedup)
                ↓ (Qdrant up)
QdrantMemoryEngine.remember kind=error
  → 768-dim vector embedded
                ↓
NEXT TIME (PreToolUse Bash/Edit):
  error-block-prewarn
  → prism_guard:error_ledger_recall_similar (top-3, score≥0.5)
  → injects "📡 Vector-similar past errors" into prompt
  → 100% capture coverage (was ~25% with local-only)

Source provenance (5 values):
  hook_block | pattern_memory | recovery | session | learner

Migration: scripts/migrate-error-ledgers.mjs merges 4 legacy silos.
Originals preserved as .deprecated.
```
