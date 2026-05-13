// tier: T4
/**
 * local-compute-intent.mjs — UserPromptSubmit hook
 * RE-ENABLED: 2026-04-26 (LOCAL-LLM-MS0 U-LLMH02)
 *
 * Detects prompts that would benefit from the local compute stack
 * (Ollama for local LLM inference / embeddings, Docker for service
 * containers like Qdrant / postgres / prometheus).
 *
 * When intent is detected and the relevant stack is not already running,
 * this hook launches the canonical local-compute activator in the
 * background. It never blocks the prompt on Docker startup.
 *
 * SILENT MODE (LOCAL-LLM-MS0):
 * - Only inject context when Docker/Ollama is DOWN AND user has strong
 *   local-compute intent (embeddings, inference, batch jobs)
 * - If stack is already running: silent no-op
 * - If intent is weak (just mentions docker/compose): log but don't inject
 *
 * Reads stdin: { prompt, session_id, transcript_path, ... }
 * Writes stdout: { additionalContext?: string } | {}
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { execFileSync, spawn } from "node:child_process";
import process from "node:process";

const REPO_ROOT = "H:/prism";
const LAUNCHER = `${REPO_ROOT}/mcp-server/scripts/ollama-docker-launcher.mjs`;
const COMPOSE_FILE = `${REPO_ROOT}/docker-compose.yml`;
const CACHE_DIR = `${REPO_ROOT}/.claude/cache`;
const INTENT_CACHE = `${CACHE_DIR}/local-compute-intent-last.json`;
const AUTOSTART_STATE = `${CACHE_DIR}/local-compute-autostart-last.json`;
const AUTOSTART_LOCK = `${CACHE_DIR}/local-compute-autostart.lock`;
const SILENT_LOG = `${CACHE_DIR}/local-compute-silent.jsonl`;
const LOCK_TTL_MS = Number(process.env.PRISM_LOCAL_COMPUTE_LOCK_TTL_MS || 10 * 60 * 1000);
const COOLDOWN_MS = Number(process.env.PRISM_LOCAL_COMPUTE_COOLDOWN_MS || 5 * 60 * 1000);
const LAUNCH_TIMEOUT_MS = Number(process.env.PRISM_LOCAL_COMPUTE_DOCKER_TIMEOUT_MS || 120_000);
const AUTO_START_ENABLED = process.env.PRISM_LOCAL_COMPUTE_AUTOSTART !== "0";
const DRY_RUN = process.env.PRISM_LOCAL_COMPUTE_DRY_RUN === "1";
const PULL_MODE = process.env.PRISM_LOCAL_COMPUTE_HOOK_PULL === "1";
const SILENT_MODE = process.env.PRISM_LOCAL_COMPUTE_SILENT !== "0"; // Default: silent
const DEFAULT_SERVICES = ["postgres", "prism-server", "prometheus", "ollama", "qdrant"];

// Strong intent categories that warrant context injection (when stack is DOWN)
const STRONG_INTENT = ["embeddings", "local_inference", "batch_jobs", "lora"];

const TRIGGERS = {
  embeddings: [
    /\bembed(ding)?s?\b/i,
    /\bvector(?:ize|s)?\b/i,
    /\bsemantic search\b/i,
    /\bqdrant\b/i,
    /\bnomic[- ]?embed\b/i,
    /\bindex\s+(?:the\s+)?(?:codebase|docs|files|corpus)\b/i,
  ],
  local_inference: [
    /\bollama\b/i,
    /\bcodellama\b/i,
    /\bmistral\b/i,
    /\bqwen2?\.?5?[- ]?coder\b/i,
    /\blocal (?:llm|model|inference)\b/i,
    /\brun .* (?:locally|offline)\b/i,
    /\b(?:private|air[- ]?gapped)\s+(?:inference|llm|model)\b/i,
  ],
  batch_jobs: [
    /\bbatch\s+(?:process|extract|embed|ingest|analyze)/i,
    /\bbulk\s+(?:process|extract|embed|ingest|analyze)/i,
    /\b(?:process|extract|embed)\s+\d{3,}\b/i,
    /\blarge\s+(?:pdf|corpus|dataset|archive)\b/i,
    /\bingest\s+(?:all|entire|every|thousands)/i,
  ],
  lora: [
    /\blora\b/i,
    /\bfine[- ]?tune\b/i,
    /\btraining\s+(?:data|job|run)\b/i,
  ],
  infra_services: [
    /\bdocker\b/i,
    /\bpostgres(?:ql)?\b/i,
    /\bprometheus\b/i,
    /\bgrafana\b/i,
    /\bcompose\b/i,
    /\bcontainer(?:ize|s)?\b/i,
  ],
};

function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  try {
    ensureDir(filePath);
    writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
  } catch {
    // Hook must never block prompts because cache/state writes failed.
  }
}

function logSilent(entry) {
  try {
    ensureDir(SILENT_LOG);
    const { appendFileSync } = require("node:fs");
    appendFileSync(SILENT_LOG, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
  } catch {
    // Silent logging is best-effort
  }
}

function hasStrongIntent(categories) {
  return categories.some(cat => STRONG_INTENT.includes(cat));
}

function matchTriggers(prompt) {
  const hits = {};
  for (const [cat, regexes] of Object.entries(TRIGGERS)) {
    const matches = regexes.filter((r) => r.test(prompt));
    if (matches.length > 0) hits[cat] = matches.length;
  }
  return hits;
}

function dockerCommand() {
  const candidates = [
    process.env.DOCKER_CLI,
    "C:/Program Files/Docker/Docker/resources/bin/docker.exe",
    "docker",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate.includes("/") || candidate.includes("\\")) {
      if (existsSync(candidate)) return candidate;
      continue;
    }
    return candidate;
  }
  return "docker";
}

function sh(args, timeout = 1500) {
  try {
    const stdout = execFileSync(dockerCommand(), args,
      { encoding: "utf8", timeout, stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, stdout: stdout.trim() };
  } catch (error) {
    return {
      ok: false,
      stdout: String(error?.stdout || "").trim(),
      stderr: String(error?.stderr || error?.message || "").trim(),
    };
  }
}

function dockerReady() {
  const result = sh(["version", "--format", "{{.Server.Version}}"], 1500);
  return result.ok && result.stdout.length > 0;
}

function ollamaReady() {
  const result = sh(["exec", "prism-ollama", "ollama", "--version"], 1500);
  return result.ok;
}

function parseComposePs(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try { return JSON.parse(text); } catch { return []; }
  }
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line) => {
      try { return [JSON.parse(line)]; } catch { return []; }
    });
}

function composeServicesReady(services) {
  if (!services.length || !existsSync(COMPOSE_FILE)) return true;
  const result = sh(["compose", "-f", COMPOSE_FILE, "ps", "--format", "json"], 2500);
  if (!result.ok) return false;
  const containers = parseComposePs(result.stdout);
  return services.every((service) => {
    const found = containers.find((container) =>
      container?.Service === service || String(container?.Name || "").includes(service));
    const state = String(found?.State || "").toLowerCase();
    return found && (state === "running" || state === "healthy");
  });
}

function hasOptOut(prompt) {
  return /\[(?:no-local|no-local-compute|no-docker|cloud-only)\]/i.test(prompt);
}

function servicesForPrompt(prompt, hits) {
  const genericStack = /\b(?:activate-local|local compute stack|full stack|compose stack|docker stack)\b/i.test(prompt)
    || (hits.infra_services && /\bdocker\b|\bcompose\b/i.test(prompt));
  if (genericStack) return [...DEFAULT_SERVICES];

  const services = new Set();
  if (hits.embeddings || hits.batch_jobs || hits.lora) {
    services.add("ollama");
    services.add("qdrant");
  }
  if (hits.local_inference) {
    services.add("ollama");
  }
  if (hits.infra_services) {
    services.add("postgres");
    services.add("prism-server");
    services.add("prometheus");
  }
  return [...services];
}

function needsOllama(hits) {
  return Boolean(hits.embeddings || hits.local_inference || hits.batch_jobs || hits.lora);
}

function shouldAutostart(prompt, hits) {
  if (needsOllama(hits)) return true;

  const runtimeIntent =
    /\b(?:start|launch|run|bring up|activate|spin up|need|use|connect|test)\b[\s\S]{0,80}\b(?:docker|compose|postgres|prometheus|grafana|container)\b/i.test(prompt)
    || /\b(?:docker|compose|postgres|prometheus|grafana|container)\b[\s\S]{0,80}\b(?:start|launch|run|needed|required|down|unavailable|not running)\b/i.test(prompt);

  const metaIntent =
    /\b(?:hook|settings?|configure|document|docs|read|analyze|build|create|implement|set up)\b[\s\S]{0,80}\b(?:docker|compose|local compute)\b/i.test(prompt)
    || /\b(?:docker|compose|local compute)\b[\s\S]{0,80}\b(?:hook|settings?|configure|document|docs|read|analyze|build|create|implement|set up)\b/i.test(prompt);

  return runtimeIntent && !metaIntent;
}

function acquireLaunchLock(payload) {
  if (DRY_RUN) return { ok: true, dryRun: true };

  try {
    if (existsSync(AUTOSTART_LOCK)) {
      const existing = readJson(AUTOSTART_LOCK, {});
      const age = Date.now() - Number(existing.ts || 0);
      if (age < LOCK_TTL_MS) {
        return { ok: false, reason: "launch-already-in-progress", ageMs: age, existing };
      }
      unlinkSync(AUTOSTART_LOCK);
    }

    writeJson(AUTOSTART_LOCK, { ts: Date.now(), pid: process.pid, ...payload });
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: "lock-failed", error: String(error?.message || error) };
  }
}

function recentAutostart() {
  const state = readJson(AUTOSTART_STATE, null);
  if (!state?.timestamp) return null;
  if (state.status === "dry-run") return null;
  const age = Date.now() - new Date(state.timestamp).getTime();
  if (!Number.isFinite(age) || age > COOLDOWN_MS) return null;
  return { ...state, ageMs: age };
}

function launchLocalCompute({ prompt, categories, hits, services, missing }) {
  if (!AUTO_START_ENABLED) {
    return { status: "disabled", reason: "PRISM_LOCAL_COMPUTE_AUTOSTART=0" };
  }
  if (!existsSync(LAUNCHER)) {
    return { status: "unavailable", reason: "launcher-missing", launcher: LAUNCHER };
  }

  const recent = recentAutostart();
  if (recent) {
    return { status: "cooldown", reason: "recent-autostart", recent };
  }

  const args = [
    LAUNCHER,
    `--services=${services.join(",")}`,
    `--timeout=${LAUNCH_TIMEOUT_MS}`,
  ];
  if (!PULL_MODE) args.push("--skip-pull");

  const lock = acquireLaunchLock({ categories, services, missing });
  if (!lock.ok) {
    return { status: "locked", ...lock };
  }

  const state = {
    timestamp: new Date().toISOString(),
    status: DRY_RUN ? "dry-run" : "launching",
    source: "local-compute-intent",
    categories,
    services,
    missing,
    command: `${process.execPath} ${args.join(" ")}`,
    promptSample: prompt.slice(0, 160),
  };

  if (DRY_RUN) {
    writeJson(AUTOSTART_STATE, state);
    return { status: "dry-run", args, stateFile: AUTOSTART_STATE };
  }

  try {
    const child = spawn(process.execPath, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      env: {
        ...process.env,
        PRISM_LOCAL_COMPUTE_AUTOSTART_SOURCE: "local-compute-intent",
      },
    });
    child.unref();
    writeJson(AUTOSTART_STATE, { ...state, pid: child.pid });
    return { status: "launching", pid: child.pid, args, stateFile: AUTOSTART_STATE };
  } catch (error) {
    writeJson(AUTOSTART_STATE, { ...state, status: "spawn-failed", error: String(error?.message || error) });
    return { status: "spawn-failed", error: String(error?.message || error) };
  }
}

function writeIntentCache({ categories, hits, services, missing, stackRunning }) {
  writeJson(INTENT_CACHE, {
    timestamp: new Date().toISOString(),
    categories,
    hits,
    services,
    missing,
    stackRunning,
  });
}

async function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    const to = setTimeout(() => resolve(buf), 300);
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (d) => { buf += d; });
    process.stdin.on("end", () => { clearTimeout(to); resolve(buf); });
    process.stdin.on("error", () => { clearTimeout(to); resolve(buf); });
  });
}

async function main() {
  let input = null;
  try {
    const raw = await readStdin();
    if (raw.trim()) input = JSON.parse(raw);
  } catch { /* ignore */ }

  const prompt = input?.prompt ?? input?.user_prompt ?? "";
  if (!prompt || prompt.length < 3) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  if (hasOptOut(prompt)) {
    process.stdout.write(JSON.stringify({
      _meta: { hook: "local-compute-intent", skipped: "prompt-opt-out" },
    }));
    return;
  }

  const hits = matchTriggers(prompt);
  const categories = Object.keys(hits);
  if (categories.length === 0) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // Only inject if the relevant infra is NOT already running — otherwise the
  // suggestion is noise.
  const dock = dockerReady();
  const services = servicesForPrompt(prompt, hits);
  const composeReady = dock ? composeServicesReady(services) : false;
  const oll = dock && needsOllama(hits) ? ollamaReady() : true;

  const missing = [];
  if (!dock) missing.push("docker");
  if (dock && services.length && !composeReady) missing.push("compose services");
  if (needsOllama(hits) && !oll) missing.push("ollama");

  if (missing.length === 0) {
    writeIntentCache({ categories, hits, services, missing, stackRunning: true });
    process.stdout.write(JSON.stringify({
      _meta: { hook: "local-compute-intent", triggered: categories, stackRunning: true },
    }));
    return;
  }

  writeIntentCache({ categories, hits, services, missing, stackRunning: false });

  const catSummary = categories.map((c) => `${c}:${hits[c]}`).join(", ");
  const autostartAllowed = shouldAutostart(prompt, hits);
  const launch = autostartAllowed
    ? launchLocalCompute({ prompt, categories, hits, services, missing })
    : { status: "suggestion-only", reason: "prompt looks like configuration or discussion, not runtime local-compute work" };

  // SILENT MODE (LOCAL-LLM-MS0): Only inject context if stack is DOWN AND intent is strong
  // Weak intent (just infra_services) = log silently, don't pollute context
  if (SILENT_MODE && !hasStrongIntent(categories)) {
    logSilent({
      action: "silent-skip",
      categories,
      missing,
      reason: "weak-intent-silent-mode",
      launch: launch.status
    });
    process.stdout.write(JSON.stringify({
      continue: true,
      _meta: { hook: "local-compute-intent", triggered: categories, missing, silentSkip: true },
    }));
    return;
  }

  const actionLine = launch.status === "launching"
    ? `Auto-started PRISM local compute in the background (pid ${launch.pid}).`
    : launch.status === "dry-run"
      ? `Dry run: would launch PRISM local compute now.`
      : `Auto-start did not run (${launch.status}${launch.reason ? `: ${launch.reason}` : ""}).`;

  const suggestion = [
    `### Local Compute Autostart`,
    ``,
    `Your prompt matched intent (${catSummary}) that benefits from the PRISM local stack.`,
    `Missing: ${missing.join(" + ")}.`,
    `Services: ${services.join(", ") || "docker-daemon-only"}.`,
    ``,
    actionLine,
    ``,
    `Launcher: \`node H:/prism/mcp-server/scripts/ollama-docker-launcher.mjs --services=${services.join(",")}${PULL_MODE ? "" : " --skip-pull"}\``,
    `Runtime report: \`H:/prism/state/shared/DOCKER_RUNTIME_STATE.json\``,
    ``,
    `Skip autostart with \`[no-local]\`, \`[no-docker]\`, or \`PRISM_LOCAL_COMPUTE_AUTOSTART=0\`.`,
  ].join("\n");

  // Log that we're injecting context (strong intent)
  logSilent({ action: "inject-context", categories, missing, launch: launch.status });

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: suggestion },
    additionalContext: suggestion,
    _meta: { hook: "local-compute-intent", triggered: categories, missing, services, launch },
  }));
}

main().catch(() => process.stdout.write(JSON.stringify({ continue: true })));
