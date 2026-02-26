# CLAUDE CODE INTEGRATION FOR PRISM DEVELOPMENT
# How and where to use Claude Code alongside Claude Desktop for maximum velocity
# v14.2.1 | Created: 2026-02-16

---

## STATUS (February 2026)

Claude Code v2.1.42 confirmed operational with PRISM:
  ✅ Runs simultaneously with Claude Desktop (Electron lock conflict resolved)
  ✅ Reads PRISM filesystem (C:\PRISM\mcp-server\)
  ✅ CLAUDE.md project context auto-loads (safety rules, build commands, wiring protocol)
  ✅ All 31 dispatchers visible and navigable

New capabilities since January:
  - Agent Teams: multi-agent collaboration (experimental, CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1)
  - Skills: .claude/skills/ with auto-loading
  - Memories: automatic recording and recall across sessions
  - Opus 4.6: 1M context window (beta), fast mode, adaptive thinking
  - Git worktree isolation: parallel sessions on same repo without conflicts
  - Desktop Code tab: run Claude Code sessions from Desktop GUI

---

## OPTIMAL TOOL ALLOCATION

| Task Type | Best Tool | Why |
|-----------|-----------|-----|
| Planning, brainstorming, roadmap | Claude Desktop | Memory, web search, project knowledge |
| Heavy implementation sessions | Claude Code CLI | Direct file access, no MCP overhead |
| Bulk file operations (registries) | Claude Code CLI | Native terminal, batch processing |
| Registry data processing (3518+) | Claude Code CLI | Direct filesystem, parallel agents |
| Build/test cycles | Claude Code CLI | Native npm/tsc, immediate feedback |
| Safety calculations/validation | Claude Desktop | MCP tools, structured outputs, safety hooks |
| Parallel development tasks | Claude Code agents | Multiple isolated sessions, Git worktrees |
| Session continuity/state mgmt | Claude Desktop | Memory system, project context, past chats |
| Code review | Claude Code CLI | /install-github-app, PR review automation |
| Data campaigns (R3-MS4) | Claude Code agents | Inherently parallelizable batches |

---

## PRISM-SPECIFIC CLAUDE CODE SETUP

### 1. CLAUDE.md (already at C:\PRISM\mcp-server\CLAUDE.md)
Project context file read automatically. Contains safety rules, build commands, key paths,
wiring protocol, anti-regression rules.

### 2. Skills for Claude Code (create in C:\PRISM\mcp-server\.claude\skills\)

prism-safety.md:
  - S(x) >= 0.70 hard block rules
  - Structured output requirements (AtomicValue schema)
  - Safety invariants INV-S1 through INV-S5
  - Uncertainty propagation requirements

prism-build.md:
  - npm run build (never standalone tsc)
  - Anti-regression protocol
  - Version pinning rules
  - Test suite structure

prism-registries.md:
  - Registry data formats (materials, machines, tools, formulas)
  - DataValidationEngine usage
  - ToolIndex schema
  - Loading procedures

prism-wiring.md:
  - D2F (Dispatchers to Formulas) wiring protocol
  - F2E (Formulas to Engines) mapping
  - E2S (Engines to Services) chain
  - How to add new actions without breaking existing wiring

### 3. Agent Team Configuration (for parallelizable work)

R1-MS5/MS6/MS7 (independent, can run in parallel):

  Agent 1: Tool Schema Normalization (R1-MS5)
    Working on: src/engines/ToolIndex.ts, src/data/tools/
    Git worktree: feature/r1-ms5-tool-schema

  Agent 2: Material Enrichment (R1-MS6)
    Working on: src/data/materials/, src/engines/MaterialRegistry.ts
    Git worktree: feature/r1-ms6-material-enrichment

  Agent 3: Machine Population (R1-MS7)
    Working on: src/data/machines/, src/engines/MachineRegistry.ts
    Git worktree: feature/r1-ms7-machine-population

R3-MS4 (batch campaigns, different material groups):

  Agent 1: Steels batch (materials 1-1000)
  Agent 2: Aluminum/Copper/Brass batch (materials 1001-2000)
  Agent 3: Exotic alloys batch (materials 2001-3518)
  Each writes independent CAMPAIGN_STATE.json → merge results

---

## PHASE-BY-PHASE CLAUDE CODE OPPORTUNITIES

| Phase | Claude Code Tasks | Estimated Session Savings |
|-------|------------------|--------------------------|
| DA-MS0 | PROTOCOLS_CORE split, context audit scripting | ~20% faster |
| R1-MS5/6/7 | Parallel agents on tool/material/machine (3 worktrees) | ~40% faster |
| R1-MS8 | Formula registry wiring (bulk file processing, 162 classification) | ~25% faster |
| R2-MS0 | 50-calc matrix batch execution | ~30% faster |
| R2-MS1.5 | Golden dataset generation | ~20% faster |
| R3-MS4 | Data enrichment campaigns (350 batches, parallelizable) | ~50% faster |
| R4-MS3 | API endpoint implementation (boilerplate routes, validation) | ~35% faster |
| R7-MS0 | Physics engine wiring (495+ JS modules, bulk reading/parsing) | ~40% faster |
| R7-MS6 | Manufacturer catalog extraction (9.7GB processing) | ~45% faster |

Conservative total: **15-25% reduction in overall session count** (46-68 → ~38-55)

---

## WORKFLOW: WHEN TO USE WHICH TOOL

```
START SESSION
  ├── Need planning/roadmap work? → Claude Desktop
  ├── Need bulk file processing? → Claude Code CLI
  ├── Need parallel independent tasks? → Claude Code agent teams
  ├── Need safety calc validation? → Claude Desktop (MCP safety hooks)
  ├── Need build/test? → Claude Code CLI (native npm)
  └── Need code review? → Claude Code CLI (/install-github-app)

DURING SESSION
  ├── Hit MCP tool overhead bottleneck? → Switch to Claude Code for implementation
  ├── Need to check past conversation? → Claude Desktop (memory + past chats)
  ├── Need web search for reference? → Claude Desktop
  └── Need to process 100+ files? → Claude Code (always)

END SESSION
  ├── Update CURRENT_POSITION.md → Either tool (both have filesystem access)
  ├── Record in ROADMAP_TRACKER.md → Either tool
  └── State save + handoff → Claude Desktop (memory persistence)
```

---

## SAFETY RULES FOR CLAUDE CODE SESSIONS

Claude Code sessions MUST follow the same safety rules as Desktop sessions:
  1. S(x) >= 0.70 is a HARD BLOCK — never skip, even for "quick tests"
  2. Never modify goldenBenchmarks.json
  3. validate_anti_regression before file replacements
  4. All writes use atomic pattern (write .tmp → rename)
  5. Check wiring files before implementing new actions
  6. No standalone tsc (OOM) — always npm run build

CLAUDE.md at project root enforces these for CLI sessions.
.claude/skills/ provide deeper context for each domain.

---

## TESTING CLAUDE CODE (completed 2026-02-16)

Quick Validation: ✅ PASSED
  claude --version → 2.1.42
  Filesystem access → reads package.json, CURRENT_POSITION.md
  Codebase navigation → counts 31 dispatchers correctly
  CLAUDE.md context → responds with correct safety rules

Parallel Operation: ✅ PASSED
  Claude Desktop chat active simultaneously with Claude Code CLI
  Both read/write to same PRISM directory without conflict

Agent Teams: PENDING (requires CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1)
  Test during DA-MS0 Step 5
