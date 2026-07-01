// scripts/bridge-status-resolver.test.mjs
// Tests for U-BRIDGE-STATUS-RESOLVER. Run: node --test scripts/bridge-status-resolver.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const {
  parseBridgeSubject,
  groupByBridgeUnit,
  buildEnvelope,
  writeEnvelope,
} = await import("./bridge-status-resolver.mjs");

// ─── parseBridgeSubject ────────────────────────────────────────────────────
test("parseBridgeSubject: matches [MAIN] [BRIDGE-SYNERGY-MS0]/U-X format", () => {
  const got = parseBridgeSubject("[MAIN] [BRIDGE-SYNERGY-MS0]/U-BRIDGE-MASTERPOST-CAM: test");
  assert.deepEqual(got, { milestone: "BRIDGE-SYNERGY-MS0", unitId: "U-BRIDGE-MASTERPOST-CAM" });
});

test("parseBridgeSubject: matches POST-BRIDGE-SYNERGY-MS0 (BRIDGE inside)", () => {
  const got = parseBridgeSubject(
    "[SLOT-OSCAR] [POST-BRIDGE-SYNERGY-MS0]/U-EMIT-MAHALANOBIS-OOD-GATE: title",
  );
  assert.equal(got.milestone, "POST-BRIDGE-SYNERGY-MS0");
  assert.equal(got.unitId, "U-EMIT-MAHALANOBIS-OOD-GATE");
});

test("parseBridgeSubject: matches when BRIDGE only in second [scope] (single-bracket variants)", () => {
  const got = parseBridgeSubject("[BRIDGE-X-MS0]/U-FOO: subject");
  assert.deepEqual(got, { milestone: "BRIDGE-X-MS0", unitId: "U-FOO" });
});

test("parseBridgeSubject: returns null for non-bridge commits", () => {
  assert.equal(parseBridgeSubject("[MAIN] [GOAL-TSC-FIX]/U-X: not a bridge"), null);
  assert.equal(parseBridgeSubject("plain commit message"), null);
  assert.equal(parseBridgeSubject(""), null);
});

test("parseBridgeSubject: rejects non-string input", () => {
  assert.equal(parseBridgeSubject(null), null);
  assert.equal(parseBridgeSubject(undefined), null);
  assert.equal(parseBridgeSubject(42), null);
});

// ─── groupByBridgeUnit ─────────────────────────────────────────────────────
test("groupByBridgeUnit: groups commits by (milestone, unitId) with shipped_commits", () => {
  const commits = [
    { sha: "abc", ts: "2026-05-25T10:00:00.000Z", subject: "[MAIN] [BRIDGE-SYNERGY-MS0]/U-A: first" },
    { sha: "def", ts: "2026-05-26T10:00:00.000Z", subject: "[MAIN] [BRIDGE-SYNERGY-MS0]/U-A: amend" },
    { sha: "ghi", ts: "2026-05-27T10:00:00.000Z", subject: "[MAIN] [BRIDGE-SYNERGY-MS0]/U-B: other unit" },
    { sha: "xxx", ts: "2026-05-27T11:00:00.000Z", subject: "[MAIN] [GOAL-TSC-FIX]/U-Z: skipped — no BRIDGE" },
  ];
  const map = groupByBridgeUnit(commits);
  assert.equal(map.size, 2);

  const a = map.get("BRIDGE-SYNERGY-MS0::U-A");
  assert.ok(a);
  assert.equal(a.commit_count, 2);
  assert.equal(a.shipped_commits.length, 2);
  assert.equal(a.status, "completed_real");
  assert.equal(a.first_shipped, "2026-05-25T10:00:00.000Z");
  assert.equal(a.last_shipped, "2026-05-26T10:00:00.000Z");

  const b = map.get("BRIDGE-SYNERGY-MS0::U-B");
  assert.equal(b.commit_count, 1);
  assert.equal(b.first_shipped, b.last_shipped);
});

test("groupByBridgeUnit: empty commits → empty map", () => {
  assert.equal(groupByBridgeUnit([]).size, 0);
});

test("groupByBridgeUnit: only non-bridge commits → empty map (filters cleanly)", () => {
  const commits = [
    { sha: "x", ts: "2026-05-27T10:00:00.000Z", subject: "[MAIN] [GOAL-TSC-FIX]/U-Z: nope" },
  ];
  assert.equal(groupByBridgeUnit(commits).size, 0);
});

// ─── buildEnvelope ─────────────────────────────────────────────────────────
test("buildEnvelope: assembles canonical schema with sorted bridges (last_shipped desc)", () => {
  const commits = [
    { sha: "a", ts: "2026-05-01T00:00:00.000Z", subject: "[BRIDGE-OLD]/U-A: ancient" },
    { sha: "b", ts: "2026-05-27T00:00:00.000Z", subject: "[BRIDGE-NEW]/U-B: recent" },
    { sha: "c", ts: "2026-05-15T00:00:00.000Z", subject: "[BRIDGE-MID]/U-C: middle" },
  ];
  const env = buildEnvelope(commits, { limit: 100 });
  assert.equal(env.schemaVersion, 1);
  assert.match(env.refreshedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(env.source, "git log --grep=BRIDGE-");
  assert.equal(env.scannedCommits, 3);
  assert.equal(env.resolvedCount, 3);
  // Sort order: newest last_shipped first
  assert.equal(env.bridges[0].milestone, "BRIDGE-NEW");
  assert.equal(env.bridges[1].milestone, "BRIDGE-MID");
  assert.equal(env.bridges[2].milestone, "BRIDGE-OLD");
});

test("buildEnvelope: empty commits → resolvedCount=0", () => {
  const env = buildEnvelope([]);
  assert.equal(env.scannedCommits, 0);
  assert.equal(env.resolvedCount, 0);
  assert.deepEqual(env.bridges, []);
});

// ─── writeEnvelope ─────────────────────────────────────────────────────────
test("writeEnvelope: creates parent dir + writes JSON", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bridge-resolver-test-"));
  const out = path.join(dir, "nested", "bridge-status-resolved.json");
  const env = buildEnvelope([
    { sha: "x", ts: "2026-05-27T00:00:00.000Z", subject: "[BRIDGE-TEST]/U-X: y" },
  ]);
  const written = writeEnvelope(env, out);
  assert.equal(written, out);
  const parsed = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.resolvedCount, 1);
  assert.equal(parsed.bridges[0].milestone, "BRIDGE-TEST");
});

// ─── variability ──────────────────────────────────────────────────────────
test("variability: 5 distinct bridge scope variants all parse + group correctly", () => {
  const variants = [
    "[MAIN] [BRIDGE-SYNERGY-MS0]/U-A: classic",
    "[SLOT-ECHO] [POST-BRIDGE-SYNERGY-MS0]/U-B: post-bridge variant",
    "[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-C: triple-prefix",
    "[BRIDGE-MS3]/U-D: bare single-bracket",
    "[MAIN] [DEEP-BRIDGE-INTEGRATION-MS0]/U-E: middle-of-name match",
  ];
  const commits = variants.map((s, i) => ({
    sha: `sha${i}`,
    ts: `2026-05-${20 + i}T00:00:00.000Z`,
    subject: s,
  }));
  const env = buildEnvelope(commits);
  assert.equal(env.scannedCommits, 5);
  assert.equal(env.resolvedCount, 5);
  // Each gets its own (milestone, unitId) key
  const milestones = env.bridges.map((b) => b.milestone).sort();
  assert.deepEqual(milestones, [
    "BRIDGE-MS3",
    "BRIDGE-SYNERGY-MS0",
    "DEEP-BRIDGE-INTEGRATION-MS0",
    "POST-BRIDGE-SYNERGY-MS0",
    "POST-BRIDGE-SYNERGY-MS0",
  ]);
});
