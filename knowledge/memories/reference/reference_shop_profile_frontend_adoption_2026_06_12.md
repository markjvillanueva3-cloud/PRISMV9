---
name: reference_shop_profile_frontend_adoption_2026_06_12
description: JM shop-profile frontend ordering is wired into SmartMachineSelector (canonical data/machines.ts). Other web pages use separate page-local machine lists (PRESET_MACHINES/MILLING_MACHINES/CATALOG_MACHINES/JM_DIE_MACHINES) -- quebec-lane to adopt shopUsageOrder.ts per page.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.188Z
aliases: reference_shop_profile_frontend_adoption_2026_06_12
---


Slot papa, 2026-06-12 (session 14ef4ae0). Frontend shop-usage ordering adoption map.

**Built + wired (papa):** `mcp-server/web/src/data/shopUsageOrder.ts` (pure helper: `orderMachinesByShopUsage`, `machineUsageWeight`, `fetchShopProfile`) is consumed by `src/components/sfc/SmartMachineSelector.tsx`, which orders the canonical `src/data/machines.ts` `MACHINES[]` by real JM shop usage (Okuma lathes first) from `/jm-shop-profile.json`. Only `SfcCalculatorPage` uses SmartMachineSelector, so only it gets ordering today. 7/7 tests (`src/__tests__/shopUsageOrder.test.ts`).

**NOT yet adopted (quebec-lane — different page-local machine lists, each a different shape, NOT data/machines.ts):**
- `src/pages/CycleTimePage.tsx:339` -> `PRESET_MACHINES`
- `src/pages/JobPlannerPage.tsx:133` -> a local `MACHINES` (`{value,...}` shape, not data/machines)
- `src/pages/MillingWizardPage.tsx:411` -> `MILLING_MACHINES`
- `src/pages/SpeedFeedPage.tsx:150,462` -> `CATALOG_MACHINES` + `JM_DIE_MACHINES` (`{id,label}` dropdown -- closest candidate)

**Adoption path for quebec (per page):** `shopUsageOrder.ts` takes any `MachineEntry[]`; for a differently-shaped local list, either (a) map the local item to a `{type,manufacturer,name}`-ish object the `CATEGORY_MATCH` predicates can read, or (b) add a small adapter that maps the local id/label to a machine category and sort by `machineUsageWeight`. Backend equivalent already exists: `scripts/lib/jm-shop-profile-reader.mjs`. R11/slot-domain: papa proved the pattern on the canonical consumer; per-page frontend reshaping is quebec's lane (different machine models, UI-break risk). See [[reference_post_ship_papa-jm-vault-u-jmvault02]].
