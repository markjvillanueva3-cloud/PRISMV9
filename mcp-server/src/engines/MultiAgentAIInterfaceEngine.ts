/**
 * MultiAgentAIInterfaceEngine — P2-U03
 *
 * Forge-team configuration + dual-family review orchestration.
 *
 * Background: PRISM's forge-team agent (`H:/.claude/agents/teams/forge-team.md`)
 * is a 3-step Claude pipeline (architect → implementer → reviewer). Single-family
 * reasoning loops can miss errors that an independent reasoning family would
 * catch (per video RChO5deJ_fE → openai/codex-plugin-cc plan-then-execute pattern).
 * This engine adds a `codex_reviewer` member type so a forge-team invocation
 * can run Codex (GPT-5 family) review in parallel with Claude reviewer subagents.
 *
 * Both reviewer outputs land in the arbitration log (`AGENT_CONFLICT_ARBITRATION
 * .json`, kind="forge-review") with provider tags so the post-build audit can
 * verify dual-family agreement.
 *
 * Provider injection: `dispatchReviewers` accepts a `ProviderHandlers` object
 * so callers (and tests) can substitute their own claude/codex implementations.
 * The default codex handler routes through `PRISMCodexBridgeEngine.review`. The
 * default claude handler is a placeholder — Claude subagents are dispatched
 * from inside Claude Code via the `Agent` tool, not from runtime engine code,
 * so the production caller wires the Claude handler at the call site (typically
 * passing the handler's already-collected `ReviewRecord`).
 *
 * Trace ledger: `recordReview` writes to `arbitration-log.mjs` via spawnSync,
 * matching the surface the runtime hooks already use. `kind="forge-review"`
 * is a custom kind tag accepted by the helper.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { PRISMCodexBridgeEngine, type SafetyTier } from "./PRISMCodexBridgeEngine.js";

// ----------------------------------------------------------------------------
// Type surface
// ----------------------------------------------------------------------------

export type AIProvider = "claude" | "codex";
export type ReviewVerdict = "PASS" | "WARN" | "BLOCK";
export type FindingSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface ReviewerMember {
  /** Stable display name, e.g., "physics-reviewer" or "codex-prod". */
  name: string;
  provider: AIProvider;
  /** Required when provider="claude" — the subagent_type for Agent dispatch. */
  subagent_type?: string;
  /** Required when provider="codex" — Safety tier selecting model + reasoning. */
  tier?: SafetyTier;
}

export interface ForgeTeamConfig {
  /** Free-text feature/edit brief that all reviewers receive. */
  brief: string;
  /** 1+ reviewer members. Mixed providers allowed. */
  reviewers: ReadonlyArray<ReviewerMember>;
  /** Optional session id; defaults to a stable forge-<ts> string. */
  sessionId?: string;
}

export interface Finding {
  severity: FindingSeverity;
  message: string;
  line?: number;
  filePath?: string;
}

export interface ReviewTarget {
  filePath: string;
  /** Optional inline file content for tests / pre-commit reviews. */
  fileContent?: string;
  /** Brief routed to the reviewer alongside the file. */
  brief: string;
}

export interface ReviewRecord {
  provider: AIProvider;
  reviewerName: string;
  verdict: ReviewVerdict;
  findings: ReadonlyArray<Finding>;
  /** Raw text the reviewer emitted, capped to RAW_OUTPUT_PREVIEW_BYTES on log. */
  rawOutput: string;
  durationMs: number;
  /** ISO timestamp when the review record was created. */
  recordedAt: string;
}

export interface ProviderHandlers {
  claude: (m: ReviewerMember, target: ReviewTarget) => Promise<ReviewRecord>;
  codex: (m: ReviewerMember, target: ReviewTarget) => Promise<ReviewRecord>;
}

export interface ConfigValidation {
  ok: boolean;
  errors: ReadonlyArray<string>;
}

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const FORGE_REVIEW_KIND = "forge-review";
const RAW_OUTPUT_PREVIEW_BYTES = 500;
const ARB_HELPER_TIMEOUT_MS = 5000;
const CODEX_DEFAULT_TIMEOUT_MS = 30_000;
const FINDING_LINE_RE = /^(CRITICAL|WARNING|INFO):\s*(.+)$/u;

/**
 * Path resolved relative to repo root. Engine code runs from
 * `mcp-server/dist/engines/MultiAgentAIInterfaceEngine.js` (built) or
 * `mcp-server/src/engines/MultiAgentAIInterfaceEngine.ts` (test). In both cases
 * `process.cwd()` at typical invocation time is the repo root or `mcp-server/`.
 * We resolve permissively: try repo-root first, fall back to one-up.
 */
function resolveArbHelperPath(): string {
  // Prefer the env override (matches what the test sets).
  const envOverride = process.env.PRISM_ARB_HELPER_PATH;
  if (envOverride) return envOverride;
  // Default: <repo-root>/.claude/helpers/arbitration-log.mjs
  // From mcp-server/, repo root is one level up.
  return resolve(process.cwd(), ".claude/helpers/arbitration-log.mjs");
}

// ----------------------------------------------------------------------------
// Engine
// ----------------------------------------------------------------------------

/**
 * Multi-agent AI interface — forge-team config validation, dual-family review
 * dispatch, and arbitration-log recording. Static-only; no instance state.
 */
export class MultiAgentAIInterfaceEngine {
  /**
   * Validate a ForgeTeamConfig against the membership contract.
   *
   * @param cfg - Candidate config
   * @returns `{ok, errors}` — errors lists every violation (does not stop at first).
   */
  static validateConfig(cfg: ForgeTeamConfig): ConfigValidation {
    const errors: string[] = [];
    if (typeof cfg.brief !== "string" || cfg.brief.length === 0) {
      errors.push("brief required (non-empty string)");
    }
    if (!Array.isArray(cfg.reviewers) || cfg.reviewers.length === 0) {
      errors.push("reviewers must be a non-empty array");
    } else {
      for (let i = 0; i < cfg.reviewers.length; i += 1) {
        const m = cfg.reviewers[i];
        const tag = `reviewer[${i}]`;
        if (typeof m.name !== "string" || m.name.length === 0) {
          errors.push(`${tag}: name required`);
        }
        if (m.provider !== "claude" && m.provider !== "codex") {
          errors.push(`${tag}: provider must be 'claude' or 'codex' (got ${String(m.provider)})`);
        }
        if (m.provider === "codex" && !m.tier) {
          errors.push(`${tag}: codex provider requires tier (shop_floor|production|proven_out|sim)`);
        }
        if (m.provider === "claude" && (typeof m.subagent_type !== "string" || m.subagent_type.length === 0)) {
          errors.push(`${tag}: claude provider requires subagent_type`);
        }
      }
    }
    return { ok: errors.length === 0, errors };
  }

  /**
   * Append a single review record to the arbitration log (kind=forge-review).
   *
   * @returns true if the helper exited 0; false on lock contention or fs errors.
   */
  static recordReview(rec: ReviewRecord, sessionId: string): boolean {
    const helperPath = resolveArbHelperPath();
    const r = spawnSync(
      process.execPath,
      [
        helperPath,
        "append",
        "--kind",
        FORGE_REVIEW_KIND,
        "--session",
        sessionId,
        "--details",
        JSON.stringify({
          provider: rec.provider,
          reviewerName: rec.reviewerName,
          verdict: rec.verdict,
          findings: rec.findings,
          durationMs: rec.durationMs,
          rawOutputPreview: rec.rawOutput.slice(0, RAW_OUTPUT_PREVIEW_BYTES),
          recordedAt: rec.recordedAt,
        }),
      ],
      {
        encoding: "utf-8",
        timeout: ARB_HELPER_TIMEOUT_MS,
        env: process.env,
      },
    );
    return r.status === 0;
  }

  /**
   * Dispatch all configured reviewers in parallel and record each result.
   *
   * @throws Error if config is invalid or a provider handler is missing.
   * @returns ReviewRecord[] in the same order as cfg.reviewers.
   */
  static async dispatchReviewers(
    cfg: ForgeTeamConfig,
    target: ReviewTarget,
    providers: ProviderHandlers,
  ): Promise<ReviewRecord[]> {
    const v = this.validateConfig(cfg);
    if (!v.ok) {
      throw new Error(`MultiAgentAIInterfaceEngine: invalid forge-team config: ${v.errors.join("; ")}`);
    }
    if (typeof providers.claude !== "function" || typeof providers.codex !== "function") {
      throw new Error("MultiAgentAIInterfaceEngine: providers.claude and providers.codex must both be functions");
    }
    const sessionId = cfg.sessionId ?? `forge-${Date.now()}`;
    const results = await Promise.all(
      cfg.reviewers.map(async (m) => {
        const handler = providers[m.provider];
        const rec = await handler(m, target);
        // Auto-record so the dual-family audit trail closes.
        this.recordReview(rec, sessionId);
        return rec;
      }),
    );
    return results;
  }

  /**
   * Default Codex review handler — wraps PRISMCodexBridgeEngine.review.
   * Production callers can pass this directly; tests typically inject a stub.
   */
  static async defaultCodexHandler(m: ReviewerMember, target: ReviewTarget): Promise<ReviewRecord> {
    const start = Date.now();
    const tier = m.tier ?? "production";
    const prompt = `Review ${target.filePath} for the following brief:\n${target.brief}\n\n${target.fileContent ?? "<file contents not inlined; reviewer should read from disk>"}`;
    const result = await PRISMCodexBridgeEngine.review({
      prompt,
      tier,
      timeoutMs: CODEX_DEFAULT_TIMEOUT_MS,
    });
    const verdict: ReviewVerdict = result.status === "ok" ? "PASS" : "BLOCK";
    return {
      provider: "codex",
      reviewerName: m.name,
      verdict,
      findings: parseFindings(result.data.stdout),
      rawOutput: result.data.stdout,
      durationMs: Date.now() - start,
      recordedAt: new Date().toISOString(),
    };
  }

  /**
   * Default Claude review handler — placeholder. Claude subagents are dispatched
   * from inside Claude Code via the `Agent` tool, NOT from runtime engine code.
   * Callers must override this with a handler that translates their already-
   * collected subagent output into a ReviewRecord. Throws if invoked directly
   * so misuse is loud.
   */
  static async defaultClaudeHandler(_m: ReviewerMember, _target: ReviewTarget): Promise<ReviewRecord> {
    throw new Error(
      "defaultClaudeHandler is a placeholder — caller must inject a handler that wraps Agent-tool subagent output. See MultiAgentAIInterfaceEngine docstring.",
    );
  }
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/** Naive findings parser: extract lines starting with CRITICAL:|WARNING:|INFO:. */
function parseFindings(raw: string): Finding[] {
  if (!raw) return [];
  const out: Finding[] = [];
  for (const line of raw.split(/\r?\n/u)) {
    const m = line.match(FINDING_LINE_RE);
    if (m) {
      out.push({ severity: m[1] as FindingSeverity, message: m[2].trim() });
    }
  }
  return out;
}
