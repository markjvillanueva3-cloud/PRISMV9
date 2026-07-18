#!/usr/bin/env node
// synthesize-tribal-per-toolpath.mjs
// Reads YouTube extraction JSON artifacts + emits ONE wiki tribal MD file
// per (software, toolpath) tuple — operator goal: "wiki and tribal
// knowledge nodes for every single tool path".
//
// Per kilo soul: each tip carries video_id + url + timestamp_deeplink +
// extracted_at. Per-toolpath files mean downstream search ("how do I do
// Mastercam Dynamic Mill") returns one focused MD instead of a giant
// per-software file with all toolpaths jumbled.
//
// Expanded vocab: ~80 patterns per software covering 2D + 3D + 5-axis +
// lathe + wire EDM + specialized strategies. Previous 14-17 patterns gave
// ~30-50% coverage; this targets 80%+.
//
// schemaVersion 1.0.0

import fs from 'node:fs';
import path from 'node:path';

const IN_DIR = 'H:/prism/state/shared/youtube-extraction';
const OUT_DIR = 'H:/prism-slot-kilo/knowledge/wiki/architecture/tribal/per-toolpath';
const TIP_CONTEXT_WINDOW_SEC = 30;
const MIN_TIP_CHARS = 80;
const MAX_TIP_CHARS = 1500;
const MAX_TIPS_PER_FILE = 30;

// Expanded toolpath vocabulary per software. Each entry: [canonical_slug, regex_source].
// canonical_slug becomes the filename suffix; regex matches against transcript text.
const TOOLPATH_VOCAB = {
  mastercam: [
    // 2D
    ['dynamic-mill', 'dynamic mill|dynamic motion'],
    ['optirough', 'optirough|opti rough'],
    ['opticore', 'opticore|opti core'],
    ['peel-mill', 'peel mill|peel milling'],
    ['accelerated-finishing', 'accelerated finishing|accelerated finish'],
    ['2d-contour', '2d contour'],
    ['2d-pocket', '2d pocket|pocket roughing'],
    ['face-mill', 'face mill|facing'],
    ['drill-cycle', 'drill cycle|drilling'],
    ['thread-mill', 'thread mill|thread milling'],
    ['engrave', 'engrave|engraving'],
    ['blend-mill', 'blend mill'],
    // 3D
    ['surface-high-speed', 'surface high speed|surface hsm'],
    ['parallel-3d', 'parallel.{0,20}(finish|3d)|3d parallel'],
    ['scallop-finish', 'scallop|constant scallop'],
    ['flowline', 'flowline'],
    ['project-curve', 'project curve|project.{0,15}curve'],
    ['equidistant', 'equidistant'],
    ['raster-finish', 'raster'],
    ['hybrid-finish', 'hybrid finish'],
    ['pencil-trace', 'pencil|pencil trace'],
    ['waterline', 'waterline'],
    // Multi-axis
    ['multiaxis-flow', 'multi[- ]?axis flow|swarf'],
    ['multiaxis-curve', 'multi[- ]?axis curve|curve 5[- ]?axis'],
    ['multiaxis-port', 'port machining|port milling'],
    ['multiaxis-deburr', 'deburr|deburring'],
    ['multiaxis-blade', 'blade.{0,20}(mach|cut)|impeller'],
    // Lathe
    ['lathe-rough', 'rough.{0,15}(turn|lathe)|lathe rough|turn.{0,15}rough'],
    ['lathe-finish', 'finish.{0,15}(turn|lathe)|lathe finish|turn.{0,15}finish'],
    ['lathe-groove', 'groove cycle|grooving|groove.{0,15}lathe'],
    ['lathe-thread', 'thread cycle|threading.{0,15}lathe|lathe thread'],
    ['lathe-drill', 'lathe drill|drilling.{0,15}lathe'],
    ['lathe-plunge-turn', 'plunge turn|plunge.{0,15}turn'],
    ['lathe-cutoff', 'cutoff|cut off|cut[- ]?off'],
    ['lathe-bar-feed', 'bar feed|bar feeder'],
    // Wire EDM
    ['wire-edm-2axis', 'wire.{0,15}2[- ]?axis|2[- ]?axis wire'],
    ['wire-edm-4axis', 'wire.{0,15}4[- ]?axis|4[- ]?axis wire|taper wire'],
    ['wire-edm-nocore', 'no[- ]?core|no core'],
    // Mill-Turn
    ['millturn-sync', 'sync.{0,20}spindle|spindle sync|sync.{0,20}cycle'],
    ['millturn-handoff', 'spindle handoff|hand off.{0,15}part'],
  ],

  hypermill: [
    // 3-axis HSC
    ['hsc-roughing', 'hsc rough|roughing.{0,15}hsc|3[- ]?axis rough'],
    ['hsc-rest-roughing', 'rest roughing|rest mill'],
    ['hsc-plane-milling', 'plane milling'],
    ['hsc-surface-finish', 'surface finishing|surface finish'],
    ['hsc-profile', 'profile finish|profile mill'],
    ['hsc-residual-stock', 'residual stock'],
    ['hsc-contour', 'contour rough|contour finish'],
    // MAXX
    ['maxx-roughing', 'maxx.{0,15}rough|maxx machining'],
    ['maxx-trochoidal', 'trochoidal'],
    ['maxx-plunge', 'maxx plunge|plunge mill|plunge milling'],
    ['maxx-tangent', 'tangent plane'],
    // 5-axis
    ['5ax-tilt-strategy', 'tilt strategy|tilt strategies'],
    ['5ax-top-milling', 'top milling'],
    ['5ax-swarf', 'swarf cut|swarf milling'],
    ['5ax-shape-offset', 'shape offset'],
    ['5ax-contour', '5[- ]?axis contour'],
    ['5ax-drill', '5[- ]?axis drill'],
    ['5ax-profile', '5[- ]?axis profile'],
    ['5ax-rest', '5[- ]?axis rest|rest machining 5'],
    // Multiblade
    ['multiblade-blade', 'blade.{0,20}package|blade.{0,20}mill'],
    ['multiblade-blisk', 'blisk|integrally bladed'],
    ['multiblade-rolling-ball', 'rolling ball'],
    // Mill-Turn
    ['millturn-rough-turn', 'mill[- ]?turn rough|turn rough.{0,15}hyper'],
    ['millturn-finish-turn', 'mill[- ]?turn finish'],
    ['millturn-groove', 'mill[- ]?turn groove'],
    // Specials
    ['cam-plan', 'cam plan'],
    ['deburring-strategy', 'deburring strategy|deburr.{0,15}strategy'],
    ['tube-machining', 'tube machining|tube milling|port machining'],
    ['collision-avoidance', 'collision avoidance|collision check'],
    ['automation-macros', 'macro database|macro library|automation center'],
    ['hole-recognition', 'hole recognition|automatic hole'],
    ['workplane-tilt', 'workplane.{0,15}tilt|tilt.{0,15}workplane'],
  ],

  fusion360: [
    // 2D
    ['2d-adaptive', '2d adaptive|2d adaptive clearing'],
    ['2d-contour', '2d contour'],
    ['2d-pocket', '2d pocket|pocket clearing 2d'],
    ['face', 'face\\s+(?:operation|mill|toolpath)'],
    ['drilling', 'drill.{0,15}(cycle|operation|toolpath)'],
    ['bore', 'bore cycle|bore operation'],
    ['slot', 'slot mill|slot operation'],
    ['thread', 'thread mill|thread operation|thread toolpath'],
    ['engrave', 'engrave|engraving'],
    ['trace', 'trace toolpath|trace operation'],
    ['chamfer', 'chamfer mill|chamfer operation'],
    // 3D
    ['3d-adaptive', '3d adaptive|3d adaptive clearing'],
    ['3d-pocket', '3d pocket|pocket clearing 3d'],
    ['parallel', 'parallel finish|parallel toolpath'],
    ['contour-3d', '3d contour|contour finish'],
    ['horizontal', 'horizontal.{0,15}(finish|toolpath)'],
    ['scallop', 'scallop.{0,15}(finish|toolpath)'],
    ['pencil', 'pencil.{0,15}(finish|toolpath)'],
    ['morphed-spiral', 'morphed spiral'],
    ['project', 'project.{0,15}(finish|toolpath)'],
    ['flow', 'flow.{0,15}(finish|toolpath)'],
    ['steep-shallow', 'steep.{0,15}shallow|steep and shallow'],
    ['rest-machining', 'rest machining'],
    // Multi-axis
    ['multi-axis-swarf', 'swarf.{0,15}(finish|toolpath)'],
    ['multi-axis-contour', 'multi[- ]?axis contour'],
    ['multi-axis-flow', 'multi[- ]?axis flow'],
    ['rotary', 'rotary.{0,15}(finish|toolpath)'],
    // Turning
    ['turn-profile-rough', 'turning profile rough|turn rough'],
    ['turn-profile-finish', 'turning profile finish|turn finish'],
    ['turn-groove', 'groove.{0,15}turn|turning groove'],
    ['turn-thread', 'thread.{0,15}turn|turning thread'],
    ['turn-drilling', 'turning drill'],
    ['turn-part-off', 'part off|part-off'],
    ['turn-face', 'face.{0,15}turn|turning face'],
    ['turn-chamfer', 'chamfer.{0,15}turn'],
    ['stock-transfer', 'stock transfer'],
    // Workflow
    ['adaptive-clearing-general', 'adaptive clearing'],
    ['setup-wcs', 'wcs|work coordinate'],
    ['heights-tab', 'heights tab|height.{0,15}tab'],
    ['passes-tab', 'passes tab|optimal load'],
    ['simulate', 'simulate.{0,15}toolpath|simulation.{0,15}toolpath'],
    ['post-process', 'post.{0,15}process|nc code'],
  ],

  solidworks_cam: [
    // Feature recognition
    ['afr', 'automatic feature recognition|afr'],
    ['ifr', 'interactive feature recognition|ifr'],
    ['featureworks', 'featureworks'],
    ['technology-database', 'technology database|tech db'],
    // Mill
    ['rough-mill', 'rough mill|roughing.{0,15}mill'],
    ['contour-mill', 'contour mill'],
    ['face-mill', 'face mill'],
    ['pocket-mill', 'pocket mill'],
    ['volumill', 'volumill'],
    ['slot-mill', 'slot mill'],
    ['engrave', 'engrave|engraving'],
    ['thread-mill', 'thread mill'],
    ['drill', 'drill.{0,15}(operation|cycle)'],
    // Control
    ['avoid-area', 'avoid area'],
    ['contain-area', 'contain area'],
    ['lead-in', 'lead in|leadin'],
    ['lead-out', 'lead out|leadout'],
    ['rest-machining', 'rest machining'],
    // Turn
    ['turn-rough', 'rough.{0,15}turn|turn.{0,15}rough'],
    ['turn-finish', 'finish.{0,15}turn|turn.{0,15}finish'],
    ['turn-groove', 'groove.{0,15}turn'],
    ['turn-thread', 'thread.{0,15}turn'],
    ['turn-drill', 'drill.{0,15}turn'],
    ['turn-cutoff', 'cutoff|cut off'],
    // Multi-axis (3+2 indexing)
    ['three-plus-two', '3\\+2|3 plus 2|three plus two'],
    ['mill-turn', 'mill[- ]?turn'],
    // Workflow
    ['operation-tree', 'operation tree|cam operation tree'],
    ['post-process', 'post.{0,15}process|nc code'],
    ['assembly-mode', 'assembly mode'],
    ['fixture-clipping', 'fixture clipping|toolpath clipping'],
  ],

  esprit: [
    // ProfitTurning
    ['profit-turning', 'profit[ -]?turning'],
    ['profit-milling', 'profit[ -]?milling'],
    ['profit-roughing', 'profit[ -]?rough'],
    // SolidTurn
    ['solidturn-rough', 'solid[ -]?turn.{0,15}rough'],
    ['solidturn-finish', 'solid[ -]?turn.{0,15}finish'],
    ['solidturn-thread', 'solid[ -]?turn.{0,15}thread'],
    ['solidturn-groove', 'solid[ -]?turn.{0,15}groove'],
    ['solidturn-parting', 'parting|cutoff'],
    // Multitasking / B-axis
    ['b-axis', 'b[- ]?axis'],
    ['multitasking', 'multitasking|multi[- ]?tasking'],
    ['live-tooling', 'live tooling'],
    ['sub-spindle', 'sub[- ]?spindle'],
    ['main-spindle', 'main spindle'],
    ['modeless-programming', 'modeless'],
    ['machine-swap', 'machine swap'],
    // Sync modes
    ['sync-sequential', 'sync.{0,15}sequential|sequential.{0,15}mode'],
    ['sync-parallel', 'sync.{0,15}parallel|parallel.{0,15}mode'],
    ['master-channel', 'master channel'],
    // Turning cycles
    ['rough-turn', 'rough turn'],
    ['finish-turn', 'finish turn'],
    ['face-turn', 'face turn'],
    ['contouring-cycle', 'contouring cycle|contour.{0,15}cycle'],
    // Mill
    ['adaptive-roughing', 'adaptive roughing'],
    ['pocketing-cycle', 'pocketing|pocket cycle'],
    ['profiling-cycle', 'profiling|profile cycle'],
    // Wire EDM
    ['wire-edm', 'wire edm'],
  ],

  solidcam: [
    // iMachining
    ['imachining-2d', 'imachining 2d|imachining.{0,15}2d'],
    ['imachining-3d', 'imachining 3d|imachining.{0,15}3d'],
    ['imachining-general', 'imachining'],
    ['ifinish', 'ifinish'],
    ['morphing-spiral', 'morphing spiral'],
    ['technology-wizard', 'technology wizard'],
    ['level-slider', 'level slider|level.{0,15}slider'],
    ['moating', 'moating|moat'],
    // Traditional mill
    ['profile-mill', 'profile mill|profile.{0,15}toolpath'],
    ['pocket-mill', 'pocket mill|pocket toolpath'],
    ['face-mill', 'face mill'],
    ['drill', 'drill.{0,15}(operation|cycle)'],
    ['engrave', 'engrave|engraving'],
    ['thread-mill', 'thread mill'],
    // 3D
    ['hsm-finishing', 'hsm.{0,15}finish'],
    ['hsr-roughing', 'hsr|high speed rough'],
    ['pencil-mill', 'pencil mill'],
    ['rest-mill', 'rest mill|rest machining'],
    // 5-axis
    ['sim-5x', 'sim.{0,15}5|5[- ]?axis sim'],
    ['indexed-5x', 'indexed 5|5\\+0|5 plus 0'],
    // Turning
    ['turning-rough', 'turn.{0,15}rough'],
    ['turning-finish', 'turn.{0,15}finish'],
    ['turning-thread', 'turn.{0,15}thread'],
    ['turning-groove', 'turn.{0,15}groove'],
    ['turning-parting', 'parting|cutoff'],
    // Workflow
    ['view2-diagnostic', 'view 2|view two'],
    ['hsc-cycle-32', 'cycle 32|hsc mode'],
  ],
};

function readArtifacts() {
  if (!fs.existsSync(IN_DIR)) return [];
  const out = [];
  for (const f of fs.readdirSync(IN_DIR)) {
    if (!f.endsWith('.json')) continue;
    try {
      out.push(JSON.parse(fs.readFileSync(path.join(IN_DIR, f), 'utf8')));
    } catch {
      // ignore malformed
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

function harvestForToolpath(timed, regexSource, software, slug, videoMeta, sink) {
  const re = new RegExp(regexSource, 'i');
  let hitsInVideo = 0;
  const MAX_HITS_PER_VIDEO = 2;
  for (let i = 0; i < timed.length && hitsInVideo < MAX_HITS_PER_VIDEO; i += 1) {
    if (!re.test(timed[i].text)) continue;
    const center = timed[i].start;
    const windowStart = Math.max(0, center - TIP_CONTEXT_WINDOW_SEC);
    const windowEnd = center + TIP_CONTEXT_WINDOW_SEC;
    const window = timed.filter((s) => s.start >= windowStart && s.start <= windowEnd);
    const text = window.map((s) => s.text).join(' ').slice(0, MAX_TIP_CHARS);
    if (text.length < MIN_TIP_CHARS) continue;
    const key = `${software}::${slug}`;
    if (!sink.has(key)) sink.set(key, []);
    sink.get(key).push({
      videoId: videoMeta.videoId || videoMeta.id,
      title: videoMeta.title || '',
      uploader: videoMeta.uploader || videoMeta.channel || '',
      url: videoMeta.url || `https://www.youtube.com/watch?v=${videoMeta.videoId || videoMeta.id}`,
      timestampStart: Math.floor(windowStart),
      timestampHit: Math.floor(center),
      text,
      extractedAt: new Date().toISOString(),
    });
    hitsInVideo += 1;
  }
}

function harvestAllTips(artifacts) {
  const sink = new Map();
  for (const art of artifacts) {
    const meta = art.video || art.meta || art;
    if (!meta) continue;
    const segs = art.transcript?.segments || art.segments || [];
    const timed = segmentsToTimedText(segs);
    if (timed.length === 0) continue;
    for (const [software, entries] of Object.entries(TOOLPATH_VOCAB)) {
      for (const [slug, regexSource] of entries) {
        harvestForToolpath(timed, regexSource, software, slug, meta, sink);
      }
    }
  }
  return sink;
}

function renderToolpathFile(software, slug, tips) {
  const lines = [];
  lines.push(`---`);
  lines.push(`name: tribal-${software.replace('_', '-')}-${slug}`);
  lines.push(`description: Per-toolpath tribal — ${software} ${slug}`);
  lines.push(`software: ${software}`);
  lines.push(`toolpath: ${slug}`);
  lines.push(`source: youtube-transcript`);
  lines.push(`tipCount: ${tips.length}`);
  lines.push(`---`);
  lines.push('');
  lines.push(`# ${software} — ${slug}`);
  lines.push('');
  lines.push(`_Per-toolpath tribal MD synthesized from YouTube transcripts. Each tip cites video URL + timestamp deeplink per kilo soul refuse-list._`);
  lines.push('');
  for (const t of tips.slice(0, MAX_TIPS_PER_FILE)) {
    const title = (t.title || `Video ${t.videoId}`).replace(/[#*`]/g, '').slice(0, 90);
    lines.push(`### ${title} @${t.timestampHit}s`);
    lines.push('');
    lines.push(`**Source:** [${t.uploader || 'YouTube'}](${t.url}&t=${t.timestampStart}s) · video \`${t.videoId}\` · ${t.extractedAt}`);
    lines.push('');
    lines.push('```');
    lines.push(t.text);
    lines.push('```');
    lines.push('');
  }
  return lines.join('\n');
}

function main() {
  const artifacts = readArtifacts();
  if (artifacts.length === 0) {
    process.stdout.write(JSON.stringify({ ok: false, reason: 'no-artifacts' }) + '\n');
    process.exit(1);
  }
  const sink = harvestAllTips(artifacts);
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  let filesWritten = 0;
  let totalTips = 0;
  const perSoftware = {};
  for (const [key, tips] of sink.entries()) {
    const [software, slug] = key.split('::');
    if (tips.length === 0) continue;
    const fname = `tribal-${software.replace('_', '-')}-${slug}.md`;
    fs.writeFileSync(path.join(OUT_DIR, fname), renderToolpathFile(software, slug, tips));
    filesWritten += 1;
    totalTips += tips.length;
    perSoftware[software] = (perSoftware[software] || 0) + 1;
  }
  const summary = {
    ok: true,
    artifacts: artifacts.length,
    filesWritten,
    totalTips,
    perSoftwareToolpaths: perSoftware,
    outDir: OUT_DIR,
  };
  process.stdout.write(JSON.stringify(summary) + '\n');
}

main();
