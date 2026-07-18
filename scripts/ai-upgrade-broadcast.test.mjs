/**
 * Tests for the fleet AI-upgrade broadcast protocol (ai-upgrade-broadcast.mjs).
 * node:test — run: node --test scripts/ai-upgrade-broadcast.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildUpgradeRecord, masterIndexRow, broadcast } from "./ai-upgrade-broadcast.mjs";

const TS = "2026-05-30T00:00:00.000Z";

test("buildUpgradeRecord — valid input maps every field", () => {
  const r = buildUpgradeRecord({
    slot: "mike", galaxy: "wedm", kind: "training", upgrade: "knowledge corpus",
    artifacts: "a.ts, b.ts", affects: "echo, india , cad", notes: "171 pairs", ts: TS,
  });
  assert.equal(r.schemaVersion, 1);
  assert.equal(r.slot, "mike");
  assert.equal(r.galaxy, "wedm");
  assert.equal(r.kind, "training");
  assert.equal(r.upgrade, "knowledge corpus");
  assert.equal(r.ts, TS);
  assert.deepEqual(r.artifacts, ["a.ts", "b.ts"]);
  assert.deepEqual(r.affects_galaxies, ["echo", "india", "cad"]); // trimmed, empties dropped
  assert.equal(r.notes, "171 pairs");
});

test("buildUpgradeRecord — throws when slot/galaxy/upgrade missing (fail-loud)", () => {
  assert.throws(() => buildUpgradeRecord({ galaxy: "wedm", upgrade: "x" }), /required/);
  assert.throws(() => buildUpgradeRecord({ slot: "mike", upgrade: "x" }), /required/);
  assert.throws(() => buildUpgradeRecord({ slot: "mike", galaxy: "wedm" }), /required/);
  assert.throws(() => buildUpgradeRecord({}), /required/);
});

test("buildUpgradeRecord — defaults: kind=ai-upgrade, notes undefined, empty CSV → []", () => {
  const r = buildUpgradeRecord({ slot: "mike", galaxy: "wedm", upgrade: "x" });
  assert.equal(r.kind, "ai-upgrade");
  assert.equal(r.notes, undefined);
  assert.deepEqual(r.artifacts, []);
  assert.deepEqual(r.affects_galaxies, []);
  assert.equal(typeof r.ts, "string");
  assert.ok(r.ts.length > 0); // auto-stamped ISO when not provided
});

test("masterIndexRow — names galaxy, slot, upgrade, affects", () => {
  const r = buildUpgradeRecord({ slot: "mike", galaxy: "wedm", upgrade: "corpus", affects: "echo,india", ts: TS });
  const row = masterIndexRow(r);
  assert.ok(row.includes("[wedm]"));
  assert.ok(row.includes("slot:mike"));
  assert.ok(row.includes("corpus"));
  assert.ok(row.includes("echo, india"));
  assert.ok(row.startsWith("- " + TS));
});

test("masterIndexRow — empty affects renders (fleet)", () => {
  const r = buildUpgradeRecord({ slot: "mike", galaxy: "wedm", upgrade: "x", ts: TS });
  assert.ok(masterIndexRow(r).includes("(fleet)"));
});

test("broadcast — injected I/O receives a parseable JSONL line + a master row", () => {
  const ledger = [];
  const master = [];
  const rec = broadcast(
    { slot: "mike", galaxy: "wedm", upgrade: "india-loop bridge", affects: "india", ts: TS },
    { appendLedger: (l) => ledger.push(l), appendMaster: (l) => master.push(l) },
  );
  assert.equal(ledger.length, 1);
  assert.equal(master.length, 1);
  assert.ok(ledger[0].endsWith("\n"));
  const parsed = JSON.parse(ledger[0]);
  assert.equal(parsed.galaxy, "wedm");
  assert.equal(parsed.upgrade, "india-loop bridge");
  assert.deepEqual(parsed.affects_galaxies, ["india"]);
  assert.equal(rec.slot, "mike");
  assert.ok(master[0].includes("[wedm]"));
});

test("broadcast — propagates fail-loud on malformed record (no partial write)", () => {
  const ledger = [];
  assert.throws(
    () => broadcast({ galaxy: "wedm" }, { appendLedger: (l) => ledger.push(l), appendMaster: () => {} }),
    /required/,
  );
  assert.equal(ledger.length, 0); // nothing written when the record is rejected
});
