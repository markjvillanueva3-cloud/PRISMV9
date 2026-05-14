import type { ReactNode } from 'react';
import type { ProviderSurfaceId } from '../../features/operating-system/providerSurfaceStatus';
import { SurfaceStatusNotice } from '../operating-system/SurfaceStatusNotice';
import { WorkspaceAICopilot, type WorkspaceCopilotSuggestion } from '../puoa/WorkspaceAICopilot';
import { SummaryTile, WorkspaceHero } from './WorkspacePrimitives';

export type WorkspaceRecoveryMetric = {
  label: string;
  value: string;
  hint: string;
  accent?: string;
};

export interface WorkspaceRecoveryScaffoldProps {
  eyebrow: string;
  title: string;
  description: string;
  surfaces?: ProviderSurfaceId[];
  metrics: WorkspaceRecoveryMetric[];
  aiSummary: string;
  aiContext: Record<string, unknown>;
  suggestions: WorkspaceCopilotSuggestion[];
  children: ReactNode;
}

export function WorkspaceRecoveryScaffold({
  eyebrow,
  title,
  description,
  surfaces = [],
  metrics,
  aiSummary,
  aiContext,
  suggestions,
  children,
}: WorkspaceRecoveryScaffoldProps) {
  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow={eyebrow}
        title={title}
        description={description}
        metrics={metrics.map((metric) => (
          <SummaryTile
            key={metric.label}
            label={metric.label}
            value={metric.value}
            hint={metric.hint}
            accent={metric.accent}
          />
        ))}
        aside={(
          <div className="space-y-3 text-sm leading-6 text-slate-300">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              APPW Recovery
            </div>
            <div>
              This route was rebuilt as an intentional APPW workspace surface so the frontend stays navigable,
              source-aware, and AI-assisted while deeper feature convergence continues.
            </div>
          </div>
        )}
      />

      {surfaces.length > 0 ? (
        <SurfaceStatusNotice
          title="Surface posture"
          surfaces={surfaces}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
        <div className="space-y-6">{children}</div>
        <WorkspaceAICopilot
          workspaceLabel={title}
          summary={aiSummary}
          context={aiContext}
          suggestions={suggestions}
        />
      </div>
    </div>
  );
}

export default WorkspaceRecoveryScaffold;
