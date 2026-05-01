# PRISM GSD CORE v4.1
## Auto-Load Protocol | MCP-First | ~100 Lines for Project Files

---

## ON EVERY MESSAGE

```
1. Read ROADMAP:  Desktop Commander:read_file "C:\PRISM\state\ROADMAP_TRACKER.json"
2. Read STATE:    Desktop Commander:read_file "C:\PRISM\state\CURRENT_STATE.json"
3. IF COMPACTED:  view "/mnt/transcripts/[latest].txt" → Resume
4. EXECUTE:       Current session from roadmap
5. UPDATE:        Both files on completion
```

---

## MCP-FIRST PRIORITY

```
1. view              → /mnt/skills/user/, /mnt/project/
2. Desktop Commander → read_file, write_file, edit_block, start_process
3. Filesystem        → User's computer direct
4. PDF Tools         → PDFs
5. PRISM MCP (54)    → prism_* when running
```

---

## 5 LAWS

```
1. SAFETY     S(x)≥0.70 AND D(x)≥0.30 or BLOCKED
2. COMPLETE   No placeholders, 100% done
3. NO REGRESS New ≥ Old always
4. PREDICT    3 failure modes first
5. ROADMAP    Follow ROADMAP_TRACKER order
```

---

## BUFFER ZONES

```
🟢 0-8   Normal     🔴 15-18  IMMEDIATE checkpoint
🟡 9-14  Plan       ⚫ 19+    STOP, handoff
```

---

## RESOURCES

```
10,370 TOTAL in C:\PRISM\registries\:
Skills 1,252 │ Hooks 6,797 │ Scripts 1,320 │ Engines 447 │ Formulas 490 │ Agents 64

MCP: 54 tools in prism_mcp_server.py
Skills: /mnt/skills/user/ (45 fast-load)
```

---

## ROADMAP TIERS

```
T0 SURVIVAL    0.1-0.4   │ Work preservation
T1 EFFICIENCY  1.1-1.6   │ 2x token savings
T2 MCP INFRA   2.1-2.10  │ 4x (10,370 accessible)
T3 PARALLELISM 3.1-3.6   │ 7x multiplier
T4 CONTENT     27-100    │ Full system @ 7x
```

---

## CHECKPOINT (Every 5-8)

```
Desktop Commander:write_file → ROADMAP_TRACKER.json
Desktop Commander:write_file → CURRENT_STATE.json
```

---

## CRITICAL PATHS

```
ROADMAP:  C:\PRISM\state\ROADMAP_TRACKER.json
STATE:    C:\PRISM\state\CURRENT_STATE.json
SKILLS:   /mnt/skills/user/prism-*/SKILL.md
FULL DOC: C:\PRISM\docs\PRISM_UNIFIED_MASTER_ROADMAP_v3.md
```

---

## QUALITY GATES

```
□ S(x)≥0.70  □ D(x)≥0.30  □ Ω(x)≥0.65  □ Evidence≥L3  □ No placeholders
```

---

**v4.1 | Project File Version | ~100 lines | Auto-loaded every conversation**
