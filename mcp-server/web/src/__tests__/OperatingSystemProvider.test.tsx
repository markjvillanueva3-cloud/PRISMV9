import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';

beforeEach(async () => {
  for (const hotJob of await fixtureOperatingSystemServices.getHotJobs()) {
    await fixtureOperatingSystemServices.clearJobHot(hotJob.jobId);
  }
});

describe('fixtureOperatingSystemServices', () => {
  it('returns shell bootstrap data and role-aware employee bootstraps', async () => {
    const shellBootstrap = await fixtureOperatingSystemServices.getShellBootstrap();
    const employeeBootstrap = await fixtureOperatingSystemServices.getEmployeeShellBootstrap('machinist');

    expect(shellBootstrap.deskCounts.inbox).toBeGreaterThan(0);
    expect(shellBootstrap.pinnedEntities.length).toBeGreaterThan(0);
    expect(employeeBootstrap.displayName).toBe('Avery Stone');
    expect(employeeBootstrap.navGroups.some((group) => group.items.some((item) => item.label === 'Jobs'))).toBe(true);
  });

  it('searches fixture records through the provider seam', async () => {
    const results = await fixtureOperatingSystemServices.search('impeller');
    const focusRecord = fixtureOperatingSystemServices.findRecordByFocus('/jobs', '?focusId=JOB-4821&focusType=job');

    expect(results.some((result) => result.id === 'JOB-4821')).toBe(true);
    expect(focusRecord?.title).toBe('Titanium impeller roughing package');
  });

  it('builds the universal print-to-cnc workspace from provider seams', async () => {
    const catalog = await fixtureOperatingSystemServices.getProgramReleaseCatalog();
    const workspace = await fixtureOperatingSystemServices.buildProgramReleaseWorkspace({
      partClassId: catalog.partClasses[1].id,
      machineId: catalog.machines[1].id,
      toolholderId: catalog.toolholders[0].id,
      toolingPackageId: catalog.toolingPackages[1].id,
      fixtureId: catalog.fixtures[1].id,
      stockId: catalog.stockProfiles[2].id,
      cadSourceId: catalog.cadSources[0].id,
    });

    expect(catalog.cadSources.some((source) => source.id === 'prism-native')).toBe(true);
    expect(workspace.operationPlan.length).toBeGreaterThan(0);
    expect(workspace.setupSheet.length).toBeGreaterThan(0);
    expect(workspace.quoteLines.length).toBeGreaterThan(0);
  });

  it('persists hot jobs and injects them into employee priorities', async () => {
    await fixtureOperatingSystemServices.setJobHot({
      jobId: 'JOB-HOT-77',
      partNumber: 'FIRE-01',
      customer: 'Atlas Medical',
      dueDate: '2026-03-29',
    });

    const hotJobs = await fixtureOperatingSystemServices.getHotJobs();
    const employeeBootstrap = await fixtureOperatingSystemServices.getEmployeeShellBootstrap('machinist');
    const rankedJobs = fixtureOperatingSystemServices.rankJobsForTodo([
      {
        id: 'JOB-001',
        customer: 'Acme',
        part_number: 'EARLY-01',
        description: 'Early job',
        status: 'planned',
        quantity: 10,
        due_date: '2026-03-28',
        priority: 'normal',
        material: '4140',
        estimated_hours: 4,
        actual_hours: 0,
        created_at: '2026-03-27',
      },
      {
        id: 'JOB-HOT-77',
        customer: 'Atlas Medical',
        part_number: 'FIRE-01',
        description: 'Hot job',
        status: 'planned',
        quantity: 4,
        due_date: '2026-03-29',
        priority: 'normal',
        material: '17-4',
        estimated_hours: 3,
        actual_hours: 0,
        created_at: '2026-03-27',
      },
    ]);

    expect(hotJobs[0]?.jobId).toBe('JOB-HOT-77');
    expect(employeeBootstrap.hotJobs[0]?.jobId).toBe('JOB-HOT-77');
    expect(employeeBootstrap.shiftPriorities[0]?.id).toContain('hot-job-priority-JOB-HOT-77');
    expect(rankedJobs[0]?.id).toBe('JOB-HOT-77');
  });

  it('notifies hot-job subscribers when staged management flags change', async () => {
    const listener = vi.fn();
    const unsubscribe = fixtureOperatingSystemServices.subscribeHotJobs(listener);

    await fixtureOperatingSystemServices.setJobHot({
      jobId: 'JOB-HOT-99',
      partNumber: 'FLASH-99',
      customer: 'Atlas Medical',
      dueDate: '2026-03-31',
    });

    expect(listener).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          jobId: 'JOB-HOT-99',
        }),
      ]),
    );

    await fixtureOperatingSystemServices.clearJobHot('JOB-HOT-99');

    expect(listener).toHaveBeenLastCalledWith([]);
    unsubscribe();
  });

  it('returns a platform learning snapshot with local and network intelligence posture', async () => {
    const snapshot = await fixtureOperatingSystemServices.getPlatformLearningSnapshot();

    expect(snapshot.shopProfile.shopLabel).toBe('JM Die Company');
    expect(snapshot.shopProfile.captures.length).toBeGreaterThan(0);
    expect(snapshot.networkProfile.participatingShops).toContain('opt-in shops');
    expect(snapshot.rolloutActions.length).toBeGreaterThan(0);
  });

  it('returns shared shell commerce catalog and sourcing recommendations', async () => {
    const catalog = await fixtureOperatingSystemServices.getShellCommerceCatalog();
    const inventoryWorkspace = await fixtureOperatingSystemServices.getInventoryOperationsWorkspace();
    const programRecommendations = await fixtureOperatingSystemServices.getProgramPurchaseRecommendations({
      partClassId: 'complex-prismatic',
      machineId: 'hmc-63p',
      toolholderId: 'capto-c6',
      toolingPackageId: 'high-feed-carbide',
      fixtureId: 'zero-point',
      stockId: '17-4-oversize',
      cadSourceId: 'fusion-master',
      selection: {
        unitSystem: 'inch',
        tierId: 'standard',
        addOnIds: ['distributor-sourcing'],
        regionId: 'upper-midwest',
      },
    });
    const alarmWorkspace = await fixtureOperatingSystemServices.getAlarmCommerceWorkspace({
      controller: 'fanuc',
      code: '414',
      severity: 'critical',
      selection: {
        unitSystem: 'inch',
        tierId: 'standard',
        addOnIds: ['distributor-sourcing'],
        regionId: 'upper-midwest',
      },
    });

    expect(catalog.tiers.some((tier) => tier.id === 'free')).toBe(true);
    expect(catalog.tiers.some((tier) => tier.id === 'starter')).toBe(true);
    expect(catalog.tiers.some((tier) => tier.id === 'professional')).toBe(true);
    expect(catalog.addOns.some((entry) => entry.id === 'tooling-lifecycle')).toBe(true);
    expect(inventoryWorkspace.documentTemplates.some((entry) => entry.id === 'purchase-order')).toBe(true);
    expect(inventoryWorkspace.usagePulses.length).toBeGreaterThan(0);
    expect(programRecommendations[0]?.distributors.length).toBeGreaterThan(0);
    expect(alarmWorkspace.relatedParts.some((part) => part.label.includes('Coolant'))).toBe(true);
    expect(alarmWorkspace.recommendations.some((entry) => entry.title.includes('coolant rescue'))).toBe(true);
  });
});
