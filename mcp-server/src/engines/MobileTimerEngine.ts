/**
 * MobileTimerEngine — Operation Timing & Cycle Tracking
 * ======================================================
 *
 * Tracks operation times, cycle counts, and provides time
 * studies for mobile shop floor applications.
 *
 * L2-P4-MS1/P0-U01 — Batch 2: Mobile Field Engines
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const TimerSessionSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  operationId: z.string(),
  operatorId: z.string(),
  machineId: z.string().optional(),
  type: z.enum(["setup", "run", "inspection", "rework"]),
  startTime: z.string(),
  endTime: z.string().optional(),
  elapsedSeconds: z.number(),
  cycleCount: z.number().default(0),
  status: z.enum(["running", "paused", "completed"]),
  pauseHistory: z.array(z.object({
    pausedAt: z.string(),
    resumedAt: z.string().optional(),
    reason: z.string().optional(),
  })),
  notes: z.string().optional(),
});

export const CycleRecordSchema = z.object({
  cycleNumber: z.number(),
  startTime: z.string(),
  endTime: z.string(),
  durationSeconds: z.number(),
  partCount: z.number().default(1),
  quality: z.enum(["good", "scrap", "rework"]).default("good"),
});

export const TimerStartInputSchema = z.object({
  jobId: z.string(),
  operationId: z.string(),
  operatorId: z.string(),
  machineId: z.string().optional(),
  type: z.enum(["setup", "run", "inspection", "rework"]),
});

export const TimeStudyResultSchema = z.object({
  jobId: z.string(),
  operationId: z.string(),
  sampleCount: z.number(),
  averageCycleSeconds: z.number(),
  minCycleSeconds: z.number(),
  maxCycleSeconds: z.number(),
  standardDeviation: z.number(),
  targetCycleSeconds: z.number().optional(),
  efficiency: z.number().optional(),
  recommendation: z.string(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimerSession = z.infer<typeof TimerSessionSchema>;
export type CycleRecord = z.infer<typeof CycleRecordSchema>;
export type TimerStartInput = z.infer<typeof TimerStartInputSchema>;
export type TimeStudyResult = z.infer<typeof TimeStudyResultSchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const activeSessions: Map<string, TimerSession> = new Map();
const cycleHistory: Map<string, CycleRecord[]> = new Map();
const completedSessions: TimerSession[] = [];
let sessionCounter = 1;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class MobileTimerEngine {
  /**
   * Start a new timer session
   * @param input - Timer start parameters
   * @returns New timer session
   */
  static startTimer(input: TimerStartInput): TimerSession {
    const validated = TimerStartInputSchema.parse(input);

    // Check for existing active session for this job/operation
    const existingKey = `${validated.jobId}-${validated.operationId}-${validated.operatorId}`;
    if (activeSessions.has(existingKey)) {
      throw new Error(`Timer already active for job ${validated.jobId} operation ${validated.operationId}`);
    }

    const session: TimerSession = {
      id: `TIM-${++sessionCounter}`,
      jobId: validated.jobId,
      operationId: validated.operationId,
      operatorId: validated.operatorId,
      machineId: validated.machineId,
      type: validated.type,
      startTime: new Date().toISOString(),
      elapsedSeconds: 0,
      cycleCount: 0,
      status: "running",
      pauseHistory: [],
    };

    activeSessions.set(session.id, session);
    return session;
  }

  /**
   * Pause an active timer
   * @param sessionId - Timer session ID
   * @param reason - Optional pause reason
   * @returns Updated session
   */
  static pauseTimer(sessionId: string, reason?: string): TimerSession | undefined {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== "running") return undefined;

    session.status = "paused";
    session.elapsedSeconds = this.calculateElapsed(session);
    session.pauseHistory.push({
      pausedAt: new Date().toISOString(),
      reason,
    });

    activeSessions.set(sessionId, session);
    return session;
  }

  /**
   * Resume a paused timer
   * @param sessionId - Timer session ID
   * @returns Updated session
   */
  static resumeTimer(sessionId: string): TimerSession | undefined {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== "paused") return undefined;

    const lastPause = session.pauseHistory[session.pauseHistory.length - 1];
    if (lastPause && !lastPause.resumedAt) {
      lastPause.resumedAt = new Date().toISOString();
    }

    session.status = "running";
    session.startTime = new Date().toISOString(); // Reset start for elapsed calculation
    activeSessions.set(sessionId, session);
    return session;
  }

  /**
   * Stop a timer and complete the session
   * @param sessionId - Timer session ID
   * @param notes - Optional completion notes
   * @returns Completed session
   */
  static stopTimer(sessionId: string, notes?: string): TimerSession | undefined {
    const session = activeSessions.get(sessionId);
    if (!session) return undefined;

    session.status = "completed";
    session.endTime = new Date().toISOString();
    session.elapsedSeconds = this.calculateElapsed(session);
    session.notes = notes;

    activeSessions.delete(sessionId);
    completedSessions.push(session);
    return session;
  }

  /**
   * Record a cycle completion
   * @param sessionId - Timer session ID
   * @param partCount - Parts completed in cycle
   * @param quality - Part quality
   * @returns Updated session and cycle record
   */
  static recordCycle(sessionId: string, partCount: number = 1, quality: CycleRecord["quality"] = "good"): { session: TimerSession; cycle: CycleRecord } | undefined {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== "running") return undefined;

    const now = new Date().toISOString();
    const cycles = cycleHistory.get(sessionId) || [];
    const lastCycle = cycles[cycles.length - 1];
    const cycleStart = lastCycle?.endTime || session.startTime;

    const cycle: CycleRecord = {
      cycleNumber: session.cycleCount + 1,
      startTime: cycleStart,
      endTime: now,
      durationSeconds: (new Date(now).getTime() - new Date(cycleStart).getTime()) / 1000,
      partCount,
      quality,
    };

    cycles.push(cycle);
    cycleHistory.set(sessionId, cycles);

    session.cycleCount++;
    activeSessions.set(sessionId, session);

    return { session, cycle };
  }

  /**
   * Get active timer for an operator
   * @param operatorId - Operator identifier
   * @returns Active sessions for operator
   */
  static getActiveTimers(operatorId?: string): TimerSession[] {
    let sessions = Array.from(activeSessions.values());
    if (operatorId) {
      sessions = sessions.filter(s => s.operatorId === operatorId);
    }
    return sessions.map(s => ({
      ...s,
      elapsedSeconds: this.calculateElapsed(s),
    }));
  }

  /**
   * Get timer session by ID
   * @param sessionId - Session identifier
   * @returns Timer session
   */
  static getTimer(sessionId: string): TimerSession | undefined {
    const session = activeSessions.get(sessionId);
    if (session) {
      return { ...session, elapsedSeconds: this.calculateElapsed(session) };
    }
    return completedSessions.find(s => s.id === sessionId);
  }

  /**
   * Get cycle history for a session
   * @param sessionId - Session identifier
   * @returns Cycle records
   */
  static getCycleHistory(sessionId: string): CycleRecord[] {
    return cycleHistory.get(sessionId) || [];
  }

  /**
   * Perform time study analysis
   * @param jobId - Job identifier
   * @param operationId - Operation identifier
   * @param targetSeconds - Optional target cycle time
   * @returns Time study results
   */
  static performTimeStudy(jobId: string, operationId: string, targetSeconds?: number): TimeStudyResult | null {
    const relevantSessions = completedSessions.filter(s => s.jobId === jobId && s.operationId === operationId && s.type === "run");

    if (relevantSessions.length === 0) return null;

    const allCycles: CycleRecord[] = [];
    relevantSessions.forEach(s => {
      const cycles = cycleHistory.get(s.id) || [];
      allCycles.push(...cycles);
    });

    if (allCycles.length === 0) return null;

    const durations = allCycles.map(c => c.durationSeconds);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const variance = durations.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / durations.length;
    const stdDev = Math.sqrt(variance);

    let recommendation = "Cycle times are consistent";
    if (stdDev / avg > 0.2) {
      recommendation = "High cycle time variation - investigate causes";
    }

    let efficiency: number | undefined;
    if (targetSeconds) {
      efficiency = Math.round((targetSeconds / avg) * 100);
      if (efficiency > 100) {
        recommendation = `Exceeding target by ${efficiency - 100}% - consider updating standard`;
      } else if (efficiency < 85) {
        recommendation = `${100 - efficiency}% below target - review process for improvements`;
      }
    }

    return {
      jobId,
      operationId,
      sampleCount: allCycles.length,
      averageCycleSeconds: Math.round(avg * 10) / 10,
      minCycleSeconds: Math.round(min * 10) / 10,
      maxCycleSeconds: Math.round(max * 10) / 10,
      standardDeviation: Math.round(stdDev * 10) / 10,
      targetCycleSeconds: targetSeconds,
      efficiency,
      recommendation,
    };
  }

  /**
   * Calculate elapsed time accounting for pauses
   */
  private static calculateElapsed(session: TimerSession): number {
    if (session.status === "completed" && session.endTime) {
      return session.elapsedSeconds;
    }

    if (session.status === "paused") {
      return session.elapsedSeconds;
    }

    const now = new Date().getTime();
    const start = new Date(session.startTime).getTime();
    return session.elapsedSeconds + Math.floor((now - start) / 1000);
  }

  /**
   * Format seconds as HH:MM:SS
   */
  static formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  static getSelfAwareness() {
    return {
      name: "MobileTimerEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U01",
      capabilities: ["startTimer", "pauseTimer", "resumeTimer", "stopTimer", "recordCycle", "getActiveTimers", "getTimer", "getCycleHistory", "performTimeStudy", "formatDuration"],
      activeSessions: activeSessions.size,
      completedSessions: completedSessions.length,
      dependencies: [],
    };
  }
}

export const mobileTimerEngine = new MobileTimerEngine();
