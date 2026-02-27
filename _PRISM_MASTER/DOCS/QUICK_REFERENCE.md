# PRISM QUICK REFERENCE CARD v7.0
## Single Page - Everything You Need
### Print this. Keep it visible.

```
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                           PRISM MANUFACTURING INTELLIGENCE                                 ║
║                              QUICK REFERENCE CARD v7.0                                     ║
╠═══════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                           ║
║  ⛔ SESSION START (MANDATORY - DO THIS FIRST)                                             ║
║  ═══════════════════════════════════════════                                              ║
║  1. READ:  Filesystem:read_file → C:\PRISM REBUILD...\CURRENT_STATE.json                  ║
║  2. PROVE: Quote the quickResume field                                                    ║
║  3. CHECK: currentTask.status                                                             ║
║     • IN_PROGRESS → RESUME from checkpoint (NO restart!)                                  ║
║     • COMPLETE → May start new task                                                       ║
║  4. LOAD:  Relevant skill from _PRISM_MASTER\SKILLS\                                      ║
║  5. WORK:  Begin task                                                                     ║
║                                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                           ║
║  📍 PATHS (SINGLE SOURCE OF TRUTH)                                                        ║
║  ═════════════════════════════════                                                        ║
║  MASTER:    C:\PRISM REBUILD...\_PRISM_MASTER\     ← ALL resources here                   ║
║  STATE:     C:\PRISM REBUILD...\CURRENT_STATE.json                                        ║
║  SKILLS:    _PRISM_MASTER\SKILLS\ (37 active)                                             ║
║  SCRIPTS:   _PRISM_MASTER\SCRIPTS\ (organized by function)                                ║
║  AGENTS:    _PRISM_MASTER\AGENTS\ (56 agents)                                             ║
║  MONOLITH:  _BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\ (986,621 lines)                      ║
║  EXTRACTED: EXTRACTED\ (materials, machines, engines)                                     ║
║                                                                                           ║
║  ⚠️  NEVER save to /home/claude/ - RESETS EVERY SESSION                                   ║
║                                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                           ║
║  🛠️ TOOL REFERENCE                                                                        ║
║  ═════════════════                                                                        ║
║  Read file      │ Filesystem:read_file           │ path                                   ║
║  Write file     │ Filesystem:write_file          │ path, content                          ║
║  List dir       │ Filesystem:list_directory      │ path                                   ║
║  Edit file      │ Filesystem:edit_file           │ path, edits                            ║
║  Large file     │ Desktop Commander:read_file    │ path, offset, length                   ║
║  Append file    │ Desktop Commander:write_file   │ path, content, mode:"append"           ║
║  Search content │ Desktop Commander:start_search │ searchType:"content", pattern          ║
║  Run Python     │ Desktop Commander:start_process│ command, timeout_ms                    ║
║                                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                           ║
║  🛡️ BUFFER ZONES (CHECKPOINT REQUIREMENTS)                                                ║
║  ═════════════════════════════════════════                                                ║
║  🟢 GREEN   │ 0-8 tool calls   │ Work freely                                              ║
║  🟡 YELLOW  │ 9-14 tool calls  │ Plan checkpoint, complete current unit                   ║
║  🟠 ORANGE  │ 15-18 tool calls │ CHECKPOINT NOW before continuing                         ║
║  🔴 RED     │ 19+ tool calls   │ EMERGENCY STOP - checkpoint + consider handoff           ║
║                                                                                           ║
║  CHECKPOINT TRIGGERS: 10+ calls │ Before delete/replace │ End of unit │ Session end      ║
║                                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                           ║
║  ⚡ THE 4 LAWS (ALWAYS ON - CANNOT DISABLE)                                               ║
║  ═════════════════════════════════════════                                                ║
║  1. LIFE-SAFETY     │ "Would I trust this with my own physical safety?"                   ║
║  2. COMPLETENESS    │ "Is every field populated? Every case handled?"                     ║
║  3. ANTI-REGRESSION │ "Is the new version as complete as the old?"                        ║
║  4. PREDICTIVE      │ "What are 3 ways this could fail?"                                  ║
║                                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                           ║
║  🚀 API SWARM COMMANDS                                                                    ║
║  ═════════════════════                                                                    ║
║  Intelligent:    python prism_unified_system_v4.py --intelligent "task"                   ║
║  Manufacturing:  python prism_unified_system_v4.py --manufacturing "material" "op"        ║
║  Ralph loop:     python prism_unified_system_v4.py --ralph role "prompt" iterations       ║
║  List agents:    python prism_unified_system_v4.py --list                                 ║
║                                                                                           ║
║  56 AGENTS: 15 OPUS (complex) │ 32 SONNET (balanced) │ 9 HAIKU (fast)                     ║
║                                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                           ║
║  🎯 37 SKILLS BY CATEGORY                                                                 ║
║  ═════════════════════════                                                                ║
║  ALWAYS-ON (5):   life-safety │ completeness │ regression │ predictive │ orchestrator    ║
║  WORKFLOW (8):    brainstorm │ planning │ execution │ review-spec │ review-quality │     ║
║                   debugging │ verification │ handoff                                      ║
║  MONOLITH (4):    index │ extractor │ navigator │ codebase-packaging                      ║
║  MATERIALS (5):   schema │ physics │ lookup │ validator │ enhancer                        ║
║  MASTERS (7):     session │ quality │ code │ knowledge │ expert │ controller │ dev-utils  ║
║  QUALITY (2):     tdd-enhanced │ root-cause-tracing                                       ║
║  REFS (10):       api-contracts │ error-catalog │ mfg-tables │ wiring │ calculators │    ║
║                   post-processor │ fanuc │ siemens │ heidenhain │ gcode                   ║
║                                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                           ║
║  ❌ HARD STOPS (NEVER DO THESE)                                                           ║
║  ══════════════════════════════                                                           ║
║  ❌ Work without reading state first                                                      ║
║  ❌ Restart IN_PROGRESS task (MUST resume)                                                ║
║  ❌ Skip checkpoint at orange/red zone                                                    ║
║  ❌ Save to /home/claude/                                                                 ║
║  ❌ Module without 6+ consumers                                                           ║
║  ❌ Calculation with <6 data sources                                                      ║
║  ❌ Replacement without regression audit                                                  ║
║                                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                           ║
║  📋 5-SECOND RESUME FORMAT                                                                ║
║  ═════════════════════════                                                                ║
║  DOING:   [one-line what we were doing]                                                   ║
║  STOPPED: [one-line where we stopped]                                                     ║
║  NEXT:    [one-line what to do immediately]                                               ║
║                                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                           ║
║  📊 CURRENT SYSTEM STATUS                                                                 ║
║  ═════════════════════════                                                                ║
║  Materials:  1,512 @ 127 parameters each (143% of target)                                 ║
║  Monolith:   986,621 lines │ 831 modules │ v8.89.002                                      ║
║  Skills:     37 active in _PRISM_MASTER\SKILLS\                                           ║
║  Agents:     56 ready (OPUS 15, SONNET 32, HAIKU 9)                                       ║
║  Status:     Phase 2 Materials COMPLETE, System audit IN_PROGRESS                         ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
```

---

## Emergency Contacts

| Issue | Solution |
|-------|----------|
| State file corrupted | Check _PRISM_MASTER\STATE\backups\ |
| Session compacted | Read CURRENT_STATE.json for quickResume |
| Don't know where to resume | Run: python session_enforcer.py --resume |
| Protocol violation | Check: python session_enforcer.py --verify |
| Need skill | Check: _PRISM_MASTER\SKILLS\SKILL_MANIFEST.json |
| Need agent | Check: _PRISM_MASTER\AGENTS\AGENT_MANIFEST.json |

---

**Document Version:** 7.0 | **Created:** 2026-01-25 | **Location:** _PRISM_MASTER\DOCS\QUICK_REFERENCE.md
