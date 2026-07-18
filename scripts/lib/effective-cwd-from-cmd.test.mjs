// scripts/lib/effective-cwd-from-cmd.test.mjs
// Tests for U-LANE-CD-AWARE: resolve the real execution cwd of a shell command.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { tokenizeShell, resolveCd, effectiveCwdFromCmd } from "./effective-cwd-from-cmd.mjs";

const SLOT = "h:/prism-slot-india";

describe("effectiveCwdFromCmd", () => {
  it("THE BUG: 'cd /h/prism && git add X' resolves to the MAIN tree (MSYS /h/ -> Windows h:/ so it compares to worktree roots)", () => {
    assert.equal(effectiveCwdFromCmd("cd /h/prism && git add scripts/X.mjs", SLOT), "h:/prism");
  });

  it("NO FALSE-BLOCK: 'cd /h/prism-slot-india' (MSYS) normalizes to the slot worktree, so a legit in-worktree commit is allowed", () => {
    assert.equal(effectiveCwdFromCmd("cd /h/prism-slot-india && git add x", "h:/other"), "h:/prism-slot-india");
  });

  it("Windows-style 'cd H:/prism && git commit' resolves to the main tree (case preserved; the hook canonicalizes)", () => {
    assert.equal(effectiveCwdFromCmd("cd H:/prism && git commit -m x", SLOT), "H:/prism");
  });

  it("fail-safe: no leading cd -> returns the fallback (payload) cwd unchanged (byte-identical legacy)", () => {
    assert.equal(effectiveCwdFromCmd("git add scripts/X.mjs", SLOT), SLOT);
    assert.equal(effectiveCwdFromCmd("git commit -m 'x'", SLOT), SLOT);
  });

  it("multiple leading cds resolve to the LAST before the first command", () => {
    assert.equal(effectiveCwdFromCmd("cd /aa && cd /bb && git status", SLOT), "/bb");
  });

  it("relative cd joins onto the fallback (slot worktree)", () => {
    assert.equal(effectiveCwdFromCmd("cd sub && git add y", "/root"), "/root/sub");
    assert.equal(effectiveCwdFromCmd("cd ../peer && git add y", "/root/here"), "/root/peer");
  });

  it("a cd AFTER the first command does NOT change the resolved cwd (leading-only scope)", () => {
    // The first real command (git status) runs under fallback; later cd is out of scope.
    assert.equal(effectiveCwdFromCmd("git status && cd /elsewhere", SLOT), SLOT);
  });

  it("adversarial: unresolvable targets (~, -, $VAR) keep the prior cwd (fail-safe, no throw)", () => {
    assert.doesNotThrow(() => {
      assert.equal(effectiveCwdFromCmd("cd ~ && git x", SLOT), SLOT);
      assert.equal(effectiveCwdFromCmd("cd - && git x", SLOT), SLOT);
      assert.equal(effectiveCwdFromCmd("cd $HOME && git x", SLOT), SLOT);
    });
  });

  it("adversarial: empty / non-string command -> fallback, never throws", () => {
    assert.doesNotThrow(() => {
      assert.equal(effectiveCwdFromCmd("", SLOT), SLOT);
      assert.equal(effectiveCwdFromCmd(null, SLOT), SLOT);
      assert.equal(effectiveCwdFromCmd(42, SLOT), SLOT);
    });
  });

  it("quoted cd target (path with no spaces) resolves correctly", () => {
    assert.equal(effectiveCwdFromCmd('cd "/h/prism" && git add x', SLOT), "h:/prism");
  });
});

describe("resolveCd", () => {
  it("absolute POSIX + Windows replace base; relative joins; .. pops", () => {
    assert.equal(resolveCd("/h/prism", "/slot"), "h:/prism"); // MSYS /h/ -> Windows h:/
    assert.equal(resolveCd("H:/prism", "h:/slot"), "H:/prism");
    assert.equal(resolveCd("sub/dir", "/root"), "/root/sub/dir");
    assert.equal(resolveCd("..", "/root/here"), "/root");
  });

  it("unresolvable targets -> null", () => {
    assert.equal(resolveCd("-", "/x"), null);
    assert.equal(resolveCd("~", "/x"), null);
    assert.equal(resolveCd("$HOME", "/x"), null);
    assert.equal(resolveCd("", "/x"), null);
  });
});

describe("tokenizeShell", () => {
  it("strips matched quotes + splits on whitespace", () => {
    assert.deepEqual(tokenizeShell('cd "/h/prism"'), ["cd", "/h/prism"]);
    assert.deepEqual(tokenizeShell("cd /a/b"), ["cd", "/a/b"]);
  });
});
