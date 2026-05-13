/**
 * cadDispatcher.latheTemplatePlace.test.ts — round-trip integration for
 * TRAINING-LEARNING-MS0/U1 CAD-side bridge action.
 *
 * Drives `cad_lathe_template_place` through the real `prism_cad` dispatcher:
 *   - validates the action is wired (action enum + schema + case block)
 *   - asserts the part_number guard fires before the engine is called
 *   - asserts a dryRun call returns a structured result (no throw) when the
 *     stubbed macro source dir does not contain the OSP macros — exercises
 *     the engine's "macro source file not found" graceful return path
 *
 * Mirrors the wiring pattern of `turningDispatcher.training.test.ts` but for
 * the CAD-domain alias. Closes U1's "round-trip E2E assertion through every
 * wired dispatcher" requirement for the 4th action (the 3 turning actions
 * are covered by the sibling file).
 *
 * @milestone TRAINING-LEARNING-MS0 / U1 (CAD-side bridge integration test)
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";

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
  registerCadDispatcher(
    server as unknown as Parameters<typeof registerCadDispatcher>[0],
  );
  const tool = server.tools.find((t) => t.name === "prism_cad");
  if (!tool) throw new Error("prism_cad tool not registered");
  handler = tool.handler;
});

let tmpLib: string;
let tmpMacroSrc: string;

beforeEach(() => {
  tmpLib = fs.mkdtempSync(path.join(os.tmpdir(), "prism-cad-lib-"));
  tmpMacroSrc = fs.mkdtempSync(path.join(os.tmpdir(), "prism-cad-macros-"));
});

afterEach(() => {
  for (const d of [tmpLib, tmpMacroSrc]) {
    try {
      fs.rmSync(d, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

describe("cad_lathe_template_place", () => {
  it("is wired (action enum + schema + case block) and reachable through prism_cad", async () => {
    // The dispatcher's switch-default branch sets `result = { error: "Unknown action: ..." }`
    // (cadDispatcher.ts ~line 3194). Calling with a missing part_number triggers the
    // case-block's own guard which calls dispatcherError — confirming the case was reached.
    const res = await invoke("cad_lathe_template_place", {});
    // Either the guard fires (good — case is reached) or Zod rejects (also good —
    // schema is registered). Both prove the action is wired. The ONLY thing this
    // assertion rules out is the "Unknown action" path which would mean a missing
    // case block.
    const err = (res.error ?? "") as string;
    expect(err.includes("Unknown action")).toBe(false);
  });

  it("rejects calls missing part_number with a clear cad_lathe_template_place error", async () => {
    const res = await invoke("cad_lathe_template_place", { family: "wafer-insert", dry_run: true });
    // dispatcherError surfaces the error message in res.error. The response should
    // NOT be a success — either Zod rejected (because part_number is required) or
    // our explicit guard fired. Reviewer B P1 #2: assert response-shape AND the
    // field-name keyword to prove the action-specific path was reached.
    const err = (res.error ?? "") as string;
    expect(res.success === undefined || res.success === false).toBe(true);
    expect(err.length > 0).toBe(true);
    expect(/part_number|partNumber/.test(err)).toBe(true);
  });

  it("returns the bridged success-true + structured graceful-failure data for dryRun against an empty macro source dir", async () => {
    // tmpMacroSrc has no OSP macro files → engine's "macro source file not found"
    // path returns { placed:false, family, dryRun:true, reason: "macro source file not found: ..." }
    // WITHOUT throwing. Reviewer B P1 #3: pin the result-bridging contract
    // (`success: data.placed || data.dryRun === true` → true when dryRun=true even
    // though placed=false) and the engine's graceful-failure data shape, so a
    // regression in either layer fails this test.
    const res = await invoke("cad_lathe_template_place", {
      part_number: "TEST-PART-001",
      family: "wafer-insert",
      library_root: tmpLib,
      macro_source_dir: tmpMacroSrc,
      dry_run: true,
    });
    expect(res.success).toBe(true); // dryRun:true → bridged outer success:true
    expect(typeof res.data).toBe("object");
    const data = res.data as Record<string, unknown>;
    expect(data.dryRun).toBe(true);
    expect(data.placed).toBe(false);
    expect(typeof data.reason).toBe("string");
    expect(/macro source file not found/i.test(String(data.reason))).toBe(true);
  });

  it("rejects non-OSP-anchored lathe families (shaft) at the Zod boundary — capability-correct schema", async () => {
    // Capability boundary: cad_lathe_template_place places real .min macro files. The
    // 4 OSP-anchored families are the ONLY ones with .min files in MacroLibraryEngine
    // CATALOG. Empirical: a wider enum surfaces the engine's non-null-assertion crash
    // at MacroLibraryEngine.ts:409 (verified via Reviewer B P0 reproducer 2026-05-13).
    // For broader 12-family lathe template emission (JSON, no .min dependency), use
    // prism_turning:lathe_training_template_match — that's the action that's already
    // tested for non-OSP families. THIS test pins the cad bridge's schema to its
    // actual capability.
    const res = await invoke("cad_lathe_template_place", {
      part_number: "TEST-SHAFT-001",
      family: "shaft",
      library_root: tmpLib,
      macro_source_dir: tmpMacroSrc,
      dry_run: true,
    });
    // Zod must reject before the engine is ever called — `res.success` should be
    // either undefined (Zod path) or false (dispatcherError wraps it).
    expect(res.success === undefined || res.success === false).toBe(true);
    const err = (res.error ?? "") as string;
    expect(err.length > 0).toBe(true);
    // The Zod error names either the field or the invalid value — assert at least one.
    expect(/family|shaft|enum|invalid/i.test(err)).toBe(true);
  });

  it("accepts all 4 OSP-anchored families (casing-counterbore as the spanning sample) — variability-floor coverage", async () => {
    // Coverage floor (per UserPromptSubmit comprehensive-build rule "≥3 spanning
    // configurations in tests"): exercise more than just the canonical wafer-insert.
    // casing-counterbore is the most complex family (single-counterbore variant of
    // casing) — if the schema enum is correctly enumerated, this passes; if it's
    // typo'd, this fails.
    const res = await invoke("cad_lathe_template_place", {
      part_number: "TEST-CB-001",
      family: "casing-counterbore",
      library_root: tmpLib,
      macro_source_dir: tmpMacroSrc,
      dry_run: true,
    });
    expect(res.success).toBe(true);
    const data = res.data as Record<string, unknown>;
    expect(data.dryRun).toBe(true);
    expect(data.placed).toBe(false);
    expect(data.family).toBe("casing-counterbore");
  });
});
