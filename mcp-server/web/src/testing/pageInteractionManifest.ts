import type { ClearanceLevel } from '../contexts/AuthContext';
import type { PageSweepSignal } from './pageSurfaceManifest';

export type PageInteractionManifestEntry = {
  id: string;
  path: string;
  minClearance: ClearanceLevel;
  category: 'purchase-intelligence' | 'workflow-continuity';
  signals: PageSweepSignal[];
  notes: string;
};

export const PAGE_INTERACTION_MANIFEST: PageInteractionManifestEntry[] = [
  {
    id: 'program-release-purchase-lane',
    path: '/print-to-cnc',
    minClearance: 'shop_floor',
    category: 'purchase-intelligence',
    signals: [
      { kind: 'text', value: 'Buy to improve this release' },
      { kind: 'text', value: 'Current sourcing posture', exact: false },
    ],
    notes: 'Program Release should keep purchase recommendations and sourcing posture visible in-browser.',
  },
  {
    id: 'alarm-parts-sourcing',
    path: '/alarms',
    minClearance: 'shop_floor',
    category: 'purchase-intelligence',
    signals: [
      { kind: 'text', value: 'Alarm parts + sourcing' },
      { kind: 'text', value: 'Current sourcing posture' },
    ],
    notes: 'Alarm recovery needs buy posture and distributor context without leaving the desk.',
  },
  {
    id: 'quote-builder-sourcing-handoff',
    path: '/quote-builder',
    minClearance: 'shop_floor',
    category: 'workflow-continuity',
    signals: [
      { kind: 'heading', value: 'Quote Builder' },
      { kind: 'button', value: 'Generate Pricing Packet' },
    ],
    notes: 'Quote Builder should keep sourcing continuity attached before release.',
  },
  {
    id: 'purchasing-recommendation-brief',
    path: '/purchasing?tab=recommend&material=6061-T6',
    minClearance: 'lead',
    category: 'purchase-intelligence',
    signals: [
      { kind: 'text', value: 'Recommendation brief' },
      { kind: 'text', value: 'Workflow continuity' },
    ],
    notes: 'Purchasing should render recommendation and downstream continuity posture together.',
  },
];
