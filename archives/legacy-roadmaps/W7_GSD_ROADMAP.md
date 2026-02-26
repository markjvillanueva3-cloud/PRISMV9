# W7: GSD Consolidation + AutoPilot Fix + Orchestrator-First Sequencing
# Workflow: WF-1770844616 | Created: 2026-02-11 | Session: 59
# STATUS: ✅ ALL 16 UNITS COMPLETE | Build clean 3.6MB | Verified 2026-02-11
#
# RECOVERY INSTRUCTIONS: If context is lost, read this file. Find the 
# first unit with status=PENDING and execute it. Each unit is fully 
# self-contained with exact paths, exact code, and verification steps.
#
# PROBLEMS FOUND:
#   1. GSD scattered across 20+ stale files (violates Law 5: No Duplicates)
#   2. AutoPilot.ts hardcodes v14 GSD, ignores file content (violates Law 2)
#   3. ralph_loop_lite FAKES scores with math formula (violates Law 2)
#   4. Orchestrators (autopilot/swarm/ATCS) never recommended in sequences
#   5. MASTER_INDEX.md §3 shows 22 manual workflows that duplicate what
#      autopilot already automates
#
# CANONICAL GSD: C:\PRISM\mcp-server\data\docs\gsd\GSD_QUICK.md (v21.2)
# MASTER INDEX:  C:\PRISM\mcp-server\data\docs\MASTER_INDEX.md
# AUTOPILOT:     C:\PRISM\mcp-server\src\orchestration\AutoPilot.ts (777L)
# AUTOPILOT V2:  C:\PRISM\mcp-server\src\orchestration\AutoPilotV2.ts (397L)
# GSD DISPATCHER: C:\PRISM\mcp-server\src\tools\dispatchers\gsdDispatcher.ts (199L)
# AP DISPATCHER:  C:\PRISM\mcp-server\src\tools\dispatchers\autoPilotDispatcher.ts (143L)
#
# PHASES: P1(5 units) → P2(4 units) → P3(3 units) → P4(2 units) = 14 units
# ESTIMATED: ~300 lines of code changes + doc rewrites
# BUILD CONSTRAINT: Must stay clean at ~3.6MB via esbuild


---
## ═══ PHASE 1: SINGLE GSD SOURCE OF TRUTH (5 units) ═══
## Goal: All GSD reads point to data/docs/gsd/GSD_QUICK.md
---

### Unit P1.1: Fix gsdDispatcher.ts `core` action [CRITICAL]
**Status:** PENDING
**File:** C:\PRISM\mcp-server\src\tools\dispatchers\gsdDispatcher.ts
**Problem:** `core` action tries GSD_v20.md FIRST (stale), only falls back to GSD_QUICK.md
**Lines:** ~117-133

**FIND THIS CODE:**
```typescript
case "core": {
  logGsdAccess("core");
  // Try GSD_v20.md first, then GSD_QUICK.md
  let content = "";
  const gsdFiles = [
    "C:\\PRISM\\mcp-server\\data\\docs\\GSD_v20.md",
    "C:\\PRISM\\mcp-server\\data\\docs\\gsd\\GSD_QUICK.md"
  ];
  for (const f of gsdFiles) {
    try {
      if (fs.existsSync(f)) {
        content = fs.readFileSync(f, "utf-8");
        if (content.length > 100) break;
      }
    } catch {}
  }
  if (!content) content = readGsdFile("GSD_QUICK.md", FALLBACK_QUICK);
  result = { content, source: "file-based" };
  break;
}
```

**REPLACE WITH:**
```typescript
case "core": {
  logGsdAccess("core");
  // Canonical: GSD_QUICK.md (v21.2+) is single source of truth
  const quick = readGsdFile("GSD_QUICK.md", FALLBACK_QUICK);
  const devProto = readGsdFile("DEV_PROTOCOL.md", FALLBACK_DEV_PROTOCOL);
  result = { 
    content: quick + "\n\n---\n\n" + devProto, 
    source: "canonical",
    version: "v21.2",
    canonical_path: "data/docs/gsd/GSD_QUICK.md"
  };
  break;
}
```
**Verify:** `npm run build` clean. `prism_gsd→core` returns version:"v21.2"
**Rollback:** Revert case "core" block


### Unit P1.2: Update FALLBACK_QUICK string
**Status:** PENDING
**File:** C:\PRISM\mcp-server\src\tools\dispatchers\gsdDispatcher.ts
**Line:** ~29

**FIND:**
```typescript
const FALLBACK_QUICK = "# PRISM Quick Reference v20.0\n## 27 dispatchers | ~323 actions | D1-D4 COMPLETE\n## GSD files not found — edit data/docs/gsd/GSD_QUICK.md\n## START: prism_dev session_boot → prism_context todo_update";
```
**REPLACE:**
```typescript
const FALLBACK_QUICK = "# PRISM Quick Reference v21.2\n## 27 dispatchers | 324 verified actions | 29 engines\n## GSD files not found — edit data/docs/gsd/GSD_QUICK.md\n## START: prism_dev session_boot → prism_context todo_update";
```
**Verify:** Build clean
**Rollback:** Revert string

### Unit P1.3: Update resources_summary defaults
**Status:** PENDING
**File:** C:\PRISM\mcp-server\src\tools\dispatchers\gsdDispatcher.ts
**Lines:** ~146 and ~155

**FIND (line ~146, inside try block):**
```typescript
mcp_tools: ri.mcpTools || 323,
materials: ri.materials?.total || 2805,
```
**REPLACE:**
```typescript
mcp_tools: ri.mcpTools || 324,
materials: ri.materials?.total || 3518,
```

**FIND (line ~155, the else/fallback defaults):**
```typescript
result = { mcp_tools: 323, materials: 2805, alarms: 10033, skills: 131, formulas: 515, agents: 75, hooks: 112, scripts: 27, source: "defaults" };
```
**REPLACE:**
```typescript
result = { mcp_tools: 324, materials: 3518, alarms: 18942, skills: 119, formulas: 490, agents: 56, hooks: 112, scripts: 74, source: "defaults" };
```
**Verify:** Build clean. `prism_gsd→resources_summary` returns 324 tools
**Rollback:** Revert numbers


### Unit P1.4: Archive old GSD files from mcp-server root
**Status:** PENDING
**Action:** Move (not delete) to C:\PRISM\mcp-server\data\docs\archive\
**Files (10 files):**
```
C:\PRISM\mcp-server\GSD_v9.md   → archive\GSD_v9.md
C:\PRISM\mcp-server\GSD_v10.md  → archive\GSD_v10.md
C:\PRISM\mcp-server\GSD_v11.md  → archive\GSD_v11.md
C:\PRISM\mcp-server\GSD_v12.md  → archive\GSD_v12.md
C:\PRISM\mcp-server\GSD_v13.md  → archive\GSD_v13.md
C:\PRISM\mcp-server\GSD_v14.md  → archive\GSD_v14.md
C:\PRISM\mcp-server\GSD_v15.md  → archive\GSD_v15.md
C:\PRISM\mcp-server\GSD_v16.md  → archive\GSD_v16.md
C:\PRISM\mcp-server\GSD_v18.md  → archive\GSD_v18.md
C:\PRISM\mcp-server\GSD_v19.md  → archive\GSD_v19.md
```
Also move the stale v20:
```
C:\PRISM\mcp-server\data\docs\GSD_v20.md → archive\GSD_v20.md
```
**Method:** Desktop Commander move_file for each
**Verify:** No GSD_v*.md files in mcp-server root. All present in archive/
**Rollback:** Move files back from archive

### Unit P1.5: Archive legacy GSD files from docs/ and prompts/
**Status:** PENDING
**Action:** Move to C:\PRISM\docs\archive\ (create if needed)
**Files:**
```
C:\PRISM\docs\GSD_CORE.md
C:\PRISM\docs\GSD_CORE_v3.md
C:\PRISM\docs\GSD_CORE_v4.md
C:\PRISM\docs\GSD_CORE_v5.md
C:\PRISM\docs\GSD_CORE_v6.md
C:\PRISM\docs\GSD_CORE_v7.md
C:\PRISM\docs\GSD_CORE_v8.md
C:\PRISM\docs\GSD_v9.md
C:\PRISM\docs\GSD_v10.md
C:\PRISM\docs\GSD_v11.md
C:\PRISM\docs\GSD_SYSTEM_DESIGN.md
C:\PRISM\docs\GSD_V9_GAP_ANALYSIS.md
C:\PRISM\prompts\GSD_CORE_PROJECT_FILE.md → C:\PRISM\docs\archive\
```
**NOTE:** These contain historical decisions. Archive, never delete.
**Verify:** Only GSD files remaining should be in data/docs/gsd/ (canonical)
**Rollback:** Move files back


---
## ═══ PHASE 2: FIX AUTOPILOT GSD WIRING (4 units) ═══
## Goal: AutoPilot reads and PARSES canonical GSD, not hardcoded v14
---

### Unit P2.1: Fix AutoPilot.ts DEFAULT_CONFIG gsdPath
**Status:** PENDING
**File:** C:\PRISM\mcp-server\src\orchestration\AutoPilot.ts
**Line:** ~163

**FIND:**
```typescript
gsdPath: "C:\\PRISM\\skills-consolidated\\prism-gsd-core\\SKILL.md",
```
**REPLACE:**
```typescript
gsdPath: "C:\\PRISM\\mcp-server\\data\\docs\\gsd\\GSD_QUICK.md",
```
**Verify:** Build clean
**Rollback:** Revert path

### Unit P2.2: Rewrite loadGSD() to actually parse the file [CRITICAL]
**Status:** PENDING
**File:** C:\PRISM\mcp-server\src\orchestration\AutoPilot.ts
**Lines:** ~323-335
**Problem:** Reads file but returns HARDCODED v14 data, ignoring content entirely

**FIND:**
```typescript
private async loadGSD(): Promise<GSDResult> {
  try {
    const content = fs.readFileSync(this.config.gsdPath, "utf-8");
    return {
      loaded: true, version: "v14.0",
      laws: ["S(x) ≥ 0.70 or BLOCKED", "No placeholders", "New ≥ Old", "brainstorm MANDATORY"],
      bufferZone: "🟢 0-8 | 🟡 9-14 | 🔴 15-18 | ⚫ 19+"
    };
  } catch {
    return { loaded: false, version: "", laws: [], bufferZone: "" };
  }
}
```

**REPLACE:**
```typescript
private async loadGSD(): Promise<GSDResult> {
  try {
    const content = fs.readFileSync(this.config.gsdPath, "utf-8");
    if (!content || content.length < 50) {
      log.warn("[AutoPilot] GSD file too small or empty");
      return { loaded: false, version: "", laws: [], bufferZone: "" };
    }
    // Parse version from first line: "# PRISM Quick Reference v21.2"
    const versionMatch = content.match(/v(\d+\.\d+)/);
    const version = versionMatch ? `v${versionMatch[1]}` : "unknown";
    // Parse laws from "## 6 LAWS" section
    const lawsSection = content.match(/## 6 LAWS[\s\S]*?(?=\n##|\n---)/);
    const laws: string[] = [];
    if (lawsSection) {
      const lawLines = lawsSection[0].split("\n").filter(l => /^\d+\./.test(l.trim()));
      lawLines.forEach(l => laws.push(l.replace(/^\d+\.\s*/, "").trim()));
    }
    if (laws.length === 0) {
      laws.push("S(x) ≥ 0.70 or BLOCKED", "No placeholders", "New ≥ Old",
                 "MCP First", "No duplicates", "100% utilization");
    }
    // Parse buffer zones
    const bufferMatch = content.match(/## BUFFER ZONES[\s\S]*?(?=\n##|\n---)/);
    const bufferZone = bufferMatch 
      ? bufferMatch[0].split("\n").filter(l => l.includes("🟢") || l.includes("🟡") || l.includes("🔴") || l.includes("⚫")).join(" | ")
      : "🟢0-20 | 🟡21-30 | 🔴31-40 | ⚫41+";
    log.info(`[AutoPilot] Loaded GSD ${version} with ${laws.length} laws`);
    return { loaded: true, version, laws, bufferZone };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message.slice(0, 80) : "unknown";
    log.warn(`[AutoPilot] Failed to load GSD: ${msg}`);
    return { loaded: false, version: "", laws: [], bufferZone: "" };
  }
}
```
**Verify:** Build clean. `prism_autopilot_d→autopilot` task="test" should show version:"v21.2"
**Rollback:** Revert loadGSD() method


### Unit P2.3: Fix ralph_loop_lite — currently FAKING scores [CRITICAL LAW 2]
**Status:** PENDING
**File:** C:\PRISM\mcp-server\src\tools\dispatchers\autoPilotDispatcher.ts
**Lines:** ~82-95
**Problem:** ralph_loop_lite generates fake incrementing scores using math formula.
  Score starts at 0.7 and increments by 0.1/i. Scrutinized categories are hardcoded.
  This is a PURE PLACEHOLDER masquerading as validation. Lives depend on real scores.

**FIND:**
```typescript
case "ralph_loop_lite": {
  const loops = params.loops || 3;
  const loopResults: any[] = [];
  let score = 0.7;
  for (let i = 1; i <= loops; i++) {
    score = Math.min(0.99, score + (0.1 / i));
    loopResults.push({ loop: i, score: +score.toFixed(2), passed: score >= 0.70,
      scrutinized: i === 1 ? ["completeness", "structure"] : i === 2 ? ["quality", "error handling"] : ["edge cases", "performance"],
      improvements: ["Applied fixes for identified issues"] });
  }
  result = { target: params.target, loops, results: loopResults, final_score: +score.toFixed(2),
    status: score >= 0.70 ? "PASSED" : "NEEDS_WORK" };
  break;
}
```

**REPLACE:**
```typescript
case "ralph_loop_lite": {
  // Delegate to real Ralph dispatcher for actual validation
  // ralph_loop_lite is a CONVENIENCE wrapper, not a substitute
  result = {
    error: "ralph_loop_lite has been deprecated — use prism_ralph→loop for real validation",
    alternative: "prism_ralph action=loop params={target: '...', loops: 3}",
    reason: "ralph_loop_lite was generating fake scores (Law 2 violation). Real validation requires API calls via prism_ralph.",
    migration: "Replace prism_autopilot_d→ralph_loop_lite with prism_ralph→loop"
  };
  break;
}
```
**NOTE:** This deliberately breaks the fake. Users MUST use prism_ralph→loop (real API).
**Verify:** Build clean. Calling ralph_loop_lite returns deprecation message.
**Rollback:** Revert case block

### Unit P2.4: Fix formula_optimize hardcoded formulas
**Status:** PENDING  
**File:** C:\PRISM\mcp-server\src\tools\dispatchers\autoPilotDispatcher.ts
**Lines:** ~97-110
**Problem:** formula_optimize has 4 hardcoded formulas with fake IDs.
  Should query the actual formula registry instead.

**FIND:**
```typescript
case "formula_optimize": {
  const formulas = [
    { id: "F-TOKEN-OPT-001", name: "Token Efficiency", equation: "Output_Value / (Tokens × Time)", domain: "efficiency" },
    { id: "F-SWARM-OPT-001", name: "Swarm Optimization", equation: "Σ(Confidence × Match) / N", domain: "orchestration" },
    { id: "F-RALPH-CONV-001", name: "Ralph Convergence", equation: "1 - |Δscore| / score", domain: "validation" },
    { id: "F-RISK-MIN-001", name: "Risk Minimization", equation: "Σ(P_failure × Impact) / N", domain: "safety" }
  ];
  const task = (params.task || "").toLowerCase();
  let best = formulas[0];
  if (task.includes("token") || task.includes("efficiency")) best = formulas[0];
  else if (task.includes("swarm") || task.includes("agent")) best = formulas[1];
  else if (task.includes("valid") || task.includes("ralph")) best = formulas[2];
  else if (task.includes("risk") || task.includes("safe")) best = formulas[3];
  result = { task: params.task, objective: params.objective || "maximize", selected: best, all_formulas: formulas };
  break;
}
```

**REPLACE:**
```typescript
case "formula_optimize": {
  // Query real formula registry if available
  let formulas: any[] = [];
  try {
    if (registryMgr) {
      await registryMgr.initialize();
      const formulaReg = registryMgr.getRegistry("formulas");
      if (formulaReg && formulaReg.size > 0) {
        const task = (params.task || "").toLowerCase();
        const domain = params.domain || "";
        // Search registry for matching formulas
        formulas = formulaReg.search({ query: task, domain, limit: 10 }) || [];
      }
    }
  } catch (e) {
    log.warn("[autopilot] Formula registry query failed, using knowledge search");
  }
  // Fallback: use prism_knowledge for formula lookup
  if (formulas.length === 0) {
    result = {
      task: params.task,
      objective: params.objective || "maximize",
      formulas_found: 0,
      recommendation: "Use prism_knowledge→formula for real formula lookup, or prism_calc→speed_feed for manufacturing calculations",
      alternative: "prism_knowledge action=formula params={query: '...'}"
    };
  } else {
    result = {
      task: params.task,
      objective: params.objective || "maximize",
      formulas_found: formulas.length,
      selected: formulas[0],
      all_matches: formulas.slice(0, 5)
    };
  }
  break;
}
```
**Verify:** Build clean. formula_optimize attempts real registry lookup.
**Rollback:** Revert case block


---
## ═══ PHASE 3: ORCHESTRATOR-FIRST SEQUENCING (3 units) ═══
## Goal: Sequencing guides recommend orchestrators for complex workflows,
##        with manual sequences as explicit fallback
---

### Unit P3.1: Add Orchestrator Decision Layer to GSD_QUICK.md
**Status:** PENDING
**File:** C:\PRISM\mcp-server\data\docs\gsd\GSD_QUICK.md
**Action:** Add new section AFTER "DECISION TREE" and BEFORE "QUALITY GATES"

**INSERT THIS BLOCK after the Decision Tree section:**
```markdown
## ORCHESTRATOR-FIRST — When to Use Automation vs Manual

### Complexity Routing:
SIMPLE (1-3 steps, single domain) → Manual sequence per Decision Tree above
MEDIUM (4-8 steps, multi-domain) → prism_autopilot_d→autopilot_quick (lightweight)
COMPLEX (8+ steps, brainstorm needed) → prism_autopilot_d→autopilot (full 6-phase pipeline)
MULTI-SESSION (spans context windows) → prism_atcs→task_init + prism_autonomous→auto_plan
PARALLEL (independent subtasks) → prism_orchestrate→swarm_parallel

### What AutoPilot Does (so you don't have to):
1. Loads GSD protocol (canonical v21.2)
2. Loads current state (CURRENT_STATE.json)
3. Brainstorms with 7 parallel API calls (real, not canned)
4. Executes with real swarm deployment
5. Validates with 4-phase Ralph loop (real API)
6. Updates state, hooks, memories

### When NOT to use orchestrators:
- Quick data lookups (material_get, alarm_decode)
- Single calculations (speed_feed, cutting_force)
- File reads/writes (doc operations)
- Session management (boot, save, checkpoint)
```
**Verify:** `prism_gsd→quick` shows the new section
**Rollback:** Remove the inserted block


### Unit P3.2: Rewrite MASTER_INDEX.md §3 — Orchestrator-First Sequences
**Status:** PENDING
**File:** C:\PRISM\mcp-server\data\docs\MASTER_INDEX.md
**Section:** §3 SEQUENCING GUIDES (lines ~115-190)
**Problem:** All 22 workflows are manual step-by-step. No mention of autopilot/orchestrators
  for complex flows. Workflow 3.22 "Full Brainstorm-to-Ship" manually chains what
  autopilot does automatically.

**Replace §3 with this content (between the §2 divider and §4 divider):**
```markdown
## 3. SEQUENCING GUIDES — Common Workflows

### ROUTING: Choose manual or orchestrated
| Complexity | Steps | Route | Tool |
|-----------|-------|-------|------|
| Simple | 1-3 | Manual sequence | See guides below |
| Medium | 4-8 | AutoPilot Quick | prism_autopilot_d→autopilot_quick |
| Complex | 8+ | AutoPilot Full | prism_autopilot_d→autopilot |
| Multi-session | Spans windows | ATCS | prism_atcs→task_init |
| Parallel tasks | Independent | Swarm | prism_orchestrate→swarm_parallel |

### 3.1 Session Lifecycle
START: prism_dev→session_boot → prism_context→todo_update
END: prism_session→state_save → prism_doc→append(ACTION_TRACKER.md) → prism_context→todo_update

### 3.2 Small Code Change (<50 lines)
prism_dev→file_read → prism_dev→file_write → prism_dev→build → prism_dev→test_smoke

### 3.3 Large Code Change (>50 lines)
prism_sp→plan → [approval] → prism_dev→file_read → prism_dev→file_write (chunked) → prism_dev→build → prism_dev→test_smoke

### 3.4 Multi-Step Feature (workflow tracking)
prism_session→workflow_start → [ORCHESTRATED or MANUAL work] → prism_session→workflow_advance → prism_session→workflow_complete
**Orchestrated:** prism_autopilot_d→autopilot (handles brainstorm→execute→validate internally)
**Manual:** prism_sp→brainstorm → prism_sp→plan → [work] → prism_ralph→loop

### 3.5 Manufacturing Calculation
prism_data→material_get → prism_calc→[calculation] → prism_safety→[validation] → prism_validate→safety

### 3.6 Thread Calculation
prism_thread→get_thread_specifications → prism_thread→calculate_tap_drill → prism_thread→generate_thread_gcode → prism_safety→check_chip_load_limits

### 3.7 Toolpath Strategy
prism_data→material_get → prism_toolpath→strategy_select → prism_toolpath→params_calculate → prism_calc→speed_feed → prism_safety→[validation]

### 3.8 Alarm Investigation
prism_data→alarm_decode → prism_data→alarm_search → prism_data→alarm_fix → prism_knowledge→search

### 3.9 Quality Validation (quick)
prism_validate→safety → prism_omega→compute

### 3.10 Quality Validation (full release)
prism_validate→safety → prism_ralph→loop → prism_omega→compute → prism_ralph→assess

### 3.11 Debugging
prism_sp→debug → prism_dev→code_search → prism_dev→file_read → prism_dev→file_write → prism_dev→build

### 3.12 Autonomous Task (multi-session)
prism_atcs→task_init → prism_autonomous→auto_plan → prism_autonomous→auto_execute → prism_atcs→queue_next → prism_autonomous→auto_status

### 3.13 Hook Management
prism_hook→list → prism_hook→coverage → prism_hook→gaps → prism_generator→generate → prism_hook→execute

### 3.14 Compaction Recovery
[L3 auto-fires] → prism_session→quick_resume → prism_context→todo_read → continue from last step

### 3.15 Knowledge Query
prism_knowledge→search → prism_knowledge→cross_query → prism_knowledge→relations

### 3.16 Agent/Swarm Orchestration
prism_orchestrate→agent_execute | swarm_execute → prism_orchestrate→swarm_status → prism_orchestrate→swarm_patterns

### 3.17 Document Management
prism_doc→list → prism_doc→read → prism_doc→write|append → prism_validate→anti_regression

### 3.18 Skill/Script Discovery
prism_skill_script→skill_search → prism_skill_script→skill_content → prism_skill_script→skill_load

### 3.19 System Diagnostics
prism_telemetry→get_dashboard → prism_pfp→get_dashboard → prism_pfp→assess_risk → prism_memory→get_health

### 3.20 Guard/Enforcement Check
prism_guard→pre_call_validate → [action] → prism_guard→decision_log → prism_guard→error_capture (if error)

### 3.21 New Dispatcher Action (meta-development)
prism_dev→file_read(dispatcher.ts) → prism_dev→file_write(add action) → prism_dev→build → update MASTER_INDEX.md → update GSD

### 3.22 Full Brainstorm-to-Ship Pipeline
**ORCHESTRATED (preferred):** prism_autopilot_d→autopilot (does ALL of the below automatically)
**Manual fallback:** prism_sp→brainstorm → prism_sp→plan → prism_sp→execute → prism_sp→review_quality → prism_validate→safety → prism_ralph→loop → prism_omega→compute
```
**Verify:** Read MASTER_INDEX.md §3, confirm routing table at top
**Rollback:** Restore original §3 from transcript



### Unit P3.3: Update DEV_PROTOCOL.md — Add Orchestrator Guidance
**Status:** PENDING
**File:** C:\PRISM\mcp-server\data\docs\gsd\DEV_PROTOCOL.md
**Action:** Add orchestrator recommendation to the workflow section

**APPEND after existing workflow content:**
```markdown
## ORCHESTRATOR USAGE

When implementing features or fixes that span >4 steps:
1. Consider using `prism_autopilot_d→autopilot` for full lifecycle
2. For multi-session work, use `prism_atcs→task_init` to create a persistent task
3. For parallel independent subtasks, use `prism_orchestrate→swarm_parallel`

AutoPilot internally chains: GSD→State→Brainstorm(7-lens)→Execute(swarm)→Ralph(x4)→Update
This replaces the need to manually call brainstorm→plan→execute→validate→save.

EXCEPTION: Do NOT orchestrate simple data lookups, single calculations, or session management.
```
**Verify:** `prism_gsd→dev_protocol` shows orchestrator section
**Rollback:** Remove appended block


---
## ═══ PHASE 4: CLEANUP + VERIFICATION (4 units) ═══
## Goal: Remove stale files, verify wiring, update state
---

### Unit P4.1: Archive stale GSD files from mcp-server root
**Status:** PENDING
**Action:** Move these files to C:\PRISM\mcp-server\data\docs\archive\
**Files (10 total):**
```
C:\PRISM\mcp-server\GSD_v9.md
C:\PRISM\mcp-server\GSD_v10.md
C:\PRISM\mcp-server\GSD_v11.md
C:\PRISM\mcp-server\GSD_v12.md
C:\PRISM\mcp-server\GSD_v13.md
C:\PRISM\mcp-server\GSD_v14.md
C:\PRISM\mcp-server\GSD_v15.md
C:\PRISM\mcp-server\GSD_v16.md
C:\PRISM\mcp-server\GSD_v18.md
C:\PRISM\mcp-server\GSD_v19.md
```
**Also move:** C:\PRISM\mcp-server\data\docs\GSD_v20.md → archive\GSD_v20.md
**Verify:** No GSD_v*.md files in mcp-server root. Only canonical files in data/docs/gsd/.
**Rollback:** Move files back from archive dir.

### Unit P4.2: Archive legacy GSD files from docs/ and prompts/
**Status:** PENDING
**Action:** Move to C:\PRISM\docs\archive\ (create if needed)
**Files:**
```
C:\PRISM\docs\GSD_CORE.md
C:\PRISM\docs\GSD_CORE_v3.md
C:\PRISM\docs\GSD_CORE_v4.md
C:\PRISM\docs\GSD_CORE_v5.md
C:\PRISM\docs\GSD_CORE_v6.md
C:\PRISM\docs\GSD_CORE_v7.md
C:\PRISM\docs\GSD_CORE_v8.md
C:\PRISM\docs\GSD_v9.md
C:\PRISM\docs\GSD_v10.md
C:\PRISM\docs\GSD_v11.md
C:\PRISM\docs\GSD_SYSTEM_DESIGN.md
C:\PRISM\docs\GSD_V9_GAP_ANALYSIS.md
C:\PRISM\prompts\GSD_CORE_PROJECT_FILE.md
```
**Verify:** Only canonical GSD lives in data/docs/gsd/.
**Rollback:** Move files back.

### Unit P4.3: Build + Full Verification
**Status:** PENDING
**Commands:**
```
1. cd C:\PRISM\mcp-server && npm run build
   Expected: Clean build, ~3.6MB, no errors
   
2. Restart Claude Desktop app (required after build)

3. Verify GSD dispatcher wiring:
   prism_gsd→core          → returns v21.2 content (not v20)
   prism_gsd→quick         → returns v21.2 content
   prism_gsd→resources_summary → returns 324 tools, 3518 materials
   
4. Verify AutoPilot wiring (requires API key):
   prism_autopilot_d→autopilot task="test GSD wiring"
   → Should show version:"v21.2" in gsd field (not v14.0)
   → Should show actual parsed laws from file
   
5. Verify ralph_loop_lite deprecation:
   prism_autopilot_d→ralph_loop_lite
   → Should return deprecation message pointing to prism_ralph→loop
   
6. Verify no stale GSD files:
   Desktop Commander search for GSD_v*.md outside archive dirs
   → Should find NONE
```
**Rollback:** N/A — this is verification only.

### Unit P4.4: Update State + Documentation
**Status:** PENDING
**Files to update:**
```
1. CURRENT_STATE.json:
   - quickResume: "Session 59: W7 GSD consolidation complete. Single source of truth: data/docs/gsd/GSD_QUICK.md (v21.2). AutoPilot wired to canonical GSD. Orchestrator-first sequencing added."
   - phase: "W7 COMPLETE"

2. ACTION_TRACKER.md — Append session entry:
   - [Session 59] W7: GSD Consolidation + AutoPilot Fix + Orchestrator-First
   - P1: Fixed gsdDispatcher core/quick/resources, archived 20+ stale files
   - P2: Fixed AutoPilot gsdPath + loadGSD parsing + deprecated fake ralph_loop_lite
   - P3: Added orchestrator-first routing to GSD_QUICK.md, MASTER_INDEX.md, DEV_PROTOCOL.md
   - P4: Cleanup, build verification, state update

3. session_memory.json architecture entry:
   - "gsd: Canonical source is data/docs/gsd/GSD_QUICK.md (v21.2). AutoPilot.ts reads+parses this file. Old versions archived. See W7_GSD_ROADMAP.md."

4. Claude project memories — update GSD entry
```
**Verify:** prism_session→state_load shows W7 COMPLETE.
**Rollback:** Revert state files.


---
## ═══ EXECUTION CHECKLIST (master reference) ═══
---

| # | Unit | File(s) | Type | Status |
|---|------|---------|------|--------|
| 1 | P1.1 | gsdDispatcher.ts | Code: fix `core` action | ✅ DONE |
| 2 | P1.2 | gsdDispatcher.ts | Code: fix fallback string | ✅ DONE |
| 3 | P1.3 | gsdDispatcher.ts | Code: fix resources_summary defaults | ✅ DONE |
| 4 | P1.4 | 11 GSD files in mcp-server root | Move to archive | ✅ DONE |
| 5 | P1.5 | 14 GSD files in docs/ + prompts/ | Move to archive | ✅ DONE |
| 6 | P2.1 | AutoPilot.ts | Code: fix gsdPath config | ✅ DONE |
| 7 | P2.2 | AutoPilot.ts | Code: rewrite loadGSD() parser | ✅ DONE |
| 8 | P2.3 | autoPilotDispatcher.ts | Code: deprecate fake ralph_loop_lite | ✅ DONE |
| 9 | P2.4 | autoPilotDispatcher.ts | Code: fix formula_optimize | ✅ DONE |
| 10 | P3.1 | GSD_QUICK.md | Doc: add orchestrator routing section | ✅ DONE |
| 11 | P3.2 | MASTER_INDEX.md | Doc: rewrite §3 with orchestrator-first | ✅ DONE |
| 12 | P3.3 | DEV_PROTOCOL.md | Doc: add orchestrator guidance | ✅ DONE |
| 13 | P4.1 | 11 files → archive | Move stale mcp-server GSD files | ✅ DONE |
| 14 | P4.2 | 14 files → archive | Move stale docs/prompts GSD files | ✅ DONE |
| 15 | P4.3 | N/A | Build + full verification | ✅ DONE |
| 16 | P4.4 | State files + docs | Update state/tracker/memories | ✅ DONE |

**Total: 16 units across 4 phases**
**Code changes: 6 units (P1.1-P1.3, P2.1-P2.2, P2.3-P2.4)**
**Doc changes: 3 units (P3.1-P3.3)**
**File moves: 2 units (P4.1-P4.2) — ~23 files to archive**
**Verification: 2 units (P4.3-P4.4)**

## RECOVERY INSTRUCTIONS

If context is lost mid-execution:
1. Read this file: C:\PRISM\mcp-server\data\docs\W7_GSD_ROADMAP.md
2. Find the EXECUTION CHECKLIST above
3. Find the first unit with Status=PENDING
4. Read its instructions (exact file, exact change, exact verification)
5. Execute it
6. Mark it DONE in this file
7. Continue to next PENDING unit

## DEPENDENCY ORDER

P1.1-P1.3 → can be done in any order (all in gsdDispatcher.ts)
P1.4-P1.5 → after P1.1 (don't archive v20 until core action doesn't reference it)
P2.1 → first in Phase 2 (path must be correct before parser works)
P2.2 → after P2.1 (parser needs correct path)
P2.3-P2.4 → independent of P2.1-P2.2 (different file)
P3.1-P3.3 → after P1 (docs should reference canonical location)
P4.1-P4.2 → after P1 code changes (ensure no code references moved files)
P4.3 → LAST before P4.4 (build + verify everything)
P4.4 → absolute last (update state after all work is verified)

## WORKFLOW ID

WF-1770844616 (prism_session→workflow_advance after each phase)

---
*Created: 2026-02-11 | Brainstorm: deep 7-lens (8 API calls) | Roadmap by: PRISM Session 59*
