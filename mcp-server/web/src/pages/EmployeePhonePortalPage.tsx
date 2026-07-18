/**
 * EmployeePhonePortalPage — phone-first shop-floor portal UI (hotel iter8, 2026-05-24)
 *
 * Live-testable React surface for U-EMPLOYEE-MOBILE-PORTAL backend (60+ emp_*
 * dispatcher actions on prism_shop). Follows Calculator-Studio dark-HUD
 * aesthetic per mcp-server/web/CLAUDE.md.
 *
 * Distinct from existing `EmployeePortalPage.tsx` (Codex's desk-shell view) —
 * THIS is the phone-first surface (QR scan, on-machine calculators, layout-3D,
 * priority bump, manager delegation, office aggregations).
 *
 * Tabs: Scan/Clock · Calculators · Messages · Priority/Delegate · Layout3D · Office
 */

import { useEffect, useState } from 'react';
import {
  EmployeePortalApiError,
  empScanIn,
  empGetActiveTask,
  empPauseTask,
  empResumeTask,
  empStopTask,
  empSendMessage,
  empListMessages,
  empMarkRead,
  empBumpPriority,
  empRankJobs,
  empCalcCostQuick,
  empDncSafetyCheck,
  empLayoutList,
  empOfficeWhoOnWhat,
  empOfficePriorityQueue,
  empOfficePendingDelegations,
  type ActiveTask,
  type EmployeeMessage,
  type DelegationEntry,
  type MachineLayoutEntry,
} from '../api/employeePortal';

const TAB_LIST = ['scan', 'calc', 'msgs', 'priority', 'layout', 'office'] as const;
type Tab = (typeof TAB_LIST)[number];

const TAB_LABEL: Record<Tab, string> = {
  scan: 'Scan / Clock',
  calc: 'Calculators',
  msgs: 'Messages',
  priority: 'Priority + Delegate',
  layout: 'Shop Layout 3D',
  office: 'Office Fleet View',
};

// ── Atoms ───────────────────────────────────────────────────────────────────
type Tone = 'cyan' | 'violet' | 'emerald' | 'amber' | 'red' | 'slate';

function GlowBox({ glow = 'cyan', children }: { glow?: Exclude<Tone, 'slate'>; children: React.ReactNode }) {
  return (
    <div
      className={`prism-glow-${glow} rounded-lg border border-white/10 bg-[rgba(2,6,23,0.78)] p-4 backdrop-blur`}
      style={{ boxShadow: 'inset 0 0 24px rgba(2,6,23,0.6)' }}
    >
      {children}
    </div>
  );
}

function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const colorByTone: Record<Tone, string> = {
    cyan: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
    violet: 'text-violet-300 border-violet-500/40 bg-violet-500/10',
    emerald: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
    amber: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
    red: 'text-red-300 border-red-500/40 bg-red-500/10',
    slate: 'text-slate-300 border-slate-500/40 bg-slate-500/10',
  };
  return (
    <span className={`prism-chip inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-mono uppercase tracking-wider ${colorByTone[tone]}`}>
      {children}
    </span>
  );
}

function StatusChipForTask({ status }: { status: ActiveTask['status'] }) {
  const tone: Tone = status === 'running' ? 'emerald' : status === 'paused' ? 'amber' : status === 'completed' ? 'cyan' : 'red';
  return <Chip tone={tone}>{status}</Chip>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-mono uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded border border-white/10 bg-[rgba(15,23,42,0.6)] px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-cyan-400/60 ${props.className ?? ''}`}
    />
  );
}

function ActionButton({ tone = 'cyan', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'cyan' | 'amber' | 'red' | 'emerald' }) {
  const colorByTone: Record<'cyan' | 'amber' | 'red' | 'emerald', string> = {
    cyan: 'border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10',
    amber: 'border-amber-500/50 text-amber-300 hover:bg-amber-500/10',
    red: 'border-red-500/50 text-red-300 hover:bg-red-500/10',
    emerald: 'border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10',
  };
  return (
    <button
      type="button"
      {...rest}
      className={`rounded border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition disabled:opacity-40 ${colorByTone[tone]} ${rest.className ?? ''}`}
    />
  );
}

function fmtError(e: unknown): string {
  if (e instanceof EmployeePortalApiError) return `[${e.status}] ${e.message}`;
  if (e instanceof Error) return e.message;
  return String(e);
}

// ── Scan/Clock tab ──────────────────────────────────────────────────────────
function ScanClockTab({ employeeId }: { employeeId: string }) {
  const [payload, setPayload] = useState('prism://job/J-1/op/OP-1/task/T-1');
  const [task, setTask] = useState<ActiveTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const refresh = async () => {
    try { const r = await empGetActiveTask({ employee_id: employeeId }); setTask(r.task); }
    catch (e) { setError(fmtError(e)); }
  };
  useEffect(() => { void refresh(); }, [employeeId]);

  const onScan = async () => {
    setError(null);
    try { const r = await empScanIn({ payload, employee_id: employeeId, source: 'manual' }); setTask(r.task); }
    catch (e) { setError(fmtError(e)); }
  };
  const onPause = async () => {
    if (!task || !reason) return;
    try { const r = await empPauseTask({ task_id: task.task_id, employee_id: employeeId, reason }); setTask(r.task); }
    catch (e) { setError(fmtError(e)); }
  };
  const onResume = async () => {
    if (!task) return;
    try { const r = await empResumeTask({ task_id: task.task_id, employee_id: employeeId }); setTask(r.task); }
    catch (e) { setError(fmtError(e)); }
  };
  const onStop = async (completed: boolean) => {
    if (!task) return;
    try { const r = await empStopTask({ task_id: task.task_id, employee_id: employeeId, completed, reason: reason || undefined }); setTask(r.task); }
    catch (e) { setError(fmtError(e)); }
  };

  return (
    <GlowBox glow="cyan">
      <div className="flex flex-col gap-3">
        <Field label="QR / Barcode payload (or bare JOB-ID)">
          <Input value={payload} onChange={(e) => setPayload(e.target.value)} placeholder="prism://job/JOB/op/OP/task/TASK" />
        </Field>
        <div className="flex gap-2 flex-wrap">
          <ActionButton tone="cyan" onClick={() => void onScan()}>Scan In</ActionButton>
          <ActionButton tone="emerald" onClick={() => void onResume()} disabled={!task || task.status !== 'paused'}>Resume</ActionButton>
          <ActionButton tone="amber" onClick={() => void onPause()} disabled={!task || task.status !== 'running'}>Pause</ActionButton>
          <ActionButton tone="red" onClick={() => void onStop(false)} disabled={!task || (task.status !== 'running' && task.status !== 'paused')}>Stop</ActionButton>
          <ActionButton tone="emerald" onClick={() => void onStop(true)} disabled={!task || (task.status !== 'running' && task.status !== 'paused')}>Complete</ActionButton>
        </div>
        <Field label="Pause / Stop reason (≥2 chars for pause)">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. tool change" />
        </Field>
        {task && (
          <div className="rounded border border-white/5 p-3 font-mono text-sm">
            <div className="mb-2 flex items-center gap-2"><span className="text-slate-400">Active task</span><StatusChipForTask status={task.status} /></div>
            <div className="grid grid-cols-2 gap-2 text-slate-300">
              <span>job: <span className="text-cyan-300">{task.job_id}</span></span>
              <span>op: <span className="text-violet-300">{task.operation_id}</span></span>
              <span>started: {task.started_at.slice(11, 19)}</span>
              <span>runtime: {(task.total_runtime_ms / 1000).toFixed(0)}s</span>
            </div>
            {task.pause_reason && <div className="mt-2 text-amber-300">reason: {task.pause_reason}</div>}
          </div>
        )}
        {error && <div className="rounded border border-red-500/40 bg-red-500/10 p-2 font-mono text-xs text-red-300">{error}</div>}
      </div>
    </GlowBox>
  );
}

// ── Calc tab ────────────────────────────────────────────────────────────────
function CalcTab() {
  const [material, setMaterial] = useState('aluminum_6061');
  const [cycle, setCycle] = useState('12');
  const [qty, setQty] = useState('50');
  const [cost, setCost] = useState<{ perPart: number; total: number; breakdown: string } | null>(null);
  const [gcode, setGcode] = useState('O1234\nG21 G90 G54\nG0 X0 Y0 Z25\nM30\n');
  const [safety, setSafety] = useState<{ safe: boolean; score: number; criticalIssues: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onCost = async () => {
    setError(null);
    try { const r = await empCalcCostQuick({ material, cycle_time_min: Number(cycle), quantity: Number(qty) }); setCost(r.estimate); }
    catch (e) { setError(fmtError(e)); }
  };
  const onSafety = async () => {
    setError(null);
    try { const r = await empDncSafetyCheck({ content: gcode }); setSafety(r.check); }
    catch (e) { setError(fmtError(e)); }
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <GlowBox glow="emerald">
        <div className="mb-3 font-mono text-xs uppercase tracking-wider text-emerald-300">Quick cost estimate</div>
        <div className="flex flex-col gap-3">
          <Field label="Material"><Input value={material} onChange={(e) => setMaterial(e.target.value)} /></Field>
          <Field label="Cycle time (min)"><Input value={cycle} onChange={(e) => setCycle(e.target.value)} type="number" /></Field>
          <Field label="Quantity"><Input value={qty} onChange={(e) => setQty(e.target.value)} type="number" /></Field>
          <ActionButton tone="emerald" onClick={() => void onCost()}>Calculate</ActionButton>
          {cost && (
            <div className="rounded border border-emerald-500/30 p-3 font-mono text-sm">
              <div className="text-2xl text-emerald-300">${cost.perPart}/part</div>
              <div className="text-slate-400">total ${cost.total}</div>
              <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-500">{cost.breakdown}</pre>
            </div>
          )}
        </div>
      </GlowBox>
      <GlowBox glow="amber">
        <div className="mb-3 font-mono text-xs uppercase tracking-wider text-amber-300">DNC safety check (G-code)</div>
        <div className="flex flex-col gap-3">
          <Field label="Program content (paste G-code)">
            <textarea value={gcode} onChange={(e) => setGcode(e.target.value)} rows={6} className="w-full rounded border border-white/10 bg-[rgba(15,23,42,0.6)] px-3 py-2 font-mono text-xs text-slate-100 outline-none focus:border-amber-400/60" />
          </Field>
          <ActionButton tone="amber" onClick={() => void onSafety()}>Pre-flight check</ActionButton>
          {safety && (
            <div className="rounded border border-amber-500/30 p-3 font-mono text-sm">
              <div className="flex items-center gap-2">
                <Chip tone={safety.safe ? 'emerald' : 'red'}>{safety.safe ? 'SAFE' : 'BLOCKED'}</Chip>
                <span>S(x) = {safety.score.toFixed(3)}</span>
              </div>
              {safety.criticalIssues.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-xs text-red-300">
                  {safety.criticalIssues.map((iss, i) => <li key={i}>{iss}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      </GlowBox>
      {error && <div className="md:col-span-2 rounded border border-red-500/40 bg-red-500/10 p-2 font-mono text-xs text-red-300">{error}</div>}
    </div>
  );
}

// ── Messages tab ────────────────────────────────────────────────────────────
function MessagesTab({ employeeId }: { employeeId: string }) {
  const [messages, setMessages] = useState<EmployeeMessage[]>([]);
  const [to, setTo] = useState('EMP-2');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try { const r = await empListMessages({ employee_id: employeeId }); setMessages(r.messages); }
    catch (e) { setError(fmtError(e)); }
  };
  useEffect(() => { void refresh(); }, [employeeId]);

  const onSend = async () => {
    setError(null);
    if (!body) return;
    try { await empSendMessage({ from_employee_id: employeeId, to_employee_id: to, body }); setBody(''); await refresh(); }
    catch (e) { setError(fmtError(e)); }
  };
  const onRead = async (id: string) => {
    try { await empMarkRead({ message_id: id }); await refresh(); }
    catch (e) { setError(fmtError(e)); }
  };

  return (
    <GlowBox glow="violet">
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="flex-1"><Field label="To"><Input value={to} onChange={(e) => setTo(e.target.value)} /></Field></div>
          <div className="flex-[2]"><Field label="Body"><Input value={body} onChange={(e) => setBody(e.target.value)} /></Field></div>
          <div className="flex items-end"><ActionButton tone="cyan" onClick={() => void onSend()}>Send</ActionButton></div>
        </div>
        <div className="max-h-96 overflow-y-auto rounded border border-white/5">
          {messages.length === 0 && <div className="p-4 text-center text-xs text-slate-500">No messages.</div>}
          {messages.map((m) => (
            <div key={m.id} className="border-b border-white/5 p-3 font-mono text-sm last:border-b-0">
              <div className="flex items-center justify-between">
                <span className="text-violet-300">{m.from_employee_id} → {m.to_employee_id}</span>
                <span className="text-xs text-slate-500">{m.sent_at.slice(11, 16)}</span>
              </div>
              <div className="mt-1 text-slate-200">{m.body}</div>
              <div className="mt-1 flex items-center gap-2">
                {m.read_at ? <Chip tone="slate">read</Chip> : <ActionButton tone="cyan" onClick={() => void onRead(m.id)}>Mark read</ActionButton>}
              </div>
            </div>
          ))}
        </div>
        {error && <div className="rounded border border-red-500/40 bg-red-500/10 p-2 font-mono text-xs text-red-300">{error}</div>}
      </div>
    </GlowBox>
  );
}

// ── Priority tab ────────────────────────────────────────────────────────────
function PriorityTab() {
  const [ranked, setRanked] = useState<Array<{ job_id: string; priority: number; last_bumped_at: string }>>([]);
  const [jobId, setJobId] = useState('J-1');
  const [priority, setPriority] = useState('10');
  const [adminId, setAdminId] = useState('ADMIN-1');
  const [reason, setReason] = useState('customer escalation');
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try { const r = await empRankJobs(); setRanked(r.ranked); }
    catch (e) { setError(fmtError(e)); }
  };
  useEffect(() => { void refresh(); }, []);

  const onBump = async () => {
    setError(null);
    try { await empBumpPriority({ job_id: jobId, new_priority: Number(priority), admin_id: adminId, reason }); await refresh(); }
    catch (e) { setError(fmtError(e)); }
  };

  return (
    <GlowBox glow="red">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Field label="Job ID"><Input value={jobId} onChange={(e) => setJobId(e.target.value)} /></Field>
          <Field label="Priority"><Input value={priority} onChange={(e) => setPriority(e.target.value)} type="number" /></Field>
          <Field label="Admin ID"><Input value={adminId} onChange={(e) => setAdminId(e.target.value)} /></Field>
          <Field label="Reason (≥3 chars)"><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        </div>
        <ActionButton tone="red" onClick={() => void onBump()}>Bump priority</ActionButton>
        <div className="rounded border border-white/5 p-3">
          <div className="mb-2 font-mono text-xs uppercase tracking-wider text-red-300">Hottest first</div>
          {ranked.length === 0 && <div className="text-center text-xs text-slate-500">No priorities set yet.</div>}
          {ranked.map((r, i) => (
            <div key={r.job_id} className="flex items-center justify-between border-b border-white/5 py-1 font-mono text-sm last:border-b-0">
              <span className="text-slate-300">#{i + 1} {r.job_id}</span>
              <Chip tone={r.priority >= 8 ? 'red' : r.priority >= 4 ? 'amber' : 'cyan'}>{r.priority}</Chip>
            </div>
          ))}
        </div>
        {error && <div className="rounded border border-red-500/40 bg-red-500/10 p-2 font-mono text-xs text-red-300">{error}</div>}
      </div>
    </GlowBox>
  );
}

// ── Layout tab ──────────────────────────────────────────────────────────────
function LayoutTab() {
  const [entries, setEntries] = useState<MachineLayoutEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const refresh = async () => {
    try { const r = await empLayoutList(); setEntries(r.entries); }
    catch (e) { setError(fmtError(e)); }
  };
  useEffect(() => { void refresh(); }, []);

  return (
    <GlowBox glow="violet">
      <div className="mb-3 font-mono text-xs uppercase tracking-wider text-violet-300">Tagged machines ({entries.length}) — phone-side AR walkthrough produces this layout</div>
      {entries.length === 0 && <div className="text-center text-xs text-slate-500">No walkthrough captured yet. Use the mobile app to start a capture.</div>}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {entries.map((e) => (
          <div key={e.machine_id} className="rounded border border-violet-500/30 p-3 font-mono text-sm">
            <div className="mb-1 font-bold text-violet-200">{e.machine_id}</div>
            <div className="text-xs text-slate-400">tagged by {e.tagged_by} · {e.tagged_at.slice(0, 16)}</div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-500">
              <span>min ({e.bbox.min.x.toFixed(1)}, {e.bbox.min.y.toFixed(1)}, {e.bbox.min.z.toFixed(1)})</span>
              <span>max ({e.bbox.max.x.toFixed(1)}, {e.bbox.max.y.toFixed(1)}, {e.bbox.max.z.toFixed(1)})</span>
            </div>
            {e.notes && <div className="mt-1 text-xs italic text-slate-400">{e.notes}</div>}
          </div>
        ))}
      </div>
      {error && <div className="mt-3 rounded border border-red-500/40 bg-red-500/10 p-2 font-mono text-xs text-red-300">{error}</div>}
    </GlowBox>
  );
}

// ── Office tab ──────────────────────────────────────────────────────────────
function OfficeTab() {
  const [who, setWho] = useState<Array<{ employee_id: string; active_task: ActiveTask }>>([]);
  const [hot, setHot] = useState<Array<{ job_id: string; priority: number; last_bumped_at: string }>>([]);
  const [pendingDel, setPendingDel] = useState<DelegationEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const [w, h, d] = await Promise.all([
        empOfficeWhoOnWhat(),
        empOfficePriorityQueue({ limit: 10 }),
        empOfficePendingDelegations(),
      ]);
      setWho(w.assignments);
      setHot(h.ranked);
      setPendingDel(d.delegations);
    } catch (e) { setError(fmtError(e)); }
  };
  useEffect(() => { void refresh(); }, []);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <GlowBox glow="cyan">
        <div className="mb-2 font-mono text-xs uppercase tracking-wider text-cyan-300">Who&apos;s on what ({who.length})</div>
        {who.length === 0 ? <div className="text-xs text-slate-500">No active assignments.</div> : who.map((a) => (
          <div key={a.employee_id} className="border-b border-white/5 py-1 font-mono text-sm last:border-b-0">
            <div className="text-cyan-200">{a.employee_id}</div>
            <div className="text-xs text-slate-500">{a.active_task.job_id} · {a.active_task.operation_id}</div>
          </div>
        ))}
      </GlowBox>
      <GlowBox glow="red">
        <div className="mb-2 font-mono text-xs uppercase tracking-wider text-red-300">Hottest jobs (top 10)</div>
        {hot.length === 0 ? <div className="text-xs text-slate-500">No priorities set.</div> : hot.map((r, i) => (
          <div key={r.job_id} className="flex items-center justify-between border-b border-white/5 py-1 font-mono text-sm last:border-b-0">
            <span>#{i + 1} {r.job_id}</span>
            <Chip tone={r.priority >= 8 ? 'red' : r.priority >= 4 ? 'amber' : 'cyan'}>{r.priority}</Chip>
          </div>
        ))}
      </GlowBox>
      <GlowBox glow="amber">
        <div className="mb-2 font-mono text-xs uppercase tracking-wider text-amber-300">Pending delegations ({pendingDel.length})</div>
        {pendingDel.length === 0 ? <div className="text-xs text-slate-500">All clear.</div> : pendingDel.map((d) => (
          <div key={d.id} className="border-b border-white/5 py-1 font-mono text-sm last:border-b-0">
            <div className="text-amber-200">{d.task_id}</div>
            <div className="text-xs text-slate-500">{d.from_manager_id} → {d.to_employee_id}</div>
            <div className="text-xs text-slate-600 italic">{d.reason}</div>
          </div>
        ))}
      </GlowBox>
      {error && <div className="md:col-span-3 rounded border border-red-500/40 bg-red-500/10 p-2 font-mono text-xs text-red-300">{error}</div>}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function EmployeePhonePortalPage() {
  const [tab, setTab] = useState<Tab>('scan');
  const [employeeId, setEmployeeId] = useState('EMP-1');

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-200">
      <div className="mx-auto max-w-6xl">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="font-mono text-2xl uppercase tracking-widest text-cyan-300">
              <span className="prism-led-sweep">Phone</span> Portal
            </h1>
            <div className="font-mono text-xs uppercase tracking-wider text-slate-500">shop-floor employee surface · hotel slot · iter8</div>
          </div>
          <div className="w-48">
            <Field label="Employee ID"><Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} /></Field>
          </div>
        </header>

        <nav className="mb-4 flex flex-wrap gap-2">
          {TAB_LIST.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition ${tab === t ? 'border-cyan-400 bg-cyan-400/10 text-cyan-200' : 'border-white/10 text-slate-400 hover:border-white/30'}`}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </nav>

        <main>
          {tab === 'scan' && <ScanClockTab employeeId={employeeId} />}
          {tab === 'calc' && <CalcTab />}
          {tab === 'msgs' && <MessagesTab employeeId={employeeId} />}
          {tab === 'priority' && <PriorityTab />}
          {tab === 'layout' && <LayoutTab />}
          {tab === 'office' && <OfficeTab />}
        </main>

        <footer className="mt-6 font-mono text-xs uppercase tracking-wider text-slate-600">
          Backend: prism_shop · 60+ emp_* actions · CLAUDE.md §EMPLOYEE-MOBILE-PORTAL
        </footer>
      </div>
    </div>
  );
}
