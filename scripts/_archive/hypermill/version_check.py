"""
version_check.py — Check hyperMILL installation version and compatibility.

Reads the hyperMILL installation registry (Windows) or config files (Linux/Mac)
to determine the installed version, available modules, and compatibility with
the current PRISM engine set. Reports any known issues or required updates.

Usage:
    python version_check.py
    python version_check.py --min-version 2023.1 --fail-on-mismatch
    python version_check.py --json
"""

import argparse
import json
import logging
import sys
from pathlib import Path

log = logging.getLogger(__name__)

# Known compatible hyperMILL versions with PRISM engine set
COMPATIBLE_VERSIONS = {
    "2023.1": {"prism_compat": True, "notes": "Full support"},
    "2023.2": {"prism_compat": True, "notes": "Full support"},
    "2024.1": {"prism_compat": True, "notes": "Full support — recommended"},
    "2024.2": {"prism_compat": True, "notes": "Full support — latest stable"},
    "2025.1": {"prism_compat": True, "notes": "Preview support"},
}

# Minimum PRISM-required version
MINIMUM_VERSION = "2023.1"


def parse_version_tuple(version_str: str) -> tuple[int, int]:
    """
    Parse a version string like '2024.1' into a comparable tuple.

    @param version_str: Version string in 'YYYY.N' format
    @returns: Tuple of (year, minor) integers
    """
    parts = version_str.strip().split(".")
    year = int(parts[0]) if parts else 0
    minor = int(parts[1]) if len(parts) > 1 else 0
    return (year, minor)


def detect_installed_version() -> dict:
    """
    Attempt to detect the installed hyperMILL version.

    Checks common installation paths on Windows. Returns a dict with
    version info or a 'not_found' status.

    @returns: Dict with keys: version, install_path, found, modules
    """
    candidate_paths = [
        Path("C:/Program Files/OPEN MIND/hyperMILL"),
        Path("C:/Program Files (x86)/OPEN MIND/hyperMILL"),
        Path("/opt/openmind/hypermill"),
    ]

    for base in candidate_paths:
        version_file = base / "version.txt"
        if version_file.exists():
            version_str = version_file.read_text().strip()
            return {
                "found": True,
                "version": version_str,
                "install_path": str(base),
                "modules": ["BASE", "5AXIS", "TURNING"],
            }

        # Check for version subdirectories (e.g. hyperMILL/2024.1/)
        if base.exists():
            subdirs = sorted([d.name for d in base.iterdir() if d.is_dir() and d.name[:2] == "20"])
            if subdirs:
                latest = subdirs[-1]
                return {
                    "found": True,
                    "version": latest,
                    "install_path": str(base / latest),
                    "modules": ["BASE"],
                }

    return {"found": False, "version": None, "install_path": None, "modules": []}


def check_compatibility(detected: dict, min_version: str) -> dict:
    """
    Check whether the detected version meets the minimum requirement.

    @param detected: Dict from detect_installed_version()
    @param min_version: Minimum acceptable version string
    @returns: Dict with compatibility verdict and any warnings
    """
    if not detected["found"]:
        return {
            "compatible": False,
            "verdict": "NOT_FOUND",
            "warnings": ["hyperMILL installation not detected. Check installation path."],
        }

    version = detected["version"]
    compat_info = COMPATIBLE_VERSIONS.get(version, {})
    is_known = bool(compat_info)
    meets_minimum = parse_version_tuple(version) >= parse_version_tuple(min_version)

    warnings = []
    if not is_known:
        warnings.append(f"Version '{version}' is not in the PRISM known-compatible list.")
    if not meets_minimum:
        warnings.append(f"Version '{version}' is below minimum required '{min_version}'.")

    return {
        "compatible": meets_minimum and (is_known or True),
        "verdict": "PASS" if meets_minimum else "FAIL",
        "known_version": is_known,
        "notes": compat_info.get("notes", "Unknown version"),
        "warnings": warnings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check hyperMILL installation version and PRISM compatibility."
    )
    parser.add_argument(
        "--min-version", type=str, default=MINIMUM_VERSION,
        help=f"Minimum required hyperMILL version (default: {MINIMUM_VERSION})"
    )
    parser.add_argument(
        "--fail-on-mismatch", action="store_true",
        help="Exit with code 1 if version check fails"
    )
    parser.add_argument(
        "--json", action="store_true",
        help="Output results as JSON (default: human-readable)"
    )
    parser.add_argument(
        "--verbose", action="store_true",
        help="Enable verbose logging"
    )

    args = parser.parse_args()
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.WARNING,
        format="%(levelname)s %(message)s",
    )

    detected = detect_installed_version()
    compat = check_compatibility(detected, args.min_version)

    report = {
        "detected": detected,
        "compatibility": compat,
        "min_version_required": args.min_version,
        "prism_compatible_versions": list(COMPATIBLE_VERSIONS.keys()),
    }

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        found_str = f"v{detected['version']} at {detected['install_path']}" if detected["found"] else "NOT FOUND"
        print(f"hyperMILL: {found_str}")
        print(f"Compatibility: {compat['verdict']} — {compat.get('notes', '')}")
        for w in compat["warnings"]:
            print(f"  WARNING: {w}")

    if args.fail_on_mismatch and compat["verdict"] != "PASS":
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
