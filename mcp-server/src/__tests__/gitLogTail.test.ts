/**
 * gitLogTail.test.ts — tests for .claude/helpers/git-log-tail.mjs (U-CLEANUP-B3)
 *
 * Coverage (per comprehensive-build-enforce floor):
 *   - Happy path: commits since cutoff returned with concrete field shapes
 *   - Empty: future cutoff → []; empty repo → []
 *   - Multi-file commit: exact file array contents asserted
 *   - Author-filter (golf self-attribution prep for G7)
 *   - UTC discipline: isoDate ends with Z (R2-UU4)
 *   - Schema versioning: saveLastPollIso wraps in JSON with schemaVersion === 1
 *   - load/save round-trip
 *   - Bad input (missing sinceIso, non-git repo)
 *   - Adversarial: subjects with pipes/quotes/colons/unicode survive NUL parse
 *   - Adversarial: malformed JSON in state file → null (graceful)
 *   - Variability: rename, deep-nested, empty-commit configs
 *
 * Tests use the REAL git binary against per-case sandboxed repos.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// @ts-expect-error: .mjs ESM import from .ts test file
import { tail, loadLastPollIso, saveLastPollIso } from "../../../.claude/helpers/git-log-tail.mjs";

const SANDBOX_PREFIX = "prism-gitlogtail-test-";

// Resolve git binary the same way the helper does — vitest spawn PATH may be sparse on Windows.
const GIT_BIN = (() => {
  if (process.env.PRISM_GIT_BIN && existsSync(process.env.PRISM_GIT_BIN)) return process.env.PRISM_GIT_BIN;
  const winDefault = "C:/Program Files/Git/mingw64/bin/git.exe";
  if (existsSync(winDefault)) return winDefault;
  return "git";
})();

interface Commit {
  sha: string;
  author: string;
  isoDate: string;
  subject: string;
  files: string[];
}

interface TailResult {
  commits: Commit[];
  error?: string;
  lockRelated?: boolean;
}

type TailFn = (opts: { sinceIso: string; repoRoot?: string; excludeAuthors?: string[]; gitBin?: string }) => TailResult;
type LoadFn = (path?: string) => string | null;
type SaveFn = (iso: string, path?: string) => void;

const tailTyped = tail as TailFn;
const loadLastPollIsoTyped = loadLastPollIso as LoadFn;
const saveLastPollIsoTyped = saveLastPollIso as SaveFn;

function gitInitRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), SANDBOX_PREFIX));
  execFileSync(GIT_BIN, ["init", "-q"], { cwd: dir, encoding: "utf-8" });
  execFileSync(GIT_BIN, ["config", "user.email", "test@prism.local"], { cwd: dir });
  execFileSync(GIT_BIN, ["config", "user.name", "test-author"], { cwd: dir });
  execFileSync(GIT_BIN, ["config", "commit.gpgsign", "false"], { cwd: dir });
  return dir;
}

function gitCommitFile(repoRoot: string, relPath: string, content: string, subject: string, authorOverride?: { name: string; email: string }): void {
  const full = join(repoRoot, relPath);
  const dir = join(repoRoot, relPath.split("/").slice(0, -1).join("/"));
  if (dir !== repoRoot) mkdirSync(dir, { recursive: true });
  writeFileSync(full, content);
  execFileSync(GIT_BIN, ["add", relPath], { cwd: repoRoot });
  if (authorOverride) {
    execFileSync(
      GIT_BIN,
      ["-c", `user.name=${authorOverride.name}`, "-c", `user.email=${authorOverride.email}`, "commit", "-m", subject, "-q"],
      { cwd: repoRoot }
    );
  } else {
    execFileSync(GIT_BIN, ["commit", "-m", subject, "-q"], { cwd: repoRoot });
  }
}

function gitCommitMulti(repoRoot: string, fileMap: Record<string, string>, subject: string): void {
  for (const [rel, content] of Object.entries(fileMap)) {
    const full = join(repoRoot, rel);
    const dir = join(repoRoot, rel.split("/").slice(0, -1).join("/"));
    if (dir !== repoRoot) mkdirSync(dir, { recursive: true });
    writeFileSync(full, content);
    execFileSync(GIT_BIN, ["add", rel], { cwd: repoRoot });
  }
  execFileSync(GIT_BIN, ["commit", "-m", subject, "-q"], { cwd: repoRoot });
}

// Slow on Windows under fleet load: every test triggers 4-N git invocations
// (init + config + commit + log). Default 30s vitest timeouts trip under
// concurrent /loop work — observed variance: same test 37s then 60s+ across
// runs. Bump to 120s so the fleet's background load can't flake otherwise-
// correct tests.
const SLOW_TEST_TIMEOUT_MS = 120_000;
vi.setConfig({ testTimeout: SLOW_TEST_TIMEOUT_MS, hookTimeout: SLOW_TEST_TIMEOUT_MS });

describe("git-log-tail.mjs — U-CLEANUP-B3", () => {
  let sandbox: string;
  let lastPollFile: string;

  beforeEach(() => {
    sandbox = gitInitRepo();
    lastPollFile = join(sandbox, ".watchdog-last-poll.iso");
  }, SLOW_TEST_TIMEOUT_MS);

  afterEach(() => {
    try { rmSync(sandbox, { recursive: true, force: true }); } catch { /* best-effort */ }
  });

  // ─── Happy path ────────────────────────────────────────────────────────

  it("happy path: returns commit with sha=40-hex, author, ISO-Z, subject, files[]", () => {
    gitCommitFile(sandbox, "foo.txt", "hello", "first commit");
    const since = new Date(Date.now() - 60_000).toISOString();
    const r = tailTyped({ sinceIso: since, repoRoot: sandbox, gitBin: GIT_BIN });
    expect(r.error).toBe(undefined);
    expect(r.commits.length).toBe(1);
    const c = r.commits[0];
    expect(c.sha).toMatch(/^[0-9a-f]{40}$/);
    expect(c.sha.length).toBe(40);
    expect(c.author).toBe("test-author");
    expect(c.isoDate.endsWith("Z")).toBe(true);
    expect(c.subject).toBe("first commit");
    expect(c.files).toEqual(["foo.txt"]);
  });

  it("returns 3 commits newest-first when 3 commits made", () => {
    gitCommitFile(sandbox, "a.txt", "1", "A first");
    gitCommitFile(sandbox, "b.txt", "2", "B second");
    gitCommitFile(sandbox, "c.txt", "3", "C third");
    const since = new Date(Date.now() - 60_000).toISOString();
    const r = tailTyped({ sinceIso: since, repoRoot: sandbox, gitBin: GIT_BIN });
    expect(r.commits.length).toBe(3);
    expect(r.commits[0].subject).toBe("C third");
    expect(r.commits[1].subject).toBe("B second");
    expect(r.commits[2].subject).toBe("A first");
  });

  // ─── Empty / boundary ──────────────────────────────────────────────────

  it("future --since cutoff returns empty array, no error", () => {
    gitCommitFile(sandbox, "foo.txt", "x", "commit");
    const future = new Date(Date.now() + 60_000).toISOString();
    const r = tailTyped({ sinceIso: future, repoRoot: sandbox, gitBin: GIT_BIN });
    expect(r.error).toBe(undefined);
    expect(r.commits).toEqual([]);
    expect(r.commits.length).toBe(0);
  });

  it("empty repo (no commits at all) returns commits=[]", () => {
    const since = new Date(Date.now() - 60_000).toISOString();
    const r = tailTyped({ sinceIso: since, repoRoot: sandbox, gitBin: GIT_BIN });
    expect(r.error).toBe(undefined);
    expect(r.commits).toEqual([]);
  });

  // ─── Multi-file ────────────────────────────────────────────────────────

  it("multi-file commit: all 3 changed files exist in `files` array (sorted)", () => {
    gitCommitMulti(sandbox, {
      "a.txt": "1",
      "sub/b.txt": "2",
      "deep/nested/c.txt": "3",
    }, "multi-file commit");
    const since = new Date(Date.now() - 60_000).toISOString();
    const r = tailTyped({ sinceIso: since, repoRoot: sandbox, gitBin: GIT_BIN });
    expect(r.commits.length).toBe(1);
    const files = r.commits[0].files.sort();
    expect(files).toEqual(["a.txt", "deep/nested/c.txt", "sub/b.txt"]);
  });

  // ─── Author filter (G7 prep) ───────────────────────────────────────────

  it("excludeAuthors filters out golf-watchdog-bot commit, keeps human commit", () => {
    gitCommitFile(sandbox, "real.txt", "x", "real work");
    gitCommitFile(sandbox, "bot.txt", "y", "golf bot commit", {
      name: "golf-watchdog-bot",
      email: "golf@prism.local",
    });
    const since = new Date(Date.now() - 60_000).toISOString();
    const r = tailTyped({
      sinceIso: since,
      repoRoot: sandbox,
      excludeAuthors: ["golf-watchdog-bot"],
      gitBin: GIT_BIN,
    });
    expect(r.commits.length).toBe(1);
    expect(r.commits[0].author).toBe("test-author");
    expect(r.commits[0].subject).toBe("real work");
  });

  it("excludeAuthors with 2 bot names filters both, keeps 1 human", () => {
    gitCommitFile(sandbox, "h.txt", "x", "human");
    gitCommitFile(sandbox, "b1.txt", "y", "bot 1", { name: "bot-1", email: "b1@x" });
    gitCommitFile(sandbox, "b2.txt", "z", "bot 2", { name: "bot-2", email: "b2@x" });
    const since = new Date(Date.now() - 60_000).toISOString();
    const r = tailTyped({
      sinceIso: since,
      repoRoot: sandbox,
      excludeAuthors: ["bot-1", "bot-2"],
      gitBin: GIT_BIN,
    });
    expect(r.commits.length).toBe(1);
    expect(r.commits[0].author).toBe("test-author");
  });

  // ─── UTC discipline (R2-UU4) ───────────────────────────────────────────

  it("isoDate is UTC-Z (round-trips to itself); never has +HH:MM or -HH:MM offset", () => {
    gitCommitFile(sandbox, "tz.txt", "x", "tz check");
    const since = new Date(Date.now() - 60_000).toISOString();
    const r = tailTyped({ sinceIso: since, repoRoot: sandbox, gitBin: GIT_BIN });
    const iso = r.commits[0].isoDate;
    expect(iso.endsWith("Z")).toBe(true);
    expect(iso.includes("+")).toBe(false);
    expect(/-\d\d:\d\d$/.test(iso)).toBe(false);
    expect(new Date(iso).toISOString()).toBe(iso);
  });

  // ─── Adversarial: tricky subjects ──────────────────────────────────────

  it("adversarial: pipe/colon/quote in subject parses correctly via NUL boundaries", () => {
    const tricky = 'subject with | pipe and "quotes" and : colons';
    gitCommitFile(sandbox, "x.txt", "x", tricky);
    const since = new Date(Date.now() - 60_000).toISOString();
    const r = tailTyped({ sinceIso: since, repoRoot: sandbox, gitBin: GIT_BIN });
    expect(r.commits.length).toBe(1);
    expect(r.commits[0].subject).toBe(tricky);
  });

  it("adversarial: unicode emoji + CJK in subject preserved byte-for-byte", () => {
    const unicode = "🚀 unicode 中文 subject";
    gitCommitFile(sandbox, "u.txt", "x", unicode);
    const since = new Date(Date.now() - 60_000).toISOString();
    const r = tailTyped({ sinceIso: since, repoRoot: sandbox, gitBin: GIT_BIN });
    expect(r.commits.length).toBe(1);
    expect(r.commits[0].subject).toBe(unicode);
  });

  // ─── Bad input ─────────────────────────────────────────────────────────

  it("missing sinceIso returns commits=[] AND error string mentioning sinceIso", () => {
    const r = tailTyped({ sinceIso: "" as unknown as string, repoRoot: sandbox, gitBin: GIT_BIN });
    expect(r.commits).toEqual([]);
    expect(typeof r.error).toBe("string");
    expect(r.error?.toLowerCase().includes("sinceiso")).toBe(true);
  });

  it("invalid repoRoot (non-git dir) returns commits=[] AND non-empty error string", () => {
    const nonRepoDir = mkdtempSync(join(tmpdir(), SANDBOX_PREFIX + "non-repo-"));
    try {
      const since = new Date(Date.now() - 60_000).toISOString();
      const r = tailTyped({ sinceIso: since, repoRoot: nonRepoDir, gitBin: GIT_BIN });
      expect(r.commits).toEqual([]);
      expect(typeof r.error).toBe("string");
      expect(r.error?.length ?? 0).toBeGreaterThan(0);
      // Must explicitly mention "not a git repository" so callers can branch on it.
      expect(r.error?.toLowerCase()).toMatch(/not a git repository|no \.git/);
    } finally {
      try { rmSync(nonRepoDir, { recursive: true, force: true }); } catch { /* ok */ }
    }
  });

  // ─── State file (loadLastPollIso / saveLastPollIso) ────────────────────

  it("saveLastPollIso writes JSON with schemaVersion === 1, sinceIso match, savedAt UTC-Z", () => {
    const iso = new Date().toISOString();
    saveLastPollIsoTyped(iso, lastPollFile);
    expect(existsSync(lastPollFile)).toBe(true);
    const raw = readFileSync(lastPollFile, "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.sinceIso).toBe(iso);
    expect(parsed.savedAt.endsWith("Z")).toBe(true);
  });

  it("loadLastPollIso round-trips with saveLastPollIso (identical iso string)", () => {
    const iso = new Date().toISOString();
    saveLastPollIsoTyped(iso, lastPollFile);
    expect(loadLastPollIsoTyped(lastPollFile)).toBe(iso);
  });

  it("loadLastPollIso on missing file returns null", () => {
    const missing = join(sandbox, "definitely-does-not-exist.iso");
    expect(loadLastPollIsoTyped(missing)).toBe(null);
  });

  it("loadLastPollIso on malformed JSON returns null (graceful)", () => {
    writeFileSync(lastPollFile, "{ this is not valid json !!!");
    expect(loadLastPollIsoTyped(lastPollFile)).toBe(null);
  });

  it("loadLastPollIso tolerates missing schemaVersion field (v0 → v1 forward-compat)", () => {
    writeFileSync(lastPollFile, JSON.stringify({ sinceIso: "2026-05-13T12:00:00.000Z" }));
    expect(loadLastPollIsoTyped(lastPollFile)).toBe("2026-05-13T12:00:00.000Z");
  });

  // ─── Variability (3 spanning configs) ──────────────────────────────────

  it("variability: git mv rename — rename commit subject is captured", () => {
    gitCommitFile(sandbox, "old-name.txt", "content", "initial");
    execFileSync(GIT_BIN, ["mv", "old-name.txt", "new-name.txt"], { cwd: sandbox });
    execFileSync(GIT_BIN, ["commit", "-m", "rename", "-q"], { cwd: sandbox });
    const since = new Date(Date.now() - 60_000).toISOString();
    const r = tailTyped({ sinceIso: since, repoRoot: sandbox, gitBin: GIT_BIN });
    const renameCommit = r.commits.find((c) => c.subject === "rename");
    // Concrete assertions on the rename commit (no toBeDefined-only forms).
    expect(typeof renameCommit?.sha).toBe("string");
    expect(/^[0-9a-f]{40}$/i.test(renameCommit?.sha ?? "")).toBe(true);
    expect(renameCommit?.subject).toBe("rename");
    expect(renameCommit?.author).toBe("test-author");
    expect(renameCommit?.isoDate?.endsWith("Z") ?? false).toBe(true);
    expect(renameCommit?.files.length ?? 0).toBeGreaterThanOrEqual(1);
    // Git's --name-only on a rename emits the new path (at least); old-name.txt
    // is also acceptable on some git versions, so assert at least one is present.
    const fileSet = new Set(renameCommit?.files ?? []);
    expect(fileSet.has("new-name.txt") || fileSet.has("old-name.txt")).toBe(true);
  });

  it("variability: deep-nested paths with state/shared/dashboards/ form survive parsing", () => {
    gitCommitMulti(sandbox, {
      "a/b/c/d/very-deep.txt": "x",
      "state/shared/dashboards/CLEANUP-MS0-WIRING-CANDIDATES.md": "y",
    }, "deep paths");
    const since = new Date(Date.now() - 60_000).toISOString();
    const r = tailTyped({ sinceIso: since, repoRoot: sandbox, gitBin: GIT_BIN });
    expect(r.commits.length).toBe(1);
    const files = r.commits[0].files.sort();
    expect(files.includes("a/b/c/d/very-deep.txt")).toBe(true);
    expect(files.includes("state/shared/dashboards/CLEANUP-MS0-WIRING-CANDIDATES.md")).toBe(true);
  });

  it("variability: empty commit (--allow-empty) has files=[] without crash", () => {
    execFileSync(GIT_BIN, ["commit", "--allow-empty", "-m", "empty marker", "-q"], { cwd: sandbox });
    const since = new Date(Date.now() - 60_000).toISOString();
    const r = tailTyped({ sinceIso: since, repoRoot: sandbox, gitBin: GIT_BIN });
    expect(r.commits.length).toBe(1);
    expect(r.commits[0].subject).toBe("empty marker");
    expect(Array.isArray(r.commits[0].files)).toBe(true);
    expect(r.commits[0].files.length).toBe(0);
  });

  // ─── Adversarial: 0x1F injection in author/subject ─────────────────────
  //
  // A malicious peer commit with `git config user.name $'evil\x1Finjected'` could
  // shift parsing if the helper naively destructures the first 4 0x1F-split
  // fields. parseLog re-joins trailing parts onto subject so files[] can't be
  // hijacked by author-name injection. This test verifies that contract.

  it("adversarial: subject containing literal 0x1F survives parsing without hijacking files", () => {
    // Subject with a literal 0x1F byte — git allows this via -m.
    const malSubject = "evilinjectedmore";
    gitCommitFile(sandbox, "a.txt", "x", malSubject);
    const since = new Date(Date.now() - 60_000).toISOString();
    const r = tailTyped({ sinceIso: since, repoRoot: sandbox, gitBin: GIT_BIN });
    expect(r.commits.length).toBe(1);
    const c = r.commits[0];
    // Files must NOT contain a fragment of the injected subject.
    expect(c.files).toEqual(["a.txt"]);
    expect(c.files.includes("injected")).toBe(false);
    expect(c.files.includes("more")).toBe(false);
    // Subject preserves the malicious bytes intact (re-joined on 0x1F) so
    // downstream auditors can flag it.
    expect(c.subject.includes("evil")).toBe(true);
    expect(c.subject.includes("injected")).toBe(true);
    expect(c.subject.includes("more")).toBe(true);
    // Sha + author shape is preserved.
    expect(/^[0-9a-f]{40}$/i.test(c.sha)).toBe(true);
    expect(c.author).toBe("test-author");
  });
});
