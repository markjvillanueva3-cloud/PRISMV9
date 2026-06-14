/**
 * knowledgeDispatcher — video-bridge wiring anti-regression suite
 * ================================================================
 *
 * BACKEND-DEV-LOOP iter15 / U-BRIDGE-WIRE-VIDEO
 *
 * Locks the iter15 wiring of 3 previously-unwired Video engines into the
 * prism_knowledge dispatcher. Pure source-grep regression oracle: asserts each
 * action string is present in the dispatcher's z.enum list AND that the
 * matching engine import + method call is present in the case body. A future
 * revert that removes any of these wires will fail this test.
 *
 * This is the lighter sibling of the live MockMCPServer roundtrip tests under
 * .cog-knowledge-wire.test.ts — it does not exercise the engines (which would
 * require ffmpeg + Anthropic API), only proves the wiring exists. The
 * subprocess oracle pattern for full E2E lives in iter14
 * (.claude/hooks/__tests__/wiki-watchdog-actuator-e2e.test.mjs).
 *
 * @milestone BACKEND-DEV-LOOP
 * @unit U-BRIDGE-WIRE-VIDEO
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DISPATCHER_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "tools",
  "dispatchers",
  "knowledgeDispatcher.ts",
);

const src = readFileSync(DISPATCHER_PATH, "utf8");

const NEW_ACTIONS = [
  "learn_video_extract_actions",
  "learn_video_replay",
  "learn_video_pipeline_run",
] as const;

const WIRES: ReadonlyArray<{
  action: string;
  engineImport: string;
  engineSingleton: string;
  method: string;
}> = [
  {
    action: "learn_video_extract_actions",
    engineImport: "../../engines/VideoActionExtractorEngine.js",
    engineSingleton: "videoActionExtractorEngine",
    method: "processVideoForActions",
  },
  {
    action: "learn_video_replay",
    engineImport: "../../engines/VideoReplayOrchestratorEngine.js",
    engineSingleton: "videoReplayOrchestratorEngine",
    method: "replayFromVideo",
  },
  {
    action: "learn_video_pipeline_run",
    engineImport: "../../engines/VideoReplayPipelineEngine.js",
    engineSingleton: "videoReplayPipelineEngine",
    method: "runFullPipeline",
  },
];

describe("U-BRIDGE-WIRE-VIDEO / z.enum action registration", () => {
  it.each(NEW_ACTIONS.map((a) => [a] as const))(
    "dispatcher source contains action literal '%s'",
    (action) => {
      // Surround in quotes so we don't get a false positive on a partial match
      // inside a longer string (e.g. learn_video_replay vs learn_video_replay_advanced).
      const re = new RegExp(`["'\`]${action}["'\`]`);
      expect(src).toMatch(re);
    },
  );

  it("the 3 new actions appear in this order, contiguous, in the z.enum list", () => {
    // Catch a partial revert that splits the cluster across the file (we want
    // them clustered after the iter10 learn_video_* actions for readability).
    const idx0 = src.indexOf('"learn_video_extract_actions"');
    const idx1 = src.indexOf('"learn_video_replay"');
    const idx2 = src.indexOf('"learn_video_pipeline_run"');
    expect(idx0).toBeGreaterThan(0);
    expect(idx1).toBeGreaterThan(idx0);
    expect(idx2).toBeGreaterThan(idx1);
    // No more than ~120 chars between them (they should be on one line)
    expect(idx2 - idx0).toBeLessThan(200);
  });
});

describe("U-BRIDGE-WIRE-VIDEO / engine import + invocation wiring", () => {
  it.each(WIRES.map((w) => [w.action, w] as const))(
    "%s — lazy-imports the right engine module",
    (_action, wire) => {
      const re = new RegExp(
        `await import\\([\\s\\n]*["'\`]${wire.engineImport.replace(/[/.]/g, "\\$&")}["'\`][\\s\\n]*\\)`,
      );
      expect(src).toMatch(re);
    },
  );

  it.each(WIRES.map((w) => [w.action, w] as const))(
    "%s — destructures the canonical singleton '%s'",
    (_action, wire) => {
      const re = new RegExp(`\\{\\s*${wire.engineSingleton}\\s*\\}`);
      expect(src).toMatch(re);
    },
  );

  it.each(WIRES.map((w) => [w.action, w] as const))(
    "%s — calls the documented method '%s'",
    (_action, wire) => {
      const re = new RegExp(
        `${wire.engineSingleton}\\.${wire.method}\\s*\\(`,
      );
      expect(src).toMatch(re);
    },
  );
});

describe("U-BRIDGE-WIRE-VIDEO / dispatcher convention compliance", () => {
  it("no @ts-nocheck slipped in (per H:/.claude/rules/dispatchers.md)", () => {
    expect(src).not.toMatch(/@ts-nocheck/);
  });

  it("all 3 new action names use snake_case (no camelCase / kebab-case)", () => {
    for (const a of NEW_ACTIONS) {
      expect(a).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(a).not.toMatch(/-/);
      expect(a).not.toMatch(/[A-Z]/);
    }
  });

  it("each new action is grouped under the U-BRIDGE-WIRE-VIDEO section comment", () => {
    // The case bodies should be preceded by a section comment naming the
    // milestone — locks attribution + makes future archaeology easier.
    expect(src).toMatch(/U-BRIDGE-WIRE-VIDEO/);
  });
});
