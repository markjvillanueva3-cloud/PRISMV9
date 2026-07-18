# Context-Nodes from Session Transcripts, triggered by Code Words — FUTURE TASK spec

**Status:** FUTURE TASK · not_started · advisory design (no code yet)
**Unit:** `U-CONTEXT-NODES-CODEWORDS` (proposed milestone `BRAIN-CONTEXT-NODES-MS0`)
**Domain:** alpha (token-optimization + context/memory + Obsidian-brain) — PSN brain-upgrade candidate
**Author:** claude-da9aacf5 slot alpha · 2026-05-30
**Operator request (verbatim):** *"can we go through all previous sessions including this one and
generate context nodes for when we encounter code words?"*

---

## Intent (what the operator is asking for)

A system that **mines the project's accumulated Claude-Code session transcripts** (every `*.jsonl`
under `C:/Users/wompu/.claude/projects/H--prism*/` + the live session) to discover the project's
**code words** — recurring domain jargon, operator-coined shorthand, acronyms, unit-IDs, named
systems — and for each one **generates a durable "context node"** (a compact knowledge bundle:
definition + key facts + provenance pointers). At runtime, when a code word is **encountered** in a
prompt or work, the matching context node is **surfaced/injected** so the chat instantly inherits the
cross-session context that term carries.

The novel value vs everything PRISM already has (see §R8 dedup): the **session transcripts** are an
un-mined corpus. The master-index/wiki/memory injectors index *code, wiki, and memory files* — they
do NOT learn from the conversation history itself. Operator coinages ("rename-steal", "the golf
slot", "rank 12", "the 11-leg PSN", "fail-open contract", a customer/machine codename) and the dense
context around them often live ONLY in `.jsonl` transcripts and never get promoted to wiki/memory.
This system surfaces that tribal conversational knowledge.

---

## Definitions

- **Code word** — a token/phrase that recurs across sessions and carries dense, project-specific
  context. Classes: (a) named systems/units (`PSN`, `galaxy`, `slot-bind-enforce`, `U-TRIBAL-INDEX-LOCK`),
  (b) operator shorthand/coinages ("golf slot", "rename-steal", "fail-open", "the 11-leg brain"),
  (c) domain jargon (`Kienzle`, `Taylor`, `WEDM`, `JM Die`, machine IDs), (d) acronyms
  (`TOCTOU`, `RMW`, `O_EXCL`, `SFC`, `RGS`). A high-value code word is one that is FREQUENT in
  transcripts AND either already a known node (reinforce) or NOT yet indexed anywhere (a gap → new node).
- **Context node** — `{ codeword, aliases[], definition, key_facts[], provenance: {sessions[],
  commits[], memories[], wiki[], specs[]}, co_occurring[] (edges to other code words), first_seen,
  last_seen, occurrences, confidence, advisoryOnly:true, mustHumanVerify:true }`.

---

## R8 dedup — what exists, what is genuinely new (READ BEFORE BUILDING)

| Existing surface | Indexes | Trigger | Overlap / difference |
|---|---|---|---|
| `master-index-precheck-inject.mjs` | `system-graph.json` nodes (engines/dispatchers/files) | UserPromptSubmit, top-5 | Same INJECT pattern; indexes code graph, NOT transcripts |
| `wiki-precheck-inject.mjs` | wiki entries (BM25 + cosine) | UserPromptSubmit | Indexes wiki MD, NOT transcripts |
| `memory-relevance-inject.mjs` | Obsidian per-file memories | UserPromptSubmit / edit | Indexes memory files, NOT transcripts |
| `tribal-by-domain-inject.mjs` | `tribal-embed-index.json` | slot-domain | Indexes tribal corpus, NOT transcripts |
| `master-index-search-lib.mjs` | BM25-lite over graph | shared lib | REUSE its scorer for code-word ranking |

**Genuinely new = the MINE stage over session `.jsonl` transcripts.** The GENERATE + INJECT stages
should **feed/extend** the above (ideally emit context nodes AS master-index graph nodes and/or
Obsidian memories so the existing injectors surface them) rather than stand up a parallel injector —
decide at build time. Run `duplicationGuardEngine.mustCheckBeforeCreating()` for any new engine.
**Do NOT** build a 5th independent keyword injector if a context node can be expressed as a
graph/memory node the existing stack already ranks.

---

## Proposed architecture (3 stages; the MINE+GENERATE stages are Ollama-offloadable → cheap, not Claude)

### Stage 1 — MINE (batch, offline)
`scripts/mine-codewords-from-sessions.mjs`:
- Enumerate all session transcripts (`C:/Users/wompu/.claude/projects/H--prism*/**/*.jsonl`,
  bounded; honor a `--since` window + a processed-watermark so re-runs are incremental).
- Stream-parse each (do NOT load 100MB+ into memory; line-by-line — the regen-viz streaming lesson).
- Extract candidate code words: frequency + a RAKE/TF-IDF-style keyphrase pass + regex for unit-IDs
  (`U-[A-Z0-9-]+`, `[A-Z]+-MS\d`), acronyms (`[A-Z]{2,6}`), backtick/quoted coinages.
- Cross-reference each candidate against the existing vocabularies (master-index node names, wiki
  titles, memory slugs, dispatcher/engine names) → tag `known` (reinforce) vs `gap` (new node /
  surfaces un-promoted tribal knowledge).
- Emit `state/shared/context-nodes/codeword-candidates.jsonl` (advisory).

### Stage 2 — GENERATE (per code word; Ollama `qwen2.5-coder` / summarizer)
`scripts/generate-context-nodes.mjs`:
- For each high-value candidate, gather its transcript contexts (surrounding windows) + cross-ref
  hits → Ollama-summarize into `definition` + `key_facts[]`; compute `co_occurring[]` edges
  (code words within the same session/turn) → a **code-word co-occurrence graph**.
- Store `state/shared/context-nodes/index.json` (schemaVersion 1.0.0) + optionally per-node Obsidian
  memories (`reference_codeword_<slug>.md`) so the memory-relevance injector picks them up for free.
- `advisoryOnly:true` + `mustHumanVerify:true` on every node (LLM-summarized → never authoritative).

### Stage 3 — INJECT (runtime, UserPromptSubmit)
Prefer **feeding the master-index** (each context node → a graph node) so
`master-index-precheck-inject` surfaces it with zero new hook. If a dedicated hook is needed:
`.claude/hooks/codeword-context-inject.mjs` — detect code words present in the prompt (exact +
alias, optional fuzzy), surface top-K matching context nodes as `additionalContext`. Keyword-gated,
rate-limited, `PRISM_CODEWORD_INJECT_DISABLE=1` knob, top-K via `PRISM_CODEWORD_INJECT_K`. (`.claude/`
hooks are write-blocked from the alpha worktree → **golf-routed** wiring, OR build the engine/scripts
in alpha and patch-sibling the hook wiring to golf.)

---

## Acceptance / safety (R12)
- Advisory-only; `mustHumanVerify` on every generated node; NEVER auto-flip any status/envelope.
- Incremental + watermarked (re-runnable, no full re-scan); streaming reader (no OOM on big `.jsonl`).
- Dedup-checked against master-index/wiki/memory before emitting a node.
- Pure-core + injected-deps + a real-corpus E2E test (the "hermetic fakes don't prove wiring" lesson:
  test against ≥1 real transcript, not only synthetic fixtures).
- Ollama-gated: Stage 2 needs a local LLM (currently `/api/chat` is DEAD — build Stages 1+3 first;
  Stage 2 lands when Ollama recovers, mirroring the U-TRIBAL-INDEX-LOCK foundation-first split).

## Build order (logical, R13)
1. Stage 1 MINE (no LLM) — proves the corpus + candidate extraction; validatable now.
2. Stage 3 INJECT scaffold against a hand-seeded node set — proves the runtime surface.
3. Stage 2 GENERATE (Ollama-gated) — fills nodes at scale.
Each on a proven foundation; never the consumer (inject) atop an unproven producer.

## Pointers
- Reuse: `scripts/lib/master-index-search-lib.mjs` (BM25-lite scorer), the precheck-inject hook family.
- Memory: `[[project_context_nodes_from_sessions_2026_05_30]]`.
- Sibling brain-upgrades sweep: `state/shared/specs/PRISM-BRAIN-UPGRADES-2026-05-30.md`.
- Activation: enqueue via `node H:/prism/.claude/helpers/slot-queue.mjs` (alpha) or
  `priority-queue.mjs` once promoted to a roadmap unit.
