/**
 * vault-wiki-to-lora-dataset.mjs -- turn PRISM's curated DOMAIN-KNOWLEDGE wiki
 * spine into LoRA instruction-tuning pairs. (AI-SYSTEMS-LORA, slot:india 2026-06-21.)
 *
 * WHY (the gap this closes -- verified, not assumed):
 *   The vault->LoRA feed already mines FOUR sources:
 *     1. feedback/*.md doctrine rules          (vault-to-lora-dataset.mjs --source feedback)
 *     2. <galaxy>_synthesis.md brains          (                          --source galaxy)
 *     3. galaxy CLAUDE.md "## AI Synergy"      (                          --source galaxy-ai-synergy)
 *     4. code-tribal/learnings/*.md failures   (vault-lessons-to-lora-dataset.mjs)
 *   NONE of them reads the curated per-domain WIKI spine -- the practitioner-
 *   knowledge layer (`<galaxy>/<galaxy>-applied-practice.md`, `-foundations.md`,
 *   reference/, software-engineering/, training/, ...). That spine is premium,
 *   source-verified DOMAIN expertise (e.g. `wedm/wedm-applied-practice.md` = 14
 *   WebFetch-confirmed wire-EDM gotchas, each a self-contained "gotcha -> why ->
 *   expert avoidance"). For the self-owned per-domain LoRA adapters this is
 *   exactly the missing signal: not doctrine, not failure-fixes -- actual
 *   manufacturing/engineering domain knowledge, galaxy-tagged for per-domain
 *   adapter splits.
 *
 * NOT a duplicate (R8 / duplicationGuard, body-read confirmed):
 *   - vault-lessons-to-lora owns `knowledge/wiki/code-tribal/learnings/**` (the
 *     failure->fix narratives) -- EXCLUDED here so the two never overlap.
 *   - The machine-generated bulk -- `architecture/**` (~36K auto per-action
 *     stubs), `os/**` (PRISM-OS action stubs), `consensus/**` (claude-flow
 *     vendor noise), `code-tribal/**`, `lessons/**` (process notes) -- is the
 *     volume-over-signal trap; EXCLUDED. Only the curated domain dirs feed.
 *   - The tribal-embed-index (74K entries) stores only a 400-char flattened LEAD
 *     per doc -- a doc intro, not a reason-able pair -- so it is NOT used as the
 *     source; we read the FULL section bodies off disk instead.
 *
 * SOURCE SEPARATION + TRUST: writes its OWN dataset file
 *   (vault-wiki-knowledge-dataset.jsonl), advisory-tagged, NEVER merged with the
 *   hand-authored verified-feedback set. Mirrors vault-lessons-to-lora (a
 *   distilled-from-prose pair is a different trust tier than a hand-authored rule).
 *
 * R12 (quality over volume): one pair per LEAF wiki section (a `###` subsection,
 *   or a `##` section with its own prose and no `###` children). A section below
 *   MIN_SECTION_CHARS, or under a non-knowledge heading (Owner-gate / References /
 *   See also / Sources / Changelog), is dropped. Owner-gate is explicitly skipped
 *   -- those sections hold owner-gated numeric/safety values that must NOT train
 *   the model (the wedm galaxy's promotion boundary).
 *
 * USAGE:
 *   node scripts/vault-wiki-to-lora-dataset.mjs                 # dry-run: counts + sample
 *   node scripts/vault-wiki-to-lora-dataset.mjs --json          # machine-readable summary
 *   node scripts/vault-wiki-to-lora-dataset.mjs --out <path>    # write the JSONL dataset
 *   node scripts/vault-wiki-to-lora-dataset.mjs --limit N       # cap files scanned (debug)
 *
 * Pure-export contract (for tests): stripHeadingOrdinal, domainForDoc,
 *   parseWikiSections, sectionToAlpaca, buildExamplesFromWikiDoc, dedupPairs,
 *   examplesFromDocs, enumerateWikiDocs, collectWikiKnowledgeExamples,
 *   resolveOutPath.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { splitFrontmatter, frontmatterField } from "./vault-to-lora-dataset.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const WIKI_DIR = path.join(ROOT, "knowledge", "wiki");
export const DEFAULT_OUT = path.join(ROOT, "state", "shared", "lora", "vault-wiki-knowledge-dataset.jsonl");
// The hand-authored verified set this source must never overwrite.
const PROTECTED_BASENAMES = new Set(["vault-feedback-dataset.jsonl"]);

// Top-level wiki dirs EXCLUDED as machine-generated bulk / process-noise / owned-
// elsewhere. Everything else under knowledge/wiki/ is curated domain knowledge.
//  - architecture: ~36K auto per-action node stubs (not curated knowledge)
//  - code-tribal : failure->fix learnings owned by vault-lessons-to-lora
//  - os          : PRISM-OS per-action stubs
//  - consensus   : claude-flow vendor docs (not PRISM domain knowledge)
//  - lessons     : process/meta notes (commit lessons), low domain signal
//  - summaries/trajectories/patterns: generated rollups / empty
export const EXCLUDE_DIRS = new Set([
  "architecture", "code-tribal", "os", "consensus", "lessons",
  "summaries", "trajectories", "patterns",
]);

// Catalog files that are link indexes, not knowledge prose.
const SKIP_FILES = new Set(["index.md", "log.md"]);

// Section headings whose bodies are NOT promotable training knowledge: owner-
// gated numbers/safety, pure link directories, or process tails. Matched
// case-insensitively against the heading text (ordinal already stripped).
const SKIP_HEADING_RE =
  /^(owner[- ]?gate|references?|see also|sources?|source atlas|changelog|verification log|further reading|links?|index|table of contents|toc|cross[- ]?refs?|related|wiki \+ related|files changed|live verification|quick cli usage|bridge engines fed)\b/i;

// A section body shorter than this is a stub/pointer, not teachable knowledge.
export const MIN_SECTION_CHARS = 160;
// Cap a single output so one runaway section cannot dominate the adapter; domain
// sections run ~600-1200 chars, so this only trims pathological cases.
export const MAX_OUTPUT_CHARS = 2400;
// A section whose non-markup residue is below this is a links-only directory
// section, not knowledge prose.
const MIN_PROSE_RESIDUE_CHARS = 40;

/**
 * Strip a leading ordinal off a `### N. Topic` heading -> "Topic". A heading with
 * no ordinal is returned trimmed but otherwise untouched (a trailing subtitle
 * after a dash is meaningful topic context and is intentionally kept). Pure/ASCII.
 */
export function stripHeadingOrdinal(heading) {
  return String(heading || "").replace(/^\s*\d+[.)]\s*/, "").trim();
}

/**
 * Resolve a doc's domain (galaxy) tag: the frontmatter `galaxy:` field if
 * present (authoritative -- e.g. wedm-applied-practice.md declares `galaxy: wedm`),
 * else the top-level wiki dir the file lives in. "general" / "" -> null so the
 * pair carries no galaxy (lands in the splitter's shared track), mirroring the
 * verified-feedback set's cross-cutting convention.
 */
export function domainForDoc(frontmatter, dir) {
  const fm = frontmatterField(frontmatter, "galaxy");
  const d = (fm || dir || "").trim().toLowerCase();
  if (!d || d === "general") return null;
  return d;
}

/**
 * Parse a wiki body into LEAF sections: an array of { heading, level, body }.
 * A leaf is either a `###` (or deeper) subsection, OR a `##` section that has
 * its own prose and NO `###` child (so a `##` that only contains `###`s does not
 * double-emit -- only its children do). `####`+ fold into the current `###`.
 * Lines before the first `##` (the doc intro under `# Title`) are ignored.
 */
export function parseWikiSections(body) {
  const out = [];
  if (typeof body !== "string") return out;
  const lines = body.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  let h2 = null;          // { heading, bodyLines, sawChild }
  let h3 = null;          // { heading, bodyLines }
  const flushH3 = () => {
    if (h3) {
      out.push({ heading: h3.heading, level: 3, body: h3.bodyLines.join("\n").trim() });
      h3 = null;
    }
  };
  const flushH2 = () => {
    flushH3();
    if (h2 && !h2.sawChild) {
      const b = h2.bodyLines.join("\n").trim();
      if (b) out.push({ heading: h2.heading, level: 2, body: b });
    }
    h2 = null;
  };

  for (const raw of lines) {
    const line = raw;
    const m2 = line.match(/^##\s+(.+?)\s*$/);
    // exactly 3 hashes: a `####`+ heading is NOT a section boundary -- it folds
    // into the current `###` body (kept with its parent, no orphan micro-pairs).
    const m3 = line.match(/^###\s+(.+?)\s*$/);
    if (m2 && !line.startsWith("###")) {
      flushH2();
      h2 = { heading: m2[1].trim(), bodyLines: [], sawChild: false };
      continue;
    }
    if (m3) {
      flushH3();
      if (h2) h2.sawChild = true;
      h3 = { heading: m3[1].trim(), bodyLines: [] };
      continue;
    }
    // body line -> deepest open section
    if (h3) h3.bodyLines.push(line);
    else if (h2) h2.bodyLines.push(line);
  }
  flushH2();
  return out;
}

// Section-aware question framing keeps the instruction varied (so the adapter
// does not learn to ignore the instruction field; the topic differs per section).
function instructionFor(domain, topic, level) {
  const where = domain ? `PRISM's ${domain} domain` : "PRISM's knowledge base";
  if (topic) return `In ${where}, explain: ${topic}`;
  return level === 2
    ? `What does ${where} cover in this area?`
    : `Explain this point from ${where}.`;
}

/**
 * Map one parsed leaf section -> an Alpaca pair, or null if it fails the gate.
 * Skips non-knowledge headings (Owner-gate / References / ...), thin bodies, and
 * a body that is merely a markdown link line. Advisory provenance in `input`.
 */
export function sectionToAlpaca(section, domain, relpath = "") {
  if (!section || typeof section !== "object") return null;
  const topic = stripHeadingOrdinal(section.heading);
  if (SKIP_HEADING_RE.test(topic)) return null;
  let body = typeof section.body === "string" ? section.body.trim() : "";
  if (body.length < MIN_SECTION_CHARS) return null;
  // A section that is ONLY links / code-dumps / backlinks (a directory or process
  // tail) is not teachable knowledge. Strip ALL markup -- fenced code blocks (CLI /
  // test transcripts), wiki backlinks [[..]], inline md links/images, inline-code
  // paths, bare URLs -- BEFORE measuring prose, else a backlink wall or a ```bash
  // dump survives with a large residue and emits a junk pair (scrutiny arm-A P1).
  const stripped = body
    .replace(/```[\s\S]*?```/g, "")         // fenced code blocks
    .replace(/\[\[[^\]]*\]\]/g, "")         // wiki backlinks [[...]]
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, "")  // inline md links / images
    .replace(/`[^`]*`/g, "")                // inline-code paths
    .replace(/https?:\/\/\S+/g, "")         // bare URLs
    .replace(/[\s\-*>|#]/g, "");
  if (stripped.length < MIN_PROSE_RESIDUE_CHARS) return null;
  if (body.length > MAX_OUTPUT_CHARS) body = body.slice(0, MAX_OUTPUT_CHARS).trim();
  return {
    instruction: instructionFor(domain, topic, section.level),
    input: `PRISM ${domain || "cross-domain"} knowledge (curated wiki, advisory -- verify against source)`,
    output: body,
    _source: relpath ? `${relpath}#${topic.slice(0, 60)}` : "",
    _galaxy: domain || undefined,
    _advisory: true,
  };
}

/** Build all LoRA pairs from one wiki doc (frontmatter + body). [] if none pass. */
export function buildExamplesFromWikiDoc(md, dir = "", relpath = "") {
  if (typeof md !== "string" || !md) return [];
  const { frontmatter, body } = splitFrontmatter(md);
  const domain = domainForDoc(frontmatter, dir);
  const out = [];
  for (const section of parseWikiSections(body)) {
    const pair = sectionToAlpaca(section, domain, relpath);
    if (pair) out.push(pair);
  }
  return out;
}

/**
 * Dedup pairs by normalized output (lowercased, whitespace-collapsed). Sibling
 * domain docs can repeat a gotcha; collapsing keeps the adapter from
 * over-weighting one section.
 */
export function dedupPairs(pairs) {
  if (!Array.isArray(pairs)) return [];
  const seen = new Set();
  const out = [];
  for (const p of pairs) {
    if (!p || typeof p.output !== "string") continue;
    const key = p.output.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/**
 * PURE: build the full example set from an array of docs
 * ({ relpath, dir, md }). Separated from disk IO so the gate + dedup are
 * hermetically testable. Returns { examples, scanned, accepted, deduped, byDomain }.
 */
export function examplesFromDocs(docs) {
  const raw = [];
  let scanned = 0;
  for (const d of Array.isArray(docs) ? docs : []) {
    scanned++;
    raw.push(...buildExamplesFromWikiDoc(d.md, d.dir, d.relpath));
  }
  const examples = dedupPairs(raw);
  const byDomain = {};
  for (const e of examples) {
    const k = e._galaxy || "(cross-domain)";
    byDomain[k] = (byDomain[k] || 0) + 1;
  }
  return { examples, scanned, accepted: raw.length, deduped: raw.length - examples.length, byDomain };
}

/**
 * Enumerate curated domain wiki docs under rootDir as [{ relpath, dir, md }].
 * Skips EXCLUDE_DIRS (machine-gen bulk / owned-elsewhere) and SKIP_FILES
 * (catalogs). `dir` is the top-level wiki subdir (the dir-name domain fallback).
 * Recurses so nested curated dirs (e.g. reference/sub/) are included.
 */
export function enumerateWikiDocs(rootDir = WIKI_DIR, fsImpl = fs, opts = {}) {
  const limit = Number.isFinite(opts.limit) ? opts.limit : Infinity;
  const docs = [];
  let topDirs = [];
  try {
    topDirs = fsImpl.readdirSync(rootDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !EXCLUDE_DIRS.has(d.name) && !d.name.startsWith("."));
  } catch { return docs; }
  for (const top of topDirs) {
    const domainDir = top.name;
    const stack = [path.join(rootDir, domainDir)];
    while (stack.length) {
      if (docs.length >= limit) return docs;
      const cur = stack.pop();
      let entries = [];
      try { entries = fsImpl.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
      for (const e of entries) {
        if (docs.length >= limit) return docs;
        const full = path.join(cur, e.name);
        if (e.isDirectory()) { stack.push(full); continue; }
        if (!e.name.endsWith(".md") || SKIP_FILES.has(e.name)) continue;
        let md = "";
        try { md = fsImpl.readFileSync(full, "utf8"); } catch { continue; }
        docs.push({ relpath: path.relative(rootDir, full).replace(/\\/g, "/"), dir: domainDir, md });
      }
    }
  }
  return docs;
}

/** Full disk collect: enumerate + build + dedup. */
export function collectWikiKnowledgeExamples(rootDir = WIKI_DIR, fsImpl = fs, opts = {}) {
  const docs = enumerateWikiDocs(rootDir, fsImpl, opts);
  const res = examplesFromDocs(docs);
  return { ...res, files: docs.length, dirs: new Set(docs.map((d) => d.dir)).size };
}

/** Clobber-guard: never write over the hand-authored verified set. */
export function resolveOutPath(outPath) {
  if (!outPath) return DEFAULT_OUT;
  if (PROTECTED_BASENAMES.has(path.basename(outPath))) {
    throw new Error(`refusing to write the hand-authored verified set ${path.basename(outPath)} -- pick a different --out`);
  }
  return outPath;
}

function parseArgs(argv) {
  const out = { json: false, write: false, out: DEFAULT_OUT, limit: Infinity };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--out") { out.write = true; out.out = argv[++i] || DEFAULT_OUT; }
    else if (a === "--limit") out.limit = Number(argv[++i]) || Infinity;
    else if (a === "--help" || a === "-h") {
      console.error("usage: vault-wiki-to-lora-dataset [--json] [--out <path.jsonl>] [--limit N]");
      process.exit(0);
    }
  }
  return out;
}

export function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { examples, scanned, accepted, deduped, byDomain, files, dirs } =
    collectWikiKnowledgeExamples(WIKI_DIR, fs, { limit: opts.limit });

  if (opts.json) {
    console.log(JSON.stringify({
      source: "wiki-domain-knowledge", files, dirs, scanned, accepted,
      deduped, pairs: examples.length, byDomain, sample: examples.slice(0, 2),
    }, null, 2));
    return;
  }

  console.log(`vault-wiki-to-lora-dataset:`);
  console.log(`  scanned   : ${files} curated wiki docs across ${dirs} domains`);
  console.log(`  accepted  : ${accepted} section pairs (pre-dedup)`);
  console.log(`  deduped   : ${deduped} near-duplicate outputs collapsed`);
  console.log(`  FINAL     : ${examples.length} unique domain-knowledge Alpaca pairs`);
  console.log(`  by domain : ${JSON.stringify(byDomain)}`);
  if (examples[0]) {
    const s = examples[0];
    console.log(`  sample    : instruction="${s.instruction}"`);
    console.log(`              input="${s.input}"`);
    console.log(`              output="${s.output.slice(0, 100).replace(/\n/g, " ")}..."`);
  }

  if (!opts.write) {
    console.log(`  (dry-run -- pass --out to write ${path.relative(ROOT, opts.out)})`);
    return;
  }

  const outPath = resolveOutPath(opts.out);
  // examples-only JSONL (NO inline meta row -- the assembler / trainer would treat
  // it as a real pair; meta goes to a .meta.json sidecar, mirroring the sibling
  // feeders). `galaxy` carried as a structured field for per-domain adapter splits.
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const lines = examples
    .map((e) => JSON.stringify({ instruction: e.instruction, input: e.input, output: e.output, galaxy: e._galaxy }))
    .join("\n") + "\n";
  const tmp = `${outPath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, lines);
  fs.renameSync(tmp, outPath);
  const meta = {
    source: "knowledge/wiki (curated domain spine; architecture/code-tribal/os/consensus excluded)",
    generator: "vault-wiki-to-lora-dataset.mjs",
    generated_at: new Date().toISOString(),
    files, dirs, scanned, accepted, deduped, pairs: examples.length, byDomain,
    schema: "alpaca-instruction-input-output",
    trust_tier: "curated-wiki-domain-knowledge (advisory; NOT hand-authored doctrine; keep separate)",
  };
  fs.writeFileSync(outPath.replace(/\.jsonl$/i, "") + ".meta.json", JSON.stringify(meta, null, 2));
  console.log(`  WROTE ${examples.length} pairs -> ${path.relative(ROOT, outPath)} (+ .meta.json sidecar)`);
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();
