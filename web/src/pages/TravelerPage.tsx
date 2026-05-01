import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  completeTravelerStep,
  createTraveler,
  getActiveTravelers,
  getTravelerSummary,
  scanTravelerCode,
  startTravelerCycle,
  startTravelerSetup,
  type CreateTravelerStepInput,
  type TravelerStepSummaryRecord,
  type TravelerTimerRecord,
  type TravelerSummaryRecord,
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
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';
import type { PrismPromptAnalysis } from '../features/operating-system/contracts';
import { useOperatingSystem } from '../features/operating-system/OperatingSystemProvider';

type TravelerTemplateKey = 'mill' | 'turning' | 'outside';
type CameraScanState = 'idle' | 'starting' | 'scanning' | 'unsupported' | 'blocked' | 'error';

type DetectedBarcode = {
  rawValue?: string;
};

type BarcodeDetectorLike = {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

const TRAVELER_TEMPLATES: Record<
  TravelerTemplateKey,
  {
    label: string;
    description: string;
    steps: CreateTravelerStepInput[];
  }
> = {
  mill: {
    label: 'Mill cell',
    description: 'Setup, run, inspect, and pack a standard vertical-mill packet.',
    steps: [
      { step_number: 10, operation: 'Setup', machine_id: 'VF-2SS', workcenter: 'Setup', est_setup_min: 28, est_cycle_min: 0 },
      { step_number: 20, operation: 'Run cycle', machine_id: 'VF-2SS', workcenter: 'Machining', est_setup_min: 0, est_cycle_min: 64, quantity: 24 },
      { step_number: 30, operation: 'Inspection', workcenter: 'Quality', est_setup_min: 0, est_cycle_min: 18, is_inspection_gate: true },
      { step_number: 40, operation: 'Pack and release', workcenter: 'Shipping', est_setup_min: 0, est_cycle_min: 10 },
    ],
  },
  turning: {
    label: 'Turning cell',
    description: 'Turned-part routing with setup, production, and final verification.',
    steps: [
      { step_number: 10, operation: 'Lathe setup', machine_id: 'QTN-200', workcenter: 'Turning', est_setup_min: 32, est_cycle_min: 0 },
      { step_number: 20, operation: 'Turn and finish', machine_id: 'QTN-200', workcenter: 'Turning', est_setup_min: 0, est_cycle_min: 52, quantity: 18 },
      { step_number: 30, operation: 'Deburr and inspect', workcenter: 'Quality', est_setup_min: 0, est_cycle_min: 16, is_inspection_gate: true },
    ],
  },
  outside: {
    label: 'Outside service',
    description: 'Traveler with machining, vendor handoff, and return inspection.',
    steps: [
      { step_number: 10, operation: 'Prep and setup', machine_id: 'DMU-50', workcenter: 'Setup', est_setup_min: 24, est_cycle_min: 0 },
      { step_number: 20, operation: 'Machine prep op', machine_id: 'DMU-50', workcenter: 'Machining', est_setup_min: 0, est_cycle_min: 36, quantity: 8 },
      { step_number: 30, operation: 'Outside service', workcenter: 'Vendor', est_setup_min: 0, est_cycle_min: 0, is_outside_service: true, vendor_name: 'Heat Treat' },
      { step_number: 40, operation: 'Return inspection', workcenter: 'Quality', est_setup_min: 0, est_cycle_min: 14, is_inspection_gate: true },
    ],
  },
};

function formatMinutes(minutes: number) {
  return `${minutes.toFixed(1)} min`;
}

function formatElapsedSeconds(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatVariance(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function getBarcodeDetectorConstructor() {
  const candidate = (
    window as Window & typeof globalThis & { BarcodeDetector?: BarcodeDetectorConstructor }
  ).BarcodeDetector;
  return typeof candidate === 'function' ? candidate : null;
}

function getLiveTimerLabel(timer: TravelerTimerRecord | undefined, nowMs: number) {
  if (!timer?.start_time) {
    return null;
  }

  const startedAtMs = Date.parse(timer.start_time);
  if (Number.isNaN(startedAtMs)) {
    return null;
  }

  const endedAtMs = timer.end_time ? Date.parse(timer.end_time) : nowMs;
  if (Number.isNaN(endedAtMs)) {
    return null;
  }

  return formatElapsedSeconds(Math.max(Math.floor((endedAtMs - startedAtMs) / 1000), 0));
}

function stepTone(status: TravelerStepSummaryRecord['status']): 'slate' | 'amber' | 'emerald' | 'rose' | 'sky' {
  if (status === 'setup') return 'amber';
  if (status === 'running') return 'emerald';
  if (status === 'complete') return 'sky';
  if (status === 'hold') return 'rose';
  return 'slate';
}

function stepLabel(status: TravelerStepSummaryRecord['status']) {
  if (status === 'setup') return 'Setup';
  if (status === 'running') return 'Running';
  if (status === 'complete') return 'Complete';
  if (status === 'skipped') return 'Skipped';
  if (status === 'hold') return 'Hold';
  return 'Pending';
}

function buildTravelerInsightPrompt(summary: TravelerSummaryRecord, syncEvents: MilestoneSyncEvent[]) {
  const currentStep = summary.current_step;
  return [
    'Analyze this traveler routing task dependency and shop-floor cost variance.',
    `Job ${summary.job_id} is ${summary.pct_complete}% complete across ${summary.total_steps} routing steps.`,
    currentStep
      ? `Current step is ${currentStep.step_number} ${currentStep.operation} in status ${currentStep.status}.`
      : 'No current step is active, so the next routing move needs to be chosen explicitly.',
    `Setup variance is ${summary.setup_variance_pct.toFixed(1)} percent and cycle variance is ${summary.cycle_variance_pct.toFixed(1)} percent.`,
    `Total setup time is ${summary.total_setup_min.toFixed(1)} minutes versus ${summary.est_total_setup_min.toFixed(1)} estimated.`,
    `Total cycle time is ${summary.total_cycle_min.toFixed(1)} minutes versus ${summary.est_total_cycle_min.toFixed(1)} estimated.`,
    summary.active_timer
      ? `There is an active ${summary.active_timer.entry_type} timer running on the current traveler step.`
      : 'No active timer is running right now.',
    currentStep?.is_inspection_gate ? 'This traveler includes a quality inspection gate.' : 'Keep routing focused on execution continuity and the next safe traveler action.',
    ...(syncEvents.length > 0
      ? [`Recent canonical PRISM sync memory: ${buildMilestoneSyncPromptMemory(syncEvents).join(' ')}`]
      : []),
  ].join(' ');
}

function TravelerSelectionCard({
  traveler,
  selected,
  onSelect,
}: {
  traveler: TravelerSummaryRecord;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
        selected
          ? 'border-cyan-300/22 bg-cyan-300/[0.08]'
          : 'border-white/8 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.05]'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-50">{traveler.job_id}</div>
          <div className="mt-2 text-sm leading-6 text-slate-300">
            {traveler.current_step
              ? `Current step ${traveler.current_step.step_number}: ${traveler.current_step.operation}`
              : 'No current step active yet.'}
          </div>
        </div>
        <StatusPill
          label={`${traveler.pct_complete}%`}
          tone={traveler.pct_complete >= 100 ? 'sky' : traveler.pct_complete >= 50 ? 'emerald' : 'amber'}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusPill label={`${traveler.completed_steps}/${traveler.total_steps} complete`} tone="slate" />
        <StatusPill label={`Cycle ${formatVariance(traveler.cycle_variance_pct)}`} tone={traveler.cycle_variance_pct > 0 ? 'amber' : 'emerald'} />
      </div>
    </button>
  );
}

function TravelerStepCard({
  step,
  isCurrent,
  busy,
  activeTimerLabel,
  onStartSetup,
  onStartCycle,
  onComplete,
  onSkip,
}: {
  step: TravelerStepSummaryRecord;
  isCurrent: boolean;
  busy: boolean;
  activeTimerLabel?: string | null;
  onStartSetup: () => void;
  onStartCycle: () => void;
  onComplete: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-lg font-semibold text-slate-50">
              Step {step.step_number}: {step.operation}
            </div>
            <StatusPill label={stepLabel(step.status)} tone={stepTone(step.status)} />
            {isCurrent ? <StatusPill label="Current" tone="amber" /> : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {step.machine_id ? <StatusPill label={step.machine_id} tone="sky" /> : null}
            {step.workcenter ? <StatusPill label={step.workcenter} tone="violet" /> : null}
            {step.is_inspection_gate ? <StatusPill label="Inspection gate" tone="rose" /> : null}
          </div>
        </div>

        <div className="grid gap-2 text-right">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Setup actual</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">{formatMinutes(step.setup_time_min)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Cycle actual</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">{formatMinutes(step.cycle_time_min)}</div>
          </div>
        </div>
      </div>

      {isCurrent && activeTimerLabel ? (
        <div className="mt-4 rounded-[18px] border border-cyan-300/16 bg-cyan-300/[0.08] px-4 py-3 text-sm leading-6 text-cyan-50">
          Live {step.status === 'setup' ? 'setup' : step.status === 'running' ? 'cycle' : 'step'} timer {activeTimerLabel}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Estimated plan</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-slate-300">
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Setup est</div>
              <div className="mt-2 text-lg font-semibold text-slate-100">{formatMinutes(step.est_setup_min)}</div>
            </div>
            <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-slate-300">
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Cycle est</div>
              <div className="mt-2 text-lg font-semibold text-slate-100">{formatMinutes(step.est_cycle_min)}</div>
            </div>
          </div>
        </div>

        <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Touch actions</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(step.status === 'pending' || step.status === 'hold') ? (
              <>
                <ActionButton onClick={onStartSetup} disabled={busy} tone="amber" className="min-h-[64px]">
                  Start setup
                </ActionButton>
                <ActionButton onClick={onSkip} disabled={busy} tone="rose" className="min-h-[64px]">
                  Skip step
                </ActionButton>
              </>
            ) : null}
            {step.status === 'setup' ? (
              <>
                <ActionButton onClick={onStartCycle} disabled={busy} tone="emerald" className="min-h-[64px]">
                  Start cycle
                </ActionButton>
                <ActionButton onClick={onComplete} disabled={busy} tone="cyan" className="min-h-[64px]">
                  Complete
                </ActionButton>
              </>
            ) : null}
            {step.status === 'running' ? (
              <ActionButton onClick={onComplete} disabled={busy} tone="cyan" className="min-h-[64px] sm:col-span-2">
                Complete step
              </ActionButton>
            ) : null}
            {(step.status === 'complete' || step.status === 'skipped') ? (
              <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-3 text-sm leading-6 text-slate-300 sm:col-span-2">
                This step is closed. Move to the next routing dependency or return to the jobs desk.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TravelerPage() {
  const location = useLocation();
  const services = useOperatingSystem();
  const routeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const seededJobId = routeParams.get('job') ?? '';
  const [travelers, setTravelers] = useState<TravelerSummaryRecord[]>([]);
  const [selectedJobId, setSelectedJobId] = useState(seededJobId);
  const [selectedTraveler, setSelectedTraveler] = useState<TravelerSummaryRecord | null>(null);
  const [travelerLoading, setTravelerLoading] = useState(true);
  const [travelerError, setTravelerError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [createJobId, setCreateJobId] = useState(seededJobId);
  const [templateKey, setTemplateKey] = useState<TravelerTemplateKey>('mill');
  const [operatorId, setOperatorId] = useState('EMP-001');
  const [notes, setNotes] = useState('');
  const [scanCode, setScanCode] = useState(seededJobId ? `JOB-${seededJobId}` : '');
  const [scanAction, setScanAction] = useState<'start_setup' | 'start_cycle' | 'complete'>('start_setup');
  const [partsComplete, setPartsComplete] = useState('0');
  const [partsScrapped, setPartsScrapped] = useState('0');
  const [insight, setInsight] = useState<PrismPromptAnalysis | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [syncEvents, setSyncEvents] = useState<MilestoneSyncEvent[]>([]);
  const [isPending, setPending] = useState(false);
  const [cameraState, setCameraState] = useState<CameraScanState>('idle');
  const [cameraMessage, setCameraMessage] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanFrameRef = useRef<number | null>(null);
  const detectedCodeRef = useRef('');

  const stopCameraScan = useCallback((nextState: CameraScanState = 'idle') => {
    if (scanFrameRef.current !== null) {
      window.cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      (
        videoRef.current as HTMLVideoElement & {
          srcObject: MediaStream | null;
        }
      ).srcObject = null;
    }

    setCameraState(nextState);
  }, []);

  const refreshTravelers = useCallback(async (preferredJobId?: string) => {
    setTravelerLoading(true);
    setTravelerError(null);

    try {
      const nextTravelers = await getActiveTravelers();
      startTransition(() => {
        setTravelers(nextTravelers);
        setSelectedJobId((current) => {
          if (preferredJobId && nextTravelers.some((traveler) => traveler.job_id === preferredJobId)) {
            return preferredJobId;
          }
          if (current && nextTravelers.some((traveler) => traveler.job_id === current)) {
            return current;
          }
          return nextTravelers[0]?.job_id ?? '';
        });
      });
    } catch (caught) {
      setTravelerError(caught instanceof Error ? caught.message : 'Traveler desk could not load right now.');
      startTransition(() => {
        setTravelers([]);
        setSelectedJobId('');
      });
    } finally {
      setTravelerLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshTravelers(seededJobId || undefined);
  }, [refreshTravelers, seededJobId]);

  useEffect(() => {
    return () => {
      stopCameraScan();
    };
  }, [stopCameraScan]);

  useEffect(() => {
    if (!selectedJobId) {
      setSelectedTraveler(null);
      setSyncEvents([]);
      return;
    }

    const preview = travelers.find((traveler) => traveler.job_id === selectedJobId) ?? null;
    if (preview) {
      setSelectedTraveler(preview);
    }

    let active = true;
    setPending(true);

    getTravelerSummary(selectedJobId)
      .then((summary) => {
        if (active) {
          startTransition(() => {
            setSelectedTraveler(summary);
          });
        }
      })
      .catch((caught) => {
        if (active) {
          setTravelerError(caught instanceof Error ? caught.message : 'Traveler detail could not load.');
        }
      })
      .finally(() => {
        if (active) {
          setPending(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedJobId, travelers]);

  useEffect(() => {
    if (!selectedJobId) {
      setSyncEvents([]);
      return;
    }

    let active = true;

    getMilestoneSyncEvents(selectedJobId, 6)
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
  }, [selectedJobId]);

  useEffect(() => {
    if (!selectedTraveler?.active_timer) {
      return undefined;
    }

    setNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [selectedTraveler?.active_timer?.id]);

  const travelerPrompt = useMemo(
    () => (selectedTraveler ? buildTravelerInsightPrompt(selectedTraveler, syncEvents) : ''),
    [selectedTraveler, syncEvents],
  );
  const deferredTravelerPrompt = useDeferredValue(travelerPrompt);

  useEffect(() => {
    if (!deferredTravelerPrompt) {
      setInsight(null);
      return;
    }

    let active = true;
    setInsightLoading(true);

    services
      .analyzePrismPrompt(deferredTravelerPrompt)
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
  }, [deferredTravelerPrompt, services]);

  const selectedTemplate = TRAVELER_TEMPLATES[templateKey];
  const completionValue = selectedTraveler ? `${selectedTraveler.pct_complete}%` : '0%';
  const cycleVarianceValue = selectedTraveler ? formatVariance(selectedTraveler.cycle_variance_pct) : 'Pending';
  const currentStepLabel = selectedTraveler?.current_step
    ? `Step ${selectedTraveler.current_step.step_number}`
    : 'No active step';
  const currentTimerLabel = useMemo(
    () => getLiveTimerLabel(selectedTraveler?.active_timer, nowMs),
    [nowMs, selectedTraveler?.active_timer],
  );

  async function handleCreateTraveler() {
    if (!createJobId.trim()) {
      setTravelerError('Enter a job ID before creating a traveler.');
      return;
    }

    setActionLoading('create');
    setTravelerError(null);
    setActionMessage(null);

    try {
      const createdTraveler = await createTraveler({
        job_id: createJobId.trim(),
        steps: selectedTemplate.steps,
        created_by: operatorId.trim() || undefined,
      });
      if (createdTraveler.prism_sync) {
        setSyncEvents(createdTraveler.prism_sync.recent_events);
      } else {
        const milestoneSync = await syncMilestoneMutation({
          jobId: createJobId.trim(),
          source: 'traveler-desk',
          trigger: 'traveler-created',
          note: `Traveler created using the ${selectedTemplate.label} template.`,
        }).catch(() => null);
        if (milestoneSync) {
          setSyncEvents(milestoneSync.recentEvents);
        }
      }
      setActionMessage(`Traveler created for ${createJobId.trim()} using the ${selectedTemplate.label.toLowerCase()} template.`);
      setScanCode(`JOB-${createJobId.trim()}`);
      await refreshTravelers(createJobId.trim());
    } catch (caught) {
      setTravelerError(caught instanceof Error ? caught.message : 'Traveler creation failed.');
    } finally {
      setActionLoading(null);
    }
  }

  async function runStepAction(step: TravelerStepSummaryRecord, action: 'setup' | 'cycle' | 'complete' | 'skip') {
    setActionLoading(`${step.id}:${action}`);
    setTravelerError(null);
    setActionMessage(null);

    try {
      if (action === 'setup') {
        const setupResult = await startTravelerSetup(selectedJobId, step.step_number, {
          operator_id: operatorId.trim(),
          notes: notes.trim() || undefined,
        });
        if (setupResult.prism_sync) {
          setSyncEvents(setupResult.prism_sync.recent_events);
        } else {
          const milestoneSync = await syncMilestoneMutation({
            jobId: selectedJobId,
            source: 'traveler-desk',
            trigger: 'traveler-step-started',
            action,
            stepNumber: step.step_number,
            operation: step.operation,
            department: step.workcenter,
            note: notes.trim() || `Setup started for step ${step.step_number}.`,
          }).catch(() => null);
          if (milestoneSync) {
            setSyncEvents(milestoneSync.recentEvents);
          }
        }
        setActionMessage(`Setup started for step ${step.step_number}.`);
      } else if (action === 'cycle') {
        const cycleResult = await startTravelerCycle(selectedJobId, step.step_number, {
          operator_id: operatorId.trim(),
          notes: notes.trim() || undefined,
        });
        if (cycleResult.prism_sync) {
          setSyncEvents(cycleResult.prism_sync.recent_events);
        } else {
          const milestoneSync = await syncMilestoneMutation({
            jobId: selectedJobId,
            source: 'traveler-desk',
            trigger: 'traveler-step-started',
            action,
            stepNumber: step.step_number,
            operation: step.operation,
            department: step.workcenter,
            note: notes.trim() || `Cycle started for step ${step.step_number}.`,
          }).catch(() => null);
          if (milestoneSync) {
            setSyncEvents(milestoneSync.recentEvents);
          }
        }
        setActionMessage(`Cycle started for step ${step.step_number}.`);
      } else {
        const completedResult = await completeTravelerStep(selectedJobId, step.step_number, {
          operator_id: operatorId.trim(),
          notes: notes.trim() || undefined,
          skip: action === 'skip',
          parts_complete: action === 'complete' ? Math.max(parseInt(partsComplete, 10) || 0, 0) : undefined,
          parts_scrapped: action === 'complete' ? Math.max(parseInt(partsScrapped, 10) || 0, 0) : undefined,
        });
        if (completedResult.prism_sync) {
          setSyncEvents(completedResult.prism_sync.recent_events);
        } else {
          const milestoneSync = await syncMilestoneMutation({
            jobId: selectedJobId,
            source: 'traveler-desk',
            trigger: action === 'skip' ? 'traveler-step-skipped' : 'traveler-step-completed',
            action,
            stepNumber: step.step_number,
            operation: step.operation,
            department: step.workcenter,
            quantityCompleted: action === 'complete' ? Math.max(parseInt(partsComplete, 10) || 0, 0) : undefined,
            scrapQty: action === 'complete' ? Math.max(parseInt(partsScrapped, 10) || 0, 0) : undefined,
            note: notes.trim() || (action === 'skip' ? `Step ${step.step_number} skipped.` : `Step ${step.step_number} completed.`),
          }).catch(() => null);
          if (milestoneSync) {
            setSyncEvents(milestoneSync.recentEvents);
          }
        }
        setActionMessage(action === 'skip' ? `Step ${step.step_number} skipped.` : `Step ${step.step_number} completed.`);
      }

      await refreshTravelers(selectedJobId);
    } catch (caught) {
      setTravelerError(caught instanceof Error ? caught.message : 'Traveler step transition failed.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleScan() {
    if (!scanCode.trim()) {
      setTravelerError('Enter or scan a traveler code first.');
      return;
    }

    setActionLoading('scan');
    setTravelerError(null);
    setActionMessage(null);

    try {
      const result = await scanTravelerCode({
        code: scanCode.trim(),
        operator_id: operatorId.trim(),
        action: scanAction,
      });
      const summaryJobId = result.summary?.job_id ?? selectedJobId;
      if (result.prism_sync) {
        setSyncEvents(result.prism_sync.recent_events);
      } else if (summaryJobId) {
        const milestoneSync = await syncMilestoneMutation({
          jobId: summaryJobId,
          source: 'traveler-desk',
          trigger: 'traveler-scan-transition',
          action: scanAction,
          stepNumber: result.summary?.current_step?.step_number,
          operation: result.summary?.current_step?.operation ?? selectedTraveler?.current_step?.operation,
          department: result.summary?.current_step?.workcenter ?? selectedTraveler?.current_step?.workcenter,
          quantityCompleted: scanAction === 'complete' ? Math.max(parseInt(partsComplete, 10) || 0, 0) : undefined,
          scrapQty: scanAction === 'complete' ? Math.max(parseInt(partsScrapped, 10) || 0, 0) : undefined,
          note: notes.trim() || `Scanner transition executed ${scanAction.replace(/_/g, ' ')}.`,
        }).catch(() => null);
        if (milestoneSync) {
          setSyncEvents(milestoneSync.recentEvents);
        }
      }
      setActionMessage(`Scan routed the traveler through ${result.action?.replace(/_/g, ' ') ?? 'the next action'}.`);
      await refreshTravelers(summaryJobId || undefined);
    } catch (caught) {
      setTravelerError(caught instanceof Error ? caught.message : 'Traveler scan failed.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleStartCameraScan() {
    const BarcodeDetectorCtor = getBarcodeDetectorConstructor();
    if (!BarcodeDetectorCtor) {
      setCameraMessage('Camera scan needs BarcodeDetector support in this browser. Use a scanner-gun payload or paste the code manually.');
      setCameraState('unsupported');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMessage('Camera access is not available in this browser. Use the text scan lane instead.');
      setCameraState('unsupported');
      return;
    }

    stopCameraScan();
    setCameraState('starting');
    setCameraMessage('Point the rear camera at a traveler QR or barcode.');
    detectedCodeRef.current = '';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
        },
      });

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        setCameraMessage('Camera preview could not attach to the traveler page.');
        setCameraState('error');
        return;
      }

      streamRef.current = stream;
      (
        video as HTMLVideoElement & {
          srcObject: MediaStream | null;
        }
      ).srcObject = stream;

      await video.play().catch(() => undefined);

      const detector = new BarcodeDetectorCtor({
        formats: ['qr_code', 'code_128', 'code_39'],
      });

      setCameraState('scanning');

      const scanFrame = async () => {
        const preview = videoRef.current;
        if (!preview || !streamRef.current) {
          return;
        }

        try {
          if (preview.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const barcodes = await detector.detect(preview);
            const match = barcodes.find(
              (barcode) => typeof barcode.rawValue === 'string' && barcode.rawValue.trim().length > 0,
            );

            if (match?.rawValue) {
              const capturedCode = match.rawValue.trim();
              if (capturedCode && capturedCode !== detectedCodeRef.current) {
                detectedCodeRef.current = capturedCode;
                setScanCode(capturedCode);
                setCameraMessage(`Captured ${capturedCode}. Review it, then run the traveler scan.`);
                stopCameraScan('idle');
                return;
              }
            }
          }
        } catch {
          // Keep sampling frames and let the manual text lane remain the fallback.
        }

        scanFrameRef.current = window.requestAnimationFrame(() => {
          void scanFrame();
        });
      };

      void scanFrame();
    } catch (caught) {
      const errorName = caught instanceof DOMException ? caught.name : '';
      setCameraMessage(
        errorName === 'NotAllowedError'
          ? 'Camera permission was blocked. Allow camera access or keep using the manual scan lane.'
          : 'Camera startup failed. Use the manual scan lane while PRISM keeps the same traveler actions available.',
      );
      stopCameraScan(errorName === 'NotAllowedError' ? 'blocked' : 'error');
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Traveler routing"
        title="Traveler"
        description="Run step-by-step traveler routing with big mobile actions, QR transitions, and embedded PRISM reasoning so routing decisions stay grounded in live setup, cycle, and variance posture."
        metrics={
          <>
            <SummaryTile
              label="Active travelers"
              value={String(travelers.length)}
              hint="Open packets still moving through the floor routing deck."
            />
            <SummaryTile
              label="Selected completion"
              value={completionValue}
              hint={selectedTraveler ? `${selectedTraveler.completed_steps} of ${selectedTraveler.total_steps} routing steps are closed.` : 'Create or select a packet to hydrate the deck.'}
              accent="from-emerald-400/22 via-emerald-300/10 to-transparent"
            />
            <SummaryTile
              label="Cycle variance"
              value={cycleVarianceValue}
              hint="Use routing variance to decide whether the packet needs replanning, quote review, or just clean execution."
              accent="from-amber-300/22 via-amber-200/10 to-transparent"
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Breadcrumb</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                Jobs <span className="text-slate-500">→</span> Traveler <span className="text-slate-500">→</span> {currentStepLabel}
              </div>
            </div>

            <Field label="Create job ID">
              <Input value={createJobId} onChange={(event) => setCreateJobId(event.target.value)} placeholder="JOB-24018" />
            </Field>
            <Field label="Template">
              <Select value={templateKey} onChange={(event) => setTemplateKey(event.target.value as TravelerTemplateKey)}>
                {Object.entries(TRAVELER_TEMPLATES).map(([key, template]) => (
                  <option key={key} value={key}>
                    {template.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Operator ID">
              <Input value={operatorId} onChange={(event) => setOperatorId(event.target.value)} placeholder="EMP-001" />
            </Field>
            <div className="rounded-[22px] border border-cyan-300/16 bg-cyan-300/[0.08] px-4 py-4 text-sm leading-6 text-cyan-50">
              {selectedTemplate.description}
            </div>
            <ActionButton onClick={() => void handleCreateTraveler()} disabled={!!actionLoading} tone="cyan" className="min-h-[72px] w-full">
              Create traveler
            </ActionButton>
          </div>
        }
      />

      {travelerLoading ? <LoadingState label="Loading traveler desk..." /> : null}
      {travelerError ? <ErrorState message={travelerError} onRetry={() => void refreshTravelers(selectedJobId || undefined)} /> : null}
      {actionMessage ? (
        <div className="rounded-[22px] border border-emerald-300/18 bg-emerald-300/[0.08] px-4 py-4 text-sm leading-6 text-emerald-50">
          {actionMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="space-y-6">
          <PanelCard title="Active travelers" subtitle="Every in-flight routing packet stays visible so the next traveler move is one tap away.">
            {travelers.length > 0 ? (
              <div className="grid gap-3">
                {travelers.map((traveler) => (
                  <TravelerSelectionCard
                    key={traveler.job_id}
                    traveler={traveler}
                    selected={traveler.job_id === selectedJobId}
                    onSelect={() => setSelectedJobId(traveler.job_id)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                No active travelers — create one from Jobs page or seed one here to begin routing.
              </div>
            )}
          </PanelCard>

          <PanelCard title="Traveler step deck" subtitle="Large touch actions keep setup, cycle, and completion moves obvious on a floor tablet.">
            {selectedTraveler ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/8 bg-black/15 px-4 py-4">
                  <div>
                    <div className="text-lg font-semibold text-slate-50">{selectedTraveler.job_id}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusPill label={`${selectedTraveler.completed_steps}/${selectedTraveler.total_steps} complete`} tone="sky" />
                      <StatusPill label={`Setup ${formatVariance(selectedTraveler.setup_variance_pct)}`} tone={selectedTraveler.setup_variance_pct > 0 ? 'amber' : 'emerald'} />
                      <StatusPill label={`Cycle ${formatVariance(selectedTraveler.cycle_variance_pct)}`} tone={selectedTraveler.cycle_variance_pct > 0 ? 'amber' : 'emerald'} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Current step</div>
                    <div className="mt-2 text-lg font-semibold text-slate-100">
                      {selectedTraveler.current_step ? `${selectedTraveler.current_step.step_number} ${selectedTraveler.current_step.operation}` : 'Waiting on next step'}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  {selectedTraveler.steps.map((step) => (
                    <TravelerStepCard
                      key={step.id}
                      step={step}
                      isCurrent={selectedTraveler.current_step?.id === step.id}
                      busy={!!actionLoading}
                      activeTimerLabel={
                        selectedTraveler.current_step?.id === step.id
                          && selectedTraveler.active_timer?.routing_step_id === step.id
                          ? currentTimerLabel
                          : null
                      }
                      onStartSetup={() => void runStepAction(step, 'setup')}
                      onStartCycle={() => void runStepAction(step, 'cycle')}
                      onComplete={() => void runStepAction(step, 'complete')}
                      onSkip={() => void runStepAction(step, 'skip')}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                Select a traveler to hydrate the step deck and its touch actions.
              </div>
            )}
          </PanelCard>
        </div>

        <div className="space-y-6">
          <PanelCard title="QR transition lane" subtitle="Manual scans, scanner guns, or pasted QR payloads can all move the packet forward without reopening the job desk.">
            <div className="space-y-4">
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Camera scan</div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">
                      Use the tablet camera when a scanner gun is not available. PRISM will capture the code and keep the same deep-reasoning traveler flow.
                    </div>
                  </div>
                  <StatusPill
                    label={cameraState === 'scanning' ? 'Camera live' : cameraState === 'starting' ? 'Starting' : cameraState === 'unsupported' ? 'Unsupported' : cameraState === 'blocked' ? 'Blocked' : cameraState === 'error' ? 'Retry needed' : 'Idle'}
                    tone={cameraState === 'scanning' ? 'emerald' : cameraState === 'unsupported' || cameraState === 'blocked' || cameraState === 'error' ? 'rose' : 'slate'}
                  />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <ActionButton
                    onClick={() => void handleStartCameraScan()}
                    disabled={cameraState === 'starting' || cameraState === 'scanning'}
                    tone="cyan"
                    className="min-h-[64px]"
                  >
                    Start camera scan
                  </ActionButton>
                  <ActionButton
                    onClick={() => stopCameraScan()}
                    disabled={cameraState !== 'starting' && cameraState !== 'scanning'}
                    tone="rose"
                    className="min-h-[64px]"
                  >
                    Stop camera
                  </ActionButton>
                </div>

                <div className="mt-4 overflow-hidden rounded-[20px] border border-white/8 bg-slate-950/80">
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    autoPlay
                    data-testid="traveler-camera-preview"
                    className="min-h-[220px] w-full bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_60%),#020617] object-cover"
                  />
                </div>

                {cameraMessage ? (
                  <div className="mt-4 rounded-[18px] border border-cyan-300/16 bg-cyan-300/[0.08] px-4 py-3 text-sm leading-6 text-cyan-50">
                    {cameraMessage}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4">
                <Field label="Scan code">
                  <Input value={scanCode} onChange={(event) => setScanCode(event.target.value)} placeholder="JOB-24018-STEP-20" />
                </Field>
                <Field label="Scan action">
                  <Select value={scanAction} onChange={(event) => setScanAction(event.target.value as 'start_setup' | 'start_cycle' | 'complete')}>
                    <option value="start_setup">Start setup</option>
                    <option value="start_cycle">Start cycle</option>
                    <option value="complete">Complete step</option>
                  </Select>
                </Field>
                <Field label="Notes">
                  <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="First article cleared, proceed to runtime." />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Parts complete">
                    <Input value={partsComplete} onChange={(event) => setPartsComplete(event.target.value)} type="number" min="0" />
                  </Field>
                  <Field label="Parts scrapped">
                    <Input value={partsScrapped} onChange={(event) => setPartsScrapped(event.target.value)} type="number" min="0" />
                  </Field>
                </div>
              </div>

              <ActionButton onClick={() => void handleScan()} disabled={!!actionLoading} tone="emerald" className="min-h-[72px] w-full">
                Run traveler scan
              </ActionButton>
            </div>
          </PanelCard>

          <PanelCard title="PRISM traveler copilot" subtitle="Deep reasoning inside the page turns routing status and variance into a suggested next move instead of leaving the operator with raw traveler data.">
            <SurfaceStatusNotice title="Traveler intelligence status" surfaces={['shopFloor', 'intelligence']} className="mb-4" />
            {selectedTraveler ? (
              <div className="space-y-4">
                {insight ? (
                  <>
                    <div className="rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_58%),rgba(4,10,16,0.88)] px-5 py-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="max-w-2xl">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/75">Traveler reasoning pass</div>
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
                        {syncEvents[0]?.target_milestone ? <StatusPill label={syncEvents[0].target_milestone.replace(/_/g, ' ')} tone="sky" /> : null}
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
                            No canonical traveler sync events are loaded yet. The next routed traveler action will seed shared PRISM memory.
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
                  </>
                ) : (
                  <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                    Select a traveler to start the PRISM reasoning pass.
                  </div>
                )}

                {insightLoading || isPending ? (
                  <div className="rounded-[18px] border border-sky-300/16 bg-sky-300/[0.08] px-4 py-3 text-sm leading-6 text-sky-50">
                    Refreshing the traveler reasoning pass from the latest routing context.
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                No active traveler is selected yet, so the copilot is waiting on routing context.
              </div>
            )}
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
