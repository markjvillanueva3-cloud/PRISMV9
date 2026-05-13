/**
 * ElectrodeCoverageAuditEngine-wire.test.ts
 *
 * Wiring coverage for TRAINING-LEARNING-MS0/U3.
 *
 * Verifies that camDispatcher properly registers + routes the three
 * `electrode_*` actions to ElectrodeCoverageAuditEngine. Engine-direct
 * test coverage lives in ElectrodeCoverageAuditEngine.test.ts; here we
 * cover the wiring contract:
 *
 *   1. ACTIONS enum includes all 3 electrode_* actions
 *   2. camDispatcher.ts has a `case "..."` block for each action
 *   3. Each case-handler lazy-imports ElectrodeCoverageAuditEngine
 *   4. The singleton exposes the 3 methods the case-handlers call
 *   5. Singleton class name is ElectrodeCoverageAuditEngine
 *
 * No round-trip handler call is exercised here — the engine-direct test
 * already covers the happy + error paths. This file locks the wiring
 * surface so a future rename / drop of the actions is caught by CI.
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { ACTIONS, registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";
import {
  electrodeCoverageAuditEngine,
  ElectrodeCoverageAuditEngine,
} from "../engines/ElectrodeCoverageAuditEngine.js";

// ───────────────────────────────────────────────────────────────────────────────
// Round-trip plumbing — captures the tool() closure registered by
// registerCamDispatcher(server) and invokes it as the MCP runtime would.
// Per [reference_skill_tier_wire_pattern], dispatcher behavior must be
// exercised via the registered handler, not just by source-grep.

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

/** Invoke action through the registered prism_cam handler.
 *  Returns parsed `{success, data, error?}` matching the dispatcher contract. */
async function callCam(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string; rawText: string }> {
  const tool = server.tools[0];
  if (!tool) throw new Error("prism_cam tool not registered on mock server");
  const raw = (await tool.handler({ action, params })) as { content: { type: string; text: string }[] };
  const text = raw?.content?.[0]?.text ?? "";
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { success: false, error: "non-json-response", rawText: text };
  }
  return {
    success: parsed.success === true,
    data: (parsed.data ?? parsed) as Record<string, unknown>,
    error: parsed.error as string | undefined,
    rawText: text,
  };
}

const CAM_DISPATCHER_SRC = path.resolve(
  __dirname,
  "../tools/dispatchers/camDispatcher.ts",
);

const EXPECTED_ELECTRODE_ACTIONS = [
  "electrode_corpus_scan",
  "electrode_xlsm_fingerprint",
  "electrode_coverage_audit",
] as const;

describe("camDispatcher ACTIONS enum — electrode_* registered", () => {
  it.each(EXPECTED_ELECTRODE_ACTIONS)("ACTIONS includes %s", (action) => {
    expect((ACTIONS as ReadonlyArray<string>).includes(action)).toBe(true);
  });

  it("camDispatcher.ts source has a case-handler for each electrode_* action", () => {
    const src = fs.readFileSync(CAM_DISPATCHER_SRC, "utf8");
    for (const action of EXPECTED_ELECTRODE_ACTIONS) {
      expect(src.includes(`case "${action}":`)).toBe(true);
    }
  });

  it("camDispatcher.ts case-handlers all lazy-import ElectrodeCoverageAuditEngine", () => {
    const src = fs.readFileSync(CAM_DISPATCHER_SRC, "utf8");
    const importStmt = `await import("../../engines/ElectrodeCoverageAuditEngine.js")`;
    const matches = src.split(importStmt).length - 1;
    // 3 case-handlers × 1 lazy-import each
    expect(matches).toBe(3);
  });
});

describe("ElectrodeCoverageAuditEngine — singleton + method surface", () => {
  it("singleton exposes the 3 methods camDispatcher case-handlers call", () => {
    const m = electrodeCoverageAuditEngine as unknown as Record<string, unknown>;
    expect(typeof m.scanCorpus).toBe("function");
    expect(typeof m.xlsmFingerprint).toBe("function");
    expect(typeof m.report).toBe("function");
  });

  it("singleton class name is ElectrodeCoverageAuditEngine", () => {
    expect(electrodeCoverageAuditEngine.constructor.name).toBe(
      "ElectrodeCoverageAuditEngine",
    );
  });

  it("instanceof ElectrodeCoverageAuditEngine", () => {
    expect(electrodeCoverageAuditEngine).toBeInstanceOf(
      ElectrodeCoverageAuditEngine,
    );
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// Round-trip — exercises the registered tool() closure end-to-end.
// Per Codex scrutiny feedback (2026-05-13): source-grep alone does not
// confirm dispatcher behavior. These tests dispatch through the real
// handler (Zod schema → param normalizer → case-handler → engine → bridge).

describe("camDispatcher round-trip — electrode_* via registered handler", () => {
  let server: MockMCPServer;
  let fixtureRoot: string;
  let corpusFixture: string;
  let xlsmFixture: string;

  beforeEach(() => {
    server = new MockMCPServer();
    registerCamDispatcher(
      server as unknown as { tool: (...args: unknown[]) => void },
    );
  });

  // One-time temp fixtures for the round-trip suite (separate from the engine-direct tests).
  fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "electrode-wire-rt-"));
  corpusFixture = path.join(fixtureRoot, "corpus");
  fs.mkdirSync(corpusFixture);
  fs.mkdirSync(path.join(corpusFixture, "OKUMA"));
  fs.writeFileSync(path.join(corpusFixture, "OKUMA", "PART-ELECTRODE.ipt"), "fx");
  fs.writeFileSync(path.join(corpusFixture, "OKUMA", "TAPTITE-X.x_t"), "fx");
  xlsmFixture = path.join(fixtureRoot, "fake.xlsm");
  fs.writeFileSync(xlsmFixture, Buffer.from("PKfake-xlsm-content"));

  it("electrode_corpus_scan — handler returns success + electrode/taptite counts", async () => {
    const r = await callCam(server, "electrode_corpus_scan", {
      corpusRoot: corpusFixture,
    });
    expect(r.success).toBe(true);
    // The dispatcher bridges engine `{ok:true, ...}` → `{success:true, data:{ok:true,...}}`.
    // `data` may contain the engine result directly OR be wrapped — accept both.
    const payload = r.data ?? {};
    const ec = (payload.electrodeCount ?? (payload.data as Record<string, unknown> | undefined)?.electrodeCount) as number | undefined;
    const tc = (payload.taptiteCount ?? (payload.data as Record<string, unknown> | undefined)?.taptiteCount) as number | undefined;
    expect(ec).toBe(1);
    expect(tc).toBe(1);
  });

  it("electrode_corpus_scan — snake_case `corpus_root` param accepted (normalizer)", async () => {
    const r = await callCam(server, "electrode_corpus_scan", {
      corpus_root: corpusFixture,
    });
    expect(r.success).toBe(true);
  });

  it("electrode_corpus_scan — bad corpusRoot bridges to success:false", async () => {
    const r = await callCam(server, "electrode_corpus_scan", {
      corpusRoot: path.join(fixtureRoot, "does-not-exist"),
    });
    expect(r.success).toBe(false);
    // Engine error code should be surfaced as `error` on the dispatcher response.
    const err = r.error ?? (r.data?.error as string | undefined);
    expect(err).toBe("corpus_root_missing");
  });

  it("electrode_xlsm_fingerprint — exists:true returns mtimeMs + sha256", async () => {
    const r = await callCam(server, "electrode_xlsm_fingerprint", {
      xlsmPath: xlsmFixture,
    });
    expect(r.success).toBe(true);
    const payload = r.data ?? {};
    const exists = payload.exists ?? (payload.data as Record<string, unknown> | undefined)?.exists;
    const sha = payload.sha256 ?? (payload.data as Record<string, unknown> | undefined)?.sha256;
    expect(exists).toBe(true);
    expect(typeof sha).toBe("string");
    expect(sha).toMatch(/^[0-9a-f]{64}$/);
  });

  it("electrode_xlsm_fingerprint — missing file returns exists:false (success)", async () => {
    const r = await callCam(server, "electrode_xlsm_fingerprint", {
      xlsmPath: path.join(fixtureRoot, "missing.xlsm"),
    });
    expect(r.success).toBe(true);
    const payload = r.data ?? {};
    const exists = payload.exists ?? (payload.data as Record<string, unknown> | undefined)?.exists;
    expect(exists).toBe(false);
  });

  it("electrode_coverage_audit — combined report w/ baselineOverride matches", async () => {
    const r = await callCam(server, "electrode_coverage_audit", {
      corpusRoot: corpusFixture,
      xlsmPath: xlsmFixture,
      baselineOverride: { electrodes: 1, taptites: 1 },
    });
    expect(r.success).toBe(true);
    const payload = r.data ?? {};
    const inner = (payload.data as Record<string, unknown> | undefined) ?? payload;
    const baselineMatch = inner.baselineMatch as { electrodes: boolean; taptites: boolean } | undefined;
    expect(baselineMatch?.electrodes).toBe(true);
    expect(baselineMatch?.taptites).toBe(true);
  });

  it("electrode_coverage_audit — fs.statSync(xlsm).mtimeMs unchanged after round-trip", async () => {
    const before = fs.statSync(xlsmFixture).mtimeMs;
    await callCam(server, "electrode_coverage_audit", {
      corpusRoot: corpusFixture,
      xlsmPath: xlsmFixture,
      baselineOverride: { electrodes: 1, taptites: 1 },
    });
    const after = fs.statSync(xlsmFixture).mtimeMs;
    expect(after).toBe(before);
  });
});

describe("camDispatcher — action ordering + bridging convention", () => {
  it("each electrode_* case bridges data.ok → dispatcher success", () => {
    const src = fs.readFileSync(CAM_DISPATCHER_SRC, "utf8");
    // Each case must contain `data.ok` somewhere in the block + the
    // success/false branch. We anchor on the case start + closing brace.
    for (const action of EXPECTED_ELECTRODE_ACTIONS) {
      const caseIdx = src.indexOf(`case "${action}":`);
      expect(caseIdx).toBeGreaterThan(-1);
      // Find the next `break;` after the case start.
      const breakIdx = src.indexOf("break;", caseIdx);
      expect(breakIdx).toBeGreaterThan(caseIdx);
      const block = src.slice(caseIdx, breakIdx);
      expect(block.includes("data.ok")).toBe(true);
      expect(block.includes("success: true")).toBe(true);
      expect(block.includes("success: false")).toBe(true);
    }
  });

  it("each electrode_* case accepts snake_case AND camelCase param keys", () => {
    const src = fs.readFileSync(CAM_DISPATCHER_SRC, "utf8");
    // electrode_corpus_scan: corpusRoot / corpus_root, maxDepth / max_depth, presetSnapshot / preset_snapshot
    const scanIdx = src.indexOf(`case "electrode_corpus_scan":`);
    const scanBreak = src.indexOf("break;", scanIdx);
    const scanBlock = src.slice(scanIdx, scanBreak);
    expect(scanBlock.includes("corpusRoot")).toBe(true);
    expect(scanBlock.includes("corpus_root")).toBe(true);
    expect(scanBlock.includes("maxDepth")).toBe(true);
    expect(scanBlock.includes("max_depth")).toBe(true);

    // electrode_xlsm_fingerprint: xlsmPath / xlsm_path
    const fpIdx = src.indexOf(`case "electrode_xlsm_fingerprint":`);
    const fpBreak = src.indexOf("break;", fpIdx);
    const fpBlock = src.slice(fpIdx, fpBreak);
    expect(fpBlock.includes("xlsmPath")).toBe(true);
    expect(fpBlock.includes("xlsm_path")).toBe(true);

    // electrode_coverage_audit: baselineOverride / baseline_override
    const auditIdx = src.indexOf(`case "electrode_coverage_audit":`);
    const auditBreak = src.indexOf("break;", auditIdx);
    const auditBlock = src.slice(auditIdx, auditBreak);
    expect(auditBlock.includes("baselineOverride")).toBe(true);
    expect(auditBlock.includes("baseline_override")).toBe(true);
  });
});
