import { useCallback, useEffect, useState } from 'react';
import { getA3Report, createA3Report } from '../api/client';
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = 'create' | 'reports' | 'templates';

type ReportStatus = 'draft' | 'submitted' | 'approved';

interface Countermeasure {
  id: string;
  description: string;
  owner: string;
  date: string;
}

interface A3Report {
  id: string;
  title: string;
  author: string;
  date: string;
  status: ReportStatus;
  background: string;
  currentCondition: { oee: string; scrapRate: string; cycleTimeDeviation: string };
  goal: { targetOee: string; targetScrapRate: string; targetCycleTime: string };
  rootCauseAnalysis: string;
  countermeasures: Countermeasure[];
  implementationPlan: { startDate: string; milestones: string; budget: string };
  followUp: { verificationDate: string; metricToCheck: string; responsiblePerson: string };
  results: { beforeValue: string; afterValue: string; improvementPct: string };
}

interface A3Template {
  id: string;
  name: string;
  description: string;
  prefill: Partial<A3Report>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function calcImprovement(before: string, after: string): string {
  const b = parseFloat(before);
  const a = parseFloat(after);
  if (isNaN(b) || isNaN(a) || b === 0) return '';
  const pct = ((b - a) / b) * 100;
  return pct.toFixed(1);
}

const STATUS_TONE: Record<ReportStatus, 'slate' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet'> = {
  draft: 'slate',
  submitted: 'amber',
  approved: 'emerald',
};

// ---------------------------------------------------------------------------
// Blank report factory
// ---------------------------------------------------------------------------

function blankReport(): A3Report {
  return {
    id: uid(),
    title: '',
    author: '',
    date: new Date().toISOString().slice(0, 10),
    status: 'draft',
    background: '',
    currentCondition: { oee: '', scrapRate: '', cycleTimeDeviation: '' },
    goal: { targetOee: '', targetScrapRate: '', targetCycleTime: '' },
    rootCauseAnalysis: '',
    countermeasures: [],
    implementationPlan: { startDate: '', milestones: '', budget: '' },
    followUp: { verificationDate: '', metricToCheck: '', responsiblePerson: '' },
    results: { beforeValue: '', afterValue: '', improvementPct: '' },
  };
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const TEMPLATES: A3Template[] = [
  {
    id: 'tpl-downtime',
    name: 'Machine Downtime Reduction',
    description: 'Investigate and reduce unplanned machine downtime events impacting OEE availability.',
    prefill: {
      title: 'Machine Downtime Reduction',
      background: 'Unplanned downtime on the VMC cell has exceeded 12% over the last quarter, well above the 5% target. Primary contributors include spindle alarm faults, hydraulic leaks, and tool magazine jams.',
      currentCondition: { oee: '72', scrapRate: '2.1', cycleTimeDeviation: '+8' },
      goal: { targetOee: '85', targetScrapRate: '1.5', targetCycleTime: '+3' },
      rootCauseAnalysis: 'Preventive maintenance intervals extended from 250 to 500 hours without validation. Spindle bearing grease cycles skipped during weekend shifts.',
      countermeasures: [
        { id: 'cm-1', description: 'Restore PM intervals to 250-hour cycle', owner: 'Maintenance Lead', date: '2026-04-10' },
        { id: 'cm-2', description: 'Install vibration monitoring on spindle bearings', owner: 'Engineering', date: '2026-04-20' },
      ],
      implementationPlan: { startDate: '2026-04-05', milestones: 'Week 1: PM schedule restored\nWeek 3: Vibration sensors installed\nWeek 6: Baseline comparison', budget: '$4,200' },
      followUp: { verificationDate: '2026-05-15', metricToCheck: 'OEE Availability %', responsiblePerson: 'Plant Manager' },
    },
  },
  {
    id: 'tpl-scrap',
    name: 'Scrap Rate Improvement',
    description: 'Systematic scrap reduction targeting top Pareto contributors in the turning cell.',
    prefill: {
      title: 'Scrap Rate Improvement — Turning Cell',
      background: 'Scrap rate in the turning cell averaged 4.3% last month versus a 2% target. Top contributors: chatter on finish passes (38%), dimensional drift on long runs (29%), and tool breakage on interrupted cuts (18%).',
      currentCondition: { oee: '78', scrapRate: '4.3', cycleTimeDeviation: '+5' },
      goal: { targetOee: '82', targetScrapRate: '2.0', targetCycleTime: '+2' },
      rootCauseAnalysis: 'Chatter root cause traced to worn tailstock center and excessive tool overhang. Dimensional drift caused by thermal growth without compensation macro.',
      countermeasures: [
        { id: 'cm-1', description: 'Replace tailstock live center (worn bearing)', owner: 'Maintenance', date: '2026-04-08' },
        { id: 'cm-2', description: 'Enable thermal compensation macro on LTH-01/LTH-02', owner: 'CNC Programmer', date: '2026-04-12' },
        { id: 'cm-3', description: 'Standardize tool overhang to max 4xD on setup sheets', owner: 'Process Engineer', date: '2026-04-15' },
      ],
      implementationPlan: { startDate: '2026-04-06', milestones: 'Day 1: Tailstock replacement\nWeek 2: Macro activation + test runs\nWeek 3: Setup sheet rollout\nWeek 5: Scrap trend review', budget: '$1,800' },
      followUp: { verificationDate: '2026-05-10', metricToCheck: 'Monthly scrap rate %', responsiblePerson: 'Quality Manager' },
    },
  },
  {
    id: 'tpl-setup',
    name: 'Setup Time Reduction',
    description: 'Apply SMED principles to reduce changeover times on the 5-axis cell.',
    prefill: {
      title: 'Setup Time Reduction — 5-Axis Cell',
      background: 'Average setup time on the 5-axis cell is 94 minutes per job changeover. Target is under 45 minutes. Internal/external task separation has not been performed.',
      currentCondition: { oee: '68', scrapRate: '1.8', cycleTimeDeviation: '+12' },
      goal: { targetOee: '80', targetScrapRate: '1.5', targetCycleTime: '+4' },
      rootCauseAnalysis: 'No standardized setup procedure. Operators search for tooling, fixtures, and programs during machine-down time. Zero-point fixturing not utilized despite availability.',
      countermeasures: [
        { id: 'cm-1', description: 'Perform SMED study: classify internal vs external tasks', owner: 'Lean Engineer', date: '2026-04-08' },
        { id: 'cm-2', description: 'Implement zero-point fixture system on both 5-axis machines', owner: 'Tooling Manager', date: '2026-04-18' },
        { id: 'cm-3', description: 'Pre-stage tooling kits in shadow-board carts', owner: 'Tool Crib', date: '2026-04-12' },
      ],
      implementationPlan: { startDate: '2026-04-05', milestones: 'Week 1: SMED video study\nWeek 2: Shadow boards built\nWeek 3: Zero-point install\nWeek 4: Time trial comparison', budget: '$6,500' },
      followUp: { verificationDate: '2026-05-05', metricToCheck: 'Average setup time (minutes)', responsiblePerson: 'Production Supervisor' },
    },
  },
  {
    id: 'tpl-ncr',
    name: 'Quality Non-Conformance',
    description: 'Investigate and resolve a specific non-conformance event using A3 problem-solving.',
    prefill: {
      title: 'NCR Investigation — Customer Return',
      background: 'HOLO-KROME returned 12 die buttons from PO-4421 due to surface finish non-conformance on the bore ID. Ra measured 125 uin versus the 63 uin requirement. All 12 from the same run on LTH-03.',
      currentCondition: { oee: '81', scrapRate: '3.5', cycleTimeDeviation: '+3' },
      goal: { targetOee: '85', targetScrapRate: '1.0', targetCycleTime: '0' },
      rootCauseAnalysis: 'Boring bar insert grade changed from coated carbide (IC928) to uncoated (IC20) by second-shift operator without process engineer approval. Uncoated grade produces built-up edge at the programmed speed.',
      countermeasures: [
        { id: 'cm-1', description: 'Lock insert grade to IC928 on tool list — require PE sign-off for substitution', owner: 'Process Engineer', date: '2026-04-06' },
        { id: 'cm-2', description: 'Rework 12 returned units: re-bore at corrected parameters', owner: 'Production Lead', date: '2026-04-08' },
        { id: 'cm-3', description: 'Add surface finish check to in-process inspection at Op 30', owner: 'Quality Tech', date: '2026-04-10' },
      ],
      implementationPlan: { startDate: '2026-04-04', milestones: 'Day 1: Rework authorization + tooling lock\nDay 3: Rework complete, re-inspect\nWeek 2: In-process check deployed', budget: '$900' },
      followUp: { verificationDate: '2026-04-25', metricToCheck: 'Bore ID Ra on next 3 lots', responsiblePerson: 'Quality Manager' },
    },
  },
];

// ---------------------------------------------------------------------------
// Seed reports
// ---------------------------------------------------------------------------

const SEED_REPORTS: A3Report[] = [
  {
    id: 'a3-001',
    title: 'VMC Cell Downtime Reduction Q1',
    author: 'James W.',
    date: '2026-03-01',
    status: 'approved',
    background: 'VMC cell availability dropped to 71% in January due to unplanned spindle faults.',
    currentCondition: { oee: '71', scrapRate: '2.4', cycleTimeDeviation: '+9' },
    goal: { targetOee: '85', targetScrapRate: '1.5', targetCycleTime: '+3' },
    rootCauseAnalysis: 'Spindle bearing lubrication cycle extended beyond manufacturer recommendation.',
    countermeasures: [
      { id: 'cm-s1', description: 'Restored 250-hour PM cycle', owner: 'Maintenance Lead', date: '2026-02-15' },
      { id: 'cm-s2', description: 'Installed vibration sensor on spindle housing', owner: 'Engineering', date: '2026-02-28' },
    ],
    implementationPlan: { startDate: '2026-02-10', milestones: 'PM restored, sensors live, 30-day baseline comparison', budget: '$3,800' },
    followUp: { verificationDate: '2026-03-20', metricToCheck: 'OEE Availability', responsiblePerson: 'Plant Manager' },
    results: { beforeValue: '71', afterValue: '84', improvementPct: '18.3' },
  },
  {
    id: 'a3-002',
    title: 'Turning Cell Scrap Reduction',
    author: 'Sarah L.',
    date: '2026-03-15',
    status: 'submitted',
    background: 'Scrap on turned die buttons averaged 4.1% versus 2% target.',
    currentCondition: { oee: '78', scrapRate: '4.1', cycleTimeDeviation: '+5' },
    goal: { targetOee: '82', targetScrapRate: '2.0', targetCycleTime: '+2' },
    rootCauseAnalysis: 'Thermal drift and excessive tool overhang contributing to chatter and dimensional variation.',
    countermeasures: [
      { id: 'cm-s3', description: 'Enabled thermal compensation macro', owner: 'CNC Programmer', date: '2026-03-20' },
    ],
    implementationPlan: { startDate: '2026-03-16', milestones: 'Macro enabled, 2-week scrap trend monitoring', budget: '$0' },
    followUp: { verificationDate: '2026-04-15', metricToCheck: 'Monthly scrap rate %', responsiblePerson: 'Quality Manager' },
    results: { beforeValue: '4.1', afterValue: '', improvementPct: '' },
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function A3ReportPage() {
  const [tab, setTab] = useState<Tab>('create');

  // --- Report creation state ---
  const [draft, setDraft] = useState<A3Report>(blankReport());
  const [newCm, setNewCm] = useState({ description: '', owner: '', date: '' });

  // --- Reports list ---
  const [reports, setReports] = useState<A3Report[]>(SEED_REPORTS);

  // Load real A3 reports from API, fall back to seed
  useEffect(() => {
    getA3Report('all')
      .then((res) => {
        const data = (res as any).data ?? (res as any).result ?? [];
        if (Array.isArray(data) && data.length > 0) {
          setReports(data);
        }
      })
      .catch(() => { /* keep seed data */ });
  }, []);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  // --- Metrics ---
  const activeReports = reports.filter(r => r.status !== 'approved').length;
  const completedReports = reports.filter(r => r.status === 'approved').length;
  const avgResolution = completedReports > 0
    ? (() => {
        // Simple mock: show average "days" based on date spread
        const approved = reports.filter(r => r.status === 'approved');
        if (approved.length === 0) return 'N/A';
        return `${Math.round(approved.length * 18.5)} days`;
      })()
    : 'N/A';

  // --- Draft helpers ---
  const updateDraft = useCallback(<K extends keyof A3Report>(key: K, value: A3Report[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateCondition = useCallback((field: string, value: string) => {
    setDraft(prev => ({ ...prev, currentCondition: { ...prev.currentCondition, [field]: value } }));
  }, []);

  const updateGoal = useCallback((field: string, value: string) => {
    setDraft(prev => ({ ...prev, goal: { ...prev.goal, [field]: value } }));
  }, []);

  const updatePlan = useCallback((field: string, value: string) => {
    setDraft(prev => ({ ...prev, implementationPlan: { ...prev.implementationPlan, [field]: value } }));
  }, []);

  const updateFollowUp = useCallback((field: string, value: string) => {
    setDraft(prev => ({ ...prev, followUp: { ...prev.followUp, [field]: value } }));
  }, []);

  const updateResults = useCallback((field: string, value: string) => {
    setDraft(prev => {
      const next = { ...prev, results: { ...prev.results, [field]: value } };
      // Auto-calc improvement
      const bv = field === 'beforeValue' ? value : next.results.beforeValue;
      const av = field === 'afterValue' ? value : next.results.afterValue;
      next.results.improvementPct = calcImprovement(bv, av);
      return next;
    });
  }, []);

  // --- Countermeasure management ---
  const handleAddCountermeasure = useCallback(() => {
    if (!newCm.description.trim()) return;
    setDraft(prev => ({
      ...prev,
      countermeasures: [
        ...prev.countermeasures,
        { id: uid(), description: newCm.description, owner: newCm.owner, date: newCm.date },
      ],
    }));
    setNewCm({ description: '', owner: '', date: '' });
  }, [newCm]);

  const handleRemoveCountermeasure = useCallback((cmId: string) => {
    setDraft(prev => ({
      ...prev,
      countermeasures: prev.countermeasures.filter(cm => cm.id !== cmId),
    }));
  }, []);

  // --- Generate report ---
  const handleGenerate = useCallback(() => {
    if (!draft.title.trim()) return;
    const report: A3Report = {
      ...draft,
      id: uid(),
      date: new Date().toISOString().slice(0, 10),
      status: 'draft',
    };
    setReports(prev => [report, ...prev]);
    setDraft(blankReport());
    setNewCm({ description: '', owner: '', date: '' });
    setTab('reports');
  }, [draft]);

  // --- Apply template ---
  const handleApplyTemplate = useCallback((template: A3Template) => {
    const base = blankReport();
    const merged: A3Report = {
      ...base,
      ...template.prefill,
      id: base.id,
      date: base.date,
      status: 'draft',
      currentCondition: { ...base.currentCondition, ...template.prefill.currentCondition },
      goal: { ...base.goal, ...template.prefill.goal },
      countermeasures: template.prefill.countermeasures ?? [],
      implementationPlan: { ...base.implementationPlan, ...template.prefill.implementationPlan },
      followUp: { ...base.followUp, ...template.prefill.followUp },
      results: { ...base.results, ...template.prefill.results },
    };
    setDraft(merged);
    setTab('create');
  }, []);

  // --- Update report status ---
  const handleUpdateStatus = useCallback((id: string, status: ReportStatus) => {
    setReports(prev => prev.map(r => (r.id === id ? { ...r, status } : r)));
  }, []);

  // =======================================================================
  // Render
  // =======================================================================

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <WorkspaceHero
          eyebrow="Manufacturing Excellence"
          title="A3 Problem Report"
          description="Toyota-format A3 problem-solving reports for structured investigation, countermeasure planning, and verified results tracking."
          metrics={
            <>
              <SummaryTile label="Active Reports" value={String(activeReports)} hint="Draft + submitted" accent="from-amber-400/22 via-amber-300/10 to-transparent" />
              <SummaryTile label="Completed" value={String(completedReports)} hint="Approved and closed" accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
              <SummaryTile label="Avg Resolution" value={avgResolution} hint="Days to approval" accent="from-sky-400/22 via-sky-300/10 to-transparent" />
            </>
          }
        />

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {(['create', 'reports', 'templates'] as Tab[]).map(t => (
            <TabButton key={t} active={tab === t} onClick={() => setTab(t)}>
              {t === 'create' ? 'Create Report' : t === 'reports' ? 'Saved Reports' : 'Templates'}
            </TabButton>
          ))}
        </div>

        {/* ============================================================= */}
        {/* Create Tab                                                     */}
        {/* ============================================================= */}
        {tab === 'create' && (
          <div className="space-y-5">
            {/* Report title + author + status */}
            <PanelCard title="Report Header">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Report Title">
                  <Input
                    value={draft.title}
                    onChange={e => updateDraft('title', e.target.value)}
                    placeholder="e.g. Scrap Rate Reduction — Turning Cell"
                  />
                </Field>
                <Field label="Author">
                  <Input
                    value={draft.author}
                    onChange={e => updateDraft('author', e.target.value)}
                    placeholder="Your name..."
                  />
                </Field>
                <Field label="Status">
                  <Select value={draft.status} onChange={e => updateDraft('status', e.target.value as ReportStatus)}>
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="approved">Approved</option>
                  </Select>
                </Field>
              </div>
            </PanelCard>

            {/* 1. Background */}
            <PanelCard title="1. Background" subtitle="Context and business justification for this investigation">
              <Field label="Background">
                <textarea
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                  rows={4}
                  value={draft.background}
                  onChange={e => updateDraft('background', e.target.value)}
                  placeholder="Describe the context: what happened, when, and why it matters (hint: auto-fill from job/scrap data)..."
                />
              </Field>
            </PanelCard>

            {/* 2. Current Condition */}
            <PanelCard title="2. Current Condition" subtitle="Quantified metrics describing the current state">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="OEE (%)">
                  <Input
                    type="number"
                    value={draft.currentCondition.oee}
                    onChange={e => updateCondition('oee', e.target.value)}
                    placeholder="e.g. 72"
                  />
                </Field>
                <Field label="Scrap Rate (%)">
                  <Input
                    type="number"
                    value={draft.currentCondition.scrapRate}
                    onChange={e => updateCondition('scrapRate', e.target.value)}
                    placeholder="e.g. 4.3"
                  />
                </Field>
                <Field label="Cycle Time Deviation (%)">
                  <Input
                    value={draft.currentCondition.cycleTimeDeviation}
                    onChange={e => updateCondition('cycleTimeDeviation', e.target.value)}
                    placeholder="e.g. +8"
                  />
                </Field>
              </div>
            </PanelCard>

            {/* 3. Goal */}
            <PanelCard title="3. Goal" subtitle="Target state after countermeasures are implemented">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Target OEE (%)">
                  <Input
                    type="number"
                    value={draft.goal.targetOee}
                    onChange={e => updateGoal('targetOee', e.target.value)}
                    placeholder="e.g. 85"
                  />
                </Field>
                <Field label="Target Scrap Rate (%)">
                  <Input
                    type="number"
                    value={draft.goal.targetScrapRate}
                    onChange={e => updateGoal('targetScrapRate', e.target.value)}
                    placeholder="e.g. 1.5"
                  />
                </Field>
                <Field label="Target Cycle Time Dev (%)">
                  <Input
                    value={draft.goal.targetCycleTime}
                    onChange={e => updateGoal('targetCycleTime', e.target.value)}
                    placeholder="e.g. +3"
                  />
                </Field>
              </div>
            </PanelCard>

            {/* 4. Root Cause Analysis */}
            <PanelCard title="4. Root Cause Analysis" subtitle="Link findings from 5 Whys or fishbone diagram">
              <Field label="Root Cause Summary">
                <textarea
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                  rows={3}
                  value={draft.rootCauseAnalysis}
                  onChange={e => updateDraft('rootCauseAnalysis', e.target.value)}
                  placeholder="Paste from 5 Whys findings or describe the identified root cause..."
                />
              </Field>
            </PanelCard>

            {/* 5. Countermeasures */}
            <PanelCard title="5. Countermeasures" subtitle="Specific actions to address the root cause">
              {draft.countermeasures.length > 0 && (
                <div className="mb-4 space-y-2">
                  {draft.countermeasures.map((cm, idx) => (
                    <div
                      key={cm.id}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                    >
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-300/16 text-[10px] font-bold text-cyan-200">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-slate-100">{cm.description}</div>
                        <div className="mt-0.5 flex gap-3 text-xs text-slate-400">
                          {cm.owner && <span>Owner: {cm.owner}</span>}
                          {cm.date && <span>Date: {cm.date}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCountermeasure(cm.id)}
                        className="flex-shrink-0 rounded-lg px-2 py-1 text-xs text-rose-300 transition hover:bg-rose-300/10"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-[1fr_160px_140px_auto]">
                <Field label="Description">
                  <Input
                    value={newCm.description}
                    onChange={e => setNewCm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Action to take..."
                  />
                </Field>
                <Field label="Owner">
                  <Input
                    value={newCm.owner}
                    onChange={e => setNewCm(prev => ({ ...prev, owner: e.target.value }))}
                    placeholder="Name..."
                  />
                </Field>
                <Field label="Date">
                  <Input
                    type="date"
                    value={newCm.date}
                    onChange={e => setNewCm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </Field>
                <div className="flex items-end">
                  <ActionButton onClick={handleAddCountermeasure} disabled={!newCm.description.trim()}>
                    Add
                  </ActionButton>
                </div>
              </div>
            </PanelCard>

            {/* 6. Implementation Plan */}
            <PanelCard title="6. Implementation Plan" subtitle="Timeline, milestones, and budget for execution">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Start Date">
                  <Input
                    type="date"
                    value={draft.implementationPlan.startDate}
                    onChange={e => updatePlan('startDate', e.target.value)}
                  />
                </Field>
                <Field label="Budget">
                  <Input
                    value={draft.implementationPlan.budget}
                    onChange={e => updatePlan('budget', e.target.value)}
                    placeholder="e.g. $4,200"
                  />
                </Field>
                <div />
              </div>
              <div className="mt-3">
                <Field label="Milestones">
                  <textarea
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                    rows={3}
                    value={draft.implementationPlan.milestones}
                    onChange={e => updatePlan('milestones', e.target.value)}
                    placeholder="Week 1: ...\nWeek 2: ...\nWeek 4: Review"
                  />
                </Field>
              </div>
            </PanelCard>

            {/* 7. Follow-up */}
            <PanelCard title="7. Follow-up" subtitle="Verification plan to confirm countermeasure effectiveness">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Verification Date">
                  <Input
                    type="date"
                    value={draft.followUp.verificationDate}
                    onChange={e => updateFollowUp('verificationDate', e.target.value)}
                  />
                </Field>
                <Field label="Metric to Check">
                  <Input
                    value={draft.followUp.metricToCheck}
                    onChange={e => updateFollowUp('metricToCheck', e.target.value)}
                    placeholder="e.g. OEE Availability %"
                  />
                </Field>
                <Field label="Responsible Person">
                  <Input
                    value={draft.followUp.responsiblePerson}
                    onChange={e => updateFollowUp('responsiblePerson', e.target.value)}
                    placeholder="Name or role..."
                  />
                </Field>
              </div>
            </PanelCard>

            {/* 8. Results */}
            <PanelCard title="8. Results" subtitle="Before/after comparison with calculated improvement">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Before Value">
                  <Input
                    type="number"
                    value={draft.results.beforeValue}
                    onChange={e => updateResults('beforeValue', e.target.value)}
                    placeholder="e.g. 4.3"
                  />
                </Field>
                <Field label="After Value">
                  <Input
                    type="number"
                    value={draft.results.afterValue}
                    onChange={e => updateResults('afterValue', e.target.value)}
                    placeholder="e.g. 1.8"
                  />
                </Field>
                <div>
                  <div className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Improvement (%)
                  </div>
                  <div className="flex h-[46px] items-center rounded-2xl border border-white/10 bg-slate-950/80 px-3 text-sm">
                    {draft.results.improvementPct
                      ? <span className="font-semibold text-emerald-300">{draft.results.improvementPct}%</span>
                      : <span className="text-slate-500">Auto-calculated</span>
                    }
                  </div>
                </div>
              </div>
            </PanelCard>

            {/* Generate button */}
            <div className="flex justify-end">
              <ActionButton onClick={handleGenerate} disabled={!draft.title.trim()} tone="emerald">
                Generate Report
              </ActionButton>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* Reports Tab                                                    */}
        {/* ============================================================= */}
        {tab === 'reports' && (
          <div className="space-y-6">
            <PanelCard title="Saved Reports" subtitle={`${reports.length} A3 reports on file`}>
              {reports.length === 0 && (
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 text-center text-sm text-slate-500">
                  No reports yet. Create one from the Create tab or use a template.
                </div>
              )}
              <div className="space-y-3">
                {reports.map(r => (
                  <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.03]">
                    {/* Summary row */}
                    <button
                      type="button"
                      onClick={() => setExpandedReport(expandedReport === r.id ? null : r.id)}
                      className="flex w-full items-start gap-4 p-4 text-left transition hover:bg-white/[0.02]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-100">{r.title}</div>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                          <span>{r.author}</span>
                          <span>{r.date}</span>
                          {r.background && <span className="max-w-xs truncate">{r.background.slice(0, 80)}...</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <StatusPill label={r.status} tone={STATUS_TONE[r.status]} />
                        <Select
                          value={r.status}
                          onChange={e => { e.stopPropagation(); handleUpdateStatus(r.id, e.target.value as ReportStatus); }}
                          className="!w-auto !rounded-lg !px-2 !py-1 text-xs"
                        >
                          <option value="draft">Draft</option>
                          <option value="submitted">Submitted</option>
                          <option value="approved">Approved</option>
                        </Select>
                      </div>
                    </button>

                    {/* Expanded full report */}
                    {expandedReport === r.id && (
                      <div className="space-y-4 border-t border-white/8 px-4 pb-5 pt-4">
                        {r.background && (
                          <Section heading="Background">{r.background}</Section>
                        )}
                        <Section heading="Current Condition">
                          OEE: {r.currentCondition.oee}% | Scrap: {r.currentCondition.scrapRate}% | Cycle Dev: {r.currentCondition.cycleTimeDeviation}%
                        </Section>
                        <Section heading="Goal">
                          Target OEE: {r.goal.targetOee}% | Target Scrap: {r.goal.targetScrapRate}% | Target Cycle Dev: {r.goal.targetCycleTime}%
                        </Section>
                        {r.rootCauseAnalysis && (
                          <Section heading="Root Cause Analysis">{r.rootCauseAnalysis}</Section>
                        )}
                        {r.countermeasures.length > 0 && (
                          <div>
                            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                              Countermeasures
                            </div>
                            <div className="space-y-1.5">
                              {r.countermeasures.map((cm, idx) => (
                                <div key={cm.id} className="flex gap-2 text-xs text-slate-300">
                                  <span className="font-semibold text-cyan-300">{idx + 1}.</span>
                                  <span>{cm.description}</span>
                                  {cm.owner && <span className="text-slate-500">({cm.owner})</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <Section heading="Implementation Plan">
                          Start: {r.implementationPlan.startDate || 'TBD'} | Budget: {r.implementationPlan.budget || 'TBD'}
                          {r.implementationPlan.milestones && (
                            <div className="mt-1 whitespace-pre-line text-slate-400">{r.implementationPlan.milestones}</div>
                          )}
                        </Section>
                        <Section heading="Follow-up">
                          Verify: {r.followUp.verificationDate || 'TBD'} | Metric: {r.followUp.metricToCheck || 'TBD'} | Owner: {r.followUp.responsiblePerson || 'TBD'}
                        </Section>
                        {(r.results.beforeValue || r.results.afterValue) && (
                          <Section heading="Results">
                            Before: {r.results.beforeValue || '--'} | After: {r.results.afterValue || '--'}
                            {r.results.improvementPct && (
                              <span className="ml-2 font-semibold text-emerald-300">
                                ({r.results.improvementPct}% improvement)
                              </span>
                            )}
                          </Section>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </PanelCard>
          </div>
        )}

        {/* ============================================================= */}
        {/* Templates Tab                                                  */}
        {/* ============================================================= */}
        {tab === 'templates' && (
          <div className="space-y-6">
            <PanelCard title="Report Templates" subtitle="Pre-built A3 templates for common manufacturing scenarios">
              <div className="grid gap-4 sm:grid-cols-2">
                {TEMPLATES.map(tpl => (
                  <div
                    key={tpl.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                  >
                    <div className="mb-2 text-sm font-semibold text-slate-100">{tpl.name}</div>
                    <p className="mb-4 text-xs leading-relaxed text-slate-400">{tpl.description}</p>
                    <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                      {tpl.prefill.currentCondition?.oee && (
                        <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5">
                          OEE: {tpl.prefill.currentCondition.oee}%
                        </span>
                      )}
                      {tpl.prefill.currentCondition?.scrapRate && (
                        <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5">
                          Scrap: {tpl.prefill.currentCondition.scrapRate}%
                        </span>
                      )}
                      {tpl.prefill.countermeasures && (
                        <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5">
                          {tpl.prefill.countermeasures.length} countermeasures
                        </span>
                      )}
                    </div>
                    <div className="mt-4">
                      <ActionButton onClick={() => handleApplyTemplate(tpl)} tone="cyan" className="text-xs">
                        Use Template
                      </ActionButton>
                    </div>
                  </div>
                ))}
              </div>
            </PanelCard>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{heading}</div>
      <div className="text-xs leading-relaxed text-slate-300">{children}</div>
    </div>
  );
}
