// wikilink-parser.mjs - parse and resolve [[slug]] / [[slug#heading]] / [[slug#^block-id]] / [[slug|alias]]
// @milestone PSN-ENHANCE-MS0/U-PSN-BLOCK-HEADING-LINKS

const MIN_SLUG_LEN = 3;

export function parseOne(contents) {
  if (typeof contents !== "string") return null;
  const trimmed = contents.trim();
  if (trimmed.length === 0) return null;

  let display = null;
  let core = trimmed;
  const pipeIdx = trimmed.indexOf("|");
  if (pipeIdx >= 0) {
    core = trimmed.slice(0, pipeIdx).trim();
    display = trimmed.slice(pipeIdx + 1).trim();
    if (display.length === 0) display = null;
  }

  let slug = core;
  let heading = null;
  let blockId = null;
  const hashIdx = core.indexOf("#");
  if (hashIdx >= 0) {
    slug = core.slice(0, hashIdx).trim();
    const tail = core.slice(hashIdx + 1).trim();
    if (tail.startsWith("^")) blockId = tail.slice(1).trim() || null;
    else heading = tail || null;
  }

  if (slug.length < MIN_SLUG_LEN) return null;
  return { slug, heading, blockId, display, raw: contents };
}

export function parseAll(body) {
  if (typeof body !== "string") return [];
  const out = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const p = parseOne(m[1]);
    if (p) out.push({ ...p, start: m.index, end: m.index + m[0].length });
  }
  return out;
}

export function resolve(parsed, notes) {
  if (!parsed) return { found: false };
  let canonical = null;
  if (notes.has(parsed.slug)) canonical = parsed.slug;
  else {
    for (const k of notes.keys()) {
      if (k.toLowerCase() === parsed.slug.toLowerCase()) { canonical = k; break; }
    }
  }
  if (!canonical) return { found: false, slug: parsed.slug, anchorOk: false };
  const meta = notes.get(canonical);
  const body = (meta && typeof meta.body === "string") ? meta.body : "";

  if (parsed.blockId) {
    const blockRe = new RegExp("\\^" + parsed.blockId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:\\s|$)", "m");
    const anchorFound = blockRe.test(body);
    return { found: true, slug: canonical, anchorOk: anchorFound, anchorFound, anchorMissing: !anchorFound, anchorKind: "block", anchorId: parsed.blockId };
  }

  if (parsed.heading) {
    const escaped = parsed.heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const hRe = new RegExp("^#{1,6}\\s+" + escaped + "\\s*$", "im");
    const anchorFound = hRe.test(body);
    return { found: true, slug: canonical, anchorOk: anchorFound, anchorFound, anchorMissing: !anchorFound, anchorKind: "heading", anchorText: parsed.heading };
  }

  return { found: true, slug: canonical, anchorOk: true };
}

export function auditBody(body, notes) {
  const parsed = parseAll(body);
  const broken_target = [];
  const broken_anchor = [];
  let resolved = 0;
  for (const p of parsed) {
    const r = resolve(p, notes);
    if (!r.found) broken_target.push({ slug: p.slug, raw: p.raw, start: p.start });
    else if (!r.anchorOk) broken_anchor.push({ slug: r.slug, raw: p.raw, anchorKind: r.anchorKind, anchorId: r.anchorId || r.anchorText, start: p.start });
    else resolved++;
  }
  return {
    total: parsed.length,
    resolved,
    broken_target_count: broken_target.length,
    broken_anchor_count: broken_anchor.length,
    broken_target,
    broken_anchor,
  };
}
