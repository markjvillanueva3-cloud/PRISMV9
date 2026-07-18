# PRISM Project Instructions - Minimal Version
# Use this WITH GSD_CORE_PROJECT_FILE.md in Project Files

---

## OPTION 1: Ultra-Minimal (~50 tokens)

```
Follow GSD_CORE in project files. First action: read ROADMAP_TRACKER.json and CURRENT_STATE.json from C:\PRISM\state\. MCP-first always.
```

---

## OPTION 2: With Auto-Actions (~100 tokens)

```
Follow GSD_CORE in project files.

EVERY CONVERSATION:
Desktop Commander:read_file "C:\PRISM\state\ROADMAP_TRACKER.json"
Desktop Commander:read_file "C:\PRISM\state\CURRENT_STATE.json"

Execute current roadmap session. Checkpoint every 5-8 items. MCP-first.
```

---

## OPTION 3: Complete but Compact (~150 tokens)

```
You are PRISM assistant. Follow GSD_CORE in project files.

START: Read ROADMAP_TRACKER.json + CURRENT_STATE.json from C:\PRISM\state\
EXECUTE: Current session deliverables from roadmap
CHECKPOINT: Every 5-8 items update both state files
MCP-FIRST: view → Desktop Commander → Filesystem → PDF Tools → PRISM MCP

If compacted (see transcript reference): view /mnt/transcripts/*.txt, resume don't restart.
```

---

## ARCHITECTURE

```
┌────────────────────────────────────────────────────────────────┐
│                    TOKEN BUDGET                                │
├────────────────────────────────────────────────────────────────┤
│  Project Instructions:  ~100 tokens (minimal trigger)         │
│  Project File GSD_CORE: ~500 tokens (auto-loaded)             │
│  ─────────────────────────────────────────────────────────────│
│  TOTAL OVERHEAD:        ~600 tokens per conversation          │
│                                                                │
│  COMPARE TO BEFORE:     ~3,000+ tokens                        │
│  SAVINGS:               ~80%                                  │
└────────────────────────────────────────────────────────────────┘
```

---

## SETUP STEPS

1. **Replace your Project File** `GSD_CORE_v3.md` with `GSD_CORE_PROJECT_FILE.md`
   - Location: C:\PRISM\prompts\GSD_CORE_PROJECT_FILE.md
   - ~100 lines vs 321 lines = 70% smaller

2. **Set Project Instructions** to Option 2 or 3 above

3. **Remove redundant project files** (MEGA_ROADMAP, etc.)
   - These are now in C:\PRISM\docs\ and accessed on-demand

---

## RECOMMENDED PROJECT FILE LIST

Keep only these in Project Files:
```
GSD_CORE_PROJECT_FILE.md  (~100 lines, ~500 tokens)
```

Move these to C:\PRISM\docs\ (access on-demand):
```
PRISM_UNIFIED_MASTER_ROADMAP_v3.md
MCP_MEGA_CONSOLIDATION_PROMPT_v1.md
PRISM_INTEGRATED_MEGA_ROADMAP_v2.md
PRISM_MEGA_ROADMAP_v1.md
```

---

## COPY THIS TO PROJECT INSTRUCTIONS:

Follow GSD_CORE in project files.

EVERY CONVERSATION:
Desktop Commander:read_file "C:\PRISM\state\ROADMAP_TRACKER.json"
Desktop Commander:read_file "C:\PRISM\state\CURRENT_STATE.json"

Execute current roadmap session. Checkpoint every 5-8 items. MCP-first.
