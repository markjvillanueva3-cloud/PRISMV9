import { StatusPill } from '../workspace/WorkspacePrimitives';
import type {
  ApprovalSummary,
  ScheduleReleaseCheck,
  ShortageRecord,
  TravelerStepRecord,
  WorkflowTimelineEntry,
} from '../../features/operating-system/contracts';

function travelerTone(status: TravelerStepRecord['status']) {
  if (status === 'complete') return 'emerald' as const;
  if (status === 'running') return 'amber' as const;
  if (status === 'ready') return 'sky' as const;
  return 'slate' as const;
}

function approvalTone(status: ApprovalSummary['status']) {
  if (status === 'approved') return 'emerald' as const;
  if (status === 'ready') return 'sky' as const;
  if (status === 'blocked') return 'rose' as const;
  return 'amber' as const;
}

function shortageTone(severity: ShortageRecord['severity']) {
  return severity === 'high' ? ('rose' as const) : ('amber' as const);
}

function timelineDotClass(tone: WorkflowTimelineEntry['tone']) {
  if (tone === 'good') return 'bg-emerald-300';
  if (tone === 'watch') return 'bg-amber-300';
  return 'bg-slate-500';
}

export function TravelerLane({
  steps,
  emptyMessage,
}: {
  steps: TravelerStepRecord[];
  emptyMessage: string;
}) {
  if (steps.length === 0) {
    return <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div key={step.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{step.code}</div>
              <div className="mt-1 text-sm font-semibold text-slate-50">{step.title}</div>
              <div className="mt-2 text-sm text-slate-400">{step.machine}</div>
            </div>
            <div className="text-right">
              <StatusPill label={step.status} tone={travelerTone(step.status)} />
              <div className="mt-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">{step.estimate}</div>
            </div>
          </div>
          <div className="mt-3 text-sm leading-6 text-slate-300">{step.note}</div>
        </div>
      ))}
    </div>
  );
}

export function ShortageLane({
  shortages,
  emptyMessage,
}: {
  shortages: ShortageRecord[];
  emptyMessage: string;
}) {
  if (shortages.length === 0) {
    return <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-3">
      {shortages.map((shortage) => (
        <div key={shortage.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-50">{shortage.item}</div>
              <div className="mt-2 text-sm text-slate-400">{shortage.action}</div>
            </div>
            <div className="text-right">
              <StatusPill label={shortage.severity} tone={shortageTone(shortage.severity)} />
              <div className="mt-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">{shortage.eta}</div>
            </div>
          </div>
          <div className="mt-3 text-[11px] uppercase tracking-[0.16em] text-slate-500">{shortage.owner}</div>
        </div>
      ))}
    </div>
  );
}

export function ApprovalLane({
  approvals,
  emptyMessage,
}: {
  approvals: ApprovalSummary[];
  emptyMessage: string;
}) {
  if (approvals.length === 0) {
    return <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-3">
      {approvals.map((approval) => (
        <div key={approval.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-50">{approval.label}</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">{approval.detail}</div>
            </div>
            <div className="text-right">
              <StatusPill label={approval.status} tone={approvalTone(approval.status)} />
              <div className="mt-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">{approval.owner}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TimelineLane({
  entries,
  emptyMessage,
}: {
  entries: WorkflowTimelineEntry[];
  emptyMessage: string;
}) {
  if (entries.length === 0) {
    return <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <div key={entry.id} className="flex gap-3">
          <div className="mt-1 flex flex-col items-center">
            <span className={`h-3 w-3 rounded-full ${timelineDotClass(entry.tone)}`} />
            <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{entry.time}</span>
          </div>
          <div className="flex-1 rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
            <div className="text-sm font-semibold text-slate-50">{entry.title}</div>
            <div className="mt-2 text-sm leading-6 text-slate-300">{entry.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReleaseGateChecklist({
  checks,
  completed,
  onToggle,
  summary,
  tone,
  note,
}: {
  checks: ScheduleReleaseCheck[];
  completed: Record<string, boolean>;
  onToggle: (checkId: string) => void;
  summary: string;
  tone: 'slate' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet';
  note: string;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Publish posture</div>
            <div className="mt-2 text-2xl font-semibold text-slate-50">
              {Object.values(completed).filter(Boolean).length}/{checks.length}
            </div>
          </div>
          <StatusPill label={summary} tone={tone} />
        </div>
        <div className="mt-3 text-sm leading-6 text-slate-400">{note}</div>
      </div>

      <div className="space-y-3">
        {checks.map((check) => {
          const isDone = Boolean(completed[check.id]);
          return (
            <button
              key={check.id}
              type="button"
              onClick={() => onToggle(check.id)}
              className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
                isDone
                  ? 'border-emerald-300/18 bg-emerald-300/[0.10]'
                  : 'border-white/8 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-50">{check.label}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-300">{check.detail}</div>
                </div>
                <StatusPill label={isDone ? 'Done' : 'Open'} tone={isDone ? 'emerald' : 'slate'} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
