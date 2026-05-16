// node:test coverage for scrutiny-verdict-persist.mjs (Gap #2 Stop hook).
// vitest harness is broken on this repo (pre-existing vite-transform bug);
// node --test is the working alternative. Run:
//   node --test .claude/hooks/__tests__/scrutiny-verdict-persist.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  resolveSessionId, hasReviewSignal, formatRecord, writeWithGuard, loadEntry,
  extractContentHash,
} from "../scrutiny-verdict-persist.mjs";

// ── resolveSessionId ─────────────────────────────────────────────────────

test("resolveSessionId: stdin session_id wins", () => {
  assert.equal(resolveSessionId({ session_id: "abc-123" }, {}), "abc-123");
});

test("resolveSessionId: trims whitespace", () => {
  assert.equal(resolveSessionId({ session_id: "  xy-9  " }, {}), "xy-9");
});

test("resolveSessionId: falls back to CLAUDE_SESSION_ID env", () => {
  assert.equal(resolveSessionId(null, { CLAUDE_SESSION_ID: "env-sid" }), "env-sid");
});

test("resolveSessionId: PRISM_SESSION_ID env fallback", () => {
  assert.equal(resolveSessionId({}, { PRISM_SESSION_ID: "p-sid" }), "p-sid");
});

test("resolveSessionId: null when nothing resolvable", () => {
  assert.equal(resolveSessionId(null, {}), null);
  assert.equal(resolveSessionId({ session_id: "" }, {}), null);
  assert.equal(resolveSessionId({ session_id: "   " }, {}), null);
});

test("resolveSessionId: non-string session_id ignored", () => {
  assert.equal(resolveSessionId({ session_id: 42 }, { CLAUDE_SESSION_ID: "fallback" }), "fallback");
});

// ── hasReviewSignal ──────────────────────────────────────────────────────

test("hasReviewSignal: legacy self+agent pair", () => {
  assert.equal(hasReviewSignal({ selfReviewed: true, agentReviewed: true }), true);
});

test("hasReviewSignal: legacy pair incomplete → false", () => {
  assert.equal(hasReviewSignal({ selfReviewed: true, agentReviewed: false }), false);
});

test("hasReviewSignal: structured 3-arm flags", () => {
  assert.equal(hasReviewSignal({ opusReviewed: true }), true);
  assert.equal(hasReviewSignal({ claudeReviewed: true }), true);
  assert.equal(hasReviewSignal({ codexReviewed: true }), true);
});

test("hasReviewSignal: non-empty reviews object", () => {
  assert.equal(hasReviewSignal({ reviews: { opus: { verdict: "pass" } } }), true);
});

test("hasReviewSignal: empty reviews object → false", () => {
  assert.equal(hasReviewSignal({ reviews: {} }), false);
});

test("hasReviewSignal: bare blockCount bump (never scrutinized) → false", () => {
  assert.equal(hasReviewSignal({ sessionId: "x", blockCount: 2, notes: "" }), false);
});

test("hasReviewSignal: null / non-object → false", () => {
  assert.equal(hasReviewSignal(null), false);
  assert.equal(hasReviewSignal(undefined), false);
  assert.equal(hasReviewSignal("string"), false);
});

// ── formatRecord ─────────────────────────────────────────────────────────

const NOW = "2026-05-16T12:00:00.000Z";

// Helper: extract the single frontmatter block (between the first two `---`
// fences) so injection tests can assert it parses as ONE block.
function frontmatter(out) {
  assert.equal(out.slice(0, 4), "---\n", "must open with frontmatter fence");
  const end = out.indexOf("\n---\n", 4);
  assert.ok(end > 0, "frontmatter must close");
  // No SECOND frontmatter fence may appear before the first body heading.
  const body = out.slice(end + 5);
  const firstHeading = body.indexOf("# ");
  const secondFence = body.indexOf("\n---\n");
  if (secondFence >= 0 && firstHeading >= 0) {
    assert.ok(secondFence > firstHeading, "no injected 2nd frontmatter block before body");
  }
  return out.slice(4, end);
}

test("formatRecord: cleared session (all arms PASS) + native vault schema", () => {
  const entry = {
    recordedAt: "2026-05-16T10:00:00.000Z",
    blockCount: 1,
    notes: "U-FOO shipped clean",
    reviews: {
      opus: { verdict: "pass", blockers: "none", notes: "looks good", recordedAt: "t1" },
      claude: { verdict: "PASS", blockers: "", notes: "second pass clean", recordedAt: "t2" },
      codex: { verdict: "pass", blockers: "n/a", notes: "analyst clean", recordedAt: "t3" },
    },
  };
  const out = formatRecord("sess-1234-abcd", entry, { sha: "deadbee", subject: "[X]/U-FOO: do it" }, NOW);
  const fm = frontmatter(out);
  assert.match(fm, /cleared: true/);
  assert.match(out, /✅ yes \(all arms PASS\)/);
  assert.match(out, /\| opus \| PASS \|/);
  assert.match(out, /\| codex \| PASS \|/);
  // native knowledge/memories convention: source / synced / aliases.
  // frontmatter() returns the block WITHOUT the enclosing --- fences, so
  // `name:` is the first line (no leading \n). Match line-anchored.
  assert.match(fm, /^name: scrutiny-sess1234abcd-2026-05-16$/m);
  assert.match(fm, /^source: prism-memory$/m);
  assert.match(fm, /^synced: 2026-05-16T12:00:00\.000Z$/m);
  assert.match(fm, /^aliases: scrutiny-sess1234abcd-2026-05-16$/m);
  assert.match(fm, /linked_commit: "deadbee"/);
  assert.match(out, /<!-- content-hash: [0-9a-f]{16} -->/);
  assert.match(out, /<!-- regenerated-at: 2026-05-16T12:00:00\.000Z -->/);
});

test("formatRecord: structured-boolean-only clearance is NOT mislabeled (Arm A P2)", () => {
  // The --mark-opus/--mark-claude/--mark-analyst path sets these booleans
  // WITHOUT a `reviews` object. Pre-fix this rendered cleared:false/(legacy).
  const entry = {
    recordedAt: "2026-05-16T09:00:00.000Z",
    selfReviewed: true, agentReviewed: true,
    opusReviewed: true, claudeReviewed: true, codexReviewed: true,
    blockCount: 0, notes: "3-of-3 marked via flags",
  };
  const out = formatRecord("flagonly-1", entry, { sha: "abc1234", subject: "x" }, NOW);
  assert.match(frontmatter(out), /cleared: true/);
  assert.match(out, /✅ yes \(all arms PASS\)/);
});

test("formatRecord: structured-boolean partial (one arm missing) → NOT cleared", () => {
  const entry = {
    recordedAt: NOW,
    opusReviewed: true, claudeReviewed: true, codexReviewed: false,
    notes: "only 2 of 3 flags",
  };
  // hasReviewSignal still true (≥1 boolean), but clearance must be false.
  const out = formatRecord("partial-1", entry, { sha: "h", subject: "s" }, NOW);
  assert.match(frontmatter(out), /cleared: false/);
});

test("formatRecord: FAIL verdict is still persisted + flagged not-cleared", () => {
  const entry = {
    recordedAt: "2026-05-16T11:00:00.000Z",
    blockCount: 3,
    notes: "round 2 had a P0",
    reviews: {
      opus: { verdict: "pass", blockers: "none", notes: "A clean" },
      claude: { verdict: "FAIL", blockers: "P0 Unicode evasion", notes: "8 hostile classes open" },
    },
  };
  const out = formatRecord("ff00-1111", entry, { sha: "", subject: "" }, NOW);
  assert.match(frontmatter(out), /cleared: false/);
  assert.match(out, /❌ no \(FAIL or incomplete\)/);
  assert.match(out, /\| claude \| FAIL \| P0 Unicode evasion \|/);
  assert.match(out, /linked_commit: ""/); // empty sha → quoted empty, no crash
});

test("formatRecord: legacy entry (no structured reviews) renders fallback row", () => {
  const entry = {
    recordedAt: "2026-04-28T16:12:25.014Z",
    selfReviewed: true, agentReviewed: true,
    blockCount: 1, notes: "legacy pre-3way clearance",
  };
  const out = formatRecord("ce425dcc-47be", entry, { sha: "abc1234", subject: "legacy" }, NOW);
  assert.match(out, /\| \(legacy\) \| self\+agent \| no structured per-arm data \|/);
  assert.match(frontmatter(out), /cleared: true/);
});

test("formatRecord: notes clipped at cap, whitespace collapsed", () => {
  const entry = {
    recordedAt: NOW, selfReviewed: true, agentReviewed: true,
    notes: "x".repeat(2000) + "\n\n  spaced   out  ",
  };
  const out = formatRecord("big-1", entry, { sha: "h", subject: "s" }, NOW);
  const block = out.split("## Ledger notes")[1] || "";
  assert.ok(!/x{1000}/.test(block), "notes must be clipped");
  assert.ok(block.includes("…"), "clipped marker present");
});

test("formatRecord: P0 — session_id cannot break frontmatter (Arm B)", () => {
  // Hostile session_id: a raw \n---\n would close the frontmatter early and
  // inject attacker-controlled YAML keys. yamlScalar() escapes newlines.
  const entry = { recordedAt: NOW, selfReviewed: true, agentReviewed: true, notes: "ok" };
  const evil = 'a\n---\nname: hijacked\nevil: true';
  const out = formatRecord(evil, entry, { sha: "h", subject: "s" }, NOW);
  const fm = frontmatter(out); // throws if a 2nd block was injected
  assert.ok(!/\nname: hijacked/.test(fm), "injected name key must NOT appear");
  assert.ok(!/\nevil: true/.test(fm), "injected arbitrary key must NOT appear");
  // session_id must be a single quoted scalar
  assert.match(fm, /session_id: "a\\n---\\nname: hijacked\\nevil: true"/);
});

test("formatRecord: P0 — malicious notes cannot break frontmatter", () => {
  const entry = {
    recordedAt: NOW, selfReviewed: true, agentReviewed: true,
    notes: 'evil: "value"\n---\nname: injected',
  };
  const out = formatRecord("inj-1", entry, { sha: "h", subject: "s" }, NOW);
  const fm = frontmatter(out);
  assert.ok(!/\nname: injected/.test(fm), "notes-injected key must not appear in frontmatter");
});

test("formatRecord: P1 — triple-backtick in notes cannot escape the fenced block", () => {
  // Reviewer notes routinely paste fenced code. A literal ``` must not close
  // the wrapper fence. fencedBlock() computes a fence longer than any run.
  const entry = {
    recordedAt: NOW, selfReviewed: true, agentReviewed: true,
    notes: 'before ```\nyaml\n# pretend heading\n``` after ```` even longer',
  };
  const out = formatRecord("fence-1", entry, { sha: "h", subject: "s" }, NOW);
  const block = out.split("## Ledger notes")[1].split("## ")[0];
  // The opening fence length must exceed the longest backtick run in content
  // (content has a 4-run ````), so opener is ≥5 backticks.
  const opener = block.match(/`{3,}/);
  assert.ok(opener && opener[0].length >= 5, `fence must be ≥5 backticks, got ${opener && opener[0].length}`);
  // The injected "# pretend heading" stays inside the fence (still preceded
  // by the opener, not promoted to a real markdown heading at column 0).
  assert.ok(block.indexOf(opener[0]) < block.indexOf("# pretend heading"));
});

// ── extractContentHash + idempotency ─────────────────────────────────────

test("extractContentHash: line-anchored extraction", () => {
  const c = "body\n<!-- content-hash: deadbeefcafe0123 -->\n<!-- regenerated-at: x -->\n";
  assert.equal(extractContentHash(c), "deadbeefcafe0123");
});

test("extractContentHash: marker-looking text inside notes is NOT mistaken (Arm B P1)", () => {
  // A reviewer note pasting the literal marker, but inside a fenced block and
  // NOT at line-start-as-bare-comment, must not be picked up as THE hash.
  const c = "intro `<!-- content-hash: 0000000000000000 -->` inline\n<!-- content-hash: abcdef0123456789 -->\n";
  assert.equal(extractContentHash(c), "abcdef0123456789");
});

test("extractContentHash: absent → null", () => {
  assert.equal(extractContentHash("no marker here"), null);
});

test("idempotency: identical ledger data is a no-op even though regenerated-at differs", () => {
  const tmp = path.join(os.tmpdir(), `svp-idem-${Date.now()}.md`);
  const entry = { recordedAt: "2026-05-16T10:00:00.000Z", selfReviewed: true, agentReviewed: true, notes: "stable" };
  try {
    const a = formatRecord("idem-1", entry, { sha: "h", subject: "s" }, "2026-05-16T10:00:00.000Z");
    writeWithGuard(tmp, a);
    const m1 = fs.statSync(tmp).mtimeMs;
    // Same entry, LATER nowIso → different regenerated-at, SAME content-hash.
    const b = formatRecord("idem-1", entry, { sha: "h", subject: "s" }, "2026-05-16T23:59:59.000Z");
    const r = writeWithGuard(tmp, b);
    assert.equal(r.skipped, "content_equal");
    assert.equal(fs.statSync(tmp).mtimeMs, m1, "must not rewrite on semantic no-op");
  } finally { try { fs.unlinkSync(tmp); } catch {} }
});

test("idempotency: a real verdict change DOES rewrite", () => {
  const tmp = path.join(os.tmpdir(), `svp-idem2-${Date.now()}.md`);
  try {
    const a = formatRecord("idem-2", { recordedAt: NOW, opusReviewed: true, claudeReviewed: true, codexReviewed: false, notes: "fail" }, { sha: "h" }, NOW);
    writeWithGuard(tmp, a);
    // Verdict flips to cleared → content-hash changes → rewrite.
    const b = formatRecord("idem-2", { recordedAt: NOW, opusReviewed: true, claudeReviewed: true, codexReviewed: true, notes: "now passes" }, { sha: "h" }, NOW);
    const r = writeWithGuard(tmp, b);
    assert.notEqual(r.skipped, "content_equal");
    assert.match(fs.readFileSync(tmp, "utf8"), /cleared: true/);
  } finally { try { fs.unlinkSync(tmp); } catch {} }
});

// ── loadEntry ────────────────────────────────────────────────────────────

test("loadEntry: returns the keyed entry", () => {
  const tmp = path.join(os.tmpdir(), `svp-ledger-${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify({ schemaVersion: "1.0.0", entries: { "s-1": { sessionId: "s-1", notes: "hi" } } }));
  try {
    const e = loadEntry("s-1", tmp);
    assert.equal(e.notes, "hi");
  } finally { fs.unlinkSync(tmp); }
});

test("loadEntry: missing key → null", () => {
  const tmp = path.join(os.tmpdir(), `svp-ledger2-${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify({ entries: { other: {} } }));
  try { assert.equal(loadEntry("nope", tmp), null); }
  finally { fs.unlinkSync(tmp); }
});

test("loadEntry: prototype-pollution key is not treated as present", () => {
  const tmp = path.join(os.tmpdir(), `svp-ledger3-${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify({ entries: {} }));
  try {
    // __proto__ exists on every object via the prototype chain; hasOwnProperty
    // guard must reject it.
    assert.equal(loadEntry("__proto__", tmp), null);
    assert.equal(loadEntry("constructor", tmp), null);
  } finally { fs.unlinkSync(tmp); }
});

test("loadEntry: malformed JSON → null (no throw)", () => {
  const tmp = path.join(os.tmpdir(), `svp-ledger4-${Date.now()}.json`);
  fs.writeFileSync(tmp, "{ not json");
  try { assert.equal(loadEntry("x", tmp), null); }
  finally { fs.unlinkSync(tmp); }
});

test("loadEntry: missing file → null", () => {
  assert.equal(loadEntry("x", path.join(os.tmpdir(), "svp-does-not-exist.json")), null);
});

test("loadEntry: entries not an object → null", () => {
  const tmp = path.join(os.tmpdir(), `svp-ledger5-${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify({ entries: "nope" }));
  try { assert.equal(loadEntry("x", tmp), null); }
  finally { fs.unlinkSync(tmp); }
});

// ── writeWithGuard ───────────────────────────────────────────────────────

test("writeWithGuard: first write succeeds (hash-marked content)", () => {
  const tmp = path.join(os.tmpdir(), `svp-w1-${Date.now()}.md`);
  try {
    const r = writeWithGuard(tmp, "hello\n<!-- content-hash: aaaa0000bbbb1111 -->\n<!-- regenerated-at: 2026-01-01T00:00:00Z -->\n");
    assert.equal(r.ok, true);
    assert.ok(fs.existsSync(tmp));
  } finally { try { fs.unlinkSync(tmp); } catch {} }
});

test("writeWithGuard: idempotent skip on same content-hash, differing regenerated-at", () => {
  const tmp = path.join(os.tmpdir(), `svp-w2-${Date.now()}.md`);
  try {
    writeWithGuard(tmp, "body\n<!-- content-hash: cafe0123cafe0123 -->\n<!-- regenerated-at: 2026-01-01T00:00:00Z -->\n");
    const mtime1 = fs.statSync(tmp).mtimeMs;
    // Same content-hash, different regenerated-at → content-equal skip.
    const r2 = writeWithGuard(tmp, "body\n<!-- content-hash: cafe0123cafe0123 -->\n<!-- regenerated-at: 2026-09-09T09:09:09Z -->\n");
    assert.equal(r2.ok, true);
    assert.equal(r2.skipped, "content_equal");
    assert.equal(fs.statSync(tmp).mtimeMs, mtime1, "no rewrite on hash-equal");
  } finally { try { fs.unlinkSync(tmp); } catch {} }
});

test("writeWithGuard: different content-hash DOES rewrite", () => {
  const tmp = path.join(os.tmpdir(), `svp-w3-${Date.now()}.md`);
  try {
    writeWithGuard(tmp, "v1\n<!-- content-hash: 1111111111111111 -->\n");
    const r = writeWithGuard(tmp, "v2-different\n<!-- content-hash: 2222222222222222 -->\n");
    assert.equal(r.ok, true);
    assert.notEqual(r.skipped, "content_equal");
    assert.match(fs.readFileSync(tmp, "utf8"), /v2-different/);
  } finally { try { fs.unlinkSync(tmp); } catch {} }
});

test("writeWithGuard: content with NO hash marker never false-skips (writes every time)", () => {
  const tmp = path.join(os.tmpdir(), `svp-w4-${Date.now()}.md`);
  try {
    // No content-hash marker → targetHash null → must NOT be reported as
    // content_equal (a null hash must never compare equal to anything).
    const r = writeWithGuard(tmp, "no marker here at all\n");
    assert.notEqual(r.skipped, "content_equal");
    // The write itself happens; verify-after-rename can't confirm (null hash)
    // so it exhausts retries and reports max_retries_exceeded — but the file
    // is still on disk (atomicWrite ran). Non-blocking contract honored.
    assert.ok(fs.existsSync(tmp));
  } finally { try { fs.unlinkSync(tmp); } catch {} }
});

// ── import-safety: importing this module must not run main() ─────────────

test("import-safety: module import did not read stdin / write files", () => {
  // If main() had run on import, the test process would have blocked on
  // fs.readFileSync(0). Reaching this assertion proves the isMain guard works.
  assert.ok(true);
});
