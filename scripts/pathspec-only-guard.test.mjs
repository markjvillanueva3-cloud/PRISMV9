/**
 * pathspec-only-guard.test.mjs — node:test suite for U-PRECOMMIT-PATHSPEC-ONLY.
 *
 * Run: node --test H:/prism/scripts/pathspec-only-guard.test.mjs
 *
 * Hermetic: every test injects readers/spawners. No real git, no real filesystem
 * reads against state/shared/. The CLI smoke test exercises detectRepoRoot()
 * fail-open paths only — it never reads peer claims.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import {
  canonicalPath,
  sanitizeDisplay,
  filterActiveForeignClaims,
  decide,
  formatBlockReason,
  readClaimsDir,
  resolveSessionId,
  getStagedPaths,
  runGuard,
} from "./pathspec-only-guard.mjs";

const NOW = Date.parse("2026-05-17T23:00:00Z");
const FUTURE = "2026-05-17T23:15:00Z"; // +15m, active
const PAST = "2026-05-17T22:45:00Z"; // -15m, expired

const SELF = "claude-098ac2aa";
const PEER_A = "claude-23651823";
const PEER_B = "claude-91f8b002";

function claim(p, sid = PEER_A, opts = {}) {
  return {
    schemaVersion: "1.0.0",
    path: p,
    sessionId: sid,
    pcName: opts.pc || "DESKTOP-N7MI1VB",
    acquiredAt: opts.acq || "2026-05-17T22:55:00Z",
    expiresAt: opts.exp || FUTURE,
    intent: opts.intent || "write",
  };
}

// ────────────────────────────────────────────────────────────────────────
// canonicalPath
// ────────────────────────────────────────────────────────────────────────

test("canonicalPath: empty/null → empty string", () => {
  assert.equal(canonicalPath(""), "");
  assert.equal(canonicalPath(null), "");
  assert.equal(canonicalPath(undefined), "");
});

test("canonicalPath: backslashes → forward slashes", () => {
  const r = canonicalPath("H:\\prism\\foo\\bar.ts");
  assert.equal(r.includes("\\"), false);
  assert.match(r, /h:\/prism\/foo\/bar\.ts$/i);
});

test("canonicalPath: lowercases on Windows", () => {
  if (process.platform !== "win32") return;
  assert.equal(canonicalPath("H:/PRISM/Foo.ts"), "h:/prism/foo.ts");
});

test("canonicalPath: strips trailing slash", () => {
  const r = canonicalPath("H:/prism/foo/");
  assert.equal(r.endsWith("/"), false);
});

test("canonicalPath: relative path resolves via cwd", () => {
  const r = canonicalPath("foo/bar.ts");
  // Should be absolute now
  assert.equal(path.isAbsolute(r.replace(/\//g, path.sep)), true);
});

// ────────────────────────────────────────────────────────────────────────
// sanitizeDisplay — defends against control-char spoofing in stderr output
// ────────────────────────────────────────────────────────────────────────

test("sanitizeDisplay: strips C0 controls (NUL through US)", () => {
  const inp = "abc" + String.fromCharCode(0x07) + "def" + String.fromCharCode(0x1f) + "g";
  assert.equal(sanitizeDisplay(inp), "abcdefg");
});

test("sanitizeDisplay: strips ANSI escape sequences (ESC = 0x1B caught by C0)", () => {
  const ansi = "[31mRED[0m";
  // The bracket+letters survive (printable) but the ESC controls are gone — the attacker
  // cannot reposition the cursor / repaint screen / inject fake terminal output.
  assert.equal(sanitizeDisplay(ansi), "[31mRED[0m");
});

test("sanitizeDisplay: strips DEL (0x7F)", () => {
  assert.equal(sanitizeDisplay("ab" + String.fromCharCode(0x7f) + "c"), "abc");
});

test("sanitizeDisplay: keeps printable ASCII + extended Unicode", () => {
  assert.equal(sanitizeDisplay("h:/prism/foo-bar_baz.ts"), "h:/prism/foo-bar_baz.ts");
  assert.equal(sanitizeDisplay("日本語"), "日本語");
});

test("sanitizeDisplay: non-string coerces", () => {
  assert.equal(sanitizeDisplay(null), "");
  assert.equal(sanitizeDisplay(undefined), "");
  assert.equal(sanitizeDisplay(42), "42");
});

test("formatBlockReason: control chars in claim fields are sanitized in stderr emit", () => {
  // Real attack scenario: a wedged peer writes a claim file whose `heldBy`
  // field contains ANSI escapes that repaint the resolve recipe with hostile
  // text. The sanitizer strips them before emit.
  const reason = formatBlockReason(
    [{
      path: "h:/prism/x.ts" + String.fromCharCode(0x1b) + "[2J",
      heldBy: "claude-evil" + String.fromCharCode(0x07) + "ring",
      heldByPc: "DESKTOP",
      intent: "write",
      expiresAt: FUTURE,
    }],
    1
  );
  assert.equal(reason.includes(String.fromCharCode(0x1b)), false, "ESC must be stripped");
  assert.equal(reason.includes(String.fromCharCode(0x07)), false, "BEL must be stripped");
  // The surviving text reads cleanly
  assert.match(reason, /h:\/prism\/x\.ts\[2J/);
  assert.match(reason, /claude-evilring/);
});

// ────────────────────────────────────────────────────────────────────────
// filterActiveForeignClaims
// ────────────────────────────────────────────────────────────────────────

test("filterActiveForeignClaims: drops self-claims", () => {
  const claims = [claim("a.ts", SELF), claim("b.ts", PEER_A)];
  const out = filterActiveForeignClaims(claims, SELF, NOW);
  assert.equal(out.length, 1);
  assert.equal(out[0].sessionId, PEER_A);
});

test("filterActiveForeignClaims: drops expired", () => {
  const claims = [claim("a.ts", PEER_A, { exp: PAST }), claim("b.ts", PEER_A, { exp: FUTURE })];
  const out = filterActiveForeignClaims(claims, SELF, NOW);
  assert.equal(out.length, 1);
  assert.equal(out[0].path, "b.ts");
});

test("filterActiveForeignClaims: keeps expiresAt unparseable (fail-safe-active)", () => {
  // If we can't parse the expiry we keep the claim — better to over-block
  // than silently drop a real claim due to schema rot.
  const claims = [claim("a.ts", PEER_A, { exp: "garbage" })];
  const out = filterActiveForeignClaims(claims, SELF, NOW);
  assert.equal(out.length, 1);
});

test("filterActiveForeignClaims: bad input → []", () => {
  assert.deepEqual(filterActiveForeignClaims(null, SELF, NOW), []);
  assert.deepEqual(filterActiveForeignClaims(undefined, SELF, NOW), []);
  assert.deepEqual(filterActiveForeignClaims([null, undefined, {}, { path: "x" }], SELF, NOW), []);
});

test("filterActiveForeignClaims: drops entries missing path or sessionId", () => {
  const claims = [{ path: "a.ts" }, { sessionId: PEER_A }, claim("b.ts", PEER_A)];
  const out = filterActiveForeignClaims(claims, SELF, NOW);
  assert.equal(out.length, 1);
  assert.equal(out[0].path, "b.ts");
});

// ────────────────────────────────────────────────────────────────────────
// decide (pure)
// ────────────────────────────────────────────────────────────────────────

test("decide: no staged → allow", () => {
  const r = decide({ stagedAbsPaths: [], claims: [claim("a.ts", PEER_A)] });
  assert.equal(r.decision, "allow");
});

test("decide: no claims → allow", () => {
  const r = decide({ stagedAbsPaths: ["h:/prism/a.ts"], claims: [] });
  assert.equal(r.decision, "allow");
});

test("decide: staged but no overlap → allow", () => {
  const r = decide({
    stagedAbsPaths: ["h:/prism/a.ts"],
    claims: [claim("h:/prism/b.ts", PEER_A)],
  });
  assert.equal(r.decision, "allow");
});

test("decide: peer-claim hit → block with conflicts populated", () => {
  const r = decide({
    stagedAbsPaths: ["h:/prism/a.ts"],
    claims: [claim("h:/prism/a.ts", PEER_A)],
  });
  assert.equal(r.decision, "block");
  assert.equal(r.conflicts.length, 1);
  assert.equal(r.conflicts[0].heldBy, PEER_A);
  assert.match(r.reason, /PATHSPEC-ONLY pre-commit BLOCKED/);
  assert.match(r.reason, /h:\/prism\/a\.ts/);
});

test("decide: case-insensitive path match (Windows-style drift)", () => {
  const r = decide({
    stagedAbsPaths: [canonicalPath("H:/PRISM/Foo.ts")],
    claims: [claim("h:/prism/foo.ts", PEER_A)],
  });
  if (process.platform === "win32") {
    assert.equal(r.decision, "block");
  } else {
    // Case-sensitive FS — these are different files, allow expected
    assert.equal(r.decision, "allow");
  }
});

test("decide: mixed own + peer → block reports per-file detail", () => {
  const r = decide({
    stagedAbsPaths: ["h:/prism/a.ts", "h:/prism/b.ts"],
    claims: [claim("h:/prism/b.ts", PEER_B)],
  });
  assert.equal(r.decision, "block");
  assert.equal(r.conflicts.length, 1);
  assert.equal(r.conflicts[0].path, "h:/prism/b.ts");
  // Reason should mention BOTH the conflict path AND the total staged count
  assert.match(r.reason, /Staged files: 2/);
});

test("decide: multiple peers on same file (rare claim-refresh race) → both surfaced", () => {
  const r = decide({
    stagedAbsPaths: ["h:/prism/a.ts"],
    claims: [claim("h:/prism/a.ts", PEER_A), claim("h:/prism/a.ts", PEER_B)],
  });
  assert.equal(r.decision, "block");
  assert.equal(r.conflicts.length, 2);
});

// ────────────────────────────────────────────────────────────────────────
// formatBlockReason
// ────────────────────────────────────────────────────────────────────────

test("formatBlockReason: includes resolve recipe", () => {
  const reason = formatBlockReason(
    [{ path: "h:/prism/a.ts", heldBy: PEER_A, heldByPc: "PC", intent: "write", expiresAt: FUTURE }],
    1
  );
  assert.match(reason, /git reset HEAD -- h:\/prism\/a\.ts/);
  assert.match(reason, /PRISM_PATHSPEC_ONLY_DISABLE=1/);
  assert.match(reason, /pathspec/i);
});

test("formatBlockReason: caps conflict list at MAX_CONFLICTS_SHOWN", () => {
  const many = Array.from({ length: 25 }, (_, i) => ({
    path: `h:/prism/f${i}.ts`,
    heldBy: PEER_A,
    heldByPc: "PC",
    intent: "write",
    expiresAt: FUTURE,
  }));
  const reason = formatBlockReason(many, 25);
  assert.match(reason, /and 5 more/);
});

test("formatBlockReason: unparseable expiresAt → '?' minutes (no crash)", () => {
  const reason = formatBlockReason(
    [{ path: "a.ts", heldBy: PEER_A, heldByPc: "PC", intent: "write", expiresAt: "garbage" }],
    1
  );
  assert.match(reason, /expires in \?m/);
});

// ────────────────────────────────────────────────────────────────────────
// readClaimsDir
// ────────────────────────────────────────────────────────────────────────

test("readClaimsDir: missing dir → []", () => {
  const r = readClaimsDir("/definitely/not/a/real/dir/anywhere", {
    readDir: () => {
      throw new Error("nope");
    },
    readFile: () => "{}",
  });
  assert.deepEqual(r, []);
});

test("readClaimsDir: empty dir → []", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ppo-empty-"));
  try {
    const r = readClaimsDir(tmp);
    assert.deepEqual(r, []);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("readClaimsDir: skips malformed JSON, keeps valid", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ppo-mix-"));
  try {
    fs.writeFileSync(path.join(tmp, "good.json"), JSON.stringify(claim("a.ts")));
    fs.writeFileSync(path.join(tmp, "bad.json"), "{not json");
    fs.writeFileSync(path.join(tmp, "ignore.txt"), "noop");
    const r = readClaimsDir(tmp);
    assert.equal(r.length, 1);
    assert.equal(r[0].path, "a.ts");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("readClaimsDir: file read error → skip that entry, keep others", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ppo-readerr-"));
  try {
    fs.writeFileSync(path.join(tmp, "good.json"), JSON.stringify(claim("a.ts")));
    fs.writeFileSync(path.join(tmp, "bad.json"), JSON.stringify(claim("b.ts")));
    const r = readClaimsDir(tmp, {
      readDir: fs.readdirSync,
      readFile: (p, enc) => {
        if (p.endsWith("bad.json")) throw new Error("EACCES");
        return fs.readFileSync(p, enc);
      },
    });
    assert.equal(r.length, 1);
    assert.equal(r[0].path, "a.ts");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ────────────────────────────────────────────────────────────────────────
// resolveSessionId / getStagedPaths (real-IO smoke + DI)
// ────────────────────────────────────────────────────────────────────────

test("resolveSessionId: spawn fails → env fallback returns 8-char claude- id", () => {
  const id = resolveSessionId("/no/repo/here", {
    spawn: () => ({ stdout: "", status: 1 }),
    env: { CLAUDE_SESSION_ID: "abcdefgh12345678" },
  });
  assert.equal(id, "claude-abcdefgh");
});

test("resolveSessionId: spawn fails + no env → null (fail-open trigger)", () => {
  const id = resolveSessionId("/no/repo/here", {
    spawn: () => ({ stdout: "", status: 1 }),
    env: {},
  });
  assert.equal(id, null);
});

test("resolveSessionId: spawn success returns id (≥8 chars)", () => {
  const id = resolveSessionId("/anywhere", {
    spawn: () => ({ stdout: "claude-deadbeef\n", status: 0 }),
    env: {},
  });
  assert.equal(id, "claude-deadbeef");
});

test("resolveSessionId: short spawn output → falls through to env", () => {
  const id = resolveSessionId("/anywhere", {
    spawn: () => ({ stdout: "x", status: 0 }),
    env: { CLAUDE_SESSION_ID: "abcdefghij" },
  });
  assert.equal(id, "claude-abcdefgh");
});

test("getStagedPaths: git failure → null (fail-open trigger)", () => {
  const r = getStagedPaths("/no/repo", { spawn: () => ({ status: 1, stdout: "" }) });
  assert.equal(r, null);
});

test("getStagedPaths: parses newline-separated output", () => {
  const r = getStagedPaths("/anywhere", {
    spawn: () => ({ status: 0, stdout: "a.ts\nb.ts\n\nc.ts\r\n" }),
  });
  assert.deepEqual(r, ["a.ts", "b.ts", "c.ts"]);
});

test("getStagedPaths: spawn throws → null (timeout/ENOENT path)", () => {
  const r = getStagedPaths("/anywhere", {
    spawn: () => {
      throw new Error("ENOENT");
    },
  });
  assert.equal(r, null);
});

// ────────────────────────────────────────────────────────────────────────
// runGuard (integration of pure decision + injected IO)
// ────────────────────────────────────────────────────────────────────────

test("runGuard: PRISM_PATHSPEC_ONLY_DISABLE=1 → allow+bypass", () => {
  const r = runGuard({
    repoRoot: "/repo",
    env: { PRISM_PATHSPEC_ONLY_DISABLE: "1" },
    readClaims: () => [],
    getStaged: () => ["a.ts"],
    resolveSid: () => SELF,
    now: NOW,
  });
  assert.equal(r.decision, "allow");
  assert.equal(r.bypass, true);
});

test("runGuard: git failure → fail-open=git-diff-failed", () => {
  const r = runGuard({
    repoRoot: "/repo",
    env: {},
    readClaims: () => [],
    getStaged: () => null,
    resolveSid: () => SELF,
    now: NOW,
  });
  assert.equal(r.decision, "allow");
  assert.equal(r.fail_open, "git-diff-failed");
});

test("runGuard: no staged → fail-open=no-staged-paths (allow, but distinct from clean)", () => {
  const r = runGuard({
    repoRoot: "/repo",
    env: {},
    readClaims: () => [],
    getStaged: () => [],
    resolveSid: () => SELF,
    now: NOW,
  });
  assert.equal(r.decision, "allow");
  assert.equal(r.fail_open, "no-staged-paths");
});

test("runGuard: no session id → fail-open=no-session-id", () => {
  const r = runGuard({
    repoRoot: "/repo",
    env: {},
    readClaims: () => [claim("a.ts", PEER_A)],
    getStaged: () => ["a.ts"],
    resolveSid: () => null,
    now: NOW,
  });
  assert.equal(r.decision, "allow");
  assert.equal(r.fail_open, "no-session-id");
});

test("runGuard: own-claim never blocks (self-exempt)", () => {
  const r = runGuard({
    repoRoot: "/repo",
    env: {},
    readClaims: () => [claim("/repo/a.ts", SELF)],
    getStaged: () => ["a.ts"],
    resolveSid: () => SELF,
    now: NOW,
  });
  assert.equal(r.decision, "allow");
});

test("runGuard: peer-claim hit → block + reason references the path", () => {
  const r = runGuard({
    repoRoot: "/repo",
    env: {},
    readClaims: () => [claim("/repo/a.ts", PEER_A)],
    getStaged: () => ["a.ts"],
    resolveSid: () => SELF,
    now: NOW,
  });
  assert.equal(r.decision, "block");
  // Reason mentions the resolved canonical path
  const want = canonicalPath("/repo/a.ts");
  assert.match(r.reason, new RegExp(want.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("runGuard: expired peer-claim → allow (silent drop)", () => {
  const r = runGuard({
    repoRoot: "/repo",
    env: {},
    readClaims: () => [claim("/repo/a.ts", PEER_A, { exp: PAST })],
    getStaged: () => ["a.ts"],
    resolveSid: () => SELF,
    now: NOW,
  });
  assert.equal(r.decision, "allow");
});

test("runGuard: real-data git add -A simulation — 3 staged, 1 peer-claimed, 2 own → block names the 1", () => {
  const r = runGuard({
    repoRoot: "/repo",
    env: {},
    readClaims: () => [
      claim("/repo/peer.ts", PEER_A),
      claim("/repo/other-peer.ts", PEER_B, { exp: PAST }), // expired, ignored
    ],
    getStaged: () => ["own1.ts", "own2.ts", "peer.ts"],
    resolveSid: () => SELF,
    now: NOW,
  });
  assert.equal(r.decision, "block");
  assert.equal(r.conflicts.length, 1);
  assert.equal(r.conflicts[0].path, canonicalPath("/repo/peer.ts"));
  assert.match(r.reason, /Staged files: 3/);
});

test("runGuard: Windows-style case drift in claim vs git output → block (case-insensitive)", () => {
  if (process.platform !== "win32") return;
  const r = runGuard({
    repoRoot: "H:/prism",
    env: {},
    readClaims: () => [claim("H:/PRISM/Foo.ts", PEER_A)], // upper
    getStaged: () => ["foo.ts"], // lower
    resolveSid: () => SELF,
    now: NOW,
  });
  assert.equal(r.decision, "block");
});

// ────────────────────────────────────────────────────────────────────────
// Real-data fixture E2E (arm B P2 — pure-core + injected-readers MUST ship
// one real-data test that exercises the actual on-disk claim file shape).
// Lesson source: [[reference_rgs_tool_autoinvoke_ms1_2026_05_16]] — hermetic
// fakes don't prove production wiring.
// ────────────────────────────────────────────────────────────────────────

test("E2E: real claim file from __fixtures__/ → block (verifies live schema)", () => {
  const fixtureDir = path.join(import.meta.dirname || path.dirname(new URL(import.meta.url).pathname), "__fixtures__", "pathspec-only-guard");
  const claims = readClaimsDir(fixtureDir);
  // Sanity: the fixture loaded
  assert.equal(claims.length, 1, "fixture should hold exactly one claim file");
  const c = claims[0];
  // Schema shape matches live store
  assert.equal(typeof c.path, "string");
  assert.equal(typeof c.sessionId, "string");
  assert.equal(typeof c.pcName, "string");
  assert.equal(typeof c.acquiredAt, "string");
  assert.equal(typeof c.expiresAt, "string");
  assert.equal(typeof c.intent, "string");
  // Now drive runGuard with the real fixture as the claims input
  const r = runGuard({
    repoRoot: "H:/prism",
    env: {},
    readClaims: () => claims,
    getStaged: () => ["state/shared/handoffs/HANDOFF-claude-aaaaaaaa-foo.md"],
    resolveSid: () => "claude-bbbbbbbb", // a DIFFERENT session — peer claim should block
    now: Date.parse("2026-05-17T23:00:00Z"),
  });
  assert.equal(r.decision, "block");
  assert.equal(r.conflicts.length, 1);
  assert.equal(r.conflicts[0].heldBy, "claude-aaaaaaaa");
});

test("E2E: real claim + SAME sessionId → allow (self-exempt, fixture-driven)", () => {
  const fixtureDir = path.join(import.meta.dirname || path.dirname(new URL(import.meta.url).pathname), "__fixtures__", "pathspec-only-guard");
  const claims = readClaimsDir(fixtureDir);
  const r = runGuard({
    repoRoot: "H:/prism",
    env: {},
    readClaims: () => claims,
    getStaged: () => ["state/shared/handoffs/HANDOFF-claude-aaaaaaaa-foo.md"],
    resolveSid: () => "claude-aaaaaaaa", // SAME as fixture claim
    now: Date.parse("2026-05-17T23:00:00Z"),
  });
  assert.equal(r.decision, "allow");
});
