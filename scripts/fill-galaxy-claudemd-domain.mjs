#!/usr/bin/env node
// scripts/fill-galaxy-claudemd-domain.mjs
//
// Populate a galaxy's CLAUDE.md "domain knowledge" core for galaxies whose
// CLAUDE.md is still a self-declared HONEST-STUB / Stub Sentinel. Grounds every
// fact in the galaxy's OWN existing artifacts (PATHS.md engine list, MEMORY.md
// High-ROI section, <g>_synthesis.md) — Ollama (local, operator-named) only
// DISTILLS those grounded facts into prose; it never invents domain claims.
//
// WHY: the galaxy-completeness audit (GALAXY-COMPLETENESS-AUDIT-2026-06-09) found
// the most common gap is CLAUDE.md self-declared "⚠ HONEST STUB" — the galactic-
// center doctrine a slot auto-loads is missing its domain-knowledge core (key
// engines, gotchas, tribal pointers). This fills that core from grounded facts.
// (operator /goal 2026-06-09: "each galaxy needs its own optimized claude.md …
// prism awareness filled with galaxy domain related knowledge … utilize obsidian
// and our ollama/docker setup".)
//
// DISCIPLINE:
//   - GROUNDED: engine pointers come from PATHS.md, high-ROI from MEMORY.md,
//     patterns from the synthesis. Ollama prose is tagged advisory. No fabricated
//     safety doctrine (R12 + soul: no softening-safety-thresholds).
//   - ADDITIVE + IDEMPOTENT: a single managed block delimited by
//     <!-- GALAXY-CLAUDEMD-FILL:BEGIN/END -->. Re-run replaces only that block.
//   - HONEST BANNER: the "⚠ HONEST STUB" / "Stub Sentinel" banner is retired ONLY
//     after real grounded content lands (never softens an empty file to "done").
//   - DRY-RUN by default; --apply writes. --no-ollama for deterministic-only.
//
// Usage:
//   node scripts/fill-galaxy-claudemd-domain.mjs --galaxy corpus-aggregation
//   node scripts/fill-galaxy-claudemd-domain.mjs --galaxy corpus-aggregation --apply
//   node scripts/fill-galaxy-claudemd-domain.mjs --unowned --apply   # all 9 unowned infra galaxies

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import http from "node:http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const ENG = path.join(REPO, "mcp-server", "src", "engines");
const PATTERNS = path.join(REPO, "knowledge", "memories", "patterns");
const TRIBAL = path.join(REPO, "knowledge", "wiki", "code-tribal");

export const BEGIN = "<!-- GALAXY-CLAUDEMD-FILL:BEGIN -->";
export const END = "<!-- GALAXY-CLAUDEMD-FILL:END -->";
const OLLAMA = "http://127.0.0.1:11434/api/generate";
const OLLAMA_MODEL = process.env.PRISM_FILL_MODEL || "qwen2.5-coder:32b";

// The 9 genuinely-unowned infra galaxies (golf-created 2026-05-29; no slot will
// fix them). Slot-owned stubs (cam/cad/wedm/speed-feed/academy) are left to their
// owning slots per lane discipline.
const UNOWNED = [
  "cad-fusion-live", "shop-floor", "compliance-safety", "corpus-aggregation",
  "knowledge-conversion", "mit-curriculum", "pdf-corpus", "pdf-corpus-mill", "tribal-knowledge",
];

const STUB_BANNER = /HONEST STUB|Stub Sentinel|⚠[^\n]{0,12}STUB/;

function read(p) { try { return fs.readFileSync(p, "utf8"); } catch { return null; } }

// Extract engine/file by-name pointers from PATHS.md (lines with `Engine`/`.ts`).
function enginePointers(pathsMd) {
  if (!pathsMd) return [];
  const out = [];
  for (const line of pathsMd.split("\n")) {
    const m = line.match(/`([A-Za-z0-9_/-]+(?:Engine)?\.ts)`/);
    if (m && !out.includes(m[1])) out.push(m[1]);
    if (out.length >= 12) break;
  }
  return out;
}

// Pull the High-ROI bullets a prior MEMORY.md fill surfaced.
function highRoi(memoryMd) {
  if (!memoryMd) return [];
  const m = memoryMd.match(/^##\s+high-roi memories[^\n]*\n([\s\S]*?)(?=^##\s+|(?![\s\S]))/im);
  if (!m) return [];
  return m[1].split("\n").map((l) => l.trim()).filter((l) => l.startsWith("- ")).slice(0, 5);
}

function synthFacts(galaxy) {
  const t = read(path.join(PATTERNS, `${galaxy}_synthesis.md`));
  if (!t || !/[^\s\x00]/.test(t)) return { patterns: [], decisions: [] };
  const grab = (h) => {
    const re = new RegExp(`^##\\s+${h}[^\\n]*\\n([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, "im");
    const mm = t.match(re);
    return mm ? mm[1].split("\n").map((l) => l.trim()).filter((l) => l.startsWith("- ")).slice(0, 4) : [];
  };
  return { patterns: grab("Recurring patterns"), decisions: grab("Key decisions[^\\n]*") };
}

function tribalPointers(galaxy) {
  const kw = galaxy.split("-");
  const hits = [];
  try {
    for (const f of fs.readdirSync(TRIBAL)) {
      const n = f.toLowerCase();
      if (kw.some((k) => k.length > 2 && n.includes(k))) hits.push(`knowledge/wiki/code-tribal/${f}`);
      if (hits.length >= 4) break;
    }
  } catch { /* dir absent */ }
  return hits;
}

function ollama(prompt, timeoutMs = 30000) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false, options: { num_ctx: 8192, temperature: 0.2 } });
    const req = http.request(OLLAMA, { method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => { try { resolve(JSON.parse(d).response?.trim() || null); } catch { resolve(null); } });
    });
    req.on("error", () => resolve(null));
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve(null); });
    req.write(body); req.end();
  });
}

async function buildBlock(galaxy, ctx, useOllama) {
  const { engines, roi, synth, tribal, scope } = ctx;
  let domainProse = null;
  if (useOllama && (roi.length || synth.patterns.length || synth.decisions.length)) {
    const facts = [
      scope ? `Scope: ${scope}` : "",
      engines.length ? `Engines: ${engines.join(", ")}` : "",
      ...roi, ...synth.decisions, ...synth.patterns,
    ].filter(Boolean).join("\n");
    const prompt = `You are documenting the "${galaxy}" galaxy of a manufacturing-intelligence platform. Using ONLY the grounded facts below (do not invent engines, numbers, or claims not present), write a concise "Domain knowledge" briefing of 3-5 sentences for an engineer who will work in this galaxy: what it does, its key components, and how it connects. Plain prose, no headings, no preamble.\n\nGROUNDED FACTS:\n${facts}`;
    domainProse = await ollama(prompt);
  }
  const lines = [BEGIN, ""];
  lines.push("## Domain knowledge");
  if (domainProse) {
    lines.push(`> ⚠ Ollama-distilled (${OLLAMA_MODEL}) from this galaxy's grounded artifacts (PATHS/MEMORY/synthesis) — advisory; verify engine names against PATHS.md.`);
    lines.push("");
    lines.push(domainProse);
  } else {
    lines.push("> Assembled from this galaxy's grounded artifacts (PATHS.md / MEMORY.md / synthesis).");
  }
  lines.push("");
  if (engines.length) {
    lines.push("## Key engines (grounded in PATHS.md)");
    for (const e of engines) lines.push(`- \`${e}\``);
    lines.push("");
  }
  if (roi.length) {
    lines.push("## High-ROI domain memories");
    for (const r of roi) lines.push(r);
    lines.push("");
  }
  if (tribal.length) {
    lines.push("## Tribal pointers");
    for (const t of tribal) lines.push(`- \`${t}\``);
    lines.push("");
  }
  lines.push("## Test commands");
  lines.push("```bash");
  lines.push("cd mcp-server && npx vitest run   # affected tests after engine edits");
  lines.push("```");
  lines.push("");
  lines.push(`_Domain-knowledge core auto-populated 2026-06-09 by \`scripts/fill-galaxy-claudemd-domain.mjs\` (grounded assembly + Ollama distillation). Idempotent: re-run to refresh. Edit source PATHS/MEMORY/synthesis, not this block._`);
  lines.push("");
  lines.push(END);
  return lines.join("\n");
}

export function applyBlock(text, block) {
  if (text.includes(BEGIN) && text.includes(END)) {
    return text.replace(new RegExp(`${BEGIN}[\\s\\S]*?${END}`, "m"), block);
  }
  // Insert before the "## Cross-refs" tail if present, else append.
  const xref = text.search(/^##\s+cross-refs/im);
  if (xref >= 0) return text.slice(0, xref) + block + "\n\n" + text.slice(xref);
  return text.replace(/\s*$/, "") + "\n\n" + block + "\n";
}

// Retire the stub banner ONLY when real content is present (never soften empty).
export function retireBanner(text, hasContent) {
  if (!hasContent) return text;
  return text
    .replace(/—\s*Stub Sentinel\s*\(2026-05-27\)/, "— Domain-local CLAUDE.md (P1 Galactic Center, populated 2026-06-09)")
    .replace(/\*\*⚠ HONEST STUB\.?\*\*/g, "**Populated 2026-06-09** (domain-knowledge core grounded from PATHS/MEMORY/synthesis).")
    .replace(/⚠ HONEST STUB/g, "Populated 2026-06-09")
    // Title-paren form: "(P1 Galactic Center, 2026-05-27 — HONEST STUB)".
    .replace(/—\s*HONEST STUB\)/g, "— populated 2026-06-09)")
    // Defensive: any remaining bare "HONEST STUB" once real content has landed.
    .replace(/HONEST STUB/g, "populated 2026-06-09");
}

export function extractScope(text) {
  const m = text && text.match(/^##\s+scope\s*\n([\s\S]*?)(?=^##\s+|(?![\s\S]))/im);
  return m ? m[1].trim().split("\n")[0].slice(0, 240) : null;
}

async function processGalaxy(galaxy, { apply, useOllama }) {
  const dir = path.join(ENG, galaxy);
  const cmPath = path.join(dir, "CLAUDE.md");
  const before = read(cmPath);
  if (before === null) return { galaxy, err: "no CLAUDE.md" };
  const ctx = {
    engines: enginePointers(read(path.join(dir, "PATHS.md"))),
    roi: highRoi(read(path.join(dir, "MEMORY.md"))),
    synth: synthFacts(galaxy),
    tribal: tribalPointers(galaxy),
    scope: extractScope(before),
  };
  const block = await buildBlock(galaxy, ctx, useOllama);
  const hasContent = ctx.engines.length > 0 || ctx.roi.length > 0 || block.includes("## Domain knowledge");
  let after = applyBlock(before, block);
  after = retireBanner(after, hasContent);
  const stillStub = STUB_BANNER.test(after.slice(0, 500));
  if (apply) fs.writeFileSync(cmPath, after, "utf8");
  return { galaxy, beforeB: before.length, afterB: after.length,
    engines: ctx.engines.length, roi: ctx.roi.length, tribal: ctx.tribal.length,
    ollama: useOllama && block.includes("Ollama-distilled"), stillStub, wrote: apply };
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const useOllama = !args.includes("--no-ollama");
  const gIdx = args.indexOf("--galaxy");
  const galaxies = gIdx >= 0 ? [args[gIdx + 1]] : (args.includes("--unowned") ? UNOWNED : UNOWNED);

  console.log(apply ? "=== APPLY ===" : "=== DRY-RUN (--apply to write) ===");
  for (const g of galaxies) {
    const r = await processGalaxy(g, { apply, useOllama });
    if (r.err) { console.log(`  ✗ ${g}: ${r.err}`); continue; }
    const tag = r.stillStub ? "⚠still-stub" : "✓";
    console.log(`  ${tag} ${g.padEnd(22)} ${r.beforeB}→${r.afterB}b  eng=${r.engines} roi=${r.roi} tribal=${r.tribal} ollama=${r.ollama ? "Y" : "n"}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) main();
