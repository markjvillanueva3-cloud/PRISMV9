# PRISM "All-in-One Neural Network of Everything" — Assessment (2026-06-29, slot:india)

> Operator work order: assess the H: AI/AGI/LoRA/DL/DR/ML/pattern-recog/NN/GNN/CAG/RAG substrate + its
> synergy with Obsidian/Hermes/Claude/CLAUDE.md/GSD/memories/skills/souls/system-viz/graphs/indexes/
> dispatchers/pipelines/slash-commands/learning+dev pipelines/CAD-gen/print-gen/print-read/doc-read/
> auto-storage→consumers/auto-synergy — toward "an all-in-one neural network of everything that
> communicates, trains, learns, collaborates, thinks ahead, and reasons before any action, using Ollama
> offload + local LLM + Claude, via octopus."
>
> Method: india synthesis (Opus) over the canonical AI-SYNERGY-AUDIT + india galaxy doctrine, plus 3
> parallel Sonnet ground-truth agents (Ollama down → cheap-Claude fallback ladder). Every claim cites
> file:line via the agents. ADVISORY assessment surface — not a build.

## TL;DR (R12, honest)

**The "neural network of everything" is ~70% BUILT, running at ~40% activation.** The substrate is real and
impressively complete; the *connectors* that make it self-running are dormant, env-gated, or manual, and a
large producer backlog never reaches consumers. The vision maps cleanly onto systems that already exist —
this is an **activation + closure** problem, not a greenfield build.

| Vision verb | PRISM substrate (exists) | State |
|---|---|---|
| communicates | chat-bus, AGENT_CHAT, cross-substrate edges, PSN 11-leg | LIVE but edges regen manually |
| trains | LoRA (~95 engines), GNN GraphSAGE tier-5, OCR→LoRA loop | LIVE; GNN full-coverage gate blocked on labels |
| learns | OutcomeBus (136K rows), closed-loop OCR/CAD-corr/quoting | PARTIAL — most pipelines open-loop |
| collaborates | octopus (MultiModelConsensus), 26-slot fleet, Hermes | octopus LIVE; Hermes DOWN 90% |
| thinks ahead | GNN active-pool selector, foresight, RAG/CAG recall | LIVE (selective) |
| reasons before action | `ReasonBeforeActionEngine` | **BUILT but DORMANT (unwired)** |
| Ollama offload + local LLM | `OllamaCapabilityProbeEngine` oracle, ask-ollama | LIVE |
| Claude capabilities | 26-slot fleet, agents, Opus/Sonnet ladder | LIVE |
| octopus | `MultiModelConsensusEngine.ask()` | LIVE (degraded by Hermes-down) |

## Inventory (counts, ALL-MEANS-ALL enumerated)

- **341** AI-pattern engine files (`lora|graphsage|gnn|neural|rag|retriev|embed|consensus|octopus|reason|train|learn`)
- **123** dispatchers · **424** AI dispatcher actions across them (AI-SYNERGY-AUDIT)
- **34/34** galaxies score synergy band "strong" (mean 1.0) · **69,545** cross-substrate edges seen
- **209** AI engines classified of 3,853 scanned (65 unattributed by name-heuristic)

## What EXISTS + is LIVE (do NOT rebuild)

1. **Octopus** — `mcp-server/src/engines/MultiModelConsensusEngine.ts:596` `.ask()` real (395-line body), wired
   `aiReasoningDispatcher consensus_decide:3449 / consensus_escalate:3527`, 44 importers, ledger
   `state/shared/octopus-runs.jsonl` live, ACCEPT_THRESHOLD 0.70. Consults `OllamaCapabilityProbeEngine` for voice.
2. **GNN tier-5** (GraphSAGE) — selective-deploy ACTIVE at τ=0.7 (emitted Brier 0.041, F1 1.0, 32% coverage).
   Full-coverage gate: AUROC **0.808 PASS**, macro-F1 **0.439 FAIL**, Brier **0.179 FAIL**. Blocked on
   labeled reference-pool growth (operator/data), NOT calibration (measured dead-end) and NOT more epochs.
3. **RAG hybrid** — `scripts/lib/hybrid-retrieval.mjs` (4-substrate RRF) + two-stage tribal-rerank LIVE.
4. **CAG router** — `scripts/lib/cag-router.mjs` LIVE; 20% hit-rate (27% warm) over 1,211 lookups / 34 galaxies.
5. **Model oracle** — `OllamaCapabilityProbeEngine.ts:346/356` `getBestReasoningModel/getBestChatModel` LIVE.
6. **OutcomeBus** — `OutcomeCaptureBusEngine.ts`, `state/shared/outcome-bus.jsonl` **136,073 rows**, 53 dispatcher actions.
7. **Auto-memory→Obsidian** — `.claude/hooks/stop-obsidian-memory-feed.mjs` fires every Stop (automatic).
8. **Closed-loop pipelines (the ones that LEARN):** blueprint OCR (`blueprint-ocr-training-loop.mjs` → trainset →
   india LoRA, 7,794 prints — best loop), CAD dim-correction (`cad-gen-dim-correction-run.mjs`), DocuStrata
   quoting outcomes (35,231 PDFs).

## The REAL gaps (prioritized; ★ = code-fixable now, not operator/GPU/data-gated)

1. ★ **Reason-before-action is DORMANT.** `ReasonBeforeActionEngine.ts` + `.claude/hooks/reason-before-action-gate.mjs`
   exist, tests pass, but **0 refs in either settings.json** → default-off (`PRISM_RBA_GATE_ENABLE=1` needed),
   fires **0%** across all 26 slots. Direct match to "reasons before any action." **Real blocker:** queues
   16–30s under concurrent fleet Ollama load → fail-opens. Needs a **prioritized inference lane** before
   fleet-wide arming. → highest-intent, but gated on the lane.
2. ★ **No "automatic system synergizing" loop.** Graph/edge re-index is **manual** (`regen-viz.mjs`): memories +
   cross-substrate edges don't become searchable until someone reruns it. This is the literal "automatic system
   synergizing" the operator named, and it's the single biggest auto-loop lever that is pure-code.
3. ★ **No unified auto-storage router.** "Data → decide destination by type → auto-wire to all consumers" does
   NOT exist as one abstraction — it's ~5 independent per-type pipelines with varying automation. Build a thin
   typed router OR document the per-type contract.
4. ★ **~170 unwired producer engines** (mill ~20, lathe ~77, wedm ~73) — outputs never reach consumers. This is
   the bulk of the "wired to all relevant consumers" gap. (Note: india R12 invariant — wire DATA/stats/provenance,
   never NN inference, through dispatchers.)
5. ★ **Most generation pipelines are open-loop** — setup-sheet/traveler/Fusion-bridge/doc-read emit **0** outcome
   records (`OutcomeTraceEngine` live but they don't route through it). Closing these grows the learning signal.
6. **Hermes DOWN (90% fail)** — degrades octopus to local-only voices. Self-heal: `node scripts/hermes-proxy-ensure.mjs` (operator/proxy).
7. **PSN↔octopus env-gated** — `fetchLiveBrain()` (`scripts/lib/octopus-live-brain.mjs:199`) needs `PRISM_OBSIDIAN_LIVE=1`
   and never round-trips through the `.ts` engine layer (only the `.mjs` hook calls it).
8. **GNN full-coverage** — operator/GPU/data-gated (labeled ghosts + H2GCN/GPU retrain).

## Recommended next build (dependency-ordered)

The vision's keyword "automatic system synergizing" + the standing doctrine (auto-fix inline, comprehensive
route) point at **gap #2** as the highest-ROI pure-code unlock: an **auto-synergize loop** that re-indexes the
graph + regenerates cross-substrate edges automatically when memories/wiki/edges change (debounced, fail-soft),
so the "everything communicates" substrate stays live without manual `regen-viz`. It is the connector that makes
#4/#5 outputs actually discoverable, and it is a prerequisite for the octopus/PSN/RBA stack to reason over fresh
state. #1 (reason-before-action) is the highest-INTENT match but is blocked on a prioritized inference lane —
sequence it after the lane exists.

_Persisted by slot:india. Recall: `prism_memory:semantic_search query="neural network of everything assessment"`._
