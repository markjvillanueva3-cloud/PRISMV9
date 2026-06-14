/**
 * system-awareness-freshness-audit.test.mjs — paired with the audit script.
 *
 * Tests per SYSTEM-AWARENESS-FRESHNESS-MS0 spec acceptance:
 *   - 4 detection functions (pure core)
 *   - buildAudit composition (with injected fake readers)
 *   - severity filter
 *   - real-data E2E oracle against the live repo (U-INTEG-FIX-P0 lesson:
 *     hermetic fakes alone do not prove production wiring)
 *
 * Coverage floor: happy + ≥3 failure modes + ≥2 adversarial + ≥3 variability.
 *
 * Run: node --test H:/prism/scripts/system-awareness-freshness-audit.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  extractMilestoneTokens,
  detectMissingClaudeMdSummaries,
  detectStaleFamilySections,
  detectBrokenWikilinks,
  detectCountClaims,
  isMilestoneToken,
  buildAudit,
  filterBySeverity,
  makeReadFile,
  makeReadDir,
  makeGitLogAsync,
} from "./system-awareness-freshness-audit.mjs";

// ─── extractMilestoneTokens ─────────────────────────────────────────────

test("extractMilestoneTokens: real commit subjects yield the milestone, not the routing label", () => {
  const r = extractMilestoneTokens("[MAIN] [FLEET-REAPER-MS3]/U-FR-MS3-SPEC: render HTML twin");
  assert.deepEqual(r, ["FLEET-REAPER-MS3"]);
});

test("extractMilestoneTokens: skips slot routing labels (ALPHA..ZULU, SLOT-CHARLIE, etc.)", () => {
  assert.deepEqual(extractMilestoneTokens("[GOLF] [FLEET-RESILIENCE-MS0]/U-FR-TRIGGER-STALL-DETECT"), ["FLEET-RESILIENCE-MS0"]);
  assert.deepEqual(extractMilestoneTokens("[SLOT-CHARLIE] [WIRE-UNWIRED-MS0]/U-WIRE-TOOL-CA"), ["WIRE-UNWIRED-MS0"]);
});

test("extractMilestoneTokens: skips CLOSE-OUT / TESTFIX / DOCTRINE scopes", () => {
  assert.deepEqual(extractMilestoneTokens("[MAIN] [CLOSE-OUT]/MILESTONE_PROGRESS-RECONCILE"), []);
  assert.deepEqual(extractMilestoneTokens("[MAIN] [TESTFIX]: rename"), []);
  assert.deepEqual(extractMilestoneTokens("[MAIN] [DOCTRINE]/U-BRIDGE-RECONCILE-MISTAKE"), []);
});

test("extractMilestoneTokens: empty / no-bracket subject → empty array", () => {
  assert.deepEqual(extractMilestoneTokens(""), []);
  assert.deepEqual(extractMilestoneTokens("plain commit no bracket"), []);
});

test("extractMilestoneTokens: deduplicates repeated tokens within a subject", () => {
  const r = extractMilestoneTokens("[MAIN] [FOO-MS0] [FOO-MS0] tweak");
  assert.deepEqual(r, ["FOO-MS0"]);
});

// ─── detectMissingClaudeMdSummaries ─────────────────────────────────────

test("detectMissingClaudeMdSummaries: token absent → reported with hits=0", () => {
  const r = detectMissingClaudeMdSummaries("CLAUDE prose mentions X-MS5 only", ["X-MS5", "Y-MS0"]);
  assert.equal(r.length, 1);
  assert.equal(r[0].token, "Y-MS0");
  assert.equal(r[0].hits, 0);
});

test("detectMissingClaudeMdSummaries: empty CLAUDE.md → all tokens reported missing", () => {
  const r = detectMissingClaudeMdSummaries("", ["A-MS0", "B-MS1"]);
  assert.equal(r.length, 2);
});

test("detectMissingClaudeMdSummaries: regex-special tokens are escaped (no crash)", () => {
  // Use milestone-format tokens (must end in -MS\d+) containing regex-special
  // chars. The 2026-05-20 hardening filters tokens via isMilestoneToken, so
  // the fixture must satisfy that pattern to test the regex-escape path.
  const r = detectMissingClaudeMdSummaries("nothing", ["X(SPECIAL)-MS0", "Y[BRACKET]-MS1"]);
  // Won't match (because the literal chars aren't in CLAUDE.md), but must NOT throw.
  assert.equal(r.length, 2);
});

test("detectMissingClaudeMdSummaries: non-milestone tokens are filtered (isMilestoneToken gate)", () => {
  // Tokens that don't end in -MS\d+ are scope-tags or single-commit fix labels,
  // not durable milestones — they should never be flagged as "needs CLAUDE.md".
  const r = detectMissingClaudeMdSummaries("nothing", [
    "DEV-TOOLS",       // scope tag
    "BUGFIX",          // fix class
    "PICKER-FIX",      // single-commit fix
    "RTK-ADOPT",       // one-off label
    "FLEET-REAPER-MS3" // real milestone
  ]);
  assert.equal(r.length, 1);
  assert.equal(r[0].token, "FLEET-REAPER-MS3");
});

test("detectMissingClaudeMdSummaries: inbox haystack covers staged tokens (extraHaystack param)", () => {
  // A token staged in RECENT-SHIPMENTS-*.md inbox is already on golf's drain
  // list — must not be flagged as missing.
  const claudeMd = "Only mentions FLEET-REAPER-MS0 here";
  const inbox = "| **FLEET-REAPER-MS3** | shipped 5/19 | NEEDS-SUMMARY |\n";
  const r = detectMissingClaudeMdSummaries(claudeMd, ["FLEET-REAPER-MS3", "FLEET-REAPER-MS4"], inbox);
  assert.equal(r.length, 1, "MS3 covered by inbox, MS4 not");
  assert.equal(r[0].token, "FLEET-REAPER-MS4");
});

test("isMilestoneToken: only *-MS<digits> patterns qualify", () => {
  assert.equal(isMilestoneToken("FLEET-REAPER-MS3"), true);
  assert.equal(isMilestoneToken("SCIMATH-MS1.5"), true);
  assert.equal(isMilestoneToken("U-SAF-F1"), false);
  assert.equal(isMilestoneToken("DEV-TOOLS"), false);
  assert.equal(isMilestoneToken("PICKER-FIX"), false);
  assert.equal(isMilestoneToken("RTK-ADOPT"), false);
});

// ─── detectStaleFamilySections ──────────────────────────────────────────

test("detectStaleFamilySections: MS3 missing while MS1 is mentioned → stale-family finding", () => {
  const claudeMd = "## FLEET-REAPER-MS1\nshipped\n## FLEET-REAPER-MS2\nshipped";
  const r = detectStaleFamilySections(claudeMd, ["FLEET-REAPER-MS1", "FLEET-REAPER-MS2", "FLEET-REAPER-MS3"]);
  assert.equal(r.length, 1);
  assert.equal(r[0].family, "FLEET-REAPER");
  assert.equal(r[0].latestMissing, "FLEET-REAPER-MS3");
  assert.deepEqual(r[0].earlierPresent.sort(), ["FLEET-REAPER-MS1", "FLEET-REAPER-MS2"].sort());
});

test("detectStaleFamilySections: single-member family → no finding", () => {
  const r = detectStaleFamilySections("anything", ["LONE-MS0"]);
  assert.deepEqual(r, []);
});

test("detectStaleFamilySections: latest present + earlier present → no finding", () => {
  const claudeMd = "FOO-MS0 and FOO-MS1 both mentioned";
  const r = detectStaleFamilySections(claudeMd, ["FOO-MS0", "FOO-MS1"]);
  assert.deepEqual(r, []);
});

// U-SAF-B3 fail-on-revert: inbox haystack covers staged stale-family tokens.
// A row in RECENT-SHIPMENTS-*.md IS the staging summary; flagging the same
// token a second time as "stale-family" double-counts the staging step.
test("detectStaleFamilySections: inbox haystack covers stale-family token (extraHaystack param)", () => {
  const claudeMd = "## FLEET-REAPER-MS1\nshipped\n## FLEET-REAPER-MS2\nshipped";
  const inbox = "| **FLEET-REAPER-MS3** | shipped 2026-05-19 | NEEDS-SUMMARY |";
  // Without inbox: MS3 flagged.
  assert.equal(detectStaleFamilySections(claudeMd, ["FLEET-REAPER-MS1","FLEET-REAPER-MS2","FLEET-REAPER-MS3"]).length, 1);
  // With inbox: MS3 covered → no finding.
  const r = detectStaleFamilySections(claudeMd, ["FLEET-REAPER-MS1","FLEET-REAPER-MS2","FLEET-REAPER-MS3"], inbox);
  assert.deepEqual(r, []);
});

// ─── detectBrokenWikilinks ──────────────────────────────────────────────

test("detectBrokenWikilinks: known-stem link → not broken", () => {
  const r = detectBrokenWikilinks("see [[fleet-doctrine-26]]", (t) => t === "fleet-doctrine-26");
  assert.deepEqual(r, []);
});

test("detectBrokenWikilinks: unknown-stem link → broken", () => {
  const r = detectBrokenWikilinks("see [[never-existed]]", () => false);
  assert.deepEqual(r, ["never-existed"]);
});

test("detectBrokenWikilinks: dedups multiple references to the same broken link", () => {
  const r = detectBrokenWikilinks("see [[X]] and [[X]] and [[X]]", () => false);
  assert.deepEqual(r, ["X"]);
});

test("detectBrokenWikilinks: empty text or non-fn linkExists → empty result (no throw)", () => {
  assert.deepEqual(detectBrokenWikilinks("", () => false), []);
  assert.deepEqual(detectBrokenWikilinks("text", null), []);
});

test("detectBrokenWikilinks: anchor + alias syntax handled — [[name|alias]] uses 'name' for resolution", () => {
  const r = detectBrokenWikilinks("see [[real-page|its alias]]", (t) => t === "real-page");
  assert.deepEqual(r, []);
});

// ─── detectCountClaims ──────────────────────────────────────────────────

test("detectCountClaims: bare count-claim flagged", () => {
  const r = detectCountClaims("PRISM has 575 engines");
  assert.equal(r.length, 1);
  assert.match(r[0].match, /575 engines/);
});

test("detectCountClaims: inventory-pointer references are exempt", () => {
  const r = detectCountClaims("see PRISM-INVENTORY-LATEST.md (575 engines)");
  assert.deepEqual(r, []);
});

test("detectCountClaims: SLOT_NAMES references are exempt", () => {
  const r = detectCountClaims("SLOT_NAMES.length (26 slots)");
  assert.deepEqual(r, []);
});

test("detectCountClaims: line number is 1-indexed and snippet is bounded", () => {
  // Uses "engines" — a noun the detector still matches. "hooks" and "tests" were
  // removed from the noun-set after the 2026-05-20 audit-trail hardening:
  // descriptive set-counts ("21 hooks fire on harness events") and ship-time
  // test counts ("33 tests") are not stale inventory pointers and shouldn't
  // be flagged.
  const text = "line 1\nline 2\nthere are 99 engines here";
  const r = detectCountClaims(text);
  assert.equal(r.length, 1);
  assert.equal(r[0].line, 3);
  assert.ok(r[0].snippet.length <= 140);
});

test("detectCountClaims: skip lines inside `## Recent regressions` audit-trail block", () => {
  const text = [
    "## Recent regressions",
    "- 2026-05-20 | 33 tests fixed | observed-in: abc123",
    "- 2026-05-19 | 12 chats stale-claim | observed-in: def456",
    "## Next section",
    "Now there are 99 engines",
  ].join("\n");
  const r = detectCountClaims(text);
  assert.equal(r.length, 1, "only the post-block engines line should flag");
  assert.equal(r[0].line, 5);
});

test("detectCountClaims: skip lines containing parenthetical date (ship-time context)", () => {
  // Counts inside parentheses with a YYYY-MM-DD date are frozen ship-time
  // facts, not stale pointers. e.g. "(activated 2026-05-16, 12 slot worktrees)"
  const text = "DOCTRINE (activated 2026-05-16): 12 slot worktrees were live at activation";
  const r = detectCountClaims(text);
  assert.equal(r.length, 0);
});

test("detectCountClaims: skip lines containing `Live verification:` snapshot marker", () => {
  const text = "Live verification: 26 chats observed live at 2026-05-16T...";
  const r = detectCountClaims(text);
  assert.equal(r.length, 0);
});

test("detectCountClaims: skip lines starting with `- YYYY-MM-DD |` regression-log marker", () => {
  const text = "- 2026-05-19 | 22 engines wired | observed-in: abc";
  const r = detectCountClaims(text);
  assert.equal(r.length, 0);
});

// U-SAF-E2 fail-on-revert: markdown-bold around the Live verification marker.
// CLAUDE.md writes "**Live verification**:" (bolded) which the original regex
// `/Live verification:/` did NOT match (the `**` between "verification" and ":"
// broke the literal colon).
test("detectCountClaims: skip markdown-bold `**Live verification**:` snapshot marker", () => {
  const text = "**Live verification**: phys 74.5% / commit 96.0%, 12 chat trees, largest=PID 46816";
  const r = detectCountClaims(text);
  assert.equal(r.length, 0);
});

// U-SAF-E2 fail-on-revert: date IMMEDIATELY before an opening paren marks the
// paren content as at-that-date frozen narrative. Layout: "...YYYY-MM-DD (... N foo ...)".
// The earlier E1 parenthetical-date guard required the date INSIDE the parens.
test("detectCountClaims: skip count inside parens following a YYYY-MM-DD date marker", () => {
  const text = "the per-NATO-name model shipped in `SLOT-WORKTREE-MS0` and activated 2026-05-16 (12 slot worktrees `H:/prism-slot-<name>` on `slot/<name>` branches; golf = integrator)";
  const r = detectCountClaims(text);
  assert.equal(r.length, 0);
});

// U-SAF-E2 fail-on-revert: capacity assertion ("all N chats" / "up to N slots")
// is a max/concurrent-capacity claim, not a stale inventory count.
test("detectCountClaims: skip capacity assertions (all N chats / up to N slots)", () => {
  assert.equal(detectCountClaims("Closes the gap when all 26 chats are LIVE.").length, 0);
  assert.equal(detectCountClaims("up to 26 chats running concurrently").length, 0);
  assert.equal(detectCountClaims("max of 26 slots in the fleet").length, 0);
  // But: a stale inventory claim WITHOUT the capacity-quantifier still fires.
  assert.equal(detectCountClaims("722-entry catalog (575 engines + 90 dispatchers + 57 memories)").length, 1);
});

// ─── buildAudit composition ──────────────────────────────────────────────

test("buildAudit: with injected fake readers produces structured output", () => {
  const fakeReadFile = (rel) => {
    if (rel === "CLAUDE.md") return "# CLAUDE.md\n## A-MS0 mentioned\n";
    return null;
  };
  const fakeReadDir = () => [];
  const fakeGitLog = () => [
    { sha: "abc", subject: "[MAIN] [A-MS0]/U-A0: tweak" },
    { sha: "def", subject: "[MAIN] [B-MS0]/U-B0: ship" },
  ];
  const audit = buildAudit({ readFile: fakeReadFile, readDir: fakeReadDir, gitLog: fakeGitLog });
  assert.equal(audit.commitCount, 2);
  assert.equal(audit.milestoneTokenCount, 2);
  assert.ok(audit.findings.some((f) => f.token === "B-MS0" && f.category === 1));
  assert.ok(!audit.findings.some((f) => f.token === "A-MS0"));
  assert.ok(audit.summary.bySeverity);
});

test("buildAudit: throws on missing required readers (fail-loud)", () => {
  assert.throws(() => buildAudit({}), /requires readFile/);
  assert.throws(() => buildAudit({ readFile: () => "" }), /requires readFile \+ gitLog/);
});

test("buildAudit: missing CLAUDE.md (readFile returns null) is handled gracefully", () => {
  const audit = buildAudit({
    readFile: () => null,
    readDir: () => [],
    gitLog: () => [{ sha: "x", subject: "[MAIN] [Z-MS0]/U-Z0: x" }],
  });
  // Z-MS0 should be flagged as missing summary (CLAUDE.md was empty).
  assert.ok(audit.findings.some((f) => f.token === "Z-MS0"));
});

test("buildAudit: zero commits → zero milestone tokens → zero findings", () => {
  const audit = buildAudit({
    readFile: () => "# CLAUDE.md", readDir: () => [], gitLog: () => [],
  });
  assert.equal(audit.milestoneTokenCount, 0);
  assert.equal(audit.findings.length, 0);
});

// U-SAF-C3 fail-on-revert: buildAudit's linkExists treats `target-with-dashes`
// and `target_with_underscores` as equivalent. PRISM memory files live as
// `reference_foo_2026_05_19.md` (underscores); wiki rendering of `[[link]]`
// uses dashes. Without this, every dash-rendered link to a memory file is
// flagged as broken even though the file exists with the underscore form.
test("buildAudit: linkExists resolves dash↔underscore equivalence (U-SAF-C3)", () => {
  const fakeReadFile = (rel) => {
    if (rel === "CLAUDE.md") return "see [[reference-awareness-readiness-2026-05-19]] for detail";
    return null;
  };
  const fakeReadDir = (rel) => {
    if (rel === "knowledge/memories") {
      return [{ name: "reference_awareness_readiness_2026_05_19.md", isFile: () => true, isDirectory: () => false }];
    }
    return [];
  };
  const audit = buildAudit({
    readFile: fakeReadFile, readDir: fakeReadDir, gitLog: () => [],
  });
  // Dash-rendered wikilink should NOT be flagged as broken — the underscore-form
  // file exists.
  const broken = audit.findings.filter((f) => f.category === 3);
  assert.equal(broken.length, 0, "dash↔underscore equivalence failed: " + JSON.stringify(broken));
});

// U-SAF-C3 negative: when neither form exists, the link IS broken.
test("buildAudit: linkExists fails when neither dash nor underscore form exists", () => {
  const fakeReadFile = (rel) => {
    if (rel === "CLAUDE.md") return "see [[truly-missing-target]]";
    return null;
  };
  const fakeReadDir = () => [];
  const audit = buildAudit({
    readFile: fakeReadFile, readDir: fakeReadDir, gitLog: () => [],
  });
  const broken = audit.findings.filter((f) => f.category === 3 && f.link === "truly-missing-target");
  assert.equal(broken.length, 1);
});

// ─── filterBySeverity ───────────────────────────────────────────────────

test("filterBySeverity: floor=high keeps only high findings", () => {
  const audit = {
    findings: [
      { severity: "high", category: 1 },
      { severity: "low", category: 6 },
      { severity: "medium", category: 4 },
    ],
    summary: {},
  };
  const r = filterBySeverity(audit, "high");
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].severity, "high");
});

test("filterBySeverity: invalid floor passes through (no crash)", () => {
  const r = filterBySeverity({ findings: [{ severity: "high", category: 1 }], summary: {} }, "garbage");
  assert.equal(r.findings.length, 1);
});

test("filterBySeverity: null floor returns audit unchanged", () => {
  const audit = { findings: [{ severity: "low", category: 6 }], summary: {} };
  assert.equal(filterBySeverity(audit, null), audit);
});

// ─── Real-data E2E (the U-INTEG-FIX-P0 lesson) ─────────────────────────

test("real-data E2E: against the live H:/prism repo, audit completes without throwing", async () => {
  const readFile = makeReadFile();
  const readDir = makeReadDir();
  const gitLog = await makeGitLogAsync();
  const audit = buildAudit({ readFile, readDir, gitLog, lookbackDays: 7 });
  // The live repo has many recent commits; expect non-empty token list.
  assert.ok(audit.commitCount >= 1, "at least one commit in last 7 days");
  assert.ok(audit.milestoneTokenCount >= 1, "at least one milestone token");
  // Findings shape is well-formed.
  for (const f of audit.findings) {
    assert.ok(["high", "medium", "low"].includes(f.severity), "valid severity");
    assert.ok([1, 3, 5, 6].includes(f.category), "category in {1,3,5,6}");
    assert.ok(typeof f.surface === "string" && f.surface.length > 0);
    assert.ok(typeof f.evidence === "string" && f.evidence.length > 0);
    assert.ok(typeof f.drainAction === "string");
  }
});

test("real-data E2E: severity=high filter never returns low/medium", async () => {
  const readFile = makeReadFile();
  const readDir = makeReadDir();
  const gitLog = await makeGitLogAsync();
  const audit = filterBySeverity(buildAudit({ readFile, readDir, gitLog, lookbackDays: 7 }), "high");
  for (const f of audit.findings) assert.equal(f.severity, "high");
});

// ─── Adversarial inputs ─────────────────────────────────────────────────

test("adversarial: extremely long subject doesn't crash extractMilestoneTokens", () => {
  const huge = "[MAIN] " + "[A-MS0]".repeat(1000);
  const r = extractMilestoneTokens(huge);
  assert.deepEqual(r, ["A-MS0"]);
});

test("adversarial: malformed wikilink syntax doesn't crash detectBrokenWikilinks", () => {
  // The regex only matches well-formed [[X]] where X contains no ']'.
  // [[ ]] = whitespace target → trims to empty → skip.
  // [[]] = empty → regex requires ≥1 char → no match.
  // [[a]b]] = '[[' then 'a' then ']' ends the capture but no ']]' follows → no match.
  // [[ok]] = known stem → not broken.
  // [[missing]] = unknown stem → broken.
  const r = detectBrokenWikilinks("[[ ]] [[]] [[a]b]] [[ok]] [[missing]]", (t) => t === "ok");
  assert.ok(r.includes("missing"), "unknown well-formed link flagged broken");
  assert.ok(!r.includes("ok"), "known well-formed link NOT flagged");
  // Critically: malformed input doesn't crash — that's the adversarial property
  // we're pinning. Whether 'a' is detected or not is regex-implementation detail.
});

test("adversarial: count-claim regex doesn't match version-numbers / dates / SHAs", () => {
  const r = detectCountClaims("v1.2.3 from 2026-05-19 commit abc123def");
  assert.deepEqual(r, []);
});

// ─── Variability ─────────────────────────────────────────────────────────

test("variability: token sets of sizes 0, 1, 10 all handled", () => {
  for (const size of [0, 1, 10]) {
    const tokens = Array.from({ length: size }, (_, i) => "T-MS" + i);
    const r = detectMissingClaudeMdSummaries("", tokens);
    assert.equal(r.length, size);
  }
});

test("variability: lookback windows of 1, 7, 30 days all work in real-data E2E", async () => {
  const readFile = makeReadFile();
  const readDir = makeReadDir();
  const gitLog = await makeGitLogAsync();
  for (const days of [1, 7, 30]) {
    const audit = buildAudit({ readFile, readDir, gitLog, lookbackDays: days });
    assert.ok(audit.lookbackDays === days);
    assert.ok(audit.findings instanceof Array);
  }
});

test("variability: severity floors 'low', 'medium', 'high' produce monotonically-shrinking sets", async () => {
  const readFile = makeReadFile();
  const readDir = makeReadDir();
  const gitLog = await makeGitLogAsync();
  const audit = buildAudit({ readFile, readDir, gitLog, lookbackDays: 30 });
  const low = filterBySeverity(audit, "low").findings.length;
  const medium = filterBySeverity(audit, "medium").findings.length;
  const high = filterBySeverity(audit, "high").findings.length;
  assert.ok(low >= medium, "low ≥ medium count");
  assert.ok(medium >= high, "medium ≥ high count");
});
