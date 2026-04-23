/**
 * FCStdNativeParserEngine — Direct ZIP+XML .FCStd Parser (no FreeCAD launch required)
 *
 * .FCStd files are ZIP archives containing:
 *   - Document.xml       — object tree, properties, expressions
 *   - GuiDocument.xml    — display/viewport info (parsed for metadata only)
 *   - *.brp              — BRep geometry files (binary, never toString()'d)
 *   - thumbnails/        — PNG preview images (ignored)
 *
 * Uses `yauzl` (bundled via node-opcua) for ZIP extraction.
 * XML parsing uses a purpose-built regex scanner tuned to FreeCAD's predictable
 * XML schema — avoids pulling in a full DOM parser for this safety-critical server.
 *
 * Format versions supported: FreeCAD 0.19, 0.20, 0.21, 1.0
 * (Document.xml schema differs in attribute casing and property type names across versions)
 *
 * Duplication check: keywords [fcstd, freecad, zip, xml, cad, parser, native]
 *   → No existing FCStdNativeParserEngine found. Proceeding.
 *   → CADInstallationProbeEngine detects FreeCAD install but does NOT parse files.
 *   → NeuralCADGenerationEngine generates CAD tokens, does NOT parse .FCStd ZIPs.
 *
 * @engine FCStdNativeParserEngine
 * @shortcode E2502
 * @milestone CAD-GROUND-TRUTH-MS0 / U-CGT01
 * @classification STANDARD (CAD parser, no Kienzle/Taylor physics constants)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";
import { log } from "../utils/Logger.js";

// ── AtomicValue (local, matching project pattern from InventorAutomationBridge) ──

export interface AtomicValue<T> {
  value: T;
  confidence: number; // 0–1
  source: string;
  warning?: string;
}

// ── Domain Types ─────────────────────────────────────────────────────────────

export interface FCStdObject {
  /** FreeCAD object type: "Part::Box", "PartDesign::Pad", "Spreadsheet::Sheet", etc. */
  type: string;
  /** Internal Python name (e.g. "Box", "Pad") */
  name: string;
  /** Human-readable label */
  label: string;
  /** Object properties keyed by property name */
  properties: Record<string, { type: string; value: unknown; unit?: string }>;
  /** Parametric expression, if any */
  expression?: string;
}

export interface FCStdSpreadsheetCell {
  address: string;      // e.g. "A1", "B3"
  value: string;
  expression?: string;  // e.g. "=2*PI()*radius"
}

export interface FCStdParseResult {
  format: "FCStd";
  /** FreeCAD version string extracted from Document.xml header, e.g. "0.21.2.33771" */
  freecadVersion?: string;
  /** Parsed object tree */
  objects: FCStdObject[];
  /** All spreadsheet objects with their cells */
  spreadsheets: Array<{
    name: string;
    cells: FCStdSpreadsheetCell[];
  }>;
  /**
   * Coverage metric: successfully parsed objects / total objects discovered.
   * 1.0 = full parse; < 1.0 = partial (complex feature trees fell back to stub).
   */
  coverage: number;
  /** Non-fatal parse warnings */
  warnings: string[];
}

// ── Memory-safety constant ────────────────────────────────────────────────────

const MAX_BUFFER_BYTES = 100 * 1024 * 1024; // 100 MB hard limit

// ── XML utility helpers ───────────────────────────────────────────────────────

/**
 * Extract a single attribute value from an XML tag string.
 * e.g. attrVal('<Object type="Part::Box" name="Box">', "type") → "Part::Box"
 */
function attrVal(tag: string, attr: string): string {
  const re = new RegExp(`\\b${attr}="([^"]*)"`, "i");
  const m = re.exec(tag);
  return m ? m[1]! : "";
}

/**
 * Extract all occurrences of an XML block matching a tag name.
 * Returns the raw inner XML string for each match.
 * NOTE: does NOT handle nested tags of the same name — FreeCAD XML is flat enough
 * that this suffices for Object and Property blocks.
 */
function extractBlocks(xml: string, tagName: string): string[] {
  const blocks: string[] = [];
  // Self-closing: <Tag ... />
  const selfRe = new RegExp(`<${tagName}\\b([^>]*)\\/>`,"g");
  let m: RegExpExecArray | null;
  while ((m = selfRe.exec(xml)) !== null) {
    blocks.push(m[0]!);
  }
  // Block with children: <Tag ...>...</Tag>
  const openRe = new RegExp(`<${tagName}\\b`, "g");
  let start: RegExpExecArray | null;
  while ((start = openRe.exec(xml)) !== null) {
    const fromStart = xml.indexOf(">", start.index);
    if (fromStart === -1) continue;
    if (xml[fromStart - 1] === "/") continue; // already captured as self-closing
    const closeTag = `</${tagName}>`;
    const closeIdx = xml.indexOf(closeTag, fromStart);
    if (closeIdx === -1) continue;
    blocks.push(xml.slice(start.index, closeIdx + closeTag.length));
  }
  return blocks;
}

/**
 * Extract inner content between opening and closing tag.
 */
function innerXml(block: string, tagName: string): string {
  const open = block.indexOf(">") + 1;
  const close = block.lastIndexOf(`</${tagName}>`);
  if (open <= 0 || close <= 0 || close < open) return "";
  return block.slice(open, close);
}

// ── FreeCAD version detection ─────────────────────────────────────────────────

/**
 * Detect FreeCAD format version from Document.xml.
 * FreeCAD writes a header comment or a <Document SchemaVersion="..."> attribute.
 */
function detectFreecadVersion(xml: string): string | undefined {
  // FreeCAD 0.19+: <Document SchemaVersion="4" ...>
  const schemaRe = /SchemaVersion="([^"]+)"/i;
  const sm = schemaRe.exec(xml);

  // FreeCAD 1.0: <FcProp name="ProgramVersion"><String value="1.0.0.xxxxx"/></FcProp>
  //              or comment: <!-- FreeCAD Document v0.21.2 -->
  const commentRe = /<!--.*?FreeCAD[^-]*?v?(\d+\.\d+[\d.]*)[^-]*?-->/i;
  const cm = commentRe.exec(xml);
  if (cm) return cm[1]!;

  // ProgramVersion property embedded in Document.xml
  const pvRe = /ProgramVersion[\s\S]{0,200}?<String value="([^"]+)"/;
  const pvm = pvRe.exec(xml);
  if (pvm) return pvm[1]!;

  // Fall back to schema version as a proxy
  if (sm) return `schema:${sm[1]}`;
  return undefined;
}

// ── Property value parser ─────────────────────────────────────────────────────

/**
 * Parse a FreeCAD <Property> block into a typed value.
 * FreeCAD property types: Integer, Float, String, Bool, Vector, Placement, App::PropertyLength, etc.
 * Schema differs slightly between versions; this handles all known variants.
 */
function parsePropertyValue(
  propXml: string
): { type: string; value: unknown; unit?: string } {
  // Determine the type from the Property tag
  const typeAttr = attrVal(propXml, "type");
  const typeSimple = typeAttr.replace(/^App::Property/, "").replace(/^Part::Property/, "");

  // ---- Integer / Float ----
  {
    const m = /<(?:Integer|Int)\s[^>]*value="([^"]+)"/.exec(propXml);
    if (m) return { type: "Integer", value: parseInt(m[1]!, 10) };
  }
  {
    const m = /<Float\s[^>]*value="([^"]+)"/.exec(propXml);
    if (m) return { type: "Float", value: parseFloat(m[1]!) };
  }

  // ---- Length / Angle (numeric with unit) ----
  {
    const m = /<(?:Length|Angle|Distance|Area|Volume)\s[^>]*value="([^"]+)"/.exec(propXml);
    if (m) {
      const unit =
        /type="App::PropertyLength"/.test(propXml) ? "mm" :
        /type="App::PropertyAngle"/.test(propXml) ? "deg" :
        /type="App::PropertyArea"/.test(propXml) ? "mm²" :
        /type="App::PropertyVolume"/.test(propXml) ? "mm³" : undefined;
      return { type: typeSimple || "Length", value: parseFloat(m[1]!), unit };
    }
  }

  // ---- String ----
  {
    const m = /<String\s[^>]*value="([^"]*)"/.exec(propXml);
    if (m) return { type: "String", value: m[1] };
  }

  // ---- Bool ----
  {
    const m = /<Bool\s[^>]*value="([^"]+)"/.exec(propXml);
    if (m) return { type: "Bool", value: m[1]!.toLowerCase() === "true" };
  }

  // ---- Vector ----
  {
    const m = /<Vector\s[^>]*x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/.exec(propXml);
    if (m) return { type: "Vector", value: { x: parseFloat(m[1]!), y: parseFloat(m[2]!), z: parseFloat(m[3]!) } };
  }

  // ---- Placement (position + rotation) ----
  {
    const m = /<Position\s[^>]*x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/.exec(propXml);
    if (m) return { type: "Placement", value: { x: parseFloat(m[1]!), y: parseFloat(m[2]!), z: parseFloat(m[3]!) } };
  }

  // ---- Link (reference to another object) ----
  {
    const m = /<Link\s[^>]*value="([^"]*)"/.exec(propXml);
    if (m) return { type: "Link", value: m[1] };
  }

  // ---- ExpressionEngine (parametric expression binding) ----
  {
    const m = /ExpressionEngine[\s\S]{0,300}?expression="([^"]+)"/.exec(propXml);
    if (m) return { type: "Expression", value: m[1] };
  }

  // ---- Quantity (FreeCAD 0.21+) ----
  {
    const m = /<Quantity\s[^>]*value="([^"]+)"\s+unit="([^"]*)"/.exec(propXml);
    if (m) return { type: "Quantity", value: parseFloat(m[1]!), unit: m[2] };
  }

  // ---- Fallback: return raw inner text ----
  const inner = propXml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
  return { type: typeSimple || "Unknown", value: inner || null };
}

// ── Spreadsheet cell parser ───────────────────────────────────────────────────

/**
 * Parse cells from a Spreadsheet::Sheet object's Properties section.
 * FreeCAD stores cells as <Property name="cells" type="Spreadsheet::PropertySheet">
 * with child <Cell address="A1" content="42" alias="diameter" />
 */
function parseSpreadsheetCells(sheetObjectXml: string): FCStdSpreadsheetCell[] {
  const cells: FCStdSpreadsheetCell[] = [];
  // Match <Cell address="..." content="..." alias="..."/>
  const cellRe = /<Cell\b([^/]*)\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = cellRe.exec(sheetObjectXml)) !== null) {
    const tagAttrs = m[1]!;
    const address = attrVal(`<Cell ${tagAttrs}>`, "address");
    const content = attrVal(`<Cell ${tagAttrs}>`, "content");
    if (!address) continue;
    const cell: FCStdSpreadsheetCell = { address, value: content };
    // content starting with "=" is an expression
    if (content.startsWith("=")) {
      cell.expression = content;
      cell.value = content; // keep raw; evaluated value not available without FreeCAD
    }
    cells.push(cell);
  }
  return cells;
}

// ── Main XML parse ────────────────────────────────────────────────────────────

/**
 * Parse Document.xml content into FCStdParseResult fields.
 * Returns { objects, spreadsheets, warnings, totalDiscovered }.
 */
function parseDocumentXml(xml: string): {
  objects: FCStdObject[];
  spreadsheets: FCStdParseResult["spreadsheets"];
  warnings: string[];
  totalDiscovered: number;
} {
  const objects: FCStdObject[] = [];
  const spreadsheets: FCStdParseResult["spreadsheets"] = [];
  const warnings: string[] = [];
  let totalDiscovered = 0;

  // ── Locate the <ObjectData ...> section (FreeCAD 0.19+) ──
  // Tag has attributes e.g. <ObjectData Count="2"> — use prefix match, not exact.
  // Also handle <Objects> used in 0.19-era files.
  let objectDataXml = "";
  {
    const odStart = xml.indexOf("<ObjectData");
    const odEnd   = xml.indexOf("</ObjectData>");
    if (odStart !== -1 && odEnd !== -1) {
      objectDataXml = xml.slice(odStart, odEnd + "</ObjectData>".length);
    } else {
      // Older format fallback: try <Objects> section
      const oStart = xml.indexOf("<Objects");
      const oEnd   = xml.indexOf("</Objects>");
      if (oStart !== -1 && oEnd !== -1) {
        objectDataXml = xml.slice(oStart, oEnd + "</Objects>".length);
        warnings.push("Used legacy <Objects> section (FreeCAD pre-0.19 format)");
      }
    }
  }

  // ── Count total objects declared ──
  // <Object .../> entries in the declaration <Objects ...> section (before ObjectData).
  // We search only the portion before <ObjectData to avoid double-counting.
  {
    const objectDataStart = xml.indexOf("<ObjectData");
    const searchableXml = objectDataStart !== -1 ? xml.slice(0, objectDataStart) : xml;
    const declStart = searchableXml.indexOf("<Objects");
    const declEnd   = searchableXml.indexOf("</Objects>");
    if (declStart !== -1 && declEnd !== -1) {
      const declSection = searchableXml.slice(declStart, declEnd);
      totalDiscovered = (declSection.match(/<Object\b/g) ?? []).length;
    }
  }

  if (!objectDataXml) {
    warnings.push("No <ObjectData> or <Objects> section found — possibly empty or corrupt Document.xml");
    return { objects, spreadsheets, warnings, totalDiscovered: totalDiscovered || 0 };
  }

  // ── Parse each <Object> block in ObjectData ──
  const objectBlocks = extractBlocks(objectDataXml, "Object");

  for (const block of objectBlocks) {
    try {
      const typeName   = attrVal(block, "type");
      const objName    = attrVal(block, "name");
      const objLabel   = attrVal(block, "label") || objName;

      if (!objName) {
        warnings.push(`Skipped object block with no name attribute`);
        continue;
      }

      // ── Build properties map ──
      const properties: FCStdObject["properties"] = {};
      let expression: string | undefined;

      const propBlocks = extractBlocks(block, "Property");
      for (const pb of propBlocks) {
        const propName = attrVal(pb, "name");
        if (!propName) continue;
        try {
          const parsed = parsePropertyValue(pb);
          properties[propName] = parsed;
          // Track ExpressionEngine as the object's primary expression
          if (propName === "ExpressionEngine" && parsed.type === "Expression") {
            expression = parsed.value as string;
          }
        } catch (propErr) {
          warnings.push(`Property parse error on ${objName}.${propName}: ${String(propErr)}`);
        }
      }

      const obj: FCStdObject = { type: typeName, name: objName, label: objLabel, properties };
      if (expression) obj.expression = expression;
      objects.push(obj);

      // ── Extract spreadsheet cells if this is a Spreadsheet::Sheet ──
      if (typeName === "Spreadsheet::Sheet") {
        const cells = parseSpreadsheetCells(block);
        spreadsheets.push({ name: objName, cells });
      }

    } catch (blockErr) {
      warnings.push(`Object block parse error: ${String(blockErr)}`);
    }
  }

  // If we couldn't count declared objects, use actual parsed count as denominator
  if (totalDiscovered === 0) {
    totalDiscovered = objects.length;
  }

  return { objects, spreadsheets, warnings, totalDiscovered };
}

// ── FreeCADAutomationBridge stub ──────────────────────────────────────────────

/**
 * Stub fallback for complex feature trees.
 * FreeCADAutomationBridge (U-CGT02) will be implemented in a later session.
 * When called, logs a warning and returns a partial result marker.
 */
function stubFallbackBridge(reason: string): string {
  log.warn(`[FCStdNativeParserEngine] FreeCADAutomationBridge not yet available. Reason: ${reason}`);
  return `FALLBACK_STUB:${reason}`;
}

// ── Main Engine Class ─────────────────────────────────────────────────────────

/**
 * FCStdNativeParserEngine — parse FreeCAD .FCStd files directly as ZIP+XML.
 *
 * Does NOT launch FreeCAD. Suitable for CI/server environments.
 * For complex parametric models where coverage < 0.5, a FreeCADAutomationBridge
 * fallback is stubbed and will be wired in CAD-GROUND-TRUTH-MS0/U-CGT02.
 */
export class FCStdNativeParserEngine {

  /**
   * Parse a .FCStd file on disk.
   * @param filePath Absolute path to the .FCStd file
   */
  async parse(filePath: string): Promise<AtomicValue<FCStdParseResult>> {
    const stat = await fs.promises.stat(filePath).catch(() => null);
    if (!stat) {
      return this._errorResult(`File not found: ${filePath}`);
    }
    if (stat.size > MAX_BUFFER_BYTES) {
      // Stream-based large-file path: invoke stub fallback for oversized files
      const reason = `File size ${stat.size} bytes exceeds ${MAX_BUFFER_BYTES} byte limit`;
      stubFallbackBridge(reason);
      return this._errorResult(reason);
    }
    const buffer = await fs.promises.readFile(filePath);
    return this.parseBuffer(buffer);
  }

  /**
   * Parse a .FCStd file from a Buffer (e.g. from a file upload or in-memory test fixture).
   * @param buffer Raw bytes of the .FCStd (ZIP) file
   */
  async parseBuffer(buffer: Buffer): Promise<AtomicValue<FCStdParseResult>> {
    if (buffer.length > MAX_BUFFER_BYTES) {
      return this._errorResult(`Buffer size ${buffer.length} exceeds ${MAX_BUFFER_BYTES} byte limit`);
    }

    let documentXml: string | null = null;
    const warnings: string[] = [];

    try {
      documentXml = await this._extractXmlFromZip(buffer, "Document.xml", warnings);
    } catch (zipErr) {
      return this._errorResult(`ZIP extraction failed: ${String(zipErr)}`);
    }

    if (!documentXml) {
      return this._errorResult("Document.xml not found in .FCStd archive");
    }

    // Parse the XML
    let parsed: ReturnType<typeof parseDocumentXml>;
    try {
      parsed = parseDocumentXml(documentXml);
    } catch (xmlErr) {
      return {
        value: {
          format: "FCStd",
          objects: [],
          spreadsheets: [],
          coverage: 0,
          warnings: [`Document.xml parse failed: ${String(xmlErr)}`],
        },
        confidence: 0,
        source: "FCStdNativeParserEngine:xml-error",
        warning: `Parse error: ${String(xmlErr)}`,
      };
    }

    warnings.push(...parsed.warnings);

    const freecadVersion = detectFreecadVersion(documentXml);
    const coverage =
      parsed.totalDiscovered > 0
        ? Math.min(1, parsed.objects.length / parsed.totalDiscovered)
        : parsed.objects.length > 0 ? 1 : 0;

    // Trigger fallback stub if coverage is very low and objects were discovered
    if (coverage < 0.5 && parsed.totalDiscovered > 0) {
      const reason = `Low coverage ${(coverage * 100).toFixed(0)}% (${parsed.objects.length}/${parsed.totalDiscovered} objects)`;
      stubFallbackBridge(reason);
      warnings.push(`Low parse coverage — ${reason}. FreeCADAutomationBridge fallback stubbed.`);
    }

    const result: FCStdParseResult = {
      format: "FCStd",
      freecadVersion,
      objects: parsed.objects,
      spreadsheets: parsed.spreadsheets,
      coverage,
      warnings,
    };

    return {
      value: result,
      confidence: coverage,
      source: "FCStdNativeParserEngine:zip+xml",
      warning: warnings.length > 0 ? warnings[0] : undefined,
    };
  }

  /**
   * Extract only the spreadsheets from a .FCStd file.
   * Convenience wrapper around `parse` that returns just the spreadsheets array.
   */
  async extractSpreadsheets(
    filePath: string
  ): Promise<AtomicValue<FCStdParseResult["spreadsheets"]>> {
    const full = await this.parse(filePath);
    return {
      value: full.value.spreadsheets,
      confidence: full.confidence,
      source: full.source,
      warning: full.warning,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Extract a named file from a ZIP buffer using yauzl.
   * Only the target file is decompressed — other entries are skipped immediately.
   * BRep (.brp) files are intentionally never decompressed as strings.
   */
  private async _extractXmlFromZip(
    buffer: Buffer,
    targetFile: string,
    warnings: string[]
  ): Promise<string | null> {
    // Dynamically import yauzl — it's available via node-opcua dependency
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const yauzl = (await import("yauzl")) as typeof import("yauzl");

    return new Promise<string | null>((resolve, reject) => {
      yauzl.fromBuffer(buffer, { lazyEntries: true }, (openErr, zipfile) => {
        if (openErr || !zipfile) {
          reject(openErr ?? new Error("yauzl returned no zipfile"));
          return;
        }

        let found = false;
        zipfile.readEntry();

        zipfile.on("entry", (entry: import("yauzl").Entry) => {
          const entryName = entry.fileName;

          // Skip BRep and thumbnail files — never toString() binary content
          if (entryName.endsWith(".brp") || entryName.startsWith("thumbnails/")) {
            zipfile.readEntry();
            return;
          }

          if (entryName !== targetFile) {
            zipfile.readEntry();
            return;
          }

          found = true;
          zipfile.openReadStream(entry, (streamErr, readStream) => {
            if (streamErr || !readStream) {
              reject(streamErr ?? new Error("Could not open readStream for " + targetFile));
              return;
            }

            const chunks: Buffer[] = [];
            let totalBytes = 0;

            readStream.on("data", (chunk: Buffer) => {
              totalBytes += chunk.length;
              if (totalBytes > MAX_BUFFER_BYTES) {
                readStream.destroy(new Error(`${targetFile} decompressed size exceeds ${MAX_BUFFER_BYTES} bytes`));
                return;
              }
              chunks.push(chunk);
            });

            readStream.on("end", () => {
              const xmlContent = Buffer.concat(chunks).toString("utf-8");
              zipfile.close();
              resolve(xmlContent);
            });

            readStream.on("error", (err: Error) => {
              reject(err);
            });
          });
        });

        zipfile.on("end", () => {
          if (!found) {
            warnings.push(`${targetFile} not found in archive`);
            resolve(null);
          }
        });

        zipfile.on("error", (err: Error) => {
          reject(err);
        });
      });
    });
  }

  /** Build an error AtomicValue result. */
  private _errorResult(message: string): AtomicValue<FCStdParseResult> {
    return {
      value: {
        format: "FCStd",
        objects: [],
        spreadsheets: [],
        coverage: 0,
        warnings: [message],
      },
      confidence: 0,
      source: "FCStdNativeParserEngine:error",
      warning: message,
    };
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const fcStdNativeParserEngine = new FCStdNativeParserEngine();
