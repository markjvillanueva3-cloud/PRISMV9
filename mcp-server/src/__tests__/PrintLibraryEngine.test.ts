/**
 * PrintLibraryEngine tests — INGEST-MS3
 *
 * Tests print ingestion, title block extraction, revision management,
 * search, customer analysis, part linking, and stats.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { printLibraryEngine } from "../engines/PrintLibraryEngine.js";

// Reset engine state between tests via private field
function resetEngine(): void {
  (printLibraryEngine as any).prints = new Map();
  (printLibraryEngine as any).nextId = 1;
}

describe("PrintLibraryEngine", () => {
  beforeEach(() => {
    resetEngine();
  });

  // ── INGEST ──────────────────────────────────────────────────────────

  describe("ingest", () => {
    it("ingests a print with provided title block data", () => {
      const result = printLibraryEngine.ingest({
        filename: "DIE-INSERT-2345.pdf",
        file_path: "H:/PRISM/JM DIE/ITW SHAKEPROOF/DIE-INSERT-2345.pdf",
        title_block: {
          part_number: "DI-2345",
          revision: "B",
          material: "D2 Tool Steel",
          customer: "ITW Shakeproof",
          drawn_by: "MV",
          date: "2025-01-15",
        },
        customer: "ITW Shakeproof",
        tags: ["die", "insert"],
      });

      expect(result.print.id).toMatch(/^PRT-/);
      expect(result.print.part_number).toBe("DI-2345");
      expect(result.print.revision).toBe("B");
      expect(result.print.material).toBe("D2 Tool Steel");
      expect(result.print.customer).toBe("ITW Shakeproof");
      expect(result.print.format).toBe("pdf");
      expect(result.print.status).toBe("active");
      expect(result.extraction.confidence).toBe(0.95);
      expect(result.is_new_revision).toBe(false);
    });

    it("infers format from file extension", () => {
      const r1 = printLibraryEngine.ingest({
        filename: "part.tiff",
        file_path: "/prints/part.tiff",
      });
      expect(r1.print.format).toBe("tiff");

      const r2 = printLibraryEngine.ingest({
        filename: "drawing.dxf",
        file_path: "/prints/drawing.dxf",
      });
      expect(r2.print.format).toBe("dxf");
    });

    it("infers part number from filename when no title block", () => {
      const result = printLibraryEngine.ingest({
        filename: "Die Insert 5678.pdf",
        file_path: "/prints/Alcoa/Die Insert 5678.pdf",
      });

      expect(result.print.part_number).toBe("DIE-INSERT-5678");
      expect(result.extraction.confidence).toBe(0.6); // lower without explicit data
    });

    it("infers revision from filename pattern", () => {
      const r1 = printLibraryEngine.ingest({
        filename: "Part_RevC.pdf",
        file_path: "/prints/Part_RevC.pdf",
      });
      expect(r1.print.revision).toBe("C");

      const r2 = printLibraryEngine.ingest({
        filename: "Widget-R2.pdf",
        file_path: "/prints/Widget-R2.pdf",
      });
      expect(r2.print.revision).toBe("2");
    });

    it("infers customer from parent directory", () => {
      const result = printLibraryEngine.ingest({
        filename: "hex-die.pdf",
        file_path: "H:/PRISM/JM DIE/Holo-Krome/hex-die.pdf",
      });
      expect(result.print.customer).toBe("Holo-Krome");
    });

    it("assigns unique IDs", () => {
      const r1 = printLibraryEngine.ingest({ filename: "a.pdf", file_path: "/a.pdf" });
      const r2 = printLibraryEngine.ingest({ filename: "b.pdf", file_path: "/b.pdf" });
      expect(r1.print.id).not.toBe(r2.print.id);
    });
  });

  // ── REVISION MANAGEMENT ─────────────────────────────────────────────

  describe("revision management", () => {
    it("supersedes older revision when new one is ingested", () => {
      const r1 = printLibraryEngine.ingest({
        filename: "part.pdf",
        file_path: "/prints/part.pdf",
        title_block: { part_number: "PN-001", revision: "A" },
      });

      const r2 = printLibraryEngine.ingest({
        filename: "part-revB.pdf",
        file_path: "/prints/part-revB.pdf",
        title_block: { part_number: "PN-001", revision: "B" },
      });

      expect(r2.is_new_revision).toBe(true);
      expect(r2.superseded_print_id).toBe(r1.print.id);

      // Old print should be superseded
      const old = printLibraryEngine.get(r1.print.id);
      expect(old!.status).toBe("superseded");

      // New print should be active
      const curr = printLibraryEngine.get(r2.print.id);
      expect(curr!.status).toBe("active");
    });

    it("does not supersede when same revision is re-ingested", () => {
      printLibraryEngine.ingest({
        filename: "part.pdf",
        file_path: "/prints/part.pdf",
        title_block: { part_number: "PN-002", revision: "A" },
      });

      const r2 = printLibraryEngine.ingest({
        filename: "part-copy.pdf",
        file_path: "/prints/part-copy.pdf",
        title_block: { part_number: "PN-002", revision: "A" },
      });

      expect(r2.is_new_revision).toBe(false);
      expect(r2.superseded_print_id).toBeNull();
    });

    it("returns full revision history", () => {
      printLibraryEngine.ingest({
        filename: "part.pdf",
        file_path: "/prints/part.pdf",
        title_block: { part_number: "PN-003", revision: "A" },
      });
      printLibraryEngine.ingest({
        filename: "part-revB.pdf",
        file_path: "/prints/part-revB.pdf",
        title_block: { part_number: "PN-003", revision: "B" },
      });
      printLibraryEngine.ingest({
        filename: "part-revC.pdf",
        file_path: "/prints/part-revC.pdf",
        title_block: { part_number: "PN-003", revision: "C" },
      });

      const history = printLibraryEngine.getRevisionHistory("PN-003");
      expect(history).not.toBeNull();
      expect(history!.total_revisions).toBe(3);
      expect(history!.current_revision).toBe("C");
      expect(history!.revisions).toHaveLength(3);
    });

    it("returns null for unknown part number", () => {
      expect(printLibraryEngine.getRevisionHistory("UNKNOWN")).toBeNull();
    });
  });

  // ── GET / FIND ──────────────────────────────────────────────────────

  describe("get / find", () => {
    it("gets a print by ID", () => {
      const { print } = printLibraryEngine.ingest({
        filename: "test.pdf",
        file_path: "/test.pdf",
        title_block: { part_number: "GET-TEST" },
      });

      const found = printLibraryEngine.get(print.id);
      expect(found).not.toBeNull();
      expect(found!.part_number).toBe("GET-TEST");
    });

    it("returns null for unknown ID", () => {
      expect(printLibraryEngine.get("PRT-99999")).toBeNull();
    });

    it("finds prints by part number", () => {
      printLibraryEngine.ingest({
        filename: "a.pdf", file_path: "/a.pdf",
        title_block: { part_number: "FIND-ME" },
      });
      printLibraryEngine.ingest({
        filename: "b.pdf", file_path: "/b.pdf",
        title_block: { part_number: "OTHER" },
      });

      const results = printLibraryEngine.findByPartNumber("FIND-ME");
      expect(results).toHaveLength(1);
      expect(results[0].part_number).toBe("FIND-ME");
    });

    it("part number search is case-insensitive", () => {
      printLibraryEngine.ingest({
        filename: "a.pdf", file_path: "/a.pdf",
        title_block: { part_number: "ABC-123" },
      });

      expect(printLibraryEngine.findByPartNumber("abc-123")).toHaveLength(1);
    });
  });

  // ── SEARCH ──────────────────────────────────────────────────────────

  describe("search", () => {
    beforeEach(() => {
      printLibraryEngine.ingest({
        filename: "hex-die.pdf", file_path: "/prints/ITW/hex-die.pdf",
        title_block: { part_number: "HD-100", material: "D2 Tool Steel", customer: "ITW Shakeproof" },
        tags: ["die", "hex"],
      });
      printLibraryEngine.ingest({
        filename: "punch.dxf", file_path: "/prints/Alcoa/punch.dxf",
        title_block: { part_number: "PN-200", material: "M2 HSS", customer: "Alcoa Fastening" },
      });
      printLibraryEngine.ingest({
        filename: "insert.pdf", file_path: "/prints/SFS/insert.pdf",
        title_block: { part_number: "IN-300", material: "Carbide", customer: "SFS Group" },
      });
    });

    it("searches by query across multiple fields", () => {
      const results = printLibraryEngine.search({ query: "hex" });
      expect(results).toHaveLength(1);
      expect(results[0].part_number).toBe("HD-100");
    });

    it("searches by part number", () => {
      const results = printLibraryEngine.search({ part_number: "PN-200" });
      expect(results).toHaveLength(1);
    });

    it("searches by customer", () => {
      const results = printLibraryEngine.search({ customer: "ITW" });
      expect(results).toHaveLength(1);
      expect(results[0].customer).toBe("ITW Shakeproof");
    });

    it("searches by material", () => {
      const results = printLibraryEngine.search({ material: "carbide" });
      expect(results).toHaveLength(1);
    });

    it("filters by format", () => {
      const results = printLibraryEngine.search({ format: "dxf" });
      expect(results).toHaveLength(1);
      expect(results[0].format).toBe("dxf");
    });

    it("respects limit", () => {
      const results = printLibraryEngine.search({ limit: 2 });
      expect(results).toHaveLength(2);
    });

    it("searches by query matching tags", () => {
      const results = printLibraryEngine.search({ query: "die" });
      expect(results.some(p => p.part_number === "HD-100")).toBe(true);
    });
  });

  // ── LINKING ─────────────────────────────────────────────────────────

  describe("linking", () => {
    it("links a print to a part ID", () => {
      const { print } = printLibraryEngine.ingest({
        filename: "a.pdf", file_path: "/a.pdf",
        title_block: { part_number: "LINK-TEST" },
      });

      const linked = printLibraryEngine.linkToPart(print.id, "PART-001");
      expect(linked.part_id).toBe("PART-001");
    });

    it("throws for unknown print ID", () => {
      expect(() => printLibraryEngine.linkToPart("PRT-99999", "PART-001"))
        .toThrow(/not found/);
    });

    it("retrieves prints by part ID", () => {
      const { print } = printLibraryEngine.ingest({
        filename: "a.pdf", file_path: "/a.pdf",
        title_block: { part_number: "BY-PART" },
      });
      printLibraryEngine.linkToPart(print.id, "PART-ABC");

      const results = printLibraryEngine.getByPartId("PART-ABC");
      expect(results).toHaveLength(1);
      expect(results[0].part_number).toBe("BY-PART");
    });
  });

  // ── CUSTOMER ANALYSIS ───────────────────────────────────────────────

  describe("customer analysis", () => {
    beforeEach(() => {
      printLibraryEngine.ingest({
        filename: "a.pdf", file_path: "/a.pdf",
        title_block: { part_number: "C1-A", customer: "ITW Shakeproof" },
      });
      printLibraryEngine.ingest({
        filename: "b.pdf", file_path: "/b.pdf",
        title_block: { part_number: "C1-B", customer: "ITW Shakeproof" },
      });
      printLibraryEngine.ingest({
        filename: "c.pdf", file_path: "/c.pdf",
        title_block: { part_number: "C2-A", customer: "Alcoa" },
      });
    });

    it("gets prints by customer", () => {
      const results = printLibraryEngine.getByCustomer("ITW");
      expect(results).toHaveLength(2);
    });

    it("lists customers with counts sorted by count", () => {
      const customers = printLibraryEngine.listCustomers();
      expect(customers[0].customer).toBe("ITW Shakeproof");
      expect(customers[0].count).toBe(2);
      expect(customers[1].customer).toBe("Alcoa");
      expect(customers[1].count).toBe(1);
    });
  });

  // ── UPDATE ──────────────────────────────────────────────────────────

  describe("update", () => {
    it("updates print tags and notes", () => {
      const { print } = printLibraryEngine.ingest({
        filename: "a.pdf", file_path: "/a.pdf",
        title_block: { part_number: "UPD-TEST" },
      });

      const updated = printLibraryEngine.update(print.id, {
        tags: ["urgent", "rework"],
        notes: "Updated per customer request",
      });

      expect(updated.tags).toContain("urgent");
      expect(updated.notes).toBe("Updated per customer request");
    });

    it("updates print status to obsolete", () => {
      const { print } = printLibraryEngine.ingest({
        filename: "a.pdf", file_path: "/a.pdf",
        title_block: { part_number: "OBS-TEST" },
      });

      const updated = printLibraryEngine.update(print.id, { status: "obsolete" });
      expect(updated.status).toBe("obsolete");
    });

    it("throws for unknown print", () => {
      expect(() => printLibraryEngine.update("PRT-99999", {}))
        .toThrow(/not found/);
    });
  });

  // ── STATS ───────────────────────────────────────────────────────────

  describe("stats", () => {
    it("returns aggregate statistics", () => {
      printLibraryEngine.ingest({
        filename: "a.pdf", file_path: "/a.pdf",
        title_block: { part_number: "ST-1", material: "D2", customer: "ITW" },
      });
      printLibraryEngine.ingest({
        filename: "b.dxf", file_path: "/b.dxf",
        title_block: { part_number: "ST-2", material: "D2", customer: "ITW" },
      });
      printLibraryEngine.ingest({
        filename: "c.pdf", file_path: "/c.pdf",
        title_block: { part_number: "ST-3", material: "M2", customer: "Alcoa" },
      });

      const stats = printLibraryEngine.getStats();
      expect(stats.total_prints).toBe(3);
      expect(stats.active).toBe(3);
      expect(stats.unique_part_numbers).toBe(3);
      expect(stats.by_customer["ITW"]).toBe(2);
      expect(stats.by_format["pdf"]).toBe(2);
      expect(stats.by_format["dxf"]).toBe(1);
      expect(stats.by_material["D2"]).toBe(2);
      expect(stats.avg_ocr_confidence).toBeGreaterThan(0);
    });
  });

  // ── LIST ────────────────────────────────────────────────────────────

  describe("list", () => {
    it("lists all prints", () => {
      printLibraryEngine.ingest({ filename: "a.pdf", file_path: "/a.pdf" });
      printLibraryEngine.ingest({ filename: "b.pdf", file_path: "/b.pdf" });
      expect(printLibraryEngine.list()).toHaveLength(2);
    });

    it("filters by status", () => {
      printLibraryEngine.ingest({
        filename: "a.pdf", file_path: "/a.pdf",
        title_block: { part_number: "FILT-A", revision: "A" },
      });
      printLibraryEngine.ingest({
        filename: "b.pdf", file_path: "/b.pdf",
        title_block: { part_number: "FILT-A", revision: "B" },
      }); // supersedes rev A

      expect(printLibraryEngine.list("active")).toHaveLength(1);
      expect(printLibraryEngine.list("superseded")).toHaveLength(1);
    });
  });

  // ── MULTI-PAGE ──────────────────────────────────────────────────────

  describe("multi-page drawings", () => {
    it("tracks sheet count from title block", () => {
      const { print } = printLibraryEngine.ingest({
        filename: "assembly.pdf",
        file_path: "/prints/assembly.pdf",
        title_block: {
          part_number: "ASSY-100",
          sheet_count: 5,
        },
      });

      expect(print.sheet_count).toBe(5);
    });

    it("defaults to 1 sheet", () => {
      const { print } = printLibraryEngine.ingest({
        filename: "simple.pdf",
        file_path: "/prints/simple.pdf",
      });

      expect(print.sheet_count).toBe(1);
    });
  });
});
