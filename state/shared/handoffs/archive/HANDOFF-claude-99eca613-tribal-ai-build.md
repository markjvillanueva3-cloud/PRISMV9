---
session_id: claude-99eca613
topic: tribal-ai-build
written_at: 2026-05-09T03:10:00Z
source: live-chat
written_by_skill: precompact
---

## RESUME

Continue TRIBAL × AI build. Architecture: `H:/prism/state/shared/TRIBAL-AI-CROSS-SYSTEM-INTEGRATION.md`.

**ALREADY SHIPPED this session:**
- L1: `H:/prism/.claude/scripts/tribal-embed-index.mjs` (Ollama nomic-embed-text @ 127.0.0.1:11434, 768-dim, walks wiki+memories+extraction-log, atomic write, --bootstrap/--update/--query/--add/--stats subcommands)
- L6: `H:/prism/.claude/hooks/tribal-autowire.mjs` (PostToolUse hook, calls L1 --add when knowledge/{wiki,memories}/*.md is touched)

**BUILD NEXT in this exact dependency order — do NOT reorder:**

1. **L2 `tribal-rerank.mjs`** at `H:/prism/.claude/scripts/`. Reads `state/shared/tribal-embed-index.json`, embeds the query via Ollama, returns top-N. Domain-aware: accept `--domain <mill|lathe|wedm|...>` arg and 2× weight in-domain entries. Citation-log emit on every call.

2. **`tribal-obsidian-mirror.mjs`** at `H:/prism/.claude/scripts/`. Discover vault path: try (a) read `H:/prism/state/shared/system-viz/obsidian-augmentation.json` for any `vaultPath` field, (b) common Windows paths `H:/Obsidian`, `C:/Users/wompu/Documents/Obsidian Vault`, (c) check `OBSIDIAN_VAULT` env var, (d) fall back skip-with-warning. Walk `*.md`, call L1 `--add` for each.

3. **L4 `tribal-inject-on-edit.mjs`** at `H:/prism/.claude/hooks/`. PreToolUse hook. Trigger only on Edit|Write|MultiEdit AND file path matches `src/engines/|src/tools/dispatchers/|src/algorithms/|.claude/scripts/|.claude/hooks/`. Calls L2 with file basename + first 200 chars of file content as query. Emits top-3 citations as `additionalContext` (≤200 tokens hard cap).

4. **`tribal-density-router-bridge.mjs`** at `H:/prism/.claude/scripts/` (~60 LOC). Reads index, counts entries per domain. CLI `--domain <name>` returns count + cheap/escalate verdict (≥20 cheap, <5 escalate, else mixed).

5. **`tribal-tier2-precontext.mjs`** at `H:/prism/.claude/scripts/` (~100 LOC). Middleware shim — given a domain + task description, returns top-3 tribal entries formatted for FullSystemAICoordinator dispatch precontext.

6. **Wire into `H:/.claude/settings.json`:**
   - PreToolUse → matcher `Edit|Write|MultiEdit` → add `H:/prism/.claude/hooks/tribal-inject-on-edit.mjs`
   - PostToolUse → matcher `Edit|Write|MultiEdit` (already exists, has 27 hooks) → add `H:/prism/.claude/hooks/tribal-autowire.mjs`
   - Hourly cron → `tribal-obsidian-mirror.mjs`

7. **Bootstrap:** `node H:/prism/.claude/scripts/tribal-embed-index.mjs --bootstrap` (~2 min, ~1200 entries).

8. **Smoke-test:** `node H:/prism/.claude/scripts/tribal-embed-index.mjs --query "chatter thin wall"` — should return mill+lathe entries about chatter.

## STATE

This session shipped:
- `state/shared/PIPELINE-ASSESSMENT-2026-05-09.md` (5-agent synthesis; Codex/Gemini CLIs not installed locally)
- 4 v6.1 artifacts: `atomic-roadmap-emit.mjs`, `ai-priority-rank.mjs`, `conflict-predict.mjs`, `telemetry-autofire.mjs` (last is wired into settings.json `PostToolUse` blocks `Edit|Write|MultiEdit` and `Bash|Read`)
- 7 ROI enhancements: smart cache in atomic-roadmap-emit; `pipeline-telemetry zero-records` cmd; `/six-chat-ready` skill; `adaptive-thresholds --trajectory` + `adaptive-thresholds-history.jsonl`; `auto-build-compounding-proposals --batch`; `envelope-sync-auto.mjs`; `telemetry-backfill.mjs`
- `rgs6.md` doctrine update: AI-PRIORITY LAW + S2.5 stage + 4 new arg routes
- 3 architecture docs: `TRIBAL-KNOWLEDGE-LEVERAGE-PLAN.md`, `TRIBAL-AI-ARCHITECTURE.md`, `TRIBAL-AI-CROSS-SYSTEM-INTEGRATION.md`
- L1 + L6 of tribal-ai stack (per Build Next above)

All scripts pass `node --check`. No commits made — work is on `cad-fusion-live-ms0` branch with extensive uncommitted state.

## CONTEXT

**Tribal corpus inventory:** 770 wiki entries + 99 memories (42 feedback + 26 project + 31 reference) + 75 extraction-log entries + 46 WEDM tips + JM Die corpus ≈ 1,200 total.

**Ollama models available** (`curl http://127.0.0.1:11434/api/tags`):
- `nomic-embed-text:latest` (768-dim — USE THIS for embeds)
- `qwen2.5-coder:14b`
- `deepseek-r1:14b`

**Engines already wired** (per inventory): `CrossDisciplinaryDeepLearningEngine`, `PRISMCreativeReasoningEngine`, `TribalKnowledgeEngine`, `WikiIndexMaintainerEngine`, `prismSelfAwarenessEngine` (with `searchTribalKnowledge`, `searchPlaybookRules`, `recommendAIFeatures`, `getJMDieCustomerPath`).

**Obsidian already 80% wired:** `OBSIDIAN-COMPOUND-MS1` shipped auto-postmortem + weekly tribal-promotion (commit `8cb790abe`); `OBSIDIAN-CONTENT-MS2` shipped JARVIS 5-pillar stack; `OBSIDIAN-AUTOMATE-MS3` shipped inbox capture-sharpen + 48h prune. The mirror script just registers the vault as a 5th source corpus.

**Peer-chat L5 partner:** `claude-845cf238` is shipping `H:/prism/scripts/distill-tribal.mjs` and `H:/.claude/commands/distill-tribal.md` and editing `H:/prism/WIKI_SCHEMA.md` — that's the L5 distill layer. Hand-off interface: distill emits `wiki/lessons/<milestone>-<sha8>.md`; our L6 autowire picks up via PostToolUse hook automatically. No coordination needed beyond not editing those files.

**LANE DISCIPLINE — DO NOT EDIT:**
- `state/shared/system-viz/**` (claude-0413eca6)
- `scripts/h-drive-*.mjs`, `scripts/merge-*.mjs`, `scripts/system-viz-on-commit.mjs` (claude-0413eca6)
- `scripts/distill-tribal.mjs`, `.claude/commands/distill-tribal.md`, `WIKI_SCHEMA.md` (claude-845cf238)
- `mcp-server/src/tools/dispatchers/{turning,edm,resourceHarvester}*` (claude-cee63f1f)
- `mcp-server/src/schemas/{turning,edm,resourceHarvester}*` (claude-cee63f1f)
- Any file under `H:/PRISM/Docustrata/.index/phase9*` (claude-d9860be8)

**Stay safe in:** `H:/prism/.claude/scripts/`, `H:/prism/.claude/hooks/`, `H:/prism/state/shared/*.md`, `H:/.claude/commands/`, `H:/.claude/settings.json`.

**User's overarching directive (logged for next session):** AI/ML/system-knowledge/dev-tools/deep-reasoning are top priority for the master roadmap. Baked into `rgs6.md` AI-PRIORITY LAW + `ai-priority-rank.mjs` 5-category scoring (system-knowledge, dev-tools, deep-reasoning, deep-learning-ML, ai-systems).

**TaskList state:** #56 (L1) + #58 (L6) completed; #57, #59, #60, #61, #62, #63 still pending — pick up at #57 (L2 tribal-rerank.mjs).

**Tooling note:** Codex + Gemini CLIs are NOT installed on this machine (`codex: command not found`, `gemini: command not found`). 3-way scrutiny will silent-fail until installed. Lower priority than the tribal-ai build.
