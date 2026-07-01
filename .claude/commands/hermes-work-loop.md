---
name: hermes-work-loop
description: Fire ONE bounded batch of plan+draft-only parallel Hermes agents over open PRISM work units (vault + PRISM-MCP context), then review the ledger. NEVER commits code -- a human reviews + commits. The on-demand companion to the gated work-loop cron.
trigger:
  autoSuggest:
    keywords: ["hermes work loop", "run hermes agents", "parallel hermes", "fire hermes agents", "hermes speed up tasks", "work loop ledger"]
---

# /hermes-work-loop -- plan+draft-only parallel Hermes work loop (on demand)

Fire ONE bounded batch of parallel Hermes agents over open PRISM work units to **speed up
development** -- each agent reasons over the Obsidian vault + a PRISM-MCP capability digest and
writes a **plan + draft** to a ledger for a HUMAN (or a live Claude) to review + commit. The loop
**NEVER commits code** (operator decision: "Plan + draft only, human commits").

**Driver:** `scripts/hermes-work-loop-driver.mts` (HERMES-WORK-LOOP-MS0/U4, run via tsx).
It COMPOSES the existing machinery -- `HermesWorkSourceFeederEngine` (4 work sources ->
deduped, risk-classified Subtask[]) + `HermesAutonomousDriveRunnerEngine.drive()` (the
default-OFF-gated bounded-parallel wave runner) + `ask-hermes` (the cloud Grok / local Ollama
agent) -- it builds NO new planner/runner.

> Orthogonal to `/ask-hermes` (a single Hermes call) and `/hermes-control` (the app-control
> bridge). This is the AUTONOMOUS WORK LOOP: it picks work, fans out agents, and records drafts.

## Commands

> The driver is TypeScript (.mts) and runs under tsx. Bare `node` works -- the driver self-reexecs
> under `mcp-server/node_modules/tsx` (run `npm install` in mcp-server if tsx is absent). To be
> explicit, invoke tsx directly: `node mcp-server/node_modules/tsx/dist/cli.mjs scripts/hermes-work-loop-driver.mts ...`.

```bash
# 1. DRY-RUN first (proves the pipeline with $0 -- feeds + classifies + records the PLANNED
#    ledger, but spawns NO agent). Safe to run anytime.
node scripts/hermes-work-loop-driver.mts --dry-run --json --max-units 3

# 2. FIRE one gated batch (spawns ask-hermes agents -- needs the gate). The runner's OWN
#    default-OFF gate must be armed via --gate OR PRISM_HERMES_AUTONOMOUS_DRIVE=1.
node scripts/hermes-work-loop-driver.mts --gate --json --max-units 3 --max-parallel 2

# 3. REVIEW the ledger (the plan/draft each agent produced -- for a human to commit).
node -e 'const fs=require("fs");const p="state/shared/hermes-work-loop-ledger.jsonl";if(!fs.existsSync(p)){console.log("(no ledger yet)");process.exit(0);}for(const l of fs.readFileSync(p,"utf8").trim().split("\n")){const r=JSON.parse(l);console.log(`${r.stampedAt} ${r.subtask_id} | ${r.lane}/${r.posture} | committed=${r.committed} | ${String(r.agentOutput).slice(0,80)}`);}'
```

Flags: `--gate` (arm the wave) - `--dry-run` (no agent spawn) - `--max-units N` (default 6) -
`--max-parallel N` (default 3) - `--json` - `--quiet`.

## Safety (three independent gates -- ALL must clear to fire waves)

1. **The gate.** Without `--gate` (or `PRISM_HERMES_AUTONOMOUS_DRIVE=1`) the runner refuses the
   wave -- the driver exits `{driveRan:false}`, no agent spawns, no harm. This is the SAME gate
   the autonomous-drive task reuses; the driver passes it through and adds no second gate.
2. **Plan+draft-only -- NEVER commits.** Regardless of the gate, every ledger row is
   `committed:false` and the executor is read-only w.r.t. the repo. The worst a fully-armed run
   does is fire read-only `ask-hermes` agents + write plan/draft ledger rows. A human commits.
3. **Claim-dedup.** The feeder excludes any unit a peer slot currently claims
   (`slot-task-claim.mjs::peerClaimedSet`), so a Hermes agent never races a live work slot. An
   identity-less run is most-restrictive (excludes every claimed unit).

## When to use

Operator says "run the hermes work loop", "fire parallel hermes agents on open work", "use hermes
to speed up tasks", "show me the work-loop ledger". Always `--dry-run` first to preview the picked
units; `--gate` only when you intend to spend agent time; then review the ledger and commit the
drafts you approve. To run it on a schedule, register the gated cron:
`.claude/helpers/install-hermes-work-loop-task.ps1 -GateEnv` (operator-elevated; default-OFF).
