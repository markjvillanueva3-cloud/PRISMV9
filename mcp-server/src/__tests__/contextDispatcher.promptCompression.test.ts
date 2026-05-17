/**
 * WIRE-UNWIRED-MS0/U-WIRE-PROMPT-COMPRESS — prism_context:prompt_* tests
 *
 * Round-trips PromptCompressionEngine through the prism_context MCP handler.
 * Hermetic — engine is pure regex compute, no I/O.
 *
 * Coverage (2 actions × technique-by-technique):
 *   - prompt_compress: each of the 5 techniques (filler-removal,
 *                      whitespace-collapse, markdown-strip, abbreviation,
 *                      dedup-sentences) verified by inspecting result.techniques
 *                      with a fixture that activates ONLY that technique
 *   - prompt_compress: token savings math (~4 chars/token); savingsPercent
 *                      = integer of (orig-compressed)/orig
 *   - prompt_is_worth_compressing: threshold at length > 200
 *
 * @milestone WIRE-UNWIRED-MS0 / U-WIRE-PROMPT-COMPRESS
 */
import { describe, it, expect } from "vitest";

type RegisteredTool = {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: string; text: string }> }>;
};

function makeFakeServer(): { server: { tool: (...args: unknown[]) => void }; tools: RegisteredTool[] } {
  const tools: RegisteredTool[] = [];
  const server = {
    tool: (...args: unknown[]) => {
      tools.push({
        name: args[0] as string,
        description: args[1] as string,
        schema: args[2] as Record<string, unknown>,
        handler: args[3] as RegisteredTool["handler"],
      });
    },
  };
  return { server, tools };
}

async function buildPrismContextHandler(): Promise<RegisteredTool["handler"]> {
  const { server, tools } = makeFakeServer();
  const { registerContextDispatcher } = await import("../tools/dispatchers/contextDispatcher.js");
  registerContextDispatcher(server as never);
  const ctx = tools.find((t) => t.name === "prism_context");
  if (!ctx) throw new Error("registerContextDispatcher did not register a tool named 'prism_context'");
  return ctx.handler;
}

function parsePayload(response: { content: Array<{ type: string; text: string }> }): Record<string, unknown> {
  const text = response.content?.[0]?.text ?? "";
  return JSON.parse(text);
}

// ── prompt_compress — each technique ─────────────────────────────────────────

describe("prism_context:prompt_compress — technique detection", () => {
  it("filler-removal: 'please make sure to' filler is stripped", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "prompt_compress",
      params: { prompt: "please make sure to read the file carefully" },
    });
    const data = parsePayload(r).data as Record<string, unknown>;
    expect((data.techniques as string[]).includes("filler-removal")).toBe(true);
    expect(data.compressed).not.toMatch(/please/i);
    expect(data.compressed).not.toMatch(/make sure to/i);
    expect((data.savings as number) > 0).toBe(true);
  });

  it("abbreviation: function/directory/configuration → fn/dir/config", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "prompt_compress",
      params: { prompt: "the function in this directory updates the configuration of the application repository" },
    });
    const data = parsePayload(r).data as Record<string, unknown>;
    expect((data.techniques as string[]).includes("abbreviation")).toBe(true);
    expect(data.compressed as string).toMatch(/\bfn\b/);
    expect(data.compressed as string).toMatch(/\bdir\b/);
    expect(data.compressed as string).toMatch(/\bconfig\b/);
    expect(data.compressed as string).toMatch(/\bapp\b/);
    expect(data.compressed as string).toMatch(/\brepo\b/);
  });

  it("markdown-strip: '# header' + '**bold**' lose their markup", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "prompt_compress",
      params: { prompt: "# Title\n**bold text** then plain" },
    });
    const data = parsePayload(r).data as Record<string, unknown>;
    expect((data.techniques as string[]).includes("markdown-strip")).toBe(true);
    expect(data.compressed as string).not.toMatch(/#/);
    expect(data.compressed as string).not.toMatch(/\*\*/);
    expect(data.compressed as string).toMatch(/bold text/);
    expect(data.compressed as string).toMatch(/Title/);
  });

  it("dedup-sentences: repeated sentence collapses to one", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "prompt_compress",
      params: { prompt: "Run the test. Run the test. Then commit." },
    });
    const data = parsePayload(r).data as Record<string, unknown>;
    expect((data.techniques as string[]).includes("dedup-sentences")).toBe(true);
    // After dedup, only one 'Run the test' should remain
    const matches = (data.compressed as string).match(/Run the test/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("whitespace-collapse: multiple spaces and newlines collapse to single space", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "prompt_compress",
      params: { prompt: "alpha     bravo\n\n\ncharlie\t\tdelta" },
    });
    const data = parsePayload(r).data as Record<string, unknown>;
    expect((data.techniques as string[]).includes("whitespace-collapse")).toBe(true);
    expect(data.compressed as string).toBe("alpha bravo charlie delta");
  });

  it("token math: originalTokens = ceil(len/4); savings = orig - compressed", async () => {
    const handler = await buildPrismContextHandler();
    // 200-char prompt → 200/4 = 50 tokens estimate
    const prompt = "x".repeat(200);
    const r = await handler({
      action: "prompt_compress",
      params: { prompt },
    });
    const data = parsePayload(r).data as Record<string, unknown>;
    expect(data.originalTokens).toBe(50);
    // No fillers/markdown to strip → compressed == prompt → 0 savings
    expect(data.savings).toBe(0);
    expect(data.savingsPercent).toBe(0);
  });

  it("savingsPercent integer; high-filler prompt saves >0%", async () => {
    const handler = await buildPrismContextHandler();
    const heavy =
      "Please kindly read the configuration file and please kindly update the documentation. "
      + "Please kindly read the configuration file and please kindly update the documentation.";
    const r = await handler({ action: "prompt_compress", params: { prompt: heavy } });
    const data = parsePayload(r).data as Record<string, unknown>;
    expect((data.savingsPercent as number)).toBeGreaterThan(0);
    expect(Number.isInteger(data.savingsPercent)).toBe(true);
    expect((data.techniques as string[]).length).toBeGreaterThan(1);
  });
});

// ── prompt_is_worth_compressing ──────────────────────────────────────────────

describe("prism_context:prompt_is_worth_compressing — threshold @ length > 200", () => {
  it("200-char prompt → false (boundary, NOT >200)", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "prompt_is_worth_compressing",
      params: { prompt: "x".repeat(200) },
    });
    expect((parsePayload(r).data as { isWorthCompressing: boolean }).isWorthCompressing).toBe(false);
  });

  it("201-char prompt → true (just over boundary)", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "prompt_is_worth_compressing",
      params: { prompt: "x".repeat(201) },
    });
    expect((parsePayload(r).data as { isWorthCompressing: boolean }).isWorthCompressing).toBe(true);
  });

  it("empty string → false (way below threshold)", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({ action: "prompt_is_worth_compressing", params: { prompt: "" } });
    expect((parsePayload(r).data as { isWorthCompressing: boolean }).isWorthCompressing).toBe(false);
  });
});

// ── adversarial ──────────────────────────────────────────────────────────────

describe("prism_context:prompt_* — adversarial", () => {
  it("prompt_compress rejects missing prompt", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({ action: "prompt_compress", params: {} });
    expect(parsePayload(r).success).not.toBe(true);
  });

  it("prompt_compress rejects empty prompt (min(1))", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({ action: "prompt_compress", params: { prompt: "" } });
    expect(parsePayload(r).success).not.toBe(true);
  });

  it("prompt_compress rejects extra keys (.strict())", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "prompt_compress",
      params: { prompt: "hello world", extra: true },
    });
    expect(parsePayload(r).success).not.toBe(true);
  });
});
