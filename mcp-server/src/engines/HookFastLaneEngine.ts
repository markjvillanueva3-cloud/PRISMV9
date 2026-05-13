/**
 * HookFastLaneEngine — HOOK-SYNERGY-MS0 / U-HOOK-FAST-LANE (H6)
 *
 * Splits broad PreToolUse / PostToolUse matchers in a Claude Code settings.json
 * into a *fast lane* for read-only tools (Read / Glob / Grep) and a *slow lane*
 * for write/edit/bash tools (Edit / Write / MultiEdit / NotebookEdit / Bash).
 *
 * Why this matters:
 *   - In the current shape, `PreToolUse matcher=".*"` and `PostToolUse matcher="Bash|Read"`
 *     fire on every Read tool call, even though most of the hooks they contain
 *     only mutate state on writes or only parse bash stdout. That's ~26 hook
 *     fires per Read in H:/prism alone (vs ~34 per Edit) — the read path is
 *     paying ~76% of the write path's cost.
 *   - This engine consumes the H3 `// tier:` frontmatter (T0-T4) PLUS a small
 *     deterministic name-pattern classifier, decides per-hook whether it's
 *     `fast-lane-safe`, `slow-lane-only`, or `both`, then proposes a new
 *     `hooks` block where the broad matcher is bifurcated.
 *
 * Pure w.r.t. disk: every public method takes the parsed settings JSON + a
 * `tierLookup(hookPath)` function and returns plans / new JSON. The matching
 * script (`scripts/apply-hook-fast-lane.mjs`) owns all I/O.
 *
 * Conservative by default:
 *   - Untagged hooks (no `// tier:`) are treated as slow-lane-only (safer to
 *     over-fire than to silently skip a hook that genuinely needed the event).
 *   - T0 critical blockers default to `both` unless their basename explicitly
 *     matches a write-only pattern (e.g. `*-edit-*`, `*-write-*`).
 *   - When a matcher block has ZERO fast-lane-safe hooks, the engine emits
 *     no new fast-lane block (no churn for blocks that are already correct).
 *
 * Reversible: the proposed JSON is a pure value; nothing is mutated in-place
 * unless the apply script writes it back (with a `.bak` of the prior file).
 */

// ── Public types ─────────────────────────────────────────────────────────────

export type HookTier = "T0" | "T1" | "T2" | "T3" | "T4" | "untagged" | "unknown";

export type FastLaneDecision = "fast-lane" | "slow-lane" | "both";

export interface HookEntry {
  /** Free-form command string from settings.json (we don't execute it). */
  command: string;
  /** Optional timeout (settings.json field). Preserved verbatim in output. */
  timeout?: number;
  /** Optional hook type tag — preserved. */
  type?: string;
  // ALLOW additional unknown fields — we round-trip them rather than drop.
  [extra: string]: unknown;
}

export interface MatcherBlock {
  /** Tool name regex; empty string / undefined = "any tool" (catch-all). */
  matcher?: string;
  hooks: HookEntry[];
  // Round-trip any extra fields settings.json grows in the future.
  [extra: string]: unknown;
}

export interface SettingsHooks {
  // Each known event maps to an array of matcher blocks.
  PreToolUse?: MatcherBlock[];
  PostToolUse?: MatcherBlock[];
  SessionStart?: MatcherBlock[];
  Stop?: MatcherBlock[];
  PreCompact?: MatcherBlock[];
  UserPromptSubmit?: MatcherBlock[];
  SubagentStart?: MatcherBlock[];
  SubagentStop?: MatcherBlock[];
  // Anything else round-trips verbatim.
  [extra: string]: MatcherBlock[] | undefined;
}

export interface SettingsShape {
  hooks?: SettingsHooks;
  // Round-trip all other top-level keys verbatim (permissions, env, etc).
  [extra: string]: unknown;
}

export interface HookClassification {
  /** Resolved absolute path to the .mjs (best-effort; "" if unparseable). */
  hookPath: string;
  /** Filename minus `.mjs` extension (for display). */
  basename: string;
  tier: HookTier;
  decision: FastLaneDecision;
  /** Short human-readable reason (used in proposal logs + diffs). */
  reason: string;
  /** Pass-through of the original `command` so the consumer can splice it. */
  command: string;
}

export interface BlockSplit {
  /** Event the block belonged to. */
  event: string;
  /** Original matcher (verbatim, including undefined catch-alls). */
  originalMatcher: string | undefined;
  /**
   * Matcher the slow-lane (or "narrowed") block uses after rewrite. Differs
   * from `originalMatcher` only when `shouldNarrow` is true.
   */
  narrowedMatcher: string | undefined;
  /**
   * True when the engine wants to REWRITE the block's matcher to exclude
   * Read/Glob/Grep (e.g. `.*` → allowlist, `Bash|Read` → `Bash`). Independent
   * of `emitFastLane` — a block may need to narrow even when there's nothing
   * to push to a sibling (all hooks were slow-lane to begin with).
   */
  shouldNarrow: boolean;
  /** Hooks that survive in the slow-lane variant of this block. */
  slowLaneHooks: HookEntry[];
  /** Hooks that should be moved into a sibling fast-lane (Read|Glob|Grep) block. */
  fastLaneHooks: HookEntry[];
  /** Per-hook classification, in source order. */
  classifications: HookClassification[];
  /**
   * True when the engine wants to EMIT a sibling fast-lane block. Requires
   * the original block to be broad AND to contain at least one read-relevant
   * hook AND at least one non-read-only hook. When false, the block is either
   * left verbatim (shouldNarrow=false) or just has its matcher rewritten in
   * place (shouldNarrow=true, all hooks kept).
   */
  emitFastLane: boolean;
}

export interface FastLanePlan {
  /** Per-event splits the engine recommends. */
  splits: BlockSplit[];
  /** Forecast of hook fires per representative tool, before/after. */
  forecast: ForecastReport;
  /** Warnings the engine emitted while building the plan. */
  warnings: string[];
}

export interface ForecastReport {
  perTool: Record<string, { before: number; after: number; deltaPct: number }>;
  totalBefore: number;
  totalAfter: number;
  readPathReductionPct: number;
}

export interface HookFastLaneEngineOptions {
  /**
   * Resolve a hook .mjs path to its `// tier:` tag. The engine itself never
   * touches disk; callers supply this so the engine stays pure.
   */
  tierLookup: (hookPath: string) => HookTier;
  /**
   * Optional override: extra basename patterns (regex source) treated as
   * write/bash-only (move to slow-lane). Merged with the built-in list.
   */
  extraWriteOnlyPatterns?: string[];
  /**
   * Optional override: basenames considered read-relevant (force into
   * fast-lane). Merged with the built-in list.
   */
  extraReadRelevantPatterns?: string[];
}

// ── Constants (heuristic classifier) ─────────────────────────────────────────

/**
 * Basename substring patterns that signal a hook is meaningful only on writes
 * or only on bash stdout. Used to demote broad-matcher hooks to slow-lane.
 *
 * These are deliberately conservative: a false positive here moves a hook
 * into slow-lane (where it still fires on writes), it does NOT silently drop
 * the hook. The worst case is "slightly fewer hook fires on reads" which is
 * exactly the goal of the unit.
 */
const WRITE_ONLY_BASENAME_PATTERNS: ReadonlyArray<RegExp> = [
  /-edit-/,                    // edit-bundle, edit-multiedit-suggest
  /-write/,                    // write-tracker, write-import-check
  /-multiedit/,                // edit-multiedit-suggest (also matches multi)
  /^edit-/,                    //
  /^write-/,                   //
  /-lint-/,                    // auto-lint-post-edit
  /-on-write/,                 // inventory-on-write
  /-canonical-constants-guard/,// physics-canonical-constants-guard
  /^build-/,                   // build-cache-manager, build-tracker
  /-build-/,                   //
  /^tsc-/,                     // tsc-error-dedup
  /^vitest-/,                  // vitest-output-condenser
  /^npm-/,                     // npm-output-condenser
  /^git-/,                     // git-output-condenser (git output → bash only)
  /^auto-lint-/,               //
  /-provenance-guard/,         // jm-die-provenance-guard
  /-creation-gate/,            // hook-creation-gate
  /-cross-worktree-block/,     // hook-cross-worktree-block (only fires Edit|Write|MultiEdit anyway)
  /-import-check/,             // write-import-check
  /-tier-validator/,           // hook-tier-validator (only Edit/Write/MultiEdit)
];

/**
 * Basename substring patterns for hooks that genuinely care about read-only
 * tool calls and MUST stay in the fast lane.
 */
const READ_RELEVANT_BASENAME_PATTERNS: ReadonlyArray<RegExp> = [
  /-read-/,                    //
  /^read-/,                    // read-bundle, read-once-cache
  /-once-cache/,               //
  /^recall-/,                  // recall-counter-track
  /^grep-/,                    // grep-index-first, grep-result-cache
  /^glob-/,                    // glob-narrow-path
  /-result-cache/,             //
  /-counter-track/,            //
];

/** Catch-all matchers (fire on every tool call, regardless of tool name). */
const CATCH_ALL_MATCHERS: ReadonlySet<string> = new Set([".*", "", "*"]);

/** Matchers that already exclude reads — no split needed. */
const SLOW_LANE_ONLY_MATCHERS: ReadonlyArray<RegExp> = [
  /^Edit\|Write\|MultiEdit$/,
  /^Write\|Edit\|MultiEdit$/,
  /^\^?\(Edit\|Write\|MultiEdit(\|NotebookEdit)?\)\$?$/,
  /^\^Bash\$?$/,
  /^Bash$/,
  /^\^Write\$$/,
  /^\^?\(Write\|Edit(\|Bash)?\)\$?$/,
  /^\^?\(Edit\|Write\|MultiEdit\)\$?$/,
];

/** Matchers that already explicitly target reads — these are the fast lane. */
const FAST_LANE_ONLY_MATCHERS: ReadonlyArray<RegExp> = [
  /^Read$/,
  /^Glob$/,
  /^Grep$/,
  /^Glob\|Grep$/,
  /^\^?\(Read\|Glob\|Grep\)\$?$/,
];

/** Tools we forecast fire-counts for. Representative spread, not exhaustive. */
const FORECAST_TOOLS: ReadonlyArray<string> = [
  "Read", "Glob", "Grep",        // fast lane
  "Edit", "Write", "MultiEdit",  // slow lane (writes)
  "Bash",                        // slow lane (shell)
  "Agent", "Task",               // slow lane (orchestration)
];

const HOOK_PATH_RE = /(H:[/\\][^"' ]+\.mjs)/i;
const BASENAME_RE = /([\w-]+)\.mjs/i;

/** The fast-lane matcher we emit. Anchored regex covers exactly the 3 read tools. */
export const FAST_LANE_MATCHER = "^(Read|Glob|Grep)$";

/**
 * When a catch-all matcher (`""`, `*`, `.*`) is bifurcated, its slow-lane
 * sibling needs to STOP matching read tools. We replace the catch-all with
 * this anchored regex of non-read tools. Coverage list is conservative: any
 * tool not enumerated here will silently stop firing the original block — so
 * the list must include every slow-lane-relevant tool Claude Code uses.
 *
 * NotebookEdit, Skill, TaskCreate are explicit. `mcp__.*` covers all MCP
 * tools (prism dispatchers, plugin tools). `.*[^Read|Glob|Grep].*` would be
 * tighter but JS regex doesn't support negative alternation cleanly — the
 * explicit allow-list reads better and is auditable.
 */
export const SLOW_LANE_NARROWED_MATCHER =
  "^(Bash|Edit|Write|MultiEdit|NotebookEdit|Agent|Task|TaskCreate|Skill|mcp__.*)$";

/** Minimum hooks in a block before bifurcation is worth the structural churn. */
export const MIN_BLOCK_SIZE_FOR_SPLIT = 2;

// ── Implementation ───────────────────────────────────────────────────────────

export class HookFastLaneEngine {
  private readonly opts: HookFastLaneEngineOptions;
  private readonly writePatterns: ReadonlyArray<RegExp>;
  private readonly readPatterns: ReadonlyArray<RegExp>;

  constructor(opts: HookFastLaneEngineOptions) {
    this.opts = opts;
    this.writePatterns = [
      ...WRITE_ONLY_BASENAME_PATTERNS,
      ...(opts.extraWriteOnlyPatterns ?? []).map((s) => new RegExp(s)),
    ];
    this.readPatterns = [
      ...READ_RELEVANT_BASENAME_PATTERNS,
      ...(opts.extraReadRelevantPatterns ?? []).map((s) => new RegExp(s)),
    ];
  }

  /**
   * Classify a single hook entry given its enclosing matcher. The matcher
   * matters because a hook in `matcher="Edit|Write|MultiEdit"` is already
   * scoped — we never demote it further; we only flag whether it's safe.
   */
  classifyHook(entry: HookEntry, matcher: string | undefined): HookClassification {
    const command = String(entry?.command ?? "");
    const pathMatch = command.match(HOOK_PATH_RE);
    const hookPath = pathMatch ? pathMatch[1].replace(/\\/g, "/") : "";
    const baseMatch = command.match(BASENAME_RE);
    const basename = baseMatch ? baseMatch[1] : command.slice(0, 60);
    const tier: HookTier = hookPath ? this.opts.tierLookup(hookPath) : "unknown";

    // If the enclosing matcher is already slow-lane-only, the hook IS
    // slow-lane-only — no fast-lane promotion possible.
    const m = String(matcher ?? "");
    if (this.isSlowLaneOnlyMatcher(m)) {
      return {
        hookPath, basename, tier, command,
        decision: "slow-lane",
        reason: `enclosing matcher "${m}" already excludes read tools`,
      };
    }

    // If the matcher is already fast-lane-only (Read / Glob / Grep), keep it.
    if (this.isFastLaneOnlyMatcher(m)) {
      return {
        hookPath, basename, tier, command,
        decision: "fast-lane",
        reason: `enclosing matcher "${m}" already targets read tools`,
      };
    }

    // Catch-all matcher OR mixed matcher (e.g. `Bash|Read`) — classify by tier + basename.
    if (this.matchesWritePattern(basename)) {
      return {
        hookPath, basename, tier, command,
        decision: "slow-lane",
        reason: `basename "${basename}" matches write/bash-only pattern`,
      };
    }
    if (this.matchesReadPattern(basename)) {
      // Read-specific basenames should ONLY fire on read tools — moving them
      // to fast-lane-only (rather than "both") is what produces the actual
      // savings. The original broad matcher made them fire on every tool.
      return {
        hookPath, basename, tier, command,
        decision: "fast-lane",
        reason: `basename "${basename}" is read-specific; move to fast lane only`,
      };
    }

    // Tier-based fall-through:
    //   T0 (blocker): kept on both — too risky to demote unless name signals write-only.
    //   T1 (gate):    if matcher is catch-all → fast-lane only when it looks read-relevant; else slow-lane.
    //   T2 (injector): both lanes — context injection is useful for any tool.
    //   T3 (observer): default to slow-lane unless name signals read-relevance.
    //   T4 (async):    keep where it is (already cheap because detached).
    //   untagged:     conservative slow-lane only (do not auto-promote untagged hooks).
    //   unknown:      same as untagged.
    switch (tier) {
      case "T0":
        return {
          hookPath, basename, tier, command,
          decision: "both",
          reason: "T0 blocker — kept on both lanes (no write-only signal in basename)",
        };
      case "T1":
        return {
          hookPath, basename, tier, command,
          decision: "slow-lane",
          reason: "T1 soft gate — default slow-lane (no read-relevant basename signal)",
        };
      case "T2":
        return {
          hookPath, basename, tier, command,
          decision: "both",
          reason: "T2 injector — context injection is useful for any tool",
        };
      case "T3":
        return {
          hookPath, basename, tier, command,
          decision: "slow-lane",
          reason: "T3 observer — default slow-lane (move only when basename is read-relevant)",
        };
      case "T4":
        return {
          hookPath, basename, tier, command,
          decision: "slow-lane",
          reason: "T4 async — detached spawn; keep on slow-lane to avoid double-fire on reads",
        };
      case "untagged":
      case "unknown":
      default:
        return {
          hookPath, basename, tier, command,
          decision: "slow-lane",
          reason: `tier=${tier} — conservative slow-lane (untagged hooks need explicit tier first)`,
        };
    }
  }

  /**
   * Build a plan for one event's matcher blocks. Returns the proposed splits
   * + a forecast. Does not mutate input.
   */
  buildPlanForEvent(event: string, blocks: ReadonlyArray<MatcherBlock>): { splits: BlockSplit[]; warnings: string[] } {
    if (!Array.isArray(blocks)) {
      throw new TypeError(`buildPlanForEvent: blocks must be an array for event "${event}"`);
    }
    const splits: BlockSplit[] = [];
    const warnings: string[] = [];

    for (const block of blocks) {
      if (!block || typeof block !== "object") {
        warnings.push(`${event}: skipped non-object block in source array`);
        continue;
      }
      const hooks = Array.isArray(block.hooks) ? block.hooks : [];
      const matcher = block.matcher;
      const matcherStr = String(matcher ?? "");

      const classifications: HookClassification[] = [];
      const slowLaneHooks: HookEntry[] = [];
      const fastLaneHooks: HookEntry[] = [];

      for (const h of hooks) {
        if (!h || typeof h !== "object" || typeof (h as HookEntry).command !== "string") {
          warnings.push(`${event} matcher="${matcherStr}": skipped malformed hook entry (no command field)`);
          continue;
        }
        const cls = this.classifyHook(h as HookEntry, matcher === undefined ? undefined : matcherStr);
        classifications.push(cls);
        if (cls.decision === "fast-lane") {
          fastLaneHooks.push(h as HookEntry);
        } else if (cls.decision === "slow-lane") {
          slowLaneHooks.push(h as HookEntry);
        } else {
          // both: present in both lanes
          slowLaneHooks.push(h as HookEntry);
          fastLaneHooks.push(h as HookEntry);
        }
      }

      // Decide whether the matcher should be rewritten to exclude read tools
      // (independent of whether we emit a fast-lane sibling). Bash|Read with
      // 15 bash-output hooks should still narrow to `Bash` — no sibling needed
      // because nothing in the block is read-relevant.
      const shouldNarrow = this.shouldNarrowMatcher(matcher === undefined ? undefined : matcherStr, classifications);

      // Decide whether to emit a fast-lane sibling block. Requires the block
      // to be wide enough that it WAS firing on reads + at least one hook
      // that ONLY needs to fire on reads + at least one hook that needs to
      // stay on the slow lane (otherwise just moving everything to fast-lane
      // would lose work on writes).
      const emitFastLane = shouldNarrow && this.shouldEmitFastLaneSibling(classifications);

      const narrowedMatcher = shouldNarrow
        ? this.narrowMatcherForSlowLane(matcher === undefined ? undefined : matcherStr)
        : matcher === undefined ? undefined : matcherStr;

      splits.push({
        event,
        originalMatcher: matcher === undefined ? undefined : matcherStr,
        narrowedMatcher,
        shouldNarrow,
        slowLaneHooks,
        fastLaneHooks,
        classifications,
        emitFastLane,
      });
    }

    return { splits, warnings };
  }

  /**
   * Top-level plan builder. Returns splits across all per-tool events that
   * have matcher-based filtering (PreToolUse + PostToolUse) plus a forecast.
   */
  buildPlan(settings: SettingsShape): FastLanePlan {
    if (!settings || typeof settings !== "object") {
      throw new TypeError("buildPlan: settings must be an object");
    }
    const allSplits: BlockSplit[] = [];
    const warnings: string[] = [];

    for (const event of ["PreToolUse", "PostToolUse"] as const) {
      const blocks = settings.hooks?.[event];
      if (!blocks) continue;
      const { splits, warnings: w } = this.buildPlanForEvent(event, blocks);
      allSplits.push(...splits);
      warnings.push(...w);
    }

    const forecast = this.forecast(settings, allSplits);

    return { splits: allSplits, forecast, warnings };
  }

  /**
   * Apply a plan to a settings shape. Returns a NEW SettingsShape; input is
   * not mutated. The transformation is structural-only: for each block where
   * `emitFastLane` is true, the existing block's `hooks` are replaced with
   * `slowLaneHooks` AND a new block is inserted right after it with matcher
   * `FAST_LANE_MATCHER` and the `fastLaneHooks`.
   */
  applyPlan(settings: SettingsShape, plan: FastLanePlan): SettingsShape {
    if (!settings || typeof settings !== "object") {
      throw new TypeError("applyPlan: settings must be an object");
    }
    const out: SettingsShape = JSON.parse(JSON.stringify(settings));
    if (!out.hooks) return out;

    // Group splits by event for lookup.
    const splitsByEvent = new Map<string, BlockSplit[]>();
    for (const s of plan.splits) {
      const arr = splitsByEvent.get(s.event) ?? [];
      arr.push(s);
      splitsByEvent.set(s.event, arr);
    }

    for (const [event, splits] of splitsByEvent) {
      const blocks = out.hooks[event];
      if (!blocks) continue;
      const newBlocks: MatcherBlock[] = [];
      // Iterate splits + source blocks in lockstep — buildPlan preserves order.
      let i = 0;
      for (const block of blocks) {
        const sp = splits[i++];
        if (!sp) {
          // Shouldn't happen — but never drop blocks. Round-trip verbatim.
          newBlocks.push(block);
          continue;
        }
        // Three cases:
        //   1. No change wanted — push block verbatim.
        //   2. Narrow only (no fast-lane sibling) — rewrite matcher, keep hooks.
        //   3. Bifurcate — rewrite matcher + use slow-lane hooks here +
        //      append a fast-lane sibling block.
        if (!sp.shouldNarrow && !sp.emitFastLane) {
          newBlocks.push(block);
        } else if (sp.shouldNarrow && !sp.emitFastLane) {
          newBlocks.push({ ...block, matcher: sp.narrowedMatcher });
        } else {
          newBlocks.push({ ...block, matcher: sp.narrowedMatcher, hooks: sp.slowLaneHooks });
          if (sp.fastLaneHooks.length > 0) {
            newBlocks.push({ matcher: FAST_LANE_MATCHER, hooks: sp.fastLaneHooks });
          }
        }
      }
      out.hooks[event] = newBlocks;
    }
    return out;
  }

  // ── Forecast --------------------------------------------------------------

  /**
   * Count how many hooks fire for each representative tool, before and after
   * applying the plan. Used to verify the unit's "70% read-path cut" target.
   */
  forecast(originalSettings: SettingsShape, splits: BlockSplit[]): ForecastReport {
    const perTool: Record<string, { before: number; after: number; deltaPct: number }> = {};
    for (const tool of FORECAST_TOOLS) {
      const before = this.countHooksFiringFor(tool, originalSettings);
      // Build the after-state lazily: synthesize the post-apply settings by
      // walking splits and applying them in-line — same logic as applyPlan.
      const afterSettings = this.applyPlanFromSplits(originalSettings, splits);
      const after = this.countHooksFiringFor(tool, afterSettings);
      const deltaPct = before === 0 ? 0 : ((before - after) / before) * 100;
      perTool[tool] = { before, after, deltaPct };
    }
    const totalBefore = Object.values(perTool).reduce((a, v) => a + v.before, 0);
    const totalAfter = Object.values(perTool).reduce((a, v) => a + v.after, 0);
    const readToolsBefore = (["Read", "Glob", "Grep"] as const).reduce((a, t) => a + (perTool[t]?.before ?? 0), 0);
    const readToolsAfter = (["Read", "Glob", "Grep"] as const).reduce((a, t) => a + (perTool[t]?.after ?? 0), 0);
    const readPathReductionPct = readToolsBefore === 0
      ? 0
      : ((readToolsBefore - readToolsAfter) / readToolsBefore) * 100;
    return { perTool, totalBefore, totalAfter, readPathReductionPct };
  }

  // ── Internals -------------------------------------------------------------

  private isSlowLaneOnlyMatcher(m: string): boolean {
    return SLOW_LANE_ONLY_MATCHERS.some((re) => re.test(m));
  }

  private isFastLaneOnlyMatcher(m: string): boolean {
    return FAST_LANE_ONLY_MATCHERS.some((re) => re.test(m));
  }

  /**
   * Given the original matcher of a block being bifurcated, compute the
   * matcher to use for the slow-lane block (the one that retains the
   * original's slow-lane hooks). The goal: prevent Read/Glob/Grep tools from
   * still matching this block after the split.
   *
   * Rules:
   *   - `""` / `*` / `.*` (catch-all) → SLOW_LANE_NARROWED_MATCHER (explicit
   *     whitelist of slow-lane tools).
   *   - `Bash|Read`, `Read|Bash`, `Bash|Read|Edit|...` → strip alternation terms
   *     that are read tools. Preserve the rest; if only one term remains, drop
   *     the alternation operator. If no terms remain after stripping, fall
   *     back to SLOW_LANE_NARROWED_MATCHER.
   *   - Anything else → return verbatim (don't touch narrow matchers we
   *     didn't bifurcate).
   */
  narrowMatcherForSlowLane(matcher: string | undefined): string {
    const m = String(matcher ?? "");
    if (CATCH_ALL_MATCHERS.has(m)) return SLOW_LANE_NARROWED_MATCHER;
    // Alternation with read terms?
    if (/\|/.test(m) && /\b(Read|Glob|Grep)\b/.test(m)) {
      const terms = m.split("|").map((t) => t.trim()).filter((t) => t.length > 0);
      const kept = terms.filter((t) => !/^(Read|Glob|Grep)$/.test(t));
      if (kept.length === 0) return SLOW_LANE_NARROWED_MATCHER;
      if (kept.length === 1) return kept[0];
      return kept.join("|");
    }
    return m;
  }

  private matchesWritePattern(basename: string): boolean {
    return this.writePatterns.some((re) => re.test(basename));
  }

  private matchesReadPattern(basename: string): boolean {
    return this.readPatterns.some((re) => re.test(basename));
  }

  /**
   * Decide whether to rewrite this block's matcher to exclude read tools.
   * Yes when:
   *   - matcher includes read tools (catch-all OR mixed-with-reads), AND
   *   - matcher is not already slow-lane-only or fast-lane-only, AND
   *   - block has >= MIN_BLOCK_SIZE_FOR_SPLIT hooks (no churn for tiny blocks).
   */
  private shouldNarrowMatcher(matcher: string | undefined, classifications: HookClassification[]): boolean {
    if (classifications.length < MIN_BLOCK_SIZE_FOR_SPLIT) return false;
    const m = String(matcher ?? "");
    if (this.isSlowLaneOnlyMatcher(m)) return false;
    if (this.isFastLaneOnlyMatcher(m)) return false;
    // Catch-all OR contains alternation with a read term.
    if (CATCH_ALL_MATCHERS.has(m)) return true;
    if (/\|/.test(m) && /\b(Read|Glob|Grep)\b/.test(m)) return true;
    return false;
  }

  /**
   * Decide whether to emit a fast-lane sibling block (in addition to narrowing).
   * Yes when both lanes have hooks in them — otherwise either there's nothing
   * to put in the fast lane (all slow), or there's nothing left in the slow
   * lane (rare, would be a "demote everything to fast-only" case).
   */
  private shouldEmitFastLaneSibling(classifications: HookClassification[]): boolean {
    const hasSlow = classifications.some((c) => c.decision === "slow-lane" || c.decision === "both");
    const hasFast = classifications.some((c) => c.decision === "fast-lane" || c.decision === "both");
    return hasSlow && hasFast;
  }

  /**
   * Re-implementation of applyPlan that takes pre-built splits. Used internally
   * by `forecast()` so it doesn't re-compute splits on every call.
   */
  private applyPlanFromSplits(settings: SettingsShape, splits: BlockSplit[]): SettingsShape {
    const out: SettingsShape = JSON.parse(JSON.stringify(settings));
    if (!out.hooks) return out;
    const byEvent = new Map<string, BlockSplit[]>();
    for (const s of splits) {
      const arr = byEvent.get(s.event) ?? [];
      arr.push(s);
      byEvent.set(s.event, arr);
    }
    for (const [event, eventSplits] of byEvent) {
      const blocks = out.hooks[event];
      if (!blocks) continue;
      const newBlocks: MatcherBlock[] = [];
      let i = 0;
      for (const block of blocks) {
        const sp = eventSplits[i++];
        if (!sp) { newBlocks.push(block); continue; }
        if (!sp.shouldNarrow && !sp.emitFastLane) {
          newBlocks.push(block);
        } else if (sp.shouldNarrow && !sp.emitFastLane) {
          newBlocks.push({ ...block, matcher: sp.narrowedMatcher });
        } else {
          newBlocks.push({ ...block, matcher: sp.narrowedMatcher, hooks: sp.slowLaneHooks });
          if (sp.fastLaneHooks.length > 0) {
            newBlocks.push({ matcher: FAST_LANE_MATCHER, hooks: sp.fastLaneHooks });
          }
        }
      }
      out.hooks[event] = newBlocks;
    }
    return out;
  }

  /**
   * Count how many hook commands fire for a given tool name across all
   * PreToolUse + PostToolUse blocks of a settings shape. Catch-all matchers
   * (`""`, `*`, `.*`) match everything. Specific matchers are tested as JS
   * regexes (with safe-fallback to literal equality if regex is malformed).
   */
  countHooksFiringFor(tool: string, settings: SettingsShape): number {
    let count = 0;
    for (const event of ["PreToolUse", "PostToolUse"] as const) {
      const blocks = settings.hooks?.[event];
      if (!blocks) continue;
      for (const block of blocks) {
        const matcher = String(block.matcher ?? "");
        if (this.matcherMatchesTool(matcher, tool)) {
          count += (block.hooks ?? []).length;
        }
      }
    }
    return count;
  }

  private matcherMatchesTool(matcher: string, tool: string): boolean {
    if (matcher === "" || matcher === "*" || matcher === ".*") return true;
    try {
      const re = new RegExp(matcher);
      return re.test(tool);
    } catch {
      return matcher === tool;
    }
  }
}

// ── Default tierLookup helper for callers that read .mjs frontmatter --------

/**
 * Build a `tierLookup` closure backed by a Map. Useful for tests where you
 * want deterministic tier assignments without touching disk.
 */
export function makeStaticTierLookup(map: Record<string, HookTier>): (hookPath: string) => HookTier {
  return (hookPath: string) => map[hookPath] ?? "unknown";
}

/**
 * Build a `tierLookup` closure that reads `// tier: T#` from .mjs files on
 * disk. Cached per path for the lifetime of the closure. The closure-level
 * cache is important: the engine can call this hundreds of times per plan,
 * once per unique hook.
 */
export function makeDiskTierLookup(
  readTextSync: (path: string) => string | null,
): (hookPath: string) => HookTier {
  const cache = new Map<string, HookTier>();
  return (hookPath: string) => {
    const cached = cache.get(hookPath);
    if (cached !== undefined) return cached;
    const text = readTextSync(hookPath);
    if (text === null) { cache.set(hookPath, "unknown"); return "unknown"; }
    const m = text.match(/\/\/ tier: (T\d)/);
    const tier: HookTier = m ? (m[1] as HookTier) : "untagged";
    cache.set(hookPath, tier);
    return tier;
  };
}

// ── Singleton (lazy, no disk binding) ---------------------------------------

/**
 * Default singleton bound to a disk-reading tierLookup. Callers should
 * generally construct their own with the constants pre-supplied — this
 * singleton uses Node's `fs` and is therefore not pure.
 */
import * as nodeFs from "node:fs";

let _singleton: HookFastLaneEngine | null = null;
export function getHookFastLaneEngine(): HookFastLaneEngine {
  if (_singleton) return _singleton;
  _singleton = new HookFastLaneEngine({
    tierLookup: makeDiskTierLookup((p) => {
      try { return nodeFs.readFileSync(p, "utf8"); } catch { return null; }
    }),
  });
  return _singleton;
}
