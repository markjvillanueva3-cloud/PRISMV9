/**
 * CrossChatDirectiveDetector.test.ts — INTEL-OLLAMA-OBSIDIAN-MS1/P5-U03
 *
 * Verifies .claude/hooks/cross-chat-directive-detector.mjs (UserPromptSubmit):
 * a non-blocking hook that warns when a prompt looks like it is directing
 * another Claude chat to do something (lane-drift precursor). The hook reads
 * a JSON payload on stdin and writes a JSON envelope on stdout.
 *
 * Coverage (17 cases): 8 no-warn paths + 8 warn paths + 1 single-count
 * guarantee — matching the unit's exit conditions.
 *
 * @see .claude/hooks/cross-chat-directive-detector.mjs
 */

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";

const HOOK = "H:/prism/.claude/hooks/cross-chat-directive-detector.mjs";
const HOOK_TIMEOUT_MS = 8000;

interface HookOut {
  continue?: boolean;
  hookSpecificOutput?: {
    hookEventName?: string;
    additionalContext?: string;
  };
}

/** Run the hook with a stdin payload; return the parsed JSON envelope. */
function runHook(
  payload: Record<string, unknown>,
  env: Record<string, string> = {},
): HookOut {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(payload),
    encoding: "utf-8",
    timeout: HOOK_TIMEOUT_MS,
    env: { ...process.env, ...env },
  });
  const out = (r.stdout || "").trim();
  try {
    return JSON.parse(out) as HookOut;
  } catch {
    return { continue: true };
  }
}

function warned(o: HookOut): boolean {
  return Boolean(o.hookSpecificOutput?.additionalContext);
}

function ctx(o: HookOut): string {
  return o.hookSpecificOutput?.additionalContext ?? "";
}

// A fixed foreign session id used as the "own" id so directives that target
// OTHER ids are genuine cross-chat directives, while a directive aimed at
// this id is a harmless self-reference.
const SELF = { session_id: "aaaa1111" };

describe("cross-chat-directive-detector — no-warn paths (8)", () => {
  it("1. empty prompt → continue, no warning", () => {
    const o = runHook({ ...SELF, prompt: "" });
    expect(o.continue).toBe(true);
    expect(warned(o)).toBe(false);
  });

  it("2. plain task prompt with no directive → no warning", () => {
    const o = runHook({ ...SELF, prompt: "Refactor the Kienzle force calc and add a test." });
    expect(warned(o)).toBe(false);
  });

  it("3. self-reference (directive aimed at own id) → no warning", () => {
    const o = runHook({ ...SELF, prompt: "claude-aaaa1111 should fix the failing test now" });
    expect(warned(o)).toBe(false);
  });

  it("4. directive inside a fenced code block → stripped, no warning", () => {
    const o = runHook({
      ...SELF,
      prompt: "Here is a log paste:\n```\nclaude-bbbb2222 should revert that commit\n```\nplease summarize it",
    });
    expect(warned(o)).toBe(false);
  });

  it("5. directive inside inline backticks → stripped, no warning", () => {
    const o = runHook({
      ...SELF,
      prompt: "The bus message said `tell the other chat to stop` — what does that mean?",
    });
    expect(warned(o)).toBe(false);
  });

  it("6. directive inside a markdown blockquote → stripped, no warning", () => {
    const o = runHook({
      ...SELF,
      prompt: "> all chats should stop touching that file\n\nThat was an old quote, ignore it.",
    });
    expect(warned(o)).toBe(false);
  });

  it("7. PRISM_DIRECTIVE_WARN=0 kill switch → no warning even on a real directive", () => {
    const o = runHook(
      { ...SELF, prompt: "tell claude-cccc3333 to revert the migration" },
      { PRISM_DIRECTIVE_WARN: "0" },
    );
    expect(o.continue).toBe(true);
    expect(warned(o)).toBe(false);
  });

  it("8. mentions another chat id without a directive verb → no warning", () => {
    const o = runHook({ ...SELF, prompt: "I saw claude-dddd4444 committed the fix earlier, nice." });
    expect(warned(o)).toBe(false);
  });
});

describe("cross-chat-directive-detector — warn paths (8)", () => {
  it("9. 'claude-XXXX should ...' → warns + echoes target", () => {
    const o = runHook({ ...SELF, prompt: "claude-bbbb2222 should fix the failing wedm test" });
    expect(o.continue).toBe(true);
    expect(warned(o)).toBe(true);
    expect(ctx(o)).toContain("claude-bbbb2222");
    expect(ctx(o)).toContain("chat_post");
  });

  it("10. 'tell the other chat to ...' → warns", () => {
    const o = runHook({ ...SELF, prompt: "tell the other chat to stop editing chat-slots.mjs" });
    expect(warned(o)).toBe(true);
  });

  it("11. 'all chats need to ...' → warns (broad target)", () => {
    const o = runHook({ ...SELF, prompt: "all chats need to rebase onto main before committing" });
    expect(warned(o)).toBe(true);
    expect(ctx(o).toLowerCase()).toContain("directive");
  });

  it("12. 'ask claude-XXXX to ...' → warns", () => {
    const o = runHook({ ...SELF, prompt: "ask claude-cccc3333 to regenerate the wiki index" });
    expect(warned(o)).toBe(true);
  });

  it("13. 'every chat must ...' → warns", () => {
    const o = runHook({ ...SELF, prompt: "every chat must stop touching the settings file" });
    expect(warned(o)).toBe(true);
  });

  it("14. 'inform peer chats to ...' → warns", () => {
    const o = runHook({ ...SELF, prompt: "inform peer chats to pause the roadmap pass" });
    expect(warned(o)).toBe(true);
  });

  it("15. 'claude-XXXX must ...' → warns", () => {
    const o = runHook({ ...SELF, prompt: "claude-eeee5555 must revert 71756da741 immediately" });
    expect(warned(o)).toBe(true);
    expect(ctx(o)).toContain("claude-eeee5555");
  });

  it("16. 'those chats have to ...' → warns", () => {
    const o = runHook({ ...SELF, prompt: "those chats have to release their file claims first" });
    expect(warned(o)).toBe(true);
  });
});

describe("cross-chat-directive-detector — single-count guarantee (1)", () => {
  it("17. multiple directives in one prompt → exactly ONE warning block", () => {
    const o = runHook({
      ...SELF,
      prompt:
        "claude-bbbb2222 should fix the test, and tell claude-cccc3333 to revert, " +
        "and all chats need to stop, and ask the other chat to rebase",
    });
    expect(warned(o)).toBe(true);
    const text = ctx(o);
    // The warning header appears exactly once — not one block per match.
    const headerCount = (text.match(/CROSS-CHAT DIRECTIVE/g) || []).length;
    expect(headerCount).toBe(1);
    // Output is capped at 3 sample directives even though 4 were present.
    expect(text).toContain("directive-shaped phrase");
    const sampleLines = (text.match(/^\s*\d+\. "/gm) || []).length;
    expect(sampleLines).toBeLessThanOrEqual(3);
    expect(sampleLines).toBeGreaterThanOrEqual(1);
  });
});
