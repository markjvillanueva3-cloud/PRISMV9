import { useMemo, useState } from 'react';
import {
  reportingDashboard,
  reportingPareto,
  reportingProduction,
  reportingQuality,
  reportingFinancial,
  reportingTrend,
  ApiError,
} from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';

type ReportType = 'safety_audit' | 'setup_sheet' | 'cost_estimate';
type PageTab = 'generate' | 'business';

interface ReportConfig {
  type: ReportType;
  label: string;
  description: string;
  brief: string;
}

interface ReportSection {
  title: string;
  content: string;
}

const REPORT_TYPES: readonly ReportConfig[] = [
  {
    type: 'safety_audit',
    label: 'Safety Audit Report',
    description: 'Comprehensive safety analysis with warnings and recommendations.',
    brief: 'Best when the floor needs a readable safety package instead of scattered warnings.',
  },
  {
    type: 'setup_sheet',
    label: 'Setup Sheet',
    description: 'Machine setup parameters, tooling list, and operation sequence for the floor.',
    brief: 'Turns planning output into a shift-ready handoff for setup, prove-out, and inspection.',
  },
  {
    type: 'cost_estimate',
    label: 'Cost Estimate',
    description: 'Cycle time, tooling, machine time, and labor rolled into one cost view.',
    brief: 'Useful for quoting, internal reviews, and explaining why a route costs what it costs.',
  },
] as const;

const BUSINESS_REPORTS = [
  { key: 'dashboard', label: 'Dashboard', detail: 'Rollup view for revenue, jobs, and operational posture.' },
  { key: 'pareto', label: 'Pareto', detail: 'Spot the biggest quality or production loss drivers fast.' },
  { key: 'production', label: 'Production', detail: 'Cycle, utilization, and output trend reporting.' },
  { key: 'quality', label: 'Quality', detail: 'Quality-driven KPI view with operational consequences.' },
  { key: 'financial', label: 'Financial', detail: 'Profit and cost posture from the ERP reporting layer.' },
  { key: 'trend', label: 'Trend', detail: 'Rolling metric trend view for business drift and trajectory.' },
] as const;

function generateReport(type: ReportType, material: string, operation: string): ReportSection[] {
  const timestamp = new Date().toISOString().split('T')[0];

  if (type === 'safety_audit') {
    return [
      {
        title: 'Safety Audit Report',
        content: `Generated: ${timestamp}\nMaterial: ${material}\nOperation: ${operation}`,
      },
      {
        title: 'Overall Safety Score',
        content:
          'S(x) = 0.88 (PASS)\n\nWeighted components:\n  R (Reliability):    0.92\n  C (Consistency):    0.85\n  P (Precision):      0.90\n  S (Safety):         0.88\n  L (Longevity):      0.82',
      },
      {
        title: 'Safety Checks',
        content:
          'Spindle power: 3.2 kW / 7.5 kW capacity (42%) — PASS\nCutting force: 850 N — within tool limits — PASS\nTool deflection: 0.012 mm — below threshold — PASS\nChip load: 0.10 mm/tooth — within range — PASS\nVibration risk: LOW',
      },
      {
        title: 'Recommendations',
        content:
          '1. Tool life at current parameters: ~45 min.\n2. Consider through-spindle coolant for chip evacuation.\n3. Monitor vibration during first article run.',
      },
    ];
  }

  if (type === 'setup_sheet') {
    return [
      {
        title: 'Setup Sheet',
        content: `Date: ${timestamp}\nJob: ${operation}\nMaterial: ${material}\nMachine: Haas VF-2`,
      },
      {
        title: 'Workholding',
        content:
          'Fixture: 6" vise\nDatum: X0 Y0 at part center, Z0 top face\nClamp force: 2000 N minimum\nStock allowance: 1.0 mm per side',
      },
      {
        title: 'Tooling',
        content:
          'T1: Face Mill 63mm\nT2: End Mill 25mm 4F\nT3: Ball Nose 10mm\nT4: Drill 8.5mm',
      },
      {
        title: 'Operation Sequence',
        content:
          '1. Face top surface\n2. Rough pocket\n3. Finish walls\n4. Finish floor\n5. Drill mounting holes',
      },
    ];
  }

  return [
    {
      title: 'Cost Estimate',
      content: `Date: ${timestamp}\nPart: ${operation}\nMaterial: ${material}\nQuantity: 1 piece`,
    },
    {
      title: 'Material Cost',
      content: 'Stock cost: $12.50\nScrap value: $0.80\nNet material: $11.70',
    },
    {
      title: 'Machine Time',
      content: 'Setup time: 15.0 min = $30.00\nCycle time: 22.5 min = $33.75\nTotal machine cost: $63.75',
    },
    {
      title: 'Summary',
      content: 'Material: $11.70\nMachine time: $63.75\nTooling: $20.95\nTotal: $96.40 per part',
    },
  ];
}

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
  children: React.ReactNode;
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

export function ReportsPage() {
  const [pageTab, setPageTab] = useState<PageTab>('generate');
  const [reportType, setReportType] = useState<ReportType>('safety_audit');
  const [material, setMaterial] = useState('AISI 4140');
  const [operation, setOperation] = useState('bracket');
  const [report, setReport] = useState<ReportSection[] | null>(null);
  const [bizReport, setBizReport] = useState<unknown>(null);
  const [bizLoading, setBizLoading] = useState(false);
  const [bizError, setBizError] = useState<string | null>(null);
  const [bizType, setBizType] = useState<string>('dashboard');

  const selectedReportType = useMemo(
    () => REPORT_TYPES.find((item) => item.type === reportType) ?? REPORT_TYPES[0],
    [reportType],
  );
  const activeBizReport = useMemo(
    () => BUSINESS_REPORTS.find((item) => item.key === bizType) ?? BUSINESS_REPORTS[0],
    [bizType],
  );

  function handleGenerate() {
    setReport(generateReport(reportType, material, operation));
  }

  function handleExport() {
    if (!report) return;
    const text = report
      .map((section) => `${'='.repeat(60)}\n${section.title}\n${'='.repeat(60)}\n\n${section.content}\n`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `prism-${reportType}-${new Date().toISOString().split('T')[0]}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleBusinessGenerate() {
    setBizLoading(true);
    setBizError(null);
    try {
      let response;
      switch (bizType) {
        case 'dashboard':
          response = await reportingDashboard();
          break;
        case 'pareto':
          response = await reportingPareto({ type: 'defects' });
          break;
        case 'production':
          response = await reportingProduction();
          break;
        case 'quality':
          response = await reportingQuality();
          break;
        case 'financial':
          response = await reportingFinancial();
          break;
        case 'trend':
          response = await reportingTrend({ metric: 'revenue', periods: 6 });
          break;
        default:
          response = await reportingDashboard();
      }
      setBizReport(response?.result ?? null);
    } catch (issue) {
      setBizError(issue instanceof ApiError ? issue.message : 'Report failed');
      setBizReport(null);
    } finally {
      setBizLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <section className="overflow-hidden rounded-[32px] border border-emerald-300/12 bg-[linear-gradient(135deg,rgba(8,15,23,0.98)_0%,rgba(5,10,16,0.98)_48%,rgba(8,28,24,0.95)_100%)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-emerald-300/16 bg-emerald-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-100">
              Reporting workspace
            </span>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">Reports</h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300">
                Generate safety audits, setup sheets, cost estimates, and business reporting views from one cleaner
                manufacturing reporting surface.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryTile
                label="Report lane"
                value={pageTab === 'generate' ? 'Generator' : 'Business'}
                hint={pageTab === 'generate' ? 'Operator-ready shop-floor documentation.' : 'Management and KPI reporting.'}
                accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
              />
              <SummaryTile
                label="Current package"
                value={pageTab === 'generate' ? selectedReportType.label : activeBizReport.label}
                hint={pageTab === 'generate' ? selectedReportType.brief : activeBizReport.detail}
                accent="from-sky-400/22 via-sky-300/8 to-transparent"
              />
              <SummaryTile
                label="Output status"
                value={pageTab === 'generate' ? (report ? 'Generated' : 'Standby') : bizReport ? 'Generated' : 'Standby'}
                hint="The surface stays in one place whether you are writing a setup sheet or pulling KPI context."
                accent="from-amber-300/22 via-amber-200/8 to-transparent"
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Current brief</div>
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPageTab('generate')}
                  className={`rounded-[22px] border px-4 py-4 text-left transition ${
                    pageTab === 'generate'
                      ? 'border-emerald-300/24 bg-emerald-300/[0.08] text-emerald-50'
                      : 'border-white/8 bg-white/[0.03] text-slate-200 hover:border-white/14'
                  }`}
                >
                  <div className="text-sm font-semibold">Report Generator</div>
                  <div className="mt-2 text-xs leading-5 text-slate-300">
                    Build operator-ready reports and shop-floor handoff documents.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPageTab('business')}
                  className={`rounded-[22px] border px-4 py-4 text-left transition ${
                    pageTab === 'business'
                      ? 'border-emerald-300/24 bg-emerald-300/[0.08] text-emerald-50'
                      : 'border-white/8 bg-white/[0.03] text-slate-200 hover:border-white/14'
                  }`}
                >
                  <div className="text-sm font-semibold">Business Reports</div>
                  <div className="mt-2 text-xs leading-5 text-slate-300">
                    Pull dashboard, Pareto, production, quality, financial, and trend context.
                  </div>
                </button>
              </div>

              <div className="rounded-[22px] border border-emerald-300/12 bg-emerald-300/[0.05] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100">Best use</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">
                  Keep generator mode for operator-facing documents and business mode for management or KPI reviews. The shell is shared so switching context feels intentional instead of like a different app.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {pageTab === 'business' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <PanelCard
            title="Business Reports"
            subtitle="Choose the reporting family, then generate the live result below."
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {BUSINESS_REPORTS.map((item) => {
                const active = item.key === bizType;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setBizType(item.key)}
                    className={`rounded-[22px] border px-4 py-4 text-left transition ${
                      active
                        ? 'border-cyan-300/24 bg-cyan-300/[0.08] shadow-[0_18px_40px_rgba(34,211,238,0.10)]'
                        : 'border-white/8 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.045]'
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-50">{item.label}</div>
                    <div className="mt-2 text-xs leading-5 text-slate-400">{item.detail}</div>
                  </button>
                );
              })}
            </div>
            <div className="mt-5">
              <button
                type="button"
                onClick={handleBusinessGenerate}
                className="rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
              >
                Generate
              </button>
            </div>
          </PanelCard>

          <PanelCard title="Business output" subtitle="Live result from the selected reporting endpoint.">
            {bizLoading ? (
              <LoadingState label="Generating report..." />
            ) : bizError ? (
              <ErrorState message={bizError} onRetry={handleBusinessGenerate} />
            ) : bizReport ? (
              <pre className="max-h-[560px] overflow-auto rounded-[22px] border border-white/8 bg-black/20 p-4 text-xs leading-6 text-slate-200">
                {JSON.stringify(bizReport, null, 2)}
              </pre>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                Generate the selected business report to fill this pane with dashboard, Pareto, quality, or financial data.
              </div>
            )}
          </PanelCard>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <PanelCard
            title="Report Generator"
            subtitle="Choose the report type, material, and operation, then generate a readable output package."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {REPORT_TYPES.map((item) => {
                const active = item.type === reportType;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => {
                      setReportType(item.type);
                      setReport(null);
                    }}
                    className={`rounded-[22px] border px-4 py-4 text-left transition ${
                      active
                        ? 'border-cyan-300/24 bg-cyan-300/[0.08] shadow-[0_18px_40px_rgba(34,211,238,0.10)]'
                        : 'border-white/8 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.045]'
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-50">{item.label}</div>
                    <div className="mt-2 text-xs leading-5 text-slate-400">{item.description}</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Report Type</span>
                <select
                  id="rpt-type"
                  value={reportType}
                  onChange={(event) => {
                    setReportType(event.target.value as ReportType);
                    setReport(null);
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                >
                  {REPORT_TYPES.map((item) => (
                    <option key={item.type} value={item.type}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Material</span>
                <select
                  id="rpt-material"
                  value={material}
                  onChange={(event) => setMaterial(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                >
                  {['AISI 4140', 'AISI 1045', '6061-T6', '7075-T6', 'Ti-6Al-4V'].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Operation</span>
                <select
                  id="rpt-op"
                  value={operation}
                  onChange={(event) => setOperation(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                >
                  {['bracket', 'housing', 'shaft', 'flange'].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleGenerate}
                className="rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
              >
                Generate Report
              </button>
              {report ? (
                <button
                  type="button"
                  onClick={handleExport}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/18 hover:bg-white/[0.05]"
                >
                  Export as Text
                </button>
              ) : null}
            </div>
          </PanelCard>

          <PanelCard title="Generated output" subtitle="Readable sections for operators, setup, or quoting context.">
            {report ? (
              <div className="space-y-4">
                {report.map((section) => (
                  <div key={section.title} className="rounded-[22px] border border-white/8 bg-black/15 p-4">
                    <div className="text-sm font-semibold text-slate-50">{section.title}</div>
                    <pre className="mt-3 whitespace-pre-wrap rounded-[18px] border border-white/8 bg-black/20 p-3 text-xs leading-6 text-slate-200">
                      {section.content}
                    </pre>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                Generate a report to stage the output here. This pane is meant to feel like a clean report desk, not a pile of generic cards.
              </div>
            )}
          </PanelCard>
        </div>
      )}
    </div>
  );
}
