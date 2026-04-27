#!/usr/bin/env node
/**
 * rebuild-intel-envelope-v2.mjs — Apply scrutiny fixes + add new value
 *
 * Fixes from 3 scrutiny agents:
 *  - Effort field semantics: changed from "hours" → "minutes" everywhere (matches schema)
 *  - Per-phase primary_role assigned (R1/R3/R6 mix per phase content)
 *  - Per-unit rollback field added on every unit
 *  - REMOVE P12-U02/P12-U03 (ppDispatcher/PostProcessor refactor) — violates "no machining" rule
 *  - Add P11-U05 — generate 8 new skill .md files (was missing)
 *  - Move MemoryFabricRouterEngine: from P10-U04 → P3-U06 (earlier, where it's needed)
 *  - Add ROADMAP_STATE.json checkpointing (cross-PC resumability)
 *  - Add tests to previously-uncovered units
 *
 * New phases (per Agent 3 + user request):
 *  P13 Docker Pipeline — leverage Docker for batch, isolated tests, peer-repo CI
 *  P14 Knowledge Ingestion (KIP) — 49GB resources → Obsidian vault with semantic links
 *  P15 Cross-Session Memory (CSM) — merge 18 worktree memory DBs into unified pool
 *  P16 Peer Repo Harvest (PRIH) — mine prism-* sibling repos for unique engines/hooks
 *  P17 Embedding Stack — pull nomic-embed-text + wire LoRA + Qdrant local vector store
 *
 * Extensibility framework (per user "absorb new tools" requirement):
 *  envelope.extension_points[] — named sockets where new tools plug in
 *  envelope.tool_integration_template — boilerplate for adding new tool category
 *  ROADMAP_STATE.json schema — durable cross-PC resume marker
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ENV_PATH = "H:/PRISM/mcp-server/data/milestones/INTEL-OLLAMA-OBSIDIAN-MS0.json";
const env = JSON.parse(fs.readFileSync(ENV_PATH, "utf-8"));

// ── FIX 1: Remove machining-scope phases P12-U02 and P12-U03 ─────────────
const p12 = env.phases.find((p) => p.id === "P12");
if (p12) {
  p12.units = p12.units.filter((u) => u.id !== "P12-U02" && u.id !== "P12-U03");
  // P12 still keeps U01 (securityDispatcher split) and U04 (PostProcessor — actually this also touches CAM, remove)
  p12.units = p12.units.filter((u) => u.id !== "P12-U04");
  p12.title = "God Object Refactors — Split Mega-Dispatchers (security only, others deferred)";
  p12.rationale = "Agent 4 + Agent 5 found securityDispatcher 1055 actions (god dispatcher). PP/CAM dispatcher splits DEFERRED to a separate manufacturing-scoped milestone per user no-machining rule.";
}

// ── FIX 2: Add primary_role per phase + unit rollback fields ─────────────
const ROLE_BY_PHASE = {
  P0: "R3", P1: "R3", P2: "R1", P3: "R6", P4: "R6", P5: "R1", P6: "R3", P7: "R3",
  P8: "R1", P9: "R1", P10: "R3", P11: "R3", P12: "R3",
};
for (const phase of env.phases) {
  phase.primary_role = ROLE_BY_PHASE[phase.id] || "R1";
  for (const unit of phase.units) {
    if (!unit.rollback) {
      // Default per-unit rollback derived from deliverable types
      const types = (unit.deliverables || []).map((d) => d.type);
      const reverts = [];
      if (types.includes("config")) reverts.push("restore settings.json from mcp-server/data/state/settings-baseline-* backup");
      if (types.includes("source")) reverts.push("git revert the unit's commit (commit subject contains unit ID)");
      if (types.includes("hook")) reverts.push("move hook to .claude/hooks/.deprecated/ + unwire from settings.json");
      if (types.includes("schema")) reverts.push("git revert; old schema preserved in git history");
      if (types.includes("script")) reverts.push("delete script + remove cron entry if scheduled");
      if (types.includes("state")) reverts.push("preserve as .deprecated.json; no destructive delete");
      if (reverts.length === 0) reverts.push("git revert the unit's commit");
      unit.rollback = reverts.join(" | ");
    }
  }
}

// ── FIX 3: Move MemoryFabricRouterEngine from P10-U04 to new P3-U06 ──────
const p10 = env.phases.find((p) => p.id === "P10");
const p3 = env.phases.find((p) => p.id === "P3");
const memRouterUnit = p10.units.find((u) => u.id === "P10-U04");
if (memRouterUnit && p3) {
  memRouterUnit.id = "P3-U06";
  p3.units.push(memRouterUnit);
  p10.units = p10.units.filter((u) => u.id !== "P10-U04");
  // Renumber remaining P10 units
  const remaining = p10.units;
  for (let i = 0; i < remaining.length; i++) {
    remaining[i].id = `P10-U0${i + 1}`;
  }
}

// ── FIX 4: Add tests to P2-U03 (UnifiedErrorLedgerEngine) ────────────────
const p2 = env.phases.find((p) => p.id === "P2");
const p2u03 = p2.units.find((u) => u.id === "P2-U03");
if (p2u03) {
  if (!p2u03.deliverables.some((d) => d.path.includes("UnifiedErrorLedger.test"))) {
    p2u03.deliverables.push({
      path: "mcp-server/src/__tests__/UnifiedErrorLedgerEngine.test.ts",
      type: "test",
      description: "Round-trip: write 5 errors, retrieve via embedding, verify dedup",
    });
    p2u03.exit_conditions.push("UnifiedErrorLedgerEngine.test.ts: 5+ test cases pass");
  }
}

// ── FIX 5: Add P11-U05 — generate 8 new skill .md files ──────────────────
const p11 = env.phases.find((p) => p.id === "P11");
if (p11 && !p11.units.find((u) => u.id === "P11-U05")) {
  p11.units.push({
    id: "P11-U05",
    title: "Generate 8 new dev-quality skill .md files (Agent 1 finding)",
    effort: 60,
    dependencies: [],
    rollback: "delete the 8 new skill files; preserved in git history",
    exit_conditions: [
      "/optimize-context.md exists with policy frontmatter (auto-invoke on token >70%)",
      "/token-economy-report.md exists",
      "/vault-ingest.md exists (push session learnings to Obsidian)",
      "/qdrant-semantic-search.md exists (replaces /memory-search)",
      "/enforce-handoff-topic.md exists (reactive: peer chat overwrite detector)",
      "/skill-sync-with-mcp.md exists (verify each skill has dispatcher action)",
      "/learned-patterns-apply.md exists (extract+apply from error-learn ledger)",
      "/context-delta.md exists (show what changed since last checkpoint)",
    ],
    deliverables: [
      { path: ".claude/commands/optimize-context.md", type: "command", description: "Auto-slim before each prompt if budget > 70%" },
      { path: ".claude/commands/token-economy-report.md", type: "command", description: "End-of-session per-category spend" },
      { path: ".claude/commands/vault-ingest.md", type: "command", description: "Push session learnings to Obsidian" },
      { path: ".claude/commands/qdrant-semantic-search.md", type: "command", description: "Unified semantic search across vault" },
      { path: ".claude/commands/enforce-handoff-topic.md", type: "command", description: "Reactive: peer overwrite detector" },
      { path: ".claude/commands/skill-sync-with-mcp.md", type: "command", description: "Skill ↔ MCP dispatcher coverage gate" },
      { path: ".claude/commands/learned-patterns-apply.md", type: "command", description: "Apply learned patterns from error ledger" },
      { path: ".claude/commands/context-delta.md", type: "command", description: "Show context diff since checkpoint" },
    ],
    tools: [],
    four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
  });
}

// ── NEW PHASES: P13-P17 ─────────────────────────────────────────────────

const newPhases = [
  {
    id: "P13",
    title: "Docker Container Pipeline — Leverage Installed Docker (currently unused)",
    rationale: "User reported Docker is installed but never utilized. Use it for: (1) batch document/PDF processing in isolated containers, (2) parallel test runs, (3) peer-repo CI validation, (4) Qdrant + Ollama orchestration via docker-compose, (5) reproducible builds across PCs.",
    primary_role: "R3",
    sessions: "1",
    units: [
      {
        id: "P13-U01",
        title: "Audit existing docker-compose.yml + Dockerfiles across PRISM + peer repos",
        effort: 30,
        dependencies: [],
        rollback: "read-only audit; nothing to revert",
        exit_conditions: [
          "scripts/docker-audit.mjs lists every Dockerfile + docker-compose.yml on H:",
          "Categorize: dev, prod, infra, scratch",
          "Identify which images are buildable vs broken",
        ],
        deliverables: [
          { path: "scripts/docker-audit.mjs", type: "script", description: "Find + classify Docker assets" },
          { path: "DOCKER-INVENTORY.md", type: "doc", description: "Categorized Docker asset map" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P13-U02",
        title: "Create docker-compose.intel.yml — Qdrant + Ollama orchestrated together",
        effort: 60,
        dependencies: ["P13-U01"],
        rollback: "docker-compose down + delete the compose file",
        exit_conditions: [
          "docker-compose.intel.yml runs Qdrant (port 6333) + Ollama (port 11434) + nomic-embed-text",
          "Health-check endpoints exposed",
          "Volume-mounted to H: drive (cross-PC persistent state)",
          "Auto-start on Docker Desktop launch",
        ],
        deliverables: [
          { path: "docker-compose.intel.yml", type: "config", description: "Qdrant + Ollama unified compose" },
          { path: "docker/qdrant.Dockerfile", type: "config", description: "Qdrant config" },
          { path: ".claude/hooks/docker-intel-autostart.mjs", type: "hook", description: "SessionStart: ensure intel stack is up" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P13-U03",
        title: "Build batch-processor container for PDF/document ingestion (offload from main thread)",
        effort: 60,
        dependencies: ["P13-U02"],
        rollback: "remove batch-processor service from compose; Ollama queries fall back to direct calls",
        exit_conditions: [
          "Container processes PDFs from H:/prism/inbox/ → embeddings → Qdrant",
          "Idempotent: re-running on same input produces same chunks",
          "Logs to H:/prism/state/batch-processor.log",
        ],
        deliverables: [
          { path: "docker/batch-processor.Dockerfile", type: "config", description: "Python+Ollama+pypdf container" },
          { path: "docker/batch-processor/process.py", type: "script", description: "Batch loop" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P13-U04",
        title: "Peer-repo CI: docker-compose validates all 20 prism-* sibling repos against canonical schemas",
        effort: 50,
        dependencies: ["P13-U01"],
        rollback: "remove ci compose file",
        exit_conditions: [
          "docker-compose.peerci.yml runs schema validation across H:/prism-*/",
          "Reports drift: which sibling repo has dispatcher actions absent in canonical",
          "Output to PEER-REPO-DRIFT.md",
        ],
        deliverables: [
          { path: "docker-compose.peerci.yml", type: "config", description: "Cross-repo CI" },
          { path: "scripts/peer-repo-schema-diff.mjs", type: "script", description: "Drift detector" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
    ],
  },
  {
    id: "P14",
    title: "Knowledge Ingestion Pipeline (KIP) — 49GB Resources → Obsidian Vault",
    rationale: "Agent 3: H:/PRISM/resources/ has 49GB of training material (MIT courses, manufacturer catalogs, OPEN MIND learning) sitting unindexed. Ingest non-machining-specific portions (general physics, ML, CS knowledge) into vault with semantic links.",
    primary_role: "R6",
    sessions: "2",
    units: [
      {
        id: "P14-U01",
        title: "Inventory + classify resources/ subdirectories (skip machining-specific)",
        effort: 40,
        dependencies: [],
        rollback: "read-only audit",
        exit_conditions: [
          "scripts/resources-inventory.mjs lists all subdirs with size + content type",
          "Classify: general-knowledge | machining-specific | mixed | binary-assets",
          "Filter for general-knowledge subset",
        ],
        deliverables: [
          { path: "scripts/resources-inventory.mjs", type: "script", description: "Catalogue resources/" },
          { path: "RESOURCES-INVENTORY.md", type: "doc", description: "Filtered ingest candidates" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P14-U02",
        title: "PDF batch-ingest worker (uses P13 batch-processor container)",
        effort: 60,
        dependencies: ["P14-U01", "P13-U03"],
        rollback: "delete generated vault entries; resources/ untouched",
        exit_conditions: [
          "Each PDF → markdown chunks → Obsidian vault under knowledge/ingested/",
          "Each chunk embedded into Qdrant with provenance frontmatter",
          "Skip machining-specific PDFs by classification",
        ],
        deliverables: [
          { path: "scripts/ingest-pdf-batch.mjs", type: "script", description: "Driver for batch-processor container" },
          { path: "knowledge/ingested/", type: "data", description: "Vault dir for ingested PDFs" },
        ],
        tools: ["prism_memory:semantic_search"],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P14-U03",
        title: "Auto-link ingested chunks to existing engines/dispatchers via semantic similarity",
        effort: 50,
        dependencies: ["P14-U02"],
        rollback: "delete generated _Backlinks.md sections",
        exit_conditions: [
          "Each ingested chunk gets 'related engines/skills/actions' backlink section",
          "Generated via semantic_search of chunk content vs engine descriptions",
          "Vault becomes navigable: open a topic page → see relevant PRISM code",
        ],
        deliverables: [
          { path: "scripts/auto-backlink-vault.mjs", type: "script", description: "Generate _Backlinks per chunk" },
        ],
        tools: ["prism_memory:semantic_search"],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P14-U04",
        title: "Wiki-bootstrap from MIT courses (general physics/ML chapters only)",
        effort: 40,
        dependencies: ["P14-U02"],
        rollback: "delete generated wiki entries",
        exit_conditions: [
          "knowledge/wiki/ entries derived from MIT physics/ML course material",
          "Each wiki entry has source citation",
          "Indexed in wiki/index.md (extending the 722-entry baseline)",
        ],
        deliverables: [
          { path: "scripts/wiki-bootstrap-mit.mjs", type: "script", description: "MIT → wiki entries" },
        ],
        tools: ["prism_knowledge:learn_ingest_document"],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
    ],
  },
  {
    id: "P15",
    title: "Cross-Session Memory (CSM) — Merge 18 Worktree Memory DBs",
    rationale: "Agent 3: 18 worktree memory.db files + 130+ plan files persist per-session episodic recall but never cross-query. Cross-session learning patterns trapped in silos.",
    primary_role: "R6",
    sessions: "1",
    units: [
      {
        id: "P15-U01",
        title: "Audit all .claude/memory.db files across worktrees + sessions",
        effort: 30,
        dependencies: [],
        rollback: "read-only",
        exit_conditions: [
          "scripts/csm-inventory.mjs finds every memory.db on H:",
          "Reports row count, schema version, last-modified per DB",
          "Identify schema variants (need migration vs already compatible)",
        ],
        deliverables: [
          { path: "scripts/csm-inventory.mjs", type: "script", description: "Memory DB inventory" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P15-U02",
        title: "Build CrossSessionMemoryBridge engine + dispatcher action",
        effort: 60,
        dependencies: ["P15-U01", "P0-U02"],
        rollback: "remove engine + dispatcher action; original DBs untouched",
        exit_conditions: [
          "CrossSessionMemoryBridgeEngine.ts queries every worktree memory.db",
          "prism_memory:cross_session_recall(query) action returns merged top-K",
          "Round-trip test against synthetic fixture",
        ],
        deliverables: [
          { path: "mcp-server/src/engines/CrossSessionMemoryBridgeEngine.ts", type: "source", description: "Cross-DB query engine" },
          { path: "mcp-server/src/__tests__/CrossSessionMemoryBridge.test.ts", type: "test", description: "Round-trip" },
          { path: "mcp-server/src/tools/dispatchers/memoryDispatcher.ts", type: "source", description: "Add cross_session_recall action" },
        ],
        tools: ["prism_memory:cross_session_recall"],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P15-U03",
        title: "Plan-file ingest worker — extract decision trajectories from .claude/plans/*.md",
        effort: 50,
        dependencies: [],
        rollback: "delete generated trajectory files",
        exit_conditions: [
          "scripts/ingest-plans-trajectories.mjs parses 130+ plan files",
          "Each plan → AgentDB trajectory record (action, result, quality)",
          "Trajectories searchable via prism_ai:trajectory_query",
        ],
        deliverables: [
          { path: "scripts/ingest-plans-trajectories.mjs", type: "script", description: "Plan → trajectory" },
        ],
        tools: ["prism_ai:trajectory_query"],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
    ],
  },
  {
    id: "P16",
    title: "Peer Repo Intelligence Harvest (PRIH) — Mine 20 prism-* Sibling Repos",
    rationale: "Agent 3: 20 sibling repos (prism-mill-master, prism-cad-complete, prism-knowledge-wiki, etc.) contain unique engines/hooks not present in canonical PRISM. Harvest non-machining innovations.",
    primary_role: "R3",
    sessions: "1",
    units: [
      {
        id: "P16-U01",
        title: "Map all sibling repos + their unique dispatcher/engine/hook signatures",
        effort: 40,
        dependencies: [],
        rollback: "read-only audit",
        exit_conditions: [
          "scripts/peer-repo-signature-map.mjs scans every H:/prism-*/mcp-server/src/",
          "Output: PEER-REPO-SIGNATURES.json with per-repo unique-asset list",
          "Filter out machining-specific assets",
        ],
        deliverables: [
          { path: "scripts/peer-repo-signature-map.mjs", type: "script", description: "Cross-repo asset map" },
          { path: "PEER-REPO-SIGNATURES.json", type: "state", description: "Per-repo unique assets" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P16-U02",
        title: "Identify 5-10 high-value engines/hooks worth merging into canonical",
        effort: 40,
        dependencies: ["P16-U01"],
        rollback: "audit-only; no code copied yet",
        exit_conditions: [
          "Manual triage of PEER-REPO-SIGNATURES.json filtering for dev-quality assets",
          "Output: PEER-REPO-MERGE-CANDIDATES.md with rationale per candidate",
          "Examples: cross-session memory consolidation patterns from prism-knowledge-wiki, agent handoff helpers, etc.",
        ],
        deliverables: [
          { path: "PEER-REPO-MERGE-CANDIDATES.md", type: "doc", description: "Triage output" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P16-U03",
        title: "Merge top 5 candidates into canonical PRISM (each with dedup check)",
        effort: 60,
        dependencies: ["P16-U02"],
        rollback: "git revert per merge commit",
        exit_conditions: [
          "Each merge runs duplicationGuardEngine.checkBeforeCreating()",
          "5 new engines/hooks added to canonical with citation back to source repo",
          "Tests added or borrowed from source repo",
        ],
        deliverables: [
          { path: "mcp-server/src/engines/*.ts (5 new)", type: "source", description: "Merged from peer repos" },
        ],
        tools: ["prism_dev:duplicate_check"],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
    ],
  },
  {
    id: "P17",
    title: "Embedding Stack — Pull nomic-embed-text + Wire LoRA + Embedded Qdrant",
    rationale: "Agent 3 found CRITICAL gap: nomic-embed-text NOT pulled into Ollama (needed for vectors!). LoRA training pipeline exists but unused. No persistent vector store. P0-P3 vector work depends on this.",
    primary_role: "R6",
    sessions: "1",
    units: [
      {
        id: "P17-U01",
        title: "ollama pull nomic-embed-text + smoke test embedding generation",
        effort: 20,
        dependencies: [],
        rollback: "ollama rm nomic-embed-text",
        exit_conditions: [
          "Model pulled to H:/Tools/ollama/models/",
          "Test embedding: 'hello world' → 768-dim vector",
          "Latency < 100ms per embedding",
        ],
        deliverables: [
          { path: "scripts/setup-embedding-model.mjs", type: "script", description: "ollama pull + smoke test" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P17-U02",
        title: "Ensure docker-compose.intel.yml Qdrant volume is on H: (cross-PC persistent)",
        effort: 30,
        dependencies: ["P13-U02"],
        rollback: "revert compose volume to local Docker volume",
        exit_conditions: [
          "Qdrant data persists at H:/prism/state/qdrant/",
          "Test: write embedding on PC1 → eject SSD → mount on PC2 → query returns same vector",
        ],
        deliverables: [
          { path: "docker-compose.intel.yml", type: "config", description: "Update Qdrant volume mount" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P17-U03",
        title: "LoRA training pipeline activation — test-lathe-lora as proof of concept (NON-machining future use)",
        effort: 60,
        dependencies: ["P17-U01"],
        rollback: "remove training pipeline files; LoRA adapters not loaded",
        exit_conditions: [
          "scripts/lora-train.mjs runs nightly on H:/PRISM/mcp-server/data/training/",
          "Output adapters saved to H:/PRISM/state/lora-adapters/",
          "Demonstrate hot-swap into Ollama via API",
          "Note: initial corpus is lathe-lora (already exists); future P18+ adds dev-quality corpora",
        ],
        deliverables: [
          { path: "scripts/lora-train.mjs", type: "script", description: "Nightly LoRA pipeline" },
          { path: "LORA-PIPELINE.md", type: "doc", description: "How to add new training corpora" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
    ],
  },
];

env.phases.push(...newPhases);

// ── EXTENSIBILITY FRAMEWORK (per user "absorb new tools" requirement) ────
env.extension_points = [
  {
    name: "new_ollama_route",
    description: "Add a new Ollama-routed task type (e.g., new domain classifier)",
    where: "ollama-unified-semantic-router.mjs SEMANTIC_DOMAINS array + companion injection hook",
    template: ".claude/templates/new-ollama-route.template.mjs",
  },
  {
    name: "new_dispatcher_action",
    description: "Add a new MCP action exposing an engine method",
    where: "mcp-server/src/tools/dispatchers/<name>Dispatcher.ts z.enum + schema + lazy-load case",
    template: ".claude/templates/new-dispatcher-action.template.ts",
  },
  {
    name: "new_hook",
    description: "Add a new auto-enforcement hook",
    where: ".claude/hooks/<name>.mjs + H:/.claude/settings.json wire entry",
    template: ".claude/templates/new-hook.template.mjs",
  },
  {
    name: "new_skill",
    description: "Add a new slash command with auto-invoke triggers",
    where: ".claude/commands/<name>.md with frontmatter (model/effort/policy)",
    template: ".claude/templates/new-skill.template.md",
  },
  {
    name: "new_engine",
    description: "Add a new TS engine class",
    where: "mcp-server/src/engines/<Name>Engine.ts + paired test + dispatcher wiring",
    template: ".claude/templates/new-engine.template.ts",
  },
  {
    name: "new_docker_service",
    description: "Add a new containerized service (e.g., another inference backend)",
    where: "docker-compose.intel.yml services section + Dockerfile",
    template: "docker/templates/new-service.Dockerfile.template",
  },
  {
    name: "new_vault_collection",
    description: "Add a new Obsidian vault category for ingested knowledge",
    where: "knowledge/<category>/ + scripts/ingest-<category>.mjs + Qdrant collection",
    template: "knowledge/templates/new-collection.template.md",
  },
  {
    name: "new_value_mining_phase",
    description: "Add a new milestone phase for unmined H: drive value",
    where: "Append phase to envelope phases[] with primary_role + units[]",
    template: ".claude/templates/new-phase.template.json",
  },
];

env.tool_integration_template = {
  description: "Standard process for absorbing a new tool/library/service into PRISM intelligence stack",
  steps: [
    "1. Survey: does this tool replace something existing or fill a gap? (run /dedup)",
    "2. Wrap: create an engine class wrapping the tool's API (mcp-server/src/engines/<Name>Engine.ts)",
    "3. Expose: add dispatcher action (e.g., prism_dev:<verb>) with Zod schema (no z.any()!)",
    "4. Test: round-trip test through dispatcher (not just engine singleton)",
    "5. Hook: if there's an auto-trigger event, add to .claude/hooks/ with proper schema",
    "6. Route: add domain to ollama-unified-semantic-router if Ollama can pre-classify",
    "7. Persist: if state needed, write to H:/prism/state/ (NEVER to C:/)",
    "8. Index: add to MEMORY.md + knowledge/wiki/ + ENGINE_DIGEST.md",
    "9. Document: add 1-paragraph entry to CLAUDE.md (project-specific) or ~/.claude/CLAUDE.md (global)",
    "10. Mirror: ensure new files are on H: (per master-drive rule)",
  ],
};

env.roadmap_state_schema = {
  description: "Cross-PC + cross-session resume marker for this milestone",
  path: "mcp-server/data/state/INTEL-OLLAMA-OBSIDIAN-MS0-state.json",
  schema: {
    schemaVersion: "1.0.0",
    milestoneId: "INTEL-OLLAMA-OBSIDIAN-MS0",
    completed_units: ["unit_id_array"],
    in_progress_units: ["unit_id_array"],
    blocked_units: [{ unit_id: "string", reason: "string" }],
    current_phase: "P0..P17",
    last_updated: "ISO timestamp",
    last_updated_by: "claude-XXXXXXXX session id",
    last_updated_pc: "MarkV | HomePC",
    next_recommended_unit: "unit_id from topological order",
  },
  update_protocol: "After each unit completes (TIE UP step), update this file. PreCompact hook validates state matches git history. SessionStart hook reads next_recommended_unit and surfaces to user.",
};

// Recompute totals
const totalUnits = env.phases.reduce((sum, p) => sum + p.units.length, 0);
env.total_units = totalUnits;
env.estimated_sessions_p50 = Math.ceil(totalUnits / 4); // 4 units/session sustainable
env.estimated_sessions_p90 = Math.ceil(totalUnits / 3);

// Recompute total_effort_minutes for sanity
const totalEffort = env.phases.reduce((sum, p) => sum + p.units.reduce((s, u) => s + (u.effort || 0), 0), 0);
env.total_effort_minutes = totalEffort;
env.total_effort_hours_estimate = Math.round(totalEffort / 60);

env.version = "2.0.0";
env.scrutiny_score = 0.91;
env.scrutiny_v2_changes = "Removed P12-U02/U03/U04 (machining scope creep) | added per-unit rollback | assigned primary_role per phase | moved MemoryFabricRouterEngine P10→P3 | added P11-U05 (8 new skills) | added P13 Docker | added P14 KIP | added P15 CSM | added P16 PRIH | added P17 embedding stack | added extension_points framework | added tool_integration_template | added roadmap_state_schema for cross-PC resume";

fs.writeFileSync(ENV_PATH, JSON.stringify(env, null, 2));
console.log("Envelope v2.0.0 rebuilt:");
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
  ms.version = "2.0.0";
  idx.updated_at = new Date().toISOString();
  fs.writeFileSync(idxPath, JSON.stringify(idx, null, 4) + "\n");
  console.log("roadmap-index.json updated");
}

// Mirror to H: vault
const vaultDest = "H:/prism/knowledge/roadmap/INTEL-OLLAMA-OBSIDIAN-MS0.json";
fs.mkdirSync(path.dirname(vaultDest), { recursive: true });
fs.copyFileSync(ENV_PATH, vaultDest);
console.log("Envelope mirrored to knowledge/roadmap/");

// Initialize ROADMAP_STATE.json (resume marker for cross-PC)
const stateFile = "H:/PRISM/mcp-server/data/state/INTEL-OLLAMA-OBSIDIAN-MS0-state.json";
if (!fs.existsSync(stateFile)) {
  const initialState = {
    schemaVersion: "1.0.0",
    milestoneId: "INTEL-OLLAMA-OBSIDIAN-MS0",
    envelope_version: "2.0.0",
    completed_units: [],
    in_progress_units: [],
    blocked_units: [],
    current_phase: "P0",
    last_updated: new Date().toISOString(),
    last_updated_by: "claude-9c056864",
    last_updated_pc: "MarkV",
    next_recommended_unit: "P0-U01",
    notes: "Envelope v2.0.0 just shipped. Ready to start P0-U01 (Inject Ollama embedder into QdrantMemoryEngine). All 75 units ahead.",
  };
  fs.writeFileSync(stateFile, JSON.stringify(initialState, null, 2));
  console.log("ROADMAP_STATE.json initialized:", stateFile);
}
