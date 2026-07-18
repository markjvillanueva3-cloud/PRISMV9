# R0-P0-U04: Skills + Scripts + Hooks Audit

**Date:** 2026-02-24
**Status:** COMPLETE
**Auditor:** R4 Scrutinizer (Sonnet)

---

## 1. Skills Audit

### 1.1 SkillRegistry.ts
- **File:** `src/registries/SkillRegistry.ts`
- **Size:** 1,448 LOC
- **Entries by `id:` count:** 61

### 1.2 Count Reconciliation

| Source | Count | Notes |
|--------|-------|-------|
| SkillRegistry.ts `id:` fields | 61 | Actual registered entries |
| CLAUDE.md | 196 | Overstated |
| Plan baseline | 231 registered + 252 mfg = ~483 | Significantly overstated |
| .claude/skills/ SKILL.md files | 29 | Claude Code skills, not PRISM manufacturing skills |
| data/skills/ directory | Does not exist | Missing |

### 1.3 Findings

| ID | Severity | Finding |
|----|----------|---------|
| U04-H01 | HIGH | SkillRegistry has 61 entries, not 196 (CLAUDE.md) or 231 (plan). Both sources overstate by 3-4x. |
| U04-H02 | HIGH | No mfg- manufacturing skill files found anywhere. Plan claims 252 mfg- files but `data/skills/` doesn't exist. |
| U04-M01 | MEDIUM | The 29 .claude/skills/ SKILL.md files are Claude Code workflow skills, not PRISM manufacturing domain skills. These are two different skill systems that shouldn't be conflated. |

---

## 2. Scripts Audit

### 2.1 ScriptRegistry.ts
- **File:** `src/registries/ScriptRegistry.ts`
- **Size:** 1,186 LOC
- **Entries by `id:` count:** 48

### 2.2 Count Reconciliation

| Source | Count | Notes |
|--------|-------|-------|
| ScriptRegistry.ts `id:` fields | 48 | Actual registered entries |
| CLAUDE.md | 215 | Massively overstated |
| Plan baseline | 215 scripts, 1,038 functions | Massively overstated |

### 2.3 Findings

| ID | Severity | Finding |
|----|----------|---------|
| U04-H03 | HIGH | ScriptRegistry has 48 entries, not 215 as both CLAUDE.md and plan claim. Overstated by 4.5x. |
| U04-M02 | MEDIUM | Plan claims 1,038 functions across 215 scripts. At 48 scripts, actual function count is likely ~200-250. |

---

## 3. Hooks Audit

### 3.1 HookRegistry.ts
- **File:** `src/registries/HookRegistry.ts`
- **Size:** 1,000 LOC
- **Entries by `id:` count:** 59

### 3.2 Hook Source Files (13 domain files + 3 infra)

| Hook File | LOC | Category |
|-----------|-----|----------|
| EnforcementHooks.ts | 1,117 | Enforcement |
| AdvancedManufacturingHooks.ts | 930 | Adv. Manufacturing |
| CrossReferenceHooks.ts | 908 | Cross-Reference |
| LifecycleHooks.ts | 811 | Lifecycle |
| CognitiveHooks.ts | 771 | Cognitive |
| ManufacturingHooks.ts | 763 | Manufacturing |
| ObservabilityHooks.ts | 749 | Observability |
| AutomationHooks.ts | 734 | Automation |
| RecoveryHooks.ts | 701 | Recovery |
| SchemaHooks.ts | 682 | Schema |
| ControllerHooks.ts | 643 | Controller |
| hookBridge.ts | 611 | Infrastructure |
| OrchestrationHooks.ts | 437 | Orchestration |
| AgentHooks.ts | 372 | Agent |
| index.ts | 288 | Barrel/Aggregation |
| hookRegistration.ts | 52 | Registration Bridge |
| **Total** | **10,569** | **16 files** |

### 3.3 Hook Registration Architecture

- `hookRegistration.ts` comment says "112 domain hooks"
- `index.ts` exports `allHooks` array aggregating all 13 domain hook categories
- `registerDomainHooks()` bridges hook definitions to `HookExecutor`
- Categories: enforcement, lifecycle, manufacturing, cognitive, observability, automation, crossReference, advancedManufacturing, recovery, schema, controller, agent, orchestration

### 3.4 Count Reconciliation

| Source | Count | Notes |
|--------|-------|-------|
| HookRegistry.ts `id:` fields | 59 | Registry metadata entries |
| hookRegistration.ts comment | 112 | Domain hooks in source files |
| CLAUDE.md | 62 | Close to HookRegistry's 59 |
| Plan: registered | 162+ | Significantly above actual |
| Plan: generated | 1,107 | Likely computed/generated counts across 41 domains |

### 3.5 Findings

| ID | Severity | Finding |
|----|----------|---------|
| U04-H04 | HIGH | Hook count inconsistency: HookRegistry has 59, hookRegistration says 112, plan says 162+/1,107. Multiple counting methodologies produce different numbers. |
| U04-M03 | MEDIUM | The plan's "1,107 hooks across 41 domains" likely refers to generated/computed combinations rather than individually coded hooks. The actual hook code exists in 13 domain files with ~112 implementations. |
| U04-L01 | LOW | CLAUDE.md says 62 hooks which is close to HookRegistry's 59 but neither matches the 112 in source files. |

---

## 4. Cross-System Analysis

### 4.1 Count Inflation Pattern

Every metric in the plan and CLAUDE.md is inflated compared to what's actually registered in code:

| Resource | Actual | CLAUDE.md | Plan | Inflation Factor |
|----------|--------|-----------|------|------------------|
| Skills | 61 | 196 | 231-483 | 3.2x - 7.9x |
| Scripts | 48 | 215 | 215 | 4.5x |
| Hooks (registry) | 59 | 62 | 162+ | 1.0x - 2.7x |
| Hooks (source) | ~112 | 62 | 1,107 | 0.6x - 9.9x |

### 4.2 Possible Explanations

1. **Planned vs. implemented**: Counts may represent planned targets that were never built
2. **Different counting methodologies**: "Skills" may include generated entries, inline data, or planned mfg- files
3. **Version drift**: Counts may have been accurate at some past state and never updated
4. **Aspirational documentation**: The plan's 509+ formulas admission (109 registered + 400 pending) suggests this pattern extends to other resource types

---

## 5. Summary Findings

### HIGH (4)
- U04-H01: SkillRegistry has 61 entries, not 196/231
- U04-H02: No mfg- manufacturing skill files exist (252 claimed)
- U04-H03: ScriptRegistry has 48 entries, not 215
- U04-H04: Hook count inconsistency (59/112/162+/1,107)

### MEDIUM (3)
- U04-M01: Claude Code skills vs PRISM skills conflation
- U04-M02: Script function count likely ~200-250, not 1,038
- U04-M03: Plan's 1,107 hooks is computed/generated, not individually coded

### LOW (1)
- U04-L01: CLAUDE.md hook count (62) close but not exact match to HookRegistry (59)

---

## 6. Recommendations

1. **Reconcile all resource counts** against actual registry `id:` entries
2. **Distinguish "registered" from "planned"** in all documentation
3. **Create the 252 mfg- skill files** if they're part of the product vision, or remove the claim
4. **Standardize hook counting** — pick one methodology (registry entries, source implementations, or generated combinations) and use it consistently
