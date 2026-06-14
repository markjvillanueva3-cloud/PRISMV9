import { useMemo, useState } from 'react';
import { callIntegrationRoute, OrphanRouteError } from '../api/orphanRoutes';

type IntegrationAction = {
  id: 'cam' | 'dnc' | 'erp' | 'mobile' | 'measurement' | 'e2_sync' | 'qbo_invoices' | 'qbo_payments' | 'qbo_reconcile';
  label: string;
  detail: string;
};

type IntegrationRun = {
  action: IntegrationAction;
  result: unknown;
  capturedAt: string;
};

const INTEGRATION_ACTIONS: readonly IntegrationAction[] = [
  { id: 'cam', label: 'CAM Recommendation', detail: 'Recommend CAM flow or package posture for the current job context.' },
  { id: 'dnc', label: 'DNC Package', detail: 'Generate DNC-ready program handoff posture.' },
  { id: 'erp', label: 'ERP Work Order Import', detail: 'Push or simulate work-order import into the ERP lane.' },
  { id: 'mobile', label: 'Mobile Lookup', detail: 'Surface mobile-first lookup posture for operators and field users.' },
  { id: 'measurement', label: 'Measurement Import', detail: 'Pull measurement or CMM payloads into the quality lane.' },
  { id: 'e2_sync', label: 'E2 Shop System Sync', detail: 'Bidirectional sync with E2 MRP: jobs, employees, time entries, invoices.' },
  { id: 'qbo_invoices', label: 'QBO Sync Invoices', detail: 'Push approved PRISM invoices to QuickBooks Online.' },
  { id: 'qbo_payments', label: 'QBO Sync Payments', detail: 'Pull payments from QuickBooks Online and mark PRISM invoices paid.' },
  { id: 'qbo_reconcile', label: 'QBO GL Reconcile', detail: 'Compare PRISM GL totals with QuickBooks trial balance and report discrepancies.' },
] as const;

function formatTimestamp(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

export function IntegrationsPage() {
  const [jobId, setJobId] = useState('JOB-2401');
  const [controller, setController] = useState('Fanuc 31i');
  const [camSystem, setCamSystem] = useState('Fusion 360');
  const [erpReference, setErpReference] = useState('WO-7719');
  const [mobileQuery, setMobileQuery] = useState('Find the latest hot jobs for turning.');
  const [measurementPacket, setMeasurementPacket] = useState('cmm-run-2026-03-28-part-17');
  const [runs, setRuns] = useState<IntegrationRun[]>([]);
  const [activeActionId, setActiveActionId] = useState<IntegrationAction['id'] | null>(null);
  const [busyActionId, setBusyActionId] = useState<IntegrationAction['id'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeAction = useMemo(
    () => INTEGRATION_ACTIONS.find((action) => action.id === activeActionId) ?? INTEGRATION_ACTIONS[0],
    [activeActionId],
  );

  async function runAction(action: IntegrationAction) {
    setActiveActionId(action.id);
    setBusyActionId(action.id);
    setError(null);

    try {
      const response = await callIntegrationRoute(action.id, {
        job_id: jobId,
        controller,
        cam_system: camSystem,
        erp_reference: erpReference,
        query: mobileQuery,
        measurement_packet: measurementPacket,
      });

      setRuns((previous) => [
        {
          action,
          result: response.result,
          capturedAt: new Date().toISOString(),
        },
        ...previous.filter((entry) => entry.action.id !== action.id),
      ]);
    } catch (issue) {
      setError(
        issue instanceof OrphanRouteError
          ? issue.message
          : 'Integration route could not be reached from the frontend.',
      );
    } finally {
      setBusyActionId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-6">
      <section className="overflow-hidden rounded-[32px] border border-cyan-300/14 bg-[linear-gradient(135deg,rgba(9,18,28,0.98)_0%,rgba(5,10,16,0.98)_48%,rgba(16,28,38,0.95)_100%)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-full border border-cyan-300/18 bg-cyan-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100">
                Integration bridge
              </span>
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200">
                5 surfaced backend routes
              </span>
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
                Integrations Desk
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300">
                Give CAM, DNC, ERP, mobile, and measurement routes a frontend control surface so
                the integration layer is visible and testable inside the app shell, not only by
                hitting raw endpoints.
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Active lane</div>
            <div className="mt-4 text-lg font-semibold text-slate-50">{activeAction.label}</div>
            <div className="mt-2 text-sm leading-6 text-slate-300">{activeAction.detail}</div>
            <div className="mt-4 rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-300">
              Use this desk to validate the integration routes as real product surfaces while the
              higher-level ERP and programming desks stay focused on their primary workflows.
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.98)_100%)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
            <div className="mb-4 text-xl font-semibold text-slate-50">Integration packet</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Job id</span>
                <input value={jobId} onChange={(event) => setJobId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-100" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Controller</span>
                <input value={controller} onChange={(event) => setController(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-100" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">CAM system</span>
                <input value={camSystem} onChange={(event) => setCamSystem(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-100" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">ERP reference</span>
                <input value={erpReference} onChange={(event) => setErpReference(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-100" />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Mobile lookup prompt</span>
                <input value={mobileQuery} onChange={(event) => setMobileQuery(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-100" />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Measurement packet</span>
                <input value={measurementPacket} onChange={(event) => setMeasurementPacket(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-100" />
              </label>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.98)_100%)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
            <div className="mb-4 text-xl font-semibold text-slate-50">Route actions</div>
            <div className="grid gap-3">
              {INTEGRATION_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => runAction(action)}
                  disabled={busyActionId === action.id}
                  className={`rounded-[20px] border px-4 py-4 text-left transition-all ${activeActionId === action.id ? 'border-cyan-300/28 bg-cyan-300/[0.08]' : 'border-white/8 bg-white/[0.03] hover:border-cyan-300/18 hover:bg-white/[0.05]'} ${busyActionId === action.id ? 'opacity-60' : ''}`}
                >
                  <div className="text-sm font-semibold text-slate-50">{action.label}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">{action.detail}</div>
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.98)_100%)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Captured responses</div>
              <div className="mt-2 text-xl font-semibold text-slate-50">Integration response board</div>
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              {runs.length} results
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-[20px] border border-rose-300/22 bg-rose-400/[0.08] px-4 py-4 text-sm leading-6 text-rose-100">
              {error}
            </div>
          ) : null}

          {runs.length > 0 ? (
            <div className="space-y-4">
              {runs.map((entry) => (
                <article key={entry.action.id} className="rounded-[22px] border border-white/8 bg-black/15 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-100">{entry.action.label}</div>
                      <div className="mt-1 text-sm text-slate-400">{entry.action.detail}</div>
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {formatTimestamp(entry.capturedAt)}
                    </div>
                  </div>
                  <pre className="mt-4 overflow-x-auto rounded-[18px] border border-white/8 bg-slate-950/70 p-4 text-xs leading-6 text-slate-200">
                    {JSON.stringify(entry.result, null, 2)}
                  </pre>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-white/12 bg-black/15 px-5 py-8 text-sm leading-7 text-slate-400">
              Run one of the integration actions to capture the live backend response here.
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
