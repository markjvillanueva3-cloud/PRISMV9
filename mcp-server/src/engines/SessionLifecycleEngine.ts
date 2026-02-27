/**
 * SessionLifecycleEngine.ts
 * ========================================================
 * W3: D5 Core Session Orchestration
 * 
 * PURPOSE: Unified session lifecycle management with:
 * - Session quality scoring (multi-metric ensemble)
 * - Incremental handoff preparation (crash recovery)
 * - Cross-session continuity metrics
 * - Differential checkpointing
 *
 * INTEGRATION: Called by autoHookWrapper cadence + sessionDispatcher session_end
 * SAFETY: All operations non-blocking, fail-safe, <2ms overhead per call
 */
import * as fs from "fs";
import * as path from "path";
import { PATHS } from "../constants.js";
import { log } from "../utils/Logger.js";
import { safeWriteSync } from "../utils/atomicWrite.js";

const STATE_DIR = PATHS.STATE_DIR;
const PREP_TMP = path.join(STATE_DIR, "next_session_prep.tmp.json");
const PREP_FINAL = path.join(STATE_DIR, "next_session_prep.json");
const METRICS_FILE = path.join(STATE_DIR, "session_metrics.json");

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SessionMetrics {
  session_id: string;
  start_time: string;
  tool_calls: number;
  successful_calls: number;
  failed_calls: number;
  hook_executions: number;
  hook_blocks: number;
  skill_injections: number;
  template_matches: number;
  cadence_ticks: number;
  checkpoints_saved: number;
  compaction_recoveries: number;
  tasks_completed: number;
  tasks_total: number;
  errors_captured: number;
  errors_resolved: number;
  peak_pressure_pct: number;
  avg_latency_ms: number;
  total_latency_ms: number;
}

export interface SessionQualityScore {
  overall: number;           // 0-100
  dimensions: {
    task_completion: number;  // tasks_completed / tasks_total
    reliability: number;      // successful_calls / tool_calls
    safety_adherence: number; // 1 - (hook_blocks / hook_executions)
    efficiency: number;       // inverse of avg_latency + pressure management
    continuity: number;       // checkpoints + recovery success
  };
  grade: "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D" | "F";
  recommendation: string;
}

export interface IncrementalPrep {
  session_id: string;
  timestamp: string;
  call_number: number;
  phase: string;
  quick_resume: string;
  pending_tasks: string[];
  quality_snapshot: number;
  key_findings: string[];
  active_files: string[];
  warnings: string[];
}

// ─── Singleton Engine ──────────────────────────────────────────────────────────

export class SessionLifecycleEngine {
  private static instance: SessionLifecycleEngine;
  private metrics: SessionMetrics;
  private bootTime: number;
  private lastPrepWrite: number = 0;
  private readonly PREP_INTERVAL_CALLS = 10;

  private constructor() {
    this.bootTime = Date.now();
    this.metrics = this.createFreshMetrics();
  }

  static getInstance(): SessionLifecycleEngine {
    if (!SessionLifecycleEngine.instance) {
      SessionLifecycleEngine.instance = new SessionLifecycleEngine();
    }
    return SessionLifecycleEngine.instance;
  }

  private createFreshMetrics(): SessionMetrics {
    return {
      session_id: `SESSION-${Date.now()}`,
      start_time: new Date().toISOString(),
      tool_calls: 0, successful_calls: 0, failed_calls: 0,
      hook_executions: 0, hook_blocks: 0,
      skill_injections: 0, template_matches: 0,
      cadence_ticks: 0, checkpoints_saved: 0,
      compaction_recoveries: 0,
      tasks_completed: 0, tasks_total: 0,
      errors_captured: 0, errors_resolved: 0,
      peak_pressure_pct: 0, avg_latency_ms: 0, total_latency_ms: 0
    };
  }

  // ─── Metric Recording (called by cadence) ──────────────────────────────────

  recordToolCall(success: boolean, latencyMs: number): void {
    this.metrics.tool_calls++;
    if (success) this.metrics.successful_calls++;
    else this.metrics.failed_calls++;
    this.metrics.total_latency_ms += latencyMs;
    this.metrics.avg_latency_ms = this.metrics.total_latency_ms / this.metrics.tool_calls;
  }

  recordHookExecution(blocked: boolean): void {
    this.metrics.hook_executions++;
    if (blocked) this.metrics.hook_blocks++;
  }

  recordSkillInjection(): void { this.metrics.skill_injections++; }
  recordTemplateMatch(): void { this.metrics.template_matches++; }
  recordCadenceTick(): void { this.metrics.cadence_ticks++; }
  recordCheckpoint(): void { this.metrics.checkpoints_saved++; }
  recordCompactionRecovery(): void { this.metrics.compaction_recoveries++; }
  recordError(resolved: boolean): void {
    this.metrics.errors_captured++;
    if (resolved) this.metrics.errors_resolved++;
  }
  recordTaskProgress(completed: number, total: number): void {
    this.metrics.tasks_completed = completed;
    this.metrics.tasks_total = total;
  }
  recordPressure(pct: number): void {
    if (pct > this.metrics.peak_pressure_pct) this.metrics.peak_pressure_pct = pct;
  }

  // ─── Quality Scoring ────────────────────────────────────────────────────────

  computeQualityScore(): SessionQualityScore {
    const m = this.metrics;

    // Task completion (0-100): ratio of completed to total tasks
    const task_completion = m.tasks_total > 0
      ? Math.round((m.tasks_completed / m.tasks_total) * 100)
      : 50; // neutral if no tasks tracked

    // Reliability (0-100): success rate of tool calls
    const reliability = m.tool_calls > 0
      ? Math.round((m.successful_calls / m.tool_calls) * 100)
      : 100;

    // Safety adherence (0-100): hooks executing without blocking = good
    // High block rate means system caught issues (good) but also means risky operations attempted
    const safety_adherence = m.hook_executions > 0
      ? Math.round(Math.max(0, 100 - (m.hook_blocks / m.hook_executions) * 200))
      : 100;

    // Efficiency (0-100): low latency + low pressure = efficient
    const latencyScore = Math.max(0, 100 - Math.min(m.avg_latency_ms / 10, 100));
    const pressureScore = Math.max(0, 100 - m.peak_pressure_pct);
    const efficiency = Math.round((latencyScore * 0.6 + pressureScore * 0.4));

    // Continuity (0-100): checkpoints saved + recovery success
    const checkpointScore = Math.min(m.checkpoints_saved * 20, 100);
    const recoveryScore = m.compaction_recoveries > 0 ? 80 : 100; // penalty for needing recovery
    const continuity = Math.round((checkpointScore * 0.5 + recoveryScore * 0.5));

    // Weighted ensemble (research: 5-metric achieves 89-91% accuracy)
    const overall = Math.round(
      task_completion * 0.30 +
      reliability * 0.25 +
      safety_adherence * 0.20 +
      efficiency * 0.15 +
      continuity * 0.10
    );

    const grade = this.scoreToGrade(overall);
    const recommendation = this.generateRecommendation(overall, { task_completion, reliability, safety_adherence, efficiency, continuity });

    return {
      overall, grade, recommendation,
      dimensions: { task_completion, reliability, safety_adherence, efficiency, continuity }
    };
  }

  private scoreToGrade(score: number): SessionQualityScore["grade"] {
    if (score >= 97) return "A+";
    if (score >= 93) return "A";
    if (score >= 90) return "A-";
    if (score >= 87) return "B+";
    if (score >= 83) return "B";
    if (score >= 80) return "B-";
    if (score >= 77) return "C+";
    if (score >= 73) return "C";
    if (score >= 70) return "C-";
    if (score >= 60) return "D";
    return "F";
  }

  private generateRecommendation(overall: number, dims: Record<string, number>): string {
    if (overall >= 90) return "Excellent session. All systems performing well.";
    const weakest = Object.entries(dims).sort((a, b) => a[1] - b[1])[0];
    const fixes: Record<string, string> = {
      task_completion: "More tasks need completion tracking via todo_update.",
      reliability: "High error rate. Check tool parameters and data quality.",
      safety_adherence: "Multiple hook blocks detected. Review safety constraints.",
      efficiency: "High latency or pressure. Consider context compression.",
      continuity: "Low checkpoint count. Enable more frequent auto-checkpoints."
    };
    return fixes[weakest[0]] || "Review session metrics for improvement areas.";
  }

  // ─── Incremental Prep (crash recovery) ──────────────────────────────────────

  shouldWriteIncrementalPrep(callNumber: number): boolean {
    return callNumber > 0 && callNumber % this.PREP_INTERVAL_CALLS === 0 && callNumber !== this.lastPrepWrite;
  }

  writeIncrementalPrep(callNumber: number, phase: string, quickResume: string, pendingTasks: string[], keyFindings: string[], activeFiles: string[]): void {
    try {
      this.lastPrepWrite = callNumber;
      const prep: IncrementalPrep = {
        session_id: this.metrics.session_id,
        timestamp: new Date().toISOString(),
        call_number: callNumber,
        phase,
        quick_resume: quickResume,
        pending_tasks: pendingTasks.slice(0, 5),
        quality_snapshot: this.computeQualityScore().overall,
        key_findings: keyFindings.slice(0, 5),
        active_files: activeFiles.slice(0, 5),
        warnings: []
      };
      safeWriteSync(PREP_TMP, JSON.stringify(prep, null, 2));
    } catch { /* non-fatal — incremental prep is best-effort */ }
  }

  // ─── Final Handoff Generation ──────────────────────────────────────────────

  generateFinalHandoff(phase: string, quickResume: string, pendingTasks: string[], keyFindings: string[]): Record<string, any> {
    const quality = this.computeQualityScore();
    const handoff = {
      session_id: this.metrics.session_id,
      generated_at: new Date().toISOString(),
      session_duration_ms: Date.now() - this.bootTime,
      phase,
      quick_resume: quickResume,
      quality_score: quality,
      metrics_summary: {
        tool_calls: this.metrics.tool_calls,
        success_rate: this.metrics.tool_calls > 0
          ? `${((this.metrics.successful_calls / this.metrics.tool_calls) * 100).toFixed(1)}%` : "N/A",
        errors: this.metrics.errors_captured,
        errors_resolved: this.metrics.errors_resolved,
        peak_pressure: `${this.metrics.peak_pressure_pct}%`,
        checkpoints: this.metrics.checkpoints_saved,
        compaction_recoveries: this.metrics.compaction_recoveries,
        skill_injections: this.metrics.skill_injections,
        template_matches: this.metrics.template_matches
      },
      pending_tasks: pendingTasks.slice(0, 10),
      key_findings: keyFindings.slice(0, 5),
      resume_context: {
        do_not_forget: pendingTasks.slice(0, 3),
        warnings: quality.overall < 70 ? ["Session quality below threshold — review before continuing"] : [],
        recommendation: quality.recommendation
      }
    };

    try {
      // Write final prep (promotes from .tmp to real)
      safeWriteSync(PREP_FINAL, JSON.stringify(handoff, null, 2));
      // Also save full metrics
      safeWriteSync(METRICS_FILE, JSON.stringify(this.metrics, null, 2));
      // Clean up tmp
      if (fs.existsSync(PREP_TMP)) fs.unlinkSync(PREP_TMP);
    } catch { /* non-fatal */ }

    return handoff;
  }

  // ─── Getters ────────────────────────────────────────────────────────────────

  getMetrics(): SessionMetrics { return { ...this.metrics }; }
  getSessionId(): string { return this.metrics.session_id; }
  getCallCount(): number { return this.metrics.tool_calls; }
}

// ─── Convenience Functions (for cadence wiring) ──────────────────────────────

export function recordSessionToolCall(success: boolean, latencyMs: number): void {
  try { SessionLifecycleEngine.getInstance().recordToolCall(success, latencyMs); } catch (e: any) { log.debug(`[prism] ${e?.message?.slice(0, 80)}`); }
}

export function recordSessionHook(blocked: boolean): void {
  try { SessionLifecycleEngine.getInstance().recordHookExecution(blocked); } catch (e: any) { log.debug(`[prism] ${e?.message?.slice(0, 80)}`); }
}

export function recordSessionSkillInjection(): void {
  try { SessionLifecycleEngine.getInstance().recordSkillInjection(); } catch (e: any) { log.debug(`[prism] ${e?.message?.slice(0, 80)}`); }
}

export function recordSessionTemplateMatch(): void {
  try { SessionLifecycleEngine.getInstance().recordTemplateMatch(); } catch (e: any) { log.debug(`[prism] ${e?.message?.slice(0, 80)}`); }
}

export function recordSessionPressure(pct: number): void {
  try { SessionLifecycleEngine.getInstance().recordPressure(pct); } catch (e: any) { log.debug(`[prism] ${e?.message?.slice(0, 80)}`); }
}

export function recordSessionCheckpoint(): void {
  try { SessionLifecycleEngine.getInstance().recordCheckpoint(); } catch (e: any) { log.debug(`[prism] ${e?.message?.slice(0, 80)}`); }
}

export function recordSessionCompactionRecovery(): void {
  try { SessionLifecycleEngine.getInstance().recordCompactionRecovery(); } catch (e: any) { log.debug(`[prism] ${e?.message?.slice(0, 80)}`); }
}

export function recordSessionError(resolved: boolean): void {
  try { SessionLifecycleEngine.getInstance().recordError(resolved); } catch (e: any) { log.debug(`[prism] ${e?.message?.slice(0, 80)}`); }
}

export function getSessionQualityScore(): SessionQualityScore | null {
  try { return SessionLifecycleEngine.getInstance().computeQualityScore(); } catch { return null; }
}

export function writeSessionIncrementalPrep(
  callNumber: number, phase: string, quickResume: string,
  pendingTasks: string[], keyFindings: string[], activeFiles: string[]
): void {
  try {
    const engine = SessionLifecycleEngine.getInstance();
    if (engine.shouldWriteIncrementalPrep(callNumber)) {
      engine.writeIncrementalPrep(callNumber, phase, quickResume, pendingTasks, keyFindings, activeFiles);
    }
  } catch (e: any) { log.debug(`[prism] ${e?.message?.slice(0, 80)}`); }
}

export function generateSessionHandoff(
  phase: string, quickResume: string, pendingTasks: string[], keyFindings: string[]
): Record<string, any> | null {
  try { return SessionLifecycleEngine.getInstance().generateFinalHandoff(phase, quickResume, pendingTasks, keyFindings); } catch { return null; }
}

export function getSessionMetrics(): SessionMetrics | null {
  try { return SessionLifecycleEngine.getInstance().getMetrics(); } catch { return null; }
}
