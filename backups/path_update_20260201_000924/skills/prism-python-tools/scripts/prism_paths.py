#!/usr/bin/env python3
"""PRISM Path Constants - Import these in all PRISM Python scripts."""

import os

# Primary working directory (LOCAL - fast operations)
LOCAL_ROOT = r"C:\\PRISM"

# Box reference directory (resources only)
BOX_ROOT = r"C:\Users\Mark Villanueva\Box\PRISM REBUILD"

# State and session management
STATE_FILE = os.path.join(LOCAL_ROOT, "CURRENT_STATE.json")
SESSION_LOGS = os.path.join(LOCAL_ROOT, "SESSION_LOGS")

# Build artifacts
BUILD_DIR = os.path.join(LOCAL_ROOT, "_BUILD")
MONOLITH = os.path.join(BUILD_DIR, "PRISM_v8_89_002_TRUE_100_PERCENT.html")

# Extracted modules
EXTRACTED = os.path.join(LOCAL_ROOT, "EXTRACTED")
EXTRACTED_DBS = os.path.join(EXTRACTED, "databases")
EXTRACTED_ENGINES = os.path.join(EXTRACTED, "engines")
EXTRACTED_KBS = os.path.join(EXTRACTED, "knowledge_bases")

# Machine database layers
MACHINES_CORE = os.path.join(EXTRACTED_DBS, "machines", "CORE")
MACHINES_ENHANCED = os.path.join(EXTRACTED_DBS, "machines", "ENHANCED")
MACHINES_USER = os.path.join(EXTRACTED_DBS, "machines", "USER")
MACHINES_LEARNED = os.path.join(EXTRACTED_DBS, "machines", "LEARNED")

# Resources (from Box)
RESOURCES = os.path.join(BOX_ROOT, "RESOURCES")
CATALOGS = os.path.join(RESOURCES, "MANUFACTURER CATALOGS")
CAD_FILES = os.path.join(RESOURCES, "CAD FILES")
GENERIC_MACHINES = os.path.join(RESOURCES, "GENERIC MACHINE MODELS")
TOOL_HOLDERS = os.path.join(RESOURCES, "TOOL HOLDER CAD FILES")
MIT_COURSES = os.path.join(BOX_ROOT, "MIT COURSES")

# Documentation
DOCS = os.path.join(LOCAL_ROOT, "_DOCS")
ARCHIVES = os.path.join(LOCAL_ROOT, "_SESSION_ARCHIVES")

def ensure_dirs():
    """Create all required directories if they don't exist."""
    dirs = [
        EXTRACTED, EXTRACTED_DBS, EXTRACTED_ENGINES, EXTRACTED_KBS,
        MACHINES_CORE, MACHINES_ENHANCED, MACHINES_USER, MACHINES_LEARNED,
        SESSION_LOGS, BUILD_DIR, DOCS, ARCHIVES
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)

def get_extraction_path(category, subcategory=None):
    """Get the appropriate extraction output path."""
    base = {
        'databases': EXTRACTED_DBS,
        'engines': EXTRACTED_ENGINES,
        'knowledge_bases': EXTRACTED_KBS,
        'machines': os.path.join(EXTRACTED_DBS, 'machines')
    }.get(category, EXTRACTED)
    
    if subcategory:
        return os.path.join(base, subcategory)
    return base

if __name__ == "__main__":
    print("PRISM Path Configuration")
    print("=" * 50)
    print(f"LOCAL_ROOT: {LOCAL_ROOT}")
    print(f"BOX_ROOT: {BOX_ROOT}")
    print(f"MONOLITH: {MONOLITH}")
    print(f"EXTRACTED: {EXTRACTED}")
    print(f"RESOURCES: {RESOURCES}")
    print("\nChecking path accessibility...")
    print(f"  LOCAL exists: {os.path.exists(LOCAL_ROOT)}")
    print(f"  BOX exists: {os.path.exists(BOX_ROOT)}")
    print(f"  Monolith exists: {os.path.exists(MONOLITH)}")
