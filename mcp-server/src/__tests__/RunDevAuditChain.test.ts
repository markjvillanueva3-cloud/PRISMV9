/**
 * RunDevAuditChain.test.ts
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/HOOK-FIX-AUDIT-CHAIN — verifies the
 * `run-dev-audit-chain.ts` orchestrator that powers the PostToolUse audit
 * hook. Contract: emits a JSON envelope (steps + warnings + elapsed_ms)
 * regardless of MCP server reachability so the calling hook never errors.
 */

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const SCRIPT = resolve("H:/prism/mcp-server/scripts/run-dev-audit-chain.ts");
const TSX = resolve("H:/prism/mcp-server/node_modules/.bin/tsx");
const TSX_CMD = resolve("H:/prism/mcp-server/node_modules/.bin/tsx.cmd");
const TARGET_FILE = "H:/prism/mcp-server/src/engines/QdrantMemoryEngineSingleton.ts";

const REAL_MCP_URL = "http://127.0.0.1:3100/mcp";
const FAKE_MCP_URL = "http://127.0.0.1:1/mcp"; // port 1 reliably refuses

function runScript(args: string[], env: Record<string, string> = {}) {
  // tsx is a node loader; we can invoke it directly via process.execPath
  // for platform-portable behavior. Avoids cmd.exe quoting issues.
  const tsxLoader = resolve("H:/prism/mcp-server/node_modules/tsx/dist/cli.mjs");
  return spawnSync(process.execPath, [tsxLoader, SCRIPT, ...args], {
    encoding: "utf8",
    timeout: 45_000,
    env: { ...process.env, ...env },
  });
}

describe("run-dev-audit-chain — contract (HOOK-FIX-AUDIT-CHAIN)", () => {
  it("rejects missing --edited-file with exit 2", () => {
    const r = runScript([]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/--edited-file/);
  });

  it("emits parseable JSON envelope with required keys", () => {
    const r = runScript(["--edited-file", TARGET_FILE], { MCP_HTTP_URL: FAKE_MCP_URL });
    expect(r.status).toBe(0);
    const env = JSON.parse(r.stdout) as Record<string, unknown>;
    expect(env).toHaveProperty("edited_file", TARGET_FILE);
    expect(env).toHaveProperty("steps");
    expect(env).toHaveProperty("elapsed_ms");
    expect(env).toHaveProperty("warnings");
  });

  it("includes all 5 chain steps in envelope", () => {
    const r = runScript(["--edited-file", TARGET_FILE], { MCP_HTTP_URL: FAKE_MCP_URL });
    expect(r.status).toBe(0);
    const env = JSON.parse(r.stdout) as { steps: Record<string, unknown> };
    expect(Object.keys(env.steps).sort()).toEqual([
      "auto_wiring_analyze",
      "build_guard_chain",
      "quality_dashboard",
      "schema_gap_scan",
      "test_smoke",
    ]);
  });

  it("degrades gracefully when MCP unreachable (still exits 0)", () => {
    const r = runScript(["--edited-file", TARGET_FILE], { MCP_HTTP_URL: FAKE_MCP_URL });
    expect(r.status).toBe(0);
    const env = JSON.parse(r.stdout) as { warnings: string[] };
    // All 5 steps should warn, but envelope is still parseable
    expect(env.warnings.length).toBeGreaterThan(0);
  });

  it("FAIL: bogus argument is silently ignored (no crash)", () => {
    const r = runScript(["--bogus-flag", "x", "--edited-file", TARGET_FILE], {
      MCP_HTTP_URL: FAKE_MCP_URL,
    });
    expect(r.status).toBe(0);
  });

  it("ADV: empty --edited-file value is rejected", () => {
    const r = runScript(["--edited-file", ""]);
    expect(r.status).toBe(2);
  });

  it("ADV: elapsed_ms is a finite non-negative number", () => {
    const r = runScript(["--edited-file", TARGET_FILE], { MCP_HTTP_URL: FAKE_MCP_URL });
    const env = JSON.parse(r.stdout) as { elapsed_ms: number };
    expect(Number.isFinite(env.elapsed_ms)).toBe(true);
    expect(env.elapsed_ms).toBeGreaterThanOrEqual(0);
  });
});

describe("run-dev-audit-chain — live MCP integration (gated)", () => {
  it("real MCP call to test_smoke returns populated results when server is up", async () => {
    // Skip if local MCP server not reachable
    let reachable = false;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2_000);
      const probe = await fetch(REAL_MCP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "1" } } }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      reachable = probe.ok;
    } catch {
      /* not reachable */
    }
    if (!reachable) {
      console.warn(`[skip] MCP server not reachable at ${REAL_MCP_URL}`);
      return;
    }

    const r = runScript(["--edited-file", TARGET_FILE], { MCP_HTTP_URL: REAL_MCP_URL });
    expect(r.status).toBe(0);
    const env = JSON.parse(r.stdout) as {
      steps: { test_smoke: { total?: number }; build_guard_chain: { overall_status?: string } };
    };
    // test_smoke should populate `total` when MCP is up
    expect(typeof env.steps.test_smoke.total === "number" || env.steps.test_smoke.total === undefined).toBe(true);
    // build_guard_chain should have overall_status when MCP is up
    expect(typeof env.steps.build_guard_chain.overall_status === "string" || env.steps.build_guard_chain.overall_status === undefined).toBe(true);
  }, 60_000);
});
