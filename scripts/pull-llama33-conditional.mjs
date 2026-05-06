/**
 * pull-llama33-conditional.mjs — INTEL-OLLAMA-OBSIDIAN-MS0/P20-U02
 *
 * Conditionally pulls llama3.3:70b (~40 GB) for the high-complexity routing
 * tier. Runs ONLY if H:\ has >100 GB free; otherwise records a skip note in
 * MODEL-STACK.md and exits 0.
 *
 * Why a separate script (vs adding to pull-multi-model-stack.mjs):
 *   - 70B model is OPTIONAL — most boxes can't fit it on top of the
 *     ~31 GB tier-0..4 stack.
 *   - Decoupled exit code: a missing 70B should never fail the multi-stack
 *     orchestration. P20-U01 stays mandatory; P20-U02 is best-effort.
 *
 * Pure functions exported for tests:
 *   - LARGE_MODEL_SPEC                    → canonical descriptor
 *   - decideConditionalPull(freeGB, opts) → { shouldPull, reason }
 *   - readMarkdownStatus(md)              → { hasMarker, currentLine }
 *   - renderStatusLine(decision, isoTs)   → markdown bullet line
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
const OLLAMA_BIN  = process.env.OLLAMA_BIN ?? "H:/Tools/Ollama/ollama.exe";

// Required free-space margin: model size (40 GB) + 60 GB safety headroom.
const REQUIRED_FREE_GB_DEFAULT = 100;

// Where the optional-stack status line is recorded.
const STATUS_MD_REL = "MODEL-STACK.md";
const STATUS_MARKER = "<!-- P20-U02 STATUS -->";

export const LARGE_MODEL_SPEC = {
  name: "llama3.3:70b",
  tier: 5,
  kind: "chat",
  approxSizeGB: 40,
  rationale: "High-complexity reasoning fallback when 14B tiers underfit.",
};

/**
 * Decide whether to pull llama3.3:70b based on available disk and
 * already-installed state.
 *
 * @param {number|null} freeGB - free space on H: in GB, or null if unknown
 * @param {{ alreadyInstalled?: boolean, requiredFreeGB?: number }} opts
 * @returns {{ shouldPull: boolean, reason: string }}
 */
export function decideConditionalPull(freeGB, opts = {}) {
  const required = Number.isFinite(opts.requiredFreeGB) ? opts.requiredFreeGB : REQUIRED_FREE_GB_DEFAULT;
  if (opts.alreadyInstalled) {
    return { shouldPull: false, reason: "already installed" };
  }
  if (freeGB === null || freeGB === undefined || !Number.isFinite(freeGB)) {
    return { shouldPull: false, reason: "free-space probe unavailable; refusing to pull" };
  }
  if (freeGB < required) {
    return {
      shouldPull: false,
      reason: `insufficient disk: ${freeGB.toFixed(1)} GB free, need ${required} GB`,
    };
  }
  return { shouldPull: true, reason: `${freeGB.toFixed(1)} GB free ≥ ${required} GB required` };
}

/**
 * Render the status line that goes into MODEL-STACK.md so future runs
 * (and humans) know what state the optional pull is in.
 */
export function renderStatusLine(decision, isoTs) {
  const ts = isoTs || new Date().toISOString();
  const verb = decision.shouldPull ? "PULLED" : "SKIPPED";
  return `${STATUS_MARKER} ${verb} (${ts}) — ${decision.reason}`;
}

/**
 * Inspect a MODEL-STACK.md content string for an existing marker so we
 * can update it in-place rather than appending duplicates.
 */
export function readMarkdownStatus(md) {
  if (typeof md !== "string" || md.length === 0) {
    return { hasMarker: false, currentLine: null };
  }
  const lines = md.split(/\r?\n/);
  const idx = lines.findIndex((l) => l.includes(STATUS_MARKER));
  if (idx === -1) return { hasMarker: false, currentLine: null };
  return { hasMarker: true, currentLine: lines[idx], lineIndex: idx };
}

// ---------------------------------------------------------------------------
// I/O LAYER (skipped during testing via the isMain guard)
// ---------------------------------------------------------------------------

function probeFreeBytesH() {
  // Cross-platform free-space probe via fs.statfsSync (Node 19.6+).
  // Falls back to null on platforms that don't expose it.
  try {
    const stat = fs.statfsSync("H:/");
    return stat.bavail * stat.bsize;
  } catch {
    return null;
  }
}

async function ollamaTags() {
  const r = await fetch(`${OLLAMA_HOST}/api/tags`);
  if (!r.ok) throw new Error(`tags: ${r.status}`);
  const j = await r.json();
  return new Set((j.models ?? []).map((m) => m.name));
}

function pull(model) {
  return new Promise((resolve) => {
    const p = spawn(OLLAMA_BIN, ["pull", model], { stdio: ["ignore", "inherit", "inherit"] });
    p.on("exit", (code) => resolve(code === 0));
    p.on("error", () => resolve(false));
  });
}

function updateModelStackMd(decision, repoRoot) {
  const target = path.join(repoRoot, STATUS_MD_REL);
  if (!fs.existsSync(target)) return;
  const md = fs.readFileSync(target, "utf8");
  const status = readMarkdownStatus(md);
  const line = renderStatusLine(decision);
  if (status.hasMarker && typeof status.lineIndex === "number") {
    const lines = md.split(/\r?\n/);
    lines[status.lineIndex] = line;
    fs.writeFileSync(target, lines.join("\n"), "utf8");
  } else {
    fs.appendFileSync(target, `\n${line}\n`, "utf8");
  }
}

async function main() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const freeBytes = probeFreeBytesH();
  const freeGB = freeBytes === null ? null : freeBytes / (1024 ** 3);

  let alreadyInstalled = false;
  try {
    alreadyInstalled = (await ollamaTags()).has(LARGE_MODEL_SPEC.name);
  } catch {
    // Ollama unreachable — leave alreadyInstalled=false; decideConditionalPull
    // will still refuse the pull because free-space probe is the gate.
  }

  const decision = decideConditionalPull(freeGB, { alreadyInstalled });
  console.log(`[pull-llama33-conditional] free: ${freeGB === null ? "unknown" : freeGB.toFixed(1) + " GB"}`);
  console.log(`[pull-llama33-conditional] decision: ${decision.shouldPull ? "PULL" : "SKIP"} — ${decision.reason}`);

  if (decision.shouldPull) {
    const ok = await pull(LARGE_MODEL_SPEC.name);
    decision.shouldPull = ok;
    decision.reason = ok ? `${decision.reason} → pull succeeded` : `${decision.reason} → pull FAILED`;
  }
  updateModelStackMd(decision, repoRoot);
}

const _isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (_isMain) {
  main().catch((e) => { console.error(e); process.exit(2); });
}
