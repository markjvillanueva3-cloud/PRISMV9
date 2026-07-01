/**
 * handoff-prune.test.mjs — node:test suite for the supersession-aware
 * handoff archiver (SYSTEM-SYNERGY-AUDIT Track H6).
 *
 * Coverage: extractInstance + planPrune (pure), readLiveHandoffs + applyPlan
 * (real-fs against a tmpdir), and a subprocess oracle exercising the CLI
 * main() — the "pure-core MUST ship a subprocess integration oracle" lesson
 * from U-SLOT-BIND-ENFORCE.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { extractInstance, planPrune, readLiveHandoffs, applyPlan } from "./handoff-prune.mjs";

const SCRIPT = fileURLToPath(new URL("./handoff-prune.mjs", import.meta.url));
const DAY = 24 * 60 * 60 * 1000;

function tmpHandoffDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "handoff-prune-test-"));
}
function writeHandoff(dir, name, mtimeMsAgo = 0) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, `# HANDOFF\n## RESUME\nwork ${name}\n`);
  if (mtimeMsAgo > 0) {
    const t = new Date(Date.now() - mtimeMsAgo);
    fs.utimesSync(p, t, t);
  }
  return p;
}

// ── extractInstance ────────────────────────────────────────────────────────

test("extractInstance — claude-<8hex> pattern", () => {
  assert.equal(
    extractInstance("HANDOFF-claude-d7f91ed3-echo-wire-unwired.md"),
    "claude-d7f91ed3",
  );
});

test("extractInstance — Agent@host_pid pattern (key lowercased)", () => {
  // The Agent@ key is lowercased so case-variants of one host never split
  // into two groups — the live dir has both `Agent@` and `agent@` forms.
  assert.equal(
    extractInstance("HANDOFF-Agent@DESKTOP-N7MI1VB_pid-18748-kilo-work.md"),
    "agent@desktop-n7mi1vb_pid-18748",
  );
});

test("extractInstance — case-folds the claude hex id", () => {
  assert.equal(
    extractInstance("HANDOFF-claude-D7F91ED3-echo-work.md"),
    "claude-d7f91ed3",
  );
});

test("extractInstance — null on a non-HANDOFF filename", () => {
  assert.equal(extractInstance("README.md"), null);
  assert.equal(extractInstance("notes.txt"), null);
});

test("extractInstance — topicless HANDOFF-claude-<8hex>.md still resolves", () => {
  // The topic segment is optional. A chat that wrote one topicless handoff
  // must still group with its topic'd siblings, never split off as a
  // separate instance — so the older of the two is provably superseded.
  assert.equal(extractInstance("HANDOFF-claude-d7f91ed3.md"), "claude-d7f91ed3");
});

test("extractInstance — capital Claude- prefix folds onto the lowercase key", () => {
  // Live data has both `claude-` and `Claude-`; the match is /i and the
  // key lowercased so the two prefixes never group separately.
  assert.equal(extractInstance("HANDOFF-Claude-D7F91ED3-echo-work.md"), "claude-d7f91ed3");
});

test("extractInstance — claude-Agent@ wrapper collapses onto the bare Agent@ key", () => {
  // The optional claude- wrapper must yield the SAME instance as the bare
  // Agent@ form, so HANDOFF-claude-Agent@… and HANDOFF-Agent@… for one
  // host+pid never split into two groups.
  const wrapped = extractInstance("HANDOFF-claude-Agent@HOST-A_pid-4242-topic.md");
  const bare = extractInstance("HANDOFF-Agent@HOST-A_pid-4242-other.md");
  assert.equal(wrapped, "agent@host-a_pid-4242");
  assert.equal(bare, "agent@host-a_pid-4242");
  assert.equal(wrapped, bare);
});

test("extractInstance — unparseable ids stay null (own singleton, fail-safe)", () => {
  // Pure-topic, slot-keyed golf, and longer-than-8-hex ids match no
  // instance pattern → null → planPrune gives each its own singleton
  // group so it is never archived as a sibling of an unrelated chat.
  assert.equal(extractInstance("HANDOFF-golf-cleanup.md"), null);
  assert.equal(extractInstance("HANDOFF-wire-unwired-ms0.md"), null);
  assert.equal(extractInstance("HANDOFF-claude-d7f91ed3aa-topic.md"), null); // 10 hex, not 8
});

test("extractInstance — null on non-string input", () => {
  assert.equal(extractInstance(null), null);
  assert.equal(extractInstance(undefined), null);
  assert.equal(extractInstance(42), null);
});

// ── planPrune — supersession ────────────────────────────────────────────────

test("planPrune — newest sibling kept, older sibling archived as superseded", () => {
  const now = Date.now();
  const plan = planPrune([
    { file: "HANDOFF-claude-aaaaaaaa-topic-old.md", mtimeMs: now - 2 * DAY },
    { file: "HANDOFF-claude-aaaaaaaa-topic-new.md", mtimeMs: now - 1 * DAY },
  ], { now });
  assert.deepEqual(plan.keep, ["HANDOFF-claude-aaaaaaaa-topic-new.md"]);
  assert.equal(plan.archive.length, 1);
  assert.equal(plan.archive[0].file, "HANDOFF-claude-aaaaaaaa-topic-old.md");
  assert.equal(plan.archive[0].reason, "superseded");
});

test("planPrune — 3 siblings: newest kept, 2 archived", () => {
  const now = Date.now();
  const plan = planPrune([
    { file: "HANDOFF-claude-bbbbbbbb-a.md", mtimeMs: now - 3 * DAY },
    { file: "HANDOFF-claude-bbbbbbbb-b.md", mtimeMs: now - 2 * DAY },
    { file: "HANDOFF-claude-bbbbbbbb-c.md", mtimeMs: now - 1 * DAY },
  ], { now });
  assert.deepEqual(plan.keep, ["HANDOFF-claude-bbbbbbbb-c.md"]);
  assert.equal(plan.archive.length, 2);
  assert.ok(plan.archive.every((a) => a.reason === "superseded"));
});

test("planPrune — recent singleton is kept", () => {
  const now = Date.now();
  const plan = planPrune([
    { file: "HANDOFF-claude-cccccccc-only.md", mtimeMs: now - 1 * DAY },
  ], { now, maxAgeDays: 45 });
  assert.deepEqual(plan.keep, ["HANDOFF-claude-cccccccc-only.md"]);
  assert.equal(plan.archive.length, 0);
});

test("planPrune — aged singleton archived as aged-out when not the freshest", () => {
  const now = Date.now();
  const plan = planPrune([
    { file: "HANDOFF-claude-dddddddd-dead.md", mtimeMs: now - 60 * DAY },
    { file: "HANDOFF-claude-eeeeeeee-live.md", mtimeMs: now - 1 * DAY },
  ], { now, maxAgeDays: 45 });
  assert.ok(plan.keep.includes("HANDOFF-claude-eeeeeeee-live.md"));
  assert.equal(plan.archive.length, 1);
  assert.equal(plan.archive[0].file, "HANDOFF-claude-dddddddd-dead.md");
  assert.equal(plan.archive[0].reason, "aged-out");
});

test("planPrune — aged singleton kept when it IS the freshest file (idle-fleet guard)", () => {
  const now = Date.now();
  // Every file is ancient; the freshest one must still survive.
  const plan = planPrune([
    { file: "HANDOFF-claude-ffffffff-x.md", mtimeMs: now - 70 * DAY },
    { file: "HANDOFF-claude-99999999-y.md", mtimeMs: now - 50 * DAY },
  ], { now, maxAgeDays: 45 });
  // The 50-day file is the freshest → kept despite being aged.
  assert.ok(plan.keep.includes("HANDOFF-claude-99999999-y.md"));
  // The 70-day file is aged AND not freshest → archived.
  assert.deepEqual(plan.archive.map((a) => a.file), ["HANDOFF-claude-ffffffff-x.md"]);
});

test("planPrune — null-instance file is its own singleton, not mis-grouped", () => {
  const now = Date.now();
  const plan = planPrune([
    { file: "HANDOFF-weird-format.md", mtimeMs: now - 1 * DAY },
    { file: "HANDOFF-also-weird.md", mtimeMs: now - 2 * DAY },
  ], { now, maxAgeDays: 45 });
  // Two unparseable names — each its own group, both recent → both kept,
  // never archived as siblings of each other.
  assert.equal(plan.keep.length, 2);
  assert.equal(plan.archive.length, 0);
});

test("planPrune — multiple instances are pruned independently", () => {
  const now = Date.now();
  const plan = planPrune([
    { file: "HANDOFF-claude-11111111-a.md", mtimeMs: now - 2 * DAY },
    { file: "HANDOFF-claude-11111111-b.md", mtimeMs: now - 1 * DAY },
    { file: "HANDOFF-claude-22222222-a.md", mtimeMs: now - 2 * DAY },
    { file: "HANDOFF-claude-22222222-b.md", mtimeMs: now - 1 * DAY },
  ], { now });
  assert.equal(plan.groups, 2);
  assert.equal(plan.keep.length, 2);
  assert.equal(plan.archive.length, 2);
  assert.ok(plan.keep.includes("HANDOFF-claude-11111111-b.md"));
  assert.ok(plan.keep.includes("HANDOFF-claude-22222222-b.md"));
});

test("planPrune — empty input yields an empty plan", () => {
  const plan = planPrune([], { now: Date.now() });
  assert.deepEqual(plan.keep, []);
  assert.deepEqual(plan.archive, []);
  assert.equal(plan.groups, 0);
});

test("planPrune — non-array input is fail-safe (empty plan, no throw)", () => {
  assert.doesNotThrow(() => planPrune(null));
  assert.doesNotThrow(() => planPrune(undefined));
  assert.doesNotThrow(() => planPrune("not an array"));
  assert.equal(planPrune(null).archive.length, 0);
});

test("planPrune — malformed entries are filtered out", () => {
  const now = Date.now();
  const plan = planPrune([
    { file: "HANDOFF-claude-33333333-good.md", mtimeMs: now - 1 * DAY },
    { file: "HANDOFF-claude-33333333-bad.md" },          // no mtimeMs
    { mtimeMs: now },                                    // no file
    null,                                                // junk
  ], { now });
  // Only the one valid entry survives → kept singleton.
  assert.deepEqual(plan.keep, ["HANDOFF-claude-33333333-good.md"]);
  assert.equal(plan.archive.length, 0);
});

// ── readLiveHandoffs (real fs) ──────────────────────────────────────────────

test("readLiveHandoffs — picks up HANDOFF-*.md, skips .archive. and non-files", () => {
  const dir = tmpHandoffDir();
  try {
    writeHandoff(dir, "HANDOFF-claude-44444444-a.md");
    writeHandoff(dir, "HANDOFF-claude-55555555-b.md");
    writeHandoff(dir, "HANDOFF-claude-66666666-c.archive.2026-05-01.md"); // archived suffix
    fs.writeFileSync(path.join(dir, "notes.txt"), "x");                   // not a handoff
    fs.mkdirSync(path.join(dir, "HANDOFF-claude-77777777-dir.md"));       // dir, not file
    const entries = readLiveHandoffs(dir);
    const files = entries.map((e) => e.file).sort();
    assert.deepEqual(files, [
      "HANDOFF-claude-44444444-a.md",
      "HANDOFF-claude-55555555-b.md",
    ]);
    for (const e of entries) assert.ok(Number.isFinite(e.mtimeMs));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ── applyPlan (real fs) ─────────────────────────────────────────────────────

test("applyPlan — moves archived files into archive/ and leaves kept files", () => {
  const dir = tmpHandoffDir();
  const archiveDir = path.join(dir, "archive");
  try {
    writeHandoff(dir, "HANDOFF-claude-88888888-old.md");
    writeHandoff(dir, "HANDOFF-claude-88888888-new.md");
    const plan = {
      keep: ["HANDOFF-claude-88888888-new.md"],
      archive: [{ file: "HANDOFF-claude-88888888-old.md", reason: "superseded" }],
    };
    const res = applyPlan(plan, dir, archiveDir);
    assert.deepEqual(res.moved, ["HANDOFF-claude-88888888-old.md"]);
    assert.equal(res.failed.length, 0);
    assert.ok(fs.existsSync(path.join(dir, "HANDOFF-claude-88888888-new.md")));
    assert.ok(!fs.existsSync(path.join(dir, "HANDOFF-claude-88888888-old.md")));
    assert.ok(fs.existsSync(path.join(archiveDir, "HANDOFF-claude-88888888-old.md")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("applyPlan — never clobbers an existing archived file of the same name", () => {
  const dir = tmpHandoffDir();
  const archiveDir = path.join(dir, "archive");
  try {
    writeHandoff(dir, "HANDOFF-claude-aaaaaaaa-dup.md");
    fs.mkdirSync(archiveDir, { recursive: true });
    fs.writeFileSync(path.join(archiveDir, "HANDOFF-claude-aaaaaaaa-dup.md"), "PRIOR");
    const plan = { keep: [], archive: [{ file: "HANDOFF-claude-aaaaaaaa-dup.md", reason: "superseded" }] };
    const res = applyPlan(plan, dir, archiveDir);
    assert.equal(res.moved.length, 1);
    // Prior archived file is untouched; the new one landed under a suffixed name.
    assert.equal(fs.readFileSync(path.join(archiveDir, "HANDOFF-claude-aaaaaaaa-dup.md"), "utf8"), "PRIOR");
    const suffixed = fs.readdirSync(archiveDir).filter((f) => f.startsWith("HANDOFF-claude-aaaaaaaa-dup.md."));
    assert.equal(suffixed.length, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("applyPlan — a rename failure is COLLECTED into failed[], never thrown", () => {
  // The primary mutation's error branch (R12 fail-loud): a planned file
  // that cannot be renamed must be caught per-item into failed[] — applyPlan
  // must not throw (one bad file can't abort the whole sweep) and must not
  // fake success. Here the plan references a file that does not exist on
  // disk, so renameSync throws ENOENT.
  const dir = tmpHandoffDir();
  const archiveDir = path.join(dir, "archive");
  try {
    const plan = {
      keep: [],
      archive: [{ file: "HANDOFF-claude-12121212-ghost.md", reason: "superseded" }],
    };
    let res;
    assert.doesNotThrow(() => { res = applyPlan(plan, dir, archiveDir); });
    assert.equal(res.moved.length, 0);
    assert.equal(res.failed.length, 1);
    assert.equal(res.failed[0].file, "HANDOFF-claude-12121212-ghost.md");
    assert.ok(res.failed[0].error, "failed entry must carry the error message");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ── subprocess oracle — CLI main() ──────────────────────────────────────────

function runCli(dir, args = [], extraEnv = {}) {
  return execFileSync(process.execPath, [SCRIPT, ...args], {
    env: { ...process.env, PRISM_HANDOFF_PRUNE_DIR: dir, ...extraEnv },
    encoding: "utf8",
  });
}

test("CLI — dry-run prints the plan and moves nothing", () => {
  const dir = tmpHandoffDir();
  try {
    writeHandoff(dir, "HANDOFF-claude-bbbbbbbb-old.md", 2 * DAY);
    writeHandoff(dir, "HANDOFF-claude-bbbbbbbb-new.md", 1 * DAY);
    const out = JSON.parse(runCli(dir, ["--json"]));
    assert.equal(out.ok, true);
    assert.equal(out.apply, false);
    assert.equal(out.live_handoffs, 2);
    assert.equal(out.archive_planned, 1);
    assert.equal(out.superseded, 1);
    // Dry-run — both files still present.
    assert.ok(fs.existsSync(path.join(dir, "HANDOFF-claude-bbbbbbbb-old.md")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI — --apply archives the superseded handoff", () => {
  const dir = tmpHandoffDir();
  try {
    writeHandoff(dir, "HANDOFF-claude-cccccccc-old.md", 2 * DAY);
    writeHandoff(dir, "HANDOFF-claude-cccccccc-new.md", 1 * DAY);
    const out = JSON.parse(runCli(dir, ["--json", "--apply"]));
    assert.equal(out.ok, true);
    assert.equal(out.apply, true);
    assert.equal(out.archived, 1);
    assert.ok(!fs.existsSync(path.join(dir, "HANDOFF-claude-cccccccc-old.md")));
    assert.ok(fs.existsSync(path.join(dir, "archive", "HANDOFF-claude-cccccccc-old.md")));
    assert.ok(fs.existsSync(path.join(dir, "HANDOFF-claude-cccccccc-new.md")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI — PRISM_HANDOFF_PRUNE_DISABLE=1 makes the runner a no-op", () => {
  const dir = tmpHandoffDir();
  try {
    writeHandoff(dir, "HANDOFF-claude-dddddddd-old.md", 2 * DAY);
    writeHandoff(dir, "HANDOFF-claude-dddddddd-new.md", 1 * DAY);
    const out = JSON.parse(runCli(dir, ["--json", "--apply"], { PRISM_HANDOFF_PRUNE_DISABLE: "1" }));
    assert.equal(out.disabled, true);
    // Nothing moved.
    assert.ok(fs.existsSync(path.join(dir, "HANDOFF-claude-dddddddd-old.md")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI — fails loud (exit 1) on a missing handoffs dir", () => {
  const missing = path.join(os.tmpdir(), `handoff-prune-nonexistent-${Date.now()}`);
  let threw = false;
  try {
    runCli(missing, ["--json"]);
  } catch (e) {
    threw = true;
    assert.equal(e.status, 1); // non-zero exit — R12 fail-loud
  }
  assert.ok(threw, "CLI must exit non-zero when the handoffs dir cannot be read");
});

// NOTE — applyPlan move-failure → CLI exit 1 is covered WITHOUT a dedicated
// subprocess oracle, deliberately. The failure LOGIC (renameSync throws →
// caught per-item → failed[] populated, no throw) is proven cross-platform
// and deterministically by the "applyPlan — a rename failure is COLLECTED
// into failed[]" unit test above. The CLI GLUE that turns that into a
// non-zero exit is the single line `return result.ok ? 0 : 1` feeding
// `process.exit(main(...))` — the exact same return path the "CLI — fails
// loud (exit 1) on a missing handoffs dir" oracle already exercises end to
// end (only the SOURCE of ok:false differs: readLiveHandoffs throw there,
// applyPlan failed[] here). An earlier attempt to force a real mid-apply
// rename failure in a subprocess via an open-handle lock proved
// non-deterministic on this Node/libuv build (the rename succeeded), and a
// flaky test is worse than none — the two deterministic tests together
// cover the branch and the glue without it. (R12: documented, not hidden.)
