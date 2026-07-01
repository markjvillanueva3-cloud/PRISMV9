---
name: synergy-recall
description: Cross-surface recall — fan out a query across all 5 PRISM knowledge surfaces (master-index, tribal, memory, wiki, skills) in parallel and return ≤3 compact distilled lines per surface. Wraps the existing checkin-recall.mjs script that /checkin uses internally — exposed as a user-invokable slash command for ad-hoc "what does PRISM know about X" lookups WITHOUT burning Claude tokens on five separate Grep/Read passes.
triggers:
  - event: UserPromptSubmit
    matcher:
      type: keyword
      value: "synergy recall|what does prism know|cross-surface lookup|fan out query|all surfaces|recall across"
    score: 0.80
    action: suggest
---

# `/synergy-recall <query>` — 5-surface cross-recall

**Token cost: ~zero.** Search + Ollama-distill happen in local compute. Claude only reads the ≤15 compact lines this prints (≤3 per surface, ≤120 chars/line).

## When to use

You want to know what PRISM already knows about a topic *across all 5 knowledge surfaces*, before re-deriving anything via Grep/Read/Agent:

- Master-index — system-graph.json (110K nodes) keyword hits
- Tribal — `tribal-embed-index.json` (3,919 tips across 18 CAM systems)
- Memory vault — `knowledge/memories/{feedback,reference,project,user,patterns,mistakes,inbox}/`
- Wiki — `knowledge/wiki/index.md` (722-entry Karpathy LLM-wiki catalog)
- Skills — `.claude/commands/*.md` matching by name + frontmatter

This is the **same fan-out `/checkin` Steps 8-11 use internally** (`scripts/checkin-recall.mjs`) — but invokable on demand for any query, not just session bootstrap.

## When NOT to use

- You already know the exact file path → use `Read`
- You need full content of one specific entry → use `/wiki-query <name>` or `/memory-search <query>`
- You need ranked dispatcher routing → use `prism_session:master_index_query` directly (single surface, ranked)
- The query is shop-floor calculation territory (speeds/feeds/forces) → use `prism_calc` actions, not knowledge recall

## What it does

Runs `scripts/checkin-recall.mjs` 5 times in sequence, one per surface, with `--limit 3` per source, optional `--ollama-distill` if Ollama is reachable (uses `qwen2.5-coder:32b`, ≤6s timeout, fail-soft). Aggregates the output into one compact markdown brief.

Never blocks. Never throws. Every surface failure (Ollama down, index missing, search empty) degrades to a one-line `(surface: unreachable)` entry — the brief always emits ≤15 lines so this skill is safe to wire into other pipelines.

## Run

The skill body invokes — note the **env-var insulation** for the query payload (NEVER inline `$ARGUMENTS` into a double-quoted shell string; bash expands `$(...)` and backticks inside double quotes even when the surrounding command is the harness-substituted value):

```bash
# Pass the user's query via env var so the shell never word-splits or
# command-substitutes it. Claude (or the operator) sets PRISM_RECALL_QUERY
# from the textual $ARGUMENTS before invoking the loop.
PRISM_RECALL_QUERY="$ARGUMENTS"   # raw value, no shell expansion
mkdir -p /tmp/prism-recall && ERRLOG="/tmp/prism-recall/$$.err"
for src in master-index tribal memory wiki skill; do
  node H:/prism/scripts/checkin-recall.mjs recall \
    --source "$src" \
    --query "$PRISM_RECALL_QUERY" \
    --limit 3 \
    --ollama-distill 2>>"$ERRLOG" \
    || echo "($src: unreachable — see $ERRLOG)"
done
# Stderr is captured to a per-pid log instead of /dev/null so genuine
# breakage (Ollama down, node missing, parse error) is recoverable
# rather than masked. The "(unreachable)" line still degrades gracefully.
```

**Threat-model note:** even with env-var insulation, the operator is on their own machine — a malicious `$ARGUMENTS` cannot escalate beyond what the operator already controls. The insulation is correctness hygiene (predictable behavior on quoted/special-char queries), not a security boundary.

Output format (deterministic):

```
## Synergy recall — "$ARGUMENTS"

### Master-index (top 3)
- <id> — <one-line distill>
- <id> — <one-line distill>
- <id> — <one-line distill>

### Tribal (top 3)
- [<cam>] <tip-id> — <one-line distill>
- ...

### Memory vault (top 3)
- [<type>] [[<slug>]] — <one-line distill>
- ...

### Wiki (top 3)
- [[<entry>]] — <one-line distill>
- ...

### Skills (top 3)
- /<skill-name> — <one-line description>
- ...
```

## Knobs (env vars, inherited from checkin-recall.mjs)

- `PRISM_CHECKIN_RECALL_OLLAMA_TIMEOUT_MS` (default 6000) — per-Ollama-call cap
- `PRISM_CHECKIN_RECALL_MODEL` (default `qwen2.5-coder:32b`) — distill model
- `PRISM_CHECKIN_RECALL_GRAPH_TIMEOUT_MS` (default 15000) — master-index query cap
- `OLLAMA_URL` (default `http://localhost:11434`) — Ollama endpoint

## Anti-regression

This skill is intentionally **thin**: zero recall logic of its own. The 5-surface fan-out lives in `scripts/checkin-recall.mjs` (R8 — read before writing; reuse before reinventing). Modifying recall behavior = modify that script + its tests, not this skill body.

The script's surface coverage is gated by `scripts/skill-trigger-ledger-health.test.mjs` (asserts the skill-trigger ledger has ≥100 entries so `skill-auto-trigger.mjs` can surface relevant skills from this fan-out).

## Cross-references

- [[reference_subagent_per_task_presearch_2026_05_15]] — same fan-out shape for spawned subagents
- [[feedback_system_viz_first_audit]] — /system-viz is the BEFORE step for "where is X built/wired" specifically; this skill is the BEFORE step for "what does the corpus say about X"
- `scripts/checkin-recall.mjs` — the engine this skill wraps
- `scripts/skill-trigger-ledger-health.test.mjs` — anti-regression gate for the underlying skill ledger
