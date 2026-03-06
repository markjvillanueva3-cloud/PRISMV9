/**
 * Inventory Page — EOQ calculator, ABC classification, safety stock.
 */
import { useState } from 'react';
import { inventoryEOQ, inventoryABC, ApiError } from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { EOQResult, ABCClassification } from '../api/types';

type Tab = 'eoq' | 'abc';

export function InventoryPage() {
  const [tab, setTab] = useState<Tab>('eoq');
  const [eoqResult, setEoqResult] = useState<EOQResult | null>(null);
  const [abcResult, setAbcResult] = useState<ABCClassification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [eoqForm, setEoqForm] = useState({ annual_demand: '1000', order_cost: '50', holding_cost: '2' });

  async function calcEOQ() {
    setLoading(true);
    setError(null);
    try {
      const r = await inventoryEOQ({
        annual_demand: parseFloat(eoqForm.annual_demand) || 0,
        order_cost: parseFloat(eoqForm.order_cost) || 0,
        holding_cost_per_unit: parseFloat(eoqForm.holding_cost) || 0,
      });
      setEoqResult(r.result as unknown as EOQResult);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to calculate EOQ');
    } finally {
      setLoading(false);
    }
  }

  async function calcABC() {
    setLoading(true);
    setError(null);
    try {
      const sampleItems = [
        { id: 'ITEM-001', name: 'Carbide Inserts', annual_usage: 500, unit_cost: 12 },
        { id: 'ITEM-002', name: 'Coolant 5gal', annual_usage: 50, unit_cost: 45 },
        { id: 'ITEM-003', name: 'End Mills 1/2"', annual_usage: 200, unit_cost: 35 },
        { id: 'ITEM-004', name: 'Drill Bits Set', annual_usage: 100, unit_cost: 8 },
        { id: 'ITEM-005', name: 'Safety Glasses', annual_usage: 300, unit_cost: 5 },
      ];
      const r = await inventoryABC({ items: sampleItems });
      setAbcResult(r.result as unknown as ABCClassification);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to run ABC analysis');
    } finally {
      setLoading(false);
    }
  }

  const classColors: Record<string, string> = {
    A: 'bg-red-100 text-red-700',
    B: 'bg-yellow-100 text-yellow-700',
    C: 'bg-green-100 text-green-700',
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Optimization</h1>
        <p className="text-sm text-gray-500 mt-1">EOQ calculator, ABC classification, and safety stock analysis.</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('eoq')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'eoq' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          EOQ Calculator
        </button>
        <button onClick={() => setTab('abc')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'abc' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          ABC Classification
        </button>
      </div>

      {loading && <LoadingState label="Calculating..." />}
      {error && <ErrorState message={error} />}

      {/* EOQ */}
      {tab === 'eoq' && !loading && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Economic Order Quantity</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Annual Demand</label>
                <input type="number" value={eoqForm.annual_demand}
                  onChange={(e) => setEoqForm({ ...eoqForm, annual_demand: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Cost ($)</label>
                <input type="number" value={eoqForm.order_cost}
                  onChange={(e) => setEoqForm({ ...eoqForm, order_cost: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Holding Cost/Unit ($)</label>
                <input type="number" value={eoqForm.holding_cost}
                  onChange={(e) => setEoqForm({ ...eoqForm, holding_cost: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500" />
              </div>
              <div className="flex items-end">
                <button onClick={calcEOQ}
                  className="bg-green-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-green-700 w-full">
                  Calculate
                </button>
              </div>
            </div>
          </div>

          {eoqResult && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'EOQ (units)', value: eoqResult.eoq.toFixed(0) },
                { label: 'Orders/Year', value: eoqResult.orders_per_year.toFixed(1) },
                { label: 'Annual Order Cost', value: `$${eoqResult.annual_order_cost.toFixed(2)}` },
                { label: 'Total Cost', value: `$${eoqResult.total_cost.toFixed(2)}` },
              ].map((c) => (
                <div key={c.label} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
                  <span className="text-xs text-gray-500 block">{c.label}</span>
                  <span className="text-xl font-bold text-gray-900">{c.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABC */}
      {tab === 'abc' && !loading && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">Classify inventory items by annual value (Pareto 80/20 rule).</p>
            <button onClick={calcABC}
              className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700">
              Run ABC Analysis
            </button>
          </div>

          {abcResult && (
            <>
              <div className="grid grid-cols-3 gap-4">
                {abcResult.summary.map((s) => (
                  <div key={s.class} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
                    <span className={`px-3 py-1 rounded-full text-lg font-bold ${classColors[s.class] ?? 'bg-gray-100'}`}>{s.class}</span>
                    <p className="text-sm text-gray-600 mt-2">{s.count} items — {s.value_pct.toFixed(1)}% of value</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3 text-right">Annual Value</th>
                      <th className="px-4 py-3 text-right">Cumulative %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {abcResult.items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono">{item.id}</td>
                        <td className="px-4 py-2">{item.name}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${classColors[item.class] ?? 'bg-gray-100'}`}>{item.class}</span>
                        </td>
                        <td className="px-4 py-2 text-right font-mono">${item.annual_value.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right font-mono">{item.cumulative_pct.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
