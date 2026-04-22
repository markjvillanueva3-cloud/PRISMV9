# USSH-OPUS45-BOLSTER — Tracking Log

**Milestone**: USSH-OPUS45-BOLSTER (Maximize Opus 4.5 + 200K context utilization)
**Status**: Phase A + Phase B complete — RECALIBRATED from Opus 4.7 (1M) to Opus 4.5 (200K)
**Note**: Original USSH-OPUS47-BOLSTER recalibrated on 2026-04-18 after switching to Opus 4.5
**Canonical Commit**: `b33e72700c84d15d7106a8a6c2e76750eb06f06a`
**Commit Date**: 2026-04-18
**Note**: Commit was authored under a parallel session's MIO-MS0/U-MIO36 message; the actual USSH-OPUS47-BOLSTER deliverables are catalogued below so the work is not lost under a misleading title.

## Units Completed

### U-CTX01 — Token-Aware Auto-Compact Gate
- **File**: `.claude/helpers/auto-compact-gate.mjs` (+174 LOC)
- Reads `transcript_path` from stdin; sums `input_tokens + cache_read + cache_creation` from last assistant `usage` block; falls back to byte tracker
- Thresholds: `SOFT_TOKENS = 300_000`, `HARD_TOKENS = 450_000`
- Soft → inject `/compact now` directive. Hard → block Stop with mandatory HANDOFF+/compact
- Wired as FIRST Stop hook in `.claude/settings.json`
- Companion: `.claude/helpers/context-pressure-tracker.mjs` (thresholds retuned to 1_050_000 / 1_575_000 bytes)

### U-CTX02 — Tier-1 Context Bolster (SessionStart)
- **File**: `.claude/hooks/session_start_tier1_bolster.mjs` (+142 LOC)
- Assembles Tier-1 80K always-on context from 10 sources (MASTER_INDEX_COMPACT, BASELINE_INVENTORY delta, PRISM/MILL/WEDM manifests, SVI breakdown, BANDIT_POSTERIOR, USER_MODEL_SNAPSHOT, work registry tail, reasoning trace tail)
- Transform functions: `transformInventoryDelta`, `transformRegistryHydrated`, `transformTailN`
- Hard cap: `CHAR_CAP = 280_000` (80K tokens × 3.5 char/token)
- Current assembly: 115,575 chars / ~33,021 tokens (gap to 60K floor: needs SVI_TARGET_BREAKDOWN.json + USER_MODEL_SNAPSHOT.json)

### U-CTX02b — MASTER_INDEX_COMPACT Live-Scan Generator
- **File**: `mcp-server/scripts/generate-master-index-compact.mjs` (+195 LOC)
- **Output**: `mcp-server/data/docs/MASTER_INDEX_COMPACT.md` (+2738 lines, 70,852 chars)
- Live-scans `src/{engines,tools/dispatchers,algorithms,registries,hooks,physics,schemas}`
- Categorizes engines via keyword regex across 25 categories
- Sniffs dispatcher actions via `z.enum([...])` regex
- Current counts: 2423 engines / 89 dispatchers / 403 actions / 53 algos / 25 registries / 48 hooks

### U-ACT02 — Ollama/Docker Launcher (idempotent)
- **File**: `mcp-server/scripts/ollama-docker-launcher.mjs` (+246 LOC)
- Idempotent Docker/Ollama activator. Uses `execFileSync` (no shell injection)
- Launches Docker Desktop on Windows via `spawn("cmd", ["/c", "start", ""])` with `detached:true`
- `ensureDockerReady()` polls `docker version` every 3s up to `START_TIMEOUT_MS` (default 120s)
- `composeUp()`: `docker compose up -d <services>` (no `down`/`rm` — non-destructive)
- `ensureModels()`: checks `ollama list`, pulls missing via `docker exec prism-ollama ollama pull`
- Default services: `postgres, prism-server, prometheus, ollama, qdrant`
- Default models: `nomic-embed-text, mistral:7b, qwen2.5-coder:3b, codellama:7b`
- Args: `--services=`, `--models=`, `--skip-pull`, `--timeout=`
- Writes report to `state/shared/DOCKER_RUNTIME_STATE.json`

### U-ACT03 — Local Compute Intent Hook
- **File**: `.claude/hooks/local-compute-intent.mjs` (+158 LOC)
- UserPromptSubmit hook (wired in `.claude/settings.json`)
- 5 trigger categories: `embeddings`, `local_inference`, `batch_jobs`, `lora`, `infra_services`
- Only injects `additionalContext` suggestion when intent matches AND stack is DOWN (checks `docker version` + `docker exec prism-ollama ollama --version`)
- Surface message points at `/activate-local` skill or direct launcher invocation
- Smoke-tested: `"embed the codebase into qdrant"` → suggestion, `"what is 2+2"` → empty `{}`

### U-ACT04 — /activate-local Slash Command
- **File**: `H:\.claude\commands\activate-local.md` (~4.4 KB)
- Wraps `ollama-docker-launcher.mjs` with args `--services`, `--models`, `--skip-pull`, `--timeout`, plus `status`/`stop` modes
- Documents when-to-use / when-not-to-use and safety notes (idempotent, no destructive ops)

### Supporting state files
- `mcp-server/data/state/BANDIT_POSTERIOR.json` — Thompson posterior seed (alpha/beta priors)
- `mcp-server/scripts/serialize-bandit-posterior.ts` — posterior serializer
- `mcp-server/scripts/serialize-user-model.ts` — user model compactor (top 20 prefs, 30 topics, 10 open Qs → ≤2K tokens)

## Opus 4.5 Recalibration (2026-04-18)

Switched from Opus 4.7 (1M context) to Opus 4.5 (200K context). Key changes:
- **auto-compact-gate.mjs**: Soft 300K→120K, Hard 450K→160K tokens
- **session_start_tier1_bolster.mjs**: Cap 80K→30K tokens, source budgets scaled ~37.5%
- **advisorModel**: Changed from "sonnet" to "opus"
- **Settings**: Added effortLevel="max", new env vars for optimization

## Remaining Work

### Completed (Phase B recalibrated)
- U-CTX03: SVI_TARGET_BREAKDOWN.json generator — DONE
- U-CTX04: USER_MODEL_SNAPSHOT.json live generator — DONE
- Thresholds recalibrated for 200K context

### Deprioritized (200K context makes these less critical)
- U-CTX05: Tier-2 triggered context — DEFER (200K doesn't have room for on-demand 200K injection)
- U-CTX06: Tier-3 precompact context — DEFER (compaction-survival.mjs handles this)

### Phase C (AGI Wiring) — not started
- U-AGI01..12: Wire 32 unused AI engines into dispatchers (CreativeReasoning, MultiAgentCoordinator, CrossDisciplinaryDeepLearning, etc.)

## Search Keys
`USSH-OPUS47` `USSH-OPUS47-BOLSTER` `OPUS47-BOLSTER` `TIER1-BOLSTER` `AUTO-COMPACT-GATE` `LOCAL-COMPUTE-INTENT` `OLLAMA-DOCKER-LAUNCHER` `ACTIVATE-LOCAL`
