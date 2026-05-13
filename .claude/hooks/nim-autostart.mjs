#!/usr/bin/env node
// tier: T4
/**
 * nim-autostart.mjs — SessionStart hook
 *
 * Soft-fail probe + launcher. If NIM endpoint already responds: no-op.
 * Otherwise calls H:/Tools/nim/start.ps1 in the background. Does NOT
 * block session bootstrap — failure is silent (logs warn, session
 * continues with Ollama-only).
 *
 * Mirrors the lock pattern from ollama-autostart.mjs so 6+ concurrent
 * chats can't all spawn docker compose simultaneously.
 *
 * FIRES ON: SessionStart
 * BLOCKING: never
 */

import { spawn } from "node:child_process";
import { existsSync, writeFileSync, readFileSync, unlinkSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const NIM_URL = (process.env.NIM_URL || "http://127.0.0.1:8000/v1").replace(/\/$/, "");
const PROBE_TIMEOUT_MS = 1500;
const STARTUP_WAIT_MS  = 2500;
const LOCK_FILE = "H:/prism/.claude/cache/nim-autostart.lock";
const LOCK_TTL_MS = 30_000;            // start.ps1 can take a while; longer TTL than ollama
const START_PS1 = "H:/Tools/nim/start.ps1";

async function isNimUp() {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), PROBE_TIMEOUT_MS);
  try {
    const r = await fetch(`${NIM_URL}/models`, { signal: ctl.signal });
    return r.ok;
  } catch { return false; } finally { clearTimeout(t); }
}

function acquireLock() {
  try {
    if (existsSync(LOCK_FILE)) {
      const data = JSON.parse(readFileSync(LOCK_FILE, "utf-8"));
      if (Date.now() - data.ts < LOCK_TTL_MS) return false;
      unlinkSync(LOCK_FILE);
    }
    const dir = dirname(LOCK_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(LOCK_FILE, JSON.stringify({ ts: Date.now(), pid: process.pid }));
    return true;
  } catch { return false; }
}

function releaseLock() {
  try { if (existsSync(LOCK_FILE)) unlinkSync(LOCK_FILE); } catch {}
}

function startNimDetached() {
  if (!existsSync(START_PS1)) return false;
  try {
    const child = spawn(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", START_PS1],
      { detached: true, stdio: "ignore", windowsHide: true },
    );
    child.on("error", () => {});
    child.unref();
    return true;
  } catch { return false; }
}

async function main() {
  if (await isNimUp()) {
    console.log(JSON.stringify({ continue: true, systemMessage: "NIM already running [ready]" }));
    return;
  }
  if (!acquireLock()) {
    // Another chat is bringing it up. Wait briefly, re-probe, return.
    await new Promise((r) => setTimeout(r, STARTUP_WAIT_MS));
    const up = await isNimUp();
    console.log(JSON.stringify({
      continue: true,
      systemMessage: up ? "NIM started by another session [ready]" : "NIM coming up [warming]",
    }));
    return;
  }
  try {
    const launched = startNimDetached();
    if (!launched) {
      console.log(JSON.stringify({ continue: true, systemMessage: "NIM not installed (skip — Ollama remains primary) [unavailable]" }));
      return;
    }
    // Don't wait for full TRT-LLM compile; just confirm process spawned.
    await new Promise((r) => setTimeout(r, STARTUP_WAIT_MS));
    const up = await isNimUp();
    console.log(JSON.stringify({
      continue: true,
      systemMessage: up
        ? "NIM started [ready]"
        : "NIM launching (TRT-LLM compile takes 5-10 min on first run; status.ps1 to monitor) [warming]",
    }));
  } finally { releaseLock(); }
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true, systemMessage: "nim-autostart soft-failed (continuing)" }));
});
