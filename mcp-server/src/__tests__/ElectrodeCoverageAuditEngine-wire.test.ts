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
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
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
  let xlsmFixtureMtimeMs: number;
  let xlsmFixtureSize: number;
  let xlsmFixtureSha256: string;

  // Per reviewer A — fixtures must be set up in beforeAll + torn down in
  // afterAll, NOT at describe-body scope (which leaks temp dirs across runs).
  beforeAll(() => {
    fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "electrode-wire-rt-"));
    corpusFixture = path.join(fixtureRoot, "corpus");
    fs.mkdirSync(corpusFixture);
    fs.mkdirSync(path.join(corpusFixture, "OKUMA"));
    fs.writeFileSync(
      path.join(corpusFixture, "OKUMA", "PART-ELECTRODE.ipt"),
      "fx",
    );
    fs.writeFileSync(
      path.join(corpusFixture, "OKUMA", "TAPTITE-X.x_t"),
      "fx",
    );
    xlsmFixture = path.join(fixtureRoot, "fake.xlsm");
    const xlsmContent = Buffer.from("PKfake-xlsm-content");
    fs.writeFileSync(xlsmFixture, xlsmContent);
    const stat = fs.statSync(xlsmFixture);
    xlsmFixtureMtimeMs = stat.mtimeMs;
    xlsmFixtureSize = stat.size;
    xlsmFixtureSha256 = crypto
      .createHash("sha256")
      .update(xlsmContent)
      .digest("hex");
  });

  afterAll(() => {
    try {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
  });

  beforeEach(() => {
    server = new MockMCPServer();
    registerCamDispatcher(
      server as unknown as { tool: (...args: unknown[]) => void },
    );
  });

  // Canonical dispatcher bridge: `{success:true, data:<engineResult>}`. Per
  // reviewer A — pin this shape so future bridging refactors break loudly,
  // rather than accept both wrapped + unwrapped shapes (which silently masks
  // contract drift). Helper extracts r.data and asserts the engine `ok:true`
  // flag is present at depth 1 (which is the precise bridge contract).
  function pinnedEngineResult(
    r: { success: boolean; data?: Record<string, unknown> },
  ): Record<string, unknown> {
    expect(r.success).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(typeof d).toBe("object");
    // Engine returns `{ok: true, ...}`; dispatcher bridges to `data: <engineResult>`.
    // r.data.ok === true is the exact bridge contract.
    expect(d.ok).toBe(true);
    return d;
  }

  it("electrode_corpus_scan — handler returns success + electrode/taptite counts", async () => {
    const r = await callCam(server, "electrode_corpus_scan", {
      corpusRoot: corpusFixture,
    });
    const data = pinnedEngineResult(r);
    expect(data.electrodeCount).toBe(1);
    expect(data.taptiteCount).toBe(1);
    expect(data.source).toBe("live");
  });

  it("electrode_corpus_scan — snake_case `corpus_root` param accepted (normalizer)", async () => {
    const r = await callCam(server, "electrode_corpus_scan", {
      corpus_root: corpusFixture,
    });
    const data = pinnedEngineResult(r);
    expect(data.corpusRoot).toBe(corpusFixture);
  });

  it("electrode_corpus_scan — bad corpusRoot bridges to success:false + canonical error", async () => {
    const r = await callCam(server, "electrode_corpus_scan", {
      corpusRoot: path.join(fixtureRoot, "does-not-exist"),
    });
    expect(r.success).toBe(false);
    expect(r.error).toBe("corpus_root_missing");
    expect((r.data as Record<string, unknown> | undefined)?.error).toBe(
      "corpus_root_missing",
    );
  });

  it("electrode_xlsm_fingerprint — exists:true returns mtimeMs + size + sha256", async () => {
    const r = await callCam(server, "electrode_xlsm_fingerprint", {
      xlsmPath: xlsmFixture,
    });
    const data = pinnedEngineResult(r);
    expect(data.exists).toBe(true);
    expect(data.path).toBe(xlsmFixture);
    expect(data.mtimeMs).toBe(xlsmFixtureMtimeMs);
    expect(data.sizeBytes).toBe(xlsmFixtureSize);
    expect(data.sha256).toBe(xlsmFixtureSha256);
    expect(data.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("electrode_xlsm_fingerprint — missing file returns exists:false (success)", async () => {
    const r = await callCam(server, "electrode_xlsm_fingerprint", {
      xlsmPath: path.join(fixtureRoot, "missing.xlsm"),
    });
    const data = pinnedEngineResult(r);
    expect(data.exists).toBe(false);
  });

  it("electrode_coverage_audit — combined report w/ baselineOverride matches (no drift)", async () => {
    const r = await callCam(server, "electrode_coverage_audit", {
      corpusRoot: corpusFixture,
      xlsmPath: xlsmFixture,
      baselineOverride: { electrodes: 1, taptites: 1 },
    });
    const data = pinnedEngineResult(r);
    const baselineMatch = data.baselineMatch as {
      electrodes: boolean;
      taptites: boolean;
    };
    expect(baselineMatch.electrodes).toBe(true);
    expect(baselineMatch.taptites).toBe(true);
    // `slimResponse` strips empty arrays at MCP transport, so a no-drift
    // report surfaces `driftWarnings` as `undefined` (NOT `[]`). Pin this
    // exact bridge behavior — see `mcp-server/src/utils/responseSlimmer.ts`.
    expect(data.driftWarnings).toBe(undefined);
    expect(data.schemaVersion).toBe(1);
  });

  it("electrode_coverage_audit — populated driftWarnings survive slimResponse (missing xlsm)", async () => {
    // When xlsm is absent + baseline matches, the engine emits exactly one
    // drift warning ("xlsm reference missing at ..."). The non-empty array
    // MUST survive slimResponse (only empty arrays are stripped). This
    // proves the bridge preserves real warnings, not just trivially strips
    // them.
    const r = await callCam(server, "electrode_coverage_audit", {
      corpusRoot: corpusFixture,
      xlsmPath: path.join(fixtureRoot, "missing-for-drift.xlsm"),
      baselineOverride: { electrodes: 1, taptites: 1 },
    });
    const data = pinnedEngineResult(r);
    const drift = data.driftWarnings as string[] | undefined;
    expect(Array.isArray(drift)).toBe(true);
    expect(drift?.length).toBe(1);
    expect(drift?.[0]).toMatch(/^xlsm reference missing at /);
  });

  // Per reviewer A — strengthened mtime test:
  //   (a) loop ≥5 iterations like the engine-direct sibling
  //   (b) assert success:true BEFORE the mtime check (fails loud on wiring break)
  //   (c) verify mtime + size + sha256 (not just mtime, which has coarse NTFS
  //       resolution that could mask sub-millisecond writes)
  it("electrode_coverage_audit — xlsm mtimeMs + size + sha256 UNCHANGED after 5 round-trip calls", async () => {
    const beforeMtime = fs.statSync(xlsmFixture).mtimeMs;
    const beforeSize = fs.statSync(xlsmFixture).size;
    const beforeSha256 = crypto
      .createHash("sha256")
      .update(fs.readFileSync(xlsmFixture))
      .digest("hex");

    for (let i = 0; i < 5; i++) {
      const r = await callCam(server, "electrode_coverage_audit", {
        corpusRoot: corpusFixture,
        xlsmPath: xlsmFixture,
        baselineOverride: { electrodes: 1, taptites: 1 },
      });
      // Fail loud: if any iteration's dispatcher call fails, the mtime
      // assertion below would trivially pass (engine never invoked) — assert
      // success first so a wiring break surfaces, not masked.
      expect(r.success, `iteration ${i} dispatcher call must succeed`).toBe(
        true,
      );
    }

    expect(fs.statSync(xlsmFixture).mtimeMs).toBe(beforeMtime);
    expect(fs.statSync(xlsmFixture).size).toBe(beforeSize);
    const afterSha256 = crypto
      .createHash("sha256")
      .update(fs.readFileSync(xlsmFixture))
      .digest("hex");
    expect(afterSha256).toBe(beforeSha256);
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
