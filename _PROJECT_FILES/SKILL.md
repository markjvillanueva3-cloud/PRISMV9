---
name: prism-development
description: |
  PRISM Manufacturing Intelligence v9.0 rebuild - MASTER SKILL FILE. This single file contains ALL critical protocols from 18 skills. Claude is PRIMARY DEVELOPER with full architectural authority. Covers: session management, tool selection, large file writing, buffer zones, extraction, state tracking, and all core rules.
---

# PRISM MASTER DEVELOPMENT SKILL v2.0
## ALL 18 SKILLS CONSOLIDATED - ALWAYS ACTIVE

---

# 🔴 SECTION 1: CRITICAL PATHS & TOOLS

## 1.1 Key Paths
```
STATE:     C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json
MONOLITH:  C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html
EXTRACTED: C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\
MATERIALS: C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\materials\enhanced\
SKILLS:    C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_SKILLS\ (or /mnt/skills/user/)
LOGS:      C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\SESSION_LOGS\
```

## 1.2 Tool Selection (Instant Decision)
| Task | Tool | Key Point |
|------|------|-----------|
| Read C: file | `Filesystem:read_file` | For state, logs, small files |
| Write C: file | `Filesystem:write_file` | For all PRISM output |
| List C: dir | `Filesystem:list_directory` | Check contents |
| Read LARGE file | `Desktop Commander:read_file` | offset + length params |
| Search content | `Desktop Commander:start_search` | searchType:"content" |
| Search files | `Desktop Commander:start_search` | searchType:"files" |
| **Append to file** | `Desktop Commander:write_file` | **mode:"append"** ⚡ |
| Run script | `Desktop Commander:start_process` | timeout_ms required |
| Read skill | `view` | /mnt/skills/user/... |

**⚠️ NEVER save PRISM work to /home/claude/ - IT RESETS EVERY SESSION!**

---

# 🚀 SECTION 2: SESSION PROTOCOL

## 2.1 Session Start (MANDATORY)
```javascript
// 1. Read state
Filesystem:read_file("C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\CURRENT_STATE.json")

// 2. Announce
═══════════════════════════════════════════════════════════════════════════
STARTING SESSION [ID]: [NAME]
Previous: [LAST_SESSION] - [STATUS]
Focus: [CURRENT_WORK]
═══════════════════════════════════════════════════════════════════════════

// 3. Check for checkpoint - resume from there
```

## 2.2 During Session
- **Checkpoint every 10-15 operations** (mini-save to state file)
- **Save after each atomic unit** (material, function, module)
- **Watch buffer zones** (see Section 5)

## 2.3 Session End (MANDATORY)
```javascript
// 1. Update CURRENT_STATE.json completely
// 2. Write session log to SESSION_LOGS/
// 3. Announce:
═══════════════════════════════════════════════════════════════════════════
COMPLETING SESSION [ID]
✓ Completed: [LIST]
✓ Files saved: [LIST]
→ Next session: [NEXT_ID]
→ State saved to: CURRENT_STATE.json
═══════════════════════════════════════════════════════════════════════════
```

---

# ⚡ SECTION 3: LARGE FILE WRITING (50KB+)

## 3.1 The Problem
Single large writes truncate around 50KB, corrupting files.

## 3.2 The Solution: Chunked Write + Append
```
CHUNK 1: Filesystem:write_file (header + first 3-4 items)
CHUNK 2: Desktop Commander:write_file mode='append' (next 3-4 items)
CHUNK 3: Desktop Commander:write_file mode='append' (remaining + closing)
```

## 3.3 Speed Comparison
| Method | Speed |
|--------|-------|
| Single large write | ❌ Truncates >50KB |
| Multiple edit_file | ❌ Very slow (diff calc) |
| **Chunked + append** | ⚡ **5x FASTER** |

## 3.4 Chunk Size Guidelines
| Entry Type | Per Chunk | ~Size |
|------------|-----------|-------|
| Materials (127 params) | 3-4 | ~20KB |
| Tools (50 params) | 5-6 | ~18KB |
| Machines (complex) | 2-3 | ~15KB |

**Rule: Keep chunks under 25KB**

## 3.5 Compact Formatting (40% smaller)
```javascript
// Instead of multi-line:
physical: {
  density: 7850,
  melting_point: { solidus: 1450, liquidus: 1500 },
  specific_heat: 486
}

// Use single-line subsections:
physical: { density: 7850, melting_point: { solidus: 1450, liquidus: 1500 }, specific_heat: 486 }
```

---

# 🛡️ SECTION 4: SESSION BUFFER ZONES

## 4.1 Why This Matters
- Context fills up → Conversation compacts → Work lost
- Response too long → Truncates mid-stream → File corrupted
- Tool call limit → Can't save → Progress lost

## 4.2 Buffer Zone Triggers

### 🟡 YELLOW ZONE (Checkpoint Soon)
| Trigger | Value |
|---------|-------|
| Tool calls since save | 10+ |
| Response length | ~2000 words |
| Conversation exchanges | 15+ |
| Task completion | 50% done |

**Action:** Finish current unit, save checkpoint, then continue

### 🔴 RED ZONE (STOP NOW)
| Trigger | Value |
|---------|-------|
| Tool calls since save | 18+ |
| Response length | ~3500 words |
| Conversation exchanges | 25+ |

**Action:** STOP immediately, save everything, write handoff, NO new work

## 4.3 Checkpoint Frequency
| Task | Checkpoint After |
|------|------------------|
| Material creation | Each material |
| File extraction | Each file |
| Database entries | Every 5-10 entries |
| Code writing | Each function |
| Default | Every 10-15 minutes |

## 4.4 Mandatory Save Sequence
```
1. Complete current atomic unit (NEVER stop mid-item)
2. Write/append work to target file
3. Verify file saved (Desktop Commander:get_file_info)
4. Update CURRENT_STATE.json checkpoint
5. Acknowledge: "✓ Checkpoint saved: [description]"
```

## 4.5 Graceful Stop Template
```markdown
═══════════════════════════════════════════════════════════════════════════
🛑 BUFFER ZONE REACHED - GRACEFUL STOP
═══════════════════════════════════════════════════════════════════════════
## Progress This Session
✓ Completed: [list]
✓ Files saved: [list with sizes]
✓ Last item: [exact item]

## Checkpoint Saved
- State file: CURRENT_STATE.json ✓
- Resume point: [exact description]

## To Continue
1. Read CURRENT_STATE.json
2. Resume from: [exact item]
3. Continue with: [next action]
═══════════════════════════════════════════════════════════════════════════
```

---

# 📋 SECTION 5: THE 10 COMMANDMENTS

1. **IF IT EXISTS, USE IT EVERYWHERE** - 100% database/engine utilization
2. **FUSE THE UNFUSABLE** - Combine concepts across domains
3. **TRUST BUT VERIFY** - Physics + empirical + historical validation
4. **LEARN FROM EVERYTHING** - Every interaction feeds ML pipeline
5. **PREDICT WITH UNCERTAINTY** - Confidence intervals on all outputs
6. **EXPLAIN EVERYTHING** - XAI for all recommendations
7. **FAIL GRACEFULLY** - Fallbacks for every operation
8. **PROTECT EVERYTHING** - Validate, sanitize, encrypt, backup
9. **PERFORM ALWAYS** - <2s page load, <500ms calculations
10. **OBSESS OVER USERS** - 3-click rule, smart defaults

---

# 🗂️ SECTION 6: HIERARCHICAL DATABASE LAYERS

```
LAYER 4: LEARNED  - AI/ML-derived (highest priority)
LAYER 3: USER     - Shop-specific customizations
LAYER 2: ENHANCED - Manufacturer-specific (33 complete)
LAYER 1: CORE     - Infrastructure, defaults, validation
```

**Resolution:** LEARNED → USER → ENHANCED → CORE → DEFAULT

---

# 📊 SECTION 7: ABSOLUTE REQUIREMENTS

- **NO module without ALL consumers wired**
- **NO calculation with fewer than 6 data sources**
- **NO session without state file update**
- **NO partial extractions**
- **VERIFY before and after EVERY operation**
- **NEVER stop mid-unit (mid-material, mid-function)**

---

# 🎯 SECTION 8: CURRENT STATUS

## Project Progress
- **Stage:** 1 (EXTRACTION) → Materials Enhancement
- **Materials:** 30/1,047 complete (~3%)
- **Modules:** 831 total in monolith
- **Skills:** 18 total, all operational

## Materials Work
- **Schema:** 127 parameters per material (SCHEMA_127_PARAMETERS.js)
- **Files:** carbon_steels_001_010.js, _011_020.js, _021_030.js complete
- **Next:** carbon_steels_031_040.js (P-CS-031 to P-CS-040)
- **Rule:** ENHANCE existing materials FIRST, then expand

---

# 🔧 SECTION 9: SKILL REFERENCES

For detailed information, read these skills with `view()`:

| Skill | Use When |
|-------|----------|
| `/mnt/skills/user/prism-extractor/SKILL.md` | Extracting modules from monolith |
| `/mnt/skills/user/prism-knowledge-base/SKILL.md` | Algorithm selection |
| `/mnt/skills/user/prism-auditor/SKILL.md` | Verifying extraction completeness |
| `/mnt/skills/user/prism-hierarchy-manager/SKILL.md` | Layer propagation rules |
| `/mnt/skills/user/prism-swarm-orchestrator/SKILL.md` | Multi-agent parallel work |

---

# ⚡ SECTION 10: QUICK COMMANDS

```javascript
// Read state (START OF EVERY SESSION)
Filesystem:read_file("C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\CURRENT_STATE.json")

// Write state (CHECKPOINT)
Filesystem:write_file({ path: "C:\\PRISM REBUILD...\\CURRENT_STATE.json", content: JSON.stringify(state, null, 2) })

// List extracted materials
Filesystem:list_directory("C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\EXTRACTED\\materials\\enhanced\\")

// Search monolith for module
Desktop Commander:start_search({ path: "C:\\...\\_BUILD\\...", pattern: "PRISM_MATERIALS", searchType: "content" })

// Append to large file (FAST)
Desktop Commander:write_file({ path: "C:\\...\\file.js", content: "...", mode: "append" })

// Verify file saved
Desktop Commander:get_file_info({ path: "C:\\...\\file.js" })

// Read skill
view("/mnt/skills/user/prism-development/SKILL.md")
```

---

# 🚨 EMERGENCY RECOVERY

If lost or confused:
```javascript
Filesystem:read_file("C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\CURRENT_STATE.json")
```

The state file has:
- `checkpoint.lastCompleted` - What was done
- `checkpoint.nextToDo` - What to do next
- `checkpoint.resumeInstructions` - How to continue

---

## END OF MASTER SKILL FILE
**Version 2.0 | Consolidates 18 skills | Always Active**
