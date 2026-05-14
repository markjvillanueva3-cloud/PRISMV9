/**
 * L8-P1-MS2 P0-U07: Material Selection Wizard
 * Step wizard: requirements -> recommendations -> comparison -> selection.
 */
import { useState } from 'react';
import { useMaterialSelect } from '../../hooks/useLearning';
import { LoadingState } from '../LoadingState';
import { ErrorState } from '../ErrorState';
import type { MaterialRecommendation } from '../../types/learning';

interface Requirements {
  application: string;
  hardness_range: [number, number];
  tensile_min_mpa: number;
  corrosion_resistant: boolean;
  weldable: boolean;
  machinable: boolean;
}

const INITIAL_REQ: Requirements = {
  application: '',
  hardness_range: [20, 60],
  tensile_min_mpa: 300,
  corrosion_resistant: false,
  weldable: false,
  machinable: true,
};

type Step = 'requirements' | 'results' | 'compare';

export function MaterialWizard() {
  const [step, setStep] = useState<Step>('requirements');
  const [req, setReq] = useState<Requirements>(INITIAL_REQ);
  const [selected, setSelected] = useState<MaterialRecommendation[]>([]);
  const { materials, loading, error, selectMaterial } = useMaterialSelect();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await selectMaterial({
      requirements: {
        ...(req.application && { application: req.application }),
        hardness_range: req.hardness_range,
        tensile_min_mpa: req.tensile_min_mpa,
        corrosion_resistant: req.corrosion_resistant,
        weldable: req.weldable,
        machinable: req.machinable,
      },
      count: 10,
    });
    if (res) setStep('results');
  }

  function toggleCompare(mat: MaterialRecommendation) {
    setSelected(prev =>
      prev.find(m => m.id === mat.id) ? prev.filter(m => m.id !== mat.id) : [...prev, mat]
    );
  }

  if (error) return <ErrorState message={error} onRetry={() => setStep('requirements')} />;

  // Compare view
  if (step === 'compare' && selected.length >= 2) {
    const propKeys = [...new Set(selected.flatMap(m => Object.keys(m.properties)))];
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Material Comparison</h1>
          <button onClick={() => setStep('results')} className="text-sm text-prism-600 hover:text-prism-700 font-medium">
            Back to Results
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-lg border border-gray-200">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="p-3 text-left text-sm font-medium text-gray-500">Property</th>
                {selected.map(m => (
                  <th key={m.id} className="p-3 text-left text-sm font-medium text-gray-900">{m.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="p-3 text-sm text-gray-500">Match Score</td>
                {selected.map(m => (
                  <td key={m.id} className="p-3 text-sm font-medium text-prism-600">{Math.round(m.match_score * 100)}%</td>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3 text-sm text-gray-500">ISO Group</td>
                {selected.map(m => (
                  <td key={m.id} className="p-3 text-sm text-gray-700">{m.iso_group}</td>
                ))}
              </tr>
              {propKeys.map(key => (
                <tr key={key} className="border-b border-gray-100">
                  <td className="p-3 text-sm text-gray-500">{key}</td>
                  {selected.map(m => (
                    <td key={m.id} className="p-3 text-sm text-gray-700">{m.properties[key] ?? '\u2014'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Results view
  if (step === 'results' && materials) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Material Recommendations</h1>
            <p className="text-sm text-gray-500 mt-1">{materials.length} materials found</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStep('requirements')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Refine
            </button>
            {selected.length >= 2 && (
              <button
                onClick={() => setStep('compare')}
                className="px-4 py-2 bg-prism-600 text-white rounded-lg text-sm font-medium hover:bg-prism-700 transition-colors"
              >
                Compare ({selected.length})
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {materials.map(mat => (
            <div
              key={mat.id}
              className={`bg-white rounded-lg border p-4 transition-all ${
                selected.find(m => m.id === mat.id) ? 'border-prism-500 ring-1 ring-prism-300' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!selected.find(m => m.id === mat.id)}
                      onChange={() => toggleCompare(mat)}
                      className="rounded border-gray-300 text-prism-600 focus:ring-prism-500"
                    />
                    <span className="font-medium text-gray-900">{mat.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{mat.iso_group}</span>
                  </div>
                  <div className="flex gap-4 mt-2">
                    <div>
                      <span className="text-xs text-emerald-600 font-medium">Pros: </span>
                      <span className="text-xs text-gray-600">{mat.pros.join(', ')}</span>
                    </div>
                    <div>
                      <span className="text-xs text-amber-600 font-medium">Cons: </span>
                      <span className="text-xs text-gray-600">{mat.cons.join(', ')}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-lg font-bold text-prism-600">{Math.round(mat.match_score * 100)}%</div>
                  <div className="text-xs text-gray-400">match</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Requirements form
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Material Selection Wizard</h1>
        <p className="text-sm text-gray-500 mt-1">Define your requirements to find the best material</p>
      </div>

      {loading && <LoadingState label="Finding materials..." />}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Application</label>
          <input
            type="text"
            value={req.application}
            onChange={e => setReq(prev => ({ ...prev, application: e.target.value }))}
            placeholder="e.g., aerospace bracket, automotive shaft"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-prism-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hardness Range (HRC): {req.hardness_range[0]}–{req.hardness_range[1]}
            </label>
            <div className="flex gap-2">
              <input type="number" value={req.hardness_range[0]} min={0} max={70}
                onChange={e => setReq(prev => ({ ...prev, hardness_range: [+e.target.value, prev.hardness_range[1]] }))}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-prism-500" />
              <span className="self-center text-gray-400">to</span>
              <input type="number" value={req.hardness_range[1]} min={0} max={70}
                onChange={e => setReq(prev => ({ ...prev, hardness_range: [prev.hardness_range[0], +e.target.value] }))}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-prism-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Tensile Strength (MPa)</label>
            <input type="number" value={req.tensile_min_mpa} min={0}
              onChange={e => setReq(prev => ({ ...prev, tensile_min_mpa: +e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-prism-500" />
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          {(['corrosion_resistant', 'weldable', 'machinable'] as const).map(field => (
            <label key={field} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={req[field]}
                onChange={e => setReq(prev => ({ ...prev, [field]: e.target.checked }))}
                className="rounded border-gray-300 text-prism-600 focus:ring-prism-500"
              />
              <span className="text-sm text-gray-700">{field.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}</span>
            </label>
          ))}
        </div>

        <button
          type="submit"
          className="px-6 py-2.5 bg-prism-600 text-white rounded-lg font-medium hover:bg-prism-700 transition-colors"
        >
          Find Materials
        </button>
      </form>
    </div>
  );
}
