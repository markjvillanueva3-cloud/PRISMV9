#!/usr/bin/env node
/**
 * generate-college-course-features.test.mjs — pure-fn tests for the augmentation generator.
 *
 * Run: node --test scripts/generate-college-course-features.test.mjs
 */
import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  parseSpec, generate, readSpecsDir,
  COLLEGE_ROOST_ID, PLANNED_PARENT, ROOST_LAYER, COURSE_LAYER, MAX_LABEL, SCHEMA_VERSION,
} from "./generate-college-course-features.mjs";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const SAMPLE = [
  "# AUTOGEN SPEC — 2.830J",
  "",
  "| Field | Value |",
  "|---|---|",
  "| Course id | `2.830J` |",
  "| Slug | `mit-2_830j_spring_2008` |",
  "| Kind | `mit-ocw` |",
  "| Domain | `academic` |",
  "| Source path | `H:/PRISM/resources/MIT COURSES/2.830J` |",
].join("\n");

test("parseSpec extracts every table field", () => {
  const r = parseSpec("mit-2_830j_spring_2008", SAMPLE);
  assert.equal(r.slug, "mit-2_830j_spring_2008");
  assert.equal(r.courseId, "2.830J");
  assert.equal(r.kind, "mit-ocw");
  assert.equal(r.domain, "academic");
  assert.equal(r.source, "H:/PRISM/resources/MIT COURSES/2.830J");
});

test("parseSpec falls back to slug when courseId missing", () => {
  const body = "| Field | Value |\n|---|---|\n| Kind | `unknown` |";
  const r = parseSpec("orphan-slug", body);
  assert.equal(r.courseId, "orphan-slug");
  assert.equal(r.kind, "unknown");
});

test("parseSpec returns unknown for missing kind+domain", () => {
  const r = parseSpec("x", "no table here");
  assert.equal(r.kind, "unknown");
  assert.equal(r.domain, "unknown");
});

test("generate emits roost + one child per entry", () => {
  const entries = [
    { slug: "a", courseId: "C1", kind: "mit-ocw", domain: "academic", source: "/a" },
    { slug: "b", courseId: "C2", kind: "basic-training", domain: "shop-floor", source: "/b" },
  ];
  const { newNodes, stats } = generate(entries);
  assert.equal(newNodes.length, 3);
  assert.equal(newNodes[0].id, COLLEGE_ROOST_ID);
  assert.equal(newNodes[0].parent, PLANNED_PARENT);
  assert.equal(newNodes[0].layer, ROOST_LAYER);
  assert.equal(stats.roostEmitted, 1);
  assert.equal(stats.childrenEmitted, 2);
  for (const n of newNodes.slice(1)) {
    assert.equal(n.parent, COLLEGE_ROOST_ID);
    assert.equal(n.layer, COURSE_LAYER);
    assert.equal(n.kind, "college-course");
    assert.ok(n.id.startsWith("college.course."));
  }
});

test("generate is empty when all ids already exist", () => {
  const entries = [{ slug: "a", courseId: "C1", kind: "mit-ocw", domain: "academic", source: "/a" }];
  const existing = new Set([COLLEGE_ROOST_ID, "college.course.a"]);
  const { newNodes, stats } = generate(entries, existing);
  assert.equal(newNodes.length, 0);
  assert.equal(stats.roostEmitted, 0);
  assert.equal(stats.childrenEmitted, 0);
  assert.equal(stats.childrenSkipped, 1);
});

test("generate handles empty entries array", () => {
  const { newNodes, stats } = generate([]);
  assert.equal(newNodes.length, 1);
  assert.equal(stats.total, 0);
  assert.equal(stats.childrenEmitted, 0);
});

test("generate caps label at MAX_LABEL", () => {
  const longId = "X".repeat(200);
  const entries = [{ slug: "x", courseId: longId, kind: "mit-ocw", domain: "academic", source: "/x" }];
  const { newNodes } = generate(entries);
  const child = newNodes.find((n) => n.kind === "college-course");
  assert.ok(child.label.length <= MAX_LABEL);
});

test("generate is deterministic — same input same output", () => {
  const entries = [{ slug: "a", courseId: "C1", kind: "mit-ocw", domain: "academic", source: "/a" }];
  const r1 = generate(entries);
  const r2 = generate(entries);
  assert.deepEqual(r1.newNodes, r2.newNodes);
});

test("generate roost info names the count", () => {
  const entries = Array.from({ length: 42 }, (_, i) => ({ slug: "s" + i, courseId: "C" + i, kind: "mit-ocw", domain: "academic", source: "/s" + i }));
  const { newNodes } = generate(entries);
  const roost = newNodes.find((n) => n.id === COLLEGE_ROOST_ID);
  assert.ok(roost.info.includes("42"));
});

test("readSpecsDir returns [] when dir missing", () => {
  const r = readSpecsDir(path.join(os.tmpdir(), "non-existent-" + Date.now()));
  assert.deepEqual(r, []);
});

test("readSpecsDir parses written files in sorted order", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ccfs-test-"));
  try {
    fs.writeFileSync(path.join(tmp, "AUTOGEN-SPEC-b.md"), SAMPLE);
    fs.writeFileSync(path.join(tmp, "AUTOGEN-SPEC-a.md"), SAMPLE.replaceAll("2.830J", "A-ONE"));
    fs.writeFileSync(path.join(tmp, "NOT-A-SPEC.md"), "should be skipped");
    const r = readSpecsDir(tmp);
    assert.equal(r.length, 2);
    assert.equal(r[0].slug, "a");
    assert.equal(r[1].slug, "b");
    assert.equal(r[0].courseId, "A-ONE");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("SCHEMA_VERSION is semver-like", () => {
  assert.match(SCHEMA_VERSION, /^\d+\.\d+\.\d+$/);
});
