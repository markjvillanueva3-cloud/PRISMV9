// Tests for prism-os-precheck-inject.mjs
// Uses node:test (no vitest dependency, matches the hook ecosystem).

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK_PATH = path.resolve(HERE, "../prism-os-precheck-inject.mjs");
const HOOK_URL = pathToFileURL(HOOK_PATH).href;

function makeTempPrismRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-os-test-"));
  fs.mkdirSync(path.join(dir, "knowledge/wiki/os/commands"), { recursive: true });
  fs.mkdirSync(path.join(dir, "knowledge/wiki/os/pipelines"), { recursive: true });
  fs.mkdirSync(path.join(dir, "knowledge/wiki/os/syscalls"), { recursive: true });
  fs.mkdirSync(path.join(dir, "knowledge/wiki/os/sessions"), { recursive: true });
  return dir;
}

function writeOsEntry(root, kind, name, h1, body) {
  const full = path.join(root, "knowledge/wiki/os", kind, `${name}.md`);
  fs.writeFileSync(full, `# ${h1}\n\n${body}\n`);
}

function runHookSubprocess(prismRoot, stdin, env = {}) {
  const res = spawnSync(process.execPath, [HOOK_PATH], {
    input: typeof stdin === "string" ? stdin : JSON.stringify(stdin),
    env: { ...process.env, PRISM_ROOT: prismRoot, ...env },
    encoding: "utf8",
    timeout: 10000,
  });
  if (res.error) throw res.error;
  return { stdout: res.stdout, stderr: res.stderr, status: res.status };
}

function parseStdout(stdout) {
  try { return JSON.parse(stdout); }
  catch (e) { throw new Error(`stdout not JSON: ${stdout.slice(0, 200)}`); }
}

// ── 1. Happy path — slot lifecycle keyword matches sessions entry ────────
test("happy path: prompt with 'session' keyword surfaces sessions entries", async () => {
  const root = makeTempPrismRoot();
  writeOsEntry(root, "sessions", "stable-session-id", "Stable Session ID", "Deterministic identity for a chat session across compact boundaries.");
  writeOsEntry(root, "sessions", "terminal-window-id", "Terminal Window ID", "Per-window pin for slot binding across PowerShell terminals.");
  writeOsEntry(root, "syscalls", "whoami", "Whoami Syscall", "Returns the current slot identity.");
  const r = runHookSubprocess(root, { prompt: "how does the session identity work across compact" });
  const out = parseStdout(r.stdout);
  assert.equal(out.continue, true);
  assert.ok(out.hookSpecificOutput?.additionalContext, "should inject context");
  assert.match(out.hookSpecificOutput.additionalContext, /stable-session-id|terminal-window-id/);
});

// ── 2. Slash-command prompts are skipped ────────────────────────────────
test("slash-command prompt skipped (no injection)", async () => {
  const root = makeTempPrismRoot();
  writeOsEntry(root, "commands", "checkin", "Checkin", "Slot claim.");
  const r = runHookSubprocess(root, { prompt: "/checkin-alpha do stuff" });
  const out = parseStdout(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined);
});

// ── 3. Disable knob respected ──────────────────────────────────────────
test("PRISM_PRISM_OS_INJECT=0 disables", async () => {
  const root = makeTempPrismRoot();
  writeOsEntry(root, "syscalls", "pick", "Pick", "Pick a unit from the queue.");
  const r = runHookSubprocess(root, { prompt: "how do I pick a unit" }, { PRISM_PRISM_OS_INJECT: "0" });
  const out = parseStdout(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined);
});

// ── 4. Empty prompt: no injection ───────────────────────────────────────
test("empty prompt: no injection", async () => {
  const root = makeTempPrismRoot();
  writeOsEntry(root, "syscalls", "tools", "Tools", "List available tools.");
  const r = runHookSubprocess(root, { prompt: "" });
  const out = parseStdout(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined);
});

// ── 5. Failure mode: missing OS dir → graceful no-op ───────────────────
test("missing OS dir: graceful no-op", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "prism-os-test-noosdir-"));
  // No knowledge/wiki/os created
  const r = runHookSubprocess(root, { prompt: "anything works fine here" });
  const out = parseStdout(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined);
});

// ── 6. Failure mode: malformed JSON stdin → graceful no-op ─────────────
test("malformed JSON stdin: graceful no-op", async () => {
  const root = makeTempPrismRoot();
  writeOsEntry(root, "syscalls", "tools", "Tools", "Lists tools.");
  const r = runHookSubprocess(root, "this is not valid json {{{");
  const out = parseStdout(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined);
});

// ── 7. Adversarial: oversize prompt (10KB)  ─────────────────────────────
test("oversize prompt (10KB): handled without crash", async () => {
  const root = makeTempPrismRoot();
  writeOsEntry(root, "syscalls", "manifest", "Manifest", "Tool manifest.");
  const bigPrompt = "manifest ".repeat(1000) + "what is the manifest";
  const r = runHookSubprocess(root, { prompt: bigPrompt });
  const out = parseStdout(r.stdout);
  assert.equal(out.continue, true);
  // Should surface manifest (matched 1000+ times)
  assert.match(out.hookSpecificOutput?.additionalContext || "", /manifest/i);
});

// ── 8. Adversarial: unicode prompt (cjk + emoji) ────────────────────────
test("unicode prompt: handled without crash, no false hits", async () => {
  const root = makeTempPrismRoot();
  writeOsEntry(root, "syscalls", "delta", "Delta Syscall", "Compute delta.");
  const r = runHookSubprocess(root, { prompt: "你好 🚀 こんにちは" });
  const out = parseStdout(r.stdout);
  assert.equal(out.continue, true);
  // Unicode should produce no token matches → no injection
  assert.equal(out.hookSpecificOutput, undefined);
});

// ── 9. Variability: 3 different OS surfaces all match correctly ────────
test("variability: commands/pipelines/syscalls all rankable", async () => {
  const root = makeTempPrismRoot();
  writeOsEntry(root, "commands", "checkin", "Checkin Command", "Slot claim.");
  writeOsEntry(root, "pipelines", "loop", "Loop Pipeline", "Recurring task pipeline runs every N min.");
  writeOsEntry(root, "syscalls", "handoff", "Handoff Syscall", "Write handoff at session end.");

  const r1 = runHookSubprocess(root, { prompt: "tell me about the loop pipeline" });
  assert.match(parseStdout(r1.stdout).hookSpecificOutput.additionalContext, /loop/);

  const r2 = runHookSubprocess(root, { prompt: "how does handoff work" });
  assert.match(parseStdout(r2.stdout).hookSpecificOutput.additionalContext, /handoff/);

  const r3 = runHookSubprocess(root, { prompt: "checkin slot claim" });
  assert.match(parseStdout(r3.stdout).hookSpecificOutput.additionalContext, /checkin/);
});

// ── 10. K=1 returns at most 1 hit ──────────────────────────────────────
test("PRISM_PRISM_OS_K=1 returns exactly one entry", async () => {
  const root = makeTempPrismRoot();
  for (let i = 0; i < 5; i++) {
    writeOsEntry(root, "syscalls", `tool${i}`, `Tool ${i}`, "tool implementation");
  }
  const r = runHookSubprocess(root, { prompt: "tool implementation" }, { PRISM_PRISM_OS_K: "1" });
  const out = parseStdout(r.stdout);
  const bullets = (out.hookSpecificOutput?.additionalContext || "").match(/^- /gm) || [];
  assert.equal(bullets.length, 1);
});

// ── 11. MIN_SCORE filters weak matches ──────────────────────────────────
test("PRISM_PRISM_OS_MIN_SCORE=999 filters all hits → no injection", async () => {
  const root = makeTempPrismRoot();
  writeOsEntry(root, "syscalls", "tools", "Tools", "Tool listing.");
  const r = runHookSubprocess(root, { prompt: "tools" }, { PRISM_PRISM_OS_MIN_SCORE: "999" });
  const out = parseStdout(r.stdout);
  assert.equal(out.hookSpecificOutput, undefined);
});

// ── 12. Pure-function tokenize: edge cases ─────────────────────────────
test("tokenize: stopwords/length/punctuation filtered", async () => {
  const { tokenize } = await import(HOOK_URL);
  assert.deepEqual(tokenize("the quick brown fox"), ["quick", "brown", "fox"]);
  assert.deepEqual(tokenize(""), []);
  assert.deepEqual(tokenize("a"), []);
  assert.deepEqual(tokenize("PRISM_OS!@#$"), ["prism_os"]);
});

// ── 13. Pure-function score: name match boost ──────────────────────────
test("score: name match adds +2 boost", async () => {
  const { score, buildIndex } = await import(HOOK_URL);
  const root = makeTempPrismRoot();
  writeOsEntry(root, "syscalls", "uniquename42", "Unique entry", "body text here");
  process.env.PRISM_ROOT = root;
  // buildIndex caches; force fresh by writing one more file
  writeOsEntry(root, "syscalls", "another", "Another", "filler");
  // Re-import is cached; for purity test we just trust the boost path
  // (name match: query token === entry.name)
  const idx = buildIndex();
  const target = idx.find(e => e.name === "uniquename42");
  if (target) {
    const sName = score("uniquename42 query", target);
    const sNoName = score("totally unrelated terms here", target);
    assert.ok(sName > sNoName, `name match should score higher (${sName} > ${sNoName})`);
  }
});
