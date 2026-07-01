#!/usr/bin/env node
/** Tests for jm-shop-knowledge-to-vault.mjs -- the JM-docs -> vault bridge. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { aggregate, aggregateDocuments, renderNote, buildShopProfile, isStale, CUSTOMER_NOISE } from "./jm-shop-knowledge-to-vault.mjs";

test("CUSTOMER_NOISE filters tooling/CAM/training folders, keeps real customers", () => {
  assert.ok(CUSTOMER_NOISE.test("MCAM X8"));
  assert.ok(CUSTOMER_NOISE.test("POSTS AND MACHINES"));
  assert.ok(CUSTOMER_NOISE.test("hyperMILL Online Training"));
  assert.ok(CUSTOMER_NOISE.test("JM"));
  assert.ok(!CUSTOMER_NOISE.test("FONTANA"));
  assert.ok(!CUSTOMER_NOISE.test("OMG"));
});

test("aggregate() on a fixture computes machine/kind/customer tallies + filters noise", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jmshop-"));
  const f = path.join(dir, "files.jsonl");
  fs.writeFileSync(f, [
    JSON.stringify({ machine: "lathe", kind: "g_code", customer: "FONTANA" }),
    JSON.stringify({ machine: "lathe", kind: "g_code", customer: "OMG" }),
    JSON.stringify({ machine: "okuma", kind: "cam_project", customer: "MCAM X8" }), // noise customer
    JSON.stringify({ machine: "wire_edm", kind: "g_code", customer: "FONTANA" }),
    "not json",                                                                      // parse error
  ].join("\n") + "\n");
  const s = aggregate(f);
  assert.equal(s.ok, true);
  assert.equal(s.records, 4, "4 valid records (1 parse error skipped)");
  assert.equal(s.parseErrors, 1);
  assert.deepEqual(s.machine[0], ["lathe", 2], "lathe is the top machine");
  assert.deepEqual(s.kind[0], ["g_code", 3], "g_code is the top kind");
  assert.equal(s.customerCount, 2, "MCAM X8 filtered -> only FONTANA + OMG count");
  const mk = Object.fromEntries(s.machineKind.map(([k, c]) => [k, c]));
  assert.equal(mk["lathe|g_code"], 2);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("aggregate() on a missing file fails loud (no fabricated stats)", () => {
  const s = aggregate(path.join(os.tmpdir(), "no_such_files_xyz.jsonl"));
  assert.equal(s.ok, false);
  assert.equal(s.reason, "files-jsonl-missing");
});

test("renderNote produces valid frontmatter + machine table + R12 caveat", () => {
  const s = aggregate(); // real data if present
  if (!s.ok) return;     // skip if DB not built in this env
  const note = renderNote(s, "2026-06-12T00:00:00Z");
  assert.ok(note.startsWith("---\nname: reference_jm_shop_function_profile"));
  assert.ok(/metadata:\s*\n\s*type: reference/.test(note), "has reference type frontmatter");
  assert.ok(note.includes("Machine utilization"), "has the machine section");
  assert.ok(note.includes("R12 caveat"), "carries the customer-noise honesty caveat");
  assert.ok(note.includes("jm-die-profile.ts"), "points at the canonical customer source");
  assert.ok(/lathe/.test(note), "names the dominant machine");
});

test("renderNote on a missing source emits a fail-loud note, not fake data", () => {
  const note = renderNote({ ok: false, reason: "files-jsonl-missing", path: "X" }, "2026-06-12T00:00:00Z");
  assert.ok(note.includes("SOURCE MISSING"));
  assert.ok(!note.includes("lathe -- 19"), "must not contain fabricated numbers");
});

test("aggregateDocuments tallies role distribution + date range (fixture)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jmdocs-"));
  const f = path.join(dir, "documents.jsonl");
  fs.writeFileSync(f, [
    JSON.stringify({ role: "SALES_ORDER", doc_date: "2014-04-15" }),
    JSON.stringify({ role: "SALES_ORDER", doc_date: "2026-02-23" }),
    JSON.stringify({ role: "PRINT", doc_date: "2020-01-01" }),
    JSON.stringify({ role: "QUOTE", doc_date: null }),     // null date ignored for range
    "not json",                                              // parse error
  ].join("\n") + "\n");
  const s = aggregateDocuments(f);
  assert.equal(s.ok, true);
  assert.equal(s.records, 4);
  assert.equal(s.parseErrors, 1);
  assert.deepEqual(s.role[0], ["SALES_ORDER", 2], "SALES_ORDER is the top role");
  assert.equal(s.dateRange.min, "2014-04-15");
  assert.equal(s.dateRange.max, "2026-02-23");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("aggregateDocuments on a missing file is fail-soft (ok:false, not throw)", () => {
  const s = aggregateDocuments(path.join(os.tmpdir(), "no_such_documents_xyz.jsonl"));
  assert.equal(s.ok, false);
  assert.equal(s.reason, "documents-jsonl-missing");
});

test("buildShopProfile folds in the business dimension when docStats present", () => {
  const stats = aggregate();
  if (!stats.ok) return;
  const docStats = { ok: true, records: 100, parseErrors: 0, role: [["SALES_ORDER", 60], ["PRINT", 40]], dateRange: { min: "2014-01-01", max: "2026-01-01" } };
  const profile = buildShopProfile(stats, "2026-06-12T00:00:00Z", docStats);
  assert.equal(profile.schemaVersion, "1.1.0");
  assert.ok(profile.business, "business block present");
  assert.equal(profile.business.totalDocuments, 100);
  assert.equal(profile.business.documentRoles[0].id, "SALES_ORDER");
  assert.equal(profile.business.documentRoles[0].pct, 60);
});

test("buildShopProfile omits business when docStats absent (back-compat)", () => {
  const stats = aggregate();
  if (!stats.ok) return;
  const profile = buildShopProfile(stats, "2026-06-12T00:00:00Z", null);
  assert.equal(profile.business, undefined, "no business block without docStats");
  assert.ok(Array.isArray(profile.machines), "machines still present");
});

test("isStale: absent profile -> stale; newer source -> stale; older sources -> fresh", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jmstale-"));
  const profile = path.join(dir, "profile.json");
  const src = path.join(dir, "files.jsonl");

  assert.equal(isStale(profile, [src]), true, "absent profile is stale");

  fs.writeFileSync(src, "{}");
  fs.writeFileSync(profile, "{}");
  // Make the profile clearly newer than the source.
  const past = new Date(Date.now() - 60_000);
  fs.utimesSync(src, past, past);
  assert.equal(isStale(profile, [src]), false, "profile newer than source -> fresh");

  // Now touch the source to be newer than the profile.
  const future = new Date(Date.now() + 60_000);
  fs.utimesSync(src, future, future);
  assert.equal(isStale(profile, [src]), true, "source newer than profile -> stale");

  // A missing source is ignored (not treated as stale on its own).
  assert.equal(isStale(profile, [path.join(dir, "nope.jsonl")]), false, "missing source ignored");
  fs.rmSync(dir, { recursive: true, force: true });
});
