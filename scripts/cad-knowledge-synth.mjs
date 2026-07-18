#!/usr/bin/env node
/**
 * cad-knowledge-synth.mjs (U-DELTA-CAD-KNOWLEDGE-SYNTH, slot:delta 2026-06-29)
 *
 * Background ME + CAD-modeling KNOWLEDGE synthesis via a Hermes/Grok agent. Proven this session: a Grok-4.3
 * agent can synthesize targeted CAD design heuristics that close real generation gaps (feature under-count).
 * This makes it repeatable + cron-friendly: pick a focus area -> ask Hermes for N design heuristics ->
 * parse -> append to a durable jsonl that the text->CAD generator MERGES into its tribal corpus
 * (loadTribalTips, U-DELTA-CADGEN-FEATURE-KNOWLEDGE wiring) so the system gets smarter at CAD over time.
 *
 *   node scripts/cad-knowledge-synth.mjs --focus "fillet and chamfer conventions" [--n 4] [--model grok-4.3] [--json]
 *   (no --focus -> a rotating default focus from FOCUS_AREAS, picked by --rotate <int> for cron variety)
 *
 * Prefers the Hermes CLOUD lane (Grok, stable + authenticated) over the transiently-flaky local Ollama lane.
 * Pure helpers (buildSynthPrompt / parseHermesTips / slugifyTip) are exported + unit-tested; the live Hermes
 * call fails loud (never fabricates knowledge). No Date/random (cron-safe) -- ids are content-hashed.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SYNTH_PATH = path.join(ROOT, "state", "shared", "cad-knowledge-synth.jsonl");
// Target the local :8645 OAuth proxy (serves the xAI Grok lane) -- NOT the general PRISM_HERMES_PROXY_URL,
// which the fleet repoints to other upstreams (e.g. NVIDIA `integrate.api.nvidia.com`, which 404s grok-4.3).
// Override with PRISM_HERMES_GROK_URL or --url if the grok proxy moves.
const HERMES_BASE = (process.env.PRISM_HERMES_GROK_URL || "http://127.0.0.1:8645/v1").replace(/\/$/, "");
const DEFAULT_MODEL = "grok-4.3";

// Rotating focus areas a cron sweeps to MAXIMIZE the CAD-modeling / design / ASSEMBLIES / engineering
// knowledge over time (each a real generation/design concern). Grouped: MODELING+FEATURES, DESIGN+DFM,
// ASSEMBLIES, ENGINEERING. A cron --rotate <n> walks the list; --all sweeps every area in one run.
export const FOCUS_AREAS = [
  // modeling + features
  "hole and feature count/pattern selection for brackets, plates and flanges",
  "fillet and chamfer conventions: when to apply, typical radii, edge selection",
  "pocket and slot geometry: depth-to-width ratios, corner radii, draft",
  "boss, counterbore and countersink standards for fasteners",
  // design + DFM
  "wall thickness, rib and gusset design rules for machined and cast parts",
  "design-for-manufacturability rules for milling, turning and sinker/wire-EDM",
  "tolerance and ISO 286 fit selection (clearance/transition/interference) by feature function",
  "GD&T datum and feature-control-frame selection for dimensionally-driven generation",
  // assemblies
  "assembly mate/constraint selection: which mates for shafts-in-bores, flanges, brackets",
  "fastener and bolt-pattern selection + clearance/tap hole sizing for assemblies",
  "tolerance stack-up and clearance budgeting across mating components",
  "component datum alignment and locating-feature design (pins, slots, counterbores) in assemblies",
  // engineering
  "material selection heuristics by part class (die steel, tool steel, aluminum, brass) and use-case",
  "symmetry and datum selection for dimensionally-driven part generation",
];

/** Build the Hermes synthesis prompt for a focus area. Asks for plain numbered, code-actionable heuristics. */
export function buildSynthPrompt(focus, n = 4) {
  const k = Number.isFinite(Number(n)) && Number(n) > 0 ? Math.min(8, Math.floor(Number(n))) : 4;
  return `You are a mechanical design knowledge synthesizer for an automated text->CAD generation system (it emits CadQuery from part descriptions). It gets overall ENVELOPE dimensions right but needs sharper FEATURE-level design knowledge. Produce ${k} concise, authoritative CAD-modeling design heuristics about: ${focus}. Each heuristic: ONE sentence, specific and ACTIONABLE for code generation, grounded in standard mechanical-design practice. Output ONLY plain numbered lines (1. ... 2. ...), no preamble, no markdown. Keep under ${k * 45} words total.`;
}

/** Deterministic short slug + id from a tip's text (content-hash; no Date/random -> cron-stable, dedupes repeats). */
export function slugifyTip(tip) {
  const words = String(tip || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").trim().split(/\s+/).slice(0, 6).join("-");
  const hash = crypto.createHash("sha256").update(String(tip || "")).digest("hex").slice(0, 8);
  return { slug: (words || "tip").slice(0, 60), id: `hermes-synth-${hash}` };
}

/**
 * Parse a Hermes numbered-list response into CADTribalTip-shaped objects. Tolerates "1.", "1)", "- ",
 * leading/trailing blanks, and wrapped lines (a numbered line starts a new tip; continuations append).
 * Returns [] for empty/non-string (never fabricates). Each tip carries focus + model provenance.
 */
export function parseHermesTips(text, { focus = "general", model = DEFAULT_MODEL } = {}) {
  const lines = String(text || "").split(/\r?\n/);
  const raw = [];
  for (const line of lines) {
    const m = line.match(/^\s*(?:\d+[.)]|[-*])\s+(.*\S)\s*$/);
    if (m) raw.push(m[1].trim());
    else if (raw.length && line.trim()) raw[raw.length - 1] += " " + line.trim(); // wrapped continuation
  }
  const out = [];
  const seen = new Set();
  for (const tip of raw) {
    const t = tip.replace(/\s+/g, " ").trim();
    if (t.length < 12) continue; // drop fragments
    const { slug, id } = slugifyTip(t);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ schemaVersion: "1.0.0", id, slug, kind: "design-rule", consume: "cad text->gen / feature placement", tip: t, source: `hermes/${model} synth: ${focus}`, domain: "cad" });
  }
  return out;
}

/** POST a chat completion to the Hermes proxy (cloud lane). Throws on a non-ok / unreachable bridge. */
async function callHermes(prompt, model, { fetchImpl = fetch } = {}) {
  const res = await fetchImpl(`${HERMES_BASE}/chat/completions`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.3, max_tokens: 600 }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`hermes ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const j = await res.json();
  const content = j?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("hermes returned no content");
  return content;
}

async function main() {
  const args = process.argv.slice(2);
  const get = (n, d) => { const i = args.indexOf(n); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
  const asJson = args.includes("--json");
  const model = get("--model", DEFAULT_MODEL);
  const n = parseInt(get("--n", "4"), 10) || 4;
  const rotate = parseInt(get("--rotate", "0"), 10) || 0;
  // --all sweeps EVERY focus area (comprehensive maximization); else one focus (--focus or --rotate index).
  const foci = args.includes("--all")
    ? FOCUS_AREAS
    : [get("--focus", null) || FOCUS_AREAS[((rotate % FOCUS_AREAS.length) + FOCUS_AREAS.length) % FOCUS_AREAS.length]];

  // health-gate the cloud lane (never fabricate knowledge on a dead bridge)
  try {
    const h = await fetch(`${HERMES_BASE.replace(/\/v1$/, "")}/health`, { signal: AbortSignal.timeout(5000) }).then((r) => r.json());
    if (String(h?.status).toLowerCase() !== "ok") throw new Error(JSON.stringify(h)); // proxy + vanity-gateway both report "ok"/"OK"
  } catch (e) { process.stderr.write(`Hermes proxy unreachable (${e.message}). Start it: node scripts/hermes-proxy-ensure.mjs\n`); process.exit(2); }

  const existing = new Set();
  try { for (const l of fs.readFileSync(SYNTH_PATH, "utf8").split(/\r?\n/)) { if (!l) continue; try { const o = JSON.parse(l); if (o.id) existing.add(o.id); } catch {} } } catch {}
  fs.mkdirSync(path.dirname(SYNTH_PATH), { recursive: true });

  const perFocus = [];
  const allFresh = [];
  for (const focus of foci) {
    let content;
    try { content = await callHermes(buildSynthPrompt(focus, n), model); }
    catch (e) { process.stderr.write(`  synth FAILED focus="${focus.slice(0, 44)}": ${e.message}\n`); perFocus.push({ focus, error: String(e.message).slice(0, 80) }); continue; }
    const tips = parseHermesTips(content, { focus, model });
    const fresh = tips.filter((t) => !existing.has(t.id));
    for (const t of fresh) { fs.appendFileSync(SYNTH_PATH, JSON.stringify(t) + "\n"); existing.add(t.id); allFresh.push(t); }
    perFocus.push({ focus, synthesized: tips.length, appended: fresh.length });
    process.stderr.write(`  [${focus.slice(0, 46).padEnd(46)}] ${tips.length} synth, ${fresh.length} new\n`);
  }
  const totalSynth = perFocus.reduce((a, f) => a + (f.synthesized || 0), 0);

  if (asJson) { process.stdout.write(JSON.stringify({ model, fociRun: foci.length, totalSynthesized: totalSynth, totalAppended: allFresh.length, perFocus, tips: allFresh }, null, 2) + "\n"); return; }
  process.stdout.write(`[CAD-KNOWLEDGE-SYNTH] ${foci.length} focus area(s), model=${model}: ${totalSynth} synthesized, ${allFresh.length} NEW -> ${SYNTH_PATH}\n`);
  for (const t of allFresh.slice(0, 24)) process.stdout.write(`  + ${t.tip.slice(0, 108)}\n`);
  if (allFresh.length > 24) process.stdout.write(`  ... +${allFresh.length - 24} more\n`);
}

const isMain = (() => { try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (isMain) main().catch((e) => { process.stderr.write(`${e?.stack ?? e}\n`); process.exit(1); });
