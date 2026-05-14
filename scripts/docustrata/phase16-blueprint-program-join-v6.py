"""
Phase 16 — Blueprint <-> Program/CAD join v6

v6 = v5's proven join logic, re-pointed at the CLEANED, COMPLETE inputs:
  - v5 ran 2026-05-12 against a still-running phase-15 (673 huge PDFs deferred) and
    the RAW per-page part_numbers (which leak dates / phones / dimension callouts).
  - v6 reads `phase20-verified-prints.jsonl` — the consolidated verified-prints
    index built by phase20-verified-prints-index.py (MS-DOCU-FINISH/U-DOCU-02),
    which dedups phase-15's parallel+memsafe double-append (44k dup page records)
    and applies a strict PN filter (rejects dates / phones / years / OCR noise /
    dimension callouts). phase-15 itself is now complete (21,545 docs).

Everything else — normalization, the program-filename + internal-name indexes,
the path-based customer recovery, the customer cross-check, the confidence tiers —
is carried over verbatim from phase16-blueprint-program-join-v5.py so the join
semantics stay consistent with mcp-server/src/engines/BlueprintProgramJoinEngine.ts.

INPUTS
  phase20-verified-prints.jsonl        per verified-print-page records:
      {doc_id, filename, disk_path, page_index, part_numbers[], drawing_number,
       revision, material, customer, is_drawing_likely, strong_indicators}
  H:/prism/mcp-server/data/state/jm-die-full-program-index-v2.json   (or v1)
  program-internal-names.json          renamed-file recovery

OUTPUTS
  blueprint-program-join-full-v6.jsonl  one record per normalized PN
  phase16-v6-summary.md
"""
from __future__ import annotations
import json
import re
import sys
import io
import time
from collections import defaultdict, Counter
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

INDEX = Path(r"H:\PRISM\Docustrata\.index")
PHASE20 = INDEX / "phase20-verified-prints.jsonl"
_JM_V2 = Path(r"H:\prism\mcp-server\data\state\jm-die-full-program-index-v2.json")
_JM_V1 = Path(r"H:\prism\mcp-server\data\state\jm-die-full-program-index.json")
JM_FULL = _JM_V2 if _JM_V2.exists() else _JM_V1
INTERNAL = INDEX / "program-internal-names.json"
OUT = INDEX / "blueprint-program-join-full-v6.jsonl"
SUMMARY = INDEX / "phase16-v6-summary.md"

AMBIGUOUS_THRESHOLD = 25
MAX_PROGRAMS_PER_RECORD = 60

# -- normalization (ported verbatim from v5 / BlueprintProgramJoinEngine.ts) ---
OP_PREFIX_RE = re.compile(r"^(?:L|M|G)-", re.I)
OP_NUMBER_RE = re.compile(r"-OP\d+$", re.I)
REV_LETTER_RE = re.compile(r"-[A-Z]$", re.I)
MATERIAL_CODE_RE = re.compile(
    r"-(?:D2|A2|S7|H13|O1|M2|HSS|4140|4340|6061|7075|2024|17-?4|303|304|316|410|420|440[CB]?)$",
    re.I,
)
EXT_RE = re.compile(
    r"\.(?:MIN|NC|NCM|TAP|EIA|SPF|MPF|PIM|DXF|DWG|IDW|STEP|STP|IGES|IGS|SLDPRT|SLDASM|"
    r"IPT|IAM|F3D|PRT|CATPart|MCX|MCX-6|MCX-8|MCAM|X_B|X_T|STL|CYC|HNC|HMC|POF|DEF)$",
    re.I,
)


def normalize_pn(raw: str) -> str:
    if not isinstance(raw, str):
        return ""
    s = raw.strip().upper()
    if not s:
        return ""
    s = OP_PREFIX_RE.sub("", s)
    s = re.sub(r"\s+", "", s)
    prev = ""
    while prev != s:
        prev = s
        s = OP_NUMBER_RE.sub("", s)
        s = MATERIAL_CODE_RE.sub("", s)
        s = REV_LETTER_RE.sub("", s)
    return s


def filename_candidates(file_name: str) -> set[str]:
    if not isinstance(file_name, str) or not file_name:
        return set()
    base = EXT_RE.sub("", file_name).upper()
    cands = {base, OP_PREFIX_RE.sub("", base)}
    for d in re.findall(r"(?<![A-Za-z0-9])\d{3,}(?![A-Za-z0-9])", base):
        cands.add(d)
    for c in re.findall(r"(?<![A-Za-z0-9])\d+-\d+(?![A-Za-z0-9])", base):
        cands.add(c)
    cands.discard("")
    return cands


def digits_only(s: str) -> str:
    return "".join(re.findall(r"\d+", s))


# -- customer-name normalization (verbatim from v5) ---------------------------
_CUST_SUFFIX_RE = re.compile(
    r"(INCORPORATED|CORPORATION|MANUFACTURING|INDUSTRIES|FASTENERS|FASTENER|SOLUTIONS|"
    r"PRODUCTS|COMPANY|GROUP|MFG|CORP|INC|LLC|LTD|CO)$"
)


def cust_key(s: str) -> str:
    if not isinstance(s, str):
        return ""
    k = re.sub(r"[^A-Z0-9]", "", s.upper())
    m = _CUST_SUFFIX_RE.search(k)
    if m and m.start() >= 4:
        k = k[: m.start()]
    return k[:14] if len(k) >= 4 else ""


def cust_overlap(a: str, b: str) -> bool:
    if not a or not b or len(a) < 4 or len(b) < 4:
        return False
    if a == b or a in b or b in a:
        return True
    n = min(len(a), len(b), 7)
    return n >= 6 and a[:n] == b[:n]


# -- path-based customer recovery (verbatim from v5) --------------------------
_CUST_ANCHOR_RE = re.compile(
    r"^(CUSTOMERS?|CNC\s*LATHE|CNC\s*MILL|WIRE\s*EDM|EDM|MILL|LATHE|ROKU.?ROKU|PARTS)$", re.I
)
_NON_CUSTOMER_SEG_RE = re.compile(
    r"^("
    r"PRISM|JM\s*DIE|RESOURCES?|JM\s*DIE\s*COMPANY|"
    r"CUSTOMERS?|CNC\s*LATHE|CNC\s*MILL|WIRE\s*EDM|EDM|MILL|LATHE|ROKU.?ROKU|PARTS|"
    r".*USB.*|NATHANS?(\s*USB)?|"
    r"PROGRAMS?(\s*MCAM)?(\s*X\d)?|MCAM(\s*X\d)?|MASTERCAM|MCX.*|HSMWORKS|FUSION.*|"
    r"OLD\s*VERSIONS?|OLD\s*PROGRAMS?|ORIGINALS?|BACKUPS?|ARCHIVES?|"
    r"NEW\s*FOLDER.*|UNTITLED.*|TEMP|TMP|MISC|MISCELLANEOUS|JUNK|"
    r"DESKTOP|DOCUMENTS|DOWNLOADS|PROGRAM\s*FILES.*|USERS?|"
    r"CNC\s*#?\d.*|#?\d+(#\d+)*|HEX|ROUND|SQUARE|SPECIAL|SPECIALS|TOOLING|FIXTURES?|"
    r"[A-Z0-9]{1,3}"
    r")$", re.I
)


def program_customer_from_path(fp: str) -> str:
    if not isinstance(fp, str) or not fp:
        return ""
    segs = [s.strip() for s in re.split(r"[\\/]+", fp) if s.strip() and not s.strip().endswith(":")]
    jm_i = next((i for i, s in enumerate(segs) if re.fullmatch(r"JM\s*DIE(\s*COMPANY)?", s, re.I)), None)
    if jm_i is not None:
        segs = segs[jm_i:]
    if len(segs) < 2:
        return ""
    body = segs[:-1]
    found = ""
    for i, s in enumerate(body):
        if _CUST_ANCHOR_RE.fullmatch(s) and i + 1 < len(body):
            nxt = body[i + 1]
            if nxt and not _NON_CUSTOMER_SEG_RE.fullmatch(nxt):
                found = nxt
    if found:
        return found
    for s in reversed(body):
        if s and not _NON_CUSTOMER_SEG_RE.fullmatch(s):
            return s
    return ""


# -- garbage classifier (verbatim from v5) ------------------------------------
GARBAGE_PATTERNS = [
    (re.compile(r"^0+$"), "all_zeros"),
    (re.compile(r"^(19|20)\d{2}$"), "year"),
    (re.compile(r"^\d{1,3}$"), "too_short_numeric"),
    (re.compile(r"^[A-Z]{2,}\d{3,5}$"), "standard_code"),
    (re.compile(r"^\d+-\d+$"), "range_like"),
    (re.compile(r"^\d{1,2}TH$", re.I), "ordinal"),
    (re.compile(r"^[A-Z]\d{0,2}$", re.I), "single_letter_code"),
    (re.compile(r"^-?\d{1,4}-\d{1,2}-\d{1,4}$"), "date_like"),
    (re.compile(r"^-?\d{3}-\d{3}-\d{4}$"), "phone_like"),
    (re.compile(r"^-\d"), "dash_fragment"),
]


def garbage_class(pn: str) -> str | None:
    p = (pn or "").strip()
    if not p:
        return "empty"
    if len(p) < 4:
        return "too_short"
    for pat, name in GARBAGE_PATTERNS:
        if pat.match(p):
            return name
    return None


# -- build program index (verbatim from v5) -----------------------------------
def build_program_index() -> tuple[dict, dict, dict, dict]:
    print(f"Loading {JM_FULL.name} ...", flush=True)
    full = json.loads(JM_FULL.read_text(encoding="utf-8"))
    labels = full.get("labels", []) if isinstance(full, dict) else full
    print(f"  {len(labels)} program/CAD files", flush=True)

    fname_idx: dict[str, set] = defaultdict(set)
    label_by_path: dict[str, dict] = {}
    prog_cust: dict[str, str] = {}
    for lab in labels:
        fp = lab.get("filePath")
        fn = lab.get("fileName")
        if not isinstance(fp, str) or not isinstance(fn, str):
            continue
        label_by_path[fp] = lab
        path_cust = program_customer_from_path(fp)
        if path_cust:
            lab["_cust_display"] = path_cust
        ck = cust_key(path_cust) or cust_key(lab.get("customer") or "") or cust_key(lab.get("topFolder") or "")
        if ck:
            prog_cust[fp] = ck
        for cand in filename_candidates(fn):
            key = normalize_pn(cand)
            if key:
                fname_idx[key].add(fp)

    internal_idx: dict[str, set] = defaultdict(set)
    pn_in_comment_re = re.compile(r"PROGRAM\s+NAME\s*[-:]\s*([A-Z0-9][A-Z0-9\-\._/ ]{2,30})", re.I)
    if INTERNAL.exists():
        print(f"Loading {INTERNAL.name} ...", flush=True)
        inames = json.loads(INTERNAL.read_text(encoding="utf-8"))
        n_int = 0
        for fp, rec in (inames.items() if isinstance(inames, dict) else []):
            if not isinstance(rec, dict):
                continue
            for cand in (rec.get("internal_stem"), rec.get("filename_stem")):
                if isinstance(cand, str) and cand.strip():
                    k = normalize_pn(cand)
                    if k:
                        internal_idx[k].add(fp); n_int += 1
                    do = digits_only(cand)
                    if do and do != k and len(do) >= 6:
                        internal_idx[do].add(fp)
            for c in rec.get("op_comments", []) or []:
                if not isinstance(c, str):
                    continue
                m = pn_in_comment_re.search(c)
                if m:
                    k = normalize_pn(m.group(1).strip())
                    if k:
                        internal_idx[k].add(fp); n_int += 1
        print(f"  {len(internal_idx)} internal-name keys ({n_int} insertions)", flush=True)
    print(f"  {len(prog_cust)} program files with a usable customer key", flush=True)
    return dict(fname_idx), dict(internal_idx), label_by_path, prog_cust


# -- collect blueprints from phase20 (v6: flat verified-prints format) --------
def collect_blueprints() -> dict:
    """normalized-PN -> {part_number, blueprints:[...], raw_pns:set, customers:set}.
    Reads phase20-verified-prints.jsonl: PNs are already strong-filtered, so we do
    NOT re-apply a garbage pre-filter here (garbage_class is still used downstream
    to LABEL zero-hit PNs)."""
    print(f"Scanning {PHASE20.name} ...", flush=True)
    if not PHASE20.exists():
        print(f"ERROR: {PHASE20} not found — run phase20-verified-prints-index.py first",
              file=sys.stderr)
        sys.exit(1)
    agg: dict[str, dict] = {}
    pages = 0
    seen_bp: set[tuple] = set()
    with PHASE20.open(encoding="utf-8") as f:
        for ln in f:
            try:
                r = json.loads(ln)
            except json.JSONDecodeError:
                continue
            pages += 1
            doc_id = r.get("doc_id")
            fn = r.get("filename")
            pi = r.get("page_index")
            # phase20 has no per-page drawing_score; derive from is_drawing_likely
            score = 0.75 if r.get("is_drawing_likely") else 0.55
            page_ck = cust_key(r.get("customer") or "")
            for pn in r.get("part_numbers") or []:
                if not isinstance(pn, str):
                    continue
                norm = normalize_pn(pn)
                if not norm:
                    continue
                e = agg.get(norm)
                if e is None:
                    e = {"part_number": pn, "blueprints": [], "raw_pns": set(), "customers": set()}
                    agg[norm] = e
                e["raw_pns"].add(pn)
                if page_ck:
                    e["customers"].add(page_ck)
                key = (norm, doc_id, pi)
                if key not in seen_bp:
                    seen_bp.add(key)
                    e["blueprints"].append(
                        {"doc_id": doc_id, "filename": fn, "page_index": pi,
                         "drawing_score": score}
                    )
    print(f"  {pages} verified-print pages -> {len(agg)} normalized PNs", flush=True)
    return agg


# -- main (join logic verbatim from v5) ---------------------------------------
def main():
    t0 = time.time()
    fname_idx, internal_idx, label_by_path, prog_cust = build_program_index()
    agg = collect_blueprints()

    counts = Counter()
    via_counts = Counter()
    miss_samples: list[str] = []
    match_samples: list[tuple] = []
    n_with_print_cust = 0
    n_corroborated = 0
    n_narrowed_by_cust = 0

    n_written = 0
    with OUT.open("w", encoding="utf-8") as out:
        for norm, e in agg.items():
            matched: dict[str, str] = {}
            for fp in fname_idx.get(norm, ()):
                matched[fp] = "exact"
            do = digits_only(norm)
            long_do = do if (do and do != norm and len(do) >= 6) else None
            if long_do:
                for fp in fname_idx.get(long_do, ()):
                    matched.setdefault(fp, "loose")
            for fp in internal_idx.get(norm, ()):
                matched.setdefault(fp, "internal")
            if long_do:
                for fp in internal_idx.get(long_do, ()):
                    matched.setdefault(fp, "internal")

            print_custs: set = e.get("customers") or set()
            cust_corrob = {
                fp for fp in matched
                if print_custs and any(cust_overlap(prog_cust.get(fp, ""), pc) for pc in print_custs)
            }
            if print_custs:
                n_with_print_cust += 1
            if cust_corrob:
                n_corroborated += 1

            n = len(matched)
            bare_short = bool(re.fullmatch(r"\d{1,4}", norm))
            would_be_ambig = (AMBIGUOUS_THRESHOLD and n > AMBIGUOUS_THRESHOLD) or (n > 8)
            narrowed_by_cust = False
            if would_be_ambig and cust_corrob and len(cust_corrob) <= 8:
                matched = {fp: v for fp, v in matched.items() if fp in cust_corrob}
                n = len(matched)
                narrowed_by_cust = True
            has_exact = ("exact" in matched.values()) and not bare_short
            if n == 0:
                gc = garbage_class(norm)
                conf = "garbage" if gc else "miss"
                if conf == "miss" and len(miss_samples) < 30:
                    miss_samples.append(norm)
            elif AMBIGUOUS_THRESHOLD and n > AMBIGUOUS_THRESHOLD:
                conf = "ambiguous"
            elif has_exact:
                conf = "exact"
            elif n > 8:
                conf = "ambiguous"
            else:
                conf = "loose"
            if narrowed_by_cust:
                n_narrowed_by_cust += 1
            counts[conf] += 1

            ext_pri = {".min": 0, ".mcx-8": 1, ".mcx": 1, ".mcx-6": 1, ".nc": 2, ".hnc": 2,
                       ".ipt": 3, ".iam": 3, ".sldprt": 3, ".f3d": 3}
            via_pri = {"exact": 0, "internal": 1, "loose": 2}
            items = sorted(
                matched.items(),
                key=lambda kv: (
                    0 if kv[0] in cust_corrob else 1,
                    via_pri.get(kv[1], 3),
                    ext_pri.get((label_by_path.get(kv[0], {}).get("ext") or "").lower(), 9),
                ),
            )
            programs = []
            rel_counts: Counter = Counter()
            corrob_in_list = 0
            for fp, via in items[:MAX_PROGRAMS_PER_RECORD]:
                lab = label_by_path.get(fp, {})
                k3 = lab.get("kind3")
                rel = lab.get("relation")
                cm = "yes" if fp in cust_corrob else ("unknown" if not print_custs else "no")
                if cm == "yes":
                    corrob_in_list += 1
                programs.append({
                    "source_path": fp,
                    "filename": lab.get("fileName"),
                    "customer": lab.get("_cust_display") or lab.get("customer") or lab.get("topFolder"),
                    "machineCategory": lab.get("machineCategory"),
                    "ext": lab.get("ext"),
                    "kind": lab.get("kind"),
                    "kind3": k3,
                    "relation": rel,
                    "via": via,
                    "customer_match": cm,
                })
                via_counts[via] += 1
                if rel:
                    rel_counts[rel] += 1
            if conf in ("exact", "loose") and len(match_samples) < 20:
                match_samples.append((norm, conf, programs[:3]))

            rec = {
                "part_number": e["part_number"],
                "part_number_normalized": norm,
                "blueprints": e["blueprints"],
                "programs": programs,
                "match_confidence": conf,
                "n_programs": n,
                "relations": dict(rel_counts),
                "print_customers": sorted(print_custs)[:5],
                "customer_corroborated_n": corrob_in_list,
                "narrowed_by_customer": narrowed_by_cust,
                "raw_pn_variants": sorted(e["raw_pns"])[:8],
            }
            out.write(json.dumps(rec, ensure_ascii=False) + "\n")
            n_written += 1

    elapsed = time.time() - t0
    total = sum(counts.values())
    matched_records = counts["exact"] + counts["loose"]
    print(f"\n=== Phase 16 v6 done ({elapsed:.0f}s) ===", flush=True)
    print(f"  normalized PNs: {total}", flush=True)
    print(f"  distribution: {dict(counts)}", flush=True)
    print(f"  matched (exact+loose): {matched_records} ({100*matched_records/max(1,total):.1f}%)", flush=True)
    print(f"  via: {dict(via_counts)}", flush=True)
    print(f"  customer cross-check: {n_with_print_cust} usable | {n_corroborated} corroborated | {n_narrowed_by_cust} narrowed", flush=True)

    lines = [
        "# Phase 16 — Blueprint↔Program/CAD join v6 (from cleaned phase20 verified-prints)\n",
        f"**Generated:** {time.strftime('%Y-%m-%dT%H:%M:%S%z')}",
        f"**Runtime:** {elapsed:.0f}s",
        f"**Source:** `{PHASE20.name}` (phase-15 complete: 21,545 docs; phase20 dedup+strict-PN-filter applied)",
        f"**Program corpus:** `{JM_FULL.name}` ({len(label_by_path)} files) + `program-internal-names.json` ({len(internal_idx)} internal keys)\n",
        "## Match distribution (per normalized part number)\n",
        "| confidence | count | % |",
        "|---|---:|---:|",
    ]
    for k in ["exact", "loose", "ambiguous", "garbage", "miss"]:
        c = counts.get(k, 0)
        lines.append(f"| {k} | {c} | {100*c/max(1,total):.1f}% |")
    lines += [
        f"| **total** | **{total}** | |\n",
        f"**Matched to ≥1 program/CAD file (exact+loose):** {matched_records} ({100*matched_records/max(1,total):.1f}%)",
        f"**Match channels:** exact-filename={via_counts.get('exact',0)}, internal-name(renamed)={via_counts.get('internal',0)}, loose-digits={via_counts.get('loose',0)}",
        f"**Customer cross-check:** {n_with_print_cust} of {total} records had a usable print-customer; {n_corroborated} corroborated; {n_narrowed_by_cust} ambiguous blobs narrowed.\n",
        "## v6 vs v5 — what changed\n",
        "- Input: cleaned `phase20-verified-prints.jsonl` (44k duplicate page records dropped, dates/phones/dimension-callouts rejected) instead of raw still-running phase-15.",
        "- phase-15 itself is now complete (was: 673 huge PDFs deferred).",
        "- Join logic, normalization, customer cross-check: unchanged from v5.\n",
        "## Sample matches (norm PN → confidence → up to 3 files)\n",
    ]
    for norm, conf, progs in match_samples:
        lines.append(f"- `{norm}` ({conf})")
        for p in progs:
            lines.append(f"  - `{p.get('filename')}` ({p.get('customer')}, {p.get('machineCategory')}, kind={p.get('kind')}, via={p.get('via')})")
    lines += ["", "## Sample misses (PN format-valid, absent from program corpus)\n",
              "  " + ", ".join(f"`{m}`" for m in miss_samples)]
    SUMMARY.write_text("\n".join(lines), encoding="utf-8")
    print(f"  wrote {OUT.name} ({n_written} records) + {SUMMARY.name}", flush=True)


if __name__ == "__main__":
    main()
