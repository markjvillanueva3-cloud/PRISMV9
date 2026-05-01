import { useState } from 'react';
import { ppgProveOut, ppgProveOutPromote, ppgAirCutDetect, ApiError } from '../api/client';

const CONTROLLERS = ['fanuc', 'haas', 'siemens', 'heidenhain', 'mazak', 'okuma'] as const;

type Step = 'upload' | 'prove-out' | 'promote' | 'done';

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

export function ProveOutWorkflowPage() {
  const [step, setStep] = useState<Step>('upload');
  const [gcode, setGcode] = useState('');
  const [controller, setController] = useState<string>('fanuc');
  const [feedReduction, setFeedReduction] = useState(25);
  const [rpmCap, setRpmCap] = useState(80);
  const [operatorName, setOperatorName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [jobNumber, setJobNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [proveOutResult, setProveOutResult] = useState<ProveOutResult | null>(null);
  const [promoteResult, setPromoteResult] = useState<PromoteResult | null>(null);
  const [airCutResult, setAirCutResult] = useState<AirCutResult | null>(null);
  const [showAirCuts, setShowAirCuts] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  async function handleGenerateProveOut() {
    if (!gcode.trim()) { setError('Paste or upload G-code first'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await ppgProveOut({
        gcode,
        config: {
          feed_reduction: feedReduction / 100,
          rpm_cap: rpmCap / 100,
          insert_optional_stops: true,
          add_prove_out_comments: true,
          controller,
        },
      });
      const data = (res as any).data ?? res;
      setProveOutResult(data);
      setStep('prove-out');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to generate prove-out');
    } finally {
      setLoading(false);
    }
  }

  async function handleDetectAirCuts() {
    setLoading(true);
    setError('');
    try {
      const res = await ppgAirCutDetect({ gcode, controller, stock_top_z: 0 });
      const data = (res as any).data ?? res;
      setAirCutResult(data);
      setShowAirCuts(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to detect air cuts');
    } finally {
      setLoading(false);
    }
  }

  async function handlePromote() {
    if (!proveOutResult) return;
    setLoading(true);
    setError('');
    try {
      const res = await ppgProveOutPromote({
        gcode: proveOutResult.gcode,
        original_gcode: gcode,
        feed_reduction: feedReduction / 100,
        rpm_cap: rpmCap / 100,
        operator_name: operatorName,
        part_number: partNumber,
        job_number: jobNumber,
        include_sign_off: true,
      });
      const data = (res as any).data ?? res;
      setPromoteResult(data);
      setStep('promote');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to promote');
    } finally {
      setLoading(false);
    }
  }

  function handleDownload(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setGcode(reader.result as string); };
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
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Prove-Out Workflow</h1>
        <p className="text-slate-400 mt-1">Upload G-code, generate safe prove-out, run first article, promote to production</p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2">
        {(['upload', 'prove-out', 'promote', 'done'] as Step[]).map((s, i) => (
          <div key={s} className={`flex items-center gap-2 ${step === s ? 'text-cyan-400' : i < ['upload', 'prove-out', 'promote', 'done'].indexOf(step) ? 'text-green-400' : 'text-slate-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === s ? 'bg-cyan-900 border border-cyan-500' : i < ['upload', 'prove-out', 'promote', 'done'].indexOf(step) ? 'bg-green-900 border border-green-500' : 'bg-slate-800 border border-slate-600'}`}>
              {i + 1}
            </div>
            <span className="text-sm capitalize">{s === 'prove-out' ? 'Prove-Out' : s}</span>
            {i < 3 && <span className="text-slate-600 mx-2">→</span>}
          </div>
        ))}
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300">{error}</div>}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Controller</label>
              <select value={controller} onChange={e => setController(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200">
                {CONTROLLERS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Feed Reduction %</label>
              <input type="number" min={5} max={50} value={feedReduction} onChange={e => setFeedReduction(+e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">RPM Cap %</label>
              <input type="number" min={50} max={100} value={rpmCap} onChange={e => setRpmCap(+e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">G-code Program</label>
            <div className="flex gap-2 mb-2">
              <label className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-300 cursor-pointer">
                Upload File
                <input type="file" accept=".nc,.gcode,.tap,.txt" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            <textarea value={gcode} onChange={e => setGcode(e.target.value)} rows={15} placeholder="Paste G-code here or upload a file..." className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-mono text-sm text-slate-300 resize-y" />
          </div>

          <div className="flex gap-3">
            <button onClick={handleGenerateProveOut} disabled={loading || !gcode.trim()} className="px-6 py-2 bg-cyan-700 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg font-medium text-white">
              {loading ? 'Generating...' : 'Create Prove-Out'}
            </button>
            <button onClick={handleDetectAirCuts} disabled={loading || !gcode.trim()} className="px-6 py-2 bg-violet-700 hover:bg-violet-600 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg font-medium text-white">
              {loading ? 'Scanning...' : 'Detect Air Cuts'}
            </button>
          </div>

          {/* Air-cut results overlay */}
          {showAirCuts && airCutResult && (
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-100">Air-Cut Detection Results</h3>
                <button onClick={() => setShowAirCuts(false)} className="text-slate-400 hover:text-slate-200">Close</button>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="bg-slate-900 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-400">{airCutResult.detections.length}</div>
                  <div className="text-xs text-slate-400">Air-Cut Blocks</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-orange-400">{airCutResult.total_time_wasted_sec.toFixed(1)}s</div>
                  <div className="text-xs text-slate-400">Time Wasted</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-400">{airCutResult.summary.air_cut_pct.toFixed(1)}%</div>
                  <div className="text-xs text-slate-400">Air-Cut Lines</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">{airCutResult.summary.time_saved_if_optimized_sec.toFixed(1)}s</div>
                  <div className="text-xs text-slate-400">Saveable</div>
                </div>
              </div>

              {airCutResult.detections.length > 0 && (
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {airCutResult.detections.map((d, i) => (
                    <div key={i} className={`flex items-center gap-3 px-3 py-1.5 rounded text-sm ${typeColors[d.type] || 'bg-slate-700 text-slate-300'}`}>
                      <span className="font-mono w-16 text-right">L{d.line_number}</span>
                      <span className="font-mono flex-1 truncate">{d.gcode_text}</span>
                      <span className="text-xs opacity-70">{d.type.replace(/_/g, ' ')}</span>
                      <span className="text-xs">{d.time_wasted_sec.toFixed(2)}s</span>
                    </div>
                  ))}
                </div>
              )}

              {airCutResult.optimized_gcode && (
                <button onClick={() => { setGcode(airCutResult.optimized_gcode); setShowAirCuts(false); }} className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded text-sm font-medium text-white">
                  Apply Optimized G-code
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Prove-Out Generated */}
      {step === 'prove-out' && proveOutResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-cyan-400">{proveOutResult.summary.modified_lines}</div>
              <div className="text-xs text-slate-400">Lines Modified</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-400">{proveOutResult.summary.feed_reductions}</div>
              <div className="text-xs text-slate-400">Feeds Reduced</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-violet-400">{proveOutResult.summary.rpm_caps}</div>
              <div className="text-xs text-slate-400">RPMs Capped</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-400">{proveOutResult.estimated_cycle_time_ratio.toFixed(2)}x</div>
              <div className="text-xs text-slate-400">Cycle Time</div>
            </div>
          </div>

          {proveOutResult.warnings.length > 0 && (
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-yellow-300 mb-1">Warnings</h4>
              {proveOutResult.warnings.map((w, i) => <div key={i} className="text-xs text-yellow-200">{w}</div>)}
            </div>
          )}

          <div>
            <h3 className="text-sm text-slate-400 mb-1">Prove-Out Program (ready for first article)</h3>
            <textarea value={proveOutResult.gcode} readOnly rows={12} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-mono text-sm text-green-300 resize-y" />
          </div>

          <div className="flex gap-3">
            <button onClick={() => handleDownload(proveOutResult.gcode, 'prove-out.nc')} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-medium text-slate-200">
              Download Prove-Out
            </button>
            <button onClick={handlePromote} disabled={loading} className="px-6 py-2 bg-green-700 hover:bg-green-600 disabled:bg-slate-700 rounded-lg font-medium text-white">
              {loading ? 'Promoting...' : 'Promote to Production'}
            </button>
            <button onClick={() => { setStep('upload'); setProveOutResult(null); }} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-medium text-slate-300">
              Back
            </button>
          </div>

          {/* Sign-off fields */}
          <div className="bg-slate-800 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-300">Operator Sign-Off (for production promotion)</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Operator Name</label>
                <input type="text" value={operatorName} onChange={e => setOperatorName(e.target.value)} placeholder="John Smith" className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-200" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Part Number</label>
                <input type="text" value={partNumber} onChange={e => setPartNumber(e.target.value)} placeholder="P-1234" className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-200" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Job / WO Number</label>
                <input type="text" value={jobNumber} onChange={e => setJobNumber(e.target.value)} placeholder="WO-5678" className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-200" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Promoted to Production */}
      {step === 'promote' && promoteResult && (
        <div className="space-y-4">
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-300">Production Program Ready</h3>
            <p className="text-sm text-green-200 mt-1">
              Restored {promoteResult.feeds_restored} feed rates, {promoteResult.rpms_restored} RPM values.
              Removed {promoteResult.lines_removed} prove-out lines.
              Method: {promoteResult.restoration_method}.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-400">{promoteResult.feeds_restored}</div>
              <div className="text-xs text-slate-400">Feeds Restored</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-cyan-400">{promoteResult.rpms_restored}</div>
              <div className="text-xs text-slate-400">RPMs Restored</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-violet-400">{promoteResult.lines_removed}</div>
              <div className="text-xs text-slate-400">Lines Removed</div>
            </div>
          </div>

          {promoteResult.sign_off && (
            <div className="bg-slate-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-slate-300 mb-2">Sign-Off</h4>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div><span className="text-slate-400">Operator:</span> <span className="text-slate-200">{promoteResult.sign_off.operator || '—'}</span></div>
                <div><span className="text-slate-400">Part:</span> <span className="text-slate-200">{promoteResult.sign_off.part_number || '—'}</span></div>
                <div><span className="text-slate-400">Job:</span> <span className="text-slate-200">{promoteResult.sign_off.job_number || '—'}</span></div>
                <div><span className="text-slate-400">Date:</span> <span className="text-slate-200">{promoteResult.sign_off.date}</span></div>
              </div>
            </div>
          )}

          {/* Diff toggle */}
          <div>
            <button onClick={() => setShowDiff(!showDiff)} className="text-sm text-cyan-400 hover:text-cyan-300 underline">
              {showDiff ? 'Hide' : 'Show'} Side-by-Side Diff ({promoteResult.diff.length} changes)
            </button>
            {showDiff && promoteResult.diff.length > 0 && (
              <div className="mt-2 bg-slate-900 rounded-lg p-3 max-h-60 overflow-y-auto">
                <table className="w-full text-xs font-mono">
                  <thead><tr className="text-slate-400"><th className="text-left w-12">Line</th><th className="text-left">Prove-Out</th><th className="text-left">Production</th><th className="text-left w-24">Change</th></tr></thead>
                  <tbody>
                    {promoteResult.diff.map((d, i) => (
                      <tr key={i} className="border-t border-slate-800">
                        <td className="text-slate-500 py-0.5">{d.line_number}</td>
                        <td className="text-red-300 truncate max-w-xs">{d.prove_out}</td>
                        <td className="text-green-300 truncate max-w-xs">{d.production}</td>
                        <td className="text-slate-400">{d.change_type.replace(/_/g, ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm text-slate-400 mb-1">Production Program</h3>
            <textarea value={promoteResult.gcode} readOnly rows={12} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-mono text-sm text-slate-300 resize-y" />
          </div>

          <div className="flex gap-3">
            <button onClick={() => handleDownload(promoteResult.gcode, 'production.nc')} className="px-6 py-2 bg-green-700 hover:bg-green-600 rounded-lg font-medium text-white">
              Download Production
            </button>
            <button onClick={() => { setStep('upload'); setProveOutResult(null); setPromoteResult(null); setAirCutResult(null); }} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-medium text-slate-300">
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
