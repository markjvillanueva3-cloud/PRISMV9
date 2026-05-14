import { useState } from "react";
import { Button, Input, Spinner, Badge } from "../ui";
import { Tabs, TabList, Tab, TabPanel } from "../ui/Tabs";
import { useToast } from "../ui/Toast";

interface AdvancedEnhancerProps {
  controller: string;
  gcode: string;
  onEnhanced: (gcode: string) => void;
}

interface EnhanceResult {
  gcode: string;
  enhancements_applied: string[];
  warnings: string[];
  estimated_time_savings_pct: number;
}

const API_BASE = "/api/v1/cam";

export default function AdvancedEnhancer({
  controller,
  gcode,
  onEnhanced,
}: AdvancedEnhancerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnhanceResult | null>(null);

  // Feature toggles
  const [hsm, setHsm] = useState(true);
  const [smoothingMode, setSmoothingMode] = useState<string>("finish");
  const [cornerTol, setCornerTol] = useState(0.05);
  const [adaptive, setAdaptive] = useState(false);
  const [optimalLoad, setOptimalLoad] = useState(25);
  const [chipThinning, setChipThinning] = useState(true);
  const [trochoidal, setTrochoidal] = useState(false);
  const [feedOpt, setFeedOpt] = useState(true);
  const [plungeFactor, setPlungeFactor] = useState(0.5);
  const [cornerSlowdown, setCornerSlowdown] = useState(true);
  const [toolMgmt, setToolMgmt] = useState(false);
  const [sisterTool, setSisterTool] = useState(true);
  const [toolLife, setToolLife] = useState(45);
  const [breakDetect, setBreakDetect] = useState("probe");
  const [inProcess, setInProcess] = useState(false);
  const [measureEvery, setMeasureEvery] = useState(5);
  const [autoCompensate, setAutoCompensate] = useState(true);
  const [spcLog, setSpcLog] = useState(true);

  const handleEnhance = async () => {
    if (!gcode.trim()) {
      toast("No G-code to enhance — write or generate code first", "warning");
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        action: "advanced_post_enhance",
        controller: controller || "fanuc",
        gcode,
      };

      if (hsm) {
        body.hsm = {
          smoothing_mode: smoothingMode,
          corner_rounding_tolerance: cornerTol,
          nurbs_interpolation: false,
          arc_fitting: false,
          arc_tolerance: 0.01,
          min_arc_radius: 0.5,
          max_arc_radius: 500,
        };
      }

      if (adaptive) {
        body.adaptive_clearing = {
          optimal_load: optimalLoad / 100,
          max_stepover: 3,
          min_stepover: 0.5,
          ramp_angle: 3,
          ramp_diameter_factor: 0.8,
          feed_on_engage: 300,
          feed_on_disengage: 800,
          use_trochoidal: trochoidal,
          chip_thinning_compensation: chipThinning,
        };
      }

      if (feedOpt) {
        body.feed_optimization = {
          chip_thinning: chipThinning,
          corner_slowdown: cornerSlowdown,
          corner_radius_threshold: 5,
          corner_feed_factor: 0.6,
          plunge_rate_factor: plungeFactor,
          retract_rapid: true,
        };
      }

      if (toolMgmt) {
        body.tool_management = {
          sister_tooling: sisterTool,
          max_tool_life_minutes: toolLife,
          break_detection: true,
          break_detection_method: breakDetect,
          wear_offset_increment: 0.005,
          auto_offset_update: true,
        };
      }

      if (inProcess) {
        body.in_process_measure = {
          measure_every_n_parts: measureEvery,
          critical_features: [],
          auto_compensate: autoCompensate,
          alarm_on_out_of_tolerance: true,
          spc_logging: spcLog,
        };
      }

      const res = await fetch(`${API_BASE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Enhancement failed");
      const data = (await res.json()) as EnhanceResult;
      setResult(data);
      onEnhanced(data.gcode);
      toast(
        `Enhanced! ${data.enhancements_applied.length} features, ~${data.estimated_time_savings_pct}% time savings`,
        "success",
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Enhancement failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Advanced Post Enhancer
        </h3>
        {result && (
          <Badge color="green">
            ~{result.estimated_time_savings_pct}% faster
          </Badge>
        )}
      </div>

      <Tabs defaultValue="hsm">
        <TabList className="text-xs">
          <Tab value="hsm">HSM</Tab>
          <Tab value="adaptive">Adaptive</Tab>
          <Tab value="feed">Feed</Tab>
          <Tab value="tool">Tool Mgmt</Tab>
          <Tab value="measure">Measure</Tab>
        </TabList>

        {/* HSM Tab */}
        <TabPanel value="hsm">
          <div className="space-y-2">
            <Toggle label="Enable HSM Smoothing" checked={hsm} onChange={setHsm} />
            {hsm && (
              <>
                <div>
                  <label className="text-xs text-slate-500">Mode</label>
                  <select
                    className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1
                      text-xs dark:border-slate-600 dark:bg-slate-800"
                    value={smoothingMode}
                    onChange={(e) => setSmoothingMode(e.target.value)}
                  >
                    <option value="rough">Rough</option>
                    <option value="finish">Finish</option>
                    <option value="ultra">Ultra-Finish</option>
                  </select>
                </div>
                <Input label="Corner Tolerance" type="number" unit="mm"
                  value={cornerTol}
                  onChange={(e) => setCornerTol(+e.target.value)} />
              </>
            )}
          </div>
        </TabPanel>

        {/* Adaptive Tab */}
        <TabPanel value="adaptive">
          <div className="space-y-2">
            <Toggle label="Adaptive Clearing" checked={adaptive}
              onChange={setAdaptive} />
            {adaptive && (
              <>
                <Input label="Optimal Load" type="number" unit="%"
                  value={optimalLoad}
                  onChange={(e) => setOptimalLoad(+e.target.value)} />
                <Toggle label="Chip Thinning Comp" checked={chipThinning}
                  onChange={setChipThinning} />
                <Toggle label="Trochoidal Slotting" checked={trochoidal}
                  onChange={setTrochoidal} />
              </>
            )}
          </div>
        </TabPanel>

        {/* Feed Tab */}
        <TabPanel value="feed">
          <div className="space-y-2">
            <Toggle label="Feed Optimization" checked={feedOpt}
              onChange={setFeedOpt} />
            {feedOpt && (
              <>
                <Input label="Plunge Factor" type="number"
                  value={plungeFactor}
                  onChange={(e) => setPlungeFactor(+e.target.value)} />
                <Toggle label="Corner Slowdown" checked={cornerSlowdown}
                  onChange={setCornerSlowdown} />
              </>
            )}
          </div>
        </TabPanel>

        {/* Tool Mgmt Tab */}
        <TabPanel value="tool">
          <div className="space-y-2">
            <Toggle label="Tool Management" checked={toolMgmt}
              onChange={setToolMgmt} />
            {toolMgmt && (
              <>
                <Toggle label="Sister Tooling" checked={sisterTool}
                  onChange={setSisterTool} />
                <Input label="Tool Life" type="number" unit="min"
                  value={toolLife}
                  onChange={(e) => setToolLife(+e.target.value)} />
                <div>
                  <label className="text-xs text-slate-500">Break Detection</label>
                  <select
                    className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1
                      text-xs dark:border-slate-600 dark:bg-slate-800"
                    value={breakDetect}
                    onChange={(e) => setBreakDetect(e.target.value)}
                  >
                    <option value="probe">Probe</option>
                    <option value="load_monitor">Load Monitor</option>
                    <option value="laser">Laser</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </TabPanel>

        {/* Measurement Tab */}
        <TabPanel value="measure">
          <div className="space-y-2">
            <Toggle label="In-Process Measurement" checked={inProcess}
              onChange={setInProcess} />
            {inProcess && (
              <>
                <Input label="Measure Every N Parts" type="number" unit="pcs"
                  value={measureEvery}
                  onChange={(e) => setMeasureEvery(+e.target.value)} />
                <Toggle label="Auto-Compensate" checked={autoCompensate}
                  onChange={setAutoCompensate} />
                <Toggle label="SPC Logging" checked={spcLog}
                  onChange={setSpcLog} />
              </>
            )}
          </div>
        </TabPanel>
      </Tabs>

      <Button onClick={handleEnhance} disabled={loading} className="w-full">
        {loading ? <Spinner size="sm" /> : "Enhance G-Code"}
      </Button>

      {result && result.warnings.length > 0 && (
        <div className="space-y-1">
          {result.warnings.map((w, i) => (
            <p key={i} className="rounded bg-yellow-50 px-2 py-1 text-xs
              text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">
              {w}
            </p>
          ))}
        </div>
      )}

      {result && (
        <div className="flex flex-wrap gap-1">
          {result.enhancements_applied.map((e) => (
            <Badge key={e} color="blue">
              {e.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2">
      <span className="text-xs text-slate-600 dark:text-slate-400">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full
          border-2 border-transparent transition-colors ${
          checked ? "bg-primary-600" : "bg-slate-200 dark:bg-slate-600"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full
            bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}
