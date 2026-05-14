import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  integrationExportARAging,
  integrationExportPayrollTax,
  integrationExportQB,
  integrationFormats,
  integrationReconcileBank,
  ApiError,
} from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import type { BankReconciliation, ExportFormat } from '../api/types';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';
import { buildWorkflowPath, formatWorkflowSourceLabel, parseWorkflowRouteContext } from '../utils/workflowRouteContext';

type Tab = 'formats' | 'reconcile' | 'quickbooks' | 'payroll' | 'araging';
type ExportLane = Extract<Tab, 'quickbooks' | 'payroll' | 'araging'>;

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  formats: { label: 'Formats', detail: 'Available export targets and the accounting posture they support.' },
  reconcile: { label: 'Reconcile', detail: 'Bank reconciliation lane for monthly close discipline.' },
  quickbooks: { label: 'QuickBooks', detail: 'Export transactional data in a controller-safe finance package.' },
  payroll: { label: 'Payroll / tax', detail: 'Generate payroll and filing summaries for period close.' },
  araging: { label: 'AR aging', detail: 'Push receivables aging out for collections review.' },
};

export function ExportsPage() {
  const location = useLocation();
  const routeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeContext = useMemo(() => parseWorkflowRouteContext(location.search), [location.search]);
  const launcherSource = routeParams.get('source') || routeContext.origin.source || '';
  const upstreamSource = routeContext.origin.source && routeContext.origin.source !== launcherSource ? routeContext.origin.source : '';
  const routedEmployeeId = routeParams.get('employeeId') || (routeContext.focus.type === 'employee' ? routeContext.focus.id : '');
  const routedPeriodId = routeParams.get('periodId') || routeParams.get('period_id') || '';
  const routedPeriodStart = routeParams.get('periodStart') || routeParams.get('period_start') || '';
  const routedPeriodEnd = routeParams.get('periodEnd') || routeParams.get('period_end') || '';
  const routedInvoiceId =
    routeParams.get('invoiceId')
    || (routeContext.focus.type === 'invoice' ? routeContext.focus.id : routeContext.origin.recordType === 'Invoice' ? routeContext.origin.recordId : '');
  const launcherSourceLabel = formatWorkflowSourceLabel(launcherSource);
  const upstreamSourceLabel = formatWorkflowSourceLabel(upstreamSource);
  const [tab, setTab] = useState<Tab>('formats');
  const [formats, setFormats] = useState<ExportFormat[]>([]);
  const [recon, setRecon] = useState<BankReconciliation | null>(null);
  const [exportResults, setExportResults] = useState<Partial<Record<ExportLane, Record<string, unknown>>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconForm, setReconForm] = useState({
    statement_date: new Date().toISOString().slice(0, 10),
    bank_balance: '',
    book_balance: '',
  });
  const activeTab = TAB_CONFIG[tab];
  const financeReference =
    routeContext.origin.recordType && routeContext.origin.recordId
      ? `${routeContext.origin.recordType} ${routeContext.origin.recordId}`
      : routedEmployeeId
        ? `Employee ${routedEmployeeId}`
        : routedInvoiceId
          ? `Invoice ${routedInvoiceId}`
          : '';
  const exportPeriodStart = routedPeriodStart || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const exportPeriodEnd = routedPeriodEnd || new Date().toISOString().slice(0, 10);
  const payrollExportPeriod = routedPeriodId || `${exportPeriodStart} to ${exportPeriodEnd}`;
  const effectiveOrigin = useMemo(
    () =>
      routeContext.origin.source
        ? routeContext.origin
        : {
            source: launcherSource || 'exports',
            recordType: routeContext.origin.recordType || (routedEmployeeId ? 'Employee' : routedInvoiceId ? 'Invoice' : ''),
            recordId: routeContext.origin.recordId || routedEmployeeId || routedInvoiceId,
            customer: routeContext.origin.customer,
            note:
              routeContext.origin.note
              || 'Keep the active finance follow-up attached while exports move between payroll and the ledger close stack.',
            threadId: routeContext.origin.threadId,
          },
    [launcherSource, routeContext.origin, routedEmployeeId, routedInvoiceId],
  );
  const effectiveFocus = useMemo(
    () =>
      routedEmployeeId
        ? {
            type: 'employee',
            id: routedEmployeeId,
          }
        : routeContext.focus.id
          ? routeContext.focus
          : undefined,
    [routeContext.focus, routedEmployeeId],
  );
  const generalLedgerPath = useMemo(
    () =>
      buildWorkflowPath('/general-ledger', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'exports',
          employeeId: routedEmployeeId,
          invoiceId: routedInvoiceId,
          periodId: routedPeriodId || undefined,
          periodStart: routedPeriodStart || undefined,
          periodEnd: routedPeriodEnd || undefined,
        },
      }),
    [effectiveFocus, effectiveOrigin, location.search, routedEmployeeId, routedInvoiceId, routedPeriodEnd, routedPeriodId, routedPeriodStart],
  );
  const payrollPath = useMemo(
    () =>
      buildWorkflowPath('/payroll', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'exports',
          employeeId: routedEmployeeId,
          invoiceId: routedInvoiceId,
          periodId: routedPeriodId || undefined,
          periodStart: routedPeriodStart || undefined,
          periodEnd: routedPeriodEnd || undefined,
        },
      }),
    [effectiveFocus, effectiveOrigin, location.search, routedEmployeeId, routedInvoiceId, routedPeriodEnd, routedPeriodId, routedPeriodStart],
  );
  const financialAnalysisPath = useMemo(
    () =>
      buildWorkflowPath('/financial-analysis', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'exports',
          employeeId: routedEmployeeId,
          invoiceId: routedInvoiceId,
          periodId: routedPeriodId || undefined,
          periodStart: routedPeriodStart || undefined,
          periodEnd: routedPeriodEnd || undefined,
        },
      }),
    [effectiveFocus, effectiveOrigin, location.search, routedEmployeeId, routedInvoiceId, routedPeriodEnd, routedPeriodId, routedPeriodStart],
  );

  useEffect(() => {
    if (tab === 'formats') {
      void loadFormats();
    }
  }, [tab]);

  const activeExportResult = tab === 'quickbooks' || tab === 'payroll' || tab === 'araging'
    ? exportResults[tab]
    : null;

  async function loadFormats() {
    setLoading(true);
    setError(null);
    try {
      const response = await integrationFormats();
      const next = (response.result as any)?.formats ?? (response.result as any) ?? [];
      setFormats(Array.isArray(next) ? next : []);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load export formats');
    } finally {
      setLoading(false);
    }
  }

  async function handleReconcile() {
    setLoading(true);
    setError(null);
    try {
      const response = await integrationReconcileBank({
        statement_date: reconForm.statement_date,
        bank_balance: Number(reconForm.bank_balance) || 0,
        book_balance: Number(reconForm.book_balance) || 0,
        deposits_in_transit: [],
        outstanding_checks: [],
      });
      setRecon((response.result as unknown as BankReconciliation) ?? null);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to reconcile statement');
    } finally {
      setLoading(false);
    }
  }

  async function runExport(target: ExportLane) {
    setLoading(true);
    setError(null);
    setExportResults((current) => ({ ...current, [target]: undefined }));
    try {
      if (target === 'quickbooks') {
        const response = await integrationExportQB({
          period_start: exportPeriodStart,
          period_end: exportPeriodEnd,
        });
        setExportResults((current) => ({
          ...current,
          quickbooks: (response.result as Record<string, unknown>) ?? { exported: true },
        }));
      }
      if (target === 'payroll') {
        const response = await integrationExportPayrollTax({
          period: payrollExportPeriod,
          employees: routedEmployeeId ? [routedEmployeeId] : [],
        });
        setExportResults((current) => ({
          ...current,
          payroll: (response.result as Record<string, unknown>) ?? { exported: true },
        }));
      }
      if (target === 'araging') {
        const response = await integrationExportARAging();
        setExportResults((current) => ({
          ...current,
          araging: (response.result as Record<string, unknown>) ?? { exported: true },
        }));
      }
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Exports and integrations"
        title="Exports"
        description="Handle export formats, bank reconciliation, and close-cycle handoffs from a calmer finance and integration workspace instead of bouncing between isolated forms."
        metrics={
          <>
            <SummaryTile label="Active lane" value={activeTab.label} hint={activeTab.detail} />
            <SummaryTile
              label="Format count"
              value={String(formats.length)}
              hint="Available external handoff targets staged from the backend catalog."
              accent="from-sky-400/22 via-sky-300/8 to-transparent"
            />
            <SummaryTile
              label="Close posture"
              value={recon ? (recon.reconciled ? 'Balanced' : 'Review') : 'Standby'}
              hint="Bank-close signal from the current reconciliation attempt."
              accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              Keep exports, reconciliation, and AR handoffs in one operator shell so accounting workflows feel deliberate instead of bolted on.
            </div>
            {launcherSource ? (
              <div className="rounded-[22px] border border-cyan-300/18 bg-cyan-300/[0.08] px-4 py-4 text-sm leading-6 text-cyan-50">
                {launcherSourceLabel || 'This workflow'} opened Exports with finance context.{' '}
                {effectiveOrigin.note || 'Keep the active accounting follow-up attached while exports move through close-cycle handoffs.'}
                {financeReference ? (
                  <div className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-cyan-100/90">
                    Record: <span className="font-semibold normal-case tracking-normal">{financeReference}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
            {upstreamSourceLabel ? (
              <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-200">
                Upstream finance origin: <span className="font-semibold text-slate-50">{upstreamSourceLabel}</span>.
              </div>
            ) : null}
            <div className="grid gap-2">
              <ActionButton onClick={() => setTab('formats')}>Open format catalog</ActionButton>
              <ActionButton tone="emerald" onClick={() => setTab('reconcile')}>
                Open reconcile lane
              </ActionButton>
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(Object.entries(TAB_CONFIG) as Array<[Tab, { label: string; detail: string }]>).map(([key, config]) => (
          <TabButton key={key} active={tab === key} onClick={() => setTab(key)}>
            {config.label}
          </TabButton>
        ))}
      </div>

      {loading ? <LoadingState label="Refreshing export workspace..." /> : null}
      {error ? <ErrorState message={error} onRetry={tab === 'formats' ? loadFormats : undefined} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
        <div className="space-y-6">
          {tab === 'formats' ? (
            <PanelCard title="Export catalog" subtitle="Available downstream handoffs and their operational use cases.">
              <div className="grid gap-3 md:grid-cols-2">
                {formats.length > 0 ? (
                  formats.map((format) => (
                    <div key={format.format} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="text-sm font-semibold text-slate-50">{format.format}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-400">{format.description}</div>
                      <div className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">{format.use_case}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No export formats are available in the current backend response.
                  </div>
                )}
              </div>
            </PanelCard>
          ) : null}

          {tab === 'reconcile' ? (
            <PanelCard title="Bank reconciliation" subtitle="Stage the statement, compare against books, and keep the close signal visible.">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Statement date">
                  <Input
                    type="date"
                    value={reconForm.statement_date}
                    onChange={(event) => setReconForm((current) => ({ ...current, statement_date: event.target.value }))}
                  />
                </Field>
                <Field label="Bank balance">
                  <Input
                    type="number"
                    value={reconForm.bank_balance}
                    placeholder="50000"
                    onChange={(event) => setReconForm((current) => ({ ...current, bank_balance: event.target.value }))}
                  />
                </Field>
                <Field label="Book balance">
                  <Input
                    type="number"
                    value={reconForm.book_balance}
                    placeholder="48500"
                    onChange={(event) => setReconForm((current) => ({ ...current, book_balance: event.target.value }))}
                  />
                </Field>
              </div>
              <div className="mt-4">
                <ActionButton tone="emerald" onClick={handleReconcile}>
                  Reconcile bank statement
                </ActionButton>
              </div>
              {recon ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryTile label="Bank balance" value={`$${recon.bank_balance.toFixed(2)}`} hint="Imported statement balance." />
                  <SummaryTile
                    label="Adjusted bank"
                    value={`$${recon.adjusted_bank.toFixed(2)}`}
                    hint="Outstanding items applied to bank posture."
                    accent="from-sky-400/22 via-sky-300/8 to-transparent"
                  />
                  <SummaryTile
                    label="Book balance"
                    value={`$${recon.book_balance.toFixed(2)}`}
                    hint="Current GL-side book balance."
                    accent="from-violet-400/22 via-violet-300/8 to-transparent"
                  />
                  <SummaryTile
                    label="Difference"
                    value={`$${recon.difference.toFixed(2)}`}
                    hint={recon.reconciled ? 'Books are reconciled.' : 'Review remaining deltas before close.'}
                    accent={recon.reconciled ? 'from-emerald-400/22 via-emerald-300/8 to-transparent' : 'from-amber-300/22 via-amber-200/8 to-transparent'}
                  />
                </div>
              ) : null}
            </PanelCard>
          ) : null}

          {tab === 'quickbooks' ? (
            <PanelCard title="QuickBooks export" subtitle="Generate the current period package without leaving the integration workspace.">
              <div className="flex flex-wrap gap-3">
                <ActionButton tone="emerald" onClick={() => void runExport('quickbooks')}>
                  Generate QB export
                </ActionButton>
              </div>
              {activeExportResult ? (
                <pre className="mt-5 overflow-x-auto rounded-[22px] border border-white/8 bg-slate-950/70 p-4 text-xs text-slate-200">
                  {JSON.stringify(activeExportResult, null, 2)}
                </pre>
              ) : null}
            </PanelCard>
          ) : null}

          {tab === 'payroll' ? (
            <PanelCard title="Payroll and tax package" subtitle="Generate payroll filing output from the same close-cycle shell.">
              <div className="flex flex-wrap gap-3">
                <ActionButton tone="emerald" onClick={() => void runExport('payroll')}>
                  Generate payroll report
                </ActionButton>
              </div>
              {activeExportResult ? (
                <pre className="mt-5 overflow-x-auto rounded-[22px] border border-white/8 bg-slate-950/70 p-4 text-xs text-slate-200">
                  {JSON.stringify(activeExportResult, null, 2)}
                </pre>
              ) : null}
            </PanelCard>
          ) : null}

          {tab === 'araging' ? (
            <PanelCard title="AR aging export" subtitle="Push collections-facing aging output without leaving the finance workspace.">
              <div className="flex flex-wrap gap-3">
                <ActionButton tone="emerald" onClick={() => void runExport('araging')}>
                  Generate AR aging
                </ActionButton>
              </div>
              {activeExportResult ? (
                <pre className="mt-5 overflow-x-auto rounded-[22px] border border-white/8 bg-slate-950/70 p-4 text-xs text-slate-200">
                  {JSON.stringify(activeExportResult, null, 2)}
                </pre>
              ) : null}
            </PanelCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <PanelCard title="Close-cycle brief" subtitle="Keep the purpose of the current handoff visible while working deeper in the lane.">
            <div className="space-y-4 text-sm text-slate-300">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current lane</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{activeTab.label}</div>
                <div className="mt-2 leading-6 text-slate-400">{activeTab.detail}</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Operational notes</div>
                <ul className="mt-3 space-y-2 text-slate-300">
                  <li>Use formats to confirm downstream coverage before onboarding a new finance target.</li>
                  <li>Run reconciliation before exporting close-cycle reports so book posture is honest.</li>
                  <li>Keep AR aging and payroll exports in the same shell during month-end to reduce handoff misses.</li>
                </ul>
              </div>
            </div>
          </PanelCard>

          <PanelCard title="Finance handoff" subtitle="Move back into ledger review or payroll without dropping the close-cycle context.">
            <div className="grid gap-3">
              <Link
                to={generalLedgerPath}
                className="block rounded-[22px] border border-sky-300/20 bg-sky-300/[0.10] px-4 py-4 text-sm leading-6 text-sky-50 transition hover:border-sky-300/32 hover:bg-sky-300/[0.16]"
              >
                <div className="font-semibold">Return to General Ledger</div>
                <div className="mt-2 text-sky-50/80">
                  Re-open the ledger stack with the same finance record and launcher context still attached.
                </div>
              </Link>

              <Link
                to={payrollPath}
                className="block rounded-[22px] border border-violet-300/20 bg-violet-300/[0.10] px-4 py-4 text-sm leading-6 text-violet-50 transition hover:border-violet-300/32 hover:bg-violet-300/[0.16]"
              >
                <div className="font-semibold">Return to Payroll</div>
                <div className="mt-2 text-violet-50/80">
                  Move back into payroll review with the same upstream workforce and close-cycle origin preserved.
                </div>
              </Link>

              <Link
                to={financialAnalysisPath}
                className="block rounded-[22px] border border-emerald-300/20 bg-emerald-300/[0.10] px-4 py-4 text-sm leading-6 text-emerald-50 transition hover:border-emerald-300/32 hover:bg-emerald-300/[0.16]"
              >
                <div className="font-semibold">Open Financial Analysis follow-up</div>
                <div className="mt-2 text-emerald-50/80">
                  Carry the same close-cycle record into NPV, ROI, and breakeven review without restaging the finance origin.
                </div>
              </Link>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
