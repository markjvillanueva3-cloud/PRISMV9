/**
 * Exports & Integration Page — QuickBooks/CSV export, bank reconciliation, format listing.
 */
import { useState, useEffect } from 'react';
import {
  integrationFormats, integrationReconcileBank,
  integrationExportQB, integrationExportPayrollTax, integrationExportARAging,
  ApiError,
} from '../api/shop';
import { LoadingState, ErrorState } from '../components/shared/LoadingState';
import type { ExportFormat, BankReconciliation } from '../api/shopTypes';

type Tab = 'formats' | 'reconcile' | 'quickbooks' | 'payroll' | 'araging';

export function ExportsPage() {
  const [tab, setTab] = useState<Tab>('formats');
  const [formats, setFormats] = useState<ExportFormat[]>([]);
  const [recon, setRecon] = useState<BankReconciliation | null>(null);
  const [exportResult, setExportResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconForm, setReconForm] = useState({
    statement_date: new Date().toISOString().slice(0, 10),
    bank_balance: '',
    book_balance: '',
  });

  async function loadFormats() {
    setLoading(true);
    setError(null);
    try {
      const r = await integrationFormats();
      setFormats((r.result as any)?.formats ?? (r.result as any) ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load formats');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'formats') loadFormats();
  }, [tab]);

  async function handleReconcile() {
    setLoading(true);
    setError(null);
    try {
      const r = await integrationReconcileBank({
        statement_date: reconForm.statement_date,
        bank_balance: parseFloat(reconForm.bank_balance) || 0,
        book_balance: parseFloat(reconForm.book_balance) || 0,
        deposits_in_transit: [],
        outstanding_checks: [],
      });
      setRecon(r.result as unknown as BankReconciliation);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to reconcile');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Exports & Integration</h1>
        <p className="text-sm text-gray-500 mt-1">Export to QuickBooks, CSV, and reconcile bank statements.</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('formats')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'formats' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Export Formats
        </button>
        <button onClick={() => setTab('reconcile')}
          className={`px-4 py-2 rounded text-sm font-medium ${
            tab === 'reconcile'
              ? 'bg-prism-600 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}>
          Bank Reconciliation
        </button>
        <button onClick={() => setTab('quickbooks')}
          className={`px-4 py-2 rounded text-sm font-medium ${
            tab === 'quickbooks'
              ? 'bg-prism-600 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}>
          QuickBooks
        </button>
        <button onClick={() => setTab('payroll')}
          className={`px-4 py-2 rounded text-sm font-medium ${
            tab === 'payroll'
              ? 'bg-prism-600 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}>
          Payroll/Tax
        </button>
        <button onClick={() => setTab('araging')}
          className={`px-4 py-2 rounded text-sm font-medium ${
            tab === 'araging'
              ? 'bg-prism-600 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}>
          AR Aging
        </button>
      </div>

      {loading && <LoadingState label="Loading..." />}
      {error && <ErrorState message={error} onRetry={tab === 'formats' ? loadFormats : handleReconcile} />}

      {/* Formats */}
      {tab === 'formats' && formats.length > 0 && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formats.map((f) => (
            <div key={f.format} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900">{f.format}</h3>
              <p className="text-sm text-gray-600 mt-1">{f.description}</p>
              <p className="text-xs text-gray-500 mt-2">Use case: {f.use_case}</p>
            </div>
          ))}
        </div>
      )}

      {/* Bank Reconciliation */}
      {tab === 'reconcile' && !loading && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Reconcile Bank Statement</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statement Date</label>
                <input type="date" value={reconForm.statement_date}
                  onChange={(e) => setReconForm({ ...reconForm, statement_date: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Balance</label>
                <input type="number" value={reconForm.bank_balance}
                  onChange={(e) => setReconForm({ ...reconForm, bank_balance: e.target.value })}
                  placeholder="50000.00"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500" />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Book Balance</label>
                  <input type="number" value={reconForm.book_balance}
                    onChange={(e) => setReconForm({ ...reconForm, book_balance: e.target.value })}
                    placeholder="48500.00"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500" />
                </div>
                <button onClick={handleReconcile}
                  className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700">
                  Reconcile
                </button>
              </div>
            </div>
          </div>

          {recon && (
            <div className={`rounded-lg border p-6 shadow-sm ${recon.reconciled ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <h3 className={`text-lg font-semibold ${recon.reconciled ? 'text-green-800' : 'text-red-800'}`}>
                {recon.reconciled ? 'Reconciled Successfully' : 'Reconciliation Mismatch'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <span className="text-xs text-gray-500 block">Bank Balance</span>
                  <span className="text-lg font-mono font-bold">${recon.bank_balance.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Adjusted Bank</span>
                  <span className="text-lg font-mono font-bold">${recon.adjusted_bank.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Book Balance</span>
                  <span className="text-lg font-mono font-bold">${recon.book_balance.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Difference</span>
                  <span className={`text-lg font-mono font-bold ${recon.difference === 0 ? 'text-green-700' : 'text-red-700'}`}>
                    ${recon.difference.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* QuickBooks Export */}
      {tab === 'quickbooks' && !loading && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">QuickBooks Export</h2>
            <p className="text-sm text-gray-500 mb-4">
              Export transactions in QuickBooks-compatible IIF format.
            </p>
            <button onClick={async () => {
              setLoading(true); setError(null);
              try {
                const r = await integrationExportQB({
                  period_start: new Date(
                    Date.now() - 30 * 86400000
                  ).toISOString().slice(0, 10),
                  period_end: new Date().toISOString().slice(0, 10),
                });
                setExportResult(r.result);
              } catch (e) {
                setError(
                  e instanceof ApiError ? e.message : 'Export failed'
                );
              } finally { setLoading(false); }
            }}
              className="bg-green-600 text-white px-6 py-2 rounded text-sm font-medium">
              Generate QB Export
            </button>
          </div>
          {exportResult && (
            <pre className="bg-white rounded-lg border p-4 text-xs font-mono overflow-auto max-h-96">
              {JSON.stringify(exportResult, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Payroll/Tax Export */}
      {tab === 'payroll' && !loading && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">
              Payroll & Tax Export
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Generate payroll tax filings and W-2 summaries.
            </p>
            <button onClick={async () => {
              setLoading(true); setError(null);
              try {
                const r = await integrationExportPayrollTax({
                  year: new Date().getFullYear(),
                  quarter: Math.ceil((new Date().getMonth() + 1) / 3),
                });
                setExportResult(r.result);
              } catch (e) {
                setError(
                  e instanceof ApiError ? e.message : 'Export failed'
                );
              } finally { setLoading(false); }
            }}
              className="bg-green-600 text-white px-6 py-2 rounded text-sm font-medium">
              Generate Payroll Report
            </button>
          </div>
          {exportResult && (
            <pre className="bg-white rounded-lg border p-4 text-xs font-mono overflow-auto max-h-96">
              {JSON.stringify(exportResult, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* AR Aging */}
      {tab === 'araging' && !loading && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">
              Accounts Receivable Aging
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              View outstanding customer invoices by age bucket.
            </p>
            <button onClick={async () => {
              setLoading(true); setError(null);
              try {
                const r = await integrationExportARAging();
                setExportResult(r.result);
              } catch (e) {
                setError(
                  e instanceof ApiError ? e.message : 'Export failed'
                );
              } finally { setLoading(false); }
            }}
              className="bg-green-600 text-white px-6 py-2 rounded text-sm font-medium">
              Load AR Aging
            </button>
          </div>
          {exportResult && (
            <pre className="bg-white rounded-lg border p-4 text-xs font-mono overflow-auto max-h-96">
              {JSON.stringify(exportResult, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
