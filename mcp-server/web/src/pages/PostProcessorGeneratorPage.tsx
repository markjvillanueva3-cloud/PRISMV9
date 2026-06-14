import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ApiError,
  calculateSpeedFeed,
  ppgCompare,
  ppgControllers,
  ppgGenerate,
  ppgHistory,
  ppgMaterialSearch,
  ppgOperations,
  ppgPipelineProcess,
  ppgProgram,
  ppgDownload,
  ppgProveOut,
  ppgProgramsList,
  ppgProgramLoad,
  ppgProgramsStats,
  ppgValidate,
  ppgValidateLimits,
} from '../api/client';
import { buildCapturePath } from '../utils/captureRoute';
import { buildShopFloorPath } from '../utils/shopFloorRoute';
import {
  buildWorkflowPath,
  formatWorkflowSourceLabel,
  parseWorkflowRouteContext,
} from '../utils/workflowRouteContext';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  Select,
  StatusPill,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';
import { ControllerOverridePanel } from '../components/ppg/ControllerOverridePanel';
import { FeatureTogglePanel } from '../components/ppg/FeatureTogglePanel';
import { GcodeComparisonPanel } from '../components/ppg/GcodeComparisonPanel';
import { MachinePickerPanel } from '../components/ppg/MachinePickerPanel';
import { PostLibraryUI } from '../components/ppg/PostLibraryUI';
import type { FingerprintResult } from '../components/ppg/MachinePickerPanel';
import { PostPreviewComponent } from '../components/ppg/PostPreviewComponent';
import { MaterialSearchPanel } from '../components/ppg/MaterialSearchPanel';
import { ToolConfigCard, type ToolSelection } from '../components/ppg/ToolConfigCard';
import { HolderSelectorPanel, type HolderSelection } from '../components/ppg/HolderSelectorPanel';
import { GcodePreviewPanel } from '../components/ppg/GcodePreviewPanel';
import { PhysicsDetailsPanel } from '../components/ppg/PhysicsDetailsPanel';
import { MachineWorkspaceAuthorityCard } from '../features/machine-workspace/MachineWorkspaceAuthorityCard';
import type { MachineWorkspaceContext } from '../features/machine-workspace/MachineWorkspaceState';
import { useOperatingSystem } from '../features/operating-system/OperatingSystemProvider';
import { PROGRAM_RELEASE_CATALOG } from '../features/operating-system/programReleaseFixtures';
import type { ProgramReleaseCatalog } from '../features/operating-system/contracts';
import { resolveProgramReleaseMachineRouteSeed } from '../utils/programReleaseRouteMachineResolver';
import { buildProgramReleaseRouteExtras } from '../utils/programReleaseSelectorExtras';
import { SurfaceCrossLink } from '../components/SurfaceCrossLink';

type Lane = 'generate' | 'validate' | 'compare' | 'library' | 'machine' | 'programs';
type PageMode = 'lanes' | 'wizard';
type WizardStep = 1 | 2 | 3 | 4 | 5;

const WIZARD_STEPS = [
  { step: 1 as const, label: 'Machine', icon: '\u2699', hint: 'Pick your machine and controller' },
  { step: 2 as const, label: 'Material', icon: '\u25C6', hint: 'Select workpiece material' },
  { step: 3 as const, label: 'Tools', icon: '\u2736', hint: 'Configure tool and holder' },
  { step: 4 as const, label: 'CAM', icon: '\u25B6', hint: 'Choose CAM system and strategy' },
  { step: 5 as const, label: 'Generate', icon: '\u2713', hint: 'Build and download your post' },
] as const;

type ControllerOption = {
  value: string;
  label: string;
  family: string;
  note: string;
};

type OperationOption = {
  value: string;
  label: string;
  family: string;
  note: string;
};

type GeneratedOutput = {
  post_name: string;
  controller: string;
  cam_system: string;
  operation: string;
  machine_model: string;
  estimated_lines: number;
  optimization_package: string;
  capabilities: string[];
  preview: string;
};

type ValidationOutput = {
  status: 'ready' | 'review' | 'blocked';
  score: number;
  warnings: string[];
  passes: string[];
  controller: string;
};

type ComparisonOutput = {
  baseline: string;
  target: string;
  delta_summary: string[];
  baseline_notes: string[];
  target_notes: string[];
  /** Actual G-code for side-by-side diff (populated from API or pipeline) */
  baseline_gcode?: string;
  target_gcode?: string;
};

type PostProcessorLocationState = {
  sourceLabel?: string;
  workspaceContext?: MachineWorkspaceContext;
  unsupportedReason?: string;
  gcode?: string;
  fileName?: string;
  machineModel?: string;
  controller?: string;
  machinePosture?: string;
  operation?: string;
  camSystem?: string;
  notes?: string;
  programName?: string;
};

type CapabilityOption = {
  id: string;
  label: string;
  detail: string;
  relevantPostures?: string[];
  relevantOperations?: string[];
};

type PostReadinessState = 'ready' | 'review' | 'blocked';

type ReleaseCheck = {
  id: string;
  label: string;
  status: PostReadinessState;
  detail: string;
};

const CAM_PACKAGES = [
  {
    value: 'mastercam',
    label: 'Mastercam',
    detail: 'Broad shop-floor familiarity and stable legacy post posture.',
  },
  {
    value: 'hypermill',
    label: 'hyperMILL',
    detail: 'High-end automation and multiaxis controller nuance.',
  },
  {
    value: 'fusion_360',
    label: 'Fusion 360',
    detail: 'CPS-driven customization and modern cloud-linked workflows.',
  },
  {
    value: 'nx_cam',
    label: 'NX CAM',
    detail: 'Enterprise machine modeling and advanced post control.',
  },
  {
    value: 'esprit',
    label: 'ESPRIT',
    detail: 'Mill-turn and Swiss-focused programming posture.',
  },
  {
    value: 'solidcam',
    label: 'SolidCAM',
    detail: 'SolidWorks-integrated iMachining and mill-turn.',
  },
  {
    value: 'catia',
    label: 'CATIA',
    detail: 'Dassault V5/V6 enterprise machining packages.',
  },
  {
    value: 'gibbscam',
    label: 'GibbsCAM',
    detail: 'Production lathe and mill-turn shop posture.',
  },
  {
    value: 'manual',
    label: 'Manual programming',
    detail: 'Hand-built controller-specific code and edits.',
  },
] as const;

const MACHINE_POSTURES = [
  {
    value: '3_axis_vmc',
    label: '3-axis VMC',
    detail: 'Safe starts, work offsets, and standard mill motion.',
  },
  {
    value: '5_axis_trunnion',
    label: '5-axis trunnion',
    detail: 'RTCP, pivot distance, and tilted workplane handling.',
  },
  {
    value: 'horizontal',
    label: 'Horizontal mill',
    detail: 'Pallet-ready production and deep tool management.',
  },
  {
    value: 'lathe',
    label: 'Lathe / turning',
    detail: 'Tool nose comp, canned cycles, and spindle mode control.',
  },
  {
    value: 'mill_turn',
    label: 'Mill-turn',
    detail: 'Sync marks, handoff posture, and live-tool sequencing.',
  },
  {
    value: 'swiss',
    label: 'Swiss',
    detail: 'Guide-bushing and gang/turret-aware sequencing.',
  },
] as const;

const FALLBACK_CONTROLLERS: ControllerOption[] = [
  {
    value: 'haas_ngc',
    label: 'Haas NGC',
    family: 'Mill / turning',
    note: 'Readable code, probing-friendly, M97/M98 posture.',
  },
  {
    value: 'fanuc_31i',
    label: 'Fanuc 31i',
    family: 'Mill / multiaxis',
    note: 'Macro-rich baseline for broad compatibility.',
  },
  {
    value: 'siemens_840d',
    label: 'Siemens 840D',
    family: '5-axis / aerospace',
    note: 'TRAORI and workplane-heavy post behavior.',
  },
  {
    value: 'heidenhain_tnc7',
    label: 'Heidenhain TNC7',
    family: '5-axis / mold',
    note: 'Cycle-rich conversational style.',
  },
  {
    value: 'okuma_p300',
    label: 'Okuma P300',
    family: 'Turning / mill-turn',
    note: 'OSP-flavored cycles and sync posture.',
  },
  {
    value: 'mazatrol_smooth',
    label: 'Mazatrol Smooth',
    family: 'Mill-turn / production',
    note: 'Mazak-specific cycle and axis behavior.',
  },
];

const FALLBACK_OPERATIONS: OperationOption[] = [
  {
    value: 'facing',
    label: 'Facing',
    family: 'Template post',
    note: 'Safe start, tool call, and planar motion.',
  },
  {
    value: 'drilling',
    label: 'Drilling',
    family: 'Cycle template',
    note: 'Canned cycles, retract logic, and coolant calls.',
  },
  {
    value: 'pocketing',
    label: 'Pocketing',
    family: 'Milling template',
    note: 'Arc formatting and linking behavior.',
  },
  {
    value: 'thread_milling',
    label: 'Thread milling',
    family: 'Milling template',
    note: 'Pitch logic and helical motion.',
  },
  {
    value: 'turning_profile',
    label: 'Turning profile',
    family: 'Turning template',
    note: 'Tool nose comp and spindle mode.',
  },
  {
    value: 'mill_turn_sync',
    label: 'Mill-turn sync',
    family: 'Mill-turn program',
    note: 'Channel choreography and handoff logic.',
  },
  {
    value: 'probing',
    label: 'Probing',
    family: 'Inspection template',
    note: 'Offset write-back and setup verification.',
  },
];

const CAPABILITY_OPTIONS: CapabilityOption[] = [
  {
    id: 'safe_start',
    label: 'Safe start discipline',
    detail:
      'Header, modal cleanup, and restart-safe sequencing should stay explicit and operator-readable.',
  },
  {
    id: 'macro_variables',
    label: 'Macro variables',
    detail:
      'Needed for parameterized behavior, offset write-back, and controller-side logic.',
  },
  {
    id: 'probing_cycles',
    label: 'Probing cycles',
    detail:
      'Supports setup verification, work offset confirmation, and in-process checks.',
  },
  {
    id: 'rotary_indexing',
    label: 'Rotary / indexing',
    detail:
      'Required when the post must manage table motion, index locks, or positional axis calls.',
    relevantPostures: ['5_axis_trunnion', 'horizontal'],
  },
  {
    id: 'rtcp',
    label: 'RTCP / TCPM',
    detail:
      'Needed when multiaxis motion depends on dynamic pivot control and tool-center-point math.',
    relevantPostures: ['5_axis_trunnion'],
  },
  {
    id: 'tilted_workplane',
    label: 'Tilted workplane',
    detail:
      'Ensures the post can emit controller-native workplane commands instead of unsafe angle hacks.',
    relevantPostures: ['5_axis_trunnion'],
  },
  {
    id: 'high_speed_smoothing',
    label: 'High-speed smoothing',
    detail:
      'Useful when the machine favors smoothing or look-ahead options for finish quality and motion control.',
  },
  {
    id: 'subprograms',
    label: 'Subprogram support',
    detail:
      'Important for repeating patterns, pallet workflows, and readable long-run production output.',
  },
  {
    id: 'polar_c_axis',
    label: 'Polar / C-axis interpolation',
    detail:
      'Required when turning centers or mill-turns blend live-tool motion with spindle orientation.',
    relevantPostures: ['lathe', 'mill_turn', 'swiss'],
    relevantOperations: ['turning_profile', 'mill_turn_sync'],
  },
  {
    id: 'sync_channels',
    label: 'Sync channels / handoff',
    detail:
      'Required when the post must coordinate channels, subspindles, or mill-turn handoff marks.',
    relevantPostures: ['mill_turn', 'swiss'],
    relevantOperations: ['mill_turn_sync'],
  },
];

const COVERAGE_TIERS = [
  {
    label: 'Library Pack',
    price: '$149 setup',
    detail:
      'Generic controller starter with editable baseline output, revision notes, and a quick-fit handoff for lower-risk machines.',
    tone: 'sky' as const,
  },
  {
    label: 'Machine-Ready',
    price: '$499 / machine',
    detail:
      'Controller tuning, safe-start cleanup, cycle review, and a machine-specific handoff for production-ready standard mills or lathes.',
    tone: 'emerald' as const,
  },
  {
    label: 'Multiaxis / Mill-Turn',
    price: '$1,250 / machine',
    detail:
      '4-axis, 5-axis, probing, or mill-turn options with controller nuance, kinematic assumptions, and prove-out posture called out explicitly.',
    tone: 'violet' as const,
  },
  {
    label: 'Cell-Certified',
    price: '$2,500+',
    detail:
      'Machine-specific optimization, prove-out support, setup-sheet alignment, and simulation-ready release posture for high-risk or high-value cells.',
    tone: 'amber' as const,
  },
] as const;

const LANE_CONFIG: Record<Lane, { label: string; detail: string }> = {
  generate: {
    label: 'Generate',
    detail: 'Build a post package from controller, CAM, and operation posture.',
  },
  validate: {
    label: 'Validate',
    detail: 'Check a posted program for readiness and safety blocks.',
  },
  compare: {
    label: 'Compare',
    detail: 'See where two controllers diverge before prove-out.',
  },
  library: {
    label: 'Library',
    detail: 'Review controller coverage, tiering, and request posture.',
  },
  machine: {
    label: 'Machine',
    detail: 'Auto-resolve controller and features from machine make/model/year.',
  },
  programs: {
    label: 'Programs',
    detail: 'Browse real NC programs from your shop — load and optimize with PRISM physics.',
  },
};

const DEFAULT_PROGRAM = `( PRISM POST REVIEW )
%
O1001
G90 G17 G40 G49 G80
G54
T1 M06
S8200 M03
G00 X0. Y0.
G43 H01 Z2.
M08
G01 Z-0.125 F35.
G03 X1.25 Y0.75 I0.625 J0. F85.
G00 Z2.
M09
M30
%`;

const ACTION_LINK_CLASS =
  'inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/24 hover:bg-cyan-300/[0.08]';

function sanitizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function formatTokenLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

// Retained for future wiring (underscore prefix exempts from no-unused).
function _stripFileExtension(value: string) {
  return value.replace(/\.[^.]+$/, '');
}

function buildProgramNameSeed(value: string) {
  const normalized = value
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return normalized || 'PRISM_POST_PACKET';
}

function resolveRoutedMachinePosture(
  explicitMachinePosture: string | undefined,
  workspaceContext: MachineWorkspaceContext | undefined,
) {
  if (explicitMachinePosture) {
    return explicitMachinePosture;
  }

  if (!workspaceContext) {
    return '';
  }

  if (workspaceContext.mode === 'lathe') {
    return 'lathe';
  }

  return '';
}

function resolveRoutedControllerValue(
  explicitController: string | undefined,
  workspaceContext: MachineWorkspaceContext | undefined,
) {
  const source = `${explicitController ?? ''} ${workspaceContext?.controllerId ?? ''} ${workspaceContext?.controllerLabel ?? ''}`
    .trim()
    .toLowerCase();

  if (!source) {
    return '';
  }
  if (source.includes('haas')) {
    return 'haas_ngc';
  }
  if (source.includes('fanuc')) {
    return 'fanuc_31i';
  }
  if (source.includes('siemens')) {
    return 'siemens_840d';
  }
  if (source.includes('heidenhain')) {
    return 'heidenhain_tnc7';
  }
  if (source.includes('okuma')) {
    return 'okuma_p300';
  }
  if (source.includes('mazak') || source.includes('mazatrol')) {
    return 'mazatrol_smooth';
  }
  return '';
}

function resolveRoutedCamSystem(
  explicitCamSystem: string | undefined,
  workspaceContext: MachineWorkspaceContext | undefined,
) {
  if (explicitCamSystem) {
    return explicitCamSystem;
  }

  const source = `${workspaceContext?.programmingAuthority?.environmentLabel ?? ''} ${workspaceContext?.programmingAuthority?.environmentVendor ?? ''}`
    .trim()
    .toLowerCase();

  if (!source) {
    return '';
  }
  if (source.includes('fusion')) {
    return 'fusion_360';
  }
  if (source.includes('mastercam')) {
    return 'mastercam';
  }
  if (source.includes('hypermill')) {
    return 'hypermill';
  }
  if (source.includes('nx')) {
    return 'nx_cam';
  }
  if (source.includes('esprit')) {
    return 'esprit';
  }
  if (source.includes('solidcam')) {
    return 'solidcam';
  }
  if (source.includes('catia')) {
    return 'catia';
  }
  if (source.includes('gibbs')) {
    return 'gibbscam';
  }
  return '';
}

function resolveRoutedOperation(
  explicitOperation: string | undefined,
  workspaceContext: MachineWorkspaceContext | undefined,
) {
  if (explicitOperation) {
    return explicitOperation;
  }

  if (workspaceContext?.mode === 'lathe') {
    return 'turning_profile';
  }

  return '';
}

function resolveMaterialIsoGroup(
  workspaceContext: MachineWorkspaceContext | undefined,
) {
  const source = `${workspaceContext?.materialGroup ?? ''} ${workspaceContext?.materialLabel ?? ''}`
    .trim()
    .toLowerCase();

  if (!source) {
    return '';
  }
  if (source.includes('stainless')) {
    return 'M';
  }
  if (source.includes('tool steel')) {
    return 'H';
  }
  if (source.includes('steel')) {
    return 'P';
  }
  if (source.includes('cast')) {
    return 'K';
  }
  if (source.includes('aluminum') || source.includes('aluminium')) {
    return 'N';
  }
  if (source.includes('superalloy') || source.includes('inconel') || source.includes('nickel')) {
    return 'S';
  }
  return '';
}

function normalizeProgramReleaseMachineFamily(machinePosture: string) {
  switch (machinePosture) {
    case '3_axis_vmc':
    case 'horizontal':
      return '3-axis';
    case '5_axis_trunnion':
      return '5-axis';
    case 'lathe':
      return 'lathe';
    case 'mill_turn':
      return 'mill-turn';
    case 'wire_edm':
      return 'wire-edm';
    default:
      return undefined;
  }
}

function buildPostPacketId(input: {
  programName: string;
  controller: string;
  machinePosture: string;
  operation: string;
}) {
  const tokens = [
    input.programName,
    input.controller,
    input.machinePosture,
    input.operation,
  ]
    .map(sanitizeToken)
    .filter(Boolean);
  return tokens.length > 0 ? tokens.join('__') : 'ppg_packet';
}

function readinessTone(status: PostReadinessState) {
  if (status === 'ready') return 'emerald' as const;
  if (status === 'blocked') return 'rose' as const;
  return 'amber' as const;
}

function readinessRing(status: PostReadinessState) {
  if (status === 'ready') return 'border-emerald-300/14 bg-emerald-300/[0.06]';
  if (status === 'blocked') return 'border-rose-300/14 bg-rose-300/[0.06]';
  return 'border-amber-300/14 bg-amber-300/[0.06]';
}

function isCapabilityRelevant(
  option: CapabilityOption,
  machinePosture: string,
  operation: string,
) {
  const postureMatch =
    !option.relevantPostures || option.relevantPostures.includes(machinePosture);
  const operationMatch =
    !option.relevantOperations || option.relevantOperations.includes(operation);
  return postureMatch && operationMatch;
}

function unwrapPayload(response: unknown): Record<string, unknown> | string[] | null {
  if (!response || typeof response !== 'object') return null;
  const typed = response as Record<string, unknown>;
  const direct = typed.result ?? typed.data;
  if (Array.isArray(direct)) return direct;
  if (direct && typeof direct === 'object') return direct as Record<string, unknown>;
  return typed;
}

function extractControllers(
  payload: Record<string, unknown> | string[] | null,
): ControllerOption[] {
  if (!payload) return FALLBACK_CONTROLLERS;
  if (Array.isArray(payload)) {
    const mapped = payload
      .filter((item): item is string => typeof item === 'string' && item.length > 0)
      .map((item) => ({
        value: sanitizeToken(item),
        label: item,
        family: 'Controller',
        note: 'Loaded from backend controller catalog.',
      }));
    return mapped.length > 0 ? mapped : FALLBACK_CONTROLLERS;
  }

  const pool = payload.controllers ?? payload.supported_controllers ?? payload.items ?? [];
  if (!Array.isArray(pool)) return FALLBACK_CONTROLLERS;

  const mapped = pool
    .map((item) => {
      if (typeof item === 'string') {
        return {
          value: sanitizeToken(item),
          label: item,
          family: 'Controller',
          note: 'Loaded from backend controller catalog.',
        } satisfies ControllerOption;
      }
      if (item && typeof item === 'object') {
        const typed = item as Record<string, unknown>;
        const label = String(typed.name ?? typed.label ?? typed.controller ?? '');
        if (!label) return null;
        return {
          value: String(typed.id ?? typed.value ?? sanitizeToken(label)),
          label,
          family: String(typed.family ?? typed.type ?? 'Controller'),
          note: String(
            typed.note ?? typed.description ?? 'Loaded from backend controller catalog.',
          ),
        } satisfies ControllerOption;
      }
      return null;
    })
    .filter((item): item is ControllerOption => Boolean(item));

  return mapped.length > 0 ? mapped : FALLBACK_CONTROLLERS;
}

function extractOperations(
  payload: Record<string, unknown> | string[] | null,
): OperationOption[] {
  if (!payload) return FALLBACK_OPERATIONS;
  if (Array.isArray(payload)) {
    const mapped = payload
      .filter((item): item is string => typeof item === 'string' && item.length > 0)
      .map((item) => ({
        value: sanitizeToken(item),
        label: formatTokenLabel(item),
        family: 'Backend template',
        note: 'Loaded from backend operation catalog.',
      }));
    return mapped.length > 0 ? mapped : FALLBACK_OPERATIONS;
  }

  const pool =
    payload.operations ?? payload.templates ?? payload.supported_operations ?? [];
  if (!Array.isArray(pool)) return FALLBACK_OPERATIONS;

  const mapped = pool
    .map((item) => {
      if (typeof item === 'string') {
        return {
          value: sanitizeToken(item),
          label: formatTokenLabel(item),
          family: 'Backend template',
          note: 'Loaded from backend operation catalog.',
        } satisfies OperationOption;
      }
      if (item && typeof item === 'object') {
        const typed = item as Record<string, unknown>;
        const raw = String(typed.operation ?? typed.name ?? typed.label ?? '');
        if (!raw) return null;
        return {
          value: sanitizeToken(raw),
          label: formatTokenLabel(raw),
          family: String(typed.family ?? 'Backend template'),
          note: String(
            typed.note ?? typed.description ?? 'Loaded from backend operation catalog.',
          ),
        } satisfies OperationOption;
      }
      return null;
    })
    .filter((item): item is OperationOption => Boolean(item));

  return mapped.length > 0 ? mapped : FALLBACK_OPERATIONS;
}

function getRequiredCapabilityIds(machinePosture: string, operation: string) {
  const ids = new Set<string>(['safe_start', 'macro_variables']);
  if (machinePosture === '5_axis_trunnion') {
    ids.add('rotary_indexing');
    ids.add('rtcp');
    ids.add('tilted_workplane');
  }
  if (machinePosture === 'horizontal') ids.add('subprograms');
  if (machinePosture === 'mill_turn') {
    ids.add('polar_c_axis');
    ids.add('sync_channels');
  }
  if (machinePosture === 'swiss') ids.add('subprograms');
  if (operation === 'probing') ids.add('probing_cycles');
  if (operation === 'mill_turn_sync') ids.add('sync_channels');
  if (
    operation === 'turning_profile' &&
    (machinePosture === 'lathe' || machinePosture === 'mill_turn')
  ) {
    ids.add('polar_c_axis');
  }
  return Array.from(ids);
}

function buildRecommendedCapabilityIds(
  machinePosture: string,
  strategy: string,
  operation: string,
) {
  const recommended = new Set<string>(['safe_start', 'subprograms']);
  if (strategy !== 'prove_out') recommended.add('macro_variables');
  if (
    strategy === 'production_safe' ||
    strategy === 'prove_out' ||
    operation === 'probing'
  ) {
    recommended.add('probing_cycles');
  }
  if (machinePosture === '5_axis_trunnion') {
    recommended.add('rotary_indexing');
    recommended.add('rtcp');
    recommended.add('tilted_workplane');
    recommended.add('high_speed_smoothing');
  }
  if (machinePosture === 'horizontal') recommended.add('rotary_indexing');
  if (
    machinePosture === 'lathe' ||
    machinePosture === 'mill_turn' ||
    machinePosture === 'swiss'
  ) {
    recommended.add('polar_c_axis');
  }
  if (
    machinePosture === 'mill_turn' ||
    machinePosture === 'swiss' ||
    operation === 'mill_turn_sync'
  ) {
    recommended.add('sync_channels');
  }
  if (operation === 'thread_milling' || operation === 'pocketing') {
    recommended.add('high_speed_smoothing');
  }
  return Array.from(recommended);
}

function buildCapabilitySeed(
  machinePosture: string,
  operation: string,
  strategy: string,
  providedIds: string[] = [],
) {
  return uniqueStrings([
    'safe_start',
    'macro_variables',
    'subprograms',
    ...providedIds,
    ...getRequiredCapabilityIds(machinePosture, operation),
    ...buildRecommendedCapabilityIds(machinePosture, strategy, operation),
  ]);
}

function buildSelectedCapabilityDetails(
  selectedIds: string[],
  machinePosture: string,
  operation: string,
  controllerLabel: string,
  operationLabel: string,
) {
  return CAPABILITY_OPTIONS.filter((option) => selectedIds.includes(option.id)).map(
    (option) => {
      const relevant = isCapabilityRelevant(option, machinePosture, operation);
      const status: PostReadinessState =
        !relevant
          ? 'review'
          : option.id === 'rtcp' ||
              option.id === 'tilted_workplane' ||
              option.id === 'sync_channels'
            ? 'review'
            : 'ready';
      return {
        ...option,
        relevant,
        status,
        summary: !relevant
          ? `${option.label} is captured, but it is not a primary driver for the current ${controllerLabel} / ${operationLabel} posture.`
          : `${option.label} is staged for this ${controllerLabel} packet and will be carried into downstream prove-out actions.`,
      };
    },
  );
}

function buildReleaseChecks(input: {
  machinePosture: string;
  machinePostureLabel: string;
  selectedCapabilityIds: string[];
  missingRequired: CapabilityOption[];
  missingRecommended: CapabilityOption[];
  generated: GeneratedOutput | null;
  validation: ValidationOutput | null;
  comparison: ComparisonOutput | null;
}) {
  const hasSafeStart = input.selectedCapabilityIds.includes('safe_start');
  const hasSimulationRisk =
    input.missingRequired.some((item) =>
      ['rtcp', 'tilted_workplane', 'sync_channels'].includes(item.id),
    ) ||
    (!input.comparison &&
      (input.machinePosture === '5_axis_trunnion' ||
        input.machinePosture === 'mill_turn' ||
        input.machinePosture === 'swiss'));

  const checks: ReleaseCheck[] = [
    {
      id: 'capabilities',
      label: 'Capability gate',
      status:
        input.missingRequired.length > 0
          ? 'blocked'
          : input.missingRecommended.length > 0
            ? 'review'
            : 'ready',
      detail:
        input.missingRequired.length > 0
          ? `Missing required machine or controller gates: ${input.missingRequired
              .map((item) => item.label)
              .join(', ')}.`
          : input.missingRecommended.length > 0
            ? `Recommended checks still worth confirming: ${input.missingRecommended
                .map((item) => item.label)
                .join(', ')}.`
            : `Machine posture and controller features look aligned for this ${input.machinePostureLabel} packet.`,
    },
    {
      id: 'prove_out',
      label: 'Operator prove-out',
      status:
        !input.generated || !hasSafeStart
          ? 'blocked'
          : input.validation?.status === 'ready'
            ? 'ready'
            : 'review',
      detail:
        !input.generated || !hasSafeStart
          ? 'Generate the post with safe-start discipline before promising a floor prove-out path.'
          : input.validation?.status === 'ready'
            ? 'Safe start, offsets, and end blocks are present enough for an operator-first prove-out.'
            : 'Readable output exists, but validation still needs attention before the floor sees it.',
    },
    {
      id: 'simulation',
      label: 'Simulation and collision review',
      status: hasSimulationRisk ? 'blocked' : input.comparison ? 'ready' : 'review',
      detail: hasSimulationRisk
        ? 'Current posture still needs multiaxis or sync-specific controller review before simulation trust is credible.'
        : input.comparison
          ? 'Controller delta review is staged, so simulation and collision posture are easier to trust.'
          : 'Run a controller comparison before treating the post as simulation-ready.',
    },
    {
      id: 'release',
      label: 'Release handoff',
      status:
        input.generated && input.validation
          ? input.validation.status === 'ready'
            ? 'ready'
            : 'review'
          : 'review',
      detail:
        input.generated && input.validation
          ? 'The post desk has enough structure to hand off into Print to CNC, quoting, and shop-floor follow-up.'
          : 'Build the post and at least one validation pass so downstream desks inherit more than raw controller selections.',
    },
  ];

  return checks;
}

function buildLocalGeneratedOutput(input: {
  programName: string;
  controllerLabel: string;
  camLabel: string;
  operationLabel: string;
  machineModel: string;
  machinePostureLabel: string;
  selectedCapabilityLabels: string[];
}): GeneratedOutput {
  return {
    post_name: input.programName,
    controller: input.controllerLabel,
    cam_system: input.camLabel,
    operation: input.operationLabel,
    machine_model: input.machineModel,
    estimated_lines: 164,
    optimization_package: `${input.machinePostureLabel} release packet`,
    capabilities: uniqueStrings([
      'Safe start block',
      'Modal cleanup',
      'Controller-tailored headers',
      'Release packet continuity',
      ...input.selectedCapabilityLabels,
    ]),
    preview: `( ${input.programName} )
%
O9024
( CAM: ${input.camLabel} )
( CTRL: ${input.controllerLabel} )
( OP: ${input.operationLabel} )
G90 G17 G40 G49 G80
G54
T01 M06
S7200 M03
G00 G43 H01 Z2.
M08
G01 Z-0.2 F28.
X2.5 Y1.25 F92.
G03 X3.25 Y2. I0.4 J0.3
G00 Z2.
M09
M30
%`,
  };
}

function buildLocalValidationOutput(
  controllerLabel: string,
  gcodeInput: string,
  releaseChecks: ReleaseCheck[],
): ValidationOutput {
  const warnings: string[] = [];
  const passes: string[] = [];

  if (!gcodeInput.trim()) warnings.push('Program text is blank.');
  if (!/G90/i.test(gcodeInput)) warnings.push('Missing absolute mode (G90) in header.');
  else passes.push('Absolute positioning found.');
  if (!/G54|G55|G56|G57/i.test(gcodeInput)) warnings.push('No work offset call detected.');
  else passes.push('Work offset call detected.');
  if (!/M30|M02/i.test(gcodeInput)) warnings.push('Program end block is missing.');
  else passes.push('Program end block detected.');
  if (!/M08|M07/i.test(gcodeInput)) warnings.push('Coolant call not found; verify manual intent.');
  else passes.push('Coolant call detected.');
  if (gcodeInput.trim().split('\n').filter(Boolean).length < 5) {
    warnings.push('Program looks unusually short for a prove-out packet.');
  }

  releaseChecks.forEach((check) => {
    if (check.status === 'ready') passes.push(check.label);
    else warnings.push(check.detail);
  });

  const mergedWarnings = uniqueStrings(warnings);
  const mergedPasses = uniqueStrings(passes);
  const status: ValidationOutput['status'] =
    mergedWarnings.length === 0 ? 'ready' : mergedWarnings.length <= 3 ? 'review' : 'blocked';
  const score = Math.max(0.42, Math.min(0.98, mergedPasses.length * 0.16 + 0.12));

  return {
    status,
    score,
    warnings: mergedWarnings,
    passes: mergedPasses,
    controller: controllerLabel,
  };
}

function buildLocalComparisonOutput(
  baseline: string,
  target: string,
  machinePosture: string,
): ComparisonOutput {
  const delta = [
    `${target} needs different canned-cycle syntax than ${baseline}.`,
    `${target} prefers a different modal header discipline than ${baseline}.`,
  ];
  if (machinePosture === '5_axis_trunnion') {
    delta.push(`${target} should be reviewed for RTCP / tilted-workplane behavior before release.`);
  }
  if (machinePosture === 'mill_turn' || machinePosture === 'swiss') {
    delta.push(`${target} should be reviewed for sync-channel and handoff posture before release.`);
  }
  return {
    baseline,
    target,
    delta_summary: uniqueStrings(delta),
    baseline_notes: [
      'Legacy-friendly block structure',
      'Predictable prove-out edits',
      'Readable operator handoff',
    ],
    target_notes: [
      'Cleaner native cycles',
      'Higher-end motion support',
      'Better controller-specific optimization',
    ],
  };
}

export function PostProcessorGeneratorPage() {
  const operatingSystem = useOperatingSystem();
  const location = useLocation();
  const routeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeContext = useMemo(
    () => parseWorkflowRouteContext(location.search),
    [location.search],
  );
  const locationState = (location.state as PostProcessorLocationState | null) ?? null;
  const workspaceContext = locationState?.workspaceContext;
  const routedSourceLabel = locationState?.sourceLabel ?? 'the routed machine workspace';
  const routedMachinePosture = useMemo(
    () => resolveRoutedMachinePosture(locationState?.machinePosture, workspaceContext),
    [locationState?.machinePosture, workspaceContext],
  );
  const routedControllerValue = useMemo(
    () => resolveRoutedControllerValue(locationState?.controller, workspaceContext),
    [locationState?.controller, workspaceContext],
  );
  const routedCamSystem = useMemo(
    () => resolveRoutedCamSystem(locationState?.camSystem, workspaceContext),
    [locationState?.camSystem, workspaceContext],
  );
  const routedOperation = useMemo(
    () => resolveRoutedOperation(locationState?.operation, workspaceContext),
    [locationState?.operation, workspaceContext],
  );
  // routedProgramName kept for future reassignment — noUnusedLocals exempt via void
  void useMemo(
    () =>
      buildProgramNameSeed(
        locationState?.programName ??
          locationState?.fileName ??
          locationState?.machineModel ??
          workspaceContext?.machineLabel ??
          '',
      ),
    [
      locationState?.fileName,
      locationState?.machineModel,
      locationState?.programName,
      workspaceContext?.machineLabel,
    ],
  );
  const routedMaterialIso = useMemo(
    () => resolveMaterialIsoGroup(workspaceContext),
    [workspaceContext],
  );
  const routedUnsupportedReason = useMemo(() => {
    if (locationState?.unsupportedReason) {
      return locationState.unsupportedReason;
    }
    if (workspaceContext?.mode === 'wire_edm' || workspaceContext?.mode === 'edm') {
      return 'Post processor generation is not yet supported for this routed wire EDM posture. PRISM keeps this surface fail-closed until the canonical EDM post and controller contract is extracted.';
    }
    return '';
  }, [locationState?.unsupportedReason, workspaceContext?.mode]);
  const routeHydrationKeyRef = useRef<string | null>(null);

  const [pageMode, setPageMode] = useState<PageMode>('lanes');
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [lane, setLane] = useState<Lane>('generate');
  const [camSystem, setCamSystem] = useState('fusion_360');
  const [machinePosture, setMachinePosture] = useState('3_axis_vmc');
  const [controller, setController] = useState('haas_ngc');
  const [compareTarget, setCompareTarget] = useState('fanuc_31i');
  const [operation, setOperation] = useState('facing');
  const [machineModel, setMachineModel] = useState('Haas VF-2SS');
  const [programName, setProgramName] = useState('PRISM_VF2_PRODUCTION');
  const [strategy, setStrategy] = useState('ai_enhanced');
  const [notes, setNotes] = useState(
    'Bias for safe startup, readable blocks, and prove-out clarity.',
  );
  const [gcodeInput, setGcodeInput] = useState(DEFAULT_PROGRAM);
  const [selectedCapabilityIds, setSelectedCapabilityIds] = useState<string[]>(
    buildCapabilitySeed('3_axis_vmc', 'facing', 'ai_enhanced'),
  );
  const [controllers, setControllers] = useState<ControllerOption[]>(FALLBACK_CONTROLLERS);
  const [operations, setOperations] = useState<OperationOption[]>(FALLBACK_OPERATIONS);
  const [generated, setGenerated] = useState<GeneratedOutput | null>(null);
  const [validation, setValidation] = useState<ValidationOutput | null>(null);
  const [comparison, setComparison] = useState<ComparisonOutput | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [releaseCatalog, setReleaseCatalog] = useState<ProgramReleaseCatalog | null>(PROGRAM_RELEASE_CATALOG);
  const [fingerprint, setFingerprint] = useState<FingerprintResult | null>(null);
  const [enabledFeatures, setEnabledFeatures] = useState<Set<string>>(new Set());
  const [controllerOverride, setControllerOverride] = useState('');
  const [proveOutEnabled, setProveOutEnabled] = useState(false);
  const [confidenceWarning, setConfidenceWarning] = useState<'low' | 'medium' | null>(null);
  const [proveOutResult, setProveOutResult] = useState<{
    gcode: string;
    summary: {
      feed_reductions: number;
      rpm_caps: number;
      optional_stops_added: number;
      avg_feed_reduction_pct: number;
      avg_rpm_reduction_pct: number;
    };
    estimated_cycle_time_ratio: number;
    warnings: string[];
  } | null>(null);
  const [validationResult, setValidationResult] = useState<{
    passed: boolean;
    block_count: number;
    warn_count: number;
    info_count: number;
    flags: Array<{ line: number; severity: string; message: string; suggestion?: string }>;
  } | null>(null);

  // PP-MOAT-MS4: File I/O state
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [detectedController, setDetectedController] = useState<string | null>(null);
  const [detectedConfidence, setDetectedConfidence] = useState<string>('');

  useEffect(() => {
    let active = true;

    operatingSystem
      .getProgramReleaseCatalog()
      .then((catalog) => {
        if (active) {
          setReleaseCatalog(catalog);
        }
      })
      .catch(() => {
        if (active) {
          setReleaseCatalog(PROGRAM_RELEASE_CATALOG);
        }
      });

    return () => {
      active = false;
    };
  }, [operatingSystem]);
  // PP-MOAT-MS4: Diff + History
  const [showDiff, setShowDiff] = useState(false);
  const [originalGcode, setOriginalGcode] = useState('');
  const [history, setHistory] = useState<Array<{ id: string; timestamp: string; controller: string; lines: number; status: string }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // PPG-VAR-MS0: Material + Tool selection for auto S/F
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [selectedMaterialName, setSelectedMaterialName] = useState('');
  const [selectedMaterialIso, setSelectedMaterialIso] = useState('');
  const [selectedMaterialKc, setSelectedMaterialKc] = useState(0);
  const [selectedMaterialMc, setSelectedMaterialMc] = useState(0);
  const [materialSearchResults, setMaterialSearchResults] = useState<Array<{id: string; name: string; iso_group: string; kc1_1: number; mc: number; hardness_HB?: number}>>([]);
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  // Tool entry
  const [toolDiameter, setToolDiameter] = useState('10');
  const [toolFlutes, setToolFlutes] = useState('4');
  const [toolType, setToolType] = useState('flat_endmill');
  const [toolMaterial, setToolMaterial] = useState('carbide');
  // PPG-SHIP-MS0 S5: Tool + Holder selection
  const [selectedTool, setSelectedTool] = useState<ToolSelection | null>(null);
  const [selectedHolder, setSelectedHolder] = useState<HolderSelection | null>(null);
  const [sfPreview, setSfPreview] = useState<{ rpm: number; feed_mmmin: number; sfm: number; ipt: number; force_N: number; power_kW: number } | null>(null);
  const [sfPreviewLoading, setSfPreviewLoading] = useState(false);
  // Pipeline result
  const [pipelineResult, setPipelineResult] = useState<Record<string, unknown> | null>(null);
  const [, setPipelineStages] = useState<Array<{stage: string; status: string; data: Record<string, unknown>}>>([]);
  const [outputMode, setOutputMode] = useState<'pipeline_optimized' | 'self_contained'>('pipeline_optimized');

  // Program browser state
  const [programController, setProgramController] = useState('okuma');
  const [programSearch, setProgramSearch] = useState('');
  const [programList, setProgramList] = useState<Array<{name: string; customer?: string; program: string; size_bytes: number; path: string}>>([]);
  const [programTotal, setProgramTotal] = useState(0);
  const [programStats, setProgramStats] = useState<Record<string, number>>({});
  const [programLoading, setProgramLoading] = useState(false);

  useEffect(() => {
    if (!locationState || routeHydrationKeyRef.current === location.key) {
      return;
    }

    routeHydrationKeyRef.current = location.key;

    if (locationState.gcode) {
      setGcodeInput(locationState.gcode);
      setOriginalGcode(locationState.gcode);
    }
    if (locationState.fileName) {
      setFileName(locationState.fileName);
      setFileSize(locationState.gcode?.length ?? 0);
    }

    const nextMachineModel =
      locationState.machineModel ??
      workspaceContext?.machineLabel ??
      '';
    if (nextMachineModel) {
      setMachineModel(nextMachineModel);
    }

    if (routedMachinePosture) {
      setMachinePosture(routedMachinePosture);
    }
    if (routedControllerValue) {
      setController(routedControllerValue);
      setProgramController(routedControllerValue.includes('okuma') ? 'okuma' : routedControllerValue);
    }
    if (routedOperation) {
      setOperation(routedOperation);
    }
    if (routedCamSystem) {
      setCamSystem(routedCamSystem);
    }

    if (workspaceContext?.materialLabel) {
      setSelectedMaterialName(workspaceContext.materialLabel);
    }
    if (routedMaterialIso) {
      setSelectedMaterialIso(routedMaterialIso);
    }

    const nextProgramName =
      locationState.programName ??
      buildProgramNameSeed(locationState.fileName ?? nextMachineModel);
    if (nextProgramName) {
      setProgramName(nextProgramName);
    }

    const routedNote =
      locationState.notes ??
      workspaceContext?.programmingAuthority?.note ??
      workspaceContext?.selectorAuthorityNote ??
      '';
    if (routedNote) {
      setNotes(routedNote);
    }

    const seededPosture = routedMachinePosture || machinePosture;
    const seededOperation = routedOperation || operation;
    setSelectedCapabilityIds(
      buildCapabilitySeed(seededPosture, seededOperation, strategy),
    );
    setLane('generate');
  }, [
    location.key,
    locationState,
    locationState?.fileName,
    machinePosture,
    operation,
    routedCamSystem,
    routedControllerValue,
    routedMachinePosture,
    routedMaterialIso,
    routedOperation,
    strategy,
    workspaceContext,
  ]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextOperation = sanitizeToken(
      params.get('operation') || routedOperation || operation,
    );
    const nextController = sanitizeToken(
      params.get('controller') || routedControllerValue || controller,
    );
    const nextMachinePosture = sanitizeToken(
      params.get('machinePosture') || routedMachinePosture || machinePosture,
    );
    const providedCapabilities = (params.get('capabilities') || '')
      .split(',')
      .map((item) => sanitizeToken(item))
      .filter(Boolean);

    setOperation(nextOperation);
    setController(nextController);
    setMachinePosture(nextMachinePosture);
    setSelectedCapabilityIds(
      buildCapabilitySeed(
        nextMachinePosture,
        nextOperation,
        strategy,
        providedCapabilities,
      ),
    );

    let active = true;
    async function loadCatalog() {
      setLoadingCatalog(true);
      try {
        const [controllerResponse, operationResponse] = await Promise.all([
          ppgControllers(),
          ppgOperations(),
        ]);
        if (!active) return;
        setControllers(extractControllers(unwrapPayload(controllerResponse)));
        setOperations(extractOperations(unwrapPayload(operationResponse)));
      } catch {
        if (!active) return;
        setControllers(FALLBACK_CONTROLLERS);
        setOperations(FALLBACK_OPERATIONS);
      } finally {
        if (active) setLoadingCatalog(false);
      }
    }

    void loadCatalog();
    return () => {
      active = false;
    };
  }, [
    controller,
    location.search,
    machinePosture,
    operation,
    routedControllerValue,
    routedMachinePosture,
    routedOperation,
    strategy,
  ]);

  useEffect(() => {
    if (!controllers.some((item) => item.value === controller)) {
      setController(controllers[0]?.value ?? FALLBACK_CONTROLLERS[0].value);
    }
  }, [controller, controllers]);

  useEffect(() => {
    if (!operations.some((item) => item.value === operation)) {
      setOperation(operations[0]?.value ?? FALLBACK_OPERATIONS[0].value);
    }
  }, [operation, operations]);

  const activeLane = LANE_CONFIG[lane];
  const selectedCam = useMemo(
    () => CAM_PACKAGES.find((item) => item.value === camSystem) ?? CAM_PACKAGES[0],
    [camSystem],
  );
  const selectedMachinePosture = useMemo(
    () =>
      MACHINE_POSTURES.find((item) => item.value === machinePosture) ??
      MACHINE_POSTURES[0],
    [machinePosture],
  );
  const selectedController = useMemo(
    () =>
      controllers.find((item) => item.value === controller) ?? FALLBACK_CONTROLLERS[0],
    [controller, controllers],
  );
  const selectedOperation = useMemo(
    () =>
      operations.find((item) => item.value === operation) ?? FALLBACK_OPERATIONS[0],
    [operation, operations],
  );
  const routedControllerLabel =
    locationState?.controller ??
    workspaceContext?.controllerLabel ??
    workspaceContext?.controllerId ??
    '';
  const routedControllerWasMapped = Boolean(
    workspaceContext &&
      routedControllerLabel &&
      selectedController.label.toLowerCase() !== routedControllerLabel.trim().toLowerCase(),
  );
  const hasUnsupportedRoutedPosture = Boolean(
    workspaceContext && routedUnsupportedReason,
  );
  const compareTargets = useMemo(
    () => controllers.filter((item) => item.value !== controller),
    [controller, controllers],
  );
  const selectedCompareTarget = useMemo(
    () =>
      compareTargets.find((item) => item.value === compareTarget) ??
      compareTargets[0] ??
      FALLBACK_CONTROLLERS[1],
    [compareTarget, compareTargets],
  );

  useEffect(() => {
    if (
      compareTargets.length > 0 &&
      !compareTargets.some((item) => item.value === compareTarget)
    ) {
      setCompareTarget(compareTargets[0].value);
    }
  }, [compareTarget, compareTargets]);

  // Load program stats + initial list when programs lane is activated
  useEffect(() => {
    if (lane !== 'programs' || Object.keys(programStats).length > 0) return;
    (async () => {
      setProgramLoading(true);
      try {
        const statsRes = await ppgProgramsStats();
        const statsData = (statsRes as any)?.data?.controllers ?? {};
        setProgramStats(statsData);
        // Auto-select first controller with programs
        const firstCtrl = Object.entries(statsData).sort((a, b) => (b[1] as number) - (a[1] as number))[0];
        if (firstCtrl) {
          setProgramController(firstCtrl[0]);
          const listRes = await ppgProgramsList(firstCtrl[0], 0, 50);
          const d = (listRes as any)?.data ?? {};
          setProgramList(d.programs ?? []);
          setProgramTotal(d.total ?? 0);
        }
      } catch { /* API unavailable */ }
      setProgramLoading(false);
    })();
  }, [lane, programStats]);

  const requiredCapabilityIds = useMemo(
    () => getRequiredCapabilityIds(machinePosture, operation),
    [machinePosture, operation],
  );
  const recommendedCapabilityIds = useMemo(
    () => buildRecommendedCapabilityIds(machinePosture, strategy, operation),
    [machinePosture, operation, strategy],
  );
  const visibleCapabilities = useMemo(
    () =>
      CAPABILITY_OPTIONS.filter(
        (option) =>
          selectedCapabilityIds.includes(option.id) ||
          requiredCapabilityIds.includes(option.id) ||
          recommendedCapabilityIds.includes(option.id) ||
          isCapabilityRelevant(option, machinePosture, operation),
      ),
    [machinePosture, operation, recommendedCapabilityIds, requiredCapabilityIds, selectedCapabilityIds],
  );
  const selectedCapabilityDetails = useMemo(
    () =>
      buildSelectedCapabilityDetails(
        selectedCapabilityIds,
        machinePosture,
        operation,
        selectedController.label,
        selectedOperation.label,
      ),
    [machinePosture, operation, selectedCapabilityIds, selectedController.label, selectedOperation.label],
  );
  const missingRequired = useMemo(
    () =>
      CAPABILITY_OPTIONS.filter(
        (option) =>
          requiredCapabilityIds.includes(option.id) &&
          !selectedCapabilityIds.includes(option.id),
      ),
    [requiredCapabilityIds, selectedCapabilityIds],
  );
  const missingRecommended = useMemo(
    () =>
      CAPABILITY_OPTIONS.filter(
        (option) =>
          recommendedCapabilityIds.includes(option.id) &&
          !selectedCapabilityIds.includes(option.id),
      ),
    [recommendedCapabilityIds, selectedCapabilityIds],
  );
  const releaseChecks = useMemo(
    () =>
      buildReleaseChecks({
        machinePosture,
        machinePostureLabel: selectedMachinePosture.label,
        selectedCapabilityIds,
        missingRequired,
        missingRecommended,
        generated,
        validation,
        comparison,
      }),
    [
      comparison,
      generated,
      machinePosture,
      missingRecommended,
      missingRequired,
      selectedCapabilityIds,
      selectedMachinePosture.label,
      validation,
    ],
  );
  const readinessSummary = useMemo(() => {
    if (releaseChecks.some((item) => item.status === 'blocked')) return 'Blocked';
    if (releaseChecks.some((item) => item.status === 'review')) return 'Review';
    return 'Ready';
  }, [releaseChecks]);
  const packetId = useMemo(
    () =>
      buildPostPacketId({
        programName,
        controller,
        machinePosture,
        operation,
      }),
    [controller, machinePosture, operation, programName],
  );
  const recommendedTier = useMemo(() => {
    const highRisk =
      machinePosture === '5_axis_trunnion' ||
      machinePosture === 'mill_turn' ||
      machinePosture === 'swiss';
    if (highRisk && validation?.status === 'ready' && comparison) {
      return 'Cell-Certified';
    }
    if (highRisk || strategy === 'multi_operation') {
      return 'Multiaxis / Mill-Turn';
    }
    if (
      strategy === 'production_safe' ||
      strategy === 'prove_out' ||
      operation === 'probing'
    ) {
      return 'Machine-Ready';
    }
    return 'Library Pack';
  }, [comparison, machinePosture, operation, strategy, validation?.status]);

  const sourceContext = routeParams.get('source') || routeContext.origin.source;
  const upstreamCommercialSource =
    routeContext.origin.source && routeContext.origin.source !== sourceContext
      ? routeContext.origin.source
      : '';
  const sourceContextLabel = useMemo(
    () => formatWorkflowSourceLabel(sourceContext),
    [sourceContext],
  );
  const upstreamSourceLabel = useMemo(
    () => formatWorkflowSourceLabel(upstreamCommercialSource),
    [upstreamCommercialSource],
  );
  const upstreamRecordLabel = [routeContext.origin.recordType, routeContext.origin.recordId]
    .filter(Boolean)
    .join(' · ');
  const postFocus = useMemo(
    () =>
      routeContext.focus.id
        ? routeContext.focus
        : {
            type: 'packet',
            id: packetId,
            packetId,
            jobId: '',
            quoteId: '',
          },
    [packetId, routeContext.focus],
  );
  const effectiveOrigin = useMemo(
    () =>
      routeContext.origin.source
        ? routeContext.origin
        : {
            source: 'ppg',
            recordType: 'Post Packet',
            recordId: packetId,
            customer: routeContext.origin.customer,
            note:
              routeContext.origin.note ||
              'Carry post build, prove-out, and controller review posture into downstream desks.',
            threadId: routeContext.origin.threadId,
          },
    [packetId, routeContext.origin],
  );
  const releaseMachineSeed = useMemo(
    () =>
      resolveProgramReleaseMachineRouteSeed(releaseCatalog, [
        workspaceContext?.machineId,
        workspaceContext?.machineLabel,
        machineModel,
        selectedController.label,
      ]),
    [
      machineModel,
      releaseCatalog,
      selectedController.label,
      workspaceContext?.machineId,
      workspaceContext?.machineLabel,
    ],
  );
  const releaseRouteExtras = useMemo(
    () => ({
      source: 'ppg',
      controller: selectedController.label,
      machinePosture,
      operation: selectedOperation.label,
      cam: selectedCam.label,
      ...buildProgramReleaseRouteExtras({
        catalog: releaseCatalog,
        routeSelection: {
          machineId: releaseMachineSeed?.machineId,
          machineFamilyId:
            releaseMachineSeed?.machineFamilyId ?? normalizeProgramReleaseMachineFamily(machinePosture),
          machineManufacturer:
            releaseMachineSeed?.machineManufacturer
            ?? workspaceContext?.machineManufacturer?.trim().toLowerCase()
            ?? undefined,
        },
        requireMachineId: false,
      }),
    }),
    [
      machinePosture,
      releaseCatalog,
      releaseMachineSeed?.machineFamilyId,
      releaseMachineSeed?.machineId,
      releaseMachineSeed?.machineManufacturer,
      selectedCam.label,
      selectedController.label,
      selectedOperation.label,
      workspaceContext?.machineManufacturer,
    ],
  );

  const releasePath = useMemo(
    () =>
      buildWorkflowPath('/print-to-cnc', location.search, {
        origin: effectiveOrigin,
        focus: postFocus,
        extras: releaseRouteExtras,
      }),
    [
      effectiveOrigin,
      location.search,
      postFocus,
      releaseRouteExtras,
    ],
  );
  const quotePath = useMemo(
    () =>
      buildWorkflowPath('/quote-builder', location.search, {
        origin: effectiveOrigin,
        focus: postFocus,
        extras: {
          source: 'ppg',
          operation: selectedOperation.label,
          note: 'Carry controller and prove-out posture into quoting.',
        },
      }),
    [effectiveOrigin, location.search, postFocus, selectedOperation.label],
  );
  const capturePath = useMemo(
    () =>
      buildCapturePath(location.pathname, location.search, {
        source: 'ppg',
        target: 'machine',
        job: programName,
        department: 'Programming',
        machine: machineModel,
        note:
          'Capture prove-out video, controller evidence, setup photos, and operator notes for this post package.',
        origin: effectiveOrigin,
        focus: postFocus,
      }),
    [
      effectiveOrigin,
      location.pathname,
      location.search,
      machineModel,
      postFocus,
      programName,
    ],
  );
  const shopFloorPath = useMemo(
    () =>
      buildShopFloorPath(location.pathname, location.search, {
        source: 'ppg',
        job: programName,
        department: 'Programming',
        operation: selectedOperation.label,
        machine: machineModel,
        note:
          'Stage prove-out, safe-start confirmation, and actual-vs-expected runtime feedback for this post.',
        origin: effectiveOrigin,
        focus: postFocus,
      }),
    [
      effectiveOrigin,
      location.pathname,
      location.search,
      machineModel,
      postFocus,
      programName,
      selectedOperation.label,
    ],
  );

  const handleFingerprintChange = useCallback(
    (result: FingerprintResult | null) => {
      setFingerprint(result);
      if (!result) return;

      // Map controller_family → controller dropdown
      if (controllers.some((c) => c.value === result.controller_family)) {
        setController(result.controller_family);
      }

      // Map axis_config → machine posture
      const postureMap: Record<string, string> = {
        '3-axis': '3_axis_vmc',
        '3_axis': '3_axis_vmc',
        '5-axis': '5_axis_trunnion',
        '5_axis': '5_axis_trunnion',
        turning: 'lathe',
        lathe: 'lathe',
        'mill-turn': 'mill_turn',
        mill_turn: 'mill_turn',
        swiss: 'swiss',
        horizontal: 'horizontal',
      };
      const mapped = postureMap[result.axis_config.toLowerCase()];
      if (mapped) setMachinePosture(mapped);

      // Populate machine model from matched profile
      if (result.matched_profile) {
        setMachineModel(
          `${result.matched_profile.brand} ${result.matched_profile.model}`,
        );
      }

      // Seed feature toggles from recommended_features
      const ids: string[] = [];
      const rf = result.recommended_features;
      if (rf.probing) ids.push('probing');
      if (rf.tsc) ids.push('tsc');
      if (rf.hsm) ids.push('hsm');
      if (rf.tcp) ids.push('tcp');
      if (rf.ssv) ids.push('ssv');
      if (rf.subprograms) ids.push('subprograms');
      if (rf.chip_conveyor) ids.push('chip_conveyor');
      setEnabledFeatures(new Set(ids));

      // Sync recommended features → capability IDs
      const capIds: string[] = [];
      if (rf.probing) capIds.push('probing_cycles');
      if (rf.hsm) capIds.push('high_speed_smoothing');
      if (rf.tcp) capIds.push('rtcp');
      if (rf.subprograms) capIds.push('subprograms');
      if (capIds.length > 0) {
        setSelectedCapabilityIds((current) => uniqueStrings([...current, ...capIds]));
      }

      // PPG-WIRE-MS0 U-PPGW09: Auto-enable prove-out for low confidence fingerprints
      // Confidence < 0.6: Auto-enable prove-out, show warning
      // Confidence < 0.85: Recommend prove-out, show amber indicator
      const confidence = result.confidence ?? 1.0;
      if (confidence < 0.6) {
        setProveOutEnabled(true);
        setConfidenceWarning('low');
      } else if (confidence < 0.85) {
        setConfidenceWarning('medium');
      } else {
        setConfidenceWarning(null);
      }
    },
    [controllers],
  );

  const handleFeatureToggle = useCallback(
    (featureId: string, enabled: boolean) => {
      setEnabledFeatures((prev) => {
        const next = new Set(prev);
        if (enabled) next.add(featureId);
        else next.delete(featureId);
        return next;
      });

      // Map feature toggles → capability IDs for the generation pipeline
      const featureToCapability: Record<string, string> = {
        probing: 'probing_cycles',
        hsm: 'high_speed_smoothing',
        tcp: 'rtcp',
        subprograms: 'subprograms',
      };
      const capId = featureToCapability[featureId];
      if (capId) {
        setSelectedCapabilityIds((current) =>
          enabled
            ? uniqueStrings([...current, capId])
            : current.filter((id) => id !== capId),
        );
      }
    },
    [],
  );

  const handleControllerOverride = useCallback(
    (overrideValue: string) => {
      setControllerOverride(overrideValue);
      if (overrideValue) {
        if (controllers.some((c) => c.value === overrideValue)) {
          setController(overrideValue);
        }
      } else if (fingerprint) {
        const autoValue = fingerprint.controller_family;
        if (controllers.some((c) => c.value === autoValue)) {
          setController(autoValue);
        }
      }
    },
    [controllers, fingerprint],
  );

  function toggleCapability(id: string) {
    setSelectedCapabilityIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function loadRecommendedStack() {
    setSelectedCapabilityIds((current) =>
      uniqueStrings([...current, ...requiredCapabilityIds, ...recommendedCapabilityIds]),
    );
  }

  function selectFullMachineStack() {
    setSelectedCapabilityIds((current) =>
      uniqueStrings([...current, ...visibleCapabilities.map((item) => item.id)]),
    );
  }

  async function handleGenerate() {
    setLoadingAction(true);
    setError(null);
    setLane('generate');

    try {
      // PPG-VAR-MS0 U01: Try real 38-stage pipeline first
      const hasMaterial = selectedMaterialId && selectedMaterialKc > 0;
      const hasTool = parseFloat(toolDiameter) > 0;
      void (gcodeInput.trim() === DEFAULT_PROGRAM.trim());
      const hasGcode = gcodeInput.trim().length > 10;

      if (hasGcode) {
        // Build full PipelineInput for the real pipeline
        const pipelineInput: Record<string, unknown> = {
          gcode: gcodeInput,
          controller: selectedController.value || 'fanuc',
          stages: buildStageConfig(),
          include_analytics: true,
          aggressiveness: 0.5,
          optimization_target: 'balanced',
          output_mode: outputMode,
        };

        // Add material context if user selected one
        if (hasMaterial) {
          pipelineInput.material = {
            name: selectedMaterialName,
            iso_group: selectedMaterialIso,
            kc1_1: selectedMaterialKc,
            mc: selectedMaterialMc,
          };
        }

        // Add tool context if user entered one
        if (hasTool) {
          pipelineInput.tools = [{
            tool_number: 1,
            diameter_mm: parseFloat(toolDiameter),
            flute_count: parseInt(toolFlutes, 10) || 4,
            type: toolType,
            material: toolMaterial,
          }];
        }

        // Add machine context from fingerprint
        if (machineModel) {
          pipelineInput.machine = { name: machineModel };
        }

        try {
          const pipeRes = await ppgPipelineProcess(pipelineInput);
          const pipeData = unwrapPayload(pipeRes) as Record<string, unknown> | null;

          if (pipeData?.output_gcode || pipeData?.stages) {
            // Pipeline succeeded — use real physics output
            setPipelineResult(pipeData);
            setPipelineStages((pipeData?.stages ?? []) as Array<{stage: string; status: string; data: Record<string, unknown>}>);
            setOriginalGcode(gcodeInput);

            const outputGcode = String(pipeData.output_gcode || gcodeInput);
            const stageArr = (pipeData.stages ?? []) as Array<{status: string}>;
            const stageCount = stageArr.filter((s) => s.status === 'pass').length;

            const nextGenerated: GeneratedOutput = {
              post_name: programName || 'PRISM_OPTIMIZED',
              controller: selectedController.label,
              cam_system: selectedCam.label,
              operation: selectedOperation.label,
              machine_model: machineModel,
              estimated_lines: outputGcode.split('\n').filter(Boolean).length,
              optimization_package: `PRISM Physics Pipeline (${stageCount} stages)`,
              capabilities: [
                ...selectedCapabilityDetails.map((item) => item.label),
                ...(hasMaterial ? [`Auto S/F: ${selectedMaterialName}`] : []),
                ...(stageCount > 0 ? [`${stageCount} physics stages active`] : []),
              ],
              preview: outputGcode,
            };

            setGenerated(nextGenerated);
            // Auto-show diff when pipeline produces different output
            if (outputGcode !== gcodeInput) {
              setShowDiff(true);
            }
            setLoadingAction(false);
            return;
          }
        } catch {
          // Pipeline failed — fall through to template
        }
      }

      // Fallback: existing template-based generation
      const response =
        strategy === 'multi_operation'
          ? await ppgProgram({
              cam_system: camSystem,
              controller: selectedController.label,
              machine_type: selectedMachinePosture.label,
              machine_model: machineModel,
              operation,
              program_name: programName,
              notes,
            })
          : await ppgGenerate({
              cam_system: camSystem,
              controller: selectedController.label,
              machine_type: selectedMachinePosture.label,
              machine_model: machineModel,
              operation,
              program_name: programName,
              notes,
            });

      const payload = unwrapPayload(response) as Record<string, unknown> | null;
      const fallback = buildLocalGeneratedOutput({
        programName,
        controllerLabel: selectedController.label,
        camLabel: selectedCam.label,
        operationLabel: selectedOperation.label,
        machineModel,
        machinePostureLabel: selectedMachinePosture.label,
        selectedCapabilityLabels: selectedCapabilityDetails.map((item) => item.label),
      });
      const preview = String(payload?.gcode ?? payload?.program ?? payload?.preview ?? '');
      const capabilities = Array.isArray(payload?.capabilities)
        ? (payload?.capabilities as string[])
        : fallback.capabilities;

      const nextGenerated: GeneratedOutput = {
        post_name: String(payload?.post_name ?? payload?.name ?? programName),
        controller: String(payload?.controller ?? selectedController.label),
        cam_system: String(payload?.cam_system ?? selectedCam.label),
        operation: String(payload?.operation ?? selectedOperation.label),
        machine_model: String(payload?.machine_model ?? machineModel),
        estimated_lines: Number(
          payload?.program_line_count ??
            (preview.split('\n').filter(Boolean).length || fallback.estimated_lines),
        ),
        optimization_package: String(
          payload?.optimization_package ?? fallback.optimization_package,
        ),
        capabilities: uniqueStrings([
          ...capabilities,
          ...selectedCapabilityDetails.map((item) => item.label),
        ]),
        preview: preview || fallback.preview,
      };

      setGenerated(nextGenerated);
      setGcodeInput(nextGenerated.preview);
    } catch (issue) {
      if (issue instanceof ApiError) {
        setError(`${issue.message} Falling back to a local post brief.`);
      } else {
        setError('Unable to reach the post generator right now. Showing a local packet.');
      }

      const fallback = buildLocalGeneratedOutput({
        programName,
        controllerLabel: selectedController.label,
        camLabel: selectedCam.label,
        operationLabel: selectedOperation.label,
        machineModel,
        machinePostureLabel: selectedMachinePosture.label,
        selectedCapabilityLabels: selectedCapabilityDetails.map((item) => item.label),
      });
      setGenerated(fallback);
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleValidate() {
    setLoadingAction(true);
    setError(null);
    setLane('validate');

    const provisionalChecks = buildReleaseChecks({
      machinePosture,
      machinePostureLabel: selectedMachinePosture.label,
      selectedCapabilityIds,
      missingRequired,
      missingRecommended,
      generated,
      validation: null,
      comparison,
    });

    try {
      const response = await ppgValidate({
        controller: selectedController.label,
        gcode: gcodeInput,
      });
      const payload = unwrapPayload(response) as Record<string, unknown> | null;
      const warnings = uniqueStrings([
        ...(Array.isArray(payload?.warnings) ? (payload.warnings as string[]) : []),
        ...provisionalChecks
          .filter((check) => check.status !== 'ready')
          .map((check) => check.detail),
      ]);
      const passes = uniqueStrings([
        ...(Array.isArray(payload?.passes) ? (payload.passes as string[]) : []),
        ...provisionalChecks
          .filter((check) => check.status === 'ready')
          .map((check) => check.label),
      ]);
      const fallback = buildLocalValidationOutput(
        selectedController.label,
        gcodeInput,
        provisionalChecks,
      );

      setValidation({
        status: String(payload?.status ?? fallback.status) as ValidationOutput['status'],
        score: Number(payload?.score ?? payload?.confidence ?? fallback.score),
        warnings,
        passes,
        controller: selectedController.label,
      });
    } catch (issue) {
      if (issue instanceof ApiError) {
        setError(`${issue.message} Showing a local readiness review instead.`);
      } else {
        setError('Unable to validate live right now. Showing a local readiness review instead.');
      }
      setValidation(
        buildLocalValidationOutput(
          selectedController.label,
          gcodeInput,
          provisionalChecks,
        ),
      );
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleCompare() {
    setLoadingAction(true);
    setError(null);
    setLane('compare');

    try {
      const response = await ppgCompare({
        gcode: gcodeInput,
        controllers: [selectedController.label, selectedCompareTarget.label],
      });
      const payload = unwrapPayload(response) as Record<string, unknown> | null;
      const fallback = buildLocalComparisonOutput(
        selectedController.label,
        selectedCompareTarget.label,
        machinePosture,
      );
      setComparison({
        baseline: selectedController.label,
        target: selectedCompareTarget.label,
        delta_summary: Array.isArray(payload?.differences)
          ? uniqueStrings(payload.differences as string[])
          : Array.isArray(payload?.delta_summary)
            ? uniqueStrings(payload.delta_summary as string[])
            : fallback.delta_summary,
        baseline_notes: Array.isArray(payload?.baseline_notes)
          ? uniqueStrings(payload.baseline_notes as string[])
          : fallback.baseline_notes,
        target_notes: Array.isArray(payload?.target_notes)
          ? uniqueStrings(payload.target_notes as string[])
          : fallback.target_notes,
        baseline_gcode: typeof payload?.baseline_gcode === 'string' ? payload.baseline_gcode
          : typeof payload?.baseline_output === 'string' ? payload.baseline_output
          : gcodeInput || undefined,
        target_gcode: typeof payload?.target_gcode === 'string' ? payload.target_gcode
          : typeof payload?.target_output === 'string' ? payload.target_output
          : undefined,
      });
    } catch (issue) {
      if (issue instanceof ApiError) {
        setError(`${issue.message} Showing a local controller-delta brief instead.`);
      } else {
        setError('Unable to compare live right now. Showing a local delta brief instead.');
      }
      setComparison(
        buildLocalComparisonOutput(
          selectedController.label,
          selectedCompareTarget.label,
          machinePosture,
        ),
      );
    } finally {
      setLoadingAction(false);
    }
  }

  // PP-MOAT-MS4 U02: Auto-detect controller from G-code content
  const autoDetectController = useCallback((gcode: string) => {
    const lines = gcode.split('\n').slice(0, 20).join('\n');
    // Heidenhain — very distinct syntax
    if (/BEGIN PGM|BLK FORM|CYCL DEF|TCH PROBE/i.test(lines)) {
      setDetectedController('heidenhain_tnc640');
      setDetectedConfidence('high');
      const match = controllers.find(c => c.value.startsWith('heidenhain'));
      if (match) setController(match.value);
      return;
    }
    // Siemens — semicolon paths and CYCLE calls
    if (/;\$PATH=|CYCLE800|CYCLE\d{3}|DEF\s+INT|PROC\s/i.test(lines)) {
      setDetectedController('siemens_840d');
      setDetectedConfidence('high');
      const match = controllers.find(c => c.value.startsWith('siemens'));
      if (match) setController(match.value);
      return;
    }
    // Haas — O00001 format, G65 P macros
    if (/^O0{3,}\d/m.test(lines) || /G65\s*P\d{4}/.test(lines)) {
      setDetectedController('haas');
      setDetectedConfidence('high');
      const match = controllers.find(c => c.value.startsWith('haas'));
      if (match) setController(match.value);
      return;
    }
    // Mazak — Mazatrol hints or G10 L2
    if (/MAZATROL|G10\s*L2/i.test(lines)) {
      setDetectedController('mazak');
      setDetectedConfidence('medium');
      const match = controllers.find(c => c.value.startsWith('mazak'));
      if (match) setController(match.value);
      return;
    }
    // Fanuc — most generic, check last (O-number, parenthesis comments)
    if (/^[%O]\d/m.test(lines) || /\(.*\)/.test(lines) || /M98\s*P/i.test(lines)) {
      setDetectedController('fanuc');
      setDetectedConfidence('medium');
      const match = controllers.find(c => c.value.startsWith('fanuc'));
      if (match) setController(match.value);
      return;
    }
    setDetectedController(null);
    setDetectedConfidence('');
  }, [controllers, setController]);

  // PP-MOAT-MS4 U01: File handling
  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setGcodeInput(text);
      setOriginalGcode(text);
      setFileName(file.name);
      setFileSize(file.size);
      autoDetectController(text);
    };
    reader.readAsText(file);
  }, [autoDetectController]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleDownload = useCallback(() => {
    const output = generated?.preview ?? '';
    if (!output) return;
    const baseName = fileName ? fileName.replace(/\.[^.]+$/, '') : 'program';
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_PRISM_optimized.nc`;
    a.click();
    URL.revokeObjectURL(url);
  }, [generated, fileName]);

  // PP-MOAT-MS4 U02: Clipboard copy
  const handleCopyToClipboard = useCallback(async () => {
    const output = generated?.preview ?? '';
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch { /* fallback: select text */ }
  }, [generated]);

  // PP-MOAT-MS4 U04: History
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await ppgHistory();
      const payload = unwrapPayload(res) as Record<string, unknown> | null;
      if (payload) {
        const items = payload.history ?? payload.runs ?? payload.items ?? [];
        if (Array.isArray(items)) {
          setHistory(items as Array<{ id: string; timestamp: string; controller: string; lines: number; status: string }>);
        }
      }
    } catch { /* history unavailable */ }
    setHistoryLoading(false);
  }, []);

  // PPG-VAR-MS0 U03: Material search
  const handleMaterialSearch = useCallback(async (query: string) => {
    setMaterialSearchQuery(query);
    if (query.length < 2) { setMaterialSearchResults([]); return; }
    try {
      const res = await ppgMaterialSearch(query);
      const payload = unwrapPayload(res) as Record<string, unknown> | null;
      const mats = (payload?.materials ?? []) as Array<{id: string; name: string; iso_group: string; kc1_1: number; mc: number; hardness_HB?: number}>;
      setMaterialSearchResults(mats);
    } catch {
      // Fallback: basic client-side list
      const common = [
        { id: 'steel', name: 'Carbon Steel (C35-C45)', iso_group: 'P', kc1_1: 1800, mc: 0.25, hardness_HB: 180 },
        { id: 'alloy_steel', name: 'Alloy Steel (4140/4340)', iso_group: 'P', kc1_1: 2100, mc: 0.25, hardness_HB: 280 },
        { id: 'stainless_304', name: 'Stainless Steel 304', iso_group: 'M', kc1_1: 2100, mc: 0.25, hardness_HB: 200 },
        { id: 'aluminum_6061', name: 'Aluminum 6061-T6', iso_group: 'N', kc1_1: 700, mc: 0.23, hardness_HB: 95 },
        { id: 'titanium', name: 'Titanium Ti-6Al-4V', iso_group: 'S', kc1_1: 2800, mc: 0.28, hardness_HB: 334 },
        { id: 'tool_steel', name: 'Tool Steel (D2/H13)', iso_group: 'H', kc1_1: 3000, mc: 0.28, hardness_HB: 500 },
        { id: 'cast_iron', name: 'Gray Cast Iron (GG25)', iso_group: 'K', kc1_1: 1100, mc: 0.28, hardness_HB: 210 },
        { id: 'inconel_718', name: 'Inconel 718', iso_group: 'S', kc1_1: 2800, mc: 0.28, hardness_HB: 350 },
        { id: 'brass', name: 'Brass (CuZn39Pb3)', iso_group: 'N', kc1_1: 700, mc: 0.23, hardness_HB: 120 },
      ];
      const q = query.toLowerCase();
      setMaterialSearchResults(common.filter(m => m.name.toLowerCase().includes(q) || m.id.includes(q)));
    }
  }, []);

  const selectMaterial = useCallback((mat: {id: string; name: string; iso_group: string; kc1_1: number; mc: number}) => {
    setSelectedMaterialId(mat.id);
    setSelectedMaterialName(mat.name);
    setSelectedMaterialIso(mat.iso_group);
    setSelectedMaterialKc(mat.kc1_1);
    setSelectedMaterialMc(mat.mc);
    setMaterialSearchResults([]);
    setMaterialSearchQuery(mat.name);
  }, []);

  // PPG-VAR-MS0 U02: Map feature toggles to pipeline StageConfig
  const buildStageConfig = useCallback(() => {
    const stages: Record<string, boolean> = {};
    const caps = new Set(selectedCapabilityIds);
    // Core physics — always on
    stages.speed_feed = true;
    stages.engagement_analysis = true;
    stages.chip_thinning = true;
    stages.adaptive_feed = true;
    stages.corner_detection = true;
    stages.wear_progression = true;
    stages.thermal_tracking = true;
    stages.coupled_thermal_wear = true;
    stages.safety_analysis = true;
    stages.gcode_generation = true;
    stages.analytics_report = true;
    stages.cycle_time = true;
    // Feature toggles
    if (caps.has('probing_cycles')) stages.probe_routines = true;
    if (caps.has('high_speed_smoothing')) {
      stages.toolpath_smoothing = true;
      stages.motion_dynamics = true;
      stages.look_ahead = true;
    }
    if (caps.has('rtcp')) stages.multi_axis = true;
    if (caps.has('ssv')) stages.stability_rewrite = true;
    if (caps.has('subprograms') || caps.has('chip_conveyor')) stages.controller_features = true;
    return stages;
  }, [selectedCapabilityIds]);

  // Wizard step completion checks
  const wizardStepComplete = useMemo(() => ({
    1: !!controller && !!machinePosture,
    2: !!selectedMaterialId,
    3: !!toolDiameter && parseFloat(toolDiameter) > 0,
    4: !!camSystem,
    5: false, // generate is the action step
  }), [controller, machinePosture, selectedMaterialId, toolDiameter, camSystem]);

  const canAdvanceWizard = wizardStepComplete[wizardStep];

  // PPG-SHIP-MS0 U-SH16: Live S/F preview when tool+material selected
  useEffect(() => {
    const d = parseFloat(toolDiameter);
    if (!selectedMaterialId || !d || d <= 0 || pageMode !== 'wizard') {
      setSfPreview(null);
      return;
    }
    const ac = new AbortController();
    const timer = setTimeout(async () => {
      setSfPreviewLoading(true);
      try {
        const res = await calculateSpeedFeed({
          material: selectedMaterialName || selectedMaterialId,
          operation,
          tool_diameter_mm: d,
          doc_mm: d * 0.5,
        });
        if (ac.signal.aborted) return;
        const r = (res as unknown as Record<string, unknown>).result as Record<string, unknown> | undefined;
        if (r) {
          const speed = r.speed as Record<string, unknown> | undefined;
          const feed = r.feed as Record<string, unknown> | undefined;
          const force = r.force as Record<string, unknown> | undefined;
          const power = r.power as Record<string, unknown> | undefined;

          const rpm = Number(speed?.rpm ?? speed?.RPM ?? 0);
          const feedRate = Number(feed?.feed_rate_mmmin ?? feed?.vf ?? feed?.feed_mmmin ?? 0);
          const sfm = Number(speed?.sfm ?? speed?.SFM ?? (d > 0 ? rpm * Math.PI * d / 1000 * 3.281 : 0));
          const fz = Number(feed?.fz ?? feed?.ipt ?? 0);
          const fc = Number(force?.Fc ?? force?.cutting_force_N ?? 0);
          const pw = Number(power?.kW ?? power?.power_kW ?? 0);

          // Apply TIR derating from holder if selected
          const tirFactor = selectedHolder
            ? Math.max(0.85, Math.min(1.0, 1.0 - (selectedHolder.tir_um / 1000 * 100)))
            : 1.0;

          setSfPreview({
            rpm: Math.round(rpm * tirFactor),
            feed_mmmin: feedRate * tirFactor,
            sfm: sfm * tirFactor,
            ipt: fz,
            force_N: fc,
            power_kW: pw,
          });
        }
      } catch {
        if (!ac.signal.aborted) setSfPreview(null);
      } finally {
        if (!ac.signal.aborted) setSfPreviewLoading(false);
      }
    }, 500);
    return () => {
      ac.abort();
      clearTimeout(timer);
    };
  }, [selectedMaterialId, selectedMaterialName, toolDiameter, operation, selectedHolder, pageMode]);

  return (
    <div className="space-y-6">
      {/* Breadcrumb nav (PP-MS11/U-PP46) */}
      <nav className="flex items-center gap-2 text-sm text-slate-400" aria-label="Breadcrumb">
        <Link to="/post-processor" className="hover:text-cyan-400 transition">Post Processor</Link>
        <span aria-hidden="true">/</span>
        <span className="text-slate-200">Generator</span>
        <span aria-hidden="true" className="mx-2 text-slate-600">|</span>
        <SurfaceCrossLink
          to="/ppg-lite"
          label="Lite editor"
          note="3-col G-code editor with AI panel + shortcuts"
          accent="violet"
        />
      </nav>
      <WorkspaceHero
        eyebrow="Post workflow"
        title="Post Processor Generator"
        description={pageMode === 'wizard'
          ? 'Follow the guided steps to configure your machine, material, tooling, and CAM system — then generate an optimized post processor.'
          : 'Stage machine options, controller behavior, prove-out posture, and downstream packet continuity instead of stopping at raw NC text.'}
        metrics={
          <>
            {pageMode === 'wizard' ? (
              <>
                <SummaryTile
                  label="Machine"
                  value={machineModel || selectedMachinePosture.label}
                  hint={wizardStepComplete[1] ? selectedController.label : 'Configure in step 1'}
                  accent={wizardStepComplete[1] ? 'from-emerald-400/20 via-emerald-300/10 to-transparent' : 'from-cyan-400/22 via-cyan-300/10 to-transparent'}
                />
                <SummaryTile
                  label="Material"
                  value={selectedMaterialName || 'Not selected'}
                  hint={selectedMaterialIso ? `ISO ${selectedMaterialIso} \u00B7 kc1.1=${selectedMaterialKc}` : 'Configure in step 2'}
                  accent={wizardStepComplete[2] ? 'from-emerald-400/20 via-emerald-300/10 to-transparent' : 'from-slate-400/10 via-slate-300/5 to-transparent'}
                />
                <SummaryTile
                  label="Progress"
                  value={`Step ${wizardStep} of 5`}
                  hint={WIZARD_STEPS[wizardStep - 1].label + ' — ' + WIZARD_STEPS[wizardStep - 1].hint}
                  accent="from-violet-400/22 via-violet-300/10 to-transparent"
                />
              </>
            ) : (
              <>
            <SummaryTile
              label="Active lane"
              value={activeLane.label}
              hint={activeLane.detail}
              accent="from-cyan-400/22 via-cyan-300/10 to-transparent"
            />
            <SummaryTile
              label="Controller posture"
              value={selectedController.label}
              hint={`${selectedMachinePosture.label} \u00B7 ${selectedOperation.label}`}
              accent="from-emerald-400/20 via-emerald-300/10 to-transparent"
            />
            <SummaryTile
              label="Release posture"
              value={readinessSummary}
              hint={`${selectedCapabilityIds.length} capability gates selected`}
              accent="from-violet-400/22 via-violet-300/10 to-transparent"
            />
              </>
            )}
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Workflow lanes
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  Object.entries(LANE_CONFIG) as Array<
                    [Lane, { label: string; detail: string }]
                  >
                ).map(([key, config]) => (
                  <TabButton
                    key={key}
                    active={lane === key}
                    onClick={() => setLane(key)}
                  >
                    {config.label}
                  </TabButton>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill label={selectedCam.label} tone="sky" />
              <StatusPill label={selectedMachinePosture.label} tone="violet" />
              <StatusPill label={selectedOperation.label} tone="emerald" />
              <StatusPill label={recommendedTier} tone="amber" />
            </div>
            {(sourceContextLabel || upstreamSourceLabel || upstreamRecordLabel) && (
              <div className="rounded-[22px] border border-cyan-300/12 bg-cyan-300/[0.05] p-4 text-sm text-slate-200">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/90">
                  Packet source
                </div>
                {sourceContextLabel ? (
                  <div className="mt-2">
                    Opened from <span className="font-semibold">{sourceContextLabel}</span>.
                  </div>
                ) : null}
                {upstreamSourceLabel ? (
                  <div className="mt-1 text-slate-300">
                    Commercial origin remains{' '}
                    <span className="font-semibold">{upstreamSourceLabel}</span>.
                  </div>
                ) : null}
                {upstreamRecordLabel ? (
                  <div className="mt-1 text-slate-400">{upstreamRecordLabel}</div>
                ) : null}
              </div>
            )}
            {loadingCatalog ? (
              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                Loading controller and operation catalogs. Local coverage stays available while the live catalog hydrates.
              </div>
            ) : null}
          </div>
        }
      />

      {workspaceContext ? (
        <MachineWorkspaceAuthorityCard
          context={workspaceContext}
          title="Shared routed post authority"
          subtitle={`This post workflow now inherits the same JM Die machine, controller, selector, and programming posture from ${routedSourceLabel}.`}
        />
      ) : null}

      {workspaceContext ? (
        <div className="rounded-[22px] border border-cyan-300/12 bg-cyan-300/[0.05] px-5 py-4 text-sm leading-6 text-slate-200">
          Routed JM Die defaults are loaded for this post workflow. You can still override the machine posture, controller, CAM, and packet details locally before generation.
          {routedControllerWasMapped
            ? ` The routed controller "${routedControllerLabel}" was mapped to "${selectedController.label}" for current post coverage.`
            : ''}
        </div>
      ) : null}

      {hasUnsupportedRoutedPosture ? (
        <PanelCard
          title="Routed post generation is not active for this machine posture"
          subtitle="PRISM keeps unsupported routed EDM post flows fail-closed until the canonical controller and post contract exists."
        >
          <div className="space-y-4 text-sm text-slate-300">
            <p>{routedUnsupportedReason}</p>
            <p>
              Keep using the routed JM Die authority above as the source of truth for machine and programming posture, then hand this flow through Print to CNC or Toolpath Advisor until EDM post coverage is extracted.
            </p>
          </div>
        </PanelCard>
      ) : (
      <>
      {error ? (
        <div className="rounded-[24px] border border-amber-300/14 bg-amber-300/[0.08] px-5 py-4 text-sm text-amber-100">
          {error}
        </div>
      ) : null}

      {/* Mode toggle: Lanes (advanced) vs Wizard (guided) */}
      <div className="flex items-center gap-3">
        <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-1">
          <button
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${pageMode === 'wizard' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' : 'text-slate-400 hover:text-slate-200'}`}
            onClick={() => setPageMode('wizard')}
          >
            Guided wizard
          </button>
          <button
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${pageMode === 'lanes' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' : 'text-slate-400 hover:text-slate-200'}`}
            onClick={() => setPageMode('lanes')}
          >
            Advanced lanes
          </button>
        </div>
        <span className="text-xs text-slate-500">
          {pageMode === 'wizard' ? 'Step-by-step guided post generation' : '6-lane power user workflow'}
        </span>
      </div>

      {/* ═══════════════ WIZARD MODE ═══════════════ */}
      {pageMode === 'wizard' && (
        <div className="space-y-6">
          {/* Step indicator */}
          <div className="flex items-center gap-1">
            {WIZARD_STEPS.map((s, idx) => (
              <div key={s.step} className="flex items-center">
                <button
                  onClick={() => {
                    // Can navigate to any completed step or the current step
                    if (s.step <= wizardStep || (s.step === wizardStep + 1 && canAdvanceWizard)) {
                      setWizardStep(s.step);
                    }
                  }}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    s.step === wizardStep
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                      : s.step < wizardStep || wizardStepComplete[s.step]
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-400/20'
                        : 'text-slate-500 border border-white/6 bg-white/[0.02]'
                  }`}
                  disabled={s.step > wizardStep + 1}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/30 text-xs">
                    {wizardStepComplete[s.step] && s.step < wizardStep ? '\u2713' : s.step}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {idx < WIZARD_STEPS.length - 1 && (
                  <div className={`mx-1 h-px w-6 ${s.step < wizardStep ? 'bg-emerald-400/40' : 'bg-white/10'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step content */}
          <PanelCard
            title={`Step ${wizardStep}: ${WIZARD_STEPS[wizardStep - 1].label}`}
            subtitle={WIZARD_STEPS[wizardStep - 1].hint}
          >
            {wizardStep === 1 && (
              <div className="space-y-6">
                <MachinePickerPanel
                  onFingerprintChange={(fp) => {
                    setFingerprint(fp);
                    if (fp?.matched_profile) {
                      setMachineModel(`${fp.matched_profile.brand} ${fp.matched_profile.model}`);
                      // Auto-fill controller from fingerprint
                      const ctrlFamily = fp.controller_family?.toLowerCase().replace(/\s+/g, '_');
                      if (ctrlFamily) {
                        const match = controllers.find(c => c.value.includes(ctrlFamily));
                        if (match) setController(match.value);
                      }
                    }
                  }}
                  onManufacturerChange={() => {}}
                  onModelChange={(m) => { if (m) setMachineModel(m); }}
                />
                <FeatureTogglePanel
                  fingerprint={fingerprint}
                  enabledFeatures={enabledFeatures}
                  onToggle={(fid, on) => {
                    setEnabledFeatures(prev => {
                      const next = new Set(prev);
                      if (on) next.add(fid); else next.delete(fid);
                      return next;
                    });
                  }}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Machine posture">
                    <Select
                      aria-label="Machine posture"
                      value={machinePosture}
                      onChange={(e) => setMachinePosture(e.target.value)}
                    >
                      {MACHINE_POSTURES.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Controller">
                    <Select
                      aria-label="Controller"
                      value={controller}
                      onChange={(e) => setController(e.target.value)}
                    >
                      {controllers.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <MaterialSearchPanel
                selected={selectedMaterialId ? {
                  id: selectedMaterialId,
                  name: selectedMaterialName,
                  iso_group: selectedMaterialIso,
                  kc1_1: selectedMaterialKc,
                  mc: selectedMaterialMc,
                } : null}
                onSelect={(mat) => {
                  setSelectedMaterialId(mat.id);
                  setSelectedMaterialName(mat.name);
                  setSelectedMaterialIso(mat.iso_group);
                  setSelectedMaterialKc(mat.kc1_1);
                  setSelectedMaterialMc(mat.mc);
                }}
              />
            )}

            {wizardStep === 3 && (
              <div className="space-y-6">
                {/* Tool search + manual config */}
                <ToolConfigCard
                  diameter={toolDiameter}
                  flutes={toolFlutes}
                  toolType={toolType}
                  toolMaterial={toolMaterial}
                  onDiameterChange={setToolDiameter}
                  onFlutesChange={setToolFlutes}
                  onToolTypeChange={setToolType}
                  onToolMaterialChange={setToolMaterial}
                  selectedTool={selectedTool}
                  onSelectTool={setSelectedTool}
                />

                {/* Holder selector */}
                <div className="border-t border-white/6 pt-6">
                  <div className="mb-3 text-sm font-semibold text-slate-300">Tool holder</div>
                  <HolderSelectorPanel
                    selected={selectedHolder}
                    onSelect={setSelectedHolder}
                  />
                </div>

                {/* Operation + strategy */}
                <div className="grid gap-3 border-t border-white/6 pt-6 sm:grid-cols-2">
                  <Field label="Operation">
                    <Select
                      aria-label="Operation"
                      value={operation}
                      onChange={(e) => setOperation(e.target.value)}
                    >
                      {operations.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Program style">
                    <Select
                      aria-label="Strategy"
                      value={strategy}
                      onChange={(e) => setStrategy(e.target.value)}
                    >
                      <option value="ai_enhanced">AI-enhanced release</option>
                      <option value="production_safe">Production safe</option>
                      <option value="prove_out">Operator prove-out</option>
                      <option value="multi_operation">Multi-operation packet</option>
                    </Select>
                  </Field>
                </div>

                {/* S/F Physics Preview (U-SH16) */}
                {selectedMaterialId && parseFloat(toolDiameter) > 0 && (
                  <div className="rounded-[16px] border border-amber-400/15 bg-amber-400/[0.04] px-4 py-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-300/80">
                      Speed & feed preview
                    </div>
                    {sfPreviewLoading ? (
                      <div className="text-sm text-slate-400">Calculating...</div>
                    ) : sfPreview ? (
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <div className="text-lg font-bold text-amber-200">{sfPreview.rpm.toLocaleString()}</div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-500">RPM</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-amber-200">{sfPreview.feed_mmmin.toFixed(0)}</div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-500">mm/min feed</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-amber-200">{sfPreview.sfm.toFixed(0)}</div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-500">SFM</div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-300">{sfPreview.ipt.toFixed(4)}</div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-500">IPT</div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-300">{sfPreview.force_N.toFixed(0)} N</div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-500">Cutting force</div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-300">{sfPreview.power_kW.toFixed(2)} kW</div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-500">Power</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">
                        Select a material and configure tool to see live speed/feed preview
                      </div>
                    )}
                    {selectedHolder && sfPreview && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <StatusPill label={`TIR ${selectedHolder.tir_um}\u00B5m`} tone={selectedHolder.tir_um <= 3 ? 'emerald' : selectedHolder.tir_um <= 8 ? 'amber' : 'rose'} />
                        <StatusPill label={`Holder: ${selectedHolder.name}`} tone="violet" />
                      </div>
                    )}
                  </div>
                )}

                {/* Physics Analysis Panel (U-PPGW09) */}
                {selectedMaterialId && sfPreview && (
                  <PhysicsDetailsPanel
                    kienzle={{
                      kc1_1: selectedMaterialKc,
                      mc: selectedMaterialMc,
                      iso_group: selectedMaterialIso as "P" | "M" | "K" | "N" | "S" | "H",
                      source: "MaterialSearchEngine v1.0",
                    }}
                    taylor={null}
                    chatter={null}
                    forces={{
                      Fc_N: sfPreview.force_N,
                      Fc_uncertainty_N: sfPreview.force_N * 0.1,
                      power_kW: sfPreview.power_kW,
                      torque_Nm: (sfPreview.power_kW * 1000) / (2 * Math.PI * sfPreview.rpm / 60),
                      source: "SpeedFeedOrchestrator + KienzleForceEngine v1.0",
                    }}
                    showSources={true}
                  />
                )}
              </div>
            )}

            {wizardStep === 4 && (
              <div className="space-y-6">
                {/* CAM package card grid (U-SH17) */}
                <div>
                  <div className="mb-3 text-sm font-semibold text-slate-300">Select CAM software</div>
                  <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {CAM_PACKAGES.map((pkg) => (
                      <button
                        key={pkg.value}
                        onClick={() => setCamSystem(pkg.value)}
                        className={`rounded-[14px] border px-4 py-3 text-left transition ${
                          camSystem === pkg.value
                            ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200'
                            : 'border-white/6 bg-white/[0.02] text-slate-300 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="text-sm font-semibold">{pkg.label}</div>
                        <div className="mt-1 text-[11px] leading-tight text-slate-500">{pkg.detail}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Program name */}
                <Field label="Program name">
                  <Input
                    aria-label="Program name"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    placeholder="e.g. PRISM_VF2_PRODUCTION"
                  />
                </Field>

                {/* G-code input */}
                <Field label="G-code input (paste or upload)">
                  <textarea
                    className="min-h-[200px] w-full resize-y rounded-[12px] border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-slate-200 focus:border-cyan-400/40 focus:outline-none"
                    value={gcodeInput}
                    onChange={(e) => setGcodeInput(e.target.value)}
                    placeholder="Paste your G-code here, or upload an NC file..."
                  />
                </Field>
              </div>
            )}

            {wizardStep === 5 && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <SummaryTile
                    label="Machine"
                    value={machineModel || selectedMachinePosture.label}
                    hint={selectedController.label}
                    accent="from-cyan-400/22 via-cyan-300/10 to-transparent"
                  />
                  <SummaryTile
                    label="Material"
                    value={selectedMaterialName || 'Not set'}
                    hint={selectedMaterialIso ? `ISO ${selectedMaterialIso} \u00B7 kc1.1=${selectedMaterialKc}` : 'Select in step 2'}
                    accent="from-emerald-400/20 via-emerald-300/10 to-transparent"
                  />
                  <SummaryTile
                    label="Tool"
                    value={selectedTool ? selectedTool.name : toolDiameter ? `\u00D8${toolDiameter}mm ${toolFlutes}F` : 'Not set'}
                    hint={selectedHolder ? `${selectedHolder.name} \u00B7 TIR ${selectedHolder.tir_um}\u00B5m` : selectedOperation.label}
                    accent="from-violet-400/22 via-violet-300/10 to-transparent"
                  />
                  <SummaryTile
                    label="CAM"
                    value={selectedCam.label}
                    hint={`${gcodeInput.split('\n').length} lines`}
                    accent="from-amber-400/22 via-amber-300/10 to-transparent"
                  />
                </div>
                {sfPreview && (
                  <div className="rounded-[16px] border border-amber-400/12 bg-amber-400/[0.04] px-4 py-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-300/80">
                      Optimized parameters
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="text-amber-200 font-semibold">{sfPreview.rpm.toLocaleString()} RPM</span>
                      <span className="text-amber-200 font-semibold">{sfPreview.feed_mmmin.toFixed(0)} mm/min</span>
                      <span className="text-slate-400">{sfPreview.sfm.toFixed(0)} SFM</span>
                      <span className="text-slate-400">{sfPreview.force_N.toFixed(0)} N</span>
                      <span className="text-slate-400">{sfPreview.power_kW.toFixed(2)} kW</span>
                    </div>
                  </div>
                )}
                <ActionButton
                  onClick={handleGenerate}
                  disabled={loadingAction}
                >
                  {loadingAction ? 'Generating...' : 'Generate optimized post'}
                </ActionButton>
                {generated && (
                  <div className="space-y-4">
                    <div className="rounded-[16px] border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-emerald-300">
                          Post generated: {generated.post_name}
                        </span>
                        <StatusPill label={`${generated.estimated_lines} lines`} tone="emerald" />
                        <StatusPill label={generated.controller} tone="sky" />
                        <StatusPill label={generated.cam_system} tone="violet" />
                      </div>
                      {generated.capabilities?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {generated.capabilities.map((cap) => (
                            <StatusPill key={cap} label={cap} tone="slate" />
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Prove-out toggle + download (U-SH19) */}
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={proveOutEnabled}
                          onChange={(e) => setProveOutEnabled(e.target.checked)}
                          className="h-4 w-4 rounded border-white/20 bg-black/30 accent-amber-400"
                        />
                        <span>Prove-out mode</span>
                        <span className="text-xs text-slate-500">(80% speed, 50% feed)</span>
                      </label>
                      <ActionButton
                        onClick={async () => {
                          try {
                            const res = await ppgDownload({
                              post_name: generated.post_name,
                              controller: generated.controller,
                              preview: generated.preview,
                            });
                            const blob = new Blob([String((res as unknown as Record<string, unknown>).result ?? generated.preview)], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${generated.post_name}.cps`;
                            a.click();
                            URL.revokeObjectURL(url);
                          } catch {
                            // Fallback: download preview directly
                            const blob = new Blob([generated.preview || ''], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${generated.post_name}.cps`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }
                        }}
                      >
                        Download CPS
                      </ActionButton>
                    </div>

                    {/* Optimization diff: original vs optimized */}
                    {originalGcode && generated.preview && originalGcode !== generated.preview && (
                      <details className="rounded-[16px] border border-white/6 bg-white/[0.01]">
                        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-300 hover:text-cyan-400">
                          View optimization diff ({generated.preview.split('\n').length - originalGcode.split('\n').length > 0 ? '+' : ''}{generated.preview.split('\n').length - originalGcode.split('\n').length} lines)
                        </summary>
                        <div className="border-t border-white/6 p-4">
                          <GcodeComparisonPanel
                            traditional={originalGcode}
                            optimized={generated.preview}
                            controller={generated.controller}
                          />
                        </div>
                      </details>
                    )}

                    {generated.preview && (
                      <GcodePreviewPanel
                        code={generated.preview}
                        title={generated.post_name}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </PanelCard>

          {/* Wizard navigation */}
          <div className="flex items-center justify-between">
            <button
              className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06] disabled:opacity-30"
              onClick={() => setWizardStep((wizardStep - 1) as WizardStep)}
              disabled={wizardStep === 1}
            >
              Back
            </button>
            <div className="text-xs text-slate-500">
              Step {wizardStep} of 5
            </div>
            {wizardStep < 5 ? (
              <button
                className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-5 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/25 disabled:opacity-30"
                onClick={() => setWizardStep((wizardStep + 1) as WizardStep)}
                disabled={!canAdvanceWizard}
              >
                Next
              </button>
            ) : (
              <div />
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ LANES MODE (existing advanced UI) ═══════════════ */}
      {pageMode === 'lanes' && <>
      {/* Getting Started Guide (PP-MS11/U-PP48) */}
      {!generated && (
        <details className="group rounded-[24px] border border-cyan-300/10 bg-cyan-950/10">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-cyan-400 hover:text-cyan-300 focus:outline-2 focus:outline-offset-2 focus:outline-cyan-500 [&::-webkit-details-marker]:hidden list-none">
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition group-open:rotate-90"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Getting Started — How to generate your first optimized post
            </span>
          </summary>
          <div className="border-t border-cyan-300/10 px-5 py-4">
            <ol className="space-y-3 text-sm text-slate-300">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-950/50 text-[10px] font-bold text-cyan-400">1</span>
                <span><strong className="text-white">Select your machine posture</strong> — Pick 3-axis VMC, 5-axis, lathe, or mill-turn. This sets the controller dialect and available features.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-950/50 text-[10px] font-bold text-cyan-400">2</span>
                <span><strong className="text-white">Choose your controller</strong> — Haas NGC, Fanuc 31i, Siemens 840D, etc. The post will use your controller's exact M-codes and formatting.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-950/50 text-[10px] font-bold text-cyan-400">3</span>
                <span><strong className="text-white">Paste or upload G-code</strong> — Use the text area below to paste your CAM output, or use the default sample program.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-950/50 text-[10px] font-bold text-cyan-400">4</span>
                <span><strong className="text-white">Generate</strong> — PRISM runs the 38-stage physics pipeline. You'll see per-block S/F with force, confidence, and finish predictions.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-950/50 text-[10px] font-bold text-cyan-400">5</span>
                <span><strong className="text-white">Validate + Download</strong> — Run machine limit validation, enable prove-out mode if desired, then download in your controller's native format.</span>
              </li>
            </ol>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
              <span title="Tooltip: Machine posture determines which controller dialects and features are available">Machine posture = controller + features</span>
              <span className="text-slate-600">|</span>
              <span title="Tooltip: Prove-out mode reduces feeds by 25% and caps RPM to 80% for safe first-article runs">Prove-out mode = safe first-article</span>
              <span className="text-slate-600">|</span>
              <span title="Tooltip: The safety chain validates spindle limits, rapid heights, coolant calls, and tool changes">Safety chain = 6-stage automated</span>
            </div>
          </div>
        </details>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.9fr)]">
        <div className="space-y-6">
          <PanelCard
            title="Post build posture"
            subtitle="Controller coverage, prove-out posture, and release continuity all move together here."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="CAM software">
                <Select
                  aria-label="CAM software"
                  value={camSystem}
                  onChange={(event) => setCamSystem(event.target.value)}
                >
                  {CAM_PACKAGES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Machine posture">
                <Select
                  aria-label="Machine posture"
                  value={machinePosture}
                  onChange={(event) => setMachinePosture(event.target.value)}
                >
                  {MACHINE_POSTURES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Controller">
                <Select
                  aria-label="Controller"
                  value={controller}
                  onChange={(event) => setController(event.target.value)}
                >
                  {controllers.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Operation">
                <Select
                  aria-label="Operation"
                  value={operation}
                  onChange={(event) => setOperation(event.target.value)}
                >
                  {operations.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Program style">
                <Select
                  aria-label="Program style"
                  value={strategy}
                  onChange={(event) => setStrategy(event.target.value)}
                >
                  <option value="ai_enhanced">AI-enhanced release</option>
                  <option value="production_safe">Production safe</option>
                  <option value="prove_out">Operator prove-out</option>
                  <option value="multi_operation">Multi-operation packet</option>
                </Select>
              </Field>
              <Field label="Compare target">
                <Select
                  aria-label="Compare target"
                  value={selectedCompareTarget.value}
                  onChange={(event) => setCompareTarget(event.target.value)}
                >
                  {compareTargets.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Machine model">
                <Input
                  aria-label="Machine model"
                  value={machineModel}
                  onChange={(event) => setMachineModel(event.target.value)}
                  placeholder="Haas VF-2SS"
                />
              </Field>
              <Field label="Post name">
                <Input
                  aria-label="Post name"
                  value={programName}
                  onChange={(event) => setProgramName(event.target.value)}
                  placeholder="PRISM_VF2_PRODUCTION"
                />
              </Field>
            </div>

            {/* PPG-VAR-MS0 U03: Material + Tool Selection -- Emerald-Cyan Saber */}
            <div className="mt-5 ppg-saber ppg-saber--emerald-cyan ppg-saber-pulse">
              <div className="ppg-saber-inner p-5">
                <div className="ppg-saber-sweep" />
                <div className="relative z-10">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold text-slate-50">Material &amp; Tooling</div>
                      <div className="text-sm text-slate-400">Select material and tool for physics-based auto speed/feed</div>
                    </div>
                    {selectedMaterialId && parseFloat(toolDiameter) > 0 && (
                      <span className="rounded-full border border-emerald-400/40 bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,.15)]">
                        Auto S/F: ON
                      </span>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Material picker */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Work Material</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={materialSearchQuery}
                          onChange={(e) => { setMaterialSearchQuery(e.target.value); handleMaterialSearch(e.target.value); }}
                          placeholder="Search: 4140, 6061, 304 SS, Ti-6Al-4V..."
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-300/32"
                        />
                        {materialSearchResults.length > 0 && (
                          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-white/10 bg-slate-900/95 shadow-xl">
                            {materialSearchResults.map((mat) => (
                              <button
                                key={mat.id}
                                onClick={() => selectMaterial(mat)}
                                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-emerald-500/10"
                              >
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  mat.iso_group === 'P' ? 'bg-blue-500/20 text-blue-300' :
                                  mat.iso_group === 'M' ? 'bg-yellow-500/20 text-yellow-300' :
                                  mat.iso_group === 'K' ? 'bg-red-500/20 text-red-300' :
                                  mat.iso_group === 'N' ? 'bg-green-500/20 text-green-300' :
                                  mat.iso_group === 'S' ? 'bg-orange-500/20 text-orange-300' :
                                  'bg-purple-500/20 text-purple-300'
                                }`}>ISO {mat.iso_group}</span>
                                <span className="flex-1 text-slate-200">{mat.name}</span>
                                <span className="text-[10px] text-slate-500">kc={mat.kc1_1}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {selectedMaterialId && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            selectedMaterialIso === 'P' ? 'bg-blue-500/20 text-blue-300' :
                            selectedMaterialIso === 'M' ? 'bg-yellow-500/20 text-yellow-300' :
                            selectedMaterialIso === 'K' ? 'bg-red-500/20 text-red-300' :
                            selectedMaterialIso === 'N' ? 'bg-green-500/20 text-green-300' :
                            selectedMaterialIso === 'S' ? 'bg-orange-500/20 text-orange-300' :
                            'bg-purple-500/20 text-purple-300'
                          }`}>ISO {selectedMaterialIso}</span>
                          kc1.1={selectedMaterialKc} N/mm&sup2; | mc={selectedMaterialMc}
                        </div>
                      )}
                    </div>

                    {/* Tool entry */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Cutting Tool</label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={toolType}
                          onChange={(e) => setToolType(e.target.value)}
                          className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none"
                        >
                          <option value="flat_endmill">Flat End Mill</option>
                          <option value="ball_endmill">Ball End Mill</option>
                          <option value="bull_nose">Bull Nose</option>
                          <option value="face_mill">Face Mill</option>
                          <option value="drill">Drill</option>
                          <option value="tap">Tap</option>
                          <option value="reamer">Reamer</option>
                          <option value="chamfer">Chamfer</option>
                          <option value="boring_bar">Boring Bar</option>
                          <option value="insert_mill">Insert Mill</option>
                          <option value="thread_mill">Thread Mill</option>
                          <option value="slot_drill">Slot Drill</option>
                        </select>
                        <select
                          value={toolMaterial}
                          onChange={(e) => setToolMaterial(e.target.value)}
                          className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none"
                        >
                          <option value="carbide">Carbide</option>
                          <option value="hss">HSS</option>
                          <option value="cermet">Cermet</option>
                          <option value="ceramic">Ceramic</option>
                          <option value="cbn">CBN</option>
                          <option value="pcd">PCD</option>
                        </select>
                        <div className="relative">
                          <input
                            type="number"
                            value={toolDiameter}
                            onChange={(e) => setToolDiameter(e.target.value)}
                            min="0.1"
                            step="0.5"
                            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none"
                            placeholder="Diameter"
                          />
                          <span className="pointer-events-none absolute right-3 top-3 text-xs text-slate-500">mm</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            value={toolFlutes}
                            onChange={(e) => setToolFlutes(e.target.value)}
                            min="1"
                            max="16"
                            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none"
                            placeholder="Flutes"
                          />
                          <span className="pointer-events-none absolute right-3 top-3 text-xs text-slate-500">flutes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <Field label="Post notes">
                <textarea
                  aria-label="Post notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={6}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                />
              </Field>
              <Field label="Program text">
                <div
                  className={`relative rounded-2xl border-2 border-dashed transition ${
                    isDragOver
                      ? 'border-cyan-400/60 bg-cyan-400/[0.06]'
                      : 'border-white/10 bg-transparent'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <textarea
                    aria-label="Program text"
                    value={gcodeInput}
                    onChange={(event) => {
                      setGcodeInput(event.target.value);
                      if (!originalGcode) setOriginalGcode(event.target.value);
                    }}
                    rows={12}
                    className="font-mono w-full rounded-2xl border-0 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                    placeholder="Paste G-code, type it, or drag-drop an NC file here..."
                  />
                  {isDragOver && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-cyan-400/10">
                      <span className="text-lg font-bold text-cyan-300">Drop NC file here</span>
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <label className="cursor-pointer rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-400/20">
                    Upload File
                    <input
                      type="file"
                      accept=".nc,.gcode,.ngc,.tap,.mpf,.spf,.h,.cnc,.eia,.prg"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </label>
                  {fileName && (
                    <span className="text-xs text-slate-400">
                      {fileName} ({(fileSize / 1024).toFixed(1)} KB, {gcodeInput.split('\n').length} lines)
                    </span>
                  )}
                  {detectedController && (
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                      Detected: {detectedController} ({detectedConfidence})
                    </span>
                  )}
                </div>
              </Field>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <ActionButton disabled={loadingAction} onClick={handleGenerate}>
                Generate Post
              </ActionButton>
              <ActionButton
                tone="emerald"
                disabled={loadingAction}
                onClick={handleValidate}
              >
                Validate Program
              </ActionButton>
              <ActionButton
                tone="amber"
                disabled={loadingAction}
                onClick={handleCompare}
              >
                Compare Controllers
              </ActionButton>
              {/* PPG-VAR-MS0 U09: Output mode toggle */}
              <div className="ml-auto flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-1.5">
                <span className="text-[10px] uppercase tracking-widest text-slate-500">Output</span>
                <button
                  onClick={() => setOutputMode('pipeline_optimized')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${outputMode === 'pipeline_optimized' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Full PRISM
                </button>
                <button
                  onClick={() => setOutputMode('self_contained')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${outputMode === 'self_contained' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Standalone
                </button>
              </div>
            </div>
          </PanelCard>

          {lane === 'generate' && (
            <>
            <PanelCard
              title="Generated post brief"
              subtitle="Turn the controller decision into a release packet instead of a raw NC fragment."
            >
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryTile
                  label="Post name"
                  value={generated?.post_name ?? programName}
                  hint={selectedController.label}
                  accent="from-sky-400/22 via-sky-300/10 to-transparent"
                />
                <SummaryTile
                  label="Operation"
                  value={generated?.operation ?? selectedOperation.label}
                  hint={selectedMachinePosture.label}
                  accent="from-violet-400/22 via-violet-300/10 to-transparent"
                />
                <SummaryTile
                  label="Estimated lines"
                  value={String(generated?.estimated_lines ?? gcodeInput.split('\n').filter(Boolean).length)}
                  hint="Readable prove-out packet"
                  accent="from-emerald-400/20 via-emerald-300/10 to-transparent"
                />
                <SummaryTile
                  label="Optimization"
                  value={generated?.optimization_package ?? `${selectedMachinePosture.label} release`}
                  hint={recommendedTier}
                  accent="from-amber-400/22 via-amber-300/10 to-transparent"
                />
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Included capabilities
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(generated?.capabilities ?? selectedCapabilityDetails.map((item) => item.label)).map(
                      (capability) => (
                        <StatusPill key={capability} label={capability} tone="sky" />
                      ),
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Preview
                  </div>
                  <PostPreviewComponent
                    gcode={generated?.preview ?? gcodeInput}
                    controller={selectedController.label}
                    onDownload={() => {
                      ppgDownload({
                        gcode: generated?.preview ?? gcodeInput,
                        controller: controller,
                        machine_brand: machineModel.split(' ')[0],
                        machine_model: machineModel,
                        program_name: programName,
                        include_physics_comments: true,
                      }).catch(() => {});
                    }}
                  />
                </div>
              </div>
            </PanelCard>

            <PanelCard
              title="Prove-out &amp; validation"
              subtitle="Conservative first-article settings and machine limit checking."
            >
              <div className="flex items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={proveOutEnabled}
                    onChange={(e) => {
                      setProveOutEnabled(e.target.checked);
                      if (e.target.checked) {
                        const gcode = generated?.preview ?? gcodeInput;
                        ppgProveOut({ gcode, controller }).then((res) => {
                          const d = (res as any)?.data;
                          if (d) setProveOutResult(d);
                        }).catch(() => {});
                      } else {
                        setProveOutResult(null);
                      }
                    }}
                    className="h-4 w-4 rounded border-white/20 bg-slate-800 text-amber-500 focus:ring-amber-500/30"
                  />
                  <span className="text-sm font-medium text-slate-200">Enable prove-out mode</span>
                </label>
                {confidenceWarning === 'low' && (
                  <span className="ml-2 rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                    ⚠ Low confidence — prove-out auto-enabled
                  </span>
                )}
                {confidenceWarning === 'medium' && (
                  <span className="ml-2 rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                    Recommend prove-out
                  </span>
                )}
                <ActionButton
                  disabled={loadingAction || !generated}
                  onClick={() => {
                    const gcode = proveOutResult?.gcode ?? generated?.preview ?? gcodeInput;
                    ppgValidateLimits({ gcode, machine: { id: 'auto', name: machineModel, brand: machineModel.split(' ')[0], controller, max_rpm: 12000, max_power_kW: 22, work_volume: { x: 762, y: 508, z: 635 }, rapid_rate_mm_min: { x: 25400, y: 25400, z: 25400 }, axes: 3 } }).then((res) => {
                      const d = (res as any)?.data?.summary;
                      const flags = (res as any)?.data?.flags ?? [];
                      if (d) setValidationResult({ ...d, flags });
                    }).catch(() => {});
                  }}
                >
                  Validate Limits
                </ActionButton>
              </div>

              {proveOutResult && (
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <SummaryTile
                    label="Feed reductions"
                    value={String(proveOutResult.summary.feed_reductions)}
                    hint={`Avg -${proveOutResult.summary.avg_feed_reduction_pct}%`}
                    accent="from-amber-400/22 via-amber-300/10 to-transparent"
                  />
                  <SummaryTile
                    label="RPM caps"
                    value={String(proveOutResult.summary.rpm_caps)}
                    hint={`Avg -${proveOutResult.summary.avg_rpm_reduction_pct}%`}
                    accent="from-amber-400/22 via-amber-300/10 to-transparent"
                  />
                  <SummaryTile
                    label="Optional stops"
                    value={String(proveOutResult.summary.optional_stops_added)}
                    hint="At critical transitions"
                    accent="from-emerald-400/20 via-emerald-300/10 to-transparent"
                  />
                  <SummaryTile
                    label="Cycle time"
                    value={`${proveOutResult.estimated_cycle_time_ratio}x`}
                    hint="vs production"
                    accent="from-sky-400/22 via-sky-300/10 to-transparent"
                  />
                </div>
              )}

              {validationResult && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <StatusPill
                      label={validationResult.passed ? 'PASSED' : 'FAILED'}
                      tone={validationResult.passed ? 'emerald' : 'rose'}
                    />
                    {validationResult.block_count > 0 && (
                      <StatusPill label={`${validationResult.block_count} blocking`} tone="rose" />
                    )}
                    {validationResult.warn_count > 0 && (
                      <StatusPill label={`${validationResult.warn_count} warnings`} tone="amber" />
                    )}
                  </div>
                  {validationResult.flags.length > 0 && (
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-slate-950/80 p-3 text-xs">
                      {validationResult.flags.slice(0, 20).map((flag, idx) => (
                        <div key={idx} className={`py-1 ${flag.severity === 'BLOCK' ? 'text-rose-400' : flag.severity === 'WARN' ? 'text-amber-400' : 'text-slate-400'}`}>
                          <span className="font-mono">L{flag.line}</span> [{flag.severity}] {flag.message}
                          {flag.suggestion && <span className="ml-2 text-slate-500">— {flag.suggestion}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </PanelCard>

            {comparison && (comparison.baseline_gcode || comparison.target_gcode) && (
              <GcodeComparisonPanel
                traditional={comparison.baseline_gcode || ''}
                optimized={comparison.target_gcode || ''}
                controller={selectedController.label}
              />
            )}

          {/* PP-MOAT-MS4 U01+U02: File I/O & Clipboard — Cyan-Blue Saber */}
          {generated && (
            <div className="ppg-saber ppg-saber--cyan-blue ppg-saber-pulse">
              <div className="ppg-saber-inner p-5">
                <div className="ppg-saber-sweep" />
                <div className="relative z-10">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold text-slate-50">Output Actions</div>
                      <div className="text-sm text-slate-400">Download optimized program or copy to clipboard</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/15 px-4 py-2 text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/25 hover:shadow-[0_0_20px_rgba(34,211,238,.2)]"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
                        </svg>
                        Download .nc
                      </button>
                      <button
                        onClick={handleCopyToClipboard}
                        className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition ${
                          copySuccess
                            ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200'
                            : 'border-cyan-400/40 bg-cyan-400/15 text-cyan-200 hover:bg-cyan-400/25'
                        }`}
                      >
                        {copySuccess ? (
                          <>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {fileName && (
                    <div className="text-xs text-slate-500">
                      Output: {fileName.replace(/\.[^.]+$/, '')}_PRISM_optimized.nc
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PPG-VAR-MS0 U04: Physics Summary -- Emerald-Cyan Saber */}
          {pipelineResult && (
            <div className="ppg-saber ppg-saber--emerald-cyan ppg-saber-pulse">
              <div className="ppg-saber-inner p-5">
                <div className="ppg-saber-sweep" />
                <div className="relative z-10">
                  <div className="mb-4">
                    <div className="text-lg font-bold text-slate-50">Physics Summary</div>
                    <div className="text-sm text-slate-400">Real-time cutting force, power, and tool life from PRISM pipeline</div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {(() => {
                      const stages = (pipelineResult.stages ?? []) as Array<{stage: string; status: string; data: Record<string, unknown>}>;
                      const sf = stages.find((s) => s.stage === '1.1_base_speed_feed');
                      const analytics = pipelineResult.analytics as Record<string, unknown> | undefined;
                      const passCount = stages.filter((s) => s.status === 'pass').length;
                      const totalStages = stages.length;
                      const safetyStage = stages.find((s) => s.stage?.includes('omega') || s.stage?.includes('safety'));
                      const wearStage = stages.find((s) => s.stage?.includes('wear') || s.stage?.includes('2.7b'));
                      const safetyScore = (safetyStage?.data?.score as number | undefined) ?? null;
                      const overall = (analytics?.overall ?? {}) as Record<string, unknown>;
                      const perOp = (analytics?.per_operation ?? []) as Array<Record<string, unknown>>;

                      return (
                        <>
                          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3">
                            <div className="text-[10px] uppercase tracking-widest text-slate-500">Pipeline Stages</div>
                            <div className="mt-1 text-2xl font-black text-cyan-300">{passCount}/{totalStages}</div>
                            <div className="text-[11px] text-slate-400">stages passed</div>
                          </div>
                          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
                            <div className="text-[10px] uppercase tracking-widest text-slate-500">Cutting Force</div>
                            <div className="mt-1 text-2xl font-black text-emerald-300">
                              {sf?.data?.kc1_1
                                ? `${Math.round(sf.data.kc1_1 as number)} N/mm\u00B2`
                                : perOp[0]?.force_range_N
                                  ? `${Math.round((perOp[0].force_range_N as number[])[1])} N`
                                  : '\u2014'}
                            </div>
                            <div className="text-[11px] text-slate-400">{String(sf?.data?.calibration_source ?? 'canonical')}</div>
                          </div>
                          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
                            <div className="text-[10px] uppercase tracking-widest text-slate-500">Cycle Time</div>
                            <div className="mt-1 text-2xl font-black text-amber-300">
                              {overall.total_cycle_time_s
                                ? `${((overall.total_cycle_time_s as number) / 60).toFixed(1)} min`
                                : '\u2014'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {overall.cutting_time_s ? `${((overall.cutting_time_s as number) / 60).toFixed(1)} min cutting` : ''}
                            </div>
                          </div>
                          <div className="rounded-xl border border-violet-400/20 bg-violet-400/5 p-3">
                            <div className="text-[10px] uppercase tracking-widest text-slate-500">Safety Score</div>
                            <div className={`mt-1 text-2xl font-black ${safetyScore != null && safetyScore >= 0.7 ? 'text-emerald-300' : safetyScore != null ? 'text-rose-300' : 'text-slate-500'}`}>
                              {safetyScore != null ? (safetyScore * 100).toFixed(0) + '%' : wearStage ? 'OK' : '\u2014'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {safetyScore != null && safetyScore >= 0.7 ? 'PASS' : safetyScore != null ? 'REVIEW' : ''}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  {/* Active features list */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {((pipelineResult.stages ?? []) as Array<{stage: string; status: string}>)
                      .filter((s) => s.status === 'pass' && !s.stage.startsWith('0.'))
                      .slice(0, 12)
                      .map((s) => (
                        <span key={s.stage} className="rounded-full bg-slate-800/60 px-2 py-0.5 text-[9px] font-semibold text-slate-400">
                          {s.stage.replace(/_/g, ' ')}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PP-MOAT-MS4 U03: Diff Viewer -- Amber-Gold Saber */}
          {generated && originalGcode && (
            <div className="ppg-saber ppg-saber--amber-gold ppg-saber-pulse">
              <div className="ppg-saber-inner p-5">
                <div className="ppg-saber-sweep" />
                <div className="relative z-10">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold text-slate-50">Optimization Diff</div>
                      <div className="text-sm text-slate-400">Compare original vs optimized — see every S/F change</div>
                    </div>
                    <button
                      onClick={() => setShowDiff(!showDiff)}
                      className="rounded-xl border border-amber-400/40 bg-amber-400/15 px-4 py-2 text-sm font-bold text-amber-200 transition hover:bg-amber-400/25 hover:shadow-[0_0_20px_rgba(245,158,11,.2)]"
                    >
                      {showDiff ? 'Hide Diff' : 'Show Diff'}
                    </button>
                  </div>
                  {showDiff && (
                    <div className="mt-3">
                      {(() => {
                        const origLines = originalGcode.split('\n');
                        const optLines = (generated.preview ?? '').split('\n');
                        const maxLines = Math.max(origLines.length, optLines.length);
                        let changedCount = 0;
                        const diffRows: Array<{ idx: number; orig: string; opt: string; changed: boolean; reason: string }> = [];
                        for (let i = 0; i < maxLines; i++) {
                          const orig = origLines[i] ?? '';
                          const opt = optLines[i] ?? '';
                          const changed = orig !== opt;
                          if (changed) changedCount++;
                          let reason = '';
                          if (changed) {
                            if (/[SF]\d/i.test(opt) && /[SF]\d/i.test(orig)) reason = 'S/F optimized';
                            else if (opt && !orig) reason = 'Added';
                            else if (!opt && orig) reason = 'Removed';
                            else reason = 'Modified';
                          }
                          diffRows.push({ idx: i + 1, orig, opt, changed, reason });
                        }
                        return (
                          <>
                            <div className="mb-3 flex gap-4 text-xs">
                              <span className="text-slate-400">{maxLines} lines total</span>
                              <span className="text-amber-300 font-semibold">{changedCount} lines changed</span>
                              <span className="text-slate-500">{((changedCount / maxLines) * 100).toFixed(1)}% modified</span>
                            </div>
                            <div className="max-h-[400px] overflow-auto rounded-xl border border-white/5 bg-slate-950/60">
                              <div className="grid grid-cols-[3rem_1fr_1fr_8rem] text-xs font-mono">
                                <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-900/90 p-2 text-center text-slate-500">#</div>
                                <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-900/90 p-2 text-slate-400 font-sans font-semibold">Original</div>
                                <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-900/90 p-2 text-slate-400 font-sans font-semibold">Optimized</div>
                                <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-900/90 p-2 text-slate-400 font-sans font-semibold">Reason</div>
                                {diffRows.map((row) => (
                                  <div key={row.idx} className="contents">
                                    <div className={`border-b border-white/5 p-1.5 text-center ${row.changed ? 'text-amber-400' : 'text-slate-600'}`}>{row.idx}</div>
                                    <div className={`border-b border-white/5 p-1.5 ${row.changed ? 'bg-rose-500/[0.08] text-rose-300' : 'text-slate-500'}`}>{row.orig || '\u00A0'}</div>
                                    <div className={`border-b border-white/5 p-1.5 ${row.changed ? 'bg-emerald-500/[0.08] text-emerald-300' : 'text-slate-500'}`}>{row.opt || '\u00A0'}</div>
                                    <div className={`border-b border-white/5 p-1.5 font-sans text-[0.65rem] ${row.changed ? 'text-amber-400/70' : 'text-transparent'}`}>{row.reason}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PP-MOAT-MS4 U04: Session History — Violet-Rose Saber */}
          <div className="ppg-saber ppg-saber--violet-rose ppg-saber-pulse">
            <div className="ppg-saber-inner p-5">
              <div className="ppg-saber-sweep" />
              <div className="relative z-10">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-slate-50">Session History</div>
                    <div className="text-sm text-slate-400">Recent post-processor runs — click to reload</div>
                  </div>
                  <button
                    onClick={loadHistory}
                    disabled={historyLoading}
                    className="rounded-xl border border-violet-400/40 bg-violet-400/15 px-4 py-2 text-sm font-bold text-violet-200 transition hover:bg-violet-400/25 hover:shadow-[0_0_20px_rgba(139,92,246,.2)]"
                  >
                    {historyLoading ? 'Loading...' : 'Load History'}
                  </button>
                </div>
                {history.length > 0 ? (
                  <div className="space-y-2">
                    {history.slice(0, 20).map((entry, idx) => (
                      <button
                        key={entry.id ?? idx}
                        onClick={() => {
                          setGcodeInput(entry.id);
                          setLane('generate');
                        }}
                        className="flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-left text-sm transition hover:border-violet-400/30 hover:bg-violet-400/[0.06]"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500">{entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : `#${idx + 1}`}</span>
                          <span className="font-semibold text-slate-200">{entry.controller || 'Unknown'}</span>
                          <span className="text-xs text-slate-500">{entry.lines ?? 0} lines</span>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase ${
                          entry.status === 'ready'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : entry.status === 'review'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-slate-500/15 text-slate-400'
                        }`}>{entry.status || 'done'}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-slate-500">
                    {historyLoading ? 'Loading history...' : 'No history yet — generate a post to start building history'}
                  </div>
                )}
              </div>
            </div>
          </div>

            </>
          )}

          {lane === 'validate' && (
            <PanelCard
              title="Controller validation desk"
              subtitle="Blend program checks with release-gate posture so operators do not inherit blind risk."
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryTile
                  label="Status"
                  value={(validation?.status ?? 'review').toUpperCase()}
                  hint={validation?.controller ?? selectedController.label}
                  accent="from-emerald-400/20 via-emerald-300/10 to-transparent"
                />
                <SummaryTile
                  label="Readiness"
                  value={`${Math.round((validation?.score ?? 0.84) * 100)}%`}
                  hint="Controller confidence"
                  accent="from-cyan-400/22 via-cyan-300/10 to-transparent"
                />
                <SummaryTile
                  label="Warnings"
                  value={String(validation?.warnings.length ?? releaseChecks.filter((item) => item.status !== 'ready').length)}
                  hint="Issues needing review"
                  accent="from-amber-400/22 via-amber-300/10 to-transparent"
                />
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div className="rounded-[22px] border border-emerald-300/12 bg-emerald-300/[0.05] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">
                    Passes
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-200">
                    {(validation?.passes ?? []).map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[22px] border border-amber-300/12 bg-amber-300/[0.06] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100/90">
                    Warnings
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-200">
                    {(validation?.warnings ?? []).map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </PanelCard>
          )}

          {lane === 'compare' && (
            <PanelCard
              title="Controller comparison"
              subtitle="Make controller changes explainable before a programmer or operator trusts the packet."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <SummaryTile
                  label="Baseline"
                  value={comparison?.baseline ?? selectedController.label}
                  hint="Current packet controller"
                  accent="from-sky-400/22 via-sky-300/10 to-transparent"
                />
                <SummaryTile
                  label="Target"
                  value={comparison?.target ?? selectedCompareTarget.label}
                  hint="Comparison controller"
                  accent="from-violet-400/22 via-violet-300/10 to-transparent"
                />
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Delta summary
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-200">
                    {(comparison?.delta_summary ?? []).map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="grid gap-4">
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Baseline notes
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-slate-200">
                      {(comparison?.baseline_notes ?? []).map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Target notes
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-slate-200">
                      {(comparison?.target_notes ?? []).map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </PanelCard>
          )}

          {lane === 'library' && (
            <PanelCard
              title="Post library"
              subtitle="Browse and search available post processors. Select one to pre-fill your machine configuration."
            >
              <PostLibraryUI
                onSelectPost={() => {}}
                onGenerateForMachine={(post) => {
                  // PPG-VAR-MS0 U07: Pre-populate form from library machine profile
                  setController(post.controller);
                  setMachineModel(post.vendor === 'PRISM' ? post.name.replace('PRISM ', '') : `${post.vendor} ${post.name}`);
                  // Enable recommended features from library entry
                  if ((post as any).machine_profile?.recommended_features) {
                    const recommended: string[] = (post as any).machine_profile.recommended_features;
                    const updatedCaps = [...selectedCapabilityIds];
                    for (const feat of recommended) {
                      if (!updatedCaps.includes(feat)) {
                        updatedCaps.push(feat);
                      }
                    }
                    setSelectedCapabilityIds(updatedCaps);
                  }
                  // Set machine profile limits for pipeline validation
                  if ((post as any).machine_profile?.max_rpm) {
                    setProgramName(post.source === 'prism_native'
                      ? `PRISM_${post.controller.toUpperCase()}_OPTIMIZED`
                      : `${post.vendor.toUpperCase()}_${post.controller.toUpperCase()}`);
                    // For PRISM posts, set output mode to pipeline_optimized
                    if (post.source === 'prism_native') {
                      setOutputMode('pipeline_optimized');
                    }
                  }
                  setLane('generate');
                }}
              />
            </PanelCard>
          )}

          {lane === 'machine' && (
            <div className="space-y-6">
              <MachinePickerPanel
                onFingerprintChange={handleFingerprintChange}
                onManufacturerChange={(m) => setMachineModel((prev) => prev || m)}
                onModelChange={(m) => setMachineModel(m)}
              />
              <FeatureTogglePanel
                fingerprint={fingerprint}
                enabledFeatures={enabledFeatures}
                onToggle={handleFeatureToggle}
              />
              <ControllerOverridePanel
                fingerprint={fingerprint}
                controllerOverride={controllerOverride}
                onOverrideChange={handleControllerOverride}
                availableControllers={controllers.map((c) => ({
                  value: c.value,
                  label: c.label,
                }))}
              />
            </div>
          )}

          {lane === 'programs' && (
            <div className="ppg-saber ppg-saber--violet-rose ppg-saber-pulse">
              <div className="ppg-saber-inner p-5">
                <div className="ppg-saber-sweep" />
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold text-slate-50">Shop Program Library</div>
                      <div className="text-sm text-slate-400">
                        {programTotal > 0 ? `${programTotal} programs` : 'Loading...'} — select one to optimize with PRISM physics
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {Object.entries(programStats).map(([ctrl, count]) => (
                        <button
                          key={ctrl}
                          onClick={async () => {
                            setProgramController(ctrl);
                            setProgramLoading(true);
                            try {
                              const res = await ppgProgramsList(ctrl, 0, 50, programSearch);
                              const d = (res as any)?.data ?? {};
                              setProgramList(d.programs ?? []);
                              setProgramTotal(d.total ?? 0);
                            } catch { /* ignore */ }
                            setProgramLoading(false);
                          }}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            programController === ctrl
                              ? 'bg-violet-500/25 text-violet-200 border border-violet-500/40'
                              : 'text-slate-400 hover:text-slate-200 border border-white/10'
                          }`}
                        >
                          {ctrl.charAt(0).toUpperCase() + ctrl.slice(1)} ({count})
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search */}
                  <div className="flex gap-2">
                    <Input
                      value={programSearch}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProgramSearch(e.target.value)}
                      placeholder="Search programs by name or customer..."
                    />
                    <ActionButton
                      onClick={async () => {
                        setProgramLoading(true);
                        try {
                          const res = await ppgProgramsList(programController, 0, 50, programSearch);
                          const d = (res as any)?.data ?? {};
                          setProgramList(d.programs ?? []);
                          setProgramTotal(d.total ?? 0);
                        } catch { /* ignore */ }
                        setProgramLoading(false);
                      }}
                    >
                      Search
                    </ActionButton>
                  </div>

                  {/* Program list */}
                  {programLoading && <div className="text-center text-sm text-slate-500 py-8">Loading programs...</div>}
                  {!programLoading && programList.length === 0 && (
                    <div className="text-center text-sm text-slate-500 py-8">
                      {programTotal === 0 ? 'No programs found. Click a controller tab above.' : 'No matches for your search.'}
                    </div>
                  )}
                  {!programLoading && programList.length > 0 && (
                    <div className="max-h-[500px] overflow-auto space-y-1">
                      {programList.map((prog) => (
                        <button
                          key={prog.path}
                          onClick={async () => {
                            setProgramLoading(true);
                            try {
                              const res = await ppgProgramLoad(prog.path);
                              const d = (res as any)?.data;
                              if (d?.content) {
                                setGcodeInput(d.content);
                                setOriginalGcode(d.content);
                                setFileName(prog.name);
                                setFileSize(prog.size_bytes);
                                autoDetectController(d.content);
                                // Auto-set controller based on program source
                                if (programController === 'okuma') {
                                  const match = controllers.find(c => c.value.startsWith('okuma'));
                                  if (match) setController(match.value);
                                } else if (programController === 'haas') {
                                  const match = controllers.find(c => c.value.startsWith('haas'));
                                  if (match) setController(match.value);
                                }
                                setLane('generate');
                              }
                            } catch { /* ignore */ }
                            setProgramLoading(false);
                          }}
                          className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-left transition hover:border-violet-500/30 hover:bg-violet-500/[0.06]"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-slate-100 truncate">{prog.program}</div>
                            {prog.customer && (
                              <div className="text-xs text-slate-500 truncate">{prog.customer}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-3">
                            <span className="text-xs text-slate-500">{(prog.size_bytes / 1024).toFixed(1)} KB</span>
                            <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                              Load & Optimize
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {programTotal > 50 && !programLoading && (
                    <div className="text-center text-xs text-slate-500">
                      Showing {Math.min(50, programList.length)} of {programTotal} programs — use search to narrow
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <PanelCard
            title="Capability verification"
            subtitle="Match the controller packet to the machine and operation before it escapes into prove-out."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryTile
                label="Selected"
                value={String(selectedCapabilityIds.length)}
                hint="Current packet stack"
                accent="from-cyan-400/22 via-cyan-300/10 to-transparent"
              />
              <SummaryTile
                label="Required gaps"
                value={String(missingRequired.length)}
                hint="Blocking posture mismatches"
                accent="from-rose-400/22 via-rose-300/10 to-transparent"
              />
              <SummaryTile
                label="Recommended gaps"
                value={String(missingRecommended.length)}
                hint="Worth confirming before release"
                accent="from-amber-400/22 via-amber-300/10 to-transparent"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <ActionButton tone="emerald" onClick={loadRecommendedStack}>
                Load recommended stack
              </ActionButton>
              <ActionButton tone="amber" onClick={selectFullMachineStack}>
                Select full machine stack
              </ActionButton>
            </div>

            <div className="mt-5 space-y-3">
              {visibleCapabilities.map((option) => {
                const checked = selectedCapabilityIds.includes(option.id);
                const required = requiredCapabilityIds.includes(option.id);
                const recommended = recommendedCapabilityIds.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className="block rounded-[22px] border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label={option.label}
                        checked={checked}
                        onChange={() => toggleCapability(option.id)}
                        className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950/80 text-cyan-300 focus:ring-cyan-300/40"
                      />
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-slate-100">
                            {option.label}
                          </div>
                          {checked ? <StatusPill label="Selected" tone="sky" /> : null}
                          {required ? <StatusPill label="Required" tone="rose" /> : null}
                          {recommended ? (
                            <StatusPill label="Recommended" tone="amber" />
                          ) : null}
                        </div>
                        <div className="text-sm text-slate-400">{option.detail}</div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </PanelCard>

          <PanelCard
            title="Release and prove-out posture"
            subtitle="Treat post generation as a governed packet that must clear machine and controller gates."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryTile
                label="Packet id"
                value={packetId}
                hint="Stable downstream packet spine"
                accent="from-sky-400/22 via-sky-300/10 to-transparent"
              />
              <SummaryTile
                label="Recommended tier"
                value={recommendedTier}
                hint="Best commercial fit for this posture"
                accent="from-amber-400/22 via-amber-300/10 to-transparent"
              />
              <SummaryTile
                label="Readiness"
                value={readinessSummary}
                hint="Current prove-out posture"
                accent="from-emerald-400/20 via-emerald-300/10 to-transparent"
              />
            </div>

            <div className="mt-5 space-y-3">
              {releaseChecks.map((check) => (
                <div
                  key={check.id}
                  className={`rounded-[22px] border p-4 ${readinessRing(check.status)}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-100">{check.label}</div>
                    <StatusPill
                      label={check.status.toUpperCase()}
                      tone={readinessTone(check.status)}
                    />
                  </div>
                  <div className="mt-2 text-sm text-slate-300">{check.detail}</div>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard
            title="Downstream packet actions"
            subtitle="Carry the same controller packet into release, quoting, capture, and prove-out instead of rebuilding context by hand."
          >
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              This desk now acts like a packet spine. Once the controller posture looks good, move the same packet into the rest of PRISM.
            </div>
            <div className="mt-4 grid gap-3">
              <Link className={ACTION_LINK_CLASS} to={releasePath}>
                Open Print to CNC packet
              </Link>
              <Link className={ACTION_LINK_CLASS} to={quotePath}>
                Stage quote packet
              </Link>
              <Link className={ACTION_LINK_CLASS} to={capturePath}>
                Capture prove-out evidence
              </Link>
              <Link className={ACTION_LINK_CLASS} to={shopFloorPath}>
                Start shop-floor prove-out
              </Link>
            </div>
          </PanelCard>

          <PanelCard
            title="Controller + operation library"
            subtitle="A compact review of the current controller and operation catalogs."
          >
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Controllers
                </div>
                <div className="mt-3 space-y-3">
                  {controllers.map((item) => (
                    <div
                      key={item.value}
                      className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-slate-100">
                          {item.label}
                        </div>
                        {item.value === controller ? (
                          <StatusPill label="Selected" tone="sky" />
                        ) : null}
                        <StatusPill label={item.family} tone="slate" />
                      </div>
                      <div className="mt-2 text-sm text-slate-400">{item.note}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Operation templates
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {operations.map((item) => (
                    <StatusPill
                      key={item.value}
                      label={item.label}
                      tone={item.value === operation ? 'emerald' : 'slate'}
                    />
                  ))}
                </div>
              </div>
            </div>
          </PanelCard>

          <PanelCard
            title="Post product tiers"
            subtitle="Current commercial packaging for post work, machine onboarding, and prove-out support."
          >
            <div className="space-y-3">
              {COVERAGE_TIERS.map((tier) => (
                <div
                  key={tier.label}
                  className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-100">
                        {tier.label}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">{tier.price}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusPill label={tier.price} tone={tier.tone} />
                      {tier.label === recommendedTier ? (
                        <StatusPill label="Recommended now" tone="amber" />
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-slate-300">{tier.detail}</div>
                </div>
              ))}
            </div>
          </PanelCard>
        </div>
      </div>
      </>}
      </>
      )}
    </div>
  );
}
