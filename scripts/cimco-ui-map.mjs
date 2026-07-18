#!/usr/bin/env node
/**
 * cimco-ui-map.mjs — CIMCO Edit 2026 ribbon as a navigable finite state machine. slot:echo.
 * U-CIMCO-SIM-3 (CIMCO-INTEGRATION-MS0).
 *
 * WHY: driving the CIMCO Machine-Simulation ribbon by "invoke -> hope -> invoke" is the exact
 * brittleness spec §A2 caught live ("tab-invoke intermittently fails when the ribbon isn't built
 * yet"). This turns the ribbon into a graph: screens=states, accDoDefaultAction invokes=transitions.
 * Then:
 *   - `whereami`         identify the CURRENT ribbon screen from a cheap `--op map` read (NO vision)
 *   - `path A B`         BFS shortest invoke sequence between two screens
 *   - `navigate B`       whereami -> path -> invoke each control, RE-PROBING after each hop to confirm
 *                        the expected screen (per-step verify => never gets lost; STOPS loud on drift)
 *   - `record-screen`    probe the live ribbon + upsert its discriminator into the map
 *   - `record-transition` add a from-control-to edge
 *
 * Screen identity (CIMCO vs WinMax — the inverse problem): WinMax fingerprints by Edit AutomationIds
 * because its softkeys are graphical (0 UIA text). CIMCO's Codejock XTP ribbon exposes ~1530 NAMED,
 * READABLE MSAA controls (accName + defaultAction; proven live spec §A7). So a CIMCO screen is
 * fingerprinted by the set of distinctive NAMED controls present in a `--op map` read — the exe walks
 * only controls present in the current ribbon state, so a discriminator control's PRESENCE identifies
 * the screen. Transitions are accDoDefaultAction invokes (--op invoke --name <X>), not F-keys. No
 * vision tiebreak needed (names are readable). This is NOT a duplicate of cimco-nav-map.mjs (the
 * static 511-surface catalog: loadNavMap/queryNav/resolveNav) or cimco-nav-planner.mjs (the job-step
 * planner) or route-map/api-route-map (HTTP routes) — it is the live CIMCO ribbon navigation FSM.
 *
 * Pure core (signatureOf/fingerprint/matchScreen/shortestPath/pathResult/renderMap) is exported and
 * fixture-unit-tested in cimco-ui-map.test.mjs; only the *Live helpers spawn PrismCimcoUI.exe.
 *
 * SAFETY (spec §A4/§B/§E): never invoke from an unverified/unrealized screen; a blocked/drifted/
 * unrealized result NEVER reports ok:true or counts as a verified hop; `--allow-actions` is passed
 * ONLY on the invoke call (the exe's MotionDeny list is the motion backstop); mock/fixture-only this
 * unit — live navigation is U-CIMCO-SIM-5, operator-supervised.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_MAP_PATH = resolve(__dirname, "../state/shared/cimco/cimco-ui-map.json");
export const DEFAULT_EXE = resolve(
  __dirname,
  "../mcp-server/data/posts/prism-base/cimco-bridge/ui-driver/PrismCimcoUI.exe",
);

// Ribbon-realization floor (spec §A4/§B): a cold BACKGROUND launch never realizes the Codejock XTP
// accessibility tree — a `--op map` then returns only window chrome (~15-21 nodes). A real interactive
// session walks 1530. Below this floor the ribbon is unrealized and navigation MUST NOT proceed to a
// verdict on an unbuilt window. 50 is a conservative middle ground (well above chrome, well below 1530).
export const REALIZATION_FLOOR = 50;

// Window-chrome control names carry NO screen identity (every screen has them) — exclude so the
// control-name signature discriminates the SCREEN.
const CHROME_NAME = /^(Minimize|Maximize|Restore|Close|System|Application|Move|Size)$/i;

// ── pure core ───────────────────────────────────────────────────────────────

/** Distinctive named controls from a `--op map` envelope (chrome excluded, deduped, sorted). Pure. */
export function distinctiveControls(controls) {
  const names = (Array.isArray(controls) ? controls : [])
    .map((c) => String((c && c.name) || ""))
    .filter((n) => n.length > 0 && !CHROME_NAME.test(n));
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

/**
 * Extract the discriminating signature from a `--op map` result object.
 * @returns {{controls:string[], controlCount:number, realized:boolean, ok:boolean}}
 */
export function signatureOf(mapResult) {
  const ok = !!(mapResult && mapResult.ok);
  const controlsArr = (mapResult && Array.isArray(mapResult.controls)) ? mapResult.controls : [];
  const controls = distinctiveControls(controlsArr);
  // The realization floor is judged on the RAW walked control count (`walked`), NOT the deduped/
  // filtered `count` and NOT the chrome-filtered set — so a ribbon that is realized but happens to
  // dedup to few distinct controls is still "realized". Fall back walked → count → array length, each
  // guarded by Number.isFinite (a string/absent value never coerces, falls through to the next).
  const rawCount = Number.isFinite(mapResult?.walked) ? mapResult.walked
    : Number.isFinite(mapResult?.count) ? mapResult.count
    : controlsArr.length;
  const realized = ok && rawCount >= REALIZATION_FLOOR;
  return { controls, controlCount: rawCount, realized, ok };
}

/** Stable short hash of a signature's control-name set (order-independent). */
export function fingerprint(sig) {
  const norm = [...((sig && sig.controls) || [])].sort((a, b) => a.localeCompare(b));
  return createHash("sha1").update(JSON.stringify(norm)).digest("hex").slice(0, 12);
}

/**
 * Does a live signature satisfy a stored screen's discriminator? A screen matches when ALL of its
 * `discriminator` control names are present in the live control set (subset containment) AND NONE of
 * its `discriminatorAbsent` names are present. The `discriminatorAbsent` guard makes superset states
 * mutually exclusive: `backplot` (sim NOT engaged) requires the sim-only controls (Solid Model / Show
 * Machine Origin) ABSENT, so a running ribbon — which keeps the Backplot controls AND adds the sim
 * controls — matches ONLY `machine-sim-running`, never `backplot`. Without this, the FSM would mis-ID
 * the running state as backplot and re-invoke "Machine Simulation" from an already-running state
 * (reviewer-caught 2026-06-08). A screen with an empty discriminator never matches (no catch-all). Pure.
 */
export function screenMatches(storedScreen, liveSig) {
  const disc = (storedScreen && Array.isArray(storedScreen.discriminator)) ? storedScreen.discriminator : [];
  if (disc.length === 0) return false;
  const live = new Set((liveSig && liveSig.controls) || []);
  if (!disc.every((d) => live.has(d))) return false;
  const absent = (storedScreen && Array.isArray(storedScreen.discriminatorAbsent)) ? storedScreen.discriminatorAbsent : [];
  return absent.every((a) => !live.has(a)); // none of the must-be-absent controls may be present
}

/**
 * Match a live signature against the map's screens.
 * @returns {{match:string|null, candidates:string[], ambiguous:boolean, confidence:number,
 *            unrealized:boolean}}
 */
export function matchScreen(map, liveSig) {
  // Realization gate FIRST (spec §A4/§B): an unrealized ribbon is never a screen match.
  if (!liveSig || !liveSig.realized) {
    return { match: null, candidates: [], ambiguous: false, confidence: 0, unrealized: true };
  }
  const screens = (map && map.screens) || {};
  const candidates = Object.keys(screens).filter((k) => screenMatches(screens[k], liveSig));
  if (candidates.length === 1) {
    return { match: candidates[0], candidates, ambiguous: false, confidence: 1.0, unrealized: false };
  }
  if (candidates.length === 0) {
    return { match: null, candidates: [], ambiguous: false, confidence: 0, unrealized: false };
  }
  // Multiple discriminator-subset matches. Prefer the MOST SPECIFIC (largest discriminator that still
  // matches) — a more-specific screen subsumes a less-specific one. Unique winner => resolved.
  let best = null, bestLen = -1, tie = false;
  for (const k of candidates) {
    const len = (screens[k].discriminator || []).length;
    if (len > bestLen) { bestLen = len; best = k; tie = false; }
    else if (len === bestLen) { tie = true; }
  }
  if (best && !tie) {
    // A specificity-resolved match is weaker evidence than a lone exact match — discount its
    // confidence (0.9) so a downstream consumer that gates on confidence treats it more cautiously.
    return { match: best, candidates, ambiguous: false, confidence: 0.9, unrealized: false, resolvedBy: "specificity" };
  }
  return { match: null, candidates, ambiguous: true, confidence: +(1 / candidates.length).toFixed(3), unrealized: false };
}

/** BFS shortest invoke path between two screen keys. Returns [{key,label,to}] or null. */
export function shortestPath(map, from, to) {
  if (from === to) return [];
  const edges = (map && Array.isArray(map.transitions)) ? map.transitions : [];
  const adj = new Map();
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from).push(e);
  }
  const q = [from];
  const prev = new Map();
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

/**
 * Structured navigation-path envelope for the `path` CLI verb. PURE.
 * `keys` is the ordered control-name list to invoke. `hops:0` / `keys:[]` with `ok:true` = already at
 * target. Mirrors winmax-ui-map.pathResult's contract.
 * @returns {{ok:boolean, from:string, to:string, keys:string[], steps:Array, hops:number, error?:string}}
 */
export function pathResult(map, from, to) {
  const steps = shortestPath(map, from, to);
  if (steps === null) return { ok: false, from, to, error: `no path ${from} -> ${to}`, keys: [], steps: [], hops: 0 };
  return { ok: true, from, to, keys: steps.map((s) => s.key), steps, hops: steps.length };
}

export function renderMap(map) {
  const lines = [`# CIMCO Edit UI Map — ${map.controller || "?"}`, ""];
  lines.push(`_${Object.keys(map.screens || {}).length} screens · ${(map.transitions || []).length} transitions · updated ${map.updated || "?"}_`, "");
  for (const [k, s] of Object.entries(map.screens || {})) {
    lines.push(`## ${k} — ${s.name || ""}`);
    lines.push(`- discriminator: [${(s.discriminator || []).join(", ")}]`);
    const outs = (map.transitions || []).filter((t) => t.from === k).map((t) => `${t.key}→${t.to}${t.uncertain ? "?" : ""}`);
    if (outs.length) lines.push(`- exits: ${outs.join(" · ")}`);
    if (s.note) lines.push(`- _${s.note}_`);
    lines.push("");
  }
  if ((map.gaps || []).length) lines.push("## Unmapped gaps", ...map.gaps.map((g) => `- ${g}`), "");
  return lines.join("\n");
}

// ── live helpers (spawn the driver) ───────────────────────────────────────────

export function loadMap(path = DEFAULT_MAP_PATH) {
  if (!existsSync(path)) throw new Error(`cimco-ui-map not found: ${path}`);
  return JSON.parse(readFileSync(path, "utf8"));
}
export function saveMap(map, path = DEFAULT_MAP_PATH) {
  writeFileSync(path, JSON.stringify(map, null, 2) + "\n");
}

const DRIVER_TIMEOUT_MS = 30_000;

/**
 * Spawn PrismCimcoUI.exe and parse its JSON-on-stdout contract. Scans stdout lines from the END for
 * the first that parses to an object (a .NET app may flush a trailing logger line after its result).
 * `spawn` is injectable for tests. Throws on spawn error / no parseable JSON (fail-closed).
 */
export function driver(exe, args, spawn = spawnSync) {
  const r = spawn(exe, args, { encoding: "utf8", timeout: DRIVER_TIMEOUT_MS, windowsHide: false });
  // status===null ⇒ killed by the spawnSync timeout. Fail CLOSED on ANY timeout-kill, even if partial
  // stdout was flushed before the kill — a timed-out driver's output is untrustworthy (a stale/partial
  // JSON line fed into matchScreen could mis-confirm a hop on a safety-critical sim). Reviewer-caught
  // 2026-06-08: the earlier `&& !r.stdout` let a partial-stdout timeout slip a stale result through.
  if (r.status === null) {
    throw new Error(`driver timed out after ${DRIVER_TIMEOUT_MS}ms (op=${args.join(" ")}) — result untrustworthy, fail-closed`);
  }
  if (r.error) throw new Error(`driver spawn failed: ${r.error.message}`);
  const lines = String(r.stdout || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const obj = JSON.parse(lines[i]);
      if (obj && typeof obj === "object") return obj;
    } catch { /* keep scanning upward */ }
  }
  throw new Error(`driver: no parseable JSON (exit=${r.status}): ${(r.stderr || lines.join(" | ")).slice(0, 300)}`);
}

export function probeLive(exe = DEFAULT_EXE, spawn = spawnSync) {
  return driver(exe, ["--op", "map"], spawn);
}

/**
 * Invoke a named ribbon control via accDoDefaultAction. Surfaces the exe's result faithfully — a
 * `blocked:true` (8s-watchdog modal signal, spec §A7) or `ok:false` is RETURNED, never swallowed into
 * a success. `--allow-actions` is required by the exe to invoke (operator-supervised gate).
 */
export function invokeLive(exe, name, spawn = spawnSync) {
  const r = driver(exe, ["--op", "invoke", "--name", name, "--allow-actions"], spawn);
  return r; // caller inspects r.ok / r.blocked — invoke effect is never auto-trusted (effectUnverified)
}

export function whereamiLive(exe = DEFAULT_EXE, map = loadMap(), spawn = spawnSync) {
  const probe = probeLive(exe, spawn);
  const sig = signatureOf(probe);
  const res = matchScreen(map, sig);
  return { ...res, signature: sig, fingerprint: fingerprint(sig) };
}

/**
 * Navigate to a target screen with PER-STEP verification. Invokes each hop's control, re-probes, and
 * confirms the live screen is the expected next screen before continuing.
 *
 * Safety on a CNC sim: the SAME control name can mean different things per ribbon state, so we never
 * invoke the next control from an unverified screen. An unrealized ribbon HALTS immediately
 * (needsRealization). An exact match continues. Any other landing = drift = STOP loud. A `blocked`
 * invoke (a modal opened) HALTS — the orchestrator handles modals out-of-band; it is never a verified
 * hop.
 *
 * @param {function} spawn injectable spawnSync (for tests)
 * @param {number} sleepMs settle delay between invoke and re-probe (the sim engine loads ~388 MB)
 */
export async function navigateLive(target, { exe = DEFAULT_EXE, map = loadMap(), execute = true, sleepMs = 1200, spawn = spawnSync } = {}) {
  const here = whereamiLive(exe, map, spawn);
  if (here.unrealized) {
    return { ok: false, reason: "ribbon-uia-unrealized", needsRealization: true, here };
  }
  if (!here.match) {
    return {
      ok: false,
      reason: here.ambiguous ? "ambiguous-start" : "unknown-start",
      candidates: here.candidates,
      here,
    };
  }
  if (!(map.screens && map.screens[target])) {
    return { ok: false, reason: `unknown target screen '${target}'`, here };
  }
  const path = shortestPath(map, here.match, target);
  if (path === null) return { ok: false, reason: `no path ${here.match} -> ${target}`, here };
  if (path.length === 0) return { ok: true, from: here.match, target, steps: [], note: "already there" };
  if (!execute) return { ok: true, from: here.match, target, planned: path, executed: false };

  const steps = [];
  for (const hop of path) {
    const inv = invokeLive(exe, hop.key, spawn);
    if (inv && inv.ok === false) {
      steps.push({ key: hop.key, expected: hop.to, got: "invoke-failed", verified: "none" });
      return { ok: false, reason: `invoke '${hop.key}' failed: ${inv.error || "unknown"}`, steps };
    }
    if (inv && inv.blocked) {
      // A modal opened (spec §A7). The orchestrator handles it out-of-band; this is NOT a verified hop.
      steps.push({ key: hop.key, expected: hop.to, got: "blocked-modal", verified: "none" });
      return { ok: false, reason: `invoke '${hop.key}' blocked (modal opened) — handle out-of-band, not a verified transition`, blocked: true, steps };
    }
    await new Promise((r) => setTimeout(r, sleepMs));
    const now = whereamiLive(exe, map, spawn);
    if (now.unrealized) {
      steps.push({ key: hop.key, expected: hop.to, got: "unrealized", verified: "none" });
      return { ok: false, reason: `ribbon unrealized after invoking '${hop.key}'`, needsRealization: true, steps };
    }
    if (now.match === hop.to) {
      steps.push({ key: hop.key, expected: hop.to, got: hop.to, verified: "exact" });
      continue;
    }
    steps.push({ key: hop.key, expected: hop.to, got: now.match || `?[${now.candidates.join("|")}]`, verified: "none" });
    return { ok: false, reason: `drift after '${hop.key}': expected ${hop.to}, got ${now.match || now.candidates.join("|") || "unknown"}`, steps };
  }
  return { ok: true, from: here.match, target, steps };
}

// ── CLI ───────────────────────────────────────────────────────────────────────

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const exe = DEFAULT_EXE;
  if (cmd === "whereami") {
    const w = whereamiLive(exe);
    process.stdout.write(JSON.stringify({ ok: !!(w && w.match), ...w }) + "\n");
  } else if (cmd === "path") {
    const [from, to] = rest;
    process.stdout.write(JSON.stringify(pathResult(loadMap(), from, to)) + "\n");
  } else if (cmd === "navigate") {
    const target = rest[0];
    const execute = !rest.includes("--plan");
    process.stdout.write(JSON.stringify(await navigateLive(target, { exe, execute })) + "\n");
  } else if (cmd === "record-screen") {
    const name = rest[0];
    const discIdx = rest.indexOf("--discriminator");
    const disc = discIdx >= 0 ? String(rest[discIdx + 1] || "").split(",").map((s) => s.trim()).filter(Boolean) : null;
    const map = loadMap();
    const sig = signatureOf(probeLive(exe));
    // If no explicit discriminator given, seed it with the live control set (operator narrows later).
    // A full-set seed (~1500 names) is brittle — it pins to one exact ribbon state and any minor delta
    // drops a name and breaks the match. That fails SAFE (matches too little, never too much), but warn
    // loudly so the operator narrows it before relying on the screen.
    const seedDisc = disc || (map.screens[name]?.discriminator) || sig.controls;
    if (!disc && !map.screens[name]?.discriminator && sig.controls.length > 8) {
      process.stderr.write(`WARN: seeded '${name}' with ${sig.controls.length} controls — narrow via --discriminator 'A,B' before relying on this screen.\n`);
    }
    map.screens[name] = {
      ...(map.screens[name] || {}),
      name: map.screens[name]?.name || name,
      discriminator: seedDisc,
    };
    map.updated = process.env.PRISM_AUDIT_FROZEN_TIME || new Date().toISOString().slice(0, 10);
    saveMap(map);
    process.stdout.write(`recorded ${name}: fingerprint=${fingerprint(sig)} controls=${sig.controlCount} realized=${sig.realized}\n`);
  } else if (cmd === "record-transition") {
    const [from, key, to, ...label] = rest;
    const map = loadMap();
    map.transitions = map.transitions || [];
    if (!map.transitions.some((t) => t.from === from && t.key === key && t.to === to)) {
      map.transitions.push({ from, key, to, label: label.join(" ") || "", observed: true });
      map.updated = process.env.PRISM_AUDIT_FROZEN_TIME || new Date().toISOString().slice(0, 10);
      saveMap(map);
      process.stdout.write(`+ transition ${from} --[${key}]--> ${to}\n`);
    } else process.stdout.write("transition already present\n");
  } else if (cmd === "render") {
    process.stdout.write(renderMap(loadMap()) + "\n");
  } else if (cmd === "list") {
    const map = loadMap();
    for (const [k, s] of Object.entries(map.screens || {})) {
      process.stdout.write(`${k.padEnd(22)} disc=[${(s.discriminator || []).join(",")}]\n`);
    }
  } else {
    process.stdout.write("usage: cimco-ui-map.mjs whereami|path <from> <to>|navigate <to> [--plan]|record-screen <NAME> [--discriminator 'A,B']|record-transition <from> <name> <to> [label]|render|list\n");
    process.exit(cmd ? 1 : 0);
  }
}

// Only run main() when invoked directly (not when imported by the test). Guard argv[1]: it is
// undefined under dynamic import, where an unguarded compare would mis-fire.
const _argv1 = process.argv[1];
if (_argv1 && resolve(_argv1) === resolve(fileURLToPath(import.meta.url))) {
  main().catch((e) => { process.stderr.write(String(e.message || e) + "\n"); process.exit(1); });
}
