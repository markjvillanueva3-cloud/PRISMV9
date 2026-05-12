/**
 * SpecHtmlRender.dispatcher.e2e.test.ts — true dispatcher round-trip for prism_dev.spec_html_render.
 *
 * BACKEND-DEVTOOLS-RGS6 HTML-COMPANION-MS0 wiring proof. Mocks McpServer.tool() to capture the
 * registered prism_dev handler, then invokes it with real {action, params} so the ACTIONS enum,
 * the per-action Zod schema (ACTION_DEV_SCHEMAS.spec_html_render), the switch/case, the lazy
 * `await import("../engines/SpecHTMLCompanionEngine.js")`, and the response shaping all run through
 * production code paths — not the engine singleton in isolation.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";

type McpHandler = (args: { action: string; params?: Record<string, unknown> }) => Promise<
  { content?: Array<{ type: "text"; text: string }>; isError?: boolean } | Record<string, unknown>
>;

function captureHandler(): { handler: McpHandler; schemaActions: readonly string[] } {
  let handler: McpHandler | null = null;
  let enumValues: readonly string[] = [];
  const server = {
    tool(_name: string, _description: string, schema: Record<string, unknown>, cb: McpHandler) {
      handler = cb;
      const action = (schema as { action?: { _def?: { values?: readonly string[]; entries?: Record<string, string> } } }).action;
      if (action?._def?.values) enumValues = action._def.values;
      else if (action?._def?.entries) enumValues = Object.keys(action._def.entries);
    },
  };
  registerDevDispatcher(server as unknown as Parameters<typeof registerDevDispatcher>[0]);
  if (!handler) throw new Error("registerDevDispatcher did not register a handler");
  return { handler, schemaActions: enumValues };
}

async function invoke(handler: McpHandler, action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const result = await handler({ action, params });
  const content = (result as { content?: Array<{ text: string }> }).content;
  if (!Array.isArray(content)) return result as Record<string, unknown>; // schema-validation failure path
  return JSON.parse(content[0]?.text ?? "{}");
}

describe("prism_dev.spec_html_render — dispatcher round-trip", () => {
  let handler: McpHandler;
  let schemaActions: readonly string[];

  beforeAll(() => {
    const captured = captureHandler();
    handler = captured.handler;
    schemaActions = captured.schemaActions;
  });

  it("wiring: spec_html_render is in the prism_dev ACTIONS enum and has a Zod schema", () => {
    expect(schemaActions).toContain("spec_html_render");
    const schema = ACTION_DEV_SCHEMAS.spec_html_render;
    expect(typeof schema.parse).toBe("function");
    expect(schema.parse({ md: "# X", theme: "dark", toc: false }).theme).toBe("dark");
  });

  it("schema rejects an invalid theme and non-boolean toc", () => {
    const schema = ACTION_DEV_SCHEMAS.spec_html_render;
    expect(() => schema.parse({ md: "# X", theme: "neon" })).toThrow();
    expect(() => schema.parse({ md: "# X", toc: "yes" })).toThrow();
  });

  it("happy path: rendering an MD string returns metadata (title/headings/hash) but not the HTML body by default", async () => {
    const data = await invoke(handler, "spec_html_render", {
      md: "---\ntitle: Round Trip\n---\n# Round Trip\n\nbody with a [link](https://x.example)\n\n## Section\n\n- one\n- two",
    });
    expect(data.ok).toBe(true);
    expect(data.title).toBe("Round Trip");
    expect(Array.isArray(data.headings)).toBe(true);
    expect((data.headings as Array<{ slug: string }>).map((h) => h.slug)).toEqual(["round-trip", "section"]);
    expect(data.hasMermaid).toBe(false);
    expect(String(data.sourceHash)).toMatch(/^[0-9a-f]{64}$/);
    expect(typeof data.bytes).toBe("number");
    expect(data.bytes as number).toBeGreaterThan(500);
    expect(data.html).toBeUndefined(); // include_html not requested
  });

  it("include_html:true returns the full standalone HTML document", async () => {
    const data = await invoke(handler, "spec_html_render", { md: "# Inline HTML\n\ncontent", include_html: true });
    expect(data.ok).toBe(true);
    expect(typeof data.html).toBe("string");
    expect(String(data.html).startsWith("<!DOCTYPE html>")).toBe(true);
    expect(String(data.html)).toContain("<title>Inline HTML</title>");
    expect(String(data.html)).toContain('<main id="content" class="doc-body" role="main">');
  });

  it("a mermaid fence flows through: hasMermaid:true and the CDN script in the body", async () => {
    const data = await invoke(handler, "spec_html_render", { md: "# D\n\n```mermaid\ngraph LR; A-->B\n```", include_html: true });
    expect(data.hasMermaid).toBe(true);
    expect(String(data.html)).toContain('<div class="mermaid">');
    expect(String(data.html)).toContain("cdn.jsdelivr.net/npm/mermaid");
  });

  it("error: no md and no path → ok:false with a guidance message (not a thrown exception)", async () => {
    const data = await invoke(handler, "spec_html_render", {});
    expect(data.ok).toBe(false);
    expect(String(data.error)).toMatch(/provide 'md'.*or 'path'/i);
  });

  it("error: a nonexistent path → ok:false 'file not found'", async () => {
    const data = await invoke(handler, "spec_html_render", { path: "state/shared/__definitely_not_a_real_spec__.md" });
    expect(data.ok).toBe(false);
    expect(String(data.error)).toMatch(/not found/i);
  });

  it("error: a path that escapes the PRISM root is rejected", async () => {
    const data = await invoke(handler, "spec_html_render", { path: "../../../../Windows/System32/drivers/etc/hosts" });
    expect(data.ok).toBe(false);
    expect(String(data.error)).toMatch(/escapes PRISM root|not found/i);
  });
});
