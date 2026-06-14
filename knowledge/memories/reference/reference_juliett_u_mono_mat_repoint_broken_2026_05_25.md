---
name: juliett-u-mono-mat-repoint-broken-2026-05-25
description: "U-MONO-MAT-REPOINT premise BROKEN — materials_v9_complete has 3 files (S_SUPERALLOYS only), not 1,047 materials. Repoint would brick 6/7 ISO groups."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.177Z
aliases: reference_juliett_u_mono_mat_repoint_broken_2026_05_25
---


# U-MONO-MAT-REPOINT — R12 fail-loud finding (2026-05-25 juliett `claude-f75381c1`)

**Slot:** juliett · `/loop [5m] /goal` execution targeting U-MONO-MAT-REPOINT (from JULIETT-DB-BRIDGE-PLAN-2026-05-25.md as tier-0 pickup).

## Premise (as stated in MILESTONE_PROGRESS / ROADMAP-CONSOLIDATED)

> Repoint `mcp-server/src/constants.ts:61` `PATHS.MATERIALS_DB` → `extracted/materials_v9_complete/` (1,047 materials, not the 3-file data/materials/) — gives SFC the vendor material DB. Tier 0.

## Reality on disk (2026-05-25)

| Path | JSON files | ISO group subdirs present |
|------|-----------:|---------------------------|
| `H:/prism/data/materials/` (current target) | **7** | All 7 (H/K/M/N/P/S/X) + core/enhanced/learned |
| `H:/prism/extracted/materials/` | **3** | All 7 ISO groups present (same structure) |
| `H:/prism/extracted/materials_v9_complete/` (proposed target) | **3** (all `.js` batch files) | **ONLY `S_SUPERALLOYS/`** — 6 of 7 ISO groups MISSING |

`MATERIALS_V9` is already defined as a path constant (constants.ts:98) but is empty for almost every ISO group.

## Why the repoint is unsafe today

`MaterialRegistry.ts:50` loads in parallel across 7 ISO groups:

```ts
const isoGroups = ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"];
```

Repointing `MATERIALS_DB` → `materials_v9_complete/` would silently load 0 materials for 6 of 7 ISO groups (fileExists fails, the loop skips). UltimateSpeedFeedEngine, AutoSpeedFeed, KienzleKc11Fit, all of MS-SFC-CALIBRATE — every downstream SFC consumer would lose material context for P/M/K/N/H/X groups. Hard failure at runtime, hidden at build time. Karpathy R12.

## What the unit ACTUALLY needs (prerequisite)

A new unit must ship BEFORE U-MONO-MAT-REPOINT:

**`U-MAT-V9-POPULATE`** — Populate `extracted/materials_v9_complete/` with the missing 6 ISO groups (P/M/K/N/H/X). Source: ?? — needs investigation. The monolith claim of "1,047 materials × 127 parameters" probably refers to a different extraction not yet run. The `.js` batch files in S_SUPERALLOYS hint at a batch extraction script that was only run for the S group.

Investigate: `scripts/extract-materials*.mjs` or `mcp-server/extract*materials*.ts` for the batch generator. Re-run for the other 6 groups.

Until then: U-MONO-MAT-REPOINT must NOT be claimed. Mark as `blocked-by U-MAT-V9-POPULATE` in the roadmap. The "1,047 materials" claim in MILESTONE_PROGRESS is aspirational — the loaded count is currently **7 JSON files** total (data/materials/), and the v9 dir has **0** for 6 of 7 groups.

## Doctrine

- **Always verify the disk** before executing a "repoint constant X → path Y" unit — the roadmap claim may be from a stale or pre-extraction snapshot. [[feedback_verify_actual_contract_not_proxy]]
- **Karpathy R12 fail-loud** — surface the broken premise, do not silently execute. [[feedback_r5_thru_r12_doctrine]]
- **Doc-comment counts ARE aspirational** — `MaterialRegistry.ts:3` claims "1,047 materials × 127 parameters"; actual loaded is 7. Read the disk, not the doc.

## Next juliett action

Skip U-MONO-MAT-REPOINT. Pivot to either:
- **U-DB-BRIDGE-05** (FeatureStorePublicAccessEngine, ~1.5h, smallest, no DB-data dependency)
- **ghost.database_surfaces roost** generator (~1-2h, visibility-first; surfaces this very gap as a child node)
- **U-MAT-V9-POPULATE** (investigate source-of-truth for the 1,047 number; if found, repoint becomes safe)

Documented to: `state/shared/specs/JULIETT-DB-BRIDGE-PLAN-2026-05-25.md` (already mentions tier-0 ranking — needs an addendum striking U-MONO-MAT-REPOINT pending populate-prereq).

Related: [[reference_juliett_sf_queue_stale_drift_2026_05_22]] — juliett's queue is heavily stale-drifted; envelope-drift class of false-positive that bites us.
