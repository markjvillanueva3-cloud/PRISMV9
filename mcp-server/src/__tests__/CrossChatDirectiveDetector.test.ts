/**
 * CrossChatDirectiveDetector.test.ts
 *
 * Covers .claude/hooks/cross-chat-directive-detector.mjs — the
 * UserPromptSubmit hook that warns when the user's prompt looks like a
 * cross-chat directive ("claude-XXXX should...", "tell the other chat
 * to...", "all chats need to...").
 *
 * The hook NEVER blocks — false positives must remain harmless. The
 * warning shows up in additionalContext so the chat sees it before
 * responding. Tests assert the {continue: true} contract holds in every
 * branch and check the warning shape only on positive matches.
 *
 * Asserts use explicit values only — no toBeDefined / toBeTruthy / toBeFalsy.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const HOOK_TIMEOUT_MS = 5000;
const REPO_ROOT = resolve(__dirname, "../../..");
const HOOK_PATH = resolve(REPO_ROOT, ".claude/hooks/cross-chat-directive-detector.mjs");

interface HookOutput {
  continue?: boolean;
  hookSpecificOutput?: {
    hookEventName?: string;
    additionalContext?: string;
  };
}

function runHook(payload: unknown, env: Record<string, string> = {}): HookOutput {
  const r = spawnSync(process.execPath, [HOOK_PATH], {
    input: JSON.stringify(payload),
    encoding: "utf-8",
    timeout: HOOK_TIMEOUT_MS,
    env: { ...process.env, ...env },
  });
  if (r.error) throw r.error;
  const stdout = (r.stdout || "").trim();
  if (!stdout) return {};
  return JSON.parse(stdout) as HookOutput;
}

describe("cross-chat-directive-detector — no-warn paths", () => {
  it("hook script exists on disk", () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it("emits plain continue on a benign prompt", () => {
    const out = runHook({ prompt: "what is the capital of France?" });
    expect(out.continue).toBe(true);
    expect(out.hookSpecificOutput === undefined).toBe(true);
  });

  it("emits plain continue on an empty prompt", () => {
    const out = runHook({ prompt: "" });
    expect(out.continue).toBe(true);
    expect(out.hookSpecificOutput === undefined).toBe(true);
  });

  it("does NOT warn when the only directive-shape mention is in a fenced code block", () => {
    const promptIn = [
      "I saw this log line:",
      "```",
      "claude-72bb539a should investigate the issue",
      "```",
      "what does it mean?",
    ].join("\n");
    const out = runHook({ prompt: promptIn });
    expect(out.continue).toBe(true);
    expect(out.hookSpecificOutput === undefined).toBe(true);
  });

  it("does NOT warn when the only directive-shape mention is in a quoted block", () => {
    const promptIn = [
      "Reading the chat bus, I see:",
      "> tell claude-379c35e0 to revert that commit",
      "what should I do?",
    ].join("\n");
    const out = runHook({ prompt: promptIn });
    expect(out.continue).toBe(true);
    expect(out.hookSpecificOutput === undefined).toBe(true);
  });

  it("does NOT warn on a self-reference", () => {
    const out = runHook({
      prompt: "claude-cba638c3 should fix this",
      session_id: "cba638c3-ff0c-41a0-8f7c-93585b0499e0",
    });
    expect(out.continue).toBe(true);
    expect(out.hookSpecificOutput === undefined).toBe(true);
  });

  it("emits plain continue when PRISM_DIRECTIVE_WARN=0 (kill switch)", () => {
    const out = runHook(
      { prompt: "claude-72bb539a should fix the test" },
      { PRISM_DIRECTIVE_WARN: "0" },
    );
    expect(out.continue).toBe(true);
    expect(out.hookSpecificOutput === undefined).toBe(true);
  });

  it("fails open on malformed JSON payload", () => {
    const r = spawnSync(process.execPath, [HOOK_PATH], {
      input: "not json {{{",
      encoding: "utf-8",
      timeout: HOOK_TIMEOUT_MS,
    });
    const out = JSON.parse((r.stdout || "").trim()) as HookOutput;
    expect(out.continue).toBe(true);
    expect(out.hookSpecificOutput === undefined).toBe(true);
  });
});

describe("cross-chat-directive-detector — warn on directive shapes", () => {
  it("warns on '<claude-XXXXXXXX> should ...'", () => {
    const out = runHook({
      prompt: "claude-72bb539a should fix the test",
      session_id: "cba638c3-ff0c-41a0-8f7c-93585b0499e0",
    });
    expect(out.continue).toBe(true);
    expect(out.hookSpecificOutput?.hookEventName).toBe("UserPromptSubmit");
    const ctx = out.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx.includes("CROSS-CHAT DIRECTIVE")).toBe(true);
    expect(ctx.includes("claude-72bb539a")).toBe(true);
    expect(ctx.includes("prism_context")).toBe(true);
    expect(ctx.includes("chat_post")).toBe(true);
  });

  it("warns on 'tell the other chat to ...'", () => {
    const out = runHook({
      prompt: "tell the other chat to revert that commit please",
      session_id: "cba638c3-ff0c-41a0-8f7c-93585b0499e0",
    });
    const ctx = out.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx.includes("CROSS-CHAT DIRECTIVE")).toBe(true);
    expect(out.continue).toBe(true);
  });

  it("warns on 'all chats need to ...'", () => {
    const out = runHook({
      prompt: "all chats need to stop editing that file",
      session_id: "cba638c3-ff0c-41a0-8f7c-93585b0499e0",
    });
    const ctx = out.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx.includes("CROSS-CHAT DIRECTIVE")).toBe(true);
    expect(ctx.includes("(broad: all/every/peer chats)")).toBe(true);
  });

  it("warns on 'every chat should ...'", () => {
    const out = runHook({
      prompt: "every chat should run the build before committing",
      session_id: "cba638c3-ff0c-41a0-8f7c-93585b0499e0",
    });
    const ctx = out.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx.includes("CROSS-CHAT DIRECTIVE")).toBe(true);
  });

  it("warns on 'ask <peer-id> to ...'", () => {
    const out = runHook({
      prompt: "ask claude-379c35e0 to share the test output",
      session_id: "cba638c3-ff0c-41a0-8f7c-93585b0499e0",
    });
    const ctx = out.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx.includes("CROSS-CHAT DIRECTIVE")).toBe(true);
  });

  it("warning never returns decision=block (must remain non-blocking)", () => {
    const out = runHook({
      prompt: "claude-72bb539a should fix the test",
      session_id: "cba638c3-ff0c-41a0-8f7c-93585b0499e0",
    });
    const obj = out as Record<string, unknown>;
    expect(obj.decision === undefined).toBe(true);
    expect(out.continue).toBe(true);
  });

  it("matches under either prompt or message field name", () => {
    // Some harness versions surface the prompt under different keys.
    const out = runHook({
      message: "claude-72bb539a should rerun the test",
      session_id: "cba638c3",
    });
    const ctx = out.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx.includes("CROSS-CHAT DIRECTIVE")).toBe(true);
  });

  it("does not match descriptive past-tense ('the other chat already did X')", () => {
    const out = runHook({
      prompt: "the other chat already did the migration earlier today",
      session_id: "cba638c3",
    });
    expect(out.continue).toBe(true);
    expect(out.hookSpecificOutput === undefined).toBe(true);
  });
});

describe("cross-chat-directive-detector — single-warning per match", () => {
  it("does not double-count the same directive across overlapping patterns", () => {
    const out = runHook({
      prompt: "claude-72bb539a should fix the broken test",
      session_id: "cba638c3",
    });
    const ctx = out.hookSpecificOutput?.additionalContext ?? "";
    // Header reports a count — must be 1, not 2 (we removed the duplicate
    // pattern that caused double-counting in the smoke test).
    const m = ctx.match(/Detected\s+(\d+)\s+directive-shaped/);
    expect(m !== null).toBe(true);
    expect(m?.[1]).toBe("1");
  });
});
