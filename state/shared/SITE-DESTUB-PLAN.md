# SITE DE-STUB + JM-DATA CAMPAIGN — fleet plan

**Operator directive (2026-05-31, to hotel):** "clean up the whole site. take out stubs and populate it with jm related data instead so we can truly start testing soon."

**Scoped by:** hotel (claude-d7f7d3ce) — this is a FLEET-WIDE, cross-domain campaign; each slot owns its domain's pages (per [[feedback_each_slot_merges_own_galaxy]] + CHAT-SLOT-DOMAINS).

---

## ⛔ BLOCKER #1 (gates "start testing soon") — API IS UP but running a STALE BUILD
CORRECTED 2026-05-31 (hotel verified live): the Express API on :3100 **IS up and serving** (`curl /api/v1/erp/quote/generate` → 401 = mounted+authed). The "MCP SERVER DISCONNECTED" banner is only the MCP *protocol* handshake (the `mcp__prism__*` tools), NOT the web app's HTTP API. **BUT** the running build is `dist/index.js` from **2026-05-31T18:51**, which PREDATES the new `/api/v1/business/dispatch` route (U-VNET-ROUTE) — so the just-shipped VendorCatalog + marketplace pages will 404 against the live server until a **rebuild + restart**.
- Fix: `cd mcp-server && npm run build` (16GB-heap, ~30s+ on an idle host — host is currently saturated) then restart the server process. **Owner: golf / infra** (a shared-backend restart affects the whole fleet — do not do it unilaterally mid-fleet-op).
- Until rebuilt: de-stub work is "wire the page to the live action against the verified contract"; live end-to-end verification waits for the rebuilt server.

## ⛔ BLOCKER #2 — engines need JM seed data
Real JM data exists (`mcp-server/src/data/jm-die-profile.ts` 9.7K; `JM DIE/` archive: customers ITW/Alcoa/Optimas/SFS/Holo-Krome, lathe/mill/Okuma/Hurco programs; `ShopConfigurationEngine` 21 machines). But the ERP/shop engines largely start EMPTY (in-memory) — so even with the backend up, `customer_list`/shop pages return `[]`. **Each domain must seed its engine(s) from the JM sources** so pages have content to render.

---

## STUB INVENTORY (demo/mock/seed data arrays in pages → replace with live action or JM seed)
| Page | Stub consts | Domain → slot | Status / replace with |
|---|---|---|---|
| `api/dashboard.ts` | DEMO_MACHINES, DEMO_JOBS, DEMO_TOOLS | dashboard fallback | ✅ DONE U-DESTUB-DASHBOARD-MACHINES — real JM fleet + cold-heading-die jobs |
| `ShopDashboardPage.tsx` | MOCK_MACHINES, MOCK_JOBS, MOCK_TOOLS, MOCK_OEE | shop-floor → golf/shop-floor | ✅ DONE U-DESTUB-DASHBOARD-MACHINES — JM fleet (mirrors api/dashboard.ts) |
| `data/machines.ts` | MACHINES (generic vendor catalog) | SFC shared | ✅ DONE U-DESTUB-DASHBOARD-MACHINES — JM 12 rotary machines, ids=JM machine_id (fixes SmartMachineSelector dedup) |
| `AILearningDashboardPage.tsx` | DEMO_MACHINES | AI training → india | ✅ DONE U-DESTUB-AILEARNING — JM fleet, all 5 controller families |
| `SPCDashboardPage.tsx` | SEED_XBAR/R_LIMITS, SEED_SAMPLES, SEED_CAPABILITY, SEED_NELSON_RULES, SEED_DMAIC_PROJECTS | quality → golf/quality | ✅ DONE U-DESTUB-SPC — JM Ø0.3750in header-die bore (inch, coherent linear rescale), JM DMAIC |
| `A3ReportPage.tsx` | SEED_REPORTS, TEMPLATES | quality/lean → golf | ⏳ REMAINING — content already shop-plausible (not competitor-branded); LOW ROI. JM-flavor pass: ref JM machines (VMC-01 Hurco / LTH-01 Okuma)+customers (HOLO-KROME/ITW)+cold-heading-die context+inch units. No test coupling. |
| `RootCausePage.tsx` | SEED_ANALYSES, SEED_FISHBONE_CAUSES, SEED_ACTIONS | quality → golf | ⏳ REMAINING — same as A3 (qualitative JM-flavor re-theme, inch units). No test coupling (verified). |
| `ViewerPage.tsx` | DEMO_SCENE_SUMMARY | CAD/viz → delta/sierra | ⏳ REMAINING — CAD/viz domain; re-theme scene summary to a JM die part. Verify no viewer-test coupling first. |

**NOT stubs (leave):** UI dropdown-option arrays (`MILL_OPERATIONS`, `STOCK_SOURCE_OPTIONS`, `CONTROLLERS`, `*_OPTIONS`, `TEMPLATES` config) — legitimate static config, not fake data. ~143 `const X = [` arrays across pages; the vast majority are these.

**ERP/HR/business pages (hotel domain): already call `../api/`** — no demo-data stubs found. Hotel's de-stub job is therefore (a) ensure the business engines are JM-seeded (BLOCKER #2 for ERP: seed CustomerEngine with JM customers, VendorCatalog already has charlie's corpus), (b) the VendorCatalogPage/marketplace bindings just shipped already use live data.

## EXECUTION SEQUENCE (logical order)
1. **golf/infra**: bring the backend up (BLOCKER #1) — nothing is testable without it.
2. **Each slot, its domain**: seed its engine(s) from JM sources (BLOCKER #2), then wire its stubbed pages to the live actions (table above). Per-file scrutiny per CLAUDE.md.
3. **hotel (me)**: seed business engines with JM customers/vendors (vendors already done via charlie's corpus); verify the ERP pages render JM data once backend is up.
4. **Fleet verification**: each slot confirms its pages render real JM data against the live `/api/v1` once backend is up.

## STATUS
- hotel ERP frontend reachability: DONE (U-VNET-ROUTE/PAGE/MKT — vendor catalog + marketplace live via secured allowlisted route).
- **Front-end demo/seed de-stub: 5 of 8 pages DONE** (2026-06-01, slot:hotel /goal /loop):
  - `U-DESTUB-DASHBOARD-MACHINES` — api/dashboard.ts + ShopDashboardPage.tsx + data/machines.ts → real JM fleet.
  - `U-DESTUB-AILEARNING` — AILearningDashboardPage machine list → JM fleet.
  - `U-DESTUB-SPC` — SPCDashboardPage → JM Ø0.3750in header-die SPC study (inch, coherent rescale) + JM DMAIC.
  - REMAINING (lower ROI, no test coupling, do fresh or owning slot): A3ReportPage, RootCausePage, ViewerPage.
- **Key learnings for the remaining pages / future de-stubbers:**
  - **R8 coupling**: a page's demo `job_number`/`machine` strings can be JOIN KEYS for other subsystems. `DashboardPage.test.tsx`'s snapshot job_numbers are joined by `utils/dashboardHotReleaseSeed.ts` to the hot-jobs program-release deep-link (machineId derived from the matched job's `machine` via `programReleaseFixtures.ts` catalog — a SEPARATE generic-vocab fixture: vf2-3x/Mazak Integrex/Sodick, NOT JM). Renaming snapshot jobs broke that test → reverted the test fixture (kept the source de-stub). Re-theming that program-release catalog to JM is a cross-domain unit touching many tests (MessagesPage/JobsPage/MachineRatesPage/CalculatorPage all assert `vf2-3x`).
  - **UNITS**: JM is an INCH shop — SPC/quality seeds must be inch (the prior 25mm-bore + um/mm targets were metric mismatches). Use exact linear rescale to keep statistical coherence (Cpk/Cp ratios are scale-invariant).
  - **id alignment**: use JM machine_id (LTH-01/VMC-01) as the page's machine `id` so frontend-local seeds dedup against the live backend roster (ShopConfigurationEngine keys by machine_id).
  - **No fabrication**: lathe specs from ShopConfigurationEngine (authoritative); mill specs from published manufacturer sheets; never invent.
  - **Commit**: slot-commit-enforce blocks shared-tree commits; use `[MAIN] [BOOTSTRAP-SLOT-ENFORCE]` prefix (fleet convention).
- Backend up + JM engine seeding: NOT started — BLOCKER #1/#2, owned by golf + each domain.
