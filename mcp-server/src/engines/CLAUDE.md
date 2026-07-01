# Engines Baseline CLAUDE.md — dev/build/research/code/learn baseline (2026-05-27, slot:alpha)

> **Cascade position:** root `H:/prism/CLAUDE.md` → THIS FILE → per-galaxy `mill/CLAUDE.md`, `lathe/CLAUDE.md`, etc. This is the BASELINE inherited by every galaxy. Per-galaxy files OVERRIDE specific gotchas; doctrine here is universal.
>
> **§1-7** below = dev/build/research/coding/mistake-learning/token-saving/context-retention discipline (added 2026-05-27 per operator directive). **§8** below = engine-coding conventions (AtomicValue schema, calculation patterns) — preserved from earlier authorship; do NOT delete, both layers cascade.

---

## 1. Before you write code — search-first discipline

Karpathy R8 + Bibryam #1 + PRISM dedup-guard converge to the same rule:

```
1. /master-index <query>                 ← unified system-viz + wiki + memory + BUILD_STATE
2. grep ENGINE_DIGEST.md for similar      ← 1-line index of every engine
3. duplicationGuardEngine.checkBeforeCreating({type, name, keywords, description})
4. If `shouldProceed:false` → USE the match[0], don't create
5. If creating: invoke the right galaxy template (mill=fully-populated example)
```

**R8 — read before you write.** Before adding to a file: read its exports + the immediate caller + obvious shared utilities. Don't understand why existing code is shaped that way? Ask first. "Looks orthogonal to me" is the most dangerous phrase in the repo.

**Anti-reinvention check:** PRISM runs 25 official Anthropic plugins. Before forging a generic skill (lint/format/git/lsp/review/doc/test scaffold) → `/plugin marketplace list | grep`. Build only if it touches PRISM-specific state (slot, scrutiny ledger, milestone envelope, physics constants, JM-Die corpus, prism_* dispatcher).

---

## 2. Token-saving heuristics (every prompt)

| Action | Saves |
|--------|-------|
| Parallel independent tool calls in ONE message | ~30% per multi-step task |
| `rtk` prefix on bash (git/gh/npm/vitest/tsc/docker) | 60-90% on verbose output |
| `Read` with `offset`/`limit` on >500 line files | proportional to skip |
| MCP dispatcher action > reimplementation | ~80% vs ad-hoc Bash |
| `Glob`/`Grep` over `find`/`grep` | 2-5x faster, less context |
| Don't re-read files you just edited (harness tracks state) | full Read cost |
| Delegate broad research to Agent w/ Explore subagent | preserves main context |
| Skip route-nudges that don't apply (file-tree contention, shell-only ops) | nudge overhead |
| Glob timeout >5s = noise-filter the path per `state/shared/specs/PRISM-NOISE-PATHS-2026-05-26.md` | full re-scan |
| Per-galaxy CLAUDE.md auto-load | 5-8K tokens/SessionStart × 26 slots when root compresses |

**Token-budget posture per zone:**
- 🟢 GREEN (<25%) — exploratory subagents OK, broad scans OK
- 🟡 YELLOW (25-65%) — batch tool calls, prefer local lib over agent, avoid speculative reads
- 🔴 RED (>65%) — `/precompact` + commit + handoff; don't start new units

Slot context bundle (auto-injected per prompt) carries the zone — read it.

---

## 3. Context-retention patterns

When work spans multiple sessions or chats:

- **Per-chat handoff:** every chat writes `state/shared/handoffs/HANDOFF-<id>-<topic>.md` via `/handoff` or `/precompact`. NEVER write to `state/HANDOFF.md` (legacy singular). Topic suffix mandatory — `enforce-handoff-topic.mjs` Stop hook renames topicless files.
- **Per-slot soul:** `.claude/slot-souls/<slot>.md` carries the personality + refuse-list + domain-filter for the chat. Hermes layer per U-HERMES02.
- **Per-galaxy CLAUDE.md:** this directory's siblings (`mill/`, `lathe/`, etc.) — local doctrine that loads only when CWD-relevant.
- **Per-galaxy MEMORY.md:** stub indexes today; awaiting `U-GALAXY-MS1-C1` migration that populates `knowledge/memories/<galaxy>/{feedback,reference,project}/` from the 641 flat memories.
- **Auto-memory:** writes to `C:/Users/wompu/.claude/projects/H--PRISM/memory/*.md` auto-feed to `H:/prism/knowledge/memories/` via Stop hook (`feedback_auto_memory_feeds_obsidian_stophook`).
- **Obsidian vault:** Stop-hook + linter post-processing add `aliases:` frontmatter + `## Related` wikilink block. Bidirectional vault (Obsidian-side edits flowing back to C:) is HMEMV04-06 in `mcp-server/data/milestones/HERMES-MEMORY-VAULT-MS0.json` — **NOT YET BUILT** (biggest dormant-X-article miss per SCOPE-EXPANSION §Q4 #1).
- **Wiki:** `knowledge/wiki/` (Karpathy LLM-Wiki pattern). Query `wiki/index.md` BEFORE re-deriving from physics/code. Ollama owns ≥70% of wiki maintenance.
- **AI reasoning over the above (PSN leg #10) — synergized fleet-wide:** all the per-galaxy surfaces above — `SOUL.md` + `CLAUDE.md` + `MEMORY.md` + `AWARENESS.md` + the `<galaxy>_synthesis.md` Obsidian vault brain — are read by the **galaxy-reasoning-bridge** (`scripts/lib/galaxy-reasoning-bridge.mjs`; CLI `node scripts/lib/galaxy-reasoning-bridge.mjs <galaxy> "<question>"`) so ANY galaxy reasons over its OWN doctrine via local Ollama, $0. As of `U-FLOR-HYBRID-DEFAULT` (2026-06-10, `52b83b819f`) the **dense/hybrid RAG arm is ON by default** (sparse retrieve → nomic-embed rerank → RRF-fuse; opt-out `PRISM_GALAXY_RAG_DENSE=0`), with CAG answer-caching + opt-in LoRA-pair emit (`PRISM_GALAXY_BRIDGE_LORA_EMIT=1`). One build-once asset serves all 34 galaxies — this is how souls/vault/memories/wikis are synergized with the AI stack per galaxy.

---

## 4. Learning from mistakes (the unified loop)

Per `feedback_always_capture_lessons` + `feedback_always_update_wiki_on_bug_finding`:

```
1. Bug observed → root-cause investigated (don't just patch the symptom)
2. Write reference_*_bug|fix|regression_*.md memory file (the WHY, not the diff)
3. Append to CLAUDE.md ## Recent regressions list (one-line, links to commit)
4. If pattern-generalizable → write feedback_*.md standing-doctrine memory
5. If wiki entry exists for the affected component → update it (bug-finding wiki gate)
6. Auto-feed runs at Stop → C: → H: → Obsidian
7. PSN-leg recall surfaces the lesson to future chats via memory_search MCP
```

**R12 — fail loud.** Can't be sure it worked → say so explicitly. "Migration completed" is a lie if 30 records were skipped. "Tests pass" is a lie if you `.skip`-ped any.

**Per-file scrutiny gate:** multi-file builds → 2 parallel reviewer agents PER FILE before the next file. End-of-task 3-of-3 scrutiny is a SEPARATE gate, not a replacement.

---

## 5. Build / test / commit discipline

- **Always import physics constants from `mcp-server/src/physics/constants.ts`** — `stop_on_inlined_constants.mjs` enforces. Per-galaxy CLAUDE.md repeats the canonical kc1.1 ISO map but ALWAYS imports.
- **Engine tests go in `mcp-server/src/__tests__/`** — `stop_on_unwired_assets.mjs` scans ONLY this dir. `src/engines/__tests__/` is NOT scanned.
- **NodeNext module resolution:** import paths in .ts files MUST carry `.js` suffix (`import { X } from "../physics/constants.js"`).
- **`comprehensive-build-enforce` hook BLOCKS** stub engines + placeholder returns + `.skip`-ped tests + empty catch + TODO/FIXME in shipped code. Don't try to bypass.
- **Commit format:** `[SCOPE]/U-ID: title` — pre-commit hook validates. Multi-line commit messages via HEREDOC.
- **Multi-slot commits:** on shared `H:/prism` tree, prefix `[MAIN]` per `feedback_commit_prefix_main_on_shared_tree`. Slot-worktree commits use `[<slot>]`.
- **Lock contention:** if `.git/index.lock` exists and is held >30s by peer slot → wait, don't delete. Retry loop pattern: `for i in $(seq 1 10); do if [ ! -e .git/index.lock ]; then break; fi; sleep 3; done`.

---

## 6. When to install vs build (the new policy)

Per SCOPE-EXPANSION-OPERATOR-7-DIRECTIVES-2026-05-26.md §Q5:

> **Install** if the asset is domain-agnostic + stateless + has a 1:1 marketplace match.
> **Build** if it touches PRISM-specific state (slot, scrutiny ledger, milestone envelope, physics constants, JM-Die corpus, or any `prism_*` dispatcher).

PRISM already runs 25 official Anthropic plugins (superpowers, hookify, code-review, pr-review-toolkit, claude-md-management, 4 LSPs, context7, serena, github, playwright, supabase, linear, figma, greptile, frontend-design, claude-code-setup, code-simplifier). Recommended add: `wshobson/agents` (75+ free unreplicated agents).

---

## 7. Cross-galaxy edges + MULTI-DOMAIN ACCESS (this baseline → per-galaxy)

**MULTI-DOMAIN FLEET POLICY (operator directive 2026-06-30 — supersedes domain-bound restrictions).**
Every chat slot now has **full access to the codebase** and may read, reason over, and work in **ANY galaxy/domain** — not only its specialty. The per-galaxy "Owns / EXCLUDES" sections below and in each galaxy CLAUDE.md are now **leadership + preference statements** ("this slot LEADS this domain; it does not OWN-to-the-exclusion-of-others"), NOT walls. Canonical: `state/shared/CHAT-SLOT-DOMAINS.md` (`ANY_DOMAIN_SLOTS` = all 26). Souls carry `codebase_access: full` + `multi_domain: true`.

- **Prefer own domain first** — lead your specialty by default; take cross-domain work when it serves the operator's goal or when your own queue is dry (never idle).
- **Worktree/lane isolation is UNCHANGED** — `git-add-lane-guard`, `pre-edit-lane-guard`, `main-tree-write-block`, `slot-commit-worktree-enforce` gate which git **tree** you commit from, NOT which domain. Cross-domain work on the shared trunk lands via `[MAIN-FORCE]`.
- **Coordinate** cross-domain work via chat-bus + `[MAIN-FORCE]` commits so a peer slot does not double-build the same artifact. The conflict-fork rule (no two slots edit the same file concurrently) still applies.

When work crosses 2+ galaxies (mill-turn bridge, ERP work order from quoting, etc.):
- **Surface the cross-galaxy nature explicitly** (R7 surface-don't-average)
- **Load BOTH galaxy CLAUDE.md** sentinels (cascade walks both adjacents)
- **Cross-galaxy memories** live under `knowledge/memories/cross-galaxy/<bridge>/` (proposed by U-GALAXY-MS1-C1 migration)
- **U-GALAXY-MS1-F2-PRE-WRITE-CROSS-GALAXY-WARN** hook (proposed) flags multi-galaxy edits as a smell (advisory now, not a block — multi-domain is sanctioned)

---

## 8. Engine-coding conventions (PRESERVED from prior authorship — domain rules for this directory)

### Engine Conventions
- Every engine extends BaseEngine or implements IEngine interface
- Engines are pure calculation — no I/O, no state mutation
- All return types use AtomicValue schema: `{ value, unit, uncertainty, source }`
- Never return bare numbers. Always: `{ value: 245.3, unit: "N", uncertainty: 12.1, source: "kienzle" }`

### AtomicValue Schema (MANDATORY for all calculations)
```typescript
interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;       // absolute, same unit
  confidence?: number;       // 0-1
  source: string;            // calculation method name
  warning?: string;          // edge-case flags
}
```

### Calculation Patterns
- Force/power: Use Kienzle model (kc1_1, mc coefficients from material registry)
- Tool life: Taylor equation (C, n exponents from tool registry)
- Flow stress: Johnson-Cook model (A, B, C, m, n params from material)
- Uncertainty propagation: RSS (root-sum-square) for independent variables
- Safety factor: always applied AFTER uncertainty, never before

### Key Engines (150 active exports, 68 unwired on disk — counts rot; read `data/docs/ENGINE_DIGEST.md` for live)
- Manufacturing Intelligence (L2-P1): CuttingForceEngine, ToolLifeEngine, SpeedFeedEngine, ThermalEngine, StabilityEngine, DeflectionEngine, SurfaceFinishEngine, etc.
- CAD/CAM (L2-P2): ToolpathEngine, PostProcessorEngine, CadValidationEngine, etc.
- Infrastructure (L2-P3): SafetyEngine (S(x) scoring, hard block <0.70), CoolantValidationEngine, ComplianceEngine, TelemetryEngine, etc.
- Specialty (L2-P4): ThreadEngine, GrindingEngine, EDMEngine, FiveAxisEngine, etc.
- Orchestration: RoadmapExecutor, SwarmExecutor, AgentExecutor, SkillExecutor, HookEngine

---

## Cross-refs

- Root: [`/CLAUDE.md`](../../../CLAUDE.md) — universal doctrine that overrides this
- Sister doctrine: [`/state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md), [`SCOPE-EXPANSION-OPERATOR-7-DIRECTIVES-2026-05-26.md`](../../../state/shared/specs/SCOPE-EXPANSION-OPERATOR-7-DIRECTIVES-2026-05-26.md)
- Galaxy children: `./mill/CLAUDE.md`, `./lathe/CLAUDE.md`, `./wedm/CLAUDE.md`, `./quoting/CLAUDE.md`, `./business/CLAUDE.md`, `./academy/CLAUDE.md`, `./post-processor/CLAUDE.md`
- Baseline memory: [`./MEMORY.md`](MEMORY.md) — companion mistake/token/context memory index
- [[reference_domain_galaxy_doctrine_2026_05_26]] · [[feedback_always_capture_lessons]] · [[feedback_psn_definition]] · [[reference_claude_md_compress_2026_05_20]] (golf-only root edits)
