/**
 * CAPAEngine — corrective/preventive actions, 8D, root cause, effectiveness
 * Phase R32-MS3: Compliance & Regulatory Intelligence
 *
 * Actions:
 *   capa_initiate   — CAPA initiation and classification
 *   capa_rootcause  — root cause analysis (5-Why, Fishbone, 8D)
 *   capa_action     — corrective/preventive action tracking
 *   capa_verify     — effectiveness verification and closure
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface CAPA {
  id: string;
  type: 'corrective' | 'preventive';
  source: string;
  description: string;
  priority: 'critical' | 'major' | 'minor';
  department: string;
  initiated_date: string;
  target_date: string;
  status: 'initiated' | 'investigating' | 'action_plan' | 'implementing' | 'verifying' | 'closed';
  assigned_to: string;
}

interface RootCause {
  capa_id: string;
  method: '5_why' | 'fishbone' | '8D' | 'fault_tree';
  root_cause: string;
  contributing_factors: string[];
  category: string;
}

interface CAPAAction {
  id: string;
  capa_id: string;
  action_type: 'containment' | 'corrective' | 'preventive';
  description: string;
  responsible: string;
  due_date: string;
  status: 'planned' | 'in_progress' | 'completed' | 'verified';
}

// ── Sample Data ────────────────────────────────────────────────────────────

const CAPAS: CAPA[] = [
  { id: 'CAPA-001', type: 'corrective', source: 'Customer Complaint', description: 'Pump seal leakage in field after 6 months', priority: 'critical', department: 'Engineering', initiated_date: '2025-01-15', target_date: '2025-03-15', status: 'implementing', assigned_to: 'D. Johnson' },
  { id: 'CAPA-002', type: 'corrective', source: 'Internal Audit AUD-001', description: 'Work instructions not at current revision', priority: 'minor', department: 'Quality', initiated_date: '2025-03-16', target_date: '2025-04-30', status: 'action_plan', assigned_to: 'S. Williams' },
  { id: 'CAPA-003', type: 'preventive', source: 'SPC Trend', description: 'Bore diameter trending toward USL', priority: 'major', department: 'Production', initiated_date: '2025-02-01', target_date: '2025-04-01', status: 'verifying', assigned_to: 'M. Chen' },
  { id: 'CAPA-004', type: 'corrective', source: 'Supplier NCR', description: 'Casting porosity exceeding acceptance criteria', priority: 'major', department: 'Procurement', initiated_date: '2025-02-20', target_date: '2025-05-20', status: 'investigating', assigned_to: 'R. Patel' },
  { id: 'CAPA-005', type: 'preventive', source: 'Risk Assessment', description: 'Single-source dependency for bronze inserts', priority: 'major', department: 'Procurement', initiated_date: '2025-01-10', target_date: '2025-06-30', status: 'implementing', assigned_to: 'R. Patel' },
  { id: 'CAPA-006', type: 'corrective', source: 'Safety Incident', description: 'Near-miss: forklift collision in shipping area', priority: 'critical', department: 'Safety', initiated_date: '2025-03-01', target_date: '2025-03-31', status: 'closed', assigned_to: 'T. Garcia' },
];

const ROOT_CAUSES: RootCause[] = [
  { capa_id: 'CAPA-001', method: '8D', root_cause: 'Seal groove surface finish degraded due to worn tool insert', contributing_factors: ['Tool change interval too long', 'No in-process surface finish check', 'Supplier seal tolerance at lower limit'], category: 'Process' },
  { capa_id: 'CAPA-003', method: '5_why', root_cause: 'Spindle bearing wear causing thermal growth shift', contributing_factors: ['Bearing replacement interval exceeded', 'No thermal compensation active'], category: 'Equipment' },
  { capa_id: 'CAPA-004', method: 'fishbone', root_cause: 'Supplier changed sand composition without notification', contributing_factors: ['No supplier change notification clause', 'Incoming inspection sampling too low', 'Specification too broad'], category: 'Material' },
  { capa_id: 'CAPA-006', method: '5_why', root_cause: 'Blind spot at aisle intersection due to racking placement', contributing_factors: ['No convex mirror installed', 'Forklift speed not enforced', 'Pedestrian walkway not marked'], category: 'Environment' },
];

const CAPA_ACTIONS: CAPAAction[] = [
  { id: 'ACT-001', capa_id: 'CAPA-001', action_type: 'containment', description: 'Sort and inspect all seals in WIP and finished goods', responsible: 'Quality', due_date: '2025-01-20', status: 'completed' },
  { id: 'ACT-002', capa_id: 'CAPA-001', action_type: 'corrective', description: 'Reduce tool insert change interval from 500 to 300 parts', responsible: 'Production', due_date: '2025-02-15', status: 'completed' },
  { id: 'ACT-003', capa_id: 'CAPA-001', action_type: 'corrective', description: 'Add in-process surface finish measurement at seal groove', responsible: 'Engineering', due_date: '2025-03-01', status: 'in_progress' },
  { id: 'ACT-004', capa_id: 'CAPA-001', action_type: 'preventive', description: 'Update FMEA for seal assembly process', responsible: 'Engineering', due_date: '2025-03-15', status: 'planned' },
  { id: 'ACT-005', capa_id: 'CAPA-003', action_type: 'corrective', description: 'Replace spindle bearings and verify thermal compensation', responsible: 'Maintenance', due_date: '2025-03-15', status: 'completed' },
  { id: 'ACT-006', capa_id: 'CAPA-003', action_type: 'preventive', description: 'Add bearing vibration monitoring to PM schedule', responsible: 'Maintenance', due_date: '2025-03-30', status: 'completed' },
  { id: 'ACT-007', capa_id: 'CAPA-006', action_type: 'containment', description: 'Install temporary stop signs at intersection', responsible: 'Safety', due_date: '2025-03-02', status: 'verified' },
  { id: 'ACT-008', capa_id: 'CAPA-006', action_type: 'corrective', description: 'Install convex mirrors and floor markings', responsible: 'Facilities', due_date: '2025-03-15', status: 'verified' },
  { id: 'ACT-009', capa_id: 'CAPA-006', action_type: 'preventive', description: 'Conduct traffic flow analysis for all aisles', responsible: 'Safety', due_date: '2025-03-31', status: 'verified' },
];

// ── Action Implementations ─────────────────────────────────────────────────

function capaInitiate(params: Record<string, unknown>): unknown {
  const type = params.type as string | undefined;
  const priority = params.priority as string | undefined;
  const status = params.status as string | undefined;

  let capas = CAPAS;
  if (type) capas = capas.filter(c => c.type === type);
  if (priority) capas = capas.filter(c => c.priority === priority);
  if (status) capas = capas.filter(c => c.status === status);

  const overdue = capas.filter(c => c.status !== 'closed' && new Date(c.target_date) < new Date('2025-04-01'));

  return {
    total_capas: capas.length,
    capas,
    summary: {
      by_type: { corrective: capas.filter(c => c.type === 'corrective').length, preventive: capas.filter(c => c.type === 'preventive').length },
      by_priority: { critical: capas.filter(c => c.priority === 'critical').length, major: capas.filter(c => c.priority === 'major').length, minor: capas.filter(c => c.priority === 'minor').length },
      open: capas.filter(c => c.status !== 'closed').length,
      closed: capas.filter(c => c.status === 'closed').length,
      overdue: overdue.length,
    },
  };
}

function capaRootcause(params: Record<string, unknown>): unknown {
  const capaId = params.capa_id as string | undefined;
  const method = params.method as string | undefined;

  let causes = ROOT_CAUSES;
  if (capaId) causes = causes.filter(c => c.capa_id === capaId);
  if (method) causes = causes.filter(c => c.method === method);

  return {
    total_analyses: causes.length,
    root_causes: causes,
    summary: {
      by_method: { '5_why': causes.filter(c => c.method === '5_why').length, fishbone: causes.filter(c => c.method === 'fishbone').length, '8D': causes.filter(c => c.method === '8D').length, fault_tree: causes.filter(c => c.method === 'fault_tree').length },
      by_category: { Process: causes.filter(c => c.category === 'Process').length, Equipment: causes.filter(c => c.category === 'Equipment').length, Material: causes.filter(c => c.category === 'Material').length, Environment: causes.filter(c => c.category === 'Environment').length },
      avg_contributing_factors: Math.round(causes.reduce((s, c) => s + c.contributing_factors.length, 0) / Math.max(causes.length, 1) * 10) / 10,
    },
  };
}

function capaActionFn(params: Record<string, unknown>): unknown {
  const capaId = params.capa_id as string | undefined;
  const actionType = params.action_type as string | undefined;

  let actions = CAPA_ACTIONS;
  if (capaId) actions = actions.filter(a => a.capa_id === capaId);
  if (actionType) actions = actions.filter(a => a.action_type === actionType);

  const overdue = actions.filter(a => a.status !== 'completed' && a.status !== 'verified' && new Date(a.due_date) < new Date('2025-04-01'));

  return {
    total_actions: actions.length,
    actions,
    summary: {
      by_type: { containment: actions.filter(a => a.action_type === 'containment').length, corrective: actions.filter(a => a.action_type === 'corrective').length, preventive: actions.filter(a => a.action_type === 'preventive').length },
      completed: actions.filter(a => a.status === 'completed' || a.status === 'verified').length,
      in_progress: actions.filter(a => a.status === 'in_progress').length,
      overdue: overdue.length,
      completion_rate: Math.round(actions.filter(a => a.status === 'completed' || a.status === 'verified').length / Math.max(actions.length, 1) * 1000) / 10,
    },
  };
}

function capaVerify(params: Record<string, unknown>): unknown {
  const capaId = params.capa_id as string | undefined;

  const closedCapas = CAPAS.filter(c => c.status === 'closed' || c.status === 'verifying');
  let capas = capaId ? closedCapas.filter(c => c.id === capaId) : closedCapas;

  const results = capas.map(c => {
    const actions = CAPA_ACTIONS.filter(a => a.capa_id === c.id);
    const verified = actions.filter(a => a.status === 'verified').length;
    const allComplete = actions.every(a => a.status === 'completed' || a.status === 'verified');
    const rootCause = ROOT_CAUSES.find(r => r.capa_id === c.id);

    return {
      capa_id: c.id,
      description: c.description,
      priority: c.priority,
      total_actions: actions.length,
      verified_actions: verified,
      all_actions_complete: allComplete,
      root_cause_identified: !!rootCause,
      effectiveness_verified: verified > 0 && allComplete,
      days_open: Math.round((new Date('2025-04-01').getTime() - new Date(c.initiated_date).getTime()) / 86400000),
    };
  });

  return {
    total_verifications: results.length,
    verification_details: results,
    summary: {
      fully_verified: results.filter(r => r.effectiveness_verified).length,
      pending_verification: results.filter(r => !r.effectiveness_verified).length,
      avg_days_open: Math.round(results.reduce((s, r) => s + r.days_open, 0) / Math.max(results.length, 1)),
    },
  };
}

// ── Public Dispatcher ──────────────────────────────────────────────────────

export function executeCAPAAction(
  action: string,
  params: Record<string, unknown>
): unknown {
  switch (action) {
    case 'capa_initiate':  return capaInitiate(params);
    case 'capa_rootcause': return capaRootcause(params);
    case 'capa_action':    return capaActionFn(params);
    case 'capa_verify':    return capaVerify(params);
    default:
      return { error: `Unknown CAPA action: ${action}` };
  }
}
