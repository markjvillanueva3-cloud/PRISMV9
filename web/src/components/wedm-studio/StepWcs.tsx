/**
 * StepWcs.tsx — Wire EDM Studio Step 3: WCS & Start Holes
 * WEDM-MS0 U-WEDM10
 *
 * Owns:
 *   - WCS origin X/Y inputs + quick-set buttons (Part Center, Stock Corner, First Hole)
 *   - Start hole table: position, diameter, threading method, add/remove
 *   - Threading method cycle time estimate inline
 *   - Canvas sync: WCS crosshair + start hole markers via context
 *
 * WCAG 2.1 AA:
 *   - All inputs labeled, min 44px touch targets
 *   - aria-live for async results
 *   - Keyboard-accessible table controls
 */

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { Card, Button, Spinner, Badge } from "../ui";
import { useWedmNavigation, useWedmData } from "../../contexts/WedmStudioContext";
import { useWedmStep } from "../../hooks/useWedmPipeline";
import { wedmApi } from "../../api/wedmStudio";
import type {
  WCSResult,
  WCSOrigin,
  StartHole,
  StartHolesParams,
} from "../../types/wedmStudio";
import StepErrorCard from "./StepErrorCard";
import { InfoTip } from "./InfoTip";

// ============================================================================
// CONSTANTS
// ============================================================================

type ThreadingMethod = "auto" | "mechanical" | "manual";

const THREADING_INFO: Record<ThreadingMethod, { label: string; description: string; estTimeSec: number }> = {
  auto: {
    label: "Auto-thread",
    description: "Machine auto-threads wire through the start hole. Fastest, requires start hole > wire diameter + 0.5mm.",
    estTimeSec: 15,
  },
  mechanical: {
    label: "Mechanical threading",
    description: "Uses a mechanical threading guide. Works with smaller holes. Takes 30-60 seconds.",
    estTimeSec: 45,
  },
  manual: {
    label: "Manual threading",
    description: "Operator manually threads the wire. Required for very small or deep holes.",
    estTimeSec: 120,
  },
};

const WCS_LABELS = ["G54", "G55", "G56", "G57", "G58", "G59"] as const;

// Wire guide types and life (WEDM-MS1 U-WEDM24)
type GuideType = "diamond" | "sapphire" | "carbide";
const GUIDE_TYPE_INFO: Record<GuideType, { label: string; lifeHrs: number; accuracyUm: number }> = {
  diamond: { label: "Diamond", lifeHrs: 2000, accuracyUm: 1.0 },
  sapphire: { label: "Sapphire", lifeHrs: 500, accuracyUm: 2.0 },
  carbide: { label: "Carbide", lifeHrs: 200, accuracyUm: 3.0 },
};

interface WireGuideState {
  upperType: GuideType;
  upperHours: number;
  lowerType: GuideType;
  lowerHours: number;
}

const GUIDE_WEAR_WARNING_PCT = 80; // Warn at 80% life used
const GUIDE_CORNER_ACCURACY_THRESHOLD_PCT = 70; // Corner accuracy degrades past this

// ============================================================================
// HELPERS
// ============================================================================

function generateHoleId(): string {
  return `sh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// ============================================================================
// PROPS
// ============================================================================

export interface StepWcsProps {
  onComplete: () => void;
  onBack?: () => void;
  isActive: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function StepWcs({ onComplete, onBack, isActive }: StepWcsProps) {
  const { markStepComplete, markStepError, markStale } = useWedmNavigation();
  const { steps, setStepData } = useWedmData();
  const importResult = steps.import;
  const selection = steps.selection;

  // WCS origin state
  const [originX, setOriginX] = useState(0);
  const [originY, setOriginY] = useState(0);
  const [wcsLabel, setWcsLabel] = useState<string>("G54");

  // Start holes state
  const [startHoles, setStartHoles] = useState<(StartHole & { threading: ThreadingMethod })[]>([]);

  // Wire guide state (WEDM-MS1 U-WEDM24)
  const [guides, setGuides] = useState<WireGuideState>({
    upperType: "diamond",
    upperHours: 0,
    lowerType: "diamond",
    lowerHours: 0,
  });

  // API hook
  const wcsHook = useWedmStep<StartHolesParams, WCSResult>(
    "wcs",
    (params, signal) => wedmApi.startHoles(params, signal),
  );

  // Initialize start holes from features (one hole per internal feature)
  useEffect(() => {
    if (importResult?.features && startHoles.length === 0) {
      const internalFeatures = importResult.features.filter(
        f => f.type === "hole" || f.type === "cavity" || f.type === "pocket" || f.type === "slot",
      );
      if (internalFeatures.length > 0) {
        setStartHoles(internalFeatures.map(f => ({
          id: generateHoleId(),
          x_mm: 0,
          y_mm: 0,
          diameter_mm: 1.0,
          feature_name: f.name,
          threading: "auto" as ThreadingMethod,
        })));
      }
      // If no internal features, add one default hole for external profile
      if (internalFeatures.length === 0 && importResult.features.length > 0) {
        setStartHoles([{
          id: generateHoleId(),
          x_mm: 0,
          y_mm: 0,
          diameter_mm: 1.0,
          feature_name: importResult.features[0].name,
          threading: "auto",
        }]);
      }
    }
  }, [importResult, startHoles.length]);

  // ── Quick-Set Buttons ──────────────────────────────────────────────────
  const quickSetOrigin = useCallback((preset: "center" | "corner" | "first_hole") => {
    if (!importResult?.contours?.length) return;
    const allContours = importResult.contours;

    if (preset === "center") {
      // Center of bounding box of all contours
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const c of allContours) {
        minX = Math.min(minX, c.bbox.min_x);
        minY = Math.min(minY, c.bbox.min_y);
        maxX = Math.max(maxX, c.bbox.max_x);
        maxY = Math.max(maxY, c.bbox.max_y);
      }
      setOriginX(+((minX + maxX) / 2).toFixed(3));
      setOriginY(+((minY + maxY) / 2).toFixed(3));
    } else if (preset === "corner") {
      // Bottom-left corner of bounding box
      let minX = Infinity, minY = Infinity;
      for (const c of allContours) {
        minX = Math.min(minX, c.bbox.min_x);
        minY = Math.min(minY, c.bbox.min_y);
      }
      setOriginX(+(minX).toFixed(3));
      setOriginY(+(minY).toFixed(3));
    } else if (preset === "first_hole" && startHoles.length > 0) {
      setOriginX(startHoles[0].x_mm);
      setOriginY(startHoles[0].y_mm);
    }
    markStale("wcs");
  }, [importResult, startHoles, markStale]);

  // ── Hole Management ────────────────────────────────────────────────────
  const addHole = useCallback(() => {
    setStartHoles(prev => [
      ...prev,
      {
        id: generateHoleId(),
        x_mm: originX,
        y_mm: originY,
        diameter_mm: 1.0,
        feature_name: "",
        threading: "auto" as ThreadingMethod,
      },
    ]);
    markStale("wcs");
  }, [originX, originY, markStale]);

  const removeHole = useCallback((id: string) => {
    setStartHoles(prev => prev.filter(h => h.id !== id));
    markStale("wcs");
  }, [markStale]);

  const updateHole = useCallback((id: string, field: string, value: any) => {
    setStartHoles(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h));
    markStale("wcs");
  }, [markStale]);

  // ── Total Threading Time ───────────────────────────────────────────────
  const totalThreadingTime = useMemo(() => {
    return startHoles.reduce((sum, h) => sum + THREADING_INFO[h.threading].estTimeSec, 0);
  }, [startHoles]);

  // ── Confirm & Save ────────────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    const origin: WCSOrigin = { x: originX, y: originY, label: wcsLabel };
    const holes: StartHole[] = startHoles.map(h => ({
      id: h.id,
      x_mm: h.x_mm,
      y_mm: h.y_mm,
      diameter_mm: h.diameter_mm,
      feature_name: h.feature_name,
    }));

    // Call backend for validation and setup notes
    const result = await wcsHook.execute({
      origin,
      start_holes: holes,
      material: selection?.material,
      wire_diameter_mm: selection?.wire_diameter_mm,
    });

    if (result.ok) {
      setStepData("wcs", result.data);
      markStepComplete("wcs");
      onComplete();
    } else {
      markStepError("wcs");
    }
  }, [originX, originY, wcsLabel, startHoles, selection, wcsHook, setStepData, markStepComplete, markStepError, onComplete]);

  // Feature names for dropdown
  const featureNames = useMemo(() => {
    return importResult?.features?.map(f => f.name) ?? [];
  }, [importResult]);

  if (!isActive) return null;

  return (
    <div className="space-y-4">
      {/* ── WCS Origin ──────────────────────────────────────────────────── */}
      <Card>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
          Work Coordinate System
          <InfoTip text="The zero-point reference for the Wire EDM program. All coordinates in the G-code are relative to this point." />
        </h4>

        <div className="space-y-3">
          {/* Quick-set buttons */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => quickSetOrigin("center")}>
              Part Center
            </Button>
            <Button size="sm" variant="secondary" onClick={() => quickSetOrigin("corner")}>
              Stock Corner
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => quickSetOrigin("first_hole")}
              disabled={startHoles.length === 0}
            >
              First Hole
            </Button>
          </div>

          {/* Coordinate inputs */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">X (mm)</label>
              <input
                type="number"
                step="0.001"
                value={originX}
                onChange={e => { setOriginX(+e.target.value); markStale("wcs"); }}
                className="w-full px-2 py-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600"
                aria-label="WCS origin X coordinate"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Y (mm)</label>
              <input
                type="number"
                step="0.001"
                value={originY}
                onChange={e => { setOriginY(+e.target.value); markStale("wcs"); }}
                className="w-full px-2 py-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600"
                aria-label="WCS origin Y coordinate"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                WCS
                <InfoTip text="G-code work coordinate register. G54 is the primary. Use G55-G59 for multi-setup jobs." />
              </label>
              <select
                value={wcsLabel}
                onChange={e => setWcsLabel(e.target.value)}
                className="w-full px-2 py-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600"
              >
                {WCS_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Tip: Click on the canvas to set the origin visually (when canvas is interactive).
          </p>
        </div>
      </Card>

      {/* ── Start Holes ─────────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Start Holes
            <InfoTip text="Pre-drilled holes where the wire is threaded before cutting begins. Each internal feature needs at least one start hole." />
          </h4>
          <Button size="sm" variant="secondary" onClick={addHole}>
            + Add Hole
          </Button>
        </div>

        {startHoles.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            No start holes configured. Click "Add Hole" to add one.
          </p>
        ) : (
          <div className="space-y-2">
            {startHoles.map((hole) => (
              <div
                key={hole.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2"
              >
                {/* Row 1: Feature + Position */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-0.5">Feature</label>
                    <select
                      value={hole.feature_name}
                      onChange={e => updateHole(hole.id, "feature_name", e.target.value)}
                      className="w-full px-1.5 py-1 text-xs border rounded dark:bg-slate-800 dark:border-slate-600"
                      aria-label={`Feature for hole ${hole.id}`}
                    >
                      <option value="">Unassigned</option>
                      {featureNames.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-0.5">X (mm)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={hole.x_mm}
                      onChange={e => updateHole(hole.id, "x_mm", +e.target.value)}
                      className="w-full px-1.5 py-1 text-xs border rounded dark:bg-slate-800 dark:border-slate-600"
                      aria-label={`X position for hole ${hole.feature_name || hole.id}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-0.5">Y (mm)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={hole.y_mm}
                      onChange={e => updateHole(hole.id, "y_mm", +e.target.value)}
                      className="w-full px-1.5 py-1 text-xs border rounded dark:bg-slate-800 dark:border-slate-600"
                      aria-label={`Y position for hole ${hole.feature_name || hole.id}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                      Diameter (mm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={hole.diameter_mm}
                      onChange={e => updateHole(hole.id, "diameter_mm", +e.target.value)}
                      className="w-full px-1.5 py-1 text-xs border rounded dark:bg-slate-800 dark:border-slate-600"
                      aria-label={`Diameter for hole ${hole.feature_name || hole.id}`}
                    />
                  </div>
                </div>

                {/* Row 2: Threading Method + Delete */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                      Threading Method
                      <InfoTip text="How the wire is threaded through this start hole. Auto is fastest but needs a larger hole." />
                    </label>
                    <div className="flex gap-1">
                      {(Object.entries(THREADING_INFO) as [ThreadingMethod, typeof THREADING_INFO[ThreadingMethod]][]).map(
                        ([method, info]) => (
                          <button
                            key={method}
                            onClick={() => updateHole(hole.id, "threading", method)}
                            className={`flex-1 text-center px-2 py-1.5 text-xs rounded transition-colors min-h-[44px] ${
                              hole.threading === method
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                            }`}
                            aria-pressed={hole.threading === method}
                            title={info.description}
                          >
                            {info.label}
                            <span className="block text-[9px] opacity-70">~{info.estTimeSec}s</span>
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeHole(hole.id)}
                    className="text-red-400 hover:text-red-600 min-w-[44px] min-h-[44px] flex items-center justify-center mt-4"
                    aria-label={`Remove start hole for ${hole.feature_name || "unnamed"}`}
                    title="Remove hole"
                  >
                    {"\u2715"}
                  </button>
                </div>

                {/* Wire diameter warning */}
                {selection && hole.diameter_mm < selection.wire_diameter_mm + 0.5 && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    Hole diameter ({hole.diameter_mm}mm) may be too small for auto-threading with {selection.wire_diameter_mm}mm wire.
                    Minimum recommended: {(selection.wire_diameter_mm + 0.5).toFixed(2)}mm.
                  </p>
                )}
              </div>
            ))}

            {/* Threading time summary */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-700">
              <span>{startHoles.length} start hole{startHoles.length !== 1 ? "s" : ""}</span>
              <span>
                Est. threading time: <strong className="text-slate-700 dark:text-slate-200">
                  {totalThreadingTime >= 60
                    ? `${Math.floor(totalThreadingTime / 60)}m ${totalThreadingTime % 60}s`
                    : `${totalThreadingTime}s`}
                </strong>
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* ── Wire Guide Status (WEDM-MS1 U-WEDM24) ──────────────────────── */}
      <Card>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
          Wire Guides
          <InfoTip text="Upper and lower wire guide condition. Guide wear affects corner accuracy and auto-threading reliability. Replace guides when life remaining drops below 20%." />
        </h4>

        <div className="grid grid-cols-2 gap-4">
          {(["upper", "lower"] as const).map(position => {
            const guideType = position === "upper" ? guides.upperType : guides.lowerType;
            const hours = position === "upper" ? guides.upperHours : guides.lowerHours;
            const info = GUIDE_TYPE_INFO[guideType];
            const lifePct = Math.max(0, Math.min(100, 100 - (hours / info.lifeHrs) * 100));
            const isWorn = lifePct < (100 - GUIDE_WEAR_WARNING_PCT);
            const affectsCorners = lifePct < (100 - GUIDE_CORNER_ACCURACY_THRESHOLD_PCT);

            return (
              <div key={position} className="space-y-2">
                <span className="text-[10px] font-medium text-slate-400 uppercase">{position} Guide</span>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Type</label>
                  <select
                    value={guideType}
                    onChange={e => setGuides(prev => ({
                      ...prev,
                      [`${position}Type`]: e.target.value as GuideType,
                    }))}
                    className="w-full px-1.5 py-1 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 min-h-[44px]"
                    aria-label={`${position} guide type`}
                  >
                    {Object.entries(GUIDE_TYPE_INFO).map(([k, v]) => (
                      <option key={k} value={k}>{v.label} ({v.lifeHrs}h life)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Hours since replacement</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max={info.lifeHrs}
                    value={hours}
                    onChange={e => setGuides(prev => ({
                      ...prev,
                      [`${position}Hours`]: +e.target.value,
                    }))}
                    className="w-full px-1.5 py-1 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 min-h-[44px]"
                    aria-label={`${position} guide hours since replacement`}
                  />
                </div>
                {/* Life bar */}
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden" role="progressbar" aria-valuenow={lifePct} aria-valuemin={0} aria-valuemax={100} aria-label={`${position} guide life remaining`}>
                  <div
                    className={`h-full rounded-full transition-all ${
                      lifePct > 50 ? "bg-green-500" : lifePct > 20 ? "bg-yellow-500" : "bg-red-500"
                    }`}
                    style={{ width: `${lifePct}%` }}
                  />
                </div>
                <span className={`text-[10px] ${isWorn ? "text-red-500 font-medium" : "text-slate-400"}`}>
                  {lifePct.toFixed(0)}% life remaining
                  {isWorn && " — replacement recommended"}
                </span>
                {affectsCorners && (
                  <p className="text-[10px] text-yellow-600 dark:text-yellow-400" role="alert">
                    Corner accuracy degraded — worn guide adds ~{(info.accuracyUm * (1 + (100 - lifePct) / 100)).toFixed(1)}&micro;m error
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Auto-Threading Assessment (WEDM-MS1 U-WEDM24) ─────────────── */}
      {startHoles.length > 0 && (
        <Card>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
            Auto-Threading Assessment
            <InfoTip text="Evaluates each start hole for automatic wire threading capability. Considers hole diameter, guide condition, and wire type." />
          </h4>

          <div className="space-y-1.5" aria-live="polite">
            {startHoles.map(hole => {
              const wireDia = selection?.wire_diameter_mm ?? 0.25;
              const minAutoHoleDia = wireDia + 0.5;
              const minMechanicalHoleDia = wireDia + 0.05;
              const upperLifePct = Math.max(0, 100 - (guides.upperHours / GUIDE_TYPE_INFO[guides.upperType].lifeHrs) * 100);
              const lowerLifePct = Math.max(0, 100 - (guides.lowerHours / GUIDE_TYPE_INFO[guides.lowerType].lifeHrs) * 100);
              const guidesOk = upperLifePct > 20 && lowerLifePct > 20;

              // Determine recommended threading method
              let recommended: ThreadingMethod;
              let reason: string;
              let canAuto: boolean;

              if (hole.diameter_mm >= minAutoHoleDia && guidesOk) {
                recommended = "auto";
                reason = `Hole ${hole.diameter_mm}mm >= ${minAutoHoleDia.toFixed(2)}mm min, guides OK`;
                canAuto = true;
              } else if (hole.diameter_mm >= minAutoHoleDia && !guidesOk) {
                recommended = "mechanical";
                reason = "Hole large enough but guide wear reduces auto-thread reliability";
                canAuto = false;
              } else if (hole.diameter_mm >= minMechanicalHoleDia) {
                recommended = "mechanical";
                reason = `Hole ${hole.diameter_mm}mm too small for auto (need ${minAutoHoleDia.toFixed(2)}mm)`;
                canAuto = false;
              } else {
                recommended = "manual";
                reason = `Hole ${hole.diameter_mm}mm too small for mechanical threading`;
                canAuto = false;
              }

              const isMatch = hole.threading === recommended;

              return (
                <div key={hole.id} className="flex items-center gap-2 p-2 rounded border border-slate-100 dark:border-slate-700 text-xs">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] flex-shrink-0 ${
                    canAuto ? "bg-green-500" : recommended === "mechanical" ? "bg-yellow-500" : "bg-red-500"
                  }`}>
                    {canAuto ? "\u2713" : recommended === "mechanical" ? "!" : "\u2715"}
                  </span>
                  <span className="font-medium text-slate-700 dark:text-slate-200 w-24 truncate" title={hole.feature_name}>
                    {hole.feature_name || "Unnamed"}
                  </span>
                  <span className="flex-1 text-slate-500">{reason}</span>
                  {!isMatch && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => updateHole(hole.id, "threading", recommended)}
                    >
                      Use {THREADING_INFO[recommended].label}
                    </Button>
                  )}
                  {isMatch && (
                    <Badge variant="secondary" size="sm">
                      {THREADING_INFO[recommended].label}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── API Error ───────────────────────────────────────────────────── */}
      {wcsHook.error && (
        <StepErrorCard error={wcsHook.error} onRetry={wcsHook.retry} />
      )}

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <div className="flex justify-between pt-2">
        {onBack && (
          <Button variant="secondary" onClick={onBack}>
            Back to Review
          </Button>
        )}
        <div className="flex gap-2 ml-auto">
          <Button
            onClick={handleConfirm}
            disabled={startHoles.length === 0 || wcsHook.loading}
          >
            {wcsHook.loading ? (
              <span className="flex items-center gap-2"><Spinner size="sm" /> Validating...</span>
            ) : "Continue to Toolpath"}
          </Button>
        </div>
      </div>
    </div>
  );
}
