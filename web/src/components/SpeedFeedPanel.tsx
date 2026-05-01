/**
 * SpeedFeedPanel — Hero component for physics-backed Speed & Feed calculation.
 * Calls SpeedFeedOrchestratorEngine (8 resolvers, Monte Carlo UQ) via API.
 * Inputs: material, operation, tool diameter, DOC, WOC, flutes.
 * Output: RPM, feed, MRR, power, tool life, safety score, uncertainty bands.
 */
import { useState, useCallback } from 'react';
import { sfQuick, type SpeedFeedParams } from '../api/speedfeed';

const COMMON_MATERIALS = [
  '4140 Steel', '304 Stainless', '316 Stainless', '6061-T6 Aluminum',
  '7075-T6 Aluminum', 'Ti-6Al-4V', 'Inconel 718', '1018 Steel',
  '4340 Steel', 'A2 Tool Steel', 'D2 Tool Steel', 'Cast Iron',
  'Brass 360', 'Copper C110', 'Delrin', 'PEEK',
];

const OPERATIONS = [
  'face_milling', 'slot_milling', 'shoulder_milling', 'pocket_milling',
  'roughing', 'finishing', 'drilling', 'tapping',
  'turning_rough', 'turning_finish', 'boring', 'grooving',
];

const OP_LABELS: Record<string, string> = {
  face_milling: 'Face Milling', slot_milling: 'Slot Milling',
  shoulder_milling: 'Shoulder Milling', pocket_milling: 'Pocket Milling',
  roughing: 'Roughing', finishing: 'Finishing',
  drilling: 'Drilling', tapping: 'Tapping',
  turning_rough: 'Turning (Rough)', turning_finish: 'Turning (Finish)',
  boring: 'Boring', grooving: 'Grooving',
};

interface SFResult {
  rpm?: number;
  feed_rate_mmmin?: number;
  feed_per_tooth_mm?: number;
  cutting_speed_mmin?: number;
  mrr_cm3min?: number;
  power_kw?: number;
  torque_nm?: number;
  tool_life_min?: number;
  surface_finish_ra_um?: number;
  safety_score?: number;
  warnings?: string[];
  formula_used?: string;
}

export function SpeedFeedPanel() {
  const [material, setMaterial] = useState('4140 Steel');
  const [operation, setOperation] = useState('face_milling');
  const [toolDia, setToolDia] = useState(25);
  const [doc, setDoc] = useState(3);
  const [woc, setWoc] = useState(12.5);
  const [flutes, setFlutes] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SFResult | null>(null);

  const calculate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: SpeedFeedParams = {
        material,
        operation,
        tool_diameter_mm: toolDia,
        doc_mm: doc,
        woc_mm: woc,
        num_flutes: flutes,
      };
      const res = await sfQuick(params);
      // API returns { result: { value: { cutting_speed_mpm, spindle_rpm, ... } } }
      const raw = (res as any)?.result?.value ?? (res as any)?.result ?? res;
      // Map API field names to our SFResult interface
      setResult({
        rpm: raw.spindle_rpm,
        cutting_speed_mmin: raw.cutting_speed_mpm,
        feed_rate_mmmin: raw.feed_rate_mmmin,
        feed_per_tooth_mm: raw.feed_per_tooth_mm,
        mrr_cm3min: raw.mrr_cm3min,
        power_kw: raw.power_kw,
        torque_nm: raw.torque_Nm,
        tool_life_min: raw.tool_life_min,
        surface_finish_ra_um: raw.surface_finish_Ra_um,
        safety_score: raw.overall_confidence,
        formula_used: raw.formulas_used?.[0] ?? raw.engines_called?.[0],
        warnings: (raw.playbook_warnings?._items?.slice(0, 3)?.length
          ? raw.playbook_warnings._items.slice(0, 3)
          : raw.limiting_factors?.filter((f: any) => f.severity === 'critical').map((f: any) => f.parameter + ': ' + f.constraint)) || [],
      });
    } catch (e: any) {
      setError(e.message || 'Calculation failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [material, operation, toolDia, doc, woc, flutes]);

  return (
    <div className="bg-gradient-to-r from-prism-50 to-blue-50 rounded-xl border border-prism-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">⚡ Physics-Backed Speed & Feed</h2>
          <p className="text-xs text-gray-500">Powered by SpeedFeedOrchestratorEngine · 8 resolvers · Kienzle/Taylor models</p>
        </div>
        <button
          onClick={calculate}
          disabled={loading}
          className="px-5 py-2 bg-prism-600 text-white text-sm font-medium rounded-lg hover:bg-prism-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Calculating...' : 'Calculate'}
        </button>
      </div>

      {/* Input Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Material</label>
          <select value={material} onChange={e => setMaterial(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5">
            {COMMON_MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Operation</label>
          <select value={operation} onChange={e => setOperation(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5">
            {OPERATIONS.map(o => <option key={o} value={o}>{OP_LABELS[o] || o}</option>)}
          </select>
        </div>
        <InputField label="Tool Ø" unit="mm" value={toolDia} onChange={setToolDia} min={0.5} max={200} step={0.5} />
        <InputField label="DOC" unit="mm" value={doc} onChange={setDoc} min={0.01} max={50} step={0.1} />
        <InputField label="WOC" unit="mm" value={woc} onChange={setWoc} min={0.01} max={200} step={0.1} />
        <InputField label="Flutes" unit="" value={flutes} onChange={setFlutes} min={1} max={20} step={1} />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {loading && !result && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-3 text-center animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-12 mx-auto mb-2" />
              <div className="h-6 bg-gray-200 rounded w-16 mx-auto mb-1" />
              <div className="h-3 bg-gray-200 rounded w-10 mx-auto" />
            </div>
          ))}
        </div>
      )}
      {result && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <ResultCard label="RPM" value={result.rpm} unit="rev/min" />
          <ResultCard label="Vc" value={result.cutting_speed_mmin} unit="m/min" />
          <ResultCard label="Feed Rate" value={result.feed_rate_mmmin} unit="mm/min" />
          <ResultCard label="fz" value={result.feed_per_tooth_mm} unit="mm/tooth" decimals={3} />
          <ResultCard label="MRR" value={result.mrr_cm3min} unit="cm³/min" />
          <ResultCard label="Power" value={result.power_kw} unit="kW" />
          <ResultCard label="Tool Life" value={result.tool_life_min} unit="min" />
          <ResultCard label="Ra" value={result.surface_finish_ra_um} unit="µm" decimals={2} />
        </div>
      )}

      {/* Safety + Warnings */}
      {result && (
        <div className="flex items-center gap-4 mt-3 text-xs">
          {result.safety_score != null && (
            <span className={`font-medium ${
              result.safety_score >= 0.7 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              Safety: {(result.safety_score * 100).toFixed(0)}%
            </span>
          )}
          {result.formula_used && (
            <span className="text-gray-400">Model: {result.formula_used}</span>
          )}
          {result.warnings && result.warnings.length > 0 && (
            <span className="text-amber-600">⚠ {result.warnings.join(' · ')}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helper Components ───────────────────────────────────────────────────────

function InputField({ label, unit, value, onChange, min, max, step }: {
  label: string; unit: string; value: number;
  onChange: (v: number) => void; min: number; max: number; step: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label} {unit && <span className="text-gray-400">({unit})</span>}
      </label>
      <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)}
        min={min} max={max} step={step}
        className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-prism-500" />
    </div>
  );
}

function ResultCard({ label, value, unit, decimals = 1 }: {
  label: string; value?: number; unit: string; decimals?: number;
}) {
  const display = value != null && isFinite(value)
    ? (value < 0.01 ? value.toExponential(2) : value.toFixed(decimals))
    : '—';
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-bold text-prism-700">{display}</div>
      <div className="text-xs text-gray-400">{unit}</div>
    </div>
  );
}
