#!/usr/bin/env node
/**
 * vault-to-lora-dataset.mjs -- turn the Obsidian feedback vault into LoRA
 * instruction-tuning pairs (OBSIDIAN-AI-SYNERGY, slot:kilo 2026-06-09).
 *
 * THE GAP: the existing LoRA dataset builders (LatheLoRADatasetBuilderEngine et
 * al.) emit machining-PARAMETER pairs from raw NC programs / DB registries. They
 * do NOT touch the Obsidian vault. But the vault's feedback memories are a
 * ready-made instruction-tuning corpus of PRISM CONVENTIONS/DOCTRINE -- each
 * feedback_*.md is "a rule + **Why** + **How to apply**", which maps cleanly
 * onto the Alpaca {instruction, input, output} schema the builders already use
 * (LatheLoRADatasetBuilderEngine.ts:36 `interface LoRAExample`). This produces a
 * DISTINCT training signal (doctrine, not cutting parameters) from a source the
 * DB-driven builders never read.
 *
 * Emits the SAME schema as the existing builders so the pairs drop into the same
 * training pipeline:  { instruction: string, input: string, output: string }
 * plus a meta block with the Alpaca-standard counts.
 *
 * DISTINCT from mine-india-transcripts.mjs (india, in-flight): that miner reads
 * session TRANSCRIPTS -> vault. THIS reads vault FEEDBACK -> LoRA pairs. They
 * compose (the miner grows the feedback corpus; this trains on it).
 *
 * Source: knowledge/memories/feedback/*.md (feedback type = a durable PRISM
 * rule, the highest-signal doctrine notes). Each note yields ONE pair:
 *   instruction = a question synthesized from the rule's topic
 *   input       = the rule's one-line `description` frontmatter (the summary)
 *   output      = the rule body (Why + How to apply), stripped of frontmatter
 *
 * SECOND SOURCE -- galaxy synthesis brains (U-LORA-GALAXY-SYNTHESIS, slot:india
 * 2026-06-10): each galaxy keeps a compounded `knowledge/memories/patterns/
 * <galaxy>_synthesis.md` brain with three canonical sections (Recurring
 * patterns / Key decisions & rules / Open threads). Those bullets are a DISTINCT
 * per-galaxy training signal the feedback scan never reads -- one Alpaca pair per
 * bullet, galaxy-tagged. They are auto-distilled (advisoryOnly/mustHumanVerify),
 * so they go to a SEPARATE dataset file and carry their advisory provenance in
 * the `input` -- never merged with the hand-authored verified-feedback set.
 *
 * Usage:
 *   node scripts/vault-to-lora-dataset.mjs                       # feedback dry-run: counts + sample
 *   node scripts/vault-to-lora-dataset.mjs --json                # machine-readable summary
 *   node scripts/vault-to-lora-dataset.mjs --out <path>          # write feedback JSONL dataset
 *   node scripts/vault-to-lora-dataset.mjs --source galaxy       # galaxy-synthesis dry-run
 *   node scripts/vault-to-lora-dataset.mjs --source galaxy --out # write galaxy-synthesis JSONL
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FEEDBACK_DIR = path.join(ROOT, "knowledge", "memories", "feedback");
export const DEFAULT_OUT = path.join(ROOT, "state", "shared", "lora", "vault-feedback-dataset.jsonl");

// --- galaxy-synthesis source (U-LORA-GALAXY-SYNTHESIS) ---------------------
// The per-galaxy compounded brains. Each is auto-distilled (gpt-oss:120b) and
// tagged advisoryOnly/mustHumanVerify -- a DISTINCT, lower-trust signal from the
// hand-authored feedback rules, so it goes to its OWN dataset file and never
// merges with the verified-feedback set.
const PATTERNS_DIR = path.join(ROOT, "knowledge", "memories", "patterns");
export const DEFAULT_SYNTH_OUT = path.join(ROOT, "state", "shared", "lora", "vault-galaxy-synthesis-dataset.jsonl");
// The three canonical section headings every `<galaxy>_synthesis.md` carries
// (uniform across all 34 galaxy brains, verified 2026-06-10). Bullets under any
// other heading (the advisory blockquote, the title) are ignored.
const SYNTH_SECTIONS = ["Recurring patterns", "Key decisions & rules", "Open threads"];
// A bullet below this many chars is too thin to be a useful training pair.
const SYNTH_MIN_BULLET_CHARS = 40;

// A feedback note needs a meaningful body to be a useful training pair. Notes
// below this many body chars (after frontmatter strip) are skipped -- a 1-line
// stub teaches the model nothing and dilutes the set.
const MIN_BODY_CHARS = 120;

/**
 * Split a memory .md into { frontmatter (raw), body }. Returns body="" if no body.
 * Body is CRLF-normalized to LF: ~half the vault notes are CRLF-authored, and a
 * retained interior `\r` would (a) flow verbatim into the `output` training pair
 * as JSON-escaped `\r` noise the model learns as signal, and (b) inflate the
 * body char-count by ~30% so the MIN_BODY_CHARS gate measures line-count not
 * content. Normalizing here fixes both.
 */
export function splitFrontmatter(md) {
  if (typeof md !== "string") return { frontmatter: "", body: "" };
  const normalize = (s) => s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { frontmatter: "", body: normalize(md).trim() };
  return { frontmatter: m[1], body: normalize(m[2] || "").trim() };
}

/**
 * Pull a single frontmatter field value (description/name/type).
 *
 * Two frontmatter shapes coexist in the memory system:
 *   (A) flat  -- `type: feedback`            (synced/exported vault notes)
 *   (B) nested -- `metadata:\n  type: feedback` (the CLAUDE.md authoring format)
 * The `m` flag + optional-leading-whitespace match BOTH, so the type-gate in
 * buildExampleFromFeedback can't be silently bypassed by a nested-shape note.
 */
export function frontmatterField(frontmatter, key) {
  if (typeof frontmatter !== "string") return "";
  // value may be quoted ("...") or bare, single line. The whitespace classes are
  // [ \t] (NOT \s) so they do NOT eat the trailing newline -- a \s* here would
  // (a) let the multiline match jump past the value into the next line, and
  // (b) capture an empty value's following line. The leading [ \t]* still allows
  // the nested `metadata:` indentation (shape B). Bare branch is non-greedy so
  // the trailing [ \t]* trims rather than being swallowed.
  const re = new RegExp(`^[ \\t]*${key}:[ \\t]*(?:"([^"]*)"|'([^']*)'|(.*?))[ \\t]*$`, "m");
  const m = frontmatter.match(re);
  if (!m) return "";
  return (m[1] ?? m[2] ?? m[3] ?? "").trim();
}

/**
 * Synthesize a natural instruction from a feedback note's name/description.
 * The name is a slug like "feedback_check_units_first" -> "check units first".
 */
export function instructionFromName(name, description) {
  // Strip a trailing `.md` FIRST so the function is correct regardless of caller
  // -- when `name` falls back to a raw filename (note has no `name:` field) the
  // extension would otherwise leak into the question ("...units first.md...").
  const topic = String(name || "")
    .replace(/\.md$/i, "")
    .replace(/^feedback_/, "")
    .replace(/_/g, " ")
    .trim();
  if (topic) return `What is PRISM's rule about ${topic}, and how should I apply it?`;
  // No usable slug: fall back to a generic prompt. (description is unused here on
  // purpose -- it still becomes the `input` field of the pair, so the model sees
  // it; we just don't try to phrase a topic-specific question from it.)
  return "Explain this PRISM convention and how to apply it.";
}

/** Build one LoRA example from a feedback note's text, or null if too thin. */
export function buildExampleFromFeedback(md, fileName = "") {
  const { frontmatter, body } = splitFrontmatter(md);
  if (body.length < MIN_BODY_CHARS) return null;
  const description = frontmatterField(frontmatter, "description");
  const name = frontmatterField(frontmatter, "name") || fileName.replace(/\.md$/, "");
  const type = frontmatterField(frontmatter, "type");
  // Only `feedback`-type notes are doctrine rules; skip anything mistyped.
  if (type && type !== "feedback") return null;
  return {
    instruction: instructionFromName(name, description),
    input: description || "",
    output: body,
    // provenance (ignored by the trainer; useful for audit / dedup)
    _source: fileName,
  };
}

/** Scan the feedback dir and return { examples, scanned, skipped }. */
export function collectFeedbackExamples(dir = FEEDBACK_DIR) {
  let files = [];
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith(".md")); }
  catch { return { examples: [], scanned: 0, skipped: 0 }; }
  const examples = [];
  let skipped = 0;
  for (const f of files) {
    let md = "";
    try { md = fs.readFileSync(path.join(dir, f), "utf8"); }
    catch { skipped++; continue; }
    const ex = buildExampleFromFeedback(md, f);
    if (ex) examples.push(ex); else skipped++;
  }
  return { examples, scanned: files.length, skipped };
}

/** Alpaca-standard summary counts (mirrors LatheLoRADatasetBuilderEngine meta). */
export function summarize(examples) {
  const n = examples.length;
  if (n === 0) return { count: 0, avg_instruction_length: 0, avg_output_length: 0 };
  const ai = examples.reduce((s, e) => s + e.instruction.length, 0) / n;
  const ao = examples.reduce((s, e) => s + e.output.length, 0) / n;
  return { count: n, avg_instruction_length: Math.round(ai), avg_output_length: Math.round(ao) };
}

// ---------------------------------------------------------------------------
// Galaxy-synthesis source (U-LORA-GALAXY-SYNTHESIS, slot:india 2026-06-10)
// Turns each galaxy's compounded `<galaxy>_synthesis.md` brain into galaxy-tagged
// Alpaca pairs -- a DISTINCT per-galaxy training signal. Reuses splitFrontmatter.
// ---------------------------------------------------------------------------

/**
 * Parse a synthesis body into { <section>: [bullet, ...] } for the three
 * canonical sections only. A bullet starts at a line matching /^[-*] /;
 * continuation lines (non-blank, non-heading, non-bullet) are appended so a
 * wrapped rule stays whole. Lines outside the canonical sections are ignored.
 */
export function parseSynthesisSections(body) {
  const out = {};
  for (const s of SYNTH_SECTIONS) out[s] = [];
  if (typeof body !== "string") return out;
  let current = null;
  let buf = null;
  const flush = () => {
    if (current && buf != null) {
      const t = buf.trim();
      if (t) out[current].push(t);
    }
    buf = null;
  };
  for (const raw of body.split("\n")) {
    const line = raw.replace(/\r$/, "");
    const heading = line.match(/^##\s+(.*?)\s*$/);
    if (heading) {
      flush();
      const name = heading[1].trim();
      current = SYNTH_SECTIONS.includes(name) ? name : null;
      continue;
    }
    if (!current) continue;
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      flush();
      buf = bullet[1];
    } else if (buf != null && line.trim() && !line.startsWith("#")) {
      buf += " " + line.trim();
    } else if (!line.trim()) {
      flush();
    }
  }
  flush();
  return out;
}

/**
 * Extract the bold lead term (topic) from a synthesis bullet, plus the remainder.
 * Bullets are shaped `**Topic** <sep> explanation [cite]` where <sep> is a dash
 * or colon; only the bold span is needed for the question, so the regex stays
 * pure-ASCII and the separator is left in `rest` (unused downstream). Returns
 * { topic, rest }; with no bold lead, topic="" and rest=the whole bullet.
 */
export function bulletTopicAndRest(bullet) {
  const s = String(bullet || "");
  const m = s.match(/^\*\*(.+?)\*\*/);
  if (m) return { topic: m[1].trim(), rest: s.slice(m[0].length).trim() };
  return { topic: "", rest: s.trim() };
}

// Section-aware question framing. The galaxy slug reads naturally in-sentence
// ("the ai-training domain", "the speed-feed domain").
const SYNTH_QUESTION = {
  "Recurring patterns": (g, topic) =>
    topic ? `What recurring pattern does the ${g} domain follow regarding ${topic}?`
          : `What is a recurring pattern in the ${g} domain?`,
  "Key decisions & rules": (g, topic) =>
    topic ? `What is the ${g} domain's rule or decision about ${topic}?`
          : `What is a key rule or decision in the ${g} domain?`,
  "Open threads": (g, topic) =>
    topic ? `What open thread or unresolved work remains in the ${g} domain regarding ${topic}?`
          : `What open thread remains in the ${g} domain?`,
};

/**
 * Build LoRA examples from one galaxy synthesis note: one pair per bullet across
 * the three canonical sections. `output` is the FULL bullet (topic + explanation
 * + citation) so the answer is complete; bullets below SYNTH_MIN_BULLET_CHARS are
 * skipped. Advisory provenance is encoded into `input` so a model learns these as
 * advisory domain syntheses, never as verified doctrine.
 */
export function buildExamplesFromSynthesis(md, galaxy) {
  const out = [];
  const { body } = splitFrontmatter(md);
  if (!body || !galaxy) return out;
  const sections = parseSynthesisSections(body);
  for (const section of SYNTH_SECTIONS) {
    for (const bullet of sections[section]) {
      if (bullet.length < SYNTH_MIN_BULLET_CHARS) continue;
      const { topic } = bulletTopicAndRest(bullet);
      out.push({
        instruction: SYNTH_QUESTION[section](galaxy, topic),
        input: `PRISM ${galaxy} domain synthesis (advisory, verify against source) -- ${section}`,
        output: bullet,
        // provenance (ignored by the trainer; useful for audit / weighting)
        _source: `${galaxy}_synthesis.md`,
        _galaxy: galaxy,
        _section: section,
        _advisory: true,
      });
    }
  }
  return out;
}

/** Map a synthesis filename to its galaxy slug, or null if not a galaxy brain. */
export function galaxyFromSynthesisFile(fileName) {
  const f = String(fileName || "");
  if (!f.endsWith("_synthesis.md")) return null;
  if (f === "_meta_synthesis.md") return null; // fleet-meta synthesis, not a galaxy
  const g = f.replace(/_synthesis\.md$/, "");
  return g || null;
}

/** Scan the patterns dir and return { examples, galaxies, scanned, skipped }. */
export function collectGalaxySynthesisExamples(dir = PATTERNS_DIR) {
  let files = [];
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith("_synthesis.md")); }
  catch { return { examples: [], galaxies: 0, scanned: 0, skipped: 0 }; }
  const examples = [];
  let galaxies = 0;
  let skipped = 0;
  for (const f of files) {
    const galaxy = galaxyFromSynthesisFile(f);
    if (!galaxy) { skipped++; continue; }
    let md = "";
    try { md = fs.readFileSync(path.join(dir, f), "utf8"); }
    catch { skipped++; continue; }
    const ex = buildExamplesFromSynthesis(md, galaxy);
    if (ex.length) { examples.push(...ex); galaxies++; } else { skipped++; }
  }
  return { examples, galaxies, scanned: files.length, skipped };
}

/**
 * Resolve the galaxy-source output path with a clobber-guard: galaxy (advisory)
 * pairs must NEVER overwrite the verified-feedback dataset. A bare `--out`
 * resolves to DEFAULT_OUT (the feedback file); redirect that to DEFAULT_SYNTH_OUT.
 * Compared by `path.resolve` (canonical) so an alias of the feedback file (a
 * relative path, a `..`-traversal, or a different-but-equivalent absolute) is
 * caught too, not just the exact DEFAULT_OUT string. Returns the safe path.
 */
export function resolveGalaxyOutPath(outPath) {
  if (!outPath) return outPath;
  if (path.resolve(outPath) === path.resolve(DEFAULT_OUT)) return DEFAULT_SYNTH_OUT;
  return outPath;
}

// ---------------------------------------------------------------------------
// Galaxy AI-Synergy source (U-LORA-GALAXY-AISYN + U-LORA-OWNER-COVERAGE, slot:bravo 2026-06-14)
// Turns each AI-OWNER galaxy's CLAUDE.md "## AI Synergy (PSN leg #10)" section -- the
// verified-true per-galaxy AI-substrate participation documented by
// document-galaxy-ai-synergy.mjs -- into a galaxy-tagged Alpaca pair. OWNER-ONLY:
// consumer-boilerplate sections (no dedicated AI engines) are skipped as low-signal
// near-duplicates (see isOwnerAiSynergySection). FULLY DETERMINISTIC (file read +
// section slice): NO Ollama, so it enriches the LoRA corpus even while the GPU is
// saturated and the synthesis-regen lane is blocked. Each pair teaches the per-galaxy
// AI->substrate mapping (reasoning bridge / LoRA / GNN / CAG-RAG), tagged for adapter splits.
// ---------------------------------------------------------------------------
const ENGINES_DIR = path.join(ROOT, "mcp-server", "src", "engines");
const AI_SYNERGY_MARKER = "## AI Synergy (PSN leg #10)";
export const DEFAULT_AISYN_OUT = path.join(ROOT, "state", "shared", "lora", "vault-galaxy-aisynergy-dataset.jsonl");
const AISYN_MIN_CHARS = 80; // never emit a degenerate pair from a too-thin section

/** PURE: extract the "## AI Synergy (PSN leg #10)" section body from a CLAUDE.md ("" if absent). */
export function extractAiSynergySection(claudeMd) {
  if (typeof claudeMd !== "string") return "";
  const idx = claudeMd.indexOf(AI_SYNERGY_MARKER);
  if (idx === -1) return "";
  const after = claudeMd.slice(idx + AI_SYNERGY_MARKER.length);
  const next = after.search(/\n##\s/); // section ends at the next "## " heading (or EOF)
  return (next === -1 ? after : after.slice(0, next)).trim();
}

// OWNER-ONLY gate (U-LORA-OWNER-COVERAGE, slot:bravo 2026-06-14): a CONSUMER section (galaxy with no
// dedicated AI engines) is near-identical boilerplate across galaxies -- low LoRA signal that does NOT
// dedupe (the galaxy name differs in instruction+output, so assemble-fleet-lora-corpus keeps every copy).
// Emitting owner-only keeps this source high-signal and makes the document-galaxy-ai-synergy.mjs
// `--lora-owner-coverage` contract true end-to-end. Coupled to that script's consumer head wording.
const AISYN_CONSUMER_MARK = "AI-substrate **consumer**";
/** PURE: true iff the section documents a genuine AI OWNER (not the consumer-boilerplate variant). */
export function isOwnerAiSynergySection(section) {
  return typeof section === "string" && section.length > 0 && !section.includes(AISYN_CONSUMER_MARK);
}

/** Build a galaxy-tagged Alpaca pair from a galaxy CLAUDE.md AI-Synergy section. [] if none/thin/consumer. */
export function buildExamplesFromAiSynergy(claudeMd, galaxy) {
  if (!galaxy) return [];
  const section = extractAiSynergySection(claudeMd);
  if (!section || section.length < AISYN_MIN_CHARS) return [];
  if (!isOwnerAiSynergySection(section)) return []; // owner-only: skip consumer boilerplate (R12)
  return [{
    instruction: `What AI / deep-learning / reasoning systems does the ${galaxy} domain use, and how is it synergized with PRISM's AI substrate (reasoning bridge, LoRA, GNN, CAG/RAG)?`,
    input: `PRISM ${galaxy} domain AI-synergy doctrine (CLAUDE.md, verified-true substrate participation)`,
    output: section,
    _source: `${galaxy}/CLAUDE.md#ai-synergy`,
    _galaxy: galaxy,
  }];
}

/** Scan every galaxy CLAUDE.md, collect AI-synergy pairs. { examples, galaxies, scanned, skipped }. */
export function collectGalaxyAiSynergyExamples(dir = ENGINES_DIR) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()); }
  catch { return { examples: [], galaxies: 0, scanned: 0, skipped: 0 }; }
  const examples = [];
  let galaxies = 0, scanned = 0, skipped = 0;
  for (const d of entries) {
    const g = d.name;
    if (g.startsWith(".")) continue;
    let md;
    try { md = fs.readFileSync(path.join(dir, g, "CLAUDE.md"), "utf8"); } catch { continue; }
    scanned++;
    const ex = buildExamplesFromAiSynergy(md, g);
    if (ex.length) { examples.push(...ex); galaxies++; } else { skipped++; }
  }
  return { examples, galaxies, scanned, skipped };
}

/** Resolve the AI-synergy output path with the same clobber-guard (never overwrite the feedback file). */
export function resolveAiSynOutPath(outPath) {
  if (!outPath) return outPath;
  if (path.resolve(outPath) === path.resolve(DEFAULT_OUT)) return DEFAULT_AISYN_OUT;
  return outPath;
}

/** Galaxy-AI-synergy CLI path -- writes to its OWN dataset file (clobber-guarded). */
export function mainAiSynergy(opts) {
  const { examples, galaxies, scanned, skipped } = collectGalaxyAiSynergyExamples();
  const meta = summarize(examples);
  if (opts.json) {
    console.log(JSON.stringify({ source: "galaxy-ai-synergy", ...meta, galaxies, scanned, skipped, sample: examples.slice(0, 2) }, null, 2));
    return;
  }
  console.log(`Galaxy CLAUDE.md scanned: ${scanned} | galaxies with AI-synergy section: ${galaxies} | LoRA pairs built: ${meta.count} | skipped (no section): ${skipped}`);
  console.log(`avg instruction len: ${meta.avg_instruction_length} | avg output len: ${meta.avg_output_length}`);
  if (!opts.outPath) {
    console.log("DRY-RUN (no --out). Sample pair:");
    if (examples[0]) {
      console.log(`  instruction: ${examples[0].instruction}`);
      console.log(`  output:      ${examples[0].output.slice(0, 110).replace(/\n/g, " ")}...`);
    }
    return;
  }
  const outPath = resolveAiSynOutPath(opts.outPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const lines = examples.map((e) => JSON.stringify({ instruction: e.instruction, input: e.input, output: e.output, galaxy: e._galaxy }));
  const tmp = `${outPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, lines.join("\n") + "\n", "utf8");
  fs.renameSync(tmp, outPath);
  console.log(`Wrote ${examples.length} galaxy-ai-synergy LoRA pairs -> ${outPath}`);
}

function parseArgs(argv) {
  const out = { json: false, outPath: null, source: "feedback" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--out") out.outPath = argv[++i] || DEFAULT_OUT;
    else if (a === "--source") out.source = String(argv[++i] || "feedback").toLowerCase();
    else if (a === "--help" || a === "-h") {
      console.error("usage: vault-to-lora-dataset [--source feedback|galaxy|galaxy-ai-synergy] [--json] [--out <path.jsonl>]");
      process.exit(0);
    }
  }
  return out;
}

/** Feedback-source CLI path (the original behavior; unchanged). */
export function mainFeedback(opts) {
  const { examples, scanned, skipped } = collectFeedbackExamples();
  const meta = summarize(examples);

  if (opts.json) {
    console.log(JSON.stringify({ ...meta, scanned, skipped, sample: examples.slice(0, 2) }, null, 2));
    return;
  }

  console.log(`Feedback notes scanned: ${scanned} | LoRA pairs built: ${meta.count} | skipped (thin/non-feedback): ${skipped}`);
  console.log(`avg instruction len: ${meta.avg_instruction_length} | avg output len: ${meta.avg_output_length}`);

  if (!opts.outPath) {
    console.log("DRY-RUN (no --out). Sample pair:");
    if (examples[0]) {
      console.log(`  instruction: ${examples[0].instruction}`);
      console.log(`  input:       ${examples[0].input.slice(0, 90)}...`);
      console.log(`  output:      ${examples[0].output.slice(0, 90).replace(/\n/g, " ")}...`);
    }
    return;
  }

  // Write JSONL (one Alpaca example per line) -- the format the trainers ingest.
  fs.mkdirSync(path.dirname(opts.outPath), { recursive: true });
  const lines = examples.map((e) => JSON.stringify({ instruction: e.instruction, input: e.input, output: e.output }));
  const tmp = `${opts.outPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, lines.join("\n") + "\n", "utf8");
  fs.renameSync(tmp, opts.outPath);
  console.log(`Wrote ${examples.length} LoRA pairs -> ${opts.outPath}`);
}

/**
 * Galaxy-synthesis CLI path -- writes to its OWN dataset file. A bare --out
 * resolves to the feedback DEFAULT_OUT; here it is redirected to DEFAULT_SYNTH_OUT
 * so galaxy (advisory) pairs can NEVER clobber the verified-feedback dataset.
 */
export function mainGalaxy(opts) {
  const { examples, galaxies, scanned, skipped } = collectGalaxySynthesisExamples();
  const meta = summarize(examples);
  const bySection = {};
  for (const e of examples) bySection[e._section] = (bySection[e._section] || 0) + 1;

  if (opts.json) {
    console.log(JSON.stringify({ source: "galaxy", ...meta, galaxies, scanned, skipped, bySection, sample: examples.slice(0, 2) }, null, 2));
    return;
  }

  console.log(`Galaxy synthesis files scanned: ${scanned} | galaxies with pairs: ${galaxies} | LoRA pairs built: ${meta.count} | skipped: ${skipped}`);
  console.log(`avg instruction len: ${meta.avg_instruction_length} | avg output len: ${meta.avg_output_length}`);
  console.log(`by section: ${JSON.stringify(bySection)}`);

  if (!opts.outPath) {
    console.log("DRY-RUN (no --out). Sample pair:");
    if (examples[0]) {
      console.log(`  instruction: ${examples[0].instruction}`);
      console.log(`  input:       ${examples[0].input}`);
      console.log(`  output:      ${examples[0].output.slice(0, 110).replace(/\n/g, " ")}...`);
    }
    return;
  }

  const outPath = resolveGalaxyOutPath(opts.outPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  // Carry `galaxy` as a structured field so a downstream splitter
  // (lora-dataset-builder.mjs --track-field galaxy) can produce per-galaxy
  // train/val splits -> per-galaxy LoRA adapters (the self-owned per-domain AI
  // stack doctrine). The verified-feedback dataset is cross-cutting doctrine and
  // intentionally carries NO galaxy (it lands in the splitter's _unclassified
  // shared track).
  const lines = examples.map((e) => JSON.stringify({ instruction: e.instruction, input: e.input, output: e.output, galaxy: e._galaxy }));
  const tmp = `${outPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, lines.join("\n") + "\n", "utf8");
  fs.renameSync(tmp, outPath);
  console.log(`Wrote ${examples.length} galaxy-synthesis LoRA pairs -> ${outPath}`);
}

export function main() {
  const opts = parseArgs(process.argv.slice(2));
  const VALID = new Set(["feedback", "galaxy", "galaxy-ai-synergy"]);
  if (!VALID.has(opts.source)) {
    console.error(`unknown --source '${opts.source}' (expected: feedback | galaxy | galaxy-ai-synergy)`);
    process.exit(2);
  }
  if (opts.source === "galaxy") return mainGalaxy(opts);
  if (opts.source === "galaxy-ai-synergy") return mainAiSynergy(opts);
  return mainFeedback(opts);
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();
