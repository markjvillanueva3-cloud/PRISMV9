/**
 * Injection Mold Quote Page — Mold cost, per-part pricing, DFM analysis.
 */
import { useState, useEffect } from 'react';
import { injectionMoldQuote, injectionMoldMaterials, injectionMoldDfm, ApiError } from '../api/shop';
import { LoadingState, ErrorState } from '../components/shared/LoadingState';
import type { InjectionMoldQuoteResult, InjectionMoldMaterial, DfmResult } from '../api/shopTypes';

type Tab = 'quote' | 'materials' | 'dfm';

export function InjectionMoldPage() {
  const [tab, setTab] = useState<Tab>('quote');
  const [result, setResult] = useState<InjectionMoldQuoteResult | null>(null);
  const [materials, setMaterials] = useState<InjectionMoldMaterial[]>([]);
  const [dfm, setDfm] = useState<DfmResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    material: 'ABS', quantity: '10000', part_volume_cm3: '25', part_weight_g: '28',
    num_cavities: '4', wall_thickness_mm: '2.5', num_undercuts: '0',
    projected_area_cm2: '30', runner_type: 'hot',
  });

  async function handleQuote() {
    setLoading(true);
    setError(null);
    try {
      const r = await injectionMoldQuote({
        material: form.material,
        quantity: parseInt(form.quantity) || 10000,
        part_volume_cm3: parseFloat(form.part_volume_cm3) || 25,
        part_weight_g: parseFloat(form.part_weight_g) || 28,
        num_cavities: parseInt(form.num_cavities) || 4,
        wall_thickness_mm: parseFloat(form.wall_thickness_mm) || 2.5,
        num_undercuts: parseInt(form.num_undercuts) || 0,
        projected_area_cm2: parseFloat(form.projected_area_cm2) || 30,
        runner_type: form.runner_type,
      });
      setResult(r.result as unknown as InjectionMoldQuoteResult);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to generate quote');
    } finally {
      setLoading(false);
    }
  }

  async function loadMaterials() {
    setLoading(true);
    try {
      const r = await injectionMoldMaterials();
      setMaterials((r.result as any)?.materials ?? (r.result as any) ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  }

  async function runDfm() {
    setLoading(true);
    setError(null);
    try {
      const r = await injectionMoldDfm({
        wall_thickness_mm: parseFloat(form.wall_thickness_mm) || 2.5,
        num_undercuts: parseInt(form.num_undercuts) || 0,
        draft_angle_deg: 1.5,
        material: form.material,
      });
      setDfm(r.result as unknown as DfmResult);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'DFM analysis failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'materials') loadMaterials();
    if (tab === 'dfm') runDfm();
  }, [tab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'quote', label: 'Mold Quote' },
    { key: 'materials', label: 'Materials' },
    { key: 'dfm', label: 'DFM Check' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Injection Mold Quote</h1>
        <p className="text-sm text-gray-500 mt-1">Mold tooling cost, per-part pricing, and DFM analysis.</p>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded text-sm font-medium ${tab === t.key ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'quote' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Material', key: 'material', type: 'text' },
              { label: 'Production Qty', key: 'quantity', type: 'number' },
              { label: 'Part Volume (cm³)', key: 'part_volume_cm3', type: 'number' },
              { label: 'Part Weight (g)', key: 'part_weight_g', type: 'number' },
              { label: 'Cavities', key: 'num_cavities', type: 'number' },
              { label: 'Wall (mm)', key: 'wall_thickness_mm', type: 'number' },
              { label: 'Undercuts', key: 'num_undercuts', type: 'number' },
              { label: 'Proj. Area (cm²)', key: 'projected_area_cm2', type: 'number' },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Runner</label>
              <select value={form.runner_type} onChange={(e) => setForm({ ...form, runner_type: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                <option value="cold">Cold Runner</option>
                <option value="hot">Hot Runner</option>
              </select>
            </div>
          </div>
          <button onClick={handleQuote} disabled={loading}
            className="mt-4 bg-green-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            Generate Quote
          </button>
        </div>
      )}

      {loading && <LoadingState label="Loading..." />}
      {error && <ErrorState message={error} />}

      {tab === 'quote' && result && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Mold Cost', value: `$${result.mold_cost.toLocaleString()}` },
            { label: 'Per Part Cost', value: `$${result.per_part_cost.toFixed(3)}` },
            { label: 'Cycle Time', value: `${result.cycle_time_s.toFixed(1)}s` },
            { label: 'Unit Price', value: `$${result.unit_price.toFixed(3)}` },
            { label: 'Material/Part', value: `$${result.material_cost_per_part.toFixed(3)}` },
            { label: 'Amortized Mold', value: `$${result.amortized_mold_cost.toFixed(3)}` },
            { label: 'Total Cost', value: `$${result.total_cost.toLocaleString()}` },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
              <span className="text-xs text-gray-500 block">{c.label}</span>
              <span className="text-xl font-bold text-gray-900">{c.value}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'materials' && materials.length > 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3 text-right">Price/kg</th>
                <th className="px-4 py-3 text-right">Shrinkage %</th>
                <th className="px-4 py-3 text-right">Min Wall (mm)</th>
                <th className="px-4 py-3 text-right">Max Wall (mm)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {materials.map((m) => (
                <tr key={m.key} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{m.name}</td>
                  <td className="px-4 py-2 text-right font-mono">${m.price_per_kg.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right font-mono">{m.shrinkage_pct}%</td>
                  <td className="px-4 py-2 text-right font-mono">{m.min_wall_mm}</td>
                  <td className="px-4 py-2 text-right font-mono">{m.max_wall_mm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'dfm' && dfm && !loading && (
        <div className={`rounded-lg border p-6 shadow-sm ${dfm.pass ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${dfm.pass ? 'text-green-800' : 'text-red-800'}`}>
              DFM Score: {dfm.score.toFixed(0)}/100 — {dfm.pass ? 'PASS' : 'FAIL'}
            </h3>
          </div>
          {dfm.warnings.length > 0 ? (
            <div className="space-y-2">
              {dfm.warnings.map((w, i) => (
                <div key={i} className="bg-white rounded border p-3 text-sm">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium mr-2 ${
                    w.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    w.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                  }`}>{w.severity}</span>
                  <span className="font-medium">{w.message}</span>
                  <p className="text-gray-600 mt-1 ml-16">{w.recommendation}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-green-800 text-sm">No DFM issues found. Design is manufacturing-ready.</p>
          )}
        </div>
      )}
    </div>
  );
}
