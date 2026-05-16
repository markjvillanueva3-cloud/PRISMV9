// scripts/unblock-detect.test.mjs
//
// node:test suite for the peer-commit unblock detector.
// vitest is broken repo-wide on this machine — node:test is the correct harness:
//   node --test scripts/unblock-detect.test.mjs
//
// Coverage: every exported function; the buildUnblockReport focus/fleet E2E;
// the DONE/READY/BLOCKED classification (incl. the safety-critical direction —
// a not-done dependency must never let its dependent read READY); failure modes
// (missing/corrupt/wrong-shape roadmap, git unavailable, milestone not found);
// adversarial inputs (Markdown injection, oversize subject, ReDoS probe, missing/
// non-object milestones, self-dependency cycle, duplicate ids); the parseArgs
// flag-eating guard; and import-safety.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

import {
  isDone,
  buildIndex,
  parseScopes,
  classifyMilestone,
  scanScopedActivity,
  buildUnblockReport,
  gitLogScoped,
  parseArgs,
} from "./unblock-detect.mjs";

const MODULE_URL = new URL("./unblock-detect.mjs", import.meta.url).href;

// ───────────────────────── isDone ─────────────────────────

test("isDone — every terminal status spelling counts as done", () => {
  for (const s of ["complete", "completed", "consolidated", "superseded", "done", "COMPLETE"]) {
    assert.equal(isDone({ id: "x", status: s }), true, `status ${s}`);
  }
});

test("isDone — in-progress / not-started / unknown status are NOT done", () => {
  for (const s of ["in_progress", "not_started", "not-started", "ready", "in_review", "WIP", ""]) {
    assert.equal(isDone({ id: "x", status: s }), false, `status ${s}`);
  }
});

test("isDone — unit-count path: completed >= total → done", () => {
  assert.equal(isDone({ id: "x", status: "in_progress", total_units: 5, completed_units: 5 }), true);
  assert.equal(isDone({ id: "x", status: "in_progress", total_units: 5, completed_units: 6 }), true);
  assert.equal(isDone({ id: "x", status: "in_progress", total_units: 5, completed_units: 4 }), false);
});

test("isDone — total_units 0 / missing / NaN never triggers the unit path", () => {
  assert.equal(isDone({ id: "x", status: "in_progress", total_units: 0, completed_units: 0 }), false);
  assert.equal(isDone({ id: "x", status: "in_progress" }), false);
  assert.equal(isDone({ id: "x", status: "in_progress", total_units: "abc", completed_units: 9 }), false);
});

test("isDone — null / non-object → false (no throw)", () => {
  assert.equal(isDone(null), false);
  assert.equal(isDone(undefined), false);
  assert.equal(isDone("complete"), false);
  assert.equal(isDone(42), false);
});

// ───────────────────────── buildIndex ─────────────────────────

test("buildIndex — builds an id→milestone Map", () => {
  const idx = buildIndex([{ id: "A", status: "complete" }, { id: "B", status: "in_progress" }]);
  assert.equal(idx.size, 2);
  assert.equal(idx.get("A").status, "complete");
});

test("buildIndex — skips non-object / id-less entries; last wins on duplicate id", () => {
  const idx = buildIndex([
    { id: "A", status: "v1" },
    null,
    "string",
    { status: "no-id" },
    { id: "A", status: "v2" },
  ]);
  assert.equal(idx.size, 1);
  assert.equal(idx.get("A").status, "v2"); // last wins
});

test("buildIndex — non-array input → empty Map", () => {
  assert.equal(buildIndex(null).size, 0);
  assert.equal(buildIndex({}).size, 0);
});

// ───────────────────────── parseScopes ─────────────────────────

test("parseScopes — extracts every [TAG] token", () => {
  assert.deepEqual(parseScopes("[MAIN] [SYSTEM-VIZ-BRAIN-MS0]/U-X: title"), [
    "MAIN",
    "SYSTEM-VIZ-BRAIN-MS0",
  ]);
  assert.deepEqual(parseScopes("[MS-PRINT-PROGRAM-LOOP]/U-PPL-C2: t"), ["MS-PRINT-PROGRAM-LOOP"]);
});

test("parseScopes — no brackets / null / non-string → []", () => {
  assert.deepEqual(parseScopes("Merge branch into main"), []);
  assert.deepEqual(parseScopes(null), []);
  assert.deepEqual(parseScopes(42), []);
});

test("parseScopes — is idempotent across calls (g-flag lastIndex is reset)", () => {
  const s = "[A] [B] [C]/U-X: t";
  const first = parseScopes(s);
  const second = parseScopes(s);
  assert.deepEqual(first, ["A", "B", "C"]);
  assert.deepEqual(second, ["A", "B", "C"]); // a leaked lastIndex would shift the 2nd
});

test("parseScopes — ReDoS-safe on a hostile long input", () => {
  const hostile = "[".repeat(60000);
  const t0 = Date.now();
  parseScopes(hostile);
  assert.ok(Date.now() - t0 < 500, "completes well under 500ms");
});

test("parseScopes — a [TAG] past MAX_SUBJECT (1000) is truncated away", () => {
  // input is sliced to MAX_SUBJECT before the regex — a tag beyond the cap is
  // dropped, an early tag survives. (Real [SCOPE] tags sit at the subject start.)
  const r = parseScopes("[EARLY] " + "x".repeat(1100) + " [LATE-TAG]");
  assert.deepEqual(r, ["EARLY"]);
});

// ───────────────────────── classifyMilestone ─────────────────────────

const IDX = buildIndex([
  { id: "DONE-A", status: "complete" },
  { id: "DONE-B", status: "consolidated" },
  { id: "WIP-C", status: "in_progress" },
  { id: "NEW-D", status: "not_started" },
]);

test("classifyMilestone — DONE milestone → state done, deps still listed", () => {
  const c = classifyMilestone({ id: "M", status: "complete", dependencies: ["DONE-A", "x"] }, IDX);
  assert.equal(c.state, "done");
  assert.deepEqual(c.deps, ["DONE-A", "x"]); // deps surfaced even when done
  assert.deepEqual(c.blockedBy, []);
});

test("classifyMilestone — all deps done → READY", () => {
  const c = classifyMilestone({ id: "M", status: "not_started", dependencies: ["DONE-A", "DONE-B"] }, IDX);
  assert.equal(c.state, "ready");
  assert.deepEqual(c.blockedBy, []);
});

test("classifyMilestone — a not-done dep → BLOCKED (the safety-critical direction)", () => {
  const c = classifyMilestone({ id: "M", status: "not_started", dependencies: ["DONE-A", "WIP-C"] }, IDX);
  assert.equal(c.state, "blocked");
  assert.deepEqual(c.blockedBy, ["WIP-C"]);
});

test("classifyMilestone — a dep absent from the index → conservatively BLOCKED + missingDeps", () => {
  const c = classifyMilestone({ id: "M", status: "not_started", dependencies: ["DONE-A", "GHOST"] }, IDX);
  assert.equal(c.state, "blocked");
  assert.deepEqual(c.blockedBy, ["GHOST"]);
  assert.deepEqual(c.missingDeps, ["GHOST"]);
});

test("classifyMilestone — no dependencies / non-array dependencies → READY", () => {
  assert.equal(classifyMilestone({ id: "M", status: "not_started" }, IDX).state, "ready");
  assert.equal(classifyMilestone({ id: "M", status: "not_started", dependencies: "nope" }, IDX).state, "ready");
});

test("classifyMilestone — non-string dep entries are filtered out", () => {
  const c = classifyMilestone({ id: "M", status: "not_started", dependencies: ["DONE-A", null, 7, {}] }, IDX);
  assert.deepEqual(c.deps, ["DONE-A"]);
  assert.equal(c.state, "ready");
});

test("classifyMilestone — self-dependency on a not-done milestone → BLOCKED, no hang", () => {
  // M depends on itself; M is not done → one-level check sees M absent from IDX
  // (it was never added) → missing dep → blocked. Terminates (no recursion).
  const c = classifyMilestone({ id: "M", status: "not_started", dependencies: ["M"] }, IDX);
  assert.equal(c.state, "blocked");
  assert.deepEqual(c.blockedBy, ["M"]);
});

// ───────────────────────── scanScopedActivity ─────────────────────────

test("scanScopedActivity — maps id → most-recent (newest-first first-wins) commit", () => {
  const commits = [
    { sha: "newSHA000001", dateISO: "2026-05-16T03:00:00Z", subject: "[ALPHA]/U-X: newer" },
    { sha: "oldSHA000002", dateISO: "2026-05-16T01:00:00Z", subject: "[ALPHA]/U-Y: older" },
    { sha: "betaSHA00003", dateISO: "2026-05-16T02:00:00Z", subject: "[BETA]/U-Z: b" },
  ];
  const hit = scanScopedActivity(commits, ["ALPHA", "BETA", "GAMMA"]);
  assert.equal(hit.get("ALPHA").sha, "newSHA000001"); // newest wins
  assert.equal(hit.get("BETA").sha, "betaSHA00003");
  assert.equal(hit.get("GAMMA"), null); // no commit
});

test("scanScopedActivity — non-object commits skipped; Set or array ids accepted", () => {
  const hit = scanScopedActivity([null, "str", { subject: "[X]/U-A: t", sha: "s", dateISO: "d" }], new Set(["X"]));
  assert.equal(hit.get("X").sha, "s");
  assert.equal(scanScopedActivity([], []).size, 0);
});

// ───────────────────────── gitLogScoped ─────────────────────────

test("gitLogScoped — non-git directory → {ok:false, commits:[]}", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ubd-nogit-"));
  try {
    const r = gitLogScoped(tmp, 5);
    assert.equal(r.ok, false);
    assert.deepEqual(r.commits, []);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("gitLogScoped — parses sha/dateISO/subject from a hermetic fixture repo", () => {
  // Hermetic throwaway repo so the parser (incl. the documented tab-in-subject
  // contract) is genuinely exercised — not gated behind `if (commits.length)`.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ubd-git-"));
  try {
    const g = (...a) => execFileSync("git", ["-C", tmp, ...a], { encoding: "utf8" });
    g("init", "-q");
    g(
      "-c", "user.email=t@t.t", "-c", "user.name=t", "-c", "commit.gpgsign=false",
      "commit", "--allow-empty", "-q", "-m", "[FIXTURE-MS0]/U-A: subject\twith tab"
    );
    const r = gitLogScoped(tmp, 5);
    assert.equal(r.ok, true);
    assert.equal(r.commits.length, 1);
    assert.match(r.commits[0].sha, /^[0-9a-f]{40}$/);
    assert.match(r.commits[0].dateISO, /^\d{4}-\d{2}-\d{2}T/);
    // the first two tabs delimit; a tab INSIDE the subject is preserved
    assert.equal(r.commits[0].subject, "[FIXTURE-MS0]/U-A: subject\twith tab");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ───────────────────────── parseArgs ─────────────────────────

test("parseArgs — defaults with no args", () => {
  assert.deepEqual(parseArgs([]), {
    milestone: null,
    window: 80,
    json: false,
    out: null,
    frozenTime: null,
  });
});

test("parseArgs — --window clamps to MAX_WINDOW (500) and accepts mid-range", () => {
  assert.equal(parseArgs(["--window", "9999"]).window, 500);
  assert.equal(parseArgs(["--window", "120"]).window, 120);
});

test("parseArgs — --window rejects non-positive / non-numeric (keeps default 80)", () => {
  assert.equal(parseArgs(["--window", "0"]).window, 80);
  assert.equal(parseArgs(["--window", "-5"]).window, 80);
  assert.equal(parseArgs(["--window", "abc"]).window, 80);
});

test("parseArgs — flag-eating guard: a value-flag does NOT swallow the next --flag", () => {
  // `--window --json` must NOT consume `--json` as the window value.
  const a = parseArgs(["--window", "--json"]);
  assert.equal(a.window, 80, "window stays default");
  assert.equal(a.json, true, "--json is still seen as a flag");
  // same for --milestone / --out / --frozen-time
  const b = parseArgs(["--milestone", "--json"]);
  assert.equal(b.milestone, null);
  assert.equal(b.json, true);
});

test("parseArgs — flag/value pairing for --milestone / --out / --frozen-time", () => {
  const a = parseArgs(["--milestone", "X-MS0", "--out", "sub/r.md", "--frozen-time", "2026-01-01T00:00:00Z"]);
  assert.equal(a.milestone, "X-MS0");
  assert.equal(a.out, "sub/r.md");
  assert.equal(a.frozenTime, "2026-01-01T00:00:00Z");
});

test("parseArgs — a trailing valueless flag yields null/default", () => {
  assert.equal(parseArgs(["--milestone"]).milestone, null);
  assert.equal(parseArgs(["--out"]).out, null);
  assert.equal(parseArgs(["--window"]).window, 80);
});

// ───────────────────────── buildUnblockReport — focus mode ─────────────────────────

const FLEET = [
  { id: "DEP-DONE", status: "complete", title: "a finished dependency" },
  { id: "DEP-WIP", status: "in_progress", title: "a dependency still in progress" },
  { id: "M-READY", status: "not_started", dependencies: ["DEP-DONE"], title: "ready milestone" },
  { id: "M-BLOCKED", status: "not_started", dependencies: ["DEP-DONE", "DEP-WIP"], title: "blocked milestone" },
  { id: "M-FREE", status: "not_started", title: "no-deps milestone" },
];

test("buildUnblockReport — focus mode: BLOCKED milestone lists its blockers", () => {
  const r = buildUnblockReport({
    milestones: FLEET,
    focusMilestone: "M-BLOCKED",
    generatedAt: "2026-05-16T12:00:00Z",
  });
  assert.equal(r.json.verdict, "BLOCKED");
  assert.deepEqual(r.json.blockedBy, ["DEP-WIP"]);
  assert.ok(r.markdown.includes("**BLOCKED**"));
  assert.ok(r.markdown.includes("DEP-WIP"));
});

test("buildUnblockReport — focus mode: READY milestone (all deps done)", () => {
  const r = buildUnblockReport({
    milestones: FLEET,
    focusMilestone: "M-READY",
    generatedAt: "2026-05-16T12:00:00Z",
  });
  assert.equal(r.json.verdict, "READY");
  assert.ok(r.markdown.includes("actionable now"));
});

test("buildUnblockReport — focus mode: DONE milestone", () => {
  const r = buildUnblockReport({
    milestones: FLEET,
    focusMilestone: "DEP-DONE",
    generatedAt: "2026-05-16T12:00:00Z",
  });
  assert.equal(r.json.verdict, "DONE");
});

test("buildUnblockReport — focus mode: unknown milestone → UNKNOWN verdict", () => {
  const r = buildUnblockReport({
    milestones: FLEET,
    focusMilestone: "NOT-A-REAL-MS",
    generatedAt: "2026-05-16T12:00:00Z",
  });
  assert.equal(r.json.verdict, "UNKNOWN");
  assert.ok(r.markdown.includes("not found"));
});

test("buildUnblockReport — focus mode: a peer commit on a blocker is surfaced", () => {
  const r = buildUnblockReport({
    milestones: FLEET,
    commits: [{ sha: "wipSHA000001", dateISO: "2026-05-16T11:00:00Z", subject: "[DEP-WIP]/U-Q: progress" }],
    focusMilestone: "M-BLOCKED",
    generatedAt: "2026-05-16T12:00:00Z",
  });
  assert.ok(r.markdown.includes("wipSHA000001"), "the blocker's recent commit is shown");
});

test("buildUnblockReport — focus mode: a peer commit on a now-done dep flags the unblock", () => {
  // M-READY's only dep DEP-DONE got a recent commit → the READY focus report
  // should surface that commit as a likely peer-unblock.
  const r = buildUnblockReport({
    milestones: FLEET,
    commits: [{ sha: "doneSHA00001", dateISO: "2026-05-16T11:00:00Z", subject: "[DEP-DONE]/U-Z: shipped" }],
    focusMilestone: "M-READY",
    generatedAt: "2026-05-16T12:00:00Z",
  });
  assert.equal(r.json.verdict, "READY");
  assert.ok(r.markdown.includes("doneSHA00001"), "the now-done dep's recent commit is shown");
  assert.ok(r.markdown.includes("may have just unblocked you"));
});

// ───────────────────────── buildUnblockReport — fleet mode ─────────────────────────

test("buildUnblockReport — fleet mode: counts ready / blocked / done", () => {
  const r = buildUnblockReport({ milestones: FLEET, generatedAt: "2026-05-16T12:00:00Z" });
  assert.equal(r.json.mode, "fleet");
  // M-READY + M-FREE are ready; M-BLOCKED is blocked; DEP-DONE is done; DEP-WIP is...
  // in_progress with no deps → ready (not blocked, not done).
  assert.equal(r.json.counts.done, 1); // DEP-DONE
  assert.equal(r.json.counts.blocked, 1); // M-BLOCKED
  assert.equal(r.json.counts.ready, 3); // M-READY, M-FREE, DEP-WIP
  assert.ok(r.markdown.includes("| Milestone | Status | Deps |"));
});

test("buildUnblockReport — fleet mode: newly-unblocked flag set by a dep commit", () => {
  const r = buildUnblockReport({
    milestones: FLEET,
    commits: [{ sha: "depSHA000001", dateISO: "2026-05-16T11:00:00Z", subject: "[DEP-DONE]/U-Z: finished" }],
    window: 80,
    generatedAt: "2026-05-16T12:00:00Z",
  });
  // M-READY depends on DEP-DONE which had a recent commit → newly unblocked
  const mReady = r.json.ready.find((x) => x.id === "M-READY");
  assert.ok(mReady, "M-READY is in the ready list");
  assert.equal(mReady.newlyUnblocked, true);
  assert.ok(r.json.counts.newlyUnblocked >= 1);
});

test("buildUnblockReport — fleet mode: duplicate milestone id produces ONE row", () => {
  const dup = [
    { id: "DUP", status: "not_started", dependencies: [], title: "first" },
    { id: "DUP", status: "not_started", dependencies: [], title: "second" },
  ];
  const r = buildUnblockReport({ milestones: dup, generatedAt: "2026-05-16T12:00:00Z" });
  assert.equal(r.json.ready.length, 1, "deduped by id");
});

test("buildUnblockReport — fleet mode: newly-unblocked rows sort ahead of the rest", () => {
  // M-READY (dep DEP-DONE has a recent commit) is newly-unblocked; M-FREE and
  // DEP-WIP are not → M-READY must be the FIRST ready row.
  const r = buildUnblockReport({
    milestones: FLEET,
    commits: [{ sha: "depSHA000001", dateISO: "2026-05-16T11:00:00Z", subject: "[DEP-DONE]/U-Z: done" }],
    generatedAt: "2026-05-16T12:00:00Z",
  });
  assert.equal(r.json.ready[0].id, "M-READY");
  assert.equal(r.json.ready[0].newlyUnblocked, true);
  assert.equal(r.json.ready.slice(1).some((x) => x.newlyUnblocked), false, "no newly row past index 0");
});

test("buildUnblockReport — fleet mode: > MAX_ROWS READY milestones truncate, surfaced not silent", () => {
  // 205 dep-free not-started milestones → all READY, exceeding the 200-row cap.
  const many = [];
  for (let i = 0; i < 205; i++) {
    many.push({
      id: `M-${String(i).padStart(3, "0")}`,
      status: "not_started",
      dependencies: [],
      title: `m${i}`,
    });
  }
  const r = buildUnblockReport({ milestones: many, generatedAt: "2026-05-16T12:00:00Z" });
  assert.equal(r.json.truncated, true);
  assert.equal(r.json.ready.length, 200, "ready[] capped at MAX_ROWS");
  assert.equal(r.json.counts.ready, 205, "counts.ready is the TRUE total");
  assert.ok(r.markdown.includes("5 more READY milestone(s) not shown"), "truncation surfaced");
});

test("buildUnblockReport — fleet mode: skips non-object / id-less milestones (no throw)", () => {
  const r = buildUnblockReport({
    milestones: [null, "str", { status: "no-id" }, { id: "OK", status: "not_started" }],
    generatedAt: "2026-05-16T12:00:00Z",
  });
  assert.equal(r.json.counts.ready, 1); // only OK
});

test("buildUnblockReport — gitOk:false emits the git-unavailable advisory", () => {
  const r = buildUnblockReport({
    milestones: FLEET,
    gitOk: false,
    generatedAt: "2026-05-16T12:00:00Z",
  });
  assert.ok(r.markdown.includes("`git log` was unavailable"));
  // dependency classification is unaffected — counts still computed
  assert.equal(r.json.counts.blocked, 1);
});

test("buildUnblockReport — empty milestones → fleet report with zero counts", () => {
  const r = buildUnblockReport({ milestones: [], generatedAt: "2026-05-16T12:00:00Z" });
  assert.equal(r.json.counts.ready, 0);
  assert.equal(r.json.counts.blocked, 0);
  assert.ok(r.markdown.includes("No READY milestones"));
});

test("buildUnblockReport — adversarial milestone title cannot break the fleet table", () => {
  const r = buildUnblockReport({
    milestones: [{ id: "EVIL", status: "not_started", dependencies: [], title: "pwn | row || cell\tTAB" }],
    generatedAt: "2026-05-16T12:00:00Z",
  });
  const rows = r.markdown.split("\n").filter((l) => l.startsWith("| EVIL"));
  assert.equal(rows.length, 1, "exactly one table row — no breakout");
  assert.ok(!rows[0].includes("\t"), "tab control char stripped");
  assert.ok(rows[0].includes("\\|"), "pipe in the title is escaped");
});

test("buildUnblockReport — generatedAt lands verbatim in the H1 (determinism)", () => {
  const r = buildUnblockReport({ milestones: FLEET, generatedAt: "2026-01-01T00:00:00Z" });
  assert.ok(r.markdown.startsWith("# Unblock Report — 2026-01-01T00:00:00Z"));
  assert.equal(r.json.generatedAt, "2026-01-01T00:00:00Z");
});

test("buildUnblockReport — JSON payload shape is stable and round-trips loss-free", () => {
  const r = buildUnblockReport({ milestones: FLEET, generatedAt: "2026-05-16T12:00:00Z" });
  const j = r.json;
  assert.equal(j.schemaVersion, "1.0.0");
  assert.equal(j.mode, "fleet");
  assert.deepEqual(Object.keys(j.counts).sort(), ["blocked", "done", "newlyUnblocked", "ready"]);
  assert.equal(typeof j.truncated, "boolean");
  assert.deepEqual(JSON.parse(JSON.stringify(j)), j);
});

// ───────────────────────── import-safety ─────────────────────────

test("import-safety — importing the module runs no main() and writes no file", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ubd-import-"));
  try {
    const out = execFileSync(
      process.execPath,
      [
        "-e",
        `import(${JSON.stringify(MODULE_URL)}).then(m=>{process.stdout.write(String(typeof m.buildUnblockReport));})`,
      ],
      { encoding: "utf8", env: { ...process.env, PRISM_ROOT: tmp }, timeout: 20000 }
    );
    assert.equal(out, "function");
    assert.equal(fs.existsSync(path.join(tmp, "state/shared/UNBLOCK-REPORT.md")), false);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("module is the expected file", () => {
  assert.ok(fileURLToPath(MODULE_URL).endsWith(path.join("scripts", "unblock-detect.mjs")));
});
