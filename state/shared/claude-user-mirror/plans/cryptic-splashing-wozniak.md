# Plan: 10-Agent /rgs Protocol Scrutiny of All PRISM Roadmaps

## Context

14 active PRISM roadmaps need scrutiny for /rgs protocol compliance (micro sessions, strategic compaction points) and ECC/PCCA enhancement activation. Exploration found **0/14 roadmaps are fully /rgs-compliant** — critical violations exist across all files.

**ECC = PCCA (Prism Capability Conversion and Activation) + EIGC (Engine Integrity Gap Closure)**. These enhancement tracks convert latent knowledge assets into runtime capabilities but exist only as design specs — they need to be activated into the roadmaps.

---

## Part 1: 10-Agent Roster (All Parallel, Read-Only Scrutiny)

### Agent 1: Protocol Structure Auditor
**Focus**: SESSION block wrappers, field ordering, envelope-level fields
**Files**: PRISM-UNIFIED-ROADMAP.md, CAMX-v24.md
**Checks**: Session block presence, code-fence syntax, required field ordering (SMART CONFIG → KNOWLEDGE SOURCES → INTENT → WORK → FORGE-TRIPLE → EXIT GATE)

### Agent 2: Unit Naming & Taxonomy Auditor
**Focus**: U-XXX convention compliance, domain prefixes, collision detection
**Files**: CAMX-v24.md, MCP-AUTOMATION-HARDENING (gold standard), LATHE, MILLING roadmaps
**Checks**: Unit naming format, sequential numbering, cross-roadmap uniqueness, renaming table

### Agent 3: SMART CONFIG Completeness Auditor
**Focus**: Role/model/effort fields, context budget, model-to-role alignment
**Files**: CAMX-v24.md, MCP-AUTOMATION-HARDENING, FIVE-AXIS roadmap
**Checks**: SMART CONFIG completeness (role, model, effort, context budget), R1-R8 role matrix compliance

### Agent 4: Knowledge Source Normalization Auditor
**Focus**: Duplicated vs canonical knowledge sources, per-session specificity
**Files**: LATHE, GRINDING, MILL-TURN, TRIBAL-KNOWLEDGE-PROPAGATION roadmaps
**Checks**: Cross-roadmap duplication matrix, per-session sources, source hierarchy enforcement

### Agent 5: Forge-Triple & 4-LOOP Protocol Auditor
**Focus**: Forge-triple per-unit declarations, 4-LOOP as EXIT GATE
**Files**: CAMX-v24.md, WATERJET, WIRE-EDM, LASER roadmaps
**Checks**: Forge-triple inline format (hook+action+skill), 4-LOOP labeled as EXIT GATE, per-unit specificity

### Agent 6: Physics & Domain Rigor Auditor (Machinist Perspective)
**Focus**: Physics formula correctness, safety-critical gating, machinist trust
**Files**: CAMX-v24.md (physics sessions), FIVE-AXIS, MILL-TURN roadmaps
**Checks**: Kienzle/Taylor references, PhysicsFusion tier >= 2 gating, force-thermal-wear coupling, collision safety

### Agent 7: PCCA/EIGC Milestone Activation Auditor
**Focus**: Capability conversion enhancements, milestone JSON generation needs
**Files**: PCCA design spec, EIGC design spec, PRISM-UNIFIED-ROADMAP.md, CAMX-v24.md
**Checks**: PCCA-MS0A..MS8 activation, EIGC-MS0A..MS11 activation, asset conversion taxonomy, flagship pillar mapping, missing milestone JSONs

### Agent 8: Sequencing & Dependency Integrity Auditor
**Focus**: Dependency DAG consistency, cross-roadmap gates, cycle detection
**Files**: PRISM-UNIFIED-ROADMAP.md, CAMX-v24.md, MACHINE-HANDBOOK-INTELLIGENCE roadmap
**Checks**: Main path ordering, cross-roadmap dependencies, machine phase gates, QA track scheduling, CONVERGE absorption consistency

### Agent 9: Compact Delimiter & Context Budget Auditor
**Focus**: /compact checkpoints, compaction interval, context budget per session
**Files**: CAMX-v24.md, LATHE, GRINDING, RESOURCE-LEARNING-HARDENING roadmaps
**Checks**: Formal /compact delimiters, 2-3 unit compaction intervals, HANDOFF.md references, context budget estimates, /roadmap-quality-check calls

### Agent 10: Cross-Roadmap System Coherence Auditor
**Focus**: Cross-document consistency, ownership conflicts, orphaned references
**Files**: PRISM-UNIFIED-ROADMAP.md, CAMX-v24.md (overlays), MCP-AUTOMATION-HARDENING, TRIBAL-KNOWLEDGE-PROPAGATION
**Checks**: Authority table consistency, ownership conflicts, overlay coverage in index, revenue milestone consistency, milestone registry completeness, status field reconciliation

---

## Part 2: Coverage Matrix

Every roadmap reviewed by 2+ agents. v24 and Unified covered by 6+ agents each.

| Roadmap | Agents |
|---------|--------|
| PRISM-UNIFIED-ROADMAP | 1, 7, 8, 10 |
| CAMX-v24 | 1, 2, 3, 5, 6, 7, 8, 9, 10 |
| LATHE | 2, 4, 9 |
| MILLING | 2 |
| MILL-TURN | 4, 6 |
| FIVE-AXIS | 3, 6 |
| GRINDING | 4, 9 |
| LASER | 5 |
| WATERJET | 5 |
| WIRE-EDM | 5 |
| MCP-AUTO-HARDENING | 2, 3, 10 |
| RESOURCE-LEARNING | 9 |
| TRIBAL-KNOWLEDGE | 4, 10 |
| HANDBOOK-INTEL | 8 |

---

## Part 3: Expected Output Per Agent

Each agent produces a structured report:
```
AGENT N: {Role Name}
Score: XX/100
CRITICAL: [blocking violations]
MAJOR: [significant gaps]
MINOR: [style/consistency issues]
FIX ACTIONS: [specific, actionable remediation steps with file paths]
```

---

## Part 4: Post-Scrutiny Consolidation

After all 10 agents complete, I will:

1. **Merge** all 10 reports into a unified compliance scorecard (14 roadmaps x 10 dimensions)
2. **Prioritize** fix actions into 4 batches:
   - Batch 1 (structural): SESSION blocks, SMART CONFIG, U-XXX naming
   - Batch 2 (content): KNOWLEDGE SOURCES, FORGE-TRIPLE, EXIT GATE labels
   - Batch 3 (activation): PCCA/EIGC SESSION blocks, milestone JSONs, dependency declarations
   - Batch 4 (polish): /compact delimiters, context budgets, cross-roadmap coherence
3. **Report** consolidated findings to user with overall score and recommended execution order

---

## Part 5: Execution Approach

- All 10 agents launch in a single parallel batch (read-only scrutiny, no edits)
- Each agent uses `subagent_type: "reviewer"` for focused code review
- Agents run in background to avoid blocking
- After all complete, consolidation pass synthesizes findings
- No roadmap edits during scrutiny — findings only

---

## Key Files

| File | Role | Path |
|------|------|------|
| Unified Roadmap | Target | H:\PRISM\PRISM-UNIFIED-ROADMAP.md |
| v24 Canonical | Target | H:\prism\CAMX-RESTRUCTURED-ROADMAP-v24.md |
| 8 Machine Roadmaps | Target | H:\PRISM\{MACHINE}-COMPREHENSIVE-ROADMAP.md |
| 4 Child Roadmaps | Target | H:\prism\mcp-server\data\docs\roadmap\*.md |
| PCCA Design Spec | Reference | H:\prism\mcp-server\docs\superpowers\specs\2026-03-25-prism-capability-conversion-roadmap-design.md |
| EIGC Design Spec | Reference | H:\prism\mcp-server\docs\superpowers\specs\2026-03-25-engine-integrity-gap-closure-roadmap-design.md |
| Roadmap Exemplar | Reference | H:\prism\mcp-server\data\templates\roadmap-exemplar.md |
| Roadmap Schema | Reference | H:\prism\mcp-server\data\schemas\roadmap-index.schema.json |
| Scrutinize Script | Reference | H:\prism\mcp-server\src\scripts\scrutinize-roadmap.ts |
