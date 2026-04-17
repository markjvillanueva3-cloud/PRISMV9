# CAMX-V17-P9 → WEDM-CONSOLIDATED Migration

**Status:** DEPRECATED 2026-04-16 (MS-P0-V U-P0-V04)
**Superseded by:** MS-P3-TIER6A + MS-P3-TIER6B (under WEDM-CONSOLIDATED track)
**Authority:** WEDM-CONSOLIDATED-ROADMAP.md v1.3.1 + PRISM-UNIFIED-ROADMAP-v2.md

---

## Why deprecated

CAMX-V17-P9 was drafted under the CAMX-v17 track (2026-03-23) before the WEDM-CONSOLIDATED roadmap existed. When WEDM-CONSOLIDATED absorbed all Wire EDM and Sinker EDM work under a single 14-phase track, CAMX-V17-P9's 40 units became structurally redundant:

- **Pipeline already built:** 12 engines, 151 tests shipped — CAMX-V17-P9 assumed this as precondition; WEDM-CONSOLIDATED MS-P0-V verifies it as baseline
- **Tier 6 complex parts:** folded into **MS-P3-TIER6A** (progressive die + spline broach + PCD) with RGS v10 unit structure
- **Sinker pipeline completion:** folded into **MS-P3-TIER6B** with explicit dependency on MS-P2.5-SAFETY gates

Keeping CAMX-V17-P9 active would create forked execution paths for the same work, fragment orphan-detection reporting, and risk duplicate engine creation.

---

## Unit mapping (camx_unit_id → replacement_p3_unit_id)

CAMX-V17-P9 used a generic 40-unit template pointing to `CAMX-FINAL-ROADMAP-v17.md` (not found in current workspace; archived). The unit IDs U01–U40 were not differentiated in the envelope — each referenced the same external doc for detail. Mapping is therefore done at the **phase level** rather than unit-by-unit:

| CAMX-V17-P9 scope area | Replacement milestone | Replacement unit range |
|------------------------|----------------------|------------------------|
| Tier 6 progressive die programs | **MS-P3-TIER6A** | U-P3-T6A-01 through U-P3-T6A-08 |
| Tier 6 spline broach + PCD cutting | **MS-P3-TIER6A** | U-P3-T6A-09 through U-P3-T6A-14 |
| Sinker EDM pipeline completion | **MS-P3-TIER6B** | U-P3-T6B-01 through U-P3-T6B-12 |
| Cross-validation / Tier 6 acceptance | **MS-P6-VAL30** | U-P6-V30-* (30-job validation suite) |
| WEDM baseline verification | **MS-P0-V** | U-P0-V01 through U-P0-V04 (THIS milestone) |

### For anyone reading old CAMX-V17-P9 references

- If a commit message, PR, or task mentions `CAMX-V17-P9` or `CAMX-v17` after 2026-04-16 — treat it as historical.
- New work on Tier 6 parts → claim MS-P3-TIER6A or MS-P3-TIER6B instead.
- CAMX-V17-P9.json envelope remains on disk for audit trail; status field is `DEPRECATED`.

---

## What was preserved

- `mcp-server/data/milestones/CAMX-V17-P9.json` — kept (with deprecation flag) for audit / rollback
- `mcp-server/data/roadmap-index.json` entry — kept with `status: DEPRECATED` + `superseded_by` field
- Engine inventory from CAMX-V17-P9's 12 engines — recorded in `WEDM_CONSOLIDATED_BASELINE.json` (U-P0-V03)

## What was NOT carried over

- The original CAMX-FINAL-ROADMAP-v17.md external doc (not in current workspace — referenced as `C:/PRISM/CAMX-FINAL-ROADMAP-v17.md`)
- The unit-by-unit descriptions (were placeholders pointing at the external doc)

---

## Validation

After this migration:
- `node -e "const r=require('./mcp-server/data/roadmap-index.json'); console.log(r.milestones.find(m=>m.id==='CAMX-V17-P9').status)"` → `DEPRECATED`
- `mcp-server/data/milestones/CAMX-V17-P9.json` has top-level `"status": "DEPRECATED"` field
- `BASELINE_INVENTORY.json` re-verified to show no orphan milestones in CAMX-v17 track (CAMX-V17-P9 was the only one)

---

**End of migration record.**
