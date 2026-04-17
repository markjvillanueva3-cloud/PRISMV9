# PRISM Agent Architecture — User-Level Agents

8 specialized agents for the PRISM CNC manufacturing intelligence system.
These complement the 3 project-level agents at `C:/PRISM/mcp-server/.claude/agents/`.

## Agent Inventory

| Agent | Model | Purpose | Mode |
|---|---|---|---|
| **physics-reviewer** | opus | Verify physics formulas against canonical constants | read-only, worktree |
| **test-runner** | haiku | Run targeted test suites after code changes | background |
| **catalog-enricher** | sonnet | Fill gaps in tool/material/machine catalogs | interactive |
| **code-archaeologist** | sonnet | Deep read-only codebase exploration and mapping | read-only |
| **dispatcher-wirer** | sonnet | Wire engines to dispatchers (z.enum, schemas, cases) | interactive |
| **doc-generator** | haiku | Batch JSDoc generation for undocumented code | background |
| **regression-hunter** | opus | Root-cause analysis of test failures | read-only, worktree |
| **build-doctor** | sonnet | Diagnose and fix TypeScript build errors | interactive |

## Model Tier Strategy

- **opus**: Safety-critical review tasks requiring deep reasoning (physics-reviewer, regression-hunter)
- **sonnet**: Implementation and exploration tasks requiring good judgment (catalog-enricher, code-archaeologist, dispatcher-wirer, build-doctor)
- **haiku**: Fast, repetitive tasks that benefit from low cost (test-runner, doc-generator)

## Existing Project-Level Agents

Located at `C:/PRISM/mcp-server/.claude/agents/`:
- **safety-physics** (opus) — Safety oracle, S(x) scoring, HARD BLOCK authority
- **implementer** (sonnet) — Code changes, wiring, refactoring
- **verifier** (haiku) — Regression testing, anti-regression audits

## Usage

Invoke from Claude Code CLI:
```
/agent physics-reviewer   — Review a physics change
/agent test-runner        — Run tests in background
/agent catalog-enricher   — Fill catalog gaps
/agent code-archaeologist — Explore architecture
/agent dispatcher-wirer   — Wire engines to dispatchers
/agent doc-generator      — Generate JSDoc in background
/agent regression-hunter  — Investigate test failures
/agent build-doctor       — Fix build errors
```
