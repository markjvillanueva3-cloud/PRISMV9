/**
 * EMP-MS0 U-EMP2: Employee Profile Page
 * 5-tab profile: Overview, Skills & Certs, Time History, Cost Analysis, Learning.
 * Wired to backend engines for real data.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ApiError,
  employeeCertifications,
  employeeLearningPath,
  employeeUtilization,
  getTimecard,
  hrTrainingHistory,
  listEmployees,
} from '../api/client';
import type { Employee } from '../api/types';
import { unwrapPrism } from '../api/unwrap';
import { ErrorState, LoadingState } from '../components/LoadingState';
import {
  PanelCard,
  StatusPill,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

type ProfileTab = 'overview' | 'skills' | 'time' | 'cost' | 'learning';

/** Machine → required cert name mapping for access gates */
const MACHINE_CERT_REQUIREMENTS: { machine: string; requiredCert: string }[] = [
  { machine: 'VMC (Vertical Machining Center)', requiredCert: 'CNC Mill Operator' },
  { machine: 'CNC Lathe', requiredCert: 'CNC Lathe Operator' },
  { machine: 'Wire EDM', requiredCert: 'EDM Operator' },
  { machine: 'Surface Grinder', requiredCert: 'Grinding Operator' },
  { machine: 'Laser Cutter', requiredCert: 'Laser Safety' },
  { machine: '5-Axis Mill', requiredCert: '5-Axis Programming' },
  { machine: 'CMM (Coordinate Measuring)', requiredCert: 'CMM Operator' },
  { machine: 'Waterjet', requiredCert: 'Waterjet Operator' },
];

function MachineAccessGates({ certifications }: { certifications: { name: string; expires?: string; status?: string }[] }) {
  const certNames = new Set(certifications.map((c) => c.name?.toLowerCase()));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-500">
            <th className="pb-2 pr-4">Machine</th>
            <th className="pb-2">Access</th>
          </tr>
        </thead>
        <tbody>
          {MACHINE_CERT_REQUIREMENTS.map(({ machine, requiredCert }) => {
            const hasCert = certNames.has(requiredCert.toLowerCase());
            return (
              <tr key={machine} className="border-b border-white/5">
                <td className="py-2 pr-4 text-slate-200">{machine}</td>
                <td className="py-2">
                  {hasCert ? (
                    <span className="text-emerald-400">Certified</span>
                  ) : (
                    <span className="text-red-400" title={`Requires: ${requiredCert}`}>
                      Locked — needs "{requiredCert}"
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function EmployeeProfilePage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [tab, setTab] = useState<ProfileTab>('overview');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab-specific data
  const [certs, setCerts] = useState<any[]>([]);
  const [timeHistory, setTimeHistory] = useState<any>(null);
  const [utilData, setUtilData] = useState<any>(null);
  const [learningPath, setLearningPath] = useState<any>(null);
  const [trainingHistory, setTrainingHistory] = useState<any[]>([]);

  const loadEmployee = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listEmployees();
      const payload = unwrapPrism(res);
      const employees = ((payload as any)?.employees ?? payload ?? []) as Employee[];
      const found = employees.find((e) => e.id === employeeId);
      if (found) {
        setEmployee(found);
      } else {
        setError(`Employee ${employeeId} not found`);
      }
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load employee');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { void loadEmployee(); }, [loadEmployee]);

  // Load tab-specific data
  useEffect(() => {
    if (!employeeId || !employee) return;

    if (tab === 'skills') {
      void employeeCertifications(employeeId)
        .then((r) => {
          const c = unwrapPrism(r);
          setCerts(((c as any)?.certifications ?? c ?? []) as any[]);
        })
        .catch(() => setCerts(employee.certifications ?? []));
    }

    if (tab === 'time') {
      const now = new Date();
      const periodEnd = now.toISOString().split('T')[0];
      const start = new Date(now);
      start.setDate(start.getDate() - 14);
      const periodStart = start.toISOString().split('T')[0];
      void getTimecard({ employee_id: employeeId, period_start: periodStart, period_end: periodEnd })
        .then((r) => setTimeHistory(unwrapPrism(r)))
        .catch(() => setTimeHistory(null));
    }

    if (tab === 'cost') {
      void employeeUtilization({ employee_id: employeeId })
        .then((r) => setUtilData(unwrapPrism(r)))
        .catch(() => setUtilData(null));
    }

    if (tab === 'learning') {
      void employeeLearningPath({ employee_id: employeeId, role: employee.role })
        .then((r) => setLearningPath(unwrapPrism(r)))
        .catch(() => setLearningPath(null));
      void hrTrainingHistory({ employee_id: employeeId })
        .then((r) => {
          const t = unwrapPrism(r);
          setTrainingHistory(((t as any)?.records ?? t ?? []) as any[]);
        })
        .catch(() => setTrainingHistory([]));
    }
  }, [tab, employeeId, employee]);

  const now = useMemo(() => new Date(), []);
  const expiredCerts = useMemo(
    () => (employee?.certifications ?? []).filter((c) => c.expires && new Date(c.expires) < now),
    [employee, now],
  );
  const expiringSoonCerts = useMemo(
    () => (employee?.certifications ?? []).filter((c) => {
      if (!c.expires) return false;
      const d = (new Date(c.expires).getTime() - now.getTime()) / 86400000;
      return d > 0 && d <= 30;
    }),
    [employee, now],
  );

  if (loading) return <LoadingState label="Loading employee profile..." />;
  if (error) return <ErrorState message={error} />;
  if (!employee) return <ErrorState message="Employee not found" />;

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Employee profile"
        title={`${employee.first_name} ${employee.last_name}`}
        description={`${employee.role} in ${employee.department} — ${employee.status}`}
        metrics={
          <>
            <SummaryTile label="Clearance" value={employee.clearance_level ?? 'shop_floor'} hint="Access level in the system." />
            <SummaryTile label="Rate" value={`$${employee.labor_rates?.regular ?? 0}/hr`} hint="Base hourly labor rate." accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
            <SummaryTile label="Skills" value={`${(employee.skills ?? []).length}`} hint={`${(employee.certifications ?? []).length} certifications on file.`} accent="from-violet-400/22 via-violet-300/10 to-transparent" />
          </>
        }
        aside={
          <div className="space-y-4">
            {(expiredCerts.length > 0 || expiringSoonCerts.length > 0) && (
              <div className="space-y-2">
                {expiredCerts.map((c) => (
                  <div key={c.name} className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
                    {c.name} — expired {c.expires}
                  </div>
                ))}
                {expiringSoonCerts.map((c) => (
                  <div key={c.name} className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-300">
                    {c.name} — expires {c.expires}
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>Overview</TabButton>
              <TabButton active={tab === 'skills'} onClick={() => setTab('skills')}>Skills & Certs</TabButton>
              <TabButton active={tab === 'time'} onClick={() => setTab('time')}>Time History</TabButton>
              <TabButton active={tab === 'cost'} onClick={() => setTab('cost')}>Cost Analysis</TabButton>
              <TabButton active={tab === 'learning'} onClick={() => setTab('learning')}>Learning</TabButton>
            </div>
            <Link
              to="/employees"
              className="inline-block text-sm text-cyan-400 transition hover:text-cyan-300"
            >
              Back to Directory
            </Link>
          </div>
        }
      />

      {tab === 'overview' && (
        <div className="grid gap-6 xl:grid-cols-2">
          <PanelCard title="Employee details" subtitle="Core record fields from the people engine.">
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryTile label="ID" value={employee.id} hint="Unique employee identifier." />
              <SummaryTile label="Status" value={employee.status} hint="Current employment status." accent={employee.status === 'active' ? 'from-emerald-400/22 via-emerald-300/10 to-transparent' : 'from-amber-400/22 via-amber-300/10 to-transparent'} />
              <SummaryTile label="Hire date" value={employee.hire_date ?? 'N/A'} hint="Date of hire." />
              <SummaryTile label="Email" value={employee.email ?? 'N/A'} hint="Contact email." />
              <SummaryTile label="Clearance" value={employee.clearance_level ?? 'shop_floor'} hint="System access tier." accent="from-sky-400/22 via-sky-300/10 to-transparent" />
              <SummaryTile label="OT rule" value={employee.overtime_policy?.rule ?? 'weekly'} hint={`Threshold: ${employee.overtime_policy?.weekly_threshold_hrs ?? 40}h/wk`} />
            </div>
          </PanelCard>

          <PanelCard title="Labor rates" subtitle="Pay rates and overtime multipliers.">
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryTile label="Regular" value={`$${employee.labor_rates?.regular ?? 0}/hr`} hint="Base hourly rate." accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
              <SummaryTile label="Overtime" value={`$${employee.labor_rates?.overtime ?? 0}/hr`} hint={`${employee.overtime_policy?.ot_multiplier ?? 1.5}x multiplier.`} accent="from-amber-400/22 via-amber-300/10 to-transparent" />
              <SummaryTile label="Double time" value={`$${employee.labor_rates?.double_time ?? 0}/hr`} hint="Double-time rate." accent="from-red-400/22 via-red-300/10 to-transparent" />
            </div>
          </PanelCard>
        </div>
      )}

      {tab === 'skills' && (
        <div className="grid gap-6 xl:grid-cols-2">
          <PanelCard title="Skills" subtitle="Assigned capabilities and machine qualifications.">
            {(employee.skills ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {employee.skills.map((skill) => (
                  <StatusPill key={skill} label={skill} tone="sky" />
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400">No skills assigned yet.</div>
            )}
          </PanelCard>

          <PanelCard title="Certifications" subtitle="Training certifications with expiry tracking.">
            {(certs.length > 0 ? certs : employee.certifications ?? []).length > 0 ? (
              <div className="space-y-2">
                {(certs.length > 0 ? certs : employee.certifications ?? []).map((cert: any) => {
                  const isExpired = cert.expires && new Date(cert.expires) < now;
                  const daysLeft = cert.expires ? (new Date(cert.expires).getTime() - now.getTime()) / 86400000 : null;
                  const isWarning = daysLeft !== null && daysLeft > 0 && daysLeft <= 30;
                  return (
                    <div
                      key={cert.name ?? cert.id}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        isExpired ? 'border-red-400/30 bg-red-400/10 text-red-300'
                        : isWarning ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                        : 'border-white/8 bg-white/[0.03] text-slate-200'
                      }`}
                    >
                      <span className="font-medium">{cert.name}</span>
                      {cert.expires && (
                        <span className="ml-2 text-xs opacity-80">
                          {isExpired ? `Expired ${cert.expires}` : `Expires ${cert.expires}`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-slate-400">No certifications on file.</div>
            )}
          </PanelCard>
        </div>
      )}

      {tab === 'time' && (
        <PanelCard title="Recent time history" subtitle="Last 14 days of shift and job time entries.">
          {timeHistory ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryTile label="Regular hours" value={`${timeHistory.regular_hours ?? timeHistory.total_hours ?? '-'}`} hint="Standard hours in period." accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
              <SummaryTile label="Overtime hours" value={`${timeHistory.overtime_hours ?? '-'}`} hint="OT hours in period." accent="from-amber-400/22 via-amber-300/10 to-transparent" />
              <SummaryTile label="Total hours" value={`${timeHistory.total_hours ?? '-'}`} hint="All hours tracked." />
              <SummaryTile label="Jobs" value={`${(timeHistory.jobs ?? []).length}`} hint="Distinct jobs worked." accent="from-sky-400/22 via-sky-300/10 to-transparent" />
            </div>
          ) : (
            <div className="text-sm text-slate-400">No timecard data available for this period.</div>
          )}
          {timeHistory?.jobs?.length > 0 && (
            <div className="mt-4 space-y-2">
              {timeHistory.jobs.map((j: any) => (
                <div key={j.job_id} className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-sm">
                  <span className="font-medium text-slate-100">{j.job_id}</span>
                  <span className="text-slate-300">{j.hours?.toFixed(1) ?? '-'}h</span>
                  <span className="font-mono text-emerald-400">${j.cost?.toFixed(2) ?? '-'}</span>
                </div>
              ))}
            </div>
          )}
        </PanelCard>
      )}

      {tab === 'cost' && (
        <div className="grid gap-6 xl:grid-cols-2">
          <PanelCard title="Utilization" subtitle="Labor loading and cost efficiency metrics.">
            {utilData ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <SummaryTile label="Utilization" value={`${utilData.utilization_pct ?? '-'}%`} hint="Percent of capacity used." accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
                <SummaryTile label="Billable hours" value={`${utilData.billable_hours ?? '-'}`} hint="Hours billed to jobs." accent="from-sky-400/22 via-sky-300/10 to-transparent" />
                <SummaryTile label="Total hours" value={`${utilData.total_hours ?? '-'}`} hint="All tracked hours." />
                <SummaryTile label="Active jobs" value={`${utilData.active_jobs ?? '-'}`} hint="Currently assigned jobs." accent="from-violet-400/22 via-violet-300/10 to-transparent" />
              </div>
            ) : (
              <div className="text-sm text-slate-400">No utilization data available.</div>
            )}
          </PanelCard>

          <PanelCard title="Cost breakdown" subtitle="Labor cost impact summary.">
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryTile label="Regular cost" value={`$${((employee.labor_rates?.regular ?? 0) * (utilData?.billable_hours ?? 0)).toFixed(2)}`} hint="Base rate x billable hours." accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
              <SummaryTile label="OT cost" value={`$${((employee.labor_rates?.overtime ?? 0) * (utilData?.overtime_hours ?? 0)).toFixed(2)}`} hint="OT rate x overtime hours." accent="from-amber-400/22 via-amber-300/10 to-transparent" />
            </div>
          </PanelCard>
        </div>
      )}

      {tab === 'learning' && (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <PanelCard title="Learning path" subtitle="Role-based training assignments and progress.">
              {learningPath ? (
                <div className="space-y-3">
                  {(learningPath.courses ?? learningPath.path ?? []).length > 0 ? (
                    (learningPath.courses ?? learningPath.path ?? []).map((course: any, i: number) => (
                      <div key={course.id ?? i} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-100">{course.title ?? course.name ?? course.id}</span>
                          {course.status && <StatusPill label={course.status} tone={course.status === 'completed' ? 'emerald' : course.status === 'in_progress' ? 'sky' : course.status === 'failed' ? 'rose' : 'slate'} />}
                        </div>
                        {course.progress_pct != null && (
                          <div className="mt-2">
                            <div className="h-2 w-full rounded-full bg-slate-700">
                              <div className="h-2 rounded-full bg-cyan-400 transition-all" style={{ width: `${Math.min(100, course.progress_pct)}%` }} />
                            </div>
                            <div className="mt-1 flex justify-between text-xs text-slate-500">
                              <span>{course.progress_pct}%</span>
                              {course.quiz_score != null && <span>Quiz: {course.quiz_score}%</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-400">No learning path assigned for this role.</div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-slate-400">Loading learning path...</div>
              )}
              <div className="mt-4">
                <Link
                  to={`/learning/path?employeeId=${employeeId}`}
                  className="inline-block text-sm text-cyan-400 transition hover:text-cyan-300"
                >
                  View full learning academy
                </Link>
              </div>
            </PanelCard>

            <PanelCard title="Training history" subtitle="Completed courses and certification records.">
              {trainingHistory.length > 0 ? (
                <div className="space-y-2">
                  {trainingHistory.map((record: any) => (
                    <div key={record.id} className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium text-slate-100">{record.course_name}</span>
                        <span className="ml-2 text-xs text-slate-400">{record.category}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-slate-300">{record.completed_date}</div>
                        {record.expiration_date && (
                          <div className={`text-xs ${new Date(record.expiration_date) < now ? 'text-red-400' : 'text-slate-500'}`}>
                            Exp: {record.expiration_date}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-400">No training records found.</div>
              )}
            </PanelCard>
          </div>

          <PanelCard title="Machine access gates" subtitle="Machine certification requirements and operator access status.">
            <MachineAccessGates certifications={certs.length > 0 ? certs : employee.certifications ?? []} />
          </PanelCard>
        </div>
      )}
    </div>
  );
}
