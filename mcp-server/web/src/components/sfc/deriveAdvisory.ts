/**
 * deriveAdvisory -- pure, framework-free summarizer of the SpeedFeed orchestrator's
 * uncertainty / safety / advisory signal for the SFC web UI (U-SFC-UI-UNCERTAINTY, slot:oscar).
 *
 * WHY (oscar soul: "never publish a speed/feed without uncertainty"): the orchestrator
 * (prism_calc:sf_orchestrate) always produces overall_confidence, uncertainty.*, safety_checks[],
 * limiting_factors[], playbook_warnings[] and recommendations[], plus a conditional
 * uncertainty.condition_warning (thin-wall / high-temp edge condition). Before this helper the
 * SFC pages dropped condition_warning entirely and never rendered recommendations[] -- a
 * speed/feed could be shown with NO surfaced uncertainty. This collapses the raw result into one
 * always-non-empty advisory the banner renders above the numbers.
 *
 * Pure (no React, no DOM, no I/O) so it is unit-testable under the existing web vitest config, and
 * defensively guards every field (real responses may be partial or from an older backend).
 */
import type { OrchestratorResult } from "../../types/speedfeed";

export type AdvisoryLevel = "ok" | "caution" | "warning" | "critical";
export type ConfidenceBand = "high" | "medium" | "low" | "unknown";

export interface SfcAdvisory {
  level: AdvisoryLevel;
  confidencePct: number; // 0-100, rounded; 0 when unknown (see confidenceKnown)
  confidenceKnown: boolean; // false when overall_confidence is missing / non-finite
  confidenceBand: ConfidenceBand; // high/medium/low/unknown -- tied to the SAME caution/warning
  // thresholds so a confidence chip can never drift out of sync with the level logic.
  headline: string; // always non-empty -- the single line the banner must show
  conditionWarning?: string; // edge-condition signal (thin-wall / high-temp) when present
  failedSafetyChecks: string[];
  criticalFactors: string[];
  warningFactors: string[];
  playbookWarnings: string[];
  recommendations: string[];
  dominantUncertaintySource?: string;
  suggestedMeasurement?: string;
}

export interface DeriveAdvisoryOptions {
  maxPlaybook?: number; // default 4
  maxRecommendations?: number; // default 4
  cautionConfidence?: number; // below this -> at least caution (default 0.6)
  warningConfidence?: number; // below this -> at least warning (default 0.3)
}

// A partial view so the helper accepts real (possibly-incomplete) responses without throwing.
// Dynamic / extra-field access goes through explicit casts below, so no index signature is needed
// here -- keeping it a plain Partial lets a full OrchestratorResult assign cleanly.
type PartialResult = Partial<OrchestratorResult>;

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function cleanStr(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

export function deriveAdvisory(
  result: PartialResult | null | undefined,
  opts: DeriveAdvisoryOptions = {},
): SfcAdvisory {
  const r: PartialResult = result ?? {};
  const maxPlaybook = opts.maxPlaybook ?? 4;
  const maxRecommendations = opts.maxRecommendations ?? 4;
  const cautionConfidence = opts.cautionConfidence ?? 0.6;
  const warningConfidence = opts.warningConfidence ?? 0.3;

  const rawConf = (r as { overall_confidence?: unknown }).overall_confidence;
  const confidenceKnown = typeof rawConf === "number" && Number.isFinite(rawConf);
  const conf = confidenceKnown ? Math.min(1, Math.max(0, rawConf as number)) : 0;
  const confidencePct = confidenceKnown ? Math.round(conf * 100) : 0;
  const confidenceBand: ConfidenceBand = !confidenceKnown
    ? "unknown"
    : conf >= cautionConfidence
      ? "high"
      : conf >= warningConfidence
        ? "medium"
        : "low";

  const uncertainty = (r.uncertainty ?? {}) as Record<string, unknown>;
  const conditionWarning = cleanStr(uncertainty.condition_warning);
  const dominantUncertaintySource = cleanStr(uncertainty.dominant_uncertainty_source);
  const suggestedMeasurement = cleanStr(uncertainty.suggested_measurement);

  const safety = asArray<{ passed?: boolean; message?: string; name?: string }>(r.safety_checks);
  const failedSafetyChecks = safety
    .filter((c) => c && c.passed === false)
    .map((c) => cleanStr(c.message) ?? cleanStr(c.name) ?? "safety check failed");

  const limiting = asArray<{
    parameter?: string;
    constraint?: string;
    utilization_pct?: number;
    severity?: string;
  }>(r.limiting_factors);
  const fmtFactor = (f: { parameter?: string; constraint?: string; utilization_pct?: number }) => {
    const param = cleanStr(f.parameter) ?? "factor";
    const constraint = cleanStr(f.constraint);
    const util =
      typeof f.utilization_pct === "number" && Number.isFinite(f.utilization_pct)
        ? ` (${Math.round(f.utilization_pct)}%)`
        : "";
    return constraint ? `${param}: ${constraint}${util}` : `${param}${util}`;
  };
  const criticalFactors = limiting.filter((f) => f && f.severity === "critical").map(fmtFactor);
  const warningFactors = limiting.filter((f) => f && f.severity === "warning").map(fmtFactor);

  const playbookWarnings = asArray<unknown>(r.playbook_warnings)
    .map((s) => cleanStr(s))
    .filter((s): s is string => !!s)
    .slice(0, maxPlaybook);
  const recommendations = asArray<unknown>(r.recommendations)
    .map((s) => cleanStr(s))
    .filter((s): s is string => !!s)
    .slice(0, maxRecommendations);

  // Level -- descending precedence. A hard safety/limit failure dominates a high confidence.
  let level: AdvisoryLevel;
  if (failedSafetyChecks.length > 0 || criticalFactors.length > 0) {
    level = "critical";
  } else if (conditionWarning || warningFactors.length > 0 || (confidenceKnown && conf < warningConfidence)) {
    level = "warning";
  } else if (!confidenceKnown || conf < cautionConfidence || playbookWarnings.length > 0) {
    // Unknown confidence is never "ok" -- we must not present a speed/feed as clean when we
    // cannot score it.
    level = "caution";
  } else {
    level = "ok";
  }

  const confLabel = confidenceKnown ? `confidence ${confidencePct}%` : "confidence unavailable";
  let headline: string;
  switch (level) {
    case "critical":
      headline =
        failedSafetyChecks.length > 0
          ? `${failedSafetyChecks.length} safety check${failedSafetyChecks.length === 1 ? "" : "s"} failed - review before running`
          : `Critical limit reached: ${criticalFactors[0]}`;
      break;
    case "warning":
      headline = conditionWarning
        ? `Edge condition - ${conditionWarning}`
        : warningFactors.length > 0
          ? `Approaching a limit: ${warningFactors[0]}`
          : `Low ${confLabel} - verify parameters before running`;
      break;
    case "caution":
      headline = !confidenceKnown
        ? "Confidence unavailable - treat parameters as unverified"
        : playbookWarnings.length > 0
          ? `${confLabel} - ${playbookWarnings.length} advisor${playbookWarnings.length === 1 ? "y" : "ies"} to review`
          : `Moderate ${confLabel} - review before running`;
      break;
    default:
      headline = `${confLabel.charAt(0).toUpperCase()}${confLabel.slice(1)} - no warnings flagged`;
      break;
  }

  return {
    level,
    confidencePct,
    confidenceKnown,
    confidenceBand,
    headline,
    conditionWarning,
    failedSafetyChecks,
    criticalFactors,
    warningFactors,
    playbookWarnings,
    recommendations,
    dominantUncertaintySource,
    suggestedMeasurement,
  };
}
