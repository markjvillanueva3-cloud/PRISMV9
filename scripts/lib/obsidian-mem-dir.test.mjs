// Tests for obsidian-mem-dir.mjs — the single-source resolver for the
// canonical Obsidian memory directory used by the post-ship retention
// pipeline. Real assertions on precedence + the homedir-derived default that
// fixes the dead foreign-machine path bug (R9 — assert the resolved path,
// not toBeDefined).
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { resolveObsidianMemDir } from "./obsidian-mem-dir.mjs";

const homeDerived = path.join(os.homedir(), ".claude", "projects", "H--prism", "memory");

test("env absent → homedir-derived default (the fix: no hardcoded username)", () => {
  const got = resolveObsidianMemDir({});
  assert.equal(got, homeDerived);
  // The bug was a literal `C:/Users/Mark Villanueva/...` — the default must
  // never name a user, and must use the lowercase `H--prism` real dir.
  assert.ok(!/Mark Villanueva/.test(got), "default must not name a foreign user");
  assert.ok(got.includes("H--prism"), "default uses the real lowercase dir name");
});

test("default contains THIS machine's home (resolved live, not hardcoded)", () => {
  const got = resolveObsidianMemDir({});
  assert.ok(got.startsWith(os.homedir()), `default ${got} must be under ${os.homedir()}`);
});

test("PRISM_OBSIDIAN_MEM_DIR takes top precedence (legacy override preserved)", () => {
  const got = resolveObsidianMemDir({ PRISM_OBSIDIAN_MEM_DIR: "D:/legacy/mem" });
  assert.equal(got, "D:/legacy/mem");
});

test("PRISM_MEMORY_DIR honored when the legacy var is absent (unifies recall consumers)", () => {
  const got = resolveObsidianMemDir({ PRISM_MEMORY_DIR: "E:/unified/mem" });
  assert.equal(got, "E:/unified/mem");
});

test("PRISM_OBSIDIAN_MEM_DIR beats PRISM_MEMORY_DIR when both set", () => {
  const got = resolveObsidianMemDir({ PRISM_OBSIDIAN_MEM_DIR: "D:/legacy", PRISM_MEMORY_DIR: "E:/unified" });
  assert.equal(got, "D:/legacy");
});

test("empty / whitespace override is ignored → falls through to default (no blank-path foot-gun)", () => {
  assert.equal(resolveObsidianMemDir({ PRISM_OBSIDIAN_MEM_DIR: "" }), homeDerived);
  assert.equal(resolveObsidianMemDir({ PRISM_OBSIDIAN_MEM_DIR: "   " }), homeDerived);
  assert.equal(resolveObsidianMemDir({ PRISM_MEMORY_DIR: "  " }), homeDerived);
});

test("override is trimmed (stray newline/space from a shell export can't break path.join)", () => {
  assert.equal(resolveObsidianMemDir({ PRISM_OBSIDIAN_MEM_DIR: "  D:/x/mem \n" }), "D:/x/mem");
});

test("defaults to process.env when no arg given (does not throw)", () => {
  const got = resolveObsidianMemDir();
  assert.ok(typeof got === "string" && got.length > 0);
});
