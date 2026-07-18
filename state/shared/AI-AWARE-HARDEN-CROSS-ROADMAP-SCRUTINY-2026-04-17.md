# AI-AWARE-HARDEN Cross-Roadmap Scrutiny Pass 2
**Date:** 2026-04-17
**Scope:** AI-AWARE-HARDEN v2 vs LATHE-MASTER, MILL-AGI, WEDM-CONSOLIDATED
**Auditor:** Claude Opus 4.5

---

## Executive Summary

**Score Before:** 86/100 (Stage 10 single-roadmap scrutiny)
**Score After:** 79/100 (cross-roadmap coherence issues found)
**Verdict:** CONDITIONAL PASS — 4 critical issues must be resolved

---

## 1. Cross-Roadmap Dependency Analysis

### 1.1 MILL-AGI-UNIFIED-ROADMAP References AI-AWARE-HARDEN

**Finding:** STALE DATA in MILL-AGI P0.7

The Mill roadmap (line 219) claims:
> "Complete: U-AWR07, 08, 09, 16, 21, 22, 25, 27, 28, 29, 30 (the 11 units AI-AWARE-HARDEN doesn't finish)"

**Actual Status (per 2026-04-17 audit):**
- U-AWR07 ✅ ALREADY COMPLETE (MIT Course Engine, commit f724410bb)
- U-AWR16 ✅ ALREADY COMPLETE (Canonical constants, commit 76787a4dd)
- U-AWR08, 09, 21, 22, 25, 27-30 ⏳ Still pending (9 units, not 11)
- **NEW:** U-AWR31, 32, 33 added in v2 — Mill roadmap doesn't know

**Impact:** MILL-AGI P0.7 will duplicate U-AWR07 and U-AWR16 if not updated.

**Fix Required:**
1. Update MILL-AGI P0.7 to remove U-AWR07 and U-AWR16 (already done)
2. Add awareness of U-AWR31, 32, 33 (new gap-fill units)
3. Declare explicit dependency: `MILL-AGI P0.7 depends_on AI-AWARE-HARDEN v2`

---

### 1.2 LATHE-MASTER-UNIFIED-ROADMAP Consumes AI-AWARE Assets

**Finding:** Proper consumption, no conflicts

The Lathe roadmap references:
- `PRISMSelfAwarenessEngine.searchTribalKnowledge`
- `searchPlaybookRules` (line 190)
- `TribalKnowledgeEngine`, `MachiningPlaybookEngine` (line 612)

This is **correct usage** — Lathe CONSUMES the PlaybookRulesEngine that AI-AWARE-HARDEN U-AWR32 BUILDS.

**No fix required.** But add explicit dependency note.

---

### 1.3 WEDM-CONSOLIDATED-ROADMAP Independence

**Finding:** No direct AI-AWARE-HARDEN references

WEDM builds its own awareness via:
- `WEDMAutonomyLevelEngine` (L0-L5 autonomy)
- `WEDM_DIGEST.json` baseline verification
- 39 WEDM-specific state files

**Assessment:** WEDM is correctly scoped as domain-specific. It should CONSUME the shared FormulaOrchestrator and PlaybookRulesEngine once built.

**Fix Required:**
1. Add WEDM as downstream consumer of U-AWR31 (FormulaOrchestrator)
2. Add WEDM formulas (14 cited) to FormulaOrchestrator scan scope

---

## 2. Overlap Detection (Double-Build Risk)

### 2.1 FormulaOrchestrator — NO DUPLICATES
| Roadmap | FormulaOrchestrator | Status |
|---------|---------------------|--------|
| AI-AWARE-HARDEN | U-AWR31 | BUILDS (authoritative) |
| LATHE-MASTER | — | CONSUMES via awareness |
| MILL-AGI | — | CONSUMES via awareness |
| WEDM-CONSOLIDATED | — | Should CONSUME |

**Verdict:** Clean ownership. AI-AWARE-HARDEN U-AWR31 is the SINGLE builder.

### 2.2 PlaybookRulesEngine — NO DUPLICATES
| Roadmap | PlaybookRulesEngine | Status |
|---------|---------------------|--------|
| AI-AWARE-HARDEN | U-AWR32 | BUILDS (500+ rules target) |
| LATHE-MASTER | `searchPlaybookRules` | CONSUMES |
| MILL-AGI | — | CONSUMES via awareness |
| WEDM-CONSOLIDATED | — | Should CONSUME |

**Verdict:** Clean ownership. AI-AWARE-HARDEN U-AWR32 is the SINGLE builder.

### 2.3 MIT Course Integration — POTENTIAL OVERLAP
| Roadmap | MIT Work | Status |
|---------|----------|--------|
| AI-AWARE-HARDEN | U-AWR33 (9→50 courses) | BUILDS |
| LATHE-MASTER | Consumes MIT via tribal tips | CONSUMES |
| MILL-AGI | "neural model provenance cite MIT" | CONSUMES |
| WEDM-CONSOLIDATED | "26 MIT-derived tips" | CONSUMES |

**Assessment:** AI-AWARE-HARDEN is the primary MIT integrator. No overlap.

---

## 3. Gap Analysis (Things AI-AWARE-HARDEN Should Cover)

### 3.1 Domain-Specific Playbook Rules
The 500+ rules in U-AWR32 should include:
- **Lathe rules:** ~100 (turning, threading, parting, grooving)
- **Mill rules:** ~150 (roughing, finishing, HSM, trochoidal)
- **WEDM rules:** ~80 (wire selection, flushing, skim passes)
- **General rules:** ~170 (setup, safety, quality)

**Current spec:** Categories listed but not domain-mapped.

**Fix Required:** Update U-AWR32 to explicitly allocate rules across domains.

### 3.2 Cross-Domain Formula Coverage
FormulaOrchestrator (U-AWR31) must scan formulas from:
- Lathe: Kienzle turning, Taylor tool life, chip breaking
- Mill: Kienzle milling, chatter stability, deflection
- WEDM: Klocke Ra, DiBitonto crater, wire deflection
- General: 509 formulas in FormulaRegistry

**Current spec:** "509 formulas scanned" — doesn't mention domain breakdown.

**Fix Required:** Add domain coverage matrix to U-AWR31 exit criteria.

---

## 4. Dependency Chain Validation

### 4.1 Required Dependency Declarations

```
AI-AWARE-HARDEN v2
├── U-AWR31 (FormulaOrchestrator) ──────────────────────┐
│   └── available_to: LATHE-MASTER, MILL-AGI, WEDM-CONSOLIDATED
├── U-AWR32 (PlaybookRulesEngine) ──────────────────────┤
│   └── available_to: LATHE-MASTER, MILL-AGI, WEDM-CONSOLIDATED
└── U-AWR33 (MIT Deep Integration) ─────────────────────┘
    └── depends_on: U-AWR31

MILL-AGI P0.7
└── depends_on: AI-AWARE-HARDEN U-AWR08, 09, 21, 22, 25, 27-30
    (NOT U-AWR07, U-AWR16 — already complete)

LATHE-MASTER P0.4
└── depends_on: AI-AWARE-HARDEN U-AWR31, U-AWR32 (via awareness)

WEDM-CONSOLIDATED P1
└── should_depend_on: AI-AWARE-HARDEN U-AWR31 (formula wiring)
```

---

## 5. 10-Agent Scrutiny Scores (Pass 2)

| Agent | Pass 1 | Pass 2 | Delta | Notes |
|-------|--------|--------|-------|-------|
| 1. Protocol Structure | 88 | 88 | 0 | No change |
| 2. Unit Naming | 95 | 95 | 0 | No change |
| 3. Dependency Graph | 85 | 72 | -13 | **MILL-AGI stale data not declared** |
| 4. Exit Gate Rigor | 82 | 78 | -4 | Domain allocation missing |
| 5. Completeness Coverage | 90 | 88 | -2 | WEDM consumer not added |
| 6. Physics Rigor | 80 | 80 | 0 | No change |
| 7. Forge-Triple Ownership | 85 | 85 | 0 | Clean ownership verified |
| 8. Feature Cascade | 88 | 75 | -13 | **available_to missing WEDM** |
| 9. MCP Utilization | 82 | 82 | 0 | No change |
| 10. Cross-Roadmap Coherence | 85 | 67 | -18 | **CRITICAL: MILL-AGI conflict** |

**Average Pass 2:** 79/100 (down from 86)
**Verdict:** CONDITIONAL PASS — must fix agents 3, 8, 10 before proceeding

---

## 6. Required Fixes

### Fix 1: Update MILL-AGI P0.7 (CRITICAL)
```diff
- Complete: U-AWR07, 08, 09, 16, 21, 22, 25, 27, 28, 29, 30 (the 11 units AI-AWARE-HARDEN doesn't finish)
+ Complete: U-AWR08, 09, 21, 22, 25, 27, 28, 29, 30 (9 units)
+ Note: U-AWR07 and U-AWR16 already complete. New U-AWR31, 32, 33 added in v2 — those remain in AI-AWARE-HARDEN scope.
```

### Fix 2: Add WEDM to available_to (HIGH)
In AI-AWARE-HARDEN.json stage7_forgeTriple, add:
```json
"available_to": ["LATHE-MASTER", "MILL-AGI", "WEDM-CONSOLIDATED"]
```

### Fix 3: Add domain allocation to U-AWR32 (HIGH)
```json
"ruleCategories": {
  "lathe": { "target": 100 },
  "mill": { "target": 150 },
  "wedm": { "target": 80 },
  "general": { "target": 170 }
}
```

### Fix 4: Add domain coverage to U-AWR31 exit criteria (MEDIUM)
```
"exitCriteria": [
  ...existing...,
  "Lathe formulas (Kienzle turning, Taylor) mapped",
  "Mill formulas (Kienzle milling, chatter) mapped",
  "WEDM formulas (Klocke Ra, DiBitonto) mapped"
]
```

---

## 7. Post-Fix Score Projection

After applying fixes 1-4:
- Agent 3 (Dependency): 72 → 85
- Agent 8 (Feature Cascade): 75 → 88
- Agent 10 (Cross-Roadmap): 67 → 88

**Projected Average:** 85/100 (PASS)

---

## 8. Recommended Execution Order (Updated)

```
PHASE 1 — CRITICAL GAP FILL (AI-AWARE-HARDEN scope)
  U-AWR32: PlaybookRulesEngine + 500 rules (WITH domain allocation)
  U-AWR31: FormulaOrchestrator (WITH domain coverage)

PHASE 2 — EXTRACTION (AI-AWARE-HARDEN scope)
  U-AWR08-09: Manufacturer catalogs + JM DIE patterns

PHASE 3 — CROSS-ROADMAP SYNC
  Update MILL-AGI P0.7 to remove stale unit references
  Add WEDM-CONSOLIDATED as downstream consumer

PHASE 4 — REMAINING UNITS
  U-AWR21, 22, 25 (Session 6 completion)
  U-AWR27-30, 33 (Extended pipelines + MIT)
```

---

## 9. Sign-Off

- [ ] Fix 1 applied (MILL-AGI P0.7 updated)
- [ ] Fix 2 applied (WEDM added to available_to)
- [ ] Fix 3 applied (domain allocation added)
- [ ] Fix 4 applied (domain coverage exit criteria)
- [ ] Re-run scrutiny → score ≥85

**Scrutiny Pass 2 Complete.**
