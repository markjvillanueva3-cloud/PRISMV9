import { useState, useCallback } from "react";
import { Card, Button, Spinner, Badge, Tabs, TabList, Tab, TabPanel } from "../components/ui";
import { useWeldingCalculate, useWeldingJointDesign, useWeldingInspection } from "../hooks/useWelding";
import type { WeldingParams, JointDesignParams, InspectionParams } from "../types/welding";

function InputField({ label, value, onChange, type = "number", placeholder }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" placeholder={placeholder} />
    </div>
  );
}

export default function WeldingPage() {
  const [weldParams, setWeldParams] = useState<Partial<WeldingParams>>({ process: "", material: "", thickness_mm: 0 });
  const [jointParams, setJointParams] = useState<Partial<JointDesignParams>>({ joint_type: "", material: "", thickness_mm: 0 });
  const [inspectParams, setInspectParams] = useState<Partial<InspectionParams>>({ process: "", material: "", thickness_mm: 0 });

  const welding = useWeldingCalculate();
  const jointDesign = useWeldingJointDesign();
  const inspection = useWeldingInspection();

  const updateWeld = useCallback((field: string, value: string) => {
    setWeldParams(prev => ({ ...prev, [field]: field === "process" || field === "material" || field === "joint_type" || field === "filler_material" || field === "shielding_gas" || field === "position" ? value : +value }));
  }, []);

  const updateJoint = useCallback((field: string, value: string) => {
    setJointParams(prev => ({ ...prev, [field]: field === "joint_type" || field === "material" || field === "load_type" || field === "code" ? value : +value }));
  }, []);

  const updateInspect = useCallback((field: string, value: string) => {
    setInspectParams(prev => ({ ...prev, [field]: field === "process" || field === "material" || field === "joint_type" || field === "code" || field === "quality_level" || field === "inspection_method" ? value : +value }));
  }, []);

  const activeError = welding.error || jointDesign.error || inspection.error;
  const activeLoading = welding.loading || jointDesign.loading || inspection.loading;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div className="space-y-3">
        <Card>
          <h2 className="text-lg font-bold mb-3">Welding &amp; Joining</h2>

          <Tabs defaultValue="welding">
            <TabList>
              <Tab value="welding">Welding Parameters</Tab>
              <Tab value="joint">Joint Design</Tab>
              <Tab value="inspection">Inspection</Tab>
            </TabList>

            <TabPanel value="welding">
              <div className="space-y-2 mt-2">
                <InputField label="Process" value={weldParams.process ?? ""} onChange={v => updateWeld("process", v)} type="text" placeholder="e.g. GMAW, GTAW, SMAW, FCAW" />
                <InputField label="Material" value={weldParams.material ?? ""} onChange={v => updateWeld("material", v)} type="text" placeholder="e.g. Carbon Steel, SS 304, Al 6061" />
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Thickness (mm)" value={weldParams.thickness_mm ?? ""} onChange={v => updateWeld("thickness_mm", v)} />
                  <InputField label="Joint Type" value={weldParams.joint_type ?? ""} onChange={v => updateWeld("joint_type", v)} type="text" placeholder="e.g. butt, fillet, lap" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Voltage (V)" value={weldParams.voltage_V ?? ""} onChange={v => updateWeld("voltage_V", v)} />
                  <InputField label="Current (A)" value={weldParams.current_A ?? ""} onChange={v => updateWeld("current_A", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Travel Speed (mm/min)" value={weldParams.travel_speed_mm_min ?? ""} onChange={v => updateWeld("travel_speed_mm_min", v)} />
                  <InputField label="Wire Feed (m/min)" value={weldParams.wire_feed_speed_m_min ?? ""} onChange={v => updateWeld("wire_feed_speed_m_min", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Filler Material" value={weldParams.filler_material ?? ""} onChange={v => updateWeld("filler_material", v)} type="text" placeholder="e.g. ER70S-6" />
                  <InputField label="Shielding Gas" value={weldParams.shielding_gas ?? ""} onChange={v => updateWeld("shielding_gas", v)} type="text" placeholder="e.g. 75Ar/25CO2" />
                </div>
                <InputField label="Preheat Temperature (C)" value={weldParams.preheat_temp_C ?? ""} onChange={v => updateWeld("preheat_temp_C", v)} />
                <Button onClick={() => welding.execute(weldParams as WeldingParams)} disabled={welding.loading} className="w-full mt-2">
                  {welding.loading ? <><Spinner size="sm" /> Calculating...</> : "Calculate Welding"}
                </Button>
              </div>
            </TabPanel>

            <TabPanel value="joint">
              <div className="space-y-2 mt-2">
                <InputField label="Joint Type" value={jointParams.joint_type ?? ""} onChange={v => updateJoint("joint_type", v)} type="text" placeholder="e.g. butt, fillet, lap, tee" />
                <InputField label="Material" value={jointParams.material ?? ""} onChange={v => updateJoint("material", v)} type="text" placeholder="e.g. A36, SS 316L" />
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Thickness (mm)" value={jointParams.thickness_mm ?? ""} onChange={v => updateJoint("thickness_mm", v)} />
                  <InputField label="Weld Length (mm)" value={jointParams.weld_length_mm ?? ""} onChange={v => updateJoint("weld_length_mm", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Load Type" value={jointParams.load_type ?? ""} onChange={v => updateJoint("load_type", v)} type="text" placeholder="e.g. tension, shear, bending" />
                  <InputField label="Load (N)" value={jointParams.load_N ?? ""} onChange={v => updateJoint("load_N", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Safety Factor" value={jointParams.safety_factor ?? ""} onChange={v => updateJoint("safety_factor", v)} />
                  <InputField label="Code" value={jointParams.code ?? ""} onChange={v => updateJoint("code", v)} type="text" placeholder="e.g. AWS D1.1, EN 1993" />
                </div>
                <Button onClick={() => jointDesign.execute(jointParams as JointDesignParams)} disabled={jointDesign.loading} className="w-full mt-2">
                  {jointDesign.loading ? <><Spinner size="sm" /> Calculating...</> : "Design Joint"}
                </Button>
              </div>
            </TabPanel>

            <TabPanel value="inspection">
              <div className="space-y-2 mt-2">
                <InputField label="Process" value={inspectParams.process ?? ""} onChange={v => updateInspect("process", v)} type="text" placeholder="e.g. GMAW, GTAW" />
                <InputField label="Material" value={inspectParams.material ?? ""} onChange={v => updateInspect("material", v)} type="text" placeholder="e.g. Carbon Steel" />
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Thickness (mm)" value={inspectParams.thickness_mm ?? ""} onChange={v => updateInspect("thickness_mm", v)} />
                  <InputField label="Joint Type" value={inspectParams.joint_type ?? ""} onChange={v => updateInspect("joint_type", v)} type="text" placeholder="e.g. butt, fillet" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Quality Level" value={inspectParams.quality_level ?? ""} onChange={v => updateInspect("quality_level", v)} type="text" placeholder="e.g. B, C, D (ISO 5817)" />
                  <InputField label="Code" value={inspectParams.code ?? ""} onChange={v => updateInspect("code", v)} type="text" placeholder="e.g. AWS D1.1, ASME IX" />
                </div>
                <InputField label="Inspection Method" value={inspectParams.inspection_method ?? ""} onChange={v => updateInspect("inspection_method", v)} type="text" placeholder="e.g. RT, UT, MT, PT, VT" />
                <Button onClick={() => inspection.execute(inspectParams as InspectionParams)} disabled={inspection.loading} className="w-full mt-2">
                  {inspection.loading ? <><Spinner size="sm" /> Calculating...</> : "Get Inspection Plan"}
                </Button>
              </div>
            </TabPanel>
          </Tabs>

          {activeError && <p className="mt-2 text-xs text-red-600">{activeError}</p>}
        </Card>
      </div>

      <div className="lg:col-span-2">
        {welding.data ? (
          <Card>
            <h3 className="font-bold mb-3">Welding Results</h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-slate-50 rounded p-2">
                <div className="text-xs text-slate-500">Heat Input</div>
                <div className="text-lg font-semibold">{welding.data.heat_input_kJ_mm} kJ/mm</div>
              </div>
              <div className="bg-slate-50 rounded p-2">
                <div className="text-xs text-slate-500">Weld Strength</div>
                <div className="text-lg font-semibold">{welding.data.weld_strength_MPa} MPa</div>
              </div>
              <div className="bg-slate-50 rounded p-2">
                <div className="text-xs text-slate-500">Distortion</div>
                <div className="text-lg font-semibold">{welding.data.distortion_mm} mm</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-slate-50 rounded p-2">
                <div className="text-xs text-slate-500">HAZ Width</div>
                <div className="text-lg font-semibold">{welding.data.haz_width_mm} mm</div>
              </div>
              <div className="bg-slate-50 rounded p-2">
                <div className="text-xs text-slate-500">Preheat</div>
                <Badge color={welding.data.preheat_required ? "yellow" : "green"}>
                  {welding.data.preheat_required ? `${welding.data.preheat_temp_C} C` : "Not required"}
                </Badge>
              </div>
            </div>
            <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
              {JSON.stringify(welding.data, null, 2)}
            </pre>
            {welding.data.recommendations.length > 0 && (
              <div className="mt-3 space-y-1">
                {welding.data.recommendations.map((r, i) => (
                  <div key={i} className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-800">{r}</div>
                ))}
              </div>
            )}
          </Card>
        ) : jointDesign.data ? (
          <Card>
            <h3 className="font-bold mb-3">Joint Design Results</h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-slate-50 rounded p-2">
                <div className="text-xs text-slate-500">Weld Size</div>
                <div className="text-lg font-semibold">{jointDesign.data.weld_size_mm} mm</div>
              </div>
              <div className="bg-slate-50 rounded p-2">
                <div className="text-xs text-slate-500">Utilization</div>
                <Badge color={jointDesign.data.utilization_pct < 70 ? "green" : jointDesign.data.utilization_pct < 90 ? "yellow" : "red"}>
                  {jointDesign.data.utilization_pct}%
                </Badge>
              </div>
              <div className="bg-slate-50 rounded p-2">
                <div className="text-xs text-slate-500">Throat Thickness</div>
                <div className="text-lg font-semibold">{jointDesign.data.throat_thickness_mm} mm</div>
              </div>
            </div>
            <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
              {JSON.stringify(jointDesign.data, null, 2)}
            </pre>
            {jointDesign.data.recommendations.length > 0 && (
              <div className="mt-3 space-y-1">
                {jointDesign.data.recommendations.map((r, i) => (
                  <div key={i} className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-800">{r}</div>
                ))}
              </div>
            )}
          </Card>
        ) : inspection.data ? (
          <Card>
            <h3 className="font-bold mb-3">Inspection Plan</h3>
            <div className="mb-3">
              <div className="text-xs font-medium text-slate-500 mb-1">Required Methods</div>
              <div className="flex flex-wrap gap-1">
                {inspection.data.required_methods.map((m, i) => (
                  <Badge key={i} color="blue">{m}</Badge>
                ))}
              </div>
            </div>
            <div className="bg-slate-50 rounded p-2 mb-3">
              <div className="text-xs text-slate-500">NDT Coverage</div>
              <div className="text-lg font-semibold">{inspection.data.ndt_coverage_pct}%</div>
            </div>
            {inspection.data.acceptance_criteria && (
              <div className="mb-3">
                <div className="text-xs font-medium text-slate-500 mb-1">Acceptance Criteria</div>
                {Object.entries(inspection.data.acceptance_criteria).map(([k, v]) => (
                  <div key={k} className="text-xs py-0.5"><span className="font-medium">{k}:</span> {v}</div>
                ))}
              </div>
            )}
            <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
              {JSON.stringify(inspection.data, null, 2)}
            </pre>
          </Card>
        ) : !activeLoading ? (
          <Card>
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg mb-2">Welding &amp; Joining Calculator</p>
              <p className="text-sm">Calculate heat input, weld strength, distortion, joint design, and inspection requirements for all major welding processes.</p>
              <div className="mt-4 flex justify-center gap-2">
                <Badge color="blue">Welding</Badge>
                <Badge color="green">Joint Design</Badge>
                <Badge color="yellow">Inspection</Badge>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
