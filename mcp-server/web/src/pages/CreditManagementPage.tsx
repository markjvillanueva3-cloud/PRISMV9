import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  creditReviewAll,
  customerCreditCheck,
  customerPipeline,
} from '../api/client';
import { WorkspaceRecoveryScaffold } from '../components/workspace/WorkspaceRecoveryScaffold';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  StatusPill,
} from '../components/workspace/WorkspacePrimitives';
import {
  arrayFromPayload,
  asRecord,
  errorMessage,
  firstNumber,
  firstText,
  formatJsonPreview,
  formatMoney,
  payloadOf,
} from './recovery/recoveryUtils';

export function CreditManagementPage() {
  const [customerId, setCustomerId] = useState('CUST-1001');
  const [orderAmount, setOrderAmount] = useState('25000');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Record<string, unknown>[]>([]);
  const [pipeline, setPipeline] = useState<Record<string, unknown>[]>([]);
  const [creditCheckResult, setCreditCheckResult] = useState<Record<string, unknown> | null>(null);

  const loadDesk = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reviewResponse, pipelineResponse] = await Promise.all([
        creditReviewAll(),
        customerPipeline(),
      ]);
      setReviews(arrayFromPayload(reviewResponse, ['reviews', 'items', 'records', 'customers']));
      setPipeline(arrayFromPayload(pipelineResponse, ['pipeline', 'items', 'records', 'customers']));
    } catch (issue) {
      setReviews([]);
      setPipeline([]);
      setError(errorMessage(issue, 'The credit management desk is unavailable right now.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDesk();
  }, [loadDesk]);

  async function handleCreditCheck() {
    if (!customerId.trim()) return;

    setChecking(true);
    setError(null);
    try {
      const response = await customerCreditCheck({
        customer_id: customerId.trim(),
        order_amount: Number(orderAmount) || 0,
      });
      setCreditCheckResult(asRecord(payloadOf(response)) ?? asRecord(response));
    } catch (issue) {
      setCreditCheckResult(null);
      setError(errorMessage(issue, 'Unable to run the customer credit check.'));
    } finally {
      setChecking(false);
    }
  }

  const atRiskCount = reviews.filter((entry) => {
    // Prefer the engine's authoritative `risk` tier (at_risk | over_limit | on_hold | ok) -- read it FIRST,
    // since the customer `status` ('active') would otherwise shadow it and under-count over-limit accounts.
    const risk = firstText(entry, ['risk', 'credit_status']).toLowerCase();
    if (risk) return risk === 'at_risk' || risk === 'over_limit' || risk === 'on_hold';
    // Legacy fallback for any payload without a `risk` field.
    const status = firstText(entry, ['status']).toLowerCase();
    return status.includes('hold') || status.includes('risk') || status.includes('past');
  }).length;
  const pipelineValue = pipeline.reduce((sum, entry) => sum + (firstNumber(entry, ['value', 'amount', 'quote_amount']) ?? 0), 0);

  const metrics = useMemo(() => ([
    {
      label: 'Credit Reviews',
      value: String(reviews.length),
      hint: `${atRiskCount} at-risk accounts`,
      accent: 'from-amber-400/22 via-amber-300/10 to-transparent',
    },
    {
      label: 'Pipeline Value',
      value: formatMoney(pipelineValue),
      hint: `${pipeline.length} customer opportunities`,
      accent: 'from-emerald-400/22 via-emerald-300/10 to-transparent',
    },
    {
      label: 'Check Target',
      value: customerId,
      hint: `Order ${formatMoney(Number(orderAmount) || 0)}`,
      accent: 'from-cyan-400/22 via-cyan-300/10 to-transparent',
    },
  ]), [atRiskCount, customerId, orderAmount, pipeline.length, pipelineValue, reviews.length]);

  const aiContext = useMemo(() => ({
    workspace: 'credit-management',
    appw_stage: 'APPW-MS0 commerce control',
    customer_id: customerId,
    order_amount: Number(orderAmount) || 0,
    reviews,
    pipeline,
    credit_check_result: creditCheckResult,
  }), [creditCheckResult, customerId, orderAmount, pipeline, reviews]);

  return (
    <WorkspaceRecoveryScaffold
      eyebrow="Commerce controls"
      title="Credit Management"
      description="The APPW credit desk is restored on a live scaffold so leadership can read customer credit posture, compare it to pipeline exposure, and use Kienzle AI to make safer release decisions."
      surfaces={['commerce']}
      metrics={metrics}
      aiSummary="Kienzle AI can explain the current credit posture, flag customer release risk, and recommend whether a quoted order should proceed."
      aiContext={aiContext}
      suggestions={[
        {
          id: 'credit-brief',
          label: 'Summarize credit posture',
          query: 'Summarize the current customer credit posture and identify which accounts should be watched most closely.',
        },
        {
          id: 'release-decision',
          label: 'Recommend a release decision',
          query: `Based on the current credit posture and the ${formatMoney(Number(orderAmount) || 0)} order, should ${customerId} be released, reviewed, or held?`,
        },
      ]}
    >
      <PanelCard title="Credit posture" subtitle="Mounted against customer credit review, pipeline, and credit-check routes.">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Field label="Customer ID">
            <Input value={customerId} onChange={(event) => setCustomerId(event.target.value)} />
          </Field>
          <Field label="Order Amount">
            <Input value={orderAmount} onChange={(event) => setOrderAmount(event.target.value)} inputMode="decimal" />
          </Field>
          <div className="flex items-end gap-3">
            <ActionButton onClick={() => void loadDesk()} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh desk'}
            </ActionButton>
            <ActionButton onClick={() => void handleCreditCheck()} disabled={checking || !customerId.trim()} tone="amber">
              {checking ? 'Checking...' : 'Run credit check'}
            </ActionButton>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill label={loading ? 'Loading' : 'Mounted'} tone={loading ? 'amber' : 'emerald'} />
          <StatusPill label={`At risk ${atRiskCount}`} tone={atRiskCount > 0 ? 'amber' : 'sky'} />
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-300/18 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </PanelCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <PanelCard title="Credit review queue" subtitle="Mounted customer credit records.">
          <div className="space-y-3">
            {reviews.length > 0 ? reviews.slice(0, 8).map((entry, index) => (
              <div key={`${firstText(entry, ['customer_id', 'customer_name', 'id'])}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold text-slate-100">{firstText(entry, ['customer_name', 'customer_id']) || `Customer ${index + 1}`}</div>
                  <StatusPill label={firstText(entry, ['status', 'risk', 'credit_status']) || 'review'} tone="amber" />
                </div>
                <div className="mt-1 text-slate-400">{formatJsonPreview(entry)}</div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
                No customer credit review records are currently mounted.
              </div>
            )}
          </div>
        </PanelCard>

        <PanelCard title="Decision support" subtitle="Pipeline exposure and the most recent credit check result.">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
              <div className="font-semibold text-slate-100">Credit check result</div>
              <div className="mt-2 text-slate-400">
                {creditCheckResult ? formatJsonPreview(creditCheckResult) : 'No credit check result is mounted for the current customer.'}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
              <div className="font-semibold text-slate-100">Customer pipeline preview</div>
              <div className="mt-1 text-slate-400">{pipeline.length} pipeline rows | total {formatMoney(pipelineValue)}</div>
              <div className="mt-2 text-xs text-slate-500">
                {pipeline.length > 0 ? formatJsonPreview(pipeline[0]) : 'No pipeline preview available.'}
              </div>
            </div>
          </div>
        </PanelCard>
      </div>
    </WorkspaceRecoveryScaffold>
  );
}

export default CreditManagementPage;
