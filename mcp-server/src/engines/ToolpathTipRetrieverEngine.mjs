// ToolpathTipRetrieverEngine.mjs
// Given a (software, toolpath) query, returns the top-K cached tribal tips
// from the per-toolpath wiki MD corpus. Closes the loop between
// TemplateApplicabilityClassifierEngine.classify() (decision: use X) and the
// actual delivery surface (operator sees X's tips with provenance).
//
// Per kilo soul: every returned tip carries source URL + timestamp +
// extractedAt. Empty corpus on disk → returns {ok:false, reason} rather than
// fabricating tips (refuses silent-fallback-on-ambiguous-callouts).
//
// Data shape (frontmatter + body of per-toolpath MD):
//   ---
//   software: mastercam
//   toolpath: dynamic-mill
//   tipCount: 18
//   ---
//   # ...
//   ### <video title> @<seconds>s
//   **Source:** [...](url&t=Xs) · video `id` · ISO-date
//   ```
//   <tip text>
//   ```
//
// schemaVersion 1.0.0

import fs from 'node:fs';
import path from 'node:path';

const SCHEMA_VERSION = '1.0.0';
const DEFAULT_CORPUS_DIR = 'H:/prism-slot-kilo/knowledge/wiki/architecture/tribal/per-toolpath';
const DEFAULT_TOP_K = 5;

/**
 * Parse one per-toolpath MD into structured records.
 * Pure function — safe to test with an in-memory fixture.
 * @param {string} mdContent - raw MD file content
 * @returns {{ frontmatter: Object, tips: Array<{title:string, timestamp:number, sourceUrl:string, videoId:string, text:string}> }}
 */
export function parseToolpathMd(mdContent) {
  if (!mdContent || typeof mdContent !== 'string') {
    return { frontmatter: {}, tips: [] };
  }
  // Frontmatter (between leading `---` lines).
  const fmMatch = mdContent.match(/^---\n([\s\S]*?)\n---\n/);
  const frontmatter = {};
  if (fmMatch) {
    for (const line of fmMatch[1].split('\n')) {
      const kv = line.match(/^(\w+):\s*(.+)$/);
      if (kv) frontmatter[kv[1]] = kv[2].trim();
    }
  }
  // Body is after the closing `---`.
  const body = fmMatch ? mdContent.slice(fmMatch[0].length) : mdContent;
  // Each tip starts with `### <title> @<sec>s` followed by **Source:** ... then ``` block.
  const tips = [];
  const sections = body.split(/^### /m).slice(1); // first chunk is preamble
  for (const sec of sections) {
    const titleLine = (sec.split('\n')[0] || '').trim();
    const titleMatch = titleLine.match(/^(.+?)\s*@(\d+)s$/);
    const title = titleMatch ? titleMatch[1].trim() : titleLine;
    const timestamp = titleMatch ? Number(titleMatch[2]) : 0;
    // Source line: **Source:** [label](URL) ...
    const srcMatch = sec.match(/\*\*Source:\*\*\s*\[([^\]]+)\]\(([^)]+)\).*?video\s*`([^`]+)`/);
    const sourceUrl = srcMatch ? srcMatch[2] : '';
    const videoId = srcMatch ? srcMatch[3] : '';
    // Tip text inside ```...```
    const codeMatch = sec.match(/```\n([\s\S]*?)\n```/);
    const text = codeMatch ? codeMatch[1].trim() : '';
    if (text.length === 0) continue; // skip malformed
    tips.push({ title, timestamp, sourceUrl, videoId, text });
  }
  return { frontmatter, tips };
}

/**
 * Score a tip's relevance to an optional materialHint / featureHint.
 * Pure ranking — higher = more relevant. Used for top-K selection when the
 * query carries beyond-software+toolpath context.
 * @param {{text: string}} tip
 * @param {{materialHint?: string, featureHint?: string}} hints
 * @returns {number}
 */
export function scoreTipRelevance(tip, hints) {
  if (!tip || !tip.text) return 0;
  const lo = tip.text.toLowerCase();
  let score = 1; // baseline — tip is for the right software+toolpath
  if (hints?.materialHint) {
    const mh = String(hints.materialHint).toLowerCase();
    if (lo.includes(mh)) score += 2;
  }
  if (hints?.featureHint) {
    const fh = String(hints.featureHint).toLowerCase();
    if (lo.includes(fh)) score += 2;
  }
  // Slight tie-break: longer tips have more context.
  score += Math.min(1, tip.text.length / 1500);
  return score;
}

/**
 * Retrieve top-K tips for a (software, toolpath) query.
 * Reads the per-toolpath MD file from the corpus, parses, ranks, returns
 * structured records with provenance.
 * @param {{software: string, toolpath: string, materialHint?: string, featureHint?: string, topK?: number, corpusDir?: string}} query
 * @returns {{ok: boolean, reason?: string, software?: string, toolpath?: string, tips?: Array, tipCount?: number}}
 */
export function retrieve(query) {
  if (!query || typeof query !== 'object') {
    return { ok: false, reason: 'invalid-query' };
  }
  const { software, toolpath, materialHint, featureHint } = query;
  if (!software || typeof software !== 'string') {
    return { ok: false, reason: 'missing-software' };
  }
  if (!toolpath || typeof toolpath !== 'string') {
    return { ok: false, reason: 'missing-toolpath' };
  }
  const topK = Number.isFinite(query.topK) && query.topK > 0 ? Math.floor(query.topK) : DEFAULT_TOP_K;
  const corpusDir = query.corpusDir || DEFAULT_CORPUS_DIR;
  const swSlug = software.replace('_', '-');
  const fname = `tribal-${swSlug}-${toolpath}.md`;
  const fpath = path.join(corpusDir, fname);
  if (!fs.existsSync(fpath)) {
    return { ok: false, reason: 'no-corpus-file', expectedPath: fpath };
  }
  const md = fs.readFileSync(fpath, 'utf8');
  const { frontmatter, tips } = parseToolpathMd(md);
  if (tips.length === 0) {
    return { ok: false, reason: 'empty-corpus-file', frontmatter };
  }
  const ranked = tips
    .map((t) => ({ ...t, _score: scoreTipRelevance(t, { materialHint, featureHint }) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, topK)
    .map(({ _score, ...rest }) => rest);
  return {
    ok: true,
    software,
    toolpath,
    tipCount: tips.length,
    tips: ranked,
    schemaVersion: SCHEMA_VERSION,
  };
}

/**
 * List all (software, toolpath) tuples present in the corpus.
 * Useful for the classifier when enumerating valid decisions or for
 * dashboard surfaces showing coverage.
 * @param {string} [corpusDir]
 * @returns {Array<{software: string, toolpath: string, filename: string}>}
 */
// Software whitelist matching TOOLPATH_VOCAB keys — required because some
// software names contain digits (`fusion360`) and underscores
// (`solidworks_cam`, on-disk as `solidworks-cam`) that a generic regex
// can't unambiguously split. Keeping this explicit avoids silent mis-parsing
// per kilo soul refuse silent-fallback.
const KNOWN_SOFTWARE_ON_DISK = [
  'mastercam', 'hypermill', 'fusion360', 'solidworks-cam', 'esprit', 'solidcam',
];

export function listAvailableToolpaths(corpusDir = DEFAULT_CORPUS_DIR) {
  if (!fs.existsSync(corpusDir)) return [];
  const out = [];
  for (const f of fs.readdirSync(corpusDir)) {
    if (!f.endsWith('.md')) continue;
    if (!f.startsWith('tribal-')) continue;
    const stem = f.slice('tribal-'.length, -'.md'.length); // <software>-<toolpath>
    let matchedSoftware = null;
    for (const sw of KNOWN_SOFTWARE_ON_DISK) {
      if (stem === sw) continue; // need a toolpath suffix too
      if (stem.startsWith(`${sw}-`)) {
        matchedSoftware = sw;
        break;
      }
    }
    if (!matchedSoftware) continue;
    const toolpath = stem.slice(matchedSoftware.length + 1); // skip the '-'
    if (!toolpath) continue;
    out.push({
      software: matchedSoftware.replace('-cam', '_cam'),
      toolpath,
      filename: f,
    });
  }
  return out;
}

export const META = {
  schemaVersion: SCHEMA_VERSION,
  defaultCorpusDir: DEFAULT_CORPUS_DIR,
  defaultTopK: DEFAULT_TOP_K,
};
