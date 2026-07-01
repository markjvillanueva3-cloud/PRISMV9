---
session: claude-d7f7d3ce
topic: hotel-netplat-ui
slot: hotel
written_at: 2026-06-01T14:35:51.883Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-d7f7d3ce
status: active
---

# HANDOFF: claude-d7f7d3ce
Updated: 2026-06-01T14:35:51.883Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-d7f7d3ce

## STATE
## Active goal (/goal /loop /yolo)
Clean the ENTIRE app: replace placeholders/stubs with real JM Die data so testing can start.

## Shipped this arc (slot:hotel 2026-06-01)
- U-DESTUB-DASHBOARD-MACHINES: api/dashboard.ts + ShopDashboardPage.tsx + data/machines.ts -> real JM fleet + cold-heading-die jobs; machines.ts ids->JM machine_id fixes SmartMachineSelector dedup. 2-reviewer scrutiny PASS; tsc clean; DashboardPage.test 13/0.
- U-DESTUB-AILEARNING: AILearningDashboardPage DEMO_MACHINES -> JM fleet (5 controller families).
- U-DESTUB-SPC: SPCDashboardPage -> JM 0.3750in header-die SPC (exact linear rescale, OOC preserved) + inch DMAIC.
- (prior) U-VNET-ROUTE/PAGE/MKT: vendor catalog + marketplace live via secured /api/v1/business/dispatch.

## Learnings (R8/R12)
- Demo job_number/machine strings can be JOIN KEYS (dashboardHotReleaseSeed -> program-release deep-link via programReleaseFixtures vf2-3x/Mazak/Sodick catalog, a SEPARATE generic fixture used by Messages/Jobs/MachineRates/Calculator tests). Reverted DashboardPage.test fixture, kept source de-stub. Re-theming that catalog = cross-domain unit.
- JM = INCH shop: quality/SPC seeds must be inch. No fabrication: lathe specs from ShopConfigurationEngine, mill specs from published sheets.

## Open P2 (not blocking)
- Confirm backend searchMachines returns JM machine_id format (SmartMachineSelector dedup depends on it).

## RESUME
DE-STUB LOOP — 5/8 front-end demo/seed pages shipped (commits U-DESTUB-DASHBOARD-MACHINES, U-DESTUB-AILEARNING, U-DESTUB-SPC, U-DESTUB-PLAN-PROGRESS on cad-fusion-live-ms0). NEXT: 3 pages remain, ALL verified no test coupling: (1) A3ReportPage.tsx SEED_REPORTS+TEMPLATES, (2) RootCausePage.tsx SEED_ANALYSES/FISHBONE/ACTIONS, (3) ViewerPage.tsx DEMO_SCENE_SUMMARY. LOWER ROI (content already shop-plausible). JM-flavor re-theme: JM machines (VMC-01 Hurco VM30i / LTH-01 Okuma GENOS L300-M / VMC-02 Okuma M460V-5AX), customers (HOLO-KROME/ITW/SEMBLEX), cold-heading-die context, INCH units. Commit with [MAIN] [BOOTSTRAP-SLOT-ENFORCE] prefix. Then BLOCKER #1 backend rebuild+restart (golf/infra) for live E2E. Full per-page notes: state/shared/SITE-DESTUB-PLAN.md.

## CONTEXT

