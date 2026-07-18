// HERMES-MS1 / U-HERMES04..07 — closed-learning-loop pipeline (pure lib).
//
// Reads the observation ledger written by U-HERMES03 (skill-candidate-observe Stop
// hook) and runs the cluster → emit → gate → ship chain Hermes uses to grow a
// skill library from observed work.
//
// Pure functions; all I/O is injected via opts. Tests stay hermetic.
//
// Stages:
//   clusterCandidates(ledgerLines, opts)
//     → groups eligible entries by signature; cluster crosses CLUSTER_THRESHOLD
//       (default 5) → emission-ready.
//   buildStubBody(cluster, opts)
//     → renders SKILL-CANDIDATE-<id>.md body (pure markdown).
//   gateCandidate(cluster, existingSkills, opts)
//     → deterministic dedup-check + leverage-check + conflict-check.
//       Returns verdict: AUTO-PASS / AUTO-FAIL / NEEDS-REVIEW + reason.
//   buildReviewerPrompt(cluster, opts)
//     → for NEEDS-REVIEW: a prompt string the operator dispatches as a reviewer
//       subagent (Agent tool). Mirrors the scrutiny-3way arm-A shape.
//   shipDraft(cluster, gateVerdict, opts)
//     → writes draft skill to state/shared/specs/SKILL-CANDIDATE-AUTOPASS-<id>.md
//       (a staging marker, NOT a live .claude/commands/ slot — G5 gap-audit fix
//       2026-05-20) when verdict is PASS;
//       caller injects writer.

export const CLUSTER_THRESHOLD = 5;          // N occurrences before emit
export const SIGNATURE_MAX_LEN = 64;         // truncate signatures past this to bound stub size
export const MIN_LEVERAGE_CALL_COUNT = 3;    // cluster's median callCount must be ≥ this
export const MAX_STUB_BODY_BYTES = 8192;     // stub markdown hard cap
export const VERDICTS = Object.freeze(["AUTO-PASS", "AUTO-FAIL", "NEEDS-REVIEW"]);
export const SCHEMA_VERSION = "1.0.0";
export const KEYWORD_OVERLAP_THRESHOLD = 0.4; // Jaccard threshold for G6 keyword-match dedup
// HRP01/02/03 — Hermes×PSN×RAG synergy (2026-05-23, slot bravo).
// All RAG paths are opt-in via opts.rerank — when absent, behaviour is identical
// to pre-HRP for backward compat. R12: every RAG fallback (rerank floor, missing
// opt, or thrown error) is reflected in the verdict reason string so the operator
// can audit which dedup path was taken.
export const SEMANTIC_OVERLAP_THRESHOLD = 0.75;  // HRP03 — rerank score above this → AUTO-FAIL as semantic dup
export const RERANK_SCORE_FLOOR = 0.3;           // HRP01/02 — rerank result below this is discarded (likely hallucinated match)
export const PSN_EXEMPLARS_TOP_K = 3;            // HRP02 — how many adjacent tribal/skill exemplars to embed in stub body
export const PSN_SUBCLUSTER_THRESHOLD = 0.4;     // HRP01 — semantic similarity below this between two same-signature entries → split into sub-clusters
// Generic noise tokens that match every cluster — skip when building keyword
// sets so the Jaccard overlap reflects *real* purpose, not common stopwords.
const KEYWORD_STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "to", "for", "with", "in", "on", "at", "by",
  "from", "as", "is", "be", "skill", "command", "tool", "use", "run", "do", "this",
  "that", "it", "if", "then", "when", "any", "all", "into", "via",
]);

// ─── U-HERMES04 — cluster ────────────────────────────────────────────────────
// Parse the JSONL ledger; bucket eligible entries by signature; emit clusters
// crossing the threshold. Stale (deleted) entries are quietly skipped.
export function clusterCandidates(ledgerLines, opts = {}) {
  const threshold = typeof opts.threshold === "number" ? opts.threshold : CLUSTER_THRESHOLD;
  if (!Array.isArray(ledgerLines)) return [];
  const buckets = new Map(); // signature → entries[]
  for (const raw of ledgerLines) {
    if (typeof raw !== "string" || raw.length === 0) continue;
    let entry;
    try { entry = JSON.parse(raw); } catch { continue; }
    if (!entry || entry.eligible !== true) continue;
    if (typeof entry.signature !== "string" || entry.signature.length === 0) continue;
    const arr = buckets.get(entry.signature) || [];
    arr.push(entry);
    buckets.set(entry.signature, arr);
  }
  const clusters = [];
  for (const [signature, entries] of buckets) {
    if (entries.length < threshold) continue;
    // HRP01 — if rerank is wired AND entries carry semanticSummary, split the
    // bucket into sub-clusters when intra-bucket semantic distance is large.
    // Falls back to one cluster when rerank/summary absent (back-compat).
    const subClusters = maybeSemanticSubCluster(entries, opts);
    for (const sub of subClusters) {
      if (sub.length < threshold) continue;
      clusters.push(buildCluster(signature, sub));
    }
  }
  // Newest first — most-recent activity ranks higher for operator triage.
  clusters.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  return clusters;
}

// HRP01 — semantic sub-clustering inside a signature bucket.
// Returns either [[...entries]] (one sub-cluster, identical to pre-HRP) when
// rerank/semanticSummary is unavailable, OR an array of sub-cluster arrays
// when entries diverge semantically.
//
// Algorithm (simple greedy clustering, deterministic): pick the first entry as
// the seed of sub-cluster #1. For each remaining entry, rerank its summary
// against the seed of every existing sub-cluster; assign to the highest-scoring
// sub-cluster whose top score ≥ PSN_SUBCLUSTER_THRESHOLD. Otherwise start a new
// sub-cluster with that entry as seed.
function maybeSemanticSubCluster(entries, opts = {}) {
  const rerank = typeof opts.rerank === "function" ? opts.rerank : null;
  if (!rerank || !Array.isArray(entries) || entries.length < 2) {
    return [entries];
  }
  // Reject bucket-splitting if no entry has a usable semanticSummary —
  // observation layer hasn't been upgraded yet.
  const withSummary = entries.filter(
    (e) => typeof e?.semanticSummary === "string" && e.semanticSummary.length > 0,
  );
  if (withSummary.length < 2) return [entries];

  const buckets = [];
  for (const entry of entries) {
    const summary = typeof entry?.semanticSummary === "string" ? entry.semanticSummary : "";
    if (!summary) {
      // Entry without a summary stays with the first bucket (conservative —
      // never split an entry off into its own pile based on missing data).
      if (buckets.length === 0) buckets.push([entry]);
      else buckets[0].push(entry);
      continue;
    }
    let bestIdx = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < buckets.length; i++) {
      const seed = buckets[i][0]?.semanticSummary || "";
      if (!seed) continue;
      let score;
      try {
        const result = rerank(summary, [seed], 1);
        score = Array.isArray(result) && result[0] ? Number(result[0].score) : NaN;
      } catch {
        score = NaN;
      }
      if (!Number.isFinite(score)) continue;
      if (score < RERANK_SCORE_FLOOR) continue;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0 && bestScore >= PSN_SUBCLUSTER_THRESHOLD) {
      buckets[bestIdx].push(entry);
    } else {
      buckets.push([entry]);
    }
  }
  return buckets;
}

function buildCluster(signature, entries) {
  const kinds = new Map();
  const slots = new Map();
  const callCounts = [];
  let earliest = Infinity, latest = -Infinity;
  for (const e of entries) {
    kinds.set(e.kind, (kinds.get(e.kind) || 0) + 1);
    if (e.slot) slots.set(e.slot, (slots.get(e.slot) || 0) + 1);
    if (typeof e.callCount === "number") callCounts.push(e.callCount);
    const t = Date.parse(e.at || "");
    if (Number.isFinite(t)) {
      earliest = Math.min(earliest, t);
      latest = Math.max(latest, t);
    }
  }
  const sortedCC = callCounts.slice().sort((a, b) => a - b);
  const medianCallCount = sortedCC.length === 0
    ? 0
    : sortedCC[Math.floor(sortedCC.length / 2)];
  const dominantKind = topByCount(kinds);
  const id = makeClusterId(signature, latest);
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    signature: truncate(signature, SIGNATURE_MAX_LEN),
    fullSignature: signature,
    count: entries.length,
    kinds: Object.fromEntries(kinds),
    dominantKind,
    slots: Object.fromEntries(slots),
    medianCallCount,
    firstSeenAt: earliest === Infinity ? null : earliest,
    lastSeenAt: latest === -Infinity ? 0 : latest,
  };
}

function topByCount(map) {
  let best = null;
  let bestCount = -1;
  for (const [k, v] of map) {
    if (v > bestCount) { best = k; bestCount = v; }
  }
  return best;
}

function truncate(s, n) {
  if (typeof s !== "string") return s;
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// Deterministic id — short stable hash of signature + lastSeenAt day-bucket.
// Two clusters with the same signature on the same day collide; that's intended
// (we want idempotent re-emit on the same day).
export function makeClusterId(signature, lastSeenMs) {
  const day = lastSeenMs ? new Date(lastSeenMs).toISOString().slice(0, 10) : "unknown";
  let h = 5381;
  const s = `${signature}|${day}`;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `skc-${(h >>> 0).toString(36)}-${day}`;
}

// ─── U-HERMES05 — stub-body renderer ─────────────────────────────────────────
// Pure markdown — caller decides where to write.
export function buildStubBody(cluster, opts = {}) {
  const now = opts.now || new Date().toISOString();
  const slotsList = Object.entries(cluster.slots || {})
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}=${v}`)
    .join(", ") || "(none recorded)";
  const kindsList = Object.entries(cluster.kinds || {})
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}=${v}`)
    .join(", ") || "mixed";
  // HRP02 — embed nearest PSN exemplars (tribal + existing skills) when rerank
  // is wired and corpora are supplied. Block is silently omitted when absent
  // (back-compat with pre-HRP callers).
  const psnExemplarsBlock = renderPsnExemplars(cluster, opts);
  const body = `---
schemaVersion: ${SCHEMA_VERSION}
id: ${cluster.id}
generated: ${now}
status: candidate
source: HERMES-MS1 / U-HERMES05
---

# SKILL CANDIDATE — \`${cluster.id}\`

Observed ${cluster.count} times across slots [${slotsList}]; dominant kind: **${cluster.dominantKind}** (${kindsList}); median call count: ${cluster.medianCallCount}.

## Tool-call signature

\`\`\`
${cluster.signature}
\`\`\`

## Proposed trigger keywords

(operator/reviewer fills in — derive from dominant-kind tools + typical slot domains: ${Object.keys(cluster.slots || {}).join(", ") || "any"})

## Suggested template

A skill matching this signature should:
1. Read the relevant context (Grep / Read first, per signature shape).
2. Plan with TodoWrite when steps > 3.
3. Execute via the dominant-kind tool family.
4. Verify outcome (test / build / commit).

## Provenance

- First seen: ${cluster.firstSeenAt ? new Date(cluster.firstSeenAt).toISOString() : "(unknown)"}
- Last seen: ${cluster.lastSeenAt ? new Date(cluster.lastSeenAt).toISOString() : "(unknown)"}
- Source ledger: \`state/shared/skill-candidates.jsonl\`
- Pipeline: HERMES-MS1 / \`scripts/lib/skill-loop-pipeline.mjs\`
${psnExemplarsBlock}
## Reviewer gate (U-HERMES06)

This stub does NOT ship as a runnable skill until \`gateCandidate\` returns
\`AUTO-PASS\` or an operator-marked PASS verdict lands in
\`state/shared/skill-loop-verdicts.jsonl\`.

## Operator promote instructions (G5 gap-audit 2026-05-20)

AUTO-PASS does NOT publish to \`.claude/commands/\`. The harness only stages
this spec + an \`SKILL-CANDIDATE-AUTOPASS-<id>.md\` marker file under
\`state/shared/specs/\`. To promote to a live skill:

1. Author the real body. Run \`/forge-triple\` with this cluster's signature
   as the seed, OR hand-edit a draft using the suggested template above.
2. Place the authored \`.md\` file at \`.claude/commands/<chosen-name>.md\` with
   real \`name:\` + \`description:\` + body. The cluster id is NOT the skill name.
3. Append \`{ "id": "${cluster.id}", "promotedTo": "<chosen-name>" }\` to
   \`state/shared/skill-loop-verdicts.jsonl\` for audit.
4. Optionally delete this candidate spec; the verdict log preserves provenance.
`;
  return body.length > MAX_STUB_BODY_BYTES
    ? body.slice(0, MAX_STUB_BODY_BYTES) + "\n…(stub truncated at " + MAX_STUB_BODY_BYTES + " bytes)\n"
    : body;
}

// HRP02 — render the "Closest PSN exemplars" markdown block.
// Returns "" (empty string) when rerank/corpora absent so callers can splice
// it unconditionally into the stub template without conditional logic.
//
// opts.rerank — function(query, candidates[], topK) → [{candidate, score}]
// opts.psnCorpora — { tribal?: string[], skills?: string[], wiki?: string[] }
//   Each corpus is an array of short candidate strings (titles/descriptions);
//   the caller is responsible for fetching them ahead of time so this stays
//   pure-core.
export function renderPsnExemplars(cluster, opts = {}) {
  const rerank = typeof opts.rerank === "function" ? opts.rerank : null;
  const corpora = opts.psnCorpora && typeof opts.psnCorpora === "object" ? opts.psnCorpora : null;
  if (!rerank || !corpora) return "";
  const query = buildRerankQuery(cluster);
  if (!query) return "";
  const topK = typeof opts.psnTopK === "number" && opts.psnTopK > 0 ? opts.psnTopK : PSN_EXEMPLARS_TOP_K;

  const sections = [];
  for (const [legName, candidates] of Object.entries(corpora)) {
    if (!Array.isArray(candidates) || candidates.length === 0) continue;
    let results;
    try {
      results = rerank(query, candidates, topK);
    } catch {
      sections.push(`- **${legName}** — rerank-error (fallback: none)`);
      continue;
    }
    if (!Array.isArray(results) || results.length === 0) {
      sections.push(`- **${legName}** — no nearby exemplars (rerank below floor or empty corpus)`);
      continue;
    }
    const lines = [`- **${legName}** (top ${results.length} of ${candidates.length}):`];
    for (const r of results) {
      const score = Number(r?.score);
      if (!Number.isFinite(score) || score < RERANK_SCORE_FLOOR) continue;
      const text = typeof r?.candidate === "string" ? r.candidate : String(r?.candidate ?? "");
      lines.push(`  - \`${score.toFixed(2)}\` — ${text.slice(0, 120)}`);
    }
    if (lines.length > 1) sections.push(lines.join("\n"));
  }
  if (sections.length === 0) return "";
  return `\n## Closest PSN exemplars (HRP02 — rerank against tribal + skills + wiki)\n\n${sections.join("\n")}\n\nThese are nearest existing surfaces from the PRISM Synergy Network — use them as references when authoring the real skill body (operator promote step).\n`;
}

// HRP02 — derive the rerank query for a cluster.
// Preference order: cluster.semanticSummary (preferred when observation layer
// upgrades to record it) → cluster.dominantKind + signature head → "".
function buildRerankQuery(cluster) {
  if (!cluster || typeof cluster !== "object") return "";
  if (typeof cluster.semanticSummary === "string" && cluster.semanticSummary.length > 0) {
    return cluster.semanticSummary;
  }
  const parts = [];
  if (typeof cluster.dominantKind === "string") parts.push(cluster.dominantKind);
  if (typeof cluster.signature === "string") parts.push(cluster.signature);
  return parts.join(" ");
}

// ─── U-HERMES06 — keyword extraction (G6 gap-audit fix 2026-05-20) ───────────
// Tokenize a string into normalized keywords for Jaccard-overlap dedup.
// - Lowercases, splits on non-alpha-num, drops length<3 + stopwords.
// - Pure / deterministic / hermetic — no I/O.
export function tokenizeKeywords(text) {
  if (typeof text !== "string" || text.length === 0) return new Set();
  const out = new Set();
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 3) continue;
    if (KEYWORD_STOPWORDS.has(raw)) continue;
    out.add(raw);
  }
  return out;
}

// Derive keyword set for a candidate cluster — dominant kind + observed kinds
// + slot domains. Reflects *purpose*, not bare cluster id.
export function extractCandidateKeywords(cluster) {
  if (!cluster || typeof cluster !== "object") return new Set();
  const out = new Set();
  if (typeof cluster.dominantKind === "string") {
    for (const k of tokenizeKeywords(cluster.dominantKind)) out.add(k);
  }
  for (const k of Object.keys(cluster.kinds || {})) {
    for (const t of tokenizeKeywords(k)) out.add(t);
  }
  for (const s of Object.keys(cluster.slots || {})) {
    for (const t of tokenizeKeywords(s)) out.add(t);
  }
  return out;
}

// Jaccard similarity over two keyword sets. [0,1]. 0 when both empty.
export function jaccardSimilarity(a, b) {
  if (!(a instanceof Set) || !(b instanceof Set)) return 0;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const x of a) if (b.has(x)) intersection++;
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// Parse a single skill .md frontmatter for name + description keywords.
// Pure: caller injects raw file content. Returns { name, keywords:Set }.
export function parseSkillFrontmatter(content) {
  if (typeof content !== "string") return { name: "", keywords: new Set() };
  const m = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return { name: "", keywords: new Set() };
  const block = m[1];
  const nameMatch = block.match(/^name:\s*(.+)$/m);
  const descMatch = block.match(/^description:\s*(.+)$/m);
  const name = nameMatch ? nameMatch[1].trim() : "";
  const description = descMatch ? descMatch[1].trim() : "";
  const keywords = new Set([
    ...tokenizeKeywords(name),
    ...tokenizeKeywords(description),
  ]);
  return { name, keywords };
}

// ─── U-HERMES06 — gate ───────────────────────────────────────────────────────
// Deterministic dedup-check + leverage-check + conflict-check.
// Inputs:
//   cluster — from clusterCandidates
//   existingSkills — either:
//     · Set<string> of existing skill ids (legacy; substring conflict-check)
//     · Map<string, Set<string>> of skillName → keywords (new G6 path;
//       Jaccard-overlap conflict-check against trigger keywords +
//       dominant-tool families, NOT bare name substring).
// Returns: { verdict, reason }
export function gateCandidate(cluster, existingSkills = new Set(), opts = {}) {
  if (!cluster || typeof cluster !== "object") {
    return { verdict: "AUTO-FAIL", reason: "no-cluster" };
  }
  // U-HFR01 wire — outcome noise-map dedup. If a prior cluster with this
  // exact signature was abandoned ≥3 times, AUTO-FAIL the new one (don't
  // re-publish a known-noisy pattern). Pass opts.noiseMap from the consumer
  // of hermes-outcome-feedback::summarizeClusterOutcomes.
  if (opts.noiseMap instanceof Map) {
    const sig = cluster.fullSignature || cluster.signature;
    if (typeof sig === "string") {
      const entry = opts.noiseMap.get(sig);
      if (entry && entry.isNoise) {
        return { verdict: "AUTO-FAIL", reason: `noise-pattern:abandoned=${entry.abandoned}/${entry.totalOutcomes}` };
      }
    }
  }
  const minLeverage = typeof opts.minLeverage === "number" ? opts.minLeverage : MIN_LEVERAGE_CALL_COUNT;
  // Leverage check — clusters with very short call sequences are not worth codifying.
  if (cluster.medianCallCount < minLeverage) {
    return { verdict: "AUTO-FAIL", reason: `low-leverage:median=${cluster.medianCallCount}<${minLeverage}` };
  }
  // Dedup-check — id collides with an existing skill (exact-match).
  // Map.has(key) and Set.has(value) share the same .has() signature so this
  // works for both shapes.
  if (typeof existingSkills?.has === "function" && existingSkills.has(cluster.id)) {
    return { verdict: "AUTO-FAIL", reason: `dedup:existing-id=${cluster.id}` };
  }
  // Conflict-check — G6 gap-audit fix 2026-05-20.
  // Map<name, Set<keyword>> shape → Jaccard-overlap against candidate keywords.
  // Set<string> shape → legacy substring fallback (kept for back-compat with
  // callers / tests that don't supply keyword data).
  if (existingSkills instanceof Map) {
    const candidateKw = extractCandidateKeywords(cluster);
    if (candidateKw.size > 0) {
      const minOverlap = typeof opts.minOverlap === "number" ? opts.minOverlap : KEYWORD_OVERLAP_THRESHOLD;
      let best = { name: "", score: 0 };
      for (const [name, kws] of existingSkills) {
        if (!(kws instanceof Set) || kws.size === 0) continue;
        const score = jaccardSimilarity(candidateKw, kws);
        if (score > best.score) best = { name, score };
      }
      if (best.score >= minOverlap) {
        return { verdict: "AUTO-FAIL", reason: `conflict:keyword-overlap=${best.score.toFixed(2)}:${best.name}` };
      }
    }
  } else {
    // Legacy Set<string> fallback: signature-contains-existing-name substring.
    const sigLower = (cluster.fullSignature || "").toLowerCase();
    for (const name of existingSkills) {
      if (typeof name !== "string") continue;
      const lower = name.toLowerCase();
      if (lower.length >= 6 && sigLower.includes(lower)) {
        return { verdict: "AUTO-FAIL", reason: `conflict:signature-contains-existing:${name}` };
      }
    }
  }
  // HRP03 — semantic-overlap dedup. When rerank is wired AND existingSkills is
  // a Map<name, {keywords:Set, description:string}> (extended shape), rerank
  // the candidate's purpose-query against existing skill descriptions. A top-1
  // score ≥ SEMANTIC_OVERLAP_THRESHOLD → AUTO-FAIL as semantic duplicate. Catches
  // paraphrased dups that Jaccard misses ("rebuild engine index" vs "regenerate
  // ENGINE_DIGEST"). Falls through to default verdict when rerank/data absent.
  const rerank = typeof opts.rerank === "function" ? opts.rerank : null;
  if (rerank && existingSkills instanceof Map) {
    const candidates = [];
    const names = [];
    for (const [name, payload] of existingSkills) {
      // Accept either the plain Set shape (legacy G6) or the extended object
      // shape { keywords, description }. Description string is what we rerank.
      let desc = null;
      if (payload && typeof payload === "object" && !(payload instanceof Set)) {
        if (typeof payload.description === "string" && payload.description.length > 0) {
          desc = payload.description;
        }
      }
      if (typeof desc === "string" && desc.length > 0) {
        candidates.push(desc);
        names.push(name);
      }
    }
    if (candidates.length > 0) {
      const query = buildRerankQuery(cluster);
      if (query) {
        const minSemantic = typeof opts.minSemanticOverlap === "number"
          ? opts.minSemanticOverlap
          : SEMANTIC_OVERLAP_THRESHOLD;
        let results;
        try {
          results = rerank(query, candidates, 1);
        } catch {
          results = null;
        }
        if (Array.isArray(results) && results.length > 0) {
          const r = results[0];
          const score = Number(r?.score);
          if (Number.isFinite(score) && score >= minSemantic) {
            // Map back from candidate text → name.
            const matchedText = typeof r?.candidate === "string" ? r.candidate : String(r?.candidate ?? "");
            const idx = candidates.indexOf(matchedText);
            const name = idx >= 0 ? names[idx] : "<unknown>";
            return {
              verdict: "AUTO-FAIL",
              reason: `conflict:semantic-overlap=${score.toFixed(2)}:${name}`,
            };
          }
        }
      }
    }
  }
  // Clear-cut AUTO-PASS — high leverage (median >= 2× threshold) AND seen across
  // multiple distinct slots (>=2). Otherwise NEEDS-REVIEW so an operator/reviewer
  // subagent makes the call.
  const slotsCount = Object.keys(cluster.slots || {}).length;
  if (cluster.medianCallCount >= 2 * minLeverage && slotsCount >= 2) {
    return { verdict: "AUTO-PASS", reason: `high-leverage-multi-slot:median=${cluster.medianCallCount},slots=${slotsCount}` };
  }
  return { verdict: "NEEDS-REVIEW", reason: `default-needs-review:median=${cluster.medianCallCount},slots=${slotsCount}` };
}

// Pure: prompt for a reviewer subagent to make a call on a NEEDS-REVIEW candidate.
export function buildReviewerPrompt(cluster, stubBody) {
  return [
    `You are reviewing a skill candidate auto-emitted by HERMES-MS1 (U-HERMES05).`,
    ``,
    `Cluster id: ${cluster.id}`,
    `Observed: ${cluster.count} times across slots [${Object.keys(cluster.slots || {}).join(", ")}]`,
    `Dominant kind: ${cluster.dominantKind}`,
    `Median call count: ${cluster.medianCallCount}`,
    ``,
    `## Stub body`,
    ``,
    stubBody,
    ``,
    `## Your task`,
    ``,
    `Verify (a) no existing skill in \`.claude/commands/\` already does this; (b) the leverage justifies a skill (saving ≥10 tokens or ≥1 round-trip per use); (c) no dispatcher-action conflict.`,
    ``,
    `Return JSON: { "verdict": "PASS" | "FAIL", "reason": "<one sentence>" }`,
  ].join("\n");
}

// ─── U-HERMES07 — ship ───────────────────────────────────────────────────────
// Pure decision; caller does the actual file write via injected `writer`.
// Returns { shipped, path?, reason } so the orchestrator can log/journal.
//
// G5 gap-audit fix (2026-05-20): default destination is the staging area
// `state/shared/specs/SKILL-CANDIDATE-AUTOPASS-<id>.md` — NOT
// `.claude/commands/`. AUTO-PASS marks a candidate as ready for operator
// promotion; it does NOT publish a stub as a live slash command.
//
// Path resolution (most specific wins):
//   ctx.stagingDir → `${stagingDir}/SKILL-CANDIDATE-AUTOPASS-${id}.md`
//   ctx.commandsDir (legacy/back-compat) → `${commandsDir}/${id}.md`
//   default → `state/shared/specs/SKILL-CANDIDATE-AUTOPASS-${id}.md`
export function shipDraft(cluster, gateVerdict, ctx = {}) {
  const allowed = ["AUTO-PASS", "PASS"];
  const verdict = (gateVerdict?.verdict || "").toUpperCase();
  if (!allowed.includes(verdict)) {
    return { shipped: false, reason: `verdict-not-pass:${verdict || "missing"}` };
  }
  if (!cluster?.id) {
    return { shipped: false, reason: "no-cluster-id" };
  }
  let path;
  if (ctx.stagingDir) {
    path = `${ctx.stagingDir}/SKILL-CANDIDATE-AUTOPASS-${cluster.id}.md`;
  } else if (ctx.commandsDir) {
    // Back-compat: explicit commandsDir keeps the old behavior for callers
    // that already opt-in (tests, operator-promoted runs).
    path = `${ctx.commandsDir}/${cluster.id}.md`;
  } else {
    path = `state/shared/specs/SKILL-CANDIDATE-AUTOPASS-${cluster.id}.md`;
  }
  if (typeof ctx.writer !== "function") {
    return { shipped: false, reason: "no-writer-injected", path };
  }
  // U-HRP07 wire — when ctx.aiGeneratedBody is supplied (caller invoked
  // aiGenerateDraftBody from hermes-frontier-utils.mjs ahead of time and
  // got a non-null result), prefer it over the static stub. Operator still
  // promotes; never lands as a live skill without review.
  const body = ctx.body || ctx.aiGeneratedBody || buildStubBody(cluster, ctx);
  try {
    ctx.writer(path, body);
    return { shipped: true, path, bytes: body.length };
  } catch (e) {
    return { shipped: false, reason: `writer-error:${e?.message || "unknown"}`, path };
  }
}
