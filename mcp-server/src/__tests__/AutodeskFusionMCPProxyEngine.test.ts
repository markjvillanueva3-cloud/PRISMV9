/**
 * AutodeskFusionMCPProxyEngine tests — JSON-RPC client behavior + Python rendering.
 *
 * Mocks fetch; never touches the real Autodesk MCP server. The Function Index
 * engine is exercised against the real catalog already shipped in U-CAD-FIDX-FUS-01.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AutodeskFusionMCPProxyEngine,
  FUSION_TOOL_NAMES,
  pythonRepr,
  renderPythonScript,
  type FetchLike,
} from "../engines/AutodeskFusionMCPProxyEngine.js";
import { Fusion360CADFunctionIndexEngine } from "../engines/Fusion360CADFunctionIndexEngine.js";

// ── JSON-RPC 2.0 standard error codes (RFC) ─────────────────────────────────
const JSONRPC_METHOD_NOT_FOUND = -32601;
const JSONRPC_INTERNAL_ERROR = -32603;

// ── Test helpers ────────────────────────────────────────────────────────────

interface CapturedCall {
  url: string;
  body: { jsonrpc: string; id: string; method: string; params?: Record<string, unknown> };
}

function mockFetch(responses: Array<{ result?: unknown; error?: { code: number; message: string } }>): {
  fetchImpl: FetchLike;
  calls: CapturedCall[];
} {
  const calls: CapturedCall[] = [];
  let i = 0;
  const fetchImpl: FetchLike = async (url, init) => {
    const parsed = JSON.parse(init.body) as CapturedCall["body"];
    calls.push({ url, body: parsed });
    const next = responses[i] ?? { error: { code: JSONRPC_INTERNAL_ERROR, message: "no mock response queued" } };
    i += 1;
    const envelope = {
      jsonrpc: "2.0",
      id: parsed.id,
      ...(next.error ? { error: next.error } : { result: next.result }),
    };
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      async text() {
        return JSON.stringify(envelope);
      },
      async json() {
        return envelope;
      },
    };
  };
  return { fetchImpl, calls };
}

// ============================================================================
// pythonRepr — pure value rendering
// ============================================================================

describe("pythonRepr", () => {
  it("renders primitives as Python literals", () => {
    expect(pythonRepr(null)).toBe("None");
    expect(pythonRepr(undefined)).toBe("None");
    expect(pythonRepr(true)).toBe("True");
    expect(pythonRepr(false)).toBe("False");
    expect(pythonRepr(42)).toBe("42");
    expect(pythonRepr(3.14)).toBe("3.14");
    expect(pythonRepr(0)).toBe("0");
    expect(pythonRepr(-1)).toBe("-1");
  });

  it("renders strings with Python-compatible escaping", () => {
    expect(pythonRepr("hello")).toBe('"hello"');
    expect(pythonRepr("with \"quote\"")).toBe('"with \\"quote\\""');
    expect(pythonRepr("")).toBe('""');
  });

  it("renders non-finite floats as float('nan')", () => {
    expect(pythonRepr(Number.POSITIVE_INFINITY)).toBe("float('nan')");
    expect(pythonRepr(Number.NaN)).toBe("float('nan')");
  });

  it("renders arrays recursively", () => {
    expect(pythonRepr([1, 2, 3])).toBe("[1, 2, 3]");
    expect(pythonRepr(["a", "b"])).toBe('["a", "b"]');
    expect(pythonRepr([])).toBe("[]");
    expect(pythonRepr([[1, 2], [3]])).toBe("[[1, 2], [3]]");
  });

  it("renders plain objects as Python dicts", () => {
    expect(pythonRepr({ x: 1, y: 2 })).toBe('{"x": 1, "y": 2}');
    expect(pythonRepr({ nested: { a: true } })).toBe('{"nested": {"a": True}}');
    expect(pythonRepr({})).toBe("{}");
  });

  it("throws on unsupported value types", () => {
    expect(() => pythonRepr(Symbol("x"))).toThrow(/unsupported value type/);
    expect(() => pythonRepr(() => 1)).toThrow(/unsupported value type/);
  });
});

// ============================================================================
// renderPythonScript — script structure
// ============================================================================

describe("renderPythonScript", () => {
  it("emits the mandatory `def run(_context):` entry point", () => {
    const script = renderPythonScript("adsk.fusion.SketchLines.addByTwoPoints", {});
    expect(script).toContain("def run(_context: str):");
    expect(script).toContain("import adsk.core, adsk.fusion, traceback");
  });

  it("invokes the python_api binding with provided kwargs in source order", () => {
    const script = renderPythonScript("adsk.fusion.SketchCircles.addByCenterRadius", {
      center: { x: 0, y: 0 },
      radius: 5.0,
    });
    expect(script).toContain("adsk.fusion.SketchCircles.addByCenterRadius(");
    expect(script).toContain('center={"x": 0, "y": 0}');
    expect(script).toContain("radius=5,");
  });

  it("prints the repr of the result so the LLM can read structured output", () => {
    const script = renderPythonScript("adsk.fusion.SketchLines.addByTwoPoints", {});
    expect(script).toContain("print(repr(result))");
  });

  it("re-raises exceptions after logging so script failures surface in tool output", () => {
    const script = renderPythonScript("adsk.fusion.SketchLines.addByTwoPoints", {});
    expect(script).toContain("except Exception as e:");
    expect(script).toContain("PRISM_ERROR:");
    expect(script).toContain("traceback.format_exc()");
    expect(script).toContain("raise");
  });

  it("renders empty params as a parameterless call", () => {
    const script = renderPythonScript("adsk.core.Application.get", {});
    expect(script).toMatch(/adsk\.core\.Application\.get\(\s*\)/);
  });
});

// ============================================================================
// AutodeskFusionMCPProxyEngine — JSON-RPC client
// ============================================================================

describe("AutodeskFusionMCPProxyEngine", () => {
  describe("construction + defaults", () => {
    it("uses 127.0.0.1:27182/mcp as the default endpoint", () => {
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl: mockFetch([]).fetchImpl });
      expect(proxy.getEndpoint()).toBe("http://127.0.0.1:27182/mcp");
    });

    it("respects custom endpoint override", () => {
      const proxy = new AutodeskFusionMCPProxyEngine({
        endpoint: "http://localhost:9999/mcp",
        fetchImpl: mockFetch([]).fetchImpl,
      });
      expect(proxy.getEndpoint()).toBe("http://localhost:9999/mcp");
    });

    it("starts uninitialized", () => {
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl: mockFetch([]).fetchImpl });
      expect(proxy.isInitialized()).toBe(false);
    });
  });

  describe("FUSION_TOOL_NAMES — static registry", () => {
    it("enumerates exactly the 5 tools exposed by the Autodesk MCP server", () => {
      expect(FUSION_TOOL_NAMES).toEqual([
        "fusion_mcp_execute",
        "fusion_mcp_read",
        "fusion_mcp_update",
        "fusion_mcp_edit_image",
        "fusion_mcp_preview_image",
      ]);
    });
  });

  describe("send() — JSON-RPC envelope", () => {
    it("posts a JSON-RPC 2.0 request with method, id, and params", async () => {
      const { fetchImpl, calls } = mockFetch([{ result: { ok: true } }]);
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl });
      const result = await proxy.send<{ ok: boolean }>("test/method", { hello: "world" });

      expect(result).toEqual({ ok: true });
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe("http://127.0.0.1:27182/mcp");
      expect(calls[0].body.jsonrpc).toBe("2.0");
      expect(calls[0].body.method).toBe("test/method");
      expect(calls[0].body.params).toEqual({ hello: "world" });
      expect(calls[0].body.id).toMatch(/^prism-\d+-\d+$/);
    });

    it("throws when the server returns a JSON-RPC error envelope", async () => {
      const { fetchImpl } = mockFetch([
        { error: { code: JSONRPC_METHOD_NOT_FOUND, message: "Method not found" } },
      ]);
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl });
      await expect(proxy.send("missing/method")).rejects.toThrow(
        `Fusion MCP error ${JSONRPC_METHOD_NOT_FOUND}: Method not found`
      );
    });

    it("throws on HTTP failure", async () => {
      const fetchImpl: FetchLike = async () => ({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        async text() {
          return "down";
        },
        async json() {
          return {};
        },
      });
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl });
      await expect(proxy.send("anything")).rejects.toThrow("Fusion MCP HTTP 503 Service Unavailable");
    });

    it("aborts the request after timeoutMs and surfaces the abort", async () => {
      const PROVIDER_DELAY_MS = 200;
      const PROXY_TIMEOUT_MS = 10;
      const fetchImpl: FetchLike = (_url, _init) =>
        new Promise((_resolve, reject) => {
          setTimeout(() => reject(new Error("aborted")), PROVIDER_DELAY_MS);
        });
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl, timeoutMs: PROXY_TIMEOUT_MS });
      await expect(proxy.send("slow/method")).rejects.toThrow("aborted");
    });
  });

  describe("initialize()", () => {
    it("performs the MCP handshake and flips isInitialized()", async () => {
      const { fetchImpl, calls } = mockFetch([
        {
          result: {
            capabilities: { tools: { listChanged: false } },
            protocolVersion: "2024-11-05",
            serverInfo: { name: "MCP Server Adapter", version: "1.0.0" },
          },
        },
      ]);
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl });
      const result = await proxy.initialize();

      expect(proxy.isInitialized()).toBe(true);
      expect(result.protocolVersion).toBe("2024-11-05");
      expect(result.serverInfo.name).toBe("MCP Server Adapter");
      expect(calls[0].body.method).toBe("initialize");
      expect(calls[0].body.params).toMatchObject({
        protocolVersion: "2024-11-05",
        clientInfo: { name: "prism-cad-mcp-proxy", version: "1.0.0" },
      });
    });
  });

  describe("listTools()", () => {
    it("returns the server-advertised tool registry", async () => {
      const { fetchImpl, calls } = mockFetch([
        {
          result: {
            tools: [
              {
                name: "fusion_mcp_execute",
                description: "Execute operations",
                inputSchema: { type: "object", properties: {} },
              },
            ],
          },
        },
      ]);
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl });
      const tools = await proxy.listTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe("fusion_mcp_execute");
      expect(tools[0].description).toBe("Execute operations");
      expect(calls[0].body.method).toBe("tools/list");
    });
  });

  describe("fusion_mcp_execute wrappers", () => {
    let fetchImpl: FetchLike;
    let calls: CapturedCall[];

    beforeEach(() => {
      const m = mockFetch([
        { result: { content: [{ type: "text", text: "ok" }] } },
        { result: { content: [{ type: "text", text: "ok" }] } },
        { result: { content: [{ type: "text", text: "ok" }] } },
        { result: { content: [{ type: "text", text: "ok" }] } },
      ]);
      fetchImpl = m.fetchImpl;
      calls = m.calls;
    });

    it("executeScript wraps content in featureType=script", async () => {
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl });
      await proxy.executeScript("def run(_c): pass");
      expect(calls[0].body.method).toBe("tools/call");
      expect(calls[0].body.params).toEqual({
        name: "fusion_mcp_execute",
        arguments: { featureType: "script", object: { script: "def run(_c): pass" } },
      });
    });

    it("openDocument routes through document.open with fileId", async () => {
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl });
      await proxy.openDocument("urn:adsk.wipprod:dm.lineage:abc");
      expect(calls[0].body.params).toEqual({
        name: "fusion_mcp_execute",
        arguments: {
          featureType: "document",
          object: { operation: "open", fileId: "urn:adsk.wipprod:dm.lineage:abc" },
        },
      });
    });

    it("closeDocument with saveChanges=true sets only userConfirmedSaveAndClose", async () => {
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl });
      await proxy.closeDocument({ saveChanges: true });
      const args = calls[0].body.params as { arguments: { object: Record<string, unknown> } };
      expect(args.arguments.object).toEqual({ operation: "close", userConfirmedSaveAndClose: true });
    });

    it("closeDocument with saveChanges=false sets only userConfirmedCloseWithoutSave", async () => {
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl });
      await proxy.closeDocument({ saveChanges: false });
      const args = calls[0].body.params as { arguments: { object: Record<string, unknown> } };
      expect(args.arguments.object).toEqual({ operation: "close", userConfirmedCloseWithoutSave: true });
    });

    it("closeDocument with no saveChanges sends only operation=close", async () => {
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl });
      await proxy.closeDocument();
      const args = calls[0].body.params as { arguments: { object: Record<string, unknown> } };
      expect(args.arguments.object).toEqual({ operation: "close" });
    });

    it("saveDocument sends operation=save", async () => {
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl });
      await proxy.saveDocument();
      expect(calls[0].body.params).toEqual({
        name: "fusion_mcp_execute",
        arguments: { featureType: "document", object: { operation: "save" } },
      });
    });
  });

  describe("fusion_mcp_read wrappers", () => {
    it("listProjects sends queryType=projects", async () => {
      const { fetchImpl, calls } = mockFetch([{ result: { content: [{ type: "text", text: "[]" }] } }]);
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl });
      await proxy.listProjects();
      expect(calls[0].body.params).toEqual({
        name: "fusion_mcp_read",
        arguments: { queryType: "projects" },
      });
    });

    it("searchDocuments sends queryType=document operation=search with fuzzy name", async () => {
      const { fetchImpl, calls } = mockFetch([{ result: { content: [{ type: "text", text: "[]" }] } }]);
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl });
      await proxy.searchDocuments("bracket", "ProjectAlpha");
      expect(calls[0].body.params).toEqual({
        name: "fusion_mcp_read",
        arguments: {
          queryType: "document",
          operation: "search",
          name: "bracket",
          project: "ProjectAlpha",
        },
      });
    });

    it("searchDocuments without project omits the project key entirely", async () => {
      const { fetchImpl, calls } = mockFetch([{ result: { content: [{ type: "text", text: "[]" }] } }]);
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl });
      await proxy.searchDocuments("widget");
      expect(calls[0].body.params).toEqual({
        name: "fusion_mcp_read",
        arguments: { queryType: "document", operation: "search", name: "widget" },
      });
    });

    it("readApiDoc forwards apiCategory + filter when provided", async () => {
      const { fetchImpl, calls } = mockFetch([{ result: { content: [{ type: "text", text: "{}" }] } }]);
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl });
      await proxy.readApiDoc("Extrude", { apiCategory: "class", filter: "adsk.fusion" });
      expect(calls[0].body.params).toEqual({
        name: "fusion_mcp_read",
        arguments: {
          queryType: "apiDocumentation",
          searchPattern: "Extrude",
          apiCategory: "class",
          filter: "adsk.fusion",
        },
      });
    });

    it("screenshot defaults to no extra params", async () => {
      const { fetchImpl, calls } = mockFetch([
        { result: { content: [{ type: "image", data: "iVBORw0KGgo=", mimeType: "image/png" }] } },
      ]);
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl });
      await proxy.screenshot();
      expect(calls[0].body.params).toEqual({
        name: "fusion_mcp_read",
        arguments: { queryType: "screenshot" },
      });
    });

    it("screenshot forwards width/height/direction when given", async () => {
      const { fetchImpl, calls } = mockFetch([
        { result: { content: [{ type: "image", data: "iVBORw0KGgo=", mimeType: "image/png" }] } },
      ]);
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl });
      await proxy.screenshot({ width: 1024, height: 768, direction: "iso-top-right", antiAliasing: true });
      expect(calls[0].body.params).toEqual({
        name: "fusion_mcp_read",
        arguments: {
          queryType: "screenshot",
          width: 1024,
          height: 768,
          direction: "iso-top-right",
          antiAliasing: true,
        },
      });
    });
  });

  describe("fusion_mcp_update wrappers", () => {
    it("undo sends featureType=undo", async () => {
      const { fetchImpl, calls } = mockFetch([{ result: { content: [{ type: "text", text: "ok" }] } }]);
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl });
      await proxy.undo();
      expect(calls[0].body.params).toEqual({
        name: "fusion_mcp_update",
        arguments: { featureType: "undo" },
      });
    });

    it("redo sends featureType=redo", async () => {
      const { fetchImpl, calls } = mockFetch([{ result: { content: [{ type: "text", text: "ok" }] } }]);
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl });
      await proxy.redo();
      expect(calls[0].body.params).toEqual({
        name: "fusion_mcp_update",
        arguments: { featureType: "redo" },
      });
    });
  });

  describe("executeOperation — bridge to Function Index", () => {
    afterEach(() => {
      Fusion360CADFunctionIndexEngine.clearCache();
    });

    it("looks up the operation in the Function Index and renders Python from python_api", async () => {
      const { fetchImpl, calls } = mockFetch([{ result: { content: [{ type: "text", text: "ok" }] } }]);
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl });

      const op = Fusion360CADFunctionIndexEngine.getOperation("sketch_operations", "LINE");
      expect(op).not.toBeNull();
      // LINE op's python_api is the canonical Fusion sketchLines binding
      expect(op?.python_api).toBe("sketch.sketchCurves.sketchLines.addByTwoPoints");

      const { script, result } = await proxy.executeOperation("sketch_operations", "LINE", {
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 10, y: 0 },
      });

      expect(result.content[0].text).toBe("ok");
      expect(script).toContain("def run(_context: str):");
      expect(script).toContain(op!.python_api as string);
      expect(script).toContain('startPoint={"x": 0, "y": 0}');
      expect(script).toContain('endPoint={"x": 10, "y": 0}');

      expect(calls[0].body.params).toMatchObject({
        name: "fusion_mcp_execute",
        arguments: { featureType: "script", object: { script } },
      });
    });

    it("throws when the operation is not registered in the Function Index", async () => {
      const { fetchImpl } = mockFetch([]);
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl });
      await expect(proxy.executeOperation("sketch_operations", "NOPE", {})).rejects.toThrow(
        "Operation sketch_operations/NOPE not found in Fusion360CADFunctionIndex"
      );
    });

    it("throws when the catalog operation has no python_api binding", async () => {
      const { fetchImpl } = mockFetch([]);
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl });
      const spy = vi.spyOn(Fusion360CADFunctionIndexEngine, "getOperation").mockReturnValue({
        description: "test op without python binding",
        category: "Sketch_Primitive",
      });
      try {
        await expect(proxy.executeOperation("sketch_operations", "LINE", {})).rejects.toThrow(
          "Operation sketch_operations/LINE has no python_api binding — cannot execute"
        );
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe("callTool — generic dispatch", () => {
    it("forwards arguments verbatim under tools/call envelope", async () => {
      const { fetchImpl, calls } = mockFetch([{ result: { content: [] } }]);
      const proxy = new AutodeskFusionMCPProxyEngine({ fetchImpl });
      await proxy.callTool("fusion_mcp_edit_image", {
        image_url: "https://example.com/m.png",
        s3_url: "s3://b/m.png",
        prompt: "render in kitchen",
      });
      expect(calls[0].body.method).toBe("tools/call");
      expect(calls[0].body.params).toEqual({
        name: "fusion_mcp_edit_image",
        arguments: {
          image_url: "https://example.com/m.png",
          s3_url: "s3://b/m.png",
          prompt: "render in kitchen",
        },
      });
    });
  });
});
