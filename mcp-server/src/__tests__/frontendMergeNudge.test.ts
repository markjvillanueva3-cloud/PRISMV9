// frontendMergeNudge.test.ts — CLEANUP-MS0/U-CLEANUP-F3 — verify
// scripts/frontend-merge-nudge.mjs: a BUILD_STATE.NEEDS_FRONTEND consumer that
// nudges the fleet (once/24h, bundled) about frontend trees pending merge >7d.
//
// The .mjs was shipped in commit 9df97e6cc but landed without a test — this
// closes that verification-floor gap.
//
// Coverage (per comprehensive-build-enforce floor):
//   - Happy path: pure functions + fresh-sandbox first run (records firstSeen)
//   - Staleness gate: tree pending >7d → stale, post wanted
//   - Rate limit: stale tree but lastNudgeAt <24h → suppressed
//   - --force bypasses the 24h cooldown (7d staleness still required)
//   - Prune: firstSeen entries for no-longer-pending trees are dropped
//   - Failure mode 1: missing BUILD_STATE.json → buildStateReadOk=false, no crash
//   - Failure mode 2: corrupt BUILD_STATE.json → readJSON null → 0 pending
//   - Failure mode 3: wrong-schemaVersion / corrupt-value sidecar → reset / self-heal
//   - Adversarial 1: invalid --frozen-time → falls back to real now, no crash
//   - Adversarial 2: malformed NEEDS_FRONTEND shape → ok:false, [] trees
//   - Variability: 3 trees spanning fresh / just-pending / stale states
//   - --dry-run / --skip-bus-post / --json / --help / exit-code-always-0
//
// Pure functions imported directly; main() exercised via execFileSync subprocess
// into temp sandboxes (--repo override + --frozen-time) so we never touch H:/prism.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  parseArgs,
  readJSON,
  readPendingTrees,
  loadSidecar,
  writeSidecar,
  buildNudgeMessage,
  postToBus,
  DAY_MS,
  SCHEMA_VERSION,
  STALE_AFTER_DAYS,
  STALE_AFTER_MS,
  NUDGE_COOLDOWN_MS,
} from "../../../scripts/frontend-merge-nudge.mjs";

const SCRIPT_PATH = path.resolve(__dirname, "../../../scripts/frontend-merge-nudge.mjs");
const NODE_BIN = process.execPath;
const SCRIPT_TIMEOUT_MS = 15_000;

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  json: any | null;
}

function runScript(repo: string, ...extraArgs: string[]): RunResult {
  // spawnSync (not execFileSync) so stdout AND stderr are captured regardless
  // of exit code — the script always exits 0, so a catch-only stderr capture
  // would silently lose its stderr diagnostics.
  const r = spawnSync(NODE_BIN, [SCRIPT_PATH, "--repo", repo, ...extraArgs], {
    encoding: "utf-8",
    timeout: SCRIPT_TIMEOUT_MS,
  });
  const stdout = (r.stdout || "").toString();
  const stderr = (r.stderr || "").toString();
  const exitCode = typeof r.status === "number" ? r.status : 1;
  let json: any = null;
  if (extraArgs.includes("--json")) {
    try {
      json = JSON.parse(stdout.trim());
    } catch {
      json = null;
    }
  }
  return { stdout, stderr, exitCode, json };
}

/** Build a sandbox repo with a BUILD_STATE.json carrying the given trees. */
function makeRepo(trees: any[]): string {
  const repo = mkdtempSync(path.join(tmpdir(), "fe-merge-nudge-"));
  mkdirSync(path.join(repo, "state", "shared"), { recursive: true });
  const buildState = {
    schemaVersion: 1,
    generatedAt: "2026-05-01T00:00:00.000Z",
    NEEDS_FRONTEND: {
      summary: `${trees.length} frontend build(s) pending merge.`,
      trees,
    },
  };
  writeFileSync(
    path.join(repo, "state", "shared", "BUILD_STATE.json"),
    JSON.stringify(buildState, null, 2),
  );
  return repo;
}

function writeSidecarFile(repo: string, sidecar: any): void {
  writeFileSync(
    path.join(repo, "state", "shared", ".frontend-merge-nudge-last.json"),
    JSON.stringify(sidecar, null, 2),
  );
}

function readSidecarFile(repo: string): any {
  return JSON.parse(
    readFileSync(path.join(repo, "state", "shared", ".frontend-merge-nudge-last.json"), "utf-8"),
  );
}

/** Plant a fake .claude/helpers/agent-coordination.mjs in the sandbox so the
 *  real postToBus path can be exercised hermetically. `exitCode` controls
 *  success (0) vs failure (non-0). If `sentinel` is given, the fake records its
 *  argv (-joined) so the test can assert what message was posted. */
function plantFakeBus(repo: string, exitCode: number, sentinel?: string): void {
  const helperDir = path.join(repo, ".claude", "helpers");
  mkdirSync(helperDir, { recursive: true });
  const body = sentinel
    ? `import { appendFileSync } from "node:fs";\n` +
      `appendFileSync(${JSON.stringify(sentinel)}, process.argv.slice(2).join("\\u0001") + "\\n");\n` +
      `process.exit(${exitCode});\n`
    : `process.exit(${exitCode});\n`;
  writeFileSync(path.join(helperDir, "agent-coordination.mjs"), body);
}

const pendingTree = (id: string, stack = "Next.js 13") => ({
  id,
  path: `${id}/ui`,
  role: "codex-build-pending-merge",
  stack,
  merge_status: "PENDING_MERGE",
  notes: "test fixture",
  exists: true,
});

const mergedTree = (id: string) => ({
  id,
  path: `${id}/web`,
  role: "canonical",
  stack: "React + Vite",
  merge_status: "merged",
  notes: "test fixture",
  exists: true,
});

// ─── Constants ───────────────────────────────────────────────────────────

describe("constants", () => {
  it("are internally consistent and match the spec (7d staleness, 1/day rate limit)", () => {
    expect(DAY_MS).toBe(24 * 60 * 60 * 1000);
    expect(SCHEMA_VERSION).toBe(1);
    expect(STALE_AFTER_DAYS).toBe(7);
    expect(STALE_AFTER_MS).toBe(STALE_AFTER_DAYS * DAY_MS);
    expect(NUDGE_COOLDOWN_MS).toBe(DAY_MS);
  });
});

// ─── parseArgs ───────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("defaults: every flag false, repo is a non-empty string", () => {
    const a = parseArgs([]);
    expect(a.json).toBe(false);
    expect(a.dryRun).toBe(false);
    expect(a.skipBusPost).toBe(false);
    expect(a.force).toBe(false);
    expect(a.help).toBe(false);
    expect(a.frozenTime).toBeNull();
    expect(typeof a.repo).toBe("string");
    expect(a.repo.length).toBeGreaterThan(0);
  });

  it("parses every flag", () => {
    const a = parseArgs(["--json", "--dry-run", "--skip-bus-post", "--force", "--help"]);
    expect(a.json && a.dryRun && a.skipBusPost && a.force && a.help).toBe(true);
  });

  it("parses --frozen-time and --repo with values", () => {
    const a = parseArgs(["--frozen-time", "2026-05-10T00:00:00.000Z", "--repo", "X:/sandbox"]);
    expect(a.frozenTime).toBe("2026-05-10T00:00:00.000Z");
    expect(a.repo).toBe("X:/sandbox");
  });

  it("-h aliases --help", () => {
    expect(parseArgs(["-h"]).help).toBe(true);
  });

  it("ignores unknown args (advisory cron must never abort on a stray flag)", () => {
    const a = parseArgs(["--nonsense", "--json", "garbage"]);
    expect(a.json).toBe(true);
    expect(a.help).toBe(false);
  });
});

// ─── readJSON ────────────────────────────────────────────────────────────

describe("readJSON", () => {
  let sandbox: string;
  beforeEach(() => {
    sandbox = mkdtempSync(path.join(tmpdir(), "fe-merge-readjson-"));
  });
  afterEach(() => {
    rmSync(sandbox, { recursive: true, force: true });
  });

  it("returns the parsed object for valid JSON", () => {
    const p = path.join(sandbox, "ok.json");
    writeFileSync(p, JSON.stringify({ a: 1 }));
    expect(readJSON(p)).toEqual({ a: 1 });
  });

  it("returns null for a missing file (failure mode)", () => {
    expect(readJSON(path.join(sandbox, "nope.json"))).toBeNull();
  });

  it("returns null for malformed JSON (failure mode)", () => {
    const p = path.join(sandbox, "bad.json");
    writeFileSync(p, "{ not json");
    expect(readJSON(p)).toBeNull();
  });
});

// ─── readPendingTrees ────────────────────────────────────────────────────

describe("readPendingTrees", () => {
  it("returns only PENDING_MERGE trees with a string id", () => {
    const repo = makeRepo([
      pendingTree("alpha"),
      mergedTree("beta"),
      pendingTree("gamma"),
      { merge_status: "PENDING_MERGE" }, // no id → filtered out
    ]);
    try {
      const r = readPendingTrees(repo);
      expect(r.ok).toBe(true);
      expect(r.trees.map((t: any) => t.id).sort()).toEqual(["alpha", "gamma"]);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("returns ok:false + [] when BUILD_STATE.json is missing (failure mode)", () => {
    const repo = mkdtempSync(path.join(tmpdir(), "fe-merge-nobs-"));
    mkdirSync(path.join(repo, "state", "shared"), { recursive: true });
    try {
      const r = readPendingTrees(repo);
      expect(r.ok).toBe(false);
      expect(r.trees).toEqual([]);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("returns ok:false when NEEDS_FRONTEND shape is malformed (adversarial)", () => {
    const repo = mkdtempSync(path.join(tmpdir(), "fe-merge-badshape-"));
    mkdirSync(path.join(repo, "state", "shared"), { recursive: true });
    writeFileSync(
      path.join(repo, "state", "shared", "BUILD_STATE.json"),
      JSON.stringify({ NEEDS_FRONTEND: { trees: "not-an-array" } }),
    );
    try {
      const r = readPendingTrees(repo);
      expect(r.ok).toBe(false);
      expect(r.trees).toEqual([]);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});

// ─── loadSidecar / writeSidecar ──────────────────────────────────────────

describe("loadSidecar / writeSidecar", () => {
  let sandbox: string;
  beforeEach(() => {
    sandbox = mkdtempSync(path.join(tmpdir(), "fe-merge-sidecar-"));
    mkdirSync(path.join(sandbox, "state", "shared"), { recursive: true });
  });
  afterEach(() => {
    rmSync(sandbox, { recursive: true, force: true });
  });

  it("returns a fresh default sidecar when none exists", () => {
    const s = loadSidecar(sandbox);
    expect(s).toEqual({ schemaVersion: SCHEMA_VERSION, firstSeen: {}, lastNudgeAt: null });
  });

  it("round-trips a valid sidecar through write then load", () => {
    const state = {
      schemaVersion: SCHEMA_VERSION,
      firstSeen: { alpha: "2026-05-01T00:00:00.000Z" },
      lastNudgeAt: "2026-05-02T00:00:00.000Z",
    };
    expect(writeSidecar(sandbox, state)).toBe(true);
    expect(loadSidecar(sandbox)).toEqual(state);
  });

  it("resets when the persisted schemaVersion differs (failure mode)", () => {
    writeSidecarFile(sandbox, { schemaVersion: 99, firstSeen: { x: "2026-05-01T00:00:00.000Z" }, lastNudgeAt: "2026-05-02T00:00:00.000Z" });
    const s = loadSidecar(sandbox);
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.firstSeen).toEqual({});
    expect(s.lastNudgeAt).toBeNull();
  });

  it("drops corrupt firstSeen values and a corrupt lastNudgeAt (self-healing)", () => {
    writeSidecarFile(sandbox, {
      schemaVersion: SCHEMA_VERSION,
      firstSeen: { good: "2026-05-01T00:00:00.000Z", bad: "not-a-date", alsoBad: 12345 },
      lastNudgeAt: "garbage",
    });
    const s = loadSidecar(sandbox);
    expect(s.firstSeen).toEqual({ good: "2026-05-01T00:00:00.000Z" });
    expect(s.lastNudgeAt).toBeNull();
  });
});

// ─── buildNudgeMessage ───────────────────────────────────────────────────

describe("buildNudgeMessage", () => {
  it("mentions count, the staleness window, and every tree's id/stack/age/path", () => {
    const msg = buildNudgeMessage([
      { id: "alpha", path: "alpha/ui", stack: "Next.js 13", ageDays: 9 },
      { id: "beta", path: "beta/ui", stack: "Vite", ageDays: 12 },
    ]);
    expect(msg).toContain("2 frontend merge(s)");
    expect(msg).toContain(String(STALE_AFTER_DAYS));
    expect(msg).toContain("alpha");
    expect(msg).toContain("Next.js 13");
    expect(msg).toContain("9d");
    expect(msg).toContain("beta/ui");
    expect(msg).toContain("12d");
  });

  it("bundles multiple stale trees into ONE comma-joined message (no per-tree spam)", () => {
    const msg = buildNudgeMessage([
      { id: "a", path: "a/ui", stack: "s", ageDays: 8 },
      { id: "b", path: "b/ui", stack: "s", ageDays: 8 },
      { id: "c", path: "c/ui", stack: "s", ageDays: 8 },
    ]);
    expect(msg.split("\n").length).toBe(1);
    expect(msg).toContain("a");
    expect(msg).toContain("b");
    expect(msg).toContain("c");
  });
});

// ─── main() via subprocess ───────────────────────────────────────────────

describe("frontend-merge-nudge.mjs CLI (main)", () => {
  const repos: string[] = [];
  afterEach(() => {
    while (repos.length) {
      const r = repos.pop()!;
      rmSync(r, { recursive: true, force: true });
    }
  });
  const track = (r: string) => {
    repos.push(r);
    return r;
  };

  it("--help exits 0 and prints usage", () => {
    const r = runScript(track(makeRepo([])), "--help");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("frontend-merge-nudge.mjs");
    expect(r.stdout).toContain("--dry-run");
  });

  it("happy path: first run records firstSeen, reports 0 stale, no post", () => {
    const repo = track(makeRepo([pendingTree("alpha")]));
    const r = runScript(repo, "--json", "--frozen-time", "2026-05-10T00:00:00.000Z");
    expect(r.exitCode).toBe(0);
    expect(r.json.pendingCount).toBe(1);
    expect(r.json.staleCount).toBe(0);
    expect(r.json.posted).toBe(false);
    expect(r.json.postSkippedReason).toBe("no stale trees");
    expect(r.json.sidecarWritten).toBe(true);
    const sc = readSidecarFile(repo);
    expect(sc.firstSeen.alpha).toBe("2026-05-10T00:00:00.000Z");
  });

  it("staleness: a tree pending >7d is stale; --skip-bus-post reports it without posting", () => {
    const repo = track(makeRepo([pendingTree("alpha", "Next.js 13")]));
    writeSidecarFile(repo, {
      schemaVersion: SCHEMA_VERSION,
      firstSeen: { alpha: "2026-05-01T00:00:00.000Z" }, // 9 days before frozen-time
      lastNudgeAt: null,
    });
    const r = runScript(repo, "--json", "--frozen-time", "2026-05-10T00:00:00.000Z", "--skip-bus-post");
    expect(r.exitCode).toBe(0);
    expect(r.json.staleCount).toBe(1);
    expect(r.json.stale[0].id).toBe("alpha");
    expect(r.json.stale[0].ageDays).toBe(9);
    expect(r.json.posted).toBe(false);
    expect(r.json.postSkippedReason).toBe("skip-bus-post");
    expect(r.json.nudgeMessage).toContain("alpha");
  });

  it("rate limit: a stale tree within the 24h cooldown is suppressed", () => {
    const repo = track(makeRepo([pendingTree("alpha")]));
    writeSidecarFile(repo, {
      schemaVersion: SCHEMA_VERSION,
      firstSeen: { alpha: "2026-05-01T00:00:00.000Z" },
      lastNudgeAt: "2026-05-09T22:00:00.000Z", // 2h before frozen-time
    });
    const r = runScript(repo, "--json", "--frozen-time", "2026-05-10T00:00:00.000Z", "--skip-bus-post");
    expect(r.json.staleCount).toBe(1);
    expect(r.json.cooldownElapsed).toBe(false);
    expect(r.json.posted).toBe(false);
    expect(r.json.postSkippedReason).toBe("within 24h cooldown");
  });

  it("--force bypasses the 24h cooldown (staleness still required)", () => {
    const repo = track(makeRepo([pendingTree("alpha")]));
    writeSidecarFile(repo, {
      schemaVersion: SCHEMA_VERSION,
      firstSeen: { alpha: "2026-05-01T00:00:00.000Z" },
      lastNudgeAt: "2026-05-09T22:00:00.000Z", // 2h ago — would normally suppress
    });
    const r = runScript(repo, "--json", "--frozen-time", "2026-05-10T00:00:00.000Z", "--force", "--skip-bus-post");
    // --force makes a post WANTED despite the cooldown; --skip-bus-post then
    // explains the actual skip. The reason must be "skip-bus-post", NOT "cooldown".
    expect(r.json.staleCount).toBe(1);
    expect(r.json.cooldownElapsed).toBe(false);
    expect(r.json.postSkippedReason).toBe("skip-bus-post");
  });

  it("--force does NOT bypass the 7d staleness gate", () => {
    const repo = track(makeRepo([pendingTree("alpha")]));
    writeSidecarFile(repo, {
      schemaVersion: SCHEMA_VERSION,
      firstSeen: { alpha: "2026-05-09T00:00:00.000Z" }, // only 1 day old
      lastNudgeAt: null,
    });
    const r = runScript(repo, "--json", "--frozen-time", "2026-05-10T00:00:00.000Z", "--force", "--skip-bus-post");
    expect(r.json.staleCount).toBe(0);
    expect(r.json.postSkippedReason).toBe("no stale trees");
  });

  it("prunes firstSeen entries for trees that are no longer pending", () => {
    const repo = track(makeRepo([pendingTree("alpha")])); // only alpha pending now
    writeSidecarFile(repo, {
      schemaVersion: SCHEMA_VERSION,
      firstSeen: {
        alpha: "2026-05-01T00:00:00.000Z",
        ghost: "2026-05-01T00:00:00.000Z", // merged/removed — must be pruned
      },
      lastNudgeAt: null,
    });
    runScript(repo, "--frozen-time", "2026-05-10T00:00:00.000Z", "--skip-bus-post");
    const sc = readSidecarFile(repo);
    expect(Object.keys(sc.firstSeen)).toEqual(["alpha"]);
  });

  it("--dry-run computes but writes no sidecar and posts nothing", () => {
    const repo = track(makeRepo([pendingTree("alpha")]));
    writeSidecarFile(repo, {
      schemaVersion: SCHEMA_VERSION,
      firstSeen: { alpha: "2026-05-01T00:00:00.000Z" },
      lastNudgeAt: null,
    });
    const before = readSidecarFile(repo);
    const r = runScript(repo, "--json", "--frozen-time", "2026-05-10T00:00:00.000Z", "--dry-run");
    expect(r.json.staleCount).toBe(1);
    expect(r.json.postSkippedReason).toBe("dry-run");
    expect(r.json.sidecarWritten).toBe(false);
    expect(readSidecarFile(repo)).toEqual(before); // untouched
  });

  it("failure mode: missing BUILD_STATE.json → buildStateReadOk false, exit 0, no crash", () => {
    const repo = mkdtempSync(path.join(tmpdir(), "fe-merge-nobs2-"));
    mkdirSync(path.join(repo, "state", "shared"), { recursive: true });
    repos.push(repo);
    const r = runScript(repo, "--json", "--skip-bus-post");
    expect(r.exitCode).toBe(0);
    expect(r.json.buildStateReadOk).toBe(false);
    expect(r.json.pendingCount).toBe(0);
    expect(r.json.staleCount).toBe(0);
  });

  it("adversarial: corrupt BUILD_STATE.json → 0 pending, exit 0, no crash", () => {
    const repo = mkdtempSync(path.join(tmpdir(), "fe-merge-corrupt-"));
    mkdirSync(path.join(repo, "state", "shared"), { recursive: true });
    writeFileSync(path.join(repo, "state", "shared", "BUILD_STATE.json"), "{{{ not json at all");
    repos.push(repo);
    const r = runScript(repo, "--json", "--skip-bus-post");
    expect(r.exitCode).toBe(0);
    expect(r.json.buildStateReadOk).toBe(false);
    expect(r.json.pendingCount).toBe(0);
  });

  it("adversarial: invalid --frozen-time falls back to real now without crashing", () => {
    const repo = track(makeRepo([pendingTree("alpha")]));
    const r = runScript(repo, "--json", "--frozen-time", "not-a-timestamp", "--skip-bus-post");
    expect(r.exitCode).toBe(0);
    expect(r.json.pendingCount).toBe(1);
    expect(r.stderr).toContain("invalid --frozen-time");
    // generatedAt should be a real ISO timestamp (the real "now"), not NaN-derived.
    expect(Number.isFinite(Date.parse(r.json.generatedAt))).toBe(true);
  });

  it("variability: 3 trees (fresh / just-pending / 10d-stale) → only the stale one nudged", () => {
    const repo = track(makeRepo([
      pendingTree("fresh"),
      pendingTree("recent"),
      pendingTree("ancient"),
    ]));
    writeSidecarFile(repo, {
      schemaVersion: SCHEMA_VERSION,
      firstSeen: {
        ancient: "2026-04-30T00:00:00.000Z", // 10d before frozen-time → stale
        recent: "2026-05-08T00:00:00.000Z", // 2d before frozen-time → not stale
        // "fresh" has no firstSeen → recorded at frozen-time this run → not stale
      },
      lastNudgeAt: null,
    });
    const r = runScript(repo, "--json", "--frozen-time", "2026-05-10T00:00:00.000Z", "--skip-bus-post");
    expect(r.json.pendingCount).toBe(3);
    expect(r.json.staleCount).toBe(1);
    expect(r.json.stale[0].id).toBe("ancient");
    expect(r.json.stale[0].ageDays).toBe(10);
    expect(r.json.nudgeMessage).toContain("ancient");
    expect(r.json.nudgeMessage).not.toContain("recent");
    expect(r.json.nudgeMessage).not.toContain("fresh");
  });

  it("always exits 0 — even on a totally empty sandbox (advisory contract)", () => {
    const repo = mkdtempSync(path.join(tmpdir(), "fe-merge-empty-"));
    repos.push(repo);
    const r = runScript(repo, "--json", "--skip-bus-post");
    expect(r.exitCode).toBe(0);
  });
});

// ─── postToBus + the post-decision / lastNudgeAt-persistence path ─────────
// The most consequential branch: a successful post must advance lastNudgeAt
// (which is what makes the 24h rate-limit actually hold across runs). Exercised
// hermetically by planting a fake agent-coordination.mjs in the sandbox.

describe("postToBus (direct, hermetic via planted fake helper)", () => {
  const sandboxes: string[] = [];
  afterEach(() => {
    while (sandboxes.length) rmSync(sandboxes.pop()!, { recursive: true, force: true });
  });

  it("returns ok:true when the helper exits 0", () => {
    const repo = mkdtempSync(path.join(tmpdir(), "fe-merge-bus-ok-"));
    sandboxes.push(repo);
    plantFakeBus(repo, 0);
    const res = postToBus(repo, "test message");
    expect(res.ok).toBe(true);
  });

  it("returns ok:false with the exit code when the helper exits non-zero (failure mode)", () => {
    const repo = mkdtempSync(path.join(tmpdir(), "fe-merge-bus-fail-"));
    sandboxes.push(repo);
    plantFakeBus(repo, 1);
    const res = postToBus(repo, "test message");
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("exit=1");
  });

  it("returns ok:false with 'helper missing' when agent-coordination.mjs is absent (failure mode)", () => {
    const repo = mkdtempSync(path.join(tmpdir(), "fe-merge-bus-nohelper-"));
    sandboxes.push(repo);
    const res = postToBus(repo, "test message");
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("helper missing");
  });
});

describe("post-decision path: posted → lastNudgeAt advances → rate-limit holds", () => {
  const repos: string[] = [];
  afterEach(() => {
    while (repos.length) rmSync(repos.pop()!, { recursive: true, force: true });
  });

  it("a successful post advances lastNudgeAt to now and invokes the helper with the nudge message", () => {
    const repo = makeRepo([pendingTree("alpha", "Next.js 13")]);
    repos.push(repo);
    const sentinel = path.join(repo, "bus-calls.log");
    plantFakeBus(repo, 0, sentinel);
    writeSidecarFile(repo, {
      schemaVersion: SCHEMA_VERSION,
      firstSeen: { alpha: "2026-05-01T00:00:00.000Z" }, // 9d before frozen-time → stale
      lastNudgeAt: null,
    });
    // No --skip-bus-post: the real postToBus path runs.
    const r = runScript(repo, "--json", "--frozen-time", "2026-05-10T00:00:00.000Z");
    expect(r.exitCode).toBe(0);
    expect(r.json.staleCount).toBe(1);
    expect(r.json.posted).toBe(true);
    expect(r.json.postSkippedReason).toBeNull();
    // lastNudgeAt must advance to the run's "now" — this is what persists the rate limit.
    const sc = readSidecarFile(repo);
    expect(sc.lastNudgeAt).toBe("2026-05-10T00:00:00.000Z");
    // The helper was invoked with `post` + the bundled nudge message.
    const busLog = readFileSync(sentinel, "utf-8");
    expect(busLog).toContain("post");
    expect(busLog).toContain("alpha");
    expect(busLog).toContain("frontend merge(s)");
  });

  it("after a successful post, a second run within 24h is suppressed (rate-limit loop)", () => {
    const repo = makeRepo([pendingTree("alpha")]);
    repos.push(repo);
    plantFakeBus(repo, 0);
    writeSidecarFile(repo, {
      schemaVersion: SCHEMA_VERSION,
      firstSeen: { alpha: "2026-05-01T00:00:00.000Z" },
      lastNudgeAt: null,
    });
    // Run 1: posts, advances lastNudgeAt to 2026-05-10T00:00:00Z.
    const r1 = runScript(repo, "--json", "--frozen-time", "2026-05-10T00:00:00.000Z");
    expect(r1.json.posted).toBe(true);
    // Run 2: only 2h later — must be suppressed by the 24h cooldown.
    const r2 = runScript(repo, "--json", "--frozen-time", "2026-05-10T02:00:00.000Z");
    expect(r2.json.staleCount).toBe(1);
    expect(r2.json.posted).toBe(false);
    expect(r2.json.cooldownElapsed).toBe(false);
    expect(r2.json.postSkippedReason).toBe("within 24h cooldown");
    // Run 3: >24h after run 1 — cooldown elapsed, posts again.
    const r3 = runScript(repo, "--json", "--frozen-time", "2026-05-11T01:00:00.000Z");
    expect(r3.json.posted).toBe(true);
    expect(readSidecarFile(repo).lastNudgeAt).toBe("2026-05-11T01:00:00.000Z");
  });

  it("a FAILED post does NOT advance lastNudgeAt and surfaces postError (failure mode)", () => {
    const repo = makeRepo([pendingTree("alpha")]);
    repos.push(repo);
    plantFakeBus(repo, 1); // helper exits non-zero
    writeSidecarFile(repo, {
      schemaVersion: SCHEMA_VERSION,
      firstSeen: { alpha: "2026-05-01T00:00:00.000Z" },
      lastNudgeAt: null,
    });
    const r = runScript(repo, "--json", "--frozen-time", "2026-05-10T00:00:00.000Z");
    expect(r.exitCode).toBe(0); // advisory contract holds even when the post fails
    expect(r.json.staleCount).toBe(1);
    expect(r.json.posted).toBe(false);
    expect(r.json.postError).toContain("exit=1");
    // Critical: a failed post must NOT advance lastNudgeAt — otherwise the next
    // run would wrongly suppress, and the nudge would be lost entirely.
    expect(readSidecarFile(repo).lastNudgeAt).toBeNull();
  });
});
