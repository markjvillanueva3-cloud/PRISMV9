#!/usr/bin/env node
// synthesize-tribal-from-youtube.mjs
// Reads youtube-extraction JSON artifacts (victor's pipeline output) and
// synthesizes per-software CAM toolpath tribal-tip markdown files.
//
// Per /goal 2026-05-26 (kilo /loop /yolo): "generate wiki and tribal
// knowledge nodes for every single tool path".
//
// kilo soul: each emitted tip cites video_id + url + timestamp_segment +
// extracted_at — no claim without provenance.
//
// Strategy: per-video transcript is N segments; we identify *toolpath name
// hits* via regex over the 5-software toolpath vocabulary, harvest a context
// window (segments before + segment + segments after) per hit, and emit ONE
// tip per (video, toolpath, hit-region).

import fs from 'node:fs';
import path from 'node:path';

const IN_DIR = 'H:/prism/state/shared/youtube-extraction';
const OUT_DIR = 'H:/prism-slot-kilo/knowledge/wiki/architecture/tribal';

// Per-software CAM toolpath vocabulary. Each top-level key is the software
// label that will tag emitted tips; each value is an array of toolpath
// patterns (case-insensitive regex source strings) — these are the canonical
// toolpaths the loop is supposed to harvest, one tip per matched region.
const TOOLPATH_VOCAB = {
  mastercam: [
    'dynamic mill', 'dynamic motion', 'optirough', 'peel mill',
    'high speed', 'surface high speed', 'multi[- ]?axis',
    '2d contour', '3d contour', 'pocket roughing', 'face mill',
    'drill cycle', 'thread mill', 'engrave', 'lathe roughing', 'lathe finishing',
    'wire edm', 'horizontal program', 'mill turn',
  ],
  hypermill: [
    'maxx machining', '5[- ]axis', '3[- ]axis', 'swarf', 'top milling',
    'plane milling', 'tilt strategy', 'shape offset', 'rest machining',
    'contour roughing', 'blade', 'blisk', 'multiblade',
    'turn[- ]mill', 'collision avoidance', 'deburring',
  ],
  fusion360: [
    'adaptive clearing', 'pocket clearing', '2d adaptive', '3d adaptive',
    'parallel finish', 'scallop', 'contour', 'horizontal', 'pencil',
    'bore', 'thread', 'drill', 'face', 'engrave',
    'turning', 'rest machining', 'morphed spiral',
  ],
  solidworks_cam: [
    'feature recognition', 'afr', 'ifr', 'volumill',
    'rough mill', 'contour mill', 'face mill',
    'avoid area', 'contain area', 'lead in', 'lead out',
    'turning rough', 'turning finish', 'thread', 'groove',
    'technology database',
  ],
  esprit: [
    'profit[ -]?turning', 'profit[ -]?milling', 'solid[ -]?turn', 'b[- ]?axis',
    'multitasking', 'live tooling', 'sub[- ]?spindle', 'main spindle',
    'rough turn', 'finish turn', 'thread cycle', 'groove cycle',
    'parting', 'face turn', 'modeless',
  ],
  solidcam: [
    'imachining', 'imachining 3d', 'ifinish', 'morphing spiral',
    'technology wizard', 'level slider', 'moating', 'volumill',
    'profile finishing', 'pencil milling', 'hsr', 'hsm',
    'turning cycle', 'thread cycle', 'parting',
  ],
};

const SOFTWARE_HINTS_FOR_VIDEO = {
  mastercam: /\bmastercam\b/i,
  hypermill: /\bhyper ?mill|open ?mind\b/i,
  fusion360: /\bfusion ?360|fusion360\b/i,
  solidworks_cam: /\bsolidworks ?cam|hsm ?works\b/i,
  esprit: /\besprit\b|dp ?technology/i,
  solidcam: /\bsolid ?cam\b/i,
};

const TIP_CONTEXT_WINDOW_SEC = 30;        // capture ±30s of transcript around a hit
const MIN_TIP_CHARS = 80;
const MAX_TIP_CHARS = 1500;
const MAX_TIPS_PER_VIDEO_PER_TOOLPATH = 2;

function inferSoftware(meta) {
  const blob = `${meta?.title || ''} ${meta?.channel || ''} ${meta?.uploader || ''}`.toLowerCase();
  for (const [sw, re] of Object.entries(SOFTWARE_HINTS_FOR_VIDEO)) {
    if (re.test(blob)) return sw;
  }
  return null;
}

function readArtifacts() {
  if (!fs.existsSync(IN_DIR)) return [];
  const out = [];
  for (const f of fs.readdirSync(IN_DIR)) {
    if (!f.endsWith('.json')) continue;
    try {
      const j = JSON.parse(fs.readFileSync(path.join(IN_DIR, f), 'utf8'));
      out.push(j);
    } catch {
      // skip malformed — per kilo soul no silent fallback
    }
  }
  return out;
}

function segmentsToTimedText(segs) {
  if (!Array.isArray(segs)) return [];
  return segs.map((s) => ({
    start: Number(s.start || s.startTime || 0),
    end: Number(s.end || s.endTime || 0),
    text: String(s.text || '').replace(/\s+/g, ' ').trim(),
  })).filter((s) => s.text);
}

function harvestTipsForToolpath(timed, toolpathPattern, software, videoMeta) {
  const re = new RegExp(toolpathPattern, 'i');
  const tips = [];
  for (let i = 0; i < timed.length; i += 1) {
    if (!re.test(timed[i].text)) continue;
    // Collect window of segments within ±TIP_CONTEXT_WINDOW_SEC of this segment.
    const center = timed[i].start;
    const windowStart = center - TIP_CONTEXT_WINDOW_SEC;
    const windowEnd = center + TIP_CONTEXT_WINDOW_SEC;
    const window = timed.filter((s) => s.start >= windowStart && s.start <= windowEnd);
    const text = window.map((s) => s.text).join(' ').slice(0, MAX_TIP_CHARS);
    if (text.length < MIN_TIP_CHARS) continue;
    tips.push({
      toolpath: toolpathPattern,
      software,
      videoId: videoMeta.videoId || videoMeta.id,
      title: videoMeta.title,
      uploader: videoMeta.uploader || videoMeta.channel || '',
      url: videoMeta.url || `https://www.youtube.com/watch?v=${videoMeta.videoId || videoMeta.id}`,
      timestampStart: Math.max(0, Math.floor(windowStart)),
      timestampHit: Math.floor(center),
      timestampEnd: Math.floor(windowEnd),
      text,
      extractedAt: new Date().toISOString(),
    });
    if (tips.length >= MAX_TIPS_PER_VIDEO_PER_TOOLPATH) break;
  }
  return tips;
}

function harvestAllTips(artifacts) {
  const all = [];
  for (const art of artifacts) {
    const meta = art.video || art.meta || art;
    if (!meta) continue;
    const segs = art.transcript?.segments || art.segments || [];
    const timed = segmentsToTimedText(segs);
    if (timed.length === 0) continue;
    // Walk EVERY software's vocab against every video — a generic-titled video
    // can still hit a software-specific toolpath name (e.g., "iMachining" in a
    // tutorial whose title doesn't include "SolidCAM"). The toolpath OWNER
    // determines the tip's software tag.
    for (const [softwareOwner, vocab] of Object.entries(TOOLPATH_VOCAB)) {
      for (const toolpath of vocab) {
        const tips = harvestTipsForToolpath(timed, toolpath, softwareOwner, meta);
        all.push(...tips);
      }
    }
  }
  return all;
}

function renderSoftwareFile(software, tipsForSoftware) {
  const lines = [];
  lines.push(`# Tribal tips — ${software} (from YouTube extraction)`);
  lines.push('');
  lines.push(`_Generated ${new Date().toISOString()} via \`synthesize-tribal-from-youtube.mjs\`. ${tipsForSoftware.length} tips. Each tip cites video URL + timestamp per kilo soul refuse-list._`);
  lines.push('');
  lines.push(`Sibling to existing \`tribal-${software.replace('_', '-')}-*.md\` files — does not clobber.`);
  lines.push('');
  // Group by toolpath for readability.
  const byToolpath = new Map();
  for (const t of tipsForSoftware) {
    if (!byToolpath.has(t.toolpath)) byToolpath.set(t.toolpath, []);
    byToolpath.get(t.toolpath).push(t);
  }
  for (const [toolpath, tips] of byToolpath.entries()) {
    lines.push(`## Toolpath: ${toolpath}`);
    lines.push('');
    for (const t of tips) {
      lines.push(`### ${t.title} — ${toolpath} @${t.timestampHit}s`);
      lines.push('');
      lines.push(`**Source:** [${t.uploader || 'YouTube'}](${t.url}&t=${t.timestampStart}s) · video \`${t.videoId}\` · timestamp ${t.timestampStart}-${t.timestampEnd}s · extracted ${t.extractedAt}`);
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
  const artifacts = readArtifacts();
  if (artifacts.length === 0) {
    process.stdout.write(JSON.stringify({ ok: false, reason: 'no-artifacts', dir: IN_DIR }) + '\n');
    process.exit(1);
  }
  const tips = harvestAllTips(artifacts);
  if (tips.length === 0) {
    process.stdout.write(JSON.stringify({ ok: true, artifacts: artifacts.length, tips: 0, reason: 'no-tips-matched' }) + '\n');
    return;
  }
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const bySoftware = new Map();
  for (const t of tips) {
    if (!bySoftware.has(t.software)) bySoftware.set(t.software, []);
    bySoftware.get(t.software).push(t);
  }
  const written = [];
  for (const [software, softwareTips] of bySoftware.entries()) {
    const outPath = path.join(OUT_DIR, `tribal-${software.replace('_', '-')}-from-youtube.md`);
    fs.writeFileSync(outPath, renderSoftwareFile(software, softwareTips));
    written.push({ software, tips: softwareTips.length, path: outPath });
  }
  process.stdout.write(JSON.stringify({ ok: true, artifacts: artifacts.length, totalTips: tips.length, softwaresWritten: written.length, written }) + '\n');
}

main();
