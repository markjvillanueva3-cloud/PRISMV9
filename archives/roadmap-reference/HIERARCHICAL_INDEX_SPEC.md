# PRISM HIERARCHICAL INDEX — SPECIFICATION v2.0
# Defines the 8-branch universal index that covers EVERYTHING in the PRISM system
# Every roadmap phase contributes to this index as a byproduct of its normal work
# Scope: code, data, relationships, learnings, skills, hooks, protocols, GSD, config, tests, docs
# Location: C:\PRISM\mcp-server\data\docs\roadmap\HIERARCHICAL_INDEX_SPEC.md

---

## PURPOSE

PRISM has a discoverability problem. The system contains 31 dispatchers, 368 actions,
37 engines, 500 formulas, 3,518 materials, 5,238 tools, 1,016 machines, and 10,033 alarms.
Navigating this requires 8-12 calls to trace a single dependency chain. The hierarchical
index makes any concept findable in 1-2 lookups by organizing ALL system knowledge into
four interconnected branches.

## THE EIGHT BRANCHES

```
WHAT THE SYSTEM IS:
  BRANCH 1: EXECUTION CHAIN    — how code flows (auto-generated from source)
  BRANCH 2: DATA TAXONOMY      — how knowledge is organized (built from registry structure)
  BRANCH 3: RELATIONSHIPS      — how things connect across registries (discovered during validation)
  BRANCH 4: SESSION KNOWLEDGE  — what Claude has learned (extracted from every session)

HOW THE SYSTEM OPERATES:
  BRANCH 5: SKILLS + HOOKS + SCRIPTS — operational intelligence (126 skills, 30+ hooks, wiring)
  BRANCH 6: PROTOCOLS + GSD + CONFIG — system behavior rules (GSD routing, protocols, state files)
  BRANCH 7: DOCUMENTATION INDEX     — roadmap + reference docs (anchored sections, cross-refs)
  BRANCH 8: TEST + VALIDATION       — quality assurance (test coverage, safety matrix, gates)
```

### WHY 8 BRANCHES:
Branches 1-4 answer "what exists and what have we learned."
Branches 5-8 answer "how do we operate and how do we verify."
A session that loads relevant entries from ALL 8 branches has complete operational awareness:
  - WHAT to do (Branch 7: roadmap position + phase doc sections)
  - HOW the code works (Branch 1: execution chain for the current domain)
  - WHAT data is involved (Branch 2: registry taxonomy for current operation)
  - WHAT connections exist (Branch 3: cross-registry relationships)
  - WHAT tools to use (Branch 5: skills + hooks for current phase)
  - WHAT rules to follow (Branch 6: protocols + GSD routing)
  - WHAT has been learned before (Branch 4: session knowledge)
  - HOW to verify (Branch 8: tests + validation for current work)
```

---

## BRANCH 1: EXECUTION CHAIN

**What it answers:** "When I call prism_calc action=speed_feed, what actually happens?"
**Generated from:** TypeScript source code (dispatchers, engines, services)
**Update trigger:** Regenerate after every `npm run build`
**Storage:** `C:\PRISM\knowledge\code-index\EXECUTION_CHAIN.json`
**Built during:** DA-MS6

### Schema
```json
{
  "dispatchers": {
    "prism_calc": {
      "file": "src/dispatchers/calcDispatcher.ts",
      "actions": {
        "speed_feed": {
          "parameters": ["material_id", "tool_id", "operation", "depth_of_cut", "width_of_cut"],
          "engines": ["SpeedFeedEngine", "SafetyEngine"],
          "registries_read": ["materials", "tools"],
          "formulas_used": ["chip_thinning_compensation", "effective_cutting_speed"],
          "returns": "SpeedFeedResult",
          "safety_critical": true
        }
      }
    }
  },
  "engines": {
    "SpeedFeedEngine": {
      "file": "src/engines/speedFeedEngine.ts",
      "called_by": ["prism_calc.speed_feed", "prism_calc.optimize_parameters"],
      "calls": ["FormulaEngine.evaluate", "MaterialRegistry.get", "ToolRegistry.get"],
      "formulas": ["chip_thinning_compensation", "effective_cutting_speed", "surface_speed_to_rpm"]
    }
  },
  "formulas": {
    "chip_thinning_compensation": {
      "file": "src/formulas/chipThinning.ts",
      "domain": "cutting_parameters",
      "inputs": ["ae", "Dc", "fz_programmed"],
      "outputs": ["fz_effective"],
      "used_by": ["SpeedFeedEngine", "ToolpathEngine"]
    }
  }
}
```

### Generation Method
```
SCRIPT: scripts/generate-code-index.ps1 (or .ts for Claude Code)
1. Parse all src/dispatchers/*.ts files
   - Extract: action names from switch/case or action maps
   - Extract: parameter interfaces from type definitions
   - Extract: engine instantiations (new XxxEngine or engine.xxx calls)
2. Parse all src/engines/*.ts files
   - Extract: which dispatchers reference them (grep for class name)
   - Extract: which formulas they call (grep for formula identifiers)
   - Extract: which registries they read (grep for registry.get/search)
3. Parse all src/formulas/*.ts files
   - Extract: input/output parameter names from function signatures
   - Extract: which engines import them
4. Build the JSON graph linking everything
5. Write EXECUTION_CHAIN.json
6. Print summary: "X dispatchers, Y actions, Z engines, W formulas indexed"
```

### Traversal Examples
```
QUESTION: "What calculates cutting force?"
LOOKUP: Search actions for "force" → prism_calc.cutting_force
TRACE DOWN: → KienzleForceEngine → kienzle_specific_force formula → needs kc1_1, mc from materials
ANSWER: prism_calc action=cutting_force → KienzleForceEngine → kienzle formula → material.kc1_1

QUESTION: "What uses the materials registry?"
LOOKUP: Search registries_read for "materials" → 12 actions across 4 dispatchers
ANSWER: List of every action that reads material data, with their parameters
```

---

## BRANCH 2: DATA TAXONOMY

**What it answers:** "What data exists for face mills?" or "How are materials organized?"
**Generated from:** Registry file structure + schema definitions
**Update trigger:** Regenerate after registry enrichment (R1 milestones)
**Storage:** `C:\PRISM\knowledge\data-index\DATA_TAXONOMY.json`
**Built during:** R1 (MS5 tools, MS6 materials, MS7 machines, MS9 quality gate)

### Schema
```json
{
  "materials": {
    "total": 3518,
    "organization": "ISO_group → family → grade",
    "groups": {
      "P": {
        "name": "Steel",
        "count": 1247,
        "families": {
          "carbon_steel": {
            "count": 312,
            "grades": ["AISI-1018", "AISI-1045", "AISI-1095"],
            "common_properties": ["tensile_strength", "hardness", "kc1_1", "mc"],
            "coverage": {
              "mechanical": "98%",
              "machinability": "87%",
              "thermal": "45%",
              "tribology": "12%"
            }
          }
        }
      }
    },
    "property_schema": {
      "mechanical": ["tensile_strength", "yield_strength", "elongation", "hardness"],
      "machinability": ["kc1_1", "mc", "machinability_rating", "chip_form"],
      "thermal": ["conductivity", "specific_heat", "max_working_temp"],
      "tribology": ["friction_coefficient", "wear_rate", "adhesion_tendency"]
    }
  },
  "tools": {
    "total": 5238,
    "organization": "category → type → diameter → insert_grade",
    "categories": {
      "milling": {
        "count": 2104,
        "types": {
          "face_mill": { "count": 487, "diameters": ["25mm-200mm"] },
          "end_mill": { "count": 891, "diameters": ["1mm-50mm"] },
          "ball_nose": { "count": 312, "diameters": ["1mm-32mm"] }
        }
      }
    }
  },
  "machines": {
    "total": 1016,
    "organization": "manufacturer → model → variant",
    "manufacturers": {
      "Okuma": {
        "count": 47,
        "models": {
          "Multus_B250II": {
            "type": "multi-tasking_lathe",
            "spindle": { "max_rpm": 5000, "max_power_kW": 22 },
            "envelope": { "x_mm": 650, "z_mm": 1100 }
          }
        }
      }
    }
  },
  "alarms": {
    "total": 10033,
    "organization": "controller_family → code_range → severity",
    "families": {
      "Fanuc": { "count": 3200, "ranges": ["0-99 program", "100-255 axis", "300-399 servo"] },
      "Okuma_OSP": { "count": 1800, "ranges": ["0-999 system", "1000-1999 axis", "2000-2999 spindle"] }
    }
  }
}
```

### Generation Method
```
SCRIPT: scripts/generate-data-taxonomy.ps1
1. Scan material registry directory structure
   - Count files per ISO group, per family
   - Sample 10 files per family: extract property coverage %
2. Scan tool registry
   - Count files per category, per type
   - Extract diameter ranges, insert grade types
3. Scan machine registry
   - Count per manufacturer, per model
   - Extract key specs (spindle, envelope, controller)
4. Scan alarm registry
   - Count per controller family, per code range
5. Build DATA_TAXONOMY.json
6. Print coverage summary
```

---

## BRANCH 3: RELATIONSHIP GRAPH

**What it answers:** "What tools work with Inconel 718?" or "What constraints apply?"
**Discovered through:** R2 calculation validation, R3 campaigns, R7 coupled physics
**Update trigger:** After each validated relationship discovery
**Storage:** `C:\PRISM\knowledge\relationships\RELATIONSHIP_GRAPH.json`
**Built during:** R2 (validated), R3 (enriched), R7 (physics-coupled)

### Schema
```json
{
  "edges": [
    {
      "from": { "type": "material", "id": "Inconel-718", "group": "S" },
      "to": { "type": "tool_grade", "id": "carbide_C6_plus" },
      "relationship": "compatible",
      "confidence": "validated_R2",
      "constraints": {
        "max_surface_speed_mpm": 45,
        "requires_coolant": true,
        "min_coolant_pressure_bar": 70
      },
      "source": "R2-MS3 calculation validation session 2026-03-01",
      "formulas_applicable": ["kienzle_extended", "taylor_nickel_alloy"]
    },
    {
      "from": { "type": "material", "id": "Inconel-718" },
      "to": { "type": "strategy", "id": "trochoidal_milling" },
      "relationship": "recommended",
      "confidence": "validated_R3",
      "reason": "Low radial engagement reduces thermal load on nickel alloys",
      "parameters": { "ae_max_pct": 10, "stepover_pct": 5 }
    },
    {
      "from": { "type": "machine", "id": "Okuma_Multus_B250II" },
      "to": { "type": "material", "id": "Inconel-718" },
      "relationship": "capable_with_constraints",
      "constraints": {
        "max_doc_mm": 2.0,
        "reason": "22kW spindle limits heavy cuts in superalloys"
      }
    }
  ],
  "traversal_index": {
    "by_material": { "Inconel-718": [0, 1, 2] },
    "by_tool": { "carbide_C6_plus": [0] },
    "by_machine": { "Okuma_Multus_B250II": [2] },
    "by_relationship": { "compatible": [0], "recommended": [1], "capable_with_constraints": [2] }
  }
}
```

### How Relationships Are Discovered
```
R2 (Safety Calculation Phase):
  - Run speed_feed calc for material+tool combination
  - If calc succeeds with valid safety score: edge = "compatible"
  - If calc fails or S(x) < 0.70: edge = "incompatible" with reason
  - If calc succeeds with constraints: edge = "compatible" with constraints
  Each R2 validation session produces 10-50 new relationship edges.

R3 (Intelligence Campaigns):
  - Cross-reference material properties with toolpath strategies
  - Discover which strategies work best for which material groups
  - Build "recommended" edges between materials and strategies
  Each R3 campaign produces 5-20 strategy recommendation edges.

R7 (Coupled Physics):
  - Discover thermal/mechanical coupling between parameters
  - E.g., "at surface speeds above X, Inconel 718 thermal softening changes kc1.1"
  - These become constraint edges with physics-based thresholds
  Each R7 session produces 2-5 physics-coupled constraint edges.
```

### Traversal Examples
```
QUESTION: "What parameters for face milling Inconel 718 with 50mm carbide?"
TRAVERSE:
  1. Find material node: Inconel-718
  2. Follow "compatible" edges to tools → filter for face_mill + carbide → get constraints
  3. Follow "recommended" edges to strategies → trochoidal_milling with ae_max=10%
  4. Follow "capable_with_constraints" edges to machines → check user's machine limits
  5. Combine: speed=45mpm max, ae=10%, coolant=70bar min, DOC=2mm max on B250II
RESULT: Complete parameter set with constraints, in 1-2 lookups instead of 8-12 calls.
```

---

## BRANCH 4: SESSION KNOWLEDGE

**What it answers:** "What did Claude learn about this MS in previous sessions?"
**Extracted from:** Every session's decisions, errors, observations
**Update trigger:** Session end protocol (mandatory) + mid-session flush (optional)
**Storage:** `C:\PRISM\knowledge\sessions\` (files) + `SESSION_KNOWLEDGE_INDEX.json` (queryable)
**Built during:** Every session, starting from DA. Accumulates forever.

### Schema
```json
{
  "nodes": [
    {
      "id": "sk_2026-02-16_001",
      "type": "error_fix",
      "phase": "R1",
      "milestone": "MS5",
      "summary": "MaterialRegistry.get() returns null for materials with spaces in ISO designation",
      "detail": "Fix: normalize with trim() before lookup. Affected 23 materials.",
      "tags": ["material_registry", "data_quality", "R1-MS5"],
      "session_date": "2026-02-16",
      "confidence": "verified",
      "promoted_to": null
    },
    {
      "id": "sk_2026-02-16_002",
      "type": "decision",
      "phase": "DA",
      "milestone": "MS0",
      "summary": "PowerShell DC protocol: always write .ps1 files, never inline $ vars",
      "detail": "DC strips $ from inline PowerShell. 3-call workaround is reliable.",
      "tags": ["desktop_commander", "powershell", "protocol"],
      "session_date": "2026-02-16",
      "confidence": "verified",
      "promoted_to": "PROTOCOLS_CORE pc_code_standards"
    }
  ],
  "index": {
    "by_phase": { "R1": ["sk_2026-02-16_001"], "DA": ["sk_2026-02-16_002"] },
    "by_milestone": { "R1-MS5": ["sk_2026-02-16_001"], "DA-MS0": ["sk_2026-02-16_002"] },
    "by_type": { "error_fix": ["sk_2026-02-16_001"], "decision": ["sk_2026-02-16_002"] },
    "by_tag": { "material_registry": ["sk_2026-02-16_001"], "powershell": ["sk_2026-02-16_002"] }
  }
}
```

### Knowledge Node Types
```
DECISION:     Architectural or design choice. WHY something was done a certain way.
              Prevents future sessions from re-deciding or choosing differently.
              Example: "Chose composite key [category,diameter,material_class] for ToolIndex"

ERROR_FIX:    Bug encountered and resolved. WHAT broke, WHY, and HOW it was fixed.
              Prevents future sessions from hitting the same bug.
              Example: "Kienzle formula NaN when mc > 0.45 — added clamping at 0.40"

ASSUMPTION:   Something believed to be true, validated or invalidated.
              Prevents future sessions from making wrong assumptions.
              Example: "Assumed all tool files have geometry field — FALSE, 1247 lack it"

OBSERVATION:  Performance data, timing, pattern noticed during work.
              Informs optimization decisions in future sessions.
              Example: "Batch loading 500 materials at a time: 2.8s. All 3518 at once: 4.2s"

RELATIONSHIP: Cross-registry connection discovered during validation.
              Feeds directly into Branch 3 (relationship graph).
              Example: "Inconel 718 requires BOTH kc1_1 AND thermal conductivity for extended Kienzle"

BLOCKER:      Issue that prevented progress, with full context.
              Gives future sessions the diagnostic head start.
              Example: "ToolIndex requires multi-field key but schema only supports single — deferred"
```

### Extraction Protocol
```
WHEN: At session end (mandatory) AND before compaction if possible (W4 auto-dump).

HOW (Claude executes this — it's a protocol, not a script):
  1. Review the session: What decisions were made? What errors hit? What was learned?
  2. For each piece of knowledge:
     a. Classify by type (decision/error_fix/assumption/observation/relationship/blocker)
     b. Tag with phase, milestone, and 2-5 topic tags
     c. Write a 1-line summary (must be useful WITHOUT reading the detail)
     d. Write detail (2-5 sentences: what, why, how, impact)
     e. Set confidence: "verified" (tested), "observed" (seen but not tested), "hypothesized"
  3. Write nodes to C:\PRISM\knowledge\sessions\[date]_session_knowledge.json
  4. Update SESSION_KNOWLEDGE_INDEX.json with new entries
  5. Check: Any nodes ready for promotion to permanent docs? (see PROMOTION below)

MINIMUM per session: At least 1 knowledge node. Most sessions produce 3-8.
If a session produced 0 knowledge nodes, something was missed — review before closing.
```

### Knowledge Promotion (Branch 4 → Branches 1-3 or documentation)
```
Some session knowledge should become PERMANENT:

error_fix (verified) → Add to error taxonomy in PROTOCOLS_CORE or as a test case
decision (verified)  → Add to architectural decisions in relevant phase doc or SYSTEM_CONTRACT
relationship (validated) → Add to RELATIONSHIP_GRAPH.json as a permanent edge
observation (confirmed across 3+ sessions) → Add to performance guidelines

PROMOTION CRITERIA:
  1. Confidence = "verified" (not just observed or hypothesized)
  2. Relevant across sessions (not a one-time workaround)
  3. Won't become stale quickly (represents stable knowledge)

PROMOTION PROCESS:
  When promoting, set promoted_to = "[destination]" on the knowledge node.
  This prevents the knowledge from being loaded redundantly (it's now in its permanent home).
  Promoted nodes stay in session knowledge as historical record but are excluded from
  boot-time loading.
```

### Boot-Time Knowledge Query
```
ON SESSION BOOT (after position recovery, before execution):
  1. Read SESSION_KNOWLEDGE_INDEX.json
  2. Filter: phase = current_phase AND milestone = current_ms AND promoted_to = null
  3. Also filter: tags matching current work context
  4. Load matching nodes (typically 3-10 entries, ~500-1000 tokens)
  5. Apply: Claude now has accumulated knowledge about this exact task

EXAMPLE:
  Position: R1-MS5 step 7
  Query: phase=R1, milestone=MS5, promoted_to=null
  Results:
    - DECISION: "Composite key design: [category, diameter, material_class]"
    - ERROR_FIX: "Null geometry handling: 1247 tools lack geometry field"
    - BLOCKER: "Multi-field key schema not yet supported — deferred to step 12"
  Claude now knows: the key design, the data quality issue, and the blocker.
  No rediscovery needed. Saves ~10 calls.
```

---

## BRANCH 5: SKILLS + HOOKS + SCRIPTS (operational intelligence)

**What it answers:** "What tools, automations, and safety nets exist for this work?"
**Generated from:** Skills directory, hookRegistration.ts, scripts folder, wiring files
**Update trigger:** After any skill/hook/script creation or modification
**Storage:** `C:\PRISM\knowledge\ops-index\SKILLS_HOOKS_SCRIPTS.json`
**Built during:** DA-MS5 (initial), expanded each phase as companion assets are created

### Schema
```json
{
  "skills": {
    "chip-thinning-compensation": {
      "file": "skills-consolidated/cutting/chip-thinning.md",
      "domain": "cutting",
      "tier": "A",
      "trigger_phrases": ["chip thinning", "ae/Dc ratio", "effective chip load"],
      "teaches_actions": ["prism_calc.speed_feed", "prism_calc.cutting_force"],
      "prerequisites": ["material with kc1.1 defined", "tool geometry known"],
      "phase_relevance": ["R1-MS5", "R2-MS0", "R2-MS1"],
      "output_format": "AtomicValue with uncertainty"
    }
  },
  "hooks": {
    "docAntiRegression": {
      "file": "src/hooks/hookRegistration.ts",
      "type": "pre-output",
      "blocking": true,
      "trigger": "file-write",
      "condition": "any file replacement operation",
      "action": "validate_anti_regression before allowing write",
      "priority_band": "safety",
      "cadence": null
    },
    "todo_check": {
      "type": "cadence",
      "blocking": false,
      "trigger": "every 5 prism_ calls",
      "action": "prism_context action=todo_update",
      "cadence": 5
    }
  },
  "scripts": {
    "rebuild-section-index": {
      "file": "scripts/roadmap/rebuild-section-index.ps1",
      "purpose": "Regenerate ROADMAP_SECTION_INDEX.md from anchors",
      "run_when": "After any batch of roadmap edits",
      "phase_relevance": ["all"]
    }
  },
  "wiring": {
    "D2F": {
      "file": "data/wiring/dispatcher-to-formula.json",
      "last_verified": "2026-02-XX",
      "hash": "abc123",
      "known_stale": ["prism_toolpath.strategy_select — new actions not mapped"],
      "entries": 368
    },
    "F2E": { "file": "...", "entries": 500 },
    "E2S": { "file": "...", "entries": 37 }
  },
  "skill_phase_map": {
    "DA": ["session-management", "context-engineering", "parallel-execution"],
    "R1": ["material-science", "formula-registry", "data-loading", "tool-schema"],
    "R2": ["speed-feed-calc", "kienzle-force", "taylor-tool-life", "thread-calcs"],
    "R3": ["data-campaigns", "quality-validation", "pfp-engine"]
  },
  "cadence_schedule": {
    "5":  "todo_check",
    "8":  "pressure_monitor",
    "10": "checkpoint",
    "12": "compaction_check",
    "15": "survival_assessment + crossHealth",
    "20": "variation_check",
    "25": "compliance_audit"
  }
}
```

### What this enables:
```
SESSION BOOT: "I'm in R2" → auto-load: speed-feed-calc, kienzle-force, taylor-tool-life
  → know which hooks will fire on calculations (pre-calc, post-calc safety check)
  → know which scripts to run for validation
  → know if wiring files are stale for the actions I'll use

DURING WORK: "I'm about to write a file" → index says: docAntiRegression hook will BLOCK
  → pre-validate anti-regression BEFORE attempting the write → no surprise failures

COMPANION TRACKING: index shows skill=pending for new action → phase gate knows to block
```

---

## BRANCH 6: PROTOCOLS + GSD + CONFIGURATION (system behavior rules)

**What it answers:** "How does the system route decisions, enforce rules, and manage state?"
**Generated from:** PROTOCOLS_CORE sections, GSD_QUICK.md, config files, state file schemas
**Update trigger:** After protocol edits, GSD changes, or config modifications
**Storage:** `C:\PRISM\knowledge\ops-index\PROTOCOLS_GSD_CONFIG.json`
**Built during:** DA-MS5 (protocols), DA-MS6 (GSD routing), ongoing maintenance

### Schema
```json
{
  "gsd": {
    "version": "22.0",
    "file": "data/docs/gsd/GSD_QUICK.md",
    "autopilot_file": "src/orchestration/AutoPilot.ts",
    "routing_tree": {
      "manufacturing_question": {
        "cutting_parameters": "prism_calc",
        "material_lookup": "prism_data",
        "toolpath_strategy": "prism_toolpath",
        "safety_check": "prism_safety",
        "alarm_diagnosis": "prism_data.alarm_search"
      },
      "system_operation": {
        "session_management": "prism_session",
        "context_control": "prism_context",
        "development": "prism_dev",
        "documentation": "prism_doc"
      },
      "autonomous_task": "prism_atcs → prism_orchestrate",
      "multi_step": "prism_orchestrate → prism_autonomous"
    },
    "decision_priority": "orchestrator-first → specific-dispatcher → fallback-to-dev"
  },
  "protocols": {
    "boot": {
      "anchor": "pc_boot_protocol",
      "file": "PRISM_PROTOCOLS_CORE.md",
      "line": 169,
      "summary": "Steps 0-2.5: env detection, state load, health check, phase load",
      "applies_when": "every session start, every compaction recovery"
    },
    "build": {
      "anchor": "pc_build_rules",
      "rule": "npm run build = tsc --noEmit + esbuild + test:critical. NEVER standalone tsc.",
      "applies_when": "any code change"
    },
    "safety": {
      "anchor": "pc_safety_schema",
      "rule": "S(x) >= 0.70 HARD BLOCK. No exceptions.",
      "applies_when": "any calculation affecting physical operations"
    },
    "compaction": {
      "anchor": "pc_compaction_protocol",
      "layers": ["L1: _context every response", "L2: 5x recovery on gap", "L3: hijack"],
      "rapid_mode": "pressure@8 + ultra-minimal after 2+ recoveries"
    }
  },
  "state_files": {
    "CURRENT_STATE.json": {
      "path": "C:\\PRISM\\state\\CURRENT_STATE.json",
      "purpose": "Runtime MCP server state",
      "read_by": ["prism_session.state_load", "prism_dev.session_boot"],
      "write_by": ["prism_session.state_save"],
      "update_frequency": "on state_save calls"
    },
    "CURRENT_POSITION.md": {
      "path": "C:\\PRISM\\mcp-server\\data\\docs\\roadmap\\CURRENT_POSITION.md",
      "purpose": "Roadmap position — which phase/MS/step",
      "format": "CURRENT: [MS-ID] step [N] | LAST_COMPLETE: [MS-ID] [date] | PHASE: [ID]",
      "update_frequency": "every 3 prism_ calls",
      "survives": "compaction, session boundary, chat close"
    },
    "ACTION_TRACKER.md": {
      "path": "C:\\PRISM\\mcp-server\\data\\docs\\ACTION_TRACKER.md",
      "purpose": "Step-level progress within milestones",
      "update_frequency": "after each step-group completion"
    },
    "SESSION_HANDOFF.md": {
      "path": "C:\\PRISM\\mcp-server\\data\\docs\\SESSION_HANDOFF.md",
      "purpose": "Rich context for next session (position + next step + blockers)",
      "update_frequency": "session end or pressure > 75%"
    }
  },
  "configuration": {
    "claude_desktop_config": {
      "path": "claude_desktop_config.json",
      "contains": ["API key", "MCP server path", "env variables"],
      "warning": "API key must be in BOTH config env AND .env file"
    },
    "atomic_value_schema": {
      "rule": "No bare numbers. All values: {value, unit, uncertainty, source}",
      "validation": "prism_guard action=pre_call_validate",
      "applies_to": "every calculation output"
    }
  }
}
```

### What this enables:
```
QUESTION ROUTING: "User asks about chip thinning" → GSD tree → prism_calc.speed_feed
  → no manual dispatcher selection, no trial-and-error

PROTOCOL LOOKUP: "I need to handle a build failure" → protocols.build_failure_triage
  → anchor pc_build_failure_triage → load just that section (~40 lines)

STATE AWARENESS: "Where are the position files?" → state_files.CURRENT_POSITION
  → path, format, update frequency — no guessing
```

---

## BRANCH 7: DOCUMENTATION INDEX (roadmap + reference docs)

**What it answers:** "Where is the documentation about topic X?"
**Generated from:** Section anchors (W1), roadmap files, reference docs
**Update trigger:** Regenerate via rebuild-section-index.ps1 after edits
**Storage:** `C:\PRISM\knowledge\doc-index\DOCUMENTATION_INDEX.json`
**Built during:** DA-MS5 (Wave 1 anchors), maintained by regeneration script

### Schema
```json
{
  "roadmap_files": {
    "PRISM_PROTOCOLS_CORE.md": {
      "lines": 2158,
      "tokens_est": 13500,
      "sections": {
        "pc_boot_protocol": { "line": 169, "header": "Boot Protocol", "desc": "Steps 0-2.5" },
        "pc_stuck_protocol": { "line": 1608, "header": "Stuck Protocol", "desc": "6-level escalation" }
      }
    }
  },
  "by_topic": {
    "compaction": ["pc_compaction_protocol", "pc_rapid_compaction", "rc_compaction_adaptation"],
    "safety": ["pc_safety_schema", "sc_safety_invariants", "r2_safety_validation"],
    "boot": ["pc_boot_protocol", "rc_step_0_env", "ri_session_workflow"],
    "tool_schema": ["r1_ms5_tool_schema", "ssh_tool_skills"]
  },
  "by_phase": {
    "R1": {
      "primary": "PHASE_R1_REGISTRY.md",
      "supporting": ["PRISM_DATABASE_AUDIT_AND_ROADMAP.md", "TOOL_HOLDER_DATABASE_ROADMAP_v4.md"],
      "protocol_sections": ["pc_build_rules", "pc_error_taxonomy", "pc_structured_outputs"]
    }
  },
  "reference_docs": {
    "ROADMAP_MODULES_AUDIT.md": { "purpose": "Module structure analysis", "relevance": "DA" },
    "TOKEN_OPTIMIZATION_AUDIT_v12.md": { "purpose": "Token budget analysis", "relevance": "DA-MS0" }
  },
  "memory_graph_schema": {
    "node_types": ["concept", "decision", "error", "relationship", "observation"],
    "edge_types": ["depends_on", "contradicts", "supports", "supersedes"],
    "query_patterns": ["by_phase", "by_type", "by_recency", "by_tag"]
  }
}
```

### What this enables:
```
TOPIC SEARCH: "Everything about compaction" → 3 anchor refs across 2 files
  → load ~90 lines total instead of 2,158 + 192

PHASE PREP: "Loading R1" → primary doc + 2 supporting refs + 3 protocol sections
  → know exactly what to load, skip everything else

REFERENCE NAV: "Which audit docs exist?" → 4 entries with purpose + relevance
```

---

## BRANCH 8: TEST + VALIDATION (quality assurance)

**What it answers:** "How do I verify this work is correct and safe?"
**Generated from:** Test files, validation scripts, Ralph configurations, gate criteria
**Update trigger:** After test additions, gate criteria changes, safety rule updates
**Storage:** `C:\PRISM\knowledge\qa-index\TEST_VALIDATION.json`
**Built during:** DA-MS8 (initial), R2 (safety matrix), expanded each phase

### Schema
```json
{
  "test_coverage": {
    "SpeedFeedEngine": {
      "test_file": "src/engines/__tests__/SpeedFeedEngine.test.ts",
      "cases": 24,
      "covers": ["basic_calculation", "chip_thinning", "edge_cases", "safety_limits"],
      "last_pass": "2026-02-XX"
    }
  },
  "validation_tools": {
    "ralph_loop": {
      "requires": "API key in .env",
      "usage": "prism_ralph action=validate target=[feature]",
      "scoring": "A+ to F, Ω computed from Ralph grades",
      "when": "before any release or phase gate"
    },
    "omega_compute": {
      "usage": "prism_omega action=compute",
      "threshold": "Ω >= 0.70 = release ready",
      "when": "phase gates, milestone completion"
    },
    "anti_regression": {
      "usage": "prism_guard action=validate_anti_regression",
      "when": "before any file replacement",
      "checks": "function count, export count, line count, feature inventory"
    }
  },
  "safety_matrix": {
    "S_x_computation": {
      "threshold": 0.70,
      "type": "HARD BLOCK",
      "components": ["force_limits", "speed_limits", "thermal_limits", "tool_deflection"],
      "test_cases": "R2-MS0 builds 50-calculation validation matrix"
    }
  },
  "phase_gates": {
    "DA": {
      "criteria": ["Ω >= 0.70", "5 subagents respond", "5 commands execute",
                   "15 skills auto-load", "hooks fire on edit/bash", "E2E test passes"],
      "gate_file_section": "da_ms8_gate"
    },
    "R1": {
      "criteria": ["materials >= 85% loaded", "tools >= 90% loaded", "machines >= 80% loaded",
                   "all formulas wired", "ToolIndex query < 100ms"],
      "gate_file_section": "r1_ms9_quality_gate"
    }
  },
  "roadmap_integrity": {
    "lint_script": "scripts/roadmap/roadmap-lint.ps1",
    "regression_script": "scripts/roadmap/roadmap-regression-test.ps1",
    "index_rebuild": "scripts/roadmap/rebuild-section-index.ps1",
    "checks": ["file_existence", "skip_marker_validity", "anchor_consistency",
               "cross_reference_resolution", "size_anti_regression", "version_consistency"]
  }
}
```

### What this enables:
```
AFTER CODE CHANGE: "What tests cover SpeedFeedEngine?" → test file + 24 cases
  → run exactly those tests, not the full suite

PHASE GATE: "Am I ready to gate R1?" → 5 criteria listed
  → check each one, know exactly what's missing

SAFETY: "What validates speed calculations?" → S(x) components + threshold
  → know the full validation chain before running a calc
```

---

```
The eight branches connect — first four are WHAT, last four are HOW:

WHAT THE SYSTEM IS:
  Branch 1 (code)      → WHAT code exists and HOW it flows
  Branch 2 (data)      → WHAT data exists and HOW it's organized
  Branch 3 (relations) → HOW data items RELATE to each other
  Branch 4 (sessions)  → WHAT Claude has LEARNED about all of the above

HOW THE SYSTEM OPERATES:
  Branch 5 (skills/hooks) → WHAT tools, automations, and safety nets exist
  Branch 6 (protocols)    → WHAT rules govern behavior and routing
  Branch 7 (docs)         → WHERE documentation lives for any topic
  Branch 8 (tests)        → HOW to verify correctness and safety

COMBINED TRAVERSAL EXAMPLE:
  "Help me set up a turning operation for Ti-6Al-4V on the Okuma B250II"

  Branch 7: "turning" + "Ti-6Al-4V" → relevant doc sections to load
  Branch 6: GSD routing → prism_calc for parameters, prism_safety for validation
  Branch 2: Find Ti-6Al-4V → ISO Group S, titanium family, alpha-beta alloy
  Branch 3: Find relationships → compatible tools (carbide C2, cermet, PCD),
            strategies (constant chip load, flood coolant required),
            machine constraints (B250II max RPM limits surface speed)
  Branch 1: Find actions → prism_calc.speed_feed, prism_calc.cutting_force,
            prism_safety.validate → trace engine chain for parameters needed
  Branch 5: Load skills → titanium-machining, speed-feed-calc → know how to teach
            Load hooks → pre-calc safety check will fire → prepare inputs
  Branch 4: Find session knowledge → "Ti-6Al-4V chips are stringy, use chip breaker.
            Previous session found that Taylor n=0.22 for this alloy+tool combo."
  Branch 8: Validation → S(x) safety check required, threshold 0.70,
            test coverage for turning calcs exists in SpeedFeedEngine.test.ts

  Result: Complete setup with data, relationships, calculations, operational context,
          prior learnings, AND verification plan. All from index lookups.
```

---

## STORAGE LAYOUT

```
C:\PRISM\knowledge\
├── code-index\
│   ├── EXECUTION_CHAIN.json          (Branch 1 — auto-generated from source)
│   └── .codegen-baseline.json        (last generation hash for drift detection)
├── data-index\
│   ├── DATA_TAXONOMY.json            (Branch 2 — generated from registry structure)
│   └── .datagen-baseline.json
├── relationships\
│   ├── RELATIONSHIP_GRAPH.json       (Branch 3 — accumulated from R2/R3/R7)
│   └── .relationship-log.json        (audit trail of edge additions)
├── sessions\
│   ├── SESSION_KNOWLEDGE_INDEX.json  (Branch 4 — queryable index)
│   ├── 2026-02-16_session_knowledge.json
│   └── ...
├── ops-index\
│   ├── SKILLS_HOOKS_SCRIPTS.json     (Branch 5 — skills, hooks, wiring, cadence)
│   └── PROTOCOLS_GSD_CONFIG.json     (Branch 6 — protocols, GSD tree, state files)
├── doc-index\
│   ├── DOCUMENTATION_INDEX.json      (Branch 7 — section anchors, topic mapping)
│   └── .doc-index-baseline.json      (anchor positions for drift detection)
├── qa-index\
│   ├── TEST_VALIDATION.json          (Branch 8 — test coverage, gates, safety matrix)
│   └── .qa-baseline.json
└── README.md                         (this spec, condensed)
```

---

## PHASE CONTRIBUTION MAP

```
Which phases build which branches:

DA:  Branch 1 (code index generation script + first run)
     Branch 4 (knowledge extraction protocol + first captures)
     Branch 5 (skill/hook/script index — initial catalog of all 126 skills, 30+ hooks)
     Branch 6 (protocols index — catalog all PROTOCOLS_CORE sections, GSD routing tree)
     Branch 7 (documentation index — section anchors + topic mapping across all 51 files)
     Branch 8 (QA index — catalog existing tests, gate criteria, safety rules)
     ↑ DA builds the SCAFFOLDING for all 8 branches. Other phases fill in the content.

R1:  Branch 2 (data taxonomy from registry enrichment — materials, tools, machines)
     Branch 4 (data quality findings, schema decisions)
     Branch 5 (new companion skills/hooks/scripts for data actions)
     Branch 8 (data validation test cases)

R2:  Branch 3 (validated calculation relationships: material↔tool↔formula)
     Branch 4 (formula validation findings, safety threshold observations)
     Branch 5 (calculation skills, safety hooks)
     Branch 8 (50-calculation safety validation matrix)

R3:  Branch 3 (cross-registry campaign intelligence — deep relationship edges)
     Branch 4 (campaign strategy decisions)
     Branch 5 (campaign skills, quality hooks)

R7:  Branch 3 (coupled physics relationships, thermal/mechanical constraints)
     Branch 4 (physics modeling decisions)
     Branch 5 (advanced calculation skills)

R8:  CONSUMER — uses ALL 8 branches to power 22 application skills
     Branch 3 (user intent → action relationship edges)
     Branch 4 (skill effectiveness observations)
     Branch 5 (22 application skills — the largest skill expansion)

ALL PHASES: Branch 4 (every session produces knowledge nodes)
            Branch 5 (every new action gets companion assets)
            Branch 6 (protocol changes captured)
            Branch 8 (test coverage expands)
```

---

## IMPLEMENTATION PRIORITY

```
DURING DA (build all scaffolding):
  1. Branch 7 (Documentation Index) — DA-MS5 Wave 1
     Section anchors + index. Foundation for everything else.
     Enables targeted loading, topic search, phase prep.

  2. Branch 4 (Session Knowledge) — DA-MS7
     Start capturing knowledge NOW. Every session before this
     is a session whose learnings are lost forever.

  3. Branch 5 (Skills/Hooks/Scripts) — DA-MS5 + DA-MS6
     Catalog all 126 skills, 30+ hooks, scripts. Build phase-loading map.
     Immediate value: auto-load correct skills per phase.

  4. Branch 6 (Protocols/GSD/Config) — DA-MS5 + DA-MS6
     Index PROTOCOLS_CORE sections, GSD routing tree, state files.
     Immediate value: protocol lookup by anchor, not full file reload.

  5. Branch 1 (Code Index) — DA-MS6
     Auto-generated from source. One script, run after builds.

  6. Branch 8 (Test/Validation) — DA-MS8
     Catalog existing tests, gate criteria, safety rules.
     Phase gates can reference the index instead of loading full docs.

DURING R1-R8 (populate with real content):
  7. Branch 2 (Data Taxonomy) — R1-MS9 (as part of quality gate)
     Generated from registry structure after R1 enrichment is complete.

  8. Branch 3 (Relationship Graph) — R2-MS3+
     Relationships discovered during validation. Schema defined in DA,
     population happens organically during R2/R3/R7.
```

---
END OF HIERARCHICAL INDEX SPECIFICATION v2.0
