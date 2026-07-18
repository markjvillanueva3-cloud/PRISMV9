# TOOLBELT.md — slot:india (ai-training) tool-call efficiency

> The exact Grep/Glob/Bash/Read/git/dispatcher patterns slot:india reaches for most. Memoized so future sessions don't re-derive. Each entry beats the naive alternative on tokens or time.
> Maintainer: slot:india. Established 2026-05-28.

## Glob patterns (deterministic, cheap — prefer over broad Agent search)
- `H:\prism\mcp-server\src\engines\*LoRA*.ts` | ~95 files | the whole LoRA stack in one call
- `H:\prism\mcp-server\src\engines\*{Outcome,Calibration,Conformal,Drift,Reward}*.ts` | ~50 | closed-loop backbone
- `H:\prism\mcp-server\src\engines\*{Reasoning,RAG,Embedder}*.ts` | ~50 | reasoning + RAG layer
- `H:\prism\scripts\lib\graphsage-*.mjs` | 5 (+5 tests) | GNN core
- `H:\prism\scripts\nn-graph-*.mjs` + `H:\prism\scripts\nn-*.mjs` | retrain lifecycle + eval refresh
- `H:\prism\scripts\*{train,embed,nn-}*.mjs` | ~60 | every training/embedding pipeline
- `H:\prism\state\shared\nn-graph\*` | 11 | all NN state in one call
- ⚠ NEVER `**` from repo root (hook blocks broad globs) — anchor to `mcp-server\src\engines\` or `scripts\`.

## Grep patterns
- `case ["']\w+["']\s*:` | a dispatcher `.ts` | counts real actions (DISPATCHER_DIGEST shows 0 for spread-array enums — known parser bug)
- `xproc_(neural|outcome|calibration|conformal)` | `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts` | locate closed-loop action wiring
- `AUROC|macro.?F1|Brier` | `scripts/lib/nn-graph-eval.mjs` + `state/shared/nn-graph/NN-EVAL.json` | find the deploy gate values

## Read offset+limit cheatsheet
- `state/shared/nn-graph/NN-EVAL.md` | small — read full | latest gate verdict
- Any dispatcher `.ts` | `offset` to the `case "<action>"` line | skip 5-15K-token preamble
- `MEMORY.md` / digests | use `prism_session:master_index_query` instead (10-50K raw)

## Bash one-liners (RTK-wrapped)
- `rtk node scripts/lib/nn-graph-eval.mjs` | eval the live checkpoint vs gate
- `rtk node scripts/nn-graph-retrain-lifecycle.mjs --status` | retrain cadence + last promotion
- `rtk node scripts/nn-eval-refresh.mjs` | regenerate NN-EVAL.{md,json}
- `rtk git log --oneline -5` | 59% vs raw

## git (RTK-wrapped — commit in THIS worktree H:/prism-slot-india)
- `rtk git add mcp-server/src/engines/ai-training/ state/shared/slot-souls/india.md`
- `rtk git commit -m "[india] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-INDIA: ..."`
- ⚠ Commit ONLY in `H:/prism-slot-india` (slot/india). Shared-tree (`H:/prism`) commits absorb peers — see [[feedback_commit_to_slot_worktree]].

## prism_* dispatcher actions used most (faster + structured vs Grep)
- `prism_session:master_index_query keyword="<noun>"` | ranked top-K over 110K-node graph + wiki + memory — FIRST resort before Grep/Glob
- `prism_session:dispatcher_map_compact` | full dispatcher list (action counts may read 0 — spread-enum parser bug)
- `prism_memory:memory_search query="<domain>" limit=20` | the master-brain PULL (CONN-1); seeds MEMORY.md `## High-ROI memories`
- `prism_knowledge:tribal_search query="..."` + `tribal_capture {slot:'india', tip, context, citation}` | tribal RAG read/write
- `prism_ai:` actions — `xproc_neural_*` (train/predict/eval), `xproc_outcome_*`, `xproc_calibration_monitor_*`, `xproc_conformal_*`, `lora_drift_*`, `consensus_*`, `cascade_*`
- `prism_outcome:` actions — `capture_bus_*`, `outcome_*`, `replay_*`, `rl_bridge_*`, `drift_*`, `episodic_*` (closed-loop backbone)

## Session note (2026-05-28)
- **Subagents (Agent tool + Workflow) are credit-blocked** on the 1M-context model (`Usage credits required for 1M context`). Do inventory + scrutiny inline; surface the blockage (R12). The scrutiny-gate reviewer agents will also fail — note in handoff, rely on the 3-attempt auto-pass escape hatch + rigorous self-review.

<!-- OPERATIONAL-CONTEXT (auto-wired by scripts/wire-galaxies-to-operational-context.mjs -- regenerate, do not hand-edit) -->
## OPERATIONAL CONTEXT (PC specs / Ollama / loops / vault / LoRA-CAG-RAG -- auto-wired)
- **Hardware (size every build to it):** RTX PRO 6000 Blackwell 96GB VRAM, Ryzen 9 9950X3D 32T, ~127GB RAM. Canonical: `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md` (cite, do not restate -- it drifts otherwise).
- **Ollama utilization (offload here; reserve Claude for deep reasoning + safety):** code explain/review/lint -> `qwen2.5-coder:32b`; deep local reasoning -> `gpt-oss:120b` (65GB, fits resident on the 96GB card); trivial -> `qwen2.5-coder:1.5b`. Full roster + when-to-use each tier: [[prism-methodology-foundations]] section 1.
- **How to run loops:** [[agent-loop-design-rules]] (CLOSED-loop, eval-gate every iter, each pass feeds the next, BUDGET is a stop condition). **Obsidian vault (PSN brain):** [[feedback-obsidian-brain]] (recall before re-deriving; auto-fed every Stop). **Harnesses / LoRA / CAG / RAG:** [[prism-methodology-foundations]] (orchestrator/specialist/subagent split; arXiv-grounded).
- **Tool stack + on-disk versions (tool upgrades / features):** see this galaxy's PATHS.md / TOOLBELT.md for its tool + library stack.
- **This domain's knowledge layers (auto-invoked via wiki-precheck-inject when relevant):** [[ai-training-foundations]] / [[ai-training-source-atlas]] / [[ai-training-applied-practice]].
- **Resource roots (easy access):** this galaxy's PATHS.md + `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` (H:/PRISM/resources, JM DIE, Docustrata) (owner: india).
<!-- /OPERATIONAL-CONTEXT -->
