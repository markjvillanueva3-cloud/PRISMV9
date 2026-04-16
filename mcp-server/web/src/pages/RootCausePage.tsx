import { useCallback, useEffect, useState } from 'react';
import { getRootCauseIncidents } from '../api/client';
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

type Tab = 'analysis' | 'fishbone' | 'actions' | 'history';

interface WhyLevel {
  question: string;
  answer: string;
}

interface RootCauseAnalysis {
  id: string;
  problem: string;
  whys: WhyLevel[];
  rootCause: string;
  date: string;
  machine: string;
  department: string;
  status: 'open' | 'in_progress' | 'resolved';
}

interface FishboneCause {
  id: string;
  category: FishboneCategory;
  text: string;
}

type FishboneCategory = 'man' | 'machine' | 'material' | 'method' | 'measurement' | 'environment';

interface ActionItem {
  id: string;
  analysisId: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: 'open' | 'in_progress' | 'complete' | 'verified';
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const SEED_ANALYSES: RootCauseAnalysis[] = [
  {
    id: 'rca-001',
    problem: 'Part scrapped due to chatter',
    whys: [
      { question: 'Why was the part scrapped?', answer: 'Surface finish exceeded tolerance due to chatter marks' },
      { question: 'Why did chatter occur?', answer: 'Tool deflection exceeded 0.05 mm during roughing pass' },
      { question: 'Why was tool deflection excessive?', answer: 'Stick-out length was 6xD instead of the recommended 4xD' },
      { question: 'Why was a longer stick-out used?', answer: 'Operator used the available holder which required extra extension' },
      { question: 'Why was the correct holder unavailable?', answer: 'Tool crib inventory was depleted and reorder was not triggered' },
    ],
    rootCause: 'Tool crib reorder point not set for ER32 collet holders, causing operators to improvise with longer stick-outs that introduce chatter.',
    date: '2026-03-28',
    machine: 'VMC-04 (Haas VF-2SS)',
    department: 'Milling',
    status: 'in_progress',
  },
  {
    id: 'rca-002',
    problem: 'Recurring dimensional drift on turned shafts',
    whys: [
      { question: 'Why are shafts out of tolerance?', answer: 'Diameter grows by 0.02 mm over a 50-part run' },
      { question: 'Why does the diameter grow?', answer: 'Thermal expansion of the chuck and spindle nose' },
      { question: 'Why is thermal expansion not compensated?', answer: 'No thermal offset macro is active on this machine' },
      { question: 'Why is the macro not active?', answer: 'It was disabled after a false-trigger incident 6 months ago' },
      { question: 'Why was it not re-enabled after the fix?', answer: 'No follow-up task was created after the incident resolution' },
    ],
    rootCause: 'Thermal compensation macro disabled after incident with no tracking task to re-enable after root fix was applied.',
    date: '2026-03-15',
    machine: 'CNC-L02 (Okuma LB3000)',
    department: 'Turning',
    status: 'resolved',
  },
];

const SEED_FISHBONE_CAUSES: FishboneCause[] = [
  { id: 'fb-1', category: 'man', text: 'Operator chose incorrect stick-out length' },
  { id: 'fb-2', category: 'man', text: 'Setup sheet not followed completely' },
  { id: 'fb-3', category: 'machine', text: 'Spindle bearing wear increasing vibration baseline' },
  { id: 'fb-4', category: 'machine', text: 'Axis backlash at 0.012 mm on Y-axis' },
  { id: 'fb-5', category: 'material', text: 'Hardness variation 28-34 HRC across bar stock lot' },
  { id: 'fb-6', category: 'material', text: 'Inclusions in recycled alloy batch' },
  { id: 'fb-7', category: 'method', text: 'Roughing DOC too aggressive for tool diameter' },
  { id: 'fb-8', category: 'method', text: 'Climb milling in unsupported thin wall section' },
  { id: 'fb-9', category: 'measurement', text: 'CMM probe tip worn beyond calibration window' },
  { id: 'fb-10', category: 'measurement', text: 'In-process gage not zeroed between shifts' },
  { id: 'fb-11', category: 'environment', text: 'Ambient temp swing 18-26 C during night shift' },
  { id: 'fb-12', category: 'environment', text: 'Coolant concentration dropped below 6%' },
];

const SEED_ACTIONS: ActionItem[] = [
  {
    id: 'act-001',
    analysisId: 'rca-001',
    description: 'Set reorder point for ER32 collet holders in tool crib system',
    assignedTo: 'Mike R.',
    dueDate: '2026-04-05',
    status: 'in_progress',
  },
  {
    id: 'act-002',
    analysisId: 'rca-001',
    description: 'Add stick-out length validation to setup sheet checklist',
    assignedTo: 'Sarah L.',
    dueDate: '2026-04-10',
    status: 'open',
  },
  {
    id: 'act-003',
    analysisId: 'rca-002',
    description: 'Re-enable thermal compensation macro on CNC-L02',
    assignedTo: 'Dave K.',
    dueDate: '2026-03-20',
    status: 'verified',
  },
  {
    id: 'act-004',
    analysisId: 'rca-002',
    description: 'Create incident follow-up tracking SOP',
    assignedTo: 'Lisa M.',
    dueDate: '2026-04-01',
    status: 'complete',
  },
];

const FISHBONE_CATEGORIES: { key: FishboneCategory; label: string }[] = [
  { key: 'man', label: 'Man (Operator)' },
  { key: 'machine', label: 'Machine' },
  { key: 'material', label: 'Material' },
  { key: 'method', label: 'Method' },
  { key: 'measurement', label: 'Measurement' },
  { key: 'environment', label: 'Environment' },
];

const ACTION_STATUS_TONE: Record<ActionItem['status'], 'slate' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet'> = {
  open: 'slate',
  in_progress: 'amber',
  complete: 'sky',
  verified: 'emerald',
};

const ANALYSIS_STATUS_TONE: Record<RootCauseAnalysis['status'], 'slate' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet'> = {
  open: 'slate',
  in_progress: 'amber',
  resolved: 'emerald',
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function uid(): string {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RootCausePage() {
  const [tab, setTab] = useState<Tab>('analysis');

  // --- Analysis state ---
  const [analyses, setAnalyses] = useState<RootCauseAnalysis[]>(SEED_ANALYSES);

  // Load real incidents from API, fall back to seed
  useEffect(() => {
    getRootCauseIncidents()
      .then((res) => {
        const data = (res as any).data ?? (res as any).result ?? [];
        if (Array.isArray(data) && data.length > 0) {
          setAnalyses(data.map((d: any) => ({
            id: d.id ?? String(Math.random()),
            problem: d.problem ?? d.scrap_reason ?? d.description ?? '',
            whys: d.whys ?? [],
            rootCause: d.root_cause ?? '',
            date: d.date ?? d.created_at ?? new Date().toISOString(),
            severity: d.severity ?? 'medium',
            status: d.status ?? 'open',
            assignedTo: d.assigned_to ?? '',
          })));
        }
      })
      .catch(() => { /* keep seed data */ });
  }, []);
  const [activeAnalysis, setActiveAnalysis] = useState<string | null>(null);
  const [newProblem, setNewProblem] = useState('Part scrapped due to chatter');
  const [whyAnswers, setWhyAnswers] = useState<string[]>(['', '', '', '', '']);
  const [currentWhyLevel, setCurrentWhyLevel] = useState(0);
  const [analysisStarted, setAnalysisStarted] = useState(false);

  // --- Fishbone state ---
  const [fishboneCauses, setFishboneCauses] = useState<FishboneCause[]>(SEED_FISHBONE_CAUSES);
  const [fishboneProblem, setFishboneProblem] = useState('Part scrapped due to chatter');
  const [newCauseCategory, setNewCauseCategory] = useState<FishboneCategory>('man');
  const [newCauseText, setNewCauseText] = useState('');

  // --- Actions state ---
  const [actions, setActions] = useState<ActionItem[]>(SEED_ACTIONS);
  const [newAction, setNewAction] = useState({ description: '', assignedTo: '', dueDate: '' });

  // --- History state ---
  const [historyFilter, setHistoryFilter] = useState({ machine: '', department: '', date: '' });

  // --- Derived metrics ---
  const openAnalyses = analyses.filter(a => a.status !== 'resolved').length;
  const totalActions = actions.length;
  const resolvedCount = analyses.filter(a => a.status === 'resolved').length;

  // --- Why prompts ---
  const WHY_PROMPTS = [
    'Why did this problem occur?',
    'Why did that happen?',
    'Why was that the case?',
    'Why did that condition exist?',
    'Why was that not prevented?',
  ];

  // --- Analysis callbacks ---
  const handleStartAnalysis = useCallback(() => {
    if (!newProblem.trim()) return;
    setAnalysisStarted(true);
    setCurrentWhyLevel(0);
    setWhyAnswers(['', '', '', '', '']);
  }, [newProblem]);

  const handleNextWhy = useCallback(() => {
    if (currentWhyLevel < 4 && whyAnswers[currentWhyLevel].trim()) {
      setCurrentWhyLevel(prev => prev + 1);
    }
  }, [currentWhyLevel, whyAnswers]);

  const handleCompleteAnalysis = useCallback(() => {
    const newAnalysis: RootCauseAnalysis = {
      id: uid(),
      problem: newProblem,
      whys: whyAnswers.filter(a => a.trim()).map((answer, i) => ({
        question: WHY_PROMPTS[i],
        answer,
      })),
      rootCause: whyAnswers.filter(a => a.trim()).pop() ?? '',
      date: new Date().toISOString().slice(0, 10),
      machine: '',
      department: '',
      status: 'open',
    };
    setAnalyses(prev => [newAnalysis, ...prev]);
    setAnalysisStarted(false);
    setNewProblem('');
    setWhyAnswers(['', '', '', '', '']);
    setCurrentWhyLevel(0);
  }, [newProblem, whyAnswers]);

  const updateWhyAnswer = useCallback((level: number, value: string) => {
    setWhyAnswers(prev => {
      const next = [...prev];
      next[level] = value;
      return next;
    });
  }, []);

  // --- Fishbone callbacks ---
  const handleAddCause = useCallback(() => {
    if (!newCauseText.trim()) return;
    setFishboneCauses(prev => [
      ...prev,
      { id: uid(), category: newCauseCategory, text: newCauseText.trim() },
    ]);
    setNewCauseText('');
  }, [newCauseCategory, newCauseText]);

  // --- Action callbacks ---
  const handleAddAction = useCallback(() => {
    if (!newAction.description.trim()) return;
    setActions(prev => [
      ...prev,
      {
        id: uid(),
        analysisId: activeAnalysis ?? '',
        description: newAction.description,
        assignedTo: newAction.assignedTo,
        dueDate: newAction.dueDate,
        status: 'open',
      },
    ]);
    setNewAction({ description: '', assignedTo: '', dueDate: '' });
  }, [newAction, activeAnalysis]);

  const handleUpdateActionStatus = useCallback((id: string, status: ActionItem['status']) => {
    setActions(prev => prev.map(a => (a.id === id ? { ...a, status } : a)));
  }, []);

  // --- Filtered history ---
  const filteredHistory = analyses.filter(a => {
    if (historyFilter.machine && !a.machine.toLowerCase().includes(historyFilter.machine.toLowerCase())) return false;
    if (historyFilter.department && !a.department.toLowerCase().includes(historyFilter.department.toLowerCase())) return false;
    if (historyFilter.date && a.date < historyFilter.date) return false;
    return true;
  });

  // =======================================================================
  // Render
  // =======================================================================

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <WorkspaceHero
          eyebrow="Quality Intelligence"
          title="Root Cause Analyzer"
          description="Structured 5 Whys analysis with Ishikawa diagrams, corrective action tracking, and historical trend review for manufacturing non-conformances."
          metrics={
            <>
              <SummaryTile label="Open Analyses" value={String(openAnalyses)} hint="Awaiting root cause" accent="from-amber-400/22 via-amber-300/10 to-transparent" />
              <SummaryTile label="Action Items" value={String(totalActions)} hint="Corrective actions" accent="from-sky-400/22 via-sky-300/10 to-transparent" />
              <SummaryTile label="Resolved" value={String(resolvedCount)} hint="Closed investigations" accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
            </>
          }
        />

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {(['analysis', 'fishbone', 'actions', 'history'] as Tab[]).map(t => (
            <TabButton key={t} active={tab === t} onClick={() => setTab(t)}>
              {t === 'analysis' ? '5 Whys Analysis' : t === 'fishbone' ? 'Fishbone Diagram' : t === 'actions' ? 'Corrective Actions' : 'History'}
            </TabButton>
          ))}
        </div>

        {/* ============================================================= */}
        {/* Analysis Tab                                                   */}
        {/* ============================================================= */}
        {tab === 'analysis' && (
          <div className="space-y-6">
            <PanelCard title="Start New Analysis" subtitle="Guided 5 Whys drill-down to identify root causes">
              <div className="space-y-4">
                <Field label="Problem Statement">
                  <Input
                    value={newProblem}
                    onChange={e => setNewProblem(e.target.value)}
                    placeholder="Describe the problem observed..."
                  />
                </Field>

                {!analysisStarted && (
                  <ActionButton onClick={handleStartAnalysis} disabled={!newProblem.trim()}>
                    Start New Analysis
                  </ActionButton>
                )}

                {analysisStarted && (
                  <div className="space-y-3">
                    {WHY_PROMPTS.map((prompt, level) => {
                      if (level > currentWhyLevel) return null;
                      return (
                        <div
                          key={level}
                          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                          style={{ marginLeft: `${level * 24}px` }}
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-300/16 text-xs font-bold text-cyan-200">
                              {level + 1}
                            </span>
                            <span className="text-sm font-semibold text-slate-300">{prompt}</span>
                          </div>
                          <Input
                            value={whyAnswers[level]}
                            onChange={e => updateWhyAnswer(level, e.target.value)}
                            placeholder={`Answer Why #${level + 1}...`}
                          />
                          {level === currentWhyLevel && level < 4 && (
                            <div className="mt-2">
                              <ActionButton
                                onClick={handleNextWhy}
                                disabled={!whyAnswers[level].trim()}
                                tone="cyan"
                                className="text-xs"
                              >
                                Next Why
                              </ActionButton>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Root cause summary */}
                    {currentWhyLevel >= 4 && whyAnswers[4].trim() && (
                      <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-5">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                          Root Cause Identified
                        </div>
                        <p className="text-sm leading-relaxed text-slate-200">{whyAnswers[4]}</p>
                        <div className="mt-4">
                          <ActionButton onClick={handleCompleteAnalysis} tone="emerald">
                            Save Analysis
                          </ActionButton>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </PanelCard>

            {/* Recent analyses */}
            <PanelCard title="Recent Analyses" subtitle={`${analyses.length} total investigations`}>
              <div className="space-y-3">
                {analyses.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setActiveAnalysis(activeAnalysis === a.id ? null : a.id)}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/16 hover:bg-white/[0.06]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-100">{a.problem}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          {a.date} {a.machine && `\u00B7 ${a.machine}`} {a.department && `\u00B7 ${a.department}`}
                        </div>
                      </div>
                      <StatusPill label={a.status.replace('_', ' ')} tone={ANALYSIS_STATUS_TONE[a.status]} />
                    </div>
                    {activeAnalysis === a.id && (
                      <div className="mt-4 space-y-2 border-t border-white/8 pt-3">
                        {a.whys.map((w, i) => (
                          <div key={i} className="text-xs text-slate-300" style={{ paddingLeft: `${i * 16}px` }}>
                            <span className="font-semibold text-cyan-300">Why {i + 1}:</span> {w.answer}
                          </div>
                        ))}
                        {a.rootCause && (
                          <div className="mt-2 rounded-xl bg-emerald-300/[0.06] p-3 text-xs text-emerald-200">
                            <span className="font-semibold">Root Cause:</span> {a.rootCause}
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </PanelCard>
          </div>
        )}

        {/* ============================================================= */}
        {/* Fishbone Tab                                                   */}
        {/* ============================================================= */}
        {tab === 'fishbone' && (
          <div className="space-y-6">
            <PanelCard title="Ishikawa Diagram" subtitle="Cause-and-effect analysis across 6 manufacturing categories">
              {/* Problem statement spine */}
              <div className="mb-6">
                <Field label="Problem Statement (Effect)">
                  <Input
                    value={fishboneProblem}
                    onChange={e => setFishboneProblem(e.target.value)}
                    placeholder="Central problem..."
                  />
                </Field>
              </div>

              {/* Spine visualization */}
              <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                {/* Central spine */}
                <div className="mb-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-300/40 to-cyan-300/60" />
                  <div className="rounded-xl border border-cyan-300/30 bg-cyan-300/[0.1] px-4 py-2 text-sm font-semibold text-cyan-100">
                    {fishboneProblem || 'Problem Statement'}
                  </div>
                </div>

                {/* Categories in 2-column grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {FISHBONE_CATEGORIES.map(({ key, label }) => {
                    const causes = fishboneCauses.filter(c => c.category === key);
                    return (
                      <div key={key} className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                          {label}
                        </div>
                        {causes.length === 0 && (
                          <div className="text-xs italic text-slate-500">No causes added</div>
                        )}
                        <ul className="space-y-1.5">
                          {causes.map(c => (
                            <li key={c.id} className="flex items-start gap-2 text-xs text-slate-300">
                              <span className="mt-1.5 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-300/50" />
                              {c.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add cause form */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-3 text-sm font-semibold text-slate-200">Add Contributing Cause</div>
                <div className="grid gap-3 sm:grid-cols-[180px_1fr_auto]">
                  <Field label="Category">
                    <Select value={newCauseCategory} onChange={e => setNewCauseCategory(e.target.value as FishboneCategory)}>
                      {FISHBONE_CATEGORIES.map(({ key, label }) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Cause">
                    <Input
                      value={newCauseText}
                      onChange={e => setNewCauseText(e.target.value)}
                      placeholder="Describe the contributing cause..."
                      onKeyDown={e => { if (e.key === 'Enter') handleAddCause(); }}
                    />
                  </Field>
                  <div className="flex items-end">
                    <ActionButton onClick={handleAddCause} disabled={!newCauseText.trim()}>
                      Add
                    </ActionButton>
                  </div>
                </div>
              </div>
            </PanelCard>
          </div>
        )}

        {/* ============================================================= */}
        {/* Actions Tab                                                    */}
        {/* ============================================================= */}
        {tab === 'actions' && (
          <div className="space-y-6">
            <PanelCard title="Corrective Actions" subtitle="Track action items generated from root cause findings">
              <div className="space-y-3">
                {actions.map(a => (
                  <div
                    key={a.id}
                    className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="text-sm font-semibold text-slate-100">{a.description}</div>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                        {a.assignedTo && <span>Assigned: {a.assignedTo}</span>}
                        {a.dueDate && <span>Due: {a.dueDate}</span>}
                        {a.analysisId && (
                          <span>
                            Analysis: {analyses.find(an => an.id === a.analysisId)?.problem.slice(0, 40) ?? a.analysisId}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusPill label={a.status.replace('_', ' ')} tone={ACTION_STATUS_TONE[a.status]} />
                      <Select
                        value={a.status}
                        onChange={e => handleUpdateActionStatus(a.id, e.target.value as ActionItem['status'])}
                        className="!w-auto !rounded-lg !px-2 !py-1 text-xs"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="complete">Complete</option>
                        <option value="verified">Verified</option>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </PanelCard>

            {/* Add action form */}
            <PanelCard title="Add Action" subtitle="Create a new corrective action item">
              <div className="grid gap-3 sm:grid-cols-[1fr_180px_160px]">
                <Field label="Description">
                  <Input
                    value={newAction.description}
                    onChange={e => setNewAction(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Corrective action description..."
                  />
                </Field>
                <Field label="Assigned To">
                  <Input
                    value={newAction.assignedTo}
                    onChange={e => setNewAction(prev => ({ ...prev, assignedTo: e.target.value }))}
                    placeholder="Name..."
                  />
                </Field>
                <Field label="Due Date">
                  <Input
                    type="date"
                    value={newAction.dueDate}
                    onChange={e => setNewAction(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </Field>
              </div>
              <div className="mt-4">
                <ActionButton onClick={handleAddAction} disabled={!newAction.description.trim()}>
                  Add Action
                </ActionButton>
              </div>
            </PanelCard>
          </div>
        )}

        {/* ============================================================= */}
        {/* History Tab                                                    */}
        {/* ============================================================= */}
        {tab === 'history' && (
          <div className="space-y-6">
            <PanelCard title="Analysis History" subtitle="Past root cause investigations and outcomes">
              {/* Filters */}
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <Field label="Filter by Machine">
                  <Input
                    value={historyFilter.machine}
                    onChange={e => setHistoryFilter(prev => ({ ...prev, machine: e.target.value }))}
                    placeholder="e.g. VMC-04..."
                  />
                </Field>
                <Field label="Filter by Department">
                  <Input
                    value={historyFilter.department}
                    onChange={e => setHistoryFilter(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g. Milling..."
                  />
                </Field>
                <Field label="Date (on or after)">
                  <Input
                    type="date"
                    value={historyFilter.date}
                    onChange={e => setHistoryFilter(prev => ({ ...prev, date: e.target.value }))}
                  />
                </Field>
              </div>

              {/* Results */}
              <div className="space-y-3">
                {filteredHistory.length === 0 && (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 text-center text-sm text-slate-500">
                    No analyses match the current filters.
                  </div>
                )}
                {filteredHistory.map(a => {
                  const relatedActions = actions.filter(act => act.analysisId === a.id);
                  return (
                    <div
                      key={a.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-100">{a.problem}</div>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
                            <span>{a.date}</span>
                            {a.machine && <span>{a.machine}</span>}
                            {a.department && <span>{a.department}</span>}
                          </div>
                        </div>
                        <StatusPill label={a.status.replace('_', ' ')} tone={ANALYSIS_STATUS_TONE[a.status]} />
                      </div>
                      {a.rootCause && (
                        <div className="mt-3 text-xs text-slate-300">
                          <span className="font-semibold text-emerald-300">Root Cause:</span> {a.rootCause}
                        </div>
                      )}
                      {relatedActions.length > 0 && (
                        <div className="mt-3 border-t border-white/8 pt-3">
                          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Actions Taken ({relatedActions.length})
                          </div>
                          <div className="space-y-1">
                            {relatedActions.map(act => (
                              <div key={act.id} className="flex items-center gap-2 text-xs text-slate-400">
                                <StatusPill label={act.status.replace('_', ' ')} tone={ACTION_STATUS_TONE[act.status]} />
                                <span>{act.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </PanelCard>
          </div>
        )}
      </div>
    </div>
  );
}
