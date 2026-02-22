/**
 * R5-MS2: Job Planner Page
 *
 * Full-screen job planning interface. Operator selects material,
 * operation, and machine, then generates a multi-pass plan with
 * operations table, G-code preview, and safety scoring.
 *
 * Data source: /api/v1/job-plan (prism_intelligence.job_plan)
 */
import { useState } from 'react';
import { createJobPlan, ApiError } from '../api/client';
import { SafetyBadge } from '../components/SafetyBadge';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { JobPlanResult } from '../api/types';

const MATERIALS = [
  'AISI 4140', 'AISI 1045', 'AISI 304', 'AISI 316L',
  '6061-T6', '7075-T6', 'Ti-6Al-4V', 'Inconel 718',
] as const;

const OPERATIONS = [
  'bracket', 'housing', 'shaft', 'flange', 'pocket', 'contour',
] as const;

const MACHINES = [
  'Haas VF-2', 'DMG MORI DMU 50', 'Mazak QTN-200', 'Okuma LB3000',
] as const;

export function JobPlannerPage() {
  const [material, setMaterial] = useState(MATERIALS[0]);
  const [operation, setOperation] = useState(OPERATIONS[0]);
  const [machine, setMachine] = useState(MACHINES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<JobPlanResult | null>(null);
  const [safetyScore, setSafetyScore] = useState<number>(0);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const resp = await createJobPlan({ material, operation, machine });
      const r = resp.result as unknown as JobPlanResult;
      setPlan(r);
      setSafetyScore(resp.safety.score);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Job Planner</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generate multi-pass machining plans with safety analysis.
        </p>
      </div>

      {/* Input form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="jp-material" className="block text-sm font-medium text-gray-700 mb-1">
              Material
            </label>
            <select
              id="jp-material"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500"
            >
              {MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="jp-operation" className="block text-sm font-medium text-gray-700 mb-1">
              Part Type
            </label>
            <select
              id="jp-operation"
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500"
            >
              {OPERATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="jp-machine" className="block text-sm font-medium text-gray-700 mb-1">
              Machine
            </label>
            <select
              id="jp-machine"
              value={machine}
              onChange={(e) => setMachine(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500"
            >
              {MACHINES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-prism-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Generate Plan
          </button>
        </div>
      </div>

      {/* Results */}
      {loading && <LoadingState label="Generating machining plan..." />}
      {error && <ErrorState message={error} onRetry={handleGenerate} />}

      {plan && !loading && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex items-center justify-between">
            <div className="flex gap-6">
              <div>
                <span className="text-xs text-gray-500 block">Total Time</span>
                <span className="text-xl font-bold">{plan.total_time_min.toFixed(1)} min</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Operations</span>
                <span className="text-xl font-bold">{plan.operations.length}</span>
              </div>
            </div>
            <SafetyBadge score={safetyScore} />
          </div>

          {/* Operations table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Operation</th>
                  <th className="px-4 py-3">Tool</th>
                  <th className="px-4 py-3">Speed (RPM)</th>
                  <th className="px-4 py-3">Feed (mm/rev)</th>
                  <th className="px-4 py-3">DOC (mm)</th>
                  <th className="px-4 py-3">Time (min)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plan.operations.map((op) => (
                  <tr key={op.sequence} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-gray-400">{op.sequence}</td>
                    <td className="px-4 py-2 font-medium">{op.type}</td>
                    <td className="px-4 py-2">{op.tool}</td>
                    <td className="px-4 py-2 font-mono">{op.speed_rpm}</td>
                    <td className="px-4 py-2 font-mono">{op.feed_mmrev}</td>
                    <td className="px-4 py-2 font-mono">{op.doc_mm}</td>
                    <td className="px-4 py-2 font-mono">{op.time_min.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* G-code preview (if available) */}
          {plan.gcode_preview && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-medium text-gray-700 mb-2">G-Code Preview</h3>
              <pre className="bg-gray-900 text-green-400 rounded p-4 text-xs font-mono overflow-x-auto max-h-64">
                {plan.gcode_preview}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
