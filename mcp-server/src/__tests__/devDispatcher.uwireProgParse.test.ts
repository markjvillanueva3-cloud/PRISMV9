/**
 * devDispatcher U-WIRE-PROGPARSE round-trip tests -- UnifiedProgramParserEngine.
 *
 * Validates the new program_parse_content action wires through prism_dev:
 *   program_parse_content -> unifiedProgramParser.parseContent(content, filePath)
 *
 * parseContent is the PURE half of the engine (string -> ParsedProgram). The fs-bound
 * parseFile/parseArchive are deliberately NOT wired (a JSON dispatcher must not read
 * the filesystem on the caller's behalf). parseContent is fail-soft: an unsupported
 * format yields a ParsedProgram with warnings[] + low confidence, never a throw -- so
 * there is no fail-loud throw path to test here (the wire-correctness proof is the
 * structured ParsedProgram returning through the dispatcher).
 *
 * Pattern mirrors devDispatcher.uwireEntropy/uwireCohortShim/uwireHzpAudit.
 *
 * Wired slot:papa 2026-06-15 -- WIRE-UNWIRED-PAPA cross-galaxy v2
 * (galaxy:echo/india engine wired into prism_dev, papa's home dispatcher).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-PROGPARSE
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { unifiedProgramParser } from "../engines/UnifiedProgramParserEngine.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) &&
      ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

// A realistic generic-ISO / Fanuc-style program (deterministic).
const REAL_PROG = [
  "%",
  "O1234 (TEST PART)",
  "N10 G21 G90",
  "N20 G0 X0. Y0.",
  "N30 T1 M6",
  "N40 G43 H1 Z5.",
  "N50 G1 Z-2. F100",
  "N60 G0 Z25.",
  "N70 M30",
  "%",
].join("\n");

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

// -- Engine-direct contract + reference behavior -----------------------------
describe("U-WIRE-PROGPARSE -- parseContent contract", () => {
  it("returns a fully-shaped ParsedProgram for a real program", () => {
    const p = unifiedProgramParser.parseContent(REAL_PROG, "O1234.nc");
    expect(typeof p.parse_confidence).toBe("number");
    expect(p.parse_confidence).toBeGreaterThanOrEqual(0);
    expect(p.parse_confidence).toBeLessThanOrEqual(1);
    expect(typeof p.line_count).toBe("number");
    expect(p.line_count).toBeGreaterThan(0);
    expect(Array.isArray(p.operations)).toBe(true);
    expect(Array.isArray(p.tool_calls)).toBe(true);
    expect(Array.isArray(p.work_offsets)).toBe(true);
    expect(Array.isArray(p.warnings)).toBe(true);
    expect(typeof p.total_tool_count).toBe("number");
    expect(p.format).toBeTruthy(); // ExtractedField wrapper present
    expect(typeof p.has_threading).toBe("boolean");
    expect(typeof p.has_live_tooling).toBe("boolean");
  });

  it("line_count grows with program length (parsing tracks content, not a stub)", () => {
    const short = unifiedProgramParser.parseContent("G21\nM30\n", "a.nc");
    const long = unifiedProgramParser.parseContent(REAL_PROG, "b.nc");
    expect(long.line_count).toBeGreaterThan(short.line_count);
  });

  it("a real program parses with higher confidence than non-program junk", () => {
    const real = unifiedProgramParser.parseContent(REAL_PROG, "O1234.nc");
    const junk = unifiedProgramParser.parseContent("lorem ipsum dolor sit amet, not a program at all", "notes.txt");
    expect(junk.parse_confidence).toBeLessThan(real.parse_confidence);
  });

  it("is fail-soft: whitespace-only content returns a ParsedProgram, never throws", () => {
    expect(() => unifiedProgramParser.parseContent("   \n  \n", "blank.nc")).not.toThrow();
    const p = unifiedProgramParser.parseContent("   \n  \n", "blank.nc");
    expect(typeof p.parse_confidence).toBe("number");
    expect(Array.isArray(p.warnings)).toBe(true);
  });
});

// -- LIVE round-trip through prism_dev (the wire proof) -----------------------
describe("U-WIRE-PROGPARSE -- dispatcher round-trip (prism_dev)", () => {
  it("program_parse_content returns exactly the engine's ParsedProgram through the dispatcher", async () => {
    const direct = unifiedProgramParser.parseContent(REAL_PROG, "O1234.nc");
    const r = await call(server, "program_parse_content", { content: REAL_PROG, filePath: "O1234.nc" });
    expect(r.ok).toBe(true);
    // Faithful wire: the dispatcher returns the same values the engine computed (numeric survivors).
    expect(r.data.line_count).toBe(direct.line_count);
    expect(r.data.parse_confidence).toBe(direct.parse_confidence);
    expect(r.data.total_tool_count).toBe(direct.total_tool_count);
    expect((r.data.format as { value?: unknown }).value).toBe(direct.format.value);
  });

  it("is fail-soft through the dispatcher: junk content still returns ok:true (not an error)", async () => {
    const r = await call(server, "program_parse_content", { content: "not a program", filePath: "notes.txt" });
    expect(r.ok).toBe(true); // graceful degradation -> warnings/low confidence, NOT a dispatcher error
  });

  it("the program_parse_content action is accepted by the registered dispatcher", async () => {
    const r = await call(server, "program_parse_content", { content: REAL_PROG, filePath: "O1234.nc" });
    expect(r.ok).toBe(true);
  });
});

// -- Schema validation through the dispatcher (adversarial) -------------------
describe("U-WIRE-PROGPARSE -- schema rejection (prism_dev)", () => {
  it("rejects a missing content", async () => {
    const r = await call(server, "program_parse_content", { filePath: "O1234.nc" });
    expect(r.ok).toBe(false);
  });

  it("rejects an empty content (min 1)", async () => {
    const r = await call(server, "program_parse_content", { content: "", filePath: "O1234.nc" });
    expect(r.ok).toBe(false);
  });

  it("accepts a missing filePath (optional hint -> content-only sniff)", async () => {
    const direct = unifiedProgramParser.parseContent(REAL_PROG, "");
    const r = await call(server, "program_parse_content", { content: REAL_PROG });
    expect(r.ok).toBe(true); // filePath optional; engine sniffs format from content (coerced to "")
    expect(r.data.line_count).toBe(direct.line_count);
  });
});
