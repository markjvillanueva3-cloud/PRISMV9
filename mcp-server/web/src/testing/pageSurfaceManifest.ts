import type { ClearanceLevel } from '../contexts/AuthContext';

export type PageSweepSignal = {
  kind: 'heading' | 'text' | 'link' | 'button';
  value: string;
  exact?: boolean;
};

export type PageSurfaceManifestEntry = {
  id: string;
  path: string;
  minClearance: ClearanceLevel;
  surfaceFamily: 'workspace' | 'machine' | 'commerce';
  responsive: boolean;
  primarySignal: PageSweepSignal;
  notes: string;
};

export const PAGE_SURFACE_MANIFEST: PageSurfaceManifestEntry[] = [
  {
    id: 'dashboard',
    path: '/dashboard',
    minClearance: 'shop_floor',
    surfaceFamily: 'workspace',
    responsive: true,
    primarySignal: { kind: 'text', value: 'Shop floor live', exact: false },
    notes: 'Canonical command-center surface and APPW release anchor.',
  },
  {
    id: 'calculator',
    path: '/calculator',
    minClearance: 'shop_floor',
    surfaceFamily: 'machine',
    responsive: true,
    primarySignal: { kind: 'text', value: 'ULTIMATE MACHINING TOOL', exact: false },
    notes: 'Calculator donor surface for routed machine-workspace and purchase-intelligence posture.',
  },
  {
    id: 'print-to-cnc',
    path: '/print-to-cnc',
    minClearance: 'shop_floor',
    surfaceFamily: 'machine',
    responsive: true,
    primarySignal: { kind: 'text', value: 'Universal intake to release', exact: false },
    notes: 'Universal intake and release desk that now owns canonical route truth.',
  },
  {
    id: 'messages',
    path: '/messages',
    minClearance: 'shop_floor',
    surfaceFamily: 'workspace',
    responsive: true,
    primarySignal: { kind: 'text', value: 'Action workspace', exact: false },
    notes: 'Workflow continuity desk for upstream/downstream APPW release follow-up.',
  },
  {
    id: 'jobs',
    path: '/jobs',
    minClearance: 'shop_floor',
    surfaceFamily: 'workspace',
    responsive: true,
    primarySignal: { kind: 'heading', value: 'Jobs', exact: false },
    notes: 'Dispatch and traveler continuity surface tied into release packets.',
  },
  {
    id: 'ppg',
    path: '/ppg',
    minClearance: 'shop_floor',
    surfaceFamily: 'machine',
    responsive: true,
    primarySignal: { kind: 'text', value: 'Post Processor Generator', exact: false },
    notes: 'Programming handoff desk for routed machine authority and print-to-CNC return flows.',
  },
  {
    id: 'scheduling',
    path: '/scheduling',
    minClearance: 'lead',
    surfaceFamily: 'workspace',
    responsive: true,
    primarySignal: { kind: 'heading', value: 'Scheduling', exact: false },
    notes: 'Planner desk with hot release handoffs and canonical machine authority.',
  },
  {
    id: 'machine-rates',
    path: '/machine-rates?source=quote-builder&focusType=packet&focusId=PKT-200&focusPacketId=PKT-200&machineId=VF2',
    minClearance: 'lead',
    surfaceFamily: 'commerce',
    responsive: true,
    primarySignal: { kind: 'heading', value: 'Machine Rates', exact: false },
    notes: 'Commercial surface now handing canonical machine truth into Print to CNC.',
  },
  {
    id: 'purchasing',
    path: '/purchasing?tab=recommend&material=6061-T6',
    minClearance: 'lead',
    surfaceFamily: 'commerce',
    responsive: false,
    primarySignal: { kind: 'heading', value: 'Purchasing', exact: false },
    notes: 'Sourcing desk for APPW buying posture and workflow continuity.',
  },
  {
    id: 'alarms',
    path: '/alarms',
    minClearance: 'shop_floor',
    surfaceFamily: 'commerce',
    responsive: false,
    primarySignal: { kind: 'heading', value: 'Alarm Decoder', exact: false },
    notes: 'Troubleshooting desk with parts and sourcing recommendations.',
  },
  {
    id: 'lathe-upload',
    path: '/lathe',
    minClearance: 'shop_floor',
    surfaceFamily: 'machine',
    responsive: false,
    primarySignal: { kind: 'text', value: 'Turning Program Generator', exact: false },
    notes: 'Routed turning upload surface feeding the shared machine-workspace posture.',
  },
  {
    id: 'wire-edm-upload',
    path: '/wire-edm',
    minClearance: 'shop_floor',
    surfaceFamily: 'machine',
    responsive: false,
    primarySignal: { kind: 'text', value: 'Wire EDM Programming', exact: false },
    notes: 'Wire EDM upload surface for APPW machine CAD and programming coverage.',
  },
];

export const RESPONSIVE_PAGE_SURFACE_MANIFEST = PAGE_SURFACE_MANIFEST.filter((entry) => entry.responsive);
