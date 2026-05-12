/**
 * hookDispatcher — `manifest` action round-trip suite
 * ===================================================
 *
 * HOOK-MANIFEST-DAG-MS26 / P0-U01 — wires {@link HookManifestEngine} into
 * `prism_hook:manifest`. These tests drive the action *through the dispatcher*
 * (register → call `prism_hook` → parse the MCP envelope), never the engine
 * singleton directly, so they exercise the action enum, the Zod schema in
 * {@link HOOK_ACTION_SCHEMAS}, param normalization, the `slimResponse` envelope,
 * and the lazy `import(... HookManifestEngine.js)`.
 *
 * Coverage: happy paths (summary / full / by-event / by-hook / write+alias), an
 * event-config variability span, ≥3 schema-rejection cases, ≥3 adversarial /
 * boundary inputs, graceful-degradation (bad repoRoot), and wiring regression
 * guards. Assertions are behavioural (catalog/stats invariants, on-disk
 * round-trip, repo-root resolution actually finding `.claude/hooks`).
 *
 * @milestone HOOK-MANIFEST-DAG-MS26
 * @unit P0-U01
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { registerHookDispatcher } from "../tools/dispatchers/hookDispatcher.js";

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
): Promise<{ ok: boolean; data: any }> {
  const tool = server.tools.find((t) => t.name === "prism_hook");
  if (!tool) throw new Error("prism_hook not registered");
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw };
  }
  const envelope = raw as { content?: { type: string; text: string }[] };
  if (!envelope.content || envelope.content.length === 0) return { ok: false, data: { rawEnvelope: raw } };
  const text = envelope.content[0]!.text;
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in parsed) return { ok: false, data: parsed };
  return { ok: true, data: parsed };
}

let server: MockMCPServer;
const tmpPaths: string[] = [];

beforeEach(() => {
  server = new MockMCPServer();
  registerHookDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

afterEach(() => {
  for (const p of tmpPaths.splice(0)) {
    try {
      fs.rmSync(p, { force: true, recursive: true });
    } catch {
      /* best effort */
    }
  }
});

// ─────────────────────────────────────────────────────────────────────
// 1. Happy paths
// ─────────────────────────────────────────────────────────────────────
describe("prism_hook:manifest — happy paths", () => {
  it("default → summary of the live repo; repoRoot actually resolves to a dir with .claude/hooks", async () => {
    const r = await call(server, "manifest", {});
    expect(r.ok).toBe(true);
    expect(r.data.schemaVersion).toBe(1);
    expect(new Date(r.data.generatedAt).getTime()).toBeGreaterThan(Date.parse("2026-01-01"));
    // the engine's repo-root walk-up must land on the real PRISM root (has .claude/hooks + mcp-server)
    expect(fs.existsSync(path.join(r.data.repoRoot, ".claude", "hooks"))).toBe(true);
    expect(fs.existsSync(path.join(r.data.repoRoot, "mcp-server"))).toBe(true);
    expect(r.data.hookDirs.length).toBe(2); // .claude/hooks + mcp-server/src/hooks both exist
    expect(r.data.settingsFiles.length).toBeGreaterThanOrEqual(1);
    expect(r.data.stats.totalHooks).toBeGreaterThan(100);
    expect(r.data.stats.byKind["claude-mjs"]).toBeGreaterThan(50);
    expect(r.data.stats.byKind["mcp-ts"]).toBeGreaterThan(10);
    expect(r.data.stats.wired + r.data.stats.orphaned).toBe(r.data.stats.totalHooks); // count invariant
    expect(r.data.hint).toMatch(/full=true/);
    // summary withholds the catalog; full=true must report the SAME totalHooks
    const full = await call(server, "manifest", { full: true });
    expect(full.ok).toBe(true);
    expect(full.data.stats.totalHooks).toBe(r.data.stats.totalHooks);
  });

  it("full=true → entire catalog, self-consistent (length === totalHooks, refs resolve, sorted)", async () => {
    const r = await call(server, "manifest", { full: true });
    expect(r.ok).toBe(true);
    expect(r.data.hooks.length).toBe(r.data.stats.totalHooks);
    expect(r.data.hooks.length).toBeGreaterThan(100);
    const files: string[] = r.data.hooks.map((h: any) => h.file);
    expect(files).toEqual([...files].sort((a, b) => a.localeCompare(b))); // engine sorts hooks by file.localeCompare
    for (const h of r.data.hooks) {
      expect(h.file.length).toBeGreaterThan(0);
      expect(["claude-mjs", "mcp-ts", "other"]).toContain(h.kind);
      expect(Number.isFinite(h.lineCount)).toBe(true);
    }
    const fileSet = new Set<string>(files);
    for (const refs of Object.values(r.data.events) as string[][]) for (const f of refs) expect(fileSet.has(f)).toBe(true);
    expect(
      (r.data.stats.byKind["claude-mjs"] ?? 0) + (r.data.stats.byKind["mcp-ts"] ?? 0) + (r.data.stats.byKind["other"] ?? 0),
    ).toBe(r.data.stats.totalHooks);
  });

  it("event=PreToolUse → only PreToolUse-wired hooks, count === list length, non-empty", async () => {
    const r = await call(server, "manifest", { event: "PreToolUse" });
    expect(r.ok).toBe(true);
    expect(r.data.event).toBe("PreToolUse");
    expect(r.data.count).toBe(r.data.hooks.length);
    expect(r.data.count).toBeGreaterThan(0); // PRISM has many PreToolUse hooks
    for (const h of r.data.hooks) {
      expect(h.file.length).toBeGreaterThan(0);
      for (const w of h.wirings ?? []) expect(w.event).toBe("PreToolUse");
    }
  });

  it("hook=<id|path> → one entry, byId and byPath agree with the full catalog", async () => {
    const all = await call(server, "manifest", { full: true });
    expect(all.ok).toBe(true);
    const sample = all.data.hooks.find((h: any) => h.kind === "claude-mjs") ?? all.data.hooks[0];
    expect(typeof sample.file).toBe("string");
    expect(sample.file.length).toBeGreaterThan(0);
    const byFile = await call(server, "manifest", { hook: sample.file });
    expect(byFile.ok).toBe(true);
    expect(byFile.data.file).toBe(sample.file);
    expect(byFile.data.id).toBe(sample.id);
    expect(byFile.data.kind).toBe(sample.kind);
    const byId = await call(server, "manifest", { hook: sample.id });
    expect(byId.ok).toBe(true);
    expect(byId.data.file).toBe(sample.file);
  });

  it("write=true → atomically writes a schema-valid manifest that re-parses to the same totals", async () => {
    const out = path.join(os.tmpdir(), `prism-hook-manifest-${process.pid}-${Date.now()}.json`);
    tmpPaths.push(out);
    const r = await call(server, "manifest", { write: true, outPath: out });
    expect(r.ok).toBe(true);
    expect(r.data.written).toBe(true);
    expect(path.resolve(r.data.path)).toBe(path.resolve(out));
    expect(r.data.stats.totalHooks).toBeGreaterThan(100);
    expect(fs.existsSync(out)).toBe(true);
    const onDisk = JSON.parse(fs.readFileSync(out, "utf-8"));
    expect(onDisk.schemaVersion).toBe(1);
    expect(onDisk.stats.totalHooks).toBe(r.data.stats.totalHooks);
    expect(onDisk.hooks.length).toBe(onDisk.stats.totalHooks);
    expect(onDisk.hooks.length).toBe(r.data.stats.totalHooks);
  });

  it("regenerate=true behaves identically to write=true", async () => {
    const a = path.join(os.tmpdir(), `prism-hm-write-${process.pid}-${Date.now()}.json`);
    const b = path.join(os.tmpdir(), `prism-hm-regen-${process.pid}-${Date.now()}.json`);
    tmpPaths.push(a, b);
    const rW = await call(server, "manifest", { write: true, outPath: a });
    const rR = await call(server, "manifest", { regenerate: true, outPath: b });
    expect(rW.ok).toBe(true);
    expect(rR.ok).toBe(true);
    expect(rR.data.written).toBe(true);
    expect(fs.existsSync(b)).toBe(true);
    expect(rR.data.stats.totalHooks).toBe(rW.data.stats.totalHooks); // same repo → same count
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Variability span — ≥3 event configs
// ─────────────────────────────────────────────────────────────────────
describe("prism_hook:manifest — event-config variability span", () => {
  for (const ev of ["PreToolUse", "Stop", "SessionStart"] as const) {
    it(`event=${ev} → resolves with count === returned-list length`, async () => {
      const r = await call(server, "manifest", { event: ev });
      expect(r.ok).toBe(true);
      expect(r.data.event).toBe(ev);
      expect(r.data.count).toBe(r.data.hooks.length);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// 3. Schema rejection — Zod must trip on wrong-typed params
// ─────────────────────────────────────────────────────────────────────
describe("prism_hook:manifest — schema rejection", () => {
  it("full as a string is rejected (must be boolean)", async () => {
    const r = await call(server, "manifest", { full: "yes" });
    expect(r.ok).toBe(false);
  });
  it("write as a number is rejected (must be boolean)", async () => {
    const r = await call(server, "manifest", { write: 1 });
    expect(r.ok).toBe(false);
  });
  it("repoRoot as a number is rejected (must be string)", async () => {
    const r = await call(server, "manifest", { repoRoot: 123 });
    expect(r.ok).toBe(false);
  });
  it("event as an array is rejected (must be string)", async () => {
    const r = await call(server, "manifest", { event: ["PreToolUse"] });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Adversarial / boundary inputs
// ─────────────────────────────────────────────────────────────────────
describe("prism_hook:manifest — adversarial / boundary inputs", () => {
  it("unknown hook id → structured not-found, with a corrective hint, no throw", async () => {
    const r = await call(server, "manifest", { hook: "definitely-not-a-real-hook-xyzzy.mjs" });
    expect(r.ok).toBe(false); // { error, hint } surfaces as ok:false through the envelope helper
    expect(r.data.error).toMatch(/not found/i);
    expect(r.data.hint).toMatch(/path|basename/i);
  });

  it("empty event string → treated as no filter, falls through to the summary (not a crash)", async () => {
    const r = await call(server, "manifest", { event: "" });
    expect(r.ok).toBe(true);
    expect(r.data.schemaVersion).toBe(1);
    expect(r.data.hint).toMatch(/full=true/); // summary view, not an event lookup
    expect(r.data.stats.totalHooks).toBeGreaterThan(100);
    expect("event" in r.data).toBe(false);
  });

  it("repoRoot at a dir with no hooks → graceful empty manifest (totalHooks 0, byKind {})", async () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-no-hooks-"));
    tmpPaths.push(emptyDir);
    const r = await call(server, "manifest", { repoRoot: emptyDir });
    expect(r.ok).toBe(true);
    expect(r.data.stats.totalHooks).toBe(0);
    expect(Object.keys(r.data.stats.byKind)).toEqual([]);
    expect(r.data.repoRoot).toBe(emptyDir.replace(/\\/g, "/"));
  });

  it("garbage passthrough params are ignored — the scan still runs", async () => {
    const r = await call(server, "manifest", { wat: "🤖", nested: { deep: [1, 2, 3] }, also_fine: true });
    expect(r.ok).toBe(true);
    expect(r.data.schemaVersion).toBe(1);
    expect(r.data.stats.totalHooks).toBeGreaterThan(100);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Wiring regression guards
// ─────────────────────────────────────────────────────────────────────
describe("prism_hook:manifest — wiring regression guards", () => {
  it("'manifest' is in the prism_hook action enum and the tool description", () => {
    const tool = server.tools.find((t) => t.name === "prism_hook");
    expect(tool?.name).toBe("prism_hook");
    const actionEnum = (tool!.schema as any).action;
    expect(actionEnum.options).toContain("manifest"); // zod v4 ZodEnum.options
    expect(tool!.description).toContain("manifest");
  });

  it("pre-existing 'list' action still routes through the dispatcher", async () => {
    const r = await call(server, "list", {});
    expect(r.ok).toBe(true);
  });

  it("unknown action returns a structured error (no throw)", async () => {
    const r = await call(server, "not_a_real_hook_action_qqq", {});
    expect(r.ok).toBe(false);
  });
});
