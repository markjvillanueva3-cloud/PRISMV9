/**
 * pre-claude-review-inject.mjs hook — classifier + injection contract tests.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / P22-U02.
 *
 * The hook is a .mjs script invoked by the harness with a JSON prompt on
 * stdin. It outputs a single JSON object with `continue: true` and possibly
 * `additionalContext`. These tests spawn the real script as a subprocess
 * and assert the precise output shape: exit code 0, valid JSON, exact key
 * set per branch, and substring content where the contract requires it
 * (the suggestion banner names `/pre-review` and the matched-rule source).
 *
 * Auto-fetch path is exercised via the engine's tests (PreReviewOrchestrator)
 * with Ollama mocked — that's the unit boundary. The hook tests here only
 * cover the deterministic classifier + suggest-mode I/O contract.
 */

import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import path from "node:path";

const HOOK_PATH = path.resolve(__dirname, "../../../.claude/hooks/pre-claude-review-inject.mjs");

interface HookOutput {
  continue?: boolean;
  additionalContext?: string;
  __raw?: string;
}

function runHook(prompt: string, env: Record<string, string> = {}, stdinOverride?: string): Promise<{ stdout: string; code: number; output: HookOutput }> {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [HOOK_PATH], {
      env: { ...process.env, PRISM_PRE_REVIEW_AUTO: "0", ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    child.stdout.on("data", (c) => { stdout += c; });
    child.on("error", reject);
    child.on("exit", (code) => {
      let output: HookOutput;
      try { output = JSON.parse(stdout) as HookOutput; }
      catch { output = { __raw: stdout }; }
      resolve({ stdout, code: code ?? -1, output });
    });
    if (stdinOverride !== undefined) {
      child.stdin.write(stdinOverride);
    } else {
      child.stdin.write(JSON.stringify({ prompt }));
    }
    child.stdin.end();
  });
}

describe("pre-claude-review-inject — skip branches emit minimal envelope", () => {
  it("empty prompt: exit 0, output is exactly {continue:true}", async () => {
    const r = await runHook("");
    expect(r.code).toBe(0);
    expect(r.output).toEqual({ continue: true });
    expect(Object.keys(r.output)).toEqual(["continue"]);
  });

  it("simple question: output is exactly {continue:true}", async () => {
    const r = await runHook("What is the Kienzle constant for steel?");
    expect(r.code).toBe(0);
    expect(r.output).toEqual({ continue: true });
  });

  it("short prompt under 12 chars: exactly {continue:true}", async () => {
    const r = await runHook("hi");
    expect(r.output).toEqual({ continue: true });
  });

  it("[no-prereview] opt-out: exactly {continue:true}", async () => {
    const r = await runHook("Refactor this big module [no-prereview]");
    expect(r.output).toEqual({ continue: true });
  });

  it("kienzle safety domain: exactly {continue:true} (Claude leads)", async () => {
    const r = await runHook("Validate kienzle force calculation for AISI 4340");
    expect(r.output).toEqual({ continue: true });
  });

  it("Taylor tool life safety domain: exactly {continue:true}", async () => {
    const r = await runHook("Update the Taylor tool life equation coefficients");
    expect(r.output).toEqual({ continue: true });
  });

  it("S(x) safety gate prompt: exactly {continue:true}", async () => {
    const r = await runHook("Recompute S(x) safety gate threshold for tier-3 ops");
    expect(r.output).toEqual({ continue: true });
  });

  it("malformed stdin: exit 0, parsed body is exactly {continue:true}", async () => {
    const r = await runHook("ignored", {}, "not valid JSON {{{");
    expect(r.code).toBe(0);
    expect(r.output).toEqual({ continue: true });
  });
});

describe("pre-claude-review-inject — medium-complex branch emits suggestion", () => {
  const expectSuggestionShape = (output: HookOutput, expectedRulePattern: RegExp) => {
    expect(output.continue).toBe(true);
    expect(typeof output.additionalContext).toBe("string");
    expect(Object.keys(output).sort()).toEqual(["additionalContext", "continue"]);
    const ctx = output.additionalContext as string;
    // Banner names the slash command + the auto-mode escape hatch
    expect(ctx).toContain("/pre-review");
    expect(ctx).toContain("PRISM_PRE_REVIEW_AUTO=1");
    // Banner names the matched rule (regex source) so a future debugger
    // can trace why the hook fired without re-running.
    expect(ctx).toMatch(expectedRulePattern);
  };

  it("refactor prompt: suggestion names \\brefactor\\b rule", async () => {
    const r = await runHook("Refactor the OllamaClientEngine to support streaming responses");
    expectSuggestionShape(r.output, /\\brefactor\\b/);
  });

  it("debug prompt: suggestion names \\bdebug rule", async () => {
    const r = await runHook("Debug why the QdrantMemoryEngine fails on Windows paths");
    expectSuggestionShape(r.output, /\\bdebug/);
  });

  it("implement prompt: suggestion names \\bimplement\\b rule", async () => {
    const r = await runHook("Implement a new caching layer for the dispatcher response");
    expectSuggestionShape(r.output, /\\bimplement\\b/);
  });

  it("multi-file prompt: suggestion names multi.?file rule", async () => {
    const r = await runHook("Make a multi-file change to migrate from json to jsonl");
    // multi.?file fires before migrate (first match wins) — accept either
    expect(r.output.continue).toBe(true);
    expect(r.output.additionalContext).toMatch(/multi\.\?file|migrate/);
  });

  it("build-new prompt: suggestion names \\bbuild rule", async () => {
    const r = await runHook("Build a new feature for token usage telemetry across sessions");
    expectSuggestionShape(r.output, /\\bbuild/);
  });

  it("optimize prompt: suggestion names optimi[sz]e rule (regex source)", async () => {
    const r = await runHook("Optimize the QdrantMemoryEngine batch insert path");
    expect(r.output.additionalContext).toMatch(/optimi/);
  });
});
