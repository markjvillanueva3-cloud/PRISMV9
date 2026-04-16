import { describe, expect, it, vi } from "vitest";

vi.mock("../utils/Logger.js", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import { machineRegistry } from "../registries/MachineRegistry.js";
import { materialRegistry } from "../registries/MaterialRegistry.js";
import { toolRegistry } from "../registries/ToolRegistry.js";
import { getCalculatorToolHolderCatalog } from "../utils/calculatorToolHolderCatalog.js";
import { getCalculatorWorkholdingCatalog } from "../utils/calculatorWorkholdingCatalog.js";

describe("calculator live catalog audit", () => {
  it("keeps the live machine registry above the full H-drive calculator coverage floor", async () => {
    await machineRegistry.load();

    const result = machineRegistry.search({ limit: 5000, offset: 0 });

    expect(result.total).toBeGreaterThanOrEqual(1000);
    expect(result.machines.length).toBe(result.total);
    expect(result.machines.some((machine) => /haas/i.test(String(machine.manufacturer ?? "")))).toBe(true);
    expect(result.machines.some((machine) => /okuma/i.test(String(machine.manufacturer ?? "")))).toBe(true);
    expect(result.machines.some((machine) => /mazak/i.test(String(machine.manufacturer ?? "")))).toBe(true);
  });

  it("keeps the live material registry rooted in the H-drive material corpus", async () => {
    const result = await materialRegistry.search({ query: "", limit: 10000, offset: 0 });

    expect(result.total).toBeGreaterThanOrEqual(3500);
    expect(result.materials.length).toBe(result.total);
    expect(result.materials.some((material) => /stainless/i.test(String(material.name ?? material.type ?? "")))).toBe(true);
    expect(result.materials.some((material) => /aluminum|aluminium/i.test(String(material.name ?? material.type ?? "")))).toBe(true);
    expect(result.materials.some((material) => /tool steel|h13|a2|d2/i.test(String(material.name ?? material.type ?? "")))).toBe(true);
  });

  it("keeps the live tooling registry on the large tool corpus instead of a curated subset", async () => {
    await toolRegistry.load();

    const result = toolRegistry.search({ query: "*", limit: 20000, offset: 0 });

    expect(result.total).toBeGreaterThanOrEqual(13000);
    expect(result.tools.length).toBe(result.total);
    expect(result.tools.some((tool) => /endmill|end mill/i.test(String(tool.type ?? tool.category ?? "")))).toBe(true);
    expect(result.tools.some((tool) => /drill/i.test(String(tool.type ?? tool.category ?? "")))).toBe(true);
    expect(result.tools.some((tool) => /turn|insert/i.test(String(tool.type ?? tool.category ?? tool.subcategory ?? "")))).toBe(true);
  });

  it("keeps tool holder catalog loading from the full H-drive holder sources", () => {
    const millHolders = getCalculatorToolHolderCatalog({
      mode: "mill",
      spindleConnectionTypeId: "bt40",
      layoutKind: "magazine",
      limit: 5000,
    });
    const latheHolders = getCalculatorToolHolderCatalog({
      mode: "lathe",
      turretTypeId: "capto-c6",
      layoutKind: "turret",
      hasMillingHead: true,
      liveTooling: true,
      limit: 5000,
    });

    expect(millHolders.length).toBeGreaterThanOrEqual(900);
    expect(latheHolders.length).toBeGreaterThanOrEqual(40);
    expect(millHolders.some((holder) => /bt40|cat40|hsk/i.test(`${String(holder.id ?? "")} ${String(holder.label ?? "")}`))).toBe(true);
    expect(latheHolders.some((holder) => /capto|vdi|bmt/i.test(`${String(holder.id ?? "")} ${String(holder.label ?? "")}`))).toBe(true);
  });

  it("keeps mill and lathe workholding on live or hybrid H-drive-backed sources", () => {
    const millCatalog = getCalculatorWorkholdingCatalog("mill");
    const latheCatalog = getCalculatorWorkholdingCatalog("lathe");

    expect(["database", "hybrid"]).toContain(millCatalog.source);
    expect(["database", "hybrid"]).toContain(latheCatalog.source);
    expect(millCatalog.liveCount).toBeGreaterThan(0);
    expect(latheCatalog.liveCount).toBeGreaterThan(0);
    expect(millCatalog.presetOptions.some((preset) => /vise|vacuum|fixture|pallet|chuck/i.test(preset.label))).toBe(true);
    expect(latheCatalog.presetOptions.some((preset) => /chuck|collet/i.test(preset.label))).toBe(true);
    expect(millCatalog.presetOptions.some((preset) => preset.id === "schunk-kontec-ks")).toBe(true);
    expect(millCatalog.presetOptions.some((preset) => preset.id === "lang-makro-grip")).toBe(true);
    expect(millCatalog.brandOptions.some((brand) => brand.id === "lang-technik")).toBe(true);
    expect(latheCatalog.presetOptions.some((preset) => preset.id === "prism-fixture-collet")).toBe(true);
  });
});
