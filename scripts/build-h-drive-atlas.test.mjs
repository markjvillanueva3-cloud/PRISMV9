// scripts/build-h-drive-atlas.test.mjs — real-value tests for the H: drive atlas.
// node:test. Classification is pure; markdown generation uses an injected fs so
// the test never touches the real H: drive.

import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyHDir, buildAtlasMarkdown } from "./build-h-drive-atlas.mjs";

// ── classifyHDir (pure) ──────────────────────────────────────────────────────
test("classifyHDir: the canonical repo + vault + obsidian app are real", () => {
  assert.equal(classifyHDir("PRISM").cls, "main-repo");
  assert.equal(classifyHDir("PRISM").real, true);
  assert.equal(classifyHDir("knowledge").cls, "vault");
  assert.equal(classifyHDir("OBSIDIAN").cls, "obsidian-app");
});
test("classifyHDir: slot + feature worktrees are clones (not real content)", () => {
  assert.equal(classifyHDir("prism-slot-bravo").cls, "slot-worktree");
  assert.equal(classifyHDir("prism-slot-bravo").real, false);
  assert.equal(classifyHDir("prism-cam-exhaust-ms0").cls, "feature-worktree");
  assert.equal(classifyHDir("prism-hotel-merge").cls, "feature-worktree");
  assert.equal(classifyHDir("prism-slot-bravo").real, false);
});
test("classifyHDir: real resource roots flagged real", () => {
  assert.equal(classifyHDir("Docustrata Test").cls, "resource");
  assert.equal(classifyHDir("Docustrata Test").real, true);
  assert.equal(classifyHDir("JMD AltracsTaptite").cls, "resource");
  assert.equal(classifyHDir("cad-engine").cls, "resource");
  assert.equal(classifyHDir("hermes-install").cls, "resource");
  assert.equal(classifyHDir("uploads").cls, "resource");
});
test("classifyHDir: data/state + tooling + caches classified, not real", () => {
  assert.equal(classifyHDir("data").cls, "data-state");
  assert.equal(classifyHDir("data").real, true); // data/state IS real runtime content
  assert.equal(classifyHDir("Tools").cls, "tooling");
  assert.equal(classifyHDir("Tools").real, false);
  assert.equal(classifyHDir(".venv").cls, "cache-state");
  assert.equal(classifyHDir(".hf-cache").cls, "cache-state");
  assert.equal(classifyHDir(".cache").real, false);
});
test("classifyHDir: system / recycle / recovered dirs", () => {
  assert.equal(classifyHDir("$RECYCLE.BIN").cls, "system");
  assert.equal(classifyHDir("System Volume Information").cls, "system");
  assert.equal(classifyHDir("found.000").cls, "system");
  assert.equal(classifyHDir("_ORPHAN-PRISM-MCP-SERVER-archived-20260421").cls, "archived");
});
test("classifyHDir: every result has cls + real + note shape", () => {
  for (const name of ["PRISM", "prism-slot-zulu", "weirdname", "temp", ".codex"]) {
    const c = classifyHDir(name);
    assert.equal(typeof c.cls, "string");
    assert.equal(typeof c.real, "boolean");
    assert.equal(typeof c.note, "string");
  }
  assert.equal(classifyHDir("totally-unknown-dir").cls, "other");
});

// ── buildAtlasMarkdown (injected fs — never touches real H:) ──────────────────
function fakeFs(dirs) {
  return {
    readdirSync(_p, opts) {
      if (opts && opts.withFileTypes) return dirs.map((name) => ({ name, isDirectory: () => true }));
      return ["a", "b", "c"]; // shallowCount → 3 for every dir
    },
  };
}

test("buildAtlasMarkdown: maps every top-level dir, grouped by class, with counts", () => {
  const dirs = ["PRISM", "knowledge", "Docustrata Test", "prism-slot-bravo", "prism-cam-ms1-93a0", ".venv", "$RECYCLE.BIN"];
  const { markdown, rows, counts } = buildAtlasMarkdown({ hRoot: "H:/", _fs: fakeFs(dirs), now: "2026-06-04" });
  assert.equal(counts.total, 7);
  assert.equal(counts.real, 3, "PRISM + knowledge + Docustrata are the 3 real roots");
  assert.equal(counts.worktrees, 2, "1 slot + 1 feature worktree");
  // master title + frontmatter + grouped sections + a real row
  assert.match(markdown, /# 🗺️ H: Drive Atlas/);
  assert.match(markdown, /title: H: Drive Atlas/);
  assert.match(markdown, /\| `H:\/PRISM` \| 3 \|/);
  assert.match(markdown, /Fleet-slot worktrees/);
  assert.match(markdown, /critical-resource-roots/, "points at the deep-indexed resource roots");
  assert.equal(rows.length, 7);
});

test("buildAtlasMarkdown: throws on an unreadable root (fail-loud)", () => {
  const badFs = { readdirSync() { throw new Error("ENOENT"); } };
  assert.throws(() => buildAtlasMarkdown({ hRoot: "X:/", _fs: badFs }), /cannot read H: root/);
});

test("buildAtlasMarkdown: empty drive → atlas with zero data rows (no throw)", () => {
  const { counts } = buildAtlasMarkdown({ hRoot: "H:/", _fs: fakeFs([]), now: "" });
  assert.equal(counts.total, 0);
});
