#!/usr/bin/env node
/**
 * chat-slots-rename.test.mjs — tests for the `rename` subcommand
 * (AUTONOMOUS-FLEET-MS0 follow-on — user-requested chat-rename command)
 * Run: node --test .claude/helpers/__tests__/chat-slots-rename.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { renameChat, claimSlot } from "../chat-slots.mjs";

function tmpState() {
  const f = path.join(os.tmpdir(), `chat-slots-rename-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  return f;
}
function tmpLock(stateFile) { return `${stateFile}.lock`; }
function cleanup(f) {
  for (const p of [f, `${f}.lock`, `${f}.tmp`]) { try { fs.unlinkSync(p); } catch { /* ignore */ } }
}

describe("renameChat — input validation", () => {
  test("missing topic → invalid_input", () => {
    const r = renameChat({ chatId: "claude-x" });
    assert.equal(r.ok, false);
    assert.equal(r.error, "invalid_input");
  });

  test("empty/whitespace topic → invalid_input", () => {
    assert.equal(renameChat({ chatId: "x", topic: "" }).ok, false);
    assert.equal(renameChat({ chatId: "x", topic: "   " }).ok, false);
  });

  test("neither slot nor chatId → invalid_input", () => {
    const r = renameChat({ topic: "newname" });
    assert.equal(r.ok, false);
    assert.match(r.message, /slot.*chatId/);
  });

  test("topic that sanitizes to empty → invalid_input", () => {
    const r = renameChat({ chatId: "x", topic: "!!!@@@###" });
    assert.equal(r.ok, false);
    assert.match(r.message, /sanitized to empty/);
  });
});

describe("renameChat — by chatId", () => {
  test("renames the slot owned by chatId, preserves binding", () => {
    const sf = tmpState();
    try {
      const claim = claimSlot({ chatId: "claude-aaa111", host: "H", pid: 100, branch: "b", topic: "old-topic", activity: "checkin" }, sf, tmpLock(sf));
      assert.equal(claim.ok, true);
      const slot = claim.slot;
      const r = renameChat({ chatId: "claude-aaa111", topic: "new-fancy-name" }, sf, tmpLock(sf));
      assert.equal(r.ok, true);
      assert.equal(r.slot, slot);
      assert.equal(r.oldTopic, "old-topic");
      assert.equal(r.newTopic, "new-fancy-name");
      assert.equal(r.state.chatId, "claude-aaa111", "chatId binding preserved");
      assert.equal(r.state.pid, 100, "pid preserved");
      assert.equal(r.state.topic, "new-fancy-name");
    } finally { cleanup(sf); }
  });

  test("chatId not owning any slot → no_slot_owned", () => {
    const sf = tmpState();
    try {
      const r = renameChat({ chatId: "claude-ghost", topic: "x" }, sf, tmpLock(sf));
      assert.equal(r.ok, false);
      assert.equal(r.error, "no_slot_owned");
    } finally { cleanup(sf); }
  });

  test("refreshes lastHeartbeat on rename", () => {
    const sf = tmpState();
    try {
      claimSlot({ chatId: "claude-hb", host: "H", pid: 1, branch: "b", topic: "t", activity: "a" }, sf, tmpLock(sf));
      const r = renameChat({ chatId: "claude-hb", topic: "renamed" }, sf, tmpLock(sf));
      assert.ok(r.state.lastHeartbeat);
      assert.ok(Date.parse(r.state.lastHeartbeat) > 0);
    } finally { cleanup(sf); }
  });
});

describe("renameChat — by explicit slot", () => {
  test("renames the named slot directly", () => {
    const sf = tmpState();
    try {
      const claim = claimSlot({ chatId: "claude-bbb", host: "H", pid: 2, branch: "b", topic: "orig", activity: "x" }, sf, tmpLock(sf));
      const r = renameChat({ slot: claim.slot, topic: "by-slot-name" }, sf, tmpLock(sf));
      assert.equal(r.ok, true);
      assert.equal(r.newTopic, "by-slot-name");
    } finally { cleanup(sf); }
  });

  test("unknown slot name → unknown_slot", () => {
    const sf = tmpState();
    try {
      const r = renameChat({ slot: "zulu", topic: "x" }, sf, tmpLock(sf));
      assert.equal(r.ok, false);
      assert.equal(r.error, "unknown_slot");
    } finally { cleanup(sf); }
  });

  test("empty (unclaimed) slot → slot_empty", () => {
    const sf = tmpState();
    try {
      // Claim alpha so the file exists, then target an unclaimed slot
      claimSlot({ chatId: "claude-c", host: "H", pid: 3, branch: "b", topic: "t", activity: "a" }, sf, tmpLock(sf));
      const r = renameChat({ slot: "lima", topic: "x" }, sf, tmpLock(sf));
      assert.equal(r.ok, false);
      assert.equal(r.error, "slot_empty");
    } finally { cleanup(sf); }
  });
});

describe("renameChat — topic sanitization", () => {
  test("uppercase → lowercase", () => {
    const sf = tmpState();
    try {
      claimSlot({ chatId: "claude-s1", host: "H", pid: 4, branch: "b", topic: "t", activity: "a" }, sf, tmpLock(sf));
      const r = renameChat({ chatId: "claude-s1", topic: "MyFancyName" }, sf, tmpLock(sf));
      assert.equal(r.newTopic, "myfancyname");
    } finally { cleanup(sf); }
  });

  test("spaces and special chars → hyphens, collapsed", () => {
    const sf = tmpState();
    try {
      claimSlot({ chatId: "claude-s2", host: "H", pid: 5, branch: "b", topic: "t", activity: "a" }, sf, tmpLock(sf));
      const r = renameChat({ chatId: "claude-s2", topic: "GNN  build!! @work" }, sf, tmpLock(sf));
      assert.equal(r.newTopic, "gnn-build-work");
    } finally { cleanup(sf); }
  });

  test("leading/trailing hyphens stripped", () => {
    const sf = tmpState();
    try {
      claimSlot({ chatId: "claude-s3", host: "H", pid: 6, branch: "b", topic: "t", activity: "a" }, sf, tmpLock(sf));
      const r = renameChat({ chatId: "claude-s3", topic: "---edge---" }, sf, tmpLock(sf));
      assert.equal(r.newTopic, "edge");
    } finally { cleanup(sf); }
  });

  test("truncates to 32 chars", () => {
    const sf = tmpState();
    try {
      claimSlot({ chatId: "claude-s4", host: "H", pid: 7, branch: "b", topic: "t", activity: "a" }, sf, tmpLock(sf));
      const r = renameChat({ chatId: "claude-s4", topic: "a".repeat(80) }, sf, tmpLock(sf));
      assert.ok(r.newTopic.length <= 32);
    } finally { cleanup(sf); }
  });
});

describe("renameChat — activity override", () => {
  test("explicit activity is applied; default preserves prior", () => {
    const sf = tmpState();
    try {
      claimSlot({ chatId: "claude-act", host: "H", pid: 8, branch: "b", topic: "t", activity: "checkin" }, sf, tmpLock(sf));
      const r1 = renameChat({ chatId: "claude-act", topic: "n1" }, sf, tmpLock(sf));
      assert.equal(r1.state.activity, "checkin", "prior activity preserved when not overridden");
      const r2 = renameChat({ chatId: "claude-act", topic: "n2", activity: "building" }, sf, tmpLock(sf));
      assert.equal(r2.state.activity, "building", "explicit activity applied");
    } finally { cleanup(sf); }
  });
});
