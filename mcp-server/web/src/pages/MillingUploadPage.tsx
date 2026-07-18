/**
 * MillingUploadPage — File upload entry point for milling program generation.
 *
 * Accepts: STEP, IGES, STL, DXF, PDF, photo (JPG/PNG)
 * Route: POST /api/v1/milling/upload
 * Navigates to /milling/wizard with extracted feature data.
 *
 * MILL-WEB M1: U-MWUP01
 */

import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, uploadMillingFile } from '../api/client';
import {
  ActionButton,
  PanelCard,
  SummaryTile,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

// ── File classification ──────────────────────────────────────────────────────

type MillingFileRoute = 'photo' | 'cad' | 'stl' | 'pdf' | 'unknown';

const PHOTO_EXT = new Set(['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'tif', 'webp', 'heic']);
const CAD_EXT   = new Set(['step', 'stp', 'iges', 'igs', 'dxf', 'sat', 'x_t', 'x_b']);
const STL_EXT   = new Set(['stl']);
const PDF_EXT   = new Set(['pdf']);

function classifyMillingFile(name: string): MillingFileRoute {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (PHOTO_EXT.has(ext)) return 'photo';
  if (CAD_EXT.has(ext))   return 'cad';
  if (STL_EXT.has(ext))   return 'stl';
  if (PDF_EXT.has(ext))   return 'pdf';
  return 'unknown';
}

function routeLabel(route: MillingFileRoute): string {
  switch (route) {
    case 'photo': return 'Reading engineering drawing with OCR...';
    case 'cad':   return 'Importing 3D model and detecting features...';
    case 'stl':   return 'Parsing STL mesh and estimating operations...';
    case 'pdf':   return 'Extracting dimensions and notes from PDF...';
    default:      return 'Processing file...';
  }
}

function routeDescription(route: MillingFileRoute): string {
  switch (route) {
    case 'photo': return 'Engineering drawing photo detected';
    case 'cad':   return '3D CAD model detected';
    case 'stl':   return 'STL mesh file detected';
    case 'pdf':   return 'PDF print detected';
    default:      return 'File detected';
  }
}

const ACCEPT = [
  ...Array.from(PHOTO_EXT).map(e => `.${e}`),
  ...Array.from(CAD_EXT).map(e => `.${e}`),
  ...Array.from(STL_EXT).map(e => `.${e}`),
  ...Array.from(PDF_EXT).map(e => `.${e}`),
].join(',');

// ── Stage ────────────────────────────────────────────────────────────────────

type Stage = 'idle' | 'detecting' | 'processing' | 'done' | 'error';

interface UploadState {
  stage: Stage;
  fileName: string | null;
  fileRoute: MillingFileRoute;
  stageLabel: string;
  errorTitle: string | null;
  errorMessage: string | null;
}

const INITIAL_STATE: UploadState = {
  stage: 'idle',
  fileName: null,
  fileRoute: 'unknown',
  stageLabel: '',
  errorTitle: null,
  errorMessage: null,
};

function asRecord(value: unknown) {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

// ── Component ────────────────────────────────────────────────────────────────

export function MillingUploadPage() {
  const navigate   = useNavigate();
  const inputRef   = useRef<HTMLInputElement>(null);
  const [state, setState]     = useState<UploadState>(INITIAL_STATE);
  const [dragOver, setDragOver] = useState(false);

  const processFile = useCallback((file: File) => {
    const route = classifyMillingFile(file.name);
    if (route === 'unknown') {
      setState({
        stage: 'error',
        fileName: file.name,
        fileRoute: 'unknown',
        stageLabel: '',
        errorTitle: 'Unsupported file type',
        errorMessage: `"${file.name}" is not a supported file type. Upload a photo (JPG, PNG), 3D model (STEP, IGES, DXF), mesh (STL), or PDF print.`,
      });
      return;
    }

    setState({
      stage: 'detecting',
      fileName: file.name,
      fileRoute: route,
      stageLabel: routeDescription(route),
      errorTitle: null,
      errorMessage: null,
    });

    const reader = new FileReader();
    reader.onload = async () => {
      setState(prev => ({
        ...prev,
        stage: 'processing',
        stageLabel: routeLabel(route),
      }));

      try {
        const base64 = (reader.result as string).split(',')[1] ?? '';
        const fileType = route === 'stl' ? 'stl' : route === 'photo' ? 'photo' : route === 'pdf' ? 'pdf' : 'cad';
        const response = await uploadMillingFile({
          fileName: file.name,
          fileData: base64,
          fileType,
        });
        const extractedData = asRecord(response);

        if (!extractedData || Object.keys(extractedData).length === 0) {
          setState(prev => ({
            ...prev,
            stage: 'error',
            stageLabel: '',
            errorTitle: 'Milling intake unavailable',
            errorMessage:
              'The live milling upload route returned no usable extracted data. The page stays here instead of implying a routed wizard handoff.',
          }));
          return;
        }

        setState(prev => ({ ...prev, stage: 'done', stageLabel: 'Ready!' }));
        navigate('/milling/wizard', {
          state: {
            fileName: file.name,
            fileRoute: route,
            fileSize: file.size,
            extractedData,
          },
        });
      } catch (issue) {
        setState(prev => ({
          ...prev,
          stage: 'error',
          stageLabel: '',
          errorTitle: 'Milling intake unavailable',
          errorMessage:
            issue instanceof ApiError
              ? issue.message
              : 'The milling upload route is unavailable right now. The page stays here instead of implying extracted milling data.',
        }));
      }
    };
    reader.onerror = () => {
      setState(prev => ({
        ...prev,
        stage: 'error',
        stageLabel: '',
        errorTitle: 'Read failed',
        errorMessage: 'Failed to read the selected file.',
      }));
    };
    reader.readAsDataURL(file);
  }, [navigate]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleReset = useCallback(() => {
    setState(INITIAL_STATE);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const isProcessing = state.stage === 'detecting' || state.stage === 'processing';

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Upload your part"
        title="Milling Program Generator"
        description="Drop a photo of your engineering drawing, upload a 3D CAD file (STEP/IGES/DXF), STL mesh, or PDF print. Kienzle will detect features, recommend strategies, and generate your CNC milling program."
        metrics={
          <>
            <SummaryTile label="Supported inputs" value="4 types" hint="Photo, CAD, STL, PDF" />
            <SummaryTile
              label="Output"
              value="CNC Program"
              hint="G-code + setup sheet + physics report"
              accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
            />
            <SummaryTile
              label="Machines"
              value="4 mills"
              hint="Haas, Hurco, Roku-Roku, Okuma MU"
              accent="from-violet-400/22 via-violet-300/8 to-transparent"
            />
          </>
        }
      />

      <PanelCard title="Upload Your Drawing or Model">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={handleFileInput}
          aria-label="Upload milling drawing or CAD file"
        />

        {state.stage === 'idle' ? (
          <div
            role="button"
            tabIndex={0}
            className={`flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
              dragOver
                ? 'border-violet-400 bg-violet-500/10'
                : 'border-zinc-600 bg-zinc-800/40 hover:border-zinc-400 hover:bg-zinc-800/60'
            }`}
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => inputRef.current?.click()}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
          >
            <div className="mb-3 text-5xl opacity-60">
              {dragOver ? '\u{2B07}' : '\u{1F5C2}'}
            </div>
            <p className="text-lg font-medium text-zinc-200">
              {dragOver ? 'Drop your file here' : 'Drag & drop your milling file here'}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              or click to browse
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              JPG, PNG, STEP, IGES, DXF, STL, PDF
            </p>
          </div>
        ) : state.stage === 'error' ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-red-500/50 bg-red-900/10">
            <p className="mb-2 text-lg font-medium text-red-300">
              {state.errorTitle ?? 'Milling intake unavailable'}
            </p>
            <p className="max-w-md text-center text-sm text-zinc-400">{state.errorMessage}</p>
            <ActionButton className="mt-4" onClick={handleReset}>
              Try again
            </ActionButton>
          </div>
        ) : (
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-violet-500/40 bg-violet-900/10">
            <p className="text-lg font-medium text-zinc-200">{state.fileName}</p>
            <p className="mt-1 text-sm text-violet-300">{state.stageLabel}</p>
            {isProcessing && (
              <div className="mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-zinc-700">
                <div
                  className="h-full animate-pulse rounded-full bg-violet-400"
                  style={{ width: state.stage === 'detecting' ? '35%' : '75%' }}
                />
              </div>
            )}
            {!isProcessing && (
              <ActionButton className="mt-4" onClick={handleReset}>
                Upload a different file
              </ActionButton>
            )}
          </div>
        )}
      </PanelCard>

      <PanelCard title="How It Works">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StepCard
            number={1}
            title="Upload"
            description="Drop a photo, 3D CAD model, STL mesh, or PDF print of your milled part."
          />
          <StepCard
            number={2}
            title="Configure"
            description="Choose material, machine, strategy, and quality tier in the 5-step wizard."
          />
          <StepCard
            number={3}
            title="Generate"
            description="Download the CNC milling program, setup sheet, and physics report."
          />
        </div>
      </PanelCard>

      <PanelCard title="Supported Machines — JM Die Shop">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MACHINE_CARDS.map(m => (
            <div key={m.id} className="rounded-lg border border-zinc-700/60 bg-zinc-800/40 p-3">
              <p className="text-sm font-semibold text-zinc-200">{m.label}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{m.controller}</p>
              <p className="mt-1 text-[11px] text-violet-300">{m.axes}</p>
            </div>
          ))}
        </div>
      </PanelCard>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StepCard({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-zinc-800/40 p-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-sm font-bold text-violet-300">
        {number}
      </span>
      <div>
        <p className="font-medium text-zinc-200">{title}</p>
        <p className="mt-0.5 text-sm text-zinc-400">{description}</p>
      </div>
    </div>
  );
}

const MACHINE_CARDS = [
  { id: 'haas',      label: 'Haas VF-2',        controller: 'Haas NGC',     axes: '3-axis VMC' },
  { id: 'hurco',     label: 'Hurco VM10i',       controller: 'WinMax',       axes: '3-axis VMC' },
  { id: 'roku',      label: 'Roku-Roku RB-630',  controller: 'Fanuc 0i-MD',  axes: '3-axis VMC' },
  { id: 'okuma-mu',  label: 'Okuma MU-400V',     controller: 'OSP-P300M',    axes: '5-axis VMC' },
];
