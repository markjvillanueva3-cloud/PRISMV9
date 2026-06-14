#!/usr/bin/env node
/**
 * generate-galaxy-soul-enrichment.mjs -- mint DOMAIN-SPECIFIC soul enrichment (refuses +
 * domain filter + specialist body) for every galaxy on the LOCAL Blackwell GPU via
 * ollama-fanout (AI-SYNERGY-AUDIT-MS0/U-AISYN-SOUL-ENRICH, slot:charlie).
 *
 * WHY: the GALAXY-SOUL-CLAUDE-QUALITY audit graded 23/34 souls weak ("lacks domain-specific
 * identity and refuses"). Root cause: slotless infra galaxies have no owner-slot soul to
 * inherit refuses/voice from, so generate-galaxy-souls.mjs emitted a generic posture-only soul.
 * This generates the missing domain-grounded identity from each galaxy's OWN CLAUDE.md +
 * MEMORY.md, on the local GPU (0 Claude API -- the rate-limit lesson: never burst Claude agents
 * across the org quota; route mechanical generation-at-scale to the 96GB GPU).
 *
 * Output: state/shared/specs/galaxy-soul-enrichment.json -- {galaxy: {domainFilter, refuses[],
 * specialistBody}}. Consumed by scripts/generate-galaxy-souls.mjs -> renderGalaxySoul.
 *
 * Usage:
 *   node scripts/generate-galaxy-soul-enrichment.mjs               # all galaxies
 *   node scripts/generate-galaxy-soul-enrichment.mjs --model gpt-oss:120b --concurrency 3
 *   node scripts/generate-galaxy-soul-enrichment.mjs --limit 3     # smoke
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ollamaFanoutWithFallback, DEFAULT_FANOUT_MODEL } from "./lib/ollama-fanout.mjs";
import { extractJsonObject } from "./lib/extract-json-object.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENG = path.join(ROOT, "mcp-server/src/engines");
const OUT = path.join(ROOT, "state/shared/specs/galaxy-soul-enrichment.json");
const CLAUDE_CAP = 3500;
const MEMORY_CAP = 1800;

export function enumerateGalaxies() {
  return fs
    .readdirSync(ENG, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith(".") && fs.existsSync(path.join(ENG, e.name, "CLAUDE.md")))
    .map((e) => e.name)
    .sort();
}

function readCapped(p, cap) {
  try {
    return fs.readFileSync(p, "utf8").slice(0, cap);
  } catch {
    return "";
  }
}

/** Build the per-galaxy enrichment prompt (PURE). */
export function buildEnrichPrompt(galaxy, claudeText, memoryText) {
  return `You are forging the DOMAIN-SPECIALIST IDENTITY for one galaxy of a manufacturing-intelligence platform (PRISM). A galaxy is a real engineering domain. Read its doctrine and produce a soul that a domain expert in THAT field would recognize as their own -- specific, not generic.

GALAXY: ${galaxy}

=== its CLAUDE.md (domain doctrine) ===
${claudeText || "(missing)"}

=== its MEMORY.md (domain brain) ===
${memoryText || "(missing)"}

Produce THREE things, all grounded in THIS galaxy's actual domain (never generic boilerplate):
1. domainFilter: a lowercase pipe-delimited keyword alternation that matches this domain's vocabulary (e.g. for a milling galaxy: "mill|endmill|flute|chipload|climb|conventional|pocket|facing"). 6-12 tokens.
2. refuses: 4-6 things THIS specialist must NEVER do -- domain-grounded safety/correctness violations (e.g. for compliance-safety: "approving-shop-floor-output-below-the-S(x)-gate"; for pdf-corpus: "claiming-extraction-coverage-without-a-page-count-verification"). Short kebab-case phrases. Make them SPECIFIC to ${galaxy}, not generic.
3. specialistBody: 2-3 sentences (<=400 chars) describing what this specialist obsesses over, the units/artifacts it speaks in, and its single non-negotiable principle. Concrete to the domain.

Respond with ONLY one JSON object, no prose, no markdown fence:
{"galaxy":"${galaxy}","domainFilter":"a|b|c","refuses":["x","y"],"specialistBody":"..."}`;
}

/** Parse + sanitize one enrichment response (fail-soft). PURE. */
export function parseEnrichment(text, galaxy) {
  const obj = extractJsonObject(text);
  if (!obj) return { galaxy, parseError: "no-json" };
  const cleanFilter = String(obj.domainFilter || "")
    .toLowerCase()
    .replace(/[^a-z0-9|+_-]/g, "")
    .replace(/\|+/g, "|")
    .replace(/^\||\|$/g, "")
    .slice(0, 160);
  // Accept an array OR a single string; SPLIT joined phrases (comma/semicolon/" and ") first --
  // local models often return refuses as one comma-joined string, and stripping the commas
  // without splitting fuses every refuse into one 80-char blob (the bug this guards).
  const rawRefuses = Array.isArray(obj.refuses) ? obj.refuses : typeof obj.refuses === "string" ? [obj.refuses] : [];
  const refuses = rawRefuses
    .flatMap((r) => String(r).split(/\s*[,;]\s*|\s+and\s+/i))
    .map((r) =>
      r
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9()/_-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80)
    )
    .filter((r) => r.length >= 3)
    .slice(0, 6);
  const specialistBody = String(obj.specialistBody || "").replace(/\s+/g, " ").trim().slice(0, 400);
  if (!cleanFilter && !refuses.length && !specialistBody) return { galaxy, parseError: "empty-fields" };
  return { galaxy, domainFilter: cleanFilter, refuses, specialistBody };
}

export async function runEnrichment(opts = {}) {
  const model = opts.model || process.env.PRISM_FANOUT_MODEL || DEFAULT_FANOUT_MODEL;
  const concurrency = Number(opts.concurrency) || Number(process.env.PRISM_FANOUT_CONCURRENCY) || 3;
  let galaxies = enumerateGalaxies();
  if (opts.limit) galaxies = galaxies.slice(0, opts.limit);

  const tasks = galaxies.map((g) => ({
    id: g,
    prompt: buildEnrichPrompt(g, readCapped(path.join(ENG, g, "CLAUDE.md"), CLAUDE_CAP), readCapped(path.join(ENG, g, "MEMORY.md"), MEMORY_CAP)),
  }));

  process.stdout.write(`Enriching ${tasks.length} galaxy souls on LOCAL ${model} (concurrency ${concurrency}) -- 0 Claude API...\n`);
  let done = 0;
  const fan = await ollamaFanoutWithFallback(tasks, {
    model,
    concurrency,
    timeoutMs: 300000,
    fallbackReason: "galaxy soul enrichment -- local Ollama unreachable",
    onResult: (r) => {
      done++;
      process.stdout.write(`  [${done}/${tasks.length}] ${r.id} ${r.ok ? "ok" : "FAIL"}\n`);
    },
  });

  const byGalaxy = {};
  const errors = [];
  for (const r of fan.results) {
    if (!r) continue;
    if (!r.ok) {
      errors.push(`${r.id}: ${r.error || "fanout-fail"}`);
      continue;
    }
    const e = parseEnrichment(r.text, r.id);
    if (e.parseError) errors.push(`${e.galaxy}: ${e.parseError}`);
    else byGalaxy[e.galaxy] = { domainFilter: e.domainFilter, refuses: e.refuses, specialistBody: e.specialistBody };
  }

  // fallback: when Ollama is down/reaped the enrichment batch yields nothing -- surface the
  // operator's Sonnet-fallback directive (re-run failed enrich tasks on bounded Sonnet, never
  // Opus) instead of silently writing an empty enrichment. See ollama-fanout.ollamaFanoutWithFallback.
  const fallback = fan.fallback || { needed: false };
  const out = { meta: { model, concurrency, generatedAt: new Date().toISOString(), enriched: Object.keys(byGalaxy).length, total: tasks.length, fallback }, galaxies: byGalaxy };
  if (!opts.dry) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    const tmp = `${OUT}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(out, null, 2));
    fs.renameSync(tmp, OUT);
  }
  return { ...out, errors, fallback, wrote: !opts.dry };
}

async function main() {
  const argv = process.argv.slice(2);
  const get = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };
  const r = await runEnrichment({
    model: get("--model"),
    concurrency: get("--concurrency"),
    limit: get("--limit") ? Number(get("--limit")) : 0,
    dry: argv.includes("--dry"),
  });
  process.stdout.write(`\n${r.wrote ? "wrote" : "[dry]"} ${r.meta.enriched}/${r.meta.total} enrichments -> ${path.relative(ROOT, OUT)}${r.errors.length ? ` (${r.errors.length} error(s))` : ""}\n`);
  for (const e of r.errors) process.stderr.write(`  ! ${e}\n`);
  if (r.fallback && r.fallback.needed) {
    process.stderr.write(`\n[ollama-fallback] ${r.fallback.failedCount}/${r.fallback.total} enrich tasks need the SONNET lane (Ollama unreachable). ${r.fallback.directive}\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    process.stderr.write(`generate-galaxy-soul-enrichment failed: ${e && e.message}\n`);
    process.exit(1);
  });
}
