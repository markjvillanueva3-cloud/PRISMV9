/**
 * AutodeskFusionMCPProxyEngine — JSON-RPC 2.0 client for Autodesk's official
 * Fusion 360 MCP Server (released 2026-04-28).
 *
 * The Autodesk add-in exposes a local MCP endpoint (default
 * http://127.0.0.1:27182/mcp) advertising 5 tools:
 *   - fusion_mcp_execute       — Python script + document open/close/save
 *   - fusion_mcp_read          — apiDocumentation, projects, document, screenshot
 *   - fusion_mcp_update        — undo/redo
 *   - fusion_mcp_edit_image    — AI material/scene render (consumes user quota)
 *   - fusion_mcp_preview_image — image preview/external/download
 *
 * This engine is the EXECUTION layer. The PLANNING layer is
 * Fusion360CADFunctionIndexEngine (22 sketch ops × 115 params shipped in
 * U-CAD-FIDX-FUS-01). executeOperation() bridges them: pick op + params from
 * the catalog → render Python from the op's `python_api` field → ship through
 * fusion_mcp_execute → optionally verify with fusion_mcp_read:screenshot.
 *
 * The class is dependency-free at module scope (lazy import of the function
 * index) so tests can stub fetch without dragging the catalog filesystem in.
 *
 * @engine AutodeskFusionMCPProxyEngine
 * @milestone CAD-FIDX-FUS-INT-01
 * @see Fusion360CADFunctionIndexEngine — planning-layer catalog
 * @see data/external/autodesk-fusion-mcp-introspect.json — probe output
 */

// ============================================================================
// JSON-RPC 2.0 types
// ============================================================================

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcSuccess<T> {
  jsonrpc: "2.0";
  id: string;
  result: T;
}

export interface JsonRpcFailure {
  jsonrpc: "2.0";
  id: string;
  error: { code: number; message: string; data?: unknown };
}

export type JsonRpcResponse<T> = JsonRpcSuccess<T> | JsonRpcFailure;

// ============================================================================
// MCP-shaped types (per protocol 2024-11-05)
// ============================================================================

export interface MCPInitializeResult {
  capabilities: {
    resources?: { listChanged?: boolean; subscribe?: boolean };
    tools?: { listChanged?: boolean };
  };
  protocolVersion: string;
  serverInfo: { name: string; version: string };
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: readonly string[];
  };
}

export interface MCPToolCallResult {
  content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
  isError?: boolean;
}

// ============================================================================
// Autodesk Fusion tool name registry
// ============================================================================

export const FUSION_TOOL_NAMES = [
  "fusion_mcp_execute",
  "fusion_mcp_read",
  "fusion_mcp_update",
  "fusion_mcp_edit_image",
  "fusion_mcp_preview_image",
] as const;

export type FusionToolName = (typeof FUSION_TOOL_NAMES)[number];

// ============================================================================
// Fetch abstraction so tests can mock without touching globals.
// ============================================================================

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  text(): Promise<string>;
  json(): Promise<unknown>;
}>;

export interface ProxyOptions {
  endpoint?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

// ============================================================================
// Engine
// ============================================================================

const DEFAULT_ENDPOINT = "http://127.0.0.1:27182/mcp";
const DEFAULT_TIMEOUT_MS = 30_000;

let __idCounter = 0;
function nextId(): string {
  __idCounter += 1;
  return `prism-${Date.now()}-${__idCounter}`;
}

export class AutodeskFusionMCPProxyEngine {
  private readonly endpoint: string;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;
  private initialized = false;

  constructor(opts: ProxyOptions = {}) {
    this.endpoint = opts.endpoint ?? DEFAULT_ENDPOINT;
    this.fetchImpl = opts.fetchImpl ?? ((globalThis as unknown as { fetch: FetchLike }).fetch);
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /** Endpoint URL the engine talks to (read-only after construction). */
  getEndpoint(): string {
    return this.endpoint;
  }

  /** Whether initialize() has been completed for this client instance. */
  isInitialized(): boolean {
    return this.initialized;
  }

  /** Low-level JSON-RPC send. Throws on transport error or JSON-RPC error envelope. */
  async send<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    const req: JsonRpcRequest = { jsonrpc: "2.0", id: nextId(), method, ...(params ? { params } : {}) };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);

    let res: Awaited<ReturnType<FetchLike>>;
    try {
      res = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(req),
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      throw new Error(`Fusion MCP HTTP ${res.status} ${res.statusText}`);
    }
    const body = (await res.json()) as JsonRpcResponse<T>;
    if ("error" in body) {
      throw new Error(`Fusion MCP error ${body.error.code}: ${body.error.message}`);
    }
    return body.result;
  }

  /** MCP handshake. Idempotent — subsequent calls are no-ops. */
  async initialize(): Promise<MCPInitializeResult> {
    const result = await this.send<MCPInitializeResult>("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "prism-cad-mcp-proxy", version: "1.0.0" },
    });
    this.initialized = true;
    return result;
  }

  /** Returns the tool registry advertised by the server. */
  async listTools(): Promise<MCPToolDefinition[]> {
    const result = await this.send<{ tools: MCPToolDefinition[] }>("tools/list");
    return result.tools;
  }

  /** Generic tool dispatch — preferred over the typed wrappers when caller already has args validated. */
  async callTool(name: FusionToolName, args: Record<string, unknown>): Promise<MCPToolCallResult> {
    const result = await this.send<MCPToolCallResult>("tools/call", { name, arguments: args });
    // CLOSE-THE-LOOPS-MS0: DATA-only outcome emit (fire-and-forget, off the Fusion critical path).
    try {
      const { emitPipelineOutcome } = await import("./pipelineOutcomeEmit.js");
      emitPipelineOutcome({
        domain: "fusion_bridge",
        engineName: "AutodeskFusionMCPProxyEngine",
        outcomeEventId: `fusion_${name}`,
        inline: { tool_name: name },
        adapted: { content_length: result?.content?.length ?? 0 },
        reward: { objective: "other", raw_value: result?.isError ? 0 : 1, sign_convention: "maximize" },
        metadata: { is_error: result?.isError ?? false },
      });
    } catch { /* never let an emit failure break a Fusion op */ }
    return result;
  }

  // ── fusion_mcp_execute wrappers ────────────────────────────────────────────

  /**
   * Execute a Python script in the active Fusion design.
   * Caller is responsible for embedding the mandatory `def run(_context):` entry point.
   */
  async executeScript(script: string): Promise<MCPToolCallResult> {
    return this.callTool("fusion_mcp_execute", {
      featureType: "script",
      object: { script },
    });
  }

  async openDocument(fileId: string): Promise<MCPToolCallResult> {
    return this.callTool("fusion_mcp_execute", {
      featureType: "document",
      object: { operation: "open", fileId },
    });
  }

  async closeDocument(opts: { saveChanges?: boolean } = {}): Promise<MCPToolCallResult> {
    const object: Record<string, unknown> = { operation: "close" };
    if (opts.saveChanges === true) object.userConfirmedSaveAndClose = true;
    if (opts.saveChanges === false) object.userConfirmedCloseWithoutSave = true;
    return this.callTool("fusion_mcp_execute", { featureType: "document", object });
  }

  async saveDocument(): Promise<MCPToolCallResult> {
    return this.callTool("fusion_mcp_execute", {
      featureType: "document",
      object: { operation: "save" },
    });
  }

  // ── fusion_mcp_read wrappers ───────────────────────────────────────────────

  async listProjects(): Promise<MCPToolCallResult> {
    return this.callTool("fusion_mcp_read", { queryType: "projects" });
  }

  async searchDocuments(name: string, project?: string): Promise<MCPToolCallResult> {
    return this.callTool("fusion_mcp_read", {
      queryType: "document",
      operation: "search",
      name,
      ...(project ? { project } : {}),
    });
  }

  async listOpenDocuments(): Promise<MCPToolCallResult> {
    return this.callTool("fusion_mcp_read", { queryType: "document", operation: "open" });
  }

  async listRecentDocuments(): Promise<MCPToolCallResult> {
    return this.callTool("fusion_mcp_read", { queryType: "document", operation: "recent" });
  }

  async readApiDoc(
    searchPattern: string,
    opts: { apiCategory?: "class" | "member" | "description" | "all"; filter?: string } = {}
  ): Promise<MCPToolCallResult> {
    return this.callTool("fusion_mcp_read", {
      queryType: "apiDocumentation",
      searchPattern,
      ...(opts.apiCategory ? { apiCategory: opts.apiCategory } : {}),
      ...(opts.filter ? { filter: opts.filter } : {}),
    });
  }

  async screenshot(opts: {
    width?: number;
    height?: number;
    antiAliasing?: boolean;
    transparentBackground?: boolean;
    direction?:
      | "current"
      | "front"
      | "back"
      | "bottom"
      | "top"
      | "left"
      | "right"
      | "iso-bottom-left"
      | "iso-bottom-right"
      | "iso-top-left"
      | "iso-top-right";
  } = {}): Promise<MCPToolCallResult> {
    return this.callTool("fusion_mcp_read", { queryType: "screenshot", ...opts });
  }

  // ── fusion_mcp_update wrappers ─────────────────────────────────────────────

  async undo(): Promise<MCPToolCallResult> {
    return this.callTool("fusion_mcp_update", { featureType: "undo" });
  }

  async redo(): Promise<MCPToolCallResult> {
    return this.callTool("fusion_mcp_update", { featureType: "redo" });
  }

  // ── High-level operation execution ─────────────────────────────────────────

  /**
   * Execute an operation cataloged in Fusion360CADFunctionIndexEngine.
   *
   * Looks up the operation, generates a Python script that calls the operation's
   * `python_api` endpoint with the provided keyword arguments, and ships it
   * through fusion_mcp_execute.
   *
   * NOTE: many `python_api` bindings in the catalog are chained method paths
   * (e.g. `sketch.sketchCurves.sketchLines.addByTwoPoints`) that depend on a
   * `sketch`, `component`, or `app` variable being in scope inside `def run()`.
   * Callers that want the rendered script to actually execute against the live
   * design must either pre-resolve those handles inline or extend the renderer.
   * For pure dry-run / inspection / setup-sheet flows the rendered script is
   * the audit-trail artifact, not the active program.
   *
   * Returns the raw MCPToolCallResult plus the rendered script (so callers can
   * log it for audit trail / dry-run / regression diff).
   */
  async executeOperation(
    moduleId: string,
    operationId: string,
    params: Record<string, unknown>
  ): Promise<{ script: string; result: MCPToolCallResult }> {
    const { Fusion360CADFunctionIndexEngine } = await import("./Fusion360CADFunctionIndexEngine.js");
    const op = Fusion360CADFunctionIndexEngine.getOperation(moduleId, operationId);
    if (!op) {
      throw new Error(`Operation ${moduleId}/${operationId} not found in Fusion360CADFunctionIndex`);
    }
    if (!op.python_api) {
      throw new Error(`Operation ${moduleId}/${operationId} has no python_api binding — cannot execute`);
    }

    const script = renderPythonScript(op.python_api, params);
    const result = await this.executeScript(script);
    return { script, result };
  }
}

// ============================================================================
// Python script rendering
// ============================================================================

/**
 * Render a Python script that invokes a Fusion API binding with kwargs.
 *
 * The script wraps the call in the mandatory `def run(_context):` entry point
 * required by fusion_mcp_execute, and prints the repr of the return value so
 * the LLM can read the structured result back through the tool output channel.
 *
 * Exported for unit testing — the canonical way to call this is through
 * AutodeskFusionMCPProxyEngine.executeOperation.
 */
export function renderPythonScript(pythonApi: string, params: Record<string, unknown>): string {
  const kwargs = Object.entries(params)
    .map(([k, v]) => `        ${k}=${pythonRepr(v)},`)
    .join("\n");
  return [
    "import adsk.core, adsk.fusion, traceback",
    "",
    "def run(_context: str):",
    "    app = adsk.core.Application.get()",
    "    try:",
    `        result = ${pythonApi}(`,
    kwargs,
    "        )",
    "        print(repr(result))",
    "    except Exception as e:",
    "        print('PRISM_ERROR: ' + str(e))",
    "        print(traceback.format_exc())",
    "        raise",
    "",
  ].join("\n");
}

/** Render a JS value as a Python literal — strings/numbers/bools/None/lists/dicts only. */
export function pythonRepr(value: unknown): string {
  if (value === null || value === undefined) return "None";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "float('nan')";
  if (typeof value === "string") return JSON.stringify(value); // JSON string literal is a valid Python string literal
  if (Array.isArray(value)) return `[${value.map(pythonRepr).join(", ")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${JSON.stringify(k)}: ${pythonRepr(v)}`)
      .join(", ");
    return `{${entries}}`;
  }
  throw new Error(`pythonRepr: unsupported value type ${typeof value}`);
}
