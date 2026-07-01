// gap-finder.mjs - per-MOC coverage gap scanner (cyrilXBT Gap-Finder pattern).
// @milestone PSN-ENHANCE-MS0/U-PSN-GAP-FINDER

const MIN_FOR_DEDICATED = 2;
const MIN_CONCEPT_LEN = 3;

export function extractLinkedSlugs(body) {
  if (typeof body !== "string") return [];
  const out = [];
  const re = /\[\[([^\]|#^]+)/g;
  const seen = new Set();
  let m;
  while ((m = re.exec(body)) !== null) {
    const s = m[1].trim().toLowerCase();
    if (s.length < MIN_CONCEPT_LEN) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

export function countBacklinks(targetSlug, notes, excludeSlug) {
  let n = 0;
  const target = targetSlug.toLowerCase();
  for (const [slug, meta] of notes) {
    if (slug === excludeSlug) continue;
    if (slug.toLowerCase() === target) continue;
    if (!meta || typeof meta.body !== "string") continue;
    const refs = extractLinkedSlugs(meta.body);
    if (refs.includes(target)) n++;
  }
  return n;
}

export function extractHeadings(body) {
  if (typeof body !== "string") return [];
  const out = [];
  for (const line of body.split(/\r?\n/)) {
    const m = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    out.push({ level: m[1].length, text: m[2].trim() });
  }
  return out;
}

export function findImplicitConcepts(body, notes) {
  if (typeof body !== "string") return [];
  const lines = body.split(/\r?\n/);
  const concepts = [];
  let current = null;
  let hasLink = false;
  function flush() {
    if (current && !hasLink) {
      const key = current.text.toLowerCase().trim();
      if (!notes.has(key) && !notes.has(current.text.trim())) {
        concepts.push(current.text);
      }
    }
  }
  for (const raw of lines) {
    const h = /^(#{1,6})\s+(.+?)\s*$/.exec(raw);
    if (h) {
      flush();
      current = { level: h[1].length, text: h[2].trim() };
      hasLink = false;
      continue;
    }
    if (/\[\[/.test(raw)) hasLink = true;
  }
  flush();
  return concepts;
}

export function findGaps(mocSlug, mocBody, notes, opts = {}) {
  const minForDedicated = Number.isFinite(opts.minForDedicated) ? opts.minForDedicated : MIN_FOR_DEDICATED;
  const refs = extractLinkedSlugs(mocBody);
  const well_covered = [];
  const fragile = [];
  const missing_leaf = [];
  for (const slug of refs) {
    let canonical = null;
    if (notes.has(slug)) canonical = slug;
    else {
      for (const k of notes.keys()) {
        if (k.toLowerCase() === slug) { canonical = k; break; }
      }
    }
    if (!canonical) {
      missing_leaf.push(slug);
      continue;
    }
    const backlinks = countBacklinks(canonical, notes, mocSlug);
    if (backlinks < minForDedicated) {
      fragile.push({ slug: canonical, backlinks });
    } else {
      well_covered.push({ slug: canonical, backlinks });
    }
  }
  const implicit_concepts = findImplicitConcepts(mocBody, notes);
  return {
    moc: mocSlug,
    minForDedicated,
    well_covered,
    fragile,
    missing_leaf,
    implicit_concepts,
    stats: {
      total_refs: refs.length,
      well_covered_count: well_covered.length,
      fragile_count: fragile.length,
      missing_count: missing_leaf.length,
      implicit_count: implicit_concepts.length,
    },
  };
}
