/**
 * ModelAwareSelfAwarenessEngine
 *
 * Detects the active Claude model and gates intensive self-awareness
 * features (reorientation injection, aggressive cadence, brief enrichment)
 * to ONLY fire when the user is on Opus 4.7 1M context.
 *
 * Why: Opus 4.7 1M is empirically known to degrade hard at 200k+ tokens
 * (per anthropic/claude-code GitHub issue #34685; "Lost in the Middle"
 * Liu et al. 2023; multiple user reports). Sonnet 4.6 and Opus 4.5 have
 * a 200k context — the degradation curve isn't relevant because the
 * window itself caps at the same point.
 *
 * Detection sources (in order of preference):
 *   1. CLAUDE_MODEL env var (set by Claude Code)
 *   2. ANTHROPIC_MODEL env var (set by SDK users)
 *   3. .claude/settings.json model field
 *   4. Fallback: assume non-1M (safe default — features OFF)
 *
 * Model classification:
 *   - opus-4-7 / opus-4.7 / claude-opus-4-7 / "1m" suffix → tier=opus_4_7_1m
 *   - opus-4-6 / claude-opus-4-6 → tier=opus_4_6 (200k)
 *   - sonnet-4-6 / claude-sonnet-4-6 → tier=sonnet_4_6 (200k)
 *   - opus-4-5 / claude-opus-4-5 → tier=opus_4_5 (200k)
 *   - haiku-4-5 → tier=haiku_4_5 (200k)
 *   - other → tier=unknown
 *
 * Token-position cadence (4.7 1M only):
 *   - Fresh (0–150k):   prompt-interval 20, brief size 400t
 *   - Warm (150k–250k): prompt-interval 15, brief size 600t
 *   - Degrading (250k–400k): prompt-interval 8, brief size 1000t, force-anchor objective
 *   - Critical (400k+):  prompt-interval 4, brief size 1500t, recommend /handoff
 *
 * For non-1M models: intensive features OFF; basic CompactionSurvival
 * still runs since /compact happens at native limits regardless.
 */

import { existsSync, readFileSync } from "node:fs";

export type ModelTier =
  | "opus_4_7_1m"     // ONLY tier where intensive reorientation fires
  | "opus_4_6"
  | "sonnet_4_6"
  | "opus_4_5"
  | "haiku_4_5"
  | "unknown";

export type ContextZone = "fresh" | "warm" | "degrading" | "critical";

export interface ModelInfo {
  raw: string;
  tier: ModelTier;
  contextWindow: number;          // tokens
  intensiveAwarenessEnabled: boolean;
  reasoning: string;
}

export interface CadenceProfile {
  zone: ContextZone;
  promptInterval: number;
  toolCallTokenInterval: number;  // cumulative tool output tokens between briefs
  briefMaxTokens: number;
  forceObjectiveReanchor: boolean;
  recommendHandoff: boolean;
}

const SETTINGS_PATHS = [
  "H:/prism/.claude/settings.json",
  "H:/.claude/settings.json",
  "C:/Users/Mark Villanueva/.claude/settings.json",
];

const TIER_PATTERNS: Array<{ tier: ModelTier; window: number; re: RegExp }> = [
  // 4.7 1M variants — match BEFORE plain 4-7 to capture explicit 1m
  { tier: "opus_4_7_1m", window: 1_000_000, re: /opus[-.]?4[-.]?7.*?1m/i },
  // Default Opus 4.7 also offers 1M context per current model card
  { tier: "opus_4_7_1m", window: 1_000_000, re: /(?:claude-)?opus[-.]?4[-.]?7\b/i },
  { tier: "opus_4_6",    window: 200_000,   re: /(?:claude-)?opus[-.]?4[-.]?6\b/i },
  { tier: "opus_4_5",    window: 200_000,   re: /(?:claude-)?opus[-.]?4[-.]?5\b/i },
  { tier: "sonnet_4_6",  window: 200_000,   re: /(?:claude-)?sonnet[-.]?4[-.]?6\b/i },
  { tier: "haiku_4_5",   window: 200_000,   re: /(?:claude-)?haiku[-.]?4[-.]?5\b/i },
];

function parseModelName(raw: string): { tier: ModelTier; window: number } {
  for (const { tier, window, re } of TIER_PATTERNS) {
    if (re.test(raw)) return { tier, window };
  }
  return { tier: "unknown", window: 0 };
}

function readSettingsModel(): string | null {
  for (const p of SETTINGS_PATHS) {
    try {
      if (!existsSync(p)) continue;
      const json = JSON.parse(readFileSync(p, "utf-8"));
      const m = json?.model || json?.Model || json?.defaultModel;
      if (typeof m === "string" && m.length > 0) return m;
    } catch {
      // ignore
    }
  }
  return null;
}

export class ModelAwareSelfAwarenessEngine {
  /**
   * Detect the active model. Pure function (no state).
   */
  static detect(override?: string): ModelInfo {
    const raw =
      override ||
      process.env.CLAUDE_MODEL ||
      process.env.ANTHROPIC_MODEL ||
      readSettingsModel() ||
      "";
    if (!raw) {
      return {
        raw: "",
        tier: "unknown",
        contextWindow: 0,
        intensiveAwarenessEnabled: false,
        reasoning: "No model identifier found in env or settings — defaulting OFF for safety.",
      };
    }
    const { tier, window } = parseModelName(raw);
    const intensive = tier === "opus_4_7_1m";
    return {
      raw,
      tier,
      contextWindow: window,
      intensiveAwarenessEnabled: intensive,
      reasoning: intensive
        ? `Opus 4.7 1M detected — intensive reorientation enabled (degrades at 200k+, critical at 400k+).`
        : `Tier=${tier}, ${window || "unknown"}-token window — intensive features OFF (compaction handles native limits).`,
    };
  }

  /**
   * Map a (consumed-tokens, contextWindow) → ContextZone.
   * Zone boundaries are calibrated to the Opus 4.7 1M degradation curve
   * (issue #34685: degradation starts at ~20% utilization, "noticeably worse"
   * at 60%, model self-recommends restart at ~48%).
   */
  static zoneForTokens(consumedTokens: number, contextWindow: number = 1_000_000): ContextZone {
    if (contextWindow <= 0) return "fresh";
    const pct = consumedTokens / contextWindow;
    if (pct < 0.15) return "fresh";       // <150k
    if (pct < 0.25) return "warm";        // 150k-250k
    if (pct < 0.40) return "degrading";   // 250k-400k
    return "critical";                     // 400k+
  }

  /**
   * Get the brief cadence profile for a given zone.
   * Calibrated from research: degradation is non-linear; cadence must
   * tighten exponentially as we approach 400k.
   */
  static cadenceFor(zone: ContextZone): CadenceProfile {
    switch (zone) {
      case "fresh":
        return {
          zone,
          promptInterval: 20,
          toolCallTokenInterval: 30_000,
          briefMaxTokens: 400,
          forceObjectiveReanchor: false,
          recommendHandoff: false,
        };
      case "warm":
        return {
          zone,
          promptInterval: 15,
          toolCallTokenInterval: 15_000,
          briefMaxTokens: 600,
          forceObjectiveReanchor: false,
          recommendHandoff: false,
        };
      case "degrading":
        return {
          zone,
          promptInterval: 8,
          toolCallTokenInterval: 8_000,
          briefMaxTokens: 1000,
          forceObjectiveReanchor: true,
          recommendHandoff: false,
        };
      case "critical":
        return {
          zone,
          promptInterval: 4,
          toolCallTokenInterval: 4_000,
          briefMaxTokens: 1500,
          forceObjectiveReanchor: true,
          recommendHandoff: true,
        };
    }
  }

  /**
   * One-call helper: detect model + read context-pressure file +
   * return the cadence profile that should be applied right now.
   * Returns null if intensive features should NOT fire (non-1M model).
   */
  static currentCadence(consumedTokens: number, override?: string): CadenceProfile | null {
    const info = this.detect(override);
    if (!info.intensiveAwarenessEnabled) return null;
    const zone = this.zoneForTokens(consumedTokens, info.contextWindow);
    return this.cadenceFor(zone);
  }

  /**
   * Read consumed token estimate from PRISM's existing context_pressure.json
   * (already maintained by the context-pressure tracking infrastructure).
   * Returns 0 if file missing or unreadable.
   */
  static readConsumedTokens(pressurePath: string = "H:/prism/state/context_pressure.json"): number {
    try {
      if (!existsSync(pressurePath)) return 0;
      const data = JSON.parse(readFileSync(pressurePath, "utf-8"));
      // Common shapes: {totalTokens, tokens, consumed, currentTokens, used}
      return Number(
        data.totalTokens ??
        data.tokens ??
        data.consumed ??
        data.currentTokens ??
        data.used ??
        0
      ) || 0;
    } catch {
      return 0;
    }
  }
}

export const modelAwareSelfAwarenessEngine = ModelAwareSelfAwarenessEngine;
