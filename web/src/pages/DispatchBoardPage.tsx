import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  getDispatchBoard,
  getDispatchQueue,
  queueDispatchJob,
  removeDispatchEntry,
  reorderDispatchQueue,
  runDispatchWhatIf,
  type DispatchBoardRecord,
  type DispatchQueueEntryRecord,
  type DispatchWhatIfResult,
  type MachineQueueRecord,
} from '../api/traveler';
import { ErrorState, LoadingState } from '../components/LoadingState';
import {
  buildMilestoneSyncPromptMemory,
  describeMilestoneSyncEvent,
  getMilestoneSyncEvents,
  syncMilestoneMutation,
  type MilestoneSyncEvent,
} from '../components/erp/milestoneIntelligence';
import { SurfaceStatusNotice } from '../components/operating-system/SurfaceStatusNotice';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  Select,
  StatusPill,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';
import type { HotJobRecord, PrismPromptAnalysis } from '../features/operating-system/contracts';
import { useOperatingSystem } from '../features/operating-system/OperatingSystemProvider';

function formatQueueTime(value?: string) {
  if (!value) {
    return 'TBD';
  }
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function queueTone(status: DispatchQueueEntryRecord['status']): 'slate' | 'emerald' | 'amber' | 'rose' | 'sky' {
  if (status === 'active') return 'emerald';
  if (status === 'queued') return 'amber';
  if (status === 'complete') return 'sky';
  return 'rose';
}

function buildDispatchPrompt(
  board: DispatchBoardRecord,
  queue: MachineQueueRecord | null,
  hotJobs: HotJobRecord[],
  whatIfResult: DispatchWhatIfResult | null,
  syncEvents: MilestoneSyncEvent[],
) {
  const queuedLabels = queue?.entries.filter((entry) => entry.status === 'queued').map((entry) => entry.job_id).join(', ') || 'none';
  const hotJobLabels = hotJobs.map((job) => job.jobId).slice(0, 4).join(', ') || 'none';
  return [
    'Analyze this dispatch queue task dependency and cost risk posture.',
    `The dispatch board has ${board.machines.length} machines and ${board.total_queued_jobs} queued jobs.`,
    queue
      ? `Selected machine ${queue.machine_id} has ${queue.total_queued} queued jobs. Active job: ${queue.active_job?.job_id ?? 'none'}.`
      : 'No machine is currently selected.',
    `Queued jobs on the selected machine: ${queuedLabels}.`,
    hotJobs.length > 0
      ? `${hotJobs.length} hot jobs are active and should influence dispatch priority: ${hotJobLabels}.`
      : 'No hot-job escalation is currently active.',
    whatIfResult
      ? `Latest what-if insert would delay ${whatIfResult.impact.jobs_delayed} jobs with ${whatIfResult.impact.max_delay_min.toFixed(1)} maximum minutes of delay and ${whatIfResult.impact.total_delay_min.toFixed(1)} total minutes shifted.`
      : 'No what-if simulation has been run yet.',
    ...(syncEvents.length > 0
      ? [`Recent canonical PRISM sync memory: ${buildMilestoneSyncPromptMemory(syncEvents).join(' ')}`]
      : []),
  ].join(' ');
}

function SortableQueueCard({
  entry,
  busy,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  entry: DispatchQueueEntryRecord;
  busy: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 ${isDragging ? 'opacity-70' : ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-50">{entry.job_id}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusPill label={`Priority ${entry.priority}`} tone="amber" />
            {entry.routing_step_id ? <StatusPill label={entry.routing_step_id} tone="violet" /> : null}
          </div>
        </div>
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="min-h-[44px] rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200"
        >
          Drag
        </button>
      </div>

      <div className="mt-3 text-sm leading-6 text-slate-300">
        ETA {formatQueueTime(entry.estimated_start)} → {formatQueueTime(entry.estimated_complete)}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={!canMoveUp || busy}
          className="min-h-[44px] rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/16 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:text-slate-500"
        >
          Move up
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={!canMoveDown || busy}
          className="min-h-[44px] rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/16 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:text-slate-500"
        >
          Move down
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          className="min-h-[44px] rounded-2xl border border-rose-300/16 bg-rose-300/[0.08] px-3 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/[0.14] disabled:cursor-not-allowed disabled:text-rose-200/50"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export function DispatchBoardPage() {
  const location = useLocation();
  const services = useOperatingSystem();
  const routeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const seededMachineId = routeParams.get('machine') ?? '';
  const [board, setBoard] = useState<DispatchBoardRecord | null>(null);
  const [selectedMachineId, setSelectedMachineId] = useState(seededMachineId);
  const [selectedQueue, setSelectedQueue] = useState<MachineQueueRecord | null>(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [queueMachineId, setQueueMachineId] = useState(seededMachineId);
  const [queueJobId, setQueueJobId] = useState('');
  const [queueDuration, setQueueDuration] = useState('45');
  const [queuedBy, setQueuedBy] = useState('lead');
  const [whatIfJobId, setWhatIfJobId] = useState('');
  const [whatIfDuration, setWhatIfDuration] = useState('60');
  const [whatIfPosition, setWhatIfPosition] = useState('0');
  const [whatIfResult, setWhatIfResult] = useState<DispatchWhatIfResult | null>(null);
  const [hotJobs, setHotJobs] = useState<HotJobRecord[]>([]);
  const [insight, setInsight] = useState<PrismPromptAnalysis | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [syncJobId, setSyncJobId] = useState('');
  const [syncEvents, setSyncEvents] = useState<MilestoneSyncEvent[]>([]);
  const [isDetailPending, setDetailPending] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const refreshBoard = useCallback(async (preferredMachineId?: string) => {
    setBoardLoading(true);
    setBoardError(null);

    try {
      const nextBoard = await getDispatchBoard();
      startTransition(() => {
        setBoard(nextBoard);
        setSelectedMachineId((current) => {
          if (preferredMachineId && nextBoard.machines.some((machine) => machine.machine_id === preferredMachineId)) {
            return preferredMachineId;
          }
          if (current && nextBoard.machines.some((machine) => machine.machine_id === current)) {
            return current;
          }
          return nextBoard.machines[0]?.machine_id ?? '';
        });
        setQueueMachineId((current) => {
          if (current && nextBoard.machines.some((machine) => machine.machine_id === current)) {
            return current;
          }
          return preferredMachineId || nextBoard.machines[0]?.machine_id || '';
        });
      });
    } catch (caught) {
      setBoardError(caught instanceof Error ? caught.message : 'Dispatch board could not load right now.');
      startTransition(() => {
        setBoard(null);
        setSelectedMachineId('');
      });
    } finally {
      setBoardLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshBoard(seededMachineId || undefined);
  }, [refreshBoard, seededMachineId]);

  useEffect(() => {
    let active = true;

    services.getHotJobs().then(setHotJobs).catch(() => setHotJobs([]));
    const unsubscribe = services.subscribeHotJobs((records) => {
      if (active) {
        setHotJobs(records);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [services]);

  useEffect(() => {
    if (!selectedMachineId) {
      setSelectedQueue(null);
      return;
    }

    let active = true;
    setDetailPending(true);

    getDispatchQueue(selectedMachineId)
      .then((queue) => {
        if (active) {
          startTransition(() => {
            setSelectedQueue(queue);
          });
        }
      })
      .catch((caught) => {
        if (active) {
          setBoardError(caught instanceof Error ? caught.message : 'Dispatch queue could not load.');
        }
      })
      .finally(() => {
        if (active) {
          setDetailPending(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedMachineId]);

  const focusedSyncJobId = syncJobId
    || selectedQueue?.active_job?.job_id
    || selectedQueue?.entries.find((entry) => entry.status === 'queued')?.job_id
    || '';

  useEffect(() => {
    if (!focusedSyncJobId) {
      setSyncEvents([]);
      return;
    }

    let active = true;

    getMilestoneSyncEvents(focusedSyncJobId, 6)
      .then((events) => {
        if (active) {
          startTransition(() => {
            setSyncEvents(events);
          });
        }
      })
      .catch(() => {
        if (active) {
          setSyncEvents([]);
        }
      });

    return () => {
      active = false;
    };
  }, [focusedSyncJobId]);

  const dispatchPrompt = useMemo(
    () => (board ? buildDispatchPrompt(board, selectedQueue, hotJobs, whatIfResult, syncEvents) : ''),
    [board, hotJobs, selectedQueue, syncEvents, whatIfResult],
  );
  const deferredDispatchPrompt = useDeferredValue(dispatchPrompt);

  useEffect(() => {
    if (!deferredDispatchPrompt) {
      setInsight(null);
      return;
    }

    let active = true;
    setInsightLoading(true);

    services
      .analyzePrismPrompt(deferredDispatchPrompt)
      .then((result) => {
        if (active) {
          startTransition(() => {
            setInsight(result);
          });
        }
      })
      .catch(() => {
        if (active) {
          setInsight(null);
        }
      })
      .finally(() => {
        if (active) {
          setInsightLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [deferredDispatchPrompt, services]);

  async function handleQueueJob() {
    if (!queueMachineId || !queueJobId.trim()) {
      setBoardError('Choose a machine and job before dispatching.');
      return;
    }

    setActionLoading('queue');
    setBoardError(null);
    setActionMessage(null);

    try {
      const queuedEntry = await queueDispatchJob({
        machine_id: queueMachineId,
        job_id: queueJobId.trim(),
        estimated_duration_min: Math.max(parseInt(queueDuration, 10) || 0, 1),
        queued_by: queuedBy.trim() || undefined,
      });
      if (queuedEntry.prism_sync) {
        setSyncJobId(queueJobId.trim());
        setSyncEvents(queuedEntry.prism_sync.recent_events);
      } else {
        const milestoneSync = await syncMilestoneMutation({
          jobId: queueJobId.trim(),
          source: 'dispatch-board',
          trigger: 'dispatch-job-queued',
          machineId: queueMachineId,
          note: `${queueJobId.trim()} queued by ${queuedBy.trim() || 'lead'} for ${Math.max(parseInt(queueDuration, 10) || 0, 1)} minutes.`,
        }).catch(() => null);
        if (milestoneSync) {
          setSyncJobId(queueJobId.trim());
          setSyncEvents(milestoneSync.recentEvents);
        }
      }
      setActionMessage(`${queueJobId.trim()} queued onto ${queueMachineId}.`);
      setQueueJobId('');
      await refreshBoard(queueMachineId);
    } catch (caught) {
      setBoardError(caught instanceof Error ? caught.message : 'Dispatch queue action failed.');
    } finally {
      setActionLoading(null);
    }
  }

  async function persistOrder(machineId: string, order: string[], affectedJobId?: string) {
    setActionLoading(`reorder:${machineId}`);
    setBoardError(null);
    setActionMessage(null);

    try {
      const queue = await reorderDispatchQueue({
        machine_id: machineId,
        order,
        reordered_by: queuedBy.trim() || undefined,
      });
      startTransition(() => {
        setSelectedQueue(queue.machine_id === selectedMachineId ? queue : selectedQueue);
      });
      if (affectedJobId) {
        if (queue.prism_sync) {
          setSyncJobId(affectedJobId);
          setSyncEvents(queue.prism_sync.recent_events);
        } else {
          const milestoneSync = await syncMilestoneMutation({
            jobId: affectedJobId,
            source: 'dispatch-board',
            trigger: 'dispatch-queue-reordered',
            machineId,
            note: `Dispatch order updated for ${machineId}.`,
          }).catch(() => null);
          if (milestoneSync) {
            setSyncJobId(affectedJobId);
            setSyncEvents(milestoneSync.recentEvents);
          }
        }
      }
      setActionMessage(`Dispatch order updated for ${machineId}.`);
      await refreshBoard(machineId);
    } catch (caught) {
      setBoardError(caught instanceof Error ? caught.message : 'Dispatch reorder failed.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMove(machineId: string, entryId: string, direction: -1 | 1) {
    const machine = board?.machines.find((item) => item.machine_id === machineId);
    if (!machine) {
      return;
    }

    const queued = machine.entries.filter((entry) => entry.status === 'queued');
    const currentIndex = queued.findIndex((entry) => entry.id === entryId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= queued.length) {
      return;
    }

    const nextOrder = queued.map((entry) => entry.id);
    const [moved] = nextOrder.splice(currentIndex, 1);
    nextOrder.splice(nextIndex, 0, moved);
    await persistOrder(machineId, nextOrder, queued[currentIndex]?.job_id);
  }

  async function handleRemove(entryId: string, machineId: string) {
    setActionLoading(`remove:${entryId}`);
    setBoardError(null);
    setActionMessage(null);

    try {
      const removedJobId = board?.machines
        .flatMap((machine) => machine.entries)
        .find((entry) => entry.id === entryId)?.job_id;
      const removedEntry = await removeDispatchEntry({ entry_id: entryId, removed_by: queuedBy.trim() || 'lead' });
      if (removedJobId) {
        if (removedEntry.prism_sync) {
          setSyncJobId(removedJobId);
          setSyncEvents(removedEntry.prism_sync.recent_events);
        } else {
          const milestoneSync = await syncMilestoneMutation({
            jobId: removedJobId,
            source: 'dispatch-board',
            trigger: 'dispatch-entry-removed',
            machineId,
            note: `Queue entry removed from ${machineId}.`,
          }).catch(() => null);
          if (milestoneSync) {
            setSyncJobId(removedJobId);
            setSyncEvents(milestoneSync.recentEvents);
          }
        }
      }
      setActionMessage(`Queue entry removed from ${machineId}.`);
      await refreshBoard(machineId);
    } catch (caught) {
      setBoardError(caught instanceof Error ? caught.message : 'Dispatch remove failed.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleWhatIf() {
    if (!selectedMachineId || !whatIfJobId.trim()) {
      setBoardError('Choose a machine and hypothetical job before running what-if.');
      return;
    }

    setActionLoading('what-if');
    setBoardError(null);
    setActionMessage(null);

    try {
      const result = await runDispatchWhatIf({
        machine_id: selectedMachineId,
        insert_position: Math.max(parseInt(whatIfPosition, 10) || 0, 0),
        job_id: whatIfJobId.trim(),
        estimated_duration_min: Math.max(parseInt(whatIfDuration, 10) || 0, 1),
      });
      if (result.prism_sync) {
        setSyncJobId(whatIfJobId.trim());
        setSyncEvents(result.prism_sync.recent_events);
      } else {
        const milestoneSync = await syncMilestoneMutation({
          jobId: whatIfJobId.trim(),
          source: 'dispatch-board',
          trigger: 'dispatch-what-if-ran',
          machineId: selectedMachineId,
          note: `What-if projected ${result.impact.jobs_delayed} delayed jobs, ${result.impact.max_delay_min.toFixed(1)} max minutes, and ${result.impact.total_delay_min.toFixed(1)} total minutes shifted.`,
        }).catch(() => null);
        if (milestoneSync) {
          setSyncJobId(whatIfJobId.trim());
          setSyncEvents(milestoneSync.recentEvents);
        }
      }
      setWhatIfResult(result);
      setActionMessage(`What-if simulation updated for ${selectedMachineId}.`);
    } catch (caught) {
      setBoardError(caught instanceof Error ? caught.message : 'Dispatch what-if simulation failed.');
    } finally {
      setActionLoading(null);
    }
  }

  function handleDragEnd(machineId: string) {
    return (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) {
        return;
      }

      const machine = board?.machines.find((item) => item.machine_id === machineId);
      if (!machine) {
        return;
      }

      const queued = machine.entries.filter((entry) => entry.status === 'queued');
      const ids = queued.map((entry) => entry.id);
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));

      if (oldIndex < 0 || newIndex < 0) {
        return;
      }

      const nextOrder = arrayMove(ids, oldIndex, newIndex);
      void persistOrder(machineId, nextOrder, queued[oldIndex]?.job_id);
    };
  }

  function renderMachineQueue(machine: MachineQueueRecord) {
    const queued = machine.entries.filter((entry) => entry.status === 'queued');

    return (
      <div key={machine.machine_id} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-50">{machine.machine_name || machine.machine_id}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusPill label={`${machine.total_queued} queued`} tone="amber" />
              <StatusPill label={`${machine.total_est_min.toFixed(1)} min load`} tone="sky" />
            </div>
          </div>
          {machine.active_job ? <StatusPill label={`Active ${machine.active_job.job_id}`} tone="emerald" /> : <StatusPill label="No active job" tone="slate" />}
        </div>

        {machine.active_job ? (
          <div className="mt-4 rounded-[20px] border border-emerald-300/16 bg-emerald-300/[0.08] px-4 py-4">
            <div className="text-sm font-semibold text-slate-50">{machine.active_job.job_id}</div>
            <div className="mt-2 text-sm leading-6 text-slate-200">
              Active now. Actual start {formatQueueTime(machine.active_job.actual_start)}.
            </div>
          </div>
        ) : null}

        {queued.length > 0 ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd(machine.machine_id)}>
            <SortableContext items={queued.map((entry) => entry.id)} strategy={verticalListSortingStrategy}>
              <div className="mt-4 space-y-3">
                {queued.map((entry, index) => (
                  <SortableQueueCard
                    key={entry.id}
                    entry={entry}
                    busy={!!actionLoading}
                    canMoveUp={index > 0}
                    canMoveDown={index < queued.length - 1}
                    onMoveUp={() => void handleMove(machine.machine_id, entry.id, -1)}
                    onMoveDown={() => void handleMove(machine.machine_id, entry.id, 1)}
                    onRemove={() => void handleRemove(entry.id, machine.machine_id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="mt-4 rounded-[20px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
            No queued jobs — dispatch from Jobs page or use the quick dispatch form.
          </div>
        )}
      </div>
    );
  }

  const selectedMachine = board?.machines.find((machine) => machine.machine_id === selectedMachineId) ?? null;
  const machineCountValue = board ? String(board.machines.length) : '0';
  const queuedCountValue = board ? String(board.total_queued_jobs) : '0';
  const selectedLoadValue = selectedQueue ? `${selectedQueue.total_est_min.toFixed(1)} min` : 'Pending';

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Dispatch planning"
        title="Dispatch Board"
        description="Run machine queues from a planning board that supports drag reordering on desktop, arrow fallbacks on touch, what-if simulation, and embedded PRISM reasoning for the next dispatch move."
        metrics={
          <>
            <SummaryTile label="Machines live" value={machineCountValue} hint="Dispatch columns currently represented on the board." />
            <SummaryTile label="Queued jobs" value={queuedCountValue} hint="Current queued load across all machine lanes." accent="from-amber-300/22 via-amber-200/10 to-transparent" />
            <SummaryTile label="Selected load" value={selectedLoadValue} hint="Estimated minutes still queued on the selected machine." accent="from-cyan-400/22 via-cyan-300/10 to-transparent" />
          </>
        }
        aside={
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Breadcrumb</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                Scheduling <span className="text-slate-500">-&gt;</span> Dispatch
              </div>
            </div>
            <Field label="Machine">
              <Select value={queueMachineId} onChange={(event) => setQueueMachineId(event.target.value)}>
                <option value="">Select machine</option>
                {board?.machines.map((machine) => (
                  <option key={machine.machine_id} value={machine.machine_id}>
                    {machine.machine_name || machine.machine_id}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Job ID">
              <Input value={queueJobId} onChange={(event) => setQueueJobId(event.target.value)} placeholder="JOB-24018" />
            </Field>
            <Field label="Duration (min)">
              <Input value={queueDuration} onChange={(event) => setQueueDuration(event.target.value)} type="number" min="1" />
            </Field>
            <Field label="Queued by">
              <Input value={queuedBy} onChange={(event) => setQueuedBy(event.target.value)} placeholder="lead" />
            </Field>
            <ActionButton onClick={() => void handleQueueJob()} disabled={!!actionLoading} tone="cyan" className="min-h-[72px] w-full">
              Queue job
            </ActionButton>
          </div>
        }
      />

      {boardLoading ? <LoadingState label="Loading dispatch board..." /> : null}
      {boardError ? <ErrorState message={boardError} onRetry={() => void refreshBoard(selectedMachineId || undefined)} /> : null}
      {actionMessage ? (
        <div className="rounded-[22px] border border-emerald-300/18 bg-emerald-300/[0.08] px-4 py-4 text-sm leading-6 text-emerald-50">
          {actionMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="space-y-6">
          <PanelCard title="Dispatch board" subtitle="Desktop keeps all machine lanes visible while touch devices can stay focused on one machine at a time.">
            <div className="space-y-4 lg:hidden">
              {board?.machines.length ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {board.machines.map((machine) => (
                      <TabButton
                        key={machine.machine_id}
                        active={machine.machine_id === selectedMachineId}
                        onClick={() => setSelectedMachineId(machine.machine_id)}
                      >
                        {machine.machine_name || machine.machine_id}
                      </TabButton>
                    ))}
                  </div>
                  {selectedMachine ? renderMachineQueue(selectedMachine) : null}
                </>
              ) : (
                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                  No jobs queued — dispatch from Jobs page.
                </div>
              )}
            </div>

            <div className="hidden gap-4 lg:grid lg:grid-cols-2 2xl:grid-cols-3">
              {board?.machines.length
                ? board.machines.map((machine) => renderMachineQueue(machine))
                : (
                  <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400 lg:col-span-2 2xl:col-span-3">
                    No jobs queued — dispatch from Jobs page.
                  </div>
                )}
            </div>
          </PanelCard>

          <PanelCard title="Focused machine detail" subtitle="The selected queue is refreshed directly from the machine route so touch devices still get a high-confidence lane view.">
            {selectedQueue ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/8 bg-black/15 px-4 py-4">
                  <div>
                    <div className="text-lg font-semibold text-slate-50">{selectedQueue.machine_name || selectedQueue.machine_id}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusPill label={`${selectedQueue.total_queued} queued`} tone="amber" />
                      <StatusPill label={`${selectedQueue.total_est_min.toFixed(1)} min load`} tone="sky" />
                    </div>
                  </div>
                  {selectedQueue.active_job ? <StatusPill label={`Active ${selectedQueue.active_job.job_id}`} tone="emerald" /> : null}
                </div>

                <div className="grid gap-3">
                  {selectedQueue.entries.map((entry) => (
                    <div key={entry.id} className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-50">{entry.job_id}</div>
                        <StatusPill label={entry.status} tone={queueTone(entry.status)} />
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-300">
                        {formatQueueTime(entry.estimated_start)} → {formatQueueTime(entry.estimated_complete)}
                      </div>
                    </div>
                  ))}
                </div>

                {isDetailPending ? (
                  <div className="rounded-[18px] border border-sky-300/16 bg-sky-300/[0.08] px-4 py-3 text-sm leading-6 text-sky-50">
                    Refreshing the selected machine queue.
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                Pick a machine lane to hydrate the focused dispatch detail.
              </div>
            )}
          </PanelCard>
        </div>

        <div className="space-y-6">
          <PanelCard title="What-if simulation" subtitle="Model the effect of inserting a job into the current machine queue before committing the dispatch move.">
            <div className="space-y-4">
              <Field label="Hypothetical job">
                <Input value={whatIfJobId} onChange={(event) => setWhatIfJobId(event.target.value)} placeholder="JOB-HYP-01" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Insert position">
                  <Input value={whatIfPosition} onChange={(event) => setWhatIfPosition(event.target.value)} type="number" min="0" />
                </Field>
                <Field label="Duration (min)">
                  <Input value={whatIfDuration} onChange={(event) => setWhatIfDuration(event.target.value)} type="number" min="1" />
                </Field>
              </div>

              <ActionButton onClick={() => void handleWhatIf()} disabled={!!actionLoading || !selectedMachineId} tone="amber" className="min-h-[72px] w-full">
                Run what-if
              </ActionButton>

              {whatIfResult ? (
                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Impact summary</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <SummaryTile label="Jobs delayed" value={String(whatIfResult.impact.jobs_delayed)} hint="Existing queued jobs that would move later." />
                    <SummaryTile label="Max delay" value={`${whatIfResult.impact.max_delay_min.toFixed(1)} min`} hint="Largest single-job delay introduced by the insert." accent="from-rose-300/22 via-rose-200/10 to-transparent" />
                    <SummaryTile label="Total delay" value={`${whatIfResult.impact.total_delay_min.toFixed(1)} min`} hint="Cumulative downstream delay on the selected machine." accent="from-amber-300/22 via-amber-200/10 to-transparent" />
                  </div>
                </div>
              ) : null}
            </div>
          </PanelCard>

          <PanelCard title="PRISM dispatch copilot" subtitle="Deep reasoning inside the board turns queue depth, hot-job pressure, and selected machine context into a concrete next routing move.">
            <SurfaceStatusNotice title="Dispatch intelligence status" surfaces={['shopFloor', 'hotJobs', 'intelligence']} className="mb-4" />
            {insight ? (
              <div className="space-y-4">
                <div className="rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_58%),rgba(4,10,16,0.88)] px-5 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-2xl">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/75">Dispatch reasoning pass</div>
                      <div className="mt-3 text-xl font-semibold text-slate-50">{insight.reasoningSummary}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusPill label={insight.aiIntent.intent.replace(/_/g, ' ')} tone="sky" />
                      <StatusPill label={insight.automation.taskClass} tone="violet" />
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-cyan-300/14 bg-cyan-300/[0.06] px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/75">Suggested next route</div>
                  <div className="mt-3 rounded-[18px] border border-white/8 bg-black/15 px-4 py-4">
                    <div className="text-lg font-semibold text-slate-50">{insight.suggestedSurface.label}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">{insight.suggestedSurface.actionLabel}</div>
                    <Link
                      to={insight.suggestedSurface.route}
                      className="mt-4 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/[0.1] px-4 py-2 text-sm font-semibold text-cyan-50 transition hover:border-cyan-300/32 hover:bg-cyan-300/[0.16]"
                    >
                      Open {insight.suggestedSurface.label}
                    </Link>
                    <div className="mt-4 rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-3 text-xs leading-6 text-slate-300">
                      CLI route: <span className="font-mono text-slate-100">{insight.suggestedSurface.cliCommand}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">PRISM sync memory</div>
                    {focusedSyncJobId ? <StatusPill label={focusedSyncJobId} tone="sky" /> : null}
                  </div>
                  <div className="mt-3 space-y-3">
                    {syncEvents.length > 0 ? (
                      syncEvents.slice(0, 3).map((event) => (
                        <div key={event.id} className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4">
                          <div className="text-sm font-semibold text-slate-100">{describeMilestoneSyncEvent(event)}</div>
                          <div className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">{event.timestamp}</div>
                          <div className="mt-3 rounded-[16px] border border-white/8 bg-black/15 px-3 py-3 text-xs leading-6 text-slate-300">
                            CLI route: <span className="font-mono text-slate-100">{event.cli_command}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-400">
                        No canonical dispatch sync events are loaded yet. Queue, reorder, or simulate a job to seed shared PRISM memory.
                      </div>
                    )}
                  </div>
                </div>

                {insight.apprentice ? (
                  <div className="rounded-[22px] border border-violet-300/14 bg-violet-300/[0.06] px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-100/75">Why PRISM thinks this</div>
                    <div className="mt-3 text-sm leading-6 text-slate-200">{insight.apprentice.explanation}</div>
                    {insight.apprentice.factors.length > 0 ? (
                      <div className="mt-3 rounded-[18px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-300">
                        <div className="font-semibold text-slate-100">{insight.apprentice.factors[0]?.factor}</div>
                        <div className="mt-2">{insight.apprentice.factors[0]?.impact}</div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Deep-learning matches</div>
                    <div className="mt-3 space-y-3">
                      {insight.modelMatches.slice(0, 2).map((model) => (
                        <div key={model.id} className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-4">
                          <div className="text-sm font-semibold text-slate-100">{model.name}</div>
                          <div className="mt-2 text-xs uppercase tracking-[0.18em] text-cyan-100/75">{model.domain}</div>
                          <div className="mt-2 text-sm leading-6 text-slate-300">{model.why}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Reasoning agents</div>
                    <div className="mt-3 space-y-3">
                      {insight.agentCandidates.slice(0, 2).map((agent) => (
                        <div key={agent.id} className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-4">
                          <div className="text-sm font-semibold text-slate-100">{agent.name}</div>
                          <div className="mt-2 text-xs uppercase tracking-[0.18em] text-amber-100/75">{agent.category.replace(/_/g, ' ')}</div>
                          <div className="mt-2 text-sm leading-6 text-slate-300">{agent.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Next actions</div>
                  <div className="mt-3 space-y-3">
                    {insight.nextActions.map((action) => (
                      <div key={action} className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-slate-300">
                        {action}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                The dispatch copilot is waiting on board context before it recommends a queue move.
              </div>
            )}

            {insightLoading ? (
              <div className="mt-4 rounded-[18px] border border-sky-300/16 bg-sky-300/[0.08] px-4 py-3 text-sm leading-6 text-sky-50">
                Refreshing the dispatch reasoning pass from the latest board posture.
              </div>
            ) : null}
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
