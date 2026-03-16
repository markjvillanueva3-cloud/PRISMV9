import { useState, useCallback } from "react";
import { Card, Button, Spinner, Badge, Tabs, TabList, Tab, TabPanel } from "../components/ui";
import { useGrindingCalculate, useGrindingWheelSelect, useGrindingDressing } from "../hooks/useGrinding";
import type { GrindingParams, WheelSelectParams, DressingParams } from "../types/grinding";

function InputField({ label, value, onChange, type = "number", placeholder }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" placeholder={placeholder} />
    </div>
  );
}

export default function GrindingPage() {
  const [grindParams, setGrindParams] = useState<Partial<GrindingParams>>({ workpiece_material: "", depth_of_cut_mm: 0 });
  const [wheelParams, setWheelParams] = useState<Partial<WheelSelectParams>>({ workpiece_material: "", operation: "" });
  const [dressParams, setDressParams] = useState<Partial<DressingParams>>({ wheel_type: "", wheel_diameter_mm: 0 });

  const grinding = useGrindingCalculate();
  const wheelSelect = useGrindingWheelSelect();
  const dressing = useGrindingDressing();

  const updateGrind = useCallback((field: string, value: string) => {
    setGrindParams(prev => ({ ...prev, [field]: field === "workpiece_material" || field === "wheel_type" || field === "coolant_type" || field === "operation" ? value : +value }));
  }, []);

  const updateWheel = useCallback((field: string, value: string) => {
    setWheelParams(prev => ({ ...prev, [field]: field === "workpiece_material" || field === "operation" ? value : field === "removal_rate_priority" ? value === "true" : +value }));
  }, []);

  const updateDress = useCallback((field: string, value: string) => {
    setDressParams(prev => ({ ...prev, [field]: field === "wheel_type" || field === "dresser_type" || field === "wheel_condition" ? value : +value }));
  }, []);

  const activeError = grinding.error || wheelSelect.error || dressing.error;
  const activeLoading = grinding.loading || wheelSelect.loading || dressing.loading;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div className="space-y-3">
        <Card>
          <h2 className="text-lg font-bold mb-3">Grinding Operations</h2>

          <Tabs defaultValue="surface">
            <TabList>
              <Tab value="surface">Surface Grinding</Tab>
              <Tab value="wheel">Wheel Selection</Tab>
              <Tab value="dressing">Dressing Parameters</Tab>
            </TabList>

            <TabPanel value="surface">
              <div className="space-y-2 mt-2">
                <InputField label="Workpiece Material" value={grindParams.workpiece_material ?? ""} onChange={v => updateGrind("workpiece_material", v)} type="text" placeholder="e.g. AISI 4140, HSS M2" />
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Wheel Diameter (mm)" value={grindParams.wheel_diameter_mm ?? ""} onChange={v => updateGrind("wheel_diameter_mm", v)} />
                  <InputField label="Wheel Width (mm)" value={grindParams.wheel_width_mm ?? ""} onChange={v => updateGrind("wheel_width_mm", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Depth of Cut (mm)" value={grindParams.depth_of_cut_mm ?? ""} onChange={v => updateGrind("depth_of_cut_mm", v)} />
                  <InputField label="Feed Rate (mm/min)" value={grindParams.feed_rate_mm_min ?? ""} onChange={v => updateGrind("feed_rate_mm_min", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Wheel Speed (m/s)" value={grindParams.wheel_speed_m_s ?? ""} onChange={v => updateGrind("wheel_speed_m_s", v)} />
                  <InputField label="Table Speed (m/min)" value={grindParams.table_speed_m_min ?? ""} onChange={v => updateGrind("table_speed_m_min", v)} />
                </div>
                <InputField label="Wheel Type" value={grindParams.wheel_type ?? ""} onChange={v => updateGrind("wheel_type", v)} type="text" placeholder="e.g. Al2O3, CBN, Diamond" />
                <Button onClick={() => grinding.execute(grindParams as GrindingParams)} disabled={grinding.loading} className="w-full mt-2">
                  {grinding.loading ? <><Spinner size="sm" /> Calculating...</> : "Calculate Grinding"}
                </Button>
              </div>
            </TabPanel>

            <TabPanel value="wheel">
              <div className="space-y-2 mt-2">
                <InputField label="Workpiece Material" value={wheelParams.workpiece_material ?? ""} onChange={v => updateWheel("workpiece_material", v)} type="text" placeholder="e.g. Hardened Steel, Carbide" />
                <InputField label="Operation" value={wheelParams.operation ?? ""} onChange={v => updateWheel("operation", v)} type="text" placeholder="e.g. surface, cylindrical, centerless" />
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Target Finish (Ra)" value={wheelParams.target_finish_Ra ?? ""} onChange={v => updateWheel("target_finish_Ra", v)} />
                  <InputField label="Hardness (HRC)" value={wheelParams.hardness_HRC ?? ""} onChange={v => updateWheel("hardness_HRC", v)} />
                </div>
                <Button onClick={() => wheelSelect.execute(wheelParams as WheelSelectParams)} disabled={wheelSelect.loading} className="w-full mt-2">
                  {wheelSelect.loading ? <><Spinner size="sm" /> Selecting...</> : "Select Wheel"}
                </Button>
              </div>
            </TabPanel>

            <TabPanel value="dressing">
              <div className="space-y-2 mt-2">
                <InputField label="Wheel Type" value={dressParams.wheel_type ?? ""} onChange={v => updateDress("wheel_type", v)} type="text" placeholder="e.g. Al2O3 60K" />
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Wheel Diameter (mm)" value={dressParams.wheel_diameter_mm ?? ""} onChange={v => updateDress("wheel_diameter_mm", v)} />
                  <InputField label="Wheel Width (mm)" value={dressParams.wheel_width_mm ?? ""} onChange={v => updateDress("wheel_width_mm", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Dressing Depth (mm)" value={dressParams.dressing_depth_mm ?? ""} onChange={v => updateDress("dressing_depth_mm", v)} />
                  <InputField label="Dressing Lead (mm/rev)" value={dressParams.dressing_lead_mm_rev ?? ""} onChange={v => updateDress("dressing_lead_mm_rev", v)} />
                </div>
                <InputField label="Dresser Type" value={dressParams.dresser_type ?? ""} onChange={v => updateDress("dresser_type", v)} type="text" placeholder="e.g. single-point diamond, rotary" />
                <Button onClick={() => dressing.execute(dressParams as DressingParams)} disabled={dressing.loading} className="w-full mt-2">
                  {dressing.loading ? <><Spinner size="sm" /> Calculating...</> : "Calculate Dressing"}
                </Button>
              </div>
            </TabPanel>
          </Tabs>

          {activeError && <p className="mt-2 text-xs text-red-600">{activeError}</p>}
        </Card>
      </div>

      <div className="lg:col-span-2">
        {grinding.data ? (
          <Card>
            <h3 className="font-bold mb-3">Grinding Results</h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-slate-50 rounded p-2">
                <div className="text-xs text-slate-500">Surface Finish</div>
                <div className="text-lg font-semibold">{grinding.data.surface_finish_Ra} Ra</div>
              </div>
              <div className="bg-slate-50 rounded p-2">
                <div className="text-xs text-slate-500">Power</div>
                <div className="text-lg font-semibold">{grinding.data.power_kW} kW</div>
              </div>
              <div className="bg-slate-50 rounded p-2">
                <div className="text-xs text-slate-500">Temperature</div>
                <div className="text-lg font-semibold">{grinding.data.temperature_C} C</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-slate-50 rounded p-2">
                <div className="text-xs text-slate-500">Burn Risk</div>
                <Badge color={grinding.data.burn_risk === "low" ? "green" : grinding.data.burn_risk === "medium" ? "yellow" : "red"}>{grinding.data.burn_risk}</Badge>
              </div>
              <div className="bg-slate-50 rounded p-2">
                <div className="text-xs text-slate-500">MRR</div>
                <div className="text-lg font-semibold">{grinding.data.mrr_mm3_min} mm3/min</div>
              </div>
            </div>
            <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
              {JSON.stringify(grinding.data, null, 2)}
            </pre>
            {grinding.data.recommendations.length > 0 && (
              <div className="mt-3 space-y-1">
                {grinding.data.recommendations.map((r, i) => (
                  <div key={i} className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-800">{r}</div>
                ))}
              </div>
            )}
          </Card>
        ) : wheelSelect.data ? (
          <Card>
            <h3 className="font-bold mb-3">Wheel Selection</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-slate-50 rounded p-2">
                <div className="text-xs text-slate-500">Specification</div>
                <div className="text-lg font-semibold">{wheelSelect.data.wheel_specification}</div>
              </div>
              <div className="bg-slate-50 rounded p-2">
                <div className="text-xs text-slate-500">Abrasive</div>
                <Badge color="blue">{wheelSelect.data.abrasive_type}</Badge>
              </div>
            </div>
            <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
              {JSON.stringify(wheelSelect.data, null, 2)}
            </pre>
          </Card>
        ) : dressing.data ? (
          <Card>
            <h3 className="font-bold mb-3">Dressing Results</h3>
            <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-64 whitespace-pre-wrap">
              {JSON.stringify(dressing.data, null, 2)}
            </pre>
            {dressing.data.recommendations.length > 0 && (
              <div className="mt-3 space-y-1">
                {dressing.data.recommendations.map((r, i) => (
                  <div key={i} className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-800">{r}</div>
                ))}
              </div>
            )}
          </Card>
        ) : !activeLoading ? (
          <Card>
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg mb-2">Grinding Operations Calculator</p>
              <p className="text-sm">Calculate grinding parameters, select wheels, and configure dressing for surface, cylindrical, and centerless grinding.</p>
              <div className="mt-4 flex justify-center gap-2">
                <Badge color="blue">Surface Grinding</Badge>
                <Badge color="green">Wheel Selection</Badge>
                <Badge color="yellow">Dressing</Badge>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
