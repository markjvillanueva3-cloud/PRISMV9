/**
 * HR & Compliance Page — Benefits, PTO, training, compliance alerts, dashboard.
 */
import { useState, useEffect } from 'react';
import {
  hrBenefitsList, hrComplianceAlerts, hrDashboard, hrTrainingExpiring, hrReviews,
  listEmployees, hrPTOBalance, hrPTORequest, hrPTOApprove, hrEnroll,
  hrReviewCreate, hrTrainingHistory, hrCompensationHistory, ApiError,
} from '../api/shop';
import { LoadingState, ErrorState } from '../components/shared/LoadingState';
import type { BenefitPlan, ComplianceAlert, HRDashboard, TrainingRecord } from '../api/shopTypes';

type Tab = 'dashboard' | 'benefits' | 'training' | 'alerts' | 'reviews' | 'pto' | 'enroll' | 'employees' | 'history';

export function HRCompliancePage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [dash, setDash] = useState<HRDashboard | null>(null);
  const [plans, setPlans] = useState<BenefitPlan[]>([]);
  const [expiring, setExpiring] = useState<TrainingRecord[]>([]);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
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
        case 'reviews': {
          const r = await hrReviews();
          setReviews((r.result as any)?.reviews ?? (r.result as any) ?? []);
          break;
        }
        case 'employees': {
          const r = await listEmployees();
          setEmployees((r.result as any)?.employees ?? (r.result as any) ?? []);
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

  const [ptoResult, setPtoResult] = useState<any>(null);
  const [enrollResult, setEnrollResult] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [trainingHist, setTrainingHist] = useState<any[]>([]);
  const [compHist, setCompHist] = useState<any[]>([]);
  const [histEmpId, setHistEmpId] = useState('EMP-001');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: 'HR Dashboard' },
    { key: 'benefits', label: 'Benefits' },
    { key: 'training', label: 'Training' },
    { key: 'alerts', label: 'Compliance Alerts' },
    { key: 'reviews', label: 'Reviews' },
    { key: 'pto', label: 'PTO' },
    { key: 'enroll', label: 'Enroll' },
    { key: 'employees', label: 'Employees' },
    { key: 'history', label: 'History' },
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
      {/* Reviews */}
      {tab === 'reviews' && reviews.length > 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Rating</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reviews.map((r: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{r.employee_id ?? r.employee_name ?? '-'}</td>
                  <td className="px-4 py-2 capitalize">{r.type ?? r.review_type ?? '-'}</td>
                  <td className="px-4 py-2 text-xs">{r.date ?? r.review_date ?? '-'}</td>
                  <td className="px-4 py-2 text-right font-mono font-bold">{r.rating ?? '-'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>{r.status ?? 'pending'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* PTO Tab */}
      {tab === 'pto' && !loading && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Check PTO Balance</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const empId = (new FormData(e.currentTarget)).get('pto_emp') as string;
              setLoading(true); setError(null);
              try {
                const r = await hrPTOBalance({ employee_id: empId });
                setPtoResult({ type: 'balance', data: r.result });
              } catch (err) { setError(err instanceof ApiError ? err.message : 'Failed'); }
              finally { setLoading(false); }
            }}>
              <div className="flex gap-3 items-end">
                <div className="flex-1 max-w-md">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input name="pto_emp" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="EMP-001" />
                </div>
                <button type="submit" className="bg-prism-600 text-white px-4 py-2 rounded text-sm font-medium">Check</button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Submit PTO Request</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setLoading(true); setError(null);
              try {
                const r = await hrPTORequest({
                  employee_id: fd.get('req_emp'), start_date: fd.get('req_start'),
                  end_date: fd.get('req_end'), type: fd.get('req_type') || 'vacation',
                });
                setPtoResult({ type: 'request', data: r.result });
              } catch (err) { setError(err instanceof ApiError ? err.message : 'Failed'); }
              finally { setLoading(false); }
            }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input name="req_emp" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input name="req_start" type="date" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input name="req_end" type="date" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select name="req_type" className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                    <option value="vacation">Vacation</option>
                    <option value="sick">Sick</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="mt-4 bg-green-600 text-white px-6 py-2 rounded text-sm font-medium">Submit Request</button>
            </form>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Approve PTO</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setLoading(true); setError(null);
              try {
                const r = await hrPTOApprove({
                  request_id: fd.get('appr_req') as string,
                  approved_by: fd.get('appr_by') as string,
                });
                setPtoResult({ type: 'approve', data: r.result });
              } catch (err) { setError(err instanceof ApiError ? err.message : 'Failed'); }
              finally { setLoading(false); }
            }}>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Request ID</label>
                  <input name="appr_req" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="PTO-001" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Approved By</label>
                  <input name="appr_by" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="MGR-001" />
                </div>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium">Approve</button>
              </div>
            </form>
          </div>

          {ptoResult && (
            <pre className="bg-white rounded-lg border p-4 text-xs font-mono overflow-auto max-h-48">
              {JSON.stringify(ptoResult.data, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Enroll Tab */}
      {tab === 'enroll' && !loading && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Enroll in Benefits/Training</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setLoading(true); setError(null);
              try {
                const r = await hrEnroll({
                  employee_id: fd.get('enr_emp'), program_id: fd.get('enr_prog'),
                  type: fd.get('enr_type'), effective_date: fd.get('enr_date'),
                });
                setEnrollResult(r.result);
              } catch (err) { setError(err instanceof ApiError ? err.message : 'Failed'); }
              finally { setLoading(false); }
            }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input name="enr_emp" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Program ID</label>
                  <input name="enr_prog" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="BP-001 or TR-001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select name="enr_type" className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                    <option value="benefits">Benefits</option>
                    <option value="training">Training</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
                  <input name="enr_date" type="date" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
              </div>
              <button type="submit" className="mt-4 bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium">Enroll</button>
            </form>
            {enrollResult && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
                Enrollment successful: {JSON.stringify(enrollResult)}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Create Performance Review</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setLoading(true); setError(null);
              try {
                const r = await hrReviewCreate({
                  employee_id: fd.get('rev_emp'), reviewer_id: fd.get('rev_by'),
                  period: fd.get('rev_period'), rating: parseInt(fd.get('rev_rating') as string) || 3,
                  notes: fd.get('rev_notes'),
                });
                setEnrollResult(r.result);
              } catch (err) { setError(err instanceof ApiError ? err.message : 'Failed'); }
              finally { setLoading(false); }
            }}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input name="rev_emp" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reviewer ID</label>
                  <input name="rev_by" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                  <input name="rev_period" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Q1 2026" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rating (1-5)</label>
                  <input name="rev_rating" type="number" min={1} max={5} defaultValue={3} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input name="rev_notes" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
              </div>
              <button type="submit" className="mt-4 bg-green-600 text-white px-6 py-2 rounded text-sm font-medium">Create Review</button>
            </form>
          </div>
        </div>
      )}

      {/* Employees Tab */}
      {tab === 'employees' && employees.length > 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map((e: any) => (
                <tr key={e.id ?? e.employee_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">{e.id ?? e.employee_id}</td>
                  <td className="px-4 py-2 font-medium">{e.name ?? `${e.first_name ?? ''} ${e.last_name ?? ''}`}</td>
                  <td className="px-4 py-2">{e.department ?? '-'}</td>
                  <td className="px-4 py-2">{e.role ?? e.title ?? '-'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      e.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>{e.status ?? 'active'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* History Tab — Training & Compensation */}
      {tab === 'history' && !loading && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Employee History Lookup</h2>
            <div className="flex gap-3 items-end">
              <div className="flex-1 max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                <input type="text" value={histEmpId} onChange={e => setHistEmpId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <button onClick={async () => {
                setLoading(true); setError(null);
                try {
                  const [tr, comp] = await Promise.all([
                    hrTrainingHistory({ employee_id: histEmpId }),
                    hrCompensationHistory({ employee_id: histEmpId }),
                  ]);
                  setTrainingHist((tr.result as any)?.records ?? (tr.result as any) ?? []);
                  setCompHist((comp.result as any)?.records ?? (comp.result as any) ?? []);
                } catch (e) {
                  setError(e instanceof ApiError ? e.message : 'Failed to load history');
                } finally { setLoading(false); }
              }}
                className="bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium">
                Load History
              </button>
            </div>
          </div>

          {trainingHist.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <h3 className="px-4 py-3 bg-gray-50 text-sm font-semibold text-gray-700">Training History</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-2">Course</th>
                    <th className="px-4 py-2">Category</th>
                    <th className="px-4 py-2">Completed</th>
                    <th className="px-4 py-2">Expires</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {trainingHist.map((t: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{t.course_name ?? t.course ?? '-'}</td>
                      <td className="px-4 py-2 capitalize">{t.category ?? '-'}</td>
                      <td className="px-4 py-2 text-xs">{t.completion_date ?? t.completed ?? '-'}</td>
                      <td className="px-4 py-2 text-xs">{t.expiration_date ?? t.expires ?? '-'}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.status === 'current' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>{t.status ?? 'unknown'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {compHist.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <h3 className="px-4 py-3 bg-gray-50 text-sm font-semibold text-gray-700">Compensation History</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-2">Effective Date</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {compHist.map((c: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-xs">{c.effective_date ?? c.date ?? '-'}</td>
                      <td className="px-4 py-2 capitalize">{c.type ?? c.change_type ?? '-'}</td>
                      <td className="px-4 py-2 text-right font-mono font-bold">
                        {typeof c.amount === 'number' ? `$${c.amount.toLocaleString()}` : (c.salary ? `$${c.salary.toLocaleString()}` : '-')}
                      </td>
                      <td className="px-4 py-2 text-gray-600">{c.reason ?? c.notes ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
