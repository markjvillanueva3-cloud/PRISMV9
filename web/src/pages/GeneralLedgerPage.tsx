import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ApiError,
  glBalanceSheet,
  glChartOfAccounts,
  glIncomeStatement,
  glJournalEntry,
  glRecordInvoice,
  glRecordPayment,
  glRecordPayroll,
  glRecordPurchase,
  glTrialBalance,
} from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import type { BalanceSheet, GLAccount, IncomeStatement, TrialBalance } from '../api/types';
import { buildWorkflowPath, formatWorkflowSourceLabel, parseWorkflowRouteContext } from '../utils/workflowRouteContext';

type Tab = 'accounts' | 'trial' | 'pnl' | 'balance' | 'record';
type RecordType = 'invoice' | 'payment' | 'purchase' | 'payroll' | 'journal';

function SummaryTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-br ${accent ?? 'from-cyan-400/22 via-cyan-300/8 to-transparent'}`} />
      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
        <div className="mt-3 text-2xl font-semibold text-slate-50">{value}</div>
        <div className="mt-2 text-sm text-slate-400">{hint}</div>
      </div>
    </div>
  );
}

function PanelCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
      <div className="mb-5">
        <div className="text-xl font-semibold text-slate-50">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-slate-400">{subtitle}</div> : null}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-300/32 ${props.className ?? ''}`}
    />
  );
}

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  accounts: { label: 'Accounts', detail: 'Chart of accounts and live balance posture.' },
  trial: { label: 'Trial Balance', detail: 'Debit-credit balance check before period close.' },
  pnl: { label: 'Income Statement', detail: 'Revenue and expense posture for the active year.' },
  balance: { label: 'Balance Sheet', detail: 'Asset, liability, and equity posture in one lane.' },
  record: { label: 'Record Entry', detail: 'Post new invoice, payment, purchase, payroll, or journal activity.' },
};

export function GeneralLedgerPage() {
  const location = useLocation();
  const routeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeContext = useMemo(() => parseWorkflowRouteContext(location.search), [location.search]);
  const launcherSource = routeParams.get('source') || routeContext.origin.source || '';
  const upstreamSource = routeContext.origin.source && routeContext.origin.source !== launcherSource ? routeContext.origin.source : '';
  const routedEmployeeId = routeParams.get('employeeId') || (routeContext.focus.type === 'employee' ? routeContext.focus.id : '');
  const routedInvoiceId =
    routeParams.get('invoiceId')
    || (routeContext.focus.type === 'invoice' ? routeContext.focus.id : routeContext.origin.recordType === 'Invoice' ? routeContext.origin.recordId : '');
  const launcherSourceLabel = formatWorkflowSourceLabel(launcherSource);
  const upstreamSourceLabel = formatWorkflowSourceLabel(upstreamSource);
  const [tab, setTab] = useState<Tab>('accounts');
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [trial, setTrial] = useState<TrialBalance | null>(null);
  const [income, setIncome] = useState<IncomeStatement | null>(null);
  const [balance, setBalance] = useState<BalanceSheet | null>(null);
  const [recordResult, setRecordResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordType, setRecordType] = useState<RecordType>('invoice');
  const [recordForm, setRecordForm] = useState({
    customer_id: '',
    amount: '',
    description: '',
    invoice_number: '',
    vendor_id: '',
    employee_count: '',
    period: '',
    debit_account: '',
    credit_account: '',
    reference: '',
  });

  const activeTab = TAB_CONFIG[tab];
  const totalAccountBalance = useMemo(() => accounts.reduce((sum, account) => sum + account.balance, 0), [accounts]);
  const financeReference =
    routeContext.origin.recordType && routeContext.origin.recordId
      ? `${routeContext.origin.recordType} ${routeContext.origin.recordId}`
      : routedEmployeeId
        ? `Employee ${routedEmployeeId}`
        : routedInvoiceId
          ? `Invoice ${routedInvoiceId}`
          : '';
  const effectiveOrigin = useMemo(
    () =>
      routeContext.origin.source
        ? routeContext.origin
        : {
            source: launcherSource || 'general-ledger',
            recordType: routeContext.origin.recordType || (routedEmployeeId ? 'Employee' : routedInvoiceId ? 'Invoice' : ''),
            recordId: routeContext.origin.recordId || routedEmployeeId || routedInvoiceId,
            customer: routeContext.origin.customer,
            note:
              routeContext.origin.note
              || 'Keep accounting follow-up attached while ledger review moves back into billing, payroll, or finance analysis.',
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
  const invoicesPath = useMemo(
    () =>
      buildWorkflowPath('/invoices', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'general-ledger',
          invoiceId: routedInvoiceId,
          employeeId: routedEmployeeId,
        },
      }),
    [effectiveFocus, effectiveOrigin, location.search, routedEmployeeId, routedInvoiceId],
  );
  const payrollPath = useMemo(
    () =>
      buildWorkflowPath('/payroll', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'general-ledger',
          employeeId: routedEmployeeId,
          invoiceId: routedInvoiceId,
        },
      }),
    [effectiveFocus, effectiveOrigin, location.search, routedEmployeeId, routedInvoiceId],
  );
  const financialAnalysisPath = useMemo(
    () =>
      buildWorkflowPath('/financial-analysis', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'general-ledger',
          employeeId: routedEmployeeId,
          invoiceId: routedInvoiceId,
        },
      }),
    [effectiveFocus, effectiveOrigin, location.search, routedEmployeeId, routedInvoiceId],
  );
  const exportsPath = useMemo(
    () =>
      buildWorkflowPath('/exports', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'general-ledger',
          employeeId: routedEmployeeId,
          invoiceId: routedInvoiceId,
        },
      }),
    [effectiveFocus, effectiveOrigin, location.search, routedEmployeeId, routedInvoiceId],
  );

  async function loadData() {
    if (tab === 'record') return;
    setLoading(true);
    setError(null);
    try {
      if (tab === 'accounts') {
        const response = await glChartOfAccounts();
        setAccounts(((response.result as { accounts?: GLAccount[] })?.accounts) ?? []);
      } else if (tab === 'trial') {
        const response = await glTrialBalance();
        setTrial((response.result as unknown as TrialBalance) ?? null);
      } else if (tab === 'pnl') {
        const now = new Date();
        const start = `${now.getFullYear()}-01-01`;
        const end = now.toISOString().slice(0, 10);
        const response = await glIncomeStatement({ period_start: start, period_end: end });
        setIncome((response.result as unknown as IncomeStatement) ?? null);
      } else if (tab === 'balance') {
        const response = await glBalanceSheet();
        setBalance((response.result as unknown as BalanceSheet) ?? null);
      }
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load GL data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [tab]);

  async function handleRecord() {
    setLoading(true);
    setError(null);
    setRecordResult(null);
    try {
      let response;
      if (recordType === 'invoice') {
        response = await glRecordInvoice({
          customer_id: recordForm.customer_id,
          amount: parseFloat(recordForm.amount),
          invoice_number: recordForm.invoice_number,
        });
      } else if (recordType === 'payment') {
        response = await glRecordPayment({
          customer_id: recordForm.customer_id,
          amount: parseFloat(recordForm.amount),
          invoice_number: recordForm.invoice_number,
        });
      } else if (recordType === 'purchase') {
        response = await glRecordPurchase({
          vendor_id: recordForm.vendor_id,
          amount: parseFloat(recordForm.amount),
          description: recordForm.description,
        });
      } else if (recordType === 'payroll') {
        response = await glRecordPayroll({
          employee_count: parseInt(recordForm.employee_count, 10) || 0,
          amount: parseFloat(recordForm.amount),
          period: recordForm.period,
        });
      } else {
        response = await glJournalEntry({
          debit_account: recordForm.debit_account,
          credit_account: recordForm.credit_account,
          amount: parseFloat(recordForm.amount),
          reference: recordForm.reference,
        });
      }
      setRecordResult((response?.result as Record<string, unknown>) ?? { ok: true });
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to record transaction');
    } finally {
      setLoading(false);
    }
  }

  function renderMainLane() {
    if (tab === 'accounts') {
      return (
        <PanelCard title="Chart of accounts" subtitle="A cleaner ledger table that keeps balances readable without prototype-era spreadsheet chrome.">
          {accounts.length > 0 ? (
            <div className="overflow-hidden rounded-[22px] border border-white/8">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.04] text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Account #</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6">
                  {accounts.map((account) => (
                    <tr key={account.number} className="bg-white/[0.02] text-slate-200">
                      <td className="px-4 py-3 font-mono text-slate-400">{account.number}</td>
                      <td className="px-4 py-3 font-medium text-slate-50">{account.name}</td>
                      <td className="px-4 py-3 capitalize text-slate-300">{account.type}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-100">${account.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
              Load the accounts lane to stage the ledger structure and current balances.
            </div>
          )}
        </PanelCard>
      );
    }

    if (tab === 'trial') {
      return (
        <PanelCard title="Trial balance" subtitle="Keep debit-credit posture visible before close, payout, or reporting decisions.">
          {trial ? (
            <>
              <div className="mb-4 flex items-center gap-3">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${trial.balanced ? 'bg-emerald-300/20 text-emerald-100' : 'bg-rose-300/20 text-rose-100'}`}>
                  {trial.balanced ? 'Balanced' : 'Out of balance'}
                </span>
                <span className="text-sm text-slate-400">Debits and credits should match before books move downstream.</span>
              </div>
              <div className="overflow-hidden rounded-[22px] border border-white/8">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.04] text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Account</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3 text-right">Debit</th>
                      <th className="px-4 py-3 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/6">
                    {trial.accounts.map((account) => (
                      <tr key={account.number} className="bg-white/[0.02] text-slate-200">
                        <td className="px-4 py-3 font-mono text-slate-400">{account.number}</td>
                        <td className="px-4 py-3 text-slate-50">{account.name}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-100">{account.debit > 0 ? `$${account.debit.toFixed(2)}` : '-'}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-100">{account.credit > 0 ? `$${account.credit.toFixed(2)}` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-white/[0.04] text-slate-100">
                    <tr>
                      <td className="px-4 py-3 font-semibold" colSpan={2}>Totals</td>
                      <td className="px-4 py-3 text-right font-mono">${trial.total_debits.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono">${trial.total_credits.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          ) : null}
        </PanelCard>
      );
    }

    if (tab === 'pnl') {
      return (
        <PanelCard title="Income statement" subtitle="Revenue and expense posture stay readable here until richer charting lands.">
          {income ? (
            <div className="space-y-5">
              <div className="text-sm text-slate-400">{income.period_start} to {income.period_end}</div>
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-[22px] border border-emerald-300/14 bg-emerald-300/[0.05] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">Revenue</div>
                  <div className="mt-3 space-y-2">
                    {income.revenue.map((entry) => (
                      <div key={entry.account} className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">{entry.account}</span>
                        <span className="font-mono text-emerald-100">${entry.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3 text-sm font-semibold text-slate-50">
                    <span>Total revenue</span>
                    <span className="font-mono">${income.total_revenue.toFixed(2)}</span>
                  </div>
                </div>
                <div className="rounded-[22px] border border-rose-300/14 bg-rose-300/[0.05] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-100">Expenses</div>
                  <div className="mt-3 space-y-2">
                    {income.expenses.map((entry) => (
                      <div key={entry.account} className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">{entry.account}</span>
                        <span className="font-mono text-rose-100">${entry.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3 text-sm font-semibold text-slate-50">
                    <span>Total expenses</span>
                    <span className="font-mono">${income.total_expenses.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-lg font-semibold text-slate-50">
                <span>Net income</span>
                <span className={`font-mono ${income.net_income >= 0 ? 'text-emerald-100' : 'text-rose-100'}`}>${income.net_income.toFixed(2)}</span>
              </div>
            </div>
          ) : null}
        </PanelCard>
      );
    }

    if (tab === 'balance') {
      return (
        <PanelCard title="Balance sheet" subtitle="Assets, liabilities, and equity read as one board instead of split prototypes.">
          {balance ? (
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-[22px] border border-sky-300/14 bg-sky-300/[0.05] p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">Assets</div>
                <div className="mt-3 space-y-2">
                  {balance.assets.map((entry) => (
                    <div key={entry.account} className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{entry.account}</span>
                      <span className="font-mono text-slate-100">${entry.balance.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3 text-sm font-semibold text-slate-50">
                  <span>Total assets</span>
                  <span className="font-mono">${balance.total_assets.toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-5">
                <div className="rounded-[22px] border border-amber-300/14 bg-amber-300/[0.05] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">Liabilities</div>
                  <div className="mt-3 space-y-2">
                    {balance.liabilities.map((entry) => (
                      <div key={entry.account} className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">{entry.account}</span>
                        <span className="font-mono text-slate-100">${entry.balance.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[22px] border border-violet-300/14 bg-violet-300/[0.05] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-100">Equity</div>
                  <div className="mt-3 space-y-2">
                    {balance.equity.map((entry) => (
                      <div key={entry.account} className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">{entry.account}</span>
                        <span className="font-mono text-slate-100">${entry.balance.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm font-semibold text-slate-50">
                  <span>Total L + E</span>
                  <span className="font-mono">${(balance.total_liabilities + balance.total_equity).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : null}
        </PanelCard>
      );
    }

    return (
      <PanelCard title="Record transaction" subtitle="Post activity without leaving the ledger shell.">
        <div className="mb-4 flex flex-wrap gap-2">
          {(['invoice', 'payment', 'purchase', 'payroll', 'journal'] as const).map((entryType) => {
            const active = entryType === recordType;
            return (
              <button
                key={entryType}
                type="button"
                onClick={() => setRecordType(entryType)}
                className={`rounded-full border px-4 py-2 text-sm font-medium capitalize transition ${
                  active
                    ? 'border-sky-300/24 bg-sky-300/[0.08] text-sky-100'
                    : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/16 hover:text-white'
                }`}
              >
                {entryType}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {(recordType === 'invoice' || recordType === 'payment') ? (
            <>
              <Field label="Customer ID">
                <Input type="text" value={recordForm.customer_id} onChange={(event) => setRecordForm((current) => ({ ...current, customer_id: event.target.value }))} />
              </Field>
              <Field label="Amount">
                <Input type="number" value={recordForm.amount} onChange={(event) => setRecordForm((current) => ({ ...current, amount: event.target.value }))} />
              </Field>
              <Field label="Invoice #">
                <Input type="text" value={recordForm.invoice_number} onChange={(event) => setRecordForm((current) => ({ ...current, invoice_number: event.target.value }))} />
              </Field>
            </>
          ) : null}

          {recordType === 'purchase' ? (
            <>
              <Field label="Vendor ID">
                <Input type="text" value={recordForm.vendor_id} onChange={(event) => setRecordForm((current) => ({ ...current, vendor_id: event.target.value }))} />
              </Field>
              <Field label="Amount">
                <Input type="number" value={recordForm.amount} onChange={(event) => setRecordForm((current) => ({ ...current, amount: event.target.value }))} />
              </Field>
              <Field label="Description">
                <Input type="text" value={recordForm.description} onChange={(event) => setRecordForm((current) => ({ ...current, description: event.target.value }))} />
              </Field>
            </>
          ) : null}

          {recordType === 'payroll' ? (
            <>
              <Field label="Employee count">
                <Input type="number" value={recordForm.employee_count} onChange={(event) => setRecordForm((current) => ({ ...current, employee_count: event.target.value }))} />
              </Field>
              <Field label="Amount">
                <Input type="number" value={recordForm.amount} onChange={(event) => setRecordForm((current) => ({ ...current, amount: event.target.value }))} />
              </Field>
              <Field label="Period">
                <Input type="text" value={recordForm.period} onChange={(event) => setRecordForm((current) => ({ ...current, period: event.target.value }))} placeholder="2026-03" />
              </Field>
            </>
          ) : null}

          {recordType === 'journal' ? (
            <>
              <Field label="Debit account">
                <Input type="text" value={recordForm.debit_account} onChange={(event) => setRecordForm((current) => ({ ...current, debit_account: event.target.value }))} />
              </Field>
              <Field label="Credit account">
                <Input type="text" value={recordForm.credit_account} onChange={(event) => setRecordForm((current) => ({ ...current, credit_account: event.target.value }))} />
              </Field>
              <Field label="Amount">
                <Input type="number" value={recordForm.amount} onChange={(event) => setRecordForm((current) => ({ ...current, amount: event.target.value }))} />
              </Field>
              <div className="md:col-span-3">
                <Field label="Reference">
                  <Input type="text" value={recordForm.reference} onChange={(event) => setRecordForm((current) => ({ ...current, reference: event.target.value }))} />
                </Field>
              </div>
            </>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => {
            void handleRecord();
          }}
          disabled={loading}
          className="mt-4 rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
        >
          Record transaction
        </button>

        {recordResult ? (
          <pre className="mt-5 max-h-[320px] overflow-auto rounded-[22px] border border-white/8 bg-black/20 p-4 text-xs leading-6 text-slate-200">
            {JSON.stringify(recordResult, null, 2)}
          </pre>
        ) : null}
      </PanelCard>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <section className="overflow-hidden rounded-[32px] border border-sky-300/12 bg-[linear-gradient(135deg,rgba(8,15,23,0.98)_0%,rgba(5,10,16,0.98)_48%,rgba(13,27,43,0.95)_100%)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-sky-300/16 bg-sky-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-100">
              Finance operations
            </span>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">General Ledger</h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300">
                Keep chart-of-accounts, close posture, statements, and transaction entry inside one readable accounting workspace instead of scattered utility pages.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryTile label="Active lane" value={activeTab.label} hint={activeTab.detail} />
              <SummaryTile label="Account count" value={accounts.length ? `${accounts.length}` : 'Standby'} hint="Loaded only when the chart-of-accounts lane is active." accent="from-emerald-400/22 via-emerald-300/8 to-transparent" />
              <SummaryTile label="Close posture" value={trial ? (trial.balanced ? 'Balanced' : 'Review') : 'Pending'} hint="Trial-balance state for the current ledger posture." accent="from-violet-400/22 via-violet-300/8 to-transparent" />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Workflow lanes</div>
            <div className="mt-4 grid gap-3">
              {launcherSource ? (
                <div className="rounded-[22px] border border-sky-300/18 bg-sky-300/[0.08] px-4 py-4 text-sm leading-6 text-sky-50">
                  {launcherSourceLabel || 'This workflow'} opened General Ledger with finance context.{' '}
                  {effectiveOrigin.note || 'Keep accounting work attached while it moves back into billing, payroll, or finance analysis.'}
                  {financeReference ? (
                    <div className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-sky-100/90">
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

              {(Object.entries(TAB_CONFIG) as Array<[Tab, { label: string; detail: string }]>).map(([key, config]) => {
                const active = key === tab;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`rounded-[22px] border px-4 py-4 text-left transition ${
                      active
                        ? 'border-sky-300/24 bg-sky-300/[0.08] text-sky-50'
                        : 'border-white/8 bg-white/[0.03] text-slate-200 hover:border-white/14'
                    }`}
                  >
                    <div className="text-sm font-semibold">{config.label}</div>
                    <div className="mt-2 text-xs leading-5 text-slate-300">{config.detail}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {loading ? <LoadingState label={tab === 'record' ? 'Recording ledger activity...' : 'Refreshing ledger workspace...'} /> : null}
      {error ? <ErrorState message={error} onRetry={tab === 'record' ? undefined : loadData} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="space-y-6">{renderMainLane()}</div>

        <div className="space-y-6">
          <PanelCard title="Ledger brief" subtitle="Keep the current accounting posture visible while moving across the close stack.">
            <div className="grid gap-3">
              <SummaryTile label="Ledger size" value={accounts.length ? `${accounts.length} accts` : 'Standby'} hint="Chart breadth currently loaded in the accounts lane." accent="from-emerald-400/22 via-emerald-300/8 to-transparent" />
              <SummaryTile label="Net income" value={income ? `$${income.net_income.toFixed(2)}` : 'Pending'} hint="Income-statement posture once the P&L lane is loaded." accent="from-violet-400/22 via-violet-300/8 to-transparent" />
              <SummaryTile label="Asset base" value={balance ? `$${balance.total_assets.toFixed(2)}` : `$${totalAccountBalance.toFixed(2)}`} hint="Balance-sheet total assets when available, otherwise rough chart balance total." accent="from-amber-300/22 via-amber-200/8 to-transparent" />
            </div>
          </PanelCard>

          <PanelCard title="Recommended use" subtitle="Keep the accounting workflow legible for finance, operations, and owners.">
            <div className="space-y-3 text-sm leading-6 text-slate-300">
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">1. Start on accounts or trial balance before trustingly reading downstream financial statements.</div>
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">2. Use the record lane for clean operational entries instead of burying them in a generic admin form.</div>
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">3. Treat the P&amp;L and balance sheet as decision surfaces, not just static export screens.</div>
            </div>
          </PanelCard>

          <PanelCard title="Finance handoff" subtitle="Move between billing, payroll, and deeper analysis without losing accounting provenance.">
            <div className="grid gap-3">
              <Link
                to={exportsPath}
                className="block rounded-[22px] border border-emerald-300/20 bg-emerald-300/[0.10] px-4 py-4 text-sm leading-6 text-emerald-50 transition hover:border-emerald-300/32 hover:bg-emerald-300/[0.16]"
              >
                <div className="font-semibold">Open Exports follow-up</div>
                <div className="mt-2 text-emerald-50/80">
                  Carry the current ledger posture into close-cycle exports without reopening the finance stack cold.
                </div>
              </Link>

              <Link
                to={invoicesPath}
                className="block rounded-[22px] border border-violet-300/20 bg-violet-300/[0.10] px-4 py-4 text-sm leading-6 text-violet-50 transition hover:border-violet-300/32 hover:bg-violet-300/[0.16]"
              >
                <div className="font-semibold">Return to Invoices</div>
                <div className="mt-2 text-violet-50/80">
                  Bring the same accounting context back into billing review and collections posture.
                </div>
              </Link>

              <Link
                to={payrollPath}
                className="block rounded-[22px] border border-cyan-300/20 bg-cyan-300/[0.10] px-4 py-4 text-sm leading-6 text-cyan-50 transition hover:border-cyan-300/32 hover:bg-cyan-300/[0.16]"
              >
                <div className="font-semibold">Return to Payroll</div>
                <div className="mt-2 text-cyan-50/80">
                  Re-open workforce pay posture without dropping the ledger handoff chain.
                </div>
              </Link>

              <Link
                to={financialAnalysisPath}
                className="block rounded-[22px] border border-lime-300/20 bg-lime-300/[0.10] px-4 py-4 text-sm leading-6 text-lime-50 transition hover:border-lime-300/32 hover:bg-lime-300/[0.16]"
              >
                <div className="font-semibold">Open Financial Analysis</div>
                <div className="mt-2 text-lime-50/80">
                  Carry ledger posture into NPV, ROI, and breakeven review without restating the upstream record.
                </div>
              </Link>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
