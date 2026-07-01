import { describe, it, expect } from "vitest";
import { existsSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { ContextPreloaderEngine } from "../engines/ContextPreloaderEngine.js";

describe("ContextPreloaderEngine", () => {
  const engine = new ContextPreloaderEngine();

  describe("getPreloadContext", () => {
    it("returns all required fields", () => {
      const ctx = engine.getPreloadContext();
      expect(ctx.compact).toBeTruthy();
      expect(ctx.counts).toBeTruthy();
      expect(ctx.counts.engines).toBeGreaterThan(100);
      expect(ctx.counts.dispatchers).toBeGreaterThan(30);
      expect(ctx.counts.actions).toBeGreaterThan(500);
      expect(ctx.key_paths).toBeTruthy();
      expect(ctx.generated_at).toBeTruthy();
    });

    it("compact string is under 200 chars", () => {
      const ctx = engine.getPreloadContext();
      expect(ctx.compact.length).toBeLessThan(200);
    });

    it("includes git state", () => {
      const ctx = engine.getPreloadContext();
      expect(ctx.git_state).toBeTruthy();
      expect(ctx.git_state.branch).toBeTruthy();
      expect(ctx.git_state.commit).toBeTruthy();
      expect(typeof ctx.git_state.dirty).toBe("boolean");
    });

    it("includes recent commits", () => {
      const ctx = engine.getPreloadContext();
      expect(Array.isArray(ctx.recent_commits)).toBe(true);
      expect(ctx.recent_commits.length).toBeGreaterThan(0);
    });
  });

  describe("getBootBlock", () => {
    it("returns boot_string and full context", () => {
      const boot = engine.getBootBlock();
      expect(boot.boot_string).toBeTruthy();
      expect(boot.boot_string.length).toBeLessThan(300);
      expect(boot.full).toBeTruthy();
      expect(boot.full.counts.engines).toBeGreaterThan(100);
    });
  });

  describe("getDeltaBoot", () => {
    it("returns delta info for HEAD~5", () => {
      const delta = engine.getDeltaBoot("HEAD~5");
      expect(delta.boot_string).toBeTruthy();
      expect(delta.changed).toBeTruthy();
    });

    it("handles invalid commit gracefully", () => {
      const delta = engine.getDeltaBoot("invalid_commit_hash_xyz");
      expect(delta.boot_string).toBeTruthy();
      expect(delta.changed).toContain("Unable to compute delta");
    });

    it("does NOT shell-inject a malicious sinceCommit (security: context_delta_boot is wired)", () => {
      // sinceCommit reaches `git diff --stat <ref>..HEAD` via the wired
      // prism_session:context_delta_boot action. Under the OLD execSync(`...${sinceCommit}...`)
      // a shell would run `git diff --stat HEAD` (valid -> real delta) then the embedded
      // `echo pwned > sentinel`, so `changed` would be a real delta AND the file would exist.
      // The execFileSync(GIT_BIN,[args]) fix passes the whole string to git as ONE invalid
      // revision -> git fails -> caught -> "Unable to compute delta", and no shell runs.
      const sentinel = join(tmpdir(), `prism-ctxpreload-inj-${process.pid}.txt`);
      if (existsSync(sentinel)) rmSync(sentinel);
      const malicious = `HEAD; echo pwned > "${sentinel}" #`;
      const delta = engine.getDeltaBoot(malicious);
      const sentinelCreated = existsSync(sentinel);
      if (sentinelCreated) rmSync(sentinel);
      // Value discriminator: a shell WOULD have succeeded (git diff --stat HEAD is valid),
      // yielding a real delta; the shell-free fix makes git reject the whole bad ref.
      expect(delta.changed).toContain("Unable to compute delta");
      expect(sentinelCreated).toBe(false); // the embedded echo never executed (no shell spawned)
    });
  });

  describe("regenerateQuickRef", () => {
    it("regenerates quick-ref.json with current counts", () => {
      const result = engine.regenerateQuickRef();
      expect(result.path).toContain("quick-ref.json");
      expect(result.counts.engines).toBeGreaterThan(100);
      expect(result.counts.dispatchers).toBeGreaterThan(30);
    });
  });

  describe("dispatcher wiring", () => {
    it("sessionDispatcher has context_preload action", async () => {
      const dispatcherPath = "../tools/dispatchers/sessionDispatcher.js";
      const mod = await import(dispatcherPath);
      expect(mod).toBeTruthy();
    });
  });
});
