/**
 * WireEdmFeasibilityPanel — Wire EDM feasibility assessment.
 * Shows: conductivity check, tolerance achievability, min inside radius,
 *        taper feasibility, overall go/no-go gate.
 * Wire: prism_edm:wedm_assess_feasibility
 */

import { useState, useCallback } from 'react';

interface FeasibilityResult {
  overall_feasible: boolean;
  conductivity: {
    feasible: boolean;
    resistivity_uohm_cm: number;
    classification: string;
    note: string;
  };
  tolerance: {
    achievable: boolean;
    best_achievable_mm: number;
    passes_needed: number;
    note: string;
  };
  corner_radius: {
    feasible: boolean;
    min_achievable_mm: number;
    note: string;
  };
  taper: {
    feasible: boolean;
    max_angle_deg: number;
    uv_travel_needed_mm: number;
    note: string;
  };
  through_cut: {
    feasible: boolean;
    note: string;
  };
  blockers: string[];
  warnings: string[];
  recommendations: string[];
}

// Material resistivity database (µΩ·cm)
const RESISTIVITY: Record<string, number> = {
  'copper': 1.7, 'aluminum': 2.65, 'gold': 2.2, 'silver': 1.6,
  'brass': 7.0, 'bronze': 14.0,
  'carbon steel': 15, 'tool steel': 55, 'D2': 55, 'M2': 60, 'A2': 52,
  'stainless steel': 72, '304 SS': 72, '316 SS': 75,
  'titanium': 170, 'Ti-6Al-4V': 170,
  'inconel': 130, 'inconel 718': 130,
  'tungsten carbide': 20, 'tungsten': 5.5,
  'nickel': 7.0, 'molybdenum': 5.3,
  'ceramic': 1e10, 'glass': 1e12, 'plastic': 1e15,
};

function classify(r: number): string {
  if (r <= 100) return 'EASY';
  if (r <= 300) return 'SLOW';
  return 'NOT_FEASIBLE';
}

function assessFeasibility(
  material: string, thickness_mm: number, tolerance_mm: number,
  min_corner_radius_mm: number, taper_deg: number, is_through: boolean,
  wire_dia_mm: number,
): FeasibilityResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Conductivity
  const resistivity = RESISTIVITY[material] ?? RESISTIVITY['tool steel'];
  const cond_class = classify(resistivity);
  const cond_feasible = cond_class !== 'NOT_FEASIBLE';
  if (!cond_feasible) blockers.push(`${material} is non-conductive (resistivity ${resistivity} µΩ·cm) — wire EDM not possible`);
  if (cond_class === 'SLOW') warnings.push(`${material} has high resistivity (${resistivity} µΩ·cm) — expect slower cutting`);

  // Through-cut check
  const through_feasible = is_through;
  if (!through_feasible) blockers.push('Wire EDM requires through-features — blind cavities not possible');

  // Tolerance achievability
  const best_tol = wire_dia_mm >= 0.25 ? 0.005 : wire_dia_mm >= 0.20 ? 0.003 : 0.002;
  const tol_passes = tolerance_mm <= 0.003 ? 5 : tolerance_mm <= 0.005 ? 4 : tolerance_mm <= 0.01 ? 3 : tolerance_mm <= 0.02 ? 2 : 1;
  const tol_achievable = tolerance_mm >= best_tol;
  if (!tol_achievable) {
    warnings.push(`Requested tolerance ±${tolerance_mm}mm may not be achievable — best: ±${best_tol}mm with ${wire_dia_mm}mm wire`);
    recommendations.push(`Use finer wire (0.10mm) for ±${tolerance_mm}mm tolerance`);
  }

  // Corner radius
  const min_achievable_radius = (wire_dia_mm / 2) + 0.02;
  const corner_feasible = min_corner_radius_mm >= min_achievable_radius;
  if (!corner_feasible) {
    blockers.push(`Min corner radius ${min_corner_radius_mm}mm < achievable ${min_achievable_radius.toFixed(3)}mm with ${wire_dia_mm}mm wire`);
    recommendations.push(`Use ${(min_corner_radius_mm * 2 - 0.04).toFixed(2)}mm or smaller wire for ${min_corner_radius_mm}mm corners`);
  }

  // Taper feasibility (UV travel check)
  const uv_needed = Math.tan(taper_deg * Math.PI / 180) * (thickness_mm / 2);
  const max_uv = 120; // typical machine UV travel
  const max_angle = Math.atan(max_uv / (thickness_mm / 2)) * 180 / Math.PI;
  const taper_feasible = taper_deg === 0 || uv_needed <= max_uv;
  if (!taper_feasible) {
    blockers.push(`${taper_deg}° taper at ${thickness_mm}mm needs ${uv_needed.toFixed(1)}mm UV travel — exceeds ${max_uv}mm machine limit`);
  }
  if (taper_deg > 0 && taper_deg > 15) {
    warnings.push(`${taper_deg}° taper is steep — accuracy decreases above 15°`);
  }

  // Thickness warning
  if (thickness_mm > 300) warnings.push(`${thickness_mm}mm thickness is extreme — expect very slow cutting and frequent wire breaks`);
  if (thickness_mm > 200) recommendations.push('Use submerged cutting for parts >200mm thick');

  const overall = cond_feasible && through_feasible && corner_feasible && taper_feasible;

  return {
    overall_feasible: overall,
    conductivity: {
      feasible: cond_feasible,
      resistivity_uohm_cm: resistivity,
      classification: cond_class,
      note: cond_class === 'EASY' ? 'Excellent EDM machinability' : cond_class === 'SLOW' ? 'Feasible but slower' : 'Non-conductive — not feasible',
    },
    tolerance: {
      achievable: tol_achievable,
      best_achievable_mm: best_tol,
      passes_needed: tol_passes,
      note: tol_achievable
        ? `±${tolerance_mm}mm achievable with ${tol_passes} passes`
        : `Best achievable: ±${best_tol}mm with ${wire_dia_mm}mm wire`,
    },
    corner_radius: {
      feasible: corner_feasible,
      min_achievable_mm: min_achievable_radius,
      note: corner_feasible
        ? `${min_corner_radius_mm}mm radius OK with ${wire_dia_mm}mm wire`
        : `Need finer wire — ${wire_dia_mm}mm wire gives min ${min_achievable_radius.toFixed(3)}mm radius`,
    },
    taper: {
      feasible: taper_feasible,
      max_angle_deg: max_angle,
      uv_travel_needed_mm: uv_needed,
      note: taper_deg === 0 ? 'No taper' : taper_feasible
        ? `${taper_deg}° needs ${uv_needed.toFixed(1)}mm UV (within ${max_uv}mm limit)`
        : `${taper_deg}° exceeds machine capability`,
    },
    through_cut: {
      feasible: through_feasible,
      note: through_feasible ? 'Through-cut confirmed' : 'Blind cavity — not possible for wire EDM',
    },
    blockers, warnings, recommendations,
  };
}

export function WireEdmFeasibilityPanel() {
  const [material, setMaterial] = useState('D2');
  const [thickness, setThickness] = useState(25);
  const [tolerance, setTolerance] = useState(0.01);
  const [cornerRadius, setCornerRadius] = useState(0.3);
  const [taperDeg, setTaperDeg] = useState(0);
  const [isThrough, setIsThrough] = useState(true);
  const [wireDia, setWireDia] = useState(0.25);
  const [result, setResult] = useState<FeasibilityResult | null>(null);

  const check = useCallback(() => {
    setResult(assessFeasibility(material, thickness, tolerance, cornerRadius, taperDeg, isThrough, wireDia));
  }, [material, thickness, tolerance, cornerRadius, taperDeg, isThrough, wireDia]);

  const sec = 'bg-zinc-900 border border-zinc-700 rounded-lg p-4 mb-3';
  const lbl = 'text-xs text-zinc-400 uppercase tracking-wide';
  const val = 'text-sm text-zinc-100 font-mono';
  const inp = 'w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1';

  const checkIcon = (pass: boolean) => (
    <span className={`text-sm ${pass ? 'text-emerald-400' : 'text-red-400'}`}>
      {pass ? '\u2713' : '\u2717'}
    </span>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-amber-400 font-semibold text-sm">Feasibility Check</span>
        <span className="text-xs text-zinc-500">Go / no-go gate for wire EDM</span>
      </div>
      <div className={sec}>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className={lbl}>Material</label>
            <select className={inp} value={material} onChange={e => setMaterial(e.target.value)}>
              {Object.keys(RESISTIVITY).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Thickness (mm)</label>
            <input type="number" className={inp} value={thickness} onChange={e => setThickness(Number(e.target.value))} min={1} max={500} /></div>
          <div><label className={lbl}>Tolerance (mm)</label>
            <input type="number" className={inp} value={tolerance} onChange={e => setTolerance(Number(e.target.value))} min={0.001} max={0.5} step={0.001} /></div>
          <div><label className={lbl}>Min corner R (mm)</label>
            <input type="number" className={inp} value={cornerRadius} onChange={e => setCornerRadius(Number(e.target.value))} min={0.05} max={10} step={0.01} /></div>
          <div><label className={lbl}>Taper (deg)</label>
            <input type="number" className={inp} value={taperDeg} onChange={e => setTaperDeg(Number(e.target.value))} min={0} max={45} step={0.5} /></div>
          <div><label className={lbl}>Wire dia (mm)</label>
            <input type="number" className={inp} value={wireDia} onChange={e => setWireDia(Number(e.target.value))} min={0.05} max={0.33} step={0.01} /></div>
          <div>
            <label className={lbl}>Through-cut</label>
            <div className="mt-2 flex items-center gap-2">
              <input type="checkbox" checked={isThrough} onChange={e => setIsThrough(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-purple-500" />
              <span className="text-xs text-zinc-300">{isThrough ? 'Yes' : 'No (blind)'}</span>
            </div>
          </div>
          <div className="flex items-end">
            <button onClick={check} className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 rounded text-sm font-medium text-white">
              Check
            </button>
          </div>
        </div>
      </div>

      {result && (
        <>
          {/* Overall gate */}
          <div className={`${sec} ${result.overall_feasible ? 'border-emerald-600/50 bg-emerald-950/10' : 'border-red-600/50 bg-red-950/10'}`}>
            <div className="flex items-center justify-between">
              <div className={`text-lg font-bold ${result.overall_feasible ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.overall_feasible ? 'FEASIBLE' : 'NOT FEASIBLE'}
              </div>
              <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white ${result.overall_feasible ? 'bg-emerald-600' : 'bg-red-600'}`}>
                {result.overall_feasible ? 'GO' : 'NO-GO'}
              </div>
            </div>
          </div>

          {/* Check details */}
          <div className={sec}>
            <div className="space-y-3">
              {/* Conductivity */}
              <div className="flex items-start gap-3">
                {checkIcon(result.conductivity.feasible)}
                <div className="flex-1">
                  <div className="text-xs text-zinc-300 font-medium">Conductivity</div>
                  <div className="text-[11px] text-zinc-400">{result.conductivity.note}</div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    {result.conductivity.resistivity_uohm_cm} µΩ·cm — {result.conductivity.classification}
                  </div>
                </div>
              </div>

              {/* Through-cut */}
              <div className="flex items-start gap-3">
                {checkIcon(result.through_cut.feasible)}
                <div className="flex-1">
                  <div className="text-xs text-zinc-300 font-medium">Through-Cut</div>
                  <div className="text-[11px] text-zinc-400">{result.through_cut.note}</div>
                </div>
              </div>

              {/* Tolerance */}
              <div className="flex items-start gap-3">
                {checkIcon(result.tolerance.achievable)}
                <div className="flex-1">
                  <div className="text-xs text-zinc-300 font-medium">Tolerance</div>
                  <div className="text-[11px] text-zinc-400">{result.tolerance.note}</div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    Passes needed: {result.tolerance.passes_needed} | Best achievable: ±{result.tolerance.best_achievable_mm}mm
                  </div>
                </div>
              </div>

              {/* Corner radius */}
              <div className="flex items-start gap-3">
                {checkIcon(result.corner_radius.feasible)}
                <div className="flex-1">
                  <div className="text-xs text-zinc-300 font-medium">Corner Radius</div>
                  <div className="text-[11px] text-zinc-400">{result.corner_radius.note}</div>
                </div>
              </div>

              {/* Taper */}
              <div className="flex items-start gap-3">
                {checkIcon(result.taper.feasible)}
                <div className="flex-1">
                  <div className="text-xs text-zinc-300 font-medium">Taper</div>
                  <div className="text-[11px] text-zinc-400">{result.taper.note}</div>
                  {result.taper.uv_travel_needed_mm > 0 && (
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      UV travel: {result.taper.uv_travel_needed_mm.toFixed(1)}mm | Max angle: {result.taper.max_angle_deg.toFixed(1)}°
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Blockers */}
          {result.blockers.length > 0 && (
            <div className={`${sec} border-red-700/40`}>
              <div className="text-xs text-red-400 mb-2 uppercase tracking-wide font-semibold">Blockers</div>
              {result.blockers.map((b, i) => (
                <div key={i} className="text-xs text-red-300 py-1 flex gap-2">
                  <span className="text-red-500">\u2717</span> {b}
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className={`${sec} border-amber-700/40`}>
              <div className="text-xs text-amber-400 mb-2 uppercase tracking-wide font-semibold">Warnings</div>
              {result.warnings.map((w, i) => (
                <div key={i} className="text-xs text-amber-300 py-1 flex gap-2">
                  <span className="text-amber-500">!</span> {w}
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className={sec}>
              <div className="text-xs text-zinc-400 mb-2 uppercase tracking-wide">Recommendations</div>
              {result.recommendations.map((r, i) => (
                <div key={i} className="text-xs text-zinc-300 py-1 flex gap-2">
                  <span className="text-amber-400">&#x2192;</span> {r}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
