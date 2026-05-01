/**
 * WEDM-ERP-MS0 / U-WEDM-ERP10 — WedmCompletionModal
 *
 * Modal for recording actual WEDM job metrics at completion. Operator enters
 * actual cutting time, wire consumption, pass count, and optional notes.
 * Shows live variance-vs-estimate preview, optional "Generate invoice"
 * toggle, and posts to /erp/wedm/job/:id/complete.
 *
 * Self-contained — parent passes jobId + estimates + open/close handlers.
 * On success, parent receives the invoice payload and is expected to close
 * the modal + refresh the dispatch board.
 */
import { useCallback, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { wedmErpApi, type WedmInvoiceResponse } from '../../api/wedmErp';

export interface WedmCompletionEstimates {
  estimated_cutting_time_min: number;
  estimated_wire_m: number;
  estimated_passes: number;
  estimated_cost_usd: number;
  machine_rate_usd_per_hr?: number;
  wire_cost_usd_per_m?: number;
}

export interface WedmCompletionModalProps {
  jobId: string;
  jobLabel?: string;   // e.g. "WEDM-0042 · Die cavity insert"
  estimates: WedmCompletionEstimates;
  open: boolean;
  onClose: () => void;
  onCompleted?: (invoice: NonNullable<WedmInvoiceResponse['data']>['invoice']) => void;
}

interface FormState {
  actual_cutting_time_min: string;
  actual_wire_m: string;
  actual_passes: string;
  completion_notes: string;
  machine_rate_usd_per_hr: string;
  generate_invoice: boolean;
}

function initialForm(est: WedmCompletionEstimates): FormState {
  return {
    actual_cutting_time_min: '',
    actual_wire_m: '',
    actual_passes: String(est.estimated_passes),
    completion_notes: '',
    machine_rate_usd_per_hr: est.machine_rate_usd_per_hr
      ? String(est.machine_rate_usd_per_hr)
      : '',
    generate_invoice: true,
  };
}

function parseNum(v: string): number | null {
  const s = v.trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function varianceTone(pct: number | null): 'good' | 'warn' | 'bad' | 'neutral' {
  if (pct === null) return 'neutral';
  const abs = Math.abs(pct);
  if (abs <= 5) return 'good';
  if (abs <= 15) return 'warn';
  return 'bad';
}

const TONE_CLASS: Record<'good' | 'warn' | 'bad' | 'neutral', string> = {
  good:    'text-emerald-300',
  warn:    'text-amber-300',
  bad:     'text-red-300',
  neutral: 'text-slate-400',
};

function pct(actual: number | null, estimate: number): number | null {
  if (actual === null || estimate === 0) return null;
  return ((actual - estimate) / estimate) * 100;
}

function deriveActualCost(
  timeMin: number,
  wireM: number,
  machineRate: number,
  wireCost: number,
): number {
  return (timeMin / 60) * machineRate + wireM * wireCost;
}

export function WedmCompletionModal({
  jobId,
  jobLabel,
  estimates,
  open,
  onClose,
  onCompleted,
}: WedmCompletionModalProps) {
  const [form, setForm] = useState<FormState>(() => initialForm(estimates));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successInvoice, setSuccessInvoice] =
    useState<NonNullable<WedmInvoiceResponse['data']>['invoice'] | null>(null);

  const timeMin = parseNum(form.actual_cutting_time_min);
  const wireM = parseNum(form.actual_wire_m);
  const passes = parseNum(form.actual_passes);
  const rateOverride = parseNum(form.machine_rate_usd_per_hr);

  const machineRate =
    rateOverride ?? estimates.machine_rate_usd_per_hr ?? 85;
  const wireCostPerM = estimates.wire_cost_usd_per_m ?? 0.15;

  const actualCost = useMemo(() => {
    if (timeMin === null || wireM === null) return null;
    return deriveActualCost(timeMin, wireM, machineRate, wireCostPerM);
  }, [timeMin, wireM, machineRate, wireCostPerM]);

  const timePct = pct(timeMin, estimates.estimated_cutting_time_min);
  const wirePct = pct(wireM, estimates.estimated_wire_m);
  const costPct = pct(actualCost, estimates.estimated_cost_usd);
  const passPct = pct(passes, estimates.estimated_passes);

  const validationErrors: string[] = [];
  if (timeMin !== null && timeMin <= 0) validationErrors.push('Cutting time must be positive');
  if (wireM !== null && wireM <= 0) validationErrors.push('Wire consumption must be positive');
  if (passes !== null && passes <= 0) validationErrors.push('Pass count must be positive');
  if (rateOverride !== null && rateOverride <= 0)
    validationErrors.push('Machine rate override must be positive');

  const canSubmit =
    timeMin !== null &&
    wireM !== null &&
    passes !== null &&
    validationErrors.length === 0 &&
    !submitting &&
    !successInvoice;

  const setField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
      setSubmitError(null);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!canSubmit || timeMin === null || wireM === null || passes === null || actualCost === null) {
        return;
      }

      setSubmitting(true);
      setSubmitError(null);

      try {
        const response = await wedmErpApi.jobComplete(jobId, {
          actual_cutting_time_min: timeMin,
          actual_wire_m: wireM,
          actual_passes: passes,
          actual_cost_usd: actualCost,
          completion_notes: form.completion_notes.trim() || undefined,
          machine_rate_usd_per_hr: rateOverride ?? undefined,
        });

        if (!response.ok || !response.data) {
          setSubmitError(response.error ?? 'Completion request returned ok=false');
          return;
        }

        const invoice = response.data.invoice;

        if (form.generate_invoice) {
          setSuccessInvoice(invoice);
          onCompleted?.(invoice);
        } else {
          // Caller opted out of invoice display — close immediately.
          onCompleted?.(invoice);
          onClose();
        }
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : String(err));
      } finally {
        setSubmitting(false);
      }
    },
    [
      canSubmit,
      timeMin,
      wireM,
      passes,
      actualCost,
      rateOverride,
      form.completion_notes,
      form.generate_invoice,
      jobId,
      onCompleted,
      onClose,
    ],
  );

  if (!open) return null;

  return (
    <div
      data-testid="wedm-completion-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wedm-completion-title"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[rgba(2,6,23,0.95)] p-6 text-slate-100 shadow-[0_0_80px_-20px_rgba(167,139,250,0.6)] prism-glow-violet">
        <header className="mb-4 flex items-start justify-between">
          <div>
            <h2 id="wedm-completion-title" className="text-lg font-semibold">
              Record WEDM job completion
            </h2>
            <p className="mt-1 font-mono text-xs text-slate-400" data-testid="wedm-completion-label">
              {jobLabel ?? jobId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-white/5"
            data-testid="wedm-completion-close"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        {successInvoice ? (
          <SuccessState
            invoice={successInvoice}
            onClose={onClose}
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input grid */}
            <div className="grid grid-cols-2 gap-3">
              <FieldNumber
                label="Cutting time (min)"
                value={form.actual_cutting_time_min}
                onChange={(v) => setField('actual_cutting_time_min', v)}
                placeholder={String(estimates.estimated_cutting_time_min)}
                testId="wedm-completion-time"
                est={`${estimates.estimated_cutting_time_min}m est`}
              />
              <FieldNumber
                label="Wire consumed (m)"
                value={form.actual_wire_m}
                onChange={(v) => setField('actual_wire_m', v)}
                placeholder={String(estimates.estimated_wire_m)}
                testId="wedm-completion-wire"
                est={`${estimates.estimated_wire_m}m est`}
              />
              <FieldNumber
                label="Passes"
                value={form.actual_passes}
                onChange={(v) => setField('actual_passes', v)}
                placeholder={String(estimates.estimated_passes)}
                testId="wedm-completion-passes"
                est={`${estimates.estimated_passes} est`}
              />
              <FieldNumber
                label="Machine rate override ($/hr)"
                value={form.machine_rate_usd_per_hr}
                onChange={(v) => setField('machine_rate_usd_per_hr', v)}
                placeholder={machineRate.toString()}
                testId="wedm-completion-rate"
                est="optional"
                optional
              />
            </div>

            {/* Variance preview */}
            <div className="rounded-xl border border-white/5 bg-black/30 p-3">
              <h3 className="mb-2 text-[0.65rem] uppercase tracking-wider text-slate-400">
                Variance vs estimate
              </h3>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs" data-testid="wedm-completion-variance">
                <VarianceRow label="Time"    pct={timePct}  testId="wedm-variance-time"    />
                <VarianceRow label="Wire"    pct={wirePct}  testId="wedm-variance-wire"    />
                <VarianceRow label="Passes"  pct={passPct}  testId="wedm-variance-passes"  />
                <VarianceRow label="Cost"    pct={costPct}  testId="wedm-variance-cost"    />
              </div>
              {actualCost !== null && (
                <div className="mt-2 flex justify-between border-t border-white/5 pt-2 font-mono text-xs">
                  <span className="text-slate-500">Actual cost (derived)</span>
                  <span className="text-slate-100" data-testid="wedm-completion-actual-cost">
                    ${actualCost.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[0.65rem] uppercase tracking-wider text-slate-400">
                Operator notes (optional, captures tribal knowledge)
              </label>
              <textarea
                value={form.completion_notes}
                onChange={(e) => setField('completion_notes', e.target.value)}
                rows={2}
                className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:border-violet-400/50 focus:outline-none"
                placeholder="Wire broke twice at corner B — dropped feed 15% for rest of pass"
                data-testid="wedm-completion-notes"
              />
            </div>

            {/* Invoice toggle */}
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2">
              <input
                type="checkbox"
                checked={form.generate_invoice}
                onChange={(e) => setField('generate_invoice', e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-black/40 accent-emerald-400"
                data-testid="wedm-completion-invoice-toggle"
              />
              <div>
                <div className="text-xs font-semibold text-slate-200">Show invoice preview</div>
                <div className="font-mono text-[0.65rem] text-slate-500">
                  Invoice is always generated; this controls whether the preview appears after completion.
                </div>
              </div>
            </label>

            {/* Validation errors */}
            {validationErrors.length > 0 && (
              <ul
                className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
                data-testid="wedm-completion-errors"
              >
                {validationErrors.map((e, i) => (
                  <li key={i}>• {e}</li>
                ))}
              </ul>
            )}

            {/* Submit error */}
            {submitError && (
              <div
                className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200"
                data-testid="wedm-completion-submit-error"
              >
                {submitError}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5"
                data-testid="wedm-completion-cancel"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                data-testid="wedm-completion-submit"
              >
                {submitting ? 'Submitting…' : 'Complete job'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  // inline helpers
  function VarianceRow({
    label,
    pct,
    testId,
  }: {
    label: string;
    pct: number | null;
    testId: string;
  }) {
    const tone = varianceTone(pct);
    return (
      <div className="flex items-center justify-between" data-testid={testId}>
        <span className="text-slate-500">{label}</span>
        <span className={TONE_CLASS[tone]}>
          {pct === null ? '—' : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`}
        </span>
      </div>
    );
  }
}

// ─── Field helpers ──────────────────────────────────────────────────────────

function FieldNumber({
  label,
  value,
  onChange,
  placeholder,
  testId,
  est,
  optional,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  testId: string;
  est: string;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="text-[0.65rem] uppercase tracking-wider text-slate-400">
          {label}
          {!optional && <span className="ml-1 text-red-400">*</span>}
        </span>
        <span className="font-mono text-[0.6rem] text-slate-500">{est}</span>
      </div>
      <input
        type="number"
        step="any"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:border-violet-400/50 focus:outline-none"
        data-testid={testId}
      />
    </label>
  );
}

// ─── Success state ──────────────────────────────────────────────────────────

function SuccessState({
  invoice,
  onClose,
}: {
  invoice: NonNullable<WedmInvoiceResponse['data']>['invoice'];
  onClose: () => void;
}) {
  return (
    <div data-testid="wedm-completion-success" className="space-y-3">
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
        <div className="font-semibold">Job completed</div>
        <div className="mt-0.5 font-mono text-[0.7rem] text-emerald-300/80">
          Invoice {invoice.invoice_number} · ${invoice.total_usd.toFixed(2)}
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-black/30 p-3">
        <h3 className="mb-2 text-[0.65rem] uppercase tracking-wider text-slate-400">
          Line items
        </h3>
        <ul className="space-y-1 font-mono text-xs" data-testid="wedm-success-lines">
          {invoice.lines.map((ln, i) => (
            <li key={i} className="flex justify-between">
              <span className="text-slate-300">{ln.description}</span>
              <span className="text-slate-100">${ln.amount_usd.toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t border-white/5 pt-2 font-mono text-xs">
          <span className="text-slate-500">Subtotal</span>
          <span className="text-slate-100">${invoice.subtotal_usd.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-mono text-xs">
          <span className="text-slate-500">Total</span>
          <span className="text-slate-100">${invoice.total_usd.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-mono text-xs">
          <span className="text-slate-500">Cost variance</span>
          <span
            className={
              Math.abs(invoice.cost_variance_pct) <= 5
                ? 'text-emerald-300'
                : Math.abs(invoice.cost_variance_pct) <= 15
                  ? 'text-amber-300'
                  : 'text-red-300'
            }
            data-testid="wedm-success-variance"
          >
            {invoice.cost_variance_pct >= 0 ? '+' : ''}
            {invoice.cost_variance_pct.toFixed(1)}%
          </span>
        </div>
        {invoice.requires_overage_approval && (
          <div
            className="mt-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-[0.65rem] text-amber-200"
            data-testid="wedm-success-overage"
          >
            ⚠ Requires overage approval — request {invoice.overage_approval?.request_id}
          </div>
        )}
      </div>

      {invoice.notes && invoice.notes.length > 0 && (
        <ul
          className="rounded-xl border border-white/5 bg-black/20 px-3 py-2 font-mono text-[0.7rem] text-slate-400"
          data-testid="wedm-success-notes"
        >
          {invoice.notes.map((n, i) => (
            <li key={i}>• {n}</li>
          ))}
        </ul>
      )}

      <div className="flex justify-end border-t border-white/5 pt-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/30"
          data-testid="wedm-success-close"
        >
          Done
        </button>
      </div>
    </div>
  );
}
