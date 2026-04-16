import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { ApiError, ppgAirCutDetect, ppgProveOut, ppgProveOutPromote } from '../api/client';
import { WorkspaceHero, SummaryTile } from '../components/workspace/WorkspacePrimitives';
import { MachineWorkspaceAuthorityCard } from '../features/machine-workspace/MachineWorkspaceAuthorityCard';
import type { MachineWorkspaceContext } from '../features/machine-workspace/MachineWorkspaceState';

const CONTROLLERS = ['fanuc', 'haas', 'siemens', 'heidenhain', 'mazak', 'okuma', 'sodick'] as const;

type ProveOutController = (typeof CONTROLLERS)[number];
type Step = 'upload' | 'prove-out' | 'promote' | 'done';

type ProveOutLocationState = {
  gcode?: string;
  controller?: string;
  partNumber?: string;
  jobNumber?: string;
  machineName?: string;
  sourceLabel?: string;
  workspaceContext?: MachineWorkspaceContext;
};

type ProveOutResult = {
  gcode: string;
  summary: {
    total_lines: number;
    modified_lines: number;
    inserted_lines: number;
    feed_reductions: number;
    rpm_caps: number;
    optional_stops_added: number;
    avg_feed_reduction_pct: number;
    avg_rpm_reduction_pct: number;
  };
  estimated_cycle_time_ratio: number;
  warnings: string[];
};

type PromoteResult = {
  gcode: string;
  lines_removed: number;
  feeds_restored: number;
  rpms_restored: number;
  diff: Array<{
    line_number: number;
    prove_out: string;
    production: string;
    change_type: string;
  }>;
  sign_off?: {
    operator: string;
    part_number: string;
    job_number: string;
    date: string;
    status: string;
  };
  restoration_method: string;
};

type AirCutResult = {
  detections: Array<{
    line_number: number;
    gcode_text: string;
    type: string;
    z_position: number;
    time_wasted_sec: number;
    suggestion: string;
    distance_mm: number;
  }>;
  total_time_wasted_sec: number;
  optimized_gcode: string;
  summary: {
    total_lines: number;
    air_cut_lines: number;
    air_cut_pct: number;
    total_time_wasted_sec: number;
    time_saved_if_optimized_sec: number;
    by_type: Record<string, number>;
  };
  report: string;
};

function resolveProveOutController(
  rawController: string | undefined,
  workspaceContext: MachineWorkspaceContext | undefined,
): ProveOutController {
  const source = `${rawController ?? ''} ${workspaceContext?.controllerId ?? ''} ${workspaceContext?.controllerLabel ?? ''}`
    .trim()
    .toLowerCase();

  if (!source) {
    return 'fanuc';
  }
  if (source.includes('fanuc')) {
    return 'fanuc';
  }
  if (source.includes('haas')) {
    return 'haas';
  }
  if (source.includes('siemens')) {
    return 'siemens';
  }
  if (source.includes('heidenhain')) {
    return 'heidenhain';
  }
  if (source.includes('mazak') || source.includes('mazatrol')) {
    return 'mazak';
  }
  if (source.includes('okuma')) {
    return 'okuma';
  }
  if (source.includes('sodick')) {
    return 'sodick';
  }
  return 'fanuc';
}

function buildMachineContext(
  machineName: string,
  controller: ProveOutController,
  workspaceContext: MachineWorkspaceContext | undefined,
) {
  if (!machineName.trim() && !workspaceContext) {
    return undefined;
  }

  return {
    name: machineName || workspaceContext?.machineLabel,
    controller,
    machine_id: workspaceContext?.machineId,
    manufacturer: workspaceContext?.machineManufacturer,
    kinematics: workspaceContext?.machineKinematics,
  };
}

export function ProveOutWorkflowPage() {
  const location = useLocation();
  const locationState = (location.state as ProveOutLocationState | null) ?? null;
  const workspaceContext = locationState?.workspaceContext;
  const routedSourceLabel = locationState?.sourceLabel ?? 'the routed machine workspace';
  const resolvedController = useMemo(
    () => resolveProveOutController(locationState?.controller, workspaceContext),
    [locationState?.controller, workspaceContext],
  );
  const authorityMachineName = locationState?.machineName ?? workspaceContext?.machineLabel ?? '';
  const authorityControllerLabel = locationState?.controller ?? workspaceContext?.controllerLabel ?? workspaceContext?.controllerId ?? '';
  const controllerWasMapped = Boolean(
    authorityControllerLabel
    && authorityControllerLabel.trim().toLowerCase() !== resolvedController,
  );

  const [step, setStep] = useState<Step>('upload');
  const [gcode, setGcode] = useState(() => locationState?.gcode ?? '');
  const [controller, setController] = useState<ProveOutController>(() => resolvedController);
  const [feedReduction, setFeedReduction] = useState(25);
  const [rpmCap, setRpmCap] = useState(80);
  const [operatorName, setOperatorName] = useState('');
  const [partNumber, setPartNumber] = useState(() => locationState?.partNumber ?? '');
  const [jobNumber, setJobNumber] = useState(() => locationState?.jobNumber ?? '');
  const [machineName, setMachineName] = useState(() => authorityMachineName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [proveOutResult, setProveOutResult] = useState<ProveOutResult | null>(null);
  const [promoteResult, setPromoteResult] = useState<PromoteResult | null>(null);
  const [airCutResult, setAirCutResult] = useState<AirCutResult | null>(null);
  const [showAirCuts, setShowAirCuts] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  useEffect(() => {
    if (!locationState) {
      return;
    }

    if (typeof locationState.gcode === 'string') {
      setGcode(locationState.gcode);
    }
    if (typeof locationState.partNumber === 'string') {
      setPartNumber(locationState.partNumber);
    }
    if (typeof locationState.jobNumber === 'string') {
      setJobNumber(locationState.jobNumber);
    }
    if (authorityMachineName) {
      setMachineName(authorityMachineName);
    }
    setController(resolvedController);
  }, [
    authorityMachineName,
    locationState,
    locationState?.gcode,
    locationState?.jobNumber,
    locationState?.partNumber,
    resolvedController,
  ]);

  async function handleGenerateProveOut() {
    if (!gcode.trim()) {
      setError('Paste or upload G-code first');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const result = await ppgProveOut({
        gcode,
        machine: buildMachineContext(machineName, controller, workspaceContext),
        config: {
          feed_reduction: feedReduction / 100,
          rpm_cap: rpmCap / 100,
          insert_optional_stops: true,
          add_prove_out_comments: true,
          controller,
        },
      });
      const data = (result as { data?: ProveOutResult }).data ?? (result as ProveOutResult);
      setProveOutResult(data);
      setStep('prove-out');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Failed to generate prove-out');
    } finally {
      setLoading(false);
    }
  }

  async function handleDetectAirCuts() {
    if (!gcode.trim()) {
      setError('Paste or upload G-code first');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const result = await ppgAirCutDetect({
        gcode,
        controller,
        stock_top_z: 0,
        machine: buildMachineContext(machineName, controller, workspaceContext),
      });
      const data = (result as { data?: AirCutResult }).data ?? (result as AirCutResult);
      setAirCutResult(data);
      setShowAirCuts(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Failed to detect air cuts');
    } finally {
      setLoading(false);
    }
  }

  async function handlePromote() {
    if (!proveOutResult) {
      return;
    }
    setLoading(true);
    setError('');

    try {
      const result = await ppgProveOutPromote({
        gcode: proveOutResult.gcode,
        original_gcode: gcode,
        feed_reduction: feedReduction / 100,
        rpm_cap: rpmCap / 100,
        operator_name: operatorName,
        part_number: partNumber,
        job_number: jobNumber,
        include_sign_off: true,
      });
      const data = (result as { data?: PromoteResult }).data ?? (result as PromoteResult);
      setPromoteResult(data);
      setStep('promote');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Failed to promote');
    } finally {
      setLoading(false);
    }
  }

  function handleDownload(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setGcode(reader.result);
      }
    };
    reader.readAsText(file);
  }

  const typeColors: Record<string, string> = {
    above_stock: 'bg-red-900/50 text-red-300',
    approach_feed: 'bg-orange-900/50 text-orange-300',
    retract_feed: 'bg-yellow-900/50 text-yellow-300',
    repeat_pass: 'bg-purple-900/50 text-purple-300',
    exit_spiral: 'bg-blue-900/50 text-blue-300',
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <WorkspaceHero
        eyebrow="Post Processor"
        title="Prove-Out Workflow"
        description="Generate a safer first-article prove-out, scan for wasted air cuts, capture operator sign-off, and promote the proven program back to production without losing the routed JM Die machine context."
        metrics={
          <>
            <SummaryTile label="Stage 1" value="Derate" hint="Feeds, RPM caps, optional stops" />
            <SummaryTile label="Stage 2" value="Scan" hint="Air-cut waste and quick wins" />
            <SummaryTile label="Stage 3" value="Promote" hint="Restore production program with sign-off" accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
          </>
        }
      />

      {workspaceContext ? (
        <MachineWorkspaceAuthorityCard
          context={workspaceContext}
          title="Shared routed prove-out authority"
          subtitle={`This prove-out flow now inherits the same JM Die machine, controller, selector, and programming posture from ${routedSourceLabel}.`}
        />
      ) : null}

      {workspaceContext ? (
        <div className="rounded-xl border border-cyan-300/16 bg-cyan-300/[0.06] px-4 py-3 text-sm leading-6 text-slate-300">
          JM Die routed defaults are loaded from {routedSourceLabel}. You can still override the controller, machine, or prove-out tuning locally before generating the first-article program.
          {controllerWasMapped ? ` The routed controller "${authorityControllerLabel}" was mapped to "${resolvedController}" for the prove-out workflow.` : ''}
        </div>
      ) : null}

      <div className="flex gap-2">
        {(['upload', 'prove-out', 'promote', 'done'] as Step[]).map((item, index) => {
          const currentIndex = ['upload', 'prove-out', 'promote', 'done'].indexOf(step);
          const isActive = step === item;
          const isComplete = index < currentIndex;
          return (
            <div key={item} className={`flex items-center gap-2 ${isActive ? 'text-cyan-400' : isComplete ? 'text-green-400' : 'text-slate-500'}`}>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold ${
                  isActive
                    ? 'border-cyan-500 bg-cyan-900'
                    : isComplete
                      ? 'border-green-500 bg-green-900'
                      : 'border-slate-600 bg-slate-800'
                }`}
              >
                {index + 1}
              </div>
              <span className="text-sm capitalize">{item === 'prove-out' ? 'Prove-Out' : item}</span>
              {index < 3 ? <span className="mx-2 text-slate-600">-&gt;</span> : null}
            </div>
          );
        })}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-700 bg-red-900/30 p-3 text-red-300">{error}</div>
      ) : null}

      {step === 'upload' ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label htmlFor="prove-out-controller" className="mb-1 block text-sm text-slate-400">Controller</label>
              <select
                id="prove-out-controller"
                value={controller}
                onChange={(event) => setController(event.target.value as ProveOutController)}
                className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
              >
                {CONTROLLERS.map((item) => (
                  <option key={item} value={item}>
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="prove-out-machine" className="mb-1 block text-sm text-slate-400">Machine</label>
              <input
                id="prove-out-machine"
                type="text"
                value={machineName}
                onChange={(event) => setMachineName(event.target.value)}
                placeholder="e.g. Haas ST-20Y"
                className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
              />
            </div>
            <div>
              <label htmlFor="prove-out-feed-reduction" className="mb-1 block text-sm text-slate-400">Feed Reduction %</label>
              <input
                id="prove-out-feed-reduction"
                type="number"
                min={5}
                max={50}
                value={feedReduction}
                onChange={(event) => setFeedReduction(+event.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
              />
            </div>
            <div>
              <label htmlFor="prove-out-rpm-cap" className="mb-1 block text-sm text-slate-400">RPM Cap %</label>
              <input
                id="prove-out-rpm-cap"
                type="number"
                min={50}
                max={100}
                value={rpmCap}
                onChange={(event) => setRpmCap(+event.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="prove-out-part-number" className="mb-1 block text-sm text-slate-400">Part Number</label>
              <input
                id="prove-out-part-number"
                type="text"
                value={partNumber}
                onChange={(event) => setPartNumber(event.target.value)}
                placeholder="P-1234"
                className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
              />
            </div>
            <div>
              <label htmlFor="prove-out-job-number" className="mb-1 block text-sm text-slate-400">Job / WO Number</label>
              <input
                id="prove-out-job-number"
                type="text"
                value={jobNumber}
                onChange={(event) => setJobNumber(event.target.value)}
                placeholder="WO-5678"
                className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
              />
            </div>
          </div>

          <div>
            <label htmlFor="prove-out-gcode" className="mb-1 block text-sm text-slate-400">G-code Program</label>
            <div className="mb-2 flex gap-2">
              <label className="cursor-pointer rounded bg-slate-700 px-3 py-1 text-sm text-slate-300 hover:bg-slate-600">
                Upload File
                <input type="file" accept=".nc,.gcode,.tap,.txt" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            <textarea
              id="prove-out-gcode"
              value={gcode}
              onChange={(event) => setGcode(event.target.value)}
              rows={15}
              placeholder="Paste G-code here or upload a file..."
              className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 p-3 font-mono text-sm text-slate-300"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleGenerateProveOut}
              disabled={loading || !gcode.trim()}
              className="rounded-lg bg-cyan-700 px-6 py-2 font-medium text-white hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500"
            >
              {loading ? 'Generating...' : 'Create Prove-Out'}
            </button>
            <button
              onClick={handleDetectAirCuts}
              disabled={loading || !gcode.trim()}
              className="rounded-lg bg-violet-700 px-6 py-2 font-medium text-white hover:bg-violet-600 disabled:bg-slate-700 disabled:text-slate-500"
            >
              {loading ? 'Scanning...' : 'Detect Air Cuts'}
            </button>
          </div>

          {showAirCuts && airCutResult ? (
            <div className="space-y-3 rounded-lg border border-slate-600 bg-slate-800 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-100">Air-Cut Detection Results</h3>
                <button onClick={() => setShowAirCuts(false)} className="text-slate-400 hover:text-slate-200">Close</button>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-lg bg-slate-900 p-3 text-center">
                  <div className="text-2xl font-bold text-red-400">{airCutResult.detections.length}</div>
                  <div className="text-xs text-slate-400">Air-Cut Blocks</div>
                </div>
                <div className="rounded-lg bg-slate-900 p-3 text-center">
                  <div className="text-2xl font-bold text-orange-400">{airCutResult.total_time_wasted_sec.toFixed(1)}s</div>
                  <div className="text-xs text-slate-400">Time Wasted</div>
                </div>
                <div className="rounded-lg bg-slate-900 p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-400">{airCutResult.summary.air_cut_pct.toFixed(1)}%</div>
                  <div className="text-xs text-slate-400">Air-Cut Lines</div>
                </div>
                <div className="rounded-lg bg-slate-900 p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">{airCutResult.summary.time_saved_if_optimized_sec.toFixed(1)}s</div>
                  <div className="text-xs text-slate-400">Saveable</div>
                </div>
              </div>

              {airCutResult.detections.length > 0 ? (
                <div className="max-h-60 space-y-1 overflow-y-auto">
                  {airCutResult.detections.map((detection, index) => (
                    <div key={`${detection.line_number}-${index}`} className={`flex items-center gap-3 rounded px-3 py-1.5 text-sm ${typeColors[detection.type] || 'bg-slate-700 text-slate-300'}`}>
                      <span className="w-16 text-right font-mono">L{detection.line_number}</span>
                      <span className="flex-1 truncate font-mono">{detection.gcode_text}</span>
                      <span className="text-xs opacity-70">{detection.type.replace(/_/g, ' ')}</span>
                      <span className="text-xs">{detection.time_wasted_sec.toFixed(2)}s</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {airCutResult.optimized_gcode ? (
                <button
                  onClick={() => {
                    setGcode(airCutResult.optimized_gcode);
                    setShowAirCuts(false);
                  }}
                  className="rounded bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
                >
                  Apply Optimized G-code
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 'prove-out' && proveOutResult ? (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-lg bg-slate-800 p-3 text-center">
              <div className="text-2xl font-bold text-cyan-400">{proveOutResult.summary.modified_lines}</div>
              <div className="text-xs text-slate-400">Lines Modified</div>
            </div>
            <div className="rounded-lg bg-slate-800 p-3 text-center">
              <div className="text-2xl font-bold text-orange-400">{proveOutResult.summary.feed_reductions}</div>
              <div className="text-xs text-slate-400">Feeds Reduced</div>
            </div>
            <div className="rounded-lg bg-slate-800 p-3 text-center">
              <div className="text-2xl font-bold text-violet-400">{proveOutResult.summary.rpm_caps}</div>
              <div className="text-xs text-slate-400">RPMs Capped</div>
            </div>
            <div className="rounded-lg bg-slate-800 p-3 text-center">
              <div className="text-2xl font-bold text-yellow-400">{proveOutResult.estimated_cycle_time_ratio.toFixed(2)}x</div>
              <div className="text-xs text-slate-400">Cycle Time</div>
            </div>
          </div>

          {proveOutResult.warnings.length > 0 ? (
            <div className="rounded-lg border border-yellow-700 bg-yellow-900/30 p-3">
              <h4 className="mb-1 text-sm font-semibold text-yellow-300">Warnings</h4>
              {proveOutResult.warnings.map((warning, index) => (
                <div key={`${warning}-${index}`} className="text-xs text-yellow-200">{warning}</div>
              ))}
            </div>
          ) : null}

          <div>
            <h3 className="mb-1 text-sm text-slate-400">Prove-Out Program (ready for first article)</h3>
            <textarea value={proveOutResult.gcode} readOnly rows={12} className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 p-3 font-mono text-sm text-green-300" />
          </div>

          <div className="flex gap-3">
            <button onClick={() => handleDownload(proveOutResult.gcode, 'prove-out.nc')} className="rounded bg-slate-700 px-4 py-2 font-medium text-slate-200 hover:bg-slate-600">
              Download Prove-Out
            </button>
            <button onClick={handlePromote} disabled={loading} className="rounded-lg bg-green-700 px-6 py-2 font-medium text-white hover:bg-green-600 disabled:bg-slate-700">
              {loading ? 'Promoting...' : 'Promote to Production'}
            </button>
            <button onClick={() => { setStep('upload'); setProveOutResult(null); }} className="rounded bg-slate-700 px-4 py-2 font-medium text-slate-300 hover:bg-slate-600">
              Back
            </button>
          </div>

          <div className="space-y-3 rounded-lg bg-slate-800 p-4">
            <h3 className="text-sm font-semibold text-slate-300">Operator Sign-Off (for production promotion)</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="prove-out-operator-name" className="mb-1 block text-xs text-slate-400">Operator Name</label>
                <input id="prove-out-operator-name" type="text" value={operatorName} onChange={(event) => setOperatorName(event.target.value)} placeholder="John Smith" className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-200" />
              </div>
              <div>
                <label htmlFor="prove-out-signoff-part-number" className="mb-1 block text-xs text-slate-400">Part Number</label>
                <input id="prove-out-signoff-part-number" type="text" value={partNumber} onChange={(event) => setPartNumber(event.target.value)} placeholder="P-1234" className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-200" />
              </div>
              <div>
                <label htmlFor="prove-out-signoff-job-number" className="mb-1 block text-xs text-slate-400">Job / WO Number</label>
                <input id="prove-out-signoff-job-number" type="text" value={jobNumber} onChange={(event) => setJobNumber(event.target.value)} placeholder="WO-5678" className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-200" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {step === 'promote' && promoteResult ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-green-700 bg-green-900/30 p-4">
            <h3 className="text-lg font-semibold text-green-300">Production Program Ready</h3>
            <p className="mt-1 text-sm text-green-200">
              Restored {promoteResult.feeds_restored} feed rates, {promoteResult.rpms_restored} RPM values.
              Removed {promoteResult.lines_removed} prove-out lines.
              Method: {promoteResult.restoration_method}.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-slate-800 p-3 text-center">
              <div className="text-2xl font-bold text-green-400">{promoteResult.feeds_restored}</div>
              <div className="text-xs text-slate-400">Feeds Restored</div>
            </div>
            <div className="rounded-lg bg-slate-800 p-3 text-center">
              <div className="text-2xl font-bold text-cyan-400">{promoteResult.rpms_restored}</div>
              <div className="text-xs text-slate-400">RPMs Restored</div>
            </div>
            <div className="rounded-lg bg-slate-800 p-3 text-center">
              <div className="text-2xl font-bold text-violet-400">{promoteResult.lines_removed}</div>
              <div className="text-xs text-slate-400">Lines Removed</div>
            </div>
          </div>

          {promoteResult.sign_off ? (
            <div className="rounded-lg bg-slate-800 p-4">
              <h4 className="mb-2 text-sm font-semibold text-slate-300">Sign-Off</h4>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div><span className="text-slate-400">Operator:</span> <span className="text-slate-200">{promoteResult.sign_off.operator || '-'}</span></div>
                <div><span className="text-slate-400">Part:</span> <span className="text-slate-200">{promoteResult.sign_off.part_number || '-'}</span></div>
                <div><span className="text-slate-400">Job:</span> <span className="text-slate-200">{promoteResult.sign_off.job_number || '-'}</span></div>
                <div><span className="text-slate-400">Date:</span> <span className="text-slate-200">{promoteResult.sign_off.date}</span></div>
              </div>
            </div>
          ) : null}

          <div>
            <button onClick={() => setShowDiff(!showDiff)} className="text-sm text-cyan-400 underline hover:text-cyan-300">
              {showDiff ? 'Hide' : 'Show'} Side-by-Side Diff ({promoteResult.diff.length} changes)
            </button>
            {showDiff && promoteResult.diff.length > 0 ? (
              <div className="mt-2 max-h-60 overflow-y-auto rounded-lg bg-slate-900 p-3">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-slate-400">
                      <th className="w-12 text-left">Line</th>
                      <th className="text-left">Prove-Out</th>
                      <th className="text-left">Production</th>
                      <th className="w-24 text-left">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promoteResult.diff.map((diffRow, index) => (
                      <tr key={`${diffRow.line_number}-${index}`} className="border-t border-slate-800">
                        <td className="py-0.5 text-slate-500">{diffRow.line_number}</td>
                        <td className="max-w-xs truncate text-red-300">{diffRow.prove_out}</td>
                        <td className="max-w-xs truncate text-green-300">{diffRow.production}</td>
                        <td className="text-slate-400">{diffRow.change_type.replace(/_/g, ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          <div>
            <h3 className="mb-1 text-sm text-slate-400">Production Program</h3>
            <textarea value={promoteResult.gcode} readOnly rows={12} className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 p-3 font-mono text-sm text-slate-300" />
          </div>

          <div className="flex gap-3">
            <button onClick={() => handleDownload(promoteResult.gcode, 'production.nc')} className="rounded-lg bg-green-700 px-6 py-2 font-medium text-white hover:bg-green-600">
              Download Production
            </button>
            <button onClick={() => { setStep('upload'); setProveOutResult(null); setPromoteResult(null); setAirCutResult(null); }} className="rounded bg-slate-700 px-4 py-2 font-medium text-slate-300 hover:bg-slate-600">
              Start Over
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
