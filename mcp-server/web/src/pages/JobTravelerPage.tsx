import { useMemo, useState } from 'react';
import {
  ApiError,
  generateTraveler,
  getTravelerChecklist,
  getTravelerMyTasks,
  checkTravelerItem,
  uncheckTravelerItem,
  quoteToShipErpAutofeed,
} from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import type {
  GeneratedTraveler,
  TravelerJobChecklist,
  TravelerStepChecklist,
  TravelerMyTasks,
  ErpAutofeedPayload,
} from '../api/types';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  Select,
  SummaryTile,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

type Tab = 'traveler' | 'mytasks' | 'erp';

const DEPARTMENT_OPTIONS = [
  { value: 'machining', label: 'Machining' },
  { value: 'programming', label: 'Programming' },
  { value: 'quality', label: 'Quality / Inspection' },
  { value: 'planning', label: 'Planning / Finishing' },
  { value: 'shipping', label: 'Shipping' },
];

const ROLE_OPTIONS = [
  { value: 'operator', label: 'Operator' },
  { value: 'setup_tech', label: 'Setup Tech' },
  { value: 'programmer', label: 'Programmer' },
  { value: 'inspector', label: 'Inspector' },
  { value: 'planner', label: 'Planner' },
  { value: 'lead', label: 'Lead / Supervisor' },
];

export function JobTravelerPage() {
  const [tab, setTab] = useState<Tab>('traveler');

  // Generation form
  const [form, setForm] = useState({
    job_id: 'JOB-1001',
    part_number: 'DEMO-PART-A',
    customer: 'ALCOA',
    material_iso_group: 'P',
    batch_size: '50',
    quoted_finish: 'black_oxide',
  });
  const [traveler, setTraveler] = useState<GeneratedTraveler | null>(null);
  const [checklist, setChecklist] = useState<TravelerJobChecklist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // My-tasks (login-to-task) form
  const [employee, setEmployee] = useState({ employee_id: 'EMP-101', department: 'machining', role: 'operator' });
  const [myTasks, setMyTasks] = useState<TravelerMyTasks | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);

  // ERP autofeed (the read-only projection of a completed quote-to-ship run)
  const [erp, setErp] = useState<ErpAutofeedPayload | null>(null);
  const [erpLoading, setErpLoading] = useState(false);
  const [erpError, setErpError] = useState<string | null>(null);

  async function handleErpAutofeed() {
    setErpLoading(true);
    setErpError(null);
    try {
      // Project the ERP field-map for this job. The backend runs the pipeline
      // (or accepts a completed result) then projects -- this surface is
      // verifyToken-gated, so it returns the full dept/mgmt field-map only to
      // an authenticated desk.
      const resp = await quoteToShipErpAutofeed({
        job_id: form.job_id,
        part_number: form.part_number,
        customer: form.customer,
        material_iso_group: form.material_iso_group,
        batch_size: parseInt(form.batch_size, 10) || 1,
        quoted_finish: form.quoted_finish || undefined,
        stock: { x_mm: 100, y_mm: 80, z_mm: 25 },
        features: [
          { id: 'p1', type: 'pocket', dimensions: { width_mm: 40, length_mm: 60, depth_mm: 12 } },
          { id: 'b1', type: 'bore', dimensions: { diameter_mm: 25, depth_mm: 30 }, tolerance_mm: 0.008 },
        ],
      });
      setErp(resp.data ?? null);
    } catch (issue) {
      setErpError(issue instanceof ApiError ? issue.message : 'Failed to project ERP autofeed (sign in required)');
    } finally {
      setErpLoading(false);
    }
  }

  function money(v: number | null): string {
    return typeof v === 'number' ? `$${v.toFixed(2)}` : '--';
  }

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((c) => ({ ...c, [key]: value }));
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      // A representative feature set: a pocket + a ground bore -> mill + grinding.
      const resp = await generateTraveler({
        job_id: form.job_id,
        part_number: form.part_number,
        customer: form.customer,
        material_iso_group: form.material_iso_group,
        batch_size: parseInt(form.batch_size, 10) || 1,
        quoted_finish: form.quoted_finish || undefined,
        stock: { x_mm: 100, y_mm: 80, z_mm: 25 },
        features: [
          { id: 'p1', type: 'pocket', dimensions: { width_mm: 40, length_mm: 60, depth_mm: 12 } },
          { id: 'h1', type: 'hole', dimensions: { diameter_mm: 8, depth_mm: 20 }, count: 4 },
          { id: 'b1', type: 'bore', dimensions: { diameter_mm: 25, depth_mm: 30 }, tolerance_mm: 0.008 },
        ],
      });
      setTraveler(resp.data ?? null);
      // pull the checklist roll-up right after generation
      const cl = await getTravelerChecklist(form.job_id);
      setChecklist(cl.data ?? null);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to generate traveler');
    } finally {
      setLoading(false);
    }
  }

  async function refreshChecklist() {
    if (!traveler) return;
    try {
      const cl = await getTravelerChecklist(traveler.job_id);
      setChecklist(cl.data ?? null);
    } catch { /* leave prior checklist on transient error */ }
  }

  async function handleLoadMyTasks() {
    if (!traveler) return;
    setTaskError(null);
    try {
      const resp = await getTravelerMyTasks(traveler.job_id, {
        employee_id: employee.employee_id,
        department: employee.department,
        role: employee.role,
      });
      setMyTasks(resp.data ?? null);
    } catch (issue) {
      setTaskError(issue instanceof ApiError ? issue.message : 'Failed to load tasks');
    }
  }

  async function toggleItem(step: TravelerStepChecklist, itemId: string, currentlyChecked: boolean) {
    if (!traveler) return;
    setTaskError(null);
    try {
      const body = {
        employee_id: employee.employee_id,
        employee_department: employee.department,
        employee_role: employee.role,
      };
      if (currentlyChecked) {
        await uncheckTravelerItem(traveler.job_id, step.step_seq, itemId, body);
      } else {
        await checkTravelerItem(traveler.job_id, step.step_seq, itemId, body);
      }
      await handleLoadMyTasks();
      await refreshChecklist();
    } catch (issue) {
      setTaskError(issue instanceof ApiError ? issue.message : 'Action failed');
    }
  }

  // Department-grouped view of the generated traveler (null-safe).
  const grouped = useMemo(() => {
    const steps = traveler?.steps ?? [];
    const order: string[] = [];
    const map = new Map<string, typeof steps>();
    for (const s of steps) {
      if (!map.has(s.department)) { map.set(s.department, []); order.push(s.department); }
      map.get(s.department)!.push(s);
    }
    return order.map((d) => ({ department: d, steps: map.get(d) ?? [] }));
  }, [traveler]);

  const pct = checklist && typeof checklist.pct_complete === 'number' ? checklist.pct_complete : 0;

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Shop floor execution"
        title="Job Traveler"
        description="Auto-generate the full print-to-shipping order of operations -- every step assigned to a department and role, with a per-department checklist each employee logs in to and works."
        metrics={
          <>
            <SummaryTile label="Steps" value={traveler ? String(traveler.total_steps) : '--'} hint={traveler ? `${traveler.departments.length} departments` : 'Generate a traveler to begin'} />
            <SummaryTile
              label="Checklist complete"
              value={traveler ? `${pct}%` : '--'}
              hint={checklist ? `${checklist.total_required_checked}/${checklist.total_required} required items` : 'Per-step sign-off progress'}
              accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
            />
            <SummaryTile
              label="Est. total time"
              value={traveler && typeof traveler.est_total_min === 'number' ? `${Math.round(traveler.est_total_min)} min` : '--'}
              hint="Setup + cycle x batch across all steps."
              accent="from-amber-300/22 via-amber-200/8 to-transparent"
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              Accepting a quote can auto-generate this traveler; here you can drive it directly for a part. Switch to "My Tasks" to work a single department's checklist as an employee.
            </div>
            <div className="grid gap-2">
              <ActionButton onClick={handleGenerate}>Generate Traveler</ActionButton>
            </div>
          </div>
        }
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('traveler')}
          className={`h-11 rounded-full border px-5 text-sm font-semibold transition ${tab === 'traveler' ? 'border-accent/40 bg-accent/10 text-accent' : 'border-white/10 text-slate-400 hover:text-slate-200'}`}
        >
          Full Traveler
        </button>
        <button
          type="button"
          onClick={() => setTab('mytasks')}
          className={`h-11 rounded-full border px-5 text-sm font-semibold transition ${tab === 'mytasks' ? 'border-accent/40 bg-accent/10 text-accent' : 'border-white/10 text-slate-400 hover:text-slate-200'}`}
        >
          My Tasks
        </button>
        <button
          type="button"
          onClick={() => setTab('erp')}
          className={`h-11 rounded-full border px-5 text-sm font-semibold transition ${tab === 'erp' ? 'border-accent/40 bg-accent/10 text-accent' : 'border-white/10 text-slate-400 hover:text-slate-200'}`}
        >
          ERP Autofeed
        </button>
      </div>

      {loading ? <LoadingState label="Generating traveler..." /> : null}
      {error ? <ErrorState message={error} onRetry={handleGenerate} /> : null}

      {tab === 'traveler' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <PanelCard title="Part / job spec" subtitle="Drive the order of operations from the part. Quoted finish + a ground bore add finishing + grinding departments only when needed.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Job ID"><Input value={form.job_id} onChange={(e) => update('job_id', e.target.value)} /></Field>
              <Field label="Part number"><Input value={form.part_number} onChange={(e) => update('part_number', e.target.value)} /></Field>
              <Field label="Customer"><Input value={form.customer} onChange={(e) => update('customer', e.target.value)} /></Field>
              <Field label="Material ISO group">
                <Select value={form.material_iso_group} onChange={(e) => update('material_iso_group', e.target.value)}>
                  <option value="P">P - Steel</option>
                  <option value="M">M - Stainless</option>
                  <option value="K">K - Cast iron</option>
                  <option value="N">N - Aluminum</option>
                  <option value="S">S - Superalloy</option>
                  <option value="H">H - Hardened</option>
                </Select>
              </Field>
              <Field label="Batch size"><Input type="number" inputMode="numeric" value={form.batch_size} onChange={(e) => update('batch_size', e.target.value)} /></Field>
              <Field label="Quoted finish">
                <Select value={form.quoted_finish} onChange={(e) => update('quoted_finish', e.target.value)}>
                  <option value="">None</option>
                  <option value="black_oxide">Black oxide</option>
                  <option value="anodize">Anodize</option>
                  <option value="zinc_plate">Zinc plate</option>
                  <option value="powder_coat">Powder coat</option>
                </Select>
              </Field>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <ActionButton onClick={handleGenerate}>Generate Traveler</ActionButton>
            </div>
            {traveler && traveler.notes.length > 0 ? (
              <div className="mt-5 rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-xs leading-5 text-slate-400">
                {traveler.notes.map((n, i) => <div key={i}>- {n}</div>)}
              </div>
            ) : null}
          </PanelCard>

          <PanelCard title="Order of operations (print -> shipping)" subtitle="Each step is owned by a department + role and carries a checklist. Grouped by department in route order.">
            {!traveler ? (
              <div className="py-10 text-center text-sm text-slate-500">Generate a traveler to see the full route.</div>
            ) : (
              <div className="space-y-4">
                {grouped.map((g) => (
                  <div key={g.department} className="rounded-[18px] border border-white/8 bg-white/[0.02] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">{g.department}</div>
                      <div className="text-xs text-slate-500">{g.steps.length} step(s)</div>
                    </div>
                    <div className="space-y-2">
                      {g.steps.map((s) => (
                        <div key={s.seq} className="rounded-[14px] border border-white/8 bg-white/[0.03] px-3 py-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm text-slate-200">
                              <span className="font-mono text-slate-500">{String(s.op_num).padStart(3, '0')}</span> {s.operation}
                            </div>
                            <div className="flex items-center gap-2">
                              {s.is_inspection_gate ? <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[10px] uppercase text-amber-200">Gate</span> : null}
                              {s.is_outside_service ? <span className="rounded-full border border-violet-300/30 bg-violet-300/10 px-2 py-0.5 text-[10px] uppercase text-violet-200">Outside</span> : null}
                              <span className="text-[10px] uppercase tracking-wide text-slate-500">{s.role}</span>
                            </div>
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">{(s.checklist?.length ?? 0)} checklist item(s) - {s.est_setup_min}m setup / {s.est_cycle_min}m cycle</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PanelCard>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <PanelCard title="Log in to your tasks" subtitle="Pick your badge, department, and role to see only the steps you own. A lead/supervisor sees every department.">
            <div className="grid gap-4">
              <Field label="Employee ID"><Input value={employee.employee_id} onChange={(e) => setEmployee((c) => ({ ...c, employee_id: e.target.value }))} /></Field>
              <Field label="Department">
                <Select value={employee.department} onChange={(e) => setEmployee((c) => ({ ...c, department: e.target.value }))}>
                  {DEPARTMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </Field>
              <Field label="Role">
                <Select value={employee.role} onChange={(e) => setEmployee((c) => ({ ...c, role: e.target.value }))}>
                  {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </Field>
            </div>
            <div className="mt-5">
              <ActionButton onClick={handleLoadMyTasks}>Load My Tasks</ActionButton>
            </div>
            {!traveler ? <div className="mt-4 text-xs text-slate-500">Generate a traveler on the Full Traveler tab first.</div> : null}
            {taskError ? <div className="mt-4 rounded-[14px] border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">{taskError}</div> : null}
          </PanelCard>

          <PanelCard title="My checklist" subtitle="Check off each item as you complete it. Required items gate the step; sign-off items are formal.">
            {!myTasks ? (
              <div className="py-10 text-center text-sm text-slate-500">Load your tasks to see your department's steps.</div>
            ) : myTasks.steps.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No steps for {myTasks.department ?? 'this department'} on this job.</div>
            ) : (
              <div className="space-y-4">
                {myTasks.steps.map((step) => (
                  <div key={step.step_seq} className="rounded-[18px] border border-white/8 bg-white/[0.02] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-200">{step.operation}</div>
                      <div className="text-xs text-slate-500">
                        {step.required_checked}/{step.required_total} required {step.complete ? '- complete' : ''}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {(step.items ?? []).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleItem(step, item.id, item.checked === true)}
                          className={`flex w-full items-start gap-3 rounded-[14px] border px-3 py-2 text-left transition min-h-11 ${item.checked ? 'border-emerald-400/30 bg-emerald-400/10' : 'border-white/8 bg-white/[0.03] hover:border-accent/30'}`}
                        >
                          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${item.checked ? 'border-emerald-300 bg-emerald-400/30 text-emerald-100' : 'border-white/20 text-transparent'}`}>
                            {item.checked ? '✓' : ''}
                          </span>
                          <span className="flex-1">
                            <span className={`text-sm ${item.checked ? 'text-emerald-100 line-through' : 'text-slate-200'}`}>{item.label}</span>
                            {item.required ? <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-300/80">required</span> : null}
                            {item.signoff ? <span className="ml-2 text-[10px] uppercase tracking-wide text-violet-300/80">sign-off</span> : null}
                            {item.acceptance_criteria ? <span className="mt-0.5 block text-[11px] text-slate-500">{item.acceptance_criteria}</span> : null}
                            {item.checked && item.checked_by_employee_id ? <span className="mt-0.5 block text-[10px] text-slate-500">by {item.checked_by_employee_id}</span> : null}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PanelCard>
        </div>
      )}

      {tab === 'erp' ? (
        <div className="grid gap-6">
          <PanelCard
            title="ERP autofeed"
            subtitle="Project a completed quote-to-ship run into the department, front-office, and management field-map the ERP consumes. Read-only; sign-in required."
          >
            <ActionButton onClick={handleErpAutofeed} disabled={erpLoading}>
              {erpLoading ? 'Projecting...' : 'Project ERP fields'}
            </ActionButton>
            {erpError ? <p className="mt-3 text-sm text-rose-400">{erpError}</p> : null}
            {!erp && !erpError ? (
              <p className="mt-4 text-sm text-slate-500">Project the ERP autofeed to see the dept / office / management fields for this job.</p>
            ) : null}
          </PanelCard>

          {erp ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <PanelCard title="Front office" subtitle="Sales-desk fields">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-slate-500">Quote</dt><dd className="font-mono text-slate-200">{erp.front_office.quote_id ?? '--'}</dd>
                  <dt className="text-slate-500">Customer</dt><dd className="text-slate-200">{erp.front_office.customer_id ?? '--'}</dd>
                  <dt className="text-slate-500">Part</dt><dd className="text-slate-200">{erp.front_office.part_number ?? '--'}</dd>
                  <dt className="text-slate-500">Qty</dt><dd className="font-mono text-slate-200">{erp.front_office.quantity ?? '--'}</dd>
                  <dt className="text-slate-500">Price</dt><dd className="font-mono text-slate-200">{money(erp.front_office.quoted_price_usd)}</dd>
                  <dt className="text-slate-500">Lead time</dt><dd className="font-mono text-slate-200">{erp.front_office.lead_time_days != null ? `${erp.front_office.lead_time_days} d` : '--'}</dd>
                </dl>
              </PanelCard>

              <PanelCard title="Cost breakdown" subtitle="Management / accounting">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-slate-500">Total</dt><dd className="font-mono text-slate-200">{money(erp.cost_breakdown.total_cost_usd)}</dd>
                  <dt className="text-slate-500">Labor</dt><dd className="font-mono text-slate-200">{money(erp.cost_breakdown.labor_usd)}</dd>
                  <dt className="text-slate-500">Material</dt><dd className="font-mono text-slate-200">{money(erp.cost_breakdown.material_usd)}</dd>
                  <dt className="text-slate-500">Tooling</dt><dd className="font-mono text-slate-200">{money(erp.cost_breakdown.tooling_usd)}</dd>
                  <dt className="text-slate-500">Machine</dt><dd className="font-mono text-slate-200">{money(erp.cost_breakdown.machine_usd)}</dd>
                  <dt className="text-slate-500">Overhead</dt><dd className="font-mono text-slate-200">{money(erp.cost_breakdown.overhead_usd)}</dd>
                </dl>
              </PanelCard>

              <PanelCard title="Material + CAD/CAM" subtitle="Procurement + entitlement">
                <p className="text-sm text-slate-300">Material: <span className="font-mono">{erp.material.material_spec ?? '--'}</span></p>
                <p className="mt-2 text-sm text-slate-300">
                  CAD/CAM: {erp.cad_cam.entitled
                    ? <span className="text-emerald-400">entitled ({erp.cad_cam.program_paths.length} program(s))</span>
                    : <span className="text-amber-400">not entitled (option not paid)</span>}
                </p>
              </PanelCard>

              <PanelCard title="Manager notes (advisory)" subtitle="Lean watch-outs">
                {erp.manager_notes.lean_watchouts.length === 0 && erp.manager_notes.manager_notes.length === 0 ? (
                  <p className="text-sm text-slate-500">No watch-outs.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm text-slate-300">
                    {erp.manager_notes.lean_watchouts.map((w, i) => <li key={`w${i}`}>- {w}</li>)}
                    {erp.manager_notes.manager_notes.map((n, i) => <li key={`n${i}`}>- {n}</li>)}
                  </ul>
                )}
              </PanelCard>

              <PanelCard title="Employee portal" subtitle="Per-department task fan-out">
                {erp.employee_portal.checklist ? (
                  <div className="flex flex-wrap gap-3">
                    <SummaryTile label="Departments" value={String(erp.employee_portal.traveler?.departments?.length ?? 0)} />
                    <SummaryTile label="Steps" value={String(erp.employee_portal.traveler?.steps?.length ?? 0)} />
                    <SummaryTile label="Required items" value={String(erp.employee_portal.checklist.total_required)} />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No routed traveler for this job.</p>
                )}
              </PanelCard>

              {erp.gaps.length > 0 ? (
                <PanelCard title="Data gaps" subtitle="Stages that produced no data">
                  <ul className="space-y-1 text-sm text-amber-300">
                    {erp.gaps.map((g, i) => <li key={`g${i}`}>- {g.stage} ({g.reason})</li>)}
                  </ul>
                </PanelCard>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default JobTravelerPage;
