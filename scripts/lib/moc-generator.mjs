// moc-generator.mjs - generate a Map-of-Content markdown body from a slug list.
// @milestone PSN-ENHANCE-MS0/U-PSN-MOC-LAYER

// Build a MOC body from grouped slug entries.
//   title:        the MOC heading title
//   description:  optional 1-paragraph intro
//   sections:     [{ heading, slugs: [{slug, blurb?}] }, ...]
// Returns the markdown body string.
export function buildMocBody({ title, description, sections }) {
  if (typeof title !== "string" || title.length === 0) {
    throw new Error("moc-generator: title required");
  }
  const lines = [];
  lines.push(`# ${title}`);
  lines.push("");
  if (description) {
    lines.push(description);
    lines.push("");
  }
  if (Array.isArray(sections)) {
    for (const sec of sections) {
      if (!sec || typeof sec.heading !== "string" || !Array.isArray(sec.slugs)) continue;
      lines.push(`## ${sec.heading}`);
      lines.push("");
      for (const item of sec.slugs) {
        const slug = (item && typeof item.slug === "string") ? item.slug : null;
        if (!slug || slug.length < 3) continue;
        const blurb = item.blurb ? ` — ${item.blurb}` : "";
        lines.push(`- [[${slug}]]${blurb}`);
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}

// Build YAML frontmatter for an MOC note.
export function buildMocFrontmatter({ name, description, aliases, type = "moc", source }) {
  const lines = ["---"];
  if (name) lines.push(`name: ${name}`);
  if (description) lines.push(`description: ${description}`);
  if (Array.isArray(aliases) && aliases.length > 0) {
    lines.push(`aliases: [${aliases.join(", ")}]`);
  }
  lines.push(`type: ${type}`);
  if (source) lines.push(`source: ${source}`);
  lines.push(`generated_at: ${new Date().toISOString()}`);
  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

// Group slugs by frontmatter `metadata.domain` or `metadata.type` field.
// Returns { groupName -> [{slug, blurb?}] }.
export function groupSlugsByMeta(slugs, notes, metaKey = "domain") {
  const groups = new Map();
  for (const slug of slugs) {
    const meta = notes.get(slug);
    let groupName = "ungrouped";
    if (meta && meta.frontmatter) {
      const md = meta.frontmatter.metadata || meta.frontmatter;
      if (md && md[metaKey]) groupName = String(md[metaKey]);
    }
    const arr = groups.get(groupName) || [];
    arr.push({ slug, blurb: meta?.frontmatter?.description?.slice(0, 80) || null });
    groups.set(groupName, arr);
  }
  return groups;
}

// Convenience: assemble a complete MOC file (frontmatter + body) from a spec.
export function generateMoc({ name, title, description, aliases, sections, source }) {
  const fm = buildMocFrontmatter({ name, description, aliases, source });
  const body = buildMocBody({ title, description, sections });
  return fm + body;
}
