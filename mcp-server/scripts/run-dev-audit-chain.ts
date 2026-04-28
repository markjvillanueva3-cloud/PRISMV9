#!/usr/bin/env tsx
/**
 * run-dev-audit-chain.ts — orchestrator for the post-edit dev audit chain
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/HOOK-FIX-AUDIT-CHAIN.
 *
 * Called by .claude/hooks/posttool-mcp-backend-audit.mjs after meaningful
 * edits to mcp-server source files. Walks the canonical dev-audit chain:
 *
 *   test_smoke -> auto_wiring_analyze -> schema_gap_scan ->
 *   quality_dashboard -> build_guard_chain
 *
 * Each step is a `prism_dev` dispatcher action. We call them through the
 * locally-running MCP HTTP server (127.0.0.1:3100/mcp); if the server is
 * unreachable, every step degrades to an empty result so the calling hook
 * still gets a parseable JSON envelope and doesn't error the user's edit.
 *
 * Output shape (consumed by posttool-mcp-backend-audit summarize()):
 *   {
 *     edited_file: string,
 *     steps: {
 *       test_smoke:           { total_tests, passed, failed, ... },
 *       auto_wiring_analyze:  { gaps, gap_details, ... },
 *       schema_gap_scan:      { schema_coverage, ... },
 *       quality_dashboard:    { system_Q, ... },
 *       build_guard_chain:    { overall_status, recommendations, ... }
 *     },
 *     elapsed_ms: number,
 *     warnings?: string[]
 *   }
 *
 * CLI:
 *   tsx run-dev-audit-chain.ts --edited-file <abs-path>
 *
 * Exit codes:
 *   0 — JSON envelope written to stdout (steps may be empty if MCP down)
 *   2 — invalid arguments
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/HOOK-FIX-AUDIT-CHAIN
 */

const MCP_URL = process.env.MCP_HTTP_URL ?? "http://127.0.0.1:3100/mcp";
const STEP_TIMEOUT_MS = 8_000;

interface AuditStepResult {
  ok: boolean;
  data: Record<string, unknown>;
  error?: string;
}

interface AuditEnvelope {
  edited_file: string;
  steps: Record<string, Record<string, unknown>>;
  elapsed_ms: number;
  warnings: string[];
}

function parseArgs(argv: string[]): { editedFile: string } {
  let editedFile = "";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--edited-file" && i + 1 < argv.length) {
      editedFile = argv[i + 1];
    }
  }
  if (!editedFile) {
    process.stderr.write(
      "Usage: tsx run-dev-audit-chain.ts --edited-file <path>\n",
    );
    process.exit(2);
  }
  return { editedFile };
}

async function callDispatcher(action: string, params: Record<string, unknown>): Promise<AuditStepResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), STEP_TIMEOUT_MS);
  try {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "prism_dev",
          arguments: { action, params },
        },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      return { ok: false, data: {}, error: `HTTP ${res.status}` };
    }
    const body = (await res.json()) as { result?: { content?: Array<{ text?: string }> }; error?: { message?: string } };
    if (body.error) {
      return { ok: false, data: {}, error: body.error.message ?? "MCP error" };
    }
    const text = body.result?.content?.[0]?.text;
    if (typeof text !== "string") {
      return { ok: false, data: {}, error: "MCP response missing content text" };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return { ok: false, data: {}, error: `MCP response not JSON: ${(e as Error).message}` };
    }
    if (parsed && typeof parsed === "object") {
      return { ok: true, data: parsed as Record<string, unknown> };
    }
    return { ok: false, data: {}, error: "MCP response not an object" };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, data: {}, error: (e as Error).message };
  }
}

async function main(): Promise<void> {
  const start = Date.now();
  const { editedFile } = parseArgs(process.argv.slice(2));
  const warnings: string[] = [];
  const steps: Record<string, Record<string, unknown>> = {};

  const chain: Array<{ action: string; params: Record<string, unknown> }> = [
    { action: "test_smoke", params: { edited_file: editedFile } },
    { action: "auto_wiring_analyze", params: { edited_file: editedFile } },
    { action: "schema_gap_scan", params: {} },
    { action: "quality_dashboard", params: {} },
    { action: "build_guard_chain", params: { edited_file: editedFile } },
  ];

  for (const step of chain) {
    const r = await callDispatcher(step.action, step.params);
    steps[step.action] = r.data;
    if (!r.ok && r.error) warnings.push(`${step.action}: ${r.error}`);
  }

  const envelope: AuditEnvelope = {
    edited_file: editedFile,
    steps,
    elapsed_ms: Date.now() - start,
    warnings,
  };

  process.stdout.write(JSON.stringify(envelope));
  process.exit(0);
}

main().catch((e) => {
  // Last-resort guard: emit a parseable empty envelope so the calling hook
  // doesn't choke. Edit-flow must never be blocked by the audit chain.
  const envelope: AuditEnvelope = {
    edited_file: "",
    steps: {},
    elapsed_ms: 0,
    warnings: [`uncaught: ${(e as Error).message ?? String(e)}`],
  };
  process.stdout.write(JSON.stringify(envelope));
  process.exit(0);
});
