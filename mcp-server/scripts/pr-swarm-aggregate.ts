/**
 * pr-swarm-aggregate.ts — Phase 0.17 U-PLG8 pr-review-toolkit aggregator
 *
 * Reads N findings files from the five pr-review-toolkit agents, merges
 * them into a single consolidated verdict, de-duplicates per (file,line,
 * severity) so two agents flagging the same spot don't double-count.
 *
 * Finding shape (loose — the toolkit agents produce a mix of JSON and
 * markdown; this script accepts both):
 *   {
 *     agent:    "pr-review-toolkit:code-reviewer",
 *     severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NIT",
 *     file:     "src/foo.ts",
 *     line:     42,
 *     title:    "unvalidated user input",
 *     detail:   "..." (optional)
 *   }
 *
 * Input modes:
 *   1. `--files a.json b.json ...` — explicit list
 *   2. stdin JSON array of findings
 *
 * Verdict rules:
 *   CRITICAL (any)     → BLOCK
 *   HIGH (any)         → REQUEST_CHANGES
 *   MEDIUM (≥3)        → REQUEST_CHANGES
 *   else               → APPROVE
 *
 * Usage:
 *   npx tsx mcp-server/scripts/pr-swarm-aggregate.ts --pr 123 \
 *     --files review-code.json review-silent.json review-tests.json \
 *             review-comments.json review-types.json
 *   (or pipe a single combined JSON array to stdin)
 */

import { readFileSync, existsSync } from "node:fs";

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NIT";
const SEV_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NIT"];

interface Finding {
  agent: string;
  severity: Severity;
  file?: string;
  line?: number;
  title: string;
  detail?: string;
}

function parseArgs(argv: string[]): { pr?: string; files: string[]; json: boolean } {
  const out: { pr?: string; files: string[]; json: boolean } = { files: [], json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--pr") { out.pr = argv[++i]; continue; }
    if (a === "--files") {
      while (argv[i + 1] && !argv[i + 1].startsWith("--")) out.files.push(argv[++i]);
      continue;
    }
    if (a === "--json") { out.json = true; continue; }
  }
  return out;
}

function readStdinSync(): string {
  try { return readFileSync(0, "utf8"); } catch { return ""; }
}

function normalizeSeverity(s: unknown): Severity {
  const v = String(s || "").toUpperCase();
  if (v === "CRIT" || v === "CRITICAL" || v === "BLOCKER") return "CRITICAL";
  if (v === "HIGH" || v === "ERROR") return "HIGH";
  if (v === "MED" || v === "MEDIUM" || v === "WARN" || v === "WARNING") return "MEDIUM";
  if (v === "LOW") return "LOW";
  return "NIT";
}

function normalizeFinding(raw: Record<string, unknown>, fallbackAgent = "unknown"): Finding {
  return {
    agent: String(raw.agent ?? fallbackAgent),
    severity: normalizeSeverity(raw.severity),
    file: raw.file ? String(raw.file) : undefined,
    line: typeof raw.line === "number" ? raw.line : undefined,
    title: String(raw.title ?? raw.message ?? "(untitled)"),
    detail: raw.detail ? String(raw.detail) : undefined,
  };
}

function loadFindings(args: ReturnType<typeof parseArgs>): Finding[] {
  const all: Finding[] = [];
  for (const p of args.files) {
    if (!existsSync(p)) {
      console.error(`skip missing: ${p}`);
      continue;
    }
    const raw = readFileSync(p, "utf8").trim();
    if (!raw) continue;
    try {
      const doc = JSON.parse(raw) as unknown;
      const list: Record<string, unknown>[] = Array.isArray(doc)
        ? (doc as Record<string, unknown>[])
        : ((doc as { findings?: Record<string, unknown>[] }).findings ?? []);
      const fallback = (doc as { agent?: string }).agent ?? undefined;
      for (const f of list) all.push(normalizeFinding(f, fallback));
    } catch (err) {
      console.error(`parse failed for ${p}: ${(err as Error).message}`);
    }
  }
  if (!args.files.length) {
    const raw = readStdinSync().trim();
    if (raw) {
      try {
        const doc = JSON.parse(raw) as unknown;
        const list: Record<string, unknown>[] = Array.isArray(doc)
          ? (doc as Record<string, unknown>[])
          : ((doc as { findings?: Record<string, unknown>[] }).findings ?? []);
        for (const f of list) all.push(normalizeFinding(f));
      } catch (err) {
        console.error(`stdin parse failed: ${(err as Error).message}`);
      }
    }
  }
  return all;
}

function dedupeKey(f: Finding): string {
  return `${f.severity}|${f.file ?? ""}|${f.line ?? ""}|${f.title.toLowerCase()}`;
}

function verdict(counts: Record<Severity, number>): "BLOCK" | "REQUEST_CHANGES" | "APPROVE" {
  if (counts.CRITICAL > 0) return "BLOCK";
  if (counts.HIGH > 0) return "REQUEST_CHANGES";
  if (counts.MEDIUM >= 3) return "REQUEST_CHANGES";
  return "APPROVE";
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const findings = loadFindings(args);

  const deduped = new Map<string, Finding[]>();
  for (const f of findings) {
    const key = dedupeKey(f);
    const bucket = deduped.get(key);
    if (bucket) bucket.push(f);
    else deduped.set(key, [f]);
  }

  const counts: Record<Severity, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, NIT: 0 };
  for (const bucket of deduped.values()) counts[bucket[0].severity]++;

  const byAgent: Record<string, Record<Severity, number>> = {};
  for (const f of findings) {
    if (!byAgent[f.agent]) byAgent[f.agent] = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, NIT: 0 };
    byAgent[f.agent][f.severity]++;
  }

  const v = verdict(counts);

  if (args.json) {
    process.stdout.write(JSON.stringify({
      schemaVersion: 1,
      pr: args.pr ?? null,
      verdict: v,
      counts,
      byAgent,
      findings: [...deduped.entries()].map(([key, bucket]) => ({
        key,
        severity: bucket[0].severity,
        file: bucket[0].file ?? null,
        line: bucket[0].line ?? null,
        title: bucket[0].title,
        detail: bucket[0].detail ?? null,
        foundBy: bucket.map((b) => b.agent),
      })),
    }, null, 2) + "\n");
    return;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log("======================================================");
  console.log(`PR-SWARM VERDICT — PR ${args.pr ?? "?"}`);
  console.log("======================================================");
  console.log(`Overall: ${v}`);
  console.log(
    `Findings: ${total} deduped (${findings.length} raw)  ` +
    SEV_ORDER.map((s) => `${s}=${counts[s]}`).join("  "),
  );
  console.log("");
  console.log("Per-agent raw:");
  const agents = Object.keys(byAgent).sort();
  for (const a of agents) {
    const c = byAgent[a];
    const cnt = Object.values(c).reduce((x, y) => x + y, 0);
    console.log(`  ${cnt.toString().padStart(3)} ${a}   (` +
      SEV_ORDER.map((s) => `${s[0]}${c[s]}`).join(" ") + ")");
  }
  console.log("");
  console.log("Top findings (by severity, up to 20):");
  const sorted = [...deduped.values()]
    .sort((a, b) => SEV_ORDER.indexOf(a[0].severity) - SEV_ORDER.indexOf(b[0].severity))
    .slice(0, 20);
  for (const bucket of sorted) {
    const f = bucket[0];
    const where = f.file ? `${f.file}${f.line ? `:${f.line}` : ""}` : "(no location)";
    const agents = [...new Set(bucket.map((b) => b.agent.replace(/^pr-review-toolkit:/, "")))].join(",");
    console.log(`  [${f.severity}] ${where} — ${f.title}  {${agents}}`);
  }
}

main();
