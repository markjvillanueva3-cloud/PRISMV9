/**
 * BIZ-MS4 U-BIZ28: RFQ Inbox
 * Receive RFQs, parse PDFs, assign estimators, track deadlines.
 */
import { useCallback, useEffect, useState } from 'react';
import { rfqList, rfqAssign, rfqUpdateStatus, listEmployees } from '../api/client';
import { ActionButton, Field, PanelCard, Select, StatusPill, SummaryTile, WorkspaceHero } from '../components/workspace/WorkspacePrimitives';
import type { Employee } from '../api/types';

interface RFQ {
  rfq_id: string;
  customer: string;
  material?: string;
  quantity?: number;
  process_type?: string;
  received_date: string;
  deadline?: string;
  assignee_id?: string;
  assignee_name?: string;
  status: 'received' | 'reviewing' | 'quoted' | 'won' | 'lost';
}

const statusTone: Record<string, 'slate' | 'sky' | 'emerald' | 'amber' | 'rose'> = {
  received: 'slate', reviewing: 'sky', quoted: 'amber', won: 'emerald', lost: 'rose',
};

function daysUntil(deadline?: string): { text: string; urgent: boolean; critical: boolean } {
  if (!deadline) return { text: 'No deadline', urgent: false, critical: false };
  const ms = new Date(deadline).getTime() - Date.now();
  const hrs = Math.max(0, Math.floor(ms / 3600000));
  if (hrs < 12) return { text: `${hrs}h remaining`, urgent: true, critical: true };
  if (hrs < 48) return { text: `${hrs}h remaining`, urgent: true, critical: false };
  const days = Math.floor(hrs / 24);
  return { text: `${days}d remaining`, urgent: false, critical: false };
}

export function RFQInboxPage() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRFQs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await rfqList(statusFilter ? { status: statusFilter } : undefined);
      setRfqs(((res as any).data ?? (res as any).result ?? []) as RFQ[]);
    } catch { setRfqs([]); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { void fetchRFQs(); }, [fetchRFQs]);
  useEffect(() => {
    listEmployees().then((r) => setEmployees(((r.result as any)?.employees ?? []) as Employee[])).catch(() => {});
  }, []);

  const handleAssign = async (rfqId: string, assigneeId: string) => {
    await rfqAssign(rfqId, assigneeId);
    void fetchRFQs();
  };

  const handleStatusChange = async (rfqId: string, status: string) => {
    await rfqUpdateStatus(rfqId, status);
    void fetchRFQs();
  };

  const pending = rfqs.filter(r => r.status === 'received').length;
  const reviewing = rfqs.filter(r => r.status === 'reviewing').length;

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Sales intake"
        title="RFQ Inbox"
        description="Incoming requests for quote. Parse, assign, and track response deadlines."
        metrics={<>
          <SummaryTile label="Pending" value={String(pending)} hint="RFQs awaiting review." accent="from-amber-400/22 via-amber-300/10 to-transparent" />
          <SummaryTile label="In Review" value={String(reviewing)} hint="RFQs being quoted." accent="from-sky-400/22 via-sky-300/10 to-transparent" />
          <SummaryTile label="Total" value={String(rfqs.length)} hint="All RFQs in system." />
        </>}
        aside={
          <Field label="Filter by status">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              <option value="received">Received</option>
              <option value="reviewing">Reviewing</option>
              <option value="quoted">Quoted</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </Select>
          </Field>
        }
      />
      <PanelCard title="RFQ Queue" subtitle="All incoming requests for quote.">
        {loading ? <div className="text-sm text-slate-400">Loading...</div> : rfqs.length === 0 ? (
          <div className="text-sm text-slate-400">No RFQs found.</div>
        ) : (
          <div className="space-y-3">
            {rfqs.map((rfq) => {
              const dl = daysUntil(rfq.deadline);
              return (
                <div key={rfq.rfq_id} className="rounded-[18px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-slate-100">{rfq.rfq_id}</span>
                        <StatusPill label={rfq.status} tone={statusTone[rfq.status] ?? 'slate'} />
                      </div>
                      <div className="mt-1 text-sm text-slate-400">{rfq.customer} — {rfq.material ?? 'TBD'} — Qty: {rfq.quantity ?? '?'}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${dl.critical ? 'text-red-400' : dl.urgent ? 'text-amber-400' : 'text-slate-400'}`}>{dl.text}</div>
                      <div className="mt-1 text-xs text-slate-500">{rfq.received_date}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Select value={rfq.assignee_id ?? ''} onChange={(e) => void handleAssign(rfq.rfq_id, e.target.value)} style={{ maxWidth: 180, height: 36, fontSize: 12 }}>
                      <option value="">Assign estimator</option>
                      {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>)}
                    </Select>
                    {rfq.status === 'received' && <ActionButton onClick={() => void handleStatusChange(rfq.rfq_id, 'reviewing')} tone="sky">Start Review</ActionButton>}
                    {rfq.status === 'reviewing' && <ActionButton onClick={() => void handleStatusChange(rfq.rfq_id, 'quoted')} tone="emerald">Mark Quoted</ActionButton>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PanelCard>
    </div>
  );
}

export default RFQInboxPage;
