/**
 * StepToolpath.tsx — Wire EDM Studio Step 4: Toolpath Strategy
 * WEDM-MS0 U-WEDM11
 *
 * Owns:
 *   - Profile classification display (closed external/internal, open, island)
 *   - Cutting direction (CW/CCW) with auto-reasoning
 *   - Approach/departure type per profile
 *   - Corner strategy: sharp pause, radius follow, tangent blend
 *   - Tab/slug management with per-profile tab add
 *   - Cutting sequence ordering with keyboard-accessible reorder
 *   - Canvas sync: toolpath arrows + tab markers via context
 *
 * WCAG 2.1 AA:
 *   - All inputs labeled, min 44px touch targets
 *   - aria-live for async results
 *   - Keyboard-accessible reorder (Move Up/Down buttons)
 *   - Profile type color-coded with text labels (not color-only)
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
  ToolpathResult,
  ToolpathParams,
  ToolpathProfile,
  TabPosition,
  CuttingSequenceEntry,
  ProfileType,
} from "../../types/wedmStudio";
import { calculateTaperUVOffset, predictTaperError } from "../../utils/wedmGeometry";
import StepErrorCard from "./StepErrorCard";
import { InfoTip } from "./InfoTip";

// ============================================================================
// CONSTANTS
// ============================================================================

type CornerStrategy = "sharp_pause" | "radius_follow" | "tangent_blend";
type ApproachType = "lead_in" | "direct";
type SlugMethod = "free_drop" | "controlled_drop" | "glue_tab" | "magnet" | "vacuum";
type CuttingDirection = "cw" | "ccw";

const PROFILE_TYPE_INFO: Record<ProfileType, { label: string; color: string; description: string }> = {
  closed_external: { label: "External", color: "bg-blue-500", description: "Outer contour — cut on the outside" },
  closed_internal: { label: "Internal", color: "bg-green-500", description: "Internal pocket — cut on the inside, requires start hole" },
  open: { label: "Open", color: "bg-yellow-500", description: "Open profile — no enclosed area" },
  island: { label: "Island", color: "bg-purple-500", description: "Island feature — trapped inside another contour" },
};

const CORNER_STRATEGIES: Record<CornerStrategy, { label: string; description: string }> = {
  sharp_pause: { label: "Sharp Pause", description: "Wire pauses at corners. Best for sharp corners. May leave small radius." },
  radius_follow: { label: "Radius Follow", description: "Wire follows programmed radius. Smoother, slower at tight radii." },
  tangent_blend: { label: "Tangent Blend", description: "Wire blends tangentially between segments. Fastest, less precise at corners." },
};

const APPROACH_INFO: Record<ApproachType, { label: string; description: string }> = {
  lead_in: { label: "Lead-in Arc", description: "Tangent arc approach — smoother entry, prevents witness marks at start point." },
  direct: { label: "Direct", description: "Straight approach to profile — faster but may leave a witness mark." },
};

const SLUG_METHODS: Record<SlugMethod, { label: string; description: string }> = {
  free_drop: { label: "Free Drop", description: "Slug drops into tank by gravity. Simple, risk of tipping." },
  controlled_drop: { label: "Controlled", description: "Reduced speed at end to control slug drop. Safer for large slugs." },
  glue_tab: { label: "Glue Tab", description: "Small tab holds slug until manually broken. Most secure." },
  magnet: { label: "Magnet", description: "Magnetic slug holder. For ferrous materials only." },
  vacuum: { label: "Vacuum", description: "Vacuum table holds slug. For thin or non-ferrous materials." },
};

const DEFAULT_TAB_WIDTH_MM = 0.3;
const DEFAULT_LEAD_IN_RADIUS_MM = 2.0;

// ============================================================================
// PROPS
// ============================================================================

export interface StepToolpathProps {
  onComplete: () => void;
  onBack?: () => void;
  isActive: boolean;
}

/** Per-profile local configuration (not sent to backend directly). */
interface ProfileConfig {
  id: string;
  direction: CuttingDirection;
  approach: ApproachType;
  leadInRadius: number;
  cornerStrategy: CornerStrategy;
  slugMethod: SlugMethod;
  taperAngleDeg: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function StepToolpath({ onComplete, onBack, isActive }: StepToolpathProps) {
  const { markStepComplete, markStepError, markStale } = useWedmNavigation();
  const { steps, setStepData } = useWedmData();
  const importResult = steps.import;
  const wcsResult = steps.wcs;
  const selection = steps.selection;

  // API hook for final validation
  const toolpathHook = useWedmStep<ToolpathParams, ToolpathResult>(
    "toolpath",
    (params, signal) => wedmApi.toolpath(params, signal),
  );

  // Local state
  const [profiles, setProfiles] = useState<ToolpathProfile[]>([]);
  const [configs, setConfigs] = useState<ProfileConfig[]>([]);
  const [tabs, setTabs] = useState<TabPosition[]>([]);
  const [sequence, setSequence] = useState<CuttingSequenceEntry[]>([]);
  const [totalCutLength, setTotalCutLength] = useState(0);
  // Machine UV travel limits and workpiece params (WEDM-MS1 U-WEDM23)
  const [machineUvTravelMm, setMachineUvTravelMm] = useState<number | null>(null);
  const workpieceHeightMm = wcsResult?.workpiece_height_mm ?? 50;
  const guideDistanceMm = wcsResult?.guide_distance_mm ?? 400;
  const wireDiaMm = selection?.wire_diameter_mm ?? 0.25;
  // Material density for slug weight calculation (kg/m³, default steel)
  const materialDensity = selection?.material_density_kg_m3 ?? 7850;

  // ── Fetch machine UV travel limits (WEDM-MS1 U-WEDM23) ────────────────
  useEffect(() => {
    if (!selection?.machine_id) return;
    const controller = new AbortController();
    wedmApi.machineUvTravel?.(selection.machine_id, controller.signal)
      ?.then(res => {
        if (res.ok && !controller.signal.aborted) {
          setMachineUvTravelMm(res.data.max_uv_travel_mm);
        }
      })
      .catch(() => { /* UV travel lookup optional */ });
    return () => controller.abort();
  }, [selection?.machine_id]);

  // ── Auto-generate toolpath on mount ────────────────────────────────────
  useEffect(() => {
    if (!importResult?.features || !wcsResult?.start_holes || profiles.length > 0) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      wedmApi.toolpath(
        {
          features: importResult.features,
          contours: importResult.contours,
          start_holes: wcsResult.start_holes,
          material: selection?.material,
          wire_diameter_mm: selection?.wire_diameter_mm,
        },
        controller.signal,
      ).then(result => {
        if (result.ok && !controller.signal.aborted) {
          const data = result.data;
          setProfiles(data.profiles);
          setTabs(data.tabs);
          setSequence(data.sequence);
          setTotalCutLength(data.total_cut_length_mm);

          // Initialize per-profile configs with sensible defaults
          setConfigs(data.profiles.map(p => ({
            id: p.id,
            direction: p.type === "closed_internal" ? "ccw" : "cw",
            approach: "lead_in" as ApproachType,
            leadInRadius: DEFAULT_LEAD_IN_RADIUS_MM,
            cornerStrategy: (p.min_corner_radius_mm != null && p.min_corner_radius_mm < 0.1
              ? "sharp_pause"
              : "radius_follow") as CornerStrategy,
            slugMethod: (p.type === "closed_internal" ? "controlled_drop" : "free_drop") as SlugMethod,
            taperAngleDeg: p.taper_angle_deg ?? 0,
          })));
        }
      });
    }, 200);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [importResult, wcsResult, selection, profiles.length]);

  // ── Profile config updates ─────────────────────────────────────────────
  const updateConfig = useCallback((id: string, field: keyof ProfileConfig, value: string | number) => {
    setConfigs(prev => prev.map(c => (c.id === id ? { ...c, [field]: value } : c)));
    markStale("toolpath");
  }, [markStale]);

  // ── Tab management ─────────────────────────────────────────────────────
  const addTab = useCallback((profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    const position = profile.profile_length_mm / 2;
    setTabs(prev => [...prev, { profile_id: profileId, position_along_mm: +position.toFixed(2), width_mm: DEFAULT_TAB_WIDTH_MM }]);
    markStale("toolpath");
  }, [profiles, markStale]);

  const removeTab = useCallback((index: number) => {
    setTabs(prev => prev.filter((_, i) => i !== index));
    markStale("toolpath");
  }, [markStale]);

  const updateTab = useCallback((index: number, field: keyof TabPosition, value: number) => {
    setTabs(prev => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
    markStale("toolpath");
  }, [markStale]);

  // ── Sequence reorder (keyboard alternative to drag) ────────────────────
  const moveSequenceItem = useCallback((fromIdx: number, direction: "up" | "down") => {
    const toIdx = direction === "up" ? fromIdx - 1 : fromIdx + 1;
    setSequence(prev => {
      if (toIdx < 0 || toIdx >= prev.length) return prev;
      const next = [...prev];
      [next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]];
      return next.map((entry, i) => ({ ...entry, order: i + 1 }));
    });
    markStale("toolpath");
  }, [markStale]);

  // ── Derived data ───────────────────────────────────────────────────────
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tabs) {
      counts[t.profile_id] = (counts[t.profile_id] ?? 0) + 1;
    }
    return counts;
  }, [tabs]);

  const internalProfiles = useMemo(
    () => profiles.filter(p => p.type === "closed_internal" || p.type === "island"),
    [profiles],
  );

  // ── Confirm & Save ────────────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    const finalSequence: CuttingSequenceEntry[] = sequence.map((s, i) => {
      const config = configs.find(c => c.id === s.profile_id);
      return {
        ...s,
        order: i + 1,
        approach_type: config?.approach ?? "lead_in",
        lead_in_radius_mm: config?.approach === "lead_in"
          ? (config?.leadInRadius ?? DEFAULT_LEAD_IN_RADIUS_MM)
          : undefined,
      };
    });

    const result = await toolpathHook.execute({
      profiles,
      tabs,
      sequence: finalSequence,
      material: selection?.material,
      wire_diameter_mm: selection?.wire_diameter_mm,
    });

    if (result.ok) {
      setStepData("toolpath", result.data);
      markStepComplete("toolpath");
      onComplete();
    } else {
      markStepError("toolpath");
    }
  }, [profiles, tabs, sequence, configs, selection, toolpathHook, setStepData, markStepComplete, markStepError, onComplete]);

  if (!isActive) return null;

  const isLoading = toolpathHook.loading || (profiles.length === 0 && !!importResult?.features);

  return (
    <div className="space-y-4">
      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {isLoading && (
        <Card>
          <div className="flex items-center gap-3 py-4 justify-center" role="status" aria-live="polite">
            <Spinner size="sm" />
            <span className="text-sm text-slate-500">Analyzing profiles and generating toolpath…</span>
          </div>
        </Card>
      )}

      {/* ── Card 1: Profile Classification + Per-Profile Settings ──────── */}
      {profiles.length > 0 && (
        <Card>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
            Profiles ({profiles.length})
            <InfoTip text="Classified wire EDM cutting profiles. External profiles are cut clockwise, internals counter-clockwise." />
          </h4>

          <div className="space-y-2">
            {profiles.map(profile => {
              const typeInfo = PROFILE_TYPE_INFO[profile.type];
              const config = configs.find(c => c.id === profile.id);
              if (!config) return null;

              return (
                <div key={profile.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                  {/* Profile header */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${typeInfo.color}`} />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{typeInfo.label}</span>
                    <span className="text-xs text-slate-400">{profile.profile_length_mm.toFixed(1)}mm</span>
                    {profile.min_corner_radius_mm != null && (
                      <Badge variant="secondary" size="sm">R{profile.min_corner_radius_mm.toFixed(2)}</Badge>
                    )}
                    {profile.taper_angle_deg != null && profile.taper_angle_deg > 0 && (
                      <Badge variant="secondary" size="sm">{profile.taper_angle_deg}&deg; taper</Badge>
                    )}
                  </div>

                  {/* Direction + Approach + Lead-in radius */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {/* Cutting direction */}
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 mb-0.5">Direction</label>
                      <div className="flex gap-1">
                        {(["cw", "ccw"] as CuttingDirection[]).map(dir => (
                          <button
                            key={dir}
                            onClick={() => updateConfig(profile.id, "direction", dir)}
                            className={`flex-1 text-center px-2 py-1.5 text-xs rounded min-h-[44px] transition-colors ${
                              config.direction === dir
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                            }`}
                            aria-pressed={config.direction === dir}
                            aria-label={`Cut ${dir === "cw" ? "clockwise" : "counter-clockwise"} for ${typeInfo.label} profile`}
                          >
                            {dir === "cw" ? "CW \u21BB" : "CCW \u21BA"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Approach type */}
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                        Approach
                        <InfoTip text={APPROACH_INFO[config.approach].description} />
                      </label>
                      <select
                        value={config.approach}
                        onChange={e => updateConfig(profile.id, "approach", e.target.value)}
                        className="w-full px-1.5 py-1 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 min-h-[44px]"
                        aria-label={`Approach type for ${typeInfo.label} profile`}
                      >
                        {Object.entries(APPROACH_INFO).map(([key, info]) => (
                          <option key={key} value={key}>{info.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Lead-in radius (conditional) */}
                    {config.approach === "lead_in" && (
                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-0.5">Lead-in R (mm)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="20"
                          value={config.leadInRadius}
                          onChange={e => updateConfig(profile.id, "leadInRadius", +e.target.value)}
                          className="w-full px-1.5 py-1 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 min-h-[44px]"
                          aria-label={`Lead-in radius for ${typeInfo.label} profile`}
                        />
                      </div>
                    )}
                  </div>

                  {/* Corner strategy */}
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                      Corner Strategy
                      <InfoTip text="How the wire navigates corners. Sharp pause gives best accuracy. Radius follow is fastest for rounded corners." />
                    </label>
                    <div className="flex gap-1">
                      {(Object.entries(CORNER_STRATEGIES) as [CornerStrategy, { label: string; description: string }][]).map(
                        ([strategy, info]) => (
                          <button
                            key={strategy}
                            onClick={() => updateConfig(profile.id, "cornerStrategy", strategy)}
                            className={`flex-1 text-center px-2 py-1.5 text-xs rounded min-h-[44px] transition-colors ${
                              config.cornerStrategy === strategy
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                            }`}
                            aria-pressed={config.cornerStrategy === strategy}
                            title={info.description}
                          >
                            {info.label}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Taper angle + UV validation (WEDM-MS1 U-WEDM23) */}
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                      Taper Angle (&deg;)
                      <InfoTip text="Wire taper angle for this profile. Creates angled walls by offsetting the upper and lower wire guides. 0° = straight cut. UV axis travel limits checked against machine capability." />
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="45"
                        value={config.taperAngleDeg}
                        onChange={e => updateConfig(profile.id, "taperAngleDeg", +e.target.value)}
                        className="w-24 px-1.5 py-1 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 min-h-[44px]"
                        aria-label={`Taper angle for ${typeInfo.label} profile`}
                      />
                      {config.taperAngleDeg > 0 && (() => {
                        const uvOffset = calculateTaperUVOffset(config.taperAngleDeg, workpieceHeightMm);
                        const error = predictTaperError(wireDiaMm, workpieceHeightMm, guideDistanceMm);
                        const exceedsUV = machineUvTravelMm != null && uvOffset > machineUvTravelMm;
                        return (
                          <div className="flex-1 text-xs space-y-0.5">
                            <span className="text-slate-500">
                              UV offset: <strong className={exceedsUV ? "text-red-500" : "text-slate-700 dark:text-slate-200"}>
                                {uvOffset.toFixed(3)}mm
                              </strong>
                              {machineUvTravelMm != null && (
                                <span className="text-slate-400"> / {machineUvTravelMm.toFixed(1)}mm max</span>
                              )}
                            </span>
                            {exceedsUV && (
                              <p className="text-red-500 font-medium" role="alert">
                                Exceeds machine UV travel — reduce angle or use a machine with larger UV range
                              </p>
                            )}
                            <span className="text-slate-400 block">
                              Accuracy: &plusmn;{(error * 1000).toFixed(1)}&micro;m
                              {machineUvTravelMm != null && (
                                <span className="ml-2">
                                  Max angle: {(Math.atan(machineUvTravelMm / (workpieceHeightMm / 2)) * 180 / Math.PI).toFixed(1)}&deg;
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Slug management with weight + recommendation (WEDM-MS1 U-WEDM25) */}
                  {(profile.type === "closed_internal" || profile.type === "island") && (() => {
                    // Slug weight: W = area × thickness × density
                    // Approximate area from profile length (assume roughly circular: A ≈ L²/(4π))
                    const approxAreaMm2 = profile.profile_length_mm > 0
                      ? (profile.profile_length_mm ** 2) / (4 * Math.PI)
                      : 0;
                    const thicknessMm = workpieceHeightMm;
                    // Material density lookup (common defaults, kg/m³)
                    const densityKgM3 = materialDensity;
                    const weightKg = (approxAreaMm2 * 1e-6) * (thicknessMm * 1e-3) * densityKgM3;
                    const weightG = weightKg * 1000;

                    // Recommendation based on canonical thresholds from EDMWireSlugCornerTaperEngine
                    let recommended: SlugMethod;
                    let reasonText: string;
                    if (weightKg < 0.1) {
                      recommended = "free_drop";
                      reasonText = `Light slug (${weightG.toFixed(1)}g) — free drop OK`;
                    } else if (weightKg < 0.5) {
                      recommended = "controlled_drop";
                      reasonText = `Medium slug (${weightG.toFixed(1)}g) — controlled drop recommended`;
                    } else if (weightKg < 2.0) {
                      recommended = densityKgM3 > 7000 ? "magnet" : "glue_tab";
                      reasonText = densityKgM3 > 7000
                        ? `Heavy slug (${weightG.toFixed(0)}g) — magnetic hold recommended`
                        : `Heavy slug (${weightG.toFixed(0)}g) — glue tab recommended (non-magnetic)`;
                    } else {
                      recommended = "vacuum";
                      reasonText = `Very heavy slug (${weightKg.toFixed(2)}kg) — vacuum extraction required`;
                    }

                    const isRecommended = config.slugMethod === recommended;

                    return (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                          Slug Management
                          <InfoTip text="How the cut-out material (slug) is handled after separation. Weight calculated from profile area × thickness × material density." />
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            value={config.slugMethod}
                            onChange={e => updateConfig(profile.id, "slugMethod", e.target.value)}
                            className="flex-1 px-1.5 py-1 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 min-h-[44px]"
                            aria-label={`Slug management for ${typeInfo.label} profile`}
                          >
                            {Object.entries(SLUG_METHODS).map(([key, info]) => (
                              <option key={key} value={key}>{info.label} — {info.description}</option>
                            ))}
                          </select>
                          {!isRecommended && (
                            <button
                              onClick={() => updateConfig(profile.id, "slugMethod", recommended)}
                              className="text-[10px] px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 min-h-[44px] whitespace-nowrap"
                              aria-label={`Apply recommended: ${SLUG_METHODS[recommended].label}`}
                            >
                              Use {SLUG_METHODS[recommended].label}
                            </button>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 space-y-0.5">
                          <span className="block">
                            Slug weight: <strong className="text-slate-700 dark:text-slate-200">{weightG < 1000 ? `${weightG.toFixed(1)}g` : `${weightKg.toFixed(2)}kg`}</strong>
                            <span className="text-slate-400 ml-1">
                              (~{approxAreaMm2.toFixed(0)}mm&sup2; × {thicknessMm}mm × {(densityKgM3/1000).toFixed(1)}g/cm&sup3;)
                            </span>
                          </span>
                          <span className={`block ${isRecommended ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}`}>
                            {isRecommended ? "\u2713 " : "\u26A0 "}{reasonText}
                          </span>
                        </div>
                        {/* Ejection verification checklist */}
                        {weightKg >= 0.5 && (
                          <div className="text-[10px] p-2 rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700">
                            <span className="font-medium text-yellow-700 dark:text-yellow-300 block mb-1">Slug Ejection Checklist</span>
                            <ul className="space-y-0.5 text-yellow-600 dark:text-yellow-400">
                              <li>{"\u2610"} Verify clearance below workpiece for slug drop</li>
                              <li>{"\u2610"} {config.slugMethod === "magnet" ? "Place magnet on slug before final cut" : config.slugMethod === "glue_tab" ? "Apply adhesive to tab locations" : "Position vacuum nozzle"}</li>
                              <li>{"\u2610"} Confirm tab placement avoids critical surfaces</li>
                              <li>{"\u2610"} Reduce feed rate for final 2mm of separation cut</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Card 2: Tab Management ─────────────────────────────────────── */}
      {profiles.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Tabs ({tabs.length})
              <InfoTip text="Small uncut sections that hold the slug in place during cutting. Required for internal profiles to prevent slug tipping." />
            </h4>
            {internalProfiles.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {internalProfiles.map(p => (
                  <Button key={p.id} size="sm" variant="secondary" onClick={() => addTab(p.id)}>
                    + {PROFILE_TYPE_INFO[p.type].label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {tabs.length === 0 ? (
            <p className="text-sm text-slate-500 py-3 text-center">
              No tabs configured. Internal profiles may need tabs to hold slugs in place.
            </p>
          ) : (
            <div className="space-y-1">
              {tabs.map((tab, idx) => {
                const profile = profiles.find(p => p.id === tab.profile_id);
                const typeLabel = profile ? PROFILE_TYPE_INFO[profile.type].label : tab.profile_id;

                return (
                  <div key={`tab-${tab.profile_id}-${idx}`} className="flex items-center gap-2 p-2 rounded border border-slate-100 dark:border-slate-700">
                    <span className="text-xs text-slate-500 w-14 truncate" title={typeLabel}>{typeLabel}</span>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400">Position (mm)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max={profile?.profile_length_mm}
                          value={tab.position_along_mm}
                          onChange={e => updateTab(idx, "position_along_mm", +e.target.value)}
                          className="w-full px-1.5 py-1 text-xs border rounded dark:bg-slate-800 dark:border-slate-600"
                          aria-label={`Tab ${idx + 1} position along ${typeLabel}`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400">Width (mm)</label>
                        <input
                          type="number"
                          step="0.05"
                          min="0.1"
                          max="2.0"
                          value={tab.width_mm}
                          onChange={e => updateTab(idx, "width_mm", +e.target.value)}
                          className="w-full px-1.5 py-1 text-xs border rounded dark:bg-slate-800 dark:border-slate-600"
                          aria-label={`Tab ${idx + 1} width`}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeTab(idx)}
                      className="text-red-400 hover:text-red-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      aria-label={`Remove tab ${idx + 1}`}
                    >
                      {"\u2715"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── Card 3: Cutting Sequence ───────────────────────────────────── */}
      {sequence.length > 0 && (
        <Card>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
            Cutting Sequence
            <InfoTip text="The order in which profiles are cut. Internal profiles should be cut before external profiles to maintain workpiece rigidity." />
          </h4>

          <div className="space-y-1" aria-live="polite" aria-label="Cutting sequence, in order">
            {sequence.map((entry, idx) => {
              const profile = profiles.find(p => p.id === entry.profile_id);
              const typeInfo = profile ? PROFILE_TYPE_INFO[profile.type] : null;

              return (
                <div
                  key={`seq-${entry.profile_id}`}
                  className="flex items-center gap-2 p-2 rounded border border-slate-100 dark:border-slate-700"
                >
                  <span className="text-xs font-bold text-slate-400 w-6 text-center">{idx + 1}</span>
                  {typeInfo && <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${typeInfo.color}`} />}
                  <span className="flex-1 text-xs text-slate-700 dark:text-slate-200">
                    {typeInfo?.label ?? entry.profile_id}
                    {profile && (
                      <span className="text-slate-400 ml-1">({profile.profile_length_mm.toFixed(1)}mm)</span>
                    )}
                  </span>
                  {tabCounts[entry.profile_id] != null && tabCounts[entry.profile_id] > 0 && (
                    <span className="text-[10px] text-slate-400">
                      {tabCounts[entry.profile_id]} tab{tabCounts[entry.profile_id] > 1 ? "s" : ""}
                    </span>
                  )}
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => moveSequenceItem(idx, "up")}
                      disabled={idx === 0}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-blue-600 disabled:opacity-30"
                      aria-label={`Move ${typeInfo?.label ?? "profile"} up in cutting sequence`}
                    >
                      {"\u25B2"}
                    </button>
                    <button
                      onClick={() => moveSequenceItem(idx, "down")}
                      disabled={idx === sequence.length - 1}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-blue-600 disabled:opacity-30"
                      aria-label={`Move ${typeInfo?.label ?? "profile"} down in cutting sequence`}
                    >
                      {"\u25BC"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary footer */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 mt-2 border-t border-slate-100 dark:border-slate-700">
            <span>{profiles.length} profile{profiles.length !== 1 ? "s" : ""}</span>
            <span>
              Total cut length: <strong className="text-slate-700 dark:text-slate-200">{totalCutLength.toFixed(1)}mm</strong>
            </span>
          </div>
        </Card>
      )}

      {/* ── API Error ───────────────────────────────────────────────────── */}
      {toolpathHook.error && (
        <StepErrorCard error={toolpathHook.error} onRetry={toolpathHook.retry} />
      )}

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <div className="flex justify-between pt-2">
        {onBack && (
          <Button variant="secondary" onClick={onBack}>
            Back to WCS
          </Button>
        )}
        <div className="flex gap-2 ml-auto">
          <Button
            onClick={handleConfirm}
            disabled={profiles.length === 0 || toolpathHook.loading}
          >
            {toolpathHook.loading ? (
              <span className="flex items-center gap-2"><Spinner size="sm" /> Validating…</span>
            ) : "Continue to Optimize"}
          </Button>
        </div>
      </div>
    </div>
  );
}
