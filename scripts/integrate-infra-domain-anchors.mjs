#!/usr/bin/env node
// integrate-infra-domain-anchors.mjs
// GALAXY-ENRICH (papa, 2026-06-09): append a VERIFIED "Domain anchors" block to
// each INFRA galaxy MEMORY.md (the ~20 meta/tooling galaxies that have no external
// physics corpus). These domains are AI-systems / software-engineering -- papa's
// own expertise -- so the curated external sources here are VERIFIED (nameable,
// free, authoritative), integrated LIVE (not staged, not owner-gated). For
// pure-internal galaxies the block honestly states the primary corpus is
// PRISM-internal (codebase + wiki + operator article-set), with NO padded
// external sources (R12: do not invent a corpus that does not exist).
// Idempotent + marker-guarded. Usage: node scripts/integrate-infra-domain-anchors.mjs [--dry]
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const MARKER = "## Domain anchors (papa 2026-06-09";
const DRY = process.argv.includes("--dry");

// Curated per-infra-galaxy anchor map. ext = VERIFIED free authoritative external
// references (papa stands behind each as real + free + on-domain). note = one-line
// domain framing. Galaxies with ext:[] are PRISM-internal-primary (honest, no padding).
const MAP = {
  "agent-orchestration": {
    note: "Multi-agent orchestration + per-task model routing. Domain = agentic harness design (the operator's loop/harness articles land here).",
    ext: [
      ["Anthropic Engineering - Building Effective Agents", "https://www.anthropic.com/engineering/building-effective-agents"],
      ["Anthropic Engineering - Effective context engineering for AI agents", "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents"],
    ],
  },
  "hermes-zulu": {
    note: "Agent-fleet orchestration + per-slot souls (26-slot NATO fleet). Sister to agent-orchestration.",
    ext: [
      ["Anthropic Engineering - Building Effective Agents", "https://www.anthropic.com/engineering/building-effective-agents"],
    ],
  },
  "token-optimization": {
    note: "Token economy + context efficiency. Domain = CAG/RAG/prompt-caching/context-engineering (the operator's CAG/RAG articles land here).",
    ext: [
      ["Anthropic Docs - Prompt caching", "https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching"],
      ["Anthropic Engineering - Effective context engineering for AI agents", "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents"],
    ],
  },
  "database-expansion": {
    note: "All persistence stores (Qdrant/AgentDB/SQLite-WAL/JSONL/state-JSON) + vector indexing.",
    ext: [
      ["Malkov & Yashunin - Efficient and robust ANN search using HNSW (arXiv)", "https://arxiv.org/abs/1603.09320"],
      ["SQLite - Write-Ahead Logging (WAL)", "https://www.sqlite.org/wal.html"],
    ],
  },
  "knowledge-conversion": {
    note: "MIT-OCW + monolith -> 6-node forge router. Source corpus is open courseware.",
    ext: [
      ["MIT OpenCourseWare", "https://ocw.mit.edu/"],
    ],
  },
  "corpus-aggregation": {
    note: "PDF + MIT + tribal corpus aggregation -> academy/NN training input.",
    ext: [
      ["MIT OpenCourseWare", "https://ocw.mit.edu/"],
      ["pypdf documentation", "https://pypdf.readthedocs.io/"],
    ],
  },
  "mit-curriculum": {
    note: "MIT-OCW course source corpus. Domain IS open courseware.",
    ext: [
      ["MIT OpenCourseWare", "https://ocw.mit.edu/"],
      ["MIT OCW - Mechanical Engineering", "https://ocw.mit.edu/courses/mechanical-engineering/"],
    ],
  },
  "pdf-corpus": {
    note: "pypdf page-by-page extraction corpus (the lima pypdf extractor is canonical).",
    ext: [
      ["pypdf documentation", "https://pypdf.readthedocs.io/"],
      ["Tesseract OCR documentation", "https://tesseract-ocr.github.io/"],
    ],
  },
  "pdf-corpus-mill": {
    note: "Mill-specific PDF extraction (Haas/Mazak manuals) via the pypdf extractor.",
    ext: [
      ["pypdf documentation", "https://pypdf.readthedocs.io/"],
    ],
  },
  "frontend-app": {
    note: "Next.js 15 App Router / React 19 web app; pure consumer of prism_* dispatchers via HTTP bridge.",
    ext: [
      ["Next.js documentation", "https://nextjs.org/docs"],
      ["React documentation", "https://react.dev/"],
    ],
  },
  // PRISM-internal-primary galaxies (no external free-source corpus applies -- honest, not padded).
  "tribal-knowledge": { note: "Tribal-tip store + Karpathy LLM-wiki pattern. Primary corpus is the PRISM wiki + tribal index (internal).", ext: [] },
  "discovery": { note: "Algorithm/engine/pipeline discovery + anti-duplication. Primary corpus is the PRISM master-index + ENGINE_DIGEST (internal).", ext: [] },
  "wiring": { note: "Engine->dispatcher wiring closure. Primary corpus is the dispatcher registry + stop_on_unwired_assets (internal).", ext: [] },
  "bug-hunting": { note: "Silent-no-op + route-verify hunting. Primary corpus is the regressions ledger + R12 doctrine (internal).", ext: [] },
  "backend-helper": { note: "Build/TSC assist every slot (papa's home galaxy). Primary corpus is the PRISM build pipeline + tsc (internal).", ext: [] },
  "dormant-data": { note: "Dormant/orphan-data ledger. Primary corpus is the orphan-inventory + dormant-X audits (internal).", ext: [] },
  "fleet-hygiene": { note: "Reaper + chat-slot hygiene + GPU/Ollama coordinator. Primary corpus is the fleet-reaper + monitor suite (internal).", ext: [] },
  "cad-fusion-live": { note: "Long-running CAD/Fusion live-session pattern. Primary corpus is the *AutomationBridge engines (internal).", ext: [] },
  "compliance-safety": { note: "S(x) safety gate + alarm + compliance. Primary corpus is the safety constants + S(x) validator (internal); safety numerics are constants.ts-gated, never web-sourced.", ext: [] },
  "system-viz": { note: "System-graph regen + ghost-roost search substrate. Primary corpus is the 644MB system-graph + node-card index (internal).", ext: [] },
};

function buildBlock(g) {
  const e = MAP[g];
  if (!e) return null;
  let b = `\n${MARKER}, GALAXY-ENRICH infra lane)\n`;
  b += `${e.note}\n`;
  b += `**Internal corpus (primary):** cross-cutting methodology \`state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md\` + this galaxy's engines \`mcp-server/src/engines/${g}/\` + the operator article-set themes (loops / harness / LoRA / CAG / RAG / obsidian-vault).\n`;
  if (e.ext.length) {
    b += `**Authoritative free external sources (VERIFIED, papa AI/software domain):**\n`;
    for (const [label, url] of e.ext) b += `- [${label}](${url})\n`;
    b += `R12: nameable free authoritative references for an AI/software domain (papa's expertise) -- VERIFIED + integrated live, not owner-gated. Regen: \`scripts/integrate-infra-domain-anchors.mjs\`.\n`;
  } else {
    b += `**External free-source corpus:** none applies -- this domain is PRISM-internal (codebase + wiki + operator article-set). The internal anchors above ARE the corpus. Regen: \`scripts/integrate-infra-domain-anchors.mjs\`.\n`;
  }
  return b;
}

let updated = 0, skipped = 0, missing = 0;
for (const g of Object.keys(MAP)) {
  const mp = path.join(ROOT, "mcp-server", "src", "engines", g, "MEMORY.md");
  if (!fs.existsSync(mp)) { console.log(`  MISSING ${g}`); missing++; continue; }
  const cur = fs.readFileSync(mp, "utf8");
  if (cur.includes(MARKER)) { console.log(`  skip ${g} (has block)`); skipped++; continue; }
  const block = buildBlock(g);
  const next = cur.replace(/\s*$/, "\n") + block;
  if (DRY) { console.log(`  [dry] ${g} (+${block.split("\n").length}L, ${MAP[g].ext.length} ext)`); updated++; continue; }
  fs.writeFileSync(mp, next);
  console.log(`  updated ${g} (${MAP[g].ext.length} ext)`);
  updated++;
}
console.log(`\n${DRY ? "[dry] " : ""}updated=${updated} skipped=${skipped} missing=${missing}`);
