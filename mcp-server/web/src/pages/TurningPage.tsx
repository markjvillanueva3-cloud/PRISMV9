import { useState, useCallback } from "react";
import { Card, Button, Spinner, Badge, Tabs, TabList, Tab, TabPanel } from "../components/ui";
import { useTurningCalculate, useTurningThreading, useTurningGrooving, useTurningBoring } from "../hooks/useTurning";
import type { TurningParams, ThreadingParams, GroovingParams, BoringParams } from "../types/turning";

function InputField({ label, value, onChange, type = "number", placeholder }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" placeholder={placeholder} />
    </div>
  );
}

export default function TurningPage() {
  const [turningParams, setTurningParams] = useState<Partial<TurningParams>>({ material: "", diameter_mm: 0, depth_of_cut_mm: 0 });
  const [threadingParams, setThreadingParams] = useState<Partial<ThreadingParams>>({ material: "", diameter_mm: 0, pitch_mm: 0 });
  const [groovingParams, setGroovingParams] = useState<Partial<GroovingParams>>({ material: "", diameter_mm: 0, groove_width_mm: 0, groove_depth_mm: 0 });
  const [boringParams, setBoringParams] = useState<Partial<BoringParams>>({ material: "", bore_diameter_mm: 0, bore_depth_mm: 0, depth_of_cut_mm: 0 });

  const turning = useTurningCalculate();
  const threading = useTurningThreading();
  const grooving = useTurningGrooving();
  const boring = useTurningBoring();

  const updateTurning = useCallback((field: string, value: string) => {
    setTurningParams(prev => ({ ...prev, [field]: field === "material" || field === "insert_type" || field === "insert_grade" ? value : +value }));
  }, []);

  const updateThreading = useCallback((field: string, value: string) => {
    setThreadingParams(prev => ({ ...prev, [field]: field === "material" || field === "thread_type" || field === "thread_class" || field === "infeed_method" ? value : +value }));
  }, []);

  const updateGrooving = useCallback((field: string, value: string) => {
    setGroovingParams(prev => ({ ...prev, [field]: field === "material" || field === "operation" ? value : +value }));
  }, []);

  const updateBoring = useCallback((field: string, value: string) => {
    setBoringParams(prev => ({ ...prev, [field]: field === "material" ? value : +value }));
  }, []);

  const activeResult = turning.data || threading.data || grooving.data || boring.data;
  const activeError = turning.error || threading.error || grooving.error || boring.error;
  const activeLoading = turning.loading || threading.loading || grooving.loading || boring.loading;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div className="space-y-3">
        <Card>
          <h2 className="text-lg font-bold mb-3">Turning Operations</h2>

          <Tabs defaultValue="general">
            <TabList>
              <Tab value="general">General Turning</Tab>
              <Tab value="threading">Threading</Tab>
              <Tab value="grooving">Grooving</Tab>
              <Tab value="boring">Boring</Tab>
            </TabList>

            <TabPanel value="general">
              <div className="space-y-2 mt-2">
                <InputField label="Material" value={turningParams.material ?? ""} onChange={v => updateTurning("material", v)} type="text" placeholder="e.g. AISI 4140, Aluminum 6061" />
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Diameter (mm)" value={turningParams.diameter_mm ?? ""} onChange={v => updateTurning("diameter_mm", v)} />
                  <InputField label="Length (mm)" value={turningParams.length_mm ?? ""} onChange={v => updateTurning("length_mm", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Depth of Cut (mm)" value={turningParams.depth_of_cut_mm ?? ""} onChange={v => updateTurning("depth_of_cut_mm", v)} />
                  <InputField label="Feed (mm/rev)" value={turningParams.feed_mm_rev ?? ""} onChange={v => updateTurning("feed_mm_rev", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Insert Type" value={turningParams.insert_type ?? ""} onChange={v => updateTurning("insert_type", v)} type="text" placeholder="e.g. CNMG, WNMG" />
                  <InputField label="Nose Radius (mm)" value={turningParams.nose_radius_mm ?? ""} onChange={v => updateTurning("nose_radius_mm", v)} />
                </div>
                <Button onClick={() => turning.execute(turningParams as TurningParams)} disabled={turning.loading} className="w-full mt-2">
                  {turning.loading ? <><Spinner size="sm" /> Calculating...</> : "Calculate Turning"}
                </Button>
              </div>
            </TabPanel>

            <TabPanel value="threading">
              <div className="space-y-2 mt-2">
                <InputField label="Material" value={threadingParams.material ?? ""} onChange={v => updateThreading("material", v)} type="text" placeholder="e.g. AISI 1045" />
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Diameter (mm)" value={threadingParams.diameter_mm ?? ""} onChange={v => updateThreading("diameter_mm", v)} />
                  <InputField label="Pitch (mm)" value={threadingParams.pitch_mm ?? ""} onChange={v => updateThreading("pitch_mm", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Thread Type" value={threadingParams.thread_type ?? ""} onChange={v => updateThreading("thread_type", v)} type="text" placeholder="e.g. ISO, UN, ACME" />
                  <InputField label="Infeed Method" value={threadingParams.infeed_method ?? ""} onChange={v => updateThreading("infeed_method", v)} type="text" placeholder="e.g. radial, flank, modified" />
                </div>
                <InputField label="Number of Passes" value={threadingParams.num_passes ?? ""} onChange={v => updateThreading("num_passes", v)} />
                <Button onClick={() => threading.execute(threadingParams as ThreadingParams)} disabled={threading.loading} className="w-full mt-2">
                  {threading.loading ? <><Spinner size="sm" /> Calculating...</> : "Calculate Threading"}
                </Button>
              </div>
            </TabPanel>

            <TabPanel value="grooving">
              <div className="space-y-2 mt-2">
                <InputField label="Material" value={groovingParams.material ?? ""} onChange={v => updateGrooving("material", v)} type="text" placeholder="e.g. Stainless Steel 316" />
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Diameter (mm)" value={groovingParams.diameter_mm ?? ""} onChange={v => updateGrooving("diameter_mm", v)} />
                  <InputField label="Groove Width (mm)" value={groovingParams.groove_width_mm ?? ""} onChange={v => updateGrooving("groove_width_mm", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Groove Depth (mm)" value={groovingParams.groove_depth_mm ?? ""} onChange={v => updateGrooving("groove_depth_mm", v)} />
                  <InputField label="Feed (mm/rev)" value={groovingParams.feed_mm_rev ?? ""} onChange={v => updateGrooving("feed_mm_rev", v)} />
                </div>
                <Button onClick={() => grooving.execute(groovingParams as GroovingParams)} disabled={grooving.loading} className="w-full mt-2">
                  {grooving.loading ? <><Spinner size="sm" /> Calculating...</> : "Calculate Grooving"}
                </Button>
              </div>
            </TabPanel>

            <TabPanel value="boring">
              <div className="space-y-2 mt-2">
                <InputField label="Material" value={boringParams.material ?? ""} onChange={v => updateBoring("material", v)} type="text" placeholder="e.g. Cast Iron, Aluminum" />
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Bore Diameter (mm)" value={boringParams.bore_diameter_mm ?? ""} onChange={v => updateBoring("bore_diameter_mm", v)} />
                  <InputField label="Bore Depth (mm)" value={boringParams.bore_depth_mm ?? ""} onChange={v => updateBoring("bore_depth_mm", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Depth of Cut (mm)" value={boringParams.depth_of_cut_mm ?? ""} onChange={v => updateBoring("depth_of_cut_mm", v)} />
                  <InputField label="Bar Diameter (mm)" value={boringParams.bar_diameter_mm ?? ""} onChange={v => updateBoring("bar_diameter_mm", v)} />
                </div>
                <InputField label="Finish Required (Ra)" value={boringParams.finish_required_Ra ?? ""} onChange={v => updateBoring("finish_required_Ra", v)} />
                <Button onClick={() => boring.execute(boringParams as BoringParams)} disabled={boring.loading} className="w-full mt-2">
                  {boring.loading ? <><Spinner size="sm" /> Calculating...</> : "Calculate Boring"}
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
            {"cutting_speed_m_min" in activeResult && (
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-xs text-slate-500">Cutting Speed</div>
                  <div className="text-lg font-semibold">{activeResult.cutting_speed_m_min} m/min</div>
                </div>
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-xs text-slate-500">Spindle RPM</div>
                  <div className="text-lg font-semibold">{activeResult.spindle_rpm}</div>
                </div>
                {"power_kW" in activeResult && (
                  <div className="bg-slate-50 rounded p-2">
                    <div className="text-xs text-slate-500">Power</div>
                    <div className="text-lg font-semibold">{String((activeResult as unknown as Record<string, unknown>).power_kW)} kW</div>
                  </div>
                )}
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
              <p className="text-lg mb-2">Turning Operations Calculator</p>
              <p className="text-sm">Calculate speeds, feeds, forces, and tool life for general turning, threading, grooving, and boring operations.</p>
              <div className="mt-4 flex justify-center gap-2">
                <Badge color="blue">General</Badge>
                <Badge color="green">Threading</Badge>
                <Badge color="yellow">Grooving</Badge>
                <Badge color="slate">Boring</Badge>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
