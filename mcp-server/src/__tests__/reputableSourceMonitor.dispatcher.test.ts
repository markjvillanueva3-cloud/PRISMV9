/**
 * ReputableSourceMonitorEngine — prism_dev:source_sweep wire test
 * =================================================================
 *
 * Round-trip integration test for AUTO-LEARNING-LOOP-MS0/U-ALL01 step-5.
 * Captures the action handler closure registered by `registerDevDispatcher()` via
 * a fake MCP server, then invokes the closure for each `source_sweep` mode
 * to prove the dispatcher → engine wiring is end-to-end.
 *
 * Tests:
 *   §1 schema validates source_sweep params (all modes + slug)
 *   §2 invalid params rejected by middleware
 *   §3 get_sources returns the configured source list
 *   §4 get_state with unknown slug returns error
 *   §5 get_state with known slug returns SourceState snapshot
 *   §6 reset_all clears state (returns sources count)
 *   §7 poll_one missing slug returns missing_required
 *
 * (Note: invalid-mode coverage lives in §2 — the schema z.enum rejects
 * unknown modes BEFORE the handler runs, so the handler's invalid_mode
 * default branch is unreachable in production.)
 *
 * Does NOT test poll_all / poll_one against real network — those land
 * on the live CLI integration (`node scripts/source-monitor-sweep.mjs`)
 * per the spec's verifies_via channel. The engine's own test file
 * (ReputableSourceMonitorEngine.test.ts) covers polling logic with mocked
 * fetch.
 *
 * @milestone AUTO-LEARNING-LOOP-MS0 / U-ALL01
 */

import { describe, it, expect, beforeAll } from "vitest";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

// ─── Fake MCP server to capture the action handler ───────────────────

type ToolHandler = (args: Record<string, unknown>) => Promise<{ content: Array<{ type: "text"; text: string }> }>;

interface FakeServer {
  tool(
    name: string,
    description: string,
    schema: Record<string, unknown>,
    handler: ToolHandler,
  ): void;
}

let capturedHandler: ToolHandler | null = null;

const fakeServer: FakeServer = {
  tool(_name, _desc, _schema, handler) {
    capturedHandler = handler;
  },
};

async function call(params: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!capturedHandler) throw new Error("handler not captured");
  const resp = await capturedHandler({ action: "source_sweep", params });
  // dispatcher returns either { content:[{type:"text", text:JSON}] } OR a raw
  // error object from the middleware (see dispatcherError). Both shapes are
  // valid endpoints; parse defensively.
  if (resp && typeof resp === "object" && "content" in resp) {
    const text = (resp as { content: Array<{ text: string }> }).content[0]?.text ?? "{}";
    return JSON.parse(text);
  }
  return resp as Record<string, unknown>;
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("prism_dev:source_sweep — U-ALL01 step-5 wire", () => {
  beforeAll(() => {
    capturedHandler = null;
    registerDevDispatcher(fakeServer as never);
    if (!capturedHandler) throw new Error("registerDevDispatcher did not register the handler");
  });

  describe("§1 schema — accepts all 5 modes + slug", () => {
    it("accepts mode=poll_all with no slug", () => {
      const schema = ACTION_DEV_SCHEMAS.source_sweep;
      const ok = schema!.safeParse({ mode: "poll_all" });
      expect(ok.success).toBe(true);
    });

    it("accepts mode=poll_one with slug", () => {
      const schema = ACTION_DEV_SCHEMAS.source_sweep;
      const ok = schema!.safeParse({ mode: "poll_one", slug: "arxiv-cs-ai" });
      expect(ok.success).toBe(true);
    });

    it("accepts mode=get_state with slug", () => {
      const schema = ACTION_DEV_SCHEMAS.source_sweep;
      const ok = schema!.safeParse({ mode: "get_state", slug: "arxiv-cs-ai" });
      expect(ok.success).toBe(true);
    });

    it("accepts mode=get_sources / reset_all without slug", () => {
      const schema = ACTION_DEV_SCHEMAS.source_sweep;
      expect(schema!.safeParse({ mode: "get_sources" }).success).toBe(true);
      expect(schema!.safeParse({ mode: "reset_all" }).success).toBe(true);
    });

    it("accepts empty params (defaults to poll_all)", () => {
      const schema = ACTION_DEV_SCHEMAS.source_sweep;
      expect(schema!.safeParse({}).success).toBe(true);
      expect(schema!.safeParse(undefined).success).toBe(true);
    });
  });

  describe("§2 schema rejects invalid mode + invalid types", () => {
    it("rejects unknown mode string", () => {
      const schema = ACTION_DEV_SCHEMAS.source_sweep;
      const r = schema!.safeParse({ mode: "delete_everything" });
      expect(r.success).toBe(false);
    });

    it("rejects non-string slug", () => {
      const schema = ACTION_DEV_SCHEMAS.source_sweep;
      const r = schema!.safeParse({ mode: "poll_one", slug: 123 });
      expect(r.success).toBe(false);
    });
  });

  describe("§3 get_sources — returns the configured 10-source list", () => {
    it("returns sources array with each source's slug + url + type", async () => {
      const r = await call({ mode: "get_sources" });
      expect(Array.isArray(r.sources)).toBe(true);
      const sources = r.sources as Array<{ slug: string; url: string; type: string }>;
      expect(sources).toHaveLength(10);
      // Concrete slug check — first source per DEFAULT_SOURCES order.
      expect(sources[0].slug).toBe("arxiv-cs-ai");
      expect(sources[0].type).toBe("rss");
      expect(sources[0].url).toBe("https://export.arxiv.org/rss/cs.AI");
    });
  });

  describe("§4 get_state — unknown slug returns error", () => {
    it("returns error=unknown_slug + the slug echoed", async () => {
      const r = await call({ mode: "get_state", slug: "does-not-exist" });
      expect(r.error).toBe("unknown_slug");
      expect(r.slug).toBe("does-not-exist");
    });
  });

  describe("§5 get_state — known slug returns fresh SourceState (slimResponse-aware)", () => {
    it("returns the slug + a slimmed state object on fresh engine", async () => {
      // resetAll first to guarantee fresh state.
      await call({ mode: "reset_all" });
      const r = await call({ mode: "get_state", slug: "arxiv-cs-ai" });
      expect(r.slug).toBe("arxiv-cs-ai");
      // Response passes through slimResponse, which strips null/undefined.
      // A fresh SourceState is { etag:null, lastModified:null, lastSuccess:null,
      // consecutiveFailures:0, backoffUntil:null } — only the numeric 0 survives.
      // Assert exact post-slim shape, not the pre-slim engine shape.
      expect(r.state).toEqual({ consecutiveFailures: 0 });
    });
  });

  describe("§6 reset_all — clears state, reports source count", () => {
    it("returns reset=true and sources=10", async () => {
      const r = await call({ mode: "reset_all" });
      expect(r.reset).toBe(true);
      expect(r.sources).toBe(10);
    });
  });

  describe("§7 poll_one — missing slug returns missing_required", () => {
    it("returns missing_required with field=slug", async () => {
      const r = await call({ mode: "poll_one" });
      expect(r.error).toBe("missing_required");
      expect(r.field).toBe("slug");
    });
  });

});
