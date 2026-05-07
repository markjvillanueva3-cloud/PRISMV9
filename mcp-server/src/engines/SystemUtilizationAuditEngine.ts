/**
 * SystemUtilizationAuditEngine — SYS-UTIL-AUDIT-MS0
 *
 * 10-pillar SYSTEM-level utilization audit (orthogonal to
 * EngineUtilizationAuditorEngine which does ENGINE-level wiring/orphan analysis).
 *
 * Pillars:
 *   1 Dev Tools         (rtk, vitest, esbuild, tsc, MCP dispatchers)
 *   2 Protocols         (GSD, RGS, ATCS, Ralph)
 *   3 CLAUDE.md         (5 files, stale counts, AUTO-WEDM markers)
 *   4 Skills            (slash commands, manifest coverage)
 *   5 Scripts           (orphan detection, package.json refs)
 *   6 Hooks             (settings.json wiring vs .mjs files)
 *   7 Awareness         (MASTER_INDEX, digests, self-awareness engines)
 *   8 Memory            (MEMORY.md, sync hook, recent writes)
 *   9 Containers        (docker-compose services, daemon health)
 *  10 PRISM AI System   (composes EngineUtilizationAuditorEngine + AI engine inventory)
 *
 * Scoring: each pillar [0,1]. Strict threshold: <0.85 = MAJOR finding.
 * Composite: arithmetic mean of 10 pillars.
 *
 * Created during SYS-UTIL-AUDIT-MS0 (commit 72acb005c) to make the audit
 * re-runnable after the manual one-shot autopilot pass.
 *
 * @module engines/SystemUtilizationAuditEngine
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

export type PillarId =
  | "dev_tools"
  | "protocols"
  | "claude_md"
  | "skills"
  | "scripts"
  | "hooks"
  | "awareness"
  | "memory"
  | "containers"
  | "ai_system";

export interface PillarScore {
  pillar: PillarId;
  score: number;
  evidence: string[];
  gaps: string[];
  autoFixable: string[];
  reviewRequired: string[];
}

export interface SystemAuditReport {
  timestamp: string;
  composite: number;
  threshold: number;
  pillars: PillarScore[];
  majorFindings: PillarScore[];
  fixesApplied: number;
  reviewQueued: number;
}

const REPO_ROOT = "H:/prism";
const MCP_ROOT = `${REPO_ROOT}/mcp-server`;
const STATE_DIR = `${REPO_ROOT}/state/shared/audit`;

function safeExists(p: string): boolean {
  try { return fs.existsSync(p); } catch { return false; }
}

function safeStat(p: string): fs.Stats | null {
  try { return fs.statSync(p); } catch { return null; }
}

function ageMinutes(p: string): number {
  const s = safeStat(p);
  if (!s) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - s.mtimeMs) / 60_000);
}

export class SystemUtilizationAuditEngine {
  private threshold = 0.85;
  private lastReport: SystemAuditReport | null = null;

  setThreshold(t: number) { this.threshold = Math.max(0, Math.min(1, t)); }

  /** Run all 10 pillars and return the composite report. */
  auditAll(): SystemAuditReport {
    const pillars: PillarScore[] = [
      this.runPillar("dev_tools"),
      this.runPillar("protocols"),
      this.runPillar("claude_md"),
      this.runPillar("skills"),
      this.runPillar("scripts"),
      this.runPillar("hooks"),
      this.runPillar("awareness"),
      this.runPillar("memory"),
      this.runPillar("containers"),
      this.runPillar("ai_system"),
    ];
    const composite = pillars.reduce((a, p) => a + p.score, 0) / pillars.length;
    const majorFindings = pillars.filter(p => p.score < this.threshold);
    const report: SystemAuditReport = {
      timestamp: new Date().toISOString(),
      composite: Number(composite.toFixed(3)),
      threshold: this.threshold,
      pillars,
      majorFindings,
      fixesApplied: pillars.reduce((a, p) => a + p.autoFixable.length, 0),
      reviewQueued: pillars.reduce((a, p) => a + p.reviewRequired.length, 0),
    };
    this.lastReport = report;
    return report;
  }

  /** Audit a single pillar. */
  runPillar(id: PillarId): PillarScore {
    switch (id) {
      case "dev_tools": return this.auditDevTools();
      case "protocols": return this.auditProtocols();
      case "claude_md": return this.auditClaudeMd();
      case "skills": return this.auditSkills();
      case "scripts": return this.auditScripts();
      case "hooks": return this.auditHooks();
      case "awareness": return this.auditAwareness();
      case "memory": return this.auditMemory();
      case "containers": return this.auditContainers();
      case "ai_system": return this.auditAISystem();
    }
  }

  /** Persist last report to state/shared/audit/ (returns path written). */
  writeReport(report: SystemAuditReport = this.lastReport!): string {
    if (!report) throw new Error("No report to write — call auditAll() first");
    if (!safeExists(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
    const filename = `system-audit-${report.timestamp.replace(/[:.]/g, "-")}.json`;
    const fullPath = path.join(STATE_DIR, filename);
    fs.writeFileSync(fullPath, JSON.stringify(report, null, 2));
    return fullPath;
  }

  getLastReport(): SystemAuditReport | null {
    return this.lastReport;
  }

  getStats() {
    return {
      pillars: 10,
      threshold: this.threshold,
      last_audit: this.lastReport?.timestamp ?? null,
      last_composite: this.lastReport?.composite ?? null,
    };
  }

  // ── Pillar implementations ────────────────────────────────────────────────

  private auditDevTools(): PillarScore {
    const evidence: string[] = [];
    const gaps: string[] = [];
    let present = 0;
    const total = 6;
    const checks: Array<[string, () => boolean]> = [
      ["rtk binary", () => safeExists("/h/.tools/rtk/rtk.exe") || safeExists("H:/.tools/rtk/rtk.exe")],
      ["vitest", () => safeExists(`${MCP_ROOT}/node_modules/.bin/vitest`)],
      ["esbuild", () => safeExists(`${MCP_ROOT}/node_modules/.bin/esbuild`)],
      ["tsc", () => safeExists(`${MCP_ROOT}/node_modules/.bin/tsc`)],
      ["build:fast script", () => this.hasNpmScript("build:fast")],
      ["MCP dispatchers >=80", () => this.countDispatchers() >= 80],
    ];
    for (const [name, fn] of checks) {
      if (fn()) { present++; evidence.push(`OK: ${name}`); }
      else gaps.push(`MISSING: ${name}`);
    }
    return {
      pillar: "dev_tools", score: present / total, evidence, gaps,
      autoFixable: [], reviewRequired: gaps,
    };
  }

  private auditProtocols(): PillarScore {
    const evidence: string[] = []; const gaps: string[] = [];
    const checks: Array<[string, string]> = [
      ["GSD_QUICK", `${MCP_ROOT}/data/docs/gsd/GSD_QUICK.md`],
      ["DEV_PROTOCOL", `${MCP_ROOT}/data/docs/gsd/DEV_PROTOCOL.md`],
      ["roadmap schema", `${MCP_ROOT}/src/schemas/roadmapSchema.ts`],
      ["roadmap-index", `${MCP_ROOT}/data/roadmap-index.json`],
      ["atcsDispatcher", `${MCP_ROOT}/src/tools/dispatchers/atcsDispatcher.ts`],
    ];
    let present = 0;
    for (const [name, p] of checks) {
      if (safeExists(p)) { present++; evidence.push(`OK: ${name}`); }
      else gaps.push(`MISSING: ${name}`);
    }
    const sectionsDir = `${MCP_ROOT}/data/docs/gsd/sections`;
    const sectionCount = safeExists(sectionsDir) ? fs.readdirSync(sectionsDir).filter(f => f.endsWith(".md")).length : 0;
    if (sectionCount >= 10) { present += 0.5; evidence.push(`GSD sections: ${sectionCount}`); }
    return {
      pillar: "protocols", score: Math.min(1, present / checks.length),
      evidence, gaps, autoFixable: [], reviewRequired: gaps,
    };
  }

  private auditClaudeMd(): PillarScore {
    const evidence: string[] = []; const gaps: string[] = []; const autoFixable: string[] = [];
    const files = [
      `${REPO_ROOT}/CLAUDE.md`,
      `${MCP_ROOT}/CLAUDE.md`,
      `${MCP_ROOT}/src/engines/CLAUDE.md`,
      `${MCP_ROOT}/src/tools/dispatchers/CLAUDE.md`,
      `${MCP_ROOT}/web/CLAUDE.md`,
    ];
    let present = 0;
    for (const f of files) {
      if (safeExists(f)) { present++; evidence.push(`OK: ${path.basename(path.dirname(f))}/CLAUDE.md`); }
      else gaps.push(`MISSING: ${f}`);
    }
    // Stale count detection
    const stalePatterns = [/90 dispatchers/, /5,738 actions/, /2,528 engines/, /1,559 engines/, /82 dispatchers/];
    for (const f of files) {
      if (!safeExists(f)) continue;
      const content = fs.readFileSync(f, "utf8");
      for (const pat of stalePatterns) {
        if (pat.test(content)) {
          autoFixable.push(`Stale count in ${path.basename(path.dirname(f))}/CLAUDE.md: ${pat.source}`);
        }
      }
    }
    const score = (present / files.length) * (autoFixable.length === 0 ? 1 : 0.8);
    return {
      pillar: "claude_md", score: Number(score.toFixed(3)),
      evidence, gaps, autoFixable, reviewRequired: [],
    };
  }

  private auditSkills(): PillarScore {
    const evidence: string[] = []; const gaps: string[] = [];
    const userDir = "H:/.claude/commands";
    const localDir = `${REPO_ROOT}/.claude/commands`;
    const userCount = safeExists(userDir) ? fs.readdirSync(userDir).filter(f => f.endsWith(".md")).length : 0;
    const localCount = safeExists(localDir) ? fs.readdirSync(localDir).filter(f => f.endsWith(".md")).length : 0;
    evidence.push(`user-level: ${userCount} skills`);
    evidence.push(`local: ${localCount} skills`);
    const critical = ["pdf-learn", "video-learn", "dedup", "forge-triple", "shop-knowledge",
                      "wire-edm-studio", "lathe-studio", "machine-harden", "auto-speed-feed",
                      "program-optimize", "scrutinize", "quote-to-ship", "smart"];
    let criticalPresent = 0;
    for (const c of critical) {
      if (safeExists(`${userDir}/${c}.md`) || safeExists(`${localDir}/${c}.md`)) criticalPresent++;
      else gaps.push(`MISSING critical: /${c}`);
    }
    const score = (userCount > 100 ? 0.5 : userCount / 200) +
                  (criticalPresent / critical.length) * 0.5;
    return {
      pillar: "skills", score: Number(Math.min(1, score).toFixed(3)),
      evidence, gaps, autoFixable: [], reviewRequired: gaps,
    };
  }

  private auditScripts(): PillarScore {
    const evidence: string[] = []; const gaps: string[] = [];
    const rootScripts = safeExists(`${REPO_ROOT}/scripts`) ? fs.readdirSync(`${REPO_ROOT}/scripts`).filter(f => /\.(mjs|js|ts|sh)$/.test(f)).length : 0;
    const mcpScripts = safeExists(`${MCP_ROOT}/scripts`) ? fs.readdirSync(`${MCP_ROOT}/scripts`).filter(f => /\.(mjs|js|ts|sh)$/.test(f)).length : 0;
    const total = rootScripts + mcpScripts;
    evidence.push(`scripts/ root: ${rootScripts}`);
    evidence.push(`mcp-server/scripts/: ${mcpScripts}`);
    let referenced = 0;
    if (safeExists(`${MCP_ROOT}/package.json`)) {
      const pkg = JSON.parse(fs.readFileSync(`${MCP_ROOT}/package.json`, "utf8"));
      referenced = Object.values(pkg.scripts || {}).filter((v: any) => typeof v === "string" && v.includes("scripts/")).length;
    }
    evidence.push(`npm script references: ${referenced}`);
    // Score: presence + reasonable referencing
    const score = total > 0 ? Math.min(1, 0.7 + (referenced / 30) * 0.3) : 0;
    return {
      pillar: "scripts", score: Number(score.toFixed(3)),
      evidence, gaps, autoFixable: [], reviewRequired: [],
    };
  }

  private auditHooks(): PillarScore {
    const evidence: string[] = []; const gaps: string[] = [];
    const reviewRequired: string[] = [];
    const hooksDir = `${REPO_ROOT}/.claude/hooks`;
    if (!safeExists(hooksDir)) {
      return {
        pillar: "hooks", score: 0, evidence: [], gaps: ["MISSING hooks directory"],
        autoFixable: [], reviewRequired: ["No .claude/hooks/ directory found"],
      };
    }
    const mjsFiles = fs.readdirSync(hooksDir).filter(f => f.endsWith(".mjs"));
    const settingsPath = `${REPO_ROOT}/.claude/settings.json`;
    let wired = 0;
    let allCmds = "";
    if (safeExists(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
      const events = Object.values(settings.hooks || {}) as any[];
      const cmds: string[] = [];
      for (const matchers of events) {
        for (const m of matchers as any[]) {
          for (const h of m.hooks || []) {
            if (h.command) cmds.push(h.command);
          }
        }
      }
      allCmds = cmds.join(" ");
    }
    for (const f of mjsFiles) {
      if (allCmds.includes(f)) wired++;
      else reviewRequired.push(`Orphan hook: ${f}`);
    }
    evidence.push(`mjs files: ${mjsFiles.length}`);
    evidence.push(`wired: ${wired}`);
    return {
      pillar: "hooks", score: mjsFiles.length > 0 ? wired / mjsFiles.length : 0,
      evidence, gaps, autoFixable: [], reviewRequired,
    };
  }

  private auditAwareness(): PillarScore {
    const evidence: string[] = []; const gaps: string[] = []; const autoFixable: string[] = [];
    const files = [
      ["MASTER_INDEX_COMPACT.md", `${MCP_ROOT}/MASTER_INDEX_COMPACT.md`],
      ["ENGINE_DIGEST.md", `${MCP_ROOT}/data/docs/ENGINE_DIGEST.md`],
      ["DISPATCHER_DIGEST.md", `${MCP_ROOT}/data/docs/DISPATCHER_DIGEST.md`],
      ["DIRECTORY_DIGEST.md", `${MCP_ROOT}/data/docs/DIRECTORY_DIGEST.md`],
      ["BASELINE_INVENTORY.json", `${MCP_ROOT}/data/state/BASELINE_INVENTORY.json`],
      ["PRISM-INVENTORY-LATEST.md", `${REPO_ROOT}/PRISM-INVENTORY-LATEST.md`],
    ];
    let present = 0;
    for (const [name, p] of files) {
      if (safeExists(p)) {
        present++;
        const age = ageMinutes(p);
        if (age > 7 * 24 * 60) {
          autoFixable.push(`Stale ${name} (age ${Math.floor(age / (24*60))}d) — regenerate`);
        }
        evidence.push(`OK: ${name}`);
      } else {
        gaps.push(`MISSING: ${name}`);
      }
    }
    // self-awareness engines
    const engines = ["PRISMSelfAwarenessEngine", "DuplicationGuardEngine", "AISystemRouterEngine"];
    for (const e of engines) {
      if (safeExists(`${MCP_ROOT}/src/engines/${e}.ts`)) { present++; evidence.push(`OK: ${e}`); }
      else gaps.push(`MISSING engine: ${e}`);
    }
    const total = files.length + engines.length;
    return {
      pillar: "awareness", score: Number((present / total).toFixed(3)),
      evidence, gaps, autoFixable, reviewRequired: [],
    };
  }

  private auditMemory(): PillarScore {
    const evidence: string[] = []; const gaps: string[] = [];
    const memDir = "C:/Users/wompu/.claude/projects/H--prism/memory";
    const memFile = `${memDir}/MEMORY.md`;
    let score = 0;
    if (safeExists(memFile)) {
      score += 0.4;
      evidence.push("OK: MEMORY.md exists");
      const lines = fs.readFileSync(memFile, "utf8").split("\n").length;
      evidence.push(`lines: ${lines}`);
    } else gaps.push("MISSING: MEMORY.md");
    if (safeExists(memDir)) {
      const files = fs.readdirSync(memDir).filter(f => f.endsWith(".md"));
      evidence.push(`memory files: ${files.length}`);
      if (files.length > 10) score += 0.3;
      // recent writes
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60_000;
      const recent = files.filter(f => {
        const s = safeStat(`${memDir}/${f}`);
        return s && s.mtimeMs > sevenDaysAgo;
      }).length;
      evidence.push(`recent (7d): ${recent}`);
      if (recent >= 5) score += 0.3;
    } else gaps.push("MISSING memory directory");
    return {
      pillar: "memory", score: Number(score.toFixed(3)),
      evidence, gaps, autoFixable: [], reviewRequired: [],
    };
  }

  private auditContainers(): PillarScore {
    const evidence: string[] = []; const gaps: string[] = []; const reviewRequired: string[] = [];
    const composePath = `${REPO_ROOT}/docker-compose.yml`;
    let score = 0;
    if (safeExists(composePath)) {
      score += 0.3;
      const content = fs.readFileSync(composePath, "utf8");
      const services = (content.match(/^  [a-z][a-zA-Z0-9_-]*:/gm) || []).length;
      evidence.push(`compose services: ${services}`);
      if (services >= 5) score += 0.2;
    } else gaps.push("MISSING docker-compose.yml");
    // Docker daemon health
    try {
      execSync("docker ps", { stdio: "ignore", timeout: 2_000 });
      score += 0.5;
      evidence.push("OK: docker daemon up");
    } catch {
      reviewRequired.push("Docker daemon unreachable (start Docker Desktop)");
    }
    return {
      pillar: "containers", score: Number(score.toFixed(3)),
      evidence, gaps, autoFixable: [], reviewRequired,
    };
  }

  private auditAISystem(): PillarScore {
    const evidence: string[] = []; const gaps: string[] = [];
    const enginesDir = `${MCP_ROOT}/src/engines`;
    if (!safeExists(enginesDir)) {
      return {
        pillar: "ai_system", score: 0, evidence: [], gaps: ["MISSING engines directory"],
        autoFixable: [], reviewRequired: [],
      };
    }
    const all = fs.readdirSync(enginesDir).filter(f => f.endsWith(".ts"));
    const aiFlavored = all.filter(f =>
      /(SelfAware|Creative|Reasoning|MultiPath|ExtendedThinking|DeepLearning|Neural|Cognitive|Meta|Bayesian|RL|Agentic|Intelligence)/i.test(f)
    );
    evidence.push(`AI-flavored engines: ${aiFlavored.length}`);
    const critical = [
      "PRISMSelfAwarenessEngine", "PRISMCreativeReasoningEngine",
      "ManufacturingReasoningEngine", "MultiPathReasoningEngine",
      "ExtendedThinkingBridgeEngine", "CrossDisciplinaryDeepLearningEngine",
      "DuplicationGuardEngine", "AgenticLoopEngine", "ContextRetentionEngine",
      "LearningLoopEngine", "IntentRouterEngine", "AISystemRouterEngine",
    ];
    let criticalPresent = 0;
    for (const e of critical) {
      if (safeExists(`${enginesDir}/${e}.ts`)) criticalPresent++;
      else gaps.push(`MISSING critical: ${e}`);
    }
    const score = Math.min(1, (aiFlavored.length / 100) * 0.3 + (criticalPresent / critical.length) * 0.7);
    return {
      pillar: "ai_system", score: Number(score.toFixed(3)),
      evidence, gaps, autoFixable: [], reviewRequired: [],
    };
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private hasNpmScript(name: string): boolean {
    const pkgPath = `${MCP_ROOT}/package.json`;
    if (!safeExists(pkgPath)) return false;
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      return Boolean(pkg.scripts?.[name]);
    } catch { return false; }
  }

  private countDispatchers(): number {
    const dir = `${MCP_ROOT}/src/tools/dispatchers`;
    if (!safeExists(dir)) return 0;
    return fs.readdirSync(dir).filter(f => f.endsWith(".ts") && !f.startsWith("index")).length;
  }
}

export const systemUtilizationAuditEngine = new SystemUtilizationAuditEngine();
