#!/usr/bin/env node
/**
 * zulu-brain-web.mjs — ZULU-OBSIDIAN-LIVE-MS0
 * ===========================================
 *
 * Self-hosted LAN web endpoint that serves the PRISM brain (file-vault search)
 * to your phone's browser on your home WiFi. No Telegram, no third party, no
 * account — runs entirely on your PC. READ-ONLY, auth-gated.
 *
 *   node scripts/zulu-brain-web.mjs
 *   → open  http://<your-PC-LAN-IP>:8787/?tk=<printed-value>  on your phone
 *
 * SECURITY (LAN-exposed → auth-gated, read-only):
 *  - Binds 0.0.0.0 so a phone on the same WiFi can reach it. NOT internet-exposed
 *    unless you port-forward (don't). The auth value gates every request
 *    (timing-safe compare). Passed as the `tk` query param.
 *  - READ-ONLY: only GET / (the page) and GET /search. No write/mutation path.
 *  - Reuses the bridge's bounded file-vault search; output runs through
 *    sanitizeOutput (strips env/secret/path shapes); the client renders results
 *    with textContent (no innerHTML) so a note title can't inject script.
 *  - Per-IP rate limit. Query length capped.
 *
 * Knobs: PRISM_BRAIN_WEB_PORT (8787) · PRISM_BRAIN_WEB_TOKEN (auto-generated +
 * persisted to state/shared/.brain-web-token if unset).
 */
import http from "node:http";
import crypto from "node:crypto";
import os from "node:os";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { searchVaultFiles, sanitizeOutput } from "./zulu-telegram-bridge.mjs";

const PORT = Number(process.env.PRISM_BRAIN_WEB_PORT) || 8787;
const AUTH_PERSIST_PATH = "H:/prism/state/shared/.brain-web-token";
const MAX_QUERY = 200;
const RATE_REFILL_MS = 1500;
const RATE_BURST = 8;

/** Stable auth value: env → persisted file → freshly generated (and persisted). */
export function resolveToken() {
  if (process.env.PRISM_BRAIN_WEB_TOKEN) return process.env.PRISM_BRAIN_WEB_TOKEN;
  try {
    if (existsSync(AUTH_PERSIST_PATH)) {
      const saved = readFileSync(AUTH_PERSIST_PATH, "utf8").trim();
      if (saved) return saved;
    }
  } catch { /* fall through */ }
  const fresh = crypto.randomBytes(18).toString("hex");
  try {
    mkdirSync(dirname(AUTH_PERSIST_PATH), { recursive: true });
    writeFileSync(AUTH_PERSIST_PATH, fresh);
  } catch { /* non-fatal; value still returned for this run */ }
  return fresh;
}

export function htmlEscape(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function timingSafeEq(a, b) {
  const A = Buffer.from(String(a ?? ""));
  const B = Buffer.from(String(b ?? ""));
  if (A.length !== B.length) return false;
  try { return crypto.timingSafeEqual(A, B); } catch { return false; }
}

const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PRISM brain</title>
<style>body{font:16px system-ui;margin:0;padding:1rem;background:#0b0e14;color:#cdd6f4}
input{width:100%;padding:.7rem;font-size:1.1rem;border-radius:.5rem;border:1px solid #313244;background:#1e1e2e;color:#cdd6f4}
.hit{padding:.6rem .2rem;border-bottom:1px solid #313244}.fn{color:#89b4fa;font-weight:600}.sn{color:#a6adc8;font-size:.9rem}
h1{font-size:1.1rem;color:#89b4fa}.muted{color:#6c7086;font-size:.85rem}</style></head>
<body><h1>PRISM brain</h1><input id="q" placeholder="search your brain..." autofocus autocomplete="off">
<div class="muted" id="status">read-only file-vault</div><div id="r"></div>
<script>
const tk=new URLSearchParams(location.search).get('tk')||'';
const q=document.getElementById('q'),r=document.getElementById('r'),st=document.getElementById('status');
let timer;q.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(go,250)});
async function go(){const v=q.value.trim();if(!v){r.textContent='';return}
 st.textContent='searching...';
 try{const res=await fetch('/search?tk='+encodeURIComponent(tk)+'&q='+encodeURIComponent(v));
  if(res.status===401){st.textContent='unauthorized - append ?tk=... to the URL';return}
  const d=await res.json();st.textContent=(d.hits||[]).length+' hit(s)';r.textContent='';
  for(const h of d.hits||[]){const el=document.createElement('div');el.className='hit';
   const fn=document.createElement('div');fn.className='fn';fn.textContent=h.filename;
   const sn=document.createElement('div');sn.className='sn';sn.textContent=h.snippet||'';
   el.appendChild(fn);el.appendChild(sn);r.appendChild(el);}
 }catch(e){st.textContent='error';}}
</script></body></html>`;

/**
 * Pure-ish request router (testable; search/sanitize/auth injectable). Returns
 * { status, type, body }. Auth must match; only GET /search + GET / are served.
 */
export function handleBrainRequest({ pathname, query = {}, auth }, deps = {}) {
  const search = deps.search || searchVaultFiles;
  const sanitize = deps.sanitize || sanitizeOutput;
  const expected = deps.auth || resolveToken();
  if (!timingSafeEq(auth, expected)) return { status: 401, type: "text/plain", body: "unauthorized" };
  if (pathname === "/search") {
    const qstr = String(query.q || "").slice(0, MAX_QUERY);
    if (!qstr) return { status: 200, type: "application/json", body: JSON.stringify({ q: "", hits: [] }) };
    const hits = (search(qstr) || []).map((h) => ({ filename: String(h.filename || ""), snippet: sanitize(String(h.snippet || "")) }));
    return { status: 200, type: "application/json", body: JSON.stringify({ q: qstr, hits }) };
  }
  if (pathname === "/" || pathname === "") return { status: 200, type: "text/html", body: PAGE };
  return { status: 404, type: "text/plain", body: "not found" };
}

function lanIps() {
  const out = [];
  const ifs = os.networkInterfaces();
  for (const name of Object.keys(ifs)) {
    for (const ni of ifs[name] || []) {
      if (ni.family === "IPv4" && !ni.internal) out.push(ni.address);
    }
  }
  return out;
}

function main() {
  const auth = resolveToken();
  const buckets = new Map();
  const allow = (ip) => {
    const now = Date.now();
    let b = buckets.get(ip);
    if (!b) { b = { tokens: RATE_BURST, last: now }; buckets.set(ip, b); }
    const refill = Math.floor((now - b.last) / RATE_REFILL_MS);
    if (refill > 0) { b.tokens = Math.min(RATE_BURST, b.tokens + refill); b.last = now; }
    if (b.tokens <= 0) return false;
    b.tokens -= 1;
    return true;
  };
  const server = http.createServer((req, res) => {
    const ip = req.socket.remoteAddress || "?";
    if (!allow(ip)) { res.writeHead(429); res.end("rate-limited"); return; }
    let u;
    try { u = new URL(req.url, "http://localhost"); } catch { res.writeHead(400); res.end("bad request"); return; }
    if (req.method !== "GET") { res.writeHead(405); res.end("read-only"); return; }
    const out = handleBrainRequest({ pathname: u.pathname, query: Object.fromEntries(u.searchParams), auth: u.searchParams.get("tk") }, { auth });
    res.writeHead(out.status, { "Content-Type": out.type, "X-Content-Type-Options": "nosniff" });
    res.end(out.body);
  });
  server.listen(PORT, "0.0.0.0", () => {
    const ips = lanIps();
    console.error(`[zulu-brain-web] read-only file-vault brain on :${PORT} (LAN-only; not internet-exposed)`);
    console.error(`[zulu-brain-web] open on your phone (same WiFi):`);
    for (const ip of ips) console.error(`    http://${ip}:${PORT}/?tk=${auth}`);
    if (!ips.length) console.error(`    http://<this-PC-LAN-IP>:${PORT}/?tk=${auth}`);
  });
  server.on("error", (e) => { console.error(`[zulu-brain-web] fatal: ${e && e.message}`); process.exit(1); });
}

const invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("zulu-brain-web.mjs");
if (invokedDirectly) main();
