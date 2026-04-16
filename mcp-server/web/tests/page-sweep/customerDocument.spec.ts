import { expect, test } from '@playwright/test';
import type { ClearanceLevel } from '../../src/contexts/AuthContext';
import type { PageSweepSignal } from '../../src/testing/pageSurfaceManifest';
import { buildPathPattern, expectSignalVisible, openSurface } from './support/surfaceHarness';

type CustomerDocumentSurface = {
  id: string;
  path: string;
  minClearance: ClearanceLevel;
  primarySignal: PageSweepSignal;
  continuitySignals: PageSweepSignal[];
};

const CUSTOMER_DOCUMENT_SURFACES: CustomerDocumentSurface[] = [
  {
    id: 'customers-crm-continuity',
    path: '/customers',
    minClearance: 'admin',
    primarySignal: { kind: 'heading', value: 'Customers & CRM' },
    continuitySignals: [
      { kind: 'text', value: 'CRM workspace', exact: false },
      { kind: 'text', value: 'Customer handoff', exact: false },
      { kind: 'link', value: 'Open Quote Builder' },
      { kind: 'link', value: 'Open Messages follow-up' },
      { kind: 'link', value: 'Open Customer Portal' },
      { kind: 'link', value: 'Open Capture Ops' },
    ],
  },
  {
    id: 'customer-portal-continuity',
    path: '/customer-portal',
    minClearance: 'admin',
    primarySignal: { kind: 'heading', value: 'Customer Portal' },
    continuitySignals: [
      { kind: 'text', value: 'Customer-facing share controls', exact: false },
      { kind: 'text', value: 'Workflow continuity', exact: false },
      { kind: 'link', value: 'Open Customers follow-up' },
      { kind: 'link', value: 'Open Messages follow-up' },
      { kind: 'link', value: 'Open Order Tracking' },
      { kind: 'link', value: 'Open Quality follow-up' },
    ],
  },
  {
    id: 'document-inbox-intake',
    path: '/inbox',
    minClearance: 'shop_floor',
    primarySignal: { kind: 'heading', value: 'Document Inbox' },
    continuitySignals: [
      { kind: 'text', value: 'Drop documents here or click to upload' },
      { kind: 'text', value: 'Blueprints, POs, invoices, certs, programs', exact: false },
      { kind: 'text', value: 'No documents yet. Upload to get started.' },
    ],
  },
  {
    id: 'document-learning-continuity',
    path: '/documents',
    minClearance: 'shop_floor',
    primarySignal: { kind: 'heading', value: 'Document Learning' },
    continuitySignals: [
      { kind: 'text', value: 'Knowledge intake', exact: false },
      { kind: 'text', value: 'Document intake convergence', exact: false },
      { kind: 'link', value: 'Open Inventory intake' },
      { kind: 'link', value: 'Open Messages follow-up' },
      { kind: 'link', value: 'Open Capture Ops' },
    ],
  },
];

test.describe('APPW customer and document continuity sweep', () => {
  test.describe.configure({ mode: 'serial' });

  for (const surface of CUSTOMER_DOCUMENT_SURFACES) {
    test(`${surface.id} keeps downstream follow-up cues visible`, async ({ page }) => {
      await openSurface(page, surface.path, surface.minClearance);

      await expect(page).toHaveURL(buildPathPattern(surface.path));
      await expectSignalVisible(page, surface.primarySignal);

      for (const signal of surface.continuitySignals) {
        await expectSignalVisible(page, signal);
      }

      await expect(page.getByText('Access Restricted')).toHaveCount(0);
      await expect(page.getByText('The requested route could not finish loading.', { exact: false })).toHaveCount(0);
    });
  }
});
