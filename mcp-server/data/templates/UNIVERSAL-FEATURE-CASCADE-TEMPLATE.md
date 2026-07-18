# Universal Feature Cascade Template

**Purpose**: Inventory new hooks, actions, and skills created in this session/unit, map their protection scope, define consumer intent, and identify downstream sessions that depend on these capabilities.

**Use this template** in every EXIT GATE or session summary that produces new MCP infrastructure (hooks, actions, skills).

**Principle**: No feature should remain isolated. Every new hook/action/skill must declare its downstream consumers or note when they're awaiting.

---

## Template Structure

```markdown
FEATURE CASCADE: NEW CAPABILITIES AVAILABLE

  NEW_HOOKS:
    {{ hook_name_1 }}: {{ protection_scope_1 }}
      Implementation: {{ file_path }}
      Fire Condition: {{ when_hook_fires }}
      Prevents: {{ what_bad_thing_it_stops }}
      Enabled By Default: {{ yes|no }}
      Required In Sessions: [{{ session_list }}]

    {{ hook_name_2 }}: {{ protection_scope_2 }}
      Implementation: {{ file_path }}
      Fire Condition: {{ when_hook_fires }}
      Prevents: {{ what_bad_thing_it_stops }}
      Enabled By Default: {{ yes|no }}
      Required In Sessions: [{{ session_list }}]

  NEW_ACTIONS:
    {{ dispatcher_name }}:{{ action_name }}
      Route: {{ POST /api/dispatcher/action }}
      Handler: {{ src/handlers/... }}
      Inputs: {{ {schema fields} }}
      Outputs: {{ {schema fields} }}
      Consumer Intent: {{ what business need does this solve }}
      Used By Sessions: [{{ session_list }}]
      Used By Frontend Pages: [{{ page_list }}]
      Used By Skills: [{{ skill_list }}]

  NEW_SKILLS:
    {{ /skill_name }}
      File: {{ ~/.claude/skills/skill_name.md }}
      Trigger: {{ when_user_types_skill | or "when {{ condition }}" }}
      Input Required: {{ params or "none" }}
      Output: {{ stdout_format or "returns {{ object }}" }}
      Consumer Use Case: {{ why_downstream_needs_this }}
      Wired To Dispatchers: [{{ dispatcher:action }}, ...]
      Wired To Engines: [{{ engine_name }}, ...]
      Used By Sessions: [{{ session_list }}]

  REGISTRIES_UPDATED:
    {{ RegistryName }}: +{{ N }} entries
      New Entry Types: [{{ type1 }}, {{ type2 }}]
      Example Entries: [{{ entry1 }}, {{ entry2 }}]
      Used By Sessions: [{{ session_list }}]
      Used By Engines: [{{ engine_name }}, ...]

  AVAILABLE_TO:
    - {{ SESSION A }} (reason: depends on {{ new_capability }})
    - {{ SESSION B }} (reason: uses {{ new_action }} to do {{ task }})
    - {{ SESSION C }} (reason: awaiting this hook before can implement)
    - [awaiting_consumer]: {{ SESSION X }} (capability ready, consumer session not yet planned)
```

---

## Detailed Guidance by Section

### NEW_HOOKS

**Purpose**: Inventory all new guard rails, pre-condition checks, and post-action monitors created.

**Hook Scope Categories**:
- `pre_compile`: Blocks TypeScript build on error condition
- `pre_edit`: Prevents file modifications matching dangerous pattern
- `pre_engine_execute`: Validates engine input before dispatch
- `pre_physics_compute`: Ensures physics constants imported, not inlined
- `pre_dispatcher_action`: Security/type check before handler
- `post_dispatch`: Post-dispatch logging, telemetry, state update
- `post_phase`: End-of-phase validation gate
- `pre_unit`: Unit entry condition check
- `post_unit`: Unit exit validation

**Format Example**:
```markdown
NEW_HOOKS:
  pre_engine_execute_physics:
    Protection Scope: pre_engine_execute
    Implementation: H:/prism/mcp-server/src/hooks/physicsConstantGuard.ts
    Fire Condition: Any engine in [KienzleForceModel, ChatterSLD, ThermalWear...] about to execute
    Prevents: Physics constant inlining (kc1_1 hardcoded instead of imported)
    Enabled By Default: yes
    Required In Sessions: [0-A-*, 0-B-*, 0-C-*] (all physics work)
    Mechanism: 
      1. Intercepts engine.execute() call
      2. AST-parses engine code for pattern /kc1_1\s*=\s*\d/
      3. If found, throws PreExecViolation("Physics constant inline detected")
      4. Caller must fix and retry

  post_test_completion_coverage_threshold:
    Protection Scope: post_dispatch (test completion)
    Implementation: H:/prism/mcp-server/src/hooks/coverageThresholdGate.ts
    Fire Condition: Test suite completes, npm test reports coverage
    Prevents: Coverage regression (merging code that drops coverage <70%)
    Enabled By Default: yes
    Required In Sessions: [0-B-*, 0-C-*, 1-*] (all coding units)
    Mechanism:
      1. Reads .nyc_output/coverage-summary.json
      2. Extracts lines/branches/functions coverage %
      3. If any < threshold, post warning + fail CI
      4. Dev can override with ALLOW_COVERAGE_REGRESS=1 (logged)
```

**Rules**:
- Every hook must specify its fire condition (measurable, verifiable)
- Every hook must specify what it prevents (be specific: not "errors" but "Kienzle constant inline")
- If hook is optional, note `Enabled By Default: no` + how to enable it
- List all sessions that MUST have this hook active
- Include mechanism (what the hook actually does to prevent the issue)

---

### NEW_ACTIONS

**Purpose**: Inventory all new MCP dispatcher actions and their routes.

**Format**:
```markdown
NEW_ACTIONS:
  prism_cam:route_program
    Route: POST /api/dispatchers/prism_cam/route_program
    Handler: H:/prism/mcp-server/src/handlers/routeProgram.ts
    Input Schema: H:/prism/mcp-server/src/schemas/routeProgramInput.ts
    Output Schema: H:/prism/mcp-server/src/schemas/routeProgramOutput.ts
    
    Inputs:
      - part: {geometry, material, tolerance, finish}
      - machine_family: enum [MILL, LATHE, MILL_TURN, EDM, LASER, WATERJET, GRIND]
      - constraints: {available_tools, stock_size, setup_count_budget}
    
    Outputs:
      - routing_decision: {pipeline_engine, reasoning, confidence}
      - fallback_pipelines: [{engine, reason_secondary}]
      - diagnostics: {time_ms, registry_queries}
    
    Consumer Intent:
      "Given a part and machine family, determine which PRISM pipeline produces the best program.
       Used by QuoteToShip orchestrator to route parts to correct manufacturing path."
    
    Used By Sessions:
      - 0-B-2 (MillTurn crash fix requires correct routing)
      - 1-1 (QuoteToShip full wiring)
      - 3-2 (Pipeline selection for exotic materials)
    
    Used By Frontend Pages:
      - /jobs/create (machine selection → routes to correct pipeline config)
      - /program-release (part → pipeline decision shown to operator)
    
    Used By Skills:
      - /quote-to-ship (comprehensive orchestration skill)
      - /job-planning (job setup assistance)
    
    Wiring Checklist:
      ✓ Handler exported from handlers/index.ts
      ✓ Dispatcher prism_cam includes action in z.enum
      ✓ Schema validators return AtomicValue<RoutingDecision>
      ✓ Lazy-load correct Pipeline engines (no imports in handler, use dispatcher)
      ✓ Integration test covers all machine_family branches
```

**Key fields**:
- **Route**: Full HTTP endpoint (port 3000 assumed)
- **Handler**: File path to request handler
- **Input/Output Schemas**: Zod schemas, typed
- **Consumer Intent**: Business/engineering reason this action exists (NOT "returns JSON")
- **Used By**: Which sessions, pages, skills call this action
- **Wiring Checklist**: Ensure integration is complete

---

### NEW_SKILLS

**Purpose**: Inventory all new user-facing slash commands and their coverage.

**Format**:
```markdown
NEW_SKILLS:
  /gcode-validate
    File: ~/.claude/skills/gcode-validate.md
    Trigger: User types `/gcode-validate` or skill auto-invokes when program needs validation
    
    Input Required:
      gcode: string (G-code program to validate)
      machine: string (machine name, optional — infers from context)
      dialect: enum [HAAS, FANUC, SIEMENS, ...] (optional)
    
    Output Format:
      STDOUT (markdown):
        ## G-Code Validation Report
        **Status**: PASS | WARNINGS | FAIL
        **Machine**: {{ machine_name }}
        **Issues Found**: {{ count }}
        {{ issue_table }}
        **Recommendations**: {{ list }}
    
    Consumer Use Case:
      "Before releasing a CNC program to the shop floor, user wants to validate:
       - G-code syntax per machine dialect
       - Coordinate ranges within machine limits
       - Feed/speed values realistic for material
       - No collision risks
       - Spindle/coolant commands valid
       Returns structured report with actionable issues."
    
    Wiring To Dispatchers:
      - prism_gcode:validate_syntax (syntax check)
      - prism_machine:check_limits (coordinate bounds)
      - prism_speed_feed:validate_fsn (feed/speed reasonableness)
    
    Wiring To Engines:
      - GCodeValidatorEngine (syntax + dialect-specific rules)
      - MachineLimitGuardEngine (bounds checking)
      - SpeedFeedOrchestratorEngine (F/S validity)
      - CollisionDetectionEngine (optional, if geometric model available)
    
    Used By Sessions:
      - 0-B-4 (G-code output validation part of PostProcessor)
      - 1-3 (Program release safety gate)
      - 2-1 (Shop floor check-in before run)
    
    Implementation Status:
      - ✓ Handler wired to prism_gcode dispatcher
      - ✓ Engines callable from handler
      - ✓ Integration test passes
      - ~ Frontend UI for /gcode-validate not yet built (planned 5-X)
```

**Rules**:
- Every skill must specify input params (user-provided or context-inferred)
- Output must show exact format (markdown, JSON, table, or structured log)
- Consumer use case must be specific (NOT "helps with G-code" but "validates before release to shop floor")
- Wiring must be verified (dispatcher actions + engines actually callable)
- Implementation status must note if skill is fully wired or awaiting frontend/dispatcher linkage

---

### REGISTRIES_UPDATED

**Purpose**: Track data growth and new entry types added to registries.

**Format**:
```markdown
REGISTRIES_UPDATED:
  ToolRegistry: +247 entries
    New Entry Types: [CARBIDE_INSERT_INDEXABLE, CUSTOM_GRIND_FORM, PROBE_STYLUS]
    Example Entries:
      - Iscar CNMG120404-TF (carbide turning insert, VC=200-500)
      - Haimer Taster One (ball probe, dia=Ø4mm)
      - Sandvik Q-Cut (custom ground tool, form=3D surface)
    Registry File: H:/prism/mcp-server/src/registries/ToolRegistry.ts
    Used By Engines: [ToolSelectOptimizer, SpeedFeedOrchestrator, CollisionDetection]
    Used By Sessions:
      - 0-C-1 (exotic tooling support)
      - 1-2 (tool crib inventory)
      - 2-3 (cost estimation with actual tool prices)

  MaterialRegistry: +9 entries
    New Entry Types: [TITANIUM_BETA_ALLOY, NICKEL_SUPERALLOY, CARBON_COMPOSITE]
    Example Entries:
      - Ti-6-2-4-2 (ASTM B348, Vc=40-80, Weibull η=2200)
      - Inconel 718 (NASM1260-7, Vc=20-50, notch-sensitive)
      - Carbon/Epoxy HS3k-6k (thermal runaway risk >150C)
    Registry File: H:/prism/mcp-server/src/registries/MaterialRegistry.ts
    Used By Engines: [KienzleForceModel, ChatterSLD, ThermalWear, SurfaceFinish]
    Used By Sessions:
      - 0-C-2 (exotic material physics)
      - 1-4 (aerospace/defense material support)
      - 3-1 (composite machining workflows)

  MachineRegistry: +3 entries
    New Entry Types: [FIVE_AXIS_GANTRY, SWISS_MILL_TURN]
    Example Entries:
      - Kern Micro X5 (5-axis, XYZ range 500×350×320, Pmax=15kW)
      - Tsugami Monax 0325 (swiss mill-turn, spindle speeds 1-8k)
    Registry File: H:/prism/mcp-server/src/registries/MachineRegistry.ts
    Used By Engines: [MachineCapabilityMatcher, ProcessPlanningOrchestrator]
    Used By Sessions:
      - 0-C-3 (machine family classifier)
      - 1-1 (QuoteToShip machine routing)
      - 2-2 (scheduling by machine type)
```

**Rules**:
- Count must be exact (`+247 entries`, not `~250`)
- List new entry TYPES (schema extensions), not every individual entry
- Provide 1-3 concrete examples so reviewers understand the data
- Link which engines query this registry (verify wiring)
- List consuming sessions

---

### AVAILABLE_TO

**Purpose**: Forward-declare which downstream sessions depend on these new capabilities.

**Format**:
```markdown
AVAILABLE_TO:
  - SESSION 0-B-2: MillTurn crash fix
    Dependency: NEW_HOOKS[pre_engine_execute_physics] ensures Kienzle inlines blocked
    
  - SESSION 0-C-1: Exotic tooling support
    Dependency: NEW_ACTIONS[prism_cam:tool_suggest] routes to correct tool library
    
  - SESSION 1-1: QuoteToShip orchestration
    Dependency: All 3 NEW_ACTIONS wired (route_program, tool_suggest, process_plan_generate)
    
  - SESSION 1-3: Program release gate
    Dependency: NEW_SKILL[/gcode-validate] performs safety checks
    
  - [AWAITING_CONSUMER]: Thermal wear compensation
    Status: Engine wired, tests passing, no consuming session yet
    Reason: Depends on SESSION 3-2 (exotic material physics) to fully integrate
```

**Rules**:
- Every new capability MUST have ≥1 consuming session
- If no consumer session exists yet, mark `[AWAITING_CONSUMER]` with reason
- A consumer session dependency means that session will call/use this capability
- Provides traceability: if a capability isn't used, mark it for removal

---

## Complete Example: Lathe Program Output Session

```markdown
FEATURE CASCADE: NEW CAPABILITIES AVAILABLE

  NEW_HOOKS:
    pre_lathe_output_validation:
      Protection Scope: pre_dispatch
      Implementation: H:/prism/mcp-server/src/hooks/latheOutputValidator.ts
      Fire Condition: Any lathe pipeline about to output G-code
      Prevents: Invalid G-code output (G50 without S range, G76 with bad P/Q, etc.)
      Enabled By Default: yes
      Required In Sessions: [0-A-2, 0-B-1, 0-B-2, all lathe work]
      Mechanism:
        1. Intercepts PostProcessorPipelineEngine.output()
        2. Validates per FANUC/Haas/Okuma dialect
        3. Checks G76 threading block (P=pitch, Q=depth, syntax)
        4. Checks G50 spindle mode (speed range must be in limit)
        5. Throws OutputValidationError if violated
        
    post_lathe_program_metrics:
      Protection Scope: post_dispatch
      Implementation: H:/prism/mcp-server/src/hooks/lateProgramMetrics.ts
      Fire Condition: After lathe G-code output generated
      Prevents: Silent performance issues (program takes 10× expected time)
      Enabled By Default: yes
      Required In Sessions: [0-B-1, all post-processor work]
      Mechanism:
        1. Parses output G-code
        2. Extracts cycle time estimate from feeds/speeds
        3. Compares vs baseline for same part
        4. Logs metrics: lines, moves, cycle_time_s, tool_changes
        5. If cycle_time > 2× baseline, warns in logs

  NEW_ACTIONS:
    prism_lathe:generate_g76_threading_block
      Route: POST /api/dispatchers/prism_lathe/generate_g76_threading_block
      Handler: H:/prism/mcp-server/src/handlers/generateG76Threading.ts
      Input Schema: H:/prism/mcp-server/src/schemas/g76ThreadingInput.ts
      Output Schema: H:/prism/mcp-server/src/schemas/g76ThreadingOutput.ts
      
      Inputs:
        - pitch_mm: number (thread pitch, 0.5-5.0)
        - depth_mm: number (cutting depth per pass, 0.1-1.0)
        - pass_count: number (inferred from pitch/depth)
        - material: string (ref to MaterialRegistry)
        - spindle_speed_rpm: number
        - thread_form: enum [ISO_METRIC, UNIFIED, ACME, PIPE]
      
      Outputs:
        - g76_block: string (FANUC G76 P/Q/R/... line)
        - passes: [{gcode_move, feed, speed, depth}]
        - cycle_time_estimate_s: number
        - warnings: [string]
      
      Consumer Intent:
        "Generate optimal G76 threading cycle for lathe. Validates pass depth against material,
         spindle speed, tool geometry. Outputs FANUC-compliant block ready for post-processor."
      
      Used By Sessions:
        - 0-B-1 (lathe program output generation)
        - 1-2 (threading job templates)
      
      Used By Frontend Pages:
        - /program-release (threading parameters UI)
        - /jobs/create (quick threading job setup)
      
      Used By Skills:
        - /job-planning (threadingjob setup)
        - /program-gen (G-code generation)

    prism_lathe:validate_g76_syntax
      Route: POST /api/dispatchers/prism_lathe/validate_g76_syntax
      Handler: H:/prism/mcp-server/src/handlers/validateG76Syntax.ts
      Input Schema: G76 block string
      Output Schema: {valid: boolean, errors: [string], machine_dialect: string}
      
      Consumer Intent:
        "Check G76 block syntax per machine dialect (FANUC, Haas, Okuma, etc.).
         Ensures output is machine-executable."
      
      Used By Sessions:
        - 0-B-1 (output validation)
        - 1-3 (program release safety)

  NEW_SKILLS:
    /lathe-threading-calc
      File: ~/.claude/skills/lathe-threading-calc.md
      Trigger: User types `/lathe-threading-calc` when planning threading operation
      
      Input Required:
        - pitch_mm: number (0.5-5.0)
        - material: string (4140, 304, Inconel718, ...)
        - spindle_speed_rpm: number (optional, inferred from Vc table)
        - tool_geometry: string (optional, default=standard insert)
      
      Output Format (markdown):
        ## Lathe Threading Calculation
        **Pitch**: {{ pitch_mm }} mm
        **Material**: {{ material }} — Vc range {{ vc_min }}-{{ vc_max }}
        **Spindle Speed**: {{ rpm }} (Vc={{ actual_vc }})
        **Recommended Passes**: {{ N }}
        | Pass | Depth (mm) | Feed (mm/rev) | Speed (rpm) | Cycle Time (s) |
        | --- | --- | --- | --- | --- |
        {{ table_rows }}
        **G76 Block**: {{ g76_block }}
        **Warnings**: {{ warning_list }}
      
      Consumer Use Case:
        "Before creating a threading job, operator wants to verify: spindle speed is safe for material,
         passes are sensible (not too deep, not too shallow), cycle time is reasonable. Skill shows all
         and generates the G76 block for copy/paste or direct wiring to program."
      
      Wiring To Dispatchers:
        - prism_lathe:generate_g76_threading_block (produces G76 block)
        - prism_lathe:validate_g76_syntax (validates output)
        - prism_material:lookup (Vc table query)
        - prism_speed_feed:speed_from_vc (RPM calculation)
      
      Wiring To Engines:
        - TurningSpeedFeedEngine (Vc → RPM)
        - KienzleForceModelEngine (pass depth validation)
        - G76ThreadingAssemblerEngine (block generation)
      
      Used By Sessions:
        - 0-B-1 (lathe output validation)
        - 1-2 (threading job templates)
      
      Implementation Status:
        ✓ Dispatchers wired
        ✓ Engines callable
        ✓ Skill handler created
        ~ Frontend /lathe-threading-calc page not yet built (planned 5-2)

  REGISTRIES_UPDATED:
    ThreadingToolRegistry: +18 entries
      New Entry Types: [THREADING_INSERT_PROFILE, THREADING_TOOL_HOLDER]
      Example Entries:
        - Iscar TEN 1604M0 (60° ISO metric, RA0.5 finish)
        - Kennametal KCC insert holder (M10×1.5, clamped style)
      Used By Engines: [G76ThreadingAssemblerEngine, ToolSelectOptimizer]
      Used By Sessions:
        - 0-B-1 (threading output generation)
        - 1-2 (tool selection for jobs)

  AVAILABLE_TO:
    - SESSION 0-B-2: MillTurn crash fix
      Dependency: prism_lathe:generate_g76_threading_block used by MillTurn output routing
      
    - SESSION 1-2: Threading job templates
      Dependency: All 2 NEW_ACTIONS + NEW_SKILL wired; templates will use G76 generation
      
    - SESSION 1-3: Program release safety
      Dependency: prism_lathe:validate_g76_syntax ensures output validity
      
    - SESSION 3-1: Exotic material threading
      Dependency: ThreadingToolRegistry extended with exotic tool options
```

---

## Rules for Feature Cascade Blocks

1. **Every new hook/action/skill must have ≥1 consumer**
   - If not, either it shouldn't exist yet, or mark `[AWAITING_CONSUMER]`
   - Prevents orphaned infrastructure

2. **Wiring must be verifiable**
   - List exact dispatcher:action names, engine names, handler file paths
   - Enables code review to confirm coupling is real

3. **Consumer sessions must be real**
   - Don't invent downstream sessions just to satisfy the rule
   - If truly no consumer exists, document as AWAITING

4. **Registry updates must have examples**
   - Not just "+247 entries" but actual example entries with key properties
   - Helps reviewers understand the data model change

5. **Skills must declare trigger + input + output format**
   - User-facing skills need clear documentation
   - Output format must be unambiguous (markdown, JSON, table, etc.)

6. **Implementation status must be honest**
   - Mark ✓ (done), ~ (in progress, awaiting), ✗ (not started)
   - If awaiting something, name it: "awaiting 5-X frontend build", not just "todo"

---

## Integration with Session Roadmap

```markdown
EXIT GATE:
  ✓ {{ criterion_1 }}
  ...
  
  FEATURE CASCADE: NEW CAPABILITIES AVAILABLE
    [Use template above]
  
  → /compact → HANDOFF records feature cascade + consuming sessions
```

---

## Next: See Also

- [UNIVERSAL-EXIT-GATE-TEMPLATE.md](UNIVERSAL-EXIT-GATE-TEMPLATE.md)
- [UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md](UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md)
- FORGE-TRIPLE definition: hook + MCP action + skill enhancement in concert
- SESSION consumer dependency map: H:/prism/state/roadmap-dependency-graph.md (to be created)
