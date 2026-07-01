# U-PROGRAM-LIBRARY frontend wiring spec — 2026-05-25 (whiskey)

Operator directive (2026-05-24): *"wire, link and bridge what you built to the lathe wizard, lathe calculator studio page, shop management, business management, employee portals and all other viable front end nodes. have previous programs for parts and upgraded versions with a star indicating they've been optimized by prism. allow users to double click to download and send to a machine by selecting it in a pop up window for machine fleet for the shop. or download or pull up the file to put on a usb for transfer. wire it to all recognition features and data matching so camera use can be utilized throughout the whole app"*.

Backend is shipped — this spec turns the live dispatcher action into 5 turnkey frontend bindings.

## Single backend surface

```
MCP action: prism_ai:jm_die_lathe_program_library
Schema:     mcp-server/src/schemas/aiReasoningActionSchemas.ts:655 (zod, .passthrough())
Engine:     mcp-server/src/engines/LatheProgramLibraryEngine.ts (LatheProgramLibraryEngine.list)
Dispatcher: mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts:925
```

### Query shape (all fields optional)

| field | type | default | use |
|---|---|---|---|
| customer | string | (none) | filter to one customer folder under `JM DIE/CNC LATHE/` |
| partNumber | string | (none) | filter to a single part number — **camera-recognition entry point** |
| search | string | (none) | case-insensitive substring on filename |
| limit | number | 200 | pagination cap; `0` returns dispatch metadata only |
| includeAudit | boolean | false | run audit per variant inline (slow on large libraries) |

### Result shape (frontend-binding contract)

```jsonc
{
  "schemaVersion": "1.0.0",
  "asOf": "2026-05-25T...Z",
  "totalEntries": 412,
  "truncated": true,
  "dispatchableMachines": [
    { "machineId": "LTH-01", "machineModel": "Okuma_GENOS_L300-M", "controllerFamily": "okuma" },
    // … 7 entries total — populates the "send to machine" pop-up
  ],
  "entries": [
    {
      "customer": "ALCOA",
      "partNumber": "10-2A2-2-PR",
      "sourcePath": "H:/PRISM/JM DIE/CNC LATHE/ALCOA/10-2A2-2-PR.nc",
      "sourceSizeBytes": 4096,
      "hasOptimized": true,    // ⭐ — true ↔ render ★ on the part row
      "hasShopFloorSafe": true, // ✓ — true ↔ enable dispatch button (audit pass)
      "variants": [
        {
          "machineId": "LTH-06",
          "machineModel": "Okuma_LB-3000EX_BigBore",
          "downloadPath": "H:/PRISM/JM DIE/CNC LATHE/ALCOA/PRISM_UPGRADED/Okuma_LB-3000EX_BigBore/10-2A2-2-PR.nc",
          "sizeBytes": 4321,
          "mtimeIso": "2026-05-24T...Z",
          "optimized": true,    // ⭐ per-variant ★
          "auditVerdict": "pass" // when includeAudit:true
        }
      ]
    }
  ]
}
```

## 5-frontend wiring matrix

### 1. `lathe-wizard` — step-by-step program walkthrough

| binding | source |
|---|---|
| customer-picker dropdown | `dispatchableMachines.map(m => m.machineModel)` (de-dup) + customer list from a `{ limit: 0 }` aggregate hit |
| part-row table | `entries[]` → render `{ customer, partNumber, hasOptimized ? '⭐' : '', variants.length }` |
| machine-variants accordion (per row click) | `entries[i].variants[]` → render `{ machineModel, mtimeIso, optimized ? '⭐' : '' }` |
| "send to machine" pop-up | iterate `dispatchableMachines` → 7-button selector |
| double-click → download | `window.electron.send('open-file', variant.downloadPath)` (or `<a download>` for web) |

### 2. `lathe-studio` (Lathe Calculator Studio page)

Same engine call, different lens. Studio renders the **physics-trace** view per variant:
- header strip → `entries[i].partNumber + variants[j].machineModel + optimized ? '⭐ PRISM v2' : 'V1 source'`
- left pane → opens `variant.downloadPath` in a syntax-highlighted G-code view
- right pane → `prism_ai:jm_die_lathe_audit` call (separate dispatcher action — already shipped, JM-DIE-LATHE-UPGRADE-MS0/U-AUDIT-PIPELINE) for inline verdict
- bottom strip → "regenerate" button → calls `prism_ai:jm_die_lathe_upgrade_v2`

### 3. `shop-management` — fleet dispatcher view

| binding | source |
|---|---|
| machine card (× 7) | `dispatchableMachines[i]` → header + active-program slot |
| recent variants per machine | filter `entries[].variants[].machineId === thisMachine.machineId`, sort by `mtimeIso desc` |
| "drag part to machine" UX | drag `entries[i]` card onto machine card → POST `variant.downloadPath` + `machineId` to shop-floor MTConnect bridge |
| USB-export button | reads `variant.downloadPath`, copies to mounted USB device path |

### 4. `business-management` — cost / margin analytics

| binding | source |
|---|---|
| customer top-N revenue list | aggregate `entries[].customer` (unique-customer count) — every customer with ≥ 1 part is an active relationship |
| program-count per customer | group `entries[]` by `customer`, count rows |
| optimized-coverage KPI | `entries.filter(e => e.hasOptimized).length / entries.length` — fleet PRISM-adoption metric |
| shop-floor-safety KPI | `entries.filter(e => e.hasShopFloorSafe).length / entries.length` — audit pass rate |

### 5. `employee-portal` — operator + machinist self-serve

| binding | source |
|---|---|
| "my programs today" feed | filter `entries[].variants[].mtimeIso` ≥ 24h ago |
| barcode/QR scan → part lookup | scan → extracted partNumber → `list({ partNumber })` → render variants matrix |
| "send to my machine" | reads operator's assigned machineId from session → filters `variants[].machineId === me.machineId` |
| download to USB | identical to shop-mgmt USB-export |

## Camera-recognition bridge

The `partNumber` query field is the single integration point for every recognition consumer (OCR on blueprint title block, label scanner, vision-system part-number reader, etc.):

```javascript
// Recognition pipeline output → MCP call
const recognizedPartNumber = ocrEngine.extractTitleBlock(blueprintImage).partNumber;
const library = await mcp.call('prism_ai:jm_die_lathe_program_library', {
  partNumber: recognizedPartNumber,
  limit: 10
});

if (library.entries.length === 0) {
  // First-time part — route to lathe-wizard "new program" flow
} else if (library.entries[0].hasOptimized) {
  // Existing optimized variant — auto-select target machine, render dispatch dialog
} else {
  // V1-only — surface regenerate-v2 CTA
}
```

Recognition consumers do **not** need a custom endpoint; they all bind through `partNumber`.

## Operator UX requirements (verbatim from /goal #6)

1. ✅ "previous programs for parts and upgraded versions with a star indicating they've been optimized by prism" → `entry.hasOptimized` + per-variant `variant.optimized`. Frontend renders `★` when true.
2. ✅ "users to double click to download and send to a machine" → double-click handler on `entry` row → pop-up `<select>` over `dispatchableMachines` → submit-to-machine endpoint.
3. ✅ "selecting it in a pop up window for machine fleet for the shop" → pop-up is populated from `dispatchableMachines[]` (7 buttons, controller-family badge per machine).
4. ✅ "download or pull up the file to put on a usb for transfer" → `variant.downloadPath` is a filesystem path; frontend `<a href="file://...">` works on Electron, or `electron.shell.openPath` for opening the file in OS file-manager.
5. ✅ "wire it to all recognition features and data matching so camera use can be utilized" → `partNumber` query field; recognition pipeline contract documented above.

## Test plan (frontend slot picks up)

| test | shape |
|---|---|
| Schema-contract | given the live action result, assert `schemaVersion === "1.0.0"` + `dispatchableMachines.length === 7` |
| Empty corpus | with no JM Die corpus mounted, returns valid shape with `entries.length === 0` |
| `partNumber` lookup | hit with `{ partNumber: <known-existing> }` → returns 1-entry result with ≥ 1 variant |
| Optimized-star | `entry.hasOptimized` is the boolean OR of every `variant.optimized` |
| Camera-recognition contract | mock OCR output → MCP call → frontend renders correct dispatch UI |

Existing backend tests: `mcp-server/src/__tests__/LatheProgramLibraryEngine.test.ts` — covers schema-contract + filter behavior + variant-shape contract.

## Build-order recommendation for frontend slots

1. **`mcp-server/web/` first** (already-built React/Vite host) — wire `lathe-studio` page first since it's the simplest consumer (just calls the action + renders one variant at a time). 1-day build per slot.
2. **`shop-management` next** — adds the dispatch-to-machine pop-up + USB export; reuses lathe-studio's audit-call.
3. **`lathe-wizard` next** — full step-by-step, biggest UX surface; depends on the dispatch pop-up shipped in #2.
4. **`business-management` + `employee-portal`** in parallel — both are mostly aggregates over the same `entries[]`; can be split across two slots.

## Forward-compat hook for mike's capability data

Once `slot/mike` `MIKE-LATHE-CAPABILITY-MS0` merges into `cad-fusion-live-ms0`:
- `LatheProgramLibraryEngine.list()` can read `jm-die-lathe-capabilities.ts` and surface per-machine max-RPM / max-DOC / live-tool flags directly on `dispatchableMachines[i]`.
- Recommended new fields: `dispatchableMachines[i].spindleRpmMax`, `.hasLiveTool`, `.hasSubSpindle`, `.controllerUpgradeCeiling` — drives smarter machine-selection in the dispatch pop-up (e.g., disable a machine button when the variant requires live-tool but the machine lacks it).
- Tracked: `U-UPGRADE-CAPABILITY-AWARE` in `state/shared/dashboards/lathe-fleet-task-inventory-2026-05-24.md`.

## File-list (already shipped)

| file | status |
|---|---|
| `mcp-server/src/engines/LatheProgramLibraryEngine.ts` | shipped (HEAD) |
| `mcp-server/src/__tests__/LatheProgramLibraryEngine.test.ts` | shipped (HEAD) |
| `mcp-server/src/schemas/aiReasoningActionSchemas.ts` (action enum + zod body + map entry) | shipped (HEAD) |
| `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts` (case handler) | shipped (HEAD) |
| `state/shared/specs/U-PROGRAM-LIBRARY-FRONTEND-WIRING-SPEC-2026-05-25.md` | THIS file |
