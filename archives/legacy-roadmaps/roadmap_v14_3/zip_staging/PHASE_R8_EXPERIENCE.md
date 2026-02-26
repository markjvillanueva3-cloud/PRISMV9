# PHASE R8: USER EXPERIENCE & INTENT ENGINE
## From Tool Collection to Intelligence Platform — The Layer That Makes Users Care
## v14.2 | Prerequisites: R3 (actions live), R7 (intelligence features)
# v14.2: Added MS6 (12 User Workflow Skills) and MS7 (10 User Assistance Skills) from
#   PRISM_SUPERPOWERS_COMPLETE_ROADMAP.md Track B — Gap 2. These are the guided workflows
#   that make PRISM usable by Dave persona (20-year machinist, 10-second patience).
#   Without them, the intent engine has nothing to route to.

---

## PHASE OBJECTIVE

R1-R7 build the engine. R8 builds the **experience**. Without R8, PRISM is a collection of
37 engines and 368 actions that require expert knowledge to invoke. With R8, a machinist
says one sentence and receives a complete, actionable manufacturing plan.

R8 solves three problems:
1. **Intent decomposition**: Natural language → ordered chain of dependent MCP calls
2. **Persona-adaptive responses**: Same query, different depth for different users
3. **Workflow orchestration**: Pre-built multi-action chains for common manufacturing scenarios

**Success metric**: A first-time user with zero PRISM knowledge can get a useful
manufacturing recommendation within 60 seconds of their first message.

---

## THE THREE USERS

Every design decision in R8 must serve at least one of these personas.

### PERSONA 1: DAVE — The Shop Floor Machinist
```
CONTEXT:    Standing at the machine. Grease on hands. Phone in pocket.
EXPERIENCE: 20 years turning handles. Knows his machines cold.
            Doesn't trust computers. Will abandon anything that wastes his time.
NEEDS:      Fast parameters. Imperial units by default. Setup sheets he can tape to the machine.
            Machine-specific answers — "what should I run THIS tool on THIS machine?"
ANTI-NEEDS: Pareto fronts. Uncertainty quantification. Anything that sounds academic.
PATIENCE:   ~10 seconds. If the answer isn't useful by then, he's back to his handbook.
QUERY STYLE: "What speed should I run 4140 with a half-inch endmill?"
             "I'm getting chatter on my Haas, what do I do?"
             "Can I run this Inconel part on my VF-2?"
RESPONSE:   Plain English. Imperial + metric in parentheses. Short. Actionable.
            "Run at 3,200 RPM (250 SFM), feed 19.2 IPM (0.003 IPT), 0.100" DOC.
             Flood coolant. If you get chatter, drop to 2,800 RPM."
```

### PERSONA 2: SARAH — The CNC Programmer
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

### PERSONA 3: MIKE — The Shop Owner / Production Manager
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

## MS0: INTENT DECOMPOSITION ENGINE
### Sessions: 2 | Effort: XL | Prerequisites: R3 (all campaign actions live)

### The Problem

User says: "I need to rough out a 4-inch deep pocket in Inconel 718 on my DMU 50,
it's going in a turbine so surface finish matters, and I only have a 1/2 inch endmill."

This single sentence requires:
1. material_get("Inconel 718") → material properties
2. machine_get("DMU 50") → machine capabilities, max RPM, power
3. tool_lookup("0.5 inch endmill") → tool geometry, grade, coating
4. speed_feed_calc(material + tool) → base cutting parameters
5. toolpath_strategy_select("pocket", material, depth=4") → roughing strategy
6. surface_integrity_predict(material + params) → Ra, residual stress (turbine!)
7. chatter_predict(machine + tool + params) → stability check
8. process_cost(params + strategy) → time and cost estimate
9. setup_sheet(all of the above) → printable output

Current state: The user (or Claude) must call each action individually, understand the
dependency order, and manually pipe outputs into inputs. This works for engineers who
read the roadmap. It doesn't work for Dave.

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
      surface_finish?: string;   // "surface finish matters" → Ra ≤ 1.6
      application?: string;      // "turbine" → aerospace requirements
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
  depends_on: string[];          // ["step_1", "step_2"] — must complete first
  output_mapping: {              // How to pipe this step's output to later steps
    field: string;               // "cutting_speed_max"
    target_step: string;         // "step_4"
    target_input: string;        // "speed_limit"
  }[];
  required: boolean;             // Can we skip this if it fails?
  estimated_tokens: number;      // Budget planning
}
```

### Entity Extraction Rules

The engine must handle the wild variability of machinist language:

```
MATERIAL PATTERNS:
  "4140"                    → AISI 4140
  "forty-one forty"        → AISI 4140
  "stainless"              → prompt: "which stainless? 304, 316, 17-4PH?"
  "Inconel"                → prompt: "718, 625, or other?"
  "mild steel"             → AISI 1018
  "tool steel"             → prompt: "A2, D2, M2, S7, H13?"
  "aluminum"               → prompt: "6061, 7075, 2024?"
  "that nickel alloy"      → check session history for recent Inconel/Hastelloy/Monel

TOOL PATTERNS:
  "half inch endmill"      → Ø12.7mm (0.500") end mill
  "1/2 EM"                 → same
  "three-flute"            → 3 flutes, infer type from context
  "bull nose"              → corner radius end mill
  "my favorite rougher"    → check user profile / past jobs
  "the sandvik one"        → search tools filtered by manufacturer=Sandvik

MACHINE PATTERNS:
  "my Haas"                → check user profile for Haas machines
  "the DMU"                → DMG Mori DMU series, prompt for specific model if needed
  "the big Mazak"          → check user profile, or prompt
  "five-axis"              → filter machines by capability
  "the lathe"              → turning center, prompt for model

OPERATION PATTERNS:
  "rough out"              → roughing operation
  "finish"                 → finishing pass, implies tighter Ra target
  "hog it out"             → aggressive roughing, high MRR priority
  "clean up"               → finishing/semi-finishing
  "put a thread in it"     → threading operation
  "drill and tap"          → hole making + threading sequence
  "profile the outside"    → contour milling

CONSTRAINT PATTERNS:
  "surface finish matters" → Ra ≤ 1.6μm (unless specified)
  "aerospace"              → AS9100 requirements, surface integrity check
  "medical"                → ISO 13485, biocompatible materials check
  "tight tolerance"        → ±0.001" (0.025mm) unless specified
  "prototype"              → batch_size=1, optimize for flexibility not speed
  "production run"         → optimize for cycle time and tool life
  "cheap"                  → optimize for cost
  "fast"                   → optimize for cycle time
```

### Ambiguity Resolution Strategy

When the engine can't fully decompose the intent:

**LEVEL 1 — High confidence (≥0.85)**: Execute immediately, explain what you're doing.
"I'm calculating parameters for roughing a pocket in Inconel 718 on your DMU 50 with
a 1/2" 4-flute carbide endmill. Here's the plan..."

**LEVEL 2 — Medium confidence (0.5-0.85)**: State assumptions, ask ONE clarifying question.
"I'll plan roughing parameters for 4140 steel. Quick question: what machine are you on?
That'll let me check power limits and give you machine-specific RPM."

**LEVEL 3 — Low confidence (<0.5)**: Ask targeted questions, max 3.
"I want to help you plan this job. A few quick details would help:
• What material? (e.g., 4140, 316 stainless, Inconel 718)
• What machine? (e.g., Haas VF-2, DMU 50)
• Roughing, finishing, or full plan?"

**NEVER**: Ask more than 3 questions. NEVER ask for information you can infer or default.
NEVER make the user feel interrogated. When in doubt, assume the most common case,
calculate, and note the assumption.

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
          // Required step failed — can we degrade gracefully?
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

### Graceful Degradation Rules

When a step in the chain fails, the system degrades rather than stops:

| Failed Step | Degradation | User Message |
|-------------|-------------|--------------|
| material_get | Use generic ISO group properties | "I don't have exact data for that alloy. Using P-group steel properties — verify these before production." |
| machine_get | Skip power/torque limits, warn user | "I don't have your machine's specs, so these parameters assume adequate power. Check your spindle load." |
| tool_lookup | Use generic geometry from user description | "Using generic 4-flute carbide geometry. For better accuracy, tell me the manufacturer and catalog number." |
| chatter_predict | Skip, note as unchecked | "I didn't check for chatter stability. If you get vibration, try dropping RPM by 15%." |
| surface_integrity | Skip, warn for aerospace | "⚠️ Surface integrity not verified. For turbine parts, confirm residual stress with your quality team." |
| process_cost | Omit cost from output | "Cost estimate unavailable — I need tool cost data to calculate this." |

---

## MS1: PERSONA-ADAPTIVE RESPONSE FORMATTING
### Sessions: 1 | Effort: M | Prerequisites: MS0 (intent decomposition)

### The Problem

The same calculation result should be presented completely differently to Dave, Sarah, and Mike.

### Solution: ResponseFormatterEngine

**New file**: `src/engines/ResponseFormatterEngine.ts`

#### Dave's Format (Machinist)
```
SETUP SHEET — Pocket Roughing, Inconel 718
Machine: DMU 50 | Tool: 1/2" 4-flute carbide (AlTiN coated)

Speed:   1,200 RPM (155 SFM)
Feed:    7.2 IPM (0.0015 IPT)
DOC:     0.040" axial
WOC:     0.125" radial (25% of diameter)
Strategy: Trochoidal / Dynamic Milling

Coolant: Through-tool, HIGH PRESSURE (1000+ PSI if available)
         ⚠️ Flood is NOT adequate for Inconel pocketing

Tool Life: ~25 minutes at these parameters
Cycle Time: ~18 minutes for this pocket

NOTES:
• Listen for chatter — if you hear it, drop to 1,050 RPM
• Inconel work-hardens. Do NOT dwell or rub. Keep the tool moving.
• Replace tool at 25 min regardless of appearance. Inconel hides wear.
```

#### Sarah's Format (Programmer)
```
JOB PLAN: 4" Deep Pocket — Inconel 718 — DMU 50

STRATEGY ANALYSIS
┌─────────────────┬────────────┬────────────┬──────────────┐
│ Strategy        │ Cycle Time │ Tool Life  │ Risk Level   │
├─────────────────┼────────────┼────────────┼──────────────┤
│ Trochoidal      │ 18.2 min   │ 25 min     │ LOW          │
│ Adaptive Clear  │ 15.8 min   │ 22 min     │ MEDIUM       │
│ Plunge Rough    │ 21.4 min   │ 30 min     │ LOW          │
│ Conventional    │ 14.1 min   │ 12 min     │ HIGH ⚠️      │
└─────────────────┴────────────┴────────────┴──────────────┘

RECOMMENDED: Trochoidal (best tool life / risk ratio)

ROUGHING PARAMETERS
Vc = 47 m/min (155 SFM) | fz = 0.038 mm/tooth (0.0015 IPT)
ap = 1.0 mm (0.040") | ae = 3.2 mm (0.125") | 25% radial engagement

CHATTER ANALYSIS
Stability margin: 0.72 (STABLE)
If borderline: RPM sweet spots at 1,050 and 1,380 RPM
Tool first natural frequency: ~2,400 Hz at 60mm overhang

SURFACE INTEGRITY (Aerospace Application)
Predicted Ra: 2.1 μm (finishing pass required for turbine spec)
Residual stress: -180 MPa (compressive — FAVORABLE)
White layer risk: LOW at Vc=47 m/min
Recommendation: Add finishing pass at Vc=35, fz=0.05, ap=0.2 for Ra ≤ 0.8

FINISHING PARAMETERS
Vc = 35 m/min | fz = 0.05 mm/tooth | ap = 0.2 mm | ae = full width
Strategy: Contour with 0.1mm stepover for floor
Predicted Ra: 0.6 μm ✓

CONTROLLER NOTES (Siemens 840D on DMU 50)
CYCLE832(0.01) — High Speed Setting, tolerance 0.01mm
COMPCAD — Use spline interpolation for trochoidal path
FFWON — Feed forward ON for better path accuracy
```

#### Mike's Format (Manager)
```
COST ANALYSIS: Inconel 718 Pocket — DMU 50

Per-Part Cost Breakdown
  Machine time: 22.4 min × $185/hr = $69.07
  Tool cost: 1 insert set per 1.4 parts = $28.57/part
  Programming: 2 hrs ÷ batch of 50 = $7.40/part
  Setup: 45 min ÷ batch of 50 = $2.78/part
  ─────────────────────────────────────
  TOTAL: $107.82/part (at 50 quantity)
  TOTAL: $98.14/part (at 200 quantity — amortized programming)

Quote Recommendation: $135-145/part (25-35% margin)

Alternative: Outsource vs In-House
  Your shop rate: $107.82/part
  Typical Inconel job shop: $95-120/part
  Decision: Competitive to run in-house IF DMU 50 has capacity
  
Risk Factor: Inconel is unforgiving. Budget 5% scrap rate for first batch.
```

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
  // Also check: if user is on mobile → likely machinist (at machine)
  //             if query is long/detailed → likely programmer
  //             if query mentions money → likely manager
}
```

### Unit Preference System

```
DEFAULT: Detect from user's locale and query language
  Imperial indicators: "inch", "thou", "sfm", "ipm", "fpm", psi
  Metric indicators: "mm", "m/min", "mm/rev", "μm", "bar", "MPa"

DISPLAY RULE: Show primary unit system + secondary in parentheses
  Dave (imperial): "3,200 RPM (250 SFM), feed 19.2 IPM (0.003 IPT)"
  Sarah (metric):  "Vc = 47 m/min (155 SFM), fz = 0.038 mm/tooth (0.0015 IPT)"

OVERRIDE: User can say "give me metric" and all future responses switch.
Persist preference in MemoryGraph per user.
```

---

## MS2: PRE-BUILT WORKFLOW CHAINS
### Sessions: 1 | Effort: L | Prerequisites: MS0 (intent decomposition), R3 + R7 (actions)

### The 10 Workflows That Cover 90% of Manufacturing Questions

Each workflow is a pre-built execution plan that the IntentDecompositionEngine can match
against before attempting free-form decomposition. These are the "happy paths" that
should be lightning-fast.

#### WORKFLOW 1: "PLAN THIS JOB" (Full Manufacturing Plan)
**Trigger phrases**: "plan this job", "how should I make this", "set up for", "machining plan"
**Persona**: All (formatted differently)
```
Chain: material_get → machine_get → tool_recommend → speed_feed_calc →
       toolpath_strategy_select → chatter_predict → surface_integrity_predict →
       process_cost → setup_sheet_generate
Steps: 9 | Estimated time: 3-5 seconds | Estimated tokens: ~8K
```

#### WORKFLOW 2: "QUICK PARAMETERS" (Speed & Feed Only)
**Trigger phrases**: "what speed", "what feed", "parameters for", "rpm for"
**Persona**: Machinist (Dave)
```
Chain: material_get → speed_feed_calc
Steps: 2 | Estimated time: <1 second | Estimated tokens: ~2K
Output: Speed, feed, DOC, WOC, coolant recommendation. Nothing else.
```

#### WORKFLOW 3: "COMPARE STRATEGIES" (Toolpath Decision)
**Trigger phrases**: "compare", "which strategy", "trochoidal vs", "best approach for"
**Persona**: Programmer (Sarah)
```
Chain: material_get → machine_get → [for each strategy: speed_feed_calc →
       toolpath_strategy_select → process_cost] → comparison_table
Steps: 4-8 depending on strategies compared | Estimated tokens: ~6K
```

#### WORKFLOW 4: "QUOTE THIS PART" (Cost Estimation)
**Trigger phrases**: "quote", "rfq", "cost to make", "price this", "how much"
**Persona**: Manager (Mike)
```
Chain: material_get → [for each operation: tool_recommend → speed_feed_calc →
       process_cost] → shop_schedule (if fleet specified) → quote_summary
Steps: 5-12 | Estimated tokens: ~10K
Output: Per-part cost breakdown, recommended quote price, margin analysis
```

#### WORKFLOW 5: "FIX MY CHATTER" (Diagnostic)
**Trigger phrases**: "getting chatter", "vibration", "squealing", "tool is chattering"
**Persona**: Machinist (Dave), Programmer (Sarah)
```
Chain: [extract current params from user] → chatter_predict →
       [if unstable: find stable RPM pockets] → [suggest mitigation]
Steps: 3-4 | Estimated tokens: ~4K
Output: Diagnosis, stable RPM alternatives, parameter adjustments, tool changes to consider
```

#### WORKFLOW 6: "WHAT TOOL SHOULD I USE?" (Tool Selection)
**Trigger phrases**: "what tool", "tool for", "which endmill", "recommend a drill"
**Persona**: All
```
Chain: material_get → tool_search(material + operation + constraints) →
       [for top 3 tools: speed_feed_calc] → comparison_with_rationale
Steps: 5-7 | Estimated tokens: ~5K
Output: Top 3 tools with parameters, pros/cons, cost comparison
```

#### WORKFLOW 7: "CAN MY MACHINE DO THIS?" (Capability Check)
**Trigger phrases**: "can I run", "will my machine", "is my machine capable", "enough power"
**Persona**: Machinist (Dave), Programmer (Sarah)
```
Chain: material_get → machine_get → speed_feed_calc → [check: power required vs
       available, torque required vs available, RPM required vs max, travel vs envelope]
Steps: 4 | Estimated tokens: ~3K
Output: Yes/no with specific limiting factor, alternative approaches if no
```

#### WORKFLOW 8: "SCHEDULE MY SHOP" (Fleet Optimization)
**Trigger phrases**: "schedule", "which machine for", "assign jobs", "utilization"
**Persona**: Manager (Mike)
```
Chain: [load all jobs] → [load all machines] → shop_schedule →
       utilization_report → bottleneck_analysis
Steps: 4-5 | Estimated tokens: ~8K
Output: Machine assignments, timeline, utilization %, bottleneck warnings
```

#### WORKFLOW 9: "DIAGNOSE THIS ALARM" (Troubleshooting)
**Trigger phrases**: "alarm", "error code", "machine says", "what does alarm X mean"
**Persona**: Machinist (Dave)
```
Chain: alarm_decode(code + controller) → root_cause_analysis →
       recovery_procedure → prevention_tips
Steps: 3-4 | Estimated tokens: ~3K
Output: Plain English alarm meaning, step-by-step fix, how to prevent recurrence
```

#### WORKFLOW 10: "TEACH ME" (Educational)
**Trigger phrases**: "why", "explain", "how does", "what's the difference between"
**Persona**: All (depth varies by persona)
```
Chain: knowledge_query → [optional: relevant_calculation_example] →
       explanation_with_context
Steps: 2-3 | Estimated tokens: ~4K
Output: Explanation at appropriate depth, with practical manufacturing example
```

---

## MS3: ONBOARDING & FIRST 5 MINUTES
### Sessions: 1 | Effort: S | Prerequisites: MS0-MS2

### The First Interaction

When a user first encounters PRISM (through Claude with PRISM MCP tools connected),
the experience should immediately demonstrate value. No tutorials. No "let me explain
what I can do." Just solve their problem, then reveal depth.

**SCENARIO**: User says "hi" or asks a generic question.

```
PRISM detects: New user, no profile, no past jobs.

Response: "Hey! I'm PRISM — I help with CNC machining. Give me a material and an
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

"By the way — if you tell me which machine you're on, I can check power limits
and chatter stability. And if you're doing multiple operations, I can plan the
whole job and generate a setup sheet."
```

### Progressive Disclosure Levels

```
LEVEL 0 — INSTANT VALUE (first query)
  Speed, feed, DOC. Nothing else. Prove competence immediately.

LEVEL 1 — REVEAL DEPTH (second/third query)
  "I can also check chatter stability, compare toolpath strategies, and
   estimate cycle time. Want me to go deeper on this job?"

LEVEL 2 — SHOW INTELLIGENCE (after ~5 queries)
  "Based on the jobs you've been asking about, you're doing a lot of Inconel
   work on 5-axis machines. Want me to create an optimized parameter set for
   your most common material/machine combinations?"

LEVEL 3 — OFFER INTEGRATION (after ~10 queries)
  "I notice you're manually entering parameters that I could look up faster
   if I knew your machine and tool inventory. Want to set up your shop profile?"

LEVEL 4 — ENABLE LEARNING (after ~20 queries)
  "If you tell me how these parameters actually performed — tool life, surface
   finish, any issues — I can learn from your experience and give you even
   better recommendations over time."
```

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

## MS4: SETUP SHEET GENERATION
### Sessions: 1 | Effort: M | Prerequisites: MS1 (formatting), R3 (job_plan data)

### Objective

Generate a **printable, professional setup sheet** that a machinist can tape to the machine.
This is the most tangible output PRISM can produce — a physical artifact that proves value.

### Setup Sheet Template

```
┌──────────────────────────────────────────────────────────────┐
│  PRISM SETUP SHEET                      Job: [auto-generated]│
│  ──────────────────────────────────────────────────────────── │
│  Part: [description]           Material: [material + spec]   │
│  Machine: [name]               Date: [today]                 │
│  Programmer: [user]            Program: [if provided]        │
│                                                              │
│  ═══════════════════════════════════════════════════════════  │
│                                                              │
│  OPERATION 1: [name]                                         │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Tool: T01 — [description]            Holder: [type]    │  │
│  │ Speed: [RPM] ([SFM/SMM])             Stick-out: [dim]  │  │
│  │ Feed:  [IPM/MMPM] ([IPT/MMPT])       Coolant: [type]   │  │
│  │ DOC:   [depth]                       WOC: [width]      │  │
│  │ Strategy: [name]                     Passes: [count]    │  │
│  │                                                         │  │
│  │ ⚠️ NOTES: [safety notes, chatter warnings, etc.]       │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  OPERATION 2: [name]                                         │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ [same format]                                          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ═══════════════════════════════════════════════════════════  │
│  TOOL LIST                                                   │
│  T01: [tool] — used in Op 1, 3     │ Est. life: [min]       │
│  T02: [tool] — used in Op 2        │ Est. life: [min]       │
│  T03: [tool] — used in Op 4, 5     │ Est. life: [min]       │
│                                                              │
│  ═══════════════════════════════════════════════════════════  │
│  SUMMARY                                                     │
│  Total cycle time: [min]           Tool cost: [$]            │
│  Estimated part cost: [$]          Setup time: [min]         │
│                                                              │
│  Generated by PRISM Manufacturing Intelligence               │
│  S(x) = [safety score] | Ω = [quality score]                │
└──────────────────────────────────────────────────────────────┘
```

Output formats:
- **Markdown** (for chat display)
- **PDF** (for printing — professional layout with company logo placeholder)
- **JSON** (for CAM integration — structured data for post-processor consumption)

---

## MS5: CONVERSATIONAL MEMORY & CONTEXT
### Sessions: 1 | Effort: M | Prerequisites: MemoryGraphEngine (exists), MS0

### Objective

PRISM should remember what the user was working on across sessions. Not just parameters
they asked about, but the *job context*: the part, the material, the machine, the problems
they encountered.

### Conversational State Machine

```
States:
  IDLE         → User hasn't started a job context
  EXPLORING    → User is asking about materials, tools, strategies (browsing)
  PLANNING     → User is building a specific job plan (committed to a job)
  EXECUTING    → User is at the machine running the job (real-time support)
  REVIEWING    → User is reporting results, problems, or outcomes

Transitions:
  IDLE → EXPLORING:     Any manufacturing query
  EXPLORING → PLANNING: User commits to a specific part/material/machine
  PLANNING → EXECUTING: User says "I'm running it now" or "at the machine"
  EXECUTING → REVIEWING: User reports results or session ends
  REVIEWING → IDLE:     Outcomes recorded

State affects response:
  EXPLORING: Broad, comparative, educational
  PLANNING:  Specific, detailed, actionable
  EXECUTING: Terse, immediate, safety-first
  REVIEWING: Analytical, improvement-focused
```

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
PRISM queries MemoryGraph → finds the job context → resumes with full knowledge.

---

## PHASE GATE: R8 → COMPLETE

### Definition of Done
- [ ] New user can get useful parameters within 60 seconds
- [ ] Intent decomposition handles all 10 workflow triggers correctly
- [ ] Persona detection accuracy ≥ 80% on test corpus
- [ ] All 3 personas receive appropriately formatted responses
- [ ] Setup sheets generate correctly for multi-operation jobs
- [ ] Unit preference persists across sessions
- [ ] Cross-session job context recovery works for ≥ 3-day gaps
- [ ] Graceful degradation tested for all failure modes in chain
- [ ] Zero cases where user must know MCP action names to get results

### The 60-Second Test
Have 5 machinists who have never seen PRISM type their first question.
All 5 must receive a useful, actionable answer within 60 seconds.
If any fail, R8 is not complete.

---

## MS6: USER WORKFLOW SKILLS (v14.2 — Gap 2, Superpowers Track B)
### Sessions: 1-2 | Effort: H | Prerequisites: R3 (actions), R7 (physics), MS0-MS2 (intent engine)
### Source: PRISM_SUPERPOWERS_COMPLETE_ROADMAP.md §SP-4

**WHY:** R8-MS0 builds the intent engine. R8-MS2 builds workflow chains. But what does
the engine ROUTE TO? These 12 skills are the guided workflows that take Dave from
"I need to machine this" to "here are your parameters with safety validation."

### The 12 User Workflow Skills
```
 1. material-guide      — "What material is this?" → identify → properties → machining approach
 2. speed-feed-wizard   — "What speed and feed?" → guided parameter selection + safety
 3. tool-select         — "What tool should I use?" → material+operation → tool recommendation
 4. machine-setup       — "Setting up my Haas" → machine-specific setup guide + controller hints
 5. toolpath-advisor    — "Best strategy for pocket?" → strategy recommendation + comparison
 6. troubleshoot        — "Getting chatter" → diagnosis → root cause → parameter adjustment
 7. quality-analysis    — "Parts out of tolerance" → cause analysis → parameter correction
 8. cost-optimization   — "Reduce cycle time" → optimization → cost comparison
 9. post-debug          — "G-code looks wrong" → controller-specific validation
10. fixture-selection   — "How to hold this part?" → fixture recommendation + clamping analysis
11. cycle-time-optimize — "How long will this take?" → estimate → optimization suggestions
12. quoting-assistance  — "Cost per part?" → full cost breakdown → quote recommendation
```

Each skill = 1 SKILL.md file with: TRIGGER_PATTERNS, REQUIRED_ACTIONS, DATA_DEPENDENCIES,
CONVERSATION_FLOW, FALLBACK_BEHAVIOR, PERSONA_ADAPTATION (Dave/Sarah/Alex detail levels).

---

## MS7: USER ASSISTANCE SKILLS (v14.2 — Gap 2, Superpowers Track B)
### Sessions: 1 | Effort: M | Prerequisites: MS6 complete
### Source: PRISM_SUPERPOWERS_COMPLETE_ROADMAP.md §SP-5

**WHY:** Workflow skills DO the work. Assistance skills EXPLAIN the work. Dave doesn't
trust a black box. He needs to see WHY PRISM recommends those parameters.

### The 10 User Assistance Skills
```
 1. explain-physics        — "WHY this speed?" → plain-language physics explanation
 2. explain-recommendations — "WHY this tool?" → decision rationale + alternatives considered
 3. confidence-communication — "How sure are you?" → uncertainty bounds + data quality
 4. alternative-explorer    — "What else could work?" → runner-up options with tradeoffs
 5. feedback-integration    — "That didn't work" → record outcome → adjust future recs
 6. safety-verification     — "Is this safe?" → S(x) score + risk factors + what could go wrong
 7. documentation-setup     — "Give me a setup sheet" → printable operator document
 8. decision-flow-diagrams  — "Walk me through this" → visual decision tree
 9. anti-machining-mistakes — "Common mistakes?" → proactive warnings per material+operation
10. onboarding              — "I'm new to PRISM" → progressive disclosure tour
```

---

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

## R8 COMPANION ASSETS (v14.2)

```
The 22 skills (MS6+MS7) ARE the companion assets for R8.
Each skill built AFTER features it depends on.

ADDITIONAL HOOKS (2 new):
  skill_routing_fallback    — warning, logs when intent engine can't match a skill
  workflow_completion_rate   — telemetry, tracks workflow completion vs abandonment
```

---

*R8 is where PRISM stops being a tool and starts being a colleague.
The engine room is built. R8 puts a bridge on top of it with windows,
a wheel, and a captain who speaks the crew's language.*
