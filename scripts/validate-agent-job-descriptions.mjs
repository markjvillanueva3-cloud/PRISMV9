/**
 * validate-agent-job-descriptions.mjs — OBSIDIAN-INTELLIGENCE-MS3 / G1
 *
 * Parses state/shared/AGENT_JOB_DESCRIPTIONS.md and validates that every
 * documented agent has all 5 required fields (`role`, `scope`, `inputs`,
 * `outputs`, `refusal_cases`). Designed to be CI-runnable — exits non-zero
 * if any entry is malformed, missing a field, or has an empty list field.
 *
 * Exits:
 *   0 on success (all agents valid + count printed).
 *   1 on validation failure (with per-agent error report on stderr).
 *   2 on usage error (missing file, can't parse markdown).
 *
 * Usage:
 *   node scripts/validate-agent-job-descriptions.mjs
 *   node scripts/validate-agent-job-descriptions.mjs --file <path>
 *   node scripts/validate-agent-job-descriptions.mjs --json   # machine-readable
 */
import { readFileSync, existsSync } from "node:fs";
import * as path from "node:path";

const DEFAULT_DOC = "H:/prism/state/shared/AGENT_JOB_DESCRIPTIONS.md";
const REQUIRED_FIELDS = ["role", "scope", "inputs", "outputs", "refusal_cases"];

// ── parsing ─────────────────────────────────────────────────────────────────

/**
 * Parse the markdown into a map of agent-name → field-map.
 * Each agent section starts with a `### \`<name>\`` heading and contains
 * `- **field**:` bullets (optionally followed by indented `- item` lines for
 * list-valued fields).
 *
 * Returns: { [agentName]: { role: string, scope: string[], inputs: string[], outputs: string[], refusal_cases: string[] } }
 */
export function parseAgentDocs(markdown) {
  if (typeof markdown !== "string" || markdown.length === 0) return {};
  const agents = {};
  const lines = markdown.split(/\r?\n/);

  let currentAgent = null;
  let currentField = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Agent heading: ### `<name>`
    const headingMatch = line.match(/^###\s+`([^`]+)`\s*$/);
    if (headingMatch) {
      currentAgent = headingMatch[1];
      currentField = null;
      agents[currentAgent] = {};
      continue;
    }

    if (!currentAgent) continue;

    // Field bullet: - **field**: optional inline value OR sub-list follows.
    // Allow `-` in field names so the hyphen-form alias `refusal-cases` is recognized.
    const fieldMatch = line.match(/^-\s+\*\*([a-z_-]+)\*\*:\s*(.*)$/);
    if (fieldMatch) {
      const fieldName = fieldMatch[1];
      const inlineValue = fieldMatch[2].trim();
      // refusal_cases is the canonical key, but accept "refusal-cases" if a doc
      // writer slipped the hyphen form in.
      const canonical = fieldName === "refusal-cases" ? "refusal_cases" : fieldName;
      if (inlineValue.length > 0) {
        // Inline single-value field (e.g. role)
        agents[currentAgent][canonical] = inlineValue;
        currentField = null;
      } else {
        // List-valued field — sub-bullets follow
        agents[currentAgent][canonical] = [];
        currentField = canonical;
      }
      continue;
    }

    // List item under a field: optional 2+ space indent then `- item`
    const itemMatch = line.match(/^\s{2,}-\s+(.+)$/);
    if (currentField && itemMatch) {
      const v = agents[currentAgent][currentField];
      if (Array.isArray(v)) v.push(itemMatch[1].trim());
      continue;
    }

    // Section break — stop accumulating into a field
    if (line.startsWith("---") || line.startsWith("##")) {
      currentField = null;
    }
  }

  return agents;
}

// ── validation ──────────────────────────────────────────────────────────────

/**
 * Validate a parsed agents map. Returns { ok, agents, errors }.
 */
export function validateAgents(agents) {
  const errors = [];
  const names = Object.keys(agents);
  if (names.length === 0) {
    errors.push({ agent: null, field: null, message: "No agents found in document" });
    return { ok: false, agents: 0, errors };
  }
  for (const name of names) {
    const entry = agents[name];
    for (const field of REQUIRED_FIELDS) {
      if (!(field in entry)) {
        errors.push({ agent: name, field, message: `missing required field '${field}'` });
        continue;
      }
      const v = entry[field];
      if (field === "role") {
        if (typeof v !== "string" || v.length === 0) {
          errors.push({ agent: name, field, message: `'${field}' must be a non-empty string` });
        } else if (v.length > 500) {
          errors.push({ agent: name, field, message: `'${field}' is suspiciously long (${v.length} chars) — keep to one sentence` });
        }
      } else {
        // scope, inputs, outputs, refusal_cases must be non-empty arrays
        if (!Array.isArray(v)) {
          errors.push({ agent: name, field, message: `'${field}' must be a list of items` });
        } else if (v.length === 0) {
          errors.push({ agent: name, field, message: `'${field}' list is empty — every agent must have at least one ${field}` });
        }
      }
    }
  }
  return { ok: errors.length === 0, agents: names.length, errors };
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { file: DEFAULT_DOC, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file") args.file = argv[++i];
    else if (a === "--json") args.json = true;
    else if (a === "-h" || a === "--help") args.help = true;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write("validate-agent-job-descriptions.mjs [--file <path>] [--json]\n");
    process.exit(0);
  }
  if (!existsSync(args.file)) {
    process.stderr.write(`validate-agent-job-descriptions: file not found: ${args.file}\n`);
    process.exit(2);
  }
  let markdown;
  try {
    markdown = readFileSync(args.file, "utf8");
  } catch (e) {
    process.stderr.write(`validate-agent-job-descriptions: read failed: ${e.message}\n`);
    process.exit(2);
  }
  const agents = parseAgentDocs(markdown);
  const result = validateAgents(agents);
  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    if (result.ok) {
      process.stdout.write(`OK — ${result.agents} agents validated in ${path.basename(args.file)}\n`);
    } else {
      process.stderr.write(`FAIL — ${result.errors.length} error(s) across ${result.agents} agent(s)\n`);
      for (const e of result.errors) {
        process.stderr.write(`  - ${e.agent ?? "(file)"} → ${e.field ?? "(file)"}: ${e.message}\n`);
      }
    }
  }
  process.exit(result.ok ? 0 : 1);
}

const isCli = typeof process !== "undefined" && process.argv?.[1] && /validate-agent-job-descriptions\.mjs$/i.test(process.argv[1].replace(/\\/g, "/").toLowerCase());
if (isCli) main();
