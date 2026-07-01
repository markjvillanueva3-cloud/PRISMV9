#!/usr/bin/env node
/**
 * Echo forge-roadmap deep-dive -- Ollama-offloaded corpus reader.
 *
 * Rate-limit-safe replacement for the failed echo-forge-roadmap Workflow (which
 * fanned out 6 Claude subagents and got API-rate-limited). The BULK reading of
 * the echo / post-processor / CIMCO corpus is done by a LOCAL instruct model
 * (zero Claude API) -- each large spec is read once and distilled to "remaining
 * work + blockers". Claude then synthesizes the dependency-ordered roadmap from
 * the distilled digest (the one judgment step). R5: model only for the judgment
 * call; mechanical extraction routes to local compute.
 *
 * Model: qwen2.5-coder:32b (fast non-reasoning instruct -- gpt-oss:* are reasoning
 * models that return an EMPTY `response` at low num_predict and are ~10x slower to
 * start; the wrong tool for bulk structured extraction).
 *
 * DURABLE/RESUMABLE: each slice's result is flushed to disk the moment it returns
 * (NOT batched to the end) -- a fleet-reaper kill of this long node process loses
 * at most the in-flight slice, never the whole run (xray OCR non-resumable-burn
 * lesson). Re-running skips slices already present unless PRISM_DIVE_FORCE=1.
 *
 * CLI: node scripts/echo-forge-ollama-dive.mjs
 * Out: state/shared/cimco/echo-forge-dive.json  (+ .md digest)
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = "H:/prism";
const OLLAMA = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const MODEL = process.env.PRISM_DIVE_MODEL || "qwen2.5-coder:32b";
const PER_FILE_TIMEOUT_MS = 180_000;
const INPUT_CAP = 30_000;
const NUM_CTX = 16_384;
const NUM_PREDICT = 1_024;
const OUT_DIR = path.join(ROOT, "state/shared/cimco");
const OUT_JSON = path.join(OUT_DIR, "echo-forge-dive.json");
const OUT_MD = path.join(OUT_DIR, "echo-forge-dive.md");
const FORCE = process.env.PRISM_DIVE_FORCE === "1";

const SLICES = [
  { id: "cimco-spine2", file: "state/shared/specs/CIMCO-SPINE2-LIVESIM-PLAN-2026-06-04.md",
    note: "CIMCO closed-loop live-sim plan (SIM-1..7)" },
  { id: "postgen-full", file: "state/shared/specs/POST-GEN-FULL-ASSESSMENT-2026-06-06.md",
    note: "post-generation full capability assessment" },
  { id: "postgen-vc", file: "state/shared/specs/POST-GEN-VC-REPORT-2026-06-08.md",
    note: "post-gen VC report (most recent, 2026-06-08)" },
  { id: "postbridge-envelope", file: "state/shared/specs/POST-BRIDGE-SYNERGY-ENVELOPE-2026-05-26.md",
    note: "POST-BRIDGE-SYNERGY milestone envelope (unit list/status)" },
  { id: "post-all-engines", file: "state/shared/specs/POST-ALL-ENGINES-SCOPE-2026-05-26.md",
    note: "scope of all post-processor engines" },
  { id: "postgen-closedloop", file: "state/shared/specs/POST-GEN-CLOSED-LOOP-TRAINING-READINESS-2026-05-29-echo.md",
    note: "post-gen closed-loop training readiness" },
  { id: "echo-threads", file: "state/shared/handoffs/consolidated/echo.md",
    note: "consolidated open echo handoff threads" },
  // --- H-drive-wide broadening (U-ECHO-FORGE-ROADMAP v2, operator: deep-dive ALL echo + post-processor work) ---
  { id: "postgen-adversarial", file: "state/shared/specs/POST-GEN-ADVERSARIAL-DIGEST-2026-06-06.md",
    note: "post-gen adversarial audit digest (contamination findings, real-vs-claimed gaps)" },
  { id: "post-consolidation", file: "state/shared/specs/POST-PROCESSOR-CONSOLIDATION-2026-05-25-echo.md",
    note: "post-processor engine consolidation map (duplicates, dark engines)" },
  { id: "post-fleet-upgrade", file: "state/shared/specs/POST-PROCESSOR-FLEET-UPGRADE-2026-05-25.md",
    note: "post-processor fleet upgrade plan" },
  { id: "post-capability", file: "state/shared/specs/POST-PROCESSOR-CAPABILITY-ASSESSMENT-2026-05-21.md",
    note: "post-processor capability assessment (what works / what is missing)" },
  { id: "post-galaxy-synergy", file: "state/shared/specs/POST-PROCESSOR-GALAXY-SYNERGY-VALIDATION-2026-05-28-echo.md",
    note: "post-processor galaxy synergy validation (cross-galaxy wiring gaps)" },
  { id: "hurco-bridge", file: "state/shared/specs/HURCO-POST-PIPELINE-BRIDGE-ASSESSMENT-2026-05-25.md",
    note: "Hurco post pipeline bridge assessment (DNC-proven controller path)" },
  { id: "india-to-echo", file: "state/shared/specs/INDIA-TO-ECHO-POST-QUEUE-MIGRATION-2026-05-26.md",
    note: "india->echo post queue migration (learning-loop ownership handoff)" },
  { id: "galaxy-memory", file: "mcp-server/src/engines/post-processor/MEMORY.md",
    note: "post-processor galaxy MEMORY (compounded patterns/decisions/open-threads)" },
  { id: "galaxy-synthesis", file: "knowledge/memories/patterns/post-processor_synthesis.md",
    note: "post-processor domain synthesis (open threads)" },
  { id: "galaxy-kb", file: "knowledge/wiki/architecture/post-processor-knowledge-base.md",
    note: "post-processor canonical knowledge base" },
];

const EXTRACT_PROMPT = (note, body) => `You are an engineering analyst extracting REMAINING WORK from a PRISM document for the "echo" chat slot, whose domain is POST-PROCESSORS (CAM->controller G-code emission, CIMCO verification, NC dialects).

Document context: ${note}

Read the document below and output ONLY a terse markdown bullet list of:
- PENDING: every task / unit / feature / engine described as NOT-yet-built, incomplete, deferred, TODO, a gap, or "next". Name the concrete thing (unit id, file, capability).
- BLOCKERS: every blocker, operator-gate (needs a human action like opening CIMCO), or unmet dependency.

For each bullet, tag it [BUILDABLE-NOW] (echo can build it autonomously) or [OPERATOR-GATED] (needs a human/operator action) or [DEPENDS:<thing>].

Rules: Do NOT list completed/shipped work. Do NOT invent items not in the text. Max 18 bullets. Be concrete and concise.

=== DOCUMENT ===
${body}
=== END DOCUMENT ===

REMAINING WORK (bullets only):`;

async function askOllama(prompt) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PER_FILE_TIMEOUT_MS);
  try {
    const res = await fetch(`${OLLAMA}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.1, num_ctx: NUM_CTX, num_predict: NUM_PREDICT },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const j = await res.json();
    const text = (j.response || "").trim();
    if (!text) return { ok: false, error: `empty response (${j.error || "no error field"})` };
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  } finally {
    clearTimeout(timer);
  }
}

/** Flush the running results to disk after every slice (durable/resumable). */
async function flush(results, started) {
  const okCount = results.filter((r) => r.ok).length;
  const out = {
    schemaVersion: "1.0.0",
    generatedBy: `ollama:${MODEL}`,
    slicesTotal: SLICES.length,
    slicesOk: okCount,
    elapsedSec: ((Date.now() - started) / 1000).toFixed(0),
    results,
  };
  await writeFile(OUT_JSON, JSON.stringify(out, null, 2));
  const md = [`# Echo forge deep-dive (Ollama ${MODEL}) -- ${okCount}/${SLICES.length} slices`, ""];
  for (const r of results) {
    md.push(`## ${r.id} -- ${r.note}`);
    md.push(r.ok ? r.extraction : `_(failed: ${r.error})_`);
    md.push("");
  }
  await writeFile(OUT_MD, md.join("\n"));
}

/** Load prior results so a resumed run keeps completed slices. */
async function loadPrior() {
  if (FORCE) return new Map();
  try {
    const j = JSON.parse(await readFile(OUT_JSON, "utf8"));
    return new Map((j.results || []).filter((r) => r.ok).map((r) => [r.id, r]));
  } catch { return new Map(); }
}

async function main() {
  const started = Date.now();
  await mkdir(OUT_DIR, { recursive: true });
  const prior = await loadPrior();
  const results = [];
  for (const s of SLICES) {
    if (prior.has(s.id)) { results.push(prior.get(s.id)); console.error(`[dive] SKIP ${s.id} (cached)`); continue; }
    let body;
    try { body = (await readFile(path.join(ROOT, s.file), "utf8")).slice(0, INPUT_CAP); }
    catch (e) { results.push({ ...s, ok: false, error: `read: ${e.message}`, extraction: null }); await flush(results, started); console.error(`[dive] SKIP ${s.id}: ${e.message}`); continue; }
    const t0 = Date.now();
    const r = await askOllama(EXTRACT_PROMPT(s.note, body));
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    results.push(r.ok
      ? { ...s, ok: true, extraction: r.text, secs }
      : { ...s, ok: false, error: r.error, extraction: null, secs });
    await flush(results, started); // durable flush after EVERY slice
    console.error(r.ok ? `[dive] OK   ${s.id} (${secs}s, ${r.text.length} chars)` : `[dive] FAIL ${s.id}: ${r.error} (${secs}s)`);
  }
  const okCount = results.filter((r) => r.ok).length;
  console.error(`[dive] DONE ${okCount}/${SLICES.length} ok in ${((Date.now() - started) / 1000).toFixed(0)}s -> state/shared/cimco/echo-forge-dive.{json,md}`);
}

main().catch((e) => { console.error(`[dive] FATAL ${e?.message || e}`); process.exit(1); });
