// Tests for stop-task-boundary-compact-nudge.mjs (SESSION-CONTINUITY-AGENTIC/U-TASK-BOUNDARY-COMPACT)
// R9: real fixtures, assert exact behavior (fire condition, band edges, batch
// floor, bound cap, both knobs, handoff append idempotency + RESUME preservation,
// honest-limit ENFORCE block). Hermetic: PRISM_TEST_* overrides + injected batch
// count bypass git. node:test.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const HOOK = resolve("H:/prism/.claude/hooks/stop-task-boundary-compact-nudge.mjs");
const SID = "claude-deadbeef";

function setupFixture(opts = {}) {
  const {
    slot = "alpha",
    sid = SID,
    slotChatId = sid,        // chat-slots mapping; override to force "unknown"
    pct = 0.65,              // null => no sidecar written
    ageMs = 1000,            // sidecar age; > TTL (180000) => stale
    handoffBody = null,      // null => no handoff file
    stampCount = null,       // null => no prior nudges
  } = opts;
  const dir = mkdtempSync(join(tmpdir(), "tbc-"));
  const slotsFile = join(dir, "chat-slots.json");
  writeFileSync(slotsFile, JSON.stringify({
    slots: { [slot]: { chatId: slotChatId, lastHeartbeat: new Date().toISOString() } },
  }));
  const sidecarDir = join(dir, "sidecar"); mkdirSync(sidecarDir);
  if (pct != null) {
    writeFileSync(join(sidecarDir, `token-budget-${slot}.json`), JSON.stringify({
      capturedAt: new Date(Date.now() - ageMs).toISOString(),
      ctx: { tokens: Math.round(pct * 1e6), maxTokens: 1e6, pct },
      zone: "YELLOW",
    }));
  }
  const handoffsDir = join(dir, "handoffs"); mkdirSync(handoffsDir);
  // Handoffs are keyed by the short chatId (HANDOFF-<chatId>-<topic>.md), NOT the
  // full-uuid sid -- mirror the real layout so findHandoff's anchored match is tested.
  let handoffPath = null;
  if (handoffBody != null) {
    handoffPath = join(handoffsDir, `HANDOFF-${slotChatId}-topic.md`);
    writeFileSync(handoffPath, handoffBody);
  }
  const stampDir = join(dir, "stamps"); mkdirSync(stampDir);
  if (stampCount != null) writeFileSync(join(stampDir, `${sid}.count`), String(stampCount));
  return { dir, slotsFile, sidecarDir, handoffsDir, handoffPath, stampDir, sid, slot };
}

function runHook(fx, { batch = 5, env = {}, realGit = false } = {}) {
  const fullEnv = {
    ...process.env,
    PRISM_TEST_SLOTS_FILE: fx.slotsFile,
    PRISM_TEST_SIDECAR_DIR: fx.sidecarDir,
    PRISM_TEST_HANDOFFS_DIR: fx.handoffsDir,
    PRISM_TEST_STAMP_DIR: fx.stampDir,
    // Clear any inherited knobs so the host env can't perturb the test.
    PRISM_TASK_BOUNDARY_COMPACT_DISABLE: "",
    PRISM_TASK_BOUNDARY_COMPACT_ENFORCE: "",
    ...env,
  };
  if (realGit) {
    // Exercise the production git rev-list path: point REPO_ROOT at a real repo
    // and do NOT inject the count.
    fullEnv.PRISM_TEST_REPO_ROOT = fx.repoRoot;
    delete fullEnv.PRISM_TEST_BATCH_COUNT;
  } else {
    fullEnv.PRISM_TEST_BATCH_COUNT = String(batch);
  }
  const out = execFileSync(process.execPath, [HOOK], {
    input: JSON.stringify({ session_id: fx.sid, hook_event_name: "Stop" }),
    encoding: "utf-8",
    env: fullEnv,
  });
  return JSON.parse(out.trim());
}

function handoffText(fx) {
  return fx.handoffPath ? readFileSync(fx.handoffPath, "utf-8") : "";
}
function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

test("FIRE: batch>=min + ctx in band -> systemMessage + handoff COMPACT_SEAM, RESUME preserved", () => {
  const fx = setupFixture({ pct: 0.65, handoffBody: "# Handoff\n\n## RESUME\n\nDo the next thing.\n" });
  const res = runHook(fx, { batch: 5 });
  assert.equal(res.continue, true);
  assert.ok(!res.suppressOutput, "advisory fire must not suppress");
  assert.match(res.systemMessage, /TASK\/BATCH BOUNDARY/);
  assert.match(res.systemMessage, /5 commit/);
  const h = handoffText(fx);
  assert.match(h, /## COMPACT_SEAM/, "handoff gains a COMPACT_SEAM block");
  assert.match(h, /## RESUME/, "existing RESUME section preserved (append-only)");
  assert.match(h, /5 commit\(s\)/);
});

test("NO-FIRE: ctx below MIN_PCT -> suppressOutput, handoff untouched", () => {
  const fx = setupFixture({ pct: 0.40, handoffBody: "# H\n\n## RESUME\nx\n" });
  const res = runHook(fx, { batch: 5 });
  assert.equal(res.continue, true);
  assert.equal(res.suppressOutput, true);
  assert.equal(res.systemMessage, undefined);
  assert.equal(countOccurrences(handoffText(fx), "## COMPACT_SEAM"), 0);
});

test("NO-FIRE: ctx at/above MAX_PCT (precompact-auto owns it) -> suppressOutput", () => {
  const fx = setupFixture({ pct: 0.90, handoffBody: "# H\n" });
  const res = runHook(fx, { batch: 5 });
  assert.equal(res.suppressOutput, true);
  assert.equal(countOccurrences(handoffText(fx), "## COMPACT_SEAM"), 0);
});

test("NO-FIRE: batch < MIN_COMMITS -> suppressOutput", () => {
  const fx = setupFixture({ pct: 0.65, handoffBody: "# H\n" });
  const res = runHook(fx, { batch: 2 });
  assert.equal(res.suppressOutput, true);
  assert.equal(countOccurrences(handoffText(fx), "## COMPACT_SEAM"), 0);
});

test("NO-FIRE: no fresh sidecar (conservative never-blind)", () => {
  const fx = setupFixture({ pct: null, handoffBody: "# H\n" });
  const res = runHook(fx, { batch: 5 });
  assert.equal(res.suppressOutput, true);
  assert.equal(countOccurrences(handoffText(fx), "## COMPACT_SEAM"), 0);
});

test("NO-FIRE: stale sidecar (age > TTL) -> suppressOutput", () => {
  const fx = setupFixture({ pct: 0.65, ageMs: 200_000, handoffBody: "# H\n" });
  const res = runHook(fx, { batch: 5 });
  assert.equal(res.suppressOutput, true);
  assert.equal(countOccurrences(handoffText(fx), "## COMPACT_SEAM"), 0);
});

test("BOUND: nudge cap hit (count=3) -> suppressOutput, no further append", () => {
  const fx = setupFixture({ pct: 0.65, handoffBody: "# H\n", stampCount: 3 });
  const res = runHook(fx, { batch: 5 });
  assert.equal(res.suppressOutput, true);
  assert.equal(countOccurrences(handoffText(fx), "## COMPACT_SEAM"), 0);
});

test("KNOB: DISABLE -> no-op suppressOutput", () => {
  const fx = setupFixture({ pct: 0.65, handoffBody: "# H\n" });
  const res = runHook(fx, { batch: 5, env: { PRISM_TASK_BOUNDARY_COMPACT_DISABLE: "1" } });
  assert.equal(res.suppressOutput, true);
  assert.equal(countOccurrences(handoffText(fx), "## COMPACT_SEAM"), 0);
});

test("KNOB: ENFORCE -> decision:block with the boundary directive", () => {
  const fx = setupFixture({ pct: 0.65, handoffBody: "# H\n" });
  const res = runHook(fx, { batch: 5, env: { PRISM_TASK_BOUNDARY_COMPACT_ENFORCE: "1" } });
  assert.equal(res.decision, "block");
  assert.match(res.reason, /TASK\/BATCH BOUNDARY/);
  assert.match(res.reason, /cannot self-fire \/compact/);
  // Even in ENFORCE the handoff still gets the durable seam block.
  assert.match(handoffText(fx), /## COMPACT_SEAM/);
});

test("IDEMPOTENT: re-fire replaces the COMPACT_SEAM block (single occurrence)", () => {
  // Pre-seed a handoff that ALREADY carries a stale COMPACT_SEAM + a trailing section.
  const seeded = "# H\n\n## COMPACT_SEAM\n\nstale block\n\n## OTHER\nkeep me\n";
  const fx = setupFixture({ pct: 0.65, handoffBody: seeded });
  const res = runHook(fx, { batch: 5 });
  assert.ok(!res.suppressOutput);
  const h = handoffText(fx);
  assert.equal(countOccurrences(h, "## COMPACT_SEAM"), 1, "exactly one COMPACT_SEAM (replaced, not duplicated)");
  assert.match(h, /## OTHER/, "trailing section preserved");
  assert.doesNotMatch(h, /stale block/, "stale content replaced");
});

test("NO-FIRE: sid maps to no slot -> suppressOutput", () => {
  const fx = setupFixture({ pct: 0.65, slotChatId: "claude-zzzzzzzz", handoffBody: "# H\n" });
  const res = runHook(fx, { batch: 5 });
  assert.equal(res.suppressOutput, true);
});

test("FIRE without handoff file: nudge still surfaces (append best-effort)", () => {
  const fx = setupFixture({ pct: 0.65, handoffBody: null });
  const res = runHook(fx, { batch: 5 });
  assert.equal(res.continue, true);
  assert.match(res.systemMessage, /TASK\/BATCH BOUNDARY/);
});

test("BOUND increments: first fire writes count=1 (stamp persists)", () => {
  const fx = setupFixture({ pct: 0.65, handoffBody: "# H\n" });
  runHook(fx, { batch: 5 });
  const stamp = readFileSync(join(fx.stampDir, `${fx.sid}.count`), "utf-8").trim();
  assert.equal(stamp, "1");
});

test("PROD PATH: full-uuid sid resolves chatId + appends to HANDOFF-claude-<hex> handoff", () => {
  // The bug this locks: stdin session_id is a FULL UUID, but handoffs are keyed
  // by the short chatId (claude-<hex>). f.includes(fullUuid) never matched ->
  // the durable append silently no-op'd in production. findHandoff now resolves
  // the chatId from chat-slots and anchors HANDOFF-<chatId>-.
  const fx = setupFixture({
    pct: 0.65, slot: "alpha",
    sid: "db273e77-fb5e-418e-b0e1-d7ef98b97236",
    slotChatId: "claude-db273e77",
    handoffBody: "# H\n\n## RESUME\n\nDo the next thing.\n",
  });
  const res = runHook(fx, { batch: 5 });
  assert.match(res.systemMessage, /TASK\/BATCH BOUNDARY/);
  const h = handoffText(fx);
  assert.match(h, /## COMPACT_SEAM/, "full-uuid sid MUST still find the claude-<hex> handoff (P1 fix)");
  assert.match(h, /## RESUME/, "RESUME directive preserved");
});

test("BAND EDGE: pct exactly MIN_PCT (0.55) -> FIRE (inclusive lower bound)", () => {
  const fx = setupFixture({ pct: 0.55, handoffBody: "# H\n" });
  const res = runHook(fx, { batch: 5 });
  assert.ok(!res.suppressOutput, "0.55 is in-band (lower bound inclusive)");
  assert.match(res.systemMessage, /TASK\/BATCH BOUNDARY/);
});

test("BAND EDGE: pct exactly MAX_PCT (0.85) -> NO-FIRE (exclusive upper bound)", () => {
  const fx = setupFixture({ pct: 0.85, handoffBody: "# H\n" });
  const res = runHook(fx, { batch: 5 });
  assert.equal(res.suppressOutput, true);
  assert.equal(countOccurrences(handoffText(fx), "## COMPACT_SEAM"), 0);
});

test("NON-FINITE knob: PRISM_TASK_BOUNDARY_COMPACT_MIN_COMMITS=abc falls back to default (floor still enforced)", () => {
  // A garbage knob must NOT silently disable the floor (NaN comparison = always
  // false). With batch=2 < default 3, fire must still be suppressed.
  const fx = setupFixture({ pct: 0.65, handoffBody: "# H\n" });
  const res = runHook(fx, { batch: 2, env: { PRISM_TASK_BOUNDARY_COMPACT_MIN_COMMITS: "abc" } });
  assert.equal(res.suppressOutput, true);
});

test("REAL GIT: rev-list slot-grep drives the count (no PRISM_TEST_BATCH_COUNT) -> 4 commits FIRE", () => {
  const fx = setupFixture({
    pct: 0.65, slot: "alpha", sid: "claude-gitpos", slotChatId: "claude-gitpos", handoffBody: "# H\n",
  });
  const repo = join(fx.dir, "repo"); mkdirSync(repo);
  const git = (...args) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf-8" });
  git("init", "-q");
  git("config", "user.email", "t@t.local"); git("config", "user.name", "t");
  git("commit", "--allow-empty", "-q", "-m", "noise commit without a slot tag");
  for (let i = 0; i < 4; i++) git("commit", "--allow-empty", "-q", "-m", `[X]/U-${i} (slot:alpha): work ${i}`);
  fx.repoRoot = repo;
  const res = runHook(fx, { realGit: true });
  assert.ok(!res.suppressOutput, "4 slot:alpha commits >= MIN_COMMITS 3 must fire via real git");
  assert.match(res.systemMessage, /4 commit/, "real rev-list count (4) drives the message");
});

test("REAL GIT: only 2 slot commits < MIN_COMMITS -> NO-FIRE (floor honored on real path)", () => {
  const fx = setupFixture({
    pct: 0.65, slot: "alpha", sid: "claude-gitneg", slotChatId: "claude-gitneg", handoffBody: "# H\n",
  });
  const repo = join(fx.dir, "repo"); mkdirSync(repo);
  const git = (...args) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf-8" });
  git("init", "-q");
  git("config", "user.email", "t@t.local"); git("config", "user.name", "t");
  for (let i = 0; i < 2; i++) git("commit", "--allow-empty", "-q", "-m", `[X]/U-${i} (slot:alpha): work ${i}`);
  fx.repoRoot = repo;
  const res = runHook(fx, { realGit: true });
  assert.equal(res.suppressOutput, true);
  assert.equal(countOccurrences(handoffText(fx), "## COMPACT_SEAM"), 0);
});
