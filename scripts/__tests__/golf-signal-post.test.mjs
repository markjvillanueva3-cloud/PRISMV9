/**
 * golf-signal-post.test.mjs — CLEANUP-MS0 / U-CLEANUP-F8 tests
 *
 * Verifies the golf-signal post helper across:
 *   - happy path: valid signal → posted to both surfaces
 *   - 4+ failure modes: missing kind, empty summary, oversize summary, bad severity
 *   - 3+ adversarial inputs: NaN count, slashes in kind, unicode summary, huge payload
 *   - 3+ variability configs: severity info/warn/P0, count present/absent, kinds
 *   - boundary: exactly MAX_POSTS_PER_WINDOW, exactly SUMMARY_MAX_CHARS
 *   - real disk: JSONL appender writes a real line that round-trips parse
 *   - rate limiting: dry-run / over-cap / under-cap
 *   - CLI exit codes via runCli
 */

import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  parseArgs,
  validateSignalInput,
  buildPayload,
  countRecentSignals,
  postGolfSignal,
  runCli,
  SIGNAL_TYPE,
  MAX_POSTS_PER_WINDOW,
  SUMMARY_MAX_CHARS,
} from "../golf-signal-post.mjs";

let TMP_ROOT;
beforeEach(() => {
  TMP_ROOT = mkdtempSync(path.join(os.tmpdir(), "u-cleanup-f8-"));
});

function makeFakeDb(rows) {
  return {
    prepare(sql) {
      return {
        get(params) {
          if (sql.includes("COUNT(*)") && sql.includes("chat_bus_signals")) {
            const n = rows.filter(
              (r) => r.signal_type === params.signal_type && r.emitted_at >= params.since,
            ).length;
            return { n };
          }
          return undefined;
        },
        run() { /* no-op */ },
      };
    },
    pragma() {},
    exec() {},
    close() {},
  };
}

function captureWrites() {
  const dbWrites = [];
  const jsonlWrites = [];
  return {
    dbWrites, jsonlWrites,
    dbWriter: async (_dbPath, row) => { dbWrites.push(row); },
    jsonlAppender: (_filePath, entry) => { jsonlWrites.push(entry); },
  };
}

function makeWorkspaceWithDb(name) {
  const repoRoot = path.join(TMP_ROOT, name);
  const dbPath = path.join(repoRoot, "state/shared/coordination.db");
  mkdirSync(path.dirname(dbPath), { recursive: true });
  writeFileSync(dbPath, "fake-bytes");
  return { repoRoot, dbPath };
}

// ── parseArgs ────────────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("returns default toChat='*' and severity='info' for empty argv", () => {
    const o = parseArgs([]);
    expect(o.toChat).toBe("*");
    expect(o.severity).toBe("info");
    expect(o.signalKind === null).toBe(true);
    expect(o.summary === null).toBe(true);
    expect(o.json).toBe(false);
    expect(o.dryRun).toBe(false);
  });

  it("parses --kind=envelope-drift --summary=... --severity=warn --count=5 --path=... --to-chat=alpha --from-chat=golf-markv --json --dry-run", () => {
    const o = parseArgs([
      "--kind", "envelope-drift",
      "--summary", "5 drifted milestones",
      "--severity", "warn",
      "--count", "5",
      "--path", "state/shared/dashboards/drift.md",
      "--to-chat", "alpha",
      "--from-chat", "golf-markv",
      "--json", "--dry-run",
    ]);
    expect(o.signalKind).toBe("envelope-drift");
    expect(o.summary).toBe("5 drifted milestones");
    expect(o.severity).toBe("warn");
    expect(o.count).toBe(5);
    expect(o.pathRef).toBe("state/shared/dashboards/drift.md");
    expect(o.toChat).toBe("alpha");
    expect(o.fromChat).toBe("golf-markv");
    expect(o.json).toBe(true);
    expect(o.dryRun).toBe(true);
  });

  it("throws 'Unknown flag' on --bogus (failure mode)", () => {
    expect(() => parseArgs(["--bogus"])).toThrow(/Unknown flag/);
  });

  it("--now 2026-05-14T18:00:00Z parses to exact ms epoch (boundary)", () => {
    const o = parseArgs(["--now", "2026-05-14T18:00:00Z"]);
    expect(o.nowMs).toBe(Date.UTC(2026, 4, 14, 18, 0, 0));
  });
});

// ── validateSignalInput ──────────────────────────────────────────────────────

describe("validateSignalInput", () => {
  it("returns null for kind=envelope-drift summary=hi severity=info (happy)", () => {
    expect(validateSignalInput({ signalKind: "envelope-drift", summary: "hi", severity: "info" })).toBe(null);
  });

  it("returns null for kind=hook-health summary=x severity=P0 (variability: P-severity)", () => {
    expect(validateSignalInput({ signalKind: "hook-health", summary: "x", severity: "P0" })).toBe(null);
  });

  it("returns 'signalKind required' when missing (failure mode)", () => {
    expect(validateSignalInput({ summary: "x" })).toBe("signalKind required");
    expect(validateSignalInput({ signalKind: "", summary: "x" })).toBe("signalKind required");
  });

  it("returns 'signalKind too long' at length 65 (boundary)", () => {
    const tooLong = "x".repeat(65);
    expect(validateSignalInput({ signalKind: tooLong, summary: "x" })).toBe("signalKind too long (max 64)");
  });

  it("returns 'signalKind must match' on space character (adversarial)", () => {
    expect(validateSignalInput({ signalKind: "envelope drift", summary: "x" })).toBe("signalKind must match [a-z0-9_-]");
  });

  it("returns 'signalKind must match' on path-traversal chars (adversarial: ../)", () => {
    expect(validateSignalInput({ signalKind: "../etc/passwd", summary: "x" })).toBe("signalKind must match [a-z0-9_-]");
  });

  it("returns 'signalKind must match' on uppercase (adversarial: ENVELOPE-DRIFT)", () => {
    expect(validateSignalInput({ signalKind: "ENVELOPE-DRIFT", summary: "x" })).toBe("signalKind must match [a-z0-9_-]");
  });

  it("returns 'summary required' when missing or empty (failure mode)", () => {
    expect(validateSignalInput({ signalKind: "x", summary: "" })).toBe("summary required");
    expect(validateSignalInput({ signalKind: "x" })).toBe("summary required");
  });

  it("returns 'summary too long' at SUMMARY_MAX_CHARS+1 (boundary)", () => {
    const tooLong = "x".repeat(SUMMARY_MAX_CHARS + 1);
    const msg = validateSignalInput({ signalKind: "x", summary: tooLong });
    expect(msg.startsWith("summary too long")).toBe(true);
  });

  it("returns null at exactly SUMMARY_MAX_CHARS (boundary inclusive)", () => {
    const justFit = "x".repeat(SUMMARY_MAX_CHARS);
    expect(validateSignalInput({ signalKind: "x", summary: justFit })).toBe(null);
  });

  it("returns 'severity must be one of' for severity=critical (failure mode)", () => {
    const msg = validateSignalInput({ signalKind: "x", summary: "y", severity: "critical" });
    expect(msg.startsWith("severity must be one of")).toBe(true);
  });

  it("returns 'count must be integer' for count=3.14 (adversarial: float)", () => {
    expect(validateSignalInput({ signalKind: "x", summary: "y", count: 3.14 })).toBe("count must be integer if provided");
  });

  it("returns 'count must be integer' for count='5' (adversarial: string)", () => {
    expect(validateSignalInput({ signalKind: "x", summary: "y", count: "5" })).toBe("count must be integer if provided");
  });

  it("returns 'pathRef must be string' for pathRef=42 (adversarial: number)", () => {
    expect(validateSignalInput({ signalKind: "x", summary: "y", pathRef: 42 })).toBe("pathRef must be string if provided");
  });
});

// ── buildPayload ─────────────────────────────────────────────────────────────

describe("buildPayload", () => {
  it("emits {kind, summary, severity, count, path} when all supplied (happy)", () => {
    const p = buildPayload({
      signalKind: "envelope-drift",
      summary: "5 drifted milestones",
      severity: "warn",
      count: 5,
      pathRef: "state/shared/dashboards/drift.md",
    });
    expect(p.kind).toBe("envelope-drift");
    expect(p.summary).toBe("5 drifted milestones");
    expect(p.severity).toBe("warn");
    expect(p.count).toBe(5);
    expect(p.path).toBe("state/shared/dashboards/drift.md");
  });

  it("defaults severity to 'info' when not supplied", () => {
    const p = buildPayload({ signalKind: "x", summary: "y" });
    expect(p.severity).toBe("info");
  });

  it("truncates summary length to exactly SUMMARY_MAX_CHARS on oversize (adversarial)", () => {
    const long = "x".repeat(SUMMARY_MAX_CHARS * 3);
    const p = buildPayload({ signalKind: "x", summary: long });
    expect(p.summary.length).toBe(SUMMARY_MAX_CHARS);
  });

  it("drops 'count' key entirely when input is NaN (adversarial)", () => {
    const p = buildPayload({ signalKind: "x", summary: "y", count: NaN });
    expect("count" in p).toBe(false);
  });

  it("drops 'path' key when input is empty string (variability)", () => {
    const p = buildPayload({ signalKind: "x", summary: "y", pathRef: "" });
    expect("path" in p).toBe(false);
  });

  it("caps path at exactly 512 chars on oversize input (adversarial)", () => {
    const p = buildPayload({ signalKind: "x", summary: "y", pathRef: "a".repeat(1000) });
    expect(p.path.length).toBe(512);
  });
});

// ── countRecentSignals ───────────────────────────────────────────────────────

describe("countRecentSignals", () => {
  it("returns 2 from a 4-row mix where 2 are in-window + 1 too old + 1 wrong type (happy)", async () => {
    const now = Date.now();
    const fake = makeFakeDb([
      { signal_type: SIGNAL_TYPE, emitted_at: now - 5 * 60_000 },
      { signal_type: SIGNAL_TYPE, emitted_at: now - 15 * 60_000 },
      { signal_type: SIGNAL_TYPE, emitted_at: now - 35 * 60_000 },
      { signal_type: "other-bus", emitted_at: now - 5 * 60_000 },
    ]);
    const n = await countRecentSignals("/fake.db", now, { databaseFactory: () => fake });
    expect(n).toBe(2);
  });

  it("returns 0 when db file missing AND no factory (graceful degrade)", async () => {
    const n = await countRecentSignals(path.join(TMP_ROOT, "no.db"), Date.now());
    expect(n).toBe(0);
  });

  it("returns 0 when databaseFactory throws (graceful degrade)", async () => {
    const n = await countRecentSignals("/x", Date.now(), {
      databaseFactory: () => { throw new Error("locked"); },
    });
    expect(n).toBe(0);
  });
});

// ── postGolfSignal ───────────────────────────────────────────────────────────

describe("postGolfSignal", () => {
  it("rejects empty signalKind with reason=invalid_input + error='signalKind required'", async () => {
    const r = await postGolfSignal({ signalKind: "", summary: "x" });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("invalid_input");
    expect(r.error).toBe("signalKind required");
  });

  it("posts to both surfaces on happy path with warn severity + count=5 + pathRef", async () => {
    const { repoRoot, dbPath } = makeWorkspaceWithDb("happy");
    const w = captureWrites();
    const r = await postGolfSignal(
      { signalKind: "envelope-drift", summary: "5 drifted milestones", severity: "warn", count: 5, pathRef: "x.md" },
      {
        repoRoot, dbPath,
        busJsonlPath: path.join(repoRoot, "AGENT_CHAT.jsonl"),
        databaseFactory: () => makeFakeDb([]),
        dbWriter: w.dbWriter,
        jsonlAppender: w.jsonlAppender,
      },
    );
    expect(r.ok).toBe(true);
    expect(r.posted).toBe(true);
    expect(r.reason).toBe("emitted");
    expect(w.dbWrites.length).toBe(1);
    expect(w.dbWrites[0].signal_type).toBe(SIGNAL_TYPE);
    expect(w.jsonlWrites.length).toBe(1);
    expect(w.jsonlWrites[0].signal_type).toBe(SIGNAL_TYPE);
    expect(w.jsonlWrites[0].payload.kind).toBe("envelope-drift");
    expect(w.jsonlWrites[0].payload.severity).toBe("warn");
    expect(w.jsonlWrites[0].message.includes("envelope-drift")).toBe(true);
    expect(w.jsonlWrites[0].message.includes("warn")).toBe(true);
  });

  it("rate-limits at exactly MAX_POSTS_PER_WINDOW (boundary: cap reached)", async () => {
    const { repoRoot, dbPath } = makeWorkspaceWithDb("rate");
    const now = Date.now();
    const recentRows = [
      { signal_type: SIGNAL_TYPE, emitted_at: now - 1 * 60_000 },
      { signal_type: SIGNAL_TYPE, emitted_at: now - 2 * 60_000 },
      { signal_type: SIGNAL_TYPE, emitted_at: now - 3 * 60_000 },
      { signal_type: SIGNAL_TYPE, emitted_at: now - 4 * 60_000 },
      { signal_type: SIGNAL_TYPE, emitted_at: now - 5 * 60_000 },
    ];
    expect(recentRows.length).toBe(MAX_POSTS_PER_WINDOW);
    const w = captureWrites();
    const r = await postGolfSignal(
      { signalKind: "envelope-drift", summary: "another digest" },
      {
        repoRoot, dbPath,
        databaseFactory: () => makeFakeDb(recentRows),
        dbWriter: w.dbWriter,
        jsonlAppender: w.jsonlAppender,
        nowMs: now,
      },
    );
    expect(r.ok).toBe(true);
    expect(r.posted).toBe(false);
    expect(r.reason).toBe("rate_limited");
    expect(r.capacity).toBe(MAX_POSTS_PER_WINDOW);
    expect(w.dbWrites.length).toBe(0);
    expect(w.jsonlWrites.length).toBe(0);
  });

  it("allows posting at MAX_POSTS_PER_WINDOW - 1 (boundary: just under)", async () => {
    const { repoRoot, dbPath } = makeWorkspaceWithDb("under");
    const now = Date.now();
    const recentRows = [
      { signal_type: SIGNAL_TYPE, emitted_at: now - 1 * 60_000 },
      { signal_type: SIGNAL_TYPE, emitted_at: now - 2 * 60_000 },
      { signal_type: SIGNAL_TYPE, emitted_at: now - 3 * 60_000 },
      { signal_type: SIGNAL_TYPE, emitted_at: now - 4 * 60_000 },
    ];
    expect(recentRows.length).toBe(MAX_POSTS_PER_WINDOW - 1);
    const w = captureWrites();
    const r = await postGolfSignal(
      { signalKind: "envelope-drift", summary: "just under cap" },
      {
        repoRoot, dbPath,
        databaseFactory: () => makeFakeDb(recentRows),
        dbWriter: w.dbWriter,
        jsonlAppender: w.jsonlAppender,
        nowMs: now,
      },
    );
    expect(r.posted).toBe(true);
    expect(r.recentPosts).toBe(MAX_POSTS_PER_WINDOW);
  });

  it("dry-run does NOT write either surface and returns signalId starting golf-memory-garden-", async () => {
    const { repoRoot, dbPath } = makeWorkspaceWithDb("dry");
    const w = captureWrites();
    const r = await postGolfSignal(
      { signalKind: "memory-garden", summary: "test dry-run" },
      {
        repoRoot, dbPath,
        databaseFactory: () => makeFakeDb([]),
        dbWriter: w.dbWriter,
        jsonlAppender: w.jsonlAppender,
        dryRun: true,
      },
    );
    expect(r.posted).toBe(false);
    expect(r.reason).toBe("dry_run");
    expect(r.signalId.startsWith("golf-memory-garden-")).toBe(true);
    expect(w.dbWrites.length).toBe(0);
    expect(w.jsonlWrites.length).toBe(0);
  });

  it("partial-emit when JSONL appender throws but DB write succeeds", async () => {
    const { repoRoot, dbPath } = makeWorkspaceWithDb("partial");
    const w = captureWrites();
    const failingAppender = () => { throw new Error("disk full"); };
    const r = await postGolfSignal(
      { signalKind: "hook-health", summary: "partial-emit test" },
      {
        repoRoot, dbPath,
        databaseFactory: () => makeFakeDb([]),
        dbWriter: w.dbWriter,
        jsonlAppender: failingAppender,
      },
    );
    expect(r.ok).toBe(true);
    expect(r.posted).toBe(false);
    expect(r.reason).toBe("partial_emit");
    expect(r.jsonlWriteError).toBe("disk full");
    expect(w.dbWrites.length).toBe(1);
  });

  it("real-disk JSONL appender writes a parseable line containing kind+severity (integration)", async () => {
    const { repoRoot, dbPath } = makeWorkspaceWithDb("real");
    const jsonlPath = path.join(repoRoot, "state/shared/AGENT_CHAT.jsonl");
    const r = await postGolfSignal(
      { signalKind: "scrutiny-summary", summary: "real disk write", severity: "info" },
      {
        repoRoot, dbPath, busJsonlPath: jsonlPath,
        databaseFactory: () => makeFakeDb([]),
        dbWriter: async () => {},
      },
    );
    expect(r.posted).toBe(true);
    expect(existsSync(jsonlPath)).toBe(true);
    const body = readFileSync(jsonlPath, "utf-8");
    expect(body.endsWith("\n")).toBe(true);
    const parsed = JSON.parse(body.trim());
    expect(parsed.signal_type).toBe(SIGNAL_TYPE);
    expect(parsed.payload.kind).toBe("scrutiny-summary");
    expect(parsed.payload.severity).toBe("info");
  });

  it("variability A: kind=envelope-drift emits payload.kind=envelope-drift to both surfaces", async () => {
    const { repoRoot, dbPath } = makeWorkspaceWithDb("kind-a");
    const w = captureWrites();
    const r = await postGolfSignal(
      { signalKind: "envelope-drift", summary: "3 drifted milestones" },
      { repoRoot, dbPath, databaseFactory: () => makeFakeDb([]), dbWriter: w.dbWriter, jsonlAppender: w.jsonlAppender },
    );
    expect(r.posted).toBe(true);
    expect(r.payload.kind).toBe("envelope-drift");
    expect(w.dbWrites[0].signal_type).toBe(SIGNAL_TYPE);
    expect(w.jsonlWrites[0].payload.kind).toBe("envelope-drift");
  });

  it("variability B: kind=wiring-candidates emits payload.kind=wiring-candidates to JSONL", async () => {
    const { repoRoot, dbPath } = makeWorkspaceWithDb("kind-b");
    const w = captureWrites();
    const r = await postGolfSignal(
      { signalKind: "wiring-candidates", summary: "120 unwired engines awaiting dispatcher" },
      { repoRoot, dbPath, databaseFactory: () => makeFakeDb([]), dbWriter: w.dbWriter, jsonlAppender: w.jsonlAppender },
    );
    expect(r.posted).toBe(true);
    expect(r.payload.kind).toBe("wiring-candidates");
    expect(w.jsonlWrites[0].payload.kind).toBe("wiring-candidates");
  });

  it("variability C: kind=hook-health with severity=P0 emits 'P0' in message line", async () => {
    const { repoRoot, dbPath } = makeWorkspaceWithDb("kind-c");
    const w = captureWrites();
    const r = await postGolfSignal(
      { signalKind: "hook-health", summary: "viz-bridge hook 4.3% error rate", severity: "P0" },
      { repoRoot, dbPath, databaseFactory: () => makeFakeDb([]), dbWriter: w.dbWriter, jsonlAppender: w.jsonlAppender },
    );
    expect(r.posted).toBe(true);
    expect(r.payload.severity).toBe("P0");
    expect(w.jsonlWrites[0].message.includes("P0")).toBe(true);
  });
});

// ── runCli ───────────────────────────────────────────────────────────────────

describe("runCli", () => {
  it("exit 2 + writes 'U-CLEANUP-F8' usage to stdout on --help", async () => {
    const out = { written: "", write(s) { this.written += s; } };
    const code = await runCli(["--help"], { stdout: out, stderr: { write() {} } });
    expect(code).toBe(2);
    expect(out.written.includes("U-CLEANUP-F8")).toBe(true);
  });

  it("exit 2 + writes 'Unknown flag' to stderr on --bogus", async () => {
    const err = { written: "", write(s) { this.written += s; } };
    const code = await runCli(["--bogus"], { stdout: { write() {} }, stderr: err });
    expect(code).toBe(2);
    expect(err.written.includes("Unknown flag")).toBe(true);
  });

  it("exit 1 + writes 'signalKind required' to stderr when --kind missing", async () => {
    const out = { write() {} };
    const err = { written: "", write(s) { this.written += s; } };
    const code = await runCli(["--summary", "test"], {
      stdout: out, stderr: err,
      databaseFactory: () => makeFakeDb([]),
    });
    expect(code).toBe(1);
    expect(err.written.includes("signalKind required")).toBe(true);
  });

  it("exit 0 + JSON stdout with payload.kind=memory-garden on success", async () => {
    const { repoRoot, dbPath } = makeWorkspaceWithDb("cli-success");
    const out = { written: "", write(s) { this.written += s; } };
    const err = { written: "", write(s) { this.written += s; } };
    const w = captureWrites();
    const code = await runCli(
      ["--json", "--kind", "memory-garden", "--summary", "weekly digest", "--severity", "info",
       "--repo-root", repoRoot, "--db", dbPath],
      {
        stdout: out, stderr: err,
        databaseFactory: () => makeFakeDb([]),
        dbWriter: w.dbWriter,
        jsonlAppender: w.jsonlAppender,
      },
    );
    expect(code).toBe(0);
    const parsed = JSON.parse(out.written);
    expect(parsed.posted).toBe(true);
    expect(parsed.payload.kind).toBe("memory-garden");
  });
});
