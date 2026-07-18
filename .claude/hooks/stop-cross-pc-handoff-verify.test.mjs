// Tests for stop-cross-pc-handoff-verify (U-CROSS-PC-VERIFY-WIRE, slot:bravo 2026-06-14).
// scanHandoffs (pure, reuses the canonical cross-pc helpers) + newestHandoffs (IO). R9 intent-tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { scanHandoffs, newestHandoffs } from "./stop-cross-pc-handoff-verify.mjs";

test("R9: a C: path in a handoff -> critical finding (breaks after SSD swap)", () => {
  const agg = scanHandoffs([{ name: "HANDOFF-x.md", text: "resume at C:/Users/wompu/work/foo.md please" }]);
  assert.equal(agg.critical.length, 1);
  assert.equal(agg.critical[0].kind, "c");
  assert.match(agg.critical[0].path, /^[cC]:/);
});

test("only H: paths -> no critical (portable, clean)", () => {
  const agg = scanHandoffs([{ name: "HANDOFF-x.md", text: "resume at H:/prism/state/shared/foo.md" }]);
  assert.equal(agg.critical.length, 0);
});

test("$USERPROFILE path -> warning, not critical", () => {
  const agg = scanHandoffs([{ name: "HANDOFF-x.md", text: "see %USERPROFILE%\\.claude\\settings.json" }]);
  assert.equal(agg.critical.length, 0);
  assert.ok(agg.warning.length >= 1);
});

test("empty / no refs / null-text -> no findings", () => {
  assert.deepEqual(scanHandoffs([]).critical, []);
  assert.deepEqual(scanHandoffs([{ name: "a.md", text: "plain text no paths" }]).critical, []);
  assert.deepEqual(scanHandoffs([{ name: "b.md", text: null }, null]).critical, []);
});

test("multiple handoffs aggregate -- 2 C: refs across files -> 2 critical", () => {
  const agg = scanHandoffs([
    { name: "HANDOFF-a.md", text: "C:/one/a.md" },
    { name: "HANDOFF-b.md", text: "C:/two/b.md" },
  ]);
  assert.equal(agg.critical.length, 2);
});

test("newestHandoffs reads newest N sorted by mtime", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "xpcv-"));
  const mk = (name, ageMs, body) => {
    const p = path.join(dir, name);
    fs.writeFileSync(p, body);
    const mt = new Date(Date.now() - ageMs);
    fs.utimesSync(p, mt, mt);
  };
  mk("HANDOFF-old.md", 60000, "old H:/x");
  mk("HANDOFF-new.md", 1000, "new H:/y");
  mk("other.md", 0, "ignored C:/z"); // not a HANDOFF-*.md
  const recs = newestHandoffs(dir, 5);
  assert.equal(recs.length, 2); // only HANDOFF-*.md
  assert.equal(recs[0].name, "HANDOFF-new.md"); // newest first
  assert.equal(recs[1].name, "HANDOFF-old.md");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("newestHandoffs caps at N", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "xpcv-"));
  for (let i = 0; i < 8; i++) fs.writeFileSync(path.join(dir, `HANDOFF-${i}.md`), `H:/x${i}`);
  assert.equal(newestHandoffs(dir, 3).length, 3);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("newestHandoffs fail-soft: missing dir -> []", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "xpcv-"));
  assert.deepEqual(newestHandoffs(path.join(dir, "nope"), 5), []);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("end-to-end: newestHandoffs feeds scanHandoffs -> a C: handoff is flagged critical", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "xpcv-"));
  fs.writeFileSync(path.join(dir, "HANDOFF-bad.md"), "resume C:/Users/wompu/x.md");
  fs.writeFileSync(path.join(dir, "HANDOFF-ok.md"), "resume H:/prism/x.md");
  const agg = scanHandoffs(newestHandoffs(dir, 5));
  assert.equal(agg.critical.length, 1);
  assert.equal(agg.critical[0].file, "HANDOFF-bad.md");
  fs.rmSync(dir, { recursive: true, force: true });
});
