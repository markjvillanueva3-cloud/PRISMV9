#!/usr/bin/env node
/**
 * generate-build-vision.mjs
 *
 * Renders state/shared/PRISM-BUILD-VISION.md from the hand-curated spec at
 * mcp-server/data/build-vision-spec.json. Cross-references audit md files in
 * state/shared/ to embed CURRENT-STATE deltas + GAPS per component.
 *
 * The spec is HAND-EDITED. This script regenerates the markdown so the
 * structure stays consistent and the audit-derived sections stay fresh.
 *
 * Read by:
 *   - generate-claude-brief.mjs (1-line pointer in brief)
 *   - CLAUDE.md doctrine (explicit reference for pre-build planning)
 *   - /refresh-awareness slash command (regenerated)
 *   - brief-drift-monitor.mjs (regenerated when spec or audit changes)
 *
 * Flags:
 *   --quiet     suppress success message
 *   --stdout    also emit content to stdout
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..", "..");
const SPEC = resolve(__dirname, "build-vision-spec.json");
const SHARED = resolve(PRISM_ROOT, "state", "shared");
const OUT = resolve(SHARED, "PRISM-BUILD-VISION.md");

const args = new Set(process.argv.slice(2));
const FLAGS = {
  stdout: args.has("--stdout"),
  quiet: args.has("--quiet"),
};

function safeRead(path) {
  try {
    return existsSync(path) ? readFileSync(path, "utf8") : null;
  } catch {
    return null;
  }
}

function loadSpec() {
  const raw = safeRead(SPEC);
  if (!raw) return { error: "spec-missing", spec: null };
  try {
    return { error: null, spec: JSON.parse(raw) };
  } catch (err) {
    return { error: "spec-malformed:" + err.message, spec: null };
  }
}

function gapsForComponent(componentId, gapsText) {
  if (!gapsText) return [];
  const blocks = gapsText.split(/^##\s+\d+\.\s+/m).slice(1);
  const matched = [];
  const idTokens = {
    sfc: ["sfc", "speed/feed", "kienzle", "tool life"],
    master_post: ["post", "master post", "lead-in", "lead-out", "build-quality", "stage", "adaptive s/f"],
    cad_cam_ai: ["cad ai", "cad/cam", "lora"],
    ai_hierarchy: ["ai tier", "system coordinator", "feedback loop", "ai claim"],
    jm_fleet: ["jm fleet", "machine", "haas", "okuma", "hurco", "mitsubishi", "b250"],
    erp_business: ["quote", "billing", "portal", "erp", "subscription"],
    knowledge_ingestion: ["tribal", "video learn", "pdf learn", "knowledge"],
    closed_loop_learning: ["feedback", "calibration", "drift", "lora training"],
    hooks_safety_quality: ["hook", "safety", "s(x)", "omega", "compliance"],
    frontend_web: ["frontend", "react", "vite", "academy", "dashboard"],
    cam_bridges: ["esprit", "fusion 360", "hypermill", "mastercam", "solidworks", "inventor hsm"],
  };
  const tokens = idTokens[componentId] || [];
  for (const block of blocks) {
    const head = block.split("\n", 1)[0].toLowerCase();
    if (tokens.some((t) => head.includes(t))) {
      const m = block.match(/\*\*([^*]+)\*\*/);
      const title = m ? m[1].trim() : head.split("—")[0].trim();
      matched.push(title);
    }
  }
  return matched.slice(0, 6);
}

function format(spec) {
  const now = new Date().toISOString();
  const gapsText = safeRead(resolve(SHARED, "AUDIT-PRIORITIZED-GAPS.md")) || "";

  let md = `# PRISM-BUILD-VISION — what each component must do at maximum value

**Auto-generated:** ${now}  ·  Source: \`mcp-server/data/build-vision-spec.json\` (hand-curated; this markdown is rendered)
**Schema:** ${spec.schemaVersion}

> This file answers the question every Claude session asks before building anything: **what is this component meant to do at maximum value?** Each component has its full feature set, current build status (pulled from audit), gaps to maximum value, and build-doctrine pointers. Consult the section for the component you're touching BEFORE you write code.
>
> **Discipline:** if you're proposing a feature for a component, check whether it's already in this file's "Vision features" list. If yes, you're filling a gap — proceed. If no, ask whether it should be added to this file FIRST so future Claudes know the new feature is part of the vision.

---

## Components covered

`;

  for (const c of spec.components) {
    const tag = c.saleable ? "💰 saleable" : "🔧 infra";
    md += `- [${c.name}](#${c.id}) — ${tag}, tier: ${c.tier}\n`;
  }
  md += `\n---\n\n`;

  for (const c of spec.components) {
    const tag = c.saleable ? "💰 saleable" : "🔧 infrastructure";
    md += `## <a id="${c.id}"></a>${c.name}\n\n`;
    md += `*${tag}  ·  tier: ${c.tier}*\n\n`;
    md += `**One-line vision:** ${c.vision_one_line}\n\n`;

    md += `### Vision features (what extracts maximum value)\n\n`;
    for (const f of c.vision_features) {
      md += `- ${f}\n`;
    }
    md += `\n`;

    const gaps = gapsForComponent(c.id, gapsText);
    md += `### Gaps to maximum value (from current audit)\n\n`;
    if (gaps.length === 0) {
      md += `*no audit-mapped gaps for this component currently — see \`AUDIT-PRIORITIZED-GAPS.md\` for the full list*\n\n`;
    } else {
      for (const g of gaps) {
        md += `- [ ] ${g}\n`;
      }
      md += `\n`;
    }

    md += `### Build doctrine — read before changing this component\n\n`;
    for (const p of c.build_doctrine_pointers) {
      md += `- ${p}\n`;
    }
    md += `\n`;

    md += `### Source audit files\n\n`;
    for (const f of c.key_audit_files) {
      md += `- \`state/shared/${f}\`\n`;
    }
    md += `\n---\n\n`;
  }

  md += `## How to use this file

**Before writing code for a component:**
1. Find the component section above.
2. Read its **Vision features** — is your proposed feature already there? If yes → you're filling a gap, proceed.
3. Read its **Gaps to maximum value** — is your proposal one of those? If yes → high priority, ship it with the discipline in build-doctrine.
4. Read its **Build doctrine** pointers — these are the gotchas + invariants for this component.
5. If your proposal is NEW (not in vision features), ask: should it be added to the vision spec FIRST so it's tracked? Open the JSON spec and propose the addition; then write the code.

**To update vision:** edit \`mcp-server/data/build-vision-spec.json\` and run \`node ${resolve(__dirname, "generate-build-vision.mjs").replace(/\\\\/g, "/")}\` (or \`/refresh-awareness\`).

**Auto-regeneration:** the brief drift monitor regenerates this file when \`build-vision-spec.json\` or any audit md file changes mtime.
`;

  return md;
}

function main() {
  const { error, spec } = loadSpec();
  let content;

  if (error) {
    content = `# PRISM-BUILD-VISION — generation degraded\n\n**Reason:** ${error}\n\nFix \`${SPEC.replace(/\\\\/g, "/")}\` and re-run. The spec must be valid JSON conforming to schemaVersion ${1.0}.\n`;
  } else {
    try {
      content = format(spec);
    } catch (err) {
      content = `# PRISM-BUILD-VISION — render error\n\n**Error:** ${err.message}\n\nSpec loaded but render failed. Diagnose by running with --stdout.\n`;
    }
  }

  writeFileSync(OUT, content, "utf8");

  if (FLAGS.stdout) {
    process.stdout.write(content);
  }
  if (!FLAGS.quiet) {
    process.stderr.write(`Build vision written to ${OUT} (${content.length} bytes)\n`);
  }

  process.exit(0);
}

main();
