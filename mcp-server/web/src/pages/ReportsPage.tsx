/**
 * R5-MS4: Reports Page
 *
 * Comprehensive report generation: safety audit reports, setup sheets,
 * and process cost summaries. Reports can be exported as text.
 *
 * Data sources: prism_ralph.assess, prism_omega.compute, prism_doc.read
 */
import { useState } from 'react';
import { SafetyBadge } from '../components/SafetyBadge';
import { safetyLevel } from '../api/types';

// ============================================================================
// REPORT TYPES
// ============================================================================

type ReportType = 'safety_audit' | 'setup_sheet' | 'cost_estimate';

interface ReportConfig {
  type: ReportType;
  label: string;
  description: string;
}

const REPORT_TYPES: ReportConfig[] = [
  {
    type: 'safety_audit',
    label: 'Safety Audit Report',
    description: 'Comprehensive safety analysis with S(x) scores, warnings, and recommendations.',
  },
  {
    type: 'setup_sheet',
    label: 'Setup Sheet',
    description: 'Machine setup parameters, tooling list, and operation sequence for shop floor.',
  },
  {
    type: 'cost_estimate',
    label: 'Cost Estimate',
    description: 'Detailed machining cost breakdown: cycle time, tooling, machine time, labor.',
  },
];

// ============================================================================
// REPORT GENERATION (mock data — connects to dispatchers when live)
// ============================================================================

interface ReportSection {
  title: string;
  content: string;
}

function generateReport(type: ReportType, material: string, operation: string): ReportSection[] {
  const timestamp = new Date().toISOString().split('T')[0];

  if (type === 'safety_audit') {
    return [
      { title: 'Safety Audit Report', content: `Generated: ${timestamp}\nMaterial: ${material}\nOperation: ${operation}` },
      { title: 'Overall Safety Score', content: 'S(x) = 0.88 (PASS)\n\nWeighted components:\n  R (Reliability):    0.92\n  C (Consistency):    0.85\n  P (Precision):      0.90\n  S (Safety):         0.88\n  L (Longevity):      0.82\n\nOmega Score: 0.25(0.92) + 0.20(0.85) + 0.15(0.90) + 0.30(0.88) + 0.10(0.82) = 0.882' },
      { title: 'Safety Checks', content: 'Spindle power:      3.2 kW / 7.5 kW capacity (42%) — PASS\nCutting force:       850 N — within tool limits — PASS\nTool deflection:     0.012 mm — below 0.05 mm threshold — PASS\nChip load:           0.10 mm/tooth — within range — PASS\nVibration risk:      LOW (stable lobe region)' },
      { title: 'Warnings', content: 'None — all parameters within safe operating envelope.' },
      { title: 'Recommendations', content: '1. Tool life at current parameters: ~45 min. Schedule tool change.\n2. Consider through-spindle coolant for improved chip evacuation.\n3. Monitor vibration during first article run.' },
    ];
  }

  if (type === 'setup_sheet') {
    return [
      { title: 'Setup Sheet', content: `Date: ${timestamp}\nJob: ${operation}\nMaterial: ${material}\nMachine: Haas VF-2` },
      { title: 'Workholding', content: 'Fixture: 6" Kurt vise\nDatum: X=0 Y=0 at part center, Z=0 at top face\nClamp force: 2000 N minimum\nStock allowance: 1.0 mm per side' },
      { title: 'Tooling', content: 'T1: Face Mill 63mm (Sandvik CoroMill 345) — S800 F160\nT2: End Mill 25mm 4-flute (Sandvik CoroMill 390) — S2546 F1000\nT3: Ball Nose 10mm (Mitsubishi VF2SB) — S4775 F380\nT4: Drill 8.5mm (Dormer A002) — S2250 F225' },
      { title: 'Operation Sequence', content: '1. Face top surface (T1) — ap=3mm, ae=50mm\n2. Rough pocket (T2) — ap=2mm, ae=12.5mm, trochoidal\n3. Finish walls (T2) — ap=full, ae=0.5mm, climb\n4. Finish floor (T3) — ap=0.3mm, scallop 0.01mm\n5. Drill mounting holes x4 (T4) — peck cycle, 15mm depth' },
      { title: 'Safety Notes', content: 'Verify clamp force before cycle start.\nCheck tool runout < 0.015mm.\nCoolant: flood, 6% concentration.\nFirst article inspection required.' },
    ];
  }

  // cost_estimate
  return [
    { title: 'Cost Estimate', content: `Date: ${timestamp}\nPart: ${operation}\nMaterial: ${material}\nQuantity: 1 piece` },
    { title: 'Material Cost', content: `Stock: ${material} billet 100x80x40mm\nMaterial cost: $12.50\nScrap value: $0.80\nNet material: $11.70` },
    { title: 'Machine Time', content: 'Setup time: 15.0 min @ $2.00/min = $30.00\nCycle time: 22.5 min @ $1.50/min = $33.75\nTotal machine cost: $63.75' },
    { title: 'Tooling Cost', content: 'T1 Face Mill: 22.5/300 life = $0.94\nT2 End Mill: 22.5/45 life = $12.50\nT3 Ball Nose: 22.5/60 life = $5.63\nT4 Drill: 22.5/120 life = $1.88\nTotal tooling: $20.95' },
    { title: 'Summary', content: 'Material:     $11.70\nMachine time: $63.75\nTooling:      $20.95\n─────────────────\nTotal:        $96.40 per part\n\nAt 100 qty: $72.15/part (setup amortized)' },
  ];
}

// ============================================================================
// PAGE
// ============================================================================

export function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('safety_audit');
  const [material, setMaterial] = useState('AISI 4140');
  const [operation, setOperation] = useState('bracket');
  const [report, setReport] = useState<ReportSection[] | null>(null);

  function handleGenerate() {
    setReport(generateReport(reportType, material, operation));
  }

  function handleExport() {
    if (!report) return;
    const text = report.map(s => `${'='.repeat(60)}\n${s.title}\n${'='.repeat(60)}\n\n${s.content}\n`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prism-${reportType}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generate safety audits, setup sheets, and cost estimates.
        </p>
      </div>

      {/* Config */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="rpt-type" className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select
              id="rpt-type"
              value={reportType}
              onChange={(e) => { setReportType(e.target.value as ReportType); setReport(null); }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500"
            >
              {REPORT_TYPES.map(r => <option key={r.type} value={r.type}>{r.label}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">{REPORT_TYPES.find(r => r.type === reportType)?.description}</p>
          </div>
          <div>
            <label htmlFor="rpt-material" className="block text-sm font-medium text-gray-700 mb-1">Material</label>
            <select
              id="rpt-material"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500"
            >
              {['AISI 4140', 'AISI 1045', '6061-T6', '7075-T6', 'Ti-6Al-4V'].map(m =>
                <option key={m} value={m}>{m}</option>
              )}
            </select>
          </div>
          <div>
            <label htmlFor="rpt-op" className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
            <select
              id="rpt-op"
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500"
            >
              {['bracket', 'housing', 'shaft', 'flange'].map(o =>
                <option key={o} value={o}>{o}</option>
              )}
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleGenerate}
            className="bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-prism-700 transition-colors"
          >
            Generate Report
          </button>
          {report && (
            <button
              onClick={handleExport}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Export as Text
            </button>
          )}
        </div>
      </div>

      {/* Report output */}
      {report && (
        <div className="space-y-4">
          {report.map((section, idx) => (
            <div key={idx} className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">{section.title}</h3>
              <pre className="text-sm text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 rounded p-3">
                {section.content}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
