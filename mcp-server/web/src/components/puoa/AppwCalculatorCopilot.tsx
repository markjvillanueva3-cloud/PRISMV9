import { useMemo } from 'react';
import { WorkspaceAICopilot, type WorkspaceCopilotSuggestion } from './WorkspaceAICopilot';

export interface AppwCalculatorCopilotProps {
  deskLabel: string;
  activeLaneLabel: string;
  activeLaneDetail: string;
  machineModeLabel?: string | null;
  experienceLabel?: string | null;
  overallCatalogLabel?: string | null;
  liveBackboneCount?: number;
  hybridBackboneCount?: number;
  fallbackBackboneCount?: number;
  selectedMachineTitle?: string | null;
  selectedMachineConnection?: string | null;
  selectedMaterial?: string | null;
  selectedTool?: string | null;
  selectedToolpath?: string | null;
  selectedProgramming?: string | null;
  setupCompletenessPct?: number;
  optimizationScore?: number;
  optimizationSummary?: string | null;
  resultSafetyLabel?: string | null;
  resultSafetySummary?: string | null;
  resultSolveSourceLabel?: string | null;
  resultSignalCount?: number;
  solverConfidencePct?: number;
  prismModeEnabled?: boolean;
  prismConfidenceLabel?: string | null;
  prismConfidenceScore?: number;
  inventoryCoverageLabel?: string | null;
  workflowPacketId?: string | null;
  workflowFocusId?: string | null;
  releaseSupported?: boolean;
  toolpathSupported?: boolean;
  releaseNote?: string | null;
  toolpathNote?: string | null;
  loadedFileName?: string | null;
  toolCribImportCount?: number;
  toolCribLibraryCount?: number;
  toolCribImportSummary?: string | null;
  toolCribImportError?: string | null;
  toolCribScanError?: string | null;
}

function buildSummary(props: AppwCalculatorCopilotProps) {
  const posture: string[] = [];

  posture.push(`${props.activeLaneLabel} lane active`);
  if (props.activeLaneDetail) posture.push(props.activeLaneDetail);
  if (props.machineModeLabel) posture.push(`mode ${props.machineModeLabel}`);
  if (props.experienceLabel) posture.push(`experience ${props.experienceLabel}`);
  if (props.overallCatalogLabel) posture.push(`catalog posture ${props.overallCatalogLabel}`);
  posture.push(`${props.liveBackboneCount ?? 0} live backbone lanes`);
  if ((props.hybridBackboneCount ?? 0) > 0) posture.push(`${props.hybridBackboneCount} hybrid backbone lanes`);
  if ((props.fallbackBackboneCount ?? 0) > 0) posture.push(`${props.fallbackBackboneCount} fallback backbone lanes`);
  if (props.selectedMachineTitle) posture.push(props.selectedMachineTitle);
  if (props.selectedMachineConnection) posture.push(props.selectedMachineConnection);
  if (props.selectedMaterial) posture.push(`material ${props.selectedMaterial}`);
  if (props.selectedTool) posture.push(`tool ${props.selectedTool}`);
  if (props.selectedToolpath) posture.push(`toolpath ${props.selectedToolpath}`);
  if (props.selectedProgramming) posture.push(`programming ${props.selectedProgramming}`);
  posture.push(`${props.setupCompletenessPct ?? 0}% setup completeness`);
  if ((props.optimizationScore ?? 0) > 0) posture.push(`${props.optimizationScore}% optimization confidence`);
  if (props.optimizationSummary) posture.push(props.optimizationSummary);
  if (props.resultSafetyLabel) posture.push(`safety ${props.resultSafetyLabel}`);
  if (props.resultSafetySummary) posture.push(props.resultSafetySummary);
  if (props.resultSolveSourceLabel) posture.push(`solve ${props.resultSolveSourceLabel}`);
  if ((props.resultSignalCount ?? 0) > 0) posture.push(`${props.resultSignalCount} active result signals`);
  if ((props.solverConfidencePct ?? 0) > 0) posture.push(`${props.solverConfidencePct}% solver confidence`);
  posture.push(props.prismModeEnabled ? 'prism guidance active' : 'prism guidance staged');
  if (props.prismConfidenceLabel) posture.push(props.prismConfidenceLabel);
  if ((props.prismConfidenceScore ?? 0) > 0) posture.push(`${props.prismConfidenceScore}% prism confidence`);
  if (props.inventoryCoverageLabel) posture.push(props.inventoryCoverageLabel);
  if (props.workflowPacketId) posture.push(`packet ${props.workflowPacketId}`);
  if (props.workflowFocusId) posture.push(`focus ${props.workflowFocusId}`);
  posture.push(props.releaseSupported ? 'release desk ready' : 'release desk constrained');
  posture.push(props.toolpathSupported ? 'toolpath advisor ready' : 'toolpath advisor constrained');
  if (props.releaseNote) posture.push(props.releaseNote);
  if (props.toolpathNote) posture.push(props.toolpathNote);
  if (props.loadedFileName) posture.push(`upload ${props.loadedFileName}`);
  if ((props.toolCribImportCount ?? 0) > 0) posture.push(`${props.toolCribImportCount} tool crib imports`);
  if ((props.toolCribLibraryCount ?? 0) > 0) posture.push(`${props.toolCribLibraryCount} linked libraries`);
  if (props.toolCribImportSummary) posture.push(props.toolCribImportSummary);
  if (props.toolCribImportError) posture.push('tool crib import degraded');
  if (props.toolCribScanError) posture.push('local scan degraded');

  return `PRISM AI is reasoning over live calculator authority, catalog backbone posture, machine-aware solve confidence, workflow routing readiness, and My Shop/tool-crib intake continuity for Calculator Studio. Current posture: ${posture.join(' | ')}.`;
}

function buildSuggestions(props: AppwCalculatorCopilotProps): WorkspaceCopilotSuggestion[] {
  const suggestions: WorkspaceCopilotSuggestion[] = [];

  suggestions.push({
    id: 'assess-release-readiness',
    label: 'Assess release readiness',
    query: `Assess whether the current calculator setup is ready for downstream handoff. Use machine legality, solve posture, and result safety to explain whether this setup should go to release, toolpath, or back into setup refinement first.`,
  });

  if ((props.fallbackBackboneCount ?? 0) > 0 || (props.hybridBackboneCount ?? 0) > 0) {
    suggestions.push({
      id: 'review-backbone-authority',
      label: 'Review backbone authority',
      query: 'Interpret the current catalog backbone posture and explain which machine, material, tooling, or programming assumptions are still being carried by fallback or hybrid authority instead of fully live routes.',
    });
  }

  if ((props.resultSignalCount ?? 0) > 0 || props.resultSafetyLabel) {
    suggestions.push({
      id: 'triage-solve-risk',
      label: 'Triage solve risk',
      query: `Review the active solve posture${props.resultSafetyLabel ? ` (${props.resultSafetyLabel})` : ''} and explain the top technical risks, what still needs proving out, and which setup changes would increase confidence fastest.`,
    });
  }

  if (props.loadedFileName || (props.toolCribImportCount ?? 0) > 0 || props.toolCribImportError || props.toolCribScanError) {
    suggestions.push({
      id: 'audit-my-shop-intake',
      label: 'Audit My Shop intake',
      query: 'Use the current upload and My Shop/tool-crib intake posture to explain whether the calculator has enough local evidence to trust its tooling recommendations, and what evidence is still missing.',
    });
  }

  if (!props.releaseSupported || !props.toolpathSupported || props.releaseNote || props.toolpathNote) {
    suggestions.push({
      id: 'preserve-downstream-continuity',
      label: 'Preserve downstream continuity',
      query: 'Explain how the current calculator packet should be handed into Print to CNC, Toolpath Advisor, quote, or purchasing without losing the exact machine, material, tooling, and route-authority posture.',
    });
  }

  return suggestions.slice(0, 6);
}

function buildContext(props: AppwCalculatorCopilotProps) {
  return {
    desk: props.deskLabel,
    active_lane: props.activeLaneLabel,
    active_lane_detail: props.activeLaneDetail,
    machine_mode_label: props.machineModeLabel,
    experience_label: props.experienceLabel,
    overall_catalog_label: props.overallCatalogLabel,
    live_backbone_count: props.liveBackboneCount ?? 0,
    hybrid_backbone_count: props.hybridBackboneCount ?? 0,
    fallback_backbone_count: props.fallbackBackboneCount ?? 0,
    selected_machine_title: props.selectedMachineTitle,
    selected_machine_connection: props.selectedMachineConnection,
    selected_material: props.selectedMaterial,
    selected_tool: props.selectedTool,
    selected_toolpath: props.selectedToolpath,
    selected_programming: props.selectedProgramming,
    setup_completeness_pct: props.setupCompletenessPct ?? 0,
    optimization_score: props.optimizationScore ?? 0,
    optimization_summary: props.optimizationSummary,
    result_safety_label: props.resultSafetyLabel,
    result_safety_summary: props.resultSafetySummary,
    result_solve_source_label: props.resultSolveSourceLabel,
    result_signal_count: props.resultSignalCount ?? 0,
    solver_confidence_pct: props.solverConfidencePct ?? 0,
    prism_mode_enabled: props.prismModeEnabled ?? false,
    prism_confidence_label: props.prismConfidenceLabel,
    prism_confidence_score: props.prismConfidenceScore ?? 0,
    inventory_coverage_label: props.inventoryCoverageLabel,
    workflow_packet_id: props.workflowPacketId,
    workflow_focus_id: props.workflowFocusId,
    release_supported: props.releaseSupported ?? false,
    toolpath_supported: props.toolpathSupported ?? false,
    release_note: props.releaseNote,
    toolpath_note: props.toolpathNote,
    loaded_file_name: props.loadedFileName,
    tool_crib_import_count: props.toolCribImportCount ?? 0,
    tool_crib_library_count: props.toolCribLibraryCount ?? 0,
    tool_crib_import_summary: props.toolCribImportSummary,
    tool_crib_import_error: props.toolCribImportError,
    tool_crib_scan_error: props.toolCribScanError,
    appw_stage: 'APPW-MS1 calculator intelligence hardening',
    desk_type: 'calculator_studio',
  };
}

export function AppwCalculatorCopilot(props: AppwCalculatorCopilotProps) {
  const summary = useMemo(() => buildSummary(props), [props]);
  const suggestions = useMemo(() => buildSuggestions(props), [props]);
  const context = useMemo(() => buildContext(props), [props]);

  return (
    <div data-testid="appw-calculator-copilot">
      <WorkspaceAICopilot workspaceLabel={props.deskLabel} summary={summary} context={context} suggestions={suggestions} />
    </div>
  );
}

export default AppwCalculatorCopilot;
