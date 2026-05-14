import { describe, expect, it } from 'vitest';
import type { JobProgress } from '../api/dashboard';
import { PROGRAM_RELEASE_CATALOG } from '../features/operating-system/programReleaseFixtures';
import type { HotJobRecord } from '../features/operating-system/contracts';
import { buildDashboardHotReleaseSeed } from '../utils/dashboardHotReleaseSeed';

describe('buildDashboardHotReleaseSeed', () => {
  it('resolves canonical machine authority from a matched dashboard job', () => {
    const hotJob: HotJobRecord = {
      jobId: 'JOB-2401',
      partNumber: 'Hydraulic Manifold',
      customer: 'Helios Motion',
      dueDate: '2026-04-01',
      note: 'Move this packet ahead of the normal queue while management closes the delivery gap.',
      setBy: 'Operations director',
      setAt: '2026-03-29T10:00:00.000Z',
    };
    const jobs: JobProgress[] = [
      {
        id: 'j1',
        job_number: 'JOB-2401',
        part_name: 'Hydraulic Manifold',
        machine: 'Haas VF-2',
        progress_pct: 72,
        completed: 36,
        total: 50,
        eta_minutes: 85,
        current_op: 'Op 30 - Pocket',
      },
    ];

    expect(
      buildDashboardHotReleaseSeed({
        hotJob,
        jobs,
        releaseCatalog: PROGRAM_RELEASE_CATALOG,
      }),
    ).toMatchObject({
      machineId: 'vf2-3x',
      machineFamilyId: '3-axis',
      machineManufacturer: 'haas',
      partClassId: 'hydraulic-manifold',
      toolholderId: 'shrinkfit-short',
      toolingPackageId: 'alu-velocity',
      fixtureId: 'modular-plate',
      stockId: '6061-plate',
      cadSourceId: 'fusion-master',
    });
  });

  it('falls back to part-class inference when no active dashboard job matches', () => {
    const hotJob: HotJobRecord = {
      jobId: 'JOB-HOT-440',
      partNumber: 'Valve Body Rev C',
      customer: 'Helios Motion',
      dueDate: '2026-04-01',
      note: 'Move this packet ahead of the normal queue while management closes the delivery gap.',
      setBy: 'Operations director',
      setAt: '2026-03-29T10:00:00.000Z',
    };

    expect(
      buildDashboardHotReleaseSeed({
        hotJob,
        jobs: [],
        releaseCatalog: PROGRAM_RELEASE_CATALOG,
      }),
    ).toMatchObject({
      partClassId: 'prismatic-bracket',
    });
  });
});
