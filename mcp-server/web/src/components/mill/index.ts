/**
 * Mill calculator-page studio panels — barrel re-exports
 * ========================================================
 * MILL-STUDIO-MS0/U-MSTUD-A1 (oscar, 2026-05-23): make the 3 mill
 * stub panels reachable as `lazyNamed` imports from CalculatorPage
 * (peer Lathe + WireEDM panels use the same lazyNamed pattern, see
 * CalculatorPage.tsx L206-228 and L242+).
 *
 * Strict barrel — re-export only. Consumers import as:
 *   const MillStrategyPanel = lazyNamed(
 *     () => import('../components/mill'),
 *     'StrategyPanel',
 *   );
 *
 * Phase-A wiring of these into CalculatorPage's mill-mode JSX is
 * the next step (U-MSTUD-A1 continues — this barrel unblocks it
 * without forcing a 656K-monolith edit in the same atomic commit
 * that establishes the import surface).
 *
 * @module components/mill
 */
export { StrategyPanel, type MillingStrategy } from "./StrategyPanel.js";
export { ProgramPreview } from "./ProgramPreview.js";
export { SimPanel } from "./SimPanel.js";

// Default-export aliases preserved so callers using `default import` from the
// underlying files (legacy pattern) keep working; new callers should prefer
// the named exports above for lazyNamed compatibility.
export { default as StrategyPanelDefault } from "./StrategyPanel.js";
export { default as ProgramPreviewDefault } from "./ProgramPreview.js";
export { default as SimPanelDefault } from "./SimPanel.js";
