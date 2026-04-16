import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppwCaptureOpsCopilot } from '../components/puoa/AppwCaptureOpsCopilot';
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
import { buildShopFloorPath } from '../utils/shopFloorRoute';
import { normalizeTrackedDepartment } from '../utils/jobTracking';
import { buildWorkflowPath, formatWorkflowSourceLabel, parseWorkflowRouteContext } from '../utils/workflowRouteContext';

type CaptureRecordKind = 'photo' | 'video' | 'audio' | 'document' | 'qr' | 'map';
type CaptureTone = 'sky' | 'emerald' | 'amber' | 'violet' | 'rose';
type CaptureTarget = 'job' | 'machine' | 'inventory' | 'quality' | 'alarm';

type CaptureRecord = {
  id: string;
  title: string;
  kind: CaptureRecordKind;
  target: CaptureTarget;
  context: string;
  detail: string;
  createdAt: string;
  tone: CaptureTone;
};

type DeviceStatus = {
  label: string;
  supported: boolean;
  detail: string;
  tone: CaptureTone;
};

type DetectedCode = {
  rawValue?: string;
  format?: string;
};

type BarcodeDetectorCtor = new (options?: {
  formats?: string[];
}) => {
  detect: (source: CanvasImageSource) => Promise<DetectedCode[]>;
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function kindTone(kind: CaptureRecordKind): CaptureTone {
  if (kind === 'video') return 'violet';
  if (kind === 'audio') return 'amber';
  if (kind === 'qr') return 'emerald';
  if (kind === 'map') return 'sky';
  if (kind === 'document') return 'rose';
  return 'sky';
}

function kindLabel(kind: CaptureRecordKind) {
  if (kind === 'qr') return 'QR';
  if (kind === 'map') return 'Map';
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function targetLabel(target: CaptureTarget) {
  if (target === 'job') return 'Job packet';
  if (target === 'machine') return 'Machine registry';
  if (target === 'inventory') return 'Inventory';
  if (target === 'quality') return 'Quality evidence';
  return 'Alarm / troubleshooting';
}

function fileKind(file: File): CaptureRecordKind {
  if (file.type.startsWith('image/')) return 'photo';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'document';
}

function fileContext(target: CaptureTarget, jobId: string, machine: string, department: string) {
  if (target === 'machine') {
    return `${machine || 'Machine pending'} · ${department || 'Department pending'}`;
  }

  if (target === 'inventory') {
    return `${department || 'Inventory routing pending'} · receipts / tooling / part numbers`;
  }

  if (target === 'quality') {
    return `${jobId || 'Record pending'} · setup / NCR / print evidence`;
  }

  if (target === 'alarm') {
    return `${machine || 'Machine pending'} · chatter / coolant / load evidence`;
  }

  return `${jobId || 'Job pending'} · ${department || 'Department pending'}`;
}

function barcodeDetectorConstructor() {
  return (globalThis as typeof globalThis & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
}

function formatRefreshLabel(value?: number | null) {
  if (!value) {
    return 'Not refreshed yet';
  }

  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function CaptureSourcePostureCard({
  label,
  detail,
  statusLabel,
  toneClass,
  metaLabel,
}: {
  label: string;
  detail: string;
  statusLabel: string;
  toneClass: string;
  metaLabel: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-black/20 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-50">{label}</div>
          <div className="mt-2 text-sm leading-6 text-slate-300">{detail}</div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}>
          {statusLabel}
        </span>
      </div>
      <div className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">{metaLabel}</div>
    </div>
  );
}

export function CaptureOpsPage() {
  const location = useLocation();
  const routeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeContext = useMemo(() => parseWorkflowRouteContext(location.search), [location.search]);
  const launcherSource = routeParams.get('source') || '';
  const originSource = routeContext.origin.source || '';
  const sourceContext = launcherSource || originSource;
  const upstreamSourceContext = originSource && originSource !== sourceContext ? originSource : '';
  const routedScan = routeParams.get('scan') ?? '';
  const routedJob = routeContext.focus.jobId || routeParams.get('job') || '';
  const routedTarget = routeParams.get('target');
  const routedDepartment = routeParams.get('department') ?? '';
  const routedMachine = routeParams.get('machine') ?? '';
  const routedZone = routeParams.get('zone') ?? '';
  const routedNote = routeContext.origin.note || routeParams.get('note') || '';
  const routedRecordType = routeContext.origin.recordType || routeParams.get('recordType') || '';
  const routedRecordId = routeContext.origin.recordId || routeParams.get('recordId') || '';
  const routedCustomer = routeContext.origin.customer || routeParams.get('customer') || '';
  const routedThreadId = routeContext.origin.threadId || routeParams.get('thread') || '';
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraSupported, setCameraSupported] = useState(false);
  const [microphoneSupported, setMicrophoneSupported] = useState(false);
  const [scannerSupported, setScannerSupported] = useState(false);
  const [previewState, setPreviewState] = useState<'idle' | 'camera' | 'camera+mic'>('idle');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState('Manual scan entry stays available even when the browser cannot decode QR directly.');
  const [manualScan, setManualScan] = useState(() => routedScan || 'PRISMJOB|job=JOB-4821|machine=MC-04|department=Machining');
  const [latestScan, setLatestScan] = useState('');
  const [jobId, setJobId] = useState(() => routedJob || 'JOB-4821');
  const [target, setTarget] = useState<CaptureTarget>(() => {
    const nextTarget = routedTarget;
    return nextTarget === 'machine' || nextTarget === 'inventory' || nextTarget === 'quality' || nextTarget === 'alarm'
      ? nextTarget
      : 'job';
  });
  const [department, setDepartment] = useState(() => routedDepartment || 'Machining');
  const [machine, setMachine] = useState(() => routedMachine || 'MC-04');
  const [zone, setZone] = useState(() => routedZone || 'Cell A');
  const [note, setNote] = useState(
    () => routedNote || 'Capture setup photos, prints, machine registry views, and troubleshooting evidence without leaving the app.',
  );
  const [routeContextRefreshedAt, setRouteContextRefreshedAt] = useState<number | null>(() => Date.now());
  const [devicePostureRefreshedAt, setDevicePostureRefreshedAt] = useState<number | null>(null);
  const [previewPostureRefreshedAt, setPreviewPostureRefreshedAt] = useState<number | null>(null);
  const [ledgerRefreshedAt, setLedgerRefreshedAt] = useState<number | null>(() => Date.now());
  const [records, setRecords] = useState<CaptureRecord[]>([
    {
      id: 'seed-setup',
      title: 'Setup photo packet',
      kind: 'photo',
      target: 'job',
      context: 'JOB-4821 · Machining',
      detail: 'First article setup photos staged for the traveler and prove-out review.',
      createdAt: '08:12 AM',
      tone: 'sky',
    },
    {
      id: 'seed-machine',
      title: 'MC-04 cell map capture',
      kind: 'map',
      target: 'machine',
      context: 'MC-04 · Cell A',
      detail: 'Machine location and aisle posture staged for the shop-floor map and routing context.',
      createdAt: '08:18 AM',
      tone: 'emerald',
    },
    {
      id: 'seed-audio',
      title: 'Chatter audio note',
      kind: 'audio',
      target: 'alarm',
      context: 'MC-04 · roughing pass',
      detail: 'Operator recorded spindle sound during chatter so cutting parameters can be reviewed against tooling and holder posture.',
      createdAt: '08:26 AM',
      tone: 'amber',
    },
  ]);
  const effectiveOrigin = useMemo(
    () =>
      routeContext.origin.source
        ? routeContext.origin
        : {
            source: 'capture-ops',
            recordType: routedRecordType || (jobId ? 'Job' : ''),
            recordId: routedRecordId || jobId,
            customer: routedCustomer,
            note: routedNote,
            threadId: routedThreadId,
          },
    [jobId, routeContext.origin, routedCustomer, routedNote, routedRecordId, routedRecordType, routedThreadId],
  );
  const effectiveFocus = useMemo(
    () =>
      routeContext.focus.id
        ? routeContext.focus
        : jobId || routeContext.focus.jobId
        ? {
            type: 'job',
            id: jobId || routeContext.focus.jobId || '',
            jobId: jobId || routeContext.focus.jobId || '',
          }
        : undefined,
    [jobId, routeContext.focus],
  );
  const shopFloorPath = useMemo(
    () =>
      buildShopFloorPath(location.pathname, location.search, {
        source: 'capture-ops',
        scan: latestScan || routedScan,
        job: jobId,
        department: normalizeTrackedDepartment(department, note),
        machine,
        note,
        origin: effectiveOrigin,
        focus: effectiveFocus,
      }),
    [department, effectiveFocus, effectiveOrigin, jobId, latestScan, location.pathname, location.search, machine, note, routedScan],
  );
  const messagesPath = useMemo(
    () =>
      buildWorkflowPath('/messages', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: { source: 'capture-ops' },
      }),
    [effectiveFocus, effectiveOrigin, location.search],
  );

  useEffect(() => {
    const mediaDevices = navigator.mediaDevices;
    const getUserMedia = mediaDevices?.getUserMedia;
    setCameraSupported(Boolean(getUserMedia));
    setMicrophoneSupported(Boolean(getUserMedia));
    setScannerSupported(Boolean(barcodeDetectorConstructor()));
    setDevicePostureRefreshedAt(Date.now());
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setManualScan(routedScan || 'PRISMJOB|job=JOB-4821|machine=MC-04|department=Machining');
    setLatestScan(routedScan);
    setJobId(routedJob || 'JOB-4821');
    setTarget(
      routedTarget === 'machine' || routedTarget === 'inventory' || routedTarget === 'quality' || routedTarget === 'alarm'
        ? routedTarget
        : 'job',
    );
    setDepartment(routedDepartment || 'Machining');
    setMachine(routedMachine || 'MC-04');
    setZone(routedZone || 'Cell A');
    setNote(routedNote || 'Capture setup photos, prints, machine registry views, and troubleshooting evidence without leaving the app.');
    setRouteContextRefreshedAt(Date.now());
  }, [routedDepartment, routedJob, routedMachine, routedNote, routedScan, routedTarget, routedZone]);

  const deviceStatuses = useMemo<DeviceStatus[]>(
    () => [
      {
        label: 'Camera',
        supported: cameraSupported,
        detail: cameraSupported ? 'Live preview and mobile photo capture are available.' : 'Use file capture fallback for photos and setup images.',
        tone: cameraSupported ? 'emerald' : 'amber',
      },
      {
        label: 'Microphone',
        supported: microphoneSupported,
        detail: microphoneSupported ? 'Video with sound and audio troubleshooting can be recorded from the device.' : 'Use audio file upload fallback for evidence capture.',
        tone: microphoneSupported ? 'emerald' : 'amber',
      },
      {
        label: 'QR decode',
        supported: scannerSupported,
        detail: scannerSupported ? 'Current browser can attempt direct QR frame scans.' : 'Manual QR entry and mobile camera capture remain available.',
        tone: scannerSupported ? 'emerald' : 'amber',
      },
    ],
    [cameraSupported, microphoneSupported, scannerSupported],
  );

  const photoCount = records.filter((record) => record.kind === 'photo').length;
  const videoCount = records.filter((record) => record.kind === 'video').length;
  const audioCount = records.filter((record) => record.kind === 'audio').length;
  const documentCount = records.filter((record) => record.kind === 'document').length;
  const qrCount = records.filter((record) => record.kind === 'qr').length;
  const mapCount = records.filter((record) => record.kind === 'map').length;
  const troubleshootingCount = records.filter((record) => record.target === 'alarm').length;
  const qualityEvidenceCount = records.filter((record) => record.target === 'quality').length;
  const sourceLabel = formatWorkflowSourceLabel(sourceContext);
  const upstreamSourceLabel = formatWorkflowSourceLabel(upstreamSourceContext);
  const sourceReference = useMemo(() => {
    if (routedRecordType && routedRecordId) {
      return `${routedRecordType} ${routedRecordId}`;
    }
    return routedRecordType || routedRecordId || '';
  }, [routedRecordId, routedRecordType]);
  const activeLaneLabel = previewState === 'idle' ? 'Workflow-staged capture' : 'Live preview and capture';
  const activeLaneDetail =
    previewState === 'camera+mic'
      ? 'Camera and microphone are both live, so troubleshooting video and sound can be captured before routing evidence downstream.'
      : previewState === 'camera'
        ? 'Live camera preview is available for QR review, shop-floor mapping, and setup evidence while the capture ledger remains staged.'
        : 'Capture Ops is staged around mounted workflow context, upload fallbacks, manual QR routing, and the in-page evidence ledger.';
  const workflowPostureDetail = sourceLabel
    ? `Capture Ops was opened by ${sourceLabel}${upstreamSourceLabel ? ` with upstream continuity from ${upstreamSourceLabel}` : ''}${sourceReference ? ` for ${sourceReference}` : ''}.`
    : 'Capture Ops opened directly, so workflow continuity currently depends on the staged target, note, and return links on this desk.';
  const deviceReadyCount = deviceStatuses.filter((status) => status.supported).length;
  const previewPostureDetail = previewError
    ? `Live preview is degraded: ${previewError}`
    : previewState === 'idle'
      ? 'Live preview is idle. File capture, manual QR staging, and mobile device pickers remain available as fallbacks.'
      : `Live preview is active in ${previewState === 'camera+mic' ? 'camera + mic' : 'camera-only'} mode. ${scanMessage}`;
  const ledgerPostureDetail =
    records.length > 0
      ? `${records.length} records are staged in the local capture ledger, including ${photoCount} photos, ${mapCount} map captures, ${qrCount} QR events, and ${troubleshootingCount} troubleshooting records.`
      : 'No evidence is staged yet. The ledger will update as uploads, scans, and live captures are added.';

  async function startPreview(withAudio: boolean) {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPreviewError('This browser cannot open a live camera preview. Use the capture upload buttons instead.');
      setPreviewPostureRefreshedAt(Date.now());
      return;
    }

    setPreviewError(null);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: withAudio,
      });

      streamRef.current = stream;
      if (previewRef.current) {
        (previewRef.current as HTMLVideoElement & { srcObject?: MediaStream | null }).srcObject = stream;
      }
      setPreviewState(withAudio ? 'camera+mic' : 'camera');
      setScanMessage(withAudio ? 'Live video + mic preview is ready for troubleshooting capture.' : 'Live camera preview is ready for shop map or QR review.');
      setPreviewPostureRefreshedAt(Date.now());
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Camera preview could not start.');
      setPreviewState('idle');
      setPreviewPostureRefreshedAt(Date.now());
    }
  }

  function stopPreview() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (previewRef.current) {
      (previewRef.current as HTMLVideoElement & { srcObject?: MediaStream | null }).srcObject = null;
    }

    setPreviewState('idle');
    setPreviewError(null);
    setPreviewPostureRefreshedAt(Date.now());
  }

  function appendRecords(nextRecords: CaptureRecord[]) {
    setRecords((current) => [...nextRecords, ...current].slice(0, 18));
    setLedgerRefreshedAt(Date.now());
  }

  function stageFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    const nextRecords = Array.from(files).map<CaptureRecord>((file) => {
      const kind = fileKind(file);
      return {
        id: makeId(kind),
        title: file.name,
        kind,
        target,
        context: fileContext(target, jobId, machine, department),
        detail: `${kindLabel(kind)} staged for ${targetLabel(target).toLowerCase()} routing. ${note}`,
        createdAt: nowLabel(),
        tone: kindTone(kind),
      };
    });

    appendRecords(nextRecords);
  }

  function handleFileStage(event: ChangeEvent<HTMLInputElement>) {
    stageFiles(event.target.files);
    event.target.value = '';
  }

  function handleMapStage(event: ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const nextRecords = Array.from(event.target.files).map<CaptureRecord>((file) => ({
      id: makeId('map'),
      title: file.name,
      kind: 'map',
      target: 'machine',
      context: `${machine || 'Machine pending'} · ${zone || 'Zone pending'}`,
      detail: `Shop-floor map evidence staged for ${zone || 'the selected zone'} so machine position, aisle posture, and routing context can be recovered later.`,
      createdAt: nowLabel(),
      tone: 'emerald',
    }));

    appendRecords(nextRecords);
    event.target.value = '';
  }

  function stageManualScan() {
    if (!manualScan.trim()) {
      setScanMessage('Enter or scan a QR payload first.');
      setPreviewPostureRefreshedAt(Date.now());
      return;
    }

    setLatestScan(manualScan.trim());
    setScanMessage('QR payload staged into the capture ledger for downstream traveler and shop-floor routing.');
    setPreviewPostureRefreshedAt(Date.now());
    appendRecords([
      {
        id: makeId('qr'),
        title: 'QR payload capture',
        kind: 'qr',
        target: 'job',
        context: jobId || 'Job pending',
        detail: manualScan.trim(),
        createdAt: nowLabel(),
        tone: 'emerald',
      },
    ]);
  }

  async function detectQrFromPreview() {
    const Detector = barcodeDetectorConstructor();
    if (!Detector || !previewRef.current) {
      setScanMessage('Live QR decode is not available in this browser. Use the manual QR field instead.');
      setPreviewPostureRefreshedAt(Date.now());
      return;
    }

    try {
      const detector = new Detector({ formats: ['qr_code'] });
      const results = await detector.detect(previewRef.current);
      if (!results[0]?.rawValue) {
        setScanMessage('No QR code was detected in the current frame.');
        setPreviewPostureRefreshedAt(Date.now());
        return;
      }

      const payload = results[0].rawValue;
      setManualScan(payload);
      setLatestScan(payload);
      setScanMessage('QR frame decoded from the live preview and staged into the ledger.');
      setPreviewPostureRefreshedAt(Date.now());
      appendRecords([
        {
          id: makeId('qr'),
          title: 'Live QR frame',
          kind: 'qr',
          target: 'job',
          context: jobId || 'Job pending',
          detail: payload,
          createdAt: nowLabel(),
          tone: 'emerald',
        },
      ]);
    } catch (error) {
      setScanMessage(error instanceof Error ? error.message : 'QR decode failed on the current preview frame.');
      setPreviewPostureRefreshedAt(Date.now());
    }
  }

  const previewLabel =
    previewState === 'camera+mic'
      ? 'Camera + mic live'
      : previewState === 'camera'
        ? 'Camera live'
        : 'Preview idle';

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Camera, mic, and evidence operations"
        title="Capture Ops"
        description="Use one workspace for shop-floor mapping, photos of parts and prints, setup evidence, QR job scans, and video or sound capture for troubleshooting cutting parameters. This is the frontend convergence point for media flowing into jobs, machines, inventory, alarms, and learning."
        metrics={
          <>
            <SummaryTile
              label="Device posture"
              value={cameraSupported ? 'Live capture ready' : 'Upload fallback'}
              hint={cameraSupported ? 'Browser can open camera capture and shop-map preview.' : 'File capture still works for photos, video, and audio.'}
            />
            <SummaryTile
              label="Evidence staged"
              value={String(records.length)}
              hint={`${photoCount} photo records · ${troubleshootingCount} troubleshooting captures`}
              accent="from-violet-400/22 via-violet-300/10 to-transparent"
            />
            <SummaryTile
              label="QR posture"
              value={latestScan ? 'Last scan staged' : 'Ready for scan'}
              hint={latestScan ? latestScan : 'Use live QR decode when available, or manual staging when it is not.'}
              accent="from-emerald-400/22 via-emerald-300/10 to-transparent"
            />
            <SummaryTile
              label="Launch context"
              value={sourceLabel || 'Direct workspace'}
              hint={sourceLabel ? `${sourceLabel} opened Capture Ops with record-aware defaults.` : 'Capture Ops opened directly without upstream route context.'}
              accent="from-cyan-400/22 via-cyan-300/10 to-transparent"
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              Mobile devices can jump straight into camera capture using the photo, video, and audio pickers below. Desktop users can still drag files in or open a live preview for QR review and machine-map positioning.
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton onClick={() => void startPreview(false)} disabled={!cameraSupported}>
                Start camera preview
              </ActionButton>
              <ActionButton tone="emerald" onClick={() => void startPreview(true)} disabled={!cameraSupported || !microphoneSupported}>
                Start camera + mic
              </ActionButton>
              <ActionButton tone="rose" onClick={stopPreview} disabled={previewState === 'idle'}>
                Stop preview
              </ActionButton>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-4 text-sm text-slate-300">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Convergence note</div>
              <div className="mt-2">
                Claude-owned backend work should ultimately persist this media into job packets, machine registries, inventory documents, alarm troubleshooting evidence, and shop-learning signals without changing this page structure.
              </div>
            </div>
            {sourceLabel || sourceReference || routedCustomer || routedThreadId ? (
              <div className="rounded-[22px] border border-cyan-300/18 bg-cyan-300/[0.08] px-4 py-4 text-sm leading-6 text-cyan-50">
                {sourceLabel ? <>Context loaded from <span className="font-semibold">{sourceLabel}</span>. </> : <>Workflow context loaded. </>}
                {upstreamSourceLabel ? <>Upstream commercial origin: <span className="font-semibold">{upstreamSourceLabel}</span>. </> : null}
                {sourceReference ? <>Record: <span className="font-semibold">{sourceReference}</span>. </> : null}
                {routedCustomer ? <>Customer: <span className="font-semibold">{routedCustomer}</span>. </> : null}
                {routedThreadId ? <>Thread: <span className="font-semibold">{routedThreadId}</span>. </> : null}
                Target, record id, and capture note were prefilled so evidence stays attached to the workflow that launched it.
              </div>
            ) : null}
            <Link
              to={shopFloorPath}
              className="inline-flex rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.12] px-4 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-300/32 hover:bg-cyan-300/[0.18]"
            >
              Return to shop-floor clock
            </Link>
            <Link
              to={messagesPath}
              className="inline-flex rounded-2xl border border-sky-300/20 bg-sky-300/[0.12] px-4 py-3 text-sm font-semibold text-sky-50 transition hover:border-sky-300/32 hover:bg-sky-300/[0.18]"
            >
              Open Messages follow-up
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <AppwCaptureOpsCopilot
          deskLabel="Capture Ops"
          activeLaneLabel={activeLaneLabel}
          activeLaneDetail={activeLaneDetail}
          workflowSourceLabel={sourceLabel || 'Direct workspace'}
          upstreamSourceLabel={upstreamSourceLabel}
          workflowReference={sourceReference || routedJob || routedRecordId}
          contextCustomer={routedCustomer}
          contextThreadId={routedThreadId}
          targetLabel={targetLabel(target)}
          targetRecordId={jobId || routedRecordId}
          department={department}
          machine={machine}
          zone={zone}
          note={note}
          previewState={previewLabel}
          previewError={previewError}
          scanMessage={scanMessage}
          latestScan={latestScan}
          cameraSupported={cameraSupported}
          microphoneSupported={microphoneSupported}
          scannerSupported={scannerSupported}
          recordCount={records.length}
          photoCount={photoCount}
          videoCount={videoCount}
          audioCount={audioCount}
          documentCount={documentCount}
          qrCount={qrCount}
          mapCount={mapCount}
          alarmEvidenceCount={troubleshootingCount}
          qualityEvidenceCount={qualityEvidenceCount}
          routeContextRefreshedAt={routeContextRefreshedAt}
          devicePostureRefreshedAt={devicePostureRefreshedAt}
          previewPostureRefreshedAt={previewPostureRefreshedAt}
          ledgerRefreshedAt={ledgerRefreshedAt}
        />

        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
          <div className="mb-4 space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/65">Command-surface truth</div>
            <div className="text-xl font-semibold text-slate-50">Capture posture</div>
            <div className="max-w-2xl text-sm text-slate-400">
              Keep workflow continuity, device capability, live preview state, and staged evidence explicit so capture work stays reliable even when browser capabilities vary by device.
            </div>
          </div>
          <div className="grid gap-3">
            <CaptureSourcePostureCard
              label="Mounted workflow continuity"
              detail={workflowPostureDetail}
              statusLabel={sourceLabel ? 'Mounted' : 'Direct'}
              toneClass={sourceLabel ? 'border-cyan-300/20 bg-cyan-300/10 text-cyan-50' : 'border-slate-400/18 bg-slate-400/8 text-slate-200'}
              metaLabel={`Route ${formatRefreshLabel(routeContextRefreshedAt)}`}
            />
            <CaptureSourcePostureCard
              label="Browser device posture"
              detail={`${deviceReadyCount}/3 device lanes are ready. Camera: ${cameraSupported ? 'ready' : 'fallback'}. Mic: ${microphoneSupported ? 'ready' : 'fallback'}. QR decode: ${scannerSupported ? 'ready' : 'manual fallback'}.`}
              statusLabel={deviceReadyCount === 3 ? 'Ready' : deviceReadyCount > 0 ? 'Partial' : 'Fallback'}
              toneClass={
                deviceReadyCount === 3
                  ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-50'
                  : deviceReadyCount > 0
                    ? 'border-amber-300/20 bg-amber-300/10 text-amber-50'
                    : 'border-rose-300/20 bg-rose-300/10 text-rose-50'
              }
              metaLabel={`Devices ${formatRefreshLabel(devicePostureRefreshedAt)}`}
            />
            <CaptureSourcePostureCard
              label="Live preview and scan posture"
              detail={previewPostureDetail}
              statusLabel={previewError ? 'Degraded' : previewState === 'idle' ? 'Idle' : 'Live'}
              toneClass={
                previewError
                  ? 'border-rose-300/20 bg-rose-300/10 text-rose-50'
                  : previewState === 'idle'
                    ? 'border-amber-300/20 bg-amber-300/10 text-amber-50'
                    : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-50'
              }
              metaLabel={`Preview ${formatRefreshLabel(previewPostureRefreshedAt)}`}
            />
            <CaptureSourcePostureCard
              label="Evidence ledger coverage"
              detail={ledgerPostureDetail}
              statusLabel={records.length > 0 ? 'Staged' : 'Waiting'}
              toneClass={records.length > 0 ? 'border-violet-300/20 bg-violet-300/10 text-violet-50' : 'border-slate-400/18 bg-slate-400/8 text-slate-200'}
              metaLabel={`Ledger ${formatRefreshLabel(ledgerRefreshedAt)}`}
            />
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <div className="space-y-6">
          <PanelCard title="Live device posture" subtitle="Open a live preview for QR review, shop-floor mapping, or fast setup confirmation while keeping file-capture fallback available for every device.">
            <div className="grid gap-3 md:grid-cols-3">
              {deviceStatuses.map((status) => (
                <div key={status.label} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-50">{status.label}</div>
                    <StatusPill label={status.supported ? 'Ready' : 'Fallback'} tone={status.tone} />
                  </div>
                  <div className="mt-3 text-sm leading-6 text-slate-300">{status.detail}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
              <div className="overflow-hidden rounded-[26px] border border-white/10 bg-black/25">
                <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Preview state</div>
                    <div className="mt-2 text-lg font-semibold text-slate-50">{previewLabel}</div>
                  </div>
                  <StatusPill label={previewState === 'idle' ? 'Idle' : 'Streaming'} tone={previewState === 'idle' ? 'amber' : 'emerald'} />
                </div>
                <div className="aspect-[16/10] bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_42%),linear-gradient(180deg,rgba(4,8,13,0.92)_0%,rgba(2,4,7,0.98)_100%)] p-4">
                  <video ref={previewRef} muted playsInline autoPlay className="h-full w-full rounded-[22px] border border-white/8 bg-slate-950/80 object-cover" />
                </div>
              </div>

              <div className="space-y-4 rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
                <Field label="Target record">
                  <Select value={target} onChange={(event) => setTarget(event.target.value as CaptureTarget)}>
                    <option value="job">Job packet</option>
                    <option value="machine">Machine registry</option>
                    <option value="inventory">Inventory population</option>
                    <option value="quality">Quality / setup evidence</option>
                    <option value="alarm">Alarm / troubleshooting</option>
                  </Select>
                </Field>
                <Field label="Job or record id">
                  <Input value={jobId} onChange={(event) => setJobId(event.target.value)} placeholder="JOB-4821" />
                </Field>
                <Field label="Department">
                  <Input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Machining" />
                </Field>
                <Field label="Machine or cell">
                  <Input value={machine} onChange={(event) => setMachine(event.target.value)} placeholder="MC-04" />
                </Field>
                <Field label="Capture note">
                  <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Why this media matters..." />
                </Field>
              </div>
            </div>
            {previewError ? (
              <div className="mt-4 rounded-[22px] border border-rose-300/20 bg-rose-300/10 px-4 py-4 text-sm leading-6 text-rose-100">
                {previewError}
              </div>
            ) : null}
          </PanelCard>

          <PanelCard title="QR and traveler capture" subtitle="Scan QR codes directly when the browser supports it, or keep the same job packet flowing through manual QR staging when it does not.">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.85fr)]">
              <div className="space-y-4">
                <Field label="Manual or scanned QR payload">
                  <Input
                    value={manualScan}
                    onChange={(event) => setManualScan(event.target.value)}
                    placeholder="PRISMJOB|job=JOB-4821|machine=MC-04|department=Machining"
                    aria-label="QR payload input"
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <ActionButton onClick={stageManualScan}>Stage QR payload</ActionButton>
                  <ActionButton tone="emerald" onClick={() => void detectQrFromPreview()} disabled={previewState === 'idle' || !scannerSupported}>
                    Scan live frame
                  </ActionButton>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-black/20 px-4 py-4 text-sm leading-6 text-slate-300">
                  {scanMessage}
                </div>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Suggested uses</div>
                <div className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
                  <div>Scan job travelers straight from the phone camera instead of bouncing to another app.</div>
                  <div>Decode machine-placed QR tags for setup packs, inspection fixtures, or maintenance instructions.</div>
                  <div>Keep a manual QR fallback so floor execution never stalls on browser capability differences.</div>
                </div>
              </div>
            </div>
          </PanelCard>

          <PanelCard title="Job, print, and setup evidence" subtitle="Capture parts, drawings, setups, and packet attachments so the same job record can keep visual context for proving out and troubleshooting later.">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300">
                <div className="text-sm font-semibold text-slate-50">Photo / print / setup files</div>
                <div className="mt-2">Use the device camera on mobile, or stage images, PDFs, and scans on desktop.</div>
                <input
                  aria-label="Photo / print / setup files"
                  className="mt-4 block w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                  type="file"
                  accept="image/*,.pdf,.png,.jpg,.jpeg,.tif,.tiff"
                  multiple
                  capture="environment"
                  onChange={handleFileStage}
                />
              </label>

              <label className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300">
                <div className="text-sm font-semibold text-slate-50">Packet docs and machine files</div>
                <div className="mt-2">Stage prints, setup sheets, spreadsheets, certs, or CAD-adjacent packet files for later routing.</div>
                <input
                  aria-label="Packet docs and machine files"
                  className="mt-4 block w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                  type="file"
                  accept=".pdf,.csv,.xlsx,.txt,.zip,.dwg,.dxf,.step,.stp,.iges,.igs"
                  multiple
                  onChange={handleFileStage}
                />
              </label>
            </div>
          </PanelCard>
        </div>

        <div className="space-y-6">
          <PanelCard title="Shop map and machine registry" subtitle="Use the camera to build a visual shop-floor map and document where machines, fixtures, and aisle constraints actually live.">
            <Field label="Zone or aisle">
              <Input value={zone} onChange={(event) => setZone(event.target.value)} placeholder="Cell A / Aisle 3" />
            </Field>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Machine tag">
                <Input value={machine} onChange={(event) => setMachine(event.target.value)} placeholder="MC-04" />
              </Field>
              <Field label="Department">
                <Input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Machining" />
              </Field>
            </div>
            <label className="mt-4 block rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300">
              <div className="text-sm font-semibold text-slate-50">Shop-floor map captures</div>
              <div className="mt-2">Take aisle, machine, fixture staging, and safety-envelope photos so routing and setup planning can reference the real floor layout.</div>
              <input
                aria-label="Shop-floor map captures"
                className="mt-4 block w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={handleMapStage}
              />
            </label>
          </PanelCard>

          <PanelCard title="Troubleshooting video and sound" subtitle="Capture audio or video evidence for chatter, coolant issues, bad harmonics, or other machine behavior that should feed alarm and cutting-parameter review.">
            <div className="grid gap-4">
              <label className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300">
                <div className="text-sm font-semibold text-slate-50">Video evidence</div>
                <div className="mt-2">Record machine motion, coolant delivery, fixturing, chip evacuation, or prove-out behavior.</div>
                <input
                  aria-label="Troubleshooting video files"
                  className="mt-4 block w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                  type="file"
                  accept="video/*"
                  multiple
                  capture="environment"
                  onChange={handleFileStage}
                />
              </label>
              <label className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300">
                <div className="text-sm font-semibold text-slate-50">Audio evidence</div>
                <div className="mt-2">Record spindle sound, chatter, squeal, or coolant anomalies so feeds and speeds can be reviewed with context.</div>
                <input
                  aria-label="Troubleshooting audio files"
                  className="mt-4 block w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                  type="file"
                  accept="audio/*"
                  multiple
                  capture="user"
                  onChange={handleFileStage}
                />
              </label>
            </div>
          </PanelCard>

          <PanelCard title="Capture ledger" subtitle="Everything staged here is organized so future backend pipelines can route it into the right records instead of losing tribal knowledge in phones and camera rolls.">
            <div className="space-y-3" data-testid="capture-ledger">
              {records.map((record) => (
                <div key={record.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-50">{record.title}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                        {targetLabel(record.target)} · {record.context}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill label={kindLabel(record.kind)} tone={record.tone} />
                      <span className="text-xs uppercase tracking-[0.16em] text-slate-500">{record.createdAt}</span>
                    </div>
                  </div>
                  <div className="mt-3 text-sm leading-6 text-slate-300">{record.detail}</div>
                </div>
              ))}
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
