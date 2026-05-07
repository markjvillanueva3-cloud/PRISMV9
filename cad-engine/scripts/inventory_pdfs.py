"""Inventory CAM-relevant PDFs for U-CAM59-69 batch extraction."""
import os
import pypdf

ROOTS = [
    "H:/prism/resources/OPEN MIND/doc/33.0/PDF",
    "H:/prism/resources/RESOURCE PDFS",
    "H:/prism/resources/PDF/CAM-Training-Downloaded",
    "H:/prism/resources/OPEN MIND/Shared/33.0/python/docs",
]

# Files to skip
SKIP_PATHS = {
    # Already extracted this session
    "H:/prism/resources/RESOURCE PDFS/hyperMILL_Manual-en-3.pdf",
    "H:/prism/resources/OPEN MIND/doc/33.0/PDF/VIRTUAL Machining Center/VIRTUAL_Machining_Center_Manual-en-US.pdf",
    "H:/prism/resources/OPEN MIND/doc/33.0/PDF/SQL Tool Database/SQL_Tool_Database_Manual-en-US.pdf",
    # User runs CAM_Manual overnight separately
    "H:/prism/resources/OPEN MIND/doc/33.0/PDF/CAM/CAM_Manual-en-US.pdf",
    # Superseded
    "H:/prism/resources/PDF/hyperMILL/hyperMILL_Manual-en.pdf",
}

# Only include filenames matching one of these CAM-software keywords
KEYWORDS = (
    "hypermill", "invertorcam", "inventorcam", "fusion", "fusion360",
    "cam_manual", "cad_manual", "automation_center", "tool_builder",
    "synchronization_tool", "virtual_machining", "virtual_tool",
    "cadcam_api", "py_cadcam",
    "solidcam", "edgecam", "mastercam", "esprit", "powermill",
)

# Skip directory patterns (MIT OCW etc.)
SKIP_DIR_FRAGMENTS = (
    "/static_resources/",  # MIT OCW course pages
    "/3.012-fall-2005/",
    "/18.03-spring-2010/",
    "/2.830j-spring-2008/",
)


def is_cam_relevant(path: str) -> bool:
    p = path.lower()
    for skip in SKIP_DIR_FRAGMENTS:
        if skip in p:
            return False
    name = os.path.basename(p)
    return any(kw in name for kw in KEYWORDS)


results = []
for root in ROOTS:
    if not os.path.isdir(root):
        continue
    for dp, _, fn in os.walk(root):
        for f in fn:
            if not f.lower().endswith(".pdf"):
                continue
            full = os.path.join(dp, f).replace(os.sep, "/")
            if full in SKIP_PATHS:
                continue
            if not is_cam_relevant(full):
                continue
            try:
                pages = len(pypdf.PdfReader(full).pages)
            except Exception:
                continue
            sz_mb = os.path.getsize(full) / (1024 * 1024)
            results.append((pages, sz_mb, full))

# Dedupe by basename + size (catches "Software documentation - X.pdf" type dupes)
seen = set()
deduped = []
for p, mb, f in results:
    key = (os.path.basename(f).lower(), round(mb, 1))
    if key in seen:
        continue
    seen.add(key)
    deduped.append((p, mb, f))

deduped.sort()
total_p = sum(r[0] for r in deduped)
print(f"CAM-RELEVANT PDFs: {len(deduped)}  TOTAL PAGES: {total_p}")
print()
for p, mb, f in deduped:
    short = f.replace("H:/prism/resources/", "")
    print(f"  {p:5d}p  {mb:6.1f}MB  {short[:90]}")
