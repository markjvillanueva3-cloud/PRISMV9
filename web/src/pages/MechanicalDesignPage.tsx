import { useState, useCallback } from "react";
import { Card, Button, Spinner, Tabs, TabList, Tab, TabPanel } from "../components/ui";
import { useMechanicalCalculate } from "../hooks/useMechanical";
import type { MechanicalInput } from "../types/mechanical";

const CATEGORIES = [
  { id: "gear", label: "Gears", actions: ["bevel_gear_calculate", "worm_gear_calculate", "planetary_gear_calculate", "gear_train_calculate", "harmonic_drive_calculate", "rack_pinion_calculate"] },
  { id: "bearing", label: "Bearings", actions: ["bearing_select", "rolling_bearing_calculate", "journal_bearing_calculate"] },
  { id: "spring", label: "Springs", actions: ["spring_calculate", "spring_design", "leaf_spring_calculate", "torsion_bar_calculate"] },
  { id: "shaft", label: "Shafts & Keys", actions: ["shaft_alignment_calculate", "keyway_design_calculate", "spline_joint_calculate"] },
  { id: "fastener", label: "Fasteners", actions: ["bolt_torque_calculate", "bolted_joint_calculate", "rivet_joint_calculate", "flange_bolt_calculate"] },
  { id: "coupling", label: "Couplings", actions: ["coupling_calculate", "clutch_design_calculate", "clutch_brake_calculate"] },
  { id: "brake", label: "Brakes", actions: ["disk_brake_calculate", "drum_brake_calculate", "shock_absorber_calculate"] },
  { id: "drivetrain", label: "Drivetrain", actions: ["belt_drive_calculate", "chain_drive_calculate", "ball_screw_calculate", "lead_screw_calculate", "linear_guide_calculate", "cycloid_drive_calculate"] },
  { id: "structural", label: "Structural", actions: ["flywheel_calculate", "gasket_design_calculate", "hertz_contact_calculate", "column_buckling_calculate", "connecting_rod_calculate", "piston_design_calculate"] },
];

export default function MechanicalDesignPage() {
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [action, setAction] = useState(CATEGORIES[0].actions[0]);
  const [input, setInput] = useState<MechanicalInput>({ action: CATEGORIES[0].actions[0] });
  const calc = useMechanicalCalculate();

  const handleCategoryChange = useCallback((catId: string) => {
    const cat = CATEGORIES.find(c => c.id === catId) ?? CATEGORIES[0];
    setCategory(catId);
    setAction(cat.actions[0]);
    setInput({ action: cat.actions[0] });
  }, []);

  const handleCalculate = useCallback(() => {
    calc.execute(category, { ...input, action });
  }, [category, action, input, calc]);

  const update = useCallback((field: string, value: unknown) => {
    setInput(prev => ({ ...prev, [field]: value }));
  }, []);

  const result = calc.data as { result?: { value?: unknown; formulas_used?: string[]; warnings?: string[] } } | null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div className="space-y-3">
        <Card>
          <h2 className="text-lg font-bold mb-3">Mechanical Design Calculator</h2>

          <Tabs defaultValue="gear">
            <TabList>
              {CATEGORIES.map(c => (
                <Tab key={c.id} value={c.id}>{c.label}</Tab>
              ))}
            </TabList>
            {CATEGORIES.map(c => (
              <TabPanel key={c.id} value={c.id}>
                <div className="mt-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Calculation</label>
                  <select
                    value={c.id === category ? action : c.actions[0]}
                    onChange={e => { handleCategoryChange(c.id); setAction(e.target.value); setInput({ action: e.target.value }); }}
                    className="w-full px-2 py-1.5 text-sm border rounded mb-2"
                  >
                    {c.actions.map(a => (
                      <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
              </TabPanel>
            ))}
          </Tabs>

          <div className="space-y-2 mt-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Torque (Nm)</label>
                <input type="number" value={input.torque_Nm ?? ""} onChange={e => update("torque_Nm", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Speed (RPM)</label>
                <input type="number" value={input.speed_rpm ?? ""} onChange={e => update("speed_rpm", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Power (kW)</label>
                <input type="number" value={input.power_kw ?? ""} onChange={e => update("power_kw", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Diameter (mm)</label>
                <input type="number" value={input.diameter_mm ?? ""} onChange={e => update("diameter_mm", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Force (N)</label>
                <input type="number" value={input.force_N ?? ""} onChange={e => update("force_N", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Safety Factor</label>
                <input type="number" value={input.safety_factor ?? ""} onChange={e => update("safety_factor", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Material</label>
              <input type="text" value={input.material ?? ""} onChange={e => update("material", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="e.g. AISI 4140, S45C" />
            </div>
          </div>

          <Button onClick={handleCalculate} disabled={calc.loading} className="w-full mt-3">
            {calc.loading ? <><Spinner size="sm" /> Calculating...</> : "Calculate"}
          </Button>
          {calc.error && <p className="mt-2 text-xs text-red-600">{calc.error}</p>}
        </Card>
      </div>

      <div className="lg:col-span-2">
        {result?.result ? (
          <Card>
            <h3 className="font-bold mb-3">Results — {action.replace(/_/g, " ")}</h3>
            <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-96 whitespace-pre-wrap">
              {JSON.stringify(result.result.value, null, 2)}
            </pre>
            {result.result.formulas_used && result.result.formulas_used.length > 0 && (
              <div className="mt-3 text-xs text-slate-400">Formulas: {result.result.formulas_used.join(", ")}</div>
            )}
            {result.result.warnings && result.result.warnings.length > 0 && (
              <div className="mt-2 space-y-1">
                {result.result.warnings.map((w: string, i: number) => (
                  <div key={i} className="text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-800">{w}</div>
                ))}
              </div>
            )}
          </Card>
        ) : !calc.loading ? (
          <Card>
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg mb-2">Select a calculation and enter parameters</p>
              <p className="text-sm">51 mechanical engineering calculations: gears, bearings, springs, shafts, fasteners, couplings, brakes, drivetrain, and structural analysis.</p>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
