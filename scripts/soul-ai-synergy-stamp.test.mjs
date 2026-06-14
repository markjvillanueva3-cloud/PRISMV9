#!/usr/bin/env node
/**
 * Tests for stampSouls -- the SOUL.md AI-synergy stamper. Hermetic: builds a temp
 * engine dir with fixture SOUL.md files (no disk dependency on the real engines).
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { stampSouls } from "./soul-ai-synergy-stamp.mjs";

function mkFixture(galaxies, withMarker = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "soul-stamp-"));
  for (const g of galaxies) {
    const gd = path.join(dir, g);
    fs.mkdirSync(gd, { recursive: true });
    const base = `# ${g} soul\nDomain identity for ${g}.\n`;
    const body = withMarker.includes(g) ? base + "\n<!-- AI-SYNERGY-STACK:tango-2026-06-11 -->\nalready stamped\n" : base;
    fs.writeFileSync(path.join(gd, "SOUL.md"), body);
  }
  return dir;
}

test("stamps every galaxy SOUL.md once; reports counts", () => {
  const dir = mkFixture(["mill", "wedm", "cad"]);
  const r = stampSouls(dir);
  assert.equal(r.total, 3);
  assert.equal(r.updated, 3);
  assert.equal(r.skipped, 0);
  // each file now carries the marker + the AI-stack heading + the bridge CLI
  for (const g of ["mill", "wedm", "cad"]) {
    const txt = fs.readFileSync(path.join(dir, g, "SOUL.md"), "utf8");
    assert.ok(txt.includes("AI-SYNERGY-STACK:tango-2026-06-11"));
    assert.ok(txt.includes("## AI Stack (synergized"));
    assert.ok(txt.includes(`galaxy-reasoning-bridge.mjs ${g}`)); // galaxy-specific CLI line
    assert.ok(txt.includes("hybrid RAG"));
  }
});

test("IDEMPOTENT: a second run skips all (no double-stamp)", () => {
  const dir = mkFixture(["mill", "wedm"]);
  stampSouls(dir);
  const r2 = stampSouls(dir);
  assert.equal(r2.updated, 0);
  assert.equal(r2.skipped, 2);
  // exactly one marker per file
  for (const g of ["mill", "wedm"]) {
    const txt = fs.readFileSync(path.join(dir, g, "SOUL.md"), "utf8");
    assert.equal(txt.split("AI-SYNERGY-STACK:tango-2026-06-11").length - 1, 1);
  }
});

test("ADDITIVE: never alters existing soul content above the block", () => {
  const dir = mkFixture(["lathe"]);
  const before = fs.readFileSync(path.join(dir, "lathe", "SOUL.md"), "utf8");
  stampSouls(dir);
  const after = fs.readFileSync(path.join(dir, "lathe", "SOUL.md"), "utf8");
  assert.ok(after.startsWith(before.replace(/\s*$/, ""))); // original is a prefix (append-only)
});

test("respects a pre-existing marker (mixed set -> partial update)", () => {
  const dir = mkFixture(["mill", "wedm", "cad"], ["wedm"]);
  const r = stampSouls(dir);
  assert.equal(r.updated, 2); // mill + cad
  assert.equal(r.skipped, 1); // wedm already had it
});

test("edge: a dir with no SOUL.md is ignored (not all subdirs are galaxies)", () => {
  const dir = mkFixture(["mill"]);
  fs.mkdirSync(path.join(dir, "not-a-galaxy"), { recursive: true });
  fs.writeFileSync(path.join(dir, "not-a-galaxy", "README.md"), "no soul here");
  const r = stampSouls(dir);
  assert.equal(r.total, 1); // only mill
  assert.equal(r.updated, 1);
});
