/**
 * devDispatcher × CompactFormatterEngine wire — orphan-rescue (OBSIDIAN-PRISM-OS-MS0).
 *
 * Before this wire: CompactFormatterEngine was an orphan — built (149 LoC,
 * 8 stateless methods, existing engine tests at
 * __tests__/compact-formatter-engine.test.ts) but no dispatcher reference.
 *
 * After this wire: 8 new prism_dev actions:
 *   compact_table             — render array of objects as "k:v | k:v"
 *   compact_kv_pairs          — render record as "k=v k=v" (inline) or newlined
 *   compact_summarize_array   — "first N items, ...+X more"
 *   compact_compact           — deep object → single-line summary (3 levels)
 *   compact_system_line       — counts → "3236E/97D/7244A"
 *   compact_diff_stat         — git diff --stat → 1-line
 *   compact_test_result       — pass/fail/skip → "N✓ M✗ K⊘"
 *   compact_truncate          — word-boundary truncate
 *
 * Engine methods are pure functions — no state, no I/O — so wire tests can
 * assert exact engine outputs from the engine source as canonical references.
 *
 * @milestone OBSIDIAN-PRISM-OS-MS0
 * @unit U-ORPHAN-RESCUE-COMPACT-FMT
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

describe("devDispatcher × CompactFormatterEngine wire (U-ORPHAN-RESCUE-COMPACT-FMT)", () => {
  // ── compact_table ───────────────────────────────────────────────────────
  it("compact_table — renders 'k:v | k:v' from key/value field selectors", async () => {
    const r = await call(server, "compact_table", {
      data: [{ name: "Foo", count: 5 }, { name: "Bar", count: 3 }],
      key_field: "name",
      value_field: "count",
    });
    expect(r.ok).toBe(true);
    expect(r.data.text).toBe("Foo:5 | Bar:3");
  });

  it("compact_table — honors custom separator", async () => {
    const r = await call(server, "compact_table", {
      data: [{ a: "x", b: 1 }, { a: "y", b: 2 }],
      key_field: "a",
      value_field: "b",
      sep: " / ",
    });
    expect(r.data.text).toBe("x:1 / y:2");
  });

  // ── compact_kv_pairs ────────────────────────────────────────────────────
  it("compact_kv_pairs — inline=true joins with single space, skips null/undefined", async () => {
    const r = await call(server, "compact_kv_pairs", {
      data: { a: 1, b: "two", c: null, d: undefined, e: true },
    });
    expect(r.ok).toBe(true);
    // Engine filters null/undefined; both c and d are dropped
    expect(r.data.text).toBe("a=1 b=two e=true");
  });

  it("compact_kv_pairs — inline=false joins with newlines", async () => {
    const r = await call(server, "compact_kv_pairs", {
      data: { x: 1, y: 2 },
      inline: false,
    });
    expect(r.data.text).toBe("x=1\ny=2");
  });

  // ── compact_summarize_array ─────────────────────────────────────────────
  it("compact_summarize_array — under limit shows everything joined by ', '", async () => {
    const r = await call(server, "compact_summarize_array", {
      arr: ["a", "b", "c"],
      max_items: 5,
    });
    expect(r.data.text).toBe("a, b, c");
  });

  it("compact_summarize_array — over limit shows first N + '+remaining more'", async () => {
    const r = await call(server, "compact_summarize_array", {
      arr: ["a", "b", "c", "d", "e", "f", "g"],
      max_items: 3,
    });
    expect(r.data.text).toBe("a, b, c ...+4 more");
  });

  // ── compact_compact ─────────────────────────────────────────────────────
  it("compact_compact — flattens shallow object to '{k:v, k:v}' shape", async () => {
    const r = await call(server, "compact_compact", {
      data: { name: "PRISM", count: 42 },
      level: "standard",
    });
    expect(r.ok).toBe(true);
    expect(r.data.text).toBe("{name:PRISM, count:42}");
  });

  it("compact_compact — array of >5 items shows '+N' suffix", async () => {
    const r = await call(server, "compact_compact", {
      data: [1, 2, 3, 4, 5, 6, 7, 8],
      level: "standard",
    });
    expect(r.data.text).toBe("[1, 2, 3, 4, 5 +3]");
  });

  it("compact_compact — depth>=maxDepth collapses to '{N keys}' or '[N items]'", async () => {
    const r = await call(server, "compact_compact", {
      data: { outer: { inner: { deep: { value: "hidden" } } } },
      level: "minimal", // maxDepth=1
    });
    // At depth 1 with minimal level, the inner object collapses to '{1 keys}'
    expect(r.data.text as string).toContain("keys");
  });

  // ── compact_system_line ─────────────────────────────────────────────────
  it("compact_system_line — uses single-letter abbreviations and joins with '/'", async () => {
    const r = await call(server, "compact_system_line", {
      counts: { engines: 3236, dispatchers: 97, actions: 7244 },
    });
    expect(r.data.text).toBe("3236E/97D/7244A");
  });

  it("compact_system_line — unknown keys are passed through as-is (no abbreviation)", async () => {
    const r = await call(server, "compact_system_line", {
      counts: { engines: 10, mystery: 5 },
    });
    expect(r.data.text).toBe("10E/5mystery");
  });

  // ── compact_diff_stat ──────────────────────────────────────────────────
  it("compact_diff_stat — small diff shows file names + summary", async () => {
    const diff = " foo.ts | 5 ++++-\n bar.ts | 3 +++\n 2 files changed, 8 insertions(+)";
    const r = await call(server, "compact_diff_stat", { diff_stat: diff });
    expect(r.data.text).toBe("foo.ts, bar.ts (2 files changed, 8 insertions(+))");
  });

  it("compact_diff_stat — large diff (>5 files) collapses to count", async () => {
    const lines = Array.from({ length: 8 }, (_, i) => ` f${i}.ts | 1 +`);
    const diff = [...lines, " 8 files changed, 8 insertions(+)"].join("\n");
    const r = await call(server, "compact_diff_stat", { diff_stat: diff });
    expect(r.data.text).toBe("8 files changed (8 files changed, 8 insertions(+))");
  });

  // ── compact_test_result ────────────────────────────────────────────────
  it("compact_test_result — all-pass shows only ✓", async () => {
    const r = await call(server, "compact_test_result", { passed: 100, failed: 0 });
    expect(r.data.text).toBe("100✓");
  });

  it("compact_test_result — full triple shows ✓ ✗ ⊘", async () => {
    const r = await call(server, "compact_test_result", { passed: 50, failed: 2, skipped: 3 });
    expect(r.data.text).toBe("50✓ 2✗ 3⊘");
  });

  // ── compact_truncate ───────────────────────────────────────────────────
  it("compact_truncate — short text passes through unchanged", async () => {
    const r = await call(server, "compact_truncate", { text: "hi", max_len: 100 });
    expect(r.data.text).toBe("hi");
  });

  it("compact_truncate — long text cuts at word boundary with '...' suffix", async () => {
    const r = await call(server, "compact_truncate", {
      text: "the quick brown fox jumps over the lazy dog",
      max_len: 20,
    });
    const out = r.data.text as string;
    expect(out.endsWith("...")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(20);
  });

  // ── schema validation ─────────────────────────────────────────────────
  it("schema rejects compact_table missing key_field", async () => {
    const r = await call(server, "compact_table", {
      data: [{ a: 1 }],
      value_field: "a",
    });
    expect(r.ok).toBe(false);
  });

  it("schema rejects compact_test_result with negative count", async () => {
    const r = await call(server, "compact_test_result", { passed: -1, failed: 0 });
    expect(r.ok).toBe(false);
  });

  it("schema rejects compact_truncate with max_len > 10000", async () => {
    const r = await call(server, "compact_truncate", { text: "x", max_len: 99999 });
    expect(r.ok).toBe(false);
  });

  // ── all 8 actions accepted ─────────────────────────────────────────────
  it("all 8 compact_* actions are accepted by the registered dispatcher", async () => {
    const actions: Array<[string, Record<string, unknown>]> = [
      ["compact_table",            { data: [{ x: 1 }], key_field: "x", value_field: "x" }],
      ["compact_kv_pairs",         { data: { x: 1 } }],
      ["compact_summarize_array",  { arr: [1, 2, 3] }],
      ["compact_compact",          { data: { x: 1 } }],
      ["compact_system_line",      { counts: { engines: 5 } }],
      ["compact_diff_stat",        { diff_stat: "1 file changed" }],
      ["compact_test_result",      { passed: 1, failed: 0 }],
      ["compact_truncate",         { text: "hi" }],
    ];
    for (const [act, p] of actions) {
      const r = await call(server, act, p);
      expect(r.ok, `${act} should succeed`).toBe(true);
      expect(r.data.success).toBe(true);
    }
  });
});
