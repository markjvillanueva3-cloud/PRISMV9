import { Link } from 'react-router-dom';
import { CalculatorProgramWorkbench } from '../../components/calculator/CalculatorProgramWorkbench';
import {
  PanelCard,
  StatusPill,
  SummaryTile,
} from '../../components/workspace/WorkspacePrimitives';
import type { MachineMode, MachineWorkspaceContext } from './MachineWorkspaceState';

type MachineWorkspaceShellProps = {
  title: string;
  subtitle: string;
  surfaceLabel: string;
  note?: string;
  context: MachineWorkspaceContext;
};

function formatModeLabel(mode: MachineMode) {
  if (mode === 'lathe') return 'Turning';
  if (mode === 'wire_edm') return 'Wire EDM';
  return 'Sinker EDM';
}

function formatStockValue(context: MachineWorkspaceContext) {
  if (context.mode === 'lathe') {
    return `${context.stockDiameterMm.toFixed(0)} x ${context.stockLengthMm.toFixed(0)} mm`;
  }
  if (context.mode === 'wire_edm') {
    return `${context.stockThicknessMm.toFixed(0)} mm plate`;
  }
  return `${context.stockLengthMm.toFixed(0)} x ${context.stockThicknessMm.toFixed(0)} mm blank`;
}

function formatStockHint(context: MachineWorkspaceContext) {
  if (context.mode === 'lathe') {
    return 'Diameter and length feed the donor turning intake.';
  }
  if (context.mode === 'wire_edm') {
    return 'Thickness stays pinned while contour parsing and wire selection run.';
  }
  return 'Electrode blank posture stays aligned with the packet-release lane.';
}

export function MachineWorkspaceShell({
  title,
  subtitle,
  surfaceLabel,
  note,
  context,
}: MachineWorkspaceShellProps) {
  return (
    <PanelCard title={title} subtitle={subtitle}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill label="APPW41 shared donor" tone="sky" />
          <StatusPill label={formatModeLabel(context.mode)} tone="violet" />
          {context.machineLabel ? <StatusPill label={context.machineLabel} tone="slate" /> : null}
        </div>
        <Link
          to={context.programReleasePath}
          className="rounded-full border border-cyan-300/35 bg-cyan-300/[0.08] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-200/55 hover:bg-cyan-300/[0.12]"
        >
          Open Program Release
        </Link>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        <SummaryTile
          label="Mode"
          value={formatModeLabel(context.mode)}
          hint={`${surfaceLabel} now shares the same machine programming donor surface.`}
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
          label="Stock posture"
          value={formatStockValue(context)}
          hint={formatStockHint(context)}
        />
        {context.programmingAuthority ? (
          <SummaryTile
            label="Programming posture"
            value={context.programmingAuthority.environmentLabel ?? context.programmingAuthority.badge}
            hint={[
              context.programmingAuthority.licenseLabel,
              context.programmingAuthority.toolpathLabel ?? context.programmingAuthority.toolpathTypeLabel,
            ].filter(Boolean).join(' · ') || context.programmingAuthority.summary}
          />
        ) : null}
      </div>

      {context.selectorAuthorityNote ? (
        <div className="mt-4 rounded-[22px] border border-emerald-300/14 bg-emerald-300/[0.05] px-4 py-4 text-sm leading-6 text-slate-200">
          {context.selectorAuthorityNote}
        </div>
      ) : null}

      {context.programmingAuthority ? (
        <div className="mt-4 rounded-[22px] border border-violet-300/14 bg-violet-300/[0.05] px-4 py-4 text-sm leading-6 text-slate-200">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-100">
            Programming authority
          </div>
          <div className="mt-2">
            {context.programmingAuthority.note}
          </div>
        </div>
      ) : null}

      {note ? (
        <div className="mt-4 rounded-[22px] border border-cyan-300/14 bg-cyan-300/[0.05] px-4 py-4 text-sm leading-6 text-slate-200">
          {note}
        </div>
      ) : null}

      <div className="mt-6">
        <CalculatorProgramWorkbench {...context} surfaceLabel={surfaceLabel} />
      </div>
    </PanelCard>
  );
}
