#!/usr/bin/env tsx
/**
 * dump-all-tips.ts — emit all tribal tip arrays as combined JSON
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P1-U03 helper.
 *
 * Walks H:/prism/mcp-server/src/data/*-tips*.ts (and a couple of related
 * tip catalogs), dynamically imports each, finds the exported array of
 * tip objects, tags entries with their source filename, and writes a
 * single combined JSON envelope to stdout. Used by
 * scripts/populate-tribal-vault.mjs.
 *
 * Output shape:
 *   { sources: [{ file, count }], tips: [{ ...originalTip, _source: file }] }
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P1-U03
 */

import { readdirSync, statSync, writeFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { pathToFileURL } from "node:url";

const TIPS_DIR = resolve("H:/prism/mcp-server/src/data");

function parseArgs(argv: string[]): { out?: string } {
  const out: { out?: string } = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out" && argv[i + 1]) {
      out.out = argv[++i];
    } else if (a === "--help" || a === "-h") {
      process.stdout.write("Usage: tsx dump-all-tips.ts [--out <file>]\n");
      process.exit(0);
    } else {
      process.stderr.write(`Unknown arg: ${a}\n`);
      process.exit(2);
    }
  }
  return out;
}

interface TipRecord {
  id?: string | number;
  title?: string;
  body?: string;
  category?: string;
  tags?: string[];
  confidence?: number | string;
  source?: string;
  [k: string]: unknown;
}

function isTipsFile(name: string): boolean {
  return /-?(tips|tribal)\.ts$/i.test(name) || /-tips-/i.test(name) || /tribal-tips/i.test(name);
}

function looksLikeTip(o: unknown): o is TipRecord {
  if (!o || typeof o !== "object") return false;
  const r = o as Record<string, unknown>;
  // Tip-shaped: must have body or text + (id or title)
  const hasBody = typeof r.body === "string" || typeof r.text === "string";
  const hasId = "id" in r || typeof r.title === "string";
  return hasBody && hasId;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  let entries: string[];
  try {
    entries = readdirSync(TIPS_DIR);
  } catch (e) {
    process.stderr.write(`Cannot read ${TIPS_DIR}: ${(e as Error).message}\n`);
    process.exit(1);
  }
  const tipFiles = entries.filter(isTipsFile).map((n) => resolve(TIPS_DIR, n));

  const sources: Array<{ file: string; count: number; error?: string }> = [];
  const tips: TipRecord[] = [];

  for (const file of tipFiles) {
    try {
      const st = statSync(file);
      if (!st.isFile()) continue;
    } catch {
      continue;
    }
    let mod: Record<string, unknown>;
    try {
      mod = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
    } catch (e) {
      sources.push({ file: basename(file), count: 0, error: (e as Error).message.slice(0, 200) });
      continue;
    }
    let count = 0;
    for (const v of Object.values(mod)) {
      if (Array.isArray(v) && v.length > 0 && looksLikeTip(v[0])) {
        for (const item of v) {
          if (looksLikeTip(item)) {
            tips.push({ ...(item as TipRecord), _source: basename(file) });
            count++;
          }
        }
      }
    }
    sources.push({ file: basename(file), count });
  }

  const payload = JSON.stringify({ sources, tips });
  if (args.out) {
    writeFileSync(args.out, payload);
    process.stdout.write(JSON.stringify({ ok: true, out: args.out, sources: sources.length, tips: tips.length }));
  } else {
    process.stdout.write(payload);
  }
  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`uncaught: ${(e as Error).message}\n`);
  process.exit(1);
});
