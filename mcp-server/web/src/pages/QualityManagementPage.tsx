/**
 * Quality Management Page — SPC charts, calibration, NCR tracking, KPIs.
 */
import { useState, useEffect } from 'react';
import {
  qualityCalibrationDashboard, qualityNCRList, qualityKPIs,
  qualityTraceJob, qualityFAIList, qualitySPCChart, qualityNCRCreate,
  qualityCalibrationAdd, qualityMaterialCert, qualityTraceHeatLot, qualityFAICreate, ApiError,
} from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { CalibrationRecord, NCR, QualityKPI, FAI } from '../api/types';

type Tab = 'kpis' | 'calibration' | 'ncr' | 'trace' | 'fai' | 'spc' | 'addcal' | 'matcert';

export function QualityManagementPage() {
  const [tab, setTab] = useState<Tab>('kpis');
  const [kpis, setKpis] = useState<QualityKPI | null>(null);
  const [calibrations, setCalibrations] = useState<CalibrationRecord[]>([]);
  const [ncrs, setNcrs] = useState<NCR[]>([]);
  const [traceResult, setTraceResult] = useState<any>(null);
  const [fais, setFais] = useState<FAI[]>([]);
  const [traceJobId, setTraceJobId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // SPC
  const [spcPartNum, setSpcPartNum] = useState('');
  const [spcDim, setSpcDim] = useState('');
  const [spcResult, setSpcResult] = useState<any>(null);
  // NCR Create
  const [ncrForm, setNcrForm] = useState({
    job_id: '', part_number: '', description: '',
    severity: 'minor', disposition: 'rework',
  });
  const [ncrCreateResult, setNcrCreateResult] = useState<any>(null);
  // Add Calibration
  const [calForm, setCalForm] = useState({
    equipment_id: '', equipment_name: '', type: 'gage',
    interval_days: '365',
  });
  const [calAddResult, setCalAddResult] = useState<any>(null);
  // Material Cert / Heat Lot
  const [heatLot, setHeatLot] = useState('');
  const [matCertResult, setMatCertResult] = useState<any>(null);
  const [heatTraceResult, setHeatTraceResult] = useState<any>(null);
  // FAI Create
  const [faiForm, setFaiForm] = useState({
    part_number: '', job_id: '', inspector: '',
  });
  const [faiCreateResult, setFaiCreateResult] = useState<any>(null);

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
        case 'fai': {
          const r = await qualityFAIList();
          setFais((r.result as any)?.fais ?? (r.result as any) ?? []);
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
    { key: 'trace', label: 'Traceability' },
    { key: 'fai', label: 'FAI' },
    { key: 'spc', label: 'SPC Chart' },
    { key: 'addcal', label: 'Add Cal/NCR/FAI' },
    { key: 'matcert', label: 'Material Cert' },
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

      <div className="flex gap-2 mb-6 flex-wrap">
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
      {/* Traceability */}
      {tab === 'trace' && !loading && (
        <div className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job ID
              </label>
              <input type="text" value={traceJobId}
                onChange={e => setTraceJobId(e.target.value)}
                placeholder="JOB-2026-001"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <button onClick={async () => {
              setLoading(true); setError(null);
              try {
                const r = await qualityTraceJob({ job_id: traceJobId });
                setTraceResult(r.result);
              } catch (e) {
                setError(e instanceof ApiError ? e.message : 'Trace failed');
              } finally { setLoading(false); }
            }}
              className="bg-prism-600 text-white px-4 py-2 rounded text-sm">
              Trace
            </button>
          </div>
          {traceResult && (
            <pre className="bg-white rounded-lg border p-4 text-xs font-mono overflow-auto max-h-96">
              {JSON.stringify(traceResult, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* SPC Chart */}
      {tab === 'spc' && !loading && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">SPC Chart</h2>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Part Number
                </label>
                <input type="text" value={spcPartNum}
                  onChange={e => setSpcPartNum(e.target.value)}
                  placeholder="PART-001"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dimension
                </label>
                <input type="text" value={spcDim}
                  onChange={e => setSpcDim(e.target.value)}
                  placeholder="OD_1"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <button onClick={async () => {
                setLoading(true); setError(null);
                try {
                  const r = await qualitySPCChart({
                    part_number: spcPartNum, dimension: spcDim,
                  });
                  setSpcResult(r.result);
                } catch (e) {
                  setError(e instanceof ApiError ? e.message : 'SPC failed');
                } finally { setLoading(false); }
              }} disabled={!spcPartNum}
                className="bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium
                  disabled:opacity-50">
                Generate
              </button>
            </div>
          </div>
          {spcResult && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                {[
                  { label: 'Mean', value: spcResult.mean?.toFixed(4) ?? '-' },
                  { label: 'Std Dev', value: spcResult.std_dev?.toFixed(4) ?? '-' },
                  { label: 'UCL', value: spcResult.ucl?.toFixed(4) ?? '-' },
                  { label: 'LCL', value: spcResult.lcl?.toFixed(4) ?? '-' },
                  { label: 'Cpk', value: spcResult.cpk?.toFixed(3) ?? '-' },
                ].map(s => (
                  <div key={s.label} className="text-center bg-gray-50 rounded p-2">
                    <span className="text-xs text-gray-500 block">{s.label}</span>
                    <span className="font-mono font-bold">{s.value}</span>
                  </div>
                ))}
              </div>
              {spcResult.data_points && (
                <div className="text-xs text-gray-500">
                  {spcResult.data_points.length} data points
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Calibration / NCR / FAI */}
      {tab === 'addcal' && !loading && (
        <div className="space-y-6">
          {/* Add Calibration */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Add Calibration Record</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equipment ID
                </label>
                <input type="text" value={calForm.equipment_id}
                  onChange={e => setCalForm({ ...calForm, equipment_id: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equipment Name
                </label>
                <input type="text" value={calForm.equipment_name}
                  onChange={e => setCalForm({ ...calForm, equipment_name: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={calForm.type}
                  onChange={e => setCalForm({ ...calForm, type: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  <option value="gage">Gage</option>
                  <option value="micrometer">Micrometer</option>
                  <option value="cmm">CMM</option>
                  <option value="comparator">Comparator</option>
                  <option value="force_gage">Force Gage</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interval (days)
                </label>
                <input type="number" value={calForm.interval_days}
                  onChange={e => setCalForm({
                    ...calForm, interval_days: e.target.value,
                  })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <button onClick={async () => {
              setLoading(true); setError(null);
              try {
                const r = await qualityCalibrationAdd({
                  ...calForm,
                  interval_days: parseInt(calForm.interval_days) || 365,
                });
                setCalAddResult(r.result);
              } catch (e) {
                setError(e instanceof ApiError ? e.message : 'Failed');
              } finally { setLoading(false); }
            }} disabled={!calForm.equipment_id}
              className="mt-4 bg-prism-600 text-white px-6 py-2 rounded text-sm
                font-medium disabled:opacity-50">
              Add Record
            </button>
            {calAddResult && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded
                p-3 text-sm text-green-800">
                Calibration record added.
              </div>
            )}
          </div>

          {/* Create NCR */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Create NCR</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job ID
                </label>
                <input type="text" value={ncrForm.job_id}
                  onChange={e => setNcrForm({ ...ncrForm, job_id: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Part Number
                </label>
                <input type="text" value={ncrForm.part_number}
                  onChange={e => setNcrForm({
                    ...ncrForm, part_number: e.target.value,
                  })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity
                </label>
                <select value={ncrForm.severity}
                  onChange={e => setNcrForm({ ...ncrForm, severity: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  <option value="minor">Minor</option>
                  <option value="major">Major</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disposition
                </label>
                <select value={ncrForm.disposition}
                  onChange={e => setNcrForm({
                    ...ncrForm, disposition: e.target.value,
                  })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  <option value="rework">Rework</option>
                  <option value="scrap">Scrap</option>
                  <option value="use_as_is">Use As-Is</option>
                  <option value="return_to_vendor">Return to Vendor</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input type="text" value={ncrForm.description}
                  onChange={e => setNcrForm({
                    ...ncrForm, description: e.target.value,
                  })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <button onClick={async () => {
              setLoading(true); setError(null);
              try {
                const r = await qualityNCRCreate(ncrForm);
                setNcrCreateResult(r.result);
              } catch (e) {
                setError(e instanceof ApiError ? e.message : 'Failed');
              } finally { setLoading(false); }
            }} disabled={!ncrForm.job_id || !ncrForm.description}
              className="mt-4 bg-red-600 text-white px-6 py-2 rounded text-sm
                font-medium disabled:opacity-50">
              Create NCR
            </button>
            {ncrCreateResult && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded
                p-3 text-sm text-green-800">
                NCR created: {JSON.stringify(ncrCreateResult)}
              </div>
            )}
          </div>

          {/* Create FAI */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Create FAI</h2>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Part Number
                </label>
                <input type="text" value={faiForm.part_number}
                  onChange={e => setFaiForm({
                    ...faiForm, part_number: e.target.value,
                  })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job ID
                </label>
                <input type="text" value={faiForm.job_id}
                  onChange={e => setFaiForm({ ...faiForm, job_id: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inspector
                </label>
                <input type="text" value={faiForm.inspector}
                  onChange={e => setFaiForm({
                    ...faiForm, inspector: e.target.value,
                  })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <button onClick={async () => {
                setLoading(true); setError(null);
                try {
                  const r = await qualityFAICreate(faiForm);
                  setFaiCreateResult(r.result);
                } catch (e) {
                  setError(e instanceof ApiError ? e.message : 'Failed');
                } finally { setLoading(false); }
              }} disabled={!faiForm.part_number}
                className="bg-green-600 text-white px-4 py-2 rounded text-sm
                  font-medium disabled:opacity-50">
                Create
              </button>
            </div>
            {faiCreateResult && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded
                p-3 text-sm text-green-800">
                FAI created: {JSON.stringify(faiCreateResult)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Material Cert / Heat Lot */}
      {tab === 'matcert' && !loading && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">
              Material Certificate / Heat Lot Trace
            </h2>
            <div className="flex gap-3 items-end">
              <div className="flex-1 max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heat/Lot Number
                </label>
                <input type="text" value={heatLot}
                  onChange={e => setHeatLot(e.target.value)}
                  placeholder="HT-2026-001"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <button onClick={async () => {
                setLoading(true); setError(null);
                try {
                  const r = await qualityMaterialCert({ heat_lot: heatLot });
                  setMatCertResult(r.result);
                } catch (e) {
                  setError(e instanceof ApiError ? e.message : 'Failed');
                } finally { setLoading(false); }
              }} disabled={!heatLot}
                className="bg-prism-600 text-white px-4 py-2 rounded text-sm
                  font-medium disabled:opacity-50">
                Get Cert
              </button>
              <button onClick={async () => {
                setLoading(true); setError(null);
                try {
                  const r = await qualityTraceHeatLot({ heat_lot: heatLot });
                  setHeatTraceResult(r.result);
                } catch (e) {
                  setError(e instanceof ApiError ? e.message : 'Failed');
                } finally { setLoading(false); }
              }} disabled={!heatLot}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm
                  font-medium disabled:opacity-50">
                Trace Lot
              </button>
            </div>
          </div>
          {matCertResult && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-bold mb-2">Material Certificate</h3>
              <pre className="text-xs font-mono overflow-auto max-h-64">
                {JSON.stringify(matCertResult, null, 2)}
              </pre>
            </div>
          )}
          {heatTraceResult && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-bold mb-2">Heat Lot Trace</h3>
              <pre className="text-xs font-mono overflow-auto max-h-64">
                {JSON.stringify(heatTraceResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* FAI */}
      {tab === 'fai' && fais.length > 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-3">FAI ID</th>
                <th className="px-4 py-3">Part</th>
                <th className="px-4 py-3">Job</th>
                <th className="px-4 py-3">Inspector</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fais.map(f => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">{f.id}</td>
                  <td className="px-4 py-2 font-medium">{f.part_number}</td>
                  <td className="px-4 py-2">{f.job_id}</td>
                  <td className="px-4 py-2">{f.inspector}</td>
                  <td className="px-4 py-2 text-xs">{f.date}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      f.overall_pass
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {f.overall_pass ? 'PASS' : 'FAIL'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
