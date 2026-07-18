/**
 * HotelEmployeeHubPage — phone-first leaf-UI surfaces for the hotel ERP backend (hotel iter10, 2026-05-27)
 *
 * Two tabs:
 *   • training — employee's per-machine-domain academy progress (G11 backend U-MACHINE-DOMAIN-ACADEMY)
 *                Calls domain_academy_report_path + domain_academy_list_assignments.
 *   • handoff  — accept/deny inbox for peer task-handoff proposals (G12 backend U-EMPLOYEE-TASK-HANDOFF)
 *                Calls handoff_list + handoff_counterparty_respond.
 *
 * Both routes close the Phase 3 leaf-UI items from HOTEL-ERP-SCOPE-ASSESSMENT-2026-05-26.md §4
 * (G11 + G12, classified as "leaf UI routes — depend on already-shipped engines").
 *
 * Same Calculator-Studio dark-HUD aesthetic per mcp-server/web/CLAUDE.md.
 * PII-free per hotel-soul: employee_id only, no full names rendered.
 */

import { useEffect, useState } from 'react';
import {
  HotelBusinessApiError,
  domainAcademyReportPath,
  domainAcademyListAssignments,
  handoffList,
  handoffCounterpartyRespond,
  type DomainPathReport,
  type HandoffRequest,
} from '../api/hotelBusiness';

type Tab = 'training' | 'handoff';

const TAB_LABEL: Record<Tab, string> = {
  training: 'Training Progress',
  handoff: 'Handoff Inbox',
};

const MACHINE_DOMAINS = [
  'mill', 'lathe', 'swiss_lathe', 'mill_turn', 'wedm', 'sinker_edm',
  'grinder', 'honing', 'carbide_polishing', 'inspection',
] as const;

const LEAN_WASTES = [
  'defect', 'overproduction', 'waiting', 'non_utilized_talent',
  'transportation', 'inventory', 'motion', 'extra_processing',
] as const;

interface Props {
  initial_employee_id?: string;
}

export default function HotelEmployeeHubPage(props: Props = {}) {
  const [tab, setTab] = useState<Tab>('training');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string>(props.initial_employee_id ?? 'EMP-001');

  return (
    <div className="hotel-emp-hub" style={{ background: '#0a0e14', color: '#e0e6ed', minHeight: '100vh', padding: '12px', fontFamily: 'monospace' }}>
      <header style={{ borderBottom: '1px solid #1f2937', paddingBottom: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <h1 style={{ fontSize: '18px', margin: 0 }}>HOTEL HUB</h1>
        <input
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          placeholder="employee_id"
          style={{ padding: '6px', background: '#1f2937', color: '#e0e6ed', border: '1px solid #374151', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', width: '140px' }}
        />
      </header>

      <nav style={{ display: 'flex', gap: '8px', marginBottom: '12px', overflowX: 'auto' }}>
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setErrorMsg(null); }}
            style={{
              padding: '8px 12px',
              background: tab === t ? '#1e3a5f' : '#1f2937',
              color: tab === t ? '#7dd3fc' : '#9ca3af',
              border: `1px solid ${tab === t ? '#3b82f6' : '#374151'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              whiteSpace: 'nowrap',
            }}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </nav>

      {errorMsg && (
        <div style={{ background: '#7f1d1d', color: '#fecaca', padding: '8px', marginBottom: '12px', borderRadius: '4px', fontSize: '12px' }}>
          {errorMsg}
        </div>
      )}

      {tab === 'training' && <TrainingPanel employee_id={employeeId} onError={setErrorMsg} />}
      {tab === 'handoff' && <HandoffPanel employee_id={employeeId} onError={setErrorMsg} />}
    </div>
  );
}

// ─── G11: Training-progress panel ───────────────────────────────────────────

function TrainingPanel({ employee_id, onError }: { employee_id: string; onError: (m: string | null) => void }) {
  const [domain, setDomain] = useState<string>('mill');
  const [report, setReport] = useState<DomainPathReport | null>(null);
  const [assignments, setAssignments] = useState<ReadonlyArray<{ id: string; course_id: string; status: string; tier: string }> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    onError(null);
    (async () => {
      try {
        const [r, a] = await Promise.all([
          domainAcademyReportPath({ employee_id, domain }),
          domainAcademyListAssignments({ employee_id, domain }),
        ]);
        if (!cancelled) {
          setReport(r.data);
          setAssignments(a.data);
        }
      } catch (e) {
        if (!cancelled) {
          onError(e instanceof HotelBusinessApiError ? `API ${e.status}: ${e.message}` : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [employee_id, domain, onError]);

  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px' }}>Machine domain:</label>
      <select
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        style={{ width: '100%', padding: '8px', background: '#1f2937', color: '#e0e6ed', border: '1px solid #374151', borderRadius: '4px', marginBottom: '12px' }}
      >
        {MACHINE_DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>

      {loading && <p style={{ fontSize: '12px', color: '#9ca3af' }}>Loading…</p>}

      {!loading && report && (
        <div style={{ background: '#111827', padding: '12px', borderRadius: '4px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>Current tier:</span>
            <strong style={{ color: '#7dd3fc' }}>{report.current_tier ?? '—'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>Next tier:</span>
            <strong style={{ color: '#a78bfa' }}>{report.next_tier ?? '(top reached)'}</strong>
          </div>
          {report.next_tier && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Cpk floor for promotion:</span>
              <strong style={{ color: report.promotion_eligible ? '#10b981' : '#f59e0b' }}>
                Cpk ≥ {report.qualification_cpk_required.toFixed(2)}
              </strong>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span>Promotion eligible:</span>
            <strong style={{ color: report.promotion_eligible ? '#10b981' : '#9ca3af' }}>
              {report.promotion_eligible ? 'YES — see manager' : 'no'}
            </strong>
          </div>

          {report.required_to_assign.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>Required for next tier:</div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px' }}>
                {report.required_to_assign.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </div>
          )}

          {report.growth_suggestions.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>Growth courses (optional):</div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#a78bfa' }}>
                {report.growth_suggestions.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </div>
          )}

          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #1f2937' }}>
            Passed: {report.passed_courses.length} courses in this domain
          </div>

          {report.rationale.map((line, i) => (
            <div key={i} style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>· {line}</div>
          ))}
        </div>
      )}

      {!loading && assignments && assignments.length > 0 && (
        <div style={{ marginTop: '12px', background: '#111827', padding: '12px', borderRadius: '4px' }}>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>All assignments ({assignments.length}):</div>
          {assignments.map((a) => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 0', borderBottom: '1px solid #1f2937' }}>
              <span>{a.course_id} ({a.tier})</span>
              <span style={{ color: a.status === 'passed' ? '#10b981' : a.status === 'failed' ? '#ef4444' : '#9ca3af' }}>
                {a.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── G12: Handoff inbox panel ───────────────────────────────────────────────

function HandoffPanel({ employee_id, onError }: { employee_id: string; onError: (m: string | null) => void }) {
  const [pending, setPending] = useState<ReadonlyArray<HandoffRequest> | null>(null);
  const [loading, setLoading] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    onError(null);
    (async () => {
      try {
        const r = await handoffList({ employee_id, status: 'proposed' });
        if (!cancelled) {
          // Only show handoffs where THIS employee is the counterparty
          const inbox = r.data.filter((h) => h.counterparty_employee_id === employee_id);
          setPending(inbox);
        }
      } catch (e) {
        if (!cancelled) onError(e instanceof HotelBusinessApiError ? `API ${e.status}: ${e.message}` : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [employee_id, refreshTick, onError]);

  async function respond(h: HandoffRequest, accept: boolean, waste?: typeof LEAN_WASTES[number]) {
    setRespondingId(h.id);
    onError(null);
    try {
      await handoffCounterpartyRespond({
        handoff_id: h.id,
        responder_employee_id: employee_id,
        accept,
        ...(waste && !accept ? { lean_waste_observed: waste } : {}),
        ...(waste && !accept ? { reason: `Lean ${waste} observed` } : {}),
      });
      setRefreshTick((n) => n + 1); // re-fetch inbox
    } catch (e) {
      onError(e instanceof HotelBusinessApiError ? `API ${e.status}: ${e.message}` : String(e));
    } finally {
      setRespondingId(null);
    }
  }

  if (loading) return <p style={{ fontSize: '12px', color: '#9ca3af' }}>Loading inbox…</p>;
  if (!pending || pending.length === 0) {
    return (
      <div style={{ background: '#111827', padding: '24px', borderRadius: '4px', textAlign: 'center', fontSize: '13px', color: '#9ca3af' }}>
        No pending handoffs.
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
        {pending.length} pending handoff{pending.length === 1 ? '' : 's'}:
      </div>
      {pending.map((h) => (
        <HandoffCard
          key={h.id}
          handoff={h}
          disabled={respondingId === h.id}
          onAccept={() => respond(h, true)}
          onReject={(waste) => respond(h, false, waste)}
        />
      ))}
    </div>
  );
}

function HandoffCard({
  handoff,
  disabled,
  onAccept,
  onReject,
}: {
  handoff: HandoffRequest;
  disabled: boolean;
  onAccept: () => void;
  onReject: (waste?: typeof LEAN_WASTES[number]) => void;
}) {
  const [wasteOpen, setWasteOpen] = useState(false);
  const sameRank = handoff.requester_rank === handoff.counterparty_rank;

  return (
    <div style={{ background: '#111827', padding: '12px', borderRadius: '4px', marginBottom: '8px', border: '1px solid #1f2937' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <strong style={{ color: '#7dd3fc' }}>{handoff.task.task_id}</strong>
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>{handoff.task.task_kind}</span>
      </div>
      <div style={{ fontSize: '12px', marginBottom: '4px' }}>
        From: <strong>{handoff.requester_employee_id}</strong> ({handoff.requester_rank})
      </div>
      <div style={{ fontSize: '12px', marginBottom: '4px' }}>
        Machine: <strong>{handoff.task.machine_serial}</strong>
        {handoff.task.remaining_minutes !== undefined && (
          <span style={{ color: '#9ca3af' }}> · ~{handoff.task.remaining_minutes} min remaining</span>
        )}
      </div>
      {handoff.reason && (
        <div style={{ fontSize: '12px', color: '#a78bfa', marginBottom: '6px' }}>Why: {handoff.reason}</div>
      )}
      {sameRank && (
        <div style={{ fontSize: '11px', color: '#10b981', marginBottom: '6px' }}>
          ⚡ Same-rank: accept will fast-path to executed (no manager step)
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
        <button
          onClick={onAccept}
          disabled={disabled}
          style={{
            flex: 1, padding: '10px', background: '#065f46', color: '#a7f3d0',
            border: '1px solid #10b981', borderRadius: '4px', cursor: disabled ? 'wait' : 'pointer', fontSize: '13px',
          }}
        >
          ACCEPT
        </button>
        <button
          onClick={() => setWasteOpen((b) => !b)}
          disabled={disabled}
          style={{
            flex: 1, padding: '10px', background: '#7f1d1d', color: '#fecaca',
            border: '1px solid #ef4444', borderRadius: '4px', cursor: disabled ? 'wait' : 'pointer', fontSize: '13px',
          }}
        >
          DENY
        </button>
      </div>

      {wasteOpen && (
        <div style={{ marginTop: '8px', background: '#1f2937', padding: '8px', borderRadius: '4px' }}>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px' }}>
            Optionally flag Lean waste behind denial (for kaizen tracking):
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
            {LEAN_WASTES.map((w) => (
              <button
                key={w}
                onClick={() => { setWasteOpen(false); onReject(w); }}
                disabled={disabled}
                style={{
                  padding: '6px', background: '#1f2937', color: '#fbbf24',
                  border: '1px solid #374151', borderRadius: '4px', cursor: disabled ? 'wait' : 'pointer',
                  fontSize: '10px', textAlign: 'left',
                }}
              >
                {w}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setWasteOpen(false); onReject(); }}
            disabled={disabled}
            style={{
              width: '100%', marginTop: '6px', padding: '6px',
              background: '#374151', color: '#9ca3af',
              border: '1px solid #4b5563', borderRadius: '4px', cursor: disabled ? 'wait' : 'pointer', fontSize: '11px',
            }}
          >
            deny without flagging
          </button>
        </div>
      )}
    </div>
  );
}
