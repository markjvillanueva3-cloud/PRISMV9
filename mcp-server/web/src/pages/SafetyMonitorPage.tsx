/**
 * R5-MS3: Safety Monitor Page
 *
 * Real-time S(x) scores across active jobs, tool life tracking
 * with Taylor curves, and parameter recommendation display.
 *
 * Data sources: prism_validate.safety, prism_calc.tool_life, prism_pfp.analyze
 */
import { useState } from 'react';
import { SafetyBadge } from '../components/SafetyBadge';
import { safetyLevel, type SafetyLevel } from '../api/types';

// ============================================================================
// MOCK DATA — Will connect to bridge endpoints when live
// ============================================================================

interface ActiveJob {
  id: string;
  name: string;
  machine: string;
  material: string;
  operation: string;
  safetyScore: number;
  progress: number;   // 0-100
  toolLifeRemaining: number; // minutes
  toolLifeTotal: number;
  warnings: string[];
}

const MOCK_JOBS: ActiveJob[] = [
  {
    id: 'J-001', name: 'Bracket A-102', machine: 'Haas VF-2',
    material: 'AISI 4140', operation: 'roughing',
    safetyScore: 0.91, progress: 65, toolLifeRemaining: 28, toolLifeTotal: 45,
    warnings: [],
  },
  {
    id: 'J-002', name: 'Housing B-55', machine: 'DMG MORI DMU 50',
    material: '7075-T6', operation: 'finishing',
    safetyScore: 0.78, progress: 30, toolLifeRemaining: 12, toolLifeTotal: 60,
    warnings: ['Tool wear approaching replacement threshold'],
  },
  {
    id: 'J-003', name: 'Shaft C-201', machine: 'Mazak QTN-200',
    material: 'Ti-6Al-4V', operation: 'turning',
    safetyScore: 0.65, progress: 85, toolLifeRemaining: 3, toolLifeTotal: 30,
    warnings: ['Safety below threshold (0.70)', 'Tool life critical — replace soon'],
  },
];

// ============================================================================
// TOOL LIFE BAR
// ============================================================================

function ToolLifeBar({ remaining, total }: { remaining: number; total: number }) {
  const pct = Math.min(100, (remaining / total) * 100);
  const color = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div className={`${color} rounded-full h-2 transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-14 text-right">{remaining}/{total} min</span>
    </div>
  );
}

// ============================================================================
// SAFETY LEVEL INDICATOR (with shape)
// ============================================================================

function SafetyLevelBanner({ score }: { score: number }) {
  const level = safetyLevel(score);
  const config: Record<SafetyLevel, { bg: string; text: string; label: string }> = {
    pass: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', label: 'SAFE' },
    warn: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', label: 'CAUTION' },
    fail: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', label: 'UNSAFE' },
    info: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', label: 'INFO' },
  };
  const c = config[level];
  return (
    <div className={`${c.bg} border rounded px-3 py-1 ${c.text} text-xs font-bold`}>
      {c.label}
    </div>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export function SafetyMonitorPage() {
  const [jobs] = useState<ActiveJob[]>(MOCK_JOBS);

  const overallSafety = jobs.length > 0
    ? jobs.reduce((sum, j) => sum + j.safetyScore, 0) / jobs.length
    : 1.0;

  const criticalCount = jobs.filter(j => j.safetyScore < 0.70).length;
  const warningCount = jobs.filter(j => j.safetyScore >= 0.70 && j.safetyScore < 0.85).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Safety Monitor</h1>
        <p className="text-sm text-gray-500 mt-1">
          Real-time safety scores, tool life tracking, and active job monitoring.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <span className="text-xs text-gray-500 block mb-1">Overall Safety</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{(overallSafety * 100).toFixed(0)}%</span>
            <SafetyBadge score={overallSafety} />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <span className="text-xs text-gray-500 block mb-1">Active Jobs</span>
          <span className="text-2xl font-bold">{jobs.length}</span>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <span className="text-xs text-gray-500 block mb-1">Warnings</span>
          <span className="text-2xl font-bold text-amber-600">{warningCount}</span>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <span className="text-xs text-gray-500 block mb-1">Critical</span>
          <span className="text-2xl font-bold text-red-600">{criticalCount}</span>
        </div>
      </div>

      {/* Active jobs table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Active Jobs</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3">Job</th>
              <th className="px-4 py-3">Machine</th>
              <th className="px-4 py-3">Material</th>
              <th className="px-4 py-3">Safety</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tool Life</th>
              <th className="px-4 py-3">Warnings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobs.map((job) => (
              <tr key={job.id} className={job.safetyScore < 0.70 ? 'bg-red-50' : 'hover:bg-gray-50'}>
                <td className="px-4 py-3">
                  <div className="font-medium">{job.name}</div>
                  <div className="text-xs text-gray-400">{job.id}</div>
                </td>
                <td className="px-4 py-3">{job.machine}</td>
                <td className="px-4 py-3">{job.material}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <SafetyBadge score={job.safetyScore} />
                    <SafetyLevelBanner score={job.safetyScore} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5 w-16">
                      <div className="bg-prism-500 rounded-full h-1.5" style={{ width: `${job.progress}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{job.progress}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 w-40">
                  <ToolLifeBar remaining={job.toolLifeRemaining} total={job.toolLifeTotal} />
                </td>
                <td className="px-4 py-3">
                  {job.warnings.length > 0 ? (
                    <ul className="text-xs text-amber-700 space-y-0.5">
                      {job.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs text-gray-400">None</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
