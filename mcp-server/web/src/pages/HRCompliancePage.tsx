import { useEffect, useState } from 'react';
import {
  hrBenefitsList,
  hrComplianceAlerts,
  hrCompensationHistory,
  hrDashboard,
  hrEnroll,
  hrPTOBalance,
  hrPTORequest,
  hrReviewCreate,
  hrReviews,
  hrTrainingExpiring,
  hrTrainingHistory,
  listEmployees,
  ApiError,
} from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import type { BenefitPlan, ComplianceAlert, Employee, HRDashboard, TrainingRecord } from '../api/types';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  Select,
  StatusPill,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

type Tab = 'dashboard' | 'benefits' | 'training' | 'alerts' | 'reviews' | 'pto' | 'enroll' | 'employees' | 'history';

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  dashboard: { label: 'Dashboard', detail: 'Benefits, PTO, training, and compliance posture at a glance.' },
  benefits: { label: 'Benefits', detail: 'Benefit plans, provider posture, and contribution split.' },
  training: { label: 'Training', detail: 'Expiring training and compliance readiness view.' },
  alerts: { label: 'Alerts', detail: 'Compliance alerts staged by severity for quick review.' },
  reviews: { label: 'Reviews', detail: 'Performance-review posture and current review queue.' },
  pto: { label: 'PTO', detail: 'Check balances and submit leave requests from one lane.' },
  enroll: { label: 'Enroll', detail: 'Benefit enrollment and review creation desk.' },
  employees: { label: 'Employees', detail: 'People roster with department and skill posture.' },
  history: { label: 'History', detail: 'Training and compensation history lookup for one employee.' },
};

function severityTone(level?: string): 'emerald' | 'amber' | 'rose' | 'sky' | 'slate' {
  switch ((level ?? '').toLowerCase()) {
    case 'info':
    case 'active':
      return 'sky';
    case 'warning':
    case 'pending':
      return 'amber';
    case 'critical':
    case 'inactive':
      return 'rose';
    default:
      return 'emerald';
  }
}

export function HRCompliancePage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [dash, setDash] = useState<HRDashboard | null>(null);
  const [plans, setPlans] = useState<BenefitPlan[]>([]);
  const [expiring, setExpiring] = useState<TrainingRecord[]>([]);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [ptoPayload, setPtoPayload] = useState<Record<string, unknown> | null>(null);
  const [enrollPayload, setEnrollPayload] = useState<Record<string, unknown> | null>(null);
  const [historyPayload, setHistoryPayload] = useState<Record<string, unknown> | null>(null);
  const [historyEmployeeId, setHistoryEmployeeId] = useState('EMP-001');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeTab = TAB_CONFIG[tab];

  useEffect(() => {
    void loadData(tab);
  }, [tab]);

  async function loadData(target: Tab) {
    setLoading(true);
    setError(null);
    try {
      if (target === 'dashboard') {
        const response = await hrDashboard();
        setDash((response.result as unknown as HRDashboard) ?? null);
      }
      if (target === 'benefits') {
        const response = await hrBenefitsList();
        const next = (response.result as any)?.plans ?? (response.result as any) ?? [];
        setPlans(Array.isArray(next) ? next : []);
      }
      if (target === 'training') {
        const response = await hrTrainingExpiring({ within_days: 90 });
        const next = (response.result as any)?.records ?? (response.result as any) ?? [];
        setExpiring(Array.isArray(next) ? next : []);
      }
      if (target === 'alerts') {
        const response = await hrComplianceAlerts();
        const next = (response.result as any)?.alerts ?? (response.result as any) ?? [];
        setAlerts(Array.isArray(next) ? next : []);
      }
      if (target === 'reviews') {
        const response = await hrReviews();
        const next = (response.result as any)?.reviews ?? (response.result as any) ?? [];
        setReviews(Array.isArray(next) ? next : []);
      }
      if (target === 'employees') {
        const response = await listEmployees();
        const next = (response.result as any)?.employees ?? (response.result as any) ?? [];
        setEmployees(Array.isArray(next) ? next : []);
      }
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load HR workspace');
    } finally {
      setLoading(false);
    }
  }

  async function handlePtoBalance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const response = await hrPTOBalance({ employee_id: String(form.get('pto_emp') ?? '') });
      setPtoPayload((response.result as Record<string, unknown>) ?? null);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'PTO balance request failed');
    } finally {
      setLoading(false);
    }
  }

  async function handlePtoRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const response = await hrPTORequest({
        employee_id: form.get('req_emp'),
        start_date: form.get('req_start'),
        end_date: form.get('req_end'),
        type: form.get('req_type') || 'vacation',
      });
      setPtoPayload((response.result as Record<string, unknown>) ?? null);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'PTO request failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleEnroll(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const response = await hrEnroll({
        employee_id: form.get('employee_id'),
        plan_id: form.get('plan_id'),
        tier: form.get('tier'),
      });
      setEnrollPayload((response.result as Record<string, unknown>) ?? null);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Enrollment failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const response = await hrReviewCreate({
        employee_id: form.get('review_employee'),
        type: form.get('review_type'),
        date: form.get('review_date'),
      });
      setEnrollPayload((response.result as Record<string, unknown>) ?? null);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Review creation failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleHistoryLoad() {
    setLoading(true);
    setError(null);
    try {
      const [trainingResponse, compensationResponse] = await Promise.all([
        hrTrainingHistory({ employee_id: historyEmployeeId }),
        hrCompensationHistory({ employee_id: historyEmployeeId }),
      ]);
      setHistoryPayload({
        training: trainingResponse.result,
        compensation: compensationResponse.result,
      });
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'History lookup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="People and compliance"
        title="HR Compliance"
        description="Benefits, PTO, training, alerts, and employee history now live in one darker people-and-compliance workspace instead of scattered admin forms."
        metrics={
          <>
            <SummaryTile label="Active lane" value={activeTab.label} hint={activeTab.detail} />
            <SummaryTile
              label="Compliance alerts"
              value={dash ? String(dash.compliance_alerts) : String(alerts.length)}
              hint="Current count of active compliance risks."
              accent="from-amber-300/22 via-amber-200/8 to-transparent"
            />
            <SummaryTile
              label="Training compliance"
              value={dash ? `${dash.training_compliance_pct}%` : 'Standby'}
              hint="Training readiness across the current employee base."
              accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              Keep workforce health, training risk, and benefits administration in one people desk so compliance posture stays visible next to the day-to-day admin work.
            </div>
            <div className="grid gap-2">
              <ActionButton onClick={() => setTab('dashboard')}>Open dashboard</ActionButton>
              <ActionButton tone="emerald" onClick={() => setTab('pto')}>
                Manage PTO
              </ActionButton>
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(Object.entries(TAB_CONFIG) as Array<[Tab, { label: string; detail: string }]>).map(([key, config]) => (
          <TabButton key={key} active={tab === key} onClick={() => setTab(key)}>
            {config.label}
          </TabButton>
        ))}
      </div>

      {loading ? <LoadingState label="Refreshing HR workspace..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void loadData(tab)} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.14fr)_minmax(360px,0.86fr)]">
        <div className="space-y-6">
          {tab === 'dashboard' ? (
            <PanelCard title="HR overview" subtitle="The top-line people and compliance signal stays visible before you open admin lanes.">
              {dash ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <SummaryTile label="Enrolled employees" value={String(dash.total_enrolled)} hint="Employees with active benefits enrollment." />
                  <SummaryTile label="Monthly benefit cost" value={`$${dash.total_employer_benefit_cost.toFixed(0)}`} hint="Employer-side benefit spend." accent="from-sky-400/22 via-sky-300/8 to-transparent" />
                  <SummaryTile label="Average PTO" value={`${dash.avg_pto_balance} h`} hint="Average available PTO balance." accent="from-violet-400/22 via-violet-300/8 to-transparent" />
                  <SummaryTile label="Training compliance" value={`${dash.training_compliance_pct}%`} hint="Current training readiness posture." accent="from-emerald-400/22 via-emerald-300/8 to-transparent" />
                  <SummaryTile label="Pending reviews" value={String(dash.pending_reviews)} hint="Open performance-review items." accent="from-amber-300/22 via-amber-200/8 to-transparent" />
                  <SummaryTile label="Compliance alerts" value={String(dash.compliance_alerts)} hint="Current compliance issues needing attention." accent="from-rose-400/22 via-rose-300/8 to-transparent" />
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                  HR dashboard metrics are not loaded in this snapshot.
                </div>
              )}
            </PanelCard>
          ) : null}

          {tab === 'benefits' ? (
            <PanelCard title="Benefits board" subtitle="Provider posture and contribution split without a legacy admin table.">
              <div className="space-y-3">
                {plans.length > 0 ? (
                  plans.map((plan) => (
                    <div key={plan.id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-50">{plan.name}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{plan.type}</div>
                        </div>
                        <StatusPill label={plan.provider} tone="sky" />
                      </div>
                      <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                        <div>
                          <span className="text-slate-500">Employer:</span> ${plan.employer_contribution.toFixed(0)}/mo
                        </div>
                        <div>
                          <span className="text-slate-500">Employee:</span> ${plan.employee_contribution.toFixed(0)}/mo
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No benefit plans are staged in the current response.
                  </div>
                )}
              </div>
            </PanelCard>
          ) : null}

          {tab === 'training' ? (
            <PanelCard title="Training readiness" subtitle="See expiring records before they become a compliance interruption.">
              <div className="space-y-3">
                {expiring.length > 0 ? (
                  expiring.map((record) => (
                    <div key={record.id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-50">{record.course_name}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                            {record.employee_id} · {record.category}
                          </div>
                        </div>
                        <StatusPill label={record.status} tone="amber" />
                      </div>
                      <div className="mt-4 text-sm text-slate-300">
                        Expires: {record.expiration_date ?? 'No expiration date'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No training records are expiring in the current window.
                  </div>
                )}
              </div>
            </PanelCard>
          ) : null}

          {tab === 'alerts' ? (
            <PanelCard title="Compliance alerts" subtitle="Severity-led alert cards keep the review pass focused and readable.">
              <div className="space-y-3">
                {alerts.length > 0 ? (
                  alerts.map((alert, index) => (
                    <div key={`${alert.type}-${index}`} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-50">{alert.type}</div>
                        <StatusPill label={alert.severity} tone={severityTone(alert.severity)} />
                      </div>
                      <div className="mt-3 text-sm leading-6 text-slate-300">{alert.description}</div>
                      <div className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">{alert.regulation}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No compliance alerts are staged right now.
                  </div>
                )}
              </div>
            </PanelCard>
          ) : null}

          {tab === 'reviews' ? (
            <PanelCard title="Review queue" subtitle="Performance reviews stay visible with status and timing posture.">
              <div className="space-y-3">
                {reviews.length > 0 ? (
                  reviews.map((review, index) => (
                    <div key={`${review.employee_id ?? review.employee_name ?? 'review'}-${index}`} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-50">{review.employee_id ?? review.employee_name ?? 'Employee'}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{review.type ?? review.review_type ?? 'review'}</div>
                        </div>
                        <StatusPill label={review.status ?? 'pending'} tone={severityTone(review.status)} />
                      </div>
                      <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                        <div>
                          <span className="text-slate-500">Date:</span> {review.date ?? review.review_date ?? '-'}
                        </div>
                        <div>
                          <span className="text-slate-500">Rating:</span> {review.rating ?? '-'}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No review queue is staged in the current response.
                  </div>
                )}
              </div>
            </PanelCard>
          ) : null}

          {tab === 'pto' ? (
            <div className="space-y-6">
              <PanelCard title="Check PTO balance" subtitle="Check leave balance without leaving the people workspace.">
                <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]" onSubmit={handlePtoBalance}>
                  <Field label="Employee ID">
                    <Input name="pto_emp" placeholder="EMP-001" required />
                  </Field>
                  <div className="md:self-end">
                    <button type="submit" className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">
                      Check PTO
                    </button>
                  </div>
                </form>
              </PanelCard>

              <PanelCard title="Submit PTO request" subtitle="Stage leave requests in the same lane so balances and requests stay connected.">
                <form className="grid gap-4 md:grid-cols-2" onSubmit={handlePtoRequest}>
                  <Field label="Employee ID">
                    <Input name="req_emp" placeholder="EMP-001" required />
                  </Field>
                  <Field label="Type">
                    <Select name="req_type" defaultValue="vacation">
                      <option value="vacation">Vacation</option>
                      <option value="sick">Sick</option>
                      <option value="personal">Personal</option>
                    </Select>
                  </Field>
                  <Field label="Start date">
                    <Input name="req_start" type="date" required />
                  </Field>
                  <Field label="End date">
                    <Input name="req_end" type="date" required />
                  </Field>
                  <div className="md:col-span-2">
                    <button type="submit" className="rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200">
                      Submit PTO request
                    </button>
                  </div>
                </form>
              </PanelCard>

              {ptoPayload ? (
                <PanelCard title="PTO response" subtitle="Keep the most recent PTO payload visible for review.">
                  <pre className="overflow-x-auto rounded-[22px] border border-white/8 bg-slate-950/70 p-4 text-xs text-slate-200">
                    {JSON.stringify(ptoPayload, null, 2)}
                  </pre>
                </PanelCard>
              ) : null}
            </div>
          ) : null}

          {tab === 'enroll' ? (
            <div className="space-y-6">
              <PanelCard title="Benefit enrollment" subtitle="Enroll an employee without leaving the benefits command surface.">
                <form className="grid gap-4 md:grid-cols-2" onSubmit={handleEnroll}>
                  <Field label="Employee ID">
                    <Input name="employee_id" placeholder="EMP-001" required />
                  </Field>
                  <Field label="Plan ID">
                    <Input name="plan_id" placeholder="BEN-PLAN-01" required />
                  </Field>
                  <Field label="Tier">
                    <Input name="tier" placeholder="employee_only / family" />
                  </Field>
                  <div className="md:col-span-2">
                    <button type="submit" className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">
                      Enroll employee
                    </button>
                  </div>
                </form>
              </PanelCard>

              <PanelCard title="Create review" subtitle="Stage a review request from the same people operations desk.">
                <form className="grid gap-4 md:grid-cols-2" onSubmit={handleReview}>
                  <Field label="Employee ID">
                    <Input name="review_employee" placeholder="EMP-001" required />
                  </Field>
                  <Field label="Review type">
                    <Select name="review_type" defaultValue="annual">
                      <option value="annual">Annual</option>
                      <option value="probation">Probation</option>
                      <option value="promotion">Promotion</option>
                    </Select>
                  </Field>
                  <Field label="Review date">
                    <Input name="review_date" type="date" required />
                  </Field>
                  <div className="md:col-span-2">
                    <button type="submit" className="rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200">
                      Create review
                    </button>
                  </div>
                </form>
              </PanelCard>

              {enrollPayload ? (
                <PanelCard title="People operations response" subtitle="Most recent enrollment or review payload.">
                  <pre className="overflow-x-auto rounded-[22px] border border-white/8 bg-slate-950/70 p-4 text-xs text-slate-200">
                    {JSON.stringify(enrollPayload, null, 2)}
                  </pre>
                </PanelCard>
              ) : null}
            </div>
          ) : null}

          {tab === 'employees' ? (
            <PanelCard title="Employee roster" subtitle="People, department, and current status in a cleaner roster desk.">
              <div className="space-y-3">
                {employees.length > 0 ? (
                  employees.map((employee) => (
                    <div key={employee.id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-50">
                            {employee.first_name} {employee.last_name}
                          </div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                            {employee.department} · {employee.role}
                          </div>
                        </div>
                        <StatusPill label={employee.status} tone={severityTone(employee.status)} />
                      </div>
                      <div className="mt-4 text-sm text-slate-300">
                        Skills: {employee.skills.length > 0 ? employee.skills.join(', ') : 'No skills listed'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No employees are staged in the current response.
                  </div>
                )}
              </div>
            </PanelCard>
          ) : null}

          {tab === 'history' ? (
            <PanelCard title="Employee history" subtitle="Load training and compensation history from one lookup lane.">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <Field label="Employee ID">
                  <Input value={historyEmployeeId} onChange={(event) => setHistoryEmployeeId(event.target.value)} placeholder="EMP-001" />
                </Field>
                <div className="md:self-end">
                  <ActionButton onClick={handleHistoryLoad}>Load history</ActionButton>
                </div>
              </div>
              {historyPayload ? (
                <pre className="mt-5 overflow-x-auto rounded-[22px] border border-white/8 bg-slate-950/70 p-4 text-xs text-slate-200">
                  {JSON.stringify(historyPayload, null, 2)}
                </pre>
              ) : null}
            </PanelCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <PanelCard title="People desk brief" subtitle="Keep the goal of the current HR lane visible while working through admin actions.">
            <div className="space-y-4 text-sm text-slate-300">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current lane</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{activeTab.label}</div>
                <div className="mt-2 leading-6 text-slate-400">{activeTab.detail}</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">People operations cues</div>
                <ul className="mt-3 space-y-2 text-slate-300">
                  <li>Start from the dashboard so benefits, training, and alert posture set the tone for deeper work.</li>
                  <li>Keep PTO and benefits close together when reviewing availability or enrollment changes.</li>
                  <li>Use the history lane for audit trails before making compensation or training decisions.</li>
                </ul>
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
