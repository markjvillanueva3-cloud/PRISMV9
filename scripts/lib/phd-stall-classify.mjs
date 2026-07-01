// scripts/lib/phd-stall-classify.mjs
// FLEET-PHD-CONTINUITY (U-PHD-DRIVER, slot:zulu, 2026-06-27)
// Pure stall classifier for a single domain. NO I/O: the orchestrator computes the
// `joins` (task health, commits, artifact mtime, loop tick) and passes them in, so
// every branch is unit-testable. classifyDomain(plan, joins, opts) returns
// { status, reason, nextAction, acceptance }.
//
// status precedence ladder (first match wins), per FLEET-PHD-CONTINUITY spec 4b:
//   blocked:elevation  -> operator-gated task not firing (xray OCR); NOT fleet inaction
//   done               -> plan final/shipped AND acceptance artifact present + fresh
//   advancing          -> a positive signal (recent commits / loop tick / healthy+fresh)
//                         -- this RESCUES a domain whose task/artifact looks stale
//   stalled:cron-dead  -> the named deepening task is stale/failing/never-ran/spec-only
//   stalled:artifact-stale -> acceptance output mtime > artifactMult x cadence
//   stalled:no-progress -> draft, no commits, no loop tick (or no positive signal at all)

export const DEFAULTS = Object.freeze({
  noProgressHrs: 72, // window for "no commits to galaxy_dir"
  artifactMult: 2, // artifact is stale past this many x its stated cadence
  loopTickHrs: 24, // a loop tick within this many hours counts as advancing
});

const FINAL_STATUSES = new Set(["final", "shipped", "done", "complete"]);
const DEAD_TASK = new Set(["stale", "failing", "never-ran", "spec-only"]);

function mk(status, reason, nextAction, acceptance) {
  return { status, reason, nextAction, acceptance };
}

/** Map plan.acceptanceTargets against any known current values in joins.acceptanceCurrent. */
function computeAcceptance(plan, joins) {
  const current = (joins && joins.acceptanceCurrent) || {};
  const targets = (plan && plan.acceptanceTargets) || [];
  return targets.map((t) => {
    const cur = current[t.metric];
    let met = null;
    if (cur != null && Number.isFinite(cur)) {
      if (t.comparator === ">=") met = cur >= t.value;
      else if (t.comparator === "<=") met = cur <= t.value;
      else if (t.comparator === ">") met = cur > t.value;
      else if (t.comparator === "<") met = cur < t.value;
    }
    return { metric: t.metric, comparator: t.comparator, target: t.value, unit: t.unit || "", current: cur ?? null, met };
  });
}

function nextDeepen(plan, acceptance) {
  const slot = (plan && plan.slot) || "<slot>";
  const unmet = acceptance.find((a) => a.met === false);
  if (unmet) return `deepen ${unmet.metric} to ${unmet.comparator} ${unmet.target}${unmet.unit} (now ${unmet.current})`;
  if (acceptance.length) {
    const a = acceptance[0];
    return `advance ${a.metric} toward ${a.comparator} ${a.target}${a.unit}`;
  }
  return `run /checkin-${slot} /loop on DOMAIN-PLAN-${slot} section 3`;
}

function nextRegister(joins, plan) {
  if (joins && joins.taskName) {
    return `re-kick/register deepening task "${joins.taskName}" (Start-ScheduledTask or its install .ps1)`;
  }
  return `register a nightly deepening cron for the ${(plan && plan.galaxy) || "domain"} galaxy`;
}

export function classifyDomain(plan, joins, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const status = ((plan && plan.status) || "unknown").toLowerCase();
  const j = joins || {};
  const ts = j.taskStatus || null;
  const acceptance = computeAcceptance(plan, j);
  const isFinal = FINAL_STATUSES.has(status);
  const commits = j.commits72h || 0;

  const artifactFresh =
    j.artifactPresent === true &&
    (j.artifactAgeHrs == null || j.cadenceHrs == null || j.artifactAgeHrs <= o.artifactMult * j.cadenceHrs);
  const artifactStale =
    j.artifactPresent === true &&
    j.artifactAgeHrs != null &&
    j.cadenceHrs != null &&
    j.artifactAgeHrs > o.artifactMult * j.cadenceHrs;
  // A loop-deepened domain (e.g. frontend-app) has NO scheduled deepening task by design --
  // it deepens via per-slot /loop page-build, not a galaxy mine. A missing/spec-only task is
  // therefore NOT a dead cron for it ("register a cron" is the wrong remedy); judge it on
  // commits/loop-tick/artifact like any other domain instead.
  const taskDead = DEAD_TASK.has(ts) && !j.loopDeepened;
  const loopFresh = j.loopTickHrs != null && j.loopTickHrs <= o.loopTickHrs;
  const advancing = commits > 0 || loopFresh || (ts === "healthy" && artifactFresh);

  // 1. operator-gated -- surfaced to operator, never counted as fleet inaction
  if (ts === "elevation-blocked") {
    return mk(
      "blocked:elevation",
      `${j.taskName || "deepening task"} requires operator elevation; not firing`,
      `operator: re-register "${j.taskName || "the task"}" from an elevated shell`,
      acceptance
    );
  }
  // 2. done -- final AND its acceptance output is present + fresh
  if (isFinal && artifactFresh) {
    return mk("done", "plan final and acceptance artifact present + fresh", "deepening steady-state; monitor only", acceptance);
  }
  // 3. advancing rescues a domain whose task/artifact looks stale (adversarial case)
  if (advancing) {
    const why =
      commits > 0
        ? `${commits} commit(s) to ${j.commitDir || plan.galaxyDir} in window`
        : loopFresh
          ? `loop tick ${Math.round(j.loopTickHrs)}h ago`
          : `task ${j.taskName} healthy + artifact fresh`;
    return mk("advancing", why, nextDeepen(plan, acceptance), acceptance);
  }
  // 4. final but its acceptance artifact is missing/stale -> NOT done; stalled on its own output
  if (isFinal) {
    return mk(
      "stalled:artifact-stale",
      `plan ${status} but acceptance artifact ${j.artifactPresent ? "stale" : "missing"}`,
      nextDeepen(plan, acceptance),
      acceptance
    );
  }
  // 5. the named deepening task is dead / spec-only (no advancing signal rescued it)
  if (taskDead) {
    return mk(
      "stalled:cron-dead",
      j.taskName ? `${j.taskName} is ${ts}` : "no registered deepening task (spec-only)",
      nextRegister(j, plan),
      acceptance
    );
  }
  // 6. acceptance output is stale past its cadence
  if (artifactStale) {
    return mk(
      "stalled:artifact-stale",
      `acceptance artifact ${Math.round(j.artifactAgeHrs)}h old > ${o.artifactMult}x cadence ${j.cadenceHrs}h`,
      nextDeepen(plan, acceptance),
      acceptance
    );
  }
  // 7. draft with no movement, or simply no positive signal anywhere
  return mk(
    "stalled:no-progress",
    status === "draft"
      ? `draft, 0 commits to ${j.commitDir || plan.galaxyDir} in ${o.noProgressHrs}h, no loop tick`
      : "no advancing signal (no commits, no loop tick, no healthy task)",
    nextDeepen(plan, acceptance),
    acceptance
  );
}
