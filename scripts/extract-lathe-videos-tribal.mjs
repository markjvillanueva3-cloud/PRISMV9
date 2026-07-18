#!/usr/bin/env node
/**
 * extract-lathe-videos-tribal.mjs
 *
 * Reads the JSON artifacts produced by victor's youtube-free-extract.mjs
 * (under state/shared/youtube-extraction/<videoId>.json), runs the same
 * tribal-atom regex stack used by extract-lathe-pdfs-per-page.mjs over the
 * transcript text, and emits:
 *   - One wiki stub per video at knowledge/wiki/lessons/video-extract-<id>.md
 *   - An aggregate tribal-knowledge JSON at
 *     mcp-server/data/ingestion_cache/lathe-videos-tribal-2026-05-26.json
 *
 * Pure-fn `classifyTranscript` export reuses the PDF-page classifier's
 * heuristics — single source of truth for lathe-relevance scoring.
 *
 * USAGE:
 *   node scripts/extract-lathe-videos-tribal.mjs --src H:/prism/state/shared/youtube-extraction
 *   node scripts/extract-lathe-videos-tribal.mjs --src <dir> --pattern "youtube-*"
 *
 * @milestone WHISKEY-ACADEMY-LATHE-BRIDGE-MS0/U-LATHE-VIDEO-TRIBAL-EXTRACT
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { classifyPage } from "./extract-lathe-pdfs-per-page.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

/**
 * Extract lathe-relevant atoms from a YouTube transcript record (the JSON
 * shape that youtube-free-extract.mjs writes). Returns a flat object with
 * the same atom shape as classifyPage so downstream consumers can mix
 * PDF-page records and video records without branching.
 */
export function classifyTranscript(rec) {
  if (!rec || typeof rec !== "object") return null;
  const meta = rec.meta || {};
  // youtube-free-extract.mjs writes transcript as either a string OR an object
  // with shape { full_text, segments: [{ start, end, text }] }. Handle both.
  let text = "";
  let segmentCount = null;
  if (typeof rec.transcript === "string") {
    text = rec.transcript;
  } else if (rec.transcript && typeof rec.transcript === "object") {
    text = rec.transcript.full_text || rec.transcript.text || "";
    segmentCount = Array.isArray(rec.transcript.segments) ? rec.transcript.segments.length : null;
  }
  if (text.length < 100) return null;
  const cls = classifyPage(text);
  return {
    source_type: "youtube-transcript",
    video_id: meta.videoId || meta.id || meta.video_id || null,
    title: meta.title || null,
    duration_sec: meta.duration_sec || meta.duration || null,
    uploader: meta.uploader || meta.channel || null,
    url: meta.url || null,
    char_count: text.length,
    segment_count: segmentCount,
    is_lathe_relevant: cls.is_lathe_page,
    scores: cls.scores,
    atoms: cls.atoms,
    snippet: text.slice(0, 400).replace(/\s+/g, " "),
  };
}

/**
 * Topic taxonomy for lathe content. Body-level classifier scans the
 * transcript text for these phrases (case-insensitive) and assigns a
 * topic when the phrase count exceeds the threshold. A video can carry
 * multiple topics — array, not scalar.
 *
 * Title-only matching (the old behavior) sent 186 of 200 videos to
 * "general-lathe" because most YouTube titles are clickbait, not topical.
 * Body-level matching reads the actual transcript.
 */
const TOPIC_PHRASE_TABLE = [
  // Toolpath cycles
  { topic: "g71-stock-removal-cycle",  phrases: [/\bG\s*71\b/, /stock removal/i, /\broughing cycle\b/i], threshold: 2 },
  { topic: "g70-finishing-cycle",      phrases: [/\bG\s*70\b/, /\bfinishing cycle\b/i],                     threshold: 1 },
  { topic: "g72-facing-cycle",         phrases: [/\bG\s*72\b/, /\bfacing cycle\b/i],                        threshold: 1 },
  { topic: "g73-pattern-cycle",        phrases: [/\bG\s*73\b/, /\bpattern repeat/i, /\bforging\b/i],         threshold: 1 },
  { topic: "g76-single-point-threading", phrases: [/\bG\s*76\b/, /single[- ]point thread/i, /\bthreading cycle\b/i], threshold: 1 },
  { topic: "g75-grooving-cycle",       phrases: [/\bG\s*75\b/, /\bgrooving cycle\b/i, /\bpeck groov/i],     threshold: 1 },
  { topic: "g74-peck-drilling",        phrases: [/\bG\s*74\b/, /\bpeck drill/i],                            threshold: 1 },
  // Modal cutting modes
  { topic: "css-constant-surface-speed", phrases: [/\bG\s*96\b/, /constant surface speed/i, /\bCSS\b/],     threshold: 1 },
  { topic: "rpm-mode-g97",             phrases: [/\bG\s*97\b/, /constant rpm/i],                            threshold: 1 },
  { topic: "g50-spindle-cap",          phrases: [/\bG\s*50\b/, /spindle cap/i, /\brpm limit\b/i],            threshold: 1 },
  // Tooling
  { topic: "insert-selection",         phrases: [/\binsert\b/i, /\bchipbreaker\b/i, /\bgrade\b/i, /\bcoating\b/i], threshold: 4 },
  { topic: "insert-geometry-CWDSTV",   phrases: [/CNMG|WNMG|DNMG|SNMG|TNMG|VBMT|RCM[XT]|TPGN|TPMR|CCMT|CCGT|VCMT|WCMT|DCMT|SCMT/, /\b80[- ]?degree/i, /55[- ]?degree/i, /35[- ]?degree/i, /diamond insert/i, /trigon\b/i, /\brhombic\b/i], threshold: 2 },
  { topic: "boring-bars",              phrases: [/\bboring bar/i, /\binternal turning/i, /\bID turn/i, /\boverhang\b/i], threshold: 2 },
  { topic: "live-tooling",             phrases: [/\blive tool/i, /\bdriven tool/i, /\bC[- ]axis\b/, /milling on the lathe/i], threshold: 1 },
  { topic: "sub-spindle-pickoff",      phrases: [/sub[- ]?spindle/i, /\bpickoff\b/i, /\bbackworking\b/i],   threshold: 1 },
  // Operations
  { topic: "facing",                   phrases: [/\bfacing\b/i, /\bface the part\b/i],                       threshold: 2 },
  { topic: "parting-cutoff",           phrases: [/\bparting\b/i, /\bcut[- ]?off\b/i, /\bblade\b/i],          threshold: 2 },
  { topic: "chamfer-deburr",           phrases: [/\bchamfer\b/i, /\bdeburr/i, /\bbreak edge/i],              threshold: 2 },
  // Setup + workholding
  { topic: "workholding-chucks",       phrases: [/\b3[- ]?jaw\b/i, /\b4[- ]?jaw\b/i, /\bcollet chuck/i, /\bsoft jaw/i, /\bchuck\b/i, /\bworkholding\b/i, /\bjaw\b/i, /\bclamping\b/i, /\bgrip force/i, /\bhard jaw/i], threshold: 2 },
  { topic: "tailstock-centers",        phrases: [/\btailstock\b/i, /\blive center\b/i, /\bdead center\b/i],   threshold: 2 },
  { topic: "tool-offset-setup",        phrases: [/\btool offset/i, /\btool length\b/i, /work offset/i, /\bG54\b/], threshold: 2 },
  // Process knowledge
  { topic: "operation-sequencing",     phrases: [/order of operations/i, /\bsequence of\b/i, /\bsequencing\b/i, /rough.*finish/i], threshold: 2 },
  { topic: "speed-feed",               phrases: [/\bspeed.*feed\b/i, /\bsurface footage\b/i, /\bSFM\b/, /\bIPR\b/, /\bIPM\b/], threshold: 2 },
  { topic: "chip-control",             phrases: [/chip control/i, /\bstringy chip/i, /chip breaker/i, /\bchip evacuat/i], threshold: 1 },
  { topic: "chatter-vibration",        phrases: [/chatter/i, /vibration/i, /\bharmonic\b/i, /\bstability lobe/i], threshold: 2 },
  { topic: "thin-wall-machining",      phrases: [/thin[- ]wall/i, /\bdeflect\b/i, /\bspringback\b/i],         threshold: 2 },
  // Materials
  { topic: "stainless-machining",      phrases: [/stainless/i, /\b30[34]\b/, /\b316\b/, /17[- ]?4 PH/i],     threshold: 2 },
  { topic: "hardened-steel-turning",   phrases: [/\bhard turn/i, /HRC/i, /\bCBN\b/, /\bD2\b/, /\bM2\b/, /\bA2\b/], threshold: 2 },
  { topic: "aluminum-machining",       phrases: [/\baluminum\b/i, /\b6061\b/, /\b7075\b/],                   threshold: 2 },
  // Advanced / secrets
  { topic: "tips-and-tricks",          phrases: [/\btips? and tricks?\b/i, /\bhack\b/i, /\bsecret/i, /\bpro tip\b/i], threshold: 1 },
  { topic: "first-part-discipline",    phrases: [/first part/i, /\bdry run\b/i, /\bsingle block\b/i, /\bsimulate\b/i], threshold: 2 },
  // Controllers
  { topic: "controller-fanuc",         phrases: [/\bFanuc\b/i],                                              threshold: 3 },
  { topic: "controller-haas",          phrases: [/\bHaas\b/i],                                               threshold: 3 },
  { topic: "controller-okuma",         phrases: [/\bOkuma\b/i, /\bOSP\b/],                                   threshold: 2 },
  { topic: "controller-mazak",         phrases: [/\bMazak\b/i, /\bMazatrol\b/i],                             threshold: 2 },
];

/**
 * Body-level topic classifier — scans transcript text against the
 * TOPIC_PHRASE_TABLE and returns ALL topics whose phrase-hit count
 * meets the threshold. A video typically gets 2-5 topics.
 */
export function topicsFromBody(text) {
  if (typeof text !== "string" || text.length < 100) return [];
  const matched = [];
  for (const t of TOPIC_PHRASE_TABLE) {
    let hits = 0;
    for (const re of t.phrases) {
      // Make global for counting; preserve flags + ignore-case
      const flags = (re.flags || "").includes("g") ? re.flags : (re.flags || "") + "g";
      const gre = new RegExp(re.source, flags);
      const allMatches = [...text.matchAll(gre)];
      hits += allMatches.length;
    }
    if (hits >= t.threshold) matched.push(t.topic);
  }
  return matched;
}

const VIDEO_TITLE_TO_TOPIC = [
  { match: /G71|stock removal|roughing cycle/i, topic: "g71-stock-removal-cycle" },
  { match: /G76|threading|single[- ]point thread/i, topic: "g76-single-point-threading" },
  { match: /G70|finishing cycle/i, topic: "g70-finishing-cycle" },
  { match: /order of operations?|sequence/i, topic: "operation-sequencing" },
  { match: /insert/i, topic: "insert-selection" },
  { match: /chuck|workholding|collet/i, topic: "workholding-chucks" },
  { match: /speed|feed/i, topic: "speed-feed" },
  { match: /sub[- ]?spindle/i, topic: "sub-spindle-pickoff" },
  { match: /boring/i, topic: "boring-bars" },
  { match: /parting|cut[- ]?off/i, topic: "parting-cutoff" },
  { match: /tips|tricks|secret|hack/i, topic: "tips-and-tricks" },
];

function topicFor(title) {
  if (!title) return "general-lathe";
  for (const t of VIDEO_TITLE_TO_TOPIC) if (t.match.test(title)) return t.topic;
  return "general-lathe";
}

function slugifyTitle(title) {
  if (!title) return "untitled";
  return String(title).toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildWikiMarkdown(classified) {
  const slug = "video-extract-" + (classified.video_id || slugifyTitle(classified.title));
  const topic = topicFor(classified.title);
  const lines = [
    "---",
    "name: " + slug,
    "description: Lathe video transcript extract (stub) — " + (classified.title || classified.video_id || "untitled"),
    "metadata:",
    "  type: lesson",
    "  domain: lathe",
    "  cross_domain: [milling]",
    "  topic: " + topic,
    "  confidence: 0.4",
    "  needs_curation: true",
    "  source: youtube",
    "  video_id: " + (classified.video_id || "unknown"),
    "  duration_sec: " + (classified.duration_sec || "unknown"),
    "  uploader: " + (classified.uploader || "unknown"),
    "  char_count: " + classified.char_count,
    "  segment_count: " + (classified.segment_count ?? "unknown"),
    "  extractor: extract-lathe-videos-tribal.mjs",
    "---",
    "",
    "# " + (classified.title || "untitled"),
    "",
    "> **YOUTUBE TRANSCRIPT EXTRACT** (confidence 0.4, needs operator curation).",
    "> Source video: https://www.youtube.com/watch?v=" + (classified.video_id || ""),
    "> Pure-text transcript captured by `youtube-free-extract.mjs` (free yt-dlp tier).",
    "",
    "## Extracted lathe atoms",
    "",
    "- **G-codes seen:** " + (classified.atoms.g_codes?.join(", ") || "(none)"),
    "- **M-codes seen:** " + (classified.atoms.m_codes?.join(", ") || "(none)"),
    "- **Insert geometries:** " + (classified.atoms.insert_codes?.join(", ") || "(none)"),
    "- **Vendor grades mentioned:** " + (classified.atoms.vendor_grades?.join(", ") || "(none)"),
    "- **ISO material groups:** " + (classified.atoms.iso_groups?.join(", ") || "(none)"),
    "- **Controllers/CAM systems:** " + (classified.atoms.controllers?.join(", ") || "(none)"),
    "- **Lathe-keyword score:** " + classified.scores.lathe + "  (vs mill-keyword score: " + classified.scores.mill + ")",
    "- **Lathe-relevant:** " + (classified.is_lathe_relevant ? "yes" : "no"),
    "",
    "## Opening snippet",
    "",
    classified.snippet,
    "",
    "## Curation path",
    "",
    "1. Operator watches the video and verifies key sections.",
    "2. Promote tribal tips to dedicated wiki entries under `knowledge/wiki/code-tribal/`.",
    "3. Bump confidence to >=0.7 + set `needs_curation: false` after operator approval.",
  ];
  return lines.join("\n");
}

function parseArgs(argv) {
  const a = { src: null, pattern: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--src") a.src = argv[++i];
    else if (argv[i] === "--pattern") a.pattern = argv[++i];
    else if (argv[i] === "--dry-run") a.dryRun = true;
  }
  return a;
}

function main() {
  const args = parseArgs(process.argv);
  const srcDir = args.src || path.resolve(repoRoot, "..", "prism", "state", "shared", "youtube-extraction");
  if (!fs.existsSync(srcDir)) {
    process.stderr.write("source dir not found: " + srcDir + "\n");
    process.exit(2);
  }
  const files = fs.readdirSync(srcDir).filter(f => f.endsWith(".json"));
  if (files.length === 0) {
    process.stderr.write("no .json artifacts in " + srcDir + "\n");
    process.exit(2);
  }

  const wikiOutDir = path.resolve(repoRoot, "knowledge/wiki/lessons");
  fs.mkdirSync(wikiOutDir, { recursive: true });

  const aggregate = {
    schemaVersion: "1.0.0",
    generated_at: new Date().toISOString(),
    source: "youtube-free-extract.mjs transcripts (yt-dlp free tier)",
    domain: "lathe",
    cross_domain: ["milling"],
    confidence: 0.4,
    needs_curation: true,
    video_count: 0,
    lathe_relevant_count: 0,
    aggregate_atoms: {
      g_codes: new Map(),
      m_codes: new Map(),
      insert_codes: new Map(),
      vendor_grades: new Map(),
      iso_groups: new Map(),
      controllers: new Map(),
    },
    videos: [],
  };

  for (const f of files) {
    const p = path.join(srcDir, f);
    let rec;
    try { rec = JSON.parse(fs.readFileSync(p, "utf8")); } catch { continue; }
    const cls = classifyTranscript(rec);
    if (!cls) continue;
    aggregate.video_count++;
    if (cls.is_lathe_relevant) aggregate.lathe_relevant_count++;

    for (const [k, tally] of Object.entries(aggregate.aggregate_atoms)) {
      for (const atom of cls.atoms[k] || []) {
        tally.set(atom, (tally.get(atom) || 0) + 1);
      }
    }

    // Body-level topic classification — re-load transcript to pass full text
    let bodyTopics = [];
    try {
      const rawRec = JSON.parse(fs.readFileSync(p, "utf8"));
      const bodyText = typeof rawRec.transcript === "string"
        ? rawRec.transcript
        : (rawRec.transcript?.full_text || rawRec.transcript?.text || "");
      bodyTopics = topicsFromBody(bodyText);
    } catch { /* keep bodyTopics empty on parse error */ }

    aggregate.videos.push({
      video_id: cls.video_id,
      title: cls.title,
      title_topic: topicFor(cls.title),
      body_topics: bodyTopics,
      duration_sec: cls.duration_sec,
      uploader: cls.uploader,
      char_count: cls.char_count,
      segment_count: cls.segment_count,
      is_lathe_relevant: cls.is_lathe_relevant,
      scores: cls.scores,
      atoms: cls.atoms,
      url: "https://www.youtube.com/watch?v=" + (cls.video_id || ""),
    });

    if (!args.dryRun) {
      const wikiPath = path.join(wikiOutDir, "video-extract-" + (cls.video_id || slugifyTitle(cls.title)) + ".md");
      fs.writeFileSync(wikiPath, buildWikiMarkdown(cls), "utf8");
    }
  }

  // Convert Map atoms → plain objects sorted by frequency
  const serializableAtoms = {};
  for (const [k, tally] of Object.entries(aggregate.aggregate_atoms)) {
    serializableAtoms[k] = [...tally.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([atom, count]) => ({ atom, count }));
  }
  aggregate.aggregate_atoms = serializableAtoms;

  // Build topic → video-list index — answers "which videos cover this toolpath/topic"
  const topicIndex = {};
  for (const v of aggregate.videos) {
    for (const topic of v.body_topics || []) {
      if (!topicIndex[topic]) topicIndex[topic] = [];
      topicIndex[topic].push({ video_id: v.video_id, title: v.title, char_count: v.char_count, url: v.url });
    }
  }
  // Sort each topic's videos by char_count desc (richer transcripts first) + cap at 20 per topic
  for (const topic of Object.keys(topicIndex)) {
    topicIndex[topic] = topicIndex[topic].sort((a, b) => (b.char_count || 0) - (a.char_count || 0)).slice(0, 20);
  }
  aggregate.topic_index = topicIndex;
  aggregate.topic_coverage = Object.fromEntries(
    Object.entries(topicIndex).map(([t, list]) => [t, list.length]).sort((a, b) => b[1] - a[1])
  );

  const outPath = path.resolve(repoRoot, "mcp-server/data/ingestion_cache/lathe-videos-tribal-2026-05-26.json");
  if (!args.dryRun) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(aggregate, null, 2) + "\n");
  }

  process.stdout.write(JSON.stringify({
    ok: true,
    videos_processed: aggregate.video_count,
    lathe_relevant: aggregate.lathe_relevant_count,
    aggregate_out: outPath,
    wiki_out_dir: wikiOutDir,
    top_g_codes: serializableAtoms.g_codes.slice(0, 10),
    top_insert_codes: serializableAtoms.insert_codes.slice(0, 10),
    top_vendor_grades: serializableAtoms.vendor_grades.slice(0, 10),
  }, null, 2) + "\n");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
