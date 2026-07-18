#!/usr/bin/env node
/**
 * seed-ghost-nodes.mjs
 *
 * Seeds L13 "Proposed (Ghosts)" nodes + ghost-wire edges into system-graph.json.
 * Ghosts represent high-ROI backend-development artifacts that DON'T exist yet —
 * surfaces them in /system-viz so operators (and chats) see the gap visually,
 * and ghosts can be "promoted" to real built nodes when the artifact ships.
 *
 * Idempotent — re-running upserts by node.id / (edge.from, edge.to, edge.type).
 * Atomic write — temp + fsync + rename with Windows-safe retry on EBUSY/EPERM.
 * Schema-compatible — uses layer="L13", status="proposed" (vs "built"), kind="ghost.*".
 *
 * Usage:
 *   node scripts/seed-ghost-nodes.mjs --dry-run    # report what would change
 *   node scripts/seed-ghost-nodes.mjs --apply      # write changes
 *   node scripts/seed-ghost-nodes.mjs --revert     # remove all L13 ghost nodes + ghost-wire edges
 *
 * Seeded 2026-05-15 (SYSTEM-VIZ-FS-COVERAGE-MS1 follow-up).
 * Ghost manifest is inline (this file) — to add/edit ghosts, edit GHOST_MANIFEST.
 */

import { readFileSync, writeFileSync, renameSync, copyFileSync, existsSync, openSync, fsyncSync, closeSync, unlinkSync } from "node:fs";
import { readGraphStreaming, writeGraphStreamingAtomic } from "./lib/graph-io.mjs";
import { resolve, dirname } from "node:path";

const GRAPH_PATH = resolve("H:/prism/state/shared/system-viz/system-graph.json");
const GHOST_SEEDER_VERSION = "1.0.0";
const SEEDED_AT = new Date().toISOString();
const SEEDED_BY = "claude-b6c4b196 (slot alpha) — SYSTEM-VIZ-FS-COVERAGE-MS1 follow-up";

// ──────────────────────────────────────────────────────────────────────────────
// GHOST MANIFEST — High-ROI backend-development artifacts (proposed, unbuilt).
// Each entry compiles to a node; "wires" entries compile to edges between them.
// Update this manifest to add/remove ghosts; re-run with --apply.
// ──────────────────────────────────────────────────────────────────────────────

const GHOST_NODES = [
  // ENGINES (10)
  { id: "ghost.engine.WiringBatchExecutor", kind: "ghost.engine", subgroup: "wiring",
    label: "WiringBatchExecutorEngine",
    rationale: "879 engines unwired; manual wiring is slow. Batch executor wires N engines/cycle by inferring target dispatcher from engine domain. Single proven pipeline replaces 800+ hand-wires.",
    roi_score: 0.95, effort_estimate_hr: 8, unblocks: ["WIRE-LATHE-BATCH-MS0","WIRE-OTHER-BATCH-MS0","WIRE-MACHINE-BATCH-MS0","WIRE-TURNING-BATCH-MS0","WIRE-TOOL-BATCH-MS0"] },
  { id: "ghost.engine.AutoEnvelopeSync", kind: "ghost.engine", subgroup: "drift",
    label: "AutoEnvelopeSyncEngine",
    rationale: "16-173 milestones drifted (claim != git reality). Engine consumes audit-roadmap-drift output, generates status-flip patches per milestone, validates via git-log search, emits PR-ready commit.",
    roi_score: 0.90, effort_estimate_hr: 6, unblocks: ["ENVELOPE-DRIFT-FIX-BATCH-MS0"] },
  { id: "ghost.engine.BuildStateAtomicWriter", kind: "ghost.engine", subgroup: "infra",
    label: "BuildStateAtomicWriterEngine",
    rationale: "/checkin observed BUILD_STATE.json returning 0/0/0 due to peer-write contention. Wrapper engine acquires file lock (chat-slots.mjs claim pattern) before regen, ensures only one writer at a time across 10-chat fleet.",
    roi_score: 0.80, effort_estimate_hr: 4, unblocks: ["BUILD-STATE-STABILITY-MS0"] },
  { id: "ghost.engine.SystemVizDriftDetector", kind: "ghost.engine", subgroup: "viz",
    label: "SystemVizDriftDetectorEngine",
    rationale: "MS0 froze a snapshot. Drift detector diffs fsCoverage.lastWalkedAt vs disk dir mtimes, flags >24h stale + >5% file-count delta. Surfaces in DRIFT_REPORT.json + via /system-viz-drift skill.",
    roi_score: 0.85, effort_estimate_hr: 5, unblocks: ["SYSTEM-VIZ-FS-COVERAGE-MS1"] },
  { id: "ghost.engine.HookDedupAudit", kind: "ghost.engine", subgroup: "hooks",
    label: "HookDedupAuditEngine",
    rationale: "PRISM has 200+ hooks across 5 settings.json events. Bundle-blind metric showed 12.7pp false orphan rate (recorded regression). Engine canonicalizes by command + matcher + event, surfaces duplicates and overlapping triggers.",
    roi_score: 0.75, effort_estimate_hr: 6, unblocks: ["HOOK-DEDUP-MS0"] },
  { id: "ghost.engine.TokenCascadePredictor", kind: "ghost.engine", subgroup: "tokens",
    label: "TokenCascadePredictorEngine",
    rationale: "Per-prompt token budget is opaque; chats hit autocompact unpredictably. Predictor estimates Claude vs Ollama vs Codex cost per tool call before invocation, suggests cheapest route. Feeds ollama-task-offloader threshold delta.",
    roi_score: 0.80, effort_estimate_hr: 10, unblocks: ["TOKEN-CASCADE-MS0"] },
  { id: "ghost.engine.DockerWatchdog", kind: "ghost.engine", subgroup: "infra",
    label: "DockerWatchdogEngine",
    rationale: "Live: docker ps ETIMEDOUT in this very session. Watchdog probes Docker engine + Qdrant + Postgres + Prometheus every 60s, attempts wsl --shutdown + restart on hang, surfaces ETIMEDOUT count in fleet-status.",
    roi_score: 0.70, effort_estimate_hr: 6, unblocks: ["DOCKER-RECOVERY-MS0"] },
  { id: "ghost.engine.CrossTreeCommitMerger", kind: "ghost.engine", subgroup: "git",
    label: "CrossTreeCommitMergerEngine",
    rationale: "5+ documented shared-tree absorption cases (peer commits absorb concurrent chat's files into wrong scope). Engine detects collision pre-commit, suggests fork-to-sibling-worktree, falls back to atomic single-file commit.",
    roi_score: 0.85, effort_estimate_hr: 8, unblocks: ["WORKTREE-CONSOLIDATE-MS0"] },
  { id: "ghost.engine.FrontendMergeOrchestrator", kind: "ghost.engine", subgroup: "frontend",
    label: "FrontendMergeOrchestratorEngine",
    rationale: "BUILD_STATE shows 2 frontends pending merge (cqask-orion-cad, mcp-cadquery-frontend). Orchestrator clones → npm install → build → test → integrates into main repo with rollback on failure.",
    roi_score: 0.75, effort_estimate_hr: 12, unblocks: ["FRONTEND-MERGE-AUTO-MS0"] },
  { id: "ghost.engine.UnwiredSignalValidator", kind: "ghost.engine", subgroup: "wiring",
    label: "UnwiredSignalValidatorEngine",
    rationale: "Recorded regression: BUILD_STATE.NEEDS_WIRING has ≥50% false-positive rate (master_index_query buildClass:unknown != no dispatcher import). Validator samples 50 random NEEDS_WIRING engines, greps every dispatcher, gates downstream wiring milestones at FP ≤ 10%.",
    roi_score: 0.90, effort_estimate_hr: 4, unblocks: ["WIRE-LATHE-BATCH-MS0","WIRE-OTHER-BATCH-MS0"] },

  // SCRIPTS (8)
  { id: "ghost.script.dispatcher-digest-parser-fix", kind: "ghost.script", subgroup: "tooling",
    label: "scripts/dispatcher-digest-parser-fix.mjs",
    rationale: "Recorded regression: DISPATCHER_DIGEST.md regen doesn't recognize z.enum([...A, ...B] as const). 4 dispatchers (aiReasoning/local/mill/ml) show 0 actions in digest while their .ts files have 428/27/121/130 case statements. Test fixture: enum X = [...A, ...B] literal must produce |A|+|B| actions.",
    roi_score: 0.95, effort_estimate_hr: 2, unblocks: ["WIRE-LATHE-BATCH-MS0","WIRE-OTHER-BATCH-MS0"] },
  { id: "ghost.script.validate-unwired-signal", kind: "ghost.script", subgroup: "tooling",
    label: "scripts/validate-unwired-signal.mjs",
    rationale: "Sister to UnwiredSignalValidatorEngine. CLI that produces gate report; CI fails if FP rate > 10%.",
    roi_score: 0.85, effort_estimate_hr: 2, unblocks: [] },
  { id: "ghost.script.cron-revwalk", kind: "ghost.script", subgroup: "viz",
    label: "scripts/cron-revwalk.mjs",
    rationale: "Daily Windows scheduled task that picks top-N most-churned namespaces (lastWalkedAt + dir mtime delta) and re-walks them. Keeps the system-viz snapshot from staling.",
    roi_score: 0.75, effort_estimate_hr: 3, unblocks: ["SYSTEM-VIZ-FS-COVERAGE-MS1"] },
  { id: "ghost.script.detect-system-viz-drift", kind: "ghost.script", subgroup: "viz",
    label: "scripts/detect-system-viz-drift.mjs",
    rationale: "Companion CLI to SystemVizDriftDetectorEngine. Emits state/shared/system-viz/DRIFT_REPORT.json + a one-line summary for /checkin §6e.",
    roi_score: 0.80, effort_estimate_hr: 3, unblocks: [] },
  { id: "ghost.script.wire-batch-by-domain", kind: "ghost.script", subgroup: "wiring",
    label: "scripts/wire-batch-by-domain.mjs",
    rationale: "CLI driving WiringBatchExecutorEngine. node wire-batch-by-domain.mjs --domain Lathe --limit 20 --dry-run. Outputs the schema/dispatcher/action enum patches as a unified diff.",
    roi_score: 0.90, effort_estimate_hr: 4, unblocks: ["WIRE-LATHE-BATCH-MS0","WIRE-OTHER-BATCH-MS0"] },
  { id: "ghost.script.git-tree-collision-rescue", kind: "ghost.script", subgroup: "git",
    label: "scripts/git-tree-collision-rescue.mjs",
    rationale: "Closes the silent-absorption class of bug. Detects pre-commit when staged files overlap an active peer's claim, forks chat to sibling worktree, moves staged work via cherry-pick.",
    roi_score: 0.85, effort_estimate_hr: 5, unblocks: ["WORKTREE-CONSOLIDATE-MS0"] },
  { id: "ghost.script.auto-envelope-sync-batch", kind: "ghost.script", subgroup: "drift",
    label: "scripts/auto-envelope-sync-batch.mjs",
    rationale: "Sister CLI to AutoEnvelopeSyncEngine. Drives 16-173 drifted milestones through the engine in one batch; emits per-milestone patch + a summary commit.",
    roi_score: 0.85, effort_estimate_hr: 3, unblocks: ["ENVELOPE-DRIFT-FIX-BATCH-MS0"] },
  { id: "ghost.script.dispatcher-coverage-promote", kind: "ghost.script", subgroup: "wiring",
    label: "scripts/dispatcher-coverage-promote.mjs",
    rationale: "After WiringBatchExecutor lands a wire, this script promotes the corresponding L13 ghost node (engine wired) to status=built and regenerates the digest, closing the loop visually in /system-viz.",
    roi_score: 0.70, effort_estimate_hr: 2, unblocks: [] },

  // HOOKS (5)
  { id: "ghost.hook.build-state-write-lock", kind: "ghost.hook", subgroup: "infra",
    label: ".claude/hooks/build-state-write-lock.mjs",
    rationale: "PreToolUse:Bash matcher for `build-state-snapshot.mjs`. Acquires fleet lock; if held, defers regen 2-30s. Eliminates the 0/0/0 result this session observed.",
    roi_score: 0.80, effort_estimate_hr: 2, unblocks: ["BUILD-STATE-STABILITY-MS0"] },
  { id: "ghost.hook.stop-system-viz-drift", kind: "ghost.hook", subgroup: "viz",
    label: ".claude/hooks/stop-system-viz-drift.mjs",
    rationale: "Stop hook T3, throttled 12h per session. Surfaces drift count + the top-3 stalest namespaces as a one-line nudge. Disable: PRISM_VIZ_DRIFT_STOP_DISABLE=1.",
    roi_score: 0.65, effort_estimate_hr: 2, unblocks: [] },
  { id: "ghost.hook.precompact-ghost-promote", kind: "ghost.hook", subgroup: "viz",
    label: ".claude/hooks/precompact-ghost-promote.mjs",
    rationale: "PreCompact hook. Scans the session's commits/file-creates and auto-promotes any L13 ghost whose underlying artifact now exists on disk (status: proposed -> built). Closes the visual loop without a manual /ghost-promote.",
    roi_score: 0.85, effort_estimate_hr: 3, unblocks: [] },
  { id: "ghost.hook.wire-by-domain-suggest", kind: "ghost.hook", subgroup: "wiring",
    label: ".claude/hooks/wire-by-domain-suggest.mjs",
    rationale: "UserPromptSubmit T3 matcher: when prompt mentions 'wire', 'wiring milestone', 'unwired engines', injects top-3 NEEDS_WIRING domains + the recommended WiringBatchExecutor incantation.",
    roi_score: 0.75, effort_estimate_hr: 2, unblocks: [] },
  { id: "ghost.hook.cross-tree-collision-resolve", kind: "ghost.hook", subgroup: "git",
    label: ".claude/hooks/cross-tree-collision-resolve.mjs",
    rationale: "PreToolUse:Bash matcher for `git commit`. Reads chat-slots.json + peer-claims, blocks commit if it would absorb peer-claimed files, suggests git worktree add + cherry-pick.",
    roi_score: 0.90, effort_estimate_hr: 4, unblocks: ["WORKTREE-CONSOLIDATE-MS0"] },

  // MILESTONES (11)
  { id: "ghost.milestone.WIRE-LATHE-BATCH-MS0", kind: "ghost.milestone", subgroup: "wiring",
    label: "WIRE-LATHE-BATCH-MS0",
    rationale: "Top unwired domain (89 engines). Run WiringBatchExecutor against domain=Lathe → patch lathe/turningDispatcher.ts → emit round-trip tests → commit per batch of 10. Expected: 89 wires in ~5 batches.",
    roi_score: 0.90, effort_estimate_hr: 12, unblocks: [] },
  { id: "ghost.milestone.WIRE-OTHER-BATCH-MS0", kind: "ghost.milestone", subgroup: "wiring",
    label: "WIRE-OTHER-BATCH-MS0",
    rationale: "Largest unwired domain (145 engines). Mixed-domain — requires per-engine dispatcher inference. WiringBatchExecutor with domain=Other + classifier.",
    roi_score: 0.85, effort_estimate_hr: 20, unblocks: [] },
  { id: "ghost.milestone.WIRE-MACHINE-BATCH-MS0", kind: "ghost.milestone", subgroup: "wiring",
    label: "WIRE-MACHINE-BATCH-MS0",
    rationale: "17 unwired Machine engines. Mostly machine_setup + machine_live dispatchers.",
    roi_score: 0.75, effort_estimate_hr: 4, unblocks: [] },
  { id: "ghost.milestone.WIRE-TURNING-BATCH-MS0", kind: "ghost.milestone", subgroup: "wiring",
    label: "WIRE-TURNING-BATCH-MS0",
    rationale: "11 unwired Turning engines. Target: turningDispatcher.ts + turning_program.",
    roi_score: 0.75, effort_estimate_hr: 3, unblocks: [] },
  { id: "ghost.milestone.WIRE-TOOL-BATCH-MS0", kind: "ghost.milestone", subgroup: "wiring",
    label: "WIRE-TOOL-BATCH-MS0",
    rationale: "10 unwired Tool engines. Target: data dispatcher + cam tool actions.",
    roi_score: 0.70, effort_estimate_hr: 3, unblocks: [] },
  { id: "ghost.milestone.ENVELOPE-DRIFT-FIX-BATCH-MS0", kind: "ghost.milestone", subgroup: "drift",
    label: "ENVELOPE-DRIFT-FIX-BATCH-MS0",
    rationale: "16-173 milestones currently drifted. AutoEnvelopeSync drives them through batch sync. Result: drift count → ≤5 (residual = legitimately in-flight).",
    roi_score: 0.90, effort_estimate_hr: 6, unblocks: [] },
  { id: "ghost.milestone.FRONTEND-MERGE-AUTO-MS0", kind: "ghost.milestone", subgroup: "frontend",
    label: "FRONTEND-MERGE-AUTO-MS0",
    rationale: "2 frontends pending merge (BUILD_STATE.frontendsPending). FrontendMergeOrchestrator handles cqask + mcp-cadquery integration end-to-end.",
    roi_score: 0.75, effort_estimate_hr: 12, unblocks: [] },
  { id: "ghost.milestone.HOOK-DEDUP-MS0", kind: "ghost.milestone", subgroup: "hooks",
    label: "HOOK-DEDUP-MS0",
    rationale: "200+ hooks. HookDedupAudit finds overlapping triggers + duplicate commands. Goal: hook count ≤ 80% of current with same coverage.",
    roi_score: 0.70, effort_estimate_hr: 8, unblocks: [] },
  { id: "ghost.milestone.BUILD-STATE-STABILITY-MS0", kind: "ghost.milestone", subgroup: "infra",
    label: "BUILD-STATE-STABILITY-MS0",
    rationale: "BuildStateAtomicWriter + write-lock hook + regen-on-commit cron. Eliminates 0/0/0 ghost-result observed this session.",
    roi_score: 0.80, effort_estimate_hr: 4, unblocks: [] },
  { id: "ghost.milestone.DOCKER-RECOVERY-MS0", kind: "ghost.milestone", subgroup: "infra",
    label: "DOCKER-RECOVERY-MS0",
    rationale: "Docker ETIMEDOUT observed this session. DockerWatchdog + auto-restart hooks + status surface in /checkin §6g.",
    roi_score: 0.70, effort_estimate_hr: 6, unblocks: [] },
  { id: "ghost.milestone.TOKEN-CASCADE-MS0", kind: "ghost.milestone", subgroup: "tokens",
    label: "TOKEN-CASCADE-MS0",
    rationale: "TokenCascadePredictor + dashboards + ollama-offloader threshold-delta integration. Expected: 30%+ cost reduction at fleet scale.",
    roi_score: 0.85, effort_estimate_hr: 12, unblocks: [] },

  // PIPELINES (3)
  { id: "ghost.pipeline.batch-wire-by-domain", kind: "ghost.pipeline", subgroup: "wiring",
    label: "pipeline.batch-wire-by-domain",
    rationale: "Composed pipeline: recognize → infer-dispatcher → schema-add → action-enum-add → test-gen → atomic-commit. Each step gated by /forge-audit. 879 wires in ~50 commits.",
    roi_score: 0.95, effort_estimate_hr: 16, unblocks: ["WIRE-LATHE-BATCH-MS0","WIRE-OTHER-BATCH-MS0","WIRE-MACHINE-BATCH-MS0","WIRE-TURNING-BATCH-MS0","WIRE-TOOL-BATCH-MS0"] },
  { id: "ghost.pipeline.envelope-drift-auto-fix", kind: "ghost.pipeline", subgroup: "drift",
    label: "pipeline.envelope-drift-auto-fix",
    rationale: "Composed: audit-roadmap-drift → AutoEnvelopeSync (per-milestone patches) → git-log verify → atomic batch commit. Idempotent (safe re-run).",
    roi_score: 0.85, effort_estimate_hr: 8, unblocks: ["ENVELOPE-DRIFT-FIX-BATCH-MS0"] },
  { id: "ghost.pipeline.frontend-merge-auto", kind: "ghost.pipeline", subgroup: "frontend",
    label: "pipeline.frontend-merge-auto",
    rationale: "Composed: clone-or-pull → npm/pnpm install → build → vitest → integration-test → atomic-merge-into-main → rollback-on-failure. Per-frontend run.",
    roi_score: 0.75, effort_estimate_hr: 12, unblocks: ["FRONTEND-MERGE-AUTO-MS0"] },

  // SKILLS (3)
  { id: "ghost.skill.wire-batch", kind: "ghost.skill", subgroup: "wiring",
    label: ".claude/commands/wire-batch.md",
    rationale: "/wire-batch <domain> <limit> — drives WiringBatchExecutor for one batch. Skill carries the per-domain dispatcher map + safety gates (round-trip test required).",
    roi_score: 0.85, effort_estimate_hr: 2, unblocks: [] },
  { id: "ghost.skill.ghost-promote", kind: "ghost.skill", subgroup: "viz",
    label: ".claude/commands/ghost-promote.md",
    rationale: "/ghost-promote <id> — manual companion to the precompact auto-promote hook. Promotes L13 ghost to status=built when artifact lands on disk; re-runs the augment script to refresh the graph.",
    roi_score: 0.70, effort_estimate_hr: 1, unblocks: [] },
  { id: "ghost.skill.drift-fix-all", kind: "ghost.skill", subgroup: "drift",
    label: ".claude/commands/drift-fix-all.md",
    rationale: "/drift-fix-all — one-shot remediation: runs audit-roadmap-drift, dispatches AutoEnvelopeSync against every drifted milestone, commits per group of 5.",
    roi_score: 0.75, effort_estimate_hr: 2, unblocks: [] },

  // ── OLLAMA-PIPELINE CLUSTER (15 ghosts) — qualifies + composes + wires local-LLM into dev pipelines
  // ENGINES (3)
  { id: "ghost.engine.OllamaTaskQualifier", kind: "ghost.engine", subgroup: "ollama",
    label: "OllamaTaskQualifierEngine",
    rationale: "Given a task descriptor (text + context + budget) returns {qualified: bool, confidence, suggested_model: qwen2.5-coder:7b|llama3.2|nomic-embed, fallback_to_claude: bool}. Decision matrix encodes the Claude-vs-Ollama boundary: light deterministic + templated + classification go local; multi-file refactor + safety-critical + novel design escalate.",
    roi_score: 0.92, effort_estimate_hr: 6, unblocks: ["TOKEN-CASCADE-MS0"] },
  { id: "ghost.engine.OllamaPipelineComposer", kind: "ghost.engine", subgroup: "ollama",
    label: "OllamaPipelineComposerEngine",
    rationale: "Composes multi-stage Ollama pipelines from primitives (read → classify → extract → format → cache). Used by every pipeline.ollama-* below. Eliminates 8x duplicated prompt-building boilerplate across existing 9 /ollama-* skills.",
    roi_score: 0.88, effort_estimate_hr: 8, unblocks: [] },
  { id: "ghost.engine.OllamaResultCacheCAS", kind: "ghost.engine", subgroup: "ollama",
    label: "OllamaResultCacheCASEngine",
    rationale: "Content-addressable cache for Ollama results (SHA-256 of input + model + prompt-version → result). Per the offload telemetry, ~80% of doc-gen / summary calls reprocess unchanged input. Cache kills the redundancy. TTL by class (commit-msg: 7d, error-triage: 30d, wiki-summary: until source mtime).",
    roi_score: 0.90, effort_estimate_hr: 5, unblocks: ["TOKEN-CASCADE-MS0"] },

  // PIPELINES (8)
  { id: "ghost.pipeline.ollama-doc-gen", kind: "ghost.pipeline", subgroup: "ollama",
    label: "pipeline.ollama-doc-gen",
    rationale: "On engine commit: Ollama reads the new engine → emits (a) 1-line ENGINE_DIGEST.md entry, (b) 3-line wiki/architecture summary, (c) JSDoc for top-level export. Claude reviews + commits batch. Closes documentation lag: 2324 engines · 1073 wiki = 53% coverage.",
    roi_score: 0.88, effort_estimate_hr: 6, unblocks: [] },
  { id: "ghost.pipeline.ollama-error-triage", kind: "ghost.pipeline", subgroup: "ollama",
    label: "pipeline.ollama-error-triage",
    rationale: "PostToolUse:Bash on exit != 0: Ollama classifies error (TSC_ERROR | TEST_FAIL | NETWORK | LOCK | NULL_REF | OOM | RATE_LIMIT | ENV) → tribal-knowledge remediation lookup → surface in error-block-prewarn. Closes the existing error-pattern-capture loop with real classification.",
    roi_score: 0.85, effort_estimate_hr: 5, unblocks: [] },
  { id: "ghost.pipeline.ollama-tribal-ingest", kind: "ghost.pipeline", subgroup: "ollama",
    label: "pipeline.ollama-tribal-ingest",
    rationale: "New .md in knowledge/tribal/ OR shop-note paste: Ollama extracts entities (machine, material, tool, formula, customer) → classifies domain → emits frontmatter. Claude validates + writes back. Speeds up /shop-knowledge by 5-10x.",
    roi_score: 0.80, effort_estimate_hr: 5, unblocks: [] },
  { id: "ghost.pipeline.ollama-wiki-lint", kind: "ghost.pipeline", subgroup: "ollama",
    label: "pipeline.ollama-wiki-lint",
    rationale: "Cron daily 03:30 local: Ollama reads every wiki entry → scores (clarity, completeness, freshness via lastUpdated vs source mtime), flags dead [[links]], detects orphans. Emits WIKI_LINT_REPORT.md. Drives the WikiIndexMaintainerEngine.",
    roi_score: 0.70, effort_estimate_hr: 4, unblocks: [] },
  { id: "ghost.pipeline.ollama-diff-summary", kind: "ghost.pipeline", subgroup: "ollama",
    label: "pipeline.ollama-diff-summary",
    rationale: "On /handoff or PreCompact: Ollama reads the session's git diff (filtered + bounded) → emits 5-line RESUME summary + commit-grouping suggestion. Replaces the manual RESUME composition in per-agent-handoff. Tier-cascade-aware: falls back to Claude if diff >50KB.",
    roi_score: 0.85, effort_estimate_hr: 4, unblocks: [] },
  { id: "ghost.pipeline.ollama-commit-msg", kind: "ghost.pipeline", subgroup: "ollama",
    label: "pipeline.ollama-commit-msg",
    rationale: "PreToolUse:Bash matcher for `git commit -m \"\"` (empty subject): Ollama reads staged diff → proposes [SCOPE]/U-ID: subject (extracts SCOPE from active milestone, U-ID from active loop). Operator review unchanged.",
    roi_score: 0.80, effort_estimate_hr: 3, unblocks: [] },
  { id: "ghost.pipeline.ollama-forge-preflight", kind: "ghost.pipeline", subgroup: "ollama",
    label: "pipeline.ollama-forge-preflight",
    rationale: "Triggered by /forge-audit or /rgs invocation: Ollama classifies the audit type (architecture | wiring | test | security | drift) → picks top-3 audit dimensions → hands off to Claude with a focused prompt. Reduces /forge-audit token-spend by ~40%.",
    roi_score: 0.85, effort_estimate_hr: 4, unblocks: [] },
  { id: "ghost.pipeline.ollama-schema-from-sample", kind: "ghost.pipeline", subgroup: "ollama",
    label: "pipeline.ollama-schema-from-sample",
    rationale: "When a new dispatcher action is added: Ollama reads existing schema + 1 sample request → emits Zod schema draft. Claude validates types match engine signature. Closes a ~30min/action manual chore.",
    roi_score: 0.75, effort_estimate_hr: 3, unblocks: [] },

  // HOOKS (3)
  { id: "ghost.hook.ollama-doc-on-commit", kind: "ghost.hook", subgroup: "ollama",
    label: ".claude/hooks/ollama-doc-on-commit.mjs",
    rationale: "PostToolUse:Bash matcher for `git commit` successful. Detects new engine/dispatcher/skill files in the commit. Fires pipeline.ollama-doc-gen async (no blocking). 24h cooldown per file. Disable: PRISM_OLLAMA_DOC_ON_COMMIT_DISABLE=1.",
    roi_score: 0.80, effort_estimate_hr: 3, unblocks: [] },
  { id: "ghost.hook.ollama-precompact-summary", kind: "ghost.hook", subgroup: "ollama",
    label: ".claude/hooks/ollama-precompact-summary.mjs",
    rationale: "PreCompact hook (before existing precompact-handoff). Fires pipeline.ollama-diff-summary → result feeds the precompact-handoff `--resume` field. Falls back to existing `generateSmartResume()` on Ollama timeout (>3s).",
    roi_score: 0.82, effort_estimate_hr: 3, unblocks: [] },
  { id: "ghost.hook.ollama-error-triage-postbash", kind: "ghost.hook", subgroup: "ollama",
    label: ".claude/hooks/ollama-error-triage-postbash.mjs",
    rationale: "PostToolUse:Bash on exit != 0 AND stderr >200 chars. Fires pipeline.ollama-error-triage, injects 1-line remediation hint into Claude's next turn. Throttled 60s per error-class to prevent prompt-spam.",
    roi_score: 0.78, effort_estimate_hr: 3, unblocks: [] },

  // SKILLS (3)
  { id: "ghost.skill.ollama-task-qualify", kind: "ghost.skill", subgroup: "ollama",
    label: ".claude/commands/ollama-task-qualify.md",
    rationale: "/ollama-task-qualify <task> — interrogates OllamaTaskQualifier, returns {qualified, suggested_model, fallback_to_claude} with reasoning. Useful before starting any non-trivial work to validate the routing decision.",
    roi_score: 0.70, effort_estimate_hr: 1, unblocks: [] },
  { id: "ghost.skill.ollama-wiki-lint", kind: "ghost.skill", subgroup: "ollama",
    label: ".claude/commands/ollama-wiki-lint.md",
    rationale: "/ollama-wiki-lint [--since N] — manual trigger for pipeline.ollama-wiki-lint, scoped to entries modified in last N days. Prints inline score + flag report. Companion to the daily cron.",
    roi_score: 0.65, effort_estimate_hr: 1, unblocks: [] },
  { id: "ghost.skill.ollama-doc-gen", kind: "ghost.skill", subgroup: "ollama",
    label: ".claude/commands/ollama-doc-gen.md",
    rationale: "/ollama-doc-gen <file> — manual trigger for pipeline.ollama-doc-gen on a specific file. Used when a chat wants doc-gen on a non-commit change (e.g., new wiki entry, new skill).",
    roi_score: 0.70, effort_estimate_hr: 1, unblocks: [] },
];

// Edges: each entry produces ONE edge. Idempotent by (from,to,type).
// "wire" edges connect ghosts to their unblocks/depends-on; "supports" connects engines/scripts/hooks to milestones.
function buildGhostEdges(realIds = new Set()) {
  const edges = [];
  const idsInManifest = new Set(GHOST_NODES.map((n) => n.id));

  for (const node of GHOST_NODES) {
    // Engine/script/hook -> milestone(s) it unblocks
    if (Array.isArray(node.unblocks)) {
      for (const target of node.unblocks) {
        const ghostId = `ghost.milestone.${target}`;
        if (idsInManifest.has(ghostId)) {
          edges.push({ from: node.id, to: ghostId, type: "ghost-wire", relation: "unblocks", status: "proposed", intensity: 0.6 });
        }
      }
    }
  }

  // Cross-cluster wires: pipelines compose engines/scripts
  const piped = {
    "ghost.pipeline.batch-wire-by-domain": ["ghost.engine.WiringBatchExecutor","ghost.engine.UnwiredSignalValidator","ghost.script.dispatcher-digest-parser-fix","ghost.script.wire-batch-by-domain","ghost.script.dispatcher-coverage-promote","ghost.hook.wire-by-domain-suggest","ghost.skill.wire-batch"],
    "ghost.pipeline.envelope-drift-auto-fix": ["ghost.engine.AutoEnvelopeSync","ghost.script.auto-envelope-sync-batch","ghost.skill.drift-fix-all"],
    "ghost.pipeline.frontend-merge-auto": ["ghost.engine.FrontendMergeOrchestrator"],
    // ── Ollama pipeline cluster — every pipeline.ollama-* composes Qualifier+Composer+Cache, plus its own primary surface
    "ghost.pipeline.ollama-doc-gen":          ["ghost.engine.OllamaTaskQualifier","ghost.engine.OllamaPipelineComposer","ghost.engine.OllamaResultCacheCAS","ghost.hook.ollama-doc-on-commit","ghost.skill.ollama-doc-gen"],
    "ghost.pipeline.ollama-error-triage":     ["ghost.engine.OllamaTaskQualifier","ghost.engine.OllamaPipelineComposer","ghost.engine.OllamaResultCacheCAS","ghost.hook.ollama-error-triage-postbash"],
    "ghost.pipeline.ollama-tribal-ingest":    ["ghost.engine.OllamaTaskQualifier","ghost.engine.OllamaPipelineComposer","ghost.engine.OllamaResultCacheCAS"],
    "ghost.pipeline.ollama-wiki-lint":        ["ghost.engine.OllamaTaskQualifier","ghost.engine.OllamaPipelineComposer","ghost.engine.OllamaResultCacheCAS","ghost.skill.ollama-wiki-lint"],
    "ghost.pipeline.ollama-diff-summary":     ["ghost.engine.OllamaTaskQualifier","ghost.engine.OllamaPipelineComposer","ghost.engine.OllamaResultCacheCAS","ghost.hook.ollama-precompact-summary"],
    "ghost.pipeline.ollama-commit-msg":       ["ghost.engine.OllamaTaskQualifier","ghost.engine.OllamaPipelineComposer","ghost.engine.OllamaResultCacheCAS"],
    "ghost.pipeline.ollama-forge-preflight":  ["ghost.engine.OllamaTaskQualifier","ghost.engine.OllamaPipelineComposer","ghost.engine.OllamaResultCacheCAS"],
    "ghost.pipeline.ollama-schema-from-sample": ["ghost.engine.OllamaTaskQualifier","ghost.engine.OllamaPipelineComposer","ghost.engine.OllamaResultCacheCAS"],
  };

  // TokenCascadePredictor gates every Ollama pipeline (the offload-vs-Claude decision lives here)
  const tokenGated = [
    "ghost.pipeline.ollama-doc-gen", "ghost.pipeline.ollama-error-triage", "ghost.pipeline.ollama-tribal-ingest",
    "ghost.pipeline.ollama-wiki-lint", "ghost.pipeline.ollama-diff-summary", "ghost.pipeline.ollama-commit-msg",
    "ghost.pipeline.ollama-forge-preflight", "ghost.pipeline.ollama-schema-from-sample",
  ];
  for (const pipelineId of tokenGated) {
    if (idsInManifest.has("ghost.engine.TokenCascadePredictor") && idsInManifest.has(pipelineId)) {
      edges.push({ from: "ghost.engine.TokenCascadePredictor", to: pipelineId, type: "ghost-wire", relation: "gates", status: "proposed", intensity: 0.45 });
    }
  }

  // Real-slash-command bridges — Ollama pipelines as precondition for existing dev pipelines.
  // Target node-ids are guesses against the L7/L8 skill layer; only emitted if the target exists in the graph
  // (caller passes graphNodeIds set as the 2nd arg of buildGhostEdges; absent → skip with deferred note in meta).
  // Pairs: [pipeline-ghost, [candidate real-IDs]]
  const slashBridges = [
    ["ghost.pipeline.ollama-forge-preflight", ["skill.forge-audit","skill.forge-audit-v2","s.forge-audit","commands.forge-audit"]],
    ["ghost.pipeline.ollama-forge-preflight", ["skill.rgs","s.rgs","commands.rgs"]],
    ["ghost.pipeline.ollama-diff-summary",    ["skill.precompact","s.precompact","commands.precompact","skill.handoff","s.handoff"]],
    ["ghost.pipeline.ollama-doc-gen",         ["skill.forge-triple","s.forge-triple","commands.forge-triple"]],
    ["ghost.pipeline.ollama-tribal-ingest",   ["skill.shop-knowledge","s.shop-knowledge","skill.pdf-learn","skill.video-learn"]],
    ["ghost.pipeline.ollama-error-triage",    ["skill.scrutinize","s.scrutinize","skill.error-learn-review"]],
  ];
  for (const [pipelineId, candidates] of slashBridges) {
    if (!idsInManifest.has(pipelineId)) continue;
    for (const realId of candidates) {
      if (realIds.has(realId)) {
        edges.push({ from: realId, to: pipelineId, type: "ghost-wire", relation: "precondition", status: "proposed", intensity: 0.35 });
        break; // first match per pipeline
      }
    }
  }
  for (const [pipelineId, components] of Object.entries(piped)) {
    for (const comp of components) {
      if (idsInManifest.has(comp)) {
        edges.push({ from: pipelineId, to: comp, type: "ghost-wire", relation: "composes", status: "proposed", intensity: 0.5 });
      }
    }
  }

  // Companion sister-pairs (engine <-> script)
  const sisters = [
    ["ghost.engine.UnwiredSignalValidator", "ghost.script.validate-unwired-signal"],
    ["ghost.engine.SystemVizDriftDetector", "ghost.script.detect-system-viz-drift"],
    ["ghost.engine.SystemVizDriftDetector", "ghost.script.cron-revwalk"],
    ["ghost.engine.AutoEnvelopeSync", "ghost.script.auto-envelope-sync-batch"],
    ["ghost.engine.WiringBatchExecutor", "ghost.script.wire-batch-by-domain"],
    ["ghost.engine.CrossTreeCommitMerger", "ghost.script.git-tree-collision-rescue"],
    ["ghost.engine.CrossTreeCommitMerger", "ghost.hook.cross-tree-collision-resolve"],
    ["ghost.engine.BuildStateAtomicWriter", "ghost.hook.build-state-write-lock"],
    ["ghost.engine.SystemVizDriftDetector", "ghost.hook.stop-system-viz-drift"],
  ];
  for (const [a, b] of sisters) {
    if (idsInManifest.has(a) && idsInManifest.has(b)) {
      edges.push({ from: a, to: b, type: "ghost-wire", relation: "sister", status: "proposed", intensity: 0.4 });
    }
  }

  return edges;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = { dryRun: false, apply: false, revert: false };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--apply") out.apply = true;
    else if (a === "--revert") out.revert = true;
    else if (a === "--help") {
      console.error("usage: seed-ghost-nodes.mjs [--dry-run | --apply | --revert]");
      process.exit(0);
    }
  }
  if (!out.dryRun && !out.apply && !out.revert) out.dryRun = true; // default safe
  return out;
}

function buildGhostNode(spec) {
  return {
    id: spec.id,
    layer: "L13",
    subgroup: spec.subgroup || "proposed",
    label: spec.label,
    info: spec.rationale,
    status: "proposed",
    size: 0.8,
    tier: 4,
    kind: spec.kind,
    ghost: true,
    proposed_at: SEEDED_AT,
    proposed_by: SEEDED_BY,
    roi_score: spec.roi_score,
    effort_estimate_hr: spec.effort_estimate_hr,
    unblocks: spec.unblocks || [],
    awareness: { svi: 0, testCount: 0, complexity: 0, coverage: 0, actionCount: 0, registryEntries: 0 },
    businessValue: { tags: ["ghost", spec.subgroup || "proposed", spec.kind || "unknown"], roi: spec.roi_score >= 0.85 ? "high" : (spec.roi_score >= 0.7 ? "medium" : "low"), rationale: spec.rationale },
  };
}

function edgeKey(e) { return `${e.from}::${e.to}::${e.type}`; }
function nodeIsGhost(n) { return n && (n.layer === "L13" || n.ghost === true); }
function edgeIsGhost(e) { return e && (e.type === "ghost-wire"); }

function atomicWrite(path, content) {
  const tmp = path + ".tmp";
  const retries = 6;
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      writeFileSync(tmp, content);
      const fd = openSync(tmp, "r+");
      fsyncSync(fd);
      closeSync(fd);
      try {
        renameSync(tmp, path);
      } catch (renameErr) {
        if (["EBUSY","EPERM","EEXIST","EACCES"].includes(renameErr.code)) {
          copyFileSync(tmp, path);
          try { unlinkSync(tmp); } catch {}
        } else { throw renameErr; }
      }
      return;
    } catch (err) {
      lastErr = err;
      if (!["EBUSY","EPERM","EEXIST","EACCES"].includes(err.code)) throw err;
      // wait + retry
      const wait = 150 * (i + 1);
      const t0 = Date.now();
      while (Date.now() - t0 < wait) { /* busy-wait */ }
    }
  }
  throw lastErr;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv);
  if (!existsSync(GRAPH_PATH)) {
    console.error(`ERROR: graph not found at ${GRAPH_PATH}`);
    process.exit(1);
  }

  const t0 = Date.now();
  console.error(`[seed-ghost-nodes] reading ${GRAPH_PATH} ...`);
  const graph = readGraphStreaming(GRAPH_PATH);  // off-heap: JSON.parse(readFileSync utf8) throws at >512MiB (U-VIZ-READER-CAPSAFE 2026-06-10)
  console.error(`[seed-ghost-nodes] parsed in ${Date.now()-t0}ms — nodes=${(graph.nodes||[]).length} edges=${(graph.edges||[]).length}`);

  graph.nodes = graph.nodes || [];
  graph.edges = graph.edges || [];
  graph.meta = graph.meta || {};

  // ── REVERT ──────────────────────────────────────────────
  if (args.revert) {
    const beforeNodes = graph.nodes.length;
    const beforeEdges = graph.edges.length;
    graph.nodes = graph.nodes.filter((n) => !nodeIsGhost(n));
    graph.edges = graph.edges.filter((e) => !edgeIsGhost(e));
    const removedNodes = beforeNodes - graph.nodes.length;
    const removedEdges = beforeEdges - graph.edges.length;
    console.error(`[seed-ghost-nodes] REVERT — removed ${removedNodes} ghost nodes + ${removedEdges} ghost edges`);
    delete graph.meta.ghostSeeder;
    writeGraphStreamingAtomic(GRAPH_PATH, graph);  // cap-safe: raw JSON.stringify on the >512MiB graph throws Invalid-string-length (U-VIZ-WRITER-CAPSAFE 2026-06-23)
    console.error(`[seed-ghost-nodes] DONE — graph nodes=${graph.nodes.length} edges=${graph.edges.length}`);
    return;
  }

  // ── BUILD MANIFEST ──────────────────────────────────────
  const ghostNodes = GHOST_NODES.map(buildGhostNode);
  const realIdSet = new Set(graph.nodes.map((n) => n.id));
  const ghostEdges = buildGhostEdges(realIdSet);

  // ── UPSERT (idempotent) ─────────────────────────────────
  const nodeIdSet = new Set(graph.nodes.map((n) => n.id));
  const edgeKeySet = new Set(graph.edges.map(edgeKey));
  let addedNodes = 0, updatedNodes = 0, addedEdges = 0;

  for (const gn of ghostNodes) {
    if (nodeIdSet.has(gn.id)) {
      // replace in-place
      const idx = graph.nodes.findIndex((n) => n.id === gn.id);
      graph.nodes[idx] = gn;
      updatedNodes++;
    } else {
      graph.nodes.push(gn);
      addedNodes++;
    }
  }
  for (const ge of ghostEdges) {
    const k = edgeKey(ge);
    if (!edgeKeySet.has(k)) {
      graph.edges.push(ge);
      addedEdges++;
    }
  }

  graph.meta.ghostSeeder = {
    version: GHOST_SEEDER_VERSION,
    seededAt: SEEDED_AT,
    seededBy: SEEDED_BY,
    manifestSize: ghostNodes.length,
    wireSize: ghostEdges.length,
  };

  console.error(`[seed-ghost-nodes] manifest — ${ghostNodes.length} ghost nodes · ${ghostEdges.length} ghost wires`);
  console.error(`[seed-ghost-nodes] upsert — added=${addedNodes} updated=${updatedNodes} edges-added=${addedEdges}`);

  // ── DRY-RUN ─────────────────────────────────────────────
  if (args.dryRun) {
    console.error(`[seed-ghost-nodes] DRY-RUN — no write. Use --apply.`);
    // Print a summary of what would land
    const byKind = {};
    for (const gn of ghostNodes) byKind[gn.kind] = (byKind[gn.kind] || 0) + 1;
    console.error(`[seed-ghost-nodes] by kind:`, byKind);
    const topRoi = [...ghostNodes].sort((a,b)=>b.roi_score-a.roi_score).slice(0,5).map(n=>`${n.label} (ROI ${n.roi_score})`);
    console.error(`[seed-ghost-nodes] top-5 ROI:`, topRoi);
    return;
  }

  // ── APPLY ───────────────────────────────────────────────
  console.error(`[seed-ghost-nodes] writing ${GRAPH_PATH} (final nodes=${graph.nodes.length} edges=${graph.edges.length}) ...`);
  const writeT0 = Date.now();
  writeGraphStreamingAtomic(GRAPH_PATH, graph);  // cap-safe: raw JSON.stringify on the >512MiB graph throws Invalid-string-length (U-VIZ-WRITER-CAPSAFE 2026-06-23)
  console.error(`[seed-ghost-nodes] write done in ${Date.now()-writeT0}ms`);
  console.error(`[seed-ghost-nodes] DONE — graph nodes=${graph.nodes.length} edges=${graph.edges.length}`);
}

main();
