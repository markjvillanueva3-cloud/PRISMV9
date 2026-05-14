import {
  buildWorkflowPath,
  parseWorkflowRouteContext,
  type WorkflowFocusContext,
  type WorkflowOriginContext,
} from './workflowRouteContext';

export type CaptureRouteContext = {
  source?: string;
  target?: 'job' | 'machine' | 'inventory' | 'quality' | 'alarm';
  job?: string;
  department?: string;
  machine?: string;
  zone?: string;
  note?: string;
  origin?: WorkflowOriginContext;
  focus?: WorkflowFocusContext;
  extras?: Record<string, string | undefined | null>;
};

export function buildCapturePath(pathname: string, search = '', context: CaptureRouteContext = {}) {
  const routeContext = parseWorkflowRouteContext(search);
  const effectiveOrigin = context.origin ?? (routeContext.origin.source ? routeContext.origin : undefined);
  const effectiveFocus =
    context.focus ??
    (routeContext.focus.id
      ? routeContext.focus
      : context.job
        ? {
            type: 'job',
            id: context.job,
            jobId: context.job,
          }
        : undefined);

  const basePath = pathname.startsWith('/employee') ? '/employee/capture' : '/capture';

  return buildWorkflowPath(basePath, search, {
    origin: effectiveOrigin,
    focus: effectiveFocus,
    extras: {
      source: context.source,
      target: context.target,
      job: context.job,
      department: context.department,
      machine: context.machine,
      zone: context.zone,
      note: context.note,
      ...context.extras,
    },
  });
}
