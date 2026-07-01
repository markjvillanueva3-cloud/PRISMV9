#!/usr/bin/env node
// scripts/ollama-file-digest.mjs
// U-VERIFIED-OFFLOAD-FILEDIGEST (2026-06-09, slot:alpha): the headline free-token
// lever -- offload a LARGE-FILE digest to local Ollama and make it TRUSTWORTHY via
// line-anchored verification, so Claude can skip reading the whole file and instead
// read only the cited lines to verify any claim. Built on the verifiedOffload
// keystone (scripts/lib/ollama-verified-offload.mjs).
//
// THE TRUST MECHANISM: the model returns {summary, claims:[{line, snippet}]}. The
// verifier reads the ACTUAL file lines and keeps ONLY the claims whose snippet truly
// appears at the cited line (whitespace-normalized substring match). A hallucinated
// line/snippet is dropped; if NO claim survives the digest is rejected -> fallback.
// Every surviving claim is therefore independently checkable against exact source.
// NOTE: `summary` is advisory model prose (NOT verified); only `claims` carry the
// machine-checked file:line citations a reader can trust without the full file.
//
// Distinct from ollama-offload.mjs::offloadDigest (advisory TEXT digest, weak
// nonEmptyText verifier): this digests a FILE PATH with a STRUCTURAL verifier.
//
// CLI:  node scripts/ollama-file-digest.mjs <path> [--max-lines N]
// Knob: PRISM_OLLAMA_OFFLOAD_MODEL (default gpt-oss:20b).
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

import { verifiedOffload } from "./lib/ollama-verified-offload.mjs";
import { callOllamaOnce } from "./lib/ollama-fanout.mjs";
import { atomicOffloadStatsRMW, ensureOffloadBucket, clampSaved } from "./lib/offload-stats-bump.mjs";

const DEFAULT_MODEL = process.env.PRISM_OLLAMA_OFFLOAD_MODEL || "gpt-oss:20b";
const MAX_DIGEST_LINES = 1500; // cap the lines fed to the model (token bound)
const HEAD_TAIL_LINES = 30;    // fallback raw-context size at each end
const MIN_VALID_CLAIMS = 1;    // a digest with 0 source-matching claims is rejected
const SNIPPET_MIN_LEN = 4;     // ignore trivially-short snippets (match-anything noise)

// U-FILE-DIGEST-OFFLOAD-RECORD (2026-06-24, slot:alpha): the verified file-digest is "the
// headline free-token lever" (see header) but recorded NOTHING -- so it was 100% invisible to
// every utilization measurement, and the large-read-digest advisory-decay gate could never see
// a conversion (it could wrongly suppress a working nudge). recordFileDigestOffload counts a
// SUCCESSFUL verified digest under its OWN byHook bucket with offloaded>0 -- which the offload-
// dashboard's live-byHook scan auto-recognizes as a real off-Claude run (the same bucket class
// the ask-hermes ~46x under-count fix uncovered). It deliberately does NOT bump the top-level
// executedOffloads (that counter is ask-ollama-scoped per gradeOllamaUtilization, and a file-
// digest runs via callOllamaOnce, a distinct lane -- R7: surfaced, not conflated).
const REPO_ROOT = process.env.PRISM_REPO_ROOT || "H:/prism";
const STATS_PATH = process.env.PRISM_OLLAMA_FILE_DIGEST_STATS_PATH || resolve(REPO_ROOT, "mcp-server/data/state/ollama-offload-stats.json");
const STATS_KEY = "ollama-file-digest";

/**
 * Record a SUCCESSFUL verified file-digest as a real off-Claude offload under
 * byHook[STATS_KEY], via the shared fail-safe atomic-RMW envelope
 * (./lib/offload-stats-bump.mjs) -- never CREATES the file, never throws, atomic
 * tmp+rename. Keeps its OWN bucket mutate (R7 surface-don't-fork).
 * @param {{tokensSaved?:number, statsPath?:string}} o
 * @returns {boolean} true iff the stats file was updated
 */
export function recordFileDigestOffload({ tokensSaved = 0, statsPath = STATS_PATH } = {}) {
  return atomicOffloadStatsRMW(statsPath, (stats) => {
    const h = ensureOffloadBucket(stats, STATS_KEY);
    h.fired = (h.fired | 0) + 1;
    h.offloaded = (h.offloaded | 0) + 1;
    h.tokensSaved = (h.tokensSaved | 0) + clampSaved(tokensSaved);
  });
}

function sha8(s) {
  return createHash("sha256").update(s).digest("hex").slice(0, 8);
}

function normWS(s) {
  return String(s).replace(/\s+/g, " ").trim();
}

/**
 * lineAnchoredVerifier -- builds a PURE verifier closed over the real file `lines`.
 * Returns {ok, value:{summary, claims}} keeping ONLY claims whose snippet appears at
 * the cited line; rejects (false) if the reply is not JSON or no claim verifies.
 */
export function lineAnchoredVerifier(lines) {
  return (raw) => {
    let obj;
    try { obj = JSON.parse(raw); } catch { return false; }
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
    const summary = typeof obj.summary === "string" ? obj.summary.trim() : "";
    const claimsIn = Array.isArray(obj.claims) ? obj.claims : [];
    const validated = [];
    for (const c of claimsIn) {
      if (!c || typeof c !== "object") continue;
      const ln = Number(c.line);
      const snip = typeof c.snippet === "string" ? normWS(c.snippet) : "";
      if (!Number.isInteger(ln) || ln < 1 || ln > lines.length) continue; // out-of-range
      if (snip.length < SNIPPET_MIN_LEN) continue;                         // too short to trust
      if (normWS(lines[ln - 1]).includes(snip)) validated.push({ line: ln, snippet: snip });
    }
    if (validated.length < MIN_VALID_CLAIMS) return false; // all hallucinated -> reject
    return { ok: true, value: { summary, claims: validated } };
  };
}

/**
 * offloadFileDigest -- digest a file on local Ollama with verified line anchors.
 * @returns the verifiedOffload record {value, source, verified, fellBack, reason}.
 *   value (ollama):   {summary, claims:[{line,snippet}], path, sha, lineCount, fedLines}
 *   value (fallback): {summary, claims:[], headTail, degraded, path, sha, lineCount}
 *   On read failure:  {value:null, source:'fallback', reason:'read-failed'}.
 */
export async function offloadFileDigest(path, opts = {}) {
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch (e) {
    return { value: null, source: "fallback", verified: false, fellBack: true, reason: "read-failed", error: String(e && e.message), label: "offloadFileDigest" };
  }
  const lines = raw.split(/\r?\n/);
  const sha = sha8(raw);
  const maxLines = Number.isFinite(opts.maxLines) ? opts.maxLines : MAX_DIGEST_LINES;
  const fed = lines.slice(0, maxLines);
  const numbered = fed.map((l, i) => `${i + 1}: ${l}`).join("\n");
  const prompt =
    `Summarize this source file. Return ONLY JSON of the form ` +
    `{"summary":"<2-4 plain sentences>","claims":[{"line":<N>,"snippet":"<text copied verbatim from that line>"}]}. ` +
    `Give 5 to 12 claims at the most important lines. Each snippet MUST be copied verbatim from the cited line number.\n\n---\n${numbered}\n---`;

  const run = opts.runImpl ? () => opts.runImpl(prompt) : async () => {
    const r = await callOllamaOnce(prompt, { model: opts.model || DEFAULT_MODEL, timeoutMs: opts.timeoutMs || 60000, temperature: 0 });
    return r && r.ok ? r.text : "";
  };

  const headTail = () => {
    const k = Number.isFinite(opts.headTail) ? opts.headTail : HEAD_TAIL_LINES;
    if (lines.length <= k * 2) return raw;
    return [...lines.slice(0, k), `... [${lines.length - k * 2} lines omitted] ...`, ...lines.slice(-k)].join("\n");
  };

  const res = await verifiedOffload({
    run,
    verify: lineAnchoredVerifier(lines),
    fallback: async () => ({ summary: "(ollama digest unavailable -- head+tail raw shown)", claims: [], headTail: headTail(), degraded: true }),
    label: "offloadFileDigest",
    onResult: opts.onResult,
  });

  // attach file metadata to whichever value path was taken (ollama or fallback)
  if (res.value && typeof res.value === "object") {
    res.value.path = path;
    res.value.sha = sha;
    res.value.lineCount = lines.length;
    res.value.fedLines = fed.length;
  }
  return res;
}

// ---- CLI ----
/**
 * parseCliArgs -- pure arg parser. Finds the path arg, EXCLUDING the value consumed
 * by --max-lines, so `--max-lines 50 file.txt` and `file.txt --max-lines 50` both
 * resolve the path correctly (the prior `argv.find(!--)` mistook "50" for the path).
 */
export function parseCliArgs(argv) {
  const mi = argv.indexOf("--max-lines");
  const valueIdx = mi >= 0 ? mi + 1 : -1; // index consumed as --max-lines' value
  const maxLinesRaw = mi >= 0 ? argv[mi + 1] : undefined;
  const maxLines = maxLinesRaw !== undefined ? Number(maxLinesRaw) : undefined;
  const path = argv.find((a, i) => i !== valueIdx && !a.startsWith("--"));
  return { path, maxLines: Number.isFinite(maxLines) ? maxLines : undefined };
}

async function main(argv) {
  const { path, maxLines } = parseCliArgs(argv);
  if (!path) { process.stderr.write("usage: node scripts/ollama-file-digest.mjs <path> [--max-lines N]\n"); return 2; }
  const r = await offloadFileDigest(path, maxLines !== undefined ? { maxLines } : {});
  process.stdout.write(JSON.stringify(r) + "\n");
  // Record a SUCCESSFUL verified offload so this $0-Claude lever is visible to the utilization
  // dashboard (closes the "100% invisible" telemetry blind spot). ONLY on a real verified ollama
  // run -- a fallback (source!="ollama") is NOT an offload and must not be counted.
  if (r && r.source === "ollama" && r.verified && !r.fellBack) {
    let rawBytes = 0;
    try { rawBytes = statSync(path).size; } catch { /* unreadable stat -> saving 0, still record the run */ }
    const rawTokens = Math.round(rawBytes / 4);                                // tokens Claude would have read
    const digestTokens = Math.round(JSON.stringify(r.value || "").length / 4); // tokens Claude reads instead
    recordFileDigestOffload({ tokensSaved: Math.max(0, rawTokens - digestTokens) });
  }
  return 0;
}

const invokedDirectly = (() => { try { return fileURLToPath(import.meta.url) === process.argv[1]; } catch { return false; } })();
if (invokedDirectly) main(process.argv.slice(2)).then((c) => process.exit(c || 0)).catch((e) => { process.stderr.write(`ollama-file-digest fatal: ${e && e.message}\n`); process.exit(1); });
