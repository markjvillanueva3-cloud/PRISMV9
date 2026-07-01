#!/usr/bin/env node
/**
 * place-cam-tool-libraries.test.mjs -- hermetic tests for CAM seat placement.
 * Run: node scripts/place-cam-tool-libraries.test.mjs   (node:test auto-runs on exit)
 * Uses tmp src + tmp seat dirs via the seats/srcRoot DI overrides -- never touches real seats.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { placeLibraries, SEATS } from "./place-cam-tool-libraries.mjs";

function scaffold() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "place-"));
  const src = path.join(root, "src");
  const seatDir = path.join(root, "seat-fusion");
  fs.mkdirSync(path.join(src, "fusion"), { recursive: true });
  fs.writeFileSync(path.join(src, "fusion", "PRISM_HELICAL.tools"), JSON.stringify({ version: 2, data: [] }));
  fs.writeFileSync(path.join(src, "fusion", "PRISM_SANDVIK.tools"), JSON.stringify({ version: 2, data: [] }));
  fs.writeFileSync(path.join(src, "fusion", "ignoreme.txt"), "x"); // not PRISM_ -> ignored
  const seats = { fusion: { label: "TestFusion", dir: seatDir, srcExt: ".tools", mode: "copy" } };
  return { root, src, seatDir, seats };
}

test("placeLibraries: real config exposes the CAM seats with absolute dirs", () => {
  assert.deepEqual(Object.keys(SEATS).sort(), ["fusion", "hypermill", "hypermill-holders", "hypermill-inserts", "mastercam", "mastercam-holders", "mastercam-inserts"]);
  assert.ok(SEATS.hypermill.dir.includes("31.0"));
  assert.equal(SEATS.fusion.srcExt, ".tools");
  assert.equal(SEATS.mastercam.srcExt, "_tools.csv");
  assert.equal(SEATS["mastercam-inserts"].srcExt, "_inserts.csv");
  assert.equal(SEATS["hypermill-inserts"].srcExt, "_inserts.hmt.sql");
  assert.equal(SEATS["hypermill-inserts"].mode, "sqlite");
});

test("placeLibraries: copy mode places PRISM_ files (apply)", async () => {
  const { root, src, seatDir, seats } = scaffold();
  try {
    const report = await placeLibraries({ formats: ["fusion"], apply: true, seats, srcRoot: src });
    assert.equal(report.seats.fusion.sources, 2);       // ignoreme.txt excluded
    assert.equal(report.seats.fusion.placed, 2);
    assert.ok(fs.existsSync(path.join(seatDir, "PRISM_HELICAL.tools")));
    assert.ok(fs.existsSync(path.join(seatDir, "PRISM_SANDVIK.tools")));
    assert.ok(!fs.existsSync(path.join(seatDir, "ignoreme.txt")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("placeLibraries: dry-run writes nothing", async () => {
  const { root, src, seatDir, seats } = scaffold();
  try {
    const report = await placeLibraries({ formats: ["fusion"], apply: false, seats, srcRoot: src });
    assert.equal(report.apply, false);
    assert.equal(report.seats.fusion.sources, 2);
    assert.equal(report.seats.fusion.placed, 2);        // would-place count
    assert.ok(!fs.existsSync(seatDir), "dry-run created no seat dir");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("placeLibraries: empty source -> 0 placed, no throw", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "place-empty-"));
  try {
    const seats = { fusion: { label: "T", dir: path.join(root, "seat"), srcExt: ".tools", mode: "copy" } };
    const report = await placeLibraries({ formats: ["fusion"], apply: true, seats, srcRoot: root });
    assert.equal(report.seats.fusion.sources, 0);
    assert.equal(report.seats.fusion.placed, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
