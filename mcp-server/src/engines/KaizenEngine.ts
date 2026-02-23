/**
 * KaizenEngine — Improvement events, A3 reports, before/after tracking & sustainment
 * Phase R29-MS2: Continuous Improvement & Lean Intelligence
 *
 * Actions:
 *   kai_event    — create/query kaizen events with scope, team, and timeline
 *   kai_a3       — generate A3 problem-solving reports
 *   kai_track    — track improvement metrics before/after
 *   kai_sustain  — monitor sustainment of improvements over time
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface KaizenEvent {
  id: string;
  title: string;
  type: 'blitz' | 'project' | 'suggestion' | 'gemba_walk';
  area: string;
  value_stream: string;
  status: 'planned' | 'active' | 'completed' | 'sustained';
  start_date: string;
  end_date: string;
  team: string[];
  sponsor: string;
  target_metric: string;
  baseline_value: number;
  target_value: number;
  actual_value: number | null;
  savings_usd: number;
  category: string;
}

interface A3Report {
  id: string;
  event_id: string;
  title: string;
  background: string;
  current_condition: string;
  goal: string;
  root_cause_analysis: string[];
  countermeasures: { action: string; owner: string; due: string; status: string }[];
  confirmation: string;
  follow_up: string;
  created: string;
}

interface SustainmentCheck {
  id: string;
  event_id: string;
  check_date: string;
  metric_name: string;
  target_value: number;
  actual_value: number;
  sustained: boolean;
  notes: string;
}

// ── Sample Data ────────────────────────────────────────────────────────────

const KAIZEN_EVENTS: KaizenEvent[] = [
  { id: 'KE-001', title: 'CNC Cell Setup Reduction', type: 'blitz', area: 'Cell-A', value_stream: 'Pump Assembly', status: 'completed', start_date: '2025-01-06', end_date: '2025-01-10', team: ['J. Martinez', 'L. Chen', 'R. Patel', 'S. Kim'], sponsor: 'M. Thompson', target_metric: 'setup_time_min', baseline_value: 45, target_value: 15, actual_value: 18, savings_usd: 28000, category: 'SMED' },
  { id: 'KE-002', title: 'Grinding WIP Reduction', type: 'project', area: 'Cell-B', value_stream: 'Pump Assembly', status: 'sustained', start_date: '2025-02-03', end_date: '2025-02-28', team: ['A. Johnson', 'B. Williams', 'C. Davis'], sponsor: 'M. Thompson', target_metric: 'wip_units', baseline_value: 24, target_value: 8, actual_value: 6, savings_usd: 15000, category: 'Flow' },
  { id: 'KE-003', title: 'Assembly Defect Elimination', type: 'blitz', area: 'Cell-C', value_stream: 'Pump Assembly', status: 'active', start_date: '2025-03-10', end_date: '2025-03-14', team: ['D. Brown', 'E. Wilson', 'F. Garcia', 'G. Lee'], sponsor: 'K. Roberts', target_metric: 'defect_rate_pct', baseline_value: 2.4, target_value: 0.5, actual_value: null, savings_usd: 0, category: 'Quality' },
  { id: 'KE-004', title: 'Valve Line 5S Implementation', type: 'gemba_walk', area: 'Lathe-2', value_stream: 'Control Valves', status: 'completed', start_date: '2025-01-20', end_date: '2025-01-24', team: ['H. Taylor', 'I. Anderson'], sponsor: 'K. Roberts', target_metric: '5s_score', baseline_value: 2.1, target_value: 4.0, actual_value: 4.2, savings_usd: 8000, category: '5S' },
  { id: 'KE-005', title: 'Material Flow Optimization', type: 'project', area: 'Warehouse-A', value_stream: 'Pump Assembly', status: 'planned', start_date: '2025-04-07', end_date: '2025-04-30', team: ['J. Martinez', 'A. Johnson'], sponsor: 'M. Thompson', target_metric: 'transport_distance_ft', baseline_value: 450, target_value: 150, actual_value: null, savings_usd: 0, category: 'Flow' },
  { id: 'KE-006', title: 'Test Bay Throughput Improvement', type: 'suggestion', area: 'Test-Bay', value_stream: 'Pump Assembly', status: 'completed', start_date: '2025-02-15', end_date: '2025-02-15', team: ['L. Chen'], sponsor: 'M. Thompson', target_metric: 'throughput_per_hour', baseline_value: 8, target_value: 12, actual_value: 11, savings_usd: 12000, category: 'Throughput' },
];

const A3_REPORTS: A3Report[] = [
  {
    id: 'A3-001', event_id: 'KE-001', title: 'CNC Cell Setup Time Reduction',
    background: 'CNC Cell-A averages 45-minute setup changes, causing overtime and missed deliveries',
    current_condition: 'Internal setup tasks mixed with external; no standardized sequence; tools scattered',
    goal: 'Reduce setup time from 45 min to 15 min using SMED methodology',
    root_cause_analysis: ['No separation of internal/external setup', 'Tool search time averages 8 min', 'Fixture alignment done manually each time', 'No pre-staging of next job materials'],
    countermeasures: [
      { action: 'Separate internal/external tasks', owner: 'J. Martinez', due: '2025-01-07', status: 'done' },
      { action: 'Create shadow boards for tools', owner: 'L. Chen', due: '2025-01-08', status: 'done' },
      { action: 'Install quick-change fixture system', owner: 'R. Patel', due: '2025-01-09', status: 'done' },
      { action: 'Implement pre-staging checklist', owner: 'S. Kim', due: '2025-01-10', status: 'done' },
    ],
    confirmation: 'Setup time reduced to 18 min average (60% reduction). Target of 15 min not fully met — fixture alignment still requires 3 min adjustment.',
    follow_up: 'Investigate precision locating pins for zero-adjustment fixture change',
    created: '2025-01-06',
  },
  {
    id: 'A3-002', event_id: 'KE-003', title: 'Assembly Line Defect Elimination',
    background: 'Assembly cell producing 2.4% defect rate — primarily torque spec and gasket alignment issues',
    current_condition: 'Manual torque application, visual gasket inspection only, no poka-yoke',
    goal: 'Reduce defect rate from 2.4% to 0.5% through error-proofing',
    root_cause_analysis: ['Torque wrench calibration drift undetected', 'Gasket orientation not constrained', 'No go/no-go gauging for critical dimensions', 'Operator fatigue in afternoon shift'],
    countermeasures: [
      { action: 'Install digital torque monitoring', owner: 'D. Brown', due: '2025-03-11', status: 'in_progress' },
      { action: 'Design asymmetric gasket keying', owner: 'E. Wilson', due: '2025-03-12', status: 'in_progress' },
      { action: 'Add critical dimension go/no-go gauge', owner: 'F. Garcia', due: '2025-03-13', status: 'planned' },
      { action: 'Implement job rotation schedule', owner: 'G. Lee', due: '2025-03-14', status: 'planned' },
    ],
    confirmation: 'In progress — digital torque system installed, awaiting data',
    follow_up: 'Review defect data after 2-week trial period',
    created: '2025-03-10',
  },
];

const SUSTAINMENT_CHECKS: SustainmentCheck[] = [
  { id: 'SC-001', event_id: 'KE-001', check_date: '2025-02-10', metric_name: 'setup_time_min', target_value: 18, actual_value: 19, sustained: true, notes: 'Within acceptable range' },
  { id: 'SC-002', event_id: 'KE-001', check_date: '2025-03-10', metric_name: 'setup_time_min', target_value: 18, actual_value: 22, sustained: false, notes: 'Regression detected — new operators not trained on SMED sequence' },
  { id: 'SC-003', event_id: 'KE-002', check_date: '2025-03-15', metric_name: 'wip_units', target_value: 8, actual_value: 5, sustained: true, notes: 'Better than target — kanban system working well' },
  { id: 'SC-004', event_id: 'KE-002', check_date: '2025-04-15', metric_name: 'wip_units', target_value: 8, actual_value: 7, sustained: true, notes: 'Sustained within target' },
  { id: 'SC-005', event_id: 'KE-004', check_date: '2025-02-24', metric_name: '5s_score', target_value: 4.0, actual_value: 4.1, sustained: true, notes: 'Weekly audits maintaining standards' },
  { id: 'SC-006', event_id: 'KE-004', check_date: '2025-03-24', metric_name: '5s_score', target_value: 4.0, actual_value: 3.8, sustained: false, notes: 'Slight regression — sustain phase needs attention' },
  { id: 'SC-007', event_id: 'KE-006', check_date: '2025-03-15', metric_name: 'throughput_per_hour', target_value: 11, actual_value: 11, sustained: true, notes: 'Consistent throughput maintained' },
];

// ── Action Implementations ─────────────────────────────────────────────────

function kaiEvent(params: Record<string, unknown>): unknown {
  const eventId = params.event_id as string | undefined;
  const status = params.status as string | undefined;
  const area = params.area as string | undefined;
  const category = params.category as string | undefined;

  let events = KAIZEN_EVENTS;
  if (eventId) events = events.filter(e => e.id === eventId);
  if (status) events = events.filter(e => e.status === status);
  if (area) events = events.filter(e => e.area.toLowerCase().includes((area as string).toLowerCase()));
  if (category) events = events.filter(e => e.category.toLowerCase() === (category as string).toLowerCase());

  const totalSavings = events.reduce((sum, e) => sum + e.savings_usd, 0);
  const completed = events.filter(e => e.status === 'completed' || e.status === 'sustained');
  const avgImprovement = completed.length > 0
    ? completed.reduce((sum, e) => sum + ((e.baseline_value - (e.actual_value || e.baseline_value)) / e.baseline_value * 100), 0) / completed.length
    : 0;

  return {
    total_events: events.length,
    events: events.map(e => ({
      id: e.id,
      title: e.title,
      type: e.type,
      area: e.area,
      status: e.status,
      target_metric: e.target_metric,
      baseline: e.baseline_value,
      target: e.target_value,
      actual: e.actual_value,
      savings_usd: e.savings_usd,
      team_size: e.team.length,
    })),
    summary: {
      total_savings_usd: totalSavings,
      avg_improvement_pct: Math.round(avgImprovement * 10) / 10,
      by_status: {
        planned: events.filter(e => e.status === 'planned').length,
        active: events.filter(e => e.status === 'active').length,
        completed: events.filter(e => e.status === 'completed').length,
        sustained: events.filter(e => e.status === 'sustained').length,
      },
      by_category: Object.entries(
        events.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + 1; return acc; }, {} as Record<string, number>)
      ).map(([cat, count]) => ({ category: cat, count })),
    },
  };
}

function kaiA3(params: Record<string, unknown>): unknown {
  const eventId = params.event_id as string | undefined;
  const reportId = params.report_id as string | undefined;

  let reports = A3_REPORTS;
  if (reportId) reports = reports.filter(r => r.id === reportId);
  if (eventId) reports = reports.filter(r => r.event_id === eventId);

  return {
    total_reports: reports.length,
    reports: reports.map(r => {
      const event = KAIZEN_EVENTS.find(e => e.id === r.event_id);
      const doneCount = r.countermeasures.filter(c => c.status === 'done').length;
      return {
        id: r.id,
        event_id: r.event_id,
        title: r.title,
        background: r.background,
        current_condition: r.current_condition,
        goal: r.goal,
        root_causes: r.root_cause_analysis,
        countermeasures: r.countermeasures,
        confirmation: r.confirmation,
        follow_up: r.follow_up,
        progress: {
          total_actions: r.countermeasures.length,
          completed: doneCount,
          completion_pct: Math.round(doneCount / r.countermeasures.length * 100),
        },
        event_status: event?.status,
        metric_result: event ? {
          baseline: event.baseline_value,
          target: event.target_value,
          actual: event.actual_value,
          improvement_pct: event.actual_value != null
            ? Math.round((event.baseline_value - event.actual_value) / event.baseline_value * 1000) / 10
            : null,
        } : null,
      };
    }),
  };
}

function kaiTrack(params: Record<string, unknown>): unknown {
  const eventId = params.event_id as string | undefined;
  const category = params.category as string | undefined;

  let events = KAIZEN_EVENTS.filter(e => e.actual_value !== null);
  if (eventId) events = events.filter(e => e.id === eventId);
  if (category) events = events.filter(e => e.category.toLowerCase() === (category as string).toLowerCase());

  const tracking = events.map(e => {
    const improvementPct = (e.baseline_value - (e.actual_value || e.baseline_value)) / e.baseline_value * 100;
    const targetMet = e.actual_value !== null && (
      e.actual_value <= e.target_value // for metrics where lower is better
      || (e.target_metric.includes('score') && e.actual_value >= e.target_value) // for scores where higher is better
      || (e.target_metric.includes('throughput') && e.actual_value >= e.target_value) // for throughput
    );

    return {
      event_id: e.id,
      title: e.title,
      metric: e.target_metric,
      baseline: e.baseline_value,
      target: e.target_value,
      actual: e.actual_value,
      improvement_pct: Math.round(improvementPct * 10) / 10,
      target_met: targetMet,
      savings_usd: e.savings_usd,
      category: e.category,
    };
  });

  const totalSavings = tracking.reduce((sum, t) => sum + t.savings_usd, 0);
  const targetsMet = tracking.filter(t => t.target_met).length;

  return {
    total_tracked: tracking.length,
    improvements: tracking,
    summary: {
      total_savings_usd: totalSavings,
      targets_met: targetsMet,
      targets_missed: tracking.length - targetsMet,
      hit_rate_pct: Math.round(targetsMet / Math.max(tracking.length, 1) * 100),
      avg_improvement_pct: Math.round(tracking.reduce((sum, t) => sum + t.improvement_pct, 0) / Math.max(tracking.length, 1) * 10) / 10,
      best_improvement: tracking.reduce((best, t) => t.improvement_pct > best.improvement_pct ? t : best, tracking[0]),
    },
  };
}

function kaiSustain(params: Record<string, unknown>): unknown {
  const eventId = params.event_id as string | undefined;

  let checks = SUSTAINMENT_CHECKS;
  if (eventId) checks = checks.filter(c => c.event_id === eventId);

  // Group by event
  const byEvent = new Map<string, SustainmentCheck[]>();
  checks.forEach(c => {
    const list = byEvent.get(c.event_id) || [];
    list.push(c);
    byEvent.set(c.event_id, list);
  });

  const eventSustainment = Array.from(byEvent.entries()).map(([eid, eventChecks]) => {
    const event = KAIZEN_EVENTS.find(e => e.id === eid);
    const sustainedCount = eventChecks.filter(c => c.sustained).length;
    const latestCheck = eventChecks[eventChecks.length - 1];
    const trending = eventChecks.length >= 2
      ? eventChecks[eventChecks.length - 1].actual_value <= eventChecks[eventChecks.length - 2].actual_value ? 'improving' : 'regressing'
      : 'insufficient_data';

    return {
      event_id: eid,
      event_title: event?.title,
      total_checks: eventChecks.length,
      sustained_count: sustainedCount,
      sustainment_rate_pct: Math.round(sustainedCount / eventChecks.length * 100),
      latest_check: {
        date: latestCheck.check_date,
        target: latestCheck.target_value,
        actual: latestCheck.actual_value,
        sustained: latestCheck.sustained,
        notes: latestCheck.notes,
      },
      trend: trending,
      checks: eventChecks.map(c => ({
        date: c.check_date,
        target: c.target_value,
        actual: c.actual_value,
        sustained: c.sustained,
      })),
    };
  });

  const overallSustained = checks.filter(c => c.sustained).length;

  return {
    total_checks: checks.length,
    sustainment: eventSustainment,
    summary: {
      overall_sustainment_pct: Math.round(overallSustained / Math.max(checks.length, 1) * 100),
      events_monitored: eventSustainment.length,
      regressing: eventSustainment.filter(e => e.trend === 'regressing').length,
      stable_or_improving: eventSustainment.filter(e => e.trend === 'improving').length,
      at_risk: eventSustainment.filter(e => e.sustainment_rate_pct < 75).map(e => ({
        event_id: e.event_id,
        title: e.event_title,
        rate: e.sustainment_rate_pct,
      })),
    },
  };
}

// ── Public Dispatcher ──────────────────────────────────────────────────────

export function executeKaizenAction(
  action: string,
  params: Record<string, unknown>
): unknown {
  switch (action) {
    case 'kai_event':   return kaiEvent(params);
    case 'kai_a3':      return kaiA3(params);
    case 'kai_track':   return kaiTrack(params);
    case 'kai_sustain': return kaiSustain(params);
    default:
      return { error: `Unknown Kaizen action: ${action}` };
  }
}
