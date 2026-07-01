// scripts/slot-query.test.mjs — fail-on-revert regression oracle.
// Pure-helper assertions: every helper is exported and exercised against
// real-world JSON shapes plus edge cases (missing/null/wrong-shape).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bindingForSlot,
  claimsForSlot,
  queueForSlot,
  handoffMatchesSlot,
  listHandoffs,
  normalizeSince,
  buildReport,
} from "./slot-query.mjs";

// ── bindingForSlot ──────────────────────────────────────────────────────────

test("bindingForSlot: returns null when slotsJson is null", () => {
  assert.equal(bindingForSlot(null, "india"), null);
});

test("bindingForSlot: returns null when slot key exists but value is null", () => {
  // Real-world shape — chat-slots.json sets unallocated slots to null.
  const j = { slots: { india: null, echo: { chatId: "claude-x", status: "live" } } };
  assert.equal(bindingForSlot(j, "india"), null);
});

test("bindingForSlot: returns null when slot is absent", () => {
  assert.equal(bindingForSlot({ slots: {} }, "india"), null);
});

test("bindingForSlot: flattens flat slot value (no .state nesting)", () => {
  const j = {
    slots: {
      echo: {
        chatId: "claude-4278393c",
        host: "DESKTOP-X",
        topic: "echo-work",
        branch: "cad-fusion-live-ms0",
        lastHeartbeat: "2026-05-20T06:04:23.443Z",
      },
    },
  };
  const b = bindingForSlot(j, "echo");
  assert.equal(b.chatId, "claude-4278393c");
  assert.equal(b.topic, "echo-work");
  assert.equal(b.branch, "cad-fusion-live-ms0");
  assert.equal(b.lastHeartbeat, "2026-05-20T06:04:23.443Z");
});

// ── claimsForSlot ───────────────────────────────────────────────────────────

test("claimsForSlot: filters by slot and sorts newest first", () => {
  const j = {
    claims: [
      { slot: "india", unitId: "U-A", claimedAt: "2026-05-18T00:00:00Z" },
      { slot: "echo",  unitId: "U-B", claimedAt: "2026-05-19T00:00:00Z" },
      { slot: "india", unitId: "U-C", claimedAt: "2026-05-19T12:00:00Z" },
    ],
  };
  const r = claimsForSlot(j, "india");
  assert.equal(r.length, 2);
  assert.equal(r[0].unitId, "U-C", "newest claim first");
  assert.equal(r[1].unitId, "U-A");
});

test("claimsForSlot: handles claims-as-object map shape", () => {
  const j = {
    claims: {
      a: { slot: "india", unitId: "U-X", claimedAt: "2026-05-18T00:00:00Z" },
      b: { slot: "echo",  unitId: "U-Y", claimedAt: "2026-05-19T00:00:00Z" },
    },
  };
  const r = claimsForSlot(j, "india");
  assert.equal(r.length, 1);
  assert.equal(r[0].unitId, "U-X");
});

test("claimsForSlot: empty/null safe", () => {
  assert.deepEqual(claimsForSlot(null, "india"), []);
  assert.deepEqual(claimsForSlot({}, "india"), []);
  assert.deepEqual(claimsForSlot({ claims: [] }, "india"), []);
});

// ── queueForSlot ────────────────────────────────────────────────────────────

test("queueForSlot: returns array for slot", () => {
  const j = { queues: { india: [{ unit_id: "U-1" }, { unit_id: "U-2" }], echo: [] } };
  assert.equal(queueForSlot(j, "india").length, 2);
  assert.equal(queueForSlot(j, "echo").length, 0);
});

test("queueForSlot: missing slot → empty array", () => {
  assert.deepEqual(queueForSlot({ queues: {} }, "india"), []);
  assert.deepEqual(queueForSlot(null, "india"), []);
});

// ── handoffMatchesSlot ─────────────────────────────────────────────────────

test("handoffMatchesSlot: instance-keyed (HANDOFF-claude-<id>-<slot>-<topic>.md)", () => {
  assert.equal(handoffMatchesSlot("HANDOFF-claude-c15271d5-india-cad-fusion-liv.md", "india"), true);
});

test("handoffMatchesSlot: golf-style slot-keyed (HANDOFF-golf-<task>.md)", () => {
  assert.equal(handoffMatchesSlot("HANDOFF-golf-fleet-reaper-task.md", "golf"), true);
});

test("handoffMatchesSlot: archive suffix tolerated", () => {
  assert.equal(handoffMatchesSlot("HANDOFF-claude-x-india-x.archive.2026-05-19", "india"), true);
});

test("handoffMatchesSlot: cross-slot does NOT match", () => {
  assert.equal(handoffMatchesSlot("HANDOFF-claude-x-india-foo.md", "echo"), false);
});

test("handoffMatchesSlot: rejects non-HANDOFF prefix", () => {
  assert.equal(handoffMatchesSlot("README-india-foo.md", "india"), false);
});

test("handoffMatchesSlot: handles non-string defensively", () => {
  assert.equal(handoffMatchesSlot(null, "india"), false);
  assert.equal(handoffMatchesSlot(undefined, "india"), false);
  assert.equal(handoffMatchesSlot(123, "india"), false);
});

// ── listHandoffs (injected I/O) ────────────────────────────────────────────

test("listHandoffs: sorts by mtime desc, applies limit, filters by slot", () => {
  const now = Date.now();
  const fakeReaddir = () => [
    "HANDOFF-claude-a-india-old.md",
    "HANDOFF-claude-b-india-new.md",
    "HANDOFF-claude-c-echo-other.md",
  ];
  const fakeStat = (p) => {
    if (p.endsWith("new.md")) return { mtimeMs: now };
    if (p.endsWith("old.md")) return { mtimeMs: now - 86_400_000 };
    return { mtimeMs: now - 1000 };
  };
  const out = listHandoffs("/fake/dir", "india", 5, fakeStat, fakeReaddir);
  assert.equal(out.length, 2, "echo file excluded");
  assert.ok(out[0].name.includes("new"), "newest first");
  assert.ok(out[1].name.includes("old"));
});

test("listHandoffs: limit caps output", () => {
  const fakeReaddir = () => [
    "HANDOFF-claude-1-india-a.md","HANDOFF-claude-2-india-b.md","HANDOFF-claude-3-india-c.md",
  ];
  const fakeStat = () => ({ mtimeMs: Date.now() });
  assert.equal(listHandoffs("/d", "india", 2, fakeStat, fakeReaddir).length, 2);
});

test("listHandoffs: missing dir returns []", () => {
  const out = listHandoffs("/nonexistent-dir-xyz", "india", 5);
  assert.deepEqual(out, []);
});

// ── normalizeSince ─────────────────────────────────────────────────────────

test("normalizeSince: '14d' → '14 days ago'", () => {
  assert.equal(normalizeSince("14d"), "14 days ago");
  assert.equal(normalizeSince("7D"), "7 days ago");
});

test("normalizeSince: ISO date pass-through", () => {
  assert.equal(normalizeSince("2026-05-01"), "2026-05-01");
});

test("normalizeSince: empty/missing → default", () => {
  assert.equal(normalizeSince(""), "14 days ago");
  assert.equal(normalizeSince(null), "14 days ago");
  assert.equal(normalizeSince(undefined), "14 days ago");
});

// ── buildReport orchestrator (live-data integration smoke) ─────────────────

test("buildReport: returns ok=true and expected keys for valid slot", () => {
  const r = buildReport("india", { sections: ["queue"], limit: 1 });
  assert.equal(r.ok, true);
  assert.equal(r.slot, "india");
  assert.ok("queueEligible" in r, "queue section emitted");
  assert.ok(typeof r.queueTotal === "number", "queue total is number");
});

test("buildReport: limit clamps to [1,100]", () => {
  const r0 = buildReport("india", { limit: 0, sections: ["queue"] });
  assert.equal(r0.limit, 1, "0 → 1");
  const rBig = buildReport("india", { limit: 9999, sections: ["queue"] });
  assert.equal(rBig.limit, 100, "9999 → 100");
});

test("buildReport: section subsetting omits unrequested keys", () => {
  const r = buildReport("india", { sections: ["queue"], limit: 1 });
  assert.ok(!("binding" in r));
  assert.ok(!("claims" in r));
  assert.ok(!("handoffs" in r));
  assert.ok(!("commits" in r));
});
