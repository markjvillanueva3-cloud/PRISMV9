# PRISM GSD CORE
## Auto-Load Protocol | MCP-First | 84 MCP + Existing Tools

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

## TOOL PRIORITY (USE ALL)

```
TIER 1 - IMMEDIATE ACCESS:
  view              → /mnt/skills/user/prism-*/SKILL.md (45 skills fast-load)
  view              → /mnt/project/ files
  Desktop Commander → read_file, write_file, edit_block, start_process
  Filesystem        → User's computer direct access

TIER 2 - SPECIALIZED:
  PDF Tools         → read_pdf_content, fill_pdf, list_pdfs
  Figma             → get_design_context, get_screenshot
  web_search        → External info verification
  google_drive      → Document access

TIER 3 - PRISM MCP (80 tools):
  prism_mcp_server.py → All prism_* tools
  Run via: start_process "python C:\PRISM\scripts\prism_mcp_server.py"
```

---

## EXISTING SKILLS (USE THESE!)

```
FAST-LOAD (view /mnt/skills/user/prism-*/SKILL.md):
  prism-quick-start        → Session startup (READ FIRST)
  prism-cognitive-core     → 5 AI patterns always-on
  prism-session-master     → Unified session management
  prism-code-master        → Code patterns, algorithms
  prism-material-physics   → Kienzle, Taylor, Johnson-Cook
  prism-knowledge-master   → MIT course lookups
  prism-quality-master     → Validation, quality checks
  prism-expert-master      → 10 domain expert agents
  prism-dev-utilities      → Development tools
  prism-monolith-navigator → 986K line codebase search

CONSOLIDATED (C:\PRISM\skills-consolidated\):
  135 total skills across all domains
  Use: Desktop Commander:list_directory "C:\PRISM\skills-consolidated"
```

---

## EXISTING REGISTRIES (USE THESE!)

```
LOCATION: C:\PRISM\registries\

SKILL_REGISTRY.json      → 135 skills with descriptions
HOOK_REGISTRY.json       → 147 hooks, 25 categories  
FORMULA_REGISTRY.json    → 109 formulas, 20 domains
AGENT_REGISTRY.json      → 64 agents, 3 tiers (OPUS/SONNET/HAIKU)
SCRIPT_REGISTRY.json     → Python automation scripts
ENGINE_REGISTRY.json     → Calculation engines

Access: Desktop Commander:read_file "C:\PRISM\registries\[name].json"
```

---

## EXISTING PYTHON TOOLS (USE THESE!)

```
LOCATION: C:\PRISM\scripts\

gsd_startup.py           → Session initialization
master_sync.py           → Excel→JSON→DuckDB→Obsidian→Drive
api_swarm_executor_v2.py → Parallel API calls

CORE MODULES (C:\PRISM\scripts\core\):
  context_compressor.py  → Smart compression
  cache_manager.py       → KV-cache stability
  error_learner.py       → Pattern learning
  attention_scorer.py    → Relevance scoring
  template_optimizer.py  → Prompt optimization
  batch_processor.py     → Parallel execution
  queue_manager.py       → Priority queues

Run via: Desktop Commander:start_process "python [script]"
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

## MCP SERVER TOOLS (84 total)

```
ORCHESTRATION (14): prism_skill_*, prism_agent_*, prism_hook_*, prism_formula_*
DATA QUERY (9):     prism_material_*, prism_machine_*, prism_alarm_*
PHYSICS (12):       prism_physics_*, prism_cutting_*
STATE (11):         prism_state_*, prism_event_*, prism_decision_*
VALIDATION (8):     prism_validate_*, prism_quality_*
RECOVERY (3):       prism_compaction_*, prism_transcript_*, prism_state_reconstruct
SESSION (5):        prism_session_*, prism_context_pressure
APPEND-ONLY (4):    prism_state_append, prism_checkpoint_*
CACHE (2):          prism_cache_validate, prism_json_sort
CONTEXT (3):        prism_context_size/compress/expand
ERROR (3):          prism_error_log/analyze/learn
ATTENTION (2):      prism_attention_focus, prism_relevance_score
PROMPT (2):         prism_prompt_build, prism_template_get
BATCH (2):          prism_batch_execute, prism_queue_status
RESOURCE (4):       prism_resource_get/search/list, prism_registry_get
```

---

## DATABASES (ACCESS VIA MCP OR DIRECT)

```
MATERIALS: 1,047 materials × 127 parameters
  - Kienzle cutting force coefficients
  - Johnson-Cook material models
  - Taylor tool life equations
  MCP: prism_material_get, prism_material_search

MACHINES: 824 machines × 43 manufacturers
  MCP: prism_machine_get, prism_machine_search

ALARMS: 9,200 codes × 12 controller families
  MCP: prism_alarm_search
```

---

## CONTEXT MANAGEMENT

```
prism_context_size     → Check: 🟢0-60% 🟡60-75% 🟠75-85% 🔴85-92% ⚫>92%
prism_context_compress → Auto-compress when ORANGE+
prism_context_expand   → Restore compressed content
```

---

## BUFFER ZONES

```
🟢 0-8   Normal     🔴 15-18  IMMEDIATE checkpoint
🟡 9-14  Plan       ⚫ 19+    STOP, handoff
```

---

## ROADMAP TIERS

```
T0 SURVIVAL    0.1-0.4   │ Work preservation ✓ COMPLETE
T1 EFFICIENCY  1.1-1.6   │ Token savings ✓ COMPLETE
T2 MCP INFRA   2.1-2.10  │ Resource access ← CURRENT
T3 PARALLELISM 3.1-3.6   │ Swarm execution
T4 CONTENT     27-100    │ Full implementation
```

---

## SESSION END CHECKLIST

```
□ MCP server updated (version, tool count)
□ GSD_CORE.md updated
□ Memories updated (#11 MCP, #26 Roadmap)
□ ROADMAP_TRACKER.json updated
□ CURRENT_STATE.json updated
```

---

## CRITICAL PATHS

```
ROADMAP:    C:\PRISM\state\ROADMAP_TRACKER.json
STATE:      C:\PRISM\state\CURRENT_STATE.json
SKILLS:     /mnt/skills/user/prism-*/SKILL.md (45 fast-load)
SKILLS-ALL: C:\PRISM\skills-consolidated\ (135 total)
REGISTRIES: C:\PRISM\registries\
CORE:       C:\PRISM\scripts\core\
MCP SERVER: C:\PRISM\scripts\prism_mcp_server.py
```

---

## QUALITY GATES

```
□ S(x)≥0.70  □ D(x)≥0.30  □ Ω(x)≥0.65  □ Evidence≥L3  □ No placeholders
```

---

**PRISM GSD CORE | Tier 0✓ Tier 1✓ | 84 MCP + 135 Skills + 109 Formulas + 64 Agents**
