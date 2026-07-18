// Tests for find-freshest-unwired-audit.mjs -- resolves the FRESHEST dated UNWIRED-ENGINE-AUDIT
// (fixes consumers that hardcoded the stale 2026-05-07 name). Real temp dirs; ISO-date filenames
// so lexicographic sort == chronological. node:test.
import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { findFreshestUnwiredAuditPath, readFreshestUnwiredAudit } from "./find-freshest-unwired-audit.mjs";

function mkDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "freshest-audit-"));
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
  return dir;
}

test("findFreshestUnwiredAuditPath: returns the newest dated audit (lexicographic == chronological)", () => {
  const dir = mkDir({
    "UNWIRED-ENGINE-AUDIT-2026-05-07.json": "{}",
    "UNWIRED-ENGINE-AUDIT-2026-06-18.json": "{}",
    "UNWIRED-ENGINE-AUDIT-2026-06-15.json": "{}",
  });
  assert.equal(findFreshestUnwiredAuditPath({ sharedDir: dir }), path.join(dir, "UNWIRED-ENGINE-AUDIT-2026-06-18.json"));
  fs.rmSync(dir, { recursive: true, force: true });
});

test("findFreshestUnwiredAuditPath: ignores non-dated / non-matching files", () => {
  const dir = mkDir({
    "UNWIRED-ENGINE-AUDIT-2026-06-01.json": "{}",
    "UNWIRED-ENGINE-AUDIT.json": "{}",                  // no date -> excluded (not a calibrated output)
    "UNWIRED-ENGINE-AUDIT-2026-06-18.txt": "x",          // wrong ext
    "OTHER-2026-12-31.json": "{}",                       // wrong prefix
  });
  assert.equal(findFreshestUnwiredAuditPath({ sharedDir: dir }), path.join(dir, "UNWIRED-ENGINE-AUDIT-2026-06-01.json"));
  fs.rmSync(dir, { recursive: true, force: true });
});

test("findFreshestUnwiredAuditPath: no dated audit -> null; unreadable dir -> null", () => {
  const dir = mkDir({ "UNWIRED-ENGINE-AUDIT.json": "{}", "readme.md": "x" });
  assert.equal(findFreshestUnwiredAuditPath({ sharedDir: dir }), null);
  assert.equal(findFreshestUnwiredAuditPath({ sharedDir: path.join(dir, "does-not-exist") }), null);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("readFreshestUnwiredAudit: parses the freshest audit -> {path, json}", () => {
  const dir = mkDir({
    "UNWIRED-ENGINE-AUDIT-2026-05-07.json": JSON.stringify({ counts: { UNWIRED: 99 } }),
    "UNWIRED-ENGINE-AUDIT-2026-06-18.json": JSON.stringify({ counts: { UNWIRED: 7 } }),
  });
  const r = readFreshestUnwiredAudit({ sharedDir: dir });
  assert.equal(r.path, path.join(dir, "UNWIRED-ENGINE-AUDIT-2026-06-18.json"));
  assert.equal(r.json.counts.UNWIRED, 7); // the FRESH count, not the stale 99
  fs.rmSync(dir, { recursive: true, force: true });
});

test("readFreshestUnwiredAudit: corrupt JSON -> {path set, json null} (fail-soft); none -> both null", () => {
  const dir = mkDir({ "UNWIRED-ENGINE-AUDIT-2026-06-18.json": "{not json" });
  const r = readFreshestUnwiredAudit({ sharedDir: dir });
  assert.equal(r.path, path.join(dir, "UNWIRED-ENGINE-AUDIT-2026-06-18.json"));
  assert.equal(r.json, null);
  const empty = readFreshestUnwiredAudit({ sharedDir: path.join(dir, "nope") });
  assert.deepEqual(empty, { path: null, json: null });
  fs.rmSync(dir, { recursive: true, force: true });
});
