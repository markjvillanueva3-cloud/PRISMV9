#!/usr/bin/env node
// tier: T2
// CAD-PIPELINE-WIRE-MS0/U-CAD-KNOWLEDGE-INDEX
//
// One-shot index builder for the cad-pipeline-knowledge-inject hook.
// Walks knowledge/wiki/architecture/cad-params/{system}/{op}/{param}.md
// + knowledge/wiki/architecture/tribal/cad-params/*.md
// + knowledge/wiki/architecture/courses/*.md (engineering/CAD-CAM ones)
// + extracted CAD PDF wiki entries (knowledge/wiki/architecture/extracts/cad-*.md)
//
// Emits state/shared/cad-pipeline-knowledge-index.json:
//   { systems: { fusion360: { ops: { extrude: { params: [...], path: "..." } } } },
//     tokenIndex: { "extrude": [nodeRef, ...], "fillet": [...] },
//     tribal: [{ name, path, keywords }],
//     courses: [{ name, path, system_hint }],
//     pdfExtracts: [{ name, path, system_hint }] }
//
// Rebuild cost: ~5s for 5000 files. Re-run after any wiki/cad-params/* change.

import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join, relative, basename } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname ?? new URL(".", import.meta.url).pathname, "..");
const WIKI_CAD_PARAMS = resolve(REPO_ROOT, "knowledge/wiki/architecture/cad-params");
const WIKI_TRIBAL_CAD = resolve(REPO_ROOT, "knowledge/wiki/architecture/tribal/cad-params");
const WIKI_TRIBAL = resolve(REPO_ROOT, "knowledge/wiki/architecture/tribal");
const WIKI_COURSES = resolve(REPO_ROOT, "knowledge/wiki/architecture/courses");
const WIKI_EXTRACTS = resolve(REPO_ROOT, "knowledge/wiki/architecture/extracts");
const WIKI_MONOLITH_MOD = resolve(REPO_ROOT, "knowledge/wiki/architecture/monolith-modules");
const OUT_PATH = resolve(REPO_ROOT, "state/shared/cad-pipeline-knowledge-index.json");

const PRIORITY_SYSTEMS = ["hypercad", "hypercads", "fusion360", "mastercam", "solidworks", "inventor"];
const SYSTEM_ALIASES = {
  "hypercad": "hypercad",
  "hypercads": "hypercad",  // both dirs map to one canonical
  "hyper-cad": "hypercad",
  "hypermill": "hypercad",  // hyperMILL/hyperCAD same vendor stack
  "fusion": "fusion360",
  "fusion360": "fusion360",
  "fusion-360": "fusion360",
  "mastercam": "mastercam",
  "master-cam": "mastercam",
  "solidworks": "solidworks",
  "solid-works": "solidworks",
  "sw": "solidworks",
  "inventor": "inventor",
  "autodesk-inventor": "inventor",
};

function safeReadDir(d) {
  try { return existsSync(d) ? readdirSync(d) : []; } catch { return []; }
}

function walkCadParams() {
  // structure: cad-params/{system}/{op-slug}/{param-slug}.md
  const systems = {};
  const tokenIndex = {};
  let opCount = 0;
  let paramCount = 0;

  for (const sysDir of safeReadDir(WIKI_CAD_PARAMS)) {
    const sysPath = join(WIKI_CAD_PARAMS, sysDir);
    if (!statSync(sysPath).isDirectory()) continue;
    const canonicalSystem = SYSTEM_ALIASES[sysDir.toLowerCase()] || sysDir.toLowerCase();
    if (!systems[canonicalSystem]) systems[canonicalSystem] = { ops: {} };

    for (const opDir of safeReadDir(sysPath)) {
      const opPath = join(sysPath, opDir);
      let st;
      try { st = statSync(opPath); } catch { continue; }
      if (!st.isDirectory()) continue;

      const opSlug = opDir.toLowerCase();
      const params = [];
      for (const f of safeReadDir(opPath)) {
        if (!f.endsWith(".md")) continue;
        const paramSlug = f.replace(/\.md$/i, "").toLowerCase();
        const relPath = relative(REPO_ROOT, join(opPath, f)).replace(/\\/g, "/");
        params.push({ slug: paramSlug, path: relPath });
        paramCount++;

        // token-index: link every param + op token back to this node
        for (const tok of opSlug.split("-")) addToken(tokenIndex, tok, { system: canonicalSystem, op: opSlug, param: paramSlug, path: relPath });
        for (const tok of paramSlug.split("-")) addToken(tokenIndex, tok, { system: canonicalSystem, op: opSlug, param: paramSlug, path: relPath });
      }

      if (params.length > 0) {
        systems[canonicalSystem].ops[opSlug] = {
          params,
          path: relative(REPO_ROOT, opPath).replace(/\\/g, "/"),
        };
        opCount++;
      }
    }
  }

  return { systems, tokenIndex, opCount, paramCount };
}

function addToken(idx, tok, ref) {
  if (!tok || tok.length < 3) return;  // skip short tokens (the, and, of)
  if (!idx[tok]) idx[tok] = [];
  if (idx[tok].length >= 25) return;  // cap per-token to keep index file small
  idx[tok].push(ref);
}

function walkTribalCad() {
  const out = [];
  // tribal/cad-params/* and any tribal/*cad* + tribal/*cam*
  for (const f of safeReadDir(WIKI_TRIBAL_CAD)) {
    if (!f.endsWith(".md")) continue;
    out.push({
      name: f.replace(/\.md$/i, ""),
      path: relative(REPO_ROOT, join(WIKI_TRIBAL_CAD, f)).replace(/\\/g, "/"),
      domain: "cad",
    });
  }
  for (const f of safeReadDir(WIKI_TRIBAL)) {
    const lower = f.toLowerCase();
    if (!f.endsWith(".md")) continue;
    if (!/cad|cam|fusion|mastercam|solidworks|hypercad|inventor/.test(lower)) continue;
    out.push({
      name: f.replace(/\.md$/i, ""),
      path: relative(REPO_ROOT, join(WIKI_TRIBAL, f)).replace(/\\/g, "/"),
      domain: "cad-cam",
    });
  }
  return out;
}

function walkCourses() {
  const out = [];
  for (const f of safeReadDir(WIKI_COURSES)) {
    if (!f.endsWith(".md")) continue;
    const lower = f.toLowerCase();
    let systemHint = null;
    for (const [alias, canonical] of Object.entries(SYSTEM_ALIASES)) {
      if (lower.includes(alias)) { systemHint = canonical; break; }
    }
    out.push({
      name: f.replace(/\.md$/i, ""),
      path: relative(REPO_ROOT, join(WIKI_COURSES, f)).replace(/\\/g, "/"),
      system_hint: systemHint,
    });
  }
  return out;
}

function walkExtractedPDFs() {
  const out = [];
  for (const dir of [WIKI_EXTRACTS, WIKI_MONOLITH_MOD]) {
    if (!existsSync(dir)) continue;
    for (const f of safeReadDir(dir)) {
      if (!f.endsWith(".md")) continue;
      const lower = f.toLowerCase();
      if (!/cad|cam|fusion|mastercam|solidworks|hypercad|inventor|sketch|extrude|sweep|loft|drawing|gd&t|gdt/.test(lower)) continue;
      let systemHint = null;
      for (const [alias, canonical] of Object.entries(SYSTEM_ALIASES)) {
        if (lower.includes(alias)) { systemHint = canonical; break; }
      }
      out.push({
        name: f.replace(/\.md$/i, ""),
        path: relative(REPO_ROOT, join(dir, f)).replace(/\\/g, "/"),
        system_hint: systemHint,
        source: basename(dir),
      });
    }
  }
  return out;
}

function main() {
  console.log("[cad-knowledge-index] walking wiki tree...");
  const t0 = Date.now();
  const { systems, tokenIndex, opCount, paramCount } = walkCadParams();
  const tribal = walkTribalCad();
  const courses = walkCourses();
  const pdfExtracts = walkExtractedPDFs();
  const elapsedMs = Date.now() - t0;

  const out = {
    schemaVersion: 1,
    builtAt: new Date().toISOString(),
    repoRoot: REPO_ROOT.replace(/\\/g, "/"),
    prioritySystems: PRIORITY_SYSTEMS.filter(s => systems[s]),
    summary: {
      systems: Object.keys(systems).length,
      ops: opCount,
      params: paramCount,
      tribal: tribal.length,
      courses: courses.length,
      pdfExtracts: pdfExtracts.length,
      tokenIndexSize: Object.keys(tokenIndex).length,
      buildMs: elapsedMs,
    },
    systems,
    tokenIndex,
    tribal,
    courses,
    pdfExtracts,
  };

  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`[cad-knowledge-index] wrote ${OUT_PATH}`);
  console.log(`  systems=${out.summary.systems} ops=${opCount} params=${paramCount}`);
  console.log(`  tribal=${tribal.length} courses=${courses.length} pdfExtracts=${pdfExtracts.length}`);
  console.log(`  tokenIndex=${out.summary.tokenIndexSize} tokens, build=${elapsedMs}ms`);
}

main();
