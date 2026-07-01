export const meta = {
  name: 'hermes-multiwave-build',
  description: 'C1 runtime driver: feasibility-gate a decomposed fan-out plan via project_governed_schedule, then DRIVE it wave-by-wave through wave_loop_step -- spawning governed builder agents per wave until the DAG drains. The agent-spawning executor that sits on top of the ZuluWaveSchedulerEngine cores (slot:bravo).',
  whenToUse: 'When a parent goal is ALREADY decomposed into a FanoutPlanRequest (subtasks + deps + candidates) and you want the multi-wave build to actually RUN -- autonomous, governed, resumable. Operator-invoked (it builds + commits code via fan-out). Pass args:{request, souls, unit_id}.',
  phases: [
    { title: 'Feasibility', detail: 'project_governed_schedule -> gate on drains (refuse to spawn into a stall)' },
    { title: 'Build', detail: 'wave_loop_step drives each governed wave; one builder agent per assignment' },
  ],
};

// ---------------------------------------------------------------------------
// C1 MULTI-WAVE BUILD EXECUTOR (U-WAVE-EXECUTOR, slot:bravo).
//
// This is the agent-spawning EXECUTOR that "actually runs" autonomous multi-wave
// building -- the piece on top of the deterministic cores shipped this session:
//   - project_governed_schedule (8d816e44d0): the UPFRONT feasibility check.
//   - wave_loop_step (resumable governed wave step, survives /compact).
//   - governedNextWave / nextWaveAssignments / allWaves (the scheduler).
//
// WHY a Workflow (not a dispatcher): a synchronous MCP dispatcher CANNOT spawn +
// await subagents. Only a harness (this Workflow, or a chat /loop) can. The script
// body cannot call MCP dispatchers directly -- an agent() invokes them via ToolSearch.
//
// SAFETY (governed-by-construction):
//   1. FEASIBILITY GATE -- if project_governed_schedule says the DAG cannot drain
//      under current souls/delegation authority (a vetoed/unrouted subtask), we
//      REFUSE to spawn and return the `stalled` set for the operator to fix. No
//      agent is launched into a plan that provably cannot complete.
//   2. PER-WAVE GOVERNANCE -- wave_loop_step applies the ZuluFleetGovernor authority
//      check + the C4 delegation pre-gate to EVERY assignment before it is emitted,
//      so a wave never dispatches an unauthorized agent (not fleet-control: the gate
//      narrows, never widens, and is operator-granted via the delegation store).
//   3. EACH BUILDER AGENT carries the PRISM build discipline (real R9 tests +
//      per-file 2-arm scrutiny + [MAIN-FORCE] slot commit) in its prompt -- the
//      fan-out does not bypass the gates a hand-built unit honors.
//   4. BOUNDED -- the wave loop runs at most (total_subtasks + 2) iterations; each
//      productive wave completes >=1 subtask, so it converges (no runaway).
// ---------------------------------------------------------------------------

const a = args || {};
const request = a.request;
const souls = a.souls || {};
const unitId = a.unit_id || a.unitId || 'hermes-multiwave-build';

if (!request || !Array.isArray(request.subtasks) || request.subtasks.length === 0) {
  log('hermes-multiwave-build: no FanoutPlanRequest in args.request (need {parent_task_id, subtasks, candidates, max_parallel}). Decompose the goal first, then re-invoke.');
  return { built: false, reason: 'no-request' };
}

const SCHED_SCHEMA = {
  type: 'object',
  required: ['drains', 'dispatched_count', 'total_subtasks', 'wave_count'],
  properties: {
    drains: { type: 'boolean' },
    dispatched_count: { type: 'number' },
    total_subtasks: { type: 'number' },
    wave_count: { type: 'number' },
    stalled: { type: 'array', items: { type: 'string' } },
  },
};

const WAVE_SCHEMA = {
  type: 'object',
  required: ['done', 'wave_assignments', 'completed_ids'],
  properties: {
    done: { type: 'boolean' },
    completed_ids: { type: 'array', items: { type: 'string' } },
    wave_assignments: {
      type: 'array',
      items: {
        type: 'object',
        required: ['subtask_id', 'slot'],
        properties: { subtask_id: { type: 'string' }, slot: { type: 'string' }, description: { type: 'string' } },
      },
    },
  },
};

const BUILD_SCHEMA = {
  type: 'object',
  required: ['subtask_id', 'completed'],
  properties: {
    subtask_id: { type: 'string' },
    completed: { type: 'boolean' },
    commit: { type: 'string' },
    note: { type: 'string' },
  },
};

// Independent commit-verification: a builder's self-reported completed flag is NOT trusted to
// advance the dependency DAG (a false completed:true would dispatch dependents atop unbuilt work
// AND report a false done -- R12). A separate read-only agent confirms each claimed commit actually
// resolves before its subtask_id is fed back as completed.
const VERIFY_SCHEMA = {
  type: 'object',
  required: ['verified_subtask_ids'],
  properties: { verified_subtask_ids: { type: 'array', items: { type: 'string' } } },
};

const reqJson = JSON.stringify(request);
const soulsJson = JSON.stringify(souls);

// ---- Phase 1: FEASIBILITY GATE -------------------------------------------------
phase('Feasibility');
const sched = await agent(
  `Invoke the MCP tool prism_session with action "project_governed_schedule" and params ` +
  `{ "request": ${reqJson}, "souls": ${soulsJson} }. The dispatcher returns { success, schedule }. ` +
  `Return ONLY the top-level \`schedule\` object (its drains, dispatched_count, total_subtasks, wave_count, and stalled fields).`,
  { label: 'project-governed-schedule', phase: 'Feasibility', schema: SCHED_SCHEMA },
);

if (!sched || sched.drains !== true) {
  const stalled = (sched && sched.stalled) || [];
  log(`hermes-multiwave-build: plan does NOT drain under current authority -- REFUSING to spawn. ` +
      `stalled=${JSON.stringify(stalled)}. Fix soul/candidate authority for those subtasks (or grant delegation), then re-invoke.`);
  return { built: false, reason: 'stalled', stalled, schedule: sched || null };
}
log(`hermes-multiwave-build: feasibility OK -- ${sched.total_subtasks} subtasks across ${sched.wave_count} governed wave(s) will drain. Driving the build.`);

// ---- Phase 2: DRIVE the build wave-by-wave via wave_loop_step ------------------
phase('Build');
const maxIters = (Number(sched.total_subtasks) || 0) + 2; // each productive wave verifies >=1 -> bounded
const descById = {};
for (const s of request.subtasks) descById[s.subtask_id] = s.description;
const verifiedIds = new Set(); // subtask_ids whose builder commit was INDEPENDENTLY verified
const built = [];              // every builder self-report, for the audit summary
let done = false;

for (let i = 0; i < maxIters && !done; i++) {
  // Governed next wave (resumable + checkpointed). Feed back ONLY commit-verified completions so the
  // DAG never advances atop an unverified (possibly uncommitted) subtask. wave_loop_step returns
  // { success, execution:{ done, wave_assignments:[{subtask_id,slot}] }, completed_ids }.
  const newlyJson = JSON.stringify([...verifiedIds]);
  const wave = await agent(
    `Invoke the MCP tool prism_session with action "wave_loop_step" and params ` +
    `{ "unit_id": ${JSON.stringify(unitId)}, "request": ${reqJson}, "souls": ${soulsJson}, ` +
    `"newly_completed": ${newlyJson} }. The dispatcher returns { success, execution, completed_ids }. ` +
    `Return ONLY: execution.done as \`done\`, top-level \`completed_ids\`, and execution.wave_assignments ` +
    `as \`wave_assignments\` ([{subtask_id, slot}]).`,
    { label: `wave-${i}-step`, phase: 'Build', schema: WAVE_SCHEMA },
  );

  done = !!(wave && wave.done);
  const assignments = (wave && wave.wave_assignments) || [];
  if (done) { log(`hermes-multiwave-build: all waves drained (done) after ${i} wave(s); verified=${verifiedIds.size}/${sched.total_subtasks}.`); break; }
  if (assignments.length === 0) {
    log(`hermes-multiwave-build: wave ${i} dispatched nothing while not done -- stopping (governance/throttle held the remaining). verified=${verifiedIds.size}/${sched.total_subtasks}.`);
    break;
  }

  // Spawn ONE governed builder per assignment (parallel). Each carries the PRISM build discipline.
  const results = await parallel(assignments.map((asg) => () =>
    agent(
      `You are slot ${asg.slot}, a PRISM builder agent in a governed multi-wave fan-out (unit ${unitId}).\n` +
      `BUILD this subtask end-to-end: "${descById[asg.subtask_id] || asg.subtask_id}" (subtask_id ${asg.subtask_id}).\n` +
      `Honor PRISM discipline EXACTLY: real R9 reference-value/invariant tests (no toBeDefined stubs); ` +
      `per-file 2-arm scrutiny; physics constants imported from src/physics/constants.ts; ascii-only in code; ` +
      `commit "[MAIN-FORCE] [HERMES-WAVE]/${asg.subtask_id} (slot:${asg.slot}): <title>" to slot/${asg.slot}, staging ONLY your own files. ` +
      `If you cannot complete it cleanly, do NOT fake it -- report completed:false with the reason (R12).\n` +
      `Return { subtask_id, completed, commit (the FULL sha you committed), note }.`,
      { label: `build:${asg.subtask_id}@${asg.slot}`, phase: 'Build', schema: BUILD_SCHEMA },
    ).then((r) => (r && r.subtask_id) ? r : { subtask_id: asg.subtask_id, completed: false, note: 'agent returned null' })
  ));
  for (const r of results.filter(Boolean)) built.push(r);

  // INDEPENDENT VERIFICATION (P1): a builder self-report is NOT trusted to advance the DAG. Only
  // completions whose claimed commit actually RESOLVES (read-only git check) are fed back as done --
  // so a false completed:true can never dispatch dependents atop unbuilt work or report a false done.
  const claims = results.filter((r) => r && r.completed && r.commit)
    .map((r) => ({ subtask_id: r.subtask_id, slot: r.slot, commit: r.commit }));
  let waveVerified = [];
  if (claims.length > 0) {
    const v = await agent(
      `Read-only VERIFY of builder commit claims (modify NOTHING). For each claim, confirm via git that ` +
      `the commit SHA resolves AND its subject references the subtask_id. Claims: ${JSON.stringify(claims)}. ` +
      `Return { verified_subtask_ids } -- ONLY the subtask_ids whose commit genuinely resolves.`,
      { label: `verify-wave-${i}`, phase: 'Build', schema: VERIFY_SCHEMA },
    );
    waveVerified = (v && Array.isArray(v.verified_subtask_ids)) ? v.verified_subtask_ids : [];
  }
  for (const id of waveVerified) verifiedIds.add(id);

  log(`hermes-multiwave-build: wave ${i} -- ${assignments.length} dispatched, ${claims.length} claimed, ${waveVerified.length} commit-verified (cumulative ${verifiedIds.size}/${sched.total_subtasks}).`);
  // Zero VERIFIED progress on a non-empty wave -> re-offering the same assignments would spin. Stop +
  // surface (R12) rather than burn iterations or advance the DAG on unverified self-reports.
  if (waveVerified.length === 0) { log(`hermes-multiwave-build: wave ${i} produced NO commit-verified completions -- stopping (assignments could not be built+committed; inspect + re-invoke).`); break; }
}

// Summary: a subtask is BUILT iff its commit was independently verified. Dedupe by subtask_id, and
// exclude from `unbuilt` any id that verified on a LATER wave (a builder may fail wave k, succeed k+1).
const seenC = new Set();
const commits = [];
for (const b of built) { if (verifiedIds.has(b.subtask_id) && !seenC.has(b.subtask_id)) { seenC.add(b.subtask_id); commits.push({ subtask_id: b.subtask_id, commit: b.commit || null }); } }
const seenU = new Set();
const unbuilt = [];
for (const b of built) { if (!verifiedIds.has(b.subtask_id) && !seenU.has(b.subtask_id)) { seenU.add(b.subtask_id); unbuilt.push({ subtask_id: b.subtask_id, note: b.note || null }); } }
return {
  built: verifiedIds.size > 0,
  done,
  total_subtasks: sched.total_subtasks,
  completed_count: verifiedIds.size,
  commits,
  unbuilt,
};
