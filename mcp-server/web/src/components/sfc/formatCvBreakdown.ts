/**
 * formatCvBreakdown -- pure formatter for the SFC orchestrator's per-metric coefficient-of-variation
 * fields (uncertainty.{speed,feed,life,force,ra}_cv_pct). These were typed by U-SFC-UI-UNCERTAINTY but
 * rendered nowhere; this surfaces them as a compact "Vc +/-3.1%, Feed +/-2.0%, ..." line in the
 * Uncertainty tab. Returns null when none are present so the UI renders nothing (additive).
 */
import type { OrchestratorResult } from "../../types/speedfeed";

export function formatCvBreakdown(
  uncertainty: OrchestratorResult["uncertainty"] | undefined | null,
): string | null {
  if (!uncertainty) return null;
  const cvs: Array<[string, number | undefined]> = [
    ["Vc", uncertainty.speed_cv_pct],
    ["Feed", uncertainty.feed_cv_pct],
    ["Life", uncertainty.life_cv_pct],
    ["Force", uncertainty.force_cv_pct],
    ["Ra", uncertainty.ra_cv_pct],
  ];
  const present = cvs.filter(
    (e): e is [string, number] => typeof e[1] === "number" && Number.isFinite(e[1]),
  );
  if (present.length === 0) return null;
  return present.map(([label, v]) => `${label} +/-${v.toFixed(1)}%`).join(", ");
}
