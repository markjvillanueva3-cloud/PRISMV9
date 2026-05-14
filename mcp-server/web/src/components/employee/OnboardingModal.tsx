/**
 * BIZ-MS2 U-BIZ16: Onboarding Checklist Modal
 * 7-step sequential checklist for new employee onboarding.
 */
import { useState } from 'react';
import { ActionButton } from '../workspace/WorkspacePrimitives';

interface OnboardingModalProps {
  employeeName: string;
  employeeId: string;
  onComplete: () => void;
  onClose: () => void;
}

const ONBOARDING_STEPS = [
  { id: 'account', label: 'Create User Account', description: 'Set up system login credentials' },
  { id: 'role', label: 'Assign Role & Clearance', description: 'Set clearance level and department role' },
  { id: 'background', label: 'Security Clearance', description: 'Background check received and verified' },
  { id: 'training', label: 'Required Training', description: 'Assign required courses for the role' },
  { id: 'machines', label: 'Machine Access', description: 'Verify machine certifications for assigned equipment' },
  { id: 'equipment', label: 'Badge & Equipment Issued', description: 'ID badge, PPE, and tools distributed' },
  { id: 'firstday', label: 'First Day Complete', description: 'Orientation, tour, and team introductions done' },
] as const;

export function OnboardingModal({ employeeName, employeeId, onComplete, onClose }: OnboardingModalProps) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');

  const toggleStep = (stepId: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  const allDone = completed.size === ONBOARDING_STEPS.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="mx-4 w-full max-w-lg rounded-[24px] border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-50">Onboarding: {employeeName}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">&times;</button>
        </div>

        <div className="mb-1 text-xs text-slate-500">{completed.size}/{ONBOARDING_STEPS.length} steps complete</div>
        <div className="mb-4 h-2 w-full rounded-full bg-slate-700">
          <div
            className="h-2 rounded-full bg-emerald-400 transition-all"
            style={{ width: `${(completed.size / ONBOARDING_STEPS.length) * 100}%` }}
          />
        </div>

        <div className="max-h-[360px] space-y-2 overflow-y-auto">
          {ONBOARDING_STEPS.map((step, i) => (
            <label
              key={step.id}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm cursor-pointer transition ${
                completed.has(step.id)
                  ? 'border-emerald-400/30 bg-emerald-400/10'
                  : 'border-white/8 bg-white/[0.03]'
              }`}
            >
              <input
                type="checkbox"
                checked={completed.has(step.id)}
                onChange={() => toggleStep(step.id)}
                className="mt-0.5 accent-emerald-400"
              />
              <div>
                <div className={`font-medium ${completed.has(step.id) ? 'text-emerald-300' : 'text-slate-100'}`}>
                  {i + 1}. {step.label}
                </div>
                <div className="text-xs text-slate-400">{step.description}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-400">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            placeholder="Equipment serial numbers, special instructions..."
          />
        </div>

        <div className="mt-4 flex gap-3">
          <ActionButton onClick={onComplete} disabled={!allDone} tone="emerald">
            {allDone ? 'Complete Onboarding' : `${ONBOARDING_STEPS.length - completed.size} steps remaining`}
          </ActionButton>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
