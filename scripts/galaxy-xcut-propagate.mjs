#!/usr/bin/env node
// Idempotent cross-cutting-methodology propagation to every galaxy CLAUDE.md.
// Cross-cutting lane only (uniform, no domain claim -> papa self-review, no owner gate).
// Per GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md. Skips files that already carry the marker.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const ENGINES = "mcp-server/src/engines";
const MARKER = "## Cross-cutting methodology (galaxy-enrichment program";
// Non-galaxy dirs that carry a CLAUDE.md but are NOT galaxies (rules/config/vendor).
const EXCLUDE = new Set([".claude", "__tests__", "lib", "mcp-server", "plugins", "hypermill"]);
const dry = process.argv.includes("--dry");

function section(galaxy) {
  return `

## Cross-cutting methodology (galaxy-enrichment program — cross-cutting lane, papa 2026-06-09)

> Full uniform doctrine: \`state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md\` §Methodology. Below = the cross-cutting lane (pointer + local hooks, drift-resistant — NOT a 34x duplicate). Deep ${galaxy} domain content stays owner-verified (R12: no unverified physics/numeric/safety claim ships unmarked).

**PC-specs + Ollama.** Box: **RTX PRO 6000 Blackwell 96GB · Ryzen 9 9950X3D 32T · 127GB RAM** (gap is utilization, not capacity — size builds to this box). Offload: \`gpt-oss:120b\` (deep domain reasoning, cited), \`qwen2.5-coder:32b\` (engine/test/hook code), \`gpt-oss:20b\` (quick filter/synthesis), \`nomic-embed-text\` (semantic search). Probe via \`OllamaCapabilityProbeEngine\`; never hardcode a retired tag (\`:3b/:7b/:14b/deepseek-r1:14b\` retired 2026-06-04, see \`reference_doc_drift_campaign_2026_06_09\`). <!-- owner-slot: add 1 galaxy-specific Ollama offload example -->

**Loops.** Every \`/loop\` iteration MUST \`loop-state tick\` or \`/compact\` strands the count; dispatch parallel reviewer agents in ONE message (max-duration, not sum); subagent prompts are self-contained (goal · absolute paths · invariants · run-this-test cmd · output format · doctrine refs). <!-- owner-slot: list 1-2 recommended loops for this galaxy -->

**Obsidian vault.** Memory → \`C:/Users/wompu/.claude/projects/H--prism/memory/*.md\` (auto-fed every Stop by \`stop-obsidian-memory-feed.mjs\`; zero manual tagging). Query before re-deriving: \`prism_memory:semantic_search query="${galaxy}" topK=20\`. Vault paths: \`knowledge/{memories,wiki,tribal}/${galaxy}/\`. Index-over-embeddings: atomic notes + \`[[wikilinks]]\` keep recall ≤200 tokens.

**Harness · LoRA · CAG · RAG.** Orchestration in CODE, not the model (R5: routing/retries/status-codes are deterministic JS; agents reason only). **LoRA:** clone-don't-fork india's \`CrossProcessNeuralLearningEngine\` substrate; deploy-gate AUROC≥0.78 / macroF1≥0.55 / Brier≤0.15 on OPERATOR-VERIFIED data. **CAG:** cache immutable doctrine in model KV via \`PromptCachingEngine.buildCachedSystem()\` — migrate static blocks per-turn→SessionStart-cached (reads 0.1×, writes 1.25×, break-even ~1 repeat, 5min TTL). **RAG:** mutable/recent state via \`nomic-embed-text\` + Layer-3 write-time filter ("would this change how the agent acts next time?" — keep signal, discard static parroting).`;
}

const dirs = readdirSync(ENGINES, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).filter(n => !EXCLUDE.has(n)).sort();
const appended = [], skipped = [], noClaude = [];
for (const g of dirs) {
  const p = join(ENGINES, g, "CLAUDE.md");
  if (!existsSync(p)) { noClaude.push(g); continue; }
  const s = readFileSync(p, "utf8");
  if (s.includes(MARKER)) { skipped.push(g); continue; }
  if (!dry) writeFileSync(p, s.replace(/\s*$/, "") + section(g) + "\n");
  appended.push(g);
}
console.log(`${dry ? "[DRY] would append" : "APPENDED"} cross-cutting to ${appended.length} galaxy CLAUDE.md:`);
console.log("  " + appended.join(", "));
console.log(`SKIPPED (already have marker): ${skipped.length} — ${skipped.join(", ") || "(none)"}`);
console.log(`NO CLAUDE.md: ${noClaude.length} — ${noClaude.join(", ") || "(none)"}`);
