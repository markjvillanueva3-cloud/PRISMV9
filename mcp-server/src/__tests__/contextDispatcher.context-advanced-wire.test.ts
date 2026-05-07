/**
 * contextDispatcher — Context Advanced wiring round-trip suite
 * =============================================================
 *
 * COGNITIVE-BRIDGE-MS0 / U-WIRE-COG-BATCH2
 *
 * Verifies 7 context-advanced engines reach prism_context dispatcher with
 * exact-value, structural, and domain-membership assertions:
 *   - contextDigestEngine     → context_digest_file (file digest + symbols)
 *   - contextWindowMapEngine  → context_window_add (segment id alloc)
 *   - contextIntegrityEngine  → context_integrity_check_edit (alert | null)
 *   - contextSnapshotEngine   → context_snapshot_create (Snapshot literal)
 *   - contextCompactionEngine → context_compaction_create_context (ctx scaffold)
 *   - contextRetentionEngine  → context_retention_extract_facts (fact array)
 *   - errorContextEngine      → context_error_from_build (parsed errors)
 *
 * @milestone COGNITIVE-BRIDGE-MS0
 * @unit U-WIRE-COG-BATCH2
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerContextDispatcher } from "../tools/dispatchers/contextDispatcher.js";

interface CapturedTool {
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(_n: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ handler });
  }
}

interface DispatchResult { ok: boolean; data: Record<string, unknown> }

async function call(server: MockMCPServer, action: string, params: Record<string, unknown> = {}): Promise<DispatchResult> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const parsed = JSON.parse(envelope.content[0]!.text) as Record<string, unknown>;
  if ("error" in parsed) return { ok: false, data: parsed };
  return { ok: true, data: parsed };
}

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerContextDispatcher(server as unknown as Parameters<typeof registerContextDispatcher>[0]);
});

describe("U-WIRE-COG-BATCH2 / ContextDigestEngine", () => {
  it("digest_file on TS source returns lines, tokens, and a non-empty digest", async () => {
    const sample = `export class Foo {\n  bar(): void {}\n  baz(): number { return 1; }\n}\n`;
    const r = await call(server, "context_digest_file", { path: "src/Foo.ts", content: sample });
    expect(r.ok).toBe(true);
    const d = r.data.digest as { path: string; type: string; lines: number; tokens: number; digest: string };
    expect(d.path).toBe("src/Foo.ts");
    expect(d.type).toBe("typescript");
    // sample ends with "\n" so split("\n") yields 5 elements (last is "")
    expect(d.lines).toBe(5);
    // tokens = ceil(content.length / 4) per engine impl
    expect(d.tokens).toBe(Math.ceil(sample.length / 4));
    expect(d.digest.length).toBeGreaterThan(0);
    expect(typeof r.data.oneliner).toBe("string");
    expect((r.data.oneliner as string).length).toBeGreaterThan(0);
  });

  it("digest_file on plaintext returns type=plaintext or other-non-typescript", async () => {
    const r = await call(server, "context_digest_file", { path: "notes.txt", content: "hello world\nthis is a note" });
    expect(r.ok).toBe(true);
    const d = r.data.digest as { type: string; lines: number };
    expect(d.type).not.toBe("typescript");
    expect(d.lines).toBe(2);
  });
});

describe("U-WIRE-COG-BATCH2 / ContextWindowMapEngine", () => {
  it("window_add returns a non-empty segment id", async () => {
    const r = await call(server, "context_window_add", { type: "file", label: "Foo.ts", tokens: 1500 });
    expect(r.ok).toBe(true);
    const id = r.data.segment_id as string;
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("window_add with each of the 7 segment types succeeds", async () => {
    const types = ["system", "file", "tool-output", "conversation", "memory", "error", "other"];
    const ids = await Promise.all(
      types.map(t => call(server, "context_window_add", { type: t, label: `${t}-segment`, tokens: 100 })),
    );
    for (const r of ids) expect(r.ok).toBe(true);
    const idSet = new Set(ids.map(r => r.data.segment_id as string));
    expect(idSet.size).toBe(types.length); // all distinct
  });
});

describe("U-WIRE-COG-BATCH2 / ContextIntegrityEngine", () => {
  it("integrity_check_edit on never-read path returns an edit-without-read alert (or null)", async () => {
    // Engine returns { alert: IntegrityAlert | null }. Without prior recordRead,
    // edit-without-read may fire. Either null OR an alert with severity ∈ {warn, block}.
    const r = await call(server, "context_integrity_check_edit", { path: "/some/random/never/read.ts" });
    expect(r.ok).toBe(true);
    const alert = r.data.alert as { type?: string; severity?: string } | null;
    if (alert !== null) {
      expect(["stale-context", "unverified-claim", "post-compaction-gap", "agent-silent-fail", "edit-without-read"]).toContain(alert.type);
      expect(["warn", "block"]).toContain(alert.severity);
    }
  });
});

describe("U-WIRE-COG-BATCH2 / ContextSnapshotEngine", () => {
  it("snapshot_create returns a Snapshot with timestamp, supplied fields preserved, and a formatted string", async () => {
    const before = Date.now();
    const r = await call(server, "context_snapshot_create", {
      workingFiles: ["a.ts", "b.ts"],
      activeTask: "wire batch 2",
      keyDecisions: ["use minimal action set"],
      nextSteps: ["test", "commit"],
      engineCount: 3157,
      testCount: 3333,
    });
    expect(r.ok).toBe(true);
    const snap = r.data.snapshot as { timestamp: number; workingFiles: string[]; activeTask: string; keyDecisions: string[]; nextSteps: string[]; engineCount: number; testCount: number };
    expect(snap.timestamp).toBeGreaterThanOrEqual(before);
    expect(snap.workingFiles).toEqual(["a.ts", "b.ts"]);
    expect(snap.activeTask).toBe("wire batch 2");
    expect(snap.keyDecisions).toEqual(["use minimal action set"]);
    expect(snap.nextSteps).toEqual(["test", "commit"]);
    expect(snap.engineCount).toBe(3157);
    expect(snap.testCount).toBe(3333);
    expect(typeof r.data.formatted).toBe("string");
    expect((r.data.formatted as string).length).toBeGreaterThan(0);
  });
});

describe("U-WIRE-COG-BATCH2 / ContextCompactionEngine", () => {
  it("compaction_create_context returns a ConversationContext that respects maxTokens", async () => {
    const r = await call(server, "context_compaction_create_context", { maxTokens: 50_000 });
    expect(r.ok).toBe(true);
    const ctx = r.data.context as { items?: unknown[]; maxTokens?: number; currentTokens?: number };
    // items array may be slimmed away when empty; that's expected for a fresh context
    const items = ctx.items ?? [];
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(0);
    if (ctx.maxTokens !== undefined) expect(ctx.maxTokens).toBe(50_000);
  });
});

describe("U-WIRE-COG-BATCH2 / ContextRetentionEngine", () => {
  it("extract_facts on text with safety phrasing returns at least 1 fact with a known category", async () => {
    const text = "ALWAYS use the canonical Kienzle constants from src/physics/constants.ts. Never inline kc1.1 values.";
    const r = await call(server, "context_retention_extract_facts", { text });
    expect(r.ok).toBe(true);
    const facts = r.data.facts as Array<{ content: string; reason: string; category: string; importance: number }>;
    expect(facts.length).toBeGreaterThanOrEqual(1);
    for (const f of facts) {
      expect(["machine", "material", "customer", "safety", "correction", "preference", "process"]).toContain(f.category);
      expect(f.importance).toBeGreaterThanOrEqual(1);
      expect(f.importance).toBeLessThanOrEqual(10);
      expect(f.content.length).toBeGreaterThan(0);
    }
  });

  it("extract_facts on bland prose returns an empty (or near-empty) facts array", async () => {
    const r = await call(server, "context_retention_extract_facts", {
      text: "The weather today is fine and clouds are drifting overhead.",
    });
    expect(r.ok).toBe(true);
    // Empty arrays are slimmed away by responseSlimmer — treat missing as []
    const facts = (r.data.facts as unknown[] | undefined) ?? [];
    expect(facts.length).toBeLessThan(3);
  });
});

describe("U-WIRE-COG-BATCH2 / ErrorContextEngine", () => {
  it("error_from_build parses a tsc error line into ErrorContext with file/line/message", async () => {
    const errorText = `mcp-server/src/engines/Foo.ts(42,9): error TS2322: Type 'string' is not assignable to type 'number'.`;
    const r = await call(server, "context_error_from_build", { error_text: errorText });
    expect(r.ok).toBe(true);
    const errs = r.data.errors as Array<{ file: string; line: number | null; message: string }>;
    expect(errs.length).toBe(1);
    expect(errs[0]!.file).toContain("Foo.ts");
    expect(errs[0]!.line).toBe(42);
    expect(errs[0]!.message).toContain("Type 'string' is not assignable");
  });

  it("error_from_build with no error pattern returns empty array (slimmed away)", async () => {
    const r = await call(server, "context_error_from_build", { error_text: "  Done in 2.3s.  " });
    expect(r.ok).toBe(true);
    // Empty arrays are slimmed; missing key is the canonical empty signal
    const errs = (r.data.errors as unknown[] | undefined) ?? [];
    expect(errs.length).toBe(0);
  });

  it("error_from_build parses 3 distinct errors", async () => {
    const errorText = [
      `src/A.ts(10,5): error TS2304: Cannot find name 'foo'.`,
      `src/B.ts(20,1): error TS2322: Type 'X' not assignable.`,
      `src/C.ts(30,2): error TS2554: Expected 1 arguments, but got 2.`,
    ].join("\n");
    const r = await call(server, "context_error_from_build", { error_text: errorText });
    expect(r.ok).toBe(true);
    const errs = r.data.errors as Array<{ file: string; line: number }>;
    expect(errs.length).toBe(3);
    expect(errs[0]!.line).toBe(10);
    expect(errs[1]!.line).toBe(20);
    expect(errs[2]!.line).toBe(30);
  });
});

describe("U-WIRE-COG-BATCH2 / schema rejections", () => {
  it("rejects context_window_add with invalid segment type", async () => {
    const r = await call(server, "context_window_add", { type: "not_a_real_type", label: "x", tokens: 100 });
    expect(r.ok).toBe(false);
  });

  it("rejects context_window_add with negative tokens", async () => {
    const r = await call(server, "context_window_add", { type: "file", label: "x", tokens: -5 });
    expect(r.ok).toBe(false);
  });

  it("rejects context_digest_file with empty path", async () => {
    const r = await call(server, "context_digest_file", { path: "", content: "x" });
    expect(r.ok).toBe(false);
  });

  it("rejects context_retention_extract_facts with empty text", async () => {
    const r = await call(server, "context_retention_extract_facts", { text: "" });
    expect(r.ok).toBe(false);
  });
});

describe("U-WIRE-COG-BATCH2 / adversarial", () => {
  it("digest_file handles 100KB content without error or NaN tokens", async () => {
    const big = "x".repeat(100_000);
    const r = await call(server, "context_digest_file", { path: "huge.txt", content: big });
    expect(r.ok).toBe(true);
    const d = r.data.digest as { tokens: number };
    expect(Number.isFinite(d.tokens)).toBe(true);
    expect(d.tokens).toBe(Math.ceil(100_000 / 4));
  });

  it("error_from_build handles 50 errors without truncating below 50", async () => {
    const lines: string[] = [];
    for (let i = 1; i <= 50; i++) {
      lines.push(`src/F${i}.ts(${i},1): error TS9999: msg ${i}`);
    }
    const r = await call(server, "context_error_from_build", { error_text: lines.join("\n") });
    expect(r.ok).toBe(true);
    expect((r.data.errors as unknown[]).length).toBe(50);
  });
});
