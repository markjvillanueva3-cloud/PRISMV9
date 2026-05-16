// scripts/goal-ship-report.test.mjs
//
// node:test suite for the /goal auto-evidence ship-report generator.
// vitest is broken repo-wide on this machine — node:test is the correct harness:
//   node --test scripts/goal-ship-report.test.mjs
//
// Coverage: every exported function (incl. parseArgs); the generateReport join
// E2E; the three-valued verdict (READY / BLOCKED / UNCERTAIN); the rendered
// markdown structure (table header+separator adjacency, verdict copy arms,
// warnings blockquote, H1 determinism); failure modes (missing/corrupt/wrong-shape
// inputs); adversarial inputs (Markdown injection, C0/US/NEL control chars,
// oversize, ReDoS probe, prototype-pollution keys, truncation that must NOT flip
// the verdict to READY); and import-safety (importing must not run main/write).
//
// Control chars in fixtures are built via String.fromCharCode() so the source
// stays plain ASCII — no raw control bytes, no escape ambiguity, survives any
// Read/Edit round-trip (per feedback_read_tool_strips_control_chars).

import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

import {
  inlineSafe,
  clip,
  parseShipCommit,
  scrutinyVerdict,
  collectCloseOutUnits,
  collectDeferredUnits,
  classifyUnit,
  resolveOutPath,
  parseArgs,
  generateReport,
  loadJson,
  readText,
  writeFileAtomic,
  gitLog,
} from "./goal-ship-report.mjs";

const MODULE_URL = new URL("./goal-ship-report.mjs", import.meta.url).href;

// ───────────────────────── inlineSafe ─────────────────────────

test("inlineSafe escapes the table-pipe delimiter", () => {
  assert.equal(inlineSafe("a | b || c"), "a \\| b \\|\\| c");
});

test("inlineSafe strips NUL and US (C0 controls) — NOT collapsed by \\s", () => {
  // NUL (0x00) and US (0x1F) are not JS \s whitespace; only CTRL_RE catches them.
  // Load-bearing: delete CTRL_RE from the source and these go red (\n\t\r would
  // NOT — they survive via the \s+ collapse; see the "ordinary whitespace" test).
  const NUL = String.fromCharCode(0);
  const US = String.fromCharCode(0x1f);
  assert.equal(inlineSafe("a" + NUL + "b"), "a b");
  assert.equal(inlineSafe("x" + US + "y"), "x y");
});

test("inlineSafe strips NEL (U+0085) — not matched by \\s", () => {
  // U+0085 is not a JS \s whitespace char; the control-class must catch it.
  const NEL = String.fromCharCode(0x85);
  assert.equal(inlineSafe("a" + NEL + "b"), "a b");
});

test("inlineSafe collapses ordinary whitespace (newline / tab / CR)", () => {
  // \n \t \r ARE JS \s — the \s+ collapse handles them independent of CTRL_RE.
  assert.equal(inlineSafe("line1\nline2\ttab\r\ndone"), "line1 line2 tab done");
});

test("inlineSafe handles null / undefined / non-string", () => {
  assert.equal(inlineSafe(null), "");
  assert.equal(inlineSafe(undefined), "");
  assert.equal(inlineSafe(42), "42");
});

test("inlineSafe — a hostile fake-table-row subject cannot break out", () => {
  const hostile = "title |\n| U-FAKE | EVIL | abc | clear | pwned";
  const safe = inlineSafe(hostile);
  assert.ok(!safe.includes("\n"), "no newline survives");
  assert.ok(!/(?<!\\)\|/.test(safe), "every pipe is backslash-escaped");
});

// ───────────────────────── clip ─────────────────────────

test("clip truncates with an ellipsis past the limit", () => {
  const r = clip("x".repeat(50), 10);
  assert.equal(r.length, 10);
  assert.ok(r.endsWith("…"));
});

test("clip leaves a short string untouched", () => {
  assert.equal(clip("short", 100), "short");
  assert.equal(clip("x", 50), "x"); // a 1-char string never clips to empty
});

test("clip defends against a non-finite / negative limit", () => {
  // n is floored to 1; slice(0, max(1, n-1)) keeps >=1 content char so the result
  // is never a bare ellipsis. A clip limit of 1 is a degenerate misconfiguration —
  // "a…" is the intentional, sane, no-throw output.
  assert.equal(clip("abc", NaN), "a…");
  assert.equal(clip("abcdef", -5), "a…");
});

// ───────────────────────── parseShipCommit ─────────────────────────

test("parseShipCommit parses a plain [SCOPE]/U-ID: subject", () => {
  const r = parseShipCommit("[SYSTEM-VIZ-BRAIN-MS0]/U-GOAL: ship report");
  assert.deepEqual(r, {
    scope: "SYSTEM-VIZ-BRAIN-MS0",
    units: ["U-GOAL"],
    title: "ship report",
  });
});

test("parseShipCommit — [MAIN] prefix is NOT the scope", () => {
  const r = parseShipCommit("[MAIN] [system-viz-brain-ms0]/U-P4: ship lib");
  assert.equal(r.scope, "system-viz-brain-ms0");
  assert.deepEqual(r.units, ["U-P4"]);
});

test("parseShipCommit tolerates a parenthetical annotation before the colon", () => {
  const r = parseShipCommit("[OBSIDIAN-INTELLIGENCE-MS3]/U-CONFLICT-RESOLUTION (D3): engine");
  assert.deepEqual(r.units, ["U-CONFLICT-RESOLUTION"]);
  assert.equal(r.title, "engine");
});

test("parseShipCommit splits a multi-unit subject", () => {
  const r = parseShipCommit("[X-MS1]/U-MS1-REWALK + U-GHOST-SEED: L13 ghost layer");
  assert.deepEqual(r.units, ["U-MS1-REWALK", "U-GHOST-SEED"]);
});

test("parseShipCommit rejects non-ship subjects", () => {
  assert.equal(parseShipCommit("Merge slot/bravo into cad-fusion-live-ms0"), null);
  assert.equal(parseShipCommit("[CHECKIN-AUTOINVOKE]/named-to-invoked: not a U-unit"), null);
  assert.equal(parseShipCommit(""), null);
  assert.equal(parseShipCommit(null), null);
  assert.equal(parseShipCommit("just a plain message"), null);
});

test("parseShipCommit rejects a multi-line 'subject' (git %s is always single-line)", () => {
  // Defensive: a newline-bearing string is not a real git subject; the non-`m`
  // `(.*)$` correctly fails to match → null, so no fake row can be smuggled.
  assert.equal(parseShipCommit("[X-MS0]/U-A: ok\n| U-FAKE | x | y | clear | row"), null);
});

test("parseShipCommit is ReDoS-safe — prefix quantifier on a near-miss within MAX_SUBJECT", () => {
  // 240 prefix brackets with no scope/unit tail — this drives the
  // `(?:\[...\]\s+)*` quantifier through the regex itself (not the truncation
  // guard). The size assertion pins the fixture's intent: it MUST stay under
  // MAX_SUBJECT (1000) or the truncation guard would short-circuit the regex.
  const probe = "[A] ".repeat(240) + "no-scope-no-unit";
  assert.ok(probe.length > 900 && probe.length < 1000, "fixture in (900,1000) chars");
  const t0 = Date.now();
  assert.equal(parseShipCommit(probe), null);
  assert.ok(Date.now() - t0 < 500, "prefix quantifier resolves well under 500ms");
});

test("parseShipCommit truncates oversize input before the regex", () => {
  // A 50k-char subject is sliced to MAX_SUBJECT (1000) before SHIP_RE runs;
  // the sliced head has no closing pattern → null. (Bounds regex input.)
  const huge = "[" + "A".repeat(50000) + "]/U-X: t";
  const t0 = Date.now();
  assert.equal(parseShipCommit(huge), null);
  assert.ok(Date.now() - t0 < 500);
});

// ───────────────────────── scrutinyVerdict ─────────────────────────

test("scrutinyVerdict — 3-of-3 cleared entry", () => {
  const ledger = {
    entries: { s1: { opusReviewed: true, claudeReviewed: true, codexReviewed: true, blockCount: 0 } },
  };
  const v = scrutinyVerdict(ledger, "s1");
  assert.equal(v.found, true);
  assert.equal(v.cleared, true);
  assert.equal(v.mode, "3-of-3");
});

test("scrutinyVerdict — arm-B alias geminiReviewed counts", () => {
  const ledger = {
    entries: { s1: { opusReviewed: true, geminiReviewed: true, codexReviewed: true } },
  };
  assert.equal(scrutinyVerdict(ledger, "s1").cleared, true);
});

test("scrutinyVerdict — legacy self/agent entry clears", () => {
  const ledger = { entries: { s1: { selfReviewed: true, agentReviewed: true } } };
  const v = scrutinyVerdict(ledger, "s1");
  assert.equal(v.cleared, true);
  assert.equal(v.mode, "legacy-2");
});

test("scrutinyVerdict — incomplete entry is not cleared", () => {
  const ledger = { entries: { s1: { opusReviewed: true, codexReviewed: true } } };
  const v = scrutinyVerdict(ledger, "s1");
  assert.equal(v.found, true);
  assert.equal(v.cleared, false);
  assert.equal(v.mode, "incomplete");
});

test("scrutinyVerdict — missing session / null ledger / array entries", () => {
  assert.equal(scrutinyVerdict({ entries: {} }, "nope").found, false);
  assert.equal(scrutinyVerdict(null, "s1").found, false);
  assert.equal(scrutinyVerdict({ entries: [] }, "s1").found, false);
  assert.equal(scrutinyVerdict({ entries: {} }, null).reason, "no-session-id");
});

test("scrutinyVerdict — prototype-pollution key resolves to not-found", () => {
  // "__proto__" / "toString" must not leak Object.prototype members as an entry.
  const v = scrutinyVerdict({ entries: {} }, "__proto__");
  assert.equal(v.found, false);
  assert.equal(v.reason, "session-not-in-ledger");
});

test("scrutinyVerdict — string blockCount is coerced numerically", () => {
  const ledger = { entries: { s1: { selfReviewed: true, agentReviewed: true, blockCount: "7" } } };
  assert.equal(scrutinyVerdict(ledger, "s1").blockCount, 7);
});

// ───────────────────────── collectCloseOutUnits ─────────────────────────

test("collectCloseOutUnits flattens candidates and counts objects seen", () => {
  const closeOut = {
    results: [
      { candidates: [{ unit_id: "U-A" }, { unit_id: "U-B" }] },
      { candidates: [] },
      { candidates: [{ unit_id: "U-C" }] },
    ],
  };
  const { units, candidatesSeen } = collectCloseOutUnits(closeOut);
  assert.deepEqual([...units].sort(), ["U-A", "U-B", "U-C"]);
  assert.equal(candidatesSeen, 3);
});

test("collectCloseOutUnits — normal 'nothing pending' state is not drift", () => {
  // Many results, all with empty candidates[] — the steady state. candidatesSeen
  // must be 0 so the drift heuristic does NOT false-positive.
  const closeOut = { results: [{ candidates: [] }, { candidates: [] }, { milestone: "x" }] };
  const { units, candidatesSeen } = collectCloseOutUnits(closeOut);
  assert.equal(units.size, 0);
  assert.equal(candidatesSeen, 0);
});

test("collectCloseOutUnits — candidate without a unit_id is the drift signal", () => {
  // Producer renamed the field → candidate objects exist but yield no ids.
  const closeOut = { results: [{ candidates: [{ foo: "U-A" }, { bar: 1 }] }] };
  const { units, candidatesSeen } = collectCloseOutUnits(closeOut);
  assert.equal(units.size, 0);
  assert.equal(candidatesSeen, 2);
});

test("collectCloseOutUnits — non-array / non-object inputs do not throw", () => {
  assert.equal(collectCloseOutUnits(null).units.size, 0);
  assert.equal(collectCloseOutUnits({ results: "nope" }).candidatesSeen, 0);
  assert.equal(collectCloseOutUnits({ results: [{ candidates: ["str", null, 3] }] }).candidatesSeen, 0);
});

// ───────────────────────── collectDeferredUnits ─────────────────────────

test("collectDeferredUnits extracts U-ids from deferral lines, ignores prose", () => {
  const md = [
    "# CLOSE-OUT-DEFERRED",
    "> Append-only ledger.",
    "## Format",
    "```",
    "<unit_id> | <who> | <iso> | <reason>",
    "```",
    "---",
    "U-FOO | echo/claude-x | 2026-05-16T00:00:00Z | defer-to-followup:capacity",
    "U-BAR | bravo/claude-y | 2026-05-16T01:00:00Z | false-positive:spec",
    "  - closed-in-commit:<sha>",
  ].join("\n");
  const got = collectDeferredUnits(md);
  assert.deepEqual([...got].sort(), ["U-BAR", "U-FOO"]);
});

test("collectDeferredUnits — null / non-string / empty", () => {
  assert.equal(collectDeferredUnits(null).size, 0);
  assert.equal(collectDeferredUnits(123).size, 0);
  assert.equal(collectDeferredUnits("").size, 0);
});

// ───────────────────────── classifyUnit ─────────────────────────

test("classifyUnit — deferred outranks pending", () => {
  const closeOut = new Set(["U-X"]);
  const deferred = new Set(["U-X"]);
  assert.equal(classifyUnit("U-X", closeOut, deferred).status, "deferred");
});

test("classifyUnit — pending and clear", () => {
  assert.equal(classifyUnit("U-X", new Set(["U-X"]), new Set()).status, "pending");
  assert.equal(classifyUnit("U-X", new Set(), new Set()).status, "clear");
});

// ───────────────────────── resolveOutPath ─────────────────────────

test("resolveOutPath — default path is inside the repo", () => {
  const repo = path.resolve("some-repo-root");
  const r = resolveOutPath(null, repo);
  assert.equal(r.inside, true);
  assert.ok(r.path.endsWith(path.normalize("state/shared/GOAL-SHIP-REPORT.md")));
});

test("resolveOutPath — a relative path stays inside", () => {
  const repo = path.resolve("some-repo-root");
  assert.equal(resolveOutPath("sub/dir/report.md", repo).inside, true);
});

test("resolveOutPath — a ../ escape is rejected", () => {
  const repo = path.resolve("some-repo-root");
  assert.equal(resolveOutPath("../../../escape.md", repo).inside, false);
});

test("resolveOutPath — an absolute path outside the repo is rejected", () => {
  const repo = path.resolve("some-repo-root");
  const outside = path.resolve(repo, "..", "elsewhere", "x.md");
  assert.equal(resolveOutPath(outside, repo).inside, false);
});

test("resolveOutPath — a sibling dir whose name is a prefix is rejected", () => {
  // repo `<root>` vs sibling `<root>-evil` — the trailing path.sep guard must
  // not let `<root>-evil/...` count as inside `<root>`.
  const repo = path.resolve("prefix-repo");
  const sibling = path.resolve("prefix-repo-evil", "x.md");
  assert.equal(resolveOutPath(sibling, repo).inside, false);
});

// ───────────────────────── parseArgs ─────────────────────────

test("parseArgs — defaults with no args", () => {
  assert.deepEqual(parseArgs([]), {
    sessionId: null,
    window: 30,
    json: false,
    out: null,
    frozenTime: null,
  });
});

test("parseArgs — --window clamps to MAX_WINDOW (300)", () => {
  assert.equal(parseArgs(["--window", "999"]).window, 300);
});

test("parseArgs — a valid mid-range --window passes through unclamped", () => {
  // Proves clamping happens only at the MAX boundary, not for all values —
  // catches a Math.min↔Math.max mutation that the 999→300 case alone could miss.
  assert.equal(parseArgs(["--window", "50"]).window, 50);
});

test("parseArgs — --window rejects non-positive / non-numeric / missing value", () => {
  assert.equal(parseArgs(["--window", "-5"]).window, 30);
  assert.equal(parseArgs(["--window", "0"]).window, 30); // guards `git log -0`
  assert.equal(parseArgs(["--window", "abc"]).window, 30);
  assert.equal(parseArgs(["--window"]).window, 30); // trailing flag, no value
});

test("parseArgs — flag/value pairing for --json / --session-id / --out", () => {
  const a = parseArgs(["--json", "--session-id", "sess9", "--out", "sub/r.md"]);
  assert.equal(a.json, true);
  assert.equal(a.sessionId, "sess9");
  assert.equal(a.out, "sub/r.md");
});

test("parseArgs — each flag works in isolation", () => {
  assert.equal(parseArgs(["--json"]).json, true);
  assert.equal(parseArgs(["--session-id", "lone"]).sessionId, "lone");
  // parseArgs passes the literal --out string through unchanged; containment is
  // resolveOutPath's job, not parseArgs'.
  assert.equal(parseArgs(["--out", "../escape/x.md"]).out, "../escape/x.md");
});

test("parseArgs — --frozen-time is captured verbatim", () => {
  assert.equal(
    parseArgs(["--frozen-time", "2026-01-01T00:00:00Z"]).frozenTime,
    "2026-01-01T00:00:00Z"
  );
});

test("parseArgs — a trailing valueless --out yields null", () => {
  assert.equal(parseArgs(["--out"]).out, null);
});

// ───────────────────────── generateReport — E2E join ─────────────────────────

const CLEARED_LEDGER = {
  entries: {
    sess1: {
      opusReviewed: true,
      claudeReviewed: true,
      codexReviewed: true,
      blockCount: 1,
      recordedAt: "2026-05-16T00:00:00Z",
    },
  },
};

test("generateReport — happy path: all units clear → READY", () => {
  const r = generateReport({
    commits: [
      { sha: "aaaaaaaaaaaa1", subject: "[X-MS0]/U-A: alpha" },
      { sha: "bbbbbbbbbbbb2", subject: "[X-MS0]/U-B: beta" },
    ],
    ledger: CLEARED_LEDGER,
    closeOut: { results: [] },
    deferredText: "",
    sessionId: "sess1",
    window: 30,
    generatedAt: "2026-05-16T12:00:00Z",
  });
  assert.equal(r.verdict, "READY");
  assert.equal(r.units.length, 2);
  assert.equal(r.json.counts.clear, 2);
  // table header and separator are adjacent (structural, not just present)
  const lines = r.markdown.split("\n");
  const hdr = lines.findIndex((l) => l.includes("| Unit | Scope | Commit"));
  assert.ok(hdr >= 0, "table header present");
  assert.ok(lines[hdr + 1].startsWith("|------|"), "separator immediately follows header");
  assert.ok(r.markdown.includes("✓ CLEARED"));
  assert.ok(
    r.markdown.includes("**Verdict: READY** — every shipped unit is clear"),
    "READY verdict copy rendered"
  );
});

test("generateReport — a pending close-out unit → BLOCKED", () => {
  const r = generateReport({
    commits: [{ sha: "ccccccccccc3", subject: "[X-MS0]/U-PEND: x" }],
    closeOut: { results: [{ candidates: [{ unit_id: "U-PEND" }] }] },
    sessionId: "sess1",
    ledger: CLEARED_LEDGER,
    generatedAt: "2026-05-16T12:00:00Z",
  });
  assert.equal(r.verdict, "BLOCKED");
  assert.equal(r.json.counts.pending, 1);
  assert.ok(r.markdown.includes("Pending triage:"));
  assert.ok(
    r.markdown.includes("**Verdict: BLOCKED** — triage the pending unit(s)"),
    "BLOCKED verdict copy rendered"
  );
});

test("generateReport — an explicitly-deferred unit does not block", () => {
  const r = generateReport({
    commits: [{ sha: "ddddddddddd4", subject: "[X-MS0]/U-DEF: x" }],
    closeOut: { results: [{ candidates: [{ unit_id: "U-DEF" }] }] },
    deferredText: "U-DEF | echo | 2026-05-16T00:00:00Z | defer-to-followup:later",
    sessionId: "sess1",
    ledger: CLEARED_LEDGER,
    generatedAt: "2026-05-16T12:00:00Z",
  });
  assert.equal(r.verdict, "READY");
  assert.equal(r.json.counts.deferred, 1);
  assert.equal(r.json.counts.pending, 0);
});

test("generateReport — truncation must NOT silently flip to READY (P1 regression guard)", () => {
  // 400 clear commits fill the cap; a 401st commit ships a unit that IS a pending
  // close-out candidate. The pending unit is truncated away — but the verdict must
  // be UNCERTAIN, never READY. Silent READY here is the exact bug this guards.
  const commits = [];
  for (let i = 0; i < 400; i++) commits.push({ sha: "s" + i, subject: `[X-MS0]/U-CLR${i}: t` });
  commits.push({ sha: "sLAST", subject: "[X-MS0]/U-HIDDEN-PENDING: t" });
  const r = generateReport({
    commits,
    closeOut: { results: [{ candidates: [{ unit_id: "U-HIDDEN-PENDING" }] }] },
    sessionId: "sess1",
    ledger: CLEARED_LEDGER,
    generatedAt: "2026-05-16T12:00:00Z",
  });
  assert.equal(r.json.truncated, true);
  assert.notEqual(r.verdict, "READY"); // the load-bearing assertion
  assert.equal(r.verdict, "UNCERTAIN");
  assert.ok(r.json.warnings.some((w) => w.includes("row cap")));
  assert.ok(
    r.markdown.split("\n").some((l) => l.startsWith("> ⚠")),
    "warnings blockquote rendered"
  );
  assert.ok(
    r.markdown.includes("**Verdict: UNCERTAIN** — evidence is incomplete"),
    "UNCERTAIN verdict copy rendered"
  );
});

test("generateReport — truncation with an in-cap pending unit still → BLOCKED", () => {
  // The pending unit ships in commit #1 (well inside the cap); 410 further clear
  // commits force truncation. BLOCKED must still outrank the truncation UNCERTAIN —
  // a detected in-cap pending unit is ground truth.
  const commits = [{ sha: "pPEND", subject: "[X-MS0]/U-INCAP-PENDING: t" }];
  for (let i = 0; i < 410; i++) commits.push({ sha: "c" + i, subject: `[X-MS0]/U-C${i}: t` });
  const r = generateReport({
    commits,
    closeOut: { results: [{ candidates: [{ unit_id: "U-INCAP-PENDING" }] }] },
    sessionId: "sess1",
    ledger: CLEARED_LEDGER,
    generatedAt: "2026-05-16T12:00:00Z",
  });
  assert.equal(r.json.truncated, true);
  assert.equal(r.verdict, "BLOCKED");
});

test("generateReport — close-out producer drift → UNCERTAIN, not false READY", () => {
  // Candidate objects present but no unit_id (producer renamed the field).
  const r = generateReport({
    commits: [{ sha: "eeeeeeeeeee5", subject: "[X-MS0]/U-A: x" }],
    closeOut: { results: [{ candidates: [{ renamed_field: "U-A" }] }] },
    sessionId: "sess1",
    ledger: CLEARED_LEDGER,
    generatedAt: "2026-05-16T12:00:00Z",
  });
  assert.equal(r.json.closeOutDrift, true);
  assert.equal(r.verdict, "UNCERTAIN");
  assert.ok(r.json.warnings.some((w) => w.includes("schema drift")));
});

test("generateReport — BLOCKED outranks UNCERTAIN when a real pending unit is in-cap", () => {
  // Drift present AND a detected pending unit → BLOCKED wins (a detected pending
  // unit is ground truth regardless of drift on other entries).
  const r = generateReport({
    commits: [{ sha: "fffffffffff6", subject: "[X-MS0]/U-REAL: x" }],
    closeOut: {
      results: [
        { candidates: [{ unit_id: "U-REAL" }] }, // valid → detected pending
        { candidates: [{ renamed: "U-OTHER" }] }, // drift signal
      ],
    },
    sessionId: "sess1",
    ledger: CLEARED_LEDGER,
    generatedAt: "2026-05-16T12:00:00Z",
  });
  assert.equal(r.json.closeOutDrift, false); // a valid id WAS extracted → no drift
  assert.equal(r.verdict, "BLOCKED");
});

test("generateReport — adversarial commit subject cannot break the table", () => {
  // A realistic git %s is single-line; it CAN carry `|` and control chars (tab).
  // Both must be defanged so the row stays a single intact table row.
  const r = generateReport({
    commits: [{ sha: "777777777777", subject: "[X-MS0]/U-EVIL: pwn | row || cell\tTAB end" }],
    closeOut: { results: [] },
    sessionId: "sess1",
    ledger: CLEARED_LEDGER,
    generatedAt: "2026-05-16T12:00:00Z",
  });
  const rows = r.markdown.split("\n").filter((l) => l.startsWith("| U-EVIL"));
  assert.equal(rows.length, 1, "exactly one table row — no breakout");
  assert.ok(!rows[0].includes("\t"), "tab control char stripped");
  assert.ok(rows[0].includes("\\|"), "pipe in the title is escaped");
});

test("generateReport — newest-first dedupe: first commit wins a unit's row", () => {
  const r = generateReport({
    commits: [
      { sha: "newerNEWER01", subject: "[X-MS0]/U-DUP: newer" },
      { sha: "olderOLDER02", subject: "[X-MS0]/U-DUP: older" },
    ],
    closeOut: { results: [] },
    sessionId: "sess1",
    ledger: CLEARED_LEDGER,
    generatedAt: "2026-05-16T12:00:00Z",
  });
  assert.equal(r.units.length, 1);
  assert.equal(r.units[0].sha, "newerNEWER01");
  assert.equal(r.units[0].title, "newer");
});

test("generateReport — empty window emits the no-commits message", () => {
  const r = generateReport({
    commits: [],
    closeOut: { results: [] },
    sessionId: "sess1",
    ledger: CLEARED_LEDGER,
    generatedAt: "2026-05-16T12:00:00Z",
  });
  assert.equal(r.units.length, 0);
  assert.equal(r.verdict, "READY");
  assert.ok(r.markdown.includes("No `[SCOPE]/U-ID:` ship commits"));
});

test("generateReport — failure-soft on null/garbage inputs", () => {
  // null ledger + null sessionId: the ledger check precedes the session-id check,
  // so the rendered reason is the ledger-unavailable message.
  const r = generateReport({
    commits: [null, "not-an-object", { sha: 5, subject: 99 }, { subject: "[X]/U-OK: t" }],
    ledger: null,
    closeOut: null,
    deferredText: null,
    sessionId: null,
    generatedAt: "2026-05-16T12:00:00Z",
  });
  assert.equal(r.units.length, 1); // only the one valid commit
  assert.equal(r.units[0].unit, "U-OK");
  assert.ok(r.markdown.includes("SCRUTINY_LEDGER unavailable or malformed"));
});

test("generateReport — valid ledger + null sessionId renders the no-session-id reason", () => {
  const r = generateReport({
    commits: [{ sha: "999999999999", subject: "[X-MS0]/U-NS: t" }],
    closeOut: { results: [] },
    ledger: CLEARED_LEDGER,
    sessionId: null,
    generatedAt: "2026-05-16T12:00:00Z",
  });
  assert.ok(r.markdown.includes("no `--session-id` supplied"));
});

test("generateReport — generatedAt lands verbatim in the H1 (CLI determinism)", () => {
  // The --frozen-time knob flows parseArgs.frozenTime → main():generatedAt →
  // generateReport. A frozen timestamp must produce a byte-deterministic H1.
  const r = generateReport({
    commits: [],
    closeOut: { results: [] },
    ledger: CLEARED_LEDGER,
    sessionId: "sess1",
    generatedAt: "2026-01-01T00:00:00Z",
  });
  assert.ok(r.markdown.startsWith("# /goal Ship Report — 2026-01-01T00:00:00Z"));
  assert.equal(r.json.generatedAt, "2026-01-01T00:00:00Z");
});

test("generateReport — JSON payload shape is stable and round-trips loss-free", () => {
  const r = generateReport({
    commits: [{ sha: "888888888888", subject: "[X-MS0]/U-J: t" }],
    closeOut: { results: [] },
    sessionId: "sess1",
    ledger: CLEARED_LEDGER,
    generatedAt: "2026-05-16T12:00:00Z",
  });
  const j = r.json;
  assert.equal(j.schemaVersion, "1.0.0");
  assert.equal(j.verdict, "READY");
  assert.equal(j.truncated, false);
  assert.equal(j.closeOutDrift, false);
  assert.deepEqual(j.warnings, []);
  assert.deepEqual(Object.keys(j.counts).sort(), ["clear", "deferred", "pending", "shipped"]);
  // round-trip is loss-free — no dropped (undefined/function) fields, no throw
  assert.deepEqual(JSON.parse(JSON.stringify(j)), j);
});

// ───────────────────────── I/O helpers ─────────────────────────

test("loadJson — missing / corrupt / non-object → null", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gsr-"));
  try {
    assert.equal(loadJson(path.join(tmp, "nope.json")), null);
    fs.writeFileSync(path.join(tmp, "bad.json"), "{not json");
    assert.equal(loadJson(path.join(tmp, "bad.json")), null);
    fs.writeFileSync(path.join(tmp, "scalar.json"), "42");
    assert.equal(loadJson(path.join(tmp, "scalar.json")), null);
    fs.writeFileSync(path.join(tmp, "ok.json"), '{"a":1}');
    assert.deepEqual(loadJson(path.join(tmp, "ok.json")), { a: 1 });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("readText — missing file → empty string", () => {
  assert.equal(readText(path.join(os.tmpdir(), "definitely-not-here-gsr.md")), "");
});

test("writeFileAtomic — round-trips and creates the parent dir", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gsr-"));
  try {
    const target = path.join(tmp, "nested", "deep", "report.md");
    writeFileAtomic(target, "hello atomic");
    assert.equal(fs.readFileSync(target, "utf8"), "hello atomic");
    // no temp leftovers
    const leftovers = fs.readdirSync(path.dirname(target)).filter((f) => f.includes(".tmp."));
    assert.equal(leftovers.length, 0);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("gitLog — a non-git directory yields [] (no throw)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gsr-nogit-"));
  try {
    assert.deepEqual(gitLog(tmp, 5), []);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ───────────────────────── import-safety ─────────────────────────

test("import-safety — importing the module runs no main() and writes no file", () => {
  // A child `node -e import(...)` has no process.argv[1] script path, so the
  // isMain guard is false and main() never runs. Assert: clean exit, no report
  // file appears under a fresh PRISM_ROOT.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gsr-import-"));
  try {
    const out = execFileSync(
      process.execPath,
      [
        "-e",
        `import(${JSON.stringify(MODULE_URL)}).then(m=>{process.stdout.write(String(typeof m.generateReport));})`,
      ],
      { encoding: "utf8", env: { ...process.env, PRISM_ROOT: tmp }, timeout: 20000 }
    );
    assert.equal(out, "function");
    assert.equal(fs.existsSync(path.join(tmp, "state/shared/GOAL-SHIP-REPORT.md")), false);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// Anchor the module path so a refactor that moves the file fails this test loudly.
test("module is the expected file", () => {
  assert.ok(fileURLToPath(MODULE_URL).endsWith(path.join("scripts", "goal-ship-report.mjs")));
});
