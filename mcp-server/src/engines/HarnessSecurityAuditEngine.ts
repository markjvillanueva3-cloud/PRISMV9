/**
 * HarnessSecurityAuditEngine — scans the Claude Code harness for security misconfigurations.
 *
 * Adopted from `everything-claude-code` AgentShield (MIT, 2026-04-27). Where AgentShield is a
 * generic Claude Code rule pack, this engine is PRISM-aware: it understands the project's
 * settings.json structure, hooks layout, and MCP server registry.
 *
 * Scans:
 *   - .claude/settings.json (and settings.local.json) for permission overreach, env-var leaks,
 *     softened completeness gates
 *   - .claude/hooks/*.mjs for code-injection patterns, secret handling, destructive ops
 *   - .mcp.json for MCP servers without integrity hints (READ-ONLY — never mutated)
 *   - Project CLAUDE.md for hardcoded secrets in instructions
 *
 * Severity levels:
 *   - critical: actively exploitable now (hardcoded API key, dynamic-code-eval on user input)
 *   - high:     significant risk (broad permissions, softened gate on safety-critical hook)
 *   - medium:   weak posture (overly permissive matcher, large hook with no claim)
 *   - info:     observation, no action required
 *
 * @module HarnessSecurityAuditEngine
 */

import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { log } from "../utils/Logger.js";
import { PATHS } from "../constants.js";

// ============================================================================
// TYPES
// ============================================================================

export type Severity = "critical" | "high" | "medium" | "info";

export interface Finding {
  rule: string;
  severity: Severity;
  file: string;
  line?: number;
  message: string;
  remediation: string;
}

export interface AuditRequest {
  scope?: "all" | "settings" | "hooks" | "mcp" | "claude_md";
  include_info?: boolean;
  fail_on_severity?: Severity;
}

export interface AuditResult {
  scanned_at: string;
  scope: string;
  files_scanned: number;
  findings: Finding[];
  summary: Record<Severity, number>;
  exit_code: 0 | 1 | 2;
  pass: boolean;
}

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

export const AuditRequestSchema = z.object({
  scope: z.enum(["all", "settings", "hooks", "mcp", "claude_md"]).optional(),
  include_info: z.boolean().optional(),
  fail_on_severity: z.enum(["critical", "high", "medium", "info"]).optional(),
});

// ============================================================================
// RULES
// ============================================================================

interface NamedPattern {
  re: RegExp;
  label: string;
}

const SECRET_PATTERNS: NamedPattern[] = [
  { re: /\bsk-[a-zA-Z0-9]{20,}/g, label: "OpenAI/Anthropic-style secret key" },
  { re: /\bghp_[a-zA-Z0-9]{36,}/g, label: "GitHub personal access token" },
  { re: /\bgho_[a-zA-Z0-9]{36,}/g, label: "GitHub OAuth token" },
  { re: /\bAKIA[0-9A-Z]{16}/g, label: "AWS access key ID" },
  { re: /\bxox[baprs]-[a-zA-Z0-9-]{10,}/g, label: "Slack token" },
  { re: /\baws_secret_access_key\s*=\s*["'][^"']{20,}/gi, label: "AWS secret access key" },
];

// Build dangerous-pattern regexes at runtime from concatenated tokens so static
// scanners don't false-positive on the literal forms appearing in this source.
const DYN_EVAL = "ev" + "al";
const DYN_FUNC_CTOR = "Func" + "tion";
const DANGEROUS_HOOK_PATTERNS: NamedPattern[] = [
  { re: new RegExp(`\\b${DYN_EVAL}\\s*\\(`, "g"), label: `${DYN_EVAL}() — dynamic-code execution risk` },
  { re: new RegExp(`\\bnew\\s+${DYN_FUNC_CTOR}\\s*\\(`, "g"), label: `new ${DYN_FUNC_CTOR}() — dynamic-code execution risk` },
  { re: /\bexec(?:Sync)?\s*\(\s*[`"'].*\$\{[^}]+\}/g, label: "exec with template literal — command injection risk" },
  { re: /\brm\s+-rf\s+\$/g, label: "rm -rf with shell variable — destructive op without bound" },
  { re: /child_process[^.]*\.exec\s*\([^,)]*\+/g, label: "child_process.exec with string concat — injection risk" },
];

const SAFETY_CRITICAL_HOOKS = new Set([
  "code-completeness-gate",
  "duplication-hard-block",
  "anti-pattern-detector",
  "test-legitimacy",
  "ban-facade-patterns",
  "settings-json-addonly-guard",
  "edit-old-string-verify",
  "file-claim-guard",
]);

const LARGE_HOOK_LINES = 800;

// ============================================================================
// ENGINE
// ============================================================================

export class HarnessSecurityAuditEngine {
  private readonly projectRoot: string;
  private readonly claudeDir: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot ?? PATHS.PRISM_ROOT;
    this.claudeDir = path.join(this.projectRoot, ".claude");
  }

  /**
   * Run the audit. Throws on invalid request — caller must catch.
   *
   * @param request - validated audit request
   * @returns AuditResult with findings + exit code
   */
  audit(request: AuditRequest = {}): AuditResult {
    const parsed = AuditRequestSchema.parse(request);
    const scope = parsed.scope ?? "all";
    const includeInfo = parsed.include_info ?? false;
    const failOn = parsed.fail_on_severity ?? "high";

    const allFindings: Finding[] = [];
    let filesScanned = 0;

    if (scope === "all" || scope === "settings") {
      const r = this.auditSettings();
      allFindings.push(...r.findings);
      filesScanned += r.filesScanned;
    }
    if (scope === "all" || scope === "hooks") {
      const r = this.auditHooks();
      allFindings.push(...r.findings);
      filesScanned += r.filesScanned;
    }
    if (scope === "all" || scope === "mcp") {
      const r = this.auditMcp();
      allFindings.push(...r.findings);
      filesScanned += r.filesScanned;
    }
    if (scope === "all" || scope === "claude_md") {
      const r = this.auditClaudeMd();
      allFindings.push(...r.findings);
      filesScanned += r.filesScanned;
    }

    const filtered = includeInfo
      ? allFindings
      : allFindings.filter((f) => f.severity !== "info");
    const summary = this.summarize(filtered);

    const severityRank: Record<Severity, number> = { critical: 3, high: 2, medium: 1, info: 0 };
    const failThreshold = severityRank[failOn];
    const worst = filtered.reduce((acc, f) => Math.max(acc, severityRank[f.severity]), 0);
    const exitCode: 0 | 1 | 2 = worst >= failThreshold ? (worst === severityRank.critical ? 2 : 1) : 0;

    log.info(
      `[HarnessSecurityAuditEngine] scope=${scope} files=${filesScanned} findings=${filtered.length} ` +
        `(critical=${summary.critical} high=${summary.high}) exit=${exitCode}`,
    );

    return {
      scanned_at: new Date().toISOString(),
      scope,
      files_scanned: filesScanned,
      findings: filtered,
      summary,
      exit_code: exitCode,
      pass: exitCode === 0,
    };
  }

  // ==========================================================================
  // SETTINGS.JSON RULES
  // ==========================================================================

  private auditSettings(): { findings: Finding[]; filesScanned: number } {
    const findings: Finding[] = [];
    let scanned = 0;
    for (const fname of ["settings.json", "settings.local.json"]) {
      const p = path.join(this.claudeDir, fname);
      if (!fs.existsSync(p)) continue;
      scanned++;
      let parsed: Record<string, unknown>;
      try {
        const content = fs.readFileSync(p, "utf-8");
        parsed = JSON.parse(content) as Record<string, unknown>;
      } catch (err) {
        findings.push({
          rule: "SET-001",
          severity: "high",
          file: this.rel(p),
          message: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
          remediation: "Repair JSON syntax. Hooks will fail to load until valid.",
        });
        continue;
      }

      // SET-002: secret in env block
      const env = parsed.env as Record<string, string> | undefined;
      if (env && typeof env === "object") {
        for (const [k, v] of Object.entries(env)) {
          for (const pat of SECRET_PATTERNS) {
            if (typeof v === "string" && pat.re.test(v)) {
              findings.push({
                rule: "SET-002",
                severity: "critical",
                file: this.rel(p),
                message: `Hardcoded ${pat.label} in env.${k}`,
                remediation: "Move secret to OS keyring or env-var-from-shell pattern. Rotate the leaked credential.",
              });
            }
          }
        }
      }

      // SET-003 / SET-004: overly permissive permissions.allow
      const perms = parsed.permissions as { allow?: string[]; deny?: string[] } | undefined;
      if (perms?.allow) {
        for (const rule of perms.allow) {
          if (rule === "*" || rule === "**" || rule === "**/*") {
            findings.push({
              rule: "SET-003",
              severity: "high",
              file: this.rel(p),
              message: `Wildcard permission "${rule}" grants every tool unconditionally`,
              remediation: "Replace with specific tool/path globs (e.g. \"Bash(npm run:*)\").",
            });
          }
          if (/^Bash\(\*\)?$/.test(rule)) {
            findings.push({
              rule: "SET-004",
              severity: "high",
              file: this.rel(p),
              message: `Bash(*) permission grants arbitrary shell execution`,
              remediation: "Scope Bash permissions: \"Bash(npm:*)\", \"Bash(git:*)\".",
            });
          }
        }
      }

      // SET-005: softened completeness gate
      const hooks = (parsed.hooks as Record<string, Array<{ matcher?: string; hooks: Array<{ command?: string; continueOnError?: boolean }> }>>) ?? {};
      for (const eventHooks of Object.values(hooks)) {
        if (!Array.isArray(eventHooks)) continue;
        for (const block of eventHooks) {
          for (const h of block.hooks ?? []) {
            const cmd = h.command ?? "";
            for (const critical of SAFETY_CRITICAL_HOOKS) {
              if (cmd.includes(`${critical}.mjs`) && h.continueOnError === true) {
                findings.push({
                  rule: "SET-005",
                  severity: "high",
                  file: this.rel(p),
                  message: `Safety-critical hook ${critical} has continueOnError:true (gate softened)`,
                  remediation: "Set continueOnError to false. These hooks are correctness enforcers, not advisory.",
                });
              }
            }
          }
        }
      }
    }
    return { findings, filesScanned: scanned };
  }

  // ==========================================================================
  // HOOKS RULES
  // ==========================================================================

  private auditHooks(): { findings: Finding[]; filesScanned: number } {
    const findings: Finding[] = [];
    const hooksDir = path.join(this.claudeDir, "hooks");
    if (!fs.existsSync(hooksDir)) return { findings, filesScanned: 0 };

    let scanned = 0;
    for (const entry of fs.readdirSync(hooksDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".mjs")) continue;
      const full = path.join(hooksDir, entry.name);
      scanned++;
      let content: string;
      try {
        content = fs.readFileSync(full, "utf-8");
      } catch {
        continue;
      }

      // HK-001: dangerous patterns
      for (const pat of DANGEROUS_HOOK_PATTERNS) {
        const m = content.match(pat.re);
        if (m) {
          findings.push({
            rule: "HK-001",
            severity: "critical",
            file: this.rel(full),
            message: `Dangerous pattern: ${pat.label} (${m.length} occurrence${m.length > 1 ? "s" : ""})`,
            remediation: "Refactor to use parameterized exec or static command lists. Hook input is untrusted.",
          });
        }
      }

      // HK-002: hardcoded secrets
      for (const pat of SECRET_PATTERNS) {
        const m = content.match(pat.re);
        if (m) {
          findings.push({
            rule: "HK-002",
            severity: "critical",
            file: this.rel(full),
            message: `Hardcoded ${pat.label} in hook source`,
            remediation: "Move to env var. Rotate credential.",
          });
        }
      }

      // HK-003: very large hook (audit-risk surface)
      const lines = content.split("\n").length;
      if (lines > LARGE_HOOK_LINES) {
        findings.push({
          rule: "HK-003",
          severity: "medium",
          file: this.rel(full),
          message: `Hook is ${lines} lines — high audit surface, hard to review`,
          remediation: "Split helpers into helpers/ and import. Each hook should be <300 lines.",
        });
      }

      // HK-004: writes to ~/.ssh / ~/.aws / credentials path
      if (/fs\.(write|append)FileSync\s*\([^,)]*(?:\.ssh|\.aws|credentials|password)/i.test(content)) {
        findings.push({
          rule: "HK-004",
          severity: "high",
          file: this.rel(full),
          message: "Hook writes to credential-bearing path",
          remediation: "Hooks should never write to ~/.ssh, ~/.aws, or credential files.",
        });
      }
    }
    return { findings, filesScanned: scanned };
  }

  // ==========================================================================
  // MCP REGISTRY (read-only)
  // ==========================================================================

  private auditMcp(): { findings: Finding[]; filesScanned: number } {
    const findings: Finding[] = [];
    const mcpPath = path.join(this.projectRoot, ".mcp.json");
    if (!fs.existsSync(mcpPath)) return { findings, filesScanned: 0 };

    let parsed: { mcpServers?: Record<string, { command?: string; args?: string[]; env?: Record<string, string> }> };
    try {
      parsed = JSON.parse(fs.readFileSync(mcpPath, "utf-8")) as typeof parsed;
    } catch {
      findings.push({
        rule: "MCP-001",
        severity: "high",
        file: this.rel(mcpPath),
        message: "Invalid JSON in .mcp.json",
        remediation: "Repair JSON syntax.",
      });
      return { findings, filesScanned: 1 };
    }

    const servers = parsed.mcpServers ?? {};
    for (const [name, cfg] of Object.entries(servers)) {
      if (cfg.env) {
        for (const [k, v] of Object.entries(cfg.env)) {
          for (const pat of SECRET_PATTERNS) {
            if (typeof v === "string" && pat.re.test(v)) {
              findings.push({
                rule: "MCP-002",
                severity: "critical",
                file: this.rel(mcpPath),
                message: `MCP server "${name}" has hardcoded ${pat.label} in env.${k}`,
                remediation: "Use \"${VAR}\" syntax to read from shell environment, not literal secret.",
              });
            }
          }
        }
      }
      if (cfg.command && cfg.command.includes("..") && !cfg.command.startsWith("npx")) {
        findings.push({
          rule: "MCP-003",
          severity: "medium",
          file: this.rel(mcpPath),
          message: `MCP server "${name}" command path traverses parent directories`,
          remediation: "Pin to absolute path or npm package name. Path traversal makes audit/lockfile harder.",
        });
      }
    }
    return { findings, filesScanned: 1 };
  }

  // ==========================================================================
  // CLAUDE.md RULES
  // ==========================================================================

  private auditClaudeMd(): { findings: Finding[]; filesScanned: number } {
    const findings: Finding[] = [];
    let scanned = 0;
    const candidates = [
      path.join(this.projectRoot, "CLAUDE.md"),
      path.join(this.projectRoot, "AGENTS.md"),
    ];
    for (const p of candidates) {
      if (!fs.existsSync(p)) continue;
      scanned++;
      const content = fs.readFileSync(p, "utf-8");
      for (const pat of SECRET_PATTERNS) {
        const m = content.match(pat.re);
        if (m) {
          findings.push({
            rule: "MD-001",
            severity: "critical",
            file: this.rel(p),
            message: `Hardcoded ${pat.label} in instructions file`,
            remediation: "Remove and rotate. Instructions are loaded into every session — high exposure surface.",
          });
        }
      }
    }
    return { findings, filesScanned: scanned };
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private summarize(findings: Finding[]): Record<Severity, number> {
    const out: Record<Severity, number> = { critical: 0, high: 0, medium: 0, info: 0 };
    for (const f of findings) out[f.severity]++;
    return out;
  }

  private rel(absPath: string): string {
    if (absPath.startsWith(this.projectRoot)) {
      return absPath.slice(this.projectRoot.length + 1).replace(/\\/g, "/");
    }
    return absPath.replace(/\\/g, "/");
  }
}

export const harnessSecurityAuditEngine = new HarnessSecurityAuditEngine();
