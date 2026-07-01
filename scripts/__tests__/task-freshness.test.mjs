// task-freshness.test.mjs — TASK-FRESHNESS-GATE-MS0/U-TFG01
//
// Hermetic suite (injected readers) + 2 real-data E2E (completed-unit →
// already-shipped; non-existent unit → fail-open). Per the
// RGS-TOOL-AUTOINVOKE-MS1 lesson: a pure-core + injected-readers design MUST
// ship a real-data E2E — hermetic fakes do not prove production wiring.
//
// Run: node --test H:/prism/scripts/__tests__/task-freshness.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  classifyTaskSource,
  readGenerationTimestamp,
  countActivitySince,
  decideFreshness,
  ackPath,
  acknowledgmentValid,
  writeAcknowledgment,
  evaluate,
} from "../../.claude/helpers/task-freshness.mjs";

const NOW = Date.parse("2026-05-18T00:00:00.000Z");
const HR = 3600 * 1000;

// Injected-reader factory: a fake fs/git surface.
function fakeReaders({ jsons = {}, stats = {}, git = null, bus = "" } = {}) {
  return {
    readJson: (p) => (p in jsons ? jsons[p] : null),
    statFile: (p) => (p in stats ? stats[p] : { exists: false, mtimeMs: 0 }),
    readText: (p) => (p in jsons ? JSON.stringify(jsons[p]) : null),
    gitLog: () => git,
    readChatBus: () => bus,
    now: () => NOW,
  };
}

// ── classifyTaskSource ────────────────────────────────────────────────────

test("classify: malformed unitId → unknown", () => {
  const r = classifyTaskSource("garbage", fakeReaders());
  assert.equal(r.kind, "unknown");
});

test("classify: well-formed but no envelope → unknown", () => {
  const r = classifyTaskSource("NOPE-MS9::U-X", fakeReaders());
  assert.equal(r.kind, "unknown");
  assert.equal(r.milestone, "NOPE-MS9");
});

test("classify: plain envelope present → envelope", () => {
  const mp = path.join("H:/prism/mcp-server/data/milestones", "FOO-MS0.json");
  const r = classifyTaskSource("FOO-MS0::U-A", {
    ...fakeReaders({ stats: { [mp]: { exists: true, mtimeMs: NOW } } }),
  });
  assert.equal(r.kind, "envelope");
  assert.equal(r.unit, "U-A");
});

test("classify: AUDIT envelope w/ contained source_audit → audit-spec", () => {
  const mp = path.join("H:/prism/mcp-server/data/milestones", "FEATURE-GAP-AUDIT-MS0.json");
  const ap = path.resolve("H:/prism/state/shared/specs/FEATURE-GAP-AUDIT-2026-05-17.md");
  const r = classifyTaskSource("FEATURE-GAP-AUDIT-MS0::U-G", {
    readJson: (p) => (p === mp ? { source_audit: "state/shared/specs/FEATURE-GAP-AUDIT-2026-05-17.md" } : null),
    statFile: (p) => ({ exists: p === mp || p === ap, mtimeMs: NOW }),
    readText: () => null,
    gitLog: () => null,
    readChatBus: () => "",
    now: () => NOW,
  });
  assert.equal(r.kind, "audit-spec");
  assert.equal(r.auditSpecPath, ap);
});

test("classify SECURITY: absolute source_audit escaping root → rejected (envelope only)", () => {
  const mp = path.join("H:/prism/mcp-server/data/milestones", "AUDIT-MS0.json");
  const r = classifyTaskSource("AUDIT-MS0::U-X", {
    readJson: (p) => (p === mp ? { source_audit: "C:/Windows/System32/evil.json" } : null),
    statFile: () => ({ exists: true, mtimeMs: NOW }),
    readText: () => null,
    gitLog: () => null,
    readChatBus: () => "",
    now: () => NOW,
  });
  assert.equal(r.kind, "envelope"); // traversal rejected → no auditSpecPath
  assert.equal(r.auditSpecPath, null);
});

test("classify SECURITY: ../ traversal in source_audit → rejected", () => {
  const mp = path.join("H:/prism/mcp-server/data/milestones", "GAP-MS0.json");
  const r = classifyTaskSource("GAP-MS0::U-X", {
    readJson: (p) => (p === mp ? { source_audit: "../../../Windows/x.json" } : null),
    statFile: () => ({ exists: true, mtimeMs: NOW }),
    readText: () => null,
    gitLog: () => null,
    readChatBus: () => "",
    now: () => NOW,
  });
  assert.equal(r.auditSpecPath, null);
});

// ── readGenerationTimestamp ───────────────────────────────────────────────

test("readGen: envelope.created_at wins; unit status extracted", () => {
  const mp = path.join("H:/prism/mcp-server/data/milestones", "M-MS0.json");
  const ref = classifyTaskSource("M-MS0::U-DONE", {
    ...fakeReaders({ stats: { [mp]: { exists: true, mtimeMs: NOW } } }),
  });
  const g = readGenerationTimestamp(ref, {
    readJson: () => ({
      created_at: "2026-05-10T12:00:00.000Z",
      units: [{ id: "U-DONE", status: "completed", completed_at: "2026-05-11T00:00:00Z" }],
    }),
    statFile: () => ({ exists: true, mtimeMs: NOW }),
    gitLog: () => null,
    now: () => NOW,
  });
  assert.equal(g.source, "envelope.created_at");
  assert.equal(g.trusted, true);
  assert.equal(g.unitStatus, "completed");
  assert.equal(g.unitCompletedAt, "2026-05-11T00:00:00Z");
});

test("readGen: no ts field, mtime fallback → trusted=false", () => {
  const mp = path.join("H:/prism/mcp-server/data/milestones", "N-MS0.json");
  const ref = classifyTaskSource("N-MS0::U-X", {
    ...fakeReaders({ stats: { [mp]: { exists: true, mtimeMs: NOW - 5 * HR } } }),
  });
  const g = readGenerationTimestamp(ref, {
    readJson: () => ({ units: [] }),
    statFile: () => ({ exists: true, mtimeMs: NOW - 5 * HR }),
    gitLog: () => null,
    now: () => NOW,
  });
  assert.equal(g.source, "file-mtime");
  assert.equal(g.trusted, false);
});

test("readGen: git-first-touch fallback when no in-file ts → trusted", () => {
  const mp = path.join("H:/prism/mcp-server/data/milestones", "G-MS0.json");
  const ref = classifyTaskSource("G-MS0::U-X", {
    ...fakeReaders({ stats: { [mp]: { exists: true, mtimeMs: NOW } } }),
  });
  const g = readGenerationTimestamp(ref, {
    readJson: () => ({ units: [] }),
    statFile: () => ({ exists: true, mtimeMs: NOW }),
    gitLog: () => "2026-05-15T00:00:00.000Z\n",
    now: () => NOW,
  });
  assert.equal(g.source, "git-first-touch");
  assert.equal(g.trusted, true);
});

test("readGen: unknown taskRef → finalize sets trusted=false, genIso null", () => {
  const g = readGenerationTimestamp({ kind: "unknown" }, fakeReaders());
  assert.equal(g.genIso, null);
  assert.equal(g.trusted, false);
});

test("readGen: audit-spec older than envelope governs (takes the older)", () => {
  const mp = path.join("H:/prism/mcp-server/data/milestones", "A-MS0.json");
  const ap = path.resolve("H:/prism/state/shared/specs/A-AUDIT-2026-05-01.md");
  const ref = {
    kind: "audit-spec",
    unitId: "A-MS0::U-X",
    milestone: "A-MS0",
    unit: "U-X",
    milestonePath: mp,
    auditSpecPath: ap,
  };
  const g = readGenerationTimestamp(ref, {
    readJson: (p) => (p === mp ? { created_at: "2026-05-16T00:00:00.000Z", units: [] } : null),
    statFile: (p) => ({ exists: true, mtimeMs: p === ap ? Date.parse("2026-05-01T00:00:00Z") : NOW }),
    gitLog: () => null,
    now: () => NOW,
  });
  // audit mtime (May 1) older than envelope created_at (May 16) → audit wins
  assert.equal(g.source, "audit-spec");
  assert.equal(g.genIso, "2026-05-01T00:00:00.000Z");
});

// ── countActivitySince ────────────────────────────────────────────────────

test("count: unparseable since → unprovable false, summary set", () => {
  const a = countActivitySince("not-a-date", fakeReaders());
  assert.equal(a.commitsCount, 0);
  assert.equal(a.unprovable, false);
  assert.match(a.summary, /unparseable/);
});

test("count: future since → zero activity", () => {
  const a = countActivitySince("2030-01-01T00:00:00.000Z", fakeReaders());
  assert.equal(a.commitsCount, 0);
  assert.match(a.summary, /future/);
});

test("count: git down → unprovable TRUE (P0 root cause)", () => {
  const a = countActivitySince("2026-05-17T00:00:00.000Z", fakeReaders({ git: null }));
  assert.equal(a.unprovable, true);
  assert.match(a.summary, /git log unavailable/);
});

test("count: git rows counted; envelope flips detected", () => {
  const git =
    "abc [MAIN] [X-MS0]/U-1: thing\n" +
    "def [MAIN] [Y-MS0]/ENVELOPE: flip envelope status=completed\n" +
    "ghi normal commit\n";
  const a = countActivitySince("2026-05-17T00:00:00.000Z", fakeReaders({ git }));
  assert.equal(a.commitsCount, 3);
  assert.equal(a.envelopeFlips, 1);
  assert.equal(a.unprovable, false);
});

test("count: peer ships parsed from chat-bus tail since cutoff", () => {
  const bus =
    JSON.stringify({ ts: "2026-05-16T00:00:00Z", type: "unit-ship", slot: "old", unit: "U-OLD" }) +
    "\n" +
    JSON.stringify({ ts: "2026-05-17T12:00:00Z", type: "unit-ship", slot: "alpha", unit: "U-NEW" }) +
    "\n";
  const a = countActivitySince("2026-05-17T00:00:00.000Z", fakeReaders({ git: "", bus }));
  assert.equal(a.peerShips.length, 1);
  assert.equal(a.peerShips[0].slot, "alpha");
});

// ── decideFreshness ───────────────────────────────────────────────────────

const THR = { staleHrs: 24, peerCommitsTrigger: 5 };
const freshAct = { commitsCount: 0, envelopeFlips: 0, peerShips: [], unprovable: false };

test("decide (a): unit status completed → already-shipped", () => {
  const v = decideFreshness({
    gen: { genIso: "2026-05-17T22:00:00Z", trusted: true, source: "envelope.created_at", unitStatus: "completed" },
    activity: freshAct,
    thresholds: THR,
    now: NOW,
  });
  assert.equal(v.stale, true);
  assert.equal(v.severity, "already-shipped");
});

test("decide (b): future genIso → gen-in-future (P1-1)", () => {
  const v = decideFreshness({
    gen: { genIso: "2030-01-01T00:00:00Z", trusted: true, source: "envelope.created_at" },
    activity: freshAct,
    thresholds: THR,
    now: NOW,
  });
  assert.equal(v.stale, true);
  assert.equal(v.severity, "gen-in-future");
});

test("decide (c): untrusted anchor → gen-anchor-untrusted (P1)", () => {
  const v = decideFreshness({
    gen: { genIso: "2026-05-17T23:00:00Z", trusted: false, source: "file-mtime" },
    activity: freshAct,
    thresholds: THR,
    now: NOW,
  });
  assert.equal(v.stale, true);
  assert.equal(v.severity, "gen-anchor-untrusted");
});

test("decide (d): trusted+recent but activity unprovable → freshness-unprovable (P0)", () => {
  const v = decideFreshness({
    gen: { genIso: "2026-05-17T23:00:00Z", trusted: true, source: "envelope.created_at" },
    activity: { commitsCount: 0, envelopeFlips: 0, peerShips: [], unprovable: true },
    thresholds: THR,
    now: NOW,
  });
  assert.equal(v.stale, true);
  assert.equal(v.severity, "freshness-unprovable");
});

test("decide (f): age > staleHrs → stale-by-age", () => {
  const v = decideFreshness({
    gen: { genIso: "2026-05-15T00:00:00Z", trusted: true, source: "envelope.created_at" }, // 72h
    activity: freshAct,
    thresholds: THR,
    now: NOW,
  });
  assert.equal(v.stale, true);
  assert.equal(v.severity, "stale-by-age");
});

test("decide (g): recent but >=peerTrig commits → stale-by-activity", () => {
  const v = decideFreshness({
    gen: { genIso: "2026-05-17T20:00:00Z", trusted: true, source: "envelope.created_at" }, // 4h
    activity: { commitsCount: 7, envelopeFlips: 0, peerShips: [], unprovable: false },
    thresholds: THR,
    now: NOW,
  });
  assert.equal(v.stale, true);
  assert.equal(v.severity, "stale-by-activity");
});

test("decide: fresh — recent + few commits", () => {
  const v = decideFreshness({
    gen: { genIso: "2026-05-17T22:00:00Z", trusted: true, source: "envelope.created_at" }, // 2h
    activity: { commitsCount: 2, envelopeFlips: 0, peerShips: [], unprovable: false },
    thresholds: THR,
    now: NOW,
  });
  assert.equal(v.stale, false);
  assert.equal(v.severity, "fresh");
});

test("decide boundary: exactly staleHrs (24h) is NOT stale (strict >)", () => {
  const v = decideFreshness({
    gen: { genIso: "2026-05-17T00:00:00.000Z", trusted: true, source: "envelope.created_at" },
    activity: freshAct,
    thresholds: THR,
    now: NOW, // exactly 24h
  });
  assert.equal(v.stale, false);
});

test("decide boundary: exactly peerTrig commits IS stale (inclusive >=)", () => {
  const v = decideFreshness({
    gen: { genIso: "2026-05-17T20:00:00Z", trusted: true, source: "envelope.created_at" },
    activity: { commitsCount: 5, envelopeFlips: 0, peerShips: [], unprovable: false },
    thresholds: THR,
    now: NOW,
  });
  assert.equal(v.stale, true);
  assert.equal(v.severity, "stale-by-activity");
});

test("decide: gen unresolved + activity → gen-unknown-with-activity (stale)", () => {
  const v = decideFreshness({
    gen: { genIso: null, trusted: false, source: "none" },
    activity: { commitsCount: 3, envelopeFlips: 0, peerShips: [], unprovable: false },
    thresholds: THR,
    now: NOW,
  });
  assert.equal(v.stale, true);
  assert.equal(v.severity, "gen-unknown-with-activity");
});

test("decide: gen unresolved + quiet → gen-unknown-quiet (allow)", () => {
  const v = decideFreshness({
    gen: { genIso: null, trusted: false, source: "none" },
    activity: freshAct,
    thresholds: THR,
    now: NOW,
  });
  assert.equal(v.stale, false);
  assert.equal(v.severity, "gen-unknown-quiet");
});

test("decide: NaN thresholds fall back to defaults (P1) — not all-fresh", () => {
  const v = decideFreshness({
    gen: { genIso: "2026-05-10T00:00:00Z", trusted: true, source: "envelope.created_at" }, // 192h
    activity: freshAct,
    thresholds: { staleHrs: "abc", peerCommitsTrigger: "xyz" },
    now: NOW,
  });
  assert.equal(v.threshold.staleHrs, 24);
  assert.equal(v.threshold.peerCommitsTrigger, 5);
  assert.equal(v.stale, true); // 192h > 24h default → still caught
});

// ── ack stamps ────────────────────────────────────────────────────────────

test("ackPath: :: sanitized to __ and stays in stampDir (no traversal)", () => {
  const dir = path.join(os.tmpdir(), "tfg-acktest");
  const p = ackPath("claude-x", "MS0::../../evil", dir);
  assert.ok(p.startsWith(path.resolve(dir) + path.sep) || p.startsWith(dir + path.sep) || path.dirname(p) === dir);
  assert.ok(!p.includes("::"));
  assert.ok(!path.basename(p).includes("/") && !path.basename(p).includes("\\"));
});

test("ack: write then valid within TTL; invalid after expiry", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tfg-ack-"));
  const written = writeAcknowledgment("claude-a", "M-MS0::U-1", { severity: "stale-by-age" }, {
    stampDir: dir,
    ttlMs: 60 * 1000,
    now: () => NOW,
  });
  assert.ok(written && fs.existsSync(written));
  assert.equal(
    acknowledgmentValid("claude-a", "M-MS0::U-1", { stampDir: dir, now: () => NOW + 30 * 1000 }),
    true
  );
  assert.equal(
    acknowledgmentValid("claude-a", "M-MS0::U-1", { stampDir: dir, now: () => NOW + 120 * 1000 }),
    false
  );
  fs.rmSync(dir, { recursive: true, force: true });
});

test("ack: missing stamp → invalid (not a throw)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tfg-ack2-"));
  assert.equal(acknowledgmentValid("nobody", "X::Y", { stampDir: dir, now: () => NOW }), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("FAIL-ON-REVERT: ackPath must never emit '::' or a path separator in the filename", () => {
  // If a future edit drops the sanitize() ::→__ + [^A-Za-z0-9_.-]→_ pass, an
  // ack file for "MS0::U-/x" could escape the stamp dir or collide. Pin it.
  const dir = "/tmp/x";
  const base = path.basename(ackPath("c::1", "A::B/../C", dir));
  assert.ok(!base.includes("::"), `'::' leaked into ack filename: ${base}`);
  assert.ok(!base.includes("/") && !base.includes("\\"), `separator in ack filename: ${base}`);
});

// ── evaluate (orchestrator, hermetic) ─────────────────────────────────────

test("evaluate: untrusted mtime anchor SKIPS the countActivitySince --since spawn (fork-storm fix)", () => {
  // readGenerationTimestamp legitimately makes ONE bounded git-first-touch
  // attempt (--diff-filter=A) trying to find a TRUSTED anchor before it gives
  // up to mtime. The fork-storm fix is that evaluate() must NOT then spawn the
  // SECOND git call — countActivitySince's `git log --since=...` — once the
  // anchor is known-untrusted. Assert on the call ARGS, not a blanket count.
  const calls = [];
  const r = evaluate("Q-MS0::U-X", {
    readJson: () => ({ units: [] }), // no ts field → git-first-touch then mtime
    statFile: () => ({ exists: true, mtimeMs: NOW - 50 * HR }),
    gitLog: (args) => {
      calls.push(args);
      return null; // first-touch returns nothing → falls to mtime (untrusted)
    },
    readChatBus: () => "",
    now: () => NOW,
  });
  const sinceCalls = calls.filter((a) => a.some((x) => String(x).startsWith("--since")));
  const firstTouch = calls.filter((a) => a.includes("--diff-filter=A"));
  assert.equal(sinceCalls.length, 0, "countActivitySince --since must NOT spawn for an untrusted anchor");
  assert.equal(firstTouch.length, 1, "exactly one bounded git-first-touch resolution attempt is expected");
  assert.equal(r.verdict.severity, "gen-anchor-untrusted");
  assert.equal(r.verdict.stale, true);
});

test("evaluate: trusted in-file anchor DOES spawn countActivitySince --since (control)", () => {
  // Contrast with the fork-storm test: a trusted envelope.created_at anchor
  // SHOULD spawn the activity --since call (that's the legitimate slow path).
  const calls = [];
  evaluate("R-MS0::U-X", {
    readJson: () => ({ created_at: "2026-05-16T00:00:00.000Z", units: [] }),
    statFile: () => ({ exists: true, mtimeMs: NOW }),
    gitLog: (args) => {
      calls.push(args);
      return "";
    },
    readChatBus: () => "",
    now: () => NOW,
  });
  const sinceCalls = calls.filter((a) => a.some((x) => String(x).startsWith("--since")));
  assert.equal(sinceCalls.length, 1, "trusted anchor must spawn exactly one activity --since call");
});

// ── REAL-DATA E2E (RGS-MS1 lesson — proves production wiring) ──────────────

test("real-data E2E: a known-completed unit in a live envelope → already-shipped", () => {
  // U-GAP-MILL-FFT-CHATTER is status:completed in the live
  // FEATURE-GAP-AUDIT-MS0.json (committed in the working tree). This drives
  // the REAL production readers (fs + git) — no injection.
  const envPath = "H:/prism/mcp-server/data/milestones/FEATURE-GAP-AUDIT-MS0.json";
  if (!fs.existsSync(envPath)) {
    // Fail loud, do not silently pass — the oracle requires this file.
    assert.fail(`real-data E2E precondition missing: ${envPath} not found`);
  }
  const env = JSON.parse(fs.readFileSync(envPath, "utf8"));
  // Predicate MUST mirror the helper's own already-shipped regex
  // (/^(completed|done|shipped|closed)$/i) so the oracle never silently
  // no-ops if a future envelope only has `closed` units (scrutiny P2).
  const completed = (env.units || []).find((u) => u && /^(completed|done|shipped|closed)$/i.test(u.status || ""));
  assert.ok(completed, "expected at least one completed/closed unit in the live audit envelope");
  const ev = evaluate(`FEATURE-GAP-AUDIT-MS0::${completed.id}`);
  assert.equal(ev.verdict.stale, true, `live completed unit ${completed.id} must read STALE`);
  assert.equal(ev.verdict.severity, "already-shipped");
  assert.equal(ev.gen.unitStatus, completed.status);
});

test("real-data E2E: a non-existent unit fails open (kind=unknown, not stale)", () => {
  const ev = evaluate("DOES-NOT-EXIST-MS9::U-PHANTOM");
  assert.equal(ev.taskRef.kind, "unknown");
  assert.equal(ev.verdict.stale, false); // fail-open: nothing to compare → allow
});
