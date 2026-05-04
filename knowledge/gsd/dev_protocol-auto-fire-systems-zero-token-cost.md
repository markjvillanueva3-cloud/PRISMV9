---
source: dev_protocol
section: AUTO-FIRE SYSTEMS (zero token cost)
slug: auto-fire-systems-zero-token-cost
indexed_at: 2026-04-28T02:29:29.168Z
---

## AUTO-FIRE SYSTEMS (zero token cost)

These fire automatically — never call them manually:

### Every Call
- autoSkillHint: Loads relevant SKILL.md excerpt for current tool:action
- autoKnowledgeCrossQuery: Enriches with material/formula/machine knowledge
- autoScriptRecommend: Suggests Python scripts from domain mapping
- autoInputValidation: Pre-dispatch parameter checking

### Error Handling (automatic)
- autoD3ErrorChain: error_extractor→pattern_detector→learning_store
- Errors become learning data — patterns detected, stored, recalled
- Next occurrence: system warns BEFORE you repeat the mistake

### Success Tracking (automatic)
- autoD3LkgUpdate: Records last-known-good state per subsystem
- lkg_tracker provides rollback targets when things break

### Context Management (automatic)
- autoTodoRefresh @5: Keeps attention anchored on current task
- autoContextPressure @8: Monitors context window usage
- autoAttentionScore @8: Scores content importance for trimming
- autoCheckpoint @10: Automatic state snapshot
- autoCompactionDetect @12: Predicts when compaction will occur
- autoCompactionSurvival @15/@41+/@60%+: Triple-redundant save

### Performance (automatic)
- ComputationCache: 3-tier LRU (SAFETY=30s, STANDARD=120s, STABLE=300s)
- DiffEngine: CRC32 dedup, skips redundant writes
- BatchProcessor: Priority queue, fail-fast isolation
