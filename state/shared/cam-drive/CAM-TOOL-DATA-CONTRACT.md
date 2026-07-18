# CAM Tool-Data Contract — kilo ← charlie/hotel (JM purchased-tool data for program generation)

**Owner:** kilo · **Date:** 2026-06-01 · **Unit:** U-CAM-TOOL-DATA-CONTRACT
**/goal clause #5:** *"utilize hotel and charlie data for jm purchased tools to write programs based off jm tools (teach the system to generate programs based off customer availability)."*

This is the concrete data contract + the cross-slot request — the **tool-side analogue of the delta Fusion coordination**. kilo has built the consumer (`scripts/lib/cam-tool-binder.mjs`, 11/11 tests); it needs the JM-owned tool inventory in the shape below from the slot/galaxy that owns procurement data.

## Why this is a coordination request (not a kilo build)
The JM purchased-tool corpus is **charlie/hotel-owned and gitignored** — it is NOT present in kilo's worktree:
- `scripts/build-vendor-catalog-db.mjs` — **absent** in `H:/prism-slot-kilo` (referenced by CLAUDE.md §CANONICAL SOURCES but not in this tree/branch).
- `state/shared/quoting/` (charlie's source, gitignored) — **absent/empty** here.
- `mcp-server/data/vendor-catalog-db/` (the consolidated output) — **absent/empty** here.
- No file matching JM purchased-tooling data by name in this worktree.

So kilo **cannot** materialize it alone (R13 — don't build a consumer atop absent data, and don't fabricate a tool: a made-up insert grade/holder is an unsafe program). kilo built everything that *consumes* the data and fails loud until it arrives.

## The contract — what kilo needs
A JSON document (`mcp-server/data/vendor-catalog-db/jm-turning-tools.json` or equivalent) of the shape the binder consumes:

```json
{
  "tools": [
    {
      "id": "T01-CNMG432-PR1535",          // stable JM tool id (station+insert+grade)
      "tcode": "T0101",                      // turret station / offset code
      "holder": "REGO-FIX CAPTO C6",         // JM-owned holder (jmDieSelectorCatalog vocabulary)
      "op_families": ["facing", "OD_roughing"],  // CAM-OP-TEMPLATE-MATRIX family keys this tool serves
      "insert": {
        "iso_shape": "CNMG",                 // ISO insert designation
        "nose_radius_in": 0.032,             // INCH (JM is imperial — units-first)
        "grade_iso_groups": ["P", "M", "K"]  // ISO material groups the owned grade is rated for
      },
      "qty_on_hand": 12,                      // optional — availability ranking
      "vendor": "Tungaloy"                    // optional — provenance
    }
  ]
}
```

### Field requirements
| field | required | drives |
|---|---|---|
| `id` | ✅ | program tool callout / traceability |
| `tcode` | ✅ | turret station in the emitted program |
| `holder` | ✅ | holder collision/length context (deflection L from holder) |
| `op_families[]` | ✅ | **the binding key** — must use the 8 CAM-OP-TEMPLATE-MATRIX family ids (`facing`, `OD_roughing`, `OD_finishing`, `ID_boring`, `drilling_centering`, `grooving`, `parting_cutoff`, `threading`) |
| `insert.iso_shape` | ✅ | carried on the bound tool for the **downstream** physics/finish surface (NOT a binder match key) |
| `insert.nose_radius_in` | ✅ (INCH) | carried for the **downstream** surface-finish + max-feed gate (feed ≤ ~nose_R for finish) computed in `cutting_condition_directive` — NOT gated by the binder |
| `insert.grade_iso_groups[]` | ✅ | **ISO grade match** — the binder prefers a tool whose owned grade is rated for the part's ISO group; mismatch → `bound_no_iso_grade_match` (verify/procure) |
| `qty_on_hand`, `vendor` | optional | availability ranking, provenance |

**Binder scope (explicit — resolves a doc↔code disagreement, R12/R7):** `bindTool` matches on **`op_families` + `grade_iso_groups` only**. It carries `iso_shape` + `nose_radius_in` through on the bound tool but does **not** itself validate finish/shape suitability or the feed-vs-nose-radius gate — those are **delegated downstream** to the physics surface (`cutting_condition_directive`, which imports `mcp-server/src/physics/constants.ts`). This matches PRISM's "physics owns the numbers" architecture: the binder answers *which JM tool*, the physics layer answers *suitability + cutting conditions*. Do not add a finish-suitability gate to the binder without moving the constants in (which would violate the no-inline-constants rule).

## What kilo does with it (already built)
`bindTool(recipe, toolDb, {material_iso_group})` → for each op family:
- **`bound_iso_matched`** — JM owns a tool for this family with a grade rated for the part's ISO group → program is written against that exact tool.
- **`bound_material_pending`** — tool exists; material/ISO not yet resolved (units-first) → hold.
- **`bound_no_iso_grade_match`** — JM owns a family tool but no grade for this ISO group → verify or flag procurement.
- **`no_tool_for_family`** — JM owns nothing for this family → **procurement gap surfaced to charlie/hotel** (customer-availability signal: this op can't be cut on JM tooling as-is).
- **`pending_tool_data`** — DB absent → fail loud, never fabricate.

`bindToolsForPart(plan, toolDb)` rolls this over a full part program and tallies bound/pending/no_tool.

## REQUEST — charlie / hotel
1. **Provide** `jm-turning-tools.json` in the shape above (or point kilo at where JM purchased-tool data actually lives so kilo can write a one-shot transform into this shape — kilo will own the transform if given the source path/columns).
2. If a `build-vendor-catalog-db.mjs` exists on your tree, note whether it can emit the `tools[]` turning slice with `op_families` + `grade_iso_groups`, or whether that mapping is new work.
3. **Customer-availability teaching loop:** every `no_tool_for_family` / `bound_no_iso_grade_match` kilo emits is a procurement signal — destination TBD with charlie (a `state/shared/cam-drive/PROCUREMENT-GAPS.jsonl`?).

## Status
- ✅ Consumer built + tested (`cam-tool-binder.mjs`, 11/11). Fails loud on absent data.
- ✅ Contract specified (this doc).
- ⏳ **Blocked on charlie/hotel** providing the data or the source pointer. Posted to bus for charlie/hotel.

Pairs with `FUSION-INSTANCE-COORDINATION.md` (the delta-side coordination — same drive-kilo's-side-then-request pattern) + `CAM-OP-TEMPLATE-MATRIX.json` (the `op_families` keys) + `CLOSED-LOOP-LATHE-TRAINING-REGIMEN.md`. Memory: [[reference_cam_tool_data_contract_2026_06_01]].
