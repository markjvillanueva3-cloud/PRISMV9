export type ProviderSurfaceId =
  | 'shellBootstrap'
  | 'employeeShell'
  | 'jobDesk'
  | 'scheduling'
  | 'programRelease'
  | 'shopFloor'
  | 'deskCounts'
  | 'search'
  | 'emailLogin'
  | 'messages'
  | 'hotJobs'
  | 'learning'
  | 'inventoryOperations'
  | 'commerce';

export type ProviderSurfaceMode = 'live' | 'live-fallback' | 'staged';
export type ProviderRuntimeMode = 'live-provider' | 'fixture-provider';

export interface ProviderSurfaceStatus {
  id: ProviderSurfaceId;
  label: string;
  mode: ProviderSurfaceMode;
  detail: string;
}

export const OPERATING_SYSTEM_SURFACE_STATUS: Record<ProviderSurfaceId, ProviderSurfaceStatus> = {
  shellBootstrap: {
    id: 'shellBootstrap',
    label: 'Shell bootstrap',
    mode: 'live-fallback',
    detail: 'Shell navigation, employee profiles, and desk bootstrap use live routes with fixture fallback.',
  },
  employeeShell: {
    id: 'employeeShell',
    label: 'Employee shell',
    mode: 'live-fallback',
    detail: 'Employee shell counts, pins, recents, and some role claims use live operating-system routes with fallback, but role modules, priorities, and handoff content still rely on staged provider data.',
  },
  jobDesk: {
    id: 'jobDesk',
    label: 'Job desk',
    mode: 'live-fallback',
    detail: 'Job desk packets, intake previews, approval chains, traveler data, and workflow lanes are backed by live routes with fallback.',
  },
  scheduling: {
    id: 'scheduling',
    label: 'Scheduling',
    mode: 'live-fallback',
    detail: 'Scheduling studies are backed by live routes with fixture fallback.',
  },
  programRelease: {
    id: 'programRelease',
    label: 'Print to CNC',
    mode: 'live-fallback',
    detail: 'Program release catalog and workspace calls use live routes with fallback.',
  },
  shopFloor: {
    id: 'shopFloor',
    label: 'Shop floor',
    mode: 'live-fallback',
    detail: 'Shop-floor registration, department check-in, task-event synchronization, task building, and ROI signals use live routes with fallback.',
  },
  deskCounts: {
    id: 'deskCounts',
    label: 'Desk counts',
    mode: 'live-fallback',
    detail: 'Top-line desk counts use live routes with fallback.',
  },
  search: {
    id: 'search',
    label: 'Global search',
    mode: 'live-fallback',
    detail: 'Shell search now uses the live operating-system search route with fixture fallback, while focused-record lookup still uses local route context.',
  },
  emailLogin: {
    id: 'emailLogin',
    label: 'Email login',
    mode: 'live-fallback',
    detail: 'Email-linked sign-in now uses the live employee directory with fixture fallback, while mailbox identity, delivery, and thread state still remain staged.',
  },
  messages: {
    id: 'messages',
    label: 'Messages',
    mode: 'live-fallback',
    detail:
      'Messages workspace hydration and mailbox identity can now use live operating-system routes with fixture fallback, while reply delivery, read-state, and action mutations still remain staged seams.',
  },
  hotJobs: {
    id: 'hotJobs',
    label: 'Hot jobs',
    mode: 'live-fallback',
    detail:
      'Hot-job read, set, and clear flows now use live operating-system routes with fixture fallback, while realtime workflow fanout and deeper authority propagation still remain staged.',
  },
  learning: {
    id: 'learning',
    label: 'Learning fabric',
    mode: 'live-fallback',
    detail: 'Operator learning progress and recommendations are now live-backed with fallback, while cross-shop learning intelligence and propagation still remain staged behind the shared snapshot seam.',
  },
  inventoryOperations: {
    id: 'inventoryOperations',
    label: 'Inventory intake',
    mode: 'live-fallback',
    detail: 'Document-registry signals, purchase-order receiving cues, and tooling telemetry hints now merge live routes with fallback, while department routes, checkout choreography, and insert-edge custody still remain staged.',
  },
  commerce: {
    id: 'commerce',
    label: 'Commerce',
    mode: 'live-fallback',
    detail: 'Billing posture can now hydrate from live billing status with fixture fallback, while tier packaging, add-on catalogs, sourcing, and buy recommendations still remain staged seams.',
  },
};

export const OPERATING_SYSTEM_CONVERGENCE_SUMMARY = {
  title: 'Convergence status',
  detail:
    'Core operating desks, shell search, operator learning, inventory intake cues, email-linked sign-in, billing posture, message workspace hydration, and hot-job route authority now run on live routes or live-backed seams with fallback. Cross-shop learning propagation, deeper inventory custody, realtime hot-job fanout, mailbox delivery/read-state, and most commerce packaging/recommendation logic still rely on staged seams while backend convergence continues.',
};

export function getProviderSurfaceStatus(
  surfaceId: ProviderSurfaceId,
  runtimeMode: ProviderRuntimeMode = 'live-provider',
) {
  const status = OPERATING_SYSTEM_SURFACE_STATUS[surfaceId];
  if (runtimeMode === 'fixture-provider') {
    return {
      ...status,
      mode: 'staged' as const,
      detail: `This surface is currently being served by the injected fixture provider. ${status.detail}`,
    };
  }
  return status;
}
