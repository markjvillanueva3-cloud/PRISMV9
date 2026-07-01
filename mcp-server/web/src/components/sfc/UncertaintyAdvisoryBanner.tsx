/**
 * UncertaintyAdvisoryBanner -- surfaces the SFC orchestrator's uncertainty / safety / advisory
 * signal ABOVE the numeric results so a speed/feed is never presented without its confidence and
 * any edge-condition / safety / playbook warning (oscar soul; U-SFC-UI-UNCERTAINTY).
 *
 * Pure presentation over deriveAdvisory(); reuses the shared Badge. Renders nothing when there is
 * no result yet (the page guards `r &&` already, but this is defensive).
 */
import type { OrchestratorResult } from "../../types/speedfeed";
import { Badge } from "../ui";
import { deriveAdvisory, type AdvisoryLevel, type ConfidenceBand } from "./deriveAdvisory";

const LEVEL_BADGE: Record<AdvisoryLevel, { color: "green" | "yellow" | "red"; label: string }> = {
  ok: { color: "green", label: "OK" },
  caution: { color: "yellow", label: "Caution" },
  warning: { color: "yellow", label: "Warning" },
  critical: { color: "red", label: "Critical" },
};

// Confidence-chip color is driven by the helper's confidenceBand (which is tied to the same
// caution/warning thresholds) so it can never drift from the level logic.
const CONFIDENCE_COLOR: Record<ConfidenceBand, "green" | "yellow" | "red" | "slate"> = {
  high: "green",
  medium: "yellow",
  low: "red",
  unknown: "slate",
};

const PANEL_CLASS: Record<AdvisoryLevel, string> = {
  ok: "border-green-200 bg-green-50 dark:border-emerald-800 dark:bg-emerald-950/40",
  caution: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40",
  warning: "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40",
  critical: "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/50",
};

export interface UncertaintyAdvisoryBannerProps {
  result: OrchestratorResult | null | undefined;
  className?: string;
}

export default function UncertaintyAdvisoryBanner({ result, className }: UncertaintyAdvisoryBannerProps) {
  if (!result) return null;
  const a = deriveAdvisory(result);
  const badge = LEVEL_BADGE[a.level];
  const confColor = CONFIDENCE_COLOR[a.confidenceBand];

  return (
    <div
      role="status"
      aria-label={`Speed/feed advisory: ${badge.label}. ${a.headline}`}
      className={`rounded-lg border p-3 text-sm ${PANEL_CLASS[a.level]} ${className ?? ""}`}
      data-testid="sfc-uncertainty-advisory"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge color={badge.color}>{badge.label}</Badge>
        <Badge color={confColor}>
          {a.confidenceKnown ? `Confidence ${a.confidencePct}%` : "Confidence n/a"}
        </Badge>
        <span className="font-medium text-slate-800 dark:text-slate-100">{a.headline}</span>
      </div>

      {a.failedSafetyChecks.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-red-700 dark:text-red-300" data-testid="sfc-advisory-safety">
          {a.failedSafetyChecks.map((m, i) => (
            <li key={`safety-${i}`}>{m}</li>
          ))}
        </ul>
      )}

      {a.criticalFactors.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-red-700 dark:text-red-300">
          {a.criticalFactors.map((m, i) => (
            <li key={`crit-${i}`}>{m}</li>
          ))}
        </ul>
      )}

      {a.warningFactors.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-amber-800 dark:text-amber-300">
          {a.warningFactors.map((m, i) => (
            <li key={`warn-${i}`}>{m}</li>
          ))}
        </ul>
      )}

      {a.playbookWarnings.length > 0 && (
        <div className="mt-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Playbook advisories</div>
          <ul className="list-disc pl-5 text-amber-800 dark:text-amber-300">
            {a.playbookWarnings.map((m, i) => (
              <li key={`pb-${i}`}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {a.recommendations.length > 0 && (
        <div className="mt-2" data-testid="sfc-advisory-recommendations">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recommendations</div>
          <ul className="list-disc pl-5 text-slate-700 dark:text-slate-300">
            {a.recommendations.map((m, i) => (
              <li key={`rec-${i}`}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {(a.dominantUncertaintySource || a.suggestedMeasurement) && (
        <div className="mt-2 text-xs text-slate-500">
          {a.dominantUncertaintySource && <span>Dominant uncertainty: {a.dominantUncertaintySource}. </span>}
          {a.suggestedMeasurement && <span>To tighten: {a.suggestedMeasurement}.</span>}
        </div>
      )}
    </div>
  );
}
