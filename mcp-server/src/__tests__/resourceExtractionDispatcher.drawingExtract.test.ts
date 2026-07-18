/**
 * resourceExtractionDispatcher.drawingExtract.test.ts -- round-trip wire test for the
 * `drawing_extract` action through prism_resource_extraction (U-XRAY-DRAWING-EXTRACT-REAL-DXF).
 *
 * Drawing2DExtractionEngine.test.ts covers the pure parser by passing `content` directly. THIS file
 * proves the DISPATCHER path the engine tests skip: the action reads a real .dxf FILE off disk
 * (fs.readFileSync + 64MB size cap), feeds the content to the engine, and returns real parsed
 * dimensions end-to-end -- the producer surface the app upload route binds to.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { registerResourceExtractionDispatcher } from "../tools/dispatchers/resourceExtractionDispatcher.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<any>;
}
function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(name: string, _description: string, _schema: unknown, handler: CapturedTool["handler"]) {
      captured.push({ name, handler });
    },
  };
}

let handler: CapturedTool["handler"];
async function invoke(action: string, params: Record<string, unknown> = {}): Promise<any> {
  return (await handler({ action, params })) as any;
}

// A real minimal DXF: HEADER $INSUNITS=4 (mm) + ENTITIES (LINE, linear DIMENSION measuring 25.4, TEXT).
const DXF_MM = [
  "0", "SECTION", "2", "HEADER", "9", "$INSUNITS", "70", "4", "0", "ENDSEC",
  "0", "SECTION", "2", "ENTITIES",
  "0", "LINE", "8", "GEO", "10", "0.0", "20", "0.0", "11", "50.0", "21", "0.0",
  "0", "DIMENSION", "8", "DIM", "70", "0", "42", "25.4", "1", "25.4", "10", "1.0", "20", "1.0",
  "0", "TEXT", "8", "NOTES", "10", "5.0", "20", "60.0", "1", "PART: ABC-123 REV: B",
  "0", "ENDSEC", "0", "EOF",
].join("\n");

let tmpDxf: string;

beforeAll(() => {
  const server = makeStubServer();
  registerResourceExtractionDispatcher(server as any);
  const tool = server.tools.find((t) => t.name === "prism_resource_extraction");
  if (!tool) throw new Error("prism_resource_extraction tool was not registered");
  handler = tool.handler;

  tmpDxf = path.join(os.tmpdir(), `prism-xray-drawing-extract-${process.pid}.dxf`);
  fs.writeFileSync(tmpDxf, DXF_MM, "utf-8");
});

afterAll(() => {
  try { fs.rmSync(tmpDxf, { force: true }); } catch { /* best-effort cleanup */ }
});

describe("prism_resource_extraction:drawing_extract -> real DXF file (round-trip)", () => {
  it("reads the real .dxf off disk and returns real parsed dimensions", async () => {
    const res = await invoke("drawing_extract", { path: tmpDxf });
    expect(res.success).toBe(true);
    expect(res.metadata.units).toBe("mm");
    expect(Array.isArray(res.dimensions)).toBe(true);
    expect(res.dimensions).toHaveLength(1);
    expect(res.dimensions[0].value).toBeCloseTo(25.4, 5);
    expect(res.dimensions[0].unit).toBe("mm");
    expect(res.partInfo.partNumber).toBe("ABC-123");
  });

  it("requires a path", async () => {
    const res = await invoke("drawing_extract", {});
    expect(res.error).toMatch(/path is required/i);
  });

  it("degrades to empty-success when the .dxf file is missing (read failure caught)", async () => {
    const res = await invoke("drawing_extract", { path: "/no/such/file/missing.dxf" });
    expect(res.success).toBe(true);
    expect(res.metadata.format).toBe("dxf");
    expect(res.dimensions ?? []).toHaveLength(0); // slimResponse strips the empty array
  });

  it("lets explicit dimensions override the file read (no fs path taken)", async () => {
    const res = await invoke("drawing_extract", {
      path: tmpDxf,
      dimensions: [{ id: "d1", type: "linear", value: 99, unit: "mm", text: "99" }],
    });
    expect(res.dimensions).toHaveLength(1);
    expect(res.dimensions[0].value).toBe(99); // explicit override, not the parsed 25.4
  });

  it("accepts inline content (no file) and parses it", async () => {
    const res = await invoke("drawing_extract", { path: "inline.dxf", content: DXF_MM });
    expect(res.success).toBe(true);
    expect(res.dimensions).toHaveLength(1);
    expect(res.dimensions[0].value).toBeCloseTo(25.4, 5);
  });
});
