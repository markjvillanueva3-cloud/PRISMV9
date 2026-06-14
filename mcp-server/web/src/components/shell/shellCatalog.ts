export type ClearanceLevel = 'shop_floor' | 'lead' | 'hr_manager' | 'admin';

export type NavItem = {
  to: string;
  label: string;
  keywords?: string[];
  minClearance?: ClearanceLevel;
};

export type NavGroup = {
  key: string;
  label: string;
  items: NavItem[];
  keywords?: string[];
  minClearance?: ClearanceLevel;
};

export type NavEntry = NavItem | NavGroup;

export type NavSection = {
  key: string;
  title: string;
  items: NavEntry[];
  minClearance?: ClearanceLevel;
};

export type ShellRecordType =
  | 'Job'
  | 'Quote'
  | 'Customer'
  | 'PO'
  | 'Order'
  | 'Part'
  | 'Invoice'
  | 'Quality'
  | 'Lesson';

export type ShellRecord = {
  id: string;
  title: string;
  type: ShellRecordType;
  workspaceLabel: string;
  workspaceRoute: string;
  status: string;
  owner: string;
  detail: string;
  keywords: string[];
};

export type WorkspaceCommand = {
  to: string;
  label: string;
  sectionTitle: string;
  searchText: string;
  minClearance?: ClearanceLevel;
};

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    key: 'machining',
    title: 'Machining',
    items: [
      { to: '/dashboard', label: 'Dashboard', keywords: ['home', 'command center', 'oee'] },
      {
        key: 'calculator',
        label: 'Calculator',
        keywords: ['cam', 'tooling', 'setup', 'machining'],
        items: [
          { to: '/calculator', label: 'Studio', keywords: ['costing', 'feeds', 'speeds'] },
          { to: '/toolpath', label: 'Toolpath Advisor', keywords: ['strategy', 'operations'] },
          { to: '/what-if', label: 'What-If Analysis', keywords: ['compare', 'scenario'] },
          { to: '/thread-calculator', label: 'Thread Calculator', keywords: ['threads', 'tap drill', 'gauge'] },
          { to: '/ppg', label: 'Post Processor', keywords: ['controller', 'g-code', 'post', 'generate', 'optimize'] },
          { to: '/optimize', label: 'Optimization Report', keywords: ['optimize', 'before after', 'cycle time', 'g-code', 'report', 'demo'] },
          { to: '/setup-sheet', label: 'Setup Sheet', keywords: ['setup', 'tool list', 'offsets', 'operator', 'print'] },
          { to: '/cycle-time', label: 'Cycle Time', keywords: ['cycle time', 'estimate', 'compare', 'machines', 'kinematics'] },
          { to: '/tool-optimization', label: 'Tool Optimization', keywords: ['tool change', 'magazine', 'carousel', 'sister tool', 'ATC'] },
          { to: '/features', label: 'Feature Selection', keywords: ['HSM', 'probing', 'smoothing', 'NURBS', 'feature toggle', 'auto-select'] },
          { to: '/prove-out', label: 'Prove-Out Workflow', keywords: ['prove-out', 'first article', 'promote', 'production', 'air cut', 'derating'] },
        ],
      },
      {
        key: 'lathe',
        label: 'Lathe',
        keywords: ['turning', 'print to program', 'wizard', 'turning setup'],
        items: [
          { to: '/lathe', label: 'Upload', keywords: ['upload', 'cad', 'print', 'turning'] },
          { to: '/lathe/wizard', label: 'Wizard', keywords: ['feature selection', 'operations', 'turning wizard'] },
          { to: '/lathe/results', label: 'Results', keywords: ['program output', 'nc', 'tool list', 'post'] },
        ],
      },
      {
        key: 'milling',
        label: 'Milling',
        keywords: ['milling', 'vmce', 'haas', 'hurco', 'okuma mu', 'roku', '5 axis', 'mill wizard', 'milling setup'],
        items: [
          { to: '/milling', label: 'Upload', keywords: ['upload', 'step', 'iges', 'stl', 'dxf', 'milling'] },
          { to: '/milling/wizard', label: 'Wizard', keywords: ['material', 'machine', 'strategy', 'roughing', 'finishing'] },
          { to: '/milling/results', label: 'Results', keywords: ['gcode', 'toolpath', 'cycle time', 'setup sheet', 'ai'] },
        ],
      },
      { to: '/print-to-cnc', label: 'Print to CNC', keywords: ['upload', 'cad', 'fusion', 'setup sheet', 'simulation'] },
      { to: '/pipeline', label: 'Pipeline', keywords: ['wizard', 'print to program', 'stages'] },
      { to: '/job-planner', label: 'Job Planner', keywords: ['routing', 'traveler', 'planning'] },
      { to: '/safety', label: 'Safety Monitor', keywords: ['alerts', 'risk'] },
      { to: '/alarms', label: 'Alarm Decoder', keywords: ['machine alarms', 'troubleshoot'] },
      { to: '/viewer', label: '3D Viewer', keywords: ['model', 'inspection', 'geometry'] },
      { to: '/ai-learning', label: 'AI Learning', keywords: ['copilot', 'assistant', 'model coaching', 'training'] },
      { to: '/reports', label: 'Reports', keywords: ['exports', 'analytics'], minClearance: 'lead' },
      { to: '/secondary-ops', label: 'Secondary Ops', keywords: ['finishing', 'vendor'] },
    ],
  },
  {
    key: 'quotes-planning',
    title: 'Quotes and Planning',
    items: [
      { to: '/quote-builder', label: 'Quote Builder', keywords: ['estimate', 'rfq'] },
      { to: '/quote-analytics', label: 'Quote Analytics', keywords: ['win rate', 'accuracy'] },
      { to: '/blueprint-quote', label: 'Blueprint Quote', keywords: ['drawing', 'print review'] },
      { to: '/sheet-metal', label: 'Sheet Metal', keywords: ['fabrication', 'bend'] },
      { to: '/additive', label: 'Additive', keywords: ['3d print', 'powder'] },
      { to: '/injection-mold', label: 'Injection Mold', keywords: ['mold', 'resin'] },
      { to: '/batch-planning', label: 'Batch Planning', keywords: ['family', 'grouped release'] },
      { to: '/stock-optimizer', label: 'Stock Optimizer', keywords: ['nesting', 'yield'] },
      { to: '/material-pricing', label: 'Material Pricing', keywords: ['surcharge', 'alloy'] },
      { to: '/machine-rates', label: 'Machine Rates', keywords: ['burden', 'rate library'] },
      { to: '/capacity', label: 'Capacity', keywords: ['load', 'bottleneck'] },
      { to: '/integrations', label: 'Integrations', keywords: ['cam', 'dnc', 'erp bridge', 'measurement'] },
      { to: '/scheduling', label: 'Scheduling', keywords: ['dispatch', 'board'], minClearance: 'lead' },
    ],
  },
  {
    key: 'shop-erp',
    title: 'Shop and ERP',
    items: [
      { to: '/jobs', label: 'Jobs', keywords: ['traveler', 'dispatch', 'work order'] },
      { to: '/employee', label: 'My Workspace', keywords: ['employee', 'my desk', 'messages', 'shop clock', 'capture', 'jobs'] },
      { to: '/parts-library', label: 'Parts Library', keywords: ['parts', 'revisions', 'files', 'cad', 'drawings'] },
      { to: '/inbox', label: 'Document Inbox', keywords: ['docuread', 'intake', 'prints', 'po', 'purchase order', 'invoice', 'cert', 'packing slip', 'ocr', 'classify'] },
      { to: '/messages', label: 'Messages', keywords: ['email', 'inbox', 'handoff', 'chat'] },
      { to: '/customer-portal', label: 'Customer Portal', keywords: ['portal', 'share token', 'milestones', 'customer visibility'] },
      { to: '/capture', label: 'Capture Ops', keywords: ['camera', 'microphone', 'qr', 'photo', 'video', 'audio', 'shop map', 'evidence'] },
      { to: '/orders', label: 'Orders', keywords: ['delivery', 'status', 'tracking'] },
      { to: '/shop-live', label: 'Shop Live', keywords: ['live board', 'machines', 'queue', 'floor status'] },
      { to: '/shop', label: 'Shop Profile', keywords: ['shop profile', 'capacity', 'policies', 'my shop'] },
      { to: '/inventory', label: 'Inventory', keywords: ['stock', 'reorder'] },
      { to: '/exports', label: 'Exports', keywords: ['close', 'handoff'] },
      { to: '/purchasing', label: 'Purchasing', keywords: ['suppliers', 'buyers'], minClearance: 'lead' },
      { to: '/purchase-orders', label: 'Purchase Orders', keywords: ['po', 'ap'], minClearance: 'lead' },
      { to: '/invoices', label: 'Invoices', keywords: ['billing', 'collections'], minClearance: 'lead' },
      { to: '/profitability', label: 'Profitability', keywords: ['margin', 'job cost'], minClearance: 'lead' },
      { to: '/tooling-cost', label: 'Tooling Cost', keywords: ['consumption', 'reorder'], minClearance: 'lead' },
      { to: '/general-ledger', label: 'General Ledger', keywords: ['accounting', 'trial balance'], minClearance: 'admin' },
      { to: '/quality', label: 'Quality', keywords: ['ncr', 'spc', 'capa'] },
      { to: '/customers', label: 'Customers', keywords: ['accounts', 'crm'] },
      { to: '/employees', label: 'People Ops', keywords: ['employees', 'skills', 'roster', 'hr', 'directory'], minClearance: 'hr_manager' },
      { to: '/shop-clock', label: 'Shop Clock', keywords: ['operator', 'kiosk'] },
      { to: '/timecards', label: 'Timecards', keywords: ['labor', 'hours'], minClearance: 'hr_manager' },
      { to: '/payroll', label: 'Payroll', keywords: ['wages', 'deductions'], minClearance: 'hr_manager' },
      { to: '/hr', label: 'HR Compliance', keywords: ['training', 'benefits'], minClearance: 'hr_manager' },
      { to: '/financial-analysis', label: 'Financial Analysis', keywords: ['roi', 'npv'], minClearance: 'admin' },
      { to: '/department', label: 'Department', keywords: ['utilization', 'downtime', 'foreman'], minClearance: 'lead' },
    ],
  },
  {
    key: 'business-management',
    title: 'Business Management',
    items: [
      { to: '/executive-dashboard', label: 'Executive Dashboard', keywords: ['executive', 'leadership', 'kpi', 'cash'], minClearance: 'admin' },
      { to: '/daily-flash', label: 'Daily Flash', keywords: ['flash', 'daily report', 'standup', 'leadership'], minClearance: 'admin' },
      { to: '/rfq-inbox', label: 'RFQ Inbox', keywords: ['rfq', 'sales intake', 'quotes'], minClearance: 'lead' },
      { to: '/sales-pipeline', label: 'Sales Pipeline', keywords: ['crm', 'pipeline', 'forecast'], minClearance: 'lead' },
      { to: '/commissions', label: 'Commissions', keywords: ['compensation', 'sales commissions', 'pay'], minClearance: 'hr_manager' },
      { to: '/credit-management', label: 'Credit Management', keywords: ['credit', 'terms', 'risk', 'collections'], minClearance: 'hr_manager' },
      { to: '/vendor-scorecard', label: 'Vendor Scorecard', keywords: ['supplier scorecard', 'vendor quality', 'procurement'], minClearance: 'lead' },
      { to: '/vendor-catalog', label: 'Vendor Catalog', keywords: ['vendor catalog', 'supplier directory', 'sourcing', 'tool makers', 'procurement'], minClearance: 'lead' },
      { to: '/receiving', label: 'Receiving', keywords: ['receipts', 'incoming', 'inspection', 'dock'], minClearance: 'lead' },
      { to: '/shipping', label: 'Shipping', keywords: ['packout', 'shipment', 'bol', 'tracking'], minClearance: 'lead' },
    ],
  },
  {
    key: 'operations-support',
    title: 'Operations Support',
    items: [
      { to: '/maintenance', label: 'Preventive Maintenance', keywords: ['pm', 'maintenance', 'service'], minClearance: 'lead' },
      { to: '/assets', label: 'Equipment Assets', keywords: ['asset registry', 'equipment', 'machines'], minClearance: 'lead' },
      { to: '/work-orders', label: 'Maintenance Work Orders', keywords: ['maintenance work order', 'repair', 'tasks'], minClearance: 'lead' },
      { to: '/calibration', label: 'Calibration', keywords: ['gauge', 'certification', 'metrology'], minClearance: 'lead' },
      { to: '/osha', label: 'OSHA Compliance', keywords: ['osha', 'safety compliance', 'incident'], minClearance: 'hr_manager' },
      { to: '/audit-manager', label: 'Audit Manager', keywords: ['audit', 'iso', 'compliance'], minClearance: 'hr_manager' },
    ],
  },
  {
    key: 'manufacturing-excellence',
    title: 'Manufacturing Excellence',
    items: [
      { to: '/oee', label: 'OEE Dashboard', keywords: ['availability', 'performance', 'quality', 'equipment'] },
      { to: '/kaizen', label: 'Kaizen Board', keywords: ['improvement', 'suggestion', 'continuous'] },
      { to: '/spc', label: 'SPC Dashboard', keywords: ['control chart', 'cpk', 'nelson', 'dmaic'] },
      { to: '/value-stream', label: 'Value Stream', keywords: ['lean', 'waste', 'lead time', 'takt'] },
      { to: '/kanban', label: 'Kanban Board', keywords: ['wip', 'queue', 'job board', 'heijunka'] },
      { to: '/root-cause', label: 'Root Cause', keywords: ['5 whys', 'fishbone', 'ishikawa', 'rca'] },
      { to: '/a3-report', label: 'A3 Report', keywords: ['problem report', 'toyota', 'countermeasure'] },
    ],
  },
  {
    key: 'knowledge',
    title: 'Knowledge',
    items: [
      { to: '/documents', label: 'Documents', keywords: ['extraction', 'references'] },
      { to: '/knowledge-ingest', label: 'Ingest Knowledge', keywords: ['paste', 'tip', 'video', 'upload', 'url', 'tribal'] },
      { to: '/knowledge-browse', label: 'Browse Knowledge', keywords: ['search', 'filter', 'tags', 'graph', 'stats'] },
      { to: '/course-viewer', label: 'Course Viewer', keywords: ['course', 'quiz', 'generate', 'scorm', 'export'] },
      { to: '/fleet-learning', label: 'Fleet Learning', keywords: ['calibration', 'drift', 'transfer', 'measurement', 'feedback'] },
      { to: '/learning', label: 'Learning', keywords: ['academy', 'lessons', 'training'] },
    ],
  },
] as const;

export const MOBILE_NAV_ITEMS: readonly NavItem[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/employee', label: 'My Work' },
  { to: '/messages', label: 'Messages' },
  { to: '/shop-clock', label: 'Shop Clock' },
  { to: '/calculator', label: 'Calculator' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/shop', label: 'My Shop' },
  { to: '/wire-edm', label: 'Wire EDM' },
  { to: '/milling', label: 'Milling' },
  { to: '/quality', label: 'Quality' },
  { to: '/job-planner', label: 'Planner', minClearance: 'lead' },
  { to: '/reports', label: 'Reports', minClearance: 'lead' },
  { to: '/employees', label: 'People Ops', minClearance: 'hr_manager' },
  { to: '/timecards', label: 'Timecards', minClearance: 'hr_manager' },
  { to: '/payroll', label: 'Payroll', minClearance: 'hr_manager' },
] as const;

// Backend contract note: this seed data represents the summary shape the shell
// should eventually hydrate from a global search endpoint that returns record id,
// type, title, workspace route, status, owner, detail, and search facets.
export const SHELL_RECORDS: readonly ShellRecord[] = [
  {
    id: 'JOB-4821',
    title: 'Titanium impeller roughing package',
    type: 'Job',
    workspaceLabel: 'Jobs',
    workspaceRoute: '/jobs',
    status: 'At risk',
    owner: 'Programming',
    detail: 'Op 20 setup is waiting on holder clearance review before release.',
    keywords: ['impeller', '5-axis', 'traveler', 'setup', 'program'],
  },
  {
    id: 'QUO-1933',
    title: 'Valve body family quote revision B',
    type: 'Quote',
    workspaceLabel: 'Quote Builder',
    workspaceRoute: '/quote-builder',
    status: 'Pending approval',
    owner: 'Estimating',
    detail: 'Customer requested alternate alloy and split delivery options.',
    keywords: ['rfq', 'valve', 'revision', 'approval', 'delivery'],
  },
  {
    id: 'CUS-104',
    title: 'Archer Precision account pulse',
    type: 'Customer',
    workspaceLabel: 'Customers',
    workspaceRoute: '/customers',
    status: 'Needs follow-up',
    owner: 'Sales',
    detail: 'Credit exposure is stable but two orders need revised due dates.',
    keywords: ['account', 'credit', 'pipeline', 'follow-up'],
  },
  {
    id: 'PORT-301',
    title: 'Apex Aerospace portal visibility lane',
    type: 'Customer',
    workspaceLabel: 'Customer Portal',
    workspaceRoute: '/customer-portal',
    status: 'Preview active',
    owner: 'Customer Success',
    detail: 'Portal token, milestone visibility, and approved doc release are ready for review.',
    keywords: ['portal', 'customer visibility', 'milestone', 'quality docs', 'share token'],
  },
  {
    id: 'PO-7789',
    title: 'Inconel roughing insert replenishment',
    type: 'PO',
    workspaceLabel: 'Purchase Orders',
    workspaceRoute: '/purchase-orders',
    status: 'Supplier late',
    owner: 'Purchasing',
    detail: 'Original dock date slipped 48 hours and now threatens two jobs.',
    keywords: ['supplier', 'late', 'tooling', 'inconel', 'dock'],
  },
  {
    id: 'ORD-5124',
    title: 'Medtech housing shipment tracker',
    type: 'Order',
    workspaceLabel: 'Orders',
    workspaceRoute: '/orders',
    status: 'Ready to ship',
    owner: 'Operations',
    detail: 'Final packout is complete and ASN is waiting on customer release.',
    keywords: ['shipment', 'delivery', 'asn', 'status'],
  },
  {
    id: 'PART-0097',
    title: '5-axis manifold setup candidate',
    type: 'Part',
    workspaceLabel: 'Parts Library',
    workspaceRoute: '/parts-library',
    status: 'DFM review',
    owner: 'Applications',
    detail: 'Thin-wall pocket needs revision review, linked files, and downstream release continuity.',
    keywords: ['part', 'dfm', 'manifold', 'revisions', 'files', 'comparison'],
  },
  {
    id: 'NCR-221',
    title: 'Burr in op 30 cross-bore',
    type: 'Quality',
    workspaceLabel: 'Quality',
    workspaceRoute: '/quality',
    status: 'Open NCR',
    owner: 'Quality',
    detail: 'Containment is active and supplier cert traceability is attached.',
    keywords: ['ncr', 'quality', 'burr', 'containment', 'cert'],
  },
  {
    id: 'INV-4408',
    title: 'Apex Aerospace invoice follow-up',
    type: 'Invoice',
    workspaceLabel: 'Invoices',
    workspaceRoute: '/invoices',
    status: 'Overdue',
    owner: 'Accounting',
    detail: 'Collections note added after customer requested revised packing docs.',
    keywords: ['invoice', 'ar', 'collections', 'packing docs'],
  },
  {
    id: 'LES-AX5',
    title: '5-axis collision review lesson',
    type: 'Lesson',
    workspaceLabel: 'Learning',
    workspaceRoute: '/learning',
    status: 'Recommended',
    owner: 'Academy',
    detail: 'Suggested from recent alarm and setup review history.',
    keywords: ['lesson', 'training', 'collision', 'academy'],
  },
] as const;

export function isNavGroup(item: NavEntry): item is NavGroup {
  return 'items' in item;
}

export function findCurrentLabel(pathname: string) {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (isNavGroup(item)) {
        const match = item.items.find((entry) => entry.to === pathname);
        if (match) return `${item.label} / ${match.label}`;
      } else if (item.to === pathname) {
        return item.label;
      }
    }
  }

  if (pathname.startsWith('/learning')) {
    return 'Learning';
  }

  return 'Workspace';
}

export function flattenWorkspaceCommands() {
  const commands: WorkspaceCommand[] = [];

  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
    if (isNavGroup(item)) {
      for (const child of item.items) {
        commands.push({
          to: child.to,
          label: `${item.label} / ${child.label}`,
          sectionTitle: section.title,
          minClearance: child.minClearance ?? item.minClearance ?? section.minClearance,
          searchText: [
            section.title,
            item.label,
              child.label,
              ...(item.keywords ?? []),
              ...(child.keywords ?? []),
            ].join(' ').toLowerCase(),
          });
        }
      } else {
        commands.push({
          to: item.to,
          label: item.label,
          sectionTitle: section.title,
          minClearance: item.minClearance ?? section.minClearance,
          searchText: [section.title, item.label, ...(item.keywords ?? [])].join(' ').toLowerCase(),
        });
      }
    }
  }

  return commands;
}

export function buildRecordRoute(record: Pick<ShellRecord, 'id' | 'type' | 'workspaceRoute'>) {
  const params = new URLSearchParams({
    focusId: record.id,
    focusType: record.type.toLowerCase(),
  });

  return `${record.workspaceRoute}?${params.toString()}`;
}

export function findShellRecordByFocus(pathname: string, search: string) {
  const params = new URLSearchParams(search);
  const focusId = params.get('focusId');

  if (!focusId) {
    return null;
  }

  return SHELL_RECORDS.find((record) => record.id === focusId && record.workspaceRoute === pathname) ?? null;
}
