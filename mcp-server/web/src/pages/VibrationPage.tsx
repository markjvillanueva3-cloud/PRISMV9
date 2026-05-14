import { useState, useCallback } from "react";
import { Card, Button, Spinner, Badge, Tabs, TabList, Tab, TabPanel } from "../components/ui";
import { useVibrationStabilityLobes, useVibrationModal, useVibrationChatter, useVibrationDamping } from "../hooks/useVibration";
import type { VibrationInput } from "../types/vibration";

const DEFAULTS: VibrationInput = {
  action: "",
  speed_rpm: 8000,
  depth_mm: 2,
  flutes: 4,
  tool_diameter_mm: 10,
  natural_freq_hz: 800,
  damping_ratio: 0.03,
  stiffness_N_m: 5e6,
  material: "AISI 4140",
  radial_depth_mm: 5,
};

export default function VibrationPage() {
  const [input, setInput] = useState<VibrationInput>({ ...DEFAULTS });
  const lobes = useVibrationStabilityLobes();
  const modal = useVibrationModal();
  const chatter = useVibrationChatter();
  const damping = useVibrationDamping();

  const update = useCallback((field: string, value: unknown) => {
    setInput(prev => ({ ...prev, [field]: value }));
  }, []);

  const severityColor = (s: string): "green" | "yellow" | "red" | "slate" => {
    if (s === "none") return "green";
    if (s === "mild") return "yellow";
    if (s === "moderate" || s === "severe") return "red";
    return "slate";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div className="space-y-3">
        <Card>
          <h2 className="text-lg font-bold mb-3">Vibration Analysis</h2>

          <Tabs defaultValue="lobes">
            <TabList>
              <Tab value="lobes">Stability Lobes</Tab>
              <Tab value="modal">Modal Analysis</Tab>
              <Tab value="chatter">Chatter Detection</Tab>
              <Tab value="damping">Process Damping</Tab>
            </TabList>

            <TabPanel value="lobes">
              <p className="text-xs text-slate-400 mt-2 mb-2">Compute stability lobe diagram for chatter-free machining zones.</p>
            </TabPanel>
            <TabPanel value="modal">
              <p className="text-xs text-slate-400 mt-2 mb-2">Modal analysis to identify natural frequencies and mode shapes.</p>
            </TabPanel>
            <TabPanel value="chatter">
              <p className="text-xs text-slate-400 mt-2 mb-2">Detect and classify chatter severity from process parameters.</p>
            </TabPanel>
            <TabPanel value="damping">
              <p className="text-xs text-slate-400 mt-2 mb-2">Evaluate process damping effects at low cutting speeds.</p>
            </TabPanel>
          </Tabs>

          <div className="space-y-2 mt-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Speed (RPM)</label>
                <input type="number" value={input.speed_rpm ?? ""} onChange={e => update("speed_rpm", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Depth (mm)</label>
                <input type="number" value={input.depth_mm ?? ""} onChange={e => update("depth_mm", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Flutes</label>
                <input type="number" value={input.flutes ?? ""} onChange={e => update("flutes", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tool Dia (mm)</label>
                <input type="number" value={input.tool_diameter_mm ?? ""} onChange={e => update("tool_diameter_mm", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Natural Freq (Hz)</label>
                <input type="number" value={input.natural_freq_hz ?? ""} onChange={e => update("natural_freq_hz", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Damping Ratio</label>
                <input type="number" value={input.damping_ratio ?? ""} onChange={e => update("damping_ratio", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" step={0.01} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Stiffness (N/m)</label>
                <input type="number" value={input.stiffness_N_m ?? ""} onChange={e => update("stiffness_N_m", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Radial Depth (mm)</label>
                <input type="number" value={input.radial_depth_mm ?? ""} onChange={e => update("radial_depth_mm", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Material</label>
              <input type="text" value={input.material ?? ""} onChange={e => update("material", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <Button onClick={() => lobes.execute({ ...input, action: "stability_lobes" })} disabled={lobes.loading} className="w-full text-sm">
              {lobes.loading ? <Spinner size="sm" /> : "Stability Lobes"}
            </Button>
            <Button onClick={() => modal.execute({ ...input, action: "modal_analysis" })} disabled={modal.loading} className="w-full text-sm">
              {modal.loading ? <Spinner size="sm" /> : "Modal Analysis"}
            </Button>
            <Button onClick={() => chatter.execute({ ...input, action: "chatter_detect" })} disabled={chatter.loading} className="w-full text-sm">
              {chatter.loading ? <Spinner size="sm" /> : "Chatter Detect"}
            </Button>
            <Button onClick={() => damping.execute({ ...input, action: "process_damping" })} disabled={damping.loading} className="w-full text-sm">
              {damping.loading ? <Spinner size="sm" /> : "Process Damping"}
            </Button>
          </div>
          {(lobes.error || modal.error || chatter.error || damping.error) && (
            <p className="mt-2 text-xs text-red-600">{lobes.error || modal.error || chatter.error || damping.error}</p>
          )}
        </Card>
      </div>

      <div className="lg:col-span-2">
        {lobes.data ? (
          <Card>
            <h3 className="font-bold mb-3">Stability Lobe Diagram</h3>
            <div className="flex gap-2 mb-3">
              <Badge color="green">Max Stable: {(lobes.data as { max_stable_depth_mm?: number }).max_stable_depth_mm} mm</Badge>
              <Badge color="blue">Critical: {(lobes.data as { critical_speed_rpm?: number }).critical_speed_rpm} RPM</Badge>
              <Badge color="yellow">Chatter Freq: {(lobes.data as { chatter_frequency_hz?: number }).chatter_frequency_hz} Hz</Badge>
            </div>
            {(lobes.data as { recommended_speeds?: number[] }).recommended_speeds && (
              <div className="mb-3">
                <span className="text-xs text-slate-500">Recommended Speeds: </span>
                {(lobes.data as { recommended_speeds: number[] }).recommended_speeds.map((s, i) => (
                  <Badge key={i} color="green">{s} RPM</Badge>
                ))}
              </div>
            )}
            <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-96 whitespace-pre-wrap">{JSON.stringify(lobes.data, null, 2)}</pre>
          </Card>
        ) : modal.data ? (
          <Card>
            <h3 className="font-bold mb-3">Modal Analysis Results</h3>
            <Badge color="blue">Dominant Mode: {(modal.data as { dominant_mode?: number }).dominant_mode}</Badge>
            <pre className="text-xs bg-slate-50 rounded p-3 mt-3 overflow-auto max-h-96 whitespace-pre-wrap">{JSON.stringify(modal.data, null, 2)}</pre>
          </Card>
        ) : chatter.data ? (
          <Card>
            <h3 className="font-bold mb-3">Chatter Detection</h3>
            <div className="flex gap-2 mb-3">
              <Badge color={severityColor((chatter.data as { severity?: string }).severity ?? "")}>
                {(chatter.data as { severity?: string }).severity?.toUpperCase()}
              </Badge>
              <Badge color={(chatter.data as { is_chatter?: boolean }).is_chatter ? "red" : "green"}>
                {(chatter.data as { is_chatter?: boolean }).is_chatter ? "CHATTER DETECTED" : "STABLE"}
              </Badge>
              <Badge color="slate">Confidence: {(((chatter.data as { confidence?: number }).confidence ?? 0) * 100).toFixed(0)}%</Badge>
            </div>
            {(chatter.data as { mitigation_suggestions?: string[] }).mitigation_suggestions && (
              <div className="mb-3 space-y-1">
                {(chatter.data as { mitigation_suggestions: string[] }).mitigation_suggestions.map((s, i) => (
                  <div key={i} className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-800">{s}</div>
                ))}
              </div>
            )}
            <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-96 whitespace-pre-wrap">{JSON.stringify(chatter.data, null, 2)}</pre>
          </Card>
        ) : damping.data ? (
          <Card>
            <h3 className="font-bold mb-3">Process Damping Results</h3>
            <div className="flex gap-2 mb-3">
              <Badge color="green">Stability Gain: {(damping.data as { stability_gain_pct?: number }).stability_gain_pct}%</Badge>
              <Badge color="blue">Optimal: {(damping.data as { optimal_speed_rpm?: number }).optimal_speed_rpm} RPM</Badge>
            </div>
            <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-96 whitespace-pre-wrap">{JSON.stringify(damping.data, null, 2)}</pre>
          </Card>
        ) : (
          <Card>
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg mb-2">Vibration Analysis</p>
              <p className="text-sm">Stability lobe diagrams, modal analysis, chatter detection, and process damping evaluation for chatter-free machining.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
