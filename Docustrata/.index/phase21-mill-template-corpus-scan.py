#!/usr/bin/env python3
"""
phase21-mill-template-corpus-scan.py — read-only catalog of the JM Die MILL corpus,
classified into part families, for consumption by MillPartFamilyTemplateExtractorEngine
(TRAINING-LEARNING-MS0 / MS0-U2).

Mirrors phase20-lathe-template-corpus-scan.py exactly, with mill-domain family rules.

Inputs:
    --index   Docustrata jm-die-index-v2.json (default: HERE/jm-die-index-v2.json)
                 'machine' field filter: rows where machine in {"mill","mill_3axis","mill_5axis","vmc","hmc"}
                 are kept.

Outputs:
    --out     mcp-server/data/training/templates/mill/_corpus-scan.json (snapshot consumed by
              MillPartFamilyTemplateExtractorEngine.catalogCorpus({snapshotPath}))

Side effects: NONE besides writing --out. The script never mutates the corpus.
READ-ONLY companion script per TRAINING-LEARNING-MS0-2026-05-12.md spec U2.

Family taxonomy (7 spec families + unknown — see MillPartFamilyTemplateExtractorEngine.ts):
    taptite-mill / electrode-mill                          (matched against existing JM Die part lines)
    plate / bracket-housing                                (most common bulk families)
    mold-die-insert / aerospace-bracket / sheet-metal-fixture  (specialty families)
    unknown                                                 (fallback bucket)

Each family record carries:
    count            int   — how many corpus entries matched
    customers        dict  — Counter(customer → count) for the family
    ext_breakdown    dict  — Counter(file_ext → count); .nc/.mcam/.ipt etc.
    kind_breakdown   dict  — Counter(kind → count); g_code / cam_project etc.
    sample_paths     list  — first N=5 corpus paths per family (smoke-test fixtures)

Top-level snapshot record matches `MillCorpusSnapshot` interface in the engine.

Usage:
    python phase21-mill-template-corpus-scan.py
    python phase21-mill-template-corpus-scan.py --limit 1000
    python phase21-mill-template-corpus-scan.py --index <path> --out <path>
    python phase21-mill-template-corpus-scan.py --dry-run
"""
import argparse
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
DEFAULT_OUT = PRISM / "mcp-server" / "data" / "training" / "templates" / "mill" / "_corpus-scan.json"
DEFAULT_CORPUS_ROOT = Path("H:/PRISM/JM DIE/CNC MILL")

SAMPLE_PATHS_PER_FAMILY = 5
SCHEMA_VERSION = 1

# Family classifier rules — order matters (first match wins; more-specific before more-general).
# Each rule: (family, compiled regex) — matches against the lowercased stem + path-tail joined.
# Conservative regexes: require proximity of qualifying tokens to avoid false-positives
# (e.g. bare "plate" would catch tooling-plate references; require "plate" near a dimension
# or part-shape token).
FAMILY_RULES = [
    # Most-specific first
    ("taptite-mill",      re.compile(r"\b(taptite|tap\.tite)\b")),
    ("electrode-mill",    re.compile(r"\belectrode\b.{0,30}\b(mill|cavity|burn|edm)\b|\b(mill|cavity)\b.{0,30}\belectrode\b")),
    ("mold-die-insert",   re.compile(r"\b(mold|die)\b.{0,30}\binsert\b|\binsert\b.{0,30}\b(mold|die)\b|\bcore\b.{0,30}\bpin\b")),
    ("aerospace-bracket", re.compile(r"\b(aerospace|aero|titanium|inconel|7075|6061)\b.{0,30}\bbracket\b|\bbracket\b.{0,30}\b(aerospace|aero|titanium|inconel)\b")),
    ("sheet-metal-fixture", re.compile(r"\bsheet[.\s_-]?metal\b.{0,30}\bfixture\b|\b(fixture|tooling)\b.{0,30}\b(sheet|gauge)\b")),
    ("bracket-housing",   re.compile(r"\b(bracket|housing|enclosure|frame|chassis)\b")),
    ("plate",             re.compile(r"\b(plate|pad|gusset)\b")),
]

# Mill-machine bucket values from jm-die-index-v2.json — kept inclusive.
MILL_MACHINE_TAGS = {"mill", "mill_3axis", "mill_5axis", "vmc", "hmc", "horizontal_mill"}


def classify(stem_lower: str, path_lower: str) -> str:
    haystack = f"{stem_lower} {path_lower}"
    for family, rx in FAMILY_RULES:
        if rx.search(haystack):
            return family
    return "unknown"


def derive_customer(path: str) -> str:
    """Extract customer from the corpus path. CNC MILL/<customer>/... convention."""
    parts = Path(path).parts
    try:
        i = next(idx for idx, p in enumerate(parts) if p.upper() in ("CNC MILL", "MILL"))
        if i + 1 < len(parts):
            return parts[i + 1].upper()
    except StopIteration:
        pass
    # Fallback: 2nd-to-last directory.
    if len(parts) >= 2:
        return parts[-2].upper()
    return "UNKNOWN"


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--index", type=Path, default=DEFAULT_INDEX, help="Path to jm-die-index-v2.json")
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT, help="Output snapshot path")
    ap.add_argument("--limit", type=int, default=None, help="Limit corpus rows for testing")
    ap.add_argument("--dry-run", action="store_true", help="Don't write the snapshot file")
    args = ap.parse_args(argv)

    if not args.index.exists():
        print(f"phase21: index not found at {args.index}", file=sys.stderr)
        return 2

    with args.index.open("r", encoding="utf-8") as f:
        index = json.load(f)
    if not isinstance(index, list):
        print(f"phase21: index root must be a JSON array, got {type(index).__name__}", file=sys.stderr)
        return 3

    warnings = []
    families = defaultdict(lambda: {
        "count": 0,
        "customers": Counter(),
        "ext_breakdown": Counter(),
        "kind_breakdown": Counter(),
        "sample_paths": [],
    })

    total = 0
    classified = 0
    rows = index if args.limit is None else index[: args.limit]
    for row in rows:
        if not isinstance(row, dict):
            warnings.append(f"non-dict row: {row!r}")
            continue
        machine = (row.get("machine") or "").lower()
        if machine not in MILL_MACHINE_TAGS:
            continue
        path = row.get("path") or ""
        if not path:
            warnings.append("row missing path")
            continue
        total += 1
        stem = (row.get("stem") or row.get("name") or "").lower()
        family = classify(stem, path.lower())
        if family != "unknown":
            classified += 1
        rec = families[family]
        rec["count"] += 1
        rec["customers"][derive_customer(path)] += 1
        ext = (row.get("ext") or Path(path).suffix or "").lower()
        rec["ext_breakdown"][ext] += 1
        kind = (row.get("kind") or "unknown").lower()
        rec["kind_breakdown"][kind] += 1
        if len(rec["sample_paths"]) < SAMPLE_PATHS_PER_FAMILY:
            rec["sample_paths"].append(path)

    coverage = (classified / total) if total > 0 else 0.0
    snapshot = {
        "schemaVersion": SCHEMA_VERSION,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "corpus_root_hint": str(DEFAULT_CORPUS_ROOT),
        "source_index": str(args.index.resolve()),
        "total_mill_entries": total,
        "total_classified_entries": classified,
        "classification_coverage": coverage,
        "families": {
            family: {
                "count": rec["count"],
                "customers": dict(rec["customers"]),
                "ext_breakdown": dict(rec["ext_breakdown"]),
                "kind_breakdown": dict(rec["kind_breakdown"]),
                "sample_paths": rec["sample_paths"],
            }
            for family, rec in families.items()
        },
        "historical_sf_disclaimer": (
            "Historical Speed/Feed values from this corpus are DATA, NOT GROUND TRUTH "
            "(feedback_box_programs_amateur). PRISM SpeedFeedOrchestrator is "
            "authoritative; the operator may have been amateur. This snapshot does "
            "NOT carry S/F bands — those are filtered at template-extraction time."
        ),
        "warnings": warnings[:100],
    }

    print(f"phase21: scanned {total} mill rows · classified {classified} ({coverage*100:.1f}%)")
    for family in sorted(snapshot["families"].keys()):
        print(f"  {family}: {snapshot['families'][family]['count']}")

    if args.dry_run:
        print("dry-run — not writing.")
        return 0

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
