/**
 * Quality Management Page — SPC charts, calibration, NCR tracking, KPIs.
 */
import { useState, useEffect } from 'react';
import { qualityCalibrationDashboard, qualityNCRList, qualityKPIs, ApiError } from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { CalibrationRecord, NCR, QualityKPI } from '../api/types';

type Tab = 'kpis' | 'calibration' | 'ncr';

export function QualityManagementPage() {
  const [tab, setTab] = useState<Tab>('kpis');
  const [kpis, setKpis] = useState<QualityKPI | null>(null);
  const [calibrations, setCalibrations] = useState<CalibrationRecord[]>([]);
  const [ncrs, setNcrs] = useState<NCR[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      switch (tab) {
        case 'kpis': {
          const r = await qualityKPIs();
          setKpis(r.result as unknown as QualityKPI);
          break;
        }
        case 'calibration': {
          const r = await qualityCalibrationDashboard();
          setCalibrations((r.result as any)?.calibrations ?? []);
          break;
        }
        case 'ncr': {
          const r = await qualityNCRList();
          setNcrs((r.result as any)?.ncrs ?? []);
          break;
        }
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load quality data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [tab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'kpis', label: 'Quality KPIs' },
    { key: 'calibration', label: 'Calibration' },
    { key: 'ncr', label: 'NCRs' },
  ];

  const calStatusColors: Record<string, string> = {
    current: 'bg-green-100 text-green-700',
    due_soon: 'bg-yellow-100 text-yellow-700',
    overdue: 'bg-red-100 text-red-700',
  };

  const ncrSeverityColors: Record<string, string> = {
    minor: 'bg-yellow-100 text-yellow-700',
    major: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quality Management</h1>
        <p className="text-sm text-gray-500 mt-1">SPC, calibration tracking, NCR workflow, and quality KPIs.</p>
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

      {/* KPIs */}
      {tab === 'kpis' && kpis && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'First Pass Yield', value: `${kpis.first_pass_yield}%`, good: kpis.first_pass_yield >= 95 },
            { label: 'Scrap Rate', value: `${kpis.scrap_rate}%`, good: kpis.scrap_rate < 3 },
            { label: 'Open NCRs', value: kpis.ncr_count, good: kpis.ncr_count === 0 },
            { label: 'Cal Compliance', value: `${kpis.calibration_compliance}%`, good: kpis.calibration_compliance >= 95 },
            { label: 'FAI Records', value: kpis.fai_count, good: true },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
              <span className="text-xs text-gray-500 block">{k.label}</span>
              <span className={`text-2xl font-bold ${k.good ? 'text-green-600' : 'text-red-600'}`}>{k.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Calibration */}
      {tab === 'calibration' && calibrations.length > 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Equipment</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Last Cal</th>
                <th className="px-4 py-3">Next Due</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {calibrations.map((c) => (
                <tr key={c.equipment_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{c.equipment_name}</td>
                  <td className="px-4 py-2 capitalize">{c.type}</td>
                  <td className="px-4 py-2 font-mono">{c.last_calibration}</td>
                  <td className="px-4 py-2 font-mono">{c.next_calibration}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${calStatusColors[c.status] ?? 'bg-gray-100'}`}>
                      {c.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* NCRs */}
      {tab === 'ncr' && ncrs.length > 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">NCR #</th>
                <th className="px-4 py-3">Job</th>
                <th className="px-4 py-3">Part</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Disposition</th>
                <th className="px-4 py-3">Cost Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ncrs.map((n) => (
                <tr key={n.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono">{n.id}</td>
                  <td className="px-4 py-2">{n.job_id}</td>
                  <td className="px-4 py-2">{n.part_number}</td>
                  <td className="px-4 py-2 max-w-xs truncate">{n.description}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ncrSeverityColors[n.severity] ?? 'bg-gray-100'}`}>
                      {n.severity.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2 capitalize">{n.disposition}</td>
                  <td className="px-4 py-2 font-mono text-red-600">${n.cost_impact.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
