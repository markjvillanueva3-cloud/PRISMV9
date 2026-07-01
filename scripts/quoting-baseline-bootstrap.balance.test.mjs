/**
 * quoting-baseline-bootstrap.balance — iter39 unit test for --balance-by-class.
 *
 * Run: node --test scripts/quoting-baseline-bootstrap.balance.test.mjs
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-BOOTSTRAP-BALANCED-SAMPLING (charlie /goal-yolo iter39)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { extractTopLevelClass, balanceByClass } from "./quoting-baseline-bootstrap.mjs";

// ---------- extractTopLevelClass ----------

test("extractTopLevelClass: pulls JM DIE direct child", () => {
  assert.equal(extractTopLevelClass("H:/PRISM/JM DIE/WIRE EDM/ALCOA/p1.MIN"), "WIRE EDM");
  assert.equal(extractTopLevelClass("H:/PRISM/JM DIE/CNC LATHE/ITW/p2.NC"), "CNC LATHE");
  assert.equal(extractTopLevelClass("H:/PRISM/JM DIE/ATF/p3.MIN"), "ATF");
});

test("extractTopLevelClass: backslash Windows paths", () => {
  assert.equal(extractTopLevelClass("H:\\PRISM\\JM DIE\\HAAS-HURCO\\AGRATI\\p.MIN"), "HAAS-HURCO");
});

test("extractTopLevelClass: case-insensitive JM DIE match", () => {
  assert.equal(extractTopLevelClass("H:/PRISM/jm die/OKUMA/foo.MIN"), "OKUMA");
});

test("extractTopLevelClass: returns 'unknown' for paths without JM DIE", () => {
  assert.equal(extractTopLevelClass("H:/random/path/foo.MIN"), "unknown");
});

test("extractTopLevelClass: non-string input", () => {
  assert.equal(extractTopLevelClass(null), "unknown");
  assert.equal(extractTopLevelClass(undefined), "unknown");
  assert.equal(extractTopLevelClass(123), "unknown");
});

// ---------- balanceByClass ----------

test("balanceByClass: caps each class to perClassCap", () => {
  const rows = [
    { abs_path: "H:/PRISM/JM DIE/HAAS-HURCO/a/1.MIN" },
    { abs_path: "H:/PRISM/JM DIE/HAAS-HURCO/a/2.MIN" },
    { abs_path: "H:/PRISM/JM DIE/HAAS-HURCO/a/3.MIN" },
    { abs_path: "H:/PRISM/JM DIE/HAAS-HURCO/a/4.MIN" },
    { abs_path: "H:/PRISM/JM DIE/WIRE EDM/b/1.I" },
    { abs_path: "H:/PRISM/JM DIE/WIRE EDM/b/2.I" },
    { abs_path: "H:/PRISM/JM DIE/CNC LATHE/c/1.NC" },
  ];
  const out = balanceByClass(rows, 2);
  // HAAS-HURCO: capped at 2 (was 4)
  // WIRE EDM: kept 2 of 2
  // CNC LATHE: kept 1 of 1
  assert.equal(out.length, 5, "should cap HAAS-HURCO from 4 to 2, total 5");

  const counts = out.reduce((acc, r) => {
    const c = extractTopLevelClass(r.abs_path);
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});
  assert.equal(counts["HAAS-HURCO"], 2);
  assert.equal(counts["WIRE EDM"], 2);
  assert.equal(counts["CNC LATHE"], 1);
});

test("balanceByClass: preserves order within each class (recency)", () => {
  const rows = [
    { abs_path: "H:/PRISM/JM DIE/HAAS-HURCO/a/1.MIN", mtime_iso: "2026-05-26" },
    { abs_path: "H:/PRISM/JM DIE/HAAS-HURCO/a/2.MIN", mtime_iso: "2026-05-25" },
    { abs_path: "H:/PRISM/JM DIE/HAAS-HURCO/a/3.MIN", mtime_iso: "2026-05-24" },
  ];
  const out = balanceByClass(rows, 2);
  assert.equal(out.length, 2);
  assert.equal(out[0].mtime_iso, "2026-05-26", "most recent kept first");
  assert.equal(out[1].mtime_iso, "2026-05-25", "second most recent kept");
});

test("balanceByClass: perClassCap=0 is no-op (returns input)", () => {
  const rows = [{ abs_path: "/foo" }, { abs_path: "/bar" }];
  assert.deepEqual(balanceByClass(rows, 0), rows);
});

test("balanceByClass: empty input returns empty array", () => {
  assert.deepEqual(balanceByClass([], 5), []);
});

test("balanceByClass: non-array input returned as-is (fail-soft)", () => {
  assert.equal(balanceByClass(null, 5), null);
  assert.equal(balanceByClass(undefined, 5), undefined);
});

test("balanceByClass: caps to 1/class when perClassCap=1 — forces one-per-class diversity", () => {
  const rows = [
    { abs_path: "H:/PRISM/JM DIE/MILL/a/1.MIN" },
    { abs_path: "H:/PRISM/JM DIE/MILL/a/2.MIN" },
    { abs_path: "H:/PRISM/JM DIE/LATHE/b/1.NC" },
    { abs_path: "H:/PRISM/JM DIE/LATHE/b/2.NC" },
    { abs_path: "H:/PRISM/JM DIE/WIRE EDM/c/1.I" },
  ];
  const out = balanceByClass(rows, 1);
  assert.equal(out.length, 3, "exactly 1 per class");
  const classes = new Set(out.map((r) => extractTopLevelClass(r.abs_path)));
  assert.equal(classes.size, 3, "3 distinct classes");
});
