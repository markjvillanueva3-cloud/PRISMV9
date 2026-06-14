#!/usr/bin/env node
/**
 * obsidian-live-setup-check.mjs — ZULU-OBSIDIAN-LIVE-MS0
 * ======================================================
 *
 * Operator green/red probe for the live-brain + mobile setup. Run after the
 * one-time setup (install Obsidian → open H:/prism/knowledge as a vault →
 * enable the "Local REST API" plugin → copy its key into PRISM_OBSIDIAN_API_KEY;
 * create a Telegram bot via @BotFather → PRISM_TELEGRAM_BOT_TOKEN + your chat id
 * into PRISM_TELEGRAM_ALLOWED_CHAT_IDS):
 *
 *   node scripts/obsidian-live-setup-check.mjs
 *
 * Advisory only (always exits 0). Never prints the API key or bot token — only
 * present/absent. Probes the vault on loopback :27123 with a short timeout.
 */
import https from "node:https";
import http from "node:http";
import { URL } from "node:url";

const OBSIDIAN_URL = process.env.PRISM_OBSIDIAN_URL || "https://127.0.0.1:27123";
const PROBE_TIMEOUT_MS = 2500;

function isLoopbackHost(hostname) {
  const h = String(hostname).toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "::1" || h === "localhost") return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const o = m.slice(1).map(Number);
  return o[0] === 127 && o.every((n) => n <= 255);
}

function probeRoot() {
  return new Promise((resolve) => {
    let u;
    try {
      u = new URL("/", OBSIDIAN_URL);
    } catch {
      resolve({ ok: false, reason: "bad-url" });
      return;
    }
    const key = process.env.PRISM_OBSIDIAN_API_KEY || "";
    const isHttps = u.protocol === "https:";
    const lib = isHttps ? https : http;
    const req = lib.request(
      u,
      {
        method: "GET",
        headers: { ...(key ? { Authorization: `Bearer ${key}` } : {}), Accept: "application/json" },
        ...(isHttps ? { rejectUnauthorized: !isLoopbackHost(u.hostname) } : {}),
      },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (text += c));
        res.on("end", () => {
          let authenticated = false;
          try {
            authenticated = JSON.parse(text)?.authenticated === true;
          } catch {
            /* ignore */
          }
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 500, status: res.statusCode, authenticated });
        });
      },
    );
    req.setTimeout(PROBE_TIMEOUT_MS, () => req.destroy(new Error("timeout")));
    req.on("error", (e) => resolve({ ok: false, reason: String(e && e.message) }));
    req.end();
  });
}

const G = "🟢";
const Y = "🟡";
const R = "🔴";

async function main() {
  const lines = [];
  lines.push("=== ZULU-OBSIDIAN-LIVE setup check ===");

  // Obsidian live brain
  const url = OBSIDIAN_URL;
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    /* ignore */
  }
  const loopback = isLoopbackHost(host);
  const hasKey = !!process.env.PRISM_OBSIDIAN_API_KEY;
  const liveFlag = process.env.PRISM_OBSIDIAN_LIVE === "1";

  lines.push(`${loopback ? G : R} vault URL: ${url} ${loopback ? "(loopback)" : "(NON-loopback — refused unless PRISM_OBSIDIAN_ALLOW_REMOTE=1)"}`);
  lines.push(`${hasKey ? G : R} PRISM_OBSIDIAN_API_KEY: ${hasKey ? "present" : "MISSING — set it from the Local REST API plugin"}`);
  lines.push(`${liveFlag ? G : Y} PRISM_OBSIDIAN_LIVE: ${liveFlag ? "1 (orchestrator live-read enabled)" : "unset (live-brain read OFF — set to 1 to enable)"}`);

  const p = await probeRoot();
  if (!p.ok) {
    lines.push(`${R} :27123 reachable: NO (${p.reason || `http-${p.status}`}) — is Obsidian running with the Local REST API plugin?`);
  } else if (!p.authenticated) {
    lines.push(`${Y} :27123 reachable: YES (http-${p.status}) but UNAUTHENTICATED — check the API key`);
  } else {
    lines.push(`${G} :27123 reachable + authenticated`);
  }

  // Telegram mobile bridge
  const hasToken = !!process.env.PRISM_TELEGRAM_BOT_TOKEN;
  const allow = String(process.env.PRISM_TELEGRAM_ALLOWED_CHAT_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  lines.push("--- Telegram mobile bridge (optional) ---");
  lines.push(`${hasToken ? G : Y} PRISM_TELEGRAM_BOT_TOKEN: ${hasToken ? "present" : "absent (bridge won't start)"}`);
  lines.push(`${allow.length > 0 ? G : Y} PRISM_TELEGRAM_ALLOWED_CHAT_IDS: ${allow.length > 0 ? `${allow.length} chat(s) allowlisted` : "empty (default-deny: NO messages answered)"}`);
  if (hasToken && allow.length > 0) lines.push(`${G} start the bridge: node scripts/zulu-telegram-bridge.mjs`);

  const allGreen = loopback && hasKey && p.ok && p.authenticated;
  lines.push(allGreen ? `${G} live brain READY` : `${Y} live brain not fully configured (see above) — PRISM-side code is fail-soft until then`);
  console.log(lines.join("\n"));
}

main().catch((e) => {
  console.log(`${R} setup-check error: ${e && e.message}`);
  process.exit(0); // advisory — never fail a pipeline
});
