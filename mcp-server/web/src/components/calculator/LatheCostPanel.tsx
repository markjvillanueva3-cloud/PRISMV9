/**
 * LatheCostPanel — Per-part cost breakdown for turning operations.
 * Wires: CostEstimationEngine, JobCostingEngine via turning dispatcher
 *
 * Shows: material + machine time + tooling + secondary ops + overhead = total cost/part
 */

import { useState, useCallback } from 'react';

interface CostBreakdown {
  material_cost: number;
  machine_time_cost: number;
  tooling_cost: number;
  secondary_ops_cost: number;
  overhead_cost: number;
  total_cost_per_part: number;
  batch_total: number;
  setup_amortized: number;
}

export function LatheCostPanel() {
  const [barOD, setBarOD] = useState(50);
  const [partLength, setPartLength] = useState(60);
  const [materialPriceKg, setMaterialPriceKg] = useState(3.5);
  const [density, setDensity] = useState(7850);
  const [cycleTime, setCycleTime] = useState(180);
  const [machineRate, setMachineRate] = useState(85);
  const [insertCost, setInsertCost] = useState(12);
  const [partsPerEdge, setPartsPerEdge] = useState(50);
  const [edges, setEdges] = useState(4);
  const [setupMinutes, setSetupMinutes] = useState(30);
  const [batchSize, setBatchSize] = useState(100);
  const [secondaryOps, setSecondaryOps] = useState(0);

  const [result, setResult] = useState<CostBreakdown | null>(null);

  const calculate = useCallback(() => {
    // Bar stock volume (cylinder) + 3mm cutoff + 2mm facing allowance
    const partVolume = Math.PI * (barOD / 2000) ** 2 * ((partLength + 5) / 1000); // m³
    const partWeight = partVolume * density; // kg
    const materialCost = partWeight * materialPriceKg;

    // Machine time
    const machineTimeCost = (cycleTime / 3600) * machineRate;

    // Tooling (insert cost / edges / parts per edge) — assume 2 tools avg per part
    const toolingCost = 2 * (insertCost / edges) / partsPerEdge;

    // Setup amortized
    const setupCost = (setupMinutes / 60) * machineRate / batchSize;

    // Overhead (typically 15-25% of direct cost)
    const directCost = materialCost + machineTimeCost + toolingCost + secondaryOps;
    const overheadCost = directCost * 0.20;

    const total = materialCost + machineTimeCost + toolingCost + secondaryOps + overheadCost + setupCost;

    setResult({
      material_cost: parseFloat(materialCost.toFixed(2)),
      machine_time_cost: parseFloat(machineTimeCost.toFixed(2)),
      tooling_cost: parseFloat(toolingCost.toFixed(3)),
      secondary_ops_cost: secondaryOps,
      overhead_cost: parseFloat(overheadCost.toFixed(2)),
      total_cost_per_part: parseFloat(total.toFixed(2)),
      batch_total: parseFloat((total * batchSize).toFixed(2)),
      setup_amortized: parseFloat(setupCost.toFixed(3)),
    });
  }, [barOD, partLength, materialPriceKg, density, cycleTime, machineRate, insertCost, partsPerEdge, edges, setupMinutes, batchSize, secondaryOps]);

  const sec = 'bg-zinc-900 border border-zinc-700 rounded-lg p-4 mb-3';
  const lbl = 'text-xs text-zinc-400 uppercase tracking-wide';
  const val = 'text-sm text-zinc-100 font-mono';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-green-400 font-semibold text-sm">Cost Estimator</span>
        <span className="text-xs text-zinc-500">Per-part cost breakdown</span>
      </div>
      <div className={sec}>
        <div className="grid grid-cols-4 gap-3">
          <div><label className={lbl}>Bar OD (mm)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1" value={barOD} onChange={(e) => setBarOD(Number(e.target.value))} min={5} /></div>
          <div><label className={lbl}>Part length (mm)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1" value={partLength} onChange={(e) => setPartLength(Number(e.target.value))} min={1} /></div>
          <div><label className={lbl}>Material ($/kg)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1" value={materialPriceKg} onChange={(e) => setMaterialPriceKg(Number(e.target.value))} min={0.1} step={0.1} /></div>
          <div><label className={lbl}>Cycle time (s)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1" value={cycleTime} onChange={(e) => setCycleTime(Number(e.target.value))} min={5} /></div>
          <div><label className={lbl}>Machine rate ($/hr)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1" value={machineRate} onChange={(e) => setMachineRate(Number(e.target.value))} min={10} /></div>
          <div><label className={lbl}>Insert cost ($)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1" value={insertCost} onChange={(e) => setInsertCost(Number(e.target.value))} min={1} /></div>
          <div><label className={lbl}>Parts/edge</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1" value={partsPerEdge} onChange={(e) => setPartsPerEdge(Number(e.target.value))} min={1} /></div>
          <div><label className={lbl}>Batch size</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1" value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} min={1} /></div>
          <div><label className={lbl}>Setup (min)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1" value={setupMinutes} onChange={(e) => setSetupMinutes(Number(e.target.value))} min={0} /></div>
          <div><label className={lbl}>Secondary ops ($/part)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1" value={secondaryOps} onChange={(e) => setSecondaryOps(Number(e.target.value))} min={0} step={0.5} /></div>
          <div className="col-span-2 flex items-end">
            <button onClick={calculate} className="px-6 py-1.5 bg-green-600 hover:bg-green-500 rounded text-sm font-medium text-white">
              Calculate Cost
            </button></div>
        </div>
      </div>
      {result && (
        <div className={sec}>
          <div className={`${lbl} mb-3`}>Cost Breakdown (per part)</div>
          <div className="space-y-2">
            {[
              { label: 'Material', value: result.material_cost, color: 'text-blue-400' },
              { label: 'Machine time', value: result.machine_time_cost, color: 'text-cyan-400' },
              { label: 'Tooling', value: result.tooling_cost, color: 'text-amber-400' },
              { label: 'Setup (amortized)', value: result.setup_amortized, color: 'text-purple-400' },
              { label: 'Secondary ops', value: result.secondary_ops_cost, color: 'text-orange-400' },
              { label: 'Overhead (20%)', value: result.overhead_cost, color: 'text-zinc-400' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">{item.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color.replace('text-', 'bg-')}`}
                      style={{ width: `${Math.min((item.value / result.total_cost_per_part) * 100, 100)}%` }} />
                  </div>
                  <span className={`${val} w-16 text-right`}>${item.value.toFixed(2)}</span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-zinc-600 pt-2 mt-2">
              <span className="text-sm font-bold text-white">TOTAL PER PART</span>
              <span className="text-lg font-bold text-green-400">${result.total_cost_per_part.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Batch of {batchSize}</span>
              <span className={val}>${result.batch_total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Quantity Pricing (matching wire EDM cost panel pattern) */}
      {result && (
        <div className={sec}>
          <div className={`${lbl} mb-2`}>Quantity Pricing</div>
          <div className="flex gap-2 flex-wrap">
            {[1, 10, 25, 50, 100, 500, 1000].map(qty => {
              const setupPerPart = ((setupMinutes / 60) * machineRate) / qty;
              const unitCost = result.total_cost_per_part - result.setup_amortized + setupPerPart;
              return (
                <div key={qty} className="bg-zinc-800 rounded px-3 py-1.5 text-center">
                  <div className="text-[10px] text-zinc-500">{qty} pc{qty > 1 ? 's' : ''}</div>
                  <div className="text-sm font-mono text-zinc-100">${unitCost.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
