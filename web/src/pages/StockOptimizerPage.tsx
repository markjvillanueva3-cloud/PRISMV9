/**
 * Stock Size Optimizer Page — Find optimal stock sizes to minimize waste and cost.
 */
import { useState } from 'react';
import { stockSizeOptimize, stockSizeCatalog, ApiError } from '../api/shop';
import { LoadingState, ErrorState } from '../components/shared/LoadingState';
import type { StockOptimizeResult, StockCatalog } from '../api/shopTypes';

type Tab = 'optimize' | 'catalog';

export function StockOptimizerPage() {
  const [tab, setTab] = useState<Tab>('optimize');
  const [result, setResult] = useState<StockOptimizeResult | null>(null);
  const [catalog, setCatalog] = useState<StockCatalog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    material: '6061-T6', part_length_mm: '100', part_width_mm: '50',
    part_height_mm: '25', quantity: '50',
  });
  const [catMaterial, setCatMaterial] = useState('6061-T6');

  async function handleOptimize() {
    setLoading(true);
    setError(null);
    try {
      const r = await stockSizeOptimize({
        material: form.material,
        part_length_mm: parseFloat(form.part_length_mm) || 100,
        part_width_mm: parseFloat(form.part_width_mm) || 50,
        part_height_mm: parseFloat(form.part_height_mm) || 25,
        quantity: parseInt(form.quantity) || 50,
      });
      setResult(r.result as unknown as StockOptimizeResult);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to optimize');
    } finally {
      setLoading(false);
    }
  }

  async function loadCatalog() {
    setLoading(true);
    setError(null);
    try {
      const r = await stockSizeCatalog({ material: catMaterial });
      setCatalog(r.result as unknown as StockCatalog);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stock Size Optimizer</h1>
        <p className="text-sm text-gray-500 mt-1">Find optimal bar/plate stock to minimize waste and cost.</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('optimize')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'optimize' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Optimizer
        </button>
        <button onClick={() => setTab('catalog')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'catalog' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Stock Catalog
        </button>
      </div>

      {loading && <LoadingState label="Loading..." />}
      {error && <ErrorState message={error} />}

      {tab === 'optimize' && (
        <>
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Material', key: 'material', type: 'text' },
                { label: 'Length (mm)', key: 'part_length_mm', type: 'number' },
                { label: 'Width (mm)', key: 'part_width_mm', type: 'number' },
                { label: 'Height (mm)', key: 'part_height_mm', type: 'number' },
                { label: 'Quantity', key: 'quantity', type: 'number' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input type={f.type} value={(form as any)[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
              ))}
            </div>
            <button onClick={handleOptimize} disabled={loading}
              className="mt-4 bg-green-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              Find Optimal Stock
            </button>
          </div>

          {result && !loading && (
            <div className="space-y-4">
              {result.best && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-800">Best Option</h3>
                  <div className="grid grid-cols-4 gap-4 mt-2">
                    <div><span className="text-xs text-gray-500 block">Form</span><span className="font-medium capitalize">{result.best.form}</span></div>
                    <div><span className="text-xs text-gray-500 block">Size</span><span className="font-mono">{result.best.size}</span></div>
                    <div><span className="text-xs text-gray-500 block">Waste</span><span className="font-mono">{result.best.waste_pct.toFixed(1)}%</span></div>
                    <div><span className="text-xs text-gray-500 block">Cost</span><span className="font-mono font-bold">${result.best.cost.toFixed(2)}</span></div>
                  </div>
                </div>
              )}

              {result.recommended.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                        <th className="px-4 py-3">Form</th>
                        <th className="px-4 py-3">Size</th>
                        <th className="px-4 py-3">Material</th>
                        <th className="px-4 py-3 text-right">Waste %</th>
                        <th className="px-4 py-3 text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {result.recommended.map((r, i) => (
                        <tr key={i} className={`hover:bg-gray-50 ${i === 0 ? 'bg-green-50' : ''}`}>
                          <td className="px-4 py-2 capitalize">{r.form}</td>
                          <td className="px-4 py-2 font-mono">{r.size}</td>
                          <td className="px-4 py-2">{r.material}</td>
                          <td className="px-4 py-2 text-right font-mono">{r.waste_pct.toFixed(1)}%</td>
                          <td className="px-4 py-2 text-right font-mono font-bold">${r.cost.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
              <input type="text" value={catMaterial} onChange={(e) => setCatMaterial(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <button onClick={loadCatalog}
              className="bg-prism-600 text-white px-4 py-2 rounded text-sm hover:bg-prism-700">
              Load Catalog
            </button>
          </div>

          {catalog && !loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h3 className="font-semibold mb-2">Round Bars (mm dia)</h3>
                <div className="flex flex-wrap gap-2">
                  {catalog.round_bars.map((d) => (
                    <span key={d} className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">⌀{d}</span>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h3 className="font-semibold mb-2">Plate Thicknesses (mm)</h3>
                <div className="flex flex-wrap gap-2">
                  {catalog.plate_thicknesses.map((t) => (
                    <span key={t} className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{t}mm</span>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h3 className="font-semibold mb-2">Cost</h3>
                <p className="text-sm">${catalog.cost_per_kg.toFixed(2)}/kg — Density: {catalog.density_kg_m3.toLocaleString()} kg/m³</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
