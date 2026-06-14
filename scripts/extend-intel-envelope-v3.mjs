#!/usr/bin/env node
/**
 * extend-intel-envelope-v3.mjs — Close gaps from 3 exhaustive scrutiny agents
 * + add multi-model Ollama integration (Llama 3.3, DeepSeek-R1, Llama 3.2 Vision)
 *
 * Adds 6 new phases (P18-P23) + extends P11 with U06/U07/U08:
 *
 *   P11-U06 — Ollama-family skills: policy frontmatter for 9 ollama-* skills
 *   P11-U07 — Wire 14 critical-gap awareness/goal/continuity hooks
 *   P11-U08 — Consolidate 16 stop_on_* event gates into single canonical
 *
 *   P18    Catalog Ingestion — 22 tool-catalog extractors → Obsidian + Qdrant
 *   P19    Cron + Drift Monitoring — schedule run-orphan-audit, inventory-delta, etc.
 *   P20    Multi-Model Ollama Integration — Llama 3.3 + DeepSeek-R1 + Vision
 *   P21    Vision Pipeline — Llama 3.2 Vision for PDF/blueprint extraction
 *   P22    Pre-Claude Review Pattern — DeepSeek-R1 drafts, Claude refines
 *   P23    Model Telemetry + Cost Routing — per-model latency/quality tracking
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ENV_PATH = "H:/PRISM/mcp-server/data/milestones/INTEL-OLLAMA-OBSIDIAN-MS0.json";
const env = JSON.parse(fs.readFileSync(ENV_PATH, "utf-8"));

// ── Extend P11 with U06-U08 ──────────────────────────────────────────────
const p11 = env.phases.find((p) => p.id === "P11");
const p11Additions = [
  {
    id: "P11-U06",
    title: "Ollama family skills — add policy frontmatter to 9 ollama-* skills",
    effort: 30,
    dependencies: ["P11-U01"],
    rollback: "git revert frontmatter changes; skills still callable",
    exit_conditions: [
      "/ollama-summarize, /ollama-classify, /ollama-explain, /ollama-docstring, /ollama-extract, /ollama-test-stub, /ollama-error-triage, /ollama-diff-summary, /ollama-boilerplate all have policy.tier + policy.triggers",
      "Auto-invoke verified: typing 'summarize this' surfaces /ollama-summarize",
      "Token cost noted in frontmatter (each skill <500 tok per fire)",
    ],
    deliverables: [
      { path: ".claude/commands/ollama-*.md (9 files)", type: "command", description: "Add policy frontmatter to all ollama-* skills" },
    ],
    tools: ["skill-modernize"],
    four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
  },
  {
    id: "P11-U07",
    title: "Wire 14 critical-gap awareness/goal/continuity hooks (Agent 3 finding)",
    effort: 80,
    dependencies: [],
    rollback: "remove from settings.json wiring; hooks remain dormant",
    exit_conditions: [
      "Wired: awareness-bootstrap, goal-stack-init, goal-stack-inject, metacognition-check, ollama-auto-router, ollama-prism-intelligence, working-set-awareness, prism-intelligence-briefing, reasoning-completeness, post-write-sync-awareness, test-quality-gate-stop, session-continuity-chain, action-triple-sync, session-awareness-bootstrap",
      "Each smoke-tested with synthetic stdin",
      "No schema violations in hook-schema-audit re-run",
    ],
    deliverables: [
      { path: "H:/.claude/settings.json", type: "config", description: "Wire 14 hooks across SessionStart/UserPromptSubmit/Stop blocks" },
    ],
    tools: [],
    four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
  },
  {
    id: "P11-U08",
    title: "Consolidate 16 stop_on_* event gates into single canonical Stop chain",
    effort: 60,
    dependencies: [],
    rollback: "restore individual stop_on_* hooks from .deprecated/ + revert settings.json",
    exit_conditions: [
      "All 16 stop_on_* hooks (awareness-degraded, circular-deps, dirty-registry, extraction-incomplete, hook-unregistered, etc.) merged into single stop-gate-chain.mjs that runs each check in sequence",
      "Old 16 hooks moved to .claude/hooks/.deprecated/ (NOT deleted)",
      "settings.json wires only the new chain; ~90% of Stop event token cost saved (16 → 1 invocation)",
      "Each gate retains its block decision via decision matrix output",
    ],
    deliverables: [
      { path: ".claude/hooks/stop-gate-chain.mjs", type: "hook", description: "Unified Stop gate runner" },
      { path: ".claude/hooks/.deprecated/stop_on_*.mjs (16 files)", type: "config", description: "Archived originals" },
      { path: "H:/.claude/settings.json", type: "config", description: "Wire chain, unwire 16 originals" },
    ],
    tools: [],
    four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
  },
];
p11.units.push(...p11Additions);

// ── Add P18-P23 ─────────────────────────────────────────────────────────
const newPhases = [
  {
    id: "P18",
    title: "Catalog Ingestion — 22 Tool-Catalog Extractors → Obsidian + Qdrant",
    rationale: "Agent 2 found 22 tool catalog extractors (Sandvik, Kennametal, ISCAR, OSG, Tungaloy, WIDIA, Seco, Korloy, Ingersoll, etc.) on disk but no envelope unit. These are NON-machining-specific in pattern (extraction logic) and HIGH VALUE for development support (the framework itself, not the catalog data).",
    primary_role: "R6",
    sessions: "1",
    units: [
      {
        id: "P18-U01",
        title: "Audit + classify 22 catalog extractors — keep extraction framework, archive vendor-specific",
        effort: 30,
        dependencies: [],
        rollback: "read-only audit",
        exit_conditions: [
          "scripts/extractor-audit.mjs lists all 22 + classifies extraction pattern type",
          "Common extraction pattern abstracted into ExtractionFrameworkEngine",
          "Vendor-specific scripts retained but routed through shared framework",
        ],
        deliverables: [
          { path: "scripts/extractor-audit.mjs", type: "script", description: "Audit + classify extractors" },
          { path: "EXTRACTOR-INVENTORY.md", type: "doc", description: "Pattern map" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P18-U02",
        title: "Build ExtractionFrameworkEngine + dispatcher action",
        effort: 60,
        dependencies: ["P18-U01"],
        rollback: "revert engine + dispatcher; vendor scripts still work standalone",
        exit_conditions: [
          "ExtractionFrameworkEngine.ts provides parse(input, schema) interface",
          "prism_dev:catalog_extract action exposes it",
          "Round-trip test through dispatcher",
        ],
        deliverables: [
          { path: "mcp-server/src/engines/ExtractionFrameworkEngine.ts", type: "source", description: "Common extraction substrate" },
          { path: "mcp-server/src/__tests__/ExtractionFramework.test.ts", type: "test", description: "Round-trip" },
        ],
        tools: ["prism_dev:catalog_extract"],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
    ],
  },
  {
    id: "P19",
    title: "Cron + Drift Monitoring — Schedule the Auto-Detection Scripts",
    rationale: "Agent 2 found 6 critical scripts that should be cron'd but aren't: update-prism-inventory (only SessionStart), run-orphan-audit, inventory-delta-report, rebuild-awareness-cache, generate-self-awareness-manifest, populate_skill_triggers.",
    primary_role: "R3",
    sessions: "1",
    units: [
      {
        id: "P19-U01",
        title: "Cron schedule 6 critical drift-detection scripts via Windows Task Scheduler",
        effort: 40,
        dependencies: ["P11-U03"],
        rollback: "schtasks /delete on each scheduled task",
        exit_conditions: [
          "Daily 6am: update-prism-inventory.mjs",
          "Nightly 11pm: run-orphan-audit.ts",
          "Hourly: inventory-delta-report.ts (alert if drift >5%)",
          "On PreEdit hook: rebuild-awareness-cache.mjs (debounced 5min)",
          "On SessionEnd: generate-self-awareness-manifest.mjs",
          "Post-build: populate_skill_triggers.py",
          "All scheduled entries logged to data/state/cron-runs.jsonl",
        ],
        deliverables: [
          { path: "scripts/install-drift-detection-cron.ps1", type: "script", description: "PowerShell installer for 6 scheduled tasks" },
          { path: "DRIFT-DETECTION-SCHEDULE.md", type: "doc", description: "Schedule reference" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P19-U02",
        title: "Drift alert hook — surface scheduled-job alerts at SessionStart",
        effort: 30,
        dependencies: ["P19-U01"],
        rollback: "unwire hook from settings.json",
        exit_conditions: [
          "SessionStart hook reads cron-runs.jsonl tail; surfaces any failures or drift >5%",
          "Quiet by default; only fires when alert exists",
        ],
        deliverables: [
          { path: ".claude/hooks/drift-alert-surface.mjs", type: "hook", description: "SessionStart alert reader" },
          { path: "H:/.claude/settings.json", type: "config", description: "Wire hook" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
    ],
  },
  {
    id: "P20",
    title: "Multi-Model Ollama Integration — Llama 3.3 + DeepSeek-R1 + Vision Models",
    rationale: "User question: can we use other Ollama models? YES — currently qwen-only. Pull 3 additional models for tiered routing: nomic-embed-text (vector backbone, BLOCKS P0), llama3.2-vision:11b (PDF/blueprint OCR), deepseek-r1:14b (chain-of-thought reasoning, pre-Claude review). Optional: llama3.3:70b for complex tasks if disk allows.",
    primary_role: "R6",
    sessions: "1",
    units: [
      {
        id: "P20-U01",
        title: "ollama pull required models: nomic-embed-text + llama3.2-vision:11b + deepseek-r1:14b",
        effort: 30,
        dependencies: [],
        rollback: "ollama rm <model> for each pulled",
        exit_conditions: [
          "ollama list shows: nomic-embed-text (~280MB), llama3.2-vision:11b (~7GB), deepseek-r1:14b (~9GB)",
          "Each model smoke-tested with sample prompt",
          "Total disk add: ~16GB on H:/Tools/ollama/models/",
          "Free disk verified: H: has >50GB remaining",
        ],
        deliverables: [
          { path: "scripts/pull-multi-model-stack.mjs", type: "script", description: "Pull + smoke test required models" },
          { path: "MODEL-STACK.md", type: "doc", description: "Per-model use case + size + version" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P20-U02",
        title: "Optional: ollama pull llama3.3:70b for high-complexity tasks (disk-conditional)",
        effort: 20,
        dependencies: ["P20-U01"],
        rollback: "ollama rm llama3.3:70b",
        exit_conditions: [
          "If H: has >100GB free: pull llama3.3:70b (~40GB)",
          "If insufficient disk: skip + document in MODEL-STACK.md",
          "Smoke test if pulled",
        ],
        deliverables: [
          { path: "scripts/pull-llama33-conditional.mjs", type: "script", description: "Disk-aware pull" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P20-U03",
        title: "Build ModelRouterEngine — route by task complexity tier",
        effort: 80,
        dependencies: ["P20-U01"],
        rollback: "remove engine + dispatcher action; routing falls back to qwen-only",
        exit_conditions: [
          "ModelRouterEngine.ts classifies task → tier (0=embed, 1=simple, 2=medium, 3=complex, 4=vision)",
          "Tier → model: 0=nomic-embed, 1=qwen-7b, 2=qwen-14b, 3=deepseek-r1 (or qwen-32b fallback), 4=llama3.2-vision",
          "prism_ai:model_route action exposes it",
          "Round-trip test through dispatcher with 5 task types",
        ],
        deliverables: [
          { path: "mcp-server/src/engines/ModelRouterEngine.ts", type: "source", description: "Tiered model router" },
          { path: "mcp-server/src/__tests__/ModelRouter.test.ts", type: "test", description: "Per-tier classification" },
          { path: "mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts", type: "source", description: "Add model_route action" },
        ],
        tools: ["prism_ai:model_route"],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P20-U04",
        title: "Refactor existing Ollama hooks to use ModelRouterEngine",
        effort: 50,
        dependencies: ["P20-U03"],
        rollback: "git revert hook changes; hooks fall back to hardcoded qwen calls",
        exit_conditions: [
          "ollama-unified-semantic-router uses ModelRouterEngine",
          "ollama-context-aggregator uses ModelRouterEngine",
          "ollama-session-continuity uses ModelRouterEngine",
          "claudemd-ollama-enforcer uses ModelRouterEngine",
          "Each hook smoke-tested",
        ],
        deliverables: [
          { path: ".claude/hooks/ollama-*.mjs (4 files)", type: "hook", description: "Refactor to use ModelRouterEngine" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
    ],
  },
  {
    id: "P21",
    title: "Vision Pipeline — Llama 3.2 Vision for PDF / Blueprint / Diagram Extraction",
    rationale: "User question: vision model for PDF extraction. Llama 3.2 Vision 11B is multimodal. Current /pdf-learn skill does text-only extraction; misses image content (engineering diagrams, scanned drawings, manufacturer catalog images).",
    primary_role: "R6",
    sessions: "1",
    units: [
      {
        id: "P21-U01",
        title: "Build VisionExtractionEngine — wraps llama3.2-vision for image+text understanding",
        effort: 70,
        dependencies: ["P20-U01"],
        rollback: "remove engine; PDF extraction falls back to text-only path",
        exit_conditions: [
          "VisionExtractionEngine.ts exposes extract(imageOrPdfPath, prompt) → text",
          "Routes images through llama3.2-vision; falls back to qwen for text-only",
          "prism_dev:vision_extract dispatcher action",
          "Round-trip test with sample blueprint image",
        ],
        deliverables: [
          { path: "mcp-server/src/engines/VisionExtractionEngine.ts", type: "source", description: "Vision wrapper" },
          { path: "mcp-server/src/__tests__/VisionExtraction.test.ts", type: "test", description: "Image extraction round-trip" },
        ],
        tools: ["prism_dev:vision_extract"],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P21-U02",
        title: "Refactor PDF extraction pipeline to detect + extract image content via vision model",
        effort: 70,
        dependencies: ["P21-U01", "P14-U02"],
        rollback: "git revert pipeline changes; falls back to text-only PDF extraction",
        exit_conditions: [
          "Existing batch-pdf-extract.ts splits PDF into text pages + image pages",
          "Image pages routed through VisionExtractionEngine",
          "Combined output: text chunks + image-described chunks → Obsidian vault",
          "Test: process a manufacturer catalog PDF with diagrams; verify image content extracted",
        ],
        deliverables: [
          { path: "mcp-server/scripts/batch-pdf-extract.ts", type: "source", description: "Hybrid text+vision pipeline" },
        ],
        tools: ["prism_dev:vision_extract"],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P21-U03",
        title: "Update /pdf-learn skill to invoke vision pipeline for image-heavy PDFs",
        effort: 30,
        dependencies: ["P21-U02"],
        rollback: "revert pdf-learn.md to text-only mode",
        exit_conditions: [
          "/pdf-learn detects image density in PDF",
          "If image-heavy: invokes vision pipeline path",
          "If text-only: existing path",
          "Documented in skill frontmatter",
        ],
        deliverables: [
          { path: ".claude/commands/pdf-learn.md", type: "command", description: "Add vision routing logic" },
        ],
        tools: ["prism_dev:vision_extract"],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
    ],
  },
  {
    id: "P22",
    title: "Pre-Claude Review Pattern — DeepSeek-R1 Drafts, Claude Refines",
    rationale: "User pattern request: 'llama 3.3 and deep seek for slightly more complex tasks then claude review and add on to it'. DeepSeek-R1 is a reasoning model with chain-of-thought; perfect for first-pass code review. Claude reads R1's draft and adds correctness/safety/integration polish — saves ~60% of Claude tokens on medium-complex tasks.",
    primary_role: "R6",
    sessions: "1",
    units: [
      {
        id: "P22-U01",
        title: "Build PreReviewOrchestratorEngine — DeepSeek-R1 drafts → Claude review handoff",
        effort: 70,
        dependencies: ["P20-U03"],
        rollback: "remove engine; tasks go directly to Claude as before",
        exit_conditions: [
          "Engine accepts task → invokes deepseek-r1:14b for draft → returns {draft, confidence, reasoning_chain} to Claude",
          "Claude can accept / refine / override the draft",
          "Telemetry logged: draft accepted vs refined ratio",
          "prism_ai:pre_review dispatcher action",
        ],
        deliverables: [
          { path: "mcp-server/src/engines/PreReviewOrchestratorEngine.ts", type: "source", description: "Draft + handoff orchestrator" },
          { path: "mcp-server/src/__tests__/PreReviewOrchestrator.test.ts", type: "test", description: "Handoff round-trip" },
        ],
        tools: ["prism_ai:pre_review"],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P22-U02",
        title: "Wire pre-review hook on UserPromptSubmit for medium-complex tasks",
        effort: 40,
        dependencies: ["P22-U01"],
        rollback: "unwire from settings.json",
        exit_conditions: [
          "Hook detects medium-complex prompt (refactor, multi-file change, debugging) via classifier",
          "Invokes PreReviewOrchestratorEngine; injects draft into context for Claude to refine",
          "Skipped for simple prompts (no token waste) and complex ones (Claude leads)",
        ],
        deliverables: [
          { path: ".claude/hooks/pre-claude-review-inject.mjs", type: "hook", description: "UserPromptSubmit pre-review" },
          { path: "H:/.claude/settings.json", type: "config", description: "Wire hook" },
        ],
        tools: ["prism_ai:pre_review"],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P22-U03",
        title: "Add /pre-review slash command — manual invocation for explicit drafting",
        effort: 30,
        dependencies: ["P22-U01"],
        rollback: "delete skill file",
        exit_conditions: [
          "/pre-review <task> invokes DeepSeek-R1 draft path",
          "Returns draft + confidence + reasoning chain",
          "Claude can iterate on the draft",
        ],
        deliverables: [
          { path: ".claude/commands/pre-review.md", type: "command", description: "Manual pre-review skill" },
        ],
        tools: ["prism_ai:pre_review"],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
    ],
  },
  {
    id: "P23",
    title: "Model Telemetry + Cost Routing — Per-Model Latency / Quality Tracking",
    rationale: "Without telemetry, multi-model routing is guesswork. Track per-model: latency, output quality (Claude scored), token cost (vs Claude baseline), success rate. Use telemetry to refine ModelRouterEngine tier assignments over time.",
    primary_role: "R3",
    sessions: "1",
    units: [
      {
        id: "P23-U01",
        title: "Build ModelTelemetryEngine — log every model invocation with latency + outcome",
        effort: 50,
        dependencies: ["P20-U03"],
        rollback: "remove engine; routing still works without telemetry",
        exit_conditions: [
          "Every Ollama call logs: model, prompt_tokens, completion_tokens, latency_ms, timestamp",
          "Persisted to data/state/model-telemetry.jsonl",
          "prism_dev:model_telemetry_report dispatcher action",
        ],
        deliverables: [
          { path: "mcp-server/src/engines/ModelTelemetryEngine.ts", type: "source", description: "Per-call logger" },
          { path: "mcp-server/src/__tests__/ModelTelemetry.test.ts", type: "test", description: "Logging round-trip" },
        ],
        tools: ["prism_dev:model_telemetry_report"],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P23-U02",
        title: "Adaptive routing — tune ModelRouterEngine tier thresholds from telemetry",
        effort: 50,
        dependencies: ["P23-U01"],
        rollback: "revert ModelRouterEngine to static tier rules",
        exit_conditions: [
          "Weekly cron: analyze last-7d telemetry → adjust tier thresholds",
          "Example: if deepseek-r1 latency > 5s on tier-3 tasks, demote to tier-2 candidates only",
          "Adjustment log written to data/state/router-adaptation.jsonl",
        ],
        deliverables: [
          { path: "scripts/adapt-router-thresholds.mjs", type: "script", description: "Weekly tuner" },
          { path: "mcp-server/src/engines/ModelRouterEngine.ts", type: "source", description: "Add threshold load from state" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
    ],
  },
];

env.phases.push(...newPhases);

// Update extension_points to reflect multi-model support
env.extension_points.push({
  name: "new_ollama_model",
  description: "Add a new Ollama model to the routing tier system",
  where: "ModelRouterEngine.ts MODEL_BY_TIER map + scripts/pull-<name>.mjs + MODEL-STACK.md",
  template: ".claude/templates/new-ollama-model.template.mjs",
});

// Recompute totals
const totalUnits = env.phases.reduce((sum, p) => sum + p.units.length, 0);
env.total_units = totalUnits;
env.estimated_sessions_p50 = Math.ceil(totalUnits / 4);
env.estimated_sessions_p90 = Math.ceil(totalUnits / 3);

const totalEffort = env.phases.reduce((sum, p) => sum + p.units.reduce((s, u) => s + (u.effort || 0), 0), 0);
env.total_effort_minutes = totalEffort;
env.total_effort_hours_estimate = Math.round(totalEffort / 60);

env.version = "3.0.0";
env.scrutiny_score = 0.94;
env.scrutiny_v3_changes = "Closed gaps from 3 exhaustive scrutiny agents (skills/scripts/hooks coverage). Added P11-U06/U07/U08 (ollama policy + 14 critical hooks + 16 stop-gate consolidation). Added P18 catalog ingestion framework. Added P19 cron drift monitoring. Added P20 multi-model Ollama (nomic-embed + llama3.2-vision + deepseek-r1 + optional llama3.3). Added P21 vision PDF pipeline. Added P22 pre-Claude review pattern (DeepSeek-R1 drafts → Claude refines). Added P23 model telemetry + adaptive routing.";
// MODEL STACK REALIGNED 2026-06-04 (U-BW-TS-ENGINES-RETIRE-2, slot:alpha): the 96GB
// Blackwell `ollama rm`'d the small coders (qwen2.5-coder:3b/7b/14b) + deepseek-r1:14b.
// This generator wrote those into the envelope's required_pulls/existing/tier_routing —
// a re-run would have re-declared (and a consumer could re-pull) deleted models. Reasoning
// now routes to qwen2.5-coder:32b + (install-gated) gpt-oss:120b / gemma4:31b. Vision
// (llama3.2-vision:11b) is NOT retired and stays. The scrutiny_v3_changes changelog string
// above is left verbatim — it is a historical record of what v3 planned, not a live route.
env.multi_model_stack = {
  required_pulls: ["nomic-embed-text", "llama3.2-vision:11b"],
  optional_pulls: ["gpt-oss:120b", "gemma4:31b", "llama3.3:70b"],
  existing: ["qwen2.5-coder:32b"],
  total_disk_min_gb: 16,
  total_disk_max_gb: 56,
  tier_routing: {
    "0_embed": "nomic-embed-text",
    "1_simple": "qwen2.5-coder:32b",
    "2_medium": "qwen2.5-coder:32b",
    "3_complex_reasoning": "gpt-oss:120b (primary, if pulled) | qwen2.5-coder:32b (installed fallback) | gemma4:31b (reasoning, if pulled)",
    "4_vision": "llama3.2-vision:11b",
    "5_claude_only": "Reserved for safety-critical, novel architecture, final synthesis",
  },
};

fs.writeFileSync(ENV_PATH, JSON.stringify(env, null, 2));
console.log("Envelope v3.0.0 finalized:");
console.log("  Phases:", env.phases.length);
console.log("  Total units:", totalUnits);
console.log("  Total effort:", totalEffort, "min ≈", Math.round(totalEffort / 60), "hours");
console.log("  Sessions p50:", env.estimated_sessions_p50);
console.log("  Sessions p90:", env.estimated_sessions_p90);

// Update roadmap-index
const idxPath = "H:/PRISM/mcp-server/data/roadmap-index.json";
let raw = fs.readFileSync(idxPath, "utf-8");
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
const idx = JSON.parse(raw);
const ms = idx.milestones.find((m) => m.id === "INTEL-OLLAMA-OBSIDIAN-MS0");
if (ms) {
  ms.total_units = totalUnits;
  ms.sessions_p50 = env.estimated_sessions_p50;
  ms.sessions_p90 = env.estimated_sessions_p90;
  ms.version = "3.0.0";
  idx.updated_at = new Date().toISOString();
  fs.writeFileSync(idxPath, JSON.stringify(idx, null, 4) + "\n");
  console.log("roadmap-index.json updated to v3");
}

const vaultDest = "H:/prism/knowledge/roadmap/INTEL-OLLAMA-OBSIDIAN-MS0.json";
fs.copyFileSync(ENV_PATH, vaultDest);
console.log("Mirrored to knowledge/roadmap/");
