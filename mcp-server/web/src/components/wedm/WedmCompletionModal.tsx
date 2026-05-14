/**
 * WedmCompletionModal — U-WEDM-ERP10
 *
 * Operator-facing completion flow for a WEDM job. Captures actuals
 * (cutting time, wire meters, passes, final cost), submits to
 * /api/v1/wedm-erp/job/:id/complete, and renders the invoice preview
 * including variance vs quote and any pending overage approval gate.
 */
import { useMemo, useState } from 'react';
import {
  wedmErpApi,
  type WedmJobCompleteInput,
  type WedmInvoiceResponse,
} from '../../api/wedmErp';

export interface WedmCompletionModalProps {
  open: boolean;
  onClose: () => void;
  /** Job identifier to complete (required when open) */
  jobId: string;
  /** Display-only context */
  jobName?: string;
  customer?: string;
  /** Quote reference — if provided, we prefill estimates so the operator
   *  sees baseline values side-by-side with the actuals fields. */
  quoteEstimate?: {
    estimated_time_min?: number;
    estimated_wire_m?: number;
    estimated_passes?: number;
    estimated_cost_usd?: number;
  };
  /** Invoked once the invoice is persisted (so parent can refresh list). */
  onCompleted?: (invoice: NonNullable<WedmInvoiceResponse['data']>['invoice']) => void;
}

type StageKey = 'actuals' | 'submitting' | 'preview' | 'approval' | 'done';

export function WedmCompletionModal({
  open,
  onClose,
  jobId,
  jobName,
  customer,
  quoteEstimate,
  onCompleted,
}: WedmCompletionModalProps) {
  const [stage, setStage] = useState<StageKey>('actuals');
  const [form, setForm] = useState<WedmJobCompleteInput>({
    actual_cutting_time_min: quoteEstimate?.estimated_time_min ?? 60,
    actual_wire_m: quoteEstimate?.estimated_wire_m ?? 300,
    actual_passes: quoteEstimate?.estimated_passes ?? 3,
    actual_cost_usd: quoteEstimate?.estimated_cost_usd ?? 500,
    tax_rate_pct: 0,
    machine_rate_usd_per_hr: 85,
  });
  const [approver, setApprover] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] =
    useState<NonNullable<WedmInvoiceResponse['data']>['invoice'] | null>(null);

  const update = <K extends keyof WedmJobCompleteInput>(k: K, v: WedmJobCompleteInput[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const costVariancePct = useMemo(() => {
    if (!quoteEstimate?.estimated_cost_usd) return null;
    return (
      ((form.actual_cost_usd - quoteEstimate.estimated_cost_usd) /
        quoteEstimate.estimated_cost_usd) *
      100
    );
  }, [form.actual_cost_usd, quoteEstimate?.estimated_cost_usd]);

  const submit = async () => {
    setStage('submitting');
    setError(null);
    try {
      const r = await wedmErpApi.jobComplete(jobId, {
        ...form,
        completed_at: new Date().toISOString(),
      });
      if (!r.ok || !r.data) {
        setError(r.error ?? 'Completion failed');
        setStage('actuals');
        return;
      }
      setInvoice(r.data.invoice);
      setStage(r.data.invoice.requires_overage_approval ? 'approval' : 'preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage('actuals');
    }
  };

  const approve = async () => {
    if (!invoice?.overage_approval?.request_id || !approver.trim()) return;
    setError(null);
    try {
      const r = await wedmErpApi.overageApprove(invoice.overage_approval.request_id, approver);
      if (!r.ok) {
        setError(r.error ?? 'Approval failed');
        return;
      }
      setStage('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const finish = () => {
    if (invoice) onCompleted?.(invoice);
    reset();
    onClose();
  };

  const reset = () => {
    setStage('actuals');
    setInvoice(null);
    setError(null);
    setApprover('');
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur"
      role="dialog"
      aria-modal="true"
    >
      <div className="prism-glow-emerald w-full max-w-2xl rounded-2xl border border-white/10 bg-[rgba(2,6,23,0.92)] p-6 shadow-2xl">
        <header className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-emerald-300">Complete WEDM Job</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {jobName ? `${jobName} · ` : ''}
              {customer ? `${customer} · ` : ''}
              <span className="font-mono text-slate-300">{jobId}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
          >
            Close
          </button>
        </header>

        {error && (
          <div className="mb-3 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {stage === 'actuals' || stage === 'submitting' ? (
          <ActualsForm
            form={form}
            update={update}
            estimate={quoteEstimate}
            costVariancePct={costVariancePct}
            loading={stage === 'submitting'}
            onSubmit={submit}
          />
        ) : null}

        {stage === 'approval' && invoice && (
          <ApprovalGate
            invoice={invoice}
            approver={approver}
            setApprover={setApprover}
            onApprove={approve}
          />
        )}

        {stage === 'preview' && invoice && (
          <InvoicePreview invoice={invoice} onDone={finish} />
        )}
      </div>
    </div>
  );
}

function ActualsForm({
  form,
  update,
  estimate,
  costVariancePct,
  loading,
  onSubmit,
}: {
  form: WedmJobCompleteInput;
  update: <K extends keyof WedmJobCompleteInput>(k: K, v: WedmJobCompleteInput[K]) => void;
  estimate?: WedmCompletionModalProps['quoteEstimate'];
  costVariancePct: number | null;
  loading: boolean;
  onSubmit: () => void;
}) {
  const varianceColor =
    costVariancePct == null
      ? 'text-slate-400'
      : Math.abs(costVariancePct) >= 15
        ? 'text-red-300'
        : costVariancePct >= 0
          ? 'text-amber-300'
          : 'text-emerald-300';
  return (
    <div>
      <p className="mb-3 text-xs text-slate-400">
        Enter actuals from the shop floor. Variance is computed against the quote if available.
      </p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <ActualField
          label="Cutting time (min)"
          value={form.actual_cutting_time_min}
          estimate={estimate?.estimated_time_min}
          onChange={(v) => update('actual_cutting_time_min', v)}
        />
        <ActualField
          label="Wire used (m)"
          value={form.actual_wire_m}
          estimate={estimate?.estimated_wire_m}
          onChange={(v) => update('actual_wire_m', v)}
        />
        <ActualField
          label="Passes run"
          value={form.actual_passes}
          estimate={estimate?.estimated_passes}
          step={1}
          onChange={(v) => update('actual_passes', v)}
        />
        <ActualField
          label="Final cost ($)"
          value={form.actual_cost_usd}
          estimate={estimate?.estimated_cost_usd}
          onChange={(v) => update('actual_cost_usd', v)}
        />
        <ActualField
          label="Machine rate ($/hr)"
          value={form.machine_rate_usd_per_hr ?? 85}
          onChange={(v) => update('machine_rate_usd_per_hr', v)}
        />
        <ActualField
          label="Tax rate (%)"
          value={form.tax_rate_pct ?? 0}
          step={0.1}
          onChange={(v) => update('tax_rate_pct', v)}
        />
        <label className="col-span-2 block md:col-span-4">
          <span className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">
            Completion notes
          </span>
          <textarea
            rows={2}
            value={form.completion_notes ?? ''}
            onChange={(e) => update('completion_notes', e.target.value)}
            className="w-full rounded border border-white/10 bg-slate-900/60 px-2 py-1 text-sm text-slate-100"
            placeholder="Wire-break count, dress wear, operator comments…"
          />
        </label>
      </div>

      {costVariancePct != null && (
        <p className={`mt-3 text-xs ${varianceColor}`}>
          Cost variance vs quote:{' '}
          <span className="font-semibold">
            {costVariancePct >= 0 ? '+' : ''}
            {costVariancePct.toFixed(1)}%
          </span>
          {Math.abs(costVariancePct) >= 15
            ? ' — will require customer overage approval.'
            : ' — within auto-approve threshold.'}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={onSubmit}
          className="rounded bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50"
        >
          {loading ? 'Submitting…' : 'Complete & draft invoice'}
        </button>
      </div>
    </div>
  );
}

function ActualField({
  label,
  value,
  estimate,
  step,
  onChange,
}: {
  label: string;
  value: number;
  estimate?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type="number"
        step={step ?? 0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded border border-white/10 bg-slate-900/60 px-2 py-1 text-sm text-slate-100"
      />
      {estimate != null && (
        <span className="mt-0.5 block text-[9px] text-slate-500">
          quoted: <span className="tabular-nums">{estimate}</span>
        </span>
      )}
    </label>
  );
}

function ApprovalGate({
  invoice,
  approver,
  setApprover,
  onApprove,
}: {
  invoice: NonNullable<WedmInvoiceResponse['data']>['invoice'];
  approver: string;
  setApprover: (v: string) => void;
  onApprove: () => void;
}) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <h3 className="text-sm font-semibold text-amber-300">Overage approval required</h3>
      <p className="mt-1 text-xs text-amber-200/80">
        Actual cost exceeded the quote by{' '}
        <span className="font-semibold">{invoice.cost_variance_pct.toFixed(1)}%</span>. Capture
        customer approval to finalize.
      </p>

      <InvoiceTable invoice={invoice} />

      <label className="mt-3 block">
        <span className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">
          Customer approver (email / name)
        </span>
        <input
          type="text"
          value={approver}
          onChange={(e) => setApprover(e.target.value)}
          placeholder="customer@example.com"
          className="w-full rounded border border-white/10 bg-slate-900/60 px-2 py-1 text-sm text-slate-100"
        />
      </label>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          disabled={!approver.trim()}
          onClick={onApprove}
          className="rounded bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/30 disabled:opacity-50"
        >
          Record approval
        </button>
      </div>
    </div>
  );
}

function InvoicePreview({
  invoice,
  onDone,
}: {
  invoice: NonNullable<WedmInvoiceResponse['data']>['invoice'];
  onDone: () => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-emerald-300">Invoice draft ready</h3>
        <span className="font-mono text-xs text-slate-400">{invoice.invoice_number}</span>
      </div>

      <InvoiceTable invoice={invoice} />

      {invoice.notes && invoice.notes.length > 0 && (
        <ul className="mt-3 space-y-1 text-[11px] text-slate-400">
          {invoice.notes.map((n, i) => (
            <li key={i}>• {n}</li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/30"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function InvoiceTable({
  invoice,
}: {
  invoice: NonNullable<WedmInvoiceResponse['data']>['invoice'];
}) {
  return (
    <div className="mt-3 rounded border border-white/10 bg-slate-900/60">
      <table className="w-full text-sm text-slate-200">
        <thead className="text-xs uppercase text-slate-400">
          <tr>
            <th className="px-3 py-1 text-left">Line</th>
            <th className="px-3 py-1 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((l, i) => (
            <tr key={i} className="border-t border-white/5">
              <td className="px-3 py-1">
                {l.description}
                <span className="ml-2 text-[10px] text-slate-500">({l.category})</span>
              </td>
              <td className="px-3 py-1 text-right tabular-nums">${l.amount_usd.toFixed(2)}</td>
            </tr>
          ))}
          <tr className="border-t border-white/10 font-semibold">
            <td className="px-3 py-1">Subtotal</td>
            <td className="px-3 py-1 text-right tabular-nums">
              ${invoice.subtotal_usd.toFixed(2)}
            </td>
          </tr>
          <tr className="border-t border-white/10 font-semibold text-emerald-300">
            <td className="px-3 py-1">Total</td>
            <td className="px-3 py-1 text-right tabular-nums">${invoice.total_usd.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
