# PHASE R8: USER EXPERIENCE & INTENT ENGINE
### RECOMMENDED_SKILLS: prism-skill-orchestrator, prism-prompt-eng, prism-session-master
### HOOKS_EXPECTED: ALL
### DATA_PATHS: C:\PRISM\skills-consolidated, C:\PRISM\mcp-server\src

<!-- ANCHOR: r8_from_tool_collection_to_intelligence_platform_the_layer_that_makes_users_care -->
## From Tool Collection to Intelligence Platform â€” The Layer That Makes Users Care
<!-- ANCHOR: r8_v14_2_prerequisites_r3_actions_live_r7_intelligence_features -->
## v14.2 | Prerequisites: R3 (actions live), R7 (intelligence features)
# DEPENDS ON: R3 complete (actions live), R7 complete (intelligence features), R5 complete (visual layer)
# v14.2: Added MS6 (12 User Workflow Skills) and MS7 (10 User Assistance Skills) from
#   PRISM_SUPERPOWERS_COMPLETE_ROADMAP.md Track B â€” Gap 2. These are the guided workflows
#   that make PRISM usable by Dave persona (20-year machinist, 10-second patience).
#   Without them, the intent engine has nothing to route to.

---

<!-- ANCHOR: r8_quick_reference_standalone_after_compaction_no_other_doc_needed -->
## QUICK REFERENCE (standalone after compaction â€” no other doc needed)
```
BUILD:      npm run build (NEVER standalone tsc â€” OOM at current scale)
SAFETY:     S(x) >= 0.70 is HARD BLOCK
POSITION:   Update CURRENT_POSITION.md every 3 calls
FLUSH:      Write results to disk after each logical unit of work
ERROR:      Fix ONE build error, rebuild, repeat. >5 from one edit â†’ git revert
IDEMPOTENT: Read-only = safe to re-run. Write = check if already done first.
STUCK:      3 same-approach fails â†’ try different approach. 6 total â†’ skip if non-blocking.
TRANSITION: Update CURRENT_POSITION first, ROADMAP_TRACKER second.
RECOVERY:   Read PRISM_RECOVERY_CARD.md for full recovery steps.
ENV:        R8 = Claude.ai MCP 80% + Code 20% | Opusâ†’Sonnet. Product Architect.
```

---

<!-- ANCHOR: r8_knowledge_contributions_what_this_phase_feeds_into_the_hierarchical_index -->
## KNOWLEDGE CONTRIBUTIONS (what this phase feeds into the hierarchical index)
```
BRANCH 3 (Relationships): User intent â†’ action mapping edges. "User asking about surface finish
  needs: speed_feed calc + tool_geometry check + material_machinability lookup + machine_rigidity check."
  22 application skills each produce intentâ†’action chains.
BRANCH 4 (Session Knowledge): Intent recognition patterns, skill chaining decisions,
  user interaction patterns, error message effectiveness, disambiguation strategies.
AT PHASE GATE: RELATIONSHIP_GRAPH.json has intentâ†’action edges for all 22 skills.
```

---

<!-- ANCHOR: r8_phase_objective -->
## PHASE OBJECTIVE

R1-R7 build the engine. R8 builds the **experience**. Without R8, PRISM is a collection of
37 engines and 368 actions that require expert knowledge to invoke. With R8, a machinist
says one sentence and receives a complete, actionable manufacturing plan.

R8 solves three problems:
1. **Intent decomposition**: Natural language â†’ ordered chain of dependent MCP calls
2. **Persona-adaptive responses**: Same query, different depth for different users
3. **Workflow orchestration**: Pre-built multi-action chains for common manufacturing scenarios

**Success metric**: A first-time user with zero PRISM knowledge can get a useful
manufacturing recommendation within 60 seconds of their first message.

---

<!-- ANCHOR: r8_the_three_users -->
## THE THREE USERS

Every design decision in R8 must serve at least one of these personas.

<!-- ANCHOR: r8_persona_1_dave_the_shop_floor_machinist -->
### PERSONA 1: DAVE â€” The Shop Floor Machinist
```
CONTEXT:    Standing at the machine. Grease on hands. Phone in pocket.
EXPERIENCE: 20 years turning handles. Knows his machines cold.
            Doesn't trust computers. Will abandon anything that wastes his time.
NEEDS:      Fast parameters. Imperial units by default. Setup sheets he can tape to the machine.
            Machine-specific answers â€” "what should I run THIS tool on THIS machine?"
ANTI-NEEDS: Pareto fronts. Uncertainty quantification. Anything that sounds academic.
PATIENCE:   ~10 seconds. If the answer isn't useful by then, he's back to his handbook.
QUERY STYLE: "What speed should I run 4140 with a half-inch endmill?"
             "I'm getting chatter on my Haas, what do I do?"
             "Can I run this Inconel part on my VF-2?"
RESPONSE:   Plain English. Imperial + metric in parentheses. Short. Actionable.
            "Run at 3,200 RPM (250 SFM), feed 19.2 IPM (0.003 IPT), 0.100" DOC.
             Flood coolant. If you get chatter, drop to 2,800 RPM."
```

<!-- ANCHOR: r8_persona_2_sarah_the_cnc_programmer -->
### PERSONA 2: SARAH â€” The CNC Programmer
```
CONTEXT:    Sitting at a CAM workstation. Mastercam or Fusion 360 open.
EXPERIENCE: 8 years programming. Comfortable with technology.
            Wants to optimize, not just get parameters that work.
NEEDS:      Strategy selection. Tool path optimization. Multi-operation planning.
            Controller-specific G-code tips. Cycle time estimation.
ANTI-NEEDS: Dumbed-down explanations. Being told to "consult your tooling rep."
PATIENCE:   ~60 seconds. Will read detailed analysis if it saves programming time.
QUERY STYLE: "Plan the roughing and finishing for this 4-inch deep pocket in Inconel.
              I have HSK-A63 holders and a DMU 50."
             "Compare trochoidal vs adaptive clearing for 17-4PH stainless."
             "What's the optimal strategy for a thin wall feature, 1mm thick, 50mm tall?"
RESPONSE:   Technical depth. Strategy rationale. Multiple options with tradeoffs.
            Structured output: parameters, strategy, tool list, estimated cycle time.
            Include why, not just what.
```

<!-- ANCHOR: r8_persona_3_mike_the_shop_owner_production_manager -->
### PERSONA 3: MIKE â€” The Shop Owner / Production Manager
```
CONTEXT:    Office. Looking at quotes, schedules, machine utilization reports.
EXPERIENCE: 15 years in business. Knows costs intimately. Thinks in dollars per hour.
NEEDS:      Quoting. Scheduling. Machine fleet optimization. "Buy or outsource?"
            Cost breakdown. Utilization reports. ROI analysis.
ANTI-NEEDS: Individual cutting parameters. G-code. Shop floor minutiae.
PATIENCE:   ~2 minutes. Will engage deeply with financial analysis.
QUERY STYLE: "Can we quote this part competitively? The RFQ says 500 pieces in 6061."
             "Which jobs should go on the DMU 50 vs the VF-4?"
             "We're thinking about buying a turn-mill. Is it worth it?"
RESPONSE:   Business language. Dollars and hours. Charts and comparisons.
            Risk assessment. Competitive analysis.
```

---


---

<!-- ANCHOR: r8_context_bridge -->
## CONTEXT BRIDGE

WHAT CAME BEFORE: R7 wired physics predictions, optimization, workholding intelligence,
learning engines, and shop floor scheduling. The intelligence exists but is raw dispatcher output.

WHAT THIS PHASE DOES: Builds the user-facing layer. Intent decomposition routes natural language
to the right actions. Persona-adaptive formatting speaks each user's language. Pre-built workflows
chain complex operations into one-click solutions. This is where PRISM becomes usable.

WHAT COMES AFTER: R9 (Real-World Integration) connects PRISM to physical machines via MTConnect/
OPC-UA, CAM system plugins, DNC file transfer, and mobile interfaces. R8 makes PRISM smart;
R9 makes it connected to the real shop floor.

<!-- ANCHOR: r8_ms0_intent_decomposition_engine -->
## MS0: INTENT DECOMPOSITION ENGINE
<!-- ANCHOR: r8_role_ux_architect_model_opus_intent_taxonomy_decomposition_sonnet_impl_effort_xl_25_calls_sessions_2 -->
### Role: UX Architect | Model: Opus (intent taxonomy + decomposition) â†’ Sonnet (impl) | Effort: XL (25 calls) | Sessions: 2
<!-- ANCHOR: r8_sessions_2_effort_xl_prerequisites_r3_all_campaign_actions_live -->
### Sessions: 2 | Effort: XL | Prerequisites: R3 (all campaign actions live)

<!-- ANCHOR: r8_the_problem -->
### The Problem

User says: "I need to rough out a 4-inch deep pocket in Inconel 718 on my DMU 50,
it's going in a turbine so surface finish matters, and I only have a 1/2 inch endmill."

This single sentence requires:
1. material_get("Inconel 718") â†’ material properties
2. machine_get("DMU 50") â†’ machine capabilities, max RPM, power
3. tool_lookup("0.5 inch endmill") â†’ tool geometry, grade, coating
4. speed_feed_calc(material + tool) â†’ base cutting parameters
5. toolpath_strategy_select("pocket", material, depth=4") â†’ roughing strategy
6. surface_integrity_predict(material + params) â†’ Ra, residual stress (turbine!)
7. chatter_predict(machine + tool + params) â†’ stability check
8. process_cost(params + strategy) â†’ time and cost estimate
9. setup_sheet(all of the above) â†’ printable output

Current state: The user (or Claude) must call each action individually, understand the
dependency order, and manually pipe outputs into inputs. This works for engineers who
read the roadmap. It doesn't work for Dave.

<!-- ANCHOR: r8_solution_intentdecompositionengine -->
### Solution: IntentDecompositionEngine

**New file**: `src/engines/IntentDecompositionEngine.ts`

The engine takes a natural language manufacturing query and produces an **execution plan**:
an ordered list of MCP actions with dependency links and data flow mappings.

```typescript
interface IntentDecomposition {
  // Extracted entities from the query
  entities: {
    material?: string;           // "Inconel 718"
    machine?: string;            // "DMU 50"
    tool?: string;               // "1/2 inch endmill"
    operation?: string;          // "pocket roughing"
    feature?: {
      type: string;              // "pocket"
      depth?: string;            // "4 inches"
      width?: string;
      tolerance?: string;
    };
    constraints?: {
      surface_finish?: string;   // "surface finish matters" â†’ Ra â   ¤ 1.6
      application?: string;      // "turbine" â†’ aerospace requirements
      batch_size?: number;
      budget?: string;
    };
  };

  // Generated execution plan
  plan: ExecutionStep[];

  // Which persona does this query match?
  persona: 'machinist' | 'programmer' | 'manager' | 'unknown';

  // Confidence that we understood the query correctly
  confidence: number;            // 0-1
}

interface ExecutionStep {
  id: string;                    // "step_1"
  action: string;                // "prism_data.material_get"
  inputs: Record<string, any>;   // Direct inputs from query
  depends_on: string[];          // ["step_1", "step_2"] â€” must complete first
  output_mapping: {              // How to pipe this step's output to later steps
    field: string;               // "cutting_speed_max"
    target_step: string;         // "step_4"
    target_input: string;        // "speed_limit"
  }[];
  required: boolean;             // Can we skip this if it fails?
  estimated_tokens: number;      // Budget planning
}
```

<!-- ANCHOR: r8_entity_extraction_rules -->
### Entity Extraction Rules

The engine must handle the wild variability of machinist language:

```
MATERIAL PATTERNS:
  "4140"                    â†’ AISI 4140
  "forty-one forty"        â†’ AISI 4140
  "stainless"              â†’ prompt: "which stainless? 304, 316, 17-4PH?"
  "Inconel"                â†’ prompt: "718, 625, or other?"
  "mild steel"             â†’ AISI 1018
  "tool steel"             â†’ prompt: "A2, D2, M2, S7, H13?"
  "aluminum"               â†’ prompt: "6061, 7075, 2024?"
  "that nickel alloy"      â†’ check session history for recent Inconel/Hastelloy/Monel

TOOL PATTERNS:
  "half inch endmill"      â†’ Ã˜12.7mm (0.500") end mill
  "1/2 EM"                 â†’ same
  "three-flute"            â†’ 3 flutes, infer type from context
  "bull nose"              â†’ corner radius end mill
  "my favorite rougher"    â†’ check user profile / past jobs
  "the sandvik one"        â†’ search tools filtered by manufacturer=Sandvik

MACHINE PATTERNS:
  "my Haas"                â†’ check user profile for Haas machines
  "the DMU"                â†’ DMG Mori DMU series, prompt for specific model if needed
  "the big Mazak"          â†’ check user profile, or prompt
  "five-axis"              â†’ filter machines by capability
  "the lathe"              â†’ turning center, prompt for model

OPERATION PATTERNS:
  "rough out"              â†’ roughing operation
  "finish"                 â†’ finishing pass, implies tighter Ra target
  "hog it out"             â†’ aggressive roughing, high MRR priority
  "clean up"               â†’ finishing/semi-finishing
  "put a thread in it"     â†’ threading operation
  "drill and tap"          â†’ hole making + threading sequence
  "profile the outside"    â†’ contour milling

CONSTRAINT PATTERNS:
  "surface finish matters" â†’ Ra â   ¤ 1.6Î¼m (unless specified)
  "aerospace"              â†’ AS9100 requirements, surface integrity check
  "medical"                â†’ ISO 13485, biocompatible materials check
  "tight tolerance"        â†’ Â  0.001" (0.025mm) unless specified
  "prototype"              â†’ batch_size=1, optimize for flexibility not speed
  "production run"         â†’ optimize for cycle time and tool life
  "cheap"                  â†’ optimize for cost
  "fast"                   â†’ optimize for cycle time
```

<!-- ANCHOR: r8_ambiguity_resolution_strategy -->
### Ambiguity Resolution Strategy

When the engine can't fully decompose the intent:

**LEVEL 1 â€” High confidence (â   ¥0.85)**: Execute immediately, explain what you're doing.
"I'm calculating parameters for roughing a pocket in Inconel 718 on your DMU 50 with
a 1/2" 4-flute carbide endmill. Here's the plan..."

**LEVEL 2 â€” Medium confidence (0.5-0.85)**: State assumptions, ask ONE clarifying question.
"I'll plan roughing parameters for 4140 steel. Quick question: what machine are you on?
That'll let me check power limits and give you machine-specific RPM."

**LEVEL 3 â€” Low confidence (<0.5)**: Ask targeted questions, max 3.
"I want to help you plan this job. A few quick details would help:
â€¢ What material? (e.g., 4140, 316 stainless, Inconel 718)
â€¢ What machine? (e.g., Haas VF-2, DMU 50)
â€¢ Roughing, finishing, or full plan?"

**NEVER**: Ask more than 3 questions. NEVER ask for information you can infer or default.
NEVER make the user feel interrogated. When in doubt, assume the most common case,
calculate, and note the assumption.

<!-- ANCHOR: r8_execution_orchestrator -->
### Execution Orchestrator

Once the intent is decomposed into a plan, the **ExecutionOrchestrator** runs it:

```typescript
class ExecutionOrchestrator {
  async execute(plan: ExecutionStep[]): Promise<WorkflowResult> {
    const results: Map<string, any> = new Map();
    const errors: Map<string, Error> = new Map();

    // Topological sort by dependencies
    const ordered = this.topologicalSort(plan);

    for (const step of ordered) {
      // Check dependencies are satisfied
      const depsSatisfied = step.depends_on.every(d =>
        results.has(d) || (!plan.find(s => s.id === d)?.required && errors.has(d))
      );

      if (!depsSatisfied) {
        if (step.required) {
          return { success: false, error: `Blocked: ${step.id} depends on failed step` };
        }
        continue; // Skip optional step with failed dependencies
      }

      // Resolve inputs: merge direct inputs with piped outputs from dependencies
      const resolvedInputs = this.resolveInputs(step, results);

      try {
        const result = await this.callAction(step.action, resolvedInputs);
        results.set(step.id, result);
      } catch (err) {
        errors.set(step.id, err);
        if (step.required) {
          // Required step failed â€” can we degrade gracefully?
          const fallback = this.getFallback(step);
          if (fallback) {
            results.set(step.id, fallback);
          } else {
            return { success: false, error: `Required step ${step.id} failed: ${err}` };
          }
        }
      }
    }

    return { success: true, results, errors };
  }
}
```

<!-- ANCHOR: r8_graceful_degradation_rules -->
### Graceful Degradation Rules

When a step in the chain fails, the system degrades rather than stops:

| Failed Step | Degradation | User Message |
|-------------|-------------|--------------|
| material_get | Use generic ISO group properties | "I don't have exact data for that alloy. Using P-group steel properties â€” verify these before production." |
| machine_get | Skip power/torque limits, warn user | "I don't have your machine's specs, so these parameters assume adequate power. Check your spindle load." |
| tool_lookup | Use generic geometry from user description | "Using generic 4-flute carbide geometry. For better accuracy, tell me the manufacturer and catalog number." |
| chatter_predict | Skip, note as unchecked | "I didn't check for chatter stability. If you get vibration, try dropping RPM by 15%." |
| surface_integrity | Skip, warn for aerospace | "âš ï¸ Surface integrity not verified. For turbine parts, confirm residual stress with your quality team." |
| process_cost | Omit cost from output | "Cost estimate unavailable â€” I need tool cost data to calculate this." |

---

<!-- ANCHOR: r8_ms1_persona_adaptive_response_formatting -->
## MS1: PERSONA-ADAPTIVE RESPONSE FORMATTING
<!-- ANCHOR: r8_role_ux_architect_model_sonnet_formatter_persona_templates_effort_m_10_calls_sessions_1 -->
### Role: UX Architect | Model: Sonnet (formatter + persona templates) | Effort: M (10 calls) | Sessions: 1
<!-- ANCHOR: r8_sessions_1_effort_m_prerequisites_ms0_intent_decomposition -->
### Sessions: 1 | Effort: M | Prerequisites: MS0 (intent decomposition)

<!-- ANCHOR: r8_the_problem -->
### The Problem

The same calculation result should be presented completely differently to Dave, Sarah, and Mike.

<!-- ANCHOR: r8_solution_responseformatterengine -->
### Solution: ResponseFormatterEngine

**New file**: `src/engines/ResponseFormatterEngine.ts`

#### Dave's Format (Machinist)
```
SETUP SHEET â€” Pocket Roughing, Inconel 718
Machine: DMU 50 | Tool: 1/2" 4-flute carbide (AlTiN coated)

Speed:   1,200 RPM (155 SFM)
Feed:    7.2 IPM (0.0015 IPT)
DOC:     0.040" axial
WOC:     0.125" radial (25% of diameter)
Strategy: Trochoidal / Dynamic Milling

Coolant: Through-tool, HIGH PRESSURE (1000+ PSI if available)
         âš ï¸ Flood is NOT adequate for Inconel pocketing

Tool Life: ~25 minutes at these parameters
Cycle Time: ~18 minutes for this pocket

NOTES:
â€¢ Listen for chatter â€” if you hear it, drop to 1,050 RPM
â€¢ Inconel work-hardens. Do NOT dwell or rub. Keep the tool moving.
â€¢ Replace tool at 25 min regardless of appearance. Inconel hides wear.
```

#### Sarah's Format (Programmer)
```
JOB PLAN: 4" Deep Pocket â€” Inconel 718 â€” DMU 50

STRATEGY ANALYSIS
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Strategy        â”‚ Cycle Time â”‚ Tool Life  â”‚ Risk Level   â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ Trochoidal      â”‚ 18.2 min   â”‚ 25 min     â”‚ LOW          â”‚
â”‚ Adaptive Clear  â”‚ 15.8 min   â”‚ 22 min     â”‚ MEDIUM       â”‚
â”‚ Plunge Rough    â”‚ 21.4 min   â”‚ 30 min     â”‚ LOW          â”‚
â”‚ Conventional    â”‚ 14.1 min   â”‚ 12 min     â”‚ HIGH âš ï¸      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

RECOMMENDED: Trochoidal (best tool life / risk ratio)

ROUGHING PARAMETERS
Vc = 47 m/min (155 SFM) | fz = 0.038 mm/tooth (0.0015 IPT)
ap = 1.0 mm (0.040") | ae = 3.2 mm (0.125") | 25% radial engagement

CHATTER ANALYSIS
Stability margin: 0.72 (STABLE)
If borderline: RPM sweet spots at 1,050 and 1,380 RPM
Tool first natural frequency: ~2,400 Hz at 60mm overhang

SURFACE INTEGRITY (Aerospace Application)
Predicted Ra: 2.1 Î¼m (finishing pass required for turbine spec)
Residual stress: -180 MPa (compressive â€” FAVORABLE)
White layer risk: LOW at Vc=47 m/min
Recommendation: Add finishing pass at Vc=35, fz=0.05, ap=0.2 for Ra â   ¤ 0.8

FINISHING PARAMETERS
Vc = 35 m/min | fz = 0.05 mm/tooth | ap = 0.2 mm | ae = full width
Strategy: Contour with 0.1mm stepover for floor
Predicted Ra: 0.6 Î¼m âœ“

CONTROLLER NOTES (Siemens 840D on DMU 50)
CYCLE832(0.01) â€” High Speed Setting, tolerance 0.01mm
COMPCAD â€” Use spline interpolation for trochoidal path
FFWON â€” Feed forward ON for better path accuracy
```

#### Mike's Format (Manager)
```
COST ANALYSIS: Inconel 718 Pocket â€” DMU 50

Per-Part Cost Breakdown
  Machine time: 22.4 min Ã   $185/hr = $69.07
  Tool cost: 1 insert set per 1.4 parts = $28.57/part
  Programming: 2 hrs Ã· batch of 50 = $7.40/part
  Setup: 45 min Ã· batch of 50 = $2.78/part
  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  TOTAL: $107.82/part (at 50 quantity)
  TOTAL: $98.14/part (at 200 quantity â€” amortized programming)

Quote Recommendation: $135-145/part (25-35% margin)

Alternative: Outsource vs In-House
  Your shop rate: $107.82/part
  Typical Inconel job shop: $95-120/part
  Decision: Competitive to run in-house IF DMU 50 has capacity
  
Risk Factor: Inconel is unforgiving. Budget 5% scrap rate for first batch.
```

<!-- ANCHOR: r8_persona_detection -->
### Persona Detection

The engine detects persona from query patterns:

```typescript
function detectPersona(query: string, history: Message[]): Persona {
  const indicators = {
    machinist: {
      patterns: [/what speed/, /what feed/, /rpm/, /sfm/, /ipm/, /chatter/,
                 /getting vibration/, /tool is squealing/, /setup/],
      units: [/inch/, /thou/, /ipm/, /sfm/],
      urgency: [/right now/, /at the machine/, /quick/]
    },
    programmer: {
      patterns: [/strategy/, /toolpath/, /compare/, /optimize/, /cycle time/,
                 /g-?code/, /cam/, /fusion/, /mastercam/, /controller/],
      depth: [/why/, /tradeoff/, /analysis/, /vs\.?/]
    },
    manager: {
      patterns: [/cost/, /quote/, /rfq/, /price/, /schedule/, /utilization/,
                 /roi/, /buy/, /outsource/, /capacity/, /how many/],
      business: [/margin/, /profit/, /competitive/, /batch/, /volume/]
    }
  };

  // Score each persona
  // Also check user profile from MemoryGraph for historical persona
  // Also check: if user is on mobile â†’ likely machinist (at machine)
  //             if query is long/detailed â†’ likely programmer
  //             if query mentions money â†’ likely manager
}
```

<!-- ANCHOR: r8_unit_preference_system -->
### Unit Preference System

```
DEFAULT: Detect from user's locale and query language
  Imperial indicators: "inch", "thou", "sfm", "ipm", "fpm", psi
  Metric indicators: "mm", "m/min", "mm/rev", "Î¼m", "bar", "MPa"

DISPLAY RULE: Show primary unit system + secondary in parentheses
  Dave (imperial): "3,200 RPM (250 SFM), feed 19.2 IPM (0.003 IPT)"
  Sarah (metric):  "Vc = 47 m/min (155 SFM), fz = 0.038 mm/tooth (0.0015 IPT)"

OVERRIDE: User can say "give me metric" and all future responses switch.
Persist preference in MemoryGraph per user.
```

---

<!-- ANCHOR: r8_ms2_pre_built_workflow_chains -->
## MS2: PRE-BUILT WORKFLOW CHAINS
<!-- ANCHOR: r8_role_ux_architect_model_sonnet_chain_construction_opus_correctness_validation_effort_m_10_calls_sessions_1 -->
### Role: UX Architect | Model: Sonnet (chain construction) â†’ Opus (correctness validation) | Effort: M (10 calls) | Sessions: 1
<!-- ANCHOR: r8_sessions_1_effort_l_prerequisites_ms0_intent_decomposition_r3_r7_actions -->
### Sessions: 1 | Effort: L | Prerequisites: MS0 (intent decomposition), R3 + R7 (actions)

<!-- ANCHOR: r8_the_10_workflows_that_cover_90_of_manufacturing_questions -->
### The 10 Workflows That Cover 90% of Manufacturing Questions

Each workflow is a pre-built execution plan that the IntentDecompositionEngine can match
against before attempting free-form decomposition. These are the "happy paths" that
should be lightning-fast.

#### WORKFLOW 1: "PLAN THIS JOB" (Full Manufacturing Plan)
**Trigger phrases**: "plan this job", "how should I make this", "set up for", "machining plan"
**Persona**: All (formatted differently)
```
Chain: material_get â†’ machine_get â†’ tool_recommend â†’ speed_feed_calc â†’
       toolpath_strategy_select â†’ chatter_predict â†’ surface_integrity_predict â†’
       process_cost â†’ setup_sheet_generate
Steps: 9 | Estimated time: 3-5 seconds | Estimated tokens: ~8K
```

#### WORKFLOW 2: "QUICK PARAMETERS" (Speed & Feed Only)
**Trigger phrases**: "what speed", "what feed", "parameters for", "rpm for"
**Persona**: Machinist (Dave)
```
Chain: material_get â†’ speed_feed_calc
Steps: 2 | Estimated time: <1 second | Estimated tokens: ~2K
Output: Speed, feed, DOC, WOC, coolant recommendation. Nothing else.
```

#### WORKFLOW 3: "COMPARE STRATEGIES" (Toolpath Decision)
**Trigger phrases**: "compare", "which strategy", "trochoidal vs", "best approach for"
**Persona**: Programmer (Sarah)
```
Chain: material_get â†’ machine_get â†’ [for each strategy: speed_feed_calc â†’
       toolpath_strategy_select â†’ process_cost] â†’ comparison_table
Steps: 4-8 depending on strategies compared | Estimated tokens: ~6K
```

#### WORKFLOW 4: "QUOTE THIS PART" (Cost Estimation)
**Trigger phrases**: "quote", "rfq", "cost to make", "price this", "how much"
**Persona**: Manager (Mike)
```
Chain: material_get â†’ [for each operation: tool_recommend â†’ speed_feed_calc â†’
       process_cost] â†’ shop_schedule (if fleet specified) â†’ quote_summary
Steps: 5-12 | Estimated tokens: ~10K
Output: Per-part cost breakdown, recommended quote price, margin analysis
```

#### WORKFLOW 5: "FIX MY CHATTER" (Diagnostic)
**Trigger phrases**: "getting chatter", "vibration", "squealing", "tool is chattering"
**Persona**: Machinist (Dave), Programmer (Sarah)
```
Chain: [extract current params from user] â†’ chatter_predict â†’
       [if unstable: find stable RPM pockets] â†’ [suggest mitigation]
Steps: 3-4 | Estimated tokens: ~4K
Output: Diagnosis, stable RPM alternatives, parameter adjustments, tool changes to consider
```

#### WORKFLOW 6: "WHAT TOOL SHOULD I USE?" (Tool Selection)
**Trigger phrases**: "what tool", "tool for", "which endmill", "recommend a drill"
**Persona**: All
```
Chain: material_get â†’ tool_search(material + operation + constraints) â†’
       [for top 3 tools: speed_feed_calc] â†’ comparison_with_rationale
Steps: 5-7 | Estimated tokens: ~5K
Output: Top 3 tools with parameters, pros/cons, cost comparison
```

#### WORKFLOW 7: "CAN MY MACHINE DO THIS?" (Capability Check)
**Trigger phrases**: "can I run", "will my machine", "is my machine capable", "enough power"
**Persona**: Machinist (Dave), Programmer (Sarah)
```
Chain: material_get â†’ machine_get â†’ speed_feed_calc â†’ [check: power required vs
       available, torque required vs available, RPM required vs max, travel vs envelope]
Steps: 4 | Estimated tokens: ~3K
Output: Yes/no with specific limiting factor, alternative approaches if no
```

#### WORKFLOW 8: "SCHEDULE MY SHOP" (Fleet Optimization)
**Trigger phrases**: "schedule", "which machine for", "assign jobs", "utilization"
**Persona**: Manager (Mike)
```
Chain: [load all jobs] â†’ [load all machines] â†’ shop_schedule â†’
       utilization_report â†’ bottleneck_analysis
Steps: 4-5 | Estimated tokens: ~8K
Output: Machine assignments, timeline, utilization %, bottleneck warnings
```

#### WORKFLOW 9: "DIAGNOSE THIS ALARM" (Troubleshooting)
**Trigger phrases**: "alarm", "error code", "machine says", "what does alarm X mean"
**Persona**: Machinist (Dave)
```
Chain: alarm_decode(code + controller) â†’ root_cause_analysis â†’
       recovery_procedure â†’ prevention_tips
Steps: 3-4 | Estimated tokens: ~3K
Output: Plain English alarm meaning, step-by-step fix, how to prevent recurrence
```

#### WORKFLOW 10: "TEACH ME" (Educational)
**Trigger phrases**: "why", "explain", "how does", "what's the difference between"
**Persona**: All (depth varies by persona)
```
Chain: knowledge_query â†’ [optional: relevant_calculation_example] â†’
       explanation_with_context
Steps: 2-3 | Estimated tokens: ~4K
Output: Explanation at appropriate depth, with practical manufacturing example
```

---

<!-- ANCHOR: r8_ms3_onboarding_first_5_minutes -->
## MS3: ONBOARDING & FIRST 5 MINUTES
<!-- ANCHOR: r8_role_ux_architect_model_sonnet_flow_impl_effort_s_5_calls_sessions_0_5 -->
### Role: UX Architect | Model: Sonnet (flow impl) | Effort: S (5 calls) | Sessions: 0.5
<!-- ANCHOR: r8_sessions_1_effort_s_prerequisites_ms0_ms2 -->
### Sessions: 1 | Effort: S | Prerequisites: MS0-MS2

<!-- ANCHOR: r8_the_first_interaction -->
### The First Interaction

When a user first encounters PRISM (through Claude with PRISM MCP tools connected),
the experience should immediately demonstrate value. No tutorials. No "let me explain
what I can do." Just solve their problem, then reveal depth.

**SCENARIO**: User says "hi" or asks a generic question.

```
PRISM detects: New user, no profile, no past jobs.

Response: "Hey! I'm PRISM â€” I help with CNC machining. Give me a material and an
operation, and I'll give you cutting parameters, strategy recommendations, and
tooling suggestions. Try something like:

  'Parameters for milling 4140 with a 1/2 inch endmill'
  'Best strategy for a deep pocket in Inconel'
  'How should I thread M12x1.75 in 316 stainless?'

I know 3,500+ materials, 800+ machines, and 9,200 alarm codes across 12 controller
families. What are you working on?"
```

**SCENARIO**: User asks their first real question.

```
User: "What should I run 7075 at with a 3/4 rougher?"

PRISM response includes the answer PLUS a gentle reveal of depth:

[answers with parameters]

"By the way â€” if you tell me which machine you're on, I can check power limits
and chatter stability. And if you're doing multiple operations, I can plan the
whole job and generate a setup sheet."
```

<!-- ANCHOR: r8_progressive_disclosure_levels -->
### Progressive Disclosure Levels

```
LEVEL 0 â€” INSTANT VALUE (first query)
  Speed, feed, DOC. Nothing else. Prove competence immediately.

LEVEL 1 â€” REVEAL DEPTH (second/third query)
  "I can also check chatter stability, compare toolpath strategies, and
   estimate cycle time. Want me to go deeper on this job?"

LEVEL 2 â€” SHOW INTELLIGENCE (after ~5 queries)
  "Based on the jobs you've been asking about, you're doing a lot of Inconel
   work on 5-axis machines. Want me to create an optimized parameter set for
   your most common material/machine combinations?"

LEVEL 3 â€” OFFER INTEGRATION (after ~10 queries)
  "I notice you're manually entering parameters that I could look up faster
   if I knew your machine and tool inventory. Want to set up your shop profile?"

LEVEL 4 â€” ENABLE LEARNING (after ~20 queries)
  "If you tell me how these parameters actually performed â€” tool life, surface
   finish, any issues â€” I can learn from your experience and give you even
   better recommendations over time."
```

<!-- ANCHOR: r8_user_profile_system -->
### User Profile System

Stored in MemoryGraphEngine.ts (already exists):

```typescript
interface UserShopProfile {
  name: string;
  company?: string;
  role: 'machinist' | 'programmer' | 'manager' | 'engineer' | 'student';
  experience_years?: number;

  machines: {
    id: string;                          // machine_id from MachineRegistry
    nickname?: string;                   // "Big Haas", "the DMU", "old faithful"
    condition?: 'new' | 'good' | 'worn'; // Affects parameter recommendations
    notes?: string;
  }[];

  preferred_tools: {
    manufacturer: string;
    reason?: string;                     // "We're a Sandvik shop"
  }[];

  common_materials: string[];            // Frequently machined materials
  unit_preference: 'imperial' | 'metric' | 'auto';
  detail_level: 'minimal' | 'standard' | 'detailed';

  shop_rate_per_hour?: number;           // For cost calculations
  shift_hours?: number;                  // For scheduling

  certifications?: string[];             // AS9100, ISO 13485, ITAR
}
```

---

<!-- ANCHOR: r8_ms4_setup_sheet_generation -->
## MS4: SETUP SHEET GENERATION
<!-- ANCHOR: r8_role_ux_architect_model_sonnet_template_generation_effort_m_10_calls_sessions_1 -->
### Role: UX Architect | Model: Sonnet (template + generation) | Effort: M (10 calls) | Sessions: 1
<!-- ANCHOR: r8_sessions_1_effort_m_prerequisites_ms1_formatting_r3_job_plan_data -->
### Sessions: 1 | Effort: M | Prerequisites: MS1 (formatting), R3 (job_plan data)

<!-- ANCHOR: r8_objective -->
### Objective

Generate a **printable, professional setup sheet** that a machinist can tape to the machine.
This is the most tangible output PRISM can produce â€” a physical artifact that proves value.

<!-- ANCHOR: r8_setup_sheet_template -->
### Setup Sheet Template

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  PRISM SETUP SHEET                      Job: [auto-generated]â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚
â”‚  Part: [description]           Material: [material + spec]   â”‚
â”‚  Machine: [name]               Date: [today]                 â”‚
â”‚  Programmer: [user]            Program: [if provided]        â”‚
â”‚                                                              â”‚
â”‚  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•  â”‚
â”‚                                                              â”‚
â”‚  OPERATION 1: [name]                                         â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚ Tool: T01 â€” [description]            Holder: [type]    â”‚  â”‚
â”‚  â”‚ Speed: [RPM] ([SFM/SMM])             Stick-out: [dim]  â”‚  â”‚
â”‚  â”‚ Feed:  [IPM/MMPM] ([IPT/MMPT])       Coolant: [type]   â”‚  â”‚
â”‚  â”‚ DOC:   [depth]                       WOC: [width]      â”‚  â”‚
â”‚  â”‚ Strategy: [name]                     Passes: [count]    â”‚  â”‚
â”‚  â”‚                                                         â”‚  â”‚
â”‚  â”‚ âš ï¸ NOTES: [safety notes, chatter warnings, etc.]       â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚                                                              â”‚
â”‚  OPERATION 2: [name]                                         â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚ [same format]                                          â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚                                                              â”‚
â”‚  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•  â”‚
â”‚  TOOL LIST                                                   â”‚
â”‚  T01: [tool] â€” used in Op 1, 3     â”‚ Est. life: [min]       â”‚
â”‚  T02: [tool] â€” used in Op 2        â”‚ Est. life: [min]       â”‚
â”‚  T03: [tool] â€” used in Op 4, 5     â”‚ Est. life: [min]       â”‚
â”‚                                                              â”‚
â”‚  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•  â”‚
â”‚  SUMMARY                                                     â”‚
â”‚  Total cycle time: [min]           Tool cost: [$]            â”‚
â”‚  Estimated part cost: [$]          Setup time: [min]         â”‚
â”‚                                                              â”‚
â”‚  Generated by PRISM Manufacturing Intelligence               â”‚
â”‚  S(x) = [safety score] | Î© = [quality score]                â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

Output formats:
- **Markdown** (for chat display)
- **PDF** (for printing â€” professional layout with company logo placeholder)
- **JSON** (for CAM integration â€” structured data for post-processor consumption)

---

<!-- ANCHOR: r8_ms5_conversational_memory_context -->
## MS5: CONVERSATIONAL MEMORY & CONTEXT
<!-- ANCHOR: r8_role_intelligence_architect_model_opus_memory_integration_design_sonnet_impl_effort_m_10_calls_sessions_1 -->
### Role: Intelligence Architect | Model: Opus (memory integration design) â†’ Sonnet (impl) | Effort: M (10 calls) | Sessions: 1
<!-- ANCHOR: r8_sessions_1_effort_m_prerequisites_memorygraphengine_exists_ms0 -->
### Sessions: 1 | Effort: M | Prerequisites: MemoryGraphEngine (exists), MS0

<!-- ANCHOR: r8_objective -->
### Objective

PRISM should remember what the user was working on across sessions. Not just parameters
they asked about, but the *job context*: the part, the material, the machine, the problems
they encountered.

<!-- ANCHOR: r8_conversational_state_machine -->
### Conversational State Machine

```
States:
  IDLE         â†’ User hasn't started a job context
  EXPLORING    â†’ User is asking about materials, tools, strategies (browsing)
  PLANNING     â†’ User is building a specific job plan (committed to a job)
  EXECUTING    â†’ User is at the machine running the job (real-time support)
  REVIEWING    â†’ User is reporting results, problems, or outcomes

Transitions:
  IDLE â†’ EXPLORING:     Any manufacturing query
  EXPLORING â†’ PLANNING: User commits to a specific part/material/machine
  PLANNING â†’ EXECUTING: User says "I'm running it now" or "at the machine"
  EXECUTING â†’ REVIEWING: User reports results or session ends
  REVIEWING â†’ IDLE:     Outcomes recorded

State affects response:
  EXPLORING: Broad, comparative, educational
  PLANNING:  Specific, detailed, actionable
  EXECUTING: Terse, immediate, safety-first
  REVIEWING: Analytical, improvement-focused
```

<!-- ANCHOR: r8_cross_session_memory -->
### Cross-Session Memory

```typescript
interface JobContext {
  id: string;
  created: Date;
  lastAccessed: Date;
  state: 'exploring' | 'planning' | 'executing' | 'reviewing' | 'complete';

  // Accumulated knowledge about this job
  material?: string;
  machine?: string;
  tools: string[];
  operations: {
    type: string;
    parameters?: CuttingParameters;
    outcome?: JobOutcome;
  }[];
  issues: string[];                      // Problems encountered
  notes: string[];                       // User's notes

  // What was recommended vs what actually happened
  recommendations: Recommendation[];
  actualResults: ActualResult[];
}
```

When the user returns: "Hey, remember that Inconel part from last week?"
PRISM queries MemoryGraph â†’ finds the job context â†’ resumes with full knowledge.

---

<!-- ANCHOR: r8_phase_gate_r8_complete -->
## PHASE GATE: R8 â†’ COMPLETE

<!-- ANCHOR: r8_definition_of_done -->
### Definition of Done
- [ ] New user can get useful parameters within 60 seconds
- [ ] Intent decomposition handles all 10 workflow triggers correctly
- [ ] Persona detection accuracy â   ¥ 80% on test corpus
- [ ] All 3 personas receive appropriately formatted responses
- [ ] Setup sheets generate correctly for multi-operation jobs
- [ ] Unit preference persists across sessions
- [ ] Cross-session job context recovery works for â   ¥ 3-day gaps
- [ ] Graceful degradation tested for all failure modes in chain
- [ ] Zero cases where user must know MCP action names to get results

<!-- ANCHOR: r8_the_60_second_test -->
### The 60-Second Test
Have 5 machinists who have never seen PRISM type their first question.
All 5 must receive a useful, actionable answer within 60 seconds.
If any fail, R8 is not complete.

---

<!-- ANCHOR: r8_ms6_user_workflow_skills_v14_2_gap_2_superpowers_track_b -->
## MS6: USER WORKFLOW SKILLS (v14.2 â€” Gap 2, Superpowers Track B)
<!-- ANCHOR: r8_role_ux_architect_model_sonnet_skill_impl_haiku_bulk_testing_effort_l_15_calls_sessions_1_2 -->
### Role: UX Architect | Model: Sonnet (skill impl) â†’ Haiku (bulk testing) | Effort: L (15 calls) | Sessions: 1-2
<!-- ANCHOR: r8_sessions_1_2_effort_h_prerequisites_r3_actions_r7_physics_ms0_ms2_intent_engine -->
### Sessions: 1-2 | Effort: H | Prerequisites: R3 (actions), R7 (physics), MS0-MS2 (intent engine)
<!-- ANCHOR: r8_source_prism_superpowers_complete_roadmap_md_sp_4 -->
### Source: PRISM_SUPERPOWERS_COMPLETE_ROADMAP.md Â SP-4

**WHY:** R8-MS0 builds the intent engine. R8-MS2 builds workflow chains. But what does
the engine ROUTE TO? These 12 skills are the guided workflows that take Dave from
"I need to machine this" to "here are your parameters with safety validation."

<!-- ANCHOR: r8_the_12_user_workflow_skills -->
### The 12 User Workflow Skills
```
 1. material-guide      â€” "What material is this?" â†’ identify â†’ properties â†’ machining approach
 2. speed-feed-wizard   â€” "What speed and feed?" â†’ guided parameter selection + safety
 3. tool-select         â€” "What tool should I use?" â†’ material+operation â†’ tool recommendation
 4. machine-setup       â€” "Setting up my Haas" â†’ machine-specific setup guide + controller hints
 5. toolpath-advisor    â€” "Best strategy for pocket?" â†’ strategy recommendation + comparison
 6. troubleshoot        â€” "Getting chatter" â†’ diagnosis â†’ root cause â†’ parameter adjustment
 7. quality-analysis    â€” "Parts out of tolerance" â†’ cause analysis â†’ parameter correction
 8. cost-optimization   â€” "Reduce cycle time" â†’ optimization â†’ cost comparison
 9. post-debug          â€” "G-code looks wrong" â†’ controller-specific validation
10. fixture-selection   â€” "How to hold this part?" â†’ fixture recommendation + clamping analysis
11. cycle-time-optimize â€” "How long will this take?" â†’ estimate â†’ optimization suggestions
12. quoting-assistance  â€” "Cost per part?" â†’ full cost breakdown â†’ quote recommendation
```

Each skill = 1 SKILL.md file with: TRIGGER_PATTERNS, REQUIRED_ACTIONS, DATA_DEPENDENCIES,
CONVERSATION_FLOW, FALLBACK_BEHAVIOR, PERSONA_ADAPTATION (Dave/Sarah/Alex detail levels).

---

<!-- ANCHOR: r8_ms7_user_assistance_skills_v14_2_gap_2_superpowers_track_b -->
## MS7: USER ASSISTANCE SKILLS (v14.2 â€” Gap 2, Superpowers Track B)
<!-- ANCHOR: r8_role_ux_architect_model_sonnet_skill_impl_effort_m_10_calls_sessions_1 -->
### Role: UX Architect | Model: Sonnet (skill impl) | Effort: M (10 calls) | Sessions: 1
<!-- ANCHOR: r8_sessions_1_effort_m_prerequisites_ms6_complete -->
### Sessions: 1 | Effort: M | Prerequisites: MS6 complete
<!-- ANCHOR: r8_source_prism_superpowers_complete_roadmap_md_sp_5 -->
### Source: PRISM_SUPERPOWERS_COMPLETE_ROADMAP.md Â SP-5

**WHY:** Workflow skills DO the work. Assistance skills EXPLAIN the work. Dave doesn't
trust a black box. He needs to see WHY PRISM recommends those parameters.

<!-- ANCHOR: r8_the_10_user_assistance_skills -->
### The 10 User Assistance Skills
```
 1. explain-physics        â€” "WHY this speed?" â†’ plain-language physics explanation
 2. explain-recommendations â€” "WHY this tool?" â†’ decision rationale + alternatives considered
 3. confidence-communication â€” "How sure are you?" â†’ uncertainty bounds + data quality
 4. alternative-explorer    â€” "What else could work?" â†’ runner-up options with tradeoffs
 5. feedback-integration    â€” "That didn't work" â†’ record outcome â†’ adjust future recs
 6. safety-verification     â€” "Is this safe?" â†’ S(x) score + risk factors + what could go wrong
 7. documentation-setup     â€” "Give me a setup sheet" â†’ printable operator document
 8. decision-flow-diagrams  â€” "Walk me through this" â†’ visual decision tree
 9. anti-machining-mistakes â€” "Common mistakes?" â†’ proactive warnings per material+operation
10. onboarding              â€” "I'm new to PRISM" â†’ progressive disclosure tour
```

---

<!-- ANCHOR: r8_estimated_effort -->
## ESTIMATED EFFORT

| Milestone | Sessions | New Lines | Key Deliverable |
|-----------|----------|-----------|-----------------|
| MS0: Intent Decomposition | 2 | ~800 | IntentDecompositionEngine.ts |
| MS1: Persona-Adaptive Formatting | 1 | ~400 | ResponseFormatterEngine.ts |
| MS2: Workflow Chains | 1 | ~300 | 10 pre-built workflow definitions |
| MS3: Onboarding & First 5 Minutes | 1 | ~200 | Progressive disclosure system |
| MS4: Setup Sheet Generation | 1 | ~350 | SetupSheetEngine.ts + PDF template |
| MS5: Conversational Memory | 1 | ~250 | Job context state machine |
| MS6: User Workflow Skills | 1-2 | ~600 | 12 structured workflow skills |
| MS7: User Assistance Skills | 1 | ~500 | 10 assistance/XAI skills |
| **TOTAL** | **9-10** | **~3,400** | |

---

<!-- ANCHOR: r8_r8_companion_assets_v14_5_built_per_ms_verified_at_r8_gate -->
## R8 COMPANION ASSETS (v14.5 -- built per-MS, verified at R8 gate)

<!-- ANCHOR: r8_per_ms_companion_schedule -->
### PER-MS COMPANION SCHEDULE:
``r
MS0 PRODUCES: (intent engine -- no separate skill, it IS the routing layer)
MS1 PRODUCES: (persona formatting -- built into intent engine)
MS2 PRODUCES: workflow_completion_rate hook (telemetry)
MS3 PRODUCES: (onboarding -- no companion, self-contained)
MS4 PRODUCES: (setup sheets -- uses R3 data, no new skill needed)
MS5 PRODUCES: (memory integration -- extends existing memory graph)
MS6 PRODUCES: 12 user workflow skills (ARE the companion assets)
MS7 PRODUCES: 10 user assistance skills (ARE the companion assets)
  HOOK: skill_routing_fallback (warning, logs intent engine mismatches)
GATE VERIFIES: All 22 skills load, both hooks fire, intent engine routes correctly
``r

<!-- ANCHOR: r8_r8_companion_assets_detail_v14_2 -->
## R8 COMPANION ASSETS DETAIL (v14.2)

```
The 22 skills (MS6+MS7) ARE the companion assets for R8.
Each skill built AFTER features it depends on.

ADDITIONAL HOOKS (2 new):
  skill_routing_fallback    â€” warning, logs when intent engine can't match a skill
  workflow_completion_rate   â€” telemetry, tracks workflow completion vs abandonment
```

---

*R8 is where PRISM stops being a tool and starts being a colleague.
The engine room is built. R8 puts a bridge on top of it with windows,
a wheel, and a captain who speaks the crew's language.*

---
## COMPLETED — Actual Deliverables (2026-02-22)
Status: COMPLETE | Commits: 56e9811 → cf05463

### Milestones Delivered:
- **R8-MS0**: Intent decomposition engine — NL query to execution plan (102/102 tests) (56e9811)
- **R8-MS1**: Persona-adaptive response formatter — Dave/Sarah/Mike personas (90/90 tests) (039ecb3)
- **R8-MS2**: Pre-built workflow chains — 10 manufacturing workflows (314/314 tests) (fa1765c)
- **R8-MS3**: Progressive onboarding & first 5 minutes (64/64 tests) (8804cee)
- **R8-MS4**: Professional setup sheet generation — 3 formats (73/73 tests) (9b4840f)
- **R8-MS5**: Conversational memory & context state machine (81/81 tests) (a74f9c9)
- **R8-MS6**: 12 user workflow skills with persona adaptation (200/200 tests) (5a03424)
- **R8-MS7**: 10 user assistance skills with physics explanations (223/223 tests) (cf05463)

### Test Count: 1,147 tests across 8 milestones
### New Engines: IntentDecomposition, PersonaFormatter, WorkflowChain, Onboarding, SetupSheet, ConversationalMemory + 22 skills
