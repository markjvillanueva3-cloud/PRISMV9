import { milestoneGetSyncEvents, milestoneSyncMutation } from '../../api/client';
import type {
  MilestoneSurface,
  MilestoneSyncEvent,
  MilestoneSyncResult,
  MilestoneSyncTrigger,
} from '../../api/types';

export type { MilestoneSurface, MilestoneSyncEvent };

export interface SyncMilestoneMutationInput {
  jobId: string;
  source: MilestoneSurface;
  trigger: MilestoneSyncTrigger;
  status?: string;
  operation?: string;
  department?: string;
  machineId?: string;
  action?: string;
  stepNumber?: number;
  hours?: number;
  quantityCompleted?: number;
  scrapQty?: number;
  note?: string;
}

export async function syncMilestoneMutation(input: SyncMilestoneMutationInput): Promise<{
  event: MilestoneSyncEvent;
  recentEvents: MilestoneSyncEvent[];
  refreshTimeline: boolean;
}> {
  const result: MilestoneSyncResult = await milestoneSyncMutation(input.jobId, {
    source: input.source,
    trigger: input.trigger,
    status: input.status,
    operation: input.operation,
    department: input.department,
    machine_id: input.machineId,
    action: input.action,
    step_number: input.stepNumber,
    hours: input.hours,
    quantity_completed: input.quantityCompleted,
    scrap_qty: input.scrapQty,
    note: input.note,
  });

  return {
    event: result.event,
    recentEvents: result.recent_events,
    refreshTimeline: result.refresh_timeline,
  };
}

export async function getMilestoneSyncEvents(jobId: string, limit = 6) {
  return milestoneGetSyncEvents(jobId, limit);
}

export async function resolveCanonicalMilestoneWindow(
  jobId: string,
  prismSync?: Pick<MilestoneSyncResult, 'recent_events' | 'refresh_timeline'> | null,
) {
  if (!jobId.trim()) {
    return null;
  }

  if (prismSync) {
    return {
      recentEvents: prismSync.recent_events,
      refreshTimeline: prismSync.refresh_timeline,
    };
  }

  const recentEvents = await milestoneGetSyncEvents(jobId, 6);
  return {
    recentEvents,
    refreshTimeline: true,
  };
}

function humanize(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .trim();
}

export function describeMilestoneSyncEvent(event: MilestoneSyncEvent) {
  const trigger = humanize(event.trigger);
  const outcome = humanize(event.outcome);
  const target = event.target_milestone ? ` to ${humanize(event.target_milestone)}` : '';
  return `${trigger} -> ${outcome}${target}: ${event.summary}`;
}

export function buildMilestoneSyncPromptMemory(events: MilestoneSyncEvent[], limit = 3) {
  return events.slice(0, Math.max(limit, 1)).map((event) => `${describeMilestoneSyncEvent(event)} CLI ${event.cli_command}.`);
}
