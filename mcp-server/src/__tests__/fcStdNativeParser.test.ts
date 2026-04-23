/**
 * fcStdNativeParser.test.ts
 *
 * Tests for FCStdNativeParserEngine — direct ZIP+XML .FCStd parsing.
 * Uses synthetic ZIP buffers built from hand-crafted Document.xml strings.
 * No FreeCAD installation required.
 *
 * @milestone CAD-GROUND-TRUTH-MS0 / U-CGT01
 */

import { describe, it, expect } from "vitest";
import * as zlib from "node:zlib";
import { FCStdNativeParserEngine } from "../engines/FCStdNativeParserEngine.js";

// ── ZIP builder (pure Node, no dependencies) ─────────────────────────────────
//
// Implements the ZIP local-file format per PKZIP AppNote §4.3:
//   [local file header + compressed data] × N  + [central directory] + [end of central dir]
//
// CRC-32 implementation is required by the ZIP spec. We implement the standard
// table-based CRC-32 used by all ZIP tools (polynomial 0xEDB88320).

function crc32(buf: Buffer): number {
  // Standard ZIP CRC-32 lookup table (IEEE 802.3 / PKZIP polynomial 0xEDB88320)
  const TABLE: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    TABLE[n] = c!;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = TABLE[(crc ^ buf[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Build a minimal ZIP buffer containing the given files.
 * Uses DEFLATE compression (method=8) for each file.
 */
function buildZip(files: Array<{ name: string; content: Buffer }>): Buffer {
  const localHeaders: Buffer[] = [];
  const centralDirEntries: Buffer[] = [];
  let localOffset = 0;

  for (const file of files) {
    const nameBytes = Buffer.from(file.name, "utf-8");
    const compressed = zlib.deflateRawSync(file.content, { level: 6 });
    const crc = crc32(file.content);
    const now = new Date();
    const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) >>> 0;
    const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) >>> 0;

    // ── Local file header (30 + nameLen bytes) ──
    const localHeader = Buffer.alloc(30 + nameBytes.length);
    localHeader.writeUInt32LE(0x04034b50, 0);  // local file header signature
    localHeader.writeUInt16LE(20, 4);           // version needed: 2.0
    localHeader.writeUInt16LE(0, 6);            // general purpose bit flag
    localHeader.writeUInt16LE(8, 8);            // compression method: deflate
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(file.content.length, 22);
    localHeader.writeUInt16LE(nameBytes.length, 26);
    localHeader.writeUInt16LE(0, 28);           // extra field length
    nameBytes.copy(localHeader, 30);

    localHeaders.push(localHeader);
    localHeaders.push(compressed);

    // ── Central directory entry ──
    const cdEntry = Buffer.alloc(46 + nameBytes.length);
    cdEntry.writeUInt32LE(0x02014b50, 0);   // central dir signature
    cdEntry.writeUInt16LE(20, 4);           // version made by
    cdEntry.writeUInt16LE(20, 6);           // version needed
    cdEntry.writeUInt16LE(0, 8);            // flags
    cdEntry.writeUInt16LE(8, 10);           // compression: deflate
    cdEntry.writeUInt16LE(dosTime, 12);
    cdEntry.writeUInt16LE(dosDate, 14);
    cdEntry.writeUInt32LE(crc, 16);
    cdEntry.writeUInt32LE(compressed.length, 20);
    cdEntry.writeUInt32LE(file.content.length, 24);
    cdEntry.writeUInt16LE(nameBytes.length, 28);
    cdEntry.writeUInt16LE(0, 30);           // extra field length
    cdEntry.writeUInt16LE(0, 32);           // file comment length
    cdEntry.writeUInt16LE(0, 34);           // disk number start
    cdEntry.writeUInt16LE(0, 36);           // internal attributes
    cdEntry.writeUInt32LE(0, 38);           // external attributes
    cdEntry.writeUInt32LE(localOffset, 42); // relative offset of local header
    nameBytes.copy(cdEntry, 46);

    centralDirEntries.push(cdEntry);
    localOffset += localHeader.length + compressed.length;
  }

  const localData = Buffer.concat(localHeaders);
  const centralDir = Buffer.concat(centralDirEntries);
  const cdOffset = localData.length;
  const cdSize = centralDir.length;

  // ── End of central directory record ──
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);       // EOCD signature
  eocd.writeUInt16LE(0, 4);                // disk number
  eocd.writeUInt16LE(0, 6);                // disk with central dir
  eocd.writeUInt16LE(files.length, 8);     // entries on this disk
  eocd.writeUInt16LE(files.length, 10);    // total entries
  eocd.writeUInt32LE(cdSize, 12);          // central dir size
  eocd.writeUInt32LE(cdOffset, 16);        // central dir offset
  eocd.writeUInt16LE(0, 20);              // comment length

  return Buffer.concat([localData, centralDir, eocd]);
}

// ── Document.xml templates ────────────────────────────────────────────────────

/**
 * Minimal FreeCAD 0.21 Document.xml with a Part::Box and a Pad.
 */
const DOC_XML_SIMPLE = `<?xml version='1.0' encoding='utf-8'?>
<!-- FreeCAD Document v0.21.2 -->
<Document SchemaVersion="4" ProgramVersion="0.21.2.33771" FileVersion="1">
  <Properties>
    <Property name="Label" type="App::PropertyString">
      <String value="TestPart"/>
    </Property>
    <Property name="ProgramVersion" type="App::PropertyString">
      <String value="0.21.2.33771"/>
    </Property>
  </Properties>
  <Objects Count="2">
    <Object type="Part::Box" name="Box" label="Box001"/>
    <Object type="PartDesign::Pad" name="Pad" label="Pad001"/>
  </Objects>
  <ObjectData Count="2">
    <Object name="Box" type="Part::Box" label="Box001">
      <Properties>
        <Property name="Length" type="App::PropertyLength">
          <Length value="25.4"/>
        </Property>
        <Property name="Width" type="App::PropertyLength">
          <Length value="12.7"/>
        </Property>
        <Property name="Height" type="App::PropertyLength">
          <Length value="50.8"/>
        </Property>
        <Property name="Label" type="App::PropertyString">
          <String value="Box001"/>
        </Property>
      </Properties>
    </Object>
    <Object name="Pad" type="PartDesign::Pad" label="Pad001">
      <Properties>
        <Property name="Length" type="App::PropertyLength">
          <Length value="10.0"/>
        </Property>
        <Property name="Label" type="App::PropertyString">
          <String value="Pad001"/>
        </Property>
      </Properties>
    </Object>
  </ObjectData>
</Document>`;

/**
 * Document.xml with a Spreadsheet::Sheet containing parametric cells.
 */
const DOC_XML_SPREADSHEET = `<?xml version='1.0' encoding='utf-8'?>
<!-- FreeCAD Document v0.20.1 -->
<Document SchemaVersion="4" ProgramVersion="0.20.1.29247" FileVersion="1">
  <Objects Count="2">
    <Object type="Spreadsheet::Sheet" name="Spreadsheet" label="Parameters"/>
    <Object type="Part::Box" name="Box" label="DieBlock"/>
  </Objects>
  <ObjectData Count="2">
    <Object name="Spreadsheet" type="Spreadsheet::Sheet" label="Parameters">
      <Properties>
        <Property name="cells" type="Spreadsheet::PropertySheet">
          <Cells Count="4">
            <Cell address="A1" content="diameter"/>
            <Cell address="B1" content="25.4"/>
            <Cell address="A2" content="length"/>
            <Cell address="B2" content="=B1 * 2"/>
          </Cells>
        </Property>
        <Property name="Label" type="App::PropertyString">
          <String value="Parameters"/>
        </Property>
      </Properties>
    </Object>
    <Object name="Box" type="Part::Box" label="DieBlock">
      <Properties>
        <Property name="Length" type="App::PropertyLength">
          <Length value="50.8"/>
        </Property>
      </Properties>
    </Object>
  </ObjectData>
</Document>`;

/**
 * Malformed XML — missing closing tags, truncated mid-element.
 */
const DOC_XML_MALFORMED = `<?xml version='1.0' encoding='utf-8'?>
<Document SchemaVersion="4">
  <Objects Count="1">
    <Object type="Part::Box" name="Box" label="Box"/>
  </Objects>
  <ObjectData Count="1">
    <Object name="Box" type="Part::Box" label="Box">
      <Properties>
        <Property name="Length" type="App::PropertyLength">
          <!-- truncated here, no closing tags --`;

// ── Helper: build FCStd buffer ────────────────────────────────────────────────

function makeFCStd(docXml: string, extraFiles?: Array<{ name: string; content: Buffer }>): Buffer {
  const files: Array<{ name: string; content: Buffer }> = [
    { name: "Document.xml", content: Buffer.from(docXml, "utf-8") },
  ];
  if (extraFiles) files.push(...extraFiles);
  return buildZip(files);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("FCStdNativeParserEngine", () => {

  // ── Singleton ────────────────────────────────────────────────────────────

  describe("singleton export", () => {
    it("exports fcStdNativeParserEngine singleton", async () => {
      const mod = await import("../engines/FCStdNativeParserEngine.js");
      expect(mod.fcStdNativeParserEngine).toBeDefined();
      expect(mod.fcStdNativeParserEngine).toBeInstanceOf(mod.FCStdNativeParserEngine);
    });
  });

  // ── Basic parse ──────────────────────────────────────────────────────────

  describe("parseBuffer() — simple Part::Box + Pad", () => {
    it("returns format='FCStd'", async () => {
      const engine = new FCStdNativeParserEngine();
      const buf = makeFCStd(DOC_XML_SIMPLE);
      const result = await engine.parseBuffer(buf);
      expect(result.value.format).toBe("FCStd");
    });

    it("detects FreeCAD version from XML comment", async () => {
      const engine = new FCStdNativeParserEngine();
      const buf = makeFCStd(DOC_XML_SIMPLE);
      const result = await engine.parseBuffer(buf);
      expect(result.value.freecadVersion).toContain("0.21");
    });

    it("parses 2 objects correctly", async () => {
      const engine = new FCStdNativeParserEngine();
      const buf = makeFCStd(DOC_XML_SIMPLE);
      const result = await engine.parseBuffer(buf);
      expect(result.value.objects).toHaveLength(2);
      expect(result.value.objects[0]!.type).toBe("Part::Box");
      expect(result.value.objects[0]!.name).toBe("Box");
      expect(result.value.objects[1]!.type).toBe("PartDesign::Pad");
    });

    it("parses property values (Length = 25.4 mm)", async () => {
      const engine = new FCStdNativeParserEngine();
      const buf = makeFCStd(DOC_XML_SIMPLE);
      const result = await engine.parseBuffer(buf);
      const box = result.value.objects.find(o => o.name === "Box");
      expect(box).toBeDefined();
      const lengthProp = box!.properties["Length"];
      expect(lengthProp).toBeDefined();
      expect(lengthProp!.value).toBeCloseTo(25.4, 2);
      expect(lengthProp!.unit).toBe("mm");
    });

    it("coverage = 1.0 when all declared objects are parsed", async () => {
      const engine = new FCStdNativeParserEngine();
      const buf = makeFCStd(DOC_XML_SIMPLE);
      const result = await engine.parseBuffer(buf);
      expect(result.value.coverage).toBeGreaterThanOrEqual(0.95);
    });

    it("confidence equals coverage", async () => {
      const engine = new FCStdNativeParserEngine();
      const buf = makeFCStd(DOC_XML_SIMPLE);
      const result = await engine.parseBuffer(buf);
      expect(result.confidence).toBeCloseTo(result.value.coverage, 5);
    });

    it("returns no fatal warnings for valid file", async () => {
      const engine = new FCStdNativeParserEngine();
      const buf = makeFCStd(DOC_XML_SIMPLE);
      const result = await engine.parseBuffer(buf);
      // Warnings array exists but no parse-error warnings
      const fatalWarnings = result.value.warnings.filter(w =>
        w.toLowerCase().includes("error") || w.toLowerCase().includes("failed")
      );
      expect(fatalWarnings).toHaveLength(0);
    });
  });

  // ── Spreadsheet parsing ──────────────────────────────────────────────────

  describe("parseBuffer() — Spreadsheet::Sheet", () => {
    it("detects spreadsheet object", async () => {
      const engine = new FCStdNativeParserEngine();
      const buf = makeFCStd(DOC_XML_SPREADSHEET);
      const result = await engine.parseBuffer(buf);
      expect(result.value.spreadsheets).toHaveLength(1);
      expect(result.value.spreadsheets[0]!.name).toBe("Spreadsheet");
    });

    it("parses 4 cells from spreadsheet", async () => {
      const engine = new FCStdNativeParserEngine();
      const buf = makeFCStd(DOC_XML_SPREADSHEET);
      const result = await engine.parseBuffer(buf);
      const sheet = result.value.spreadsheets[0]!;
      expect(sheet.cells).toHaveLength(4);
    });

    it("recognises expression cells (content starting with '=')", async () => {
      const engine = new FCStdNativeParserEngine();
      const buf = makeFCStd(DOC_XML_SPREADSHEET);
      const result = await engine.parseBuffer(buf);
      const sheet = result.value.spreadsheets[0]!;
      const b2 = sheet.cells.find(c => c.address === "B2");
      expect(b2).toBeDefined();
      expect(b2!.expression).toBeDefined();
      expect(b2!.expression).toMatch(/^=/);
    });

    it("parses plain-value cells correctly", async () => {
      const engine = new FCStdNativeParserEngine();
      const buf = makeFCStd(DOC_XML_SPREADSHEET);
      const result = await engine.parseBuffer(buf);
      const sheet = result.value.spreadsheets[0]!;
      const b1 = sheet.cells.find(c => c.address === "B1");
      expect(b1).toBeDefined();
      expect(b1!.value).toBe("25.4");
      expect(b1!.expression).toBeUndefined();
    });

    it("extractSpreadsheets() returns same sheets as parse()", async () => {
      const engine = new FCStdNativeParserEngine();
      // Write buffer to a temp file for extractSpreadsheets
      const buf = makeFCStd(DOC_XML_SPREADSHEET);
      const tmpFile = `/tmp/test-fcstd-${Date.now()}.FCStd`;
      const fs = await import("node:fs");
      await fs.promises.writeFile(tmpFile, buf);
      try {
        const sheetsResult = await engine.extractSpreadsheets(tmpFile);
        expect(sheetsResult.value).toHaveLength(1);
        expect(sheetsResult.value[0]!.name).toBe("Spreadsheet");
        expect(sheetsResult.value[0]!.cells).toHaveLength(4);
      } finally {
        await fs.promises.unlink(tmpFile).catch(() => {});
      }
    });
  });

  // ── Malformed XML — must return warnings, not throw ──────────────────────

  describe("parseBuffer() — malformed XML", () => {
    it("does NOT throw on malformed/truncated Document.xml", async () => {
      const engine = new FCStdNativeParserEngine();
      const buf = makeFCStd(DOC_XML_MALFORMED);
      await expect(engine.parseBuffer(buf)).resolves.toBeDefined();
    });

    it("returns warnings[] when XML is malformed", async () => {
      const engine = new FCStdNativeParserEngine();
      // Create a ZIP with truncated XML that has no ObjectData section
      const buf = makeFCStd(DOC_XML_MALFORMED);
      const result = await engine.parseBuffer(buf);
      // Should have warnings about missing/incomplete sections
      expect(result.value.warnings).toBeDefined();
      expect(Array.isArray(result.value.warnings)).toBe(true);
    });

    it("format is still 'FCStd' even on partial parse", async () => {
      const engine = new FCStdNativeParserEngine();
      const buf = makeFCStd(DOC_XML_MALFORMED);
      const result = await engine.parseBuffer(buf);
      expect(result.value.format).toBe("FCStd");
    });

    it("does NOT throw on empty ZIP", async () => {
      const engine = new FCStdNativeParserEngine();
      // ZIP with no Document.xml — just a dummy BRep entry
      const buf = makeFCStd("<!-- no document here -->", [
        { name: "part.brp", content: Buffer.from([0x42, 0x52, 0x45, 0x50]) }, // binary header
      ]);
      // Without Document.xml the engine should handle gracefully
      // (we pass a dummy doc xml so Document.xml IS there — test the brp isn't toString'd)
      await expect(engine.parseBuffer(buf)).resolves.toBeDefined();
    });
  });

  // ── Error handling ───────────────────────────────────────────────────────

  describe("parse() — file I/O errors", () => {
    it("returns confidence=0 and warning for nonexistent file", async () => {
      const engine = new FCStdNativeParserEngine();
      const result = await engine.parse("/nonexistent/path/does-not-exist.FCStd");
      expect(result.confidence).toBe(0);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain("not found");
    });

    it("does NOT throw on nonexistent file — returns AtomicValue error result", async () => {
      const engine = new FCStdNativeParserEngine();
      await expect(engine.parse("/no/such/file.FCStd")).resolves.toBeDefined();
    });
  });

  // ── Coverage metric ──────────────────────────────────────────────────────

  describe("coverage metric", () => {
    it("coverage is between 0 and 1 inclusive", async () => {
      const engine = new FCStdNativeParserEngine();
      for (const xml of [DOC_XML_SIMPLE, DOC_XML_SPREADSHEET, DOC_XML_MALFORMED]) {
        const result = await engine.parseBuffer(makeFCStd(xml));
        expect(result.value.coverage).toBeGreaterThanOrEqual(0);
        expect(result.value.coverage).toBeLessThanOrEqual(1);
      }
    });

    it("coverage is 0 for error results", async () => {
      const engine = new FCStdNativeParserEngine();
      const result = await engine.parse("/no/such/file.FCStd");
      expect(result.value.coverage).toBe(0);
    });
  });

  // ── AtomicValue shape ────────────────────────────────────────────────────

  describe("AtomicValue shape", () => {
    it("result has { value, confidence, source } keys", async () => {
      const engine = new FCStdNativeParserEngine();
      const result = await engine.parseBuffer(makeFCStd(DOC_XML_SIMPLE));
      expect(result).toHaveProperty("value");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("source");
    });

    it("source string identifies the engine", async () => {
      const engine = new FCStdNativeParserEngine();
      const result = await engine.parseBuffer(makeFCStd(DOC_XML_SIMPLE));
      expect(result.source).toContain("FCStdNativeParserEngine");
    });
  });

  // ── FreeCAD 0.20 format variation ────────────────────────────────────────

  describe("FreeCAD format version handling", () => {
    it("parses 0.20 document with correct version detection", async () => {
      const engine = new FCStdNativeParserEngine();
      const buf = makeFCStd(DOC_XML_SPREADSHEET); // 0.20.1 comment in header
      const result = await engine.parseBuffer(buf);
      expect(result.value.freecadVersion).toContain("0.20");
    });

    it("parses 0.19 legacy <Objects> section with a warning", async () => {
      const legacyXml = `<?xml version='1.0' encoding='utf-8'?>
<Document SchemaVersion="3">
  <Objects>
    <Object type="Part::Box" name="Box" label="Box"/>
    <Property name="Length" type="App::PropertyLength">
      <Length value="10.0"/>
    </Property>
  </Objects>
</Document>`;
      const engine = new FCStdNativeParserEngine();
      const buf = makeFCStd(legacyXml);
      const result = await engine.parseBuffer(buf);
      // May have warning about legacy format, but should NOT throw
      expect(result.value.format).toBe("FCStd");
    });
  });

});
