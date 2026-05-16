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

const html = mdToHtml(input, {
  includeToc: !!args.toc,
  title: args.title,
  subtitle: args.subtitle,
});

if (!html) {
  console.error(`md-to-html: render returned empty (likely read error)`);
  process.exit(3);
}

const out = args.out || input.replace(/\.md$/i, ".html");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html, "utf8");
console.log(`md-to-html: wrote ${out} (${html.length} bytes)`);
