/**
 * tribal-auto-categorize.mjs — Stop hook for tribal knowledge auto-categorization
 *
 * Ensures all captured tribal knowledge tips are categorized before session ends.
 * Runs recategorizeAll() on uncategorized tips via direct file manipulation.
 *
 * Hook type: Stop (belt-and-suspenders for engine-level auto-categorization)
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Atomic write — tribal tips JSON is read by multiple engines across sessions.
function atomicWriteSync(filePath, data) {
  const tmpPath = `${filePath}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  try {
    fs.writeFileSync(tmpPath, data);
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    try { fs.unlinkSync(tmpPath); } catch { /* tmp may not exist */ }
    throw err;
  }
}

const TIPS_PATH = path.resolve("H:/prism/mcp-server/state/tribal_captured_tips.json");
const LOG_PATH = path.resolve("H:/prism/mcp-server/state/tribal_auto_categorize.log");

// ── Material patterns (subset from ContentAutoTaggerEngine) ──
const MATERIAL_PATTERNS = [
  { re: /\b(1018|1020|1045|4130|4140|4340|8620|A36)\b/i, iso: "P" },
  { re: /\b(304|316|316L|17-4|410|420|440C|stainless)\b/i, iso: "M" },
  { re: /\b(cast\s+iron|ductile|gray\s+iron)\b/i, iso: "K" },
  { re: /\b(6061|7075|2024|aluminum|aluminium|brass|bronze|copper)\b/i, iso: "N" },
  { re: /\b(inconel|titanium|ti-?6al-?4v|hastelloy)\b/i, iso: "S" },
  { re: /\b(hardened|HRC)\b/i, iso: "H" },
];

// ── Operation patterns ──
const OP_PATTERNS = [
  { re: /\b(face\s*mill|facing)\b/i, op: "face_milling" },
  { re: /\b(pocket|pocketing)\b/i, op: "pocketing" },
  { re: /\b(drill|drilling)\b/i, op: "drilling" },
  { re: /\b(tap|tapping)\b/i, op: "tapping" },
  { re: /\b(thread|threading)\b/i, op: "threading" },
  { re: /\b(turn|turning|lathe)\b/i, op: "turning" },
  { re: /\b(grind|grinding)\b/i, op: "grinding" },
  { re: /\b(mill|milling)\b/i, op: "milling" },
  { re: /\b(bore|boring)\b/i, op: "boring" },
  { re: /\b(EDM|wire\s*EDM|sinker)\b/i, op: "edm" },
  { re: /\b(profile|contour)\b/i, op: "profiling" },
];

// ── Domain inference ──
const CAM_SYSTEMS = ["mastercam", "fusion360", "nx", "solidcam", "hypermill", "catia", "powermill", "esprit", "edgecam"];
const CONTROLLERS = ["fanuc", "siemens", "haas", "okuma", "mazatrol", "heidenhain"];

function inferDomain(tip) {
  const src = (tip.source || "").toLowerCase();
  const tags = (tip.tags || []).map(t => t.toLowerCase());
  if (src.startsWith("video:") || tags.includes("video-learned")) return "video_learned";
  if (src.startsWith("document:") || tags.includes("document-learned")) return "document_learned";
  if (tip.category === "safety") return "safety";
  if (CAM_SYSTEMS.some(c => tags.includes(c) || src.includes(c))) return "cam_software";
  if (CONTROLLERS.some(c => tags.includes(c) || src.includes(c))) return "controller_specific";
  if (tip.category === "quality") return "quality_inspection";
  if (tip.category === "fixturing") return "workholding";
  if (tip.category === "tooling") return "tooling_technology";
  if (src.startsWith("operator:")) return "shop_floor";
  return "general";
}

function categorizeTip(tip) {
  const text = `${tip.title || ""}. ${tip.body || ""}`;
  const extraTags = [];

  // Extract materials
  if (!tip.material_groups || tip.material_groups.length === 0) {
    const groups = new Set();
    for (const { re, iso } of MATERIAL_PATTERNS) {
      if (re.test(text)) { groups.add(iso); extraTags.push(`material:${iso}`); }
    }
    if (groups.size > 0) tip.material_groups = [...groups];
  }

  // Extract operations
  if (!tip.operation_types || tip.operation_types.length === 0) {
    const ops = new Set();
    for (const { re, op } of OP_PATTERNS) {
      if (re.test(text)) { ops.add(op); extraTags.push(`operation:${op}`); }
    }
    if (ops.size > 0) tip.operation_types = [...ops];
  }

  // Infer category if generic
  if (!tip.category || tip.category === "general") {
    if (/rpm|feed|speed|sfm|ipm/i.test(text)) tip.category = "speeds_feeds";
    else if (/thread|tap/i.test(text)) tip.category = "thread";
    else if (/tool|insert|end.?mill|drill/i.test(text)) tip.category = "tooling";
    else if (/vise|chuck|fixture|clamp/i.test(text)) tip.category = "fixturing";
    else if (/finish|Ra|roughness/i.test(text)) tip.category = "surface_finish";
    else if (/safety|danger|injury/i.test(text)) tip.category = "safety";
    else if (/inspect|measure|CMM|tolerance/i.test(text)) tip.category = "quality";
  }

  // Merge tags
  if (extraTags.length > 0) {
    tip.tags = [...new Set([...(tip.tags || []), ...extraTags])];
  }

  // Set domain
  tip.domain = inferDomain(tip);
  tip.auto_categorized = true;
  tip.auto_tags = extraTags;

  return tip;
}

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  try {
    if (!fs.existsSync(TIPS_PATH)) {
      process.stdout.write(JSON.stringify({ continue: true }));
      return;
    }

    const raw = fs.readFileSync(TIPS_PATH, "utf-8");
    const tips = JSON.parse(raw);
    if (!Array.isArray(tips)) {
      process.stdout.write(JSON.stringify({ continue: true }));
      return;
    }

    let recategorized = 0;
    for (let i = 0; i < tips.length; i++) {
      if (!tips[i].auto_categorized) {
        tips[i] = categorizeTip(tips[i]);
        recategorized++;
      }
    }

    if (recategorized > 0) {
      atomicWriteSync(TIPS_PATH, JSON.stringify(tips, null, 2));
      const logLine = `[${new Date().toISOString()}] Stop hook: auto-categorized ${recategorized}/${tips.length} tips\n`;
      fs.appendFileSync(LOG_PATH, logLine);
    }

    const msg = recategorized > 0
      ? `Auto-categorized ${recategorized} tribal knowledge tips on session stop`
      : `All ${tips.length} tribal tips already categorized`;
    process.stdout.write(JSON.stringify({
      continue: true,
      systemMessage: msg,
    }));
  } catch (err) {
    // Fail silently — never block stop on auto-categorize error
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
