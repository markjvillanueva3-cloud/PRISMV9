#!/usr/bin/env node
/**
 * Tests for fix-detached-windowshide.mjs -- the detached-spawn windowsHide remediation.
 * Run: node scripts/fix-detached-windowshide.test.mjs   (node:test auto-runs on exit)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fixSource, countBare, TARGETS } from "./fix-detached-windowshide.mjs";

test("single-line options object gets windowsHide inserted after detached", () => {
  const src = `const c = spawn(node, [s], { cwd: ROOT, detached: true, stdio: "ignore" });`;
  const { next, count } = fixSource(src);
  assert.equal(count, 1);
  assert.match(next, /detached: true, windowsHide: true, stdio: "ignore"/);
});

test("multi-line options object: windowsHide added on the detached line", () => {
  const src = [
    "const child = spawn(process.execPath, [s], {",
    "        detached: true,",
    '        stdio: "ignore",',
    "      });",
  ].join("\n");
  const { next, count } = fixSource(src);
  assert.equal(count, 1);
  assert.match(next, /detached: true, windowsHide: true,/);
  // stdio line must be untouched / still present
  assert.match(next, /stdio: "ignore",/);
});

test("detached AFTER stdio in the object still gets fixed", () => {
  const src = `{ cwd: ROOT, stdio: "ignore", detached: true, }`;
  const { next, count } = fixSource(src);
  assert.equal(count, 1);
  assert.match(next, /detached: true, windowsHide: true,/);
});

test("idempotent: a second pass over already-fixed source is a no-op", () => {
  const src = `spawn(n, a, { detached: true, stdio: "ignore" });`;
  const once = fixSource(src).next;
  const { next, count } = fixSource(once);
  assert.equal(count, 0, "already-hidden source must not be touched again");
  assert.equal(next, once);
});

test("does not double-add when windowsHide already present (any order after detached)", () => {
  const src = `spawn(n, a, { detached: true, windowsHide: true, stdio: "ignore" });`;
  const { count } = fixSource(src);
  assert.equal(count, 0);
});

test("spawn-function-name agnostic: _spawn and spawnImpl are covered (anchors on detached, not the fn)", () => {
  const a = `const c = _spawn(process.execPath, args, { detached: true, stdio: "ignore" });`;
  const b = `const c = spawnImpl(process.execPath, ["-e", js], { detached: true, stdio: "ignore" });`;
  assert.equal(fixSource(a).count, 1);
  assert.equal(fixSource(b).count, 1);
  assert.match(fixSource(a).next, /detached: true, windowsHide: true/);
  assert.match(fixSource(b).next, /detached: true, windowsHide: true/);
});

test("intentional windowsHide:false is left alone (driver that needs a visible window)", () => {
  // A site that already declares windowsHide (even false) is not a bare detached site,
  // BUT our anchor is `detached: true` so we must ensure we never strip/override an
  // existing windowsHide. The replace only APPENDS, so windowsHide:false survives and
  // a second windowsHide is not introduced when it already follows.
  const src = `spawn(exe, args, { detached: true, windowsHide: false });`;
  const { count } = fixSource(src);
  assert.equal(count, 0, "detached followed by windowsHide must not be re-touched");
});

test("comment prose mentioning (detached) without the literal is not matched", () => {
  const src = `// launches the sweep DETACHED (spawn(..., {detached:true}).unref())\nconst x = 1;`;
  // This DOES contain the literal `detached:true` inside the comment example, so it
  // WOULD match -- which is exactly why the production TARGETS allowlist excludes the
  // two comment-only files (fleet-reaper-stop, stop_close_prism_nodes_v2). Assert the
  // raw transform behavior so the allowlist's necessity is documented by test.
  const { count } = fixSource(src);
  assert.equal(count, 1, "raw transform matches comment literals -> allowlist must exclude comment-only files");
});

test("the comment-only false-positive files are NOT in the TARGETS allowlist", () => {
  assert.ok(!TARGETS.some((t) => t.includes("fleet-reaper-stop")), "fleet-reaper-stop has windowsHide at the real site");
  assert.ok(!TARGETS.some((t) => t.includes("stop_close_prism_nodes_v2")), "stop_close_prism_nodes_v2 detached is comment-only");
});

test("countBare reports remaining bare detached sites", () => {
  assert.equal(countBare(`{ detached: true, stdio: "x" }`), 1);
  assert.equal(countBare(`{ detached: true, windowsHide: true }`), 0);
  assert.equal(countBare(`no spawn here`), 0);
});

test("TARGETS is a non-empty, de-duplicated allowlist", () => {
  assert.ok(TARGETS.length >= 18);
  assert.equal(TARGETS.length, new Set(TARGETS).size, "no duplicate target paths");
});
