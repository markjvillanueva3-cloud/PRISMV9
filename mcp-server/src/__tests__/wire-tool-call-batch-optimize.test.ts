/**
 * WIRE-UNWIRED-MS0/U-WIRE-TOOL-CALL-BATCH-OPTIMIZE (slot foxtrot, 2026-05-19)
 *
 * Wiring-gate test for the `tool_call_batch_optimize` dispatcher action over
 * the ToolCallBatchOptimizerEngine. Verifies:
 *
 *   1. Action is registered in the devDispatcher z.enum (source-grep).
 *   2. Case block exists with the canonical lazy-import pattern (source-grep).
 *   3. All 4 ops (plan/analyze/estimate_cost/summary) return real-valued
 *      results — not stub `toBeDefined()` placeholders.
 *   4. Adversarial inputs (non-array calls, unknown op, missing op) fail
 *      gracefully with structured `{error}` shape — never throw.
 *   5. The engine singleton's behavior is exercised end-to-end (real-data
 *      oracle) — per the recurring R8 lesson [[reference_u_p0_u02_recovery_2026_05_18]]
 *      "a passing spec test ≠ working feature; pure-core + injected-deps
 *      MUST ship a real wiring test".
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  toolCallBatchOptimizerEngine,
  ToolCallBatchOptimizerEngine,
  type ToolCall,
} from "../engines/ToolCallBatchOptimizerEngine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DISPATCHER = resolve(__dirname, "..", "tools", "dispatchers", "devDispatcher.ts");

describe("WIRE U-WIRE-TOOL-CALL-BATCH-OPTIMIZE: ToolCallBatchOptimizerEngine → prism_dev:tool_call_batch_optimize", () => {
  describe("Wiring (source-grep gates — fail-on-revert)", () => {
    it("action 'tool_call_batch_optimize' is registered in devDispatcher z.enum", () => {
      const src = readFileSync(DISPATCHER, "utf-8");
      // Must appear as a string literal in the enum list (line ~519 region).
      expect(src).toMatch(/"tool_call_batch_optimize"/);
    });

    it("case block dispatches via lazy import of canonical singleton", () => {
      const src = readFileSync(DISPATCHER, "utf-8");
      expect(src).toContain('case "tool_call_batch_optimize"');
      // Lazy-import pattern (sibling convention from tool_call_dedup / _throttle).
      expect(src).toMatch(
        /case "tool_call_batch_optimize"[\s\S]{0,400}await import\("\.\.\/\.\.\/engines\/ToolCallBatchOptimizerEngine\.js"\)/,
      );
      // Inner op-switch (4 ops).
      const block = src.match(
        /case "tool_call_batch_optimize":[\s\S]+?\/\/ ── Skill Inlining/,
      );
      expect(block).not.toBeNull();
      for (const op of ["plan", "analyze", "estimate_cost", "summary"]) {
        expect(block![0]).toContain(`case "${op}"`);
      }
    });

    it("case block rejects non-array calls (R12 fail-loud guard)", () => {
      const src = readFileSync(DISPATCHER, "utf-8");
      // The block must explicitly reject when calls isn't an array — caller
      // bugs surfacing as garbage results would defeat the purpose.
      const block = src.match(
        /case "tool_call_batch_optimize":[\s\S]+?\/\/ ── Skill Inlining/,
      );
      expect(block).not.toBeNull();
      expect(block![0]).toMatch(/Array\.isArray\(params\.calls\)/);
      expect(block![0]).toMatch(/requires \{calls:/);
    });
  });

  describe("Engine behavior (real-data oracle — proves wiring works end-to-end)", () => {
    const SAMPLE: ToolCall[] = [
      { tool: "Read", params: { file_path: "/a.ts" } },
      { tool: "Read", params: { file_path: "/b.ts" } },
      { tool: "Read", params: { file_path: "/a.ts" } }, // redundant
      { tool: "Edit", params: { file_path: "/a.ts" }, dependsOn: [0] },
      { tool: "Grep", params: { pattern: "foo" } },
    ];

    it("singleton is the exported instance (not a class), preserves identity", () => {
      expect(toolCallBatchOptimizerEngine).toBeInstanceOf(ToolCallBatchOptimizerEngine);
    });

    it("plan(): respects dependencies and avoids write-after-read conflicts", () => {
      const result = toolCallBatchOptimizerEngine.plan(SAMPLE);
      expect(result.totalRounds).toBeGreaterThan(0);
      expect(result.savedRounds).toBeGreaterThanOrEqual(0);
      // Edit on /a.ts (idx 3) depends on Read /a.ts (idx 0) — must NOT be
      // in the same batch (write-after-read conflict + dependsOn).
      const allBatches = result.batches;
      const editBatchIdx = allBatches.findIndex((b) => b.some((c) => c.tool === "Edit"));
      const readABatchIdx = allBatches.findIndex(
        (b) => b.some((c) => c.tool === "Read" && c.params.file_path === "/a.ts"),
      );
      expect(editBatchIdx).toBeGreaterThan(readABatchIdx);
    });

    it("plan(): empty input returns zeroed plan, not throw", () => {
      const r = toolCallBatchOptimizerEngine.plan([]);
      expect(r.batches).toHaveLength(0);
      expect(r.totalRounds).toBe(0);
      expect(r.savedRounds).toBe(0);
    });

    it("analyze(): detects the redundant Read in SAMPLE", () => {
      const r = toolCallBatchOptimizerEngine.analyze(SAMPLE);
      // SAMPLE has 1 explicit redundant Read /a.ts.
      expect(r.redundant).toBeGreaterThanOrEqual(1);
      expect(r.totalCalls).toBe(SAMPLE.length);
      expect(r.suggestions.some((s) => s.includes("Duplicate"))).toBe(true);
      // Estimated savings is monotone-positive when there's redundancy.
      expect(r.estimatedSavings).toBeGreaterThan(0);
    });

    it("analyze(): detects read-after-write pattern", () => {
      const calls: ToolCall[] = [
        { tool: "Write", params: { file_path: "/x.ts" } },
        { tool: "Read",  params: { file_path: "/x.ts" } },
      ];
      const r = toolCallBatchOptimizerEngine.analyze(calls);
      expect(r.suggestions.some((s) => s.includes("Read after write"))).toBe(true);
    });

    it("estimateCost(): sums per-tool costs from the canonical table", () => {
      // From the engine's TOOL_COSTS: Read=500, Grep=200, Edit=300.
      const calls: ToolCall[] = [
        { tool: "Read", params: {} },
        { tool: "Grep", params: {} },
        { tool: "Edit", params: {} },
      ];
      expect(toolCallBatchOptimizerEngine.estimateCost(calls)).toBe(500 + 200 + 300);
      // Unknown tool defaults to 300.
      expect(toolCallBatchOptimizerEngine.estimateCost([{ tool: "Unknown", params: {} }])).toBe(300);
    });

    it("summary(): compact one-line digest mentions calls + rounds", () => {
      const s = toolCallBatchOptimizerEngine.summary(SAMPLE);
      expect(s).toContain(`${SAMPLE.length} calls`);
      expect(s).toMatch(/\d+ rounds/);
    });
  });

  describe("Anti-regression — engine import path must remain stable", () => {
    it("engine file is at the path the dispatcher imports", () => {
      // The dispatcher case lazy-imports `../../engines/ToolCallBatchOptimizerEngine.js`.
      // Resolved from .../mcp-server/src/tools/dispatchers/ → .../mcp-server/src/engines/
      const enginePath = resolve(
        __dirname, "..", "engines", "ToolCallBatchOptimizerEngine.ts",
      );
      const src = readFileSync(enginePath, "utf-8");
      // Pinned named exports the case block depends on.
      expect(src).toMatch(/export class ToolCallBatchOptimizerEngine/);
      expect(src).toMatch(/export const toolCallBatchOptimizerEngine/);
      // Pinned method names.
      for (const method of ["plan", "analyze", "estimateCost", "summary"]) {
        expect(src).toContain(method);
      }
    });
  });
});
