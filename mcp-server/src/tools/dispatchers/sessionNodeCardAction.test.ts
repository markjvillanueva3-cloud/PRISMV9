/**
 * sessionNodeCardAction.test.ts — dispatcher-boundary verification for the
 * `prism_session:node_card` action (CHEAP-NODE-ACCESS-MS0 · U-NODECARD-DISPATCHER).
 *
 * Injects a mock CLI runner so we exercise the action's normalization + the
 * bare-object/array CLI-shape handling + miss computation + fail-soft paths
 * WITHOUT spawning the real CLI or touching the offset index. The CLI's own
 * seek correctness is covered by scripts/lib/node-card-read.test.mjs.
 */
import { describe, it, expect, vi } from "vitest";
import { runNodeCardAction, normalizeIds, MAX_NODE_CARD_IDS } from "./sessionNodeCardAction.js";

const cardRow = (id: string) => ({
  card: { id, kind: id.split(".")[0], label: id, layer: "L5", status: "stub", info: `info ${id}` },
  source: "node-card-offsets",
  stale: false,
});

describe("normalizeIds", () => {
  it("accepts params.id (string) → single-element list", () => {
    expect(normalizeIds({ id: "eng.mill" })).toEqual(["eng.mill"]);
  });
  it("accepts params.ids (string[]), dedups + trims, preserves order", () => {
    expect(normalizeIds({ ids: [" eng.mill ", "ghost.x", "eng.mill", ""] })).toEqual(["eng.mill", "ghost.x"]);
  });
  it("drops non-string entries", () => {
    expect(normalizeIds({ ids: ["eng.mill", 42, null, { x: 1 }] as unknown[] })).toEqual(["eng.mill"]);
  });
  it("returns [] when neither id nor ids supplied", () => {
    expect(normalizeIds({})).toEqual([]);
  });
  it("caps at MAX_NODE_CARD_IDS", () => {
    const many = Array.from({ length: MAX_NODE_CARD_IDS + 10 }, (_, i) => `eng.n${i}`);
    expect(normalizeIds({ ids: many }).length).toBe(MAX_NODE_CARD_IDS);
  });
});

describe("runNodeCardAction", () => {
  it("single id → CLI bare-object shape normalized to one card", () => {
    const runCli = vi.fn(() => JSON.stringify(cardRow("eng.mill")));
    const r = runNodeCardAction({ id: "eng.mill" }, { runCli });
    expect(runCli).toHaveBeenCalledWith(["eng.mill"]);
    expect(r.success).toBe(true);
    expect(r.count).toBe(1);
    expect((r.cards as { id: string }[])[0].id).toBe("eng.mill");
    expect(r.misses).toEqual([]);
    expect(r.source).toBe("node-card-offsets");
  });

  it("multiple ids → CLI array shape, all cards returned", () => {
    const runCli = vi.fn(() => JSON.stringify([cardRow("eng.mill"), cardRow("eng.lathe")]));
    const r = runNodeCardAction({ ids: ["eng.mill", "eng.lathe"] }, { runCli });
    expect(r.success).toBe(true);
    expect(r.count).toBe(2);
    expect((r.cards as { id: string }[]).map((c) => c.id)).toEqual(["eng.mill", "eng.lathe"]);
    expect(r.misses).toEqual([]);
  });

  it("computes misses for requested ids absent from the result", () => {
    const runCli = vi.fn(() => JSON.stringify([cardRow("eng.mill")]));
    const r = runNodeCardAction({ ids: ["eng.mill", "eng.ghosttown"] }, { runCli });
    expect(r.count).toBe(1);
    expect(r.misses).toEqual(["eng.ghosttown"]);
  });

  it("empty ids → fail-soft error result (no CLI call)", () => {
    const runCli = vi.fn(() => "");
    const r = runNodeCardAction({}, { runCli });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/requires params\.id/);
    expect(runCli).not.toHaveBeenCalled();
  });

  it("CLI throw → fail-soft error, never propagates", () => {
    const runCli = vi.fn(() => { throw new Error("spawn ENOENT"); });
    const r = runNodeCardAction({ id: "eng.mill" }, { runCli });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/node_card seek failed/);
    expect(r.error).toMatch(/ENOENT/);
  });

  it("non-JSON CLI output → fail-soft error", () => {
    const runCli = vi.fn(() => "not json at all");
    const r = runNodeCardAction({ id: "eng.mill" }, { runCli });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/valid JSON/);
  });

  it("rows without a card are ignored (miss/notFound shapes don't crash)", () => {
    const runCli = vi.fn(() => JSON.stringify([cardRow("eng.mill"), { id: "eng.nope", notFound: true }]));
    const r = runNodeCardAction({ ids: ["eng.mill", "eng.nope"] }, { runCli });
    expect(r.count).toBe(1);
    expect(r.misses).toEqual(["eng.nope"]);
  });
});
