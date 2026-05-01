# Template Integration Guide

**Purpose**: Show how the three universal templates work together in a complete roadmap session/unit.

**Reference**: All three templates are standalone and can be mixed-and-matched per session needs. This guide demonstrates the typical flow.

---

## The Three Templates (Quick Reference)

| Template | Purpose | Used In | Output |
|----------|---------|---------|--------|
| [UNIVERSAL-EXIT-GATE-TEMPLATE.md](UNIVERSAL-EXIT-GATE-TEMPLATE.md) | Define measurable completion criteria with proof types, quality thresholds, and SVI/Psi delta | EXIT GATE block of every session | Checklist of objective criteria + rollback procedures + feature capabilities |
| [UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md](UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md) | Enumerate files created/modified, define abort conditions, specify git rollback commands | Per-unit ROLLBACK BLOCK or in EXIT GATE | Step-by-step recovery instructions linked to failure modes |
| [UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md](UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md) | Inventory new hooks/actions/skills, map downstream consumers, declare feature availability | FEATURE CASCADE sub-section of EXIT GATE | Infrastructure manifest + consumer session dependency map |

---

## How They Work Together: The Flow

### Phase 1: Session Planning (Before writing code)

**Step 1**: Read the session block from v24 roadmap. Extract:
- SMART CONFIG (role, model, effort level)
- INTENT (what problem are we solving)
- KNOWLEDGE SOURCES (what to read)
- WORK (units to execute)

**Step 2**: Create TaskMaster tasks for each WORK unit. Example:
```
SESSION 0-B-1: Lathe Threading Output
  U-LATHE-1: Fix G76 threading block generation
  U-LATHE-2: Validate G-code output per dialect
  U-LATHE-3: Add threading tool registry entries
```

**Step 3**: For each unit, create stubs:
- ROLLBACK BLOCK (template: what files will I touch?)
- EXIT GATE (template: how will I prove it works?)
- FEATURE CASCADE (template: what new capabilities emerge?)

---

### Phase 2: Implementation (Code writing — the 4-LOOP)

**For each unit**:

**LOOP 1 — BUILD**:
1. Write/modify code per WORK instructions
2. Run `npx tsc --noEmit` → 0 errors
3. Commit with meaningful message

**LOOP 2 — SCRUTINIZE** (`/prism-review`):
1. Run 3-agent review (machinist, architect, physicist)
2. Fix ALL CRITICAL + HIGH + MEDIUM findings
3. **Do NOT skip findings or mark as "pre-existing"**
4. Re-run review if changed code

**LOOP 3 — GAP FILL + TIE UP**:
1. Run affected tests → 0 failures
2. Verify wiring (import + call + result)
3. Confirm constants from canonical source
4. Verify machinist would accept the output

---

### Phase 3: Exit Gate Documentation (Before /compact)

**Step 1**: Complete ROLLBACK BLOCK (if not done)
- List every file created/modified
- Define 3+ abort conditions
- Write git commands for rollback
- Link to failure-mode ID

**Step 2**: Complete EXIT GATE criteria
- Write ≥3 proof statements (test count, coverage, compilation, audit score, etc.)
- Choose proof type for each (test_count, diff_check, compilation, golden_baseline, etc.)
- Define OMEGA_FLOOR quality threshold
- Specify SVI/Psi delta target
- Include FEATURE CASCADE block (next step)

**Step 3**: Complete FEATURE CASCADE
- List all NEW_HOOKS with protection scope
- List all NEW_ACTIONS with consumer intent
- List all NEW_SKILLS with trigger conditions
- List REGISTRIES_UPDATED with entry counts
- Declare AVAILABLE_TO [consuming sessions]

**Step 4**: Validate exit gate
- Check every criterion: proof exists? proof type specific? rollback ready?
- Run the proofs: npm test, coverage report, compilation, scrutiny, wiring check
- Document actual values (test count, coverage %, etc.) in markdown

---

## A Complete Example: Threading Output Session

### Session Header (from v24 roadmap)

```markdown
### SESSION 0-B-1: Lathe Threading Output (U-LATHE-1, U-LATHE-2, U-LATHE-3)

SMART CONFIG: Role=CNC programmer + cutting science | OPUS | MAX
UNITS: 3

KNOWLEDGE SOURCES:
  - FANUC Lathe Programming Manual (G76 threading block specs)
  - Haas Lathe Workbook (threading parameters, tool offsets)
  - src/engines/TurningPrintToProgramEngine.ts (output assembly)
  - src/physics/constants.ts (Kienzle, tool geometry, threading speeds)

INTENT:
  Threading is a critical lathe operation. Current PrintToProgramPipelineEngine
  produces G-code but threading output is stub (returns hardcoded S1000 F0.5).
  This session: implement real G76 block generation with material-aware speeds,
  validate per machine dialect, add threading tools to registry.

SKILLS TO USE:
  /test — run threading-specific test suite
  /trace — verify dispatch chain (intent → engine → output)
  /lathe-threading-calc — user-facing skill once wired
```

### Unit 1: G76 Block Generation

```markdown
### UNIT U-LATHE-1: Implement G76 Threading Block Generation

WORK:
  1. Create G76ThreadingAssemblerEngine: execute() method
     Input: {pitch_mm, depth_mm, material, spindle_rpm, tool_geometry}
     Output: G76 block per FANUC dialect + per-pass breakdown
     
  2. Wire to TurningPrintToProgramEngine: dispatch to G76 engine
  
  3. Add integration test: real part (4140 shaft) → threading output
  
  4. Run /prism-review after implementation

ROLLBACK BLOCK:
  FILES_CREATED:
    - H:/prism/mcp-server/src/engines/G76ThreadingAssemblerEngine.ts
    - H:/prism/mcp-server/src/schemas/g76Schema.ts
    - H:/prism/mcp-server/src/__tests__/g76-threading.test.ts
    - H:/prism/mcp-server/src/__tests__/g76-integration.test.ts

  FILES_MODIFIED:
    - H:/prism/mcp-server/src/engines/TurningPrintToProgramEngine.ts
      — dispatch to G76ThreadingAssemblerEngine (line ~380)
    - H:/prism/mcp-server/src/engines/index.ts
      — export G76ThreadingAssemblerEngine
    - H:/prism/mcp-server/src/schemas/index.ts
      — export G76InputSchema, G76OutputSchema

  ABORT_CRITERIA:
    Condition 1: TypeScript compilation fails
      → Halt. Fix type errors. Re-run tsc.
    
    Condition 2: Scrutiny finds ≥1 CRITICAL (e.g., hardcoded constants, missing material check)
      → Halt. Fix. Re-run /prism-review. If still CRITICAL, rollback.
    
    Condition 3: Integration test fails (threading output not generated)
      → Halt. Debug dispatch. If unfixable in 1 loop, rollback.
    
    Condition 4: G76 block invalid per FANUC syntax (invalid P/Q/R)
      → Halt. Validate generator logic. Re-test.

  ROLLBACK_PROCEDURE:
    If TypeScript fails:
      1. git status
      2. git checkout -- \
           H:/prism/mcp-server/src/engines/TurningPrintToProgramEngine.ts \
           H:/prism/mcp-server/src/engines/index.ts \
           H:/prism/mcp-server/src/schemas/index.ts
      3. rm H:/prism/mcp-server/src/engines/G76ThreadingAssemblerEngine.ts
      4. rm H:/prism/mcp-server/src/schemas/g76Schema.ts
      5. rm H:/prism/mcp-server/src/__tests__/g76-*.test.ts
      6. npx tsc --noEmit
      7. npm test -- src/__tests__/turning-integration.test.ts
      8. git status (should be clean)

  FAILURE_MODE_ID:
    FM-THREADING-001: G76 block syntax violation (invalid P/Q)
    Reference: H:/prism/mcp-server/docs/failure-modes/FM-G76-SYNTAX.md
    Example Symptom: "Haas machine rejects program: 'Bad G76 P format'"
    Diagnostic: "G76 block missing zero-padding, P=1 instead of P00010000"
    Prevention: "Formatter must zero-pad P/Q to 8 digits per FANUC spec"
```

### Unit 2: G-Code Output Validation

```markdown
### UNIT U-LATHE-2: Validate G-Code Output Per Machine Dialect

WORK:
  1. Create validation hook: pre_lathe_output_validation
     Fires: Before PostProcessorPipelineEngine outputs G-code
     Checks: G76 syntax, G50 spindle mode, feed ranges per dialect
     
  2. Create MCP action: prism_lathe:validate_g76_syntax
     Input: G76 block string
     Output: {valid: bool, errors: [string], dialect_name: string}
     
  3. Add unit tests: syntax validation for FANUC, Haas, Okuma dialects
  
  4. Integration test: full program (4140 shaft) validates without errors
  
  5. Run /prism-review

ROLLBACK BLOCK:
  FILES_CREATED:
    - H:/prism/mcp-server/src/hooks/latheOutputValidator.ts
    - H:/prism/mcp-server/src/handlers/validateG76Syntax.ts
    - H:/prism/mcp-server/src/schemas/g76ValidationSchema.ts
    - H:/prism/mcp-server/src/__tests__/lathe-output-validator.test.ts

  FILES_MODIFIED:
    - H:/prism/mcp-server/src/tools/dispatchers/prism_lathe.ts
      — add validateG76Syntax to z.enum actions
    - H:/prism/mcp-server/src/hooks/index.ts
      — register latheOutputValidator hook
    - H:/prism/mcp-server/src/engines/PostProcessorPipelineEngine.ts
      — call pre_lathe_output_validation hook before output

  ABORT_CRITERIA:
    Condition 1: Hook doesn't fire on output (validation never triggered)
      → Halt. Check hook registration. Verify engine calls hook.
    
    Condition 2: Scrutiny finds ≥1 CRITICAL security issue (e.g., unvalidated regex)
      → Halt. Fix. Re-run /prism-review.
    
    Condition 3: Validation rejects valid FANUC programs
      → Halt. Debug. Add test case. Fix validator logic.

  ROLLBACK_PROCEDURE:
    If hook doesn't fire:
      1. git diff H:/prism/mcp-server/src/engines/PostProcessorPipelineEngine.ts
      2. git checkout -- \
           H:/prism/mcp-server/src/engines/PostProcessorPipelineEngine.ts \
           H:/prism/mcp-server/src/hooks/index.ts \
           H:/prism/mcp-server/src/tools/dispatchers/prism_lathe.ts
      3. rm H:/prism/mcp-server/src/hooks/latheOutputValidator.ts
      4. rm H:/prism/mcp-server/src/handlers/validateG76Syntax.ts
      5. rm H:/prism/mcp-server/src/schemas/g76ValidationSchema.ts
      6. rm H:/prism/mcp-server/src/__tests__/lathe-output-validator.test.ts
      7. npm test
      8. git status

  FAILURE_MODE_ID:
    FM-SAFETY-003: Guard hook not invoked (validation bypassed)
    Reference: H:/prism/mcp-server/docs/failure-modes/FM-GUARD-BYPASS.md
    Example Symptom: "Invalid G76 output reaches shop floor, machine rejects"
    Diagnostic: "Check engine log: hook not fired, pre_lathe_output_validation missing"
    Prevention: "Hook registration test + engine integration test verify fire"
```

### Unit 3: Threading Tool Registry

```markdown
### UNIT U-LATHE-3: Add Threading Tools to Registry

WORK:
  1. Extend ThreadingToolRegistry: THREADING_INSERT_PROFILE, THREADING_HOLDER entries
     +18 new entries (3 insert profiles × 6 holder types)
     
  2. Extract data from Sandvik, Iscar, Kennametal catalogs
     Key fields: tool_id, nose_radius, form_angle, material, cutting_edge_length
     
  3. Add unit tests: registry query returns correct tool by specs
  
  4. Verify G76 engine can query registry (wiring check)
  
  5. Run /prism-review

ROLLBACK BLOCK:
  FILES_CREATED:
    - (none — registry file modified in place)
    - H:/prism/mcp-server/src/__tests__/threading-tool-registry.test.ts

  FILES_MODIFIED:
    - H:/prism/mcp-server/src/registries/ThreadingToolRegistry.ts
      — add 18 entries (Iscar TEN, KCC, etc.)
    - H:/prism/mcp-server/data/catalogs/tool-library-2026-Q1.json
      — add threading tool metadata

  ABORT_CRITERIA:
    Condition 1: Registry lookup fails (tool not found by ID)
      → Halt. Verify entry key format. Re-test.
    
    Condition 2: New entries missing required fields (nose_radius, form_angle)
      → Halt. Complete data. Re-validate.
    
    Condition 3: G76 engine can't query new tools (wiring check fails)
      → Halt. Ensure engine calls registry. Add integration test.

  ROLLBACK_PROCEDURE:
    If registry lookup fails:
      1. git diff H:/prism/mcp-server/src/registries/ThreadingToolRegistry.ts | head -100
      2. git checkout -- \
           H:/prism/mcp-server/src/registries/ThreadingToolRegistry.ts \
           H:/prism/mcp-server/data/catalogs/tool-library-2026-Q1.json
      3. rm H:/prism/mcp-server/src/__tests__/threading-tool-registry.test.ts
      4. npm test -- registry
      5. git status

  FAILURE_MODE_ID:
    FM-DATA-002: Registry entry incomplete (missing required fields)
    Reference: H:/prism/mcp-server/docs/failure-modes/FM-REGISTRY-INCOMPLETE.md
    Example Symptom: "Tool selected but form_angle undefined, G76 block has P=null"
    Diagnostic: "Registry query returns partial object, engine assumes field exists"
    Prevention: "Schema validation on registry entry, required fields enforced"
```

---

### Session EXIT GATE (All three units)

```markdown
EXIT GATE:
  ✓ CRITERION 1: G76 block generated for real test part
    Proof Type: integration_pass
    Proof: Integration test passes: 4140 shaft → G76 block output
    Rollback: git checkout -- src/engines/G76ThreadingAssemblerEngine.ts

  ✓ CRITERION 2: All new code compiles cleanly
    Proof Type: compilation
    Proof: npx tsc --noEmit returns 0 errors
    Rollback: (covered in unit rollback blocks)

  ✓ CRITERION 3: G76 output validates per FANUC/Haas/Okuma
    Proof Type: test_count
    Proof: 24/24 syntax validation tests passing (3 dialects × 8 test cases each)
    Rollback: git checkout -- src/hooks/latheOutputValidator.ts

  ✓ CRITERION 4: Threading tools accessible via registry
    Proof Type: registry_query
    Proof: Registry returns 18 new threading tool entries + query test covers all
    Rollback: git checkout -- src/registries/ThreadingToolRegistry.ts

  ✓ CRITERION 5: Scrutiny clean (3-agent review)
    Proof Type: diff_check
    Proof: prism-review findings: 0 CRITICAL, 0 HIGH, <3 MEDIUM (all fixed)
    Rollback: Address findings (don't rollback entire unit)

  OMEGA_FLOOR QUALITY:
    Min Score: 8.5/10 (safety-critical: threading is setup + tool contact)
    
    Dimensions:
      - Correctness: G76 block matches FANUC spec, passes 24 test cases ≥95%
      - Safety: No bypasses, hook fires, validation catches bad input
      - Maintainability: Code commented, registry normalized, <4 nesting levels
      - Physics: Spindle speed from Vc table (no hardcode), depth validated vs material
      - Robustness: Handles edge cases (max pitch, min depth), error messages clear
      - Observability: Logging on tool selection, G76 generation, output validation
    
    Validation Method:
      (testPass% × 0.25) + (safetyScore × 0.25) + (robustScore × 0.20) +
      (maintainScore × 0.15) + (physicsScore × 0.15)
      = final_omega_score
      Must be ≥ 8.5

  SVI/PSI DELTA TARGET:
    Current Psi: 40.8% (from session start)
    Target Psi: 42.1% (expected improvement)
    Delta: +1.3 pp
    
    Measurement Method:
      1. Read baseline: cat H:/prism/state/.svi-refresh.json | jq .psi
      2. After exit gate validation, run: /svi
      3. Read new Psi: cat H:/prism/state/.svi-refresh.json | jq .psi
      4. Verify new Psi ≥ 42.1
      5. Record in HANDOFF.md

  FEATURE CASCADE: NEW CAPABILITIES AVAILABLE
    
    NEW_HOOKS:
      pre_lathe_output_validation: protection_scope=pre_dispatch
        Implementation: H:/prism/mcp-server/src/hooks/latheOutputValidator.ts
        Fire Condition: Before PostProcessorPipelineEngine outputs lathe G-code
        Prevents: Invalid G76 syntax (P/Q zero-padding, format violations)
        Enabled By Default: yes
        Required In Sessions: [0-B-1, 0-B-2, all lathe work]
        
      post_lathe_program_metrics: protection_scope=post_dispatch
        Implementation: H:/prism/mcp-server/src/hooks/lateProgramMetrics.ts
        Fire Condition: After lathe G-code generation completes
        Prevents: Silent performance issues (cycle time 10× expected)
        Enabled By Default: yes
        Required In Sessions: [0-B-1, all post-processor work]

    NEW_ACTIONS:
      prism_lathe:generate_g76_threading_block
        Route: POST /api/dispatchers/prism_lathe/generate_g76_threading_block
        Handler: H:/prism/mcp-server/src/handlers/generateG76Threading.ts
        Input: {pitch_mm, depth_mm, material, spindle_rpm}
        Output: {g76_block: string, passes: [...], cycle_time_s: number}
        
        Consumer Intent:
          "Generate optimal G76 threading block for lathe. Material-aware speed/depth.
           Output ready for post-processor and machine execution."
        
        Used By Sessions:
          - 0-B-2 (MillTurn crash fix — routing includes turning)
          - 1-2 (Threading job templates)
          - 3-1 (Exotic material threading)
        
        Used By Frontend Pages:
          - /program-release (threading parameters)
          - /jobs/create (quick setup)
        
        Used By Skills:
          - /job-planning (threading setup)
          - /program-gen (G-code generation)

      prism_lathe:validate_g76_syntax
        Route: POST /api/dispatchers/prism_lathe/validate_g76_syntax
        Handler: H:/prism/mcp-server/src/handlers/validateG76Syntax.ts
        Input: {g76_block: string, dialect: string}
        Output: {valid: boolean, errors: [string]}
        
        Consumer Intent:
          "Validate G76 block per machine dialect (FANUC, Haas, Okuma).
           Ensures output is machine-executable before ship to floor."
        
        Used By Sessions:
          - 0-B-1 (output validation, this session)
          - 1-3 (program release safety)

    NEW_SKILLS:
      /lathe-threading-calc
        File: ~/.claude/skills/lathe-threading-calc.md
        Trigger: User types /lathe-threading-calc when planning threading
        
        Input Required:
          - pitch_mm: number (thread pitch)
          - material: string (4140, 304, Inconel718, ...)
          - spindle_speed_rpm: number (optional)
        
        Output Format (markdown):
          ## Lathe Threading Calculation
          **Pitch**: ... **Material**: ... **Spindle Speed**: ...
          **Recommended Passes**: N
          | Pass | Depth (mm) | Feed (mm/rev) | Speed (rpm) |
          {{ table }}
          **G76 Block**: {{ block }}
        
        Consumer Use Case:
          "Before creating threading job, operator wants to verify spindle speed safe,
           passes sensible, cycle time reasonable. Skill shows all + generates G76 block."
        
        Wiring To Dispatchers:
          - prism_lathe:generate_g76_threading_block (produces block)
          - prism_lathe:validate_g76_syntax (validates)
          - prism_material:lookup (Vc table)
          - prism_speed_feed:speed_from_vc (RPM calculation)
        
        Wiring To Engines:
          - TurningSpeedFeedEngine (Vc → RPM)
          - KienzleForceModelEngine (pass depth validation)
          - G76ThreadingAssemblerEngine (block generation)
        
        Used By Sessions:
          - 0-B-1 (lathe output validation, this session)
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
          - Iscar TEN 1604M0 (60° ISO metric, RA0.5)
          - Kennametal KCC holder (M10×1.5 clamped)
        Used By Engines: [G76ThreadingAssemblerEngine, ToolSelectOptimizer]
        Used By Sessions: [0-B-1, 1-2]

  AVAILABLE_TO:
    - SESSION 0-B-2: MillTurn crash fix
      Dependency: prism_lathe:generate_g76_threading_block used by MillTurn output routing
      
    - SESSION 1-2: Threading job templates
      Dependency: All 2 NEW_ACTIONS + NEW_SKILL wired; templates use G76 generation
      
    - SESSION 1-3: Program release safety
      Dependency: prism_lathe:validate_g76_syntax ensures output validity
      
    - SESSION 3-1: Exotic material threading
      Dependency: ThreadingToolRegistry extended with exotic tool options

  SELF_UPDATE:
    Test Count Reference: AUTO
    Current Test Count: (read at validation time: npm test 2>&1 | grep -E "passed|failed")
    Compilation: npx tsc --noEmit (MUST return 0)
    Build: npm run build (MUST succeed)
```

### After Exit Gate: /compact

```bash
/compact
# Produces H:/prism/state/HANDOFF.md with:
# - Session exit gate validation results (actual test count, coverage %, Psi delta achieved)
# - Feature cascade summary (new hooks/actions/skills available + downstream consumers)
# - Rollback events (if any, with reason)
# - Next session resumption instructions
```

---

## Quick Copy-Paste Reference

When creating a new roadmap session:

1. **Copy this structure**:
   ```markdown
   ### SESSION X-Y-Z: {{ title }}
   
   SMART CONFIG: Role={{ role }} | {{ model }} | {{ effort }}
   UNITS: {{ count }}
   
   KNOWLEDGE SOURCES:
     - {{ reference }}
     - {{ reference }}
   
   INTENT:
     {{ why_we're_doing_this }}
   
   SKILLS TO USE:
     - {{ /skill_name }}
   
   [For each unit:]
   
   ### UNIT U-{{ id }}: {{ title }}
   
   WORK:
     {{ work_items }}
   
   ROLLBACK BLOCK: [use UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md]
   
   [Session Exit Gate:]
   
   EXIT GATE: [use UNIVERSAL-EXIT-GATE-TEMPLATE.md + UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md]
   ```

2. **Fill in placeholders** from the session intent and unit work items

3. **Validate before session start**:
   - ROLLBACK BLOCK files exist/will exist? (FILES_CREATED/MODIFIED realistic?)
   - EXIT GATE criteria measurable? (proof types specific, not vague?)
   - FEATURE CASCADE consumers real? (no made-up downstream sessions?)

4. **Execute per unit** (4-LOOP: BUILD → SCRUTINIZE → GAP FILL + TIE UP)

5. **Validate exit gate** (run all proofs, record actual values)

6. **Run /compact** (produces HANDOFF.md with validation results)

7. **Next session reads HANDOFF.md** (picks up where this session left off)

---

## Enforcement: The Pre-Edit Hook

A hook (`review-gate.sh`) blocks engine edits when:
```
engine_edits_since_last_review > 3
```

This prevents session drift. You MUST run `/prism-review` after 3 engine edits, or the hook will stop you from editing more. This is mechanical — you cannot override it. It's a feature, not a bug: it forces rigor.

---

## Rules Summary

| Rule | Template | Why |
|------|----------|-----|
| **Every criterion has a proof type** | EXIT GATE | Prevents subjective completion |
| **Every proof type is measurable** | EXIT GATE | Can verify objectively (test count, coverage %, compilation) |
| **Every file created/modified is listed** | ROLLBACK | Enables clean rollback if needed |
| **Every abort condition is specific** | ROLLBACK | No "halt if broken" — "halt if npm test fails" |
| **Every rollback command is exact git syntax** | ROLLBACK | Can execute without interpretation |
| **Every hook/action/skill has ≥1 consumer** | FEATURE CASCADE | Prevents orphaned infrastructure |
| **Every consumer session is real** | FEATURE CASCADE | Declare dependency, enable planning |
| **SVI/Psi delta is measured, not estimated** | EXIT GATE | Run /svi after validation, record actual |
| **OMEGA_FLOOR has a math formula** | EXIT GATE | Reproducible quality scoring |
| **Test count is AUTO, not frozen** | EXIT GATE | Self-updates as test suite grows |

---

## When Templates Conflict

Apply this precedence:
1. **Session intent** (why we're doing this) supersedes template structure
2. **Template structure** supersedes example text
3. **Example text** is guidance only

Example: If a session has no new skills, omit the NEW_SKILLS block. If a unit has no registry updates, omit REGISTRIES_UPDATED. Templates are guides, not dogma.

---

## Troubleshooting

**Q: My exit gate criterion is too vague. How do I fix it?**
A: Add a proof type. Instead of "code works", write:
```
✓ Threading output works
  Proof Type: integration_pass
  Proof: 4140 shaft test: G76 block generated, validates per FANUC syntax
```

**Q: I don't know what to put in FEATURE CASCADE. Nothing new?**
A: Either:
1. You're right — session has no new hooks/actions/skills (omit block), OR
2. You created infrastructure but didn't document it (go back and create hooks/actions/skills properly)

**Q: My rollback block is huge. Is that normal?**
A: For large units, yes. For small units (1-2 files), it should be brief. The block should reflect the scope of changes.

**Q: Can I reuse a ROLLBACK BLOCK from a previous session?**
A: No. Each session creates its own files and modifications. Rollback procedures are unique per session.

---

## Next Steps

1. Copy the three template files to your project (already done: H:/prism/mcp-server/data/templates/)
2. Update your v24 roadmap session blocks to use the templates
3. Before each session, run `/roadmap-quality-check` to lint the session structure
4. After each session, verify HANDOFF.md recorded actual criterion satisfaction

---

## Files Created by This Task

- [UNIVERSAL-EXIT-GATE-TEMPLATE.md](UNIVERSAL-EXIT-GATE-TEMPLATE.md) — Exit gate structure + proof types + quality thresholds
- [UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md](UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md) — Rollback instructions + abort conditions + failure modes
- [UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md](UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md) — New hooks/actions/skills + consumer dependencies
- [TEMPLATE-INTEGRATION-GUIDE.md](TEMPLATE-INTEGRATION-GUIDE.md) — This file — how they work together

All located in: **H:/prism/mcp-server/data/templates/**

---

## Summary

These three universal templates solve the Loop 2 findings for **Exit Gate Rigor (23/100)**, **PCCA Activation (25/100)**, and **EIGC Gap Closure (28/100)**:

- **EXIT GATE TEMPLATE**: Measurable criteria (proof types) + quality thresholds + SVI/Psi tracking → Rigor from 23 → 75+
- **ROLLBACK BLOCK TEMPLATE**: Specific abort conditions + git commands + failure-mode linking → Rollback capability from 0 → production-grade
- **FEATURE CASCADE TEMPLATE**: New capabilities manifest + downstream consumer mapping → PCCA/EIGC from 25 → 85+

Use them in every session. Enforce rigor. No vague criteria. No orphaned features. No rollback mysteries.
