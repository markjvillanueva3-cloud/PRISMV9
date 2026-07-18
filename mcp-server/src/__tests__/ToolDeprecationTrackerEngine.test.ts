/** ToolDeprecationTrackerEngine tests — HMPI06. */
import { describe, it, expect } from "vitest";
import { ToolDeprecationTrackerEngine, type ToolLifecycle } from "../engines/ToolDeprecationTrackerEngine.js";

const ISO = "2026-05-24T13:00:00.000Z";
const PAST = "2026-05-23T13:00:00.000Z";
const FUTURE = "2026-12-01T00:00:00.000Z";

describe("ToolDeprecationTrackerEngine.decide", () => {
  it("active tool → allow", () => {
    const v = ToolDeprecationTrackerEngine.decide({ tool_id: "t", state: "active" }, ISO);
    expect(v.verdict).toBe("allow");
    expect(v.message).toBe("active");
  });

  it("sunset tool → block", () => {
    const v = ToolDeprecationTrackerEngine.decide({
      tool_id: "t", state: "sunset", reason: "API v1 retired",
    }, ISO);
    expect(v.verdict).toBe("block");
    expect(v.message).toContain("sunset");
    expect(v.message).toContain("API v1 retired");
  });

  it("deprecated with future sunset → warn", () => {
    const v = ToolDeprecationTrackerEngine.decide({
      tool_id: "t", state: "deprecated", sunset_at: FUTURE,
    }, ISO);
    expect(v.verdict).toBe("warn");
    expect(v.message).toContain(FUTURE);
  });

  it("deprecated with past sunset → block", () => {
    const v = ToolDeprecationTrackerEngine.decide({
      tool_id: "t", state: "deprecated", sunset_at: PAST,
    }, ISO);
    expect(v.verdict).toBe("block");
    expect(v.message).toContain("past sunset");
  });

  it("warn carries replacement_tool_id when provided", () => {
    const v = ToolDeprecationTrackerEngine.decide({
      tool_id: "old_tool", state: "deprecated", sunset_at: FUTURE, replacement_tool_id: "new_tool",
    }, ISO);
    expect(v.replacement_tool_id).toBe("new_tool");
    expect(v.message).toContain("new_tool");
  });

  it("block carries replacement_tool_id when provided", () => {
    const v = ToolDeprecationTrackerEngine.decide({
      tool_id: "old_tool", state: "sunset", replacement_tool_id: "new_tool",
    }, ISO);
    expect(v.replacement_tool_id).toBe("new_tool");
  });

  it("deprecated without sunset_at → warn (forever-deprecated)", () => {
    const v = ToolDeprecationTrackerEngine.decide({ tool_id: "t", state: "deprecated" }, ISO);
    expect(v.verdict).toBe("warn");
  });

  it("rejects unknown state via zod enum (adversarial)", () => {
    expect(() => ToolDeprecationTrackerEngine.decide({
      tool_id: "t", state: "yolo" as never,
    }, ISO)).toThrow();
  });
});

describe("ToolDeprecationTrackerEngine.aggregate", () => {
  it("counts active/deprecated/sunset exactly across 4 tools", () => {
    const tools: ToolLifecycle[] = [
      { tool_id: "a", state: "active" },
      { tool_id: "b", state: "deprecated", sunset_at: FUTURE },
      { tool_id: "c", state: "deprecated", sunset_at: PAST },
      { tool_id: "d", state: "sunset" },
    ];
    const a = ToolDeprecationTrackerEngine.aggregate(tools);
    expect(a.active_count).toBe(1);
    expect(a.deprecated_count).toBe(2);
    expect(a.sunset_count).toBe(1);
    expect(a.sunsetting_soon).toHaveLength(2);
  });

  it("renderVerdict shows verdict tag + tool id + replacement arrow", () => {
    const md = ToolDeprecationTrackerEngine.renderVerdict(
      ToolDeprecationTrackerEngine.decide({
        tool_id: "old", state: "deprecated", sunset_at: FUTURE, replacement_tool_id: "new",
      }, ISO),
    );
    expect(md.includes("[TOOL WARN]")).toBe(true);
    expect(md.includes("old")).toBe(true);
    expect(md.includes("→ new")).toBe(true);
  });
});
