#!/usr/bin/env node
// tier: T2
/**
 * domain-soul-agent-suggest.mjs -- DOMAIN-SOUL-AGENTS / U4.
 *
 * UserPromptSubmit hook (advisory, suggest-only, never blocks). When a prompt touches a
 * domain's data, surface a one-line suggestion to spawn that domain's expert agent
 * (`<slot>-<domain>`, e.g. `charlie-quoting`). The operator directive 2026-06-30:
 * "if a task involves ANY data from their domain spawn the agent" -- this hook is the
 * surfacing mechanism (the chat decides whether to actually spawn; a hook cannot spawn).
 *
 * Mechanism: match the prompt against each slot soul's `domain_filter` regex
 * (state/shared/slot-souls/<slot>.md) -- the same per-domain detection the
 * `prism_session:domain_soul_agent_route` action uses. Emits the top-K matches as
 * `additionalContext`. Cheap-when-irrelevant: regex-only, no model, no network.
 *
 * Knobs:
 *   PRISM_DOMAIN_SOUL_AGENT_SUGGEST_DISABLE=1  -> no-op
 *   PRISM_DOMAIN_SOUL_AGENT_SUGGEST_K=<N>       -> top-K (default 2)
 *   PRISM_DOMAIN_SOUL_AGENT_SUGGEST_MINLEN=<N>  -> min prompt length to fire (default 12)
 *
 * Fail-soft: any read/parse error -> silent exit 0 (advisory; never breaks the prompt).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

if (process.env.PRISM_DOMAIN_SOUL_AGENT_SUGGEST_DISABLE === "1") process.exit(0);

const HOOK_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_CANDIDATES = [process.env.PRISM_ROOT, join(HOOK_DIR, "..", ".."), "H:/prism"];

function resolveRoot() {
  for (const r of ROOT_CANDIDATES) {
    if (r && existsSync(join(r, "state/shared/slot-souls"))) return r;
  }
  return null;
}

/** slot->galaxy map (the canonical scripts/lib/slot-galaxy-map.mjs, loaded dynamically).
 *  Returns null on any failure -> the caller then SKIPS all suggestions (we never emit a
 *  `<slot>-<slot>` guess; an unmapped or unloadable slot has no spawnable agent). There is
 *  deliberately no static fallback copy -- a drifted hard-coded map would be worse than no
 *  suggestion (3-of-3 arm-B finding: the prior comment claimed a static fallback that did
 *  not exist, and an import failure would have emitted `charlie-charlie` fleet-wide). */
async function loadSlotGalaxyMap(root) {
  try {
    const mapPath = join(root, "scripts/lib/slot-galaxy-map.mjs");
    if (existsSync(mapPath)) {
      const mod = await import(pathToFileURL(mapPath).href);
      if (mod && mod.SLOT_GALAXY_MAP) return mod.SLOT_GALAXY_MAP;
    }
  } catch {
    /* fall through -> null -> caller skips (no <slot>-<slot> guess) */
  }
  return null;
}

/** Extract the `domain_filter:` value from a slot soul's frontmatter (flat YAML). */
function domainFilterOf(soulText) {
  const m = String(soulText || "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const line = m[1].split(/\r?\n/).find((l) => /^domain_filter\s*:/.test(l));
  if (!line) return null;
  let v = line.replace(/^domain_filter\s*:\s*/, "").trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  return v || null;
}

async function main() {
  let payload = {};
  try {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    const s = Buffer.concat(chunks).toString("utf8").trim();
    if (s) payload = JSON.parse(s);
  } catch {
    process.exit(0);
  }

  const prompt = String(payload.prompt || "");
  const minLen = Number(process.env.PRISM_DOMAIN_SOUL_AGENT_SUGGEST_MINLEN || 12);
  if (prompt.length < minLen) process.exit(0);

  const root = resolveRoot();
  if (!root) process.exit(0);

  const map = await loadSlotGalaxyMap(root);
  const soulsDir = join(root, "state/shared/slot-souls");
  let files;
  try {
    files = readdirSync(soulsDir).filter((f) => f.endsWith(".md") && f !== "README.md" && !f.includes(".draft"));
  } catch {
    process.exit(0);
  }

  const matches = [];
  for (const f of files) {
    const slot = f.replace(/\.md$/, "");
    if (slot === "zebra") continue; // alias of zulu
    let text = "";
    try {
      text = readFileSync(join(soulsDir, f), "utf8");
    } catch {
      continue;
    }
    const df = domainFilterOf(text);
    if (!df) continue;
    let re;
    try {
      re = new RegExp(df, "i");
    } catch {
      continue;
    }
    const hit = prompt.match(re);
    if (!hit) continue;
    // Only suggest a slot that maps to a real galaxy/agent. If the map failed to load OR
    // the slot is one of the deliberately-unmapped slots (november/yankee), SKIP it --
    // never emit a non-spawnable `<slot>-<slot>` guess (3-of-3 arm-B: the dispatcher
    // iterates mapped slots only; the hook must match that, not fall back to `slot`).
    const domain = map && map[slot];
    if (!domain) continue;
    matches.push({ slot, domain, agent: `${slot}-${domain}`, keyword: hit[0] });
  }

  if (!matches.length) process.exit(0);

  // Build/review INTENT -> PREFER the domain-soul over the generic coder/implementer/reviewer
  // (operator directive 2026-07-01: "utilize domain souls for agent calls" + domain experts in review).
  // Additive: the stronger directive line only prepends when the prompt shows build/review intent;
  // a bare domain-data mention keeps the original suggest-only wording (back-compat).
  const buildReviewIntent = /\b(build|implement|creat\w*|add|fix|refactor|wir\w*|review|audit|test|scrutin\w*|forge|generat\w*)\b/i.test(prompt);
  const k = Math.max(1, Number(process.env.PRISM_DOMAIN_SOUL_AGENT_SUGGEST_K || 2));
  const top = matches.slice(0, k);
  const lines = [
    "## 🧠 Domain-soul agent suggestion (task touches a domain's data)",
    "",
    ...(buildReviewIntent
      ? [
          "**PREFER these domain-soul agents over the generic `coder`/`implementer`/`reviewer`** for this domain work -- they ground on the galaxy corpus + cite `file:line` (a blind model hallucinates domain facts). For a REVIEW/scrutiny pass, ADD the matching domain-soul as an extra reviewer arm ALONGSIDE the generic reviewers (advisory, does not replace the 3-of-3).",
          "",
        ]
      : []),
    ...top.map(
      (m) =>
        `- Spawn **\`${m.agent}\`** via the Agent tool (\`subagent_type: "${m.agent}"\`) -- this prompt touches **${m.domain}** data (matched "${m.keyword}"). Carries the ${m.slot} persona + refuse-list + ${m.domain} knowledge.`
    ),
    "",
    "_Suggest-only (you decide whether to spawn). Route lane via `prism_session:domain_soul_agent_route`. Disable: `PRISM_DOMAIN_SOUL_AGENT_SUGGEST_DISABLE=1`._",
  ];

  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: lines.join("\n") } })
  );
  process.exit(0);
}

main().catch(() => process.exit(0));
