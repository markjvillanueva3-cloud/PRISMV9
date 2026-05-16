/**
 * AgentWatchdog.test.ts — vitest suite for the agent-watchdog stall detector.
 *
 * OBSIDIAN-INTELLIGENCE-MS3 / U-AGENT-RUNTIME-ALERTS (G3).
 *
 * Tests the pure exports of .claude/hooks/agent-watchdog.mjs:
 *   - detectStalls(slotsState, now, opts) — stall identification
 *   - shouldAlert(chatId, now, opts)      — rate-limit gate
 *   - stampPathFor(stampDir, chatId)      — path sanitization
 *   - buildAlertRecord(stall, now)         — JSONL line construction
 *   - buildSummary(alerts, opts)           — human-readable digest
 */
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Hook lives outside the mcp-server tsconfig — use the absolute repo path.
// Vitest resolves .mjs imports natively at runtime.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — .mjs import from sibling tree
import {
  detectStalls,
  shouldAlert,
  stampPathFor,
  buildAlertRecord,
  buildSummary,
} from "../../../.claude/hooks/agent-watchdog.mjs";

const T0 = Date.parse("2026-05-15T20:00:00Z"); // fixed reference time
const MS_PER_MIN = 60_000;

function slotsAt(ages: Record<string, number | null>) {
  // Build a chat-slots.json-shaped object where age is minutes-since-T0.
  // null = unclaimed slot.
  const slots: Record<string, any> = {};
  for (const [name, ageMin] of Object.entries(ages)) {
    if (ageMin === null) {
      slots[name] = null;
      continue;
    }
    slots[name] = {
      chatId: `claude-${name.slice(0, 8)}`,
      lastHeartbeat: new Date(T0 - ageMin * MS_PER_MIN).toISOString(),
      branch: "cad-fusion-live-ms0",
      topic: `${name}-topic`,
      activity: "working",
    };
  }
  return { slots };
}

describe("detectStalls", () => {
  it("flags slots older than the stall threshold", () => {
    const state = slotsAt({ alpha: 15, bravo: 5, charlie: 30 });
    const stalls = detectStalls(state, T0, { stallMs: 10 * MS_PER_MIN });
    expect(stalls.map((s: any) => s.slot).sort()).toEqual(["alpha", "charlie"]);
  });

  it("returns empty array when nothing is stalled", () => {
    const state = slotsAt({ alpha: 1, bravo: 2 });
    const stalls = detectStalls(state, T0, { stallMs: 10 * MS_PER_MIN });
    expect(stalls).toEqual([]);
  });

  it("includes slot metadata in each alert (chatId, ageMs, branch, topic, activity)", () => {
    const state = slotsAt({ delta: 20 });
    const [alert] = detectStalls(state, T0, { stallMs: 10 * MS_PER_MIN });
    expect(alert.slot).toBe("delta");
    expect(alert.chatId).toBe("claude-delta");
    expect(alert.ageMs).toBe(20 * MS_PER_MIN);
    expect(alert.branch).toBe("cad-fusion-live-ms0");
    expect(alert.topic).toBe("delta-topic");
    expect(alert.activity).toBe("working");
  });

  it("skips slots with null/missing chatId or heartbeat", () => {
    const state = {
      slots: {
        alpha: null, // unclaimed
        bravo: {}, // no chatId/heartbeat
        charlie: {
          chatId: "claude-charlie",
          lastHeartbeat: new Date(T0 - 20 * MS_PER_MIN).toISOString(),
        },
      },
    };
    const stalls = detectStalls(state, T0, { stallMs: 10 * MS_PER_MIN });
    expect(stalls.length).toBe(1);
    expect(stalls[0].slot).toBe("charlie");
  });

  it("uses default 10-min threshold when stallMs unspecified", () => {
    const state = slotsAt({ alpha: 11, bravo: 9 });
    const stalls = detectStalls(state, T0, {});
    expect(stalls.map((s: any) => s.slot)).toEqual(["alpha"]);
  });

  it("rejects unparseable heartbeat ISO strings (silent skip)", () => {
    const state = {
      slots: {
        alpha: { chatId: "x", lastHeartbeat: "not-a-date" },
        bravo: { chatId: "y", lastHeartbeat: new Date(T0 - 20 * MS_PER_MIN).toISOString() },
      },
    };
    const stalls = detectStalls(state, T0, { stallMs: 10 * MS_PER_MIN });
    expect(stalls.map((s: any) => s.chatId)).toEqual(["y"]);
  });

  it("returns [] for null/non-object input (silent-fail)", () => {
    expect(detectStalls(null, T0, {})).toEqual([]);
    expect(detectStalls({}, T0, {})).toEqual([]);
    expect(detectStalls({ slots: null }, T0, {})).toEqual([]);
    expect(detectStalls("string" as any, T0, {})).toEqual([]);
  });

  it("ageMs exactly at threshold counts as stalled (inclusive)", () => {
    const state = slotsAt({ alpha: 10 });
    const stalls = detectStalls(state, T0, { stallMs: 10 * MS_PER_MIN });
    expect(stalls.length).toBe(1);
  });

  it("handles production chat-slots.json shape (null slots + extra fields)", () => {
    // Real chat-slots.json has unclaimed slots as `null` AND alive slots
    // carry extra fields beyond {chatId, lastHeartbeat} that the hook
    // ignores. Both must coexist without TypeError on Object.entries.
    const state = {
      slots: {
        alpha: null, // unclaimed
        bravo: null,
        charlie: {
          chatId: "claude-charlie",
          lastHeartbeat: new Date(T0 - 20 * MS_PER_MIN).toISOString(),
          branch: "main",
          topic: "x",
          activity: "working",
          pipelineStep: "build",     // extra field — must be ignored
          pipelineIter: 3,
          pipelineTarget: 6,
          terminalWindowId: "tw-foo",
        },
      },
    };
    const stalls = detectStalls(state, T0, { stallMs: 10 * MS_PER_MIN });
    expect(stalls.length).toBe(1);
    expect(stalls[0].slot).toBe("charlie");
  });
});

describe("stampPathFor", () => {
  it("appends .stamp to the chatId under the dir", () => {
    expect(stampPathFor("/tmp/dir", "claude-abc123")).toBe(
      join("/tmp/dir", "claude-abc123.stamp"),
    );
  });

  it("sanitizes path-traversal attempts (./ and / → _)", () => {
    const out = stampPathFor("/tmp/dir", "../../../etc/passwd");
    // Critical safety invariant: no slashes/dots reach the path component
    expect(out).toBe(join("/tmp/dir", "_________etc_passwd.stamp"));
    expect(out).not.toMatch(/\.\.[/\\]/);
    expect(out.endsWith(".stamp")).toBe(true);
  });

  it("sanitizes shell-special chars (space, semicolon, dash kept)", () => {
    const out = stampPathFor("/tmp/dir", "abc;rm -rf /");
    // ; → _, space → _, / → _ ; '-' is in the allowlist
    expect(out).toBe(join("/tmp/dir", "abc_rm_-rf__.stamp"));
  });
});

describe("shouldAlert", () => {
  const stampDir = mkdtempSync(join(tmpdir(), "agent-watchdog-"));

  it("returns true when no stamp exists (first alert)", () => {
    expect(shouldAlert("claude-new", T0, { stampDir, rateLimitMs: 60 * MS_PER_MIN })).toBe(true);
  });

  it("returns false when stamp is within rate-limit window", () => {
    const chatId = "claude-recent";
    writeFileSync(stampPathFor(stampDir, chatId), String(T0 - 30 * MS_PER_MIN), "utf8");
    expect(shouldAlert(chatId, T0, { stampDir, rateLimitMs: 60 * MS_PER_MIN })).toBe(false);
  });

  it("returns true when stamp is beyond rate-limit window", () => {
    const chatId = "claude-old";
    writeFileSync(stampPathFor(stampDir, chatId), String(T0 - 90 * MS_PER_MIN), "utf8");
    expect(shouldAlert(chatId, T0, { stampDir, rateLimitMs: 60 * MS_PER_MIN })).toBe(true);
  });

  it("returns true when stamp contents are unparseable", () => {
    const chatId = "claude-garbled";
    writeFileSync(stampPathFor(stampDir, chatId), "not-a-number", "utf8");
    expect(shouldAlert(chatId, T0, { stampDir, rateLimitMs: 60 * MS_PER_MIN })).toBe(true);
  });

  it("returns false for empty chatId", () => {
    expect(shouldAlert("", T0, { stampDir, rateLimitMs: 60 * MS_PER_MIN })).toBe(false);
  });

  it("uses default 60-min rate limit when rateLimitMs unspecified", () => {
    const chatId = "claude-default";
    writeFileSync(stampPathFor(stampDir, chatId), String(T0 - 30 * MS_PER_MIN), "utf8");
    expect(shouldAlert(chatId, T0, { stampDir })).toBe(false);
    // After 61 min, should alert again
    expect(shouldAlert(chatId, T0 + 31 * MS_PER_MIN, { stampDir })).toBe(true);
  });
});

describe("buildAlertRecord", () => {
  it("produces valid JSON with schema version + all required fields", () => {
    const stall = {
      slot: "alpha",
      chatId: "claude-abc",
      ageMs: 20 * MS_PER_MIN,
      lastHeartbeat: new Date(T0 - 20 * MS_PER_MIN).toISOString(),
      branch: "main",
      topic: "x",
      activity: "y",
    };
    const line = buildAlertRecord(stall, T0);
    const parsed = JSON.parse(line);
    expect(parsed.schemaVersion).toBe("1.0.0");
    expect(parsed.chatId).toBe("claude-abc");
    expect(parsed.slot).toBe("alpha");
    expect(parsed.ageMs).toBe(20 * MS_PER_MIN);
    expect(parsed.ageMinutes).toBe(20);
    expect(parsed.ts).toBe(new Date(T0).toISOString());
  });
});

describe("buildSummary", () => {
  it("returns empty string for zero alerts", () => {
    expect(buildSummary([], { stallMin: 10 })).toBe("");
  });

  it("includes count + per-alert line for ≤5 alerts", () => {
    const alerts = [
      { slot: "alpha", chatId: "claude-a", ageMs: 15 * MS_PER_MIN, topic: "x", activity: "y", lastHeartbeat: "", branch: "" },
    ];
    const out = buildSummary(alerts, { stallMin: 10 });
    expect(out).toMatch(/1 stalled slot/);
    expect(out).toMatch(/alpha/);
    expect(out).toMatch(/15m idle/);
  });

  it("truncates the list at 5 alerts with an ellipsis line", () => {
    const alerts = Array.from({ length: 7 }, (_, i) => ({
      slot: `s${i}`,
      chatId: `claude-${i}`,
      ageMs: 20 * MS_PER_MIN,
      topic: "",
      activity: "",
      lastHeartbeat: "",
      branch: "",
    }));
    const out = buildSummary(alerts, { stallMin: 10 });
    expect(out).toMatch(/and 2 more/);
    // 5 detail lines emitted, not 7
    const detailLines = out.split("\n").filter((l) => /^ {2}- /.test(l));
    expect(detailLines.length).toBe(5);
  });

  it("uses default stallMin (10) when not provided", () => {
    const alerts = [{ slot: "x", chatId: "y", ageMs: 30 * MS_PER_MIN, topic: "", activity: "", lastHeartbeat: "", branch: "" }];
    expect(buildSummary(alerts, {})).toMatch(/>10m/);
  });
});

describe("integration: simulated stall scenarios", () => {
  it("simulated 10-chat fleet with 2 stalled + 8 fresh produces 2 alerts", () => {
    const state = slotsAt({
      alpha: 1,
      bravo: 2,
      charlie: 3,
      delta: 4,
      echo: 5,
      foxtrot: 15, // stalled
      golf: 6,
      hotel: 7,
      india: 22, // stalled
      juliett: 8,
    });
    const stalls = detectStalls(state, T0, { stallMs: 10 * MS_PER_MIN });
    expect(stalls.length).toBe(2);
    expect(stalls.map((s: any) => s.slot).sort()).toEqual(["foxtrot", "india"]);
  });

  it("simulated non-stall scenario silent (zero alerts emitted)", () => {
    const state = slotsAt({ alpha: 1, bravo: 2, charlie: 3 });
    const stalls = detectStalls(state, T0, { stallMs: 10 * MS_PER_MIN });
    expect(stalls).toEqual([]);
    expect(buildSummary(stalls, { stallMin: 10 })).toBe("");
  });

  it("rate-limit prevents double-firing on the same chat within 60min", () => {
    const sd = mkdtempSync(join(tmpdir(), "agent-wd-rate-"));
    const chatId = "claude-stalled";
    // First check: no stamp exists, should alert.
    expect(shouldAlert(chatId, T0, { stampDir: sd, rateLimitMs: 60 * MS_PER_MIN })).toBe(true);
    // Stamp now, then re-check 5 min later: rate-limited.
    writeFileSync(stampPathFor(sd, chatId), String(T0), "utf8");
    expect(shouldAlert(chatId, T0 + 5 * MS_PER_MIN, { stampDir: sd, rateLimitMs: 60 * MS_PER_MIN })).toBe(false);
    // 61 min later: rate-limit window cleared, should alert again.
    expect(shouldAlert(chatId, T0 + 61 * MS_PER_MIN, { stampDir: sd, rateLimitMs: 60 * MS_PER_MIN })).toBe(true);
    rmSync(sd, { recursive: true, force: true });
  });
});
