// Tests for cad-corpus-topology-audit.mjs (U-CADGEN-CORPUS-TOPOLOGY-AUDIT, slot:delta 2026-07-04).
// node:test. The kernel validity + real-corpus run are exercised live (found 2 invalid parts:
// "Body 1.step", "Full Part.step" of 38 scanned). These pin the bounded recursive STEP-file scan
// hermetically (injected readdir): it collects only .step/.stp, recurses subdirs, skips node_modules/.git,
// and honors --limit (so a huge tree can't run away).
//   run: node --test scripts/cad-corpus-topology-audit.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { collectStepFiles } from "./cad-corpus-topology-audit.mjs";

const dirent = (name, isDir) => ({ name, isDirectory: () => isDir, isFile: () => !isDir });

// A fake tree: /root has a.step, b.stp, notes.txt, sub/ and node_modules/; /root/sub has c.step;
// /root/node_modules has ignored.step (must be skipped).
function fakeReaddir() {
  return (dir) => {
    const d = String(dir).replace(/\\/g, "/");
    if (d.endsWith("/root")) return [dirent("a.step", false), dirent("b.stp", false), dirent("notes.txt", false), dirent("sub", true), dirent("node_modules", true)];
    if (d.endsWith("/root/sub")) return [dirent("c.step", false)];
    if (d.endsWith("/root/node_modules")) return [dirent("ignored.step", false)];
    return [];
  };
}

test("collectStepFiles gathers .step/.stp across subdirs, skips non-step + node_modules/.git", () => {
  const files = collectStepFiles("/root", { readdir: fakeReaddir() }).map((p) => p.replace(/\\/g, "/"));
  assert.equal(files.length, 3, "a.step + b.stp + sub/c.step");
  assert.ok(files.some((f) => f.endsWith("/root/a.step")));
  assert.ok(files.some((f) => f.endsWith("/root/b.stp")));
  assert.ok(files.some((f) => f.endsWith("/root/sub/c.step")));
  assert.ok(!files.some((f) => f.includes("notes.txt")), "non-step excluded");
  assert.ok(!files.some((f) => f.includes("node_modules")), "node_modules skipped");
});

test("collectStepFiles honors --limit (bounded scan)", () => {
  const files = collectStepFiles("/root", { readdir: fakeReaddir(), limit: 2 });
  assert.equal(files.length, 2, "capped at the limit so a huge tree cannot run away");
});

test("collectStepFiles on an unreadable/empty root returns [] (no throw)", () => {
  assert.deepEqual(collectStepFiles("/nope", { readdir: () => { throw new Error("ENOENT"); } }), []);
  assert.deepEqual(collectStepFiles("/empty", { readdir: () => [] }), []);
});
