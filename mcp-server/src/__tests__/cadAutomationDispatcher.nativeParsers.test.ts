/**
 * cadAutomationDispatcher.nativeParsers.test.ts — U-CGT01 / U-CGT02 dispatcher E2E
 *
 * Drives the three native-parser actions through the real `prism_cad_automation`
 * dispatcher:
 *   - fcstd_parse  → FCStdNativeParserEngine.parse  (U-CGT01, FreeCAD .FCStd)
 *   - f3d_parse    → F3DSQLiteParserEngine.parse    (U-CGT02, Fusion .f3d)
 *   - f3z_parse    → F3DSQLiteParserEngine.parseF3Z (U-CGT02, Fusion .f3z)
 *
 * Verifies action-enum membership, end-to-end happy path with a synthetic .FCStd
 * ZIP written to a temp directory, error-result pass-through for missing files
 * and malformed archives, and adversarial input handling. No CAD applications
 * required.
 *
 * @milestone CAD-GROUND-TRUTH-MS0 / U-CGT01 / U-CGT02
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as zlib from "node:zlib";

import {
  registerCadAutomationDispatcher,
  CAD_AUTOMATION_ACTIONS,
} from "../tools/dispatchers/cadAutomationDispatcher.js";

// ── Minimal PKZIP §4.3 builder (DEFLATE, single-disk, no encryption) ─────────

function crc32(buf: Buffer): number {
  const TABLE: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    TABLE[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = TABLE[(crc ^ buf[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZip(files: Array<{ name: string; content: Buffer }>): Buffer {
  const localChunks: Buffer[] = [];
  const cdChunks: Buffer[] = [];
  let localOffset = 0;
  for (const f of files) {
    const nameBytes = Buffer.from(f.name, "utf-8");
    const compressed = zlib.deflateRawSync(f.content, { level: 6 });
    const crc = crc32(f.content);

    // Local file header: 0:sig 4:ver 6:flags 8:method 10:time 12:date 14:crc
    //                    18:compSize 22:uncompSize 26:nameLen 28:extraLen
    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(f.content.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    nameBytes.copy(local, 30);
    localChunks.push(local, compressed);

    // Central directory entry
    const cd = Buffer.alloc(46 + nameBytes.length);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(compressed.length, 20);
    cd.writeUInt32LE(f.content.length, 24);
    cd.writeUInt16LE(nameBytes.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(localOffset, 42);
    nameBytes.copy(cd, 46);
    cdChunks.push(cd);
    localOffset += local.length + compressed.length;
  }
  const localData = Buffer.concat(localChunks);
  const centralDir = Buffer.concat(cdChunks);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(localData.length, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([localData, centralDir, eocd]);
}

const FCSTD_DOC_XML = `<?xml version='1.0' encoding='utf-8'?>
<Document SchemaVersion="4" ProgramVersion="0.21.2.33771">
  <Properties>
    <Property name="Label" type="App::PropertyString">
      <String value="DispatcherTest"/>
    </Property>
  </Properties>
  <Objects Count="1">
    <Object type="Part::Box" name="Box" label="Box001"/>
  </Objects>
  <ObjectData Count="1">
    <Object name="Box" type="Part::Box" label="Box001">
      <Properties>
        <Property name="Length" type="App::PropertyLength"><Length value="10.0"/></Property>
        <Property name="Width"  type="App::PropertyLength"><Length value="20.0"/></Property>
        <Property name="Height" type="App::PropertyLength"><Length value="30.0"/></Property>
      </Properties>
    </Object>
  </ObjectData>
</Document>`;

// ── Dispatcher harness ───────────────────────────────────────────────────────

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer() {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
      tools.push({ name, description, schema, handler });
    },
  };
}

let handler: CapturedTool["handler"];
let tmpDir: string;

async function invoke(
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const arr = (res as { content: Array<{ text?: string }> }).content;
    const text = arr[0]?.text ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

beforeAll(() => {
  const server = makeStubServer();
  registerCadAutomationDispatcher(
    server as unknown as Parameters<typeof registerCadAutomationDispatcher>[0],
  );
  const tool = server.tools.find((t) => t.name === "prism_cad_automation");
  if (!tool) throw new Error("prism_cad_automation tool was not registered");
  handler = tool.handler;
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-cgt-disp-"));
});

afterAll(() => {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* non-fatal */
  }
});

// ── Action surface — action enum is a contract with downstream consumers ─────

describe("cadAutomationDispatcher — U-CGT01/02 native-parser action surface", () => {
  const actions = CAD_AUTOMATION_ACTIONS as readonly string[];

  it("registers fcstd_parse in the action enum", () => {
    expect(actions.includes("fcstd_parse")).toBe(true);
  });

  it("registers f3d_parse in the action enum", () => {
    expect(actions.includes("f3d_parse")).toBe(true);
  });

  it("registers f3z_parse in the action enum", () => {
    expect(actions.includes("f3z_parse")).toBe(true);
  });

  it("does not duplicate the new actions in the enum", () => {
    const duplicated = actions.filter(
      (a) => a === "fcstd_parse" || a === "f3d_parse" || a === "f3z_parse",
    );
    expect(duplicated.length).toBe(3);
  });
});

// ── fcstd_parse — happy path through dispatcher with a real synthetic FCStd ──

describe("cadAutomationDispatcher — fcstd_parse (U-CGT01)", () => {
  it("parses a synthetic .FCStd zip on disk and returns a Box object with non-zero coverage", async () => {
    const zip = buildZip([{ name: "Document.xml", content: Buffer.from(FCSTD_DOC_XML, "utf-8") }]);
    const fp = path.join(tmpDir, "happy.FCStd");
    fs.writeFileSync(fp, zip);

    const out = await invoke("fcstd_parse", { filePath: fp });
    const v = out["value"] as Record<string, unknown>;

    expect(v["format"]).toBe("FCStd");
    const objects = v["objects"] as Array<Record<string, unknown>>;
    expect(objects.length).toBe(1);
    expect(objects[0]!["type"]).toBe("Part::Box");
    expect(objects[0]!["name"]).toBe("Box");
    expect(typeof v["coverage"]).toBe("number");
    expect((v["coverage"] as number) > 0).toBe(true);
    expect(out["confidence"]).toBe(v["coverage"]);
    expect(typeof out["source"]).toBe("string");
    expect(String(out["source"])).toMatch(/FCStdNativeParserEngine/);
  });

  it("returns an error AtomicValue (confidence=0, warning=File not found) for a missing path", async () => {
    const fp = path.join(tmpDir, "does-not-exist.FCStd");
    const out = await invoke("fcstd_parse", { filePath: fp });

    // slimResponse strips empty arrays; presence of `value.format` + warning string
    // is the engine-error contract for downstream consumers.
    expect(out["confidence"]).toBe(0);
    expect(String(out["source"])).toBe("FCStdNativeParserEngine:error");
    expect(String(out["warning"])).toMatch(/File not found/);
    const v = out["value"] as Record<string, unknown>;
    expect(v["format"]).toBe("FCStd");
    expect((v["coverage"] as number)).toBe(0);
    const warnings = v["warnings"] as string[];
    expect(warnings[0]).toMatch(/File not found/);
  });

  it("returns an error result for a zip without Document.xml", async () => {
    const zip = buildZip([{ name: "OtherFile.bin", content: Buffer.from([1, 2, 3, 4]) }]);
    const fp = path.join(tmpDir, "noxml.FCStd");
    fs.writeFileSync(fp, zip);

    const out = await invoke("fcstd_parse", { filePath: fp });
    expect(out["confidence"]).toBe(0);
    expect(String(out["warning"])).toMatch(/Document\.xml/);
    expect(String(out["source"])).toBe("FCStdNativeParserEngine:error");
  });

  it("rejects empty filePath at the Zod schema layer (success=false, action+dispatcher echoed)", async () => {
    const out = await invoke("fcstd_parse", { filePath: "" });
    expect(out["success"]).toBe(false);
    expect(String(out["error"])).toMatch(/Invalid params for 'fcstd_parse'/);
    expect(String(out["error"])).toMatch(/filePath/);
    expect(out["action"]).toBe("fcstd_parse");
    expect(out["dispatcher"]).toBe("prism_cad_automation");
  });

  it("rejects a completely missing filePath param at the Zod schema layer", async () => {
    const out = await invoke("fcstd_parse", {});
    expect(out["success"]).toBe(false);
    expect(String(out["error"])).toMatch(/Invalid params for 'fcstd_parse'/);
    expect(String(out["error"])).toMatch(/filePath/);
  });
});

// ── f3d_parse — failure modes (synthetic SQLite happy path is owned by engine test) ─

describe("cadAutomationDispatcher — f3d_parse (U-CGT02)", () => {
  it("returns an empty result with a model.sqlite warning when the archive lacks the SQLite payload", async () => {
    const zip = buildZip([
      { name: "thumbnail.png", content: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
    ]);
    const fp = path.join(tmpDir, "no-sqlite.f3d");
    fs.writeFileSync(fp, zip);

    const out = await invoke("f3d_parse", { filePath: fp });
    const v = out["value"] as Record<string, unknown>;

    // slimResponse drops empty timeline/bodies/parameters arrays, so we assert
    // on populated fields: format, coverage, the warning that names the missing
    // payload, and the engine source string.
    expect(v["format"]).toBe("f3d");
    expect((v["coverage"] as number)).toBe(0);
    const warnings = v["warnings"] as string[];
    expect(warnings.some((w) => /model\.sqlite/i.test(w))).toBe(true);
    expect(out["confidence"]).toBe(0);
    expect(String(out["source"])).toMatch(/F3DSQLiteParserEngine/);
  });

  it("returns an empty result with a ZIP-parse warning when given a non-ZIP buffer", async () => {
    const fp = path.join(tmpDir, "notazip.f3d");
    fs.writeFileSync(fp, Buffer.from("this is not a zip file at all", "utf-8"));

    const out = await invoke("f3d_parse", { filePath: fp });
    const v = out["value"] as Record<string, unknown>;
    expect(v["format"]).toBe("f3d");
    expect((v["coverage"] as number)).toBe(0);
    const warnings = v["warnings"] as string[];
    expect(warnings.length > 0).toBe(true);
  });
});

// ── f3z_parse — multi-document archive ───────────────────────────────────────

describe("cadAutomationDispatcher — f3z_parse (U-CGT02)", () => {
  it("returns count=1 with a single empty-result document when no .f3d entries are present", async () => {
    const zip = buildZip([{ name: "manifest.json", content: Buffer.from("{}", "utf-8") }]);
    const fp = path.join(tmpDir, "empty.f3z");
    fs.writeFileSync(fp, zip);

    const out = await invoke("f3z_parse", { filePath: fp });
    expect(out["count"]).toBe(1);
    const docs = out["documents"] as Array<Record<string, unknown>>;
    expect(docs.length).toBe(1);

    const dv = docs[0]!["value"] as Record<string, unknown>;
    expect(dv["format"]).toBe("f3z");
    expect((dv["coverage"] as number)).toBe(0);
    const warnings = dv["warnings"] as string[];
    expect(warnings.some((w) => /\.f3d/i.test(w))).toBe(true);
  });

  it("preserves count=N when the .f3z bundles multiple inner .f3d archives (each tagged as f3z)", async () => {
    // Build two inner .f3d zips (each missing model.sqlite — that's fine, we're testing fan-out).
    const inner1 = buildZip([{ name: "thumbnail.png", content: Buffer.from([1]) }]);
    const inner2 = buildZip([{ name: "thumbnail.png", content: Buffer.from([2]) }]);
    const outer = buildZip([
      { name: "DocumentA.f3d", content: inner1 },
      { name: "DocumentB.f3d", content: inner2 },
    ]);
    const fp = path.join(tmpDir, "multi.f3z");
    fs.writeFileSync(fp, outer);

    const out = await invoke("f3z_parse", { filePath: fp });
    expect(out["count"]).toBe(2);
    const docs = out["documents"] as Array<Record<string, unknown>>;
    expect(docs.length).toBe(2);
    for (const d of docs) {
      const dv = d["value"] as Record<string, unknown>;
      expect(dv["format"]).toBe("f3z"); // parseF3Z re-tags inner f3d results as f3z
    }
  });
});
