import { ApiError, fetchJson } from '../../api/requestCore';
import { getRequestHeaders } from '../../api/client';
import { billingStatus, docList, getToolUsage, listEmployees, poList, toolReorderAlerts } from '../../api/client';
import { progress as loadLearningProgress, recommend as loadLearningRecommendations } from '../../api/learning';
import { coolantOptionsForMode } from '../../data/calculatorWorkspace';
import type {
  ApprovalSummary,
  CalculatorToolCribWorkspace,
  CalculatorSavedMachineProfile,
  DepartmentCheckInResult,
  DeskCounts,
  EmailLoginOption,
  EmployeeShellBootstrap,
  EmployeeShellProfileSummary,
  HotJobRecord,
  Job,
  JobDeskRecord,
  JobIntakeDraft,
  JobRegistrationResult,
  MessagesWorkspace,
  OperatingSystemEntityType,
  OperatingSystemServices,
  PinnedEntity,
  InventoryOperationsWorkspace,
  ProgramReleaseCatalog,
  ProgramReleaseInput,
  ProgramReleaseWorkspace,
  RecentEntity,
  SearchResult,
  LearningImprovementRecord,
  LearningSignalCaptureRecord,
  PlatformLearningSnapshot,
  ShellCommerceCatalog,
  ShellBootstrap,
  IngestCalculatorToolCribDocumentInput,
  RunCalculatorToolCribLocalScanInput,
  SchedulingStudyInputs,
  SchedulingStudyRecord,
  ProgramReleaseMachineProfile,
  ProgramReleaseMachineSearchInput,
  ProgramReleaseMachineSearchResult,
  ProgramReleaseSavedMachineProfile,
  SaveCalculatorMachineProfileInput,
  SaveProgramReleaseMachineProfileInput,
  ShopFloorTaskEventResult,
  ShopFloorTrackedTask,
} from './contracts';
import type { LearningModule, ProgressSummary } from '../../types/learning';
import type { Employee, PurchaseOrder, ReorderAlert, ToolUsageRecord } from '../../api/types';
import type { JobTrackingPacket } from '../../utils/jobTracking';
import { fixtureOperatingSystemServices } from './fixtureProvider';
import {
  isHotJob as isLiveHotJob,
  rankJobsForTodo as rankLiveJobsForTodo,
  replaceHotJobs,
  subscribeHotJobs as subscribeLiveHotJobs,
} from './hotJobSignals';
import { FIXTURE_RESULTS } from './shellFixtures';

type OperatingSystemEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

type LiveDocumentRecord = {
  id: string;
  status: 'pending' | 'extracting' | 'complete' | 'failed';
  title: string | null;
};

type LiveBillingStatus = {
  userId: string;
  plan: string;
  role: string;
  prices: Record<string, { monthly_cents: number; annual_cents: number; label: string }>;
  timestamp?: string;
};

type LivePinnedEntityRecord = {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  title: string;
  pinned_at: string;
};

type LiveRecentEntityRecord = {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  title: string;
  accessed_at: string;
};

type LiveSavedViewRecord = {
  id: string;
  user_id: string;
  name: string;
  entity_type: string;
  filters: Record<string, unknown>;
  is_default: boolean;
  updated_at: string;
};

const OPERATING_SYSTEM_BASE = '/api/v1/operating-system';
const SHELL_RECORDS_USER_ID = 'shell-default';
const EMPLOYEE_PROFILE_ALIASES = {
  machinist: 'machinist',
  quality: 'inspector',
  lead: 'planner',
} as const;
const BACKEND_PROFILE_IDS = {
  machinist: 'machinist',
  inspector: 'quality',
  planner: 'lead',
} as const;
const ROUTE_ALIASES: Record<string, string> = {
  '/program-release': '/print-to-cnc',
  '/toolpath-advisor': '/toolpath',
  '/safety-monitor': '/safety',
};

const MACHINIST_PATTERN = /\b(machinist|operator|setup|set-up|set up|cnc|mill|lathe|turn|grind)\b/i;
const INSPECTOR_PATTERN = /\b(quality|inspector|inspection|metrology|cmm)\b/i;
const PLANNER_PATTERN = /\b(planner|planning|dispatch|lead|scheduler|scheduling)\b/i;
const BILLING_PLAN_TO_TIER: Record<string, string> = {
  free: 'free',
  starter: 'starter',
  pro: 'standard',
  shop: 'professional',
  enterprise: 'enterprise',
};
const SHELL_ENTITY_ROUTE_MAP: Record<
  string,
  { type: OperatingSystemEntityType; workspaceLabel: string; workspaceRoute: string }
> = {
  job: { type: 'Job', workspaceLabel: 'Jobs', workspaceRoute: '/jobs' },
  quote: { type: 'Quote', workspaceLabel: 'Quote Builder', workspaceRoute: '/quote-builder' },
  customer: { type: 'Customer', workspaceLabel: 'Customers', workspaceRoute: '/customers' },
  po: { type: 'PO', workspaceLabel: 'Purchase Orders', workspaceRoute: '/purchase-orders' },
  order: { type: 'Order', workspaceLabel: 'Orders', workspaceRoute: '/orders' },
  part: { type: 'Part', workspaceLabel: 'Parts Library', workspaceRoute: '/parts-library' },
  invoice: { type: 'Invoice', workspaceLabel: 'Invoices', workspaceRoute: '/invoices' },
  quality: { type: 'Quality', workspaceLabel: 'Quality', workspaceRoute: '/quality' },
  lesson: { type: 'Lesson', workspaceLabel: 'Learning', workspaceRoute: '/learning' },
};

async function requestOperatingSystem<T>(path: string, body?: unknown): Promise<T> {
  const payload = await fetchJson<OperatingSystemEnvelope<T>>(`${OPERATING_SYSTEM_BASE}${path}`, {
    method: 'POST',
    headers: {
      ...getRequestHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
    fallbackMessage: 'Operating-system request failed',
  });

  if (!payload?.ok || payload.data === undefined) {
    throw new ApiError(500, payload?.error ?? 'Operating-system request failed');
  }

  return payload.data;
}

async function requestOperatingSystemPut<T>(path: string, body?: unknown): Promise<T> {
  const payload = await fetchJson<OperatingSystemEnvelope<T>>(`${OPERATING_SYSTEM_BASE}${path}`, {
    method: 'PUT',
    headers: {
      ...getRequestHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
    fallbackMessage: 'Operating-system request failed',
  });

  if (!payload?.ok || payload.data === undefined) {
    throw new ApiError(500, payload?.error ?? 'Operating-system request failed');
  }

  return payload.data;
}

async function requestOperatingSystemGet<T>(
  path: string,
  query?: Record<string, string | number | undefined>,
): Promise<T> {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}`.length > 0) {
      params.set(key, String(value));
    }
  });

  const payload = await fetchJson<OperatingSystemEnvelope<T>>(
    `${OPERATING_SYSTEM_BASE}${path}${params.size > 0 ? `?${params.toString()}` : ''}`,
    {
      method: 'GET',
      headers: getRequestHeaders(),
      fallbackMessage: 'Operating-system request failed',
    },
  );

  if (!payload?.ok || payload.data === undefined) {
    throw new ApiError(500, payload?.error ?? 'Operating-system request failed');
  }

  return payload.data;
}

async function requestOperatingSystemDelete<T>(path: string, body?: unknown): Promise<T> {
  const payload = await fetchJson<OperatingSystemEnvelope<T>>(`${OPERATING_SYSTEM_BASE}${path}`, {
    method: 'DELETE',
    headers: {
      ...getRequestHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
    fallbackMessage: 'Operating-system request failed',
  });

  if (!payload?.ok || payload.data === undefined) {
    throw new ApiError(500, payload?.error ?? 'Operating-system request failed');
  }

  return payload.data;
}

async function withFixtureFallback<T>(fetcher: () => Promise<T>, fallback: () => Promise<T> | T): Promise<T> {
  try {
    return await fetcher();
  } catch {
    return await fallback();
  }
}

async function getHotJobIds() {
  const hotJobs = await withFixtureFallback(loadLiveHotJobs, () => fixtureOperatingSystemServices.getHotJobs());
  return hotJobs.map((record) => record.jobId);
}

function normalizeRouteTarget(target: string) {
  const url = new URL(target, 'http://prism.local');
  url.pathname = ROUTE_ALIASES[url.pathname] ?? url.pathname;
  return `${url.pathname}${url.search}`;
}

function normalizeEntityRoute<T extends PinnedEntity | RecentEntity>(entity: T): T {
  const workspaceRoute = ROUTE_ALIASES[entity.workspaceRoute] ?? entity.workspaceRoute;
  return {
    ...entity,
    workspaceRoute,
    to: normalizeRouteTarget(entity.to),
  };
}

function hasMeaningfulShellBootstrapData(bootstrap: ShellBootstrap) {
  return (
    bootstrap.pinnedEntities.length > 0 ||
    bootstrap.recentEntities.length > 0 ||
    bootstrap.deskCounts.inbox > 0 ||
    bootstrap.deskCounts.approvals > 0 ||
    bootstrap.deskCounts.atRisk > 0 ||
    bootstrap.deskCounts.liveJobs > 0
  );
}

function hasMeaningfulDeskCounts(counts: DeskCounts) {
  return counts.inbox > 0 || counts.approvals > 0 || counts.atRisk > 0 || counts.liveJobs > 0;
}

function normalizeShellBootstrap(bootstrap: ShellBootstrap): ShellBootstrap {
  return {
    ...bootstrap,
    pinnedEntities: bootstrap.pinnedEntities.map(normalizeEntityRoute),
    recentEntities: bootstrap.recentEntities.map(normalizeEntityRoute),
  };
}

function normalizeEmployeeProfileSummary(
  profile: EmployeeShellProfileSummary,
  fallbackProfiles: EmployeeShellProfileSummary[],
): EmployeeShellProfileSummary | null {
  const aliasId = EMPLOYEE_PROFILE_ALIASES[profile.id as keyof typeof EMPLOYEE_PROFILE_ALIASES];
  if (!aliasId) {
    return null;
  }

  const fallback = fallbackProfiles.find((record) => record.id === aliasId);
  if (!fallback) {
    return null;
  }

  return {
    ...fallback,
    department: profile.department || fallback.department,
  };
}

function normalizeMessagesWorkspace(workspace: MessagesWorkspace): MessagesWorkspace {
  return {
    ...workspace,
    linkedRecords: workspace.linkedRecords.map(normalizeEntityRoute),
  };
}

function slugifyProgramReleaseMachineToken(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildProgramReleaseMachineSearchFacets(
  machines: ProgramReleaseMachineProfile[],
): ProgramReleaseMachineSearchResult['facets'] {
  const manufacturers = new Map<string, number>();
  const manufacturerLabels = new Map<string, string>();
  const families = new Map<string, number>();
  const familyLabels = new Map<string, string>();
  const kinematics = new Map<string, number>();
  const controllers = new Map<string, number>();

  for (const machine of machines) {
    const manufacturer = machine.manufacturer ?? machine.label.split(' ')[0] ?? 'Unknown';
    const manufacturerId = machine.manufacturerId ?? slugifyProgramReleaseMachineToken(manufacturer);
    const familyId = machine.familyId ?? machine.familyLabel ?? machine.kinematics;
    const familyLabel = machine.familyLabel ?? machine.familyId ?? machine.kinematics;
    manufacturers.set(manufacturerId, (manufacturers.get(manufacturerId) ?? 0) + 1);
    families.set(familyId, (families.get(familyId) ?? 0) + 1);
    manufacturerLabels.set(manufacturerId, manufacturer);
    familyLabels.set(familyId, familyLabel);
    kinematics.set(machine.kinematics, (kinematics.get(machine.kinematics) ?? 0) + 1);
    controllers.set(machine.controller, (controllers.get(machine.controller) ?? 0) + 1);
  }

  const toFacetList = (source: Map<string, number>) =>
    [...source.entries()]
      .map(([value, count]) => ({ id: value, label: value, value, count }))
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;
        return (left.label ?? left.value).localeCompare(right.label ?? right.value, 'en-US');
      });

  return {
    manufacturers: [...manufacturers.entries()]
      .map(([value, count]) => ({
        id: value,
        label: manufacturerLabels.get(value) ?? value,
        value,
        count,
      }))
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;
        return (left.label ?? left.value).localeCompare(right.label ?? right.value, 'en-US');
      }),
    families: [...families.entries()]
      .map(([value, count]) => ({
        id: value,
        label: familyLabels.get(value) ?? value,
        value,
        count,
      }))
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;
        return (left.label ?? left.value).localeCompare(right.label ?? right.value, 'en-US');
      }),
    kinematics: toFacetList(kinematics),
    controllers: toFacetList(controllers),
  };
}

type LiveProgramReleaseUserMachineProfileReadModel = {
  profile?: {
    profileId?: string;
    userId?: string;
    workspaceId?: string;
    displayName?: string;
    selectedControllerId?: string;
    selectedSpindlePackageId?: string;
    enabledCoolantStrategyIds?: string[];
    machine?: {
      machineId?: string;
      modelLabel?: string;
    };
  };
  canDriveProgramRelease?: boolean;
};

type LiveProgramReleaseUserMachineProfilePersistResult = {
  profile?: LiveProgramReleaseUserMachineProfileReadModel;
  created?: boolean;
  updated?: boolean;
  version?: number;
  defaulted?: boolean;
};

type LiveCalculatorUserMachineProfileReadModel = {
  profile?: {
    profileId?: string;
    userId?: string;
    workspaceId?: string;
    displayName?: string;
    selectedControllerId?: string;
    selectedSpindlePackageId?: string;
    enabledCoolantStrategyIds?: string[];
    enabledControllerFeatureIds?: string[];
    enabledMachineFeatureIds?: string[];
    toolingStationCountOverride?: number;
    measuredPerformance?: {
      guidewayType?: 'box' | 'linear' | 'hydrostatic';
      machineAgeYears?: number;
      measuredPowerKw?: number;
      measuredMaxTorqueNm?: number;
      measuredNaturalFrequencyHz?: number;
      measuredSystemStiffnessNPerUm?: number;
      measuredDampingRatio?: number;
      measuredAxisAccelerationMps2?: number;
      measuredAxisJerkMps3?: number;
      notes?: string[];
    };
    machine?: {
      machineId?: string;
      modelLabel?: string;
      guidewayType?: 'box' | 'linear' | 'hydrostatic';
      naturalFrequencyHz?: number;
      axisAccelerationMps2?: number;
      axisJerkMps3?: number;
      kinematics?: {
        topology?: string;
      };
    };
  };
  canDriveCalculatorSelections?: boolean;
};

type LiveCalculatorUserMachineProfilePersistResult = {
  profile?: LiveCalculatorUserMachineProfileReadModel;
  created?: boolean;
  updated?: boolean;
  version?: number;
  defaulted?: boolean;
};

function normalizeOptionId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function normalizeCalculatorMeasuredPerformance(
  value: NonNullable<LiveCalculatorUserMachineProfileReadModel['profile']>['measuredPerformance'] | null | undefined,
): CalculatorSavedMachineProfile['measuredPerformance'] {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const measuredPerformance: NonNullable<CalculatorSavedMachineProfile['measuredPerformance']> = {};
  if (value.guidewayType === 'box' || value.guidewayType === 'linear' || value.guidewayType === 'hydrostatic') {
    measuredPerformance.guidewayType = value.guidewayType;
  }

  const numericFields: Array<keyof typeof value> = [
    'machineAgeYears',
    'measuredPowerKw',
    'measuredMaxTorqueNm',
    'measuredNaturalFrequencyHz',
    'measuredSystemStiffnessNPerUm',
    'measuredDampingRatio',
    'measuredAxisAccelerationMps2',
    'measuredAxisJerkMps3',
  ];
  for (const field of numericFields) {
    const candidate = value[field];
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      switch (field) {
        case 'machineAgeYears':
          measuredPerformance.machineAgeYears = candidate;
          break;
        case 'measuredPowerKw':
          measuredPerformance.measuredPowerKw = candidate;
          break;
        case 'measuredMaxTorqueNm':
          measuredPerformance.measuredMaxTorqueNm = candidate;
          break;
        case 'measuredNaturalFrequencyHz':
          measuredPerformance.measuredNaturalFrequencyHz = candidate;
          break;
        case 'measuredSystemStiffnessNPerUm':
          measuredPerformance.measuredSystemStiffnessNPerUm = candidate;
          break;
        case 'measuredDampingRatio':
          measuredPerformance.measuredDampingRatio = candidate;
          break;
        case 'measuredAxisAccelerationMps2':
          measuredPerformance.measuredAxisAccelerationMps2 = candidate;
          break;
        case 'measuredAxisJerkMps3':
          measuredPerformance.measuredAxisJerkMps3 = candidate;
          break;
        default:
          break;
      }
    }
  }

  if (Array.isArray(value.notes)) {
    measuredPerformance.notes = (value.notes as unknown[]).filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  return Object.keys(measuredPerformance).length > 0 ? measuredPerformance : undefined;
}

function machineTopologyForCalculatorMode(machineTypeId: string, mode: SaveCalculatorMachineProfileInput['selection']['machineMode']) {
  if (mode === 'lathe') {
    switch (machineTypeId) {
      case 'lathe_swiss':
        return 'swiss';
      case 'lathe_vtl':
        return 'vtl';
      case 'lathe_multitask':
        return 'mill_turn';
      case 'lathe_subspindle':
        return 'sub_spindle_lathe';
      case 'lathe_y_axis':
        return 'y_axis_lathe';
      default:
        return '2_axis_lathe';
    }
  }

  if (mode === 'edm') return 'sinker_edm';
  if (mode === 'wire_edm') return 'wire_edm';
  if (mode === 'laser') return 'laser';
  if (mode === 'waterjet') return 'waterjet';

  if (machineTypeId === 'mill_horizontal_5') return '5_axis_horizontal';
  if (machineTypeId === 'mill_horizontal_4') return '4_axis_horizontal';
  if (machineTypeId === 'mill_horizontal_3') return '3_axis_horizontal';
  if (machineTypeId === 'mill_vertical_5' || machineTypeId === 'mill_gantry_5') return '5_axis_vertical';
  if (machineTypeId === 'mill_vertical_4' || machineTypeId === 'mill_gantry_4') return '4_axis_vertical';
  return '3_axis_vertical';
}

function machineModeFromTopology(topology?: string): CalculatorSavedMachineProfile['machineMode'] {
  switch (topology) {
    case '2_axis_lathe':
    case 'y_axis_lathe':
    case 'sub_spindle_lathe':
    case 'mill_turn':
    case 'swiss':
    case 'vtl':
      return 'lathe';
    case 'sinker_edm':
      return 'edm';
    case 'wire_edm':
      return 'wire_edm';
    case 'laser':
      return 'laser';
    case 'waterjet':
      return 'waterjet';
    default:
      return 'mill';
  }
}

function buildCalculatorMachineProfilePayload(input: SaveCalculatorMachineProfileInput) {
  const machine = input.selection.machine;
  const selection = input.selection;
  const coolantLabels = new Map(coolantOptionsForMode(selection.machineMode).map((option) => [option.id, option.label]));
  const profileId = `calculator-${machine.id}-${normalizeOptionId(selection.selectedControllerId)}-${normalizeOptionId(selection.selectedSpindlePackageId)}`;
  const manufacturerId = normalizeOptionId(machine.manufacturer);
  const familyId = machine.taxonomy?.familyId ?? normalizeOptionId(machine.family);
  const familyLabel = machine.taxonomy?.familyLabel ?? machine.family;
  const topology = machineTopologyForCalculatorMode(machine.machineTypeId, selection.machineMode);
  const xTravel = machine.envelope.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/i);

  return {
    profile: {
      profileId,
      userId: input.userId,
      workspaceId: input.workspaceId,
      displayName: input.displayName?.trim() || `${machine.manufacturer} ${machine.model} calculator default`,
      machine: {
        machineId: machine.id,
        canonicalMachineId: machine.canonicalMachineId ?? machine.id,
        packageId: machine.packageId ?? `${machine.id}::${normalizeOptionId(selection.selectedControllerId)}::${normalizeOptionId(selection.selectedSpindlePackageId)}`,
        manufacturerId: manufacturerId || 'unknown',
        manufacturerLabel: machine.manufacturer,
        modelLabel: machine.model,
        familyId: familyId || 'other',
        familyLabel,
        controllerPackages: [
          {
            controllerId: selection.selectedControllerId,
            controllerLabel:
              selection.controllerOptions.find((option) => option.id === selection.selectedControllerId)?.label
              ?? selection.selectedControllerId,
            controlFeatures: selection.controllerCapabilityOptions.map((option) => ({
              id: option.id,
              label: option.label,
              availability: {
                enabled: true,
                source: machine.packageProvenance?.source === 'registry' ? 'registry' : 'catalog',
                confidence: machine.packageProvenance?.confidence === 'published' ? 0.9 : 0.68,
              },
            })),
          },
        ],
        spindlePackages: selection.spindleOptions.map((option) => ({
          id: option.id,
          label: option.label,
          availability: {
            enabled: true,
            source: machine.packageProvenance?.source === 'registry' ? 'registry' : 'catalog',
            confidence: machine.packageProvenance?.confidence === 'published' ? 0.9 : 0.68,
          },
        })),
        coolantStrategies: selection.coolantStrategyIds.map((coolantId) => ({
          id: coolantId,
          label: coolantLabels.get(coolantId) ?? coolantId,
          availability: {
            enabled: true,
            source: machine.packageProvenance?.source === 'registry' ? 'registry' : 'catalog',
            confidence: machine.packageProvenance?.confidence === 'published' ? 0.9 : 0.68,
          },
        })),
        kinematics: {
          familyId: familyId || 'other',
          familyLabel,
          topology,
          travelXIn: xTravel ? Number(xTravel[1]) : undefined,
          travelYIn: xTravel ? Number(xTravel[2]) : undefined,
          travelZIn: xTravel ? Number(xTravel[3]) : undefined,
        },
        guidewayType: machine.guidewayType,
        naturalFrequencyHz: machine.naturalFrequencyHz,
        axisAccelerationMps2: machine.axisAccelerationMps2,
        axisJerkMps3: machine.axisJerkMps3,
        sourceRecords: machine.packageProvenance?.sourceRecordIds?.length
          ? machine.packageProvenance.sourceRecordIds
          : [machine.id],
      },
      selectedControllerId: selection.selectedControllerId,
      enabledControllerFeatureIds: selection.enabledControllerFeatureIds,
      enabledMachineFeatureIds: selection.enabledMachineFeatureIds ?? [],
      selectedSpindlePackageId: selection.selectedSpindlePackageId,
      enabledCoolantStrategyIds: selection.enabledCoolantStrategyIds,
      toolingStationCountOverride: selection.toolingStationCountOverride,
      measuredPerformance: selection.measuredPerformance,
      preferredToolingFamilies: [],
      preferredToolpathFamilies: [],
      tags: [`mode:${selection.machineMode}`, `machineType:${machine.machineTypeId}`],
    },
    source: 'user_override',
    makeDefault: input.makeDefault ?? true,
  };
}

function normalizeProgramReleaseDefaultMachineProfile(
  value: LiveProgramReleaseUserMachineProfileReadModel | null,
): ProgramReleaseSavedMachineProfile | null {
  const profile = value?.profile;
  const machine = profile?.machine;

  if (
    !profile
    || typeof profile.profileId !== 'string'
    || typeof profile.userId !== 'string'
    || typeof profile.displayName !== 'string'
    || !machine
    || typeof machine.machineId !== 'string'
    || typeof machine.modelLabel !== 'string'
    || typeof profile.selectedControllerId !== 'string'
    || typeof profile.selectedSpindlePackageId !== 'string'
  ) {
    return null;
  }

  return {
    profileId: profile.profileId,
    userId: profile.userId,
    workspaceId: typeof profile.workspaceId === 'string' ? profile.workspaceId : undefined,
    displayName: profile.displayName,
    machineId: machine.machineId,
    machineLabel: machine.modelLabel,
    selectedControllerId: profile.selectedControllerId,
    selectedSpindlePackageId: profile.selectedSpindlePackageId,
    enabledCoolantStrategyIds: Array.isArray(profile.enabledCoolantStrategyIds)
      ? profile.enabledCoolantStrategyIds.filter((item): item is string => typeof item === 'string')
      : [],
    canDriveProgramRelease: value?.canDriveProgramRelease !== false,
  };
}

function normalizeCalculatorDefaultMachineProfile(
  value: LiveCalculatorUserMachineProfileReadModel | null,
): CalculatorSavedMachineProfile | null {
  const profile = value?.profile;
  const machine = profile?.machine;
  const topology = machine?.kinematics?.topology;

  if (
    !profile
    || typeof profile.profileId !== 'string'
    || typeof profile.userId !== 'string'
    || typeof profile.displayName !== 'string'
    || !machine
    || typeof machine.machineId !== 'string'
    || typeof machine.modelLabel !== 'string'
    || typeof profile.selectedControllerId !== 'string'
    || typeof profile.selectedSpindlePackageId !== 'string'
  ) {
    return null;
  }

  return {
    profileId: profile.profileId,
    userId: profile.userId,
    workspaceId: typeof profile.workspaceId === 'string' ? profile.workspaceId : undefined,
    displayName: profile.displayName,
    machineMode: machineModeFromTopology(topology),
    machineId: machine.machineId,
    machineLabel: machine.modelLabel,
    selectedControllerId: profile.selectedControllerId,
    selectedSpindlePackageId: profile.selectedSpindlePackageId,
    enabledCoolantStrategyIds: Array.isArray(profile.enabledCoolantStrategyIds)
      ? profile.enabledCoolantStrategyIds.filter((item): item is string => typeof item === 'string')
      : [],
    enabledControllerFeatureIds: Array.isArray(profile.enabledControllerFeatureIds)
      ? profile.enabledControllerFeatureIds.filter((item): item is string => typeof item === 'string')
      : [],
    enabledMachineFeatureIds: Array.isArray(profile.enabledMachineFeatureIds)
      ? profile.enabledMachineFeatureIds.filter((item): item is string => typeof item === 'string')
      : [],
    toolingStationCountOverride:
      typeof profile.toolingStationCountOverride === 'number' && Number.isFinite(profile.toolingStationCountOverride)
        ? Math.max(1, Math.round(profile.toolingStationCountOverride))
        : undefined,
    measuredPerformance: normalizeCalculatorMeasuredPerformance(profile.measuredPerformance),
    canDriveCalculatorSelections: value?.canDriveCalculatorSelections !== false,
  };
}

async function buildFixtureProgramReleaseMachineSearch(
  input: ProgramReleaseMachineSearchInput = {},
): Promise<ProgramReleaseMachineSearchResult> {
  const catalog = await fixtureOperatingSystemServices.getProgramReleaseCatalog();
  const query = input.query?.trim().toLowerCase() ?? '';
  const manufacturer = input.manufacturer?.trim().toLowerCase() ?? '';
  const familyId = input.familyId?.trim().toLowerCase() ?? '';
  const kinematics = input.kinematics?.trim().toLowerCase() ?? '';
  const controller = input.controller?.trim().toLowerCase() ?? '';
  const offset = Math.max(0, input.offset ?? 0);
  const limit = Math.max(1, input.limit ?? 20);

  let machines = catalog.machines;

  if (query) {
    machines = machines.filter((machine) =>
      [machine.manufacturer ?? '', machine.familyLabel ?? '', machine.label, machine.controller, machine.kinematics, machine.spindle]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }

  if (manufacturer) {
    machines = machines.filter((machine) => {
      const machineManufacturer = machine.manufacturer ?? '';
      const machineManufacturerId = machine.manufacturerId ?? slugifyProgramReleaseMachineToken(machineManufacturer);
      return machineManufacturerId.toLowerCase() === manufacturer || machineManufacturer.toLowerCase() === manufacturer;
    });
  }

  if (familyId) {
    machines = machines.filter((machine) => (machine.familyId ?? '').toLowerCase() === familyId);
  }

  if (kinematics) {
    machines = machines.filter((machine) => machine.kinematics.toLowerCase().includes(kinematics));
  }

  if (controller) {
    machines = machines.filter((machine) => machine.controller.toLowerCase().includes(controller));
  }

  const total = machines.length;
  const facets = buildProgramReleaseMachineSearchFacets(machines);

  return {
    machines: machines.slice(offset, offset + limit),
    total,
    hasMore: offset + limit < total,
    facets,
  };
}

function normalizeShellEntityKey(entityType: string) {
  return entityType.trim().toLowerCase();
}

function resolveShellEntityRouteMeta(entityType: string) {
  return SHELL_ENTITY_ROUTE_MAP[normalizeShellEntityKey(entityType)] ?? SHELL_ENTITY_ROUTE_MAP.job;
}

function buildFallbackShellRecord(entityType: string, entityId: string, title: string): SearchResult {
  const meta = resolveShellEntityRouteMeta(entityType);
  return normalizeEntityRoute({
    id: entityId,
    title: title || `${meta.type} ${entityId}`,
    type: meta.type,
    status: 'Tracked',
    owner: 'Shell',
    detail: `Mounted shell ${normalizeShellEntityKey(entityType)} record synced through the operating-system rail.`,
    workspaceLabel: meta.workspaceLabel,
    workspaceRoute: meta.workspaceRoute,
    to: `${meta.workspaceRoute}?focusId=${encodeURIComponent(entityId)}&focusType=${meta.type.toLowerCase()}`,
    keywords: [entityId, title, meta.type].filter(Boolean),
  });
}

function resolveShellRecord(entityType: string, entityId: string, title: string): SearchResult {
  const meta = resolveShellEntityRouteMeta(entityType);
  const fixture = FIXTURE_RESULTS.find(
    (record) => record.id === entityId && record.type === meta.type,
  );

  if (!fixture) {
    return buildFallbackShellRecord(entityType, entityId, title);
  }

  return normalizeEntityRoute({
    ...fixture,
    title: title || fixture.title,
  });
}

function extractLivePinnedEntities(result: unknown): LivePinnedEntityRecord[] {
  const candidatePins = Array.isArray(result) ? result : [];
  return candidatePins.flatMap((candidate) => {
    if (typeof candidate !== 'object' || candidate === null) {
      return [];
    }

    const pin = candidate as LivePinnedEntityRecord;
    if (
      typeof pin.id !== 'string'
      || typeof pin.user_id !== 'string'
      || typeof pin.entity_type !== 'string'
      || typeof pin.entity_id !== 'string'
      || typeof pin.title !== 'string'
      || typeof pin.pinned_at !== 'string'
    ) {
      return [];
    }

    return [pin];
  });
}

function extractLiveRecentEntities(result: unknown): LiveRecentEntityRecord[] {
  const candidateRecents = Array.isArray(result) ? result : [];
  return candidateRecents.flatMap((candidate) => {
    if (typeof candidate !== 'object' || candidate === null) {
      return [];
    }

    const recent = candidate as LiveRecentEntityRecord;
    if (
      typeof recent.id !== 'string'
      || typeof recent.user_id !== 'string'
      || typeof recent.entity_type !== 'string'
      || typeof recent.entity_id !== 'string'
      || typeof recent.title !== 'string'
      || typeof recent.accessed_at !== 'string'
    ) {
      return [];
    }

    return [recent];
  });
}

function extractLiveSavedViews(result: unknown): LiveSavedViewRecord[] {
  const candidateViews = Array.isArray(result) ? result : [];
  return candidateViews.flatMap((candidate) => {
    if (typeof candidate !== 'object' || candidate === null) {
      return [];
    }

    const view = candidate as LiveSavedViewRecord;
    if (
      typeof view.id !== 'string'
      || typeof view.user_id !== 'string'
      || typeof view.name !== 'string'
      || typeof view.entity_type !== 'string'
      || typeof view.updated_at !== 'string'
      || typeof view.is_default !== 'boolean'
      || typeof view.filters !== 'object'
      || view.filters === null
    ) {
      return [];
    }

    return [view];
  });
}

async function loadLivePinnedEntities() {
  return extractLivePinnedEntities(
    await requestOperatingSystemGet<LivePinnedEntityRecord[]>(
      `/pins/${encodeURIComponent(SHELL_RECORDS_USER_ID)}`,
    ),
  );
}

async function loadLiveRecentEntities() {
  return extractLiveRecentEntities(
    await requestOperatingSystemGet<LiveRecentEntityRecord[]>(
      `/recents/${encodeURIComponent(SHELL_RECORDS_USER_ID)}`,
      { limit: 6 },
    ),
  );
}

async function loadLiveShellRecordState() {
  const [pins, recents] = await Promise.all([
    loadLivePinnedEntities(),
    loadLiveRecentEntities(),
  ]);

  return {
    pinnedRecords: pins.map((pin) => resolveShellRecord(pin.entity_type, pin.entity_id, pin.title)),
    recentRecords: recents.map((recent) => resolveShellRecord(recent.entity_type, recent.entity_id, recent.title)),
  };
}

function normalizeLiveShellSavedView(record: LiveSavedViewRecord) {
  const path = typeof record.filters.path === 'string' ? record.filters.path : '/dashboard';
  const search = typeof record.filters.search === 'string' ? record.filters.search : '';
  const to = normalizeRouteTarget(`${path}${search}`);

  return {
    id: record.id,
    userId: record.user_id,
    name: record.name,
    entityType: record.entity_type,
    to,
    isDefault: record.is_default,
    updatedAt: record.updated_at,
  };
}

async function loadLiveShellSavedViews(entityType?: string) {
  return extractLiveSavedViews(
    await requestOperatingSystemGet<LiveSavedViewRecord[]>(
      `/views/${encodeURIComponent(SHELL_RECORDS_USER_ID)}`,
      entityType ? { entity_type: entityType } : undefined,
    ),
  ).map(normalizeLiveShellSavedView);
}

function buildShellSavedViewFilters(to: string) {
  const target = new URL(normalizeRouteTarget(to), 'http://prism.local');
  return {
    path: target.pathname,
    search: target.search,
  };
}

function extractEmployees(result: unknown): Employee[] {
  const candidateEmployees =
    typeof result === 'object' && result !== null && Array.isArray((result as { employees?: unknown }).employees)
      ? (result as { employees: unknown[] }).employees
      : Array.isArray(result)
        ? result
        : [];

  return candidateEmployees.flatMap((candidate) => {
    if (typeof candidate !== 'object' || candidate === null) {
      return [];
    }

    const employee = candidate as Employee;
    if (
      typeof employee.id !== 'string'
      || typeof employee.first_name !== 'string'
      || typeof employee.last_name !== 'string'
      || typeof employee.department !== 'string'
      || typeof employee.role !== 'string'
      || typeof employee.status !== 'string'
    ) {
      return [];
    }

    return [employee];
  });
}

function inferEmailLoginProfile(employee: Employee) {
  const haystack = `${employee.role} ${employee.department}`;

  if (INSPECTOR_PATTERN.test(haystack)) {
    return 'inspector' as const;
  }

  if (PLANNER_PATTERN.test(haystack)) {
    return 'planner' as const;
  }

  if (MACHINIST_PATTERN.test(haystack)) {
    return 'machinist' as const;
  }

  return null;
}

function buildLiveEmailLoginTagline(employee: Employee, profileId: 'machinist' | 'inspector' | 'planner' | null) {
  const fullName = `${employee.first_name} ${employee.last_name}`.trim();
  if (profileId === 'machinist') {
    return `Live employee directory recognized ${fullName}'s floor mailbox. Inbox delivery still converges through the staged messages seam until mailbox routes land.`;
  }

  if (profileId === 'inspector') {
    return `Live employee directory recognized ${fullName}'s quality mailbox. Inspection follow-up can enter Kienzle now while mailbox delivery remains staged.`;
  }

  if (profileId === 'planner') {
    return `Live employee directory recognized ${fullName}'s planning mailbox. Dispatch coordination can enter Kienzle now while mailbox delivery still converges.`;
  }

  return `Live employee directory recognized ${fullName}'s mailbox. Full inbox identity is available now, while mailbox delivery and thread state still remain staged.`;
}

async function loadLiveHotJobs() {
  const records = await requestOperatingSystemGet<HotJobRecord[]>('/hot-jobs');
  return replaceHotJobs(records);
}

async function syncLiveHotJobs(records: HotJobRecord[]) {
  return replaceHotJobs(records);
}

async function loadLiveMessagesWorkspace(input?: {
  profileId?: string;
  email?: string | null;
  threadId?: string | null;
}) {
  return normalizeMessagesWorkspace(
    await requestOperatingSystem<MessagesWorkspace>('/messages/workspace', input ?? {}),
  );
}

function mergeLiveEmailLoginOptions(
  employees: Employee[],
  fallbackOptions: EmailLoginOption[],
): EmailLoginOption[] {
  const mappedLiveOptions: EmailLoginOption[] = employees
    .filter((employee) => employee.status === 'active' && typeof employee.email === 'string' && employee.email.trim().length > 0)
    .map((employee): EmailLoginOption => {
      const email = employee.email!.trim();
      const profileId = inferEmailLoginProfile(employee);
      const fallback =
        fallbackOptions.find((option) => option.email.toLowerCase() === email.toLowerCase())
        ?? (profileId
          ? fallbackOptions.find((option) => option.profileId === profileId)
          : fallbackOptions.find((option) => option.shellKind === 'admin'));

      return {
        id: fallback?.id ?? `live-email-${employee.id}`,
        email,
        displayName: `${employee.first_name} ${employee.last_name}`.trim(),
        role: employee.role,
        department: employee.department,
        shellKind: profileId ? 'employee' as const : 'admin' as const,
        profileId: profileId ?? undefined,
        destination:
          profileId
            ? `/employee/messages?profile=${encodeURIComponent(profileId)}`
            : '/messages',
        tagline: fallback?.tagline ?? buildLiveEmailLoginTagline(employee, profileId),
        unreadCount: fallback?.unreadCount ?? 0,
      };
    });

  const merged = [...mappedLiveOptions];
  const knownEmails = new Set(mappedLiveOptions.map((option) => option.email.toLowerCase()));

  for (const fallback of fallbackOptions) {
    if (!knownEmails.has(fallback.email.toLowerCase())) {
      merged.push(fallback);
    }
  }

  return merged;
}

async function buildLiveEmailLoginOptions() {
  const fallbackOptions = await fixtureOperatingSystemServices.getEmailLoginOptions();
  const response = await listEmployees();
  const employees = extractEmployees(response.result);
  const merged = mergeLiveEmailLoginOptions(employees, fallbackOptions);

  if (merged.length === 0) {
    throw new Error('Live employee directory missing recognized mailboxes');
  }

  return merged;
}

function formatUsdCents(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatBillingSyncLabel(timestamp?: string) {
  if (!timestamp) {
    return undefined;
  }

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function extractLiveBillingStatus(result: unknown): LiveBillingStatus | null {
  if (typeof result !== 'object' || result === null) {
    return null;
  }

  const payload = result as Partial<LiveBillingStatus>;
  if (typeof payload.plan !== 'string' || typeof payload.role !== 'string' || typeof payload.userId !== 'string') {
    return null;
  }

  const prices =
    typeof payload.prices === 'object' && payload.prices !== null
      ? Object.fromEntries(
          Object.entries(payload.prices).flatMap(([planId, value]) => {
            if (
              typeof value !== 'object'
              || value === null
              || typeof value.monthly_cents !== 'number'
              || typeof value.annual_cents !== 'number'
              || typeof value.label !== 'string'
            ) {
              return [];
            }

            return [[planId, value]];
          }),
        )
      : {};

  return {
    userId: payload.userId,
    plan: payload.plan,
    role: payload.role,
    prices,
    timestamp: typeof payload.timestamp === 'string' ? payload.timestamp : undefined,
  };
}

function buildLiveCommerceCatalog(fallback: ShellCommerceCatalog, billing: LiveBillingStatus): ShellCommerceCatalog {
  const mappedTierId = BILLING_PLAN_TO_TIER[billing.plan];
  const mappedTier = mappedTierId ? fallback.tiers.find((tier) => tier.id === mappedTierId) ?? null : null;
  const livePlanPrices = Object.entries(billing.prices).map(([planId, price]) => ({
    planId,
    label: price.label,
    monthlyLabel: `${formatUsdCents(price.monthly_cents)} / month`,
    annualLabel: `${formatUsdCents(price.annual_cents)} / year`,
  }));
  const syncLabel = formatBillingSyncLabel(billing.timestamp);
  const mappedTierLabel = mappedTier?.label;
  const planLabel = mappedTierLabel ?? billing.plan;
  const detail = mappedTierLabel
    ? `Live billing status is connected. Backend currently reports ${billing.role} access on the ${mappedTierLabel} billing lane, and the staged catalog keeps the broader Kienzle packaging story visible while tier mapping finishes converging.`
    : `Live billing status is connected for the ${billing.plan} backend plan, while the staged catalog continues carrying the broader Kienzle packaging story until tier mapping is fully converged.`;

  return {
    ...fallback,
    shellNote: `${fallback.shellNote} Live billing status is connected whenever authentication is present, while tier packaging, add-on posture, and sourcing recommendations still rely on the shared staged catalog.`,
    billingPosture: {
      source: 'live',
      authenticated: true,
      currentPlanId: billing.plan,
      currentPlanLabel: planLabel,
      roleLabel: billing.role,
      detail,
      planPrices: livePlanPrices,
      mappedTierId,
      mappedTierLabel,
      lastSyncLabel: syncLabel,
    },
  };
}

function mergeEmployeeShellBootstrap(
  fallback: EmployeeShellBootstrap,
  live: EmployeeShellBootstrap,
): EmployeeShellBootstrap {
  return {
    ...fallback,
    deskCounts: hasMeaningfulDeskCounts(live.deskCounts) ? live.deskCounts : fallback.deskCounts,
    pins: live.pins.length > 0 ? live.pins.map(normalizeEntityRoute) : fallback.pins,
    recents: live.recents.length > 0 ? live.recents.map(normalizeEntityRoute) : fallback.recents,
    hotJobs: live.hotJobs.length > 0 ? live.hotJobs : fallback.hotJobs,
    policyNote: `${fallback.policyNote} ${live.policyNote}`.trim(),
  };
}

async function buildLiveJobDeskRecords(jobs: Job[]): Promise<JobDeskRecord[]> {
  if (jobs.length === 0) {
    return [];
  }

  const hotJobIds = await getHotJobIds();
  const records = await Promise.all(
    jobs.map((job) => requestOperatingSystem<JobDeskRecord | null>(`/jobs/${encodeURIComponent(job.id)}/desk`, { job, hotJobIds })),
  );

  const filteredRecords = records.filter((record): record is JobDeskRecord => record != null);
  if (filteredRecords.length !== records.length) {
    throw new Error('Live job desk payload incomplete');
  }

  return filteredRecords;
}

function normalizeStudyKey(key: string) {
  if (key === 'job-shop') return 'jobshop';
  if (key === 'single-machine') return 'single';
  return key;
}

function adaptSchedulingInputs(inputs: SchedulingStudyInputs) {
  const jobShopResult = inputs.jobShopResult
    ? {
        makespan: inputs.jobShopResult.makespan,
        jobs: inputs.jobShopResult.schedule.map((entry) => ({
          id: entry.job_id,
          machine: entry.machine,
          start: entry.start,
          end: entry.end,
        })),
        utilization:
          typeof inputs.jobShopResult.utilization === 'number'
            ? Object.fromEntries(
                [...new Set(inputs.jobShopResult.schedule.map((entry) => entry.machine))].map((machine) => [
                  machine,
                  inputs.jobShopResult!.utilization,
                ]),
              )
            : inputs.jobShopResult.utilization,
      }
    : null;

  const singleResult = inputs.singleResult
    ? {
        sequence: Array.isArray((inputs.singleResult as { sequence?: unknown }).sequence)
          ? ((inputs.singleResult as { sequence: string[] }).sequence ?? [])
          : [],
        totalWeightedCompletion:
          typeof (inputs.singleResult as { totalWeightedCompletion?: unknown }).totalWeightedCompletion === 'number'
            ? ((inputs.singleResult as { totalWeightedCompletion: number }).totalWeightedCompletion ?? 0)
            : 0,
        avgFlowTime:
          typeof (inputs.singleResult as { avgFlowTime?: unknown }).avgFlowTime === 'number'
            ? ((inputs.singleResult as { avgFlowTime: number }).avgFlowTime ?? 0)
            : 0,
      }
    : null;

  const johnsonsResult = inputs.johnsonsResult
    ? {
        sequence: Array.isArray((inputs.johnsonsResult as { sequence?: unknown }).sequence)
          ? ((inputs.johnsonsResult as { sequence: string[] }).sequence ?? [])
          : [],
        makespan:
          typeof (inputs.johnsonsResult as { makespan?: unknown }).makespan === 'number'
            ? ((inputs.johnsonsResult as { makespan: number }).makespan ?? 0)
            : 0,
        machine1Idle:
          typeof (inputs.johnsonsResult as { machine1Idle?: unknown }).machine1Idle === 'number'
            ? ((inputs.johnsonsResult as { machine1Idle: number }).machine1Idle ?? 0)
            : 0,
        machine2Idle:
          typeof (inputs.johnsonsResult as { machine2Idle?: unknown }).machine2Idle === 'number'
            ? ((inputs.johnsonsResult as { machine2Idle: number }).machine2Idle ?? 0)
            : 0,
      }
    : null;

  const cpmResult = inputs.cpmResult
    ? {
        criticalPath: Array.isArray((inputs.cpmResult as { criticalPath?: unknown; critical_path?: unknown }).criticalPath)
          ? ((inputs.cpmResult as { criticalPath: string[] }).criticalPath ?? [])
          : Array.isArray((inputs.cpmResult as { critical_path?: unknown }).critical_path)
            ? ((inputs.cpmResult as { critical_path: string[] }).critical_path ?? [])
            : [],
        projectDuration:
          typeof (inputs.cpmResult as { projectDuration?: unknown }).projectDuration === 'number'
            ? ((inputs.cpmResult as { projectDuration: number }).projectDuration ?? 0)
            : typeof (inputs.cpmResult as { duration?: unknown }).duration === 'number'
              ? ((inputs.cpmResult as { duration: number }).duration ?? 0)
              : 0,
        slack:
          typeof (inputs.cpmResult as { slack?: unknown }).slack === 'object' && (inputs.cpmResult as { slack?: unknown }).slack
            ? ((inputs.cpmResult as { slack: Record<string, number> }).slack ?? {})
            : {},
      }
    : null;

  return {
    jobShopResult,
    singleResult,
    johnsonsResult,
    cpmResult,
  };
}

function adaptLiveStudies(studies: SchedulingStudyRecord[]): SchedulingStudyRecord[] {
  return studies.map((study) => ({
    ...study,
    key: normalizeStudyKey(study.key),
    release: {
      ...study.release,
      studyKey: normalizeStudyKey(study.release.studyKey),
    },
  }));
}

function formatLiveLearningCoverage(progress: ProgressSummary) {
  if (progress.modules_total <= 0) {
    return 'Live learning coverage pending';
  }

  return `${Math.round((progress.modules_completed / progress.modules_total) * 100)}% live learning coverage`;
}

function buildLiveLearningSnapshot(
  progress: ProgressSummary,
  recommendations: LearningModule[],
  fallback: Awaited<ReturnType<typeof fixtureOperatingSystemServices.getPlatformLearningSnapshot>>,
): PlatformLearningSnapshot {
  const earnedBadges = progress.badges.filter((badge) => badge.earned_at).length;
  const topDomainEntry =
    Object.entries(progress.domain_progress).sort((left, right) => right[1] - left[1])[0] ?? null;
  const topDomainLabel = topDomainEntry ? topDomainEntry[0] : 'CAM';
  const nextRecommendations = recommendations.slice(0, 2);
  const captureProgress: LearningSignalCaptureRecord = {
    id: 'capture-shop-learning-progress',
    label: 'Operator progress loop',
    scope: 'shop',
    status: progress.modules_completed > 0 ? 'live' : 'warming',
    detail: `${progress.modules_completed}/${progress.modules_total} tracked modules are complete, with ${progress.total_hours.toFixed(1)} live hours captured through the learning routes.`,
    coverage: 'Learning dashboard, academy, role growth posture',
  };
  const captureRecommendations: LearningSignalCaptureRecord = {
    id: 'capture-shop-learning-recommend',
    label: 'Recommendation loop',
    scope: 'hybrid',
    status: recommendations.length > 0 ? 'live' : 'warming',
    detail: recommendations.length > 0
      ? `The live recommend route is returning ${recommendations.length} next-step module${recommendations.length === 1 ? '' : 's'}, currently led by ${topDomainLabel}.`
      : 'The live recommend route is reachable, but no next-step module recommendations are currently coming through.',
    coverage: 'Learning dashboard, academy planner, operator coaching',
  };
  const stagedCapture = {
    ...fallback.shopProfile.captures[2],
    status: fallback.shopProfile.captures[2].status,
    detail: 'Cross-desk learning propagation is still staged behind the shared learning snapshot seam while backend convergence continues.',
  } satisfies LearningSignalCaptureRecord;
  const improvements: LearningImprovementRecord[] = [
    ...nextRecommendations.map((module) => ({
      id: `learning-live-${module.id}`,
      title: `Promote ${module.title}`,
      source: 'shop' as const,
      detail: `Live recommendation route suggests a ${module.difficulty} ${module.domain} module (${module.duration_min} min) as the next high-value learning step.`,
      impact: 'Turns live operator progress into the next guided action instead of leaving learning static.',
    })),
    ...fallback.shopProfile.improvements,
  ].slice(0, 4);

  return {
    ...fallback,
    shopProfile: {
      ...fallback.shopProfile,
      autonomyPosture: `${progress.current_streak_days}-day streak across ${progress.total_hours.toFixed(1)} live hours with ${earnedBadges} earned badge${earnedBadges === 1 ? '' : 's'}.`,
      adaptationScore: formatLiveLearningCoverage(progress),
      captures: [captureProgress, captureRecommendations, stagedCapture],
      improvements,
    },
    rolloutActions: [
      nextRecommendations[0]
        ? `Promote ${nextRecommendations[0].title} while ${formatLiveLearningCoverage(progress).toLowerCase()} is coming through the live learning routes.`
        : fallback.rolloutActions[0],
      'Keep cross-shop learning and propagation staged explicitly until backend network-learning payloads land; local operator progress is already live-backed.',
      ...fallback.rolloutActions.slice(1),
    ].slice(0, 3),
  };
}

function extractLiveDocumentRecords(result: unknown): LiveDocumentRecord[] {
  const candidateDocuments =
    typeof result === 'object' && result !== null && Array.isArray((result as { documents?: unknown }).documents)
      ? (result as { documents: unknown[] }).documents
      : Array.isArray(result)
        ? result
        : [];

  return candidateDocuments.flatMap((candidate) => {
    if (typeof candidate !== 'object' || candidate === null) {
      return [];
    }

    const doc = candidate as {
      id?: unknown;
      status?: unknown;
      title?: unknown;
    };

    if (typeof doc.id !== 'string' || typeof doc.status !== 'string') {
      return [];
    }

    if (!['pending', 'extracting', 'complete', 'failed'].includes(doc.status)) {
      return [];
    }

    return [
      {
        id: doc.id,
        status: doc.status as LiveDocumentRecord['status'],
        title: typeof doc.title === 'string' ? doc.title : null,
      },
    ];
  });
}

function extractPurchaseOrders(result: unknown): PurchaseOrder[] {
  const candidateOrders =
    typeof result === 'object' && result !== null && Array.isArray((result as { orders?: unknown }).orders)
      ? (result as { orders: unknown[] }).orders
      : Array.isArray(result)
        ? result
        : [];

  return candidateOrders.flatMap((candidate) => {
    if (typeof candidate !== 'object' || candidate === null) {
      return [];
    }

    const order = candidate as PurchaseOrder;
    if (
      typeof order.id !== 'string'
      || typeof order.supplier_name !== 'string'
      || !Array.isArray(order.line_items)
      || typeof order.status !== 'string'
    ) {
      return [];
    }

    return [order];
  });
}

function extractToolUsageRecords(result: unknown): ToolUsageRecord[] {
  const candidateRecords =
    typeof result === 'object' && result !== null && Array.isArray((result as { records?: unknown }).records)
      ? (result as { records: unknown[] }).records
      : Array.isArray(result)
        ? result
        : [];

  return candidateRecords.flatMap((candidate) => {
    if (typeof candidate !== 'object' || candidate === null) {
      return [];
    }

    const record = candidate as ToolUsageRecord;
    if (
      typeof record.id !== 'string'
      || typeof record.tool_id !== 'string'
      || typeof record.tool_name !== 'string'
      || typeof record.job_id !== 'string'
      || typeof record.operation !== 'string'
      || typeof record.usage_minutes !== 'number'
      || typeof record.wear_percent !== 'number'
      || typeof record.cost !== 'number'
    ) {
      return [];
    }

    return [record];
  });
}

function extractToolReorderAlerts(result: unknown): ReorderAlert[] {
  const candidateAlerts =
    typeof result === 'object' && result !== null && Array.isArray((result as { alerts?: unknown }).alerts)
      ? (result as { alerts: unknown[] }).alerts
      : Array.isArray(result)
        ? result
        : [];

  return candidateAlerts.flatMap((candidate) => {
    if (typeof candidate !== 'object' || candidate === null) {
      return [];
    }

    const alert = candidate as ReorderAlert;
    if (
      typeof alert.tool_id !== 'string'
      || typeof alert.tool_name !== 'string'
      || typeof alert.current_qty !== 'number'
      || typeof alert.min_stock !== 'number'
      || typeof alert.reorder_qty !== 'number'
      || typeof alert.estimated_cost !== 'number'
      || typeof alert.urgency !== 'string'
    ) {
      return [];
    }

    return [alert];
  });
}

function inferReceivingDepartment(
  order: PurchaseOrder,
  fallback: InventoryOperationsWorkspace,
) {
  const haystack = `${order.supplier_name} ${order.line_items.map((line) => line.description).join(' ')}`.toLowerCase();

  if (/(insert|holder|end mill|endmill|drill|tap|tool|collet|boring bar|reamer|carbide)/.test(haystack)) {
    return 'Tool crib';
  }

  if (/(fixture|vise|clamp|jergens|pallet|workholding|tombstone)/.test(haystack)) {
    return 'Mill cell';
  }

  if (/(gage|gauge|calibration|cmm|inspection)/.test(haystack)) {
    return 'Quality bench';
  }

  if (/(coolant|oil|maintenance|service|filter|sds|chemical)/.test(haystack)) {
    return 'Maintenance';
  }

  return fallback.departmentRoutes[0]?.department ?? 'Tool crib';
}

function mapPurchaseOrderStatus(status: PurchaseOrder['status']) {
  if (status === 'approved' || status === 'partially_received') {
    return 'ready' as const;
  }

  if (status === 'received' || status === 'closed') {
    return 'watch' as const;
  }

  return 'blocked' as const;
}

function buildReceivingNote(order: PurchaseOrder) {
  if (order.status === 'partially_received') {
    const remainingUnits = order.line_items.reduce(
      (sum, line) => sum + Math.max(line.quantity - line.received_qty, 0),
      0,
    );
    return `Live ERP receipt is partially complete. ${remainingUnits} unit${remainingUnits === 1 ? '' : 's'} remain to be counted, received, and routed.`;
  }

  if (order.status === 'approved') {
    return 'Live ERP order is approved and ready for receiving review, dock count, and department routing.';
  }

  if (order.status === 'received' || order.status === 'closed') {
    return 'Live ERP order is already materially received. Keep it visible for verification and ownership follow-up only.';
  }

  return 'Live ERP order is not approved for receiving yet. Keep the receipt blocked until purchasing releases it.';
}

function buildLiveInventoryWorkspace(
  fallback: InventoryOperationsWorkspace,
  documents: LiveDocumentRecord[],
  purchaseOrders: PurchaseOrder[],
  usageRecords: ToolUsageRecord[],
  reorderAlerts: ReorderAlert[],
): InventoryOperationsWorkspace {
  const activeOrders = purchaseOrders
    .filter((order) => order.status !== 'closed')
    .slice(0, 3);
  const liveReceivingQueue = activeOrders.map((order) => ({
    id: `po-${order.id}`,
    supplier: order.supplier_name,
    reference: order.id,
    partCount: `${order.line_items.length} line item${order.line_items.length === 1 ? '' : 's'}`,
    department: inferReceivingDepartment(order, fallback),
    status: mapPurchaseOrderStatus(order.status),
    note: buildReceivingNote(order),
  }));
  const completeDocs = documents.filter((record) => record.status === 'complete').length;
  const pendingDocs = documents.filter((record) => record.status === 'pending' || record.status === 'extracting').length;
  const checkoutNotes = reorderAlerts.slice(0, fallback.checkoutQueue.length);
  const usageNotes = usageRecords.slice(0, fallback.usagePulses.length);

  return {
    ...fallback,
    summary: `${fallback.summary} Live intake now sees ${documents.length} registered document${documents.length === 1 ? '' : 's'} (${completeDocs} complete / ${pendingDocs} active) and ${liveReceivingQueue.length} purchase-order receipt candidate${liveReceivingQueue.length === 1 ? '' : 's'} through current backend routes.`,
    shellNote:
      'Document registry, purchase-order receiving, and tooling telemetry cues are now live-backed with fixture fallback. Department routes, checkout choreography, and insert-edge custody still remain staged until backend custody events converge.',
    receivingQueue: liveReceivingQueue.length > 0 ? liveReceivingQueue : fallback.receivingQueue,
    checkoutQueue: fallback.checkoutQueue.map((record, index) => {
      const alert = checkoutNotes[index];
      if (!alert) {
        return record;
      }

      return {
        ...record,
        status: alert.urgency === 'high' ? 'watch' : record.status,
        note: `Live reorder posture: ${alert.current_qty} on hand vs ${alert.min_stock} min stock. ${record.note}`,
      };
    }),
    usagePulses: fallback.usagePulses.map((pulse, index) => {
      const usage = usageNotes[index];
      if (!usage) {
        return pulse;
      }

      return {
        ...pulse,
        state:
          usage.wear_percent >= 80
            ? 'Watch wear'
            : usage.wear_percent >= 50
              ? 'Live usage feed'
              : pulse.state,
        costPerPart: `$${usage.cost.toFixed(2)} live cost`,
        nextAction: `Live ERP usage shows ${usage.usage_minutes.toFixed(1)} min on ${usage.job_id} (${usage.operation}). ${pulse.nextAction}`,
      };
    }),
  };
}

export const liveOperatingSystemServices: OperatingSystemServices = {
  ...fixtureOperatingSystemServices,

  async getShellBootstrap() {
    return withFixtureFallback(
      async () => {
        const bootstrap = normalizeShellBootstrap(await requestOperatingSystem<ShellBootstrap>('/shell/bootstrap'));
        if (!hasMeaningfulShellBootstrapData(bootstrap)) {
          throw new Error('Live shell bootstrap missing aggregate data');
        }
        return bootstrap;
      },
      () => fixtureOperatingSystemServices.getShellBootstrap(),
    );
  },

  async getEmployeeShellProfiles() {
    return withFixtureFallback(
      async () => {
        const profiles = await requestOperatingSystem<EmployeeShellProfileSummary[]>('/shell/employee-profiles');
        const fallbackProfiles = await fixtureOperatingSystemServices.getEmployeeShellProfiles();
        const normalized = profiles
          .map((profile) => normalizeEmployeeProfileSummary(profile, fallbackProfiles))
          .filter((profile): profile is EmployeeShellProfileSummary => profile !== null);

        if (normalized.length === 0) {
          throw new Error('No compatible employee shell profiles available from live backend');
        }

        return normalized;
      },
      () => fixtureOperatingSystemServices.getEmployeeShellProfiles(),
    );
  },

  async getEmailLoginOptions() {
    return withFixtureFallback(
      () => buildLiveEmailLoginOptions(),
      () => fixtureOperatingSystemServices.getEmailLoginOptions(),
    );
  },

  async resolveEmailLogin(email) {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    return withFixtureFallback(
      async () => {
        const options = await buildLiveEmailLoginOptions();
        return options.find((option) => option.email.toLowerCase() === normalized) ?? null;
      },
      () => fixtureOperatingSystemServices.resolveEmailLogin(email),
    );
  },

  async getEmployeeShellBootstrap(profileId) {
    return withFixtureFallback(
      async () => {
        const requestedProfileId = profileId ?? 'machinist';
        const backendProfileId = BACKEND_PROFILE_IDS[requestedProfileId as keyof typeof BACKEND_PROFILE_IDS];
        const fallback = await fixtureOperatingSystemServices.getEmployeeShellBootstrap(requestedProfileId);

        if (!backendProfileId) {
          return fallback;
        }

        const liveBootstrap = await requestOperatingSystem<EmployeeShellBootstrap>(
          `/shell/employee/${encodeURIComponent(backendProfileId)}`,
          {
            hotJobs: fallback.hotJobs,
          },
        );

        return mergeEmployeeShellBootstrap(fallback, {
          ...liveBootstrap,
          profileId: requestedProfileId,
        });
      },
      () => fixtureOperatingSystemServices.getEmployeeShellBootstrap(profileId),
    );
  },

  async getDeskCounts() {
    return withFixtureFallback(
      async () => {
        const counts = await requestOperatingSystem<DeskCounts>('/desk/counts');
        if (!hasMeaningfulDeskCounts(counts)) {
          throw new Error('Live desk counts missing aggregate data');
        }
        return counts;
      },
      () => fixtureOperatingSystemServices.getDeskCounts(),
    );
  },

  async search(query) {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return [];
    }

    return withFixtureFallback(
      async () =>
        (await requestOperatingSystemGet<SearchResult[]>('/search', { q: normalizedQuery, limit: 20 })).map(
          normalizeEntityRoute,
        ),
      () => fixtureOperatingSystemServices.search(normalizedQuery),
    );
  },

  async getShellRecordState() {
    return withFixtureFallback(
      () => loadLiveShellRecordState(),
      () => fixtureOperatingSystemServices.getShellRecordState(),
    );
  },

  async pinShellRecord(record, currentPinnedRecords) {
    return withFixtureFallback(
      async () => {
        await requestOperatingSystem('/pins', {
          user_id: SHELL_RECORDS_USER_ID,
          entity_type: record.type.toLowerCase(),
          entity_id: record.id,
          title: record.title,
        });
        return (await loadLiveShellRecordState()).pinnedRecords;
      },
      () => fixtureOperatingSystemServices.pinShellRecord(record, currentPinnedRecords),
    );
  },

  async unpinShellRecord(record, currentPinnedRecords) {
    return withFixtureFallback(
      async () => {
        const pins = await loadLivePinnedEntities();
        const matchingPin = pins.find(
          (pin) =>
            pin.entity_id === record.id
            && normalizeShellEntityKey(pin.entity_type) === normalizeShellEntityKey(record.type),
        );

        if (!matchingPin) {
          return currentPinnedRecords.filter((entry) => entry.id !== record.id);
        }

        await requestOperatingSystemDelete<{ unpinned: boolean }>(
          `/pins/${encodeURIComponent(matchingPin.id)}`,
          { user_id: SHELL_RECORDS_USER_ID },
        );
        return (await loadLiveShellRecordState()).pinnedRecords;
      },
      () => fixtureOperatingSystemServices.unpinShellRecord(record, currentPinnedRecords),
    );
  },

  async recordShellRecordAccess(record, currentRecentRecords) {
    return withFixtureFallback(
      async () => {
        await requestOperatingSystem('/recents', {
          user_id: SHELL_RECORDS_USER_ID,
          entity_type: record.type.toLowerCase(),
          entity_id: record.id,
          title: record.title,
        });
        return (await loadLiveShellRecordState()).recentRecords;
      },
      () => fixtureOperatingSystemServices.recordShellRecordAccess(record, currentRecentRecords),
    );
  },

  async getShellSavedViews(entityType = 'workspace') {
    return withFixtureFallback(
      () => loadLiveShellSavedViews(entityType),
      () => fixtureOperatingSystemServices.getShellSavedViews(entityType),
    );
  },

  async createShellSavedView(input) {
    return withFixtureFallback(
      async () => {
        await requestOperatingSystem('/views', {
          user_id: SHELL_RECORDS_USER_ID,
          name: input.name,
          entity_type: input.entityType,
          filters: buildShellSavedViewFilters(input.to),
          is_default: input.isDefault ?? false,
        });
        return loadLiveShellSavedViews(input.entityType);
      },
      () => fixtureOperatingSystemServices.createShellSavedView(input),
    );
  },

  async updateShellSavedView(input) {
    return withFixtureFallback(
      async () => {
        const currentViews = await loadLiveShellSavedViews();
        const existingView = currentViews.find((view) => view.id === input.viewId);
        if (!existingView) {
          throw new Error(`Saved view ${input.viewId} not found`);
        }

        await requestOperatingSystemPut('/views', {
          view_id: input.viewId,
          user_id: SHELL_RECORDS_USER_ID,
          ...(input.name ? { name: input.name } : {}),
          ...(input.to ? { filters: buildShellSavedViewFilters(input.to) } : {}),
          ...(input.isDefault !== undefined ? { is_default: input.isDefault } : {}),
        });

        return loadLiveShellSavedViews(existingView.entityType);
      },
      () => fixtureOperatingSystemServices.updateShellSavedView(input),
    );
  },

  async deleteShellSavedView(viewId, entityType = 'workspace') {
    return withFixtureFallback(
      async () => {
        await requestOperatingSystemDelete<{ deleted: boolean }>(
          `/views/${encodeURIComponent(viewId)}`,
          { user_id: SHELL_RECORDS_USER_ID },
        );
        return loadLiveShellSavedViews(entityType);
      },
      () => fixtureOperatingSystemServices.deleteShellSavedView(viewId, entityType),
    );
  },

  async buildJobDeskRecords(jobs) {
    return withFixtureFallback(
      () => buildLiveJobDeskRecords(jobs),
      () => fixtureOperatingSystemServices.buildJobDeskRecords(jobs),
    );
  },

  async buildJobApprovals(job) {
    return withFixtureFallback(
      () =>
        requestOperatingSystem<ApprovalSummary[]>(`/jobs/${encodeURIComponent(job.id)}/approvals`, {
          job,
        }),
      () => fixtureOperatingSystemServices.buildJobApprovals(job),
    );
  },

  async buildJobPacket(job, options) {
    return withFixtureFallback(
      () =>
        requestOperatingSystem<JobTrackingPacket>(`/jobs/${encodeURIComponent(job.id)}/packet`, {
          job,
          options,
        }),
      () => fixtureOperatingSystemServices.buildJobPacket(job, options),
    );
  },

  async buildJobIntakePreview(form: JobIntakeDraft) {
    return withFixtureFallback(
      () =>
        requestOperatingSystem<{ previewJob: Job; packet: JobTrackingPacket }>(
          '/jobs/intake-preview',
          form,
        ),
      () => fixtureOperatingSystemServices.buildJobIntakePreview(form),
    );
  },

  async buildStudies(inputs: SchedulingStudyInputs): Promise<SchedulingStudyRecord[]> {
    return withFixtureFallback(
      async () => adaptLiveStudies(await requestOperatingSystem<SchedulingStudyRecord[]>('/scheduling/studies', adaptSchedulingInputs(inputs))),
      () => fixtureOperatingSystemServices.buildStudies(inputs),
    );
  },

  async getProgramReleaseCatalog(): Promise<ProgramReleaseCatalog> {
    return withFixtureFallback(
      () => requestOperatingSystem('/program-release/catalog'),
      () => fixtureOperatingSystemServices.getProgramReleaseCatalog(),
    );
  },

  async getProgramReleaseDefaultMachineProfile(input = {}) {
    const userId = input.userId?.trim() || SHELL_RECORDS_USER_ID;
    return withFixtureFallback(
      async () =>
        normalizeProgramReleaseDefaultMachineProfile(
          await requestOperatingSystemGet<LiveProgramReleaseUserMachineProfileReadModel | null>(
            `/program-release/machine-profile/default/${encodeURIComponent(userId)}`,
            input.workspaceId ? { workspaceId: input.workspaceId } : undefined,
          ),
        ),
      () => fixtureOperatingSystemServices.getProgramReleaseDefaultMachineProfile?.(input) ?? null,
    );
  },

  async saveProgramReleaseMachineProfile(input: SaveProgramReleaseMachineProfileInput) {
    const userId = input.userId?.trim() || SHELL_RECORDS_USER_ID;
    const workspaceId = input.workspaceId?.trim() || 'program-release';
    const machineId = input.machineId?.trim();
    if (!machineId) {
      throw new Error('Machine id is required to save a Program Release machine profile.');
    }

    return withFixtureFallback(
      async () => {
        const result = await requestOperatingSystem<LiveProgramReleaseUserMachineProfilePersistResult>(
          '/program-release/machine-profile',
          {
            selection: {
              userId,
              workspaceId,
              machineId,
              displayName: input.displayName?.trim() || undefined,
            },
            source: 'user_override',
            makeDefault: input.makeDefault ?? true,
          },
        );
        return normalizeProgramReleaseDefaultMachineProfile(result.profile ?? null);
      },
      () =>
        fixtureOperatingSystemServices.saveProgramReleaseMachineProfile?.({
          ...input,
          userId,
          workspaceId,
          machineId,
        }) ?? null,
    );
  },

  async getCalculatorDefaultMachineProfile(input = {}) {
    const userId = input.userId?.trim() || SHELL_RECORDS_USER_ID;
    return withFixtureFallback(
      async () =>
        normalizeCalculatorDefaultMachineProfile(
          await requestOperatingSystemGet<LiveCalculatorUserMachineProfileReadModel | null>(
            `/calculator/machine-profile/default/${encodeURIComponent(userId)}`,
            input.workspaceId ? { workspaceId: input.workspaceId } : undefined,
          ),
        ),
      () => fixtureOperatingSystemServices.getCalculatorDefaultMachineProfile?.(input) ?? null,
    );
  },

  async saveCalculatorMachineProfile(input: SaveCalculatorMachineProfileInput) {
    const userId = input.userId?.trim() || SHELL_RECORDS_USER_ID;
    const workspaceId = input.workspaceId?.trim() || 'calculator';
    if (!input.selection?.machine?.id) {
      throw new Error('Machine selection is required to save a calculator machine profile.');
    }

    return withFixtureFallback(
      async () => {
        const result = await requestOperatingSystem<LiveCalculatorUserMachineProfilePersistResult>(
          '/calculator/machine-profile',
          buildCalculatorMachineProfilePayload({
            ...input,
            userId,
            workspaceId,
          }),
        );
        return normalizeCalculatorDefaultMachineProfile(result.profile ?? null);
      },
      () =>
        fixtureOperatingSystemServices.saveCalculatorMachineProfile?.({
          ...input,
          userId,
          workspaceId,
        }) ?? null,
    );
  },

  async getProgramReleaseMachine(machineId) {
    return withFixtureFallback(
      () => requestOperatingSystemGet<ProgramReleaseMachineProfile | null>(`/program-release/machine/${encodeURIComponent(machineId)}`),
      async () => {
        const catalog = await fixtureOperatingSystemServices.getProgramReleaseCatalog();
        return catalog.machines.find((machine) => machine.id === machineId) ?? null;
      },
    );
  },

  async searchProgramReleaseMachines(input = {}) {
    return withFixtureFallback(
      () => requestOperatingSystem<ProgramReleaseMachineSearchResult>('/program-release/machine-search', input),
      () => buildFixtureProgramReleaseMachineSearch(input),
    );
  },

  async buildProgramReleaseWorkspace(input: ProgramReleaseInput): Promise<ProgramReleaseWorkspace> {
    return withFixtureFallback(
      () => requestOperatingSystem('/program-release/workspace', input),
      () => fixtureOperatingSystemServices.buildProgramReleaseWorkspace(input),
    );
  },

  async buildTrackedTasks(packet, department, role): Promise<ShopFloorTrackedTask[]> {
    return requestOperatingSystem('/shop-floor/check-in', {
      action: 'build-tasks',
      trackedJob: packet,
      department,
      role,
    });
  },

  async registerJob(input): Promise<JobRegistrationResult> {
    return requestOperatingSystem('/shop-floor/check-in', {
      action: 'register',
      ...input,
    });
  },

  async checkIntoDepartment(input): Promise<DepartmentCheckInResult> {
    return requestOperatingSystem('/shop-floor/check-in', {
      action: 'check-in',
      ...input,
    });
  },

  async buildRoiSignals(input): Promise<string[]> {
    return requestOperatingSystem('/shop-floor/check-in', {
      action: 'roi-signals',
      ...input,
    });
  },

  async recordTaskEvent(input): Promise<ShopFloorTaskEventResult> {
    return withFixtureFallback(
      () =>
        requestOperatingSystem('/shop-floor/check-in', {
          ...input,
          action: 'task-event' as const,
        }),
      () => fixtureOperatingSystemServices.recordTaskEvent(input),
    );
  },

  async getHotJobs() {
    return withFixtureFallback(
      () => loadLiveHotJobs(),
      () => fixtureOperatingSystemServices.getHotJobs(),
    );
  },

  async setJobHot(input) {
    return withFixtureFallback(
      async () =>
        syncLiveHotJobs(
          await requestOperatingSystem<HotJobRecord[]>('/hot-jobs/set', input),
        ),
      () => fixtureOperatingSystemServices.setJobHot(input),
    );
  },

  async clearJobHot(jobId) {
    return withFixtureFallback(
      async () =>
        syncLiveHotJobs(
          await requestOperatingSystem<HotJobRecord[]>('/hot-jobs/clear', { jobId }),
        ),
      () => fixtureOperatingSystemServices.clearJobHot(jobId),
    );
  },

  subscribeHotJobs(listener) {
    return subscribeLiveHotJobs(listener);
  },

  isJobHot(jobId) {
    return isLiveHotJob(jobId);
  },

  rankJobsForTodo(jobs) {
    return rankLiveJobsForTodo(jobs);
  },

  async getMessagesWorkspace(input) {
    return withFixtureFallback(
      () => loadLiveMessagesWorkspace(input),
      () => fixtureOperatingSystemServices.getMessagesWorkspace(input),
    );
  },

  async getShellCommerceCatalog() {
    return withFixtureFallback(
      async () => {
        const fallback = await fixtureOperatingSystemServices.getShellCommerceCatalog();
        const response = await billingStatus();
        const billing = extractLiveBillingStatus(response.result);

        if (!billing) {
          throw new Error('Live billing status missing required fields');
        }

        return buildLiveCommerceCatalog(fallback, billing);
      },
      () => fixtureOperatingSystemServices.getShellCommerceCatalog(),
    );
  },

  async getPlatformLearningSnapshot() {
    return withFixtureFallback(
      async () => {
        const fallback = await fixtureOperatingSystemServices.getPlatformLearningSnapshot();
        const [progress, recommendations] = await Promise.all([
          loadLearningProgress({}),
          loadLearningRecommendations({ count: 3 }),
        ]);

        return buildLiveLearningSnapshot(progress, recommendations, fallback);
      },
      () => fixtureOperatingSystemServices.getPlatformLearningSnapshot(),
    );
  },

  async getInventoryOperationsWorkspace() {
    return withFixtureFallback(
      async () => {
        const fallback = await fixtureOperatingSystemServices.getInventoryOperationsWorkspace();
        const [documentsResult, purchaseOrdersResult, usageResult, reorderResult] = await Promise.allSettled([
          docList(),
          poList(),
          getToolUsage({}),
          toolReorderAlerts(),
        ]);

        if (
          documentsResult.status === 'rejected'
          && purchaseOrdersResult.status === 'rejected'
          && usageResult.status === 'rejected'
          && reorderResult.status === 'rejected'
        ) {
          throw documentsResult.reason;
        }

        const documents =
          documentsResult.status === 'fulfilled'
            ? extractLiveDocumentRecords(documentsResult.value.result)
            : [];
        const purchaseOrders =
          purchaseOrdersResult.status === 'fulfilled'
            ? extractPurchaseOrders(purchaseOrdersResult.value.result)
            : [];
        const usageRecords =
          usageResult.status === 'fulfilled'
            ? extractToolUsageRecords(usageResult.value.result)
            : [];
        const reorderAlerts =
          reorderResult.status === 'fulfilled'
            ? extractToolReorderAlerts(reorderResult.value.result)
            : [];

        return buildLiveInventoryWorkspace(
          fallback,
          documents,
          purchaseOrders,
          usageRecords,
          reorderAlerts,
        );
      },
      () => fixtureOperatingSystemServices.getInventoryOperationsWorkspace(),
    );
  },

  async getCalculatorToolCribWorkspace(input = {}) {
    const userId = input.userId?.trim() || SHELL_RECORDS_USER_ID;
    return withFixtureFallback(
      () =>
        requestOperatingSystemGet<CalculatorToolCribWorkspace | null>(
          `/calculator/tool-crib/${encodeURIComponent(userId)}`,
          input.workspaceId ? { workspaceId: input.workspaceId } : undefined,
        ),
      () => fixtureOperatingSystemServices.getCalculatorToolCribWorkspace?.(input) ?? null,
    );
  },

  async ingestCalculatorToolCribDocument(input: IngestCalculatorToolCribDocumentInput) {
    const userId = input.userId?.trim() || SHELL_RECORDS_USER_ID;
    const workspaceId = input.workspaceId?.trim() || 'calculator';
    return withFixtureFallback(
      () =>
        requestOperatingSystem<CalculatorToolCribWorkspace>(
          '/calculator/tool-crib/document-intake',
          {
            ...input,
            userId,
            workspaceId,
          },
        ),
      () =>
        fixtureOperatingSystemServices.ingestCalculatorToolCribDocument?.({
          ...input,
          userId,
          workspaceId,
        }) ?? null,
    );
  },

  async scanCalculatorToolCribSources(input: RunCalculatorToolCribLocalScanInput) {
    const userId = input.userId?.trim() || SHELL_RECORDS_USER_ID;
    const workspaceId = input.workspaceId?.trim() || 'calculator';
    return withFixtureFallback(
      () =>
        requestOperatingSystem<CalculatorToolCribWorkspace>(
          '/calculator/tool-crib/local-scan',
          {
            ...input,
            userId,
            workspaceId,
          },
        ),
      () =>
        fixtureOperatingSystemServices.scanCalculatorToolCribSources?.({
          ...input,
          userId,
          workspaceId,
        }) ?? null,
    );
  },
};
