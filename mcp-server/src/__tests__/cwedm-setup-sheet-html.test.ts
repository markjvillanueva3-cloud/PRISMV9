/**
 * U-WLAUNCH06: Setup Sheet HTML Verify + Operator Restart Procedure
 *
 * Validates that WEDMPrintToProgramEngine.generate() returns a printable HTML
 * setup sheet with:
 *   - Header fields (material, thickness, wire, controller, program number)
 *   - Per-pass parameter table (E-pack, H-offset, feed, wire speed, tension, Ra)
 *   - Wire break restart procedure with N-block markers
 *   - Confidence score badge
 *   - Warnings section
 *   - Valid HTML structure (DOCTYPE, head, body)
 */

import { describe, it, expect } from "vitest";
import { WEDMPrintToProgramEngine } from "../engines/WEDMPrintToProgramEngine.js";
import type { WEDMProgramInput } from "../engines/WEDMPrintToProgramEngine.js";
import type { WireEDMContour, LineSegment } from "../engines/DXFGeometryParserEngine.js";

const engine = new WEDMPrintToProgramEngine();

function makeSquareContour(): WireEDMContour {
  const side = 25;
  const segments: LineSegment[] = [
    { type: "line", start: { x: 0, y: 0 }, end: { x: side, y: 0 } },
    { type: "line", start: { x: side, y: 0 }, end: { x: side, y: side } },
    { type: "line", start: { x: side, y: side }, end: { x: 0, y: side } },
    { type: "line", start: { x: 0, y: side }, end: { x: 0, y: 0 } },
  ];
  return {
    id: "square_25mm",
    segments,
    is_closed: true,
    is_exterior: true,
    area_mm2: side * side,
    perimeter_mm: 4 * side,
    bbox: { min_x: 0, min_y: 0, max_x: side, max_y: side },
  };
}

async function generateD2Program() {
  const input: WEDMProgramInput = {
    contours: [makeSquareContour()],
    material: "D2",
    thickness_mm: 25.4,
    target_ra_um: 0.8,
    controller: "mitsubishi",
    part_name: "TEST PART D2",
    part_number: "TP-001",
    program_number: 100,
  };
  return engine.generate(input);
}

describe("U-WLAUNCH06: Setup Sheet HTML Verify + Restart Procedure", () => {

  describe("HTML structure", () => {
    it("setup_sheet_html is a non-empty string", async () => {
      const result = await generateD2Program();
      expect(result.success).toBe(true);
      expect(typeof result.setup_sheet_html).toBe("string");
      expect(result.setup_sheet_html.length).toBeGreaterThan(100);
    });

    it("contains valid HTML DOCTYPE and structure", async () => {
      const result = await generateD2Program();
      const html = result.setup_sheet_html;
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html");
      expect(html).toContain("<head>");
      expect(html).toContain("<body>");
      expect(html).toContain("</html>");
    });

    it("contains print-friendly CSS", async () => {
      const result = await generateD2Program();
      expect(result.setup_sheet_html).toContain("@media print");
    });
  });

  describe("Header fields", () => {
    it("shows part name and number", async () => {
      const result = await generateD2Program();
      const html = result.setup_sheet_html;
      expect(html).toContain("TEST PART D2");
      expect(html).toContain("TP-001");
    });

    it("shows material and thickness", async () => {
      const result = await generateD2Program();
      const html = result.setup_sheet_html;
      expect(html).toContain("D2");
      expect(html).toContain("25.4");
    });

    it("shows program number", async () => {
      const result = await generateD2Program();
      expect(result.setup_sheet_html).toContain("O100");
    });

    it("shows controller type", async () => {
      const result = await generateD2Program();
      expect(result.setup_sheet_html).toContain("mitsubishi");
    });

    it("shows wire type and diameter", async () => {
      const result = await generateD2Program();
      const html = result.setup_sheet_html;
      // Wire diameter should be present
      expect(html).toContain("0.25");
    });
  });

  describe("Per-pass table", () => {
    it("contains table headers for all pass parameters", async () => {
      const result = await generateD2Program();
      const html = result.setup_sheet_html;
      expect(html).toContain("E-Pack");
      expect(html).toContain("H-Offset");
      expect(html).toContain("Feed");
      expect(html).toContain("Wire Speed");
      expect(html).toContain("Tension");
      expect(html).toContain("Ra");
    });

    it("has one row per pass", async () => {
      const result = await generateD2Program();
      const html = result.setup_sheet_html;
      const passCount = result.pass_details.length;
      // Count <tr> inside tbody (each pass = 1 row in the pass table)
      // The per-pass table has passCount rows
      for (let i = 1; i <= passCount; i++) {
        expect(html).toContain(`<td>${i}</td>`);
      }
    });

    it("includes E-pack codes in the table", async () => {
      const result = await generateD2Program();
      const html = result.setup_sheet_html;
      // D2 at 25.4mm should produce E12xx codes
      expect(html).toContain("E12");
    });
  });

  describe("Confidence score", () => {
    it("displays confidence percentage", async () => {
      const result = await generateD2Program();
      const html = result.setup_sheet_html;
      const score = result.confidence_score.overall;
      expect(html).toContain(`${score.toFixed(0)}%`);
    });

    it("has colored badge", async () => {
      const result = await generateD2Program();
      expect(result.setup_sheet_html).toContain("class=\"confidence\"");
    });
  });

  describe("Restart procedure", () => {
    it("contains restart table header if markers exist", async () => {
      const result = await generateD2Program();
      const html = result.setup_sheet_html;
      // If restart markers were generated, the section should exist
      if (html.includes("Wire Break Restart")) {
        expect(html).toContain("N-Block");
        expect(html).toContain("Procedure");
        expect(html).toContain("Re-thread wire");
        expect(html).toContain("CYCLE START");
      }
    });

    it("restart markers reference real N-block numbers", async () => {
      const result = await generateD2Program();
      const html = result.setup_sheet_html;
      if (html.includes("Wire Break Restart")) {
        // N-block numbers should be numeric (N followed by digits)
        const nBlocks = html.match(/N\d+/g);
        expect(nBlocks).not.toBeNull();
        expect(nBlocks!.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Pipeline stage tracking", () => {
    it("includes setup_sheet_html_rendered in stages_completed", async () => {
      const result = await generateD2Program();
      expect(result.stages_completed).toContain("setup_sheet_html_rendered");
    });
  });

  describe("Failure case", () => {
    it("returns empty HTML string on failure", async () => {
      const input: WEDMProgramInput = {
        contours: [], // no contours → should fail
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);
      expect(result.setup_sheet_html).toBe("");
    });
  });
});
