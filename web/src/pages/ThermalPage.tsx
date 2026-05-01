import { useState, useCallback } from "react";
import { Card, Button, Spinner, Badge, Tabs, TabList, Tab, TabPanel } from "../components/ui";
import { useThermalHeatExchanger, useThermalPump, useThermalPipe, useThermalHydraulic, useThermalCompressor, useThermalCooling } from "../hooks/useThermal";
import type { ThermalInput } from "../types/thermal";

export default function ThermalPage() {
  const [hxInput, setHxInput] = useState<ThermalInput>({ action: "heat_exchanger", type: "shell_tube", hot_flow_kg_s: 2, cold_flow_kg_s: 3, hot_inlet_K: 400, cold_inlet_K: 300, hot_cp_J_kgK: 4180, cold_cp_J_kgK: 4180 });
  const [pumpInput, setPumpInput] = useState<ThermalInput>({ action: "pump", flow_rate_m3_h: 50, head_m: 30, fluid_density_kg_m3: 998, fluid_viscosity_Pa_s: 0.001 });
  const [pipeInput, setPipeInput] = useState<ThermalInput>({ action: "pipe", diameter_mm: 50, length_m: 20, flow_rate_m3_h: 10, roughness_mm: 0.045, fluid_density_kg_m3: 998, fluid_viscosity_Pa_s: 0.001 });
  const [hydraulicInput, setHydraulicInput] = useState<ThermalInput>({ action: "hydraulic", bore_mm: 80, rod_mm: 40, stroke_mm: 300, pressure_bar: 200 });
  const [compressorInput, setCompressorInput] = useState<ThermalInput>({ action: "compressor", inlet_pressure_bar: 1, outlet_pressure_bar: 8, flow_rate_m3_min: 5, gas: "air", inlet_temperature_K: 293 });
  const [coolingInput, setCoolingInput] = useState<ThermalInput>({ action: "cooling", heat_load_W: 5000, coolant_type: "water", flow_rate_lpm: 10, inlet_temp_K: 293 });

  const hx = useThermalHeatExchanger();
  const pump = useThermalPump();
  const pipe = useThermalPipe();
  const hydraulic = useThermalHydraulic();
  const compressor = useThermalCompressor();
  const cooling = useThermalCooling();

  const updateField = useCallback(<T extends Record<string, unknown>>(setter: React.Dispatch<React.SetStateAction<T>>, field: string, value: unknown) => {
    setter(prev => ({ ...prev, [field]: value }));
  }, []);

  const activeResult = hx.data || pump.data || pipe.data || hydraulic.data || compressor.data || cooling.data;
  const activeError = hx.error || pump.error || pipe.error || hydraulic.error || compressor.error || cooling.error;
  const activeLoading = hx.loading || pump.loading || pipe.loading || hydraulic.loading || compressor.loading || cooling.loading;
  const activeLabel = hx.data ? "Heat Exchanger" : pump.data ? "Pump" : pipe.data ? "Piping" : hydraulic.data ? "Hydraulic" : compressor.data ? "Compressor" : cooling.data ? "Cooling" : "";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div className="space-y-3">
        <Card>
          <h2 className="text-lg font-bold mb-3">Fluid & Thermal Analysis</h2>

          <Tabs defaultValue="hx">
            <TabList>
              <Tab value="hx">Heat Exchangers</Tab>
              <Tab value="pump">Pumps</Tab>
              <Tab value="pipe">Piping</Tab>
              <Tab value="hydraulic">Hydraulics</Tab>
              <Tab value="compressor">Compressors</Tab>
              <Tab value="cooling">Cooling</Tab>
            </TabList>

            <TabPanel value="hx">
              <div className="space-y-2 mt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                  <select value={String(hxInput.type)} onChange={e => updateField(setHxInput, "type", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded">
                    <option value="shell_tube">Shell & Tube</option>
                    <option value="plate">Plate</option>
                    <option value="finned_tube">Finned Tube</option>
                    <option value="double_pipe">Double Pipe</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Hot Flow (kg/s)</label>
                    <input type="number" value={String(hxInput.hot_flow_kg_s)} onChange={e => updateField(setHxInput, "hot_flow_kg_s", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Cold Flow (kg/s)</label>
                    <input type="number" value={String(hxInput.cold_flow_kg_s)} onChange={e => updateField(setHxInput, "cold_flow_kg_s", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Hot Inlet (K)</label>
                    <input type="number" value={String(hxInput.hot_inlet_K)} onChange={e => updateField(setHxInput, "hot_inlet_K", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Cold Inlet (K)</label>
                    <input type="number" value={String(hxInput.cold_inlet_K)} onChange={e => updateField(setHxInput, "cold_inlet_K", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
                  </div>
                </div>
                <Button onClick={() => hx.execute(hxInput)} disabled={hx.loading} className="w-full mt-2">
                  {hx.loading ? <><Spinner size="sm" /> Calculating...</> : "Calculate HX"}
                </Button>
              </div>
            </TabPanel>

            <TabPanel value="pump">
              <div className="space-y-2 mt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Flow Rate (m3/h)</label>
                    <input type="number" value={String(pumpInput.flow_rate_m3_h)} onChange={e => updateField(setPumpInput, "flow_rate_m3_h", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Head (m)</label>
                    <input type="number" value={String(pumpInput.head_m)} onChange={e => updateField(setPumpInput, "head_m", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Density (kg/m3)</label>
                    <input type="number" value={String(pumpInput.fluid_density_kg_m3)} onChange={e => updateField(setPumpInput, "fluid_density_kg_m3", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Viscosity (Pa.s)</label>
                    <input type="number" value={String(pumpInput.fluid_viscosity_Pa_s)} onChange={e => updateField(setPumpInput, "fluid_viscosity_Pa_s", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" step={0.0001} />
                  </div>
                </div>
                <Button onClick={() => pump.execute(pumpInput)} disabled={pump.loading} className="w-full mt-2">
                  {pump.loading ? <><Spinner size="sm" /> Calculating...</> : "Calculate Pump"}
                </Button>
              </div>
            </TabPanel>

            <TabPanel value="pipe">
              <div className="space-y-2 mt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Diameter (mm)</label>
                    <input type="number" value={String(pipeInput.diameter_mm)} onChange={e => updateField(setPipeInput, "diameter_mm", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Length (m)</label>
                    <input type="number" value={String(pipeInput.length_m)} onChange={e => updateField(setPipeInput, "length_m", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Flow Rate (m3/h)</label>
                    <input type="number" value={String(pipeInput.flow_rate_m3_h)} onChange={e => updateField(setPipeInput, "flow_rate_m3_h", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Roughness (mm)</label>
                    <input type="number" value={String(pipeInput.roughness_mm)} onChange={e => updateField(setPipeInput, "roughness_mm", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" step={0.001} />
                  </div>
                </div>
                <Button onClick={() => pipe.execute(pipeInput)} disabled={pipe.loading} className="w-full mt-2">
                  {pipe.loading ? <><Spinner size="sm" /> Calculating...</> : "Calculate Pipe Flow"}
                </Button>
              </div>
            </TabPanel>

            <TabPanel value="hydraulic">
              <div className="space-y-2 mt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Bore (mm)</label>
                    <input type="number" value={String(hydraulicInput.bore_mm)} onChange={e => updateField(setHydraulicInput, "bore_mm", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Rod (mm)</label>
                    <input type="number" value={String(hydraulicInput.rod_mm)} onChange={e => updateField(setHydraulicInput, "rod_mm", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Stroke (mm)</label>
                    <input type="number" value={String(hydraulicInput.stroke_mm)} onChange={e => updateField(setHydraulicInput, "stroke_mm", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Pressure (bar)</label>
                    <input type="number" value={String(hydraulicInput.pressure_bar)} onChange={e => updateField(setHydraulicInput, "pressure_bar", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
                  </div>
                </div>
                <Button onClick={() => hydraulic.execute(hydraulicInput)} disabled={hydraulic.loading} className="w-full mt-2">
                  {hydraulic.loading ? <><Spinner size="sm" /> Calculating...</> : "Calculate Hydraulic"}
                </Button>
              </div>
            </TabPanel>

            <TabPanel value="compressor">
              <div className="space-y-2 mt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Inlet P (bar)</label>
                    <input type="number" value={String(compressorInput.inlet_pressure_bar)} onChange={e => updateField(setCompressorInput, "inlet_pressure_bar", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Outlet P (bar)</label>
                    <input type="number" value={String(compressorInput.outlet_pressure_bar)} onChange={e => updateField(setCompressorInput, "outlet_pressure_bar", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Flow (m3/min)</label>
                    <input type="number" value={String(compressorInput.flow_rate_m3_min)} onChange={e => updateField(setCompressorInput, "flow_rate_m3_min", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Inlet Temp (K)</label>
                    <input type="number" value={String(compressorInput.inlet_temperature_K)} onChange={e => updateField(setCompressorInput, "inlet_temperature_K", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
                  </div>
                </div>
                <Button onClick={() => compressor.execute(compressorInput)} disabled={compressor.loading} className="w-full mt-2">
                  {compressor.loading ? <><Spinner size="sm" /> Calculating...</> : "Calculate Compressor"}
                </Button>
              </div>
            </TabPanel>

            <TabPanel value="cooling">
              <div className="space-y-2 mt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Heat Load (W)</label>
                  <input type="number" value={String(coolingInput.heat_load_W)} onChange={e => updateField(setCoolingInput, "heat_load_W", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Coolant Type</label>
                    <select value={String(coolingInput.coolant_type)} onChange={e => updateField(setCoolingInput, "coolant_type", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded">
                      <option value="water">Water</option>
                      <option value="oil">Oil</option>
                      <option value="glycol">Glycol</option>
                      <option value="air">Air</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Flow (lpm)</label>
                    <input type="number" value={String(coolingInput.flow_rate_lpm)} onChange={e => updateField(setCoolingInput, "flow_rate_lpm", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Inlet Temp (K)</label>
                  <input type="number" value={String(coolingInput.inlet_temp_K)} onChange={e => updateField(setCoolingInput, "inlet_temp_K", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
                </div>
                <Button onClick={() => cooling.execute(coolingInput)} disabled={cooling.loading} className="w-full mt-2">
                  {cooling.loading ? <><Spinner size="sm" /> Calculating...</> : "Calculate Cooling"}
                </Button>
              </div>
            </TabPanel>
          </Tabs>

          {activeError && <p className="mt-2 text-xs text-red-600">{activeError}</p>}
        </Card>
      </div>

      <div className="lg:col-span-2">
        {activeResult ? (
          <Card>
            <h3 className="font-bold mb-3">{activeLabel} Results</h3>
            {pipe.data && (
              <div className="flex gap-2 mb-3">
                <Badge color={(pipe.data as { flow_regime?: string }).flow_regime === "laminar" ? "green" : (pipe.data as { flow_regime?: string }).flow_regime === "turbulent" ? "red" : "yellow"}>
                  {(pipe.data as { flow_regime?: string }).flow_regime}
                </Badge>
                <Badge color="blue">Re = {(pipe.data as { reynolds_number?: number }).reynolds_number?.toFixed(0)}</Badge>
              </div>
            )}
            {pump.data && (
              <div className="flex gap-2 mb-3">
                <Badge color="blue">{(pump.data as { pump_type?: string }).pump_type}</Badge>
                <Badge color="green">Eff: {(pump.data as { efficiency_pct?: number }).efficiency_pct}%</Badge>
                <Badge color={(pump.data as { npsh_available_m?: number; npsh_required_m?: number }).npsh_available_m! > (pump.data as { npsh_available_m?: number; npsh_required_m?: number }).npsh_required_m! ? "green" : "red"}>
                  NPSH OK
                </Badge>
              </div>
            )}
            {hx.data && (
              <div className="flex gap-2 mb-3">
                <Badge color="blue">{(hx.data as { type?: string }).type}</Badge>
                <Badge color="green">Eff: {(((hx.data as { effectiveness?: number }).effectiveness ?? 0) * 100).toFixed(1)}%</Badge>
                <Badge color="slate">NTU: {(hx.data as { ntu?: number }).ntu?.toFixed(2)}</Badge>
              </div>
            )}
            <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-96 whitespace-pre-wrap">{JSON.stringify(activeResult, null, 2)}</pre>
          </Card>
        ) : !activeLoading ? (
          <Card>
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg mb-2">Fluid & Thermal Analysis</p>
              <p className="text-sm">Heat exchangers, pump sizing, pipe flow, hydraulic cylinders, compressor design, and cooling system analysis.</p>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
