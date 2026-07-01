import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ApiError,
  employeeAddSkill,
  employeeCreate,
  employeeDeptSummary,
  employeeSearch,
  employeeUpdate,
  employeeUtilization,
  listEmployees,
  shiftClockIn,
  shiftClockOut,
  updateEmployeeStatus,
} from '../api/client';
import { unwrapPrism } from '../api/unwrap';
import { ErrorState, LoadingState } from '../components/LoadingState';
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
import type { Employee } from '../api/types';
import { EmployeeEditModal } from '../components/employee/EmployeeEditModal';
import { OnboardingModal } from '../components/employee/OnboardingModal';
import { StatusChangeModal } from '../components/employee/StatusChangeModal';
import { buildShopFloorPath } from '../utils/shopFloorRoute';
import { buildWorkflowPath, formatWorkflowSourceLabel, parseWorkflowRouteContext } from '../utils/workflowRouteContext';

type DirectoryTab = 'directory' | 'departments' | 'onboard' | 'utilization';

export function EmployeeDirectoryPage() {
  const location = useLocation();
  const routeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeContext = useMemo(() => parseWorkflowRouteContext(location.search), [location.search]);
  const launcherSource = routeParams.get('source') || routeContext.origin.source || '';
  const upstreamSource = routeContext.origin.source && routeContext.origin.source !== launcherSource ? routeContext.origin.source : '';
  const routedEmployeeId = routeParams.get('employeeId') || (routeContext.focus.type === 'employee' ? routeContext.focus.id : '');
  const launcherSourceLabel = formatWorkflowSourceLabel(launcherSource);
  const upstreamSourceLabel = formatWorkflowSourceLabel(upstreamSource);
  const [tab, setTab] = useState<DirectoryTab>('directory');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [deptSummary, setDeptSummary] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [utilData, setUtilData] = useState<any>(null);
  const [utilEmpId, setUtilEmpId] = useState('');
  const [newFirst, setNewFirst] = useState('');
  const [newLast, setNewLast] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newRate, setNewRate] = useState('');
  const [onboardResult, setOnboardResult] = useState<any>(null);
  const [skillEmpId, setSkillEmpId] = useState('');
  const [skillName, setSkillName] = useState('');
  const [skillResult, setSkillResult] = useState<any>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [onboardingEmployee, setOnboardingEmployee] = useState<{ id: string; name: string } | null>(null);
  const [statusChangeEmployee, setStatusChangeEmployee] = useState<Employee | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  async function loadEmployees() {
    setLoading(true);
    setError(null);
    try {
      const response = searchQuery ? await employeeSearch({ query: searchQuery }) : await listEmployees();
      const payload = unwrapPrism(response);
      setEmployees((((payload as any)?.employees ?? payload ?? []) as Employee[]));
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }

  async function loadDepartments() {
    setLoading(true);
    setError(null);
    try {
      const response = await employeeDeptSummary();
      const payload = unwrapPrism(response);
      setDeptSummary((((payload as any)?.departments ?? payload ?? []) as any[]));
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'directory' || tab === 'onboard' || tab === 'utilization') {
      void loadEmployees();
    }
    if (tab === 'departments') {
      void loadDepartments();
    }
  }, [tab]);

  useEffect(() => {
    if (!routedEmployeeId) return;
    setUtilEmpId((current) => current || routedEmployeeId);
    setSkillEmpId((current) => current || routedEmployeeId);
  }, [routedEmployeeId]);

  const headcount = employees.length;
  const activeHeadcount = useMemo(() => employees.filter((employee) => employee.status === 'active').length, [employees]);
  const uniqueSkills = useMemo(() => new Set(employees.flatMap((employee) => employee.skills ?? [])).size, [employees]);
  const topDepartments = useMemo(
    () => [...new Map(employees.map((employee) => [employee.department, 1])).keys()].slice(0, 3).join(', '),
    [employees],
  );
  const workflowEmployee =
    employees.find((employee) => employee.id === utilEmpId || employee.id === skillEmpId || employee.id === routedEmployeeId)
    ?? (employees.length === 1 ? employees[0] : null);
  const workflowEmployeeId = workflowEmployee?.id || routedEmployeeId || '';
  const workforceSubjectLabel = workflowEmployee ? `${workflowEmployee.first_name} ${workflowEmployee.last_name}` : 'the selected employee';
  const workflowRecordType = workflowEmployee ? 'Employee' : routeContext.origin.recordType;
  const workflowRecordId = workflowEmployeeId || routeContext.origin.recordId;
  const effectiveOrigin = useMemo(
    () =>
      routeContext.origin.source
        ? routeContext.origin
        : {
            source: launcherSource || 'employee-directory',
            recordType: workflowRecordType,
            recordId: workflowRecordId,
            customer: routeContext.origin.customer,
            note:
              routeContext.origin.note
              || `Keep ${workforceSubjectLabel} attached while workforce work moves into timecards, payroll, and live floor execution.`,
            threadId: routeContext.origin.threadId,
          },
    [launcherSource, routeContext.origin, workforceSubjectLabel, workflowRecordId, workflowRecordType, workflowEmployee],
  );
  const effectiveFocus = useMemo(
    () =>
      workflowEmployee
        ? {
            type: 'employee',
            id: workflowEmployee.id,
          }
        : routeContext.focus.id
          ? routeContext.focus
          : undefined,
    [routeContext.focus, workflowEmployee],
  );
  const workforceReference = workflowRecordType && workflowRecordId ? `${workflowRecordType} ${workflowRecordId}` : '';
  const canLaunchWorkforceFollowup = workflowEmployeeId.length > 0;
  const timecardsPath = useMemo(
    () =>
      buildWorkflowPath('/timecards', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'employee-directory',
          employeeId: workflowEmployeeId || undefined,
        },
      }),
    [effectiveFocus, effectiveOrigin, location.search, workflowEmployeeId],
  );
  const payrollPath = useMemo(
    () =>
      buildWorkflowPath('/payroll', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'employee-directory',
          employeeId: workflowEmployeeId || undefined,
        },
      }),
    [effectiveFocus, effectiveOrigin, location.search, workflowEmployeeId],
  );
  const shopFloorPath = useMemo(
    () =>
      buildShopFloorPath(location.pathname, location.search, {
        source: 'employee-directory',
        note:
          routeContext.origin.note
          || `Launch ${workforceSubjectLabel} into live shift and task tracking with workforce context intact.`,
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          employeeId: workflowEmployeeId || undefined,
        },
      }),
    [effectiveFocus, effectiveOrigin, location.pathname, location.search, routeContext.origin.note, workforceSubjectLabel, workflowEmployeeId],
  );

  async function handleCreateEmployee() {
    setLoading(true);
    setError(null);
    try {
      const response = await employeeCreate({
        first_name: newFirst,
        last_name: newLast,
        department: newDept,
        role: newRole,
        hourly_rate: parseFloat(newRate) || 0,
      });
      const result = unwrapPrism(response) as any;
      setOnboardResult(result);
      setOnboardingEmployee({ id: result?.id ?? '', name: `${newFirst} ${newLast}` });
      await loadEmployees();
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to create employee');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSkill() {
    setLoading(true);
    setError(null);
    try {
      const response = await employeeAddSkill({ employee_id: skillEmpId, skill: skillName });
      setSkillResult(unwrapPrism(response));
      await loadEmployees();
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to add skill');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEmployee(employeeId: string, updates: Record<string, unknown>) {
    setEditSaving(true);
    setError(null);
    try {
      await employeeUpdate({ employee_id: employeeId, updates });
      setEditingEmployee(null);
      await loadEmployees();
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to update employee');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleManagerCloseShift(employeeId: string, reason: string) {
    setEditSaving(true);
    setError(null);
    try {
      await shiftClockOut({ employee_id: employeeId, handoff_notes: reason });
      setEditingEmployee(null);
      await loadEmployees();
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to close shift');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleClockInFor(employeeId: string, name: string) {
    setLoading(true);
    setError(null);
    setActionNotice(null);
    try {
      await shiftClockIn({ employee_id: employeeId });
      await loadEmployees();
      setActionNotice(`Clocked in ${name} successfully.`);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : `Failed to clock in ${name}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleClockOutFor(employeeId: string, name: string) {
    setLoading(true);
    setError(null);
    setActionNotice(null);
    try {
      await shiftClockOut({
        employee_id: employeeId,
        handoff_notes: `Manager clocked out ${name} from the employee directory.`,
      });
      await loadEmployees();
      setActionNotice(`Clocked out ${name} successfully.`);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : `Failed to clock out ${name}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleUtilization() {
    setLoading(true);
    setError(null);
    try {
      const response = await employeeUtilization({ employee_id: utilEmpId });
      setUtilData(unwrapPrism(response));
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load utilization');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="People and capability"
        title="Employee Directory"
        description="Search the workforce, keep departments visible, onboard new people, and monitor skill and utilization posture from one operations desk."
        metrics={
          <>
            <SummaryTile label="Headcount" value={`${headcount}`} hint="Employees currently loaded into the people directory." />
            <SummaryTile label="Active roster" value={`${activeHeadcount}`} hint="People available for current production work." accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
            <SummaryTile label="Skill tags" value={`${uniqueSkills}`} hint={topDepartments || 'Department mix appears here after the roster loads.'} accent="from-violet-400/22 via-violet-300/10 to-transparent" />
          </>
        }
        aside={
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Workforce lanes</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                Use the tabs to move between roster review, department posture, onboarding, and individual utilization without losing the broader workforce picture.
              </div>
            </div>
            {launcherSource ? (
              <div className="rounded-[22px] border border-cyan-300/18 bg-cyan-300/[0.08] px-4 py-4 text-sm leading-6 text-cyan-50">
                {launcherSourceLabel || 'This workflow'} opened Employee Directory with workforce context.{' '}
                {effectiveOrigin.note || 'Keep the selected employee attached while work moves into timecards, payroll, and floor execution.'}
                {workforceReference ? (
                  <div className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-cyan-100/90">
                    Record: <span className="font-semibold normal-case tracking-normal">{workforceReference}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
            {upstreamSourceLabel ? (
              <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-200">
                Upstream workforce origin: <span className="font-semibold text-slate-50">{upstreamSourceLabel}</span>.
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <TabButton active={tab === 'directory'} onClick={() => setTab('directory')}>Directory</TabButton>
              <TabButton active={tab === 'departments'} onClick={() => setTab('departments')}>Departments</TabButton>
              <TabButton active={tab === 'onboard'} onClick={() => setTab('onboard')}>Onboard</TabButton>
              <TabButton active={tab === 'utilization'} onClick={() => setTab('utilization')}>Utilization</TabButton>
            </div>
          </div>
        }
      />

      {loading ? <LoadingState label="Refreshing workforce desk..." /> : null}
      {error ? <ErrorState message={error} /> : null}
      {actionNotice ? (
        <div className="rounded-[24px] border border-emerald-300/18 bg-emerald-300/[0.08] px-5 py-4 text-sm text-emerald-100">
          {actionNotice}
        </div>
      ) : null}

      {tab === 'directory' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
          <div className="space-y-6">
            <PanelCard title="Employee roster" subtitle="Search the team by role, department, or skill and keep status readable at a glance.">
              <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by name, skill, or department..."
                />
                <ActionButton onClick={() => void loadEmployees()} disabled={loading}>Search</ActionButton>
              </div>

              {employees.length > 0 ? (
                <div className="grid gap-3">
                  {employees.map((employee) => (
                    <div key={employee.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold text-slate-50">
                            {employee.first_name} {employee.last_name}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <StatusPill label={employee.department} tone="violet" />
                            <StatusPill label={employee.role} tone="sky" />
                            <StatusPill label={employee.status} tone={employee.status === 'active' ? 'emerald' : employee.status === 'on_leave' ? 'amber' : 'slate'} />
                          </div>
                        </div>
                        <div className="text-right text-sm text-slate-300">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Rates</div>
                          <div className="mt-2 font-mono text-slate-100">${employee.labor_rates?.regular ?? 0}/hr</div>
                        </div>
                      </div>
                      {/* Cert expiry warnings */}
                      {(employee.certifications ?? []).some((c) => c.expires && new Date(c.expires) < new Date()) && (
                        <div className="mt-2 rounded-lg border border-red-400/20 bg-red-400/8 px-3 py-1.5 text-xs text-red-300">
                          Expired certifications
                        </div>
                      )}
                      {(employee.certifications ?? []).some((c) => {
                        if (!c.expires) return false;
                        const d = (new Date(c.expires).getTime() - Date.now()) / 86400000;
                        return d > 0 && d <= 30;
                      }) && (
                        <div className="mt-2 rounded-lg border border-amber-400/20 bg-amber-400/8 px-3 py-1.5 text-xs text-amber-300">
                          Certifications expiring soon
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {(employee.skills ?? []).slice(0, 6).map((skill) => (
                          <StatusPill key={`${employee.id}-${skill}`} label={skill} tone="slate" />
                        ))}
                        {(employee.skills ?? []).length === 0 ? (
                          <span className="text-sm text-slate-400">No skill tags on file yet.</span>
                        ) : null}
                        <Link
                          to={`/employees/${employee.id}`}
                          className="ml-auto rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10"
                        >
                          Profile
                        </Link>
                        <Link
                          to={`/timecards?employeeId=${employee.id}`}
                          className="rounded-lg border border-sky-300/20 bg-sky-300/8 px-3 py-1.5 text-xs font-medium text-sky-300 transition hover:bg-sky-300/16"
                        >
                          Timecard
                        </Link>
                        <button
                          onClick={() => setEditingEmployee(employee)}
                          className="rounded-lg border border-cyan-300/20 bg-cyan-300/8 px-3 py-1.5 text-xs font-medium text-cyan-300 transition hover:bg-cyan-300/16"
                        >
                          Edit
                        </button>
                          <button
                            onClick={() => void handleClockInFor(employee.id, `${employee.first_name} ${employee.last_name}`)}
                            disabled={loading || employee.status !== 'active'}
                            className="rounded-lg border border-emerald-300/20 bg-emerald-300/8 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-300/16 disabled:opacity-50"
                          >
                            Clock In For
                          </button>
                          <button
                            onClick={() => void handleClockOutFor(employee.id, `${employee.first_name} ${employee.last_name}`)}
                            disabled={loading || employee.status !== 'active'}
                            className="rounded-lg border border-rose-300/20 bg-rose-300/8 px-3 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-300/16 disabled:opacity-50"
                          >
                            Clock Out For
                          </button>
                          <button
                            onClick={() => setStatusChangeEmployee(employee)}
                            className="rounded-lg border border-amber-300/20 bg-amber-300/8 px-3 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-300/16"
                        >
                          Status
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                  Search the roster to load employees, departments, and skill tags into the directory view.
                </div>
              )}
            </PanelCard>
          </div>

          <div className="space-y-6">
            <PanelCard title="Roster brief" subtitle="A compact summary lane for coverage, departments, and skill spread.">
              <div className="grid gap-3">
                <SummaryTile label="Departments" value={`${new Set(employees.map((employee) => employee.department)).size}`} hint={topDepartments || 'Department mix loads with the roster.'} accent="from-sky-400/22 via-sky-300/10 to-transparent" />
                <SummaryTile label="Certifications" value={`${employees.reduce((sum, employee) => sum + (employee.certifications?.length ?? 0), 0)}`} hint="Total certifications across loaded employees." accent="from-cyan-400/22 via-cyan-300/10 to-transparent" />
                <SummaryTile label="Search mode" value={searchQuery ? 'Filtered' : 'All'} hint={searchQuery || 'Showing the full employee roster.'} accent="from-violet-400/22 via-violet-300/10 to-transparent" />
              </div>
            </PanelCard>

            <PanelCard title="Workforce handoff" subtitle="Push an explicitly selected employee into time review, payroll, or live floor work without losing workforce context.">
              {!canLaunchWorkforceFollowup ? (
                <div className="rounded-[22px] border border-amber-300/18 bg-amber-300/[0.08] px-4 py-4 text-sm leading-6 text-amber-50">
                  Select an employee from the roster, utilization, or skill lane before launching a timecard, payroll, or shop-floor follow-up.
                </div>
              ) : null}
              <div className="grid gap-3">
                {canLaunchWorkforceFollowup ? (
                  <Link
                    to={timecardsPath}
                    className="block rounded-[22px] border border-sky-300/20 bg-sky-300/[0.10] px-4 py-4 text-sm leading-6 text-sky-50 transition hover:border-sky-300/32 hover:bg-sky-300/[0.16]"
                  >
                    <div className="font-semibold">Open Timecards follow-up</div>
                    <div className="mt-2 text-sky-50/80">
                      Carry {workforceSubjectLabel} into weekly labor review and approval without reopening the roster cold.
                    </div>
                  </Link>
                ) : (
                  <div className="rounded-[22px] border border-sky-300/12 bg-sky-300/[0.05] px-4 py-4 text-sm leading-6 text-sky-100/60">
                    <div className="font-semibold">Open Timecards follow-up</div>
                    <div className="mt-2">
                      This handoff unlocks after an employee is explicitly selected.
                    </div>
                  </div>
                )}

                {canLaunchWorkforceFollowup ? (
                  <Link
                    to={payrollPath}
                    className="block rounded-[22px] border border-emerald-300/20 bg-emerald-300/[0.10] px-4 py-4 text-sm leading-6 text-emerald-50 transition hover:border-emerald-300/32 hover:bg-emerald-300/[0.16]"
                  >
                    <div className="font-semibold">Open Payroll follow-up</div>
                    <div className="mt-2 text-emerald-50/80">
                      Keep the same workforce context visible when labor review rolls into the pay-period register.
                    </div>
                  </Link>
                ) : (
                  <div className="rounded-[22px] border border-emerald-300/12 bg-emerald-300/[0.05] px-4 py-4 text-sm leading-6 text-emerald-100/60">
                    <div className="font-semibold">Open Payroll follow-up</div>
                    <div className="mt-2">
                      Select a person first so payroll follow-up stays pinned to the right workforce context.
                    </div>
                  </div>
                )}

                {canLaunchWorkforceFollowup ? (
                  <Link
                    to={shopFloorPath}
                    className="block rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-6 text-slate-100 transition hover:border-white/18 hover:bg-white/[0.07]"
                  >
                    <div className="font-semibold">Open Shop Floor Clock</div>
                    <div className="mt-2 text-slate-300">
                      Launch {workforceSubjectLabel} into live shift and task tracking without dropping workforce provenance.
                    </div>
                  </Link>
                ) : (
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-400">
                    <div className="font-semibold text-slate-200">Open Shop Floor Clock</div>
                    <div className="mt-2">
                      Pick the employee first so the live floor launch does not guess which person you meant.
                    </div>
                  </div>
                )}
              </div>
            </PanelCard>
          </div>
        </div>
      ) : null}

      {tab === 'departments' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
          <PanelCard title="Department posture" subtitle="Use this lane to compare staffing, utilization, and average labor rates across departments.">
            {deptSummary.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {deptSummary.map((department) => (
                  <div key={department.department ?? department.name} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="text-lg font-semibold text-slate-50">{department.department ?? department.name}</div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <SummaryTile label="Headcount" value={`${department.headcount ?? department.count ?? '-'}`} hint="People assigned to this team." />
                      <SummaryTile label="Utilization" value={`${department.utilization_pct ?? '-'}%`} hint="Average department loading in the current view." accent="from-amber-400/22 via-amber-300/10 to-transparent" />
                      <SummaryTile label="Avg rate" value={`$${department.avg_rate ?? '-'} /hr`} hint="Average labor cost rate for the department." accent="from-violet-400/22 via-violet-300/10 to-transparent" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                Department summary will populate here after the people analytics load.
              </div>
            )}
          </PanelCard>

          <PanelCard title="Department brief" subtitle="Fast operational read for supervisors deciding staffing pressure or hiring focus.">
            <div className="grid gap-3">
              <SummaryTile label="Department count" value={`${deptSummary.length}`} hint="Distinct departments returned by the summary engine." accent="from-sky-400/22 via-sky-300/10 to-transparent" />
              <SummaryTile label="Largest team" value={`${deptSummary[0]?.department ?? deptSummary[0]?.name ?? 'Pending'}`} hint="Top visible team in the current response set." accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
            </div>
          </PanelCard>
        </div>
      ) : null}

      {tab === 'onboard' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          <div className="space-y-6">
            <PanelCard title="New employee" subtitle="Capture role, department, and hourly rate without leaving the people desk.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="First name">
                  <Input type="text" value={newFirst} onChange={(event) => setNewFirst(event.target.value)} placeholder="Avery" />
                </Field>
                <Field label="Last name">
                  <Input type="text" value={newLast} onChange={(event) => setNewLast(event.target.value)} placeholder="Stone" />
                </Field>
                <Field label="Department">
                  <Input type="text" value={newDept} onChange={(event) => setNewDept(event.target.value)} placeholder="CNC Milling" />
                </Field>
                <Field label="Role">
                  <Input type="text" value={newRole} onChange={(event) => setNewRole(event.target.value)} placeholder="Lead machinist" />
                </Field>
                <Field label="Hourly rate">
                  <Input type="number" value={newRate} onChange={(event) => setNewRate(event.target.value)} placeholder="38" />
                </Field>
              </div>
              <div className="mt-4">
                <ActionButton onClick={() => void handleCreateEmployee()} disabled={!newFirst || !newLast || loading}>
                  Create employee
                </ActionButton>
              </div>
              {onboardResult ? (
                <div className="mt-4 rounded-[22px] border border-emerald-300/18 bg-emerald-300/[0.08] px-4 py-4 text-sm text-emerald-100">
                  Employee created and added to the workforce desk.
                </div>
              ) : null}
            </PanelCard>

            <PanelCard title="Skill assignment" subtitle="Apply new capabilities the same moment a person joins the roster.">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px]">
                <Field label="Employee">
                  <Select value={skillEmpId} onChange={(event) => setSkillEmpId(event.target.value)}>
                    <option value="">Select employee</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Skill">
                  <Input type="text" value={skillName} onChange={(event) => setSkillName(event.target.value)} placeholder="5-axis programming" />
                </Field>
                <div className="flex items-end">
                  <ActionButton onClick={() => void handleAddSkill()} disabled={!skillEmpId || !skillName || loading} className="w-full">
                    Add skill
                  </ActionButton>
                </div>
              </div>
              {skillResult ? (
                <div className="mt-4 rounded-[22px] border border-cyan-300/16 bg-cyan-300/[0.08] px-4 py-4 text-sm text-cyan-100">
                  Skill was attached to the selected employee record.
                </div>
              ) : null}
            </PanelCard>
          </div>

          <PanelCard title="Onboarding brief" subtitle="Keep the target employee and resulting skill state visible while you add new people.">
            {workflowEmployee ? (
              <div className="space-y-3">
                <SummaryTile label="Selected employee" value={`${workflowEmployee.first_name} ${workflowEmployee.last_name}`} hint="The currently selected person for skill or utilization actions." accent="from-cyan-400/22 via-cyan-300/10 to-transparent" />
                <SummaryTile label="Department" value={workflowEmployee.department} hint="Department assignment on the roster." accent="from-violet-400/22 via-violet-300/10 to-transparent" />
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                Select an employee in the skill assignment panel to keep their context pinned here.
              </div>
            )}
          </PanelCard>
        </div>
      ) : null}

      {tab === 'utilization' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,1fr)]">
          <PanelCard title="Utilization lookup" subtitle="Check how heavily an individual is loaded before assigning more work.">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <Field label="Employee">
                <Select value={utilEmpId} onChange={(event) => setUtilEmpId(event.target.value)}>
                  <option value="">Select employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="flex items-end">
                <ActionButton onClick={() => void handleUtilization()} disabled={!utilEmpId || loading} className="w-full">
                  Check utilization
                </ActionButton>
              </div>
            </div>

            {utilData ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {[
                  { label: 'Utilization', value: `${utilData.utilization_pct ?? '-'}%`, hint: 'Percent of available labor capacity in use.' },
                  { label: 'Billable hours', value: `${utilData.billable_hours ?? '-'}`, hint: 'Tracked as billable in the current window.' },
                  { label: 'Total hours', value: `${utilData.total_hours ?? '-'}`, hint: 'All hours counted for the utilization check.' },
                  { label: 'Active jobs', value: `${utilData.active_jobs ?? '-'}`, hint: 'Jobs currently linked to the employee.' },
                ].map((card) => (
                  <SummaryTile key={card.label} label={card.label} value={card.value} hint={card.hint} accent="from-sky-400/22 via-sky-300/10 to-transparent" />
                ))}
              </div>
            ) : null}
          </PanelCard>

          <PanelCard title="Utilization brief" subtitle="Keep the selected person visible when comparing labor pressure and skill fit.">
            {workflowEmployee ? (
              <div className="space-y-3">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-lg font-semibold text-slate-50">
                    {workflowEmployee.first_name} {workflowEmployee.last_name}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusPill label={workflowEmployee.department} tone="violet" />
                    <StatusPill label={workflowEmployee.role} tone="sky" />
                  </div>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-300">
                  Skills: {(workflowEmployee.skills ?? []).length > 0 ? workflowEmployee.skills.join(', ') : 'No skill tags on file yet.'}
                </div>
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                Select an employee to compare utilization against department and role context.
              </div>
            )}
          </PanelCard>
        </div>
      ) : null}

      {editingEmployee && (
        <EmployeeEditModal
          employee={editingEmployee}
          onSave={handleSaveEmployee}
          onCloseShift={handleManagerCloseShift}
          onClose={() => setEditingEmployee(null)}
          saving={editSaving}
        />
      )}

      {onboardingEmployee && (
        <OnboardingModal
          employeeName={onboardingEmployee.name}
          employeeId={onboardingEmployee.id}
          onComplete={() => { setOnboardingEmployee(null); void loadEmployees(); }}
          onClose={() => setOnboardingEmployee(null)}
        />
      )}

      {statusChangeEmployee && (
        <StatusChangeModal
          employee={statusChangeEmployee}
          onConfirm={async (newStatus, changeReason, returnDate) => {
            setEditSaving(true);
            setError(null);
            setActionNotice(null);
            try {
              await updateEmployeeStatus({
                employee_id: statusChangeEmployee.id,
                new_status: newStatus,
                change_reason: changeReason,
                ...(returnDate ? { return_date: returnDate } : {}),
              });
              setStatusChangeEmployee(null);
              await loadEmployees();
              setActionNotice(`${statusChangeEmployee.first_name} ${statusChangeEmployee.last_name} is now ${newStatus.replace('_', ' ')}.`);
            } catch (issue) {
              setError(issue instanceof ApiError ? issue.message : 'Failed to update employee status');
            } finally {
              setEditSaving(false);
            }
          }}
          onClose={() => setStatusChangeEmployee(null)}
          saving={editSaving}
        />
      )}
    </div>
  );
}
