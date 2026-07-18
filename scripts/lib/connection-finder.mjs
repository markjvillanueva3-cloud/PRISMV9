// connection-finder.mjs - pure library.
//
// Closes PSN-ENHANCE-MS0/U-PSN-CONNECTION-FINDER. Implements cyrilXBT's
// "Connection Finder" pattern from his 2026-05-22 X article on Obsidian
// linking: for a target slug, find OTHER vault notes whose bodies overlap
// in token-content with the target but are NOT yet linked from/to the
// target. Each match is a candidate link the operator should review.
//
// Pure - no I/O, no globals. Caller passes notes-map + target slug.
//
// @milestone PSN-ENHANCE-MS0/U-PSN-CONNECTION-FINDER

const MIN_TOKEN_LEN = 4;
const STOPWORDS = new Set([
  "this", "that", "with", "from", "have", "been", "were", "they", "them",
  "their", "what", "when", "which", "would", "could", "should", "about",
  "into", "than", "then", "more", "some", "such", "only", "also", "very",
  "your", "yours", "ours", "where", "those", "these", "here", "there",
  "will", "want", "make", "made", "does", "doing", "done", "each",
  "after", "before", "first", "last", "next", "many", "most", "much",
  "between", "across", "above", "below", "under", "over", "while",
  "because", "since", "though", "without", "within", "around", "among",
  "however", "therefore", "thus", "hence", "still", "even", "just",
]);

export function tokenize(text) {
  if (typeof text !== "string") return [];
  return text
    .toLowerCase()
    .split(/[^a-z0-9_-]+/)
    .filter((t) => t.length >= MIN_TOKEN_LEN && !STOPWORDS.has(t));
}

// Extract every [[slug]] referenced from a body - those are already-linked refs.
export function extractLinkedSlugs(body) {
  if (typeof body !== "string") return new Set();
  const out = new Set();
  const re = /\[\[([^\]|#^]+)/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const s = m[1].trim();
    if (s.length >= MIN_TOKEN_LEN) out.add(s.toLowerCase());
  }
  return out;
}

// Build inverse-document-frequency over the notes corpus.
export function buildIdf(notes) {
  const df = new Map();
  let N = 0;
  for (const [, meta] of notes) {
    if (!meta || typeof meta.body !== "string") continue;
    N++;
    const seen = new Set(tokenize(meta.body));
    for (const t of seen) df.set(t, (df.get(t) || 0) + 1);
  }
  const idf = new Map();
  for (const [t, n] of df) idf.set(t, Math.log(1 + N / (n + 1)));
  return { idf, N };
}

// TF-IDF cosine similarity between two pre-tokenized bags.
export function cosineSim(tokensA, tokensB, idf) {
  if (!tokensA.length || !tokensB.length) return 0;
  const tfA = new Map();
  for (const t of tokensA) tfA.set(t, (tfA.get(t) || 0) + 1);
  const tfB = new Map();
  for (const t of tokensB) tfB.set(t, (tfB.get(t) || 0) + 1);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  const allKeys = new Set([...tfA.keys(), ...tfB.keys()]);
  for (const t of allKeys) {
    const w = idf.get(t) || 1;
    const a = (tfA.get(t) || 0) * w;
    const b = (tfB.get(t) || 0) * w;
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// Compute the set of slugs already connected to the target (in + out links).
export function findExistingConnections(targetSlug, notes) {
  const connected = new Set();
  connected.add(targetSlug.toLowerCase());
  const targetMeta = notes.get(targetSlug);
  if (targetMeta) {
    for (const s of extractLinkedSlugs(targetMeta.body || "")) connected.add(s);
  }
  for (const [slug, meta] of notes) {
    if (!meta || typeof meta.body !== "string") continue;
    const refs = extractLinkedSlugs(meta.body);
    if (refs.has(targetSlug.toLowerCase())) connected.add(slug.toLowerCase());
  }
  return connected;
}

// Main: rank candidate connections for a target slug.
// Returns top-K notes by TF-IDF cosine similarity that are NOT already
// in the connected-set (incoming + outgoing links + the target itself).
export function findConnections(targetSlug, notes, opts = {}) {
  const topK = Number.isFinite(opts.topK) ? opts.topK : 25;
  const minScore = Number.isFinite(opts.minScore) ? opts.minScore : 0.02;
  const target = notes.get(targetSlug);
  if (!target || typeof target.body !== "string") {
    return { ok: false, reason: `target slug "${targetSlug}" not found or empty`, candidates: [] };
  }
  const connected = findExistingConnections(targetSlug, notes);
  const { idf } = buildIdf(notes);
  const targetTokens = tokenize(target.body);
  const ranked = [];
  for (const [slug, meta] of notes) {
    if (!meta || typeof meta.body !== "string") continue;
    if (connected.has(slug.toLowerCase())) continue;
    const otherTokens = tokenize(meta.body);
    const score = cosineSim(targetTokens, otherTokens, idf);
    if (score < minScore) continue;
    ranked.push({ slug, path: meta.path, score });
  }
  ranked.sort((a, b) => b.score - a.score);
  return {
    ok: true,
    target: targetSlug,
    targetPath: target.path,
    candidates: ranked.slice(0, topK),
    stats: {
      candidatesEvaluated: notes.size,
      connectedFiltered: connected.size,
      candidatesScored: ranked.length,
    },
  };
}
