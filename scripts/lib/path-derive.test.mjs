// scripts/lib/path-derive.test.mjs — WORKING-PATH-CAPTURE-MS0 / U-WPC-DERIVE-ALLDOMAINS (alpha, 2026-05-31).
// Hermetic: synthetic outcome-bus rows → derive → (apply into a tmp path-ledger). Proves the
// "wire to all domains via the shared bus" harvester segments by commit-boundary correctly.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { isCommitRow, goalTypeFromCommit, deriveWorkingPaths, applyDerived } from "./path-derive.mjs";
import { readWorkingPaths } from "./path-ledger.mjs";

function freshRoots() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "path-derive-test-"));
  return { activeDir: path.join(dir, "active"), workingPaths: path.join(dir, "wp.jsonl"), outcomeBus: path.join(dir, "ob.jsonl") };
}
const row = (sid, slot, domain, tool, success, hint, ts) => ({ ts, source: "outcome-bus-auto-tap", session_id: sid, slot, domain, tool, success, hint });

test("isCommitRow detects a successful git-commit Bash row only", () => {
  assert.equal(isCommitRow(row("s", "delta", "cad", "Bash", true, "cmd:rtk git commit -m foo")), true);
  assert.equal(isCommitRow(row("s", "delta", "cad", "Bash", false, "cmd:git commit -m foo")), false, "failed commit not a goal boundary");
  assert.equal(isCommitRow(row("s", "delta", "cad", "Edit", true, "path:x")), false, "non-Bash");
  assert.equal(isCommitRow(row("s", "delta", "cad", "Bash", true, "cmd:rtk vitest run")), false, "non-commit Bash");
  assert.equal(isCommitRow(null), false);
});

test("goalTypeFromCommit prefers U-ID, then non-boilerplate SCOPE, else 'commit'", () => {
  assert.equal(goalTypeFromCommit("cmd:git commit -m [MAIN] [OBSIDIAN-BRAIN]/U-WPC-LEDGER: x"), "U-WPC-LEDGER");
  assert.equal(goalTypeFromCommit("cmd:git commit -m [CAMK-MS2] something"), "CAMK-MS2", "non-boilerplate scope when no U-ID");
  assert.equal(goalTypeFromCommit("cmd:git commit -m [MAIN] no unit"), "commit", "all-boilerplate scopes → commit");
  assert.equal(goalTypeFromCommit(""), "commit");
});

test("goalTypeFromCommit P1: detects a TRUNCATED U-ID (clipped at the 200-char hint boundary)", () => {
  // real shape: long boilerplate prefix pushes the U-ID to the tail, auto-tap clips it mid-id (no trailing ':' )
  assert.equal(goalTypeFromCommit("cmd:cd H:/prism && rtk git commit -m [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-BRAIN]/U-WPC-LEDG"), "commit-truncated");
  // a COMPLETE U-ID (has the trailing ':') is NOT flagged truncated even with the long prefix
  assert.equal(goalTypeFromCommit("cmd:rtk git commit -m [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-BRAIN]/U-WPC-LEDGER: title"), "U-WPC-LEDGER");
});

test("goalTypeFromCommit P1: a composite 'add …U-OLD && commit …U-NEW' binds the COMMIT's id", () => {
  assert.equal(goalTypeFromCommit("cmd:git add file-U-OLD && rtk git commit -m [X]/U-NEW: t"), "U-NEW");
});

test("deriveWorkingPaths segments a session by commit boundaries", () => {
  const rows = [
    row("s1", "delta", "cad", "Edit", true, "path:a.step", "2026-05-31T00:00:01Z"),
    row("s1", "delta", "cad", "Bash", true, "cmd:rtk vitest run", "2026-05-31T00:00:02Z"),
    row("s1", "delta", "cad", "Bash", true, "cmd:git commit -m [MAIN]/U-CAD-1: feat", "2026-05-31T00:00:03Z"),
    row("s1", "delta", "cad", "Edit", true, "path:b.step", "2026-05-31T00:00:04Z"),
    row("s1", "delta", "cad", "Bash", true, "cmd:git commit -m [MAIN]/U-CAD-2: feat2", "2026-05-31T00:00:05Z"),
  ];
  const got = deriveWorkingPaths(rows);
  assert.equal(got.length, 2, "two commits → two working-paths");
  assert.equal(got[0].goalType, "U-CAD-1");
  assert.equal(got[0].domain, "cad");
  assert.equal(got[0].steps.length, 2, "2 actions before the first commit");
  assert.equal(got[1].goalType, "U-CAD-2");
  assert.equal(got[1].steps.length, 1, "1 action between commits");
  assert.equal(got[0].outcome.success, true);
});

test("deriveWorkingPaths discards trailing un-committed actions (no goal boundary)", () => {
  const rows = [
    row("s2", "kilo", "cam", "Edit", true, "path:x", "2026-05-31T00:00:01Z"),
    row("s2", "kilo", "cam", "Bash", true, "cmd:git commit -m [MAIN]/U-CAM-1: x", "2026-05-31T00:00:02Z"),
    row("s2", "kilo", "cam", "Edit", true, "path:y", "2026-05-31T00:00:03Z"), // trailing, no commit after
  ];
  const got = deriveWorkingPaths(rows);
  assert.equal(got.length, 1, "only the committed segment");
  assert.equal(got[0].goalType, "U-CAM-1");
});

test("deriveWorkingPaths groups by session + is fail-soft on garbage rows", () => {
  const rows = [
    null, { junk: true }, "notarow",
    row("sA", "delta", "cad", "Edit", true, "path:a", "2026-05-31T00:00:01Z"),
    row("sA", "delta", "cad", "Bash", true, "cmd:git commit -m [X]/U-A: a", "2026-05-31T00:00:02Z"),
    row("sB", "kilo", "cam", "Edit", true, "path:b", "2026-05-31T00:00:01Z"),
    row("sB", "kilo", "cam", "Bash", true, "cmd:git commit -m [Y]/U-B: b", "2026-05-31T00:00:02Z"),
  ];
  const got = deriveWorkingPaths(rows);
  assert.equal(got.length, 2, "garbage filtered; 2 sessions → 2 paths");
  assert.deepEqual(got.map((g) => g.goalType).sort(), ["U-A", "U-B"]);
});

test("deriveWorkingPaths empty/non-array → []", () => {
  assert.deepEqual(deriveWorkingPaths([]), []);
  assert.deepEqual(deriveWorkingPaths(null), []);
  assert.deepEqual(deriveWorkingPaths([row("s", "d", "cad", "Edit", true, "path:x", "t")]), [], "no commit → no goal → []");
});

test("E2E: derive → applyDerived captures into the path-ledger; re-apply dedups", () => {
  const roots = freshRoots();
  const rows = [
    row("sess123", "delta", "cad", "Edit", true, "path:trilobe.step", "2026-05-31T00:00:01Z"),
    row("sess123", "delta", "cad", "Bash", true, "cmd:rtk vitest run", "2026-05-31T00:00:02Z"),
    row("sess123", "delta", "cad", "Bash", true, "cmd:git commit -m [MAIN]/U-CAD-TRILOBE: gen", "2026-05-31T00:00:03Z"),
  ];
  const cands = deriveWorkingPaths(rows);
  assert.equal(cands.length, 1);
  const r1 = applyDerived(cands, { roots });
  assert.equal(r1.captured, 1);
  assert.equal(r1.deduped, 0);
  const wps = readWorkingPaths({ roots });
  assert.equal(wps.length, 1);
  assert.equal(wps[0].domain, "cad");
  assert.equal(wps[0].goalType, "U-CAD-TRILOBE");
  assert.equal(wps[0].score, 0.5, "derived paths start at 0.5 (hypothesis)");
  assert.equal(wps[0].provenance, "derived", "derived paths are marked, NOT conflated with explicit proven paths");
  // re-apply same candidates → dedup, not duplicate
  const r2 = applyDerived(cands, { roots });
  assert.equal(r2.deduped, 1);
  assert.equal(readWorkingPaths({ roots }).length, 1, "no duplicate row");
});

test("applyDerived SKIPS a truncated-goal candidate (no mangled key persisted) + counts it", () => {
  const roots = freshRoots();
  const cands = [
    { domain: "cad", goalType: "commit-truncated", goal: "clipped", steps: [{ seq: 0, action: "Edit:ok" }], outcome: { success: true }, sourceSession: "s" },
    { domain: "cad", goalType: "U-REAL", goal: "ok", steps: [{ seq: 0, action: "Edit:ok" }], outcome: { success: true }, sourceSession: "s" },
  ];
  const r = applyDerived(cands, { roots });
  assert.equal(r.truncated, 1, "truncated candidate counted, not silently dropped");
  assert.equal(r.captured, 1, "only the real-keyed candidate captured");
  const wps = readWorkingPaths({ roots });
  assert.equal(wps.length, 1);
  assert.equal(wps[0].goalType, "U-REAL", "no commit-truncated key in the ledger");
});
