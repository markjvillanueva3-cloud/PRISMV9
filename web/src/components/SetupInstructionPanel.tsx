import { useCallback, useState } from 'react';
import { PanelCard } from './workspace/WorkspacePrimitives';

// ── Types ───────────────────────────────────────────────────────────────────

export interface SetupStep {
  id: string;
  number: number;
  title: string;
  description: string;
  safetyNote?: string;
}

export interface ToolStation {
  station: number;
  toolName: string;
  holderType: string;
  insertGrade: string;
}

interface MeasurementPoint {
  label: string;
  nominal: string;
  tolerance: string;
  tool: string;
}

interface SetupInstructionPanelProps {
  steps: SetupStep[];
  toolStations: ToolStation[];
  measurementPoints: MeasurementPoint[];
  machineName: string;
  material: string;
}

// ── Component ───────────────────────────────────────────────────────────────

export function SetupInstructionPanel({
  steps,
  toolStations,
  measurementPoints,
  machineName,
  material,
}: SetupInstructionPanelProps) {
  const [completed, setCompleted] = useState<Set<string>>(() => new Set());

  const toggleStep = useCallback((id: string) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allDone = steps.every(s => completed.has(s.id));
  const doneCount = steps.filter(s => completed.has(s.id)).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <PanelCard title="Setup Guide" subtitle={`${machineName} \u2014 ${material}`}>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all"
                style={{ width: `${steps.length > 0 ? (doneCount / steps.length) * 100 : 0}%` }}
              />
            </div>
          </div>
          <span className="text-sm text-slate-400">
            {doneCount}/{steps.length} steps done
          </span>
          {allDone && (
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
              Ready to run
            </span>
          )}
        </div>
      </PanelCard>

      {/* Tool loading guide */}
      <PanelCard title="Tool Loading Guide" subtitle="Load these tools into your turret before starting">
        <div className="flex flex-col gap-2">
          {toolStations.map(tool => (
            <div
              key={tool.station}
              className="flex items-center gap-4 rounded-lg border border-white/8 bg-white/[0.02] p-4"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20">
                <span className="text-lg font-bold text-cyan-300">T{tool.station}</span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-200">{tool.toolName}</div>
                <div className="mt-0.5 text-xs text-slate-400">
                  Holder: {tool.holderType} &middot; Grade: {tool.insertGrade}
                </div>
              </div>
              <div className="text-xs text-slate-500">Station {tool.station}</div>
            </div>
          ))}
        </div>
      </PanelCard>

      {/* Step-by-step instructions */}
      <PanelCard title="Setup Steps" subtitle="Follow these steps in order. Check each one off as you go.">
        <div className="flex flex-col gap-3">
          {steps.map(step => {
            const isDone = completed.has(step.id);
            return (
              <div
                key={step.id}
                className={`rounded-lg border p-4 transition-colors ${
                  isDone
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleStep(step.id)}
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-sm font-bold transition ${
                      isDone
                        ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                        : 'border-white/20 bg-white/5 text-slate-400 hover:border-white/40'
                    }`}
                  >
                    {isDone ? '\u2713' : step.number}
                  </button>
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${isDone ? 'text-slate-400' : 'text-slate-200'}`}>
                      {step.title}
                    </div>
                    <p className={`mt-1 text-sm ${isDone ? 'text-slate-500' : 'text-slate-400'}`}>
                      {step.description}
                    </p>
                    {step.safetyNote && (
                      <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-2">
                        <span className="text-amber-400">&#x26A0;&#xFE0F;</span>
                        <span className="text-xs text-amber-300">{step.safetyNote}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </PanelCard>

      {/* First-article measurement guide */}
      <PanelCard title="Check Your First Part" subtitle="After the first part comes off the machine, measure these points to make sure everything is correct">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">What to measure</th>
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Expected value</th>
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tolerance</th>
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Measuring tool</th>
              </tr>
            </thead>
            <tbody>
              {measurementPoints.map((point, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="py-3 text-slate-200">{point.label}</td>
                  <td className="py-3 font-mono text-slate-300">{point.nominal}</td>
                  <td className="py-3 font-mono text-slate-400">{point.tolerance}</td>
                  <td className="py-3 text-slate-400">{point.tool}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          If any measurement is outside tolerance, check tool offsets and re-run before continuing the batch.
        </p>
      </PanelCard>

      {/* Pre-run checklist */}
      <PanelCard title="Pre-Run Checklist" subtitle="Confirm everything before pressing Cycle Start">
        <PreRunChecklist machineName={machineName} />
      </PanelCard>
    </div>
  );
}

// ── Pre-run checklist ───────────────────────────────────────────────────────

const PRE_RUN_ITEMS = [
  'All tools are loaded in the correct stations',
  'Tool offsets are set for every tool',
  'Work zero (Z0) is set at the part face',
  'Chuck is tight and workpiece is secure',
  'Coolant is on and aimed at the cutting zone',
  'Doors are closed',
  'Feed rate override is at 100%',
  'Spindle override is at 100%',
  'Rapid override is at 25% for first run',
];

function PreRunChecklist({ machineName }: { machineName: string }) {
  const [checked, setChecked] = useState<Set<number>>(() => new Set());

  const toggle = useCallback((idx: number) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const allChecked = PRE_RUN_ITEMS.every((_, i) => checked.has(i));

  return (
    <div className="flex flex-col gap-2">
      {PRE_RUN_ITEMS.map((item, i) => (
        <label
          key={i}
          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
            checked.has(i)
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-white/8 bg-white/[0.02] hover:border-white/16'
          }`}
        >
          <input
            type="checkbox"
            checked={checked.has(i)}
            onChange={() => toggle(i)}
            className="h-4 w-4 rounded border-white/20 bg-transparent accent-emerald-400"
          />
          <span className={`text-sm ${checked.has(i) ? 'text-slate-400' : 'text-slate-200'}`}>{item}</span>
        </label>
      ))}
      {allChecked && (
        <div className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
          <span className="text-sm font-semibold text-emerald-300">
            All checks passed — you are ready to press Cycle Start on the {machineName}
          </span>
        </div>
      )}
    </div>
  );
}
