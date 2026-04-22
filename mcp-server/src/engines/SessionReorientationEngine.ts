/**
 * SessionReorientationEngine
 *
 * For very long sessions (especially 1M-context), valuable context gets
 * buried under turns and turns of intermediate work. This engine generates
 * a "reorientation brief" — a compact in-context refresh that surfaces:
 *
 *   - Current task / objective
 *   - Active files (most recently edited)
 *   - Recent decisions and their rationale
 *   - Open todos
 *   - Recent errors that were resolved (so we don't loop)
 *   - Files already read (so we don't re-read)
 *
 * Different from compaction: nothing is dropped from history. The brief
 * is INJECTED via a UserPromptSubmit hook so Claude re-anchors on what's
 * relevant NOW, without losing any prior context.
 *
 * Triggers:
 *   - Every N user prompts (default 15)
 *   - Every K tool calls (default 50)
 *   - On manual /reorient
 *   - On detected drift (topic divergence > threshold)
 *
 * Anchor types tracked:
 *   - task_anchor:    A new task started or major pivot
 *   - decision:       Key choice with rationale
 *   - file_modified:  Edit/Write to source file
 *   - error_resolved: Error that was hit and fixed
 *   - milestone:      Completed unit of work
 *   - user_directive: Explicit user instruction
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

export type AnchorType =
  | "task_anchor"
  | "decision"
  | "file_modified"
  | "error_resolved"
  | "milestone"
  | "user_directive";

export interface SessionAnchor {
  id: string;
  type: AnchorType;
  timestamp: string;
  /** Compact summary <= 200 chars */
  summary: string;
  /** Optional rationale for decisions */
  rationale?: string;
  /** Files referenced by this anchor */
  files: string[];
  /** Importance 1-10 (10 = MUST surface in every brief) */
  importance: number;
  /** Whether this anchor is still active (false = superseded/done) */
  active: boolean;
  /** Topic tags for drift detection */
  tags: string[];
}

export interface ReorientationBrief {
  generatedAt: string;
  sessionAge: { promptsSeen: number; toolCallsSeen: number };
  currentObjective: string | null;
  activeFiles: string[];
  recentDecisions: Array<{ summary: string; rationale?: string }>;
  openTodos: string[];
  resolvedErrors: string[];
  driftDetected: boolean;
  driftFromTags: string[];
  driftToTags: string[];
  /** Markdown-formatted brief ready for injection */
  markdown: string;
  estimatedTokens: number;
}

export interface SessionStats {
  promptsSeen: number;
  toolCallsSeen: number;
  anchorsRecorded: number;
  briefsGenerated: number;
  lastBriefAt: string | null;
  promptsSinceLastBrief: number;
  toolCallsSinceLastBrief: number;
}

interface State {
  sessionId: string;
  anchors: SessionAnchor[];
  stats: SessionStats;
  config: {
    promptInterval: number;     // Generate brief every N prompts
    toolCallInterval: number;   // Generate brief every K tool calls
    maxAnchors: number;         // Cap on stored anchors
    driftWindowSize: number;    // # recent anchors to compute "current" tags
    driftThreshold: number;     // 0..1, fraction of new tags that signals drift
  };
  briefHistory: Array<{ at: string; tokens: number; trigger: string }>;
}

const STATE_DIR = "H:/prism/state/session-reorientation";
const getStateFile = (sessionId?: string): string => {
  const id = sessionId || process.env.CLAUDE_SESSION_ID || "default";
  return `${STATE_DIR}/reorientation-${id}.json`;
};

const DEFAULT_CONFIG: State["config"] = {
  promptInterval: 15,
  toolCallInterval: 50,
  maxAnchors: 200,
  driftWindowSize: 10,
  driftThreshold: 0.7,
};

export class SessionReorientationEngine {
  private state: State;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): State {
    const sessionId = process.env.CLAUDE_SESSION_ID || "default";
    try {
      const file = getStateFile(sessionId);
      if (existsSync(file)) {
        const loaded = JSON.parse(readFileSync(file, "utf-8")) as State;
        // Backfill any missing config fields with defaults
        loaded.config = { ...DEFAULT_CONFIG, ...loaded.config };
        return loaded;
      }
    } catch {
      // ignore
    }
    return {
      sessionId,
      anchors: [],
      stats: {
        promptsSeen: 0,
        toolCallsSeen: 0,
        anchorsRecorded: 0,
        briefsGenerated: 0,
        lastBriefAt: null,
        promptsSinceLastBrief: 0,
        toolCallsSinceLastBrief: 0,
      },
      config: { ...DEFAULT_CONFIG },
      briefHistory: [],
    };
  }

  private saveState(): void {
    if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
    if (this.state.anchors.length > this.state.config.maxAnchors) {
      // Keep highest-importance + most-recent active anchors
      this.state.anchors = this.state.anchors
        .sort((a, b) => {
          if (a.active !== b.active) return a.active ? -1 : 1;
          if (a.importance !== b.importance) return b.importance - a.importance;
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        })
        .slice(0, this.state.config.maxAnchors);
    }
    writeFileSync(getStateFile(this.state.sessionId), JSON.stringify(this.state, null, 2));
  }

  private generateId(): string {
    return `anc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private extractTags(summary: string, files: string[]): string[] {
    const tags = new Set<string>();
    // File-extension tags
    for (const f of files) {
      const ext = f.split(".").pop()?.toLowerCase();
      if (ext && ext.length <= 5) tags.add(`ext:${ext}`);
      // Top-level module tag (e.g. "engines", "hooks", "schemas")
      const match = f.match(/(?:src|mcp-server|state|\.claude)\/([^/]+)/);
      if (match) tags.add(`mod:${match[1]}`);
    }
    // Domain keyword tags from summary
    const domainKeywords = [
      "test", "engine", "hook", "skill", "dispatcher", "schema",
      "kienzle", "taylor", "speed", "feed", "tool", "material",
      "wedm", "lathe", "mill", "cad", "cam", "edm", "grind",
      "force", "thermal", "chatter", "wear", "deflection",
      "compact", "context", "token", "session",
    ];
    const lower = summary.toLowerCase();
    for (const kw of domainKeywords) {
      if (lower.includes(kw)) tags.add(`kw:${kw}`);
    }
    return [...tags];
  }

  /**
   * Record a session anchor — a noteworthy moment that should be
   * surfaced in future reorientation briefs.
   */
  recordAnchor(
    type: AnchorType,
    summary: string,
    options: {
      rationale?: string;
      files?: string[];
      importance?: number;
      tags?: string[];
    } = {}
  ): SessionAnchor {
    const files = options.files ?? [];
    const summaryTrim = summary.slice(0, 200);
    const anchor: SessionAnchor = {
      id: this.generateId(),
      type,
      timestamp: new Date().toISOString(),
      summary: summaryTrim,
      rationale: options.rationale,
      files,
      importance: Math.max(1, Math.min(10, options.importance ?? this.defaultImportance(type))),
      active: true,
      tags: options.tags ?? this.extractTags(summaryTrim, files),
    };
    this.state.anchors.push(anchor);
    this.state.stats.anchorsRecorded += 1;
    this.saveState();
    return anchor;
  }

  private defaultImportance(type: AnchorType): number {
    const map: Record<AnchorType, number> = {
      user_directive: 10,
      task_anchor: 9,
      milestone: 8,
      decision: 7,
      error_resolved: 5,
      file_modified: 3,
    };
    return map[type] ?? 5;
  }

  /**
   * Mark an anchor as no longer active (superseded, completed, or canceled).
   */
  deactivate(anchorId: string): boolean {
    const anchor = this.state.anchors.find((a) => a.id === anchorId);
    if (!anchor) return false;
    anchor.active = false;
    this.saveState();
    return true;
  }

  /**
   * Increment prompt counter (call from UserPromptSubmit hook).
   * Returns true if a brief should be generated.
   */
  recordPrompt(): boolean {
    this.state.stats.promptsSeen += 1;
    this.state.stats.promptsSinceLastBrief += 1;
    const trigger =
      this.state.stats.promptsSinceLastBrief >= this.state.config.promptInterval ||
      this.state.stats.toolCallsSinceLastBrief >= this.state.config.toolCallInterval;
    this.saveState();
    return trigger;
  }

  /**
   * Increment tool call counter (call from PostToolUse hook).
   * Returns true if a brief should be generated.
   */
  recordToolCall(): boolean {
    this.state.stats.toolCallsSeen += 1;
    this.state.stats.toolCallsSinceLastBrief += 1;
    const trigger =
      this.state.stats.toolCallsSinceLastBrief >= this.state.config.toolCallInterval;
    this.saveState();
    return trigger;
  }

  /**
   * Compute "current focus" tags from the most recent N anchors.
   */
  private currentFocusTags(): string[] {
    const recent = this.state.anchors
      .filter((a) => a.active)
      .slice(-this.state.config.driftWindowSize);
    const tagCounts = new Map<string, number>();
    for (const a of recent) {
      for (const t of a.tags) {
        tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
      }
    }
    return [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([t]) => t);
  }

  /**
   * Detect topic drift by comparing current focus tags to focus tags
   * from N anchors ago.
   */
  private detectDrift(): { drifted: boolean; from: string[]; to: string[] } {
    const window = this.state.config.driftWindowSize;
    const active = this.state.anchors.filter((a) => a.active);
    if (active.length < window * 2) {
      return { drifted: false, from: [], to: [] };
    }
    const olderSlice = active.slice(-window * 2, -window);
    const recentSlice = active.slice(-window);

    const collectTags = (anchors: SessionAnchor[]): Set<string> => {
      const s = new Set<string>();
      for (const a of anchors) {
        for (const t of a.tags) s.add(t);
      }
      return s;
    };
    const fromTags = collectTags(olderSlice);
    const toTags = collectTags(recentSlice);

    const intersection = [...fromTags].filter((t) => toTags.has(t));
    const overlap = fromTags.size > 0 ? intersection.length / fromTags.size : 1;
    const drifted = overlap < 1 - this.state.config.driftThreshold;

    return {
      drifted,
      from: [...fromTags].filter((t) => !toTags.has(t)).slice(0, 5),
      to: [...toTags].filter((t) => !fromTags.has(t)).slice(0, 5),
    };
  }

  /**
   * Generate a reorientation brief from current state.
   */
  generateBrief(trigger: string = "manual"): ReorientationBrief {
    const active = this.state.anchors.filter((a) => a.active);

    // Current objective: the most recent task_anchor or user_directive
    const objectiveAnchor =
      [...active].reverse().find(
        (a) => a.type === "task_anchor" || a.type === "user_directive"
      ) ?? null;

    // Active files: union of files in recent active anchors, last 10
    const activeFilesMap = new Map<string, number>(); // path -> recency rank
    for (let i = active.length - 1; i >= 0; i--) {
      for (const f of active[i].files) {
        if (!activeFilesMap.has(f)) {
          activeFilesMap.set(f, i);
        }
      }
    }
    const activeFiles = [...activeFilesMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([f]) => f);

    // Recent decisions: last 5 of type decision (high importance first)
    const recentDecisions = active
      .filter((a) => a.type === "decision")
      .slice(-5)
      .map((a) => ({ summary: a.summary, rationale: a.rationale }));

    // Open todos: anchors of type milestone with active=true
    const openTodos = active
      .filter((a) => a.type === "milestone")
      .slice(-7)
      .map((a) => a.summary);

    // Resolved errors: history (so we know not to loop)
    const resolvedErrors = this.state.anchors
      .filter((a) => a.type === "error_resolved")
      .slice(-5)
      .map((a) => a.summary);

    const drift = this.detectDrift();

    const lines: string[] = [];
    lines.push("## 🧭 Session Reorientation Brief");
    lines.push("");
    lines.push(
      `_Triggered by ${trigger} · ${this.state.stats.promptsSeen} prompts · ${this.state.stats.toolCallsSeen} tool calls so far_`
    );
    lines.push("");

    if (objectiveAnchor) {
      lines.push(`**Current objective**: ${objectiveAnchor.summary}`);
      if (objectiveAnchor.rationale) {
        lines.push(`*Why*: ${objectiveAnchor.rationale}`);
      }
      lines.push("");
    }

    if (activeFiles.length > 0) {
      lines.push("**Active files** (most recently touched):");
      for (const f of activeFiles) lines.push(`- ${f}`);
      lines.push("");
    }

    if (recentDecisions.length > 0) {
      lines.push("**Recent decisions**:");
      for (const d of recentDecisions) {
        const why = d.rationale ? ` — ${d.rationale}` : "";
        lines.push(`- ${d.summary}${why}`);
      }
      lines.push("");
    }

    if (openTodos.length > 0) {
      lines.push("**Open todos**:");
      for (const t of openTodos) lines.push(`- ${t}`);
      lines.push("");
    }

    if (resolvedErrors.length > 0) {
      lines.push("**Resolved errors** (don't re-attempt these failures):");
      for (const e of resolvedErrors) lines.push(`- ${e}`);
      lines.push("");
    }

    if (drift.drifted) {
      lines.push(`⚠️  **Topic drift detected**`);
      lines.push(`Was: ${drift.from.join(", ")}`);
      lines.push(`Now: ${drift.to.join(", ")}`);
      lines.push(`If unintentional, consider returning to original objective.`);
      lines.push("");
    }

    const markdown = lines.join("\n");
    const estimatedTokens = this.estimateTokens(markdown);

    // Update brief tracking
    const now = new Date().toISOString();
    this.state.stats.briefsGenerated += 1;
    this.state.stats.lastBriefAt = now;
    this.state.stats.promptsSinceLastBrief = 0;
    this.state.stats.toolCallsSinceLastBrief = 0;
    this.state.briefHistory.push({ at: now, tokens: estimatedTokens, trigger });
    if (this.state.briefHistory.length > 50) {
      this.state.briefHistory = this.state.briefHistory.slice(-50);
    }
    this.saveState();

    return {
      generatedAt: now,
      sessionAge: {
        promptsSeen: this.state.stats.promptsSeen,
        toolCallsSeen: this.state.stats.toolCallsSeen,
      },
      currentObjective: objectiveAnchor?.summary ?? null,
      activeFiles,
      recentDecisions,
      openTodos,
      resolvedErrors,
      driftDetected: drift.drifted,
      driftFromTags: drift.from,
      driftToTags: drift.to,
      markdown,
      estimatedTokens,
    };
  }

  /**
   * Check if a brief is needed without generating one.
   */
  shouldGenerateBrief(): { should: boolean; reason: string } {
    const cfg = this.state.config;
    const stats = this.state.stats;
    if (stats.promptsSinceLastBrief >= cfg.promptInterval) {
      return { should: true, reason: `prompt_interval: ${stats.promptsSinceLastBrief}/${cfg.promptInterval}` };
    }
    if (stats.toolCallsSinceLastBrief >= cfg.toolCallInterval) {
      return { should: true, reason: `tool_call_interval: ${stats.toolCallsSinceLastBrief}/${cfg.toolCallInterval}` };
    }
    const drift = this.detectDrift();
    if (drift.drifted) {
      return { should: true, reason: `drift_detected: ${drift.to.join(",")}` };
    }
    return { should: false, reason: "thresholds_not_met" };
  }

  /** Get session stats */
  getStats(): SessionStats & { totalAnchors: number; activeAnchors: number } {
    return {
      ...this.state.stats,
      totalAnchors: this.state.anchors.length,
      activeAnchors: this.state.anchors.filter((a) => a.active).length,
    };
  }

  /** Get raw anchors */
  getAnchors(): SessionAnchor[] {
    return [...this.state.anchors];
  }

  /** Update config (for testing or dynamic tuning) */
  updateConfig(partial: Partial<State["config"]>): State["config"] {
    this.state.config = { ...this.state.config, ...partial };
    this.saveState();
    return this.state.config;
  }

  /** Reset state (new session or test cleanup) */
  reset(): void {
    this.state = {
      sessionId: process.env.CLAUDE_SESSION_ID || "default",
      anchors: [],
      stats: {
        promptsSeen: 0,
        toolCallsSeen: 0,
        anchorsRecorded: 0,
        briefsGenerated: 0,
        lastBriefAt: null,
        promptsSinceLastBrief: 0,
        toolCallsSinceLastBrief: 0,
      },
      config: { ...DEFAULT_CONFIG },
      briefHistory: [],
    };
    this.saveState();
  }
}

export const sessionReorientationEngine = new SessionReorientationEngine();
