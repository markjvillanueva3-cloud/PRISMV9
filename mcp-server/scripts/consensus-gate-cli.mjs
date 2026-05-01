#!/usr/bin/env node
/**
 * consensus-gate-cli.mjs — CLI for the /consensus-gate slash skill (P4-U04).
 *
 * Mirrors the 5-persona heuristic gate from .claude/hooks/pre-shop-floor-
 * commit-consensus.mjs (P4-U03), but on user-specified target files and
 * provider subset. Emits JSON to stdout.
 *
 * Usage:
 *   node mcp-server/scripts/consensus-gate-cli.mjs \
 *     --providers claude,codex,qwen,mistral,llama \
 *     --threshold 0.75 \
 *     --target "src/physics/constants.ts"
 *
 * Provider mapping (positional, 1:1 with the 5 personas):
 *   claude   → kienzle-physicist
 *   codex    → shop-floor-safety-auditor
 *   qwen     → post-processor-engineer
 *   mistral  → dialect-translator
 *   llama    → fixture-designer
 *
 * Bare persona ids (kienzle, safety, post-processor, dialect, fixture) are
 * also accepted to keep the skill usable without the LLM-name mapping.
 *
 * JSON output:
 *   {
 *     decision: "PASS"|"CONDITIONAL"|"FAIL",
 *     reason: string,
 *     threshold: number,
 *     domain: string|null,
 *     filesScanned: [string],
 *     providers: [{id, persona, decision, rationale}],
 *     votes: {PASS, CONDITIONAL, FAIL},
 *     weighted: {PASS, CONDITIONAL, FAIL},
 *     dissent: [{provider, decision, rationale}]
 *   }
 *
 * Exit codes: 0 always (unlike the commit hook, this is a query tool).
 *
 * P4-U04, INTEL-OLLAMA-OBSIDIAN-MS1.
 */

import { readFileSync, statSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

// ── Constants ───────────────────────────────────────────────────────
const KC11_MIN_NMM2 = 1500;
const KC11_MAX_NMM2 = 2500;
const HOME_WEIGHT = 1.5;
const OFF_WEIGHT = 1.0;
const DEFAULT_THRESHOLD = 0.75;

const PROVIDER_TO_PERSONA = {
  claude: "kienzle",
  codex: "safety",
  qwen: "post-processor",
  mistral: "dialect",
  llama: "fixture",
  // bare persona ids accepted directly
  kienzle: "kienzle",
  safety: "safety",
  "post-processor": "post-processor",
  dialect: "dialect",
  fixture: "fixture",
};

// ── Argument parser ─────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { providers: null, threshold: DEFAULT_THRESHOLD, target: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const eq = a.indexOf("=");
    let key, val;
    if (a.startsWith("--") && eq > 0) {
      key = a.slice(2, eq);
      val = a.slice(eq + 1);
    } else if (a.startsWith("--")) {
      key = a.slice(2);
      val = argv[++i];
    } else {
      continue;
    }
    if (key === "providers") out.providers = val;
    else if (key === "threshold") out.threshold = parseFloat(val);
    else if (key === "target") out.target = val;
  }
  return out;
}

// ── File resolution ─────────────────────────────────────────────────
function isLiteralFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function expandGlob(pattern) {
  // Supports: literal path, comma-separated literals, basename glob (*.ts)
  // in a directory, or directory-with-pattern (src/**/*.ts limited to one star).
  if (pattern.includes(",")) {
    return pattern
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .flatMap((p) => expandGlob(p));
  }
  if (isLiteralFile(pattern)) return [resolve(pattern)];

  // Star-glob: support PATTERN with at most one '*' segment.
  if (pattern.includes("*")) {
    const lastSep = Math.max(pattern.lastIndexOf("/"), pattern.lastIndexOf("\\"));
    const dir = lastSep >= 0 ? pattern.slice(0, lastSep) : ".";
    const base = lastSep >= 0 ? pattern.slice(lastSep + 1) : pattern;
    const rxStr = "^" + base.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$";
    const rx = new RegExp(rxStr);
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return [];
    }
    return entries
      .filter((e) => rx.test(e))
      .map((e) => resolve(dir, e))
      .filter(isLiteralFile);
  }

  return [];
}

function readFiles(paths) {
  const out = [];
  for (const p of paths) {
    try {
      const content = readFileSync(p, "utf8");
      out.push({ path: p, content });
    } catch (err) {
      out.push({ path: p, content: "", error: err?.message ?? String(err) });
    }
  }
  return out;
}

// ── Heuristic personas (mirror P4-U03 hook) ─────────────────────────
function checkKienzle(input, files) {
  const inConstantsFile = files.some((f) =>
    /(?:^|[\\/])src[\\/]physics[\\/]constants\.ts$/i.test(f.path)
  );
  // For the skill we read whole files (not a diff), so match raw kc1.1 lines.
  const kcRx = /\bkc[\s_]*1\.?1\b\s*[:=]\s*([0-9.]+)/gim;
  const matches = [...input.matchAll(kcRx)];
  for (const m of matches) {
    const v = parseFloat(m[1]);
    if (Number.isFinite(v) && (v < KC11_MIN_NMM2 || v > KC11_MAX_NMM2)) {
      return {
        decision: "FAIL",
        rationale: `kc1.1=${m[1]} outside steel range [${KC11_MIN_NMM2},${KC11_MAX_NMM2}] N/mm²`,
      };
    }
  }
  if (matches.length > 0 && !inConstantsFile) {
    return {
      decision: "FAIL",
      rationale: "Kienzle constant inlined outside physics/constants.ts — must import",
    };
  }
  return { decision: "PASS", rationale: "no inline Kienzle drift" };
}

function checkSafety(input) {
  if (/--no-verify\b/.test(input)) {
    return { decision: "FAIL", rationale: "--no-verify flag present (skips hooks)" };
  }
  if (/\b(?:it|test|describe)\.skip\s*\(/.test(input)) {
    return { decision: "FAIL", rationale: ".skip on test detected" };
  }
  if (/\bsoften(?:ed|ing)?\s*[-_\s]?(?:guard|gate|test|threshold)/i.test(input)) {
    return { decision: "FAIL", rationale: "softened guard/gate/test/threshold language" };
  }
  return { decision: "PASS", rationale: "no safety-softening signals" };
}

function checkPostProcessor(input) {
  const inlineGcode = /["'`]\s*G(?:0[0-9]|9[0-2]|[1-9][0-9])\s+[XYZAB][-0-9.]+/.test(input);
  if (inlineGcode) {
    return {
      decision: "CONDITIONAL",
      rationale: "raw G-code literal present — verify dialect/macro path",
    };
  }
  return { decision: "PASS", rationale: "no inline G-code drift" };
}

function checkDialect(input) {
  const hasG682 = /\bG68\.2\b/.test(input);
  const hasDialectTag = /\b(?:okuma|fanuc|haas|mazak|heidenhain|siemens)\b/i.test(input);
  if (hasG682 && !hasDialectTag) {
    return {
      decision: "CONDITIONAL",
      rationale: "G68.2 present without dialect tag — controllers diverge",
    };
  }
  return { decision: "PASS", rationale: "no dialect-mistranslation signals" };
}

function checkFixture(input) {
  const hasClamp = /\bclamp[-\s]?(?:force|pressure)\b/i.test(input);
  const hasISO = /\biso[-\s]?13041\b/i.test(input);
  if (hasClamp && !hasISO) {
    return {
      decision: "CONDITIONAL",
      rationale: "clamp-force discussed without ISO 13041 reference",
    };
  }
  return { decision: "PASS", rationale: "no fixture-capability gap" };
}

const PERSONA_FN = {
  kienzle: checkKienzle,
  safety: checkSafety,
  "post-processor": checkPostProcessor,
  dialect: checkDialect,
  fixture: checkFixture,
};

// ── Domain detection (mirror manufacturing-personas.ts priority) ────
function detectDomain(input, files) {
  const fileBlob = files.map((f) => f.path).join(" ");
  const blob = fileBlob + "\n" + input;
  if (/\bkienzle\b|\bkc[\s_]*1\.?1\b|physics[/\\]constants/i.test(blob)) return "kienzle";
  if (/\bfixture\b|\bworkholding\b|\bclamp[-\s]?(?:force|pressure)\b|\biso[-\s]?13041\b/i.test(blob)) {
    return "fixture";
  }
  if (/\bG68\.2\b|\btilted[-\s]?plane\b/i.test(blob)) return "dialect";
  if (/PostProcessor|GcodeEmit\b|cutter[-\s]?comp/i.test(blob)) return "post-processor";
  if (/--no-verify|\.skip|\bsoften/i.test(blob)) return "safety";
  return null;
}

// ── Main ────────────────────────────────────────────────────────────
function main(argv) {
  const args = parseArgs(argv);
  const providersArg = args.providers ?? "claude,codex,qwen,mistral,llama";
  const providerIds = providersArg.split(",").map((s) => s.trim()).filter(Boolean);
  const threshold = Number.isFinite(args.threshold) ? args.threshold : DEFAULT_THRESHOLD;

  if (!args.target) {
    return {
      decision: "REFUSED",
      reason: "no --target provided",
      threshold,
      domain: null,
      filesScanned: [],
      providers: [],
      votes: { PASS: 0, CONDITIONAL: 0, FAIL: 0 },
      weighted: { PASS: 0, CONDITIONAL: 0, FAIL: 0 },
      dissent: [],
    };
  }

  const files = readFiles(expandGlob(args.target));
  if (files.length === 0) {
    return {
      decision: "REFUSED",
      reason: `no files matched --target=${args.target}`,
      threshold,
      domain: null,
      filesScanned: [],
      providers: [],
      votes: { PASS: 0, CONDITIONAL: 0, FAIL: 0 },
      weighted: { PASS: 0, CONDITIONAL: 0, FAIL: 0 },
      dissent: [],
    };
  }

  const input = files.map((f) => `// FILE: ${f.path}\n${f.content}`).join("\n\n");
  const domain = detectDomain(input, files);

  // Run each provider's persona heuristic.
  const verdicts = providerIds.map((id) => {
    const persona = PROVIDER_TO_PERSONA[id] ?? "safety"; // unknown id falls back to safety
    const fn = PERSONA_FN[persona];
    let r;
    try {
      r = fn(input, files);
    } catch (err) {
      r = { decision: "CONDITIONAL", rationale: `heuristic threw: ${err?.message ?? String(err)}` };
    }
    return { id, persona, isHome: persona === domain, ...r };
  });

  // Tally with persona weights.
  const votes = { PASS: 0, CONDITIONAL: 0, FAIL: 0 };
  const weighted = { PASS: 0, CONDITIONAL: 0, FAIL: 0 };
  let homeFail = false;
  for (const v of verdicts) {
    votes[v.decision] = (votes[v.decision] ?? 0) + 1;
    const w = v.isHome ? HOME_WEIGHT : OFF_WEIGHT;
    weighted[v.decision] = (weighted[v.decision] ?? 0) + w;
    if (v.isHome && v.decision === "FAIL") homeFail = true;
  }

  // Decision logic. Threshold gates clean PASS — otherwise downgrade if any
  // FAIL/CONDITIONAL is present.
  const totalProviders = providerIds.length;
  const passRatio = totalProviders > 0 ? votes.PASS / totalProviders : 0;

  let decision;
  let reason;
  if (homeFail) {
    decision = "FAIL";
    reason = "home-domain expert FAIL veto";
  } else if (weighted.FAIL > 0 && weighted.FAIL >= weighted.PASS) {
    decision = "FAIL";
    reason = `weighted FAIL (${weighted.FAIL}) ≥ weighted PASS (${weighted.PASS})`;
  } else if (votes.FAIL > 0 || votes.CONDITIONAL > 0) {
    decision = "CONDITIONAL";
    reason =
      passRatio < threshold
        ? `pass-ratio ${passRatio.toFixed(2)} below threshold ${threshold}`
        : "non-PASS verdicts present";
  } else {
    decision = "PASS";
    reason = "unanimous PASS";
  }

  // Dissent = providers whose decision != popular (winning) vote.
  const popular = (() => {
    let max = -1;
    let win = "PASS";
    for (const k of ["PASS", "CONDITIONAL", "FAIL"]) {
      if (votes[k] > max) {
        max = votes[k];
        win = k;
      }
    }
    return win;
  })();
  const dissent = verdicts
    .filter((v) => v.decision !== popular)
    .map((v) => ({ provider: v.id, decision: v.decision, rationale: v.rationale }));

  return {
    decision,
    reason,
    threshold,
    domain,
    filesScanned: files.map((f) => f.path),
    providers: verdicts.map((v) => ({
      id: v.id,
      persona: v.persona,
      decision: v.decision,
      rationale: v.rationale,
    })),
    votes,
    weighted,
    dissent,
  };
}

const result = main(process.argv.slice(2));
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
process.exit(0);
