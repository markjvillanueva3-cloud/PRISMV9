# PRISM GSD v9.0 - Tracking & Chat Storage Edition
## Get Shit Done - With Perfect Memory

---

## SESSION START PROTOCOL (MANDATORY)
```
1. prism_gsd_core                    → Load instructions
2. Read ACTION_TRACKER.md            → What did I do last?
3. Read latest chat summary          → Context from last session
4. Read PRIORITY_ROADMAP.json        → Current priorities
5. prism_todo_update                 → Anchor attention
```

## 5 LAWS (HARD REQUIREMENTS)
1. **S(x)≥0.70** - Safety score HARD BLOCK
2. **No placeholders** - 100% complete
3. **New≥Old** - Never lose data
4. **MCP First** - 277 tools before files
5. **TRACK EVERYTHING** - ACTION_TRACKER + Chat Storage

## TRACKING RULES (NEW)
- READ ACTION_TRACKER.md every response
- UPDATE after every tool call
- CHECK before calling tools (avoid duplicates)
- prism_todo_update every 5 calls

## CHAT STORAGE
```
Location: C:\PRISM\mcp-server\data\chats\
├── sessions/    → Full transcripts
├── summaries/   → Key points (300 tokens)
└── index.json   → Topic lookup
```

**During Session:** Append key exchanges
**End Session:** Update summary + index
**Start Session:** Read summary for context
**After Compaction:** Read summary to restore

## WORKFLOW (All Hook-Enabled)
```
BRAINSTORM (mandatory) → PLAN → EXECUTE → REVIEW
     ↓                    ↓       ↓         ↓
  CALC-001           BATCH-001  AGENT-001  FORMULA-001
```

## BUFFER ZONES
🟢 0-8: Normal
🟡 9-14: Checkpoint + prism_todo_update
🔴 15-18: URGENT checkpoint
⚫ 19+: STOP ALL WORK

## KEY TOOLS
| Category | Tools |
|----------|-------|
| Tracking | ACTION_TRACKER.md, prism_todo_update |
| Context | Chat summaries, CURRENT_STATE.json |
| Dev | prism_sp_brainstorm, prism_cognitive_check |
| Batch | prism_master_batch, swarm_parallel |
| Validation | prism_validate_gates_full |

## MASTER EQUATION
Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L
- ≥0.85: Excellent
- ≥0.70: Release
- <0.70: Block

## SESSION END PROTOCOL
```
1. Update ACTION_TRACKER.md           → Final state
2. Update chat session file           → Full transcript
3. Update chat summary                → Key outcomes
4. Update index.json                  → Topics covered
5. prism_cognitive_check              → Final Ω score
6. Update CURRENT_STATE.json          → Persist state
```

## COMPACTION RECOVERY
```
IF context compacts:
1. Read chat summary (300 tokens)     → Quick refresh
2. Read ACTION_TRACKER.md             → Last 5 actions
3. Read CURRENT_STATE.json            → Full state
4. Resume with full context
```

## FILES (AUTHORITATIVE)
| File | Purpose |
|------|---------|
| C:\PRISM\mcp-server\PRIORITY_ROADMAP.json | Roadmap |
| C:\PRISM\state\ACTION_TRACKER.md | Last 5 actions |
| C:\PRISM\state\CURRENT_STATE.json | Full state |
| C:\PRISM\mcp-server\data\chats\ | Chat persistence |

## NEVER
- Read roadmaps from C:\PRISM\docs\ (OUTDATED)
- Run tools without checking tracker
- Forget chat storage updates
- Skip brainstorm before implementation

---
v9.0 | 2026-02-04 | Tracking + Chat Storage Integrated
