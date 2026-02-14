/**
 * PRISM MCP Server - GSD (Get Shit Done) Tools
 * =============================================
 * 
 * Tools for session management, quick instructions, and protocol access.
 * 
 * Tools (6):
 * - prism_gsd_core: Full GSD instructions (v7.0)
 * - prism_gsd_quick: Minimal essentials
 * - prism_gsd_get: Get specific section
 * - prism_dev_protocol: Development protocol
 * - prism_resources_summary: Resource counts
 * - prism_quick_resume: Get quick resume from state
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

const STATE_DIR = "C:\\PRISM\\state";
const DOCS_DIR = "C:\\PRISM\\docs";

// ============================================================================
// GSD CORE CONTENT (v15.0) - 346+ MCP Tools + Intelligence + Auto-Hooks
// ============================================================================

const GSD_CORE_CONTENT = `# PRISM GSD Core v15.0 - MCP-Native + Intelligence + Auto-Hooks

## SESSION START PROTOCOL (MANDATORY — v15)
### Step 1: Boot (ONE call)
prism_session_boot → Combined: quick_resume + action_tracker + roadmap

### Step 2: Anchor
prism_todo_update → Anchor attention on current task

### Step 3: CHECK BEFORE CREATING
prism_doc_list or DC:get_file_info → ALWAYS check if file exists before ANY write

### MCP-Native First (v15)
- prism_doc_read/write for state & planning docs (NOT DC:read_file)
- prism_build for builds (NOT DC:start_process)
- prism_code_search for source search (NOT DC:start_search)
- DC only for files OUTSIDE mcp-server/

## 6 LAWS (HARD REQUIREMENTS)
1. **S(x)≥0.70** - Safety score HARD BLOCK
2. **No placeholders** - 100% complete
3. **New≥Old** - Never lose data
4. **MCP First** - 346 tools before files
5. **NO DUPLICATES** - Check ACTION_TRACKER.md + get_file_info BEFORE creating
6. **100% UTILIZATION** - If it exists, wire it everywhere

## 🔴 REAL API ENFORCEMENT
**Manufacturing decisions require REAL AI reasoning - simulation DISABLED.**

API Key location: claude_desktop_config.json env section
\`\`\`json
{
  "mcpServers": {
    "prism": {
      "command": "node",
      "args": ["C:/PRISM/mcp-server/dist/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
\`\`\`

Without valid API key:
- Agent execution → ERROR (not simulation)
- Swarm execution → ERROR (not simulation)
- Ralph loops → ERROR (not simulation)

## 4-PHASE RALPH LOOP (REAL API)
Every validation runs through 4 mandatory phases:

### Phase 1: SCRUTINIZE 🔍
- Multiple validators examine output
- Uses REAL Claude API (OPUS/SONNET/HAIKU by tier)
- Returns structured findings with severity

### Phase 2: IMPROVE 🔧
- Apply fixes based on critical/high findings
- Uses REAL Claude API for recommendations
- Generates improvement suggestions

### Phase 3: VALIDATE ✅
- Safety gate check S(x) ≥ 0.70
- Uses REAL Claude API for verification
- BLOCKS if safety threshold not met

### Phase 4: ASSESS 📊 (NEW!)
- Comprehensive scoring using OPUS
- Returns letter grade (A/B/C/D/F)
- Computes all metrics: Ω(x), S(x), Q(x), C(x), R(x)
- Production readiness verdict
- Confidence score

### Ralph Tools
| Tool | API Calls | Description |
|------|-----------|-------------|
| prism_ralph_loop | 4-8 LIVE | Full 4-phase validation |
| prism_ralph_scrutinize | 1 LIVE | Single validator pass |
| prism_ralph_assess | 1 LIVE (OPUS) | Standalone assessment |

## SWARM PATTERNS (REAL API)
All swarms use LIVE Claude API calls:

| Pattern | Description | API Calls |
|---------|-------------|-----------|
| parallel | All agents simultaneous | N agents |
| pipeline | Output→Input chaining | N agents |
| consensus | Voting with threshold | N agents |
| ensemble | Weighted combination | N agents |
| competition | Best result wins | N agents |
| collaboration | Iterative improvement | N × iterations |

## HOOK-FIRST ARCHITECTURE
Every operation triggers hooks:
- **BEFORE**: Validation, safety checks, input range
- **AFTER**: Logging, metrics, dependent updates
- **ON_ERROR**: Recovery, rollback, escalation

### Hook Categories (7,114 total)
| Category | Hooks | Safety-Critical |
|----------|-------|-----------------|
| Calculation | 12 | Kienzle, Taylor, Deflection |
| File | 8 | G-code validation |
| State | 6 | Anti-regression |
| Agent | 5 | Tier validation |
| Batch | 6 | Rollback handling |
| Formula | 4 | MAPE threshold |
| Domain | 7,073 | All operations |

## SESSION START (v15 MCP-native)
1. prism_session_boot → Combined resume + tracker + roadmap (1 call)
2. prism_todo_update → Anchor attention
3. prism_cognitive_init → Initialize (fires CALC-BEFORE-EXEC-001)

## AUTOPILOT (REAL API)
Full automatic workflow with LIVE Claude API:
1. GSD → Load instructions
2. STATE → Load current state
3. BRAINSTORM → 7 lenses (can use LIVE API)
4. EXECUTE → REAL swarm deployment
5. RALPH x4 → All 4 phases with LIVE API
6. UPDATE → State, memories

## SUPERPOWERS WORKFLOW (Hook-Integrated)
BRAINSTORM → PLAN → EXECUTE → REVIEW → COMPLETE
- prism_sp_brainstorm (fires CALC-BEFORE-EXEC-001, CALC-RANGE-CHECK-001)
- prism_sp_plan (fires BATCH-BEFORE-EXEC-001, BATCH-CHECKPOINT-001)
- prism_sp_execute (fires AGENT-BEFORE-SPAWN-001, STATE-CHECKPOINT-001)
- prism_sp_review_spec (fires CALC-AFTER-EXEC-001, FORMULA-AFTER-APPLY-001)
- prism_sp_review_quality (fires CALC-SAFETY-VIOLATION-001 if S(x)<0.70)

## BUFFER ZONES
🟢 GREEN (0-8): Normal
🟡 YELLOW (9-14): Plan checkpoint + prism_hook_fire("BATCH-CHECKPOINT-001")
🔴 RED (15-18): IMMEDIATE checkpoint + prism_hook_chain_v2("state:checkpoint")
⚫ CRITICAL (19+): STOP ALL WORK

## MASTER EQUATION
Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L
- Hooks validate each component via prism_cognitive_check
- Phase 4 ASSESS computes all scores via OPUS

## KEY TOOLS (346 total)
| Category | Tools |
|----------|-------|
| Calculations | 8 (calc_cutting_force, calc_tool_life, calc_mrr, calc_power, etc.) |
| Data Access | material_search (2805), alarm_decode (10033), formula_calc (515) |
| Session | gsd_core/quick, todo_update, cognitive_check, session_boot |
| Orchestration | autopilot_v2, brainstorm_lenses, ralph_loop, agent_invoke |
| Safety | 41 tools (collision, spindle, breakage, coolant, workholding) |
| Documents | 7 (doc_list/read/write/append, roadmap_status, action_tracker, doc_migrate) |
| Dev Workflow | 7 (build, code_template, code_search, file_read/write, server_info, session_boot) |
| Threading | 12 (tap_drill, thread_mill, thread_depth, engagement, gcode, etc.) |
| Toolpath | 8 (strategy_select, params_calculate, strategy_search/list/info, etc.) |
| Desktop Commander | ~20 (read_file, write_file, start_process, edit_block) |
| Ralph | prism_ralph_loop (4-phase), prism_ralph_scrutinize, prism_ralph_assess |
| AutoPilot | prism_autopilot, prism_autopilot_v2, prism_autopilot_quick |
| Validation | prism_validate_gates_full, prism_validate_mathplan |

## EVIDENCE LEVELS
L1=Claim, L2=Listing, L3=Sample (MIN), L4=Reproducible, L5=Verified

## 9 VALIDATION GATES (Hook-Enforced)
G1-G7: Standard checks (hooks validate each)
G8: S(x)≥0.70 **HARD BLOCK** (CALC-SAFETY-VIOLATION-001)
G9: Ω(x)≥0.70 WARN (FORMULA-MAPE-EXCEED-001)

---
v15.0 | 346+ MCP Tools | MCP-Native Docs | Session Boot | Auto-Hooks V2`;

const GSD_QUICK_CONTENT = `# PRISM Quick Reference v15.0

## START: prism_session_boot → prism_todo_update (2 calls, MCP-native)
## 6 LAWS: S(x)≥0.70 | No placeholders | New≥Old | MCP First | NO DUPLICATES | 100% UTILIZATION  
## WORKFLOW: BRAINSTORM(mandatory) → PLAN → EXECUTE → REVIEW (all hook-enabled)
## TOOLS: 346+ (doc_*, build, code_search, file_read/write, session_boot)
## MCP-NATIVE: prism_doc_read/write for state docs, prism_build for builds
## DC ONLY: files outside mcp-server/, binary files, process management
## AUTO-HOOKS: 32+ (session, machining, periodic, safety)
## BUFFER: 🟢0-8 🟡9-14(+checkpoint) 🔴15-18 ⚫19+STOP
## KEY: prism_autopilot_v2(auto) prism_ralph_loop(4-phase) prism_validate_gates_full
## END: prism_state_save → prism_doc_write(ACTION_TRACKER.md) → prism_todo_update
## API KEY: claude_desktop_config.json → mcpServers.prism.env.ANTHROPIC_API_KEY`;

const DEV_PROTOCOL_CONTENT = `# PRISM Development Protocol v3.0 - Hook-First

## HOOK-FIRST PRINCIPLE
Every phase fires hooks automatically:
- BEFORE hooks validate inputs
- AFTER hooks log results
- ON_ERROR hooks enable recovery

## MANDATORY SEQUENCE (Hook-Enabled)

### 1. prism_sp_brainstorm - STOP before implementation
   **Hooks fired:**
   - CALC-BEFORE-EXEC-001 (validates goal decomposition)
   - CALC-RANGE-CHECK-001 (checks constraints)
   - AGENT-TIER-VALIDATE-001 (assigns correct agent tiers)
   
   Actions:
   - Goal decomposition
   - Resource analysis (ILP)
   - Failure modes
   - Risk assessment
   - AWAIT APPROVAL

### 2. prism_sp_plan - After approval
   **Hooks fired:**
   - BATCH-BEFORE-EXEC-001 (validates operations)
   - BATCH-CHECKPOINT-001 (creates checkpoint for complex plans)
   - STATE-BEFORE-MUTATE-001 (tracks plan state)
   
   Complexity levels:
   - SIMPLE(0cp) MODERATE(1cp) COMPLEX(3cp) MULTI_SESSION(5cp)

### 3. prism_sp_execute - With monitoring
   **Hooks fired:**
   - AGENT-BEFORE-SPAWN-001 (validates agent spawn)
   - STATE-CHECKPOINT-001 (periodic saves)
   - BATCH-PROGRESS-001 (tracks completion)
   - CALC-SAFETY-VIOLATION-001 (on any safety issue)
   
   Monitoring:
   - Buffer zone tracking
   - prism_hook_coverage check
   - Todo recitation (Law 4)

### 4. prism_sp_review_spec - Stage 1
   **Hooks fired:**
   - FORMULA-AFTER-APPLY-001 (logs R(x) computation)
   - CALC-AFTER-EXEC-001 (validates outputs)
   
   Checks:
   - Requirements coverage
   - R(x) ≥ 0.80

### 5. prism_sp_review_quality - Stage 2
   **Hooks fired:**
   - CALC-SAFETY-VIOLATION-001 (if S(x)<0.70 → HARD BLOCK)
   - STATE-ANTI-REGRESSION-001 (verifies New≥Old)
   - FORMULA-MAPE-EXCEED-001 (flags accuracy issues)
   
   Gates:
   - C(x) quality
   - P(x) process
   - **S(x)≥0.70 HARD BLOCK**
   - Ω(x) computation

### 6. prism_sp_debug - If needed
   **Hooks fired:**
   - CALC-UNCERTAINTY-EXCEED-001 (flags uncertain diagnoses)
   - AGENT-ERROR-001 (logs failures)
   - BATCH-ROLLBACK-001 (enables recovery)
   
   Phases:
   - EVIDENCE (gather)
   - ROOT_CAUSE (analyze)
   - HYPOTHESIS (test)
   - FIX (implement)

## HOOK COVERAGE REQUIREMENT
Before any phase completion:
- Run prism_hook_coverage to verify 100%
- Run prism_hook_gaps to find missing hooks
- All safety-critical ops must have OPUS-tier hooks

## COGNITIVE SYSTEM (Hook-Enhanced)
- prism_cognitive_init: Fires CALC-BEFORE-EXEC-001
- prism_cognitive_check: Fires FORMULA-AFTER-APPLY-001 for Ω(x)
- prism_cognitive_bayes: Fires CALC-UNCERTAINTY-EXCEED-001

## ILP COMBINATION ENGINE
prism_combination_ilp: Optimal resource selection
- Fires BATCH-BEFORE-EXEC-001 for validation
- Fires FORMULA-BEFORE-APPLY-001 for each calculation`;

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

export function registerGsdTools(server: McpServer): void {
  
  /**
   * prism_gsd_core - Full GSD instructions
   */
  server.tool(
    "prism_gsd_core",
    "Get full PRISM GSD (Get Shit Done) instructions v15.0. Call at session start.",
    {
      include_examples: z.boolean().default(false).describe("Include usage examples")
    },
    async ({ include_examples }) => {
      // Load from GSD_v15.md file for latest content (anti-regression)
      const gsdFilePath = "C:\\PRISM\\mcp-server\\GSD_v15.md";
      let content = GSD_CORE_CONTENT; // fallback
      
      try {
        if (fs.existsSync(gsdFilePath)) {
          content = fs.readFileSync(gsdFilePath, 'utf-8');
        }
      } catch (err) {
        // Fall back to embedded content
      }
      
      if (include_examples) {
        content += `

## EXAMPLES

### Session Start (v15 - MCP-native)
\`\`\`
prism_session_boot → Combined resume + tracker + roadmap (1 call)
prism_todo_update(current_focus="Loading context", next_action="Begin task")
\`\`\`

### Before Implementation
\`\`\`
prism_sp_brainstorm(goal="Create new feature X", constraints=["Safety critical"])
→ AWAIT APPROVAL
→ prism_sp_plan(complexity="MODERATE")
\`\`\`

### Checkpoint
\`\`\`
prism_master_checkpoint
→ Updates state
→ Creates recovery point
\`\`\``;
      }
      
      return {
        content: [{
          type: "text",
          text: content
        }]
      };
    }
  );

  /**
   * prism_gsd_quick - Minimal essentials
   */
  server.tool(
    "prism_gsd_quick",
    "Get minimal PRISM GSD essentials. For quick reference during work.",
    {},
    async () => {
      return {
        content: [{
          type: "text",
          text: GSD_QUICK_CONTENT
        }]
      };
    }
  );

  /**
   * prism_gsd_get - Get specific section
   */
  server.tool(
    "prism_gsd_get",
    "Get specific GSD section by name.",
    {
      section: z.enum([
        "laws", "workflow", "buffer", "equation", "tools", 
        "manus", "evidence", "gates", "start", "end"
      ]).describe("Section to retrieve")
    },
    async ({ section }) => {
      const SECTIONS: Record<string, string> = {
        laws: `## 4 LAWS
1. S(x)≥0.70 - Safety HARD BLOCK
2. No placeholders - 100% complete
3. New≥Old - Never lose data
4. MCP First - 190 tools before files`,
        
        workflow: `## SUPERPOWERS WORKFLOW
BRAINSTORM → PLAN → EXECUTE → REVIEW → COMPLETE
- prism_sp_brainstorm (MANDATORY)
- prism_sp_plan (checkpoints)
- prism_sp_execute (monitor)
- prism_sp_review_spec (R(x))
- prism_sp_review_quality (Ω(x))`,
        
        buffer: `## BUFFER ZONES
🟢 GREEN (0-8): Normal operation
🟡 YELLOW (9-14): Plan checkpoint within 2-3 calls
🔴 RED (15-18): IMMEDIATE checkpoint
⚫ CRITICAL (19+): STOP ALL WORK`,
        
        equation: `## MASTER EQUATION
Ω(x) = 0.25·R + 0.20·C + 0.15·P + 0.30·S + 0.10·L

R = Reasoning completeness (0-1)
C = Code quality (0-1)
P = Process adherence (0-1)
S = Safety score (HARD BLOCK if <0.70)
L = Learning (0-1)

Thresholds:
- Ω(x) ≥ 0.85: RELEASE quality
- Ω(x) ≥ 0.70: ACCEPTABLE
- Ω(x) < 0.65: BLOCKED`,
        
        tools: `## KEY MCP TOOLS (190 total)
Master: prism_master_batch, prism_master_swarm, prism_master_checkpoint
Dev: prism_sp_brainstorm, prism_sp_plan, prism_cognitive_check
Context: prism_todo_update, prism_error_preserve, prism_memory_externalize
Data: prism_material_get, prism_machine_get, prism_skill_read
Validate: prism_validate_gates_full, prism_validate_mathplan`,
        
        manus: `## MANUS 6 LAWS
1. KV-Cache Stability - Timestamps at END, sorted JSON
2. Mask Don't Remove - Tools stay, availability masked
3. File System as Context - Files = unlimited memory
4. Attention via Recitation - prism_todo_update every 5-8 calls
5. Keep Wrong Stuff - prism_error_preserve (learning signals)
6. Don't Get Few-Shotted - prism_vary_response`,
        
        evidence: `## EVIDENCE LEVELS
L1 CLAIM: Just stated (insufficient)
L2 LISTING: Items listed
L3 SAMPLE: Content shown (MINIMUM for complete)
L4 REPRODUCIBLE: Steps to reproduce
L5 VERIFIED: Independently confirmed`,
        
        gates: `## 9 VALIDATION GATES
G1: C: drive accessible
G2: State file valid
G3: Input understood
G4: Skills available
G5: Output on C:
G6: Evidence exists
G7: New ≥ Old (anti-regression)
G8: S(x) ≥ 0.70 **HARD BLOCK**
G9: Ω(x) ≥ 0.70 (warn if not)`,
        
        start: `## SESSION START PROTOCOL
1. prism_gsd_core → Get instructions
2. Desktop Commander → C:\\PRISM\\state\\CURRENT_STATE.json
3. prism_cognitive_init → Initialize Bayesian priors
4. prism_todo_update → Anchor attention
5. Begin work with prism_sp_brainstorm`,
        
        end: `## SESSION END PROTOCOL
1. prism_cognitive_check → Final Ω(x)
2. prism_evidence_level → Verify L3+
3. prism_master_checkpoint → Final save
4. Desktop Commander → Update CURRENT_STATE.json
5. prism_session_end_full → Complete protocol`
      };
      
      return {
        content: [{
          type: "text",
          text: SECTIONS[section] || "Section not found"
        }]
      };
    }
  );

  /**
   * prism_dev_protocol - Development protocol
   */
  server.tool(
    "prism_dev_protocol",
    "Get detailed development protocol. Use for understanding workflow.",
    {},
    async () => {
      return {
        content: [{
          type: "text",
          text: DEV_PROTOCOL_CONTENT
        }]
      };
    }
  );

  /**
   * prism_resources_summary - Resource counts (dynamic)
   */
  server.tool(
    "prism_resources_summary",
    "Get summary of all PRISM resources and their counts (dynamic from CURRENT_STATE.json).",
    {},
    async () => {
      // Try to load actual counts from CURRENT_STATE.json
      try {
        const statePath = path.join(STATE_DIR, "CURRENT_STATE.json");
        if (fs.existsSync(statePath)) {
          const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
          const ri = state.resourceInventory || {};
          
          const summary = {
            mcp_tools: {
              total: ri.mcpTools || 346,
              version: ri.version || "9.0",
              categories: 25
            },
            data: {
              materials: ri.materials || { total: 2805, parameters: 127 },
              machines: ri.machines || { total: 402, manufacturers: 43 },
              alarms: ri.alarms || { total: 10033, families: 12 },
              skills: ri.skills || { total: 158, withContent: 158 },
              hooks: ri.hooks || { total: 25, phase0: 25 },
              formulas: ri.formulas || 515,
              agents: ri.agents || { total: 75, opus: 21, sonnet: 39, haiku: 15 }
            },
            protocols: {
              superpowers_workflow: ["BRAINSTORM", "PLAN", "EXECUTE", "REVIEW"],
              cognitive_patterns: ["BAYES-001/002/003", "RL-001/002/003", "OPT-001"],
              manus_6_laws: true,
              hook_first: true,
              ilp_combination: "F-PSI-001"
            },
            quality: {
              master_equation: "Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L",
              safety_threshold: "S(x) ≥ 0.70 HARD BLOCK",
              quality_threshold: "Ω(x) ≥ 0.70"
            },
            source: "CURRENT_STATE.json",
            timestamp: state.timestamp
          };
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify(summary, null, 2)
            }]
          };
        }
      } catch (err) {
        // Fall through to defaults
      }
      
      // Fallback to default values
      const summary = {
        mcp_tools: { total: 346, version: "9.0", categories: 25 },
        data: {
          materials: { total: 2805, parameters: 127 },
          machines: { total: 402, manufacturers: 43 },
          alarms: { total: 10033, families: 12 },
          skills: { total: 158, withContent: 158 },
          hooks: { total: 25, phase0: 25 },
          formulas: 515,
          agents: { total: 75, opus: 21, sonnet: 39, haiku: 15 }
        },
        source: "defaults"
      };
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(summary, null, 2)
        }]
      };
    }
  );

  /**
   * prism_quick_resume - Get quick resume from state
   */
  server.tool(
    "prism_quick_resume",
    "Get quick resume from CURRENT_STATE.json for fast session continuation.",
    {},
    async () => {
      try {
        const statePath = path.join(STATE_DIR, "CURRENT_STATE.json");
        if (!fs.existsSync(statePath)) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "NO_STATE_FILE",
                message: "CURRENT_STATE.json not found",
                action: "Start fresh session with prism_gsd_core"
              }, null, 2)
            }]
          };
        }
        
        const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "RESUME_READY",
              version: state.version,
              session: state.currentSession,
              quick_resume: state.quickResume,
              mcp_tools: state.resourceInventory?.mcpTools || 190,
              next_session: state.nextSession,
              last_updated: state.timestamp
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "ERROR",
              message: String(error)
            }, null, 2)
          }]
        };
      }
    }
  );
}

export default registerGsdTools;
