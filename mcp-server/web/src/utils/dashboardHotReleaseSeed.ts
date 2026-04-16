import type { JobProgress } from '../api/dashboard';
import type { HotJobRecord, ProgramReleaseCatalog } from '../features/operating-system/contracts';
import { inferProgramReleasePartClassId } from './programReleasePartClassInference';
import { resolveProgramReleaseMachineRouteSeed } from './programReleaseRouteMachineResolver';
import { buildProgramReleaseRouteExtras, type ProgramReleaseRouteExtras } from './programReleaseSelectorExtras';

export type DashboardHotReleaseSeed = ProgramReleaseRouteExtras;

function normalizeSignature(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function buildDashboardHotReleaseSeed(input: {
  hotJob: HotJobRecord;
  jobs: JobProgress[];
  releaseCatalog: ProgramReleaseCatalog | null;
}): DashboardHotReleaseSeed {
  const matchedJob =
    input.jobs.find((job) => normalizeSignature(job.job_number) === normalizeSignature(input.hotJob.jobId)) ?? null;
  const machineSeed = resolveProgramReleaseMachineRouteSeed(input.releaseCatalog, [matchedJob?.machine]);
  const partClassId = inferProgramReleasePartClassId(
    matchedJob?.part_name,
    input.hotJob.partNumber,
    input.hotJob.note,
  );

  return buildProgramReleaseRouteExtras({
    catalog: input.releaseCatalog,
    routeSelection: {
      machineId: machineSeed?.machineId,
      machineFamilyId: machineSeed?.machineFamilyId,
      machineManufacturer: machineSeed?.machineManufacturer,
      partClassId,
    },
  });
}
