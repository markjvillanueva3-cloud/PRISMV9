/**
 * Jobs Page — Job lifecycle management: create, track, and monitor jobs.
 */
import { useState, useEffect } from 'react';
import { jobDashboard, jobCreate, jobUpdateStatus, jobSummary, ApiError } from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { JobDashboard } from '../api/types';

type Tab = 'dashboard' | 'create' | 'summary';

export function JobsPage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [dashboard, setDashboard] = useState<JobDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [summaryJobId, setSummaryJobId] = useState('');
  const [summaryData, setSummaryData] = useState<any>(null);

  const [form, setForm] = useState({
    customer: '', part_number: '', description: '', quantity: '100',
    material: '6061-T6', due_date: '', priority: 'normal',
  });

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const r = await jobDashboard();
      setDashboard(r.result as unknown as JobDashboard);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      await jobCreate({
        ...form,
        quantity: parseInt(form.quantity) || 100,
      });
      setTab('dashboard');
      loadDashboard();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to create job');
      setLoading(false);
    }
  }

  async function handleStatusChange(jobId: string, status: string) {
    try {
      await jobUpdateStatus({ job_id: jobId, status });
      loadDashboard();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to update status');
    }
  }

  useEffect(() => { if (tab === 'dashboard') loadDashboard(); }, [tab]);

  const statuses = ['all', 'quoted', 'planned', 'in_progress', 'complete', 'shipped', 'invoiced'];
  const filteredJobs = dashboard?.jobs?.filter(j => statusFilter === 'all' || j.status === statusFilter) ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
        <p className="text-sm text-gray-500 mt-1">Create, track, and manage manufacturing jobs.</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('dashboard')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'dashboard' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Dashboard
        </button>
        <button onClick={() => setTab('create')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'create' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          New Job
        </button>
        <button onClick={() => setTab('summary')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'summary' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Job Summary
        </button>
      </div>

      {loading && <LoadingState label="Loading..." />}
      {error && <ErrorState message={error} />}

      {tab === 'dashboard' && dashboard && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Active Jobs', value: dashboard.total_active },
              { label: 'On Schedule', value: dashboard.on_schedule, color: 'text-green-600' },
              { label: 'At Risk', value: dashboard.at_risk, color: 'text-yellow-600' },
              { label: 'Overdue', value: dashboard.overdue, color: 'text-red-600' },
              { label: 'Pipeline', value: `$${(dashboard.revenue_pipeline ?? 0).toLocaleString()}` },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
                <span className="text-xs text-gray-500 block">{c.label}</span>
                <span className={`text-xl font-bold ${c.color ?? 'text-gray-900'}`}>{c.value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            {statuses.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded text-xs font-medium capitalize ${statusFilter === s ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {filteredJobs.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                    <th className="px-4 py-3">Job ID</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Part</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Due</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredJobs.map(j => (
                    <tr key={j.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs">{j.id}</td>
                      <td className="px-4 py-2">{j.customer}</td>
                      <td className="px-4 py-2 font-medium">{j.part_number}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          j.status === 'complete' ? 'bg-green-100 text-green-700' :
                          j.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          j.status === 'quoted' ? 'bg-gray-100 text-gray-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>{j.status.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-4 py-2 text-xs">{j.due_date}</td>
                      <td className="px-4 py-2 text-right font-mono">{j.quantity}</td>
                      <td className="px-4 py-2">
                        <select className="text-xs border rounded px-1 py-0.5"
                          value={j.status}
                          onChange={e => handleStatusChange(j.id, e.target.value)}>
                          {statuses.filter(s => s !== 'all').map(s => (
                            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'summary' && !loading && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Job Summary Lookup</h2>
            <div className="flex gap-3 items-end">
              <div className="flex-1 max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-1">Job ID</label>
                <input type="text" value={summaryJobId}
                  onChange={e => setSummaryJobId(e.target.value)}
                  placeholder="JOB-2026-001"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <button onClick={async () => {
                setLoading(true); setError(null);
                try {
                  const r = await jobSummary({ job_id: summaryJobId });
                  setSummaryData(r.result);
                } catch (e) {
                  setError(e instanceof ApiError ? e.message : 'Failed');
                } finally { setLoading(false); }
              }} disabled={!summaryJobId}
                className="bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium disabled:opacity-50">
                Get Summary
              </button>
            </div>
          </div>
          {summaryData && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <pre className="text-xs font-mono overflow-auto max-h-96">
                {JSON.stringify(summaryData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {tab === 'create' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Create New Job</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Customer', key: 'customer', type: 'text' },
              { label: 'Part Number', key: 'part_number', type: 'text' },
              { label: 'Description', key: 'description', type: 'text' },
              { label: 'Quantity', key: 'quantity', type: 'number' },
              { label: 'Material', key: 'material', type: 'text' },
              { label: 'Due Date', key: 'due_date', type: 'date' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="rush">Rush</option>
              </select>
            </div>
          </div>
          <button onClick={handleCreate} disabled={loading}
            className="mt-4 bg-green-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            Create Job
          </button>
        </div>
      )}
    </div>
  );
}
