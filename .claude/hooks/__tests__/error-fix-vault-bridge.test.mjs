// node:test suite for error-fix-vault-bridge.mjs (Obsidian-2nd-brain Gap #4).
// vitest harness is broken on this repo (see reference_fleet_reaper_ms1) — run:
//   node --test H:/prism/.claude/hooks/__tests__/error-fix-vault-bridge.test.mjs
//
// Locks the load-bearing safety + idempotency contracts:
//   - YAML-injection via a hostile error message embedded in a fix key
//   - fenced-block escape via pasted ``` in an error message
//   - content-hash idempotency (skip on identical day-set, rewrite on change)
//   - durability/placeholder selection rule
//   - per-day filtering + deterministic sort + cap
//   - prototype-pollution guard on the untrusted fixes map
//   - import-safety (module import must not run main / write files)

import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  loadFixPairs,
  isDurable,
  selectForDay,
  formatRecord,
  extractContentHash,
  writeWithGuard,
} from "../error-fix-vault-bridge.mjs";

function tmpFile(name, content) {
  const p = path.join(os.tmpdir(), `efvb-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}-${name}`);
  fs.writeFileSync(p, content, "utf8");
  return p;
}
const COMMIT = { sha: "abc1234", subject: "test commit" };
const NOW = "2026-05-16T12:00:00.000Z";

// ── loadFixPairs ──────────────────────────────────────────────────────────
test("loadFixPairs: missing file → []", () => {
  assert.deepEqual(loadFixPairs(path.join(os.tmpdir(), "does-not-exist-efvb.json")), []);
});

test("loadFixPairs: corrupt JSON → []", () => {
  const p = tmpFile("corrupt.json", "{not json");
  assert.deepEqual(loadFixPairs(p), []);
  fs.unlinkSync(p);
});

test("loadFixPairs: no fixes key → []", () => {
  const p = tmpFile("nofixes.json", JSON.stringify({ errors: [] }));
  assert.deepEqual(loadFixPairs(p), []);
  fs.unlinkSync(p);
});

test("loadFixPairs: splits fixKey into type:code:message", () => {
  const p = tmpFile("ok.json", JSON.stringify({
    fixes: {
      "typescript:TS2345:Argument of type string is not assignable": {
        fix: "type-alias,interface", file: "Foo.ts", timestamp: "2026-05-16T01:02:03.000Z", successCount: 3,
      },
    },
  }));
  const out = loadFixPairs(p);
  fs.unlinkSync(p);
  assert.equal(out.length, 1);
  assert.equal(out[0].errorType, "typescript");
  assert.equal(out[0].errorCode, "TS2345");
  assert.equal(out[0].errorMsg, "Argument of type string is not assignable");
  assert.equal(out[0].fix, "type-alias,interface");
  assert.equal(out[0].successCount, 3);
});

test("loadFixPairs: prototype-pollution key is skipped", () => {
  // Build the object so __proto__ is an OWN enumerable string key.
  const fixes = {};
  Object.defineProperty(fixes, "__proto__", {
    value: { fix: "evil", file: "x", timestamp: NOW, successCount: 9 },
    enumerable: true, configurable: true, writable: true,
  });
  fixes["test:TEST_FAIL:real"] = { fix: "async,await", file: "a.test.ts", timestamp: NOW, successCount: 1 };
  const p = tmpFile("proto.json", JSON.stringify({ fixes }));
  const out = loadFixPairs(p);
  fs.unlinkSync(p);
  // LOAD-BEARING lock: with RESERVED_KEYS emptied, JSON.parse materializes
  // `__proto__` as an OWN data key (verified: Object.keys includes it), it
  // becomes a 2nd pair, length → 2, and THIS assertion fails. This is what
  // actually guards the reserved-key skip.
  assert.equal(out.length, 1);
  assert.equal(out[0].key, "test:TEST_FAIL:real");
  // NOTE (not theater-removed, clarified): JSON-sourced `__proto__` is an
  // *own-key* hazard (spurious pair), NOT a prototype-write — JSON.parse never
  // writes through to Object.prototype, so `{}.fix` would be undefined with or
  // without the guard. The length assertion above is the real lock; this only
  // documents that global-prototype integrity is incidentally intact.
  assert.equal(Object.prototype.fix, undefined, "Object.prototype must stay clean (incidental)");
});

test("loadFixPairs: non-object fix value is skipped", () => {
  const p = tmpFile("badval.json", JSON.stringify({ fixes: { "a:b:c": "not-an-object", "d:e:f": null } }));
  assert.deepEqual(loadFixPairs(p), []);
  fs.unlinkSync(p);
});

// ── isDurable ─────────────────────────────────────────────────────────────
test("isDurable: empty/blank fix rejected", () => {
  assert.equal(isDurable({ fix: "", successCount: 5 }), false);
  assert.equal(isDurable({ fix: "   ", successCount: 5 }), false);
});

test("isDurable: successCount below min rejected", () => {
  assert.equal(isDurable({ fix: "async,await", successCount: 0 }, 1), false);
  assert.equal(isDurable({ fix: "async,await", successCount: 2 }, 3), false);
});

test("isDurable: placeholder excluded unless recurred ≥2×", () => {
  assert.equal(isDurable({ fix: "code modification", successCount: 1 }, 1), false);
  assert.equal(isDurable({ fix: "code modification", successCount: 2 }, 1), true);
});

test("isDurable: real signature with sufficient successCount accepted", () => {
  assert.equal(isDurable({ fix: "import,export", successCount: 1 }, 1), true);
});

test("isDurable: non-object → false", () => {
  assert.equal(isDurable(null), false);
  assert.equal(isDurable("x"), false);
});

// ── selectForDay ──────────────────────────────────────────────────────────
test("selectForDay: filters to the target day only", () => {
  const pairs = [
    { key: "a:b:c", fix: "f1", file: "x", timestamp: "2026-05-16T01:00:00.000Z", successCount: 1 },
    { key: "d:e:f", fix: "f2", file: "y", timestamp: "2026-05-15T23:00:00.000Z", successCount: 1 },
  ];
  const sel = selectForDay(pairs, "2026-05-16", 1, 60);
  assert.equal(sel.length, 1);
  assert.equal(sel[0].key, "a:b:c");
});

test("selectForDay: newest-first then key, capped", () => {
  const pairs = [
    { key: "k1", fix: "f", file: "x", timestamp: "2026-05-16T01:00:00.000Z", successCount: 1 },
    { key: "k2", fix: "f", file: "x", timestamp: "2026-05-16T05:00:00.000Z", successCount: 1 },
    { key: "k3", fix: "f", file: "x", timestamp: "2026-05-16T03:00:00.000Z", successCount: 1 },
  ];
  const sel = selectForDay(pairs, "2026-05-16", 1, 2);
  assert.equal(sel.length, 2);
  assert.equal(sel[0].key, "k2"); // 05:00 newest
  assert.equal(sel[1].key, "k3"); // 03:00 next
});

test("selectForDay: undated/invalid-timestamp pair is EXCLUDED, not re-dated to today", () => {
  // Arm B P2 lock: a fix with timestamp:"" must NOT be silently attributed to
  // today (which would re-emit it into every day's file forever + misdate it).
  const pairs = [
    { key: "a:b:c", fix: "real,sig", file: "x", timestamp: "", successCount: 1 },
    { key: "d:e:f", fix: "real,sig", file: "y", timestamp: "not-a-date", successCount: 1 },
    { key: "g:h:i", fix: "real,sig", file: "z", timestamp: "2026-05-16T02:00:00.000Z", successCount: 1 },
  ];
  const sel = selectForDay(pairs, "2026-05-16", 1, 60);
  assert.equal(sel.length, 1, "only the genuinely-2026-05-16-dated pair survives");
  assert.equal(sel[0].key, "g:h:i");
});

test("selectForDay: durability rule applied (placeholder sc1 dropped)", () => {
  const pairs = [
    { key: "a:b:c", fix: "code modification", file: "x", timestamp: "2026-05-16T01:00:00.000Z", successCount: 1 },
    { key: "d:e:f", fix: "async,await", file: "y", timestamp: "2026-05-16T02:00:00.000Z", successCount: 1 },
  ];
  const sel = selectForDay(pairs, "2026-05-16", 1, 60);
  assert.equal(sel.length, 1);
  assert.equal(sel[0].key, "d:e:f");
});

// ── formatRecord: YAML-injection + fence-escape + structure ───────────────
test("formatRecord: hostile error message cannot break frontmatter", () => {
  const hostile = 'x\n---\ninjected: true\nname: pwned';
  const pairs = [{
    key: `runtime:TypeError:${hostile}`, errorType: "runtime", errorCode: "TypeError",
    errorMsg: hostile, fix: "try-catch", file: "Bad.ts", timestamp: "2026-05-16T04:00:00.000Z", successCount: 1,
  }];
  const md = formatRecord("2026-05-16", pairs, COMMIT, NOW);
  const all = md.split("\n");
  // Exactly two `---` fence lines (open + close of the single frontmatter block).
  const fenceIdx = all.map((l, i) => (l === "---" ? i : -1)).filter((i) => i >= 0);
  assert.equal(fenceIdx.length, 2, "frontmatter must be a single block");
  // OPEN-ALLOWLIST: every top-level `key:` line inside the block must be an
  // expected key. This fails on ANY forged key (not just the two named in the
  // payload) — a YAML-parser-free proof of frontmatter integrity that a future
  // hand-rolled-quoter regression cannot slip past.
  const ALLOWED = new Set([
    "name", "description", "metadata", "source", "synced", "aliases",
    "day", "pair_count", "linked_commit",
  ]);
  const fmLines = all.slice(fenceIdx[0] + 1, fenceIdx[1]);
  for (const line of fmLines) {
    const m = line.match(/^([A-Za-z_][\w-]*):/);
    if (m) assert.ok(ALLOWED.has(m[1]), `unexpected/forged frontmatter key: ${m[1]}`);
  }
  // And the load-bearing values are exactly what we expect (not attacker-set).
  assert.ok(/^name: "error-fixes-2026-05-16"$/m.test(md), "name must be the safe slug");
  assert.ok(!/^injected:/m.test(md) && !/^role:/m.test(md), "no forged key at line start");
});

test("formatRecord: pasted triple-backtick in error message cannot escape fence", () => {
  const pairs = [{
    key: "a:b:c", errorType: "a", errorCode: "b",
    errorMsg: "before ``` ```` after", fix: "f", file: "x", timestamp: "2026-05-16T04:00:00.000Z", successCount: 1,
  }];
  const md = formatRecord("2026-05-16", pairs, COMMIT, NOW);
  // Structural containment (not just "a long fence exists somewhere"):
  // locate the detail "Error message:" block, take the FIRST fence run, and
  // prove (a) it out-lengths the 4-backtick payload run, (b) a CLOSING fence
  // of equal length exists after it, (c) the hostile payload sits strictly
  // BETWEEN them. A fencedBlock() regression (maxRun instead of maxRun+1)
  // fails (a)/(c) here even though a long fence may exist elsewhere.
  const detail = md.split("Error message:")[1];
  assert.ok(detail, "detail block present");
  const fence = detail.match(/`{4,}/)[0];
  assert.ok(fence.length >= 5, "fence must out-length the 4-backtick payload run");
  const open = detail.indexOf(fence);
  const close = detail.indexOf(fence, open + fence.length);
  assert.ok(close > open, "matching closing fence of equal length present");
  const payloadAt = detail.indexOf("before ```");
  assert.ok(payloadAt > open && payloadAt < close, "hostile payload is INSIDE the fence pair");
});

test("formatRecord: content-hash present and changes when a fix changes", () => {
  const base = [{ key: "a:b:c", errorType: "a", errorCode: "b", errorMsg: "m", fix: "f1", file: "x", timestamp: "2026-05-16T04:00:00.000Z", successCount: 1 }];
  const md1 = formatRecord("2026-05-16", base, COMMIT, NOW);
  const h1 = extractContentHash(md1);
  assert.ok(/^[0-9a-f]{16}$/.test(h1 || ""));
  // EVERY semantic input in the hash tuple must flip the hash — a refactor
  // that drops file/successCount/timestamp/sha/day from contentHash() would
  // make writeWithGuard false-skip a corrected learning (silent never-persist,
  // the exact failure this whole bridge exists to prevent).
  const flip = (mut, why) =>
    assert.notEqual(h1, extractContentHash(formatRecord("2026-05-16", [{ ...base[0], ...mut }], COMMIT, NOW)), why);
  flip({ fix: "f2" }, "fix change must flip hash");
  flip({ file: "OTHER.ts" }, "file change must flip hash");
  flip({ successCount: 99 }, "successCount change must flip hash");
  flip({ timestamp: "2026-05-16T09:00:00.000Z" }, "timestamp change must flip hash");
  assert.notEqual(h1, extractContentHash(formatRecord("2026-05-16", base, { sha: "fffffff" }, NOW)), "commit sha change must flip hash");
  assert.notEqual(h1, extractContentHash(formatRecord("2026-05-17", base, COMMIT, NOW)), "day change must flip hash");
  // Regenerated-at differing alone must NOT change the hash.
  const md3 = formatRecord("2026-05-16", base, COMMIT, "2026-05-16T23:59:59.999Z");
  assert.equal(h1, extractContentHash(md3), "regenerated-at is cosmetic, must not flip hash");
});

test("formatRecord: emits a markdown table row per pair", () => {
  const pairs = [
    { key: "a:b:c", errorType: "typescript", errorCode: "TS1", errorMsg: "m1", fix: "import", file: "A.ts", timestamp: "2026-05-16T01:00:00.000Z", successCount: 2 },
    { key: "d:e:f", errorType: "test", errorCode: "TEST_FAIL", errorMsg: "m2", fix: "async", file: "B.test.ts", timestamp: "2026-05-16T02:00:00.000Z", successCount: 1 },
  ];
  const md = formatRecord("2026-05-16", pairs, COMMIT, NOW);
  assert.ok(md.includes("| typescript:TS1 | import | A.ts | 2 |"));
  assert.ok(md.includes("| test:TEST_FAIL | async | B.test.ts | 1 |"));
});

// ── extractContentHash ────────────────────────────────────────────────────
test("extractContentHash: only matches a line-anchored marker", () => {
  assert.equal(extractContentHash("noise\n<!-- content-hash: deadbeef00000001 -->\nmore"), "deadbeef00000001");
  // Embedded mid-line marker-looking text must NOT be picked up.
  assert.equal(extractContentHash("prefix <!-- content-hash: cafebabe -->"), null);
  assert.equal(extractContentHash("no marker here"), null);
});

test("extractContentHash: returns the LAST marker (real trailing one wins over an embedded earlier one)", () => {
  // Arm A P2 lock: a hostile errorMsg could place `<!-- content-hash: X -->`
  // on its own line earlier in the body; the legitimate marker is always
  // appended at EOF. Last-match wins → no false idempotent-skip.
  const doc = [
    "<!-- content-hash: aaaaaaaaaaaaaaaa -->", // attacker-embedded, earlier
    "body",
    "<!-- content-hash: bbbbbbbbbbbbbbbb -->", // real, trailing
  ].join("\n");
  assert.equal(extractContentHash(doc), "bbbbbbbbbbbbbbbb");
});

test("formatRecord: pipe in attacker-controlled error type/code/file is escaped (table stays well-formed)", () => {
  const pairs = [{
    key: "a:b:c", errorType: "ty|pe", errorCode: "E|1",
    errorMsg: "m", fix: "fi|x", file: "a|b.ts", timestamp: "2026-05-16T01:00:00.000Z", successCount: 1,
  }];
  const md = formatRecord("2026-05-16", pairs, COMMIT, NOW);
  const row = md.split("\n").find((l) => l.startsWith("| ty"));
  assert.ok(row, "table row present");
  // Every literal `|` from the payload must be backslash-escaped; the only
  // UNescaped pipes in the row are the 5 column delimiters + leading/trailing.
  const unescaped = (row.match(/(?<!\\)\|/g) || []).length;
  assert.equal(unescaped, 6, "exactly the 6 cell delimiters remain unescaped");
});

// ── writeWithGuard idempotency ────────────────────────────────────────────
test("writeWithGuard: identical hash → skipped; changed → rewrite", () => {
  const f = path.join(os.tmpdir(), `efvb-guard-${process.pid}-${Date.now()}.md`);
  try {
    const a = formatRecord("2026-05-16", [{ key: "k", errorType: "t", errorCode: "c", errorMsg: "m", fix: "f1", file: "x", timestamp: "2026-05-16T01:00:00.000Z", successCount: 1 }], COMMIT, NOW);
    const r1 = writeWithGuard(f, a);
    assert.equal(r1.ok, true);
    const r2 = writeWithGuard(f, a);
    assert.equal(r2.skipped, "content_equal", "identical content-hash must skip");
    const b = formatRecord("2026-05-16", [{ key: "k", errorType: "t", errorCode: "c", errorMsg: "m", fix: "f2", file: "x", timestamp: "2026-05-16T01:00:00.000Z", successCount: 1 }], COMMIT, NOW);
    const r3 = writeWithGuard(f, b);
    assert.equal(r3.ok, true);
    assert.ok(!r3.skipped, "changed content-hash must rewrite");
    assert.ok(fs.readFileSync(f, "utf8").includes("| t:c | f2 |"));
  } finally {
    try { fs.unlinkSync(f); } catch { /* leak-proof even on a red assertion */ }
  }
});

// ── import-safety ─────────────────────────────────────────────────────────
test("module import does not execute main() / write the vault (isMain guard)", async () => {
  // STRONG lock (Arm B P1): point PRISM_ROOT at a temp tree containing a
  // TODAY-dated durable fix. The hook reads PRISM_ROOT at module top-level, so
  // a cachebusted dynamic import re-evaluates it. If the isMain guard ever
  // regressed (main() ran on import), main() would loadFixPairs() the temp
  // error-memory.json and writeWithGuard() an error-fixes-<today>.md into the
  // temp vault. We assert the vault dir is created-and/or-untouched: NO
  // error-fixes-*.md may appear from a mere import.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "efvb-root-"));
  const stateDir = path.join(root, "mcp-server", "data", "state");
  const vaultDir = path.join(root, "knowledge", "memories", "error-fixes");
  fs.mkdirSync(stateDir, { recursive: true });
  fs.mkdirSync(vaultDir, { recursive: true });
  fs.writeFileSync(path.join(stateDir, "error-memory.json"), JSON.stringify({
    fixes: {
      "typescript:TS2345:today durable": {
        fix: "type-alias,interface", file: "Foo.ts",
        timestamp: new Date().toISOString(), successCount: 3,
      },
    },
  }));
  const prev = process.env.PRISM_ROOT;
  process.env.PRISM_ROOT = root;
  try {
    const mod = await import(`../error-fix-vault-bridge.mjs?cachebust=${Date.now()}`);
    assert.equal(typeof mod.loadFixPairs, "function");
    assert.equal(typeof mod.formatRecord, "function");
    const written = fs.readdirSync(vaultDir).filter((f) => f.startsWith("error-fixes-"));
    assert.deepEqual(written, [], "import must NOT run main()/write the vault (isMain guard)");
  } finally {
    if (prev === undefined) delete process.env.PRISM_ROOT;
    else process.env.PRISM_ROOT = prev;
    try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
});
