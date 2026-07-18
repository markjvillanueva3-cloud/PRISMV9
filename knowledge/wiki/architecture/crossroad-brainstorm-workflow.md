---
title: Crossroad → brainstorm-path-forward Workflow
type: architecture
status: active
created: 2026-05-30
owner: golf
tags: [workflow, decision, multi-agent, doctrine, planning]
---

# Crossroad → brainstorm-path-forward Workflow

**Doctrine (operator directive 2026-05-30):** when the work reaches a genuine **crossroad**, automatically run the `brainstorm-path-forward` multi-agent Workflow to produce the recommended path — instead of guessing one path or asking the operator a bare either/or. Memory: [[feedback_crossroad_brainstorm_workflow]].

## What counts as a crossroad (trigger)

ALL three must hold:
1. **≥2 valid paths** to proceed (not one obvious way).
2. **Real or irreversible consequences** (data loss, peer collision, rework, a hard-to-undo commit/merge/migration).
3. **No obvious default** the conventions already settle.

Trigger phrases that should fire it: *"proper way forward", "how should we proceed", "which path", "what's the right approach", "brainstorm"*, or any moment you're about to type "Option A vs B?" about strategy. **Do NOT** fire on trivial decisions with an obvious default (just proceed) or pure information lookups — that wastes a fan-out.

## What it does

Fans out **5 strategic-lens agents** in parallel, each developing one independent approach through a single lens, then a **synthesis agent** merges them into one dependency-ordered path:

| Lens | Forces the plan to optimize for |
|------|--------------------------------|
| `safety-first` | reversibility, never-lose-work, lowest blast-radius |
| `root-cause` | fix the mechanism so it can't recur |
| `fastest-unblock` | smallest 80/20 that removes the blocker |
| `distributed-ownership` | respect asset/domain owners; coordinated handoffs |
| `adversarial` | assume every obvious plan is wrong; find what survives the failure mode |

Output: a single **recommended sequence** (ordered, owner-tagged), the **central tradeoff**, the **operator-only decisions**, the **immediate safe actions**, and the **top risks**.

## Critical implementation note (gotcha)

**Do NOT use JSON `schema` on the agents.** The default workflow subagent does not reliably emit the `StructuredOutput` tool and fails with *"completed without calling StructuredOutput (after 2 nudges)"* — observed 2026-05-30 (5/5 lens agents failed). See [[reference_alpha_explore_agent_schema_incompat]]. Use **plain-text markdown** returns and let the synthesis agent parse the prose. Also: the synthesis agent can hit a transient *"Server is temporarily limiting requests · Rate limited"*. To resume, re-invoke with `{scriptPath, resumeFromRunId}` **AND the SAME `args`** — omitting `args` changes the interpolated prompts → cache miss → the whole run re-executes *blind* with an empty crossroad (observed 2026-05-30: a resume without args produced a generic synthesis that, to its credit, detected the empty context and refused to fabricate). When in doubt, just synthesize the cached lens outputs by hand.

## Reusable script (working, schema-less)

```js
export const meta = {
  name: 'brainstorm-path-forward',
  description: 'At a crossroad, fan out strategic-lens agents then synthesize a recommended dependency-ordered path.',
  phases: [{ title: 'Lenses' }, { title: 'Synthesis' }],
}
const crossroad = (args && args.crossroad) || '(no crossroad supplied)';
const LENSES = [
  { key: 'safety-first',          prompt: 'Prioritize never losing work, reversibility, lowest blast-radius above speed.' },
  { key: 'root-cause',            prompt: 'Attack the underlying cause so it cannot recur; accept more upfront effort.' },
  { key: 'fastest-unblock',       prompt: 'Smallest 80/20 set of actions that removes the blocker; defer the rest explicitly.' },
  { key: 'distributed-ownership', prompt: 'Respect asset/domain ownership; no unilateral cross-domain action; who does what, in what order.' },
  { key: 'adversarial',           prompt: 'Assume each obvious plan is WRONG; find the failure mode that wrecks it; propose what survives.' },
];
const TEMPLATE = '\n\nRespond ONLY in markdown: **Thesis:** / **Steps:** (numbered) / **Pros:** / **Cons:** / **Risks:** / **Human-only decisions:**';
phase('Lenses');
const approaches = (await parallel(LENSES.map((l) => () =>
  agent(`Brainstorm ONE approach to this crossroad through the "${l.key}" lens ONLY.\nLENS: ${l.prompt}\n\nCROSSROAD:\n${crossroad}${TEMPLATE}`,
    { label: `lens:${l.key}`, phase: 'Lenses' }).then((t) => `### Lens: ${l.key}\n${t}`)
))).filter(Boolean);
phase('Synthesis');
const synthesis = await agent(
  `Synthesize these ${approaches.length} lens-approaches into ONE recommended path for this crossroad.\nCROSSROAD:\n${crossroad}\n\nAPPROACHES:\n${approaches.join('\n\n---\n\n')}\n\n` +
  `Markdown: 1) Recommended sequence (ordered, owner-tagged: golf/slot/operator); 2) Central tradeoff + how the order resolves it; 3) Operator-only decisions; 4) Immediate safe actions; 5) Top risks. Concrete to THIS crossroad.`,
  { label: 'synthesize', phase: 'Synthesis' });
return { synthesis, approaches };
```

Invoke: `Workflow({ script: <above>, args: { crossroad: "<full state + hard constraints + goal + key unknown>" } })`. The richer the `args.crossroad` (state, constraints, the one unknown only the human can resolve), the sharper the synthesis.

## Inaugural run (2026-05-30)

First fired on the **shared-tree git-hygiene crossroad** (34,200 untracked real files + merge backlog + 2-PC divergence). The `safety-first` lens contributed the load-bearing idea: **`.git/info/exclude` quarantine** of the wiki/memory/milestone dirs (local-only, reversible, zero tracking-commitment) so the status-noise clears *without* forcing the tracked-vs-regenerated decision the operator must make. See [[reference_main_tree_untracked_work_2026_05_30]].
