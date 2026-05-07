/**
 * cadProcessSpawner.ts — CAD Bridge Subprocess Lifecycle Manager
 *
 * Wraps child_process.spawn with: hard timeout, orphan detection,
 * kill-tree on exit. Prevents zombie sldworks.exe / inventor.exe /
 * Mastercam.exe / Fusion360.exe / FreeCAD.exe / hyperMILL.exe from
 * accumulating.
 *
 * Cross-platform:
 *   Windows — taskkill /F /T /PID <pid>
 *   Linux/Mac — kill -TERM -<pgid>, then kill -9 -<pgid>
 *
 * U-CAUT08 / CAD-AUTOMATION-MS0
 */

import { spawn, execFile, ChildProcess } from "node:child_process";
import os from "node:os";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Orphan threshold: process registered but no heartbeat for >5 min */
const ORPHAN_THRESHOLD_MS = 5 * 60 * 1000;

/** Auto-sweep interval */
const SWEEP_INTERVAL_MS = 60_000;

/** Known CAD executable names (for orphan detection label matching) */
export const CAD_EXE_LABELS = [
  "solidworks",
  "inventor",
  "mastercam",
  "fusion360",
  "freecad",
  "hypermill",
] as const;

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface SpawnOptions {
  exe: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  /** Hard kill after this many milliseconds */
  timeoutMs: number;
  /** Human-readable label e.g. "solidworks" | "inventor" | "fusion360" */
  label: string;
  stdio?: "pipe" | "inherit" | "ignore";
}

export interface SpawnedProcess {
  pid: number;
  label: string;
  startedAt: number;
  /** Last activity timestamp — updated on stdout/stderr data */
  lastHeartbeat: number;
  child: ChildProcess;
  /** Kill the process tree and remove from registry */
  kill(signal?: NodeJS.Signals): Promise<void>;
}

// ---------------------------------------------------------------------------
// Internal registry entry
// ---------------------------------------------------------------------------

interface RegistryEntry extends SpawnedProcess {
  timeoutHandle: ReturnType<typeof setTimeout>;
}

// ---------------------------------------------------------------------------
// Platform kill-tree helpers
// ---------------------------------------------------------------------------

/** Execute a command without shell injection risk. Returns exit code. */
function execFileAsync(file: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    execFile(file, args, { windowsHide: true }, (err) => {
      resolve(err?.code != null ? (err.code as number) : 0);
    });
  });
}

/**
 * Kill the entire process tree rooted at pid.
 * Windows: taskkill /F /T /PID <pid>
 * Linux/Mac: kill -TERM -<pgid> then kill -9 -<pgid>
 */
async function killTree(pid: number, child: ChildProcess): Promise<void> {
  if (os.platform() === "win32") {
    await execFileAsync("taskkill", ["/F", "/T", "/PID", pid.toString()]);
    return;
  }
  // Unix: use process group id if available
  const pgid = (child as unknown as { pid?: number }).pid ?? pid;
  try {
    await execFileAsync("kill", ["-TERM", `-${pgid}`]);
  } catch {
    // ignore TERM failure, proceed to SIGKILL
  }
  // Give 500ms for graceful exit then force-kill
  await new Promise<void>((r) => setTimeout(r, 500));
  try {
    await execFileAsync("kill", ["-9", `-${pgid}`]);
  } catch {
    // process may already be gone
  }
}

// ---------------------------------------------------------------------------
// CADProcessSpawner
// ---------------------------------------------------------------------------

export class CADProcessSpawner {
  private readonly registry = new Map<number, RegistryEntry>();
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this._startSweepTimer();
    // Graceful shutdown: kill all tracked processes on exit
    // Use a named function stored per-instance so we can remove it in tests
    this._exitHandler = () => {
      for (const entry of this.registry.values()) {
        try {
          entry.child.kill("SIGKILL");
        } catch {
          // ignore
        }
      }
    };
    process.on("exit", this._exitHandler);
  }

  private readonly _exitHandler: () => void;

  // -------------------------------------------------------------------------
  // spawn
  // -------------------------------------------------------------------------

  /**
   * Spawn a CAD bridge process with timeout and kill-tree registration.
   * @param opts SpawnOptions
   * @returns SpawnedProcess with kill() method
   */
  spawn(opts: SpawnOptions): SpawnedProcess {
    const { exe, args, cwd, env, timeoutMs, label, stdio = "pipe" } = opts;

    const child = spawn(exe, args, {
      cwd,
      env: env ? { ...process.env, ...env } : process.env,
      stdio,
      // Ensure child has its own process group so kill-tree works on Unix
      detached: os.platform() !== "win32",
      windowsHide: true,
    });

    if (child.pid == null) {
      throw new Error(`cadProcessSpawner: failed to spawn '${exe}' — pid is undefined`);
    }

    const pid: number = child.pid;
    const now = Date.now();

    // Hard timeout handle
    const timeoutHandle = setTimeout(async () => {
      if (this.registry.has(pid)) {
        await this._killEntry(pid);
      }
    }, timeoutMs);

    const entry: RegistryEntry = {
      pid,
      label,
      startedAt: now,
      lastHeartbeat: now,
      child,
      timeoutHandle,
      kill: async (signal?: NodeJS.Signals) => {
        void signal; // signal ignored — we always do kill-tree
        await this._killEntry(pid);
      },
    };

    // Update heartbeat on any I/O
    if (child.stdout) {
      child.stdout.on("data", () => {
        const e = this.registry.get(pid);
        if (e) e.lastHeartbeat = Date.now();
      });
    }
    if (child.stderr) {
      child.stderr.on("data", () => {
        const e = this.registry.get(pid);
        if (e) e.lastHeartbeat = Date.now();
      });
    }

    // Remove from registry when process exits naturally
    child.once("exit", () => {
      const e = this.registry.get(pid);
      if (e) {
        clearTimeout(e.timeoutHandle);
        this.registry.delete(pid);
      }
    });

    this.registry.set(pid, entry);
    return entry;
  }

  // -------------------------------------------------------------------------
  // killAll
  // -------------------------------------------------------------------------

  /**
   * Kill all tracked processes, optionally filtered by label.
   * @param label Optional label filter (e.g. "solidworks")
   * @returns Number of processes killed
   */
  async killAll(label?: string): Promise<number> {
    const targets = label
      ? [...this.registry.values()].filter((e) => e.label === label)
      : [...this.registry.values()];

    let count = 0;
    await Promise.all(
      targets.map(async (e) => {
        await this._killEntry(e.pid);
        count++;
      })
    );
    return count;
  }

  // -------------------------------------------------------------------------
  // sweep
  // -------------------------------------------------------------------------

  /**
   * Find and kill orphaned processes (no heartbeat for >5 min).
   * @returns { orphans: number killed, active: number remaining }
   */
  async sweep(): Promise<{ orphans: number; active: number }> {
    const now = Date.now();
    const orphanPids: number[] = [];

    for (const [pid, entry] of this.registry.entries()) {
      const elapsed = now - entry.lastHeartbeat;
      if (elapsed > ORPHAN_THRESHOLD_MS) {
        orphanPids.push(pid);
      }
    }

    await Promise.all(orphanPids.map((pid) => this._killEntry(pid)));

    return {
      orphans: orphanPids.length,
      active: this.registry.size,
    };
  }

  // -------------------------------------------------------------------------
  // listActive
  // -------------------------------------------------------------------------

  /** Returns snapshot of all active SpawnedProcess entries. */
  listActive(): SpawnedProcess[] {
    return [...this.registry.values()];
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private async _killEntry(pid: number): Promise<void> {
    const entry = this.registry.get(pid);
    if (!entry) return;

    clearTimeout(entry.timeoutHandle);
    this.registry.delete(pid);

    try {
      await killTree(pid, entry.child);
    } catch {
      // Process may already be gone — not an error
    }
  }

  private _startSweepTimer(): void {
    if (this.sweepTimer !== null) return;
    this.sweepTimer = setInterval(() => {
      this.sweep().catch(() => {
        // Sweep errors are non-fatal
      });
    }, SWEEP_INTERVAL_MS);
    // Allow process to exit even if sweep timer is active
    if (this.sweepTimer.unref) this.sweepTimer.unref();
  }

  /** Tear down the sweep timer and exit handler (used in tests). */
  _stopSweepTimer(): void {
    if (this.sweepTimer !== null) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    process.removeListener("exit", this._exitHandler);
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const cadProcessSpawner = new CADProcessSpawner();
