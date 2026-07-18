#!/usr/bin/env node
/**
 * vault-to-gnn-refpool.mjs -- feed the NN/GNN reference pool from CONFIRMED
 * vault wiring decisions (OBSIDIAN-AI-SYNERGY, slot:kilo 2026-06-09).
 *
 * THE GAP THIS CLOSES: nn-graph-eval.mjs buildHoldout() builds its leave-out
 * holdout from graph nodes where kind==="ghost.unwired-engine" AND
 * isValidDispatcher(proposed_wiring) AND confidence>=refMinConf (0.8). The pool
 * has been STARVED (PSN leg #10 "full-coverage pending ref-pool growth"): the
 * only seeder, seed-ghost-from-unwired.mjs, labels by KEYWORD INFERENCE (guess
 * the dispatcher from the engine name) -- many guesses land below 0.8, and a
 * guess is not ground truth. Meanwhile the Obsidian vault holds ~hundreds of
 * memories recording ACTUAL confirmed wirings ("XEngine wired into prism_Y")
 * -- human/Claude-verified labels at higher trust than any keyword guess.
 *
 * This feeder mines those CONFIRMED wirings and emits them as high-confidence
 * ghost.unwired-engine reference nodes, in the SAME node shape + via the SAME
 * idempotent graph-merge path as seed-ghost-from-unwired.mjs (imported, NOT
 * duplicated -- one graph-writer pattern, no second 542MB writer to contend).
 *
 * DISTINCT from mine-india-transcripts.mjs (in-flight peer work): that miner
 * reads session transcripts -> vault. THIS reads vault -> GNN ref-pool. They
 * compose (miner grows the vault; this turns vault labels into the gate input)
 * and never touch the same files.
 *
 * CONFIRMED vs SPECULATIVE (R12 -- a wrong label poisons the GNN worse than no
 * label): only lines asserting a COMPLETED wiring are extracted
 * ("wired into/to prism_X", "bound to prism_X", "registered in prism_X").
 * Speculative audit follow-ups ("verify X is wired", "X should be wired",
 * "is X wired?") are EXCLUDED -- they are questions, not ground truth.
 *
 * Node id namespace: `ghost.vault-wired.<Engine>` (distinct from the keyword
 * seeder's `ghost.unwired.<Engine>`) so --revert targets only vault-sourced
 * ghosts and the two seeders never id-collide.
 *
 * Usage:
 *   node scripts/vault-to-gnn-refpool.mjs              # dry-run (default): show extracted labels
 *   node scripts/vault-to-gnn-refpool.mjs --json       # machine-readable dry-run
 *   node scripts/vault-to-gnn-refpool.mjs --apply      # merge ghosts into system-graph.json
 *   node scripts/vault-to-gnn-refpool.mjs --revert     # remove vault-sourced ghosts only
 *
 * The --apply path reads the ~542 MB system-graph.json; run with the big-heap
 * node (NODE_OPTIONS=--max-old-space-size=24576) like the other graph writers.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { isValidDispatcher } from "./seed-ghost-gnn-classify.mjs";
import { mcpToolToDispNodeId } from "./seed-ghost-from-unwired.mjs";
// The merged system-graph.json is >512 MB -- past V8's max string length, so
// JSON.parse(readFileSync(...,"utf8")) throws ERR_STRING_TOO_LONG (the same cap
// that broke the tribal index). seed-ghost-from-unwired.mjs's --apply path still
// uses the naive read and is itself broken at this size; its --revert path
// already uses readGraphStreaming. We use the Buffer-based streaming read+write
// (scripts/lib/graph-io.mjs) for BOTH paths so the feeder works on the live graph.
import { readGraphStreaming, writeGraphStreamingAtomic } from "./lib/graph-io.mjs";
import { mergeGhostsIntoGraph, ghostContentEqual } from "./lib/refpool-merge.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GRAPH_PATH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
// Pre-extracted vault wiring entries (committed by U-INDIA-VAULT-SEED-WIRE). This JSONL
// is the structured complement to the prose-scan: entries here were extracted from vault
// memories that may not match the WIRING_ASSERTION_RE pattern (e.g. the assertion phrase
// is absent or the text was pre-processed). Loaded by loadVaultSourcesJsonl() and merged
// with the prose-scan results -- dedup by label (first-seen wins, same as collectVaultWirings).
const VAULT_SOURCES_JSONL = path.join(ROOT, "state", "shared", "nn-graph", "gnn-refpool-vault-sources.jsonl");

const VAULT_MEM_DIRS = [
  path.join(ROOT, "knowledge", "memories", "reference"),
  path.join(ROOT, "knowledge", "memories", "feedback"),
];

// Confidence for a confirmed vault wiring. ABOVE the 0.8 refMinConf gate so the
// label enters the reference pool. Confirmed-by-a-human-decision beats the
// keyword seeder's 0.5-0.85 guesses; held just under 0.9 to leave headroom for
// a future "post-ship + test-verified" tier.
const CONFIRMED_CONFIDENCE = 0.85;

// A COMPLETED-wiring assertion: the verb phrase + the prism_X it names. We anchor
// on THIS (not on the engine) and walk back to the nearest preceding ...Engine in
// the same sentence (nearestEngineBefore). The old fixed-`{0,40}`-gap,
// `[A-Z]`-anchored regex under-caught by ~5x on the live vault (10 of 51 lines):
// it missed (a) `<Engine> (long parenthetical) wired to prism_X` once the `(...)`
// blew the 40-char window, and (b) camelCase-lowercase-first engines
// (`hsmAdvisorXEngine`). Anchor-on-assertion fixes both WITHOUT a blindly-wider
// gap's cross-pairing risk: each verb→dispatcher assertion is paired with ITS OWN
// nearest subject, so a multi-engine line ("FooEngine ... wired to prism_a;
// BarEngine wired to prism_b") yields the two CORRECT pairs, never a cross-pair.
// (The eliminated `{0,40}` was the old ENGINE->verb gap, now replaced by the
// sentence/clause-bounded walk-back; the `{0,30}` below is the SEPARATE, retained
// VERB->dispatcher gap -- two different spans, not a 40->30 narrowing.)
const WIRING_ASSERTION_RE =
  /\b(wired\s+(?:in|into|to)|bound\s+to|registered\s+(?:in|to|under))\b[^.\n]{0,30}?\b(prism_[a-z_]+)\b/g;

// An ...Engine token. The capital-E "Engine" suffix (with >=1 char before it) is
// the discriminator; the FIRST char may be lower-case to catch camelCase
// singletons (hsmAdvisorComparatorBridgeEngine). Plain "engine" never matches.
const ENGINE_TOKEN_RE = /\b[A-Za-z][A-Za-z0-9]*Engine\b/g;

// Speculative/interrogative phrasing that must NEVER be read as a confirmation,
// even if it also contains an Engine + prism_X on the same line. Applied per-LINE
// (whole line dropped) -- conservative by design (R12: a wrong label poisons the
// GNN worse than no label, so we'd rather drop a line that mixes a confirmation
// with a question than risk reading the question as ground truth).
const SPECULATIVE_RE = /\b(verify|should be|needs? to be|is\s+\w+\s+wired|todo|tbd|may be|might be|pending|not yet|unwired|missing)\b/i;

/** Reason string for the matched wiring verb (preserves the prior tag wording). */
function reasonForVerb(verb) {
  if (/^bound/.test(verb)) return "vault: 'bound to' confirmation";
  if (/^registered/.test(verb)) return "vault: 'registered in' confirmation";
  return "vault: 'wired into' confirmation";
}

/**
 * The nearest ...Engine token that is the SUBJECT of a wiring assertion ending
 * at `endIdx`. Returns the engine name, or null when the assertion has no named
 * engine subject (e.g. "the actions wired in prism_ai as xproc_route_query").
 *
 * The search window before the verb is bounded so a far/unrelated engine is never
 * stolen as a false label (R12 -- a wrong engine->dispatcher label poisons the GNN
 * worse than no label):
 *  - SENTENCE bound: never cross a '.' before the verb (an engine named in a prior
 *    sentence is not the subject of this assertion).
 *  - CLAUSE bound: if the verb's own clause (after the last ';' before the verb)
 *    has its OWN non-whitespace content, it carries its own subject -- do NOT reach
 *    back across the ';' (this is what stops "ZooEngine shipped; the actions wired
 *    in prism_X" from mis-labelling ZooEngine). But a whitespace-only post-';'
 *    segment (e.g. "...Engine (desc); wired to prism_X") is just stylistic
 *    separation between an engine's clause and its bare wiring assertion -- search
 *    across it so the real gain case is still caught.
 *  - PARENTHETICAL mask: a (...) span whose content is a MULTI-word phrase is a
 *    helper/descriptive mention, not the subject ("The pipeline (which calls
 *    HelperEngine) wired into prism_dev"); mask it. A TOP-LEVEL span that is JUST
 *    an engine name is an APPOSITIVE naming the subject ("Payroll filing subsystem
 *    (`PayrollLiabilityFilingEngine`) wired into prism_business") -- keep it. A
 *    bare-engine span NESTED inside another paren is never the top-level subject,
 *    so it is masked too. KNOWN LIMITATION (R12): a bare-engine appositive whose
 *    lead noun is itself another engine ("ActualEngine (AliasEngine) wired ...") is
 *    genuinely ambiguous -- the conflict-record + manual-validation pass is the
 *    backstop, not this heuristic. Unconditional masking is NOT an option: it drops
 *    the real PayrollLiabilityFilingEngine appositive label.
 */
function nearestEngineBefore(line, endIdx) {
  const dot = line.lastIndexOf(".", endIdx - 1);
  let start = dot >= 0 ? dot + 1 : 0;
  const semi = line.lastIndexOf(";", endIdx - 1);
  if (semi >= start && line.slice(semi + 1, endIdx).trim() !== "") start = semi + 1;
  // Mask each balanced paren span to equal-length spaces (indices stay stable),
  // EXCEPT a TOP-LEVEL span that is just a bare (optionally-backticked) engine name
  // -- a subject-naming appositive. A nested span (depth>0 at its offset) is never
  // the top-level subject, so it is masked even when it is a bare engine.
  const preRaw = line.slice(start, endIdx);
  const pre = preRaw.replace(/\(([^()]*)\)/g, (full, inner, offset) => {
    const before = preRaw.slice(0, offset);
    const depth = (before.split("(").length - 1) - (before.split(")").length - 1);
    const keep = depth === 0 && /^`?[A-Za-z][A-Za-z0-9]*Engine`?$/.test(inner.trim());
    return keep ? full : " ".repeat(full.length);
  });
  let last = null;
  ENGINE_TOKEN_RE.lastIndex = 0;
  let m;
  while ((m = ENGINE_TOKEN_RE.exec(pre)) !== null) last = m[0];
  return last;
}

/**
 * Extract confirmed { engine, dispatcher, reason, sourceFile } wiring labels
 * from a single memory file's text. Speculative lines are dropped; each kept
 * line's wiring assertions are each paired with their nearest preceding engine.
 */
export function extractConfirmedWirings(text, sourceFile = "", opts = {}) {
  const out = [];
  // R12 fail-loud: opts.speculativeSkipped (an array) collects lines that carry a
  // REAL wiring (verb + valid dispatcher + named engine) but are excluded by a
  // SPECULATIVE_RE trigger word -- otherwise a true label silently vanishes (the
  // 2026-06-24 SBOM/SyncCode drops). No collector -> original behavior (callers compat).
  const skipped = Array.isArray(opts.speculativeSkipped) ? opts.speculativeSkipped : null;
  if (typeof text !== "string" || !text) return out;
  for (const line of text.split(/\r?\n/)) {
    const speculative = SPECULATIVE_RE.test(line);
    if (speculative && !skipped) continue; // fast path: no collector -> drop as before
    WIRING_ASSERTION_RE.lastIndex = 0;
    let m;
    while ((m = WIRING_ASSERTION_RE.exec(line)) !== null) {
      const dispatcher = m[2];
      if (!isValidDispatcher(dispatcher)) continue; // only real dispatchers
      const engine = nearestEngineBefore(line, m.index);
      if (!engine) continue; // an action wired with no named engine -> not an engine ref
      if (speculative) {
        skipped.push({ engine, dispatcher, sourceFile, trigger: (line.match(SPECULATIVE_RE) || [])[1] || "" });
      } else {
        out.push({ engine, dispatcher, reason: reasonForVerb(m[1]), sourceFile });
      }
    }
  }
  return out;
}

/** Scan the vault memory dirs and return deduped confirmed wirings (first-seen wins per engine). */
export function collectVaultWirings(dirs = VAULT_MEM_DIRS) {
  const byEngine = new Map(); // engine -> { engine, dispatcher, reason, sourceFile }
  const conflicts = [];       // same engine, different dispatcher across memories
  const speculativeSkipped = []; // R12: real wirings a SPECULATIVE_RE trigger word dropped
  for (const dir of dirs) {
    let files = [];
    try { files = fs.readdirSync(dir).filter((f) => f.endsWith(".md")); }
    catch { continue; }
    for (const f of files) {
      let text = "";
      try { text = fs.readFileSync(path.join(dir, f), "utf8"); }
      catch { continue; }
      for (const w of extractConfirmedWirings(text, f, { speculativeSkipped })) {
        const prior = byEngine.get(w.engine);
        if (!prior) { byEngine.set(w.engine, w); continue; }
        if (prior.dispatcher !== w.dispatcher) {
          // R12: a label conflict is a real ambiguity -- record it and KEEP THE
          // FIRST (deterministic), do not silently pick or average.
          conflicts.push({ engine: w.engine, kept: prior.dispatcher, alsoSeen: w.dispatcher, in: w.sourceFile });
        }
      }
    }
  }
  return { wirings: [...byEngine.values()], conflicts, speculativeSkipped };
}

/** Build a ghost.unwired-engine reference node from a confirmed vault wiring. */
export function buildGhostFromVault(w) {
  const node = {
    id: `ghost.vault-wired.${w.engine}`,
    layer: "L13",
    subgroup: "unwired-engine",
    label: w.engine,
    info: `Vault-confirmed wiring: ${w.dispatcher} (confidence ${CONFIRMED_CONFIDENCE.toFixed(2)}, ${w.reason}, src ${w.sourceFile})`,
    status: "proposed",
    size: 4,
    tier: 2,
    kind: "ghost.unwired-engine",
    ghost: true,
    proposed_at: new Date().toISOString(),
    proposed_by: "vault-to-gnn-refpool.mjs",
    proposed_wiring: w.dispatcher,
    confidence: CONFIRMED_CONFIDENCE,
    reason: w.reason,
    sourceMemory: w.sourceFile,
  };
  const edge = {
    from: node.id,
    to: mcpToolToDispNodeId(w.dispatcher),
    type: "ghost-wire",
    relation: "proposed-wire",
    status: "proposed",
    intensity: CONFIRMED_CONFIDENCE,
  };
  return { node, edge };
}

/**
 * Load pre-extracted vault wiring entries from gnn-refpool-vault-sources.jsonl and
 * transform each to the same {node, edge} shape buildGhostFromVault produces.
 *
 * WHY: the JSONL holds entries whose vault source text did not match WIRING_ASSERTION_RE
 * (the assertion verb was absent or in a form the regex does not capture). They are
 * semantically equivalent confirmed wirings -- just pre-extracted rather than prose-scanned.
 *
 * Schema transform (JSONL -> buildHoldout-consumable node shape):
 *   ghost_id   -> node.id            (already the ghost.vault-wired.* namespace)
 *   label      -> node.label         (the engine name buildHoldout filters on)
 *   dispatcher -> node.proposed_wiring  (the dispatcher buildHoldout filters on via isValidDispatcher)
 *   confidence -> node.confidence    (must be >= refMinConf=0.8 to enter the ref pool)
 *   vault_path -> node.sourceMemory  (provenance)
 *
 * Returns an array of {node, edge} pairs -- identical shape to buildGhostFromVault -- so
 * main() can merge both sources with a single dedup pass. Invalid entries (missing label,
 * invalid dispatcher, non-finite confidence) are skipped with a warn (R12: no silent drops).
 *
 * PURE with respect to the graph -- never reads or writes system-graph.json.
 *
 * @param {string} [jsonlPath] path to the JSONL file (default: VAULT_SOURCES_JSONL)
 * @returns {{ghosts: Array<{node:object,edge:object}>, skipped: number, loaded: number}}
 */
export function loadVaultSourcesJsonl(jsonlPath = VAULT_SOURCES_JSONL) {
  let raw;
  try {
    raw = fs.readFileSync(jsonlPath, "utf8");
  } catch (err) {
    if (err && err.code === "ENOENT") return { ghosts: [], skipped: 0, loaded: 0, missing: true };
    throw err;
  }
  const ghosts = [];
  let skipped = 0;
  let lineNo = 0;
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    lineNo++;
    let entry;
    try { entry = JSON.parse(trimmed); }
    catch {
      console.warn(`vault-sources JSONL line ${lineNo}: invalid JSON -- skipped`);
      skipped++;
      continue;
    }
    const { ghost_id, label, dispatcher, confidence, vault_path } = entry || {};
    if (typeof label !== "string" || !label) {
      console.warn(`vault-sources JSONL line ${lineNo}: missing label -- skipped`);
      skipped++;
      continue;
    }
    if (!isValidDispatcher(dispatcher)) {
      console.warn(`vault-sources JSONL line ${lineNo}: invalid dispatcher "${dispatcher}" for ${label} -- skipped`);
      skipped++;
      continue;
    }
    if (!Number.isFinite(Number(confidence))) {
      console.warn(`vault-sources JSONL line ${lineNo}: non-finite confidence for ${label} -- skipped`);
      skipped++;
      continue;
    }
    const conf = Number(confidence);
    const nodeId = typeof ghost_id === "string" && ghost_id ? ghost_id : `ghost.vault-wired.${label}`;
    const node = {
      id: nodeId,
      layer: "L13",
      subgroup: "unwired-engine",
      label,
      info: `Vault-JSONL confirmed wiring: ${dispatcher} (confidence ${conf.toFixed(2)}, vault-sources JSONL, src ${vault_path || "gnn-refpool-vault-sources.jsonl"})`,
      status: "proposed",
      size: 4,
      tier: 2,
      kind: "ghost.unwired-engine",
      ghost: true,
      proposed_at: new Date().toISOString(),
      proposed_by: "vault-to-gnn-refpool.mjs",
      proposed_wiring: dispatcher,
      confidence: conf,
      reason: "vault-jsonl: pre-extracted confirmed wiring",
      sourceMemory: vault_path || "gnn-refpool-vault-sources.jsonl",
    };
    const edge = {
      from: nodeId,
      to: mcpToolToDispNodeId(dispatcher),
      type: "ghost-wire",
      relation: "proposed-wire",
      status: "proposed",
      intensity: conf,
    };
    ghosts.push({ node, edge });
  }
  return { ghosts, skipped, loaded: ghosts.length };
}

/**
 * Two vault ghost nodes are content-equal IGNORING the volatile `proposed_at`
 * timestamp -- i.e. they carry the same ref-pool label (dispatcher + confidence +
 * provenance). PURE. Used so a re-apply of an UNCHANGED ref-pool is a true no-op
 * (no re-stamp, no graph write) -- the durability precondition: a periodic /
 * post-regen re-apply must not churn the 542MB graph (or the retrain drift
 * fingerprint) on every run, only when a regen-viz rebuild actually wiped the refs.
 */
// Significant content fields for a vault ghost (volatile proposed_at + the constant
// scaffold fields are excluded, so a re-apply that only re-stamps proposed_at is a
// no-op). The merge itself lives in the shared scripts/lib/refpool-merge.mjs (R15
// build-once); the sibling outcome feeder uses the SAME merge with its own field list.
const VAULT_CONTENT_FIELDS = ["proposed_wiring", "confidence", "info", "reason", "sourceMemory", "label", "kind"];

/** Two vault ghost nodes are content-equal ignoring the volatile proposed_at stamp. PURE. */
export const nodeContentEqual = (a, b) => ghostContentEqual(a, b, VAULT_CONTENT_FIELDS);

/** Idempotent ADD/UPDATE merge of vault ghosts (shared lib; changed:false => caller skips the write). */
export const mergeVaultGhosts = (graph, ghosts) => mergeGhostsIntoGraph(graph, ghosts, nodeContentEqual);

function parseArgs(argv) {
  const out = { dryRun: false, apply: false, revert: false, json: false };
  for (const a of argv) {
    if (a === "--apply") out.apply = true;
    else if (a === "--revert") out.revert = true;
    else if (a === "--json") out.json = true;
    else if (a === "--help" || a === "-h") {
      console.error("usage: vault-to-gnn-refpool [--apply | --revert | --json]");
      process.exit(0);
    }
  }
  if (!out.apply && !out.revert) out.dryRun = true;
  return out;
}

export function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.revert) {
    const g = readGraphStreaming(GRAPH_PATH); // Buffer-based; no V8 string-cap throw
    const before = g.nodes.length;
    const mineIds = new Set(
      g.nodes.filter((n) => n?.proposed_by === "vault-to-gnn-refpool.mjs").map((n) => n.id),
    );
    g.nodes = g.nodes.filter((n) => !mineIds.has(n.id));
    g.edges = g.edges.filter((e) => !mineIds.has(e.from));
    writeGraphStreamingAtomic(GRAPH_PATH, g);
    console.log(`reverted -- removed ${mineIds.size} vault-sourced ghosts; graph now ${g.nodes.length} nodes (was ${before})`);
    return;
  }

  const { wirings, conflicts, speculativeSkipped } = collectVaultWirings();
  // Load pre-extracted JSONL entries and merge with prose-scan results.
  // Dedup by label: prose-scan wins on conflict (it has richer provenance text).
  const jsonlResult = loadVaultSourcesJsonl();
  if (jsonlResult.missing) {
    console.log("WARN vault-sources JSONL not found -- prose-scan only");
  } else {
    console.log(`Loaded ${jsonlResult.loaded} entries from vault-sources JSONL (${jsonlResult.skipped} skipped)`);
  }
  const proseScanLabels = new Set(wirings.map((w) => w.label));
  const jsonlGhosts = jsonlResult.ghosts.filter((g) => !proseScanLabels.has(g.node.label));
  const ghosts = [...wirings.map(buildGhostFromVault), ...jsonlGhosts];

  if (conflicts.length) {
    console.log(`WARN ${conflicts.length} label conflict(s) (kept first-seen, NOT averaged):`);
    for (const c of conflicts.slice(0, 10)) console.log(`  ${c.engine}: kept ${c.kept}, also saw ${c.alsoSeen} in ${c.in}`);
  }
  if (speculativeSkipped && speculativeSkipped.length) {
    console.log(`WARN ${speculativeSkipped.length} wiring-shaped line(s) DROPPED by a SPECULATIVE_RE trigger word (verify/unwired/pending/...). REVIEW each: if it is a COMPLETED wiring (an incidental tag word like WIRE-UNWIRED-PAPA, or "is now wired"), scrub the trigger to mine the label; if it is a genuine question ("verify X is wired"), leave it:`);
    for (const s of speculativeSkipped.slice(0, 10)) console.log(`  ${s.engine} -> ${s.dispatcher} (trigger "${s.trigger}") in ${s.sourceFile}`);
  }

  const byDispatcher = {};
  for (const w of wirings) byDispatcher[w.dispatcher] = (byDispatcher[w.dispatcher] || 0) + 1;

  if (opts.json) {
    console.log(JSON.stringify({ count: wirings.length, confidence: CONFIRMED_CONFIDENCE, byDispatcher, conflicts: conflicts.length, speculativeSkipped: speculativeSkipped.length, sample: wirings.slice(0, 5) }, null, 2));
    return;
  }

  console.log(`Extracted ${wirings.length} CONFIRMED vault wirings (confidence ${CONFIRMED_CONFIDENCE}, all >= 0.8 ref gate)`);
  console.log("By dispatcher:", Object.entries(byDispatcher).sort((a, b) => b[1] - a[1]));

  if (opts.dryRun) {
    console.log(`DRY-RUN -- would add ${ghosts.length} ghost.vault-wired.* reference nodes to the GNN pool`);
    console.log("Sample:", wirings.slice(0, 5).map((w) => `${w.engine} -> ${w.dispatcher}`).join(", "));
    return;
  }

  // Apply: idempotent merge by id (mirrors seed-ghost-from-unwired.mjs:298-329)
  // but via streaming I/O -- the naive JSON.parse(readFileSync) the seeder's
  // --apply still uses throws ERR_STRING_TOO_LONG on the >512 MB live graph.
  console.log(`Reading graph ${GRAPH_PATH} (streaming)...`);
  const g = readGraphStreaming(GRAPH_PATH);
  const merge = mergeVaultGhosts(g, ghosts);
  if (!merge.changed) {
    // Idempotent no-op: every vault ref is already present + current. SKIP the
    // 542MB write so a durable periodic / post-regen re-apply does not churn the
    // graph (or the retrain drift fingerprint) when nothing changed.
    console.log(`UP-TO-DATE -- all ${ghosts.length} vault refs already present + current; no write. graph nodes=${g.nodes.length}.`);
    return;
  }
  console.log(`Writing ${GRAPH_PATH} (streaming; nodes added=${merge.nodesAdded} updated=${merge.nodesUpdated}, edges added=${merge.edgesAdded})...`);
  writeGraphStreamingAtomic(GRAPH_PATH, g);
  console.log(`DONE -- graph nodes=${g.nodes.length} edges=${g.edges.length}. Re-run nn-graph-eval to grade with the grown pool.`);
}

/** True if node was already launched with a `--max-old-space-size` flag (process.execArgv). PURE. */
export function hasHeapFlag(execArgv) {
  return (Array.isArray(execArgv) ? execArgv : []).some((a) => typeof a === "string" && a.startsWith("--max-old-space-size"));
}

/**
 * Pure: should this run RE-EXEC itself with a `--max-old-space-size` bump? Only the graph-WRITING
 * modes (--apply / --revert) stream-load the ~550MB system-graph in-process and OOM at the default
 * heap ceiling (regression 2026-06-11, slot:alpha -- hit live applying the vault ref-pool). The
 * dry-run (default / --json) extracts vault labels WITHOUT loading the graph, so it skips the
 * re-exec. The child sets PRISM_VAULT_REFPOOL_REEXEC=1 to break the loop; PRISM_VAULT_REFPOOL_NO_REEXEC=1
 * opts out; an already-bumped launch (execArgv has the flag) is not double-wrapped. PURE.
 */
export function shouldReexecForHeap(argv, env = {}, execArgv = []) {
  if (env.PRISM_VAULT_REFPOOL_REEXEC === "1") return false;     // already inside the bumped child
  if (env.PRISM_VAULT_REFPOOL_NO_REEXEC === "1") return false;  // explicit opt-out
  if (hasHeapFlag(execArgv)) return false;                       // launched WITH a heap flag already
  const a = Array.isArray(argv) ? argv : [];
  return a.includes("--apply") || a.includes("--revert");        // only the graph-writing modes load the graph
}

/** Build a heap-bumped node argv (flag BEFORE the script path -- node consumes V8 flags first). PURE. */
export function nodeArgsWithHeap(scriptPath, heapMb, scriptArgs = []) {
  return [`--max-old-space-size=${heapMb}`, scriptPath, ...(Array.isArray(scriptArgs) ? scriptArgs : [])];
}

const REFPOOL_DEFAULT_HEAP_MB = 12288; // 542MB graph stream-load + processing; box has 127GB RAM

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) {
  // Heap guard (regression 2026-06-11, slot:alpha): the --apply/--revert graph load OOM'd at the
  // default ceiling. Re-exec once with a heap bump; dry-run stays fast (no graph load).
  if (shouldReexecForHeap(process.argv.slice(2), process.env, process.execArgv)) {
    const heapMb = Number(process.env.PRISM_VAULT_REFPOOL_HEAP_MB) || REFPOOL_DEFAULT_HEAP_MB;
    const r = spawnSync(
      process.execPath,
      nodeArgsWithHeap(process.argv[1], heapMb, process.argv.slice(2)),
      { stdio: "inherit", cwd: process.cwd(), env: { ...process.env, PRISM_VAULT_REFPOOL_REEXEC: "1" } }
    );
    process.exit(typeof r.status === "number" ? r.status : 1);
  }
  main();
}
