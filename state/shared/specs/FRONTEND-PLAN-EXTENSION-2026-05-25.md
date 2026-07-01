# Frontend Plan EXTENSION — 2026-05-25 (slot:quebec /loop)

> **Why this exists.** Operator issued a new `/goal` on 2026-05-25 asking for deep UI/UX research + Codex frontend assessment + better-than-Playwright research + a plan. Two prior specs already cover most of the surface (`FRONTEND-MERGE-AUDIT-AND-PLAN-2026-05-25.md` shipped this morning by slot:romeo iter35; `claude-cli-app-design-capabilities-2026-05-21.md` shipped 4 days ago by slot:juliett). This document **extends them with the gaps** the operator's new ask uncovers — it does NOT duplicate them.
>
> Read order: those two docs first, then this one as a delta. Per R8 (read before you write) + R7 (surface conflicts, don't average them).

---

## 1. Delta vs the morning plan

The morning audit was correct in shape (Phase A/B/C/D/E, mobile-via-Capacitor, no new MCP installs needed). This delta closes four open gaps in it:

| # | Gap in morning plan | This delta adds |
|---|---|---|
| Δ1 | §7 page-density table missed several mega-pages | Full re-inventory across all 119 pages; 12 violators ≥30 KB, 9 ≥50 KB (3× the morning count) |
| Δ2 | "Better than Playwright?" — operator-asked, never answered | Empirical comparison of 9 candidates; verdict + concrete augmentation list |
| Δ3 | Mobile §Phase-E generic — said "iOS HIG / Material 3" without naming 2026 specifics | Liquid Glass (iOS 26+) traps, M3 Expressive role mapping for industrial dark, Capacitor 6 Android-15 keyboard bug |
| Δ4 | No atomic-roadmap unit list | §6 below — 14 concrete units in milestone-envelope format ready for `atomic-roadmap.json` |

---

## 2. Updated page-density inventory (119 pages, concrete sizes 2026-05-25)

> **Count delta vs iter34 (149 pages):** iter34 enumerated route entries + subdirectory pages including `recovery/`; this count is only top-level `*.tsx` files in `mcp-server/web/src/pages/`. Neither count is wrong — they measure different things. The mega-page violations below are the same regardless of method.

The morning §7 named 8 mega-pages. Full re-`ls` finds **15 pages ≥30 KB**, **9 ≥50 KB**, **4 ≥100 KB**. Sorted:

| Page | Size | Status |
|---|---:|---|
| **CalculatorPage.tsx** | 659.9 KB | known — §7 of morning plan |
| **PostProcessorGeneratorPage.tsx** | 184.9 KB | **NEW — missed in morning plan** |
| **QuoteBuilderPage.tsx** | 117.4 KB | **NEW** |
| **JobsPage.tsx** | 92.7 KB | **NEW** |
| **ProgramReleasePage.tsx** | 78.4 KB | **NEW** |
| **ShopFloorClockPage.tsx** | 70.7 KB | **NEW** |
| **CustomerPortalPage.tsx** | 64.7 KB | known |
| **WireEdmWizardPage.tsx** | 64.8 KB | **NEW** |
| **PostProcessorPage.tsx** | 60.7 KB | **NEW** |
| **InventoryPage.tsx** | 56.6 KB | **NEW** |
| **DashboardPage.tsx** | 50.6 KB | known |
| **ShopProfilePage.tsx** | 50.4 KB | **NEW** |
| **LatheResultsPage.tsx** | 47.0 KB | **NEW** |
| **MessagesPage.tsx** | 46.5 KB | **NEW** |
| **CaptureOpsPage.tsx** | 43.0 KB | known |
| **QuoteFollowUpPage.tsx** | 42.3 KB | **NEW** |
| **ToolpathAdvisorPage.tsx** | 39.9 KB | NEW |
| **CustomersPage.tsx** | 39.8 KB | known |
| **SchedulingPage.tsx** | 38.6 KB | NEW |
| **A3ReportPage.tsx** | 38.3 KB | known |
| **PurchaseOrdersPage.tsx** | 38.1 KB | NEW |
| **EmployeeDirectoryPage.tsx** | 37.5 KB | NEW |
| **MachineRatesPage.tsx** | 37.5 KB | NEW |
| **TimecardPage.tsx** | 37.4 KB | NEW |
| **SpeedFeedPage.tsx** | 37.3 KB | NEW |
| **GeneralLedgerPage.tsx** | 36.7 KB | NEW |
| **DepartmentDashboardPage.tsx** | 35.6 KB | NEW |
| **QualityManagementPage.tsx** | 34.8 KB | NEW |

**12 new violators beyond the morning plan.** The morning's "operator-gated, per-page" recommendation still holds (§Phase F is operator-approval per page) but the queue is 3× the size.

**Correction (round-2 scrutiny):** an earlier draft of this section claimed Vite ships everything in one chunk and asserted a 2-4-second FCP win from route-level code-splitting. That was **wrong**. Verified: `mcp-server/web/src/App.tsx` ALREADY wraps all 9 mega-pages (CalculatorPage line 48, ProgramReleasePage 49, PostProcessorGeneratorPage 54, PostProcessorPage 55, ShopFloorClockPage 68, CustomerPortalPage 83, QuoteBuilderPage 88, JobsPage 100, WireEdmWizardPage 139) in `lazyNamed()` with `lazyElement` route wrappers, AND `mcp-server/web/vite.config.ts` already defines `manualChunks()` for vendor split. **Code-splitting is shipped.** The remaining win on these mega-pages is *intra-page* — per-section dynamic imports inside CalculatorPage itself (tab-level code-splitting), which is true work but a different, smaller-ROI unit than the spec originally claimed.

---

## 3. Better-than-Playwright research synthesis

Operator asked: *"look into more efficient web-surface reading if there is one better than playwright relative to ui building and design with an llm."*

**Verdict: stay on Playwright MCP, but augment.** No tool is materially better for THIS use case (LLM iterating on React/Tailwind localhost pages). The 2026 design-loop literature canonizes the Playwright pattern. Three concrete wins are available today:

| Action | Cost | Token win | Already installed? |
|---|---|---|---|
| **Add `chrome-devtools-mcp` to active design-loop** (Lighthouse, LCP/CLS, live-DevTools handoff Playwright can't do) | zero — already installed | adds capability rather than reduces tokens | ✅ INSTALLED (per system reminder) |
| **Switch to `@playwright/mcp --cli` mode** when agent has fs access — writes snapshots to disk instead of streaming back into context | one-time config | **4× token reduction** (114k→27k per session per Morph benchmark) | uses `--cli` *flag* on the already-installed `@playwright/mcp` — NOT a separate `@playwright/cli` package (which exists but is an unrelated abandoned project from a different author) |
| **Install `shadcn-react` MCP** (Jpisnice) IF the codebase moves toward shadcn primitives — eliminates the "Claude invents non-existent shadcn props" failure class | one-time install | reduces screenshot iterations needed | ✗ not installed; PRISM uses Radix UI directly (shadcn-style), so impact is moderate |

**Other candidates evaluated and rejected for this use case:** Stagehand (great for production scrapers, not first-pass design iteration), Browser-use (overkill — LLM-decides-every-click is slow + expensive for "look at my page"), Skyvern (vision-first, redundant when you control the React source), Steel/Browserbase (cloud round-trip latency, no benefit for `localhost:5173`).

**Different axis worth surfacing:** a Radix-aware component-registry MCP would solve the "Claude invents non-existent Radix props" class entirely so screenshot iterations are needed less often. None exists today as far as the research found — could be PRISM-built if the design loop becomes a bottleneck.

**Sources cited inline below §6.**

---

## 4. Mobile design — 2026 specifics

The morning Phase E mentioned "iOS HIG / Material 3" generically. The 2026 specifics that change concrete implementation:

### 4.1 Liquid Glass shipped iOS 26, NOT iOS 18

A common drift. iOS 26 (mid-2025) introduced Liquid Glass; iOS 26.2 (early 2026) reacted to legibility complaints by making dark mode darker when "Reduce Transparency" + "Increase Contrast" are on.

**Load-bearing rules for industrial HUD:**
- **Do NOT adopt translucent tab bars/toolbars on dense data screens.** Glass on top of dense numerics destroys plane separation. Keep solid `surface` tokens behind chrome; respect `UIAccessibilityReduceTransparencyEnabled` and fall through to opaque.
- **Honor `UIAccessibilityDarkerSystemColorsEnabled`** — composes with Liquid Glass to produce a new "Ultra Dark" tier. In React this is a **third theme variant** beyond `light`/`dark`: `dark-high-contrast`.
- **App icon variants are now table-stakes** — ship `light`, `dark`, AND `tinted` assets.
- **Lock Screen Live Activity for "active job + spindle load"** is the most valuable underutilized iOS surface for a manufacturing app in 2026.

### 4.2 Material 3 Expressive (late 2025) for industrial dark

- **Do NOT use Material You dynamic color** (the default Capacitor + Android scaffolds wire in). That pulls accent from wallpaper. Use **Material Theme Builder with a fixed seed** = PRISM accent, `contrast: high`, export only `dark` scheme.
- **Role mapping for the Calculator Studio palette:**
  - Primary = action buttons (CTA)
  - **Secondary-Dim = passive numerics** in dense areas
  - **Secondary-Container = card grouping**
  - **Tertiary = threshold-crossing alerts ONLY** (chatter alarm, tool-life critical)
- **Use `surface-container-*` tonal elevation, not shadows.** 5 elevation tiers via tone, scales correctly on AMOLED without shadow bloom.
- **Motion tokens — spatial vs effects, three speeds each.** Chart re-render = `spatial.fast`, value-change pulse = `effects.fast`. Don't use default M3 spring durations (too playful for industrial).

### 4.3 Capacitor 6 + React parity gotchas (top 5)

1. **Android 15+ edge-to-edge keyboard overlap** — confirmed open bug `capacitor#8166`. Install `@capawesome/capacitor-android-edge-to-edge-support`, gate by OS version, set `android.captureInput: true` + `Keyboard.resizeOnFullScreen: false`. Without this, every bottom-anchored form is invisible on every Pixel.
2. **Safe-area insets return 0 on Android with stock Capacitor 6.** Required: `capacitor-plugin-safe-area`, write insets to CSS vars on mount.
3. **`ios.contentInset: 'always'` paints status-bar zone white in dark mode** — remove it. Use proper safe-area CSS + `@capacitor/status-bar` `setStyle({ style: 'DARK' })`.
4. **Touch-target minimums differ** — iOS HIG 44×44pt, Material 48×48dp. Tailwind: `min-h-[44px]` baseline, bump to `min-h-12` (48px) on `[data-platform="android"]`.
5. **Modal presentation differs by OS** — iOS expects sheet-style with grab handle + dismiss-by-drag; Android expects full-screen with system back button. A single `<Dialog>` rendering identically on both is wrong.

### 4.4 Accessibility — the rules that actually bite (additive to web/CLAUDE.md WCAG 2.2 AA block)

- **Never `#000`.** Use `#0f1115`–`#1a1a1a` for canvas. Pure black + white = 21:1 but halation/bloom for dyslexia/astigmatism users. Target body text 13–17:1, **not** 21:1.
- **Re-verify every accent on the dark surface.** A `#2563eb` button that's 5.9:1 on white drops to **2.7:1** on `#0f172a` — below the 3:1 floor.
- **APCA Lc≥75** for body text as a design-review gate above WCAG (perceptual sanity-check; WCAG passes don't always read right).
- **iOS 16px input-zoom trick** is still required in 2026 — set `text-base` (16px) on every form input. Do NOT use `maximum-scale=1` to suppress it (a11y violation).
- **WCAG 2.2 SC 2.4.11 (focus not obscured)** — your sticky bottom action bar must NOT hide focused inputs. Real risk in Capacitor where keyboard-shown events fight bottom-pinned UI.

### 4.5 Production references that match the aesthetic (NEW)

Beyond Stripe/Linear/GitHub/Wise (already named):

- **[Linear mobile](https://linear.app)** — custom shaders, variable scroll-boundary blur, signed-distance-field icons. The benchmark.
- **[Raycast iOS](https://raycast.com/ios)** — dark-first, monospace numerics, single-accent restraint.
- **[Warp](https://warp.dev)** — terminal-rooted, the definitive Bloomberg-feel.
- **[Tremor](https://tremor.so)** (React LIBRARY, not an app) — closest production-grade React/Tailwind primitives for dense numeric cards + charts, already dark-mode tuned. **Worth evaluating as a component baseline for new PRISM pages.**

### 4.6 Anti-patterns specific to this stack (additive to web/CLAUDE.md bans)

- **Liquid-Glass-everywhere.** AI defaults to it because Apple's gallery shows it. On dense numerics it destroys plane separation.
- **Material You dynamic color.** AI scaffolds wire `dynamicColor: true` by default; Android 12+ overrides accent with wallpaper hue.
- **`100vh` for full-screen.** Broken on iOS Safari + Android edge-to-edge. Use `100dvh` + safe-area padding.
- **Single 8pt grid copied from web.** iOS HIG = 4pt baseline, Material = 4dp/8dp dual grid. 8px-only spacing breaks list-item rhythm on iOS.
- **Shadow-based elevation in dark mode.** Shadows on `#0f1115` look like dirt smudges. Use M3 tonal elevation (lighter surface tier) and 1px hairline borders instead.

---

## 5. Tooling already installed — re-verified

Per system reminder this session, every relevant tool is installed:

| Tool | Confirmed |
|---|---|
| `frontend-design` skill | ✅ |
| `verify` + `run` skills | ✅ |
| `skill-creator` + `playground` | ✅ |
| `figma:*` family | ✅ (still needs OAuth — operator action) |
| `chrome-devtools-mcp:*` family | ✅ |
| `playwright:*` MCP | ✅ |
| `supabase`, `linear`, `greptile` MCPs | ✅ (incidental) |

**No new install required for the core design loop.** The optional adds (§3) are `@playwright/cli` (4× token cut) and a Radix-aware component-registry MCP (not yet existing).

---

## 6. Atomic units — proposed for `atomic-roadmap.json`

**Preamble (per scrutiny rounds 1+2 findings — operator must validate before insertion):**
1. **Insertion target is the milestone-envelope file**, NOT `roadmap-index.json` directly. Verified round-2: `roadmap-index.json` schema does NOT carry `evidence_required`, `deliverable`, `estimate_h`, `operator_gate`, `depends_on` fields — those live in per-milestone envelopes under `state/shared/specs/UNITS/U-*.md` (per the FMERGE-MS0 close-out memory). Create envelope file `state/shared/specs/UNITS/UI-UX-IMPROVEMENT-MS0.md` (or equivalent path) and embed the JSONC there. Per recent commit subjects (e.g. `[QUOTING-PIPELINE-MS0]/U-QT10`) the canonical commit prefix is `[MILESTONE]/U-<shortId>`. Unit-IDs below are short-form (`U-A1-…`).
2. **External-dep verification (per scrutiny round 1 P1-3 / P1-4 / P1-5)** — three claimed surfaces do NOT exist today: (a) `@playwright/cli` is NOT a real package; the 4× token win uses `@playwright/mcp --cli` *flag* on the existing MCP install. (b) `mcp-server/web/playwright.config.ts` has only `chromium / Desktop Chrome` active — iPhone 14 / Pixel 7 / iPad projects must be added FIRST (unit `U-A0-PLAYWRIGHT-MOBILE-PROJECTS` below). (c) `/ui-audit` skill does not exist; `U-A2` ships it, every later unit that references it MUST `depends_on: ["U-A2-CHROME-DEVTOOLS-INTEGRATION"]`.
3. **Operator-gated** — all sequencing, the starting page in §7, and the per-Codex-page touches in `U-B1` are operator-confirm. See §7 for the open decisions.

The morning plan defined Phase A/B/C/D/E. This delta materializes 16 concrete units against it, sorted by ROI:

```jsonc
// Proposed insert to atomic-roadmap.json under milestone UI-UX-IMPROVEMENT-MS0
// Schema validation REQUIRED before insertion — see Preamble §6.1
[
  {
    "id": "U-A0-PLAYWRIGHT-MOBILE-PROJECTS",
    "milestone": "UI-UX-IMPROVEMENT-MS0",
    "domain": "frontend",
    "priority": 0,
    "title": "Add iPhone14 + Pixel7 + iPad Playwright projects (prereq for B2/B3/D1)",
    "estimate_h": 1,
    "deliverable": "mcp-server/web/playwright.config.ts extends projects[] with devices['iPhone 14'], devices['Pixel 7'], devices['iPhone SE'], devices['iPad Pro 11']; no test code change required at this step",
    "evidence_required": "`npx playwright test --list` enumerates each new project; existing tests still green"
  },
  {
    "id": "U-CAPACITOR-SCAFFOLD-INIT",
    "milestone": "UI-UX-IMPROVEMENT-MS0",
    "domain": "frontend",
    "priority": 0,
    "title": "Initialize Capacitor 6 scaffold (prereq for B2/B4/B5)",
    "estimate_h": 3,
    "deliverable": "npx @capacitor/cli init prism-shop com.prism.shop at mcp-server/web/; commits ios/ + android/ directories; capacitor.config.ts; smoke-test first-boot in iOS simulator + Android emulator",
    "evidence_required": "screenshots of empty Capacitor shell loading vite dev server on both simulators",
    "operator_gate": "FRONTEND-MERGE-AUDIT-AND-PLAN-2026-05-25 Phase E item 1 — operator decides mobile-pilot timing"
  },
  {
    "id": "U-A1-PLAYWRIGHT-CLI-MODE",
    "milestone": "UI-UX-IMPROVEMENT-MS0",
    "domain": "frontend",
    "priority": 0,
    "title": "Switch design-loop to `@playwright/mcp --cli` mode (4× token win)",
    "estimate_h": 1,
    "deliverable": "Configure existing @playwright/mcp install with --cli flag in .mcp.json / settings.json so snapshots write to disk instead of streaming into context. NO new npm package — `@playwright/cli` (the wrong-author package) is NOT what we want. Add scripts/playwright-snapshot-helper.mjs to emit path digest.",
    "evidence_required": "before/after token count on a 5-iteration design loop on CalculatorPage; cite Morph baseline (114k→27k)"
  },
  {
    "id": "U-A2-CHROME-DEVTOOLS-INTEGRATION",
    "milestone": "UI-UX-IMPROVEMENT-MS0",
    "domain": "frontend",
    "priority": 0,
    "title": "Wire chrome-devtools-mcp into design-loop sibling to Playwright",
    "estimate_h": 1,
    "deliverable": "/ui-audit skill at .claude/commands/ui-audit.md that chains: playwright screenshot (via U-A1 cli mode) → chrome-devtools lighthouse_audit → chrome-devtools performance_start_trace (LCP/CLS/INP) → markdown report. Note: chrome-devtools-mcp is streaming-MCP (no --cli equivalent), so its token profile is similar to MCP-mode Playwright; pair with U-A1 not as a replacement.",
    "evidence_required": "single /ui-audit invocation produces all three artifacts for one page"
  },
  {
    "id": "U-B1-LAZY-SPLIT-AUDIT",
    "milestone": "UI-UX-IMPROVEMENT-MS0",
    "domain": "frontend",
    "priority": 2,
    "title": "Audit existing App.tsx lazy splits + flag unwrapped pages + propose tab-level intra-page splits for the ≥100KB monoliths",
    "estimate_h": 2,
    "deliverable": "scripts/audit-route-lazy-coverage.mjs — read App.tsx, list every <Route element=...> wrapper, classify into lazy-wrapped vs eager, emit report. Then identify pages where intra-page tab-level dynamic-import would give a real win (CalculatorPage 660KB has Mill/Lathe/WEDM tabs; PostProcessorGeneratorPage 185KB has per-controller sections; QuoteBuilderPage 117KB has wizard-step partitions). NOT a code-split implementation unit — that's per-page operator-gated follow-on work.",
    "evidence_required": "audit report exists at state/shared/dashboards/route-lazy-coverage.json; operator reviews + decides which (if any) intra-page splits to schedule"
  },
  {
    "id": "U-B2-MOBILE-SAFE-AREA-COMPONENT",
    "milestone": "UI-UX-IMPROVEMENT-MS0",
    "domain": "frontend",
    "priority": 1,
    "title": "Ship <MobileSafeArea> shared component",
    "estimate_h": 2,
    "deliverable": "web/src/components/mobile/MobileSafeArea.tsx wrapping env(safe-area-inset-*) on all 4 sides; useSafeArea() hook; integration with capacitor-plugin-safe-area (fixes Capacitor 6 Android safe-area-zero bug); unit tests verifying CSS var injection. Web-only behavior also works (env() variables resolve to 0 on web — no regression).",
    "evidence_required": "Playwright iPhone 14 + Pixel 7 projects screenshot a wrapped page — content not clipped by notch/Dynamic-Island/gesture-nav",
    "depends_on": ["U-A0-PLAYWRIGHT-MOBILE-PROJECTS", "U-CAPACITOR-SCAFFOLD-INIT"]
  },
  {
    "id": "U-B3-FORM-INPUT-TEXTBASE",
    "milestone": "UI-UX-IMPROVEMENT-MS0",
    "domain": "frontend",
    "priority": 1,
    "title": "16px-minimum form-input rule (iOS zoom prevention)",
    "estimate_h": 2,
    "deliverable": "Step 1 (audit): `grep -E 'text-(xs|sm)' web/src/**/*.tsx | grep -E '<(input|select|textarea)'` to enumerate intentionally-dense form fields that would collide; emit collision list. Step 2 (rule): src/styles/globals.css adds `input, select, textarea { font-size: max(1rem, 16px) }` rule, with case-by-case override classes for documented collisions from Step 1. Step 3 (lint): ESLint rule or just-build script flags any NEW tailwind class that would override below text-base on form elements.",
    "evidence_required": "Playwright iOS test focuses a form input — viewport scale stays 1.0 (no auto-zoom); collision list reviewed by operator before global rule lands",
    "depends_on": ["U-A0-PLAYWRIGHT-MOBILE-PROJECTS"]
  },
  {
    "id": "U-B4-PLATFORM-DATA-ATTR",
    "milestone": "UI-UX-IMPROVEMENT-MS0",
    "domain": "frontend",
    "priority": 1,
    "title": "data-platform attribute on document root for OS-aware Tailwind variants",
    "estimate_h": 2,
    "deliverable": "App.tsx useEffect: `document.documentElement.setAttribute('data-platform', Capacitor.getPlatform())`; tailwind.config.js adds variants `data-[platform=ios]:` and `data-[platform=android]:`; DESIGN.md updated with usage examples for the 44pt vs 48dp touch-target rule. PRE-CHECK: grep for existing `[data-platform=` selectors in index.css to verify no collision with prior usage.",
    "evidence_required": "buttons rendered on iOS show min-h-11, on Android show min-h-12, on web show their base; pre-existing CSS selectors not affected",
    "depends_on": ["U-CAPACITOR-SCAFFOLD-INIT"]
  },
  {
    "id": "U-B5-CAPACITOR-ANDROID15-KEYBOARD",
    "milestone": "UI-UX-IMPROVEMENT-MS0",
    "domain": "frontend",
    "priority": 1,
    "title": "Fix Android 15 keyboard overlap (capacitor#8166)",
    "estimate_h": 4,
    "deliverable": "install @capawesome/capacitor-android-edge-to-edge-support; capacitor.config.ts gated by Device.getInfo().osVersion >= 35; Keyboard.resizeOnFullScreen: false; integration test in e2e/ android emulator. Estimate assumes Android 15 AVD pre-provisioned; add 2h if cold-setup of SDK 35 image required.",
    "evidence_required": "Pixel 7 + Android 15 emulator: focus a bottom-pinned input → keyboard appears → input stays visible",
    "depends_on": ["U-CAPACITOR-SCAFFOLD-INIT"]
  },
  {
    "id": "U-B6-PREFERS-CONTRAST-MORE",
    "milestone": "UI-UX-IMPROVEMENT-MS0",
    "domain": "frontend",
    "priority": 2,
    "title": "prefers-contrast: more — third theme variant for Ultra Dark / high-contrast",
    "estimate_h": 3,
    "deliverable": "src/index.css adds `@media (prefers-contrast: more)` block — thickens focus outlines to 4px, borders to --surface-fg, link underlines to .14em; DESIGN.md documents the third variant; Playwright project asserts prefers-contrast:more changes visual output",
    "evidence_required": "Playwright run with prefers-contrast:more emulation produces a measurably different snapshot from baseline"
  },
  {
    "id": "U-C1-APCA-DESIGN-REVIEW-GATE",
    "milestone": "UI-UX-IMPROVEMENT-MS0",
    "domain": "frontend",
    "priority": 2,
    "title": "APCA Lc≥75 gate in /ui-audit skill",
    "estimate_h": 2,
    "deliverable": "/ui-audit invokes apca-w3 (npm package) on extracted color-pair list; fails when body-text pair < Lc75; report cites pairs that need fixing",
    "evidence_required": "running /ui-audit on CalculatorPage produces APCA report; one known-good pair passes, one known-bad pair fails",
    "depends_on": ["U-A2-CHROME-DEVTOOLS-INTEGRATION"]
  },
  {
    "id": "U-C2-WCAG-CONTRAST-RE-VERIFY",
    "milestone": "UI-UX-IMPROVEMENT-MS0",
    "domain": "frontend",
    "priority": 2,
    "title": "Re-verify every accent color in DESIGN.md against dark surface (not white)",
    "estimate_h": 4,
    "deliverable": "scripts/audit-dark-contrast.mjs reads DESIGN.md status-spectrum table, computes contrast vs near-black surface (canonical contrast ratios per WCAG 2.2 SC 1.4.3), flags any <3:1 (UI element) or <4.5:1 (body text); CI gate; failures listed for operator review",
    "evidence_required": "first-run report shows which (if any) of cyan/violet/emerald/amber/red drop below WCAG floor on the canonical near-black surface (rgba(2,6,23,.78) per DESIGN.md)"
  },
  {
    "id": "U-D1-MOBILE-VIEWPORT-SWEEP",
    "milestone": "UI-UX-IMPROVEMENT-MS0",
    "domain": "frontend",
    "priority": 1,
    "title": "Playwright multi-viewport sweep — 5 viewports × every page",
    "estimate_h": 4,
    "deliverable": "e2e/mobile-viewport-sweep.spec.ts iterates {iPhone SE, iPhone 14, Pixel 7, iPad, iPad Pro} × all routes from web/src/routes/; flags overflow / clipped-modal / unreachable-CTA / contrast-fail; report to state/shared/dashboards/mobile-viewport-sweep.json",
    "evidence_required": "report exists with per-page pass/fail; CI badge",
    "depends_on": ["U-A0-PLAYWRIGHT-MOBILE-PROJECTS"]
  },
  {
    "id": "U-D2-RESPONSIVE-TABLE-CARDS",
    "milestone": "UI-UX-IMPROVEMENT-MS0",
    "domain": "frontend",
    "priority": 2,
    "title": "<ResponsiveTable> primitive — table desktop / card-list <600px",
    "estimate_h": 4,
    "deliverable": "web/src/components/ResponsiveTable.tsx — desktop renders @tanstack/react-table; under 600px width auto-renders card list; same props; docs in DESIGN.md",
    "evidence_required": "Playwright iPhone 14 snapshot of a wrapped table page shows card list; Playwright desktop snapshot shows table; same data renders both",
    "depends_on": ["U-A0-PLAYWRIGHT-MOBILE-PROJECTS"]
  },
  {
    "id": "U-E1-FMERGE-CADQUERY-PORT",
    "milestone": "UI-UX-IMPROVEMENT-MS0",
    "domain": "frontend",
    "priority": 1,
    "title": "Atomic-roadmap encoding of FRONTEND-MERGE-AUDIT Phase B (CadQuery port)",
    "estimate_h": 8,
    "deliverable": "exec FRONTEND-MERGE-AUDIT-AND-PLAN-2026-05-25.md Phase B steps 1-5 verbatim; Calculator Studio chrome wrapping; api at mcp-server/web/src/api/cadquery.ts",
    "evidence_required": "Playwright screenshot of /cadquery route renders CadQuery editor + Three.js viewer + log viewer in PRISM dark theme",
    "source_spec": "FRONTEND-MERGE-AUDIT-AND-PLAN Phase B — this unit is the atomic-roadmap encoding of that phase, not new work"
  },
  {
    "id": "U-E2-FMERGE-CQASK-PORT",
    "milestone": "UI-UX-IMPROVEMENT-MS0",
    "domain": "frontend",
    "priority": 2,
    "title": "Atomic-roadmap encoding of FRONTEND-MERGE-AUDIT Phase C (cqask NL-to-CAD)",
    "estimate_h": 16,
    "deliverable": "exec FRONTEND-MERGE-AUDIT-AND-PLAN-2026-05-25.md Phase C steps 1-5; AntDesign→Radix per-component swap; reuses RenderOutput from E1",
    "evidence_required": "Playwright screenshot of /cad-from-text route shows NL input + generated CAD + 3D viewer; cqask/ tree deprecated",
    "source_spec": "FRONTEND-MERGE-AUDIT-AND-PLAN Phase C — this unit is the atomic-roadmap encoding of that phase, not new work",
    "depends_on": ["U-E1-FMERGE-CADQUERY-PORT"]
  }
]
```

**Total: 16 units, estimated 59 hours.** Priority 0 = 4 units / 6 h (start here — U-A0 / U-CAPACITOR-SCAFFOLD-INIT / U-A1 / U-A2). Priority 1 = 6 units / 22 h. Priority 2 = 6 units / 31 h (B1 was demoted from P0 to P2 after round-2 verification confirmed App.tsx already ships lazy-wrapping — audit-only unit now).

**Proposed (operator-confirm) sequencing:** A0 first (no deps, unblocks B2/B3/D1/D2). Capacitor-scaffold next (operator-gated, unblocks B2/B4/B5). A1 + A2 + B1 in parallel after schema validation. B2 + B3 + B4 after their prereqs land. B5 + B6 + C1 + C2 + D1 + D2 follow. E1 → E2 last (depends on backend Phase B from the morning plan). **All sequencing is advisory** — operator owns the actual ordering.

**Not in this unit list** (explicitly operator-gated per `feedback_frontend_codex`):
- Per-page text-density refactor of the 12+ mega-pages (operator must approve each split per `feedback_frontend_codex`)
- Figma OAuth (operator action)
- Capacitor scaffold init (operator decides timing of mobile-app pilot)
- App Store / Play Store provisioning (operator capital + paperwork)

---

## 7. Operator decisions still open

These need a human call before any of the units above can ship:

1. **Senior-doctrine conflict — `feedback_backend_before_frontend`.** Standing operator memo says *"backend EDM physics and optimization perfected before any frontend work"*. This spec ships 16 frontend units. The framing this spec adopts: these are **design-loop tooling** (Playwright `--cli` mode, mobile Playwright projects, chrome-devtools-mcp wiring) and **shared infrastructure** (MobileSafeArea, data-platform attribute, contrast audit script) — they compound future frontend work without taking developer hours from backend. The two CAD-merge units (E1/E2) ARE feature work and inherit iter35's deferral. **Operator must explicitly approve** that this interpretation honors the backend-first directive before ANY unit ships.
2. **Add `chrome-devtools-mcp` to active design-loop?** Already installed; existing skills `chrome-devtools-mcp:a11y-debugging`, `:debug-optimize-lcp`, `:memory-leak-debugging` overlap U-A2's deliverable. Decision: (a) ship U-A2 as a thin `/ui-audit` skill that chains the 3 existing plugin skills (small surface, no new logic), or (b) skip U-A2 and standardize on the 3 plugin skills directly. Recommendation: (a) — single entry point is operator-friendly.
3. **U-B1 reframing (post-round-2)** — the original "code-split mega-pages" unit was a no-op (already shipped). The new U-B1 is an audit unit; downstream "tab-level intra-page split of CalculatorPage" is operator-gated per-page work, not scheduled here.
4. **Tremor evaluation** — should new dense-numeric pages use Tremor primitives instead of hand-rolled Radix + Tailwind? Reduces hand-roll error class; commits PRISM to a third-party design dependency. Out of scope for this delta — flag for future operator decision.
5. **Capacitor scaffold timing** — Phase E in the morning plan reads as "do this any time"; mobile units B2-B5 above are no-ops without the Capacitor scaffold existing. Recommend operator schedule the `npx @capacitor/cli init` step first.
6. **Figma OAuth** — same as morning plan G4, still pending. Recommend operator authenticates in a 5-minute /run session.
7. **Wiki promotion** — neither the Morph 114k→27k benchmark nor the iOS-26 Liquid-Glass design-implication is recorded anywhere in `knowledge/wiki/`. Recommend creating `knowledge/wiki/architecture/playwright-mcp-cli-token-economics.md` and `knowledge/wiki/architecture/specs/ios-26-liquid-glass-implications-for-industrial-dark.md` to anchor the citations for future PRISM use (per R8 + wiki-bootstrap discipline).

---

## 8. Sources

**Better-than-Playwright research:**
- [Playwright vs Chrome DevTools MCP — Steve Kinney](https://stevekinney.com/writing/driving-vs-debugging-the-browser)
- [Chrome DevTools MCP vs Playwright MCP vs CLI — Test-Lab.ai](https://www.test-lab.ai/blog/chrome-devtools-mcp-vs-playwright-mcp-cli)
- [Playwright MCP Setup and Cost: Why the CLI Is 4× Cheaper — Morph](https://www.morphllm.com/playwright-mcp)
- [How Accessibility Tree Formatting Affects Token Cost — DEV](https://dev.to/kuroko1t/how-accessibility-tree-formatting-affects-token-cost-in-browser-mcps-n2a)
- [Browserbase MCP Server (Stagehand)](https://github.com/browserbase/mcp-server-browserbase)
- [shadcn/ui MCP docs](https://ui.shadcn.com/docs/mcp)
- [Skyvern vs Stagehand vs Playwright — DEV](https://dev.to/stevengonsalvez/browser-tools-for-ai-agents-part-2-the-framework-wars-browser-use-stagehand-skyvern-4gn)

**Mobile UI/UX 2026:**
- [iOS Liquid Glass design gallery (Apple) — MacRumors](https://www.macrumors.com/2026/04/06/apple-liquid-glass-design-gallery-update/)
- [Correct way to use dark mode with Liquid Glass — anotherapple.com](https://www.anotherapple.com/2026/04/the-correct-way-to-use-dark-mode-with-liquid-glass/)
- [Ultra dark mode (Reduce-Transparency + Increase-Contrast composition)](https://www.geeky-gadgets.com/enable-iphone-ultra-dark-mode/)
- [Material 3 Expressive deep-dive — Supercharge](https://supercharge.design/blog/material-3-expressive)
- [Material 3 dark mode 2026 — designdroid.in](https://designdroid.in/adark-mode-android-material-3-2026/)
- [Wear OS color roles + tokens (cleanest M3 role taxonomy reference)](https://developer.android.com/design/ui/wear/guides/styles/color/roles-tokens)
- [Capacitor 6 Android 15 edge-to-edge keyboard bug](https://github.com/ionic-team/capacitor/issues/8166)
- [Capacitor 6 safe-area-inset returns 0 on Android](https://forum.ionicframework.com/t/safe-area-values-always-zero-on-android-with-ionic-capacitor-version-6/243003)
- [WCAG 2.2 dark-mode contrast — Make Things Accessible](https://www.makethingsaccessible.com/guides/contrast-requirements-for-wcag-2-2-level-aa/)
- [Dark mode + high-contrast complete a11y guide 2026 — Greeden](https://blog.greeden.me/en/2026/02/23/complete-accessibility-guide-for-dark-mode-and-high-contrast-color-design-contrast-validation-respecting-os-settings-icons-images-and-focus-visibility-wcag-2-1-aa/)
- [Dark-surface contrast pitfalls (accent re-verification)](https://rgblind.com/blog/wcag-color-contrast-requirements)

---

**Status:** This spec is the **plan** deliverable for the operator's 2026-05-25 `/goal`. Units are advisory until added to `atomic-roadmap.json`; operator owns scheduling. Companion HTML render available via `node H:/prism/scripts/md-to-html.mjs state/shared/specs/FRONTEND-PLAN-EXTENSION-2026-05-25.md --toc`.

---

## 9. ADDENDUM — operator's second 2026-05-25 /goal (self-learning UI/UX + repos to download)

> Operator re-issued /goal mid-loop adding: deep research on UI/UX + software-engineering + system-architecture + **self-learning + self-improving systems applied to UI/UX**; make the apps look professional, not vibe-coded; **download repos / plugins / Claude-Code helpers** that improve UI/UX design capability. Below is the delta over §1-8.

### 9.1 Self-learning UI/UX — the 2026 honest answer

The state-of-art for **autonomous UI iteration** in 2026 centers on **LLM-agents-as-synthetic-users**, NOT on direct production-behavior learning loops. Citable refs: [UXAgent CHI 2026](https://dl.acm.org/doi/10.1145/3706599.3719729), [Avenir-UX](https://arxiv.org/html/2604.09581) (GUI-grounded perception), [AgentA/B](https://arxiv.org/pdf/2504.09723) (persona-driven A/B on live interfaces), [WiserUI-Bench](https://arxiv.org/html/2505.05026v4) (real A/B-grounded evaluation). The 2026 candor: [Nielsen's predictions](https://jakobnielsenphd.substack.com/p/2026-predictions) state AI WILL NOT reliably diagnose usability from behavior by year-end. Closed-loop AUTONOMOUS UI evolution remains aspirational; deploy ALL of it behind feature flags + consent prompts.

**Applied to PRISM (concrete units):**
- **U-F1-SYNTHETIC-USER-HARNESS** — every preview-deploy runs 3 Playwright-MCP-driven persona loops (machinist on shop-floor tablet, sales engineer quoting, owner reviewing margins) + captures CLS/INP/LCP/click-friction + files an auto-`feedback_ux_*` memory. P1, 4h. Reuses already-installed Playwright MCP.
- **U-F2-FEATURE-FLAG-GUARD** — any AI-proposed visual mutation routes through the existing `/feature-matrix` system; NEVER auto-deploys. P0, 1h documentation-only.

### 9.2 Architecture for 200+ React pages — DON'T jump to micro-frontends yet

2026 consensus ([Module Federation 3.0](https://blog.weskill.org/2026/03/micro-frontends-2026-module-federation_0688468676.html), [iloveblogs guide](https://www.iloveblogs.blog/post/micro-frontends-architecture-guide-2026)) is that MFEs unlock past ~200 pages with multiple teams. PRISM at 119 pages with single-team development is **pre-threshold**. Production refs that do operate at MFE scale: Amazon retail (search/recommendations/checkout), Spotify (playlists/profiles), Vercel Next.js 17 Multizone, Nx Module Federation. Premature MFE = self-inflicted Notion-grade chaos.

**Applied to PRISM:**
- **U-F3-TAB-LEVEL-DYNAMIC-IMPORTS** — inside the 9 mega-pages (CalculatorPage 660KB has Mill/Lathe/WEDM tabs; PostProcessorGeneratorPage 185KB has per-controller sections; QuoteBuilderPage 117KB has wizard-step partitions), split tabs/sections via `React.lazy(() => import('./CalculatorPageMillTab'))`. Operator-gated per page (`feedback_frontend_codex`). P1, 4-8h per page, in sequence not parallel.
- **U-F4-DESIGN-TOKENS-WORKSPACE-PACKAGE** — extract `@prism/design-tokens` as a workspace package NOW so when natural MFE split arrives (Quote / Shop-Floor / CAD-CAM as 3 federated remotes is the seam), the contract pre-exists. P2, 6h.
- **U-F5-ROLLUP-CHUNK-AUDIT** — read existing `vite.config.ts manualChunks()` (confirmed present), generate per-chunk size report, identify pages that should chunk together vs separately. P1, 2h. Pure audit.

### 9.3 SE practices — 2026 LLM-assisted frontend gates

Beyond TDD: **change-only visual regression** ([Chromatic TurboSnap](https://www.chromatic.com/compare/percy) — 85% snapshot reduction), **perceptual AI diffing** ([Applitools Eyes 10.22](https://percy.io/blog/visual-regression-testing-tools) — Figma plugin compares prod against design), **token-drift gates** (Style Dictionary vs Figma Variables API), **render-budget gates** ([react-scan](https://github.com/aidenybai/react-scan)), **Lighthouse CI** (`@lhci/cli`) as PR gate with budget JSON.

**Applied to PRISM:**
- **U-F6-LIGHTHOUSE-CI-GATE** — add `@lhci/cli` + `.lighthouserc.js` with budgets `{LCP:2500, INP:200, CLS:0.1, JS:300KB}` as GitHub Actions PR gate. Blocks regressions, no SaaS bill (Google-owned, free). P0, 3h. **Highest single ROI** in the entire spec.
- **U-F7-REACT-SCAN-DEV-OVERLAY** — `<script crossorigin src="//unpkg.com/react-scan/dist/auto.global.js"></script>` in `index.html` behind `import.meta.env.DEV`. Surfaces wasted renders in the 9 monoliths immediately, zero config. P0, 15min.
- **U-F8-AXE-CORE-PLAYWRIGHT** — `npm i -D @axe-core/playwright`; assert WCAG via existing Playwright MCP harness. Enforces shop-floor a11y (tablet, gloves, glare). P1, 2h.

### 9.4 Downloadable repos / plugins / Claude-Code helpers (NEW — not already installed)

NOT re-recommending already-installed: figma:*, chrome-devtools-mcp:*, playwright, frontend-design, skill-creator, playground, supabase, linear, greptile.

| Tool | Install command | Value | PRISM fit | Priority |
|---|---|---|---|---|
| **shadcn-ui MCP** | `claude mcp add shadcn -- bunx -y @jpisnice/shadcn-ui-mcp-server` + `GITHUB_PERSONAL_ACCESS_TOKEN` env | LLM grounded in current shadcn/ui v4 components+blocks — no hallucinated props | HIGH — `web/CLAUDE.md` mandates Radix; shadcn = canonical Radix+Tailwind recipe | **P0** |
| **Lighthouse CI** | `npm i -D @lhci/cli` + `.github/workflows/lhci.yml` | Perf-budget PR gate, Google-owned, free | HIGH — pairs with existing `/forge-perf` skill | **P0** |
| **react-scan** | `<script>` in `index.html` dev-only | Live render-waste overlay | HIGH — instantly surfaces re-render thrash in PartProfile + QuoteWizard | **P0** |
| **@axe-core/playwright** | `npm i -D @axe-core/playwright` | WCAG violations as Playwright assertions | MED-HIGH — pairs with existing Playwright MCP | **P1** |
| **Tremor** (React lib) | `npm i @tremor/react` | Dashboard primitives (KPI cards, charts) matching shadcn ergonomics | MED-HIGH — direct fit for shop-floor + cost dashboards | **P1** (operator-eval) |
| **Storybook 9 + Chromatic** | `npx storybook@latest init` + `npx chromatic` | Component-isolated visual regression w/ TurboSnap | MED — meaningful once `@prism/design-tokens` extracted; premature today | **P2** |
| **million.js** | `npm i million` + Vite plugin | Compiler-level VDOM auto-memo | LOW — only after react-scan shows real waste; premature optimization otherwise | **P3** |

**Top 3 NEW installs (operator-gated):**
1. **`claude mcp add shadcn -- bunx -y @jpisnice/shadcn-ui-mcp-server`** + GitHub PAT — stops Claude hallucinating component APIs. Zero ongoing cost.
2. **`@lhci/cli` + `.lighthouserc.js`** — blocks regressions on the 9 monoliths ≥50KB. Free. Pairs with `/forge-perf`.
3. **`react-scan` + `@axe-core/playwright`** — surfaces wasted renders + WCAG violations during normal dev without workflow change. ~10min combined setup.

### 9.5 The "vibe-coded vs professional" gap — 3 concrete patterns

Per [Muzli 2026 analysis](https://muz.li/blog/vibe-design-in-2026-what-ai-generated-ui-means-for-your-work/): *"Edge cases are not vibe-designed. The happy path, yes. The empty state when the API returns nothing, the error state when the payment fails, the loading state for a table with 50,000 rows… these are designed by someone who thought about them, or they are absent."*

**The 3 patterns that close the gap:**

1. **State-coverage matrix** — every list/table/form ships **5 states**: loading skeleton, empty (with CTA), error (with retry), partial, success. Vibe-coded outputs ship only success. PRISM = 119 pages × 5 states = tractable per-page checklist.
2. **Token-driven theming** — colors/spacing/radii/typography flow from CSS custom properties; rebrand + dark-mode become free. Already in `web/CLAUDE.md` doctrine — needs ENFORCEMENT via Stylelint custom rule banning hex literals outside `tokens.css`.
3. **Motion + micro-interaction guidelines** — `<200ms` transitions, `prefers-reduced-motion` respected, brand-consistent easing curves in a `motion.ts` token file. Per Muzli: this is what AI averages cannot produce — the explicit human-curated layer that makes PRISM feel like PRISM, not "another shadcn dashboard."

**Applied to PRISM:**
- **U-V1-STATE-COVERAGE-LINT** — scan every `pages/**/*.tsx` for `isLoading`, `isError`, `isEmpty` branches; warn on missing. Don't auto-block (existing pages would all fail) — surface as report. P1, 3h.
- **U-V2-STYLELINT-NO-INLINE-HEX** — Stylelint rule rejects hex/rgba/rgb literals outside `src/index.css` + `tokens.css`. P1, 2h.
- **U-V3-MOTION-TOKENS** — `web/src/design/motion.ts` codifies easing curves (`ease-industrial`, `ease-haptic`), durations (`fast: 120ms`, `med: 180ms`, `slow: 240ms`), respects `prefers-reduced-motion`; DESIGN.md documents. P2, 4h.

### 9.6 §9 unit summary

13 new units (F1-F8 + V1-V3 + 2 install tasks for shadcn-mcp + lhci):

| ID | Priority | Estimate | Description |
|---|---|---:|---|
| U-F1-SYNTHETIC-USER-HARNESS | P1 | 4h | Playwright persona-loops on preview deploys + auto-memory |
| U-F2-FEATURE-FLAG-GUARD | P0 | 1h | Doctrine: AI mutations behind feature flags |
| U-F3-TAB-LEVEL-DYNAMIC-IMPORTS | P1 | 4-8h/page | Intra-page React.lazy for 9 mega-pages, operator-gated per page |
| U-F4-DESIGN-TOKENS-WORKSPACE | P2 | 6h | Extract `@prism/design-tokens` workspace package |
| U-F5-ROLLUP-CHUNK-AUDIT | P1 | 2h | Per-chunk size report from existing `manualChunks()` |
| U-F6-LIGHTHOUSE-CI-GATE | **P0** | 3h | **HIGHEST ROI** — perf-budget PR gate, Google-owned, free |
| U-F7-REACT-SCAN-DEV-OVERLAY | **P0** | 15min | Live render-waste overlay, dev-only |
| U-F8-AXE-CORE-PLAYWRIGHT | P1 | 2h | WCAG assertions via existing Playwright MCP |
| U-V1-STATE-COVERAGE-LINT | P1 | 3h | Scan for loading/empty/error branches |
| U-V2-STYLELINT-NO-INLINE-HEX | P1 | 2h | Reject inline hex/rgba |
| U-V3-MOTION-TOKENS | P2 | 4h | motion.ts + DESIGN.md update |
| U-INSTALL-SHADCN-MCP | **P0** | 30min | `claude mcp add shadcn …` + GitHub PAT |
| U-INSTALL-LHCI | **P0** | 1h | npm install + workflow file |

**§9 total: 13 units, 36-44h.** P0 = 5 units / 5.75h (start here, immediate compounding wins). P1 = 6 units / 17-21h. P2 = 2 units / 10h.

**Combined spec total (§6 + §9): 29 atomic units, ~95-103h.**

### 9.7 §9 sources
- [UXAgent CHI 2026](https://dl.acm.org/doi/10.1145/3706599.3719729) · [Avenir-UX](https://arxiv.org/html/2604.09581) · [AgentA/B](https://arxiv.org/pdf/2504.09723) · [WiserUI-Bench](https://arxiv.org/html/2505.05026v4) · [Nielsen 2026 Predictions](https://jakobnielsenphd.substack.com/p/2026-predictions)
- [Module Federation 3.0 2026](https://blog.weskill.org/2026/03/micro-frontends-2026-module-federation_0688468676.html) · [Micro-Frontends 2026 Guide](https://www.iloveblogs.blog/post/micro-frontends-architecture-guide-2026) · [Nx MFE](https://nx.dev/docs/technologies/module-federation/concepts/micro-frontend-architecture)
- [Percy Top 10 Visual Regression 2026](https://percy.io/blog/visual-regression-testing-tools) · [Chromatic vs Percy](https://www.chromatic.com/compare/percy) · [Sauce Labs 20 Best 2026](https://saucelabs.com/resources/blog/comparing-the-20-best-visual-testing-tools-of-2026)
- [shadcn-ui MCP server](https://github.com/Jpisnice/shadcn-ui-mcp-server) · [shadcn MCP docs](https://ui.shadcn.com/docs/mcp) · [react-scan](https://github.com/aidenybai/react-scan)
- [Muzli Vibe Design 2026](https://muz.li/blog/vibe-design-in-2026-what-ai-generated-ui-means-for-your-work/) · [Eleken Empty State UX](https://www.eleken.co/blog-posts/empty-state-ux)
