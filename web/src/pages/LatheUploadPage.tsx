import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActionButton,
  PanelCard,
  SummaryTile,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

// ── File type classification ────────────────────────────────────────────────

type FileRoute = 'photo' | 'cad' | 'pdf' | 'unknown';

const PHOTO_EXT = new Set(['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'tif', 'webp', 'heic']);
const CAD_EXT = new Set(['step', 'stp', 'iges', 'igs', 'dxf', 'sat', 'x_t', 'x_b']);
const PDF_EXT = new Set(['pdf']);

function classifyFile(name: string): FileRoute {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (PHOTO_EXT.has(ext)) return 'photo';
  if (CAD_EXT.has(ext)) return 'cad';
  if (PDF_EXT.has(ext)) return 'pdf';
  return 'unknown';
}

function routeLabel(route: FileRoute): string {
  switch (route) {
    case 'photo': return 'Reading your drawing with OCR...';
    case 'cad': return 'Importing 3D model...';
    case 'pdf': return 'Extracting dimensions from PDF...';
    default: return 'Processing file...';
  }
}

function routeIcon(route: FileRoute): string {
  switch (route) {
    case 'photo': return '\u{1F4F7}';
    case 'cad': return '\u{1F4D0}';
    case 'pdf': return '\u{1F4C4}';
    default: return '\u{1F4CE}';
  }
}

const ACCEPT = [
  ...Array.from(PHOTO_EXT).map(e => `.${e}`),
  ...Array.from(CAD_EXT).map(e => `.${e}`),
  ...Array.from(PDF_EXT).map(e => `.${e}`),
].join(',');

// ── Upload stages ───────────────────────────────────────────────────────────

type Stage = 'idle' | 'detecting' | 'processing' | 'done' | 'error';

interface UploadState {
  stage: Stage;
  fileName: string | null;
  fileRoute: FileRoute;
  stageLabel: string;
  errorMessage: string | null;
}

const INITIAL_STATE: UploadState = {
  stage: 'idle',
  fileName: null,
  fileRoute: 'unknown',
  stageLabel: '',
  errorMessage: null,
};

// ── Component ───────────────────────────────────────────────────────────────

export function LatheUploadPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>(INITIAL_STATE);
  const [dragOver, setDragOver] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      const route = classifyFile(file.name);
      if (route === 'unknown') {
        setState({
          stage: 'error',
          fileName: file.name,
          fileRoute: 'unknown',
          stageLabel: '',
          errorMessage: `"${file.name}" is not a supported file type. Upload a photo (JPG, PNG), 3D model (STEP, IGES, DXF), or PDF.`,
        });
        return;
      }

      setState({
        stage: 'detecting',
        fileName: file.name,
        fileRoute: route,
        stageLabel: `Detected: ${route === 'photo' ? 'Engineering drawing photo' : route === 'cad' ? '3D CAD model' : 'PDF document'}`,
        errorMessage: null,
      });

      // Simulate brief detection stage, then move to processing
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          stage: 'processing',
          stageLabel: routeLabel(route),
        }));

        // In production this calls the backend. For now, navigate to wizard after a brief delay.
        setTimeout(() => {
          setState(prev => ({ ...prev, stage: 'done', stageLabel: 'Ready!' }));
          navigate('/lathe/wizard', {
            state: {
              fileName: file.name,
              fileRoute: route,
              fileSize: file.size,
            },
          });
        }, 800);
      }, 400);
    },
    [navigate],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleReset = useCallback(() => {
    setState(INITIAL_STATE);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const isProcessing = state.stage === 'detecting' || state.stage === 'processing';

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Upload your part"
        title="Turning Program Generator"
        description="Drop a photo of your engineering drawing, upload a 3D CAD file, or import a PDF. We'll extract all the dimensions and create a CNC turning program for you."
        metrics={
          <>
            <SummaryTile label="Supported inputs" value="3 types" hint="Photo, 3D model, or PDF" />
            <SummaryTile
              label="Output"
              value="CNC Program"
              hint="G-code + setup sheet + physics report"
              accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
            />
          </>
        }
      />

      <PanelCard title="Upload Your Drawing or Model">
        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={handleFileInput}
          aria-label="Upload engineering drawing or CAD file"
        />

        {state.stage === 'idle' ? (
          <div
            role="button"
            tabIndex={0}
            className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
              dragOver
                ? 'border-blue-400 bg-blue-500/10'
                : 'border-zinc-600 bg-zinc-800/40 hover:border-zinc-400 hover:bg-zinc-800/60'
            }`}
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => inputRef.current?.click()}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
          >
            <div className="mb-3 text-4xl opacity-60">{dragOver ? '\u{2B07}\u{FE0F}' : '\u{1F4CB}'}</div>
            <p className="text-lg font-medium text-zinc-200">
              {dragOver ? 'Drop your file here' : 'Drag & drop your file here'}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              or click to browse — JPG, PNG, STEP, IGES, DXF, PDF
            </p>
          </div>
        ) : state.stage === 'error' ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-red-500/50 bg-red-900/10">
            <p className="mb-2 text-lg font-medium text-red-300">Unsupported file</p>
            <p className="max-w-md text-center text-sm text-zinc-400">{state.errorMessage}</p>
            <ActionButton className="mt-4" onClick={handleReset}>
              Try again
            </ActionButton>
          </div>
        ) : (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-500/40 bg-emerald-900/10">
            <div className="mb-2 text-3xl">{routeIcon(state.fileRoute)}</div>
            <p className="text-lg font-medium text-zinc-200">{state.fileName}</p>
            <p className="mt-1 text-sm text-emerald-300">{state.stageLabel}</p>
            {isProcessing && (
              <div className="mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-zinc-700">
                <div className="h-full animate-pulse rounded-full bg-emerald-400" style={{ width: state.stage === 'detecting' ? '40%' : '80%' }} />
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
          <StepCard number={1} title="Upload" description="Drop a photo, 3D model, or PDF of your part drawing." />
          <StepCard number={2} title="Confirm Details" description="Review the extracted dimensions, pick material and quality level." />
          <StepCard number={3} title="Get Your Program" description="Download the CNC program, setup sheet, and physics report." />
        </div>
      </PanelCard>
    </div>
  );
}

function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-zinc-800/40 p-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-sm font-bold text-blue-300">
        {number}
      </span>
      <div>
        <p className="font-medium text-zinc-200">{title}</p>
        <p className="mt-0.5 text-sm text-zinc-400">{description}</p>
      </div>
    </div>
  );
}
