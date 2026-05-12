// Tests for .claude/hooks/permission-denied-retry.mjs (U-HKA03).
//
// Run: cd H:/prism && node mcp-server/node_modules/vitest/vitest.mjs run \
//        --config .claude/helpers/vitest.config.mjs \
//        .claude/hooks/__tests__/permission-denied-retry.test.mjs
//
// Intent: the classifier must turn recoverable tool failures into a CONCRETE
// corrected call (so the model fixes it next turn instead of thrashing), say
// nothing when it doesn't understand the failure, and never nudge the same call
// more than RETRY_CAP times.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  extractErrorText,
  looksLikeFailure,
  classifyDenial,
  cacheDir,
  cachePath,
  callHash,
  decideRetry,
  runClassifier,
} from "../permission-denied-retry.mjs";

let TMP;
const envFor = (o = {}) => ({ PRISM_RETRY_CLASSIFY_CACHE_DIR: TMP, ...o });
beforeEach(() => { TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pdr-test-")); });
afterEach(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ } });

describe("extractErrorText — tolerates every tool_response shape (variability axis)", () => {
  it("string passes through for non-Bash; for Bash a bare string is ignored (stdout-like)", () => {
    expect(extractErrorText("EISDIR: illegal operation", "Read")).toBe("EISDIR: illegal operation");
    expect(extractErrorText("a log line that says error", "Bash")).toBe("");
  });
  it("{error} / {stderr} / {message} — Bash takes only error+stderr, never stdout/output", () => {
    expect(extractErrorText({ error: "boom" }, "Read")).toBe("boom");
    expect(extractErrorText({ stderr: "to stderr", stdout: "to stdout" }, "Read")).toContain("to stderr");
    expect(extractErrorText({ message: "msg" }, "Edit")).toBe("msg");
    // Bash: stdout is ignored even when it contains scary words; stderr is kept
    expect(extractErrorText({ stdout: "EISDIR exceeds the maximum size", stderr: "real stderr", exitCode: 1 }, "Bash")).toBe("real stderr");
    expect(extractErrorText({ stdout: "EISDIR exceeds the maximum size", exitCode: 0 }, "Bash")).toBe("");
  });
  it("{content:[{text}]} (Anthropic-style) — non-Bash only", () => {
    expect(extractErrorText({ content: [{ text: "line1" }, { text: "line2" }] }, "Edit")).toBe("line1\nline2");
  });
  it("{is_error:true} with no string fields → stringified (non-Bash)", () => {
    expect(extractErrorText({ is_error: true, code: 42 }, "Edit")).toContain("42");
  });
  it("null / undefined / number → empty or stringified, never throws", () => {
    expect(extractErrorText(null, "Read")).toBe("");
    expect(extractErrorText(undefined, "Edit")).toBe("");
    expect(extractErrorText(123, "Edit")).toBe("123");
    expect(extractErrorText(123, "Bash")).toBe("");
  });
});

describe("looksLikeFailure — clean runs say nothing (esp. Bash exit-0)", () => {
  it("Bash exit 0 → NOT a failure, no matter what it printed (the false-positive we fixed)", () => {
    expect(looksLikeFailure("Bash", "src/foo.ts: handleError(e)\nsrc/bar.ts: errorBoundary", { exitCode: 0 })).toBe(false);
    expect(looksLikeFailure("Bash", "", { stdout: "EISDIR exceeds the maximum size", exitCode: 0 })).toBe(false);
  });
  it("Bash with a non-zero exit code → failure", () => {
    expect(looksLikeFailure("Bash", "", { exitCode: 1 })).toBe(true);
    expect(looksLikeFailure("Bash", "anything", { code: 127 })).toBe(true);
  });
  it("Bash with NO exit code → needs a strong stderr signature", () => {
    expect(looksLikeFailure("Bash", "bash: syntax error near unexpected token `)'", {})).toBe(true);
    expect(looksLikeFailure("Bash", "just some chatter, no signature", {})).toBe(false);
  });
  it("a non-Bash tool with any error text → failure; with none → not", () => {
    expect(looksLikeFailure("Edit", "File has not been read yet", {})).toBe(true);
    expect(looksLikeFailure("Read", "", null)).toBe(false);
    expect(looksLikeFailure("Edit", "", { is_error: true })).toBe(true);
  });
});

describe("classifyDenial — the spec's recoverable categories", () => {
  it("empty error → ok, not retryable", () => {
    expect(classifyDenial({ toolName: "Read", toolInput: {}, errorText: "" })).toMatchObject({ category: "ok", retryable: false });
  });
  it("edit-not-read: Edit before Read → retryable, hint says Read first", () => {
    const c = classifyDenial({ toolName: "Edit", toolInput: { file_path: "H:/prism/x.ts" }, errorText: "Error: File has not been read yet. Read it first." });
    expect(c.category).toBe("edit-not-read");
    expect(c.retryable).toBe(true);
    expect(c.hint).toMatch(/Read\("H:\/prism\/x\.ts"\)/);
  });
  it("edit-stale: old_string not found → retryable, hint mentions re-Read / replace_all", () => {
    const c = classifyDenial({ toolName: "Edit", toolInput: { file_path: "a.ts" }, errorText: "String to replace not found in file." });
    expect(c.category).toBe("edit-stale");
    expect(c.retryable).toBe(true);
    expect(c.hint.toLowerCase()).toMatch(/re-read|replace_all|surrounding/);
  });
  it("c-drive-write: a C:\\Users\\wompu path → retryable, adjustedInput remapped onto H:", () => {
    const c = classifyDenial({ toolName: "Write", toolInput: { file_path: "C:/Users/wompu/scratch/note.md", content: "x" }, errorText: "blocked: c-drive write" });
    expect(c.category).toBe("c-drive-write");
    expect(c.retryable).toBe(true);
    expect(c.adjustedInput.file_path.toLowerCase().startsWith("h:/")).toBe(true);
    expect(c.adjustedInput.content).toBe("x"); // other fields preserved
  });
  it("c-drive-write does NOT fire for the sanctioned ~/.claude/settings.json path", () => {
    const c = classifyDenial({ toolName: "Edit", toolInput: { file_path: "C:/Users/wompu/.claude/settings.json" }, errorText: "some unrelated edit error" });
    expect(c.category).not.toBe("c-drive-write");
  });
  it("dir-read: EISDIR on a Read → not retryable, hint says use Glob/LS", () => {
    const c = classifyDenial({ toolName: "Read", toolInput: { file_path: "H:/prism/src" }, errorText: "EISDIR: illegal operation on a directory, read" });
    expect(c.category).toBe("dir-read");
    expect(c.retryable).toBe(false);
    expect(c.hint.toLowerCase()).toMatch(/glob|ls/);
  });
  it("oversized: Read → adjustedInput {offset:1,limit:500}; Write → split hint; Bash → narrow-output hint", () => {
    const r = classifyDenial({ toolName: "Read", toolInput: { file_path: "big.log" }, errorText: "File content (5000 lines) exceeds the maximum size" });
    expect(r.category).toBe("oversized");
    expect(r.adjustedInput).toMatchObject({ file_path: "big.log", offset: 1, limit: 500 });
    const w = classifyDenial({ toolName: "Write", toolInput: { file_path: "x" }, errorText: "content too long, exceeds maximum length" });
    expect(w.category).toBe("oversized");
    expect(w.adjustedInput).toBeNull();
    expect(w.hint.toLowerCase()).toMatch(/split/);
    const b = classifyDenial({ toolName: "Bash", toolInput: { command: "ls -R /" }, errorText: "output exceeds the limit and was truncated" });
    expect(b.category).toBe("oversized");
    expect(b.hint.toLowerCase()).toMatch(/head|tail|grep|rtk/);
  });
  it("file-not-found: Write → mkdir hint (retryable); Read → check-path hint (not retryable)", () => {
    const w = classifyDenial({ toolName: "Write", toolInput: { file_path: "H:/prism/new/dir/f.txt" }, errorText: "ENOENT: no such file or directory" });
    expect(w.category).toBe("file-not-found");
    expect(w.retryable).toBe(true);
    expect(w.hint.toLowerCase()).toMatch(/mkdir/);
    const r = classifyDenial({ toolName: "Read", toolInput: { file_path: "H:/prism/gone.ts" }, errorText: "ENOENT: no such file" });
    expect(r.category).toBe("file-not-found");
    expect(r.retryable).toBe(false);
    expect(r.hint.toLowerCase()).toMatch(/glob/);
  });
  it("shell-quoting: Bash syntax error → retryable, hint mentions PowerShell; same text from a non-Bash tool does NOT classify as shell-quoting", () => {
    const b = classifyDenial({ toolName: "Bash", toolInput: { command: "echo $(" }, errorText: "bash: syntax error near unexpected token `)'" });
    expect(b.category).toBe("shell-quoting");
    expect(b.retryable).toBe(true);
    expect(b.hint).toMatch(/PowerShell/i);
    const notBash = classifyDenial({ toolName: "Read", toolInput: { file_path: "x" }, errorText: "syntax error somewhere" });
    expect(notBash.category).not.toBe("shell-quoting");
  });
  it("permission: 'permission denied' → not retryable, hint says investigate", () => {
    const c = classifyDenial({ toolName: "Write", toolInput: { file_path: "x" }, errorText: "EACCES: permission denied, open '/etc/hosts'" });
    expect(c.category).toBe("permission");
    expect(c.retryable).toBe(false);
    expect(c.hint.toLowerCase()).toMatch(/investigate|read-only|locked/);
  });
  it("peer-claimed: another chat owns the file → NOT retryable, hint says use the chat bus", () => {
    const c = classifyDenial({ toolName: "Edit", toolInput: { file_path: "H:/prism/x.ts" }, errorText: "file-claim-guard: H:/prism/x.ts is claimed by another chat" });
    expect(c.category).toBe("peer-claimed");
    expect(c.retryable).toBe(false);
    expect(c.hint.toLowerCase()).toMatch(/chat bus|proposing|do not retry/);
  });
  it("unrecognised failure → category 'unknown', not retryable, empty hint (safe default)", () => {
    const c = classifyDenial({ toolName: "Bash", toolInput: { command: "weird" }, errorText: "the flux capacitor desynchronised" });
    expect(c.category).toBe("unknown");
    expect(c.retryable).toBe(false);
    expect(c.hint).toBe("");
  });
});

describe("decideRetry — retry cap (the spec's 'already-retried no-double')", () => {
  const retryable = { category: "edit-not-read", retryable: true, hint: "do X", adjustedInput: { file_path: "a", offset: 1, limit: 500 } };
  it("first nudge → hint, count 0→1, message has the marker + the suggested input", () => {
    const d = decideRetry(retryable, 0);
    expect(d.action).toBe("hint");
    expect(d.newCount).toBe(1);
    expect(d.message).toMatch(/↻ retry hint/);
    expect(d.message).toMatch(/Suggested corrected call input:/);
    expect(d.message).toMatch(/offset.*1.*limit.*500|"offset":1/);
  });
  it("second nudge → still a hint, count 1→2", () => {
    expect(decideRetry(retryable, 1)).toMatchObject({ action: "hint", newCount: 2 });
  });
  it("at the cap (2) → 'stop', tells the model to stop retrying", () => {
    const d = decideRetry(retryable, 2);
    expect(d.action).toBe("stop");
    expect(d.newCount).toBe(3);
    expect(d.message.toLowerCase()).toMatch(/stop retrying|different approach|ask the user/);
  });
  it("beyond the cap → silent", () => {
    expect(decideRetry(retryable, 3)).toMatchObject({ action: "silent" });
    expect(decideRetry(retryable, 9)).toMatchObject({ action: "silent" });
  });
  it("non-retryable with a hint → one-shot info on the first hit, then silent", () => {
    const nr = { category: "dir-read", retryable: false, hint: "use Glob", adjustedInput: null };
    expect(decideRetry(nr, 0)).toMatchObject({ action: "hint", newCount: 1 });
    expect(decideRetry(nr, 1)).toMatchObject({ action: "silent" });
  });
  it("category 'ok' → always silent", () => {
    expect(decideRetry({ category: "ok", retryable: false, hint: "", adjustedInput: null }, 0)).toMatchObject({ action: "silent" });
  });
});

describe("callHash / cachePath hygiene", () => {
  it("stable under key order; distinct for distinct inputs", () => {
    expect(callHash("Edit", { a: 1, b: 2 })).toBe(callHash("Edit", { b: 2, a: 1 }));
    expect(callHash("Edit", { a: 1 })).not.toBe(callHash("Read", { a: 1 }));
  });
  it("cachePath lands under the cache dir, one file per session, sanitized sid", () => {
    expect(cacheDir(envFor())).toBe(TMP);
    const p = cachePath("../../weird", envFor());
    expect(p.startsWith(TMP)).toBe(true);
    expect(path.basename(p)).not.toMatch(/[\\/]/);
  });
});

describe("runClassifier — end to end", () => {
  it("clean Bash run → silent, no cache file", () => {
    const r = runClassifier({ stdin: { tool_name: "Bash", tool_input: { command: "ls" }, tool_response: { stdout: "a\nb", exitCode: 0 }, session_id: "s" }, env: envFor(), now: 1e9 });
    expect(r.action).toBe("silent");
    expect(fs.existsSync(cachePath("s", envFor()))).toBe(false);
  });

  it("Bash exit 0 whose stdout merely PRINTS error keywords (e.g. test fixture text) → still silent", () => {
    const r = runClassifier({ stdin: { tool_name: "Bash", tool_input: { command: "node -e \"...\"" }, tool_response: { stdout: "EISDIR: ...\nfile content exceeds the maximum size\npermission denied", exitCode: 0 }, session_id: "noisy" }, env: envFor(), now: 1.5e9 });
    expect(r.action).toBe("silent");
  });

  it("Bash that actually fails (exit≠0) with a shell-syntax error in stderr → shell-quoting hint", () => {
    const r = runClassifier({ stdin: { tool_name: "Bash", tool_input: { command: "echo $(" }, tool_response: { stdout: "", stderr: "bash: -c: line 1: syntax error near unexpected token `)'", exitCode: 2 }, session_id: "shq" }, env: envFor(), now: 1.7e9 });
    expect(r.action).toBe("hint");
    expect(r.message).toMatch(/shell-quoting/);
    expect(r.message).toMatch(/PowerShell/i);
  });

  it("Edit-not-read: nudges twice, then 'stop', then silent — and the count persists across calls", () => {
    const env = envFor();
    const stdin = { tool_name: "Edit", tool_input: { file_path: "H:/prism/x.ts", old_string: "a", new_string: "b" }, tool_response: { error: "File has not been read yet" }, session_id: "e2e" };
    const now = 2e9;
    expect(runClassifier({ stdin, env, now }).action).toBe("hint");
    expect(runClassifier({ stdin, env, now }).action).toBe("hint");
    expect(runClassifier({ stdin, env, now }).action).toBe("stop");
    expect(runClassifier({ stdin, env, now }).action).toBe("silent");
    const counts = JSON.parse(fs.readFileSync(cachePath("e2e", env), "utf8"));
    const h = callHash("Edit", stdin.tool_input);
    expect(counts[h].count).toBeGreaterThanOrEqual(3);
    expect(counts[h].category).toBe("edit-not-read");
  });

  it("oversized Read → hint carrying the {offset:1,limit:500} corrected call", () => {
    const r = runClassifier({ stdin: { tool_name: "Read", tool_input: { file_path: "big.log" }, tool_response: { error: "file content (8000 lines) exceeds the maximum size" }, session_id: "ov" }, env: envFor(), now: 3e9 });
    expect(r.action).toBe("hint");
    expect(r.message).toMatch(/"offset":1/);
    expect(r.message).toMatch(/"limit":500/);
  });

  it("PRISM_RETRY_CLASSIFY=0 disables it (silent, no cache write)", () => {
    const env = envFor({ PRISM_RETRY_CLASSIFY: "0" });
    const r = runClassifier({ stdin: { tool_name: "Edit", tool_input: { file_path: "x" }, tool_response: { error: "File has not been read yet" }, session_id: "off" }, env, now: 4e9 });
    expect(r).toMatchObject({ action: "silent", category: "disabled" });
    expect(fs.existsSync(cachePath("off", env))).toBe(false);
  });

  it("garbled / missing stdin → silent, never throws", () => {
    expect(() => runClassifier({ stdin: null, env: envFor(), now: 5e9 })).not.toThrow();
    expect(runClassifier({ stdin: null, env: envFor(), now: 5e9 }).action).toBe("silent");
    expect(runClassifier({ stdin: { tool_name: "Bash" }, env: envFor(), now: 5e9 }).action).toBe("silent");
  });

  it("per-session isolation: the same failing call in two sessions has independent retry counts", () => {
    const env = envFor();
    const mk = (sid) => ({ tool_name: "Edit", tool_input: { file_path: "shared.ts" }, tool_response: { error: "File has not been read yet" }, session_id: sid });
    const now = 6e9;
    runClassifier({ stdin: mk("A"), env, now });
    runClassifier({ stdin: mk("A"), env, now });
    runClassifier({ stdin: mk("A"), env, now }); // A is at "stop"
    const a = runClassifier({ stdin: mk("A"), env, now });
    const b = runClassifier({ stdin: mk("B"), env, now }); // B's first ever
    expect(a.action).toBe("silent");
    expect(b.action).toBe("hint");
  });

  it("cache TTL: a stale per-call entry (>30min old) is dropped, so the count resets", () => {
    const env = envFor();
    const sid = "ttl";
    const stdin = { tool_name: "Edit", tool_input: { file_path: "t.ts" }, tool_response: { error: "File has not been read yet" }, session_id: sid };
    const h = callHash("Edit", stdin.tool_input);
    fs.mkdirSync(TMP, { recursive: true });
    const now = 7e9;
    // pre-seed a "we already nudged this 5×" entry, but stamped 31 minutes ago
    fs.writeFileSync(cachePath(sid, env), JSON.stringify({ [h]: { count: 5, category: "edit-not-read", lastAt: now - 31 * 60 * 1000 } }));
    const r = runClassifier({ stdin, env, now });
    expect(r.action).toBe("hint"); // stale entry ignored ⇒ treated as count 0 ⇒ a fresh hint
  });
});
