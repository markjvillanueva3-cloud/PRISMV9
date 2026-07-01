#!/usr/bin/env node
/**
 * winmax-ui-map.mjs — WinMax UI as a navigable finite state machine. slot:echo.
 *
 * WHY: driving WinMax blind (screenshot -> guess -> screenshot) is slow, token-heavy, and gets
 * LOST (a stray softkey press navigates somewhere unexpected). This turns the UI into a graph:
 * screens=states, softkeys/keys=transitions. Then:
 *   - `whereami`        identify the CURRENT screen from a cheap UIA probe (NO vision)
 *   - `path A B`        BFS shortest keystroke sequence between two screens
 *   - `navigate B`      whereami -> path -> send keys, RE-PROBING after each hop to confirm the
 *                       expected screen (per-step verify => never gets lost; stops loud on drift)
 *   - `record-screen`   probe the live screen + upsert its signature into the map
 *   - `record-transition` add a from-key-to edge
 *
 * Screen identity: WinMax headers are GRAPHICAL (0 UIA Text nodes), so a screen is fingerprinted by
 * its probe SIGNATURE — the set of Edit AutomationIds (minus StatusBar.* chrome) + List/ListItem
 * presence. Field-less menu screens share an empty signature and are disambiguated by their softkey
 * labels (vision, recorded once in the map). This is NOT a duplicate of hurco-winmax-knowledge (a
 * knowledge doc) or route-map/api-route-map (HTTP routes) — it is the WinMax UI navigation FSM.
 *
 * Pure core (signatureOf/fingerprint/matchScreen/shortestPath/renderMap) is exported + unit-tested
 * with fixture probes; only the *Live helpers spawn the PrismWinMaxUI driver.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_MAP_PATH = resolve(
  __dirname,
  "../mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/winmax-ui-map.json"
);
export const DEFAULT_EXE = resolve(
  __dirname,
  "../mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/bin/PrismWinMaxUI.exe"
);

// ── pure core ───────────────────────────────────────────────────────────────

// Window-chrome + generic buttons carry NO screen identity (every screen has them) — exclude so the
// button-signature discriminates the SCREEN. Everything else (DrawButton, SingleStepButton, ...) is
// kept. Proven live 2026-06-01: WinMax function controls are readable UIA Buttons (NOT graphical) —
// so this resolves field-less screens WITHOUT vision. See WINMAX-LIVE-TEST-LOG.md.
const CHROME_BUTTON = /^(Minimize|Maximize|Close|HeaderSite|Button\d+)$/;
// Pure-numeric automationIds (301, 302, …) are the WinMax F-key SOFTKEY bar, which is ALREADY a
// separate signature dimension (the softkey fallback in matchScreen). Excluding them here keeps the
// button-tiebreak orthogonal to the softkey dimension — `buttons` captures ONLY the NAMED screen
// controls (DrawButton, SingleStepButton, VerifyButton …) proven UIA-readable live 2026-06-01.
const SOFTKEY_ID = /^\d+$/;

/** Distinctive NAMED Button automationIds from a probe tree (chrome + numeric softkeys excluded,
 *  deduped, sorted). Pure — the discriminating dimension for field-less-screen disambiguation. */
export function distinctiveButtons(tree) {
  const ids = (Array.isArray(tree) ? tree : [])
    .filter((n) => n.controlType === "Button")
    .map((n) => String(n.automationId || ""))
    .filter((id) => id.length > 0 && !CHROME_BUTTON.test(id) && !SOFTKEY_ID.test(id));
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

/** Extract the discriminating signature from a probe object (the JSON `--op probe` emits). */
export function signatureOf(probe) {
  const tree = (probe && Array.isArray(probe.tree)) ? probe.tree : [];
  const edits = tree
    .filter((n) => n.controlType === "Edit" && !String(n.automationId || "").startsWith("StatusBar"))
    .map((n) => String(n.automationId || ""))
    .filter((id) => id.length > 0)
    .sort((a, b) => a.localeCompare(b));
  // dedupe (a stale tree can list an id twice)
  const uniqEdits = [...new Set(edits)];
  const hasList = tree.some((n) => n.controlType === "List");
  const hasListItems = tree.some((n) => n.controlType === "ListItem");
  // `buttons` is an ADDITIVE tiebreak dimension — sigEqual()/fingerprint() ignore it, so primary
  // Edit-signature matching stays byte-identical; buttons only break field-less-screen ambiguity.
  const buttons = distinctiveButtons(tree);
  return { edits: uniqEdits, hasList, hasListItems, buttons };
}

/** Stable short hash of a signature (order-independent on edits). */
export function fingerprint(sig) {
  const norm = {
    e: [...(sig.edits || [])].sort((a, b) => a.localeCompare(b)),
    l: !!sig.hasList,
    li: !!sig.hasListItems,
  };
  return createHash("sha1").update(JSON.stringify(norm)).digest("hex").slice(0, 12);
}

function sigEqual(a, b) {
  if (!a || !b) return false;
  if (!!a.hasList !== !!b.hasList) return false;
  if (!!a.hasListItems !== !!b.hasListItems) return false;
  const ea = [...(a.edits || [])].sort((x, y) => x.localeCompare(y));
  const eb = [...(b.edits || [])].sort((x, y) => x.localeCompare(y));
  if (ea.length !== eb.length) return false;
  return ea.every((v, i) => v === eb[i]);
}

/**
 * Match a live signature against the map.
 * @returns {{match:string|null, candidates:string[], ambiguous:boolean, confidence:number,
 *            tiebreakSoftkeys:Object|null}}
 */
export function matchScreen(map, liveSig) {
  const screens = (map && map.screens) || {};
  const candidates = Object.keys(screens).filter((k) => sigEqual(screens[k].signature, liveSig));
  if (candidates.length === 1) {
    return { match: candidates[0], candidates, ambiguous: false, confidence: 1.0, tiebreakSoftkeys: null };
  }
  if (candidates.length === 0) {
    return { match: null, candidates: [], ambiguous: false, confidence: 0, tiebreakSoftkeys: null };
  }
  // ambiguous: several field-less screens share the empty Edit-signature. FIRST try the READABLE
  // Button-automationId tiebreak (no vision needed — buttons are real UIA nodes). If it resolves,
  // we have an exact match. Else fall back to the softkey-label tiebreak (which needs vision).
  const btn = disambiguateByButtons(map, candidates, liveSig.buttons);
  if (btn.match) {
    return { match: btn.match, candidates, ambiguous: false, confidence: btn.score, tiebreakSoftkeys: null, resolvedBy: "buttons" };
  }
  const tiebreakSoftkeys = {};
  for (const k of candidates) tiebreakSoftkeys[k] = screens[k].softkeys || {};
  return {
    match: null,
    candidates,
    ambiguous: true,
    confidence: +(1 / candidates.length).toFixed(3),
    tiebreakSoftkeys,
  };
}

/**
 * Disambiguate ambiguous (same-Edit-signature) candidates by their distinctive Button automationIds.
 * Buttons are READABLE UIA (unlike the graphical softkey labels), so this resolves WITHOUT vision.
 * Scores each candidate by Jaccard overlap of stored-vs-live buttons; returns the unique best ONLY if
 * it has ≥1 match AND strictly beats the runner-up. Otherwise {match:null} → caller stays ambiguous.
 * Backward-compatible: candidates with NO stored `buttons` score 0, so a map lacking button data
 * simply never resolves here and falls through to the existing softkey path. Pure.
 */
export function disambiguateByButtons(map, candidates, liveButtons) {
  const live = new Set((liveButtons || []).filter(Boolean));
  if (live.size === 0) return { match: null, score: 0 };
  const screens = (map && map.screens) || {};
  let best = null, bestScore = 0, runnerUp = 0;
  for (const k of candidates) {
    const stored = (((screens[k] || {}).signature || {}).buttons) || [];
    if (!stored.length) continue;
    const inter = stored.filter((b) => live.has(b)).length;
    const union = new Set([...stored, ...live]).size;
    const score = union ? inter / union : 0;
    if (score > bestScore) { runnerUp = bestScore; bestScore = score; best = k; }
    else if (score > runnerUp) { runnerUp = score; }
  }
  return (best && bestScore > 0 && bestScore > runnerUp)
    ? { match: best, score: +bestScore.toFixed(3) }
    : { match: null, score: +bestScore.toFixed(3) };
}

/** Given observed softkey labels (from vision), pick the candidate whose stored labels match best. */
export function disambiguateBySoftkeys(map, candidates, observedLabels) {
  const wanted = (observedLabels || []).map((s) => String(s).toUpperCase().replace(/\s+/g, " ").trim());
  let best = null, bestScore = -1;
  for (const k of candidates) {
    const labels = Object.values((map.screens[k] || {}).softkeys || {}).map((s) =>
      String(s).toUpperCase().replace(/\s+/g, " ").trim()
    );
    const score = labels.filter((l) => wanted.includes(l)).length;
    if (score > bestScore) { bestScore = score; best = k; }
  }
  return { match: bestScore > 0 ? best : null, score: bestScore };
}

/** BFS shortest keystroke path between two screen keys. Returns [{key,label,to}] or null. */
export function shortestPath(map, from, to) {
  if (from === to) return [];
  const edges = (map && Array.isArray(map.transitions)) ? map.transitions : [];
  const adj = new Map();
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from).push(e);
  }
  const q = [from];
  const prev = new Map(); // node -> {edge, from}
  const seen = new Set([from]);
  while (q.length) {
    const cur = q.shift();
    for (const e of adj.get(cur) || []) {
      if (seen.has(e.to)) continue;
      seen.add(e.to);
      prev.set(e.to, { edge: e, from: cur });
      if (e.to === to) {
        const path = [];
        let n = to;
        while (n !== from) {
          const step = prev.get(n);
          path.unshift({ key: step.edge.key, label: step.edge.label, to: step.edge.to });
          n = step.from;
        }
        return path;
      }
      q.push(e.to);
    }
  }
  return null;
}

export function renderMap(map) {
  const lines = [`# WinMax UI Map — ${map.controller || "?"}`, ""];
  lines.push(`_${Object.keys(map.screens || {}).length} screens · ${(map.transitions || []).length} transitions · updated ${map.updated || "?"}_`, "");
  for (const [k, s] of Object.entries(map.screens || {})) {
    lines.push(`## ${k} — ${s.name || ""}`);
    lines.push(`- fingerprint: \`${fingerprint(s.signature || { edits: [] })}\` · edits: [${(s.signature?.edits || []).join(",")}]${s.signature?.hasList ? " · hasList" : ""}`);
    const sk = Object.entries(s.softkeys || {}).map(([f, l]) => `${f}=${l}`).join(" · ");
    if (sk) lines.push(`- softkeys: ${sk}`);
    if (s.blocker) lines.push(`- ⛔ blocker: ${s.blocker}`);
    const outs = (map.transitions || []).filter((t) => t.from === k).map((t) => `${t.key}→${t.to}${t.uncertain ? "?" : ""}`);
    if (outs.length) lines.push(`- exits: ${outs.join(" · ")}`);
    lines.push("");
  }
  if ((map.gaps || []).length) lines.push("## Unmapped gaps", ...map.gaps.map((g) => `- ${g}`), "");
  return lines.join("\n");
}

// ── live helpers (spawn the driver) ───────────────────────────────────────────

export function loadMap(path = DEFAULT_MAP_PATH) {
  if (!existsSync(path)) throw new Error(`map not found: ${path}`);
  return JSON.parse(readFileSync(path, "utf8"));
}
export function saveMap(map, path = DEFAULT_MAP_PATH) {
  writeFileSync(path, JSON.stringify(map, null, 2) + "\n");
}

const DRIVER_TIMEOUT_MS = 30000;

function driver(exe, args, { input } = {}) {
  const r = spawnSync(exe, args, { encoding: "utf8", input, timeout: DRIVER_TIMEOUT_MS });
  if (r.error) throw new Error(`driver spawn failed: ${r.error.message}`);
  // Scan stdout lines from the END for the first that parses to a JSON object. A .NET app may flush
  // a trailing logger/warning line after its result, so the last line is not guaranteed to be the
  // JSON — don't blindly JSON.parse it (a stray non-JSON tail would fail every probe).
  const lines = (r.stdout || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const obj = JSON.parse(lines[i]);
      if (obj && typeof obj === "object") return obj;
    } catch { /* keep scanning upward */ }
  }
  throw new Error(`driver: no parseable JSON (exit=${r.status}): ${(r.stderr || lines.join(" | ")).slice(0, 300)}`);
}

export function probeLive(exe = DEFAULT_EXE) {
  return driver(exe, ["--op", "probe", "--depth", "10", "--max-nodes", "1500"]);
}
function sendKeyLive(exe, key) {
  const r = driver(exe, ["--op", "sendkeys", key, "--allow-actions"]);
  if (r && r.ok === false) throw new Error(`sendkeys ${key} failed: ${r.error}`);
  return r;
}

export function whereamiLive(exe = DEFAULT_EXE, map = loadMap()) {
  const probe = probeLive(exe);
  const sig = signatureOf(probe);
  const res = matchScreen(map, sig);
  return { ...res, signature: sig, fingerprint: fingerprint(sig) };
}

// physical softkey presses only (e.g. "{F2}"); compound triggers like "DIAMETER+{ENTER}" need a macro
const KEYS_OK = /^\{F[1-8]\}$|^\{ESC\}$|^\{ENTER\}$/;

/**
 * Navigate to a target screen with PER-STEP verification. Sends each hop's key, re-probes, and
 * confirms the live screen is the expected next screen before continuing.
 *
 * Safety on a CNC controller: F1..F8 mean DIFFERENT things per screen, so we never press the next
 * key from an unverified screen. An exact (unambiguous) signature match continues. A field-less
 * AMBIGUOUS landing (the target is one of several empty-signature screens) is NOT rubber-stamped —
 * it is vision-confirmed via the optional `tiebreak` callback, or, if none is supplied, navigation
 * HALTS and returns `needsTiebreak` for an agent-with-vision to resolve. Any other landing = drift = STOP.
 *
 * @param tiebreak optional async (candidates, tiebreakSoftkeys, expected) => confirmedScreenKey|null
 */
export async function navigateLive(target, { exe = DEFAULT_EXE, map = loadMap(), execute = true, sleepMs = 700, tiebreak = null } = {}) {
  const here = whereamiLive(exe, map);
  if (!here.match) {
    return {
      ok: false,
      reason: here.ambiguous ? "ambiguous-start" : "unknown-start",
      needsTiebreak: here.ambiguous ? { candidates: here.candidates, tiebreakSoftkeys: here.tiebreakSoftkeys } : null,
      here,
    };
  }
  const path = shortestPath(map, here.match, target);
  if (path === null) return { ok: false, reason: `no path ${here.match} -> ${target}`, here };
  if (path.length === 0) return { ok: true, from: here.match, target, steps: [], note: "already there" };
  if (!execute) return { ok: true, from: here.match, target, planned: path, executed: false };

  const steps = [];
  for (const hop of path) {
    if (!KEYS_OK.test(hop.key)) {
      return { ok: false, reason: `non-softkey transition '${hop.key}' to ${hop.to} needs a recorded macro`, steps };
    }
    sendKeyLive(exe, hop.key);
    await new Promise((r) => setTimeout(r, sleepMs));
    const now = whereamiLive(exe, map);
    if (now.match === hop.to) {
      steps.push({ key: hop.key, expected: hop.to, got: hop.to, verified: "exact" });
      continue;
    }
    if (now.ambiguous && now.candidates.includes(hop.to)) {
      if (tiebreak) {
        const confirmed = await tiebreak(now.candidates, now.tiebreakSoftkeys, hop.to);
        if (confirmed === hop.to) { steps.push({ key: hop.key, expected: hop.to, got: confirmed, verified: "vision" }); continue; }
        return { ok: false, reason: `tiebreak drift after ${hop.key}: expected ${hop.to}, vision says ${confirmed}`, steps };
      }
      steps.push({ key: hop.key, expected: hop.to, got: `ambiguous[${now.candidates.join("|")}]`, verified: "none" });
      return {
        ok: false,
        reason: `ambiguous landing after ${hop.key} — vision tiebreak needed (target ${hop.to} is field-less)`,
        needsTiebreak: { expected: hop.to, candidates: now.candidates, tiebreakSoftkeys: now.tiebreakSoftkeys },
        steps,
      };
    }
    steps.push({ key: hop.key, expected: hop.to, got: now.match || `?[${now.candidates.join("|")}]`, verified: "none" });
    return { ok: false, reason: `drift after ${hop.key}: expected ${hop.to}, got ${now.match || now.candidates.join("|") || "unknown"}`, steps };
  }
  return { ok: true, from: here.match, target, steps };
}

/**
 * Structured navigation-path envelope for the `path` CLI verb. PURE.
 * winmax-course-run.mjs's `nav` op consumes `{ok, keys}` — `keys` is the ordered softkey list to
 * emit ({F1},{F2}…). The raw shortestPath() returns a bare `[{key,label,to}]` array (or null), which
 * has no `.ok`/`.keys` and broke the consumer (U-WINMAX-NAV-PATH-CONTRACT). This wraps it into the
 * envelope the consumer expects. `hops:0` / `keys:[]` with `ok:true` = already at target.
 * @returns {{ok:boolean, from:string, to:string, keys:string[], steps:Array, hops:number, error?:string}}
 */
export function pathResult(map, from, to) {
  const steps = shortestPath(map, from, to);
  if (steps === null) return { ok: false, from, to, error: `no path ${from} -> ${to}`, keys: [], steps: [], hops: 0 };
  return { ok: true, from, to, keys: steps.map((s) => s.key), steps, hops: steps.length };
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function parseSoftkeys(s) {
  const out = {};
  for (const pair of String(s || "").split(",")) {
    const [f, ...rest] = pair.split("=");
    if (f && rest.length) out[f.trim()] = rest.join("=").trim();
  }
  return out;
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const exe = DEFAULT_EXE;
  if (cmd === "whereami") {
    // SINGLE-LINE JSON envelope: winmax-course-run.mjs#mapCli parses the LAST stdout line, so a
    // multi-line pretty-print (null,2) was unparseable → here.match was always undefined → nav broke.
    const w = whereamiLive(exe);
    console.log(JSON.stringify({ ok: !!(w && w.match), ...w }));
  } else if (cmd === "path") {
    const [from, to] = rest;
    console.log(JSON.stringify(pathResult(loadMap(), from, to)));
  } else if (cmd === "navigate") {
    const target = rest[0];
    const execute = !rest.includes("--plan");
    console.log(JSON.stringify(await navigateLive(target, { exe, execute })));
  } else if (cmd === "record-screen") {
    const name = rest[0];
    const skIdx = rest.indexOf("--softkeys");
    const softkeys = skIdx >= 0 ? parseSoftkeys(rest[skIdx + 1]) : {};
    const map = loadMap();
    const sig = signatureOf(probeLive(exe));
    map.screens[name] = { ...(map.screens[name] || {}), name: map.screens[name]?.name || name, softkeys: { ...(map.screens[name]?.softkeys || {}), ...softkeys }, signature: sig };
    map.updated = process.env.PRISM_AUDIT_FROZEN_TIME || new Date().toISOString();
    saveMap(map);
    console.log(`recorded ${name}: fingerprint=${fingerprint(sig)} edits=[${sig.edits.join(",")}] hasList=${sig.hasList}`);
  } else if (cmd === "record-transition") {
    const [from, key, to, ...label] = rest;
    const map = loadMap();
    map.transitions = map.transitions || [];
    if (!map.transitions.some((t) => t.from === from && t.key === key && t.to === to)) {
      map.transitions.push({ from, key, to, label: label.join(" ") || "", observed: true });
      map.updated = process.env.PRISM_AUDIT_FROZEN_TIME || new Date().toISOString();
      saveMap(map);
      console.log(`+ transition ${from} --${key}--> ${to}`);
    } else console.log("transition already present");
  } else if (cmd === "render") {
    console.log(renderMap(loadMap()));
  } else if (cmd === "list") {
    const map = loadMap();
    for (const [k, s] of Object.entries(map.screens)) console.log(`${k.padEnd(18)} fp=${fingerprint(s.signature || { edits: [] })} edits=[${(s.signature?.edits || []).join(",")}]`);
  } else {
    console.log("usage: winmax-ui-map.mjs whereami|path <from> <to>|navigate <to> [--plan]|record-screen <NAME> [--softkeys 'F1=..,F2=..']|record-transition <from> <key> <to> [label]|render|list");
    process.exit(cmd ? 1 : 0);
  }
}

// Guard process.argv[1]: it is undefined under `node -e`/dynamic import (no script path), where the
// old unguarded .replace() threw and crashed the module on import. Only run main() when invoked as a CLI.
const _argv1 = process.argv[1];
if ((_argv1 && import.meta.url === `file://${_argv1.replace(/\\/g, "/")}`) || _argv1?.endsWith("winmax-ui-map.mjs")) {
  main().catch((e) => { console.error(String(e.message || e)); process.exit(1); });
}
