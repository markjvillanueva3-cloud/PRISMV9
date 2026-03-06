/**
 * General Ledger Page — Chart of accounts, trial balance, P&L, balance sheet.
 */
import { useState, useEffect } from 'react';
import { glChartOfAccounts, glTrialBalance, glIncomeStatement, glBalanceSheet, ApiError } from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { GLAccount, TrialBalance, IncomeStatement, BalanceSheet } from '../api/types';

type Tab = 'accounts' | 'trial' | 'pnl' | 'balance';

export function GeneralLedgerPage() {
  const [tab, setTab] = useState<Tab>('accounts');
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [trial, setTrial] = useState<TrialBalance | null>(null);
  const [income, setIncome] = useState<IncomeStatement | null>(null);
  const [balance, setBalance] = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      switch (tab) {
        case 'accounts': {
          const r = await glChartOfAccounts();
          setAccounts((r.result as any)?.accounts ?? []);
          break;
        }
        case 'trial': {
          const r = await glTrialBalance();
          setTrial(r.result as unknown as TrialBalance);
          break;
        }
        case 'pnl': {
          const now = new Date();
          const start = `${now.getFullYear()}-01-01`;
          const end = now.toISOString().slice(0, 10);
          const r = await glIncomeStatement({ period_start: start, period_end: end });
          setIncome(r.result as unknown as IncomeStatement);
          break;
        }
        case 'balance': {
          const r = await glBalanceSheet();
          setBalance(r.result as unknown as BalanceSheet);
          break;
        }
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load GL data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [tab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'accounts', label: 'Chart of Accounts' },
    { key: 'trial', label: 'Trial Balance' },
    { key: 'pnl', label: 'Income Statement' },
    { key: 'balance', label: 'Balance Sheet' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">General Ledger</h1>
        <p className="text-sm text-gray-500 mt-1">Double-entry bookkeeping, trial balance, and financial statements.</p>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded text-sm font-medium ${tab === t.key ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <LoadingState label="Loading..." />}
      {error && <ErrorState message={error} onRetry={loadData} />}

      {/* Chart of Accounts */}
      {tab === 'accounts' && accounts.length > 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Account #</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accounts.map((a) => (
                <tr key={a.number} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono">{a.number}</td>
                  <td className="px-4 py-2 font-medium">{a.name}</td>
                  <td className="px-4 py-2 capitalize">{a.type}</td>
                  <td className="px-4 py-2 text-right font-mono">${a.balance.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Trial Balance */}
      {tab === 'trial' && trial && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {trial.accounts.map((a) => (
                <tr key={a.number} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono">{a.number}</td>
                  <td className="px-4 py-2">{a.name}</td>
                  <td className="px-4 py-2 text-right font-mono">{a.debit > 0 ? `$${a.debit.toFixed(2)}` : ''}</td>
                  <td className="px-4 py-2 text-right font-mono">{a.credit > 0 ? `$${a.credit.toFixed(2)}` : ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td className="px-4 py-2" colSpan={2}>Totals</td>
                <td className="px-4 py-2 text-right font-mono">${trial.total_debits.toFixed(2)}</td>
                <td className="px-4 py-2 text-right font-mono">${trial.total_credits.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2" colSpan={4}>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${trial.balanced ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {trial.balanced ? 'BALANCED' : 'OUT OF BALANCE'}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Income Statement */}
      {tab === 'pnl' && income && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-1">Income Statement (P&L)</h2>
          <p className="text-xs text-gray-500 mb-4">{income.period_start} to {income.period_end}</p>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-green-700 uppercase mb-2">Revenue</h3>
              {income.revenue.map((r) => (
                <div key={r.account} className="flex justify-between py-1 text-sm">
                  <span>{r.account}</span>
                  <span className="font-mono text-green-700">${r.amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between py-1 border-t font-bold text-sm">
                <span>Total Revenue</span>
                <span className="font-mono text-green-700">${income.total_revenue.toFixed(2)}</span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red-700 uppercase mb-2">Expenses</h3>
              {income.expenses.map((e) => (
                <div key={e.account} className="flex justify-between py-1 text-sm">
                  <span>{e.account}</span>
                  <span className="font-mono text-red-700">${e.amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between py-1 border-t font-bold text-sm">
                <span>Total Expenses</span>
                <span className="font-mono text-red-700">${income.total_expenses.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between py-3 border-t-2 border-gray-900 text-lg font-bold">
              <span>Net Income</span>
              <span className={`font-mono ${income.net_income >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                ${income.net_income.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Balance Sheet */}
      {tab === 'balance' && balance && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-1">Balance Sheet</h2>
          <p className="text-xs text-gray-500 mb-4">As of {balance.as_of}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-blue-700 uppercase mb-2">Assets</h3>
              {balance.assets.map((a) => (
                <div key={a.account} className="flex justify-between py-1 text-sm">
                  <span>{a.account}</span>
                  <span className="font-mono">${a.balance.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between py-1 border-t font-bold text-sm">
                <span>Total Assets</span>
                <span className="font-mono">${balance.total_assets.toFixed(2)}</span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-orange-700 uppercase mb-2">Liabilities</h3>
              {balance.liabilities.map((l) => (
                <div key={l.account} className="flex justify-between py-1 text-sm">
                  <span>{l.account}</span>
                  <span className="font-mono">${l.balance.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between py-1 border-t font-bold text-sm mt-2">
                <span>Total Liabilities</span>
                <span className="font-mono">${balance.total_liabilities.toFixed(2)}</span>
              </div>
              <h3 className="text-sm font-semibold text-purple-700 uppercase mt-4 mb-2">Equity</h3>
              {balance.equity.map((e) => (
                <div key={e.account} className="flex justify-between py-1 text-sm">
                  <span>{e.account}</span>
                  <span className="font-mono">${e.balance.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between py-1 border-t font-bold text-sm">
                <span>Total L+E</span>
                <span className="font-mono">${(balance.total_liabilities + balance.total_equity).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
