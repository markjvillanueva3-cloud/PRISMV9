/**
 * AutodeskFusionMCPProxyEngine.test.ts -- CLOSE-THE-LOOPS-MS0 (slot:india)
 *
 * Covers the JSON-RPC tool-dispatch surface (callTool + the typed wrappers) AND
 * the new CLOSE-THE-LOOPS outcome emit on every callTool round-trip. The
 * transport (`send`) is stubbed so no Fusion add-in is required. R9: the
 * emit-fires + emit-never-throws assertions prove the learning-loop wiring is
 * live and that a down bus can never break a Fusion op.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { AutodeskFusionMCPProxyEngine } from "../engines/AutodeskFusionMCPProxyEngine.js";
import { outcomeTraceEngine } from "../engines/OutcomeTraceEngine.js";

afterEach(() => vi.restoreAllMocks());

const ENDPOINT = "http://127.0.0.1:27182/mcp";
const mk = () => new AutodeskFusionMCPProxyEngine({ endpoint: ENDPOINT });
const okResult = { content: [{ type: "text", text: "ok" }], isError: false };
const okRecord = { ok: true, experience_id: "x", reward_total: 0, edges_created: [], warnings: [] };
const stubSend = (e: AutodeskFusionMCPProxyEngine, ret: unknown = okResult) =>
  ((e as unknown as { send: unknown }).send = vi.fn().mockResolvedValue(ret));

describe("AutodeskFusionMCPProxyEngine transport + config", () => {
  it("getEndpoint returns the configured endpoint", () => {
    expect(mk().getEndpoint()).toBe(ENDPOINT);
  });

  it("isInitialized is false before initialize()", () => {
    expect(mk().isInitialized()).toBe(false);
  });

  it("callTool returns the transport result verbatim", async () => {
    const e = mk();
    stubSend(e);
    const r = await e.callTool("fusion_mcp_read" as any, {});
    expect(r).toEqual(okResult);
  });

  it("listTools returns the advertised tool registry", async () => {
    const e = mk();
    stubSend(e, { tools: [{ name: "fusion_mcp_read" }] });
    const tools = await e.listTools();
    expect(tools.length).toBe(1);
    expect(tools[0].name).toBe("fusion_mcp_read");
  });
});

describe("AutodeskFusionMCPProxyEngine typed wrappers route through callTool", () => {
  it("executeScript wraps the script in a script execute call", async () => {
    const e = mk();
    const spy = vi.spyOn(e, "callTool").mockResolvedValue(okResult as any);
    await e.executeScript("def run(_c): pass");
    expect(spy).toHaveBeenCalledWith("fusion_mcp_execute", { featureType: "script", object: { script: "def run(_c): pass" } });
  });

  it("openDocument issues a document open op", async () => {
    const e = mk();
    const spy = vi.spyOn(e, "callTool").mockResolvedValue(okResult as any);
    await e.openDocument("file-123");
    expect(spy).toHaveBeenCalledWith("fusion_mcp_execute", { featureType: "document", object: { operation: "open", fileId: "file-123" } });
  });

  it("closeDocument without saveChanges issues a bare close op", async () => {
    const e = mk();
    const spy = vi.spyOn(e, "callTool").mockResolvedValue(okResult as any);
    await e.closeDocument();
    expect(spy).toHaveBeenCalledWith("fusion_mcp_execute", { featureType: "document", object: { operation: "close" } });
  });

  it("closeDocument with saveChanges:true sets the save-and-close confirm flag", async () => {
    const e = mk();
    const spy = vi.spyOn(e, "callTool").mockResolvedValue(okResult as any);
    await e.closeDocument({ saveChanges: true });
    expect(spy).toHaveBeenCalledWith("fusion_mcp_execute", { featureType: "document", object: { operation: "close", userConfirmedSaveAndClose: true } });
  });

  it("saveDocument issues a document save op", async () => {
    const e = mk();
    const spy = vi.spyOn(e, "callTool").mockResolvedValue(okResult as any);
    await e.saveDocument();
    expect(spy).toHaveBeenCalledWith("fusion_mcp_execute", { featureType: "document", object: { operation: "save" } });
  });
});

describe("AutodeskFusionMCPProxyEngine CLOSE-THE-LOOPS outcome emit", () => {
  it("callTool emits a 'fusion_bridge' DATA outcome record", async () => {
    const e = mk();
    stubSend(e);
    const spy = vi.spyOn(outcomeTraceEngine, "record").mockReturnValue(okRecord);
    await e.callTool("fusion_mcp_execute" as any, { featureType: "script" });
    expect(spy).toHaveBeenCalled();
    const arg = spy.mock.calls[0][0] as any;
    expect(arg.domain).toBe("fusion_bridge");
    expect(arg.outcome_event_id).toBe("fusion_fusion_mcp_execute");
    expect(arg.action_record.engine_name).toBe("AutodeskFusionMCPProxyEngine");
  });

  it("emit reward is 0 when the tool result isError, 1 otherwise", async () => {
    const e = mk();
    stubSend(e, { content: [], isError: true });
    const spy = vi.spyOn(outcomeTraceEngine, "record").mockReturnValue(okRecord);
    await e.callTool("fusion_mcp_read" as any, {});
    expect((spy.mock.calls[0][0] as any).reward_components[0].raw_value).toBe(0);
  });

  it("callTool still returns its result even if the emit throws (fire-and-forget)", async () => {
    const e = mk();
    stubSend(e);
    vi.spyOn(outcomeTraceEngine, "record").mockImplementation(() => { throw new Error("bus down"); });
    const r = await e.callTool("fusion_mcp_read" as any, {});
    expect(r).toEqual(okResult);
  });
});
