// cimco-post-proof.mjs — JM-fleet post-proof readiness + golden-integrity ledger.
//
// Operator goal: "prove out ALL post processors for the JM fleet to 100% working — live
// testing on approval." A faked PASS would be a lie (echo refuses
// shipping-post-without-byte-equivalence-vs-golden). So this is HONEST about proof method:
// a true post-proof needs either (a) PRISM re-emits the program via its post and we
// compareNC vs the golden, or (b) a CIMCO Machine-Sim run on the mapped .mcfg. Both have
// real prerequisites (CAM source / live app). What we CAN do offline NOW and ship today:
//   1. PROOF-READINESS LEDGER — per machine: golden corpus, CIMCO sim machine (tier), units,
//      proof method available, and the concrete BLOCKERS to a 100% proof.
//   2. GOLDEN-INTEGRITY DRIFT AUDIT — real compareNC across same-base-name program variants
//      (e.g. "ALL STAR .NC" 544B vs "ALL STAR.NC" 1592B) → surfaces copy-drift/versioning in
//      the golden archive itself (you cannot prove posts against a drifted golden set).
//   3. VOLATILE-HEADER DETECTION — finds DATE=/TIME=/file-path comment lines that never
//      byte-match on re-emission, and emits the exact `volatileCommentMask` to use with compareNC.
//
// Reads: state/shared/cimco/jm-fleet-sim-map.json + the JM DIE golden corpus.
// Writes: state/shared/cimco/jm-post-proof.{json,md}. Uses scripts/lib/nc-normalize.mjs (compareNC).
// Pure helpers are unit-tested; run() is bounded (never walks the full 131K-file lathe tree).
// Tests: scripts/cimco-post-proof.test.mjs. Wiki: [[cimco-verification-simulation-integration]].

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { roundTrip } from "./lib/nc-dialect-masks.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const SIM_MAP = resolve(REPO, "state/shared/cimco/jm-fleet-sim-map.json");
const JM_ROOT = resolve(REPO, "JM DIE");
const OUT_JSON = resolve(REPO, "state/shared/cimco/jm-post-proof.json");
const OUT_MD = resolve(REPO, "state/shared/cimco/jm-post-proof.md");

// Dialect-spanning NC program extensions across the JM fleet: Haas/Fanuc .nc, Okuma .min,
// Hurco .hnc (conversational), + generic. (.hnc added after fleet recon found 24 Hurco goldens missed.)
const NC_EXT = new Set([".nc", ".min", ".eia", ".prg", ".pim", ".mpf", ".ssb", ".hnc"]);
const WALK_CAP = 1500; // never enumerate the full huge-dir tree

// machine_name / controller keyword → golden corpus subdir(s) under "JM DIE".
const GOLDEN_RULES = [
  { test: (m) => /multus/i.test(m.machine_name), dirs: ["CNC OKUMA MULTUS"] },
  { test: (m) => /haas/i.test(m.machine_name), dirs: ["CNC MILL HAAS", "HAAS-HURCO"] },
  { test: (m) => /hurco/i.test(m.machine_name), dirs: ["HURCO CNC PROGRAMS", "HURCO"] },
  { test: (m) => /roku/i.test(m.machine_name), dirs: ["ROKU-ROKU"] },
  { test: (m) => m.type === "lathe" && /okuma/i.test(m.machine_name), dirs: ["CNC LATHE", "OKUMA", "LATHE"] },
  { test: (m) => m.type === "wire_edm", dirs: ["WIRE EDM"] },
  { test: (m) => m.type === "sinker_edm", dirs: ["CNC EDM", "WIRE EDM"] },
];

/** Resolve the existing golden corpus dirs for a JM machine. */
export function resolveGoldenDirs(machine, root = JM_ROOT) {
  for (const r of GOLDEN_RULES) {
    if (r.test(machine)) {
      const present = r.dirs.map((d) => resolve(root, d)).filter((p) => existsSync(p));
      if (present.length) return present;
    }
  }
  return [];
}

/** Bounded recursive walk for NC-program files (caps to avoid the 131K-file lathe tree). */
export function walkNC(dir, cap = WALK_CAP) {
  const out = [];
  const stack = [dir];
  let capped = false;
  while (stack.length) {
    const d = stack.pop();
    let ents;
    try {
      ents = readdirSync(d, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of ents) {
      const p = join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (NC_EXT.has(extname(e.name).toLowerCase())) {
        out.push(p);
        if (out.length >= cap) {
          capped = true;
          return { files: out, capped };
        }
      }
    }
  }
  return { files: out, capped };
}

/** Group program files by a normalized base name (strip spaces + extension + case). */
export function groupByBaseName(files) {
  const by = {};
  for (const f of files) {
    const base = String(f).split(/[\\/]/).pop().replace(/\.[^.]+$/, "").replace(/\s+/g, "").toUpperCase();
    (by[base] = by[base] || []).push(f);
  }
  return by;
}

// A same-base-name pair below this body-similarity is a NAME COLLISION (two unrelated parts that
// happen to share a filename across customer subdirs — e.g. WSR\CASE1250.MIN vs THOMASON\CASE1250.MIN),
// NOT golden copy-drift. Same-program re-saves share ~all lines (Jaccard→1); different parts share few.
export const NAME_COLLISION_THRESHOLD = 0.4;

/**
 * Body similarity (0..1) = Jaccard over the set of normalized semantic lines (blank, paren-comment, and
 * the Okuma `$NAME.MIN%` echo are dropped — they carry no part identity). A cheap "are these the same
 * program?" proxy used to split true golden copy-drift (high similarity) from filename collisions (low).
 */
export function bodySimilarity(a, b) {
  const norm = (t) =>
    new Set(
      String(t)
        .split(/\r?\n/)
        .map((l) => l.trim().toUpperCase())
        .filter((l) => l && !/^\(.*\)$/.test(l) && !/^\$.*%$/.test(l)),
    );
  const A = norm(a);
  const B = norm(b);
  if (A.size === 0 && B.size === 0) return 1;
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 1 : inter / union;
}

// Volatile header comment patterns (never byte-match on re-emission) + the mask to neutralize them.
export const VOLATILE_PATTERNS = [
  { name: "date", pattern: "DATE=[^)]*", replacement: "DATE=*" },
  { name: "time", pattern: "TIME=[^)]*", replacement: "TIME=*" },
  { name: "filepath", pattern: "(?:MCX|NC|MCAM)\\s*FILE\\s*-\\s*[^)]*", replacement: "FILE-*" },
];

/** Which volatile header types appear in an NC program (for the compareNC mask + re-emission warning). */
export function detectVolatile(text) {
  const found = [];
  for (const v of VOLATILE_PATTERNS) if (new RegExp(v.pattern, "i").test(String(text))) found.push(v.name);
  return found;
}

/** The volatileCommentMask to pass to compareNC for a re-emission byte-check (neutralizes header churn). */
export function volatileMask() {
  return VOLATILE_PATTERNS.map((v) => ({ pattern: v.pattern, replacement: v.replacement, flags: "gi" }));
}

/** Classify the proof method currently available for a machine (honest about prerequisites). */
export function classifyProofMethod(machine) {
  if (machine.type === "sinker_edm" || machine.type === "wire_edm")
    return { method: "prism-discharge-physics", offlineNow: true, note: "CIMCO sim does not model EDM; PRISM owns it." };
  const blockers = [];
  if (machine.status === "needs-authoring") blockers.push("no CIMCO .mcfg (author from PRISM kinematics)");
  if (machine.cimcoMatch && machine.cimcoMatch.unit && machine.cimcoMatch.unit !== "inch")
    blockers.push("candidate .mcfg units != inch (resolve 25.4x guard)");
  // The two real proof methods, both gated:
  blockers.push("CIMCO Machine-Sim run needs the live app (SPINE-2 UIA) or a headless sim CLI");
  blockers.push("byte-equivalence re-emission needs the CAM source to regenerate the golden program");
  return { method: "golden-integrity-audit", offlineNow: true, plannedProof: ["cimco-sim", "byte-equivalence-reemit"], blockers };
}

/** Build the per-machine proof-readiness ledger + golden-integrity drift audit. */
export function buildProofLedger(simMap, opts = {}) {
  const root = opts.root || JM_ROOT;
  const maxDriftPairs = opts.maxDriftPairs ?? 40;
  const machines = [];
  for (const m of simMap.machines || []) {
    const goldenDirs = resolveGoldenDirs(m, root);
    let files = [];
    let capped = false;
    for (const d of goldenDirs) {
      const w = walkNC(d);
      files = files.concat(w.files);
      capped = capped || w.capped;
      if (files.length >= WALK_CAP) {
        capped = true;
        break;
      }
    }
    // golden-integrity: same-base-name groups → compareNC pairs (bounded).
    const groups = groupByBaseName(files);
    const driftCandidates = Object.entries(groups).filter(([, v]) => v.length > 1);
    const drift = [];
    let pairsChecked = 0;
    let volatileTypes = new Set();
    const dialectsSeen = new Set();
    for (const [base, vs] of driftCandidates) {
      if (pairsChecked >= maxDriftPairs) break;
      try {
        const a = readFileSync(vs[0], "utf8");
        const b = readFileSync(vs[1], "utf8");
        detectVolatile(a).forEach((t) => volatileTypes.add(t));
        // Dialect-aware classification (canonical roundTrip): byte-identical | volatile-header-only | semantic-drift.
        // More accurate than a generic header mask — applies the right per-dialect mask (PRISM source path,
        // Mitsubishi paren-date, Mastercam DATE/TIME/FILE) so header churn is not mistaken for content drift.
        const rt = roundTrip(a, b);
        dialectsSeen.add(rt.dialect);
        // A "semantic-drift" pair across same-base files is only TRUE copy-drift if the two are the
        // SAME program (high body similarity). Different parts sharing a filename across customer subdirs
        // = a NAME COLLISION, not a golden-integrity problem — re-categorize so the operator isn't told
        // 247 goldens "drifted" when they are just filename reuse. (recon 2026-06-03; U-CIMCO-DRIFT-GROUPING-FIX)
        let similarity = null;
        let nameCollision = false;
        if (rt.classification === "semantic-drift") {
          similarity = bodySimilarity(a, b);
          nameCollision = similarity < NAME_COLLISION_THRESHOLD;
        }
        drift.push({
          base,
          files: vs.length,
          dialect: rt.dialect,
          classification: rt.classification,
          equalRaw: rt.rawEqual,
          equalMasked: rt.maskedEqual,
          firstDiffLine: rt.firstDiff ? rt.firstDiff.line : null,
          similarity,
          nameCollision,
        });
        pairsChecked++;
      } catch {
        /* unreadable — skip */
      }
    }
    const proof = classifyProofMethod(m);
    machines.push({
      machine_id: m.machine_id,
      machine_name: m.machine_name,
      controller: `${m.controller_family}/${m.controller_model}`,
      type: m.type,
      simMachine: m.cimcoMatch ? `${m.cimcoMatch.displayName} (${m.status})` : `(${m.status})`,
      goldenDirs: goldenDirs.map((d) => d.replace(root, "JM DIE")),
      goldenCount: files.length,
      goldenCapped: capped,
      volatileHeaderTypes: [...volatileTypes],
      dialects: [...dialectsSeen],
      driftGroups: driftCandidates.length,
      driftChecked: drift.length,
      // TRUE copy-drift = same program, real content divergence (semantic-drift AND high body similarity).
      driftWithRealDiff: drift.filter((d) => d.classification === "semantic-drift" && !d.nameCollision).length,
      // NAME COLLISIONS = different parts that share a filename across subdirs (NOT golden-integrity drift).
      nameCollisions: drift.filter((d) => d.nameCollision).length,
      proofMethod: proof.method,
      proofOfflineNow: proof.offlineNow,
      blockers: proof.blockers || [],
      driftDetail: drift,
    });
  }
  const rollup = machines.reduce(
    (a, m) => {
      a.golden += m.goldenCount;
      a.driftGroups += m.driftGroups;
      a.driftContent += m.driftWithRealDiff;
      a.nameCollisions += m.nameCollisions;
      return a;
    },
    { golden: 0, driftGroups: 0, driftContent: 0, nameCollisions: 0 },
  );
  return {
    schemaVersion: "1.0.0",
    generatedFrom: "state/shared/cimco/jm-fleet-sim-map.json + JM DIE golden corpus",
    jmMachineCount: machines.length,
    rollup,
    proofDoctrine:
      "100% post-proof requires CIMCO-sim (live app / headless CLI) OR byte-equivalence re-emission (CAM source). Neither is faked here. Offline NOW: golden-integrity drift audit + readiness ledger. A masked-equal pair = header-only churn (safe, incl. the Okuma $NAME.MIN% echo); a content-differing pair is split by body similarity — TRUE copy-drift (same program, genuine divergence to reconcile) vs NAME COLLISION (different parts sharing a filename across customer subdirs, similarity<" +
      NAME_COLLISION_THRESHOLD +
      " — NOT a golden-integrity problem).",
    machines,
  };
}

/** Render a compact markdown summary. */
export function renderMd(ledger) {
  const rows = ledger.machines
    .map(
      (m) =>
        `| ${m.machine_id} | ${m.machine_name} | ${m.controller} | ${m.goldenCount}${m.goldenCapped ? "+" : ""} | ${m.simMachine} | ${m.proofMethod} | ${m.driftGroups}g/${m.driftWithRealDiff}drift/${m.nameCollisions ?? 0}coll |`,
    )
    .join("\n");
  return `# JM-Fleet Post-Proof Readiness — ${ledger.jmMachineCount} machines

> ${ledger.proofDoctrine}

Rollup: **${ledger.rollup.golden}** golden programs sampled · **${ledger.rollup.driftGroups}** same-name groups · **${ledger.rollup.driftContent}** TRUE copy-drift (same program, real divergence) · **${ledger.rollup.nameCollisions}** name collisions (different parts sharing a filename — not golden drift).

| Machine | Name | Controller | Golden | CIMCO Sim Machine (tier) | Proof method (offline now) | Drift (groups/true-drift/collisions) |
|---|---|---|---|---|---|---|
${rows}

_Generated by \`scripts/cimco-post-proof.mjs\`. Golden counts are bounded samples (cap ${WALK_CAP}); "+" = capped._
`;
}

/** Build + (optionally) write the ledger. */
export function run({ write = false } = {}) {
  if (!existsSync(SIM_MAP)) throw new Error(`sim map not found (run scripts/cimco-jm-machine-map.mjs): ${SIM_MAP}`);
  const simMap = JSON.parse(readFileSync(SIM_MAP, "utf8"));
  const ledger = buildProofLedger(simMap);
  if (write) {
    writeFileSync(OUT_JSON, JSON.stringify(ledger, null, 2));
    writeFileSync(OUT_MD, renderMd(ledger));
  }
  return ledger;
}

const _argv1 = process.argv[1] || "";
if (_argv1.endsWith("cimco-post-proof.mjs")) {
  const ledger = run({ write: !process.argv.includes("--dry-run") });
  process.stdout.write(
    `JM post-proof readiness: ${ledger.jmMachineCount} machines, ${ledger.rollup.golden} golden sampled, ` +
      `${ledger.rollup.driftContent} TRUE copy-drift + ${ledger.rollup.nameCollisions} name-collisions.\n` +
      (process.argv.includes("--dry-run") ? "(dry-run)\n" : `written: ${OUT_JSON} + .md\n`),
  );
}
