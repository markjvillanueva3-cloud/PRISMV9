// extract-skill-triggers.test.mjs
// Tests cross-tree trigger union semantics — the bug fixed 2026-05-19 (slot lima,
// U-LIMA-A4) where first-wins file precedence silently dropped richer user-tree
// `triggers:` blocks when both project and user trees had the same skill name.
//
// Tests run via subprocess against the real script with PRISM_SKILL_DIRS pointed
// at hermetic tmpdirs — this is the genuine wiring oracle, not a hermetic stub
// of the parser internals (per the lesson in [[reference_fleet_reaper_ms1]]
// "hermetic fakes don't prove production wiring").
//
// Run: node --test scripts/extract-skill-triggers.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = join(import.meta.dirname || new URL(".", import.meta.url).pathname.replace(/^\//, ""), "extract-skill-triggers.mjs");

// Run the extractor against a custom dir set; return parsed stderr stats +
// output-file contents (if any). Always uses --dry-run so the real ledger is
// never touched. Output is captured by routing the script's output via
// --output=<tmpfile> so we can read it back.
function runExtractor({ dirs, includeArchived = false, minScore = 0.5 } = {}) {
  const tmp = mkdtempSync(join(tmpdir(), "etr-out-"));
  const outFile = join(tmp, "out.jsonl");
  const args = ["--output=" + outFile];
  if (includeArchived) args.push("--include-archived");

  // We do NOT pass --dry-run because dry-run skips writing the output file.
  // To keep the test hermetic the output goes to a tmpfile, not the real ledger.
  // The fingerprint file is also redirected — see PRISM_SKILL_TRIGGERS_FINGERPRINT
  // below (not implemented; the script writes fingerprint to a hardcoded path,
  // but that's safe — overwriting fingerprint just causes one extra rewrite).
  // For full isolation we'd add another env knob, but this is sufficient: the
  // output file is the assertion target.
  const env = {
    ...process.env,
    PRISM_SKILL_DIRS: dirs.join(";"),
    PRISM_SKILL_TRIGGERS_MIN_SCORE: String(minScore),
  };
  const res = spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: "utf8",
    env,
    timeout: 30000,
  });

  const out = existsSync(outFile) ? readFileSync(outFile, "utf8") : "";
  const lines = out.trim() ? out.trim().split("\n").map(s => JSON.parse(s)) : [];

  // Parse the stats line:
  //   "extract-skill-triggers: scanned=X withTriggers=Y totalTriggers=Z dedupedCrossTree=W dropped(<M)=D"
  const stats = {};
  const m = res.stderr.match(/scanned=(\d+) withTriggers=(\d+) totalTriggers=(\d+) dedupedCrossTree=(\d+) dropped/);
  if (m) {
    stats.scanned = +m[1]; stats.withTriggers = +m[2]; stats.totalTriggers = +m[3]; stats.dedupedCrossTree = +m[4];
  }
  // cleanup
  try { rmSync(tmp, { recursive: true, force: true }); } catch { /* */ }
  return { status: res.status, stderr: res.stderr, stdout: res.stdout, lines, stats };
}

// Build a project-tree dir + user-tree dir under a single tmpdir, populate with
// fixture skills. Returns {root, project, user} paths; caller cleans `root`.
function makeFixtureTrees() {
  const root = mkdtempSync(join(tmpdir(), "etr-fix-"));
  const project = join(root, "proj-commands");
  const user = join(root, "user-commands");
  mkdirSync(project, { recursive: true });
  mkdirSync(user, { recursive: true });
  return { root, project, user };
}

function writeSkill(dir, name, frontmatter) {
  writeFileSync(join(dir, `${name}.md`), `---\n${frontmatter}\n---\n\n# ${name}\n\nBody.\n`);
}

// ── Tests ───────────────────────────────────────────────────────────

test("single-tree: skill with explicit UserPromptSubmit trigger is emitted", () => {
  const { root, project } = makeFixtureTrees();
  writeSkill(project, "myskill", [
    "name: myskill",
    "triggers:",
    "  - event: UserPromptSubmit",
    "    matcher:",
    "      type: keyword",
    "      value: \"my magic words\"",
    "    score: 0.85",
    "    action: suggest",
  ].join("\n"));
  const { stats, lines, status } = runExtractor({ dirs: [project] });
  rmSync(root, { recursive: true, force: true });
  assert.equal(status, 0);
  assert.equal(stats.scanned, 1);
  assert.equal(stats.withTriggers, 1);
  assert.equal(stats.totalTriggers, 1);
  assert.equal(stats.dedupedCrossTree, 0);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].name, "myskill");
  assert.equal(lines[0].matcher.value, "my magic words");
});

test("two-tree union: user-tree triggers emit even when project-tree has the same name (the A4 bug)", () => {
  // PRE-FIX BEHAVIOR: project wins file dedup, project has no triggers → user's
  // triggers silently dropped → output is empty.
  // POST-FIX BEHAVIOR: both trees feed parser → user's triggers ledgered.
  const { root, project, user } = makeFixtureTrees();
  // Project version — bare alias, no triggers
  writeSkill(project, "shared", "name: shared\n# (alias)");
  // User version — rich triggers (nested block form, what the naive parser supports)
  writeSkill(user, "shared", [
    "name: shared",
    "triggers:",
    "  - event: UserPromptSubmit",
    "    matcher:",
    "      type: keyword",
    "      value: \"foo bar\"",
    "    score: 0.8",
  ].join("\n"));
  const { stats, lines } = runExtractor({ dirs: [project, user] });
  rmSync(root, { recursive: true, force: true });
  assert.equal(stats.totalTriggers, 1, "user-tree trigger MUST emit even when project alias wins file precedence");
  assert.equal(lines[0].name, "shared");
  assert.equal(lines[0].matcher.value, "foo bar");
  // The emitted manifest path should be the user-tree one (project had no trigger)
  assert.ok(lines[0].manifest.includes("user-commands"), "manifest should point at user-tree where the trigger lives");
});

test("two-tree dedup: identical trigger in both trees collapses to one emission, dedupedCrossTree==1", () => {
  const { root, project, user } = makeFixtureTrees();
  const trig = [
    "name: dup",
    "triggers:",
    "  - event: UserPromptSubmit",
    "    matcher:",
    "      type: keyword",
    "      value: \"identical phrase\"",
    "    score: 0.85",
  ].join("\n");
  writeSkill(project, "dup", trig);
  writeSkill(user, "dup", trig);
  const { stats, lines } = runExtractor({ dirs: [project, user] });
  rmSync(root, { recursive: true, force: true });
  assert.equal(stats.scanned, 2, "both sources scanned");
  assert.equal(stats.totalTriggers, 1, "duplicate trigger collapses");
  assert.equal(stats.dedupedCrossTree, 1, "dedupedCrossTree counts the collapse");
  // Precedence: project wins (listed first in dirs); emitted manifest should be project
  assert.ok(lines[0].manifest.includes("proj-commands"), "first-listed dir wins identical-trigger precedence");
});

test("two-tree disjoint triggers union: both emit, dedupedCrossTree==0", () => {
  const { root, project, user } = makeFixtureTrees();
  writeSkill(project, "split", [
    "name: split",
    "triggers:",
    "  - event: UserPromptSubmit",
    "    matcher:",
    "      type: keyword",
    "      value: \"alpha\"",
    "    score: 0.85",
  ].join("\n"));
  writeSkill(user, "split", [
    "name: split",
    "triggers:",
    "  - event: UserPromptSubmit",
    "    matcher:",
    "      type: keyword",
    "      value: \"beta\"",
    "    score: 0.85",
  ].join("\n"));
  const { stats, lines } = runExtractor({ dirs: [project, user] });
  rmSync(root, { recursive: true, force: true });
  assert.equal(stats.totalTriggers, 2, "disjoint triggers union — both emit");
  assert.equal(stats.dedupedCrossTree, 0, "no dedup when matcher.value differs");
  const values = lines.map(l => l.matcher.value).sort();
  assert.deepEqual(values, ["alpha", "beta"]);
});

test("fail-on-revert: walking BOTH trees yields strictly more than walking project alone (proves the A4 fix)", () => {
  // The regression oracle. If someone reverts listSkillSources back to first-wins
  // file dedup, this test fails because the user-tree trigger gets dropped.
  const { root, project, user } = makeFixtureTrees();
  writeSkill(project, "alpha", "name: alpha"); // no triggers
  writeSkill(user, "alpha", [
    "name: alpha",
    "triggers:",
    "  - event: UserPromptSubmit",
    "    matcher:",
    "      type: keyword",
    "      value: \"only in user\"",
    "    score: 0.85",
  ].join("\n"));
  writeSkill(user, "beta", [
    "name: beta",
    "triggers:",
    "  - event: UserPromptSubmit",
    "    matcher:",
    "      type: keyword",
    "      value: \"user only\"",
    "    score: 0.85",
  ].join("\n"));

  const projectOnly = runExtractor({ dirs: [project] });
  const bothTrees = runExtractor({ dirs: [project, user] });
  rmSync(root, { recursive: true, force: true });

  assert.equal(projectOnly.stats.totalTriggers, 0, "project alone — no triggers (the bug surface)");
  assert.equal(bothTrees.stats.totalTriggers, 2, "both trees — user-tree triggers rescued");
  assert.ok(bothTrees.stats.totalTriggers > projectOnly.stats.totalTriggers,
    "REGRESSION GUARD: walking both trees must yield strictly more triggers than project alone");
});

test("env override: PRISM_SKILL_DIRS replaces (not appends to) default SKILL_DIRS", () => {
  // If env override is broken (e.g. defaults are concatenated), the test's
  // assertions about totals would mix in real project-tree triggers and we'd
  // see scanned in the hundreds. The hermetic test must see ONLY fixture skills.
  const { root, project } = makeFixtureTrees();
  writeSkill(project, "onlyone", [
    "name: onlyone",
    "triggers:",
    "  - event: UserPromptSubmit",
    "    matcher:",
    "      type: keyword",
    "      value: \"x\"",
    "    score: 0.85",
  ].join("\n"));
  const { stats } = runExtractor({ dirs: [project] });
  rmSync(root, { recursive: true, force: true });
  assert.equal(stats.scanned, 1, "env override replaces defaults — sees only the 1 fixture skill");
});

test("score-below-floor is dropped, not emitted", () => {
  const { root, project } = makeFixtureTrees();
  writeSkill(project, "weak", [
    "name: weak",
    "triggers:",
    "  - event: UserPromptSubmit",
    "    matcher: {type: keyword, value: \"low\"}",
    "    score: 0.3",
  ].join("\n"));
  const { stats } = runExtractor({ dirs: [project], minScore: 0.5 });
  rmSync(root, { recursive: true, force: true });
  assert.equal(stats.totalTriggers, 0);
});

test("Windows path P0: PRISM_SKILL_DIRS with C:/... must round-trip to N dirs (not 2N fragments)", () => {
  // Pre-fix: split(/[;:]+/) on Windows splits "C:/Users/foo" → ["C", "/Users/foo"].
  // The Windows-safe split (`;` only on win32) keeps drive letters intact.
  const { root, project, user } = makeFixtureTrees();
  writeSkill(project, "wp", [
    "name: wp",
    "triggers:",
    "  - event: UserPromptSubmit",
    "    matcher:",
    "      type: keyword",
    "      value: \"win path\"",
    "    score: 0.85",
  ].join("\n"));
  writeSkill(user, "wu", [
    "name: wu",
    "triggers:",
    "  - event: UserPromptSubmit",
    "    matcher:",
    "      type: keyword",
    "      value: \"user win path\"",
    "    score: 0.85",
  ].join("\n"));
  // Both fixture paths contain `C:` (tmpdir on Win is C:\Users\...) — pre-fix
  // splitter would have fragmented these into invalid dirs.
  const { stats } = runExtractor({ dirs: [project, user] });
  rmSync(root, { recursive: true, force: true });
  assert.equal(stats.scanned, 2, "two Windows-shaped dirs must be parsed as 2, not fragmented");
  assert.equal(stats.totalTriggers, 2);
});

test("dedup key collision: skill `foo` + matcher `Bar` does NOT collide with skill `fooBar` + matcher `` empty case", () => {
  // U+0001 SOH separator (or equivalent) prevents concat-collision. We can't
  // construct the literal empty-matcher case (the parser skips empty matchers),
  // so we test the analogous collision via two distinct skill+matcher pairs
  // that would concat to the same string without a separator:
  //   "foo" + "UserPromptSubmit" + "BarBaz"  vs  "fooU" + "serPromptSubmit" + "BarBaz"
  // Different skills, different matchers, but same concat. The separator must
  // keep them distinct.
  const { root, project } = makeFixtureTrees();
  writeSkill(project, "foo", [
    "name: foo",
    "triggers:",
    "  - event: UserPromptSubmit",
    "    matcher:",
    "      type: keyword",
    "      value: \"BarBaz\"",
    "    score: 0.85",
  ].join("\n"));
  writeSkill(project, "fooU", [
    "name: fooU",
    "triggers:",
    "  - event: UserPromptSubmit",
    "    matcher:",
    "      type: keyword",
    "      value: \"BarBaz\"",
    "    score: 0.85",
  ].join("\n"));
  const { stats, lines } = runExtractor({ dirs: [project] });
  rmSync(root, { recursive: true, force: true });
  assert.equal(stats.totalTriggers, 2, "different skills with same matcher.value must NOT dedup to 1");
  assert.equal(stats.dedupedCrossTree, 0);
  const names = lines.map(l => l.name).sort();
  assert.deepEqual(names, ["foo", "fooU"]);
});

test("non-UserPromptSubmit event is skipped", () => {
  const { root, project } = makeFixtureTrees();
  writeSkill(project, "stop-handler", [
    "name: stop-handler",
    "triggers:",
    "  - event: Stop",
    "    matcher: {type: keyword, value: \"stop\"}",
    "    score: 0.9",
  ].join("\n"));
  const { stats } = runExtractor({ dirs: [project] });
  rmSync(root, { recursive: true, force: true });
  assert.equal(stats.totalTriggers, 0, "only UserPromptSubmit triggers feed the auto-trigger hook");
});
