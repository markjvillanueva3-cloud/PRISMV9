import {
  loadDashboardSnapshotWithFallback,
  type DashboardSnapshotSource,
  type JobProgress,
  type MachineStatus,
  type ToolLife,
} from './dashboard';

export interface ActiveSafetyJob {
  id: string;
  name: string;
  machine: string;
  material: string;
  operation: string;
  safetyScore: number;
  progress: number;
  toolLifeRemaining: number;
  toolLifeTotal: number;
  warnings: string[];
}

export interface SafetyMonitorSnapshot {
  source: DashboardSnapshotSource;
  note: string;
  jobs: ActiveSafetyJob[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createToolIndex(tools: ToolLife[]): Map<string, ToolLife> {
  const byMachine = new Map<string, ToolLife>();

  for (const tool of tools) {
    const current = byMachine.get(tool.machine);
    if (!current || tool.life_remaining_pct < current.life_remaining_pct) {
      byMachine.set(tool.machine, tool);
    }
  }

  return byMachine;
}

function createMachineIndex(machines: MachineStatus[]): Map<string, MachineStatus> {
  return new Map(machines.map((machine) => [machine.name, machine]));
}

function deriveToolLifeTotal(tool: ToolLife | undefined): number {
  if (!tool) {
    return 0;
  }

  if (tool.life_remaining_pct <= 0) {
    return tool.estimated_minutes;
  }

  return Math.max(
    tool.estimated_minutes,
    Math.round(tool.estimated_minutes / (tool.life_remaining_pct / 100)),
  );
}

function deriveSafetyScore(machine: MachineStatus | undefined, tool: ToolLife | undefined): number {
  let score = 0.92;

  switch (machine?.status) {
    case 'alarm':
      score -= 0.24;
      break;
    case 'offline':
      score -= 0.18;
      break;
    case 'setup':
      score -= 0.08;
      break;
    case 'idle':
      score -= 0.04;
      break;
    default:
      break;
  }

  if (tool) {
    if (tool.life_remaining_pct <= 15) {
      score -= 0.23;
    } else if (tool.life_remaining_pct <= 40) {
      score -= 0.11;
    } else if (tool.life_remaining_pct >= 70) {
      score += 0.02;
    }
  } else {
    score -= 0.05;
  }

  return clamp(Number(score.toFixed(2)), 0.4, 0.99);
}

function deriveWarnings(job: JobProgress, machine: MachineStatus | undefined, tool: ToolLife | undefined, safetyScore: number): string[] {
  const warnings: string[] = [];

  if (machine?.status === 'alarm') {
    warnings.push(`${machine.name} is currently in alarm and needs acknowledgement before restart.`);
  }

  if (tool) {
    if (tool.life_remaining_pct <= 15) {
      warnings.push('Tool life critical — replace soon');
    } else if (tool.life_remaining_pct <= 40) {
      warnings.push('Tool wear approaching replacement threshold');
    }
  } else {
    warnings.push('Tool-life telemetry is not available for this machine yet.');
  }

  if (safetyScore < 0.7) {
    warnings.push('Safety below threshold (0.70)');
  }

  if (job.progress_pct < 25) {
    warnings.push('Operation just started — verify setup, offsets, and workholding before scaling output.');
  }

  return warnings;
}

function mapToSafetyJob(job: JobProgress, machine: MachineStatus | undefined, tool: ToolLife | undefined): ActiveSafetyJob {
  const safetyScore = deriveSafetyScore(machine, tool);

  return {
    id: job.job_number || job.id,
    name: job.part_name,
    machine: job.machine,
    material: job.material ?? 'Material pending from live job desk',
    operation: job.current_op,
    safetyScore,
    progress: job.progress_pct,
    toolLifeRemaining: tool?.estimated_minutes ?? 0,
    toolLifeTotal: deriveToolLifeTotal(tool),
    warnings: deriveWarnings(job, machine, tool, safetyScore),
  };
}

export async function loadSafetyMonitorSnapshotWithFallback(): Promise<SafetyMonitorSnapshot> {
  const dashboard = await loadDashboardSnapshotWithFallback();
  const machineIndex = createMachineIndex(dashboard.machines);
  const toolIndex = createToolIndex(dashboard.tools);

  return {
    source: dashboard.source,
    note: `${dashboard.note} Safety posture is derived from live machine state plus the riskiest tool package on each active job.`,
    jobs: dashboard.jobs.map((job) => mapToSafetyJob(job, machineIndex.get(job.machine), toolIndex.get(job.machine))),
  };
}
