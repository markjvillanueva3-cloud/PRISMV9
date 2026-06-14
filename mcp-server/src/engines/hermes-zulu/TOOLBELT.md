# Hermes-Zulu TOOLBELT.md — tool-call efficiency for slot:bravo

The exact patterns bravo reaches for, memoized so future sessions don't re-derive them. Each entry saves tokens or time vs. the naive alternative.

## Glob patterns (narrow, path-scoped — NEVER bare-root recursive)
- `*{zulu,hermes,stub,slot-soul,slot-context,slot-task}*` | path `H:/prism/.claude/hooks` | ~9 hits | find galaxy hooks
- `*{bravo,zulu,stub,wire-unwired,orphan,unwired,dispatcher-coverage,reap}*` | path `H:/prism/.claude/commands` | ~19 | find galaxy skills
- `*{stub,unwired,orphan,galaxy-buildout,build-state,close-out}*` | path `H:/prism/scripts` | ~50 | find stub/wiring scripts
- `*{Moonshot,Hermes,Zulu}*` | path `H:/prism/mcp-server/src/engines` | ~9 | find galaxy engines
- `*` | path `H:/prism/mcp-server/src/engines/<galaxy>` | 2-4 | check if a galaxy exists/complete BEFORE rebuilding (R8)
> Brace-expansion `{a,b,c}` keeps one glob where you'd otherwise run N. ALWAYS pass `path` (absolute H:/prism) — bare-root recursive globs trip the broad-glob hook + return 1000s of files.

## Read offset+limit cheatsheet
- `ENGINE_DIGEST.md` / `DISPATCHER_DIGEST.md` / `MEMORY.md` / `CLAUDE.md` | use `master_index_query` or `offset`/`limit` | these return 10-50K tokens raw — never full-read
- existing galaxy `CLAUDE.md`/`MEMORY.md` | full-read OK | <100 lines, you must see all of it to superset correctly

## prism_* dispatcher actions used most
- `prism_session:dispatcher_map_compact` | `{}` | hermes-zulu has no NAMED dispatcher, but its C2 engines ARE wired as `prism_session` actions (below) — the surface is `prism_session` + hooks/helpers/skills
- **hermes-zulu's OWN `prism_session` actions** (the galaxy's invocable C2 surface):
  - `zulu_authority_check` | `{request:{slot,task_text,operation}, soul}` | READ-ONLY authority verdict (ZuluFleetGovernorEngine; U-ZULU-GOVERNOR-WIRE). `_render` → markdown.
  - `zulu_task_auction` | `{request, souls}` | soul-weighted sealed-bid work-order auction (ZuluTaskAuctionEngine). `_render` → markdown.
  - `hermes_fanout_plan` / `hermes_file_scope_partition` / `hermes_budget_estimate` / `hermes_verdict_aggregate` / `hermes_self_correct` | parallel-agent fan-out planning + budget + verdict + self-correction (+ `_render` siblings)
  - `dream_scan` | `{source}` → `{markers,malformed,total_lines_scanned}` (slimResponse drops empty arrays) | offline `DREAM:` marker parse (DreamMarkerScannerEngine; U-DREAM-SCANNER-WIRE). `dream_markers_to_proposals` `{markers,opts}` → adapter into the DreamArtifactBundle receipt surface (`dream_propose/status/diff/validate/apply/discard`).
  - `soul_consensus_analyze` / `soul_aware_fanout_extend` / `doctrine_draft` | cross-soul doctrine + soul-aware fan-out + CLAUDE.md doctrine draft (+ `_render`)
- `prism_session:master_index_query` | `{keyword:"<ONE distinctive word>"}` | ⚠ multi-word stopword-heavy queries filter to empty ("query produced no tokens") — pass ONE distinctive token (e.g. `hermesselfcorrection`), not a sentence
- `prism_knowledge:tribal_capture` | `{slot:'bravo', tip, context, citation}` | the ONLY way to add tribal tips (never raw markdown — auto-overwritten on regen)
- `prism_memory:semantic_search` | `{query, topK}` | ⚠ returns `{ok:false, qdrant not connected}` when qdrant down (2026-05-28) → fall back to the memory-relevance Write-hook index + master MEMORY.md `## Indexed memories`

## Helper CLIs (RTK-wrap; bookend every /loop)
- `rtk node .claude/helpers/loop-state.mjs start --session <sid> --task "<t>" --target N` | begin a resumable /loop
- `rtk node .claude/helpers/loop-state.mjs tick --session <sid> --status ok --note "<one-line>"` | per-iter checkpoint (R10)
- `rtk node .claude/helpers/loop-state.mjs end --session <sid> --reason done` | finish
- `rtk node .claude/helpers/chat-slots.mjs golf-liveness` | classify slot liveness `{status,isAlive,ageMs}`
- `rtk node .claude/helpers/slot-task-claim.mjs {claim|release|heartbeat|list|check|sweep}` | per-slot UNIT lock
- `rtk node .claude/helpers/per-agent-handoff.mjs read --terminal <stable>` | read THIS chat's handoff
- `node scripts/reconcile-zulu-ledger.mjs [--json] [--strict]` | **RUN FIRST at context-regain** — deterministic SHIPPED/OPEN/COVERED/UNKNOWN verdict per ZULU-MASTER-CONTEXT-LEDGER claim ($0, Ollama+fs probes); the hand-curated ledger rots in hours on a high-velocity fleet, so reconcile before trusting its ROI order. Sidecar `state/shared/specs/ZULU-LEDGER-RECONCILE-LATEST.json`. Wiki [[zulu-ledger-reconciler]].

## Dynamic-Workflow planning (the "coder brain" — 0xCodez 6-patterns doctrine)
- `rtk node scripts/lib/hermes-workflow-planner.mjs "<task>"` | human plan: workflow-vs-session verdict + pattern composition + per-stage model/isolation/barrier + quarantine + token-budget/goal/loop
- `rtk node scripts/lib/hermes-workflow-planner.mjs "<task>" --json` | machine plan (Hermes Python backend shells out + parses to shape its kanban dispatch)
- `rtk node scripts/lib/hermes-workflow-planner.mjs "<task>" --emit` | EMIT a runnable PRISM Workflow harness skeleton (meta + phase/agent/parallel/pipeline/loop) from the plan — "Claude writes the harness for you" (step 14: a TEMPLATE to adapt, `TODO:` markers = the fill-in points)
- `import { planWorkflow, emitWorkflowScript, detectFailureModes, selectPatterns } from "scripts/lib/hermes-workflow-planner.mjs"` | pure API for in-process callers (43 tests; emitted harness is node --check-valid in the Workflow async context)
- Doctrine: failure-mode → pattern — **drift→fan-out · self-preference→adversarial-verify · open-ended→loop · hard-to-score→tournament**. Stages map 1:1 onto PRISM's **Workflow tool** (`agent`/`parallel`/`pipeline`). Skill: `/hermes-workflow`. Source article: x.com/0xCodez/status/2062127385923776831.
- Gate FIRST (anti-pattern #1): if the planner says `useWorkflow:false`, run a normal session — most coding tasks don't need a 5-reviewer panel.

## git (RTK-wrapped; lane-safe)
- `rtk git status` / `rtk git diff` / `rtk git log` | 59-80% token reduction
- `git add mcp-server/src/engines/hermes-zulu/ state/shared/slot-souls/bravo.md .claude/commands/stub-hunt-bravo.md` | **PATH-SCOPED** — NEVER `git add -A` (worktree has thousands of unrelated uncommitted files)
- commit `[bravo] [SCOPE]/U-ID: title` in `H:/prism-slot-bravo` on `slot/bravo` — golf integrates to `cad-fusion-live-ms0`
- old version of a file without clobbering peers → `git show <ref>:<path>` (NEVER `git stash` in a shared tree)

## Bash discipline
- Prefer dedicated tools (Glob/Grep/Read) over `find`/`grep`/`cat`.
- RTK-prefix every `node` call — bare `node` is the top uncaptured token spend (~9.6K/session).
- Stay in the worktree CWD `H:/prism-slot-bravo`; read-only cross-tree reads of `H:/prism` are allowed, writes are lane-blocked.

<!-- OPERATIONAL-CONTEXT (auto-wired by scripts/wire-galaxies-to-operational-context.mjs -- regenerate, do not hand-edit) -->
## OPERATIONAL CONTEXT (PC specs / Ollama / loops / vault / LoRA-CAG-RAG -- auto-wired)
- **Hardware (size every build to it):** RTX PRO 6000 Blackwell 96GB VRAM, Ryzen 9 9950X3D 32T, ~127GB RAM. Canonical: `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md` (cite, do not restate -- it drifts otherwise).
- **Ollama utilization (offload here; reserve Claude for deep reasoning + safety):** code explain/review/lint -> `qwen2.5-coder:32b`; deep local reasoning -> `gpt-oss:120b` (65GB, fits resident on the 96GB card); trivial -> `qwen2.5-coder:1.5b`. Full roster + when-to-use each tier: [[prism-methodology-foundations]] section 1.
- **How to run loops:** [[agent-loop-design-rules]] (CLOSED-loop, eval-gate every iter, each pass feeds the next, BUDGET is a stop condition). **Obsidian vault (PSN brain):** [[feedback-obsidian-brain]] (recall before re-deriving; auto-fed every Stop). **Harnesses / LoRA / CAG / RAG:** [[prism-methodology-foundations]] (orchestrator/specialist/subagent split; arXiv-grounded).
- **Tool stack + on-disk versions (tool upgrades / features):** see this galaxy's PATHS.md / TOOLBELT.md for its tool + library stack.
- **This domain's knowledge layers (auto-invoked via wiki-precheck-inject when relevant):** [[hermes-zulu-foundations]] / [[hermes-zulu-source-atlas]] / [[hermes-zulu-applied-practice]].
- **Resource roots (easy access):** this galaxy's PATHS.md + `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` (H:/PRISM/resources, JM DIE, Docustrata) (owner: zebra).
<!-- /OPERATIONAL-CONTEXT -->
