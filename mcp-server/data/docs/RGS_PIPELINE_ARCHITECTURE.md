# RGS Pipeline Architecture

## Purpose
Define the 7-stage generation pipeline that converts a human brief into a complete RGS-format roadmap. This document specifies input/output contracts for each stage, error handling, and token budgets.

## Pipeline Overview

```
BRIEF (string) ──► [1] BRIEF ANALYSIS ──► [2] CODEBASE AUDIT ──► [3] SCOPE ESTIMATION
                                                                        │
                   [7] OUTPUT FORMATTING ◄── [6] DEPENDENCY RESOLUTION ◄── [5] UNIT POPULATION ◄── [4] PHASE DECOMPOSITION
                        │
                        ▼
                   ROADMAP (RoadmapEnvelope) + position.json + scrutiny-log.json
```

---

## Stage 1 — BRIEF ANALYSIS

**Input:** Raw human request string
**Output:** `StructuredBrief` object

```typescript
interface StructuredBrief {
  goal: string;           // What the user wants to achieve
  scope: string;          // Boundaries — what's in and out
  constraints: string[];  // Technical or time constraints
  domain: string;         // "manufacturing" | "infrastructure" | "tooling" | "meta" | "product"
  urgency: "low" | "normal" | "high" | "critical";
  complexity: "S" | "M" | "L" | "XL";
  category: "new_feature" | "refactor" | "integration" | "infrastructure" | "documentation" | "meta_system";
}
```

**Logic:**
1. Extract intent from raw text
2. Classify category (new_feature, refactor, integration, infrastructure, documentation, meta_system)
3. Estimate complexity: S (hours) / M (1-2 days) / L (3-5 days) / XL (1+ week)
4. Identify domain from keywords and context
5. If brief is ambiguous (no clear scope or conflicting signals), return clarifying questions instead

**Error handling:** If brief is <10 characters, return error requesting more detail.

**Token budget:** ~500 tokens output

---

## Stage 2 — CODEBASE AUDIT

**Input:** `StructuredBrief`
**Output:** `CodebaseAudit` object

```typescript
interface CodebaseAudit {
  existing_skills: { id: string; relevance: string }[];
  existing_scripts: { name: string; relevance: string }[];
  existing_hooks: { name: string; relevance: string }[];
  related_dispatchers: { name: string; actions: string[] }[];
  related_engines: { name: string; purpose: string }[];
  reusable_patterns: { pattern: string; location: string }[];
}
```

**Logic:**
1. Search `skills-consolidated/` for skills matching brief keywords
2. Search `src/scripts/` for relevant scripts
3. Search `src/hooks/` for relevant hooks
4. Identify dispatchers that will be used (from MASTER_INDEX dispatcher catalog)
5. Identify engines that will be touched or leveraged
6. Find reusable patterns (existing code that can be extended)

**Tools called:**
- `prism_skill_script:skill_search` with domain keywords
- `prism_knowledge:search` with domain terms
- File search for matching patterns

**Error handling:** If no relevant assets found, return empty arrays (new ground-up work).

**Token budget:** ~1,000 tokens output

---

## Stage 3 — SCOPE ESTIMATION

**Input:** `StructuredBrief` + `CodebaseAudit`
**Output:** `ScopeEstimate` object

```typescript
interface ScopeEstimate {
  phases_count: number;
  units_count: number;
  sessions_estimate: string;  // e.g. "3-5"
  new_skills_needed: number;
  new_scripts_needed: number;
  new_hooks_needed: number;
  files_to_create: number;
  files_to_modify: number;
  estimated_total_tokens: number;
}
```

**Logic — Complexity-to-scope mapping:**
| Complexity | Phases | Units | Sessions |
|-----------|--------|-------|----------|
| S | 1-2 | 3-8 | 1-2 |
| M | 3-4 | 8-20 | 3-5 |
| L | 5-7 | 20-40 | 5-10 |
| XL | 8+ | 40+ | 10+ |

Reusable assets reduce unit count — each reusable skill/script saves ~1-2 units.

**Error handling:** Clamp phases to 1-15 range, units to 1-100 range.

**Token budget:** ~300 tokens output

---

## Stage 4 — PHASE DECOMPOSITION

**Input:** `StructuredBrief` + `ScopeEstimate`
**Output:** `PhaseSkeleton[]`

```typescript
interface PhaseSkeleton {
  id: string;               // e.g. "P1"
  title: string;
  description: string;
  sessions: string;          // e.g. "1-2"
  primary_role: RoleCode;
  primary_model: string;
  dependency_phases: string[];  // phase IDs this depends on
  unit_hints: string[];      // brief description of expected units
}
```

**Logic:**
1. Group related work into logical phases
2. Ensure build order — foundations before features
3. Each phase should be completable in 1-3 sessions
4. Assign primary role based on dominant work type
5. Earlier phases: infrastructure/schema → middle phases: implementation → later phases: testing/integration

**Error handling:** If only 1 phase, still wrap in array. If >15 phases, re-evaluate decomposition.

**Token budget:** ~800 tokens output

---

## Stage 5 — UNIT POPULATION

**Input:** `PhaseSkeleton[]` + `CodebaseAudit` + schema reference
**Output:** Fully populated `RoadmapPhase[]` with `RoadmapUnit[]`

This is the largest and most critical stage. For EVERY unit, ALL mandatory schema fields must be populated:

**Role Assignment Matrix:**
| Unit Type | Role | Model | Effort |
|-----------|------|-------|--------|
| Architecture/design | R1 Schema Architect | Opus | 95 |
| Implementation | R2 Implementer | Sonnet | 80 |
| Tests | R3 Test Writer | Sonnet | 75 |
| Security review | R4 Scrutinizer | Opus | 95 |
| Quality review | R5 Reviewer | Opus | 90 |
| Integration/wiring | R6 Integrator | Sonnet | 80 |
| Prompts/templates | R7 Prompt Engineer | Opus | 90 |
| Documentation | R8 Documenter | Haiku | 60 |

**Per-unit checklist:**
- [ ] id, title, phase, sequence assigned
- [ ] Role and model assigned per matrix
- [ ] Effort set (60-95 based on complexity)
- [ ] Numbered steps — imperative, specific, with tool calls
- [ ] Entry conditions — testable boolean statements
- [ ] Exit conditions — testable boolean statements
- [ ] Rollback plan defined
- [ ] Deliverables with paths, types, line estimates
- [ ] Dependencies on other units listed
- [ ] Index flags set (creates_skill, creates_script, etc.)

**Error handling:** Validate each unit against RoadmapUnit schema before proceeding.

**Token budget:** ~2,000-5,000 tokens output (scales with unit count)

---

## Stage 6 — TOOL & DEPENDENCY RESOLUTION

**Input:** Populated phases with units
**Output:** Validated phases + `tool_map` + `role_matrix` + `dependency_graph`

**Validation checks:**
1. All `prism_*` tool references resolve to actual dispatchers (32 dispatchers, 541 actions)
2. All skill references resolve to entries in SkillRegistry (61 skills)
3. All script references resolve to entries in ScriptRegistry (48 scripts)
4. No circular dependencies (topological sort must succeed)
5. Sequence numbers respect dependency order
6. Every deliverable is produced by exactly one unit (no orphans, no duplicates)

**Output artifacts:**
- `tool_map[]`: Which tools are used by which units
- `role_matrix[]`: Which roles appear and their unit count
- `dependency_graph`: ASCII dependency graph

**Error handling:** If circular dependency found, break the cycle and report warning. If tool doesn't exist, flag as error.

**Token budget:** ~500 tokens output

---

## Stage 7 — OUTPUT FORMATTING

**Input:** Complete `RoadmapEnvelope` object
**Output:** Formatted `.md` file + `position.json` + `scrutiny-log.json`

**Markdown format:** Follows the canonical exemplar structure:
1. Header with metadata (id, version, title, brief, created_at)
2. Deliverables inventory table
3. Role matrix table
4. Tool map table
5. Dependency graph (ASCII)
6. Leverage table (existing assets reused)
7. Scrutiny config block
8. Phase sections with unit details
9. Gate sections with criteria

**State files:**
- `data/state/{roadmap-id}/position.json` — initialized to first unit
- `data/state/{roadmap-id}/scrutiny-log.json` — empty, ready for passes

**Error handling:** Validate final envelope against RoadmapEnvelope schema before writing.

**Token budget:** ~1,500 tokens output

---

## Total Token Budget

| Stage | Tokens (est) |
|-------|-------------|
| 1. Brief Analysis | 500 |
| 2. Codebase Audit | 1,000 |
| 3. Scope Estimation | 300 |
| 4. Phase Decomposition | 800 |
| 5. Unit Population | 2,000-5,000 |
| 6. Dependency Resolution | 500 |
| 7. Output Formatting | 1,500 |
| **Total** | **6,600-9,600** |

---

## Error Recovery Strategy

1. **Stage failure:** If any stage fails validation, retry once with error context
2. **Schema violation:** If a unit fails schema validation, fix and re-validate
3. **Missing assets:** If referenced tools/skills don't exist, flag in warnings array
4. **Token overflow:** If output exceeds budget by >2x, summarize and split
5. **Pipeline abort:** If >3 stages fail, abort and report diagnostics

---

## Decision Rationale

- **7 stages (not fewer):** Each stage has a clear single responsibility and testable output
- **Sequential pipeline:** Stages build on each other — parallelization would require speculative work
- **Typed contracts:** TypeScript interfaces ensure compile-time safety between stages
- **Token budgets:** Prevent runaway generation on complex briefs
- **Schema validation:** Every intermediate and final output validates against Zod schemas
