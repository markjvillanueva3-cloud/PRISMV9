"""
PRISM Master Sync v1.0
======================
Orchestrates the complete data sync pipeline:
1. Excel → JSON conversion
2. JSON → DuckDB loading
3. Obsidian note generation
4. Google Drive backup

Usage:
    py -3 C:\PRISM\scripts\integration\master_sync.py
    py -3 C:\PRISM\scripts\integration\master_sync.py --skip-drive
    py -3 C:\PRISM\scripts\integration\master_sync.py --only excel,duckdb

Requirements:
    pip install pandas openpyxl duckdb
"""

import subprocess
import sys
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

# Paths
PRISM_ROOT = Path(r"C:\PRISM")
SCRIPTS_PATH = PRISM_ROOT / "scripts" / "integration"
STATE_PATH = PRISM_ROOT / "state"

# Pipeline steps
PIPELINE_STEPS = [
    {
        "id": "excel",
        "name": "Excel to JSON",
        "script": "excel_to_json.py",
        "description": "Convert Excel databases to JSON format"
    },
    {
        "id": "duckdb",
        "name": "JSON to DuckDB",
        "script": "json_to_duckdb.py",
        "description": "Load JSON into DuckDB for SQL queries"
    },
    {
        "id": "obsidian",
        "name": "Obsidian Notes",
        "script": "obsidian_generator.py",
        "description": "Generate linked knowledge notes"
    },
    {
        "id": "drive",
        "name": "Google Drive",
        "script": "sync_to_drive.py",
        "description": "Backup to Google Drive"
    }
]


def run_step(step: Dict[str, str], dry_run: bool = False) -> Dict[str, Any]:
    """Run a single pipeline step."""
    result = {
        "id": step["id"],
        "name": step["name"],
        "success": False,
        "output": "",
        "error": "",
        "duration": 0
    }
    
    script_path = SCRIPTS_PATH / step["script"]
    
    if not script_path.exists():
        result["error"] = f"Script not found: {script_path}"
        return result
    
    if dry_run:
        result["success"] = True
        result["output"] = "[DRY RUN] Would execute"
        return result
    
    start_time = datetime.now()
    
    try:
        process = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        result["output"] = process.stdout
        result["error"] = process.stderr
        result["success"] = process.returncode == 0
        
    except subprocess.TimeoutExpired:
        result["error"] = "Timeout after 5 minutes"
    except Exception as e:
        result["error"] = str(e)
    
    result["duration"] = (datetime.now() - start_time).total_seconds()
    
    return result


def run_pipeline(
    skip_steps: List[str] = None,
    only_steps: List[str] = None,
    dry_run: bool = False
) -> Dict[str, Any]:
    """Run the complete sync pipeline."""
    
    print("=" * 70)
    print("PRISM MASTER SYNC PIPELINE")
    print("=" * 70)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    if dry_run:
        print("[DRY RUN MODE]")
    
    skip_steps = skip_steps or []
    
    # Determine which steps to run
    steps_to_run = []
    for step in PIPELINE_STEPS:
        if only_steps and step["id"] not in only_steps:
            continue
        if step["id"] in skip_steps:
            continue
        steps_to_run.append(step)
    
    print(f"\nSteps to execute: {[s['id'] for s in steps_to_run]}")
    
    results = {
        "timestamp": datetime.now().isoformat(),
        "dry_run": dry_run,
        "steps": [],
        "summary": {
            "total": len(steps_to_run),
            "successful": 0,
            "failed": 0,
            "skipped": len(PIPELINE_STEPS) - len(steps_to_run),
            "total_duration": 0
        }
    }
    
    # Execute each step
    for i, step in enumerate(steps_to_run, 1):
        print(f"\n[{i}/{len(steps_to_run)}] {step['name']}")
        print(f"    {step['description']}")
        print("-" * 50)
        
        result = run_step(step, dry_run)
        results["steps"].append(result)
        results["summary"]["total_duration"] += result["duration"]
        
        if result["success"]:
            results["summary"]["successful"] += 1
            print(f"    [OK] Completed in {result['duration']:.1f}s")
            
            # Show abbreviated output
            if result["output"]:
                lines = result["output"].strip().split("\n")
                # Show last few lines (usually the summary)
                for line in lines[-5:]:
                    if line.strip():
                        print(f"    {line}")
        else:
            results["summary"]["failed"] += 1
            print(f"    [FAIL] FAILED")
            if result["error"]:
                print(f"    Error: {result['error'][:200]}")
    
    # Final summary
    print("\n" + "=" * 70)
    print("PIPELINE SUMMARY")
    print("=" * 70)
    print(f"Total steps: {results['summary']['total']}")
    print(f"Successful: {results['summary']['successful']}")
    print(f"Failed: {results['summary']['failed']}")
    print(f"Skipped: {results['summary']['skipped']}")
    print(f"Total duration: {results['summary']['total_duration']:.1f}s")
    
    # Overall status
    if results["summary"]["failed"] == 0:
        print("\n[OK] All steps completed successfully!")
    else:
        print(f"\n[WARN] {results['summary']['failed']} step(s) failed")
    
    # Save pipeline log
    if not dry_run:
        log_path = STATE_PATH / "logs" / "master_sync.json"
        log_path.parent.mkdir(parents=True, exist_ok=True)
        with open(log_path, "w") as f:
            json.dump(results, f, indent=2)
        print(f"\nPipeline log: {log_path}")
    
    print(f"\nFinished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    return results


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="PRISM Master Sync Pipeline")
    parser.add_argument("--skip-drive", action="store_true", help="Skip Google Drive sync")
    parser.add_argument("--skip-obsidian", action="store_true", help="Skip Obsidian generation")
    parser.add_argument("--only", help="Only run specific steps (comma-separated: excel,duckdb,obsidian,drive)")
    parser.add_argument("--dry-run", "-n", action="store_true", help="Show what would be executed")
    parser.add_argument("--list", "-l", action="store_true", help="List available steps")
    
    args = parser.parse_args()
    
    if args.list:
        print("Available pipeline steps:")
        for step in PIPELINE_STEPS:
            print(f"  {step['id']:12} - {step['description']}")
        return
    
    skip_steps = []
    if args.skip_drive:
        skip_steps.append("drive")
    if args.skip_obsidian:
        skip_steps.append("obsidian")
    
    only_steps = None
    if args.only:
        only_steps = [s.strip() for s in args.only.split(",")]
    
    results = run_pipeline(
        skip_steps=skip_steps,
        only_steps=only_steps,
        dry_run=args.dry_run
    )
    
    sys.exit(0 if results["summary"]["failed"] == 0 else 1)


if __name__ == "__main__":
    main()
