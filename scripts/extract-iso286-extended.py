#!/usr/bin/env python3
"""Extract ISO 286 extended data (500-3150mm) from hyperMILL SQLite into TypeScript."""
import sqlite3
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

DB_PATH = "C:/PRISM/HYPERMILL/hyperCAD-S/33.0/files/draftingsettings/isofittingtols.sqlite"
OUT_PATH = "C:/PRISM/mcp-server/src/data/iso286-extended-catalog.ts"

conn = sqlite3.connect(DB_PATH)

# QualityGrade
qg_cursor = conn.execute("SELECT * FROM QualityGrade")
qg_cols = [d[0] for d in qg_cursor.description]
qg_rows = qg_cursor.fetchall()

# ShaftDeviations
sd_cursor = conn.execute("SELECT * FROM ShaftDeviations")
sd_cols = [d[0] for d in sd_cursor.description]
sd_rows = sd_cursor.fetchall()

# HoleDeviations
hd_cursor = conn.execute("SELECT * FROM HoleDeviations")
hd_cols = [d[0] for d in hd_cursor.description]
hd_rows = hd_cursor.fetchall()

out = []
out.append("/**")
out.append(" * ISO 286-1:2010 Extended Tolerance Data - extracted from hyperMILL v33.0")
out.append(" * Source: hyperCAD-S/33.0/files/draftingsettings/isofittingtols.sqlite")
out.append(" *")
out.append(" * Extends the built-in ToleranceEngine data:")
out.append(" *   - Size range: 0-3150mm (vs 1-500mm)")
out.append(" *   - 42 size bands (vs 13)")
out.append(" *   - Additional shaft positions: cd, ef, fg, j5-j8, k3-k8, za, zb, zc")
out.append(" *   - Grade-specific hole deviations (K3-K9, M3-M9, N3-N9, etc.)")
out.append(" */")
out.append("")

# Quality grades - IT tolerance widths
out.append("/** ISO 286 IT grade tolerance widths (micrometers).")
out.append(" *  42 size bands x 19 IT grades (IT01 through IT17).")
out.append(" *  Key = upper bound of nominal size range in mm.")
out.append(" *  Values = [IT01, IT0, IT1, ..., IT17] */")
out.append("export const ISO286_QUALITY_GRADES: Record<number, number[]> = {")
for row in qg_rows:
    range_val = row[0]
    if range_val == 0.01:
        continue  # skip sentinel row
    grades = [v if v is not None else 0.0 for v in row[1:]]  # g_01 through g_17
    out.append(f"  {range_val}: [{', '.join(str(g) for g in grades)}],")
out.append("};")
out.append("")

# Size bands (derived from QualityGrade ranges)
out.append("/** ISO 286 size band boundaries [lower, upper] in mm */")
out.append("export const ISO286_SIZE_BANDS: Array<[number, number]> = [")
ranges = sorted([r[0] for r in qg_rows if r[0] > 0.01])
prev = 0
for r in ranges:
    out.append(f"  [{prev}, {r}],")
    prev = r
out.append("];")
out.append("")

# Deviation size bands (finer than IT grade bands)
dev_ranges = sorted([r[0] for r in sd_rows if r[0] > 0.01])
out.append("/** ISO 286 deviation size band boundaries [lower, upper] in mm.")
out.append(" *  41 bands (finer granularity than IT grade bands). */")
out.append("export const ISO286_DEVIATION_BANDS: Array<[number, number]> = [")
prev = 0
for r in dev_ranges:
    out.append(f"  [{prev}, {r}],")
    prev = r
out.append("];")
out.append("")

# Shaft deviations
out.append("/** ISO 286 shaft fundamental deviations (micrometers).")
out.append(" *  Key = position letter(s), possibly with grade suffix.")
out.append(" *  Value = array of 42 deviations, one per size band.")
out.append(f" *  Columns: {sd_cols[1:]} */")
out.append("export const ISO286_SHAFT_DEVIATIONS: Record<string, number[]> = {")
for col_idx in range(1, len(sd_cols)):
    col_name = sd_cols[col_idx]
    values = []
    for row in sd_rows:
        if row[0] <= 0.01:
            continue
        v = row[col_idx]
        if v is None or (isinstance(v, str) and not v.replace('.','',1).replace('-','',1).isdigit()):
            values.append(0.0)
        else:
            values.append(float(v))
    out.append(f"  '{col_name}': [{', '.join(str(v) for v in values)}],")
out.append("};")
out.append("")

# Hole deviations
out.append("/** ISO 286 hole fundamental deviations (micrometers).")
out.append(" *  Key = position letter(s) with grade suffix for K-ZC.")
out.append(f" *  {len(hd_cols) - 1} deviation columns across 42 size bands. */")
out.append("export const ISO286_HOLE_DEVIATIONS: Record<string, number[]> = {")
for col_idx in range(1, len(hd_cols)):
    col_name = hd_cols[col_idx]
    values = []
    for row in hd_rows:
        if row[0] <= 0.01:
            continue
        v = row[col_idx]
        if v is None or (isinstance(v, str) and not v.replace('.','',1).replace('-','',1).isdigit()):
            values.append(0.0)
        else:
            values.append(float(v))
    out.append(f"  '{col_name}': [{', '.join(str(v) for v in values)}],")
out.append("};")

with open(OUT_PATH, "w", encoding="utf-8") as f:
    f.write("\n".join(out))

print(f"Written ISO 286 extended data to {OUT_PATH}")
print(f"  Quality grades: {len(ranges)} size bands x {len(qg_cols)-1} IT grades")
print(f"  Shaft deviations: {len(sd_cols)-1} positions x {len(ranges)} bands")
print(f"  Hole deviations: {len(hd_cols)-1} positions x {len(ranges)} bands")

conn.close()
