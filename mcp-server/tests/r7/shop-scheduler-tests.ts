/**
 * R7-MS5: Shop Scheduler Engine Tests
 *
 * Tests shop_schedule and machine_utilization actions:
 *   T1:  5 jobs, 3 machines, no constraints (spec test 1)
 *   T2:  10 jobs, 5 machines, 2 rush priority (spec test 2)
 *   T3:  Job requires 5-axis, only 1 machine capable (spec test 3)
 *   T4:  Empty jobs → valid empty schedule
 *   T5:  Single job, single machine → trivial schedule
 *   T6:  Due dates → tardiness tracking
 *   T7:  Optimize for min_makespan
 *   T8:  Optimize for min_tardiness
 *   T9:  Optimize for max_utilization
 *   T10: Optimize for balanced
 *   T11: Multi-operation jobs → operation sequencing
 *   T12: Unschedulable operations → capability gap
 *   T13: Machine utilization analysis
 *   T14: Machine utilization with generated schedule
 *   T15: Bottleneck detection
 *   T16: Dispatcher function
 *   T17: Large schedule (20 jobs, 8 machines)
 *   T18: All rush priority
 *   T19: No due dates
 *   T20: MachineInput objects with explicit capabilities
 */

import {
  shopScheduler,
  shopSchedule,
  machineUtilization,
} from '../../src/engines/ShopSchedulerEngine.js';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(label);
    console.error(`  FAIL: ${label}`);
  }
}

function assertClose(actual: number, expected: number, tolerancePct: number, label: string): void {
  if (expected === 0) {
    assert(Math.abs(actual) < 0.01, label);
    return;
  }
  const pct = Math.abs((actual - expected) / expected) * 100;
  if (pct <= tolerancePct) {
    passed++;
  } else {
    failed++;
    failures.push(`${label} (got ${actual}, expected ~${expected}, delta ${pct.toFixed(1)}%)`);
    console.error(`  FAIL: ${label} — got ${actual}, expected ~${expected} (±${tolerancePct}%), delta ${pct.toFixed(1)}%`);
  }
}

function assertRange(actual: number, min: number, max: number, label: string): void {
  if (actual >= min && actual <= max) {
    passed++;
  } else {
    failed++;
    failures.push(`${label} (got ${actual}, expected [${min}, ${max}])`);
    console.error(`  FAIL: ${label} — got ${actual}, expected [${min}, ${max}]`);
  }
}

// ============================================================================
// T1: 5 JOBS, 3 MACHINES, NO CONSTRAINTS (Spec Test 1)
// ============================================================================

console.log('\n=== T1: 5 jobs, 3 machines, no constraints ===');

const t1 = shopSchedule({
  jobs: [
    { id: 'J1', operations: [{ type: 'milling', estimated_time_min: 30 }], priority: 'normal' },
    { id: 'J2', operations: [{ type: 'milling', estimated_time_min: 45 }], priority: 'normal' },
    { id: 'J3', operations: [{ type: 'milling', estimated_time_min: 20 }], priority: 'normal' },
    { id: 'J4', operations: [{ type: 'milling', estimated_time_min: 60 }], priority: 'normal' },
    { id: 'J5', operations: [{ type: 'milling', estimated_time_min: 35 }], priority: 'normal' },
  ],
  machines: ['M1', 'M2', 'M3'],
});

assert(t1.schedule.length === 3, 'T1.1: 3 machine schedules');
assert(t1.metrics.total_jobs === 5, 'T1.2: 5 total jobs');
assert(t1.metrics.total_operations === 5, 'T1.3: 5 total operations');
assert(t1.metrics.unschedulable_operations === 0, 'T1.4: no unschedulable ops');
assert(t1.metrics.total_makespan_min > 0, 'T1.5: makespan > 0');
assert(t1.unscheduled.length === 0, 'T1.6: nothing unscheduled');

// Verify no overlaps on any machine
for (const ms of t1.schedule) {
  const sorted = [...ms.assignments].sort((a, b) => a.start_time_min - b.start_time_min);
  let valid = true;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start_time_min < sorted[i - 1].end_time_min) {
      valid = false;
      break;
    }
  }
  assert(valid, `T1.7: No overlaps on ${ms.machine}`);
}

// ============================================================================
// T2: 10 JOBS, 5 MACHINES, 2 RUSH PRIORITY (Spec Test 2)
// ============================================================================

console.log('\n=== T2: 10 jobs, 5 machines, 2 rush priority ===');

const t2Jobs = Array.from({ length: 10 }, (_, i) => ({
  id: `J${i + 1}`,
  operations: [{ type: 'milling', estimated_time_min: 20 + i * 5 }],
  priority: (i < 2 ? 'rush' : 'normal') as 'rush' | 'normal',
}));

const t2 = shopSchedule({
  jobs: t2Jobs,
  machines: ['M1', 'M2', 'M3', 'M4', 'M5'],
  optimize_for: 'balanced',
});

assert(t2.schedule.length === 5, 'T2.1: 5 machine schedules');
assert(t2.metrics.total_jobs === 10, 'T2.2: 10 jobs');

// Rush jobs should start first (at time 0 or very early)
const allAssignments = t2.schedule.flatMap((ms) => ms.assignments);
const rushAssignments = allAssignments.filter((a) => a.job_id === 'J1' || a.job_id === 'J2');
assert(rushAssignments.length === 2, 'T2.3: both rush jobs scheduled');
for (const ra of rushAssignments) {
  assert(ra.start_time_min === 0, `T2.4: Rush job ${ra.job_id} starts at time 0`);
}

// ============================================================================
// T3: JOB REQUIRES 5-AXIS, ONLY 1 MACHINE CAPABLE (Spec Test 3)
// ============================================================================

console.log('\n=== T3: Job requires 5-axis, only 1 machine capable ===');

const t3 = shopSchedule({
  jobs: [
    { id: 'J1', operations: [{ type: 'milling', estimated_time_min: 40, required_capabilities: ['5-axis'] }], priority: 'normal' },
    { id: 'J2', operations: [{ type: 'milling', estimated_time_min: 30, required_capabilities: ['5-axis'] }], priority: 'normal' },
    { id: 'J3', operations: [{ type: 'milling', estimated_time_min: 25 }], priority: 'normal' },
  ],
  machines: [
    { id: 'Mill-3', capabilities: ['milling', '3-axis'] },
    { id: 'Mill-5', capabilities: ['milling', '3-axis', '5-axis'] },
    { id: 'Lathe', capabilities: ['turning', 'boring'] },
  ],
});

// Both 5-axis jobs must go to Mill-5
const mill5 = t3.schedule.find((ms) => ms.machine === 'Mill-5');
assert(mill5 !== undefined, 'T3.1: Mill-5 in schedule');
const fiveAxisOps = mill5!.assignments.filter(
  (a) => a.job_id === 'J1' || a.job_id === 'J2'
);
assert(fiveAxisOps.length === 2, 'T3.2: both 5-axis jobs on Mill-5');

// Bottleneck should be identified
assert(t3.bottlenecks.some((b) => b.includes('5-axis')), 'T3.3: 5-axis bottleneck identified');

// J3 should be on Mill-3 (milling, no 5-axis needed)
const j3Assignment = t3.schedule.flatMap((ms) => ms.assignments).find((a) => a.job_id === 'J3');
assert(j3Assignment !== undefined, 'T3.4: J3 scheduled');
assert(j3Assignment!.operation_type === 'milling', 'T3.5: J3 is milling');

// ============================================================================
// T4: EMPTY JOBS
// ============================================================================

console.log('\n=== T4: Empty jobs ===');

const t4 = shopSchedule({ jobs: [], machines: ['M1', 'M2'] });
assert(t4.schedule.length === 2, 'T4.1: 2 machine schedules');
assert(t4.metrics.total_makespan_min === 0, 'T4.2: makespan = 0');
assert(t4.metrics.total_jobs === 0, 'T4.3: 0 jobs');

// ============================================================================
// T5: SINGLE JOB, SINGLE MACHINE
// ============================================================================

console.log('\n=== T5: Single job, single machine ===');

const t5 = shopSchedule({
  jobs: [{ id: 'J1', operations: [{ type: 'milling', estimated_time_min: 42 }], priority: 'normal' }],
  machines: ['M1'],
});

assert(t5.schedule.length === 1, 'T5.1: 1 machine schedule');
assert(t5.schedule[0].assignments.length === 1, 'T5.2: 1 assignment');
assert(t5.schedule[0].assignments[0].start_time_min === 0, 'T5.3: starts at 0');
assert(t5.schedule[0].assignments[0].end_time_min === 42, 'T5.4: ends at 42');
assert(t5.metrics.total_makespan_min === 42, 'T5.5: makespan = 42');
assertClose(t5.schedule[0].utilization_pct, 100, 1, 'T5.6: utilization 100%');

// ============================================================================
// T6: DUE DATES — TARDINESS TRACKING
// ============================================================================

console.log('\n=== T6: Due dates — tardiness tracking ===');

const futureDate = new Date(Date.now() + 120 * 60000).toISOString(); // 2 hours from now
const pastDate = new Date(Date.now() - 60 * 60000).toISOString(); // 1 hour ago

const t6 = shopSchedule({
  jobs: [
    { id: 'J1', operations: [{ type: 'milling', estimated_time_min: 30 }], priority: 'normal', due_date: futureDate },
    { id: 'J2', operations: [{ type: 'milling', estimated_time_min: 200 }], priority: 'normal', due_date: '10' }, // Due in 10 min
  ],
  machines: ['M1'],
  optimize_for: 'min_tardiness',
});

assert(t6.metrics.total_jobs === 2, 'T6.1: 2 jobs');
// J2 has due_date=10min but takes 200min — will definitely be late
assert(t6.metrics.jobs_late >= 1, 'T6.2: at least 1 job late');

// ============================================================================
// T7: OPTIMIZE FOR MIN_MAKESPAN
// ============================================================================

console.log('\n=== T7: Optimize for min_makespan ===');

const t7Jobs = [
  { id: 'J1', operations: [{ type: 'milling', estimated_time_min: 100 }], priority: 'normal' as const },
  { id: 'J2', operations: [{ type: 'milling', estimated_time_min: 50 }], priority: 'normal' as const },
  { id: 'J3', operations: [{ type: 'milling', estimated_time_min: 80 }], priority: 'normal' as const },
  { id: 'J4', operations: [{ type: 'milling', estimated_time_min: 30 }], priority: 'normal' as const },
];

const t7 = shopSchedule({ jobs: t7Jobs, machines: ['M1', 'M2'], optimize_for: 'min_makespan' });

assert(t7.metrics.total_makespan_min > 0, 'T7.1: makespan > 0');
// With LPT on 2 machines: {100, 80} and {50, 30} → makespans 100+80=180... actually LPT assigns
// longest first to least loaded, so: M1 gets 100, M2 gets 80, M1 gets 50 (M1@150, M2@80), M2 gets 30 (M2@110)
// Makespan = max(150, 110) = 150
assert(t7.metrics.total_makespan_min <= 180, 'T7.2: makespan ≤ 180 (LPT helps)');
assert(t7.metrics.unschedulable_operations === 0, 'T7.3: all scheduled');

// ============================================================================
// T8: OPTIMIZE FOR MIN_TARDINESS
// ============================================================================

console.log('\n=== T8: Optimize for min_tardiness ===');

const t8 = shopSchedule({
  jobs: [
    { id: 'J1', operations: [{ type: 'milling', estimated_time_min: 20 }], priority: 'normal', due_date: '100' },
    { id: 'J2', operations: [{ type: 'milling', estimated_time_min: 20 }], priority: 'normal', due_date: '30' },
    { id: 'J3', operations: [{ type: 'milling', estimated_time_min: 20 }], priority: 'normal', due_date: '50' },
  ],
  machines: ['M1'],
  optimize_for: 'min_tardiness',
});

// EDD: J2 (due@30) first, then J3 (due@50), then J1 (due@100)
const t8Assigns = t8.schedule[0].assignments;
assert(t8Assigns[0].job_id === 'J2', 'T8.1: earliest due date first (J2)');
assert(t8Assigns[1].job_id === 'J3', 'T8.2: second earliest (J3)');
assert(t8Assigns[2].job_id === 'J1', 'T8.3: latest due date last (J1)');
assert(t8.metrics.jobs_on_time === 3, 'T8.4: all 3 on time');

// ============================================================================
// T9: OPTIMIZE FOR MAX_UTILIZATION
// ============================================================================

console.log('\n=== T9: Optimize for max_utilization ===');

const t9 = shopSchedule({
  jobs: [
    { id: 'J1', operations: [{ type: 'milling', estimated_time_min: 100 }], priority: 'normal' },
    { id: 'J2', operations: [{ type: 'milling', estimated_time_min: 50 }], priority: 'normal' },
    { id: 'J3', operations: [{ type: 'milling', estimated_time_min: 30 }], priority: 'normal' },
    { id: 'J4', operations: [{ type: 'milling', estimated_time_min: 20 }], priority: 'normal' },
  ],
  machines: ['M1', 'M2', 'M3'],
  optimize_for: 'max_utilization',
});

assert(t9.metrics.average_utilization_pct > 0, 'T9.1: avg utilization > 0');
// With utilization spreading, work should be distributed across machines
const nonEmptyMachines = t9.schedule.filter((ms) => ms.assignments.length > 0);
assert(nonEmptyMachines.length >= 2, 'T9.2: work spread across ≥ 2 machines');

// ============================================================================
// T10: OPTIMIZE FOR BALANCED
// ============================================================================

console.log('\n=== T10: Optimize for balanced ===');

const t10 = shopSchedule({
  jobs: [
    { id: 'J1', operations: [{ type: 'milling', estimated_time_min: 40 }], priority: 'rush' },
    { id: 'J2', operations: [{ type: 'milling', estimated_time_min: 60 }], priority: 'normal' },
    { id: 'J3', operations: [{ type: 'milling', estimated_time_min: 30 }], priority: 'low' },
  ],
  machines: ['M1', 'M2'],
  optimize_for: 'balanced',
});

assert(t10.metrics.total_jobs === 3, 'T10.1: 3 jobs');
// Rush job should be first
const firstAssigned = t10.schedule.flatMap((ms) => ms.assignments)
  .sort((a, b) => a.start_time_min - b.start_time_min)[0];
assert(firstAssigned.job_id === 'J1', 'T10.2: rush job J1 scheduled first');

// ============================================================================
// T11: MULTI-OPERATION JOBS — OPERATION SEQUENCING
// ============================================================================

console.log('\n=== T11: Multi-operation jobs — operation sequencing ===');

const t11 = shopSchedule({
  jobs: [{
    id: 'J1',
    operations: [
      { type: 'milling', estimated_time_min: 30 },
      { type: 'milling', estimated_time_min: 20 },
      { type: 'milling', estimated_time_min: 15 },
    ],
    priority: 'normal',
  }],
  machines: ['M1', 'M2'],
});

// All 3 operations of J1 should be scheduled
const j1Ops = t11.schedule.flatMap((ms) => ms.assignments)
  .filter((a) => a.job_id === 'J1')
  .sort((a, b) => a.operation_index - b.operation_index);

assert(j1Ops.length === 3, 'T11.1: all 3 operations scheduled');
// Operation i+1 must not start before operation i ends
assert(j1Ops[1].start_time_min >= j1Ops[0].end_time_min, 'T11.2: op1 starts after op0 ends');
assert(j1Ops[2].start_time_min >= j1Ops[1].end_time_min, 'T11.3: op2 starts after op1 ends');

// ============================================================================
// T12: UNSCHEDULABLE OPERATIONS — CAPABILITY GAP
// ============================================================================

console.log('\n=== T12: Unschedulable operations ===');

const t12 = shopSchedule({
  jobs: [
    { id: 'J1', operations: [{ type: 'milling', estimated_time_min: 30, required_capabilities: ['wire edm'] }], priority: 'normal' },
  ],
  machines: [
    { id: 'M1', capabilities: ['milling', '3-axis'] },
  ],
});

assert(t12.unscheduled.length === 1, 'T12.1: 1 unschedulable op');
assert(t12.unscheduled[0].reason.includes('wire edm'), 'T12.2: reason mentions capability');
assert(t12.metrics.unschedulable_operations === 1, 'T12.3: metrics tracks unschedulable');

// ============================================================================
// T13: MACHINE UTILIZATION ANALYSIS
// ============================================================================

console.log('\n=== T13: Machine utilization analysis ===');

// First create a schedule to analyze
const t13Sched = shopSchedule({
  jobs: [
    { id: 'J1', operations: [{ type: 'milling', estimated_time_min: 80 }], priority: 'normal' },
    { id: 'J2', operations: [{ type: 'milling', estimated_time_min: 20 }], priority: 'normal' },
  ],
  machines: ['M1', 'M2', 'M3'],
});

const t13 = machineUtilization({
  machines: ['M1', 'M2', 'M3'],
  schedule: t13Sched,
});

assert(t13.machines.length === 3, 'T13.1: 3 machines analyzed');
assert(t13.fleet_summary.total_machines === 3, 'T13.2: fleet total = 3');
assert(t13.fleet_summary.avg_utilization_pct >= 0, 'T13.3: avg utilization ≥ 0');

// At least one machine should be idle (we only have 2 jobs for 3 machines)
const idleMachines = t13.machines.filter((m) => m.status === 'idle');
assert(idleMachines.length >= 1, 'T13.4: at least 1 idle machine');

// Machine statuses should be valid
for (const m of t13.machines) {
  assert(
    ['overloaded', 'balanced', 'underutilized', 'idle'].includes(m.status),
    `T13.5: ${m.id} has valid status`
  );
}

// ============================================================================
// T14: MACHINE UTILIZATION WITH GENERATED SCHEDULE
// ============================================================================

console.log('\n=== T14: Machine utilization with generated schedule ===');

const t14 = machineUtilization({
  machines: ['M1', 'M2'],
  jobs: [
    { id: 'J1', operations: [{ type: 'milling', estimated_time_min: 50 }], priority: 'normal' },
    { id: 'J2', operations: [{ type: 'milling', estimated_time_min: 50 }], priority: 'normal' },
  ],
});

assert(t14.machines.length === 2, 'T14.1: 2 machines');
assert(t14.fleet_summary.avg_utilization_pct > 0, 'T14.2: utilization > 0 (schedule generated)');

// ============================================================================
// T15: BOTTLENECK DETECTION
// ============================================================================

console.log('\n=== T15: Bottleneck detection ===');

// Create scenario where one machine is heavily loaded
const t15 = shopSchedule({
  jobs: [
    { id: 'J1', operations: [{ type: 'turning', estimated_time_min: 50, required_capabilities: ['turning'] }], priority: 'normal' },
    { id: 'J2', operations: [{ type: 'turning', estimated_time_min: 50, required_capabilities: ['turning'] }], priority: 'normal' },
    { id: 'J3', operations: [{ type: 'turning', estimated_time_min: 50, required_capabilities: ['turning'] }], priority: 'normal' },
    { id: 'J4', operations: [{ type: 'milling', estimated_time_min: 10 }], priority: 'normal' },
  ],
  machines: [
    { id: 'Lathe', capabilities: ['turning', 'boring'] },
    { id: 'Mill', capabilities: ['milling', '3-axis'] },
  ],
});

// Lathe should be heavily loaded (150min total), Mill lightly (10min)
const lathe = t15.schedule.find((ms) => ms.machine === 'Lathe');
assert(lathe !== undefined, 'T15.1: Lathe in schedule');
assert(lathe!.assignments.length === 3, 'T15.2: 3 turning jobs on Lathe');
assert(lathe!.utilization_pct > 85, 'T15.3: Lathe is overloaded');
assert(t15.bottlenecks.length > 0, 'T15.4: bottleneck detected');
assert(t15.bottlenecks.some((b) => b.includes('Lathe')), 'T15.5: Lathe identified as bottleneck');

// ============================================================================
// T16: DISPATCHER FUNCTION
// ============================================================================

console.log('\n=== T16: Dispatcher function ===');

const t16a = shopScheduler('shop_schedule', {
  jobs: [{ id: 'J1', operations: [{ type: 'milling', estimated_time_min: 30 }], priority: 'normal' }],
  machines: ['M1'],
}) as any;

assert(t16a.schedule !== undefined, 'T16.1: shop_schedule returns schedule');
assert(t16a.metrics.total_makespan_min === 30, 'T16.2: makespan = 30');

const t16b = shopScheduler('machine_utilization', {
  machines: ['M1', 'M2'],
  schedule: t16a,
}) as any;

assert(t16b.machines.length === 2, 'T16.3: machine_utilization returns machines');

const t16c = shopScheduler('unknown_action', {}) as any;
assert(t16c.error !== undefined, 'T16.4: unknown action returns error');

// ============================================================================
// T17: LARGE SCHEDULE (20 JOBS, 8 MACHINES)
// ============================================================================

console.log('\n=== T17: Large schedule ===');

const t17Jobs = Array.from({ length: 20 }, (_, i) => ({
  id: `J${i + 1}`,
  operations: [
    { type: 'milling', estimated_time_min: 15 + (i % 5) * 10 },
    ...(i % 3 === 0 ? [{ type: 'milling', estimated_time_min: 10 + i }] : []),
  ],
  priority: (i < 3 ? 'rush' : i > 17 ? 'low' : 'normal') as 'rush' | 'normal' | 'low',
}));

const t17 = shopSchedule({
  jobs: t17Jobs,
  machines: Array.from({ length: 8 }, (_, i) => `M${i + 1}`),
  optimize_for: 'min_makespan',
});

assert(t17.metrics.total_jobs === 20, 'T17.1: 20 jobs');
const totalOps17 = t17Jobs.reduce((s, j) => s + j.operations.length, 0);
assert(t17.metrics.total_operations === totalOps17, 'T17.2: correct operation count');
assert(t17.metrics.unschedulable_operations === 0, 'T17.3: all schedulable');
assert(t17.metrics.total_makespan_min > 0, 'T17.4: makespan > 0');
assert(t17.metrics.average_utilization_pct > 0, 'T17.5: utilization > 0');

// ============================================================================
// T18: ALL RUSH PRIORITY
// ============================================================================

console.log('\n=== T18: All rush priority ===');

const t18 = shopSchedule({
  jobs: [
    { id: 'J1', operations: [{ type: 'milling', estimated_time_min: 30 }], priority: 'rush' },
    { id: 'J2', operations: [{ type: 'milling', estimated_time_min: 40 }], priority: 'rush' },
    { id: 'J3', operations: [{ type: 'milling', estimated_time_min: 20 }], priority: 'rush' },
  ],
  machines: ['M1', 'M2'],
});

assert(t18.metrics.total_jobs === 3, 'T18.1: 3 rush jobs');
assert(t18.metrics.unschedulable_operations === 0, 'T18.2: all scheduled');
// All should start at time 0 (rush priority, enough machines)
const rushStarts = t18.schedule.flatMap((ms) => ms.assignments).filter((a) => a.start_time_min === 0);
assert(rushStarts.length >= 2, 'T18.3: at least 2 jobs start at t=0');

// ============================================================================
// T19: NO DUE DATES
// ============================================================================

console.log('\n=== T19: No due dates ===');

const t19 = shopSchedule({
  jobs: [
    { id: 'J1', operations: [{ type: 'milling', estimated_time_min: 30 }], priority: 'normal' },
    { id: 'J2', operations: [{ type: 'milling', estimated_time_min: 45 }], priority: 'normal' },
  ],
  machines: ['M1'],
});

assert(t19.metrics.jobs_on_time === 2, 'T19.1: no due dates → all on time');
assert(t19.metrics.jobs_late === 0, 'T19.2: no late jobs');

// ============================================================================
// T20: MACHINEINPUT OBJECTS WITH EXPLICIT CAPABILITIES
// ============================================================================

console.log('\n=== T20: MachineInput objects with explicit capabilities ===');

const t20 = shopSchedule({
  jobs: [
    { id: 'J1', operations: [{ type: 'grinding', estimated_time_min: 60, required_capabilities: ['grinding'] }], priority: 'normal' },
    { id: 'J2', operations: [{ type: 'milling', estimated_time_min: 30 }], priority: 'normal' },
  ],
  machines: [
    { id: 'Grinder-1', capabilities: ['grinding'], hourly_rate: 120 },
    { id: 'Mill-1', capabilities: ['milling', '3-axis'], hourly_rate: 80 },
  ],
});

// Grinding job → Grinder, Milling job → Mill
const grinder = t20.schedule.find((ms) => ms.machine === 'Grinder-1');
assert(grinder !== undefined, 'T20.1: Grinder in schedule');
assert(grinder!.assignments.some((a) => a.job_id === 'J1'), 'T20.2: J1 on Grinder');

const mill = t20.schedule.find((ms) => ms.machine === 'Mill-1');
assert(mill !== undefined, 'T20.3: Mill in schedule');
assert(mill!.assignments.some((a) => a.job_id === 'J2'), 'T20.4: J2 on Mill');

assert(t20.safety.score >= 0.50, 'T20.5: safety score ≥ 0.50');

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(60));
if (failures.length > 0) {
  console.log(`R7-MS5 Shop Scheduler Engine Tests: ${passed} PASS, ${failed} FAIL (total ${passed + failed})`);
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
} else {
  console.log(`R7-MS5 Shop Scheduler Engine Tests: ${passed} PASS, ${failed} FAIL (total ${passed + failed})`);
}
console.log('='.repeat(60));

if (failed > 0) process.exit(1);
