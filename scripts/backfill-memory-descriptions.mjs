#!/usr/bin/env node
// scripts/backfill-memory-descriptions.mjs -- frontmatter `description:` for every memory file
// (U-SIERRA-MEMORY-DESC-BACKFILL, slot:sierra, 2026-07-01).
//
// Operator: "did you add summaries for what each and every file is?" -- the WIKI half is the
// blurb backfill (backfill-wiki-blurbs.mjs); this is the MEMORY half. Measured gap: C: live brain
// 6 missing / H: mirror+legacy 331 missing (+19 no-frontmatter, report-only). Unlike the wiki
// (sidecar cache), the canonical memory summary surface IS the frontmatter `description:` --
// MEMORY.md index, salientSlice (memo-embed), and recall all read it -- so the fix lands IN the
// file. Editing a memory also bumps its mtime -> memo-embed re-embeds it with the richer salient
// text (each-pass-feeds-next).
//
// Mirror discipline: C: (auto-memory) is source-of-truth; the Stop-hook feed copies C: -> H:.
// A description added only on the H: twin would be CLOBBERED by the next feed. So: fix C: files
// in place, and SKIP any H: file whose basename exists in the C: root (the feed propagates it).
// H:-only legacy files are edited directly.
//
// No-frontmatter files (MEMORY.md, archives, indexes) are REPORTED, never rewritten -- wholesale
// frontmatter prepend on an index file would be wrong.
//
// Safety: BOM-preserving, single-line insertion after `name:` (or after opening ---), YAML
// double-quoted + escaped, atomic tmp+rename, dry-run DEFAULT (--apply to write), fail-soft per
// file, abort-loud if the first ABORT_PROBE generations all fail. Same shared-GPU discipline as
// the wiki driver: small model + retry/backoff + saturation cool-down.
//
// Usage:
//   node scripts/backfill-memory-descriptions.mjs                 # dry-run: enumerate candidates
//   node scripts/backfill-memory-descriptions.mjs --apply         # generate + write
//   node scripts/backfill-memory-descriptions.mjs --apply --limit 5   # smoke
// Knobs: PRISM_BLURB_MODEL, PRISM_BLURB_TIMEOUT_MS, PRISM_MEMORY_ROOT_C, PRISM_MEMORY_ROOT_H.

import fs from "node:fs";
import path from "node:path";
import { generateBlurb } from "./lib/contextual-blurb.mjs";

const ROOT_C = process.env.PRISM_MEMORY_ROOT_C || "C:/Users/wompu/.claude/projects/H--prism/memory";
const ROOT_H = process.env.PRISM_MEMORY_ROOT_H || "H:/prism/knowledge/memories";
const MODEL = process.env.PRISM_BLURB_MODEL || "qwen2.5-coder:7b";
const CALL_TIMEOUT_MS = Number(process.env.PRISM_BLURB_TIMEOUT_MS) || 120_000;
const RETRY_DELAYS_MS = [5_000, 20_000];
const COOLDOWN_AFTER_CONSEC = 5;
const COOLDOWN_MS = 60_000;
const ABORT_PROBE = 15;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function walk(dir) {
  let out = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) { if (e.name !== ".obsidian") out = out.concat(walk(p)); }
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

/** Classify a memory file: "has" | "missing" | "no-frontmatter" | "read-failed". BOM-aware. */
export function classify(raw) {
  if (typeof raw !== "string") return "read-failed";
  const body = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  if (!/^\s*---/.test(body)) return "no-frontmatter";
  const end = body.indexOf("\n---", 3);
  const fm = end === -1 ? body : body.slice(0, end);
  return /^\s*description\s*:/m.test(fm) ? "has" : "missing";
}

/**
 * Insert `description: "<desc>"` into the frontmatter -- after the `name:` line if present,
 * else immediately after the opening `---`. Preserves a leading BOM and every other byte.
 */
export function insertDescription(raw, desc) {
  const bom = raw.charCodeAt(0) === 0xFEFF ? "﻿" : "";
  const body = bom ? raw.slice(1) : raw;
  const safe = String(desc).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\s+/g, " ").trim();
  const line = `description: "${safe}"`;
  const nameMatch = body.match(/^(\s*---[^\n]*\n(?:[^\n]*\n)*?name\s*:[^\n]*\n)/);
  if (nameMatch) return bom + body.slice(0, nameMatch[1].length) + line + "\n" + body.slice(nameMatch[1].length);
  const fmMatch = body.match(/^(\s*---[^\n]*\n)/);
  if (!fmMatch) return null; // caller guarantees frontmatter; fail-soft anyway
  return bom + body.slice(0, fmMatch[1].length) + line + "\n" + body.slice(fmMatch[1].length);
}

async function blurbWithRetry(content) {
  let b = await generateBlurb(content, { model: MODEL, timeoutMs: CALL_TIMEOUT_MS });
  for (const delay of RETRY_DELAYS_MS) {
    if (b) return b;
    await sleep(delay);
    b = await generateBlurb(content, { model: MODEL, timeoutMs: CALL_TIMEOUT_MS });
  }
  return b;
}

function atomicWrite(fp, text) {
  const tmp = `${fp}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, fp);
}

export async function main() {
  const args = process.argv.slice(2);
  const APPLY = args.includes("--apply");
  const limIdx = args.indexOf("--limit");
  const LIMIT = limIdx !== -1 ? Number(args[limIdx + 1]) || 0 : 0;
  const wantJson = args.includes("--json");

  const cFiles = walk(ROOT_C);
  const cNames = new Set(cFiles.map((p) => path.basename(p)));
  const hFiles = walk(ROOT_H);
  const hOnly = hFiles.filter((p) => !cNames.has(path.basename(p)));
  const targets = [
    ...cFiles.map((p) => ({ fp: p, root: "C" })),
    ...hOnly.map((p) => ({ fp: p, root: "H" })),
  ];

  const stats = { scanned: targets.length, has: 0, missing: 0, noFrontmatter: 0, readFailed: 0, skippedHTwin: hFiles.length - hOnly.length, written: 0, genFailed: 0 };
  const noFmList = [];
  let attempted = 0;
  let consecFailed = 0;

  for (const t of targets) {
    if (LIMIT > 0 && stats.written + stats.genFailed >= LIMIT) break;
    let raw;
    try { raw = fs.readFileSync(t.fp, "utf8"); }
    catch { stats.readFailed++; console.error(`[mem-desc]   read-FAILED: ${t.fp}`); continue; }
    const cls = classify(raw);
    if (cls === "has") { stats.has++; continue; }
    if (cls === "no-frontmatter") { stats.noFrontmatter++; noFmList.push(t.fp); continue; }
    stats.missing++;
    if (!APPLY) continue;

    const body = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
    const desc = await blurbWithRetry(body.slice(0, 8000));
    attempted++;
    if (!desc) {
      stats.genFailed++;
      consecFailed++;
      if (attempted >= ABORT_PROBE && stats.written === 0) {
        console.error(`[mem-desc] ABORT: first ${attempted} generations ALL failed (with retries) -- Ollama/model down? Re-run resumes (already-described files skip).`);
        process.exit(1);
      }
      if (consecFailed >= COOLDOWN_AFTER_CONSEC) {
        console.error(`[mem-desc]   ${consecFailed} consecutive failures -- queue saturated? cooling down ${COOLDOWN_MS / 1000}s`);
        await sleep(COOLDOWN_MS);
        consecFailed = 0;
      }
      continue;
    }
    consecFailed = 0;
    const next = insertDescription(raw, desc);
    if (!next) { stats.genFailed++; console.error(`[mem-desc]   insert-FAILED (no frontmatter?): ${t.fp}`); continue; }
    atomicWrite(t.fp, next);
    stats.written++;
    console.error(`[mem-desc]   + ${path.basename(t.fp)} [${t.root}]: ${desc.slice(0, 80)}`);
  }

  const summary = { ...stats, apply: APPLY, model: MODEL, noFrontmatterFiles: noFmList };
  if (wantJson) console.log(JSON.stringify(summary, null, 2));
  else {
    console.error(`[mem-desc] ${APPLY ? "DONE" : "DRY-RUN"} -- scanned ${stats.scanned} (C-first, ${stats.skippedHTwin} H-twins deferred to feed): has ${stats.has}, missing ${stats.missing}, written ${stats.written}, gen-failed ${stats.genFailed}, no-frontmatter ${stats.noFrontmatter} (report-only), read-failed ${stats.readFailed}`);
    if (noFmList.length) console.error(`[mem-desc] no-frontmatter (manual review): ${noFmList.map((p) => path.basename(p)).join(", ")}`);
    if (!APPLY) console.error(`[mem-desc] (dry -- pass --apply to generate + write)`);
  }
}

const isCli = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("backfill-memory-descriptions.mjs");
if (isCli) await main();
