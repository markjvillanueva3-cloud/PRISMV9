/**
 * ContextSnapshotEngine — Minimal session state snapshots
 *
 * Captures the essential context needed to resume work in a new session.
 * Produces ultra-compact snapshots (~200-500 tokens) that encode
 * working files, recent changes, active task, and key decisions.
 *
 * Token savings: Eliminates expensive context reconstruction at session start.
 *
 * @version 1.0.0
 */

import * as fs from "fs";
import * as path from "path";

export interface Snapshot {
  timestamp: number;
  workingFiles: string[];
  recentCommits: string[];
  activeTask: string;
  keyDecisions: string[];
  nextSteps: string[];
  engineCount: number;
  testCount: number;
}

export class ContextSnapshotEngine {
  private readonly stateDir: string;

  constructor(stateDir = "H:/prism/mcp-server/state") {
    this.stateDir = stateDir;
  }

  /**
   * Create a snapshot from explicit data.
   */
  create(data: Partial<Snapshot>): Snapshot {
    return {
      timestamp: Date.now(),
      workingFiles: data.workingFiles || [],
      recentCommits: data.recentCommits || [],
      activeTask: data.activeTask || "",
      keyDecisions: data.keyDecisions || [],
      nextSteps: data.nextSteps || [],
      engineCount: data.engineCount || 0,
      testCount: data.testCount || 0,
    };
  }

  /**
   * Save snapshot to disk.
   */
  save(snapshot: Snapshot): string {
    const dir = path.join(this.stateDir, "snapshots");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `snapshot-${snapshot.timestamp}.json`);
    fs.writeFileSync(file, JSON.stringify(snapshot, null, 2));
    return file;
  }

  /**
   * Load the most recent snapshot.
   */
  loadLatest(): Snapshot | null {
    const dir = path.join(this.stateDir, "snapshots");
    if (!fs.existsSync(dir)) return null;

    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith("snapshot-") && f.endsWith(".json"))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    const content = fs.readFileSync(path.join(dir, files[0]), "utf-8");
    return JSON.parse(content) as Snapshot;
  }

  /**
   * Format snapshot as compact text (~200-500 tokens).
   */
  format(snapshot: Snapshot): string {
    const age = Math.round((Date.now() - snapshot.timestamp) / 60_000);
    const lines: string[] = [
      `SNAPSHOT (${age}min ago)`,
    ];

    if (snapshot.activeTask) {
      lines.push(`Task: ${snapshot.activeTask}`);
    }
    if (snapshot.workingFiles.length > 0) {
      const files = snapshot.workingFiles.map(f => path.basename(f)).join(", ");
      lines.push(`Files: ${files}`);
    }
    if (snapshot.recentCommits.length > 0) {
      lines.push(`Commits: ${snapshot.recentCommits.slice(0, 3).join(" | ")}`);
    }
    if (snapshot.keyDecisions.length > 0) {
      lines.push(`Decisions: ${snapshot.keyDecisions.join("; ")}`);
    }
    if (snapshot.nextSteps.length > 0) {
      lines.push(`Next: ${snapshot.nextSteps.join("; ")}`);
    }
    if (snapshot.engineCount > 0 || snapshot.testCount > 0) {
      lines.push(`Counts: ${snapshot.engineCount} engines, ${snapshot.testCount} tests`);
    }

    return lines.join("\n");
  }

  /**
   * Get a one-liner summary.
   */
  oneLiner(snapshot: Snapshot): string {
    const age = Math.round((Date.now() - snapshot.timestamp) / 60_000);
    const task = snapshot.activeTask || "no active task";
    const fileCount = snapshot.workingFiles.length;
    return `[${age}min ago] ${task} | ${fileCount} files | ${snapshot.recentCommits.length} commits`;
  }

  /**
   * Clean old snapshots (keep last N).
   */
  cleanup(keep = 10): number {
    const dir = path.join(this.stateDir, "snapshots");
    if (!fs.existsSync(dir)) return 0;

    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith("snapshot-") && f.endsWith(".json"))
      .sort()
      .reverse();

    let removed = 0;
    for (const file of files.slice(keep)) {
      fs.unlinkSync(path.join(dir, file));
      removed++;
    }
    return removed;
  }
}

export const contextSnapshotEngine = new ContextSnapshotEngine();
