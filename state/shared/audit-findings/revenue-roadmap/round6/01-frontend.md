# Round-6 Agent 1 — Frontend / Customer-App Gap

**Verdict:** RESOLVED-WITH-WORK. There IS a canonical customer app — no debate.

- **Canonical app = `H:/prism/mcp-server/web/`** (`prism-dashboard`, React 19.0 + Vite 6.0.7 + react-router-dom 7.1.1). NOT a dev shell: 147 page components in `src/pages/`, lazy-loaded via `App.tsx` (383 lines of routes), Radix UI, TanStack Query/Table/Virtual, Monaco + CodeMirror, Recharts/Nivo, jsPDF/xlsx, react-hook-form+zod, zustand, framer-motion, Playwright E2E (`web/e2e/*.spec.ts`), Dockerfile + nginx.conf + `deploy.config.ts`, passed a ship gate (`SHIP_GATE_REPORT.md`, S4-MS1, 2026-04-12). Has auth (`src/contexts/AuthContext.tsx`, `LoginPage.tsx`, RBAC-gated route tree `secure(<Page/>, 'lead'|'admin')`), and a `LandingPage.tsx` (678 lines, pricing cards, CTAs → `/login`).
- **The 2 "awaiting merge" codex builds are tiny CAD demos — deprecate-after-harvest:** `cqask/ui` (Next.js 13.4 + AntD 5 + Tailwind, React 18) = ONE page (NL→CadQuery search box + `three-cad-viewer`); `mcp-cadquery/frontend` (Vite 6 + React 19 + @react-three/fiber 9 + three 0.175) = 8 files (CadQuery script editor + 3D render panel). Neither has SFC/Master-Post/billing. `mcp-server/web` already has a newer `ViewerPage.tsx` (525 ln, r3f 9.5 + three 0.183).
- **React 18 vs 19 (round-5 §R5.5 #4) is MOOT** — main app is already React 19; only `cqask/ui` is 18 (trivial bump). Do NOT introduce Next.js. Lock: React 19 + Vite 6 + react-router 7.

**Revenue-MVP page status:**
| Page | Status |
|---|---|
| SFC calculator | EXISTS (`SfcCalculatorPage.tsx` 370ln + `SpeedFeedPage.tsx` + `CalculatorPage.tsx` mega-calc) — backend 35% per §R3.5; page shell real |
| SFC compare-materials / machine-aware | MISSING (dedicated pages) |
| Master Post **upload** page (drag .nc → re-emit for controller X) | MISSING — current `PostProcessorGeneratorPage.tsx` (4,458ln!) + `PpgPage.tsx` are operation-builder-driven, NOT upload-and-re-emit |
| Cross-controller G-code transpiler | MISSING (§R5.1 B2) |
| CAD 3D viewer | EXISTS (`ViewerPage.tsx`) — STEP/STL upload + controller-overlay variant partial |
| NL→CadQuery in-app | MISSING from canonical app (only in unmerged `cqask/ui`) |
| Login | EXISTS (`LoginPage.tsx`, `ShellGatewayPage.tsx`, `LandingPage.tsx`) |
| Billing portal | **MISSING** — `grep billing|account|subscription|signup|register` in `pages/` = nothing |
| Account / seats / tier | PARTIAL — `CreditManagementPage.tsx`, `AdminPage.tsx` exist; customer-facing account page MISSING |
| Signup / trial start | MISSING |

**Proposed `MS-FRONTEND` (~14 units):** P0: U-FE-01 stack-decision doc (lock React19+Vite6+RR7; mark codex builds DEPRECATE-AFTER-HARVEST) · U-FE-02 harvest cqask NL→CadQuery → `pages/CadQueryNLPage.tsx` + archive cqask · U-FE-03 harvest mcp-cadquery script-editor → fold into ViewerPage + archive · U-FE-04 dep dedupe (r3f/three versions, tailwind config) · U-FE-05 SfcCompareMaterialsPage · U-FE-06 SfcMachineAwarePage (spindle-power gate, 21 ShopConfig machines) · U-FE-07 MasterPostUploadPage (drag-drop .nc/.mcam/.nci/.h/.tap → MIME sniff → POST /api/masterpost/generate) · U-FE-08 MasterPostResultPage · U-FE-09 CrossControllerTranspilerPage · U-FE-10 PricingPage → Stripe checkout · U-FE-11 BillingPortalPage → `prism_business:billing_create_portal` · U-FE-12 AccountPage (profile/seats/tier/API-keys) · U-FE-13 multi-controller Playwright matrix (≥3 of Fanuc/Haas/Mazak/Okuma/Mitsubishi per revenue page) · U-FE-14 deploy-ready vite bundle (under budget, nginx.conf+Dockerfile verified, smoke vs staging).

**Key paths:** `mcp-server/web/{package.json,src/App.tsx,src/pages/(147 pages),src/components/{sfc,ppg,shell,viewer,calculator},e2e,Dockerfile,nginx.conf,deploy.config.ts,SHIP_GATE_REPORT.md,LAUNCH_CHECKLIST.md}`; codex builds `cqask/ui/`, `mcp-cadquery/frontend/`; `BUILD_STATE.json → NEEDS_FRONTEND.trees[]`; skill `.claude/commands/frontend-merge-plan.md`.
