#!/usr/bin/env node
// tier: T4
/**
 * ollama-autostart.mjs — SessionStart hook
 *
 * Checks if Ollama is running. If not, starts it in background.
 * Silent no-op if Ollama is already running or not installed.
 * Uses lock file to prevent 8 concurrent chats from all trying to start.
 *
 * FIRES ON: SessionStart
 * BLOCKING: never — always continues
 */

import { spawn } from "node:child_process";
import { existsSync, writeFileSync, readFileSync, unlinkSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const OLLAMA_URL = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
const PROBE_TIMEOUT_MS = 1500;
const STARTUP_WAIT_MS = 2000;
const LOCK_FILE = "H:/prism/.claude/cache/ollama-autostart.lock";
const LOCK_TTL_MS = 10000; // Lock expires after 10s

// Check common Ollama install locations on Windows
const OLLAMA_PATHS = [
  process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}/Programs/Ollama/ollama.exe`,
  "C:/Users/wompu/AppData/Local/Programs/Ollama/ollama.exe",
  "C:/Program Files/Ollama/ollama.exe",
  "C:/Program Files (x86)/Ollama/ollama.exe",
  "H:/Tools/ollama/ollama.exe", // Portable location
].filter(Boolean);

// Set models directory to H: drive for portability
const OLLAMA_MODELS_DIR = "H:/Tools/ollama/models";

function findOllama() {
  for (const p of OLLAMA_PATHS) {
    if (existsSync(p)) return p;
  }
  return "ollama"; // Fall back to PATH
}

async function isOllamaRunning() {
  const ctl = new AbortController();
  const timeout = setTimeout(() => ctl.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: ctl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function startOllama() {
  const ollamaPath = findOllama();

  try {
    // Start detached, don't wait for it
    // Set OLLAMA_MODELS for portability (H: drive)
    const child = spawn(ollamaPath, ["serve"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      env: { ...process.env, OLLAMA_MODELS: OLLAMA_MODELS_DIR },
    });

    // Handle spawn errors (e.g., ENOENT if ollama not installed)
    child.on("error", () => {}); // Swallow — we'll detect via isOllamaRunning

    child.unref();

    // Brief wait for startup
    await new Promise(r => setTimeout(r, STARTUP_WAIT_MS));

    // Verify it started
    return await isOllamaRunning();
  } catch {
    // Ollama not installed or spawn failed
    return false;
  }
}

function acquireLock() {
  try {
    // Check for existing lock
    if (existsSync(LOCK_FILE)) {
      const data = JSON.parse(readFileSync(LOCK_FILE, "utf-8"));
      const age = Date.now() - data.ts;
      if (age < LOCK_TTL_MS) {
        return false; // Another session is starting Ollama
      }
      // Lock expired, remove it
      unlinkSync(LOCK_FILE);
    }
    // Create lock
    const dir = dirname(LOCK_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(LOCK_FILE, JSON.stringify({ ts: Date.now(), pid: process.pid }));
    return true;
  } catch {
    return false;
  }
}

function releaseLock() {
  try {
    if (existsSync(LOCK_FILE)) unlinkSync(LOCK_FILE);
  } catch {}
}

async function main() {
  // Check if already running
  if (await isOllamaRunning()) {
    console.log(JSON.stringify({ continue: true, systemMessage: "Ollama already running [ready]"
    }));
    return;
  }

  // Try to acquire lock (prevent 8 chats from all starting Ollama)
  if (!acquireLock()) {
    // Another session is handling it, wait and check
    await new Promise(r => setTimeout(r, STARTUP_WAIT_MS + 500));
    const running = await isOllamaRunning();
    console.log(JSON.stringify({ continue: true, systemMessage: running ? "Ollama started by another session [ready]" : "Ollama not available [unavailable]" }));
    return;
  }

  try {
    // Try to start it
    const started = await startOllama();

    if (started) {
      console.log(JSON.stringify({ continue: true, systemMessage: "Ollama started successfully [started]" }));
    } else {
      console.log(JSON.stringify({ continue: true, systemMessage: "Ollama not available (not installed or failed to start) [unavailable]" }));
    }
  } finally {
    releaseLock();
  }
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true, systemMessage: "error" }));
});
