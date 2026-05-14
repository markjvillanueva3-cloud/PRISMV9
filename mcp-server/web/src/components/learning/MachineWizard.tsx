/**
 * L8-P1-MS2 P0-U09: Machine Selection Wizard
 * Wizard: part requirements -> machine recommendations -> comparison.
 */
import { useState } from 'react';
import { useMachineSelect } from '../../hooks/useLearning';
import { LoadingState } from '../LoadingState';
import { ErrorState } from '../ErrorState';
import type { MachineRecommendation } from '../../types/learning';

const OPERATION_OPTIONS = [
  '3-Axis Milling', '4-Axis Milling', '5-Axis Milling',
  'Turning', 'Mill-Turn', 'Drilling', 'Grinding', 'EDM',
];

type Step = 'input' | 'results' | 'compare';

export function MachineWizard() {
  const [step, setStep] = useState<Step>('input');
  const [dimX, setDimX] = useState(300);
  const [dimY, setDimY] = useState(200);
  const [dimZ, setDimZ] = useState(100);
  const [material, setMaterial] = useState('');
  const [tolerance, setTolerance] = useState(0.01);
  const [operations, setOperations] = useState<string[]>([]);
  const [axes, setAxes] = useState(3);
  const [selected, setSelected] = useState<MachineRecommendation[]>([]);
  const { machines, loading, error, selectMachine } = useMachineSelect();

  function toggleOp(op: string) {
    setOperations(prev => prev.includes(op) ? prev.filter(x => x !== op) : [...prev, op]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await selectMachine({
      part_requirements: {
        max_dimension_mm: { x: dimX, y: dimY, z: dimZ },
        ...(material && { material }),
        tolerance_mm: tolerance,
        operations: operations.length > 0 ? operations : undefined,
        axes_required: axes,
      },
      count: 10,
    });
    if (res) setStep('results');
  }

  function toggleCompare(m: MachineRecommendation) {
    setSelected(prev =>
      prev.find(x => x.id === m.id) ? prev.filter(x => x.id !== m.id) : [...prev, m]
    );
  }

  if (error) return <ErrorState message={error} onRetry={() => setStep('input')} />;

  // Compare view
  if (step === 'compare' && selected.length >= 2) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Machine Comparison</h1>
          <button onClick={() => setStep('results')} className="text-sm text-prism-600 hover:text-prism-700 font-medium">
            Back to Results
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-lg border border-gray-200">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="p-3 text-left text-sm font-medium text-gray-500">Spec</th>
                {selected.map(m => (
                  <th key={m.id} className="p-3 text-left text-sm font-medium text-gray-900">{m.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {([
                ['Match', (m: MachineRecommendation) => `${Math.round(m.match_score * 100)}%`],
                ['Type', (m: MachineRecommendation) => m.type],
                ['Manufacturer', (m: MachineRecommendation) => m.manufacturer],
                ['Axes', (m: MachineRecommendation) => `${m.specs.axes}`],
                ['Table (mm)', (m: MachineRecommendation) => `${m.specs.table_mm.x} \u00d7 ${m.specs.table_mm.y}`],
                ['Max RPM', (m: MachineRecommendation) => m.specs.spindle_rpm_max.toLocaleString()],
                ['Power (kW)', (m: MachineRecommendation) => `${m.specs.power_kw}`],
                ['Accuracy (mm)', (m: MachineRecommendation) => `${m.specs.accuracy_mm}`],
                ['Weight (kg)', (m: MachineRecommendation) => m.specs.weight_kg.toLocaleString()],
              ] as [string, (m: MachineRecommendation) => string][]).map(([label, fn]) => (
                <tr key={label} className="border-b border-gray-100">
                  <td className="p-3 text-sm text-gray-500">{label}</td>
                  {selected.map(m => (
                    <td key={m.id} className="p-3 text-sm text-gray-700">{fn(m)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Results
  if (step === 'results' && machines) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Machine Recommendations</h1>
            <p className="text-sm text-gray-500 mt-1">{machines.length} machines found</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep('input')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
              Refine
            </button>
            {selected.length >= 2 && (
              <button onClick={() => setStep('compare')} className="px-4 py-2 bg-prism-600 text-white rounded-lg text-sm font-medium hover:bg-prism-700">
                Compare ({selected.length})
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {machines.map((m: MachineRecommendation) => (
            <div key={m.id} className={`bg-white rounded-lg border p-4 ${
              selected.find(x => x.id === m.id) ? 'border-prism-500 ring-1 ring-prism-300' : 'border-gray-200'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!selected.find(x => x.id === m.id)}
                      onChange={() => toggleCompare(m)}
                      className="rounded border-gray-300 text-prism-600 focus:ring-prism-500"
                    />
                    <span className="font-medium text-gray-900">{m.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{m.type}</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">{m.manufacturer}</div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <MiniSpec label="Axes" value={`${m.specs.axes}`} />
                    <MiniSpec label="Table" value={`${m.specs.table_mm.x}\u00d7${m.specs.table_mm.y}mm`} />
                    <MiniSpec label="RPM" value={m.specs.spindle_rpm_max.toLocaleString()} />
                    <MiniSpec label="Power" value={`${m.specs.power_kw}kW`} />
                    <MiniSpec label="Accuracy" value={`${m.specs.accuracy_mm}mm`} />
                  </div>
                  {m.capabilities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {m.capabilities.map(c => (
                        <span key={c} className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right ml-4">
                  <div className="text-lg font-bold text-prism-600">{Math.round(m.match_score * 100)}%</div>
                  <div className="text-xs text-gray-400">match</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Input form
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Machine Selection Wizard</h1>
        <p className="text-sm text-gray-500 mt-1">Define part requirements to find suitable machines</p>
      </div>

      {loading && <LoadingState label="Finding machines..." />}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Part Dimensions (mm)</label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500">X</label>
              <input type="number" value={dimX} onChange={e => setDimX(+e.target.value)} min={1}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-prism-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Y</label>
              <input type="number" value={dimY} onChange={e => setDimY(+e.target.value)} min={1}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-prism-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Z</label>
              <input type="number" value={dimZ} onChange={e => setDimZ(+e.target.value)} min={1}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-prism-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Material (optional)</label>
            <input type="text" value={material} onChange={e => setMaterial(e.target.value)}
              placeholder="e.g., Titanium"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-prism-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tolerance (mm)</label>
            <input type="number" value={tolerance} onChange={e => setTolerance(+e.target.value)} min={0.001} step={0.001}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-prism-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Axes Required</label>
            <select value={axes} onChange={e => setAxes(+e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-prism-500">
              <option value={3}>3-Axis</option>
              <option value={4}>4-Axis</option>
              <option value={5}>5-Axis</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Operations Needed</label>
          <div className="flex flex-wrap gap-2">
            {OPERATION_OPTIONS.map(op => (
              <button key={op} type="button" onClick={() => toggleOp(op)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  operations.includes(op) ? 'border-prism-500 bg-prism-50 text-prism-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {op}
              </button>
            ))}
          </div>
        </div>

        <button type="submit"
          className="px-6 py-2.5 bg-prism-600 text-white rounded-lg font-medium hover:bg-prism-700 transition-colors">
          Find Machines
        </button>
      </form>
    </div>
  );
}

function MiniSpec({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-xs px-2 py-1 bg-gray-50 rounded text-gray-600">
      <span className="text-gray-400">{label}:</span> {value}
    </span>
  );
}
