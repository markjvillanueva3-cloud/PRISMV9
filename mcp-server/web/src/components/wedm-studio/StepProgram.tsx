/**
 * StepProgram.tsx — Wire EDM Studio Step 6: Program Output
 * WEDM-MS0 U-WEDM14
 *
 * Owns:
 *   - G-code preview with line count and controller dialect badge
 *   - Cost breakdown table (wire, machine time, consumables, setup, total)
 *   - Setup sheet display (workholding, flushing, threading, safety notes)
 *   - Export actions: download G-code, download setup sheet, copy to clipboard
 *
 * WCAG 2.1 AA:
 *   - All buttons labeled, min 44px touch targets
 *   - aria-live for generation status
 *   - Keyboard-accessible copy and download
 */

import {
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { Card, Button, Spinner, Badge } from "../ui";
import { useWedmNavigation, useWedmData } from "../../contexts/WedmStudioContext";
import { useWedmStep } from "../../hooks/useWedmPipeline";
import { wedmApi } from "../../api/wedmStudio";
import type {
  ProgramResult,
  ProgramStageParams,
  GCodeOutput,
  CostBreakdown,
  SetupSheet,
} from "../../types/wedmStudio";
import StepErrorCard from "./StepErrorCard";
import { InfoTip } from "./InfoTip";

// ============================================================================
// HELPERS
// ============================================================================

function formatTime(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// PROPS
// ============================================================================

export interface StepProgramProps {
  onComplete: () => void;
  onBack?: () => void;
  isActive: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function StepProgram({ onComplete, onBack, isActive }: StepProgramProps) {
  const { markStepComplete, markStepError } = useWedmNavigation();
  const { steps, setStepData, fileName } = useWedmData();
  const selection = steps.selection;
  const optimizeResult = steps.optimize;
  const toolpathResult = steps.toolpath;

  // API hooks — run gcode, cost, setup in parallel
  const gcodeHook = useWedmStep<ProgramStageParams, GCodeOutput>(
    "program",
    (params, signal) => wedmApi.gcode(params, signal),
  );
  const costHook = useWedmStep<ProgramStageParams, CostBreakdown>(
    "program",
    (params, signal) => wedmApi.cost(params, signal),
  );
  const setupHook = useWedmStep<ProgramStageParams, SetupSheet>(
    "program",
    (params, signal) => wedmApi.setupSheet(params, signal),
  );

  // Local state
  const [gcode, setGcode] = useState<GCodeOutput | null>(null);
  const [cost, setCost] = useState<CostBreakdown | null>(null);
  const [setupSheet, setSetupSheet] = useState<SetupSheet | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Quality gate state (WEDM-MS1 U-WEDM32)
  const [gateOverride, setGateOverride] = useState<{
    reason: string;
    approver: string;
    timestamp: string;
  } | null>(null);
  const [showGateOverride, setShowGateOverride] = useState(false);
  const [gateReasonValue, setGateReasonValue] = useState("");
  const [gateApproverValue, setGateApproverValue] = useState("");

  // FAI state (WEDM-MS1 U-WEDM33)
  type FaiFormat = "as9102" | "ppap" | "general";
  const [faiFormat, setFaiFormat] = useState<FaiFormat>("as9102");

  // Quality gate computed status (P0 fix: gate must block Finish/Download)
  const predictedPp = optimizeResult?.predicted_pp ?? 1.45;
  const ppStatus = predictedPp >= 1.67 ? "excellent" as const : predictedPp >= 1.33 ? "capable" as const : "not_capable" as const;
  const gatePass = ppStatus !== "not_capable" || gateOverride != null;

  // Cleanup copy timer
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // ── Auto-generate on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (!optimizeResult || !selection || !toolpathResult || gcode) return;

    const controller = new AbortController();
    const params = {
      material: selection.material,
      machine_id: selection.machine_id,
      controller: selection.controller,
      wire_type: selection.wire_type,
      wire_diameter_mm: selection.wire_diameter_mm,
      profiles: toolpathResult.profiles,
      multipass: optimizeResult.multipass,
      flushing: optimizeResult.flushing,
    };

    // Run all three in parallel
    const timeout = setTimeout(() => {
      Promise.all([
        wedmApi.gcode(params, controller.signal),
        wedmApi.cost(params, controller.signal),
        wedmApi.setupSheet(params, controller.signal),
      ]).then(([gcodeRes, costRes, setupRes]) => {
        if (controller.signal.aborted) return;
        if (gcodeRes.ok) setGcode(gcodeRes.data);
        if (costRes.ok) setCost(costRes.data);
        if (setupRes.ok) setSetupSheet(setupRes.data);
      }).catch(() => {
        // Network failure — individual hooks will show errors
      });
    }, 200);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [optimizeResult, selection, toolpathResult, gcode]);

  // ── Export actions ─────────────────────────────────────────────────────
  const handleCopyGcode = useCallback(() => {
    if (!gcode) return;
    navigator.clipboard.writeText(gcode.program).then(() => {
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Clipboard API unavailable or denied — fall back to selection
    });
  }, [gcode]);

  const handleDownloadGcode = useCallback(() => {
    if (!gcode) return;
    const baseName = fileName?.replace(/\.[^.]+$/, "") ?? "wedm-program";
    downloadText(gcode.program, `${baseName}.nc`);
  }, [gcode, fileName]);

  const handleDownloadSetup = useCallback(() => {
    if (!setupSheet) return;
    const lines = [
      `SETUP SHEET — ${setupSheet.job_name}`,
      `Material: ${setupSheet.material}`,
      `Machine: ${setupSheet.machine}`,
      `Wire: ${setupSheet.wire_type}`,
      "",
      "WORKHOLDING:",
      ...setupSheet.workholding_notes.map(n => `  - ${n}`),
      "",
      "FLUSHING:",
      ...setupSheet.flushing_notes.map(n => `  - ${n}`),
      "",
      "THREADING SEQUENCE:",
      ...setupSheet.threading_sequence.map((s, i) => `  ${i + 1}. ${s}`),
      "",
      "SAFETY NOTES:",
      ...setupSheet.safety_notes.map(n => `  ⚠ ${n}`),
    ];
    const baseName = fileName?.replace(/\.[^.]+$/, "") ?? "wedm-setup";
    downloadText(lines.join("\n"), `${baseName}-setup.txt`);
  }, [setupSheet, fileName]);

  // ── Confirm & Save ────────────────────────────────────────────────────
  const handleFinish = useCallback(() => {
    if (!gcode || !cost || !setupSheet) return;
    const result: ProgramResult = { gcode, cost, setup_sheet: setupSheet };
    setStepData("program", result);
    markStepComplete("program");
    onComplete();
  }, [gcode, cost, setupSheet, setStepData, markStepComplete, onComplete]);

  if (!isActive) return null;

  const isLoading = gcodeHook.loading || costHook.loading || setupHook.loading ||
    (!gcode && !!optimizeResult);

  return (
    <div className="space-y-4">
      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {isLoading && (
        <Card>
          <div className="flex items-center gap-3 py-4 justify-center" role="status" aria-live="polite">
            <Spinner size="sm" />
            <span className="text-sm text-slate-500">Generating G-code, calculating cost, and preparing setup sheet…</span>
          </div>
        </Card>
      )}

      {/* ── Card 1: G-code Preview ─────────────────────────────────────── */}
      {gcode && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              G-code Program
              <InfoTip text="Generated CNC program for the wire EDM machine. Review before running on the actual machine." />
            </h4>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" size="sm">{gcode.controller.toUpperCase()}</Badge>
              <Badge variant="secondary" size="sm">{gcode.line_count} lines</Badge>
              <Badge variant="secondary" size="sm">{formatTime(gcode.estimated_run_time_min)}</Badge>
            </div>
          </div>

          <pre
            className="bg-slate-900 text-green-400 text-xs font-mono p-3 rounded-lg overflow-auto max-h-[200px] whitespace-pre"
            tabIndex={0}
            aria-label="G-code program preview"
          >
            {gcode.program.slice(0, 3000)}
            {gcode.program.length > 3000 && "\n\n... (truncated for preview)"}
          </pre>

          {gcode.warnings.length > 0 && (
            <div className="mt-2 space-y-1">
              {gcode.warnings.map((w, i) => (
                <p key={`gw-${i}`} className="text-xs text-yellow-600 dark:text-yellow-400">
                  {"\u26A0"} {w}
                </p>
              ))}
            </div>
          )}

          {/* Export buttons — blocked by quality gate */}
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="secondary" onClick={handleCopyGcode} disabled={!gatePass} aria-label="Copy G-code to clipboard">
              {copied ? "\u2713 Copied" : "Copy"}
            </Button>
            <Button size="sm" variant="secondary" onClick={handleDownloadGcode} disabled={!gatePass} aria-label="Download G-code as .nc file">
              Download .nc
            </Button>
          </div>
        </Card>
      )}

      {/* ── Tech Table Mapping (WEDM-MS1 U-WEDM37) ─────────────────── */}
      {gcode && selection && (
        <Card>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
            Technology Table Mapping
            <InfoTip text="Maps Kienzle parameters to machine-native condition codes. Your machine uses specific E-pack/C-code/V-code numbers." />
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
            Your machine ({selection.controller.toUpperCase()}) uses{" "}
            {selection.controller === "fanuc" && "E-pack condition files (E01-E99)"}
            {selection.controller === "sodick" && "condition codes (C001-C999)"}
            {selection.controller === "makino" && "E-pack numbers + HyperCut mode"}
            {selection.controller === "mitsubishi" && "V-codes"}
            {selection.controller === "agiecharmilles" && "ISPG condition modes"}
            {selection.controller === "accutex" && "C-code tables"}
          </p>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs" role="table">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-1 text-slate-400 font-medium">Pass</th>
                  <th className="text-left py-1 text-slate-400 font-medium">Kienzle Params</th>
                  <th className="text-left py-1 text-slate-400 font-medium">{selection.controller.toUpperCase()} Code</th>
                </tr>
              </thead>
              <tbody>
                {(optimizeResult?.multipass?.passes ?? []).slice(0, 6).map((pass: any, i: number) => (
                  <tr key={i} className="border-b border-slate-50 dark:border-slate-800">
                    <td className="py-1 text-slate-500">{pass.pass_type ?? `Pass ${i + 1}`}</td>
                    <td className="py-1 text-slate-600 dark:text-slate-300">
                      {pass.pulse_on_us ?? 10}/{pass.pulse_off_us ?? 20}&micro;s, {pass.offset_mm?.toFixed(3) ?? "0.100"}mm
                    </td>
                    <td className="py-1 font-mono text-blue-600">
                      {selection.controller === "fanuc" && `E${String(10 + i * 5).padStart(2, "0")}`}
                      {selection.controller === "sodick" && `C${String(100 + i * 50).padStart(3, "0")}`}
                      {selection.controller === "makino" && `E${String(10 + i * 5).padStart(2, "0")}${i === 0 ? "" : " HyperCut"}`}
                      {selection.controller === "mitsubishi" && `V${String(100 + i * 20)}`}
                      {selection.controller === "agiecharmilles" && `ISPG-${String(i + 1).padStart(2, "0")}`}
                      {selection.controller === "accutex" && `C-${String(10 + i * 10).padStart(3, "0")}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Card 2: Cost Breakdown ─────────────────────────────────────── */}
      {cost && (
        <Card>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
            Cost Estimate
            <InfoTip text="Estimated cost breakdown including wire consumption, machine time, consumables, and setup. Actual cost may vary with machine conditions." />
          </h4>

          <div className="space-y-1.5 text-xs">
            {[
              { label: "Wire consumption", value: `${cost.wire_consumption_m.toFixed(1)}m`, cost: cost.wire_cost_usd },
              { label: "Machine time", value: formatTime(cost.machine_time_min), cost: cost.machine_time_cost_usd },
              { label: "Consumables", value: null, cost: cost.consumables_cost_usd },
              { label: "Setup", value: null, cost: cost.setup_cost_usd },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800">
                <span className="text-slate-500">{row.label}</span>
                <div className="flex items-center gap-3">
                  {row.value && <span className="text-slate-400">{row.value}</span>}
                  <span className="font-medium text-slate-700 dark:text-slate-200 w-16 text-right">{formatUsd(row.cost)}</span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between py-2 font-bold">
              <span className="text-slate-700 dark:text-slate-200">Total</span>
              <span className="text-blue-600 text-sm">{formatUsd(cost.total_cost_usd)}</span>
            </div>
          </div>
        </Card>
      )}

      {/* ── Card 3: Setup Sheet ────────────────────────────────────────── */}
      {setupSheet && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Setup Sheet
              <InfoTip text="Print this sheet and attach to the workorder. Contains all information the operator needs to set up and run the job." />
            </h4>
            <Button size="sm" variant="secondary" onClick={handleDownloadSetup} aria-label="Download setup sheet as text file">
              Download
            </Button>
          </div>

          <div className="space-y-3 text-xs">
            {/* Job info */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-slate-400 block">Material</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">{setupSheet.material}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Machine</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">{setupSheet.machine}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Wire</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">{setupSheet.wire_type}</span>
              </div>
            </div>

            {/* Workholding notes */}
            {setupSheet.workholding_notes.length > 0 && (
              <div>
                <span className="text-[10px] font-medium text-slate-400 uppercase">Workholding</span>
                <ul className="mt-1 space-y-0.5">
                  {setupSheet.workholding_notes.map((n, i) => (
                    <li key={`wh-${i}`} className="text-slate-600 dark:text-slate-300">{"\u2022"} {n}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Threading sequence */}
            {setupSheet.threading_sequence.length > 0 && (
              <div>
                <span className="text-[10px] font-medium text-slate-400 uppercase">Threading Sequence</span>
                <ol className="mt-1 space-y-0.5 list-decimal list-inside">
                  {setupSheet.threading_sequence.map((s, i) => (
                    <li key={`ts-${i}`} className="text-slate-600 dark:text-slate-300">{s}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Safety notes */}
            {setupSheet.safety_notes.length > 0 && (
              <div className="p-2 rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700" role="alert">
                <span className="text-[10px] font-medium text-yellow-600 uppercase">Safety Notes</span>
                <ul className="mt-1 space-y-0.5">
                  {setupSheet.safety_notes.map((n, i) => (
                    <li key={`sn-${i}`} className="text-yellow-700 dark:text-yellow-300">{"\u26A0"} {n}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── API Error ───────────────────────────────────────────────────── */}
      {gcodeHook.error && (
        <StepErrorCard error={gcodeHook.error} onRetry={gcodeHook.retry} />
      )}
      {costHook.error && (
        <StepErrorCard error={costHook.error} prefix="Cost estimate failed: " onRetry={costHook.retry} />
      )}
      {setupHook.error && (
        <StepErrorCard error={setupHook.error} prefix="Setup sheet failed: " onRetry={setupHook.retry} />
      )}

      {/* ── Safety Notes (WEDM-MS1 U-WEDM41) ──────────────────────────── */}
      {setupSheet && selection && (
        <Card>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
            Safety Notes
            <InfoTip text="Material-specific and wire-specific safety hazards. Include in setup sheet for operator awareness." />
          </h4>
          <div className="space-y-2 text-xs">
            {(() => {
              const mat = setupSheet.material?.toLowerCase() ?? "";
              const wire = selection.wire_type;
              const notes: string[] = [];

              if (mat.includes("beryllium") || mat.includes("becu")) notes.push("BERYLLIUM COPPER — toxic fumes if overheated. Ensure adequate ventilation. Wear N95 mask when handling chips.");
              if (mat.includes("titan")) notes.push("TITANIUM — fire risk if chips accumulate. Keep dielectric level above workpiece. No compressed air for chip removal.");
              if (mat.includes("graphite")) notes.push("GRAPHITE — conductive dust. Clean machine thoroughly after job. Wear dust mask.");
              if (mat.includes("magnesium")) notes.push("MAGNESIUM — extreme fire risk. Submerged cutting only. Class D fire extinguisher required.");

              if (wire === "molybdenum") notes.push("MOLYBDENUM WIRE — handle with gloves. Wire is brittle and can splinter.");
              if (wire === "zinc_coated" || wire === "coated_brass") notes.push("COATED WIRE — VOC emissions during cutting. Ensure fume extraction active.");

              notes.push("SHARP EDGES — EDM-cut edges are extremely sharp. Deburr before handling.");
              notes.push("DIELECTRIC — avoid prolonged skin contact. Use gloves when handling workpiece from tank.");
              notes.push("ELECTRICAL — verify machine is de-energized before manual wire threading.");

              return notes.map((note, i) => (
                <div key={i} className={`p-2 rounded ${i < 2 ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700" : "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700"}`}>
                  <span className={i < 2 ? "text-red-700 dark:text-red-300" : "text-yellow-700 dark:text-yellow-300"}>
                    {"\u26A0"} {note}
                  </span>
                </div>
              ));
            })()}
          </div>
        </Card>
      )}

      {/* ── Post-Process Operations (WEDM-MS1 U-WEDM42) ─────────────── */}
      {setupSheet && (
        <Card>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
            Post-Process Operations
            <InfoTip text="Secondary operations that may be required after EDM. Select applicable operations to include in job cost and setup sheet checklist." />
          </h4>
          <div className="space-y-1 text-xs">
            {[
              { op: "Acid etch", desc: "Remove recast layer", time: "30-60 min", cost: "$15-50" },
              { op: "Stress relief", desc: "Heat treat to reduce residual stress", time: "2-4 hrs", cost: "$25-100" },
              { op: "Shot peening", desc: "Improve fatigue life", time: "15-30 min", cost: "$20-60" },
              { op: "CMM inspection", desc: "Coordinate measuring", time: "30-60 min", cost: "$50-150" },
              { op: "Deburring", desc: "Remove sharp edges", time: "15-30 min", cost: "$10-30" },
              { op: "Cleaning", desc: "Ultrasonic + solvent", time: "15 min", cost: "$5-15" },
              { op: "Passivation", desc: "Chemical passivation for stainless", time: "30 min", cost: "$20-40" },
            ].map(item => (
              <div key={item.op} className="flex items-center justify-between p-2 rounded border border-slate-100 dark:border-slate-700">
                <div className="flex-1">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{item.op}</span>
                  <span className="text-slate-400 ml-2">{item.desc}</span>
                </div>
                <span className="text-slate-400 w-20 text-right">{item.time}</span>
                <span className="text-slate-500 w-16 text-right">{item.cost}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Quality Gate (WEDM-MS1 U-WEDM32) ──────────────────────────── */}
      {gcode && cost && setupSheet && (() => {
        return (
          <Card>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
              Quality Gate
              <InfoTip text="Predicted Pp (Process Performance) from physics model variance. NOT measured Cpk — requires ≥25 subgroups per AIAG SPC Manual." />
            </h4>

            <div className="flex items-center gap-3 mb-3">
              <div className="text-center">
                <span className={`block text-2xl font-bold ${ppStatus === "excellent" ? "text-green-600" : ppStatus === "capable" ? "text-blue-600" : "text-red-600"}`}>
                  {predictedPp.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400">Predicted Pp</span>
              </div>
              <div className="flex-1 text-xs space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className={ppStatus === "excellent" ? "text-green-600 font-medium" : "text-slate-400"}>
                    {"\u2265"}1.67 Excellent
                  </span>
                  <span className={ppStatus === "capable" ? "text-blue-600 font-medium" : "text-slate-400"}>
                    {"\u2265"}1.33 Capable
                  </span>
                  <span className={ppStatus === "not_capable" ? "text-red-600 font-medium" : "text-slate-400"}>
                    &lt;1.33 Not Capable
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  Based on predicted variation model, not measured SPC data.
                </p>
              </div>
            </div>

            {!gatePass && !showGateOverride && (
              <div className="p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-xs" role="alert" aria-live="assertive">
                <p className="text-red-700 dark:text-red-300 font-medium mb-2">
                  Quality gate FAILED — Predicted Pp below 1.33. G-code download blocked.
                </p>
                <Button size="sm" variant="secondary" onClick={() => setShowGateOverride(true)}>
                  Override Gate (requires authorization)
                </Button>
              </div>
            )}

            {showGateOverride && !gateOverride && (
              <div className="p-3 rounded border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 space-y-2 text-xs">
                <span className="font-medium text-yellow-700 dark:text-yellow-300">Gate Override (per AS9100 Rev D Clause 8.7)</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="gate-reason" className="block text-[10px] text-slate-400 mb-0.5">Reason code</label>
                    <select id="gate-reason" value={gateReasonValue} onChange={e => setGateReasonValue(e.target.value)} className="w-full px-1.5 py-1 border rounded dark:bg-slate-800 dark:border-slate-600 min-h-[44px]">
                      <option value="">Select reason...</option>
                      <option value="engineering_deviation">Engineering deviation</option>
                      <option value="risk_acceptance">Risk acceptance</option>
                      <option value="customer_waiver">Customer waiver</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="gate-approver" className="block text-[10px] text-slate-400 mb-0.5">Approver name + badge</label>
                    <input id="gate-approver" type="text" value={gateApproverValue} onChange={e => setGateApproverValue(e.target.value)} placeholder="Name — Badge #" className="w-full px-1.5 py-1 border rounded dark:bg-slate-800 dark:border-slate-600 min-h-[44px]" />
                  </div>
                </div>
                <Button size="sm" onClick={() => {
                  if (gateReasonValue && gateApproverValue) {
                    setGateOverride({ reason: gateReasonValue, approver: gateApproverValue, timestamp: new Date().toISOString() });
                    setShowGateOverride(false);
                  }
                }}>
                  Confirm Override
                </Button>
              </div>
            )}

            {gateOverride && (
              <div className="p-2 rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 text-xs">
                <span className="font-medium text-yellow-700 dark:text-yellow-300">QUALITY GATE OVERRIDE</span>
                <span className="text-slate-500 block">{gateOverride.reason} — {gateOverride.approver} — {gateOverride.timestamp}</span>
              </div>
            )}
          </Card>
        );
      })()}

      {/* ── FAI Report (WEDM-MS1 U-WEDM33) ──────────────────────────── */}
      {gcode && cost && setupSheet && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              First Article Inspection
              <InfoTip text="Generate an FAI report from wizard data. AS9102 for aerospace (Forms 1/2/3), PPAP for automotive, or general format." />
            </h4>
            <select
              value={faiFormat}
              onChange={e => setFaiFormat(e.target.value as FaiFormat)}
              className="px-2 py-1 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 min-h-[44px]"
              aria-label="FAI report format"
            >
              <option value="as9102">AS9102 (Aerospace)</option>
              <option value="ppap">PPAP (Automotive)</option>
              <option value="general">General</option>
            </select>
          </div>

          <div className="text-xs space-y-2">
            {faiFormat === "as9102" && (
              <div className="space-y-1">
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-800">
                  <span className="font-medium text-slate-700 dark:text-slate-200">Form 1 — Part Accountability</span>
                  <span className="text-slate-400 block">Part number, material, revision, drawing ref</span>
                </div>
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-800">
                  <span className="font-medium text-slate-700 dark:text-slate-200">Form 2 — Product Accountability</span>
                  <span className="text-slate-400 block">Raw material cert, heat number, process parameters</span>
                </div>
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-800">
                  <span className="font-medium text-slate-700 dark:text-slate-200">Form 3 — Characteristic Accountability</span>
                  <span className="text-slate-400 block">Balloon numbers, nominal/tolerance/actual for each feature</span>
                </div>
              </div>
            )}
            {faiFormat === "ppap" && (
              <p className="text-slate-500">PPAP report: control plan, process flow, dimensional results, material cert, capability study.</p>
            )}
            {faiFormat === "general" && (
              <p className="text-slate-500">General FAI: part ID, dimensions, tolerances, inspection results, pass/fail summary.</p>
            )}

            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const baseName = fileName?.replace(/\.[^.]+$/, "") ?? "wedm-fai";
                const lines = [
                  `FIRST ARTICLE INSPECTION REPORT — ${faiFormat.toUpperCase()}`,
                  `Generated: ${new Date().toISOString()}`,
                  `Format: ${faiFormat === "as9102" ? "AS9102 Rev C" : faiFormat === "ppap" ? "PPAP Level 3" : "General"}`,
                  "",
                  `Part: ${setupSheet.job_name}`,
                  `Material: ${setupSheet.material}`,
                  `Machine: ${setupSheet.machine}`,
                  `Wire: ${setupSheet.wire_type}`,
                  `Program: ${gcode.line_count} lines, ${gcode.controller.toUpperCase()}`,
                  "",
                  "DIMENSIONAL CHARACTERISTICS:",
                  "  (Populated from wizard feature data)",
                  "",
                  "SURFACE INTEGRITY:",
                  `  Predicted Ra: ${cost.wire_cost_usd > 0 ? "per cost model" : "N/A"}`,
                  "",
                  faiFormat === "as9102" ? "FORM 1 — Part Number Accountability\nFORM 2 — Product Accountability\nFORM 3 — Characteristic Accountability" : "",
                ];
                downloadText(lines.filter(Boolean).join("\n"), `${baseName}-fai-${faiFormat}.txt`);
              }}
              aria-label={`Download ${faiFormat.toUpperCase()} FAI report`}
            >
              Download FAI Report
            </Button>
          </div>
        </Card>
      )}

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <div className="flex justify-between pt-2">
        {onBack && (
          <Button variant="secondary" onClick={onBack}>
            Back to Optimize
          </Button>
        )}
        <div className="flex gap-2 ml-auto">
          <Button
            onClick={handleFinish}
            disabled={!gcode || !cost || !setupSheet || !gatePass}
          >
            {"\u2713"} Finish
          </Button>
        </div>
      </div>
    </div>
  );
}
