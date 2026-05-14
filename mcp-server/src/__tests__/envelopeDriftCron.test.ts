// envelopeDriftCron.test.ts — CLEANUP-MS0/U-CLEANUP-F2 — verify build-envelope-drift.mjs
// behavior across first-run / no-change / drift-increased / forced paths without
// hitting the real chat-bus or live MILESTONE_PROGRESS.json.
//
// Approach: each test runs the script in --json mode against an isolated temp repo
// that contains a stub MILESTONE_PROGRESS.json + a stub build-milestone-progress.mjs.
// All assertions check concrete numeric or string values produced by the engine.

import { describe, it, expect, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const SCRIPT = path.resolve(__dirname, "../../../scripts/build-envelope-drift.mjs");

interface RunResult {
  exit: number;
  stdout: string;
  stderr: string;
  json: any | null;
}

function makeRepo(driftValue: number): string {
  const repo = mkdtempSync(path.join(os.tmpdir(), "envelope-drift-test-"));
  mkdirSync(path.join(repo, "state", "shared"), { recursive: true });
  mkdirSync(path.join(repo, "scripts"), { recursive: true });
  mkdirSync(path.join(repo, ".claude", "helpers"), { recursive: true });

  const progress = {
    schemaVersion: 1,
    generatedAt: "2026-05-14T00:00:00Z",
    totals: { milestones: 100, units: 500, shipped: 250, drift: driftValue },
    milestones: [
      { id: "TEST-MS0", title: "Test", track: "TEST", drift: "drift", shipped: 1, total: 5 },
    ],
  };
  writeFileSync(
    path.join(repo, "state", "shared", "MILESTONE_PROGRESS.json"),
    JSON.stringify(progress, null, 2),
  );

  writeFileSync(
    path.join(repo, "scripts", "build-milestone-progress.mjs"),
    `#!/usr/bin/env node\nprocess.exit(0);\n`,
  );

  const sentinelPath = path.join(repo, ".bus-posts.jsonl");
  writeFileSync(
    path.join(repo, ".claude", "helpers", "agent-coordination.mjs"),
    `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
const args = process.argv.slice(2);
if (args[0] === "post" && args[1] === "--message") {
  appendFileSync(${JSON.stringify(sentinelPath)}, args[2] + "\\n", "utf8");
  console.log(JSON.stringify({ok:true}));
  process.exit(0);
}
process.exit(1);
`,
  );

  return repo;
}

function runEngine(repo: string, extraArgs: string[] = []): RunResult {
  const r = spawnSync(
    process.execPath,
    [SCRIPT, "--repo", repo, "--json", "--frozen-time", "2026-05-14T02:00:00Z", ...extraArgs],
    { encoding: "utf8", timeout: 30_000 },
  );
  let json: any = null;
  try { json = JSON.parse(r.stdout); } catch { /* ignore */ }
  return { exit: r.status ?? -1, stdout: r.stdout, stderr: r.stderr, json };
}

function busPosts(repo: string): any[] {
  const p = path.join(repo, ".bus-posts.jsonl");
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

describe("envelope-drift cron", () => {
  let repo: string;

  afterEach(() => {
    if (repo && existsSync(repo)) rmSync(repo, { recursive: true, force: true });
  });

  it("first run: drift=42, no previous, no post, snapshot has 64-hex hash", () => {
    repo = makeRepo(42);
    const r = runEngine(repo);
    expect(r.exit).toBe(0);
    expect(r.json.current.drift).toBe(42);
    expect(r.json.current.milestones).toBe(100);
    expect(r.json.current.units).toBe(500);
    expect(r.json.current.shipped).toBe(250);
    expect(r.json.previous).toBeNull();
    expect(r.json.driftDelta).toBeNull();
    expect(r.json.driftIncreased).toBe(false);
    expect(r.json.posted).toBe(false);
    expect(r.json.postReason).toBe("no_change_or_decreased");
    expect(busPosts(repo).length).toBe(0);
    const snap = JSON.parse(readFileSync(path.join(repo, "state/shared/envelope-drift-last.json"), "utf8"));
    expect(snap.drift).toBe(42);
    expect(snap.milestones).toBe(100);
    expect(snap.hash.length).toBe(64);
    expect(/^[0-9a-f]+$/.test(snap.hash)).toBe(true);
  });

  it("no-change run: drift=42 twice, delta=0, no post, hashes equal", () => {
    repo = makeRepo(42);
    const first = runEngine(repo);
    const second = runEngine(repo);
    expect(first.exit).toBe(0);
    expect(second.exit).toBe(0);
    expect(second.json.current.drift).toBe(42);
    expect(second.json.previous.drift).toBe(42);
    expect(second.json.driftDelta).toBe(0);
    expect(second.json.driftIncreased).toBe(false);
    expect(second.json.posted).toBe(false);
    expect(second.json.current.hash).toBe(first.json.current.hash);
    expect(busPosts(repo).length).toBe(0);
  });

  it("drift increased 42 -> 99: posts to bus with delta=57, prevDrift=42, drifted_sample populated", () => {
    repo = makeRepo(42);
    runEngine(repo);
    const progressPath = path.join(repo, "state/shared/MILESTONE_PROGRESS.json");
    const progress = JSON.parse(readFileSync(progressPath, "utf8"));
    progress.totals.drift = 99;
    progress.milestones.push({ id: "ANOTHER-MS0", title: "Another", track: "TEST", drift: "drift", shipped: 0, total: 3 });
    writeFileSync(progressPath, JSON.stringify(progress, null, 2));
    const r = runEngine(repo);
    expect(r.exit).toBe(0);
    expect(r.json.current.drift).toBe(99);
    expect(r.json.previous.drift).toBe(42);
    expect(r.json.driftDelta).toBe(57);
    expect(r.json.driftIncreased).toBe(true);
    expect(r.json.posted).toBe(true);
    expect(r.json.postReason).toBe("drift_increased");
    const posts = busPosts(repo);
    expect(posts.length).toBe(1);
    expect(posts[0].event).toBe("envelope-drift-alert");
    expect(posts[0].scope).toBe("CLEANUP-MS0");
    expect(posts[0].unit).toBe("U-CLEANUP-F2");
    expect(posts[0].drift).toBe(99);
    expect(posts[0].prevDrift).toBe(42);
    expect(posts[0].delta).toBe(57);
    expect(posts[0].drifted_sample).toEqual(["ANOTHER-MS0", "TEST-MS0"]);
  });

  it("drift decreased 100 -> 50: no post, snapshot updated to 50", () => {
    repo = makeRepo(100);
    runEngine(repo);
    const progressPath = path.join(repo, "state/shared/MILESTONE_PROGRESS.json");
    const progress = JSON.parse(readFileSync(progressPath, "utf8"));
    progress.totals.drift = 50;
    writeFileSync(progressPath, JSON.stringify(progress, null, 2));
    const r = runEngine(repo);
    expect(r.exit).toBe(0);
    expect(r.json.current.drift).toBe(50);
    expect(r.json.previous.drift).toBe(100);
    expect(r.json.driftDelta).toBe(-50);
    expect(r.json.driftIncreased).toBe(false);
    expect(r.json.posted).toBe(false);
    expect(busPosts(repo).length).toBe(0);
    const snap = JSON.parse(readFileSync(path.join(repo, "state/shared/envelope-drift-last.json"), "utf8"));
    expect(snap.drift).toBe(50);
  });

  it("--force-post posts even when drift unchanged: postReason=forced, 1 bus entry", () => {
    repo = makeRepo(42);
    runEngine(repo);
    const r = runEngine(repo, ["--force-post"]);
    expect(r.exit).toBe(0);
    expect(r.json.driftDelta).toBe(0);
    expect(r.json.posted).toBe(true);
    expect(r.json.postReason).toBe("forced");
    expect(busPosts(repo).length).toBe(1);
  });

  it("--skip-bus-post suppresses posting even on drift increase 42 -> 99", () => {
    repo = makeRepo(42);
    runEngine(repo);
    const progressPath = path.join(repo, "state/shared/MILESTONE_PROGRESS.json");
    const progress = JSON.parse(readFileSync(progressPath, "utf8"));
    progress.totals.drift = 99;
    writeFileSync(progressPath, JSON.stringify(progress, null, 2));
    const r = runEngine(repo, ["--skip-bus-post"]);
    expect(r.exit).toBe(0);
    expect(r.json.current.drift).toBe(99);
    expect(r.json.driftDelta).toBe(57);
    expect(r.json.driftIncreased).toBe(true);
    expect(r.json.posted).toBe(false);
    expect(busPosts(repo).length).toBe(0);
  });

  it("trends file: 3 runs writes 3 JSONL rows each with drift=42 + 64-hex hash", () => {
    repo = makeRepo(42);
    runEngine(repo);
    runEngine(repo);
    runEngine(repo);
    const trendsPath = path.join(repo, "state/shared/envelope-drift-trends.jsonl");
    expect(existsSync(trendsPath)).toBe(true);
    const lines = readFileSync(trendsPath, "utf8").split(/\r?\n/).filter(Boolean);
    expect(lines.length).toBe(3);
    const rows = lines.map(l => JSON.parse(l));
    expect(rows[0].drift).toBe(42);
    expect(rows[1].drift).toBe(42);
    expect(rows[2].drift).toBe(42);
    expect(rows[0].ts).toBe("2026-05-14T02:00:00Z");
    expect(rows[0].hash.length).toBe(64);
    expect(rows[0].posted).toBe(false);
    expect(rows[1].delta).toBe(0);
  });

  it("--skip-trends-append: no trends file written", () => {
    repo = makeRepo(42);
    const r = runEngine(repo, ["--skip-trends-append"]);
    expect(r.exit).toBe(0);
    expect(existsSync(path.join(repo, "state/shared/envelope-drift-trends.jsonl"))).toBe(false);
  });

  it("missing MILESTONE_PROGRESS.json: exit=3, no snapshot written", () => {
    repo = makeRepo(0);
    rmSync(path.join(repo, "state/shared/MILESTONE_PROGRESS.json"));
    const r = runEngine(repo);
    expect(r.exit).toBe(3);
    expect(existsSync(path.join(repo, "state/shared/envelope-drift-last.json"))).toBe(false);
  });

  it("missing build-milestone-progress.mjs: exit=2", () => {
    repo = makeRepo(0);
    rmSync(path.join(repo, "scripts/build-milestone-progress.mjs"));
    const r = runEngine(repo);
    expect(r.exit).toBe(2);
  });

  it("hash stable under key reorder: same drift + same drifted_ids = same hash", () => {
    repo = makeRepo(42);
    const first = runEngine(repo);
    const reordered = {
      milestones: [
        { drift: "drift", id: "TEST-MS0", shipped: 1, title: "Test", total: 5, track: "TEST" },
      ],
      totals: { units: 500, shipped: 250, drift: 42, milestones: 100 },
      generatedAt: "2026-05-14T00:00:00Z",
      schemaVersion: 1,
    };
    writeFileSync(
      path.join(repo, "state/shared/MILESTONE_PROGRESS.json"),
      JSON.stringify(reordered, null, 2),
    );
    const second = runEngine(repo);
    expect(second.exit).toBe(0);
    expect(second.json.current.hash).toBe(first.json.current.hash);
    expect(second.json.driftDelta).toBe(0);
  });

  it("drifted_sample capped at 5 even when 10 milestones drift", () => {
    repo = makeRepo(10);
    const progressPath = path.join(repo, "state/shared/MILESTONE_PROGRESS.json");
    const progress = JSON.parse(readFileSync(progressPath, "utf8"));
    progress.totals.drift = 1; // first run baseline
    progress.milestones = [{ id: "FIRST-MS0", title: "First", track: "T", drift: "drift", shipped: 0, total: 1 }];
    writeFileSync(progressPath, JSON.stringify(progress, null, 2));
    runEngine(repo); // baseline drift=1
    // Bump drift to 10 with 10 distinct drifted milestones
    progress.totals.drift = 10;
    progress.milestones = Array.from({ length: 10 }, (_, i) => ({
      id: `BUMP-MS${i.toString().padStart(2, "0")}`,
      title: `Bump ${i}`,
      track: "T",
      drift: "drift",
      shipped: 0,
      total: 1,
    }));
    writeFileSync(progressPath, JSON.stringify(progress, null, 2));
    const r = runEngine(repo);
    expect(r.exit).toBe(0);
    expect(r.json.driftIncreased).toBe(true);
    const posts = busPosts(repo);
    expect(posts.length).toBe(1);
    expect(posts[0].drifted_sample.length).toBe(5);
    // Sorted alphabetically (BUMP-MS00 through BUMP-MS04)
    expect(posts[0].drifted_sample).toEqual([
      "BUMP-MS00", "BUMP-MS01", "BUMP-MS02", "BUMP-MS03", "BUMP-MS04",
    ]);
  });
});
