---
name: recall-injection-flow
category: software-engineering
domain: backend-dev
tags: [recall, injection, hooks, userpromptsubmit, sessionstart, awareness, prism-development, ai-development]
last_updated: 2026-05-18
---

# Recall Injection Flow — what gets injected on every prompt, and how to read it

The companion to [[prism-self-update-loop]]: that wiki names the surfaces PRISM auto-regenerates; this one names the **injection hooks that consume those surfaces** and how a chat should read each block. Every UserPromptSubmit fires a chain of inject hooks; every SessionStart fires a different chain. The blocks visible to the chat are not optional flavor text — each is a top-K relevance ranking that costs the model context to read and is meant to short-circuit a downstream Grep/Glob/Agent call. This wiki names the chain, the signal each hook contributes, and the empty-result interpretation rules.

## The UserPromptSubmit chain — what fires on every prompt

Order is wiring-determined in `settings.json`. Approximate order on a healthy install (sampling from observed injections):

| # | Hook | Block heading | Signal source | What it tells the chat |
|---|---|---|---|---|
| 1 | `prompt-context-inject` | (no header — sets default rails) | static rails text | Slash-command execution rules + Karpathy discipline + safety tier + "check ENGINE_DIGEST before creating" |
| 2 | `wiki-precheck-inject` | `## 📚 Wiki precheck — relevant entries already known` | BM25 over `_leaf-index.jsonl` + cosine fallback over `_embeddings.jsonl` | Top-K wiki entries whose tokens overlap your prompt — read these BEFORE re-deriving |
| 3 | `master-index-precheck-inject` | `## 🧭 Master-index pre-search (top 5 of system-graph + obsidian)` | BM25 over `system-graph.json` nodes + pre-joined wiki/memory entries | Top-K graph hits — engines, dispatchers, layers, ghost roosts — relevant to your prompt |
| 4 | `memory-relevance-inject` | (varies — `## 🧠 Relevant memories` when matches) | BM25 over `MEMORY.md` index + memory file frontmatter `description:` | Top-K Obsidian memories — `feedback_*` (rules), `reference_*` (durable facts) |
| 5 | `tribal-by-domain-inject` | `## 🧠 Relevant tribal knowledge for this task` | Cosine over `tribal-embed-index.json` with slot→domain boost | Mill/lathe/wedm/cad/cam shop-floor tribal knowledge ranked for your prompt |
| 6 | `chat-bus-inject` (compact) | `## 🔗 Chat Bus — you=... · N peers · M foreign claims · K unread` | `AGENT_CHAT.jsonl` head + claim ledger | Live peer count + outstanding messages — see [[fleet-coordination-discipline]] |
| 7 | `loop-awareness-inject` | `─── /loop awareness ───` | `state/shared/loop-state/loop-<sid>.json` + fleet roll-up | Your /loop iter/target/status + other fleet loops + Karpathy R10 reminder |
| 8 | `skill-auto-trigger` | `⚙ Pipeline auto-trigger — top-1 match` | `_skill-triggers.jsonl` keyword match | Skill suggestions when your prompt mentions trigger keywords |
| 9 | `ollama-pipeline-injector` | (varies) | trigger-keyword match against skill manifest | Concrete model + token-saving routing recommendations for `/forge-audit`, `/rgs`, etc. |

The SubagentStart chain ([[subagent-orchestration-discipline]]) injects a subset to each spawned agent — master-index pre-search + tribal pre-search keyed to the agent's prompt, not the orchestrator's.

## The SessionStart chain — what fires on a fresh chat

Different hook set, fires ONCE per session boundary:

| Hook | Block heading | Signal |
|---|---|---|
| `awareness-snapshot-inject` (T2) | `## 🧭 PRISM Awareness (auto-injected ...)` | 15-line summary: engine/wiki counts, NEEDS_WIRING, roadmap pending, envelope drift, top orphans |
| `build-state-inject` | `## 🧭 BUILD_STATE — what's built / wiring / pending / frontend` | Counts + top unwired domains + envelope drift + pending frontend merges |
| `claude-brief-precompact` | `# CLAUDE-BRIEF — PRISM Continuous Awareness` | The 5-section context dump (identity, scale, system map, wiki brain, process priority) |
| `session-start-auto-resume` (compact event) | `## 🔁 AUTO-RESUME after /compact (per-chat handoff)` | This chat's RESUME directive + next-action `/checkin` |
| `consolidated-handoffs-inject` | `## 🧵 N open cross-topic thread(s) for slot X` | Prior-topic handoffs not yet git-confirmed-shipped — to prevent orphaning |
| `session-start-terminal-pin` | (none — silent) | Binds slot to terminal window id |
| `git-health-inject` | `SessionStart hook: git-health` | Uncommitted change count + warnings |
| `git-sync-inject` | `SessionStart hook: git-sync` | Ahead/behind divergence vs origin |

The 15-line awareness snapshot is the highest-leverage SessionStart inject — it's the one block that gets stale fastest and is most worth re-reading carefully on fresh chats.

## How to READ the injections — five rules

### Rule 1: skim before re-deriving

If `## 📚 Wiki precheck` shows an entry whose name matches what you're about to investigate — **read the entry first**. The recall hooks exist specifically to short-circuit re-derivation. Re-deriving information already in a wiki entry is the most common waste mode the recall infrastructure was built to prevent.

### Rule 2: top-K is not "the answer" — it's the candidate set

The recall hooks return top-K (default 3 or 5) most relevant entries. They are CANDIDATES — entries worth checking before going broader. If top-1 isn't relevant, broaden with `/master-index <better-query>` or `/wiki-query <name>`.

### Rule 3: empty results are SIGNAL, not noise

When `## 📚 Wiki precheck` returns nothing relevant AND `## 🧭 Master-index pre-search` returns nothing relevant, that means the topic is **genuinely uncovered** in the corpus. This is a high-leverage moment: if your work product would be valuable to future chats, writing a wiki entry as part of this task is justified. The recall-write loop closes here.

### Rule 4: stale recall is a different signal than empty recall

`_leaf-index.jsonl` mtime >6h with commits since = recall pipeline running behind ([[wiki-recall-index-stale-2026-05-18]]). The hooks WILL return results but those results miss recently-shipped wikis. If you're investigating a topic that may have just been shipped (e.g. another chat's work this session), check `git log --since="1h ago" knowledge/wiki/` directly — don't trust empty recall under known staleness.

### Rule 5: each block's signal is different — don't conflate

- `## 📚 Wiki precheck` → documented architectural knowledge (the WHY)
- `## 🧭 Master-index pre-search` → system-graph node existence + utilization (the WHAT/WHERE)
- `## 🧠 Relevant memories` → cross-session lived rules + lessons (the LEARNED HOW)
- `## 🔗 Chat Bus` → live coordination state (the WHO)
- `─── /loop awareness ───` → your own loop position (the WHERE-AM-I)

A chat that conflates these treats master-index hits as "the wiki must cover this" — it doesn't necessarily. The wiki + graph + memory surfaces overlap but each has unique coverage.

## What each hook's K controls

Default K values are tuned for token economy. The knobs:

| Hook | K knob | Default |
|---|---|---|
| `wiki-precheck-inject` | `PRISM_WIKI_PRECHECK_K` | 3 |
| `master-index-precheck-inject` | `PRISM_MASTER_INDEX_K` | 5 |
| `memory-relevance-inject` | `PRISM_MEMORY_RELEVANCE_K` | 3 |
| `tribal-by-domain-inject` | `PRISM_TRIBAL_INJECT_K` | 3 |
| `skill-auto-trigger` | `PRISM_SKILL_AUTO_TRIGGER_K` | 3 |

Raising K trades context tokens for recall breadth. The defaults assume you'll drill via `/wiki-query`, `/master-index`, etc. if top-K isn't enough. Don't raise K globally to compensate for a one-off broader query — use the drill skill instead.

## How to disable a noisy injection

Per-hook env knobs (consistent pattern across PRISM):

```
PRISM_WIKI_PRECHECK_INJECT=0
PRISM_MASTER_INDEX_INJECT=0
PRISM_MEMORY_RELEVANCE_INJECT=0
PRISM_TRIBAL_INJECT_DISABLE=1
PRISM_CHAT_BUS_INJECT=0
PRISM_LOOP_INJECT_DISABLE=1
PRISM_PICK_PREFRESH_DISABLE=1
PRISM_GOAL_PREREQ_DISABLE=1
PRISM_SKILL_AUTO_TRIGGER_DISABLE=1
PRISM_OLLAMA_PIPELINE_INJECT=0
```

These are individual hook switches; do NOT disable an injection class wholesale without a reason. The injections are the durability layer that prevents re-derivation. Disable for noise-investigation only; re-enable when the chat is back to productive work.

## The drill skills — when top-K isn't enough

The recall hooks emit candidates. The drill skills retrieve full content:

```
/wiki-query <name>           # Full wiki entry by name
/master-index <query>        # Broader graph search
/memory-search <query>       # Full memory search by tokens
/awareness-snapshot          # Refresh the SessionStart awareness block
/utilization-dashboard       # Detailed node-utilization view
/orphan-inventory            # Built+documented+unwired engines (the punch list)
/deep-search <query>         # Multi-layer search (graph + wiki + tribal)
```

The pattern: recall surface candidates → drill skill fetches one canonical entry → you act. Don't Grep+Read for what `/wiki-query` returns in one round-trip.

## The /pick-unit / /pick-dev / /pick-build-close family

For unit-picking — separate from the recall-on-prompt chain. These fire a pre-flight injector (`pick-prefresh-inject`) that surfaces:
- `MILESTONE_PROGRESS` shipped count
- `BUILD_STATE` envelope drift cases
- `CLOSE-OUT-CANDIDATES` staleness
- Your slot's active claims
- The peer-claim filter

These are the "before you commit to building, here's what shipped + what's drifting" surfaces. Read before claiming.

## Anti-patterns

- **Re-deriving what `## 📚 Wiki precheck` already names** — the wiki hit IS the short-circuit; honor it.
- **Treating `## 🧭 Master-index pre-search` as wiki coverage** — graph node existence ≠ wiki entry. Confirm via the wiki precheck or `/wiki-query`.
- **Ignoring `## 🔗 Chat Bus` foreign claims** — collisions follow.
- **Trusting empty recall under known stale `_leaf-index`** — verify with `git log --since="..."` first.
- **Raising K globally** — bloats every prompt's context for one rare query; use drill skills instead.
- **Disabling injection hooks "to save tokens"** — the K is already tuned; disabling is for investigation only.
- **Re-running the same `/master-index <query>` instead of widening it** — same tokens return same top-K. Change the query.
- **Not reading `─── /loop awareness ───` in a /loop session** — your own iter/status is recorded there; ignoring it is how you lose count.

## Checklist — every prompt, before reaching for Grep/Glob

- [ ] Did `## 📚 Wiki precheck` show an entry matching my topic? Read it first.
- [ ] Did `## 🧭 Master-index pre-search` show a relevant graph node? Drill via `/master-index` or follow the wiki path.
- [ ] Any `## 🧠 Relevant memories` carry a rule I should apply?
- [ ] `## 🔗 Chat Bus` showing foreign claims on files I'm about to touch? Pivot or coordinate.
- [ ] `─── /loop awareness ───` matches my expectation of session state?
- [ ] If all of the above were empty AND the topic is genuinely new — am I about to write something worth a wiki entry?

## Verification — is the injection chain actually firing?

```bash
# Confirm each inject hook is wired in settings.json:
for h in wiki-precheck-inject master-index-precheck-inject memory-relevance-inject \
         tribal-by-domain-inject chat-bus-inject loop-iteration-inject \
         skill-auto-trigger ollama-pipeline-injector; do
  echo -n "$h: "
  grep -c "$h" H:/.claude/settings.json
done
```

Zero matches for any expected hook = unwired = silent loss of that signal class. Wire it. Per [[fleet-coordination-discipline]] verification rule.

## Related

- [[prism-self-update-loop]] — what regenerates the surfaces these hooks consume
- [[wiki-automation-discipline]] — the 4-stage propagation pipeline (write → graph → indexes → vault)
- [[fleet-coordination-discipline]] — the chat-bus surface in depth
- [[autonomous-loop-drift-discipline]] — when to act on injections vs when to defer
- [[token-budget-management]] — the K-tuning trade-off
- CLAUDE.md "MANDATORY SELF-AWARENESS" + "MASTER INDEX + AWARENESS STACK" sections — the doctrine pointers
- `.claude/hooks/wiki-precheck-inject.mjs` + `master-index-precheck-inject.mjs` + `memory-relevance-inject.mjs` + `tribal-by-domain-inject.mjs` — the source-of-truth implementations
