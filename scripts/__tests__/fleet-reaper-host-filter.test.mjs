/**
 * Tests for FLEET-REAPER-MS2/U-FR-S3 — cross-PC host filter in mapPidsToSlots.
 *
 * Coverage:
 *   - Slot.host matching current host → INCLUDED (byte-identical to pre-S3)
 *   - Slot.host differs → SKIPPED + caveat emitted
 *   - Slot.host missing → INCLUDED (legacy slots + single-machine setups)
 *   - Case-insensitive compare (Windows hostname semantics)
 *   - Multiple skipped slots → caveat reports the count
 *   - Backward-compat: 3-arg call uses live hostname (no opts.host)
 *   - PID-reuse-across-hosts safety: same PID, different hosts, only current
 *     host's slot enters the map (the bug the filter was built to prevent).
 */

import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import { hostname as osHostname } from "node:os";

import { mapPidsToSlots } from "../../.claude/helpers/process-slot-map.mjs";

const NOW = Date.parse("2026-05-18T14:00:00.000Z");

/** Build a minimal slots-file fixture covering every slot we want to test. */
function slotsWith(entries) {
  const slots = {};
  for (const [name, slot] of Object.entries(entries)) slots[name] = slot;
  return { slots };
}

function aliveSlot(opts) {
  return {
    chatId: opts.chatId,
    host: opts.host,
    pid: opts.pid,
    lastHeartbeat: new Date(NOW - 5_000).toISOString(),
    activity: "test",
  };
}

describe("mapPidsToSlots: cross-PC host filter (U-FR-S3)", () => {
  test("slot on current host → INCLUDED", () => {
    const sf = slotsWith({
      alpha: aliveSlot({ chatId: "c1", host: "MARKV", pid: 100 }),
    });
    const { map, caveats } = mapPidsToSlots(sf, { pids: {} }, NOW, { host: "MARKV" });
    assert.equal(map.size, 1);
    assert.equal(map.get(100).slot, "alpha");
    assert.equal(caveats.filter(c => c.includes("different host")).length, 0);
  });

  test("slot on DIFFERENT host → SKIPPED + caveat emitted", () => {
    const sf = slotsWith({
      alpha: aliveSlot({ chatId: "c1", host: "HOME-PC", pid: 100 }),
    });
    const { map, caveats } = mapPidsToSlots(sf, { pids: {} }, NOW, { host: "MARKV" });
    assert.equal(map.size, 0, "remote-host slot must not enter the map");
    assert.equal(
      caveats.some(c => c.includes("skipped 1 slot") && c.includes("markv")),
      true,
      `expected skipped-1-slot caveat naming current host, got: ${caveats.join(" | ")}`,
    );
  });

  test("slot with NO host field → INCLUDED (legacy backward-compat)", () => {
    const sf = slotsWith({
      alpha: { chatId: "c1", pid: 100, lastHeartbeat: new Date(NOW - 5000).toISOString() },
    });
    const { map } = mapPidsToSlots(sf, { pids: {} }, NOW, { host: "MARKV" });
    assert.equal(map.size, 1, "legacy slot without host must still attribute");
    assert.equal(map.get(100).slot, "alpha");
  });

  test("host compare is CASE-INSENSITIVE (Windows hostname semantics)", () => {
    const sf = slotsWith({
      alpha: aliveSlot({ chatId: "c1", host: "markv", pid: 100 }),
      bravo: aliveSlot({ chatId: "c2", host: "MARKV", pid: 200 }),
      charlie: aliveSlot({ chatId: "c3", host: "MarkV", pid: 300 }),
    });
    const { map } = mapPidsToSlots(sf, { pids: {} }, NOW, { host: "MARKV" });
    assert.equal(map.size, 3, "all three case-variants must match");
  });

  test("host with leading/trailing whitespace tolerated", () => {
    const sf = slotsWith({
      alpha: aliveSlot({ chatId: "c1", host: "  MARKV  ", pid: 100 }),
    });
    const { map } = mapPidsToSlots(sf, { pids: {} }, NOW, { host: "MARKV" });
    assert.equal(map.size, 1, "whitespace in slot.host must not block the match");
  });

  test("multiple remote-host slots → caveat reports the count", () => {
    const sf = slotsWith({
      alpha:   aliveSlot({ chatId: "c1", host: "HOME-PC", pid: 100 }),
      bravo:   aliveSlot({ chatId: "c2", host: "HOME-PC", pid: 200 }),
      charlie: aliveSlot({ chatId: "c3", host: "HOME-PC", pid: 300 }),
      delta:   aliveSlot({ chatId: "c4", host: "MARKV",   pid: 400 }),
    });
    const { map, caveats } = mapPidsToSlots(sf, { pids: {} }, NOW, { host: "MARKV" });
    assert.equal(map.size, 1);
    assert.equal(map.get(400).slot, "delta");
    assert.equal(
      caveats.some(c => c.includes("skipped 3 slot")),
      true,
      `expected '3 slots' in caveat, got: ${caveats.join(" | ")}`,
    );
  });

  test("PID-reuse-across-hosts safety: same PID different hosts → only current wins", () => {
    // The bug class: PC-A and PC-B both happen to have a process at PID 12345.
    // Pre-S3, PC-A's reaper would see PC-B's slot claiming pid 12345 and could
    // mis-attribute its own pid 12345 to PC-B's slot, leading to wrong class.
    const sf = slotsWith({
      alpha: aliveSlot({ chatId: "remote-c", host: "HOME-PC", pid: 12345 }),
      bravo: aliveSlot({ chatId: "local-c",  host: "MARKV",   pid: 12345 }),
    });
    const { map } = mapPidsToSlots(sf, { pids: {} }, NOW, { host: "MARKV" });
    // Only the local slot's claim on PID 12345 made it into the map.
    assert.equal(map.size, 1);
    assert.equal(map.get(12345).slot, "bravo");
    assert.equal(map.get(12345).chatId, "local-c");
  });

  test("3-arg backward-compat: uses live hostname when opts omitted", () => {
    // Without the 4th param, mapPidsToSlots reads os.hostname(). Use a slot
    // tagged with the literal current hostname to confirm filter still works.
    const live = osHostname();
    const sf = slotsWith({
      alpha: aliveSlot({ chatId: "c1", host: live, pid: 100 }),
      bravo: aliveSlot({ chatId: "c2", host: "DEFINITELY-NOT-THIS-HOST-9999", pid: 200 }),
    });
    const { map, caveats } = mapPidsToSlots(sf, { pids: {} }, NOW);
    assert.equal(map.size, 1, "current-host slot survives the 3-arg call");
    assert.equal(map.get(100).slot, "alpha");
    assert.equal(caveats.some(c => c.includes("different host")), true);
  });

  test("empty slots object → empty map, no caveat", () => {
    const { map, caveats } = mapPidsToSlots({ slots: {} }, { pids: {} }, NOW, { host: "MARKV" });
    assert.equal(map.size, 0);
    assert.equal(caveats.length, 0);
  });

  test("null slotsFile (no slots at all) → empty map, safe degraded", () => {
    const { map, caveats } = mapPidsToSlots(null, null, NOW, { host: "MARKV" });
    assert.equal(map.size, 0);
    assert.equal(caveats.length, 0);
  });

  test("opts.host explicitly empty string → falls back to os.hostname()", () => {
    // opts.host="" must not bypass the filter (a slot with host="OTHER" would
    // otherwise be allowed through because "" === ""). Treat empty as unset.
    const live = osHostname();
    const sf = slotsWith({
      alpha: aliveSlot({ chatId: "c1", host: live, pid: 100 }),
      bravo: aliveSlot({ chatId: "c2", host: "ELSEWHERE", pid: 200 }),
    });
    const { map } = mapPidsToSlots(sf, { pids: {} }, NOW, { host: "" });
    assert.equal(map.size, 1);
    assert.equal(map.get(100).slot, "alpha");
  });
});

describe("mapPidsToSlots: regression — pre-S3 behavior preserved when host info absent", () => {
  test("ALL slots missing host field → no filter applied, all included", () => {
    const noHostSlot = (chatId, pid) => ({
      chatId,
      pid,
      lastHeartbeat: new Date(NOW - 5000).toISOString(),
    });
    const sf = slotsWith({
      alpha:   noHostSlot("c1", 100),
      bravo:   noHostSlot("c2", 200),
      charlie: noHostSlot("c3", 300),
    });
    const { map, caveats } = mapPidsToSlots(sf, { pids: {} }, NOW, { host: "MARKV" });
    assert.equal(map.size, 3, "host=undefined slots are pre-S3 behavior — all attribute");
    assert.equal(caveats.filter(c => c.includes("different host")).length, 0);
  });
});
