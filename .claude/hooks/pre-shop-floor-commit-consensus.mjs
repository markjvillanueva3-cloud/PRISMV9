#!/usr/bin/env node
/**
 * pre-shop-floor-commit-consensus.mjs — PreToolUse hook on Bash 'git commit'.
 *
 * When staged files match shop-floor trigger patterns (physics constants,
 * post-processor, G-code emitter, Kienzle/Taylor coefficient files), runs a
 * 5-persona heuristic consensus gate inline. Mapping:
 *   FAIL        → exit 2 (commit BLOCKED), stderr carries "consensus FAIL"
 *   CONDITIONAL → exit 0, stderr warning (commit allowed but flagged)
 *   PASS        → exit 0, silent
 *   throw/IO    → exit 0 fail-OPEN (advisory hook, not safety oracle)
 *
 * Persona-weighted tally (mirrors P4-U05): home-domain expert weight 1.5,
 * others 1.0. Home-expert FAIL is a veto. Inline heuristics only — the hook
 * is self-contained ESM and never imports the engine (Claude Code spawns
 * hooks outside the mcp-server module graph).
 *
 * Test-only hatch: PRISM_CONSENSUS_FORCE_TIMEOUT=1 short-circuits to
 * CONDITIONAL with a "timeout" stderr line, used to verify the timeout
 * branch in PreShopFloorCommitConsensus.test.ts.
 *
 * P4-U03, INTEL-OLLAMA-OBSIDIAN-MS1.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// ── 1. Read hook input ──────────────────────────────────────────────
let payload = {};
try {
  const raw = readFileSync(0, "utf8");
  if (raw.trim().length > 0) payload = JSON.parse(raw);
} catch {
  // unreadable stdin — fail OPEN
  process.exit(0);
}

const toolName = payload?.tool_name ?? payload?.toolName ?? "";
const command =
  payload?.tool_input?.command ?? payload?.toolInput?.command ?? "";

// Only inspect Bash invocations that include `git commit`. Any other tool or
// command is none of our business.
if (toolName !== "Bash" || !/\bgit\s+commit\b/.test(command)) {
  process.exit(0);
}

// ── 2. Trigger patterns ─────────────────────────────────────────────
const TRIGGER_PATTERNS = [
  /(?:^|[\\/])src[\\/]physics[\\/]constants\.ts$/i,
  /PostProcessor[^/\\]*\.ts$/i,
  /GcodeEmit[^/\\]*\.ts$/i,
  /(?:^|[\\/])kienzle[^/\\]*\.(?:ts|js|json)$/i,
  /(?:^|[\\/])taylor[^/\\]*\.(?:ts|js|json)$/i,
];

function listStagedFiles() {
  try {
    const out = execFileSync("git", ["diff", "--cached", "--name-only"], {
      encoding: "utf8",
    });
    return out.split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

function getStagedDiff() {
  try {
    return execFileSync("git", ["diff", "--cached", "--unified=0"], {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch {
    return "";
  }
}

const stagedFiles = listStagedFiles();
const triggered = stagedFiles.filter((f) =>
  TRIGGER_PATTERNS.some((rx) => rx.test(f))
);

// 2a. Zero-overhead bypass when no shop-floor file is staged.
if (triggered.length === 0) {
  process.exit(0);
}

// ── 3. Test-only timeout hatch ──────────────────────────────────────
if (process.env.PRISM_CONSENSUS_FORCE_TIMEOUT === "1") {
  process.stderr.write(
    "[consensus] CONDITIONAL: gate timeout — proceeding with warning\n"
  );
  process.exit(0);
}

// ── 4. Domain detection ─────────────────────────────────────────────
const stagedDiff = getStagedDiff();

function detectDomain(files, diff) {
  const fileBlob = files.join(" ");
  const blob = fileBlob + "\n" + diff;
  if (/kienzle|kc[\s_]*1\.?1\b|physics[/\\]constants/i.test(blob)) return "kienzle";
  if (/G68\.2\b|tilted[-\s]?plane\b/i.test(blob)) return "dialect";
  if (/PostProcessor|GcodeEmit\b/i.test(fileBlob)) return "post-processor";
  if (/clamp[-\s]?(?:force|pressure)\b|workholding\b|fixture\b/i.test(blob)) return "fixture";
  return "safety";
}

const domain = detectDomain(triggered, stagedDiff);

// ── 5. 5-persona heuristic panel ────────────────────────────────────
function check(personaId, fn) {
  try {
    const r = fn();
    return { id: personaId, isHome: personaId === domain, ...r };
  } catch (err) {
    return {
      id: personaId,
      isHome: personaId === domain,
      decision: "CONDITIONAL",
      rationale: `heuristic threw: ${err?.message ?? String(err)}`,
    };
  }
}

const KC11_MIN = 1500; // N/mm² steel lower bound
const KC11_MAX = 2500; // N/mm² steel upper bound

const verdicts = [
  // kienzle-physicist — added kc1.1 lines: out-of-range → FAIL anywhere;
  // in-range outside physics/constants.ts → FAIL (must import).
  check("kienzle", () => {
    const inConstantsFile = triggered.some((f) =>
      /(?:^|[\\/])src[\\/]physics[\\/]constants\.ts$/i.test(f)
    );
    const kcRx = /^[+][^+].*\bkc[\s_]*1\.?1\b\s*[:=]\s*([0-9.]+)/gim;
    const kcMatches = [...stagedDiff.matchAll(kcRx)];
    for (const m of kcMatches) {
      const v = parseFloat(m[1]);
      if (Number.isFinite(v) && (v < KC11_MIN || v > KC11_MAX)) {
        return {
          decision: "FAIL",
          rationale: `kc1.1=${m[1]} outside steel range [${KC11_MIN},${KC11_MAX}] N/mm²`,
        };
      }
    }
    if (kcMatches.length > 0 && !inConstantsFile) {
      return {
        decision: "FAIL",
        rationale: "Kienzle constant inlined outside physics/constants.ts — must import",
      };
    }
    return { decision: "PASS", rationale: "no inline Kienzle drift" };
  }),

  // shop-floor-safety-auditor — softening detectors on added lines only.
  check("safety", () => {
    if (/^[+][^+].*--no-verify\b/m.test(stagedDiff)) {
      return { decision: "FAIL", rationale: "--no-verify flag added (skips hooks)" };
    }
    if (/^[+][^+].*\b(?:it|test|describe)\.skip\s*\(/m.test(stagedDiff)) {
      return { decision: "FAIL", rationale: ".skip added to test" };
    }
    if (/^[+][^+].*\bsoften(?:ed|ing)?\s*[-_\s]?(?:guard|gate|test|threshold)/im.test(stagedDiff)) {
      return { decision: "FAIL", rationale: "softened guard/gate/test/threshold" };
    }
    return { decision: "PASS", rationale: "no safety-softening signals" };
  }),

  // post-processor-engineer — raw G-code literal added with axis target.
  check("post-processor", () => {
    const inlineGcode =
      /^[+][^+].*["'`]\s*G(?:0[0-9]|9[0-2]|[1-9][0-9])\s+[XYZAB][-0-9.]+/m.test(stagedDiff);
    if (inlineGcode) {
      return {
        decision: "CONDITIONAL",
        rationale: "raw G-code literal inlined — verify dialect/macro path",
      };
    }
    return { decision: "PASS", rationale: "no inline G-code drift" };
  }),

  // dialect-translator — G68.2 introduced without a controller dialect tag.
  check("dialect", () => {
    const hasG682 = /^[+][^+].*\bG68\.2\b/m.test(stagedDiff);
    const hasDialectTag =
      /\b(?:okuma|fanuc|haas|mazak|heidenhain|siemens)\b/i.test(stagedDiff);
    if (hasG682 && !hasDialectTag) {
      return {
        decision: "CONDITIONAL",
        rationale: "G68.2 introduced without dialect tag — controllers diverge",
      };
    }
    return { decision: "PASS", rationale: "no dialect-mistranslation signals" };
  }),

  // fixture-designer — clamp-force change without ISO 13041 reference.
  check("fixture", () => {
    const hasClamp = /^[+][^+].*\bclamp[-\s]?(?:force|pressure)\b/im.test(stagedDiff);
    const hasISO = /\biso[-\s]?13041\b/i.test(stagedDiff);
    if (hasClamp && !hasISO) {
      return {
        decision: "CONDITIONAL",
        rationale: "clamp-force change without ISO 13041 reference",
      };
    }
    return { decision: "PASS", rationale: "no fixture-capability gap" };
  }),
];

// ── 6. Persona-weighted tally + home-expert FAIL veto ───────────────
const HOME_WEIGHT = 1.5;
const OFF_WEIGHT = 1.0;

const tally = { PASS: 0, CONDITIONAL: 0, FAIL: 0 };
let homeFail = false;
const dissent = [];
for (const v of verdicts) {
  const w = v.isHome ? HOME_WEIGHT : OFF_WEIGHT;
  tally[v.decision] = (tally[v.decision] ?? 0) + w;
  if (v.decision === "FAIL") {
    if (v.isHome) homeFail = true;
    dissent.push(`${v.id}: ${v.rationale}`);
  } else if (v.decision === "CONDITIONAL") {
    dissent.push(`${v.id}: ${v.rationale}`);
  }
}

let decision;
if (homeFail) {
  decision = "FAIL";
} else if (tally.FAIL > 0 && tally.FAIL >= tally.PASS) {
  decision = "FAIL";
} else if (tally.FAIL > 0 || tally.CONDITIONAL > 0) {
  decision = "CONDITIONAL";
} else {
  decision = "PASS";
}

// ── 7. Exit-code mapping ────────────────────────────────────────────
function tallyLine() {
  return `[consensus] domain=${domain} | weighted: PASS=${tally.PASS} CONDITIONAL=${tally.CONDITIONAL} FAIL=${tally.FAIL}\n`;
}

if (decision === "FAIL") {
  process.stderr.write(
    `[consensus] consensus FAIL on ${triggered.length} staged shop-floor file(s):\n` +
      dissent.map((d) => `  - ${d}`).join("\n") +
      "\n" +
      tallyLine()
  );
  process.exit(2);
}

if (decision === "CONDITIONAL") {
  process.stderr.write(
    `[consensus] CONDITIONAL on ${triggered.length} staged shop-floor file(s) — review advised:\n` +
      dissent.map((d) => `  - ${d}`).join("\n") +
      "\n"
  );
  process.exit(0);
}

// PASS — silent.
process.exit(0);
