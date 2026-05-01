"""
setup_job.py — Create or update a hyperMILL job from PRISM parameters.

Reads a PRISM job specification JSON (material, tool list, cycle type,
controller, output path) and generates a hyperMILL-compatible job
configuration file ready for AC-Script import.

Usage:
    python setup_job.py --spec job_spec.json --output ./output/job.hmp
    python setup_job.py --spec job_spec.json --controller FANUC --dry-run
"""

import argparse
import json
import logging
import sys
from pathlib import Path

log = logging.getLogger(__name__)


def validate_spec(spec: dict) -> list[str]:
    """
    Validate required fields in the job specification.

    @param spec: Dictionary parsed from the PRISM job JSON spec
    @returns: List of validation error strings (empty = valid)
    """
    errors = []
    required_fields = ["material", "controller", "cycles"]
    for field in required_fields:
        if field not in spec:
            errors.append(f"Missing required field: '{field}'")
    if "cycles" in spec and not isinstance(spec["cycles"], list):
        errors.append("'cycles' must be a list of cycle objects")
    return errors


def build_job_config(spec: dict, controller: str | None = None) -> dict:
    """
    Build the hyperMILL job config dict from a PRISM spec.

    @param spec: Validated PRISM job specification
    @param controller: Override controller family (e.g. 'FANUC', 'SIEMENS')
    @returns: hyperMILL-compatible job configuration dictionary
    """
    ctrl = controller or spec.get("controller", "FANUC")
    return {
        "job_type": "hypermill",
        "material": spec.get("material", "P-ISO"),
        "controller": ctrl,
        "cycles": spec.get("cycles", []),
        "tools": spec.get("tools", []),
        "output_nc": spec.get("output_nc", "output.nc"),
        "prism_generated": True,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create a hyperMILL job configuration from a PRISM job spec JSON."
    )
    parser.add_argument(
        "--spec", required=True, type=Path,
        help="Path to PRISM job specification JSON file"
    )
    parser.add_argument(
        "--output", required=True, type=Path,
        help="Output path for the generated job configuration file"
    )
    parser.add_argument(
        "--controller", type=str, default=None,
        help="Override controller family (e.g. FANUC, SIEMENS, HEIDENHAIN)"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Validate and print config without writing file"
    )
    parser.add_argument(
        "--verbose", action="store_true",
        help="Enable verbose logging"
    )

    args = parser.parse_args()
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s %(message)s",
    )

    if not args.spec.exists():
        log.error(f"Spec file not found: {args.spec}")
        return 1

    spec = json.loads(args.spec.read_text())
    errors = validate_spec(spec)
    if errors:
        for e in errors:
            log.error(f"Validation error: {e}")
        return 1

    config = build_job_config(spec, args.controller)
    log.info(f"Job config built: material={config['material']}, controller={config['controller']}, cycles={len(config['cycles'])}")

    if args.dry_run:
        print(json.dumps(config, indent=2))
        log.info("Dry-run: file not written")
        return 0

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(config, indent=2))
    log.info(f"Written: {args.output}")
    print(json.dumps({"status": "ok", "output": str(args.output)}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
