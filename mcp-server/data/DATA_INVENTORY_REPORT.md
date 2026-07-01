# PRISM Data Inventory Report
## L0-NEW-MS0 P0-U01: Inventory & Categorize All Source Directories
Generated: 2026-04-12

---

## Summary

| Category | Location | File Count | Priority |
|----------|----------|------------|----------|
| Registries | src/registries/ | 24 TS files | CRITICAL |
| Core Data | data/*.json | 11 files | HIGH |
| Extracted Catalogs | src/data/*.json | 49 files | HIGH |
| State/Claims | data/claims/ | ~40 dirs | LOW |
| Docs | data/docs/ | ~50 files | MEDIUM |

---

## CRITICAL Priority — Physics & Core Formulas

### Registries (src/registries/)
These TypeScript files contain core computational logic and data:

| File | Description | Status |
|------|-------------|--------|
| `MaterialRegistry.ts` | Material properties, ISO groups, Kienzle coefficients | ✅ Active |
| `FormulaRegistry.ts` | 499 physics formulas | ✅ Active |
| `AlgorithmRegistry.ts` | 52 algorithms (Kienzle, Taylor, etc.) | ✅ Active |
| `ToolRegistry.ts` | Tool specifications and geometries | ✅ Active |
| `MachineRegistry.ts` | Machine capabilities | ✅ Active |
| `CoatingRegistry.ts` | Coating performance data | ✅ Active |
| `CoolantRegistry.ts` | Coolant specifications | ✅ Active |
| `PhysicsMappingRegistry.ts` | Physics model mappings | ✅ Active |

### Physics Constants (src/physics/)
| File | Description |
|------|-------------|
| `constants.ts` | Canonical Kienzle/Taylor constants (IMPORT ONLY) |
| `materialDb.ts` | Material database with ISO classifications |

---

## HIGH Priority — Tool & Machine Catalogs

### Extracted Tool Catalogs (src/data/*-extracted.json)
Major manufacturer catalogs already processed:

| Manufacturer | Files | Tools/Entries |
|--------------|-------|---------------|
| Sandvik | 2 | Master catalog + tools |
| Kennametal | 4 | Milling, Turning, Threading, Holemaking |
| ISCAR | 2 | Rotating + Turning |
| Korloy | 3 | Rotating, Turning, Tools |
| Tungaloy | 3 | Tooling, Turning, Drill |
| Guhring | 2 | Tools + Holders |
| SECO | 1 | Tools |
| OSG | 1 | Tools |
| Emuge | 1 | Threading |
| YG-1 | 1 | Tools |
| WIDIA | 1 | 2022 catalog |
| MA Ford | 1 | Tools |
| Accupro | 1 | Tools |
| Ingersoll | 1 | Tools |
| Flash | 1 | Tools |
| RapidKut | 1 | Tools |
| AMPC | 1 | Tools |
| CAMFIX | 1 | Tools |

### Holder Catalogs
| File | Description |
|------|-------------|
| `guhring-holders-extracted.json` | Guhring tool holders |
| `haimer-holders-extracted.json` | Haimer shrink-fit holders |
| `tooling-systems-extracted.json` | General tooling systems |

### CAM System Data
| File | Description |
|------|-------------|
| `hypermill-cutting-tech.json` | hyperMILL cutting technology |
| `hypermill-materials.json` | hyperMILL material database |
| `hypermill-tools.json` | hyperMILL tool library |
| `hypermill-iso-fits.json` | ISO fit specifications |
| `hypermill-post-configs.json` | Post processor configs |
| `fusion-post-strategies.json` | Fusion 360 strategies |
| `cimco-post-strategies.json` | CIMCO post strategies |

---

## MEDIUM Priority — Configuration & Knowledge

### Controller Knowledge
| File | Description |
|------|-------------|
| `controller-knowledge.json` | CNC controller info |
| `controller-alarm-database.json` | Alarm codes & fixes |
| `alarm-fix-procedures.json` | Repair procedures |
| `siemens-sinumerik-tips.json` | Sinumerik tips |
| `fanuc-controller-tips.json` | Fanuc tips |

### Machine Data
| File | Description |
|------|-------------|
| `gwizard-machines.json` | G-Wizard machine DB |
| `hsm-advisor-machines.json` | HSM Advisor machines |
| `hsm-advisor-tools.json` | HSM Advisor tools |

### Programming Catalogs
| File | Description |
|------|-------------|
| `calculatorProgrammingCatalog.json` | Programming environments |
| `catalog-inventory.json` | Catalog inventory index |
| `catalog-c010b-extracted.json` | C010b catalog data |

---

## LOW Priority — State & Archives

### Data State Files (data/*.json)
| File | Purpose | Action |
|------|---------|--------|
| `ACTIVE_CLAIM.json` | Current claim state | Keep |
| `MASTER_INDEX.json` | Engine/dispatcher index | Keep |
| `roadmap-index.json` | Roadmap state | Keep |
| `roadmap-registry.json` | Roadmap registry | Keep |
| `schema-changelog.json` | Schema versions | Keep |
| `doc_baselines.json` | Doc baselines | Archive |
| `quick-ref.json` | Quick reference | Archive |
| `machine-learning-data.json` | ML training data | Evaluate |
| `ppg-asset-catalog.json` | PPG assets | Keep |
| `tool-catalog-inventory.json` | Tool inventory | Keep |

### Claims Directories (data/claims/)
~40 milestone claim directories — **ARCHIVE candidates**
These contain temporary claim state and can be archived after milestone completion.

### Docs Directory (data/docs/)
~50 documentation files — Review for consolidation

---

## Consolidation Recommendations

### Immediate Actions (P0-U02)
1. **Verify Registry Integrity** — Ensure all registries have consistent schemas
2. **Merge Duplicate Tool Data** — Some manufacturers have multiple files
3. **Index All Extracted Catalogs** — Create unified catalog index
4. **Backup CRITICAL Files** — Create versioned backups

### Future Actions (P0-U03)
1. **Archive OLD Claims** — Move completed claim dirs to archive/
2. **Consolidate Controller Tips** — Merge Fanuc/Siemens tips
3. **Create Data Version Control** — Schema versioning for all JSON
4. **Document Data Flows** — Map data dependencies

---

## Directory Structure Target

```
mcp-server/
├── data/
│   ├── catalogs/          # Unified catalog location
│   │   ├── tools/         # Tool catalogs by manufacturer
│   │   ├── holders/       # Holder catalogs
│   │   ├── machines/      # Machine data
│   │   └── materials/     # Material data
│   ├── knowledge/         # Knowledge bases
│   │   ├── controllers/   # Controller-specific
│   │   └── cam-systems/   # CAM system data
│   ├── state/             # Runtime state
│   │   ├── claims/        # Active claims
│   │   └── roadmap/       # Roadmap state
│   ├── archive/           # Historical data
│   └── indexes/           # Index files
└── src/
    ├── registries/        # TypeScript registries (keep current)
    ├── physics/           # Physics constants (keep current)
    └── data/              # Migrate JSON → data/catalogs/
```

---

## File Counts by Extension

| Extension | Count | Location |
|-----------|-------|----------|
| .ts | 24 | src/registries/ |
| .json | 11 | data/ |
| .json | 49 | src/data/ |
| .md | ~20 | data/docs/ |

**Total Data Files: ~84**

---

## Next Steps

1. **P0-U02**: Migrate CRITICAL priority files (formulas, physics, material data)
2. **P0-U03**: Migrate HIGH priority files, archive LOW priority

---

*Generated by L0-NEW-MS0 Data Consolidation milestone*
