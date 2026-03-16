import { useState, useCallback } from "react";
import { Card, Button, Spinner, Badge, Tabs, TabList, Tab, TabPanel } from "../components/ui";
import { useEdmWire, useEdmSinker, useEdmLaser } from "../hooks/useEdm";
import type { WireEdmParams, SinkerEdmParams, LaserParams } from "../types/edm";

function InputField({ label, value, onChange, type = "number", placeholder }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" placeholder={placeholder} />
    </div>
  );
}

export default function EdmPage() {
  // Wire EDM state
  const [wireParams, setWireParams] = useState<Partial<WireEdmParams>>({ material: "", thickness_mm: 0 });
  const wire = useEdmWire();

  // Sinker EDM state
  const [sinkerParams, setSinkerParams] = useState<Partial<SinkerEdmParams>>({ material: "", depth_mm: 0, area_mm2: 0 });
  const sinker = useEdmSinker();

  // Laser state
  const [laserParams, setLaserParams] = useState<Partial<LaserParams>>({ material: "", thickness_mm: 0, power_W: 0 });
  const laser = useEdmLaser();

  const updateWire = useCallback((field: string, value: string) => {
    setWireParams(prev => ({ ...prev, [field]: field === "material" ? value : +value }));
  }, []);

  const updateSinker = useCallback((field: string, value: string) => {
    setSinkerParams(prev => ({ ...prev, [field]: field === "material" || field === "electrode_material" || field === "dielectric" ? value : +value }));
  }, []);

  const updateLaser = useCallback((field: string, value: string) => {
    setLaserParams(prev => ({ ...prev, [field]: field === "material" || field === "laser_type" || field === "assist_gas" ? value : +value }));
  }, []);

  const activeResult = wire.data || sinker.data || laser.data;
  const activeError = wire.error || sinker.error || laser.error;
  const activeLoading = wire.loading || sinker.loading || laser.loading;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div className="space-y-3">
        <Card>
          <h2 className="text-lg font-bold mb-3">EDM &amp; Non-Traditional Machining</h2>

          <Tabs defaultValue="wire">
            <TabList>
              <Tab value="wire">Wire EDM</Tab>
              <Tab value="sinker">Sinker EDM</Tab>
              <Tab value="laser">Laser</Tab>
            </TabList>

            <TabPanel value="wire">
              <div className="space-y-2 mt-2">
                <InputField label="Material" value={wireParams.material ?? ""} onChange={v => updateWire("material", v)} type="text" placeholder="e.g. AISI D2, Ti-6Al-4V" />
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Thickness (mm)" value={wireParams.thickness_mm ?? ""} onChange={v => updateWire("thickness_mm", v)} />
                  <InputField label="Wire Diameter (mm)" value={wireParams.wire_diameter_mm ?? ""} onChange={v => updateWire("wire_diameter_mm", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Discharge Energy (mJ)" value={wireParams.discharge_energy_mJ ?? ""} onChange={v => updateWire("discharge_energy_mJ", v)} />
                  <InputField label="Pulse On (us)" value={wireParams.pulse_on_us ?? ""} onChange={v => updateWire("pulse_on_us", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Pulse Off (us)" value={wireParams.pulse_off_us ?? ""} onChange={v => updateWire("pulse_off_us", v)} />
                  <InputField label="Wire Tension (N)" value={wireParams.wire_tension_N ?? ""} onChange={v => updateWire("wire_tension_N", v)} />
                </div>
                <InputField label="Number of Cuts" value={wireParams.num_cuts ?? ""} onChange={v => updateWire("num_cuts", v)} />
                <Button onClick={() => wire.execute(wireParams as WireEdmParams)} disabled={wire.loading} className="w-full mt-2">
                  {wire.loading ? <><Spinner size="sm" /> Calculating...</> : "Calculate Wire EDM"}
                </Button>
              </div>
            </TabPanel>

            <TabPanel value="sinker">
              <div className="space-y-2 mt-2">
                <InputField label="Material" value={sinkerParams.material ?? ""} onChange={v => updateSinker("material", v)} type="text" placeholder="e.g. Tool Steel, Inconel 718" />
                <InputField label="Electrode Material" value={sinkerParams.electrode_material ?? ""} onChange={v => updateSinker("electrode_material", v)} type="text" placeholder="e.g. Copper, Graphite" />
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Depth (mm)" value={sinkerParams.depth_mm ?? ""} onChange={v => updateSinker("depth_mm", v)} />
                  <InputField label="Area (mm2)" value={sinkerParams.area_mm2 ?? ""} onChange={v => updateSinker("area_mm2", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Discharge Energy (mJ)" value={sinkerParams.discharge_energy_mJ ?? ""} onChange={v => updateSinker("discharge_energy_mJ", v)} />
                  <InputField label="Pulse On (us)" value={sinkerParams.pulse_on_us ?? ""} onChange={v => updateSinker("pulse_on_us", v)} />
                </div>
                <InputField label="Pulse Off (us)" value={sinkerParams.pulse_off_us ?? ""} onChange={v => updateSinker("pulse_off_us", v)} />
                <Button onClick={() => sinker.execute(sinkerParams as SinkerEdmParams)} disabled={sinker.loading} className="w-full mt-2">
                  {sinker.loading ? <><Spinner size="sm" /> Calculating...</> : "Calculate Sinker EDM"}
                </Button>
              </div>
            </TabPanel>

            <TabPanel value="laser">
              <div className="space-y-2 mt-2">
                <InputField label="Material" value={laserParams.material ?? ""} onChange={v => updateLaser("material", v)} type="text" placeholder="e.g. Stainless Steel, Aluminum" />
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Thickness (mm)" value={laserParams.thickness_mm ?? ""} onChange={v => updateLaser("thickness_mm", v)} />
                  <InputField label="Power (W)" value={laserParams.power_W ?? ""} onChange={v => updateLaser("power_W", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Wavelength (nm)" value={laserParams.wavelength_nm ?? ""} onChange={v => updateLaser("wavelength_nm", v)} />
                  <InputField label="Spot Diameter (um)" value={laserParams.spot_diameter_um ?? ""} onChange={v => updateLaser("spot_diameter_um", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Assist Gas" value={laserParams.assist_gas ?? ""} onChange={v => updateLaser("assist_gas", v)} type="text" placeholder="e.g. N2, O2, Ar" />
                  <InputField label="Gas Pressure (bar)" value={laserParams.gas_pressure_bar ?? ""} onChange={v => updateLaser("gas_pressure_bar", v)} />
                </div>
                <Button onClick={() => laser.execute(laserParams as LaserParams)} disabled={laser.loading} className="w-full mt-2">
                  {laser.loading ? <><Spinner size="sm" /> Calculating...</> : "Calculate Laser"}
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
            <h3 className="font-bold mb-3">Results</h3>
            {"cutting_speed_mm_min" in activeResult && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-xs text-slate-500">Cutting Speed</div>
                  <div className="text-lg font-semibold">{activeResult.cutting_speed_mm_min} mm/min</div>
                </div>
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-xs text-slate-500">Surface Finish</div>
                  <div className="text-lg font-semibold">{String((activeResult as unknown as Record<string, unknown>).surface_roughness_Ra ?? (activeResult as unknown as Record<string, unknown>).surface_finish_Ra ?? "")} Ra</div>
                </div>
              </div>
            )}
            {"mrr_mm3_min" in activeResult && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-xs text-slate-500">MRR</div>
                  <div className="text-lg font-semibold">{activeResult.mrr_mm3_min} mm3/min</div>
                </div>
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-xs text-slate-500">Power</div>
                  <div className="text-lg font-semibold">{activeResult.power_consumption_kW} kW</div>
                </div>
              </div>
            )}
            <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-64 whitespace-pre-wrap">
              {JSON.stringify(activeResult, null, 2)}
            </pre>
            {"recommendations" in activeResult && (activeResult.recommendations as string[]).length > 0 && (
              <div className="mt-3 space-y-1">
                {(activeResult.recommendations as string[]).map((r: string, i: number) => (
                  <div key={i} className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-800">{r}</div>
                ))}
              </div>
            )}
          </Card>
        ) : !activeLoading ? (
          <Card>
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg mb-2">EDM &amp; Non-Traditional Machining</p>
              <p className="text-sm">Configure wire EDM, sinker EDM, or laser machining parameters to calculate cutting speeds, surface finish, MRR, and power consumption.</p>
              <div className="mt-4 flex justify-center gap-2">
                <Badge color="blue">Wire EDM</Badge>
                <Badge color="green">Sinker EDM</Badge>
                <Badge color="yellow">Laser</Badge>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
