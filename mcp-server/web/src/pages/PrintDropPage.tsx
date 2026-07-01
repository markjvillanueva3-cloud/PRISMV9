/**
 * PrintDropPage — Drag-and-Drop Print Classification
 *
 * Allows operators to drop engineering prints (PDFs, images) and
 * automatically classify the required machine type using
 * MachineTypeClassifierEngine with OCR and CAD feature inference.
 *
 * @milestone LATHE-PROD-READY-MS0 U-LPR06
 */

import { useCallback, useMemo, useState } from 'react';
import { WorkspaceRecoveryScaffold } from '../components/workspace/WorkspaceRecoveryScaffold';
import {
  ActionButton,
  Field,
  PanelCard,
  Select,
  StatusPill,
} from '../components/workspace/WorkspacePrimitives';
import { formatJsonPreview } from './recovery/recoveryUtils';

// ============================================================================
// TYPES
// ============================================================================

type MachineTypeClass =
  | 'lathe'
  | 'mill_3axis'
  | 'mill_5axis'
  | 'mill_turn'
  | 'wire_edm'
  | 'sinker_edm'
  | 'swiss'
  | 'grinder'
  | 'multi_machine'
  | 'unknown';

interface ClassificationResult {
  machineType: MachineTypeClass;
  confidence: number;
  alternativeMachines: Array<{ type: MachineTypeClass; confidence: number }>;
  features: {
    turningFeatures: number;
    millingFeatures: number;
    drillingFeatures: number;
    edmFeatures: number;
  };
  titleBlockData?: {
    partNumber?: string;
    material?: string;
    finish?: string;
    toleranceClass?: string;
  };
  reasoning: string[];
}

interface UploadState {
  file: File | null;
  preview: string | null;
  uploading: boolean;
  classifying: boolean;
  result: ClassificationResult | null;
  error: string | null;
}

// ============================================================================
// MACHINE TYPE DISPLAY CONFIG
// ============================================================================

const MACHINE_TYPE_CONFIG: Record<MachineTypeClass, { label: string; color: string; icon: string }> = {
  lathe: { label: 'CNC Lathe', color: 'cyan', icon: '🔄' },
  mill_3axis: { label: '3-Axis Mill', color: 'emerald', icon: '🏭' },
  mill_5axis: { label: '5-Axis Mill', color: 'violet', icon: '⚙️' },
  mill_turn: { label: 'Mill-Turn', color: 'amber', icon: '🔧' },
  wire_edm: { label: 'Wire EDM', color: 'sky', icon: '⚡' },
  sinker_edm: { label: 'Sinker EDM', color: 'indigo', icon: '🔌' },
  swiss: { label: 'Swiss Lathe', color: 'teal', icon: '🎯' },
  grinder: { label: 'Grinder', color: 'rose', icon: '💎' },
  multi_machine: { label: 'Multi-Machine', color: 'orange', icon: '🔀' },
  unknown: { label: 'Unknown', color: 'slate', icon: '❓' },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function PrintDropPage() {
  const [state, setState] = useState<UploadState>({
    file: null,
    preview: null,
    uploading: false,
    classifying: false,
    result: null,
    error: null,
  });

  const [dragActive, setDragActive] = useState(false);
  const [outputFormat, setOutputFormat] = useState<'summary' | 'detailed' | 'json'>('summary');

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff'];
    if (!validTypes.includes(file.type)) {
      setState(prev => ({
        ...prev,
        error: `Invalid file type: ${file.type}. Supported: PDF, PNG, JPEG, TIFF`,
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setState(prev => ({
        ...prev,
        file,
        preview: e.target?.result as string,
        error: null,
        result: null,
      }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleClassify = useCallback(async () => {
    if (!state.file) return;

    setState(prev => ({ ...prev, classifying: true, error: null }));

    try {
      const formData = new FormData();
      formData.append('file', state.file);

      const response = await fetch('/api/v1/print/classify', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Classification failed: ${response.status}`);
      }

      const result: ClassificationResult = await response.json();
      setState(prev => ({ ...prev, result, classifying: false }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        classifying: false,
        error: err instanceof Error ? err.message : 'Classification failed',
      }));
    }
  }, [state.file]);

  const handleClear = useCallback(() => {
    setState({
      file: null,
      preview: null,
      uploading: false,
      classifying: false,
      result: null,
      error: null,
    });
  }, []);

  const metrics = useMemo(() => [
    {
      label: 'File',
      value: state.file?.name ?? 'None',
      hint: state.file ? `${(state.file.size / 1024).toFixed(1)} KB` : 'Drop a print',
      accent: 'from-cyan-400/22 via-cyan-300/10 to-transparent',
    },
    {
      label: 'Machine Type',
      value: state.result ? MACHINE_TYPE_CONFIG[state.result.machineType].label : 'Pending',
      hint: state.result ? `${(state.result.confidence * 100).toFixed(0)}% confidence` : 'Awaiting classification',
      accent: 'from-emerald-400/22 via-emerald-300/10 to-transparent',
    },
    {
      label: 'Status',
      value: state.classifying ? 'Classifying...' : state.result ? 'Classified' : 'Ready',
      hint: state.error ?? 'OCR + CAD inference',
      accent: 'from-amber-400/22 via-amber-300/10 to-transparent',
    },
  ], [state]);

  const aiContext = useMemo(() => ({
    workspace: 'print-drop',
    file_name: state.file?.name,
    file_type: state.file?.type,
    classification_result: state.result,
    has_error: !!state.error,
  }), [state]);

  return (
    <WorkspaceRecoveryScaffold
      eyebrow="Print classification"
      title="Print Drop"
      description="Drop an engineering print (PDF or image) to automatically classify the required machine type. Uses OCR for title block extraction and CAD feature inference for intelligent routing."
      surfaces={['printClassify']}
      metrics={metrics}
      aiSummary="Kienzle AI can explain the classification reasoning, suggest alternative machine setups, and identify potential manufacturing challenges."
      aiContext={aiContext}
      suggestions={[
        {
          id: 'explain-classification',
          label: 'Explain classification',
          query: 'Explain why this print was classified for this machine type and what features drove the decision.',
        },
        {
          id: 'suggest-alternatives',
          label: 'Suggest alternatives',
          query: 'What alternative machines could produce this part, and what are the tradeoffs?',
        },
      ]}
    >
      {/* Drop Zone */}
      <PanelCard title="Print upload" subtitle="Drag and drop or click to select an engineering print">
        <div
          className={`
            relative flex min-h-[240px] cursor-pointer flex-col items-center justify-center
            rounded-2xl border-2 border-dashed transition-all
            ${dragActive
              ? 'border-cyan-400 bg-cyan-400/10'
              : 'border-white/20 bg-slate-950/50 hover:border-cyan-300/40 hover:bg-slate-900/60'
            }
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif"
            onChange={handleFileInput}
            className="hidden"
          />

          {state.preview && state.file?.type.startsWith('image/') ? (
            <img
              src={state.preview}
              alt="Print preview"
              className="max-h-[200px] max-w-full rounded-lg object-contain"
            />
          ) : state.file ? (
            <div className="text-center">
              <div className="text-4xl">📄</div>
              <p className="mt-2 text-sm text-slate-300">{state.file.name}</p>
              <p className="text-xs text-slate-500">{(state.file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-4xl opacity-50">📥</div>
              <p className="mt-3 text-sm text-slate-400">
                Drop engineering print here
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Supports PDF, PNG, JPEG, TIFF
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ActionButton
            onClick={() => void handleClassify()}
            disabled={!state.file || state.classifying}
          >
            {state.classifying ? 'Classifying...' : 'Classify Print'}
          </ActionButton>
          <ActionButton onClick={handleClear} tone="slate" disabled={!state.file}>
            Clear
          </ActionButton>
          <Field label="Output" className="ml-auto w-32">
            <Select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value as typeof outputFormat)}
            >
              <option value="summary">Summary</option>
              <option value="detailed">Detailed</option>
              <option value="json">JSON</option>
            </Select>
          </Field>
        </div>

        {state.error && (
          <div className="mt-4 rounded-2xl border border-rose-300/18 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-100">
            {state.error}
          </div>
        )}
      </PanelCard>

      {/* Classification Result */}
      {state.result && (
        <div className="grid gap-6 lg:grid-cols-2">
          <PanelCard title="Classification result" subtitle="Machine type determined from print analysis">
            <div className="space-y-4">
              {/* Primary Classification */}
              <div className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <span className="text-4xl">{MACHINE_TYPE_CONFIG[state.result.machineType].icon}</span>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {MACHINE_TYPE_CONFIG[state.result.machineType].label}
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-700">
                      <div
                        className="h-full bg-cyan-400 transition-all"
                        style={{ width: `${state.result.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-slate-400">
                      {(state.result.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                </div>
              </div>

              {/* Alternative Machines */}
              {state.result.alternativeMachines.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Alternative Options
                  </h4>
                  {state.result.alternativeMachines.map((alt, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                      <span className="text-sm text-slate-300">
                        {MACHINE_TYPE_CONFIG[alt.type].icon} {MACHINE_TYPE_CONFIG[alt.type].label}
                      </span>
                      <span className="text-xs text-slate-500">
                        {(alt.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Reasoning */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Classification Reasoning
                </h4>
                <ul className="space-y-1 text-sm text-slate-400">
                  {state.result.reasoning.map((reason, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-cyan-400">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </PanelCard>

          <PanelCard title="Feature analysis" subtitle="Detected manufacturing features">
            {outputFormat === 'json' ? (
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
                {formatJsonPreview(state.result)}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Feature Counts */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Turning', value: state.result.features.turningFeatures, color: 'cyan' },
                    { label: 'Milling', value: state.result.features.millingFeatures, color: 'emerald' },
                    { label: 'Drilling', value: state.result.features.drillingFeatures, color: 'amber' },
                    { label: 'EDM', value: state.result.features.edmFeatures, color: 'violet' },
                  ].map(feat => (
                    <div key={feat.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                      <div className={`text-2xl font-bold text-${feat.color}-400`}>{feat.value}</div>
                      <div className="text-xs text-slate-500">{feat.label} features</div>
                    </div>
                  ))}
                </div>

                {/* Title Block Data */}
                {state.result.titleBlockData && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Title Block
                    </h4>
                    <div className="space-y-1 text-sm">
                      {state.result.titleBlockData.partNumber && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Part Number</span>
                          <span className="text-slate-200">{state.result.titleBlockData.partNumber}</span>
                        </div>
                      )}
                      {state.result.titleBlockData.material && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Material</span>
                          <span className="text-slate-200">{state.result.titleBlockData.material}</span>
                        </div>
                      )}
                      {state.result.titleBlockData.finish && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Finish</span>
                          <span className="text-slate-200">{state.result.titleBlockData.finish}</span>
                        </div>
                      )}
                      {state.result.titleBlockData.toleranceClass && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tolerance Class</span>
                          <span className="text-slate-200">{state.result.titleBlockData.toleranceClass}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Status Pills */}
                <div className="flex flex-wrap gap-2">
                  <StatusPill label="OCR Complete" tone="emerald" />
                  <StatusPill label="Features Extracted" tone="cyan" />
                  {state.result.confidence >= 0.8 && (
                    <StatusPill label="High Confidence" tone="emerald" />
                  )}
                  {state.result.confidence < 0.5 && (
                    <StatusPill label="Review Recommended" tone="amber" />
                  )}
                </div>
              </div>
            )}
          </PanelCard>
        </div>
      )}
    </WorkspaceRecoveryScaffold>
  );
}

export default PrintDropPage;
