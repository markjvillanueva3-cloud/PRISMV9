/**
 * HookTelemetryEngine — Persistence Tests (pillar-telemetry-recovery U-PTR01)
 *
 * Covers the 2026-05-15 persistence layer:
 *   - persist() writes atomic JSON
 *   - loadPersisted() restores hooks/timestamps/alerts
 *   - debounced auto-save on recordEnd
 *   - schema-version mismatch is a non-fatal load failure
 *   - corrupted JSON is a non-fatal load failure
 *   - env-driven path picks up at construct time
 *   - PRISM_HOOK_TELEMETRY_DISABLE=1 suppresses auto-load
 *   - reset() cancels pending flush so subsequent persist reflects empty state
 *
 * The default singleton's state is preserved across the suite by always
 * constructing fresh `HookTelemetryEngineImpl` instances via the exported type.
 * No mocks — real fs round-trip into mkdtemp() directories with cleanup.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  hookTelemetryEngine,
  type HookTelemetryEngine,
} from "../engines/HookTelemetryEngine.js";

// Reach into the module to grab the impl class via the runtime singleton.
// We can't import the private class directly, but the exported type is its
// alias — so the constructor lives on `hookTelemetryEngine.constructor`.
const HookTelemetryImpl = hookTelemetryEngine.constructor as new (
  windowMs?: number,
  maxLatencySamples?: number,
) => HookTelemetryEngine;

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-hook-tel-"));
  return dir;
}

function rmDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}

describe("HookTelemetryEngine — persistence", () => {
  let tmpDir: string;
  let savedEnvPath: string | undefined;
  let savedEnvDisable: string | undefined;
  let savedEnvDebounce: string | undefined;

  beforeEach(() => {
    tmpDir = makeTempDir();
    savedEnvPath = process.env.PRISM_HOOK_TELEMETRY_PATH;
    savedEnvDisable = process.env.PRISM_HOOK_TELEMETRY_DISABLE;
    savedEnvDebounce = process.env.PRISM_HOOK_TELEMETRY_DEBOUNCE_MS;
    delete process.env.PRISM_HOOK_TELEMETRY_PATH;
    delete process.env.PRISM_HOOK_TELEMETRY_DISABLE;
    delete process.env.PRISM_HOOK_TELEMETRY_DEBOUNCE_MS;
  });

  afterEach(() => {
    rmDir(tmpDir);
    if (savedEnvPath !== undefined) process.env.PRISM_HOOK_TELEMETRY_PATH = savedEnvPath;
    else delete process.env.PRISM_HOOK_TELEMETRY_PATH;
    if (savedEnvDisable !== undefined) process.env.PRISM_HOOK_TELEMETRY_DISABLE = savedEnvDisable;
    else delete process.env.PRISM_HOOK_TELEMETRY_DISABLE;
    if (savedEnvDebounce !== undefined) process.env.PRISM_HOOK_TELEMETRY_DEBOUNCE_MS = savedEnvDebounce;
    else delete process.env.PRISM_HOOK_TELEMETRY_DEBOUNCE_MS;
  });

  describe("default behavior (no env)", () => {
    it("constructs with persistPath=null when no env var", () => {
      const engine = new HookTelemetryImpl();
      expect(engine.getPersistPath()).toBeNull();
    });

    it("persist() with no path returns ok:false and a clear error", () => {
      const engine = new HookTelemetryImpl();
      const result = engine.persist();
      expect(result.ok).toBe(false);
      expect(result.error).toBe("no persistPath configured");
      expect(result.path).toBe("");
    });

    it("loadPersisted() with no path returns ok:false and a clear error", () => {
      const engine = new HookTelemetryImpl();
      const result = engine.loadPersisted();
      expect(result.ok).toBe(false);
      expect(result.error).toBe("no persistPath configured");
      expect(result.loadedHooks).toBe(0);
    });
  });

  describe("explicit persist() / loadPersisted() round-trip", () => {
    it("round-trips one hook with one invocation", () => {
      const engine = new HookTelemetryImpl();
      const inv = engine.recordStart("rt-one");
      engine.recordEnd(inv, true, false);

      const target = path.join(tmpDir, "snapshot.json");
      const saved = engine.persist(target);
      expect(saved.ok).toBe(true);
      expect(saved.path).toBe(target);
      expect(saved.bytesWritten).toBeGreaterThan(0);
      expect(fs.existsSync(target)).toBe(true);

      const fresh = new HookTelemetryImpl();
      // Fresh engine has zero hooks pre-load
      expect(fresh.getAllHookStats()).toHaveLength(0);

      const loaded = fresh.loadPersisted(target);
      expect(loaded.ok).toBe(true);
      expect(loaded.loadedHooks).toBe(1);
      // Note: a single invocation produces a saturation alert because
      // arrival/service rates collapse to ratio 1.0 in checkAlerts(). We
      // verify the count is non-negative and matches the seed engine's
      // alerts count exactly (load is exact, not lossy).
      const seedAlertCount = engine.getAlerts().length;
      expect(loaded.loadedAlerts).toBe(seedAlertCount);

      const stats = fresh.getHookStats("rt-one");
      expect(stats).not.toBeNull();
      expect(stats!.invocations).toBe(1);
      expect(stats!.successes).toBe(1);
      expect(stats!.failures).toBe(0);
    });

    it("round-trips a hook with multiple invocations and computed percentiles", () => {
      const engine = new HookTelemetryImpl();
      // 5 successes + 2 failures + 1 block = 8 invocations
      for (let i = 0; i < 5; i++) {
        const inv = engine.recordStart("rt-multi");
        engine.recordEnd(inv, true, false);
      }
      for (let i = 0; i < 2; i++) {
        const inv = engine.recordStart("rt-multi");
        engine.recordEnd(inv, false, false, "test-fail");
      }
      const blockInv = engine.recordStart("rt-multi");
      engine.recordEnd(blockInv, true, true);

      const target = path.join(tmpDir, "multi.json");
      expect(engine.persist(target).ok).toBe(true);

      const fresh = new HookTelemetryImpl();
      expect(fresh.loadPersisted(target).ok).toBe(true);
      const stats = fresh.getHookStats("rt-multi");
      expect(stats).not.toBeNull();
      expect(stats!.invocations).toBe(8);
      expect(stats!.successes).toBe(6); // 5 successes + 1 blocked-but-successful
      expect(stats!.failures).toBe(2);
      expect(stats!.blocks).toBe(1);
    });

    it("persisted file is valid JSON with schemaVersion=1", () => {
      const engine = new HookTelemetryImpl();
      const inv = engine.recordStart("schema-check");
      engine.recordEnd(inv, true, false);

      const target = path.join(tmpDir, "schema.json");
      engine.persist(target);

      const raw = fs.readFileSync(target, "utf8");
      const parsed = JSON.parse(raw);
      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.savedAt).toBeGreaterThan(0);
      expect(parsed.windowMs).toBe(60000);
      expect(parsed.maxLatencySamples).toBe(1000);
      expect(typeof parsed.hooks).toBe("object");
      expect(Object.keys(parsed.hooks)).toContain("schema-check");
      expect(parsed.hooks["schema-check"].invocations).toBe(1);
      expect(parsed.hooks["schema-check"].successes).toBe(1);
      expect(parsed.hooks["schema-check"].failures).toBe(0);
      expect(parsed.hooks["schema-check"].latencies).toHaveLength(1);
      expect(Array.isArray(parsed.invocationTimestamps)).toBe(true);
      expect(parsed.invocationTimestamps).toHaveLength(1);
      expect(Array.isArray(parsed.completionTimestamps)).toBe(true);
      expect(parsed.completionTimestamps).toHaveLength(1);
      expect(Array.isArray(parsed.alerts)).toBe(true);
    });

    it("persist() creates parent directories if missing", () => {
      const engine = new HookTelemetryImpl();
      const inv = engine.recordStart("mkdir-check");
      engine.recordEnd(inv, true, false);

      // Deeply nested path that doesn't exist
      const target = path.join(tmpDir, "deep", "nested", "dir", "snapshot.json");
      const result = engine.persist(target);
      expect(result.ok).toBe(true);
      expect(fs.existsSync(target)).toBe(true);
    });

    it("persist() writes atomically via .tmp + rename", () => {
      const engine = new HookTelemetryImpl();
      const inv = engine.recordStart("atomic-check");
      engine.recordEnd(inv, true, false);

      const target = path.join(tmpDir, "atomic.json");
      const tmpPath = `${target}.tmp`;

      // Pre-condition: .tmp does not exist
      expect(fs.existsSync(tmpPath)).toBe(false);

      const result = engine.persist(target);
      expect(result.ok).toBe(true);

      // Post-condition: target exists, .tmp was renamed (not left behind)
      expect(fs.existsSync(target)).toBe(true);
      expect(fs.existsSync(tmpPath)).toBe(false);
    });
  });

  describe("load failure modes (non-fatal)", () => {
    it("loadPersisted() on missing file returns ok:false but does not throw", () => {
      const engine = new HookTelemetryImpl();
      const missing = path.join(tmpDir, "does-not-exist.json");
      const result = engine.loadPersisted(missing);
      expect(result.ok).toBe(false);
      expect(result.error).toBe("file not found");
      expect(result.path).toBe(missing);
      expect(result.loadedHooks).toBe(0);
    });

    it("loadPersisted() on schema-version mismatch returns ok:false but does not throw", () => {
      const target = path.join(tmpDir, "mismatch.json");
      const payload = {
        schemaVersion: 999, // future version
        savedAt: Date.now(),
        windowMs: 60000,
        maxLatencySamples: 1000,
        hooks: {},
        invocationTimestamps: [],
        completionTimestamps: [],
        alerts: [],
      };
      fs.writeFileSync(target, JSON.stringify(payload));

      const engine = new HookTelemetryImpl();
      const result = engine.loadPersisted(target);
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/schemaVersion mismatch/);
      expect(result.loadedHooks).toBe(0);
      // In-memory state must remain untouched (zero hooks)
      expect(engine.getAllHookStats()).toHaveLength(0);
    });

    it("loadPersisted() on corrupt JSON returns ok:false but does not throw", () => {
      const target = path.join(tmpDir, "corrupt.json");
      fs.writeFileSync(target, "not-json-at-all{{{");

      const engine = new HookTelemetryImpl();
      const result = engine.loadPersisted(target);
      expect(result.ok).toBe(false);
      // Node's JSON.parse error messages include "JSON" or "Unexpected token"
      expect(result.error).toMatch(/JSON|Unexpected token/);
      expect(result.loadedHooks).toBe(0);
      // In-memory state must remain untouched
      expect(engine.getAllHookStats()).toHaveLength(0);
    });

    it("loadPersisted() prunes timestamps outside the current windowMs", () => {
      // Pre-build a snapshot with timestamps spanning the windowMs boundary.
      const now = Date.now();
      const windowMs = 60000;
      const oldTs = now - windowMs * 10; // 10 windows ago
      const newTs = now - 100; // within window
      const target = path.join(tmpDir, "stale.json");
      const payload = {
        schemaVersion: 1,
        savedAt: now,
        windowMs,
        maxLatencySamples: 1000,
        hooks: {
          stale: {
            latencies: [10, 20, 30],
            invocations: 3,
            successes: 3,
            failures: 0,
            blocks: 0,
            lastInvocation: newTs,
          },
        },
        invocationTimestamps: [oldTs, oldTs, oldTs, newTs],
        completionTimestamps: [oldTs, newTs],
        alerts: [],
      };
      fs.writeFileSync(target, JSON.stringify(payload));

      const engine = new HookTelemetryImpl();
      const result = engine.loadPersisted(target);
      expect(result.ok).toBe(true);
      // 4 invocations + 2 completions = 6 timestamps total
      // Only 1 + 1 = 2 are within the window → 4 pruned
      expect(result.prunedTimestamps).toBe(4);
    });
  });

  describe("env-driven auto-load + auto-save", () => {
    it("constructor picks up PRISM_HOOK_TELEMETRY_PATH and auto-loads existing snapshot", () => {
      const target = path.join(tmpDir, "auto-load.json");
      // Seed a snapshot via one engine
      const seed = new HookTelemetryImpl();
      const inv = seed.recordStart("auto-load-hook");
      seed.recordEnd(inv, true, false);
      seed.persist(target);

      // Now point a NEW engine at the env path — should auto-load
      process.env.PRISM_HOOK_TELEMETRY_PATH = target;
      const loaded = new HookTelemetryImpl();
      expect(loaded.getPersistPath()).toBe(target);
      const stats = loaded.getHookStats("auto-load-hook");
      expect(stats).not.toBeNull();
      expect(stats!.invocations).toBe(1);
    });

    it("PRISM_HOOK_TELEMETRY_DISABLE=1 suppresses auto-load even when path is set", () => {
      const target = path.join(tmpDir, "disable.json");
      const seed = new HookTelemetryImpl();
      const inv = seed.recordStart("disable-hook");
      seed.recordEnd(inv, true, false);
      seed.persist(target);

      process.env.PRISM_HOOK_TELEMETRY_PATH = target;
      process.env.PRISM_HOOK_TELEMETRY_DISABLE = "1";
      const engine = new HookTelemetryImpl();
      // Path is still tracked (for setPersistPath toggling) but state is empty
      expect(engine.getPersistPath()).toBe(target);
      expect(engine.getHookStats("disable-hook")).toBeNull();
    });

    it("recordEnd triggers a debounced auto-save when persistPath is configured", async () => {
      const target = path.join(tmpDir, "auto-save.json");
      process.env.PRISM_HOOK_TELEMETRY_PATH = target;
      process.env.PRISM_HOOK_TELEMETRY_DEBOUNCE_MS = "20"; // 20ms for fast tests

      const engine = new HookTelemetryImpl();
      expect(fs.existsSync(target)).toBe(false);

      const inv = engine.recordStart("auto-save-hook");
      engine.recordEnd(inv, true, false);

      // Wait for the debounce to flush
      await new Promise((resolve) => setTimeout(resolve, 80));

      expect(fs.existsSync(target)).toBe(true);
      const parsed = JSON.parse(fs.readFileSync(target, "utf8"));
      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.hooks["auto-save-hook"].invocations).toBe(1);
    });

    it("multiple recordEnd calls coalesce into one debounced flush", async () => {
      const target = path.join(tmpDir, "coalesce.json");
      process.env.PRISM_HOOK_TELEMETRY_PATH = target;
      process.env.PRISM_HOOK_TELEMETRY_DEBOUNCE_MS = "30";

      const engine = new HookTelemetryImpl();
      for (let i = 0; i < 25; i++) {
        const inv = engine.recordStart("coalesce-hook");
        engine.recordEnd(inv, true, false);
      }
      // Before debounce fires, no file
      expect(fs.existsSync(target)).toBe(false);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // After debounce, exactly one snapshot with all 25 invocations
      expect(fs.existsSync(target)).toBe(true);
      const parsed = JSON.parse(fs.readFileSync(target, "utf8"));
      expect(parsed.hooks["coalesce-hook"].invocations).toBe(25);
    });
  });

  describe("runtime config + reset", () => {
    it("setPersistPath(null) clears persistPath and cancels pending flush", async () => {
      const target = path.join(tmpDir, "cancel.json");
      process.env.PRISM_HOOK_TELEMETRY_DEBOUNCE_MS = "50";

      const engine = new HookTelemetryImpl();
      engine.setPersistPath(target);
      expect(engine.getPersistPath()).toBe(target);

      const inv = engine.recordStart("cancel-hook");
      engine.recordEnd(inv, true, false);

      // Cancel BEFORE the debounce fires
      engine.setPersistPath(null);
      expect(engine.getPersistPath()).toBeNull();

      await new Promise((resolve) => setTimeout(resolve, 120));
      // Cancelled timer should not have written the file
      expect(fs.existsSync(target)).toBe(false);
    });

    it("reset() cancels pending flush, leaving disk untouched", async () => {
      const target = path.join(tmpDir, "reset-cancel.json");
      process.env.PRISM_HOOK_TELEMETRY_PATH = target;
      process.env.PRISM_HOOK_TELEMETRY_DEBOUNCE_MS = "50";

      const engine = new HookTelemetryImpl();
      const inv = engine.recordStart("reset-cancel-hook");
      engine.recordEnd(inv, true, false);

      // Reset cancels the timer
      engine.reset();
      await new Promise((resolve) => setTimeout(resolve, 120));

      // No file written because reset cleared dirty + cancelled the timer
      expect(fs.existsSync(target)).toBe(false);
    });

    it("explicit persist() after reset writes an empty-state snapshot", () => {
      const target = path.join(tmpDir, "empty.json");
      const engine = new HookTelemetryImpl();
      // Seed some state
      const inv = engine.recordStart("to-be-reset");
      engine.recordEnd(inv, true, false);
      // Reset, then explicit persist — disk should reflect empty state
      engine.reset();
      const result = engine.persist(target);
      expect(result.ok).toBe(true);
      const parsed = JSON.parse(fs.readFileSync(target, "utf8"));
      expect(Object.keys(parsed.hooks)).toHaveLength(0);
      expect(parsed.invocationTimestamps).toHaveLength(0);
      expect(parsed.completionTimestamps).toHaveLength(0);
    });
  });
});
