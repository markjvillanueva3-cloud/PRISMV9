#!/usr/bin/env node
// tier: T4
/**
 * embedder-inject-qdrant.mjs — SessionStart smoke test for Qdrant embedder
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P0-U01.
 *
 * QdrantMemoryEngineSingleton lazy-injects an Ollama embedder on first use,
 * so this hook does NOT need to call setEmbedder() directly across process
 * boundaries (the singleton lives in the MCP server's process). Instead, it
 * pre-flights the embedder path so misconfigurations surface at session
 * start — long before a dispatcher action fails opaquely:
 *
 *   1. Ollama daemon reachable on the configured host
 *   2. Embedding model (default: nomic-embed-text) is pulled
 *   3. One real /api/embed round-trip yields a 768-dim vector
 *
 * Failure mode: this hook NEVER blocks session start. Any error is logged to
 * stderr (visible in Claude Code's session log) and the hook exits 0. Hard
 * failures here would punish users who haven't pulled the model yet.
 *
 * Stdin: SessionStart hook event JSON (consumed but not required).
 * Stdout: nothing on success; brief diagnostic on failure.
 * Exit: always 0.
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P0-U01
 */

import { readFileSync } from "node:fs";

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
const EMBED_MODEL = process.env.EMBED_MODEL ?? "nomic-embed-text";
const PROBE_TIMEOUT_MS = 5_000;
const EMBED_TIMEOUT_MS = 10_000;
const EXPECTED_DIM = 768;

function logDiag(level, msg, extra = {}) {
  const entry = { ts: new Date().toISOString(), level, hook: "embedder-inject-qdrant", msg, ...extra };
  process.stderr.write(JSON.stringify(entry) + "\n");
}

function readStdinSafe() {
  // Consume stdin so the harness sees a clean close; tolerate any payload.
  try {
    const buf = readFileSync(0);
    if (buf.length === 0) return null;
    try { return JSON.parse(buf.toString("utf8")); } catch { return { raw: buf.toString("utf8").slice(0, 200) }; }
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url, init, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function probeOllama() {
  let res;
  try {
    res = await fetchWithTimeout(`${OLLAMA_HOST}/api/tags`, { method: "GET" }, PROBE_TIMEOUT_MS);
  } catch (e) {
    return { ok: false, reason: `Ollama unreachable: ${e?.message ?? e}` };
  }
  if (!res.ok) return { ok: false, reason: `Ollama /api/tags HTTP ${res.status}` };
  let data;
  try {
    data = await res.json();
  } catch (e) {
    return { ok: false, reason: `Ollama /api/tags bad JSON: ${e?.message ?? e}` };
  }
  const models = (data?.models ?? []).map((m) => m.name ?? "");
  const hasModel = models.some((n) => n === EMBED_MODEL || n.startsWith(`${EMBED_MODEL}:`));
  if (!hasModel) {
    return { ok: false, reason: `model ${EMBED_MODEL} not pulled (have: ${models.slice(0, 4).join(", ")})` };
  }
  return { ok: true };
}

async function probeEmbedRoundTrip() {
  let res;
  try {
    res = await fetchWithTimeout(
      `${OLLAMA_HOST}/api/embed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: EMBED_MODEL, input: "ping" }),
      },
      EMBED_TIMEOUT_MS,
    );
  } catch (e) {
    return { ok: false, reason: `embed network error: ${e?.message ?? e}` };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, reason: `embed HTTP ${res.status}: ${body.slice(0, 120)}` };
  }
  let data;
  try {
    data = await res.json();
  } catch (e) {
    return { ok: false, reason: `embed bad JSON: ${e?.message ?? e}` };
  }
  const vec = data?.embeddings?.[0];
  if (!Array.isArray(vec) || vec.length === 0) {
    return { ok: false, reason: "embed returned empty vector" };
  }
  if (vec.length !== EXPECTED_DIM) {
    return { ok: false, reason: `embed dim mismatch: ${vec.length} vs ${EXPECTED_DIM}` };
  }
  return { ok: true, dim: vec.length };
}

async function main() {
  readStdinSafe(); // consume but don't require any specific shape
  const probe = await probeOllama();
  if (!probe.ok) {
    logDiag("warn", "Qdrant embedder pre-flight failed", { reason: probe.reason });
    return;
  }
  const round = await probeEmbedRoundTrip();
  if (!round.ok) {
    logDiag("warn", "Qdrant embedder round-trip failed", { reason: round.reason });
    return;
  }
  logDiag("info", "Qdrant embedder ready", { model: EMBED_MODEL, dim: round.dim });
}

main()
  .catch((e) => {
    // Last-resort guard — never block a session.
    logDiag("error", "embedder-inject-qdrant unexpected error", { error: e?.message ?? String(e) });
  })
  .finally(() => {
    process.exit(0);
  });
