export const meta = {
  name: 'fix-inefficiencies-and-gaps',
  description: 'Exhaustively audit + adversarially verify PRISM efficiency gaps (milestone status-drift, divergent milestone trees, roadmap-tooling bugs, bypassed safety gates, build health, unwired engines) and emit a verified apply-ready ranked fix plan. All-sonnet discovery; Opus judgment stays in the main loop (applies fixes).',
  phases: [
    { title: 'Audit', detail: 'parallel read-only finders, one per gap dimension', model: 'sonnet' },
    { title: 'Verify', detail: 'adversarially confirm each safe-fix finding is real + safe', model: 'sonnet' },
    { title: 'Synthesize', detail: 'ranked apply-plan + exact patches + milestone-reconcile design', model: 'sonnet' },
  ],
}

const PRISM = 'H:/prism'

const FINDING_SCHEMA = {
  type: 'object',
  required: ['dimension', 'summary', 'findings'],
  additionalProperties: true,
  properties: {
    dimension: { type: 'string' },
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'severity', 'isReal', 'safeToAutoFix', 'exactFix', 'evidence'],
        additionalProperties: true,
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
          isReal: { type: 'boolean' },
          safeToAutoFix: { type: 'boolean' },
          exactFix: { type: 'string' },
          evidence: { type: 'string' },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['isReal', 'isSafe', 'reason'],
  additionalProperties: true,
  properties: {
    isReal: { type: 'boolean' },
    isSafe: { type: 'boolean' },
    reason: { type: 'string' },
  },
}

const PLAN_SCHEMA = {
  type: 'object',
  required: ['summary', 'rankedActions', 'riskyQueue'],
  additionalProperties: true,
  properties: {
    summary: { type: 'string' },
    rankedActions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['rank', 'action', 'dimension', 'safeToApply', 'exactSteps'],
        additionalProperties: true,
        properties: {
          rank: { type: 'number' },
          action: { type: 'string' },
          dimension: { type: 'string' },
          safeToApply: { type: 'boolean' },
          exactSteps: { type: 'string' },
        },
      },
    },
    riskyQueue: {
      type: 'array',
      items: {
        type: 'object',
        required: ['action', 'why', 'plan'],
        additionalProperties: true,
        properties: {
          action: { type: 'string' },
          why: { type: 'string' },
          plan: { type: 'string' },
        },
      },
    },
  },
}

const COMMON = `You are a READ-ONLY auditor in PRISM (manufacturing-intelligence platform at ${PRISM}, win32, Git Bash available). DO NOT write/edit/commit any file. Use Read/Grep/Glob/Bash(read-only: git log, cat, node <readonly-script>, tsc --noEmit). Cite file:line for every claim (R12 honesty). Return findings via the StructuredOutput schema. A finding is safeToAutoFix=true ONLY if the fix is a deterministic, low-blast-radius change that cannot corrupt load-bearing state. Be exhaustive but precise.`

const FINDERS = [
  {
    key: 'milestone-drift',
    prompt: `${COMMON}
DIMENSION: milestone status-drift.
Context (verified this session): build-milestone-progress.mjs reports 192 drift cases with drift==="claims_not_started_but_has_shipped_units" in ${PRISM}/state/shared/MILESTONE_PROGRESS.json. They split: ~116 not_started->completed_real (shipped==total) + ~76 not_started->in_progress_real (shipped<total).
TASKS:
1. Read MILESTONE_PROGRESS.json; confirm the exact counts of each split (re-tally the milestones[] array by .drift and claimedStatus->derivedStatus). Report exact numbers.
2. The 76 not_started->in_progress flips are SAFE (work demonstrably started). The 116 ->completed flips are a CORRECTNESS ASSERTION. SPOT-VERIFY 8 of the 116: for each, read its envelope ${PRISM}/mcp-server/data/milestones/<ID>.json, pick 2-3 of its unit ids, and run \`git -C ${PRISM} log --all --oneline\` grepping for real shipping commits matching those unit ids. Report whether the completed_real claims are TRUSTWORTHY (real commits exist) or some look like false-positive git-id substring matches.
3. Output findings: one for "76 safe in_progress flips" (safeToAutoFix=true if a correct reconciler on the canonical tree exists), one for "116 completed flips need per-milestone git-verification" (safeToAutoFix=false), plus the trust verdict from the sample. exactFix = the precise reconcile approach.`,
  },
  {
    key: 'tree-divergence',
    prompt: `${COMMON}
DIMENSION: two divergent milestone trees.
Context (verified): ${PRISM}/mcp-server/data/milestones (753 envelopes, CANONICAL per build-milestone-progress.mjs + close-out-milestone.mjs + CLAUDE.md) vs ${PRISM}/data/milestones (383 envelopes, targeted by reconcile-milestones.mjs:13 via import.meta.dirname/../data).
TASKS:
1. Grep the whole repo (${PRISM}/scripts, ${PRISM}/.claude, ${PRISM}/mcp-server) for any LIVE reader of the data/milestones (383) tree OTHER than reconcile-milestones.mjs. Is it referenced by any hook/cron/dispatcher/script? Cite each ref or confirm none.
2. Pick 5 milestone ids present in BOTH trees; diff their top-level "status" + unit statuses. Are they identical, or does the 383 tree carry STALE/different data?
3. Verdict: is data/milestones a DEAD duplicate safe to retire/ignore, or is it live and authoritative for something? Output exact safe-resolution steps (do NOT delete anything -- recommend disable/redirect per never-delete-only-disable doctrine).`,
  },
  {
    key: 'roadmap-tooling-bugs',
    prompt: `${COMMON}
DIMENSION: roadmap status-reconcile tooling defects.
TASKS: Read + audit these three scripts for defects; cite file:line; propose EXACT minimal fixes:
1. ${PRISM}/scripts/reconcile-milestones.mjs -- suspected: (a) DATA_DIR = join(import.meta.dirname,'..','data') resolves to ${PRISM}/data (383 tree) NOT mcp-server/data (753 canonical); (b) its status resolver only fires for status==='unknown'||!status, SKIPPING explicit 'not_started' (so it cannot fix the 192); (c) step-3 syncs index status FROM envelope status. Confirm or refute each by reading the code.
2. ${PRISM}/scripts/close-out-milestone.mjs -- confirm it REFUSES unless envelope.status is already 'completed'/'complete' (downstream propagator only). Note the correct flow (flip envelope status THEN close-out).
3. ${PRISM}/scripts/audit-roadmap-drift.mjs -- does it target the right tree / index? any defect?
For each confirmed defect, output a finding with exactFix (the precise patch) and classify safeToAutoFix (a path correction is usually safe; behavior changes to a reconciler that mutates 753 envelopes are NOT).`,
  },
  {
    key: 'bypassed-gates',
    prompt: `${COMMON}
DIMENSION: bypassed safety gates (an off safety net = debt).
TASKS:
1. Read C:/Users/wompu/.claude/settings.json (and ${PRISM}/.claude/settings.json if different). Enumerate EVERY env var in the "env" block (or hook args) that DISABLES/BYPASSES a safety gate -- especially PRISM_ALLOW_UNWIRED=1 (disables stop_on_unwired_assets orphan-block), and any PRISM_*_BYPASS / PRISM_*_DISABLE set to "1" on a Stop or PreToolUse gate.
2. For each: name the gate it disables, infer WHY it might be on (grep CLAUDE.md / wiki for history -- e.g. stop_on_unwired_assets has a documented false-positive history), and judge: is it SAFE to RE-ARM (remove the bypass) now, or is the bypass still load-bearing?
3. Output one finding per bypass with exactFix = the precise settings.json edit to re-arm (or "keep, reason: ...") and a conservative safeToAutoFix (re-arming a gate with false-positive history is NOT auto-safe; a clearly-stale bypass may be).`,
  },
  {
    key: 'build-health',
    prompt: `${COMMON}
DIMENSION: build health (fix-rung gap signal).
TASKS (read-only probes, report counts only -- do NOT fix):
1. Run \`cd ${PRISM}/mcp-server && npx tsc --noEmit 2>&1 | tail -8\` (allow a long timeout). Report the current tsc error count + the top 3 offending files. (Per CLAUDE.md there is an ongoing BUILD-QUALITY-PAPA tsc-cleanup; this is just the current count.)
2. Grep ${PRISM}/state/shared and ${PRISM}/mcp-server/data/state for any failing-test ledger or "## Recent regressions" open items.
3. Output findings as gap SIGNALS (severity by count). safeToAutoFix=false for all (tsc/test fixes are their own careful units owned by papa); this is a measurement, not an auto-fix target.`,
  },
  {
    key: 'unwired-engines',
    prompt: `${COMMON}
DIMENSION: unwired/dormant engines (orphan inefficiency).
TASKS:
1. Run \`node ${PRISM}/scripts/audit-unwired-engines.mjs 2>&1 | tail -20\` (the 2026-06-10 fix excludes engine->engine consumption: expect ~66 truly-dormant + ~23 library-layer). Report the actionable truly-dormant count.
2. From the audit output, identify up to 5 dormant engines that are QUICK wiring wins (a clear natural dispatcher consumer exists). Cite the engine + the target dispatcher.
3. Output findings. safeToAutoFix=false (wiring is a real build unit per R15, not an auto-patch), but rank the quick wins for the queue.`,
  },
]

const audited = await pipeline(
  FINDERS,
  (f) => agent(f.prompt, { label: `audit:${f.key}`, phase: 'Audit', model: 'sonnet', schema: FINDING_SCHEMA }),
  (res, f) => {
    if (!res || !Array.isArray(res.findings)) return res
    const safe = res.findings.filter((x) => x && x.safeToAutoFix && x.isReal)
    if (!safe.length) return res
    return parallel(
      safe.map((finding) => () =>
        agent(
          `${COMMON}\nADVERSARIAL VERIFY (try to REFUTE). A peer auditor proposed this fix as REAL + SAFE-TO-AUTO-FIX in dimension "${f.key}":\nTITLE: ${finding.title}\nEXACT FIX: ${finding.exactFix}\nEVIDENCE: ${finding.evidence}\nIndependently verify against the live code/state: (1) is the finding REAL (read the cited file:line)? (2) is the fix SAFE to auto-apply (deterministic, low blast radius, cannot corrupt load-bearing roadmap/settings state)? Default isSafe=false if uncertain. Cite file:line.`,
          { label: `verify:${f.key}:${finding.id}`, phase: 'Verify', model: 'sonnet', schema: VERDICT_SCHEMA }
        ).then((v) => ({ ...finding, verdict: v }))
      )
    ).then((verified) => ({
      ...res,
      findings: res.findings.map((x) => {
        const m = verified.find((v) => v && v.id === x.id)
        return m || x
      }),
    }))
  }
)

phase('Synthesize')
const auditJson = JSON.stringify(audited.filter(Boolean), null, 0).slice(0, 40000)
const synth = await agent(
  `You are the synthesis lead for a PRISM "fix all inefficiencies and gaps" pass (operator directive). Below are verified per-dimension audit results (each finding may carry a .verdict from an adversarial verifier: trust isReal && isSafe).
AUDITS JSON:
${auditJson}

Produce a single ranked apply-plan:
- rankedActions: ordered list (rank 1 = highest value-per-risk). For each: the action, its dimension, safeToApply (true ONLY if verdict.isReal && verdict.isSafe, or self-evidently a deterministic low-risk patch), and exactSteps (the precise edit/command -- file:line + the change, or the exact CLI). Put DETERMINISTIC LOW-RISK PATCHES FIRST (e.g. a script path-bug fix, a clearly-stale gate re-arm); CAREFUL/LOAD-BEARING items (192-envelope milestone reconcile, anything mutating mcp-server/data/milestones or settings safety gates) as safeToApply=false with a precise plan.
- riskyQueue: load-bearing items needing a careful in-the-loop pass. For each: action, why risky, exact careful plan (dry-run first, verify, scrutiny).
- summary: 3-4 sentences -- what is genuinely fixable-now vs what needs care, and the single highest-leverage fix.
Be concrete and honest (R12): do not mark something safeToApply unless the verifier or the evidence proves it.`,
  { label: 'synthesize', model: 'sonnet', schema: PLAN_SCHEMA }
)

return { audited: audited.filter(Boolean), plan: synth }
