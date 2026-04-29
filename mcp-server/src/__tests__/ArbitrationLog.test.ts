/**
 * ArbitrationLog.test.ts
 *
 * Covers .claude/helpers/arbitration-log.mjs — the append-only event log
 * that the three P5 hooks (pre-edit-lane-guard, auto-fork-executor,
 * cross-chat-directive-detector) write into so we can see when the rails
 * fire and surface the count in the per-agent handoff.
 *
 * Tests redirect the log path to a per-test tmpdir via PRISM_ARBITRATION_LOG
 * so they never touch real shared state. Hook + CLI invocations are real
 * subprocesses (spawnSync). Module imports use the helper file URL so the
 * helper's pure functions can be exercised in-process too.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const HELPER_TIMEOUT_MS = 5000;
const REPO_ROOT = resolve(__dirname, "../../..");
const HELPER_PATH = resolve(REPO_ROOT, ".claude/helpers/arbitration-log.mjs");

interface Event {
  ts: string;
  kind: string;
  sessionId: string;
  pcName: string;
  details: Record<string, unknown>;
}

let scratchRoot: string;
let logPath: string;

beforeEach(() => {
  scratchRoot = mkdtempSync(join(tmpdir(), "prism-arb-log-"));
  logPath = join(scratchRoot, "AGENT_CONFLICT_ARBITRATION.json");
});

afterEach(() => {
  try {
    rmSync(scratchRoot, { recursive: true, force: true });
  } catch {
    // best-effort
  }
});

function runHelper(args: string[], extraEnv: Record<string, string> = {}): {
  code: number;
  stdout: string;
  stderr: string;
} {
  const r = spawnSync(process.execPath, [HELPER_PATH, ...args], {
    encoding: "utf-8",
    timeout: HELPER_TIMEOUT_MS,
    env: { ...process.env, PRISM_ARBITRATION_LOG: logPath, ...extraEnv },
  });
  return {
    code: r.status ?? -1,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
  };
}

function readRawLog(): { events: Event[] } {
  const raw = readFileSync(logPath, "utf-8");
  return JSON.parse(raw) as { events: Event[] };
}

describe("arbitration-log — script presence + smoke", () => {
  it("helper script exists on disk", () => {
    expect(existsSync(HELPER_PATH)).toBe(true);
  });

  it("`summary` on a missing log returns zero counts (creates fresh)", () => {
    const r = runHelper(["summary"]);
    expect(r.code).toBe(0);
    const counts = JSON.parse(r.stdout) as Record<string, number>;
    expect(counts["auto-fork"]).toBe(0);
    expect(counts["lane-block"]).toBe(0);
    expect(counts["directive-warn"]).toBe(0);
    expect(counts["consensus-dissent"]).toBe(0);
  });

  it("`render-line` on an empty log says rails are quiet", () => {
    const r = runHelper(["render-line"]);
    expect(r.code).toBe(0);
    expect(r.stdout.includes("none — rails quiet")).toBe(true);
  });
});

describe("arbitration-log — append + read round-trip via CLI", () => {
  it("writes a single auto-fork event and reads it back", () => {
    const append = runHelper([
      "append",
      "--kind",
      "auto-fork",
      "--session",
      "claude-test1234",
      "--details",
      JSON.stringify({ scope: "foo", newWorktree: "../prism-foo-test" }),
    ]);
    expect(append.code).toBe(0);
    expect(JSON.parse(append.stdout).ok).toBe(true);

    const read = runHelper(["read", "--session", "claude-test1234"]);
    const events = JSON.parse(read.stdout) as Event[];
    expect(events.length).toBe(1);
    expect(events[0].kind).toBe("auto-fork");
    expect(events[0].sessionId).toBe("claude-test1234");
    expect((events[0].details as { scope: string }).scope).toBe("foo");
  });

  it("writes multiple events and counts them correctly per-kind", () => {
    runHelper(["append", "--kind", "auto-fork", "--session", "claude-A", "--details", "{}"]);
    runHelper(["append", "--kind", "auto-fork", "--session", "claude-A", "--details", "{}"]);
    runHelper(["append", "--kind", "lane-block", "--session", "claude-A", "--details", "{}"]);
    runHelper(["append", "--kind", "directive-warn", "--session", "claude-B", "--details", "{}"]);

    const summary = JSON.parse(runHelper(["summary"]).stdout) as Record<string, number>;
    expect(summary["auto-fork"]).toBe(2);
    expect(summary["lane-block"]).toBe(1);
    expect(summary["directive-warn"]).toBe(1);
  });

  it("filters by session correctly", () => {
    runHelper(["append", "--kind", "auto-fork", "--session", "claude-X", "--details", "{}"]);
    runHelper(["append", "--kind", "lane-block", "--session", "claude-Y", "--details", "{}"]);

    const sessionX = JSON.parse(
      runHelper(["read", "--session", "claude-X"]).stdout,
    ) as Event[];
    expect(sessionX.length).toBe(1);
    expect(sessionX[0].sessionId).toBe("claude-X");
  });
});

describe("arbitration-log — render-line shape", () => {
  it("includes the kind counts when the log has entries", () => {
    runHelper(["append", "--kind", "auto-fork", "--session", "claude-A", "--details", "{}"]);
    runHelper(["append", "--kind", "auto-fork", "--session", "claude-A", "--details", "{}"]);
    runHelper(["append", "--kind", "lane-block", "--session", "claude-A", "--details", "{}"]);

    const line = runHelper(["render-line"]).stdout.trim();
    expect(line.startsWith("Arbitrations")).toBe(true);
    expect(line.includes("2 auto-fork")).toBe(true);
    expect(line.includes("1 lane-block")).toBe(true);
    expect(line.includes("last:")).toBe(true);
  });

  it("scopes render-line output to a session when --session passed", () => {
    runHelper(["append", "--kind", "auto-fork", "--session", "claude-A", "--details", "{}"]);
    runHelper(["append", "--kind", "lane-block", "--session", "claude-B", "--details", "{}"]);

    const lineA = runHelper(["render-line", "--session", "claude-A"]).stdout.trim();
    const lineB = runHelper(["render-line", "--session", "claude-B"]).stdout.trim();
    expect(lineA.includes("1 auto-fork")).toBe(true);
    expect(lineA.includes("lane-block")).toBe(false);
    expect(lineB.includes("1 lane-block")).toBe(true);
    expect(lineB.includes("auto-fork")).toBe(false);
  });
});

describe("arbitration-log — programmatic API (in-process)", () => {
  it("appendEvent + readEvents + summarizeEvents form a coherent surface", async () => {
    process.env.PRISM_ARBITRATION_LOG = logPath;
    // Dynamic import after env override so the helper picks up the test path
    const helperUrl = pathToFileURL(HELPER_PATH).href;
    const mod = (await import(`${helperUrl}?cachebust=${Date.now()}`)) as {
      appendEvent: (k: string, d: object, c?: object) => boolean;
      readEvents: (opts?: { sessionId?: string }) => Event[];
      summarizeEvents: (events: Event[]) => Record<string, number>;
    };

    expect(mod.appendEvent("auto-fork", { scope: "alpha" }, { sessionId: "claude-A" })).toBe(true);
    expect(mod.appendEvent("lane-block", { file: "x.ts" }, { sessionId: "claude-A" })).toBe(true);
    expect(mod.appendEvent("auto-fork", { scope: "beta" }, { sessionId: "claude-B" })).toBe(true);

    const all = mod.readEvents();
    expect(all.length).toBe(3);

    const aOnly = mod.readEvents({ sessionId: "claude-A" });
    expect(aOnly.length).toBe(2);

    const counts = mod.summarizeEvents(all);
    expect(counts["auto-fork"]).toBe(2);
    expect(counts["lane-block"]).toBe(1);
  });
});

describe("arbitration-log — schema discipline", () => {
  it("first append creates the JSON file with schemaVersion + events array", () => {
    runHelper([
      "append",
      "--kind",
      "auto-fork",
      "--session",
      "claude-A",
      "--details",
      "{}",
    ]);
    const log = readRawLog();
    expect(Array.isArray(log.events)).toBe(true);
    expect(log.events.length).toBe(1);
    const raw = readFileSync(logPath, "utf-8");
    expect(raw.includes('"schemaVersion"')).toBe(true);
  });

  it("malformed existing log is rebuilt from scratch instead of crashing", () => {
    // Write garbage at the log path
    writeFileSync(logPath, "{not: 'valid json' [", "utf-8");
    const r = runHelper([
      "append",
      "--kind",
      "auto-fork",
      "--session",
      "claude-A",
      "--details",
      "{}",
    ]);
    expect(r.code).toBe(0);
    const log = readRawLog();
    expect(log.events.length).toBe(1);
    expect(log.events[0].kind).toBe("auto-fork");
  });

  it("event details are preserved verbatim (not stringified twice)", () => {
    const detailsIn = { scope: "z", nested: { key: "value", n: 42 } };
    runHelper([
      "append",
      "--kind",
      "auto-fork",
      "--session",
      "claude-A",
      "--details",
      JSON.stringify(detailsIn),
    ]);
    const log = readRawLog();
    expect(log.events[0].details).toEqual(detailsIn);
  });
});
