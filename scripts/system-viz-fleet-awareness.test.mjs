// system-viz-fleet-awareness.test.mjs — U-P5-FLEET-AWARENESS-PANEL tests (node:test)
//
// Coverage:
//   • parseGitLog — empty, malformed, valid, scope extraction edge cases
//   • buildFleetAwarenessPanel — empty / single chat / multi-chat / no-slot-only / no-handoff-only
//     / liveness thresholds (live/recent/crashed) / topic-commit matching / accounting invariants
//     / 13-slot palette / advisory / sorted output / Object.create(null) proto-pollution safety
//   • parseArgs — defaults + each flag
//   • I/O: readHandoffsDir, readChatSlots, writePanel atomic
//   • Real-data E2E — live readers produce valid panel with non-zero chats

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  buildFleetAwarenessPanel,
  parseGitLog,
  parseArgs,
  readHandoffsDir,
  readChatSlots,
  writePanel,
  LIVE_HEARTBEAT_MS,
  RECENT_HEARTBEAT_MS,
  GIT_LOG_WINDOW_HOURS,
  MIN_TOPIC_SLUG_LEN,
  MAX_RECENT_COMMITS_PER_CHAT,
  SLOT_NAMES_FALLBACK,
} from "./system-viz-fleet-awareness.mjs";

const FROZEN_ISO = "2026-05-17T12:00:00.000Z";
const FROZEN_MS = Date.parse(FROZEN_ISO);

// ─── parseGitLog ─────────────────────────────────────────────────────────────
describe("parseGitLog", () => {
  it("empty / null input returns empty array", () => {
    assert.deepEqual(parseGitLog(""), []);
    assert.deepEqual(parseGitLog(null), []);
    assert.deepEqual(parseGitLog(undefined), []);
  });

  it("parses valid pipe-delimited git log lines", () => {
    const txt =
      "abc123|[MAIN] [FOO-MS0]/U-A: title|2026-05-17T10:00:00Z\n" +
      "def456|[BAR-MS1]/U-B: thing|2026-05-17T11:00:00Z\n";
    const commits = parseGitLog(txt);
    assert.equal(commits.length, 2);
    assert.equal(commits[0].sha, "abc123");
    assert.equal(commits[0].subject, "[MAIN] [FOO-MS0]/U-A: title");
    assert.equal(commits[0].timestamp, "2026-05-17T10:00:00Z");
    assert.equal(commits[0].scope, "FOO-MS0");
    assert.equal(commits[1].scope, "BAR-MS1");
  });

  it("malformed lines (missing pipes) are silently skipped", () => {
    const txt = "abc|only-one\nbad-no-pipes\nvalid|subject|2026-05-17T10:00:00Z\n";
    const commits = parseGitLog(txt);
    assert.equal(commits.length, 1);
    assert.equal(commits[0].sha, "valid");
  });

  it("scope=null when subject has no [SCOPE-MS#] token", () => {
    const txt = "abc|just a message no scope|2026-05-17T10:00:00Z\n";
    const commits = parseGitLog(txt);
    assert.equal(commits[0].scope, null);
  });

  it("scope extraction handles both [MAIN] [SCOPE] and [SCOPE]", () => {
    const txt =
      "a|[MAIN] [FOO-MS0]/U: t|2026-05-17T10:00:00Z\n" +
      "b|[BAR-MS1]/U: t|2026-05-17T10:00:00Z\n";
    const commits = parseGitLog(txt);
    assert.equal(commits[0].scope, "FOO-MS0");
    assert.equal(commits[1].scope, "BAR-MS1");
  });

  it("handles trailing newline and CRLF line endings", () => {
    const txt = "a|s|2026\r\nb|s|2026\r\n";
    const commits = parseGitLog(txt);
    assert.equal(commits.length, 2);
  });

  it("REGRESSION: scope token requires -MS<digits> suffix (filters out e.g. [MAIN])", () => {
    const txt = "a|[MAIN] subject without scope|2026-05-17T10:00:00Z\n";
    const commits = parseGitLog(txt);
    assert.equal(commits[0].scope, null);
  });
});

// ─── buildFleetAwarenessPanel ────────────────────────────────────────────────
describe("buildFleetAwarenessPanel", () => {
  it("empty inputs produce empty panel with zero summary", () => {
    const out = buildFleetAwarenessPanel({ now: FROZEN_MS });
    assert.equal(out.schemaVersion, 1);
    assert.equal(out.generatedAt, FROZEN_ISO);
    assert.equal(Object.keys(out.chats).length, 0);
    assert.equal(out.summary.chatsTotal, 0);
    assert.equal(out.summary.chatsLive, 0);
    assert.equal(out.summary.chatsCrashed, 0);
    assert.equal(out.summary.slotsOccupied, 0);
    assert.equal(out.summary.slotsAvailable, SLOT_NAMES_FALLBACK.length);
    assert.equal(out.summary.totalCommits24h, 0);
  });

  it("single chat with live heartbeat → liveness:live", () => {
    const hb = new Date(FROZEN_MS - 30_000).toISOString(); // 30s ago
    const out = buildFleetAwarenessPanel({
      chatSlotsState: {
        slots: {
          alpha: {
            chatId: "claude-aaa",
            host: "HOST-A",
            topic: "alpha-foo",
            lastHeartbeat: hb,
            branch: "main",
            activity: "loop",
          },
        },
      },
      now: FROZEN_MS,
    });
    assert.equal(out.chats["claude-aaa"].slot, "alpha");
    assert.equal(out.chats["claude-aaa"].liveness, "live");
    assert.ok(out.chats["claude-aaa"].heartbeatAgeMs < LIVE_HEARTBEAT_MS);
    assert.equal(out.summary.chatsLive, 1);
    assert.equal(out.summary.chatsCrashed, 0);
  });

  it("heartbeat 10min ago → liveness:recent", () => {
    const hb = new Date(FROZEN_MS - 10 * 60 * 1000).toISOString();
    const out = buildFleetAwarenessPanel({
      chatSlotsState: {
        slots: { alpha: { chatId: "claude-r", lastHeartbeat: hb } },
      },
      now: FROZEN_MS,
    });
    assert.equal(out.chats["claude-r"].liveness, "recent");
    assert.equal(out.summary.chatsRecent, 1);
    assert.equal(out.summary.chatsLive, 0);
  });

  it("heartbeat 1h ago → liveness:crashed", () => {
    const hb = new Date(FROZEN_MS - 60 * 60 * 1000).toISOString();
    const out = buildFleetAwarenessPanel({
      chatSlotsState: {
        slots: { alpha: { chatId: "claude-c", lastHeartbeat: hb } },
      },
      now: FROZEN_MS,
    });
    assert.equal(out.chats["claude-c"].liveness, "crashed");
    assert.equal(out.summary.chatsCrashed, 1);
  });

  it("chat with handoff but no slot → liveness:*-no-slot", () => {
    const out = buildFleetAwarenessPanel({
      handoffEntries: [
        {
          filename: "HANDOFF-claude-orphan-foo.md",
          chatId: "claude-orphan",
          topic: "foo",
          lastModifiedMs: FROZEN_MS - 60_000, // 60s ago = live
        },
      ],
      now: FROZEN_MS,
    });
    assert.equal(out.chats["claude-orphan"].slot, null);
    assert.equal(out.chats["claude-orphan"].liveness, "live-no-slot");
    assert.equal(out.summary.chatsLive, 1);
    assert.equal(out.summary.chatsWithSlot, 0);
    assert.equal(out.summary.chatsWithHandoff, 1);
  });

  it("malformed slot entries (null) are skipped without throwing", () => {
    const out = buildFleetAwarenessPanel({
      chatSlotsState: {
        slots: {
          alpha: null,
          bravo: { chatId: "claude-b", lastHeartbeat: FROZEN_ISO },
          charlie: { chatId: null },
        },
      },
      now: FROZEN_MS,
    });
    assert.equal(out.summary.chatsTotal, 1);
    assert.equal(out.chats["claude-b"].slot, "bravo");
  });

  it("topic→commit matching: topic substring appears in commit scope", () => {
    const hb = new Date(FROZEN_MS - 60_000).toISOString();
    const out = buildFleetAwarenessPanel({
      chatSlotsState: {
        slots: {
          echo: {
            chatId: "claude-e",
            topic: "echo-system-viz-brain",
            lastHeartbeat: hb,
          },
        },
      },
      gitCommits: [
        {
          sha: "aaa",
          subject: "[SYSTEM-VIZ-BRAIN-MS0]/U-X: foo",
          timestamp: FROZEN_ISO,
          scope: "SYSTEM-VIZ-BRAIN-MS0",
        },
        {
          sha: "bbb",
          subject: "[OTHER-MS0]/U-Y: bar",
          timestamp: FROZEN_ISO,
          scope: "OTHER-MS0",
        },
      ],
      now: FROZEN_MS,
    });
    assert.equal(out.chats["claude-e"].recentCommits.length, 1);
    assert.equal(out.chats["claude-e"].recentCommits[0].sha, "aaa");
    assert.equal(out.summary.attributedCommits, 1);
    assert.equal(out.summary.unattributedCommits, 1);
  });

  it("commits are sorted by timestamp DESC", () => {
    const hb = new Date(FROZEN_MS - 60_000).toISOString();
    const out = buildFleetAwarenessPanel({
      chatSlotsState: {
        slots: {
          echo: {
            chatId: "claude-e",
            topic: "echo-foo-bar",
            lastHeartbeat: hb,
          },
        },
      },
      gitCommits: [
        { sha: "old", subject: "x", timestamp: "2026-05-17T08:00:00Z", scope: "FOO-BAR-MS0" },
        { sha: "new", subject: "x", timestamp: "2026-05-17T11:00:00Z", scope: "FOO-BAR-MS0" },
        { sha: "mid", subject: "x", timestamp: "2026-05-17T09:30:00Z", scope: "FOO-BAR-MS0" },
      ],
      now: FROZEN_MS,
    });
    const order = out.chats["claude-e"].recentCommits.map((c) => c.sha);
    assert.deepEqual(order, ["new", "mid", "old"]);
  });

  it("recentCommits cap is MAX_RECENT_COMMITS_PER_CHAT", () => {
    const hb = new Date(FROZEN_MS - 60_000).toISOString();
    const commits = Array.from({ length: 10 }, (_, i) => ({
      sha: `c${i}`,
      subject: "x",
      timestamp: `2026-05-17T1${i}:00:00Z`,
      scope: "FOO-BAR-MS0",
    }));
    const out = buildFleetAwarenessPanel({
      chatSlotsState: {
        slots: { echo: { chatId: "claude-e", topic: "echo-foo-bar", lastHeartbeat: hb } },
      },
      gitCommits: commits,
      now: FROZEN_MS,
    });
    assert.equal(out.chats["claude-e"].recentCommits.length, MAX_RECENT_COMMITS_PER_CHAT);
    assert.equal(out.chats["claude-e"].recentCommitCount, 10);
  });

  it("topic shorter than MIN_TOPIC_SLUG_LEN → no commit attribution", () => {
    const hb = new Date(FROZEN_MS - 60_000).toISOString();
    const out = buildFleetAwarenessPanel({
      chatSlotsState: {
        slots: { alpha: { chatId: "claude-a", topic: "a-x", lastHeartbeat: hb } },
        // topicSlug after strip-prefix would be "x" (1 char, < MIN_TOPIC_SLUG_LEN=3)
      },
      gitCommits: [
        { sha: "aaa", subject: "x", timestamp: FROZEN_ISO, scope: "X-MS0" },
      ],
      now: FROZEN_MS,
    });
    assert.equal(out.chats["claude-a"].recentCommitCount, 0);
  });

  it("multiple chats sorted alphabetically by chatId", () => {
    const hb = new Date(FROZEN_MS - 60_000).toISOString();
    const out = buildFleetAwarenessPanel({
      chatSlotsState: {
        slots: {
          alpha: { chatId: "claude-zz", lastHeartbeat: hb },
          bravo: { chatId: "claude-aa", lastHeartbeat: hb },
          charlie: { chatId: "claude-mm", lastHeartbeat: hb },
        },
      },
      now: FROZEN_MS,
    });
    assert.deepEqual(Object.keys(out.chats), ["claude-aa", "claude-mm", "claude-zz"]);
  });

  it("multi-handoff per chat: most-recent topic wins, allTopicsCount counts all", () => {
    const out = buildFleetAwarenessPanel({
      handoffEntries: [
        {
          filename: "HANDOFF-claude-x-old-topic.md",
          chatId: "claude-x",
          topic: "old-topic",
          lastModifiedMs: FROZEN_MS - 3600_000,
        },
        {
          filename: "HANDOFF-claude-x-new-topic.md",
          chatId: "claude-x",
          topic: "new-topic",
          lastModifiedMs: FROZEN_MS - 60_000,
        },
      ],
      now: FROZEN_MS,
    });
    assert.equal(out.chats["claude-x"].handoff.topic, "new-topic");
    assert.equal(out.chats["claude-x"].handoff.allTopicsCount, 2);
  });

  it("accounting invariant: chatsTotal = chatsLive + chatsRecent + chatsCrashed + unknown", () => {
    const out = buildFleetAwarenessPanel({
      chatSlotsState: {
        slots: {
          alpha: {
            chatId: "claude-a",
            lastHeartbeat: new Date(FROZEN_MS - 60_000).toISOString(),
          },
          bravo: {
            chatId: "claude-b",
            lastHeartbeat: new Date(FROZEN_MS - 10 * 60_000).toISOString(),
          },
          charlie: {
            chatId: "claude-c",
            lastHeartbeat: new Date(FROZEN_MS - 60 * 60_000).toISOString(),
          },
          delta: { chatId: "claude-d" }, // no heartbeat → unknown
        },
      },
      now: FROZEN_MS,
    });
    const s = out.summary;
    const classified = s.chatsLive + s.chatsRecent + s.chatsCrashed;
    assert.equal(s.chatsTotal, 4);
    assert.equal(classified, 3); // claude-d is unknown, not in any bucket
  });

  it("slotsOccupied + slotsAvailable == slotNames.length", () => {
    const hb = new Date(FROZEN_MS - 60_000).toISOString();
    const out = buildFleetAwarenessPanel({
      chatSlotsState: {
        slots: {
          alpha: { chatId: "claude-a", lastHeartbeat: hb },
          bravo: { chatId: "claude-b", lastHeartbeat: hb },
        },
      },
      now: FROZEN_MS,
    });
    assert.equal(
      out.summary.slotsOccupied + out.summary.slotsAvailable,
      SLOT_NAMES_FALLBACK.length,
    );
  });

  it("advisory.mustHumanVerify is always true; caveat non-empty", () => {
    const out = buildFleetAwarenessPanel({ now: FROZEN_MS });
    assert.equal(out.advisory.mustHumanVerify, true);
    assert.ok(out.advisory.caveat.length > 0);
  });

  it("thresholds block carries LIVE/RECENT/window constants", () => {
    const out = buildFleetAwarenessPanel({ now: FROZEN_MS });
    assert.equal(out.thresholds.liveHeartbeatMs, LIVE_HEARTBEAT_MS);
    assert.equal(out.thresholds.recentHeartbeatMs, RECENT_HEARTBEAT_MS);
    assert.equal(out.thresholds.gitLogWindowHours, GIT_LOG_WINDOW_HOURS);
  });

  it("now defaults to Date.now() when not passed (within tolerance)", () => {
    const before = Date.now();
    const out = buildFleetAwarenessPanel({});
    const after = Date.now();
    const t = Date.parse(out.generatedAt);
    assert.ok(t >= before - 1 && t <= after + 1);
  });

  it("REGRESSION: bidirectional topic match — scope without -MS suffix in slug works", () => {
    const hb = new Date(FROZEN_MS - 60_000).toISOString();
    const out = buildFleetAwarenessPanel({
      chatSlotsState: {
        slots: {
          echo: {
            chatId: "claude-e",
            topic: "echo-system-viz-brain-ms0",
            lastHeartbeat: hb,
          },
        },
      },
      gitCommits: [
        {
          sha: "x",
          subject: "x",
          timestamp: FROZEN_ISO,
          scope: "SYSTEM-VIZ-BRAIN-MS0",
        },
      ],
      now: FROZEN_MS,
    });
    assert.equal(out.chats["claude-e"].recentCommitCount, 1);
  });

  it("REGRESSION (arm A P1-1): short scope token does NOT match longer topic via reverse-includes", () => {
    // Bug class: topic="echo-system-viz-brain" (slug=system-viz-brain) and
    // commit scope=VIZ-MS0 (scopeNoMs=viz) — without scope-length gate, the
    // reverse-direction `topicSlug.includes(scopeNoMs)` was true → bogus match.
    const hb = new Date(FROZEN_MS - 60_000).toISOString();
    const out = buildFleetAwarenessPanel({
      chatSlotsState: {
        slots: {
          echo: {
            chatId: "claude-e",
            topic: "echo-system-viz-brain",
            lastHeartbeat: hb,
          },
        },
      },
      gitCommits: [
        { sha: "x", subject: "x", timestamp: FROZEN_ISO, scope: "VIZ-MS0" }, // 3-char scopeNoMs="viz" must match (boundary)
        { sha: "y", subject: "y", timestamp: FROZEN_ISO, scope: "VI-MS0" }, // 2-char "vi" must NOT match
      ],
      now: FROZEN_MS,
    });
    // "viz" is exactly MIN_TOPIC_SLUG_LEN=3, so matches; "vi" is below gate.
    const shas = out.chats["claude-e"].recentCommits.map((c) => c.sha);
    assert.deepEqual(shas, ["x"]);
  });

  it("REGRESSION (arm B P3-4): slot-prefix strip is anchored to slotNames, not arbitrary lowercase prefix", () => {
    // Bug class: topic="multi-axis-rough" used to have "multi-" stripped as
    // if it were a slot name → slug "axis-rough" → false-matches AXIS-* commits.
    // With anchored regex, only real slot names (alpha..mike) get stripped.
    const hb = new Date(FROZEN_MS - 60_000).toISOString();
    const out = buildFleetAwarenessPanel({
      chatSlotsState: {
        slots: {
          alpha: { chatId: "claude-a", topic: "multi-axis-rough", lastHeartbeat: hb },
        },
      },
      gitCommits: [
        { sha: "x", subject: "x", timestamp: FROZEN_ISO, scope: "AXIS-MS0" },
      ],
      now: FROZEN_MS,
    });
    // topicSlug stays "multi-axis-rough" (no slot-prefix strip);
    // scopeNoMs="axis" is included in "multi-axis-rough" → MATCH expected (rev direction).
    // The fix protects against ACCIDENTAL strip; it doesn't change correct matches.
    assert.equal(out.chats["claude-a"].recentCommitCount, 1);
  });

  it("REGRESSION (arm B P2-3): caveat discloses cross-chat double-attribution", () => {
    const out = buildFleetAwarenessPanel({ now: FROZEN_MS });
    assert.match(out.advisory.caveat, /multiple chats|exceed totalCommits24h/);
  });

  it("REGRESSION: Object.create(null) accumulators — proto-pollution safety", () => {
    const out = buildFleetAwarenessPanel({
      chatSlotsState: {
        slots: { alpha: { chatId: "__proto__" } },
      },
      now: FROZEN_MS,
    });
    // Should NOT pollute Object.prototype
    assert.equal({}.alpha, undefined);
    assert.equal(out.chats["__proto__"]?.slot, "alpha");
  });

  it("custom slotNames override propagates to slotNames + slotsAvailable math", () => {
    const out = buildFleetAwarenessPanel({
      slotNames: ["a", "b"],
      chatSlotsState: { slots: { a: { chatId: "x", lastHeartbeat: FROZEN_ISO } } },
      now: FROZEN_MS,
    });
    assert.deepEqual(out.slotNames, ["a", "b"]);
    assert.equal(out.summary.slotsAvailable, 1);
  });
});

// ─── parseArgs ───────────────────────────────────────────────────────────────
describe("parseArgs", () => {
  it("defaults", () => {
    const a = parseArgs(["node", "x"]);
    assert.equal(a.json, false);
    assert.equal(a.help, false);
    assert.equal(a.frozenTime, null);
    assert.equal(a.gitLogFile, null);
    assert.match(a.outPath, /fleet-awareness-panel\.json$/);
  });

  it("--out / --json / --frozen-time / --git-log-file", () => {
    const a = parseArgs([
      "node",
      "x",
      "--out",
      "/tmp/x.json",
      "--json",
      "--frozen-time",
      FROZEN_ISO,
      "--git-log-file",
      "/tmp/log.txt",
    ]);
    assert.equal(a.outPath, "/tmp/x.json");
    assert.equal(a.json, true);
    assert.equal(a.frozenTime, FROZEN_ISO);
    assert.equal(a.gitLogFile, "/tmp/log.txt");
  });

  it("--help / -h", () => {
    assert.equal(parseArgs(["node", "x", "--help"]).help, true);
    assert.equal(parseArgs(["node", "x", "-h"]).help, true);
  });
});

// ─── I/O wrappers ────────────────────────────────────────────────────────────
describe("readHandoffsDir", () => {
  it("missing dir returns empty array (no throw)", () => {
    assert.deepEqual(readHandoffsDir("/nonexistent/handoffs"), []);
  });

  it("only parses HANDOFF-claude-<hex>-<topic>.md filenames", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ho-"));
    try {
      fs.writeFileSync(path.join(tmp, "HANDOFF-claude-abcd1234-foo.md"), "x");
      fs.writeFileSync(path.join(tmp, "HANDOFF-claude-deadbeef-bar-baz.md"), "x");
      fs.writeFileSync(path.join(tmp, "random.md"), "x");
      fs.writeFileSync(path.join(tmp, "HANDOFF-not-claude-x-y.md"), "x");
      const entries = readHandoffsDir(tmp);
      const ids = entries.map((e) => e.chatId).sort();
      assert.deepEqual(ids, ["claude-abcd1234", "claude-deadbeef"]);
      const fooEntry = entries.find((e) => e.chatId === "claude-abcd1234");
      assert.equal(fooEntry.topic, "foo");
      assert.ok(fooEntry.lastModifiedMs > 0);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("real production dir is readable and yields >0 entries", () => {
    const entries = readHandoffsDir();
    assert.ok(entries.length > 0, "production handoffs dir should have entries");
    for (const e of entries.slice(0, 5)) {
      assert.match(e.chatId, /^claude-[a-f0-9]+$/);
      assert.ok(e.topic);
    }
  });
});

describe("readChatSlots", () => {
  it("returns {state, slotNames} matching the canonical fleet roster from the live module", async () => {
    const { state, slotNames } = await readChatSlots();
    assert.equal(typeof state, "object");
    // Track the canonical roster length (26 after SLOT-RECLAIM 13->26), not a magic
    // number; the deep-equal below enforces fallback==live.
    assert.equal(slotNames.length, SLOT_NAMES_FALLBACK.length);
    assert.deepEqual(slotNames, SLOT_NAMES_FALLBACK);
  });

  it("REGRESSION (Windows pathToFileURL): live slots must contain entries", async () => {
    const { state } = await readChatSlots();
    const claimed = Object.values(state.slots || {}).filter(
      (s) => s && s.chatId,
    ).length;
    assert.ok(claimed >= 1, `expected ≥1 claimed slot; got ${claimed}`);
  });
});

describe("writePanel", () => {
  it("creates parent dir + writes pretty JSON with trailing newline (atomic)", () => {
    const tmp = path.join(os.tmpdir(), `fap-${Date.now()}`, "deep", "out.json");
    try {
      const payload = { schemaVersion: 1, hello: "fleet" };
      const written = writePanel(tmp, payload);
      assert.equal(written, tmp);
      const txt = fs.readFileSync(tmp, "utf8");
      assert.ok(txt.endsWith("\n"));
      assert.deepEqual(JSON.parse(txt), payload);
      // No leftover .tmp file
      const leftover = fs.readdirSync(path.dirname(tmp)).filter((f) =>
        f.startsWith("out.json.tmp-"),
      );
      assert.equal(leftover.length, 0);
    } finally {
      try {
        fs.rmSync(path.dirname(path.dirname(tmp)), { recursive: true, force: true });
      } catch {}
    }
  });
});

// ─── Real-data E2E ───────────────────────────────────────────────────────────
describe("real-data E2E", () => {
  it("live inputs produce a valid panel with non-zero chats", async () => {
    const { state, slotNames } = await readChatSlots();
    const handoffEntries = readHandoffsDir();
    const panel = buildFleetAwarenessPanel({
      chatSlotsState: state,
      handoffEntries,
      gitCommits: [],
      slotNames,
      now: FROZEN_MS,
    });
    assert.equal(panel.schemaVersion, 1);
    assert.ok(panel.summary.chatsTotal > 0, "live data should yield non-zero chats");
    assert.equal(typeof panel.chats, "object");
  });

  it("accounting invariant on real-data: slotsOccupied + slotsAvailable == slotNames.length", async () => {
    const { state, slotNames } = await readChatSlots();
    const panel = buildFleetAwarenessPanel({
      chatSlotsState: state,
      slotNames,
      now: FROZEN_MS,
    });
    assert.equal(
      panel.summary.slotsOccupied + panel.summary.slotsAvailable,
      slotNames.length,
    );
  });

  it("real-data: chatsWithSlot ≤ chatsTotal", async () => {
    const { state, slotNames } = await readChatSlots();
    const handoffEntries = readHandoffsDir();
    const panel = buildFleetAwarenessPanel({
      chatSlotsState: state,
      handoffEntries,
      slotNames,
      now: FROZEN_MS,
    });
    assert.ok(panel.summary.chatsWithSlot <= panel.summary.chatsTotal);
  });
});
