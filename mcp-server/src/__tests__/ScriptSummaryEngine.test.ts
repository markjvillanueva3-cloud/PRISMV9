/**
 * ScriptSummaryEngine — INTEL-OLLAMA-OBSIDIAN-MS0 / P3-U02.
 *
 * Verifies the per-script summarizer that wraps an injected Ollama call
 * with a hash-keyed cache + sanitizer + comment-line fallback.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ScriptSummaryEngine } from "../engines/ScriptSummaryEngine.js";

function mkTmp(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `prism-script-sum-${prefix}-`));
}

const okOllama = (answer: string) => async () => ({ ok: true, answer });
const failOllama = (error = "ollama down") => async () => ({ ok: false, answer: "", error });

describe("ScriptSummaryEngine — summarize()", () => {
  let dir: string;
  const engine = new ScriptSummaryEngine();

  beforeEach(() => { dir = mkTmp("d"); });
  afterEach(() => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ } });

  it("returns ollama summary on first call", async () => {
    const p = path.join(dir, "doit.mjs");
    fs.writeFileSync(p, "// Generate manifest of all wired hooks", "utf-8");
    const r = await engine.summarize({ scriptPath: p, ollamaCall: okOllama("Generate manifest of all wired hooks across PRISM") });
    expect(r.source).toBe("ollama");
    expect(r.summary).toBe("Generate manifest of all wired hooks across PRISM");
    expect(r.hash.length).toBeGreaterThan(0);
  });

  it("hits cache on second call when hash unchanged", async () => {
    const p = path.join(dir, "doit.mjs");
    fs.writeFileSync(p, "// Validate g-code against safety constraints", "utf-8");
    let calls = 0;
    const ollama = async (_: string) => { calls++; return { ok: true, answer: "Validate g-code" }; };
    const r1 = await engine.summarize({ scriptPath: p, ollamaCall: ollama });
    expect(r1.source).toBe("ollama");
    const cache = { [p]: { hash: r1.hash, summary: r1.summary } };
    const r2 = await engine.summarize({ scriptPath: p, ollamaCall: ollama, cache });
    expect(r2.source).toBe("cache");
    expect(r2.summary).toBe("Validate g-code");
    expect(calls).toBe(1);
  });

  it("rebuilds summary when script content changes (hash drift)", async () => {
    const p = path.join(dir, "doit.mjs");
    fs.writeFileSync(p, "// v1 original purpose", "utf-8");
    const r1 = await engine.summarize({ scriptPath: p, ollamaCall: okOllama("Original purpose") });
    fs.writeFileSync(p, "// v2 brand new purpose", "utf-8");
    const cache = { [p]: { hash: r1.hash, summary: "Original purpose" } };
    const r2 = await engine.summarize({ scriptPath: p, ollamaCall: okOllama("New purpose"), cache });
    expect(r2.source).toBe("ollama");
    expect(r2.hash).not.toBe(r1.hash);
    expect(r2.summary).toBe("New purpose");
  });

  it("falls back to first comment line when ollama call fails", async () => {
    const p = path.join(dir, "doit.mjs");
    fs.writeFileSync(p, "// Sync state across cluster nodes\nconst x = 1;\n", "utf-8");
    const r = await engine.summarize({ scriptPath: p, ollamaCall: failOllama("connection refused") });
    expect(r.source).toBe("fallback");
    expect(r.summary).toBe("Sync state across cluster nodes");
    expect(r.fallbackReason).toBe("connection refused");
  });

  it("falls back when ollama returns empty answer after sanitization", async () => {
    const p = path.join(dir, "doit.mjs");
    fs.writeFileSync(p, "// Audit registry consistency\nimport x from 'y';\n", "utf-8");
    const r = await engine.summarize({ scriptPath: p, ollamaCall: okOllama("```\n```") });
    expect(r.source).toBe("fallback");
    expect(r.fallbackReason).toBe("empty after sanitize");
    expect(r.summary).toBe("Audit registry consistency");
  });

  it("returns missing-file marker when scriptPath does not exist", async () => {
    const r = await engine.summarize({ scriptPath: "/no/such/script.mjs", ollamaCall: okOllama("...") });
    expect(r.source).toBe("fallback");
    expect(r.fallbackReason).toBe("missing");
    expect(r.summary).toBe("(file not found)");
  });

  it("ollama callback that throws is handled gracefully (fallback)", async () => {
    const p = path.join(dir, "doit.mjs");
    fs.writeFileSync(p, "// Compute checksum\n", "utf-8");
    const r = await engine.summarize({
      scriptPath: p,
      ollamaCall: async () => { throw new Error("network unreachable"); },
    });
    expect(r.source).toBe("fallback");
    expect(r.fallbackReason).toBe("network unreachable");
    expect(r.summary).toBe("Compute checksum");
  });
});

describe("ScriptSummaryEngine — sanitize()", () => {
  const engine = new ScriptSummaryEngine();

  it("strips code fences", () => {
    expect(engine.sanitize("```\nGenerate manifest\n```")).toBe("Generate manifest");
    expect(engine.sanitize("```typescript\nValidate input\n```")).toBe("Validate input");
  });

  it("strips leading bullets and numbering", () => {
    expect(engine.sanitize("- Generate manifest")).toBe("Generate manifest");
    expect(engine.sanitize("* Validate input")).toBe("Validate input");
    expect(engine.sanitize("1. Audit assets")).toBe("Audit assets");
  });

  it("strips 'Summary:' / 'Description:' preambles", () => {
    expect(engine.sanitize("Summary: Generate manifest")).toBe("Generate manifest");
    expect(engine.sanitize("Description: Validate input")).toBe("Validate input");
    expect(engine.sanitize("Line: Audit assets")).toBe("Audit assets");
  });

  it("collapses whitespace and takes first non-empty line", () => {
    expect(engine.sanitize("  Generate    manifest  \n\nbut wait there's more")).toBe("Generate manifest but wait there's more");
  });

  it("caps at 120 chars with ellipsis", () => {
    const out = engine.sanitize("a".repeat(200));
    expect(out.length).toBeLessThanOrEqual(120);
    expect(out.endsWith("…")).toBe(true);
  });

  it("returns empty string for null/undefined", () => {
    expect(engine.sanitize("")).toBe("");
    expect(engine.sanitize(undefined as unknown as string)).toBe("");
  });
});

describe("ScriptSummaryEngine — fallbackSummary()", () => {
  const engine = new ScriptSummaryEngine();

  it("picks first // comment line", () => {
    expect(engine.fallbackSummary("// Generate manifest\nconst x = 1;")).toBe("Generate manifest");
  });

  it("picks first # comment line", () => {
    expect(engine.fallbackSummary("# Run nightly cron\nfoo bar baz")).toBe("Run nightly cron");
  });

  it("picks first /** ... */ docstring line", () => {
    expect(engine.fallbackSummary("/**\n * Validate g-code\n * @returns void\n */")).toBe("Validate g-code");
  });

  it("skips shebangs", () => {
    expect(engine.fallbackSummary("#!/usr/bin/env node\n// Run nightly cron")).toBe("Run nightly cron");
  });

  it("returns '(no summary)' for unrecognizable header", () => {
    expect(engine.fallbackSummary("import x from 'y';\nconst a = 1;\n")).toBe("(no summary)");
  });

  it("handles empty header", () => {
    expect(engine.fallbackSummary("")).toBe("(no summary)");
  });
});

describe("ScriptSummaryEngine — hashHeader()", () => {
  const engine = new ScriptSummaryEngine();

  it("normalizes CRLF to LF before hashing (cross-OS stable)", () => {
    const a = engine.hashHeader("line1\nline2\n");
    const b = engine.hashHeader("line1\r\nline2\r\n");
    expect(a).toBe(b);
  });

  it("produces different hashes for different content", () => {
    expect(engine.hashHeader("foo")).not.toBe(engine.hashHeader("bar"));
  });

  it("hash is 16 hex chars (truncated SHA-256)", () => {
    const h = engine.hashHeader("anything");
    expect(h.length).toBe(16);
    expect(/^[a-f0-9]+$/.test(h)).toBe(true);
  });
});

describe("ScriptSummaryEngine — buildPrompt()", () => {
  const engine = new ScriptSummaryEngine();

  it("includes script path and header in the prompt", () => {
    const p = engine.buildPrompt("/path/to/foo.mjs", "// Generate output\nconsole.log('x');");
    expect(p).toContain("/path/to/foo.mjs");
    expect(p).toContain("// Generate output");
    expect(p).toContain("Output ONLY the one-line summary");
  });

  it("specifies the 120-char cap and no-markdown rule", () => {
    const p = engine.buildPrompt("/x.mjs", "");
    expect(p).toContain("120 characters");
    expect(p).toContain("No markdown");
    expect(p).toContain("Start with a verb");
  });
});
