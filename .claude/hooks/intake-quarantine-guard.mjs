#!/usr/bin/env node
// tier: T0
/**
 * intake-quarantine-guard.mjs — PreToolUse T0 hook (ULTRACODE-SYNERGY-MS0 / Pattern 13)
 *
 * Closes PRISM's self-documented "ZERO PII gate on untrusted intake" gap
 * (CLAUDE.md §CLAUDE-FLOW TOOL POLICY, aidefence HARVEST item). Implements the
 * ultracode "quarantine pattern" (0xCodez step 13): untrusted public/external
 * content (email/webhook/scraped/3rd-party-API/ticket) may carry prompt
 * injection, so an agent that has ingested it must be BARRED from high-privilege
 * tool calls until that content is scanned + cleared.
 *
 * Trust boundary (orthogonal to the 3-of-3 scrutiny / comprehensive-build-enforce
 * gates — those govern the QUALITY of what the fleet WRITES; this governs whether
 * UNTRUSTED INPUT is allowed to TRIGGER a privileged action):
 *
 *   1. An intake processor (IntakeArtifactProcessorEngine / emailIntakeSingleton /
 *      IntakeWebhookEngine) marks the session quarantined by writing a marker file
 *      `state/shared/quarantine/<session>.json` { source, ts, scanned, scanVerdict }.
 *   2. While the marker exists AND scanned!==true, this hook BLOCKS high-privilege
 *      tool calls (shell exec of destructive/egress commands, credential-file reads,
 *      writes outside the sandbox). Read/Grep/Glob/safe-Bash stay allowed so the
 *      agent can still triage the content.
 *   3. The scan (aidefence_scan / has_pii / is_safe — harvested from claude-flow,
 *      or the inline injection/PII heuristics here) flips scanned=true; clean
 *      content then proceeds normally.
 *
 * Block contract (matches golf-slot-write-allowlist.mjs):
 *   - stdin: PreToolUse JSON `{session_id?, tool_name, tool_input}`
 *   - allowed: exit 0, no stdout
 *   - blocked: stdout {"continue":false,"decision":"block","reason":"..."}, exit 2
 *
 * Defense-in-depth, NOT the full reader/actor dual-agent split (deferred [SCOPED]).
 * This hook is the single-agent quarantine barrier; the dual-agent privilege
 * architecture is a follow-on unit.
 *
 * Knobs:
 *   PRISM_INTAKE_QUARANTINE_DISABLE=1   → hook is a no-op (exit 0)
 *   PRISM_INTAKE_QUARANTINE_BYPASS=1    → log bypass to stderr, exit 0 (emergency)
 *   PRISM_INTAKE_QUARANTINE_VERBOSE=1   → stderr diagnostics
 *
 * Owner: golf (fleet-hygiene/security). Co-owner for scan wiring: compliance-safety
 * galaxy (S(x) gate). Source: ultracode 0xCodez status 2062127385923776831 step 13.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";

const REPO_ROOT = "H:/prism";
const QUARANTINE_DIR = "H:/prism/state/shared/quarantine";

// ── Pure, exported core (so the verification test never needs a live tool call) ──

/** High-privilege tool calls a quarantined (un-scanned) context must NOT trigger. */
export const HIGH_PRIVILEGE = {
  // destructive / egress / credential shell patterns (case-insensitive).
  // Denylist-based egress detection is porous BY NATURE (any interpreter can open a socket);
  // this set covers the common exfil forms a prompt-injection payload would emit. The residual
  // (novel interpreters, in-sandbox-write-then-ship) is the [SCOPED] limit of single-agent
  // quarantine — the full reader/actor privilege split is the complete fix (deferred follow-on).
  bashDanger: [
    /\brm\s+-rf?\b/i,
    /\b(curl|wget|nc|ncat|telnet|ftp|scp|rsync|sftp)\b/i, // network egress tools
    /\b(Invoke-WebRequest|Invoke-RestMethod|iwr|irm|Invoke-Expression|iex)\b/i, // PS egress + IEX
    />\s*\/dev\/tcp\//i,
    // interpreter one-liners that can open a socket / fetch (node -e, python -c, perl -e, ruby -e, php -r)
    /\b(node|deno|bun|python\d?|perl|ruby|php)\b[^\n|&;]*\s-(e|c|r)\b/i,
    /\b(fetch|XMLHttpRequest|urllib|requests\.(get|post)|http\.(get|request)|net\.(connect|Socket)|socket\.socket)\b/i, // egress APIs in any -e/-c payload
    // credential reads: by extension OR by well-known cred path/dotfile (id_rsa, .aws/.ssh/.kube, .npmrc, .pgpass)
    /\b(cat|type|Get-Content|gc|cp|copy|mv|move|scp|tar|zip)\b[^\n|&;]*(\.(pem|key|env|credentials|secret|token|pfx|p12|keystore)\b|id_rsa|id_ed25519|\.ssh\/|\.aws\/|\.kube\/|\.npmrc|\.pgpass|\.netrc|\.docker\/config)/i,
    // environment-secret exfil ($X_KEY / $X_SECRET / $X_TOKEN / $X_PASSWORD / %X%) piped or written out
    /\$\{?\w*(SECRET|_KEY|APIKEY|API_KEY|TOKEN|PASSWORD|PASSWD|CREDENTIAL)\w*\}?/i,
    /%\w*(SECRET|_KEY|TOKEN|PASSWORD|CREDENTIAL)\w*%/i, // PS/cmd env-secret
    /\b(git\s+push|git\s+remote\s+add)\b/i, // exfil via git
    /\bbase64\b[^\n|&;]*\|\s*(curl|wget|nc|node|python)/i, // encode+exfil
    /\bssh\b[^\n]*<\s*/i, // ssh host < file (stdin exfil)
  ],
  // tools that egress or mutate beyond the sandbox
  egressTools: new Set(["WebFetch", "WebSearch"]),
  writeTools: new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]),
};

/** Prompt-injection phrases commonly embedded in untrusted content. */
export const INJECTION_PATTERNS = [
  /ignore (all |the )?(previous|prior|above) instructions/i,
  /disregard (your|the) (system )?(prompt|instructions)/i,
  /you are now (a |an )?[a-z]/i,
  /\bnew (system )?(prompt|instructions?)\s*:/i,
  /print (your|the) (system prompt|instructions|secrets?|api[_ ]?key)/i,
  /exfiltrat|send (the|all|your) (data|secrets?|credentials?|keys?) to/i,
  /<\s*\/?\s*(system|assistant|tool_call)\s*>/i, // role-tag injection
];

/** PII patterns (minimal harvest of aidefence has_pii semantics). */
export const PII_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/, // US SSN
  /\b(?:\d[ -]*?){13,16}\b/, // credit-card-ish (loose; scan stage refines)
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // email
  /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/, // US phone
];

/** Scan untrusted content for injection + PII. Returns {safe, injection, pii, hits}. */
export function scanContent(text) {
  const s = typeof text === "string" ? text : JSON.stringify(text ?? "");
  const injection = INJECTION_PATTERNS.filter((re) => re.test(s)).map((re) => re.source);
  const pii = PII_PATTERNS.filter((re) => re.test(s)).map((re) => re.source);
  return { safe: injection.length === 0 && pii.length === 0, injection, pii, hits: injection.length + pii.length };
}

/** Is this tool call high-privilege (must be barred under active quarantine)? */
export function isHighPrivilege(toolName, toolInput) {
  if (HIGH_PRIVILEGE.egressTools.has(toolName)) return { hp: true, why: `egress tool ${toolName}` };
  if (toolName === "Bash" || toolName === "PowerShell") {
    const cmd = String(toolInput?.command ?? "");
    for (const re of HIGH_PRIVILEGE.bashDanger) {
      if (re.test(cmd)) return { hp: true, why: `dangerous shell pattern ${re.source}` };
    }
    return { hp: false, why: "safe shell" };
  }
  if (HIGH_PRIVILEGE.writeTools.has(toolName)) {
    // a write OUTSIDE the repo sandbox is high-privilege
    const fp = toolInput?.file_path ?? toolInput?.notebook_path;
    if (fp) {
      const rel = relative(REPO_ROOT, resolve(String(fp)));
      if (rel.startsWith("..") || isAbsolute(rel)) return { hp: true, why: `write outside sandbox: ${fp}` };
    }
    return { hp: false, why: "in-sandbox write" };
  }
  return { hp: false, why: "low-privilege tool" };
}

/**
 * Core decision. Pure — takes the parsed event + the (already-read) marker object.
 * @param {{tool_name:string, tool_input:object}} event
 * @param {null|{source?:string, scanned?:boolean, scanVerdict?:object}} marker
 * @returns {{block:boolean, reason?:string}}
 */
export function decide(event, marker) {
  if (!marker) return { block: false }; // no active quarantine → nothing to gate
  if (marker.scanned === true && marker.scanVerdict?.safe === true) return { block: false }; // cleared
  const { hp, why } = isHighPrivilege(event.tool_name, event.tool_input || {});
  if (!hp) return { block: false }; // triage tools (Read/Grep/safe Bash) stay allowed under quarantine
  const src = marker.source ? ` (untrusted source: ${marker.source})` : "";
  const scanState = marker.scanned === true ? "scan ran but flagged unsafe" : "content NOT yet scanned";
  return {
    block: true,
    reason:
      `QUARANTINE: this session ingested untrusted intake content${src} and it is ${scanState}. ` +
      `High-privilege action blocked — ${why}. ` +
      `Triage with Read/Grep/Glob first; clear the marker only after aidefence_scan/has_pii/is_safe passes ` +
      `(state/shared/quarantine/<session>.json → scanned:true, scanVerdict.safe:true). ` +
      `Quarantine pattern (ultracode 0xCodez §13): untrusted input must not trigger privileged tools.`,
  };
}

// ── I/O shell (only runs when invoked as a hook, not when imported by the test) ──

function readMarker(sessionId) {
  if (!sessionId) return null;
  const p = `${QUARANTINE_DIR}/${sessionId}.json`;
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    // R12 fail-loud-ish but fail-CLOSED for a security gate: a corrupt marker = treat as
    // active-unscanned quarantine (safer to over-block than under-block on untrusted intake).
    return { source: "corrupt-marker", scanned: false };
  }
}

function main() {
  if (process.env.PRISM_INTAKE_QUARANTINE_DISABLE === "1") process.exit(0);

  let raw = "";
  try {
    raw = readFileSync(0, "utf8");
  } catch {
    process.exit(0); // no stdin → nothing to gate
  }
  let event;
  try {
    event = JSON.parse(raw || "{}");
  } catch {
    process.exit(0);
  }

  if (process.env.PRISM_INTAKE_QUARANTINE_BYPASS === "1") {
    process.stderr.write(`[intake-quarantine] BYPASS active — ${event.tool_name} allowed without scan\n`);
    process.exit(0);
  }

  const marker = readMarker(event.session_id);
  const verdict = decide(event, marker);

  if (process.env.PRISM_INTAKE_QUARANTINE_VERBOSE === "1") {
    process.stderr.write(`[intake-quarantine] tool=${event.tool_name} marker=${marker ? "active" : "none"} block=${verdict.block}\n`);
  }

  if (verdict.block) {
    process.stdout.write(JSON.stringify({ continue: false, decision: "block", reason: verdict.reason }));
    process.exit(2);
  }
  process.exit(0);
}

// Only run main() when executed directly — keep imports (the test) side-effect-free.
import { fileURLToPath } from "node:url";
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main();
}
