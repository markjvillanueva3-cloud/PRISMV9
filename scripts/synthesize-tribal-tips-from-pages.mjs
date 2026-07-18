#!/usr/bin/env node
// synthesize-tribal-tips-from-pages.mjs
// Reads cam-tribal-pages-from-tribal-wiki.jsonl and synthesizes per-software
// tribal-tip markdown files into knowledge/wiki/architecture/tribal/.
//
// Per /goal 2026-05-26 (kilo /loop): "extracting wiki + tribal knowledge for
// cam know how injection within cam domain node".
//
// Output: knowledge/wiki/architecture/tribal/tribal-<software>-from-pdf.md
//   (sibling to existing tribal-<software>-cam-tips.md — does NOT clobber)
//
// Each tip:
//   ### <Title> (notability X.XX)
//   **Source:** [<filename>](file://...) page N · extracted YYYY-MM-DDTHH:MM:SSZ
//
//   <first 1200 chars of page text, normalized>
//
// kilo soul: each tip cites source PDF + page + extraction timestamp; no
// claim without provenance.

import fs from 'node:fs';
import path from 'node:path';

const IN_PATH = 'H:/prism-slot-kilo/state/shared/cam-tribal-pages-from-tribal-wiki.jsonl';
const OUT_DIR = 'H:/prism-slot-kilo/knowledge/wiki/architecture/tribal';
const TIP_PREVIEW_CHARS = 1200;
const MIN_NOTABILITY_FOR_TIP = 0.5;
const MAX_TIPS_PER_SOFTWARE = 50;

function normalize(text) {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{3,}/g, '  ')
    .trim();
}

function deriveTitle(text, pdfTitle, pageNumber) {
  const head = (text || '').split('\n').map((l) => l.trim()).filter(Boolean)[0] || '';
  if (head && head.length >= 6 && head.length <= 90) return head;
  const stripped = (pdfTitle || '').replace(/\.pdf$/i, '');
  return `${stripped} — page ${pageNumber}`;
}

function pdfBasename(relPath) {
  const parts = String(relPath || '').split('/');
  return parts[parts.length - 1] || relPath;
}

function readRows(jsonlPath) {
  if (!fs.existsSync(jsonlPath)) return [];
  const content = fs.readFileSync(jsonlPath, 'utf8');
  const rows = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      rows.push(JSON.parse(trimmed));
    } catch {
      // skip malformed rows — never silent fallback on bad data per kilo soul
    }
  }
  return rows;
}

function groupBySoftware(rows) {
  const groups = new Map();
  for (const r of rows) {
    if (!r || !r.software) continue;
    if (typeof r.notabilityScore !== 'number') continue;
    if (r.notabilityScore < MIN_NOTABILITY_FOR_TIP) continue;
    const k = r.software;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  // sort each group by notability descending, cap.
  for (const [k, arr] of groups.entries()) {
    arr.sort((a, b) => b.notabilityScore - a.notabilityScore);
    if (arr.length > MAX_TIPS_PER_SOFTWARE) {
      groups.set(k, arr.slice(0, MAX_TIPS_PER_SOFTWARE));
    }
  }
  return groups;
}

function renderSoftwareFile(software, rows) {
  const lines = [];
  lines.push(`# Tribal tips — ${software} (from TRIBAL+WIKI pypdf extraction)`);
  lines.push('');
  lines.push(`_Generated ${new Date().toISOString()} via \`synthesize-tribal-tips-from-pages.mjs\`. ${rows.length} tips, notability ≥ ${MIN_NOTABILITY_FOR_TIP}._`);
  lines.push('');
  lines.push(`Sibling to any existing \`tribal-${software}-cam-tips.md\` — does not clobber. Each tip cites source PDF + page + extraction timestamp per kilo soul provenance refuse.`);
  lines.push('');
  for (const r of rows) {
    const title = deriveTitle(r.text, pdfBasename(r.relPath), r.pageNumber);
    const safeTitle = title.replace(/[#*`]/g, '').slice(0, 90);
    lines.push(`### ${safeTitle} (notability ${r.notabilityScore.toFixed(2)})`);
    lines.push('');
    lines.push(`**Source:** \`${r.relPath}\` page ${r.pageNumber} · ${r.textChars} chars · extracted ${r.extractedAt}`);
    lines.push('');
    const preview = normalize(r.text || '').slice(0, TIP_PREVIEW_CHARS);
    lines.push('```');
    lines.push(preview);
    lines.push('```');
    lines.push('');
  }
  return lines.join('\n');
}

function main() {
  const rows = readRows(IN_PATH);
  if (rows.length === 0) {
    process.stdout.write(JSON.stringify({ ok: false, reason: 'no-input-rows', in: IN_PATH }) + '\n');
    process.exit(1);
  }
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const groups = groupBySoftware(rows);
  const written = [];
  for (const [software, softwareRows] of groups.entries()) {
    const outPath = path.join(OUT_DIR, `tribal-${software}-from-pdf.md`);
    fs.writeFileSync(outPath, renderSoftwareFile(software, softwareRows));
    written.push({ software, tips: softwareRows.length, path: outPath });
  }
  process.stdout.write(JSON.stringify({ ok: true, totalRows: rows.length, softwaresWritten: written.length, written }) + '\n');
}

main();
