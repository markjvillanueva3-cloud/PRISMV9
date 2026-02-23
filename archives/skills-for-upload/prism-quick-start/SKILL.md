# PRISM Quick Start v2.0
## Single-Page Session Protocol | MCP-First | Roadmap-Driven | ~100 Lines

---

## SESSION START (Do This Every Time)

```
1. READ ROADMAP:  Desktop Commander:read_file path="C:\PRISM\state\ROADMAP_TRACKER.json"
2. READ STATE:    Desktop Commander:read_file path="C:\PRISM\state\CURRENT_STATE.json"  
3. IF COMPACTED:  view path="/mnt/transcripts/[latest].txt" → Resume, don't restart
4. EXECUTE:       Current session deliverables from ROADMAP_TRACKER
5. UPDATE:        Both files on completion
```

---

## MCP-FIRST TOOL PRIORITY

```
ALWAYS USE IN THIS ORDER:
1. Desktop Commander  → read_file, write_file, edit_block, list_directory, start_process
2. Filesystem         → read_file, write_file, search_files (user's computer)
3. PDF Tools          → read_pdf_content, fill_pdf
4. PRISM MCP (54)     → prism_* tools when server running
5. Manual approach    → ONLY if no MCP tool exists
```

---

## CURRENT ROADMAP POSITION

```
ROADMAP: PRISM_UNIFIED_MASTER_ROADMAP_v3.md (100 sessions, 300 hrs)
PATH:    C:\PRISM\state\ROADMAP_TRACKER.json

TIERS:
├── TIER 0: SURVIVAL      Sessions 0.1-0.4   │ Work never lost
├── TIER 1: EFFICIENCY    Sessions 1.1-1.6   │ 10x token savings  
├── TIER 2: MCP INFRA     Sessions 2.1-2.10  │ 10,370 resources
├── TIER 3: PARALLELISM   Sessions 3.1-3.6   │ 7x multiplier
└── TIER 4: CONTENT       Sessions 27-100    │ Engines, DBs, Products

CURRENT: Check ROADMAP_TRACKER.json for live position
```

---

## QUALITY GATES (Must Pass)

```
□ S(x) ≥ 0.70   Safety score (HARD BLOCK)
□ D(x) ≥ 0.30   Anomaly detection (HARD BLOCK)  
□ Ω(x) ≥ 0.65   Overall quality
□ Evidence ≥ L3 Content sample minimum
□ No placeholders, TODOs, or incomplete work
□ Anti-regression: new_count ≥ old_count
```

---

## RESOURCES (10,370 Total)

```
REGISTRIES:     C:\PRISM\registries\*.json
├── Skills:     1,252   │ SKILL_REGISTRY.json
├── Hooks:      6,797   │ HOOK_REGISTRY.json
├── Scripts:    1,320   │ SCRIPT_REGISTRY.json
├── Engines:    447     │ ENGINE_REGISTRY.json
├── Formulas:   490     │ FORMULA_REGISTRY.json
└── Agents:     64      │ AGENT_REGISTRY.json

SKILLS FAST:    /mnt/skills/user/[name]/SKILL.md (43 skills)
MCP SERVER:     C:\PRISM\mcp-server\prism_mcp_server.py (54 tools)
```

---

## CRITICAL PATHS

```
ROADMAP:    C:\PRISM\state\ROADMAP_TRACKER.json    ← READ FIRST
STATE:      C:\PRISM\state\CURRENT_STATE.json
EVENTS:     C:\PRISM\state\events\*.jsonl
TRANSCRIPTS:/mnt/transcripts/*.txt                 ← Compaction recovery
GSD FULL:   C:\PRISM\docs\GSD_CORE_v4.md          ← If need details
```

---

## BUFFER ZONES

```
🟢 0-8 calls   Normal execution
🟡 9-14 calls  Plan checkpoint
🔴 15-18 calls IMMEDIATE checkpoint  
⚫ 19+ calls   STOP, save state, handoff
```

---

## 5 LAWS

```
1. SAFETY     S(x) ≥ 0.70 AND D(x) ≥ 0.30 or BLOCKED
2. COMPLETE   No placeholders, no TODOs, 100% done
3. NO REGRESS New ≥ Old always
4. PREDICT    3 failure modes before action
5. ROADMAP    Follow ROADMAP_TRACKER.json order
```

---

## CHECKPOINT PROTOCOL

```
Every 5-8 items:
1. Update ROADMAP_TRACKER.json with progress
2. Update CURRENT_STATE.json quickResume
3. Log to C:\PRISM\state\events\*.jsonl
```

---

## MANUFACTURING CONTEXT

```
PRISM = Safety-critical CNC software
Wrong calculations = tool explosions, operator injury, death
NO shortcuts. NO placeholders. Mathematical certainty required.
```

---

**v2.0 | MCP-First | Roadmap-Driven | ~100 lines**
