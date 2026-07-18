#!/usr/bin/env node
/**
 * audit-rollup-chunks.mjs — U-F5-ROLLUP-CHUNK-AUDIT (slot:quebec /goal-loop iter3)
 *
 * Per-chunk routing audit of web/vite.config.ts manualChunks(). Pure read-only.
 * Spec: state/shared/specs/FRONTEND-PLAN-EXTENSION-2026-05-25.md §9.2 U-F5.
 *
 * Consumes vite.config.ts as the source-of-truth (rule list is NOT duplicated
 * here — if the rule changes there, the audit reflects it next run). Walks
 * web/src/ classifying every .ts/.tsx/.js/.jsx file by which `id.includes(...)`
 * predicate would match it first (mirroring rollup's first-match-wins).
 *
 * Usage:
 *   node scripts/audit-rollup-chunks.mjs                 # human-readable MD + JSON
 *   node scripts/audit-rollup-chunks.mjs --json          # stdout raw JSON
 *   node scripts/audit-rollup-chunks.mjs --out <path>    # custom output path
 */

import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const VITE_CONFIG = join(REPO, 'web', 'vite.config.ts');
const WEB_SRC = join(REPO, 'web', 'src');
const OUT_JSON = join(REPO, 'state', 'shared', 'dashboards', 'ROLLUP-CHUNK-AUDIT.json');
const OUT_MD = join(REPO, 'state', 'shared', 'dashboards', 'ROLLUP-CHUNK-AUDIT.md');

const args = process.argv.slice(2);
const wantJson = args.includes('--json');
const outIdx = args.indexOf('--out');
const customOut = outIdx >= 0 ? args[outIdx + 1] : null;

async function extractChunkRules(configText) {
  // Walk lines; when we see `return '<chunk>';`, attach every preceding
  // id.includes('<lit>') literal from the buffer to that chunk. First-match
  // ordering preserved. Buffer resets after each return.
  const lines = configText.split(/\r?\n/);
  const rules = [];
  let buffer = [];
  for (const line of lines) {
    const ret = line.match(/return\s+'([a-z0-9-]+)'/i);
    if (ret) {
      const preds = [];
      for (const b of buffer) {
        const re = /id\.includes\(\s*['"]([^'"]+)['"]\s*\)/g;
        let m;
        while ((m = re.exec(b)) !== null) {
          preds.push(m[1]);
        }
      }
      if (preds.length > 0) {
        rules.push({ chunk: ret[1], predicates: preds });
      }
      buffer = [];
    } else {
      buffer.push(line);
    }
  }
  return rules;
}

async function walkSource(root) {
  const out = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    let ents;
    try {
      ents = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of ents) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) {
        // node_modules excluded — the vite.config.ts rules that match it apply
        // to bundled deps, not source. Source-walk is for default-chunk discovery.
        if (ent.name === 'node_modules' || ent.name.startsWith('.')) continue;
        stack.push(p);
      } else if (ent.isFile() && /\.(tsx?|jsx?)$/.test(ent.name)) {
        const stats = await stat(p);
        const text = await readFile(p, 'utf8');
        out.push({
          path: p,
          rel: relative(REPO, p).replace(/\\/g, '/'),
          bytes: stats.size,
          loc: text.split(/\r?\n/).length,
        });
      }
    }
  }
  return out;
}

function classify(file, rules) {
  // vite.config.ts rules check both `/` and `\` separators for Windows. We
  // test both forms here so a rule keyed on either separator still matches.
  const posix = file.path.replace(/\\/g, '/');
  const win = file.path.replace(/\//g, '\\');
  for (const rule of rules) {
    for (const pred of rule.predicates) {
      if (posix.includes(pred) || win.includes(pred)) {
        return rule.chunk;
      }
    }
  }
  return null;
}

function aggregate(files, rules) {
  const byChunk = new Map();
  byChunk.set('__default__', { name: '__default__', files: [], totalLoc: 0, totalBytes: 0 });
  for (const r of rules) {
    byChunk.set(r.chunk, { name: r.chunk, files: [], totalLoc: 0, totalBytes: 0 });
  }
  for (const f of files) {
    const chunk = classify(f, rules) ?? '__default__';
    const bucket = byChunk.get(chunk);
    bucket.files.push(f);
    bucket.totalLoc += f.loc;
    bucket.totalBytes += f.bytes;
  }
  return Array.from(byChunk.values()).sort((a, b) => b.totalLoc - a.totalLoc);
}

function detectFindings(report) {
  const findings = [];
  for (const b of report.chunks) {
    if (b.name === '__default__') continue;
    // Dead-rule signal: a chunk with zero source matches likely only catches
    // node_modules (still valid) or no longer matches anything (dead). Either
    // way the operator should know.
    if (b.fileCount === 0) {
      findings.push({
        severity: 'WARN',
        message: `Chunk \`${b.name}\` has ZERO source-file matches. May only catch node_modules (which this audit doesn't walk) OR rule is dead.`,
      });
    }
  }
  const def = report.chunks.find((b) => b.name === '__default__');
  if (def) {
    const huge = def.files.filter((f) => f.loc > 1000).sort((a, b) => b.loc - a.loc);
    if (huge.length > 0) {
      findings.push({
        severity: 'INFO',
        message: `${huge.length} unbucketed file(s) over 1000 LOC. Top: ${huge.slice(0, 3).map((f) => `${f.rel} (${f.loc.toLocaleString()})`).join(', ')}. Candidates for an explicit chunk rule.`,
      });
    }
  }
  return findings;
}

function format(report) {
  const lines = [];
  lines.push('# ROLLUP-CHUNK-AUDIT');
  lines.push('');
  lines.push(`> U-F5-ROLLUP-CHUNK-AUDIT (slot:quebec /goal-loop iter3)`);
  lines.push(`> Generated: ${report.generatedAt}`);
  lines.push(`> Source: web/vite.config.ts manualChunks() + walk of web/src/`);
  lines.push('');
  lines.push(`Total source files: **${report.totalFiles}** · total source LOC: **${report.totalLoc.toLocaleString()}**`);
  lines.push(`Configured chunks (excl. default): **${report.chunkCount}**`);
  lines.push(`Files routed to a named chunk: **${report.totalFiles - report.defaultCount}** · files in default: **${report.defaultCount}**`);
  lines.push('');
  lines.push('## Per-chunk routing (LOC desc)');
  lines.push('');
  lines.push('| Chunk | Files | LOC | Bytes |');
  lines.push('|---|---:|---:|---:|');
  for (const b of report.chunks) {
    lines.push(`| ${b.name} | ${b.fileCount} | ${b.totalLoc.toLocaleString()} | ${b.totalBytes.toLocaleString()} |`);
  }
  lines.push('');
  lines.push('## Top-5 chunks by source LOC');
  lines.push('');
  for (const b of report.chunks.slice(0, 5)) {
    if (b.totalLoc === 0) break;
    lines.push(`### \`${b.name}\` — ${b.totalLoc.toLocaleString()} LOC across ${b.fileCount} files`);
    lines.push('');
    const top = [...b.files].sort((a, b) => b.loc - a.loc).slice(0, 5);
    for (const f of top) {
      lines.push(`- ${f.rel} (${f.loc.toLocaleString()} LOC)`);
    }
    lines.push('');
  }
  lines.push('## Top-10 unbucketed pages (default chunk, by LOC)');
  lines.push('');
  lines.push('Files matching NO `manualChunks()` rule land in per-route default chunks. Large files here are candidates for an explicit chunk rule.');
  lines.push('');
  const def = report.chunks.find((b) => b.name === '__default__');
  if (def) {
    const top = [...def.files].sort((a, b) => b.loc - a.loc).slice(0, 10);
    lines.push('| File | LOC |');
    lines.push('|---|---:|');
    for (const f of top) {
      lines.push(`| ${f.rel} | ${f.loc.toLocaleString()} |`);
    }
  }
  lines.push('');
  lines.push('## Findings (R12 — fail-loud)');
  lines.push('');
  if (report.findings.length === 0) {
    lines.push('_(no automated findings — manual review of the per-chunk table is the next step.)_');
  } else {
    for (const finding of report.findings) {
      lines.push(`- **${finding.severity}** — ${finding.message}`);
    }
  }
  lines.push('');
  lines.push('## Spec link');
  lines.push('');
  lines.push('Unit: U-F5-ROLLUP-CHUNK-AUDIT — `state/shared/specs/FRONTEND-PLAN-EXTENSION-2026-05-25.md` §9.2.');
  return lines.join('\n');
}

async function main() {
  let configText;
  try {
    configText = await readFile(VITE_CONFIG, 'utf8');
  } catch (e) {
    console.error(`FATAL: cannot read ${VITE_CONFIG}: ${e.message}`);
    process.exit(2);
  }
  const rules = await extractChunkRules(configText);
  if (rules.length === 0) {
    console.error(`FATAL: extracted 0 rules from ${VITE_CONFIG} — parser broken or manualChunks() gone.`);
    process.exit(3);
  }
  const files = await walkSource(WEB_SRC);
  if (files.length === 0) {
    console.error(`FATAL: walked 0 source files under ${WEB_SRC} — wrong root?`);
    process.exit(4);
  }
  const chunks = aggregate(files, rules);
  const def = chunks.find((b) => b.name === '__default__');
  const report = {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    unit: 'U-F5-ROLLUP-CHUNK-AUDIT',
    slot: 'quebec',
    sourceConfig: 'web/vite.config.ts',
    sourceWalk: 'web/src/',
    totalFiles: files.length,
    totalLoc: files.reduce((a, f) => a + f.loc, 0),
    chunkCount: rules.length,
    defaultCount: def?.files.length ?? 0,
    rules,
    chunks: chunks.map((b) => ({
      name: b.name,
      fileCount: b.files.length,
      totalLoc: b.totalLoc,
      totalBytes: b.totalBytes,
      files: b.files.map((f) => ({ rel: f.rel, loc: f.loc, bytes: f.bytes })),
    })),
    findings: [],
  };
  report.findings = detectFindings(report);

  if (wantJson) {
    process.stdout.write(JSON.stringify(report, null, 2));
    return;
  }

  const md = format(report);
  const outPath = customOut ?? OUT_MD;
  const jsonPath = customOut ? customOut.replace(/\.md$/, '.json') : OUT_JSON;
  await writeFile(jsonPath, JSON.stringify(report, null, 2));
  await writeFile(outPath, md);
  console.log(`audit-rollup-chunks: wrote ${jsonPath} + ${outPath}`);
  console.log(`  ${report.totalFiles} files / ${report.totalLoc.toLocaleString()} LOC across ${report.chunkCount} configured chunks; ${report.defaultCount} default-chunk files; ${report.findings.length} findings.`);
}

void main().catch((e) => {
  console.error('audit-rollup-chunks fatal:', e.stack || e.message);
  process.exit(1);
});
