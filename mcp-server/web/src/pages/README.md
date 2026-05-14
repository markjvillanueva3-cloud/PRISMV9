# PRISM Web Pages — Route Catalog

This directory holds the page-level React components, each lazy-imported in `../App.tsx`.

**Codex protection rule** (from `mcp-server/web/CLAUDE.md`): do not build over Codex frontend builds. Before creating a new page, audit this catalog. If a page with similar functionality exists, improve it instead of creating a parallel one.

The most-commonly-confused area is the **Calculator + PPG matrix** — there are five distinct surfaces that *look* like duplicates but each have a different audience and component tree.

## Calculator + PPG matrix

| Route | Page file | LOC | Component tree | Audience |
|---|---|---|---|---|
| `/calculator` | `CalculatorPage.tsx` | 13,542 | `components/calculator/*` | The full Calculator Studio — power users wanting Lathe/WireEDM panels, auto-programming workbench, audit oracle, CAM strategy compare, deep variability sweep |
| `/speed-feed-calc` | `SfcCalculatorPage.tsx` | 370 | `components/sfc/*` | Focused users who want a fast S/F calc with smart compatibility validation, comparison view (4-up), preset manager, PDF export, localStorage history |
| `/ppg` | `PostProcessorGeneratorPage.tsx` | 4,458 | (full) + `components/ppg/*` (subset) | The full Post Processor Generator — Mill/Lathe/MillTurn/Multi-axis/Swiss, every controller dialect, full wizard + lane modes, machine picker, post library, comparison |
| `/ppg-lite` | `PpgPage.tsx` | 395 | `components/ppg/*` | Focused users who want a quick G-code editor — 3-column responsive, keyboard shortcuts (Ctrl+S/G/D), AIIntelligencePanel (Claude Opus-level G-code recommendations), GcodeDiff, AdvancedEnhancer |
| `/post-processor` | `PostProcessorPage.tsx` | 1,171 | (own data) | **Marketing landing page** — hero metrics, 7-phase pipeline diagram, 12 controller cards w/ pricing badges, 6 differentiators, testimonials, $149/$399/Enterprise pricing, before/after G-code with physics annotations, 18-CAM integration matrix, workflow nodes |

These pages are **NOT duplicates.** Each was built for a distinct audience, has its own component hierarchy, and exposes a different feature surface. Cross-links between them are wired via `<SurfaceCrossLink>` (`../components/SurfaceCrossLink.tsx`) so users on one surface can discover the others.

## Studio pages (per-suite)

| Route | Page file | LOC | Suite |
|---|---|---|---|
| `/wire-edm-studio` | `WireEdmStudioPage.tsx` | 147 | Wire EDM (currently thin — slated for expansion in Phase 4 of CALC-OPS-MS0) |
| `/lathe/upload`, `/lathe/wizard`, `/lathe/results` | `LatheUploadPage.tsx`, `LatheWizardPage.tsx`, `LatheResultsPage.tsx`, plus `LatheStudioPage.tsx` | 520 | Lathe |
| `/milling/upload`, `/milling/wizard`, `/milling/results` | `MillingUploadPage.tsx`, `MillingWizardPage.tsx`, `MillingResultsPage.tsx`, plus `MillStudioPage.tsx` | 672 | Mill |
| `/wire-edm/upload`, `/wire-edm/wizard`, `/wire-edm/results` | `WireEdmUploadPage.tsx`, `WireEdmWizardPage.tsx`, `WireEdmResultsPage.tsx` | — | Wire EDM (wizard flow) |

## Design language

All pages should follow the Calculator Studio design language (per `mcp-server/web/CLAUDE.md`):

- **Theme:** PRISM dark with glow borders, LED sweep effects
- **CSS classes:** `prism-glow-cyan`, `prism-glow-violet`, `prism-glow-emerald`, `prism-glow-amber`, `prism-glow-red`, `prism-chip`, `prism-spectrum-fill`, `prism-led-sweep`
- **Backgrounds:** `bg-[rgba(2,6,23,0.78)]`, `border-white/10`, `rgba(148,163,184,0.08)`
- **Status colors:** cyan=info/shipped, violet=pending, emerald=success, amber=warning, red=error

## Adding a new page

1. **Check first.** Grep this catalog (`Ctrl+F` for keywords). If a page with similar functionality exists, file an improvement task instead of creating a parallel one.
2. **If genuinely new:**
   - Add the `.tsx` file to this directory.
   - Lazy-import in `../App.tsx` (use `lazyNamed` when the export is named, `lazy` for default exports).
   - Add a `<Route path="…" element={lazyElement(<…/>)} />` entry.
   - Update this README's tables.
   - If the page belongs to the Calculator/PPG matrix, add a `<SurfaceCrossLink>` to the most-related sibling.
3. **Follow the design language.** Match the Calculator Studio look + the glow classes above.
4. **Wire tests.** Add at minimum one vitest file under `../__tests__/` with real-value assertions (no `.toBeDefined()` stubs — those are hook-rejected per `feedback_always_build`).

## Owner notes

- This catalog is maintained alongside the routing table in `App.tsx`. If the table here disagrees with `App.tsx`, `App.tsx` is the source of truth — update this file.
- Phase audit history: Phase 0 of `CALC-OPS-MS0` (2026-05-14) introduced this file + the `<SurfaceCrossLink>` cross-link pattern + a documentation comment block around the Calculator + PPG matrix routes in `App.tsx`. **The `/post-processor` route already existed at `App.tsx:242`** — earlier audit drafts of this README incorrectly claimed Codex shipped it unrouted; that was wrong. Phase 0 added the matrix doc-comment and the cross-link CTAs; the route itself is pre-existing.
- LOC counts in the tables above are approximate, pre-Phase-0-cross-link (the cross-link inserts add ~5–15 LOC per host page). Re-run `wc -l` after every cross-link revision if exact numbers matter.
