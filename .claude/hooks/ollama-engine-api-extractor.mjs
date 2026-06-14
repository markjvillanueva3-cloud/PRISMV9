#!/usr/bin/env node
// tier: T1
/**
 * ollama-engine-api-extractor — PreToolUse hook on Read of engine source files.
 *
 * The U-WIRE13 killer (part 1 of 2). When the agent reads a PRISM engine
 * source file, this hook fires Ollama with a structured-extraction prompt
 * to capture the engine's public contract:
 *
 *   { methods: [{ name, params?, returns? }],
 *     required_fields: [...],
 *     enums: { fieldName: [literalValues...] } }
 *
 * The result is cached to state/shared/ENGINE_CONTRACTS_CACHE.json with a
 * 1-hour TTL. U-AF07 (schema-engine sync gate) reads from this cache to
 * detect drift when the agent edits a Zod schema for that engine.
 *
 * NEVER BLOCKING — this is an enrichment hook. continue:true always.
 *
 * Fail-OPEN policies:
 *   - Ollama unreachable / timed out → skip silently (cache untouched)
 *   - Response unparseable → skip
 *   - File path is not an engine → skip
 *   - Not in autonomous mode → skip (saves Ollama cycles)
 *
 * U-AF06 of AUTONOMOUS-FOOLPROOF-MS0.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  isEngineSourceFile,
  parseOllamaEngineContract,
  mergeContractCache,
  decideExtractRun,
} from "./lib/autonomous-foolproof-logic.mjs";
import { recordOllamaEvent } from "./lib/ollama-stats.mjs";

const HOOK_NAME = "ollama-engine-api-extractor";
// One contract extraction saves Claude from re-deriving the public surface
// of an engine on subsequent reads — typically ~150 tokens of cache hit per
// downstream Read instead of re-scanning the source.
const TOKENS_SAVED_PER_EXTRACT = 150;
const CACHE_RELATIVE = "state/shared/ENGINE_CONTRACTS_CACHE.json";
const OLLAMA_TIMEOUT_MS = 8 * 1000; // 8s — extractor needs more than the 500ms hook default
const OLLAMA_MAX_TOKENS = 800;
const ENGINE_HEAD_LINES = 200; // first N lines of engine usually carry the public surface
const SYSTEM_PROMPT =
  "You are a TypeScript contract extractor. Given an engine source file, " +
  "extract its public contract as JSON ONLY (no prose). Schema:\n" +
  '{"methods":[{"name":string,"params":[string],"returns":string}], ' +
  '"required_fields":[string], ' +
  '"enums":{"fieldName":[literalValue,...]}}\n' +
  "Include ONLY exported public methods, exported types/enums, and required fields " +
  "appearing on input parameter shapes. Output JSON only, no markdown fences.";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function findProjectRoot(startCwd = process.cwd()) {
  let cur = startCwd;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(cur, ".claude", "settings.json"))) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return startCwd;
}

function loadCache(cachePath) {
  try {
    if (!fs.existsSync(cachePath)) return null;
    return JSON.parse(fs.readFileSync(cachePath, "utf8"));
  } catch {
    return null;
  }
}

function writeCache(cachePath, cache) {
  try {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf8");
  } catch {
    /* best-effort */
  }
}

function readEngineHead(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    const lines = raw.split("\n").slice(0, ENGINE_HEAD_LINES);
    return lines.join("\n");
  } catch {
    return null;
  }
}

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_HOOK_MODEL ?? "qwen2.5-coder:32b";

/**
 * Call Ollama's /api/generate endpoint directly. Mirrors what
 * OllamaHookBridgeEngine.query does, but as a self-contained HTTP call so
 * the hook has no build-artifact dependency. Fail-OPEN: returns null on
 * any error (network, timeout, bad response).
 */
async function callOllamaForContract(engineSource) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: engineSource,
        system: SYSTEM_PROMPT,
        stream: false,
        options: {
          temperature: 0,
          num_predict: OLLAMA_MAX_TOKENS,
        },
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (typeof json?.response !== "string" || json.response.length === 0) return null;
    return json.response;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const isAutonomous = process.env.PRISM_AUTONOMOUS === "1";

  const raw = readStdinSafe();
  let payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {};
  }

  const filePath = payload?.tool_input?.file_path ?? "";
  if (!isEngineSourceFile(filePath)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const root = findProjectRoot();
  const cachePath = path.join(root, CACHE_RELATIVE);
  const cache = loadCache(cachePath);

  const decision = decideExtractRun({ filePath, isAutonomous, cache });
  if (!decision.run) {
    // Cache hit / not-needed branch is itself a win — Claude reads the cached
    // contract instead of the engine source.
    recordOllamaEvent({
      hook: HOOK_NAME, decision: "offload",
      category: "cache-hit", tokensSaved: TOKENS_SAVED_PER_EXTRACT,
      extras: { mode: "cache-hit", file: path.basename(filePath) },
    });
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const source = readEngineHead(filePath);
  if (!source) {
    recordOllamaEvent({
      hook: HOOK_NAME, decision: "keep", category: "no-source",
      extras: { file: path.basename(filePath) },
    });
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const rawResponse = await callOllamaForContract(source);
  if (!rawResponse) {
    recordOllamaEvent({
      hook: HOOK_NAME, decision: "suggest",
      category: "contract-extract",
      extras: { mode: "ollama-down", file: path.basename(filePath) },
    });
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext:
          "ollama-engine-api-extractor: Ollama unreachable; skipping contract extraction (fail-open).",
      },
    }));
    return;
  }

  const parsed = parseOllamaEngineContract(rawResponse);
  if (!parsed.ok) {
    recordOllamaEvent({
      hook: HOOK_NAME, decision: "keep", category: "parse-failed",
      extras: { reason: parsed.reason, file: path.basename(filePath) },
    });
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `ollama-engine-api-extractor: contract parse failed (${parsed.reason}); skipping cache write.`,
      },
    }));
    return;
  }

  const next = mergeContractCache(cache, filePath, parsed.contract);
  writeCache(cachePath, next);

  recordOllamaEvent({
    hook: HOOK_NAME, decision: "offload",
    category: "contract-extract", tokensSaved: TOKENS_SAVED_PER_EXTRACT,
    extras: {
      mode: "extracted",
      file: path.basename(filePath),
      methods: parsed.contract.methods.length,
      enums: Object.keys(parsed.contract.enums).length,
    },
  });

  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: `ollama-engine-api-extractor: cached contract for ${path.basename(filePath)} (${parsed.contract.methods.length} methods, ${Object.keys(parsed.contract.enums).length} enums).`,
    },
  }));
}

if (process.argv[1]?.endsWith("ollama-engine-api-extractor.mjs")) {
  main();
}
