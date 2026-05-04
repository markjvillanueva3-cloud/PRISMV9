/**
 * CrossTerminalCoordinationEngine — Multi-Terminal Work Distribution
 *
 * Coordinates extraction and analysis work across multiple Claude terminals
 * to avoid duplicate effort and maximize throughput.
 *
 * U-AWR25: Cross-Terminal Coordination
 *
 * @module engines/CrossTerminalCoordinationEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type WorkItemStatus =
  | "pending"
  | "claimed"
  | "in_progress"
  | "completed"
  | "failed"
  | "abandoned";

export type WorkItemPriority = "critical" | "high" | "medium" | "low";

export interface WorkItem {
  id: string;
  type: string;
  target: string;
  priority: WorkItemPriority;
  status: WorkItemStatus;
  claimedBy: string | null;
  claimedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  estimatedMinutes: number;
  dependencies: string[];
  metadata: Record<string, unknown>;
}

export interface TerminalSession {
  sessionId: string;
  terminalName: string;
  startedAt: string;
  lastHeartbeat: string;
  currentWorkItem: string | null;
  completedCount: number;
  failedCount: number;
  specializations: string[];
}

export interface CoordinationState {
  workQueue: WorkItem[];
  activeSessions: TerminalSession[];
  completedItems: string[];
  failedItems: string[];
  lastUpdated: string;
}

export interface ClaimResult {
  success: boolean;
  workItem: WorkItem | null;
  reason?: string;
}

export interface DistributionStrategy {
  name: string;
  description: string;
  priorityWeight: number;
  specializationWeight: number;
  loadBalanceWeight: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const HEARTBEAT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_ESTIMATE_MINUTES = 30;

const WORK_TYPES = [
  "archive_extraction",
  "pdf_ocr",
  "image_analysis",
  "gcode_mining",
  "catalog_harvest",
  "document_indexing",
  "cad_validation",
  "cam_analysis",
] as const;

const STRATEGIES: Record<string, DistributionStrategy> = {
  priority_first: {
    name: "Priority First",
    description: "Always assign highest priority items first",
    priorityWeight: 1.0,
    specializationWeight: 0.2,
    loadBalanceWeight: 0.1,
  },
  balanced: {
    name: "Balanced",
    description: "Balance priority, specialization, and load",
    priorityWeight: 0.4,
    specializationWeight: 0.3,
    loadBalanceWeight: 0.3,
  },
  specialized: {
    name: "Specialized",
    description: "Prefer matching work to terminal specializations",
    priorityWeight: 0.2,
    specializationWeight: 0.6,
    loadBalanceWeight: 0.2,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateWorkItemId(): string {
  return `work-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

function priorityToScore(priority: WorkItemPriority): number {
  const scores: Record<WorkItemPriority, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  return scores[priority];
}

function isSessionAlive(session: TerminalSession): boolean {
  const lastBeat = new Date(session.lastHeartbeat).getTime();
  return Date.now() - lastBeat < HEARTBEAT_TIMEOUT_MS;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class CrossTerminalCoordinationEngine {
  private static workQueue: WorkItem[] = [];
  private static sessions: Map<string, TerminalSession> = new Map();
  private static completedItems: Set<string> = new Set();
  private static failedItems: Set<string> = new Set();
  private static currentStrategy: DistributionStrategy = STRATEGIES.balanced;

  /**
   * Registers a new terminal session.
   */
  static registerSession(
    terminalName: string,
    specializations: string[] = []
  ): TerminalSession {
    const sessionId = generateSessionId();
    const now = new Date().toISOString();

    const session: TerminalSession = {
      sessionId,
      terminalName,
      startedAt: now,
      lastHeartbeat: now,
      currentWorkItem: null,
      completedCount: 0,
      failedCount: 0,
      specializations,
    };

    this.sessions.set(sessionId, session);
    log.info(`[CrossTerminalCoordination] Registered session: ${sessionId} (${terminalName})`);

    return session;
  }

  /**
   * Updates session heartbeat to indicate it's still active.
   */
  static heartbeat(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.lastHeartbeat = new Date().toISOString();
    return true;
  }

  /**
   * Adds a work item to the queue.
   */
  static addWorkItem(
    type: string,
    target: string,
    options: {
      priority?: WorkItemPriority;
      estimatedMinutes?: number;
      dependencies?: string[];
      metadata?: Record<string, unknown>;
    } = {}
  ): WorkItem {
    const item: WorkItem = {
      id: generateWorkItemId(),
      type,
      target,
      priority: options.priority || "medium",
      status: "pending",
      claimedBy: null,
      claimedAt: null,
      startedAt: null,
      completedAt: null,
      estimatedMinutes: options.estimatedMinutes || DEFAULT_ESTIMATE_MINUTES,
      dependencies: options.dependencies || [],
      metadata: options.metadata || {},
    };

    this.workQueue.push(item);
    log.info(`[CrossTerminalCoordination] Added work item: ${item.id} (${type})`);

    return item;
  }

  /**
   * Adds multiple work items in batch.
   */
  static addWorkItems(
    items: Array<{
      type: string;
      target: string;
      priority?: WorkItemPriority;
      estimatedMinutes?: number;
      metadata?: Record<string, unknown>;
    }>
  ): WorkItem[] {
    return items.map((item) =>
      this.addWorkItem(item.type, item.target, {
        priority: item.priority,
        estimatedMinutes: item.estimatedMinutes,
        metadata: item.metadata,
      })
    );
  }

  /**
   * Claims the next available work item for a session.
   */
  static claimWork(sessionId: string): ClaimResult {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, workItem: null, reason: "Session not found" };
    }

    if (session.currentWorkItem) {
      return {
        success: false,
        workItem: null,
        reason: "Session already has active work item",
      };
    }

    // Update heartbeat
    session.lastHeartbeat = new Date().toISOString();

    // Find best available item
    const available = this.workQueue.filter(
      (item) =>
        item.status === "pending" &&
        this.areDependenciesMet(item.dependencies)
    );

    if (available.length === 0) {
      return { success: false, workItem: null, reason: "No work available" };
    }

    // Score and sort items
    const scored = available.map((item) => ({
      item,
      score: this.scoreWorkItem(item, session),
    }));
    scored.sort((a, b) => b.score - a.score);

    const bestItem = scored[0].item;
    const now = new Date().toISOString();

    bestItem.status = "claimed";
    bestItem.claimedBy = sessionId;
    bestItem.claimedAt = now;
    session.currentWorkItem = bestItem.id;

    log.info(
      `[CrossTerminalCoordination] ${sessionId} claimed ${bestItem.id}`
    );

    return { success: true, workItem: bestItem };
  }

  /**
   * Marks work as started.
   */
  static startWork(sessionId: string, workItemId: string): boolean {
    const item = this.workQueue.find((w) => w.id === workItemId);
    if (!item || item.claimedBy !== sessionId) return false;

    item.status = "in_progress";
    item.startedAt = new Date().toISOString();

    log.info(`[CrossTerminalCoordination] ${sessionId} started ${workItemId}`);
    return true;
  }

  /**
   * Marks work as completed.
   */
  static completeWork(
    sessionId: string,
    workItemId: string,
    result?: Record<string, unknown>
  ): boolean {
    const item = this.workQueue.find((w) => w.id === workItemId);
    const session = this.sessions.get(sessionId);

    if (!item || item.claimedBy !== sessionId || !session) return false;

    item.status = "completed";
    item.completedAt = new Date().toISOString();
    if (result) {
      item.metadata = { ...item.metadata, result };
    }

    session.currentWorkItem = null;
    session.completedCount++;
    this.completedItems.add(workItemId);

    log.info(
      `[CrossTerminalCoordination] ${sessionId} completed ${workItemId}`
    );
    return true;
  }

  /**
   * Marks work as failed.
   */
  static failWork(
    sessionId: string,
    workItemId: string,
    error?: string
  ): boolean {
    const item = this.workQueue.find((w) => w.id === workItemId);
    const session = this.sessions.get(sessionId);

    if (!item || item.claimedBy !== sessionId || !session) return false;

    item.status = "failed";
    item.completedAt = new Date().toISOString();
    if (error) {
      item.metadata = { ...item.metadata, error };
    }

    session.currentWorkItem = null;
    session.failedCount++;
    this.failedItems.add(workItemId);

    log.info(
      `[CrossTerminalCoordination] ${sessionId} failed ${workItemId}: ${error}`
    );
    return true;
  }

  /**
   * Abandons claimed work (releases it back to queue).
   */
  static abandonWork(sessionId: string, workItemId: string): boolean {
    const item = this.workQueue.find((w) => w.id === workItemId);
    const session = this.sessions.get(sessionId);

    if (!item || item.claimedBy !== sessionId || !session) return false;

    item.status = "pending";
    item.claimedBy = null;
    item.claimedAt = null;
    item.startedAt = null;

    session.currentWorkItem = null;

    log.info(
      `[CrossTerminalCoordination] ${sessionId} abandoned ${workItemId}`
    );
    return true;
  }

  /**
   * Checks if all dependencies for a work item are met.
   */
  private static areDependenciesMet(dependencies: string[]): boolean {
    return dependencies.every((dep) => this.completedItems.has(dep));
  }

  /**
   * Scores a work item for a session based on current strategy.
   */
  private static scoreWorkItem(
    item: WorkItem,
    session: TerminalSession
  ): number {
    const strategy = this.currentStrategy;

    // Priority score (0-4)
    const priorityScore =
      priorityToScore(item.priority) * strategy.priorityWeight;

    // Specialization score (0-1)
    const specializationScore = session.specializations.includes(item.type)
      ? strategy.specializationWeight
      : 0;

    // Load balance score (favor sessions with fewer completions)
    const avgCompletions = this.getAverageCompletions();
    const loadScore =
      avgCompletions > 0
        ? (1 - session.completedCount / avgCompletions) *
          strategy.loadBalanceWeight
        : strategy.loadBalanceWeight;

    return priorityScore + specializationScore + loadScore;
  }

  /**
   * Gets average completions across all active sessions.
   */
  private static getAverageCompletions(): number {
    const activeSessions = [...this.sessions.values()].filter(isSessionAlive);
    if (activeSessions.length === 0) return 0;

    const total = activeSessions.reduce((sum, s) => sum + s.completedCount, 0);
    return total / activeSessions.length;
  }

  /**
   * Sets the distribution strategy.
   */
  static setStrategy(strategyName: string): boolean {
    const strategy = STRATEGIES[strategyName];
    if (!strategy) return false;

    this.currentStrategy = strategy;
    log.info(`[CrossTerminalCoordination] Strategy set to: ${strategyName}`);
    return true;
  }

  /**
   * Gets available strategies.
   */
  static getStrategies(): DistributionStrategy[] {
    return Object.values(STRATEGIES);
  }

  /**
   * Gets current strategy.
   */
  static getCurrentStrategy(): DistributionStrategy {
    return this.currentStrategy;
  }

  /**
   * Cleans up abandoned sessions and their work items.
   */
  static cleanupAbandonedSessions(): number {
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions) {
      if (!isSessionAlive(session)) {
        // Release any claimed work
        if (session.currentWorkItem) {
          const item = this.workQueue.find(
            (w) => w.id === session.currentWorkItem
          );
          if (item && item.status !== "completed") {
            item.status = "abandoned";
            item.claimedBy = null;
            item.claimedAt = null;
          }
        }

        this.sessions.delete(sessionId);
        cleaned++;
        log.info(
          `[CrossTerminalCoordination] Cleaned up abandoned session: ${sessionId}`
        );
      }
    }

    return cleaned;
  }

  /**
   * Gets the current coordination state.
   */
  static getState(): CoordinationState {
    return {
      workQueue: [...this.workQueue],
      activeSessions: [...this.sessions.values()].filter(isSessionAlive),
      completedItems: [...this.completedItems],
      failedItems: [...this.failedItems],
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Gets queue statistics.
   */
  static getQueueStats(): {
    total: number;
    pending: number;
    claimed: number;
    inProgress: number;
    completed: number;
    failed: number;
    byType: Record<string, number>;
    byPriority: Record<WorkItemPriority, number>;
  } {
    const byType: Record<string, number> = {};
    const byPriority: Record<WorkItemPriority, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    let pending = 0;
    let claimed = 0;
    let inProgress = 0;
    let completed = 0;
    let failed = 0;

    for (const item of this.workQueue) {
      byType[item.type] = (byType[item.type] || 0) + 1;
      byPriority[item.priority]++;

      switch (item.status) {
        case "pending":
          pending++;
          break;
        case "claimed":
          claimed++;
          break;
        case "in_progress":
          inProgress++;
          break;
        case "completed":
          completed++;
          break;
        case "failed":
          failed++;
          break;
      }
    }

    return {
      total: this.workQueue.length,
      pending,
      claimed,
      inProgress,
      completed,
      failed,
      byType,
      byPriority,
    };
  }

  /**
   * Gets session statistics.
   */
  static getSessionStats(): {
    total: number;
    active: number;
    idle: number;
    working: number;
    totalCompleted: number;
    totalFailed: number;
  } {
    const sessions = [...this.sessions.values()];
    const active = sessions.filter(isSessionAlive);

    return {
      total: sessions.length,
      active: active.length,
      idle: active.filter((s) => !s.currentWorkItem).length,
      working: active.filter((s) => s.currentWorkItem).length,
      totalCompleted: sessions.reduce((sum, s) => sum + s.completedCount, 0),
      totalFailed: sessions.reduce((sum, s) => sum + s.failedCount, 0),
    };
  }

  /**
   * Gets work item by ID.
   */
  static getWorkItem(id: string): WorkItem | null {
    return this.workQueue.find((w) => w.id === id) || null;
  }

  /**
   * Gets session by ID.
   */
  static getSession(sessionId: string): TerminalSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Gets all active sessions.
   */
  static getActiveSessions(): TerminalSession[] {
    return [...this.sessions.values()].filter(isSessionAlive);
  }

  /**
   * Gets pending work items.
   */
  static getPendingWork(): WorkItem[] {
    return this.workQueue.filter((w) => w.status === "pending");
  }

  /**
   * Supported work types.
   */
  static getWorkTypes(): readonly string[] {
    return WORK_TYPES;
  }

  /**
   * Resets all state.
   */
  static reset(): void {
    this.workQueue = [];
    this.sessions.clear();
    this.completedItems.clear();
    this.failedItems.clear();
    this.currentStrategy = STRATEGIES.balanced;
    log.info("[CrossTerminalCoordination] State reset");
  }
}

export const crossTerminalCoordinationEngine = CrossTerminalCoordinationEngine;
export default CrossTerminalCoordinationEngine;
