import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getLatheResult,
  submitLatheWizard,
} from '../api/client';
import { WorkspaceRecoveryScaffold } from '../components/workspace/WorkspaceRecoveryScaffold';
import { GatedError } from '../components/entitlement';
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

type LatheResultState = {
  status: number;
  payload: Record<string, unknown> | null;
};

type LatheWizardLocationState = {
  sourceLabel?: string;
  materialName?: string;
  operation?: string;
  stockDiameterMm?: number;
  stockLengthMm?: number;
  notes?: string;
  workspaceContext?: {
    machineLabel?: string;
    controllerLabel?: string;
    packetId?: string;
    focusId?: string;
  };
};

function formatWizardNumber(value: number | undefined, fallback: string, decimals = 2) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(decimals) : fallback;
}

export function LatheWizardPage() {
  const location = useLocation();
  const launchState = (location.state as LatheWizardLocationState | null) ?? null;
  const launchMachineLabel = launchState?.workspaceContext?.machineLabel;
  const launchControllerLabel = launchState?.workspaceContext?.controllerLabel;
  const [material, setMaterial] = useState(() => launchState?.materialName ?? '4140 steel');
  const [operation, setOperation] = useState(() => launchState?.operation ?? 'turning');
  // UNITS-FIRST: the wizard fields are INCH (labels "Diameter (in)" / "Length (in)" + the
  // submit sends diameter_in/length_in), but the launch/workspace context carries stock dims
  // in MM. Convert mm/25.4 -> in on seed, else a workspace-launched wizard would submit a mm
  // value as inch -- a 25.4x scale error (the exact UNITS-FIRST hazard). Plain defaults are inch.
  const [diameter, setDiameter] = useState(() => formatWizardNumber(
    typeof launchState?.stockDiameterMm === 'number' ? launchState.stockDiameterMm / 25.4 : undefined, '1.25'));
  const [length, setLength] = useState(() => formatWizardNumber(
    typeof launchState?.stockLengthMm === 'number' ? launchState.stockLengthMm / 25.4 : undefined, '4.00'));
  const [tolerance, setTolerance] = useState('0.001');
  const [notes, setNotes] = useState(() => {
    const seededNotes = [launchState?.notes];
    if (launchMachineLabel) seededNotes.push(`Launch machine: ${launchMachineLabel}.`);
    if (launchControllerLabel) seededNotes.push(`Controller: ${launchControllerLabel}.`);
    return seededNotes.filter(Boolean).join(' ');
  });
  const [jobId, setJobId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingResult, setLoadingResult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gateError, setGateError] = useState<unknown>(null);
  const [wizardResponse, setWizardResponse] = useState<Record<string, unknown> | null>(null);
  const [latheResult, setLatheResult] = useState<LatheResultState | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const response = await submitLatheWizard({
        material,
        operation,
        diameter_in: Number(diameter) || 0,
        length_in: Number(length) || 0,
        tolerance_in: Number(tolerance) || 0,
        notes: notes.trim() || undefined,
      });

      const responseRecord = asRecord(response) ?? {};
      setWizardResponse(responseRecord);
      const returnedJobId = firstText(responseRecord, ['jobId', 'job_id']);
      if (returnedJobId) {
        setJobId(returnedJobId);
      }
    } catch (issue) {
      setWizardResponse(null);
      setGateError(issue);
      setError(errorMessage(issue, 'Unable to submit the lathe wizard request.'));
    } finally {
      setLoading(false);
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
      setGateError(issue);
      setError(errorMessage(issue, 'Unable to retrieve the lathe wizard result.'));
    } finally {
      setLoadingResult(false);
    }
  }

  const metrics = useMemo(() => ([
    {
      label: 'Operation',
      value: operation,
      hint: launchMachineLabel ? `${material} · ${launchMachineLabel}` : material,
      accent: 'from-cyan-400/22 via-cyan-300/10 to-transparent',
    },
    {
      label: 'Part Envelope',
      value: `${diameter}" x ${length}"`,
      hint: `Tol ${tolerance}"`,
      accent: 'from-amber-400/22 via-amber-300/10 to-transparent',
    },
    {
      label: 'Job ID',
      value: jobId || 'Pending',
      hint: latheResult ? `Status ${latheResult.status}` : 'Awaiting result',
      accent: 'from-emerald-400/22 via-emerald-300/10 to-transparent',
    },
  ]), [diameter, jobId, latheResult, length, material, operation, tolerance]);

  const aiContext = useMemo(() => ({
    workspace: 'lathe-wizard',
    appw_stage: 'APPW-MS0 machining planning',
    launch_source: launchState?.sourceLabel ?? '',
    material,
    operation,
    diameter_in: Number(diameter) || 0,
    length_in: Number(length) || 0,
    tolerance_in: Number(tolerance) || 0,
    notes,
    job_id: jobId,
    launch_machine: launchMachineLabel ?? '',
    launch_controller: launchControllerLabel ?? '',
    launch_packet_id: launchState?.workspaceContext?.packetId ?? '',
    launch_focus_id: launchState?.workspaceContext?.focusId ?? '',
    wizard_response: wizardResponse,
    lathe_result: latheResult,
  }), [diameter, jobId, latheResult, length, launchControllerLabel, launchMachineLabel, launchState?.sourceLabel, launchState?.workspaceContext?.focusId, launchState?.workspaceContext?.packetId, material, notes, operation, tolerance, wizardResponse]);

  return (
    <WorkspaceRecoveryScaffold
      eyebrow="Lathe programming"
      title="Kienzle"
      description="Kienzle is the lathe print-to-program wizard: a planning surface with mounted wizard submission, follow-up result lookup, and Kienzle AI to translate the solver output into machinist action."
      surfaces={['jobDesk']}
      metrics={metrics}
      aiSummary="Kienzle AI can explain the lathe wizard assumptions, summarize solver output, and call out the next programming or setup decision."
      aiContext={aiContext}
      suggestions={[
        {
          id: 'lathe-wizard-summary',
          label: 'Explain the wizard setup',
          query: 'Explain the current lathe wizard configuration and what assumptions the machinist should verify before running the result.',
        },
        {
          id: 'lathe-wizard-risk',
          label: 'Find process risk',
          query: 'What process risk or ambiguity is still visible in the current lathe wizard setup and result posture?',
        },
      ]}
    >
      <PanelCard title="Wizard inputs" subtitle="Mounted against the lathe wizard submission route.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Material">
            <Input value={material} onChange={(event) => setMaterial(event.target.value)} />
          </Field>
          <Field label="Operation">
            <Select value={operation} onChange={(event) => setOperation(event.target.value)}>
              <option value="turning">Turning</option>
              <option value="grooving">Grooving</option>
              <option value="threading">Threading</option>
              <option value="boring">Boring</option>
            </Select>
          </Field>
          <Field label="Diameter (in)">
            <Input value={diameter} onChange={(event) => setDiameter(event.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Length (in)">
            <Input value={length} onChange={(event) => setLength(event.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Tolerance (in)">
            <Input value={tolerance} onChange={(event) => setTolerance(event.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Job ID">
            <Input value={jobId} onChange={(event) => setJobId(event.target.value)} placeholder="Result lookup id" />
          </Field>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Notes</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-[160px] w-full rounded-ios-lg border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
            placeholder="Part geometry notes, tool constraints, or setup details."
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-3">
          <ActionButton onClick={() => void handleSubmit()} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit wizard'}
          </ActionButton>
          <ActionButton onClick={() => void handleFetchResult()} disabled={loadingResult || !jobId.trim()} tone="amber">
            {loadingResult ? 'Checking...' : 'Fetch result'}
          </ActionButton>
          <StatusPill label={loading || loadingResult ? 'Working' : 'Ready'} tone={loading || loadingResult ? 'amber' : 'emerald'} />
        </div>

        {error ? (
          <GatedError error={gateError} feature='wizard.lathe' fallback={
            <div className="mt-4 rounded-ios-lg border border-rose-300/18 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          } />
        ) : null}
      </PanelCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelCard title="Wizard response" subtitle="Latest mounted wizard acknowledgement.">
          <div className="rounded-ios-lg border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
            {wizardResponse ? formatJsonPreview(wizardResponse) : 'No wizard response is mounted yet.'}
          </div>
        </PanelCard>

        <PanelCard title="Lathe result" subtitle="Result lookup for the current lathe wizard job ID.">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <StatusPill label={`Status ${latheResult?.status ?? 'idle'}`} tone={latheResult?.status === 202 ? 'amber' : 'sky'} />
              {latheResult?.payload ? <StatusPill label="Payload mounted" tone="emerald" /> : null}
            </div>
            <div className="rounded-ios-lg border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
              {latheResult?.payload ? formatJsonPreview(latheResult.payload) : 'No lathe result payload is currently mounted for this wizard run.'}
            </div>
          </div>
        </PanelCard>
      </div>
    </WorkspaceRecoveryScaffold>
  );
}

export default LatheWizardPage;
