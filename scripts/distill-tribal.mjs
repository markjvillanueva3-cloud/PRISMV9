#!/usr/bin/env node
/**
 * distill-tribal.mjs -- IdeaBlock canonicalization for tribal-tip corpus
 * ========================================================================
 *
 * Implements the Akshay Pachaar / Iternal "IdeaBlock" pattern for PRISM's
 * tribal-tip corpus. Reads `mcp-server/data/state/TRIBAL_TIP_INDEX.json`,
 * clusters near-duplicate tips by TF-IDF cosine similarity at a configurable
 * threshold (default 0.80), picks the longest tip per cluster as canonical,
 * and emits one markdown IdeaBlock per canonical entry to
 * `knowledge/wiki/code-tribal/canonical/`.
 *
 * Two axes, two methods (kept deliberately separate):
 *   - CLUSTERING is TF-IDF cosine -- deterministic, no LLM, <1s on the corpus,
 *     and it catches the dominant "trailing-words-dropped" near-dupes. This is
 *     correct as pure code (R5: a deterministic transform answers the question)
 *     and stays procedural regardless of Ollama state.
 *   - Q-A SYNTHESIS (the retrieval question per canonical block) is the part
 *     that benefits from a model. When the local Ollama daemon is up, each
 *     canonical block's question is synthesized by a host-aware model
 *     (resolveSynthesisModel -> qwen2.5-coder:32b on the Blackwell, the
 *     "best" search_synthesis tier; --model / PRISM_DISTILL_TRIBAL_MODEL
 *     override). When Ollama is down (or --no-llm), it falls back per-cluster
 *     to the heuristic "How do I {topic}?" derivation -- so output never
 *     regresses, it only improves when the model is available.
 *
 * (Prior versions hard-stubbed Q-A on a "Ollama models not loaded as of
 * 2026-05-08" premise. That premise is dead -- the daemon now serves a model
 * roster on this host -- so the LLM Q-A path is wired and the heuristic is the
 * fallback, not the ceiling.)
 *
 * IdeaBlock frontmatter (per Iternal's Blockify schema, adapted to PRISM):
 *   title          -- derived from domain + first content phrase
 *   question       -- LLM-synthesized when Ollama is up, else heuristic
 *   domain         -- tribal-tip domain field
 *   confidence     -- max confidence across cluster members
 *   version_state  -- "Draft" until SME validates
 *   sources        -- array of original tip ids/sha256s in the cluster
 *   cluster_size   -- count of merged tips
 *   schema         -- "ideablock-v1"
 *   qa_via         -- how the question was derived (llm:<model> | heuristic-*)
 *
 * Idempotent: each run wipes and regenerates `canonical/`. Safe to re-run.
 *
 * Failure modes covered:
 *   1. Index file missing or malformed JSON -> exit 1 with clear error
 *   2. Empty content fields -> skipped, logged in audit
 *   3. Content with only stopwords/punctuation -> treated as singleton
 *   4. Cluster of size 1 -> emitted as-is, no merge log entry
 *   5. Filename collision after slugify -> suffixed with sha8 prefix
 *   6. Atomic-write failure -> reports per-file, continues on rest
 *   7. Ollama down / per-cluster model failure -> heuristic Q-A fallback (no abort)
 *
 * Usage:
 *   node scripts/distill-tribal.mjs                     # run with defaults (LLM Q-A if Ollama up)
 *   node scripts/distill-tribal.mjs --threshold=0.85    # tighter merge
 *   node scripts/distill-tribal.mjs --sample=50         # first 50 only
 *   node scripts/distill-tribal.mjs --no-llm            # force heuristic Q-A
 *   node scripts/distill-tribal.mjs --model=gpt-oss:120b  # override Q-A model
 *   node scripts/distill-tribal.mjs --dry-run           # report, no writes, no Ollama
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { callOllama } from "./ask-ollama.mjs";
import {
  resolveSynthesisModel,
  fetchInstalledModels,
} from "./lib/host-aware-synthesis-model.mjs";

// --- Paths --------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const INDEX_PATH = path.join(ROOT, "mcp-server/data/state/TRIBAL_TIP_INDEX.json");
const OUTPUT_DIR = path.join(ROOT, "knowledge/wiki/code-tribal/canonical");
const AUDIT_PATH = path.join(OUTPUT_DIR, "_DISTILL_LOG.json");

// --- Q-A model config ---------------------------------------------------
/** Conservative floor when the host-aware resolver yields nothing (must be a
 *  HELD model -- the 3b/7b coders were retired by BLACKWELL-MODEL-UPGRADE). */
const DEFAULT_QA_MODEL = "qwen2.5-coder:32b";
/** Per-cluster Q-A generate timeout. Covers a cold load on a busy host;
 *  callOllama aborts past this and the cluster falls back to heuristic. */
const QA_TIMEOUT_MS = parseInt(process.env.PRISM_DISTILL_TRIBAL_TIMEOUT_MS ?? "60000", 10);
/** num_predict cap for a single Q-A generation. This is a CAP, not a target --
 *  a short answer still stops naturally at done_reason:"stop". 1024 matches
 *  callOllama's verified-safe default: on this Blackwell host resolveSynthesisModel
 *  returns the reasoning model gpt-oss:120b (the "best" search_synthesis tier),
 *  which emits a `thinking` channel BEFORE `response` -- too low a cap starves
 *  `response` to empty (done_reason:"length"). Live-verified 2026-06-09: gpt-oss:120b
 *  produced clean questions through this path. Lower it only for a non-reasoning model. */
const QA_NUM_PREDICT = parseInt(process.env.PRISM_DISTILL_TRIBAL_NUM_PREDICT ?? "1024", 10);

// --- Stopwords (English shop-floor noise) ------------------------------
const STOPWORDS = new Set([
  "the","a","an","and","or","of","to","in","on","at","for","with","by","is","are","be","been","being",
  "this","that","these","those","it","its","from","as","but","not","no","nor","so","if","then","than",
  "will","would","can","could","should","may","might","must","shall","do","does","did","done","doing",
  "have","has","had","having","when","where","what","which","who","whom","whose","why","how","all",
  "any","both","each","few","more","most","other","some","such","only","own","same","too","very",
  "use","used","using","via","per","into","onto","out","up","down","over","under","again","further",
  "you","your","we","our","they","their","i","me","my","mine"
]);

// --- TF-IDF cosine ------------------------------------------------------
export function tokenize(s) {
  return s.toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter(t => t.length >= 3 && !STOPWORDS.has(t));
}

export function buildTfIdf(docs) {
  // df[term] = number of docs containing term
  const df = new Map();
  const tfList = [];
  for (const tokens of docs) {
    const tf = new Map();
    for (const tok of tokens) tf.set(tok, (tf.get(tok) ?? 0) + 1);
    for (const tok of tf.keys()) df.set(tok, (df.get(tok) ?? 0) + 1);
    tfList.push(tf);
  }
  const N = docs.length;
  const idf = new Map();
  for (const [term, count] of df) idf.set(term, Math.log((N + 1) / (count + 1)) + 1);

  // Sparse TF-IDF vectors keyed by term, plus precomputed L2 norm.
  const vectors = tfList.map(tf => {
    const v = new Map();
    let norm2 = 0;
    for (const [term, count] of tf) {
      const w = (1 + Math.log(count)) * (idf.get(term) ?? 0);
      v.set(term, w);
      norm2 += w * w;
    }
    return { v, norm: Math.sqrt(norm2) || 1 };
  });
  return vectors;
}

export function cosine(a, b) {
  // Iterate the smaller vector for speed.
  const [small, large] = a.v.size <= b.v.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [term, w] of small.v) {
    const w2 = large.v.get(term);
    if (w2 !== undefined) dot += w * w2;
  }
  return dot / (a.norm * b.norm);
}

// --- Union-Find clustering ---------------------------------------------
export function clusterByThreshold(vectors, threshold) {
  const N = vectors.length;
  const parent = Array.from({ length: N }, (_, i) => i);
  const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const union = (i, j) => { const ri = find(i), rj = find(j); if (ri !== rj) parent[ri] = rj; };
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      if (cosine(vectors[i], vectors[j]) >= threshold) union(i, j);
    }
  }
  const groups = new Map();
  for (let i = 0; i < N; i++) {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(i);
  }
  return [...groups.values()];
}

// --- Slug + Q-A heuristics ---------------------------------------------
export function slugify(s, maxLen = 60) {
  return s.toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen) || "untitled";
}

/**
 * Heuristic question derivation from tip content. Used as the per-cluster
 * fallback when Ollama is down or a model call fails. Extracts the first
 * concept phrase and wraps it as "How do I {topic}?" or falls back to the
 * domain.
 *
 * The 'How do I' phrasing matches the way RAG queries actually arrive at
 * the tribal-tip retriever ("how do I rough Inconel?", "how do I set up
 * thread milling on the Okuma?"), so structurally-explicit Q-A matching
 * still pays even with a heuristic question.
 */
export function deriveQuestion(content, domain) {
  const firstSentence = content.split(/[.|]/)[0].trim();
  // Pull the first 8 words after stripping leading domain-name prefix
  const stripped = firstSentence.replace(/^[A-Za-z\s]+:\s*/, "").trim();
  const words = stripped.split(/\s+/).slice(0, 10).join(" ");
  if (words.length < 8) return `How do I ${domain.toLowerCase()}?`;
  return `How do I ${words.toLowerCase()}?`;
}

export function deriveTitle(content, domain) {
  const firstSentence = content.split(/[.|]/)[0].trim().slice(0, 80);
  return firstSentence || domain;
}

// --- LLM Q-A synthesis (Ollama-gated, fail-soft to heuristic) ----------
/**
 * Build the retrieval-question prompt for one canonical tip. Bounds the tip
 * to ~1200 chars so a single short generation stays fast and never blows the
 * context of a small/medium model.
 */
export function buildQaPrompt(content, domain) {
  const tip = String(content || "").trim().replace(/\s+/g, " ").slice(0, 1200);
  return [
    "You distill a manufacturing shop-floor knowledge tip into ONE retrieval question.",
    `Domain: ${domain || "General"}`,
    `Tip: ${tip}`,
    "",
    "Write ONE concise question (max 18 words) that a machinist would type to find this tip.",
    "Begin with How, What, When, Why, or Which. Output ONLY the question -- no preamble, no quotes, no explanation.",
  ].join("\n");
}

/**
 * Parse a model response into a clean single-line question, or null if the
 * output is unusable (so the caller falls back to the heuristic). Strips code
 * fences / surrounding quotes, takes the first question-bearing line, caps
 * length, ensures a trailing '?', and rejects echoed-instruction garbage.
 */
export function sanitizeQuestion(text) {
  if (typeof text !== "string") return null;
  let t = text.trim();
  if (!t) return null;
  // Drop a leading ```fence ... and surrounding code fences.
  t = t.replace(/^```[a-zA-Z]*\s*/m, "").replace(/```$/m, "").trim();
  // Prefer the first line that contains a '?', else the first non-empty line.
  const lines = t.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  let line = lines.find(l => l.includes("?")) ?? lines[0];
  // Strip surrounding quotes/backticks and a leading list marker.
  line = line.replace(/^[-*\d.)\s]+/, "").replace(/^["'`]+|["'`]+$/g, "").trim();
  // If a '?' is present, keep through the first one (drop trailing chatter).
  const q = line.indexOf("?");
  if (q !== -1) line = line.slice(0, q + 1).trim();
  if (line.length < 8) return null;
  if (!/[A-Za-z]/.test(line)) return null;
  // Reject the model echoing the instruction back.
  if (/output only|the question|max 18 words|begin with how/i.test(line)) return null;
  if (line.length > 200) line = line.slice(0, 200).trim();
  if (!line.endsWith("?")) line += "?";
  return line;
}

/**
 * Synthesize the retrieval question for one canonical tip via the local model,
 * fail-soft to the heuristic. Never throws (callOllama is fail-soft and the
 * heuristic is pure). Returns { question, method } where method is
 * `llm:<model>` on success or `heuristic-fallback` when the call fails / the
 * response is unusable.
 */
export async function deriveQuestionLLM(content, domain, {
  model,
  callImpl = callOllama,
  timeoutMs = QA_TIMEOUT_MS,
  numPredict = QA_NUM_PREDICT,
} = {}) {
  if (!model) {
    return { question: deriveQuestion(content, domain), method: "heuristic-fallback" };
  }
  const prompt = buildQaPrompt(content, domain);
  const r = await callImpl(model, prompt, { timeoutMs, numPredict });
  if (r && r.ok) {
    const q = sanitizeQuestion(r.text);
    if (q) return { question: q, method: `llm:${model}` };
  }
  return { question: deriveQuestion(content, domain), method: "heuristic-fallback" };
}

// --- Markdown emit ------------------------------------------------------
export function renderIdeaBlock(record, threshold) {
  const { canonical, members, domain, sources, confidence, question, qaMethod } = record;
  const q = question ?? deriveQuestion(canonical.content, domain);
  const method = qaMethod ?? "heuristic-no-llm";
  const fm = [
    "---",
    `schema: ideablock-v1`,
    `title: ${JSON.stringify(deriveTitle(canonical.content, domain))}`,
    `domain: ${JSON.stringify(domain)}`,
    `version_state: Draft`,
    `confidence: ${confidence}`,
    `cluster_size: ${members.length}`,
    `canonical_sha256: ${canonical.sha256}`,
    `sources:`,
    ...sources.map(s => `  - ${s}`),
    `extracted_via: tf-idf-cosine-${threshold}`,
    `qa_via: ${JSON.stringify(method)}`,
    `extracted_at: ${new Date().toISOString()}`,
    "---",
    "",
  ].join("\n");

  const body = [
    `## Question`,
    "",
    q,
    "",
    `## Answer`,
    "",
    canonical.content.trim(),
    "",
  ];

  if (members.length > 1) {
    body.push(
      `## Merged from`,
      "",
      `This canonical block subsumes ${members.length} near-duplicate tips. Originals:`,
      "",
      ...members.map(m => `- \`${m.id}\` (sha256: \`${m.sha256.slice(0,12)}...\`) -- ${m.content.slice(0, 90).replace(/\s+/g, " ")}...`),
      "",
    );
  }
  body.push(
    `## Provenance`,
    "",
    `- Original source file: \`${canonical.source}\``,
    `- Distilled by: \`scripts/distill-tribal.mjs\` at TF-IDF cosine threshold ${threshold}`,
    `- Q-A extraction: ${method}`,
    `- Lifecycle: Draft -> SME validation required before promotion to Current.`,
    "",
  );
  return fm + body.join("\n");
}

// --- Arg parsing (exported, side-effect-free) --------------------------
export function parseArgs(argv) {
  const args = Object.fromEntries(
    argv.map(a => {
      const m = a.match(/^--([^=]+)(?:=(.*))?$/);
      return m ? [m[1], m[2] ?? "true"] : [a, "true"];
    })
  );
  const threshold = parseFloat(args.threshold ?? "0.80");
  const sample = args.sample ? parseInt(args.sample, 10) : null;
  const dryRun = args["dry-run"] === "true";
  const noLlm = args["no-llm"] === "true";
  const model =
    typeof args.model === "string" && args.model !== "true"
      ? args.model
      : process.env.PRISM_DISTILL_TRIBAL_MODEL || null;
  return { threshold, sample, dryRun, noLlm, model };
}

// --- Main ---------------------------------------------------------------
export async function main(config, deps = {}) {
  const { threshold, sample, dryRun, noLlm, model } = config;
  const {
    fetchModelsFn = fetchInstalledModels,
    resolveModelFn = resolveSynthesisModel,
    callImpl = callOllama,
    hardware = undefined,
    indexPath = INDEX_PATH,
    outputDir = OUTPUT_DIR,
  } = deps;
  const auditPath = path.join(outputDir, "_DISTILL_LOG.json");

  let raw;
  try {
    raw = await fs.readFile(indexPath, "utf-8");
  } catch (e) {
    console.error(`distill-tribal: cannot read ${indexPath}: ${e.message}`);
    process.exit(1);
  }
  let idx;
  try {
    idx = JSON.parse(raw);
  } catch (e) {
    console.error(`distill-tribal: malformed JSON in ${indexPath}: ${e.message}`);
    process.exit(1);
  }
  if (!idx.tips || typeof idx.tips !== "object") {
    console.error("distill-tribal: index missing .tips object");
    process.exit(1);
  }

  let tips = Object.values(idx.tips).filter(t => t && typeof t.content === "string" && t.content.trim().length > 0);
  if (sample) tips = tips.slice(0, sample);

  console.log(`distill-tribal: loaded ${tips.length} tips (threshold=${threshold}${sample ? `, sample=${sample}` : ""}${dryRun ? ", dry-run" : ""})`);

  const t0 = Date.now();
  const tokens = tips.map(t => tokenize(t.content));
  const vectors = buildTfIdf(tokens);
  const clusters = clusterByThreshold(vectors, threshold);
  const t1 = Date.now();

  const merges = clusters.filter(c => c.length > 1).length;
  const singletons = clusters.length - merges;
  console.log(`distill-tribal: ${clusters.length} clusters in ${t1 - t0}ms (${merges} merge-groups, ${singletons} singletons)`);

  // Pick canonical (longest content) per cluster
  const canonicalRecords = clusters.map(idxList => {
    const members = idxList.map(i => tips[i]);
    members.sort((a, b) => b.content.length - a.content.length);
    const canonical = members[0];
    return {
      canonical,
      members,
      domain: canonical.domain || "General",
      sources: members.map(m => `${m.id}:${m.sha256}`),
      confidence: Math.max(...members.map(m => m.confidence ?? 0.5)),
    };
  });

  // Top-line stats
  const totalIn = tips.length;
  const totalOut = canonicalRecords.length;
  const reductionPct = totalIn > 0 ? ((totalIn - totalOut) / totalIn * 100).toFixed(1) : "0.0";
  console.log(`distill-tribal: ${totalIn} -> ${totalOut} canonical (${reductionPct}% reduction)`);

  if (dryRun) {
    console.log("distill-tribal: --dry-run; not writing files (Ollama not contacted)");
    // Still print the largest 5 merge groups so the operator can sanity-check
    const topGroups = canonicalRecords.filter(r => r.members.length > 1)
      .sort((a, b) => b.members.length - a.members.length).slice(0, 5);
    for (const g of topGroups) {
      console.log(`  cluster size=${g.members.length} domain=${g.domain}`);
      console.log(`    canonical: ${g.canonical.content.slice(0, 100).replace(/\s+/g, " ")}...`);
      for (const m of g.members.slice(1, 4)) {
        console.log(`    merged:    ${m.content.slice(0, 100).replace(/\s+/g, " ")}...`);
      }
    }
    return { totalIn, totalOut, useLlm: false, qaModel: null, dryRun: true };
  }

  // --- Q-A method gate: Ollama up -> LLM Q-A; down / --no-llm -> heuristic ---
  // Probe ONCE up front (avoids N per-cluster timeouts when the daemon is down)
  // and reuse the installed-model list for the host-aware model resolve.
  let useLlm = false;
  let qaModel = null;
  if (noLlm) {
    console.log("distill-tribal: --no-llm -> heuristic Q-A");
  } else {
    const installed = await fetchModelsFn();
    if (installed.length) {
      const resolved = await resolveModelFn({
        fallback: DEFAULT_QA_MODEL,
        override: model,
        available: installed,
        hardware,
      });
      qaModel = resolved.model;
      useLlm = true;
      console.log(`distill-tribal: Ollama up (${installed.length} models) -> LLM Q-A via ${qaModel} [${resolved.source}${resolved.tier ? `/${resolved.tier}` : ""}]`);
    } else {
      console.log("distill-tribal: Ollama down/empty roster -> heuristic Q-A fallback");
    }
  }

  // Resolve the question for every canonical record (sequential -- one warm
  // model, keep_alive holds it; avoids overloading the daemon).
  const qaCounts = { llm: 0, heuristicFallback: 0, heuristic: 0 };
  if (useLlm) {
    for (let i = 0; i < canonicalRecords.length; i++) {
      const r = canonicalRecords[i];
      const { question, method } = await deriveQuestionLLM(r.canonical.content, r.domain, { model: qaModel, callImpl });
      r.question = question;
      r.qaMethod = method;
      if (method.startsWith("llm:")) qaCounts.llm++;
      else qaCounts.heuristicFallback++;
      if ((i + 1) % 25 === 0 || i === canonicalRecords.length - 1) {
        console.log(`distill-tribal: Q-A ${i + 1}/${canonicalRecords.length} (llm=${qaCounts.llm} fallback=${qaCounts.heuristicFallback})`);
      }
    }
  } else {
    for (const r of canonicalRecords) {
      r.question = deriveQuestion(r.canonical.content, r.domain);
      r.qaMethod = "heuristic-no-llm";
      qaCounts.heuristic++;
    }
  }

  // Wipe + regen canonical/
  await fs.mkdir(outputDir, { recursive: true });
  for (const f of await fs.readdir(outputDir).catch(() => [])) {
    if (f.endsWith(".md") || f === "_DISTILL_LOG.json") {
      await fs.unlink(path.join(outputDir, f)).catch(() => {});
    }
  }

  let written = 0;
  let writeErrors = 0;
  const slugCounts = new Map();
  const auditEntries = [];
  for (const r of canonicalRecords) {
    let slug = slugify(deriveTitle(r.canonical.content, r.domain));
    const prior = slugCounts.get(slug) ?? 0;
    slugCounts.set(slug, prior + 1);
    if (prior > 0) slug = `${slug}-${r.canonical.sha256.slice(0, 8)}`;
    const filename = `${slug}.md`;
    const filepath = path.join(outputDir, filename);
    try {
      await fs.writeFile(filepath, renderIdeaBlock(r, threshold), "utf-8");
      written++;
      auditEntries.push({
        filename,
        clusterSize: r.members.length,
        domain: r.domain,
        canonicalId: r.canonical.id,
        canonicalSha256: r.canonical.sha256,
        memberIds: r.members.map(m => m.id),
        qaMethod: r.qaMethod,
      });
    } catch (e) {
      writeErrors++;
      console.error(`  write-fail ${filename}: ${e.message}`);
    }
  }

  const qaExtractionMethod = useLlm
    ? `llm:${qaModel} (${qaCounts.heuristicFallback} heuristic-fallback)`
    : noLlm
      ? "heuristic-no-llm (--no-llm)"
      : "heuristic-no-llm (ollama down)";

  const audit = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    threshold,
    sample: sample ?? null,
    inputTipsCount: totalIn,
    outputBlocksCount: totalOut,
    reductionPct: parseFloat(reductionPct),
    mergeGroupCount: merges,
    singletonCount: singletons,
    writeSuccess: written,
    writeErrors,
    elapsedMs: Date.now() - t0,
    extractedVia: `tf-idf-cosine-${threshold}`,
    qaExtractionMethod,
    qaModel: useLlm ? qaModel : null,
    qaCounts,
    note: useLlm
      ? "Q-A synthesized via local Ollama model; per-cluster heuristic fallback on any model failure. Clustering is deterministic TF-IDF (no LLM)."
      : "Ollama unavailable at distillation time; Q-A derived heuristically. Re-run with Ollama up for LLM Q-A synthesis. Clustering is deterministic TF-IDF.",
    entries: auditEntries,
  };
  await fs.writeFile(auditPath, JSON.stringify(audit, null, 2), "utf-8");

  console.log(`distill-tribal: wrote ${written} IdeaBlocks to ${outputDir}${writeErrors ? ` (${writeErrors} errors)` : ""}`);
  console.log(`distill-tribal: Q-A method: ${qaExtractionMethod}`);
  console.log(`distill-tribal: audit log: ${auditPath}`);
  return { totalIn, totalOut, written, writeErrors, useLlm, qaModel, qaCounts };
}

// --- CLI entry (only when run directly; import-safe for tests) ---------
const isMain = pathToFileURL(process.argv[1] || "").href === import.meta.url;
if (isMain) {
  const config = parseArgs(process.argv.slice(2));
  if (!Number.isFinite(config.threshold) || config.threshold <= 0 || config.threshold >= 1) {
    console.error(`distill-tribal: --threshold must be in (0, 1), got ${config.threshold}`);
    process.exit(1);
  }
  main(config).catch(e => { console.error("distill-tribal: fatal:", e); process.exit(1); });
}
