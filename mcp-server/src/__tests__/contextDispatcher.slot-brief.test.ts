// HERMES-MASTER-ORCHESTRATOR / slot_brief channel — engine + dispatcher round-trip.
//
// Engine behavior is verified against a TEMP root (no real-lane pollution). The
// dispatcher round-trip proves wiring + JSON shape WITHOUT writing a real brief
// (the write path uses an invalid slot, which the engine rejects before any fs op;
// the list path is read-only).
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { SlotBriefEngine } from "../engines/SlotBriefEngine.js";
import { registerContextDispatcher } from "../tools/dispatchers/contextDispatcher.js";

describe("SlotBriefEngine", () => {
  let root: string;
  let eng: SlotBriefEngine;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "slotbrief-eng-"));
    eng = new SlotBriefEngine(root);
  });
  afterEach(() => {
    try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* best-effort */ }
  });

  it("writes a valid brief atomically and reports bytes/path", () => {
    const r = eng.writeBrief({ slot: "bravo", body: "## Work order\nWire X to Y." });
    expect(r.written).toBe(true);
    expect(r.slot).toBe("bravo");
    expect(r.path).toBe(path.join(root, "bravo.md"));
    expect(r.bytes).toBeGreaterThan(0);
    expect(fs.readFileSync(path.join(root, "bravo.md"), "utf8")).toContain("Wire X to Y.");
  });

  it("prepends a provenance line when 'from' is given", () => {
    eng.writeBrief({ slot: "bravo", body: "do it", from: "zulu" });
    const txt = fs.readFileSync(path.join(root, "bravo.md"), "utf8");
    expect(txt).toContain("brief from: zulu");
    expect(txt).toContain("do it");
  });

  it("rejects an invalid slot name (filename/path-traversal safety) — writes nothing", () => {
    const r = eng.writeBrief({ slot: "../../etc/passwd", body: "x" });
    expect(r.written).toBe(false);
    expect(r.error).toMatch(/invalid_slot/);
    expect(fs.readdirSync(root).length).toBe(0);
  });

  it("rejects an empty/whitespace body", () => {
    const r = eng.writeBrief({ slot: "bravo", body: "   " });
    expect(r.written).toBe(false);
    expect(r.error).toBe("empty_body");
  });

  it("normalizes slot case to lowercase", () => {
    const r = eng.writeBrief({ slot: "BRAVO", body: "x" });
    expect(r.written).toBe(true);
    expect(r.slot).toBe("bravo");
    expect(fs.existsSync(path.join(root, "bravo.md"))).toBe(true);
  });

  it("overwrites the prior pending brief (one per slot at a time)", () => {
    eng.writeBrief({ slot: "bravo", body: "first" });
    eng.writeBrief({ slot: "bravo", body: "second" });
    expect(fs.readFileSync(path.join(root, "bravo.md"), "utf8")).toContain("second");
    expect(fs.readFileSync(path.join(root, "bravo.md"), "utf8")).not.toContain("first");
    expect(eng.listPending().length).toBe(1);
  });

  it("listPending returns queued briefs sorted, excluding README/_delivered", () => {
    eng.writeBrief({ slot: "bravo", body: "x" });
    eng.writeBrief({ slot: "alpha", body: "y" });
    fs.writeFileSync(path.join(root, "README.md"), "doc");
    fs.mkdirSync(path.join(root, "_delivered"), { recursive: true });
    fs.writeFileSync(path.join(root, "_delivered", "bravo-1-aaaaaaaa.md"), "archived");
    const pend = eng.listPending();
    expect(pend.map((p) => p.slot)).toEqual(["alpha", "bravo"]);
    expect(pend.every((p) => p.bytes > 0)).toBe(true);
  });

  it("listDelivered reads the archive newest-first + filters by slot", () => {
    const delivered = path.join(root, "_delivered");
    fs.mkdirSync(delivered, { recursive: true });
    fs.writeFileSync(path.join(delivered, "bravo-100-aaaaaaaa.md"), "old");
    fs.writeFileSync(path.join(delivered, "bravo-200-bbbbbbbb.md"), "new");
    fs.writeFileSync(path.join(delivered, "alpha-300-cccccccc.md"), "other");
    const all = eng.listDelivered({});
    expect(all.length).toBe(3);
    for (let i = 1; i < all.length; i++) {
      expect(all[i - 1].mtimeMs).toBeGreaterThanOrEqual(all[i].mtimeMs); // newest-first
    }
    const justBravo = eng.listDelivered({ slot: "bravo" });
    expect(justBravo.length).toBe(2);
    expect(justBravo.every((d) => d.slot === "bravo")).toBe(true);
  });

  it("listDelivered honors a positive limit", () => {
    const delivered = path.join(root, "_delivered");
    fs.mkdirSync(delivered, { recursive: true });
    for (let i = 0; i < 5; i++) fs.writeFileSync(path.join(delivered, `bravo-${i}-0000000${i}.md`), "x");
    expect(eng.listDelivered({ limit: 2 }).length).toBe(2);
  });

  it("listPending/listDelivered are empty + safe on a missing dir", () => {
    const fresh = new SlotBriefEngine(path.join(root, "nope"));
    expect(fresh.listPending()).toEqual([]);
    expect(fresh.listDelivered({})).toEqual([]);
  });

  // Regression (U-SLOT-BRIEF-LANE-FIX): the default lane MUST be the repo-root
  // coordination dir that slot-brief-inject.mjs reads — NOT PATHS.STATE_DIR, which
  // resolves to mcp-server/state inside the running MCP server and silently broke
  // the channel via the MCP write path.
  it("default lane is the shared coordination dir (state/shared/slot-briefs), never mcp-server/state", () => {
    const dir = new SlotBriefEngine().directory.replace(/\\/g, "/");
    expect(dir).toMatch(/\/state\/shared\/slot-briefs$/);
    expect(dir).not.toMatch(/mcp-server\/state/);
  });

  it("honors the PRISM_SLOT_BRIEFS_DIR override (portability seam)", () => {
    const prev = process.env.PRISM_SLOT_BRIEFS_DIR;
    process.env.PRISM_SLOT_BRIEFS_DIR = path.join(os.tmpdir(), "custom-brief-lane");
    try {
      expect(new SlotBriefEngine().directory).toBe(process.env.PRISM_SLOT_BRIEFS_DIR);
    } finally {
      if (prev === undefined) delete process.env.PRISM_SLOT_BRIEFS_DIR;
      else process.env.PRISM_SLOT_BRIEFS_DIR = prev;
    }
  });
});

describe("prism_context slot_brief wiring (round-trip)", () => {
  function captureHandler(): (a: { action: string; params: unknown }) => Promise<{ content: { text: string }[] }> {
    let handler: any = null;
    const fakeServer = { tool: (_n: string, _d: string, _s: unknown, h: any) => { handler = h; } };
    registerContextDispatcher(fakeServer);
    if (!handler) throw new Error("prism_context handler not registered");
    return handler;
  }
  async function invoke(handler: any, action: string, params: unknown) {
    const res = await handler({ action, params });
    return JSON.parse(res.content[0].text);
  }

  it("slot_brief_write routes to the engine + returns its result shape (invalid slot → no real write)", async () => {
    const h = captureHandler();
    // Hyphenated slot passes zod (min 1) but fails the engine's alpha-only guard,
    // proving wiring end-to-end WITHOUT writing into the real slot lane.
    const out = await invoke(h, "slot_brief_write", { slot: "not-a-real-slot", body: "hello" });
    expect(out.written).toBe(false);
    expect(out.error).toMatch(/invalid_slot/);
    expect(out.slot).toBe("not-a-real-slot");
  });

  it("slot_brief_write rejects an empty body at the schema boundary", async () => {
    const h = captureHandler();
    const out = await invoke(h, "slot_brief_write", { slot: "bravo", body: "" });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/Invalid params|body/i);
  });

  it("slot_brief_list returns counts + count-consistent pending/delivered listings", async () => {
    const h = captureHandler();
    const out = await invoke(h, "slot_brief_list", {});
    // Counts are the always-present signal (slimResponse omits EMPTY arrays but
    // keeps numeric 0). When the arrays are present they must match their count.
    expect(typeof out.pendingCount).toBe("number");
    expect(typeof out.deliveredCount).toBe("number");
    expect(Array.isArray(out.pending ?? [])).toBe(true);
    expect(Array.isArray(out.delivered ?? [])).toBe(true);
    expect((out.pending ?? []).length).toBe(out.pendingCount);
    expect((out.delivered ?? []).length).toBe(out.deliveredCount);
  });
});
