---
name: prism-quick-start
description: |
  Fast session initialization. 30-second resume capability.
---

```
STATE:    C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json
MONOLITH: C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html
EXTRACT:  C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\
SKILLS:   C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_SKILLS\  (or /mnt/skills/user/)
LOGS:     C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\SESSION_LOGS\
```

## 2. TOOLS (Instant Decision)
| Task | Tool | Key Params |
|------|------|------------|
| Read C: file | `Filesystem:read_file` | path |
| Write C: file | `Filesystem:write_file` | path, content |
| List C: dir | `Filesystem:list_directory` | path |
| Read LARGE file | `Desktop Commander:read_file` | path, offset, length |
| Search content | `Desktop Commander:start_search` | searchType:"content", pattern |
| Search files | `Desktop Commander:start_search` | searchType:"files", pattern |
| Run script | `Desktop Commander:start_process` | command, timeout_ms |
| Read skill | `view` | path (/mnt/skills/...) |

## 3. KEY MODULE LINES (Monolith)
| Module | Line | Size Est |
|--------|------|----------|
| PRISM_GATEWAY | 11,888 | ~7K |
| PRISM_KNOWLEDGE_BASE | 101,390 | ~50K |
| PRISM_TOOL_DATABASE_V7 | 467,398 | ~140K |
| PRISM_MATERIALS_MASTER | 611,225 | ~75K |
| *See _SKILLS/prism-extraction-index/ for full list* |

## 4. SESSION PROTOCOL (Minimal)
```
START: Read CURRENT_STATE.json → Check currentTask → Execute
DURING: Checkpoint every 3 tool calls (update currentTask)
END: Update state → Write 3-line log → Announce next session
```

## 5. ANTI-RESTART RULES
- ❌ NEVER restart mid-task
- ❌ NEVER re-read files already in context
- ✅ CHECKPOINT progress → CONTINUE → COMPLETE
- ✅ If stuck: checkpoint first, then ask user

## 6. EXTRACTION TEMPLATE
```javascript
// 1. Find module (or use known line from section 3)
Desktop Commander:start_search({ pattern: "const PRISM_MODULE", searchType: "content" })

// 2. Read module
Desktop Commander:read_file({ path: "...monolith.html", offset: LINE, length: SIZE })

// 3. Write extracted
Filesystem:write_file({ path: "C:\\...\\EXTRACTED\\category\\module.js", content: "..." })
```

## 7. WHEN TO READ FULL SKILLS
| Situation | Read |
|-----------|------|
| Complex extraction | prism-extractor |
| Error occurred | prism-error-recovery |
| Need algorithm | prism-knowledge-base |
| Multi-agent work | prism-swarm-orchestrator |
| Database architecture | prism-hierarchy-manager |
| Unsure about tool | prism-tool-selector |

## 8. 10 COMMANDMENTS (Summary)
1. Use everything everywhere (100% utilization)
2. Fuse concepts across domains
3. Validate with physics + empirical + historical
4. Learn from every interaction
5. Include confidence intervals
6. Explain with XAI
7. Fail gracefully
8. Protect all data
9. <2s page load, <500ms calc
10. 3-click rule, smart defaults

## 9. CURRENT PROGRESS
- Stage: 1 (EXTRACTION)
- Modules: 48/831 extracted (~6%)
- Focus: Materials DBs → Tools DBs → Engines
- Skills: 14 total, all operational

## 10. EMERGENCY
If lost: `Filesystem:read_file({ path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\CURRENT_STATE.json" })`
