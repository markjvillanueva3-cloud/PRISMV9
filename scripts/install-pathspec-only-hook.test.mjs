/**
 * install-pathspec-only-hook.test.mjs — node:test suite for the installer.
 *
 * Stages a faux .git/hooks dir per test in os.tmpdir() — never touches the real
 * H:/prism/.git/hooks. Verifies install / chain / refresh / uninstall / restore.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { __internals } from "./install-pathspec-only-hook.mjs";

const { install, uninstall, isOwnedByUs, SENTINEL, renderHookBody, renderChainingHookBody } = __internals;

function makeFakeRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ppo-inst-"));
  fs.mkdirSync(path.join(root, ".git", "hooks"), { recursive: true });
  return root;
}

function readHook(root) {
  const p = path.join(root, ".git", "hooks", "pre-commit");
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf-8");
}

// ────────────────────────────────────────────────────────────────────────

test("renderHookBody: contains sentinel + guard path + portable-node fallback", () => {
  const body = renderHookBody("H:/prism");
  assert.match(body, new RegExp(SENTINEL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(body, /scripts\/pathspec-only-guard\.mjs/);
  assert.match(body, /portable-node/);
  assert.match(body, /command -v node/);
});

test("renderChainingHookBody: invokes prior backup, then guard", () => {
  const body = renderChainingHookBody("H:/prism", "pre-commit.bak.X");
  assert.match(body, /pre-commit\.bak\.X/);
  assert.match(body, /scripts\/pathspec-only-guard\.mjs/);
  // Prior runs FIRST (line order matters)
  const idxBackup = body.indexOf("pre-commit.bak.X");
  const idxGuard = body.indexOf("pathspec-only-guard.mjs");
  assert.ok(idxBackup < idxGuard, "backup invocation must precede guard");
});

test("isOwnedByUs: true when sentinel present", () => {
  assert.equal(isOwnedByUs(SENTINEL + "\n# more"), true);
});

test("isOwnedByUs: false for foreign body or empty/null", () => {
  assert.equal(isOwnedByUs("#!/usr/bin/env bash\necho foreign"), false);
  assert.equal(isOwnedByUs(""), false);
  assert.equal(isOwnedByUs(null), false);
  assert.equal(isOwnedByUs(undefined), false);
});

test("install: clean repo → writes new pre-commit + action=installed", () => {
  const repo = makeFakeRepo();
  try {
    const r = install({ repoRoot: repo });
    assert.equal(r.ok, true);
    assert.equal(r.action, "installed");
    const body = readHook(repo);
    assert.ok(isOwnedByUs(body));
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("install: idempotent — running twice on clean repo is noop on second run", () => {
  const repo = makeFakeRepo();
  try {
    install({ repoRoot: repo });
    const r2 = install({ repoRoot: repo });
    assert.equal(r2.ok, true);
    assert.equal(r2.action, "noop");
    assert.equal(r2.reason, "already-installed-current");
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("install: foreign pre-commit → backs up + chains (action=chained)", () => {
  const repo = makeFakeRepo();
  try {
    const foreign = "#!/usr/bin/env bash\necho foreign-hook\nexit 0\n";
    fs.writeFileSync(path.join(repo, ".git", "hooks", "pre-commit"), foreign, { mode: 0o755 });
    const r = install({ repoRoot: repo });
    assert.equal(r.ok, true);
    assert.equal(r.action, "chained");
    assert.match(r.backupName, /^pre-commit\.bak\./);
    // Backup file holds the foreign content
    const backupBody = fs.readFileSync(
      path.join(repo, ".git", "hooks", r.backupName),
      "utf-8"
    );
    assert.equal(backupBody, foreign);
    // The new pre-commit invokes BOTH the backup and the guard
    const body = readHook(repo);
    assert.match(body, /pre-commit\.bak\./);
    assert.match(body, /pathspec-only-guard\.mjs/);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("install --dry-run: clean repo → reports would-install, writes nothing", () => {
  const repo = makeFakeRepo();
  try {
    const r = install({ repoRoot: repo, dryRun: true });
    assert.equal(r.ok, true);
    assert.equal(r.action, "would-install");
    assert.equal(readHook(repo), null);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("install --dry-run: foreign hook → reports would-chain, writes nothing", () => {
  const repo = makeFakeRepo();
  try {
    fs.writeFileSync(path.join(repo, ".git", "hooks", "pre-commit"), "#!/usr/bin/env bash\necho foreign\n");
    const r = install({ repoRoot: repo, dryRun: true });
    assert.equal(r.ok, true);
    assert.equal(r.action, "would-chain");
    // Foreign hook untouched, no backup written
    assert.match(readHook(repo), /foreign/);
    const dirEntries = fs.readdirSync(path.join(repo, ".git", "hooks"));
    assert.equal(dirEntries.filter((n) => n.startsWith("pre-commit.bak.")).length, 0);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("install: refreshes own hook when body drifts (e.g. repoRoot changed)", () => {
  const repo = makeFakeRepo();
  try {
    // Plant an OWNED hook with stale guard path
    const stale = `#!/usr/bin/env bash\n${SENTINEL}\n# stale body\nexit 0\n`;
    fs.writeFileSync(path.join(repo, ".git", "hooks", "pre-commit"), stale, { mode: 0o755 });
    const r = install({ repoRoot: repo });
    assert.equal(r.ok, true);
    assert.equal(r.action, "refreshed");
    // New body matches renderHookBody(repo) — has the current guard path
    const body = readHook(repo);
    assert.match(body, /pathspec-only-guard\.mjs/);
    assert.equal(body.includes("# stale body"), false);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("install: missing .git/hooks → error (no crash)", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "ppo-inst-bare-"));
  try {
    const r = install({ repoRoot: repo });
    assert.equal(r.ok, false);
    assert.match(r.error, /\.git\/hooks not found/);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("uninstall: no hook → noop", () => {
  const repo = makeFakeRepo();
  try {
    const r = uninstall({ repoRoot: repo });
    assert.equal(r.ok, true);
    assert.equal(r.action, "noop");
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("uninstall: foreign hook (no sentinel) → error, hook untouched", () => {
  const repo = makeFakeRepo();
  try {
    fs.writeFileSync(path.join(repo, ".git", "hooks", "pre-commit"), "#!/usr/bin/env bash\necho foreign\n");
    const r = uninstall({ repoRoot: repo });
    assert.equal(r.ok, false);
    assert.match(r.error, /not owned/);
    // Foreign body untouched
    assert.match(readHook(repo), /foreign/);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("uninstall: owned, no backup → removes hook", () => {
  const repo = makeFakeRepo();
  try {
    install({ repoRoot: repo });
    const r = uninstall({ repoRoot: repo });
    assert.equal(r.ok, true);
    assert.equal(r.action, "removed");
    assert.equal(readHook(repo), null);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("uninstall: owned + backup present → restores newest backup", () => {
  const repo = makeFakeRepo();
  try {
    const foreign = "#!/usr/bin/env bash\necho old-foreign\n";
    fs.writeFileSync(path.join(repo, ".git", "hooks", "pre-commit"), foreign, { mode: 0o755 });
    const inst = install({ repoRoot: repo });
    assert.equal(inst.action, "chained");
    const r = uninstall({ repoRoot: repo });
    assert.equal(r.ok, true);
    assert.equal(r.action, "restored-backup");
    assert.equal(r.restored, inst.backupName);
    assert.equal(readHook(repo), foreign);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("install: chain → uninstall → reinstall round-trip preserves foreign body", () => {
  const repo = makeFakeRepo();
  try {
    const foreign = "#!/usr/bin/env bash\necho original-hook\nexit 0\n";
    fs.writeFileSync(path.join(repo, ".git", "hooks", "pre-commit"), foreign, { mode: 0o755 });
    install({ repoRoot: repo });
    uninstall({ repoRoot: repo });
    // After uninstall, the foreign body should be the active pre-commit
    assert.equal(readHook(repo), foreign);
    // Reinstalling chains again over the restored foreign
    const r = install({ repoRoot: repo });
    assert.equal(r.action, "chained");
    assert.match(readHook(repo), /pathspec-only-guard\.mjs/);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});
