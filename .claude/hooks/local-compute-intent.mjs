/**
 * local-compute-intent.mjs — UserPromptSubmit hook
 *
 * Detects prompts that would benefit from the local compute stack
 * (Ollama for local LLM inference / embeddings, Docker for service
 * containers like Qdrant / postgres / prometheus). When intent is
 * detected AND the relevant service is NOT already running, injects
 * a one-line suggestion pointing at `/activate-local` or the launcher
 * script.
 *
 * Does NOT auto-start services (destructive side effects). Just
 * surfaces the option so the user can approve.
 *
 * Reads stdin: { prompt, session_id, transcript_path, ... }
 * Writes stdout: { additionalContext?: string } | {}
 */
import { promises as fs } from "node:fs";
import { execFileSync } from "node:child_process";
import process from "node:process";

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

function matchTriggers(prompt) {
  const hits = {};
  for (const [cat, regexes] of Object.entries(TRIGGERS)) {
    const matches = regexes.filter((r) => r.test(prompt));
    if (matches.length > 0) hits[cat] = matches.length;
  }
  return hits;
}

function dockerReady() {
  try {
    execFileSync("docker", ["version", "--format", "{{.Server.Version}}"],
      { encoding: "utf8", timeout: 1500, stdio: ["ignore", "pipe", "pipe"] });
    return true;
  } catch { return false; }
}

function ollamaReady() {
  try {
    execFileSync("docker", ["exec", "prism-ollama", "ollama", "--version"],
      { encoding: "utf8", timeout: 1500, stdio: ["ignore", "pipe", "pipe"] });
    return true;
  } catch { return false; }
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
    process.stdout.write("{}");
    return;
  }

  const hits = matchTriggers(prompt);
  const categories = Object.keys(hits);
  if (categories.length === 0) {
    process.stdout.write("{}");
    return;
  }

  // Only inject if the relevant infra is NOT already running — otherwise the
  // suggestion is noise.
  const dock = dockerReady();
  const oll = dock ? ollamaReady() : false;

  const needsOllama = hits.embeddings || hits.local_inference || hits.batch_jobs || hits.lora;
  const needsDockerOnly = !needsOllama && hits.infra_services;

  const missing = [];
  if (!dock) missing.push("docker");
  if (needsOllama && !oll) missing.push("ollama");

  if (missing.length === 0) {
    // Stack already up — no suggestion needed, but record the intent silently
    process.stdout.write(JSON.stringify({
      _meta: { hook: "local-compute-intent", triggered: categories, stackRunning: true },
    }));
    return;
  }

  const catSummary = categories.map((c) => `${c}:${hits[c]}`).join(", ");
  const suggestion = [
    `### Local Compute Suggestion`,
    ``,
    `Your prompt matched intent (${catSummary}) that benefits from the PRISM local stack, but ${missing.join(" + ")} ${missing.length === 1 ? "is" : "are"} not running.`,
    ``,
    `**Launch it** (non-destructive, idempotent):`,
    `  \`/activate-local\`  → starts Docker Desktop + compose stack + pulls models`,
    ``,
    `Or run the script directly:`,
    `  \`node mcp-server/scripts/ollama-docker-launcher.mjs${needsDockerOnly ? " --services=postgres,prism-server,prometheus" : ""}\``,
    ``,
    `Skip this warning by prefixing your prompt with \`[no-local]\` or answering without local resources.`,
  ].join("\n");

  process.stdout.write(JSON.stringify({
    additionalContext: suggestion,
    _meta: { hook: "local-compute-intent", triggered: categories, missing, stackRunning: false },
  }));
}

main().catch(() => process.stdout.write("{}"));
