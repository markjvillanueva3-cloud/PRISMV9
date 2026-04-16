#!/usr/bin/env python
"""Batch catalog extraction — pulls part numbers from every unextracted vendor
PDF in H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/ and appends them to
the corresponding src/data/*-extracted.json files.

No API calls. Pure regex extraction via VendorPartNumberExtractor.
"""

from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.extraction.vendor_part_extractor import extract_parts_from_pdf  # noqa: E402


ROOT = Path("H:/prism/resources/MANUFACTURER_CATALOGS/uploaded")
DATA_DIR = Path("H:/prism/mcp-server/src/data")
INDEX_PATH = Path("H:/prism/mcp-server/data/CATALOG_INDEX.json")


# Manifest — from VendorCatalogManifestEngine output. Maps filename → vendor.
# Correcting the Tungaloy-vs-Sandvik finding we made earlier.
VENDOR_MAP: dict[str, str] = {
    # Tungaloy 2023-2024 Grade Catalog (what we thought was Sandvik)
    "GC_2023-2024_G_Drilling.pdf": "Tungaloy",
    "GC_2023-2024_G_Milling.pdf": "Tungaloy",
    "GC_2023-2024_G_Tooling.pdf": "Tungaloy",
    "GC_2023-2024_G_Turning-Grooving.pdf": "Tungaloy",
    "GC_2023-2024_US_Drilling.pdf": "Tungaloy",
    "GC_2023-2024_US_Milling.pdf": "Tungaloy",
    "GC_2023-2024_US_Tooling.pdf": "Tungaloy",
    "GC_2023-2024_US_Turning-Grooving.pdf": "Tungaloy",
    # Iscar master catalog
    "Master Catalog 2018 Vol. 1 Turning Tools English Inch.pdf": "Iscar",
    "Master Catalog 2018 Vol. 2 Rotating Tools English Inch.pdf": "Iscar",
    "Milling 2018.1.pdf": "Iscar",
    "Threading 2018.1.pdf": "Iscar",
    "Turning 2018.1.pdf": "Iscar",
    "Tooling Systems News 2018 English MetricInch.pdf": "Iscar",
    "TURNING_CATALOG_PART 1.pdf": "Iscar",
    "Tooling Systems.pdf": "Iscar",
    # Seco
    "Solid End Mills.pdf": "Seco",
    "Metalmorphosis-2021-FINAL-reduced-for-Web.pdf": "Seco",
    # Other known vendors
    "zeni catalog.pdf": "Zenit",
    "ZK12023_DEGB RevA EMUGE Katalog 160.pdf": "Emuge",
    "AMPC_US-EN.pdf": "AMPC",
    "MA_Ford_US_Product_Catalog_vol105interactiveweb.pdf": "MA Ford",
    "REGO-FIX Catalogue 2026 ENGLISH.pdf": "Rego-Fix",
    "korloy solid.pdf": "Korloy",
    "korloy turning.pdf": "Korloy",
    "guhring full catalog.pdf": "Guhring",
    "guhring tool holders.pdf": "Guhring",
    "OSG.pdf": "OSG",
    "SGS_Global_Catalog_v26.1.pdf": "SGS",
    "YU25_America.pdf": "unknown",
    "catalog_c010b_full.pdf": "unknown",
    "01-Global-CNC-Full-Catalog-2023.pdf": "Global CNC",
    "2018 Rapidkut Catalog.pdf": "Rapidkut",
    "543f80b8_2016_orange_vise_catalog.pdf": "Orange Vise",
    "Accupro 2013.pdf": "Accupro",
    "BIG DAISHOWA High Performance Tooling Solutions Vol 5.pdf": "Big Daishowa",
    "CAMFIX_Catalog.pdf": "Camfix",
    "Flash_Solid_catalog_INCH.pdf": "Flash",
}

# Map (vendor, type) → target JSON filename. When type is "general",
# route to the vendor's base -tools-extracted.json.
def target_json_for(vendor: str, type_label: str) -> str:
    slug = vendor.lower().replace(" ", "-")
    if type_label in ("general", "indexable"):
        return f"{slug}-tools-extracted.json"
    return f"{slug}-{type_label}-extracted.json"


def load_existing(path: Path) -> list[dict]:
    if not path.exists():
        return []
    try:
        with path.open(encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def merge_records(existing: list[dict], new: list[dict]) -> list[dict]:
    """Merge by designation, preserving existing fields."""
    by_key: dict[str, dict] = {}
    for rec in existing:
        k = (rec.get("designation") or rec.get("part_number") or "").upper()
        if k:
            by_key[k] = rec
    added = 0
    for rec in new:
        k = (rec.get("designation") or "").upper()
        if not k:
            continue
        if k not in by_key:
            by_key[k] = rec
            added += 1
        else:
            # Preserve existing, fill missing fields only
            for field, val in rec.items():
                if field not in by_key[k] or by_key[k][field] in (None, "", 0):
                    by_key[k][field] = val
    return list(by_key.values()), added


def rebuild_index() -> None:
    """Regenerate CATALOG_INDEX.json from src/data/*-extracted.json files."""
    by_manufacturer: dict[str, dict] = {}
    catalogs_list: list[dict] = []
    total = 0
    files = list(DATA_DIR.glob("*-extracted.json"))
    for jf in sorted(files):
        try:
            with jf.open(encoding="utf-8") as f:
                data = json.load(f)
            if not isinstance(data, list):
                continue
            n = len(data)
            total += n
            # Parse manufacturer from filename: e.g. "sandvik-tools-extracted.json"
            stem = jf.stem  # "sandvik-tools-extracted"
            parts = stem.split("-")
            mfg = parts[0].capitalize() if parts else "Unknown"
            # Prefer the actual manufacturer field if present
            if data and isinstance(data[0], dict) and data[0].get("manufacturer"):
                mfg = data[0]["manufacturer"]
            by_manufacturer.setdefault(mfg, {"files": 0, "entries": 0})
            by_manufacturer[mfg]["files"] += 1
            by_manufacturer[mfg]["entries"] += n
            catalogs_list.append({
                "file": jf.name,
                "manufacturer": mfg,
                "type": parts[1] if len(parts) > 1 else "general",
                "entries": n,
            })
        except (json.JSONDecodeError, OSError):
            continue

    index = {
        "generated": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "totalFiles": len(catalogs_list),
        "totalEntries": total,
        "byManufacturer": {k: v for k, v in sorted(by_manufacturer.items())},
        "catalogs": sorted(catalogs_list, key=lambda c: (c["manufacturer"], c["file"])),
    }
    INDEX_PATH.write_text(json.dumps(index, indent=2), encoding="utf-8")
    print(f"\n[INDEX] Rebuilt {INDEX_PATH}")
    print(f"  Total files: {index['totalFiles']}")
    print(f"  Total entries: {index['totalEntries']}")


def main() -> None:
    pdfs = sorted(ROOT.glob("*.pdf"))
    print(f"Found {len(pdfs)} PDFs in {ROOT}")

    total_added = 0
    total_parts_extracted = 0
    failures: list[tuple[str, str]] = []

    for pdf in pdfs:
        filename = pdf.name
        vendor = VENDOR_MAP.get(filename, "unknown")
        print(f"\n[{filename}] vendor={vendor} size={pdf.stat().st_size // (1024*1024)}MB")
        try:
            t0 = time.time()
            result = extract_parts_from_pdf(
                pdf,
                primary_manufacturer=vendor if vendor != "unknown" else None,
            )
            elapsed = time.time() - t0
            total_parts_extracted += result.unique_count
            print(f"  extracted: {result.unique_count} parts in {elapsed:.1f}s "
                  f"({dict(list(result.by_type.items())[:5])})")

            if result.unique_count == 0:
                continue

            # Group by type, then merge into each target file
            by_type: dict[str, list[dict]] = {}
            for p in result.parts:
                by_type.setdefault(p.type, []).append(p.to_dict())

            for type_label, records in by_type.items():
                target = DATA_DIR / target_json_for(vendor or result.manufacturer, type_label)
                existing = load_existing(target)
                merged, added = merge_records(existing, records)
                target.write_text(
                    json.dumps(merged, indent=2), encoding="utf-8",
                )
                total_added += added
                if added > 0:
                    print(f"  + {added:>5} → {target.name} (total {len(merged)})")

        except Exception as e:
            print(f"  FAILED: {type(e).__name__}: {e}")
            failures.append((filename, str(e)))

    print("\n" + "=" * 70)
    print(f"SUMMARY")
    print(f"  PDFs processed:    {len(pdfs)}")
    print(f"  Parts extracted:   {total_parts_extracted}")
    print(f"  New records added: {total_added}")
    print(f"  Failures:          {len(failures)}")
    for f, err in failures[:10]:
        print(f"    - {f}: {err[:100]}")

    rebuild_index()


if __name__ == "__main__":
    main()
