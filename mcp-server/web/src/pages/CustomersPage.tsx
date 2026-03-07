/**
 * Customers / CRM Page — Customer list, search, credit checks, sales pipeline, analytics.
 */
import { useState, useEffect } from 'react';
import { customerList, customerSearch, customerPipeline, customerTop, customerFollowUps, ApiError } from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { Customer, SalesPipeline, CustomerAnalytics } from '../api/types';

type Tab = 'list' | 'pipeline' | 'top' | 'followups';

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

      <div className="flex gap-2 mb-4">
        {([
          { key: 'list', label: 'Customer List' },
          { key: 'pipeline', label: 'Sales Pipeline' },
          { key: 'top', label: 'Top Customers' },
          { key: 'followups', label: 'Follow-ups' },
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
