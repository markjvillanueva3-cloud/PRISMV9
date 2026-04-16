/**
 * ShopDataCompletenessEngine tests — INGEST-MS6 / U-SHOP01
 *
 * Tests domain completeness scoring, gap analysis,
 * recommendations, and status calculation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all dependent engines to isolate completeness logic
vi.mock("../engines/ShopConfigurationEngine.js", () => ({
  shopConfigurationEngine: {
    getMachines: vi.fn(() => Array.from({ length: 21 }, (_, i) => ({ id: `M-${i}` }))),
  },
}));

vi.mock("../data/jm-die-profile.js", () => ({
  JM_DIE_CONTROLLER_MAP: Array.from({ length: 15 }, (_, i) => ({
    machine_id: `M-${i}`,
    controller_model: `OSP-${i}`,
  })),
}));

vi.mock("../engines/EmployeeEngine.js", () => ({
  employeeEngine: {
    list: vi.fn(() => []),
  },
}));

vi.mock("../engines/ToolHolderCatalogEngine.js", () => ({
  toolHolderCatalogEngine: {
    list: vi.fn(() => []),
  },
}));

vi.mock("../engines/ShopToolLibraryEngine.js", () => ({
  shopToolLibraryEngine: {
    getSummary: vi.fn(() => ({ totalTools: 0, byCategory: {}, categories: [] })),
  },
}));

vi.mock("../engines/MaterialStockEngine.js", () => ({
  materialStockEngine: {
    list: vi.fn(() => []),
  },
}));

vi.mock("../engines/PrintLibraryEngine.js", () => ({
  printLibraryEngine: {
    list: vi.fn(() => []),
  },
}));

vi.mock("../engines/FolderScannerEngine.js", () => ({
  folderScannerEngine: {
    getSummary: vi.fn(() => ({ roots_tracked: 0, total_files_tracked: 0, roots: [] })),
  },
}));

describe("ShopDataCompletenessEngine", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset all mock implementations to defaults
    const { employeeEngine } = await import("../engines/EmployeeEngine.js");
    const { toolHolderCatalogEngine } = await import("../engines/ToolHolderCatalogEngine.js");
    const { shopToolLibraryEngine } = await import("../engines/ShopToolLibraryEngine.js");
    const { materialStockEngine } = await import("../engines/MaterialStockEngine.js");
    const { printLibraryEngine } = await import("../engines/PrintLibraryEngine.js");
    const { folderScannerEngine } = await import("../engines/FolderScannerEngine.js");
    vi.mocked(employeeEngine.list).mockReturnValue([]);
    vi.mocked(toolHolderCatalogEngine.list).mockReturnValue([]);
    vi.mocked(shopToolLibraryEngine.getSummary).mockReturnValue({ totalTools: 0, byCategory: {}, categories: [] });
    vi.mocked(materialStockEngine.list).mockReturnValue([]);
    vi.mocked(printLibraryEngine.list).mockReturnValue([]);
    vi.mocked(folderScannerEngine.getSummary).mockReturnValue({ roots_tracked: 0, total_files_tracked: 0, roots: [] });
  });

  // ── calculateCompleteness ────────────────────────────────────────────

  describe("calculateCompleteness", () => {
    it("returns report with all 8 domains", async () => {
      const { shopDataCompletenessEngine } = await import("../engines/ShopDataCompletenessEngine.js");
      const report = await shopDataCompletenessEngine.calculateCompleteness();
      expect(report.domains).toHaveLength(8);
      const domainIds = report.domains.map(d => d.domain);
      expect(domainIds).toContain("programs");
      expect(domainIds).toContain("employee_database");
      expect(domainIds).toContain("machines");
      expect(domainIds).toContain("controllers");
      expect(domainIds).toContain("tool_holders");
      expect(domainIds).toContain("tooling");
      expect(domainIds).toContain("materials");
      expect(domainIds).toContain("prints");
    });

    it("scores auto-seeded domains (machines, controllers) as populated", async () => {
      const { shopDataCompletenessEngine } = await import("../engines/ShopDataCompletenessEngine.js");
      const report = await shopDataCompletenessEngine.calculateCompleteness();
      const machines = report.domains.find(d => d.domain === "machines")!;
      expect(machines.count).toBe(21);
      expect(machines.percentage).toBe(100);
      expect(machines.status).toBe("complete");

      const controllers = report.domains.find(d => d.domain === "controllers")!;
      expect(controllers.count).toBe(15);
      expect(controllers.percentage).toBe(100);
      expect(controllers.status).toBe("complete");
    });

    it("scores empty domains as 0%", async () => {
      const { shopDataCompletenessEngine } = await import("../engines/ShopDataCompletenessEngine.js");
      const report = await shopDataCompletenessEngine.calculateCompleteness();
      const employees = report.domains.find(d => d.domain === "employee_database")!;
      expect(employees.count).toBe(0);
      expect(employees.percentage).toBe(0);
      expect(employees.status).toBe("empty");
    });

    it("reports correct overall status with partial data", async () => {
      const { shopDataCompletenessEngine } = await import("../engines/ShopDataCompletenessEngine.js");
      // Machines (21) and controllers (15) are populated, rest empty
      // Machines: 21/15 = 100%, weight 1.5 → 150
      // Controllers: 15/10 = 100%, weight 1.0 → 100
      // All others: 0%, various weights
      // Total weight: 1.5+1.0+1.5+1.0+1.0+1.0+1.0+1.0 = 9.0
      // Weighted sum: 150 + 100 = 250
      // Overall: 250/9 ≈ 28%
      const report = await shopDataCompletenessEngine.calculateCompleteness();
      expect(report.overall_percentage).toBeGreaterThan(20);
      expect(report.overall_percentage).toBeLessThan(35);
      expect(report.overall_status).toBe("partially_populated");
    });

    it("lists empty domains", async () => {
      const { shopDataCompletenessEngine } = await import("../engines/ShopDataCompletenessEngine.js");
      const report = await shopDataCompletenessEngine.calculateCompleteness();
      expect(report.empty_domains.length).toBeGreaterThan(0);
      expect(report.empty_domains).toContain("Employees");
      expect(report.empty_domains).not.toContain("Machines");
    });

    it("includes a generated_at timestamp", async () => {
      const { shopDataCompletenessEngine } = await import("../engines/ShopDataCompletenessEngine.js");
      const report = await shopDataCompletenessEngine.calculateCompleteness();
      expect(report.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("includes total_items and total_baseline", async () => {
      const { shopDataCompletenessEngine } = await import("../engines/ShopDataCompletenessEngine.js");
      const report = await shopDataCompletenessEngine.calculateCompleteness();
      expect(report.total_items).toBeGreaterThanOrEqual(36); // 21 machines + 15 controllers
      expect(report.total_baseline).toBeGreaterThan(0);
    });

    it("caps percentage at 100%", async () => {
      const { shopDataCompletenessEngine } = await import("../engines/ShopDataCompletenessEngine.js");
      const report = await shopDataCompletenessEngine.calculateCompleteness();
      // Machines: 21/15 would be 140% uncapped
      const machines = report.domains.find(d => d.domain === "machines")!;
      expect(machines.percentage).toBe(100);
    });
  });

  // ── Partially populated scenarios ──────────────────────────────────

  describe("partial population", () => {
    it("scores partial domains correctly", async () => {
      const { employeeEngine } = await import("../engines/EmployeeEngine.js");
      vi.mocked(employeeEngine.list).mockReturnValue(
        Array.from({ length: 5 }, (_, i) => ({ id: `E-${i}` })) as any
      );

      const { shopDataCompletenessEngine } = await import("../engines/ShopDataCompletenessEngine.js");
      const report = await shopDataCompletenessEngine.calculateCompleteness();
      const emp = report.domains.find(d => d.domain === "employee_database")!;
      expect(emp.count).toBe(5);
      expect(emp.percentage).toBe(50);
      expect(emp.status).toBe("seeded");
    });

    it("well_populated when most domains have data", async () => {
      const { employeeEngine } = await import("../engines/EmployeeEngine.js");
      const { toolHolderCatalogEngine } = await import("../engines/ToolHolderCatalogEngine.js");
      const { shopToolLibraryEngine } = await import("../engines/ShopToolLibraryEngine.js");
      const { materialStockEngine } = await import("../engines/MaterialStockEngine.js");
      const { printLibraryEngine } = await import("../engines/PrintLibraryEngine.js");
      const { folderScannerEngine } = await import("../engines/FolderScannerEngine.js");

      vi.mocked(employeeEngine.list).mockReturnValue(Array(7) as any);
      vi.mocked(toolHolderCatalogEngine.list).mockReturnValue(Array(12) as any);
      vi.mocked(shopToolLibraryEngine.getSummary).mockReturnValue({ totalTools: 30, byCategory: {}, categories: [] });
      vi.mocked(materialStockEngine.list).mockReturnValue(Array(5) as any);
      vi.mocked(printLibraryEngine.list).mockReturnValue(Array(25) as any);
      vi.mocked(folderScannerEngine.getSummary).mockReturnValue({ roots_tracked: 1, total_files_tracked: 60, roots: [] });

      const { shopDataCompletenessEngine } = await import("../engines/ShopDataCompletenessEngine.js");
      const report = await shopDataCompletenessEngine.calculateCompleteness();
      expect(report.overall_percentage).toBeGreaterThanOrEqual(60);
      expect(report.overall_status).toBe("well_populated");
    });
  });

  // ── Gap analysis ────────────────────────────────────────────────────

  describe("gap analysis", () => {
    it("describes gaps for empty domains", async () => {
      const { shopDataCompletenessEngine } = await import("../engines/ShopDataCompletenessEngine.js");
      const report = await shopDataCompletenessEngine.calculateCompleteness();
      const emp = report.domains.find(d => d.domain === "employee_database")!;
      expect(emp.gap).toContain("No employees");
    });

    it("describes gaps for complete domains", async () => {
      const { shopDataCompletenessEngine } = await import("../engines/ShopDataCompletenessEngine.js");
      const report = await shopDataCompletenessEngine.calculateCompleteness();
      const machines = report.domains.find(d => d.domain === "machines")!;
      expect(machines.gap).toContain("Fully populated");
    });

    it("describes gaps for partial domains", async () => {
      const { materialStockEngine } = await import("../engines/MaterialStockEngine.js");
      vi.mocked(materialStockEngine.list).mockReturnValue(Array(3) as any);

      const { shopDataCompletenessEngine } = await import("../engines/ShopDataCompletenessEngine.js");
      const report = await shopDataCompletenessEngine.calculateCompleteness();
      const mat = report.domains.find(d => d.domain === "materials")!;
      expect(mat.gap).toContain("3/8 loaded");
    });
  });

  // ── Recommendations ─────────────────────────────────────────────────

  describe("recommendations", () => {
    it("returns top 3 recommendations", async () => {
      const { shopDataCompletenessEngine } = await import("../engines/ShopDataCompletenessEngine.js");
      const report = await shopDataCompletenessEngine.calculateCompleteness();
      expect(report.recommendations.length).toBeLessThanOrEqual(3);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it("prioritizes lowest-scoring domains", async () => {
      const { shopDataCompletenessEngine } = await import("../engines/ShopDataCompletenessEngine.js");
      const report = await shopDataCompletenessEngine.calculateCompleteness();
      // All 0% domains should be recommended first (not machines/controllers which are 100%)
      for (const rec of report.recommendations) {
        expect(rec).not.toContain("Machines: complete");
        expect(rec).not.toContain("Controllers: complete");
      }
    });
  });

  // ── getDomainGaps ───────────────────────────────────────────────────

  describe("getDomainGaps", () => {
    it("returns gap info for a specific domain", async () => {
      const { shopDataCompletenessEngine } = await import("../engines/ShopDataCompletenessEngine.js");
      const gap = await shopDataCompletenessEngine.getDomainGaps("materials");
      expect(gap.domain).toBe("materials");
      expect(gap.label).toBe("Material Stock");
    });

    it("throws for unknown domain", async () => {
      const { shopDataCompletenessEngine } = await import("../engines/ShopDataCompletenessEngine.js");
      await expect(shopDataCompletenessEngine.getDomainGaps("unknown" as any)).rejects.toThrow(/Unknown domain/);
    });
  });

  // ── getRecommendations ──────────────────────────────────────────────

  describe("getRecommendations", () => {
    it("returns actionable recommendations", async () => {
      const { shopDataCompletenessEngine } = await import("../engines/ShopDataCompletenessEngine.js");
      const recs = await shopDataCompletenessEngine.getRecommendations();
      expect(recs.length).toBeGreaterThan(0);
      for (const rec of recs) {
        expect(typeof rec).toBe("string");
        expect(rec.length).toBeGreaterThan(10);
      }
    });
  });

  // ── Engine failure resilience ───────────────────────────────────────

  describe("engine failure resilience", () => {
    it("handles missing engines gracefully", async () => {
      // Override a mock to throw
      vi.doMock("../engines/PrintLibraryEngine.js", () => {
        throw new Error("Module not found");
      });

      const { shopDataCompletenessEngine } = await import("../engines/ShopDataCompletenessEngine.js");
      // Should not throw — gracefully returns 0 for unavailable engines
      const report = await shopDataCompletenessEngine.calculateCompleteness();
      expect(report.domains).toHaveLength(8);
    });
  });
});
