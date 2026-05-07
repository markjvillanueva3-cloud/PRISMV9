/**
 * MultiSessionHandoffCoordinatorEngine — U-CTX05 Multi-Session Handoff
 *
 * Coordinates handoffs between multiple concurrent sessions:
 * - Reads all active session handoffs
 * - Merges non-conflicting work items
 * - Detects claim conflicts and proposes resolution
 * - Generates unified work queue for new sessions
 *
 * @version 1.0.0
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import type {
  SessionHandoffV2,
  HandoffOpenGoal,
  HandoffNextAction,
} from "./SessionHandoffV2Engine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SessionSnapshot {
  sessionId: string;
  family: string;
  machine: string;
  instance: string;
  lastActive: Date;
  claims: string[];
  openGoals: HandoffOpenGoal[];
  nextActions: HandoffNextAction[];
  status: "active" | "completed" | "stale";
}

export interface ClaimConflict {
  track: string;
  sessions: string[];
  resolution: "first-writer-wins" | "merge" | "needs-manual";
  winner?: string;
}

export interface MergedWorkQueue {
  pendingGoals: Array<{
    goal: HandoffOpenGoal;
    fromSession: string;
    age: number;
  }>;
  nextActions: Array<{
    action: HandoffNextAction;
    fromSession: string;
  }>;
  conflicts: ClaimConflict[];
  totalSessions: number;
  activeSessions: number;
  staleSessions: number;
}

export interface HandoffCoordinationResult {
  success: boolean;
  workQueue: MergedWorkQueue;
  recommendations: string[];
  tokenEstimate: number;
}

const HANDOFF_DIR = "H:/prism/state/shared";
const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export class MultiSessionHandoffCoordinatorEngine {
  private readonly handoffDir: string;

  constructor(handoffDir?: string) {
    this.handoffDir = handoffDir || HANDOFF_DIR;
  }

  findHandoffFiles(): string[] {
    try {
      const files = fs.readdirSync(this.handoffDir);
      return files
        .filter((f) => f.startsWith("HANDOFF-") && f.endsWith(".md"))
        .map((f) => path.join(this.handoffDir, f));
    } catch {
      return [];
    }
  }

  parseHandoffMd(filePath: string): SessionSnapshot | null {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const stat = fs.statSync(filePath);

      // Extract session ID from filename
      const filename = path.basename(filePath);
      const match = filename.match(/HANDOFF-(.+)\.md$/);
      const sessionId = match ? match[1] : "unknown";

      // Parse basic metadata from markdown
      const familyMatch = content.match(/Family:\s*(\w+)/i);
      const machineMatch = content.match(/Machine:\s*(\S+)/i);
      const instanceMatch = content.match(/Instance:\s*(\S+)/i);

      // Extract claims from content
      const claimsMatch = content.match(/Claims?:\s*(.+)/i);
      const claims = claimsMatch
        ? claimsMatch[1].split(/[,;]/).map((c) => c.trim()).filter(Boolean)
        : [];

      // Extract open goals
      const goalsSection = content.match(/## Open Goals?\s*([\s\S]*?)(?=##|$)/i);
      const openGoals: HandoffOpenGoal[] = [];
      if (goalsSection) {
        const goalLines = goalsSection[1].split("\n").filter((l) => l.trim().startsWith("-"));
        goalLines.forEach((line, idx) => {
          openGoals.push({
            id: `goal-${idx}`,
            text: line.replace(/^-\s*/, "").trim(),
            priority: 1,
            depth: 0,
          });
        });
      }

      // Extract next actions
      const actionsSection = content.match(/## Next Actions?\s*([\s\S]*?)(?=##|$)/i);
      const nextActions: HandoffNextAction[] = [];
      if (actionsSection) {
        const actionLines = actionsSection[1].split("\n").filter((l) => l.trim().startsWith("-"));
        actionLines.forEach((line) => {
          nextActions.push({
            action: line.replace(/^-\s*/, "").trim(),
          });
        });
      }

      // Determine status based on file age
      const ageMs = Date.now() - stat.mtimeMs;
      const status: "active" | "completed" | "stale" =
        ageMs > STALE_THRESHOLD_MS ? "stale" : "active";

      return {
        sessionId,
        family: familyMatch?.[1] || "unknown",
        machine: machineMatch?.[1] || "unknown",
        instance: instanceMatch?.[1] || sessionId,
        lastActive: stat.mtime,
        claims,
        openGoals,
        nextActions,
        status,
      };
    } catch {
      return null;
    }
  }

  loadAllSessions(): SessionSnapshot[] {
    const files = this.findHandoffFiles();
    const sessions: SessionSnapshot[] = [];

    for (const file of files) {
      const snapshot = this.parseHandoffMd(file);
      if (snapshot) {
        sessions.push(snapshot);
      }
    }

    return sessions.sort((a, b) =>
      b.lastActive.getTime() - a.lastActive.getTime()
    );
  }

  detectConflicts(sessions: SessionSnapshot[]): ClaimConflict[] {
    const claimMap = new Map<string, string[]>();

    for (const session of sessions) {
      for (const claim of session.claims) {
        const existing = claimMap.get(claim) || [];
        existing.push(session.sessionId);
        claimMap.set(claim, existing);
      }
    }

    const conflicts: ClaimConflict[] = [];
    for (const [track, sessionIds] of claimMap) {
      if (sessionIds.length > 1) {
        conflicts.push({
          track,
          sessions: sessionIds,
          resolution: sessionIds.length === 2 ? "first-writer-wins" : "needs-manual",
          winner: sessionIds[0], // Most recent session wins
        });
      }
    }

    return conflicts;
  }

  mergeWorkQueues(sessions: SessionSnapshot[]): MergedWorkQueue {
    const conflicts = this.detectConflicts(sessions);
    const seenGoals = new Set<string>();
    const seenActions = new Set<string>();

    const pendingGoals: MergedWorkQueue["pendingGoals"] = [];
    const nextActions: MergedWorkQueue["nextActions"] = [];

    for (const session of sessions) {
      const ageMs = Date.now() - session.lastActive.getTime();

      for (const goal of session.openGoals) {
        const key = goal.text.toLowerCase().slice(0, 50);
        if (!seenGoals.has(key)) {
          seenGoals.add(key);
          pendingGoals.push({
            goal,
            fromSession: session.sessionId,
            age: Math.round(ageMs / 60000),
          });
        }
      }

      for (const action of session.nextActions) {
        const key = action.action.toLowerCase().slice(0, 50);
        if (!seenActions.has(key)) {
          seenActions.add(key);
          nextActions.push({
            action,
            fromSession: session.sessionId,
          });
        }
      }
    }

    // Sort by priority and age
    pendingGoals.sort((a, b) => a.goal.priority - b.goal.priority || a.age - b.age);
    nextActions.sort((a, b) => (b.action.blocking ? 1 : 0) - (a.action.blocking ? 1 : 0));

    return {
      pendingGoals: pendingGoals.slice(0, 10),
      nextActions: nextActions.slice(0, 5),
      conflicts,
      totalSessions: sessions.length,
      activeSessions: sessions.filter((s) => s.status === "active").length,
      staleSessions: sessions.filter((s) => s.status === "stale").length,
    };
  }

  coordinate(): HandoffCoordinationResult {
    const sessions = this.loadAllSessions();
    const workQueue = this.mergeWorkQueues(sessions);
    const recommendations: string[] = [];

    // Generate recommendations
    if (workQueue.conflicts.length > 0) {
      recommendations.push(
        `${workQueue.conflicts.length} claim conflicts detected — check ACTIVE_WORK_REGISTRY.json`
      );
    }

    if (workQueue.staleSessions > 0) {
      recommendations.push(
        `${workQueue.staleSessions} stale sessions (>30min) — consider cleanup`
      );
    }

    if (workQueue.pendingGoals.length > 5) {
      recommendations.push(
        `${workQueue.pendingGoals.length} pending goals — prioritize before starting new work`
      );
    }

    const blockingActions = workQueue.nextActions.filter((a) => a.action.blocking);
    if (blockingActions.length > 0) {
      recommendations.push(
        `${blockingActions.length} blocking actions — handle first`
      );
    }

    const tokenEstimate = Math.ceil(JSON.stringify(workQueue).length / 3.5);

    return {
      success: true,
      workQueue,
      recommendations,
      tokenEstimate,
    };
  }

  formatForInjection(): string {
    const result = this.coordinate();
    const lines: string[] = [];

    lines.push("## Multi-Session Handoff");
    lines.push(
      `Sessions: ${result.workQueue.totalSessions} total, ${result.workQueue.activeSessions} active, ${result.workQueue.staleSessions} stale`
    );

    if (result.workQueue.conflicts.length > 0) {
      lines.push("");
      lines.push("### Conflicts");
      for (const conflict of result.workQueue.conflicts) {
        lines.push(`- ${conflict.track}: ${conflict.sessions.join(" vs ")} → ${conflict.resolution}`);
      }
    }

    if (result.workQueue.nextActions.length > 0) {
      lines.push("");
      lines.push("### Next Actions");
      for (const { action, fromSession } of result.workQueue.nextActions.slice(0, 3)) {
        lines.push(`- ${action.action} (from ${fromSession})`);
      }
    }

    if (result.workQueue.pendingGoals.length > 0) {
      lines.push("");
      lines.push("### Pending Goals");
      for (const { goal, fromSession, age } of result.workQueue.pendingGoals.slice(0, 3)) {
        lines.push(`- ${goal.text} (${age}min ago, ${fromSession})`);
      }
    }

    if (result.recommendations.length > 0) {
      lines.push("");
      lines.push("### Recommendations");
      for (const rec of result.recommendations) {
        lines.push(`- ${rec}`);
      }
    }

    lines.push("");
    lines.push(`[~${result.tokenEstimate} tokens]`);

    return lines.join("\n");
  }

  cleanupStaleSessions(maxAgeMs: number = STALE_THRESHOLD_MS): number {
    const files = this.findHandoffFiles();
    let cleaned = 0;

    for (const file of files) {
      try {
        const stat = fs.statSync(file);
        const ageMs = Date.now() - stat.mtimeMs;
        if (ageMs > maxAgeMs) {
          fs.unlinkSync(file);
          cleaned++;
        }
      } catch {
        // Ignore cleanup errors
      }
    }

    return cleaned;
  }
}

export const multiSessionHandoffCoordinatorEngine = new MultiSessionHandoffCoordinatorEngine();
