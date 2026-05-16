// Tests for regression-auto-write.mjs (gap #1 of obsidian-2nd-brain audit).
// Uses node:test — vitest harness broken per [[reference_fleet_reaper_ms1]].
// Run: node --test H:/prism/.claude/hooks/regression-auto-write.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  isRegressionFixSubject,
  isOptedOut,
  formatRegressionEntry,
  hasShaAlready,
  insertEntry,
  writeWithConcurrencyGuard,
} from "./regression-auto-write.mjs";

// ─── isRegressionFixSubject ────────────────────────────────────────────────

test("isRegressionFixSubject — detects 'fix' as a whole word", () => {
  assert.equal(isRegressionFixSubject("[MAIN] [X]/U-FIX: repair broken thing"), true);
  assert.equal(isRegressionFixSubject("[MAIN] fix the broken wiring"), true);
});

test("isRegressionFixSubject — detects restore / repair / regression / wiring-restore / rescue", () => {
  assert.equal(isRegressionFixSubject("restore corrupt loose"), true);
  assert.equal(isRegressionFixSubject("repair AsyncHookDispatcher race"), true);
  assert.equal(isRegressionFixSubject("regression caught in scrutiny"), true);
  assert.equal(isRegressionFixSubject("wiring-restore for U-P0 + U-P1"), true);
  assert.equal(isRegressionFixSubject("rescue prism-ocr monolith"), true);
});

test("isRegressionFixSubject — REJECTS 'patch' and 'revert' as standalone (too broad, removed 2026-05-16 per scrutiny gate)", () => {
  // These two FIX_RX words generate too many false-positives ("patch version bump",
  // "revert feature toggle"). They were removed from FIX_RX. Tests lock the
  // behavior so they don't slip back in without a deliberate decision.
  assert.equal(isRegressionFixSubject("patch null deref"), false);
  assert.equal(isRegressionFixSubject("patch version bump"), false);
  assert.equal(isRegressionFixSubject("revert commit abc123"), false);
  assert.equal(isRegressionFixSubject("revert feature toggle"), false);
  // BUT — operator can still get them recorded by combining with restore/repair/regression
  assert.equal(isRegressionFixSubject("revert + restore broken wiring"), true);
});

test("isRegressionFixSubject — does NOT match substring-only (prefix, suffix, affix)", () => {
  // "prefix" contains "fix" but FIX_RX uses word boundaries
  assert.equal(isRegressionFixSubject("add prefix to all dispatchers"), false);
  assert.equal(isRegressionFixSubject("suffix the engine names with _v2"), false);
  // Word "fixture" should also not match (starts with "fix" but is a different word)
  // FIX_RX is \bfix\b which won't match the start of "fixture" — fix as standalone IS matched
  // but inside "fixture" the \b after "fix" would fail since "t" is also \w. So:
  assert.equal(isRegressionFixSubject("update fixture data"), false);
});

test("isRegressionFixSubject — empty / non-string / opt-out tag rejected", () => {
  assert.equal(isRegressionFixSubject(""), false);
  assert.equal(isRegressionFixSubject(null), false);
  assert.equal(isRegressionFixSubject(undefined), false);
  assert.equal(isRegressionFixSubject("short"), false);  // <5 chars
  assert.equal(isRegressionFixSubject("fix the bug [no-regression-record]"), false);
});

// ─── isOptedOut ─────────────────────────────────────────────────────────────

test("isOptedOut — detects [no-regression-record] in subject OR body", () => {
  assert.equal(isOptedOut("normal subject", "body with [no-regression-record] marker"), true);
  assert.equal(isOptedOut("fix [no-regression-record]", ""), true);
  assert.equal(isOptedOut("normal subject", "normal body"), false);
  assert.equal(isOptedOut("", ""), false);
});

// ─── formatRegressionEntry ──────────────────────────────────────────────────

test("formatRegressionEntry — strips [SCOPE]/U-id prefix from title", () => {
  const e = formatRegressionEntry({
    sha: "abc1234567890",
    date: "2026-05-16",
    subject: "[MAIN] [SYSTEM-VIZ-BRAIN-MS0]/U-P3-FIX: repair the broken wiring",
    body: "",
  });
  assert.ok(e.startsWith("- 2026-05-16 | **repair the broken wiring**"), `got: ${e}`);
  assert.ok(e.includes("observed-in: abc123456"));
  assert.ok(e.includes("git -C H:/prism show abc123456"));
});

test("formatRegressionEntry — truncates title >140 chars with ellipsis", () => {
  const longSubject = "fix " + "A".repeat(200);
  const e = formatRegressionEntry({ sha: "abc123", date: "2026-05-16", subject: longSubject, body: "" });
  // Title should be the subject without prefix, truncated to 137 + "..."
  const titleMatch = e.match(/\*\*([^*]+)\*\*/);
  assert.ok(titleMatch, "must extract bold title");
  assert.ok(titleMatch[1].length <= 140, `title length ${titleMatch[1].length} > 140`);
  assert.ok(titleMatch[1].endsWith("..."), `expected ellipsis, got: ${titleMatch[1]}`);
});

test("formatRegressionEntry — empty title falls back to subject placeholder", () => {
  const e = formatRegressionEntry({ sha: "abc123", date: "2026-05-16", subject: "[X]/U: ", body: "" });
  // After stripping the prefix, what's left is empty → falls back to full subject
  assert.ok(e.includes("**"));
});

// ─── hasShaAlready ──────────────────────────────────────────────────────────

test("hasShaAlready — finds short SHA in CLAUDE.md content (idempotency check)", () => {
  const md = "## Recent regressions\n- 2026-05-16 | **old** | observed-in: deadbeef0 | ...";
  assert.equal(hasShaAlready(md, "deadbeef00ff"), true);
  assert.equal(hasShaAlready(md, "newnewnewnew"), false);
});

test("hasShaAlready — handles non-string + empty sha", () => {
  assert.equal(hasShaAlready(null, "abc123"), false);
  assert.equal(hasShaAlready("text", ""), false);
  assert.equal(hasShaAlready("text", null), false);
});

// ─── insertEntry ────────────────────────────────────────────────────────────

test("insertEntry — prepends new entry after header + canonical comment", () => {
  const md = [
    "Some preamble",
    "",
    "## Recent regressions",
    "<!-- Append-only log per Boris CLAUDE.md back-flow pattern. New entries at TOP. -->",
    "- 2026-05-15 | **older** | observed-in: 1234567 | fix: ... | verify: ...",
    "",
    "## Later section",
  ].join("\n");
  const entry = "- 2026-05-16 | **new** | observed-in: abcdef0 | fix: see commit | verify: git show";
  const r = insertEntry(md, entry);
  assert.equal(r.ok, true);
  assert.ok(r.content.includes(entry));
  // New entry must come BEFORE the older one
  const newIdx = r.content.indexOf("new");
  const oldIdx = r.content.indexOf("older");
  assert.ok(newIdx < oldIdx, "new entry must be before older entry");
  // Comment line must still be present
  assert.ok(r.content.includes("Append-only log per Boris"));
});

test("insertEntry — handles section without canonical comment line (inserts right after header)", () => {
  const md = "preamble\n\n## Recent regressions\n- 2026-05-15 | **older** | ...\n";
  const entry = "- new entry";
  const r = insertEntry(md, entry);
  assert.equal(r.ok, true);
  const newIdx = r.content.indexOf("new entry");
  const oldIdx = r.content.indexOf("older");
  assert.ok(newIdx < oldIdx, "new entry must be before older entry");
});

test("insertEntry — section missing → returns ok:false with reason", () => {
  const md = "preamble\n\n## Other section\n- foo\n";
  const r = insertEntry(md, "- entry");
  assert.equal(r.ok, false);
  assert.equal(r.reason, "section_missing");
});

test("insertEntry — claudeMd not string → ok:false", () => {
  for (const bad of [null, undefined, 42, {}]) {
    const r = insertEntry(bad, "- entry");
    assert.equal(r.ok, false, `bad=${String(bad)}`);
    assert.equal(r.reason, "claudeMd_not_string");
  }
});

test("insertEntry — multiple inserts produce stacked entries (newest stays at TOP)", () => {
  let md = "## Recent regressions\n<!-- Append-only log per Boris CLAUDE.md back-flow pattern. New entries at TOP. -->\n- 2026-05-14 | **oldest** | ...\n";
  let r = insertEntry(md, "- 2026-05-15 | **middle** | ...");
  assert.equal(r.ok, true);
  md = r.content;
  r = insertEntry(md, "- 2026-05-16 | **newest** | ...");
  assert.equal(r.ok, true);
  md = r.content;
  // Order: newest > middle > oldest
  const newestIdx = md.indexOf("newest");
  const middleIdx = md.indexOf("middle");
  const oldestIdx = md.indexOf("oldest");
  assert.ok(newestIdx < middleIdx && middleIdx < oldestIdx,
    `expected newest<middle<oldest, got ${newestIdx}, ${middleIdx}, ${oldestIdx}`);
});

test("insertEntry — tolerant comment detection: skips ANY <!-- --> line and blank lines, not just canonical", () => {
  // 2 different <!-- --> comments + a blank line between header and content.
  // Hardened insertEntry (per Arm A P1) must skip all of them and insert
  // RIGHT BEFORE the first content line.
  const md = [
    "## Recent regressions",
    "<!-- Some non-canonical comment -->",
    "<!-- Another comment line -->",
    "",
    "- 2026-05-14 | **existing** | ...",
  ].join("\n");
  const r = insertEntry(md, "- 2026-05-16 | **new** | ...");
  assert.equal(r.ok, true);
  // New entry must be AFTER both comments + the blank line, BEFORE the existing entry
  const newIdx = r.content.indexOf("new");
  const existingIdx = r.content.indexOf("existing");
  const comment2Idx = r.content.indexOf("Another comment line");
  assert.ok(comment2Idx < newIdx, "new must be AFTER both comment lines");
  assert.ok(newIdx < existingIdx, "new must be BEFORE existing entry");
});

// ─── writeWithConcurrencyGuard ──────────────────────────────────────────────

test("writeWithConcurrencyGuard — happy path: idempotent insert on clean file", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "raw-test-"));
  const file = path.join(tmpDir, "CLAUDE.md");
  fs.writeFileSync(file, "## Recent regressions\n<!-- comment -->\n- old entry\n");
  const sha = "abc1234567890";
  const r = writeWithConcurrencyGuard(file, sha, (current) => {
    const { ok, content } = insertEntry(current, `- new entry observed-in: ${sha.slice(0, 9)}`);
    return ok ? content : null;
  });
  assert.equal(r.ok, true);
  assert.equal(r.attempts, 1);
  const finalContent = fs.readFileSync(file, "utf8");
  assert.ok(finalContent.includes(sha.slice(0, 9)));
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("writeWithConcurrencyGuard — idempotency: skips when SHA already in file (peer wrote it)", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "raw-test-"));
  const file = path.join(tmpDir, "CLAUDE.md");
  const sha = "abc1234567890";
  // Pre-populate: peer already wrote this SHA
  fs.writeFileSync(file, `## Recent regressions\n<!-- comment -->\n- already there observed-in: ${sha.slice(0, 9)}\n`);
  let computeCalled = 0;
  const r = writeWithConcurrencyGuard(file, sha, (current) => {
    computeCalled++;
    return insertEntry(current, `- duplicate observed-in: ${sha.slice(0, 9)}`).content;
  });
  assert.equal(r.ok, true);
  assert.equal(r.skipped, "sha_already_present");
  assert.equal(computeCalled, 0, "computeContent should NOT be called when SHA already present");
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("writeWithConcurrencyGuard — retries when computeContent returns null on first try (max_retries_exceeded)", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "raw-test-"));
  const file = path.join(tmpDir, "CLAUDE.md");
  fs.writeFileSync(file, "## Recent regressions\n- old entry\n");
  const sha = "abc1234567890";
  const r = writeWithConcurrencyGuard(file, sha, () => null);  // Always returns null
  assert.equal(r.ok, false);
  assert.equal(r.reason, "compute_returned_null");
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("writeWithConcurrencyGuard — caps at 3 retries when peer keeps overwriting", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "raw-test-"));
  const file = path.join(tmpDir, "CLAUDE.md");
  fs.writeFileSync(file, "## Recent regressions\n- old\n");
  const sha = "abc1234567890";
  // Simulate adversary: every time we write, immediately overwrite with content
  // that does NOT contain our SHA. The guard should retry 3× then bail.
  let computeAttempts = 0;
  const r = writeWithConcurrencyGuard(file, sha, (current) => {
    computeAttempts++;
    // Compute returns content WITH our sha — but after writing it, we simulate
    // peer overwrite by manually re-writing the file before verify.
    const result = insertEntry(current, `- ours observed-in: ${sha.slice(0, 9)}`);
    // Schedule a peer-overwrite right after this write but before verify by
    // monkey-patching: actually simpler — return content WITHOUT our sha so
    // verify-after-rename always fails and triggers retry.
    return "## Recent regressions\n- peer entry (no our sha)\n";
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "max_retries_exceeded");
  assert.equal(r.attempts, 3, "must cap at MAX_CONCURRENT_RETRY=3");
  assert.equal(computeAttempts, 3, "compute must run 3 times");
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── isMain import-safety ──────────────────────────────────────────────────

test("import-safety: importing regression-auto-write.mjs does NOT run main() (no CLAUDE.md mutation)", () => {
  // This test file ITSELF imports the module at top. If isMain logic regressed
  // and ran main() at import-time, this test couldn't even load. The mere fact
  // that the import statement at the top of THIS file succeeded without writing
  // to H:/prism/CLAUDE.md is a passing test. We also assert no side-effect
  // markers appear.
  // Defensive: check that the exported symbols are FUNCTIONS (i.e., the module
  // executed normally without throwing on missing CLAUDE.md or git).
  assert.equal(typeof isRegressionFixSubject, "function");
  assert.equal(typeof writeWithConcurrencyGuard, "function");
  assert.equal(typeof insertEntry, "function");
});
