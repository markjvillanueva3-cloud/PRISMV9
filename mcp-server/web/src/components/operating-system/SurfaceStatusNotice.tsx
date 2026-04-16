import {
  getProviderSurfaceStatus,
  type ProviderSurfaceId,
  type ProviderSurfaceMode,
} from '../../features/operating-system/providerSurfaceStatus';
import { useOperatingSystemRuntimeMode } from '../../features/operating-system/OperatingSystemProvider';

function modeClasses(mode: ProviderSurfaceMode) {
  if (mode === 'live') {
    return 'border-emerald-300/22 bg-emerald-300/[0.08] text-emerald-100';
  }

  if (mode === 'live-fallback') {
    return 'border-sky-300/22 bg-sky-300/[0.08] text-sky-100';
  }

  return 'border-amber-300/22 bg-amber-300/[0.08] text-amber-100';
}

function modeLabel(mode: ProviderSurfaceMode) {
  if (mode === 'live') return 'Live';
  if (mode === 'live-fallback') return 'Live + fallback';
  return 'Staged seam';
}

export function SurfaceStatusNotice({
  title,
  surfaces,
  className = '',
}: {
  title: string;
  surfaces: ProviderSurfaceId[];
  className?: string;
}) {
  const runtimeMode = useOperatingSystemRuntimeMode();
  const statuses = surfaces.map((surface) => getProviderSurfaceStatus(surface, runtimeMode));
  const stagedCount = statuses.filter((status) => status.mode === 'staged').length;
  const summary =
    stagedCount > 0
      ? `${stagedCount} staged surface${stagedCount === 1 ? '' : 's'} still depend on provider seams in this workflow.`
      : 'All listed surfaces are live or live-with-fallback.';

  return (
    <div className={`rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-slate-300 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</div>
          <div className="mt-2 leading-6 text-slate-300">{summary}</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {statuses.map((status) => (
          <span
            key={status.id}
            className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${modeClasses(status.mode)}`}
            title={status.detail}
          >
            {status.label}: {modeLabel(status.mode)}
          </span>
        ))}
      </div>
    </div>
  );
}
