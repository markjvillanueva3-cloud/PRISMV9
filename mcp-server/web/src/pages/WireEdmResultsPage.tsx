/**
 * WireEdmResultsPage — Results display for wire EDM program generation.
 *
 * Tabs: Summary | Backplot | Pass Details | Setup Sheet | G-Code
 * Downloads: G-code (.nc), setup sheet, physics report, E-pack
 * Edit-and-rerun: navigates back to wizard with state preserved.
 *
 * WEDM-UNIFIED M1: U-WEUP04-05
 */

import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ActionButton,
  PanelCard,
  SummaryTile,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';
import { MachineWorkspaceAuthorityCard } from '../features/machine-workspace/MachineWorkspaceAuthorityCard';
import type { MachineWorkspaceContext } from '../features/machine-workspace/MachineWorkspaceState';
import { buildWorkflowPath } from '../utils/workflowRouteContext';

type ResultTab = 'summary' | 'backplot' | 'passes' | 'setup' | 'gcode';

interface WedmResult {
  program_text?: string;
  cycle_time_s?: number;
  pass_count?: number;
  wire_consumption_m?: number;
  cost_total?: number;
  cost_breakdown?: Record<string, number>;
  surface_finish_Ra_um?: number;
  recast_depth_um?: number;
  haz_depth_um?: number;
  safety_score?: number;
  confidence_score?: number;
  passes?: Array<{ pass: number; offset_mm: number; feed_mm_min: number; power_pct: number; Ra_um: number }>;
  setup_notes?: string[];
  warnings?: string[];
  controller?: string;
}

type WireEdmResultsLocationState = {
  result?: WedmResult;
  fileName?: string;
  fileRoute?: string;
  material?: string;
  thickness?: number;
  qualityTier?: string;
  machinePreference?: string;
  studioMode?: boolean;
  contours?: Array<{
    id: string;
    segments: unknown[];
    is_closed: boolean;
    perimeter_mm: number;
    area_mm2: number;
  }>;
  workspaceContext?: MachineWorkspaceContext;
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function buildWireOptimizationState(
  result: WedmResult,
  locationState: WireEdmResultsLocationState | null,
) {
  return {
    fileName: locationState?.fileName ?? 'wedm-program.nc',
    gcode: result.program_text ?? '',
    materialName: locationState?.material ?? locationState?.workspaceContext?.materialLabel ?? '',
    materialGroup: locationState?.workspaceContext?.materialGroup,
    machineName: locationState?.workspaceContext?.machineLabel ?? locationState?.machinePreference ?? '',
    controller:
      result.controller
      ?? locationState?.workspaceContext?.controllerId
      ?? locationState?.workspaceContext?.controllerLabel,
    sourceLabel: 'wire edm results',
    workspaceContext: locationState?.workspaceContext,
  };
}

function buildWireCycleTimeState(
  result: WedmResult,
  locationState: WireEdmResultsLocationState | null,
) {
  return {
    fileName: locationState?.fileName ?? 'wedm-program.nc',
    gcode: result.program_text ?? '',
    machineName: locationState?.workspaceContext?.machineLabel ?? locationState?.machinePreference ?? '',
    controller:
      result.controller
      ?? locationState?.workspaceContext?.controllerId
      ?? locationState?.workspaceContext?.controllerLabel,
    sourceLabel: 'wire edm results',
    workspaceContext: locationState?.workspaceContext,
  };
}

function buildWireFeatureSelectionState(
  locationState: WireEdmResultsLocationState | null,
  result: WedmResult,
) {
  return {
    controller:
      result.controller
      ?? locationState?.workspaceContext?.controllerId
      ?? locationState?.workspaceContext?.controllerLabel,
    materialName: locationState?.material ?? locationState?.workspaceContext?.materialLabel ?? '',
    materialGroup: locationState?.workspaceContext?.materialGroup,
    sourceLabel: 'wire edm results',
    workspaceContext: locationState?.workspaceContext,
  };
}

function buildWireReleasePacketId(fileName: string) {
  const normalized = fileName.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'wire';
  return `pkt__wire_edm__${normalized}`;
}

function buildWireProgramReleasePath(
  locationState: WireEdmResultsLocationState | null,
) {
  const recordId = locationState?.fileName ? locationState.fileName.replace(/\.[^.]+$/, '') : 'wedm-program';
  const packetId = buildWireReleasePacketId(locationState?.fileName ?? recordId);
  return buildWorkflowPath('/print-to-cnc', '', {
    origin: {
      source: 'wire-edm-results',
      recordType: 'Wire EDM Result',
      recordId,
      note: 'Carry routed JM Die wire EDM release context into Print to CNC.',
    },
    focus: {
      type: 'packet',
      id: packetId,
      packetId,
    },
    extras: {
      packetId,
      partClassId: 'fixture-plate',
      machineId: 'aln600g-wire',
      machineFamilyId: 'wire-edm',
      machineManufacturer: (locationState?.workspaceContext?.machineManufacturer ?? 'sodick').toLowerCase(),
      fixtureId: 'modular-plate',
      stockId: 'd2-plate',
      cadSourceId: 'neutral-compare',
    },
  });
}

export function WireEdmResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ResultTab>('summary');

  const locState = (location.state as WireEdmResultsLocationState | null) ?? null;
  const result: WedmResult = useMemo(() => locState?.result ?? {
    program_text: '(No program generated — check backend connection)',
    cycle_time_s: 0,
    pass_count: 0,
    safety_score: 0,
    confidence_score: 0,
  }, [locState]);

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

  const safetyColor = (score: number) => score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';
  const sec = 'bg-zinc-900/80 border border-zinc-700/50 rounded-xl p-5';
  const lbl = 'text-[10px] text-zinc-500 uppercase tracking-wide';

  const TABS: Array<{ id: ResultTab; label: string }> = [
    { id: 'summary', label: 'Summary' },
    { id: 'backplot', label: 'Backplot' },
    { id: 'passes', label: 'Pass Details' },
    { id: 'setup', label: 'Setup Sheet' },
    { id: 'gcode', label: 'G-Code' },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6 pb-12">
      <WorkspaceHero
        eyebrow={`Wire EDM Results: ${locState?.fileName ?? 'Program'}`}
        title="Program Generated"
        description={`${locState?.material ?? 'Unknown material'} | ${locState?.thickness ?? '?'}mm | ${locState?.qualityTier ?? 'precision'} tier`}
        metrics={
          <>
            <SummaryTile label="Cycle Time" value={formatTime(result.cycle_time_s ?? 0)} hint="estimated" />
            <SummaryTile label="Passes" value={String(result.pass_count ?? 0)} hint="rough + skim" />
            <SummaryTile label="Safety" value={`${result.safety_score ?? 0}%`} hint="score" />
            <SummaryTile label="Ra" value={`${result.surface_finish_Ra_um?.toFixed(2) ?? '?'} um`} hint="predicted" />
          </>
        }
      />

      {locState?.workspaceContext ? (
        <MachineWorkspaceAuthorityCard
          context={locState.workspaceContext}
          title="Shared routed wire authority"
          subtitle="The routed JM Die wire EDM machine, controller, and programming posture now survives the results handoff and the edit-and-rerun loop."
        />
      ) : null}

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-zinc-700 pb-1">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t text-xs font-medium transition ${
              activeTab === tab.id ? 'bg-zinc-800 text-cyan-300 border-b-2 border-cyan-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-2 gap-4">
          <div className={sec}>
            <div className={lbl}>Safety & Confidence</div>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <div className={lbl}>Safety Score</div>
                <div className={`text-2xl font-bold ${safetyColor(result.safety_score ?? 0)}`}>{result.safety_score ?? 0}%</div>
              </div>
              <div>
                <div className={lbl}>Confidence</div>
                <div className="text-2xl font-bold text-cyan-400">{result.confidence_score ?? 0}%</div>
              </div>
            </div>
          </div>

          <div className={sec}>
            <div className={lbl}>Surface Integrity</div>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div><div className={lbl}>Ra</div><div className="text-sm text-zinc-100 font-mono">{result.surface_finish_Ra_um?.toFixed(2) ?? '?'} um</div></div>
              <div><div className={lbl}>Recast</div><div className="text-sm text-zinc-100 font-mono">{result.recast_depth_um?.toFixed(1) ?? '?'} um</div></div>
              <div><div className={lbl}>HAZ</div><div className="text-sm text-zinc-100 font-mono">{result.haz_depth_um?.toFixed(1) ?? '?'} um</div></div>
            </div>
          </div>

          {result.cost_breakdown && (
            <div className={`${sec} col-span-2`}>
              <div className={lbl}>Cost Breakdown</div>
              <div className="grid grid-cols-5 gap-3 mt-2">
                {Object.entries(result.cost_breakdown).map(([key, val]) => (
                  <div key={key}>
                    <div className={lbl}>{key.replace(/_/g, ' ')}</div>
                    <div className="text-sm text-zinc-100 font-mono">${(val as number).toFixed(2)}</div>
                  </div>
                ))}
                <div>
                  <div className={lbl}>Total</div>
                  <div className="text-sm text-emerald-400 font-bold">${(result.cost_total ?? 0).toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}

          {result.warnings && result.warnings.length > 0 && (
            <div className={`${sec} col-span-2`}>
              <div className={lbl}>Warnings</div>
              {result.warnings.map((w, i) => (
                <div key={i} className="text-xs text-amber-400 mt-1">{w}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pass Details Tab */}
      {activeTab === 'passes' && result.passes && (
        <div className={sec}>
          <div className={lbl}>Per-Pass Parameters</div>
          <table className="w-full text-sm mt-2">
            <thead><tr className="text-zinc-500 text-xs border-b border-zinc-700">
              <th className="text-left py-1">Pass</th>
              <th className="text-right">Offset (mm)</th>
              <th className="text-right">Feed (mm/min)</th>
              <th className="text-right">Power (%)</th>
              <th className="text-right">Ra (um)</th>
            </tr></thead>
            <tbody className="font-mono text-zinc-200">
              {result.passes.map((p, i) => (
                <tr key={i} className="border-b border-zinc-800">
                  <td className="py-1">{p.pass === 1 ? 'Rough' : `Skim ${p.pass - 1}`}</td>
                  <td className="text-right">{p.offset_mm.toFixed(4)}</td>
                  <td className="text-right">{p.feed_mm_min.toFixed(1)}</td>
                  <td className="text-right">{p.power_pct.toFixed(0)}%</td>
                  <td className="text-right">{p.Ra_um.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Setup Sheet Tab */}
      {activeTab === 'setup' && (
        <div className={sec}>
          <div className={lbl}>Setup Instructions</div>
          <div className="mt-2 space-y-1">
            {(result.setup_notes ?? ['No setup notes generated']).map((note, i) => (
              <div key={i} className="text-xs text-zinc-300">{note}</div>
            ))}
          </div>
        </div>
      )}

      {/* G-Code Tab */}
      {activeTab === 'gcode' && (
        <div className={sec}>
          <div className="flex items-center justify-between mb-2">
            <div className={lbl}>Generated Program ({result.controller ?? 'generic'})</div>
            <span className="text-[10px] text-zinc-500">{result.program_text?.split('\n').length ?? 0} lines</span>
          </div>
          <pre className="bg-zinc-950 rounded-lg p-4 text-xs text-zinc-300 font-mono max-h-[400px] overflow-y-auto whitespace-pre">
            {result.program_text ?? '(No program)'}
          </pre>
        </div>
      )}

      {/* Downloads + Actions */}
      <div className="flex gap-3 flex-wrap">
        <ActionButton onClick={() => triggerDownload(result.program_text ?? '', `${locState?.fileName ?? 'wedm-program'}.nc`)}>
          Download G-Code (.nc)
        </ActionButton>
        <ActionButton onClick={() => triggerDownload((result.setup_notes ?? []).join('\n'), `${locState?.fileName ?? 'wedm'}-setup.txt`)}>
          Download Setup Sheet
        </ActionButton>
        <ActionButton onClick={() => navigate(buildWireProgramReleasePath(locState))}>
          Open Print to CNC Release
        </ActionButton>
        <ActionButton onClick={() => navigate('/setup-sheet', {
          state: {
            fileName: locState?.fileName ?? 'wedm-program.nc',
            gcode: result.program_text ?? '',
            partNumber: locState?.fileName ? locState.fileName.replace(/\.[^.]+$/, '') : 'wedm-program',
            machineName: locState?.workspaceContext?.machineLabel ?? locState?.machinePreference ?? '',
            controller: result.controller ?? locState?.workspaceContext?.controllerId ?? locState?.workspaceContext?.controllerLabel,
            sourceLabel: 'wire edm results',
            workspaceContext: locState?.workspaceContext,
          },
        })}>
          Open Setup Sheet Generator
        </ActionButton>
        <ActionButton onClick={() => navigate('/prove-out', {
          state: {
            gcode: result.program_text ?? '',
            partNumber: locState?.fileName ? locState.fileName.replace(/\.[^.]+$/, '') : 'wedm-program',
            machineName: locState?.workspaceContext?.machineLabel ?? locState?.machinePreference ?? '',
            controller: result.controller ?? locState?.workspaceContext?.controllerId ?? locState?.workspaceContext?.controllerLabel,
            sourceLabel: 'wire edm results',
            workspaceContext: locState?.workspaceContext,
          },
        })}>
          Open Prove-Out Workflow
        </ActionButton>
        <ActionButton onClick={() => navigate('/optimize', {
          state: buildWireOptimizationState(result, locState),
        })}>
          Open Optimization Report
        </ActionButton>
        <ActionButton onClick={() => navigate('/cycle-time', {
          state: buildWireCycleTimeState(result, locState),
        })}>
          Open Cycle Time Estimator
        </ActionButton>
        <ActionButton onClick={() => navigate('/features', {
          state: buildWireFeatureSelectionState(locState, result),
        })}>
          Open Feature Auto-Selection
        </ActionButton>
        <ActionButton onClick={() => navigate('/tool-optimization', {
          state: {
            sourceLabel: 'wire edm results',
            workspaceContext: locState?.workspaceContext,
            operations: [],
            tools: [],
            unsupportedReason: 'Wire EDM and EDM electrode routes do not yet publish a canonical tool-change or magazine optimization contract, so this surface stays fail-closed for that posture.',
          },
        })}>
          Open Tool Optimization
        </ActionButton>
        <ActionButton
          onClick={() =>
            navigate(
              `/ppg?source=wire-edm&recordType=Wire%20EDM%20Result&recordId=${encodeURIComponent(
                locState?.fileName ? locState.fileName.replace(/\.[^.]+$/, '') : 'wedm-program',
              )}`,
              {
                state: {
                  sourceLabel: 'wire edm results',
                  workspaceContext: locState?.workspaceContext,
                  fileName: locState?.fileName ?? 'wedm-program.nc',
                  gcode: result.program_text ?? '',
                  machineModel:
                    locState?.workspaceContext?.machineLabel ??
                    locState?.machinePreference ??
                    '',
                  controller:
                    result.controller ??
                    locState?.workspaceContext?.controllerLabel ??
                    locState?.workspaceContext?.controllerId,
                  unsupportedReason:
                    'Post processor generation is not yet supported for this routed wire EDM posture. Kienzle keeps this surface fail-closed until the canonical EDM post and controller contract is extracted.',
                },
              },
            )
          }
        >
          Open Post Processor Generator
        </ActionButton>
        <ActionButton onClick={() => navigate('/wire-edm/wizard', {
          state: { ...locState, parsedData: locState?.result },
        })}>
          Edit Dimensions & Re-Run
        </ActionButton>
        <ActionButton onClick={() => navigate('/wire-edm')}>
          New Part
        </ActionButton>
      </div>
    </div>
  );
}
