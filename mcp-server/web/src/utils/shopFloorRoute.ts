import {
  buildWorkflowPath,
  parseWorkflowRouteContext,
  type WorkflowFocusContext,
  type WorkflowOriginContext,
} from './workflowRouteContext';

export type ShopFloorRouteContext = {
  source?: string;
  scan?: string;
  job?: string;
  department?: string;
  operation?: string;
  machine?: string;
  note?: string;
  origin?: WorkflowOriginContext;
  focus?: WorkflowFocusContext;
  extras?: Record<string, string | undefined | null>;
};

export function buildShopFloorPath(pathname: string, search = '', context: ShopFloorRouteContext = {}) {
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

  const isEmployeeShellPath = pathname === '/employee' || pathname.startsWith('/employee/');
  const basePath = isEmployeeShellPath ? '/employee/shop-clock' : '/shop-clock';

  return buildWorkflowPath(basePath, search, {
    origin: effectiveOrigin,
    focus: effectiveFocus,
    extras: {
      source: context.source,
      scan: context.scan,
      job: context.job,
      department: context.department,
      operation: context.operation,
      machine: context.machine,
      note: context.note,
      ...context.extras,
    },
  });
}
