# PRISM GSD (Get Stuff Done) SYSTEM v1.0
## Context-Optimized Rapid Execution Framework
## Created: 2026-01-30

---

# PHILOSOPHY

```
┌─────────────────────────────────────────────────────────────────────────┐
│  GSD PRINCIPLE: Maximum Output, Minimum Context, Zero Quality Loss     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  OLD WAY: Load everything → Hope it fits → Run out of context          │
│  GSD WAY: Load minimum → Execute fast → Expand only when needed        │
│                                                                         │
│  Context Budget Strategy:                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  TIER 0 (Always): Core laws, safety, state (2KB)                │   │
│  │  TIER 1 (Task):   Relevant skills only (5-20KB)                 │   │
│  │  TIER 2 (Expand): On-demand deep reference (as needed)          │   │
│  │  TIER 3 (File):   Everything else stays on disk                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Result: 10x more work per session, same quality                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# PART 1: ULTRA-COMPACT CORE (2KB - Always Loaded)

```
╔═══════════════════════════════════════════════════════════════════════╗
║                    GSD CORE - FITS IN ANY CONTEXT                      ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║  4 LAWS (Hardcoded):                                                   ║
║  1. SAFETY: S(x) ≥ 0.70 or BLOCK                                       ║
║  2. COMPLETE: No placeholders, no TODOs                                ║
║  3. NO REGRESSION: New ≥ Old (always compare)                          ║
║  4. PREDICT: 3 failure modes before action                             ║
║                                                                        ║
║  WORKFLOW: READ_STATE → IDENTIFY_TASK → LOAD_NEEDED → EXECUTE → SAVE   ║
║                                                                        ║
║  QUALITY: Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L                ║
║                                                                        ║
║  STATE: C:\PRISM REBUILD...\CURRENT_STATE.json                         ║
║  SKILLS: /mnt/skills/user/ (fast) or C:\PRISM\skills-consolidated      ║
║                                                                        ║
╚═══════════════════════════════════════════════════════════════════════╝
```

---

# PART 2: TASK-TYPE SKILL BUNDLES

Instead of loading all 135 skills, load ONLY what's needed:

## Bundle: EXTRACTION (Monolith Work)
```json
{
  "bundle_id": "EXTRACTION",
  "skills": ["prism-monolith-extractor", "prism-monolith-index", "prism-monolith-navigator"],
  "context_cost": "~15KB",
  "triggers": ["extract", "monolith", "module", "v8.89"]
}
```

## Bundle: MATERIALS (Database Work)
```json
{
  "bundle_id": "MATERIALS",
  "skills": ["prism-material-schema", "prism-material-physics", "prism-material-enhancer"],
  "context_cost": "~12KB",
  "triggers": ["material", "steel", "aluminum", "Kienzle", "Johnson-Cook"]
}
```

## Bundle: ALARM (Controller Alarms)
```json
{
  "bundle_id": "ALARMS",
  "skills": ["prism-controller-quick-ref", "prism-fanuc-programming", "prism-error-catalog"],
  "context_cost": "~15KB",
  "triggers": ["alarm", "FANUC", "HAAS", "SIEMENS", "controller"]
}
```

## Bundle: WORKFLOW (Planning/Review)
```json
{
  "bundle_id": "WORKFLOW",
  "skills": ["prism-sp-planning", "prism-sp-execution", "prism-sp-review-quality"],
  "context_cost": "~20KB",
  "triggers": ["plan", "review", "brainstorm", "design"]
}
```

## Bundle: CODE (Development)
```json
{
  "bundle_id": "CODE",
  "skills": ["prism-code-master", "prism-tdd-enhanced", "prism-debugging"],
  "context_cost": "~15KB",
  "triggers": ["code", "function", "class", "debug", "test"]
}
```

## Bundle: COGNITIVE (Quality Assessment)
```json
{
  "bundle_id": "COGNITIVE",
  "skills": ["prism-master-equation", "prism-safety-framework", "prism-reasoning-engine"],
  "context_cost": "~10KB",
  "triggers": ["quality", "Ω(x)", "safety", "validate"]
}
```

---

# PART 3: CONTEXT EXPANSION STRATEGIES

## Strategy 1: Hierarchical Summarization
```
INSTEAD OF: Loading full 50KB skill
DO THIS:    Load 2KB summary → Expand sections on demand

Example:
┌─────────────────────────────────────────────────────────────┐
│ prism-material-schema SUMMARY (2KB)                         │
├─────────────────────────────────────────────────────────────┤
│ PURPOSE: 127-parameter material structure                   │
│ SECTIONS: [identification, mechanical, thermal, cutting,    │
│            tribology, chip_formation, surface_integrity]    │
│ KEY_PARAMS: kc1_1, mc, Johnson_Cook_A/B/C/n/m              │
│ EXPAND: view /mnt/skills/user/prism-material-schema/SKILL.md│
│         → Lines 50-150 for mechanical properties            │
│         → Lines 200-350 for Kienzle coefficients            │
└─────────────────────────────────────────────────────────────┘
```

## Strategy 2: External Memory Files
```
SESSION MEMORY (Persists across compactions):
┌─────────────────────────────────────────────────────────────┐
│ C:\PRISM\state\SESSION_MEMORY.json                          │
├─────────────────────────────────────────────────────────────┤
│ {                                                           │
│   "currentTask": "Extract FANUC alarms 451-500",            │
│   "completedItems": [1,2,3,...,450],                        │
│   "pendingItems": [451,452,...,500],                        │
│   "decisions": ["Use category SERVO for motion alarms"],    │
│   "blockers": [],                                           │
│   "contextSnapshot": "ALARM_BUNDLE loaded"                  │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘

On compaction: Read SESSION_MEMORY.json → Resume instantly
```

## Strategy 3: Chunked Skill Loading
```python
def load_skill_section(skill_name: str, section: str) -> str:
    """Load only the section needed, not the whole skill."""
    skill_index = {
        "prism-material-schema": {
            "mechanical": (50, 150),
            "thermal": (151, 250),
            "cutting": (251, 400),
            "kienzle": (401, 500)
        }
    }
    start, end = skill_index[skill_name][section]
    # Use view tool with line range
    return f"view /mnt/skills/user/{skill_name}/SKILL.md lines {start}-{end}"
```

## Strategy 4: Compressed State Protocol
```
FULL STATE (Current): ~5KB JSON with full history
COMPRESSED STATE:     ~500 bytes with essentials only

COMPRESSED FORMAT:
{
  "v": "20.0.0",
  "task": "ALARM-DB",
  "progress": "1485/9200",
  "bundle": "ALARMS",
  "checkpoint": "FANUC-450",
  "next": "FANUC-451-500"
}
```

---

# PART 4: GSD EXECUTION PROTOCOL

## Micro-Protocol (Replaces 45KB prompt)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GSD MICRO-PROTOCOL                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. READ STATE (1 call)                                                 │
│     → C:\PRISM REBUILD...\CURRENT_STATE.json                            │
│     → Extract: task, progress, bundle needed                            │
│                                                                         │
│  2. LOAD BUNDLE (0-3 calls)                                             │
│     → If task=EXTRACTION → Load EXTRACTION bundle                       │
│     → If task=MATERIALS  → Load MATERIALS bundle                        │
│     → If task=ALARMS     → Load ALARMS bundle                           │
│     → If task=CODE       → Load CODE bundle                             │
│                                                                         │
│  3. EXECUTE (N calls)                                                   │
│     → Do the actual work                                                │
│     → Checkpoint every 5-8 items                                        │
│     → Save progress to SESSION_MEMORY.json                              │
│                                                                         │
│  4. SAVE STATE (1 call)                                                 │
│     → Update CURRENT_STATE.json                                         │
│     → Update SESSION_MEMORY.json                                        │
│                                                                         │
│  TOTAL OVERHEAD: 2-5 tool calls (vs 10-15 in old system)                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# PART 5: CONTEXT WINDOW EXPANSION TECHNIQUES

## Technique 1: MCP Memory Server (Future)
```
Anthropic MCP could provide:
- Persistent memory across sessions
- Vector similarity search for relevant context
- Automatic summarization of old conversations

Status: Not yet available, but designed for this
```

## Technique 2: Skill Compilation
```
COMPILE skills into ultra-compact executable form:

BEFORE (prism-material-schema.md): 53KB
AFTER  (prism-material-schema.compiled): 5KB

Compilation removes:
- Markdown formatting
- Examples (stored separately)
- Verbose explanations
- Keeps: Parameters, formulas, decision trees
```

## Technique 3: Progressive Context Loading
```
LEVEL 1: Task identification (500 tokens)
         ↓ Need more?
LEVEL 2: Relevant skill summaries (2K tokens)
         ↓ Need more?
LEVEL 3: Specific skill sections (5K tokens)
         ↓ Need more?
LEVEL 4: Full skill content (20K tokens)
         ↓ Need more?
LEVEL 5: Reference lookups on demand
```

## Technique 4: Conversation Compaction Triggers
```
TRIGGER COMPACTION PROACTIVELY:
- After completing a major milestone
- Before starting new task type
- When context pressure > 70%

COMPACTION SAVES:
- SESSION_MEMORY.json (detailed progress)
- CHECKPOINT.json (exact resumption point)
- DECISIONS.json (why choices were made)

POST-COMPACTION RESUME:
- Read 3 small files
- Instant context reconstruction
- Zero lost progress
```

---

# PART 6: IMPLEMENTATION FILES

## File 1: GSD_CORE.md (2KB - Always in Project Files)
Ultra-compact core that replaces 45KB prompt for routine tasks.

## File 2: SKILL_BUNDLES.json
Pre-defined skill combinations for common task types.

## File 3: SKILL_INDEX.json  
Line-number index for surgical skill section loading.

## File 4: SESSION_MEMORY.json
Persistent memory that survives compaction.

## File 5: GSD_LOADER.py
Python script to generate optimal context for task type.

---

# PART 7: EXPECTED IMPROVEMENTS

| Metric | Current | With GSD | Improvement |
|--------|---------|----------|-------------|
| Context per session | ~100K tokens | ~30K tokens | 3x more headroom |
| Skill loading | All 135 | 3-5 relevant | 95% reduction |
| Startup overhead | 10-15 calls | 2-5 calls | 2-3x faster |
| Work per session | 15-25 items | 40-60 items | 2-3x throughput |
| Compaction recovery | Manual | Automatic | Instant resume |
| Quality | High | High | Maintained |

---

# QUICK START

```
TO USE GSD:

1. Add GSD_CORE.md to Claude Project Files (2KB)
2. Remove or reduce DEVELOPMENT_PROMPT_v15.md
3. Let Claude load skills on-demand via bundles
4. Use SESSION_MEMORY.json for persistence

COMMAND: "GSD mode: [task description]"
RESULT:  Minimal context, maximum output
```

---

**VERSION**: 1.0
**CREATED**: 2026-01-30
**PHILOSOPHY**: Do more with less. Quality is non-negotiable.
