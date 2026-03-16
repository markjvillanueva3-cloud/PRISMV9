import { useState, useCallback } from "react";
import { Button, Card, Spinner, Badge, Tabs, TabList, Tab, TabPanel } from "../components/ui";
import { useSpeedFeedOrchestrate, useSpeedFeedOptimize } from "../hooks/useSpeedFeed";
import type { OrchestratorInput, OrchestratorResult, OptimizeResult } from "../types/speedfeed";

const MACHINES = [
  "Haas VF-2", "Haas VF-4", "Haas VF-6", "Haas MiniMill", "Haas DM-2",
  "Haas ST-10", "Haas ST-20", "Haas ST-30", "Haas UO-1",
  "DMG Mori DMU 50", "DMG Mori DMC 850 V", "DMG Mori DMF 260", "DMG Mori NLX 2500",
  "Mazak Variaxis i-300", "Mazak Variaxis i-700", "Mazak Quick Turn 250", "Mazak Integrex i-200",
  "Okuma Genos M560-V", "Okuma MU-5000V", "Okuma LB3000 EX",
  "Fanuc Robodrill", "Makino A51NX", "Makino D500",
  "Brother Speedio R650X2", "Hermle C 400", "Hermle C 650",
  "Hurco VMX42i", "Doosan DNM 500", "Doosan Puma 2600",
  "Matsuura MX-520", "Grob G350", "Kern Micro HD",
];

const CAM_SYSTEMS = [
  "Mastercam", "Fusion360", "hyperMILL", "SolidCAM", "NX CAM",
  "ESPRIT", "GibbsCAM", "Edgecam", "PowerMill", "CATIA",
  "BobCAD", "CAMWorks", "TopSolid", "WorkNC", "Cimatron",
  "Tebis", "SprutCAM",
];

const STRATEGIES = [
  { value: "conventional", label: "Conventional" },
  { value: "adaptive", label: "Adaptive / Dynamic" },
  { value: "trochoidal", label: "Trochoidal" },
  { value: "hsm", label: "High Speed Machining" },
  { value: "hpc", label: "High Performance Cutting" },
  { value: "plunge", label: "Plunge Roughing" },
  { value: "slot", label: "Full Slot" },
];

type Mode = "quick" | "full" | "optimize";

export default function SpeedFeedPage() {
  const [input, setInput] = useState<OrchestratorInput>({
    material: "steel",
    tool_diameter_mm: 12,
    flutes: 4,
    operation: "milling",
    cut_type: "roughing",
    strategy: "conventional",
    coolant_type: "flood",
  });
  const [mode, setMode] = useState<Mode>("quick");
  const calc = useSpeedFeedOrchestrate();
  const opt = useSpeedFeedOptimize();

  const result = calc.data as { result: { value: OrchestratorResult } } | null;
  const optResult = opt.data as { result: { value: OptimizeResult } } | null;

  const update = useCallback((field: string, value: unknown) => {
    setInput(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleCalculate = useCallback(() => {
    if (mode === "optimize") {
      opt.execute(input);
    } else {
      calc.execute({ ...input, output_detail: mode === "full" ? "full" : "minimal" });
    }
  }, [input, mode, calc, opt]);

  const r = result?.result?.value;
  const o = optResult?.result?.value;
  const loading = calc.loading || opt.loading;
  const error = calc.error || opt.error;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      {/* ── LEFT: Input Panel ── */}
      <div className="space-y-3">
        <Card>
          <h2 className="text-lg font-bold mb-3">Speed/Feed Orchestrator</h2>

          {/* Mode selector */}
          <div className="flex gap-1 mb-3">
            {(["quick", "full", "optimize"] as Mode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                  mode === m ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}>
                {m === "quick" ? "Quick" : m === "full" ? "Full Analysis" : "Pareto Optimize"}
              </button>
            ))}
          </div>

          {/* Material */}
          <label className="block text-xs font-medium text-slate-500 mb-1">Material</label>
          <input type="text" value={input.material ?? ""} onChange={e => update("material", e.target.value)}
            className="w-full px-2 py-1.5 text-sm border rounded mb-2" placeholder="e.g. Ti-6Al-4V, 4140, aluminum" />

          {/* Machine */}
          <label className="block text-xs font-medium text-slate-500 mb-1">Machine</label>
          <select value={input.machine_name ?? ""} onChange={e => update("machine_name", e.target.value || undefined)}
            className="w-full px-2 py-1.5 text-sm border rounded mb-2">
            <option value="">Auto (generic)</option>
            {MACHINES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          {/* Tool */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Diameter (mm)</label>
              <input type="number" value={input.tool_diameter_mm ?? ""} onChange={e => update("tool_diameter_mm", +e.target.value)}
                className="w-full px-2 py-1.5 text-sm border rounded" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Flutes</label>
              <input type="number" value={input.flutes ?? ""} onChange={e => update("flutes", +e.target.value)}
                className="w-full px-2 py-1.5 text-sm border rounded" />
            </div>
          </div>

          {/* Operation + Strategy */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Operation</label>
              <select value={input.operation ?? "milling"} onChange={e => update("operation", e.target.value)}
                className="w-full px-2 py-1.5 text-sm border rounded">
                <option value="milling">Milling</option>
                <option value="turning">Turning</option>
                <option value="drilling">Drilling</option>
                <option value="tapping">Tapping</option>
                <option value="boring">Boring</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Cut Type</label>
              <select value={input.cut_type ?? "roughing"} onChange={e => update("cut_type", e.target.value)}
                className="w-full px-2 py-1.5 text-sm border rounded">
                <option value="roughing">Roughing</option>
                <option value="semi_finishing">Semi-Finish</option>
                <option value="finishing">Finishing</option>
              </select>
            </div>
          </div>

          {/* Strategy */}
          <label className="block text-xs font-medium text-slate-500 mb-1">Strategy</label>
          <select value={input.strategy ?? "conventional"} onChange={e => update("strategy", e.target.value)}
            className="w-full px-2 py-1.5 text-sm border rounded mb-2">
            {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          {/* CAM System */}
          <label className="block text-xs font-medium text-slate-500 mb-1">CAM Software</label>
          <select value={input.cam_system ?? ""} onChange={e => update("cam_system", e.target.value || undefined)}
            className="w-full px-2 py-1.5 text-sm border rounded mb-2">
            <option value="">None / Generic</option>
            {CAM_SYSTEMS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Advanced toggles */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Coating</label>
              <select value={input.tool_coating ?? "TiAlN"} onChange={e => update("tool_coating", e.target.value)}
                className="w-full px-2 py-1.5 text-sm border rounded">
                <option value="TiAlN">TiAlN</option>
                <option value="AlTiN">AlTiN</option>
                <option value="TiN">TiN</option>
                <option value="AlCrN">AlCrN</option>
                <option value="DLC">DLC</option>
                <option value="uncoated">Uncoated</option>
                <option value="diamond">Diamond</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Coolant</label>
              <select value={input.coolant_type ?? "flood"} onChange={e => update("coolant_type", e.target.value)}
                className="w-full px-2 py-1.5 text-sm border rounded">
                <option value="flood">Flood</option>
                <option value="mist">Mist</option>
                <option value="MQL">MQL</option>
                <option value="dry">Dry</option>
                <option value="cryogenic">Cryogenic</option>
                <option value="through_tool">Through Tool</option>
              </select>
            </div>
          </div>

          {/* Holder */}
          <label className="block text-xs font-medium text-slate-500 mb-1">Holder Type</label>
          <select value={input.holder_type ?? "ER_collet"} onChange={e => update("holder_type", e.target.value)}
            className="w-full px-2 py-1.5 text-sm border rounded mb-3">
            <option value="shrink_fit">Shrink Fit</option>
            <option value="hydraulic">Hydraulic</option>
            <option value="ER_collet">ER Collet</option>
            <option value="Weldon">Weldon</option>
            <option value="milling_chuck">Milling Chuck</option>
          </select>

          <Button onClick={handleCalculate} disabled={loading} className="w-full">
            {loading ? <><Spinner size="sm" /> Calculating...</> : mode === "optimize" ? "Run MOPSO Optimization" : "Calculate"}
          </Button>

          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </Card>
      </div>

      {/* ── CENTER + RIGHT: Results ── */}
      <div className="lg:col-span-2 space-y-3">
        {r && mode !== "optimize" && (
          <>
            {/* Primary Results */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">Results</h3>
                <div className="flex items-center gap-2">
                  <Badge color={r.overall_confidence > 0.6 ? "green" : r.overall_confidence > 0.3 ? "yellow" : "red"}>
                    Confidence: {(r.overall_confidence * 100).toFixed(0)}%
                  </Badge>
                  <Badge color={r.stability_assessment.zone === "stable" ? "green" : r.stability_assessment.zone === "marginal" ? "yellow" : "red"}>
                    {r.stability_assessment.zone}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="bg-blue-50 rounded p-2">
                  <div className="text-2xl font-bold text-blue-700">{r.spindle_rpm}</div>
                  <div className="text-xs text-slate-500">RPM</div>
                </div>
                <div className="bg-green-50 rounded p-2">
                  <div className="text-2xl font-bold text-green-700">{r.feed_rate_mmmin.toFixed(0)}</div>
                  <div className="text-xs text-slate-500">Feed (mm/min)</div>
                </div>
                <div className="bg-purple-50 rounded p-2">
                  <div className="text-2xl font-bold text-purple-700">{r.cutting_speed_mpm.toFixed(1)}</div>
                  <div className="text-xs text-slate-500">Vc (m/min)</div>
                </div>
                <div className="bg-amber-50 rounded p-2">
                  <div className="text-2xl font-bold text-amber-700">{r.mrr_cm3min.toFixed(1)}</div>
                  <div className="text-xs text-slate-500">MRR (cm³/min)</div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 text-center mt-2">
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-lg font-semibold">{r.feed_per_tooth_mm.toFixed(4)}</div>
                  <div className="text-xs text-slate-500">fz (mm)</div>
                </div>
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-lg font-semibold">{r.power_kw.toFixed(1)}</div>
                  <div className="text-xs text-slate-500">Power (kW)</div>
                </div>
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-lg font-semibold">{r.tool_life_min.toFixed(0)}</div>
                  <div className="text-xs text-slate-500">Tool Life (min)</div>
                </div>
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-lg font-semibold">{r.surface_finish_Ra_um.toFixed(2)}</div>
                  <div className="text-xs text-slate-500">Ra (µm)</div>
                </div>
              </div>
            </Card>

            {/* Tabs: Stability / Safety / Playbook / Uncertainty */}
            <Card>
              <Tabs defaultValue="stability">
                <TabList>
                  <Tab value="stability">Stability</Tab>
                  <Tab value="safety">Safety ({r.safety_checks.length})</Tab>
                  <Tab value="playbook">Playbook ({r.playbook_warnings.length})</Tab>
                  <Tab value="uncertainty">Uncertainty</Tab>
                  <Tab value="alternatives">Alternatives</Tab>
                </TabList>

                <TabPanel value="stability">
                  <div className="p-3 text-sm">
                    <p className="font-medium mb-2">{r.stability_assessment.message}</p>
                    <div className="text-xs text-slate-500">
                      P(chatter) = {(r.stability_assessment.p_chatter * 100).toFixed(1)}%
                      {r.stability_assessment.suggested_rpm_pocket && (
                        <span className="ml-2 text-blue-600">
                          Suggested stable pocket: {r.stability_assessment.suggested_rpm_pocket} RPM (lobe {r.stability_assessment.lobe_index})
                        </span>
                      )}
                    </div>
                  </div>
                </TabPanel>

                <TabPanel value="safety">
                  <div className="p-3 space-y-1">
                    {r.safety_checks.map((sc, i) => (
                      <div key={i} className={`text-xs px-2 py-1 rounded flex items-center gap-2 ${sc.passed ? "bg-green-50" : "bg-red-50"}`}>
                        <span>{sc.passed ? "✓" : "✗"}</span>
                        <span className="font-medium">{sc.name}</span>
                        <span className="text-slate-500">{sc.message}</span>
                      </div>
                    ))}
                  </div>
                </TabPanel>

                <TabPanel value="playbook">
                  <div className="p-3 space-y-1">
                    {r.playbook_warnings.map((w, i) => (
                      <div key={i} className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-800">{w}</div>
                    ))}
                    {r.playbook_warnings.length === 0 && <p className="text-xs text-slate-400">No warnings for this setup.</p>}
                  </div>
                </TabPanel>

                <TabPanel value="uncertainty">
                  <div className="p-3 text-xs space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>Force CI95: [{r.uncertainty.force_ci95[0].toFixed(0)}, {r.uncertainty.force_ci95[1].toFixed(0)}] N</div>
                      <div>Life CI95: [{r.uncertainty.life_ci95[0].toFixed(1)}, {r.uncertainty.life_ci95[1].toFixed(1)}] min</div>
                      <div>Ra CI95: [{r.uncertainty.ra_ci95[0].toFixed(3)}, {r.uncertainty.ra_ci95[1].toFixed(3)}] µm</div>
                      <div>Ra Cpk: {r.uncertainty.ra_cpk?.toFixed(2) ?? "N/A"}</div>
                    </div>
                    {r.uncertainty.weibull && (
                      <div className="mt-2 bg-slate-50 rounded p-2">
                        <span className="font-medium">Weibull: </span>
                        β={r.uncertainty.weibull.beta}, η={r.uncertainty.weibull.eta_min} min,
                        P(survive 30min)={(r.uncertainty.weibull.p_survive_30min * 100).toFixed(1)}%
                      </div>
                    )}
                    <div className="mt-2">
                      <span className="font-medium">Sobol: </span>
                      kc={r.uncertainty.sobol_contributions.kc_pct}%,
                      life={r.uncertainty.sobol_contributions.life_pct}%,
                      Ra={r.uncertainty.sobol_contributions.ra_pct}%
                    </div>
                    <div className="mt-1 text-blue-600">{r.uncertainty.suggested_measurement}</div>
                  </div>
                </TabPanel>

                <TabPanel value="alternatives">
                  <div className="p-3">
                    <table className="w-full text-xs">
                      <thead><tr className="text-left text-slate-500">
                        <th className="pb-1">Mode</th><th>Vc</th><th>Feed</th><th>MRR</th><th>Life</th>
                      </tr></thead>
                      <tbody>
                        {r.alternatives.map((a, i) => (
                          <tr key={i} className="border-t">
                            <td className="py-1 font-medium">{a.label}</td>
                            <td>{a.cutting_speed_mpm.toFixed(1)}</td>
                            <td>{a.feed_rate_mmmin.toFixed(0)}</td>
                            <td>{a.mrr_cm3min.toFixed(1)}</td>
                            <td>{a.tool_life_min.toFixed(0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabPanel>
              </Tabs>
            </Card>

            {/* Limiting Factors + Formulas */}
            <Card>
              <h4 className="text-sm font-bold mb-2">Limiting Factors</h4>
              <div className="space-y-1">
                {r.limiting_factors.map((lf, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <Badge color={lf.severity === "critical" ? "red" : lf.severity === "warning" ? "yellow" : "slate"}>
                      {lf.utilization_pct.toFixed(0)}%
                    </Badge>
                    <span className="font-medium">{lf.parameter}</span>
                    <span className="text-slate-500">{lf.constraint}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-slate-400">
                Formulas: {r.formulas_used.join(", ")}
              </div>
            </Card>
          </>
        )}

        {/* Pareto Optimization Results */}
        {o && mode === "optimize" && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">MOPSO Pareto Front</h3>
              <Badge color="slate">{o.method} | {o.particles}p × {o.iterations}iter | {o.archive_size} solutions</Badge>
            </div>
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-500 border-b">
                <th className="pb-1 pr-2">Solution</th>
                <th>Vc (m/min)</th><th>fz (mm)</th><th>ap (mm)</th>
                <th>MRR</th><th>Life (min)</th><th>Ra (µm)</th>
              </tr></thead>
              <tbody>
                {o.pareto_front.map((s, i) => (
                  <tr key={i} className={`border-t ${s.label === o.recommended ? "bg-blue-50 font-medium" : ""}`}>
                    <td className="py-1">
                      {s.label}
                      {s.label === o.best_mrr && <Badge color="green" >MRR</Badge>}
                      {s.label === o.best_tool_life && <Badge color="yellow" >Life</Badge>}
                      {s.label === o.best_finish && <Badge color="slate" >Ra</Badge>}
                    </td>
                    <td>{s.vc_mpm}</td><td>{s.fz_mm}</td><td>{s.ap_mm}</td>
                    <td>{s.mrr_cm3min}</td><td>{s.tool_life_min}</td><td>{s.ra_um}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-blue-600">Recommended: {o.recommended}</p>
          </Card>
        )}

        {!r && !o && !loading && (
          <Card>
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg mb-2">Select parameters and click Calculate</p>
              <p className="text-sm">The orchestrator resolves machine, tool, material, holder, coolant, workholding, CAM strategy, and geometry context — then runs Kienzle/Taylor/Loewen-Shaw physics with stochastic uncertainty.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
