# PRISM v9 Web App -- Frontend Performance Audit

## Audit Scope
- `web/src/App.tsx` -- 67 lazy-loaded routes
- `web/src/pages/SfcCalculatorPage.tsx` -- most complex page (21 child components)
- `web/package.json` -- 5 runtime dependencies
- `web/src/data/*.ts` -- 11 static data modules
- `web/vite.config.ts` -- build configuration
- `web/src/components/sfc/*.tsx` -- 21 SFC components
- localStorage usage across the app
- Font / image / asset strategy

---

## FINDING 1 -- Code Splitting Architecture
**SEVERITY: LOW (Well-Designed)**

The 67-route `App.tsx` uses `React.lazy()` + `Suspense` correctly. Every page is a separate dynamic `import()`, which means Vite will produce a separate chunk per route. This is textbook code-splitting.

**What is right:**
- Every page wrapped in `<Lazy>` / `<Suspense>` with a shared `<PageLoader />` fallback
- Named-export pages handled correctly with `.then(m => ({ default: m.X }))`
- `AppShell` (sidebar + header) is NOT lazy -- loaded eagerly as the frame. This is correct.
- `ErpProvider` and `LearningProvider` are scoped to their route subtrees, not loaded globally

**One concern:** The `LearningProvider` wraps `LearningLayout` inside a `<LearningPage>` that creates a *nested* Suspense boundary. The outer `<Suspense>` in `LearningPage` and the inner `<Lazy>` wrappers around child routes create double-Suspense. This is harmless but slightly redundant -- the inner `<Lazy>` fallbacks will never show because the outer Suspense catches first.

**Recommendation:** No action needed. Code splitting is effective.

---

## FINDING 2 -- Vite Build Configuration: manualChunks
**SEVERITY: LOW (Good, Minor Improvement Possible)**

`vite.config.ts` lines 29-37:
```ts
manualChunks: {
  react: ["react", "react-dom", "react-router-dom"],
  recharts: ["recharts"],
  jspdf: ["jspdf"],
}
```

**What is right:**
- React ecosystem in one chunk (loaded on every page, cached long-term)
- `recharts` isolated -- only loaded when `AdvancedCharts.tsx` is rendered (SFC page only)
- `jspdf` isolated -- only loaded when PDF export is triggered

**Missing:** `@monaco-editor/react` is NOT in manualChunks. Monaco is ~3-5 MB and is imported by `GcodeEditor.tsx` and `GcodeDiff.tsx` (PPG page). Vite will already code-split it because the PPG page is lazy, but adding an explicit chunk would improve cache granularity.

**Recommendation (MINOR):**
```ts
manualChunks: {
  react: ["react", "react-dom", "react-router-dom"],
  recharts: ["recharts"],
  jspdf: ["jspdf"],
  monaco: ["@monaco-editor/react"],  // ADD: isolate ~3-5MB Monaco chunk
}
```

---

## FINDING 3 -- Static Data Files Shipped to Client
**SEVERITY: LOW (Acceptable for Current Scale)**

All 11 data files under `web/src/data/` are static arrays imported at module scope:

| File | Records | Est. Gzipped Size |
|------|---------|-------------------|
| `materials.ts` | 30 MaterialEntry | ~1.5 KB |
| `machines.ts` | 9 MachineEntry | ~1.0 KB |
| `tools.ts` | 13 CuttingToolEntry + 9 coatings | ~2.0 KB |
| `operations.ts` | ~50 OperationType across 13 categories | ~3.0 KB |
| `toolpathStrategies.ts` | 21 strategies + 4 priorities | ~2.5 KB |
| `machineModes.ts` | 13 MachineModeConfig | ~2.5 KB |
| `controllers.ts` | 22 controllers + 9 spindles + 9 ATCs | ~2.0 KB |
| `toolHolders.ts` | 14 tapers + 12 holders + 10 geometries + 7 coatings + 4 grades | ~3.0 KB |
| `fixtures.ts` | 19 FixtureType | ~1.5 KB |
| `stockShapes.ts` | 7 StockShape | ~1.0 KB |
| `camSoftware.ts` | 5 CamSoftwareEntry | ~0.8 KB |
| **TOTAL** | **~200 records** | **~21 KB gzipped** |

This is small. For a manufacturing desktop app used by machinists (not mobile consumers), 21 KB of domain data is negligible. API-fetching this data would add latency, a loading state for every selector, error handling, and a backend endpoint -- all for minimal benefit.

**Recommendation:** No action needed. Keep data static. Only move to API if the catalog grows to 500+ records per category (e.g., if you eventually import a full Sandvik or Kennametal tool catalog with thousands of inserts).

---

## FINDING 4 -- SFC Page: No React.memo on Child Components
**SEVERITY: MEDIUM**

`SfcCalculatorPage.tsx` renders 20+ child components in a 3-column layout. The parent holds ~15 state variables. When ANY state changes, the parent re-renders and every child component receives new props.

**Key concern:** The grep for `React.memo` across all 21 SFC components returned ZERO matches. None of the child components are memoized.

However, the parent page DOES use `useCallback` and `useMemo` extensively (52 total usages across the SFC directory). This mitigates the issue significantly because:
- Callback refs are stable (won't cause children to re-render due to new function refs)
- Computed values like `grouped`, `ranked`, `flatItems` in SmartMaterialSelector are memoized
- `CompatibilityValidator` uses `useMemo` for its validation logic

**Where it still matters:**
1. `AdvancedCharts` -- imports recharts and renders SVG charts. Re-rendering this on every keystroke in ParameterPanel would be expensive. Currently, it only receives `result`, `params`, and `machine` -- `params` changes on every slider/input change, which WILL re-render the charts.
2. `ComparisonView` and `CalculationHistory` -- these render lists. They receive stable callbacks (via `useCallback`) but still re-render when the parent re-renders.
3. `MachineModeTabs` -- large tab bar with 13 modes. Re-rendering on every param change is wasteful.

**Recommendation:**
Wrap these performance-sensitive components in `React.memo`:
- `AdvancedCharts` -- prevents chart re-renders on param changes
- `ComparisonView` -- prevents list re-renders
- `CalculationHistory` -- prevents list re-renders
- `MachineModeTabs` -- prevents tab bar re-renders
- `CompatibilityValidator` -- already uses useMemo internally, but memo would skip the entire render
- `ResultsDisplay` -- output display shouldn't re-render on input changes

With React 19's compiler potentially auto-memoizing, this is less urgent, but the project is not using the React compiler (it uses `@vitejs/plugin-react`, not `babel-plugin-react-compiler`). So manual `React.memo` is still the correct approach.

---

## FINDING 5 -- AdvancedCharts Renders on Every Param Change
**SEVERITY: MEDIUM**

In `SfcCalculatorPage.tsx` line 483:
```tsx
{rightTab === "charts" && <AdvancedCharts result={calc.data} params={params} machine={machine} />}
```

`params` is a state object that changes on every slider/input interaction. This means:
1. User drags a depth-of-cut slider
2. `params` state updates
3. Parent re-renders
4. `AdvancedCharts` receives new `params` prop (even if it only uses `params.tool_diameter`)
5. Recharts re-renders all SVG elements

Inside `AdvancedCharts`, the `SurfaceFinishChart` uses `params.tool_diameter` and `ToolLifeChart` doesn't use params at all -- it only uses `result.cutting_speed`. But since the whole component receives `params`, it re-renders regardless.

**Recommendation:**
1. Wrap `AdvancedCharts` in `React.memo`
2. Pass only the specific props needed: `toolDiameter={params.tool_diameter}` instead of the full `params` object
3. This way, chart re-renders only when `result`, `toolDiameter`, or `machine` actually change

---

## FINDING 6 -- localStorage: Synchronous Reads During Render
**SEVERITY: MEDIUM**

Two patterns cause synchronous localStorage reads during component initialization:

**Pattern A -- `loadComparison()` and `loadFullHistory()` as useState initializers (SfcCalculatorPage.tsx lines 118-119):**
```ts
const [comparison, setComparison] = useState<CalcSnapshot[]>(loadComparison);
const [fullHistory, setFullHistory] = useState<CalcSnapshot[]>(loadFullHistory);
```
These call `JSON.parse(localStorage.getItem(...))` synchronously during the first render. If `fullHistory` has 100 entries (the max), this parses a potentially large JSON blob during mount.

**Pattern B -- `SmartMaterialSelector.tsx` lines 53-54:**
```ts
const [favorites, setFavorites] = useState<string[]>(() => loadIds(FAVORITES_KEY));
const [recents, setRecents] = useState<string[]>(() => loadIds(RECENTS_KEY));
```
These are small arrays (max 10 items) -- negligible.

**Pattern C -- `saveFullHistory` called on every calculation (SfcCalculatorPage.tsx line 259):**
```ts
const updated = [snap, ...fullHistory].slice(0, 100);
setFullHistory(updated);
saveFullHistory(updated);
```
`saveFullHistory` calls `JSON.stringify()` + `localStorage.setItem()` synchronously. With 100 CalcSnapshot entries (each containing a full SfcCalculateResult), this serializes ~50-100 KB of JSON on every calculation.

**Recommendation:**
1. Wrap `saveFullHistory` and `saveComparison` in `requestIdleCallback` or `setTimeout(fn, 0)` to avoid blocking the main thread after a calculation
2. Consider debouncing localStorage writes if users trigger rapid calculations
3. The read-on-mount pattern is acceptable since it only runs once

---

## FINDING 7 -- localStorage: No Size Budgeting or Eviction
**SEVERITY: LOW**

The app uses at least 8 distinct localStorage keys:
- `prism-sfc-comparison` (4 entries max -- good)
- `prism-sfc-full-history` (100 entries max -- bounded, but each entry contains a full result object)
- `prism-sfc-presets` (unbounded!)
- `prism-mat-favorites` (10 max -- good)
- `prism-mat-recents` (10 max -- good)
- `prism-settings` (small object)
- `prism-theme` (string)
- `prism-ppg-state` (PPG editor content -- could be large G-code)
- Auth tokens (3 keys)

**Concern:** `prism-sfc-presets` has no limit in `savePresets()` (line 48 of comparison-types.ts):
```ts
export function savePresets(presets: SfcPreset[]) { saveJson(PRESETS_KEY, presets); }
```
A user who saves many presets could eventually hit the ~5 MB localStorage limit.

**Recommendation:**
1. Add a limit to `savePresets`: `presets.slice(0, 50)` or similar
2. Add a `try/catch` around all `localStorage.setItem` calls (already done in `saveJson` -- good)
3. Consider showing a warning if localStorage usage exceeds 3 MB

---

## FINDING 8 -- Monaco Editor Bundle Size
**SEVERITY: MEDIUM (for PPG page load time)**

`@monaco-editor/react` pulls in the full Monaco editor (~3-5 MB). It is used ONLY on the PPG (Post-Processor Generator) page via `GcodeEditor.tsx` and `GcodeDiff.tsx`.

Because the PPG page is lazy-loaded, Monaco does NOT affect initial load time. However, when a user navigates to `/ppg`, they will experience a significant delay (1-3 seconds on fast connections, longer on slow) as Monaco downloads.

**Recommendation:**
1. Add a dedicated loading skeleton for the PPG page that shows "Loading editor..." while Monaco downloads
2. Consider `prefetch` hints: `<link rel="prefetch" href="/assets/monaco-chunk.js">` on pages that link to PPG
3. If the G-code editor needs are simple (syntax highlighting only, no autocomplete), consider a lighter alternative like CodeMirror 6 (~150 KB vs ~3 MB)

---

## FINDING 9 -- Recharts Bundle in SFC Page
**SEVERITY: LOW (Already Mitigated)**

Recharts is ~500 KB uncompressed but is already isolated in its own manual chunk. It only loads when:
1. User navigates to `/sfc` (lazy page load)
2. The `AdvancedCharts` component renders (it's always rendered on the SFC page, but only shows charts when `result` exists)

**Concern:** `AdvancedCharts` imports recharts at the top level:
```ts
import { LineChart, Line, XAxis, ... } from "recharts";
```
This means the recharts chunk loads as soon as the SFC page loads, even before any calculation is run.

**Recommendation (OPTIONAL):**
If initial SFC page load time is a concern, lazy-load the AdvancedCharts component itself:
```ts
const AdvancedCharts = lazy(() => import("../components/sfc/AdvancedCharts"));
```
This would defer the recharts download until a calculation produces results. However, the manual chunk isolation already makes this a cached asset after first visit, so the benefit is marginal.

---

## FINDING 10 -- No Images, No Custom Fonts (Excellent)
**SEVERITY: N/A (No Issues)**

**Images:** The app uses ZERO image files. The grep for `.png|.jpg|.jpeg|.gif|.webp|.svg|.avif` found only two references -- both are dynamic canvas-to-PNG exports (chart export feature), not static images.

**Favicon:** Inline SVG data URI in index.html -- zero network requests.

**Fonts:** No `@font-face`, no Google Fonts imports, no `fontsource` packages. The app uses system fonts via Tailwind's default `font-sans` stack (`ui-sans-serif, system-ui, -apple-system, ...`).

This is ideal for a manufacturing/industrial app:
- Zero font FOIT/FOUT
- Zero image requests
- Fastest possible First Contentful Paint

**Recommendation:** No action needed. This is excellent.

---

## FINDING 11 -- jspdf Loaded Only on Demand
**SEVERITY: N/A (No Issues)**

`jspdf` (~300 KB) is imported in `web/src/utils/sfcReport.ts` and `web/src/utils/quotePdf.ts`. These are utility files imported by components that trigger PDF generation on button click. Because `jspdf` is in its own manual chunk, it loads when the importing page loads.

However, `sfcReport.ts` is imported directly at the top of `SfcCalculatorPage.tsx`:
```ts
import { generateSfcReport } from "../utils/sfcReport";
```

This means `jspdf` downloads when the SFC page loads, not when the user clicks "Download PDF".

**Recommendation (MINOR):**
Dynamic-import `generateSfcReport` only when the button is clicked:
```ts
const handleDownloadPdf = useCallback(async () => {
  if (!calc.data || !material || !operation) return;
  const { generateSfcReport } = await import("../utils/sfcReport");
  generateSfcReport({ ... });
}, [...]);
```
This saves ~300 KB on initial SFC page load.

---

## FINDING 12 -- `handleAddToComparison` and `handleRemoveFromComparison` Dependency Arrays
**SEVERITY: LOW (Correctness, Not Performance)**

Both callbacks have `comparison` in their dependency arrays:
```ts
const handleAddToComparison = useCallback((entry: CalcSnapshot) => {
  if (comparison.length >= 4) return;
  if (comparison.some((c) => c.id === entry.id)) return;
  const updated = [...comparison, entry];
  setComparison(updated);
  saveComparison(updated);
  setRightTab("compare");
}, [comparison]);  // <-- recreated every time comparison changes
```

This means every time the comparison array changes, all children receiving this callback get a new function reference. Since these children are not wrapped in `React.memo`, this doesn't cause an extra render by itself (they re-render anyway). But if you add `React.memo` to children (per Finding 4), this dependency would undermine it.

**Recommendation:** Use functional setState to eliminate the `comparison` dependency:
```ts
const handleAddToComparison = useCallback((entry: CalcSnapshot) => {
  setComparison((prev) => {
    if (prev.length >= 4) return prev;
    if (prev.some((c) => c.id === entry.id)) return prev;
    const updated = [...prev, entry];
    saveComparison(updated);
    return updated;
  });
  setRightTab("compare");
}, []);  // <-- now stable forever
```
Same pattern for `handleRemoveFromComparison`.

---

## FINDING 13 -- `getOperationById` Uses Linear Search
**SEVERITY: LOW**

```ts
export const ALL_OPERATIONS = OPERATION_CATEGORIES.flatMap((c) => c.operations);

export function getOperationById(id: string): OperationType | undefined {
  return ALL_OPERATIONS.find((o) => o.id === id);
}
```

With ~50 operations, `Array.find` is O(n) but fast enough. Called during mode changes and history reload -- not hot-path.

**Recommendation:** No action needed. Only optimize if the catalog grows to 500+ operations. A `Map<string, OperationType>` would be the fix.

---

## FINDING 14 -- Initial Load Performance Expectations
**SEVERITY: N/A (Assessment)**

For a manufacturing desktop application (Chrome on Windows workstations, typical shop-floor or engineering office):

**Expected initial bundle (eager):**
- React + ReactDOM + React Router: ~45 KB gzipped
- AppShell (sidebar, header, nav): ~10-15 KB gzipped
- Tailwind CSS (purged): ~15-25 KB gzipped
- main.tsx + App.tsx (route definitions): ~3 KB gzipped
- ToastProvider, ErrorBoundary, ThemeToggle: ~3 KB gzipped
- **Total initial: ~80-100 KB gzipped**

**On first page navigation (e.g., /sfc):**
- SfcCalculatorPage + 21 components: ~25-35 KB gzipped
- Data files (materials, tools, machines, etc.): ~21 KB gzipped
- recharts chunk: ~170 KB gzipped
- jspdf chunk: ~90 KB gzipped (could be deferred -- Finding 11)
- **Total SFC page: ~310-320 KB gzipped**

**Total for SFC user:** ~400-420 KB gzipped on first visit. This is well within budget for a desktop manufacturing app. Time to interactive should be under 2 seconds on any reasonable connection.

---

## Summary Table

| # | Finding | Severity | Action |
|---|---------|----------|--------|
| 1 | Code splitting architecture | LOW | No action -- well designed |
| 2 | manualChunks missing Monaco | LOW | Add monaco to manualChunks |
| 3 | Static data files (21 KB total) | LOW | Keep static -- too small to API-fetch |
| 4 | No React.memo on SFC child components | MEDIUM | Add React.memo to 6 key components |
| 5 | AdvancedCharts re-renders on param change | MEDIUM | Memo + pass specific props instead of full params |
| 6 | Synchronous localStorage writes | MEDIUM | Defer saveFullHistory with requestIdleCallback |
| 7 | No preset limit in localStorage | LOW | Add .slice(0, 50) to savePresets |
| 8 | Monaco ~3-5 MB on PPG page | MEDIUM | Add loading skeleton; consider prefetch hints |
| 9 | Recharts loads before first calc | LOW | Optional: lazy-load AdvancedCharts |
| 10 | No images, no custom fonts | N/A | Excellent -- no action |
| 11 | jspdf loads on SFC page mount | LOW-MED | Dynamic import on button click saves ~300 KB |
| 12 | Unstable useCallback deps in comparison handlers | LOW | Use functional setState to stabilize |
| 13 | Linear search in getOperationById | LOW | No action at current scale |
| 14 | Initial load ~400 KB for SFC | N/A | Well within budget for desktop mfg app |

## Priority Action Items (Ordered)

1. **[MEDIUM]** Add `React.memo` to `AdvancedCharts`, `ComparisonView`, `CalculationHistory`, `MachineModeTabs`, `CompatibilityValidator`, `ResultsDisplay`
2. **[MEDIUM]** Refactor AdvancedCharts to accept `toolDiameter` instead of full `params` object
3. **[MEDIUM]** Defer `saveFullHistory` / `saveComparison` writes with `requestIdleCallback`
4. **[LOW-MED]** Dynamic-import `generateSfcReport` (jspdf) on button click instead of page load
5. **[LOW]** Add `monaco: ["@monaco-editor/react"]` to vite manualChunks
6. **[LOW]** Stabilize `handleAddToComparison` / `handleRemoveFromComparison` with functional setState
7. **[LOW]** Add `.slice(0, 50)` limit to `savePresets()`

## Overall Assessment

**The app is well-architected for performance.** The code-splitting strategy is correct, the dependency tree is lean (only 5 runtime deps), there are no images or custom fonts, and static data is appropriately small. The main opportunities are incremental: memoizing SFC child components to reduce unnecessary re-renders, deferring localStorage writes, and lazy-loading jspdf. None of these are blocking issues -- they're polishing moves for a production-ready app.
