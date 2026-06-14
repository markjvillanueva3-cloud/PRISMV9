/**
 * StepReview.tsx — Wire EDM Studio Step 2: Review & Setup
 * WEDM-MS0 U-WEDM08
 *
 * Progressive disclosure card stack:
 *   1. Feature table (editable tolerance, surface finish, delete)
 *   2. Material + Thickness → auto-filters machines
 *   3. Machine selection
 *   4. Wire type (auto-recommended, overridable, cost/speed indicators)
 *   5. Feasibility go/no-go with specific reasons
 *
 * Every technical term has an info tooltip.
 * Stale marking on material/wire/machine changes.
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
  PartFeature,
  ClassifiedFeature,
  FeasibilityResult,
  FeasibilityParams,
  MaterialMachineWireSelection,
  WireType,
  PipelineResponse,
} from "../../types/wedmStudio";
import StepErrorCard from "./StepErrorCard";
import { InfoTip } from "./InfoTip";

// ============================================================================
// CONSTANTS
// ============================================================================

const SURFACE_FINISH_OPTIONS = [
  { value: 0.2, label: "< 0.4 \u00b5m Ra \u2014 Super-finish", description: "Mirror-like, medical/aerospace" },
  { value: 0.6, label: "0.4\u20130.8 \u00b5m Ra \u2014 Finish", description: "Smooth, die/mold quality" },
  { value: 1.2, label: "0.8\u20131.6 \u00b5m Ra \u2014 Semi-finish", description: "Good surface, general precision" },
  { value: 2.5, label: "> 1.6 \u00b5m Ra \u2014 Rough", description: "Functional only, fastest" },
];

const WIRE_INFO: Record<WireType, { label: string; description: string; costFactor: string; speedFactor: string }> = {
  brass: { label: "Brass (CuZn37)", description: "Cheapest, general purpose. Good for most materials.", costFactor: "$", speedFactor: "1x" },
  zinc_coated: { label: "Zinc Coated", description: "2x faster on steel than brass. Better flushing.", costFactor: "$$", speedFactor: "2x" },
  diffusion_annealed: { label: "Diffusion Annealed", description: "Best finish on hardened steel. Premium option.", costFactor: "$$$", speedFactor: "1.5x" },
  coated_brass: { label: "Coated Brass", description: "Good balance of speed and finish. Popular upgrade.", costFactor: "$$", speedFactor: "1.5x" },
  molybdenum: { label: "Molybdenum", description: "For very small features (< 0.1mm). High tensile strength.", costFactor: "$$$$", speedFactor: "0.7x" },
  tungsten: { label: "Tungsten", description: "Smallest wire available (0.02mm). Micro-EDM specialty.", costFactor: "$$$$$", speedFactor: "0.5x" },
  steel_core: { label: "Steel Core", description: "High tension capability. Good for tall parts.", costFactor: "$$$", speedFactor: "1.2x" },
};

const COMMON_MATERIALS = [
  "D2 Tool Steel", "A2 Tool Steel", "S7 Tool Steel", "H13 Tool Steel",
  "M2 High Speed Steel", "4140 Steel", "1018 Steel", "316 Stainless Steel",
  "304 Stainless Steel", "17-4 PH Stainless", "6061 Aluminum", "7075 Aluminum",
  "C360 Brass", "C101 Copper", "Ti-6Al-4V Titanium", "Inconel 718",
  "Tungsten Carbide", "Graphite",
];

const COMMON_MACHINES: { id: string; name: string; controller: string; maxThickness: number }[] = [
  { id: "fanuc-robocut-c600", name: "Fanuc Robocut \u03B1-C600iB", controller: "fanuc", maxThickness: 400 },
  { id: "fanuc-robocut-c400", name: "Fanuc Robocut \u03B1-C400iC", controller: "fanuc", maxThickness: 300 },
  { id: "mitsubishi-mv2400r", name: "Mitsubishi MV2400R", controller: "mitsubishi", maxThickness: 425 },
  { id: "mitsubishi-mv1200r", name: "Mitsubishi MV1200R", controller: "mitsubishi", maxThickness: 305 },
  { id: "sodick-aln600g", name: "Sodick ALN600G", controller: "sodick", maxThickness: 350 },
  { id: "sodick-alc600g", name: "Sodick ALC600G", controller: "sodick", maxThickness: 310 },
  { id: "agiecharmilles-cut-e600", name: "AgieCharmilles CUT E 600", controller: "agiecharmilles", maxThickness: 425 },
  { id: "agiecharmilles-cut-p550", name: "AgieCharmilles CUT P 550", controller: "agiecharmilles", maxThickness: 400 },
  { id: "makino-u6heat", name: "Makino U6 H.E.A.T.", controller: "makino", maxThickness: 400 },
  { id: "accutex-au-860ia", name: "Accutex AU-860iA", controller: "accutex", maxThickness: 350 },
];

const FLUSHING_INFO: Record<string, string> = {
  submerged: "Part is underwater during cutting. Better surface finish, more consistent spark gap. Standard for precision work.",
  jet: "Nozzle jets spray dielectric at the cut zone. Easier setup, works for simple parts. Less consistent than submerged.",
};

// ============================================================================
// PROPS
// ============================================================================

export interface StepReviewProps {
  onComplete: () => void;
  onBack?: () => void;
  isActive: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function StepReview({ onComplete, onBack, isActive }: StepReviewProps) {
  const { markStale, markStepComplete, markStepError } = useWedmNavigation();
  const { steps, setStepData } = useWedmData();
  const importResult = steps.import;

  // Progressive disclosure: which cards are expanded
  const [expandedCard, setExpandedCard] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Editable feature list
  const [features, setFeatures] = useState<PartFeature[]>([]);
  const [classified, setClassified] = useState<ClassifiedFeature[]>([]);

  // Selections
  const [material, setMaterial] = useState("");
  const [customMaterial, setCustomMaterial] = useState("");
  const [thickness, setThickness] = useState<number>(0);
  const [machineId, setMachineId] = useState("");
  const [wireType, setWireType] = useState<WireType>("brass");
  const [wireDiameter, setWireDiameter] = useState(0.25);
  const [surfaceFinishTarget, setSurfaceFinishTarget] = useState(1.2);
  const [flushingMode, setFlushingMode] = useState<"submerged" | "jet">("submerged");
  const [taperAngle, setTaperAngle] = useState(0);

  // API hooks
  const classifyHook = useWedmStep<{ features: PartFeature[]; material?: string }, ClassifiedFeature[]>(
    "review",
    (params, signal) => wedmApi.classifyFeatures(params.features, params.material, signal),
  );
  const feasibilityHook = useWedmStep<FeasibilityParams, FeasibilityResult>(
    "review",
    (params, signal) => wedmApi.feasibility(params, signal),
  );

  // Feasibility result
  const [feasibility, setFeasibility] = useState<FeasibilityResult | null>(null);

  // Initialize features from import result
  useEffect(() => {
    if (importResult?.features && features.length === 0) {
      setFeatures([...importResult.features]);
    }
  }, [importResult, features.length]);

  // Auto-classify when features or material change (with AbortController)
  useEffect(() => {
    if (features.length === 0 || !material) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      // useWedmStep.execute(params) — the hook manages its own AbortController
      // internally; passing controller.signal here is redundant and TS-invalid.
      classifyHook.execute({ features, material }).then(res => {
        if (res.ok && !controller.signal.aborted) setClassified(res.data);
      });
    }, 300); // debounce 300ms for custom material typing
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features.length, material]);

  const effectiveMaterial = material === "__custom__" ? customMaterial : material;

  // ── Feature Editing ────────────────────────────────────────────────────
  const updateFeature = useCallback((index: number, field: keyof PartFeature, value: any) => {
    setFeatures(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    markStale("import");
  }, [markStale]);

  const deleteFeature = useCallback((index: number) => {
    setFeatures(prev => prev.filter((_, i) => i !== index));
    markStale("import");
  }, [markStale]);

  // ── Card Confirmation ──────────────────────────────────────────────────
  const confirmCard = useCallback((card: 1 | 2 | 3 | 4 | 5) => {
    if (card < 5) setExpandedCard((card + 1) as any);
  }, []);

  // ── Material/Wire Change → Stale ──────────────────────────────────────
  const handleMaterialChange = useCallback((mat: string) => {
    setMaterial(mat);
    markStale("review");
    setFeasibility(null);
  }, [markStale]);

  const handleWireChange = useCallback((wire: WireType) => {
    setWireType(wire);
    markStale("review");
    setFeasibility(null);
  }, [markStale]);

  // ── Run Feasibility ────────────────────────────────────────────────────
  const runFeasibility = useCallback(async () => {
    const result = await feasibilityHook.execute({
      features,
      material: effectiveMaterial,
      thickness_mm: thickness,
      wire_diameter_mm: wireDiameter,
      target_ra_um: surfaceFinishTarget,
      taper_angle_deg: taperAngle,
      flushing_mode: flushingMode,
    });

    if (result.ok) {
      setFeasibility(result.data);
      setStepData("feasibility", result.data);
      setStepData("selection", {
        material: effectiveMaterial,
        machine_id: machineId,
        machine_name: selectedMachine?.name ?? "",
        wire_type: wireType,
        wire_diameter_mm: wireDiameter,
        controller: (selectedMachine?.controller ?? "fanuc") as any,
      });

      if (result.data.overall_feasible) {
        markStepComplete("review");
      }
      setExpandedCard(5);
    } else {
      markStepError("review");
    }
  }, [feasibilityHook, features, effectiveMaterial, thickness, wireDiameter, surfaceFinishTarget, taperAngle, flushingMode, wireType, setStepData, markStepComplete, markStepError]);

  // ── Derived State ──────────────────────────────────────────────────────
  const selectedMachine = COMMON_MACHINES.find(m => m.id === machineId);
  const canRunFeasibility = effectiveMaterial.length > 0 && thickness > 0 && features.length > 0 && machineId.length > 0;

  // Recommended wire based on material and surface finish
  const recommendedWire = useMemo((): WireType => {
    if (surfaceFinishTarget < 0.4) return "diffusion_annealed";
    if (effectiveMaterial.toLowerCase().includes("carbide")) return "molybdenum";
    if (surfaceFinishTarget > 1.6) return "brass";
    return "zinc_coated";
  }, [surfaceFinishTarget, effectiveMaterial]);

  if (!isActive) return null;

  return (
    <div className="space-y-3">
      {/* ── Card 1: Feature Table ──────────────────────────────────────── */}
      <Card
        className={`transition-all ${expandedCard >= 1 ? "" : "opacity-60"}`}
      >
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpandedCard(1)}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedCard(1); } }}
        >
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            1. Features
            <InfoTip text="Features detected from your uploaded file. You can edit tolerances, change surface finish targets, or remove features that don't need Wire EDM." />
          </h4>
          {expandedCard > 1 && (
            <Badge color="green">{features.length} features confirmed</Badge>
          )}
        </div>

        {expandedCard === 1 && (
          <div className="mt-3 space-y-2">
            {features.length === 0 ? (
              <p className="text-sm text-slate-500">No features detected. Go back to upload a file.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" role="table">
                    <thead>
                      <tr className="text-left text-slate-500 border-b dark:border-slate-700">
                        <th className="py-2 pr-2 min-w-[100px]" scope="col">Name</th>
                        <th className="py-2 pr-2" scope="col">Type</th>
                        <th className="py-2 pr-2" scope="col">
                          Tolerance
                          <InfoTip text="How precisely the feature must be cut. Tighter tolerances need more passes and take longer." />
                        </th>
                        <th className="py-2 pr-2" scope="col">
                          Ra Target
                          <InfoTip text="Surface roughness target. Lower number = smoother surface. Measured in micrometers." />
                        </th>
                        <th className="py-2 pr-2" scope="col">Process</th>
                        <th className="py-2" scope="col"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {features.map((f, i) => {
                        const cls = classified.find(c => c.name === f.name);
                        return (
                          <tr key={f.name || `feature-${i}`} className="border-b border-slate-100 dark:border-slate-700/50">
                            <td className="py-2 pr-2 font-medium text-slate-700 dark:text-slate-200">{f.name}</td>
                            <td className="py-2 pr-2">
                              <Badge color="blue">{f.type}</Badge>
                            </td>
                            <td className="py-2 pr-2">
                              <input
                                type="number"
                                step="0.001"
                                min="0.001"
                                value={f.tolerance_mm ?? ""}
                                onChange={e => updateFeature(i, "tolerance_mm", e.target.value ? +e.target.value : undefined)}
                                className="w-20 px-1.5 py-1 text-xs border rounded dark:bg-slate-800 dark:border-slate-600"
                                aria-label={`Tolerance for ${f.name}`}
                              />
                              <span className="ml-1 text-slate-400">mm</span>
                            </td>
                            <td className="py-2 pr-2">
                              <select
                                value={f.surface_finish_ra_um ?? ""}
                                onChange={e => updateFeature(i, "surface_finish_ra_um", e.target.value ? +e.target.value : undefined)}
                                className="w-28 px-1.5 py-1 text-xs border rounded dark:bg-slate-800 dark:border-slate-600"
                                aria-label={`Surface finish for ${f.name}`}
                              >
                                <option value="">Auto</option>
                                {SURFACE_FINISH_OPTIONS.map(o => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 pr-2">
                              {cls ? (
                                <Badge color={cls.edm_process === "wire_edm" ? "green" : cls.edm_process === "not_edm" ? "red" : "yellow"}>
                                  {cls.edm_process.replace(/_/g, " ")}
                                </Badge>
                              ) : (
                                <span className="text-slate-400">\u2014</span>
                              )}
                            </td>
                            <td className="py-2">
                              <button
                                onClick={() => deleteFeature(i)}
                                className="text-red-400 hover:text-red-600 min-w-[44px] min-h-[44px] flex items-center justify-center -m-3 p-3"
                                aria-label={`Remove ${f.name}`}
                                title="Remove feature"
                              >
                                \u2715
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => confirmCard(1)}>
                    Confirm Features ({features.length})
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Card>

      {/* ── Card 2: Material + Thickness ───────────────────────────────── */}
      <Card className={`transition-all ${expandedCard >= 2 ? "" : "opacity-40 pointer-events-none"}`}>
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => expandedCard >= 2 && setExpandedCard(2)}
          role="button"
          tabIndex={expandedCard >= 2 ? 0 : -1}
          onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && expandedCard >= 2) { e.preventDefault(); setExpandedCard(2); } }}
        >
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            2. Material & Thickness
          </h4>
          {expandedCard > 2 && effectiveMaterial && (
            <Badge color="green">{effectiveMaterial}, {thickness}mm</Badge>
          )}
        </div>

        {expandedCard === 2 && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Material
                <InfoTip text="The workpiece material. Must be electrically conductive for Wire EDM. Non-conductive materials (most plastics, ceramics) cannot be cut." />
              </label>
              <select
                value={material}
                onChange={e => handleMaterialChange(e.target.value)}
                className="w-full px-2 py-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600"
              >
                <option value="">Select material...</option>
                {COMMON_MATERIALS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
                <option value="__custom__">Other (type below)</option>
              </select>
              {material === "__custom__" && (
                <input
                  type="text"
                  value={customMaterial}
                  onChange={e => { setCustomMaterial(e.target.value); markStale("review"); }}
                  placeholder="Enter material name..."
                  className="w-full mt-2 px-2 py-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Workpiece Thickness (mm)
                <InfoTip text="The height of the cut. Thicker parts cut slower and have higher wire break risk. Also affects flushing strategy." />
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="500"
                value={thickness || ""}
                onChange={e => { setThickness(+e.target.value); markStale("review"); }}
                className="w-40 px-2 py-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600"
                placeholder="e.g. 25"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Machine
                <InfoTip text="The Wire EDM machine to use. Affects available features like taper cutting, max thickness, and controller dialect." />
              </label>
              <select
                value={machineId}
                onChange={e => { setMachineId(e.target.value); markStale("review"); setFeasibility(null); }}
                className="w-full px-2 py-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600"
              >
                <option value="">Select machine...</option>
                {COMMON_MACHINES.filter(m => !thickness || m.maxThickness >= thickness).map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.controller})</option>
                ))}
              </select>
              {selectedMachine && thickness > 0 && thickness > selectedMachine.maxThickness && (
                <p className="text-xs text-red-500 mt-1">
                  Workpiece thickness ({thickness}mm) exceeds machine capacity ({selectedMachine.maxThickness}mm).
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button size="sm" onClick={() => confirmCard(2)} disabled={!effectiveMaterial || thickness <= 0 || !machineId}>
                Confirm Material & Machine
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Card 3: Wire Type ──────────────────────────────────────────── */}
      <Card className={`transition-all ${expandedCard >= 3 ? "" : "opacity-40 pointer-events-none"}`}>
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => expandedCard >= 3 && setExpandedCard(3)}
          role="button"
          tabIndex={expandedCard >= 3 ? 0 : -1}
          onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && expandedCard >= 3) { e.preventDefault(); setExpandedCard(3); } }}
        >
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            3. Wire Type
            <InfoTip text="The electrode wire used for cutting. Different wires have different speed, cost, and surface finish characteristics." />
          </h4>
          {expandedCard > 3 && (
            <Badge color="green">{WIRE_INFO[wireType].label}, {wireDiameter}mm</Badge>
          )}
        </div>

        {expandedCard === 3 && (
          <div className="mt-3 space-y-3">
            {/* Recommended banner */}
            {wireType !== recommendedWire && (
              <div className="p-2 rounded bg-blue-50 border border-blue-200 text-xs text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300">
                Recommended: <strong>{WIRE_INFO[recommendedWire].label}</strong> for your material and surface finish target.
                <button
                  className="ml-2 underline"
                  onClick={() => handleWireChange(recommendedWire)}
                >
                  Use recommended
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.entries(WIRE_INFO) as [WireType, typeof WIRE_INFO[WireType]][]).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => handleWireChange(key)}
                  className={`text-left p-3 rounded-lg border transition-colors min-h-[44px] ${
                    wireType === key
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500"
                  }`}
                  aria-pressed={wireType === key}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{info.label}</span>
                    <span className="flex gap-2">
                      <Badge color="blue">{info.speedFactor} speed</Badge>
                      <Badge color="yellow">{info.costFactor}</Badge>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{info.description}</p>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Wire Diameter (mm)
                <InfoTip text="Smaller wire cuts finer details and smaller radii, but is slower and more fragile. Common: 0.25mm (general), 0.20mm (fine), 0.10mm (micro)." />
              </label>
              <select
                value={wireDiameter}
                onChange={e => { setWireDiameter(+e.target.value); markStale("review"); setFeasibility(null); }}
                className="w-40 px-2 py-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600"
              >
                <option value={0.30}>0.30 mm</option>
                <option value={0.25}>0.25 mm (standard)</option>
                <option value={0.20}>0.20 mm (fine)</option>
                <option value={0.15}>0.15 mm</option>
                <option value={0.10}>0.10 mm (micro)</option>
                <option value={0.07}>0.07 mm</option>
                <option value={0.05}>0.05 mm</option>
              </select>
            </div>

            <div className="flex justify-end">
              <Button size="sm" onClick={() => confirmCard(3)}>
                Confirm Wire
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Card 4: Surface Finish + Flushing + Taper ──────────────────── */}
      <Card className={`transition-all ${expandedCard >= 4 ? "" : "opacity-40 pointer-events-none"}`}>
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => expandedCard >= 4 && setExpandedCard(4)}
          role="button"
          tabIndex={expandedCard >= 4 ? 0 : -1}
          onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && expandedCard >= 4) { e.preventDefault(); setExpandedCard(4); } }}
        >
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            4. Process Settings
          </h4>
          {expandedCard > 4 && (
            <Badge color="green">Ra {surfaceFinishTarget}\u00b5m, {flushingMode}</Badge>
          )}
        </div>

        {expandedCard === 4 && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Target Surface Finish
                <InfoTip text="Surface roughness — lower number means smoother. More passes are needed for better finish, which takes longer and costs more." />
              </label>
              <div className="space-y-1">
                {SURFACE_FINISH_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setSurfaceFinishTarget(opt.value); markStale("review"); setFeasibility(null); }}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors min-h-[44px] ${
                      surfaceFinishTarget === opt.value
                        ? "bg-blue-50 border border-blue-300 text-blue-800 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-300"
                        : "bg-slate-50 border border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-600"
                    }`}
                    aria-pressed={surfaceFinishTarget === opt.value}
                  >
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-slate-500 ml-2">{opt.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Flushing Mode
                <InfoTip text="How dielectric fluid is delivered to the cutting zone. Affects surface quality and wire break risk." />
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["submerged", "jet"] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => { setFlushingMode(mode); markStale("review"); setFeasibility(null); }}
                    className={`text-left p-3 rounded-lg border transition-colors min-h-[44px] ${
                      flushingMode === mode
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-slate-200 hover:border-slate-300 dark:border-slate-600"
                    }`}
                    aria-pressed={flushingMode === mode}
                  >
                    <span className="text-sm font-medium capitalize">{mode}</span>
                    <p className="text-xs text-slate-500 mt-1">{FLUSHING_INFO[mode]}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Taper Angle (\u00b0)
                <InfoTip text="If the cut walls need to be angled (not vertical). 0 = straight walls. Requires UV-axis machine capability." />
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="45"
                value={taperAngle || ""}
                onChange={e => { setTaperAngle(+e.target.value); markStale("review"); setFeasibility(null); }}
                className="w-32 px-2 py-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600"
                placeholder="0"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={runFeasibility} disabled={!canRunFeasibility || feasibilityHook.loading}>
                {feasibilityHook.loading ? (
                  <span className="flex items-center gap-2"><Spinner size="sm" /> Checking...</span>
                ) : "Run Feasibility Check"}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Card 5: Feasibility Result ─────────────────────────────────── */}
      {feasibility && (
        <Card className={expandedCard === 5 ? "" : "opacity-60"}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                5. Feasibility
              </h4>
              <Badge color={feasibility.overall_feasible ? "green" : "red"}>
                {feasibility.overall_feasible ? "GO" : "NO-GO"}
              </Badge>
            </div>

            <div aria-live="polite">
              {/* Per-feature assessments */}
              {feasibility.feature_assessments.map((fa, i) => (
                <div key={i} className="flex items-start gap-2 py-1.5 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                  <Badge color={fa.feasible ? "green" : "red"}>
                    {fa.feasible ? "\u2713" : "\u2717"}
                  </Badge>
                  <div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{fa.feature_name}</span>
                    {fa.issues.length > 0 && (
                      <ul className="mt-0.5">
                        {fa.issues.map((issue, j) => (
                          <li key={j} className="text-xs text-red-600 dark:text-red-400">{issue}</li>
                        ))}
                      </ul>
                    )}
                    {fa.alternatives.length > 0 && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                        Alternative: {fa.alternatives.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Estimates */}
            <div className="flex gap-4 text-xs text-slate-500">
              <span>Est. time: <strong className="text-slate-700 dark:text-slate-200">{feasibility.estimated_time_min} min</strong></span>
              <span>Est. cost: <strong className="text-slate-700 dark:text-slate-200">${feasibility.estimated_cost_usd.toFixed(2)}</strong></span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
              {onBack && (
                <Button variant="secondary" onClick={onBack}>
                  Back
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                {!feasibility.overall_feasible && (
                  <Button variant="secondary" onClick={() => setExpandedCard(2)}>
                    Modify Settings
                  </Button>
                )}
                <Button onClick={onComplete} disabled={!feasibility.overall_feasible}>
                  Continue to WCS
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Similar Jobs + Drift Detection (WEDM-MS1 U-WEDM43/44) ────── */}
      {/* 2026-05-27 iter17: `selection` variable was never declared in this scope — block
       * orphaned from a refactor. Disabled (false &&) until U-WEDM-STEPREVIEW-SELECTION
       * either wires the selection prop OR removes this dead block. R12: visible loss
       * of feature, not silent skip. */}
      {false && (
        <Card>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
            Similar Past Jobs
            <InfoTip text="Searches job history for similar material/thickness/feature combinations. Parameters from best-performing past jobs can be applied with one click. Drift detection monitors prediction accuracy over time." />
          </h4>
          <div className="space-y-3">
            <p className="text-xs text-slate-500 py-3 text-center">
              No job history available yet. Complete jobs to build the learning database.
              After 5+ jobs, Bayesian parameter learning will narrow prediction confidence intervals.
            </p>
            {/* Drift detection placeholder */}
            <div className="p-2 rounded bg-slate-50 dark:bg-slate-800 text-xs">
              <span className="text-[10px] font-medium text-slate-400 uppercase block mb-1">Metric Drift Detection</span>
              <p className="text-slate-500">
                I-MR control chart monitoring will activate after 10+ completed jobs.
                Uses &plusmn;3&sigma; Shewhart limits (mR-bar/1.128) per AIAG SPC Manual.
                Western Electric Rules 1 &amp; 5 enabled.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Feasibility Error */}
      {feasibilityHook.error && (
        <StepErrorCard error={feasibilityHook.error} prefix="Feasibility check failed: " onRetry={feasibilityHook.retry} />
      )}
    </div>
  );
}
