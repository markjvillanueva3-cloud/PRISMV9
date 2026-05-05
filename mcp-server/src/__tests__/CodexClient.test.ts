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

describe.skipIf(process.platform !== "win32")("CodexClientEngine — .cmd shim regression (P1-U-CODEX-COORD)", () => {
  it("survives spawn against a Windows .cmd shim (no EINVAL) and parses its codex-shaped stderr", async () => {
    // Regression for the spawn-EINVAL bug discovered while wiring multi-model
    // coordination: spawning codex.cmd without shell:true on Windows fails
    // immediately because CreateProcess can't execute .cmd/.bat. The fix
    // gates shell:true on the binary's .cmd|.bat extension.
    //
    // We can't redirect CODEX_BIN at runtime (frozen at module load), so we
    // launch a fresh tsx subprocess with PRISM_CODEX_BIN pointed at a
    // synthetic .cmd that prints exact codex-format stderr.
    const fs = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");
    const { spawnSync } = await import("node:child_process");

    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-shim-"));
    const shim = path.join(tmpdir, "fake-codex.cmd");
    // The .cmd extension is what triggers the spawn-EINVAL bug we're testing.
    // To get LF-line-endings (matching real codex behavior — `echo` would emit
    // CRLF and break the parser), we delegate stderr emission to a node
    // one-liner. This keeps the .cmd shim path while producing real-shape
    // codex stderr.
    const codexStderr = "OpenAI Codex v0.128.0 (research preview)\\n--------\\nmodel: gpt-5.5\\n--------\\ncodex\\nSHIM_OK_42\\ntokens used\\n100\\n";
    fs.writeFileSync(shim, [
      "@echo off",
      `node -e "process.stderr.write('${codexStderr}')"`,
      "exit /b 0",
    ].join("\r\n"), "utf-8");

    const probe = path.join(tmpdir, "probe.mjs");
    const enginePosix = path.join(process.cwd(), "src", "engines", "CodexClientEngine.ts").replace(/\\/g, "/");
    const engineUrl = `file:///${enginePosix}`;
    fs.writeFileSync(probe, [
      `import { codexClientEngine } from ${JSON.stringify(engineUrl)};`,
      `const r = await codexClientEngine.exec({ prompt: "hi", timeoutMs: 10000, skipGitCheck: true });`,
      `process.stdout.write(JSON.stringify({ ok: r.ok, answer: r.answer, error: r.error, tokens: r.tokens, model: r.model }));`,
    ].join("\n"), "utf-8");

    try {
      const tsx = path.join(process.cwd(), "node_modules", ".bin", "tsx.cmd");
      const result = spawnSync(tsx, [probe], {
        encoding: "utf-8",
        env: { ...process.env, PRISM_CODEX_BIN: shim },
        timeout: 30_000,
        shell: true,
      });

      expect(result.status).toBe(0);
      const out = (result.stdout ?? "").trim();
      expect(out.length).toBeGreaterThan(0);
      const parsed = JSON.parse(out) as { ok: boolean; answer: string; error: string | null; tokens: number | null; model: string };

      // The original bug surfaced as error="spawn failed: spawn EINVAL".
      // After the fix, exec returns ok:true with parsed answer.
      expect(parsed.error).toBeNull();
      expect(parsed.ok).toBe(true);
      expect(parsed.answer).toBe("SHIM_OK_42");
      expect(parsed.tokens).toBe(100);
      expect(parsed.model).toBe("gpt-5.5");
    } finally {
      try { fs.rmSync(tmpdir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  }, 60_000);
});
