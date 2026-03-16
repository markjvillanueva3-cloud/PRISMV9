import { useState, useCallback } from "react";
import { Card, Button, Spinner, Badge, Tabs, TabList, Tab, TabPanel } from "../components/ui";
import { useCncOpsAssemble, useCncOpsMotion, useCncOpsMagazine, useCncOpsSetupSheet } from "../hooks/useCncOps";
import type { ProgramAssemblyInput } from "../types/cncOps";

export default function CncOpsPage() {
  // Program Assembly state
  const [assemblyInput, setAssemblyInput] = useState<ProgramAssemblyInput>({
    action: "assemble",
    material: "",
    operation_type: "facing",
    tool_diameter_mm: 10,
    depth_of_cut_mm: 1,
    controller: "fanuc",
  });
  const assemble = useCncOpsAssemble();

  // Motion Profile state
  const [motionInput, setMotionInput] = useState({
    axis: "X",
    profile_type: "trapezoidal",
    distance_mm: 100,
    max_velocity_mm_s: 500,
    max_acceleration_mm_s2: 2000,
  });
  const motion = useCncOpsMotion();

  // Magazine state
  const [magazineInput, setMagazineInput] = useState({
    machine_id: "",
    total_pockets: 24,
    optimize: true,
  });
  const magazine = useCncOpsMagazine();

  // Setup Sheet state
  const [setupInput, setSetupInput] = useState({
    part_name: "",
    material: "",
    fixture: "vise",
    program_id: "",
  });
  const setupSheet = useCncOpsSetupSheet();

  const updateAssembly = useCallback((field: string, value: unknown) => {
    setAssemblyInput(prev => ({ ...prev, [field]: value }));
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div className="space-y-3">
        <Card>
          <h2 className="text-lg font-bold mb-3">CNC Operations</h2>

          <Tabs defaultValue="assembly">
            <TabList>
              <Tab value="assembly">Program Assembly</Tab>
              <Tab value="motion">Motion Profile</Tab>
              <Tab value="magazine">Tool Magazine</Tab>
              <Tab value="setup">Setup Sheet</Tab>
            </TabList>

            <TabPanel value="assembly">
              <div className="space-y-2 mt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Material</label>
                  <input type="text" value={assemblyInput.material ?? ""} onChange={e => updateAssembly("material", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="e.g. AISI 4140" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Operation</label>
                    <select value={assemblyInput.operation_type ?? ""} onChange={e => updateAssembly("operation_type", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded">
                      <option value="facing">Facing</option>
                      <option value="pocketing">Pocketing</option>
                      <option value="contouring">Contouring</option>
                      <option value="drilling">Drilling</option>
                      <option value="tapping">Tapping</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Controller</label>
                    <select value={assemblyInput.controller ?? ""} onChange={e => updateAssembly("controller", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded">
                      <option value="fanuc">Fanuc</option>
                      <option value="siemens">Siemens</option>
                      <option value="heidenhain">Heidenhain</option>
                      <option value="haas">Haas</option>
                      <option value="mazak">Mazak</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Tool Dia (mm)</label>
                    <input type="number" value={assemblyInput.tool_diameter_mm ?? ""} onChange={e => updateAssembly("tool_diameter_mm", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Depth of Cut (mm)</label>
                    <input type="number" value={assemblyInput.depth_of_cut_mm ?? ""} onChange={e => updateAssembly("depth_of_cut_mm", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
                  </div>
                </div>
                <Button onClick={() => assemble.execute(assemblyInput)} disabled={assemble.loading} className="w-full mt-2">
                  {assemble.loading ? <><Spinner size="sm" /> Assembling...</> : "Assemble Program"}
                </Button>
                {assemble.error && <p className="mt-2 text-xs text-red-600">{assemble.error}</p>}
              </div>
            </TabPanel>

            <TabPanel value="motion">
              <div className="space-y-2 mt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Axis</label>
                    <select value={motionInput.axis} onChange={e => setMotionInput(p => ({ ...p, axis: e.target.value }))} className="w-full px-2 py-1.5 text-sm border rounded">
                      <option value="X">X</option><option value="Y">Y</option><option value="Z">Z</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Profile</label>
                    <select value={motionInput.profile_type} onChange={e => setMotionInput(p => ({ ...p, profile_type: e.target.value }))} className="w-full px-2 py-1.5 text-sm border rounded">
                      <option value="trapezoidal">Trapezoidal</option><option value="s-curve">S-Curve</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Distance (mm)</label>
                    <input type="number" value={motionInput.distance_mm} onChange={e => setMotionInput(p => ({ ...p, distance_mm: +e.target.value }))} className="w-full px-2 py-1.5 text-sm border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Max Vel (mm/s)</label>
                    <input type="number" value={motionInput.max_velocity_mm_s} onChange={e => setMotionInput(p => ({ ...p, max_velocity_mm_s: +e.target.value }))} className="w-full px-2 py-1.5 text-sm border rounded" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Max Accel (mm/s2)</label>
                  <input type="number" value={motionInput.max_acceleration_mm_s2} onChange={e => setMotionInput(p => ({ ...p, max_acceleration_mm_s2: +e.target.value }))} className="w-full px-2 py-1.5 text-sm border rounded" />
                </div>
                <Button onClick={() => motion.execute(motionInput)} disabled={motion.loading} className="w-full mt-2">
                  {motion.loading ? <><Spinner size="sm" /> Computing...</> : "Compute Motion Profile"}
                </Button>
                {motion.error && <p className="mt-2 text-xs text-red-600">{motion.error}</p>}
              </div>
            </TabPanel>

            <TabPanel value="magazine">
              <div className="space-y-2 mt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Machine ID</label>
                  <input type="text" value={magazineInput.machine_id} onChange={e => setMagazineInput(p => ({ ...p, machine_id: e.target.value }))} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="e.g. DMU-50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Total Pockets</label>
                  <input type="number" value={magazineInput.total_pockets} onChange={e => setMagazineInput(p => ({ ...p, total_pockets: +e.target.value }))} className="w-full px-2 py-1.5 text-sm border rounded" />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={magazineInput.optimize} onChange={e => setMagazineInput(p => ({ ...p, optimize: e.target.checked }))} />
                  Optimize layout
                </label>
                <Button onClick={() => magazine.execute(magazineInput)} disabled={magazine.loading} className="w-full mt-2">
                  {magazine.loading ? <><Spinner size="sm" /> Loading...</> : "Get Magazine Layout"}
                </Button>
                {magazine.error && <p className="mt-2 text-xs text-red-600">{magazine.error}</p>}
              </div>
            </TabPanel>

            <TabPanel value="setup">
              <div className="space-y-2 mt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Part Name</label>
                  <input type="text" value={setupInput.part_name} onChange={e => setSetupInput(p => ({ ...p, part_name: e.target.value }))} className="w-full px-2 py-1.5 text-sm border rounded" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Material</label>
                  <input type="text" value={setupInput.material} onChange={e => setSetupInput(p => ({ ...p, material: e.target.value }))} className="w-full px-2 py-1.5 text-sm border rounded" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Fixture</label>
                  <select value={setupInput.fixture} onChange={e => setSetupInput(p => ({ ...p, fixture: e.target.value }))} className="w-full px-2 py-1.5 text-sm border rounded">
                    <option value="vise">Vise</option><option value="chuck">Chuck</option><option value="fixture_plate">Fixture Plate</option><option value="vacuum">Vacuum</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Program ID</label>
                  <input type="text" value={setupInput.program_id} onChange={e => setSetupInput(p => ({ ...p, program_id: e.target.value }))} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="O0001" />
                </div>
                <Button onClick={() => setupSheet.execute(setupInput)} disabled={setupSheet.loading} className="w-full mt-2">
                  {setupSheet.loading ? <><Spinner size="sm" /> Generating...</> : "Generate Setup Sheet"}
                </Button>
                {setupSheet.error && <p className="mt-2 text-xs text-red-600">{setupSheet.error}</p>}
              </div>
            </TabPanel>
          </Tabs>
        </Card>
      </div>

      <div className="lg:col-span-2">
        {assemble.data ? (
          <Card>
            <h3 className="font-bold mb-3">Program Assembly Result</h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center p-2 bg-slate-50 rounded">
                <div className="text-xs text-slate-500">Lines</div>
                <div className="text-lg font-bold">{(assemble.data as { line_count?: number }).line_count}</div>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded">
                <div className="text-xs text-slate-500">Cycle Time</div>
                <div className="text-lg font-bold">{(assemble.data as { estimated_cycle_time_s?: number }).estimated_cycle_time_s}s</div>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded">
                <div className="text-xs text-slate-500">Tool Changes</div>
                <div className="text-lg font-bold">{(assemble.data as { tool_changes?: number }).tool_changes}</div>
              </div>
            </div>
            <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-96 whitespace-pre-wrap">{JSON.stringify(assemble.data, null, 2)}</pre>
          </Card>
        ) : motion.data ? (
          <Card>
            <h3 className="font-bold mb-3">Motion Profile</h3>
            <div className="flex gap-2 mb-3">
              <Badge color="blue">{(motion.data as { profile_type?: string }).profile_type}</Badge>
              <Badge color="green">{(motion.data as { total_time_s?: number }).total_time_s}s total</Badge>
            </div>
            <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-96 whitespace-pre-wrap">{JSON.stringify(motion.data, null, 2)}</pre>
          </Card>
        ) : magazine.data ? (
          <Card>
            <h3 className="font-bold mb-3">Tool Magazine Layout</h3>
            <div className="flex gap-2 mb-3">
              <Badge color="blue">{(magazine.data as { occupied?: number }).occupied}/{(magazine.data as { total_pockets?: number }).total_pockets} pockets</Badge>
            </div>
            <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-96 whitespace-pre-wrap">{JSON.stringify(magazine.data, null, 2)}</pre>
          </Card>
        ) : setupSheet.data ? (
          <Card>
            <h3 className="font-bold mb-3">Setup Sheet</h3>
            <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-96 whitespace-pre-wrap">{JSON.stringify(setupSheet.data, null, 2)}</pre>
          </Card>
        ) : (
          <Card>
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg mb-2">CNC Operations Hub</p>
              <p className="text-sm">Program assembly, motion profiling, tool magazine management, and setup sheet generation.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
