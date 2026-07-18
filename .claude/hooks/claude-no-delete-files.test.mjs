// claude-no-delete-files.test.mjs — pure-core unit + main() subprocess oracle.
// Run: node --test H:/prism/.claude/hooks/claude-no-delete-files.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DESTRUCTIVE_PATTERNS,
  NARROW_EXCEPTIONS,
  commandHasException,
  findFirstDestructive,
  decide,
  logBypass,
} from "./claude-no-delete-files.mjs";

const HOOK = "H:/prism/.claude/hooks/claude-no-delete-files.mjs";
const NODE = process.execPath;
const HOOK_TIMEOUT_MS = 5000; // subprocess oracle ceiling — covers cold node start

function runHook(stdinJson, env = {}) {
  const r = spawnSync(NODE, [HOOK], {
    input: JSON.stringify(stdinJson),
    env: { ...process.env, ...env },
    encoding: "utf8",
    timeout: HOOK_TIMEOUT_MS,
  });
  return { stdout: (r.stdout || "").trim(), stderr: (r.stderr || "").trim(), status: r.status };
}

// ── Pure decide() ──

test("decide: non-Bash tool passes through", () => {
  const r = decide({ tool_name: "Read", tool_input: { file_path: "/foo" } });
  assert.equal(r.action, "continue");
});

test("decide: empty Bash command passes through", () => {
  const r = decide({ tool_name: "Bash", tool_input: { command: "" } });
  assert.equal(r.action, "continue");
});

test("decide: benign Bash command passes through", () => {
  const r = decide({ tool_name: "Bash", tool_input: { command: "ls -la H:/prism" } });
  assert.equal(r.action, "continue");
});

test("decide: rm -rf BLOCKS", () => {
  const r = decide({ tool_name: "Bash", tool_input: { command: "rm -rf H:/prism/important.ts" } });
  assert.equal(r.action, "block");
  assert.equal(r.matched, "rm");
});

test("decide: rm with no flags BLOCKS", () => {
  const r = decide({ tool_name: "Bash", tool_input: { command: "rm somefile.txt" } });
  assert.equal(r.action, "block");
  assert.equal(r.matched, "rm");
});

test("decide: Remove-Item BLOCKS (case-insensitive)", () => {
  const r = decide({ tool_name: "Bash", tool_input: { command: "Remove-Item -Force file.ts" } });
  assert.equal(r.action, "block");
  assert.equal(r.matched, "remove-item");
});

test("decide: del /q /s BLOCKS", () => {
  const r = decide({ tool_name: "Bash", tool_input: { command: "del /q /s files.txt" } });
  assert.equal(r.action, "block");
  assert.equal(r.matched, "del-windows");
});

test("decide: git rm BLOCKS", () => {
  const r = decide({ tool_name: "Bash", tool_input: { command: "git rm src/file.ts" } });
  assert.equal(r.action, "block");
  assert.equal(r.matched, "git-rm");
});

test("decide: truncate BLOCKS", () => {
  const r = decide({ tool_name: "Bash", tool_input: { command: "truncate -s 0 logfile.log" } });
  assert.equal(r.action, "block");
  assert.equal(r.matched, "truncate");
});

test("decide: fs.unlinkSync BLOCKS", () => {
  const r = decide({ tool_name: "Bash", tool_input: { command: "node -e \"require('fs').unlinkSync('x.txt')\"" } });
  assert.equal(r.action, "block");
  assert.equal(r.matched, "fs-unlink-js");
});

test("decide: fs.rmSync BLOCKS", () => {
  const r = decide({ tool_name: "Bash", tool_input: { command: "node -e \"fs.rmSync('a', {recursive:true})\"" } });
  assert.equal(r.action, "block");
  assert.equal(r.matched, "fs-rm-js");
});

test("decide: shutil.rmtree BLOCKS", () => {
  const r = decide({ tool_name: "Bash", tool_input: { command: "python -c \"import shutil; shutil.rmtree('foo')\"" } });
  assert.equal(r.action, "block");
  assert.equal(r.matched, "shutil-rmtree-py");
});

test("decide: silent-truncate redirect > file BLOCKS", () => {
  const r = decide({ tool_name: "Bash", tool_input: { command: "> some_existing_file.json" } });
  assert.equal(r.action, "block");
  assert.equal(r.matched, "truncate-redirect");
});

test("decide: APPEND redirect (>>) does NOT block", () => {
  const r = decide({ tool_name: "Bash", tool_input: { command: "echo hello >> log.txt" } });
  assert.equal(r.action, "continue");
});

test("decide: stderr-to-stdout redirect (2>&1) does NOT block", () => {
  const r = decide({ tool_name: "Bash", tool_input: { command: "node script.mjs 2>&1" } });
  assert.equal(r.action, "continue");
});

test("decide: rm of *.tmp.PID is an EXCEPTION (atomic-write tmp)", () => {
  const r = decide({ tool_name: "Bash", tool_input: { command: "rm H:/prism/state.json.tmp.12345" } });
  assert.equal(r.action, "continue");
  assert.equal(r.exception, true);
});

test("decide: rm of .lock file is an EXCEPTION", () => {
  const r = decide({ tool_name: "Bash", tool_input: { command: "rm H:/prism/.git/index.lock" } });
  assert.equal(r.action, "continue");
  assert.equal(r.exception, true);
});

test("decide: rm of /tmp/foo is an EXCEPTION", () => {
  const r = decide({ tool_name: "Bash", tool_input: { command: "rm /tmp/scratch.txt" } });
  assert.equal(r.action, "continue");
  assert.equal(r.exception, true);
});

test("decide: rm of node_modules is an EXCEPTION", () => {
  const r = decide({ tool_name: "Bash", tool_input: { command: "rm -rf node_modules" } });
  assert.equal(r.action, "continue");
  assert.equal(r.exception, true);
});

test("decide: PRISM_CLAUDE_DELETE_OK=1 environment turns block into bypass", () => {
  const r = decide(
    { tool_name: "Bash", tool_input: { command: "rm H:/prism/critical.ts" } },
    { PRISM_CLAUDE_DELETE_OK: "1" }
  );
  assert.equal(r.action, "bypass");
  assert.equal(r.matched, "rm");
});

test("decide: PRISM_CLAUDE_DELETE_OK=0 does NOT turn block into bypass", () => {
  const r = decide(
    { tool_name: "Bash", tool_input: { command: "rm H:/prism/critical.ts" } },
    { PRISM_CLAUDE_DELETE_OK: "0" }
  );
  assert.equal(r.action, "block");
});

// ── findFirstDestructive ──

test("findFirstDestructive: returns null on benign", () => {
  assert.equal(findFirstDestructive("cd /tmp && ls"), null);
  assert.equal(findFirstDestructive(""), null);
  assert.equal(findFirstDestructive(null), null);
});

test("findFirstDestructive: rm -rf hits the rm rule", () => {
  const r = findFirstDestructive("rm -rf x");
  assert.equal(r.id, "rm");
});

// ── commandHasException ──

test("commandHasException: false on empty", () => {
  assert.equal(commandHasException(""), false);
  assert.equal(commandHasException(null), false);
});

test("commandHasException: catches .tmp.PID", () => {
  assert.equal(commandHasException("rm foo.tmp.12345"), true);
});

test("commandHasException: catches /tmp/<x>", () => {
  assert.equal(commandHasException("rm /tmp/scratch"), true);
});

// ── logBypass (real fs round-trip) ──

test("logBypass: appends a JSONL line", () => {
  const dir = join(tmpdir(), `prism-no-delete-test-${process.pid}-${Date.now()}`);
  const auditPath = join(dir, "bypass.jsonl");
  mkdirSync(dir, { recursive: true });
  try {
    const ok = logBypass(auditPath, "rm important.ts", { USERNAME: "tester" });
    assert.equal(ok, true);
    const body = readFileSync(auditPath, "utf8");
    assert.match(body, /"command":"rm important\.ts"/);
    assert.match(body, /"user":"tester"/);
    assert.match(body, /"ts":"\d{4}-\d{2}-\d{2}T/);
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
});

// ── Constants present (drift guard) ──

test("DESTRUCTIVE_PATTERNS has all expected rule ids", () => {
  const ids = DESTRUCTIVE_PATTERNS.map((p) => p.id).sort();
  const expected = [
    "del-windows", "empty-to-file", "fs-rm-js", "fs-rmdir-js", "fs-unlink-js",
    "git-rm", "os-remove-py", "remove-item", "rm", "rmdir", "shred",
    "shutil-rmtree-py", "truncate", "truncate-redirect", "unlink-shell",
  ];
  assert.deepEqual(ids, expected);
});

test("NARROW_EXCEPTIONS array non-empty (regression guard)", () => {
  assert.ok(NARROW_EXCEPTIONS.length >= 5, "must have at least 5 exception patterns");
});

// ── main() subprocess oracle — full hook entry point ──

test("subprocess: non-Bash tool exits with continue:true", () => {
  const r = runHook({ tool_name: "Read", tool_input: { file_path: "x" } });
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
});

test("subprocess: rm -rf hits block decision in stdout JSON", () => {
  const r = runHook({ tool_name: "Bash", tool_input: { command: "rm -rf H:/prism/important.ts" } });
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.decision, "block");
  assert.match(out.reason, /BLOCKED/);
  assert.match(out.reason, /rm/);
});

test("subprocess: benign command passes", () => {
  const r = runHook({ tool_name: "Bash", tool_input: { command: "git status" } });
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
});

test("subprocess: empty stdin doesn't crash, returns continue", () => {
  const r = spawnSync(NODE, [HOOK], { input: "", encoding: "utf8", timeout: HOOK_TIMEOUT_MS });
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout.trim());
  assert.equal(out.continue, true);
});

test("subprocess: malformed JSON stdin doesn't crash, returns continue", () => {
  const r = spawnSync(NODE, [HOOK], { input: "{not valid json", encoding: "utf8", timeout: HOOK_TIMEOUT_MS });
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout.trim());
  assert.equal(out.continue, true);
});

// ── Drift-guard: rule precedence (more-specific BEFORE broader) ──

test("DESTRUCTIVE_PATTERNS: git-rm rule is positioned BEFORE rm rule (precedence-critical)", () => {
  const ids = DESTRUCTIVE_PATTERNS.map((p) => p.id);
  const gitRmIdx = ids.indexOf("git-rm");
  const rmIdx = ids.indexOf("rm");
  assert.ok(gitRmIdx >= 0, "git-rm rule must exist");
  assert.ok(rmIdx >= 0, "rm rule must exist");
  assert.ok(gitRmIdx < rmIdx, `git-rm (idx=${gitRmIdx}) must come before rm (idx=${rmIdx}) — broader rule must not preempt`);
});

test("subprocess: PRISM_CLAUDE_DELETE_OK=1 emits continue with bypass advisory", () => {
  const r = runHook(
    { tool_name: "Bash", tool_input: { command: "rm okfile.txt" } },
    { PRISM_CLAUDE_DELETE_OK: "1" }
  );
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  assert.match(out.hookSpecificOutput?.additionalContext || "", /bypass/);
});
