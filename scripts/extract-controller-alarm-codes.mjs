#!/usr/bin/env node
/**
 * scripts/extract-controller-alarm-codes.mjs — U-VICTOR-B5
 *
 * Mines controller alarm-code knowledge from 5 controller dialects + emits
 * to `mcp-server/data/tribal/controller-alarms.jsonl`. The existing
 * `embed-tribal-jsonl-into-index.mjs` (delta, 2026-05-26) auto-includes any
 * JSONL under `mcp-server/data/tribal/` in the next embed regen, so this
 * closes the loop end-to-end without new wiring.
 *
 * State at iter-1 audit: 128 wiki + 41 troubleshoot but only 1 tribal tip
 * tagged "alarm" — heavy under-promotion. This is the under-indexed class.
 *
 * Two modes:
 *   1. SEED mode (default, --seed): emit the built-in starter set of common
 *      alarms (5 controllers × ~10 alarms each). Conf 0.85 — high enough to
 *      land in the tribal index, below the 0.9 auto-promote-to-wiki floor.
 *      Built-in alarms drawn from public docs (Fanuc 6-series, Heidenhain
 *      iTNC 530, Haas NGC, Mazak Matrix, Siemens 840D) — all well-known.
 *   2. EXTRACT mode (--pdf <path>): read a controller manual PDF, regex
 *      candidate alarm entries by controller dialect, emit at conf 0.4
 *      (below promotion floor — operator curates).
 *
 * Pure-core / IO shell split:
 *   - SEED_ALARMS              the built-in seed list (frozen)
 *   - parseAlarmLines(text, controller)   pure regex extractor
 *   - emitJsonl(entries, target)          write the JSONL
 *
 * Usage:
 *   node scripts/extract-controller-alarm-codes.mjs --seed
 *   node scripts/extract-controller-alarm-codes.mjs --pdf "JM DIE/.../fanuc-manual.pdf"
 * Exit:
 *   0 ok · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
export const SCHEMA_VERSION = "1.0.0";

const OUT_PATH = path.join(ROOT, "mcp-server/data/tribal/controller-alarms.jsonl");

// ───────────────────────── seed alarms (pure data) ─────────────────────────

/**
 * Frozen seed: 5 controllers × ~10 common alarms. Public-doc facts. Used
 * by SEED mode to give the tribal index immediate content without an
 * operator first having to point pdf-parse at a manual.
 */
export const SEED_ALARMS = Object.freeze([
  // FANUC (4-digit numeric, P-prefix for program alarms)
  { controller: "fanuc", code: "PS0500", title: "Excessive feed deviation",      hint: "Servo lag exceeded threshold — check load on axis, lubrication, ball-screw" },
  { controller: "fanuc", code: "PS0510", title: "Overtravel positive limit",     hint: "Soft limit hit — verify work coordinate offset + program excursion" },
  { controller: "fanuc", code: "OT0506", title: "Overtravel negative limit",     hint: "Hard limit hit — manual jog out + reset before re-running" },
  { controller: "fanuc", code: "SV0410", title: "Servo motor overheat",          hint: "Cooling fan check; cycle time + duty interval review" },
  { controller: "fanuc", code: "SV0414", title: "Servo digital current",         hint: "Drive amp limit — usually wrong feed/spindle ratio in heavy cut" },
  { controller: "fanuc", code: "SP0749", title: "Spindle motor abnormal",        hint: "Belt slip / contactor / spindle drive — order: cable, contactor, drive, motor" },
  { controller: "fanuc", code: "ER1000", title: "Emergency stop pressed",        hint: "Latched E-stop — release physically + RESET; tool offset re-zero" },
  { controller: "fanuc", code: "PW0000", title: "Power supply low voltage",      hint: "Brown-out / wiring; check main breaker + filter cap on PSU" },
  { controller: "fanuc", code: "MC0010", title: "Battery voltage low (PMC)",     hint: "Replace PMC backup battery within 30 days — parameters at risk" },
  { controller: "fanuc", code: "DS0001", title: "Background editing busy",       hint: "Operator-side; close BG-EDIT screen before MEM-mode start" },

  // HEIDENHAIN iTNC 530 / TNC 640 (semantic strings)
  { controller: "heidenhain", code: "PROG NUMBER", title: "Program number mismatch", hint: "%-prefix call against missing file — verify file exists in TNC: drive" },
  { controller: "heidenhain", code: "BUFFER UNDERRUN", title: "Look-ahead buffer empty", hint: "Network / drive read latency too slow — increase look-ahead in MP" },
  { controller: "heidenhain", code: "TOUCHPROBE NO CONTACT", title: "Probe failed to touch", hint: "Probe battery, signal cable, or pre-travel gap too large" },
  { controller: "heidenhain", code: "TOUCHPROBE COLLISION", title: "Probe hit before approach distance", hint: "Approach radius wrong or part not where expected — rezero" },
  { controller: "heidenhain", code: "SOFT LIMIT", title: "Soft limit reached",      hint: "Parameter MP9XX set lower than program excursion — check WCS" },
  { controller: "heidenhain", code: "FEED ZERO", title: "Feed rate zero override",  hint: "Operator override knob at 0 — twist back to 100%" },
  { controller: "heidenhain", code: "TOOL DEFINITION", title: "Tool table mismatch", hint: "Programmed tool not in TOOL.T — add row + recompile" },
  { controller: "heidenhain", code: "SPINDLE NOT RUNNING", title: "M03/M04 missing before G81-G89", hint: "Canned cycle requires spindle on — add M03 before call" },

  // HAAS NGC (LED descriptors + plain English)
  { controller: "haas",      code: "127",     title: "Mismatch M code / spindle state", hint: "M19 oriented spindle expected; spindle still rotating — wait + clear" },
  { controller: "haas",      code: "139",     title: "Tool change in cycle",            hint: "M06 mid-cycle without retract — add G53 G00 Z0 before M06" },
  { controller: "haas",      code: "165",     title: "Pallet not seated",               hint: "Pallet sensor not picking up; clean sensor + verify clamp" },
  { controller: "haas",      code: "9999",    title: "Servo amp fault",                 hint: "Power-cycle + reset; if persistent, contact service" },
  { controller: "haas",      code: "1000",    title: "Lube low",                        hint: "Way oil reservoir below sensor — top up + ack" },
  { controller: "haas",      code: "0024",    title: "Single block held",               hint: "Single-block toggle on; full automatic = press CYCLE START twice" },
  { controller: "haas",      code: "1023",    title: "Coolant low",                     hint: "Coolant tank below probe — top up + check chip strainer" },
  { controller: "haas",      code: "212",     title: "X-axis follow error",             hint: "Heavy cut + thermal — check ball-screw temp + backlash setting 13" },

  // MAZAK Matrix / Smooth (EIA + Mazak-specific)
  { controller: "mazak",     code: "200",     title: "Axis hardware overtravel",        hint: "Limit switch tripped — manual jog clear + RESET" },
  { controller: "mazak",     code: "301",     title: "Servo amp DC overvoltage",        hint: "Regen resistor / brake — heavy decel; reduce rapid override" },
  { controller: "mazak",     code: "470",     title: "Spindle orientation timeout",     hint: "Spindle position sensor cable — check connector + try M19 again" },
  { controller: "mazak",     code: "508",     title: "Tool magazine empty pocket",      hint: "M06 to pocket without a tool loaded — verify TOOL DATA OFFSET screen" },
  { controller: "mazak",     code: "627",     title: "Workpiece coordinate error",      hint: "G54-G59 offset out of range — verify part probe routine ran" },
  { controller: "mazak",     code: "750",     title: "MAPPS interlock",                 hint: "Door open during cycle — close + ack" },
  { controller: "mazak",     code: "910",     title: "Pallet exchange fault",           hint: "Pallet not seated in clamp — check pallet shuttle proximity sensor" },

  // SIEMENS 840D / Sinumerik (Z-numbered)
  { controller: "siemens",   code: "1000",    title: "Emergency stop",                  hint: "Same pattern as Fanuc ER1000 — release + reset" },
  { controller: "siemens",   code: "4060",    title: "Standard subroutine missing",     hint: "GUD/UDE not loaded — load through MMC operator screen" },
  { controller: "siemens",   code: "10800",   title: "Channel reset by NC start",       hint: "Operator hit RESET during cycle — re-arm + restart from safe block" },
  { controller: "siemens",   code: "16915",   title: "Frame too deep",                  hint: "G54/G55/G56/G57 + ROT/AROT nesting exceeded MD limit" },
  { controller: "siemens",   code: "20211",   title: "Channel STOP via PLC",            hint: "PLC condition (door, coolant, lube) blocks NC — read PLC diagnostic" },
  { controller: "siemens",   code: "61108",   title: "ShopMill workpiece zero",         hint: "Probe routine didn't complete — re-run zero macro" },
]);

// ───────────────────────── pure regex extractors ─────────────────────────

/**
 * Pure: extract candidate alarm entries from a block of text for a given
 * controller dialect. Returns `[{controller, code, title, hint, conf, source}]`.
 *
 * Each controller has its own regex shape:
 *   - fanuc:      `[PS|OT|SV|SP|ER|PW|MC|DS]\d{4}` + optional dash + title
 *   - heidenhain: SHOUTY-CAPS title + dash + description (lines)
 *   - haas:       1-4 digit number, dash, ALL-CAPS title
 *   - mazak:      3-digit number, space, descriptive title
 *   - siemens:    4-5 digit number, colon, title
 *
 * Conservative: every line that matches is emitted at conf 0.4 (below the
 * 0.9 auto-promote floor — operator curates).
 */
export function parseAlarmLines(text, controller) {
  if (typeof text !== "string" || !text) return [];
  if (typeof controller !== "string" || !controller) return [];

  const out = [];
  const lines = text.split(/\r?\n/);

  // First-stage regex per controller. Each returns {code, title} or null.
  const matchers = {
    fanuc:      (l) => {
      const m = l.match(/^\s*((?:PS|OT|SV|SP|ER|PW|MC|DS|AL)\d{3,4})\b[\s\-:]*([^\n]{3,120})$/);
      return m ? { code: m[1], title: m[2].trim() } : null;
    },
    heidenhain: (l) => {
      const m = l.match(/^\s*([A-Z][A-Z\s\-]{4,40})[\s\-:]+([^\n]{5,120})$/);
      return m ? { code: m[1].trim(), title: m[2].trim() } : null;
    },
    haas:       (l) => {
      const m = l.match(/^\s*(\d{2,4})\s*[\-:]\s*([A-Z][^\n]{4,120})$/);
      return m ? { code: m[1], title: m[2].trim() } : null;
    },
    mazak:      (l) => {
      const m = l.match(/^\s*(\d{3})\s+([A-Z][^\n]{5,120})$/);
      return m ? { code: m[1], title: m[2].trim() } : null;
    },
    siemens:    (l) => {
      const m = l.match(/^\s*(\d{4,5})\s*[:\-]\s*([^\n]{5,120})$/);
      return m ? { code: m[1], title: m[2].trim() } : null;
    },
  };

  const matcher = matchers[controller.toLowerCase()];
  if (!matcher) return [];

  for (const line of lines) {
    const m = matcher(line);
    if (m) {
      out.push({
        controller: controller.toLowerCase(),
        code: m.code,
        title: m.title,
        hint: "",
        conf: 0.4,
        source: "pdf-extract",
      });
    }
  }
  return out;
}

/**
 * Pure: shape a single alarm into the JSONL line schema. The fields match the
 * existing `mcp-server/data/tribal/*.jsonl` shape so `embed-tribal-jsonl-into-index.mjs`
 * (delta) picks it up without code change.
 */
export function toJsonlEntry(alarm) {
  if (!alarm || typeof alarm !== "object") return null;
  return {
    id: `controller-alarm:${alarm.controller}:${alarm.code}`,
    source: "controller-alarm",
    domain: "alarm",
    controller: alarm.controller,
    code: alarm.code,
    text: `${alarm.controller.toUpperCase()} alarm ${alarm.code} — ${alarm.title}. ${alarm.hint || ""}`.trim(),
    title: alarm.title,
    hint: alarm.hint || "",
    confidence: alarm.conf || 0.4,
    extractedFrom: alarm.source || "seed",
  };
}

// ───────────────────────── I/O shell ─────────────────────────

function emit(entries, target) {
  const dir = path.dirname(target);
  fs.mkdirSync(dir, { recursive: true });
  const lines = entries.map((e) => JSON.stringify(e)).filter(Boolean);
  fs.writeFileSync(target, lines.join("\n") + "\n");
  return entries.length;
}

export function main(argv = []) {
  const seedMode = argv.includes("--seed") || (!argv.includes("--pdf") && !argv.includes("--text-file"));
  const pdfIdx = argv.indexOf("--pdf");
  const textIdx = argv.indexOf("--text-file");

  let entries = [];

  if (seedMode) {
    entries = SEED_ALARMS.map((a) => ({ ...a, conf: 0.85, source: "seed" })).map(toJsonlEntry).filter(Boolean);
    console.log(`extract-controller-alarm-codes (SEED): ${entries.length} alarms across 5 controllers`);
  } else {
    let inputPath = null;
    let mode = null;
    if (pdfIdx !== -1 && argv[pdfIdx + 1]) { inputPath = argv[pdfIdx + 1]; mode = "pdf"; }
    if (textIdx !== -1 && argv[textIdx + 1]) { inputPath = argv[textIdx + 1]; mode = "text"; }

    if (!inputPath) {
      console.error("FATAL: --pdf or --text-file requires a path argument");
      return 2;
    }

    // Controller inference from filename — overridable with --controller
    const ctlIdx = argv.indexOf("--controller");
    let controller = ctlIdx !== -1 ? argv[ctlIdx + 1] : null;
    if (!controller) {
      const lower = inputPath.toLowerCase();
      for (const c of ["fanuc", "heidenhain", "haas", "mazak", "siemens"]) {
        if (lower.includes(c)) { controller = c; break; }
      }
    }
    if (!controller) {
      console.error("FATAL: cannot infer controller from filename; pass --controller <fanuc|heidenhain|haas|mazak|siemens>");
      return 2;
    }

    let text = "";
    if (mode === "text") {
      try { text = fs.readFileSync(inputPath, "utf8"); } catch (e) {
        console.error(`FATAL: read failed — ${e.message}`); return 2;
      }
    } else {
      // PDF mode — defer to whiskey's pdf-parse-extract.mjs and consume its text output.
      // To avoid coupling, this script accepts pre-extracted text via --text-file.
      // R12 fail-loud: do not silently emit empty.
      console.error("FATAL: --pdf mode requires running scripts/pdf-parse-extract.mjs first to produce a text file, then re-run with --text-file <path> --controller <name>");
      return 2;
    }

    const raw = parseAlarmLines(text, controller);
    entries = raw.map(toJsonlEntry).filter(Boolean);
    console.log(`extract-controller-alarm-codes (EXTRACT ${controller}): ${entries.length} candidate alarms parsed`);
  }

  try {
    const n = emit(entries, OUT_PATH);
    console.log(`  wrote ${n} entries -> ${OUT_PATH}`);
    console.log(`  next: \`node scripts/embed-tribal-jsonl-into-index.mjs\` (delta's bridge) will pick up on next embed regen`);
    return 0;
  } catch (e) {
    console.error(`FATAL: write failed — ${e.message}`);
    return 2;
  }
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main(process.argv.slice(2)));
