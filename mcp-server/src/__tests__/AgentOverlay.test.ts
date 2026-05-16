/**
 * AgentOverlay.test.ts — OBSIDIAN-INTELLIGENCE-MS3 / G2 (U-AGENT-PIXEL-DEPT-OVERLAY).
 *
 * Hermetic vitest suite for the agent-status overlay logic in
 * scripts/lib/agent-overlay.mjs (the pure lib that generate-system-viz.mjs
 * embeds and that agent-overlay.js renders).
 *
 * The lib is .mjs (the generator is a plain-node script, no build step) and
 * is imported here by relative path; test files are tsc-excluded so the
 * cross-package .mjs import needs no declaration file.
 *
 * Includes three drift-guards that re-read sibling files:
 *   - chat-slots.mjs  — the vendored ACTIVE/IDLE thresholds must still match.
 *   - agent-overlay.css — every STATUS_COLORS hex must be present.
 *   - agent-overlay.js  — the renderer must stay innerHTML-free (XSS contract).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  ACTIVE_TTL_MS,
  IDLE_TTL_MS,
  FUTURE_GRACE_MS,
  MESSAGE_MAX_CHARS,
  AGENT_STATUSES,
  AGENT_OVERLAY_SCHEMA_VERSION,
  STATUS_COLORS,
  chatEntryPid,
  matchChatEntry,
  classifyAgentStatus,
  parseChatJsonl,
  buildAgentOverlay,
} from "../../../scripts/lib/agent-overlay.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const NOW = Date.parse("2026-05-16T18:00:00.000Z");
/** An ISO timestamp `seconds` before NOW. */
const ago = (seconds: number): string => new Date(NOW - seconds * 1000).toISOString();

/** Minimal occupied-slot factory. */
function slot(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    chatId: "c-x",
    host: "DESKTOP-X",
    pid: 100,
    claimedAt: ago(600),
    lastHeartbeat: ago(30),
    branch: "main",
    topic: "topic-x",
    activity: "build",
    terminalWindowId: null,
    pipelineStep: null,
    pipelineIter: null,
    pipelineTarget: null,
    ...over,
  };
}

describe("constants + exported shape", () => {
  it("exposes the four statuses in render order, frozen", () => {
    expect(AGENT_STATUSES).toEqual(["typing", "parsing", "idle", "errored"]);
    expect(Object.isFrozen(AGENT_STATUSES)).toBe(true);
  });

  it("STATUS_COLORS has a distinct hex per status, frozen", () => {
    expect(STATUS_COLORS).toEqual({
      typing: "#22c55e",
      parsing: "#3b82f6",
      idle: "#64748b",
      errored: "#ef4444",
    });
    expect(Object.isFrozen(STATUS_COLORS)).toBe(true);
    const hexes = Object.values(STATUS_COLORS);
    expect(new Set(hexes).size).toBe(4); // all distinct
  });

  it("thresholds are ordered ACTIVE < IDLE and the schema version is 1", () => {
    expect(ACTIVE_TTL_MS).toBe(2 * 60 * 1000);
    expect(IDLE_TTL_MS).toBe(10 * 60 * 1000);
    expect(FUTURE_GRACE_MS).toBe(5 * 60 * 1000);
    expect(ACTIVE_TTL_MS).toBeLessThan(IDLE_TTL_MS);
    expect(MESSAGE_MAX_CHARS).toBe(240);
    expect(AGENT_OVERLAY_SCHEMA_VERSION).toBe(1);
  });
});

describe("chatEntryPid", () => {
  it("parses pid from session_key", () => {
    expect(chatEntryPid({ session_key: "pid-57676" })).toBe(57676);
  });
  it("parses pid from agent_instance when session_key absent", () => {
    expect(chatEntryPid({ agent_instance: "Claude@HOST/pid-4321" })).toBe(4321);
  });
  it("prefers session_key over agent_instance", () => {
    expect(chatEntryPid({ session_key: "pid-1", agent_instance: "x/pid-2" })).toBe(1);
  });
  it("returns null when no pid can be parsed", () => {
    expect(chatEntryPid({ session_key: "no-pid-here" })).toBeNull();
    expect(chatEntryPid({})).toBeNull();
    expect(chatEntryPid(null)).toBeNull();
    expect(chatEntryPid("string")).toBeNull();
  });
});

describe("classifyAgentStatus", () => {
  it("active + no pipeline => typing", () => {
    expect(classifyAgentStatus(slot({ lastHeartbeat: ago(30) }), null, NOW)).toBe("typing");
  });
  it("active + mid-pipeline (pipelineStep) => parsing", () => {
    expect(classifyAgentStatus(slot({ lastHeartbeat: ago(30), pipelineStep: "BUILD" }), null, NOW)).toBe("parsing");
  });
  it("active + mid-pipeline (pipelineIter only) => parsing", () => {
    expect(classifyAgentStatus(slot({ lastHeartbeat: ago(30), pipelineIter: 4 }), null, NOW)).toBe("parsing");
  });
  it("stale heartbeat (between ACTIVE and IDLE) => idle", () => {
    expect(classifyAgentStatus(slot({ lastHeartbeat: ago(300) }), null, NOW)).toBe("idle");
  });
  it("dead heartbeat (beyond IDLE) => errored", () => {
    expect(classifyAgentStatus(slot({ lastHeartbeat: ago(900) }), null, NOW)).toBe("errored");
  });
  it("unparseable heartbeat => errored", () => {
    expect(classifyAgentStatus(slot({ lastHeartbeat: "not-a-date" }), null, NOW)).toBe("errored");
    expect(classifyAgentStatus(slot({ lastHeartbeat: null }), null, NOW)).toBe("errored");
  });
  it("explicit error status in chat entry overrides a fresh heartbeat", () => {
    const fresh = slot({ lastHeartbeat: ago(10) });
    expect(classifyAgentStatus(fresh, { status: "failed" }, NOW)).toBe("errored");
    expect(classifyAgentStatus(fresh, { status: "BLOCKED" }, NOW)).toBe("errored");
    expect(classifyAgentStatus(fresh, { status: " crashed " }, NOW)).toBe("errored");
  });
  it("a long benign status string never false-matches the error regex", () => {
    const fresh = slot({ lastHeartbeat: ago(10) });
    const longStatus = "shipped engine — fixed the error and resolved a failed test, all green";
    expect(classifyAgentStatus(fresh, { status: longStatus }, NOW)).toBe("typing");
    expect(classifyAgentStatus(fresh, { status: "working" }, NOW)).toBe("typing");
  });
  it("boundary: age exactly ACTIVE_TTL_MS => idle (not typing)", () => {
    expect(classifyAgentStatus(slot({ lastHeartbeat: new Date(NOW - ACTIVE_TTL_MS).toISOString() }), null, NOW)).toBe("idle");
  });
  it("boundary: age exactly IDLE_TTL_MS => errored (not idle)", () => {
    expect(classifyAgentStatus(slot({ lastHeartbeat: new Date(NOW - IDLE_TTL_MS).toISOString() }), null, NOW)).toBe("errored");
  });
  it("boundary: one ms under ACTIVE_TTL_MS => still active (typing)", () => {
    expect(classifyAgentStatus(slot({ lastHeartbeat: new Date(NOW - ACTIVE_TTL_MS + 1).toISOString() }), null, NOW)).toBe("typing");
  });
});

describe("matchChatEntry", () => {
  const entries = [
    { session_key: "pid-100", machine: "DESKTOP-X", timestamp: ago(120), status: "working", message: "older" },
    { session_key: "pid-100", machine: "DESKTOP-X", timestamp: ago(40), status: "shipping", message: "newer" },
    { session_key: "pid-999", machine: "DESKTOP-X", timestamp: ago(5), status: "x", message: "other-pid" },
  ];
  it("returns the latest entry for the slot's pid", () => {
    const m = matchChatEntry(slot({ pid: 100 }), entries, NOW);
    expect(m && m.message).toBe("newer");
  });
  it("returns null when no entry matches the pid", () => {
    expect(matchChatEntry(slot({ pid: 12345 }), entries, NOW)).toBeNull();
  });
  it("returns null when the slot has no numeric pid", () => {
    expect(matchChatEntry(slot({ pid: null }), entries, NOW)).toBeNull();
  });
  it("rejects a cross-host entry (strict host match)", () => {
    const crossHost = [{ session_key: "pid-100", machine: "OTHER-HOST", timestamp: ago(5), message: "wrong host" }];
    expect(matchChatEntry(slot({ pid: 100, host: "DESKTOP-X" }), crossHost, NOW)).toBeNull();
  });
  it("rejects a host-less entry when the slot names a host", () => {
    const noMachine = [{ session_key: "pid-100", timestamp: ago(5), message: "no machine field" }];
    expect(matchChatEntry(slot({ pid: 100, host: "DESKTOP-X" }), noMachine, NOW)).toBeNull();
  });
  it("skips an entry timestamped implausibly far in the future", () => {
    const future = [
      { session_key: "pid-100", machine: "DESKTOP-X", timestamp: new Date(NOW + FUTURE_GRACE_MS + 60000).toISOString(), message: "future" },
      { session_key: "pid-100", machine: "DESKTOP-X", timestamp: ago(60), message: "real" },
    ];
    const m = matchChatEntry(slot({ pid: 100, host: "DESKTOP-X" }), future, NOW);
    expect(m && m.message).toBe("real");
  });
  it("ignores an entry whose timestamp is a number, not an ISO string", () => {
    const numericTs = [{ session_key: "pid-100", machine: "DESKTOP-X", timestamp: NOW, message: "numeric ts" }];
    expect(matchChatEntry(slot({ pid: 100, host: "DESKTOP-X" }), numericTs, NOW)).toBeNull();
  });
});

describe("parseChatJsonl", () => {
  it("parses valid lines and skips malformed ones", () => {
    const text = '{"a":1}\nnot json\n{"b":2}\n';
    expect(parseChatJsonl(text)).toEqual([{ a: 1 }, { b: 2 }]);
  });
  it("handles CRLF line endings", () => {
    expect(parseChatJsonl('{"a":1}\r\n{"b":2}\r\n')).toEqual([{ a: 1 }, { b: 2 }]);
  });
  it("rejects top-level JSON arrays (not entry objects)", () => {
    expect(parseChatJsonl('[1,2,3]\n{"ok":1}')).toEqual([{ ok: 1 }]);
  });
  it("returns [] for empty / non-string input", () => {
    expect(parseChatJsonl("")).toEqual([]);
    expect(parseChatJsonl(null)).toEqual([]);
  });
  it("tailLines keeps only the last N lines", () => {
    const text = '{"n":1}\n{"n":2}\n{"n":3}\n{"n":4}\n';
    expect(parseChatJsonl(text, 2)).toEqual([{ n: 3 }, { n: 4 }]);
  });
});

describe("buildAgentOverlay — 4-state overlay (exit condition 4)", () => {
  // One slot per status, plus an empty slot. Deterministic `now`.
  const chatSlots = {
    schemaVersion: 1,
    slots: {
      alpha: slot({ chatId: "c-a", pid: 101, topic: "t-a", lastHeartbeat: ago(30), pipelineStep: "BUILD", pipelineIter: 3, pipelineTarget: "x" }),
      bravo: slot({ chatId: "c-b", pid: 102, topic: "t-b", lastHeartbeat: ago(30) }),
      charlie: slot({ chatId: "c-c", pid: 103, topic: "t-c", lastHeartbeat: ago(300) }),
      delta: slot({ chatId: "c-d", pid: 104, topic: "t-d", lastHeartbeat: ago(900) }),
      echo: null,
    },
  };

  it("produces the expected overlay JSON for the simulated 4-state fleet", () => {
    const overlay = buildAgentOverlay({ chatSlots, chatEntries: [], now: NOW });
    expect(overlay).toEqual({
      schemaVersion: 1,
      generatedAt: new Date(NOW).toISOString(),
      source: { chatSlotsSchemaVersion: 1, chatEntriesScanned: 0 },
      counts: { typing: 1, parsing: 1, idle: 1, errored: 1, occupied: 4, empty: 1 },
      agents: [
        {
          slot: "alpha", nodeId: "agent.alpha", status: "parsing", color: "#3b82f6",
          chatId: "c-a", host: "DESKTOP-X", pid: 101, branch: "main", topic: "t-a", activity: "build",
          heartbeatAgeMs: 30000, pipeline: { step: "BUILD", iter: 3, target: "x" },
          lastMessage: null, lastChatTs: null,
        },
        {
          slot: "bravo", nodeId: "agent.bravo", status: "typing", color: "#22c55e",
          chatId: "c-b", host: "DESKTOP-X", pid: 102, branch: "main", topic: "t-b", activity: "build",
          heartbeatAgeMs: 30000, pipeline: null, lastMessage: null, lastChatTs: null,
        },
        {
          slot: "charlie", nodeId: "agent.charlie", status: "idle", color: "#64748b",
          chatId: "c-c", host: "DESKTOP-X", pid: 103, branch: "main", topic: "t-c", activity: "build",
          heartbeatAgeMs: 300000, pipeline: null, lastMessage: null, lastChatTs: null,
        },
        {
          slot: "delta", nodeId: "agent.delta", status: "errored", color: "#ef4444",
          chatId: "c-d", host: "DESKTOP-X", pid: 104, branch: "main", topic: "t-d", activity: "build",
          heartbeatAgeMs: 900000, pipeline: null, lastMessage: null, lastChatTs: null,
        },
      ],
    });
  });

  it("each agent's color matches its status token", () => {
    const overlay = buildAgentOverlay({ chatSlots, chatEntries: [], now: NOW });
    for (const agent of overlay.agents) {
      expect(agent.color).toBe(STATUS_COLORS[agent.status]);
    }
  });

  it("emits agents in deterministic sorted slot order", () => {
    const overlay = buildAgentOverlay({ chatSlots, chatEntries: [], now: NOW });
    expect(overlay.agents.map((a) => a.slot)).toEqual(["alpha", "bravo", "charlie", "delta"]);
  });
});

describe("buildAgentOverlay — chat-entry integration + edge cases", () => {
  it("attaches the matched chat entry's message + applies an error-status override", () => {
    const chatSlots = { schemaVersion: 1, slots: { alpha: slot({ pid: 200, lastHeartbeat: ago(20) }) } };
    const chatEntries = [
      { session_key: "pid-200", machine: "DESKTOP-X", timestamp: ago(15), status: "failed", message: "build broke" },
    ];
    const overlay = buildAgentOverlay({ chatSlots, chatEntries, now: NOW });
    expect(overlay.agents[0].status).toBe("errored"); // override despite fresh heartbeat
    expect(overlay.agents[0].lastMessage).toBe("build broke");
    expect(overlay.source.chatEntriesScanned).toBe(1);
  });

  it("strips control chars and truncates an over-long lastMessage", () => {
    const longMsg = "x".repeat(MESSAGE_MAX_CHARS + 50);
    const chatSlots = { schemaVersion: 1, slots: { alpha: slot({ pid: 201, lastHeartbeat: ago(20) }) } };
    const chatEntries = [{ session_key: "pid-201", machine: "DESKTOP-X", timestamp: ago(10), message: "a\tb\nc " + longMsg }];
    const overlay = buildAgentOverlay({ chatSlots, chatEntries, now: NOW });
    const msg = overlay.agents[0].lastMessage;
    expect(msg.length).toBe(MESSAGE_MAX_CHARS);
    expect(msg.endsWith("...")).toBe(true);
    expect(msg.slice(0, 5)).toBe("a b c"); // tab + newline replaced with spaces
  });

  it("treats null / malformed chatSlots as an empty fleet", () => {
    expect(buildAgentOverlay({ chatSlots: null, now: NOW }).agents).toEqual([]);
    expect(buildAgentOverlay({ chatSlots: { slots: "bad" }, now: NOW }).counts.occupied).toBe(0);
    expect(buildAgentOverlay({}).agents).toEqual([]);
  });

  it("counts empty slots without rendering them", () => {
    const chatSlots = { schemaVersion: 1, slots: { alpha: slot({ pid: 1 }), bravo: null, charlie: null } };
    const overlay = buildAgentOverlay({ chatSlots, chatEntries: [], now: NOW });
    expect(overlay.counts.occupied).toBe(1);
    expect(overlay.counts.empty).toBe(2);
    expect(overlay.agents).toHaveLength(1);
  });

  it("clamps a future heartbeat's age to 0 rather than emitting a negative", () => {
    const chatSlots = { schemaVersion: 1, slots: { alpha: slot({ pid: 1, lastHeartbeat: new Date(NOW + 5000).toISOString() }) } };
    const overlay = buildAgentOverlay({ chatSlots, chatEntries: [], now: NOW });
    expect(overlay.agents[0].heartbeatAgeMs).toBe(0);
  });

  it("is deterministic — identical inputs produce a byte-identical overlay", () => {
    const chatSlots = { schemaVersion: 1, slots: { alpha: slot({ pid: 1 }), bravo: slot({ pid: 2 }) } };
    const a = buildAgentOverlay({ chatSlots, chatEntries: [], now: NOW });
    const b = buildAgentOverlay({ chatSlots, chatEntries: [], now: NOW });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("drift-guard: vendored thresholds vs chat-slots.mjs", () => {
  it("ACTIVE_TTL_MS / IDLE_TTL_MS still match chat-slots.mjs STALE/CRASH constants", () => {
    const src = readFileSync(join(REPO_ROOT, ".claude", "helpers", "chat-slots.mjs"), "utf8");
    // Assumes the canonical `N * N * N` literal form; any other form makes the
    // regex miss and the guard fail loudly (the correct failure direction).
    const extract = (name: string): number => {
      const m = src.match(new RegExp("export const " + name + "\\s*=\\s*([0-9*\\s]+);"));
      if (!m) throw new Error(`drift-guard: ${name} not found in chat-slots.mjs`);
      return m[1].split("*").map((s) => Number(s.trim())).reduce((acc, n) => acc * n, 1);
    };
    expect(extract("STALE_TTL_MS")).toBe(ACTIVE_TTL_MS);
    expect(extract("CRASH_TTL_MS")).toBe(IDLE_TTL_MS);
  });
});

describe("drift-guard: STATUS_COLORS vs agent-overlay.css", () => {
  it("every STATUS_COLORS hex is present in agent-overlay.css", () => {
    const css = readFileSync(join(REPO_ROOT, "state", "shared", "system-viz", "agent-overlay.css"), "utf8");
    for (const hex of Object.values(STATUS_COLORS)) {
      expect(css.includes(hex)).toBe(true);
    }
  });
});

describe("drift-guard: agent-overlay.js renderer stays XSS-safe", () => {
  it("the renderer code uses no HTML-injection sink", () => {
    const js = readFileSync(join(REPO_ROOT, "state", "shared", "system-viz", "agent-overlay.js"), "utf8");
    // Strip comments so the prose mention of "innerHTML" in the header does not false-trip.
    const code = js.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
    expect(/\.innerHTML\s*=/.test(code)).toBe(false);
    expect(/insertAdjacentHTML|document\.write|\.outerHTML\s*=/.test(code)).toBe(false);
    expect(code.includes("textContent")).toBe(true);
  });
});
