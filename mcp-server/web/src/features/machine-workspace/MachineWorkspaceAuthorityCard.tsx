import {
  PanelCard,
  StatusPill,
  SummaryTile,
} from '../../components/workspace/WorkspacePrimitives';
import type { MachineWorkspaceContext } from './MachineWorkspaceState';

type MachineWorkspaceAuthorityCardProps = {
  context: MachineWorkspaceContext;
  title?: string;
  subtitle?: string;
};

function programmingAuthorityTone(
  posture: string | undefined,
): 'slate' | 'emerald' | 'amber' | 'sky' | 'violet' {
  if (posture === 'live-contract') {
    return 'emerald';
  }
  if (posture === 'curated-service' || posture === 'hybrid') {
    return 'violet';
  }
  if (posture === 'fallback-staged') {
    return 'amber';
  }
  return 'sky';
}

export function MachineWorkspaceAuthorityCard({
  context,
  title = 'Shared routed machine authority',
  subtitle = 'This wizard now inherits the same JM Die machine, controller, and programming posture from the routed upload surface.',
}: MachineWorkspaceAuthorityCardProps) {
  const programmingValue =
    context.programmingAuthority?.environmentLabel
    ?? context.programmingAuthority?.badge
    ?? 'Shared default';
  const programmingHint = [
    context.programmingAuthority?.licenseLabel,
    context.programmingAuthority?.toolpathLabel ?? context.programmingAuthority?.toolpathTypeLabel,
  ].filter(Boolean).join(' | ') || context.programmingAuthority?.summary || 'Programming authority pending';

  return (
    <PanelCard title={title} subtitle={subtitle}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill label="JM Die routed authority" tone="sky" />
        {context.machineLabel ? <StatusPill label={context.machineLabel} tone="slate" /> : null}
        {context.programmingAuthority ? (
          <StatusPill
            label={context.programmingAuthority.badge}
            tone={programmingAuthorityTone(context.programmingAuthority.posture)}
          />
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        <SummaryTile
          label="Machine"
          value={context.machineLabel ?? context.machineId ?? 'Shared default'}
          hint={context.machineKinematics ?? 'Machine posture pending'}
        />
        <SummaryTile
          label="Controller"
          value={context.controllerLabel ?? context.controllerId ?? 'Shared default'}
          hint={context.machineManufacturer ? `Authority source: ${context.machineManufacturer}` : 'Authority source pending'}
        />
        <SummaryTile
          label="Material"
          value={context.materialLabel}
          hint={`Material group: ${context.materialGroup}`}
        />
        <SummaryTile
          label="Programming posture"
          value={programmingValue}
          hint={programmingHint}
        />
      </div>

      {context.selectorAuthorityNote ? (
        <div className="mt-4 rounded-[22px] border border-emerald-300/14 bg-emerald-300/[0.05] px-4 py-4 text-sm leading-6 text-slate-200">
          {context.selectorAuthorityNote}
        </div>
      ) : null}

      {context.programmingAuthority?.note ? (
        <div className="mt-4 rounded-[22px] border border-violet-300/14 bg-violet-300/[0.05] px-4 py-4 text-sm leading-6 text-slate-200">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-100">
            Programming authority
          </div>
          <div className="mt-2">{context.programmingAuthority.note}</div>
        </div>
      ) : null}
    </PanelCard>
  );
}
