export type WorkflowOriginContext = {
  source?: string;
  recordType?: string;
  recordId?: string;
  customer?: string;
  note?: string;
  threadId?: string;
};

export type WorkflowFocusContext = {
  type?: string;
  id?: string;
  jobId?: string;
  quoteId?: string;
  packetId?: string;
};

export type WorkflowRouteContext = {
  profile: string;
  origin: Required<WorkflowOriginContext>;
  focus: Required<WorkflowFocusContext>;
};

type WorkflowBuildOptions = {
  origin?: WorkflowOriginContext;
  focus?: WorkflowFocusContext;
  extras?: Record<string, string | undefined | null>;
  preserveProfile?: boolean;
  includeLegacy?: boolean;
};

function normalizeOriginContext(origin: WorkflowOriginContext | undefined): Required<WorkflowOriginContext> {
  return {
    source: origin?.source ?? '',
    recordType: origin?.recordType ?? '',
    recordId: origin?.recordId ?? '',
    customer: origin?.customer ?? '',
    note: origin?.note ?? '',
    threadId: origin?.threadId ?? '',
  };
}

function normalizeFocusContext(focus: WorkflowFocusContext | undefined): Required<WorkflowFocusContext> {
  const type =
    focus?.type ??
    (focus?.jobId ? 'job' : focus?.quoteId ? 'quote' : focus?.packetId ? 'packet' : '');
  const id =
    focus?.id ??
    (type === 'job'
      ? focus?.jobId ?? ''
      : type === 'quote'
        ? focus?.quoteId ?? ''
        : type === 'packet'
          ? focus?.packetId ?? ''
          : '');
  return {
    type,
    id,
    jobId: focus?.jobId || (type === 'job' ? id : ''),
    quoteId: focus?.quoteId || (type === 'quote' ? id : ''),
    packetId: focus?.packetId || (type === 'packet' ? id : ''),
  };
}

export function parseWorkflowRouteContext(search = ''): WorkflowRouteContext {
  const params = new URLSearchParams(search);
  const focusType = params.get('focusType') ?? '';
  const focusId = params.get('focusId') ?? '';

  return {
    profile: params.get('profile') ?? '',
    origin: normalizeOriginContext({
      source: params.get('originSource') ?? params.get('source') ?? '',
      recordType: params.get('originType') ?? params.get('recordType') ?? '',
      recordId: params.get('originId') ?? params.get('recordId') ?? '',
      customer: params.get('originCustomer') ?? params.get('customer') ?? '',
      note: params.get('originNote') ?? params.get('note') ?? '',
      threadId: params.get('originThreadId') ?? params.get('thread') ?? '',
    }),
    focus: normalizeFocusContext({
      type: focusType,
      id: focusId,
      jobId: params.get('focusJobId') ?? '',
      quoteId: params.get('focusQuoteId') ?? '',
      packetId: params.get('focusPacketId') ?? '',
    }),
  };
}

export function formatWorkflowSourceLabel(source: string | null | undefined) {
  if (!source) {
    return '';
  }

  const knownLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    calculator: 'Calculator',
    customers: 'Customers & CRM',
    'purchase-orders': 'Purchase Orders',
    purchasing: 'Purchasing',
    'document-learning': 'Document Learning',
    messages: 'Messages',
    'jobs-desk': 'Jobs desk',
    'scheduling-desk': 'Scheduling desk',
    jobs: 'Jobs',
    'quote-builder': 'Quote Builder',
    ppg: 'Post Processor Generator',
    'print-to-cnc': 'Print to CNC',
    'shop-floor-clock': 'Shop Floor Clock',
    'quality-management': 'Quality Management',
    'inventory-desk': 'Inventory desk',
    'parts-library': 'Parts Library',
    'customer-portal': 'Customer Portal',
    'alarm-decoder': 'Alarm Decoder',
    'employee-shell': 'Employee shell',
    'employee-directory': 'Employee Directory',
    timecards: 'Timecards',
    payroll: 'Payroll',
    invoices: 'Invoices',
    'general-ledger': 'General Ledger',
    'financial-analysis': 'Financial Analysis',
    'order-tracking': 'Order Tracking',
  };

  return knownLabels[source] ?? source.replace(/-/g, ' ');
}

export function buildWorkflowParams(currentSearch = '', options: WorkflowBuildOptions = {}) {
  const currentParams = new URLSearchParams(currentSearch);
  const params = new URLSearchParams();
  const origin = normalizeOriginContext(options.origin);
  const focus = normalizeFocusContext(options.focus);
  const includeLegacy = options.includeLegacy ?? true;

  if ((options.preserveProfile ?? true) && currentParams.get('profile')) {
    params.set('profile', currentParams.get('profile') ?? '');
  }

  if (origin.source) {
    params.set('originSource', origin.source);
    if (includeLegacy) params.set('source', origin.source);
  }
  if (origin.recordType) {
    params.set('originType', origin.recordType);
    if (includeLegacy) params.set('recordType', origin.recordType);
  }
  if (origin.recordId) {
    params.set('originId', origin.recordId);
    if (includeLegacy) params.set('recordId', origin.recordId);
  }
  if (origin.customer) {
    params.set('originCustomer', origin.customer);
    if (includeLegacy) params.set('customer', origin.customer);
  }
  if (origin.note) {
    params.set('originNote', origin.note);
    if (includeLegacy) params.set('note', origin.note);
  }
  if (origin.threadId) {
    params.set('originThreadId', origin.threadId);
    if (includeLegacy) params.set('thread', origin.threadId);
  }

  if (focus.type) params.set('focusType', focus.type);
  if (focus.id) params.set('focusId', focus.id);
  if (focus.jobId) params.set('focusJobId', focus.jobId);
  if (focus.quoteId) params.set('focusQuoteId', focus.quoteId);
  if (focus.packetId) params.set('focusPacketId', focus.packetId);

  for (const [key, value] of Object.entries(options.extras ?? {})) {
    if (value) {
      params.set(key, value);
    }
  }

  return params;
}

export function buildWorkflowPath(basePath: string, currentSearch = '', options: WorkflowBuildOptions = {}) {
  const params = buildWorkflowParams(currentSearch, options);
  const suffix = params.toString();
  return `${basePath}${suffix ? `?${suffix}` : ''}`;
}
