---
source: gsd_micro
section: Auto-Fire Systems (Zero Token Cost)
slug: auto-fire-systems-zero-token-cost
indexed_at: 2026-04-28T02:50:03.701Z
---

## Auto-Fire Systems (Zero Token Cost)

```
Every Call:
  autoSkillHint               loads SKILL.md excerpt
  autoKnowledgeCrossQuery     enriches with material/formula/machine
  autoScriptRecommend         suggests Python scripts
  autoInputValidation         pre-dispatch param checking

Error Handling:
  4 capture mirrors → unified-ledger-mirror → UNIFIED_ERROR_LEDGER
  PreToolUse error-block-prewarn → top-3 past errors injected
  D3 error chain (legacy local path retained for durability)

Success Tracking:
  autoD3LkgUpdate             last-known-good per subsystem
  lkg_tracker                 rollback target on break

Context Management:
  autoTodoRefresh @5          attention anchor
  autoContextPressure @8      window monitor
  autoAttentionScore @8       importance score for trim
  autoCheckpoint @10          state snapshot
  autoCompactionDetect @12    predict compaction
  autoCompactionSurvival      triple-redundant save

Performance:
  ComputationCache            3-tier LRU (30/120/300s)
  DiffEngine                  CRC32 dedup
  BatchProcessor              priority + fail-fast
```
