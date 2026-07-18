/**
 * MCAT-MS0 U-MCAT19: Machine Data Audit Dashboard
 *
 * Displays machine corpus completeness, backfill status, and data quality scores.
 * Follows Calculator Studio design language (PRISM dark theme with glow borders).
 */

import { useCallback, useEffect, useState } from 'react';
import { WorkspaceRecoveryScaffold } from '../components/workspace/WorkspaceRecoveryScaffold';
import {
  ActionButton,
  PanelCard,
  StatusPill,
} from '../components/workspace/WorkspacePrimitives';

interface MachineAuditRecord {
  id: string;
  manufacturer: string;
  model: string;
  type: string;
  spindle_complete: boolean;
  controller_complete: boolean;
  envelope_complete: boolean;
  coolant_complete: boolean;
  backfilled_fields: string[];
  completeness_score: number;
  confidence_overall: number;
}

interface AuditSummary {
  total_machines: number;
  spindle_complete: number;
  controller_complete: number;
  envelope_complete: number;
  coolant_complete: number;
  backfilled_count: number;
  avg_completeness: number;
  avg_confidence: number;
}

type TabId = 'overview' | 'machines' | 'gaps' | 'backfill';

export function MachineDataAuditPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [machines, setMachines] = useState<MachineAuditRecord[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterManufacturer, setFilterManufacturer] = useState<string>('all');
  const [showBackfilledOnly, setShowBackfilledOnly] = useState(false);

  const loadAuditData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/machine-audit');
      if (!response.ok) throw new Error('Failed to load machine audit data');
      const data = await response.json();
      setMachines(data.machines ?? []);
      setSummary(data.summary ?? null);
    } catch (err) {
      // Fail loud (R12): surface the error and render NO data rather than fabricating
      // machine-audit records. A shop-floor app must never display invented machine state.
      setError(err instanceof Error ? err.message : 'Unknown error');
      setMachines([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuditData();
  }, [loadAuditData]);

  const filteredMachines = machines.filter(m => {
    if (filterType !== 'all' && m.type !== filterType) return false;
    if (filterManufacturer !== 'all' && m.manufacturer !== filterManufacturer) return false;
    if (showBackfilledOnly && m.backfilled_fields.length === 0) return false;
    return true;
  });

  const uniqueTypes = [...new Set(machines.map(m => m.type))].sort();
  const uniqueMfrs = [...new Set(machines.map(m => m.manufacturer))].sort();

  const gapMachines = machines.filter(
    m => !m.spindle_complete || !m.controller_complete || !m.envelope_complete
  );

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'machines', label: 'All Machines' },
    { id: 'gaps', label: `Gaps (${gapMachines.length})` },
    { id: 'backfill', label: 'Backfill Status' },
  ];

  const renderCompleteness = (complete: boolean) => (
    <span className={complete ? 'text-emerald-400' : 'text-red-400'}>
      {complete ? '✓' : '✗'}
    </span>
  );

  const renderScoreBar = (score: number, label: string) => {
    const pct = Math.round(score * 100);
    const color = pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500';
    return (
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-sm w-24">{label}</span>
        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-white text-sm w-12 text-right">{pct}%</span>
      </div>
    );
  };

  return (
    <WorkspaceRecoveryScaffold title="Machine Data Audit" subtitle="MCAT-MS0 Corpus Quality">
      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-white/10 pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 border-b-0'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded text-sm flex items-center justify-between gap-4">
            <span>Could not load machine audit data: {error}</span>
            <button
              onClick={loadAuditData}
              className="px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-medium whitespace-nowrap"
            >
              Retry
            </button>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <PanelCard title="Total Machines" glow="cyan">
              <div className="text-4xl font-bold text-cyan-400">{summary.total_machines}</div>
              <div className="text-slate-400 text-sm mt-1">in corpus</div>
            </PanelCard>

            <PanelCard title="Completeness" glow="emerald">
              <div className="text-4xl font-bold text-emerald-400">
                {Math.round(summary.avg_completeness * 100)}%
              </div>
              <div className="text-slate-400 text-sm mt-1">average score</div>
            </PanelCard>

            <PanelCard title="Backfilled" glow="violet">
              <div className="text-4xl font-bold text-violet-400">{summary.backfilled_count}</div>
              <div className="text-slate-400 text-sm mt-1">machines with inferred data</div>
            </PanelCard>

            <PanelCard title="Confidence" glow="amber">
              <div className="text-4xl font-bold text-amber-400">
                {Math.round(summary.avg_confidence * 100)}%
              </div>
              <div className="text-slate-400 text-sm mt-1">average confidence</div>
            </PanelCard>

            <div className="col-span-full">
              <PanelCard title="Data Coverage by Category">
                <div className="space-y-3">
                  {renderScoreBar(summary.spindle_complete / summary.total_machines, 'Spindle')}
                  {renderScoreBar(summary.controller_complete / summary.total_machines, 'Controller')}
                  {renderScoreBar(summary.envelope_complete / summary.total_machines, 'Envelope')}
                  {renderScoreBar(summary.coolant_complete / summary.total_machines, 'Coolant')}
                </div>
              </PanelCard>
            </div>
          </div>
        )}

        {/* Machines Tab */}
        {activeTab === 'machines' && (
          <div className="space-y-4">
            <div className="flex gap-4 items-center">
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="bg-slate-800 border border-slate-600 text-white px-3 py-2 rounded text-sm"
              >
                <option value="all">All Types</option>
                {uniqueTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <select
                value={filterManufacturer}
                onChange={e => setFilterManufacturer(e.target.value)}
                className="bg-slate-800 border border-slate-600 text-white px-3 py-2 rounded text-sm"
              >
                <option value="all">All Manufacturers</option>
                {uniqueMfrs.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <span className="text-slate-400 text-sm">
                Showing {filteredMachines.length} of {machines.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="text-left px-4 py-2 text-slate-400">ID</th>
                    <th className="text-left px-4 py-2 text-slate-400">Manufacturer</th>
                    <th className="text-left px-4 py-2 text-slate-400">Model</th>
                    <th className="text-left px-4 py-2 text-slate-400">Type</th>
                    <th className="text-center px-4 py-2 text-slate-400">Spindle</th>
                    <th className="text-center px-4 py-2 text-slate-400">Controller</th>
                    <th className="text-center px-4 py-2 text-slate-400">Envelope</th>
                    <th className="text-center px-4 py-2 text-slate-400">Coolant</th>
                    <th className="text-right px-4 py-2 text-slate-400">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMachines.slice(0, 100).map(m => (
                    <tr key={m.id} className="border-b border-slate-700 hover:bg-slate-800/50">
                      <td className="px-4 py-2 text-cyan-400 font-mono text-xs">{m.id}</td>
                      <td className="px-4 py-2 text-white">{m.manufacturer}</td>
                      <td className="px-4 py-2 text-white">{m.model}</td>
                      <td className="px-4 py-2">
                        <StatusPill status={m.type} />
                      </td>
                      <td className="px-4 py-2 text-center">{renderCompleteness(m.spindle_complete)}</td>
                      <td className="px-4 py-2 text-center">{renderCompleteness(m.controller_complete)}</td>
                      <td className="px-4 py-2 text-center">{renderCompleteness(m.envelope_complete)}</td>
                      <td className="px-4 py-2 text-center">{renderCompleteness(m.coolant_complete)}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={m.completeness_score >= 0.9 ? 'text-emerald-400' : m.completeness_score >= 0.7 ? 'text-amber-400' : 'text-red-400'}>
                          {Math.round(m.completeness_score * 100)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Gaps Tab */}
        {activeTab === 'gaps' && (
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded">
              <strong>{gapMachines.length}</strong> machines have incomplete critical data
              (spindle, controller, or envelope missing)
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="text-left px-4 py-2 text-slate-400">Machine</th>
                    <th className="text-left px-4 py-2 text-slate-400">Missing Data</th>
                    <th className="text-right px-4 py-2 text-slate-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {gapMachines.slice(0, 50).map(m => {
                    const missing = [];
                    if (!m.spindle_complete) missing.push('Spindle');
                    if (!m.controller_complete) missing.push('Controller');
                    if (!m.envelope_complete) missing.push('Envelope');
                    if (!m.coolant_complete) missing.push('Coolant');

                    return (
                      <tr key={m.id} className="border-b border-slate-700">
                        <td className="px-4 py-2">
                          <div className="text-white">{m.manufacturer} {m.model}</div>
                          <div className="text-slate-500 text-xs">{m.id}</div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1 flex-wrap">
                            {missing.map(field => (
                              <span key={field} className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs">
                                {field}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <ActionButton onClick={() => alert(`Edit ${m.id}`)} variant="secondary" size="small">
                            Edit
                          </ActionButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Backfill Tab */}
        {activeTab === 'backfill' && (
          <div className="space-y-4">
            <div className="flex gap-4 items-center">
              <label className="flex items-center gap-2 text-slate-400 text-sm">
                <input
                  type="checkbox"
                  checked={showBackfilledOnly}
                  onChange={e => setShowBackfilledOnly(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-600"
                />
                Show only backfilled machines
              </label>
            </div>

            <div className="bg-violet-500/10 border border-violet-500/30 text-violet-400 px-4 py-3 rounded">
              <strong>{machines.filter(m => m.backfilled_fields.length > 0).length}</strong> machines
              have backfilled data from manufacturer defaults or physics inference
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="text-left px-4 py-2 text-slate-400">Machine</th>
                    <th className="text-left px-4 py-2 text-slate-400">Backfilled Fields</th>
                    <th className="text-right px-4 py-2 text-slate-400">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMachines
                    .filter(m => !showBackfilledOnly || m.backfilled_fields.length > 0)
                    .slice(0, 50)
                    .map(m => (
                      <tr key={m.id} className="border-b border-slate-700">
                        <td className="px-4 py-2">
                          <div className="text-white">{m.manufacturer} {m.model}</div>
                          <div className="text-slate-500 text-xs">{m.type}</div>
                        </td>
                        <td className="px-4 py-2">
                          {m.backfilled_fields.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {m.backfilled_fields.map(field => (
                                <span key={field} className="bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded text-xs font-mono">
                                  {field}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500">None</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-400 text-xs">
                          {m.backfilled_fields.length > 0 ? 'MCAT-MS0' : '-'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-white/10">
          <ActionButton onClick={loadAuditData} loading={loading}>
            Refresh Data
          </ActionButton>
          <ActionButton variant="secondary" onClick={() => alert('Export functionality')}>
            Export Report
          </ActionButton>
          <ActionButton variant="secondary" onClick={() => alert('Run backfill scripts')}>
            Run Backfill
          </ActionButton>
        </div>
      </div>
    </WorkspaceRecoveryScaffold>
  );
}
