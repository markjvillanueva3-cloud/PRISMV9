/**
 * ShopFloorNoteIngestionEngine Tests — U-OBS-SHOP04
 *
 * Tests Obsidian shop floor note ingestion: parsing, entity extraction,
 * validation, and status tracking. Uses real engine logic with minimal mocks.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ShopFloorNoteIngestionEngine,
  IngestSingleSchema,
  ParseNoteSchema,
  BatchIngestSchema,
  ValidateEntitiesSchema,
} from "../engines/ShopFloorNoteIngestionEngine.js";

describe("ShopFloorNoteIngestionEngine", () => {
  let engine: ShopFloorNoteIngestionEngine;

  beforeEach(() => {
    engine = new ShopFloorNoteIngestionEngine();
    engine.resetState();
  });

  describe("parse — frontmatter extraction", () => {
    it("extracts title from YAML frontmatter", () => {
      const result = engine.parse({
        content: `---
title: Haas VF-2 Setup Guide
author: Mike
---

# Content`,
      });

      expect(result.success).toBe(true);
      expect(result.frontmatter.title).toBe("Haas VF-2 Setup Guide");
      expect(result.frontmatter.author).toBe("Mike");
    });

    it("extracts array values from frontmatter", () => {
      const result = engine.parse({
        content: `---
tags: [aluminum, setup, vmc]
machines: [Haas VF-2, Okuma MU-5000]
---

Content here`,
      });

      expect(result.frontmatter.tags).toEqual(["aluminum", "setup", "vmc"]);
      expect(result.frontmatter.machines).toEqual(["Haas VF-2", "Okuma MU-5000"]);
    });

    it("handles missing frontmatter gracefully", () => {
      const result = engine.parse({
        content: `# No Frontmatter

Just content without YAML block.`,
      });

      expect(result.success).toBe(true);
      expect(result.frontmatter).toEqual({});
      expect(result.raw_body).toContain("Just content");
    });

    it("strips frontmatter from raw_body", () => {
      const result = engine.parse({
        content: `---
title: Test
---

Body content starts here.`,
      });

      expect(result.raw_body).not.toContain("---");
      expect(result.raw_body.trim()).toBe("Body content starts here.");
    });
  });

  describe("parse — section extraction", () => {
    it("extracts heading hierarchy with correct levels", () => {
      const result = engine.parse({
        content: `# Level 1

Content A

## Level 2

Content B

### Level 3

Content C`,
      });

      expect(result.sections.length).toBe(3);
      expect(result.sections[0].heading).toBe("Level 1");
      expect(result.sections[0].level).toBe(1);
      expect(result.sections[1].heading).toBe("Level 2");
      expect(result.sections[1].level).toBe(2);
      expect(result.sections[2].heading).toBe("Level 3");
      expect(result.sections[2].level).toBe(3);
    });

    it("associates content with correct section", () => {
      const result = engine.parse({
        content: `# Setup

Setup instructions go here.
Multiple lines of setup content.

# Teardown

Teardown instructions here.`,
      });

      expect(result.sections[0].content).toContain("Setup instructions");
      expect(result.sections[0].content).toContain("Multiple lines");
      expect(result.sections[1].content).toContain("Teardown instructions");
    });
  });

  describe("parse — machine entity extraction", () => {
    it("extracts Haas machines with model numbers", () => {
      const result = engine.parse({
        content: `Running on Haas VF-2 and Haas ST-10 for production.`,
      });

      const machines = result.entities.filter(e => e.type === "machine");
      expect(machines.some(m => m.value === "Haas VF-2")).toBe(true);
      expect(machines.some(m => m.value === "Haas ST-10")).toBe(true);
    });

    it("extracts Okuma machines", () => {
      const result = engine.parse({
        content: `The Okuma LB3000 lathe and Okuma MU-5000 5-axis are running.`,
      });

      const machines = result.entities.filter(e => e.type === "machine");
      expect(machines.some(m => m.value.includes("Okuma LB"))).toBe(true);
      expect(machines.some(m => m.value.includes("Okuma MU"))).toBe(true);
    });

    it("extracts Mazak machines", () => {
      const result = engine.parse({
        content: `Mazak INTEGREX i-200 for complex parts.`,
      });

      const machines = result.entities.filter(e => e.type === "machine");
      expect(machines.some(m => m.value.includes("Mazak INTEGREX"))).toBe(true);
    });

    it("assigns lower confidence to generic machine terms", () => {
      const result = engine.parse({
        content: `Use the VMC for milling and the lathe for turning.`,
      });

      const genericMachines = result.entities.filter(
        e => e.type === "machine" && e.confidence < 0.7
      );
      expect(genericMachines.length).toBeGreaterThan(0);
    });
  });

  describe("parse — material entity extraction", () => {
    it("extracts aluminum alloy grades", () => {
      const result = engine.parse({
        content: `Cutting 6061-T6 aluminum and 7075-T651 blocks.`,
      });

      const materials = result.entities.filter(e => e.type === "material");
      expect(materials.some(m => m.value.includes("6061"))).toBe(true);
      expect(materials.some(m => m.value.includes("7075"))).toBe(true);
    });

    it("extracts stainless steel grades", () => {
      const result = engine.parse({
        content: `Working with 304 stainless and 17-4 PH today.`,
      });

      const materials = result.entities.filter(e => e.type === "material");
      expect(materials.some(m => m.value.includes("304"))).toBe(true);
      expect(materials.some(m => m.value.includes("17-4"))).toBe(true);
    });

    it("extracts tool steel grades", () => {
      const result = engine.parse({
        content: `Machining D2 and A2 tool steel for dies.`,
      });

      const materials = result.entities.filter(e => e.type === "material");
      expect(materials.some(m => m.value === "D2")).toBe(true);
      expect(materials.some(m => m.value === "A2")).toBe(true);
    });

    it("extracts titanium grades", () => {
      const result = engine.parse({
        content: `Ti-6Al-4V aerospace components on the 5-axis.`,
      });

      const materials = result.entities.filter(e => e.type === "material");
      expect(materials.some(m => m.value.includes("Ti-6Al-4V"))).toBe(true);
    });

    it("extracts superalloy names", () => {
      const result = engine.parse({
        content: `Inconel 718 requires ceramic inserts.`,
      });

      const materials = result.entities.filter(e => e.type === "material");
      expect(materials.some(m => m.value.includes("Inconel"))).toBe(true);
    });
  });

  describe("parse — operation entity extraction", () => {
    it("extracts milling operations", () => {
      const result = engine.parse({
        content: `Use face milling first, then pocket milling, finally slot milling.`,
      });

      const operations = result.entities.filter(e => e.type === "operation");
      expect(operations.some(o => /face.*mill/i.test(o.value))).toBe(true);
      expect(operations.some(o => /pocket/i.test(o.value))).toBe(true);
      expect(operations.some(o => /slot/i.test(o.value))).toBe(true);
    });

    it("extracts turning operations", () => {
      const result = engine.parse({
        content: `Rough turning, then boring, finish with threading.`,
      });

      const operations = result.entities.filter(e => e.type === "operation");
      expect(operations.some(o => /turn/i.test(o.value))).toBe(true);
      expect(operations.some(o => /bor/i.test(o.value))).toBe(true);
      expect(operations.some(o => /thread/i.test(o.value))).toBe(true);
    });

    it("extracts holemaking operations", () => {
      const result = engine.parse({
        content: `Drill pilot holes, then ream to size, countersink the edges.`,
      });

      const operations = result.entities.filter(e => e.type === "operation");
      expect(operations.some(o => /drill/i.test(o.value))).toBe(true);
      expect(operations.some(o => /ream/i.test(o.value))).toBe(true);
      expect(operations.some(o => /counter/i.test(o.value))).toBe(true);
    });

    it("extracts EDM operations", () => {
      const result = engine.parse({
        content: `Wire EDM the slots, sinker EDM the cavities.`,
      });

      const operations = result.entities.filter(e => e.type === "operation");
      expect(operations.some(o => /edm/i.test(o.value))).toBe(true);
    });

    it("extracts multiaxis operations", () => {
      const result = engine.parse({
        content: `5-axis simultaneous contouring for the impeller.`,
      });

      const operations = result.entities.filter(e => e.type === "operation");
      expect(operations.some(o => /5-?axis|simultaneous/i.test(o.value))).toBe(true);
    });
  });

  describe("parse — tool entity extraction", () => {
    it("extracts end mill sizes", () => {
      const result = engine.parse({
        content: `Use a 1/2" end mill for roughing.`,
      });

      const tools = result.entities.filter(e => e.type === "tool");
      expect(tools.some(t => /1\/2.*end.*mill/i.test(t.value))).toBe(true);
    });

    it("extracts insert designations", () => {
      const result = engine.parse({
        content: `CNMG inserts for rough turning, CCMT for finishing.`,
      });

      const tools = result.entities.filter(e => e.type === "tool");
      expect(tools.some(t => t.value === "CNMG")).toBe(true);
      expect(tools.some(t => t.value === "CCMT")).toBe(true);
    });

    it("extracts tool materials", () => {
      const result = engine.parse({
        content: `Carbide for steel, ceramic for superalloys, CBN for hardened.`,
      });

      const tools = result.entities.filter(e => e.type === "tool");
      expect(tools.some(t => t.value.toLowerCase() === "carbide")).toBe(true);
      expect(tools.some(t => t.value.toLowerCase() === "ceramic")).toBe(true);
      expect(tools.some(t => t.value.toLowerCase() === "cbn")).toBe(true);
    });

    it("extracts coating types", () => {
      const result = engine.parse({
        content: `TiAlN coating for high-speed steel, AlTiN for aluminum.`,
      });

      const tools = result.entities.filter(e => e.type === "tool");
      expect(tools.some(t => t.value === "TiAlN")).toBe(true);
      expect(tools.some(t => t.value === "AlTiN")).toBe(true);
    });
  });

  describe("parse — controller entity extraction", () => {
    it("extracts Fanuc controllers", () => {
      const result = engine.parse({
        content: `The Fanuc 31i requires macro B for this program.`,
      });

      const controllers = result.entities.filter(e => e.type === "controller");
      expect(controllers.some(c => /fanuc.*31i/i.test(c.value))).toBe(true);
    });

    it("extracts Okuma OSP controllers", () => {
      const result = engine.parse({
        content: `OSP-P300 syntax differs from Fanuc.`,
      });

      const controllers = result.entities.filter(e => e.type === "controller");
      expect(controllers.some(c => /osp.*p300/i.test(c.value))).toBe(true);
    });

    it("extracts Siemens controllers", () => {
      const result = engine.parse({
        content: `Siemens 840D for the DMG machines.`,
      });

      const controllers = result.entities.filter(e => e.type === "controller");
      expect(controllers.some(c => /siemens.*840d/i.test(c.value))).toBe(true);
    });
  });

  describe("parse — wiki-link extraction", () => {
    it("extracts simple wiki-links", () => {
      const result = engine.parse({
        content: `See [[Setup Procedures]] for details.`,
      });

      expect(result.wiki_links).toContain("Setup Procedures");
    });

    it("extracts wiki-links with display text", () => {
      const result = engine.parse({
        content: `Refer to [[Tool Selection Guide|how to choose tools]].`,
      });

      expect(result.wiki_links).toContain("Tool Selection Guide");
    });

    it("deduplicates wiki-links", () => {
      const result = engine.parse({
        content: `See [[Setup]] and then [[Setup]] again.`,
      });

      const setupLinks = result.wiki_links.filter(l => l === "Setup");
      expect(setupLinks.length).toBe(1);
    });
  });

  describe("parse — tag extraction", () => {
    it("extracts inline hashtags", () => {
      const result = engine.parse({
        content: `This is about #aluminum and #milling.`,
      });

      expect(result.tags).toContain("aluminum");
      expect(result.tags).toContain("milling");
    });

    it("extracts nested tags", () => {
      const result = engine.parse({
        content: `Tagged with #machining/milling/pocket.`,
      });

      expect(result.tags).toContain("machining/milling/pocket");
    });

    it("ignores numeric-only hashtags", () => {
      const result = engine.parse({
        content: `Running at #8000 RPM with #aluminum stock.`,
      });

      expect(result.tags).not.toContain("8000");
      expect(result.tags).toContain("aluminum");
    });

    it("combines frontmatter and inline tags", () => {
      const result = engine.parse({
        content: `---
tags: [setup, haas]
---

Content with #aluminum inline.`,
      });

      expect(result.tags).toContain("setup");
      expect(result.tags).toContain("haas");
      expect(result.tags).toContain("aluminum");
    });
  });

  describe("parse — checksum computation", () => {
    it("computes 16-character hex checksum", () => {
      const result = engine.parse({ content: "Test content" });

      expect(result.checksum).toMatch(/^[a-f0-9]{16}$/);
    });

    it("produces same checksum for identical content", () => {
      const content = "Identical content here";
      const result1 = engine.parse({ content });
      const result2 = engine.parse({ content });

      expect(result1.checksum).toBe(result2.checksum);
    });

    it("produces different checksums for different content", () => {
      const result1 = engine.parse({ content: "Content A" });
      const result2 = engine.parse({ content: "Content B" });

      expect(result1.checksum).not.toBe(result2.checksum);
    });
  });

  describe("parse — entity deduplication", () => {
    it("keeps only one instance of repeated entity", () => {
      const result = engine.parse({
        content: `Haas VF-2 is great. Love the Haas VF-2. Haas VF-2 forever.`,
      });

      const haasEntities = result.entities.filter(
        e => e.type === "machine" && e.value.includes("Haas VF-2")
      );
      expect(haasEntities.length).toBe(1);
    });

    it("keeps entity with highest confidence on dedup", () => {
      const result = engine.parse({
        content: `VMC work. Haas VF-2 is the VMC we use.`,
      });

      const machines = result.entities.filter(e => e.type === "machine");
      const haas = machines.find(m => m.value.includes("Haas"));
      const vmc = machines.find(m => m.value.toLowerCase() === "vmc");

      if (haas && vmc) {
        expect(haas.confidence).toBeGreaterThan(vmc.confidence);
      }
    });
  });

  describe("validate — entity validation", () => {
    it("validates entities and returns counts", () => {
      const result = engine.validate({
        entities: [
          { type: "machine", value: "Haas VF-2", confidence: 0.9 },
          { type: "material", value: "6061-T6", confidence: 0.85 },
        ],
        strict: false,
      });

      expect(result.total_entities).toBe(2);
      expect(result.validated_count).toBe(2);
      expect(result.valid).toBe(true);
    });

    it("fails strict validation for unknown entities", () => {
      const result = engine.validate({
        entities: [
          { type: "machine", value: "Unknown Machine XYZ-9000", confidence: 0.5 },
        ],
        strict: true,
      });

      expect(result.valid).toBe(false);
      expect(result.unvalidated.length).toBe(1);
      expect(result.unvalidated[0].entity.value).toBe("Unknown Machine XYZ-9000");
    });

    it("records warnings in non-strict mode", () => {
      const result = engine.validate({
        entities: [
          { type: "operation", value: "quantum-milling", confidence: 0.3 },
        ],
        strict: false,
      });

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("quantum-milling");
    });

    it("builds entity registry from validations", () => {
      engine.validate({
        entities: [{ type: "machine", value: "Custom Machine A", confidence: 0.9 }],
        strict: false,
      });

      const secondResult = engine.validate({
        entities: [{ type: "machine", value: "Custom Machine A", confidence: 0.9 }],
        strict: true,
      });

      expect(secondResult.valid).toBe(true);
      expect(secondResult.validated_count).toBe(1);
    });
  });

  describe("status — statistics tracking", () => {
    it("returns zero counts on fresh engine", () => {
      const status = engine.status();

      expect(status.total_ingested).toBe(0);
      expect(status.total_sessions).toBe(0);
    });

    it("returns entity count breakdown", () => {
      engine.validate({
        entities: [
          { type: "machine", value: "Test Machine", confidence: 0.9 },
          { type: "material", value: "Test Material", confidence: 0.9 },
        ],
        strict: false,
      });

      const status = engine.status();

      expect(status.entity_counts.machine).toBeGreaterThanOrEqual(1);
      expect(status.entity_counts.material).toBeGreaterThanOrEqual(1);
    });

    it("returns arrays for top entities", () => {
      const status = engine.status();

      expect(Array.isArray(status.top_machines)).toBe(true);
      expect(Array.isArray(status.top_materials)).toBe(true);
      expect(Array.isArray(status.top_operations)).toBe(true);
    });

    it("calculates validation rate", () => {
      const status = engine.status();

      expect(status.validation_rate).toBeGreaterThanOrEqual(0);
      expect(status.validation_rate).toBeLessThanOrEqual(1);
    });
  });

  describe("resetState — state management", () => {
    it("clears entity registry", () => {
      engine.validate({
        entities: [{ type: "machine", value: "To Be Cleared", confidence: 0.9 }],
        strict: false,
      });

      engine.resetState();

      const status = engine.status();
      expect(status.entity_counts.machine).toBe(0);
    });

    it("clears session log", () => {
      engine.resetState();

      const status = engine.status();
      expect(status.total_sessions).toBe(0);
    });
  });

  describe("schema validation", () => {
    it("IngestSingleSchema requires file_path or content", () => {
      const emptyParse = () => IngestSingleSchema.parse({});
      expect(emptyParse).toThrow();

      const withContent = IngestSingleSchema.parse({ content: "test" });
      expect(withContent.content).toBe("test");

      const withPath = IngestSingleSchema.parse({ file_path: "test.md" });
      expect(withPath.file_path).toBe("test.md");
    });

    it("IngestSingleSchema has correct defaults", () => {
      const parsed = IngestSingleSchema.parse({ content: "test" });

      expect(parsed.source).toBe("obsidian");
      expect(parsed.validate_entities).toBe(true);
      expect(parsed.create_relationships).toBe(true);
    });

    it("ParseNoteSchema requires file_path or content", () => {
      const emptyParse = () => ParseNoteSchema.parse({});
      expect(emptyParse).toThrow();

      const withContent = ParseNoteSchema.parse({ content: "test" });
      expect(withContent.extract_frontmatter).toBe(true);
      expect(withContent.extract_entities).toBe(true);
    });

    it("BatchIngestSchema requires directory, files, or notes", () => {
      const emptyParse = () => BatchIngestSchema.parse({});
      expect(emptyParse).toThrow();

      expect(() => BatchIngestSchema.parse({ notes: [] })).not.toThrow();
      expect(() => BatchIngestSchema.parse({ directory: "/path" })).not.toThrow();
      expect(() => BatchIngestSchema.parse({ files: ["a.md"] })).not.toThrow();
    });

    it("ValidateEntitiesSchema enforces entity type enum", () => {
      const validParse = ValidateEntitiesSchema.parse({
        entities: [{ type: "machine", value: "Test" }],
      });
      expect(validParse.entities[0].type).toBe("machine");

      const invalidParse = () => ValidateEntitiesSchema.parse({
        entities: [{ type: "invalid_type", value: "Test" }],
      });
      expect(invalidParse).toThrow();
    });

    it("ValidateEntitiesSchema has correct defaults", () => {
      const parsed = ValidateEntitiesSchema.parse({
        entities: [{ type: "material", value: "Steel" }],
      });

      expect(parsed.strict).toBe(false);
      expect(parsed.entities[0].confidence).toBe(1);
    });
  });
});
