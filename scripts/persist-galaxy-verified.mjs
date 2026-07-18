#!/usr/bin/env node
/**
 * persist-galaxy-verified.mjs -- deterministic JSON->markdown persister for the
 * FLEET-KNOWLEDGE-MAX verified tier (slot:zulu, 2026-06-15).
 *
 * WHY (R5): the verified-wave Workflow returns a structured array of
 * {galaxy, sources:[{url,title,kind,verifiedExcerpt,knowledge,fetched}], synthesis,
 * physicsSafe, physicsNote}. Turning that into the `<g>-foundations-verified-<date>.md`
 * wiki files + ledger --record entries is a PURE DETERMINISTIC TRANSFORM. Doing it by
 * hand (or via an LLM subagent) reads the ~30KB+ output JSON into a context window and
 * THRASHES it (observed 2026-06-15). A node script reads the file in-process -- zero
 * LLM context cost, no thrash, no fabrication (it only emits what the verified data
 * contains, with honest `fetched:false` markers).
 *
 * Idempotent-overwrite: the output JSON is the source of truth, so each run regenerates
 * the canonical file (replacing any partial/earlier copy). The ledger --record is
 * delegated to the proven galaxy-knowledge-iterate.mjs --record path (cross-process lock).
 *
 * USAGE:
 *   node scripts/persist-galaxy-verified.mjs --input <output.json> --run <runid> [--date 2026-06-14] [--only g1,g2] [--no-record]
 *
 * ASCII-only.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = process.env.PRISM_ROOT || "H:/prism";

export function parseArgs(argv) {
  const a = { date: "2026-06-14", record: true };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--input") a.input = argv[++i];
    else if (t === "--run") a.run = argv[++i];
    else if (t === "--date") a.date = argv[++i];
    else if (t === "--only") a.only = String(argv[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (t === "--no-record") a.record = false;
  }
  return a;
}

/** Robustly extract the galaxy result array from a workflow output file's content. */
export function extractGalaxies(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = null; }
  if (parsed) {
    if (Array.isArray(parsed)) return parsed;
    if (parsed.result != null) {
      if (Array.isArray(parsed.result)) return parsed.result;
      if (typeof parsed.result === "string") { try { const r = JSON.parse(parsed.result); if (Array.isArray(r)) return r; } catch { /* fallthrough */ } }
    }
    if (Array.isArray(parsed.galaxies)) return parsed.galaxies;
  }
  // Fallback: grab the outermost [...] that contains '"galaxy"'.
  const start = text.indexOf('[{"galaxy"');
  if (start >= 0) {
    // find matching close by bracket depth
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < text.length; i++) {
      const c = text[i];
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === '"') inStr = !inStr;
      else if (!inStr && c === "[") depth++;
      else if (!inStr && c === "]") { depth--; if (depth === 0) { try { return JSON.parse(text.slice(start, i + 1)); } catch { return null; } } }
    }
  }
  return null;
}

/** Deterministic foundations-verified markdown from one galaxy result object. Pure. */
export function renderMarkdown(g, { run, date }) {
  const galaxy = g.galaxy;
  const physicsSafe = g.physicsSafe === true;
  const srcs = Array.isArray(g.sources) ? g.sources : [];
  const fetchedCount = srcs.filter((s) => s.fetched !== false).length;
  const fm = [
    "---",
    `name: ${galaxy}-foundations-verified-${date}`,
    `description: VERIFIED (WebFetch-confirmed) foundations layer for the ${galaxy} galaxy. ${fetchedCount} fetched sources. Quality tier of FLEET-KNOWLEDGE-MAX (slot:zulu, ${date}).`,
    "metadata:",
    "  node_type: wiki",
    "  type: architecture",
    `  galaxy: ${galaxy}`,
    "  tier: VERIFIED",
    "  verifiedBy: WebFetch",
    ...(physicsSafe ? ["  physicsSafe: true"] : []),
    "---",
    "",
    `# ${galaxy} galaxy -- verified foundations layer (${date})`,
    "",
    `> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Every source below was WebFetched + excerpted (honest \`fetched:false\` markers for paywalled/unreachable sources).${physicsSafe ? " Physics-safe: no numeric cutting constant." : ""}`,
    "",
    "## Synthesis",
    String(g.synthesis || "").replace(/\r/g, "").trim() || "(no synthesis returned)",
    "",
    "## Verified sources",
  ];
  const body = [];
  for (const s of srcs) {
    const title = String(s.title || "(untitled)").trim();
    const url = s.url ? String(s.url).trim() : "";
    const kind = s.kind ? String(s.kind).trim() : "source";
    const fetched = s.fetched !== false;
    const head = url ? `### [${title}](${url}) -- ${kind}${fetched ? "" : " - NOT fetched"}` : `### ${title} -- ${kind}${fetched ? "" : " - NOT fetched"}`;
    body.push(head);
    if (fetched && s.verifiedExcerpt) body.push(`> "${String(s.verifiedExcerpt).replace(/\r?\n/g, " ").trim()}"`);
    else body.push(`> _(no excerpt -- not fetched; cited as a known reference, no fabricated quote)_`);
    body.push("");
    body.push(`**Knowledge:** ${String(s.knowledge || "").replace(/\r?\n/g, " ").trim()}`);
    body.push("");
  }
  const footer = [
    "---",
    `_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run ${run}). Ledger: state/shared/galaxy-knowledge-iterations.json._`,
    "",
  ];
  return fm.join("\n") + "\n" + body.join("\n") + "\n" + footer.join("\n");
}

/** Fetched source URLs (or titles when no url) for the --record sources list. Pure. */
export function recordUrls(g) {
  const srcs = Array.isArray(g.sources) ? g.sources : [];
  return srcs.filter((s) => s.fetched !== false).map((s) => (s.url ? String(s.url).trim() : String(s.title || "").trim())).filter(Boolean);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args.run) { console.error("usage: --input <file> --run <runid> [--date] [--only g1,g2] [--no-record]"); process.exit(2); }
  const text = fs.readFileSync(args.input, "utf8");
  const gals = extractGalaxies(text);
  if (!Array.isArray(gals) || !gals.length) { console.error(`[persist] no galaxy array found in ${args.input}`); process.exit(3); }
  const iterate = path.join(ROOT, "scripts/galaxy-knowledge-iterate.mjs");
  const out = [];
  for (const g of gals) {
    if (!g || !g.galaxy) continue;
    if (args.only && !args.only.includes(g.galaxy)) continue;
    const dir = path.join(ROOT, "knowledge/wiki", g.galaxy);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${g.galaxy}-foundations-verified-${args.date}.md`);
    fs.writeFileSync(file, renderMarkdown(g, { run: args.run, date: args.date }), "utf8");
    const urls = recordUrls(g);
    let recLine = "(record skipped)";
    if (args.record && urls.length) {
      try {
        const r = execFileSync(process.execPath, [iterate, "--record", g.galaxy, "--sources", urls.join(","), "--confirmed", "--note", `WebFetch-verified Workflow tier (run ${args.run})`], { cwd: ROOT, encoding: "utf8", timeout: 120000 });
        recLine = (r.trim().split(/\r?\n/).pop() || "").trim();
      } catch (e) { recLine = `RECORD-ERR: ${String(e.message).slice(0, 120)}`; }
    }
    out.push(`${g.galaxy}: ${urls.length} src, physicsSafe=${g.physicsSafe === true} -> ${path.relative(ROOT, file)} | ${recLine}`);
  }
  console.log(out.join("\n"));
  console.log(`[persist] ${out.length} galaxies persisted from ${path.basename(args.input)}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
