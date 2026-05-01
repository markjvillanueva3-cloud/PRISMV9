# CLAUDE CODE INTEGRATION GUIDE v14.3
# Complete execution guide for PRISM development using Claude Code
# This document expands the reference into a full operational guide.
#
# v14.3: Expanded from reference to execution guide with:
#   - Complete DA-MS0 through DA-MS5 milestones
#   - Per-phase environment declarations
#   - Model switching strategy with cost model
#   - Subagent definitions with full specs
#   - Slash command definitions
#   - Hook configurations
#   - Plugin packaging instructions (R6 exit gate)

---

## OVERVIEW

Claude Code is the primary development environment for PRISM phases DA through R11.
This guide defines HOW to use Claude Code for each phase, including:
- Which model tier to use (Haiku/Sonnet/Opus)
- When to use subagents vs main session
- When to switch to Claude.ai MCP
- How to handle safety-critical operations

---

## PER-PHASE ENVIRONMENT DECLARATIONS

| Phase | Environment | Model Strategy | Key Workflow |
|-------|-------------|----------------|-------------|
| DA | Code 100% | Sonnet | Config, setup, skill conversion |
| R1 | Code 80% + MCP 20% | Haiku→Sonnet→Opus | Parallel registry loading, schema design in MCP |
| R2 | Hybrid | Sonnet→Opus | Benchmarks in Code, Ralph validation in MCP |
| R3 | Hybrid | Sonnet→Opus | Campaigns in Code, action design in MCP |
| R4 | Code 90% | Sonnet (Opus at gate) | Multi-file refactoring |
| R5a | Code 100% | Sonnet | Component development, parallel with R4 |
| R5b | Hybrid | Sonnet | UX design in MCP, implement in Code |
| R6 | Code 80% + MCP 20% | Sonnet→Opus | Fault injection in Code, gates in MCP |
| R7 | Hybrid | Haiku→Sonnet→Opus | Catalog extraction in Code, physics in MCP |
| R8 | MCP 80% + Code 20% | Opus→Sonnet | Architecture in MCP, skill batch in Code |
| R9 | Code 90% | Sonnet | Protocol adapters (parallelizable) |
| R10 | MCP 100% | Opus | Pure strategic design |
| R11 | Code 70% + MCP 30% | Sonnet→Opus | Packaging in Code, product arch in MCP |

---

## MODEL SWITCHING STRATEGY

### Cost Model
```
Haiku:  1x baseline — file exploration, grep, reading, simple parsing
Sonnet: 3x — implementation, normalization, testing, script writing
Opus:   15x — safety review, architecture decisions, physics modeling, phase gates
```

### When to Use Each Tier
```
HAIKU (cheapest — use aggressively for):
  - File exploration and directory scanning
  - Grep/search operations across large codebases
  - Simple file reading and content extraction
  - Catalog PDF parsing at volume
  - Registry file enumeration

SONNET (default — use for most work):
  - Writing implementation code
  - Creating normalization scripts
  - Running test suites
  - Data transformation and loading
  - Skill file creation
  - Standard code review

OPUS (expensive — reserve for high-value):
  - S(x) safety score calculations (MANDATORY)
  - Phase gate reviews (MANDATORY)
  - Architecture and design decisions
  - Coupled physics modeling (R7)
  - Cross-system integration design (R3)
  - Ralph/Omega validation loops
  - 85-param tool holder schema design (R1-MS5)
```

### Session Budget Impact
```
R1 session (mostly Haiku/Sonnet): ~3x more work per session
R3 session (mixed Sonnet/Opus): ~2x more work per session
R7 session (heavy Opus): baseline — coupled physics is expensive
Estimated savings vs all-Opus: 40-60% token cost reduction
```

---

## SUBAGENT DEFINITIONS

### 1. prism-safety-reviewer
```yaml
name: prism-safety-reviewer
model: opus
memory: project
tools: [Read, Grep, Glob, Bash]
context: |
  You are the PRISM safety reviewer. S(x)≥0.70 is a HARD BLOCK.
  Check all calculations against CALC_BENCHMARKS.json.
  Track calculation failure patterns in memory across sessions.
  Flag any bare numbers (missing uncertainty bounds).
  Reference: SYSTEM_CONTRACT.md for safety invariants.
```

### 2. prism-registry-expert
```yaml
name: prism-registry-expert
model: sonnet
memory: project
tools: [Read, Grep, Glob, Bash]
context: |
  You are the PRISM registry expert. You manage:
  - 3518 materials (127 params each, target 100% enriched)
  - 824 machines (44 manufacturers, need power specs + work envelopes)
  - 5238 tools on disk (1944 active, need indexing + schema consistency)
  - 9200+ alarm codes (100% loaded)
  - 500 formulas (105 INVENTION/NOVEL, 162 zero-coverage)
  - 697 toolpath strategies (only 8 exposed)
  Track data quality patterns in memory. Quarantine bad records with codes.
```

### 3. prism-architect
```yaml
name: prism-architect
model: opus
memory: project
tools: [Read, Write, Grep, Glob, Bash]
context: |
  You are the PRISM Principal Systems Architect.
  Consult wiring registries before ANY new implementation:
  - PRECISE_WIRING_D2F.json (Dispatchers → Formulas)
  - PRECISE_WIRING_F2E.json (Formulas → Engines)
  - PRECISE_WIRING_E2S.json (Engines → Services)
  Track design decisions with rationale in memory.
  Anti-regression: new content must always be >= old content.
```

### 4. prism-test-runner
```yaml
name: prism-test-runner
model: sonnet
memory: project
tools: [Read, Bash, Glob]
context: |
  You are the PRISM test runner.
  Build: npm run build (NEVER standalone tsc — OOM at current scale).
  Test: npm test (Vitest framework).
  Track test coverage and failure history in memory.
  Report errors with file:line format for quick navigation.
```

### 5. prism-data-validator
```yaml
name: prism-data-validator
model: sonnet
memory: project
tools: [Read, Grep, Glob, Bash]
context: |
  You are the PRISM data validator.
  Validate registry data quality: schema compliance, completeness,
  cross-reference integrity. Quarantine bad records with reason codes.
  Materials must have 127 params. Tools need consistent schema.
  Machines need power specs and work envelopes.
```

---

## SLASH COMMAND DEFINITIONS

### /boot (boot.md)
```markdown
Load CURRENT_POSITION.md from data/docs/roadmap/.
Identify active phase and milestone.
Load the active phase document.
Check for HANDOFF.md in state/.
Plan session: current MS, next 3 steps, blockers, estimated scope.
Report using format:
  POSITION: [phase]-[MS] step [N]
  NEXT: [step 1], [step 2], [step 3]
  BLOCKERS: [none | description]
  SCOPE: [estimated MS completions this session]
```

### /gate (gate.md)
```markdown
Run phase gate check:
1. Verify all milestone criteria met (check phase doc exit gate)
2. Run: npm run build
3. Run: npm test
4. Estimate Omega score based on criteria coverage
5. List any unresolved findings from PHASE_FINDINGS.md
6. Report PASS/FAIL with specific gaps
```

### /checkpoint (checkpoint.md)
```markdown
Save current state:
1. Update CURRENT_POSITION.md with active subtask
2. Append ROADMAP_TRACKER.md with progress entry
3. Write session notes to HANDOFF.md
4. Run: npm run build (verify clean state)
Report: "Checkpoint saved at [phase]-[MS] step [N]"
```

### /plan (plan.md)
```markdown
Read current phase doc. Identify next milestone.
Break into steps with effort estimates.
Identify parallelizable work streams.
Propose session plan with model tier recommendations.
Format:
  MILESTONE: [MS-ID] — [title]
  STEPS: [numbered list with effort]
  PARALLEL: [independent streams, if any]
  MODEL: [recommended tiers per step]
  ESTIMATED: [calls | time]
```

### /build (build.md)
```markdown
Run: npm run build 2>&1
Parse output for errors.
Report errors with file:line format.
Suggest fixes for common patterns:
- Type errors → show expected vs actual
- Import errors → check path and exports
- OOM → NEVER use standalone tsc, only npm run build
NEVER run standalone tsc — causes OOM at current codebase scale.
```

---

## HOOK CONFIGURATIONS

### .claude/settings.json
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "command": "npm run build 2>&1 | tail -5",
        "description": "Auto-build after every file edit"
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "command": "node scripts/validate-safety-score.js",
        "description": "Safety score context check before bash"
      },
      {
        "matcher": "Write",
        "command": "node scripts/anti-regression-check.js",
        "description": "Backup + size check before file overwrites"
      }
    ]
  }
}
```

### Why Deterministic Hooks Matter
```
MCP hooks (probabilistic): Claude may skip based on context pressure or reasoning
Claude Code hooks (deterministic): ALWAYS fire, no exceptions, no reasoning required

Use MCP hooks for: safety calculations, registry validation, quality enforcement
Use Code hooks for: build verification, anti-regression, file backup

Both systems are complementary, not competing.
```

---

## PLUGIN PACKAGING (R6 Exit Gate)

At R6 completion, bundle all PRISM Claude Code configuration as a distributable plugin:

### Contents
```
prism-claude-code-plugin/
├── CLAUDE.md                    # Root project context
├── src/engines/CLAUDE.md        # Engine conventions
├── src/dispatchers/CLAUDE.md    # Dispatcher patterns
├── .claude/
│   ├── settings.json            # Hook configurations
│   ├── agents/
│   │   ├── prism-safety-reviewer.md
│   │   ├── prism-registry-expert.md
│   │   ├── prism-architect.md
│   │   ├── prism-test-runner.md
│   │   └── prism-data-validator.md
│   ├── commands/
│   │   ├── boot.md
│   │   ├── gate.md
│   │   ├── checkpoint.md
│   │   ├── plan.md
│   │   └── build.md
│   └── skills/
│       ├── cutting-parameters.md
│       ├── material-selection.md
│       ├── safety-validation.md
│       └── ... (15 total)
├── scripts/
│   ├── validate-safety-score.js
│   └── anti-regression-check.js
└── README.md                    # Setup instructions
```

### Verification Criteria
```
□ Fresh install on clean machine produces working PRISM dev environment
□ Time from plugin install to first successful /boot: < 5 minutes
□ All 5 subagents respond to domain queries
□ All 5 slash commands execute
□ At least 10/15 skills auto-load on relevant topics
□ Post-edit build hook fires
□ MCP server connection established
```

This plugin bridges to R11 product packaging — the same distribution mechanism
scales to customer-facing PRISM installations.
