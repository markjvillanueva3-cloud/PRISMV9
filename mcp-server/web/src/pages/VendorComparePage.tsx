import { useState, useCallback } from 'react';
import { Card, Button, Spinner, Badge, Table, Thead, Tbody, Th, Td } from '../components/ui';
import { useSpeedFeedTriCompare } from '../hooks/useSpeedFeed';
import type {
  TriCompareInput,
  TriCompareSystemName,
  TriCompareAxisVerdict,
} from '../types/speedfeed';

/**
 * VendorComparePage -- the sfc.vendor_parity surface (gated starter+).
 *
 * Renders the backend SpeedFeedTriComparatorEngine result: Kienzle vs literature baseline
 * vs HSMAdvisor (live) vs G-Wizard (crib) for one canonical cut, on a single axis basis,
 * plus the Kienzle-vs-consensus verdict and the per-published-source vendor deltas.
 *
 * Pure consumer (quebec soul): all physics lives behind prism_calc:speed_feed_tri_compare;
 * this page only renders what the dispatcher returns. HSMAdvisor/G-Wizard are state FILES,
 * not headless engines -- when they are not installed / not tool-aligned the backend marks
 * them available:false, and this page renders the honest reason, never a fabricated number.
 */

type IsoGroup = 'P' | 'M' | 'K' | 'N' | 'S' | 'H';
type ToolMaterial = 'carbide' | 'hss' | 'cermet' | 'ceramic' | 'cbn' | 'pcd';
type Operation = 'milling' | 'turning' | 'drilling' | 'tapping' | 'reaming' | 'boring' | 'thread_milling';
type CutType = 'roughing' | 'semi_finishing' | 'finishing';
type Mode = 'cost_batch' | 'aggressive_rush' | 'prism_optimized';

interface FormState {
  material_name: string;
  iso_group: IsoGroup;
  tool_diameter_mm: number;
  flutes: number;
  tool_material: ToolMaterial;
  operation: Operation;
  cut_type: CutType;
  axial_depth_mm: number;
  radial_depth_mm: number;
  optimization_mode: Mode;
}

const DEFAULTS: FormState = {
  material_name: 'AISI 4140',
  iso_group: 'P',
  tool_diameter_mm: 10,
  flutes: 4,
  tool_material: 'carbide',
  operation: 'milling',
  cut_type: 'roughing',
  axial_depth_mm: 2,
  radial_depth_mm: 5,
  optimization_mode: 'prism_optimized',
};

const SYSTEM_LABEL: Record<TriCompareSystemName, string> = {
  prism: 'Kienzle',
  baseline: 'Literature Baseline',
  hsmadvisor: 'HSMAdvisor',
  gwizard: 'G-Wizard',
};

const VERDICT_COLOR: Record<TriCompareAxisVerdict, 'green' | 'yellow' | 'blue' | 'slate'> = {
  aligned: 'green',
  prism_higher: 'yellow',
  prism_lower: 'blue',
  no_consensus: 'slate',
};

const VERDICT_LABEL: Record<TriCompareAxisVerdict, string> = {
  aligned: 'Aligned',
  prism_higher: 'Kienzle higher',
  prism_lower: 'Kienzle lower',
  no_consensus: 'No consensus',
};

const AXIS_LABEL: Record<'vc' | 'fz' | 'rpm' | 'feed', string> = {
  vc: 'Cutting speed (Vc)',
  fz: 'Feed/tooth (fz)',
  rpm: 'Spindle (RPM)',
  feed: 'Feed rate',
};

/** Render a number or a dash when the system is silent (NaN / null / undefined). */
function fmt(n: number | null | undefined, digits = 1): string {
  return typeof n === 'number' && Number.isFinite(n) ? n.toFixed(digits) : '-';
}

/** Signed percentage for the per-vendor variance columns. */
function pct(n: number | null | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '-';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

export default function VendorComparePage() {
  const [form, setForm] = useState<FormState>({ ...DEFAULTS });
  const triCompare = useSpeedFeedTriCompare();

  const set = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const onCompare = useCallback(() => {
    const input: TriCompareInput = {
      material: { iso_group: form.iso_group, name: form.material_name.trim() || undefined },
      tooling: {
        tool_diameter_mm: form.tool_diameter_mm,
        flutes: form.flutes,
        tool_material: form.tool_material,
      },
      toolpath: {
        operation: form.operation,
        cut_type: form.cut_type,
        axial_depth_mm: form.axial_depth_mm,
        radial_depth_mm: form.radial_depth_mm,
      },
      optimization_mode: form.optimization_mode,
    };
    void triCompare.execute(input);
  }, [form, triCompare]);

  const result = triCompare.data;
  const pvc = result?.prism_vs_consensus ?? null;
  const perSource = result?.baseline_detail?.per_source ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      {/* ---- Input form ---- */}
      <div className="space-y-3">
        <Card>
          <h2 className="text-lg font-bold mb-1">Vendor Compare</h2>
          <p className="text-xs text-slate-400 mb-3">
            Kienzle vs literature baseline vs HSMAdvisor vs G-Wizard for one canonical cut.
          </p>

          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Material</label>
              <input
                type="text"
                value={form.material_name}
                onChange={(e) => set('material_name', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border rounded"
                aria-label="Material name"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">ISO Group</label>
                <select
                  value={form.iso_group}
                  onChange={(e) => set('iso_group', e.target.value as IsoGroup)}
                  className="w-full px-2 py-1.5 text-sm border rounded"
                  aria-label="ISO group"
                >
                  {(['P', 'M', 'K', 'N', 'S', 'H'] as IsoGroup[]).map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tool Material</label>
                <select
                  value={form.tool_material}
                  onChange={(e) => set('tool_material', e.target.value as ToolMaterial)}
                  className="w-full px-2 py-1.5 text-sm border rounded"
                  aria-label="Tool material"
                >
                  {(['carbide', 'hss', 'cermet', 'ceramic', 'cbn', 'pcd'] as ToolMaterial[]).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tool Dia (mm)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={form.tool_diameter_mm}
                  onChange={(e) => set('tool_diameter_mm', +e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border rounded"
                  aria-label="Tool diameter mm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Flutes</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={form.flutes}
                  onChange={(e) => set('flutes', +e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border rounded"
                  aria-label="Flute count"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Operation</label>
                <select
                  value={form.operation}
                  onChange={(e) => set('operation', e.target.value as Operation)}
                  className="w-full px-2 py-1.5 text-sm border rounded"
                  aria-label="Operation"
                >
                  {(['milling', 'turning', 'drilling', 'tapping', 'reaming', 'boring', 'thread_milling'] as Operation[]).map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Cut Type</label>
                <select
                  value={form.cut_type}
                  onChange={(e) => set('cut_type', e.target.value as CutType)}
                  className="w-full px-2 py-1.5 text-sm border rounded"
                  aria-label="Cut type"
                >
                  {(['roughing', 'semi_finishing', 'finishing'] as CutType[]).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Axial Depth (mm)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={form.axial_depth_mm}
                  onChange={(e) => set('axial_depth_mm', +e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border rounded"
                  aria-label="Axial depth mm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Radial Depth (mm)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={form.radial_depth_mm}
                  onChange={(e) => set('radial_depth_mm', +e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border rounded"
                  aria-label="Radial depth mm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Optimization Mode</label>
              <select
                value={form.optimization_mode}
                onChange={(e) => set('optimization_mode', e.target.value as Mode)}
                className="w-full px-2 py-1.5 text-sm border rounded"
                aria-label="Optimization mode"
              >
                <option value="prism_optimized">prism_optimized</option>
                <option value="cost_batch">cost_batch</option>
                <option value="aggressive_rush">aggressive_rush</option>
              </select>
            </div>
          </div>

          <Button
            onClick={onCompare}
            disabled={triCompare.loading || !(form.tool_diameter_mm > 0)}
            className="w-full text-sm mt-3 h-11"
          >
            {triCompare.loading ? <Spinner size="sm" /> : 'Compare Vendors'}
          </Button>
          {triCompare.error && (
            <p className="mt-2 text-xs text-red-600" role="alert">{triCompare.error}</p>
          )}
        </Card>
      </div>

      {/* ---- Results ---- */}
      <div className="lg:col-span-2">
        {triCompare.error ? (
          <Card>
            <h3 className="font-bold mb-2 text-red-500">Comparison failed</h3>
            <p className="text-sm text-slate-400">{triCompare.error}</p>
          </Card>
        ) : triCompare.loading ? (
          <Card>
            <div className="flex items-center gap-2 py-12 justify-center text-slate-400">
              <Spinner size="sm" />
              <span className="text-sm">Running Kienzle + vendor comparison...</span>
            </div>
          </Card>
        ) : result ? (
          <div className="space-y-4">
            {/* Verdict */}
            <Card>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">Kienzle vs Consensus</h3>
                {pvc && (
                  <Badge color="slate">
                    Agreement {(pvc.overall_agreement * 100).toFixed(0)}%
                  </Badge>
                )}
              </div>
              {pvc ? (
                <>
                  <p className="text-sm text-slate-300 mb-3">{pvc.verdict_summary}</p>
                  <div className="flex flex-wrap gap-2">
                    {pvc.per_axis.map((a) => (
                      <Badge key={a.axis} color={VERDICT_COLOR[a.verdict]}>
                        {AXIS_LABEL[a.axis]}: {VERDICT_LABEL[a.verdict]} ({pct(a.delta_pct * 100)})
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Consensus = median of {pvc.external_systems_used} available external system(s); Kienzle is the value being judged.
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-400">
                  No external system available -- Kienzle-only result. Open a matching cut in HSMAdvisor or load a G-Wizard crib for a comparison.
                </p>
              )}
            </Card>

            {/* Systems table */}
            <Card>
              <h3 className="font-bold mb-3">Systems (Kienzle-canonical metric)</h3>
              <Table>
                <Thead>
                  <tr>
                    <Th>System</Th>
                    <Th>Vc (m/min)</Th>
                    <Th>fz (mm/tooth)</Th>
                    <Th>RPM</Th>
                    <Th>Feed (mm/min)</Th>
                    <Th>MRR (cm3/min)</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {result.systems.map((s) => (
                    <tr key={s.system}>
                      <Td>
                        <span className="font-medium">{SYSTEM_LABEL[s.system]}</span>
                        {s.aligned === false && (
                          <Badge color="yellow">not aligned</Badge>
                        )}
                      </Td>
                      {s.available && s.axes ? (
                        <>
                          <Td>{fmt(s.axes.vc_mpm, 1)}</Td>
                          <Td>{fmt(s.axes.fz_mm, 4)}</Td>
                          <Td>{fmt(s.axes.rpm, 0)}</Td>
                          <Td>{fmt(s.axes.feed_mmmin, 0)}</Td>
                          <Td>{fmt(s.axes.mrr_cm3min, 2)}</Td>
                        </>
                      ) : (
                        <Td colSpan={5}>
                          <span className="text-xs text-slate-500">
                            Not available{s.unavailable_reason ? `: ${s.unavailable_reason}` : ''}
                          </span>
                        </Td>
                      )}
                    </tr>
                  ))}
                </Tbody>
              </Table>
              <p className="text-xs text-slate-500 mt-2">
                HSMAdvisor and G-Wizard are read from the installed apps; when not installed or not tool-aligned they are reported unavailable, never estimated.
              </p>
            </Card>

            {/* Per-vendor published deltas */}
            {perSource.length > 0 && (
              <Card>
                <h3 className="font-bold mb-3">Per-vendor published deltas (Kienzle vs reference)</h3>
                <Table>
                  <Thead>
                    <tr>
                      <Th>Source</Th>
                      <Th>Vc variance</Th>
                      <Th>fz variance</Th>
                      <Th>Notes</Th>
                    </tr>
                  </Thead>
                  <Tbody>
                    {perSource.map((p, i) => (
                      <tr key={`${p.source}-${i}`}>
                        <Td>
                          <span className="font-medium">{p.source}</span>
                          {p.citation && <span className="block text-xs text-slate-500">{p.citation}</span>}
                        </Td>
                        <Td>{pct(p.vc_variance_pct)}</Td>
                        <Td>{pct(p.fz_variance_pct)}</Td>
                        <Td><span className="text-xs text-slate-400">{p.notes}</span></Td>
                      </tr>
                    ))}
                  </Tbody>
                </Table>
              </Card>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <Card>
                <h3 className="font-bold mb-2 text-amber-400">Notes</h3>
                <ul className="space-y-1">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="text-xs text-slate-400">{w}</li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg mb-2">Vendor Compare</p>
              <p className="text-sm">
                Stack Kienzle against the literature baseline, HSMAdvisor, and G-Wizard for one cut, then
                see where Kienzle agrees with the field and where it diverges. Set the cut on the left and
                run a comparison.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
