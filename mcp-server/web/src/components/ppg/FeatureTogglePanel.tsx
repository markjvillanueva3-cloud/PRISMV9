import { useEffect, useMemo, useState } from 'react';
import { ppgMachineFeatures } from '../../api/client';
import {
  PanelCard,
  StatusPill,
} from '../workspace/WorkspacePrimitives';
import type { FingerprintResult, RecommendedFeatures } from './MachinePickerPanel';

// ─── Types ──────────────────────────────────────────────────────────

export interface FeatureToggle {
  id: string;
  label: string;
  category: 'safety' | 'performance' | 'automation';
  featureKey: keyof RecommendedFeatures;
  description: string;
  gcode?: string;
}

export interface FeatureTogglePanelProps {
  fingerprint: FingerprintResult | null;
  enabledFeatures: Set<string>;
  onToggle: (featureId: string, enabled: boolean) => void;
}

// ─── Feature Definitions ────────────────────────────────────────────

const FEATURE_TOGGLES: FeatureToggle[] = [
  {
    id: 'probing',
    label: 'Probing cycles',
    category: 'safety',
    featureKey: 'probing',
    description: 'WCS setup verification, tool length measurement, and in-process inspection.',
  },
  {
    id: 'tsc',
    label: 'Through-spindle coolant',
    category: 'performance',
    featureKey: 'tsc',
    description: 'High-pressure coolant through tool for deep holes and difficult materials.',
  },
  {
    id: 'hsm',
    label: 'High-speed smoothing',
    category: 'performance',
    featureKey: 'hsm',
    description: 'G187 / CYCLE832 / AICC look-ahead for surface finish and motion control.',
  },
  {
    id: 'tcp',
    label: 'RTCP / TCPM',
    category: 'performance',
    featureKey: 'tcp',
    description: 'Tool center point management for 5-axis simultaneous motion.',
  },
  {
    id: 'ssv',
    label: 'Spindle speed variation',
    category: 'performance',
    featureKey: 'ssv',
    description: 'Chatter suppression by varying spindle speed around setpoint.',
  },
  {
    id: 'subprograms',
    label: 'Subprogram support',
    category: 'automation',
    featureKey: 'subprograms',
    description: 'M98/CALL PGM for repeating patterns, pallet workflows, and production runs.',
  },
  {
    id: 'chip_conveyor',
    label: 'Chip conveyor control',
    category: 'automation',
    featureKey: 'chip_conveyor',
    description: 'Auto chip management with M31/M32 codes in program header/footer.',
  },
];

const CATEGORY_ORDER: FeatureToggle['category'][] = ['safety', 'performance', 'automation'];

const CATEGORY_LABELS: Record<FeatureToggle['category'], string> = {
  safety: 'Safety',
  performance: 'Performance',
  automation: 'Automation',
};

const CATEGORY_COLORS: Record<FeatureToggle['category'], string> = {
  safety: 'border-emerald-300/14 bg-emerald-300/[0.04]',
  performance: 'border-cyan-300/14 bg-cyan-300/[0.04]',
  automation: 'border-violet-300/14 bg-violet-300/[0.04]',
};

// ─── Component ──────────────────────────────────────────────────────

export function FeatureTogglePanel({
  fingerprint,
  enabledFeatures,
  onToggle,
}: FeatureTogglePanelProps) {
  const [firmwareFeatures, setFirmwareFeatures] = useState<string[]>([]);

  // Load firmware features when fingerprint changes
  useEffect(() => {
    if (!fingerprint) {
      setFirmwareFeatures([]);
      return;
    }
    let active = true;
    async function load() {
      try {
        const res = await ppgMachineFeatures({
          controller: fingerprint!.controller_family,
        });
        if (!active) return;
        const data = res as Record<string, unknown>;
        const inner = (data.result ?? data.data ?? data) as Record<string, unknown>;
        const features = inner.features;
        if (Array.isArray(features)) {
          setFirmwareFeatures(
            features
              .filter((f: any) => f && typeof f === 'object')
              .map((f: any) => String(f.id ?? f.name ?? ''))
              .filter(Boolean),
          );
        }
      } catch {
        if (active) setFirmwareFeatures([]);
      }
    }
    void load();
    return () => { active = false; };
  }, [fingerprint?.controller_family]);

  const grouped = useMemo(() => {
    const groups: Record<string, FeatureToggle[]> = {};
    for (const cat of CATEGORY_ORDER) {
      groups[cat] = FEATURE_TOGGLES.filter((f) => f.category === cat);
    }
    return groups;
  }, []);

  const recommended = fingerprint?.recommended_features;
  const enabledCount = enabledFeatures.size;
  const recommendedCount = recommended
    ? Object.values(recommended).filter(Boolean).length
    : 0;

  return (
    <PanelCard
      title="Feature toggles"
      subtitle={
        fingerprint
          ? `${recommendedCount} features recommended for ${fingerprint.controller_family} — toggle to customize post output.`
          : 'Select a machine first to get feature recommendations.'
      }
    >
      {!fingerprint && (
        <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-slate-400">
          Resolve a machine in the picker above to see feature recommendations.
        </div>
      )}

      {fingerprint && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <StatusPill
              label={`${enabledCount} enabled`}
              tone={enabledCount > 0 ? 'emerald' : 'slate'}
            />
            <StatusPill
              label={`${recommendedCount} recommended`}
              tone="cyan"
            />
          </div>

          {CATEGORY_ORDER.map((category) => (
            <div
              key={category}
              className={`rounded-[22px] border p-4 ${CATEGORY_COLORS[category]}`}
            >
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {CATEGORY_LABELS[category]}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {grouped[category].map((feature) => {
                  const isRecommended = recommended?.[feature.featureKey] ?? false;
                  const isEnabled = enabledFeatures.has(feature.id);

                  return (
                    <label
                      key={feature.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                        isEnabled
                          ? 'border-cyan-300/20 bg-cyan-300/[0.06]'
                          : 'border-white/8 bg-white/[0.02] hover:border-white/14'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => onToggle(feature.id, e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-500 bg-slate-800 text-cyan-400 focus:ring-cyan-400/40"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-100">
                            {feature.label}
                          </span>
                          {isRecommended && (
                            <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
                              Recommended
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {feature.description}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelCard>
  );
}
