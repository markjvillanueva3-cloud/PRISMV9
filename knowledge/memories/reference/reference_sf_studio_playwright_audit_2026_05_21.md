---
name: sf-studio-playwright-audit-2026-05-21
description: Playwright audit of the 3 Speed-Feed calculator studio pages — 9 findings + the 15%-zoom-out UX patch
aliases: reference_sf_studio_playwright_audit_2026_05_21
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.933Z
---


# Speed-Feed Calculator Studio — Playwright audit, 2026-05-21 juliett

## Scope
/goal directive: "fully test the speed feed calculator studio pages... use playwright... optimize UX... zoom 15% might help". Three routes audited at 1920×1080 against the Vite dev server (:3100):
- `/speed-feed-calc` → `SfcCalculatorPage.tsx` (13.2K — guided calculator)
- `/speed-feed` → `SpeedFeedPage.tsx` (36.8K — JM Die orchestrator, 46 spinbuttons)
- `/calculator` → `CalculatorPage.tsx` (656.9K — full Calculator Studio, 6 process tabs)

## Buttons verified working
- **/speed-feed-calc**: material combobox + dropdown, 5 operation accordions (Milling/Turning/Drilling/Grinding/Threading) each expanding sub-ops, parameter spinbuttons, Metric/Imperial toggle (conversion math correct: 12mm→0.4724″), Conservative/Standard/Aggressive, 9 machine buttons, Charts/Compare/History tabs, Calculate.
- **/speed-feed**: machine `<select>` (26 options), ISO/Optimize/CAM dropdowns, all 46 numeric inputs, Quick/Full Analysis/Pareto Optimize modes, 2 Calculate buttons.
- **/calculator**: 6 process tabs (Mill/Lathe/Sinker EDM/Wire EDM/Laser/Waterjet — aria-pressed correct), 7 tool-magazine buttons (24-120, aria-pressed correct), machine-option toggles.

## 9 findings (advisory — none auto-fixed except the zoom patch)
1. **Tool catalog mismatch** (P2) — `/speed-feed-calc` Face-Milling + 6061 aluminum shows "No compatible tools found" with 12 incompatible tools in the fixture. The bundled tool catalog has zero face-mill 50mm aluminum-compatible entries. Calculate still enables on parameter defaults.
2. **Calculate endpoint live-only** (P1) — `/api/v1/sfc/calculate` (and `/speed-feed`'s orchestrate route) 500 when the MCP API server (:3000) is down. Every OTHER endpoint (material/tool/machine/billing/operating-system) has fixture fallback ("Live + fallback" disclosure). The core calculation does NOT — so with the backend down the calculators are unusable. UI catches the 500 gracefully ("Calculation Error: Internal Server Error") but a fixture-fallback compute path would make the dev/demo experience resilient.
3. **Tool placeholder copy** (P3) — `/speed-feed-calc` Tool section says "Select material **and** operation first" even when material IS already selected; should narrow to "Select operation first".
4. **Turning uses milling vocabulary** (P2) — `/speed-feed-calc` Rough Turning shows a "Width of Cut" parameter field — a milling concept. Turning should expose "Feed Rate (mm/rev)" + pass count instead.
5. **Operation chip a11y** (P3) — operation buttons concatenate in the accessibility tree as "TTurning4" / "DDrilling3" (badge-letter + word + count, no separators). Add aria-labels.
6. **/speed-feed placeholder co-resident with error** (P2) — after a failed Calculate the page keeps showing "Select a JM Die machine and milling setup" placeholder AND surfaces the error elsewhere; no clear results-area state transition.
7. **/speed-feed mode buttons lack aria-pressed** (P3) — Quick/Full Analysis/Pareto Optimize never expose `aria-pressed`; screen readers can't tell the active mode.
8. **/calculator workflow-mode buttons lack aria-pressed** (P3) — Guided/Balanced/Experienced same issue (process tabs + tool-magazine buttons DO expose it correctly).
9. **Information density** (P2 → FIXED) — `/speed-feed` packs 46 spinbuttons; only 3 visible above-fold at the default `--prism-app-zoom: 0.9`.

## The 15%-zoom-out hypothesis — CONFIRMED + PATCHED
User: "i think zooming the page out 15% might help." Measured empirically on `/speed-feed`:
- Default (`--prism-app-zoom: 0.9`): 3 of 46 spinbuttons above-fold
- At 0.85 effective zoom: 5 of 46 above-fold — **+67% more controls visible**

Patch shipped (route-scoped, opt-in — does NOT touch lighter pages):
- `index.css`: new `body[data-sf-density='compact']` rule → `zoom: calc(var(--prism-app-zoom) * 0.944)` ≈ 0.85 final (0.9 × 0.944). Plus matching `#root` width/min-height compensation.
- `SfcCalculatorPage.tsx` + `SpeedFeedPage.tsx`: `useEffect` sets `data-sf-density="compact"` on `<body>` on mount, clears on unmount.
- `/calculator` (Calculator Studio) intentionally EXCLUDED — already band-organized; benefits more from default card-density.
- Verified live: `body zoom = 0.8496`, page renders clean.

## Note on environment
The 60-500 console errors observed are all `/api/v1/*` 500s because the audit ran against Vite-only (:3100) with the MCP API server (:3000) down. These are NOT frontend bugs — except finding #2, which is a real resilience gap (no fixture fallback for the compute call).

## Follow-ups worth a roadmap unit
- `U-SFC-COMPUTE-FIXTURE-FALLBACK` — give `/api/v1/sfc/calculate` + speed-feed orchestrate a fixture-fallback path (finding #2, P1).
- `U-SFC-TURNING-PARAMS` — Rough/Finish Turning param panel should use feed-per-rev, not Width of Cut (finding #4).
- `U-SFC-A11Y-PRESSED` — add aria-pressed to /speed-feed + /calculator mode buttons (findings #7, #8).
