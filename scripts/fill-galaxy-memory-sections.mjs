#!/usr/bin/env node
// scripts/fill-galaxy-memory-sections.mjs
//
// Bring every galaxy's MEMORY.md up to the canonical MASTER-BRAIN-TEMPLATE
// 4-section brain structure, sourcing from each galaxy's existing
// `knowledge/memories/patterns/<galaxy>_synthesis.md` + a deterministic count
// of its real domain memory/wiki/tribal corpus.
//
// WHY: 29 of 34 galaxy MEMORY.md files had only the `## Master-brain link`
// section (1/4 canonical), with placeholder stubs (`## Candidate <g>-domain
// memories`, `## Proposed structure`) instead of the real
// High-ROI / Indexed / Cross-galaxy-bridges / Known-failure-modes sections a
// slot reads at session start. The compounded knowledge already existed in
// `_synthesis.md`; it just wasn't surfaced into MEMORY.md. (operator directive
// 2026-06-08: "a lot of galaxies dont have all the memories, file paths, wikis
// and tribal knowledge properly mapped to their individual galaxies … utilize
// obsidian and our ollama/docker setup to fill the gaps further")
//
// DISCIPLINE:
//   - ADDITIVE + IDEMPOTENT: inserts a single managed block delimited by
//     <!-- GALAXY-BRAIN-FILL:BEGIN --> … <!-- GALAXY-BRAIN-FILL:END -->.
//     Re-running replaces ONLY that block; never touches the human-authored
//     Master-brain link / Karpathy / Cross-refs sections. (R8, never-delete)
//   - REAL NUMBERS: corpus counts are computed from the filesystem, not guessed.
//     Synthesis-derived prose is tagged advisory (qwen-generated, mustHumanVerify). (R12)
//   - DRY-RUN by default; --apply to write.
//
// Usage:
//   node scripts/fill-galaxy-memory-sections.mjs                 # dry-run, all weak galaxies
//   node scripts/fill-galaxy-memory-sections.mjs --apply         # write
//   node scripts/fill-galaxy-memory-sections.mjs --galaxy cam    # single galaxy (dry-run)
//   node scripts/fill-galaxy-memory-sections.mjs --galaxy cam --apply
//   node scripts/fill-galaxy-memory-sections.mjs --all           # include already-4/4 galaxies too

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");

const ENG_DIR = path.join(REPO, "mcp-server", "src", "engines");
const PATTERNS_DIR = path.join(REPO, "knowledge", "memories", "patterns");
const MEM_DIR = path.join(REPO, "knowledge", "memories");
const WIKI_DIR = path.join(REPO, "knowledge", "wiki");
const TRIBAL_DIR = path.join(WIKI_DIR, "code-tribal");

const BEGIN = "<!-- GALAXY-BRAIN-FILL:BEGIN -->";
const END = "<!-- GALAXY-BRAIN-FILL:END -->";

// Canonical section detectors — a MEMORY.md scores 0..4 against these.
const CANON_SECTIONS = [
  /^##+\s+.*master-?brain link/im,
  /^##+\s+high-roi memories/im,
  /^##+\s+indexed memories/im,
  /^##+\s+(cross-galaxy bridges|known failure modes)/im,
];

// Per-galaxy filename heuristics for counting domain-relevant memories.
// Falls back to the galaxy name + obvious tokens if not listed.
const GALAXY_KEYWORDS = {
  cam: ["cam", "camworks", "toolpath", "strategy", "hypermill", "mastercam", "esprit", "powermill", "fixture", "workholding"],
  cad: ["cad", "step", "feature-recognition", "electrode", "trilobe", "creo", "fusion"],
  mill: ["mill", "vmc", "haas", "mazak", "endmill", "facemill"],
  lathe: ["lathe", "turning", "css", "g50", "chuck", "swiss"],
  wedm: ["wedm", "wire-edm", "edm", "discharge", "ecode", "fa-s", "mitsubishi"],
  "speed-feed": ["speed-feed", "sfc", "kienzle", "taylor", "merchant", "altintas", "feed", "rpm"],
  business: ["business", "erp", "quote", "invoice", "accounting", "crm", "hr"],
  quoting: ["quote", "quoting", "pricing", "docustrata", "cost"],
  academy: ["academy", "course", "curriculum", "lesson", "mit", "certification"],
  "post-processor": ["post-processor", "post", "cps", "controller", "dialect", "masterpost", "gcode"],
  "blueprint-vision": ["blueprint", "ocr", "vision", "vlm", "drawing", "dimension"],
  "ai-training": ["ai-training", "gnn", "graphsage", "lora", "rag", "neural", "train"],
  "shop-floor": ["shop-floor", "machine-status", "adaptive", "spindle-load"],
  quality: ["quality", "cpk", "spc", "tolerance", "gdt", "inspection"],
  "fleet-hygiene": ["fleet", "reaper", "orphan", "zombie", "hygiene", "slot"],
  "hermes-zulu": ["hermes", "zulu", "orchestrat", "fleet-control", "soul"],
  "database-expansion": ["database", "qdrant", "agentdb", "sqlite", "jsonl", "store", "migration"],
  discovery: ["discovery", "duplication", "master-index", "orphan-audit", "coverage"],
  "system-viz": ["system-viz", "graph", "roost", "ghost", "regen-viz"],
  "token-optimization": ["token", "rtk", "ollama-offload", "compaction", "context"],
  wiring: ["wiring", "dispatcher", "orphan-engine", "route"],
  "bug-hunting": ["bug", "regression", "silent", "no-op", "fail-loud"],
  "backend-helper": ["backend", "tsc", "build", "esbuild"],
  "dormant-data": ["dormant", "orphan-data", "unused"],
  "compliance-safety": ["compliance", "safety", "sx", "alarm"],
  "shop-floor-soul": ["shop-floor"],
  "knowledge-conversion": ["knowledge-conversion", "mit", "monolith", "course-forge"],
  "corpus-aggregation": ["corpus", "aggregation", "pdf", "tribal"],
  "mit-curriculum": ["mit", "ocw", "curriculum"],
  "pdf-corpus": ["pdf", "pypdf", "extraction"],
  "pdf-corpus-mill": ["pdf", "mill", "haas", "mazak"],
  "tribal-knowledge": ["tribal", "tip", "shop-wisdom"],
  "cad-fusion-live": ["cad-fusion", "fusion-live", "session"],
  "agent-orchestration": ["orchestrat", "model-routing", "agent"],
  "frontend-app": ["frontend", "react", "nextjs", "web", "ui"],
};

function listFilesRecursive(dir, ext = ".md") {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile() && p.endsWith(ext)) out.push(p);
    }
  }
  return out;
}

// Count domain-relevant memory files (by filename token match) + wiki + tribal.
function countCorpus(galaxy) {
  const kws = GALAXY_KEYWORDS[galaxy] || [galaxy, galaxy.replace(/-/g, "")];
  // Token-boundary match (not raw substring): a 3-letter keyword like "cam"
  // must sit at a word/segment boundary (cam_, _cam, cam-, -cam, .cam, cadcam,
  // cam at start/end) — NOT inside an unrelated word. Filenames are
  // delimiter-rich (snake/kebab/dot), so this is precise without being brittle.
  const escapes = kws.map((k) => k.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  // TRAILING-boundary rule: the keyword must END at a delimiter or string edge
  // (`cam_`, `cam.`, `cam-`, `cam$`). This correctly INCLUDES compound prefixes
  // (`cadcam_`, `gibbscam.`) — where the keyword is a real suffix — and EXCLUDES
  // unrelated words where the keyword is only an internal substring
  // (`camera`, `scampi`, `camcorder`). Product compounds like `camworks` are
  // added to a galaxy's keyword list explicitly rather than caught by `cam`.
  const matchTok = (name) => {
    const n = name.toLowerCase();
    return escapes.some((k) => new RegExp(`${k}([^a-z0-9]|$)`).test(n));
  };
  // `node_*` files are auto-generated graph-node dumps (e.g.
  // node_formula_..._camdispatcher_action_...), NOT curated domain memories.
  // For cam they are 95% of keyword hits (1296 of 1362); for wiring 99%. Counting
  // them as "memories" would present a 20×-inflated domain inventory a slot reads
  // as fact (R12). Exclude them — the same way `patterns/` synthesis is excluded —
  // and surface the raw keyword-hit total separately so the number stays honest.
  const isAutoGen = (base) => /^node_/.test(base);
  const memHits = listFilesRecursive(MEM_DIR).filter((p) => {
    if (p.includes(`${path.sep}patterns${path.sep}`)) return false; // synthesis isn't a "memory"
    return matchTok(path.basename(p));
  });
  const memFiles = memHits.filter((p) => !isAutoGen(path.basename(p)));
  const memAutoGen = memHits.length - memFiles.length;
  const wikiFiles = listFilesRecursive(WIKI_DIR).filter((p) => {
    if (p.includes(`${path.sep}code-tribal${path.sep}`)) return false;
    return matchTok(path.basename(p));
  });
  const tribalFiles = listFilesRecursive(TRIBAL_DIR).filter((p) => matchTok(path.basename(p)));
  return {
    memories: memFiles.length, // curated (node_* auto-gen excluded)
    memAutoGen, // count of excluded auto-gen graph-node files (transparency)
    wiki: wikiFiles.length,
    tribal: tribalFiles.length,
    // Sample from curated memories only — never surface an auto-gen node_* dump
    // as an example "domain memory" to a reading slot.
    sampleMem: memFiles.slice(0, 5).map((p) => path.relative(REPO, p).replace(/\\/g, "/")),
    sampleWiki: wikiFiles.slice(0, 4).map((p) => path.relative(REPO, p).replace(/\\/g, "/")),
    sampleTribal: tribalFiles.slice(0, 3).map((p) => path.relative(REPO, p).replace(/\\/g, "/")),
  };
}

// Parse the synthesis file into { patterns[], decisions[], threads[], meta }.
function parseSynthesis(galaxy) {
  const p = path.join(PATTERNS_DIR, `${galaxy}_synthesis.md`);
  if (!fs.existsSync(p)) return null;
  const t = fs.readFileSync(p, "utf8");
  const grab = (header) => {
    // End at the next ## heading OR true end-of-string. JS has no \Z; use
    // (?![\s\S]) for "no more characters" so the LAST section is never clipped.
    const re = new RegExp(`^##\\s+${header}[^\\n]*\\n([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, "im");
    const m = t.match(re);
    if (!m) return [];
    return m[1]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("- "))
      .map((l) => l.slice(2).trim());
  };
  const synMatch = t.match(/synthesizedFrom:\s*(\d+)/);
  const modelMatch = t.match(/model:\s*([^\n]+)/);
  return {
    patterns: grab("Recurring patterns"),
    decisions: grab("Key decisions[^\\n]*"),
    threads: grab("Open threads"),
    synthesizedFrom: synMatch ? Number(synMatch[1]) : null,
    model: modelMatch ? modelMatch[1].trim() : "unknown",
  };
}

// Cross-galaxy bridge hints: pull existing "Cross-galaxy edges" / "Cross-galaxy"
// lines from the current MEMORY.md so we preserve any human-authored edges.
// IMPORTANT: strip our OWN managed block first. The block emits its own
// `## Cross-galaxy bridges` heading; without stripping it, the non-global
// first-match regex would read the managed block (and re-ingest our own
// placeholder line) instead of a human-authored `## Cross-galaxy edges` section
// that sits AFTER the block — silently never promoting a real human edit.
function extractExistingEdges(memText) {
  const human = memText.replace(new RegExp(`${BEGIN}[\\s\\S]*?${END}`, "m"), "");
  const re = /^##+\s+cross-galaxy[^\n]*\n([\s\S]*?)(?=^##\s+|(?![\s\S]))/im;
  const m = human.match(re);
  if (!m) return [];
  return m[1]
    .split("\n")
    .map((l) => l.trim())
    // Real edge lines: bullet OR contain ↔, but NEVER our own placeholder
    // ("no edges recorded yet") whose ↔ lives inside backticks.
    .filter((l) => l && !l.startsWith("```") && !/no edges recorded yet/i.test(l) &&
      (l.startsWith("- ") || l.includes("↔")))
    .map((l) => l.replace(/^- /, "").trim());
}

function buildBlock(galaxy, corpus, syn, edges) {
  const recallQ = `prism_memory:semantic_search query="${galaxy}" topK=20`;
  const lines = [];
  lines.push(BEGIN);
  lines.push("");
  lines.push("## High-ROI memories");
  const hasSynthContent = !!(syn && (syn.patterns.length || syn.decisions.length));
  if (hasSynthContent) {
    lines.push(`> Distilled from \`knowledge/memories/patterns/${galaxy}_synthesis.md\` ` +
      `(${syn.model || "ollama"}-synthesized from ${syn.synthesizedFrom ?? "?"} domain memories — ` +
      `⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).`);
    lines.push("");
    const top = [...syn.decisions.slice(0, 4), ...syn.patterns.slice(0, 3)];
    for (const item of top) lines.push(`- ${item}`);
  } else {
    // Honest-degrade: do NOT claim "Distilled from" when the synthesis file is
    // missing, empty, or unparseable (e.g. ai-training's was all-NUL). Surface
    // the real state + the exact regeneration command instead of a fabricated
    // "synthesized from ? memories" line that contradicts an empty body. (R12)
    lines.push(`> ⚠ No usable synthesis for this galaxy — \`knowledge/memories/patterns/${galaxy}_synthesis.md\` ` +
      `is missing/empty/unparseable. Regenerate before relying on this section.`);
    lines.push("");
    lines.push(`- _Run \`node scripts/galaxy-synthesis-refresh.mjs --galaxy ${galaxy}\` to compound this galaxy's memories into real High-ROI content._`);
  }
  lines.push("");
  lines.push("## Indexed memories");
  const autoNote = corpus.memAutoGen > 0
    ? ` _(plus ${corpus.memAutoGen} auto-generated \`node_*\` graph-node files excluded from this count)_`
    : "";
  lines.push(`- **Domain corpus (live counts):** ${corpus.memories} curated memory file(s) · ` +
    `${corpus.wiki} wiki entr(y/ies) · ${corpus.tribal} tribal tip(s) matching this galaxy's keyword heuristic.${autoNote}`);
  lines.push(`- **Recall (UP):** \`${recallQ}\` against the master Obsidian brain.`);
  lines.push(`- **Galaxy artifacts:** [\`PATHS.md\`](PATHS.md) (file map) · [\`TOOLBELT.md\`](TOOLBELT.md) (dispatchers/skills) · [\`CLAUDE.md\`](CLAUDE.md) (doctrine).`);
  if (corpus.sampleMem.length) {
    lines.push(`- **Sample memories:** ${corpus.sampleMem.map((m) => `\`${m}\``).join(" · ")}`);
  }
  if (corpus.sampleWiki.length) {
    lines.push(`- **Sample wiki:** ${corpus.sampleWiki.map((w) => `\`${w}\``).join(" · ")}`);
  }
  if (corpus.sampleTribal.length) {
    lines.push(`- **Sample tribal:** ${corpus.sampleTribal.map((tt) => `\`${tt}\``).join(" · ")}`);
  }
  lines.push("");
  lines.push("## Cross-galaxy bridges");
  if (edges.length) {
    for (const e of edges) lines.push(`- ${e}`);
  } else {
    lines.push(`- _(no edges recorded yet — add \`${galaxy} ↔ <other-galaxy>\` lines as integrations land)_`);
  }
  lines.push("");
  lines.push("## Known failure modes");
  if (syn && syn.threads.length) {
    lines.push("> Open threads / risk areas distilled from this galaxy's memories (advisory):");
    for (const th of syn.threads.slice(0, 4)) lines.push(`- ${th}`);
  } else {
    lines.push("- _No open-thread synthesis yet. Capture failure modes as `reference_<slot>_<topic>_<date>.md` memories; they compound into the next synthesis run._");
  }
  lines.push("");
  lines.push(`_Auto-surfaced by \`scripts/fill-galaxy-memory-sections.mjs\` from existing synthesis + live corpus counts. ` +
    `Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._`);
  lines.push("");
  lines.push(END);
  return lines.join("\n");
}

// Insert/replace the managed block. Insert AFTER the Master-brain link section
// (so the human-authored top stays first), before any Karpathy/Cross-refs tail.
function applyBlock(memText, block) {
  if (memText.includes(BEGIN) && memText.includes(END)) {
    // Idempotent replace.
    const re = new RegExp(`${BEGIN}[\\s\\S]*?${END}`, "m");
    return memText.replace(re, block);
  }
  // Find insertion point: end of the Master-brain link section (next ## after it),
  // else after the first heading block, else append.
  const mbIdx = memText.search(/^##+\s+.*master-?brain link/im);
  if (mbIdx >= 0) {
    // Find the next ## heading after the master-brain link section.
    const after = memText.slice(mbIdx);
    const nextHead = after.search(/\n##+\s+/);
    if (nextHead >= 0) {
      const insertAt = mbIdx + nextHead + 1; // keep the newline
      return memText.slice(0, insertAt) + "\n" + block + "\n\n" + memText.slice(insertAt);
    }
  }
  // Fallback: append at end.
  return memText.replace(/\s*$/, "") + "\n\n" + block + "\n";
}

function scoreSections(text) {
  return CANON_SECTIONS.filter((re) => re.test(text)).length;
}

// Pure exports so tests can verify the 1/4→4/4 transition deterministically
// against synthetic input (no coupling to the mutable live engine tree).
export { buildBlock, applyBlock, extractExistingEdges, scoreSections, countCorpus, parseSynthesis, BEGIN, END };

// ---- main ----
function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const all = args.includes("--all");
  const gIdx = args.indexOf("--galaxy");
  const onlyGalaxy = gIdx >= 0 ? args[gIdx + 1] : null;

  const galaxies = fs
    .readdirSync(ENG_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((g) => fs.existsSync(path.join(ENG_DIR, g, "MEMORY.md")));

  const report = [];
  for (const g of galaxies) {
    if (onlyGalaxy && g !== onlyGalaxy) continue;
    const memPath = path.join(ENG_DIR, g, "MEMORY.md");
    const before = fs.readFileSync(memPath, "utf8");
    const scoreBefore = scoreSections(before);
    if (!all && !onlyGalaxy && scoreBefore >= 4) {
      report.push({ g, scoreBefore, scoreAfter: scoreBefore, skipped: "already 4/4" });
      continue;
    }
    const corpus = countCorpus(g);
    const syn = parseSynthesis(g);
    const edges = extractExistingEdges(before);
    const block = buildBlock(g, corpus, syn, edges);
    const after = applyBlock(before, block);
    const scoreAfter = scoreSections(after);
    if (apply) fs.writeFileSync(memPath, after, "utf8");
    report.push({
      g, scoreBefore, scoreAfter,
      mem: corpus.memories, wiki: corpus.wiki, tribal: corpus.tribal,
      synFrom: syn?.synthesizedFrom ?? 0,
      bytesBefore: before.length, bytesAfter: after.length,
      wrote: apply,
    });
  }

  // Summary
  console.log(apply ? "=== APPLIED ===" : "=== DRY-RUN (no files written; pass --apply to write) ===");
  let filled = 0, stillWeak = 0;
  for (const r of report) {
    if (r.skipped) { console.log(`  skip  ${r.g.padEnd(22)} (${r.skipped})`); continue; }
    const arrow = `${r.scoreBefore}/4→${r.scoreAfter}/4`;
    const tag = r.scoreAfter >= 4 ? "✓" : "✗";
    console.log(`  ${tag} ${arrow} ${r.g.padEnd(22)} corpus[mem=${r.mem} wiki=${r.wiki} tribal=${r.tribal} synFrom=${r.synFrom}]  ${r.bytesBefore}→${r.bytesAfter}b`);
    if (r.scoreAfter >= 4) filled++; else stillWeak++;
  }
  console.log(`\n  filled→4/4: ${filled}  |  still <4: ${stillWeak}  |  total processed: ${report.filter((r) => !r.skipped).length}`);
  if (stillWeak > 0) {
    console.log("  ⚠ some galaxies did not reach 4/4 — inspect their MEMORY.md heading structure (non-standard Master-brain link header?).");
  }
}

// Run as CLI only — importing this module (e.g. from the test) must NOT trigger
// a filesystem scan/write. process.argv[1] is the entry script when run directly.
import { pathToFileURL } from "node:url";
const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) main();
