# PRISM DATABASE AUDIT & ALL-REGISTRY EXPANSION ROADMAP
## Full Comprehensive Audit — Session 65 (2026-02-15)

**Classification:** MISSION-CRITICAL — Lives depend on correctness  
**Companion to:** TOOL_EXPANSION_ROADMAP.md v2.0  
**Location:** `C:\PRISM\mcp-server\data\docs\roadmap\PRISM_DATABASE_AUDIT_AND_ROADMAP.md`

---

## 1. REGISTRY INVENTORY SNAPSHOT

| Registry | MASTER_INDEX Claims | Live Registry (boot) | Warm Start Cache | On-Disk Files | Status |
|---|---|---|---|---|---|
| Materials | 3,518 | 3,392 | 2,425 | 8 directories, 130+ JSON | **Discrepancy** |
| Machines | 978 (EXTRACTED) | 1,016 | 594 | 37+ JSON (ENHANCED/json) | **Sparse data** |
| Tools | 15,915 (on disk) | 13,967 (deduped) | 11,643 | 14 JSON | Schema inconsistent |
| Alarms | 337 (CONTROLLER_ALARM_DB) | 10,576 | 10,576 | 3 core + 4 extracted | **Fragmented sources** |
| Formulas | 22 | 45 | 45 | 2 JSON | Missing MFG formulas |
| Skills | — | 126 | — | skill files | Internal only |
| Scripts | — | 161 | — | 74 active scripts | Internal only |
| Agents | — | 75 | — | 70 JSON (1,042 capabilities) | Internal only |
| Hooks | — | 25 | — | hook registrations | Internal only |
| **TOTAL** | — | **29,295** | — | — | — |

---

## 2. MATERIALS REGISTRY AUDIT

### 2.1 Directory Proliferation (8 Versions!)

| Directory | Purpose | Should Load? |
|---|---|---|
| `materials/` | **CANONICAL** — ISO-grouped, verified, 127 params each | YES (active) |
| `materials_complete/` | Gen v5 complete with composition, tribology, surface integrity | Not loaded (3,518 entries, different schema) |
| `materials_consolidated/` | Earlier consolidation attempt | Not loaded |
| `materials_enhanced/` | Physics-enhanced versions | Not loaded |
| `materials_gen_v5_archived/` | Archived generation v5 | Archive |
| `materials_mechanical_enhanced/` | Mechanical property enhancements | Not loaded |
| `materials_unified/` | Another consolidation attempt | Not loaded |
| `materials_verified/` | Verification tracking | Not loaded |

### 2.2 Schema Comparison: materials/ vs materials_complete/

**materials/ (canonical, loaded):**
- ID format: CS-1018-ANNEALED (material-condition)
- 127 parameters per entry
- Fields: physical, mechanical, kienzle (per-operation: turning/milling/drilling/boring/reaming), johnson_cook, taylor (per tool material: carbide/ceramic/cbn/hss), cutting_recommendations (turning/milling/drilling), machinability, chip_formation, surface, thermal, weldability, standards
- Verified session 46, data_quality: "verified"
- Cutting recommendations have flat fields: speed_roughing, speed_finishing, feed_roughing, etc.

**materials_complete/ (not loaded, richer in some areas):**
- ID format: P-CS-0014 (group-subcategory-sequence)
- Has full chemical composition (min/max/typical for 17 elements)
- Has tribology section (sliding_friction, adhesion, galling, welding_temperature)
- Has thermal_machining section (heat partition ratios to chip/tool/workpiece)
- Has surface_integrity section (polishability, burr_formation, microstructure_stability)
- Has statistics section (confidence_level, sample_size, standard_deviation)
- Cutting recommendations use nested min/optimal/max structure
- Enhanced fields with uncertainty and confidence per-value

### 2.3 Count Discrepancy Analysis

MASTER_INDEX says 3,518. Registry loads 3,392 (126 gap likely from duplicate IDs across files).
Warm start showing 2,425 is a stale cached value from earlier boot.

### 2.4 Schema Gaps for App-Readiness

1. No UNS/DIN/JIS cross-reference in canonical materials/ — materials_complete/ has richer designation object. App needs machinist to type "4140" and find it.
2. No composition data in canonical — materials_complete/ has 17 elements. Needed for weldability checks.
3. Cutting recommendations use different schemas between the two directories.
4. No direct link from material to recommended tools by ID.

### 2.5 Material Normalization Plan

**Phase M-0: Merge Best of Both Schemas** — Enrich materials/ with composition, designation, tribology from materials_complete/. Result: ~150+ params per material.

**Phase M-1: Build Material Index Layer** — MaterialIndex.ts with indexByDesignation, indexByHardness, indexByComposition.

**Phase M-2: Material-Tool Linking** — iso_group maps to cutting_data keys. preferred_tool_grades links to grade_iso_range.

**Phase M-3: Archive Legacy Directories** — Move 7 non-canonical dirs to archive.

---

## 3. MACHINES REGISTRY AUDIT

### 3.1 Data Quality Assessment

Machine schema has the right structure but most fields are zero or "unknown".

Mazak sample (11 machines): spindle.max_rpm 55% populated, power_continuous 0%, spindle_nose 55%, envelope 0%, tool_changer.capacity 73%.

### 3.2 Critical Gaps

1. **Spindle interface** — Only ~55% populated. MOST IMPORTANT for machine-to-toolholder matching.
2. **Work envelope** — 0% populated. Critical for part fit checks.
3. **Power/torque** — 0% populated. Needed for cut safety validation.
4. **Turret type for lathes** — Field doesn't exist in schema. VDI30/VDI40/BMT55/BMT65 needed.

### 3.3 Machine Normalization Plan

**Phase MCH-0: Field Population Blitz** — Fill spindle specs for top 20 manufacturers from datasheets.
**Phase MCH-1: Add Missing Fields** — turret type, normalize spindle_interface to canonical values.
**Phase MCH-2: Controller-Alarm Linking** — Map controller.brand to alarm controller_family.
**Phase MCH-3: Machine Index Layer** — MachineIndex.ts.

---

## 4. ALARMS REGISTRY AUDIT

### 4.1 Data Sources

337 in core DB (6 controller families). 10,576 in registry (bulk from extracted files for Mazak/Okuma/Mitsubishi/DMG MORI).

### 4.2 Schema Quality

Good structure: alarm_id, controller_family, controller_models, code, name, category, severity, causes, fix_procedure_id, requires_power_cycle, requires_service.

Gaps: Fix procedures are single-line descriptions. No severity levels beyond MEDIUM/HIGH. No related alarm grouping.

### 4.3 Alarm Normalization Plan

**Phase ALM-0: Consolidate** — Merge core + extracted into single ALARMS_MASTER.json.
**Phase ALM-1: Enrich Fix Procedures** — Structured multi-step fix procedures with safety notes.
**Phase ALM-2: Alarm Index** — AlarmIndex.ts with keyword search.

---

## 5. FORMULAS REGISTRY AUDIT

22 formulas in registry. Mostly PLANNING/COORDINATION/QUALITY domain.

Only 3 PHYSICS formulas (Kienzle, Taylor, Johnson-Cook). Missing 9 critical manufacturing calculator formulas: RPM calc, feed rate, MRR, cutting power, torque, surface finish (turning/milling), cost per part, extended Taylor.

**Phase FRM-0:** Add F-CALC-001 through F-CALC-009 for app calculators.

---

## 6. CROSS-REGISTRY LINKING

Core query chain: MATERIAL -> ISO GROUP -> TOOL CUTTING DATA -> TOOL -> TOOLHOLDER -> MACHINE -> ALARMS

New prism_data actions needed: cross_query (material+operation+machine -> tools+params), alarm_diagnose (code+machine -> fix procedure).

---

## 7. UNIFIED INDEX ARCHITECTURE

UnifiedIndex.ts: Combined in-memory indexes across all registries. Material designation lookup, machine spindle matching, tool faceted search, alarm keyword search, and cross-registry counts (material -> tools with data, machine -> compatible holders).

---

## 8. PRIORITIZED EXECUTION PLAN

| Priority | Phase | Sessions | Description |
|---|---|---|---|
| P0 | T-0, M-0 | 2-3 | Tool schema normalization + material merge |
| P1 | MCH-0, ALM-0, FRM-0, XLINK | 4-5 | Machine field fill, alarm consolidation, calculator formulas, cross-linking |
| P2 | T-1 to T-6, M-1, MCH-1, ALM-1 | 18-28 | Data expansion across all registries |
| P3 | T-7, ALL | 8-12 | App integration layer |

**Total estimated: 30-50 sessions for full all-registry app-readiness.**