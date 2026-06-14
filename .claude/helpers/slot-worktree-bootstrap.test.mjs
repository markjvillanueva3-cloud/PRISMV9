// slot-worktree-bootstrap.test.mjs — pure-core tests with injected deps.
// Run: node --test H:/prism/.claude/helpers/slot-worktree-bootstrap.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  worktreeDirForSlot,
  branchNameForSlot,
  inspectWorktreeDir,
  classifyBootstrapAction,
  readChatSlots,
  buildSlotBranchUpdate,
  writeChatSlotsAtomic,
  bootstrapSlot,
  detectUncommittedShared,
} from "./slot-worktree-bootstrap.mjs";

function tmpDir() {
  const d = join(tmpdir(), `prism-slot-bootstrap-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(d, { recursive: true });
  return d;
}

// ── Pure helpers ──

test("worktreeDirForSlot: returns the conventional path", () => {
  assert.equal(worktreeDirForSlot("golf"), "H:/prism-slot-golf");
  assert.equal(worktreeDirForSlot("GOLF"), "H:/prism-slot-golf"); // lowercase
  assert.equal(worktreeDirForSlot("alpha"), "H:/prism-slot-alpha");
});

test("worktreeDirForSlot: null/empty returns null", () => {
  assert.equal(worktreeDirForSlot(null), null);
  assert.equal(worktreeDirForSlot(""), null);
  assert.equal(worktreeDirForSlot(undefined), null);
});

test("branchNameForSlot: returns slot/<name>", () => {
  assert.equal(branchNameForSlot("golf"), "slot/golf");
  assert.equal(branchNameForSlot("Alpha"), "slot/alpha");
});

// ── inspectWorktreeDir ──

test("inspectWorktreeDir: missing dir returns exists:false", () => {
  const r = inspectWorktreeDir("/no/such/path", {
    existsSync: () => false,
    readdirSync: () => [],
  });
  assert.equal(r.exists, false);
  assert.equal(r.hasGit, false);
  assert.equal(r.scratchFileCount, 0);
});

test("inspectWorktreeDir: dir with .git is fully bootstrapped", () => {
  const r = inspectWorktreeDir("/some/path", {
    existsSync: (p) => p === "/some/path" || p === "/some/path/.git",
    readdirSync: () => [".git", "README.md", "src"],
  });
  assert.equal(r.exists, true);
  assert.equal(r.hasGit, true);
  assert.equal(r.scratchFileCount, 2); // README.md + src
});

test("inspectWorktreeDir: dir with scratch but no .git", () => {
  const r = inspectWorktreeDir("/some/path", {
    existsSync: (p) => p === "/some/path",
    readdirSync: () => ["leftover.txt", "scratch"],
  });
  assert.equal(r.exists, true);
  assert.equal(r.hasGit, false);
  assert.equal(r.scratchFileCount, 2);
});

test("inspectWorktreeDir: empty dir", () => {
  const r = inspectWorktreeDir("/some/path", {
    existsSync: (p) => p === "/some/path",
    readdirSync: () => [],
  });
  assert.equal(r.exists, true);
  assert.equal(r.hasGit, false);
  assert.equal(r.scratchFileCount, 0);
});

// ── classifyBootstrapAction ──

test("classifyBootstrapAction: already-bootstrapped returns noop", () => {
  const r = classifyBootstrapAction("golf", { exists: true, hasGit: true, scratchFileCount: 5, scratchFiles: [] });
  assert.equal(r.action, "noop");
  assert.equal(r.reason, "already-bootstrapped");
});

test("classifyBootstrapAction: missing dir → would-bootstrap", () => {
  const r = classifyBootstrapAction("golf", { exists: false, hasGit: false, scratchFileCount: 0, scratchFiles: [] });
  assert.equal(r.action, "would-bootstrap");
  assert.equal(r.reason, "dir-missing");
});

test("classifyBootstrapAction: empty dir → would-bootstrap", () => {
  const r = classifyBootstrapAction("golf", { exists: true, hasGit: false, scratchFileCount: 0, scratchFiles: [] });
  assert.equal(r.action, "would-bootstrap");
  assert.equal(r.reason, "empty-dir");
});

test("classifyBootstrapAction: scratch present, no force-clean → refuse", () => {
  const r = classifyBootstrapAction("golf", { exists: true, hasGit: false, scratchFileCount: 5, scratchFiles: [] });
  assert.equal(r.action, "refuse");
  assert.match(r.reason, /scratch-files-present/);
});

test("classifyBootstrapAction: scratch present + force-clean → would-clean-and-bootstrap", () => {
  const r = classifyBootstrapAction("golf", { exists: true, hasGit: false, scratchFileCount: 5, scratchFiles: [] }, { forceClean: true });
  assert.equal(r.action, "would-clean-and-bootstrap");
});

test("classifyBootstrapAction: missing slot → refuse", () => {
  const r = classifyBootstrapAction(null, { exists: false, hasGit: false });
  assert.equal(r.action, "refuse");
  assert.equal(r.reason, "missing-slot");
});

// ── readChatSlots ──

test("readChatSlots: missing file returns error", () => {
  const r = readChatSlots("/nonexistent.json", { existsSync: () => false });
  assert.equal(r.doc, null);
  assert.equal(r.error, "chat-slots-file-missing");
});

test("readChatSlots: corrupt JSON returns parse-error", () => {
  const d = tmpDir();
  const p = join(d, "bad.json");
  writeFileSync(p, "{nope");
  try {
    const r = readChatSlots(p);
    assert.equal(r.doc, null);
    assert.match(r.error, /parse-error/);
  } finally {
    try { rmSync(d, { recursive: true, force: true }); } catch {}
  }
});

test("readChatSlots: valid file parses", () => {
  const d = tmpDir();
  const p = join(d, "good.json");
  writeFileSync(p, JSON.stringify({ schemaVersion: 1, slots: { golf: { branch: null } } }));
  try {
    const r = readChatSlots(p);
    assert.equal(r.error, null);
    assert.equal(r.doc.schemaVersion, 1);
    assert.equal(r.doc.slots.golf.branch, null);
  } finally {
    try { rmSync(d, { recursive: true, force: true }); } catch {}
  }
});

// ── buildSlotBranchUpdate ──

test("buildSlotBranchUpdate: sets branch on existing slot", () => {
  const doc = { schemaVersion: 1, slots: { golf: { chatId: "x", branch: null } } };
  const next = buildSlotBranchUpdate(doc, "golf", "slot/golf");
  assert.equal(next.slots.golf.branch, "slot/golf");
  assert.equal(next.slots.golf.chatId, "x"); // preserved
  assert.ok(next.lastUpdated);
});

test("buildSlotBranchUpdate: creates slot entry if missing", () => {
  const doc = { schemaVersion: 1, slots: { golf: {} } };
  const next = buildSlotBranchUpdate(doc, "alpha", "slot/alpha");
  assert.equal(next.slots.alpha.branch, "slot/alpha");
  assert.equal(next.slots.golf !== undefined, true); // other slots preserved
});

test("buildSlotBranchUpdate: null doc returns null", () => {
  assert.equal(buildSlotBranchUpdate(null, "golf", "slot/golf"), null);
});

// ── writeChatSlotsAtomic ──

test("writeChatSlotsAtomic: round-trip", () => {
  const d = tmpDir();
  const p = join(d, "slots.json");
  try {
    const doc = { schemaVersion: 1, slots: { golf: { branch: "slot/golf" } } };
    const r = writeChatSlotsAtomic(p, doc);
    assert.equal(r.ok, true);
    const reread = JSON.parse(readFileSync(p, "utf8"));
    assert.deepEqual(reread, doc);
  } finally {
    try { rmSync(d, { recursive: true, force: true }); } catch {}
  }
});

// ── detectUncommittedShared (injected runGit) ──

test("detectUncommittedShared: clean tree", () => {
  const r = detectUncommittedShared({ runGit: () => "" });
  assert.equal(r.dirty, false);
  assert.equal(r.fileCount, 0);
});

test("detectUncommittedShared: dirty tree", () => {
  const r = detectUncommittedShared({ runGit: () => " M file1.txt\n M file2.ts\n" });
  assert.equal(r.dirty, true);
  assert.equal(r.fileCount, 2);
  assert.equal(r.sample.length, 2);
});

test("detectUncommittedShared: git error returns dirty:null + error", () => {
  const r = detectUncommittedShared({ runGit: () => { throw new Error("not a repo"); } });
  assert.equal(r.dirty, null);
  assert.match(r.error, /not a repo/);
});

// ── bootstrapSlot end-to-end (all deps injected) ──

test("bootstrapSlot: dry-run on missing dir returns plan with would-bootstrap", () => {
  const d = tmpDir();
  const slotsPath = join(d, "slots.json");
  writeFileSync(slotsPath, JSON.stringify({ schemaVersion: 1, slots: { golf: { branch: null } } }));
  try {
    const r = bootstrapSlot("golf", {
      apply: false,
      deps: {
        existsSync: (p) => p === slotsPath,
        readdirSync: () => [],
        readFileSync,
        runGit: () => "",
        chatSlotsPath: slotsPath,
      },
    });
    assert.equal(r.ok, true);
    assert.equal(r.mode, "dry-run");
    assert.equal(r.plan.decision.action, "would-bootstrap");
    assert.equal(r.plan.sharedDirty, false);
  } finally {
    try { rmSync(d, { recursive: true, force: true }); } catch {}
  }
});

test("bootstrapSlot: dry-run on bootstrapped dir returns noop", () => {
  const d = tmpDir();
  const slotsPath = join(d, "slots.json");
  writeFileSync(slotsPath, JSON.stringify({ schemaVersion: 1, slots: { golf: { branch: "slot/golf" } } }));
  try {
    const r = bootstrapSlot("golf", {
      apply: false,
      deps: {
        existsSync: (p) => p === slotsPath || p === "H:/prism-slot-golf" || p === "H:/prism-slot-golf/.git",
        readdirSync: () => [".git", "README.md"],
        readFileSync,
        runGit: () => "",
        chatSlotsPath: slotsPath,
      },
    });
    assert.equal(r.ok, true);
    assert.equal(r.plan.decision.action, "noop");
    assert.equal(r.plan.alreadyOnSlotBranch, true);
  } finally {
    try { rmSync(d, { recursive: true, force: true }); } catch {}
  }
});

test("bootstrapSlot: apply refuses on dirty shared tree", () => {
  const d = tmpDir();
  const slotsPath = join(d, "slots.json");
  writeFileSync(slotsPath, JSON.stringify({ schemaVersion: 1, slots: { golf: { branch: null } } }));
  try {
    const r = bootstrapSlot("golf", {
      apply: true,
      deps: {
        existsSync: (p) => p === slotsPath,
        readdirSync: () => [],
        readFileSync,
        runGit: () => " M file.ts\n", // ← dirty
        chatSlotsPath: slotsPath,
      },
    });
    assert.equal(r.ok, false);
    assert.match(r.reason, /shared-tree-dirty/);
  } finally {
    try { rmSync(d, { recursive: true, force: true }); } catch {}
  }
});

test("bootstrapSlot: apply refuses scratch-files without force-clean", () => {
  const d = tmpDir();
  const slotsPath = join(d, "slots.json");
  writeFileSync(slotsPath, JSON.stringify({ schemaVersion: 1, slots: { golf: { branch: null } } }));
  try {
    const r = bootstrapSlot("golf", {
      apply: true,
      deps: {
        existsSync: (p) => p === slotsPath || p === "H:/prism-slot-golf",
        readdirSync: () => ["scratch.txt", "more.json"], // ← non-empty
        readFileSync,
        runGit: () => "",
        chatSlotsPath: slotsPath,
      },
    });
    assert.equal(r.ok, false);
    assert.match(r.reason, /scratch-files-present/);
  } finally {
    try { rmSync(d, { recursive: true, force: true }); } catch {}
  }
});

test("bootstrapSlot: apply on empty/missing dir + clean tree creates worktree", () => {
  const d = tmpDir();
  const slotsPath = join(d, "slots.json");
  writeFileSync(slotsPath, JSON.stringify({ schemaVersion: 1, slots: { golf: { branch: null } } }));
  const gitCalls = [];
  try {
    const r = bootstrapSlot("golf", {
      apply: true,
      deps: {
        existsSync: (p) => p === slotsPath,
        readdirSync: () => [],
        readFileSync,
        runGit: (args) => {
          gitCalls.push(args.join(" "));
          if (args[0] === "rev-parse") throw new Error("branch missing");
          if (args[0] === "worktree") return "worktree added";
          if (args[0] === "status") return "";
          return "";
        },
        chatSlotsPath: slotsPath,
      },
    });
    assert.equal(r.ok, true);
    assert.equal(r.action, "bootstrapped");
    assert.equal(r.branchPreExisted, false);
    // Verify git worktree add was called with -b slot/golf
    const wtCall = gitCalls.find((c) => c.startsWith("worktree add"));
    assert.match(wtCall, /-b slot\/golf cad-fusion-live-ms0/);
    // Verify chat-slots was updated
    const updated = JSON.parse(readFileSync(slotsPath, "utf8"));
    assert.equal(updated.slots.golf.branch, "slot/golf");
  } finally {
    try { rmSync(d, { recursive: true, force: true }); } catch {}
  }
});

test("bootstrapSlot: apply when slot/<name> branch already exists uses it (no -b)", () => {
  const d = tmpDir();
  const slotsPath = join(d, "slots.json");
  writeFileSync(slotsPath, JSON.stringify({ schemaVersion: 1, slots: { golf: { branch: null } } }));
  const gitCalls = [];
  try {
    const r = bootstrapSlot("golf", {
      apply: true,
      deps: {
        existsSync: (p) => p === slotsPath,
        readdirSync: () => [],
        readFileSync,
        runGit: (args) => {
          gitCalls.push(args.join(" "));
          if (args[0] === "rev-parse") return "abc123"; // ← branch exists
          if (args[0] === "worktree") return "worktree added";
          return "";
        },
        chatSlotsPath: slotsPath,
      },
    });
    assert.equal(r.ok, true);
    assert.equal(r.branchPreExisted, true);
    const wtCall = gitCalls.find((c) => c.startsWith("worktree add"));
    assert.match(wtCall, /worktree add H:\/prism-slot-golf slot\/golf/);
    assert.ok(!wtCall.includes("-b"));
  } finally {
    try { rmSync(d, { recursive: true, force: true }); } catch {}
  }
});

test("bootstrapSlot: apply idempotent on already-bootstrapped + branch-aligned", () => {
  const d = tmpDir();
  const slotsPath = join(d, "slots.json");
  writeFileSync(slotsPath, JSON.stringify({ schemaVersion: 1, slots: { golf: { branch: "slot/golf" } } }));
  try {
    const r = bootstrapSlot("golf", {
      apply: true,
      deps: {
        existsSync: (p) => p === slotsPath || p === "H:/prism-slot-golf" || p === "H:/prism-slot-golf/.git",
        readdirSync: () => [".git", "README.md"],
        readFileSync,
        runGit: () => "",
        chatSlotsPath: slotsPath,
      },
    });
    assert.equal(r.ok, true);
    assert.equal(r.action, "noop");
  } finally {
    try { rmSync(d, { recursive: true, force: true }); } catch {}
  }
});

test("bootstrapSlot: apply on already-bootstrapped but branch-drifted realigns chat-slots", () => {
  const d = tmpDir();
  const slotsPath = join(d, "slots.json");
  writeFileSync(slotsPath, JSON.stringify({ schemaVersion: 1, slots: { golf: { branch: "cad-fusion-live-ms0" } } }));
  try {
    const r = bootstrapSlot("golf", {
      apply: true,
      deps: {
        existsSync: (p) => p === slotsPath || p === "H:/prism-slot-golf" || p === "H:/prism-slot-golf/.git",
        readdirSync: () => [".git"],
        readFileSync,
        runGit: () => "",
        chatSlotsPath: slotsPath,
      },
    });
    assert.equal(r.ok, true);
    assert.equal(r.action, "chat-slots-realigned");
    const updated = JSON.parse(readFileSync(slotsPath, "utf8"));
    assert.equal(updated.slots.golf.branch, "slot/golf");
  } finally {
    try { rmSync(d, { recursive: true, force: true }); } catch {}
  }
});

test("bootstrapSlot: invalid slot returns ok:false", () => {
  const r = bootstrapSlot(null, { apply: false });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid-slot");
});
