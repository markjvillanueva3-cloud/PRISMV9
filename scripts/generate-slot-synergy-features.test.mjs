/**
 * generate-slot-synergy-features.test.mjs — slot-synergy generator tests
 *
 * Spec: SLOT-SYNERGY-MAP-MS0 (slot foxtrot, 2026-05-19).
 *
 * Coverage: happy paths + ≥3 failure modes + ≥4 adversarial inputs + per-slot
 * invariants + drift-guard against chat-slots.mjs canonical SLOT_NAMES.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SCHEMA_VERSION,
  SYNERGY_ROOST_ID,
  PLANNED_PARENT,
  ROOST_LAYER,
  SLOT_LAYER,
  SUBSYSTEM_LAYER,
  MAX_LABEL,
  COLOR_WORK_SLOT,
  COLOR_HYGIENE_SLOT,
  COLOR_SUBSYSTEM,
  SKILLS_PER_SLOT,
  SLOT_AWARE_HOOKS_WORK,
  SLOT_AWARE_HOOKS_GOLF,
  SLOT_NAMES,
  SLOT_DOMAINS,
  SUBSYSTEMS,
  safeId,
  handoffMatchesSlot,
  commitMatchesSlot,
  generate,
  listHandoffsSoft,
} from "./generate-slot-synergy-features.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ─── drift guards ───────────────────────────────────────────────────────────

test("SLOT_NAMES matches canonical .claude/helpers/chat-slots.mjs (drift guard)", () => {
  const chatSlotsSource = fs.readFileSync(
    path.join(ROOT, ".claude/helpers/chat-slots.mjs"),
    "utf8",
  );
  const m = chatSlotsSource.match(/export const SLOT_NAMES = \[(.+?)\]/s);
  assert.ok(m, "could not extract SLOT_NAMES from chat-slots.mjs");
  const canonical = m[1].match(/"([a-z]+)"/g).map(s => s.replace(/"/g, ""));
  assert.deepEqual([...SLOT_NAMES], canonical);
});

test("SLOT_NAMES is exactly 13 NATO slots", () => {
  assert.equal(SLOT_NAMES.length, 13);
  assert.ok(SLOT_NAMES.includes("alpha"));
  assert.ok(SLOT_NAMES.includes("golf"));
  assert.ok(SLOT_NAMES.includes("mike"));
});

test("every slot has a domain mapping (no orphan slots)", () => {
  for (const slot of SLOT_NAMES) {
    assert.equal(typeof SLOT_DOMAINS[slot], "string");
    assert.ok(SLOT_DOMAINS[slot].length > 0);
  }
});

test("SUBSYSTEMS has 16 unique keys (incl. precompact + compact)", () => {
  assert.equal(SUBSYSTEMS.length, 16);
  const keys = SUBSYSTEMS.map(s => s.key);
  assert.equal(new Set(keys).size, 16, "SUBSYSTEMS keys must be unique");
  // Anti-regression: every item from the user's stated 16-key list must be present.
  for (const k of ["handoff", "queue", "claims", "commits", "branch", "skills",
    "scripts", "hooks", "memories", "wikis", "tribal", "claudemd",
    "gsd", "precompact", "compact", "doctrine"]) {
    assert.ok(keys.includes(k), `SUBSYSTEMS must contain key '${k}'`);
  }
});

test("invariants: roost id and parent are exact literals (anti-rename guard)", () => {
  assert.equal(SYNERGY_ROOST_ID, "ghost.slot_synergy");
  assert.equal(PLANNED_PARENT, "ghost.planned_features");
  assert.equal(SCHEMA_VERSION, "1.0.0");
});

// ─── safeId ─────────────────────────────────────────────────────────────────

test("safeId — happy path produces lowercase kebab", () => {
  assert.equal(safeId("Hello World"), "hello-world");
  assert.equal(safeId("FOO_BAR"), "foo_bar");
});

test("safeId — edge: empty / null / non-string → 'x' fallback", () => {
  assert.equal(safeId(""), "x");
  assert.equal(safeId(null), "x");
  assert.equal(safeId(undefined), "x");
});

test("safeId — strips path traversal (.. → -)", () => {
  // "../etc/passwd" becomes "etc-passwd" after collapse (no .. remains).
  const out = safeId("../etc/passwd");
  assert.ok(!out.includes(".."));
  assert.equal(out, "etc-passwd");
});

// ─── handoffMatchesSlot ────────────────────────────────────────────────────

test("handoffMatchesSlot — slot-keyed handoff (golf pattern) matches", () => {
  assert.equal(handoffMatchesSlot("HANDOFF-golf-cleanup.md", "golf"), true);
});

test("handoffMatchesSlot — topic-suffix match (foxtrot in middle)", () => {
  assert.equal(handoffMatchesSlot("HANDOFF-claude-3c737257-foxtrot-cad-fusion-l.md", "foxtrot"), true);
});

test("handoffMatchesSlot — topic-suffix match (slot at filename end)", () => {
  assert.equal(handoffMatchesSlot("HANDOFF-Agent@pid-37104-foxtrot-work.md", "foxtrot"), true);
});

test("handoffMatchesSlot — false negative (slot not present)", () => {
  assert.equal(handoffMatchesSlot("HANDOFF-claude-xyz-cad-fusion-l.md", "alpha"), false);
});

test("handoffMatchesSlot — adversarial empty/null inputs", () => {
  assert.equal(handoffMatchesSlot("", "alpha"), false);
  assert.equal(handoffMatchesSlot(null, "alpha"), false);
  assert.equal(handoffMatchesSlot("HANDOFF-foo.md", null), false);
});

// ─── commitMatchesSlot ─────────────────────────────────────────────────────

test("commitMatchesSlot — modern (slot:nato) marker matches", () => {
  assert.equal(commitMatchesSlot(
    "[MAIN] [FEATURE-GAP-AUDIT-MS0]/U-WIRE-BACKLOG-POST (slot:india): wire 6 DNC posts",
    "india",
  ), true);
});

test("commitMatchesSlot — legacy [NATO] prefix matches (uppercase)", () => {
  assert.equal(commitMatchesSlot("[BRAVO] some commit", "bravo"), true);
});

test("commitMatchesSlot — [MAIN] prefix does NOT false-positive on any slot", () => {
  for (const slot of SLOT_NAMES) {
    assert.equal(commitMatchesSlot("[MAIN] regular work", slot), false, `slot=${slot}`);
  }
});

test("commitMatchesSlot — compound legacy '[MAIN] [BRAVO] ...' matches bravo", () => {
  assert.equal(commitMatchesSlot("[MAIN] [BRAVO] foo", "bravo"), true);
});

test("commitMatchesSlot — compound legacy '[MAIN] [BRAVO] ...' does NOT match alpha", () => {
  assert.equal(commitMatchesSlot("[MAIN] [BRAVO] foo", "alpha"), false);
});

test("commitMatchesSlot — adversarial empty/null inputs", () => {
  assert.equal(commitMatchesSlot("", "alpha"), false);
  assert.equal(commitMatchesSlot(null, "alpha"), false);
  assert.equal(commitMatchesSlot("[ALPHA] foo", null), false);
});

// ─── generate — invariants on empty inputs ────────────────────────────────

test("generate — empty inputs yields roost + 16 anchors + 13 slot nodes", () => {
  const r = generate({});
  // 1 roost + 16 anchors + 13 slots = 30 nodes
  assert.equal(r.stats.roostEmitted, 1);
  assert.equal(r.stats.subsystemAnchorsEmitted, 16);
  assert.equal(r.stats.slotsEmitted, 13);
  assert.equal(r.newNodes.length, 1 + 16 + 13);
});

test("generate — precompact + compact emit per-slot edges (R12 doctrine surface)", () => {
  const r = generate({});
  const precompactEdges = r.newEdges.filter(e =>
    e.label?.startsWith("precompact=") && e.weight === 1);
  const compactEdges = r.newEdges.filter(e =>
    e.label?.startsWith("compact=") && e.weight === 1);
  assert.equal(precompactEdges.length, 13, "precompact edges: one per slot");
  assert.equal(compactEdges.length, 13, "compact edges: one per slot");
});

test("generate — every slot has a node, exactly once", () => {
  const r = generate({});
  for (const slot of SLOT_NAMES) {
    const id = `ghost.slot_synergy.slot.${slot}`;
    const matches = r.newNodes.filter(n => n.id === id);
    assert.equal(matches.length, 1, `slot ${slot} should appear exactly once`);
  }
});

test("generate — golf node uses hygiene amber color", () => {
  const r = generate({});
  const golf = r.newNodes.find(n => n.id === "ghost.slot_synergy.slot.golf");
  assert.ok(golf, "golf node must exist");
  assert.equal(golf.color, COLOR_HYGIENE_SLOT);
});

test("generate — non-golf slots use work blue color", () => {
  const r = generate({});
  for (const slot of SLOT_NAMES) {
    if (slot === "golf") continue;
    const node = r.newNodes.find(n => n.id === `ghost.slot_synergy.slot.${slot}`);
    assert.equal(node.color, COLOR_WORK_SLOT, `slot ${slot} should be COLOR_WORK_SLOT`);
  }
});

test("generate — all subsystem anchors use purple", () => {
  const r = generate({});
  for (const sub of SUBSYSTEMS) {
    const anchor = r.newNodes.find(n => n.id === `ghost.slot_synergy.subsystem.${sub.key}`);
    assert.ok(anchor, `anchor for ${sub.key} must exist`);
    assert.equal(anchor.color, COLOR_SUBSYSTEM);
  }
});

test("generate — roost has correct kind/parent/layer", () => {
  const r = generate({});
  const roost = r.newNodes.find(n => n.id === SYNERGY_ROOST_ID);
  assert.ok(roost);
  assert.equal(roost.kind, "ghost-roost");
  assert.equal(roost.parent, PLANNED_PARENT);
  assert.equal(roost.layer, ROOST_LAYER);
});

test("generate — slot label includes 'FREE' when unbound", () => {
  const r = generate({}); // no chatSlots → all FREE
  const alpha = r.newNodes.find(n => n.id === "ghost.slot_synergy.slot.alpha");
  assert.ok(alpha.label.includes("FREE"));
});

test("generate — slot label includes 'BOUND' when chatId set", () => {
  const r = generate({
    chatSlots: { slots: { alpha: { chatId: "claude-abc12345" } } },
  });
  const alpha = r.newNodes.find(n => n.id === "ghost.slot_synergy.slot.alpha");
  assert.ok(alpha.label.includes("BOUND"));
});

test("generate — golf gets 5 slot-aware hooks, work slots get 3", () => {
  const r = generate({});
  const golfEdges = r.newEdges.filter(e => e.from === "ghost.slot_synergy.slot.golf" && e.label === `hooks=${SLOT_AWARE_HOOKS_GOLF}`);
  const alphaEdges = r.newEdges.filter(e => e.from === "ghost.slot_synergy.slot.alpha" && e.label === `hooks=${SLOT_AWARE_HOOKS_WORK}`);
  assert.equal(golfEdges.length, 1, "golf should have 1 hooks-edge with weight 5");
  assert.equal(alphaEdges.length, 1, "alpha should have 1 hooks-edge with weight 3");
});

test("generate — branch=1 only when slotState.branch starts with 'slot/<nato>'", () => {
  const r = generate({
    chatSlots: {
      slots: {
        alpha: { chatId: "x", branch: "slot/alpha" },
        bravo: { chatId: "y", branch: "main" },
        charlie: { chatId: "z" }, // no branch field
      },
    },
  });
  const alphaBranchEdge = r.newEdges.find(e =>
    e.from === "ghost.slot_synergy.slot.alpha" && e.label?.startsWith("branch="));
  const bravoBranchEdge = r.newEdges.find(e =>
    e.from === "ghost.slot_synergy.slot.bravo" && e.label?.startsWith("branch="));
  const charlieBranchEdge = r.newEdges.find(e =>
    e.from === "ghost.slot_synergy.slot.charlie" && e.label?.startsWith("branch="));

  assert.ok(alphaBranchEdge, "alpha on slot/alpha branch should emit branch edge");
  assert.equal(alphaBranchEdge.weight, 1);
  assert.equal(bravoBranchEdge, undefined, "bravo on main should NOT emit branch edge");
  assert.equal(charlieBranchEdge, undefined, "charlie with no branch field should NOT emit branch edge");
});

test("generate — queue count surfaces real input lengths", () => {
  const r = generate({
    slotQueues: {
      queues: {
        alpha: [{ unit_id: "U-A1" }, { unit_id: "U-A2" }, { unit_id: "U-A3" }],
        bravo: [{ unit_id: "U-B1" }],
      },
    },
  });
  const alphaQueueEdge = r.newEdges.find(e =>
    e.from === "ghost.slot_synergy.slot.alpha" && e.label?.startsWith("queue="));
  const bravoQueueEdge = r.newEdges.find(e =>
    e.from === "ghost.slot_synergy.slot.bravo" && e.label?.startsWith("queue="));
  assert.equal(alphaQueueEdge.weight, 3);
  assert.equal(bravoQueueEdge.weight, 1);
});

test("generate — handoff count is sum of matched filenames", () => {
  const r = generate({
    handoffs: [
      "HANDOFF-claude-abc-foxtrot-work.md",
      "HANDOFF-claude-def-foxtrot-cad-fusion.md",
      "HANDOFF-Agent@pid-1-alpha-work.md",
      "HANDOFF-golf-cleanup.md",
      "HANDOFF-other-unrelated.md",
    ],
  });
  const foxtrotHandoffEdge = r.newEdges.find(e =>
    e.from === "ghost.slot_synergy.slot.foxtrot" && e.label?.startsWith("handoff="));
  const golfHandoffEdge = r.newEdges.find(e =>
    e.from === "ghost.slot_synergy.slot.golf" && e.label?.startsWith("handoff="));
  assert.equal(foxtrotHandoffEdge.weight, 2);
  assert.equal(golfHandoffEdge.weight, 1);
});

test("generate — commit count surfaces real (slot:<nato>) markers", () => {
  const r = generate({
    commits: [
      "[MAIN] [WIRE-UNWIRED]/U-X (slot:india): foo",
      "[MAIN] [FOO]/U-Y (slot:india): bar",
      "[MAIN] [FOO]/U-Z (slot:alpha): baz",
      "[MAIN] no slot marker",
    ],
  });
  const indiaCommitEdge = r.newEdges.find(e =>
    e.from === "ghost.slot_synergy.slot.india" && e.label?.startsWith("commits="));
  const alphaCommitEdge = r.newEdges.find(e =>
    e.from === "ghost.slot_synergy.slot.alpha" && e.label?.startsWith("commits="));
  assert.equal(indiaCommitEdge.weight, 2);
  assert.equal(alphaCommitEdge.weight, 1);
});

// ─── dedup ─────────────────────────────────────────────────────────────────

test("generate — existingNodeIds prevents double-emit (dedup)", () => {
  const existing = new Set([SYNERGY_ROOST_ID, "ghost.slot_synergy.slot.alpha"]);
  const r = generate({ existingNodeIds: existing });
  assert.equal(r.stats.roostEmitted, 0, "roost already in set, must not re-emit");
  assert.equal(r.stats.slotsEmitted, 12, "alpha already in set, 12 remaining");
  assert.equal(r.newNodes.length, 0 + 16 + 12); // 0 roost + 16 anchors + 12 slots
});

test("generate — existingNodeIds as array (not Set) is accepted", () => {
  const r = generate({ existingNodeIds: [SYNERGY_ROOST_ID] });
  assert.equal(r.stats.roostEmitted, 0);
});

// ─── failure modes ─────────────────────────────────────────────────────────

test("FAIL-MODE — undefined inputs still produce full 13-slot graph", () => {
  const r = generate({
    chatSlots: undefined,
    slotQueues: undefined,
    slotClaims: undefined,
    commits: undefined,
    handoffs: undefined,
  });
  assert.equal(r.stats.slotsEmitted, 13);
  assert.equal(r.stats.subsystemAnchorsEmitted, 16);
});

test("FAIL-MODE — malformed chatSlots (string instead of object) is ignored", () => {
  const r = generate({ chatSlots: "not-an-object" });
  // All slots should still be FREE (unbound) because the malformed input is dropped.
  const alpha = r.newNodes.find(n => n.id === "ghost.slot_synergy.slot.alpha");
  assert.ok(alpha.label.includes("FREE"));
});

test("FAIL-MODE — malformed queue (not an array) treats as zero-length", () => {
  const r = generate({ slotQueues: { queues: { alpha: "not-an-array" } } });
  const alphaQueueEdge = r.newEdges.find(e =>
    e.from === "ghost.slot_synergy.slot.alpha" && e.label?.startsWith("queue="));
  assert.equal(alphaQueueEdge, undefined, "malformed queue → 0 → edge suppressed");
});

// ─── adversarial inputs ────────────────────────────────────────────────────

test("ADVERSARIAL — null inputs do not throw", () => {
  assert.doesNotThrow(() => generate({ chatSlots: null, slotQueues: null, slotClaims: null }));
});

test("ADVERSARIAL — claim entries with mismatched slot are filtered out", () => {
  const r = generate({
    slotClaims: {
      "claim-1": { slot: "alpha", unit: "U-A" },
      "claim-2": { slot: "bravo", unit: "U-B" },
      "claim-3": { slot: "ALPHA", unit: "U-C" }, // wrong case — should NOT match
      "claim-4": null, // null entry — should NOT crash
      "claim-5": "string", // wrong type — should NOT crash
    },
  });
  const alphaClaimEdge = r.newEdges.find(e =>
    e.from === "ghost.slot_synergy.slot.alpha" && e.label?.startsWith("claims="));
  assert.equal(alphaClaimEdge.weight, 1, "only case-exact 'alpha' counts");
});

test("ADVERSARIAL — commits with unicode/control bytes do not crash", () => {
  const r = generate({
    commits: [
      "[MAIN] commit with emoji 🚀 (slot:alpha)",
      "[MAIN] commit with   null byte (slot:bravo)",
      "[BRAVO] legacy prefix",
    ],
  });
  const alphaEdge = r.newEdges.find(e =>
    e.from === "ghost.slot_synergy.slot.alpha" && e.label?.startsWith("commits="));
  const bravoEdge = r.newEdges.find(e =>
    e.from === "ghost.slot_synergy.slot.bravo" && e.label?.startsWith("commits="));
  assert.equal(alphaEdge.weight, 1);
  assert.equal(bravoEdge.weight, 2); // (slot:bravo) + [BRAVO]
});

test("ADVERSARIAL — handoff filename injection attempts are case-folded safely", () => {
  // Mixed-case slot pattern should still match via toLowerCase
  assert.equal(handoffMatchesSlot("HANDOFF-claude-x-FOXTROT-work.md", "foxtrot"), true);
  assert.equal(handoffMatchesSlot("HANDOFF-x-Foxtrot-y.md", "foxtrot"), true);
});

// ─── integration sanity (real-fs read) ─────────────────────────────────────

test("integration — listHandoffsSoft returns array from real handoff dir", () => {
  const list = listHandoffsSoft();
  assert.ok(Array.isArray(list));
  // Real handoffs dir has hundreds — sanity: > 0 in this repo.
  assert.ok(list.length > 0, "expected real handoff dir to have entries");
  for (const f of list.slice(0, 10)) {
    assert.match(f, /^HANDOFF-/i);
    assert.match(f, /\.md$/i);
  }
});

test("integration — listHandoffsSoft on missing dir returns empty array", () => {
  const list = listHandoffsSoft(path.join(ROOT, "does/not/exist/anywhere"));
  assert.deepEqual(list, []);
});

// ─── invariant — total edge count equals sum of non-zero per-slot counts ──

test("invariant — edge count is exactly sum of (counts > 0) across all 13 slots", () => {
  const r = generate({});
  // Per slot with no real inputs, the always-on subsystems (count > 0) are:
  //   skills(4) scripts(5) hooks(3 or 5 for golf)
  //   memories(1) wikis(1) tribal(1) claudemd(1) gsd(1)
  //   precompact(1) compact(1) doctrine(1) = 11 edges each slot.
  // (handoff/queue/claims/commits/branch are 0 with empty inputs → no edge.)
  // Hooks edge weight varies (3 vs 5) but the edge COUNT is the same.
  // Total = 13 × 11 = 143 edges
  const ALWAYS_ON_PER_SLOT = 11;
  assert.equal(r.stats.edgesEmitted, SLOT_NAMES.length * ALWAYS_ON_PER_SLOT);
});

test("invariant — schemaVersion ≠ '0.x' (release-grade)", () => {
  assert.ok(!SCHEMA_VERSION.startsWith("0."));
});

test("MAX_LABEL is a positive integer (no magic-number drift)", () => {
  assert.ok(Number.isInteger(MAX_LABEL));
  assert.ok(MAX_LABEL > 0);
});

test("SKILLS_PER_SLOT × 13 slots = 52 (matches doctrine: 4 wrappers × 13 NATO)", () => {
  assert.equal(SKILLS_PER_SLOT * SLOT_NAMES.length, 52);
});
