import { useState, useCallback } from "react";
import { Card, Button, Spinner, Badge, Tabs, TabList, Tab, TabPanel } from "../components/ui";
import { useFormingSheetMetal, useFormingCasting, useFormingMolding } from "../hooks/useForming";
import type { SheetMetalParams, CastingParams, MoldingParams } from "../types/forming";

function InputField({ label, value, onChange, type = "number", placeholder }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" placeholder={placeholder} />
    </div>
  );
}

export default function FormingPage() {
  const [sheetParams, setSheetParams] = useState<Partial<SheetMetalParams>>({ material: "", thickness_mm: 0 });
  const [castingParams, setCastingParams] = useState<Partial<CastingParams>>({ material: "" });
  const [moldingParams, setMoldingParams] = useState<Partial<MoldingParams>>({ material: "" });

  const sheetMetal = useFormingSheetMetal();
  const casting = useFormingCasting();
  const molding = useFormingMolding();

  const updateSheet = useCallback((field: string, value: string) => {
    setSheetParams(prev => ({ ...prev, [field]: field === "material" || field === "operation" ? value : +value }));
  }, []);

  const updateCasting = useCallback((field: string, value: string) => {
    setCastingParams(prev => ({ ...prev, [field]: field === "material" || field === "casting_type" || field === "mold_material" ? value : +value }));
  }, []);

  const updateMolding = useCallback((field: string, value: string) => {
    setMoldingParams(prev => ({ ...prev, [field]: field === "material" ? value : +value }));
  }, []);

  const activeError = sheetMetal.error || casting.error || molding.error;
  const activeLoading = sheetMetal.loading || casting.loading || molding.loading;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div className="space-y-3">
        <Card>
          <h2 className="text-lg font-bold mb-3">Forming &amp; Casting</h2>

          <Tabs defaultValue="sheet-metal">
            <TabList>
              <Tab value="sheet-metal">Sheet Metal</Tab>
              <Tab value="casting">Casting</Tab>
              <Tab value="molding">Molding</Tab>
            </TabList>

            <TabPanel value="sheet-metal">
              <div className="space-y-2 mt-2">
                <InputField label="Material" value={sheetParams.material ?? ""} onChange={v => updateSheet("material", v)} type="text" placeholder="e.g. SPCC, Al 5052, SS 304" />
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Thickness (mm)" value={sheetParams.thickness_mm ?? ""} onChange={v => updateSheet("thickness_mm", v)} />
                  <InputField label="Bend Radius (mm)" value={sheetParams.bend_radius_mm ?? ""} onChange={v => updateSheet("bend_radius_mm", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Bend Angle (deg)" value={sheetParams.bend_angle_deg ?? ""} onChange={v => updateSheet("bend_angle_deg", v)} />
                  <InputField label="Bend Length (mm)" value={sheetParams.bend_length_mm ?? ""} onChange={v => updateSheet("bend_length_mm", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Die Opening (mm)" value={sheetParams.die_opening_mm ?? ""} onChange={v => updateSheet("die_opening_mm", v)} />
                  <InputField label="K-Factor" value={sheetParams.k_factor ?? ""} onChange={v => updateSheet("k_factor", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Tensile Strength (MPa)" value={sheetParams.tensile_strength_MPa ?? ""} onChange={v => updateSheet("tensile_strength_MPa", v)} />
                  <InputField label="Yield Strength (MPa)" value={sheetParams.yield_strength_MPa ?? ""} onChange={v => updateSheet("yield_strength_MPa", v)} />
                </div>
                <Button onClick={() => sheetMetal.execute(sheetParams as SheetMetalParams)} disabled={sheetMetal.loading} className="w-full mt-2">
                  {sheetMetal.loading ? <><Spinner size="sm" /> Calculating...</> : "Calculate Sheet Metal"}
                </Button>
              </div>
            </TabPanel>

            <TabPanel value="casting">
              <div className="space-y-2 mt-2">
                <InputField label="Material" value={castingParams.material ?? ""} onChange={v => updateCasting("material", v)} type="text" placeholder="e.g. Gray Iron, A356, Bronze" />
                <InputField label="Casting Type" value={castingParams.casting_type ?? ""} onChange={v => updateCasting("casting_type", v)} type="text" placeholder="e.g. sand, investment, die" />
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Part Weight (kg)" value={castingParams.part_weight_kg ?? ""} onChange={v => updateCasting("part_weight_kg", v)} />
                  <InputField label="Wall Thickness (mm)" value={castingParams.wall_thickness_mm ?? ""} onChange={v => updateCasting("wall_thickness_mm", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Max Section (mm)" value={castingParams.max_section_mm ?? ""} onChange={v => updateCasting("max_section_mm", v)} />
                  <InputField label="Pour Temperature (C)" value={castingParams.pour_temperature_C ?? ""} onChange={v => updateCasting("pour_temperature_C", v)} />
                </div>
                <InputField label="Complexity Factor" value={castingParams.complexity_factor ?? ""} onChange={v => updateCasting("complexity_factor", v)} />
                <Button onClick={() => casting.execute(castingParams as CastingParams)} disabled={casting.loading} className="w-full mt-2">
                  {casting.loading ? <><Spinner size="sm" /> Calculating...</> : "Calculate Casting"}
                </Button>
              </div>
            </TabPanel>

            <TabPanel value="molding">
              <div className="space-y-2 mt-2">
                <InputField label="Material" value={moldingParams.material ?? ""} onChange={v => updateMolding("material", v)} type="text" placeholder="e.g. ABS, Nylon 66, PEEK" />
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Part Volume (cm3)" value={moldingParams.part_volume_cm3 ?? ""} onChange={v => updateMolding("part_volume_cm3", v)} />
                  <InputField label="Wall Thickness (mm)" value={moldingParams.wall_thickness_mm ?? ""} onChange={v => updateMolding("wall_thickness_mm", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Melt Temperature (C)" value={moldingParams.melt_temperature_C ?? ""} onChange={v => updateMolding("melt_temperature_C", v)} />
                  <InputField label="Mold Temperature (C)" value={moldingParams.mold_temperature_C ?? ""} onChange={v => updateMolding("mold_temperature_C", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Injection Pressure (MPa)" value={moldingParams.injection_pressure_MPa ?? ""} onChange={v => updateMolding("injection_pressure_MPa", v)} />
                  <InputField label="Clamping Force (kN)" value={moldingParams.clamping_force_kN ?? ""} onChange={v => updateMolding("clamping_force_kN", v)} />
                </div>
                <InputField label="Number of Cavities" value={moldingParams.num_cavities ?? ""} onChange={v => updateMolding("num_cavities", v)} />
                <Button onClick={() => molding.execute(moldingParams as MoldingParams)} disabled={molding.loading} className="w-full mt-2">
                  {molding.loading ? <><Spinner size="sm" /> Calculating...</> : "Calculate Molding"}
                </Button>
              </div>
            </TabPanel>
          </Tabs>

          {activeError && <p className="mt-2 text-xs text-red-600">{activeError}</p>}
        </Card>
      </div>

      <div className="lg:col-span-2">
        {sheetMetal.data ? (
          <Card>
            <h3 className="font-bold mb-3">Sheet Metal Results</h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-slate-50 rounded p-2">
                <div className="text-xs text-slate-500">Bend Allowance</div>
                <div className="text-lg font-semibold">{sheetMetal.data.bend_allowance_mm} mm</div>
              </div>
              <div className="bg-slate-50 rounded p-2">
                <div className="text-xs text-slate-500">Springback</div>
                <div className="text-lg font-semibold">{sheetMetal.data.springback_angle_deg} deg</div>
              </div>
              <div className="bg-slate-50 rounded p-2">
                <div className="text-xs text-slate-500">Bending Force</div>
                <div className="text-lg font-semibold">{sheetMetal.data.bending_force_kN} kN</div>
              </div>
            </div>
            <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
              {JSON.stringify(sheetMetal.data, null, 2)}
            </pre>
            {sheetMetal.data.recommendations.length > 0 && (
              <div className="mt-3 space-y-1">
                {sheetMetal.data.recommendations.map((r, i) => (
                  <div key={i} className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-800">{r}</div>
                ))}
              </div>
            )}
          </Card>
        ) : casting.data ? (
          <Card>
            <h3 className="font-bold mb-3">Casting Results</h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-slate-50 rounded p-2">
                <div className="text-xs text-slate-500">Solidification Time</div>
                <div className="text-lg font-semibold">{casting.data.solidification_time_s} s</div>
              </div>
              <div className="bg-slate-50 rounded p-2">
                <div className="text-xs text-slate-500">Shrinkage</div>
                <div className="text-lg font-semibold">{casting.data.shrinkage_pct}%</div>
              </div>
              <div className="bg-slate-50 rounded p-2">
                <div className="text-xs text-slate-500">Fill Time</div>
                <div className="text-lg font-semibold">{casting.data.mold_fill_time_s} s</div>
              </div>
            </div>
            {casting.data.defect_risk && (
              <div className="mb-3">
                <div className="text-xs font-medium text-slate-500 mb-1">Defect Risks</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(casting.data.defect_risk).map(([defect, risk]) => (
                    <Badge key={defect} color={risk === "low" ? "green" : risk === "medium" ? "yellow" : "red"}>{defect}: {risk}</Badge>
                  ))}
                </div>
              </div>
            )}
            <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
              {JSON.stringify(casting.data, null, 2)}
            </pre>
          </Card>
        ) : molding.data ? (
          <Card>
            <h3 className="font-bold mb-3">Molding Results</h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-slate-50 rounded p-2">
                <div className="text-xs text-slate-500">Cycle Time</div>
                <div className="text-lg font-semibold">{molding.data.cycle_time_s} s</div>
              </div>
              <div className="bg-slate-50 rounded p-2">
                <div className="text-xs text-slate-500">Clamping Force</div>
                <div className="text-lg font-semibold">{molding.data.clamping_force_kN} kN</div>
              </div>
              <div className="bg-slate-50 rounded p-2">
                <div className="text-xs text-slate-500">Shrinkage</div>
                <div className="text-lg font-semibold">{molding.data.shrinkage_pct}%</div>
              </div>
            </div>
            <div className="flex gap-2 mb-3">
              <Badge color={molding.data.warp_risk === "low" ? "green" : molding.data.warp_risk === "medium" ? "yellow" : "red"}>Warp: {molding.data.warp_risk}</Badge>
              <Badge color={molding.data.sink_mark_risk === "low" ? "green" : molding.data.sink_mark_risk === "medium" ? "yellow" : "red"}>Sink: {molding.data.sink_mark_risk}</Badge>
            </div>
            <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
              {JSON.stringify(molding.data, null, 2)}
            </pre>
          </Card>
        ) : !activeLoading ? (
          <Card>
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg mb-2">Forming &amp; Casting Calculator</p>
              <p className="text-sm">Calculate bend allowance, springback, casting solidification, and injection molding parameters.</p>
              <div className="mt-4 flex justify-center gap-2">
                <Badge color="blue">Sheet Metal</Badge>
                <Badge color="green">Casting</Badge>
                <Badge color="yellow">Molding</Badge>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
