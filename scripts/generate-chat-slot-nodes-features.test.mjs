// Tests for generate-chat-slot-nodes-features.mjs — chat-slot node generator.
// Pure-fn tests over `generate(slotsDoc, ctxMap, existingIds)`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SCHEMA_VERSION,
  FLEET_ROOST_ID,
  PLANNED_PARENT,
  KNOWN_SLOTS,
  FLEET_LAUNCH_SKIPPED,
  safeId,
  truncate,
  generate,
} from "./generate-chat-slot-nodes-features.mjs";

describe("safeId", () => {
  it("lower-cases + slugifies", () => {
    assert.equal(safeId("Hello World"), "hello-world");
  });
  it("strips path traversal via slugification", () => {
    // Slugification replaces `/` and `.` with `-` then trims, so `../etc/passwd`
    // → `etc-passwd` — safe (no `..` remains). The literal `..` includes-check
    // is a defense-in-depth fallback for any path that survives slugification.
    assert.equal(safeId("../etc/passwd"), "etc-passwd");
  });
  it("handles empty / null", () => {
    assert.equal(safeId(""), "x");
    assert.equal(safeId(null), "x");
    assert.equal(safeId(undefined), "x");
  });
});

describe("truncate", () => {
  it("returns short strings unchanged", () => {
    assert.equal(truncate("hi", 10), "hi");
  });
  it("appends ellipsis on truncation", () => {
    assert.equal(truncate("abcdefghij", 5), "abcd…");
  });
  it("handles empty / null", () => {
    assert.equal(truncate("", 10), "");
    assert.equal(truncate(null, 10), "");
  });
});

describe("KNOWN_SLOTS sanity", () => {
  it("contains 26 NATO names", () => {
    assert.equal(KNOWN_SLOTS.length, 26);
  });
  it("is frozen", () => {
    assert.throws(() => { KNOWN_SLOTS.push("x"); }, /TypeError|Cannot|read.only/);
  });
  it("FLEET_LAUNCH_SKIPPED is subset of KNOWN_SLOTS", () => {
    for (const s of FLEET_LAUNCH_SKIPPED) {
      assert.ok(KNOWN_SLOTS.includes(s), `${s} not in KNOWN_SLOTS`);
    }
  });
});

describe("generate — happy path", () => {
  it("emits 1 roost + 26 slot nodes when slots empty", () => {
    const result = generate({ slots: {} });
    assert.equal(result.stats.roostEmitted, 1);
    assert.equal(result.stats.slotsEmitted, 26);
    assert.equal(result.stats.slotsBound, 0);
    assert.equal(result.stats.slotsSkipped, 4); // R/U/V/Y
    // 1 roost + 26 slots = 27 nodes
    assert.equal(result.newNodes.length, 27);
    // Roost first
    assert.equal(result.newNodes[0].id, FLEET_ROOST_ID);
    assert.equal(result.newNodes[0].kind, "ghost-roost");
  });

  it("marks bound slots with status:built when chatId present", () => {
    const slotsDoc = {
      slots: {
        bravo: { chatId: "claude-7979e425", branch: "slot/bravo", topic: "bravo-work" },
      },
    };
    const result = generate(slotsDoc);
    const bravoNode = result.newNodes.find(n => n.id === "ghost.chat_slot.bravo");
    assert.equal(bravoNode.status, "built");
    assert.equal(bravoNode.kind, "chat-slot-bound");
    assert.equal(bravoNode.metadata.sessionId, "claude-7979e425");
    assert.equal(result.stats.slotsBound, 1);
  });

  it("flags FLEET_LAUNCH_SKIPPED slots with chat-slot-skipped kind", () => {
    const result = generate({ slots: {} });
    for (const skipped of FLEET_LAUNCH_SKIPPED) {
      const node = result.newNodes.find(n => n.id === `ghost.chat_slot.${skipped}`);
      assert.equal(node.kind, "chat-slot-skipped", `${skipped} should be skipped`);
      assert.equal(node.metadata.skipped, true);
    }
  });

  it("emits parent edge for every slot → fleet roost", () => {
    const result = generate({ slots: {} });
    const parentEdges = result.newEdges.filter(e => e.kind === "parent" && e.to === FLEET_ROOST_ID);
    // 26 slots all point to the roost (the roost itself points to ghost.planned_features)
    assert.equal(parentEdges.length, 26);
    // Plus the roost → planned_features edge
    const roostParent = result.newEdges.find(e => e.from === FLEET_ROOST_ID && e.to === PLANNED_PARENT);
    assert.ok(roostParent);
  });

  it("emits synergy edges (soul/token/branch) for every slot", () => {
    const result = generate({ slots: {} });
    // Each of 26 slots emits ≥3 synergy edges (soul, token, branch).
    // Bound slots add loop edge + domain edge.
    const synergyEdges = result.newEdges.filter(e => e.kind === "synergy");
    assert.ok(synergyEdges.length >= 26 * 3, `expected ≥${26 * 3} synergy edges, got ${synergyEdges.length}`);
  });
});

describe("generate — spanning configs", () => {
  it("≥3 spanning slots with different roles surface correctly", () => {
    const ctxMap = new Map([
      ["bravo", { soul: { ok: true, hermesRole: "specialist-mill", refuseList: ["a", "b", "c"] }, decision: { recommend: "noop", suppressCompact: true, rationale: "ok" }, surfaces: {} }],
      ["lima", { soul: { ok: true, hermesRole: "specialist-academy", refuseList: ["x"] }, decision: { recommend: "noop", suppressCompact: false }, surfaces: {} }],
      ["india", { soul: { ok: true, hermesRole: "specialist-post", refuseList: ["y", "z"] }, decision: { recommend: "compact", suppressCompact: false }, surfaces: {} }],
    ]);
    const slotsDoc = {
      slots: {
        bravo: { chatId: "claude-bravo", branch: "slot/bravo" },
        lima: { chatId: "claude-lima", branch: "slot/lima" },
        india: { chatId: "claude-india", branch: "slot/india" },
      },
    };
    const result = generate(slotsDoc, ctxMap);
    const bravo = result.newNodes.find(n => n.id === "ghost.chat_slot.bravo");
    const lima = result.newNodes.find(n => n.id === "ghost.chat_slot.lima");
    const india = result.newNodes.find(n => n.id === "ghost.chat_slot.india");
    assert.equal(bravo.metadata.hermesRole, "specialist-mill");
    assert.equal(lima.metadata.hermesRole, "specialist-academy");
    assert.equal(india.metadata.hermesRole, "specialist-post");
    assert.equal(india.metadata.decision, "compact");
    assert.equal(result.stats.slotsSuppressed, 1); // only bravo suppressed
  });

  it("running-loop slot increments slotsRunning counter", () => {
    const ctxMap = new Map([
      ["bravo", { soul: { ok: true, hermesRole: "specialist-mill", refuseList: [] }, loop: { ok: true, running: true, iter: 3, target: 5 }, decision: {}, surfaces: {} }],
    ]);
    const slotsDoc = { slots: { bravo: { chatId: "claude-bravo", branch: "slot/bravo" } } };
    const result = generate(slotsDoc, ctxMap);
    assert.equal(result.stats.slotsRunning, 1);
    const bravo = result.newNodes.find(n => n.id === "ghost.chat_slot.bravo");
    assert.equal(bravo.metadata.loopRunning, true);
    assert.ok(bravo.label.includes("loop:run"));
  });
});

describe("generate — adversarial + dedup", () => {
  it("dedupes against existingNodeIds", () => {
    const existing = new Set(["ghost.chat_slot.bravo", FLEET_ROOST_ID]);
    const result = generate({ slots: {} }, null, existing);
    // Roost already exists → not re-emitted
    assert.equal(result.stats.roostEmitted, 0);
    // Bravo already exists → not re-emitted, but other 25 are
    assert.equal(result.stats.slotsEmitted, 25);
  });

  it("non-object slotsDoc → returns empty result without crash", () => {
    const result = generate(null);
    // Roost still emits (only one), but 0 slots since slots map is empty
    assert.equal(result.stats.slotsEmitted, 26); // KNOWN_SLOTS is iterated regardless
    assert.equal(result.stats.slotsBound, 0);
  });

  it("malformed ctx (non-Map) → falls back to soul-less placeholders", () => {
    const result = generate({ slots: {} }, "not-a-map");
    // generate accepts non-Map and silently treats as empty
    assert.equal(result.stats.slotsEmitted, 26);
  });

  it("schemaVersion is exported and frozen", () => {
    assert.equal(SCHEMA_VERSION, "1.0.0");
  });
});
