/**
 * PP-REV-MS5 U-REV32: AI Learning Dashboard
 *
 * Shows per-machine RL learning state, feedback history, and
 * "What PRISM learned" explainer. Uses apiMachineLearning() and
 * apiFeedback() from the external integration API.
 */
import { useCallback, useState } from 'react';
import { apiMachineLearning, apiFeedback } from '../api/client';
import type { PrismResponse } from '../api/types';

const CONTROLLERS = ['fanuc', 'haas', 'siemens', 'heidenhain', 'mazak', 'okuma'] as const;
const OUTCOMES = ['ran_great', 'too_slow', 'surface_rough', 'tool_broke', 'crashed'] as const;

type MachineEntry = {
  id: string;
  name: string;
  controller: string;
};

type LearningState = {
  machine_id: string;
  controller: string;
  learning: {
    total_experiences: number;
    optimized_actions: number;
    avg_reward: number;
    q_table_size: number;
    learning_score: number;
  };
  summary: string;
};

type FeedbackEntry = {
  program_id: string;
  outcome: string;
  timestamp: string;
};

// JM Die Company's real machines (ids match jm-die-profile.ts JM_DIE_CONTROLLER_MAP so the
// per-machine RL learning state keys to the same machine_id the backend tracks). Six chosen to
// cover all five JM controller families (hurco / okuma / haas / mitsubishi / fanuc). Unknown
// machines return an empty learning state (total_experiences: 0) until programs are optimized.
const DEMO_MACHINES: MachineEntry[] = [
  { id: 'VMC-01', name: 'Hurco VM30i', controller: 'hurco' },
  { id: 'VMC-02', name: 'Okuma M460V-5AX', controller: 'okuma' },
  { id: 'VMC-03', name: 'Haas VF-2', controller: 'haas' },
  { id: 'LTH-01', name: 'Okuma GENOS L300-M', controller: 'okuma' },
  { id: 'VMC-05', name: 'Roku-Roku HC 658-II', controller: 'fanuc' },
  { id: 'WEDM-01', name: 'Mitsubishi FA10S', controller: 'mitsubishi' },
];

function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold"
        className="rotate-90" style={{ transformOrigin: `${size/2}px ${size/2}px` }}>
        {score}
      </text>
    </svg>
  );
}

function MachineCard({ machine, onSelect }: { machine: MachineEntry; onSelect: () => void }) {
  return (
    <button onClick={onSelect}
      className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2 transition hover:border-cyan-500/40 hover:bg-white/[0.06]">
      <div className="flex items-center justify-between">
        <div className="font-medium text-white">{machine.name}</div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-400">
          {machine.controller.toUpperCase()}
        </span>
      </div>
      <div className="text-xs text-slate-500">ID: {machine.id}</div>
    </button>
  );
}

function LearningDetail({ state }: { state: LearningState }) {
  const { learning } = state;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <ScoreRing score={learning.learning_score} size={72} />
        <div>
          <div className="text-lg font-semibold text-white">Learning Score: {learning.learning_score}/100</div>
          <div className="text-sm text-slate-400">{state.summary}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Programs Optimized" value={learning.total_experiences} />
        <StatCard label="Optimized Actions" value={learning.optimized_actions} />
        <StatCard label="Avg Reward" value={learning.avg_reward.toFixed(1)} />
        <StatCard label="Q-Table Size" value={learning.q_table_size} />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
        <div className="text-sm font-medium text-cyan-400">What Kienzle Learned</div>
        <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
          {learning.total_experiences === 0 ? (
            <li>No programs optimized yet. Run your first optimization to start learning.</li>
          ) : (
            <>
              <li>Processed {learning.total_experiences} program{learning.total_experiences > 1 ? 's' : ''} on {state.controller} controller</li>
              {learning.avg_reward > 10 && <li>Programs are running well - average reward indicates good optimization</li>}
              {learning.avg_reward < 0 && <li>Some programs had issues - RL is adjusting formatting preferences</li>}
              {learning.q_table_size > 5 && <li>Built knowledge of {learning.q_table_size} state-action pairs for code formatting</li>}
              <li>Formatting preferences adapt based on execution feedback (time, quality, errors)</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
      <div className="text-lg font-semibold text-white">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

function FeedbackForm({ machines, onSubmit }: {
  machines: MachineEntry[];
  onSubmit: (entry: FeedbackEntry) => void;
}) {
  const [programId, setProgramId] = useState('');
  const [machineId, setMachineId] = useState(machines[0]?.id ?? '');
  const [outcome, setOutcome] = useState<string>('ran_great');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const machine = machines.find(m => m.id === machineId);

  const handleSubmit = useCallback(async () => {
    if (!programId.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      await apiFeedback({
        program_id: programId,
        controller: machine?.controller ?? 'fanuc',
        outcome,
      });
      const entry: FeedbackEntry = {
        program_id: programId,
        outcome,
        timestamp: new Date().toISOString(),
      };
      onSubmit(entry);
      setResult(`Feedback recorded: ${outcome} for ${programId}`);
      setProgramId('');
    } catch (e: any) {
      setResult(`Error: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  }, [programId, machineId, outcome, machine, onSubmit]);

  const outcomeMeta: Record<string, { label: string; color: string }> = {
    ran_great: { label: 'Ran Great', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    too_slow: { label: 'Too Slow', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    surface_rough: { label: 'Surface Rough', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
    tool_broke: { label: 'Tool Broke', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
    crashed: { label: 'Crashed', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
      <div className="text-sm font-medium text-cyan-400">Rate a Program</div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Program ID / File Name</label>
          <input type="text" value={programId} onChange={e => setProgramId(e.target.value)}
            placeholder="e.g., PART_001_V2"
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Machine</label>
          <select value={machineId} onChange={e => setMachineId(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none">
            {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-2">How did it run?</label>
        <div className="flex flex-wrap gap-2">
          {OUTCOMES.map(o => (
            <button key={o} onClick={() => setOutcome(o)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                outcome === o ? outcomeMeta[o].color : 'border-white/10 text-slate-500 hover:text-white'
              }`}>
              {outcomeMeta[o].label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleSubmit} disabled={submitting || !programId.trim()}
        className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed">
        {submitting ? 'Submitting...' : 'Submit Feedback'}
      </button>

      {result && (
        <div className={`text-xs px-3 py-2 rounded-lg ${result.startsWith('Error') ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
          {result}
        </div>
      )}
    </div>
  );
}

export function AILearningDashboardPage() {
  const [selectedMachine, setSelectedMachine] = useState<MachineEntry | null>(null);
  const [learningState, setLearningState] = useState<LearningState | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSelectMachine = useCallback(async (machine: MachineEntry) => {
    setSelectedMachine(machine);
    setLoading(true);
    setError(null);
    try {
      const resp: PrismResponse = await apiMachineLearning(machine.id, machine.controller);
      if (resp?.result) {
        setLearningState(resp.result as unknown as LearningState);
      } else {
        setError('Failed to load learning state');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFeedback = useCallback((entry: FeedbackEntry) => {
    setFeedbackHistory(prev => [entry, ...prev].slice(0, 50));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">AI Learning Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Per-machine RL learning state, feedback history, and what Kienzle has learned from your programs.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Machine list */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-slate-400">Your Machines</div>
            {DEMO_MACHINES.map(m => (
              <MachineCard key={m.id} machine={m}
                onSelect={() => handleSelectMachine(m)} />
            ))}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-2 space-y-4">
            {!selectedMachine && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-500">
                Select a machine to view its learning state
              </div>
            )}

            {selectedMachine && loading && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400 animate-pulse">
                Loading learning state for {selectedMachine.name}...
              </div>
            )}

            {selectedMachine && error && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                {error}
              </div>
            )}

            {selectedMachine && learningState && !loading && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-white">{selectedMachine.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                    {selectedMachine.controller.toUpperCase()}
                  </span>
                </div>
                <LearningDetail state={learningState} />
              </div>
            )}

            {/* Feedback form */}
            <FeedbackForm machines={DEMO_MACHINES} onSubmit={handleFeedback} />

            {/* Feedback history */}
            {feedbackHistory.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
                <div className="text-sm font-medium text-cyan-400">Recent Feedback</div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {feedbackHistory.map((entry, i) => {
                    const color = entry.outcome === 'ran_great' ? 'text-emerald-300'
                      : entry.outcome === 'tool_broke' || entry.outcome === 'crashed' ? 'text-rose-300'
                      : 'text-amber-300';
                    return (
                      <div key={i} className="flex items-center justify-between text-xs border-b border-white/5 pb-1">
                        <span className="text-white font-mono">{entry.program_id}</span>
                        <span className={color}>{entry.outcome.replace('_', ' ')}</span>
                        <span className="text-slate-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
