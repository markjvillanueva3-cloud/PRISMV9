# backend-helper galaxy — TOOLBELT (auto-derived baseline)

> **Auto-derived baseline** by `scripts/galaxy-scaffold-pt.mjs` (slot:alpha, 2026-05-29) — owning slot enriches with domain-specific tool-call patterns. Companion: [`PATHS.md`](./PATHS.md).

## Shared token-lean patterns (apply to every galaxy)
- **Route before Grep** — `prism_session:master_index_query` answers most "where is X?" in one call; Grep/Glob is the <0.5-confidence fallback.
- **Ollama-offload before Claude** — code explain / summarize / docstring / classify / lint → local qwen2.5-coder via the `/ollama-*` skills; reserve Claude for deep reasoning + safety.
- **RTK on noisy bash** — prefix `rtk` on git/gh/npm/tsc/vitest/docker (60-99% output reduction); skip only when output <500 chars.
- **Parallel independent tool calls** — batch independent reads/greps in one message (one round-trip).
- **Read offset/limit** for large files; don't re-read a file already in this turn's context.

## This galaxy's dispatchers (from CLAUDE.md)
- `prism_knowledge` — domain action surface

## Karpathy 5-step (before any code)
1. CLASSIFY (search/state/parse/cache/validate/transform) → 2. TECHNIQUE (hash vs tree, FSM vs reducer, Promise.all vs sequential) → 3. EDGE CASES (empty, null, NaN, unicode, timeout, concurrent) → 4. FAILURE MODES (network, disk, OOM, race, invalid state) → 5. write code handling ALL of the above from line 1.

_Source: galaxy-scaffold-pt.mjs. Honest baseline — owning slot enriches with real domain patterns._

<!-- OPERATIONAL-CONTEXT (auto-wired by scripts/wire-galaxies-to-operational-context.mjs -- regenerate, do not hand-edit) -->
## OPERATIONAL CONTEXT (PC specs / Ollama / loops / vault / LoRA-CAG-RAG -- auto-wired)
- **Hardware (size every build to it):** RTX PRO 6000 Blackwell 96GB VRAM, Ryzen 9 9950X3D 32T, ~127GB RAM. Canonical: `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md` (cite, do not restate -- it drifts otherwise).
- **Ollama utilization (offload here; reserve Claude for deep reasoning + safety):** code explain/review/lint -> `qwen2.5-coder:32b`; deep local reasoning -> `gpt-oss:120b` (65GB, fits resident on the 96GB card); trivial -> `qwen2.5-coder:1.5b`. Full roster + when-to-use each tier: [[prism-methodology-foundations]] section 1.
- **How to run loops:** [[agent-loop-design-rules]] (CLOSED-loop, eval-gate every iter, each pass feeds the next, BUDGET is a stop condition). **Obsidian vault (PSN brain):** [[feedback-obsidian-brain]] (recall before re-deriving; auto-fed every Stop). **Harnesses / LoRA / CAG / RAG:** [[prism-methodology-foundations]] (orchestrator/specialist/subagent split; arXiv-grounded).
- **Tool stack + on-disk versions (tool upgrades / features):** see this galaxy's PATHS.md / TOOLBELT.md for its tool + library stack.
- **This domain's knowledge layers (auto-invoked via wiki-precheck-inject when relevant):** [[backend-helper-foundations]] / [[backend-helper-source-atlas]] / [[backend-helper-applied-practice]].
- **Resource roots (easy access):** this galaxy's PATHS.md + `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` (H:/PRISM/resources, JM DIE, Docustrata) (owner: papa).
<!-- /OPERATIONAL-CONTEXT -->
