/**
 * ConsensusObsidianPersistenceEngine — write each ConsensusResult to the
 * PRISM wiki (and optionally an Obsidian vault) as a permanent second-brain
 * memory.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-OBSIDIAN-PERSIST.
 *
 * Why this exists
 * ---------------
 * The multi-model consensus engine fans a prompt out to 4 reasoners and
 * scores agreement. The answer is useful for the current chat — but if it's
 * not persisted, the next session re-derives the same insight from scratch.
 * That defeats the whole point of running 4 models on every meaningful task.
 *
 * This engine takes each ConsensusResult and writes it to:
 *
 *   1. `<PRISM_WIKI_ROOT>/consensus/<sha8>.md`
 *      — canonical per-prompt artifact with YAML frontmatter the wiki indexer
 *        already understands. Idempotent on prompt_hash.
 *
 *   2. `<PRISM_WIKI_ROOT>/log.md`
 *      — chronological audit line so `grep '^## \[' log.md | tail -10` shows
 *        recent consensus runs alongside other wiki events.
 *
 *   3. `<PRISM_WIKI_ROOT>/consensus/index.md`
 *      — a dedicated index for consensus entries. We do NOT append to the
 *        bootstrap-managed `wiki/index.md` because that file is rewritten by
 *        wiki-bootstrap.mjs and would clobber our entries. The dedicated
 *        index is wiki-authored and survives bootstrap.
 *
 *   4. (optional) `<OBSIDIAN_VAULT_PATH>/PRISM/consensus/<sha8>.md`
 *      — when env `OBSIDIAN_VAULT_PATH` is set, mirror the same artifact
 *        into the operator's Obsidian vault so it surfaces in graph view +
 *        backlinks. Fully optional; engine never throws if the env is unset
 *        or the vault is unwritable.
 *
 * Atomicity
 * ---------
 * Every write goes through a temp+rename pattern via `safeWriteSync` so
 * crashes mid-write can't corrupt the wiki. Idempotency check is
 * read-before-write on the canonical sha8 path.
 *
 * No I/O during construction; the engine reads `process.env` lazily so tests
 * can override PRISM_WIKI_ROOT and OBSIDIAN_VAULT_PATH per-test.
 *
 * @module engines/ConsensusObsidianPersistenceEngine
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

export interface PersistInput {
  /** Original user prompt — used to compute the canonical hash + filename. */
  prompt: string;
  /** Optional task-type tag (e.g. "plan", "build", "review"). */
  taskType?: string;
  /** Session id of the chat that originated the consensus call. */
  sourceSession?: string;
  /** The ConsensusResult shape — kept loose to avoid a circular import. */
  result: ConsensusResultLike;
  /** Override wiki root (tests). Default: env PRISM_WIKI_ROOT or H:/prism/knowledge/wiki. */
  wikiRoot?: string;
  /** Override Obsidian vault root (tests). Default: env OBSIDIAN_VAULT_PATH. */
  obsidianVaultRoot?: string | null;
}

/**
 * Loose structural type matching `ConsensusResult` from MultiModelConsensusEngine.
 * Defined locally to avoid a circular dependency: the consensus engine imports
 * THIS module, not the other way around. Only the fields we actually persist
 * are listed.
 */
export interface ConsensusResultLike {
  ok: boolean;
  mode: "compare" | "vote";
  responses: Array<{
    model: string;
    vendor: string;
    ok: boolean;
    answer: string;
    latencyMs: number;
    tokens: number | null;
    error: string | null;
  }>;
  successCount: number;
  agreementScore: number;
  consensus: { answer: string; voters: string[]; confidence: number } | null;
  recommendation: "accept" | "review" | "escalate";
  totalLatencyMs: number;
  factCheck: Record<string, { totalMentions: number; verifiedMentions: number; factualityScore: number; hallucinations: Array<{ kind: string; mention: string; closestMatch: string | null; modelName: string }> }>;
}

export interface PersistResult {
  ok: boolean;
  promptHash: string;
  /** Absolute path of the canonical wiki artifact. */
  wikiPath: string;
  /** Absolute path of the obsidian vault mirror, when written. null otherwise. */
  vaultPath: string | null;
  /** True if the canonical wiki file already existed (no rewrite). */
  alreadyExisted: boolean;
  /** True if a chronological log line was appended. */
  loggedToWikiLog: boolean;
  /** True if the consensus index was updated. */
  indexedInConsensusIndex: boolean;
  error: string | null;
}

const DEFAULT_WIKI_ROOT = process.env.PRISM_WIKI_ROOT ?? "H:/prism/knowledge/wiki";

const FRONTMATTER_VERSION = "1.0.0";

export class ConsensusObsidianPersistenceEngine {
  /**
   * Persist one consensus run. Idempotent on prompt_hash — calling twice with
   * the same prompt is a no-op for the canonical file (returns alreadyExisted=true)
   * but the log line is still appended so the chronological audit captures
   * every invocation.
   */
  persist(input: PersistInput): PersistResult {
    this.validate(input);
    const wikiRoot = input.wikiRoot ?? DEFAULT_WIKI_ROOT;
    const vaultRoot = input.obsidianVaultRoot === undefined
      ? (process.env.OBSIDIAN_VAULT_PATH ?? null)
      : input.obsidianVaultRoot;

    const promptHash = this.hashPrompt(input.prompt);
    const sha8 = promptHash.slice(0, 8);
    const consensusDir = path.join(wikiRoot, "consensus");
    const wikiPath = path.join(consensusDir, `${sha8}.md`);

    fs.mkdirSync(consensusDir, { recursive: true });

    const alreadyExisted = fs.existsSync(wikiPath);
    let loggedToWikiLog = false;
    let indexedInConsensusIndex = false;
    let vaultPath: string | null = null;

    try {
      if (!alreadyExisted) {
        const body = this.renderMarkdown(input, promptHash);
        this.atomicWrite(wikiPath, body);
        indexedInConsensusIndex = this.appendToConsensusIndex(wikiRoot, input, sha8);
      }

      // log.md gets every invocation, even idempotent ones, so the audit
      // shows when consensus was re-fetched (cache hit) vs newly written.
      loggedToWikiLog = this.appendToLog(wikiRoot, input, sha8, alreadyExisted);

      // Optional Obsidian mirror — fully best-effort.
      if (vaultRoot && typeof vaultRoot === "string" && vaultRoot.length > 0) {
        try {
          const mirrorDir = path.join(vaultRoot, "PRISM", "consensus");
          fs.mkdirSync(mirrorDir, { recursive: true });
          const mirrorPath = path.join(mirrorDir, `${sha8}.md`);
          if (!fs.existsSync(mirrorPath) && fs.existsSync(wikiPath)) {
            const wikiBody = fs.readFileSync(wikiPath, "utf-8");
            this.atomicWrite(mirrorPath, wikiBody);
          }
          vaultPath = mirrorPath;
        } catch {
          vaultPath = null; // vault errors must never break the canonical persist
        }
      }

      return {
        ok: true,
        promptHash,
        wikiPath,
        vaultPath,
        alreadyExisted,
        loggedToWikiLog,
        indexedInConsensusIndex,
        error: null,
      };
    } catch (e) {
      return {
        ok: false,
        promptHash,
        wikiPath,
        vaultPath: null,
        alreadyExisted,
        loggedToWikiLog,
        indexedInConsensusIndex,
        error: (e as Error).message,
      };
    }
  }

  /**
   * Stable SHA-256 of the prompt. The hash is the persistence key — same
   * prompt across sessions resolves to the same artifact, which is exactly
   * what we want for second-brain recall. Whitespace is normalized so
   * formatting drift doesn't fork the artifact.
   */
  hashPrompt(prompt: string): string {
    const normalized = prompt.trim().replace(/\s+/g, " ");
    return createHash("sha256").update(normalized, "utf-8").digest("hex");
  }

  // ---- markdown rendering ----

  private renderMarkdown(input: PersistInput, promptHash: string): string {
    const r = input.result;
    const sha8 = promptHash.slice(0, 8);
    const ts = new Date().toISOString();
    const voters = r.consensus?.voters ?? [];
    const factualityVals = Object.values(r.factCheck ?? {})
      .map((f) => f.factualityScore)
      .filter((n) => Number.isFinite(n));
    const meanFactuality = factualityVals.length === 0
      ? null
      : Number((factualityVals.reduce((a, b) => a + b, 0) / factualityVals.length).toFixed(3));

    const fm = [
      "---",
      `schema_version: ${FRONTMATTER_VERSION}`,
      `kind: consensus_run`,
      `prompt_hash: ${promptHash}`,
      `sha8: ${sha8}`,
      `ts: ${ts}`,
      `task_type: ${this.escapeYaml(input.taskType ?? "untagged")}`,
      `source_session: ${this.escapeYaml(input.sourceSession ?? "unknown")}`,
      `mode: ${r.mode}`,
      `recommendation: ${r.recommendation}`,
      `agreement_score: ${r.agreementScore}`,
      `success_count: ${r.successCount}`,
      `total_latency_ms: ${r.totalLatencyMs}`,
      `model_voters: [${voters.map((v) => `"${this.escapeYaml(v)}"`).join(", ")}]`,
      `mean_factuality: ${meanFactuality === null ? "null" : meanFactuality}`,
      `tags: [consensus, ${this.escapeYaml(input.taskType ?? "untagged")}, ${r.recommendation}]`,
      "---",
      "",
    ].join("\n");

    const lines: string[] = [
      fm,
      `# Consensus Run \`${sha8}\``,
      "",
      `**Recommendation:** \`${r.recommendation}\` · **Agreement:** \`${r.agreementScore}\` · **Voters:** \`${voters.join(", ") || "(none)"}\``,
      "",
      "## Prompt",
      "",
      "```",
      input.prompt,
      "```",
      "",
      "## Consensus answer",
      "",
    ];

    if (r.consensus) {
      lines.push("```");
      lines.push(r.consensus.answer);
      lines.push("```");
    } else {
      lines.push("_No consensus reached — see per-model responses below._");
    }
    lines.push("");

    lines.push("## Per-model responses");
    lines.push("");
    for (const resp of r.responses) {
      lines.push(`### ${resp.model} (${resp.vendor}) — ${resp.ok ? "ok" : "error"}`);
      lines.push("");
      lines.push(`- latency: ${resp.latencyMs}ms · tokens: ${resp.tokens ?? "n/a"}`);
      if (resp.error) {
        lines.push(`- error: \`${this.escapeBackticks(resp.error)}\``);
      }
      const fc = r.factCheck?.[resp.model];
      if (fc) {
        lines.push(`- factuality: \`${fc.factualityScore}\` (${fc.verifiedMentions}/${fc.totalMentions} mentions verified)`);
        if (fc.hallucinations && fc.hallucinations.length > 0) {
          lines.push(`- hallucinations:`);
          for (const h of fc.hallucinations) {
            lines.push(`  - \`${this.escapeBackticks(h.mention)}\` (${h.kind})${h.closestMatch ? ` → did-you-mean \`${this.escapeBackticks(h.closestMatch)}\`?` : ""}`);
          }
        }
      }
      lines.push("");
      lines.push("```");
      lines.push(resp.ok ? resp.answer : `(no answer — ${resp.error ?? "unknown error"})`);
      lines.push("```");
      lines.push("");
    }

    lines.push("## Backlinks");
    lines.push("");
    lines.push(`- task_type: [[task-type-${this.slug(input.taskType ?? "untagged")}]]`);
    lines.push(`- recommendation: [[consensus-${r.recommendation}]]`);
    for (const v of voters) {
      lines.push(`- voter: [[model-${this.slug(v)}]]`);
    }
    lines.push("");
    return lines.join("\n");
  }

  // ---- log.md / index.md helpers ----

  private appendToLog(wikiRoot: string, input: PersistInput, sha8: string, cacheHit: boolean): boolean {
    try {
      const logPath = path.join(wikiRoot, "log.md");
      const ts = new Date().toISOString().slice(0, 10);
      const tag = cacheHit ? "consensus_recall" : "consensus_persist";
      const session = input.sourceSession ?? "unknown";
      const taskType = input.taskType ?? "untagged";
      const rec = input.result.recommendation;
      const agreement = input.result.agreementScore;
      const line = `## [${ts}] ${tag} | ${sha8} task:${taskType} rec:${rec} agreement:${agreement} | by:${session}\n`;
      // Create file if missing — log might not exist on a fresh wiki.
      if (!fs.existsSync(logPath)) {
        fs.mkdirSync(wikiRoot, { recursive: true });
        this.atomicWrite(logPath, "# PRISM Wiki Log\n\n> Chronological audit trail. Grep with: `grep '^## \\[' log.md | tail -10`\n\n");
      }
      // Append-by-rewrite to keep the temp+rename atomicity guarantee.
      const cur = fs.readFileSync(logPath, "utf-8");
      this.atomicWrite(logPath, cur + line);
      return true;
    } catch {
      return false;
    }
  }

  private appendToConsensusIndex(wikiRoot: string, input: PersistInput, sha8: string): boolean {
    try {
      const indexPath = path.join(wikiRoot, "consensus", "index.md");
      if (!fs.existsSync(indexPath)) {
        const header = "---\ntitle: Consensus Index\nkind: consensus_index\nschema_version: 1.0.0\n---\n\n# Consensus Runs\n\n> Auto-maintained by ConsensusObsidianPersistenceEngine. One line per persisted run.\n\n";
        this.atomicWrite(indexPath, header);
      }
      const cur = fs.readFileSync(indexPath, "utf-8");
      // Idempotency at index level: don't add if sha8 already linked.
      if (cur.includes(`[[${sha8}]]`)) return true;
      const ts = new Date().toISOString();
      const taskType = input.taskType ?? "untagged";
      const rec = input.result.recommendation;
      const agreement = input.result.agreementScore;
      const voterCount = input.result.consensus?.voters.length ?? 0;
      const line = `- [[${sha8}]] · ${ts} · task:${taskType} · rec:${rec} · agreement:${agreement} · voters:${voterCount}\n`;
      this.atomicWrite(indexPath, cur + line);
      return true;
    } catch {
      return false;
    }
  }

  // ---- atomic write ----

  /**
   * Atomic write via temp+rename. On Windows, rename onto an existing target
   * fails by default — use unlink-then-rename in that case. Failure to unlink
   * a non-existent target is ignored.
   */
  private atomicWrite(target: string, content: string): void {
    const dir = path.dirname(target);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, content, "utf-8");
    try {
      fs.renameSync(tmp, target);
    } catch {
      // Windows fallback: target exists and rename refused — replace via unlink+rename.
      try { fs.unlinkSync(target); } catch { /* ignore */ }
      fs.renameSync(tmp, target);
    }
  }

  // ---- validation + escaping ----

  private validate(input: PersistInput): void {
    if (!input || typeof input !== "object") throw new Error("PersistInput required");
    if (typeof input.prompt !== "string" || input.prompt.length === 0) {
      throw new Error("prompt must be a non-empty string");
    }
    if (!input.result || typeof input.result !== "object") {
      throw new Error("result must be a ConsensusResult-like object");
    }
    if (!Array.isArray(input.result.responses)) {
      throw new Error("result.responses must be an array");
    }
  }

  private escapeYaml(s: string): string {
    return s.replace(/[\r\n]/g, " ").replace(/"/g, "'");
  }

  private escapeBackticks(s: string): string {
    return s.replace(/`/g, "ʼ");
  }

  private slug(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "untagged";
  }
}

export const consensusObsidianPersistenceEngine = new ConsensusObsidianPersistenceEngine();
