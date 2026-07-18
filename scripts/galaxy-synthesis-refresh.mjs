#!/usr/bin/env node
// scripts/galaxy-synthesis-refresh.mjs
// Amplifier #2 — continuous / incremental compounding (2026-05-29 slot:alpha).
// B1 (galaxy-reflection-synthesis.mjs --all) is the BLUNT tool: it re-synthesizes
// ALL 34 galaxies every run (~20 min of generation). This is the SURGICAL tool:
// it re-synthesizes ONLY the galaxies whose domain memory-cluster actually CHANGED
// since the last synthesis — keeping the compounding FRESH as the fleet adds
// memories, at a fraction of the cost. Wire to a cron / Stop hook and the brain's
// syntheses stay current automatically.
//
// HOW: each L1 synthesis stores a `sourceHash` (fingerprint of the memory keys it
// was built from). This script gathers each galaxy's CURRENT cluster (via the
// A6/A3 recall — query embedding uses /api/embeddings, which works even when
// generation is wedged) and compares hashes. Changed → STALE → regenerate.
// So staleness is ALWAYS detectable; only the regen needs generation (and if it's
// down, the stale set is reported + deferred, never silently skipped).
//
// Cascade (P1 — Reviewer-B): when ≥1 L1 synthesis is regenerated, the sidecars
// MUST be rebuilt before anything downstream reads them — else L2 clusters on the
// OLD synthesis vectors (a brand-new synthesis has no vector at all → silently
// dropped) and the refreshed syntheses are invisible to recall. So the order is:
// regen → strip changed synthesis vectors → rebuild index sidecar → rebuild
// embeddings (--resume re-embeds the stripped keys via /api/embeddings, which
// stays up when generation is wedged) → THEN cascade to L2. If the rebuild fails,
// the L2 cascade is SKIPPED LOUDLY (never run on stale vectors).
//
// FLEET COORDINATION (rank 6, 2026-05-30): when multiple chats run synthesis in parallel (the
// 20-chat lever / amplifier #3), each galaxy regen is gated by a (galaxy, sourceHash) claim via
// scripts/galaxy-synthesis-claim.mjs — a peer's in-flight galaxy is SKIPPED, not redone +
// race-written to the same patterns/ file. Default-ON; PRISM_GALAXY_SYNTH_CLAIM_DISABLE=1 reverts
// to byte-identical legacy behavior. FAIL-OPEN: a ledger error never blocks a synthesis (worst
// case = one redundant regen, == pre-rank-6 behavior). chatId from --chat-id / PRISM_CHAT_ID /
// synth-<pid>.
//   SCOPE (honest — R12): this gate de-duplicates the L1 *generation* only (no two chats regen
//   the same galaxy or race-write the same patterns/ file). It does NOT yet coordinate the
//   SIDECAR REBUILD — each chat that regenerated ≥1 galaxy still runs its own index+embed+meta
//   rebuild, so N chats → up to N rebuilds contending on the shared sidecars. Cross-chat
//   rebuild-coalescing (a debounced single-flight rebuild claim) is a SEPARATE, un-built lever;
//   rank 6 is the generation-coordination precondition for amplifier #3, not the whole of it.
//
// Exit-code contract (for cron / Stop-hook consumers — DO NOT treat 3 as failure):
//   0 = done (regenerated, or nothing-to-do/all-fresh)
//   1 = hard failure (no galaxies, or most regens failed)
//   3 = stale galaxies detected but generation is DOWN → deferred (benign; re-run when up)

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  gatherGalaxyMemories,
  buildSynthesisPrompt,
  synthesizeViaOllama,
  buildSynthesisDoc,
  writeSynthesisDoc,
  computeSourceHash,
  ollamaPreflight,
  listGalaxies,
} from "./galaxy-reflection-synthesis.mjs";
import { tryClaimSynthesis, tryReleaseSynthesis, CHAT_ID_RE } from "./galaxy-synthesis-claim.mjs";
import { resolveSynthesisModel } from "./lib/host-aware-synthesis-model.mjs";

const DEFAULT_PATTERNS_DIR = "H:/prism/knowledge/memories/patterns";
const DEFAULT_ENGINES_ROOT = "H:/prism/mcp-server/src/engines";
const DEFAULT_MODEL = "qwen2.5-coder:32b";
const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
const DEFAULT_TOPK = 24;
const MIN_MEMORIES = 3;
const META_SCRIPT = "H:/prism/scripts/galaxy-meta-synthesis.mjs";
const BUILD_INDEX_SIDECAR = "H:/prism/scripts/build-memory-index-sidecar.mjs";
const BUILD_EMB_SIDECAR = "H:/prism/scripts/build-memory-embeddings-sidecar.mjs";
const EMB_SIDECAR_PATH = "H:/prism/state/shared/memory-embeddings-sidecar.json";
const SUBPROCESS_TIMEOUT_MS = 600000;

// Read the sourceHash a galaxy's synthesis was last built with. null = no
// synthesis file yet; "none" = an older synthesis predating hash tracking.
export function readStoredHash(galaxy, patternsDir = DEFAULT_PATTERNS_DIR, { readFileImpl = readFileSync, existsImpl = existsSync } = {}) {
  const p = join(patternsDir, `${galaxy}_synthesis.md`);
  if (!existsImpl(p)) return null;
  let body;
  try { body = readFileImpl(p, "utf8"); } catch { return null; }
  const m = body.match(/^\s*sourceHash:\s*(\S+)\s*$/m);
  return m ? m[1] : null;
}

// Classify a galaxy: fresh | stale | new | thin. Pure given injected readers.
// Returns the gathered memories on stale/new so main can regenerate without a
// second gather.
export function classifyGalaxy(galaxy, { gatherImpl = gatherGalaxyMemories, readStoredImpl = readStoredHash, brainBody = "", topK = DEFAULT_TOPK } = {}) {
  const { memories } = gatherImpl({ galaxy, brainBody, topK }) || { memories: [] };
  if (memories.length < MIN_MEMORIES) return { galaxy, status: "thin", memCount: memories.length };
  const currentHash = computeSourceHash(memories);
  const storedHash = readStoredImpl(galaxy);
  if (storedHash === null) return { galaxy, status: "new", currentHash, memCount: memories.length, memories };
  if (storedHash === "none" || storedHash !== currentHash) {
    return { galaxy, status: "stale", currentHash, storedHash, memCount: memories.length, memories };
  }
  return { galaxy, status: "fresh", currentHash, memCount: memories.length };
}

export function parseArgs(argv) {
  const a = { json: false, dryRun: false, model: DEFAULT_MODEL, topK: DEFAULT_TOPK, noCascade: false, chatId: null };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--json") a.json = true;
    else if (t === "--dry-run") a.dryRun = true;       // classify only, never regenerate
    else if (t === "--no-cascade") a.noCascade = true; // skip the L2 re-run
    else if (t === "--chat-id" || t === "--chatId") a.chatId = argv[++i];
    else if (t === "--model") a.model = argv[++i];
    else if (t === "--topk") a.topK = Math.max(4, parseInt(argv[++i], 10) || DEFAULT_TOPK);
  }
  return a;
}

// Resolve a stable chatId for the synthesis-claim ledger (fleet coordination, rank 6).
// Priority: --chat-id arg → PRISM_CHAT_ID env → synthetic synth-<pid> (always CHAT_ID_RE-valid).
// A provided-but-malformed id is IGNORED (warned), not passed through — otherwise the ledger
// wrapper would fail-open on every call and the gate would be silently dead. A typo'd env var
// thus degrades to a working synthetic id, not a permanently uncoordinated run (R12).
export function resolveChatId(args, { env = process.env, pid = process.pid, warn = (s) => { try { process.stderr.write(s); } catch { /* stderr unavailable */ } } } = {}) {
  for (const c of [args && args.chatId, env.PRISM_CHAT_ID]) {
    if (typeof c === "string" && c.length) {
      if (CHAT_ID_RE.test(c)) return c;
      warn(`[refresh] ignoring invalid chatId "${c.slice(0, 40)}" (must match ${CHAT_ID_RE}) — using synthetic\n`);
    }
  }
  return `synth-${pid}`;
}

// Resolve the synthesis model for this run (token-savings — route the hardcoded small
// model to the best LOCAL model for the host). DEFAULT_MODEL stays the conservative
// FALLBACK; on a Blackwell host with the 32B held this lifts synthesis to qwen2.5-coder:32b
// (better local digests → fewer paid-Claude re-escalations).
//
// An EXPLICIT --model flag is operator intent and always wins. We detect it from the RAW
// argv (NOT `args.model !== DEFAULT_MODEL`): parseArgs bakes DEFAULT_MODEL in as the default,
// so an explicit `--model qwen2.5-coder:7b` (== the default) would otherwise be missed and the
// resolver would silently override the operator's deliberate choice.
//
// Fail-soft: resolveSynthesisModel never throws (except on a missing fallback, which we always
// supply) — ollama-down → fallback; weak host → the same small model; Blackwell → 32B.
// Pure/injectable: `resolveImpl` lets a test pin the resolved model without a GPU or Ollama.
export async function resolveModelForRun(args, rawArgv = process.argv, { resolveImpl = resolveSynthesisModel } = {}) {
  const explicit = Array.isArray(rawArgv) && rawArgv.includes("--model") ? args.model : null;
  const { model } = await resolveImpl({ fallback: DEFAULT_MODEL, override: explicit });
  return model || DEFAULT_MODEL;
}

// Drop the regenerated galaxies' synthesis vectors from the embeddings sidecar so
// the subsequent `--resume` RE-embeds them with fresh content (`--resume` skips by
// KEY, so without the strip a changed synthesis keeps its STALE vector). Atomic.
export function stripEmbeddingVectors(galaxies, embPath = EMB_SIDECAR_PATH, { readFileImpl = readFileSync, writeFileImpl = writeFileSync, renameImpl = renameSync, existsImpl = existsSync } = {}) {
  if (!existsImpl(embPath)) return { stripped: 0 };
  let j;
  try { j = JSON.parse(readFileImpl(embPath, "utf8")); } catch { return { stripped: 0 }; }
  if (!j || !Array.isArray(j.records)) return { stripped: 0 };
  const drop = new Set(galaxies.map((g) => `patterns/${g}_synthesis`));
  const before = j.records.length;
  j.records = j.records.filter((r) => !drop.has(r && r.key));
  const stripped = before - j.records.length;
  if (stripped > 0) {
    const tmp = `${embPath}.tmp.${process.pid}`;
    writeFileImpl(tmp, JSON.stringify(j), "utf8");
    renameImpl(tmp, embPath);
  }
  return { stripped };
}

// Regenerate the stale/new syntheses, then (P1) rebuild the sidecars so L2 + recall
// see FRESH vectors, then cascade to L2 — gated on a successful rebuild. Pure-shell
// with injectable deps so a main()-level oracle can pin the orchestration ORDER
// (the recurring "main() seam untested" gap in this codebase).
export async function executeRegenAndCascade({
  needsRegen, ollamaUp, model, noCascade = false,
  synthesizeImpl = ({ prompt, model: mdl }) => synthesizeViaOllama({ prompt, model: mdl }),
  writeImpl = writeSynthesisDoc,
  stripImpl = stripEmbeddingVectors,
  execImpl = (script, extra = []) => execFileSync(process.execPath, [script, ...extra], { stdio: "ignore", timeout: SUBPROCESS_TIMEOUT_MS }),
  nowImpl = () => new Date().toISOString(),
  logImpl = (s) => { try { process.stderr.write(s); } catch { /* stderr unavailable */ } },
  // Fleet-coordination gate (rank 6). Defaults are NO-OPS → byte-identical legacy behavior when
  // the caller (or PRISM_GALAXY_SYNTH_CLAIM_DISABLE=1) supplies neither: claimImpl always grants,
  // releaseImpl does nothing. main() injects the FAIL-OPEN ledger wrappers when claims are enabled.
  claimImpl = () => ({ ok: true }),
  releaseImpl = () => {},
} = {}) {
  if (!ollamaUp) {
    return { regenerated: 0, failed: 0, skipped: [], deferred: needsRegen.map((c) => c.galaxy), sidecarRebuild: "skipped", cascade: "skipped", steps: [] };
  }
  let regenerated = 0; let failed = 0; const steps = []; const done = []; const skipped = [];
  for (const c of needsRegen) {
    // Claim this (galaxy, sourceHash) so a peer chat synthesizing in parallel doesn't redo it.
    // FAIL-OPEN: claimImpl never throws; a ledger error returns ok:true (proceed uncontended).
    // ONLY a GENUINE live peer claim returns ok:false → skip (the peer owns that galaxy).
    const claim = claimImpl(c.galaxy, c.currentHash);
    if (!claim.ok) {
      skipped.push(c.galaxy);
      logImpl(`[refresh] ${c.galaxy} is being synthesized by a peer (${(claim.conflict && claim.conflict.chatId) || "?"}) — skipping\n`);
      continue;
    }
    try {
      const text = await synthesizeImpl({ prompt: buildSynthesisPrompt(c.galaxy, c.memories), model });
      if (!text || text.length < 40) throw new Error(`empty/short synthesis (${text ? text.length : 0} chars)`);
      const doc = buildSynthesisDoc(c.galaxy, text, { memCount: c.memories.length, model, builtAt: nowImpl(), sourceHash: c.currentHash });
      writeImpl({ galaxy: c.galaxy, doc });
      regenerated++; done.push(c.galaxy);
      logImpl(`[refresh] re-synthesized ${c.galaxy} (${c.status}, ${c.memCount} memories)\n`);
    } catch (err) { failed++; logImpl(`[refresh] ${c.galaxy} FAILED — ${(err && err.message) || err}\n`); }
    // Release the claim once we're done with this galaxy (success OR failure) so a peer / the next
    // run can retry it; never released on the skip path (we never claimed it — `continue` above).
    finally { releaseImpl(c.galaxy, c.currentHash); }
  }

  // P1: re-index + re-embed the refreshed syntheses BEFORE anything reads the
  // sidecars, so L2 clusters on fresh vectors and recall surfaces the refreshed docs.
  let sidecarRebuild = "skipped"; let cascade = "skipped";
  if (regenerated > 0) {
    try {
      stripImpl(done);                            // drop the regenerated galaxies' stale vectors
      execImpl(BUILD_INDEX_SIDECAR);              // vault → BM25 sidecar (fresh synthesis text)
      execImpl(BUILD_EMB_SIDECAR, ["--resume"]);  // re-embed the stripped keys (uses /api/embeddings)
      sidecarRebuild = "ok"; steps.push("strip", "index", "embed");
    } catch (err) { sidecarRebuild = `failed: ${(err && err.message) || err}`; logImpl(`[refresh] sidecar rebuild ${sidecarRebuild}\n`); }

    if (!noCascade) {
      if (sidecarRebuild === "ok") {
        try { execImpl(META_SCRIPT, ["--model", model]); cascade = "ok"; steps.push("meta"); }
        catch (err) { cascade = `failed: ${(err && err.message) || err}`; logImpl(`[refresh] L2 cascade ${cascade}\n`); }
      } else {
        cascade = "skipped: sidecar-rebuild-failed (would cluster on stale vectors)";
        logImpl(`[refresh] ⚠ L2 cascade SKIPPED — ${cascade}\n`);
      }
    }
  }
  return { regenerated, failed, skipped, sidecarRebuild, cascade, steps };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const galaxies = listGalaxies(DEFAULT_ENGINES_ROOT);
  if (!galaxies.length) { process.stderr.write("[refresh] FAIL-LOUD: no galaxies found\n"); process.exit(1); }

  // Classify every galaxy (embedding-only — works even if generation is wedged).
  const classified = [];
  for (const galaxy of galaxies) {
    let brainBody = "";
    try { brainBody = readFileSync(join(DEFAULT_ENGINES_ROOT, galaxy, "MEMORY.md"), "utf8"); } catch { /* slug-only */ }
    classified.push(classifyGalaxy(galaxy, { brainBody, topK: args.topK }));
  }
  const needsRegen = classified.filter((c) => c.status === "stale" || c.status === "new");
  const counts = classified.reduce((m, c) => ((m[c.status] = (m[c.status] || 0) + 1), m), {});
  process.stderr.write(`[refresh] ${galaxies.length} galaxies — ${JSON.stringify(counts)}; ${needsRegen.length} need re-synthesis\n`);

  if (args.dryRun) {
    if (args.json) process.stdout.write(JSON.stringify({ counts, needsRegen: needsRegen.map((c) => c.galaxy) }, null, 2) + "\n");
    else process.stdout.write(`[refresh] DRY RUN — ${needsRegen.length} stale/new: ${needsRegen.map((c) => c.galaxy).join(", ") || "(none — all fresh)"}\n`);
    return;
  }

  if (!needsRegen.length) {
    process.stdout.write(`[refresh] all syntheses fresh — nothing to do\n`);
    return;
  }

  // Resolve the synthesis model ONCE (host-aware; DEFAULT_MODEL is the fallback). The SAME
  // resolved model is then threaded into BOTH the preflight AND every generation call so they
  // never disagree (preflight must probe the model generation will actually use).
  const model = await resolveModelForRun(args, process.argv);
  if (model !== DEFAULT_MODEL) process.stderr.write(`[refresh] synthesis model resolved → ${model} (fallback ${DEFAULT_MODEL})\n`);

  // Regen needs generation. If it's down, report the stale set + defer (R12: not silent).
  const ollamaUp = await ollamaPreflight(DEFAULT_OLLAMA_URL, model);
  if (!ollamaUp) {
    process.stderr.write(`[refresh] ⚠ ${needsRegen.length} galaxies are stale but ollama generation is DOWN — deferred (re-run when up): ${needsRegen.map((c) => c.galaxy).join(", ")}\n`);
    if (args.json) process.stdout.write(JSON.stringify({ counts, regenerated: 0, deferred: needsRegen.map((c) => c.galaxy) }, null, 2) + "\n");
    process.exit(3); // distinct code: detected-but-deferred
  }

  // Fleet-coordination gate (rank 6). Default-ON; PRISM_GALAXY_SYNTH_CLAIM_DISABLE=1 → undefined
  // impls → executeRegenAndCascade's no-op defaults → byte-identical legacy behavior. FAIL-OPEN,
  // so even when enabled a ledger error never blocks a synthesis.
  const claimsEnabled = process.env.PRISM_GALAXY_SYNTH_CLAIM_DISABLE !== "1";
  const myChatId = resolveChatId(args);
  const claimImpl = claimsEnabled ? (galaxy, hash) => tryClaimSynthesis({ galaxy, sourceHash: hash, chatId: myChatId }) : undefined;
  const releaseImpl = claimsEnabled ? (galaxy, hash) => { tryReleaseSynthesis({ galaxy, sourceHash: hash, chatId: myChatId }); } : undefined;

  const exec = await executeRegenAndCascade({ needsRegen, ollamaUp, model, noCascade: args.noCascade, claimImpl, releaseImpl });
  const result = { counts, ...exec };
  if (args.json) process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  else process.stdout.write(`[refresh] re-synthesized ${exec.regenerated}, failed ${exec.failed}, skipped ${(exec.skipped || []).length} (peer-claimed), sidecar ${exec.sidecarRebuild}, L2 cascade ${exec.cascade}\n`);
  if (exec.failed > 0 && exec.failed >= exec.regenerated) process.exit(1); // mostly-failed → fail-loud
}

const invokedDirect = (() => {
  try {
    const here = new URL(import.meta.url).pathname.replace(/^\/+([A-Za-z]:)/, "$1");
    const norm = (s) => s.replace(/\\/g, "/").toLowerCase();
    return norm(here) === norm(process.argv[1] || "");
  } catch { return false; }
})();

if (invokedDirect) main().catch((err) => { try { process.stderr.write(`[refresh] ${err?.stack || err}\n`); } catch {} process.exit(1); });
