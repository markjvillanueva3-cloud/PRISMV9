#!/usr/bin/env python
"""Decompile VBA macros from JM Die Automated Program xlsm."""
from oletools.olevba import VBA_Parser
import os
import re

XLSM_PATH = r"H:\PRISM\JM DIE\Automated Program_Corrected 5-25.xlsm"
OUT_DIR = r"H:\prism\state\shared\jm-electrode-extracted"

os.makedirs(OUT_DIR, exist_ok=True)
vp = VBA_Parser(XLSM_PATH)
print("Has macros:", vp.detect_vba_macros())
modules = []
total_lines = 0
for filename, stream_path, vba_filename, vba_code in vp.extract_macros():
    safe_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", vba_filename)
    out_path = os.path.join(OUT_DIR, safe_name + ".bas")
    with open(out_path, "w", encoding="utf-8", errors="ignore") as f:
        f.write(vba_code)
    line_count = vba_code.count("\n")
    total_lines += line_count
    modules.append((vba_filename, line_count, out_path))

print(f"Extracted {len(modules)} VBA modules, {total_lines} total lines")
for name, lc, path in modules:
    print(f"  {lc:5d} lines: {name}")
    print(f"        -> {path}")
