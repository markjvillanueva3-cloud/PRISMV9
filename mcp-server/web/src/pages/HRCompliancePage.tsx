/**
 * HR & Compliance Page — Benefits, PTO, training, compliance alerts, dashboard.
 */
import { useState, useEffect } from 'react';
import { hrBenefitsList, hrComplianceAlerts, hrDashboard, hrTrainingExpiring, listEmployees, ApiError } from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { BenefitPlan, ComplianceAlert, HRDashboard, TrainingRecord } from '../api/types';

type Tab = 'dashboard' | 'benefits' | 'training' | 'alerts';

export function HRCompliancePage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [dash, setDash] = useState<HRDashboard | null>(null);
  const [plans, setPlans] = useState<BenefitPlan[]>([]);
  const [expiring, setExpiring] = useState<TrainingRecord[]>([]);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      switch (tab) {
        case 'dashboard': {
          const r = await hrDashboard();
          setDash(r.result as unknown as HRDashboard);
          break;
        }
        case 'benefits': {
          const r = await hrBenefitsList();
          setPlans((r.result as any)?.plans ?? (r.result as any) ?? []);
          break;
        }
        case 'training': {
          const r = await hrTrainingExpiring({ within_days: 90 });
          setExpiring((r.result as any)?.records ?? (r.result as any) ?? []);
          break;
        }
        case 'alerts': {
          const r = await hrComplianceAlerts();
          setAlerts((r.result as any)?.alerts ?? (r.result as any) ?? []);
          break;
        }
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load HR data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [tab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: 'HR Dashboard' },
    { key: 'benefits', label: 'Benefits' },
    { key: 'training', label: 'Training' },
    { key: 'alerts', label: 'Compliance Alerts' },
  ];

  const sevColors: Record<string, string> = {
    info: 'bg-blue-100 text-blue-700',
    warning: 'bg-yellow-100 text-yellow-700',
    critical: 'bg-red-100 text-red-700',
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">HR & Compliance</h1>
        <p className="text-sm text-gray-500 mt-1">Benefits, PTO tracking, training records, and compliance alerts.</p>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded text-sm font-medium ${tab === t.key ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <LoadingState label="Loading..." />}
      {error && <ErrorState message={error} onRetry={loadData} />}

      {/* Dashboard */}
      {tab === 'dashboard' && dash && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Enrolled Employees', value: dash.total_enrolled },
            { label: 'Monthly Benefit Cost', value: `$${dash.total_employer_benefit_cost.toFixed(0)}` },
            { label: 'Avg PTO Balance', value: `${dash.avg_pto_balance}h` },
            { label: 'Training Compliance', value: `${dash.training_compliance_pct}%`, good: dash.training_compliance_pct >= 90 },
            { label: 'Pending Reviews', value: dash.pending_reviews },
            { label: 'Compliance Alerts', value: dash.compliance_alerts, good: dash.compliance_alerts === 0 },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
              <span className="text-xs text-gray-500 block">{c.label}</span>
              <span className={`text-2xl font-bold ${c.good === false ? 'text-red-600' : c.good === true ? 'text-green-600' : 'text-gray-900'}`}>
                {c.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Benefits */}
      {tab === 'benefits' && plans.length > 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3 text-right">Employer</th>
                <th className="px-4 py-3 text-right">Employee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {plans.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{p.name}</td>
                  <td className="px-4 py-2 capitalize">{p.type}</td>
                  <td className="px-4 py-2">{p.provider}</td>
                  <td className="px-4 py-2 text-right font-mono">${p.employer_contribution.toFixed(0)}/mo</td>
                  <td className="px-4 py-2 text-right font-mono">${p.employee_contribution.toFixed(0)}/mo</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Training Expiring */}
      {tab === 'training' && !loading && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Training Expiring Within 90 Days</h2>
          {expiring.length > 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Expires</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expiring.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono">{t.employee_id}</td>
                      <td className="px-4 py-2 font-medium">{t.course_name}</td>
                      <td className="px-4 py-2 capitalize">{t.category}</td>
                      <td className="px-4 py-2 font-mono">{t.expiration_date}</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm">
              All training records are current. No expirations within 90 days.
            </div>
          )}
        </div>
      )}

      {/* Compliance Alerts */}
      {tab === 'alerts' && !loading && (
        <div className="space-y-3">
          {alerts.length > 0 ? alerts.map((a, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex items-start gap-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${sevColors[a.severity] ?? 'bg-gray-100'}`}>
                {a.severity.toUpperCase()}
              </span>
              <div>
                <p className="text-sm font-medium">{a.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {a.employee_id && <span>Employee: {a.employee_id} — </span>}
                  Regulation: {a.regulation}
                </p>
              </div>
            </div>
          )) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm">
              No compliance alerts. All clear.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
