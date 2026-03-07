/**
 * Financial Analysis Page — NPV, IRR, Machine Investment analysis.
 */
import { useState } from 'react';
import {
  financialNPV, financialIRR, financialBreakeven,
  financialMachineInvestment, ApiError,
} from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';

type Tab = 'npv' | 'irr' | 'machine' | 'breakeven';

export function FinancialAnalysisPage() {
  const [tab, setTab] = useState<Tab>('npv');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NPV state
  const [discountRate, setDiscountRate] = useState('10');
  const [initialInv, setInitialInv] = useState('150000');
  const [cashFlows, setCashFlows] = useState('40000,45000,50000,55000,60000');

  // IRR state
  const [irrInitial, setIrrInitial] = useState('200000');
  const [irrFlows, setIrrFlows] = useState('50000,60000,70000,80000,90000');

  // Machine Investment state
  const [machineCost, setMachineCost] = useState('250000');
  const [installCost, setInstallCost] = useState('15000');
  const [annualRevenue, setAnnualRevenue] = useState('120000');
  const [annualCost, setAnnualCost] = useState('45000');
  const [machineLife, setMachineLife] = useState('10');
  const [salvage, setSalvage] = useState('25000');

  // Breakeven state
  const [fixedCosts, setFixedCosts] = useState('50000');
  const [unitPrice, setUnitPrice] = useState('150');
  const [varCost, setVarCost] = useState('85');

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let r;
      switch (tab) {
        case 'npv':
          r = await financialNPV({
            discount_rate: parseFloat(discountRate) / 100,
            initial_investment: parseFloat(initialInv),
            cash_flows: cashFlows.split(',').map(Number),
          });
          break;
        case 'irr':
          r = await financialIRR({
            initial_investment: parseFloat(irrInitial),
            cash_flows: irrFlows.split(',').map(Number),
          });
          break;
        case 'machine':
          r = await financialMachineInvestment({
            machine_cost: parseFloat(machineCost),
            installation_cost: parseFloat(installCost),
            annual_revenue: parseFloat(annualRevenue),
            annual_operating_cost: parseFloat(annualCost),
            useful_life_years: parseInt(machineLife),
            salvage_value: parseFloat(salvage),
            discount_rate: parseFloat(discountRate) / 100,
          });
          break;
        case 'breakeven':
          r = await financialBreakeven({
            fixed_costs: parseFloat(fixedCosts),
            unit_price: parseFloat(unitPrice),
            variable_cost_per_unit: parseFloat(varCost),
          });
          break;
      }
      setResult(r?.result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'npv', label: 'NPV Analysis' },
    { key: 'irr', label: 'IRR Calculator' },
    { key: 'machine', label: 'Machine Investment' },
    { key: 'breakeven', label: 'Breakeven' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Financial Analysis</h1>
        <p className="text-sm text-gray-500 mt-1">
          Capital budgeting tools: NPV, IRR, machine ROI, and breakeven analysis.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button key={t.key}
            onClick={() => { setTab(t.key); setResult(null); }}
            className={`px-4 py-2 rounded text-sm font-medium ${
              tab === t.key ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* NPV Form */}
      {tab === 'npv' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4">Net Present Value</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Rate (%)
              </label>
              <input type="number" value={discountRate}
                onChange={e => setDiscountRate(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Initial Investment ($)
              </label>
              <input type="number" value={initialInv}
                onChange={e => setInitialInv(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cash Flows (comma-separated)
              </label>
              <input type="text" value={cashFlows}
                onChange={e => setCashFlows(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <button onClick={runAnalysis} disabled={loading}
            className="mt-4 bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-prism-700 disabled:opacity-50">
            Calculate NPV
          </button>
        </div>
      )}

      {/* IRR Form */}
      {tab === 'irr' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4">Internal Rate of Return</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Initial Investment ($)
              </label>
              <input type="number" value={irrInitial}
                onChange={e => setIrrInitial(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cash Flows (comma-separated)
              </label>
              <input type="text" value={irrFlows}
                onChange={e => setIrrFlows(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <button onClick={runAnalysis} disabled={loading}
            className="mt-4 bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-prism-700 disabled:opacity-50">
            Calculate IRR
          </button>
        </div>
      )}

      {/* Machine Investment Form */}
      {tab === 'machine' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4">Machine Investment Analysis</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Machine Cost ($)</label>
              <input type="number" value={machineCost} onChange={e => setMachineCost(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Install Cost ($)</label>
              <input type="number" value={installCost} onChange={e => setInstallCost(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Annual Revenue ($)</label>
              <input type="number" value={annualRevenue} onChange={e => setAnnualRevenue(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Annual Oper. Cost ($)</label>
              <input type="number" value={annualCost} onChange={e => setAnnualCost(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Useful Life (years)</label>
              <input type="number" value={machineLife} onChange={e => setMachineLife(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salvage Value ($)</label>
              <input type="number" value={salvage} onChange={e => setSalvage(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <button onClick={runAnalysis} disabled={loading}
            className="mt-4 bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-prism-700 disabled:opacity-50">
            Analyze Investment
          </button>
        </div>
      )}

      {/* Breakeven Form */}
      {tab === 'breakeven' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4">Breakeven Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Costs ($)</label>
              <input type="number" value={fixedCosts} onChange={e => setFixedCosts(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price ($)</label>
              <input type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Variable Cost/Unit ($)</label>
              <input type="number" value={varCost} onChange={e => setVarCost(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <button onClick={runAnalysis} disabled={loading}
            className="mt-4 bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-prism-700 disabled:opacity-50">
            Calculate Breakeven
          </button>
        </div>
      )}

      {loading && <LoadingState label="Calculating..." />}
      {error && <ErrorState message={error} onRetry={runAnalysis} />}

      {/* Results */}
      {result && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Results</h3>
          {tab === 'npv' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <span className="text-xs text-gray-500 block">NPV</span>
                <span className={`text-xl font-bold ${(result.npv ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${(result.npv ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="text-center">
                <span className="text-xs text-gray-500 block">Decision</span>
                <span className={`text-lg font-bold ${(result.npv ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(result.npv ?? 0) >= 0 ? 'ACCEPT' : 'REJECT'}
                </span>
              </div>
              <div className="text-center">
                <span className="text-xs text-gray-500 block">Payback Period</span>
                <span className="text-xl font-bold">
                  {result.payback_years?.toFixed(1) ?? '-'} yrs
                </span>
              </div>
              <div className="text-center">
                <span className="text-xs text-gray-500 block">PI (Profitability Index)</span>
                <span className="text-xl font-bold">
                  {result.profitability_index?.toFixed(2) ?? '-'}
                </span>
              </div>
            </div>
          )}

          {tab === 'irr' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <span className="text-xs text-gray-500 block">IRR</span>
                <span className="text-xl font-bold text-prism-600">
                  {((result.irr ?? 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-center">
                <span className="text-xs text-gray-500 block">NPV at Discount Rate</span>
                <span className="text-xl font-bold">
                  ${(result.npv ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="text-center">
                <span className="text-xs text-gray-500 block">Decision</span>
                <span className={`text-lg font-bold ${(result.irr ?? 0) > 0.1 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {(result.irr ?? 0) > 0.1 ? 'INVEST' : 'REVIEW'}
                </span>
              </div>
            </div>
          )}

          {tab === 'machine' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'NPV', value: `$${(result.npv ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
                  { label: 'IRR', value: `${((result.irr ?? 0) * 100).toFixed(1)}%` },
                  { label: 'Payback', value: `${result.payback_years?.toFixed(1) ?? '-'} yrs` },
                  { label: 'ROI', value: `${((result.roi ?? 0) * 100).toFixed(1)}%` },
                  { label: 'Decision', value: result.recommendation ?? ((result.npv ?? 0) >= 0 ? 'INVEST' : 'PASS') },
                ].map(c => (
                  <div key={c.label} className="bg-gray-50 rounded-lg p-3 text-center">
                    <span className="text-xs text-gray-500 block">{c.label}</span>
                    <span className="text-lg font-bold">{c.value}</span>
                  </div>
                ))}
              </div>
              {result.annual_depreciation != null && (
                <div className="text-sm text-gray-600">
                  Annual depreciation: ${result.annual_depreciation?.toLocaleString()}/yr
                  {result.tax_shield != null && ` | Tax shield: $${result.tax_shield?.toLocaleString()}/yr`}
                </div>
              )}
            </div>
          )}

          {tab === 'breakeven' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Breakeven Units', value: result.breakeven_units?.toFixed(0) ?? '-' },
                { label: 'Breakeven Revenue', value: `$${(result.breakeven_revenue ?? 0).toLocaleString()}` },
                { label: 'Margin of Safety', value: `${(result.margin_of_safety_pct ?? 0).toFixed(1)}%` },
                { label: 'Contribution Margin', value: `$${(result.contribution_margin ?? 0).toFixed(2)}` },
              ].map(c => (
                <div key={c.label} className="bg-gray-50 rounded-lg p-3 text-center">
                  <span className="text-xs text-gray-500 block">{c.label}</span>
                  <span className="text-xl font-bold text-gray-900">{c.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
