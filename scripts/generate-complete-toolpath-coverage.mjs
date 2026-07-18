#!/usr/bin/env node
// generate-complete-toolpath-coverage.mjs
// Emits ONE wiki MD per catalog entry — 224 total. Each MD has frontmatter
// + fields + buttons. Where YouTube tips exist for the slug, they merge in;
// where they don't, the frontmatter declares coverageStatus="catalog-only"
// (honest gap-flag per kilo soul refuses silent-fallback).
//
// This is what "100% coverage" means in operator's goal: every toolpath has
// a node, with field-by-field UI metadata, even if training data is thin.
//
// Per /goal 2026-05-26 (kilo /loop /yolo): "capable of using every single
// tool path type with all button input for every field that pops up in each
// cam software for each window pertaining to a tool path".
//
// schemaVersion 1.0.0

import fs from 'node:fs';
import path from 'node:path';

const CATALOG_PATH = 'H:/prism-slot-kilo/mcp-server/data/state/cam-toolpath-catalog.json';
const YOUTUBE_DIR = 'H:/prism/state/shared/youtube-extraction';
const PYPDF_PAGES = 'H:/prism-slot-kilo/state/shared/cam-tribal-pages-from-tribal-wiki.jsonl';
const OUT_DIR = 'H:/prism-slot-kilo/knowledge/wiki/architecture/tribal/per-toolpath';

const TIP_CONTEXT_WINDOW_SEC = 30;
const MIN_TIP_CHARS = 80;
const MAX_TIP_CHARS = 1500;
const MAX_TIPS_PER_FILE = 30;

function readCatalog() {
  return JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
}

function readYouTubeArtifacts() {
  if (!fs.existsSync(YOUTUBE_DIR)) return [];
  const out = [];
  for (const f of fs.readdirSync(YOUTUBE_DIR)) {
    if (!f.endsWith('.json')) continue;
    try {
      out.push(JSON.parse(fs.readFileSync(path.join(YOUTUBE_DIR, f), 'utf8')));
    } catch {
      // skip malformed
    }
  }
  return out;
}

function readPdfPages() {
  if (!fs.existsSync(PYPDF_PAGES)) return [];
  const lines = fs.readFileSync(PYPDF_PAGES, 'utf8').split('\n').filter((l) => l.trim());
  const rows = [];
  for (const line of lines) {
    try {
      rows.push(JSON.parse(line));
    } catch {
      // skip malformed
    }
  }
  return rows;
}

// Match a toolpath entry against YouTube transcripts → harvest context windows.
function harvestYouTubeTips(entry, artifacts) {
  // Build regex variants from slug + displayName + category-keyed aliases.
  const variants = [
    entry.slug.replace(/-/g, '[- ]?'),
    entry.displayName.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim().replace(/ /g, '[- ]?'),
  ];
  const re = new RegExp(`\\b(${variants.join('|')})\\b`, 'i');
  const tips = [];
  for (const art of artifacts) {
    const meta = art.video || art.meta || art;
    const segs = (art.transcript?.segments || art.segments || []).map((s) => ({
      start: Number(s.start || 0),
      text: String(s.text || '').replace(/\s+/g, ' ').trim(),
    })).filter((s) => s.text);
    if (segs.length === 0) continue;
    let hits = 0;
    for (let i = 0; i < segs.length && hits < 2; i += 1) {
      if (!re.test(segs[i].text)) continue;
      const center = segs[i].start;
      const ws = Math.max(0, center - TIP_CONTEXT_WINDOW_SEC);
      const we = center + TIP_CONTEXT_WINDOW_SEC;
      const window = segs.filter((s) => s.start >= ws && s.start <= we);
      const text = window.map((s) => s.text).join(' ').slice(0, MAX_TIP_CHARS);
      if (text.length < MIN_TIP_CHARS) continue;
      tips.push({
        source: 'youtube',
        videoId: meta.videoId || meta.id,
        title: meta.title || '',
        uploader: meta.uploader || meta.channel || '',
        url: meta.url || `https://www.youtube.com/watch?v=${meta.videoId || meta.id}`,
        timestampStart: Math.floor(ws),
        timestampHit: Math.floor(center),
        text,
      });
      hits += 1;
    }
  }
  return tips;
}

// Match against pdf-page text (from pypdf TRIBAL+WIKI extraction).
function harvestPdfTips(entry, pdfPages) {
  const variants = [
    entry.slug.replace(/-/g, '[- ]?'),
    entry.displayName.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim().replace(/ /g, '[- ]?'),
  ];
  const re = new RegExp(`\\b(${variants.join('|')})\\b`, 'i');
  const tips = [];
  for (const row of pdfPages) {
    if (!row.text || row.text.length < MIN_TIP_CHARS) continue;
    if (!re.test(row.text)) continue;
    tips.push({
      source: 'pypdf',
      relPath: row.relPath,
      pageNumber: row.pageNumber,
      notabilityScore: row.notabilityScore,
      text: row.text.slice(0, MAX_TIP_CHARS),
    });
    if (tips.length >= 5) break; // cap PDF tips per entry
  }
  return tips;
}

function renderEntryFile(software, entry, ytTips, pdfTips) {
  const coverageStatus =
    ytTips.length > 0 && pdfTips.length > 0 ? 'youtube+pdf' :
    ytTips.length > 0 ? 'youtube-only' :
    pdfTips.length > 0 ? 'pdf-only' :
    'catalog-only-no-tips-yet';

  const lines = [];
  lines.push('---');
  lines.push(`name: tribal-${software.replace('_', '-')}-${entry.slug}`);
  lines.push(`software: ${software}`);
  lines.push(`toolpath: ${entry.slug}`);
  lines.push(`displayName: ${JSON.stringify(entry.displayName)}`);
  lines.push(`category: ${entry.category}`);
  lines.push(`coverageStatus: ${coverageStatus}`);
  lines.push(`ytTipCount: ${ytTips.length}`);
  lines.push(`pdfTipCount: ${pdfTips.length}`);
  lines.push(`generatedAt: ${new Date().toISOString()}`);
  lines.push('---');
  lines.push('');
  lines.push(`# ${software} — ${entry.displayName}`);
  lines.push('');
  lines.push(`**Category:** ${entry.category} · **Slug:** \`${entry.slug}\``);
  lines.push('');

  // Fields section — operator UI surface.
  if (entry.fields && entry.fields.length > 0) {
    lines.push('## Fields (UI dialog inputs)');
    lines.push('');
    for (const field of entry.fields) {
      lines.push(`- **${field}**`);
    }
    lines.push('');
  }

  // Buttons section — operator action surface.
  if (entry.buttons && entry.buttons.length > 0) {
    lines.push('## Buttons (UI actions)');
    lines.push('');
    for (const btn of entry.buttons) {
      lines.push(`- \`${btn}\``);
    }
    lines.push('');
  }

  // Coverage status declaration — honest gap flag per kilo soul.
  lines.push('## Coverage status');
  lines.push('');
  if (coverageStatus === 'catalog-only-no-tips-yet') {
    lines.push(`> **CATALOG-ONLY** — UI fields + buttons enumerated, no YouTube or PDF tribal tips yet. Needs targeted training corpus acquisition (operator-acquired vendor docs in English, or specific YouTube search for this exact toolpath name).`);
  } else {
    lines.push(`Coverage: **${coverageStatus}** · ${ytTips.length} YouTube tips · ${pdfTips.length} PDF tips. Each tip below cites source per kilo soul provenance rule.`);
  }
  lines.push('');

  // YouTube tips
  if (ytTips.length > 0) {
    lines.push('## Tips from YouTube transcripts');
    lines.push('');
    for (const t of ytTips.slice(0, MAX_TIPS_PER_FILE)) {
      const title = (t.title || `Video ${t.videoId}`).replace(/[#*`]/g, '').slice(0, 90);
      lines.push(`### ${title} @${t.timestampHit}s`);
      lines.push('');
      lines.push(`**Source:** [${t.uploader || 'YouTube'}](${t.url}&t=${t.timestampStart}s) · video \`${t.videoId}\``);
      lines.push('');
      lines.push('```');
      lines.push(t.text);
      lines.push('```');
      lines.push('');
    }
  }

  // PDF tips
  if (pdfTips.length > 0) {
    lines.push('## Tips from PDF extraction (pypdf)');
    lines.push('');
    for (const t of pdfTips) {
      lines.push(`### ${t.relPath} — page ${t.pageNumber}`);
      lines.push('');
      lines.push(`**Source:** \`${t.relPath}\` page ${t.pageNumber} · notability ${t.notabilityScore}`);
      lines.push('');
      lines.push('```');
      lines.push(t.text);
      lines.push('```');
      lines.push('');
    }
  }

  return lines.join('\n');
}

function main() {
  const catalog = readCatalog();
  const ytArtifacts = readYouTubeArtifacts();
  const pdfPages = readPdfPages();
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const stats = {
    totalEntries: 0,
    filesWritten: 0,
    byStatus: { 'youtube+pdf': 0, 'youtube-only': 0, 'pdf-only': 0, 'catalog-only-no-tips-yet': 0 },
    bySoftware: {},
  };
  for (const [software, swData] of Object.entries(catalog.softwares)) {
    stats.bySoftware[software] = { total: 0, withTips: 0 };
    for (const entry of swData.toolpaths) {
      stats.totalEntries += 1;
      stats.bySoftware[software].total += 1;
      const ytTips = harvestYouTubeTips(entry, ytArtifacts);
      const pdfTips = harvestPdfTips(entry, pdfPages);
      const status =
        ytTips.length > 0 && pdfTips.length > 0 ? 'youtube+pdf' :
        ytTips.length > 0 ? 'youtube-only' :
        pdfTips.length > 0 ? 'pdf-only' :
        'catalog-only-no-tips-yet';
      stats.byStatus[status] += 1;
      if (status !== 'catalog-only-no-tips-yet') stats.bySoftware[software].withTips += 1;
      const md = renderEntryFile(software, entry, ytTips, pdfTips);
      const fname = `tribal-${software.replace('_', '-')}-${entry.slug}.md`;
      fs.writeFileSync(path.join(OUT_DIR, fname), md);
      stats.filesWritten += 1;
    }
  }
  process.stdout.write(JSON.stringify({ ok: true, ...stats, outDir: OUT_DIR }) + '\n');
}

main();
