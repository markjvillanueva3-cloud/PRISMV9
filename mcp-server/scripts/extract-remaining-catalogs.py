#!/usr/bin/env python3
"""Universal ISO 13399 extractor for remaining solid carbide tool catalogs."""

import pymupdf, json, re, os, sys
from collections import Counter

catalog_path = "C:/PRISM/CATALOGS/"
output_path = "C:/PRISM/mcp-server/src/data/"


def extract_iso13399_catalog(filepath, manufacturer, units="inch"):
    doc = pymupdf.open(filepath)
    tools = []

    for p in range(doc.page_count):
        page = doc[p]
        tables = page.find_tables()
        if not tables.tables:
            continue

        text = page.get_text()[:600]

        # Detect flute count from page text
        flutes = None
        fm = re.search(r"(\d+)\s*[Ff]lute", text)
        if fm:
            flutes = int(fm.group(1))

        # Detect tool type
        ttype = "end_mill"
        tl = text.lower()
        if "drill" in tl and "end mill" not in tl:
            ttype = "drill"
        elif "ball" in tl and ("nose" in tl or "end" in tl):
            ttype = "ball_mill"
        elif "reamer" in tl:
            ttype = "reamer"

        for t in tables.tables:
            df = t.extract()
            if len(df) < 3:
                continue

            # Find header row with DC/DCONMS or Diameter/OAL
            header_row = None
            header_idx = -1
            for i, row in enumerate(df[:6]):
                cells = [str(c).strip() if c else "" for c in row]
                joined = " ".join(cells).upper()
                if ("DC" in joined and ("DCONMS" in joined or "OAL" in joined)) or \
                   ("DIAMETER" in joined and ("OAL" in joined or "LENGTH" in joined or "LOC" in joined)):
                    header_row = cells
                    header_idx = i
                    break

            if header_row is None:
                continue

            # Map columns
            col_map = {}
            for ci, cell in enumerate(header_row):
                cu = cell.upper().strip()
                if cu == "DC" or cu == "DIAMETER" or "CUTTING DIA" in cu:
                    col_map["dc"] = ci
                elif "DCONMS" in cu or cu == "SHANK" or "SHANK DIA" in cu:
                    col_map["dconms"] = ci
                elif cu == "OAL" or "OVERALL" in cu:
                    col_map["oal"] = ci
                elif cu in ("LU", "LOC") or "FLUTE LENGTH" in cu or "LENGTH OF CUT" in cu:
                    col_map["lu"] = ci
                elif cu == "APMX" or cu == "DOC":
                    col_map["apmx"] = ci
                elif cu == "RE" or ("CORNER" in cu and "RADIUS" in cu):
                    col_map["re"] = ci
                elif "NOF" in cu or ("FLUTE" in cu and "LENGTH" not in cu):
                    col_map["nof"] = ci
                elif "TOOL NO" in cu or "EDP" in cu or "DESIGNATION" in cu or "ORDER" in cu or "CATALOG" in cu:
                    col_map["desig"] = ci
                elif cu == "INCH" or cu == "DECIMAL":
                    if "dc" not in col_map:
                        col_map["dc"] = ci

            if "dc" not in col_map:
                continue

            conv = 25.4 if units == "inch" else 1.0

            for row in df[header_idx + 1:]:
                cells = [str(c).strip() if c else "" for c in row]

                # Parse cutting diameter
                try:
                    dc_str = cells[col_map["dc"]].replace(",", ".")
                    # Handle fractions like "1/4"
                    if "/" in dc_str and len(dc_str) < 10:
                        parts = dc_str.strip().split("/")
                        dc = float(parts[0]) / float(parts[1])
                    else:
                        dc = float(dc_str)
                    if dc <= 0:
                        continue
                    if units == "inch" and dc > 6:
                        continue
                    if units == "metric" and dc > 150:
                        continue
                except:
                    continue

                dconms = dc
                if "dconms" in col_map:
                    try:
                        ds = cells[col_map["dconms"]].replace(",", ".")
                        if "/" in ds and len(ds) < 10:
                            parts = ds.strip().split("/")
                            dconms = float(parts[0]) / float(parts[1])
                        else:
                            dconms = float(ds)
                    except:
                        pass

                oal = None
                if "oal" in col_map:
                    try:
                        oal = float(cells[col_map["oal"]].replace(",", "."))
                    except:
                        pass

                lu = None
                if "lu" in col_map:
                    try:
                        lu = float(cells[col_map["lu"]].replace(",", "."))
                    except:
                        pass
                elif "apmx" in col_map:
                    try:
                        lu = float(cells[col_map["apmx"]].replace(",", "."))
                    except:
                        pass

                re_val = None
                if "re" in col_map:
                    try:
                        re_val = float(cells[col_map["re"]].replace(",", "."))
                    except:
                        pass

                nof = flutes
                if "nof" in col_map:
                    try:
                        nof_str = re.sub(r"[^0-9]", "", cells[col_map["nof"]])
                        if nof_str:
                            nof = int(nof_str[0])
                    except:
                        pass

                desig = ""
                if "desig" in col_map:
                    desig = cells[col_map["desig"]].replace("\n", "").strip()

                tool = {
                    "designation": desig or f"{manufacturer[:3].upper()}-{dc:.4f}-{nof or 4}F",
                    "type": ttype,
                    "cutting_diameter_mm": round(dc * conv, 2),
                    "shank_diameter_mm": round(dconms * conv, 2),
                }
                if oal:
                    tool["overall_length_mm"] = round(oal * conv, 2)
                if lu:
                    tool["flute_length_mm"] = round(lu * conv, 2)
                if re_val and re_val > 0:
                    tool["corner_radius_mm"] = round(re_val * conv, 3)
                if nof:
                    tool["flute_count"] = nof

                tools.append(tool)

    doc.close()

    # Dedupe
    seen = set()
    unique = []
    for t in tools:
        key = f"{t['designation']}_{t['cutting_diameter_mm']}"
        if key not in seen:
            seen.add(key)
            unique.append(t)

    return unique


# Process catalogs
catalogs = [
    ("MA_Ford_US_Product_Catalog_vol105interactiveweb.pdf", "MA Ford", "inch"),
    ("Accupro 2013.pdf", "Accupro", "inch"),
    ("2018 Rapidkut Catalog.pdf", "Rapidkut", "inch"),
    ("Solid End Mills.pdf", "Unknown_Solid", "inch"),
    ("korloy solid.pdf", "Korloy", "metric"),
    ("YU25_America.pdf", "YG-1", "inch"),
]

all_results = {}
for filename, mfg, units in catalogs:
    fullpath = os.path.join(catalog_path, filename)
    if not os.path.exists(fullpath):
        print(f"NOT FOUND: {filename}")
        continue

    try:
        tools = extract_iso13399_catalog(fullpath, mfg, units)
        all_results[mfg] = tools

        types = Counter(t["type"] for t in tools)
        dias = [t["cutting_diameter_mm"] for t in tools] if tools else [0]
        print(f"{mfg:15s}: {len(tools):5d} tools | types={dict(types)} | dia={min(dias):.1f}-{max(dias):.1f}mm")

        # Save individual JSON
        safe_name = mfg.lower().replace(" ", "-").replace("/", "-")
        with open(f"{output_path}{safe_name}-tools-extracted.json", "w") as f:
            json.dump(tools, f)
    except Exception as e:
        print(f"ERROR {mfg}: {e}", file=sys.stderr)

print(f"\nTotal new tools: {sum(len(v) for v in all_results.values())}")
