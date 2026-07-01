import { useMemo, useState } from 'react';
import {
  getLatheResult,
  uploadLatheFile,
} from '../api/client';
import { WorkspaceRecoveryScaffold } from '../components/workspace/WorkspaceRecoveryScaffold';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  Select,
  StatusPill,
} from '../components/workspace/WorkspacePrimitives';
import {
  asRecord,
  errorMessage,
  firstText,
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

type LatheResultState = {
  status: number;
  payload: Record<string, unknown> | null;
};

export function LatheUploadPage() {
  const [fileName, setFileName] = useState('lathe-part-notes.txt');
  const [fileType, setFileType] = useState<'photo' | 'cad' | 'pdf'>('pdf');
  const [fileBody, setFileBody] = useState('');
  const [jobId, setJobId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loadingResult, setLoadingResult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadReceipt, setUploadReceipt] = useState<Record<string, unknown> | null>(null);
  const [latheResult, setLatheResult] = useState<LatheResultState | null>(null);

  async function handleUpload() {
    if (!fileBody.trim()) return;

    setUploading(true);
    setError(null);
    try {
      const response = await uploadLatheFile({
        fileName,
        fileType,
        fileData: encodeToBase64(fileBody),
      });
      const record = asRecord(response);
      setUploadReceipt(record);
      const returnedJobId = firstText(record ?? {}, ['job_id', 'jobId', 'id']);
      if (returnedJobId) {
        setJobId(returnedJobId);
      }
    } catch (issue) {
      setUploadReceipt(null);
      setError(errorMessage(issue, 'Unable to upload the lathe file.'));
    } finally {
      setUploading(false);
    }
  }

  async function handleFetchResult() {
    if (!jobId.trim()) return;

    setLoadingResult(true);
    setError(null);
    try {
      const response = await getLatheResult(jobId.trim());
      setLatheResult(response);
    } catch (issue) {
      setLatheResult(null);
      setError(errorMessage(issue, 'Unable to retrieve the lathe result.'));
    } finally {
      setLoadingResult(false);
    }
  }

  const metrics = useMemo(() => ([
    {
      label: 'Input Size',
      value: `${fileBody.length.toLocaleString()} chars`,
      hint: fileType,
      accent: 'from-cyan-400/22 via-cyan-300/10 to-transparent',
    },
    {
      label: 'Job ID',
      value: jobId || 'Pending',
      hint: 'Mounted result lookup target',
      accent: 'from-emerald-400/22 via-emerald-300/10 to-transparent',
    },
    {
      label: 'Result Status',
      value: latheResult ? String(latheResult.status) : 'Idle',
      hint: latheResult?.status === 202 ? 'Solver still processing' : 'Ready for review',
      accent: 'from-amber-400/22 via-amber-300/10 to-transparent',
    },
  ]), [fileBody.length, fileType, jobId, latheResult]);

  const aiContext = useMemo(() => ({
    workspace: 'lathe-upload',
    appw_stage: 'APPW-MS0 machining intake',
    file_name: fileName,
    file_type: fileType,
    job_id: jobId,
    upload_receipt: uploadReceipt,
    lathe_result: latheResult,
  }), [fileName, fileType, jobId, latheResult, uploadReceipt]);

  return (
    <WorkspaceRecoveryScaffold
      eyebrow="Machining intake"
      title="Kienzle Upload"
      description="The lathe intake desk is rebuilt on a stable APPW front-end seam. Operators can post an upload payload, fetch the mounted solver result, and use Kienzle AI to interpret what the machining engine returned."
      surfaces={['jobDesk']}
      metrics={metrics}
      aiSummary="Kienzle AI can explain what the lathe intake payload means, summarize pending solver status, and translate the result into machinist-friendly next steps."
      aiContext={aiContext}
      suggestions={[
        {
          id: 'lathe-summary',
          label: 'Interpret the upload',
          query: 'Interpret the current lathe upload and result posture for a machinist who needs the next step immediately.',
        },
        {
          id: 'lathe-risk',
          label: 'Flag solver risk',
          query: 'Based on the current lathe payload and result status, what risk or ambiguity should the programmer resolve next?',
        },
      ]}
    >
      <PanelCard title="Lathe file intake" subtitle="Mounted against the lathe upload and result routes.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="File Name">
            <Input value={fileName} onChange={(event) => setFileName(event.target.value)} />
          </Field>
          <Field label="File Type">
            <Select value={fileType} onChange={(event) => setFileType(event.target.value as 'photo' | 'cad' | 'pdf')}>
              <option value="pdf">PDF</option>
              <option value="cad">CAD</option>
              <option value="photo">Photo</option>
            </Select>
          </Field>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">File Payload</span>
          <textarea
            value={fileBody}
            onChange={(event) => setFileBody(event.target.value)}
            className="min-h-[180px] w-full rounded-ios-lg border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
            placeholder="Paste the lathe notes, OCR, or extracted file content here."
          />
        </label>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <Field label="Job ID">
            <Input value={jobId} onChange={(event) => setJobId(event.target.value)} placeholder="Result lookup id" />
          </Field>
          <div className="flex flex-wrap items-end gap-3">
            <ActionButton onClick={() => void handleUpload()} disabled={uploading || !fileBody.trim()}>
              {uploading ? 'Uploading...' : 'Upload lathe file'}
            </ActionButton>
            <ActionButton onClick={() => void handleFetchResult()} disabled={loadingResult || !jobId.trim()} tone="amber">
              {loadingResult ? 'Checking...' : 'Fetch result'}
            </ActionButton>
            <StatusPill label={uploading || loadingResult ? 'Working' : 'Ready'} tone={uploading || loadingResult ? 'amber' : 'emerald'} />
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-ios-lg border border-rose-300/18 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </PanelCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelCard title="Upload receipt" subtitle="The mounted upload acknowledgment payload.">
          <div className="rounded-ios-lg border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
            {uploadReceipt ? formatJsonPreview(uploadReceipt) : 'No lathe upload has been posted in this session yet.'}
          </div>
        </PanelCard>

        <PanelCard title="Lathe solver result" subtitle="The current mounted result payload for the selected job ID.">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <StatusPill label={`Status ${latheResult?.status ?? 'idle'}`} tone={latheResult?.status === 202 ? 'amber' : 'sky'} />
              {latheResult?.payload ? <StatusPill label="Payload mounted" tone="emerald" /> : null}
            </div>
            <div className="rounded-ios-lg border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
              {latheResult?.payload ? formatJsonPreview(latheResult.payload) : 'No lathe result payload is mounted for the current job ID.'}
            </div>
          </div>
        </PanelCard>
      </div>
    </WorkspaceRecoveryScaffold>
  );
}

export default LatheUploadPage;
