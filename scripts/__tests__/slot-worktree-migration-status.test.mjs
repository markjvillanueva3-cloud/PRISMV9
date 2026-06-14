// slot-worktree-migration-status.test.mjs — U-WAVE5c-AUTO coverage
// Pure-core tests for parseWorktreeList + computeMigrationStatus + renderMarkdown.
// Hermetic: no git, no fs, real-shape inputs constructed in-test.

import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  parseWorktreeList,
  computeMigrationStatus,
  renderMarkdown,
} from "../slot-worktree-migration-status.mjs";
import { SLOT_NAMES } from "../../.claude/helpers/chat-slots.mjs";

// ─── parseWorktreeList ─────────────────────────────────────────────────────

test("parseWorktreeList: real porcelain shape with branch refs/heads/ prefix", () => {
  const input = [
    "worktree H:/PRISM",
    "HEAD abcdef1234567890",
    "branch refs/heads/cad-fusion-live-ms0",
    "",
    "worktree H:/prism-slot-echo",
    "HEAD 1234567890abcdef",
    "branch refs/heads/slot/echo",
    "",
  ].join("\n");
  const got = parseWorktreeList(input);
  assert.equal(got.length, 2);
  assert.equal(got[0].path, "H:/PRISM");
  assert.equal(got[0].branch, "cad-fusion-live-ms0");
  assert.equal(got[1].path, "H:/prism-slot-echo");
  assert.equal(got[1].branch, "slot/echo");
});

test("parseWorktreeList: detached HEAD has null branch", () => {
  const input = ["worktree H:/x", "HEAD deadbeef", "detached", ""].join("\n");
  const got = parseWorktreeList(input);
  assert.equal(got.length, 1);
  assert.equal(got[0].branch, null);
});

test("parseWorktreeList: empty input returns []", () => {
  assert.deepEqual(parseWorktreeList(""), []);
  assert.deepEqual(parseWorktreeList(null), []);
  assert.deepEqual(parseWorktreeList(undefined), []);
});

test("parseWorktreeList: CRLF line endings (Windows)", () => {
  const input = "worktree H:/x\r\nHEAD abc\r\nbranch refs/heads/main\r\n";
  const got = parseWorktreeList(input);
  assert.equal(got.length, 1);
  assert.equal(got[0].branch, "main");
});

test("parseWorktreeList: trailing junk after worktree header is ignored", () => {
  const input = "garbage\nworktree H:/x\nbranch refs/heads/y\n";
  const got = parseWorktreeList(input);
  assert.equal(got.length, 1);
});

// ─── computeMigrationStatus: status classification ─────────────────────────

const makeFile = (perSlot = {}) => ({
  schemaVersion: 2,
  slots: Object.fromEntries(SLOT_NAMES.map((n) => [n, perSlot[n] ?? null])),
});

test("computeMigrationStatus: empty fleet → all 13 unbound, 0 armed", () => {
  const r = computeMigrationStatus({ worktreeList: [], slotsFile: makeFile(), bindings: {} });
  assert.equal(r.summary.total, SLOT_NAMES.length);
  assert.equal(r.summary.unbound, SLOT_NAMES.length);
  assert.equal(r.summary.armed, 0);
  assert.equal(r.summary.dormant, SLOT_NAMES.length);
  assert.equal(r.summary.migrated, 0);
});

test("computeMigrationStatus: fully migrated slot (branch + worktree + binding aligned)", () => {
  const r = computeMigrationStatus({
    worktreeList: [{ path: "H:/prism-slot-echo", head: "abc", branch: "slot/echo" }],
    slotsFile: makeFile({ echo: { chatId: "claude-x", branch: "slot/echo", lastHeartbeat: "now" } }),
    bindings: { echo: "slot/echo" },
  });
  const echo = r.slots.find((s) => s.slot === "echo");
  assert.equal(echo.status, "migrated");
  assert.equal(echo.laneRoutingArmed, true);
  assert.equal(echo.worktreeOnExpectedBranch, true);
  assert.equal(echo.bindingPresent, true);
  assert.equal(r.summary.migrated, 1);
  assert.equal(r.summary.armed, 1);
});

test("computeMigrationStatus: drifting-main slot (cad-fusion-live-ms0)", () => {
  const r = computeMigrationStatus({
    worktreeList: [],
    slotsFile: makeFile({ bravo: { chatId: "claude-y", branch: "cad-fusion-live-ms0", lastHeartbeat: "now" } }),
    bindings: {},
  });
  const bravo = r.slots.find((s) => s.slot === "bravo");
  assert.equal(bravo.status, "drifting-main");
  assert.equal(bravo.laneRoutingArmed, false);
  assert.equal(r.summary.driftingMain, 1);
  assert.equal(r.summary.dormant, SLOT_NAMES.length);
});

test("computeMigrationStatus: misconfigured slot (branch is neither slot/<n> nor cad-fusion)", () => {
  const r = computeMigrationStatus({
    worktreeList: [],
    slotsFile: makeFile({ alpha: { chatId: "claude-z", branch: "feature/random", lastHeartbeat: "now" } }),
    bindings: {},
  });
  const alpha = r.slots.find((s) => s.slot === "alpha");
  assert.equal(alpha.status, "misconfigured");
  assert.match(alpha.notes.join(" "), /feature\/random/);
});

test("computeMigrationStatus: armed-but-worktree-missing surfaces a note", () => {
  const r = computeMigrationStatus({
    worktreeList: [], // worktree NOT present
    slotsFile: makeFile({ delta: { chatId: "claude-d", branch: "slot/delta", lastHeartbeat: "now" } }),
    bindings: { delta: "slot/delta" },
  });
  const delta = r.slots.find((s) => s.slot === "delta");
  assert.equal(delta.laneRoutingArmed, true, "branch starts with slot/ so hooks ARM");
  assert.equal(delta.worktreeExists, false);
  assert.match(delta.notes.join(" "), /does not exist on disk/);
});

test("computeMigrationStatus: case-insensitive path match (Windows)", () => {
  // Worktree list uses lowercase 'h:/' vs SLOT root uses 'H:/' — must still match.
  const r = computeMigrationStatus({
    worktreeList: [{ path: "h:/prism-slot-foxtrot", head: "x", branch: "slot/foxtrot" }],
    slotsFile: makeFile({ foxtrot: { chatId: "claude-f", branch: "slot/foxtrot", lastHeartbeat: "now" } }),
    bindings: { foxtrot: "slot/foxtrot" },
    worktreeRoot: "H:/",
  });
  const f = r.slots.find((s) => s.slot === "foxtrot");
  assert.equal(f.status, "migrated");
});

test("computeMigrationStatus: variability — 4 distinct slot states in one report", () => {
  const r = computeMigrationStatus({
    worktreeList: [
      { path: "H:/prism-slot-alpha", head: "1", branch: "slot/alpha" },   // migrated
      { path: "H:/prism-slot-bravo", head: "2", branch: "main" },          // wrong branch
    ],
    slotsFile: makeFile({
      alpha: { chatId: "x", branch: "slot/alpha", lastHeartbeat: "now" }, // migrated
      bravo: { chatId: "y", branch: "cad-fusion-live-ms0", lastHeartbeat: "now" }, // drifting + wrong-branch wt
      charlie: { chatId: "z", branch: "weird/x", lastHeartbeat: "now" },  // misconfigured
      // delta omitted -> unbound
    }),
    bindings: { alpha: "slot/alpha" },
  });
  assert.equal(r.summary.migrated, 1);
  assert.equal(r.summary.driftingMain, 1);
  assert.equal(r.summary.misconfigured, 1);
  assert.equal(r.summary.unbound, SLOT_NAMES.length - 3);
});

// ─── computeMigrationStatus: fail-soft on adversarial input ────────────────

test("computeMigrationStatus: missing input fields → empty fleet", () => {
  const r = computeMigrationStatus({});
  assert.equal(r.summary.total, SLOT_NAMES.length);
  assert.equal(r.summary.unbound, SLOT_NAMES.length);
});

test("computeMigrationStatus: null input → empty fleet", () => {
  const r = computeMigrationStatus(null);
  assert.equal(r.summary.total, SLOT_NAMES.length);
  assert.equal(r.summary.unbound, SLOT_NAMES.length);
});

test("computeMigrationStatus: non-array worktreeList → ignored", () => {
  const r = computeMigrationStatus({ worktreeList: "not an array", slotsFile: makeFile(), bindings: {} });
  assert.equal(r.summary.total, SLOT_NAMES.length);
});

test("computeMigrationStatus: non-string bindings entry ignored gracefully", () => {
  const r = computeMigrationStatus({
    worktreeList: [],
    slotsFile: makeFile({ echo: { chatId: "x", branch: "slot/echo", lastHeartbeat: "now" } }),
    bindings: { echo: 42, alpha: null, bravo: { evil: 1 } }, // adversarial
  });
  const echo = r.slots.find((s) => s.slot === "echo");
  assert.equal(echo.bindingPresent, false, "non-string binding must be rejected");
  assert.equal(echo.bindingValue, null);
});

// ─── renderMarkdown ────────────────────────────────────────────────────────

test("renderMarkdown: includes summary counts + every slot row", () => {
  const r = computeMigrationStatus({ worktreeList: [], slotsFile: makeFile(), bindings: {} });
  const md = renderMarkdown(r);
  assert.match(md, /Slot worktree migration status/);
  assert.match(md, new RegExp(`0\\/${SLOT_NAMES.length}.*ARMED`));
  // every SLOT_NAMES entry appears as a row prefix
  for (const slot of SLOT_NAMES) {
    assert.match(md, new RegExp(`\\| ${slot.padEnd(8)} \\|`), `row for ${slot} missing`);
  }
});

test("renderMarkdown: surfaces per-slot notes section", () => {
  const r = computeMigrationStatus({
    worktreeList: [],
    slotsFile: makeFile({ echo: { chatId: "x", branch: "slot/echo", lastHeartbeat: "now" } }),
    bindings: { echo: "slot/echo" },
  });
  const md = renderMarkdown(r);
  // echo has notes about missing worktree on disk
  assert.match(md, /\*\*echo\*\*/);
});

test("renderMarkdown: references the wiki entry", () => {
  const r = computeMigrationStatus({ worktreeList: [], slotsFile: makeFile(), bindings: {} });
  const md = renderMarkdown(r);
  assert.match(md, /\[\[slot-worktree-migration\]\]/);
});

// ─── Regression guards ─────────────────────────────────────────────────────

test("schemaVersion stays at 1 (regression guard — bump signals breaking change)", () => {
  const r = computeMigrationStatus({ worktreeList: [], slotsFile: makeFile(), bindings: {} });
  assert.equal(r.schemaVersion, 1);
});

test("summary counts conserve (migrated + drifting + unbound + misconfigured = total)", () => {
  const r = computeMigrationStatus({
    worktreeList: [{ path: "H:/prism-slot-alpha", head: "x", branch: "slot/alpha" }],
    slotsFile: makeFile({
      alpha: { chatId: "a", branch: "slot/alpha", lastHeartbeat: "now" },
      bravo: { chatId: "b", branch: "cad-fusion-live-ms0", lastHeartbeat: "now" },
      charlie: { chatId: "c", branch: "weird", lastHeartbeat: "now" },
    }),
    bindings: { alpha: "slot/alpha" },
  });
  const { migrated, driftingMain, unbound, misconfigured, total } = r.summary;
  assert.equal(migrated + driftingMain + unbound + misconfigured, total, "status counts must conserve");
  assert.equal(r.summary.armed + r.summary.dormant, total, "arm counts must conserve");
});
