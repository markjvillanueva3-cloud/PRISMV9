#!/usr/bin/env tsx
/**
 * smoke-gemini-3-pro.mts — verify Gemini 3 Pro is reachable via REST API
 * AND/OR via the local Gemini CLI (OAuth / Google One AI Premium subscription).
 *
 * Reports:
 *   - REST path: GEMINI_API_KEY → /v1beta/models/gemini-3-pro-preview
 *     - 200 = paid API tier active
 *     - 429 limit:0 = free tier, billing not enabled
 *     - other = unexpected error
 *   - CLI path: gemini.cmd -m gemini-3-pro-preview -p "..."
 *     - clean output = OAuth working, account verified, subscription active
 *     - HTTP 403 'Verify your account' = run GEMINI-3-PRO-VERIFICATION.md
 *     - exit 1 with no validationLink = CLI binary missing or auth missing
 *
 * Used after running the GEMINI-3-PRO-VERIFICATION.md procedure to confirm
 * verification took. INTEL-OLLAMA-OBSIDIAN-MS0 / U-GEMINI-3-PRO-WIRE.
 */

import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "";
const GEMINI_CLI_CANDIDATES = [
  "H:/Tools/nodejs/gemini.cmd",
  "H:/Tools/nodejs/gemini",
  `${process.env.APPDATA ?? ""}\\npm\\gemini.cmd`,
  "gemini",
];
const PROBE_PROMPT = "Reply with just the four-digit integer 1800. Nothing else.";
const PROBE_MODEL = process.env.PRISM_GEMINI_MODEL ?? "gemini-3-pro-preview";

interface PathResult {
  ok: boolean;
  reachable: boolean;
  answer: string;
  errorClass: "ok" | "verify_account" | "limit_0" | "no_quota" | "auth_missing" | "cli_missing" | "unknown";
  rawError: string;
  latencyMs: number;
}

async function probeRest(): Promise<PathResult> {
  const start = Date.now();
  if (!GEMINI_API_KEY) {
    return { ok: false, reachable: false, answer: "", errorClass: "auth_missing", rawError: "GEMINI_API_KEY not set", latencyMs: Date.now() - start };
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${PROBE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: PROBE_PROMPT }] }],
    generationConfig: { maxOutputTokens: 50, temperature: 0 },
  };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30_000);
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const text = await r.text();
    if (r.ok) {
      const j = JSON.parse(text);
      const answer = (j.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
      return { ok: true, reachable: true, answer, errorClass: "ok", rawError: "", latencyMs: Date.now() - start };
    }
    if (r.status === 429 && /limit: 0/.test(text)) {
      return { ok: false, reachable: false, answer: "", errorClass: "limit_0", rawError: text.slice(0, 300), latencyMs: Date.now() - start };
    }
    return { ok: false, reachable: false, answer: "", errorClass: "unknown", rawError: `HTTP ${r.status}: ${text.slice(0, 300)}`, latencyMs: Date.now() - start };
  } catch (e) {
    return { ok: false, reachable: false, answer: "", errorClass: "unknown", rawError: String((e as Error).message ?? e), latencyMs: Date.now() - start };
  }
}

function findCli(): string | null {
  for (const c of GEMINI_CLI_CANDIDATES) {
    if (c === "gemini") continue;
    if (existsSync(c)) return c;
  }
  return null;
}

async function probeCli(): Promise<PathResult & { validationLink: string | null }> {
  const start = Date.now();
  const bin = findCli();
  if (!bin) {
    return { ok: false, reachable: false, answer: "", errorClass: "cli_missing", rawError: "no gemini.cmd found", latencyMs: Date.now() - start, validationLink: null };
  }
  return await new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    // On Windows, spawn(.cmd, [args]) with shell:true mangles arg quoting via
    // cmd.exe's parser. Use explicit `cmd.exe /c <bin> ...` so Node passes
    // argv as-is and cmd.exe only handles the .cmd dispatch.
    const isWindows = process.platform === "win32";
    const cmdExe = `${process.env.SystemRoot ?? "C:\\Windows"}\\System32\\cmd.exe`;
    const exe = isWindows ? cmdExe : bin;
    const args = isWindows
      ? ["/c", bin, "--skip-trust", "-m", PROBE_MODEL, "-p", PROBE_PROMPT]
      : ["--skip-trust", "-m", PROBE_MODEL, "-p", PROBE_PROMPT];
    const child = spawn(exe, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: false,
    });
    const timer = setTimeout(() => { try { child.kill(); } catch { /* ignore */ } }, 60_000);
    child.stdout.on("data", (c) => { stdout += c.toString("utf-8"); });
    child.stderr.on("data", (c) => { stderr += c.toString("utf-8"); });
    child.on("close", () => {
      clearTimeout(timer);
      const merged = `${stdout}\n${stderr}`;
      const linkMatch = merged.match(/validationLink:\s*['"]([^'"]+)['"]/);
      const link = linkMatch ? linkMatch[1] : null;

      if (/Verify your account to continue/i.test(merged)) {
        resolve({ ok: false, reachable: false, answer: "", errorClass: "verify_account", rawError: "Google account requires verification", latencyMs: Date.now() - start, validationLink: link });
        return;
      }
      const cleanAnswer = stdout.trim().split("\n").filter((l) => !l.startsWith("'chcp'") && !l.startsWith("Warning:") && !l.startsWith("Ripgrep")).join("\n").trim();
      if (cleanAnswer.length > 0 && !cleanAnswer.match(/error|exception/i)) {
        resolve({ ok: true, reachable: true, answer: cleanAnswer, errorClass: "ok", rawError: "", latencyMs: Date.now() - start, validationLink: null });
        return;
      }
      resolve({ ok: false, reachable: false, answer: "", errorClass: "unknown", rawError: merged.slice(-500), latencyMs: Date.now() - start, validationLink: link });
    });
  });
}

async function main() {
  process.stdout.write(`\n🔍 gemini-3-pro smoke test (model: ${PROBE_MODEL})\n\n`);
  const [rest, cli] = await Promise.all([probeRest(), probeCli()]);

  process.stdout.write("REST API path (GEMINI_API_KEY direct):\n");
  process.stdout.write(`  ok:          ${rest.ok}\n`);
  process.stdout.write(`  errorClass:  ${rest.errorClass}\n`);
  if (rest.answer) process.stdout.write(`  answer:      ${rest.answer.slice(0, 80)}\n`);
  if (!rest.ok) process.stdout.write(`  detail:      ${rest.rawError.slice(0, 200)}\n`);
  process.stdout.write(`  latencyMs:   ${rest.latencyMs}\n\n`);

  process.stdout.write("CLI / OAuth path (Google One AI Premium):\n");
  process.stdout.write(`  ok:          ${cli.ok}\n`);
  process.stdout.write(`  errorClass:  ${cli.errorClass}\n`);
  if (cli.answer) process.stdout.write(`  answer:      ${cli.answer.slice(0, 80)}\n`);
  if (cli.validationLink) process.stdout.write(`  validationLink:\n    ${cli.validationLink}\n`);
  if (!cli.ok && !cli.validationLink) process.stdout.write(`  detail:      ${cli.rawError.slice(0, 200)}\n`);
  process.stdout.write(`  latencyMs:   ${cli.latencyMs}\n\n`);

  if (rest.ok || cli.ok) {
    process.stdout.write(`✅ Gemini 3 Pro is REACHABLE via ${rest.ok && cli.ok ? "BOTH paths" : rest.ok ? "REST" : "CLI"}\n`);
    process.exit(0);
  }

  process.stdout.write(`❌ Gemini 3 Pro NOT reachable. Next steps:\n`);
  if (rest.errorClass === "limit_0") {
    process.stdout.write(`  - REST quota is limit:0 — enable billing at https://aistudio.google.com/billing\n`);
  }
  if (cli.errorClass === "verify_account") {
    process.stdout.write(`  - CLI requires account verification — open the validationLink above in your browser\n`);
    process.stdout.write(`    See: H:/prism-iooms0/state/shared/GEMINI-3-PRO-VERIFICATION.md\n`);
  }
  if (cli.errorClass === "cli_missing") {
    process.stdout.write(`  - Gemini CLI not found — install with: npm i -g @google/gemini-cli\n`);
  }
  process.exit(1);
}

main().catch((e) => {
  process.stderr.write(`unhandled: ${(e as Error).message ?? e}\n`);
  process.exit(2);
});
