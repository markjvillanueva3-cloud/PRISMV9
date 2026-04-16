import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  receivingInspect,
  receivingList,
  receivingLog,
} from '../api/client';
import { WorkspaceRecoveryScaffold } from '../components/workspace/WorkspaceRecoveryScaffold';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  Select,
  StatusPill,
} from '../components/workspace/WorkspacePrimitives';
import {
  arrayFromPayload,
  asRecord,
  errorMessage,
  firstNumber,
  firstText,
  formatDateLabel,
  formatJsonPreview,
  payloadOf,
} from './recovery/recoveryUtils';

export function ReceivingInspectionPage() {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<Record<string, unknown>[]>([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState('');
  const [receivedBy, setReceivedBy] = useState('Receiving lead');
  const [quantityReceived, setQuantityReceived] = useState('1');
  const [inspectionStatus, setInspectionStatus] = useState('accepted');
  const [notes, setNotes] = useState('');

  const loadDesk = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await receivingList();
      setReceipts(arrayFromPayload(response, ['receipts', 'items', 'records', 'purchase_orders']));
    } catch (issue) {
      setReceipts([]);
      setError(errorMessage(issue, 'The receiving inspection desk is unavailable right now.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDesk();
  }, [loadDesk]);

  useEffect(() => {
    if (!selectedReceiptId && receipts[0]) {
      setSelectedReceiptId(firstText(receipts[0], ['receipt_id', 'po_id', 'id']));
    }
  }, [receipts, selectedReceiptId]);

  async function handleReceive() {
    if (!selectedReceiptId) return;

    setActionLoading(true);
    setActionMessage(null);
    setError(null);
    try {
      const response = await receivingLog({
        receipt_id: selectedReceiptId,
        po_id: selectedReceiptId,
        received_by: receivedBy.trim() || 'Receiving lead',
        quantity_received: Number(quantityReceived) || 1,
        notes: notes.trim() || undefined,
      });
      const payload = asRecord(payloadOf(response)) ?? asRecord(response);
      setActionMessage(firstText(payload ?? {}, ['message', 'summary']) || `Logged receipt ${selectedReceiptId}.`);
      await loadDesk();
    } catch (issue) {
      setError(errorMessage(issue, 'Unable to log the receiving event.'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleInspect() {
    if (!selectedReceiptId) return;

    setActionLoading(true);
    setActionMessage(null);
    setError(null);
    try {
      const response = await receivingInspect({
        receipt_id: selectedReceiptId,
        po_id: selectedReceiptId,
        status: inspectionStatus,
        disposition: inspectionStatus,
        inspected_by: receivedBy.trim() || 'Receiving lead',
        notes: notes.trim() || undefined,
      });
      const payload = asRecord(payloadOf(response)) ?? asRecord(response);
      setActionMessage(firstText(payload ?? {}, ['message', 'summary']) || `Inspection posted for ${selectedReceiptId}.`);
      await loadDesk();
    } catch (issue) {
      setError(errorMessage(issue, 'Unable to post the receiving inspection result.'));
    } finally {
      setActionLoading(false);
    }
  }

  const pendingReceipts = receipts.filter((entry) => {
    const status = firstText(entry, ['status', 'inspection_status', 'receipt_status']).toLowerCase();
    return !status || status.includes('pending') || status.includes('open');
  }).length;

  const totalQuantity = receipts.reduce((sum, entry) => sum + (firstNumber(entry, ['quantity', 'qty', 'quantity_received']) ?? 0), 0);

  const metrics = useMemo(() => ([
    {
      label: 'Receiving Queue',
      value: String(receipts.length),
      hint: `${pendingReceipts} pending receipts`,
      accent: 'from-cyan-400/22 via-cyan-300/10 to-transparent',
    },
    {
      label: 'Reported Quantity',
      value: totalQuantity.toLocaleString(),
      hint: 'Mounted quantity signal',
      accent: 'from-emerald-400/22 via-emerald-300/10 to-transparent',
    },
    {
      label: 'Inspection Target',
      value: selectedReceiptId || 'None',
      hint: inspectionStatus,
      accent: 'from-amber-400/22 via-amber-300/10 to-transparent',
    },
  ]), [inspectionStatus, pendingReceipts, receipts.length, selectedReceiptId, totalQuantity]);

  const aiContext = useMemo(() => ({
    workspace: 'receiving-inspection',
    appw_stage: 'APPW-MS0 inventory intake',
    receipts,
    selected_receipt_id: selectedReceiptId,
    inspection_status: inspectionStatus,
  }), [inspectionStatus, receipts, selectedReceiptId]);

  return (
    <WorkspaceRecoveryScaffold
      eyebrow="Inventory intake"
      title="Receiving Inspection"
      description="The receiving lane is restored as an APPW intake desk with mounted receipt data, posting actions for receiving and inspection, and PRISM AI to explain urgency and risk."
      surfaces={['inventoryOperations', 'commerce']}
      metrics={metrics}
      aiSummary="PRISM AI can prioritize which receipts to inspect first, explain intake risk, and translate the receiving queue into immediate floor actions."
      aiContext={aiContext}
      suggestions={[
        {
          id: 'receiving-priority',
          label: 'Rank the intake queue',
          query: 'Rank the current receiving queue by operational risk, inspection urgency, and downstream schedule impact.',
        },
        {
          id: 'receiving-risk',
          label: 'Explain the receiving risk',
          query: 'What is the biggest risk in the current receiving and inspection posture, and what should happen next?',
        },
      ]}
    >
      <PanelCard title="Receiving posture" subtitle="Mounted against the receiving list, receiving log, and receiving inspection routes.">
        <div className="flex flex-wrap gap-3">
          <ActionButton onClick={() => void loadDesk()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh desk'}
          </ActionButton>
          <StatusPill label={loading ? 'Loading' : 'Mounted'} tone={loading ? 'amber' : 'emerald'} />
          <StatusPill label={`Pending ${pendingReceipts}`} tone={pendingReceipts > 0 ? 'amber' : 'sky'} />
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-300/18 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="mt-4 rounded-2xl border border-emerald-300/18 bg-emerald-300/[0.08] px-4 py-3 text-sm text-emerald-100">
            {actionMessage}
          </div>
        ) : null}
      </PanelCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <PanelCard title="Receiving queue" subtitle="Mounted receipts and purchase-order intake awaiting action.">
          <div className="space-y-3">
            {receipts.length > 0 ? receipts.slice(0, 8).map((entry, index) => (
              <div key={`${firstText(entry, ['receipt_id', 'po_id', 'id'])}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold text-slate-100">
                    {firstText(entry, ['vendor_name', 'po_id', 'receipt_id']) || `Receipt ${index + 1}`}
                  </div>
                  <StatusPill label={firstText(entry, ['status', 'inspection_status']) || 'open'} tone="amber" />
                </div>
                <div className="mt-1 text-slate-400">
                  ETA {formatDateLabel(entry.expected_date ?? entry.received_date)} | Qty {(firstNumber(entry, ['quantity', 'qty', 'quantity_received']) ?? 0).toLocaleString()}
                </div>
                <div className="mt-2 text-xs text-slate-500">{formatJsonPreview(entry)}</div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
                No receiving records are currently mounted.
              </div>
            )}
          </div>
        </PanelCard>

        <PanelCard title="Post receipt or inspection" subtitle="Quick action lane for the selected receipt.">
          <div className="space-y-4">
            <Field label="Receipt">
              <Select value={selectedReceiptId} onChange={(event) => setSelectedReceiptId(event.target.value)}>
                {receipts.length > 0 ? receipts.map((entry, index) => {
                  const value = firstText(entry, ['receipt_id', 'po_id', 'id']) || `receipt-${index}`;
                  const label = firstText(entry, ['vendor_name', 'po_id', 'receipt_id']) || value;
                  return <option key={value} value={value}>{label}</option>;
                }) : <option value="">No receipts available</option>}
              </Select>
            </Field>
            <Field label="Received By">
              <Input value={receivedBy} onChange={(event) => setReceivedBy(event.target.value)} />
            </Field>
            <Field label="Quantity Received">
              <Input value={quantityReceived} onChange={(event) => setQuantityReceived(event.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Inspection Status">
              <Select value={inspectionStatus} onChange={(event) => setInspectionStatus(event.target.value)}>
                <option value="accepted">Accepted</option>
                <option value="hold">Hold</option>
                <option value="rejected">Rejected</option>
              </Select>
            </Field>
            <Field label="Notes">
              <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Condition, paperwork, packaging, or lot notes" />
            </Field>
            <div className="flex flex-wrap gap-3">
              <ActionButton onClick={() => void handleReceive()} disabled={actionLoading || !selectedReceiptId} tone="amber">
                {actionLoading ? 'Posting...' : 'Log receipt'}
              </ActionButton>
              <ActionButton onClick={() => void handleInspect()} disabled={actionLoading || !selectedReceiptId} tone="emerald">
                {actionLoading ? 'Posting...' : 'Post inspection'}
              </ActionButton>
            </div>
          </div>
        </PanelCard>
      </div>
    </WorkspaceRecoveryScaffold>
  );
}

export default ReceivingInspectionPage;
