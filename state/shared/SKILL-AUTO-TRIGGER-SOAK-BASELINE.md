# skill-auto-trigger.mjs — Soak Baseline (2026-05-13)

## Snapshot at milestone-close + 1h

- **Wiring landed:** 2026-05-13 ~07:30 UTC (commit `833007f23`)
- **Telemetry source:** `mcp-server/data/state/hook-fire-counts.jsonl`
- **Total fires across all hooks:** 4872 lines
- **skill-auto-trigger fires (this session, post-wiring):** 11
- **Matched-decision count:** 0
- **Empty-decision count:** 11
- **Triggers in JSONL ledger:** 10 (per `_skill-triggers.jsonl`)

## What this tells us

All 11 fires returned `decision: "empty"` (no prompt scored ≥ 0.65 against any of 10 triggers). That is the **correct cold-start behavior** — most session prompts so far have been short continuations ("continue", "what's next") or system-reminder injections, none of which contain milestone-skill keywords. The orchestrator is wired, executing, and not producing false-positive nudges.

## What to look for after ~24-48h of organic prompts

| Metric | Healthy range | Action if outside |
|--------|---------------|-------------------|
| Match rate (`matched` / `matched + empty`) | 5-20% | <2% → lower `PRISM_SKILL_AUTO_TRIGGER_MIN`; >30% → raise it |
| Distinct skills surfaced | ≥3 per day with mixed prompts | If only 1-2 dominate, expand other skills' trigger keywords |
| `recently-surfaced` suppression hits | 10-30% of matches | If 0 → the cache is broken; if >50% → window too long, drop from 3 to 2 |
| Operator invocation after suggestion | Want >50% | If <10% → the suggestions are noise; raise MIN or refine keywords |

## Calibration recipe (run after 48h or when telemetry > 100 skill-auto-trigger fires)

```bash
# 1. Extract just skill-auto-trigger fires from the master ledger
grep '"skill-auto-trigger"' mcp-server/data/state/hook-fire-counts.jsonl \
  > state/shared/skill-auto-trigger-fires.jsonl

# 2. Decision-type histogram
node -e '
const fs=require("fs");
const lines=fs.readFileSync("state/shared/skill-auto-trigger-fires.jsonl","utf8").split("\n").filter(Boolean);
const counts={};
const skillFires={};
for (const l of lines) {
  try {
    const o=JSON.parse(l);
    counts[o.decision]=(counts[o.decision]||0)+1;
    if (o.topK) for (const t of o.topK) skillFires[t.name]=(skillFires[t.name]||0)+1;
  } catch{}
}
console.log("decisions:", counts);
console.log("top-suggested skills:", Object.entries(skillFires).sort((a,b)=>b[1]-a[1]));
'

# 3. Score distribution of matched fires (P25/P50/P75 — mirrors /skill-recall-tune)
node -e '
const fs=require("fs");
const lines=fs.readFileSync("state/shared/skill-auto-trigger-fires.jsonl","utf8").split("\n").filter(Boolean);
const scores=[];
for (const l of lines) {
  try { const o=JSON.parse(l); if (o.decision==="matched" && o.topK) for (const t of o.topK) scores.push(t.score); } catch{}
}
scores.sort((a,b)=>a-b);
const p = q => scores[Math.floor(scores.length * q)];
console.log("matched scores: N=", scores.length, "P25=", p(0.25), "P50=", p(0.5), "P75=", p(0.75), "P95=", p(0.95));
'

# 4. Recommend new MIN_SCORE
# Default heuristic: MIN = P25 (capture bottom 75% of historical matches)
# Floor at 0.4, ceiling at 0.85
# Set via env: PRISM_SKILL_AUTO_TRIGGER_MIN=<value>
```

## Knobs reminder

| Env var | Default | Effect |
|---------|---------|--------|
| `PRISM_SKILL_AUTO_TRIGGER_DISABLE` | unset | `1` = bypass entirely |
| `PRISM_SKILL_AUTO_TRIGGER_K` | 3 | top-K suggestions surfaced |
| `PRISM_SKILL_AUTO_TRIGGER_MIN` | 0.65 | score floor for matched |
| `PRISM_SKILL_AUTO_TRIGGER_VERBOSE` | unset | `1` = stderr debug |

## How to regrow the trigger ledger

```bash
node H:/prism/scripts/extract-skill-triggers.mjs        # idempotent; SHA1-fingerprinted
node H:/prism/scripts/extract-skill-triggers.mjs --verbose   # see per-skill counts
```

The extractor walks `.claude/commands/*.md` (project + global), parses `triggers:` frontmatter, emits one JSONL line per `event: UserPromptSubmit` trigger above MIN_SCORE.

## Stage-22 integration (deferred follow-up)

Per the plan §P3, the extractor should be appended to `scripts/regen-wiki-from-viz.mjs` as stage-22 so it runs on every post-commit. Currently the operator must invoke it manually after adding/editing skill triggers. Track this as a follow-up unit when peer-chats touch `regen-wiki-from-viz.mjs` next.
