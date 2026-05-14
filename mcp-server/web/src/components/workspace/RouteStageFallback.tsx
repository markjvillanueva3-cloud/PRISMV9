import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

type LoadingMeta = {
  title: string;
  detail: string;
};

const ROUTE_META: Record<string, LoadingMeta> = {
  '/': {
    title: 'Sign In',
    detail: 'Preparing the role-aware shell chooser and remembered workspace handoff.',
  },
  '/signin': {
    title: 'Sign In',
    detail: 'Preparing the role-aware shell chooser and remembered workspace handoff.',
  },
  '/dashboard': {
    title: 'Dashboard',
    detail: 'Preparing the command-center workspace and production pulse view.',
  },
  '/messages': {
    title: 'Messages',
    detail: 'Preparing the email-linked inbox, handoff threads, and record-connected messaging lane.',
  },
  '/capture': {
    title: 'Capture Ops',
    detail: 'Preparing the camera, microphone, QR, and evidence-capture workspace.',
  },
  '/calculator': {
    title: 'Calculator Studio',
    detail: 'Preparing the machine, tooling, and process workspace.',
  },
  '/print-to-cnc': {
    title: 'Print to CNC',
    detail: 'Preparing universal intake, release planning, and setup-sheet posture.',
  },
  '/pipeline': {
    title: 'Pipeline',
    detail: 'Preparing the surfaced print-to-program stage runner and response deck.',
  },
  '/toolpath': {
    title: 'Toolpath Advisor',
    detail: 'Preparing strategy rankings, feature posture, and path recommendations.',
  },
  '/thread-calculator': {
    title: 'Thread Calculator',
    detail: 'Preparing thread calculations, fit validation, and gauging outputs.',
  },
  '/what-if': {
    title: 'What-If Analysis',
    detail: 'Preparing scenario controls, parameter sweeps, and impact review.',
  },
  '/ppg': {
    title: 'Post Processor Generator',
    detail: 'Preparing controller, validation, and post comparison tools.',
  },
  '/viewer': {
    title: '3D Viewer',
    detail: 'Preparing the inspection desk and visualization workspace shell.',
  },
  '/learning': {
    title: 'Learning',
    detail: 'Preparing academy content, progress, and guided study tools.',
  },
  '/integrations': {
    title: 'Integrations',
    detail: 'Preparing CAM, DNC, ERP, mobile, and measurement bridge controls.',
  },
  '/parts-library': {
    title: 'Parts Library',
    detail: 'Preparing revision lineage, linked files, and downstream part handoff controls.',
  },
  '/customer-portal': {
    title: 'Customer Portal',
    detail: 'Preparing share tokens, portal previews, milestones, quality docs, and follow-up controls.',
  },
};

function titleCase(segment: string) {
  return segment
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getRouteLoadingMeta(pathname: string): LoadingMeta {
  if (ROUTE_META[pathname]) {
    return ROUTE_META[pathname];
  }

  if (pathname.startsWith('/learning/academy/')) {
    return {
      title: 'Academy Lesson',
      detail: 'Preparing lesson visuals, checkpoints, and the end-of-lesson test.',
    };
  }

  if (pathname.startsWith('/learning')) {
    return ROUTE_META['/learning'];
  }

  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments.length > 0 ? segments[segments.length - 1] : undefined;
  const title = lastSegment ? titleCase(lastSegment) : 'Workspace';

  return {
    title,
    detail: `Preparing the ${title.toLowerCase()} workspace and loading the latest interface state.`,
  };
}

export function RouteStageFallback() {
  const location = useLocation();
  const meta = useMemo(() => getRouteLoadingMeta(location.pathname), [location.pathname]);

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6 rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.98)_100%)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_320px]">
        <div className="space-y-5">
          <span className="inline-flex rounded-full border border-cyan-300/16 bg-cyan-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
            Streaming workspace
          </span>
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">Loading {meta.title}</h2>
            <p className="max-w-2xl text-base leading-7 text-slate-300">{meta.detail}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-4">
              <div className="h-3 w-24 rounded bg-white/10" />
              <div className="mt-4 h-5 w-32 rounded bg-white/8" />
              <div className="mt-3 h-4 rounded bg-white/5" />
            </div>
            <div className="rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-4">
              <div className="h-3 w-24 rounded bg-white/10" />
              <div className="mt-4 h-5 w-28 rounded bg-white/8" />
              <div className="mt-3 h-4 rounded bg-white/5" />
            </div>
            <div className="rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-4">
              <div className="h-3 w-24 rounded bg-white/10" />
              <div className="mt-4 h-5 w-24 rounded bg-white/8" />
              <div className="mt-3 h-4 rounded bg-white/5" />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Loading posture</div>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
            <p>The page shell is live and the route chunk is still streaming in.</p>
            <p>PRISM keeps the navigation stable first, then mounts the full workspace once the split bundle is ready.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
