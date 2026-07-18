/**
 * SessionReplayEngine-wire.test.ts
 *
 * Wire test for WIRE-UNWIRED/U-SRE: surfaces SessionReplayEngine through
 * sessionDispatcher as 4 git-backed replay actions. Complements (not
 * replaces) JSON-state actions quick_resume / state_reconstruct /
 * session_recover — replay_* reads git history.
 *
 * Pure value/equality assertions only — no toBeDefined / Array.isArray /
 * typeof-presence checks. Every expect() asserts a concrete value.
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  registerSessionDispatcher,
  _replayMapResult,
  _stripHomeDir,
} from "../tools/dispatchers/sessionDispatcher.js";
import { sessionReplayEngine, SessionReplayEngine } from "../engines/SessionReplayEngine.js";
import { ACTION_SESSION_SCHEMAS } from "../schemas/sessionActionSchemas.js";

const SESSION_DISPATCHER_SRC = path.resolve(__dirname, "../tools/dispatchers/sessionDispatcher.ts");

const EXPECTED_REPLAY_ACTIONS = [
  "replay_context",
  "replay_resume_line",
  "replay_working_set",
  "replay_diff_summary",
] as const;

/** Strict git short-hash — NO sentinel allowed in any success-path output. */
const STRICT_SHORT_HASH = /^[a-f0-9]{7,40}$/;
const SUMMARY_FORMAT = /^Last: \S+ ".*" \(.*\) \| Area: .+ \| \d+ files changed$/;

class MockMCPServer {
  tools: Array<{
    name: string;
    handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
  }> = [];
  tool(name: string, _desc: string, _schema: unknown, handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>) {
    this.tools.push({ name, handler });
  }
}

async function callSession(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ parsed: Record<string, unknown>; text: string }> {
  const tool = server.tools[0];
  if (!tool) throw new Error("prism_session tool not registered on mock server");
  const raw = (await tool.handler({ action, params })) as { content: { type: string; text: string }[] };
  const text = raw.content[0].text;
  const parsed = JSON.parse(text) as Record<string, unknown>;
  return { parsed, text };
}

// ───────────────────────────────────────────────────────────────────────
// 1 — Source wiring (string occurrence counts — concrete-value assertions)

describe("sessionDispatcher source wiring — replay_* actions", () => {
  it("dispatcher source has exactly 4 case-handler entries for replay_* actions", () => {
    const src = fs.readFileSync(SESSION_DISPATCHER_SRC, "utf8");
    let count = 0;
    for (const action of EXPECTED_REPLAY_ACTIONS) {
      if (src.includes(`case "${action}":`)) count++;
    }
    expect(count).toBe(4);
  });

  it("dispatcher source has exactly 4 lazy-imports of SessionReplayEngine", () => {
    const src = fs.readFileSync(SESSION_DISPATCHER_SRC, "utf8");
    const importStmt = `await import("../../engines/SessionReplayEngine.js")`;
    const matches = src.split(importStmt).length - 1;
    expect(matches).toBe(4);
  });

  it("dispatcher source references _replayMapResult ≥5 times (1 export decl + 4 call-sites)", () => {
    const src = fs.readFileSync(SESSION_DISPATCHER_SRC, "utf8");
    const occurrences = src.split("_replayMapResult").length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(5);
  });

  it("ACTIONS array contains all 4 replay_* string literals", () => {
    const src = fs.readFileSync(SESSION_DISPATCHER_SRC, "utf8");
    let count = 0;
    for (const action of EXPECTED_REPLAY_ACTIONS) {
      if (src.includes(`"${action}"`)) count++;
    }
    expect(count).toBe(4);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 2 — Zod schema parse behavior (success/failure value checks)

describe("ACTION_SESSION_SCHEMAS — replay_* validation surface", () => {
  it("all 4 replay_* schemas accept empty {} params (every parse succeeds)", () => {
    const allSucceed = EXPECTED_REPLAY_ACTIONS.every(a => {
      const schema = ACTION_SESSION_SCHEMAS[a]!;
      return schema.safeParse({}).success === true;
    });
    expect(allSucceed).toBe(true);
  });

  it("replay_context schema: accepts 1, 5, 50; rejects 0, -1, 51, 1.5", () => {
    const schema = ACTION_SESSION_SCHEMAS["replay_context"]!;
    const accept = [1, 5, 50].map(n => schema.safeParse({ max_commits: n }).success);
    const reject = [0, -1, 51, 1.5].map(n => schema.safeParse({ max_commits: n }).success);
    expect(accept).toEqual([true, true, true]);
    expect(reject).toEqual([false, false, false, false]);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 3 — _replayMapResult error-sentinel detection (P0 fix from reviewer B)

describe("_replayMapResult — error-sentinel detection", () => {
  it("maps engine error-sentinel ReplayContext to {ok:false, error:'git_unavailable'}", () => {
    const raw = {
      lastCommit: { hash: "error", message: "fatal: not a git repository", ago: "" },
      recentCommits: [],
      modifiedFiles: [],
      activeArea: "unknown",
      summary: "Session replay failed: fatal: not a git repository",
      suggestedNextSteps: ["Check git status"],
    };
    const mapped = _replayMapResult(raw) as { ok: boolean; error: string; detail: string };
    expect(mapped.ok).toBe(false);
    expect(mapped.error).toBe("git_unavailable");
    expect(mapped.detail.length).toBeGreaterThan(0);
    // Critical: raw stderr ("fatal: not a git repository") MUST NOT round-trip into detail
    expect(mapped.detail.includes("fatal: not a git repository")).toBe(false);
  });

  it("maps 'Could not determine session context' resumeLine to {ok:false, error:'git_unavailable'}", () => {
    const mapped = _replayMapResult({ resumeLine: "Could not determine session context" }) as { ok: boolean; error: string };
    expect(mapped.ok).toBe(false);
    expect(mapped.error).toBe("git_unavailable");
  });

  it("passes healthy ReplayContext through with hash preserved + no ok/error fields injected", () => {
    const raw = {
      lastCommit: { hash: "abc1234", message: "feat: thing", ago: "1 hour ago" },
      recentCommits: [{ hash: "abc1234", message: "feat: thing" }],
      modifiedFiles: ["src/foo.ts"],
      activeArea: "engines",
      summary: 'Last: abc1234 "feat: thing" (1 hour ago) | Area: engines | 1 files changed',
      suggestedNextSteps: ["Run tests"],
    };
    const mapped = _replayMapResult(raw) as Record<string, unknown> & {
      lastCommit: { hash: string };
      summary: string;
    };
    expect(mapped.lastCommit.hash).toBe("abc1234");
    expect(mapped.summary).toBe(raw.summary);
    // Success-path discriminant: keys 'ok' and 'error' are NOT present
    expect("ok" in mapped).toBe(false);
    expect("error" in mapped).toBe(false);
  });

  it("passes healthy resumeLine wrapper through unchanged", () => {
    const raw = { resumeLine: 'Last: abc1234 "feat" (1 hour ago) | Area: engines | 0 files changed' };
    const mapped = _replayMapResult(raw) as { resumeLine: string };
    expect(mapped.resumeLine).toBe(raw.resumeLine);
    expect("ok" in (mapped as Record<string, unknown>)).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 4 — _stripHomeDir path sanitization (P1 fix)

describe("_stripHomeDir — path sanitization", () => {
  it("replaces Windows-style HOME prefix with '~' across nested fields", () => {
    const home = "C:\\Users\\wompu";
    const raw = {
      modifiedFiles: ["C:\\Users\\wompu\\.claude\\token.json", "src/foo.ts"],
      lastCommit: { hash: "abc", message: "C:\\Users\\wompu in commit msg", ago: "" },
    };
    const out = _stripHomeDir(raw, home) as typeof raw;
    expect(out.modifiedFiles[0]).toBe("~\\.claude\\token.json");
    expect(out.modifiedFiles[1]).toBe("src/foo.ts");
    expect(out.lastCommit.message).toBe("~ in commit msg");
  });

  it("replaces POSIX-style HOME prefix with '~'", () => {
    const home = "/home/operator";
    const out = _stripHomeDir(
      { staged: ["/home/operator/.ssh/id_rsa", "src/bar.ts"] },
      home,
    ) as { staged: string[] };
    expect(out.staged[0]).toBe("~/.ssh/id_rsa");
    expect(out.staged[1]).toBe("src/bar.ts");
  });

  it("returns input deeply equal when homeDir is empty", () => {
    const raw = { foo: "C:\\Users\\anything" };
    expect(_stripHomeDir(raw, "")).toEqual(raw);
  });

  it("handles nested arrays + objects + null + numbers without crashing", () => {
    const home = "/h/u";
    const raw = {
      arr: ["/h/u/x", null, 42, { deep: "/h/u/deep" }],
      n: null,
      n2: 7,
    };
    const out = _stripHomeDir(raw, home) as typeof raw & { arr: unknown[] };
    expect(out.arr[0]).toBe("~/x");
    expect(out.arr[1]).toBe(null);
    expect(out.arr[2]).toBe(42);
    expect((out.arr[3] as { deep: string }).deep).toBe("~/deep");
  });
});

// ───────────────────────────────────────────────────────────────────────
// 5 — Singleton behavior (concrete-value, no presence checks)

describe("SessionReplayEngine — singleton + method outputs", () => {
  it("singleton is an instance of SessionReplayEngine", () => {
    expect(sessionReplayEngine instanceof SessionReplayEngine).toBe(true);
  });

  it("singleton constructor.name equals 'SessionReplayEngine'", () => {
    expect(sessionReplayEngine.constructor.name).toBe("SessionReplayEngine");
  });

  it("getReplayContext(3) returns recentCommits with STRICT short-hash entries (1..3 count)", () => {
    const ctx = sessionReplayEngine.getReplayContext(3);
    expect(ctx.recentCommits.length).toBeGreaterThanOrEqual(1);
    expect(ctx.recentCommits.length).toBeLessThanOrEqual(3);
    const allHashesValid = ctx.recentCommits.every(c => STRICT_SHORT_HASH.test(c.hash));
    expect(allHashesValid).toBe(true);
    const allMessagesNonEmpty = ctx.recentCommits.every(c => c.message.length > 0);
    expect(allMessagesNonEmpty).toBe(true);
    expect(ctx.lastCommit.hash).toBe(ctx.recentCommits[0].hash);
  });

  it("getReplayContext().summary matches engine emit format + suggestedNextSteps non-empty", () => {
    const ctx = sessionReplayEngine.getReplayContext(3);
    expect(SUMMARY_FORMAT.test(ctx.summary)).toBe(true);
    expect(ctx.suggestedNextSteps.length).toBeGreaterThanOrEqual(1);
  });

  it("getResumeLine() matches SUMMARY_FORMAT (not the failure sentinel string)", () => {
    const line = sessionReplayEngine.getResumeLine();
    expect(line.startsWith("Could not determine")).toBe(false);
    expect(SUMMARY_FORMAT.test(line)).toBe(true);
  });

  it("getWorkingSet().hasUncommittedWork ↔ (staged.length + modified.length > 0); entries.length > 0", () => {
    const ws = sessionReplayEngine.getWorkingSet();
    expect(ws.hasUncommittedWork).toBe((ws.staged.length + ws.modified.length) > 0);
    const allEntriesNonEmpty = [...ws.staged, ...ws.modified, ...ws.untracked].every(f => f.length > 0);
    expect(allEntriesNonEmpty).toBe(true);
  });

  it("getDiffSummary() returns 'no changes' OR 'diff unavailable' OR a real --stat line", () => {
    const ds = sessionReplayEngine.getDiffSummary();
    expect(ds.length).toBeGreaterThan(0);
    const acceptable = ds === "no changes" || ds === "diff unavailable" || /\d+ files? changed/.test(ds);
    expect(acceptable).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 6 — Dispatcher round-trip via registered handler

describe("sessionDispatcher round-trip — replay_* via registered handler", () => {
  let server: MockMCPServer;

  beforeEach(() => {
    server = new MockMCPServer();
    registerSessionDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
  });

  it("replay_context returns ReplayContext with STRICT-hash + SUMMARY_FORMAT summary", async () => {
    const r = await callSession(server, "replay_context", { max_commits: 3 });
    const d = r.parsed;
    expect(STRICT_SHORT_HASH.test((d.lastCommit as { hash: string }).hash)).toBe(true);
    expect(SUMMARY_FORMAT.test(d.summary as string)).toBe(true);
    const commitCount = (d.recentCommits as Array<unknown>).length;
    expect(commitCount).toBeGreaterThanOrEqual(1);
    expect(commitCount).toBeLessThanOrEqual(3);
    expect((d.suggestedNextSteps as string[]).length).toBeGreaterThanOrEqual(1);
  });

  it("replay_context response text does NOT contain $HOME / USERPROFILE prefix", async () => {
    const home = process.env.HOME || process.env.USERPROFILE || "";
    if (!home) return;
    const r = await callSession(server, "replay_context", { max_commits: 3 });
    expect(r.text.includes(home)).toBe(false);
    if (home.includes("\\")) {
      expect(r.text.includes(home.replace(/\\/g, "/"))).toBe(false);
    }
  });

  it("replay_resume_line returns resumeLine matching SUMMARY_FORMAT (not the failure sentinel)", async () => {
    const r = await callSession(server, "replay_resume_line");
    const resumeLine = r.parsed.resumeLine as string;
    expect(resumeLine.startsWith("Could not determine")).toBe(false);
    expect(SUMMARY_FORMAT.test(resumeLine)).toBe(true);
  });

  it("replay_working_set obeys hasUncommittedWork invariant + every entry has length > 0 (slim-aware)", async () => {
    // slimResponse() strips empty arrays per responseSlimmer.ts:24 — on a clean tree
    // staged/modified/untracked may be absent from the response. Default to [] so
    // the invariant + length check still execute correctly. Tested explicitly below.
    const r = await callSession(server, "replay_working_set");
    const raw = r.parsed as Record<string, unknown>;
    const staged = (raw.staged as string[] | undefined) ?? [];
    const modified = (raw.modified as string[] | undefined) ?? [];
    const untracked = (raw.untracked as string[] | undefined) ?? [];
    const hasUncommittedWork = raw.hasUncommittedWork as boolean;
    expect(hasUncommittedWork).toBe((staged.length + modified.length) > 0);
    const allEntriesNonEmpty = [...staged, ...modified, ...untracked].every(f => f.length > 0);
    expect(allEntriesNonEmpty).toBe(true);
  });

  it("replay_working_set respects slimResponse contract — empty arrays are stripped, non-empty kept", async () => {
    // Pins the documented slimResponse behavior (memory: reference_slimresponse_strips_empty_arrays).
    // Asserts the contract clients must code against: if hasUncommittedWork===false, none of
    // staged/modified/untracked keys are guaranteed to be present. If true, at least one is non-empty.
    const r = await callSession(server, "replay_working_set");
    const raw = r.parsed as Record<string, unknown>;
    if (raw.hasUncommittedWork === false) {
      // Clean tree path — every list must be either absent OR a non-empty array
      const staged = raw.staged as string[] | undefined;
      const modified = raw.modified as string[] | undefined;
      // If present (slim didn't strip), must be non-empty — slim only strips length===0
      expect(staged === undefined || staged.length > 0).toBe(true);
      expect(modified === undefined || modified.length > 0).toBe(true);
    } else {
      // Dirty tree path — staged or modified must be present + non-empty
      const staged = raw.staged as string[] | undefined;
      const modified = raw.modified as string[] | undefined;
      const dirtyCount = (staged?.length ?? 0) + (modified?.length ?? 0);
      expect(dirtyCount).toBeGreaterThan(0);
    }
  });

  it("replay_diff_summary returns one of: 'no changes' / 'diff unavailable' / real --stat line", async () => {
    const r = await callSession(server, "replay_diff_summary");
    const ds = r.parsed.diffSummary as string;
    expect(ds.length).toBeGreaterThan(0);
    const acceptable = ds === "no changes" || ds === "diff unavailable" || /\d+ files? changed/.test(ds);
    expect(acceptable).toBe(true);
  });

  it("replay_context honors max_commits=1 — recentCommits.length ≤ 1", async () => {
    const r = await callSession(server, "replay_context", { max_commits: 1 });
    const commits = r.parsed.recentCommits as Array<unknown>;
    expect(commits.length).toBeLessThanOrEqual(1);
  });

  it("schema layer rejects negative max_commits with 'Invalid params' error string", async () => {
    const r = await callSession(server, "replay_context", { max_commits: -5 });
    const hit =
      (typeof r.parsed.error === "string" && r.parsed.error.includes("Invalid params")) ||
      r.text.includes("Invalid params");
    expect(hit).toBe(true);
  });
});
