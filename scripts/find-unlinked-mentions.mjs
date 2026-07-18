#!/usr/bin/env node
// find-unlinked-mentions.mjs - CLI runner over the memory + wiki vault.
//
// Closes PSN-ENHANCE-MS0/U-PSN-UNLINKED-MENTIONS. Builds the notes-index
// by walking knowledge/memories/{feedback,reference,project,user,patterns,
// mistakes,inbox}/ + knowledge/wiki/, parses frontmatter for `name:` slug +
// `aliases:` list, then runs scripts/lib/unlinked-mentions-scan.mjs to
// find bare references that should be [[wrapped]] links.
//
// Emits state/shared/UNLINKED-MENTIONS.{json,md} (advisory, never auto-fixes).
//
// @milestone PSN-ENHANCE-MS0/U-PSN-UNLINKED-MENTIONS
import { promises as fs } from "node:fs";
import path from "node:path";
import { scanForUnlinkedMentions } from "./lib/unlinked-mentions-scan.mjs";

const REPO = process.env.PRISM_UNLINKED_MENTIONS_REPO || "H:/prism";
const MEM_DIR = path.join(REPO, "knowledge", "memories");
const WIKI_DIR = path.join(REPO, "knowledge", "wiki");
const MEM_SUBDIRS = ["feedback", "reference", "project", "user", "patterns", "mistakes", "inbox"];
const OUT_JSON = path.join(REPO, "state", "shared", "UNLINKED-MENTIONS.json");
const OUT_MD = path.join(REPO, "state", "shared", "UNLINKED-MENTIONS.md");
const MD_HOST_LIMIT = Number(process.env.PRISM_UNLINKED_MENTIONS_LIMIT) || 200;
const MIN_SLUG_LEN = 4;

function parseFrontmatter(src) {
  const m = /^---\s*\n([\s\S]*?)\n---\s*\n/.exec(src);
  if (!m) return { fm: {}, body: src };
  const out = {};
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.replace(/^\s+|\s+$/g, "");
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key === "name") out.name = val.replace(/^["']|["']$/g, "");
    else if (key === "aliases") {
      const arr = /^\[(.*)\]$/.exec(val);
      if (arr) {
        out.aliases = arr[1]
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
      }
    }
  }
  return { fm: out, body: src.slice(m[0].length) };
}

async function walkMarkdown(root, into) {
  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(root, e.name);
    if (e.isDirectory()) {
      await walkMarkdown(full, into);
    } else if (e.isFile() && e.name.endsWith(".md")) {
      into.push(full);
    }
  }
}

function slugFromPath(p) {
  return path.basename(p, ".md");
}

async function buildNotesIndex() {
  const files = [];
  for (const sub of MEM_SUBDIRS) await walkMarkdown(path.join(MEM_DIR, sub), files);
  await walkMarkdown(WIKI_DIR, files);
  const notes = new Map();
  for (const f of files) {
    let raw;
    try {
      raw = await fs.readFile(f, "utf8");
    } catch {
      continue;
    }
    const { fm, body } = parseFrontmatter(raw);
    const slug = (fm.name && fm.name.length >= MIN_SLUG_LEN ? fm.name : slugFromPath(f)).trim();
    if (!slug || slug.length < MIN_SLUG_LEN) continue;
    if (notes.has(slug)) continue;
    notes.set(slug, { path: path.relative(REPO, f).replace(/\\/g, "/"), body, aliases: fm.aliases });
  }
  return notes;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Unlinked Mentions - PSN link-candidate audit");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Source: scripts/find-unlinked-mentions.mjs (PSN-ENHANCE-MS0/U-PSN-UNLINKED-MENTIONS)`);
  lines.push("");
  lines.push("> Advisory only. Every candidate must be human-reviewed before");
  lines.push("> wrapping [[...]] - bare-name matches CAN be coincidental.");
  lines.push("");
  lines.push("## Stats");
  lines.push("");
  lines.push(`- Notes scanned: **${report.stats.notesScanned}**`);
  lines.push(`- Hosts with at-least-one mention: **${report.stats.hostsWithMentions}**`);
  lines.push(`- Total mention occurrences: **${report.stats.totalMentions}**`);
  lines.push(`- Top-N hosts shown below: **${Math.min(MD_HOST_LIMIT, report.stats.hostsWithMentions)}**`);
  lines.push("");
  lines.push("## Candidates (host file -> mentioned slug, count)");
  lines.push("");
  const byHost = new Map();
  for (const c of report.candidates) {
    const arr = byHost.get(c.hostPath) || [];
    arr.push(c);
    byHost.set(c.hostPath, arr);
  }
  const hosts = [...byHost.entries()]
    .map(([p, arr]) => ({ path: p, total: arr.reduce((s, x) => s + x.count, 0), arr }))
    .sort((a, b) => b.total - a.total)
    .slice(0, MD_HOST_LIMIT);
  for (const h of hosts) {
    lines.push(`### ${h.path} (${h.total} mention${h.total === 1 ? "" : "s"})`);
    lines.push("");
    h.arr.sort((a, b) => b.count - a.count);
    for (const c of h.arr) {
      lines.push(`- [[${c.mentionedSlug}]] - \`${c.mentionedName}\` x ${c.count}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

async function main() {
  const t0 = Date.now();
  const notes = await buildNotesIndex();
  if (notes.size === 0) {
    console.error("[find-unlinked-mentions] no notes found under", MEM_DIR, "or", WIKI_DIR);
    process.exit(2);
  }
  const report = scanForUnlinkedMentions(notes, { maxPerNote: 30 });
  const json = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    repo: REPO,
    stats: report.stats,
    candidates: report.candidates,
    durationMs: Date.now() - t0,
  };
  await fs.mkdir(path.dirname(OUT_JSON), { recursive: true });
  await fs.writeFile(OUT_JSON, JSON.stringify(json, null, 2), "utf8");
  await fs.writeFile(OUT_MD, renderMarkdown(report), "utf8");
  console.log(
    `[find-unlinked-mentions] scanned=${report.stats.notesScanned} ` +
    `hosts_with_mentions=${report.stats.hostsWithMentions} ` +
    `mentions=${report.stats.totalMentions} ` +
    `-> ${path.relative(REPO, OUT_JSON)} + ${path.relative(REPO, OUT_MD)} ` +
    `(${Date.now() - t0}ms)`,
  );
}

if (process.argv[1]?.endsWith("find-unlinked-mentions.mjs")) {
  main().catch((e) => {
    console.error("[find-unlinked-mentions] fatal:", e?.stack || e?.message || e);
    process.exit(1);
  });
}
