# Lathe Knowledge Source Completeness — U-LTH05

**Generated:** 2026-07-01T18:36:08.552Z
**Exit condition:** >=3 knowledge sources per feature (tribal + reference + formula)

## Data Source Pools

| Pool | Count | Path |
|---|---:|---|
| Lathe-relevant data files | 96 | mcp-server/src/data/ |
| JM Die CNC LATHE customer folders | 119 | JM DIE/CNC LATHE/ |
| Constants symbols present | 2 | mcp-server/src/physics/constants.ts |

## Feature-by-Feature Coverage

| Feature | Tribal Files | Reference Programs | Formula Groups | Sources | Pass? |
|---|---:|---:|---:|---:|:-:|
| P1 Speed & Feed Calculator | 15 | 6 | 2 | 3/3 | YES |
| P2 Post-Processor Generator | 4 | 3 | 1 | 3/3 | YES |
| P3 Master Post-Processor | 7 | 6 | 2 | 3/3 | YES |
| P4 Print-to-Program (THE BIG ONE) | 92 | 7 | 2 | 3/3 | YES |
| P5 ERP / Business Management | 70 | 3 | 1 | 3/3 | YES |

### P1 — Speed & Feed Calculator

**Status:** PASS (>=3 sources)

**Tribal tip files (15):**
- `src/data/hypermill-turning-strategy-catalog.ts`
- `src/data/kennametal-turning-catalog.ts`
- `src/data/lathe-physics-science-tips.ts`
- `src/data/lathe-tribal-tips-okuma.ts`
- `src/data/mitsubishi-turning-catalog.ts`
- `src/data/okuma-dialect-knowledge.ts`
- `src/data/okuma-machines-from-step.ts`
- `src/data/okuma-macro-patterns.ts`
- `src/data/okuma-osp-advanced-knowledge.ts`
- `src/data/okuma-osp-extracted-tips.ts`
- `src/data/okuma-osp-program-examples.ts`
- `src/data/okuma-program-examples.ts`
- `src/data/tungaloy-turning-catalog.ts`
- `src/data/turning-vendor-catalog-loader.ts`
- `src/data/widia-2022-turning-catalog.ts`

**Reference program folders (6):**
- `JM DIE/CNC LATHE/ACME/`
- `JM DIE/CNC LATHE/AFI INDUSTRIES INC/`
- `JM DIE/CNC LATHE/ALCOA/`
- `JM DIE/CNC LATHE/ATF/`
- `JM DIE/CNC LATHE/CLENDENIN/`
- `JM DIE/CNC LATHE/CLENDENIN BROTHERS/`

**Formula groups (2):**
- `CANONICAL_KIENZLE` (constants.ts)
- `CANONICAL_MATERIAL_DB` (constants.ts)

### P2 — Post-Processor Generator

**Status:** PASS (>=3 sources)

**Tribal tip files (4):**
- `src/data/okuma-dialect-knowledge.ts`
- `src/data/okuma-macro-patterns.ts`
- `src/data/okuma-osp-program-examples.ts`
- `src/data/okuma-program-examples.ts`

**Reference program folders (3):**
- `JM DIE/CNC LATHE/ACME/`
- `JM DIE/CNC LATHE/ALCOA/`
- `JM DIE/CNC LATHE/ATF/`

**Formula groups (1):**
- `CANONICAL_KIENZLE` (constants.ts)

### P3 — Master Post-Processor

**Status:** PASS (>=3 sources)

**Tribal tip files (7):**
- `src/data/hsm-advisor-machines.json`
- `src/data/hsm-advisor-tools.json`
- `src/data/hypermill-iso-fits.json`
- `src/data/iso286-extended-catalog.ts`
- `src/data/okuma-dialect-knowledge.ts`
- `src/data/okuma-osp-advanced-knowledge.ts`
- `src/data/threadDataISO.ts`

**Reference program folders (6):**
- `JM DIE/CNC LATHE/ACME/`
- `JM DIE/CNC LATHE/AFI INDUSTRIES INC/`
- `JM DIE/CNC LATHE/ALCOA/`
- `JM DIE/CNC LATHE/ATF/`
- `JM DIE/CNC LATHE/CLENDENIN/`
- `JM DIE/CNC LATHE/CLENDENIN BROTHERS/`

**Formula groups (2):**
- `CANONICAL_KIENZLE` (constants.ts)
- `CANONICAL_MATERIAL_DB` (constants.ts)

### P4 — Print-to-Program (THE BIG ONE)

**Status:** PASS (>=3 sources)

**Tribal tip files (92):**
- `src/data/accupro-tools-extracted.json`
- `src/data/additional-tool-catalog.ts`
- `src/data/additional-tools.json`
- `src/data/ampc-tool-catalog.ts`
- `src/data/ampc-tools-extracted.json`
- `src/data/ampc-tools.json`
- `src/data/camfix-tools-extracted.json`
- `src/data/dormer-pramet-tool-catalog.ts`
- `src/data/edm-material-db.ts`
- `src/data/emuge-tool-catalog.ts`
- `src/data/emuge-tools-extracted.json`
- `src/data/emuge-tools.json`
- `src/data/flash-tools-extracted.json`
- `src/data/global-cnc-tool-catalog.ts`
- `src/data/global-cnc-tools.json`
- `src/data/guhring-tool-catalog.ts`
- `src/data/guhring-tools-extracted.json`
- `src/data/guhring-tools.json`
- `src/data/helical-tool-catalog.ts`
- `src/data/helical-tools.json`
- `src/data/horn-tool-catalog.ts`
- `src/data/hsm-advisor-tools.json`
- `src/data/hypermill-materials-catalog.ts`
- `src/data/hypermill-materials.json`
- `src/data/hypermill-tool-schema-notes.ts`
- `src/data/hypermill-tools.json`
- `src/data/hypermill-turning-strategy-catalog.ts`
- `src/data/indexable-tool-catalog.ts`
- `src/data/indexable-tools.json`
- `src/data/ingersoll-tool-catalog.ts`
- `src/data/ingersoll-tools-extracted.json`
- `src/data/iscar-tools-extracted.json`
- `src/data/iscar-turning-extracted.json`
- `src/data/kennametal-tooling-systems-catalog.ts`
- `src/data/kennametal-turning-catalog.ts`
- `src/data/kennametal-turning-extracted.json`
- `src/data/kennametal-turning.json`
- `src/data/korloy-tools-extracted.json`
- `src/data/korloy-turning-extracted.json`
- `src/data/lathe-hardening-catalog.ts`
- `src/data/lathe-physics-science-tips.ts`
- `src/data/lathe-tooling-catalog.ts`
- `src/data/lathe-tribal-tips-okuma.ts`
- `src/data/ma-ford-tools-extracted.json`
- `src/data/mitsubishi-tool-catalog.ts`
- `src/data/mitsubishi-turning-catalog.ts`
- `src/data/niagara-tool-catalog.ts`
- `src/data/okuma-dialect-knowledge.ts`
- `src/data/okuma-machines-from-step.ts`
- `src/data/okuma-macro-patterns.ts`
- `src/data/okuma-osp-advanced-knowledge.ts`
- `src/data/okuma-osp-extracted-tips.ts`
- `src/data/okuma-osp-program-examples.ts`
- `src/data/okuma-program-examples.ts`
- `src/data/osg-tool-catalog.ts`
- `src/data/osg-tools-extracted.json`
- `src/data/osg-tools.json`
- `src/data/rapidkut-tools-extracted.json`
- `src/data/sandvik-2022-tool-catalog.ts`
- `src/data/sandvik-tool-catalog.ts`
- `src/data/sandvik-tools-extracted.json`
- `src/data/sandvik-tools.json`
- `src/data/seco-tool-catalog.ts`
- `src/data/seco-toolholders-catalog.ts`
- `src/data/seco-tools-extracted.json`
- `src/data/sgs-tool-catalog.ts`
- `src/data/shop-tools`
- `src/data/shop-tools-boring-finish.csv`
- `src/data/shop-tools-boring-rough.csv`
- `src/data/shop-tools-endmills.csv`
- `src/data/shop-tools-insert-drills-130.csv`
- `src/data/shop-tools-insert-drills-180.csv`
- `src/data/shop-tools-turning.csv`
- `src/data/shop-tools-twist-drills.csv`
- `src/data/sumitomo-tool-catalog.ts`
- `src/data/sumitomo-tools.json`
- `src/data/tool-material-categorization.test.ts`
- `src/data/tool-material-categorization.ts`
- `src/data/tooling-systems-extracted.json`
- `src/data/tungaloy-tooling-catalog.ts`
- `src/data/tungaloy-tooling-extracted.json`
- `src/data/tungaloy-tools-extracted.json`
- `src/data/tungaloy-turning-catalog.ts`
- `src/data/tungaloy-turning-extracted.json`
- `src/data/tungaloy-turning.json`
- `src/data/tungaloy-us-tool-catalog.ts`
- `src/data/turning-vendor-catalog-loader.ts`
- `src/data/unknown-tools-extracted.json`
- `src/data/unknown_solid-tools-extracted.json`
- `src/data/widia-2022-turning-catalog.ts`
- `src/data/yg1-tools-extracted.json`
- `src/data/zenit-tool-catalog.ts`

**Reference program folders (7):**
- `JM DIE/CNC LATHE/ACME/`
- `JM DIE/CNC LATHE/AFI INDUSTRIES INC/`
- `JM DIE/CNC LATHE/AGRATI/`
- `JM DIE/CNC LATHE/ALCOA/`
- `JM DIE/CNC LATHE/ATF/`
- `JM DIE/CNC LATHE/CLENDENIN/`
- `JM DIE/CNC LATHE/CLENDENIN BROTHERS/`

**Formula groups (2):**
- `CANONICAL_KIENZLE` (constants.ts)
- `CANONICAL_MATERIAL_DB` (constants.ts)

### P5 — ERP / Business Management

**Status:** PASS (>=3 sources)

**Tribal tip files (70):**
- `src/data/accupro-tools-extracted.json`
- `src/data/additional-tool-catalog.ts`
- `src/data/additional-tools.json`
- `src/data/ampc-tool-catalog.ts`
- `src/data/ampc-tools-extracted.json`
- `src/data/ampc-tools.json`
- `src/data/camfix-tools-extracted.json`
- `src/data/dormer-pramet-tool-catalog.ts`
- `src/data/edm-material-db.ts`
- `src/data/emuge-tool-catalog.ts`
- `src/data/emuge-tools-extracted.json`
- `src/data/emuge-tools.json`
- `src/data/flash-tools-extracted.json`
- `src/data/global-cnc-tool-catalog.ts`
- `src/data/global-cnc-tools.json`
- `src/data/guhring-tool-catalog.ts`
- `src/data/guhring-tools-extracted.json`
- `src/data/guhring-tools.json`
- `src/data/helical-tool-catalog.ts`
- `src/data/helical-tools.json`
- `src/data/horn-tool-catalog.ts`
- `src/data/hsm-advisor-tools.json`
- `src/data/hypermill-materials-catalog.ts`
- `src/data/hypermill-materials.json`
- `src/data/hypermill-tool-schema-notes.ts`
- `src/data/hypermill-tools.json`
- `src/data/indexable-tool-catalog.ts`
- `src/data/indexable-tools.json`
- `src/data/ingersoll-tool-catalog.ts`
- `src/data/ingersoll-tools-extracted.json`
- `src/data/iscar-tools-extracted.json`
- `src/data/kennametal-tooling-systems-catalog.ts`
- `src/data/korloy-tools-extracted.json`
- `src/data/lathe-tooling-catalog.ts`
- `src/data/ma-ford-tools-extracted.json`
- `src/data/mitsubishi-tool-catalog.ts`
- `src/data/niagara-tool-catalog.ts`
- `src/data/osg-tool-catalog.ts`
- `src/data/osg-tools-extracted.json`
- `src/data/osg-tools.json`
- `src/data/rapidkut-tools-extracted.json`
- `src/data/sandvik-2022-tool-catalog.ts`
- `src/data/sandvik-tool-catalog.ts`
- `src/data/sandvik-tools-extracted.json`
- `src/data/sandvik-tools.json`
- `src/data/seco-tool-catalog.ts`
- `src/data/seco-toolholders-catalog.ts`
- `src/data/seco-tools-extracted.json`
- `src/data/sgs-tool-catalog.ts`
- `src/data/shop-tools`
- `src/data/shop-tools-boring-finish.csv`
- `src/data/shop-tools-boring-rough.csv`
- `src/data/shop-tools-endmills.csv`
- `src/data/shop-tools-insert-drills-130.csv`
- `src/data/shop-tools-insert-drills-180.csv`
- `src/data/shop-tools-turning.csv`
- `src/data/shop-tools-twist-drills.csv`
- `src/data/sumitomo-tool-catalog.ts`
- `src/data/sumitomo-tools.json`
- `src/data/tool-material-categorization.test.ts`
- `src/data/tool-material-categorization.ts`
- `src/data/tooling-systems-extracted.json`
- `src/data/tungaloy-tooling-catalog.ts`
- `src/data/tungaloy-tooling-extracted.json`
- `src/data/tungaloy-tools-extracted.json`
- `src/data/tungaloy-us-tool-catalog.ts`
- `src/data/unknown-tools-extracted.json`
- `src/data/unknown_solid-tools-extracted.json`
- `src/data/yg1-tools-extracted.json`
- `src/data/zenit-tool-catalog.ts`

**Reference program folders (3):**
- `JM DIE/CNC LATHE/ACME/`
- `JM DIE/CNC LATHE/ALCOA/`
- `JM DIE/CNC LATHE/ATF/`

**Formula groups (1):**
- `CANONICAL_MATERIAL_DB` (constants.ts)

## Overall

- Features evaluated: 5
- Passing (>=3 sources): 5
- Failing: 0

---

**Exit condition status:** PASS — 5/5 features meet the >=3-source threshold.
