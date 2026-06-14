#!/usr/bin/env node
// Tests for domain-classifier.mjs — slot↔domain single source of truth.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_DOMAIN,
  DOMAIN_RULES,
  DOMAIN_TO_SLOT,
  SLOT_TO_DOMAIN,
  classifyText,
  classifyUnit,
  filterUnitsBySlot,
  slotDomain,
} from "./domain-classifier.mjs";

test("classifyUnit — canonical domain hits", () => {
  assert.equal(classifyUnit({ title: "WEDM wire path optimizer" }).domain, "wire");
  assert.equal(classifyUnit({ title: "lathe turning groove cycle" }).domain, "lathe");
  assert.equal(classifyUnit({ title: "Mastercam toolpath export" }).domain, "cam");
  assert.equal(classifyUnit({ title: "5-axis milling strategy" }).domain, "mill");
  assert.equal(classifyUnit({ title: "STEP file feature recognition" }).domain, "cad");
});

test("classifyUnit — ORDER INVARIANT: HYPERMILL classifies as cam, not mill", () => {
  // The load-bearing ordering bug: "HYPERMILL" contains "MILL". If the mill
  // rule ran before cam, this would mis-route. cam MUST be checked first.
  assert.equal(classifyUnit({ title: "hyperMILL 3D roughing" }).domain, "cam");
  assert.equal(classifyUnit({ title: "MASTERCAM post" }).domain, "cam");
  assert.equal(classifyUnit({ title: "SOLIDCAM iMachining" }).domain, "cam");
});

test("classifyUnit — ORDER INVARIANT: WEDM classifies as wire, not (E)DM-generic-to-lathe", () => {
  assert.equal(classifyUnit({ title: "WEDM sinker electrode" }).domain, "wire");
  assert.equal(classifyUnit({ title: "wire-EDM taper" }).domain, "wire");
});

test("classifyUnit — searches milestone + unit_id + title together", () => {
  assert.equal(classifyUnit({ milestone: "CAM-EXHAUST-MS0", title: "generic" }).domain, "cam");
  assert.equal(classifyUnit({ unit_id: "U-LATHE-GROOVE-01", title: "" }).domain, "lathe");
  assert.equal(classifyUnit({ id: "U-MILL-FACE", title: "" }).domain, "mill");   // id fallback when no unit_id
});

test("classifyUnit — unmatched falls back to {misc, mike}", () => {
  const r = classifyUnit({ title: "completely unrelated widget" });
  assert.equal(r.domain, "misc");
  assert.equal(r.slot, "mike");
});

test("classifyUnit — null / non-object input is safe", () => {
  assert.deepEqual(classifyUnit(null), DEFAULT_DOMAIN);
  assert.deepEqual(classifyUnit(undefined), DEFAULT_DOMAIN);
  assert.deepEqual(classifyUnit(42), DEFAULT_DOMAIN);
  assert.deepEqual(classifyUnit("a string"), DEFAULT_DOMAIN);
});

test("classifyUnit — empty fields fall back to misc", () => {
  assert.equal(classifyUnit({}).domain, "misc");
  assert.equal(classifyUnit({ title: "", milestone: "", unit_id: "" }).domain, "misc");
});

test("classifyText — free-text classification", () => {
  assert.equal(classifyText("speed feed kienzle table").domain, "speedfeed");
  assert.equal(classifyText("print-to-program OCR pipeline").domain, "print2prog");
  assert.equal(classifyText("").domain, "misc");
  assert.equal(classifyText(null).domain, "misc");
  assert.equal(classifyText(123).domain, "misc");
});

test("slotDomain — slot → domain reverse lookup", () => {
  assert.equal(slotDomain("echo"), "cam");
  assert.equal(slotDomain("alpha"), "mill");
  assert.equal(slotDomain("ECHO"), "cam");                  // case-insensitive
  assert.equal(slotDomain("mike"), "misc");
  assert.equal(slotDomain("golf"), "database");
  assert.equal(slotDomain("nonexistent"), null);
  assert.equal(slotDomain(null), null);
  assert.equal(slotDomain(42), null);
});

test("DOMAIN_TO_SLOT / SLOT_TO_DOMAIN — round-trip consistency", () => {
  for (const rule of DOMAIN_RULES) {
    assert.equal(DOMAIN_TO_SLOT[rule.domain], rule.slot, `domain ${rule.domain} → slot`);
    assert.equal(SLOT_TO_DOMAIN[rule.slot], rule.domain, `slot ${rule.slot} → domain`);
  }
  // default included
  assert.equal(DOMAIN_TO_SLOT.misc, "mike");
  assert.equal(SLOT_TO_DOMAIN.mike, "misc");
});

test("DOMAIN_TO_SLOT / SLOT_TO_DOMAIN — 13 slots, 13 domains, bijective", () => {
  const slots = new Set(Object.values(DOMAIN_TO_SLOT));
  const domains = new Set(Object.values(SLOT_TO_DOMAIN));
  assert.equal(slots.size, 13, "13 distinct slots");
  assert.equal(domains.size, 13, "13 distinct domains");
});

test("frozen exports — cannot mutate the rule table at runtime", () => {
  assert.throws(() => { DOMAIN_RULES.push({ domain: "x", slot: "y", rx: /x/ }); });
  assert.throws(() => { DOMAIN_TO_SLOT.cam = "hacked"; });
  assert.throws(() => { DEFAULT_DOMAIN.slot = "hacked"; });
});

test("filterUnitsBySlot — keeps only the slot's domain", () => {
  const units = [
    { title: "Mastercam toolpath" },             // cam → echo
    { title: "lathe groove" },                   // lathe → bravo
    { title: "WEDM electrode" },                 // wire → charlie
    { title: "another CAM thing" },              // cam → echo
  ];
  const echoUnits = filterUnitsBySlot(units, "echo");
  assert.equal(echoUnits.length, 2);
  for (const u of echoUnits) assert.ok(/cam/i.test(u.title) || /CAM/.test(u.title));
});

test("filterUnitsBySlot — unknown slot returns input unchanged (R12 no silent drop)", () => {
  const units = [{ title: "x" }, { title: "y" }];
  const out = filterUnitsBySlot(units, "no-such-slot");
  assert.strictEqual(out, units, "must return the SAME array reference (no filtering applied)");
});

test("filterUnitsBySlot — empty / non-array input returned unchanged", () => {
  assert.deepEqual(filterUnitsBySlot([], "echo"), []);
  const notArr = null;
  assert.strictEqual(filterUnitsBySlot(notArr, "echo"), notArr);
});

test("filterUnitsBySlot — slot with zero matching units yields empty array (not the input)", () => {
  const units = [{ title: "lathe only" }];
  const out = filterUnitsBySlot(units, "echo");           // echo=cam, no cam units
  assert.equal(out.length, 0);
  assert.notStrictEqual(out, units, "must be a NEW empty array, not the input ref");
});
