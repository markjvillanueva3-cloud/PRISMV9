/**
 * SessionDocRender.dispatcher.e2e.test.ts — true dispatcher round-trip for prism_session.doc_render.
 *
 * BACKEND-DEVTOOLS-RGS6 HTML-PRIMARY-MS0 / U-HPS07 wiring proof (the prism_session half — mirrors
 * prism_dev.spec_html_render so any consumer reaching for a session-scoped renderer gets one). Mocks
 * McpServer.tool() to capture the registered prism_session handler, then invokes it with real
 * {action, params} so the ACTIONS enum, the per-action Zod schema (ACTION_SESSION_SCHEMAS.doc_render
 * via validateActionParams), the switch/case, the lazy `await import("../engines/SpecHTMLCompanionEngine.js")`,
 * the path-escape guard, and the response shaping all run through production code paths — not the
 * engine singleton in isolation.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";
import { ACTION_SESSION_SCHEMAS } from "../schemas/sessionActionSchemas.js";

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
  registerSessionDispatcher(server as unknown as Parameters<typeof registerSessionDispatcher>[0]);
  if (!handler) throw new Error("registerSessionDispatcher did not register a handler");
  return { handler, schemaActions: enumValues };
}

async function invoke(handler: McpHandler, action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const result = await handler({ action, params });
  const content = (result as { content?: Array<{ text: string }> }).content;
  if (!Array.isArray(content)) return result as Record<string, unknown>; // schema-validation failure path
  return JSON.parse(content[0]?.text ?? "{}");
}

describe("prism_session.doc_render — dispatcher round-trip", () => {
  let handler: McpHandler;
  let schemaActions: readonly string[];

  beforeAll(() => {
    const captured = captureHandler();
    handler = captured.handler;
    schemaActions = captured.schemaActions;
  });

  it("wiring: doc_render is in the prism_session ACTIONS enum and has a Zod schema", () => {
    expect(schemaActions).toContain("doc_render");
    const schema = ACTION_SESSION_SCHEMAS.doc_render;
    expect(typeof schema.parse).toBe("function");
    expect(schema.parse({ md: "# X", theme: "dark", toc: false }).theme).toBe("dark");
  });

  it("schema rejects an invalid theme and a non-boolean toc", () => {
    const schema = ACTION_SESSION_SCHEMAS.doc_render;
    expect(() => schema.parse({ md: "# X", theme: "neon" })).toThrow();
    expect(() => schema.parse({ md: "# X", toc: "yes" })).toThrow();
  });

  it("happy path: rendering an MD string returns metadata (title/headings/hash) but not the HTML body by default", async () => {
    const data = await invoke(handler, "doc_render", {
      md: "---\ntitle: Round Trip\n---\n# Round Trip\n\nbody with a [link](https://x.example)\n\n## Section\n\n- one\n- two",
    });
    expect(data.success).toBe(true);
    expect(data.title).toBe("Round Trip");
    expect(Array.isArray(data.headings)).toBe(true);
    expect((data.headings as Array<{ slug: string }>).map((h) => h.slug)).toEqual(["round-trip", "section"]);
    expect((data.headings as Array<{ level: number }>)[0].level).toBe(1);
    expect(data.hasMermaid).toBe(false);
    expect(String(data.sourceHash)).toMatch(/^[0-9a-f]{64}$/);
    expect(typeof data.bytes).toBe("number");
    expect(data.bytes as number).toBeGreaterThan(500);
    // warnings is surfaced as an array when the render produced any; absent (undefined) for a clean render
    expect(data.warnings === undefined || Array.isArray(data.warnings)).toBe(true);
    expect(data.html).toBeUndefined(); // include_html not requested
  });

  it("include_html:true returns the full standalone HTML document with the ARIA landmarks", async () => {
    const data = await invoke(handler, "doc_render", { md: "# Inline HTML\n\ncontent here", include_html: true });
    expect(data.success).toBe(true);
    expect(typeof data.html).toBe("string");
    expect(String(data.html).startsWith("<!DOCTYPE html>")).toBe(true);
    expect(String(data.html)).toContain("<title>Inline HTML</title>");
    expect(String(data.html)).toContain('<main id="content" class="doc-body" role="main">');
    expect(String(data.html)).toContain('<a class="skip-link" href="#content">');
  });

  it("a mermaid fence flows through: hasMermaid:true and the CDN script in the body", async () => {
    const data = await invoke(handler, "doc_render", { md: "# D\n\n```mermaid\ngraph LR; A-->B\n```", include_html: true });
    expect(data.success).toBe(true);
    expect(data.hasMermaid).toBe(true);
    expect(String(data.html)).toContain('<div class="mermaid">');
    expect(String(data.html)).toContain("cdn.jsdelivr.net/npm/mermaid");
  });

  it("theme=light pins data-theme on <html>", async () => {
    const data = await invoke(handler, "doc_render", { md: "# Themed\n\nbody", theme: "light", include_html: true });
    expect(String(data.html)).toContain('<html lang="en" data-theme="light">');
  });

  it("error: no md and no path → success:false with a guidance message (not a thrown exception)", async () => {
    const data = await invoke(handler, "doc_render", {});
    expect(data.success).toBe(false);
    expect(String(data.error)).toMatch(/provide 'md'.*or 'path'/i);
  });

  it("error: a nonexistent path → success:false 'file not found'", async () => {
    const data = await invoke(handler, "doc_render", { path: "state/shared/__definitely_not_a_real_spec__.md" });
    expect(data.success).toBe(false);
    expect(String(data.error)).toMatch(/not found/i);
  });

  it("error: a path that escapes the PRISM root is rejected", async () => {
    const data = await invoke(handler, "doc_render", { path: "../../../../Windows/System32/drivers/etc/hosts" });
    expect(data.success).toBe(false);
    expect(String(data.error)).toMatch(/escapes PRISM root|not found/i);
  });

  it("accepts the 'markdown' alias for 'md'", async () => {
    const data = await invoke(handler, "doc_render", { markdown: "# Via Alias\n\nbody" });
    expect(data.success).toBe(true);
    expect(data.title).toBe("Via Alias");
  });
});
