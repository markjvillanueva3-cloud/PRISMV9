/**
 * CADRegenerationDashboardPage.tsx — U-CADC25
 *
 * Tracks CAD regeneration test progress toward 100% pass rate.
 * Shows metrics by file type, complexity level, and failure categories.
 *
 * SAFETY NOTICE: 100% pass rate is REQUIRED for safety-critical machining.
 * These parts end up in aircraft, medical devices, automotive safety systems.
 */

import { useEffect, useState, useMemo } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RegenerationMetrics {
  totalTests: number;
  passed: number;
  failed: number;
  errors: number;
  passRate: number;
  target: 100; // Always 100% for safety-critical
}

interface ComplexityBreakdown {
  simple: RegenerationMetrics;
  medium: RegenerationMetrics;
  high: RegenerationMetrics;
}

interface PartTypeMetrics {
  partType: string;
  tested: number;
  passed: number;
  failed: number;
  passRate: number;
}

interface FailureCategory {
  category: string;
  count: number;
  description: string;
  priority: 'P0' | 'P1' | 'P2';
}

interface RegenerationDashboardData {
  lastUpdated: string;
  overall: RegenerationMetrics;
  byComplexity: ComplexityBreakdown;
  byPartType: PartTypeMetrics[];
  failureCategories: FailureCategory[];
  gapToTarget: number;
  estimatedFixEffort: string;
}

// ─── Mock Data (replace with API call) ───────────────────────────────────────

function getMockData(): RegenerationDashboardData {
  return {
    lastUpdated: new Date().toISOString(),
    overall: {
      totalTests: 200,
      passed: 161,
      failed: 32,
      errors: 7,
      passRate: 80.5,
      target: 100,
    },
    byComplexity: {
      simple: {
        totalTests: 100,
        passed: 94,
        failed: 4,
        errors: 2,
        passRate: 94,
        target: 100,
      },
      medium: {
        totalTests: 100,
        passed: 67,
        failed: 28,
        errors: 5,
        passRate: 67,
        target: 100,
      },
      high: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        errors: 0,
        passRate: 0,
        target: 100,
      },
    },
    byPartType: [
      { partType: 'Box', tested: 25, passed: 24, failed: 1, passRate: 96 },
      { partType: 'Cylinder', tested: 20, passed: 19, failed: 1, passRate: 95 },
      { partType: 'Plate', tested: 20, passed: 20, failed: 0, passRate: 100 },
      { partType: 'Bracket', tested: 18, passed: 16, failed: 2, passRate: 89 },
      { partType: 'Flange', tested: 17, passed: 15, failed: 2, passRate: 88 },
      { partType: 'Casing', tested: 22, passed: 18, failed: 4, passRate: 82 },
      { partType: 'Die', tested: 25, passed: 14, failed: 11, passRate: 56 },
      { partType: 'Punch', tested: 20, passed: 12, failed: 8, passRate: 60 },
      { partType: 'Stripper', tested: 15, passed: 11, failed: 4, passRate: 73 },
      { partType: 'Bushing', tested: 10, passed: 8, failed: 2, passRate: 80 },
      { partType: 'Pilot', tested: 8, passed: 4, failed: 4, passRate: 50 },
    ],
    failureCategories: [
      { category: 'Progressive Die Station Detection', count: 8, description: 'Multi-station cavities merged', priority: 'P0' },
      { category: 'Punch Tip Geometry', count: 6, description: 'Point geometry over-simplified', priority: 'P0' },
      { category: 'Hole Pattern Recognition', count: 4, description: 'Bolt circles not detected', priority: 'P1' },
      { category: 'Pocket Depth Accuracy', count: 3, description: 'Relief pocket depth wrong', priority: 'P1' },
      { category: 'Form Profile Preservation', count: 3, description: 'Forming contours lost', priority: 'P1' },
      { category: 'Rib Feature Recognition', count: 2, description: 'Rib patterns not detected', priority: 'P1' },
      { category: 'Fillet Dimension Extraction', count: 2, description: 'Fillet radius wrong', priority: 'P1' },
      { category: 'Slot/Pocket Separation', count: 2, description: 'Slots merged into pockets', priority: 'P1' },
      { category: 'AP203 STEP Support', count: 1, description: 'Legacy STEP format', priority: 'P2' },
      { category: 'Unicode Path Handling', count: 2, description: 'Non-ASCII filenames', priority: 'P2' },
      { category: 'File Validation', count: 2, description: 'Corrupt/encrypted files', priority: 'P2' },
      { category: 'Memory Limits', count: 1, description: 'Large file streaming', priority: 'P2' },
    ],
    gapToTarget: 39, // 39 failures/errors to fix to reach 100%
    estimatedFixEffort: '3-4 sessions',
  };
}

// ─── Components ──────────────────────────────────────────────────────────────

function SafetyBanner() {
  return (
    <div className="mb-6 rounded-lg border border-rose-500/40 bg-rose-900/20 p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">⛔</span>
        <div>
          <div className="font-semibold text-rose-200">100% Pass Rate Required</div>
          <div className="text-sm text-rose-300/80">
            Safety-critical machining code. Parts go into aircraft, medical devices, automotive.
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressRing({ value, size = 120 }: { value: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const color = value === 100 ? '#10b981' : value >= 90 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={10}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{value.toFixed(1)}%</span>
        <span className="text-xs text-slate-400">of 100%</span>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subValue,
  status
}: {
  label: string;
  value: number | string;
  subValue?: string;
  status: 'pass' | 'fail' | 'warning' | 'neutral';
}) {
  const statusColors = {
    pass: 'border-emerald-400/30 bg-emerald-900/20',
    fail: 'border-rose-400/30 bg-rose-900/20',
    warning: 'border-amber-400/30 bg-amber-900/20',
    neutral: 'border-slate-400/20 bg-slate-800/40',
  };

  const textColors = {
    pass: 'text-emerald-300',
    fail: 'text-rose-300',
    warning: 'text-amber-300',
    neutral: 'text-slate-200',
  };

  return (
    <div className={`rounded-lg border p-4 ${statusColors[status]}`}>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${textColors[status]}`}>{value}</div>
      {subValue && <div className="mt-1 text-xs text-slate-500">{subValue}</div>}
    </div>
  );
}

function ComplexityBar({
  label,
  metrics
}: {
  label: string;
  metrics: RegenerationMetrics;
}) {
  const passWidth = metrics.totalTests > 0
    ? (metrics.passed / metrics.totalTests) * 100
    : 0;
  const failWidth = metrics.totalTests > 0
    ? (metrics.failed / metrics.totalTests) * 100
    : 0;
  const errorWidth = metrics.totalTests > 0
    ? (metrics.errors / metrics.totalTests) * 100
    : 0;

  const isComplete = metrics.passRate === 100;
  const isEmpty = metrics.totalTests === 0;

  return (
    <div className="mb-4">
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium text-slate-200">{label}</span>
        <span className={isComplete ? 'text-emerald-400' : isEmpty ? 'text-slate-500' : 'text-rose-400'}>
          {isEmpty ? 'Not tested' : `${metrics.passRate.toFixed(1)}%`}
        </span>
      </div>
      <div className="flex h-3 overflow-hidden rounded bg-slate-800">
        <div
          className="bg-emerald-500 transition-all"
          style={{ width: `${passWidth}%` }}
        />
        <div
          className="bg-rose-500 transition-all"
          style={{ width: `${failWidth}%` }}
        />
        <div
          className="bg-amber-500 transition-all"
          style={{ width: `${errorWidth}%` }}
        />
      </div>
      <div className="mt-1 flex gap-4 text-xs text-slate-500">
        <span>{metrics.passed} passed</span>
        <span>{metrics.failed} failed</span>
        <span>{metrics.errors} errors</span>
      </div>
    </div>
  );
}

function PartTypeTable({ data }: { data: PartTypeMetrics[] }) {
  const sorted = useMemo(() =>
    [...data].sort((a, b) => a.passRate - b.passRate),
    [data]
  );

  return (
    <div className="overflow-hidden rounded-lg border border-slate-700/50">
      <table className="w-full text-sm">
        <thead className="bg-slate-800/60">
          <tr>
            <th className="px-4 py-2 text-left text-xs uppercase tracking-wide text-slate-400">Part Type</th>
            <th className="px-4 py-2 text-right text-xs uppercase tracking-wide text-slate-400">Tested</th>
            <th className="px-4 py-2 text-right text-xs uppercase tracking-wide text-slate-400">Passed</th>
            <th className="px-4 py-2 text-right text-xs uppercase tracking-wide text-slate-400">Failed</th>
            <th className="px-4 py-2 text-right text-xs uppercase tracking-wide text-slate-400">Pass Rate</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.partType} className="border-t border-slate-700/30 hover:bg-slate-800/30">
              <td className="px-4 py-2 font-medium text-slate-200">{row.partType}</td>
              <td className="px-4 py-2 text-right text-slate-400">{row.tested}</td>
              <td className="px-4 py-2 text-right text-emerald-400">{row.passed}</td>
              <td className="px-4 py-2 text-right text-rose-400">{row.failed}</td>
              <td className="px-4 py-2 text-right">
                <span className={
                  row.passRate === 100 ? 'text-emerald-400' :
                  row.passRate >= 90 ? 'text-amber-400' :
                  'text-rose-400'
                }>
                  {row.passRate}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FailureCategoryList({ data }: { data: FailureCategory[] }) {
  const priorityColors = {
    P0: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
    P1: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
    P2: 'bg-slate-500/20 text-slate-300 border-slate-400/30',
  };

  const grouped = useMemo(() => {
    const p0 = data.filter(d => d.priority === 'P0');
    const p1 = data.filter(d => d.priority === 'P1');
    const p2 = data.filter(d => d.priority === 'P2');
    return { p0, p1, p2 };
  }, [data]);

  const renderGroup = (items: FailureCategory[], label: string) => (
    <div className="mb-4">
      <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.category}
            className={`flex items-center justify-between rounded border p-3 ${priorityColors[item.priority]}`}
          >
            <div>
              <div className="font-medium">{item.category}</div>
              <div className="text-xs opacity-70">{item.description}</div>
            </div>
            <div className="text-lg font-semibold">{item.count}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      {grouped.p0.length > 0 && renderGroup(grouped.p0, 'P0 — Critical (blocks release)')}
      {grouped.p1.length > 0 && renderGroup(grouped.p1, 'P1 — High Priority')}
      {grouped.p2.length > 0 && renderGroup(grouped.p2, 'P2 — Errors')}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CADRegenerationDashboardPage() {
  const [data, setData] = useState<RegenerationDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with actual API call
    // fetchRegenerationMetrics().then(setData).finally(() => setLoading(false));
    setTimeout(() => {
      setData(getMockData());
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-slate-400">Loading regeneration metrics...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-rose-400">Failed to load metrics</div>
      </div>
    );
  }

  const isAtTarget = data.overall.passRate === 100;

  return (
    <div className="min-h-screen bg-[#020617] p-6 text-slate-100">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">CAD Regeneration Dashboard</h1>
          <p className="text-sm text-slate-400">
            Track progress toward 100% regeneration accuracy
          </p>
        </div>

        {/* Safety Banner */}
        <SafetyBanner />

        {/* Sample-data notice (R12) -- renders getMockData() until the real CADRegenerationTestEngine
            (prism_cad cad_regen_batch aggregation) is wired by delta. */}
        <div data-testid="sample-data-notice" className="mb-6 rounded-lg border border-amber-500/40 bg-amber-900/20 p-3 text-sm text-amber-200">
          Sample data -- this view is a UI preview and is not yet connected to live CAD regeneration test results.
        </div>

        {/* Overall Progress */}
        <div className="mb-8 grid gap-6 md:grid-cols-[auto_1fr]">
          <div className="flex justify-center">
            <ProgressRing value={data.overall.passRate} size={160} />
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <MetricCard
              label="Total Tests"
              value={data.overall.totalTests}
              status="neutral"
            />
            <MetricCard
              label="Passed"
              value={data.overall.passed}
              subValue={`${data.overall.passRate.toFixed(1)}%`}
              status={isAtTarget ? 'pass' : 'warning'}
            />
            <MetricCard
              label="Failed"
              value={data.overall.failed}
              status={data.overall.failed === 0 ? 'pass' : 'fail'}
            />
            <MetricCard
              label="Gap to 100%"
              value={data.gapToTarget}
              subValue={data.estimatedFixEffort}
              status={data.gapToTarget === 0 ? 'pass' : 'fail'}
            />
          </div>
        </div>

        {/* By Complexity */}
        <div className="mb-8 rounded-lg border border-slate-700/50 bg-slate-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold">Progress by Complexity</h2>
          <ComplexityBar label="Simple Parts (boxes, cylinders, plates)" metrics={data.byComplexity.simple} />
          <ComplexityBar label="Medium Parts (JM Die casings, dies, punches)" metrics={data.byComplexity.medium} />
          <ComplexityBar label="High Complexity (multi-station progressive dies)" metrics={data.byComplexity.high} />
        </div>

        {/* Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* By Part Type */}
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-6">
            <h2 className="mb-4 text-lg font-semibold">Pass Rate by Part Type</h2>
            <PartTypeTable data={data.byPartType} />
          </div>

          {/* Failure Categories */}
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-6">
            <h2 className="mb-4 text-lg font-semibold">Failure Categories</h2>
            <FailureCategoryList data={data.failureCategories} />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-500">
          Last updated: {new Date(data.lastUpdated).toLocaleString()}
          {' · '}
          Milestone: CAD-COMPLETE-MS0
          {' · '}
          Unit: U-CADC25
        </div>
      </div>
    </div>
  );
}
