/**
 * Invoices Page — Create, view, and track invoices from completed jobs.
 */
import { useState, useEffect } from 'react';
import { listInvoices, createInvoice, ApiError } from '../api/shop';
import { LoadingState, ErrorState } from '../components/shared/LoadingState';
import type { Invoice } from '../api/shopTypes';

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newJobId, setNewJobId] = useState('');
  const [newMarkup, setNewMarkup] = useState('15');

  async function loadInvoices() {
    setLoading(true);
    setError(null);
    try {
      const r = await listInvoices(filter !== 'all' ? { status: filter } : undefined);
      setInvoices((r.result as unknown as { invoices: Invoice[] }).invoices ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadInvoices(); }, [filter]);

  async function handleCreate() {
    if (!newJobId) return;
    setLoading(true);
    setError(null);
    try {
      await createInvoice({ job_id: newJobId, markup_percent: parseFloat(newMarkup) || 15 });
      setShowCreate(false);
      setNewJobId('');
      loadInvoices();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to create invoice');
      setLoading(false);
    }
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
  };

  const totalOutstanding = invoices
    .filter((i) => i.status !== 'paid')
    .reduce((s, i) => s + i.balance_due, 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">Create and track job invoices.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-prism-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-prism-700 transition-colors"
        >
          {showCreate ? 'Cancel' : 'New Invoice'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Invoice from Job</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="inv-job" className="block text-sm font-medium text-gray-700 mb-1">Job ID</label>
              <input id="inv-job" type="text" value={newJobId} onChange={(e) => setNewJobId(e.target.value)}
                placeholder="JOB-2026-001"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500" />
            </div>
            <div>
              <label htmlFor="inv-markup" className="block text-sm font-medium text-gray-700 mb-1">Markup %</label>
              <input id="inv-markup" type="number" value={newMarkup} onChange={(e) => setNewMarkup(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500" />
            </div>
            <div className="flex items-end">
              <button onClick={handleCreate} disabled={loading || !newJobId}
                className="bg-green-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-6 flex items-center justify-between">
        <div className="flex gap-6">
          <div>
            <span className="text-xs text-gray-500 block">Total Invoices</span>
            <span className="text-xl font-bold">{invoices.length}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">Outstanding</span>
            <span className="text-xl font-bold text-red-600">${totalOutstanding.toFixed(2)}</span>
          </div>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1 text-sm">
          <option value="all">All</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {loading && <LoadingState label="Loading invoices..." />}
      {error && <ErrorState message={error} onRetry={loadInvoices} />}

      {invoices.length > 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Job</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-sm">{inv.id}</td>
                  <td className="px-4 py-2 font-medium">{inv.job_id}</td>
                  <td className="px-4 py-2">{inv.customer_name}</td>
                  <td className="px-4 py-2 font-mono">{inv.date}</td>
                  <td className="px-4 py-2 font-mono">${inv.total.toFixed(2)}</td>
                  <td className="px-4 py-2 font-mono">${inv.balance_due.toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[inv.status] ?? statusColors.draft}`}>
                      {inv.status.toUpperCase()}
                    </span>
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
