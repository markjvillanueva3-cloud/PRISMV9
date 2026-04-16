import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { solveWireEdmWizard } from '../api/client';
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
  payloadOf,
} from './recovery/recoveryUtils';

type WireEdmWizardLocationState = {
  sourceLabel?: string;
  materialName?: string;
  stockThicknessMm?: number;
  notes?: string;
  workspaceContext?: {
    machineLabel?: string;
    controllerLabel?: string;
    packetId?: string;
    focusId?: string;
  };
};

function formatWizardThickness(value: number | undefined, fallback: string) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : fallback;
}

export function WireEdmWizardPage() {
  const location = useLocation();
  const launchState = (location.state as WireEdmWizardLocationState | null) ?? null;
  const launchMachineLabel = launchState?.workspaceContext?.machineLabel;
  const launchControllerLabel = launchState?.workspaceContext?.controllerLabel;
  const [material, setMaterial] = useState(() => launchState?.materialName ?? 'A2 Tool Steel');
  const [thickness, setThickness] = useState(() => formatWizardThickness(launchState?.stockThicknessMm, '2.5'));
  const [quantity, setQuantity] = useState('1');
  const [tolerance, setTolerance] = useState('0.0005');
  const [notes, setNotes] = useState(() => {
    const seededNotes = [launchState?.notes];
    if (launchMachineLabel) seededNotes.push(`Launch machine: ${launchMachineLabel}.`);
    if (launchControllerLabel) seededNotes.push(`Controller: ${launchControllerLabel}.`);
    return seededNotes.filter(Boolean).join(' ');
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [solution, setSolution] = useState<Record<string, unknown> | null>(null);

  async function handleSolve() {
    setLoading(true);
    setError(null);
    try {
      const response = await solveWireEdmWizard({
        material,
        thickness: Number(thickness) || 0,
        quantity: Number(quantity) || 1,
        tolerance,
        notes: notes.trim() || undefined,
      });
      setSolution(asRecord(payloadOf(response)) ?? asRecord(response));
    } catch (issue) {
      setSolution(null);
      setError(errorMessage(issue, 'Unable to solve the Wire EDM wizard request.'));
    } finally {
      setLoading(false);
    }
  }

  const metrics = useMemo(() => ([
    {
      label: 'Material',
      value: material,
      hint: launchMachineLabel ? `Current wizard setup · ${launchMachineLabel}` : 'Current wizard setup',
      accent: 'from-cyan-400/22 via-cyan-300/10 to-transparent',
    },
    {
      label: 'Thickness',
      value: thickness,
      hint: 'Wizard input',
      accent: 'from-amber-400/22 via-amber-300/10 to-transparent',
    },
    {
      label: 'Result Keys',
      value: String(solution ? Object.keys(solution).length : 0),
      hint: loading ? 'Solver running' : 'Mounted wizard output',
      accent: 'from-emerald-400/22 via-emerald-300/10 to-transparent',
    },
  ]), [loading, material, solution, thickness]);

  const aiContext = useMemo(() => ({
    workspace: 'wire-edm-wizard',
    appw_stage: 'APPW-MS0 machining calculation',
    launch_source: launchState?.sourceLabel ?? '',
    material,
    thickness: Number(thickness) || 0,
    quantity: Number(quantity) || 1,
    tolerance,
    notes,
    launch_machine: launchMachineLabel ?? '',
    launch_controller: launchControllerLabel ?? '',
    launch_packet_id: launchState?.workspaceContext?.packetId ?? '',
    launch_focus_id: launchState?.workspaceContext?.focusId ?? '',
    solution,
  }), [launchControllerLabel, launchMachineLabel, launchState?.sourceLabel, launchState?.workspaceContext?.focusId, launchState?.workspaceContext?.packetId, material, notes, quantity, solution, thickness, tolerance]);

  return (
    <WorkspaceRecoveryScaffold
      eyebrow="Wire EDM planning"
      title="Wire EDM Wizard"
      description="The Wire EDM wizard route is restored as an APPW planning surface with mounted solver execution and PRISM AI to explain the resulting programming posture."
      surfaces={['jobDesk']}
      metrics={metrics}
      aiSummary="PRISM AI can explain the wizard output, flag missing assumptions, and tell the programmer what to verify before cutting."
      aiContext={aiContext}
      suggestions={[
        {
          id: 'wizard-summary',
          label: 'Explain the wizard result',
          query: 'Explain the current Wire EDM wizard result in plain language and tell the programmer what to verify next.',
        },
        {
          id: 'wizard-risk',
          label: 'Find setup risk',
          query: 'What setup or process risk is still hidden in the current Wire EDM wizard configuration?',
        },
      ]}
    >
      <PanelCard title="Wizard inputs" subtitle="Mounted against the Wire EDM solve route.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Material">
            <Input value={material} onChange={(event) => setMaterial(event.target.value)} />
          </Field>
          <Field label="Thickness">
            <Input value={thickness} onChange={(event) => setThickness(event.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Quantity">
            <Input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="numeric" />
          </Field>
          <Field label="Tolerance">
            <Input value={tolerance} onChange={(event) => setTolerance(event.target.value)} />
          </Field>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Notes</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-[160px] w-full rounded-[22px] border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
            placeholder="Optional setup notes, part features, or cut-sequence constraints."
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-3">
          <ActionButton onClick={() => void handleSolve()} disabled={loading}>
            {loading ? 'Solving...' : 'Solve wizard'}
          </ActionButton>
          <StatusPill label={loading ? 'Working' : 'Ready'} tone={loading ? 'amber' : 'emerald'} />
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-300/18 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </PanelCard>

      <PanelCard title="Wizard output" subtitle="Latest mounted solve result.">
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
          {solution ? formatJsonPreview(solution) : 'No Wire EDM wizard result is currently mounted.'}
        </div>
      </PanelCard>
    </WorkspaceRecoveryScaffold>
  );
}

export default WireEdmWizardPage;
