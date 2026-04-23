import { describe, it, expect } from "vitest";
import { GitSafetyEngine, gitSafetyEngine } from "../engines/GitSafetyEngine.js";

describe("GitSafetyEngine", () => {
  it("singleton instantiated", () => {
    expect(gitSafetyEngine).toBeInstanceOf(GitSafetyEngine);
    expect(gitSafetyEngine.name).toBe("GitSafetyEngine");
  });

  it("benign status is ok", () => {
    const e = new GitSafetyEngine();
    const v = e.classify({ command: "git status" });
    expect(v.safe).toBe(true);
    expect(v.severity).toBe("ok");
  });

  it("push --force is blocked with force-with-lease alternative", () => {
    const e = new GitSafetyEngine();
    const v = e.classify({ command: "git push --force origin feature" });
    expect(v.severity).toBe("block");
    expect(v.reasons).toContain("push_force");
    expect(v.saferAlternative).toContain("--force-with-lease");
  });

  it("push --force-with-lease is NOT flagged as push_force", () => {
    const e = new GitSafetyEngine();
    const v = e.classify({ command: "git push --force-with-lease origin feature" });
    expect(v.reasons).not.toContain("push_force");
  });

  it("reset --hard is blocked", () => {
    const e = new GitSafetyEngine();
    const v = e.classify({ command: "git reset --hard HEAD~3" });
    expect(v.severity).toBe("block");
    expect(v.reasons).toContain("reset_hard");
  });

  it("branch -D warns", () => {
    const e = new GitSafetyEngine();
    const v = e.classify({ command: "git branch -D feature" });
    expect(v.severity).toBe("warn");
    expect(v.reasons).toContain("branch_force_delete");
  });

  it("checkout -- . warns and suggests stash", () => {
    const e = new GitSafetyEngine();
    const v = e.classify({ command: "git checkout -- ." });
    expect(v.severity).toBe("warn");
    expect(v.saferAlternative).toContain("stash");
  });

  it("clean -fd is blocked", () => {
    const e = new GitSafetyEngine();
    const v = e.classify({ command: "git clean -fd" });
    expect(v.severity).toBe("block");
    expect(v.reasons).toContain("clean_force");
  });

  it("no-verify commit warns", () => {
    const e = new GitSafetyEngine();
    const v = e.classify({ command: "git commit -m 'msg' --no-verify" });
    expect(v.severity).toBe("warn");
    expect(v.reasons).toContain("no_verify");
  });

  it("filter-branch is blocked", () => {
    const e = new GitSafetyEngine();
    const v = e.classify({ command: "git filter-branch --env-filter 'X' HEAD" });
    expect(v.severity).toBe("block");
    expect(v.reasons).toContain("filter_branch");
  });

  it("protected branch + force → block even if rule would warn", () => {
    const e = new GitSafetyEngine();
    const v = e.classify({ command: "git clean -f", branch: "main" });
    expect(v.severity).toBe("block");
    expect(v.reasons.some((r) => r.startsWith("protected_branch:main"))).toBe(true);
  });

  it("isDestructive returns true for force-push", () => {
    const e = new GitSafetyEngine();
    expect(e.isDestructive("git push --force")).toBe(true);
  });

  it("isDestructive returns false for git log", () => {
    const e = new GitSafetyEngine();
    expect(e.isDestructive("git log --oneline -n 5")).toBe(false);
  });

  it("FAIL: missing command throws", () => {
    const e = new GitSafetyEngine();
    expect(() => e.classify({} as unknown as { command: string })).toThrow(/command required/);
  });

  it("ADV: command with embedded comment still flagged", () => {
    const e = new GitSafetyEngine();
    const v = e.classify({ command: "git reset --hard # danger" });
    expect(v.severity).toBe("block");
  });

  it("ADV: multiple destructive flags accumulate reasons", () => {
    const e = new GitSafetyEngine();
    const v = e.classify({ command: "git push --force && git reset --hard" });
    expect(v.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("ruleIds lists all registered rules", () => {
    const ids = gitSafetyEngine.ruleIds();
    expect(ids).toContain("push_force");
    expect(ids).toContain("reset_hard");
    expect(ids).toContain("clean_force");
  });
});
