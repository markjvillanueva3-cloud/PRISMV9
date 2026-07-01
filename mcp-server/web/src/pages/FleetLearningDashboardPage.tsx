/**
 * LEARN-MS5 U-LEARN30: Fleet Learning Dashboard Page
 *
 * Per-machine learning state: measurements, calibration status, kc1.1 drift.
 * Drift alerts: machines showing over/under-prediction.
 * Transfer suggestions: new machines can inherit settings from similar ones.
 * Feedback ingestion form.
 */
import { useCallback, useEffect, useState } from 'react';
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
import type { FleetMachine, FleetStatus } from '../api/knowledge';
import { getFleetStatus, getFleetSummary, ingestFleetFeedback, recordMeasurement } from '../api/knowledge';

type ViewTab = 'fleet' | 'feedback' | 'transfer';

function calibrationTone(status: FleetMachine['calibration_status']): 'emerald' | 'amber' | 'rose' {
  if (status === 'calibrated') return 'emerald';
  if (status === 'needs_recalibration') return 'amber';
  return 'rose';
}

function MachineCard({ machine }: { machine: FleetMachine }) {
  const driftColor = machine.drift_percent !== undefined
    ? Math.abs(machine.drift_percent) > 5 ? 'text-rose-300' : Math.abs(machine.drift_percent) > 2 ? 'text-amber-300' : 'text-emerald-300'
    : 'text-slate-500';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3 transition hover:border-white/16">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{machine.name || machine.serial}</h3>
          <p className="text-xs text-slate-400">{machine.model} | SN: {machine.serial}</p>
        </div>
        <StatusPill label={machine.calibration_status.replace('_', ' ')} tone={calibrationTone(machine.calibration_status)} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Measurements</div>
          <div className="text-lg font-semibold text-slate-100">{machine.measurements}</div>
        </div>
        {machine.kc1_1_current !== undefined && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">kc1.1</div>
            <div className="text-lg font-semibold text-slate-100">
              {machine.kc1_1_current}
              {machine.kc1_1_canonical !== undefined && (
                <span className="ml-1 text-xs text-slate-500">/ {machine.kc1_1_canonical}</span>
              )}
            </div>
          </div>
        )}
        {machine.drift_percent !== undefined && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Drift</div>
            <div className={`text-lg font-semibold ${driftColor}`}>
              {machine.drift_percent > 0 ? '+' : ''}{machine.drift_percent.toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      {machine.last_calibration && (
        <div className="text-xs text-slate-500">
          Last calibration: {new Date(machine.last_calibration).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

function FeedbackForm() {
  const [serial, setSerial] = useState('');
  const [programId, setProgramId] = useState('');
  const [feedbackType, setFeedbackType] = useState('cycle_time');
  const [predicted, setPredicted] = useState('');
  const [actual, setActual] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ accepted: boolean; message: string } | null>(null);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setResult(null);
    try {
      const r = await ingestFleetFeedback({
        machine_serial: serial.trim(),
        program_id: programId.trim() || undefined,
        feedback_type: feedbackType,
        predicted_value: predicted ? Number(predicted) : undefined,
        actual_value: actual ? Number(actual) : undefined,
        operator_notes: notes.trim() || undefined,
      });
      setResult(r);
      if (r.accepted) {
        setSerial('');
        setProgramId('');
        setPredicted('');
        setActual('');
        setNotes('');
      }
    } catch (err) {
      setResult({ accepted: false, message: err instanceof Error ? err.message : 'Feedback submission failed' });
    } finally {
      setSubmitting(false);
    }
  }, [serial, programId, feedbackType, predicted, actual, notes]);

  return (
    <PanelCard title="Submit Feedback" subtitle="Record operator observations for machine learning calibration">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Machine Serial">
            <Input value={serial} onChange={e => setSerial((e.target as HTMLInputElement).value)} placeholder="e.g., VF2-001" />
          </Field>
          <Field label="Program ID (optional)">
            <Input value={programId} onChange={e => setProgramId((e.target as HTMLInputElement).value)} placeholder="e.g., PRG-001" />
          </Field>
          <Field label="Feedback Type">
            <Select value={feedbackType} onChange={e => setFeedbackType((e.target as HTMLSelectElement).value)}>
              <option value="cycle_time">Cycle Time</option>
              <option value="surface_finish">Surface Finish</option>
              <option value="dimension">Dimension</option>
              <option value="tool_life">Tool Life</option>
              <option value="vibration">Vibration</option>
              <option value="force">Cutting Force</option>
            </Select>
          </Field>
          <div />
          <Field label="Predicted Value">
            <Input type="number" value={predicted} onChange={e => setPredicted((e.target as HTMLInputElement).value)} placeholder="Kienzle prediction" />
          </Field>
          <Field label="Actual Value">
            <Input type="number" value={actual} onChange={e => setActual((e.target as HTMLInputElement).value)} placeholder="Measured on machine" />
          </Field>
        </div>
        <Field label="Operator Notes (optional)">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any observations about conditions, tool state, material batch..."
            rows={3}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/32"
          />
        </Field>

        {result && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${result.accepted ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-rose-400/20 bg-rose-400/10 text-rose-200'}`}>
            {result.message}
          </div>
        )}

        <ActionButton onClick={handleSubmit} disabled={submitting || !serial.trim()}>
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </ActionButton>
      </div>
    </PanelCard>
  );
}

function MeasurementForm() {
  const [machineId, setMachineId] = useState('');
  const [measurementType, setMeasurementType] = useState('dimension');
  const [measured, setMeasured] = useState('');
  const [predicted, setPredicted] = useState('');
  const [unit, setUnit] = useState('mm');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ id: string; residual: number; message: string } | null>(null);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setResult(null);
    try {
      const r = await recordMeasurement({
        machine_id: machineId.trim(),
        measurement_type: measurementType,
        measured: Number(measured),
        predicted: Number(predicted),
        unit,
      });
      setResult(r);
    } catch (err) {
      setResult({ id: '', residual: 0, message: err instanceof Error ? err.message : 'Recording failed' });
    } finally {
      setSubmitting(false);
    }
  }, [machineId, measurementType, measured, predicted, unit]);

  return (
    <PanelCard title="Record Measurement" subtitle="Feed actual vs. predicted measurements for Bayesian calibration">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Machine ID">
            <Input value={machineId} onChange={e => setMachineId((e.target as HTMLInputElement).value)} placeholder="e.g., VF2-001" />
          </Field>
          <Field label="Measurement Type">
            <Select value={measurementType} onChange={e => setMeasurementType((e.target as HTMLSelectElement).value)}>
              <option value="dimension">Dimension</option>
              <option value="surface_finish">Surface Finish</option>
              <option value="force">Cutting Force</option>
              <option value="tool_life">Tool Life</option>
            </Select>
          </Field>
          <Field label="Unit">
            <Select value={unit} onChange={e => setUnit((e.target as HTMLSelectElement).value)}>
              <option value="mm">mm</option>
              <option value="in">in</option>
              <option value="Ra">Ra</option>
              <option value="N">N</option>
              <option value="min">min</option>
            </Select>
          </Field>
          <Field label="Predicted">
            <Input type="number" value={predicted} onChange={e => setPredicted((e.target as HTMLInputElement).value)} placeholder="Kienzle value" />
          </Field>
          <Field label="Measured">
            <Input type="number" value={measured} onChange={e => setMeasured((e.target as HTMLInputElement).value)} placeholder="Actual value" />
          </Field>
        </div>

        {result && result.id && (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            Recorded. Residual: {result.residual.toFixed(4)} | {result.message}
          </div>
        )}

        <ActionButton onClick={handleSubmit} disabled={submitting || !machineId.trim() || !measured || !predicted}>
          {submitting ? 'Recording...' : 'Record'}
        </ActionButton>
      </div>
    </PanelCard>
  );
}

export function FleetLearningDashboardPage() {
  const [tab, setTab] = useState<ViewTab>('fleet');
  const [fleet, setFleet] = useState<FleetStatus | null>(null);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getFleetSummary>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getFleetStatus().catch(() => null),
      getFleetSummary().catch(() => null),
    ]).then(([f, s]) => {
      setFleet(f);
      setSummary(s);
    }).finally(() => setLoading(false));
  }, []);

  const driftingMachines = fleet?.machines.filter(m => m.drift_percent !== undefined && Math.abs(m.drift_percent) > 2) ?? [];

  return (
    <div className="space-y-6">
      <WorkspaceHero
        eyebrow="Knowledge Pipeline"
        title="Fleet Learning"
        description="Monitor per-machine calibration, detect drift, record measurements, and submit operator feedback. Every data point makes Kienzle's predictions more accurate."
        metrics={
          <>
            <SummaryTile
              label="Machines"
              value={fleet?.summary.total.toString() ?? '...'}
              hint={`${fleet?.summary.calibrated ?? 0} calibrated`}
              accent="from-cyan-400/22 via-cyan-300/10 to-transparent"
            />
            <SummaryTile
              label="Drifting"
              value={String(driftingMachines.length)}
              hint="need attention"
              accent="from-amber-400/22 via-amber-300/10 to-transparent"
            />
            <SummaryTile
              label="Programs"
              value={fleet?.programs_registered.toString() ?? '...'}
              hint="registered"
              accent="from-violet-400/22 via-violet-300/10 to-transparent"
            />
          </>
        }
      />

      <div className="flex gap-2">
        <TabButton active={tab === 'fleet'} onClick={() => setTab('fleet')}>Fleet Status</TabButton>
        <TabButton active={tab === 'feedback'} onClick={() => setTab('feedback')}>Feedback</TabButton>
        <TabButton active={tab === 'transfer'} onClick={() => setTab('transfer')}>Transfer</TabButton>
      </div>

      {tab === 'fleet' && (
        <div className="space-y-6">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">Loading fleet status...</div>
          ) : (
            <>
              {driftingMachines.length > 0 && (
                <PanelCard title="Drift Alerts" subtitle={`${driftingMachines.length} machine${driftingMachines.length !== 1 ? 's' : ''} showing significant drift`}>
                  <div className="space-y-2">
                    {driftingMachines.map(m => (
                      <div key={m.serial} className="flex items-center justify-between rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
                        <div>
                          <span className="text-sm font-semibold text-slate-100">{m.name || m.serial}</span>
                          <span className="ml-2 text-xs text-slate-400">{m.model}</span>
                        </div>
                        <div className="text-sm font-semibold text-amber-300">
                          {m.drift_percent !== undefined && m.drift_percent > 0 ? '+' : ''}{m.drift_percent?.toFixed(1)}% drift
                        </div>
                      </div>
                    ))}
                  </div>
                </PanelCard>
              )}

              {summary?.recommendations && summary.recommendations.length > 0 && (
                <PanelCard title="Recommendations" subtitle="System-generated suggestions based on fleet data">
                  <ul className="space-y-2">
                    {summary.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="mt-0.5 text-cyan-400">&#8226;</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </PanelCard>
              )}

              {summary?.top_issues && summary.top_issues.length > 0 && (
                <PanelCard title="Top Issues" subtitle="Most common problems across the fleet">
                  <div className="flex flex-wrap gap-2">
                    {summary.top_issues.map((issue, i) => <StatusPill key={i} label={issue} tone="rose" />)}
                  </div>
                </PanelCard>
              )}

              <PanelCard title="All Machines" subtitle={`${fleet?.machines.length ?? 0} machines in fleet`}>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {fleet?.machines.map(m => <MachineCard key={m.serial} machine={m} />) ?? (
                    <p className="text-sm text-slate-500">No machines registered.</p>
                  )}
                </div>
              </PanelCard>
            </>
          )}
        </div>
      )}

      {tab === 'feedback' && (
        <div className="space-y-6">
          <FeedbackForm />
          <MeasurementForm />
        </div>
      )}

      {tab === 'transfer' && (
        <PanelCard title="Transfer Learning" subtitle="New machines can inherit calibration from similar existing machines. Use the fleet similarity API to find the best match.">
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              When a new machine is added to the fleet, Kienzle can transfer learned calibration data from the most similar existing machine.
              This reduces the warm-up period from weeks of data collection to immediate usability.
            </p>
            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-2">
              <h4 className="text-sm font-semibold text-slate-100">How Transfer Works</h4>
              <ol className="space-y-1 text-sm text-slate-400">
                <li>1. Kienzle computes weighted cosine similarity between machine specs (power, RPM, rigidity, accuracy, axes)</li>
                <li>2. Parameters are physics-scaled based on capability ratios (e.g., lower power = reduced material removal rate)</li>
                <li>3. Safety validation checks that transferred params respect the target machine's limits</li>
                <li>4. Gaussian Process interpolation fills gaps where direct parameter mapping isn't possible</li>
              </ol>
            </div>
            <p className="text-xs text-slate-500">
              Use the Fleet Status tab to see which machines have calibration data, then use the API to compute transfer suggestions.
            </p>
          </div>
        </PanelCard>
      )}
    </div>
  );
}
