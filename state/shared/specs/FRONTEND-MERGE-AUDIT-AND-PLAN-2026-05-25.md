# Frontend Merge Audit & Plan — 2026-05-25 (slot:romeo iter35)

Two Codex-built frontends are PENDING_MERGE per BUILD_STATE. This is the per-app audit + the logical merge order so we don't break the canonical `mcp-server/web` while pulling in CAD capability we don't yet have.

This document also incorporates **juliett's 2026-05-21 deep research** on Claude Code app-design capability (`knowledge/wiki/architecture/specs/claude-cli-app-design-capabilities-2026-05-21.md`) — operator asked for that research; it already exists, not re-doing.

---

## 1. Stack compatibility matrix

| Surface | Canonical (`mcp-server/web`) | `mcp-cadquery/frontend` | `cqask/ui` |
|---|---|---|---|
| Bundler | Vite 6.0.7 | **Vite 6.2** ✅ | Next 13.4.19 ⚠ |
| React | 19.0.0 | **19.0.0** ✅ | 18.2.0 ⚠ |
| Routing | React Router (canonical pattern) | App.tsx single-page | Next App Router ⚠ |
| Styling | Tailwind 3.4 + custom `prism-*` classes | CSS modules | Tailwind 3.3 + **AntDesign 5.9** ⚠ |
| 3D | Three.js 0.183 + @react-three/fiber 9.5 | **Three.js 0.175 + @react-three/fiber 9.1.1** ✅ | none |
| Source files | 149 pages, 92 api, 199 components | 8 .tsx (App + 6 components) | 6 source files (3 tsx, 3 ts) |
| Test infra | Vitest 4 + Playwright e2e dir | none visible | none visible |

**Compatibility verdict:**
- **mcp-cadquery → DROP-IN.** Same React 19, same Vite 6, same Three.js + r3f major. Three.js minor bump (0.175 → 0.183) is the only thing to watch. **~half-day port.**
- **cqask → REWRITE.** Next 13 App Router → Vite React Router is structural; AntDesign 5 → Radix UI + Tailwind is per-component. The functional payload (CAD-via-LLM through `app/api/cad.ts` + `app/components/cad-viewer.tsx`) is what we want, not the chrome. **~2-3 day port, per-component.**

---

## 2. Functional payload — what each app actually does

### `mcp-cadquery/frontend`
- **Single-page CadQuery script editor + renderer + log viewer**
- `App.tsx` orchestrates: script input → POST `/mcp/execute` → SSE `/mcp/events` → render TJS JSON in Three.js
- Components: `StatusBar`, `ScriptInput`, `ParamsInput`, `Controls`, `RenderOutput`, `LogDisplay`
- Auto-render debounce on script change
- **What it gives us:** the missing **CadQuery-in-browser** capability + the live-render Three.js viewer pattern + the SSE log-streaming pattern

### `cqask/ui` (orion-cad)
- **Natural-language CAD generator** — user types "a 50mm cube with a 20mm hole through it" → backend generates CadQuery → render
- `app/page.tsx`: main UI · `app/components/cad-viewer.tsx`: Three.js viewer · `app/api/cad.ts`: LLM → CadQuery bridge · `app/utils.ts`
- **What it gives us:** the **LLM-to-CAD** generation flow — operator types in plain English, gets a 3D model

**Both apps share the CAD-viewer pattern. cqask adds the NL-to-CAD layer on top.** Merging mcp-cadquery first is the logical order — it gives us the rendering substrate that cqask depends on.

---

## 3. PSN-node gap — what new backend nodes these merges should leverage

Newer backend additions (this session + recent days) that these merged frontends should call:

| Backend node | What it does | Where it lands in the merged frontend |
|---|---|---|
| `mcp-server/src/engines/PrismCadQueryBridgeEngine` (if it exists) or new `prism_cad:cadquery_*` | Server-side CadQuery execution + caching | mcp-cadquery's `/mcp/execute` rewires to this dispatcher |
| `prism_session:master_index_query` | Unified search | Search box at top of merged CAD page |
| `/api/snapshot` (new this session) | Live BUILD_STATE | Status bar telemetry |
| `/api/graph-snapshot` (new this session) | Layer-stratified graph viz | "Show me where this part fits in the system" navigation |
| 3 generic-bridge engines (iter24-26) | Cross-domain enrichment | Per-result chip: "this CAD output has a CAM strategy / tribal tip / cost estimate" |
| `prism_intelligence:ai_feature_discover` | Capability recommendation | Right-rail: "PRISM AI can also do X on this part" |
| `prism_omega:omega_score` | Quality gate | Gate: don't show "ready" until Ω ≥ 0.70 (sim tier) |

---

## 4. Recommended merge order (logically + optimally)

**Phase A — Materialize FMERGE envelope** *(blocker per BUILD_STATE)*
- Open `state/shared/specs/UNITS/U-FMERGE-MS0-*.md` envelope; current status is `building` (per master-index hit: "L6/building — Frontend Audit & Decision - Merge Two Web Apps")
- This audit doc IS the deliverable for that envelope's "Audit & Decision" step → flip to `ready_for_merge`

**Phase B — mcp-cadquery → canonical web** *(drop-in)*
1. Copy 6 components into `mcp-server/web/src/components/cadquery/` (StatusBar/ScriptInput/ParamsInput/Controls/RenderOutput/LogDisplay)
2. Create new page `mcp-server/web/src/pages/CadQueryPage.tsx` that mounts the App.tsx flow under canonical chrome (Calculator Studio styling per `web/CLAUDE.md`)
3. New api client `mcp-server/web/src/api/cadquery.ts` calling `/api/v1/cad/cadquery/*`
4. Backend: wire CadQuery execution behind `prism_cad:cadquery_*` actions (uses existing `cad-execute-script` if present, else new)
5. Three.js minor bump (0.175 → 0.183) — most r3f patterns are stable; smoke-test via Playwright

**Phase C — cqask → canonical web** *(rewrite per component)*
1. Port `app/components/cad-viewer.tsx` → reuse the just-merged `RenderOutput` from Phase B (eliminates duplication immediately)
2. Port `app/api/cad.ts` (NL → CadQuery bridge) → `mcp-server/web/src/api/cadFromText.ts`
3. Replace AntDesign components with Radix + Tailwind per page
4. Convert App Router → React Router routes
5. Deprecate `cqask/` tree (per APPW-MS8/U-FMERGE-DEPRECATE unit)

**Phase D — Cross-cutting upgrades** *(applies once merged)*
- Surface PSN-node gaps from §3 above as inline page chips
- Wire the auto-screenshot Playwright loop per juliett's wiki §4 G3 (highest open visual-quality lever)

**Phase E — iOS + Android (mobile across the board)** *(operator directive 2026-05-25)*
The phone app named in FRONTEND-AUDIT-AND-UPGRADE-PLAN §sub-goal 2 ships as a **Capacitor 6 wrapper** around the merged React+Vite frontend — NOT a separate React Native rewrite. This is the only path that preserves the 149-page canonical tree + 92 api clients + the entire Codex design language as a single source of truth. React Native would require parallel maintenance of every page; with 149 of them already shipped, that math doesn't pencil.

Mobile-specific work (additive, none of it touches the desktop bundle):
1. **Capacitor scaffold** — `npx @capacitor/cli init prism-shop com.prism.shop` at the `mcp-server/web/` root. Generates `ios/` + `android/` native shells; webview points at the existing Vite build output. ~half-day to first-boot on both simulators.
2. **Responsive sweep** — every page tested at 5 viewport sizes: 375×667 (iPhone SE), 390×844 (iPhone 14), 412×915 (Pixel 7), 768×1024 (iPad), 1024×1366 (iPad Pro). Add Playwright `devices['iPhone 14']` + `devices['Pixel 7']` projects to the existing e2e dir. Mobile-broken pages flagged into per-page refactor backlog (likely heavy tables → card lists at <600px width per the page-density inventory in §7).
3. **Touch-target audit** — minimum 44pt (iOS HIG) / 48dp (Material 3) for any interactive element. Existing Calculator Studio button sizing is 36-40px height — will need a per-component density bump on mobile via Tailwind `md:h-9 h-11` pattern. Hook: extend the design-language Playwright loop to fail any tap-target <44px on mobile viewports.
4. **Safe-area insets** — every full-bleed page wraps in `pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]` via a single shared `MobileSafeArea` component in `web/src/components/`. iOS notch + Dynamic Island + Android gesture nav all handled in one place.
5. **System dark mode** — Capacitor `StatusBar` plugin tracks system preference; CSS `prefers-color-scheme: dark` is already the default but light-mode override needs an explicit `[data-theme='light']` block in `index.css` for the small percentage of mobile users who run light mode. Per `feedback_frontend_codex`, dark stays the canonical PRISM theme — light mode is graceful-degrade only.
6. **Native gestures** — back-swipe on iOS, system back button on Android wired to React Router's `navigate(-1)`. Pull-to-refresh on data pages (Calculator results, ShopFloorLive, CustomerPortal) via Capacitor's `@capacitor/pull-to-refresh`. Long-press → context menu on tool cards, machine tiles (mirrors the desktop right-click menus).
7. **Offline cache** — service worker (already in Vite PWA preset) gives offline read of cached api responses. Critical for shop-floor wifi dead zones. Write actions queue via existing offline-update unit (`APPW-MS8/U-OFFLINE-OPTIMISTIC-UI`) — Capacitor's `@capacitor/network` plugin signals when to drain the queue.
8. **Native chrome only where it matters** — top app bar uses the Capacitor `StatusBar` (matches system tint), bottom uses `Keyboard` plugin to push the active input above the soft keyboard. Everything else stays as web components — no react-native-paper or NativeBase. Pure-web means a fix in one place fixes desktop + iOS + Android simultaneously.
9. **Store-distribution prep** — iOS: App Store Connect provisioning + Apple Developer Program ($99/yr, operator action) + privacy nutrition label JSON. Android: Google Play Console + signing key + data-safety form. Per `feedback_no_public_h_drive`, both stores must be **internal-distribution only** (TestFlight + Internal App Sharing) until operator approves public release. Bundle id `com.prism.shop`; ship as JM Die internal pilot first.

**Phase E does NOT require a separate UI codebase.** The deliverable is `ios/` + `android/` directories + 1 shared `MobileSafeArea` component + responsive fixes per page. Estimated effort: ~3-5 days to ship-able internal-distribution builds, gated by Phase B + C completion (mobile wraps the merged frontend, not the unmerged one).

---

## 5. Tooling already installed for design work — DON'T re-download

Per juliett 2026-05-21 deep-research wiki (`claude-cli-app-design-capabilities-2026-05-21.md`), **every relevant tool is already installed**:

| Tool | Status | Purpose |
|---|---|---|
| `/frontend-design` skill | INSTALLED | Forces aesthetic direction before coding; bans AI-slop defaults (Inter, purple-on-white) |
| `/verify`, `/run` skills | INSTALLED | Launch app + screenshot loop |
| `/skill-creator`, `/playground` | INSTALLED | Author new design skills |
| `figma:*` family | INSTALLED, **needs OAuth** | Design-to-code + code-to-Figma (G4 in juliett's gap table — operator action) |
| `chrome-devtools-mcp:*` | INSTALLED | Live DOM, a11y, perf, LCP, memory-leak |
| Playwright MCP | INSTALLED, in active use (the audit harness) | Screenshot + accessibility tree + multi-viewport sweep |

**No new MCP server / plugin / repo install is the right answer today.** The gaps are inputs (DESIGN.md, aesthetic blocks) and OAuth (Figma), not capability.

---

## 6. Codex CLI integration pattern

The user named "work together with Codex CLI on this since it built a majority of the front end design." The integration pattern that already exists in PRISM (per CLAUDE.md §SCRUTINY GATE):

- **`codex exec review`** runs as advisory arm in the 3-of-3 scrutiny gate — Claude does the implementation, Codex CLI reviews the diff in parallel
- For frontend MERGE work specifically: after each Phase B or C component port, run `codex exec review <file>` against the new component → Codex compares to its own original (it has full memory of the build it did) → catches semantic drift the type system won't
- For frontend DESIGN work: Codex built the Calculator Studio design language; it's the authoritative reviewer for any new page claiming to follow that language. Pattern: edit page → `codex exec review --focus design-language-conformance <page>` → human verifies the verdict.

**This is operator-initiated, not autonomous** — the codex-arm key + auth is per-operator, and the review output is advisory not blocking.

---

## 7. Pages that need text-density cleanup

Operator named "clean up pages that have unnecessary amount of text". The candidate is obvious from the page-size inventory:

| Page | Size | Cleanup approach |
|---|---:|---|
| `CalculatorPage.tsx` | **659.9 KB** | Refactor — split into per-section components: `CalculatorPageMillTab.tsx`, `CalculatorPageLatheTab.tsx`, `CalculatorPageWEDMTab.tsx`, etc. Inline data tables → JSON files in `web/src/data/`. ~5-10 separate commits. |
| `CustomerPortalPage.tsx` | 64.7 KB | Investigate — likely similar |
| `DashboardPage.tsx` | 50.6 KB | Investigate — likely tabbed sections |
| `CaptureOpsPage.tsx` | 43.0 KB | Investigate |
| `CustomersPage.tsx` | 39.8 KB | Investigate |
| `A3ReportPage.tsx` | 38.3 KB | Investigate |
| `BusinessSuitePage.tsx` | 32.9 KB | Investigate |
| `AlarmPage.tsx` | 31.3 KB | Investigate |

**Not autonomous work** — each split touches Codex-built pages and the design language must be preserved (`feedback_frontend_codex`). Each refactor needs operator approval per page, ideally with a Codex CLI review arm on each diff per §6.

---

## 8. What this turn commits

1. **This audit doc** — the deliverable for the FMERGE-MS0 "Audit & Decision" step (now includes Phase E mobile per operator 2026-05-25)
2. **G2 fix** — `mcp-server/web/CLAUDE.md` aesthetic-direction block per juliett's wiki §4 (Anthropic's 3 strategies: typography/color/motion individually + reference inspirations + name defaults to avoid) PLUS a Mobile (iOS + Android) sub-block per operator directive 2026-05-25. Highest-leverage single edit; kills AI slop fleet-wide AND establishes mobile design discipline before the first mobile page is touched.

Everything else (Phases B/C/D/E, page-density refactors, Figma OAuth, Codex review wiring, App Store / Play Store provisioning) is explicitly operator-gated.

---

## 9. Standing operator guardrails (verbatim — these block autonomous frontend work)

- `feedback_frontend_codex`: *"Never build over Codex frontend pages. Analyze and improve existing pages, maintain Calculator Studio design language."*
- `feedback_ppg_frontend`: *"All PPG page frontend work must follow the Codex-built calculator/PPG design theme — dark, WorkspacePrimitives, rounded-…"*
- `feedback_backend_before_frontend`: *"User explicitly wants backend EDM physics and optimization perfected before any frontend work"* — with 593 NEEDS_WIRING engines, the backend-before-frontend memo says wire those first

The merge work (Phases A/B/C) does NOT violate these because it preserves Codex pages + pulls them INTO the canonical tree under the existing design language.
