/**
 * Customers / CRM Page — Customer list, search, credit checks, sales pipeline, analytics.
 */
import { useState, useEffect } from 'react';
import {
  customerList, customerSearch, customerPipeline, customerTop, customerFollowUps,
  customerCreate, customerCreditCheck, customerAnalytics,
  customerLogComm, customerCommHistory, ApiError,
} from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { Customer, SalesPipeline, CustomerAnalytics } from '../api/types';

type Tab = 'list' | 'pipeline' | 'top' | 'followups' | 'credit' | 'create' | 'comms';

export function CustomersPage() {
  const [tab, setTab] = useState<Tab>('list');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pipeline, setPipeline] = useState<SalesPipeline | null>(null);
  const [topCustomers, setTopCustomers] = useState<CustomerAnalytics[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Credit check
  const [creditCustId, setCreditCustId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditResult, setCreditResult] = useState<any>(null);
  // Create customer
  const [newCust, setNewCust] = useState({ company: '', contact_name: '', email: '', phone: '', pricing_tier: 'standard', credit_limit: '' });
  const [createResult, setCreateResult] = useState<any>(null);
  // Comms
  const [commCustId, setCommCustId] = useState('');
  const [commType, setCommType] = useState('email');
  const [commNotes, setCommNotes] = useState('');
  const [commHistory, setCommHistory] = useState<any[]>([]);
  const [commResult, setCommResult] = useState<any>(null);
  // Analytics
  const [analyticsCustId, setAnalyticsCustId] = useState('');
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      switch (tab) {
        case 'list': {
          const r = searchQuery
            ? await customerSearch({ query: searchQuery })
            : await customerList(statusFilter !== 'all' ? { status: statusFilter } : undefined);
          setCustomers((r.result as any)?.customers ?? (r.result as any) ?? []);
          break;
        }
        case 'pipeline': {
          const r = await customerPipeline();
          setPipeline(r.result as unknown as SalesPipeline);
          break;
        }
        case 'top': {
          const r = await customerTop({ limit: 10 });
          setTopCustomers((r.result as any)?.customers ?? (r.result as any) ?? []);
          break;
        }
        case 'followups': {
          const r = await customerFollowUps();
          setFollowUps((r.result as any)?.follow_ups ?? (r.result as any) ?? []);
          break;
        }
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load customer data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [tab, statusFilter]);

  function handleSearch() {
    if (tab !== 'list') setTab('list');
    loadData();
  }

  const tierColors: Record<string, string> = {
    standard: 'bg-gray-100 text-gray-700',
    preferred: 'bg-blue-100 text-blue-700',
    contract: 'bg-purple-100 text-purple-700',
    wholesale: 'bg-green-100 text-green-700',
  };

  const stageColors: Record<string, string> = {
    prospect: 'bg-gray-200',
    rfq_received: 'bg-blue-200',
    quoted: 'bg-yellow-200',
    negotiating: 'bg-orange-200',
    won: 'bg-green-300',
    lost: 'bg-red-200',
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customers & CRM</h1>
        <p className="text-sm text-gray-500 mt-1">Customer management, credit checks, sales pipeline, and analytics.</p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {([
          { key: 'list', label: 'Customer List' },
          { key: 'pipeline', label: 'Sales Pipeline' },
          { key: 'top', label: 'Top Customers' },
          { key: 'followups', label: 'Follow-ups' },
          { key: 'credit', label: 'Credit Check' },
          { key: 'create', label: 'New Customer' },
          { key: 'comms', label: 'Communications' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded text-sm font-medium ${tab === t.key ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search bar for list tab */}
      {tab === 'list' && (
        <div className="flex gap-2 mb-4">
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search customers..."
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500" />
          <button onClick={handleSearch} className="bg-prism-600 text-white px-4 py-2 rounded text-sm hover:bg-prism-700">Search</button>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm">
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="prospect">Prospect</option>
            <option value="on_hold">On Hold</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      )}

      {loading && <LoadingState label="Loading..." />}
      {error && <ErrorState message={error} onRetry={loadData} />}

      {/* Customer List */}
      {tab === 'list' && customers.length > 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3 text-right">Credit Limit</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">{c.id}</td>
                  <td className="px-4 py-2 font-medium">{c.company}</td>
                  <td className="px-4 py-2">{c.contact_name}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tierColors[c.pricing_tier] ?? 'bg-gray-100'}`}>
                      {c.pricing_tier}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono">${c.credit_limit.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-mono">${c.current_balance.toLocaleString()}</td>
                  <td className="px-4 py-2 capitalize">{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sales Pipeline */}
      {tab === 'pipeline' && pipeline && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Pipeline', value: `$${pipeline.total_pipeline.toLocaleString()}` },
              { label: 'Weighted Value', value: `$${pipeline.weighted_pipeline.toLocaleString()}` },
              { label: 'Win Rate', value: `${pipeline.win_rate}%` },
              { label: 'Avg Deal Size', value: `$${pipeline.avg_deal_size.toLocaleString()}` },
            ].map((m) => (
              <div key={m.label} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
                <span className="text-xs text-gray-500 block">{m.label}</span>
                <span className="text-xl font-bold text-gray-900">{m.value}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Pipeline Stages</h2>
            <div className="space-y-3">
              {pipeline.stages.map((s) => (
                <div key={s.stage}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium capitalize">{s.stage.replace(/_/g, ' ')}</span>
                    <span className="font-mono">{s.count} deals — ${s.value.toLocaleString()} (weighted: ${s.weighted_value.toLocaleString()})</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className={`h-3 rounded-full ${stageColors[s.stage] ?? 'bg-blue-300'}`}
                      style={{ width: `${pipeline.total_pipeline > 0 ? (s.value / pipeline.total_pipeline) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Customers */}
      {tab === 'top' && topCustomers.length > 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Jobs</th>
                <th className="px-4 py-3 text-right">Avg Value</th>
                <th className="px-4 py-3 text-right">On-Time %</th>
                <th className="px-4 py-3 text-right">Margin %</th>
                <th className="px-4 py-3 text-right">Win Rate %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topCustomers.map((c, i) => (
                <tr key={c.customer_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-bold text-gray-400">{i + 1}</td>
                  <td className="px-4 py-2 font-medium">{c.customer_name}</td>
                  <td className="px-4 py-2 text-right font-mono">${c.total_revenue.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{c.total_jobs}</td>
                  <td className="px-4 py-2 text-right font-mono">${c.avg_job_value.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{c.on_time_delivery_pct}%</td>
                  <td className="px-4 py-2 text-right">{c.avg_margin_pct}%</td>
                  <td className="px-4 py-2 text-right">{c.quote_win_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Credit Check */}
      {tab === 'credit' && !loading && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Credit Check</h2>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID</label>
                <input type="text" value={creditCustId} onChange={(e) => setCreditCustId(e.target.value)}
                  placeholder="CUST-001" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Amount ($)</label>
                <input type="number" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <button onClick={async () => {
                setLoading(true); setError(null);
                try {
                  const r = await customerCreditCheck({ customer_id: creditCustId, order_amount: parseFloat(creditAmount) || 0 });
                  setCreditResult(r.result);
                } catch (e) { setError(e instanceof ApiError ? e.message : 'Credit check failed'); }
                finally { setLoading(false); }
              }} disabled={!creditCustId || !creditAmount}
                className="bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium disabled:opacity-50">
                Check
              </button>
            </div>
          </div>
          {creditResult && (
            <div className={`rounded-lg border p-4 shadow-sm ${creditResult.approved ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <h3 className={`text-sm font-bold mb-2 ${creditResult.approved ? 'text-green-800' : 'text-red-800'}`}>
                {creditResult.approved ? 'APPROVED' : 'DECLINED'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><span className="text-xs text-gray-500 block">Credit Limit</span><span className="font-mono font-bold">${creditResult.credit_limit?.toLocaleString() ?? '-'}</span></div>
                <div><span className="text-xs text-gray-500 block">Current Balance</span><span className="font-mono font-bold">${creditResult.current_balance?.toLocaleString() ?? '-'}</span></div>
                <div><span className="text-xs text-gray-500 block">Available</span><span className="font-mono font-bold">${creditResult.available_credit?.toLocaleString() ?? '-'}</span></div>
                <div><span className="text-xs text-gray-500 block">Risk Score</span><span className="font-bold">{creditResult.risk_score ?? '-'}</span></div>
              </div>
              {creditResult.reason && <p className="mt-2 text-xs text-gray-600">{creditResult.reason}</p>}
            </div>
          )}
          {/* Customer Analytics */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Customer Analytics</h2>
            <div className="flex gap-3 items-end">
              <div className="flex-1 max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID</label>
                <input type="text" value={analyticsCustId} onChange={(e) => setAnalyticsCustId(e.target.value)}
                  placeholder="CUST-001" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <button onClick={async () => {
                setLoading(true); setError(null);
                try {
                  const r = await customerAnalytics({ customer_id: analyticsCustId });
                  setAnalyticsData(r.result);
                } catch (e) { setError(e instanceof ApiError ? e.message : 'Analytics failed'); }
                finally { setLoading(false); }
              }} disabled={!analyticsCustId}
                className="bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium disabled:opacity-50">
                Get Analytics
              </button>
            </div>
            {analyticsData && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total Revenue', value: `$${analyticsData.total_revenue?.toLocaleString() ?? '-'}` },
                  { label: 'Total Jobs', value: analyticsData.total_jobs ?? '-' },
                  { label: 'Avg Job Value', value: `$${analyticsData.avg_job_value?.toLocaleString() ?? '-'}` },
                  { label: 'On-Time %', value: `${analyticsData.on_time_delivery_pct ?? '-'}%` },
                  { label: 'Avg Margin', value: `${analyticsData.avg_margin_pct ?? '-'}%` },
                  { label: 'Win Rate', value: `${analyticsData.quote_win_rate ?? '-'}%` },
                  { label: 'Last Order', value: analyticsData.last_order_date ?? '-' },
                  { label: 'Risk Level', value: analyticsData.risk_level ?? '-' },
                ].map(c => (
                  <div key={c.label} className="bg-gray-50 rounded-lg p-3 text-center">
                    <span className="text-xs text-gray-500 block">{c.label}</span>
                    <span className="text-lg font-bold text-gray-900">{c.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Customer */}
      {tab === 'create' && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">New Customer</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input type="text" value={newCust.company} onChange={(e) => setNewCust({ ...newCust, company: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
              <input type="text" value={newCust.contact_name} onChange={(e) => setNewCust({ ...newCust, contact_name: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={newCust.email} onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" value={newCust.phone} onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Tier</label>
              <select value={newCust.pricing_tier} onChange={(e) => setNewCust({ ...newCust, pricing_tier: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                <option value="standard">Standard</option>
                <option value="preferred">Preferred</option>
                <option value="contract">Contract</option>
                <option value="wholesale">Wholesale</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit ($)</label>
              <input type="number" value={newCust.credit_limit} onChange={(e) => setNewCust({ ...newCust, credit_limit: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <button onClick={async () => {
            setLoading(true); setError(null);
            try {
              const r = await customerCreate({ ...newCust, credit_limit: parseFloat(newCust.credit_limit) || 0 });
              setCreateResult(r.result);
            } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to create customer'); }
            finally { setLoading(false); }
          }} disabled={!newCust.company}
            className="mt-4 bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-prism-700 disabled:opacity-50">
            Create Customer
          </button>
          {createResult && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
              Customer created: {JSON.stringify(createResult)}
            </div>
          )}
        </div>
      )}

      {/* Communications */}
      {tab === 'comms' && !loading && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Log Communication</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID</label>
                <input type="text" value={commCustId} onChange={(e) => setCommCustId(e.target.value)}
                  placeholder="CUST-001" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={commType} onChange={(e) => setCommType(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="meeting">Meeting</option>
                  <option value="site_visit">Site Visit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input type="text" value={commNotes} onChange={(e) => setCommNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={async () => {
                setLoading(true); setError(null);
                try {
                  const r = await customerLogComm({ customer_id: commCustId, type: commType, notes: commNotes });
                  setCommResult(r.result);
                } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to log'); }
                finally { setLoading(false); }
              }} disabled={!commCustId}
                className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50">
                Log
              </button>
              <button onClick={async () => {
                setLoading(true); setError(null);
                try {
                  const r = await customerCommHistory({ customer_id: commCustId });
                  setCommHistory((r.result as any)?.communications ?? (r.result as any) ?? []);
                } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load history'); }
                finally { setLoading(false); }
              }} disabled={!commCustId}
                className="bg-prism-600 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50">
                View History
              </button>
            </div>
            {commResult && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">Communication logged.</div>
            )}
          </div>
          {commHistory.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3">By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {commHistory.map((c: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-xs font-mono">{c.date ?? c.timestamp ?? '-'}</td>
                      <td className="px-4 py-2 capitalize">{c.type ?? '-'}</td>
                      <td className="px-4 py-2 max-w-xs truncate">{c.notes ?? '-'}</td>
                      <td className="px-4 py-2">{c.logged_by ?? c.user ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Follow-ups */}
      {tab === 'followups' && followUps.length > 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {followUps.map((f: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">
                    {f.customer_name ?? f.customer_id ?? '-'}
                  </td>
                  <td className="px-4 py-2 capitalize">
                    {f.type ?? f.follow_up_type ?? '-'}
                  </td>
                  <td className="px-4 py-2 text-xs font-mono">
                    {f.due_date ?? '-'}
                  </td>
                  <td className="px-4 py-2 text-xs max-w-xs truncate">
                    {f.notes ?? '-'}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      f.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>{f.status ?? 'pending'}</span>
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
