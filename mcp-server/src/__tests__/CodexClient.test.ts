/**
 * CodexClientEngine.parseOutput — pure parser tests against captured stderr fixtures.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / OCTOPUS-CONSENSUS.
 *
 * The CLI prints session metadata + reasoning chain to stderr in a known
 * format ending in `codex\n<answer>\ntokens used\n<count>`. parseOutput is
 * the load-bearing extractor — if it drifts, every consensus call returns
 * garbage. These tests pin the contract against the real v0.128.0 stderr
 * shape captured during install verification.
 */

import { describe, it, expect } from "vitest";
import { CodexClientEngine } from "../engines/CodexClientEngine.js";

const realStderr = `Reading prompt from stdin...
OpenAI Codex v0.128.0 (research preview)
--------
workdir: H:\\PRISM
model: gpt-5.5
provider: openai
approval: never
sandbox: read-only
reasoning effort: xhigh
reasoning summaries: none
session id: 019df358-29f1-7543-bc80-b008895d97d4
--------
user
What is 2+2? Reply with just the number, nothing else.

codex
4
tokens used
41,522
`;

describe("CodexClientEngine — parseOutput", () => {
  const engine = new CodexClientEngine();

  it("extracts answer from real v0.128.0 stderr fixture", () => {
    const r = engine.parseOutput(realStderr, "");
    expect(r.answer).toBe("4");
    expect(r.tokens).toBe(41522);
    expect(r.model).toBe("gpt-5.5");
  });

  it("strips ANSI color codes from stderr before parsing", () => {
    const ansi = `\x1b[31mOpenAI Codex v0.128.0\x1b[0m\nmodel: gpt-5.5\ncodex\nthe answer\ntokens used\n100\n`;
    const r = engine.parseOutput(ansi, "");
    expect(r.answer).toBe("the answer");
    expect(r.tokens).toBe(100);
  });

  it("handles multi-line answers", () => {
    const stderr = `model: gpt-5.5\ncodex\nLine one of the answer.\nLine two with details.\nLine three concluding.\ntokens used\n500\n`;
    const r = engine.parseOutput(stderr, "");
    expect(r.answer).toBe("Line one of the answer.\nLine two with details.\nLine three concluding.");
    expect(r.tokens).toBe(500);
  });

  it("returns null tokens when 'tokens used' line is absent", () => {
    const stderr = `model: gpt-4\ncodex\nincomplete output`;
    const r = engine.parseOutput(stderr, "");
    expect(r.tokens).toBeNull();
  });

  it("falls back to default model when 'model:' line missing", () => {
    const stderr = `codex\nsome answer\ntokens used\n50\n`;
    const r = engine.parseOutput(stderr, "");
    expect(r.model).toBe("gpt-5.5"); // DEFAULT_MODEL
  });

  it("parses comma-separated token counts (CLI uses thousands separators)", () => {
    const stderr = `model: gpt-5.5\ncodex\nx\ntokens used\n1,234,567\n`;
    const r = engine.parseOutput(stderr, "");
    expect(r.tokens).toBe(1234567);
  });

  it("uses the LAST 'codex' marker when multiple appear (resume sessions)", () => {
    const stderr = `model: gpt-5.5\ncodex\nold answer that should be ignored\ncodex\nthe latest answer\ntokens used\n42\n`;
    const r = engine.parseOutput(stderr, "");
    expect(r.answer).toBe("the latest answer");
    expect(r.tokens).toBe(42);
  });

  it("returns trimmed full stderr as fallback when no markers found", () => {
    const r = engine.parseOutput("just unstructured text\nmore text", "");
    expect(r.answer).toBe("just unstructured text\nmore text");
    expect(r.tokens).toBeNull();
  });
});

describe("CodexClientEngine — input validation", () => {
  const engine = new CodexClientEngine();

  it("rejects null options", async () => {
    await expect(engine.exec(null as unknown as Parameters<typeof engine.exec>[0]))
      .rejects.toThrow(/CodexExecOptions required/);
  });

  it("rejects empty prompt", async () => {
    await expect(engine.exec({ prompt: "" })).rejects.toThrow(/prompt/);
  });

  it("rejects non-positive timeoutMs", async () => {
    await expect(engine.exec({ prompt: "x", timeoutMs: 0 })).rejects.toThrow(/timeoutMs/);
  });

  it("rejects unknown reasoningEffort", async () => {
    await expect(engine.exec({
      prompt: "x",
      reasoningEffort: "ultra" as unknown as "xhigh",
    })).rejects.toThrow(/reasoningEffort/);
  });

  it("rejects unknown sandbox mode", async () => {
    await expect(engine.exec({
      prompt: "x",
      sandbox: "yolo" as unknown as "read-only",
    })).rejects.toThrow(/sandbox/);
  });
});
