#!/usr/bin/env node
// tier: T2
/**
 * close-out-audit-suggest.mjs
 *
 * UserPromptSubmit advisory hook. Fires when the user mentions close-out
 * keywords ("close out", "envelope drift", "stale milestones", "shipped
 * but pending", etc.) and surfaces:
 *   - the count of pending close-out candidates from the most recent audit
 *   - the freshness of CLOSE-OUT-CANDIDATES.json (suggests re-running if stale)
 *   - the top 3 candidates by confidence
 *
 * Pure suggest-only. NEVER blocks, NEVER auto-closes envelopes.
 *
 * Knobs:
 *   PRISM_CLOSE_OUT_AUDIT_INJECT=0     disable entirely
 *   PRISM_CLOSE_OUT_AUDIT_STALE_HRS=24 staleness threshold (default 24h)
 *   PRISM_CLOSE_OUT_AUDIT_K=3          max candidates to surface (default 3)
 */

import * as fs from "fs";
import * as path from "path";

const CANDIDATES_JSON = "H:/prism/state/shared/CLOSE-OUT-CANDIDATES.json";

const KEYWORDS = [
  /\bclose[- ]?outs?\b/i,
  /\benvelope drift\b/i,
  /\bstale milestones?\b/i,
  /\bshipped but pending\b/i,
  /\bwhat'?s done\b/i,
  /\baudit close[- ]?outs?\b/i,
  /\bunclosed units?\b/i,
  /\bfind shipped\b/i,
];

function disabled() {
  return process.env.PRISM_CLOSE_OUT_AUDIT_INJECT === "0";
}

function staleHours() {
  const n = parseInt(process.env.PRISM_CLOSE_OUT_AUDIT_STALE_HRS || "24", 10);
  return Number.isFinite(n) && n > 0 ? n : 24;
}

function topK() {
  const n = parseInt(process.env.PRISM_CLOSE_OUT_AUDIT_K || "3", 10);
  return Number.isFinite(n) && n > 0 ? n : 3;
}

async function readStdinJson() {
  return new Promise((resolve) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { buf += chunk; });
    process.stdin.on("end", () => {
      try { resolve(JSON.parse(buf || "{}")); }
      catch { resolve({}); }
    });
    process.stdin.on("error", () => resolve({}));
    // Safety: time out stdin read after 200ms — never block the hook chain.
    setTimeout(() => resolve({}), 200);
  });
}

function shouldFire(prompt) {
  if (typeof prompt !== "string" || prompt.length === 0) return false;
  return KEYWORDS.some((re) => re.test(prompt));
}

function loadCandidates() {
  try {
    if (!fs.existsSync(CANDIDATES_JSON)) {
      return { ok: false, missing: true };
    }
    const stat = fs.statSync(CANDIDATES_JSON);
    const ageMs = Date.now() - stat.mtimeMs;
    const ageHours = ageMs / (1000 * 60 * 60);
    const data = JSON.parse(fs.readFileSync(CANDIDATES_JSON, "utf8"));
    return { ok: true, ageHours, data };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
}

function topCandidates(data, k) {
  const out = [];
  const results = Array.isArray(data && data.results) ? data.results : [];
  for (const r of results) {
    const cands = Array.isArray(r && r.candidates) ? r.candidates : [];
    for (const c of cands) {
      out.push({
        milestone: r.milestone,
        unit_id: c.unit_id,
        title: c.title || "",
        confidence: c.confidence,
      });
    }
  }
  out.sort((a, b) => b.confidence - a.confidence);
  return out.slice(0, k);
}

function emit(messageLines) {
  // UserPromptSubmit advisory shape — non-blocking, prepends a system note.
  const payload = {
    decision: "approve",
    systemMessage: messageLines.join("\n"),
  };
  process.stdout.write(JSON.stringify(payload));
}

async function main() {
  if (disabled()) return;
  const event = await readStdinJson();
  const prompt = event && event.prompt;
  if (!shouldFire(prompt)) return;
  const c = loadCandidates();
  const lines = ["## 🧾 Close-out audit reminder"];
  if (!c.ok) {
    if (c.missing) {
      lines.push("No close-out candidates report yet. Run:");
    } else {
      lines.push(`Couldn't read CLOSE-OUT-CANDIDATES.json (${c.error}). Re-run:`);
    }
    lines.push("`node H:/prism/scripts/audit-close-out-candidates.mjs`");
    lines.push("Skill: `/close-out-audit`. Memory: `feedback_auto_close_out`.");
    emit(lines);
    return;
  }
  const stale = c.ageHours > staleHours();
  const top = topCandidates(c.data, topK());
  const allCount = (c.data && Array.isArray(c.data.results)) ?
    c.data.results.reduce((s, r) => s + (Array.isArray(r.candidates) ? r.candidates.length : 0), 0) : 0;
  lines.push(`Last audit: ${Math.round(c.ageHours * 10) / 10}h ago${stale ? " ⚠ STALE — re-run recommended" : ""}`);
  lines.push(`Candidates flagged: **${allCount}** (advisory only — human-verify before flipping envelope)`);
  if (top.length > 0) {
    lines.push("");
    lines.push(`Top ${top.length} by confidence:`);
    for (const t of top) {
      lines.push(`- \`${t.milestone}\` / \`${t.unit_id}\` (${t.confidence.toFixed(2)}) — ${t.title.slice(0, 60)}`);
    }
  }
  lines.push("");
  lines.push("Refresh: `node H:/prism/scripts/audit-close-out-candidates.mjs`");
  lines.push("Skill: `/close-out-audit` · Memory: `feedback_auto_close_out` · Doctrine: CLAUDE.md §CLOSE-OUT AUTOMATION");
  emit(lines);
}

main().catch((err) => {
  // Never block hook chain on error
  process.stderr.write(`[close-out-audit-suggest] error: ${err && err.message ? err.message : err}\n`);
});
