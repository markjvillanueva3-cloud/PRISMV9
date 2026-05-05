/**
 * ScriptSummaryEngine — produce a 1-line summary of a script via Ollama
 * (qwen2.5-coder:7b) and cache the result by content hash so reruns are
 * O(scan) rather than O(LLM-calls).
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / P3-U02.
 *
 * Why this exists
 * ---------------
 * PRISM has 187+ scripts across mcp-server/scripts/, .claude/scripts/, and
 * scripts/ at the repo root. They have no machine-readable index — to find
 * the right script for a job, an operator has to grep filenames + read
 * each one. This engine turns that O(N) read into an O(1) keyword lookup
 * by emitting a flat INDEX.md with one line per script.
 *
 * Per-script flow:
 *   1. Read the script's first ~200 lines (header docstring is what we want)
 *   2. Hash the content; if hash matches cached entry, skip LLM call
 *   3. Ask Ollama qwen2.5-coder:7b for a 1-line summary
 *   4. Trim + sanitize (no newlines, no markdown bullets, max 120 chars)
 *
 * Idempotency: hash-keyed cache lets reruns skip unchanged scripts. A
 * newly-edited script gets a fresh summary on the next run.
 *
 * Failure mode: every Ollama call wrapped — if the LLM is unreachable or
 * returns garbage, the engine falls back to the script's first comment
 * line (or "(no summary)"). Never throws.
 *
 * @module engines/ScriptSummaryEngine
 */

import * as fs from "node:fs";
import { createHash } from "node:crypto";

const MAX_HEADER_LINES = 200;
const MAX_SUMMARY_CHARS = 120;
const SCRIPT_HASH_PREFIX_LEN = 16;

export interface SummarizeInput {
  scriptPath: string;
  /** Override the prebuilt cache (path -> {hash, summary}). */
  cache?: Record<string, { hash: string; summary: string }>;
  /** Callback that runs the actual Ollama call. Caller-supplied so the
   *  engine stays pure-fs and easily testable. */
  ollamaCall: (prompt: string) => Promise<{ ok: boolean; answer: string; error?: string }>;
}

export interface SummarizeResult {
  scriptPath: string;
  summary: string;
  hash: string;
  source: "cache" | "ollama" | "fallback";
  fallbackReason?: string;
  durationMs: number;
}

export class ScriptSummaryEngine {
  /**
   * Summarize one script. Returns a SummarizeResult — never throws.
   * `source: "cache"` means the cache hash matched and no LLM call fired.
   * `source: "fallback"` means the LLM was unreachable / returned garbage
   * and we used the script's first comment line as the summary.
   */
  async summarize(input: SummarizeInput): Promise<SummarizeResult> {
    const start = Date.now();
    if (!fs.existsSync(input.scriptPath)) {
      return { scriptPath: input.scriptPath, summary: "(file not found)", hash: "", source: "fallback", fallbackReason: "missing", durationMs: Date.now() - start };
    }
    const header = this.readHeader(input.scriptPath);
    const hash = this.hashHeader(header);
    const cached = input.cache?.[input.scriptPath];
    if (cached && cached.hash === hash) {
      return { scriptPath: input.scriptPath, summary: cached.summary, hash, source: "cache", durationMs: Date.now() - start };
    }

    const prompt = this.buildPrompt(input.scriptPath, header);
    let summary = "";
    let source: SummarizeResult["source"] = "ollama";
    let fallbackReason: string | undefined;
    try {
      const r = await input.ollamaCall(prompt);
      if (r.ok && r.answer && r.answer.length > 0) {
        summary = this.sanitize(r.answer);
        if (summary.length === 0) {
          summary = this.fallbackSummary(header);
          source = "fallback";
          fallbackReason = "empty after sanitize";
        }
      } else {
        summary = this.fallbackSummary(header);
        source = "fallback";
        fallbackReason = r.error ?? "no answer";
      }
    } catch (e) {
      summary = this.fallbackSummary(header);
      source = "fallback";
      fallbackReason = (e as Error).message ?? String(e);
    }

    return { scriptPath: input.scriptPath, summary, hash, source, fallbackReason, durationMs: Date.now() - start };
  }

  /** Build the Ollama prompt — terse instructions optimize for 1-line output. */
  buildPrompt(scriptPath: string, header: string): string {
    return [
      "Summarize this script in EXACTLY ONE LINE.",
      "Rules:",
      "- Max 120 characters.",
      "- No markdown formatting, no bullet points, no quotes.",
      "- Start with a verb (e.g. 'Generate', 'Validate', 'Sync', 'Audit').",
      "- Describe WHAT it does, not HOW.",
      "",
      `Script path: ${scriptPath}`,
      "",
      "Header:",
      "```",
      header,
      "```",
      "",
      "Output ONLY the one-line summary. No preamble, no explanation.",
    ].join("\n");
  }

  /** Read up to MAX_HEADER_LINES from the script. */
  readHeader(scriptPath: string): string {
    try {
      const raw = fs.readFileSync(scriptPath, "utf-8");
      return raw.split(/\r?\n/).slice(0, MAX_HEADER_LINES).join("\n");
    } catch {
      return "";
    }
  }

  /** SHA-256 of the header — short prefix is the cache key. */
  hashHeader(header: string): string {
    return createHash("sha256").update(header.replace(/\r\n/g, "\n"), "utf-8").digest("hex").slice(0, SCRIPT_HASH_PREFIX_LEN);
  }

  /**
   * Sanitize an LLM-emitted summary: strip leading verbosity, code fences,
   * markdown markers, newlines; cap at MAX_SUMMARY_CHARS.
   */
  sanitize(raw: string): string {
    let s = String(raw ?? "").trim();
    // Strip code fences
    s = s.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "");
    // Strip leading markdown bullets / numbering
    s = s.replace(/^[-*•]\s+/, "").replace(/^\d+\.\s+/, "");
    // Strip "Summary: " preambles
    s = s.replace(/^(summary|description|line)\s*:\s*/i, "");
    // Collapse whitespace + take first line only
    s = s.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0).join(" ");
    s = s.replace(/\s+/g, " ").trim();
    if (s.length > MAX_SUMMARY_CHARS) {
      s = s.slice(0, MAX_SUMMARY_CHARS - 1).replace(/\s+\S*$/, "") + "…";
    }
    return s;
  }

  /**
   * Fallback when Ollama is unreachable: extract the first non-empty
   * comment line from the header (// or # or /** ... or *).
   */
  fallbackSummary(header: string): string {
    const lines = header.split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.trim();
      if (line.length === 0) continue;
      // Skip shebangs and pure-fence lines
      if (line.startsWith("#!")) continue;
      // C-style block comment line (* leading or /** marker)
      if (/^\/\*\*?$/.test(line)) continue;
      const m = line.match(/^(?:\/\/|#|\*+|\/\*\*?)\s*(.+?)$/);
      if (m && m[1].trim().length > 0) {
        return this.sanitize(m[1].trim());
      }
      // First non-comment, non-import line (last-resort fallback)
      if (!/^(import|require|const|let|var|function|class|export)\b/.test(line)) {
        return this.sanitize(line);
      }
    }
    return "(no summary)";
  }
}

export const scriptSummaryEngine = new ScriptSummaryEngine();
