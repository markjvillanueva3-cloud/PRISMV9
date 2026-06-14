/**
 * command-migrate-runner.test.mjs — U-CK08 per-category executor
 *
 * Covers the public API of `.claude/scripts/command-migrate-runner.mjs`:
 *   - categoryOf: prefix derivation + edge cases.
 *   - groupByCategory: alpha-sorted categories, slug-sorted within.
 *   - buildOsCommandStub: frontmatter completeness + slug echo + no
 *     fabricated description / triggers / dispatcher_actions.
 *   - classifyExistingStub: U-CK08 → runner-owned; other-unit → preserve.
 *   - runRunner: dry-run / apply / report-only modes, hand-curated
 *     preservation, idempotent re-apply, per-category restriction.
 *
 * Run: node --test mcp-server/src/__tests__/command-migrate-runner.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  categoryOf,
  groupByCategory,
  buildOsCommandStub,
  classifyExistingStub,
  runRunner,
} from "../../../.claude/scripts/command-migrate-runner.mjs";

// -----------------------------------------------------------------------------
// categoryOf
// -----------------------------------------------------------------------------

test("categoryOf — first hyphen-segment wins", () => {
  assert.equal(categoryOf("fleet-reaper"), "fleet");
  assert.equal(categoryOf("wedm-program"), "wedm");
  assert.equal(categoryOf("checkin-hotel"), "checkin");
  assert.equal(categoryOf("hypermill-rough"), "hypermill");
});

test("categoryOf — no hyphen → slug IS the category", () => {
  assert.equal(categoryOf("checkin"), "checkin");
  assert.equal(categoryOf("status"), "status");
});

test("categoryOf — empty / null / undefined → 'misc'", () => {
  assert.equal(categoryOf(""), "misc");
  assert.equal(categoryOf(null), "misc");
  assert.equal(categoryOf(undefined), "misc");
});

test("categoryOf — leading hyphen (degenerate) → 'misc'", () => {
  // `-foo` would mean an empty first segment; treat as misc.
  assert.equal(categoryOf("-foo"), "misc");
});

test("categoryOf — case insensitive (UPPER → lower)", () => {
  assert.equal(categoryOf("WEDM-Audit"), "wedm");
});

// -----------------------------------------------------------------------------
// groupByCategory
// -----------------------------------------------------------------------------

test("groupByCategory — alpha-sorted categories, slug-sorted within", () => {
  const cmds = [
    { slug: "wedm-z", ok: true },
    { slug: "fleet-b", ok: true },
    { slug: "wedm-a", ok: true },
    { slug: "fleet-a", ok: true },
    { slug: "checkin", ok: true },
  ];
  const grouped = groupByCategory(cmds);
  assert.deepEqual([...grouped.keys()], ["checkin", "fleet", "wedm"]);
  assert.deepEqual(grouped.get("fleet").map((c) => c.slug), ["fleet-a", "fleet-b"]);
  assert.deepEqual(grouped.get("wedm").map((c) => c.slug), ["wedm-a", "wedm-z"]);
});

test("groupByCategory — empty input returns empty map", () => {
  const grouped = groupByCategory([]);
  assert.equal(grouped.size, 0);
});

// -----------------------------------------------------------------------------
// buildOsCommandStub
// -----------------------------------------------------------------------------

test("buildOsCommandStub — frontmatter has all required schema fields", () => {
  const md = buildOsCommandStub("fleet-reaper", { today: "2026-05-17", author: "test" });
  assert.match(md, /^---\n/, "starts with fence");
  assert.match(md, /\ntitle: \/fleet-reaper — Fleet Reaper\n/, "title is slug-derived Title Case");
  assert.match(md, /\nslug: fleet-reaper\n/);
  assert.match(md, /\nkind: command\n/);
  assert.match(md, /\nstatus: shipped\n/);
  assert.match(md, /\ndate: 2026-05-17\n/);
  assert.match(md, /\nmilestone: COMMAND-KERNEL-MS0\n/);
  assert.match(md, /\nunit: U-CK08\n/);
  assert.match(md, /\nauthor: test\n/);
  assert.match(md, /\nmirrors_skill: \.claude\/commands\/fleet-reaper\.md\n/);
  assert.match(md, /\n---\n/);
});

test("buildOsCommandStub — does NOT fabricate description / triggers / dispatcher_actions", () => {
  const md = buildOsCommandStub("hypermill-drill");
  assert.doesNotMatch(md, /^description:/m);
  assert.doesNotMatch(md, /^triggers:/m);
  assert.doesNotMatch(md, /^dispatcher_actions:/m);
});

test("buildOsCommandStub — defaults today to ISO date prefix when omitted", () => {
  const md = buildOsCommandStub("status");
  assert.match(md, /\ndate: \d{4}-\d{2}-\d{2}\n/);
});

test("buildOsCommandStub — single-word slug produces a usable Title", () => {
  const md = buildOsCommandStub("status", { today: "2026-05-17" });
  assert.match(md, /\ntitle: \/status — Status\n/);
});

test("buildOsCommandStub — body documents the architecture vs. spec split", () => {
  const md = buildOsCommandStub("wedm-program", { today: "2026-05-17" });
  assert.match(md, /architecture record/i);
  assert.match(md, /mirrors_skill/);
  assert.match(md, /executable spec/i);
});

// -----------------------------------------------------------------------------
// classifyExistingStub
// -----------------------------------------------------------------------------

test("classifyExistingStub — file missing → hasFile:false", () => {
  const adapter = (p, op) => (op === "exists" ? false : "");
  const c = classifyExistingStub("/no/such.md", adapter);
  assert.equal(c.hasFile, false);
  assert.equal(c.isRunnerOwned, false);
});

test("classifyExistingStub — U-CK08 unit → runner-owned (safe to overwrite)", () => {
  const text = "---\nslug: x\nkind: command\nunit: U-CK08\n---\nbody";
  const adapter = (p, op) => (op === "exists" ? true : text);
  const c = classifyExistingStub("/x.md", adapter);
  assert.equal(c.hasFile, true);
  assert.equal(c.isRunnerOwned, true);
  assert.equal(c.fmUnit, "U-CK08");
});

test("classifyExistingStub — non-U-CK08 unit → hand-curated, MUST preserve (R12 doctrine)", () => {
  const text = "---\nslug: checkin\nkind: command\nunit: U-CK04\nauthor: india\n---\nbody";
  const adapter = (p, op) => (op === "exists" ? true : text);
  const c = classifyExistingStub("/checkin.md", adapter);
  assert.equal(c.hasFile, true);
  assert.equal(c.isRunnerOwned, false);
  assert.equal(c.fmUnit, "U-CK04");
});

test("classifyExistingStub — no frontmatter → preserve (treat as hand-edited body)", () => {
  const adapter = (p, op) => (op === "exists" ? true : "no frontmatter just body text");
  const c = classifyExistingStub("/x.md", adapter);
  assert.equal(c.hasFile, true);
  assert.equal(c.isRunnerOwned, false);
});

// -----------------------------------------------------------------------------
// runRunner — end-to-end (real FS, scoped to a tempdir)
// -----------------------------------------------------------------------------

function makeCommandsCorpus(commandsDir) {
  fs.mkdirSync(commandsDir, { recursive: true });
  fs.writeFileSync(
    path.join(commandsDir, "fleet-reaper.md"),
    "---\nname: fleet-reaper\ndescription: kills orphans\n---\n# /fleet-reaper\nbody"
  );
  fs.writeFileSync(
    path.join(commandsDir, "fleet-status.md"),
    "---\nname: fleet-status\ndescription: shows fleet state\n---\n# /fleet-status\nbody"
  );
  fs.writeFileSync(
    path.join(commandsDir, "wedm-audit.md"),
    "---\nname: wedm-audit\ndescription: wire-EDM auditor\n---\n# /wedm-audit\nbody"
  );
  fs.writeFileSync(
    path.join(commandsDir, "status.md"),
    "---\nname: status\ndescription: system status snapshot\n---\n# /status\nbody"
  );
}

test("runRunner — dry-run lists every command's stub action without writing", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ck08-dry-"));
  try {
    const commandsDir = path.join(tmp, "commands");
    const osCommandsDir = path.join(tmp, "wiki", "os", "commands");
    const reportFile = path.join(tmp, "report.md");
    makeCommandsCorpus(commandsDir);
    const res = runRunner({
      commandsDir,
      osCommandsDir,
      reportFile,
      apply: false,
      today: "2026-05-17",
    });
    assert.equal(res.mode, "dry-run");
    assert.equal(res.totals.commands, 4);
    assert.equal(res.totals.categories, 3);
    // 4 commands × 1 stub each = 4 would-creates total
    const wouldCreate = Object.values(res.stubResults).flat().filter((s) => s.action === "would-create").length;
    assert.equal(wouldCreate, 4);
    // No actual files written.
    assert.equal(fs.existsSync(osCommandsDir), false);
    // Report file IS written even on dry-run (the report itself is the deliverable).
    assert.ok(fs.existsSync(reportFile), "dry-run still emits report");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("runRunner — apply creates stubs + report; categories restricted by --category", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ck08-apply-"));
  try {
    const commandsDir = path.join(tmp, "commands");
    const osCommandsDir = path.join(tmp, "wiki", "os", "commands");
    const reportFile = path.join(tmp, "report.md");
    makeCommandsCorpus(commandsDir);
    const res = runRunner({
      commandsDir,
      osCommandsDir,
      reportFile,
      apply: true,
      category: "fleet",
      today: "2026-05-17",
    });
    assert.equal(res.mode, "apply-stubs");
    assert.equal(res.category, "fleet");
    assert.equal(Object.keys(res.stubResults).length, 1, "category filter applied");
    assert.deepEqual(res.groups, ["fleet"]);
    // 2 fleet commands → 2 stubs.
    assert.ok(fs.existsSync(path.join(osCommandsDir, "fleet-reaper.md")));
    assert.ok(fs.existsSync(path.join(osCommandsDir, "fleet-status.md")));
    // Non-fleet stubs NOT created.
    assert.equal(fs.existsSync(path.join(osCommandsDir, "wedm-audit.md")), false);
    assert.equal(fs.existsSync(path.join(osCommandsDir, "status.md")), false);
    // Generated stub has the expected frontmatter shape.
    const stub = fs.readFileSync(path.join(osCommandsDir, "fleet-reaper.md"), "utf8");
    assert.match(stub, /slug: fleet-reaper/);
    assert.match(stub, /unit: U-CK08/);
    assert.match(stub, /mirrors_skill: \.claude\/commands\/fleet-reaper\.md/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("runRunner — re-apply is idempotent (byte-identical stub → 'unchanged', no write)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ck08-idem-"));
  try {
    const commandsDir = path.join(tmp, "commands");
    const osCommandsDir = path.join(tmp, "wiki", "os", "commands");
    makeCommandsCorpus(commandsDir);
    runRunner({ commandsDir, osCommandsDir, apply: true, category: "fleet", today: "2026-05-17", reportFile: path.join(tmp, "r1.md") });
    // Capture mtime of the first stub; re-run shouldn't alter it.
    const stubPath = path.join(osCommandsDir, "fleet-reaper.md");
    const before = fs.statSync(stubPath);
    // Sleep wall-time briefly so that any (re-)write would have a different mtime.
    const wait = Date.now() + 30;
    while (Date.now() < wait) { /* tiny spin */ }
    const res2 = runRunner({ commandsDir, osCommandsDir, apply: true, category: "fleet", today: "2026-05-17", reportFile: path.join(tmp, "r2.md") });
    const after = fs.statSync(stubPath);
    assert.equal(after.mtimeMs, before.mtimeMs, "idempotent re-apply must NOT rewrite");
    const unchanged = res2.stubResults.fleet.filter((s) => s.action === "unchanged").length;
    assert.equal(unchanged, 2, "both fleet stubs reported as 'unchanged'");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("runRunner — CROSS-DAY idempotency: refreshing a runner-owned stub preserves original date (no churn)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ck08-xday-"));
  try {
    const commandsDir = path.join(tmp, "commands");
    const osCommandsDir = path.join(tmp, "wiki", "os", "commands");
    makeCommandsCorpus(commandsDir);
    // Day 1 creation.
    runRunner({ commandsDir, osCommandsDir, apply: true, category: "fleet", today: "2026-05-17", reportFile: path.join(tmp, "r1.md") });
    const day1 = fs.readFileSync(path.join(osCommandsDir, "fleet-reaper.md"), "utf8");
    assert.match(day1, /\ndate: 2026-05-17\n/);
    // Day 2 re-run with a LATER today — must NOT rewrite (date preserved → byte-identical → 'unchanged').
    const res2 = runRunner({ commandsDir, osCommandsDir, apply: true, category: "fleet", today: "2026-05-19", reportFile: path.join(tmp, "r2.md") });
    const day2 = fs.readFileSync(path.join(osCommandsDir, "fleet-reaper.md"), "utf8");
    assert.equal(day2, day1, "cross-day re-run must preserve original date (no commit churn)");
    assert.match(day2, /\ndate: 2026-05-17\n/, "original creation date preserved, not bumped to 2026-05-19");
    const unchanged = res2.stubResults.fleet.filter((s) => s.action === "unchanged").length;
    assert.equal(unchanged, 2, "both stubs unchanged on cross-day re-run");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("runRunner — hand-curated existing entries are PRESERVED (R12 — never silent-clobber)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ck08-preserve-"));
  try {
    const commandsDir = path.join(tmp, "commands");
    const osCommandsDir = path.join(tmp, "wiki", "os", "commands");
    makeCommandsCorpus(commandsDir);
    fs.mkdirSync(osCommandsDir, { recursive: true });
    // Pre-place a HAND-CURATED stub for fleet-reaper (unit != U-CK08).
    const handCurated = "---\ntitle: hand-curated\nslug: fleet-reaper\nkind: command\nstatus: shipped\ndate: 2026-05-15\nmilestone: SOMETHING-ELSE\nunit: U-OTHER\nauthor: india\n---\n# hand-curated body\nDO NOT OVERWRITE";
    fs.writeFileSync(path.join(osCommandsDir, "fleet-reaper.md"), handCurated);
    const res = runRunner({
      commandsDir,
      osCommandsDir,
      apply: true,
      category: "fleet",
      today: "2026-05-17",
      reportFile: path.join(tmp, "r.md"),
    });
    // Hand-curated entry must survive byte-for-byte.
    const after = fs.readFileSync(path.join(osCommandsDir, "fleet-reaper.md"), "utf8");
    assert.equal(after, handCurated, "hand-curated entry must not be overwritten");
    // The other fleet command (fleet-status) IS created.
    assert.ok(fs.existsSync(path.join(osCommandsDir, "fleet-status.md")));
    const preserved = res.stubResults.fleet.filter((s) => s.action === "preserved-hand-curated").length;
    assert.equal(preserved, 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("runRunner — runner-owned existing stub IS overwritten (refresh path)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ck08-refresh-"));
  try {
    const commandsDir = path.join(tmp, "commands");
    const osCommandsDir = path.join(tmp, "wiki", "os", "commands");
    makeCommandsCorpus(commandsDir);
    fs.mkdirSync(osCommandsDir, { recursive: true });
    // Pre-place a STALE runner-owned stub (unit: U-CK08) with different content.
    const stale = "---\nunit: U-CK08\nslug: fleet-reaper\n---\nstale body";
    fs.writeFileSync(path.join(osCommandsDir, "fleet-reaper.md"), stale);
    const res = runRunner({
      commandsDir,
      osCommandsDir,
      apply: true,
      category: "fleet",
      today: "2026-05-17",
      reportFile: path.join(tmp, "r.md"),
    });
    const after = fs.readFileSync(path.join(osCommandsDir, "fleet-reaper.md"), "utf8");
    assert.notEqual(after, stale, "runner-owned stale stub must be overwritten");
    assert.match(after, /title: \/fleet-reaper — Fleet Reaper/);
    const overwrote = res.stubResults.fleet.filter((s) => s.action === "overwrote-runner-owned").length;
    assert.equal(overwrote, 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("runRunner — report-only mode does not write wiki stubs", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ck08-report-only-"));
  try {
    const commandsDir = path.join(tmp, "commands");
    const osCommandsDir = path.join(tmp, "wiki", "os", "commands");
    const reportFile = path.join(tmp, "report.md");
    makeCommandsCorpus(commandsDir);
    runRunner({
      commandsDir,
      osCommandsDir,
      reportFile,
      reportOnly: true,
      today: "2026-05-17",
    });
    assert.equal(fs.existsSync(osCommandsDir), false, "report-only must not create wiki dir");
    assert.ok(fs.existsSync(reportFile), "report still produced");
    const report = fs.readFileSync(reportFile, "utf8");
    assert.match(report, /report-only/);
    assert.match(report, /## Per-category verdicts/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("runRunner — report content includes per-category counts + anti-pattern breakdown", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ck08-report-content-"));
  try {
    const commandsDir = path.join(tmp, "commands");
    const reportFile = path.join(tmp, "report.md");
    makeCommandsCorpus(commandsDir);
    // Inject a command with a hardcoded path to verify anti-pattern reporting.
    fs.writeFileSync(
      path.join(commandsDir, "wedm-hardcoded.md"),
      "---\nname: wedm-hardcoded\ndescription: has a baked path\n---\nFollow path H:/prism/.claude/something\n"
    );
    const res = runRunner({
      commandsDir,
      osCommandsDir: path.join(tmp, "wiki", "os", "commands"),
      reportFile,
      reportOnly: true,
      today: "2026-05-17",
    });
    assert.ok(res.totals.antiPatterns > 0, "anti-patterns surfaced in totals");
    const report = fs.readFileSync(reportFile, "utf8");
    assert.match(report, /hardcoded-path/);
    assert.match(report, /wedm/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
