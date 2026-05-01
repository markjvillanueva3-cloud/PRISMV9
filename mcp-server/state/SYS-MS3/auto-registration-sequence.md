# Auto-Registration Pipeline — Sequence Diagram
## SYS-MS3-U00 Verification

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Claude     │    │   Hookify    │    │  PostToolUse │    │  PreCompact  │
│   Session    │    │  (Layer 1)   │    │   (Layer 2)  │    │  (Layer 3)   │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │                   │
       │ Write NewEngine.ts│                   │                   │
       │───────────────────┼───────────────────►                   │
       │                   │                   │                   │
       │                   │  file event       │                   │
       │                   ◄───────────────────│                   │
       │                   │                   │                   │
       │  ┌────────────────┴────────────────┐  │                   │
       │  │ hookify.master-index-drift.md   │  │                   │
       │  │ • Warns: "New source file"      │  │                   │
       │  │ • Checklist: MASTER_INDEX, etc  │  │                   │
       │  └────────────────┬────────────────┘  │                   │
       │                   │                   │                   │
       │                   │                   │ PostToolUse       │
       │                   │                   │◄──────────────────│
       │                   │                   │                   │
       │                   │  ┌────────────────┴────────────────┐  │
       │                   │  │ enforce-index-auto-update.py    │  │
       │                   │  │ • Appends to ENGINE_DIGEST.md   │  │
       │                   │  │ • Tracks in pending-index.json  │  │
       │                   │  └────────────────┬────────────────┘  │
       │                   │                   │                   │
       │ ... work continues ...                │                   │
       │                   │                   │                   │
       │ Context compaction│                   │                   │
       │───────────────────┼───────────────────┼───────────────────►
       │                   │                   │                   │
       │                   │                   │  ┌────────────────┴─────┐
       │                   │                   │  │ PreCompact hooks     │
       │                   │                   │  │ • Verifies indexes   │
       │                   │                   │  │ • Warns if stale     │
       │                   │                   │  └────────────────┬─────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
```

## Layer Summary

| Layer | Trigger | Action | File |
|-------|---------|--------|------|
| **1. Hookify** | File creation in engines/dispatchers/etc | Warns with checklist | hookify.master-index-drift.local.md |
| **2. PostToolUse** | Write to src/engines/*.ts | Auto-append ENGINE_DIGEST.md | enforce-index-auto-update.py |
| **3. PreCompact** | Context compaction | Verify MASTER_INDEX updated | enforce-precompact-audit.py |

## Verification Status

- [x] Layer 1: hookify.master-index-drift.local.md exists and enabled
- [x] Layer 2: enforce-index-auto-update.py auto-appends new engines
- [x] Layer 3: PreCompact hooks verify index freshness
- [x] All 3 layers documented

## Files Involved

```
.sessions/claude/global/hookify.master-index-drift.local.md  (Layer 1)
.claude/hooks/lib/enforce-index-auto-update.py               (Layer 2)
.claude/hooks/lib/enforce-index-sync.py                      (Layer 2 alt)
.claude/hooks/lib/enforce-precompact-audit.py                (Layer 3)
data/docs/ENGINE_DIGEST.md                                   (Target index)
data/docs/MASTER_INDEX.md                                    (Master index)
state/pending-index-update.json                              (Tracking)
```
