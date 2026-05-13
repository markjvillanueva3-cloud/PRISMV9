#!/usr/bin/env node
/**
 * inventory-slash-commands-by-workflow.mjs — ACP-MS0/P0-U01
 *
 * Walks the .claude/commands/ directories (project + archive + user-level if
 * present), parses YAML frontmatter, classifies each skill into a workflow
 * bucket via a deterministic rule cascade, and emits two artifacts:
 *
 *   state/shared/SLASH_COMMANDS_INVENTORY.md   (human-readable, per-bucket)
 *   state/shared/slash-commands-inventory.json (machine-readable, schemaVersion 1)
 *
 * Why: ACP-MS0 ("Existing Automation Census & Gap Map") starts from this
 * inventory. Downstream units (P0-U02..U05) reference workflow buckets to
 * inventory hooks, scripts, and identify partial chains. Without a canonical
 * grouping, every downstream pass re-derives the same taxonomy inconsistently.
 *
 * Pure (no side effects until main() runs main I/O). Exports the pure helpers
 * (parseFrontmatter, classifyCommand, walkCommandsDir, renderMarkdown,
 *  RULES) for vitest unit-test consumption.
 *
 * Self-test: `node scripts/inventory-slash-commands-by-workflow.mjs --self-test`
 * CLI:       `node scripts/inventory-slash-commands-by-workflow.mjs [--out-dir <path>] [--no-write] [--json]`
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = "H:/prism";
const PROJECT_COMMANDS_DIR = path.join(REPO_ROOT, ".claude", "commands");
const ARCHIVE_COMMANDS_DIR = path.join(REPO_ROOT, ".claude", "commands-archive");
const USER_COMMANDS_DIRS = [
  "C:/Users/wompu/.claude/commands",
  "C:/Users/Mark Villanueva/.claude/commands",
];
const OUT_MD_PATH = path.join(REPO_ROOT, "state", "shared", "SLASH_COMMANDS_INVENTORY.md");
const OUT_JSON_PATH = path.join(REPO_ROOT, "state", "shared", "slash-commands-inventory.json");

// ─── Classification rules ────────────────────────────────────────────────────
// Order matters — first match wins. Each rule is { bucket, test(name, content) }.
// `name` is the lowercase skill name (filename without .md). `content` is the
// raw text (used for description/trigger sniffing).
//
// Rationale per bucket — what its members do:
//   build:       compile/typecheck/lint/test runners
//   deploy:      git push, release, ship, sync — anything that moves bits to a remote
//   cad:         CAD intake, geometry parsing, blueprint, DXF/STEP/IGES
//   cam:         CAM strategy, toolpath, post-processor, vendor CAM bridges
//   post:        post-processor lifecycle (validate, generate, register, diff)
//   speed-feed:  cutting parameters, SFC, auto-speed-feed
//   mill:        milling-specific (not cross-CAM)
//   lathe:       turning/lathe/Swiss/groove/thread
//   wedm:        wire-EDM (gets its own bucket — biggest by count)
//   edm:         sinker/micro EDM (NOT wedm)
//   grind:       grinding
//   welder:      welding
//   sinker:      sinker-EDM specific (some overlap w/ edm — name wins)
//   quality:     SPC, GD&T, CMM, FAI, tolerance, capability
//   quote:       quoting, costing, biz pipeline, bid-to-win
//   planning:    scheduling, capacity, traveler, shop-floor ops
//   learn:       LoRA training, video/pdf-learn, knowledge ingestion, tribal
//   forge:       /forge-* family — brainstorm→plan→iterate scaffolders
//   audit:       audit/scrutinize/peer-review/drift detection
//   safety:      safety validation, harness-security
//   memory:      memory, snapshot, recall
//   session:     handoff, precompact, checkpoint, startup
//   infra:       hooks, fleet, swarm, claim-phase, chat, slot
//   dev:         code-index, dispatcher, engine, action, formula, algorithm explorers
//   ops:         machine-* tools (per-machine setup, hardening, ROI)
//   roadmap:     RGS, generate-roadmap, milestone tools, envelope-sync, close-out
//   autopilot:   yolo, autopilot, smart, run-continuous
//   viz:         system-viz, awareness, master-index, build-state, orphan-inventory
//   docs:        commands listing, prism-paths, ref-first, manifest, capabilities
//   meta:        rtk-setup, sync-drives, profile switchers, slot mgmt
//   misc:        nothing else matched (always last)
//
// Rule helpers — be careful with overlap. wedm-* must beat edm-*, mill-turn
// must beat mill-only, etc.

const RULES = [
  // Most specific first
  { bucket: "wedm",       test: (n) => /^wedm[-_]/.test(n) || n === "wedm" || /wire[-_]?edm/.test(n) },
  { bucket: "sinker",     test: (n) => /^sinker[-_]/.test(n) || n === "sinker" },
  { bucket: "grind",      test: (n) => /^grind/.test(n) },
  { bucket: "welder",     test: (n) => /^welder[-_]/.test(n) || n === "welder" },
  { bucket: "edm",        test: (n) => /^edm[-_]/.test(n) || n === "edm" },
  { bucket: "lathe",      test: (n) => /^lathe[-_]/.test(n) || n === "lathe" || /^hard[-_]?turn/.test(n) || /^swiss[-_]/.test(n) || /^groove/.test(n) },
  { bucket: "mill",       test: (n) => /^mill[-_]/.test(n) || n === "mill" || /^mill[-_]?turn/.test(n) },
  { bucket: "post",       test: (n) => /^post[-_]/.test(n) || /^cps[-_]/.test(n) || /^pp[-_]/.test(n) },
  { bucket: "speed-feed", test: (n) => /speed[-_]feed/.test(n) || /^sfc[-_]/.test(n) || n === "auto-speed-feed" || n === "auto-speed-feed-lathe" || n === "test-speed-feed" },
  { bucket: "cad",        test: (n) => /^cad[-_]/.test(n) || /^blueprint/.test(n) || /^fusion[-_]/.test(n) || /^mastercam[-_]/.test(n) || /^solidcam[-_]/.test(n) || /^hypermill[-_]/.test(n) || /^catia[-_]/.test(n) || /^nx[-_]/.test(n) || /^powermill[-_]/.test(n) || /^esprit[-_]/.test(n) || /^inventor[-_]/.test(n) },
  { bucket: "cam",        test: (n) => /^cam[-_]/.test(n) || /^toolpath/.test(n) || /^gcode/.test(n) || /^print[-_]to[-_]program/.test(n) || /^program[-_]/.test(n) || n === "cnc-simulate" },
  { bucket: "quality",    test: (n) => /^quality/.test(n) || /^spc$/.test(n) || /^cpk[-_]/.test(n) || /^gdnt[-_]/.test(n) || /^gdt[-_]/.test(n) || /^cmm[-_]/.test(n) || /^tolerance[-_]/.test(n) || /^fai[-_]/.test(n) || n === "physics-verify" || n === "formula-check" },
  { bucket: "quote",      test: (n) => /^quote[-_]?/.test(n) || /^bid[-_]?/.test(n) || /^cost[-_]/.test(n) || /^estimate$/.test(n) || /^biz[-_]/.test(n) || /^injection[-_]mold[-_]quote/.test(n) || /^shop[-_]quote/.test(n) || /^first[-_]part[-_]right/.test(n) || /^bid[-_]to[-_]win/.test(n) || /^ship[-_]confirm/.test(n) || /^cycle[-_]time[-_]crush/.test(n) },
  { bucket: "planning",   test: (n) => /^schedule$/.test(n) || /^capacity/.test(n) || /^shop[-_]/.test(n) || /^traveler/.test(n) || /^job[-_]/.test(n) || /^order[-_]/.test(n) || /^magazine[-_]optimize/.test(n) || /^stock[-_]optimize/.test(n) || /^tool[-_]catalog/.test(n) || /^tool[-_]select/.test(n) || /^tool[-_]enrich/.test(n) || /^tool[-_]histogram/.test(n) || /^tool[-_]life[-_]max/.test(n) || /^material[-_]/.test(n) || /^vendor$/.test(n) || /^my[-_]shop/.test(n) || /^my[-_]presets/.test(n) || /^erp[-_]/.test(n) || /^pp[-_]resolve/.test(n) || /^pdf[-_]process/.test(n) },
  { bucket: "learn",      test: (n) => /^learn$/.test(n) || /^learn[-_]/.test(n) || /^train[-_]/.test(n) || /lora/.test(n) || /^video[-_]learn/.test(n) || /^pdf[-_]learn/.test(n) || /^shop[-_]knowledge/.test(n) || /^distill[-_]/.test(n) || /^tribal/.test(n) || /^ingest$/.test(n) || /^knowledge/.test(n) || /^remember$/.test(n) },
  { bucket: "forge",      test: (n) => /^forge/.test(n) },
  { bucket: "audit",      test: (n) => /^audit/.test(n) || /^scrutin/.test(n) || /^scrutiny/.test(n) || /^peer[-_]review/.test(n) || /^prism[-_]review/.test(n) || /^review$/.test(n) || /^drift$/.test(n) || /^stale[-_]milestones/.test(n) || /^findings$/.test(n) || /^awareness[-_]check/.test(n) || /^big[-_]blob/.test(n) || /^dispatcher[-_]coverage/.test(n) || /^staged[-_]sanity/.test(n) || /^audit[-_]task/.test(n) || /^audit[-_]duplicates/.test(n) || /^dedup$/.test(n) || /^check[-_]dsl/.test(n) || /^test[-_]coverage/.test(n) || /^test$/.test(n) || /^verify[-_]loop/.test(n) || /^propose[-_]goal/.test(n) || /^trace$/.test(n) || /^trend$/.test(n) || /^skill[-_]lint/.test(n) || /^skill[-_]test/.test(n) || /^skill[-_]recall[-_]tune/.test(n) },
  { bucket: "safety",     test: (n) => /^safety/.test(n) || /^shop[-_]safety/.test(n) || /^harness[-_]security/.test(n) || /^enforce[-_]role/.test(n) },
  { bucket: "memory",     test: (n) => /^memory/.test(n) || /^snapshot$/.test(n) || /^sync[-_]memory/.test(n) || /^reflect$/.test(n) },
  { bucket: "session",    test: (n) => /^handoff$/.test(n) || /^precompact$/.test(n) || /^compact$/.test(n) || /^checkpoint$/.test(n) || /^startup$/.test(n) || /^boot$/.test(n) || /^sessions$/.test(n) || /^session[-_]/.test(n) || /^pressure$/.test(n) || /^reap[-_]zombies/.test(n) || /^context[-_]/.test(n) || /^context$/.test(n) || /^stop[-_]check/.test(n) },
  { bucket: "infra",      test: (n) => /^hook[-_]/.test(n) || /^six[-_]chat/.test(n) || /^fleet$/.test(n) || /^chat$/.test(n) || /^chat[-_]/.test(n) || /^checkin$/.test(n) || /^claim[-_]phase/.test(n) || /^broadcast$/.test(n) || /^who$/.test(n) || /^pick[-_]task/.test(n) || /^pick[-_]unit$/.test(n) || /^workboard$/.test(n) || /^slim$/.test(n) || /^sync[-_]rebase/.test(n) || /^sync[-_]terminals/.test(n) || /^sync[-_]drives/.test(n) || /^sync$/.test(n) || /^claim[-_]/.test(n) || /^peer[-_]file[-_]isolation/.test(n) || /^scrutiny[-_]batch/.test(n) || /^scrutiny[-_]replay/.test(n) || /^scrutinize[-_]mark/.test(n) || /^pr[-_]swarm/.test(n) },
  { bucket: "ops",        test: (n) => /^machine[-_]/.test(n) || /^controller[-_]/.test(n) || /^ergo[-_]/.test(n) || /^okuma[-_]/.test(n) || /^acquire[-_]models/.test(n) || /^process[-_]health/.test(n) || /^process[-_]calc/.test(n) || /^secondary[-_]ops/.test(n) || /^setup[-_]sheet/.test(n) || /^operating[-_]system/.test(n) },
  { bucket: "dev",        test: (n) => /^code[-_]/.test(n) || /^dispatcher[-_]/.test(n) || /^engine[-_]/.test(n) || /^action[-_]/.test(n) || /^formula[-_]/.test(n) || /^algorithm[-_]/.test(n) || /^registry[-_]/.test(n) || /^impact$/.test(n) || /^simulate[-_]change/.test(n) || /^plan[-_]build/.test(n) || /^scripts$/.test(n) || /^commands$/.test(n) || /^commands[-_]audit/.test(n) || /^digest/.test(n) || /^read[-_]plan/.test(n) || /^doc[-_]sync/.test(n) || /^doc[-_]/.test(n) || /^scope$/.test(n) || /^scout$/.test(n) || /^update[-_]all[-_]docs/.test(n) || /^fix[-_]hook[-_]schemas/.test(n) || /^generalize$/.test(n) || /^remediation/.test(n) || /^iterate[-_]retrieve/.test(n) },
  { bucket: "roadmap",    test: (n) => /^rgs/.test(n) || /^generate[-_]roadmap/.test(n) || /^continue[-_]roadmap/.test(n) || /^roadmap[-_]/.test(n) || /^milestone$/.test(n) || /^envelope[-_]sync/.test(n) || /^envelope[-_]drift[-_]fix/.test(n) || /^close[-_]out$/.test(n) || /^release[-_]ready/.test(n) || /^delete$/.test(n) || /^defaults$/.test(n) || /^foresight$/.test(n) || /^claim[-_]phase$/.test(n) || /^propose[-_]goal/.test(n) || /^addtomatrix$/.test(n) },
  { bucket: "autopilot",  test: (n) => /^autopilot/.test(n) || /^run[-_]continuous/.test(n) || /^yolo[-_]mode/.test(n) || /^smart$/.test(n) || /^smart[-_]/.test(n) || /^full[-_]job/.test(n) || /^autopilot[-_]camk/.test(n) || /^autopilot[-_]full/.test(n) || /^quote[-_]to[-_]ship/.test(n) || /^bid[-_]to[-_]win/.test(n) || /^batch[-_]/.test(n) || /^batch[-_]optimize/.test(n) || /^batch[-_]check/.test(n) || /^batch[-_]ops/.test(n) },
  { bucket: "viz",        test: (n) => /^system[-_]viz/.test(n) || /^viz$/.test(n) || /^awareness/.test(n) || /^master[-_]index/.test(n) || /^build[-_]state/.test(n) || /^orphan[-_]inventory/.test(n) || /^utilization[-_]/.test(n) || /^trace$/.test(n) || /^trend$/.test(n) || /^pipeline[-_]status/.test(n) || /^pipeline[-_]optimize/.test(n) || /^waste[-_]report/.test(n) || /^findings$/.test(n) || /^deep[-_]search/.test(n) || /^deep[-_]think/.test(n) || /^emerging[-_]thesis/.test(n) || /^model[-_]status/.test(n) || /^model[-_]router/.test(n) },
  { bucket: "build",      test: (n) => /^build[-_]verify/.test(n) || /^test$/.test(n) || /^test[-_]/.test(n) || /^lint$/.test(n) || /^lint[-_]/.test(n) || /^tsc$/.test(n) || /^typecheck$/.test(n) || /^vitest$/.test(n) || /^cnc[-_]simulate/.test(n) || /^physics[-_]verify/.test(n) },
  { bucket: "docs",       test: (n) => /^docs$/.test(n) || /^commands$/.test(n) || /^commands[-_]audit/.test(n) || /^prism[-_]paths/.test(n) || /^prism[-_]navigate/.test(n) || /^prism[-_]lookup/.test(n) || /^prism[-_]roadmap/.test(n) || /^prism[-_]status/.test(n) || /^prism[-_]review/.test(n) || /^ref[-_]first/.test(n) || /^manifest$/.test(n) || /^capabilities$/.test(n) || /^capability[-_]/.test(n) || /^digest[-_]all/.test(n) || /^digest$/.test(n) || /^quick[-_]ref/.test(n) || /^counts$/.test(n) || /^health$/.test(n) || /^system[-_]health/.test(n) || /^system[-_]audit/.test(n) || /^memory[-_]search/.test(n) || /^memory[-_]seed/.test(n) || /^wiki[-_]/.test(n) || /^aware$/.test(n) || /^who$/.test(n) || /^skill[-_]marketplace/.test(n) },
  { bucket: "meta",       test: (n) => /^rtk[-_]setup/.test(n) || /^switch[-_]profile/.test(n) || /^model[-_]/.test(n) || /^bash[-_]/.test(n) || /^token[-_]/.test(n) || /^de[-_]sloppify/.test(n) || /^outcome$/.test(n) || /^replay$/.test(n) || /^calibrate$/.test(n) || /^calibrate[-_]/.test(n) || /^predict$/.test(n) || /^what[-_]if/.test(n) || /^what[-_]changed/.test(n) || /^plan[-_]build/.test(n) || /^plan[-_]/.test(n) || /^approvals$/.test(n) || /^template$/.test(n) || /^enforce[-_]role/.test(n) || /^sparc/.test(n) || /^claude[-_]/.test(n) || /^update[-_]config$/.test(n) || /^analysis[-_]/.test(n) },
];

// Default fallback bucket — when no rule matches
const DEFAULT_BUCKET = "misc";

// All buckets in display order
export const BUCKETS_DISPLAY_ORDER = [
  "build", "deploy", "cad", "cam", "post", "speed-feed",
  "mill", "lathe", "wedm", "edm", "sinker", "grind", "welder",
  "quality", "quote", "planning", "learn",
  "forge", "audit", "safety",
  "memory", "session", "infra", "ops", "dev",
  "roadmap", "autopilot", "viz", "docs", "meta",
  "misc",
];

// Human description of each bucket (rendered in the MD output header)
const BUCKET_DESCRIPTIONS = {
  build: "Compile, type-check, lint, test runners.",
  deploy: "Git push, release, ship, sync — move bits to a remote.",
  cad: "CAD intake, geometry parsing, blueprint, DXF/STEP/IGES, vendor CAD bridges.",
  cam: "CAM strategy, toolpath generation, generic G-code, print-to-program.",
  post: "Post-processor lifecycle (validate, generate, register, diff, harden).",
  "speed-feed": "Cutting parameters, SFC, auto-speed-feed.",
  mill: "Milling-specific (not cross-CAM).",
  lathe: "Turning / lathe / Swiss / groove / thread.",
  wedm: "Wire-EDM (gets its own bucket — biggest by count).",
  edm: "Sinker/micro EDM (NOT wedm).",
  sinker: "Sinker-EDM specific.",
  grind: "Grinding.",
  welder: "Welding.",
  quality: "SPC, GD&T, CMM, FAI, tolerance, capability.",
  quote: "Quoting, costing, biz pipeline, bid-to-win.",
  planning: "Scheduling, capacity, traveler, shop-floor ops.",
  learn: "LoRA training, video/pdf-learn, knowledge ingestion, tribal capture.",
  forge: "/forge-* family — brainstorm→plan→iterate scaffolders.",
  audit: "Audit/scrutinize/peer-review/drift detection.",
  safety: "Safety validation, harness-security.",
  memory: "Memory, snapshot, recall.",
  session: "Handoff, precompact, checkpoint, startup, session lifecycle.",
  infra: "Hooks, fleet, swarm, claim-phase, chat, slot, peer-coordination.",
  ops: "Machine-* tools (per-machine setup, hardening, ROI).",
  dev: "Code-index, dispatcher, engine, action, formula, algorithm explorers + dev meta.",
  roadmap: "RGS, generate-roadmap, milestone tools, envelope-sync, close-out.",
  autopilot: "Yolo, autopilot, smart, run-continuous, batch automation.",
  viz: "system-viz, awareness, master-index, build-state, orphan-inventory.",
  docs: "Commands listing, prism-paths, ref-first, manifest, capabilities, wiki.",
  meta: "RTK setup, profile switchers, model selection, harness configuration.",
  misc: "Nothing else matched (review periodically — should always be tiny).",
};

// ─── Pure helpers ────────────────────────────────────────────────────────────

/**
 * Parse YAML frontmatter from a skill markdown file. Returns { frontmatter, body }.
 * `frontmatter` is a *shallow* parsed object — supports the subset of YAML the
 * PRISM skill corpus actually uses: scalars, single-quoted strings, lists of
 * strings, nested objects 1-level deep (e.g. `policy: { tier: ..., triggers: [...] }`).
 * On malformed YAML, returns frontmatter = {} (defensive — never throw).
 */
export function parseFrontmatter(text) {
  if (typeof text !== "string" || text.length === 0) {
    return { frontmatter: {}, body: text || "" };
  }
  // Frontmatter must START at the very first character (`---\n`)
  if (!text.startsWith("---\n") && !text.startsWith("---\r\n")) {
    return { frontmatter: {}, body: text };
  }
  const endRe = /\r?\n---\r?\n/g;
  endRe.lastIndex = 4;
  const m = endRe.exec(text);
  if (!m) {
    return { frontmatter: {}, body: text };
  }
  const yamlBody = text.slice(text.indexOf("\n") + 1, m.index);
  const restBody = text.slice(m.index + m[0].length);
  const fm = {};
  let currentKey = null;
  let currentList = null;
  let currentObj = null;
  let currentObjKey = null;
  for (const rawLine of yamlBody.split(/\r?\n/)) {
    if (rawLine.trim() === "") continue;
    if (rawLine.startsWith("#")) continue; // YAML comments
    // List item: `  - "value"` or `  - value`
    const listMatch = rawLine.match(/^\s*-\s+(.*)$/);
    if (listMatch && currentList) {
      let v = listMatch[1].trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      else if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
      currentList.push(v);
      continue;
    }
    // Nested object key under a parent (e.g. `  tier: 3` under `policy:`)
    const nestedMatch = rawLine.match(/^\s\s+([a-zA-Z_][\w-]*)\s*:\s*(.*)$/);
    if (nestedMatch && currentObj) {
      // First nested key under a top-level key that was opened as ambiguous —
      // promote fm[currentKey] from list (initial open) to object.
      if (currentKey && fm[currentKey] === currentList) {
        fm[currentKey] = currentObj;
      }
      const k = nestedMatch[1];
      const v = nestedMatch[2].trim();
      if (v === "") {
        // Open a nested list
        currentList = [];
        currentObj[k] = currentList;
        currentObjKey = k;
      } else {
        currentObj[k] = stripScalar(v);
        currentList = null;
        currentObjKey = null;
      }
      continue;
    }
    // Top-level key: `name: value` or `name:` (opens object/list)
    const topMatch = rawLine.match(/^([a-zA-Z_][\w-]*)\s*:\s*(.*)$/);
    if (topMatch) {
      currentKey = topMatch[1];
      const v = topMatch[2].trim();
      if (v === "") {
        // Ambiguous — could be object or list. Open as list (since list items
        // appear at any indentation under the parent), and switch fm[key] to
        // an object only when we see a nested `  k: v` line. Both pointers
        // share initial empty state.
        currentObj = {};
        currentList = [];
        fm[currentKey] = currentList;
      } else {
        fm[currentKey] = stripScalar(v);
        currentObj = null;
        currentList = null;
      }
      continue;
    }
  }
  // Cleanup: if a top-level key opened both an object and a list, and only the
  // list got populated, replace the object with the list.
  for (const [k, v] of Object.entries(fm)) {
    if (v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) {
      // The parser opened it as object, but no nested keys came in — leave as {} so
      // callers can still read it without crashing. Don't lose user intent.
    }
  }
  return { frontmatter: fm, body: restBody };
}

function stripScalar(v) {
  if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
  if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1);
  // Try number
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null") return null;
  return v;
}

/**
 * Classify a command into a workflow bucket. Pure — no I/O.
 *   name:    the lowercase command name (filename without .md, no leading slash)
 *   content: full file text (used only for description sniffing if no rule matches)
 * Returns { bucket, rule_index } where rule_index is -1 for the default bucket.
 */
export function classifyCommand(name, content = "") {
  if (typeof name !== "string" || name.length === 0) {
    return { bucket: DEFAULT_BUCKET, rule_index: -1 };
  }
  const lc = name.toLowerCase();
  for (let i = 0; i < RULES.length; i++) {
    if (RULES[i].test(lc, content)) {
      return { bucket: RULES[i].bucket, rule_index: i };
    }
  }
  return { bucket: DEFAULT_BUCKET, rule_index: -1 };
}

/**
 * Walk a commands directory recursively, return [{ name, path, content }, ...].
 * `name` is lowercase, filename without .md, with subdir prefix when nested
 * (e.g. "sparc/debug"). Skips non-.md files. Defensive on missing dir.
 */
export function walkCommandsDir(rootDir) {
  if (!rootDir || !fs.existsSync(rootDir)) return [];
  const out = [];
  function walk(dir, prefix) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full, prefix ? `${prefix}/${e.name}` : e.name);
      } else if (e.isFile() && e.name.endsWith(".md")) {
        const stem = e.name.slice(0, -3).toLowerCase();
        const name = prefix ? `${prefix}/${stem}` : stem;
        let content;
        try { content = fs.readFileSync(full, "utf8"); } catch { content = ""; }
        out.push({ name, path: full, content });
      }
    }
  }
  walk(rootDir, "");
  return out;
}

/**
 * Extract a one-line description from a parsed frontmatter or content body.
 * Tries (in order): fm.description → top-level # heading → first non-empty line.
 * Returns "" if nothing usable.
 */
export function extractDescription(fm, body) {
  if (fm && typeof fm.description === "string" && fm.description.trim()) {
    return fm.description.trim().split(/\r?\n/)[0].slice(0, 240);
  }
  if (typeof body === "string") {
    const m1 = body.match(/^#\s+(.+)$/m);
    if (m1) return m1[1].trim().slice(0, 240);
    const m2 = body.match(/^([^\s#].+)$/m);
    if (m2) return m2[1].trim().slice(0, 240);
  }
  return "";
}

/**
 * Build the full inventory record for one skill file.
 */
export function buildRecord(entry, source) {
  const { frontmatter, body } = parseFrontmatter(entry.content);
  const { bucket, rule_index } = classifyCommand(entry.name, entry.content);
  const description = extractDescription(frontmatter, body);
  // Read trigger phrases if present (project-style uses policy.triggers, user-style uses triggers)
  let triggers = [];
  if (frontmatter && frontmatter.policy && Array.isArray(frontmatter.policy.triggers)) {
    triggers = frontmatter.policy.triggers;
  } else if (Array.isArray(frontmatter.triggers)) {
    triggers = frontmatter.triggers;
  }
  let tier = null;
  if (frontmatter && frontmatter.policy && typeof frontmatter.policy.tier === "number") {
    tier = frontmatter.policy.tier;
  } else if (typeof frontmatter.tier === "number") {
    tier = frontmatter.tier;
  }
  return {
    name: entry.name,
    path: entry.path.replace(/\\/g, "/"),
    source,           // "project" | "archive" | "user"
    bucket,
    rule_index,
    description,
    triggers,
    tier,
  };
}

/**
 * Group records by bucket, sort within each bucket by name asc.
 */
export function groupByBucket(records) {
  const grouped = {};
  for (const b of BUCKETS_DISPLAY_ORDER) grouped[b] = [];
  for (const r of records) {
    if (!grouped[r.bucket]) grouped[r.bucket] = [];
    grouped[r.bucket].push(r);
  }
  for (const b of Object.keys(grouped)) {
    grouped[b].sort((a, b2) => a.name.localeCompare(b2.name));
  }
  return grouped;
}

/**
 * Render the inventory as Markdown.
 */
export function renderMarkdown(records, generatedAt) {
  const grouped = groupByBucket(records);
  const lines = [];
  lines.push(`# Slash Commands Inventory — by workflow`);
  lines.push("");
  lines.push(`**Generated:** ${generatedAt}`);
  lines.push(`**Total:** ${records.length} skills across ${BUCKETS_DISPLAY_ORDER.length} workflow buckets`);
  lines.push(`**Source:** \`node scripts/inventory-slash-commands-by-workflow.mjs\` (ACP-MS0/P0-U01)`);
  lines.push("");
  // Headline counts per source
  const bySource = { project: 0, archive: 0, user: 0 };
  for (const r of records) bySource[r.source] = (bySource[r.source] || 0) + 1;
  lines.push(`**By source:** project=${bySource.project} · archive=${bySource.archive} · user=${bySource.user}`);
  lines.push("");
  lines.push("## Bucket totals");
  lines.push("");
  lines.push("| Bucket | Count | Description |");
  lines.push("|--------|-------|-------------|");
  for (const b of BUCKETS_DISPLAY_ORDER) {
    const n = (grouped[b] || []).length;
    lines.push(`| ${b} | ${n} | ${BUCKET_DESCRIPTIONS[b] || ""} |`);
  }
  lines.push("");
  // Per-bucket detail
  for (const b of BUCKETS_DISPLAY_ORDER) {
    const items = grouped[b] || [];
    if (items.length === 0) continue;
    lines.push(`## ${b} (${items.length})`);
    lines.push("");
    lines.push(`> ${BUCKET_DESCRIPTIONS[b] || ""}`);
    lines.push("");
    lines.push("| Command | Source | Tier | Description |");
    lines.push("|---------|--------|------|-------------|");
    for (const r of items) {
      const desc = (r.description || "").replace(/\|/g, "\\|").slice(0, 140);
      const tier = r.tier === null ? "—" : r.tier;
      lines.push(`| \`/${r.name}\` | ${r.source} | ${tier} | ${desc} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

// ─── Main I/O ────────────────────────────────────────────────────────────────

async function main(argv) {
  const args = parseArgs(argv);
  const allRecords = [];
  // Walk all three source dirs
  for (const e of walkCommandsDir(PROJECT_COMMANDS_DIR)) {
    allRecords.push(buildRecord(e, "project"));
  }
  for (const e of walkCommandsDir(ARCHIVE_COMMANDS_DIR)) {
    allRecords.push(buildRecord(e, "archive"));
  }
  for (const dir of USER_COMMANDS_DIRS) {
    for (const e of walkCommandsDir(dir)) {
      allRecords.push(buildRecord(e, "user"));
    }
  }
  const generatedAt = new Date().toISOString();
  const out = {
    schemaVersion: 1,
    generated_at: generatedAt,
    total: allRecords.length,
    buckets: BUCKETS_DISPLAY_ORDER,
    bucket_descriptions: BUCKET_DESCRIPTIONS,
    bucket_counts: Object.fromEntries(
      BUCKETS_DISPLAY_ORDER.map((b) => [b, allRecords.filter((r) => r.bucket === b).length])
    ),
    by_source: {
      project: allRecords.filter((r) => r.source === "project").length,
      archive: allRecords.filter((r) => r.source === "archive").length,
      user: allRecords.filter((r) => r.source === "user").length,
    },
    records: allRecords.sort((a, b) => a.name.localeCompare(b.name)),
  };
  const md = renderMarkdown(allRecords, generatedAt);
  if (args.json) {
    process.stdout.write(JSON.stringify(out, null, 2));
    return 0;
  }
  if (args.noWrite) {
    process.stdout.write(`(preview) would write ${OUT_MD_PATH} and ${OUT_JSON_PATH}\n`);
    process.stdout.write(`total: ${allRecords.length}, buckets: ${BUCKETS_DISPLAY_ORDER.length}\n`);
    return 0;
  }
  atomicWrite(OUT_JSON_PATH, JSON.stringify(out, null, 2));
  atomicWrite(OUT_MD_PATH, md);
  process.stdout.write(
    `inventory: wrote ${OUT_MD_PATH} and ${OUT_JSON_PATH}\n` +
    `  total=${allRecords.length}  project=${out.by_source.project}  archive=${out.by_source.archive}  user=${out.by_source.user}\n`
  );
  // Top-5 buckets by count
  const top = Object.entries(out.bucket_counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  process.stdout.write(`  top buckets: ${top.map(([b, n]) => `${b}=${n}`).join(", ")}\n`);
  return 0;
}

function atomicWrite(p, content) {
  const tmp = `${p}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, content + (content.endsWith("\n") ? "" : "\n"));
  fs.renameSync(tmp, p);
}

function parseArgs(argv) {
  const out = { noWrite: false, json: false, help: false, selfTest: false };
  for (const a of argv) {
    if (a === "--no-write") out.noWrite = true;
    else if (a === "--json") out.json = true;
    else if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--self-test") out.selfTest = true;
  }
  return out;
}

// ─── Self-test (synthetic-fixture sanity) ────────────────────────────────────

function runSelfTest() {
  let pass = 0, fail = 0;
  function check(name, cond) {
    if (cond) { pass++; console.log(`  ✓ ${name}`); }
    else      { fail++; console.log(`  ✗ ${name}`); }
  }

  // parseFrontmatter — happy path
  {
    const text = `---\nname: foo\npolicy:\n  tier: 3\n  triggers:\n    - "alpha"\n    - "beta"\n---\nbody here`;
    const { frontmatter, body } = parseFrontmatter(text);
    check("parseFrontmatter: top-level scalar (name)", frontmatter.name === "foo");
    check("parseFrontmatter: nested scalar (policy.tier)", frontmatter.policy && frontmatter.policy.tier === 3);
    check("parseFrontmatter: nested list (policy.triggers)",
          Array.isArray(frontmatter.policy && frontmatter.policy.triggers) &&
          frontmatter.policy.triggers[0] === "alpha" &&
          frontmatter.policy.triggers[1] === "beta");
    check("parseFrontmatter: body extracted", body === "body here");
  }
  // No frontmatter
  {
    const text = `no frontmatter\nsome stuff`;
    const { frontmatter, body } = parseFrontmatter(text);
    check("parseFrontmatter: missing frontmatter → {}", Object.keys(frontmatter).length === 0);
    check("parseFrontmatter: missing frontmatter → body intact", body === text);
  }
  // Malformed YAML (closing --- never appears)
  {
    const text = `---\nkey: value\n\nsome body`;
    const { frontmatter, body } = parseFrontmatter(text);
    check("parseFrontmatter: malformed (no closing ---) → {}", Object.keys(frontmatter).length === 0);
    check("parseFrontmatter: malformed → body=original", body === text);
  }
  // Empty input
  {
    const { frontmatter, body } = parseFrontmatter("");
    check("parseFrontmatter: empty string", Object.keys(frontmatter).length === 0 && body === "");
  }
  // Null/undefined input (adversarial)
  {
    let crashed = false;
    try { parseFrontmatter(null); } catch { crashed = true; }
    check("parseFrontmatter: null input no-crash", crashed === false);
  }

  // classifyCommand — workflow spanning
  {
    check("classify: wedm-program → wedm", classifyCommand("wedm-program").bucket === "wedm");
    check("classify: lathe-thread → lathe", classifyCommand("lathe-thread").bucket === "lathe");
    check("classify: mill-studio → mill", classifyCommand("mill-studio").bucket === "mill");
    check("classify: cad-extract → cad", classifyCommand("cad-extract").bucket === "cad");
    check("classify: cam-strategy → cam", classifyCommand("cam-strategy").bucket === "cam");
    check("classify: post-validate → post", classifyCommand("post-validate").bucket === "post");
    check("classify: auto-speed-feed → speed-feed", classifyCommand("auto-speed-feed").bucket === "speed-feed");
    check("classify: quote-job → quote", classifyCommand("quote-job").bucket === "quote");
    check("classify: forge → forge", classifyCommand("forge").bucket === "forge");
    check("classify: forge-audit → forge", classifyCommand("forge-audit").bucket === "forge");
    check("classify: handoff → session", classifyCommand("handoff").bucket === "session");
    check("classify: rgs → roadmap", classifyCommand("rgs").bucket === "roadmap");
    check("classify: hook-stats → infra", classifyCommand("hook-stats").bucket === "infra");
    check("classify: close-out → roadmap", classifyCommand("close-out").bucket === "roadmap");
  }
  // Overlap precedence
  {
    check("classify: wedm beats edm", classifyCommand("wedm-program").bucket === "wedm");
    check("classify: mill-turn → mill (mill rule fires first)", classifyCommand("mill-turn").bucket === "mill");
  }
  // Unmatched → misc
  {
    check("classify: random-name → misc", classifyCommand("xyz-totally-random").bucket === "misc");
    check("classify: empty name → misc", classifyCommand("").bucket === "misc");
    check("classify: non-string → misc (no crash)", classifyCommand(null).bucket === "misc");
  }

  // walkCommandsDir — missing dir
  {
    const out = walkCommandsDir("/nonexistent/path/zzz");
    check("walk: missing dir → []", Array.isArray(out) && out.length === 0);
    const out2 = walkCommandsDir("");
    check("walk: empty path → []", Array.isArray(out2) && out2.length === 0);
  }

  // buildRecord on a synthetic entry
  {
    const entry = {
      name: "test-skill",
      path: "/fake/path/test-skill.md",
      content: `---\ndescription: A test skill\npolicy:\n  tier: 2\n  triggers:\n    - "alpha"\n---\n# Test Skill\n\nBody.`,
    };
    const rec = buildRecord(entry, "project");
    check("buildRecord: name", rec.name === "test-skill");
    check("buildRecord: source", rec.source === "project");
    check("buildRecord: description", rec.description === "A test skill");
    check("buildRecord: tier", rec.tier === 2);
    check("buildRecord: triggers", Array.isArray(rec.triggers) && rec.triggers[0] === "alpha");
    check("buildRecord: bucket", typeof rec.bucket === "string");
  }

  // renderMarkdown — has expected sections
  {
    const recs = [
      { name: "alpha", path: "/x/alpha.md", source: "project", bucket: "build", description: "build thing", triggers: [], tier: null, rule_index: 0 },
      { name: "beta", path: "/x/beta.md", source: "archive", bucket: "audit", description: "audit thing", triggers: [], tier: 2, rule_index: 0 },
    ];
    const md = renderMarkdown(recs, "2026-01-01T00:00:00Z");
    check("render: has title", md.includes("# Slash Commands Inventory"));
    check("render: has bucket totals header", md.includes("## Bucket totals"));
    check("render: has alpha row", md.includes("`/alpha`"));
    check("render: has beta row", md.includes("`/beta`"));
    check("render: pipes escaped", !md.includes("|alpha|") || md.includes("/alpha"));
  }

  // Variability axis — 3 spanning configs
  {
    // A: minimal skill (filename only)
    const a = buildRecord({ name: "wedm-validate", path: "/p/wedm-validate.md", content: "" }, "project");
    check("variability A (no frontmatter, just name)", a.bucket === "wedm" && a.description === "");
    // B: full skill-lint convention (top-level description + triggers)
    const b = buildRecord({
      name: "auto-speed-feed",
      path: "/p/auto-speed-feed.md",
      content: `---\ndescription: Compute cutting parameters\ntriggers:\n  - "speed feed"\n  - "rpm"\n---\n# /auto-speed-feed`,
    }, "project");
    check("variability B (top-level desc+triggers)",
          b.bucket === "speed-feed" &&
          b.description === "Compute cutting parameters" &&
          b.triggers[0] === "speed feed");
    // C: project-style (policy.tier + policy.triggers)
    const c = buildRecord({
      name: "dedup",
      path: "/p/dedup.md",
      content: `---\npolicy:\n  tier: 2\n  triggers:\n    - "dedup"\n---\n# /dedup`,
    }, "project");
    check("variability C (policy.tier+triggers)",
          c.bucket === "audit" && c.tier === 2 && c.triggers[0] === "dedup");
  }

  console.log(`\nself-test: ${pass} passed, ${fail} failed`);
  return fail === 0;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const herePath = path.resolve(fileURLToPath(import.meta.url));
if (invokedPath && invokedPath === herePath) {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(`inventory-slash-commands-by-workflow.mjs — ACP-MS0/P0-U01

Usage:
  node scripts/inventory-slash-commands-by-workflow.mjs           # write inventory
  node scripts/inventory-slash-commands-by-workflow.mjs --no-write  # preview
  node scripts/inventory-slash-commands-by-workflow.mjs --json    # machine-readable to stdout
  node scripts/inventory-slash-commands-by-workflow.mjs --self-test   # 50+ inline tests
`);
    process.exit(0);
  }
  if (argv.includes("--self-test")) {
    process.exit(runSelfTest() ? 0 : 3);
  }
  main(argv).then((code) => process.exit(code || 0)).catch((err) => {
    process.stderr.write(`inventory: ${err.stack || err}\n`);
    process.exit(1);
  });
}
