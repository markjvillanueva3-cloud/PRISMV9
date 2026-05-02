/**
 * DirectiveSummaryRefreshHook.test.ts — INTEL-OLLAMA-OBSIDIAN-MS0/P4-U02
 *
 * Tests for the pure intent-detection function exported by the PostToolUse
 * hook .claude/hooks/directive-summary-refresh.mjs.
 *
 * The hook reads a Claude Code PostToolUse payload of the shape:
 *   {
 *     hook_event_name: "PostToolUse",
 *     tool_name: "Write" | "Edit" | "MultiEdit",
 *     tool_input: { file_path?: string, ... },
 *   }
 *
 * extractDirectiveTarget(payload) returns the file path when the call should
 * trigger a refresh, otherwise null. The hook itself never throws; this test
 * file pins the criteria.
 *
 * Coverage:
 *   Happy:
 *     1. Write tool + state/shared/CLAUDE-CODEX-*.md path → returns the path
 *     2. Edit tool + matching path → returns the path
 *     3. MultiEdit + matching path → returns the path
 *
 *   Failure modes:
 *     4. Wrong tool_name (Bash, Read, Grep, etc.) → null
 *     5. Missing tool_input → null
 *     6. file_path not a string → null
 *     7. Empty payload → null
 *
 *   Adversarial:
 *     8. Path matches "claude-codex" but is in wrong directory → null
 *     9. Path is a directive but uses .json or .txt extension → null
 *    10. Backslash Windows paths still resolve (case + separator-insensitive)
 *    11. UPPERCASE PATH → matches (case-insensitive)
 *    12. Extra path segments after "claude-codex-X.md" tolerated → null
 *        (file path must end with .md exactly)
 */
import { describe, it, expect } from "vitest";
// @ts-expect-error — JS ESM hook with no .d.ts; we exercise the pure export
import { extractDirectiveTarget } from "../../../.claude/hooks/directive-summary-refresh.mjs";

const VALID_FORWARD = "H:/prism/state/shared/CLAUDE-CODEX-MCP-DIRECTIVE.md";
const VALID_BACKWARD = "H:\\prism\\state\\shared\\CLAUDE-CODEX-COORDINATION-DIRECTIVE.md";
const VALID_UPPER = "H:/PRISM/STATE/SHARED/CLAUDE-CODEX-OTHER.MD";

describe("extractDirectiveTarget — happy path (P4-U02)", () => {
  it("(1) Write tool + valid directive path returns the path", () => {
    const r = extractDirectiveTarget({
      hook_event_name: "PostToolUse",
      tool_name: "Write",
      tool_input: { file_path: VALID_FORWARD, content: "..." },
    });
    expect(r).toBe(VALID_FORWARD);
  });

  it("(2) Edit tool + valid directive path returns the path", () => {
    const r = extractDirectiveTarget({
      hook_event_name: "PostToolUse",
      tool_name: "Edit",
      tool_input: { file_path: VALID_FORWARD },
    });
    expect(r).toBe(VALID_FORWARD);
  });

  it("(3) MultiEdit + matching path returns the path", () => {
    const r = extractDirectiveTarget({
      hook_event_name: "PostToolUse",
      tool_name: "MultiEdit",
      tool_input: { file_path: VALID_FORWARD, edits: [] },
    });
    expect(r).toBe(VALID_FORWARD);
  });
});

describe("extractDirectiveTarget — failure modes (P4-U02)", () => {
  it("(4) wrong tool_name returns null", () => {
    for (const tool of ["Bash", "Read", "Grep", "Glob", "Task"]) {
      const r = extractDirectiveTarget({
        hook_event_name: "PostToolUse",
        tool_name: tool,
        tool_input: { file_path: VALID_FORWARD },
      });
      expect(r).toBe(null);
    }
  });

  it("(5) missing tool_input returns null", () => {
    const r = extractDirectiveTarget({
      hook_event_name: "PostToolUse",
      tool_name: "Write",
    });
    expect(r).toBe(null);
  });

  it("(6) tool_input.file_path not a string returns null", () => {
    expect(extractDirectiveTarget({
      hook_event_name: "PostToolUse",
      tool_name: "Write",
      tool_input: { file_path: null },
    })).toBe(null);

    expect(extractDirectiveTarget({
      hook_event_name: "PostToolUse",
      tool_name: "Write",
      tool_input: { file_path: 42 },
    })).toBe(null);

    expect(extractDirectiveTarget({
      hook_event_name: "PostToolUse",
      tool_name: "Write",
      tool_input: {},
    })).toBe(null);
  });

  it("(7) empty/invalid payloads return null without throwing", () => {
    expect(extractDirectiveTarget({})).toBe(null);
    expect(extractDirectiveTarget(null)).toBe(null);
    expect(extractDirectiveTarget(undefined)).toBe(null);
    expect(extractDirectiveTarget("not an object" as unknown as Record<string, unknown>)).toBe(null);
  });
});

describe("extractDirectiveTarget — adversarial (P4-U02)", () => {
  it("(8) directive-named file in wrong directory returns null", () => {
    // No /state/shared/ segment
    const r = extractDirectiveTarget({
      tool_name: "Write",
      tool_input: { file_path: "H:/prism/state/CLAUDE-CODEX-MCP-DIRECTIVE.md" },
    });
    expect(r).toBe(null);
  });

  it("(9) wrong extension (.json, .txt, .yaml) returns null", () => {
    const base = "H:/prism/state/shared/CLAUDE-CODEX-MCP-DIRECTIVE";
    for (const ext of [".json", ".txt", ".yaml", ".yml", ""]) {
      expect(extractDirectiveTarget({
        tool_name: "Write",
        tool_input: { file_path: base + ext },
      })).toBe(null);
    }
  });

  it("(10) Windows backslash path resolves correctly", () => {
    const r = extractDirectiveTarget({
      tool_name: "Write",
      tool_input: { file_path: VALID_BACKWARD },
    });
    expect(r).toBe(VALID_BACKWARD);
  });

  it("(11) uppercase path is matched (case-insensitive)", () => {
    const r = extractDirectiveTarget({
      tool_name: "Edit",
      tool_input: { file_path: VALID_UPPER },
    });
    expect(r).toBe(VALID_UPPER);
  });

  it("(12) file path missing claude-codex- prefix returns null", () => {
    const r = extractDirectiveTarget({
      tool_name: "Write",
      tool_input: { file_path: "H:/prism/state/shared/MEMORY.md" },
    });
    expect(r).toBe(null);
  });
});
