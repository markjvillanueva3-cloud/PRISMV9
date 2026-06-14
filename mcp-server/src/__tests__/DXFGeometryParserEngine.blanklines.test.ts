/**
 * U-PARSER-BLANK-LINES — parseDXFGroups strict-stride blank-tolerance fix.
 *
 * Bug history (resolved this commit):
 *   - Pre-fix v1 (`.filter(l => l.trim() !== "")` before pairing): blank
 *     lines collapsed -> parity shift -> ~9% pair drop on AF102-05.dxf.
 *   - Intermediate "skip blanks in-place" fix: SAME bug. A blank at a
 *     value-line position is NOT a separator — it is the empty-string
 *     VALUE of a text-type code (e.g. AutoCAD's $DIMPOST / $DIMAPOST
 *     dimension postfix variables, which are routinely empty).
 *   - Real fix: strict 2-line stride, NEVER skip blanks. Blank
 *     value-line → empty string. Non-numeric code-line → drop pair but
 *     keep parity by advancing i += 2 unconditionally.
 *
 * Tests verify the real-world AF102-05 regression + 7 synthetic
 * blank-line patterns.
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import { dxfGeometryParserEngine } from "../engines/DXFGeometryParserEngine.js";

function makeDxf(...lines: Array<string | number>): string {
  return lines.map(String).join("\n") + "\n";
}

describe("DXFGeometryParserEngine — parseDXFGroups blank-line robustness (U-PARSER-BLANK-LINES)", () => {
  it("baseline: clean DXF with 0 blank lines parses LINE entity correctly", () => {
    const dxf = makeDxf(
      "0", "SECTION", "2", "ENTITIES",
      "0", "LINE",
      "10", "0.0", "20", "0.0", "11", "10.0", "21", "0.0",
      "0", "ENDSEC",
      "0", "EOF",
    );
    const r = dxfGeometryParserEngine.parseDXF(dxf);
    const segs = r.contours.flatMap((c) => c.segments);
    expect(segs).toHaveLength(1);
    expect(segs[0].type).toBe("line");
  });

  it("blank line at code-line position (between two pairs) — parity preserved, pair on either side intact", () => {
    // The blank is at an odd-indexed line (code position), so it advances
    // i past WITHOUT consuming a value. Both real LINE pairs still parse.
    const dxf = makeDxf(
      "0", "SECTION", "2", "ENTITIES",
      "0", "LINE",
      "10", "0.0", "20", "0.0", "11", "1.0", "21", "0.0",
      "", "", // ← two-line blank "pair" at code position (treated as skip)
      "0", "LINE",
      "10", "5.0", "20", "5.0", "11", "6.0", "21", "5.0",
      "0", "ENDSEC",
      "0", "EOF",
    );
    const r = dxfGeometryParserEngine.parseDXF(dxf);
    const segs = r.contours.flatMap((c) => c.segments);
    expect(segs).toHaveLength(2);
  });

  it("blank value-line for text-type code (1) — represents empty string (mirrors AutoCAD $DIMPOST behavior)", () => {
    // This is the AutoCAD pattern that broke the prior fix. Code 1 (text)
    // can have an empty value — the value line is literally blank. The
    // parser must NOT skip the blank.
    const dxf = makeDxf(
      "0", "SECTION", "2", "HEADER",
      "9", "$DIMPOST", "1", "", // ← empty text value
      "9", "$DIMAPOST", "1", "", // ← another empty text value
      "9", "$DIMALT", "70", "0",
      "0", "ENDSEC",
      "0", "SECTION", "2", "ENTITIES",
      "0", "LINE",
      "10", "0.0", "20", "0.0", "11", "1.0", "21", "0.0",
      "0", "ENDSEC",
      "0", "EOF",
    );
    const r = dxfGeometryParserEngine.parseDXF(dxf);
    // After the HEADER (with empty-text values) we must still find the
    // ENTITIES section and parse the LINE.
    const segs = r.contours.flatMap((c) => c.segments);
    expect(segs).toHaveLength(1);
    expect(segs[0].type).toBe("line");
  });

  it("multiple consecutive blank line-pairs at code position — all skipped, no infinite loop", () => {
    const dxf = makeDxf(
      "0", "SECTION", "2", "ENTITIES",
      "", "", "", "", "", "", // ← three blank pairs at code position
      "0", "LINE",
      "10", "0.0", "20", "0.0", "11", "1.0", "21", "0.0",
      "0", "ENDSEC",
      "0", "EOF",
    );
    const r = dxfGeometryParserEngine.parseDXF(dxf);
    const segs = r.contours.flatMap((c) => c.segments);
    expect(segs).toHaveLength(1);
  });

  it("blank lines at start of file — tolerated, parsing starts at first valid code", () => {
    const dxf =
      "\n\n\n\n" +
      makeDxf(
        "0", "SECTION", "2", "ENTITIES",
        "0", "LINE",
        "10", "0.0", "20", "0.0", "11", "2.0", "21", "0.0",
        "0", "ENDSEC",
        "0", "EOF",
      );
    const r = dxfGeometryParserEngine.parseDXF(dxf);
    expect(r.contours.flatMap((c) => c.segments)).toHaveLength(1);
  });

  it("blank lines at end of file — no crash, parser terminates cleanly", () => {
    const dxf = makeDxf(
      "0", "SECTION", "2", "ENTITIES",
      "0", "LINE",
      "10", "0.0", "20", "0.0", "11", "3.0", "21", "0.0",
      "0", "ENDSEC",
      "0", "EOF",
    ) + "\n\n\n\n";
    expect(() => dxfGeometryParserEngine.parseDXF(dxf)).not.toThrow();
    expect(dxfGeometryParserEngine.parseDXF(dxf).contours.flatMap((c) => c.segments)).toHaveLength(1);
  });

  it("non-numeric code-line — pair dropped but parity preserved for downstream", () => {
    // A garbage line at a code position should be skipped without consuming
    // a value. The next real pair must still parse correctly.
    const dxf = makeDxf(
      "0", "SECTION", "2", "ENTITIES",
      "GARBAGE", "alsogarbage",
      "0", "LINE",
      "10", "0.0", "20", "0.0", "11", "4.0", "21", "0.0",
      "0", "ENDSEC",
      "0", "EOF",
    );
    const r = dxfGeometryParserEngine.parseDXF(dxf);
    expect(r.contours.flatMap((c) => c.segments)).toHaveLength(1);
  });

  it("AF102-05 regression — real 363KB shop DXF with empty-text $DIMPOST/$DIMAPOST values now produces entities", async () => {
    // Pre-fix: 0 entities, 0 contours. Post-fix: should see >= 3 entities
    // and contours from the 1 POLYLINE (closed square) + 2 CIRCLE entities.
    const path = "H:/prism/JM DIE/HAAS-HURCO/OMG INC/AF102-05.dxf";
    const content = await fsp.readFile(path, "utf8");
    const r = dxfGeometryParserEngine.parseDXF(content);
    expect(r.entity_count).toBeGreaterThanOrEqual(3);
    expect(r.contours.length).toBeGreaterThanOrEqual(1);
  });
});
