---
name: prism-sp-brainstorm
description: |
  Chunked approval methodology for PRISM manufacturing development.
  Use when: brainstorm, design, plan feature, think through, explore options.
  7-step process: PAUSE, UNDERSTAND, SCOPE(approval), APPROACH(approval),
  DETAILS(approval), ALTERNATIVES, CONFIRM. Prevents premature implementation.
  Requires Level 5 evidence (user approval at each chunk). Hands off to
  prism-sp-planning after approval. Part of SP.1 Core Development Workflow.
---

# PRISM-SP-BRAINSTORM
## Chunked Approval for Manufacturing Design Decisions
### Version 1.1 | Development Workflow

---

# SECTION 1: OVERVIEW

## 1.1 Purpose

Systematic methodology for validating PRISM design decisions BEFORE implementation.
Uses chunked approval to prevent scope creep, with mandatory alternative exploration
to ensure the best manufacturing solution is selected. Prevents costly rework by
getting alignment on material strategies, calculation approaches, and tool selection
before writing code.

## 1.2 When to Use

**Triggers:**
- "brainstorm this", "let's design...", "plan this feature", "think through..."
- Creating new PRISM registries, calculators, or material databases
- Complex tasks (>30 min estimated) with ambiguous requirements
- Before any irreversible change to PRISM data structures

**NOT for:**
- Simple factual questions or clear unambiguous tasks
- Continuing already-approved work
- Emergency fixes (use prism-sp-debugging instead)

## 1.3 Outputs

- Approved Scope Definition
- Approved Technical Approach
- Approved Implementation Details
- List of Alternatives Considered
- Ready for prism-sp-planning handoff

---

# SECTION 2: THE 7-STEP PROCESS

## 2.1 Quick Reference Checklist

```
Step 1: PAUSE      - Do NOT implement anything yet
Step 2: UNDERSTAND - Clarify the actual manufacturing goal
Step 3: SCOPE      - Present what will/won't be done -> Get approval
Step 4: APPROACH   - Present how it will be done -> Get approval
Step 5: DETAILS    - Present specifics -> Get approval
Step 6: ALTERNATIVES - Explore at least 2 other options
Step 7: CONFIRM    - Get final go-ahead, hand off to prism-sp-planning
```

## 2.2 Step Details

### Step 1: PAUSE

Stop before writing code, creating files, or making changes.
If you haven't confirmed what the user wants, explored alternatives,
and received approval -- continue with brainstorm process.

### Step 2: UNDERSTAND

Restate the request. Identify the REAL goal. Uncover constraints.

- IF goal is clear -> Proceed to Chunk 1
- IF goal is unclear -> Ask 1-2 focused questions, then summarize
- IF user wants to skip -> Compress to single quick confirmation

### Step 3: CHUNK 1 - SCOPE (requires approval)

Present WHAT will be done. Explicitly state inclusions AND exclusions.
Provide estimated size/effort.

**CRITICAL: Do NOT proceed to Chunk 2 without Chunk 1 approval.**

### Step 4: CHUNK 2 - APPROACH (requires approval)

Present HOW it will be done. Explain key decisions, trade-offs,
and which PRISM engines/registries are involved.

**CRITICAL: Do NOT proceed to Chunk 3 without Chunk 2 approval.**

### Step 5: CHUNK 3 - DETAILS (requires approval)

Present specific files, structures, implementation order.

**CRITICAL: Do NOT start implementation without Chunk 3 approval.**

### Step 6: ALTERNATIVES

Identify at least 2 alternative approaches with pros/cons.
Explain why the chosen approach is preferred.

### Step 7: CONFIRM

Summarize the approved design. Get final go-ahead.
Transition to prism-sp-planning for task breakdown.

---

# SECTION 3: MANUFACTURING EXAMPLES

## 3.1 Materials Database Enhancement (Full Happy Path)

**Context:** User wants to add thermal properties to existing PRISM materials database.

**UNDERSTAND:** "What specific properties? Any constraints?" -> User wants thermal
properties on all 100 materials, flexible timeline.

**CHUNK 1 - SCOPE** (user approved: "Yes, that looks right"):
- Create: Enhanced material schema with thermal section, update 100 materials, validation
- NOT included: New materials, UI changes, historical migration
- Effort: 1 schema file + 100 material updates, ~45-60 min

**CHUNK 2 - APPROACH** (user approved: "Makes sense, go ahead"):
- Strategy: Extend 127-parameter template with thermal subsection
- Sources: ASM Handbook, MatWeb for literature values
- Batch processing: Groups of 10 for checkpointing
- Trade-off: Thoroughness over speed

**CHUNK 3 - DETAILS** (user approved: "Yes, start with the template"):
- Files: `PRISM_MATERIAL_TEMPLATE.js` (schema), `materials/enhanced/*.json` (data)
- Properties: thermal conductivity (W/m-K), specific heat (J/kg-K),
  thermal expansion (um/m-K), melting point (C), max service temp (C)
- Order: template schema -> batch material updates -> validate all

**ALTERNATIVES:**
- Option A (Chosen): Extend existing template -- backward compatible with PRISM calculators
- Option B: Separate thermal database -- rejected, adds cross_query complexity

**CONFIRM:** "Scope: thermal properties on 100 materials. First step: update template."

---

## 3.2 Ambiguous Manufacturing Request (Clarification Needed)

**Context:** User says "Fix the calculation problem" -- vague, needs clarification.

**UNDERSTAND (narrowing):**
1. "Which calculation?" -> speed/feed calculator
2. "What's wrong?" -> too aggressive for aluminum, causing tool breakage
3. "Which alloys?" -> mainly 6xxx and 7xxx series

**Outcome:** "Fix the calculation problem" -> "Reduce speed/feed aggressiveness
for 6xxx/7xxx aluminum alloys in prism_calc speed_feed action"

**SCOPE derived from clarification:**
- Change: Safety factors for 6xxx Al (6061, 6082) and 7xxx Al (7050, 7075)
- Add: Material-group-specific derating in speed_feed action
- NOT included: Other material groups, tool life calc, cutting force calc
- PRISM components: prism_calc speed_feed, prism_data material_get for Al properties

---

## 3.3 Mazak Post Processor (Preventing Wrong Assumptions)

**Context:** User says "Create a post processor for Mazak"

WRONG: Immediately creates 500 lines for wrong machine model. All work wasted.

RIGHT: "Before I create the Mazak post processor, let me confirm:
Which model (Integrex, Quick Turn, VCN)? Which controller (Mazatrol, FANUC)?
What operations (turning, milling, multi-axis)? This determines which
`prism_data machine_get` entry we reference and which `prism_calc gcode_snippet`
templates apply."

**Why this matters:** Mazatrol vs FANUC = completely different G-code dialects.
Integrex (multi-tasking) vs Quick Turn (lathe) = different toolpath strategies.
Wrong assumptions = entire post processor is useless.

---

## 3.4 Cutting Strategy Trade-off (Manufacturing Alternatives)

**Context:** User needs to machine a deep pocket in Inconel 718.

```
Claude: "## ALTERNATIVES CONSIDERED

### Option A (Chosen): Trochoidal milling with chip thinning compensation
- Uses prism_calc trochoidal + chip_thinning actions
- Pros: Constant tool engagement, manageable heat, longer tool life
- Cons: Longer cycle time (~20% more than conventional)
- Why chosen: Inconel work-hardens; constant engagement prevents
  alternating loads that accelerate tool failure

### Option B: Adaptive clearing (HSM)
- Uses prism_calc hsm action
- Pros: Faster material removal, good chip evacuation
- Cons: Variable engagement angles stress tool at corners
- Why not: Corner engagement spikes in deep pockets cause
  premature tool failure in Inconel

### Option C: Conventional step-down roughing
- Uses prism_calc multi_pass action
- Pros: Simple programming, predictable
- Cons: High radial forces, excessive heat in Inconel
- Why not: Fails the prism_safety check_chip_load_limits
  and predict_tool_breakage thresholds

### PRISM Validation:
- prism_safety get_safe_cutting_limits confirms Option A parameters
- prism_calc tool_life predicts 45 min tool life (vs 12 min for Option C)
- prism_calc coolant_strategy recommends through-spindle coolant at 70 bar
```

---

## 3.5 Tool Selection with PRISM Data (Registry-Driven Alternatives)

**Context:** User needs to select end mills for titanium Ti-6Al-4V roughing.

```
Claude: "## ALTERNATIVES CONSIDERED

### Option A (Chosen): 4-flute variable helix carbide end mill
- prism_data tool_search: VHM end mills for titanium, 4-flute
- prism_calc speed_feed: Vc=45 m/min, fz=0.08 mm/tooth
- Pros: Variable helix reduces chatter in Ti-6Al-4V
- Cons: Higher tool cost

### Option B: 5-flute high-feed end mill
- prism_data tool_recommend: high-feed geometry for titanium
- prism_calc chip_load: Thin chip at high feed, low ap
- Pros: Higher MRR potential
- Cons: Requires rigid setup; prism_calc stability analysis
  shows marginal stability at 3xD stick-out

### Option C: Indexable insert cutter
- prism_data tool_search: indexable, titanium grade inserts
- Pros: Lower cost per edge, handles interrupted cuts
- Cons: Minimum diameter 25mm, won't fit smaller pockets

### PRISM Validation:
- prism_calc deflection: Option A at 0.012mm (within 0.02mm limit)
- prism_calc stability: Option A stable, Option B marginal
- prism_safety calculate_tool_stress: All options within limits
- prism_data tool_compare: Option A vs B head-to-head confirms A
```

---

# SECTION 4: MANUFACTURING-SPECIFIC ANTI-PATTERN

## Implementing Before Understanding the Machine/Material Context

Manufacturing brainstorms MUST clarify the physical context before proposing
solutions. Unlike pure software, wrong assumptions about materials, machines,
or cutting conditions can mean:

- **Tool breakage** (wrong speeds for material hardness)
- **Part scrap** (wrong strategy for material behavior)
- **Machine damage** (exceeding spindle/axis limits)
- **Useless output** (post processor for wrong controller)

### Key Manufacturing Questions Before Any PRISM Implementation:

**For Material-Related Work:**
- Which material group? (ISO P/M/K/N/S/H)
- Specific alloy and condition? (e.g., 7075-T6 vs 7075-O)
- What properties matter? (machinability, thermal, mechanical?)
- Source registry: `prism_data material_get` or `material_search`

**For Machine-Related Work:**
- Which machine type? (3-axis, 5-axis, lathe, multi-tasking?)
- Which controller? (FANUC, Siemens, Mazatrol, Heidenhain?)
- Spindle specs? (max RPM, power curve, torque curve?)
- Source registry: `prism_data machine_get` or `machine_capabilities`

**For Tooling-Related Work:**
- What operation? (roughing, finishing, drilling, threading?)
- What constraints? (reach, diameter, holder clearance?)
- Source registry: `prism_data tool_search` or `tool_recommend`

**For Calculation Work:**
- Which physics model? (Kienzle, Taylor, Johnson-Cook?)
- What validation? (`prism_validate` actions for model params)
- Safety checks? (`prism_safety` actions for limits)

---

# SECTION 5: SCOPE MANAGEMENT FOR PRISM

## 5.1 User Changes Mind Mid-Brainstorm

**Scenario:** User approves materials scope, then during approach wants to
also include the tool database.

```
Claude: [Presents Chunk 2: Approach]
User: "Actually, can we also include the tool database?"

Claude: "Good thinking - that would make this more comprehensive.
Let me update the scope:

## UPDATED CHUNK 1: SCOPE (v2)

### Now Including:
- Materials database thermal properties [original]
- Tool database thermal ratings [new]

### PRISM Components Now Affected:
- Material registry (prism_data material_get/search)
- Tool registry (prism_data tool_get/search)
- Cross-query action (prism_data cross_query) needs thermal awareness

### Estimated Impact:
- Additional 50 tool entries to update
- Adds ~30 minutes to timeline

Does this updated scope work?"
```

## 5.2 Urgent Manufacturing Request

```
User: "I need this in 5 minutes for a demo!"

Claude: "Understood - urgent. Quick confirm:
- Creating: [X]
- Approach: [fastest reliable method]
- PRISM safety checks: [will run post-hoc]
- Ready in: ~3 minutes

Go?"
```

Even under urgency, never skip `prism_safety` checks for cutting parameters.
Run them post-hoc if needed, but always run them.

---

# SECTION 6: EVIDENCE & HANDOFF

## 6.1 Evidence Requirements

This skill requires **Level 5 Evidence** (User Acceptance):
- Chunk 1 (Scope) approved by user
- Chunk 2 (Approach) approved by user
- Chunk 3 (Details) approved by user
- At least 2 alternatives documented with pros/cons
- Final confirmation received

## 6.2 Evidence Documentation

```markdown
## BRAINSTORM EVIDENCE: [Task Name]

### Chunk Approvals
| Chunk | Presented | User Response | Approved |
|-------|-----------|---------------|----------|
| 1. Scope | Y | "[exact response]" | Y |
| 2. Approach | Y | "[exact response]" | Y |
| 3. Details | Y | "[exact response]" | Y |

### Alternatives Documented
- Option A (chosen): [name] - [reason]
- Option B: [name] - [why not]

### PRISM Components Validated
- Calculators used: [prism_calc actions]
- Safety checks: [prism_safety actions]
- Data sources: [prism_data actions]

### Final Go-Ahead
User: "[exact response]"
Status: APPROVED FOR IMPLEMENTATION
```

---

# SECTION 7: SKILL INTEGRATION

## 7.1 PRISM Skill Chain

```
[No prerequisites]
        |
        v
   BRAINSTORM (this skill)
        |
        v
  prism-sp-planning (task breakdown)
        |
        v
  prism-sp-execution (implementation)
        |
        v
  prism-sp-verification (quality gates)
```

## 7.2 Integration with PRISM Engines

| PRISM Engine | Use During Brainstorm | Example |
|---|---|---|
| prism_calc | Validate feasibility of cutting approaches | speed_feed, tool_life, stability |
| prism_data | Look up material/machine/tool constraints | material_get, machine_capabilities |
| prism_safety | Check proposed parameters against limits | check_chip_load_limits, predict_tool_breakage |
| prism_validate | Verify model parameters are valid | kienzle, taylor, johnson_cook |
| prism_toolpath | Select strategy for machining features | strategy_select, material_strategies |
| prism_thread | Validate threading approach | get_thread_specifications, calculate_tap_drill |

## 7.3 Expert Skill Consultation During Alternatives

When exploring manufacturing alternatives, consult domain-specific PRISM capabilities:

```
BRAINSTORM PROCESS
       |
       | "What are the options for machining this feature?"
       v
+-----------------------------------------------------------+
| PRISM Engines provide grounded alternatives:               |
| - prism_toolpath strategy_select: ranked strategies        |
| - prism_calc speed_feed: optimal parameters per strategy   |
| - prism_safety: which strategies pass safety checks        |
| - prism_data cross_query: material+operation+machine match |
+-----------------------------------------------------------+
       |
       | Options fed back to brainstorm with physics basis
       v
PRESENT ALTERNATIVES TO USER (with PRISM validation data)
```

## 7.4 Composition Examples

### New PRISM Calculator Feature
- Lead: prism-sp-brainstorm (design phase)
- Data: prism_data (material/machine constraints)
- Validation: prism_validate (model parameter ranges)
- Safety: prism_safety (output limit checks)
- Handoff: prism-sp-planning

### Toolpath Strategy Decision
- Lead: prism-sp-brainstorm
- Strategy: prism_toolpath strategy_select
- Physics: prism_calc (forces, deflection, stability)
- Safety: prism_safety (collision, tool stress)
- Handoff: prism-sp-planning

### Material Database Enhancement
- Lead: prism-sp-brainstorm
- Data: prism_data material_search (existing entries)
- Validation: prism_validate material (property ranges)
- Cross-check: prism_data cross_query (impact on calculations)
- Handoff: prism-sp-planning

---

# SECTION 8: QUICK REFERENCE CARD

```
PRISM-SP-BRAINSTORM - QUICK REFERENCE

TRIGGERS: brainstorm, design, plan feature, think through, explore

PROCESS:
  1. PAUSE        -> No code yet!
  2. UNDERSTAND   -> Clarify real manufacturing goal
  3. SCOPE        -> What (get approval)
  4. APPROACH     -> How (get approval)
  5. DETAILS      -> Specifics (get approval)
  6. ALTERNATIVES -> Document 2+ options with PRISM validation
  7. CONFIRM      -> Final go-ahead -> prism-sp-planning

MANUFACTURING CONTEXT (always clarify):
  - Material: group, alloy, condition
  - Machine: type, controller, spindle specs
  - Tooling: operation, constraints, holder
  - Physics: which model, which safety checks

PRISM ENGINES TO CONSULT:
  - prism_calc:     Feasibility of cutting approaches
  - prism_data:     Material/machine/tool constraints
  - prism_safety:   Parameter limit checks
  - prism_validate: Model parameter verification
  - prism_toolpath: Strategy selection

EVIDENCE: Level 5 (User Approval at each chunk)
NEXT SKILL: prism-sp-planning (after approval)
RESOURCE: F-PSI-001 selects optimal skills/agents/formulas
```

---

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-24 | Initial creation |
| 1.1.0 | 2026-02-21 | Trimmed generic content; focused on manufacturing patterns |

---

**END OF SKILL DOCUMENT**
