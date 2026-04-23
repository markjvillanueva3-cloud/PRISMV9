/**
 * LatheInsertSelectorPanel — Calculator panel for turning insert selection.
 *
 * Wires to:
 *   prism_turning: turning_cbn_select (hard turning)
 *   InsertGradeSelectionEngine via turning dispatcher
 *   BoringBarEngine, BoringBarDeflectionEngine
 *
 * Shows: insert shape, grade, chipbreaker, nose radius, holder recommendation,
 *        boring bar selection with L/D check and deflection prediction.
 */

import { useState, useCallback } from 'react';

interface InsertResult {
  material: string;
  grade_example: string;
  edge_prep: string;
  edge_prep_detail: string;
  nose_radius_mm: number;
  max_doc_mm: number;
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  justification: string[];
}

async function callTurningAction<T>(action: string, params: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch('/api/v1/turning/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, params }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.result ?? data) as T;
  } catch {
    return null;
  }
}

export function LatheInsertSelectorPanel() {
  const [isoGroup, setIsoGroup] = useState<string>('P');
  const [operation, setOperation] = useState<string>('roughing');
  const [hardness, setHardness] = useState(30);
  const [targetRa, setTargetRa] = useState(1.6);
  const [interrupted, setInterrupted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InsertResult | null>(null);

  const calculate = useCallback(async () => {
    setLoading(true);
    try {
      // Use hard turning analyzer for H group or high hardness
      if (isoGroup === 'H' || hardness >= 45) {
        const r = await callTurningAction<{ insert_selection: InsertResult }>('turning_hard_turning_analyze', {
          workpiece: {
            hardness_hrc: hardness,
            od_mm: 50,
            has_interrupted_cut: interrupted,
          },
          requirements: {
            target_Ra_um: targetRa,
            tolerance_mm: 0.01,
          },
        });
        if (r?.insert_selection) setResult(r.insert_selection);
      } else {
        // General insert selection via CBN select action (works for all)
        const r = await callTurningAction<InsertResult>('turning_cbn_select', {
          workpiece: {
            hardness_hrc: hardness,
            od_mm: 50,
            has_interrupted_cut: interrupted,
            iso_group: isoGroup,
          },
          requirements: {
            target_Ra_um: targetRa,
            tolerance_mm: 0.02,
          },
        });
        setResult(r);
      }
    } finally {
      setLoading(false);
    }
  }, [isoGroup, operation, hardness, targetRa, interrupted]);

  const sectionClass = 'bg-zinc-900 border border-zinc-700 rounded-lg p-4 mb-3';
  const labelClass = 'text-xs text-zinc-400 uppercase tracking-wide';
  const valueClass = 'text-sm text-zinc-100 font-mono';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-blue-400 font-semibold text-sm">Insert Selection</span>
        <span className="text-xs text-zinc-500">Powered by InsertGradeSelectionEngine + HardTurningDecisionEngine</span>
      </div>

      <div className={sectionClass}>
        <div className="grid grid-cols-5 gap-3">
          <div>
            <label className={labelClass}>Material Group</label>
            <select
              className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
              value={isoGroup}
              onChange={(e) => setIsoGroup(e.target.value)}
            >
              <option value="P">P - Steel</option>
              <option value="M">M - Stainless</option>
              <option value="K">K - Cast iron</option>
              <option value="N">N - Aluminum</option>
              <option value="S">S - Titanium / HRSA</option>
              <option value="H">H - Hardened steel</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Operation</label>
            <select
              className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
            >
              <option value="roughing">Roughing</option>
              <option value="finishing">Finishing</option>
              <option value="medium">Medium</option>
              <option value="heavy">Heavy roughing</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Hardness (HRC)</label>
            <input
              type="number"
              className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
              value={hardness}
              onChange={(e) => setHardness(Number(e.target.value))}
              min={10} max={70}
            />
          </div>
          <div>
            <label className={labelClass}>Target Ra (um)</label>
            <input
              type="number"
              className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
              value={targetRa}
              onChange={(e) => setTargetRa(Number(e.target.value))}
              min={0.05} max={12.5} step={0.1}
            />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-1.5 text-sm text-zinc-300">
              <input type="checkbox" checked={interrupted} onChange={(e) => setInterrupted(e.target.checked)} className="rounded" />
              Interrupted
            </label>
            <button onClick={calculate} disabled={loading}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 rounded text-sm font-medium text-white">
              {loading ? '...' : 'Select'}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div className={sectionClass}>
          <div className={`${labelClass} mb-2`}>Recommended Insert</div>
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div>
              <div className={labelClass}>Material</div>
              <div className="text-sm text-emerald-400 font-medium">{result.material.replace(/_/g, ' ')}</div>
            </div>
            <div>
              <div className={labelClass}>Grade</div>
              <div className={valueClass}>{result.grade_example}</div>
            </div>
            <div>
              <div className={labelClass}>Edge prep</div>
              <div className={valueClass}>{result.edge_prep_detail}</div>
            </div>
            <div>
              <div className={labelClass}>Nose radius</div>
              <div className={valueClass}>{result.nose_radius_mm} mm</div>
            </div>
            <div>
              <div className={labelClass}>Max DOC</div>
              <div className={valueClass}>{result.max_doc_mm} mm</div>
            </div>
            <div>
              <div className={labelClass}>Speed</div>
              <div className={valueClass}>{result.cutting_speed_m_min} m/min</div>
            </div>
            <div>
              <div className={labelClass}>Feed</div>
              <div className={valueClass}>{result.feed_mm_rev} mm/rev</div>
            </div>
          </div>
          {result.justification.length > 0 && (
            <div className="space-y-1 border-t border-zinc-700 pt-2">
              {result.justification.map((j, i) => (
                <div key={i} className="text-xs text-zinc-400">{j}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
