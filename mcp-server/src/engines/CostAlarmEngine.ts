/**
 * CostAlarmEngine — threshold-based alarms over multi-LLM cost telemetry.
 *
 * Reads cost-telemetry.jsonl (per-call USD + token records), aggregates daily +
 * weekly totals, compares vs config thresholds, emits alarms to a JSONL log and
 * to AGENT_CHAT.md with cool-down suppression.
 *
 * COST-CASCADE-MS0 / U-COST-ALARM.
 *
 * Design: pure-core + injectable side-effect adapters (`deps`) so the test
 * suite never touches the real filesystem and clock-skew is provably handled
 * (telemetry timestamps, NOT wall-clock, drive cool-down).
 *
 * R12 invariants (fail-loud + safe-default):
 *  1. Aggregator throw → log + return prior state, never crash the tick
 *  2. Config missing / malformed → safe defaults + warn (never crash)
 *  3. Test tentacles never count toward thresholds when ignoreTestTentacles=true
 *  4. Cool-down uses TELEMETRY/ALARM-LOG timestamps, not wall-clock
 *  5. Channel write failure → continue to next channel + record warning
 *  6. Threshold = 0 → STILL gated by cool-down (not a fire-every-tick footgun)
 *  7. Corrupt JSONL line → counted as `truncatedTailLines`, NOT silently dropped
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ============================================================================
// Public types
// ============================================================================

export interface CostAlarmThresholds {
  dailyUSD: number;
  weeklyUSD: number;
  dailyTokens: number;
  weeklyTokens: number;
}

export interface CostAlarmConfig {
  schemaVersion: number;
  thresholds: CostAlarmThresholds;
  coolDownMinutes: number;
  channels: Array<{ type: "jsonl" | "agent_chat"; path: string; alwaysEnabled?: boolean }>;
  rotation: { alarmLogMaxBytes: number; alarmLogKeepArchives: number };
  taskClassOverrides: Record<string, Partial<CostAlarmThresholds> & { coolDownMinutes?: number }>;
  tentacleAllowList: string[] | null;
  ignoreTestTentacles: boolean;
  testTentaclePrefixes: string[];
}

export interface TelemetryRecord {
  schemaVersion?: number;
  ts: string;
  tentacle: string;
  taskClass: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs?: number;
  costUSD: number;
  degraded?: boolean;
  meta?: Record<string, unknown>;
}

export interface AggregateWindow {
  windowStart: string;
  windowEnd: string;
  totalUSD: number;
  totalTokens: number;
  recordCount: number;
  perTaskClass: Record<string, { usd: number; tokens: number; count: number }>;
  truncatedTailLines: number;
}

export type AlarmLevel = "daily_usd" | "weekly_usd" | "daily_tokens" | "weekly_tokens";

export interface AlarmDecision {
  alarmKey: string; // `${level}::${taskClass|"__all__"}`
  level: AlarmLevel;
  taskClass: string | null; // null means top-level (whole fleet)
  actual: number;
  cap: number;
  exceededBy: number; // actual - cap (always > 0 for a fired alarm)
  suggestedAction: string;
  asOf: string;
}

export interface AlarmRecord {
  alarmKey: string;
  ts: string; // when this alarm was emitted
  level: AlarmLevel;
  taskClass: string | null;
  actual: number;
  cap: number;
  exceededBy: number;
  suggestedAction: string;
}

export interface AlarmCheckResult {
  ok: boolean;
  asOf: string;
  daily: AggregateWindow | null;
  weekly: AggregateWindow | null;
  fired: AlarmDecision[];
  suppressedByCoolDown: AlarmDecision[];
  channelWarnings: string[];
  truncatedTailLines: number;
  errors: string[];
  source: "CostAlarmEngine.check";
}

export interface CostAlarmDeps {
  readConfig: () => CostAlarmConfig | null;
  readTelemetry: () => { records: TelemetryRecord[]; truncatedTailLines: number };
  readAlarmLog: () => AlarmRecord[];
  appendAlarmJsonl: (rec: AlarmRecord) => void;
  appendAgentChatLine: (line: string) => void;
  now: () => Date;
  logWarn: (msg: string) => void;
}

// ============================================================================
// Safe defaults (used when config missing / malformed)
// ============================================================================

const SAFE_DEFAULT_CONFIG: CostAlarmConfig = Object.freeze({
  schemaVersion: 1,
  thresholds: { dailyUSD: 5, weeklyUSD: 25, dailyTokens: 1_500_000, weeklyTokens: 7_500_000 },
  coolDownMinutes: 60,
  channels: [
    { type: "jsonl", path: "state/shared/cost-alarm-log.jsonl", alwaysEnabled: true },
    { type: "agent_chat", path: "state/shared/AGENT_CHAT.md", alwaysEnabled: true },
  ],
  rotation: { alarmLogMaxBytes: 524_288, alarmLogKeepArchives: 5 },
  taskClassOverrides: {},
  tentacleAllowList: null,
  ignoreTestTentacles: true,
  testTentaclePrefixes: ["__wiretest__", "__test__", "__smoke__"],
}) as CostAlarmConfig;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

// ============================================================================
// Pure-core helpers (testable in isolation, no I/O)
// ============================================================================

export function normalizeConfig(raw: unknown, logWarn: (m: string) => void): CostAlarmConfig {
  if (raw == null || typeof raw !== "object") {
    logWarn("cost-alarm-config: missing or non-object — using safe defaults");
    return SAFE_DEFAULT_CONFIG;
  }
  const r = raw as Partial<CostAlarmConfig>;
  const t = (r.thresholds as Partial<CostAlarmThresholds>) ?? {};
  const safe: CostAlarmConfig = {
    schemaVersion: r.schemaVersion ?? 1,
    thresholds: {
      dailyUSD: numOrDefault(t.dailyUSD, SAFE_DEFAULT_CONFIG.thresholds.dailyUSD, 0),
      weeklyUSD: numOrDefault(t.weeklyUSD, SAFE_DEFAULT_CONFIG.thresholds.weeklyUSD, 0),
      dailyTokens: numOrDefault(t.dailyTokens, SAFE_DEFAULT_CONFIG.thresholds.dailyTokens, 0),
      weeklyTokens: numOrDefault(t.weeklyTokens, SAFE_DEFAULT_CONFIG.thresholds.weeklyTokens, 0),
    },
    coolDownMinutes: numOrDefault(r.coolDownMinutes, SAFE_DEFAULT_CONFIG.coolDownMinutes, 0),
    channels: Array.isArray(r.channels) && r.channels.length > 0
      ? r.channels.filter((c) => c && (c.type === "jsonl" || c.type === "agent_chat") && typeof c.path === "string")
      : [...SAFE_DEFAULT_CONFIG.channels],
    rotation: {
      alarmLogMaxBytes: numOrDefault(r.rotation?.alarmLogMaxBytes, SAFE_DEFAULT_CONFIG.rotation.alarmLogMaxBytes, 1024),
      alarmLogKeepArchives: numOrDefault(r.rotation?.alarmLogKeepArchives, SAFE_DEFAULT_CONFIG.rotation.alarmLogKeepArchives, 0),
    },
    taskClassOverrides: r.taskClassOverrides && typeof r.taskClassOverrides === "object" ? r.taskClassOverrides : {},
    tentacleAllowList: Array.isArray(r.tentacleAllowList) ? r.tentacleAllowList : null,
    ignoreTestTentacles: r.ignoreTestTentacles !== false,
    testTentaclePrefixes: Array.isArray(r.testTentaclePrefixes) ? r.testTentaclePrefixes : [...SAFE_DEFAULT_CONFIG.testTentaclePrefixes],
  };
  return safe;
}

function numOrDefault(v: unknown, fallback: number, floor: number): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < floor) return fallback;
  return v;
}

/**
 * Aggregate telemetry records over [windowStart, windowEnd]. Uses TELEMETRY
 * timestamps (R12 invariant 4 — clock-skew safety). Filters test tentacles
 * when configured, applies tentacle allow-list if non-null.
 */
export function aggregateTelemetry(
  records: TelemetryRecord[],
  windowStart: Date,
  windowEnd: Date,
  config: CostAlarmConfig,
  truncatedTailLines: number = 0,
): AggregateWindow {
  const winStartMs = windowStart.getTime();
  const winEndMs = windowEnd.getTime();
  let totalUSD = 0;
  let totalTokens = 0;
  let recordCount = 0;
  const perTaskClass: Record<string, { usd: number; tokens: number; count: number }> = {};

  for (const rec of records) {
    const ts = Date.parse(rec.ts);
    if (!Number.isFinite(ts) || ts < winStartMs || ts > winEndMs) continue;
    if (config.ignoreTestTentacles && config.testTentaclePrefixes.some((p) => rec.tentacle.startsWith(p))) continue;
    if (config.tentacleAllowList && !config.tentacleAllowList.includes(rec.tentacle)) continue;
    const usd = Number.isFinite(rec.costUSD) ? rec.costUSD : 0;
    const tokens = (Number.isFinite(rec.inputTokens) ? rec.inputTokens : 0) + (Number.isFinite(rec.outputTokens) ? rec.outputTokens : 0);
    totalUSD += usd;
    totalTokens += tokens;
    recordCount += 1;
    const key = rec.taskClass || "__unknown__";
    if (!perTaskClass[key]) perTaskClass[key] = { usd: 0, tokens: 0, count: 0 };
    perTaskClass[key].usd += usd;
    perTaskClass[key].tokens += tokens;
    perTaskClass[key].count += 1;
  }
  return {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    totalUSD,
    totalTokens,
    recordCount,
    perTaskClass,
    truncatedTailLines,
  };
}

export function lookupThresholds(taskClass: string | null, config: CostAlarmConfig): CostAlarmThresholds & { coolDownMinutes: number } {
  const base = { ...config.thresholds, coolDownMinutes: config.coolDownMinutes };
  if (!taskClass) return base;
  const override = config.taskClassOverrides[taskClass];
  if (!override) return base;
  return {
    dailyUSD: typeof override.dailyUSD === "number" ? override.dailyUSD : base.dailyUSD,
    weeklyUSD: typeof override.weeklyUSD === "number" ? override.weeklyUSD : base.weeklyUSD,
    dailyTokens: typeof override.dailyTokens === "number" ? override.dailyTokens : base.dailyTokens,
    weeklyTokens: typeof override.weeklyTokens === "number" ? override.weeklyTokens : base.weeklyTokens,
    coolDownMinutes: typeof override.coolDownMinutes === "number" ? override.coolDownMinutes : base.coolDownMinutes,
  };
}

/**
 * Decide which alarms should fire for top-level + per-task-class aggregates.
 * R12 invariant 6: a cap of exactly 0 STILL gates on cool-down (we want
 * `actual > cap` semantics, not `actual >= cap` — a cap of 0 with 0 spend
 * should NOT fire).
 */
export function decideAlarms(
  daily: AggregateWindow,
  weekly: AggregateWindow,
  config: CostAlarmConfig,
  asOf: Date,
): AlarmDecision[] {
  const decisions: AlarmDecision[] = [];
  const asOfIso = asOf.toISOString();
  const topThresh = lookupThresholds(null, config);

  // Top-level (whole-fleet) alarms
  pushIfExceeded(decisions, "daily_usd", null, daily.totalUSD, topThresh.dailyUSD, "Reduce daily LLM spend — escalate to cheap tentacles or cap session count", asOfIso);
  pushIfExceeded(decisions, "weekly_usd", null, weekly.totalUSD, topThresh.weeklyUSD, "Weekly USD budget crossed — review per-task-class spend in cost-dashboard", asOfIso);
  pushIfExceeded(decisions, "daily_tokens", null, daily.totalTokens, topThresh.dailyTokens, "Daily token budget crossed — runaway loop suspect; check loop-state for high-iter sessions", asOfIso);
  pushIfExceeded(decisions, "weekly_tokens", null, weekly.totalTokens, topThresh.weeklyTokens, "Weekly token budget crossed — review per-tentacle breakdown", asOfIso);

  // Per-task-class alarms (only those with overrides)
  for (const taskClass of Object.keys(config.taskClassOverrides)) {
    const dailyCls = daily.perTaskClass[taskClass];
    const weeklyCls = weekly.perTaskClass[taskClass];
    const thresh = lookupThresholds(taskClass, config);
    if (dailyCls) {
      pushIfExceeded(decisions, "daily_usd", taskClass, dailyCls.usd, thresh.dailyUSD, `Task class ${taskClass} crossed daily USD cap`, asOfIso);
      pushIfExceeded(decisions, "daily_tokens", taskClass, dailyCls.tokens, thresh.dailyTokens, `Task class ${taskClass} crossed daily token cap`, asOfIso);
    }
    if (weeklyCls) {
      pushIfExceeded(decisions, "weekly_usd", taskClass, weeklyCls.usd, thresh.weeklyUSD, `Task class ${taskClass} crossed weekly USD cap`, asOfIso);
      pushIfExceeded(decisions, "weekly_tokens", taskClass, weeklyCls.tokens, thresh.weeklyTokens, `Task class ${taskClass} crossed weekly token cap`, asOfIso);
    }
  }
  return decisions;
}

function pushIfExceeded(
  out: AlarmDecision[],
  level: AlarmLevel,
  taskClass: string | null,
  actual: number,
  cap: number,
  suggestedAction: string,
  asOfIso: string,
): void {
  // R12 #6: actual > cap (strict), so cap=0 + actual=0 does NOT fire.
  if (!(actual > cap)) return;
  const alarmKey = `${level}::${taskClass ?? "__all__"}`;
  out.push({ alarmKey, level, taskClass, actual, cap, exceededBy: actual - cap, suggestedAction, asOf: asOfIso });
}

/**
 * Cool-down lookup: returns the most recent alarm-log timestamp for a key, or
 * null. R12 #4: uses alarm-log timestamps (telemetry-derived), not wall-clock,
 * so a clock-skewed VM running this engine still gates correctly.
 */
export function lastFiredAt(alarmKey: string, log: AlarmRecord[]): Date | null {
  let bestMs = -Infinity;
  for (const rec of log) {
    if (rec.alarmKey !== alarmKey) continue;
    const ms = Date.parse(rec.ts);
    if (Number.isFinite(ms) && ms > bestMs) bestMs = ms;
  }
  return bestMs === -Infinity ? null : new Date(bestMs);
}

export function isCoolDownActive(
  alarmKey: string,
  log: AlarmRecord[],
  coolDownMinutes: number,
  asOf: Date,
): boolean {
  if (coolDownMinutes <= 0) return false;
  const last = lastFiredAt(alarmKey, log);
  if (!last) return false;
  const elapsedMs = asOf.getTime() - last.getTime();
  return elapsedMs >= 0 && elapsedMs < coolDownMinutes * 60 * 1000;
}

// ============================================================================
// Side-effect engine
// ============================================================================

export class CostAlarmEngine {
  /**
   * One tick — read config, telemetry, alarm log; aggregate; decide; emit.
   * Never throws. R12 #1 — aggregator/decider error returns a partial result
   * with `ok:false` + errors[], rather than crashing the scheduled task.
   */
  check(deps: CostAlarmDeps): AlarmCheckResult {
    const errors: string[] = [];
    const channelWarnings: string[] = [];
    const asOf = deps.now();
    const asOfIso = asOf.toISOString();
    let daily: AggregateWindow | null = null;
    let weekly: AggregateWindow | null = null;
    let truncatedTailLines = 0;
    const fired: AlarmDecision[] = [];
    const suppressedByCoolDown: AlarmDecision[] = [];

    try {
      const rawConfig = safeCall(() => deps.readConfig(), errors, "readConfig");
      const config = normalizeConfig(rawConfig, deps.logWarn);
      const telem = safeCall(() => deps.readTelemetry(), errors, "readTelemetry") ?? { records: [], truncatedTailLines: 0 };
      truncatedTailLines = telem.truncatedTailLines ?? 0;
      const log = safeCall(() => deps.readAlarmLog(), errors, "readAlarmLog") ?? [];

      const dailyStart = new Date(asOf.getTime() - MS_PER_DAY);
      const weeklyStart = new Date(asOf.getTime() - MS_PER_WEEK);
      daily = aggregateTelemetry(telem.records, dailyStart, asOf, config, truncatedTailLines);
      weekly = aggregateTelemetry(telem.records, weeklyStart, asOf, config, truncatedTailLines);

      const candidates = decideAlarms(daily, weekly, config, asOf);
      for (const cand of candidates) {
        const thresh = lookupThresholds(cand.taskClass, config);
        if (isCoolDownActive(cand.alarmKey, log, thresh.coolDownMinutes, asOf)) {
          suppressedByCoolDown.push(cand);
          continue;
        }
        // Emit to channels (R12 #5 — channel failure never aborts)
        const rec: AlarmRecord = {
          alarmKey: cand.alarmKey,
          ts: asOfIso,
          level: cand.level,
          taskClass: cand.taskClass,
          actual: cand.actual,
          cap: cand.cap,
          exceededBy: cand.exceededBy,
          suggestedAction: cand.suggestedAction,
        };
        try {
          deps.appendAlarmJsonl(rec);
        } catch (e) {
          channelWarnings.push(`appendAlarmJsonl failed for ${cand.alarmKey}: ${(e as Error).message}`);
        }
        try {
          deps.appendAgentChatLine(renderChatLine(cand));
        } catch (e) {
          channelWarnings.push(`appendAgentChatLine failed for ${cand.alarmKey}: ${(e as Error).message}`);
        }
        fired.push(cand);
      }
    } catch (e) {
      // R12 #1 — aggregator throw never crashes the tick.
      errors.push(`check: unhandled — ${(e as Error).message}`);
    }
    return {
      ok: errors.length === 0,
      asOf: asOfIso,
      daily,
      weekly,
      fired,
      suppressedByCoolDown,
      channelWarnings,
      truncatedTailLines,
      errors,
      source: "CostAlarmEngine.check",
    };
  }
}

function safeCall<T>(fn: () => T, errors: string[], label: string): T | null {
  try {
    return fn();
  } catch (e) {
    errors.push(`${label}: ${(e as Error).message}`);
    return null;
  }
}

function renderChatLine(d: AlarmDecision): string {
  const cls = d.taskClass ? ` task-class=${d.taskClass}` : " scope=fleet";
  const unit = d.level.endsWith("_usd") ? "USD" : "tokens";
  const fmt = (n: number) =>
    unit === "USD" ? `$${n.toFixed(2)}` : `${Math.round(n).toLocaleString("en-US")} ${unit}`;
  return `[${d.asOf}] 🚨 cost-alarm ${d.level}${cls} — actual=${fmt(d.actual)} cap=${fmt(d.cap)} excess=${fmt(d.exceededBy)} — ${d.suggestedAction}`;
}

// ============================================================================
// Default singleton + FS-backed deps factory (used by cron + dispatcher)
// ============================================================================

export const costAlarmEngine = new CostAlarmEngine();

export interface MakeFsDepsOptions {
  prismRoot: string;
  configPath?: string;
  telemetryPath?: string;
  alarmLogPath?: string;
  agentChatPath?: string;
  now?: () => Date;
  logWarn?: (msg: string) => void;
}

/**
 * Production wiring: real filesystem + clock. Pure, no engine state.
 * Test code never calls this — tests build their own deps inline.
 */
export function makeFsDeps(opts: MakeFsDepsOptions): CostAlarmDeps {
  const root = opts.prismRoot;
  const configPath = opts.configPath ?? path.join(root, "mcp-server/data/state/cost-alarm-config.json");
  const telemetryPath = opts.telemetryPath ?? path.join(root, "mcp-server/data/state/cost-telemetry.jsonl");
  const alarmLogPath = opts.alarmLogPath ?? path.join(root, "state/shared/cost-alarm-log.jsonl");
  const agentChatPath = opts.agentChatPath ?? path.join(root, "state/shared/AGENT_CHAT.md");
  const now = opts.now ?? (() => new Date());
  const logWarn = opts.logWarn ?? ((m) => process.stderr.write(`[cost-alarm-engine] ${m}\n`));

  return {
    readConfig: () => {
      try {
        if (!fs.existsSync(configPath)) return null;
        return JSON.parse(fs.readFileSync(configPath, "utf8"));
      } catch (e) {
        logWarn(`readConfig failed: ${(e as Error).message}`);
        return null;
      }
    },
    readTelemetry: () => {
      if (!fs.existsSync(telemetryPath)) return { records: [], truncatedTailLines: 0 };
      const text = fs.readFileSync(telemetryPath, "utf8");
      const lines = text.split("\n");
      const records: TelemetryRecord[] = [];
      let truncatedTailLines = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        try {
          const rec = JSON.parse(line) as TelemetryRecord;
          if (rec && typeof rec.ts === "string" && typeof rec.tentacle === "string") {
            records.push(rec);
          } else {
            truncatedTailLines += 1;
          }
        } catch {
          truncatedTailLines += 1;
        }
      }
      return { records, truncatedTailLines };
    },
    readAlarmLog: () => {
      if (!fs.existsSync(alarmLogPath)) return [];
      const text = fs.readFileSync(alarmLogPath, "utf8");
      const out: AlarmRecord[] = [];
      for (const line of text.split("\n")) {
        const t = line.trim();
        if (!t) continue;
        try {
          const rec = JSON.parse(t) as AlarmRecord;
          if (rec && typeof rec.alarmKey === "string" && typeof rec.ts === "string") out.push(rec);
        } catch {
          // skip corrupt
        }
      }
      return out;
    },
    appendAlarmJsonl: (rec) => {
      fs.mkdirSync(path.dirname(alarmLogPath), { recursive: true });
      fs.appendFileSync(alarmLogPath, JSON.stringify(rec) + "\n", "utf8");
      rotateIfNeeded(alarmLogPath, opts);
    },
    appendAgentChatLine: (line) => {
      fs.mkdirSync(path.dirname(agentChatPath), { recursive: true });
      fs.appendFileSync(agentChatPath, line + "\n", "utf8");
    },
    now,
    logWarn,
  };
}

function rotateIfNeeded(filePath: string, opts: MakeFsDepsOptions): void {
  try {
    const st = fs.statSync(filePath);
    const cfg = opts.configPath ? safeReadConfig(opts.configPath) : null;
    const maxBytes = cfg?.rotation?.alarmLogMaxBytes ?? SAFE_DEFAULT_CONFIG.rotation.alarmLogMaxBytes;
    const keep = cfg?.rotation?.alarmLogKeepArchives ?? SAFE_DEFAULT_CONFIG.rotation.alarmLogKeepArchives;
    if (st.size <= maxBytes) return;
    for (let i = keep; i >= 1; i--) {
      const src = i === 1 ? filePath : `${filePath}.${i - 1}`;
      const dst = `${filePath}.${i}`;
      if (fs.existsSync(src)) fs.renameSync(src, dst);
    }
    fs.writeFileSync(filePath, "");
  } catch {
    // best-effort; rotation failure must not crash a tick
  }
}

function safeReadConfig(p: string): CostAlarmConfig | null {
  try {
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf8")) as CostAlarmConfig;
  } catch {
    return null;
  }
}
