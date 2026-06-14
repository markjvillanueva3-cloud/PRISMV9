#!/usr/bin/env node
// hermes-skill-gepa.mjs -- GEPA-lite: offline skill optimization from Hermes execution traces.
// Closes the P1 gap from ZULU-HERMES-ARTICLE-VERIFY-2026-06-09.md: local models fail unattended
// tool-chains; the articles' remedy is offline, trace-driven skill rewriting (GEPA pattern).
//
// Pipeline: Hermes cron traces (cron/output/<job>/*.md, Response/Error tails) + jobs.json
// outcomes + the LIVE skill text -> Ollama critique + revised-skill candidate -> STAGED to
// state/shared/specs/SKILL-CANDIDATE-GEPA-*.md (NEEDS-REVIEW, operator-gated) + verdict ledger.
//
// NEVER touches the live skill. Mirrors skill-loop-run.mjs conventions:
//   - DEFAULT IS DRY-RUN (prints critique, no writes). --apply writes the staged candidate.
//   - Existing candidate files are NEVER overwritten (idempotent per day).
//   - Every --apply ship appends to state/shared/skill-loop-verdicts.jsonl for audit.
//
// Usage:
//   node scripts/hermes-skill-gepa.mjs                       # dry-run, all jobs, default skill
//   node scripts/hermes-skill-gepa.mjs --apply               # write staged candidate
//   node scripts/hermes-skill-gepa.mjs --job 61374a47c8bd    # restrict trace source
//   node scripts/hermes-skill-gepa.mjs --skill prism-vault-loop --model qwen2.5-coder:32b

import fs from "node:fs";
import path from "node:path";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const HERMES_HOME = process.env.HERMES_HOME || "C:/Users/wompu/AppData/Local/hermes";
const OLLAMA = process.env.OLLAMA_HOST_URL || "http://127.0.0.1:11434";
const SPECS_DIR = path.join(PRISM_ROOT, "state/shared/specs");
const VERDICTS_LOG = path.join(PRISM_ROOT, "state/shared/skill-loop-verdicts.jsonl");

const MAX_TRACES_PER_JOB = 8;
const MAX_TAIL_CHARS = 1200;   // per-trace outcome text cap
const MAX_SKILL_CHARS = 9000;  // skill text cap fed to the model
const OLLAMA_TIMEOUT_MS = 300_000;

// --- trace parsing (exported for tests) ------------------------------------
// A Hermes cron trace is: header lines, "## Prompt" (huge, repeated every run),
// then exactly one of "## Response" (model final text) or "## Error" (exception).
// A file with neither = run killed mid-flight; that is itself a signal.
export function parseTrace(content) {
  const out = { runTime: null, kind: "none", text: "" };
  if (!content || typeof content !== "string") return out;
  const rt = content.match(/^\*\*Run Time:\*\*\s*(.+)$/m);
  if (rt) out.runTime = rt[1].trim();
  // Last occurrence wins (the Prompt section can quote literal "## Response" examples).
  const respIdx = content.lastIndexOf("\n## Response");
  const errIdx = content.lastIndexOf("\n## Error");
  const idx = Math.max(respIdx, errIdx);
  if (idx === -1) return out;
  out.kind = idx === errIdx && errIdx > respIdx ? "error" : "response";
  out.text = content
    .slice(idx)
    .replace(/^\n## (Response|Error)\s*/i, "")
    .trim()
    .slice(0, MAX_TAIL_CHARS);
  return out;
}

// --- inputs -----------------------------------------------------------------
function readJobs(jobFilter) {
  const p = path.join(HERMES_HOME, "cron/jobs.json");
  const data = JSON.parse(fs.readFileSync(p, "utf8")); // missing/corrupt -> throw loud
  const jobs = (data.jobs || []).filter((j) => !jobFilter || j.id === jobFilter);
  return jobs.map((j) => ({
    id: j.id,
    name: j.name,
    skill: j.skill || (Array.isArray(j.skills) ? j.skills[0] : null),
    model: j.model,
    last_status: j.last_status,
    last_error: j.last_error ? String(j.last_error).slice(0, 400) : null,
  }));
}

function readTraces(jobId) {
  const dir = path.join(HERMES_HOME, "cron/output", jobId);
  let files;
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
  } catch {
    return []; // job has never produced output -- not an error
  }
  return files.slice(-MAX_TRACES_PER_JOB).map((f) => {
    let parsed = { runTime: null, kind: "unreadable", text: "" };
    try {
      parsed = parseTrace(fs.readFileSync(path.join(dir, f), "utf8"));
    } catch { /* keep unreadable marker */ }
    return { file: f, ...parsed };
  });
}

function readSkill(skillName) {
  const p = path.join(HERMES_HOME, "skills/prism", skillName, "SKILL.md");
  const text = fs.readFileSync(p, "utf8"); // missing skill -> throw loud
  return { path: p, text: text.slice(0, MAX_SKILL_CHARS), truncated: text.length > MAX_SKILL_CHARS };
}

// --- optimization call -------------------------------------------------------
function buildPrompt(skill, jobs, tracesByJob) {
  const lines = [];
  lines.push("You are an offline skill optimizer (GEPA pattern) for an autonomous agent named ZULU.");
  lines.push("Below: (1) the LIVE skill text the agent loads on every scheduled run, (2) real execution");
  lines.push("traces with outcomes. Unattended runs MUST act without asking; failures below are real.");
  lines.push("");
  lines.push("Produce EXACTLY three sections, markdown:");
  lines.push("## FAILURE PATTERNS -- numbered, each tied to specific trace evidence");
  lines.push("## CRITIQUE -- which skill passages allowed each failure (quote the passage)");
  lines.push("## REVISED SKILL -- the COMPLETE revised SKILL.md text in a single fenced code block.");
  lines.push("Keep the revision MINIMAL-DIFF: change only what prevents the observed failures.");
  lines.push("Do not invent tool names not present in the original skill.");
  lines.push("");
  lines.push("=== LIVE SKILL ===");
  lines.push(skill.text);
  if (skill.truncated) lines.push("[...skill truncated for length...]");
  lines.push("");
  lines.push("=== EXECUTION TRACES ===");
  for (const job of jobs) {
    lines.push(`-- job ${job.id} "${job.name}" (skill: ${job.skill}, model: ${job.model})`);
    if (job.last_error) lines.push(`   jobs.json last_error: ${job.last_error}`);
    const traces = tracesByJob[job.id] || [];
    if (!traces.length) lines.push("   (no run traces yet)");
    for (const t of traces) {
      lines.push(`   [${t.file}] outcome=${t.kind}${t.runTime ? ` at ${t.runTime}` : ""}`);
      if (t.text) lines.push(`   >>> ${t.text.replace(/\n/g, "\n   >>> ")}`);
    }
  }
  return lines.join("\n");
}

async function ollamaChat(model, prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
  try {
    const res = await fetch(`${OLLAMA}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        options: { temperature: 0.2 },
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`ollama HTTP ${res.status}`);
    const data = await res.json();
    const text = data?.message?.content || "";
    if (!text.trim()) throw new Error("ollama returned empty content");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

// --- main --------------------------------------------------------------------
function parseArgs(argv) {
  const out = { apply: false, job: null, skill: "prism-vault-loop", model: "qwen2.5-coder:32b" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--job" && argv[i + 1]) out.job = argv[++i];
    else if (a === "--skill" && argv[i + 1]) out.skill = argv[++i];
    else if (a === "--model" && argv[i + 1]) out.model = argv[++i];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const jobs = readJobs(args.job).filter((j) => j.skill === args.skill);
  if (!jobs.length) {
    console.log(`No Hermes cron jobs found for skill "${args.skill}"${args.job ? ` (job ${args.job})` : ""}.`);
    return;
  }
  const tracesByJob = {};
  let traceCount = 0;
  for (const j of jobs) {
    tracesByJob[j.id] = readTraces(j.id);
    traceCount += tracesByJob[j.id].length;
  }
  if (traceCount === 0 && !jobs.some((j) => j.last_error)) {
    console.log("No execution traces and no recorded errors -- nothing to optimize from yet.");
    return;
  }

  const skill = readSkill(args.skill);
  const prompt = buildPrompt(skill, jobs, tracesByJob);
  console.log(`[gepa] skill=${args.skill} jobs=${jobs.length} traces=${traceCount} model=${args.model} promptChars=${prompt.length}`);

  let critique;
  try {
    critique = await ollamaChat(args.model, prompt);
  } catch (e) {
    console.log(`[gepa] ${args.model} failed (${e.message}); falling back to gpt-oss:20b`);
    critique = await ollamaChat("gpt-oss:20b", prompt); // second failure throws loud
  }

  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const outPath = path.join(SPECS_DIR, `SKILL-CANDIDATE-GEPA-${day}-${args.skill}.md`);
  const header = [
    "---",
    "status: NEEDS-REVIEW",
    "kind: gepa-skill-revision",
    `skill: ${args.skill}`,
    `live_skill_path: ${skill.path}`,
    `trace_jobs: [${jobs.map((j) => j.id).join(", ")}]`,
    `traces_used: ${traceCount}`,
    `model: ${args.model}`,
    `generated: ${new Date().toISOString()}`,
    "generated_by: scripts/hermes-skill-gepa.mjs (zulu)",
    "review_rule: operator (or dispatched reviewer-subagent) must approve before ANY edit to the live skill",
    "---",
    "",
  ].join("\n");

  if (!args.apply) {
    console.log("\n===== DRY-RUN (no files written; --apply to stage) =====\n");
    console.log(critique.slice(0, 4000));
    if (critique.length > 4000) console.log(`\n[...${critique.length - 4000} more chars suppressed in dry-run...]`);
    return;
  }

  if (fs.existsSync(outPath)) {
    console.log(`[gepa] candidate already exists, NOT overwriting: ${outPath}`);
    return;
  }
  fs.mkdirSync(SPECS_DIR, { recursive: true });
  fs.writeFileSync(outPath, header + critique, "utf8");
  fs.appendFileSync(
    VERDICTS_LOG,
    JSON.stringify({
      ts: new Date().toISOString(),
      kind: "gepa-revision",
      skill: args.skill,
      job_ids: jobs.map((j) => j.id),
      traces: traceCount,
      model: args.model,
      out: outPath,
      verdict: "NEEDS-REVIEW",
    }) + "\n",
    "utf8",
  );
  console.log(`[gepa] staged: ${outPath} (NEEDS-REVIEW; verdict appended to skill-loop-verdicts.jsonl)`);
}

import { pathToFileURL } from "node:url";
const isMain = (() => {
  try {
    return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch { return false; }
})();
if (isMain) {
  main().catch((e) => { console.error(`[gepa] FATAL: ${e.message}`); process.exit(1); });
}
