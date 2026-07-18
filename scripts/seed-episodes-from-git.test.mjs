#!/usr/bin/env node
// Tests for seed-episodes-from-git.mjs — PSN-ENHANCE-MS0/U-PSN-GRAPHITI-LITE
// Uses fake spawnImpl so no real git I/O occurs.
// Run: node --test scripts/seed-episodes-from-git.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readGitLog, commitToEpisode, seedFromGit } from "./seed-episodes-from-git.mjs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a fake spawnImpl that returns a fixed stdout string. */
function fakeSpawn(stdout, exitStatus = 0, stderr = "") {
  return (_cmd, _args, _opts) => ({ status: exitStatus, stdout, stderr });
}

/** Build raw git --name-only output for an array of commit descriptors.
 *  Each descriptor: { sha, iso, author, subject, files[] }
 *  Iter-23+: the real format string ends with `\x1e` (RECSEP) per entry so the
 *  parser splits on it regardless of --name-only presence. Fake output must
 *  mirror that: each commit's stdout chunk gets a trailing RECSEP.
 */
function buildGitOutput(commits) {
  const SEP = "\x1f";
  const RECSEP = "\x1e";
  return commits
    .map(({ sha, iso, author, subject, files }) => {
      const header = [sha, iso, author, subject].join(SEP);
      const withFiles = files && files.length > 0 ? header + "\n" + files.join("\n") : header;
      return withFiles + RECSEP;
    })
    .join("");
}

// ---------------------------------------------------------------------------
// 1. Single commit with files
// ---------------------------------------------------------------------------
test("readGitLog: single commit with files", () => {
  const commits = [
    { sha: "abc123", iso: "2026-05-24T12:00:00Z", author: "alice", subject: "feat: add widget", files: ["src/a.ts", "src/b.ts"] },
  ];
  const { commits: parsed, error } = readGitLog({ spawnImpl: fakeSpawn(buildGitOutput(commits)) });
  assert.equal(error, null);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].sha, "abc123");
  assert.equal(parsed[0].author, "alice");
  assert.deepEqual(parsed[0].files, ["src/a.ts", "src/b.ts"]);
});

// ---------------------------------------------------------------------------
// 2. Multiple commits with files
// ---------------------------------------------------------------------------
test("readGitLog: multiple commits parsed correctly", () => {
  const commits = [
    { sha: "sha1111", iso: "2026-05-24T10:00:00Z", author: "bob", subject: "fix: typo", files: ["README.md"] },
    { sha: "sha2222", iso: "2026-05-24T11:00:00Z", author: "carol", subject: "chore: lint", files: ["eslint.config.js", "tsconfig.json"] },
    { sha: "sha3333", iso: "2026-05-24T12:00:00Z", author: "dave", subject: "feat: new engine", files: ["src/engines/FooEngine.ts"] },
  ];
  const { commits: parsed, error } = readGitLog({ spawnImpl: fakeSpawn(buildGitOutput(commits)) });
  assert.equal(error, null);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].sha, "sha1111");
  assert.equal(parsed[1].sha, "sha2222");
  assert.equal(parsed[2].files[0], "src/engines/FooEngine.ts");
});

// ---------------------------------------------------------------------------
// 3. Commit with no files (e.g. merge commit)
// ---------------------------------------------------------------------------
test("readGitLog: commit with no files produces empty files array", () => {
  const commits = [
    { sha: "merge01", iso: "2026-05-24T09:00:00Z", author: "eve", subject: "Merge branch main", files: [] },
  ];
  const { commits: parsed, error } = readGitLog({ spawnImpl: fakeSpawn(buildGitOutput(commits)) });
  assert.equal(error, null);
  assert.equal(parsed.length, 1);
  assert.deepEqual(parsed[0].files, []);
});

// ---------------------------------------------------------------------------
// 4. git exits non-zero → returns error
// ---------------------------------------------------------------------------
test("readGitLog: git error returns error string", () => {
  const { commits, error } = readGitLog({
    spawnImpl: fakeSpawn("", 128, "fatal: not a git repo"),
  });
  assert.equal(commits.length, 0);
  assert.match(error, /fatal: not a git repo/);
});

// ---------------------------------------------------------------------------
// 5. Empty stdout (no commits in window)
// ---------------------------------------------------------------------------
test("readGitLog: empty stdout returns zero commits", () => {
  const { commits, error } = readGitLog({ spawnImpl: fakeSpawn("") });
  assert.equal(error, null);
  assert.equal(commits.length, 0);
});

// ---------------------------------------------------------------------------
// 6. commitToEpisode: entities capped at 30
// ---------------------------------------------------------------------------
test("commitToEpisode: files capped at 30 entities", () => {
  const files = Array.from({ length: 50 }, (_, i) => `src/file${i}.ts`);
  const commit = { sha: "bigsha", iso: "2026-05-24T00:00:00Z", author: "x", subject: "big commit", files };
  const ep = commitToEpisode(commit);
  assert.equal(ep.entities.length, 30);
  assert.equal(ep.source, "git-commit");
  assert.equal(ep.source_id, "bigsha");
  assert.equal(ep.metadata.file_count, 50);
});

// ---------------------------------------------------------------------------
// 7. extractSlot via commitToEpisode: [MAIN] and [SCOPE-MS0] markers
// ---------------------------------------------------------------------------
test("commitToEpisode: slot extracted from [MAIN] subject prefix", () => {
  const commit = { sha: "s1", iso: "2026-05-24T00:00:00Z", author: "x", subject: "[MAIN] [SCOPE]/U-01: fix stuff", files: [] };
  const ep = commitToEpisode(commit);
  assert.equal(ep.metadata.slot, "MAIN");
});

test("commitToEpisode: slot is null for plain subject", () => {
  const commit = { sha: "s2", iso: "2026-05-24T00:00:00Z", author: "x", subject: "plain commit message", files: [] };
  const ep = commitToEpisode(commit);
  assert.equal(ep.metadata.slot, null);
});

// ---------------------------------------------------------------------------
// 8. seedFromGit: idempotency — second call skips already-ingested SHAs
// ---------------------------------------------------------------------------
test("seedFromGit: idempotent — duplicate SHAs are skipped", () => {
  const tmpFile = join(tmpdir(), `ep-seed-idem-test-${Date.now()}.jsonl`);
  try {
    const commits = [
      { sha: "idem01", iso: "2026-05-24T00:00:00Z", author: "x", subject: "first commit", files: ["a.ts"] },
      { sha: "idem02", iso: "2026-05-24T01:00:00Z", author: "x", subject: "second commit", files: ["b.ts"] },
    ];
    const spawn = fakeSpawn(buildGitOutput(commits));

    const r1 = seedFromGit({ storePath: tmpFile, spawnImpl: spawn });
    assert.equal(r1.ingested, 2);
    assert.equal(r1.skipped, 0);

    const r2 = seedFromGit({ storePath: tmpFile, spawnImpl: spawn });
    assert.equal(r2.ingested, 0);
    assert.equal(r2.skipped, 2);
  } finally {
    if (existsSync(tmpFile)) unlinkSync(tmpFile);
  }
});

// ---------------------------------------------------------------------------
// 9. seedFromGit: dry-run does not write to disk
// ---------------------------------------------------------------------------
test("seedFromGit: dry-run writes nothing", () => {
  const tmpFile = join(tmpdir(), `ep-seed-dry-test-${Date.now()}.jsonl`);
  try {
    const commits = [
      { sha: "dry01", iso: "2026-05-24T00:00:00Z", author: "x", subject: "dry commit", files: ["x.ts"] },
    ];
    const r = seedFromGit({ storePath: tmpFile, dryRun: true, spawnImpl: fakeSpawn(buildGitOutput(commits)) });
    assert.equal(r.ingested, 1);
    assert.equal(existsSync(tmpFile), false, "dry-run must not create the store file");
  } finally {
    if (existsSync(tmpFile)) unlinkSync(tmpFile);
  }
});

// ---------------------------------------------------------------------------
// 10. readGitLog: subject containing \x1f-like pipe chars in file paths (robustness)
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Iter-23: --all flag forwards `git log --all` for cross-branch capture.
//          Verified by spying on the spawn args (no actual git invocation).
// ---------------------------------------------------------------------------
test("readGitLog: --all flag inserts --all after `log` subcommand", () => {
  let capturedArgs = null;
  const spawn = (_cmd, args) => { capturedArgs = args; return { status: 0, stdout: "", stderr: "" }; };
  readGitLog({ all: true, spawnImpl: spawn });
  // args: ["-C", repo, "log", "--all", "--since", ...] — --all sits right after "log"
  const logIdx = capturedArgs.indexOf("log");
  assert.ok(logIdx >= 0, "log subcommand present");
  assert.equal(capturedArgs[logIdx + 1], "--all", "--all immediately follows log");
});

test("readGitLog: --all absent by default", () => {
  let capturedArgs = null;
  const spawn = (_cmd, args) => { capturedArgs = args; return { status: 0, stdout: "", stderr: "" }; };
  readGitLog({ spawnImpl: spawn });
  assert.equal(capturedArgs.includes("--all"), false);
});

// ---------------------------------------------------------------------------
// Iter-23: --no-files flag skips --name-only so ingest survives corrupt
//          tree objects that fatal --name-only at fsck.
// ---------------------------------------------------------------------------
test("readGitLog: --no-files omits --name-only flag", () => {
  let capturedArgs = null;
  const spawn = (_cmd, args) => { capturedArgs = args; return { status: 0, stdout: "", stderr: "" }; };
  readGitLog({ noFiles: true, spawnImpl: spawn });
  assert.equal(capturedArgs.includes("--name-only"), false);
});

test("readGitLog: --name-only present by default", () => {
  let capturedArgs = null;
  const spawn = (_cmd, args) => { capturedArgs = args; return { status: 0, stdout: "", stderr: "" }; };
  readGitLog({ spawnImpl: spawn });
  assert.equal(capturedArgs.includes("--name-only"), true);
});

// ---------------------------------------------------------------------------
// Iter-23: format string ends with RECSEP \x1e — verify by inspecting
//          the --pretty=format: arg that gets passed to git.
// ---------------------------------------------------------------------------
test("readGitLog: pretty-format ends with RECSEP", () => {
  let capturedArgs = null;
  const spawn = (_cmd, args) => { capturedArgs = args; return { status: 0, stdout: "", stderr: "" }; };
  readGitLog({ spawnImpl: spawn });
  const prettyArg = capturedArgs.find((a) => typeof a === "string" && a.startsWith("--pretty=format:"));
  assert.ok(prettyArg, "pretty-format arg present");
  assert.equal(prettyArg.endsWith("\x1e"), true, "format string ends with RECSEP");
});

// ---------------------------------------------------------------------------
// Iter-23: RECSEP parser handles no-files mode (only field-rows separated
//          by RECSEP, no inline newlines from file lists).
// ---------------------------------------------------------------------------
test("readGitLog: parser handles no-files mode (RECSEP-only fixture)", () => {
  const SEP = "\x1f";
  const RECSEP = "\x1e";
  const fixture = ["sha-a", "2026-05-25T00:00:00Z", "alice", "first"].join(SEP) + RECSEP
                + ["sha-b", "2026-05-25T01:00:00Z", "bob", "second"].join(SEP) + RECSEP;
  const { commits, error } = readGitLog({ spawnImpl: fakeSpawn(fixture) });
  assert.equal(error, null);
  assert.equal(commits.length, 2);
  assert.equal(commits[0].sha, "sha-a");
  assert.equal(commits[1].sha, "sha-b");
  assert.deepEqual(commits[0].files, []);
});

test("readGitLog: files with spaces/special chars parsed correctly", () => {
  // git --name-only puts one file per line; spaces in filenames are preserved
  const raw = "deadbeef\x1f2026-05-24T00:00:00Z\x1falice\x1ffix: patch\npath with spaces/file.ts\nnormal.ts";
  const { commits, error } = readGitLog({ spawnImpl: fakeSpawn(raw) });
  assert.equal(error, null);
  assert.equal(commits.length, 1);
  assert.deepEqual(commits[0].files, ["path with spaces/file.ts", "normal.ts"]);
});
