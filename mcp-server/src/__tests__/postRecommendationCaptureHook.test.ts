/**
 * Tests for .claude/hooks/post-recommendation-capture.mjs (U-LEARN-01).
 *
 * Validates the PostToolUse hook that auto-emits recommendation_emitted
 * events for every MCP dispatcher call carrying a recommendation-shaped
 * response. Runs the real hook as a child process with synthetic stdin
 * payloads (no mocks of the hook logic itself).
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const HOOK_PATH = path.resolve(
  process.cwd(),
  "..",
  ".claude",
  "hooks",
  "post-recommendation-capture.mjs",
);

function runHook(input: unknown): {
  stdout: string;
  stderr: string;
  exitCode: number | null;
} {
  const res = spawnSync(
    process.execPath,
    [HOOK_PATH],
    { input: JSON.stringify(input), encoding: "utf8" },
  );
  return { stdout: res.stdout, stderr: res.stderr, exitCode: res.status };
}

function readJsonl(filePath: string): Array<Record<string, unknown>> {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

function shardPath(domain: string): string {
  return path.join("H:/prism/state/outcomes", `${domain}.jsonl`);
}

function countShard(domain: string): number {
  return readJsonl(shardPath(domain)).length;
}

describe("post-recommendation-capture hook — U-LEARN-01", () => {
  const cleanups: string[] = [];

  beforeEach(() => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "prism-hook-"));
    cleanups.push(tmp);
  });

  afterAll(() => {
    for (const r of cleanups) {
      try { fs.rmSync(r, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  // ────────────────────────────────────────────────────────────────────
  // Hook always returns {continue: true} — never blocks
  // ────────────────────────────────────────────────────────────────────

  it("returns {continue: true} for an empty stdin payload", () => {
    const res = runHook({});
    expect(res.exitCode).toBe(0);
    const parsed = JSON.parse(res.stdout);
    expect(parsed.continue).toBe(true);
  });

  it("ignores non-prism tool calls (Read/Edit/Bash) without emitting events", () => {
    const before = countShard("mill");
    const res = runHook(
      { tool_name: "Read", tool_input: { file_path: "x" }, tool_response: {} },
    );
    const parsed = JSON.parse(res.stdout);
    expect(parsed.continue).toBe(true);
    expect(parsed.hookSpecificOutput === undefined || parsed.hookSpecificOutput === null).toBe(true);
    expect(countShard("mill")).toBe(before);
  });

  it("does NOT emit an event when the response carries no recommendation shape", () => {
    const before = countShard("mill");
    runHook(
      {
        tool_name: "mcp__prism__prism_cam",
        tool_input: { action: "toolpath_generate" },
        tool_response: { content: [{ type: "text", text: JSON.stringify({ ok: true, logs: "..." }) }] },
      },
    );
    expect(countShard("mill")).toBe(before);
  });

  // ────────────────────────────────────────────────────────────────────
  // Domain classification — all 6 canonical domains + disambiguation
  // ────────────────────────────────────────────────────────────────────

  it("classifies prism_cam + recommendation payload as domain=mill", () => {
    const before = countShard("mill");
    const res = runHook(
      {
        tool_name: "mcp__prism__prism_cam",
        tool_input: { action: "cam_strategy_recommend" },
        tool_response: {
          content: [
            { type: "text", text: JSON.stringify({ recommended: { strategy: "trochoidal", stepover: 0.3 } }) },
          ],
        },
        session_id: "test-mill-001",
      },
    );
    const parsed = JSON.parse(res.stdout);
    expect(parsed.continue).toBe(true);
    expect(parsed.hookSpecificOutput.additionalContext).toContain("feedback:mill");
    const events = readJsonl(shardPath("mill"));
    expect(events.length).toBe(before + 1);
    const latest = events[events.length - 1];
    expect(latest.domain).toBe("mill");
    expect(latest.kind).toBe("recommendation_emitted");
    expect(latest.agent_id).toBe("test-mill-001");
  });

  it("classifies prism_turning as domain=lathe", () => {
    const before = countShard("lathe");
    runHook(
      {
        tool_name: "mcp__prism__prism_turning",
        tool_input: { action: "speed_feed_recommend" },
        tool_response: {
          content: [{ type: "text", text: JSON.stringify({ sfm: 400, ipr: 0.012 }) }],
        },
      },
    );
    const events = readJsonl(shardPath("lathe"));
    expect(events.length).toBe(before + 1);
    expect(events[events.length - 1].domain).toBe("lathe");
  });

  it("disambiguates prism_edm wedm_* actions as domain=wedm", () => {
    const before = countShard("wedm");
    runHook(
      {
        tool_name: "mcp__prism__prism_edm",
        tool_input: { action: "wedm_optimize_params" },
        tool_response: {
          content: [{ type: "text", text: JSON.stringify({ power: 5, servo: 45, wire_tension: 12 }) }],
        },
      },
    );
    const events = readJsonl(shardPath("wedm"));
    expect(events.length).toBe(before + 1);
    expect(events[events.length - 1].domain).toBe("wedm");
  });

  it("disambiguates prism_edm sinker_* actions as domain=sinker_edm", () => {
    const before = countShard("sinker_edm");
    runHook(
      {
        tool_name: "mcp__prism__prism_edm",
        tool_input: { action: "sinker_calculate" },
        tool_response: {
          content: [{ type: "text", text: JSON.stringify({ recommended: { current: 20, on_time: 50 } }) }],
        },
      },
    );
    const events = readJsonl(shardPath("sinker_edm"));
    expect(events.length).toBe(before + 1);
    expect(events[events.length - 1].domain).toBe("sinker_edm");
  });

  it("classifies prism_grinding as domain=grinder", () => {
    const before = countShard("grinder");
    runHook(
      {
        tool_name: "mcp__prism__prism_grinding",
        tool_input: { action: "wheel_select" },
        tool_response: {
          content: [{ type: "text", text: JSON.stringify({ recommendation: "A60K8V", rpm: 3400 }) }],
        },
      },
    );
    const events = readJsonl(shardPath("grinder"));
    expect(events.length).toBe(before + 1);
    expect(events[events.length - 1].domain).toBe("grinder");
  });

  it("classifies prism_welding as domain=welder", () => {
    const before = countShard("welder");
    runHook(
      {
        tool_name: "mcp__prism__prism_welding",
        tool_input: { action: "welding_calculate" },
        tool_response: {
          content: [{ type: "text", text: JSON.stringify({ parameters: { amps: 150, volts: 22, travel_speed: 250 } }) }],
        },
      },
    );
    const events = readJsonl(shardPath("welder"));
    expect(events.length).toBe(before + 1);
    expect(events[events.length - 1].domain).toBe("welder");
  });

  // ────────────────────────────────────────────────────────────────────
  // Recommendation-shape sniffer — positive and negative cases
  // ────────────────────────────────────────────────────────────────────

  it("pulls recommendation from top-level keys", () => {
    const before = countShard("lathe");
    runHook(
      {
        tool_name: "mcp__prism__prism_turning",
        tool_input: { action: "chip_control" },
        tool_response: {
          content: [{ type: "text", text: JSON.stringify({ chip_load: 0.15 }) }],
        },
      },
    );
    const events = readJsonl(shardPath("lathe"));
    expect(events.length).toBe(before + 1);
    const last = events[events.length - 1];
    const rec = last.recommended as Record<string, unknown>;
    expect(rec).toMatchObject({ chip_load: 0.15 });
  });

  it("pulls recommendation from nested result.* shape", () => {
    const before = countShard("mill");
    runHook(
      {
        tool_name: "mcp__prism__prism_cam",
        tool_input: { action: "cam_safety_validate" },
        tool_response: {
          content: [{ type: "text", text: JSON.stringify({ ok: true, result: { rpm: 8000, ipm: 60 } }) }],
        },
      },
    );
    const events = readJsonl(shardPath("mill"));
    expect(events.length).toBe(before + 1);
    const last = events[events.length - 1];
    const rec = last.recommended as Record<string, unknown>;
    expect(rec).toMatchObject({ rpm: 8000, ipm: 60 });
  });

  // ────────────────────────────────────────────────────────────────────
  // Failure modes — never-throw, never-block
  // ────────────────────────────────────────────────────────────────────

  it("handles malformed JSON stdin without throwing", () => {
    const res = spawnSync(process.execPath, [HOOK_PATH], {
      input: "{not valid json",
      encoding: "utf8",
    });
    expect(res.status).toBe(0);
    const parsed = JSON.parse(res.stdout);
    expect(parsed.continue).toBe(true);
  });

  it("handles empty content array without throwing and emits nothing", () => {
    const before = countShard("mill");
    const res = runHook(
      {
        tool_name: "mcp__prism__prism_cam",
        tool_input: { action: "x" },
        tool_response: { content: [] },
      },
    );
    expect(JSON.parse(res.stdout).continue).toBe(true);
    expect(countShard("mill")).toBe(before);
  });

  it("truncates recommended payload when event would exceed 64 KB line", () => {
    const hugeKeys: Record<string, string> = {};
    for (let i = 0; i < 5000; i++) hugeKeys[`k${i}`] = "x".repeat(50);
    const before = countShard("mill");
    runHook(
      {
        tool_name: "mcp__prism__prism_cam",
        tool_input: { action: "x" },
        tool_response: {
          content: [{ type: "text", text: JSON.stringify({ recommended: hugeKeys }) }],
        },
      },
    );
    const events = readJsonl(shardPath("mill"));
    expect(events.length).toBe(before + 1);
    const last = events[events.length - 1];
    expect(last.domain).toBe("mill");
    const rec = last.recommended as Record<string, unknown>;
    const hasTruncationMarker = rec._truncated === true || typeof rec.preview === "string";
    expect(hasTruncationMarker).toBe(true);
  });

  it("returns continue=true even when tool_response is missing entirely", () => {
    const res = runHook(
      { tool_name: "mcp__prism__prism_cam", tool_input: { action: "x" } },
    );
    expect(JSON.parse(res.stdout).continue).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────────
  // Lineage threading — hook-emitted lineage_id must be readable
  // ────────────────────────────────────────────────────────────────────

  it("emits a UUID-shaped lineage_id and echoes the 8-char prefix back to the LLM", () => {
    const before = countShard("mill");
    const res = runHook(
      {
        tool_name: "mcp__prism__prism_cam",
        tool_input: { action: "cam_strategy_recommend" },
        tool_response: {
          content: [{ type: "text", text: JSON.stringify({ recommended: { strategy: "adaptive" } }) }],
        },
      },
    );
    const parsed = JSON.parse(res.stdout);
    expect(parsed.hookSpecificOutput.additionalContext).toMatch(
      /\[feedback:mill\] recommendation_emitted lineage=[0-9a-f]{8}/i,
    );
    const events = readJsonl(shardPath("mill"));
    expect(events.length).toBe(before + 1);
    const last = events[events.length - 1];
    expect(last.lineage_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    const match = parsed.hookSpecificOutput.additionalContext.match(/lineage=([0-9a-f]{8})/i);
    expect(match?.[1]).toBe(String(last.lineage_id).slice(0, 8));
  });
});
