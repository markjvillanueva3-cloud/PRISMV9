/**
 * Purchase Orders Page — Create, approve, receive POs. AP aging view.
 */
import { useState, useEffect } from 'react';
import { poList, poCreate, poApprove, poAPAging, poThreeWayMatch, poSpendByCategory, ApiError } from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { PurchaseOrder, APAging } from '../api/types';

export function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [aging, setAging] = useState<APAging | null>(null);
  const [filter, setFilter] = useState('all');
  const [matchResult, setMatchResult] = useState<any>(null);
  const [matchPoId, setMatchPoId] = useState('');
  const [spendData, setSpendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'orders' | 'aging' | 'match' | 'spend'>('orders');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ supplier_name: '', description: '', quantity: '1', unit_price: '' });

  async function loadOrders() {
    setLoading(true);
    setError(null);
    try {
      const r = await poList(filter !== 'all' ? { status: filter } : undefined);
      setOrders((r.result as any)?.orders ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load POs');
    } finally {
      setLoading(false);
    }
  }

  async function loadAging() {
    setLoading(true);
    setError(null);
    try {
      const r = await poAPAging();
      setAging(r.result as unknown as APAging);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load AP aging');
    } finally {
      setLoading(false);
    }
  }

  async function loadSpend() {
    setLoading(true); setError(null);
    try {
      const r = await poSpendByCategory();
      setSpendData(
        (r.result as any)?.categories ?? (r.result as any) ?? []
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load spend');
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (tab === 'orders') loadOrders();
    else if (tab === 'aging') loadAging();
    else if (tab === 'spend') loadSpend();
  }, [filter, tab]);

  async function handleCreate() {
    if (!form.supplier_name || !form.unit_price) return;
    setLoading(true);
    try {
      await poCreate({
        supplier_name: form.supplier_name,
        supplier_id: form.supplier_name.toLowerCase().replace(/\s+/g, '-'),
        line_items: [{ description: form.description, quantity: parseInt(form.quantity) || 1, unit_price: parseFloat(form.unit_price) || 0 }],
      });
      setShowCreate(false);
      setForm({ supplier_name: '', description: '', quantity: '1', unit_price: '' });
      loadOrders();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to create PO');
      setLoading(false);
    }
  }

  async function handleApprove(poId: string) {
    try {
      await poApprove({ po_id: poId, approved_by: 'current-user' });
      loadOrders();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to approve PO');
    }
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending_approval: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-blue-100 text-blue-700',
    partially_received: 'bg-orange-100 text-orange-700',
    received: 'bg-green-100 text-green-700',
    closed: 'bg-gray-200 text-gray-600',
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Manage supplier orders, approvals, and AP aging.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('orders')}
            className={`px-3 py-1.5 rounded text-sm font-medium ${tab === 'orders' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
            Orders
          </button>
          <button onClick={() => setTab('aging')}
            className={`px-3 py-1.5 rounded text-sm font-medium ${
              tab === 'aging' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
            AP Aging
          </button>
          <button onClick={() => setTab('match')}
            className={`px-3 py-1.5 rounded text-sm font-medium ${
              tab === 'match' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
            3-Way Match
          </button>
          <button onClick={() => setTab('spend')}
            className={`px-3 py-1.5 rounded text-sm font-medium ${
              tab === 'spend' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
            Spend Analysis
          </button>
          <button onClick={() => setShowCreate(!showCreate)}
            className="bg-prism-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-prism-700">
            {showCreate ? 'Cancel' : 'New PO'}
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Purchase Order</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <input type="text" value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qty</label>
              <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500" />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                <input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500" />
              </div>
              <button onClick={handleCreate} disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && <LoadingState label={tab === 'orders' ? 'Loading purchase orders...' : 'Loading AP aging...'} />}
      {error && <ErrorState message={error} onRetry={tab === 'orders' ? loadOrders : loadAging} />}

      {tab === 'orders' && !loading && (
        <>
          <div className="mb-4">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 text-sm">
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="received">Received</option>
            </select>
          </div>
          {orders.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">PO #</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono">{po.id}</td>
                      <td className="px-4 py-2">{po.supplier_name}</td>
                      <td className="px-4 py-2 font-mono">${po.total.toFixed(2)}</td>
                      <td className="px-4 py-2 font-mono">{po.created_at?.slice(0, 10)}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[po.status] ?? 'bg-gray-100'}`}>
                          {po.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {po.status === 'pending_approval' && (
                          <button onClick={() => handleApprove(po.id)}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'aging' && aging && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Current', value: aging.current, color: 'text-green-600' },
              { label: '1-30 Days', value: aging.days_30, color: 'text-yellow-600' },
              { label: '31-60 Days', value: aging.days_60, color: 'text-orange-600' },
              { label: '90+ Days', value: aging.days_90_plus, color: 'text-red-600' },
              { label: 'Total AP', value: aging.total, color: 'text-gray-900' },
            ].map((b) => (
              <div key={b.label} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
                <span className="text-xs text-gray-500 block">{b.label}</span>
                <span className={`text-xl font-bold ${b.color}`}>${b.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Three-Way Match */}
      {tab === 'match' && !loading && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Three-Way Match</h2>
            <p className="text-sm text-gray-500 mb-4">
              Verify PO, receiving report, and invoice match.
            </p>
            <div className="flex gap-4 items-end">
              <div className="flex-1 max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PO ID
                </label>
                <input type="text" value={matchPoId}
                  onChange={(e) => setMatchPoId(e.target.value)}
                  placeholder="PO-001"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <button onClick={async () => {
                if (!matchPoId) return;
                setLoading(true); setError(null);
                try {
                  const r = await poThreeWayMatch({ po_id: matchPoId });
                  setMatchResult(r.result);
                } catch (e) {
                  setError(
                    e instanceof ApiError ? e.message : 'Match failed'
                  );
                } finally { setLoading(false); }
              }}
                className="bg-prism-600 text-white px-4 py-2 rounded text-sm">
                Verify Match
              </button>
            </div>
          </div>
          {matchResult && (
            <div className={`rounded-lg border p-4 shadow-sm ${
              matchResult.matched
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <h3 className={`font-semibold ${
                matchResult.matched ? 'text-green-800' : 'text-red-800'
              }`}>
                {matchResult.matched ? 'Match Verified' : 'Discrepancy Found'}
              </h3>
              <pre className="text-xs font-mono mt-2 overflow-auto">
                {JSON.stringify(matchResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Spend by Category */}
      {tab === 'spend' && spendData.length > 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Total Spend</th>
                <th className="px-4 py-3 text-right">PO Count</th>
                <th className="px-4 py-3 text-right">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {spendData.map((s: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium capitalize">
                    {s.category ?? '-'}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    ${(s.total_spend ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {s.po_count ?? 0}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {(s.pct ?? 0).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
