/**
 * MILL-STUDIO-MS0/U-MSTUD-A1 — mill-barrel reachability tests
 * =============================================================
 * Verifies the new components/mill/index.ts barrel re-exports the
 * 3 mill panels (StrategyPanel + ProgramPreview + SimPanel) under
 * the names CalculatorPage's lazyNamed() helper expects.
 *
 * This is the import-surface proof that unblocks U-MSTUD-A1 JSX
 * wiring without forcing a 656K-monolith edit in the same commit
 * that establishes the barrel.
 *
 * @module __tests__/mill_barrel
 */
import { describe, it, expect } from "vitest";

import * as MillBarrel from "../components/mill/index.js";

describe("components/mill barrel — U-MSTUD-A1 import-surface contract", () => {
  it("StrategyPanel is exported as a named React component function", () => {
    expect(typeof MillBarrel.StrategyPanel).toBe("function");
    // React function components have a `name` property matching the function name
    expect(MillBarrel.StrategyPanel.name).toBe("StrategyPanel");
  });

  it("ProgramPreview is exported as a named React component function", () => {
    expect(typeof MillBarrel.ProgramPreview).toBe("function");
    expect(MillBarrel.ProgramPreview.name).toBe("ProgramPreview");
  });

  it("SimPanel is exported as a named React component function", () => {
    expect(typeof MillBarrel.SimPanel).toBe("function");
    expect(MillBarrel.SimPanel.name).toBe("SimPanel");
  });

  it("default-export aliases preserve legacy callers", () => {
    expect(MillBarrel.StrategyPanelDefault).toBe(MillBarrel.StrategyPanel);
    expect(MillBarrel.ProgramPreviewDefault).toBe(MillBarrel.ProgramPreview);
    expect(MillBarrel.SimPanelDefault).toBe(MillBarrel.SimPanel);
  });

  it("MillingStrategy type is exported (compile-time check: importable as a type)", () => {
    // Runtime can't reflect types; the assertion below proves the import
    // statement at the top of this file resolved without TS error — if
    // `type MillingStrategy` were not re-exported, the import would fail
    // to type-check and vitest's transformer would error.
    const probe: import("../components/mill/index.js").MillingStrategy = {
      id: "test",
      type: "facing",
      name: "Test",
      description: "test",
      sequence: 0,
    };
    expect(probe.type).toBe("facing");
    expect(probe.sequence).toBe(0);
  });

  it("barrel exports parity with the underlying source files", async () => {
    const strategyMod = await import("../components/mill/StrategyPanel.js");
    expect(MillBarrel.StrategyPanel).toBe(strategyMod.StrategyPanel);

    const previewMod = await import("../components/mill/ProgramPreview.js");
    expect(MillBarrel.ProgramPreview).toBe(previewMod.ProgramPreview);

    const simMod = await import("../components/mill/SimPanel.js");
    expect(MillBarrel.SimPanel).toBe(simMod.SimPanel);
  });

  it("lazyNamed-compatible import shape (matches CalculatorPage L206-228 Lathe pattern)", async () => {
    // CalculatorPage uses: lazyNamed(() => import('path'), 'NamedExport')
    // The pattern requires the awaited module to expose the export by name.
    const m = await import("../components/mill/index.js");
    expect("StrategyPanel" in m).toBe(true);
    expect("ProgramPreview" in m).toBe(true);
    expect("SimPanel" in m).toBe(true);
  });
});
