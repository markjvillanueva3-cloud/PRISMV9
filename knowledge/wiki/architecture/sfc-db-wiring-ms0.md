---
title: SFC Database-Wiring MS0 -- reference-catalog endpoints + frontend select stack
slug: sfc-db-wiring-ms0
type: architecture
domain: speed-feed
slot: oscar
created: 2026-06-28
tags: [sfc, speed-feed, database-wiring, frontend, calculator, reference-catalog]
---

# SFC Database-Wiring MS0

Operator order (2026-06-27, slot:oscar): "wire materials, stock, fixture/work-holding,
tool-holder, tooling, coolant + all machining databases to every input of the SFC app
(web / electron / iOS / Android); ensure every SFC input has all possible DBs wired."

Shipped as 10 gated commits `[SFC-DB-WIRING]/U-OSC-*` on `cad-fusion-live-ms0`.

## Backend: 6 reference-catalog endpoints (`/api/v1/data/*/catalog`)

Each exposes a previously-unwired reference DB as a frontend-ready select catalog,
served by `mcp-server/src/routes/data.ts` (GET passthrough, `next(e)` contract):

| Endpoint | Accessor (`mcp-server/src/utils/`) | Source DB | Facets |
|---|---|---|---|
| `/coating/catalog` | `calculatorCoatingCatalog.ts` | `coatings.json PRISM_COATINGS_COMPLETE` (~57) | `recommendedByMaterial` |
| `/insert/catalog` | `calculatorInsertCatalog.ts` | `inserts.json INSERT_DATABASE` (33 milling) | manufacturers, materials |
| `/coolant/catalog` | `calculatorCoolantCatalog.ts` | `coolants.json` effectiveness+factors (8 methods) | `recommendedByMaterial` |
| `/coolant-product/catalog` | `calculatorCoolantProductCatalog.ts` | `COOLANT_DATABASE`+`MQL_DATABASE` (71 products) | vendors, coolingTypes |
| `/turning-insert/catalog` | `calculatorLatheInsertCatalog.ts` | `inserts.json LATHE_INSERT_DATABASE.turningInserts` | shapes (insertShapes join) |
| `/stock/catalog` | `calculatorStockCatalog.ts` | `data/state/materials-stock.json` (JM stock) | forms, isoGroups |

(materials / workholding / tool-holders were already wired via registries + `calculatorData.ts`.)

### The reusable accessor pattern (proven 8x)
Every `calculator*Catalog.ts`:
1. Path via `path.join(PATHS.MCP_SERVER, "data", ...)` -- NOT `PATHS.DATA_DIR` (that is repo-root
   `H:/prism/data`; the reference DBs live under `mcp-server/data`).
2. Pure exported `buildXOptionsFromStores(stores)` normalizer + pure `buildXCatalog(db)` seam --
   so the curated fail-soft branch is directly unit-testable without filesystem IO.
3. Fail-soft to a curated set (`source:"curated"`, `liveCount:0`) -- never a silent-empty list;
   `source`/`liveCount` report the degradation honestly (R12).
4. Cache: latch on file-missing or successful-parse; do NOT latch on a transient/parse throw
   (retry next call -- survives a reference-DB mid-rewrite).
5. ASCII-only source (the ascii-guard blocks em dash / degree / mu / ellipsis); display strings
   format from structured numeric fields, so a `detail` string stays ASCII.
6. Tests: happy reference-values + >=3 failure + >=2 adversarial + curated branch + live round-trip,
   plus one HTTP round-trip in `data-routes.test.ts`.

## Frontend (oscar OWNS the SFC frontend; operator 2026-06-22 overrides the quebec gate)

Dependency-roots shipped (both validatable WITHOUT `:3100`, mocked fetch):
- `web/src/api/sfcReferenceCatalogs.ts` -- 6 typed fetchers + `fetchCatalog` helper (clones the
  `calculatorData.ts dataRequest` idiom: `/api/v1/data` prefix, `result` unwrap, throw-on-non-ok)
  + `SFC_CATALOG_FETCHERS` as-const registry. Response interfaces match the backend shapes
  field-for-field.
- `web/src/components/DbBackedSelect.tsx` -- reusable select: loads by a catalog key via the
  registry, renders honest loading / live / curated / error state, design-token compliant
  (`h-11`/`md:h-9` 44pt target, Tailwind utilities only, `<label htmlFor>`, focus ring,
  `aria-busy`/`aria-invalid`/`role=alert`). 8 RTL tests.

### REMAINING (the destination)
Wire `SpeedFeedPage` (hardcoded selects ~@372/462/513) + `SfcCalculatorPage` (~@279) to
`DbBackedSelect`. This unit NEEDS `:3100` UP -- the oscar galaxy doctrine + soul MANDATE
closed-loop validation on the saleable SFC product (verify the end-to-end calc is correct,
JM Die machines first; refuse `publishing-a-speed-feed-without-uncertainty`). `CalculatorPage`
is already DB-wired via `calculatorData.ts` -- reuse its pattern.

## Bug-findings this session (R16 -- closed before they bit downstream)
- **React 19 `JSX.Element` return annotation** passes vitest (esbuild strips types) but fails
  `tsc -b` (the global `JSX` namespace moved to `React.JSX` under `@types/react@19`). Fix: drop the
  explicit annotation (let it infer, matching every sibling component) -- config-agnostic + grep
  confirms 0 `JSX` tokens remain. Classic green-tests/red-build silent break.
- **Cross-store data mis-file** in `coolants.json`: `hangsterfers.coolube_2210` is duplicated into
  BOTH `COOLANT_DATABASE` (its own `type` reads "MQL Lubricant") and `MQL_DATABASE`. A shared `seen`
  Set deduped flood-first, mis-tagging an MQL product as flood. Fix: flatten MQL FIRST so a
  cross-store duplicate resolves to the authoritative MQL tag; flagged the source mis-file for
  juliett (DB owner) -- do not edit the shared reference DB from oscar.
- **`materials-stock.json` lives in `data/state/`, NOT `prism-reference-db/`** -- an earlier
  "no stock DB exists" claim was scoped only to `prism-reference-db/`. Records = `MaterialStockItem`;
  `MaterialStockEngine` is an in-memory ERP CRUD Map (empty at rest), so the accessor reads the file
  directly as the read-only SELECT view -- not a CRUD duplicate.

## Pointers
- Memory: `reference_oscar_sfc_db_wiring_backend_2026_06_27`
- Handoff: `state/shared/handoffs/HANDOFF-claude-19f150b9-oscar-sfc-db-wiring.md`
- Spec: `state/shared/specs/SFC-DATABASE-WIRING-PLAN-2026-06-27.md`
