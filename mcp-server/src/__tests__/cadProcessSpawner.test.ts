/**
 * cadProcessSpawner.test.ts
 * U-CAUT08 / CAD-AUTOMATION-MS0
 *
 * Tests:
 *  1. PID is tracked after spawn
 *  2. kill-tree removes process from registry
 *  3. Orphan sweeper detects and kills stale entries
 *  4. 100 rapid spawn/kill cycles leave zero orphans
 *  5. killAll(label) filters correctly
 *  6. Timeout hard-kills after deadline
 */

import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { CADProcessSpawner } from "../utils/cadProcessSpawner.js";

// Use a fresh instance per test so registries don't bleed across tests
let spawner: CADProcessSpawner;

beforeEach(() => {
  spawner = new CADProcessSpawner();
  spawner._stopSweepTimer(); // disable background sweeper during unit tests
});

afterEach(async () => {
  // Clean up any processes that tests left running
  await spawner.killAll();
  spawner._stopSweepTimer();
});

// ---------------------------------------------------------------------------
// Helper: spawn a harmless long-lived node process
// ---------------------------------------------------------------------------
function spawnNode(timeoutMs = 30_000, label = "test-node") {
  return spawner.spawn({
    exe: process.execPath, // absolute path to current node binary
    args: ["-e", "setTimeout(()=>{},30000)"],
    timeoutMs,
    label,
    stdio: "pipe",
  });
}

// ---------------------------------------------------------------------------
// 1. PID is tracked after spawn
// ---------------------------------------------------------------------------
describe("PID tracking", () => {
  it("registers PID immediately after spawn", async () => {
    const proc = spawnNode();
    expect(typeof proc.pid).toBe("number");
    expect(proc.pid).toBeGreaterThan(0);

    const active = spawner.listActive();
    expect(active.some((p) => p.pid === proc.pid)).toBe(true);

    await proc.kill();
  });

  it("stores label and startedAt", async () => {
    const before = Date.now();
    const proc = spawnNode(30_000, "solidworks");
    expect(proc.label).toBe("solidworks");
    expect(proc.startedAt).toBeGreaterThanOrEqual(before);
    await proc.kill();
  });
});

// ---------------------------------------------------------------------------
// 2. kill-tree removes process from registry
// ---------------------------------------------------------------------------
describe("kill-tree", () => {
  it("removes PID from registry after kill()", async () => {
    const proc = spawnNode();
    const pid = proc.pid;

    await proc.kill();

    // Give event loop one tick for 'exit' handler to fire
    await new Promise<void>((r) => setTimeout(r, 50));

    const active = spawner.listActive();
    expect(active.some((p) => p.pid === pid)).toBe(false);
  });

  it("kill() is idempotent — second call does not throw", async () => {
    const proc = spawnNode();
    await proc.kill();
    await new Promise<void>((r) => setTimeout(r, 50));
    // Should not throw
    await expect(proc.kill()).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 3. Orphan sweeper detects stale entries
// ---------------------------------------------------------------------------
describe("sweep()", () => {
  it("reports active processes (no orphans when heartbeat is fresh)", async () => {
    const proc = spawnNode();
    const result = await spawner.sweep();
    expect(result.orphans).toBe(0);
    expect(result.active).toBeGreaterThanOrEqual(1);
    await proc.kill();
  });

  it("kills an entry whose lastHeartbeat is stale (>5 min ago)", async () => {
    const proc = spawnNode();
    const pid = proc.pid;

    // Artificially back-date the heartbeat by >5 min
    const entry = (spawner as unknown as { registry: Map<number, { lastHeartbeat: number }> })
      .registry.get(pid);
    if (entry) {
      entry.lastHeartbeat = Date.now() - 6 * 60 * 1000; // 6 min ago
    }

    const result = await spawner.sweep();
    expect(result.orphans).toBe(1);

    await new Promise<void>((r) => setTimeout(r, 50));
    expect(spawner.listActive().some((p) => p.pid === pid)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. killAll(label) filters correctly
// ---------------------------------------------------------------------------
describe("killAll(label)", () => {
  it("kills only processes matching the given label", async () => {
    const sw = spawnNode(30_000, "solidworks");
    const inv = spawnNode(30_000, "inventor");

    const killed = await spawner.killAll("solidworks");
    expect(killed).toBe(1);

    await new Promise<void>((r) => setTimeout(r, 50));

    const active = spawner.listActive();
    expect(active.some((p) => p.pid === sw.pid)).toBe(false);
    expect(active.some((p) => p.pid === inv.pid)).toBe(true);

    await spawner.killAll(); // cleanup
  });

  it("killAll() with no label kills everything", async () => {
    spawnNode(30_000, "a");
    spawnNode(30_000, "b");
    spawnNode(30_000, "c");

    const killed = await spawner.killAll();
    expect(killed).toBe(3);

    await new Promise<void>((r) => setTimeout(r, 50));
    expect(spawner.listActive().length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Timeout hard-kills process
// ---------------------------------------------------------------------------
describe("timeout", () => {
  it("hard-kills process after timeoutMs and removes from registry", async () => {
    const proc = spawner.spawn({
      exe: process.execPath,
      args: ["-e", "setTimeout(()=>{},30000)"],
      timeoutMs: 300, // very short timeout
      label: "timeout-test",
      stdio: "pipe",
    });
    const pid = proc.pid;

    // Wait for timeout to fire + a bit of slack
    await new Promise<void>((r) => setTimeout(r, 600));

    const active = spawner.listActive();
    expect(active.some((p) => p.pid === pid)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. 100 rapid spawn/kill cycles — zero orphans
// ---------------------------------------------------------------------------
describe("stress: 100 rapid spawn/kill cycles", () => {
  it(
    "leaves zero orphan processes after 100 spawn+kill cycles",
    async () => {
      const CYCLES = 100;

      for (let i = 0; i < CYCLES; i++) {
        const proc = spawner.spawn({
          exe: process.execPath,
          args: ["-e", "setTimeout(()=>{},30000)"],
          timeoutMs: 30_000,
          label: "stress",
          stdio: "ignore",
        });
        await proc.kill();
        // Yield one microtask tick between cycles to drain exit events
        // and avoid Windows handle exhaustion under rapid-spawn conditions
        await new Promise<void>((r) => setImmediate(r));
      }

      // Allow all exit events to propagate
      await new Promise<void>((r) => setTimeout(r, 300));

      const active = spawner.listActive();
      expect(active.length).toBe(0);

      const sweep = await spawner.sweep();
      expect(sweep.orphans).toBe(0);
      expect(sweep.active).toBe(0);
    },
    30_000 // 30s budget for 100 cycles on Windows
  );
});
