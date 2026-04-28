---
source: dev_protocol
section: Auto-Fire Systems (Zero Token Cost)
slug: auto-fire-systems-zero-token-cost
indexed_at: 2026-04-28T02:50:03.665Z
---

## Auto-Fire Systems (Zero Token Cost)

Fire automatically — never call manually:

### Every Call
- `autoSkillHint` — loads SKILL.md excerpt for current tool:action.
- `autoKnowledgeCrossQuery` — enriches with material/formula/machine.
- `autoScriptRecommend` — suggests Python scripts from domain mapping.
- `autoInputValidation` — pre-dispatch parameter checking.

### Error Handling (auto)
- `autoD3ErrorChain` — extractor → pattern → learning store.
- Errors become learning data; warnings emerge BEFORE repeat.

### Success Tracking (auto)
- `autoD3LkgUpdate` — last-known-good per subsystem.
- `lkg_tracker` — rollback target on break.

### Context Management (auto)
- `autoTodoRefresh @5` — attention anchor.
- `autoContextPressure @8` — window monitor.
- `autoAttentionScore @8` — importance score for trim.
- `autoCheckpoint @10` — state snapshot.
- `autoCompactionDetect @12` — predict compaction.
- `autoCompactionSurvival @15/@41+/@60%+` — triple-redundant save.

### Performance (auto)
- `ComputationCache` — 3-tier LRU (30/120/300s).
- `DiffEngine` — CRC32 dedup, skips redundant writes.
- `BatchProcessor` — priority queue, fail-fast isolation.
