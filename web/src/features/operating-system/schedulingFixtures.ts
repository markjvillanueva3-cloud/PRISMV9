import type { ScheduleResult } from '../../api/types';
import type {
  ScheduleReleaseCheck,
  ScheduleReleaseRecord,
  SchedulingStudyInputs,
  SchedulingStudyRecord,
  StudyExceptionRecord,
  StudyTone,
} from './contracts';

const SAMPLE_JOBSHOP_RESULT: ScheduleResult = {
  makespan: 280,
  utilization: 0.84,
  schedule: [
    { job_id: 'BRKT-01', machine: 'Mill 4', start: 0, end: 70 },
    { job_id: 'VALVE-22', machine: 'Lathe 2', start: 0, end: 54 },
    { job_id: 'IMP-07', machine: '5X-02', start: 0, end: 110 },
    { job_id: 'VALVE-22', machine: 'Mill 4', start: 74, end: 124 },
    { job_id: 'BRKT-01', machine: 'Inspect', start: 130, end: 162 },
    { job_id: 'IMP-07', machine: 'Inspect', start: 172, end: 214 },
    { job_id: 'BRKT-01', machine: 'Assembly', start: 214, end: 246 },
    { job_id: 'IMP-07', machine: 'Assembly', start: 246, end: 280 },
  ],
};

const SAMPLE_SINGLE_RESULT = {
  rule: 'wspt',
  sequence: ['J4', 'J2', 'J3', 'J1'],
};

const SAMPLE_JOHNSONS_RESULT = {
  sequence: ['J1', 'J3', 'J2', 'J4'],
  makespan: 31,
};

const SAMPLE_CPM_RESULT = {
  critical_path: ['A', 'B', 'D', 'E'],
  duration: 13,
};

const SINGLE_MACHINE_MINUTES: Record<string, number> = {
  J1: 10,
  J2: 5,
  J3: 8,
  J4: 3,
};

const JOHNSONS_TIMES: Record<string, { machine1: number; machine2: number }> = {
  J1: { machine1: 5, machine2: 8 },
  J2: { machine1: 9, machine2: 3 },
  J3: { machine1: 4, machine2: 7 },
  J4: { machine1: 7, machine2: 2 },
};

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function buildTimelineLanes(schedule: ScheduleResult['schedule']) {
  const machines = [...new Set(schedule.map((entry) => entry.machine))];
  return machines.map((machine) => {
    const blocks = schedule.filter((entry) => entry.machine === machine);
    const load = blocks.reduce((total, entry) => total + entry.end - entry.start, 0);

    return {
      id: `lane-${machine.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      machine,
      note: `${blocks.length} operations · ${load} min load`,
      blocks: blocks.map((entry, index) => ({
        id: `${machine}-${entry.job_id}-${entry.start}-${entry.end}-${index}`,
        jobId: entry.job_id,
        start: entry.start,
        end: entry.end,
      })),
    };
  });
}

function buildSingleLane(sequence: string[]) {
  let currentMinute = 0;
  return [
    {
      id: 'lane-bottleneck-cell',
      machine: 'Bottleneck Cell',
      note: 'Single-resource order with due-date discipline and release control.',
      blocks: sequence.map((jobId, index) => {
        const duration = SINGLE_MACHINE_MINUTES[jobId] ?? 6;
        const block = {
          id: `single-${jobId}-${currentMinute}-${index}`,
          jobId,
          start: currentMinute,
          end: currentMinute + duration,
        };
        currentMinute += duration;
        return block;
      }),
    },
  ];
}

function buildJohnsonsLanes(sequence: string[]) {
  let machine1Clock = 0;
  let machine2Clock = 0;
  const machine1Blocks: Array<{ id: string; jobId: string; start: number; end: number }> = [];
  const machine2Blocks: Array<{ id: string; jobId: string; start: number; end: number }> = [];

  sequence.forEach((jobId, index) => {
    const times = JOHNSONS_TIMES[jobId] ?? { machine1: 6, machine2: 6 };
    const machine1Start = machine1Clock;
    const machine1End = machine1Start + times.machine1;
    machine1Blocks.push({ id: `johnsons-m1-${jobId}-${index}`, jobId, start: machine1Start, end: machine1End });
    machine1Clock = machine1End;

    const machine2Start = Math.max(machine2Clock, machine1End);
    const machine2End = machine2Start + times.machine2;
    machine2Blocks.push({ id: `johnsons-m2-${jobId}-${index}`, jobId, start: machine2Start, end: machine2End });
    machine2Clock = machine2End;
  });

  return [
    { id: 'lane-machine-1', machine: 'Machine 1', note: 'Front-end load for Johnson sequencing.', blocks: machine1Blocks },
    { id: 'lane-machine-2', machine: 'Machine 2', note: 'Back-end handoff paced by completion from machine 1.', blocks: machine2Blocks },
  ];
}

export function buildScheduleReleaseRecord(input: {
  studyKey: string;
  tone: StudyTone;
  checks: ScheduleReleaseCheck[];
  exceptions: StudyExceptionRecord[];
}): ScheduleReleaseRecord {
  const criticalExceptions = input.exceptions.filter((item) => item.severity === 'critical');
  const riskExceptions = input.exceptions.filter((item) => item.severity === 'watch');
  const owner = input.studyKey === 'cpm' ? 'Program Management' : 'Planning';

  return {
    studyKey: input.studyKey,
    owner,
    publishSummary:
      criticalExceptions.length > 0
        ? 'Hold publish until critical blockers clear'
        : input.tone === 'loaded'
          ? 'Dispatch review ready'
          : 'Seeded study still needs live backend output',
    approvals: [
      {
        id: `${input.studyKey}-planner-approval`,
        label: 'Planner review',
        owner,
        status: criticalExceptions.length > 0 ? 'blocked' : input.tone === 'loaded' ? 'approved' : 'waiting',
        detail:
          criticalExceptions.length > 0
            ? criticalExceptions[0].detail
            : input.tone === 'loaded'
              ? 'Study posture is coherent enough to enter dispatch review.'
              : 'Planner should rerun against live backend payloads before publish.',
      },
      {
        id: `${input.studyKey}-dispatch-approval`,
        label: 'Dispatch acknowledgement',
        owner: 'Dispatch',
        status: criticalExceptions.length > 0 ? 'waiting' : riskExceptions.length > 0 ? 'ready' : 'approved',
        detail:
          riskExceptions.length > 0
            ? riskExceptions[0].detail
            : 'Dispatch can read the same release posture and next actions from this study.',
      },
    ],
    shortages:
      riskExceptions.length > 0
        ? riskExceptions.slice(0, 2).map((item, index) => ({
            id: `${input.studyKey}-release-shortage-${index}`,
            item: item.title,
            eta: item.severity === 'critical' ? 'Before publish' : 'Review this shift',
            severity: item.severity === 'critical' ? 'high' : 'watch',
            action: item.detail,
            owner,
          }))
        : [],
    checks: input.checks,
  };
}

function buildJobShopStudy(result: ScheduleResult | null): SchedulingStudyRecord {
  const live = Boolean(result);
  const source = result ?? SAMPLE_JOBSHOP_RESULT;
  const lanes = buildTimelineLanes(source.schedule);
  const bottleneckLane = lanes.reduce((current, lane) => {
    const laneLoad = lane.blocks.reduce((total, block) => total + block.end - block.start, 0);
    const currentLoad = current.blocks.reduce((total, block) => total + block.end - block.start, 0);
    return laneLoad > currentLoad ? lane : current;
  }, lanes[0]);
  const sortedOperations = [...source.schedule].sort((left, right) => left.start - right.start);
  const exceptions: StudyExceptionRecord[] = [
    {
      id: 'jobshop-bottleneck',
      title: `${bottleneckLane?.machine ?? 'Primary machine'} remains the gating resource`,
      detail:
        source.utilization >= 0.88
          ? 'The current routing is saturating the lead machine. Review changeovers and alternate capacity before release.'
          : 'The loaded board is still paced by one machine, but there is enough headroom to publish with a review checkpoint.',
      severity: source.utilization >= 0.88 ? 'critical' : 'watch',
    },
    {
      id: 'jobshop-source',
      title: live ? 'Live schedule loaded from solver' : 'Sample study still seeded',
      detail:
        live
          ? 'Use the exception lane to validate shortage, setup, and operator assumptions before dispatch posts the plan.'
          : 'Run the backend job-shop solver to replace seeded queue assumptions with real machine sequencing.',
      severity: 'info',
    },
    {
      id: 'jobshop-dispatch-handoff',
      title: 'Dispatch handoff should stay attached to the board',
      detail: 'Scheduling should keep release notes, shortage holds, and publish readiness beside the selected study instead of in a separate admin page.',
      severity: 'watch',
    },
  ];
  const checks: ScheduleReleaseCheck[] = [
    { id: 'material-cleared', label: 'Material cleared', detail: 'Shortage and kit status are confirmed for the next release window.' },
    { id: 'operator-ready', label: 'Operator ready', detail: 'Fixtures, setup docs, and staffing are aligned for the pacing machine.' },
    { id: 'dispatch-reviewed', label: 'Dispatch reviewed', detail: 'Dispatch agrees the board can publish without hidden queue conflicts.' },
  ];

  return {
    key: 'jobshop',
    label: 'Job Shop',
    detail: 'Multi-machine routing and makespan posture.',
    tone: live ? (source.utilization >= 0.88 ? 'watch' : 'loaded') : 'ready',
    statusLabel: live ? 'Loaded live board' : 'Sample board ready',
    postureValue: `${source.makespan} min makespan`,
    bottleneckValue: bottleneckLane?.machine ?? 'Pending bottleneck',
    publishValue: live ? 'Ready for dispatch review' : 'Run solver before publish',
    boardTitle: 'Machine lanes',
    boardSubtitle: 'Planner-facing machine board with bottleneck, flow, and sequence kept in one visual surface.',
    metrics: [
      { id: 'jobshop-makespan', label: 'Makespan', value: `${source.makespan} min`, hint: 'Total elapsed duration for the active machine plan.' },
      { id: 'jobshop-utilization', label: 'Utilization', value: `${(source.utilization * 100).toFixed(1)}%`, hint: `${bottleneckLane?.machine ?? 'Lead machine'} is pacing the board.`, accent: 'from-sky-400/22 via-sky-300/8 to-transparent' },
      { id: 'jobshop-operations', label: 'Operations', value: String(source.schedule.length), hint: 'Discrete assignments kept in the active schedule study.', accent: 'from-amber-300/22 via-amber-200/8 to-transparent' },
    ],
    exceptions,
    plannerActions: [
      { id: 'jobshop-lock-changeovers', title: 'Lock changeovers on the bottleneck', detail: 'Freeze setup-sensitive jobs first so dispatch does not churn the pacing resource.' },
      { id: 'jobshop-shortage-kits', title: 'Push shortage kits to the prep lane', detail: 'Keep shortages visible beside machine time so planners do not release work that cannot actually start.' },
      { id: 'jobshop-publish-gate', title: 'Publish the board with a review gate', detail: 'Send the plan only after the board, exception lane, and traveler assumptions agree.' },
    ],
    sequence: sortedOperations.slice(0, 6).map((entry, index) => ({
      id: `jobshop-sequence-${entry.job_id}-${entry.machine}-${entry.start}-${index}`,
      label: entry.job_id,
      detail: `${entry.machine} · ${entry.start}-${entry.end} min`,
      badge: `${entry.end - entry.start} min`,
    })),
    machineLanes: lanes,
    release: buildScheduleReleaseRecord({ studyKey: 'jobshop', tone: live ? (source.utilization >= 0.88 ? 'watch' : 'loaded') : 'ready', checks, exceptions }),
    payload: result,
    payloadLabel: 'Job-shop payload',
    inspectorNote: 'Job shop should be the planner default when multiple machines, traveler steps, and dispatch risk all matter at once.',
  };
}

function buildSingleMachineStudy(result: unknown): SchedulingStudyRecord {
  const live = Boolean(result);
  const source = toRecord(result) ?? SAMPLE_SINGLE_RESULT;
  const sequence = toStringArray(source.sequence).length > 0 ? toStringArray(source.sequence) : SAMPLE_SINGLE_RESULT.sequence;
  const rule = typeof source.rule === 'string' ? source.rule : SAMPLE_SINGLE_RESULT.rule;
  const lanes = buildSingleLane(sequence);
  const totalMinutes = lanes[0].blocks.reduce((total, block) => total + block.end - block.start, 0);
  const exceptions: StudyExceptionRecord[] = [
    { id: 'single-first-release', title: 'First release controls the rest of the queue', detail: `${sequence[0] ?? 'The lead job'} should be staged and material-cleared before planners trust the downstream order.`, severity: 'watch' },
    { id: 'single-dispatch-ack', title: 'Weighted sequence needs dispatch acknowledgement', detail: 'Single-machine output is useful only if dispatch can see what got pushed back and why.', severity: 'info' },
  ];
  const checks: ScheduleReleaseCheck[] = [
    { id: 'queue-staged', label: 'Queue staged', detail: 'The lead and follow-on jobs are staged together at the constrained cell.' },
    { id: 'due-dates-reviewed', label: 'Due dates reviewed', detail: 'Latest rush inserts and promised dates are reflected in the active order.' },
    { id: 'dispatch-briefed', label: 'Dispatch briefed', detail: 'Dispatch understands what got moved and why before the queue is released.' },
  ];

  return {
    key: 'single',
    label: 'Single Machine',
    detail: 'Sequence jobs on one constrained resource.',
    tone: live ? 'loaded' : 'ready',
    statusLabel: live ? `${rule.toUpperCase()} loaded` : 'Queue template ready',
    postureValue: `${sequence.length} jobs in release order`,
    bottleneckValue: sequence[0] ?? 'Awaiting queue',
    publishValue: live ? 'Release first two jobs' : 'Run sequence study',
    boardTitle: 'Single-resource order',
    boardSubtitle: 'One constrained cell with clearer release sequencing, due posture, and planner notes.',
    metrics: [
      { id: 'single-rule', label: 'Rule', value: rule.toUpperCase(), hint: 'Current single-machine scheduling discipline.' },
      { id: 'single-queue-depth', label: 'Queue depth', value: String(sequence.length), hint: 'Jobs currently visible in the bottleneck queue.', accent: 'from-sky-400/22 via-sky-300/8 to-transparent' },
      { id: 'single-load', label: 'Load', value: `${totalMinutes} min`, hint: 'Approximate queue minutes held by the current order.', accent: 'from-amber-300/22 via-amber-200/8 to-transparent' },
    ],
    exceptions,
    plannerActions: [
      { id: 'single-release-first-two', title: 'Release the first two jobs together', detail: 'Avoid starving the cell by staging the opener and the immediate follow-up at the same time.' },
      { id: 'single-recheck-dates', title: 'Re-check due dates after insertions', detail: 'Any rush insert changes the weighted order, so planners should rerun before publishing.' },
      { id: 'single-show-queue', title: 'Show the queue to dispatch, not just the rule', detail: 'Operators need the visible order and the reason it changed, not only the algorithm name.' },
    ],
    sequence: sequence.map((jobId, index) => ({
      id: `single-sequence-${jobId}-${index}`,
      label: `${index + 1}. ${jobId}`,
      detail: index === 0 ? 'Release first' : index === sequence.length - 1 ? 'Tail of queue' : 'Mid-queue hold',
      badge: `${SINGLE_MACHINE_MINUTES[jobId] ?? 6} min`,
    })),
    machineLanes: lanes,
    release: buildScheduleReleaseRecord({ studyKey: 'single', tone: live ? 'loaded' : 'ready', checks, exceptions }),
    payload: result,
    payloadLabel: 'Single-machine payload',
    inspectorNote: 'Use this lane when the bottleneck is truly one resource and planners need a simple, defensible release order.',
  };
}

function buildJohnsonsStudy(result: unknown): SchedulingStudyRecord {
  const live = Boolean(result);
  const source = toRecord(result) ?? SAMPLE_JOHNSONS_RESULT;
  const sequence = toStringArray(source.sequence).length > 0 ? toStringArray(source.sequence) : SAMPLE_JOHNSONS_RESULT.sequence;
  const lanes = buildJohnsonsLanes(sequence);
  const makespan = toNumber(source.makespan, SAMPLE_JOHNSONS_RESULT.makespan);
  const exceptions: StudyExceptionRecord[] = [
    { id: 'johnsons-machine2-idle', title: 'Machine 2 idle pockets need review', detail: 'Johnson ordering reduces makespan, but planners still need to watch where the downstream machine waits on upstream completion.', severity: 'watch' },
    { id: 'johnsons-real-bottleneck', title: 'Compare against the actual shop bottleneck', detail: 'Do not publish a two-machine sequence unless it still respects the real bottleneck board and shortage posture.', severity: 'info' },
  ];
  const checks: ScheduleReleaseCheck[] = [
    { id: 'flow-validated', label: 'Flow validated', detail: 'Machine 1 and 2 handoffs make sense against the actual queue.' },
    { id: 'handoff-owner-set', label: 'Handoff owner set', detail: 'Ownership for the downstream handoff is visible before release.' },
    { id: 'dispatch-compare-done', label: 'Dispatch compare done', detail: 'The study has been compared against the live dispatch board.' },
  ];

  return {
    key: 'johnsons',
    label: "Johnson's Rule",
    detail: 'Two-machine flow-shop ordering in one click.',
    tone: live ? 'loaded' : 'ready',
    statusLabel: live ? 'Flow-shop order loaded' : 'Two-machine template ready',
    postureValue: `${makespan} min flow`,
    bottleneckValue: 'Machine 2 handoff',
    publishValue: live ? 'Compare against single-machine queue' : 'Run Johnson study',
    boardTitle: 'Two-machine handoff board',
    boardSubtitle: 'Flow-shop order should highlight where machine two waits, not hide that handoff in raw payloads.',
    metrics: [
      { id: 'johnsons-makespan', label: 'Makespan', value: `${makespan} min`, hint: 'Total duration for the current two-machine sequence.' },
      { id: 'johnsons-sequence', label: 'Sequence', value: `${sequence[0] ?? 'TBD'} lead`, hint: 'Front-loaded job in the current Johnson order.', accent: 'from-sky-400/22 via-sky-300/8 to-transparent' },
      { id: 'johnsons-handoffs', label: 'Handoffs', value: String(sequence.length), hint: 'Parts moving through the two-machine path.', accent: 'from-amber-300/22 via-amber-200/8 to-transparent' },
    ],
    exceptions,
    plannerActions: [
      { id: 'johnsons-watch-machine2', title: 'Watch Machine 2 idle pockets', detail: 'Use the board to see where downstream time still waits on upstream completion.' },
      { id: 'johnsons-compare-release', title: 'Compare release options', detail: 'Johnson output should be compared against the actual queue before publish.' },
      { id: 'johnsons-explain-order', title: 'Explain the order to dispatch', detail: 'Dispatch should understand the reason the two-machine handoff changed.' },
    ],
    sequence: sequence.map((jobId, index) => ({
      id: `johnsons-sequence-${jobId}-${index}`,
      label: `${index + 1}. ${jobId}`,
      detail: index === 0 ? 'Lead flow job' : index === sequence.length - 1 ? 'Tail of flow' : 'Mid-flow handoff',
      badge: `${(JOHNSONS_TIMES[jobId]?.machine1 ?? 6) + (JOHNSONS_TIMES[jobId]?.machine2 ?? 6)} min`,
    })),
    machineLanes: lanes,
    release: buildScheduleReleaseRecord({ studyKey: 'johnsons', tone: live ? 'loaded' : 'ready', checks, exceptions }),
    payload: result,
    payloadLabel: 'Johnson payload',
    inspectorNote: 'Johnson sequencing matters when the planner is balancing an upstream and downstream machine as one visible flow.',
  };
}

function buildCpmStudy(result: unknown): SchedulingStudyRecord {
  const live = Boolean(result);
  const source = toRecord(result) ?? SAMPLE_CPM_RESULT;
  const criticalPath = toStringArray(source.critical_path).length > 0 ? toStringArray(source.critical_path) : SAMPLE_CPM_RESULT.critical_path;
  const duration = toNumber(source.duration, SAMPLE_CPM_RESULT.duration);
  const exceptions: StudyExceptionRecord[] = [
    { id: 'cpm-approvals-block', title: 'Approvals can silently block release', detail: 'CPM should keep dependency ownership visible so the schedule board shows why the next job cannot start yet.', severity: 'critical' },
    { id: 'cpm-explain-risk', title: 'Use CPM to explain risk, not replace dispatch', detail: 'Dependency risk belongs beside the schedule board so planners can see which gate blocks release.', severity: 'watch' },
  ];
  const checks: ScheduleReleaseCheck[] = [
    { id: 'owner-assigned', label: 'Owner assigned', detail: 'Every blocking node has a visible owner and next action time.' },
    { id: 'approval-cleared', label: 'Approval cleared', detail: 'Critical approvals are confirmed before the release date is trusted.' },
    { id: 'gate-cadence-set', label: 'Gate cadence set', detail: 'Review timing is posted so blocked work cannot stall silently.' },
  ];

  return {
    key: 'cpm',
    label: 'CPM',
    detail: 'Critical path visibility for linked operations.',
    tone: live ? 'loaded' : 'ready',
    statusLabel: live ? 'Critical path loaded' : 'Dependency map ready',
    postureValue: `${duration} day path`,
    bottleneckValue: criticalPath[criticalPath.length - 1] ?? 'Release gate',
    publishValue: live ? 'Escalate blocked owner' : 'Run CPM study',
    boardTitle: 'Critical path chain',
    boardSubtitle: 'Dependency risk belongs beside the schedule board so planners can see which gate blocks release.',
    metrics: [
      { id: 'cpm-duration', label: 'Critical duration', value: `${duration} days`, hint: 'Total time held by the current critical path.' },
      { id: 'cpm-nodes', label: 'Critical nodes', value: String(criticalPath.length), hint: 'Dependency gates still pacing the project release.', accent: 'from-sky-400/22 via-sky-300/8 to-transparent' },
      { id: 'cpm-last-gate', label: 'Last gate', value: criticalPath[criticalPath.length - 1] ?? 'Pending', hint: 'Final dependency before the schedule can clear.', accent: 'from-amber-300/22 via-amber-200/8 to-transparent' },
    ],
    exceptions,
    plannerActions: [
      { id: 'cpm-assign-owner', title: 'Assign owners to blocking gates', detail: 'Every blocked node should show who clears it and when.' },
      { id: 'cpm-review-approval', title: 'Review approval posture', detail: 'Keep release confidence tied to actual approvals instead of optimistic dates.' },
      { id: 'cpm-communicate-risk', title: 'Communicate the blocking chain', detail: 'Explain the critical path to dispatch and operations in plain language.' },
    ],
    sequence: criticalPath.map((step, index) => ({
      id: `cpm-sequence-${step}-${index}`,
      label: `${index + 1}. ${step}`,
      detail: index === criticalPath.length - 1 ? 'Final release gate' : 'Must clear before the next step can start',
      badge: index === 0 ? 'Start' : index === criticalPath.length - 1 ? 'Finish' : 'Gate',
    })),
    machineLanes: [],
    release: buildScheduleReleaseRecord({ studyKey: 'cpm', tone: live ? 'loaded' : 'ready', checks, exceptions }),
    payload: result,
    payloadLabel: 'CPM payload',
    inspectorNote: 'CPM earns its place when it makes blocked ownership obvious for the same people who own the schedule board.',
  };
}

export function buildSchedulingStudies(inputs: SchedulingStudyInputs): SchedulingStudyRecord[] {
  return [
    buildJobShopStudy(inputs.jobShopResult),
    buildSingleMachineStudy(inputs.singleResult),
    buildJohnsonsStudy(inputs.johnsonsResult),
    buildCpmStudy(inputs.cpmResult),
  ];
}
