// unlinked-mentions-scan.mjs - pure scanner library.
//
// Closes PSN-ENHANCE-MS0/U-PSN-UNLINKED-MENTIONS. Implements the cyrilXBT
// "Unlinked Mentions" pattern from his 2026-05-22 Obsidian article: scan
// memory + wiki note bodies for bare references to known note-slug names
// that are NOT wrapped in [[...]] link tokens.
//
// Pure library - no I/O, no side effects, no globals. Caller passes a
// `notes` map ({ slug -> { path, body, aliases? } }). Returns the candidate
// list deterministically. The CLI runner (../find-unlinked-mentions.mjs)
// does the filesystem walk.
//
// @milestone PSN-ENHANCE-MS0/U-PSN-UNLINKED-MENTIONS

const MIN_NAME_LEN = 4;            // shorter slugs match too much prose
const MAX_MATCHES_PER_BODY = 200;  // OOM guard for corrupt mega-files
const CONTEXT_WINDOW = 40;         // chars on each side of a hit
const MAX_SAMPLES_PER_CANDIDATE = 3;

export function buildKnownNameRegex(notes) {
  const slugByName = new Map();
  const names = [];
  for (const [slug, meta] of notes) {
    const all = [slug, ...((meta && meta.aliases) || [])];
    for (const n of all) {
      if (typeof n !== "string" || n.length < MIN_NAME_LEN) continue;
      const lc = n.toLowerCase();
      if (slugByName.has(lc)) continue; // first slug wins on collision
      slugByName.set(lc, slug);
      names.push(n);
    }
  }
  // Sort longest-first so "PSN-SYNERGIZE" wins over "PSN".
  names.sort((a, b) => b.length - a.length);
  if (names.length === 0) {
    return { re: /(?!x)x/g, slugByName }; // never-matching sentinel
  }
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  // Word boundary on both sides so "PSN" doesn't match inside "PSNbattle".
  const re = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
  return { re, slugByName };
}

export function stripLinkedAndCodeSpans(body) {
  // Replace with spaces preserving length so source positions remain comparable.
  const blank = (s) => " ".repeat(s.length);
  return body
    .replace(/```[\s\S]*?```/g, blank)         // fenced code blocks
    .replace(/`[^`\n]+`/g, blank)               // inline code
    .replace(/\[\[[^\]]*\]\]/g, blank)          // already-linked references
    .replace(/\[[^\]]+\]\([^)]+\)/g, blank);    // markdown URL links
}

export function findMentionsInBody(body, re, slugByName, ownSlug) {
  if (typeof body !== "string" || body.length === 0) return [];
  const stripped = stripLinkedAndCodeSpans(body);
  const out = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(stripped)) !== null && out.length < MAX_MATCHES_PER_BODY) {
    const hitName = m[1];
    const slug = slugByName.get(hitName.toLowerCase());
    if (!slug || slug === ownSlug) continue;
    out.push({
      name: hitName,
      slug,
      contextStart: Math.max(0, m.index - CONTEXT_WINDOW),
      contextEnd: Math.min(stripped.length, m.index + hitName.length + CONTEXT_WINDOW),
    });
  }
  return out;
}

export function scanForUnlinkedMentions(notes, opts = {}) {
  const maxPerNote = Number.isFinite(opts.maxPerNote) ? opts.maxPerNote : 20;
  const { re, slugByName } = buildKnownNameRegex(notes);
  const candidates = [];
  let totalMentions = 0;
  let hostsWithMentions = 0;
  for (const [slug, meta] of notes) {
    if (!meta || typeof meta.body !== "string") continue;
    const hits = findMentionsInBody(meta.body, re, slugByName, slug);
    if (hits.length === 0) continue;
    hostsWithMentions++;
    totalMentions += hits.length;
    const byMentioned = new Map();
    for (const h of hits) {
      const cur = byMentioned.get(h.slug) || { count: 0, samples: [], mentionedName: h.name };
      cur.count++;
      if (cur.samples.length < MAX_SAMPLES_PER_CANDIDATE) {
        cur.samples.push({ contextStart: h.contextStart, contextEnd: h.contextEnd });
      }
      byMentioned.set(h.slug, cur);
    }
    let added = 0;
    for (const [mentionedSlug, agg] of byMentioned) {
      if (added >= maxPerNote) break;
      candidates.push({
        hostPath: meta.path,
        hostSlug: slug,
        mentionedSlug,
        mentionedName: agg.mentionedName,
        count: agg.count,
        samples: agg.samples,
      });
      added++;
    }
  }
  return {
    candidates,
    stats: { notesScanned: notes.size, totalMentions, hostsWithMentions },
  };
}
