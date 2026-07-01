import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ActionButton,
  PanelCard,
  StatusPill,
  SummaryTile,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';
import { LatheBackplot, type BackplotMove } from '../components/LatheBackplot';
import { SetupInstructionPanel, type SetupStep, type ToolStation } from '../components/SetupInstructionPanel';

// ── Types ───────────────────────────────────────────────────────────────────

export interface SafetyCheck {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface ToolUsed {
  station: number;
  name: string;
  operation: string;
  timeSeconds: number;
}

export interface LatheResultData {
  cycleTimeSeconds: number;
  toolsUsed: ToolUsed[];
  costPerPart: number;
  batchQuantity: number;
  safetyChecks: SafetyCheck[];
  confidenceScore: number;
  confidenceExplanation: string;
  material: string;
  partName: string;
  machineName: string;
  gcode: string;
  moves: BackplotMove[];
  setupSteps: SetupStep[];
  toolStations: ToolStation[];
  measurementPoints: { label: string; nominal: string; tolerance: string; tool: string }[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60);
  if (min === 0) return `${sec} sec`;
  return `${min} min ${sec} sec`;
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

function safetyTone(passed: boolean): 'emerald' | 'rose' {
  return passed ? 'emerald' : 'rose';
}

function confidenceColor(score: number): string {
  if (score >= 0.85) return 'text-emerald-400';
  if (score >= 0.6) return 'text-amber-400';
  return 'text-red-400';
}

function confidenceLabel(score: number): string {
  if (score >= 0.85) return 'High confidence';
  if (score >= 0.6) return 'Medium confidence';
  return 'Low confidence — review recommended';
}

// ── Mock data for development ───────────────────────────────────────────────

function createMockResult(): LatheResultData {
  return {
    cycleTimeSeconds: 252,
    toolsUsed: [
      { station: 1, name: 'Roughing insert (CNMG 120408)', operation: 'Rough-cut the outside shape', timeSeconds: 142 },
      { station: 2, name: 'Finishing insert (DNMG 110404)', operation: 'Smooth finish on outside', timeSeconds: 68 },
      { station: 3, name: 'Cut-off blade (3mm wide)', operation: 'Cut the finished part off the bar', timeSeconds: 42 },
    ],
    costPerPart: 2.40,
    batchQuantity: 50,
    safetyChecks: [
      { id: 'spindle-rpm', label: 'Spindle speed within machine limits', passed: true },
      { id: 'feed-range', label: 'Feed rates within safe range', passed: true },
      { id: 'doc-limit', label: 'Depth of cut within tool limits', passed: true },
      { id: 'tool-reach', label: 'All tools can reach their cuts', passed: true },
      { id: 'clearance', label: 'Tool clearance verified (no collisions)', passed: true },
      { id: 'chuck-grip', label: 'Enough material in chuck for grip', passed: true },
      { id: 'power-check', label: 'Spindle power sufficient for roughing', passed: true },
      { id: 'surface-speed', label: 'Surface speed within material limits', passed: true },
      { id: 'coolant', label: 'Coolant type matches material', passed: true },
      { id: 'rapid-clear', label: 'Rapids clear the workpiece', passed: true },
      { id: 'stock-allow', label: 'Finish stock allowance correct', passed: true },
      { id: 'partoff-depth', label: 'Part-off reaches center safely', passed: true },
    ],
    confidenceScore: 0.92,
    confidenceExplanation: 'All dimensions were extracted with high confidence. Physics calculations match reference data within 5%. Toolpath verified collision-free.',
    material: '4140 Steel',
    partName: 'Shaft-001',
    machineName: 'Haas ST-10',
    gcode: [
      'O0001 (SHAFT-001)',
      '(MATERIAL: 4140 STEEL)',
      '(MACHINE: HAAS ST-10)',
      'G21 G18 G40 G80',
      'T0101 (CNMG 120408 ROUGHING)',
      'G96 S200 M03',
      'G00 X52. Z2.',
      'G71 U1.5 R0.5',
      'G71 P10 Q20 U0.3 W0.1 F0.25',
      'N10 G00 X20.',
      'G01 Z0. F0.25',
      'X25. Z-2.',
      'Z-30.',
      'X32.',
      'X38. Z-45.',
      'Z-80.',
      'X50.',
      'N20 X52.',
      'G00 X100. Z50.',
      'T0202 (DNMG 110404 FINISHING)',
      'G96 S280 M03',
      'G00 X20. Z2.',
      'G70 P10 Q20 F0.08',
      'G00 X100. Z50.',
      'T0303 (CUT-OFF 3MM)',
      'G97 S800 M03',
      'G00 X52. Z-82.',
      'G01 X0. F0.04',
      'G00 X100. Z50.',
      'M30',
    ].join('\n'),
    moves: [
      // Rapid to start
      { x: 52, z: 2, type: 'rapid' },
      // Roughing passes (simplified)
      { x: 52, z: 2, type: 'rapid' },
      { x: 46, z: 2, type: 'rapid' },
      { x: 46, z: -80, type: 'roughing' },
      { x: 52, z: -80, type: 'roughing' },
      { x: 52, z: 2, type: 'rapid' },
      { x: 42, z: 2, type: 'rapid' },
      { x: 42, z: -45, type: 'roughing' },
      { x: 38, z: -45, type: 'roughing' },
      { x: 38, z: 2, type: 'rapid' },
      { x: 36, z: 2, type: 'rapid' },
      { x: 36, z: -30, type: 'roughing' },
      { x: 32, z: -30, type: 'roughing' },
      { x: 32, z: 2, type: 'rapid' },
      { x: 28, z: 2, type: 'rapid' },
      { x: 28, z: -2, type: 'roughing' },
      { x: 25, z: -2, type: 'roughing' },
      { x: 25, z: 2, type: 'rapid' },
      // Finishing pass
      { x: 20, z: 2, type: 'rapid' },
      { x: 20, z: 0, type: 'finishing' },
      { x: 25, z: -2, type: 'finishing' },
      { x: 25, z: -30, type: 'finishing' },
      { x: 32, z: -30, type: 'finishing' },
      { x: 38, z: -45, type: 'finishing' },
      { x: 38, z: -80, type: 'finishing' },
      { x: 50, z: -80, type: 'finishing' },
      // Rapid to clearance
      { x: 52, z: 2, type: 'rapid' },
      // Part-off
      { x: 52, z: -82, type: 'rapid' },
      { x: 0, z: -82, type: 'groove' },
    ],
    setupSteps: [
      {
        id: 'step-1',
        number: 1,
        title: 'Load raw material',
        description: 'Insert a 52mm round bar of 4140 steel into the chuck. The bar should stick out at least 90mm from the chuck face.',
        safetyNote: 'Wear safety glasses. Make sure the machine is powered off before opening the chuck.',
      },
      {
        id: 'step-2',
        number: 2,
        title: 'Tighten the chuck',
        description: 'Close the chuck jaws firmly around the bar. Give it a gentle tug to make sure it is secure.',
        safetyNote: 'Never leave the chuck key in the chuck.',
      },
      {
        id: 'step-3',
        number: 3,
        title: 'Face the bar end',
        description: 'Use the jog handwheel to move the tool until it just touches the flat end of the bar. Press the "Set Work Zero" button on your controller. This tells the machine where the part starts.',
      },
      {
        id: 'step-4',
        number: 4,
        title: 'Load Tool 1 (Roughing insert)',
        description: 'Place the roughing insert holder in tool station 1. Then "touch off" the tool: jog it to touch the bar surface so the machine knows exactly where this tool tip is.',
      },
      {
        id: 'step-5',
        number: 5,
        title: 'Load Tool 2 (Finishing insert)',
        description: 'Place the finishing insert holder in tool station 2. Touch off this tool the same way you did Tool 1.',
      },
      {
        id: 'step-6',
        number: 6,
        title: 'Load Tool 3 (Cut-off blade)',
        description: 'Place the cut-off blade in tool station 3. Touch off the same way. Make sure the blade sits perfectly straight — not angled.',
      },
      {
        id: 'step-7',
        number: 7,
        title: 'Verify coolant',
        description: 'Check that the coolant tank is full and the nozzle is aimed at the cutting zone. This material requires flood coolant.',
      },
      {
        id: 'step-8',
        number: 8,
        title: 'Dry run (recommended)',
        description: 'Run the program once with the doors closed but with rapids at 25% and Z shifted +50mm. Watch for any unexpected tool movements.',
        safetyNote: 'Keep your hand on the emergency stop button during the first run.',
      },
    ],
    toolStations: [
      { station: 1, toolName: 'CNMG 120408 — Roughing Insert', holderType: 'MCLNR 2020K-12', insertGrade: 'Coated Carbide (CVD)' },
      { station: 2, toolName: 'DNMG 110404 — Finishing Insert', holderType: 'MDJNR 2020K-11', insertGrade: 'Coated Carbide (PVD)' },
      { station: 3, toolName: 'Cut-off blade 3mm', holderType: 'Parting tool holder', insertGrade: 'Carbide' },
    ],
    measurementPoints: [
      { label: 'Small diameter', nominal: '20.00 mm', tolerance: '+/- 0.05 mm', tool: 'Outside micrometer (0-25mm)' },
      { label: 'Step diameter', nominal: '25.00 mm', tolerance: '+/- 0.05 mm', tool: 'Outside micrometer (25-50mm)' },
      { label: 'Shoulder length', nominal: '30.00 mm', tolerance: '+/- 0.10 mm', tool: 'Depth micrometer or caliper' },
      { label: 'Overall length', nominal: '82.00 mm', tolerance: '+/- 0.10 mm', tool: 'Caliper' },
      { label: 'Surface finish (OD)', nominal: 'Ra 1.6', tolerance: 'max Ra 3.2', tool: 'Surface roughness tester' },
    ],
  };
}

// ── Component ───────────────────────────────────────────────────────────────

type ResultTab = 'summary' | 'backplot' | 'setup' | 'gcode';

export function LatheResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ResultTab>('summary');

  // In production, this comes from the pipeline via location.state or an API call.
  // For now, use mock data.
  const result: LatheResultData = useMemo(() => {
    const stateResult = (location.state as { result?: LatheResultData } | null)?.result;
    return stateResult ?? createMockResult();
  }, [location.state]);

  const allSafe = result.safetyChecks.every(c => c.passed);
  const passedCount = result.safetyChecks.filter(c => c.passed).length;
  const totalChecks = result.safetyChecks.length;

  const triggerDownload = useCallback((content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, []);

  const handleDownloadGcode = useCallback(() => {
    triggerDownload(result.gcode, `${result.partName}.nc`);
  }, [result.gcode, result.partName, triggerDownload]);

  const handleDownloadSetup = useCallback(() => {
    // In production, this calls the backend to generate a PDF.
    // For now, download a text summary.
    const lines = [
      `SETUP SHEET — ${result.partName}`,
      `Machine: ${result.machineName}`,
      `Material: ${result.material}`,
      '',
      'TOOL LIST:',
      ...result.toolStations.map(t => `  T${String(t.station).padStart(2, '0')}: ${t.toolName} (${t.holderType})`),
      '',
      'SETUP STEPS:',
      ...result.setupSteps.map(s => `  ${s.number}. ${s.title}: ${s.description}`),
      '',
      'MEASUREMENT POINTS:',
      ...result.measurementPoints.map(m => `  ${m.label}: ${m.nominal} ${m.tolerance} — use ${m.tool}`),
    ];
    triggerDownload(lines.join('\n'), `${result.partName}-setup.txt`);
  }, [result, triggerDownload]);

  const handleDownloadReport = useCallback(() => {
    const lines = [
      `PHYSICS REPORT — ${result.partName}`,
      `Machine: ${result.machineName}`,
      `Material: ${result.material}`,
      `Confidence: ${Math.round(result.confidenceScore * 100)}%`,
      '',
      `Cycle Time: ${formatTime(result.cycleTimeSeconds)}`,
      `Cost per Part: ${formatCost(result.costPerPart)}`,
      `Batch: ${result.batchQuantity} parts`,
      `Total Batch Cost: ${formatCost(result.costPerPart * result.batchQuantity)}`,
      '',
      'SAFETY CHECKS:',
      ...result.safetyChecks.map(c => `  [${c.passed ? 'PASS' : 'FAIL'}] ${c.label}`),
      '',
      'TOOLS:',
      ...result.toolsUsed.map(t => `  T${String(t.station).padStart(2, '0')}: ${t.name} — ${t.operation} (${formatTime(t.timeSeconds)})`),
    ];
    triggerDownload(lines.join('\n'), `${result.partName}-physics-report.txt`);
  }, [result, triggerDownload]);

  const tabs: { id: ResultTab; label: string }[] = [
    { id: 'summary', label: 'Results' },
    { id: 'backplot', label: 'Toolpath View' },
    { id: 'setup', label: 'Setup Guide' },
    { id: 'gcode', label: 'G-Code' },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Your CNC program is ready"
        title={result.partName}
        description={`${result.material} on ${result.machineName} — ${formatTime(result.cycleTimeSeconds)} per part, ${result.toolsUsed.length} tool${result.toolsUsed.length === 1 ? '' : 's'}, ${formatCost(result.costPerPart)}/part`}
        metrics={
          <>
            <SummaryTile
              label="Cycle time"
              value={formatTime(result.cycleTimeSeconds)}
              hint={`${result.toolsUsed.length} tool${result.toolsUsed.length === 1 ? '' : 's'} used`}
            />
            <SummaryTile
              label="Cost per part"
              value={formatCost(result.costPerPart)}
              hint={`Batch of ${result.batchQuantity}: ${formatCost(result.costPerPart * result.batchQuantity)} total`}
              accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
            />
            <SummaryTile
              label="Safety"
              value={allSafe ? 'All clear' : `${totalChecks - passedCount} issue${totalChecks - passedCount === 1 ? '' : 's'}`}
              hint={`${passedCount}/${totalChecks} checks passed`}
              accent={allSafe ? 'from-emerald-400/22 via-emerald-300/8 to-transparent' : 'from-rose-400/22 via-rose-300/8 to-transparent'}
            />
          </>
        }
      />

      {/* Tab navigation */}
      <div role="tablist" aria-label="Result sections" className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? 'border-cyan-300/20 bg-cyan-300/[0.12] text-cyan-50'
                : 'border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/16 hover:bg-white/[0.06]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'summary' && (
        <div role="tabpanel" id="tabpanel-summary" aria-labelledby="tab-summary">
          {/* Confidence */}
          <PanelCard title="How confident are we?">
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-bold ${confidenceColor(result.confidenceScore)}`}>
                {Math.round(result.confidenceScore * 100)}%
              </div>
              <div className="flex-1">
                <div className={`text-sm font-medium ${confidenceColor(result.confidenceScore)}`}>
                  {confidenceLabel(result.confidenceScore)}
                </div>
                <p className="mt-1 text-sm text-slate-400">{result.confidenceExplanation}</p>
              </div>
            </div>
            {/* Confidence bar */}
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-700">
              <div
                className={`h-full rounded-full transition-all ${
                  result.confidenceScore >= 0.85 ? 'bg-emerald-400' : result.confidenceScore >= 0.6 ? 'bg-amber-400' : 'bg-red-400'
                }`}
                style={{ width: `${Math.round(result.confidenceScore * 100)}%` }}
              />
            </div>
          </PanelCard>

          {/* Safety checks */}
          <PanelCard title={`Safety Checks — ${allSafe ? 'All Clear' : 'Review Required'}`}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {result.safetyChecks.map(check => (
                <div
                  key={check.id}
                  className={`flex items-center gap-2 rounded-lg border p-3 ${
                    check.passed
                      ? 'border-emerald-500/20 bg-emerald-500/5'
                      : 'border-red-500/20 bg-red-500/5'
                  }`}
                >
                  <span className={`text-lg ${check.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                    {check.passed ? '\u2705' : '\u274C'}
                  </span>
                  <div className="flex-1">
                    <span className="text-sm text-slate-200">{check.label}</span>
                    {check.detail && (
                      <p className="text-xs text-slate-400">{check.detail}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </PanelCard>

          {/* Tools used */}
          <PanelCard title="Tools Used">
            <div className="flex flex-col gap-2">
              {result.toolsUsed.map(tool => (
                <div key={tool.station} className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.02] p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-bold text-cyan-300">
                      T{tool.station}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-slate-200">{tool.name}</div>
                      <div className="text-xs text-slate-400">{tool.operation}</div>
                    </div>
                  </div>
                  <StatusPill label={formatTime(tool.timeSeconds)} tone="slate" />
                </div>
              ))}
            </div>
          </PanelCard>

          {/* Download buttons */}
          <PanelCard title="Download Your Files">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <DownloadCard
                title="CNC Program"
                description="G-code ready to load into your machine"
                fileName={`${result.partName}.nc`}
                onClick={handleDownloadGcode}
              />
              <DownloadCard
                title="Setup Sheet"
                description="Step-by-step instructions for the operator"
                fileName={`${result.partName}-setup.txt`}
                onClick={handleDownloadSetup}
              />
              <DownloadCard
                title="Physics Report"
                description="Full technical report with cutting parameters, forces, and safety checks"
                fileName={`${result.partName}-physics-report.txt`}
                onClick={handleDownloadReport}
              />
            </div>
          </PanelCard>
        </div>
      )}

      {activeTab === 'backplot' && (
        <div role="tabpanel" id="tabpanel-backplot" aria-labelledby="tab-backplot">
          <PanelCard title="Toolpath View" subtitle="2D cross-section view of the cutting path">
            <LatheBackplot moves={result.moves} />
          </PanelCard>
        </div>
      )}

      {activeTab === 'setup' && (
        <div role="tabpanel" id="tabpanel-setup" aria-labelledby="tab-setup">
          <SetupInstructionPanel
            steps={result.setupSteps}
            toolStations={result.toolStations}
            measurementPoints={result.measurementPoints}
            machineName={result.machineName}
            material={result.material}
          />
        </div>
      )}

      {activeTab === 'gcode' && (
        <div role="tabpanel" id="tabpanel-gcode" aria-labelledby="tab-gcode">
          <PanelCard title="G-Code" subtitle="Ready to load into your CNC controller">
            <div className="relative">
              <pre className="max-h-[600px] overflow-auto rounded-lg bg-black/40 p-4 font-mono text-sm leading-6 text-emerald-300">
                {result.gcode}
              </pre>
              <div className="mt-3">
                <ActionButton onClick={handleDownloadGcode}>
                  Download G-Code
                </ActionButton>
              </div>
            </div>
          </PanelCard>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <ActionButton onClick={() => navigate('/lathe')}>
          Start a New Part
        </ActionButton>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function DownloadCard({
  title,
  description,
  fileName,
  onClick,
}: {
  title: string;
  description: string;
  fileName: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-cyan-300/30 hover:bg-cyan-300/5"
    >
      <div className="mb-2 text-2xl">&#x1F4E5;</div>
      <div className="text-sm font-semibold text-slate-200">{title}</div>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
      <span className="mt-2 text-xs text-cyan-400">{fileName}</span>
    </button>
  );
}
