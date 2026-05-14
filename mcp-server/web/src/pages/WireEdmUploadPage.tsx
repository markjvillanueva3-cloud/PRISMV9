import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  wireEdmOcr,
  wireEdmParseGeometry,
} from '../api/client';
import { WorkspaceRecoveryScaffold } from '../components/workspace/WorkspaceRecoveryScaffold';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  StatusPill,
} from '../components/workspace/WorkspacePrimitives';
import {
  asRecord,
  errorMessage,
  formatJsonPreview,
} from './recovery/recoveryUtils';

function encodeToBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

export function WireEdmUploadPage() {
  const navigate = useNavigate();
  const [fileName, setFileName] = useState('wire-edm-input.txt');
  const [sourceText, setSourceText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMode, setLastMode] = useState<'ocr' | 'geometry' | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  async function runMode(mode: 'ocr' | 'geometry') {
    if (!sourceText.trim()) return;

    setLoading(true);
    setError(null);
    setLastMode(mode);
    try {
      const payload = {
        file_name: fileName,
        file_data: encodeToBase64(sourceText),
        content: sourceText,
        text: sourceText,
      };

      const response = mode === 'ocr'
        ? await wireEdmOcr(payload)
        : await wireEdmParseGeometry(payload);

      setResult(asRecord(response));
    } catch (issue) {
      setResult(null);
      setError(errorMessage(issue, `Unable to run Wire EDM ${mode}.`));
    } finally {
      setLoading(false);
    }
  }

  const metrics = useMemo(() => ([
    {
      label: 'Input Size',
      value: `${sourceText.length.toLocaleString()} chars`,
      hint: 'Mounted parsing payload',
      accent: 'from-cyan-400/22 via-cyan-300/10 to-transparent',
    },
    {
      label: 'Last Mode',
      value: lastMode ?? 'None',
      hint: 'OCR or geometry extraction',
      accent: 'from-amber-400/22 via-amber-300/10 to-transparent',
    },
    {
      label: 'Result Keys',
      value: String(result ? Object.keys(result).length : 0),
      hint: 'Current mounted response shape',
      accent: 'from-emerald-400/22 via-emerald-300/10 to-transparent',
    },
  ]), [lastMode, result, sourceText.length]);

  const aiContext = useMemo(() => ({
    workspace: 'wire-edm-upload',
    appw_stage: 'APPW-MS0 machining intake',
    file_name: fileName,
    input_text: sourceText,
    last_mode: lastMode,
    result,
  }), [fileName, lastMode, result, sourceText]);

  return (
    <WorkspaceRecoveryScaffold
      eyebrow="Wire EDM intake"
      title="Wire EDM Upload"
      description="The Wire EDM upload desk is back on a live APPW scaffold. OCR and geometry parsing now sit on explicit backend seams, with PRISM AI available to interpret what the parser returned."
      surfaces={['jobDesk']}
      metrics={metrics}
      aiSummary="PRISM AI can interpret OCR and geometry parse output, call out missing information, and translate the current Wire EDM intake state into the next programming action."
      aiContext={aiContext}
      suggestions={[
        {
          id: 'wire-parse',
          label: 'Interpret the parse result',
          query: 'Interpret the current Wire EDM parsing result and explain what the programmer should trust or verify next.',
        },
        {
          id: 'wire-gap',
          label: 'Find missing information',
          query: 'What information is still missing from the current Wire EDM upload payload before programming should proceed?',
        },
      ]}
    >
      <PanelCard title="Wire EDM payload" subtitle="Mounted against the Wire EDM OCR and geometry parsing routes.">
        <Field label="File Name">
          <Input value={fileName} onChange={(event) => setFileName(event.target.value)} />
        </Field>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Source Text</span>
          <textarea
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
            className="min-h-[220px] w-full rounded-[22px] border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
            placeholder="Paste OCR source text, drawing notes, or extracted geometry content here."
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-3">
          <ActionButton onClick={() => void runMode('ocr')} disabled={loading || !sourceText.trim()} tone="amber">
            {loading && lastMode === 'ocr' ? 'Running OCR...' : 'Run OCR'}
          </ActionButton>
          <ActionButton onClick={() => void runMode('geometry')} disabled={loading || !sourceText.trim()} tone="emerald">
            {loading && lastMode === 'geometry' ? 'Parsing...' : 'Parse geometry'}
          </ActionButton>
          {result && lastMode === 'geometry' && (
            <ActionButton
              onClick={() => navigate('/wire-edm/wizard', { state: { geometry: result, fileName } })}
              tone="cyan"
            >
              Continue to Wizard →
            </ActionButton>
          )}
          <StatusPill label={loading ? 'Working' : 'Ready'} tone={loading ? 'amber' : 'emerald'} />
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-300/18 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </PanelCard>

      <PanelCard title="Mounted response" subtitle="Latest OCR or geometry parse output.">
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
          {result ? formatJsonPreview(result) : 'No Wire EDM parsing result is mounted yet.'}
        </div>
      </PanelCard>
    </WorkspaceRecoveryScaffold>
  );
}

export default WireEdmUploadPage;
