import { expect, test, type Page } from '@playwright/test';
import type { MachineWorkspaceContext } from '../../src/features/machine-workspace/MachineWorkspaceState';
import {
  buildPathPattern,
  expectSignalVisible,
  openSeededSurface,
} from './support/surfaceHarness';

const LATHE_WORKSPACE_CONTEXT: MachineWorkspaceContext = {
  mode: 'lathe',
  machineLabel: 'Haas ST-20Y',
  machineId: 'LATHE-01',
  machineManufacturer: 'Haas',
  machineKinematics: 'Lathe with Y-axis and live tooling',
  controllerId: 'haas',
  controllerLabel: 'Haas NGC',
  materialLabel: '17-4 round bar',
  materialGroup: 'stainless',
  stockDiameterMm: 38,
  stockLengthMm: 120,
  stockThicknessMm: 38,
  targetRaUm: 1.6,
  holderStyle: 'capto-c6',
  programReleasePath: '/program-release?source=lathe-upload&machineId=LATHE-01',
  selectorAuthorityNote:
    'JM Die seeded lathe route stays aligned with the shared release selector contract.',
  programmingAuthority: {
    badge: 'JM Die seeded programming',
    summary: 'JM Die seeded packages loaded for this routed posture.',
    posture: 'fallback-staged',
    note:
      'JM Die seeded packages loaded for this routed turning posture while exact machine release parity finishes converging.',
    environmentLabel: 'Fusion 360',
    licenseLabel: 'Live-tooling seat',
    toolpathLabel: 'Turning Probing',
  },
};

const WIRE_WORKSPACE_CONTEXT: MachineWorkspaceContext = {
  mode: 'wire_edm',
  machineLabel: 'Sodick ALN600G',
  machineId: 'WEDM-01',
  machineManufacturer: 'Sodick',
  machineKinematics: 'Wire EDM',
  controllerId: 'sodick',
  controllerLabel: 'Sodick LN2W',
  materialLabel: 'Tool Steel',
  materialGroup: 'steel',
  stockDiameterMm: 0,
  stockLengthMm: 80,
  stockThicknessMm: 24,
  targetRaUm: 1.1,
  holderStyle: 'fine-wire',
  programReleasePath: '/program-release?source=wire-edm-upload&machineId=WEDM-01',
  selectorAuthorityNote: 'Sodick ALN600G is the canonical JM Die wire EDM registry entry.',
  programmingAuthority: {
    badge: 'JM Die curated programming',
    summary: 'JM Die curated wire packages are active for this routed posture.',
    posture: 'curated-service',
    note:
      'JM Die curated wire packages keep this results view aligned with the routed machine registry while Program Release parity converges.',
    environmentLabel: 'Cimatron',
    licenseLabel: 'Taper + skim',
    toolpathLabel: 'Wire Profile',
  },
};

const LATHE_RESULTS_STATE = {
  fileName: 'shaft.step',
  fileRoute: 'cad',
  workspaceContext: LATHE_WORKSPACE_CONTEXT,
  wizardResult: {
    material: '17-4 stainless',
    materialConfirmed: true,
    qualityTier: 'production',
    batchQuantity: 24,
    machinePreference: 'auto',
  },
};

const WIRE_RESULTS_STATE = {
  fileName: 'profile.dxf',
  fileRoute: 'dxf',
  material: 'D2',
  thickness: 25,
  qualityTier: 'precision',
  machinePreference: 'sodick',
  studioMode: false,
  workspaceContext: WIRE_WORKSPACE_CONTEXT,
  result: {
    program_text: 'G01 X0 Y0\nM30',
    cycle_time_s: 842,
    pass_count: 4,
    safety_score: 94,
    confidence_score: 91,
    controller: 'sodick',
  },
};

async function openLatheResults(page: Page) {
  await openSeededSurface(page, '/lathe/results', LATHE_RESULTS_STATE, 'shop_floor');
  await expect(page).toHaveURL(buildPathPattern('/lathe/results'));
  await expectSignalVisible(page, {
    kind: 'text',
    value: 'Shared routed turning authority',
    exact: false,
  });
  await expect(page.getByText('Haas ST-20Y').first()).toBeVisible();
}

async function openWireResults(page: Page) {
  await openSeededSurface(page, '/wire-edm/results', WIRE_RESULTS_STATE, 'shop_floor');
  await expect(page).toHaveURL(buildPathPattern('/wire-edm/results'));
  await expectSignalVisible(page, {
    kind: 'text',
    value: 'Shared routed wire authority',
    exact: false,
  });
  await expect(page.getByText('Sodick ALN600G').first()).toBeVisible();
}

test.describe('APPW machine workspace continuity sweep', () => {
  test.describe.configure({ mode: 'serial' });

  test('lathe results preserve routed authority across downstream machine utilities', async ({
    page,
  }) => {
    const targets = [
      {
        label: 'Open Setup Sheet Generator',
        urlPattern: buildPathPattern('/setup-sheet'),
        signals: ['Shared routed setup authority', 'Work Offsets'],
      },
      {
        label: 'Open Prove-Out Workflow',
        urlPattern: buildPathPattern('/prove-out'),
        signals: ['Prove-Out Workflow', 'Shared routed prove-out authority'],
      },
      {
        label: 'Open Optimization Report',
        urlPattern: buildPathPattern('/optimize'),
        signals: ['Shared routed optimization authority'],
      },
      {
        label: 'Open Cycle Time Estimator',
        urlPattern: buildPathPattern('/cycle-time'),
        signals: ['Shared routed cycle time authority'],
      },
      {
        label: 'Open Feature Auto-Selection',
        urlPattern: buildPathPattern('/features'),
        signals: ['Feature Auto-Selection', 'Shared routed feature authority'],
      },
      {
        label: 'Open Tool Optimization',
        urlPattern: buildPathPattern('/tool-optimization'),
        signals: ['Shared routed tool-optimization authority', 'Optimize Tool Changes'],
      },
      {
        label: 'Open Post Processor Generator',
        urlPattern: buildPathPattern('/ppg'),
        signals: ['Post Processor Generator', 'Shared routed post authority'],
      },
    ];

    for (const target of targets) {
      await openLatheResults(page);
      await page.getByRole('button', { name: target.label }).click();

      await expect(page).toHaveURL(target.urlPattern);
      await expect(page.getByText('Haas ST-20Y').first()).toBeVisible();

      for (const signal of target.signals) {
        await expect(page.getByText(signal, { exact: false }).first()).toBeVisible();
      }
    }

    await openLatheResults(page);
    await page.getByRole('button', { name: 'Open Print to CNC Release' }).click();

    await expect(page).toHaveURL(/\/print-to-cnc/);
    await expect(page).toHaveURL(/source=lathe-results/);
    await expect(page).toHaveURL(/machineId=st20-turn/);
    await expectSignalVisible(page, {
      kind: 'text',
      value: 'Universal intake to release',
      exact: false,
    });
  });

  test('wire EDM results preserve routed authority and fail-closed downstream posture', async ({
    page,
  }) => {
    const targets = [
      {
        label: 'Open Setup Sheet Generator',
        urlPattern: buildPathPattern('/setup-sheet'),
        signals: ['Shared routed setup authority', 'Work Offsets'],
      },
      {
        label: 'Open Prove-Out Workflow',
        urlPattern: buildPathPattern('/prove-out'),
        signals: ['Prove-Out Workflow', 'Shared routed prove-out authority'],
      },
      {
        label: 'Open Optimization Report',
        urlPattern: buildPathPattern('/optimize'),
        signals: ['Shared routed optimization authority'],
      },
      {
        label: 'Open Cycle Time Estimator',
        urlPattern: buildPathPattern('/cycle-time'),
        signals: ['Shared routed cycle time authority'],
      },
      {
        label: 'Open Feature Auto-Selection',
        urlPattern: buildPathPattern('/features'),
        signals: ['Feature Auto-Selection', 'Shared routed feature authority'],
      },
      {
        label: 'Open Tool Optimization',
        urlPattern: buildPathPattern('/tool-optimization'),
        signals: ['Shared routed tool-optimization authority', 'Unsupported routed posture'],
      },
      {
        label: 'Open Post Processor Generator',
        urlPattern: buildPathPattern('/ppg'),
        signals: [
          'Shared routed post authority',
          'PRISM keeps unsupported routed EDM post flows fail-closed',
        ],
      },
    ];

    for (const target of targets) {
      await openWireResults(page);
      await page.getByRole('button', { name: target.label }).click();

      await expect(page).toHaveURL(target.urlPattern);
      await expect(page.getByText('Sodick ALN600G').first()).toBeVisible();

      for (const signal of target.signals) {
        await expect(page.getByText(signal, { exact: false }).first()).toBeVisible();
      }
    }

    await openWireResults(page);
    await page.getByRole('button', { name: 'Open Print to CNC Release' }).click();

    await expect(page).toHaveURL(/\/print-to-cnc/);
    await expect(page).toHaveURL(/source=wire-edm-results/);
    await expect(page).toHaveURL(/machineId=aln600g-wire/);
    await expectSignalVisible(page, {
      kind: 'text',
      value: 'Universal intake to release',
      exact: false,
    });
  });
});
