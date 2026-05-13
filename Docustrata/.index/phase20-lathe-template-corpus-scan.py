#!/usr/bin/env python3
"""
phase20-lathe-template-corpus-scan.py — read-only catalog of the JM Die LATHE corpus,
classified into part families, for consumption by LathePartFamilyTemplateExtractorEngine
(TRAINING-LEARNING-MS0 / MS0-U1).

Inputs:
    --index   Docustrata jm-die-index-v2.json (default: HERE/jm-die-index-v2.json)
                 schema: flat JSON array of {path, name, stem, ext, customer, machine, kind, size, mtime}
                 'machine' field is the bucket filter ("lathe" rows kept).
                 'customer' is unreliable for top-level files (echoes the filename) — we derive
                 customer from the path's parent directories when machine == "lathe".

Outputs:
    --out     mcp-server/data/training/templates/lathe/_corpus-scan.json (snapshot consumed by
              LathePartFamilyTemplateExtractorEngine.catalogCorpus({snapshotPath}))

Side effects: NONE besides writing --out. The script never mutates the corpus.
This is the READ-ONLY companion script per spec line 59 of TRAINING-LEARNING-MS0-2026-05-12.md.

Family taxonomy (8 + unknown — extends MacroLibraryEngine's 4 OSP-seed families):
    wafer-insert / casing / casing-counterbore / top-hat-casing  (MacroLibraryEngine seeds)
    shaft / flange / bushing / tube                              (spec line 60 expansion)
    taptite-blank / nut-blank / electrode-rod-blank              (spec line 60 expansion)
    unknown                                                       (fallback bucket)

Each family record carries:
    count            int   — how many corpus entries matched
    customers        dict  — Counter(customer → count) for the family
    ext_breakdown    dict  — Counter(file_ext → count); .MIN/.min/.ipt/.mcx-8 etc.
    kind_breakdown   dict  — Counter(kind → count); g_code / cam_project etc.
    sample_paths     list  — first N=5 corpus paths per family (smoke-test fixtures)
    seed_macros      list  — for {wafer-insert, casing, casing-counterbore, top-hat-casing}, the
                              MacroLibraryEngine seed file names (operator anchor — these
                              are the 4 OSP macros that already work in the shop)

Top-level snapshot record:
    schemaVersion              1
    generated_at               ISO-8601 UTC
    corpus_root_hint           absolute path string (informational)
    source_index               absolute path of the consumed jm-die-index-v2.json
    total_lathe_entries        int
    total_classified_entries   int
    classification_coverage    float (0..1) — classified / total_lathe_entries
    families                   { <family>: <record> }
    historical_sf_disclaimer   string  — feedback_box_programs_amateur note: historical S/F
                                          values are DATA, NOT GROUND TRUTH (operator may have
                                          been amateur; physics-derived recommendation wins on
                                          disagreement). The snapshot intentionally does NOT
                                          carry S/F bands — those live in the engine's template
                                          extraction step where physics gating applies.
    warnings                   list of strings   (e.g. malformed entries, missing 'path' field)

Usage:
    python phase20-lathe-template-corpus-scan.py
    python phase20-lathe-template-corpus-scan.py --limit 1000
    python phase20-lathe-template-corpus-scan.py --index <path> --out <path>
    python phase20-lathe-template-corpus-scan.py --dry-run
"""
import json
import os
import re
import sys
import time
from pathlib import Path
from collections import Counter, defaultdict


HERE = Path(__file__).resolve().parent
PRISM = HERE.parent.parent  # H:/prism
DEFAULT_INDEX = HERE / "jm-die-index-v2.json"
DEFAULT_OUT = PRISM / "mcp-server" / "data" / "training" / "templates" / "lathe" / "_corpus-scan.json"
DEFAULT_CORPUS_ROOT = Path("H:/PRISM/JM DIE/CNC LATHE")

SAMPLE_PATHS_PER_FAMILY = 5
SCHEMA_VERSION = 1

# Seed macros that already work in the shop — anchored from MacroLibraryEngine.
# These are operator-vetted; classification gives them implicit-priority membership in their family.
# Canonical 1-to-1 mapping mirrored from MacroLibraryEngine.ts:96/104/112/120. Each seed
# anchor maps to exactly ONE family (the file's canonical home per the engine). NEVER
# double-key an anchor — dict-insertion-order would silently route to the first-defined
# family, breaking the canonical mapping. Pass-2 fix caught by smoke-test (P0-level —
# would have mis-classified the counterbore seed as plain `casing`).
SEED_MACROS = {
    "wafer-insert": ["BASE WAFER INSERT MACRO.min"],
    "casing": ["BASIC-CASING.MIN"],
    "casing-counterbore": ["BASIC CASING WITH SINGLE COUNTERBORE.min"],
    "top-hat-casing": ["BASIC TOP HAT CASING WITH SINGLE COUNTERBORE.min"],
}

# Family classifier rules — order matters (first match wins; more-specific before more-general).
# Each rule: (family, compiled regex) — matches against the lowercased stem + path-tail joined.
# Build patterns from MacroLibraryEngine's nameTerms (sniffed 2026-05-12) PLUS spec line 60 additions.
def _compile_rules():
    # Per-file-scrutiny pass-1 finding: regex classifier over-fires when bare generic terms are
    # accepted (e.g. `inserts?` for wafer-insert catches every carbide-insert file; `electrode`
    # for electrode-rod-blank catches finished electrode parts; `casing` over-accepted `can`/
    # `case` which collides with case-hardened steel). Pass-2 tightens these to require
    # PROXIMITY of the qualifying second token — wafer⇄insert, electrode⇄(rod|blank),
    # taptite⇄(blank?), and drops the ambiguous `can` and bare `case` from casing.
    families = [
        # MacroLibraryEngine seed families (most-specific first)
        ("top-hat-casing", r"\b(top.?hat|tophat|flanged.casing)\b"),
        ("casing-counterbore", r"\b(casing|housing).{0,30}\b(counterbore|cbore|c.?bore)\b|\b(counterbore|cbore|c.?bore).{0,30}\b(casing|housing)\b"),
        # Casing rule (post-fix): kept `casing/housing/shell/body` (genuinely lathe-shop terms
        # for cylindrical hollow parts); DROPPED `case` (collides with `case-hardened`) and
        # `can` (3-letter false-positive). Operator can still hit edge cases via SEED_MACROS.
        ("casing", r"\b(casing|housing|shell|body)\b"),
        # Wafer-insert rule (post-fix): require `wafer` proximity to `insert(s)` so generic
        # carbide-insert filenames don't false-positive. Either order accepted.
        ("wafer-insert", r"\bwafer\b.{0,30}\binserts?\b|\binserts?\b.{0,30}\bwafer\b|\bwafer.?(insert|cut)\b"),
        # Spec line 60 expansions
        # Taptite-blank rule (post-fix): bare `taptite` is acceptable (it's an unambiguous
        # trademark/term in this shop; SEED_MACROS for taptite-blanks not yet anchored, so a
        # genuine TAPTITE file is correctly bucketed).
        ("taptite-blank", r"\b(taptite|tap.tite|tap.blank)\b"),
        # Electrode-rod-blank rule (post-fix): require `rod` OR `blank` proximity, so finished
        # electrode parts don't false-positive into a blanks bucket. The name suffix "-blank"
        # mandates this — without proximity, family-name and what-the-regex-actually-matches
        # disagree (a contradiction Reviewer A flagged in P1-2 / Reviewer B in P1-1).
        ("electrode-rod-blank", r"\belectrode\b.{0,20}\b(rod|blank)\b|\b(rod|blank).{0,20}\belectrode\b|\belect.?rod\b"),
        ("nut-blank", r"\b(nut.blank|hex.nut.blank|hexnut|nutblank|hex.nut|jam.nut)\b"),
        ("flange", r"\b(flange|flanges|bolt.circle|bolt.flange)\b"),
        ("bushing", r"\b(bushing|bushings|sleeve|sleeves|hub|hubs|bush|bushing.thin)\b"),
        ("tube", r"\b(tube|tubes|tubing|hollow|hollow.stock|tube.stock)\b"),
        ("shaft", r"\b(shaft|shafts|stub|stub.shaft|pin|pins|rod|rods|axle|axles|spline.shaft|stepped.shaft|threaded.shaft|keyway.shaft)\b"),
    ]
    return [(name, re.compile(pat, re.IGNORECASE)) for name, pat in families]


CLASSIFIER_RULES = _compile_rules()


def parse_args(argv):
    args = {
        "index": DEFAULT_INDEX,
        "out": DEFAULT_OUT,
        "limit": 0,
        "dry_run": False,
        "corpus_root_hint": str(DEFAULT_CORPUS_ROOT),
    }
    i = 1
    while i < len(argv):
        a = argv[i]
        if a == "--index" and i + 1 < len(argv):
            args["index"] = Path(argv[i + 1])
            i += 2
        elif a == "--out" and i + 1 < len(argv):
            args["out"] = Path(argv[i + 1])
            i += 2
        elif a == "--limit" and i + 1 < len(argv):
            try:
                # Clamp negative to 0 (= unlimited). P1 fix per-file-scrutiny: a bare negative
                # passed through earlier silently truncated to zero entries on the first row
                # (because `total_lathe > -N` was always true after the first entry).
                raw_limit = int(argv[i + 1])
                args["limit"] = max(0, raw_limit)
            except ValueError:
                pass
            i += 2
        elif a == "--corpus-root-hint" and i + 1 < len(argv):
            args["corpus_root_hint"] = argv[i + 1]
            i += 2
        elif a == "--dry-run":
            args["dry_run"] = True
            i += 1
        elif a in ("-h", "--help"):
            print(__doc__)
            sys.exit(0)
        else:
            print(f"warning: ignoring unknown arg {a!r}", file=sys.stderr)
            i += 1
    return args


def derive_customer(path_str):
    """The index's 'customer' field echoes the filename for top-level files. Derive the
    real customer from path segments: '/CNC LATHE/<CUSTOMER>/.../<file>' → CUSTOMER.
    Files directly under '/CNC LATHE/<file>' (no customer folder) get '_TOP_LEVEL'.
    Windows backslashes are handled — we normalize to forward slash before splitting.
    """
    if not isinstance(path_str, str) or not path_str:
        return "_UNKNOWN"
    norm = path_str.replace("\\", "/")
    # Look for 'CNC LATHE' segment case-insensitively, take next segment if any.
    segments = [s for s in norm.split("/") if s]
    for idx, seg in enumerate(segments):
        if seg.strip().upper() == "CNC LATHE":
            tail = segments[idx + 1:]
            if not tail:
                return "_TOP_LEVEL"
            # If the next segment is the actual filename (last segment), no customer folder.
            if len(tail) == 1:
                return "_TOP_LEVEL"
            return tail[0]
    return "_UNKNOWN"


def _matches_seed_macro_anchor(stem, anchor):
    """Equality check between an index-entry stem (already extension-less per the index schema)
    and a SEED_MACROS anchor (carries trailing .min/.MIN). Strip the anchor's extension and
    do a case-insensitive equality. NEVER substring — substring over-fires when a short stem
    happens to be a substring of an anchor (P1 fix per-file-scrutiny pass-1).
    """
    if not stem:
        return False
    anchor_stem = anchor.lower().rsplit(".", 1)[0]
    return stem.lower() == anchor_stem or stem.lower() == anchor.lower()


def classify_part(stem, path_str):
    """Return the family name for a corpus entry. First-match-wins by rule order.
    Returns 'unknown' if no rule fires. SEED_MACROS override — if the file name matches
    a seed macro EXACTLY (equality, never substring), the family is forced (anchor for
    operator-vetted programs).
    """
    name_lower = (stem or "").lower()
    for fam, anchors in SEED_MACROS.items():
        if any(_matches_seed_macro_anchor(stem, a) for a in anchors):
            return fam
    # Build the haystack: stem + last 3 path segments (provides folder-level context).
    norm = (path_str or "").replace("\\", "/")
    tail_segments = [s for s in norm.split("/") if s][-3:]
    haystack = " ".join([name_lower] + [s.lower() for s in tail_segments])
    for fam, pat in CLASSIFIER_RULES:
        if pat.search(haystack):
            return fam
    return "unknown"


def empty_record():
    return {
        "count": 0,
        "customers": Counter(),
        "ext_breakdown": Counter(),
        "kind_breakdown": Counter(),
        "sample_paths": [],
        "seed_macros": [],
    }


def scan(index_path, limit, corpus_root_hint=None):
    """Walk the jm-die-index-v2.json (READ-ONLY) and emit a family-grouped catalog.

    corpus_root_hint: informational only — surfaces in the snapshot's `corpus_root_hint`
    field for downstream tooling that wants to know which corpus root the catalog represents.
    """
    warnings = []
    if not Path(index_path).exists():
        return None, [f"index_not_found: {index_path}"]
    try:
        with open(index_path, encoding="utf-8") as f:
            entries = json.load(f)
    except json.JSONDecodeError as e:
        return None, [f"index_malformed_json: {e!s}"]
    if not isinstance(entries, list):
        return None, [f"index_not_array: type={type(entries).__name__}"]

    families = defaultdict(empty_record)
    total_lathe = 0
    total_classified = 0
    processed = 0

    for raw in entries:
        if not isinstance(raw, dict):
            warnings.append("entry_not_object_skipped")
            continue
        path_str = raw.get("path")
        if not isinstance(path_str, str) or not path_str:
            warnings.append("entry_missing_path_skipped")
            continue
        machine = (raw.get("machine") or "").strip().lower()
        if machine != "lathe":
            continue
        total_lathe += 1
        if limit and total_lathe > limit:
            break

        stem = raw.get("stem") or ""
        ext = (raw.get("ext") or "").lower()
        kind = raw.get("kind") or "unknown"
        customer = derive_customer(path_str)
        family = classify_part(stem, path_str)
        if family != "unknown":
            total_classified += 1

        rec = families[family]
        rec["count"] += 1
        rec["customers"][customer] += 1
        rec["ext_breakdown"][ext] += 1
        rec["kind_breakdown"][kind] += 1
        if len(rec["sample_paths"]) < SAMPLE_PATHS_PER_FAMILY:
            rec["sample_paths"].append(path_str)
        # Seed-macro tagging: surface the operator-vetted anchor inside the family record.
        if family in SEED_MACROS:
            # Use shared _matches_seed_macro_anchor helper so both the classifier (line 180)
            # and the tag-aggregator agree on what "anchor match" means (P1 fix per-file-scrutiny).
            anchors = [a for a in SEED_MACROS[family] if _matches_seed_macro_anchor(stem, a)]
            for a in anchors:
                if a not in rec["seed_macros"]:
                    rec["seed_macros"].append(a)
        processed += 1

    # Convert Counters to plain dicts (JSON serializable, deterministic key order).
    families_out = {}
    for fam, rec in families.items():
        families_out[fam] = {
            "count": rec["count"],
            "customers": dict(sorted(rec["customers"].items(), key=lambda kv: (-kv[1], kv[0]))),
            "ext_breakdown": dict(sorted(rec["ext_breakdown"].items(), key=lambda kv: (-kv[1], kv[0]))),
            "kind_breakdown": dict(sorted(rec["kind_breakdown"].items(), key=lambda kv: (-kv[1], kv[0]))),
            "sample_paths": rec["sample_paths"],
            "seed_macros": rec["seed_macros"],
        }

    classification_coverage = (total_classified / total_lathe) if total_lathe > 0 else 0.0

    snapshot = {
        "schemaVersion": SCHEMA_VERSION,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "corpus_root_hint": str(corpus_root_hint) if corpus_root_hint else str(DEFAULT_CORPUS_ROOT),
        "source_index": str(index_path),
        "total_lathe_entries": total_lathe,
        "total_classified_entries": total_classified,
        "classification_coverage": round(classification_coverage, 4),
        "families": families_out,
        "historical_sf_disclaimer": (
            "Historical Speed/Feed values from this corpus are DATA, NOT GROUND TRUTH "
            "(per feedback_box_programs_amateur, 2026-05). Treat any S/F band derived "
            "from this catalog as a stochastic distribution to compare against the "
            "PRISM physics-derived recommendation (SpeedFeedOrchestrator), not as a "
            "target to converge on. The operator may have been amateur or may have "
            "known something the physics did not — log disagreements as deviation "
            "outcomes, never silently override the physics. This snapshot intentionally "
            "does NOT carry S/F bands; those live in the engine's template-extraction "
            "step where physics gating applies."
        ),
        "warnings": warnings,
    }
    return snapshot, warnings


def main():
    args = parse_args(sys.argv)

    print(f"phase20-lathe-template-corpus-scan", flush=True)
    print(f"  index: {args['index']}", flush=True)
    print(f"  out:   {args['out']}", flush=True)
    print(f"  limit: {args['limit'] or '(no limit)'}", flush=True)
    print(f"  dry_run: {args['dry_run']}", flush=True)

    t0 = time.time()
    snapshot, warnings = scan(args["index"], args["limit"], args["corpus_root_hint"])
    elapsed = time.time() - t0

    if snapshot is None:
        print("FAIL: snapshot generation failed", file=sys.stderr, flush=True)
        for w in warnings:
            print(f"  {w}", file=sys.stderr, flush=True)
        sys.exit(2)

    print(f"  scanned {snapshot['total_lathe_entries']} lathe entries in {elapsed:.2f}s", flush=True)
    print(f"  classified {snapshot['total_classified_entries']} "
          f"({snapshot['classification_coverage']*100:.1f}% coverage)", flush=True)
    print(f"  families:", flush=True)
    for fam, rec in sorted(snapshot["families"].items(), key=lambda kv: -kv[1]["count"]):
        seed_note = f"  seeds={','.join(rec['seed_macros'])}" if rec.get("seed_macros") else ""
        print(f"    {fam:24} n={rec['count']:>6}{seed_note}", flush=True)
    if warnings:
        print(f"  warnings: {len(warnings)}", flush=True)
        for w in warnings[:5]:
            print(f"    - {w}", flush=True)

    if args["dry_run"]:
        print("dry_run=True — not writing snapshot.", flush=True)
        sys.exit(0)

    out_path = Path(args["out"])
    out_path.parent.mkdir(parents=True, exist_ok=True)
    # Atomic write: tmp + rename (6-chat-safe; never leaves a partial file under --out).
    tmp_path = out_path.with_suffix(out_path.suffix + f".tmp-{os.getpid()}-{int(time.time()*1000)}")
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, indent=2, sort_keys=False)
    os.replace(tmp_path, out_path)
    print(f"wrote: {out_path}", flush=True)


if __name__ == "__main__":
    main()
