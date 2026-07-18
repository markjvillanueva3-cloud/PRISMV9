import { useMemo } from 'react';
import {
  Field,
  PanelCard,
  Select,
  StatusPill,
} from '../workspace/WorkspacePrimitives';
import type { FingerprintResult } from './MachinePickerPanel';

// ─── Types ──────────────────────────────────────────────────────────

export interface ControllerOverridePanelProps {
  fingerprint: FingerprintResult | null;
  controllerOverride: string;
  onOverrideChange: (controller: string) => void;
  availableControllers: Array<{ value: string; label: string }>;
}

// ─── Controller Dialect Catalog ─────────────────────────────────────

const CONTROLLER_DIALECTS: Array<{
  value: string;
  label: string;
  family: string;
  features: string[];
}> = [
  { value: 'haas_ngc', label: 'Haas NGC', family: 'Mill / Turning', features: ['G187 smoothing', 'M65 probing', 'M97/M98 subs'] },
  { value: 'fanuc_31i', label: 'Fanuc 31i', family: 'Mill / Multiaxis', features: ['Macro B', 'G43.4 TCP', 'G68.2 tilted plane'] },
  { value: 'fanuc_0i', label: 'Fanuc 0i', family: 'Mill / Lathe', features: ['G65 macro', 'Canned cycles', 'Basic probing'] },
  { value: 'siemens_840d', label: 'Siemens 840D', family: '5-axis / Aerospace', features: ['TRAORI', 'CYCLE832', 'CYCLE977 probing'] },
  { value: 'heidenhain_tnc640', label: 'Heidenhain TNC 640', family: '5-axis / Mold', features: ['TCH PROBE', 'Cycle 32 smoothing', 'M91 machine coords'] },
  { value: 'heidenhain_tnc7', label: 'Heidenhain TNC 7', family: '5-axis / Mold', features: ['Dynamic Precision', 'Touch probe 1001', 'OCM milling'] },
  { value: 'mazak_smooth_ai', label: 'Mazatrol Smooth Ai', family: 'Mill-turn / Production', features: ['AI thermal comp', 'Smooth machining', 'Voice advisor'] },
  { value: 'okuma_osp_p300', label: 'Okuma OSP-P300', family: 'Turning / Mill-turn', features: ['Thermo-Friendly', 'Collision avoidance', 'DPRNT probing'] },
  { value: 'brother_speedio', label: 'Brother Speedio', family: 'Compact Mill', features: ['High-speed tap', '16K RPM', 'Macro-based probing'] },
  { value: 'doosan_fanuc', label: 'Doosan (Fanuc)', family: 'Turning / Mill', features: ['Fanuc 0i/31i base', 'Turret indexing', 'Live tooling'] },
  { value: 'hurco_max5', label: 'Hurco MAX5', family: 'Mill / Conversational', features: ['UltiMotion', 'WinMax', 'Conversational + NC'] },
  { value: 'citizen_cincom', label: 'Citizen Cincom', family: 'Swiss', features: ['Guide bushing', 'LFV chip break', 'Gang+turret sync'] },
  { value: 'star_fanuc', label: 'Star (Fanuc)', family: 'Swiss', features: ['Sliding head', 'Multi-channel sync', 'Thread whirling'] },
  { value: 'dmg_celos_siemens', label: 'DMG MORI CELOS (Siemens)', family: '5-axis / Mill-turn', features: ['CELOS UI', 'TRAORI', 'MPC sensor'] },
  { value: 'dmg_celos_fanuc', label: 'DMG MORI CELOS (Fanuc)', family: '5-axis / Mill-turn', features: ['CELOS UI', 'Fanuc base', 'AI chip removal'] },
  { value: 'mitsubishi_m80', label: 'Mitsubishi M80', family: 'Mill / Lathe', features: ['SSS control', 'OMR-FF', 'Macro B compatible'] },
  { value: 'fagor_8065', label: 'Fagor 8065', family: 'Mill / Lathe', features: ['HSSA smoothing', 'Probing cycles', 'Retrace function'] },
  { value: 'generic_fanuc', label: 'Generic Fanuc', family: 'Universal', features: ['G-code standard', 'M98/M99 subs', 'Basic cycles'] },
  { value: 'generic_iso', label: 'Generic ISO 6983', family: 'Universal', features: ['ISO G-code only', 'No macros', 'Maximum compatibility'] },
];

// ─── Component ──────────────────────────────────────────────────────

export function ControllerOverridePanel({
  fingerprint,
  controllerOverride,
  onOverrideChange,
  availableControllers,
}: ControllerOverridePanelProps) {
  const autoDetected = fingerprint?.controller_family ?? '';
  const isOverriding = controllerOverride !== '' && controllerOverride !== autoDetected;

  const controllerOptions = useMemo(() => {
    if (availableControllers.length > 0) return availableControllers;
    return CONTROLLER_DIALECTS.map((d) => ({ value: d.value, label: d.label }));
  }, [availableControllers]);

  const autoInfo = useMemo(
    () => CONTROLLER_DIALECTS.find((d) => d.value === autoDetected),
    [autoDetected],
  );

  const overrideInfo = useMemo(
    () => CONTROLLER_DIALECTS.find((d) => d.value === controllerOverride),
    [controllerOverride],
  );

  const activeController = isOverriding ? controllerOverride : autoDetected;
  const activeInfo = isOverriding ? overrideInfo : autoInfo;

  return (
    <PanelCard
      title="Controller override"
      subtitle={
        fingerprint
          ? `Auto-detected: ${autoDetected}. Override if the machine has been retrofitted or uses a non-standard controller.`
          : 'Resolve a machine first to see the auto-detected controller.'
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Field label="Auto-detected controller">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-200">
              {autoDetected || 'None — resolve a machine first'}
              {fingerprint && (
                <StatusPill
                  label={`${Math.round(fingerprint.confidence * 100)}%`}
                  tone={fingerprint.confidence >= 0.85 ? 'emerald' : 'amber'}
                />
              )}
            </div>
          </Field>

          <Field label="Override controller">
            <Select
              aria-label="Controller override"
              value={controllerOverride}
              onChange={(e) => onOverrideChange(e.target.value)}
            >
              <option value="">Use auto-detected</option>
              {controllerOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>

          {isOverriding && (
            <div className="rounded-2xl border border-amber-300/14 bg-amber-300/[0.08] px-4 py-3 text-sm text-amber-100">
              Override active — controller changed from{' '}
              <span className="font-semibold">{autoDetected}</span> to{' '}
              <span className="font-semibold">{controllerOverride}</span>.
              Feature recommendations may not match the physical machine.
            </div>
          )}
        </div>

        <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {isOverriding ? 'Override controller features' : 'Active controller features'}
          </div>
          {activeInfo ? (
            <div className="mt-3 space-y-3">
              <div className="text-lg font-semibold text-slate-50">{activeInfo.label}</div>
              <div className="text-sm text-slate-300">{activeInfo.family}</div>
              <div className="flex flex-wrap gap-2">
                {activeInfo.features.map((f) => (
                  <StatusPill key={f} label={f} tone="slate" />
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm text-slate-400">
              {activeController
                ? `${activeController} — features not cataloged yet.`
                : 'No controller selected.'}
            </div>
          )}

          {isOverriding && autoInfo && overrideInfo && (
            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Feature comparison
              </div>
              <div className="mt-2 grid gap-2 text-xs text-slate-300">
                <div>
                  <span className="text-slate-400">Auto:</span>{' '}
                  {autoInfo.features.join(', ')}
                </div>
                <div>
                  <span className="text-slate-400">Override:</span>{' '}
                  {overrideInfo.features.join(', ')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PanelCard>
  );
}
