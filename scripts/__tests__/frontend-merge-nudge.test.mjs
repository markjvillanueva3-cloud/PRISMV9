/**
 * frontend-merge-nudge.test.mjs — verification of CLEANUP-MS0 / U-CLEANUP-F3.
 *
 * Coverage floor:
 *   - happy path (pending tree goes stale, nudge posts, lastNudgeAt updates)
 *   - >= 3 failure modes (missing BUILD_STATE, malformed BUILD_STATE, missing
 *     NEEDS_FRONTEND node, corrupt sidecar, missing chat-bus helper)
 *   - >= 2 adversarial inputs (bad --frozen-time, tree with no id, unknown flag)
 *   - >= 3 spanning variability configs (0 pending / pending-not-stale /
 *     pending-and-stale, cooldown-active vs elapsed, --force)
 *   - round-trip CLI invocation via spawnSync with real I/O + a real
 *     chat-bus-helper stub (proves the post path + lastNudgeAt update)
 *
 * Real reference values — no toBeDefined()/toBeTruthy() blanket stubs.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseArgs,
  readJSON,
  readPendingTrees,
  loadSidecar,
  writeSidecar,
  postToBus,
  buildNudgeMessage,
  DAY_MS,
  SCHEMA_VERSION,
  STALE_AFTER_DAYS,
  STALE_AFTER_MS,
  NUDGE_COOLDOWN_MS,
} from "../frontend-merge-nudge.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(__dirname, "..", "frontend-merge-nudge.mjs");

const NOW = "2026-05-14T00:00:00.000Z";
const NOW_MS = Date.parse(NOW);
const EIGHT_DAYS_AGO = new Date(NOW_MS - 8 * DAY_MS).toISOString();
const TWO_DAYS_AGO = new Date(NOW_MS - 2 * DAY_MS).toISOString();
const ONE_HOUR_AGO = new Date(NOW_MS - 60 * 60 * 1000).toISOString();

// ── fixture helpers ───────────────────────────────────────────────────

/** Build a temp repo dir with a BUILD_STATE.json. Returns the repo path. */
function makeRepo(buildState, opts = {}) {
  const repo = mkdtempSync(join(tmpdir(), "fmn-test-"));
  const sharedDir = join(repo, "state", "shared");
  mkdirSync(sharedDir, { recursive: true });
  if (buildState !== null) {
    writeFileSync(join(sharedDir, "BUILD_STATE.json"), typeof buildState === "string" ? buildState : JSON.stringify(buildState, null, 2));
  }
  if (opts.sidecar !== undefined) {
    writeFileSync(
      join(sharedDir, ".frontend-merge-nudge-last.json"),
      typeof opts.sidecar === "string" ? opts.sidecar : JSON.stringify(opts.sidecar, null, 2),
    );
  }
  if (opts.withBusHelper) {
    // A chat-bus helper stub faithful to the real agent-coordination.mjs `post`
    // contract: `post --status <s> --message <text>`, records the verbatim
    // --message + --status, exits 0. Set opts.busHelperExit to a non-zero code
    // to simulate the real helper rejecting a malformed message.
    const exitCode = Number.isInteger(opts.busHelperExit) ? opts.busHelperExit : 0;
    const helperDir = join(repo, ".claude", "helpers");
    mkdirSync(helperDir, { recursive: true });
    const stubPath = join(helperDir, "agent-coordination.mjs");
    writeFileSync(
      stubPath,
      [
        "import { writeFileSync } from 'node:fs';",
        "import { join, dirname } from 'node:path';",
        "import { fileURLToPath } from 'node:url';",
        "const args = process.argv.slice(2);",
        "if (args[0] === 'post') {",
        "  const msgIdx = args.indexOf('--message');",
        "  const statIdx = args.indexOf('--status');",
        "  const msg = msgIdx >= 0 ? args[msgIdx + 1] : '';",
        "  const status = statIdx >= 0 ? args[statIdx + 1] : '';",
        "  const here = dirname(fileURLToPath(import.meta.url));",
        "  writeFileSync(join(here, '..', '..', 'bus-post-received.json'),",
        "    JSON.stringify({ message: msg, status }));",
        "}",
        `process.exit(${exitCode});`,
      ].join("\n"),
    );
  }
  return repo;
}

function buildStateWith(trees) {
  return {
    schemaVersion: 1,
    generatedAt: NOW,
    headline: {},
    NEEDS_FRONTEND: { summary: `${trees.length} pending`, trees },
  };
}

const PENDING_TREE_A = {
  id: "cqask-orion-cad",
  path: "cqask/ui",
  role: "codex-build-pending-merge",
  stack: "Next.js 13 + Ant Design",
  merge_status: "PENDING_MERGE",
};
const PENDING_TREE_B = {
  id: "mcp-cadquery-frontend",
  path: "mcp-cadquery/frontend",
  role: "codex-build-pending-merge",
  stack: "Vite + React 19",
  merge_status: "PENDING_MERGE",
};
const MERGED_TREE = {
  id: "main-web",
  path: "mcp-server/web",
  role: "canonical",
  stack: "React + Vite",
  merge_status: "merged",
};

/** Run the CLI against a repo. Returns { status, json, stdout, stderr }. */
function runCli(repo, extraArgs = []) {
  const r = spawnSync(
    process.execPath,
    [SCRIPT, "--repo", repo, "--frozen-time", NOW, "--json", ...extraArgs],
    { encoding: "utf8", timeout: 15000 },
  );
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    /* leave null — caller asserts on stdout/status */
  }
  return { status: r.status, json, stdout: r.stdout, stderr: r.stderr };
}

const repos = [];
afterEach(() => {
  while (repos.length) {
    const r = repos.pop();
    try {
      rmSync(r, { recursive: true, force: true });
    } catch {
      /* best-effort temp cleanup */
    }
  }
});
function track(repo) {
  repos.push(repo);
  return repo;
}

// ── parseArgs ─────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("empty argv → all defaults", () => {
    const a = parseArgs([]);
    expect(a.json).toBe(false);
    expect(a.dryRun).toBe(false);
    expect(a.skipBusPost).toBe(false);
    expect(a.force).toBe(false);
    expect(a.frozenTime).toBeNull();
    expect(a.help).toBe(false);
  });

  it("all flags parsed", () => {
    const a = parseArgs(["--json", "--dry-run", "--skip-bus-post", "--force", "--frozen-time", NOW, "--repo", "X"]);
    expect(a.json).toBe(true);
    expect(a.dryRun).toBe(true);
    expect(a.skipBusPost).toBe(true);
    expect(a.force).toBe(true);
    expect(a.frozenTime).toBe(NOW);
    expect(a.repo).toBe("X");
  });

  it("-h and --help both set help", () => {
    expect(parseArgs(["-h"]).help).toBe(true);
    expect(parseArgs(["--help"]).help).toBe(true);
  });

  it("unknown flag is ignored (advisory script — never aborts)", () => {
    const a = parseArgs(["--json", "--not-a-real-flag", "--force"]);
    expect(a.json).toBe(true);
    expect(a.force).toBe(true);
  });
});

// ── readJSON / readPendingTrees ───────────────────────────────────────

describe("readJSON", () => {
  it("missing file → null", () => {
    expect(readJSON(join(tmpdir(), "definitely-not-here-fmn.json"))).toBeNull();
  });

  it("malformed JSON → null (no throw)", () => {
    const repo = track(makeRepo("{ not valid json"));
    expect(readJSON(join(repo, "state", "shared", "BUILD_STATE.json"))).toBeNull();
  });

  it("valid JSON → parsed object", () => {
    const repo = track(makeRepo(buildStateWith([PENDING_TREE_A])));
    const parsed = readJSON(join(repo, "state", "shared", "BUILD_STATE.json"));
    expect(parsed.NEEDS_FRONTEND.trees).toHaveLength(1);
  });
});

describe("readPendingTrees", () => {
  it("missing BUILD_STATE → empty trees, ok:false", () => {
    const repo = track(makeRepo(null));
    const r = readPendingTrees(repo);
    expect(r.trees).toEqual([]);
    expect(r.ok).toBe(false);
  });

  it("BUILD_STATE without NEEDS_FRONTEND → empty trees, ok:false", () => {
    const repo = track(makeRepo({ schemaVersion: 1, BUILT: [] }));
    const r = readPendingTrees(repo);
    expect(r.trees).toEqual([]);
    expect(r.ok).toBe(false);
  });

  it("filters out merged trees, keeps only PENDING_MERGE", () => {
    const repo = track(makeRepo(buildStateWith([PENDING_TREE_A, MERGED_TREE, PENDING_TREE_B])));
    const r = readPendingTrees(repo);
    expect(r.ok).toBe(true);
    expect(r.trees.map((t) => t.id).sort()).toEqual(["cqask-orion-cad", "mcp-cadquery-frontend"]);
  });

  it("adversarial: tree with no id is dropped (typeof t.id === string guard)", () => {
    const noId = { path: "x/y", merge_status: "PENDING_MERGE" };
    const repo = track(makeRepo(buildStateWith([noId, PENDING_TREE_A])));
    const r = readPendingTrees(repo);
    expect(r.trees).toHaveLength(1);
    expect(r.trees[0].id).toBe("cqask-orion-cad");
  });
});

// ── loadSidecar / writeSidecar ────────────────────────────────────────

describe("loadSidecar / writeSidecar", () => {
  it("missing sidecar → fresh default state", () => {
    const repo = track(makeRepo(buildStateWith([])));
    const s = loadSidecar(repo);
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.firstSeen).toEqual({});
    expect(s.lastNudgeAt).toBeNull();
  });

  it("corrupt sidecar → fresh default state (no throw)", () => {
    const repo = track(makeRepo(buildStateWith([]), { sidecar: "{{{ corrupt" }));
    const s = loadSidecar(repo);
    expect(s.firstSeen).toEqual({});
    expect(s.lastNudgeAt).toBeNull();
  });

  it("schema drift (wrong schemaVersion) → reset to fresh", () => {
    const repo = track(
      makeRepo(buildStateWith([]), {
        sidecar: { schemaVersion: 999, firstSeen: { x: NOW }, lastNudgeAt: NOW },
      }),
    );
    const s = loadSidecar(repo);
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.firstSeen).toEqual({});
    expect(s.lastNudgeAt).toBeNull();
  });

  it("valid sidecar → fields preserved", () => {
    const repo = track(
      makeRepo(buildStateWith([]), {
        sidecar: { schemaVersion: SCHEMA_VERSION, firstSeen: { a: EIGHT_DAYS_AGO }, lastNudgeAt: TWO_DAYS_AGO },
      }),
    );
    const s = loadSidecar(repo);
    expect(s.firstSeen).toEqual({ a: EIGHT_DAYS_AGO });
    expect(s.lastNudgeAt).toBe(TWO_DAYS_AGO);
  });

  it("corrupt firstSeen value (non-string / unparseable) is dropped — self-heals", () => {
    const repo = track(
      makeRepo(buildStateWith([]), {
        sidecar: {
          schemaVersion: SCHEMA_VERSION,
          firstSeen: { good: EIGHT_DAYS_AGO, badObj: { nested: 1 }, badStr: "not-a-date", badNum: 12345 },
          lastNudgeAt: "also-not-a-date",
        },
      }),
    );
    const s = loadSidecar(repo);
    // Only the parseable ISO entry survives — the rest would make trees
    // permanently non-stale (Date.parse → NaN → never re-recorded).
    expect(s.firstSeen).toEqual({ good: EIGHT_DAYS_AGO });
    // An unparseable lastNudgeAt resets to null (cooldown treated as elapsed).
    expect(s.lastNudgeAt).toBeNull();
  });

  it("writeSidecar round-trips through loadSidecar", () => {
    const repo = track(makeRepo(buildStateWith([])));
    const state = { schemaVersion: SCHEMA_VERSION, firstSeen: { z: NOW }, lastNudgeAt: NOW };
    expect(writeSidecar(repo, state)).toBe(true);
    expect(loadSidecar(repo)).toEqual(state);
  });
});

// ── postToBus ─────────────────────────────────────────────────────────

describe("postToBus", () => {
  it("missing helper → ok:false with reason", () => {
    const repo = track(makeRepo(buildStateWith([])));
    const r = postToBus(repo, { kind: "test" });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/helper missing/);
  });

  it("real helper stub → ok:true, message + advisory status delivered verbatim", () => {
    const repo = track(makeRepo(buildStateWith([]), { withBusHelper: true }));
    const message = "frontend-merge-nudge -- 3 frontend merge(s) pending over 7d";
    const r = postToBus(repo, message);
    expect(r.ok).toBe(true);
    const received = JSON.parse(readFileSync(join(repo, "bus-post-received.json"), "utf8"));
    expect(received.message).toBe(message);
    expect(received.status).toBe("advisory");
  });

  it("helper exits non-zero → ok:false with exit= reason", () => {
    const repo = track(makeRepo(buildStateWith([]), { withBusHelper: true, busHelperExit: 1 }));
    const r = postToBus(repo, "anything");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("exit=1");
  });
});

// ── buildNudgeMessage ─────────────────────────────────────────────────

describe("buildNudgeMessage", () => {
  it("renders count + per-tree detail, no ':' / ';' / '|' chars", () => {
    const msg = buildNudgeMessage([
      { id: "cqask-orion-cad", path: "cqask/ui", stack: "Next.js 13", ageDays: 8 },
      { id: "mcp-cadquery-frontend", path: "mcp-cadquery/frontend", stack: "Vite React 19", ageDays: 12 },
    ]);
    expect(msg).toContain("2 frontend merge(s) pending over 7d");
    expect(msg).toContain("cqask-orion-cad (Next.js 13, 8d, cqask/ui)");
    expect(msg).toContain("mcp-cadquery-frontend (Vite React 19, 12d, mcp-cadquery/frontend)");
    // agent-coordination's structured parser splits on : ; | — keep the body clean
    expect(msg).not.toMatch(/[:;|]/);
  });

  it("single tree → count of 1", () => {
    const msg = buildNudgeMessage([{ id: "x", path: "p", stack: "s", ageDays: 9 }]);
    expect(msg).toContain("1 frontend merge(s) pending over 7d");
    expect(msg).toContain("x (s, 9d, p)");
  });
});

// ── constants sanity ──────────────────────────────────────────────────

describe("exported constants", () => {
  it("STALE_AFTER_MS is 7 days in ms", () => {
    expect(STALE_AFTER_DAYS).toBe(7);
    expect(STALE_AFTER_MS).toBe(7 * DAY_MS);
  });
  it("NUDGE_COOLDOWN_MS is 24h", () => {
    expect(NUDGE_COOLDOWN_MS).toBe(DAY_MS);
  });
});

// ── CLI integration: spanning variability configs ─────────────────────

describe("CLI: variability — pending/stale/cooldown matrix", () => {
  it("0 pending trees → staleCount 0, nothing to nudge, exit 0", () => {
    const repo = track(makeRepo(buildStateWith([MERGED_TREE])));
    const { status, json } = runCli(repo, ["--skip-bus-post"]);
    expect(status).toBe(0);
    expect(json.pendingCount).toBe(0);
    expect(json.staleCount).toBe(0);
    expect(json.postSkippedReason).toBe("no stale trees");
  });

  it("pending but NOT stale (first seen now) → staleCount 0, no post", () => {
    const repo = track(makeRepo(buildStateWith([PENDING_TREE_A, PENDING_TREE_B])));
    const { status, json } = runCli(repo, ["--skip-bus-post"]);
    expect(status).toBe(0);
    expect(json.pendingCount).toBe(2);
    expect(json.staleCount).toBe(0);
    // sidecar should now have recorded firstSeen for both
    const sidecar = JSON.parse(
      readFileSync(join(repo, "state", "shared", ".frontend-merge-nudge-last.json"), "utf8"),
    );
    expect(Object.keys(sidecar.firstSeen).sort()).toEqual(["cqask-orion-cad", "mcp-cadquery-frontend"]);
  });

  it("pending AND stale (firstSeen 8d ago), no prior nudge → wants post (skip-bus shows intent)", () => {
    const repo = track(
      makeRepo(buildStateWith([PENDING_TREE_A]), {
        sidecar: { schemaVersion: SCHEMA_VERSION, firstSeen: { "cqask-orion-cad": EIGHT_DAYS_AGO }, lastNudgeAt: null },
      }),
    );
    const { status, json } = runCli(repo, ["--skip-bus-post"]);
    expect(status).toBe(0);
    expect(json.staleCount).toBe(1);
    expect(json.stale[0].id).toBe("cqask-orion-cad");
    expect(json.stale[0].ageDays).toBe(8);
    expect(json.postSkippedReason).toBe("skip-bus-post");
    expect(json.posted).toBe(false);
  });

  it("stale + lastNudgeAt 1h ago → within-cooldown, no post", () => {
    const repo = track(
      makeRepo(buildStateWith([PENDING_TREE_A]), {
        sidecar: {
          schemaVersion: SCHEMA_VERSION,
          firstSeen: { "cqask-orion-cad": EIGHT_DAYS_AGO },
          lastNudgeAt: ONE_HOUR_AGO,
        },
      }),
    );
    const { status, json } = runCli(repo, ["--skip-bus-post"]);
    expect(status).toBe(0);
    expect(json.staleCount).toBe(1);
    expect(json.cooldownElapsed).toBe(false);
    expect(json.postSkippedReason).toBe("within 24h cooldown");
  });

  it("stale + within cooldown + --force → bypasses cooldown (skip-bus shows intent)", () => {
    const repo = track(
      makeRepo(buildStateWith([PENDING_TREE_A]), {
        sidecar: {
          schemaVersion: SCHEMA_VERSION,
          firstSeen: { "cqask-orion-cad": EIGHT_DAYS_AGO },
          lastNudgeAt: ONE_HOUR_AGO,
        },
      }),
    );
    const { status, json } = runCli(repo, ["--skip-bus-post", "--force"]);
    expect(status).toBe(0);
    expect(json.staleCount).toBe(1);
    expect(json.postSkippedReason).toBe("skip-bus-post"); // force got past cooldown, only skip-bus stopped it
  });
});

// ── CLI integration: the real post path + lastNudgeAt update ──────────

describe("CLI: happy path — stale tree posts and updates lastNudgeAt", () => {
  it("stale + no cooldown + real bus helper → posts, lastNudgeAt set to now", () => {
    const repo = track(
      makeRepo(buildStateWith([PENDING_TREE_A, PENDING_TREE_B]), {
        withBusHelper: true,
        sidecar: {
          schemaVersion: SCHEMA_VERSION,
          firstSeen: { "cqask-orion-cad": EIGHT_DAYS_AGO, "mcp-cadquery-frontend": EIGHT_DAYS_AGO },
          lastNudgeAt: null,
        },
      }),
    );
    const { status, json } = runCli(repo);
    expect(status).toBe(0);
    expect(json.staleCount).toBe(2);
    expect(json.posted).toBe(true);
    expect(json.postError).toBeNull();

    // The bus stub recorded the message — verify it bundled BOTH stale trees
    // into one readable nudge with the advisory status.
    const received = JSON.parse(readFileSync(join(repo, "bus-post-received.json"), "utf8"));
    expect(received.status).toBe("advisory");
    expect(received.message).toContain("2 frontend merge(s) pending over 7d");
    // Each stale tree's full detail (id, stack, ageDays, path) must be present —
    // a regression to `stale.map(s => s.id)` would drop the parenthetical.
    expect(received.message).toMatch(/cqask-orion-cad \(Next\.js 13[^)]*8d[^)]*cqask\/ui\)/);
    expect(received.message).toMatch(/mcp-cadquery-frontend \(Vite \+ React 19[^)]*8d[^)]*mcp-cadquery\/frontend\)/);
    // json.nudgeMessage mirrors what was posted.
    expect(json.nudgeMessage).toBe(received.message);

    // lastNudgeAt was advanced to NOW.
    const sidecar = JSON.parse(
      readFileSync(join(repo, "state", "shared", ".frontend-merge-nudge-last.json"), "utf8"),
    );
    expect(sidecar.lastNudgeAt).toBe(NOW);
  });

  it("a second run immediately after → within cooldown, does NOT re-post", () => {
    const repo = track(
      makeRepo(buildStateWith([PENDING_TREE_A]), {
        withBusHelper: true,
        sidecar: {
          schemaVersion: SCHEMA_VERSION,
          firstSeen: { "cqask-orion-cad": EIGHT_DAYS_AGO },
          lastNudgeAt: null,
        },
      }),
    );
    // First run: posts.
    const first = runCli(repo);
    expect(first.json.posted).toBe(true);
    // Second run at the SAME frozen time: cooldown not elapsed.
    const second = runCli(repo);
    expect(second.json.posted).toBe(false);
    expect(second.json.postSkippedReason).toBe("within 24h cooldown");
  });
});

// ── CLI integration: failure modes + adversarial ──────────────────────

describe("CLI: failure modes", () => {
  it("missing BUILD_STATE → buildStateReadOk false, exit 0, no crash", () => {
    const repo = track(makeRepo(null));
    const { status, json } = runCli(repo, ["--skip-bus-post"]);
    expect(status).toBe(0);
    expect(json.buildStateReadOk).toBe(false);
    expect(json.pendingCount).toBe(0);
  });

  it("malformed BUILD_STATE → buildStateReadOk false, exit 0", () => {
    const repo = track(makeRepo("{ broken"));
    const { status, json } = runCli(repo, ["--skip-bus-post"]);
    expect(status).toBe(0);
    expect(json.buildStateReadOk).toBe(false);
  });

  it("stale tree but missing chat-bus helper → posted false, postError names the cause", () => {
    const repo = track(
      makeRepo(buildStateWith([PENDING_TREE_A]), {
        // no withBusHelper
        sidecar: {
          schemaVersion: SCHEMA_VERSION,
          firstSeen: { "cqask-orion-cad": EIGHT_DAYS_AGO },
          lastNudgeAt: null,
        },
      }),
    );
    const { status, json } = runCli(repo);
    expect(status).toBe(0);
    expect(json.staleCount).toBe(1);
    expect(json.posted).toBe(false);
    expect(json.postError).toMatch(/helper missing/);
    // lastNudgeAt must NOT advance when the post failed.
    const sidecar = JSON.parse(
      readFileSync(join(repo, "state", "shared", ".frontend-merge-nudge-last.json"), "utf8"),
    );
    expect(sidecar.lastNudgeAt).toBeNull();
  });

  it("adversarial: bad --frozen-time → falls back to real now, still exit 0", () => {
    const repo = track(makeRepo(buildStateWith([PENDING_TREE_A])));
    const r = spawnSync(
      process.execPath,
      [SCRIPT, "--repo", repo, "--frozen-time", "not-a-date", "--json", "--skip-bus-post"],
      { encoding: "utf8", timeout: 15000 },
    );
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/invalid --frozen-time/);
    const json = JSON.parse(r.stdout);
    // real now is far past the test's NOW, so the tree is "first seen" at real now
    expect(json.pendingCount).toBe(1);
  });

  it("dry-run with a stale tree → reason 'dry-run', sidecar NOT written", () => {
    // Stale fixture so the post WOULD be wanted — proving --dry-run is the
    // thing that suppressed it (not "no stale trees").
    const repo = track(
      makeRepo(buildStateWith([PENDING_TREE_A]), {
        sidecar: {
          schemaVersion: SCHEMA_VERSION,
          firstSeen: { "cqask-orion-cad": EIGHT_DAYS_AGO },
          lastNudgeAt: null,
        },
      }),
    );
    const { status, json } = runCli(repo, ["--dry-run"]);
    expect(status).toBe(0);
    expect(json.staleCount).toBe(1);
    expect(json.sidecarWritten).toBe(false);
    expect(json.postSkippedReason).toBe("dry-run");
    // sidecar pre-existed in the fixture; dry-run must not have rewritten it,
    // but it DOES still exist — assert content is byte-identical to the fixture.
    const sidecar = JSON.parse(
      readFileSync(join(repo, "state", "shared", ".frontend-merge-nudge-last.json"), "utf8"),
    );
    expect(sidecar.lastNudgeAt).toBeNull();
    expect(sidecar.firstSeen).toEqual({ "cqask-orion-cad": EIGHT_DAYS_AGO });
  });

  it("dry-run with NO prior sidecar → sidecar file is never created", () => {
    const repo = track(makeRepo(buildStateWith([PENDING_TREE_A])));
    const { status, json } = runCli(repo, ["--dry-run"]);
    expect(status).toBe(0);
    expect(json.sidecarWritten).toBe(false);
    expect(existsSync(join(repo, "state", "shared", ".frontend-merge-nudge-last.json"))).toBe(false);
  });

  it("firstSeen entry for a tree that merged is pruned on next run", () => {
    // Sidecar remembers a tree that's no longer in BUILD_STATE's pending list.
    const repo = track(
      makeRepo(buildStateWith([PENDING_TREE_A]), {
        sidecar: {
          schemaVersion: SCHEMA_VERSION,
          firstSeen: { "cqask-orion-cad": TWO_DAYS_AGO, "old-merged-tree": EIGHT_DAYS_AGO },
          lastNudgeAt: null,
        },
      }),
    );
    runCli(repo, ["--skip-bus-post"]);
    const sidecar = JSON.parse(
      readFileSync(join(repo, "state", "shared", ".frontend-merge-nudge-last.json"), "utf8"),
    );
    expect(Object.keys(sidecar.firstSeen)).toEqual(["cqask-orion-cad"]);
  });
});

describe("CLI: --help", () => {
  it("--help prints usage and exits 0", () => {
    const r = spawnSync(process.execPath, [SCRIPT, "--help"], { encoding: "utf8", timeout: 10000 });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/frontend-merge-nudge\.mjs/);
    expect(r.stdout).toMatch(/--skip-bus-post/);
    expect(r.stdout).toMatch(/always 0/);
  });
});

// ── CLI: non-JSON (human-readable) stdout branches ────────────────────

/** Run the CLI WITHOUT --json so the human-readable stdout path is exercised. */
function runCliPlain(repo, extraArgs = []) {
  return spawnSync(
    process.execPath,
    [SCRIPT, "--repo", repo, "--frozen-time", NOW, ...extraArgs],
    { encoding: "utf8", timeout: 15000 },
  );
}

describe("CLI: human-readable stdout (no --json)", () => {
  it("0 stale → 'nothing to nudge' line", () => {
    const repo = track(makeRepo(buildStateWith([PENDING_TREE_A])));
    const r = runCliPlain(repo, ["--skip-bus-post"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/1 pending, 0 stale \(>7d\) — nothing to nudge/);
  });

  it("stale + posted → 'posted nudge for' line naming the trees", () => {
    const repo = track(
      makeRepo(buildStateWith([PENDING_TREE_A]), {
        withBusHelper: true,
        sidecar: {
          schemaVersion: SCHEMA_VERSION,
          firstSeen: { "cqask-orion-cad": EIGHT_DAYS_AGO },
          lastNudgeAt: null,
        },
      }),
    );
    const r = runCliPlain(repo);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/posted nudge for 1 stale tree\(s\): cqask-orion-cad/);
  });

  it("stale but suppressed → 'no post' line with the reason", () => {
    const repo = track(
      makeRepo(buildStateWith([PENDING_TREE_A]), {
        sidecar: {
          schemaVersion: SCHEMA_VERSION,
          firstSeen: { "cqask-orion-cad": EIGHT_DAYS_AGO },
          lastNudgeAt: ONE_HOUR_AGO,
        },
      }),
    );
    const r = runCliPlain(repo, ["--skip-bus-post"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/1 stale tree\(s\) but no post \(within 24h cooldown\)/);
  });
});

describe("CLI: sidecar write contract", () => {
  it("--skip-bus-post DOES write the sidecar (contrast with --dry-run)", () => {
    const repo = track(makeRepo(buildStateWith([PENDING_TREE_A])));
    const { status, json } = runCli(repo, ["--skip-bus-post"]);
    expect(status).toBe(0);
    expect(json.sidecarWritten).toBe(true);
    expect(existsSync(join(repo, "state", "shared", ".frontend-merge-nudge-last.json"))).toBe(true);
  });
});
