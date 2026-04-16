/**
 * FeatureEditorPanel — Multi-mode interactive feature tree with dimension editing.
 *
 * Designed for: lathe (OD/ID/thread/groove), wire_edm (contours), mill (pockets/holes/faces).
 * Follows WireEdmContourPicker pattern: selection state + callbacks + memoized rendering.
 *
 * Features:
 * - Clickable feature tree sidebar
 * - Per-feature dimension editing (inline numeric inputs)
 * - Secondary operation assignment per feature (heat treat, grinding, plating, anodize)
 * - Stock allowance for secondary ops (leave material for grinding, plating buildup)
 * - Add/remove features manually
 * - Callbacks: onFeatureSelect, onFeatureUpdate, onSecondaryOpChange
 */

import { useState, useMemo, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────

export type MachineMode = 'lathe' | 'wire_edm' | 'mill' | 'laser' | 'waterjet' | 'edm';

export interface FeatureDimension {
  key: string;
  label: string;
  value: number;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
  editable?: boolean;
}

export interface SecondaryOp {
  id: string;
  type: 'heat_treat' | 'grinding' | 'plating' | 'anodize' | 'coating' | 'ndt' | 'deburring' | 'none';
  label: string;
  stock_allowance_mm?: number;
  target_hardness_hrc?: number;
  case_depth_mm?: number;
  plating_thickness_um?: number;
  anodize_type?: 'Type_II' | 'Type_III';
  spec_reference?: string;
}

export interface PartFeature {
  id: string;
  type: string;
  label: string;
  icon: string;
  dimensions: FeatureDimension[];
  secondary_ops: SecondaryOp[];
  tolerance_mm?: number;
  surface_finish_Ra_um?: number;
  position_z_mm?: number;
  profile_points?: Array<{ X: number; Z: number }>;
}

interface Props {
  mode: MachineMode;
  features: PartFeature[];
  selectedFeatureId: string | null;
  onFeatureSelect: (featureId: string | null) => void;
  onFeatureUpdate: (featureId: string, dims: FeatureDimension[]) => void;
  onSecondaryOpChange: (featureId: string, ops: SecondaryOp[]) => void;
  onFeatureAdd?: (feature: PartFeature) => void;
  onFeatureRemove?: (featureId: string) => void;
}

// ── Feature Type Metadata ─────────────────────────────────────────────

const FEATURE_ICONS: Record<string, string> = {
  // Lathe
  OD_STRAIGHT: '\u2B24', OD_TAPER: '\u25B3', OD_ARC: '\u25EF', OD_STEP: '\u2592',
  BORE_THROUGH: '\u25CB', BORE_BLIND: '\u25D5', BORE_STEP: '\u25D4', BORE_TAPER: '\u25CE',
  THREAD_EXTERNAL: '\u2261', THREAD_INTERNAL: '\u2263',
  GROOVE_OD: '\u2550', GROOVE_ID: '\u2551', GROOVE_FACE: '\u2500',
  FACE: '\u25A0', CHAMFER: '\u25E2', RADIUS: '\u25E0',
  UNDERCUT_DIN509: '\u2310', KNURL: '\u2593', CENTER_DRILL: '\u2316',
  // Mill
  CONTOUR: '\u25C7', POCKET: '\u25A1', HOLE: '\u25CB', SLOT: '\u2550',
  // Wire EDM
  PUNCH_PROFILE: '\u25C6', DIE_PROFILE: '\u25C7', WIRE_SLOT: '\u2550',
  WIRE_POCKET: '\u25A3', RELIEF_CUT: '\u2310', TAB_BRIDGE: '\u2503',
  START_HOLE: '\u2299', TAPER_SECTION: '\u25B7',
};

const SECONDARY_OP_PRESETS: SecondaryOp[] = [
  { id: 'none', type: 'none', label: 'None' },
  { id: 'grind', type: 'grinding', label: 'Grinding', stock_allowance_mm: 0.3, spec_reference: '' },
  { id: 'ht_through', type: 'heat_treat', label: 'Through Harden', target_hardness_hrc: 58, spec_reference: 'AMS 2759' },
  { id: 'ht_case', type: 'heat_treat', label: 'Case Harden', target_hardness_hrc: 60, case_depth_mm: 0.8, spec_reference: 'AMS 2759/7' },
  { id: 'ht_carb', type: 'heat_treat', label: 'Carburize', target_hardness_hrc: 62, case_depth_mm: 1.0, spec_reference: 'AMS 2759/7' },
  { id: 'plate_chrome', type: 'plating', label: 'Hard Chrome', plating_thickness_um: 25, stock_allowance_mm: -0.025, spec_reference: 'AMS 2406' },
  { id: 'plate_enp', type: 'plating', label: 'Electroless Nickel', plating_thickness_um: 25, stock_allowance_mm: -0.025, spec_reference: 'AMS 2404' },
  { id: 'anod_ii', type: 'anodize', label: 'Anodize Type II', anodize_type: 'Type_II', stock_allowance_mm: -0.003, spec_reference: 'MIL-A-8625 Type II' },
  { id: 'anod_iii', type: 'anodize', label: 'Anodize Type III (Hard)', anodize_type: 'Type_III', stock_allowance_mm: -0.025, spec_reference: 'MIL-A-8625 Type III' },
  { id: 'ndt_mpi', type: 'ndt', label: 'MPI (Magnetic Particle)', spec_reference: 'ASTM E1444' },
  { id: 'ndt_fpi', type: 'ndt', label: 'FPI (Fluorescent Penetrant)', spec_reference: 'ASTM E1417' },
  { id: 'deburr', type: 'deburring', label: 'Deburr / Tumble', spec_reference: '' },
];

/** Wire EDM-specific secondary ops — post-EDM treatments for punches, dies, and precision contours */
const WEDM_SECONDARY_OP_PRESETS: SecondaryOp[] = [
  { id: 'none', type: 'none', label: 'None' },
  { id: 'wedm_stress_relief', type: 'heat_treat', label: 'Stress Relief Anneal', target_hardness_hrc: 0, spec_reference: 'AMS 2759/3 — 550-650\u00B0C/1h per 25mm, post-EDM tensile\u2192compressive' },
  { id: 'wedm_recast_removal', type: 'grinding', label: 'Recast Layer Removal', stock_allowance_mm: 0.015, spec_reference: 'Chemical etch (HNO\u2083/HF) or light surface grind to remove EDM recast' },
  { id: 'wedm_grind_allowance', type: 'grinding', label: 'Grinding Allowance', stock_allowance_mm: 0.2, spec_reference: 'Leave 0.1-0.3mm for post-EDM surface grind to final dimension' },
  { id: 'wedm_hard_coat', type: 'coating', label: 'Hard Coating (TiN/DLC)', plating_thickness_um: 3, stock_allowance_mm: -0.003, spec_reference: 'PVD TiN/TiAlN/DLC for punch & die wear surfaces' },
  { id: 'wedm_polish', type: 'grinding', label: 'Polish Allowance', stock_allowance_mm: 0.05, spec_reference: 'Leave 0.03-0.08mm for die cavity mirror polish (SPI A-1/A-2)' },
  { id: 'wedm_nitride', type: 'coating', label: 'Nitriding', case_depth_mm: 0.15, spec_reference: 'Gas/plasma nitriding for die surface hardening — AMS 2759/10' },
  { id: 'ndt_fpi', type: 'ndt', label: 'FPI (Fluorescent Penetrant)', spec_reference: 'ASTM E1417 — detect EDM-induced micro-cracks' },
  { id: 'deburr', type: 'deburring', label: 'Deburr / Edge Break', spec_reference: '' },
];

/** Get the secondary ops presets appropriate for the current machine mode */
function getSecondaryOpPresets(mode: MachineMode): SecondaryOp[] {
  return mode === 'wire_edm' ? WEDM_SECONDARY_OP_PRESETS : SECONDARY_OP_PRESETS;
}

// ── Wire EDM contour-to-feature mapping ──────────────────────────────

export interface ContourData {
  id: string;
  segments: unknown[];
  is_closed: boolean;
  perimeter_mm: number;
  area_mm2: number;
  min_radius_mm?: number;
  bounding_box?: { width: number; height: number };
}

/** Classify a wire EDM contour into a feature type based on geometry */
function classifyWireContour(contour: ContourData, index: number, total: number): string {
  if (!contour.is_closed) return 'RELIEF_CUT';
  if (contour.area_mm2 < 5) return 'START_HOLE';
  // Largest closed contour is typically the die profile (outer boundary)
  if (index === 0 && total > 1) return 'DIE_PROFILE';
  // Narrow aspect ratio → slot
  if (contour.bounding_box) {
    const { width, height } = contour.bounding_box;
    const aspect = Math.max(width, height) / Math.max(Math.min(width, height), 0.01);
    if (aspect > 5) return 'WIRE_SLOT';
  }
  // Small internal closed contours → punch profiles
  if (contour.area_mm2 < 200) return 'PUNCH_PROFILE';
  return 'DIE_PROFILE';
}

/** Map an array of ContourData to PartFeature[] for wire_edm mode */
export function contoursToPartFeatures(contours: ContourData[]): PartFeature[] {
  // Sort by area descending so largest contour is index 0
  const sorted = [...contours].sort((a, b) => b.area_mm2 - a.area_mm2);
  return sorted.map((c, i) => {
    const featureType = classifyWireContour(c, i, sorted.length);
    return {
      id: c.id || `wire-feat-${i}`,
      type: featureType,
      label: `${featureType.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())} ${i + 1}`,
      icon: FEATURE_ICONS[featureType] ?? '\u25C7',
      dimensions: [
        { key: 'perimeter_mm', label: 'Perimeter', value: Number(c.perimeter_mm.toFixed(2)), unit: 'mm', min: 0.1, step: 0.01, editable: false },
        { key: 'area_mm2', label: 'Area', value: Number(c.area_mm2.toFixed(2)), unit: 'mm\u00B2', min: 0, step: 0.01, editable: false },
        { key: 'min_radius_mm', label: 'Min radius', value: c.min_radius_mm ?? 0.15, unit: 'mm', min: 0.01, step: 0.01, editable: true },
        { key: 'offset_mm', label: 'Wire offset', value: 0.13, unit: 'mm', min: 0, max: 1, step: 0.005, editable: true },
        { key: 'taper_angle_deg', label: 'Taper angle', value: 0, unit: '\u00B0', min: 0, max: 30, step: 0.1, editable: true },
      ],
      secondary_ops: [],
      tolerance_mm: 0.01,
      surface_finish_Ra_um: 0.8,
    };
  });
}

// ── Component ─────────────────────────────────────────────────────────

export function FeatureEditorPanel({
  mode, features, selectedFeatureId,
  onFeatureSelect, onFeatureUpdate, onSecondaryOpChange,
  onFeatureAdd, onFeatureRemove,
}: Props) {
  const [expandedSecondary, setExpandedSecondary] = useState<string | null>(null);
  const activePresets = useMemo(() => getSecondaryOpPresets(mode), [mode]);

  const selectedFeature = useMemo(
    () => features.find(f => f.id === selectedFeatureId) ?? null,
    [features, selectedFeatureId],
  );

  const featuresByType = useMemo(() => {
    const groups: Record<string, PartFeature[]> = {};
    for (const f of features) {
      const category = f.type.split('_')[0] || 'OTHER';
      if (!groups[category]) groups[category] = [];
      groups[category].push(f);
    }
    return groups;
  }, [features]);

  /** Per-mode dimension limits for validation */
  const DIMENSION_LIMITS: Record<string, Record<string, { min: number; max: number }>> = useMemo(() => ({
    lathe: {
      od_mm: { min: 1, max: 500 }, id_mm: { min: 0.5, max: 490 }, length_mm: { min: 0.1, max: 2000 },
      wall_thickness_mm: { min: 0.3, max: 100 }, taper_angle_deg: { min: 0, max: 60 },
      thread_pitch_mm: { min: 0.2, max: 8 }, groove_width_mm: { min: 0.5, max: 50 },
    },
    wire_edm: {
      perimeter_mm: { min: 1, max: 10000 }, area_mm2: { min: 0.01, max: 500000 },
      min_radius_mm: { min: 0.02, max: 100 }, offset_mm: { min: 0.05, max: 0.5 },
      taper_angle_deg: { min: 0, max: 45 }, thickness_mm: { min: 0.1, max: 500 },
    },
  }), []);

  /** Check if a dimension value is within valid range for the current mode */
  const validateDimension = useCallback((dimKey: string, value: number): string | null => {
    const limits = DIMENSION_LIMITS[mode]?.[dimKey];
    if (!limits) return null;
    if (value < limits.min) return `Min: ${limits.min}`;
    if (value > limits.max) return `Max: ${limits.max}`;
    return null;
  }, [mode, DIMENSION_LIMITS]);

  const handleDimChange = useCallback((featureId: string, dimKey: string, value: number) => {
    const feature = features.find(f => f.id === featureId);
    if (!feature) return;
    const updatedDims = feature.dimensions.map(d =>
      d.key === dimKey ? { ...d, value } : d,
    );
    onFeatureUpdate(featureId, updatedDims);
  }, [features, onFeatureUpdate]);

  const handleSecondaryOpAdd = useCallback((featureId: string, preset: SecondaryOp) => {
    const feature = features.find(f => f.id === featureId);
    if (!feature) return;
    const exists = feature.secondary_ops.some(op => op.id === preset.id);
    if (exists) return;
    onSecondaryOpChange(featureId, [...feature.secondary_ops, { ...preset }]);
  }, [features, onSecondaryOpChange]);

  const handleSecondaryOpRemove = useCallback((featureId: string, opId: string) => {
    const feature = features.find(f => f.id === featureId);
    if (!feature) return;
    onSecondaryOpChange(featureId, feature.secondary_ops.filter(op => op.id !== opId));
  }, [features, onSecondaryOpChange]);

  const handleSecondaryOpUpdate = useCallback((featureId: string, opId: string, field: string, value: number) => {
    const feature = features.find(f => f.id === featureId);
    if (!feature) return;
    const updated = feature.secondary_ops.map(op =>
      op.id === opId ? { ...op, [field]: value } : op,
    );
    onSecondaryOpChange(featureId, updated);
  }, [features, onSecondaryOpChange]);

  const sec = 'bg-zinc-900/80 border border-zinc-700/50 rounded-lg';
  const lbl = 'text-[10px] text-zinc-500 uppercase tracking-wide';

  const totalSecondaryOps = useMemo(
    () => features.reduce((sum, f) => sum + f.secondary_ops.filter(o => o.type !== 'none').length, 0),
    [features],
  );

  return (
    <div className="flex gap-3 min-h-[320px]">
      {/* Feature Tree Sidebar */}
      <div className={`${sec} w-[240px] flex-shrink-0 p-3 overflow-y-auto max-h-[500px]`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-zinc-300">Features ({features.length})</span>
          {totalSecondaryOps > 0 && (
            <span className="text-[10px] text-amber-400">{totalSecondaryOps} sec ops</span>
          )}
        </div>

        {Object.entries(featuresByType).map(([category, catFeatures]) => (
          <div key={category} className="mb-2">
            <div className={`${lbl} mb-1`}>{category}</div>
            {catFeatures.map(f => (
              <button
                key={f.id}
                onClick={() => onFeatureSelect(f.id === selectedFeatureId ? null : f.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition mb-0.5 flex items-center gap-1.5 ${
                  f.id === selectedFeatureId
                    ? 'bg-cyan-500/20 border border-cyan-400/30 text-cyan-200'
                    : 'hover:bg-zinc-800 text-zinc-300 border border-transparent'
                }`}
              >
                <span className="text-[11px]">{FEATURE_ICONS[f.type] ?? '\u25A0'}</span>
                <span className="truncate flex-1">{f.label}</span>
                {f.secondary_ops.some(o => o.type !== 'none') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        ))}

        {onFeatureAdd && (
          <button
            onClick={() => onFeatureAdd({
              id: `feat-${Date.now()}`,
              type: mode === 'lathe' ? 'OD_STRAIGHT' : mode === 'wire_edm' ? 'PUNCH_PROFILE' : 'POCKET',
              label: mode === 'wire_edm' ? 'New contour' : 'New feature',
              icon: mode === 'wire_edm' ? '\u25C6' : '\u25A0',
              dimensions: mode === 'lathe'
                ? [
                    { key: 'od_mm', label: 'OD', value: 50, unit: 'mm', min: 1, step: 0.1, editable: true },
                    { key: 'length_mm', label: 'Length', value: 20, unit: 'mm', min: 0.5, step: 0.1, editable: true },
                  ]
                : mode === 'wire_edm'
                ? [
                    { key: 'perimeter_mm', label: 'Perimeter', value: 100, unit: 'mm', min: 0.1, step: 0.1, editable: true },
                    { key: 'area_mm2', label: 'Area', value: 500, unit: 'mm\u00B2', min: 0, step: 1, editable: true },
                    { key: 'min_radius_mm', label: 'Min radius', value: 0.15, unit: 'mm', min: 0.01, step: 0.01, editable: true },
                    { key: 'offset_mm', label: 'Wire offset', value: 0.13, unit: 'mm', min: 0, max: 1, step: 0.005, editable: true },
                    { key: 'taper_angle_deg', label: 'Taper angle', value: 0, unit: '\u00B0', min: 0, max: 30, step: 0.1, editable: true },
                  ]
                : [
                    { key: 'width_mm', label: 'Width', value: 10, unit: 'mm', min: 0.1, step: 0.1, editable: true },
                    { key: 'depth_mm', label: 'Depth', value: 5, unit: 'mm', min: 0.1, step: 0.1, editable: true },
                  ],
              secondary_ops: [],
            })}
            className="w-full mt-2 px-2 py-1.5 border border-dashed border-zinc-600 rounded text-xs text-zinc-400 hover:text-cyan-300 hover:border-cyan-500/30 transition"
          >
            + Add Feature
          </button>
        )}
      </div>

      {/* Dimension Editor + Secondary Ops */}
      <div className="flex-1 min-w-0">
        {selectedFeature ? (
          <div className={`${sec} p-4`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">{FEATURE_ICONS[selectedFeature.type] ?? '\u25A0'}</span>
                <span className="text-sm font-medium text-zinc-200">{selectedFeature.label}</span>
                <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">{selectedFeature.type}</span>
              </div>
              {onFeatureRemove && (
                <button
                  onClick={() => onFeatureRemove(selectedFeature.id)}
                  className="text-[10px] text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              )}
            </div>

            {/* Dimensions Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {selectedFeature.dimensions.map(dim => {
                const validationError = validateDimension(dim.key, dim.value);
                return (
                  <div key={dim.key}>
                    <label className={lbl}>{dim.label} ({dim.unit})</label>
                    <input
                      type="number"
                      className={`w-full bg-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100 mt-0.5 font-mono border ${validationError ? 'border-red-500' : 'border-zinc-600'}`}
                      value={dim.value}
                      onChange={(e) => handleDimChange(selectedFeature.id, dim.key, Number(e.target.value))}
                      min={dim.min}
                      max={dim.max}
                      step={dim.step ?? 0.1}
                      disabled={dim.editable === false}
                    />
                    {validationError && (
                      <div className="text-[10px] text-red-400 mt-0.5">{validationError}</div>
                    )}
                  </div>
                );
              })}
              {/* Tolerance */}
              <div>
                <label className={lbl}>Tolerance (mm)</label>
                <input
                  type="number"
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-0.5 font-mono"
                  value={selectedFeature.tolerance_mm ?? 0.05}
                  onChange={(e) => {
                    const updated = features.map(f =>
                      f.id === selectedFeature.id ? { ...f, tolerance_mm: Number(e.target.value) } : f,
                    );
                    onFeatureUpdate(selectedFeature.id, updated.find(f => f.id === selectedFeature.id)!.dimensions);
                  }}
                  min={0.001} max={1} step={0.001}
                />
              </div>
              {/* Surface finish */}
              <div>
                <label className={lbl}>Ra (um)</label>
                <input
                  type="number"
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-0.5 font-mono"
                  value={selectedFeature.surface_finish_Ra_um ?? 1.6}
                  min={0.05} max={25} step={0.1}
                  readOnly
                />
              </div>
            </div>

            {/* Secondary Operations */}
            <div className="border-t border-zinc-700 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-300">Secondary Operations</span>
                <button
                  onClick={() => setExpandedSecondary(expandedSecondary === selectedFeature.id ? null : selectedFeature.id)}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300"
                >
                  {expandedSecondary === selectedFeature.id ? 'Collapse' : 'Add Operation'}
                </button>
              </div>

              {/* Current ops */}
              {selectedFeature.secondary_ops.filter(o => o.type !== 'none').map(op => (
                <div key={op.id} className="flex items-center justify-between bg-zinc-800/50 rounded px-3 py-2 mb-1.5">
                  <div className="flex-1">
                    <span className="text-xs text-zinc-200">{op.label}</span>
                    {op.spec_reference && <span className="text-[10px] text-zinc-500 ml-2">{op.spec_reference}</span>}
                    <div className="flex gap-3 mt-1">
                      {op.stock_allowance_mm !== undefined && (
                        <div>
                          <span className={lbl}>Stock allowance</span>
                          <input type="number" className="w-20 bg-zinc-900 border border-zinc-600 rounded px-1.5 py-0.5 text-[11px] text-zinc-100 ml-1 font-mono"
                            value={op.stock_allowance_mm}
                            onChange={(e) => handleSecondaryOpUpdate(selectedFeature.id, op.id, 'stock_allowance_mm', Number(e.target.value))}
                            step={0.01} />
                          <span className="text-[10px] text-zinc-500 ml-0.5">mm</span>
                        </div>
                      )}
                      {op.target_hardness_hrc !== undefined && (
                        <div>
                          <span className={lbl}>Target HRC</span>
                          <input type="number" className="w-16 bg-zinc-900 border border-zinc-600 rounded px-1.5 py-0.5 text-[11px] text-zinc-100 ml-1 font-mono"
                            value={op.target_hardness_hrc}
                            onChange={(e) => handleSecondaryOpUpdate(selectedFeature.id, op.id, 'target_hardness_hrc', Number(e.target.value))}
                            min={20} max={70} />
                        </div>
                      )}
                      {op.case_depth_mm !== undefined && (
                        <div>
                          <span className={lbl}>Case depth</span>
                          <input type="number" className="w-16 bg-zinc-900 border border-zinc-600 rounded px-1.5 py-0.5 text-[11px] text-zinc-100 ml-1 font-mono"
                            value={op.case_depth_mm}
                            onChange={(e) => handleSecondaryOpUpdate(selectedFeature.id, op.id, 'case_depth_mm', Number(e.target.value))}
                            min={0.1} max={5} step={0.1} />
                          <span className="text-[10px] text-zinc-500 ml-0.5">mm</span>
                        </div>
                      )}
                      {op.plating_thickness_um !== undefined && (
                        <div>
                          <span className={lbl}>Thickness</span>
                          <input type="number" className="w-16 bg-zinc-900 border border-zinc-600 rounded px-1.5 py-0.5 text-[11px] text-zinc-100 ml-1 font-mono"
                            value={op.plating_thickness_um}
                            onChange={(e) => handleSecondaryOpUpdate(selectedFeature.id, op.id, 'plating_thickness_um', Number(e.target.value))}
                            min={1} max={250} />
                          <span className="text-[10px] text-zinc-500 ml-0.5">um</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => handleSecondaryOpRemove(selectedFeature.id, op.id)}
                    className="text-[10px] text-red-400 hover:text-red-300 ml-2 flex-shrink-0">x</button>
                </div>
              ))}

              {/* Add secondary op picker */}
              {expandedSecondary === selectedFeature.id && (
                <div className="grid grid-cols-3 gap-1.5 mt-2 bg-zinc-800/30 rounded-lg p-2">
                  {activePresets.filter(p => p.type !== 'none').map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => handleSecondaryOpAdd(selectedFeature.id, preset)}
                      disabled={selectedFeature.secondary_ops.some(op => op.id === preset.id)}
                      className="px-2 py-1.5 text-[10px] rounded border border-zinc-600 hover:border-amber-500/30 hover:bg-amber-500/10 text-zinc-300 hover:text-amber-300 disabled:opacity-30 disabled:cursor-not-allowed transition text-left"
                    >
                      <div className="font-medium">{preset.label}</div>
                      {preset.spec_reference && <div className="text-zinc-500">{preset.spec_reference}</div>}
                    </button>
                  ))}
                </div>
              )}

              {selectedFeature.secondary_ops.filter(o => o.type !== 'none').length === 0 && expandedSecondary !== selectedFeature.id && (
                <div className="text-[10px] text-zinc-500 italic">No secondary operations assigned</div>
              )}
            </div>
          </div>
        ) : (
          <div className={`${sec} p-8 flex items-center justify-center`}>
            <div className="text-center">
              <div className="text-zinc-500 text-sm mb-1">Select a feature to edit dimensions</div>
              <div className="text-zinc-600 text-xs">Click any feature in the tree to view and edit its properties, tolerances, and secondary operations</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
