/**
 * HermesAutomationBridge -- PRISM -> Hermes Agent (Nous Research) automation bridge.
 *
 * Bridge A of the bidirectional Claude-Code <-> Hermes integration. Lets PRISM /
 * Claude Code drive the locally-installed Hermes CLI in a SANDBOXED, mock-by-default
 * way, mirroring the existing Fusion360AutomationBridge / cimco-sim-driver pattern.
 *
 * Why a bridge: the operator runs on a Claude subscription. Hermes' desktop login
 * dropped OAuth, so the durable way to keep heavy agentic work on the subscription
 * is to drive Hermes from Claude Code rather than the reverse. This bridge is the
 * CC -> Hermes half (Bridge B, hermes-zulu -> CC fleet, lives in scripts/fleet).
 *
 * SAFETY (mirrors the proven bridges):
 *   - MOCK-by-default. A LIVE run that spawns the Hermes CLI requires DUAL-KEY:
 *     BOTH the `noMock` flag AND env PRISM_HERMES_MOCK=0. Neither alone is enough,
 *     so a single switch can never accidentally spawn an agent (cimco dual-key).
 *   - Sandbox-gated. `process-spawn` is only granted at the `sandbox` tier
 *     (PluginSandboxPolicyEngine). The bridge evaluates its capability set at
 *     construction; live spawning is refused unless the verdict is `allowed`.
 *   - No shell strings. Live exec uses execFileSync(exe, [args]) -- array form
 *     only, zero shell-injection surface.
 *   - Fail-closed (R12). A timeout (killed child) is NEVER a success. Non-zero
 *     exit surfaces the real stdout/stderr; nothing is fabricated.
 *   - Read-only inspection actions (status/probe/auth/cron/skill) read Hermes'
 *     own files directly -- no spawn, always available, fully testable.
 *
 * Paths are resolved portably from the OS home dir (overridable via env) so this
 * is not pinned to one machine's user profile.
 *
 * @module engines/HermesAutomationBridge
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  PluginSandboxPolicyEngine,
  type SafetyTier,
  type Capability,
  type PolicyVerdict,
} from "./PluginSandboxPolicyEngine.js";

/** Bridge result envelope (matches the Fusion/WinMax AtomicValue convention). */
export interface AtomicValue<T> {
  value: T;
  confidence: number;
  source: string;
  warning?: string;
}

function atomic<T>(value: T, source: string, confidence = 1, warning?: string): AtomicValue<T> {
  return warning !== undefined ? { value, confidence, source, warning } : { value, confidence, source };
}

/**
 * A source-verified Hermes cron-routine spec. EMIT-ONLY: `routinePlan()` assembles
 * these `hermes cron create ...` command lines; PRISM NEVER auto-deploys them (the
 * operator runs each `command`, or invokes it via `hermes_run` with the dual-key).
 */
export interface HermesRoutineSpec {
  id: string;
  name: string;
  /** cron expression ("0 7 * * 1-5") or Hermes human interval ("every 4h"). */
  schedule: string;
  /** delivery target (telegram/discord/slack/sms/email/github/webhook/local). */
  deliver: string;
  /** uses the [SILENT] no-spam pattern (only notifies when something changed). */
  silent: boolean;
  /** the natural-language instruction Hermes runs each tick. */
  prompt: string;
  /** repo-root-joined PRISM script paths the routine references (verified-existing). */
  reads: string[];
  /** repo-root-joined PRISM pre-processor passed as `--script` (stdout -> context). */
  script?: string;
  /** the exact, ready-to-run `hermes cron create ...` command line. */
  command: string;
  /** why this routine matters, esp. for an away operator. */
  rationale: string;
}

/** Hermes delivery targets (README: "Telegram, Discord, Slack, SMS, email, GitHub comments, webhooks, local files"). */
const KNOWN_DELIVER = new Set(["telegram", "discord", "slack", "sms", "email", "github", "webhook", "local"]);

/**
 * PRISM manufacturing-intelligence routine catalog. `prompt` carries a literal
 * `{root}` token replaced with the resolved PRISM repo root at emit time. Cron
 * grammar (cron-create / --name / --deliver / --script / [SILENT] no-spam) is
 * verified from the open-source NousResearch/hermes-agent repo
 * (hermes-already-has-routines.md @ v2026.6.5, MIT). Prompts contain NO double
 * quotes (the command wraps schedule/prompt/name/script in double quotes); any
 * embedded shell pattern uses single quotes so it survives Hermes' shell.
 */
const ROUTINE_TEMPLATES: ReadonlyArray<{
  id: string;
  name: string;
  schedule: string;
  silent: boolean;
  prompt: string;
  reads: string[];
  scriptRel?: string;
  rationale: string;
}> = [
  {
    id: "prism-shop-brief",
    name: "PRISM shop brief",
    schedule: "0 7 * * 1-5",
    silent: false,
    prompt:
      "Run node {root}/mcp-server/scripts/generate-claude-brief.mjs to refresh the PRISM manufacturing brief, then read {root}/state/shared/CLAUDE-BRIEF.md and send the shop owner a concise plain-language morning summary: active jobs, quotes needing attention, fleet build status, and any new safety regressions. No jargon.",
    reads: ["mcp-server/scripts/generate-claude-brief.mjs"],
    rationale: "Owner gets the morning manufacturing brief on their phone while away from the shop.",
  },
  {
    id: "prism-fleet-pulse",
    name: "PRISM fleet pulse",
    schedule: "every 4h",
    silent: true,
    prompt:
      "Run node {root}/scripts/fleet-work-digest.mjs build, then report which PRISM chat slots shipped units or stalled in the last 4 hours. If nothing notable changed, reply with exactly [SILENT] and send nothing.",
    reads: ["scripts/fleet-work-digest.mjs"],
    rationale: "Keeps the owner aware of 26-slot fleet progress without spam (SILENT unless notable).",
  },
  {
    id: "prism-regression-watch",
    name: "PRISM regression watch",
    schedule: "every 2h",
    silent: true,
    prompt:
      "Run git -C {root} log --since=2.hours.ago --oneline -E --grep=regression --grep=silent --grep=R12 --grep=fail-loud --grep=corruption to list risky recent commits. If it lists any, send the owner a one-line shop-floor risk alert per commit. If the output is empty, reply with exactly [SILENT].",
    reads: [],
    rationale: "Alerts the owner if the autonomous fleet shipped a bug/regression while unattended (safety-relevant).",
  },
  {
    id: "prism-closeout-watch",
    name: "PRISM close-out watch",
    schedule: "0 18 * * 1-5",
    silent: true,
    prompt:
      "The script output above is the PRISM close-out audit (shipped artifacts not yet recorded in a milestone envelope). If it lists untriaged candidates, send the owner a short summary. If there are none, reply with exactly [SILENT].",
    reads: ["scripts/audit-close-out-candidates.mjs"],
    scriptRel: "scripts/audit-close-out-candidates.mjs",
    rationale: "Surfaces silent close-out debt so shipped work is not lost (SILENT unless debt exists).",
  },
];

/**
 * Enumerate candidate Hermes homes under the Windows user-profile root. Used as a
 * fallback when the homedir-derived path is absent -- e.g. the MCP server runs as
 * `NT AUTHORITY\SYSTEM`, whose `homedir()` is `...\systemprofile`, which carries no
 * Hermes install while the real one lives under `C:\Users\<user>\AppData\Local\hermes`.
 * POSIX hosts (no `C:\Users`) return [] -- Hermes is Windows-only.
 */
export function userProfileHermesCandidates(
  usersDir = "C:\\Users",
  existsFn: (p: string) => boolean = existsSync,
  readdirFn: typeof readdirSync = readdirSync,
): string[] {
  if (!existsFn(usersDir)) return [];
  // Skip the non-interactive / template profiles -- they never hold a real install.
  const skip = new Set(["Public", "Default", "Default User", "All Users", "systemprofile"]);
  try {
    return readdirFn(usersDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !skip.has(d.name))
      .map((d) => join(usersDir, d.name, "AppData", "Local", "hermes"));
  } catch {
    return []; // unreadable users dir -- fail soft, caller falls back to the homedir path
  }
}

/** A dir looks like a real Hermes install if it carries config/auth/agent markers. */
function looksLikeHermesInstall(dir: string, existsFn: (p: string) => boolean = existsSync): boolean {
  return (
    existsFn(join(dir, "config.yaml")) ||
    existsFn(join(dir, "auth.json")) ||
    existsFn(join(dir, "hermes-agent"))
  );
}

/**
 * Resolve the Hermes home robustly. Resolution order:
 *  1. `PRISM_HERMES_HOME` env -- explicit override, always wins.
 *  2. `%homedir%\AppData\Local\hermes` IF it exists -- the normal user-run case
 *     (byte-identical to the legacy behavior).
 *  3. First `C:\Users\<user>\AppData\Local\hermes` that looks like a real install --
 *     recovers the install when the host runs as SYSTEM (systemprofile homedir has none).
 *  4. The homedir-derived path -- honest `homeExists:false` fallback (unchanged from legacy).
 *
 * Pure + dependency-injectable so the SYSTEM-profile recovery path is unit-testable
 * without a real install.
 */
export function resolveHermesHome(
  env: NodeJS.ProcessEnv = process.env,
  deps: {
    homeFn?: () => string;
    existsFn?: (p: string) => boolean;
    candidatesFn?: () => string[];
  } = {},
): string {
  const override = env["PRISM_HERMES_HOME"];
  if (override) return override;
  const existsFn = deps.existsFn ?? existsSync;
  const homeFn = deps.homeFn ?? homedir;
  const primary = join(homeFn(), "AppData", "Local", "hermes");
  if (existsFn(primary)) return primary; // normal user run -- unchanged
  // homedir path is gone (SYSTEM principal, or pre-install) -- hunt the real user install.
  const candidates = (deps.candidatesFn ?? (() => userProfileHermesCandidates()))();
  for (const c of candidates) {
    if (existsFn(c) && looksLikeHermesInstall(c, existsFn)) return c;
  }
  return primary; // none found -- keep the honest homedir path so homeExists reports false
}

/** Default Hermes home (robust). Override: PRISM_HERMES_HOME. */
function defaultHome(): string {
  return resolveHermesHome();
}
/** Default CLI exe inside the bundled venv. Override: PRISM_HERMES_EXE. */
function defaultExe(home: string): string {
  return process.env["PRISM_HERMES_EXE"] || join(home, "hermes-agent", "venv", "Scripts", "hermes.exe");
}

export const DEFAULT_HERMES_TIMEOUT_MS = 120_000;
/** Capabilities the bridge needs; `process-spawn` forces the `sandbox` tier. */
export const HERMES_REQUESTED_CAPS: Capability[] = ["process-spawn", "filesystem-read", "env-read", "tool-call"];
export const HERMES_PLUGIN_ID = "hermes-cli-bridge";
/** Cap on how many CLI args a live run accepts (adversarial-input guard). */
const MAX_ARGS = 64;
const MAX_ARG_LEN = 4_096;

/** Injectable spawn signature (execFileSync-compatible) so tests stay hermetic. */
export type SpawnFn = (file: string, args: string[], opts: Record<string, unknown>) => string | Buffer;

export interface HermesBridgeOptions {
  /** Force mock on/off explicitly (tests). When unset, dual-key decides. */
  mock?: boolean;
  /** Half of the live dual-key (the other half is env PRISM_HERMES_MOCK=0). */
  noMock?: boolean;
  /** Sandbox tier to declare. Default "sandbox" (required for process-spawn). */
  tier?: SafetyTier;
  /** Hermes home dir override (tests point this at a fixture). */
  home?: string;
  /** Hermes CLI exe override. */
  exe?: string;
  /** Per-run timeout in ms. */
  timeoutMs?: number;
  /** Injected spawn (defaults to execFileSync). */
  spawn?: SpawnFn;
  /** Injected clock for deterministic expiry checks. */
  now?: () => number;
}

/** A credential-shaped object discovered while walking auth.json. */
interface CredLike {
  id?: string;
  label?: string;
  auth_type?: string;
  expiresAt?: number;
  status?: string;
}

export class HermesAutomationBridge {
  readonly mock: boolean;
  readonly tier: SafetyTier;
  readonly home: string;
  readonly exe: string;
  readonly timeoutMs: number;
  readonly verdict: PolicyVerdict;
  readonly sandboxAllowed: boolean;
  private readonly spawn: SpawnFn;
  private readonly now: () => number;

  constructor(opts: HermesBridgeOptions = {}) {
    // Dual-key: mock unless BOTH env PRISM_HERMES_MOCK=0 AND opts.noMock===true.
    // An explicit opts.mock wins (tests). Default is SAFE (mock).
    this.mock =
      opts.mock !== undefined
        ? opts.mock
        : !(process.env["PRISM_HERMES_MOCK"] === "0" && opts.noMock === true);
    this.tier = opts.tier ?? "sandbox";
    this.home = opts.home ?? defaultHome();
    this.exe = opts.exe ?? defaultExe(this.home);
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_HERMES_TIMEOUT_MS;
    this.spawn = opts.spawn ?? (execFileSync as unknown as SpawnFn);
    this.now = opts.now ?? (() => Date.now());
    this.verdict = PluginSandboxPolicyEngine.evaluate({
      plugin_id: HERMES_PLUGIN_ID,
      tier: this.tier,
      requested: HERMES_REQUESTED_CAPS,
    });
    this.sandboxAllowed = this.verdict.verdict === "allowed";
  }

  // ---- read-only inspection (no spawn; always available) --------------------

  /** Bridge + install status. Reads exe existence + active profile; never spawns. */
  status(): AtomicValue<Record<string, unknown>> {
    return atomic(
      {
        mock: this.mock,
        tier: this.tier,
        exe: this.exe,
        exeExists: existsSync(this.exe),
        home: this.home,
        homeExists: existsSync(this.home),
        activeProfile: this.readActiveProfile(),
        sandbox: this.verdict.verdict,
        sandboxSummary: PluginSandboxPolicyEngine.renderVerdict(this.verdict),
      },
      "hermes-bridge:status",
    );
  }

  /** Install probe: profiles, exe, auth-pool health. Read-only; never fabricates. */
  probe(): AtomicValue<Record<string, unknown>> {
    if (!existsSync(this.home)) {
      return atomic({ installed: false, home: this.home }, "hermes-bridge:probe", 1, `Hermes home not found at ${this.home}`);
    }
    const profilesDir = join(this.home, "profiles");
    const profiles = this.listDirs(profilesDir);
    const auth = this.authStatus().value;
    return atomic(
      {
        installed: true,
        home: this.home,
        exe: this.exe,
        exeExists: existsSync(this.exe),
        activeProfile: this.readActiveProfile(),
        profileCount: profiles.length,
        profiles,
        auth,
      },
      "hermes-bridge:probe",
    );
  }

  /**
   * Auth-pool health -- counts OAuth (subscription) credentials and flags expired
   * ones. Robust to shape variation: walks auth.json for credential-shaped objects
   * rather than assuming an exact schema (R12 -- never fabricate a clean verdict).
   * Also checks the legacy single-token .anthropic_oauth.json for expiry.
   */
  authStatus(): AtomicValue<Record<string, unknown>> {
    const authPath = join(this.home, "auth.json");
    const legacyPath = join(this.home, ".anthropic_oauth.json");
    const out: Record<string, unknown> = { authFile: authPath };
    let warning: string | undefined;

    const raw = this.readJson(authPath);
    if (raw === null) {
      out["found"] = false;
      return atomic(out, "hermes-bridge:auth_status", 1, `auth.json not readable at ${authPath}`);
    }
    out["found"] = true;
    out["activeProvider"] = (raw as Record<string, unknown>)["active_provider"] ?? null;

    const creds: CredLike[] = [];
    const walk = (o: unknown): void => {
      if (Array.isArray(o)) {
        for (const x of o) walk(x);
      } else if (o && typeof o === "object") {
        const rec = o as Record<string, unknown>;
        if ("expiresAt" in rec || "auth_type" in rec || "accessToken" in rec) {
          creds.push(rec as CredLike);
        } else {
          for (const v of Object.values(rec)) walk(v);
        }
      }
    };
    walk(raw);

    const nowMs = this.now();
    const oauth = creds.filter((c) => c.auth_type === "oauth");
    const expired = creds.filter((c) => typeof c.expiresAt === "number" && (c.expiresAt as number) < nowMs);
    out["totalCredentials"] = creds.length;
    out["oauthCount"] = oauth.length;
    out["expiredCount"] = expired.length;
    out["expiredIds"] = expired.map((c) => c.id ?? c.label ?? "?");
    if (oauth.length === 0) warning = "no OAuth (subscription) credentials found -- Hermes may be on metered API keys";

    // legacy single-token file
    const legacy = this.readJson(legacyPath) as Record<string, unknown> | null;
    if (legacy && typeof legacy["expiresAt"] === "number") {
      const legacyExpired = (legacy["expiresAt"] as number) < nowMs;
      out["legacyTokenPresent"] = true;
      out["legacyTokenExpired"] = legacyExpired;
    } else {
      out["legacyTokenPresent"] = false;
    }

    return atomic(out, "hermes-bridge:auth_status", 1, warning);
  }

  /** Cron jobs (reads cron/jobs.json directly; no spawn). */
  cronList(): AtomicValue<Record<string, unknown>> {
    const path = join(this.home, "cron", "jobs.json");
    const raw = this.readJson(path);
    if (raw === null) {
      return atomic({ found: false, path, jobs: [] }, "hermes-bridge:cron_list", 1, `cron jobs.json not readable at ${path}`);
    }
    const arr: unknown[] = Array.isArray(raw) ? raw : Array.isArray((raw as Record<string, unknown>)["jobs"]) ? ((raw as Record<string, unknown>)["jobs"] as unknown[]) : [];
    const jobs = arr.map((j) => {
      const r = (j ?? {}) as Record<string, unknown>;
      const sched = r["schedule"] as Record<string, unknown> | undefined;
      return {
        id: r["id"] ?? null,
        name: r["name"] ?? null,
        skill: r["skill"] ?? (Array.isArray(r["skills"]) ? (r["skills"] as unknown[])[0] : null),
        model: r["model"] ?? null,
        schedule: r["schedule_display"] ?? (sched ? sched["expr"] : null) ?? null,
        enabled: r["enabled"] ?? null,
        lastRunAt: r["last_run_at"] ?? null,
      };
    });
    return atomic({ found: true, path, count: jobs.length, jobs }, "hermes-bridge:cron_list");
  }

  /** Skills available to a profile (active by default). Reads the skills tree; no spawn. */
  skillList(profile?: string): AtomicValue<Record<string, unknown>> {
    const prof = profile ?? this.readActiveProfile();
    const roots: Array<{ scope: string; dir: string }> = [{ scope: "global", dir: join(this.home, "skills") }];
    if (prof) roots.push({ scope: `profile:${prof}`, dir: join(this.home, "profiles", prof, "skills") });
    const skills: Array<{ scope: string; category: string; name: string }> = [];
    for (const { scope, dir } of roots) {
      for (const category of this.listDirs(dir)) {
        for (const name of this.listDirs(join(dir, category))) {
          if (existsSync(join(dir, category, name, "SKILL.md"))) skills.push({ scope, category, name });
        }
      }
    }
    return atomic({ profile: prof, count: skills.length, skills }, "hermes-bridge:skill_list");
  }

  /**
   * Emit source-verified `hermes cron create ...` automations that push PRISM
   * manufacturing intelligence to the operator (default: telegram) on a schedule.
   *
   * EMIT-ONLY: pure data assembly. Never spawns, never mutates the Hermes install,
   * and does NOT depend on Hermes being installed -- so it is always safe to call
   * (the operator deploys each `command`, or runs it via `hermes_run` with the
   * dual-key). The cron grammar is verified from the open-source
   * NousResearch/hermes-agent repo (MIT). SILENT routines use Hermes' [SILENT]
   * no-spam pattern so the operator is only notified when something changed.
   *
   * @param opts.deliver  delivery target (default "telegram"); unknown targets warn but still emit.
   * @param opts.prismRoot PRISM repo root used to resolve script paths (default env PRISM_ROOT or "H:/prism").
   * @returns AtomicValue with the routine specs + a deploy hint; never throws.
   */
  routinePlan(opts: { deliver?: string; prismRoot?: string } = {}): AtomicValue<Record<string, unknown>> {
    const deliver = (opts.deliver && opts.deliver.length ? opts.deliver : "telegram").toLowerCase();
    const root = (opts.prismRoot && opts.prismRoot.length ? opts.prismRoot : process.env["PRISM_ROOT"] || "H:/prism").replace(/[/\\]+$/, "");
    const q = (s: string): string => `"${s}"`; // schedule/prompt/name/script wrap; prompts carry no double quotes by construction
    const routines: HermesRoutineSpec[] = ROUTINE_TEMPLATES.map((t) => {
      const prompt = t.prompt.replace(/\{root\}/g, root);
      const scriptAbs = t.scriptRel ? `${root}/${t.scriptRel}` : undefined;
      const parts = ["hermes", "cron", "create", q(t.schedule), q(prompt), "--name", q(t.name), "--deliver", deliver];
      if (scriptAbs) parts.push("--script", q(scriptAbs));
      const spec: HermesRoutineSpec = {
        id: t.id,
        name: t.name,
        schedule: t.schedule,
        deliver,
        silent: t.silent,
        prompt,
        reads: t.reads.map((r) => `${root}/${r}`),
        command: parts.join(" "),
        rationale: t.rationale,
      };
      if (scriptAbs) spec.script = scriptAbs;
      return spec;
    });
    // Fail-loud guards (R12): surface anything that could break a command when the
    // operator pastes it into a shell. None fire on the default (telegram + space-free root).
    const warnings: string[] = [];
    if (!KNOWN_DELIVER.has(deliver)) {
      warnings.push(`deliver target '${deliver}' is not a known Hermes target (${[...KNOWN_DELIVER].join("|")}) -- emitting anyway for operator override`);
    }
    if (!/^[a-z0-9_-]+$/.test(deliver)) {
      warnings.push(`deliver target '${deliver}' has shell-unsafe characters -- it is interpolated UNQUOTED, so a space/metachar would split or inject command tokens`);
    }
    if (/\s/.test(root)) {
      warnings.push(`prismRoot '${root}' contains whitespace -- embedded script paths in the prompt may need manual quoting before the operator runs the command`);
    }
    // Command-injection scan over EVERY field that lands in the assembled command, including the
    // embedded root path inside prompt/script: " ` $ would break the double-quote wrap or trigger
    // bash command substitution on paste. (Inputs are operator-supplied into their own emit-only
    // output -- not an untrusted boundary -- but the guard must cover what it claims, R12.)
    const SHELL_UNSAFE = /["`$]/;
    const unsafe = routines.find(
      (r) => SHELL_UNSAFE.test(r.prompt) || SHELL_UNSAFE.test(r.name) || SHELL_UNSAFE.test(r.schedule) || (r.script !== undefined && SHELL_UNSAFE.test(r.script)),
    );
    if (unsafe) {
      warnings.push(`routine '${unsafe.id}' contains a double-quote/backtick/$ in a quoted field (likely via prismRoot) -- command quoting/substitution may break (defense-in-depth)`);
    }
    const warning = warnings.length ? warnings.join("; ") : undefined;
    return atomic(
      {
        deliver,
        count: routines.length,
        routines,
        deployHint:
          "Operator-gated -- PRISM never auto-deploys these. Run each `command` in a Hermes shell, or via prism_hermes hermes_run with the dual-key (noMock + env PRISM_HERMES_MOCK=0, sandbox tier). SILENT routines reply [SILENT] when nothing changed.",
        source: "cron grammar verified from open-source NousResearch/hermes-agent @ v2026.6.5 (hermes-already-has-routines.md, MIT)",
      },
      "hermes-bridge:routine_plan",
      1,
      warning,
    );
  }

  // ---- live actions (gated: dual-key + sandbox + exe present) ----------------

  /** List Hermes model providers (best-effort `hermes model list`). */
  modelList(): AtomicValue<unknown> {
    if (this.mock) {
      return atomic(
        { models: ["gpt-oss:120b", "gpt-oss:20b", "qwen2.5-coder:32b", "anthropic (oauth pool)", "xai/grok", "ollama"], note: "mock list -- set dual-key for live" },
        "mock",
      );
    }
    return this.run(["model", "list"]);
  }

  /**
   * Raw gated live invocation of the Hermes CLI. Operator passes the exact args.
   * Mock returns a would-run envelope; live enforces sandbox + exe + timeout and
   * fail-closes (a killed/timed-out child is NEVER a success).
   */
  run(args: string[]): AtomicValue<unknown> {
    if (!Array.isArray(args) || args.length === 0) {
      return atomic(null, "hermes-bridge", 0, "run() requires a non-empty args array");
    }
    if (args.length > MAX_ARGS || args.some((a) => typeof a !== "string" || a.length > MAX_ARG_LEN)) {
      return atomic(null, "hermes-bridge", 0, `args rejected: max ${MAX_ARGS} string args, each <= ${MAX_ARG_LEN} chars`);
    }
    if (this.mock) {
      return atomic({ wouldRun: true, exe: this.exe, args }, "mock", 1, "mock mode -- not spawned (set noMock + PRISM_HERMES_MOCK=0 for live)");
    }
    if (!this.sandboxAllowed) {
      return atomic(null, "hermes-bridge", 0, `sandbox denied (need tier=sandbox for process-spawn): ${PluginSandboxPolicyEngine.renderVerdict(this.verdict)}`);
    }
    if (!existsSync(this.exe)) {
      return atomic(null, "hermes-bridge", 0, `Hermes exe not found at ${this.exe} (set PRISM_HERMES_EXE)`);
    }
    try {
      const out = this.spawn(this.exe, args, { encoding: "utf8", timeout: this.timeoutMs, windowsHide: false });
      return atomic({ stdout: String(out) }, "hermes-cli", 0.95);
    } catch (e) {
      const err = e as { stdout?: unknown; stderr?: unknown; status?: number | null; killed?: boolean; signal?: string };
      if (err.killed || err.signal) {
        return atomic(null, "hermes-cli", 0, `hermes timed out after ${this.timeoutMs}ms (killed) -- a hung call is never a success (R12)`);
      }
      const stderr = String(err.stderr ?? "");
      return atomic(
        { stdout: String(err.stdout ?? ""), stderr, code: err.status ?? null },
        "hermes-cli",
        0,
        `hermes exited non-zero: ${stderr.slice(0, 200)}`,
      );
    }
  }

  // ---- internals ------------------------------------------------------------

  private readActiveProfile(): string | null {
    const p = join(this.home, "active_profile");
    if (!existsSync(p)) return null;
    try {
      const v = readFileSync(p, "utf8").trim();
      return v.length ? v : null;
    } catch {
      return null;
    }
  }

  private readJson(path: string): unknown {
    if (!existsSync(path)) return null;
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch {
      return null;
    }
  }

  private listDirs(dir: string): string[] {
    if (!existsSync(dir)) return [];
    try {
      return readdirSync(dir).filter((d) => {
        try {
          return statSync(join(dir, d)).isDirectory();
        } catch {
          return false;
        }
      });
    } catch {
      return [];
    }
  }
}

/** Process-wide default instance (mock-by-default, sandbox tier). */
export const hermesAutomationBridge = new HermesAutomationBridge();
