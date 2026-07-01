# S1-MS1: Registry Enrichment for SFC

## Metadata
- **ID**: S1-MS1
- **Version**: 1.0.0
- **Title**: Registry Enrichment for SFC — Physics Parameters & New Registries
- **Brief**: Enrich existing material/tool/machine registries with physics parameters needed for SFC calculations; create CoolantRegistry and CoatingRegistry; wire into RegistryLoader; validate all Kienzle constants
- **Created**: 2026-02-25T15:45:00Z
- **Created By**: RGS Pipeline v3 (Opus)
- **Total Units**: 18
- **Total Sessions**: 2-3
- **Complexity**: L

## Context Bridge
- **WHAT CAME BEFORE**: S0-MS1 verified all 29,569 registry entries, 32 dispatchers, 135 tests pass. Types already defined: `KienzleCoefficients` (kc1_1, mc), `CuttingTool` (helix_angle, rake_angle, relief_angle), `Machine.spindle` (max_rpm, torque_max, power_continuous, rapid_rate). No CoolantRegistry or CoatingRegistry exists.
- **WHAT THIS MS DOES**: Populates empty physics fields across 18,516 existing entries, creates 2 new registries (300+ entries), wires into RegistryLoader, validates Kienzle constants across all material families.
- **WHAT COMES AFTER**: S1-MS2 ports core monolith algorithms that depend on enriched physics data.

## Deliverables Inventory

| # | Path | Type | Unit | Description |
|---|------|------|------|-------------|
| 1 | `data/materials/P_STEELS.json` | data | P1-U01 | Steels family — enriched with Kienzle kc1.1/mc |
| 2 | `data/materials/N_ALUMINUM.json` | data | P1-U02 | Aluminum family — enriched with Kienzle kc1.1/mc |
| 3 | `data/materials/S_SUPERALLOYS_R3.json` | data | P1-U03 | Titanium/Nickel/Superalloys — enriched with Kienzle |
| 4 | `data/materials/K_CAST_IRON_verified.json` | data | P1-U04 | Cast iron — enriched with Kienzle kc1.1/mc |
| 5 | `data/materials/M_STAINLESS_R3.json` | data | P1-U05 | Stainless steel — enriched with Kienzle kc1.1/mc |
| 6 | `data/materials/H_HARDENED.json` | data | P1-U06 | Hardened steels — enriched with Kienzle kc1.1/mc |
| 7 | `data/materials/O_NONFERROUS.json` | data | P1-U07 | Copper/brass/plastics/composites — enriched with Kienzle |
| 8 | `src/registries/ToolGeometryData.ts` | source | P2-U01 | Tool geometry enrichment data — rake/helix/relief by tool type |
| 9 | `src/registries/MachineSpindleData.ts` | source | P2-U02 | Machine spindle curve data — power/torque/RPM by machine model |
| 10 | `src/registries/CoolantRegistry.ts` | source | P3-U01 | New CoolantRegistry class (200+ entries) |
| 11 | `data/coolants.json` | data | P3-U01 | Coolant reference data (oils, emulsions, synthetics, MQL, cryo) |
| 12 | `src/registries/CoatingRegistry.ts` | source | P3-U02 | New CoatingRegistry class (100+ entries) |
| 13 | `data/coatings.json` | data | P3-U02 | Coating reference data (TiAlN, TiN, AlCrN, DLC, etc.) |
| 14 | `src/registries/index.ts` | source | P4-U01 | Updated barrel exports — add coolant + coating registries |
| 15 | `src/services/dataLoader.ts` | source | P4-U01 | Wire coolant/coating into RegistryLoader |
| 16 | `src/tools/dispatchers/dataDispatcher.ts` | source | P4-U02 | Add coolant_search, coating_search actions to prism_data |
| 17 | `src/__tests__/registry-enrichment.test.ts` | test | P4-U03 | Tests for enriched data + new registries |
| 18 | `data/docs/MASTER_INDEX.md` | doc | P4-U04 | Updated registry counts |

## Role Matrix

| Role | Code | Model | Units | Unit IDs |
|------|------|-------|-------|----------|
| Schema Architect | R1 | opus-4.6 | 1 | P3-U01 |
| Implementer | R2 | sonnet-4.6 | 7 | P1-U01..U07 |
| Test Writer | R3 | sonnet-4.6 | 1 | P4-U03 |
| Scrutinizer | R4 | opus-4.6 | 1 | P4-U05 |
| Integrator | R6 | sonnet-4.6 | 5 | P2-U01, P2-U02, P3-U02, P4-U01, P4-U02 |
| Documenter | R8 | haiku-4.5 | 1 | P4-U04 |

## Tool Map

| Tool | Action | Used By |
|------|--------|---------|
| `prism_data` | material_search, material_get | P1-U01..U07, P4-U05 |
| `prism_data` | tool_search, tool_get | P2-U01 |
| `prism_data` | machine_search, machine_get | P2-U02 |
| `prism_validate` | kienzle | P4-U05 |
| `prism_validate` | material | P1-U01..U07 |
| `prism_validate` | completeness | P4-U05 |
| `prism_validate` | anti_regression | P4-U05 |
| `prism_dev` | build | P4-U01, P4-U03 |
| `prism_dev` | file_write | P1-U01..U07, P2-U01, P2-U02, P3-U01, P3-U02 |
| `prism_knowledge` | search | P3-U01, P3-U02 |
| `prism_omega` | compute | P4-U05 |

## Dependency Graph

```
P1-U01 ─┐
P1-U02 ─┤
P1-U03 ─┤ (all 7 parallel — independent material families)
P1-U04 ─┤
P1-U05 ─┤
P1-U06 ─┤
P1-U07 ─┘
         ├──> P2-U01 ──┐  (tool geometry — after materials for cross-ref)
         ├──> P2-U02 ──┤  (machine spindle — after materials for cross-ref)
         │             │
         │             ├──> P3-U01 ──┐  (coolant registry — after tools)
         │             ├──> P3-U02 ──┤  (coating registry — after tools)
         │             │             │
         │             │             ├──> P4-U01  (wiring)
         │             │             ├──> P4-U02  (dispatcher)
         │             │             ├──> P4-U03  (tests)
         │             │             ├──> P4-U04  (docs)
         │             │             └──> P4-U05  (safety validation)
```

## Scrutiny Config
```json
{
  "min_passes": 3,
  "max_passes": 7,
  "convergence_delta": 2,
  "focus_areas": ["kienzle_constants", "field_completeness", "registry_wiring", "safety_validation"],
  "safety_critical": true,
  "omega_target": 1.0
}
```

## Leverage Table (Existing Assets)

| Asset | Type | Reuse Strategy |
|-------|------|---------------|
| `MaterialRegistry.ts` (1,506 LOC) | Registry | Extend — types already define KienzleCoefficients |
| `ToolRegistry.ts` (1,098 LOC) | Registry | Extend — CuttingTool already has geometry fields |
| `MachineRegistry.ts` (1,234 LOC) | Registry | Extend — Machine.spindle already typed |
| `CoolantValidationEngine.ts` | Engine | Leverage for coolant data structure |
| `validationDispatcher.ts` | Dispatcher | Use `prism_validate→kienzle` for safety checks |
| `dataDispatcher.ts` | Dispatcher | Extend with coolant_search, coating_search |
| `data/materials/*.json` (3 files) | Data | Enrich in-place — add kc1_1/mc fields |
| `registries/index.ts` | Barrel | Add CoolantRegistry + CoatingRegistry exports |
| `services/dataLoader.ts` | Service | Wire coolant/coating loading |

---

## Phase 1: Material Kienzle Enrichment (7 units — ALL PARALLEL)

**Description**: Populate Kienzle kc1.1 and mc constants for all 3,533 materials, organized by ISO material family. All 7 units are independent and can execute in parallel via claude-flow worktree agents.

**Sessions**: 1
**Primary Role**: R2 (Implementer)
**Primary Model**: sonnet-4.6

### P1-U01: Enrich P-Steels with Kienzle Constants

- **ID**: P1-U01
- **Phase**: P1
- **Sequence**: 0
- **Role**: R2 | **Role Name**: Implementer | **Model**: sonnet-4.6 | **Effort**: 80
- **Rationale**: Bulk data population with reference lookup — Sonnet handles volume efficiently
- **Dependencies**: []
- **Tools**: [{ tool: "prism_data", action: "material_search", params_hint: "iso_group=P" }, { tool: "prism_validate", action: "material" }]
- **Skills**: ["mfg-material-lookup", "mfg-kienzle-validate"]
- **Hooks**: ["pre_unit: validate_workspace", "post_unit: session_breadcrumb"]
- **Features**: ["file_operations"]
- **Entry Conditions**:
  - "Build passes on current HEAD"
  - "MaterialRegistry loads without error"
  - "data/materials/ directory exists"
- **Steps**:
  1. **Search existing P-steel entries** — `prism_data:material_search { iso_group: "P", limit: 2000 }` → Catalog entries missing kienzle.kc1_1/mc fields. Count total P-steels.
     - Validation: Entry count returned
  2. **Populate Kienzle constants for all P-steels** — For each material: lookup published kc1.1 (N/mm^2) and mc (dimensionless) from Machining Data Handbook, ASM data tables, and manufacturer specs. Group by subcategory: carbon steels (kc1.1: 1500-2100), alloy steels (1600-2200), free-machining (1200-1600), tool steels (1800-2600). Write enriched JSON to `data/materials/P_STEELS.json`.
     - Validation: Every P-steel entry has non-null kienzle.kc1_1 and kienzle.mc
     - Notes: kc1.1 units are N/mm^2 at 1mm chip thickness. mc typically 0.18-0.30 for steels.
  3. **Validate batch** — `prism_validate:material { iso_group: "P" }` → All entries pass schema validation
     - Validation: Zero validation errors
- **Exit Conditions**:
  - "All P-steel entries have kienzle.kc1_1 > 0 and kienzle.mc > 0"
  - "data/materials/P_STEELS.json exists and is valid JSON"
  - "prism_validate:material returns 0 errors for iso_group P"
- **Rollback**: "git checkout -- data/materials/P_STEELS.json"
- **Deliverables**: [{ path: "data/materials/P_STEELS.json", type: "data", description: "P-steels with Kienzle kc1.1/mc constants", line_count_est: 5000 }]
- **Estimated Tokens**: 800 | **Estimated Minutes**: 30
- **Index Flags**: index_in_master: false, creates_skill: false, creates_script: false, creates_hook: false, creates_command: false, uses_claude_flow: false

### P1-U02: Enrich N-Aluminum with Kienzle Constants

- **ID**: P1-U02
- **Phase**: P1
- **Sequence**: 1
- **Role**: R2 | **Role Name**: Implementer | **Model**: sonnet-4.6 | **Effort**: 75
- **Rationale**: Aluminum has well-documented Kienzle constants — straightforward population
- **Dependencies**: []
- **Tools**: [{ tool: "prism_data", action: "material_search", params_hint: "iso_group=N" }, { tool: "prism_validate", action: "material" }]
- **Skills**: ["mfg-material-lookup"]
- **Hooks**: ["pre_unit: validate_workspace", "post_unit: session_breadcrumb"]
- **Features**: ["file_operations"]
- **Entry Conditions**:
  - "Build passes on current HEAD"
  - "MaterialRegistry loads without error"
- **Steps**:
  1. **Search N-aluminum entries** — `prism_data:material_search { iso_group: "N", limit: 2000 }` → Count entries missing Kienzle data.
  2. **Populate Kienzle constants** — Aluminum alloys: kc1.1 typically 350-900 N/mm^2, mc 0.20-0.30. Subgroups: wrought (6061, 7075), cast (A356, A380), high-silicon (>12% Si: higher kc1.1). Write to `data/materials/N_ALUMINUM.json`.
  3. **Validate batch** — `prism_validate:material { iso_group: "N" }` → All pass
- **Exit Conditions**:
  - "All N-aluminum entries have kienzle.kc1_1 > 0 and kienzle.mc > 0"
  - "data/materials/N_ALUMINUM.json exists and is valid JSON"
- **Rollback**: "git checkout -- data/materials/N_ALUMINUM.json"
- **Deliverables**: [{ path: "data/materials/N_ALUMINUM.json", type: "data", description: "N-aluminum with Kienzle constants", line_count_est: 3000 }]
- **Estimated Tokens**: 600 | **Estimated Minutes**: 20
- **Index Flags**: index_in_master: false, creates_skill: false, creates_script: false, creates_hook: false, creates_command: false, uses_claude_flow: false

### P1-U03: Enrich S-Superalloys with Kienzle Constants

- **ID**: P1-U03
- **Phase**: P1
- **Sequence**: 2
- **Role**: R2 | **Role Name**: Implementer | **Model**: sonnet-4.6 | **Effort**: 85
- **Rationale**: Titanium and nickel alloys require careful constant selection — higher effort
- **Dependencies**: []
- **Tools**: [{ tool: "prism_data", action: "material_search", params_hint: "iso_group=S" }, { tool: "prism_validate", action: "material" }]
- **Skills**: ["mfg-material-lookup"]
- **Hooks**: ["pre_unit: validate_workspace", "post_unit: session_breadcrumb"]
- **Features**: ["file_operations"]
- **Entry Conditions**: ["Build passes on current HEAD", "MaterialRegistry loads without error"]
- **Steps**:
  1. **Search S-superalloy entries** — `prism_data:material_search { iso_group: "S", limit: 2000 }`
  2. **Populate Kienzle constants** — Titanium alloys: kc1.1 1200-1600 N/mm^2, mc 0.22-0.28. Nickel alloys (Inconel, Hastelloy): kc1.1 2200-3200, mc 0.25-0.35. Cobalt alloys: kc1.1 2000-2800. Enrich existing `S_SUPERALLOYS_R3.json`.
  3. **Validate batch** — `prism_validate:material { iso_group: "S" }`
- **Exit Conditions**: ["All S-superalloy entries have kienzle.kc1_1 > 0 and kienzle.mc > 0", "S_SUPERALLOYS_R3.json is valid JSON"]
- **Rollback**: "git checkout -- data/materials/S_SUPERALLOYS_R3.json"
- **Deliverables**: [{ path: "data/materials/S_SUPERALLOYS_R3.json", type: "data", description: "S-superalloys with Kienzle constants", line_count_est: 2500 }]
- **Estimated Tokens**: 700 | **Estimated Minutes**: 25
- **Index Flags**: index_in_master: false, creates_skill: false, creates_script: false, creates_hook: false, creates_command: false, uses_claude_flow: false

### P1-U04: Enrich K-Cast Iron with Kienzle Constants

- **ID**: P1-U04
- **Phase**: P1
- **Sequence**: 3
- **Role**: R2 | **Role Name**: Implementer | **Model**: sonnet-4.6 | **Effort**: 75
- **Dependencies**: []
- **Tools**: [{ tool: "prism_data", action: "material_search", params_hint: "iso_group=K" }, { tool: "prism_validate", action: "material" }]
- **Skills**: ["mfg-material-lookup"]
- **Hooks**: ["pre_unit: validate_workspace", "post_unit: session_breadcrumb"]
- **Features**: ["file_operations"]
- **Entry Conditions**: ["Build passes on current HEAD", "MaterialRegistry loads without error"]
- **Steps**:
  1. **Search K-cast iron entries** — `prism_data:material_search { iso_group: "K", limit: 2000 }`
  2. **Populate Kienzle constants** — Gray cast iron: kc1.1 790-1100, mc 0.22-0.28. Ductile iron: kc1.1 1100-1500, mc 0.24-0.30. CGI: kc1.1 1000-1400. Enrich existing `K_CAST_IRON_verified.json`.
  3. **Validate batch** — `prism_validate:material { iso_group: "K" }`
- **Exit Conditions**: ["All K-cast iron entries have kienzle.kc1_1 > 0 and kienzle.mc > 0", "K_CAST_IRON_verified.json is valid JSON"]
- **Rollback**: "git checkout -- data/materials/K_CAST_IRON_verified.json"
- **Deliverables**: [{ path: "data/materials/K_CAST_IRON_verified.json", type: "data", description: "K-cast iron with Kienzle constants", line_count_est: 2000 }]
- **Estimated Tokens**: 600 | **Estimated Minutes**: 20
- **Index Flags**: index_in_master: false, creates_skill: false, creates_script: false, creates_hook: false, creates_command: false, uses_claude_flow: false

### P1-U05: Enrich M-Stainless Steel with Kienzle Constants

- **ID**: P1-U05
- **Phase**: P1
- **Sequence**: 4
- **Role**: R2 | **Role Name**: Implementer | **Model**: sonnet-4.6 | **Effort**: 80
- **Dependencies**: []
- **Tools**: [{ tool: "prism_data", action: "material_search", params_hint: "iso_group=M" }, { tool: "prism_validate", action: "material" }]
- **Skills**: ["mfg-material-lookup"]
- **Hooks**: ["pre_unit: validate_workspace", "post_unit: session_breadcrumb"]
- **Features**: ["file_operations"]
- **Entry Conditions**: ["Build passes on current HEAD", "MaterialRegistry loads without error"]
- **Steps**:
  1. **Search M-stainless entries** — `prism_data:material_search { iso_group: "M", limit: 2000 }`
  2. **Populate Kienzle constants** — Austenitic (304, 316): kc1.1 1800-2200, mc 0.24-0.30. Ferritic (430): kc1.1 1500-1900. Martensitic (440C): kc1.1 2000-2600. Duplex: kc1.1 2000-2400. PH: kc1.1 1900-2500. Enrich existing `M_STAINLESS_R3.json`.
  3. **Validate batch** — `prism_validate:material { iso_group: "M" }`
- **Exit Conditions**: ["All M-stainless entries have kienzle.kc1_1 > 0 and kienzle.mc > 0", "M_STAINLESS_R3.json is valid JSON"]
- **Rollback**: "git checkout -- data/materials/M_STAINLESS_R3.json"
- **Deliverables**: [{ path: "data/materials/M_STAINLESS_R3.json", type: "data", description: "M-stainless with Kienzle constants", line_count_est: 3000 }]
- **Estimated Tokens**: 650 | **Estimated Minutes**: 22
- **Index Flags**: index_in_master: false, creates_skill: false, creates_script: false, creates_hook: false, creates_command: false, uses_claude_flow: false

### P1-U06: Enrich H-Hardened Steels with Kienzle Constants

- **ID**: P1-U06
- **Phase**: P1
- **Sequence**: 5
- **Role**: R2 | **Role Name**: Implementer | **Model**: sonnet-4.6 | **Effort**: 85
- **Dependencies**: []
- **Tools**: [{ tool: "prism_data", action: "material_search", params_hint: "iso_group=H" }, { tool: "prism_validate", action: "material" }]
- **Skills**: ["mfg-material-lookup"]
- **Hooks**: ["pre_unit: validate_workspace", "post_unit: session_breadcrumb"]
- **Features**: ["file_operations"]
- **Entry Conditions**: ["Build passes on current HEAD", "MaterialRegistry loads without error"]
- **Steps**:
  1. **Search H-hardened entries** — `prism_data:material_search { iso_group: "H", limit: 2000 }`
  2. **Populate Kienzle constants** — Hardened steels (45-65 HRC): kc1.1 2500-4000 N/mm^2, mc 0.26-0.35. Higher hardness = higher kc1.1. CBN/ceramic cutting typically required. Write to `data/materials/H_HARDENED.json`.
  3. **Validate batch** — `prism_validate:material { iso_group: "H" }`
- **Exit Conditions**: ["All H-hardened entries have kienzle.kc1_1 > 0 and kienzle.mc > 0", "H_HARDENED.json exists and is valid JSON"]
- **Rollback**: "git checkout -- data/materials/H_HARDENED.json"
- **Deliverables**: [{ path: "data/materials/H_HARDENED.json", type: "data", description: "H-hardened steels with Kienzle constants", line_count_est: 1500 }]
- **Estimated Tokens**: 600 | **Estimated Minutes**: 20
- **Index Flags**: index_in_master: false, creates_skill: false, creates_script: false, creates_hook: false, creates_command: false, uses_claude_flow: false

### P1-U07: Enrich O-Nonferrous/Composites with Kienzle Constants

- **ID**: P1-U07
- **Phase**: P1
- **Sequence**: 6
- **Role**: R2 | **Role Name**: Implementer | **Model**: sonnet-4.6 | **Effort**: 80
- **Dependencies**: []
- **Tools**: [{ tool: "prism_data", action: "material_search", params_hint: "iso_group=O" }, { tool: "prism_validate", action: "material" }]
- **Skills**: ["mfg-material-lookup"]
- **Hooks**: ["pre_unit: validate_workspace", "post_unit: session_breadcrumb"]
- **Features**: ["file_operations"]
- **Entry Conditions**: ["Build passes on current HEAD", "MaterialRegistry loads without error"]
- **Steps**:
  1. **Search O-nonferrous and remaining entries** — `prism_data:material_search { iso_group: "O", limit: 2000 }` + sweep for any entries not in P/N/S/K/M/H groups
  2. **Populate Kienzle constants** — Copper alloys: kc1.1 600-1200, mc 0.20-0.28. Brass: kc1.1 500-800. Plastics (PEEK, Delrin, nylon): kc1.1 150-400, mc 0.30-0.45. CFRP composites: kc1.1 200-600, mc 0.30-0.50. GFRP: kc1.1 150-400. Write to `data/materials/O_NONFERROUS.json`.
  3. **Validate batch** — `prism_validate:material { iso_group: "O" }`
- **Exit Conditions**: ["All O-nonferrous entries have kienzle.kc1_1 > 0 and kienzle.mc > 0", "O_NONFERROUS.json exists and is valid JSON"]
- **Rollback**: "git checkout -- data/materials/O_NONFERROUS.json"
- **Deliverables**: [{ path: "data/materials/O_NONFERROUS.json", type: "data", description: "O-nonferrous/composites with Kienzle constants", line_count_est: 2500 }]
- **Estimated Tokens**: 650 | **Estimated Minutes**: 22
- **Index Flags**: index_in_master: false, creates_skill: false, creates_script: false, creates_hook: false, creates_command: false, uses_claude_flow: false

### P1 Gate
```json
{
  "omega_floor": 1.0,
  "safety_floor": 0.70,
  "ralph_required": false,
  "anti_regression": true,
  "test_required": true,
  "build_required": true,
  "checkpoint": true,
  "learning_save": true,
  "custom_checks": ["ALL material families have 100% Kienzle coverage"]
}
```

---

## Phase 2: Tool Geometry & Machine Spindle Enrichment (2 units — PARALLEL)

**Description**: Enrich all 13,967 tool entries with geometry data and all 1,016 machine entries with spindle curves. Both are independent and can run in parallel.

**Sessions**: 1
**Primary Role**: R6 (Integrator)
**Primary Model**: sonnet-4.6

### P2-U01: Enrich Tool Geometry Data

- **ID**: P2-U01
- **Phase**: P2
- **Sequence**: 0
- **Role**: R6 | **Role Name**: Integrator | **Model**: sonnet-4.6 | **Effort**: 85
- **Rationale**: Extending existing registry with geometry data — integration work
- **Dependencies**: ["P1-U01", "P1-U02", "P1-U03", "P1-U04", "P1-U05", "P1-U06", "P1-U07"]
- **Tools**: [{ tool: "prism_data", action: "tool_search" }, { tool: "prism_dev", action: "file_write" }]
- **Skills**: ["mfg-tool-lookup"]
- **Hooks**: ["pre_unit: validate_workspace", "post_unit: session_breadcrumb"]
- **Features**: ["file_operations", "claude_flow"]
- **Entry Conditions**:
  - "P1 gate passed — all materials enriched"
  - "ToolRegistry loads without error"
  - "CuttingTool interface has helix_angle, rake_angle, relief_angle fields"
- **Steps**:
  1. **Scan tools missing geometry** — `prism_data:tool_search { limit: 100 }` → Identify entries with default/zero geometry values
  2. **Create geometry enrichment module** — Create `src/registries/ToolGeometryData.ts` with lookup tables by tool type: end mills (helix: 30-45deg, rake: 6-15deg, relief: 8-12deg), drills (point: 118-140deg, helix: 25-35deg), inserts (by ISO shape: CNMG, WNMG, etc.), taps (rake: 5-15deg), boring bars, face mills, thread mills. Include number_of_flutes, core_diameter_ratio, chip_breaker_type.
  3. **Apply geometry to all 13,967 tools** — Run enrichment pass that maps tool_type → standard geometry values, with material-specific adjustments (e.g., aluminum tools: higher rake angles, helix angles).
  4. **Validate** — Spot-check 50 random tools have non-zero geometry values
- **Exit Conditions**:
  - "ToolGeometryData.ts exists and compiles"
  - "ALL 13,967 tool entries have rake_angle, helix_angle, relief_angle populated"
  - "Build passes"
- **Rollback**: "git checkout -- src/registries/ToolGeometryData.ts; revert tool data changes"
- **Deliverables**: [{ path: "src/registries/ToolGeometryData.ts", type: "source", description: "Tool geometry lookup tables by type", line_count_est: 400 }]
- **Estimated Tokens**: 900 | **Estimated Minutes**: 35
- **Index Flags**: index_in_master: true, creates_skill: false, creates_script: false, creates_hook: false, creates_command: false, uses_claude_flow: true

### P2-U02: Enrich Machine Spindle Data

- **ID**: P2-U02
- **Phase**: P2
- **Sequence**: 1
- **Role**: R6 | **Role Name**: Integrator | **Model**: sonnet-4.6 | **Effort**: 85
- **Rationale**: Extending existing machine registry with spindle curves — integration work
- **Dependencies**: ["P1-U01", "P1-U02", "P1-U03", "P1-U04", "P1-U05", "P1-U06", "P1-U07"]
- **Tools**: [{ tool: "prism_data", action: "machine_search" }, { tool: "prism_dev", action: "file_write" }]
- **Skills**: ["mfg-machine-lookup"]
- **Hooks**: ["pre_unit: validate_workspace", "post_unit: session_breadcrumb"]
- **Features**: ["file_operations", "claude_flow"]
- **Entry Conditions**:
  - "P1 gate passed"
  - "MachineRegistry loads without error"
  - "Machine interface has spindle.max_rpm, spindle.torque_max fields"
- **Steps**:
  1. **Scan machines missing spindle data** — `prism_data:machine_search { limit: 100 }` → Identify entries needing enrichment
  2. **Create spindle data module** — Create `src/registries/MachineSpindleData.ts` with manufacturer-specific spindle curves: VMC (8000-15000 RPM, 7.5-22 kW), HMC (6000-12000 RPM, 11-30 kW), lathe (4000-6000 RPM, 15-37 kW), 5-axis (10000-42000 RPM, 15-40 kW), Swiss (8000-12000 RPM, 3-7 kW). Include rapid traverse rates, axis travels, coolant pressure.
  3. **Apply spindle data to all 1,016 machines** — Map by machine_type × manufacturer → spindle curve data
  4. **Validate** — Spot-check 30 random machines have valid spindle data
- **Exit Conditions**:
  - "MachineSpindleData.ts exists and compiles"
  - "ALL 1,016 machine entries have spindle.power_continuous > 0 and spindle.max_rpm > 0"
  - "Build passes"
- **Rollback**: "git checkout -- src/registries/MachineSpindleData.ts; revert machine data changes"
- **Deliverables**: [{ path: "src/registries/MachineSpindleData.ts", type: "source", description: "Machine spindle curve data by manufacturer/type", line_count_est: 350 }]
- **Estimated Tokens**: 800 | **Estimated Minutes**: 30
- **Index Flags**: index_in_master: true, creates_skill: false, creates_script: false, creates_hook: false, creates_command: false, uses_claude_flow: true

### P2 Gate
```json
{
  "omega_floor": 1.0,
  "safety_floor": 0.70,
  "ralph_required": false,
  "anti_regression": true,
  "test_required": true,
  "build_required": true,
  "checkpoint": true,
  "learning_save": true,
  "custom_checks": ["100% tool geometry coverage", "100% machine spindle coverage"]
}
```

---

## Phase 3: New Registries — Coolant & Coating (2 units — PARALLEL)

**Description**: Create two entirely new registries: CoolantRegistry (200+ entries) and CoatingRegistry (100+ entries). Both are independent.

**Sessions**: 1
**Primary Role**: R1 (Schema Architect) / R6 (Integrator)
**Primary Model**: opus-4.6 / sonnet-4.6

### P3-U01: Create CoolantRegistry

- **ID**: P3-U01
- **Phase**: P3
- **Sequence**: 0
- **Role**: R1 | **Role Name**: Schema Architect | **Model**: opus-4.6 | **Effort**: 90
- **Rationale**: New registry design requires architectural decisions — Opus for schema design
- **Dependencies**: ["P2-U01"]
- **Tools**: [{ tool: "prism_knowledge", action: "search", params_hint: "query=coolant" }, { tool: "prism_dev", action: "file_write" }]
- **Skills**: ["mfg-coolant-recommend"]
- **Hooks**: ["pre_unit: validate_workspace", "post_unit: session_breadcrumb", "post_unit: log_metrics"]
- **Features**: ["file_operations"]
- **Entry Conditions**:
  - "P2 gate passed"
  - "CoolantValidationEngine.ts exists (reference for data structure)"
  - "No file named CoolantRegistry.ts exists yet"
- **Steps**:
  1. **Design coolant schema** — Define Coolant interface: id, name, type (cutting_oil | emulsion | synthetic | semi_synthetic | mql | cryogenic), concentration_range_pct (min/max), pH_range (min/max), flow_rate_lpm (min/max), mql_params (air_pressure_bar, oil_rate_ml_hr), viscosity_cst, flash_point_c, material_compatibility (array of iso_group + rating), disposal_class, cost_per_liter, supplier, applications[].
  2. **Populate 200+ coolant entries** — Write `data/coolants.json` with comprehensive entries: cutting oils (neat, EP), emulsions (5-10%), synthetics, semi-synthetics, MQL fluids (ester, vegetable), cryogenic (LN2, CO2). Each with full material compatibility matrix.
  3. **Create CoolantRegistry class** — Create `src/registries/CoolantRegistry.ts` extending BaseRegistry<Coolant> with search, get, recommend, findCompatible methods. Include singleton export `coolantRegistry`.
  4. **Validate** — Instantiate coolantRegistry, verify all entries load, test search/get/recommend
- **Exit Conditions**:
  - "CoolantRegistry.ts exports CoolantRegistry class and coolantRegistry singleton"
  - "data/coolants.json has >= 200 valid entries"
  - "coolantRegistry.all().length >= 200"
  - "Build passes with 0 errors"
- **Rollback**: "Delete src/registries/CoolantRegistry.ts and data/coolants.json"
- **Deliverables**: [
    { path: "src/registries/CoolantRegistry.ts", type: "source", description: "CoolantRegistry class with search/recommend/findCompatible", line_count_est: 250 },
    { path: "data/coolants.json", type: "data", description: "200+ coolant entries with full compatibility matrices", line_count_est: 4000 }
  ]
- **Estimated Tokens**: 1200 | **Estimated Minutes**: 40
- **Index Flags**: index_in_master: true, creates_skill: false, creates_script: false, creates_hook: false, creates_command: false, uses_claude_flow: false

### P3-U02: Create CoatingRegistry

- **ID**: P3-U02
- **Phase**: P3
- **Sequence**: 1
- **Role**: R6 | **Role Name**: Integrator | **Model**: sonnet-4.6 | **Effort**: 80
- **Rationale**: Coating registry follows established BaseRegistry pattern — Sonnet suffices
- **Dependencies**: ["P2-U01"]
- **Tools**: [{ tool: "prism_knowledge", action: "search", params_hint: "query=coating" }, { tool: "prism_dev", action: "file_write" }]
- **Skills**: ["mfg-tool-lookup"]
- **Hooks**: ["pre_unit: validate_workspace", "post_unit: session_breadcrumb"]
- **Features**: ["file_operations"]
- **Entry Conditions**:
  - "P2 gate passed"
  - "BaseRegistry pattern available from existing registries"
- **Steps**:
  1. **Design coating schema** — Define Coating interface: id, name, type (PVD | CVD | hybrid), composition, max_temperature_c, hardness_hv, friction_coefficient, layer_thickness_um (min/max), color, application[] (milling, turning, drilling, threading), material_suitability[] (iso_group + rating), wear_resistance (1-10), oxidation_resistance (1-10), cost_multiplier, supplier.
  2. **Populate 100+ coating entries** — Write `data/coatings.json`: TiAlN variants (mono/multi-layer), TiN, AlCrN, TiCN, Al2O3, DLC, CVD diamond, CBN, nACo, nACRo, TiSiN, CrN, ZrN, and proprietary coatings (Balinit, Alcrona, Signum, Hellica). Each with full specs.
  3. **Create CoatingRegistry class** — `src/registries/CoatingRegistry.ts` extending BaseRegistry<Coating> with search, get, recommend, findForMaterial methods. Singleton `coatingRegistry`.
  4. **Validate** — Verify all entries load and search/get work
- **Exit Conditions**:
  - "CoatingRegistry.ts exports CoatingRegistry class and coatingRegistry singleton"
  - "data/coatings.json has >= 100 valid entries"
  - "coatingRegistry.all().length >= 100"
  - "Build passes with 0 errors"
- **Rollback**: "Delete src/registries/CoatingRegistry.ts and data/coatings.json"
- **Deliverables**: [
    { path: "src/registries/CoatingRegistry.ts", type: "source", description: "CoatingRegistry class with search/recommend/findForMaterial", line_count_est: 200 },
    { path: "data/coatings.json", type: "data", description: "100+ coating entries with full specs", line_count_est: 2000 }
  ]
- **Estimated Tokens**: 900 | **Estimated Minutes**: 30
- **Index Flags**: index_in_master: true, creates_skill: false, creates_script: false, creates_hook: false, creates_command: false, uses_claude_flow: false

### P3 Gate
```json
{
  "omega_floor": 1.0,
  "safety_floor": 0.70,
  "ralph_required": false,
  "anti_regression": true,
  "test_required": true,
  "build_required": true,
  "checkpoint": true,
  "learning_save": true,
  "custom_checks": ["CoolantRegistry >= 200 entries", "CoatingRegistry >= 100 entries"]
}
```

---

## Phase 4: Wiring, Testing & Validation (5 units — MIXED)

**Description**: Wire new registries into barrel exports, extend prism_data dispatcher, write tests, update docs, and run safety-critical Kienzle validation across all material families.

**Sessions**: 1
**Primary Role**: R6 (Integrator)
**Primary Model**: sonnet-4.6

### P4-U01: Wire Registries into Barrel Exports & DataLoader

- **ID**: P4-U01
- **Phase**: P4
- **Sequence**: 0
- **Role**: R6 | **Role Name**: Integrator | **Model**: sonnet-4.6 | **Effort**: 80
- **Dependencies**: ["P3-U01", "P3-U02"]
- **Tools**: [{ tool: "prism_dev", action: "build" }]
- **Skills**: []
- **Hooks**: ["pre_unit: validate_workspace", "post_unit: session_breadcrumb"]
- **Features**: ["file_operations"]
- **Entry Conditions**: ["P3 gate passed", "CoolantRegistry.ts and CoatingRegistry.ts exist", "Build passes before wiring"]
- **Steps**:
  1. **Update registries/index.ts** — Add `export { CoolantRegistry, coolantRegistry, type Coolant } from "./CoolantRegistry.js"` and `export { CoatingRegistry, coatingRegistry, type Coating } from "./CoatingRegistry.js"`. Update header comment to reflect 16 registries.
  2. **Update dataLoader.ts** — Add coolant and coating loading to the RegistryLoader initialization sequence. Wire `getCoolant(id)`, `getCoating(id)`, `searchCoolants(query)`, `searchCoatings(query)`.
  3. **Build and verify** — `npm run build` → 0 errors, verify new registries load at server startup
- **Exit Conditions**: ["registries/index.ts exports CoolantRegistry and CoatingRegistry", "dataLoader.ts loads coolant and coating data", "Build passes with 0 errors"]
- **Rollback**: "git checkout -- src/registries/index.ts src/services/dataLoader.ts"
- **Deliverables**: [
    { path: "src/registries/index.ts", type: "source", description: "Updated barrel exports — 14→16 registries", line_count_est: 70 },
    { path: "src/services/dataLoader.ts", type: "source", description: "DataLoader wired with coolant + coating", line_count_est: 200 }
  ]
- **Estimated Tokens**: 500 | **Estimated Minutes**: 15
- **Index Flags**: index_in_master: true, creates_skill: false, creates_script: false, creates_hook: false, creates_command: false, uses_claude_flow: false

### P4-U02: Extend prism_data Dispatcher with Coolant/Coating Actions

- **ID**: P4-U02
- **Phase**: P4
- **Sequence**: 1
- **Role**: R6 | **Role Name**: Integrator | **Model**: sonnet-4.6 | **Effort**: 80
- **Dependencies**: ["P4-U01"]
- **Tools**: [{ tool: "prism_dev", action: "build" }]
- **Skills**: []
- **Hooks**: ["pre_unit: validate_workspace", "post_unit: session_breadcrumb"]
- **Features**: ["file_operations"]
- **Entry Conditions**: ["P4-U01 complete — registries wired", "Build passes"]
- **Steps**:
  1. **Add coolant actions to dataDispatcher** — Add `coolant_search`, `coolant_get`, `coolant_recommend` actions to `prism_data` dispatcher ACTIONS array. Implement handler cases using coolantRegistry methods.
  2. **Add coating actions to dataDispatcher** — Add `coating_search`, `coating_get`, `coating_recommend` actions. Implement handler cases using coatingRegistry methods.
  3. **Update ACTIONS array and description** — Ensure dynamic count in tool description reflects new actions.
  4. **Build and verify** — `npm run build` → 0 errors. Smoke test: `prism_data:coolant_search { query: "emulsion" }` returns results.
- **Exit Conditions**: ["prism_data dispatcher has coolant_search, coolant_get, coolant_recommend actions", "prism_data dispatcher has coating_search, coating_get, coating_recommend actions", "Build passes"]
- **Rollback**: "git checkout -- src/tools/dispatchers/dataDispatcher.ts"
- **Deliverables**: [{ path: "src/tools/dispatchers/dataDispatcher.ts", type: "source", description: "Extended with 6 new coolant/coating actions", line_count_est: 50 }]
- **Estimated Tokens**: 600 | **Estimated Minutes**: 20
- **Index Flags**: index_in_master: true, creates_skill: false, creates_script: false, creates_hook: false, creates_command: false, uses_claude_flow: false

### P4-U03: Registry Enrichment Test Suite

- **ID**: P4-U03
- **Phase**: P4
- **Sequence**: 2
- **Role**: R3 | **Role Name**: Test Writer | **Model**: sonnet-4.6 | **Effort**: 75
- **Dependencies**: ["P4-U01", "P4-U02"]
- **Tools**: [{ tool: "prism_dev", action: "build" }]
- **Skills**: []
- **Hooks**: ["pre_unit: validate_workspace", "post_unit: session_breadcrumb"]
- **Features**: ["file_operations"]
- **Entry Conditions**: ["P4-U01 and P4-U02 complete", "All registries wired and loading", "Build passes"]
- **Steps**:
  1. **Create test file** — `src/__tests__/registry-enrichment.test.ts` covering:
     - Material Kienzle coverage: sample 10 materials per ISO group, verify kc1_1 > 0 and mc > 0
     - Tool geometry coverage: sample 20 tools, verify rake_angle/helix_angle/relief_angle populated
     - Machine spindle coverage: sample 10 machines, verify spindle.power_continuous > 0
     - CoolantRegistry: all() returns >= 200, search works, recommend returns valid results
     - CoatingRegistry: all() returns >= 100, search works, recommend returns valid results
     - DataDispatcher: coolant_search, coating_search actions respond
  2. **Run tests** — `npx vitest run src/__tests__/registry-enrichment.test.ts` → All pass
  3. **Run full suite** — `npx vitest run` → >= 135 tests pass (no regression)
- **Exit Conditions**: ["registry-enrichment.test.ts exists with >= 15 tests", "All new tests pass", "Full test suite >= 135 (no regression)"]
- **Rollback**: "Delete src/__tests__/registry-enrichment.test.ts"
- **Deliverables**: [{ path: "src/__tests__/registry-enrichment.test.ts", type: "test", description: "Registry enrichment + new registry tests", line_count_est: 300 }]
- **Estimated Tokens**: 700 | **Estimated Minutes**: 25
- **Index Flags**: index_in_master: false, creates_skill: false, creates_script: false, creates_hook: false, creates_command: false, uses_claude_flow: false

### P4-U04: Update MASTER_INDEX.md Registry Counts

- **ID**: P4-U04
- **Phase**: P4
- **Sequence**: 3
- **Role**: R8 | **Role Name**: Documenter | **Model**: haiku-4.5 | **Effort**: 60
- **Dependencies**: ["P4-U01"]
- **Tools**: []
- **Skills**: []
- **Hooks**: ["post_unit: session_breadcrumb"]
- **Features**: ["file_operations"]
- **Entry Conditions**: ["P4-U01 complete — all registries wired", "Build passes with CoolantRegistry and CoatingRegistry loaded"]
- **Steps**:
  1. **Update MASTER_INDEX.md** — Update registry count from 14 to 16. Add CoolantRegistry and CoatingRegistry entries with entry counts. Update total entry count (29,569 → 29,869+).
  2. **Update CURRENT_POSITION.md** — Record S1-MS1 progress
- **Exit Conditions**: ["MASTER_INDEX.md shows 16 registries", "CoolantRegistry and CoatingRegistry listed in MASTER_INDEX.md"]
- **Rollback**: "git checkout -- data/docs/MASTER_INDEX.md"
- **Deliverables**: [{ path: "data/docs/MASTER_INDEX.md", type: "doc", description: "Updated registry counts", line_count_est: 5 }]
- **Estimated Tokens**: 200 | **Estimated Minutes**: 10
- **Index Flags**: index_in_master: false, creates_skill: false, creates_script: false, creates_hook: false, creates_command: false, uses_claude_flow: false

### P4-U05: Safety Validation — Kienzle Constants Audit

- **ID**: P4-U05
- **Phase**: P4
- **Sequence**: 4
- **Role**: R4 | **Role Name**: Scrutinizer | **Model**: opus-4.6 | **Effort**: 95
- **Rationale**: Safety-critical physics data validation requires Opus-level reasoning
- **Dependencies**: ["P4-U03"]
- **Tools**: [
    { tool: "prism_validate", action: "kienzle" },
    { tool: "prism_validate", action: "completeness" },
    { tool: "prism_validate", action: "anti_regression" },
    { tool: "prism_data", action: "material_search" },
    { tool: "prism_omega", action: "compute" }
  ]
- **Skills**: ["mfg-kienzle-validate"]
- **Hooks**: ["pre_unit: validate_workspace", "post_unit: log_metrics", "post_unit: sync_memory"]
- **Features**: ["file_operations"]
- **Entry Conditions**: ["All tests passing (P4-U03 complete)", "All material families enriched", "Build passes"]
- **Steps**:
  1. **Random-sample 100 materials** — Select >=10 per ISO group (P, N, S, K, M, H, O) → 70+ from major groups + 30 from minor. `prism_data:material_search` with random offset per group.
  2. **Validate Kienzle constants** — For each sampled material: `prism_validate:kienzle { material_id: "...", kc1_1: ..., mc: ... }` → Verify S(x) >= 0.990. Check: kc1_1 is in physically plausible range for the material group, mc is in 0.15-0.50 range, no negative values.
  3. **Cross-validate physics** — Check consistency: kc1_1 should correlate with tensile strength (harder materials → higher kc1_1). Flag any material where kc1_1 contradicts hardness/tensile data.
  4. **Run completeness check** — `prism_validate:completeness` → 100% Kienzle field coverage across all material families
  5. **Run anti-regression** — `prism_validate:anti_regression` → NEW registry count >= OLD
  6. **Compute Omega** — `prism_omega:compute` → Omega >= 1.0
- **Exit Conditions**:
  - "100/100 sampled materials pass Kienzle validation with S(x) >= 0.990"
  - "100% Kienzle field coverage across ALL material families"
  - "Anti-regression: NEW >= OLD for all registries"
  - "Omega >= 1.0"
  - "Zero physically implausible Kienzle values"
- **Rollback**: "Flag failing materials in report; revert specific entries if systematic error found"
- **Deliverables**: []
- **Estimated Tokens**: 1500 | **Estimated Minutes**: 40
- **Index Flags**: index_in_master: false, creates_skill: false, creates_script: false, creates_hook: false, creates_command: false, uses_claude_flow: false

### P4 Gate
```json
{
  "omega_floor": 1.0,
  "safety_floor": 0.990,
  "ralph_required": false,
  "anti_regression": true,
  "test_required": true,
  "build_required": true,
  "checkpoint": true,
  "learning_save": true,
  "custom_checks": [
    "100/100 Kienzle validations pass S(x) >= 0.990",
    "16 registries loading",
    "Tests >= 150 (135 baseline + 15 new)",
    "prism_data responds to coolant_search and coating_search"
  ]
}
```

---

## Commit Convention

- After each unit: `S1-P{N}-U{NN}: {title} — {brief description}`
- After each gate: `S1-P{N}-GATE: Phase {N} {title} — all checks pass`
- Final: `S1-MS1-COMPLETE: Registry enrichment — 18,816+ entries, 16 registries, Omega 1.0`
