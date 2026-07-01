#!/usr/bin/env node
/**
 * audit-docker-files.mjs — P13-U01: enumerate docker-compose.yml + Dockerfiles
 * across PRISM (recursive, skips node_modules/.git/dist/build).
 *
 * Output: state/shared/specs/DOCKER-COMPOSE-AUDIT.{json,md}
 * Pure file enumeration — does NOT touch the Docker daemon.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = "H:/prism";
const OUT_JSON = "H:/prism/state/shared/specs/DOCKER-COMPOSE-AUDIT.json";
const OUT_MD = "H:/prism/state/shared/specs/DOCKER-COMPOSE-AUDIT.md";

const found = { composeFiles: [], dockerfiles: [] };

function walk(d, depth = 0) {
  if (depth > 6) return;
  let entries;
  try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name === ".git") continue;
    if (e.name === "node_modules") continue;
    if (e.name === "dist" || e.name === "build") continue;
    if (e.name === ".tsbuildcache") continue;
    if (e.name === "extracted") continue;
    if (e.name === "JM DIE") continue;
    if (e.name === "Resources") continue;
    const full = path.join(d, e.name);
    if (e.isDirectory()) walk(full, depth + 1);
    else {
      const lower = e.name.toLowerCase();
      const isCompose = lower === "docker-compose.yml" || lower === "docker-compose.yaml" ||
                        (lower.startsWith("docker-compose.") && (lower.endsWith(".yml") || lower.endsWith(".yaml")));
      const isDockerfile = lower === "dockerfile" || lower.endsWith(".dockerfile") || lower.startsWith("dockerfile.");
      if (isCompose || isDockerfile) {
        let stat;
        try { stat = fs.statSync(full); } catch { continue; }
        const rec = {
          path: full.replace(/\\/g, "/"),
          rel: full.replace(/\\/g, "/").replace(ROOT + "/", ""),
          bytes: stat.size,
          mtime: stat.mtime.toISOString(),
        };
        if (isCompose) found.composeFiles.push(rec); else found.dockerfiles.push(rec);
      }
    }
  }
}

walk(ROOT);

// Classify
function classify(rec) {
  const p = rec.path.toLowerCase();
  if (p.includes("/extracted/")) return "monolith-extracted";
  if (p.includes("/scripts/docker/")) return "prism-infra";
  if (p.includes("/.claude/")) return "claude-harness";
  if (p.includes("/mcp-server/")) return "mcp-server";
  if (p.includes("/cad-engine/")) return "cad-engine";
  if (p.includes("/web/")) return "web-frontend";
  if (p.includes("/qdrant")) return "qdrant";
  if (p.includes("/ollama")) return "ollama";
  return "other";
}

for (const c of found.composeFiles) c.classification = classify(c);
for (const d of found.dockerfiles) d.classification = classify(d);

const byClass = {};
for (const c of [...found.composeFiles, ...found.dockerfiles]) {
  byClass[c.classification] = (byClass[c.classification] || 0) + 1;
}

const out = {
  generated_at: new Date().toISOString(),
  unit: "P13-U01",
  milestone: "INTEL-OLLAMA-OBSIDIAN-MS0",
  advisory_only: true,
  scope: "H:/prism recursive (skips node_modules/.git/dist/build/extracted/JM DIE/Resources)",
  composeCount: found.composeFiles.length,
  dockerfileCount: found.dockerfiles.length,
  byClassification: byClass,
  composeFiles: found.composeFiles,
  dockerfiles: found.dockerfiles,
};

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2) + "\n");

const md = [
  `# Docker Compose + Dockerfile Audit (P13-U01)`,
  ``,
  `**Generated:** ${out.generated_at}`,
  `**Milestone:** INTEL-OLLAMA-OBSIDIAN-MS0 / P13-U01`,
  `**Scope:** ${out.scope}`,
  ``,
  `## Summary`,
  `- Compose files: **${found.composeFiles.length}**`,
  `- Dockerfiles: **${found.dockerfiles.length}**`,
  ``,
  `## By classification`,
  ...Object.entries(byClass).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`- **${k}**: ${v}`),
  ``,
  `## Compose files`,
  ...found.composeFiles.map(c=>`- \`${c.rel}\` (${c.bytes}B, ${c.classification})`),
  ``,
  `## Dockerfiles`,
  ...found.dockerfiles.map(d=>`- \`${d.rel}\` (${d.bytes}B, ${d.classification})`),
  ``,
  `---`,
  `Advisory-only — file enumeration without Docker daemon contact.`,
].join("\n");

fs.writeFileSync(OUT_MD, md);

console.log(JSON.stringify({ ok: true, composeCount: out.composeCount, dockerfileCount: out.dockerfileCount, byClassification: byClass, outJson: OUT_JSON, outMd: OUT_MD }, null, 2));
