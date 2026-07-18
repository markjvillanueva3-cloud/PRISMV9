#!/usr/bin/env node
// Tests for audit-hook-wiring-dedup.mjs (node:test, no vitest dep -- same pattern as md-to-html.test.mjs)
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCommand, baseName, classifyWire } from "./audit-hook-wiring-dedup.mjs";

// ---- normalizeCommand: happy paths ----
test("portable-node quoted wrapper resolves script path", () => {
  const n = normalizeCommand('"H:/.claude/bin/portable-node" H:/prism/.claude/hooks/skill-auto-trigger.mjs');
  assert.equal(n.kind, "script");
  assert.equal(n.path, "h:/prism/.claude/hooks/skill-auto-trigger.mjs");
  assert.equal(n.args, "");
});

test("bare node with quoted script path", () => {
  const n = normalizeCommand('node "H:/prism/.claude/hooks/session-handoff-load.mjs"');
  assert.equal(n.kind, "script");
  assert.equal(baseName(n.path), "session-handoff-load.mjs");
});

test("env-var prefix is stripped (READ_ONCE_MODE=post ...)", () => {
  const n = normalizeCommand('READ_ONCE_MODE=post "H:/.claude/bin/portable-node" H:/prism/.claude/helpers/read-once-cache.mjs');
  assert.equal(n.kind, "script");
  assert.equal(baseName(n.path), "read-once-cache.mjs");
});

test("trailing args are preserved (--pre)", () => {
  const n = normalizeCommand('"H:/.claude/bin/portable-node" H:/prism/.claude/hooks/precompact-auto-trigger.mjs --pre');
  assert.equal(n.args, "--pre");
});

test("node -e comment is classified tombstone", () => {
  const n = normalizeCommand('"H:/.claude/bin/portable-node" -e "/* retired */ process.exit(0)"');
  assert.equal(n.kind, "tombstone");
  assert.equal(n.path, null);
});

test("async-hook-enqueue wrapper surfaces the wrapped hook as identity", () => {
  const n = normalizeCommand('"H:/.claude/bin/portable-node" H:/prism/.claude/helpers/async-hook-enqueue.mjs --hook H:/prism/.claude/hooks/git-sync-stop.mjs --tier T4 --event Stop');
  assert.equal(n.kind, "async-wrapped");
  assert.equal(baseName(n.path), "git-sync-stop.mjs");
});

// ---- normalizeCommand: failure modes + adversarial ----
test("empty / null / whitespace commands are kind=empty", () => {
  for (const v of ["", null, undefined, "   "]) {
    assert.equal(normalizeCommand(v).kind, "empty", `input: ${JSON.stringify(v)}`);
  }
});

test("non-string input does not throw", () => {
  assert.equal(normalizeCommand(42).kind, "empty");
  assert.equal(normalizeCommand({}).kind, "empty");
});

test("oversize command string does not throw and still resolves", () => {
  const big = '"H:/.claude/bin/portable-node" H:/x/y.mjs ' + "z".repeat(50000);
  const n = normalizeCommand(big);
  assert.equal(n.kind, "script");
  assert.equal(baseName(n.path), "y.mjs");
});

test("backslash windows path is normalized to forward slashes", () => {
  const n = normalizeCommand('node H:\\prism\\.claude\\hooks\\foo.mjs');
  assert.equal(n.path, "h:/prism/.claude/hooks/foo.mjs");
});

// ---- baseName ----
test("baseName handles null and plain names", () => {
  assert.equal(baseName(null), null);
  assert.equal(baseName("a/b/c.mjs"), "c.mjs");
  assert.equal(baseName("c.mjs"), "c.mjs");
});

// ---- classifyWire reference matrix ----
const W = (over = {}) => ({ kind: "script", base: "x.mjs", command: "node x.mjs", timeout: 3, ...over });

test("tombstone wins over everything", () => {
  const r = classifyWire(W({ kind: "tombstone" }), { layerName: "project", dupInUser: [], inBundles: [], isBundleEntry: false, sigExists: true });
  assert.equal(r.verdict, "REMOVE_TOMBSTONE_SPAWN");
});

test("project dup with IDENTICAL command string is FREE (harness dedupes)", () => {
  const r = classifyWire(W(), { layerName: "project", dupInUser: [{ command: "node x.mjs" }], inBundles: [], isBundleEntry: false, sigExists: true });
  assert.equal(r.verdict, "PROJECT_DUP_FREE");
});

test("project dup with DIFFERENT command string is LIVE double-run", () => {
  const r = classifyWire(W(), { layerName: "project", dupInUser: [{ command: '"H:/.claude/bin/portable-node" x.mjs' }], inBundles: [], isBundleEntry: false, sigExists: true });
  assert.equal(r.verdict, "PROJECT_DUP_LIVE");
});

test("standalone wire of a bundle-absorbed hook is BUNDLE_DOUBLE_RUN", () => {
  const r = classifyWire(W(), { layerName: "userC", dupInUser: [], inBundles: ["stop-bundle.mjs"], isBundleEntry: false, sigExists: true });
  assert.equal(r.verdict, "BUNDLE_DOUBLE_RUN");
});

test("async-wrapped hook absorbed by a wired bundle is also BUNDLE_DOUBLE_RUN", () => {
  const r = classifyWire(W({ kind: "async-wrapped" }), { layerName: "project", dupInUser: [], inBundles: ["stop-bundle.mjs"], isBundleEntry: false, sigExists: true });
  assert.equal(r.verdict, "BUNDLE_DOUBLE_RUN");
});

test("missing file is surfaced, not silently kept", () => {
  const r = classifyWire(W(), { layerName: "userC", dupInUser: [], inBundles: [], isBundleEntry: false, sigExists: false });
  assert.equal(r.verdict, "MISSING_FILE");
});

test("unique wired hook is UNIQUE_KEEP", () => {
  const r = classifyWire(W(), { layerName: "userC", dupInUser: [], inBundles: [], isBundleEntry: false, sigExists: true });
  assert.equal(r.verdict, "UNIQUE_KEEP");
});
