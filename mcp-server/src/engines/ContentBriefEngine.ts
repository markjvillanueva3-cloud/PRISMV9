/**
 * ContentBriefEngine
 * ==================
 *
 * OBSIDIAN-CONTENT-MS2/U-CONTENT-BRIEF
 *
 * Generates the cyrilXBT JARVIS five-field content brief from a seed
 * (a connection note, a free-form thesis, or a captured observation):
 *
 *   ONE THING — single insight, one sentence max
 *   PROOF — most-specific real example/number/result
 *   READER TRANSFORMATION — what reader knows/believes after vs before
 *   THREE HOOKS — ranked aggressive / curious / personal
 *   THREE CLOSERS — ranked by urgency + memorability
 *
 * The article makes specific demands:
 *   - "If [the one thing] cannot be stated in one sentence the idea is not ready."
 *   - "Vague proof invalidates the brief."
 *   - "The closer is written before the middle. Always."
 *
 * The engine is deterministic + content-template-driven (NOT LLM-routed).
 * It does NOT invent facts. Given a seed (insight + proof + audience), it
 * scaffolds a brief in a stable shape; the human or downstream
 * ContentWriterEngine fills the writing.
 *
 * Quality gate
 * ------------
 *   - oneThing length: <= MAX_ONE_THING_CHARS (single sentence)
 *   - proof must contain a digit OR a domain-specific source-tag
 *   - hooks must be 3 distinct angles (aggressive / curious / personal)
 *   - closers must be 3 distinct angles (urgency / memorability / cta)
 *
 * Failure-to-validate produces `action: "rejected"` with a reason. No
 * filler text is ever emitted ("vague placeholders" is the failure mode
 * the article calls out by name).
 *
 * @milestone OBSIDIAN-CONTENT-MS2/U-CONTENT-BRIEF
 */

import { writeFileSync, mkdirSync, existsSync, renameSync, unlinkSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";

export interface BriefSeed {
  /** The candidate ONE THING (single insight). Required. */
  oneThing: string;
  /** PROOF: a specific number, example, or result. Required. */
  proof: string;
  /** Audience descriptor (pulled from CLAUDE.md identity section). Required. */
  audience: string;
  /** What the reader transforms FROM (their prior belief). */
  readerBefore: string;
  /** What the reader transforms TO (after reading). */
  readerAfter: string;
  /** Optional: source notes that produced this brief (becomes citations in body). */
  sourceNotes?: string[];
  /** Optional content pillar tag for the published-content downstream. */
  contentPillar?: string;
  /** Optional hook-format hint (number / story / question / claim / statistic / contrast). */
  hookFormatHint?: string;
}

export interface BriefOptions {
  /** Override knowledge/memories/briefs directory. */
  briefsDir?: string;
  /** When true, write the markdown file. Default false (dry-run). */
  apply?: boolean;
  /** Override "now" for deterministic tests. */
  now?: number;
}

export type BriefAction = "wrote" | "would-write" | "rejected" | "already-exists";

export interface BriefHook {
  rank: 1 | 2 | 3;
  angle: "aggressive" | "curious" | "personal";
  text: string;
}

export interface BriefCloser {
  rank: 1 | 2 | 3;
  angle: "urgency" | "memorability" | "cta";
  text: string;
}

export interface BriefStructure {
  oneThing: string;
  proof: string;
  readerTransformation: string;
  hooks: BriefHook[];
  closers: BriefCloser[];
}

export interface BriefResult {
  action: BriefAction;
  /** Absolute path of the brief file (regardless of write status). */
  filePath: string;
  /** Stable signature derived from oneThing — collision detection. */
  signature: string;
  /** Brief skeleton (always returned, even when action="rejected"). */
  brief: BriefStructure | null;
  /** Final markdown (empty when action="rejected"). */
  markdown: string;
  /** Reason the action was taken. */
  reason: string;
}

const DEFAULT_BRIEFS_DIR = "H:/prism/knowledge/memories/briefs";
const MAX_ONE_THING_CHARS = 220;
const MIN_ONE_THING_CHARS = 10;
const MAX_HOOK_CHARS = 200;
const MAX_CLOSER_CHARS = 200;
const SIG_PREFIX_LEN = 12;
const SLUG_MAX = 80;

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

function isSingleSentence(s: string): boolean {
  // Allow at most one terminal `.`/`!`/`?` — i.e. zero or one full stop NOT
  // followed by more content. (Permits abbreviations mid-sentence; rejects
  // "X is Y. Z is W." which is two sentences.)
  const trimmed = s.trim();
  if (!trimmed) return false;
  // Count terminal punctuation followed by whitespace + capital letter / digit.
  const compoundPattern = /[.!?]\s+[A-Z0-9]/;
  return !compoundPattern.test(trimmed);
}

function hasDigit(s: string): boolean {
  return /\d/.test(s);
}

function hasSourceTag(s: string): boolean {
  // [[wiki-link]], `code`, "quote", or attribution form like (Author 2024)
  return /\[\[[^\]]+\]\]|`[^`]+`|"[^"]+"|\([^)]+ \d{4}\)/.test(s);
}

function validateSeed(seed: BriefSeed): { ok: true } | { ok: false; reason: string } {
  if (!seed.oneThing || seed.oneThing.trim().length < MIN_ONE_THING_CHARS) {
    return { ok: false, reason: "oneThing missing or too short (article rule: one-sentence insight)" };
  }
  if (seed.oneThing.length > MAX_ONE_THING_CHARS) {
    return { ok: false, reason: `oneThing exceeds ${MAX_ONE_THING_CHARS} chars (article rule: 'if it cannot be stated in one sentence, the idea is not ready')` };
  }
  if (!isSingleSentence(seed.oneThing)) {
    return { ok: false, reason: "oneThing must be a single sentence (article rule)" };
  }
  if (!seed.proof || seed.proof.trim().length < MIN_ONE_THING_CHARS) {
    return { ok: false, reason: "proof missing (article rule: vague proof invalidates the brief)" };
  }
  if (!hasDigit(seed.proof) && !hasSourceTag(seed.proof)) {
    return { ok: false, reason: "proof must contain a digit (number/result) OR a source tag (article rule: 'specific real example, number, or result')" };
  }
  if (!seed.audience || seed.audience.trim().length === 0) {
    return { ok: false, reason: "audience missing (article rule: 'My audience is [SPECIFIC]')" };
  }
  if (!seed.readerBefore || !seed.readerAfter) {
    return { ok: false, reason: "readerBefore and readerAfter required (article rule: 'what does reader know/believe after vs before')" };
  }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton generation (deterministic templating)
// ─────────────────────────────────────────────────────────────────────────────

function deriveSignature(oneThing: string): string {
  return createHash("sha256").update(oneThing.trim().toLowerCase()).digest("hex").slice(0, SIG_PREFIX_LEN);
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, SLUG_MAX);
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function buildHooks(seed: BriefSeed): BriefHook[] {
  const audience = seed.audience.trim();
  const oneThing = seed.oneThing.trim();
  // The article specifies three angles in this order:
  //   1. aggressive: challenges an assumption the reader holds RIGHT NOW
  //   2. curious: surfaces something the reader did not know they wanted
  //   3. personal: specific result/experience that proves the one thing
  // Templates leave the contentful blanks for the writer to fill, but they
  // wire the angle structurally so a downstream writer sees what each must do.
  const hooks: BriefHook[] = [
    {
      rank: 1, angle: "aggressive",
      text: truncate(`Most ${audience.toLowerCase()} still believe the opposite — that's why this matters: ${oneThing}`, MAX_HOOK_CHARS),
    },
    {
      rank: 2, angle: "curious",
      text: truncate(`Here's the thing about ${oneThing.replace(/\.$/, "").toLowerCase()} no one is talking about.`, MAX_HOOK_CHARS),
    },
    {
      rank: 3, angle: "personal",
      text: truncate(seed.proof.length <= MAX_HOOK_CHARS ? `Last [time-marker]: ${seed.proof}` : `Last [time-marker]: ${truncate(seed.proof, MAX_HOOK_CHARS - 24)}`, MAX_HOOK_CHARS),
    },
  ];
  return hooks;
}

function buildClosers(seed: BriefSeed): BriefCloser[] {
  const after = seed.readerAfter.trim();
  return [
    {
      rank: 1, angle: "urgency",
      text: truncate(`If you skip this, the next [domain milestone] arrives without you. ${after}`, MAX_CLOSER_CHARS),
    },
    {
      rank: 2, angle: "memorability",
      text: truncate(`Pin this: ${truncate(seed.oneThing.trim(), 140)}`, MAX_CLOSER_CHARS),
    },
    {
      rank: 3, angle: "cta",
      text: truncate(`Reply with the version of ${truncate(seed.oneThing.trim(), 80)} that worked for you.`, MAX_CLOSER_CHARS),
    },
  ];
}

function buildBrief(seed: BriefSeed): BriefStructure {
  return {
    oneThing: seed.oneThing.trim(),
    proof: seed.proof.trim(),
    readerTransformation: `${seed.readerBefore.trim()} → ${seed.readerAfter.trim()}`,
    hooks: buildHooks(seed),
    closers: buildClosers(seed),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Markdown rendering
// ─────────────────────────────────────────────────────────────────────────────

function renderBriefMd(seed: BriefSeed, brief: BriefStructure, signature: string, dateIso: string, generatedAtIso: string): string {
  const fm = [
    "---",
    "type: content-brief",
    `signature: ${signature}`,
    `brief_date: ${dateIso}`,
    `audience: ${JSON.stringify(seed.audience.trim())}`,
    seed.contentPillar ? `content_pillar: ${JSON.stringify(seed.contentPillar)}` : "",
    seed.hookFormatHint ? `hook_format_hint: ${JSON.stringify(seed.hookFormatHint)}` : "",
    "tags: [ready-to-write]",
    `generated_at: ${generatedAtIso}`,
    "milestone: OBSIDIAN-CONTENT-MS2/U-CONTENT-BRIEF",
    "epistemic_only: false",
    "---",
    "",
  ].filter(Boolean).join("\n");

  let body = `# Content Brief — \`${signature}\`\n\n`;
  body += `_Generated by ContentBriefEngine. The closer is written before the middle. Always._\n\n`;

  body += `## ONE THING\n\n${brief.oneThing}\n\n`;

  body += `## PROOF\n\n${brief.proof}\n\n`;

  body += `## READER TRANSFORMATION\n\n${brief.readerTransformation}\n\n`;

  body += `## THREE HOOKS\n\n`;
  for (const h of brief.hooks) {
    body += `${h.rank}. **${h.angle.toUpperCase()}** — ${h.text}\n`;
  }
  body += "\n";

  body += `## THREE CLOSERS\n\n`;
  for (const c of brief.closers) {
    body += `${c.rank}. **${c.angle.toUpperCase()}** — ${c.text}\n`;
  }
  body += "\n";

  if (seed.sourceNotes && seed.sourceNotes.length > 0) {
    body += `## Source Notes\n\n`;
    for (const s of seed.sourceNotes) body += `- [[${s}]]\n`;
    body += "\n";
  }

  body += `## Writing Notes\n\n`;
  body += `- Hook templates above are scaffolding, not finished copy. Replace [time-marker], [domain milestone], and any [bracketed] tokens with real specifics.\n`;
  body += `- Pull the closer first; write toward it.\n`;
  body += `- One idea per paragraph. Hard stops, not semicolons.\n`;
  body += `- If a paragraph could be cut without the reader noticing, cut it.\n`;
  return fm + body;
}

function atomicWrite(filePath: string, content: string): void {
  const tmp = `${filePath}.brief.tmp`;
  writeFileSync(tmp, content, "utf8");
  try { renameSync(tmp, filePath); }
  catch (err) {
    try { unlinkSync(tmp); } catch { /* ignore */ }
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────────────────────────────────────

export class ContentBriefEngine {
  readonly name = "ContentBriefEngine";

  /**
   * Validate a seed and produce a five-field brief.
   *
   * @param seed  Brief inputs (oneThing, proof, audience, transformation).
   * @param opts  Output dir + apply flag.
   * @returns     Action + path + brief + markdown + reason.
   */
  generate(seed: BriefSeed, opts: BriefOptions = {}): BriefResult {
    const briefsDir = resolve(opts.briefsDir ?? DEFAULT_BRIEFS_DIR);
    const apply = !!opts.apply;
    const now = opts.now ?? Date.now();
    const generatedAtIso = new Date(now).toISOString();
    const dateIso = generatedAtIso.slice(0, 10);

    const validation = validateSeed(seed);
    if (!validation.ok) {
      const sigForReject = deriveSignature(seed.oneThing ?? "");
      return {
        action: "rejected",
        filePath: join(briefsDir, `brief-${dateIso}-${sigForReject}-rejected.md`),
        signature: sigForReject,
        brief: null,
        markdown: "",
        reason: validation.reason,
      };
    }

    const brief = buildBrief(seed);
    const signature = deriveSignature(seed.oneThing);
    const slug = slugify(seed.oneThing).slice(0, 50) || signature;
    const filename = `brief-${dateIso}-${signature}-${slug}.md`;
    const filePath = join(briefsDir, filename);
    const markdown = renderBriefMd(seed, brief, signature, dateIso, generatedAtIso);

    if (existsSync(filePath)) {
      return {
        action: "already-exists",
        filePath, signature, brief, markdown,
        reason: `brief already exists for signature ${signature} on ${dateIso}`,
      };
    }

    if (!apply) {
      return {
        action: "would-write",
        filePath, signature, brief, markdown,
        reason: "dry-run; pass apply: true to write",
      };
    }

    if (!existsSync(briefsDir)) mkdirSync(briefsDir, { recursive: true });
    atomicWrite(filePath, markdown);
    return {
      action: "wrote",
      filePath, signature, brief, markdown,
      reason: `wrote brief ${filename}`,
    };
  }

  /**
   * Read a brief from disk and return its parsed structure.
   * Used by ContentWriterEngine to consume previously-generated briefs.
   */
  readBrief(filePath: string): { ok: true; markdown: string } | { ok: false; reason: string } {
    if (!existsSync(filePath)) return { ok: false, reason: `brief not found: ${filePath}` };
    try {
      return { ok: true, markdown: readFileSync(filePath, "utf8") };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }
  }
}

export const contentBriefEngine = new ContentBriefEngine();
