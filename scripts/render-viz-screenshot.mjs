#!/usr/bin/env node
/**
 * render-viz-screenshot.mjs -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC04 (slot:sierra)
 *
 * Headless render of an ego-graph (GAC01 EgoGraph JSON) to a real PNG using a
 * SYSTEM Chrome/Edge binary's built-in `--headless --screenshot` -- NO npm
 * dependency (puppeteer/playwright/canvas are all absent from the tree, and
 * "ask before adding an unseen library" applies; the system browser is not a
 * package). When no Chrome/Edge is found the script exits with a structured
 * `{ok:false, reason:"chromium-unavailable"}` so the caller (DualChannelContextEngine)
 * degrades to the spec's MD-text fallback.
 *
 * Spawning uses execFileSync (execFile family -- argv array, NO shell), so the
 * Chrome path + flags are never shell-interpolated (no command injection).
 *
 * Input  : an EgoGraph JSON file (`--ego=<path>`), produced by GraphContextLensEngine.
 * Output : a PNG (`--out=<path>`) + a one-line JSON status on stdout:
 *            {ok, path?, bytes?, mode, chromeBin?, layer?, nodeCount, reason?, warnings:[]}
 *
 * Failure modes handled (per the U-GAC04 spec):
 *   - chromium unavailable        -> ok:false reason:"chromium-unavailable"
 *   - PNG > maxBytes              -> re-render once at half window; still too big -> ok:false reason:"oversize"
 *   - layer filter with no matches-> ok:true mode:"empty" (renders an explicit empty-layer card)
 *
 * Security: EVERY node id/label/layer is HTML-escaped before it enters the
 * rendered page (the graph is our own data, but a node label could carry markup
 * from an upstream importer -- this is the "PNG with embedded malicious payload"
 * adversarial case, closed at the render boundary, not after the fact).
 *
 * CLI:
 *   node scripts/render-viz-screenshot.mjs --ego=ego.json --out=out.png [--layer=L4] [--window=1200x800] [--max-bytes=10485760]
 */
import { readFileSync, existsSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const PNG_MAGIC = "89504e470d0a1a0a";
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024; // 10MB (spec downscale threshold)
const DEFAULT_WINDOW = { w: 1200, h: 800 };
const CHROME_TIMEOUT_MS = 30000;
const WHICH_TIMEOUT_MS = 4000;
const MIN_WINDOW = { w: 320, h: 240 };

// ---- arg parse (no deps) -----------------------------------------------------
function parseArgs(argv) {
  const a = {};
  for (const tok of argv) {
    const m = /^--([^=]+)=(.*)$/.exec(tok);
    if (m) a[m[1]] = m[2];
    else if (tok.startsWith("--")) a[tok.slice(2)] = true;
  }
  return a;
}

// ---- HTML escape (XSS-at-render guard) --------------------------------------
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---- Chrome/Edge discovery ---------------------------------------------------
// Order: explicit env override -> PATH -> known Windows install dirs.
function findChrome() {
  const env = process.env.PRISM_CHROME_BIN;
  if (env && existsSync(env)) return env;

  const candidatesPath = ["chrome", "chromium", "chromium-browser", "google-chrome", "msedge"];
  const locator = process.platform === "win32" ? "where" : "which";
  for (const c of candidatesPath) {
    try {
      const out = execFileSync(locator, [c], { encoding: "utf8", timeout: WHICH_TIMEOUT_MS })
        .trim()
        .split(/\r?\n/)[0];
      if (out && existsSync(out)) return out;
    } catch {
      /* not on PATH; keep looking */
    }
  }

  const pf = process.env["ProgramFiles"] || "C:/Program Files";
  const pf86 = process.env["ProgramFiles(x86)"] || "C:/Program Files (x86)";
  const known = [
    `${pf}/Google/Chrome/Application/chrome.exe`,
    `${pf86}/Google/Chrome/Application/chrome.exe`,
    `${pf}/Microsoft/Edge/Application/msedge.exe`,
    `${pf86}/Microsoft/Edge/Application/msedge.exe`,
  ];
  for (const k of known) if (existsSync(k)) return k;
  return null;
}

// ---- deterministic SVG layout of the ego graph ------------------------------
// Grid layout, color by layer, center node ringed. Bounded glyphs keep the PNG
// small (the spec's 10MB ceiling). No physics, no animation -- a static snapshot.
const LAYER_COLORS = {
  L0: "#6ee7ff", L1: "#7dd3fc", L2: "#67e8f9", L3: "#5eead4", L4: "#86efac",
  L5: "#fde047", L6: "#fbbf24", L7: "#fb923c", L8: "#f87171", L9: "#f472b6",
  L10: "#c084fc", L11: "#a78bfa",
};
function colorFor(layer) {
  return LAYER_COLORS[layer] || "#94a3b8";
}

function filterNodes(ego, layerFilter) {
  const nodes = Array.isArray(ego?.nodes) ? ego.nodes : [];
  if (!layerFilter) return nodes;
  return nodes.filter((n) => n.id === ego.center || n.layer === layerFilter);
}

// "empty" = nothing matched the layer beyond (at most) the center node itself,
// and the center is not in the layer either.
function isEmptyForLayer(ego, layerFilter) {
  const filtered = filterNodes(ego, layerFilter);
  if (filtered.length === 0) return true;
  if (!layerFilter) return false;
  return filtered.every((n) => n.id === ego.center && n.layer !== layerFilter);
}

function buildHtml(ego, layerFilter) {
  const center = ego.center;
  const nodes = filterNodes(ego, layerFilter);
  const title = `${esc(center)} (${nodes.length} nodes${layerFilter ? `, layer ${esc(layerFilter)}` : ""})`;
  const empty = isEmptyForLayer(ego, layerFilter);

  // grid placement
  const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length || 1)));
  const cellW = 240, cellH = 64, padX = 40, padY = 90;
  const idIndex = new Map();
  nodes.forEach((n, i) => idIndex.set(n.id, i));
  const pos = (i) => ({
    x: padX + (i % cols) * cellW + cellW / 2,
    y: padY + Math.floor(i / cols) * cellH + cellH / 2,
  });
  const rows = Math.ceil((nodes.length || 1) / cols);
  const W = padX * 2 + cols * cellW;
  const H = padY + rows * cellH + 40;

  const edgeSvg = (Array.isArray(ego.edges) ? ego.edges : [])
    .filter((e) => idIndex.has(e.from) && idIndex.has(e.to))
    .map((e) => {
      const a = pos(idIndex.get(e.from)), b = pos(idIndex.get(e.to));
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#33415588" stroke-width="1.5"/>`;
    })
    .join("");

  const nodeSvg = nodes
    .map((n, i) => {
      const p = pos(i);
      const isCenter = n.id === center;
      const fill = colorFor(n.layer);
      const lbl = esc((n.label || n.id).slice(0, 30));
      const sub = esc([n.layer, n.kind, n.status].filter(Boolean).join("/").slice(0, 24));
      const ring = isCenter ? `<rect x="${p.x - 108}" y="${p.y - 26}" width="216" height="52" rx="8" fill="none" stroke="#fff" stroke-width="2.5"/>` : "";
      return `<g>${ring}<rect x="${p.x - 105}" y="${p.y - 23}" width="210" height="46" rx="7" fill="${fill}22" stroke="${fill}" stroke-width="1.5"/>` +
        `<text x="${p.x}" y="${p.y - 3}" fill="#e2e8f0" font-family="monospace" font-size="12" text-anchor="middle">${lbl}</text>` +
        `<text x="${p.x}" y="${p.y + 14}" fill="#94a3b8" font-family="monospace" font-size="10" text-anchor="middle">${sub}</text></g>`;
    })
    .join("");

  const body = empty
    ? `<text x="40" y="160" fill="#f87171" font-family="monospace" font-size="20">no nodes in layer ${esc(layerFilter || "")} for ${esc(center)}</text>`
    : edgeSvg + nodeSvg;

  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#0b0f1a}</style></head>` +
    `<body><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${W}" height="${H}" fill="#0b0f1a"/>` +
    `<text x="40" y="48" fill="#e2e8f0" font-family="monospace" font-size="22">PRISM ego-graph</text>` +
    `<text x="40" y="72" fill="#7dd3fc" font-family="monospace" font-size="13">${title}</text>` +
    `${body}</svg></body></html>`;
}

// ---- chrome headless screenshot ---------------------------------------------
function fileUrl(p) {
  // win path -> file:/// url with forward slashes
  const norm = p.replace(/\\/g, "/");
  return "file:///" + (norm.startsWith("/") ? norm.slice(1) : norm);
}

function shoot(chromeBin, htmlPath, outPath, win, profileDir) {
  // flag ladder: Chrome 112+ prefers --headless=new; old --headless still
  // screenshots (proven on this host). Try new first, fall back to old.
  const flags = ["--headless=new", "--headless"];
  for (const headless of flags) {
    try { if (existsSync(outPath)) rmSync(outPath, { force: true }); } catch { /* ignore */ }
    try {
      execFileSync(
        chromeBin,
        [
          headless,
          "--disable-gpu",
          "--no-sandbox",
          "--hide-scrollbars",
          "--force-device-scale-factor=1",
          `--user-data-dir=${profileDir}`,
          `--window-size=${win.w},${win.h}`,
          `--screenshot=${outPath}`,
          fileUrl(htmlPath),
        ],
        { encoding: "utf8", timeout: CHROME_TIMEOUT_MS, stdio: ["ignore", "ignore", "ignore"] },
      );
    } catch {
      /* chrome can exit non-zero yet still write the PNG; verify by file */
    }
    if (existsSync(outPath)) {
      const buf = readFileSync(outPath);
      if (buf.slice(0, 8).toString("hex") === PNG_MAGIC) return { ok: true, bytes: buf.length, headless };
    }
  }
  return { ok: false };
}

// ---- main render -------------------------------------------------------------
export function renderEgoToPng({ ego, out, layer, window, maxBytes, chromeBin }) {
  const warnings = [];
  const win = { ...DEFAULT_WINDOW, ...(window || {}) };
  const cap = Number.isFinite(maxBytes) && maxBytes > 0 ? maxBytes : DEFAULT_MAX_BYTES;
  const bin = chromeBin || findChrome();
  const nodeCount = Array.isArray(ego?.nodes) ? ego.nodes.length : 0;

  if (!bin) {
    return { ok: false, mode: "none", reason: "chromium-unavailable", nodeCount, warnings };
  }

  const work = mkdtempSync(join(tmpdir(), "vizshot-"));
  const htmlPath = join(work, "page.html");
  const profileDir = join(work, "profile");
  try {
    writeFileSync(htmlPath, buildHtml(ego, layer), "utf8");
    let res = shoot(bin, htmlPath, out, win, profileDir);
    if (!res.ok) {
      return { ok: false, mode: "none", reason: "render-failed", chromeBin: bin, nodeCount, warnings };
    }
    // downscale-then-fail ladder for the 10MB ceiling
    if (res.bytes > cap) {
      warnings.push(`png ${res.bytes}B over cap ${cap}B; re-rendering at half window`);
      const half = {
        w: Math.max(MIN_WINDOW.w, Math.floor(win.w / 2)),
        h: Math.max(MIN_WINDOW.h, Math.floor(win.h / 2)),
      };
      res = shoot(bin, htmlPath, out, half, profileDir);
      if (!res.ok || res.bytes > cap) {
        return { ok: false, mode: "none", reason: "oversize", bytes: res.bytes, chromeBin: bin, nodeCount, warnings };
      }
    }
    const mode = isEmptyForLayer(ego, layer) ? "empty" : "png";
    return { ok: true, mode, path: out, bytes: res.bytes, layer: layer || null, chromeBin: bin, nodeCount, warnings };
  } finally {
    try { rmSync(work, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

// ---- CLI ---------------------------------------------------------------------
function main() {
  const a = parseArgs(process.argv.slice(2));
  if (!a.ego || !a.out) {
    process.stdout.write(JSON.stringify({ ok: false, reason: "usage: --ego=<egoJson> --out=<png> [--layer=L4] [--window=WxH] [--max-bytes=N]" }) + "\n");
    process.exit(2);
  }
  let ego;
  try {
    ego = JSON.parse(readFileSync(a.ego, "utf8"));
  } catch (e) {
    process.stdout.write(JSON.stringify({ ok: false, reason: `bad-ego-json: ${e.message}` }) + "\n");
    process.exit(2);
  }
  let window;
  if (typeof a.window === "string") {
    const m = /^(\d+)x(\d+)$/.exec(a.window);
    if (m) window = { w: Number(m[1]), h: Number(m[2]) };
  }
  const res = renderEgoToPng({
    ego,
    out: a.out,
    layer: typeof a.layer === "string" ? a.layer : undefined,
    window,
    maxBytes: a["max-bytes"] ? Number(a["max-bytes"]) : undefined,
    chromeBin: typeof a.chrome === "string" ? a.chrome : undefined,
  });
  process.stdout.write(JSON.stringify(res) + "\n");
  process.exit(res.ok ? 0 : 1);
}

// exported for hermetic unit tests (XSS-escape + empty-layer card) without Chrome
export { esc, buildHtml, findChrome, filterNodes, isEmptyForLayer };

// run as CLI only when invoked directly (not when imported by the engine/tests)
const invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("render-viz-screenshot.mjs");
if (invokedDirectly) main();
