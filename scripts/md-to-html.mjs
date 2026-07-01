#!/usr/bin/env node
// md-to-html.mjs — render any markdown file as a standalone HTML page using
// the PRISM html-report-render.mjs library (U-MD2HTML 2026-05-16).
//
// Why: prior to this script, the renderer library could only emit pages from
// structured section descriptors. This wraps `mdToHtml()` so MEMORY.md /
// CLAUDE.md / handoffs / wiki leaves render directly to HTML for operator
// viewing without re-architecting the source.
//
// Usage:
//   node H:/prism/scripts/md-to-html.mjs <input.md> [--out <out.html>] [--toc] [--title "..."]
//
// Examples:
//   node H:/prism/scripts/md-to-html.mjs H:/prism/CLAUDE.md
//      → writes CLAUDE.html next to CLAUDE.md
//   node H:/prism/scripts/md-to-html.mjs H:/prism/MEMORY.md --out /tmp/memory.html --toc
//      → writes /tmp/memory.html with a Contents nav

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { mdToHtml } from "./lib/html-report-render.mjs";

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") args.out = argv[++i];
    else if (a === "--toc") args.toc = true;
    else if (a === "--title") args.title = argv[++i];
    else if (a === "--subtitle") args.subtitle = argv[++i];
    else if (a === "--help" || a === "-h") args.help = true;
    else args._.push(a);
  }
  return args;
}

function usage() {
  console.log(`md-to-html — render any markdown file as a standalone HTML page

Usage:
  node H:/prism/scripts/md-to-html.mjs <input.md> [--out <out.html>] [--toc] [--title "..."]

Options:
  --out <path>     output path (default: <input>.html next to source)
  --toc            include a Contents table of contents
  --title "..."    override the auto-derived title (default: first H1)
  --subtitle "..." subtitle shown under the title
  -h, --help       this message
`);
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args._.length === 0) {
  usage();
  process.exit(args.help ? 0 : 1);
}

const input = args._[0];
if (!fs.existsSync(input)) {
  console.error(`md-to-html: input not found: ${input}`);
  process.exit(2);
}

// 2026-05-18 (slot kilo, U-MD2HTML-IDEMPOTENT, Reviewer B P1-A fix): pass deterministic
// generatedAt (source-file mtime) + empty note so re-rendering unchanged input produces
// byte-identical output. Without this, every render embedded `new Date().toISOString()`
// twice (header + footer), dirtying the .html on every regen across the 13-chat fleet
// and the c-to-h-mirror replication path — defeating the drift-check value proposition.
const inputMtime = fs.statSync(input).mtime.toISOString();
const html = mdToHtml(input, {
  includeToc: !!args.toc,
  title: args.title,
  subtitle: args.subtitle,
  generatedAt: inputMtime,
  note: "", // explicit empty — suppresses the footer's wall-clock timestamp
});

if (!html) {
  console.error(`md-to-html: render returned empty (likely read error)`);
  process.exit(3);
}

// 2026-05-18 (slot kilo, U-MD2HTML-SRCHASH): inject <meta prism-source-hash>
// so html-companion-guard.mjs can drift-check this output (the guard's
// extractSourceHash() pulls the hex out of any attr-order; format flexibility
// is fine). Hash is computed over the SAME raw bytes the guard reads via
// readFileSync(mdAbs) — must match for drift detection to fire correctly.
// First-occurrence-only via the non-global regex: a hand-authored CLAUDE.md
// referencing the literal string "<head>" inside a code-fence does NOT inject
// a second meta because String.prototype.replace with a non-/g regex stops
// after the first hit.
const sourceHash = createHash("sha256").update(fs.readFileSync(input)).digest("hex");
const sourceHashMeta = `<meta name="prism-source-hash" content="${sourceHash}">`;
const htmlWithHash = /<head\b[^>]*>/i.test(html)
  ? html.replace(/<head\b[^>]*>/i, (m) => `${m}\n  ${sourceHashMeta}`)
  : html; // graceful no-op when the renderer ever ships a non-HTML5 doc

const out = args.out || input.replace(/\.md$/i, ".html");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, htmlWithHash, "utf8");
console.log(`md-to-html: wrote ${out} (${htmlWithHash.length} bytes, hash ${sourceHash.slice(0, 12)}…)`);
