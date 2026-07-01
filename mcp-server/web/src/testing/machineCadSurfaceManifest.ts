import type { ClearanceLevel } from '../contexts/AuthContext';
import type { PageSweepSignal } from './pageSurfaceManifest';

export type MachineCadSurfaceManifestEntry = {
  id: string;
  path: string;
  minClearance: ClearanceLevel;
  primarySignal: PageSweepSignal;
  sourceSignals: PageSweepSignal[];
  capabilitySignals: PageSweepSignal[];
  notes: string;
};

export const MACHINE_CAD_SURFACE_MANIFEST: MachineCadSurfaceManifestEntry[] = [
  {
    id: 'calculator-cad-donor',
    path: '/calculator',
    minClearance: 'shop_floor',
    primarySignal: { kind: 'text', value: 'ULTIMATE MACHINING TOOL', exact: false },
    sourceSignals: [
      { kind: 'text', value: 'PART INTAKE IS THE LANE', exact: false },
      { kind: 'text', value: 'STEP', exact: false },
      { kind: 'text', value: 'PHOTO', exact: false },
    ],
    capabilitySignals: [
      { kind: 'text', value: 'MACHINE FROM CATALOG', exact: false },
      { kind: 'text', value: 'upgrade or outsource posture', exact: false },
    ],
    notes: 'Calculator remains the donor machine/CAD workspace with intake cues, machine routing, and pricing posture visible.',
  },
  {
    id: 'program-release-cad-intake',
    path: '/print-to-cnc',
    minClearance: 'shop_floor',
    primarySignal: { kind: 'text', value: 'Universal intake to release', exact: false },
    sourceSignals: [
      { kind: 'text', value: 'Universal dropbox', exact: false },
      { kind: 'text', value: 'Browse files', exact: false },
      { kind: 'text', value: 'STEP', exact: false },
      { kind: 'text', value: 'Photos / scans', exact: false },
    ],
    capabilitySignals: [
      { kind: 'text', value: 'Design in Kienzle', exact: false },
      { kind: 'text', value: 'Open Shop Floor prove-out', exact: false },
      { kind: 'text', value: 'Sync staged files to live packet', exact: false },
    ],
    notes: 'Program Release should keep universal file intake, CAD-source compare, and prove-out handoffs visible together.',
  },
  {
    id: 'lathe-upload-cad-intake',
    path: '/lathe',
    minClearance: 'shop_floor',
    primarySignal: { kind: 'heading', value: 'Turning Program Generator', exact: false },
    sourceSignals: [
      { kind: 'text', value: 'Upload Your Drawing or Model', exact: false },
      { kind: 'text', value: 'JPG, PNG, STEP, IGES, DXF, PDF', exact: false },
    ],
    capabilitySignals: [
      { kind: 'text', value: 'OPEN PROGRAM RELEASE', exact: false },
      { kind: 'text', value: 'OPEN FULL PRINT TO CNC', exact: false },
      { kind: 'text', value: '2D PROFILE', exact: false },
      { kind: 'text', value: '3D PART', exact: false },
    ],
    notes: 'Lathe upload should expose routed intake, release authority, and part-view toggles inside the shared donor workspace.',
  },
  {
    id: 'wire-edm-upload-cad-intake',
    path: '/wire-edm',
    minClearance: 'shop_floor',
    primarySignal: { kind: 'text', value: 'Wire EDM Programming', exact: false },
    sourceSignals: [
      { kind: 'text', value: 'Upload Drawing or CAD File', exact: false },
      { kind: 'text', value: 'DXF, STEP, IGES, PDF, JPG, PNG', exact: false },
    ],
    capabilitySignals: [
      { kind: 'text', value: 'OPEN PROGRAM RELEASE', exact: false },
      { kind: 'text', value: 'OPEN FULL PRINT TO CNC', exact: false },
      { kind: 'text', value: '2D PROFILE', exact: false },
      { kind: 'text', value: '3D PART', exact: false },
    ],
    notes: 'Wire EDM should keep contour-intake formats, routed release launch, and preview controls visible on the page.',
  },
  {
    id: 'viewer-scene-review',
    path: '/viewer',
    minClearance: 'shop_floor',
    primarySignal: { kind: 'heading', value: '3D Viewer', exact: false },
    sourceSignals: [
      { kind: 'text', value: 'SCENE PACKAGE', exact: false },
      { kind: 'text', value: 'Demo Pocket Milling', exact: false },
    ],
    capabilitySignals: [
      { kind: 'text', value: 'Open 3D workspace', exact: false },
      { kind: 'text', value: 'Screenshot', exact: false },
      { kind: 'text', value: 'Export JSON', exact: false },
      { kind: 'text', value: 'DEFERRED 3D STAGE', exact: false },
    ],
    notes: 'Viewer should surface scene-review metadata, export controls, and deferred 3D activation before the heavy canvas mounts.',
  },
];
