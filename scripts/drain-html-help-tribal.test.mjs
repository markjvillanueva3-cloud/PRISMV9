#!/usr/bin/env node
/**
 * drain-html-help-tribal.test.mjs -- hermetic unit tests for the CAD/CAM software
 * help-HTML tribal drain's PURE dedup + read helpers. No network, no real corpus
 * walk -- every test feeds synthetic paths/HTML so it runs in CI in <1s.
 *
 * Run: node scripts/drain-html-help-tribal.test.mjs
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  isForeignLanguagePath, versionKeyOf, compareVersionTuples, topicIdentity,
  dedupHelpDocs, pruneStaleVersionDirs, pickNext, readHelpDocRow,
} from "./drain-html-help-tribal.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

test("isForeignLanguagePath flags non-English locale segments", () => {
  assert.equal(isForeignLanguagePath("doc/33.0/HTML5/Center/de-DE/x.html"), true);
  assert.equal(isForeignLanguagePath("LicenseManager/33.0/ja-JP/y.htm"), true);
  assert.equal(isForeignLanguagePath("a/zh-CN/b/c.html"), true);
  assert.equal(isForeignLanguagePath("a/ko/b.html"), true);
  // English / no-locale paths are NOT foreign
  assert.equal(isForeignLanguagePath("doc/33.0/HTML5/Center/en/x.html"), false);
  assert.equal(isForeignLanguagePath("doc/33.0/en-US/x.html"), false);
  assert.equal(isForeignLanguagePath("help/WebHelp/Backplotting_toolpaths.htm"), false);
});

test("isForeignLanguagePath does not false-match content words", () => {
  // 'in', 'is', etc are too short or not locale-shaped; ensure real topic words pass
  assert.equal(isForeignLanguagePath("Posts/Programming/index.htm"), false);
  assert.equal(isForeignLanguagePath("in-control compensation/lead in angles.html"), false);
});

test("versionKeyOf extracts the max numeric version tuple", () => {
  assert.deepEqual(versionKeyOf("doc/33.0/x.html"), [33, 0]);
  assert.deepEqual(versionKeyOf("doc/31.0/x.html"), [31, 0]);
  assert.deepEqual(versionKeyOf("MASTERCAM/mcamX8/help/x.htm"), [8]);
  assert.equal(versionKeyOf("help/WebHelp/x.htm"), null); // no version segment
  // when multiple version segs, the MAX is returned
  assert.deepEqual(versionKeyOf("a/2024/b/2.1/c.html"), [2024]);
});

test("compareVersionTuples orders versions newest-greater", () => {
  assert.ok(compareVersionTuples([33, 0], [31, 0]) > 0);
  assert.ok(compareVersionTuples([2027], [2026]) > 0);
  assert.equal(compareVersionTuples([8], [8]), 0);
  assert.ok(compareVersionTuples([2, 1], [2, 0]) > 0);
});

test("topicIdentity strips version + locale segments", () => {
  assert.equal(topicIdentity("doc/33.0/HTML5/Center/en/story.html"), "doc/html5/center/story.html");
  assert.equal(topicIdentity("doc/31.0/HTML5/Center/en/story.html"), "doc/html5/center/story.html");
  // two version+locale variants collapse to the SAME identity
  assert.equal(
    topicIdentity("hyperMILL/33.0/de-DE/cut.html"),
    topicIdentity("hyperMILL/31.0/en/cut.html"),
  );
});

test("pruneStaleVersionDirs keeps ONLY the newest sibling version tree", () => {
  const docs = [
    { relPath: "doc/31.0/a/x.html" },
    { relPath: "doc/33.0/a/x.html" },
    { relPath: "hyperMILL/31.0/b/y.html" },
    { relPath: "hyperMILL/33.0/b/y.html" },
    { relPath: "help/WebHelp/z.htm" }, // no version dir -> always kept
  ];
  const kept = pruneStaleVersionDirs(docs).map((d) => d.relPath).sort();
  assert.deepEqual(kept, ["doc/33.0/a/x.html", "help/WebHelp/z.htm", "hyperMILL/33.0/b/y.html"]);
});

test("pruneStaleVersionDirs leaves single-version corpora untouched (Mastercam)", () => {
  const docs = [
    { relPath: "MASTERCAM/mcamX8/help/a.htm" },
    { relPath: "MASTERCAM/mcamX8/help/b.htm" },
  ];
  assert.equal(pruneStaleVersionDirs(docs).length, 2);
});

test("dedupHelpDocs: English-only + newest-version-per-topic", () => {
  const docs = [
    { relPath: "doc/31.0/en/cut.html", software: "hypermill" },
    { relPath: "doc/33.0/en/cut.html", software: "hypermill" }, // newest English -> kept
    { relPath: "doc/33.0/de-DE/cut.html", software: "hypermill" }, // foreign -> dropped
  ];
  const kept = dedupHelpDocs(docs);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].relPath, "doc/33.0/en/cut.html");
});

test("dedupHelpDocs: versioned doc wins over no-version doc REGARDLESS of order (R9 anti-regression)", () => {
  // Pins the correct direction: a concrete version (e.g. 33.0) must beat a
  // no-version sibling of the SAME topic in BOTH orderings. (Disproves a review
  // claim that a no-version doc seen first blocks the newer versioned doc.)
  for (const order of [
    ["guide/cut.html", "guide/33.0/cut.html"],
    ["guide/33.0/cut.html", "guide/cut.html"],
  ]) {
    const kept = dedupHelpDocs(order.map((relPath) => ({ relPath, software: "x" })));
    assert.equal(kept.length, 1, `order ${order}`);
    assert.equal(kept[0].relPath, "guide/33.0/cut.html", `order ${order} -> ${kept[0].relPath}`);
  }
});

test("readHelpDocRow is fail-soft: a strip throw yields {ok:false}, never aborts the batch", () => {
  // Even a pathological HTML payload must return a result object, not throw --
  // one bad file in a batch must never halt the whole drain loop.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "htmlhelp-soft-"));
  const f = path.join(dir, "weird.htm");
  // deeply nested + unterminated tags; strip must tolerate or fail-soft
  fs.writeFileSync(f, "<html><body>" + "<div>".repeat(5000) + "tiny");
  const r = readHelpDocRow(f, "weird.htm");
  assert.equal(typeof r, "object");
  assert.equal(r.ok, false); // thin OR strip-error -- either way NOT a throw
  assert.ok(["thin", undefined].includes(r.reason) || String(r.reason).startsWith("strip-error"));
  fs.rmSync(dir, { recursive: true, force: true });
});

test("pickNext skips already-attempted and respects maxDocs", () => {
  const cands = [{ abs: "a" }, { abs: "b" }, { abs: "c" }, { abs: "d" }];
  const attempted = { b: { ok: true } };
  const picked = pickNext(cands, attempted, 2).map((c) => c.abs);
  assert.deepEqual(picked, ["a", "c"]);
});

test("readHelpDocRow strips real HTML to text and gates on richness", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "htmlhelp-"));
  // a rich help doc (>1200 stripped chars)
  const rich = path.join(dir, "rich.htm");
  const body = "Mastercam Simulator backplot toolpaths workflow step. ".repeat(40);
  fs.writeFileSync(rich, `<html><head><style>x{}</style></head><body><h1>Backplot</h1><p>${body}</p></body></html>`);
  const r1 = readHelpDocRow(rich, "rich.htm");
  assert.equal(r1.ok, true);
  assert.ok(r1.chars >= 1200);
  assert.ok(!/<[a-z]/i.test(r1.text), "tags must be stripped");
  assert.ok(!/x\{\}/.test(r1.text), "style block must be removed");
  // a thin doc (UI stub) is rejected
  const thin = path.join(dir, "thin.htm");
  fs.writeFileSync(thin, "<html><body><p>Work in progress.</p></body></html>");
  const r2 = readHelpDocRow(thin, "thin.htm");
  assert.equal(r2.ok, false);
  assert.equal(r2.reason, "thin");
  fs.rmSync(dir, { recursive: true, force: true });
});
