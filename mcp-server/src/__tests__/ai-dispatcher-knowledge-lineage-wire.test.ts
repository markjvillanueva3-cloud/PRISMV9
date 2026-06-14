/**
 * prism_ai knowledge_lineage_* wiring test
 * ========================================
 * INDIA-AI-ORPHAN-WIRE (bravo, 2026-06-11): wires the dispatcher-DARK
 * `KnowledgeLineageEngine` (zero real consumers; pure read-only provenance
 * graph) into prism_ai via `knowledge_lineage_report` / `knowledge_lineage_stats`
 * / `knowledge_lineage_pending_conflicts`.
 *
 * The engine persists to disk via an explicit `save()` (never on a timer, and
 * `registerSource()`/`registerAtom()` only set a dirty flag). To round-trip
 * THROUGH the dispatcher with LIVE state-delta + engine-parity proofs but ZERO
 * disk pollution, we monkeypatch the singleton's `save` to a no-op for the
 * duration and restore it after. Every assertion checks a concrete value
 * (exact delta / exact field equality / engine parity) against the engine's
 * real deterministic graph math.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { registerAIReasoningDispatcher } from "../tools/dispatchers/aiReasoningDispatcher.js";
import { knowledgeLineageEngine } from "../engines/KnowledgeLineageEngine.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerAIReasoningDispatcher(fakeServer);
  return { handler };
}

async function call(handler: Handler, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try {
    return JSON.parse(text);
  } catch {
    return r;
  }
}

describe("prism_ai knowledge_lineage_* (INDIA-AI-ORPHAN-WIRE unit 1)", () => {
  let handler: Handler;
  let originalSave: typeof knowledgeLineageEngine.save;

  beforeAll(async () => {
    handler = await createServer().handler;
    // Belt-and-suspenders: never write the test's seeded nodes to the real
    // on-disk lineage state, even if some read path triggers save().
    originalSave = knowledgeLineageEngine.save.bind(knowledgeLineageEngine);
    (knowledgeLineageEngine as unknown as { save: () => void }).save = () => {};
  });

  afterAll(() => {
    (knowledgeLineageEngine as unknown as { save: typeof originalSave }).save = originalSave;
  });

  // The dispatcher wraps the case result in a {success, data: slimResponse(result)}
  // envelope; slimResponse strips empty arrays. So the case payload is under `.data`,
  // and an empty `conflicts`/`sources` array is absent (normalize with `?? []`).

  // ---- HAPPY 1: dispatcher stats EQUAL the engine's live getStats() (parity, not a snapshot) ----
  it("knowledge_lineage_stats equals the engine's live getStats() exactly", async () => {
    const live = knowledgeLineageEngine.getStats();
    const r = await call(handler, "knowledge_lineage_stats");
    expect(r.data.success).toBe(true);
    expect(r.data.stats.totalNodes).toBe(live.totalNodes);
    expect(r.data.stats.totalEdges).toBe(live.totalEdges);
    expect(r.data.stats.pendingConflicts).toBe(live.pendingConflicts);
    expect(r.data.stats.resolvedConflicts).toBe(live.resolvedConflicts);
  });

  // ---- HAPPY 2: LIVE round-trip — registering a source increments totalNodes by EXACTLY 1 ----
  it("registering a source increments dispatcher totalNodes by exactly 1", async () => {
    const before = (await call(handler, "knowledge_lineage_stats")).data.stats.totalNodes as number;
    knowledgeLineageEngine.registerSource("__bravo_india_wire_test_source__", { test: true });
    const after = (await call(handler, "knowledge_lineage_stats")).data.stats.totalNodes as number;
    expect(after).toBe(before + 1); // proves the dispatcher reads LIVE engine state
  });

  // ---- HAPPY 3: report for a registered atom echoes its EXACT fields through the dispatcher ----
  it("knowledge_lineage_report returns the registered atom's exact id, label, and confidence", async () => {
    const atomId = "__bravo_india_wire_test_atom__";
    knowledgeLineageEngine.registerAtom({
      id: atomId,
      title: "bravo wire test atom",
      type: "fact",
      category: "test",
      confidence: 0.9,
      source: { authority: "test" },
    } as Parameters<typeof knowledgeLineageEngine.registerAtom>[0]);
    const r = await call(handler, "knowledge_lineage_report", { atomId });
    expect(r.data.success).toBe(true);
    expect(r.data.atom.id).toBe(atomId);
    expect(r.data.atom.type).toBe("atom"); // node-type, not the atom's domain "fact"
    expect(r.data.atom.label).toBe("bravo wire test atom");
    expect(r.data.atom.metadata.confidence).toBe(0.9);
    expect(r.data.atom.metadata.type).toBe("fact");
  });

  // ---- FAILURE 1: report for a missing atom returns the empty shape, never throws ----
  it("knowledge_lineage_report for a nonexistent atom returns atom undefined + zero sources/consumers/versions/conflicts", async () => {
    const r = await call(handler, "knowledge_lineage_report", { atomId: "__definitely_not_a_real_atom_zzz__" });
    expect(r.data.success).toBe(true);
    expect(r.data.atom).toBe(undefined);
    expect((r.data.sources ?? []).length).toBe(0);
    expect((r.data.consumers ?? []).length).toBe(0);
    expect((r.data.versions ?? []).length).toBe(0);
    expect((r.data.conflicts ?? []).length).toBe(0);
  });

  // ---- FAILURE 2: pending_conflicts count is the wire's exact contract (count === engine list length) ----
  it("knowledge_lineage_pending_conflicts count equals the engine's getPendingConflicts() length exactly", async () => {
    const live = knowledgeLineageEngine.getPendingConflicts();
    const r = await call(handler, "knowledge_lineage_pending_conflicts");
    expect(r.data.success).toBe(true);
    expect(r.data.count).toBe(live.length);
    expect((r.data.conflicts ?? []).length).toBe(live.length);
  });

  // ---- ADVERSARIAL 1: missing atomId is guarded (not a crash, not a silent empty report) ----
  it("knowledge_lineage_report without atomId returns success:false naming atomId", async () => {
    const r = await call(handler, "knowledge_lineage_report", {});
    expect(r.data.success).toBe(false);
    expect(r.data.error).toContain("atomId");
  });

  // ---- ADVERSARIAL 2: a numeric atomId is rejected by the guard, never coerced to a string ----
  it("knowledge_lineage_report with a numeric atomId is rejected (not coerced to '12345')", async () => {
    const r = await call(handler, "knowledge_lineage_report", { atomId: 12345 });
    expect(r.data.success).toBe(false);
    expect(r.data.error).toContain("atomId");
  });
});
