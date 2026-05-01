import { useCallback, useState } from 'react';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  Select,
  StatusPill,
} from './workspace/WorkspacePrimitives';

// ── Types ───────────────────────────────────────────────────────────────────

export interface LatheWizardResult {
  material: string;
  materialConfirmed: boolean;
  qualityTier: QualityTier;
  batchQuantity: number;
  machinePreference: string;
}

type QualityTier = 'prototype' | 'production' | 'aerospace';
type WizardStep = 'material' | 'quality' | 'batch' | 'machine' | 'review';

const STEPS: WizardStep[] = ['material', 'quality', 'batch', 'machine', 'review'];
const STEP_LABELS: Record<WizardStep, string> = {
  material: 'Material',
  quality: 'Quality Level',
  batch: 'How Many?',
  machine: 'Machine',
  review: 'Review & Go',
};

interface QualityOption {
  id: QualityTier;
  title: string;
  subtitle: string;
  toleranceHint: string;
}

const QUALITY_OPTIONS: QualityOption[] = [
  {
    id: 'prototype',
    title: 'Prototype',
    subtitle: 'Fast turnaround, standard tolerances',
    toleranceHint: 'General tolerance class: coarse (ISO 2768-c)',
  },
  {
    id: 'production',
    title: 'Production',
    subtitle: 'Reliable and repeatable quality',
    toleranceHint: 'General tolerance class: medium (ISO 2768-m)',
  },
  {
    id: 'aerospace',
    title: 'Aerospace / Medical',
    subtitle: 'Certified quality with full traceability',
    toleranceHint: 'General tolerance class: fine (ISO 2768-f)',
  },
];

// ── Props ───────────────────────────────────────────────────────────────────

interface LatheInputWizardProps {
  /** Material extracted from drawing (if available) */
  extractedMaterial?: string;
  /** Callback when wizard is complete */
  onComplete: (result: LatheWizardResult) => void;
  /** Callback to go back to upload */
  onBack?: () => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export function LatheInputWizard({ extractedMaterial, onComplete, onBack }: LatheInputWizardProps) {
  const [step, setStep] = useState<WizardStep>('material');
  const [material, setMaterial] = useState(extractedMaterial ?? '');
  const [materialConfirmed, setMaterialConfirmed] = useState(false);
  const [qualityTier, setQualityTier] = useState<QualityTier>('production');
  const [batchQty, setBatchQty] = useState('1');
  const [machinePreference, setMachinePreference] = useState('auto');

  const stepIdx = STEPS.indexOf(step);

  const goNext = useCallback(() => {
    const nextIdx = stepIdx + 1;
    if (nextIdx < STEPS.length) setStep(STEPS[nextIdx]);
  }, [stepIdx]);

  const goBack = useCallback(() => {
    const prevIdx = stepIdx - 1;
    if (prevIdx >= 0) setStep(STEPS[prevIdx]);
    else onBack?.();
  }, [stepIdx, onBack]);

  const handleSubmit = useCallback(() => {
    onComplete({
      material: material || 'Unknown',
      materialConfirmed,
      qualityTier,
      batchQuantity: Math.max(1, parseInt(batchQty, 10) || 1),
      machinePreference,
    });
  }, [material, materialConfirmed, qualityTier, batchQty, machinePreference, onComplete]);

  return (
    <div className="mx-auto flex w-full max-w-[800px] flex-col gap-6">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                i < stepIdx ? 'bg-emerald-500/30 text-emerald-300'
                : i === stepIdx ? 'bg-blue-500/30 text-blue-300'
                : 'bg-zinc-700 text-zinc-500'
              }`}
            >
              {i < stepIdx ? '\u2713' : i + 1}
            </div>
            <span className={`hidden text-xs sm:block ${i === stepIdx ? 'text-zinc-200' : 'text-zinc-500'}`}>
              {STEP_LABELS[s]}
            </span>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-zinc-700" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 'material' && (
        <PanelCard title="What material is your part?">
          {extractedMaterial ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-zinc-400">
                We found this material on your drawing:
              </p>
              <div className="flex items-center gap-3 rounded-lg bg-zinc-800/60 p-4">
                <StatusPill status="ok" label={extractedMaterial} />
                <span className="text-sm text-zinc-400">Extracted from drawing</span>
              </div>
              <div className="flex gap-3">
                <ActionButton onClick={() => { setMaterialConfirmed(true); goNext(); }}>
                  Yes, that's correct
                </ActionButton>
                <ActionButton onClick={() => { setMaterialConfirmed(false); }}>
                  No, let me change it
                </ActionButton>
              </div>
              {!materialConfirmed && !extractedMaterial && null}
            </div>
          ) : null}
          {(!extractedMaterial || !materialConfirmed) && (
            <div className="flex flex-col gap-4">
              {!extractedMaterial && (
                <p className="text-sm text-zinc-400">
                  We couldn't detect the material from your drawing. Please enter it below.
                </p>
              )}
              <Field label="Material name or specification">
                <Input
                  placeholder="e.g. AISI 4140, 304 Stainless, 6061-T6, Ti-6Al-4V"
                  value={material}
                  onChange={e => setMaterial(e.target.value)}
                />
              </Field>
              <ActionButton
                onClick={() => { setMaterialConfirmed(true); goNext(); }}
                disabled={!material.trim()}
              >
                Continue
              </ActionButton>
            </div>
          )}
        </PanelCard>
      )}

      {step === 'quality' && (
        <PanelCard title="What quality level do you need?">
          <div className="flex flex-col gap-3">
            {QUALITY_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                className={`flex flex-col rounded-lg border p-4 text-left transition-colors ${
                  qualityTier === opt.id
                    ? 'border-blue-400/50 bg-blue-500/10'
                    : 'border-zinc-700 bg-zinc-800/40 hover:border-zinc-500'
                }`}
                onClick={() => setQualityTier(opt.id)}
              >
                <span className="font-medium text-zinc-200">{opt.title}</span>
                <span className="mt-0.5 text-sm text-zinc-400">{opt.subtitle}</span>
                <span className="mt-1 text-xs text-zinc-500">{opt.toleranceHint}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <ActionButton onClick={goBack}>Back</ActionButton>
            <ActionButton onClick={goNext}>Continue</ActionButton>
          </div>
        </PanelCard>
      )}

      {step === 'batch' && (
        <PanelCard title="How many parts do you need?">
          <Field label="Quantity">
            <Input
              type="number"
              min="1"
              max="100000"
              value={batchQty}
              onChange={e => setBatchQty(e.target.value)}
              placeholder="1"
            />
          </Field>
          <p className="mt-2 text-xs text-zinc-500">
            Larger batches may use different tooling strategies for better cost per part.
          </p>
          <div className="mt-4 flex gap-3">
            <ActionButton onClick={goBack}>Back</ActionButton>
            <ActionButton onClick={goNext} disabled={!batchQty || parseInt(batchQty, 10) < 1}>
              Continue
            </ActionButton>
          </div>
        </PanelCard>
      )}

      {step === 'machine' && (
        <PanelCard title="Which machine should we target?">
          <Field label="Machine selection">
            <Select value={machinePreference} onChange={e => setMachinePreference(e.target.value)}>
              <option value="auto">Auto-select best available machine</option>
              <option value="cnc-lathe-small">Small CNC Lathe (up to 200mm swing)</option>
              <option value="cnc-lathe-medium">Medium CNC Lathe (up to 400mm swing)</option>
              <option value="cnc-lathe-large">Large CNC Lathe (400mm+ swing)</option>
              <option value="swiss-type">Swiss-Type (small precision parts)</option>
              <option value="mill-turn">Mill-Turn Center (complex features)</option>
            </Select>
          </Field>
          <p className="mt-2 text-xs text-zinc-500">
            "Auto-select" picks the best machine based on your part dimensions and features.
          </p>
          <div className="mt-4 flex gap-3">
            <ActionButton onClick={goBack}>Back</ActionButton>
            <ActionButton onClick={goNext}>Continue</ActionButton>
          </div>
        </PanelCard>
      )}

      {step === 'review' && (
        <PanelCard title="Review & Generate">
          <div className="flex flex-col gap-3 rounded-lg bg-zinc-800/40 p-4">
            <ReviewRow label="Material" value={material || 'Not specified'} />
            <ReviewRow label="Quality" value={QUALITY_OPTIONS.find(o => o.id === qualityTier)?.title ?? qualityTier} />
            <ReviewRow label="Quantity" value={`${batchQty} part${parseInt(batchQty, 10) === 1 ? '' : 's'}`} />
            <ReviewRow label="Machine" value={machinePreference === 'auto' ? 'Auto-selected' : machinePreference} />
          </div>
          <div className="mt-4 flex gap-3">
            <ActionButton onClick={goBack}>Back</ActionButton>
            <ActionButton onClick={handleSubmit}>
              Generate CNC Program
            </ActionButton>
          </div>
        </PanelCard>
      )}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-700/50 pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-sm font-medium text-zinc-200">{value}</span>
    </div>
  );
}
