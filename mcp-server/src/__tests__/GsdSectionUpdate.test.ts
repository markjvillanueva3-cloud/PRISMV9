/**
 * GsdSectionUpdate.test.ts
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P4-U01 — verifies the
 * gsd-section-update.mjs PostToolUse hook: ignores non-Write tools,
 * ignores edits to non-GSD files, and spawns the chunker for edits
 * to one of the three canonical GSD source files.
 */

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";

const HOOK = "H:/prism/.claude/hooks/gsd-section-update.mjs";

function runHook(payload: unknown) {
  return spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    timeout: 8_000,
  });
}

describe("gsd-section-update hook — P4-U01", () => {
  it("ignores non-Write tools with continue:true exactly", () => {
    const r = runHook({ tool_name: "Read", tool_input: { file_path: "H:/prism/mcp-server/data/docs/gsd/GSD_MICRO.md" } });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("ignores Bash tools (commit, build, etc.)", () => {
    const r = runHook({ tool_name: "Bash", tool_input: { command: "ls" } });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("ignores Edit on non-GSD files", () => {
    const r = runHook({ tool_name: "Edit", tool_input: { file_path: "H:/prism/random.md" } });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("ignores Edit on GSD subfolder files (only the 3 canonical sources trigger)", () => {
    const r = runHook({ tool_name: "Edit", tool_input: { file_path: "H:/prism/mcp-server/data/docs/gsd/sections/foo.md" } });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("spawns chunker on Edit to GSD_MICRO.md (reports pid)", () => {
    const r = runHook({ tool_name: "Edit", tool_input: { file_path: "H:/prism/mcp-server/data/docs/gsd/GSD_MICRO.md" } });
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { hookSpecificOutput?: { additionalContext?: string } };
    const ctx = out.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toMatch(/gsd-chunker spawned \(pid=\d+\)/);
  });

  it("spawns chunker on Write to DEV_PROTOCOL.md", () => {
    const r = runHook({ tool_name: "Write", tool_input: { file_path: "H:/prism/mcp-server/data/docs/gsd/DEV_PROTOCOL.md" } });
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { hookSpecificOutput?: { additionalContext?: string } };
    expect(out.hookSpecificOutput?.additionalContext).toMatch(/gsd-chunker spawned/);
  });

  it("spawns chunker on MultiEdit to GSD_QUICK.md", () => {
    const r = runHook({ tool_name: "MultiEdit", tool_input: { file_path: "H:/prism/mcp-server/data/docs/gsd/GSD_QUICK.md" } });
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { hookSpecificOutput?: { additionalContext?: string } };
    expect(out.hookSpecificOutput?.additionalContext).toMatch(/gsd-chunker spawned/);
  });

  it("ADV: empty stdin → continue:true exactly", () => {
    const r = spawnSync(process.execPath, [HOOK], { input: "", encoding: "utf8", timeout: 4_000 });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("ADV: malformed JSON stdin → continue:true exactly", () => {
    const r = spawnSync(process.execPath, [HOOK], { input: "garbage{{", encoding: "utf8", timeout: 4_000 });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("ADV: variability — all 3 canonical GSD sources trigger the chunker", () => {
    const sources = [
      "H:/prism/mcp-server/data/docs/gsd/GSD_QUICK.md",
      "H:/prism/mcp-server/data/docs/gsd/DEV_PROTOCOL.md",
      "H:/prism/mcp-server/data/docs/gsd/GSD_MICRO.md",
    ];
    for (const file_path of sources) {
      const r = runHook({ tool_name: "Edit", tool_input: { file_path } });
      expect(r.status).toBe(0);
      const out = JSON.parse(r.stdout) as { hookSpecificOutput?: { additionalContext?: string } };
      expect(out.hookSpecificOutput?.additionalContext).toMatch(/gsd-chunker spawned/);
    }
  });

  it("ADV: settings.json wires the hook under PostToolUse", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const settings = fs.readFileSync("H:/prism/.claude/settings.json", "utf8");
    expect(settings).toContain("gsd-section-update.mjs");
  });
});
