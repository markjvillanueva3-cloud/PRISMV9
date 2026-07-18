#!/usr/bin/env node
import { test } from "node:test";
import { strict as assert } from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  parseTipsJsonl, filterTips, formatHuman, parseArgs, loadAllTips, SCHEMA_VERSION,
} from "./query-extracted-tips.mjs";

const t1 = { id: "foc-001", domain: "general", topic: "climb-vs-conventional",
  tip: "Climb on CNC always — ball-screw eliminates manual-era backlash.",
  source: { book: "Fundamentals of CNC Machining", chapter: 3, section: "Climb vs. Conventional", pages: "3-9" },
  bridge_engines: ["engine.SpeedFeedOrchestratorEngine", "engine.ToolLifeEngine"],
  audience: ["alpha", "delta"] };

const t2 = { id: "foc14-005", domain: "mill", topic: "wcs-against-fixed-jaw",
  tip: "WCS datums against FIXED jaw, never moving jaw.",
  source: { book: "Fundamentals of CNC Machining (Autodesk 2014 edition)", chapter: 7 },
  bridge_engines: ["engine.WorkCoordinateSystemEngine"], audience: ["alpha", "india"] };

const t3 = { id: "meh-006", domain: "general", topic: "regenerative-chatter-loop",
  tip: "ES↔CPS feedback is the root cause of regenerative chatter.",
  source: { book: "Mechanical Engineer's Handbook", chapter: 6 },
  bridge_engines: ["engine.RegenerativeChatterEngine", "engine.ChatterStabilityLobeEngine"],
  audience: ["alpha", "kilo"] };

test("parseTipsJsonl parses valid jsonl + skips malformed/blank", () => {
  const text = JSON.stringify(t1) + "\n\nnot json\n" + JSON.stringify(t2) + "\n";
  assert.equal(parseTipsJsonl(text).length, 2);
});

test("parseTipsJsonl requires id + tip fields", () => {
  const text = JSON.stringify({ id: "x" }) + "\n" + JSON.stringify({ tip: "y" }) + "\n" + JSON.stringify(t1);
  assert.equal(parseTipsJsonl(text).length, 1);
});

test("parseTipsJsonl handles empty input", () => {
  assert.deepEqual(parseTipsJsonl(""), []);
  assert.deepEqual(parseTipsJsonl("   "), []);
});

test("filterTips with no criteria returns all tips", () => {
  assert.equal(filterTips([t1, t2, t3]).length, 3);
  assert.equal(filterTips([t1, t2, t3], {}).length, 3);
});

test("filterTips --engine matches bridge_engines (with or without engine. prefix)", () => {
  assert.equal(filterTips([t1, t2, t3], { engine: "engine.RegenerativeChatterEngine" }).length, 1);
  assert.equal(filterTips([t1, t2, t3], { engine: "RegenerativeChatterEngine" }).length, 1);
  assert.equal(filterTips([t1, t2, t3], { engine: "engine.NonexistentEngine" }).length, 0);
});

test("filterTips --audience matches array", () => {
  assert.equal(filterTips([t1, t2, t3], { audience: "alpha" }).length, 3);
  assert.equal(filterTips([t1, t2, t3], { audience: "india" }).length, 1);
  assert.equal(filterTips([t1, t2, t3], { audience: "zulu" }).length, 0);
});

test("filterTips --domain matches exact", () => {
  assert.equal(filterTips([t1, t2, t3], { domain: "mill" }).length, 1);
  assert.equal(filterTips([t1, t2, t3], { domain: "general" }).length, 2);
});

test("filterTips --topic substring", () => {
  assert.equal(filterTips([t1, t2, t3], { topicSubstr: "wcs" }).length, 1);
  assert.equal(filterTips([t1, t2, t3], { topicSubstr: "chatter" }).length, 1);
});

test("filterTips --tip-substr is case-insensitive", () => {
  assert.equal(filterTips([t1, t2, t3], { tipSubstr: "BALL-SCREW" }).length, 1);
  assert.equal(filterTips([t1, t2, t3], { tipSubstr: "ball-screw" }).length, 1);
});

test("filterTips --book substring", () => {
  assert.equal(filterTips([t1, t2, t3], { bookSubstr: "Autodesk" }).length, 1);
  assert.equal(filterTips([t1, t2, t3], { bookSubstr: "Handbook" }).length, 1);
});

test("filterTips composes AND across multiple criteria", () => {
  const r = filterTips([t1, t2, t3], { engine: "engine.RegenerativeChatterEngine", audience: "alpha" });
  assert.equal(r.length, 1);
  assert.equal(r[0].id, "meh-006");
  // Conflicting filters → 0 matches
  const r2 = filterTips([t1, t2, t3], { engine: "engine.RegenerativeChatterEngine", audience: "india" });
  assert.equal(r2.length, 0);
});

test("filterTips is safe on tips with missing fields", () => {
  const bad = { id: "x", tip: "y" }; // no source, no bridge_engines, no audience, no domain
  // No filter → included
  assert.equal(filterTips([bad]).length, 1);
  // Any filter that requires the missing field → excluded
  assert.equal(filterTips([bad], { engine: "X" }).length, 0);
  assert.equal(filterTips([bad], { audience: "alpha" }).length, 0);
  assert.equal(filterTips([bad], { domain: "general" }).length, 0);
  assert.equal(filterTips([bad], { bookSubstr: "any" }).length, 0);
});

test("formatHuman renders required fields without crashing", () => {
  const s = formatHuman(t1);
  assert.match(s, /foc-001/);
  assert.match(s, /climb-vs-conventional/);
  assert.match(s, /Fundamentals of CNC Machining/);
  assert.match(s, /engine\.SpeedFeedOrchestratorEngine/);
  assert.match(s, /alpha,delta/);
});

test("formatHuman handles tip with missing fields without crashing", () => {
  const minimal = { id: "x", tip: "minimal" };
  const s = formatHuman(minimal);
  assert.match(s, /minimal/);
});

test("parseArgs default limit is 100, json false", () => {
  const r = parseArgs([]);
  assert.equal(r.limit, 100);
  assert.equal(r.json, false);
});

test("parseArgs parses all named flags", () => {
  const r = parseArgs(["--engine", "X", "--audience", "alpha", "--domain", "mill",
    "--topic", "t", "--tip-substr", "s", "--book", "b", "--limit", "5", "--json"]);
  assert.equal(r.engine, "X");
  assert.equal(r.audience, "alpha");
  assert.equal(r.domain, "mill");
  assert.equal(r.topicSubstr, "t");
  assert.equal(r.tipSubstr, "s");
  assert.equal(r.bookSubstr, "b");
  assert.equal(r.limit, 5);
  assert.equal(r.json, true);
});

test("parseArgs limit floor of 1", () => {
  const r = parseArgs(["--limit", "0"]);
  assert.equal(r.limit, 1);
});

test("parseArgs --help sets help flag", () => {
  assert.equal(parseArgs(["--help"]).help, true);
  assert.equal(parseArgs(["-h"]).help, true);
});

test("loadAllTips returns [] when dir missing", () => {
  const fake = path.join(os.tmpdir(), "no-such-dir-" + Date.now());
  assert.deepEqual(loadAllTips(fake), []);
});

test("loadAllTips parses every *.jsonl in dir sorted", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tips-"));
  try {
    fs.writeFileSync(path.join(tmp, "b.jsonl"), JSON.stringify(t2) + "\n");
    fs.writeFileSync(path.join(tmp, "a.jsonl"), JSON.stringify(t1) + "\n");
    fs.writeFileSync(path.join(tmp, "ignored.txt"), "not jsonl");
    const tips = loadAllTips(tmp);
    assert.equal(tips.length, 2);
    // Sorted order: a.jsonl before b.jsonl
    assert.equal(tips[0].id, "foc-001");
    assert.equal(tips[1].id, "foc14-005");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("SCHEMA_VERSION is semver-like", () => {
  assert.match(SCHEMA_VERSION, /^\d+\.\d+\.\d+$/);
});

test("end-to-end: filter the real corpus by ChatterStabilityLobeEngine returns >=1", () => {
  const all = loadAllTips();
  if (all.length === 0) { console.log("(no tips on disk yet — skipping live filter assertion)"); return; }
  const r = filterTips(all, { engine: "engine.ChatterStabilityLobeEngine" });
  assert.ok(r.length >= 1, "expected at least one tip wired to ChatterStabilityLobeEngine after iter27-30");
});
