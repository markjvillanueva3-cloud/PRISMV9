"""
PRISM PARALLEL EXTRACTION VERIFICATION v1.0
4-Agent parallel verification of all extracted engines
"""
import anthropic
import os
import json
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

# =============================================================================
# CONFIGURATION
# =============================================================================

API_KEY = "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"

EXTRACTED_BASE = Path(r"C:\\PRISM\EXTRACTED\engines")
OUTPUT_DIR = Path(r"C:\\PRISM\EXTRACTED\verification_reports")
OUTPUT_DIR.mkdir(exist_ok=True)

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def scan_directory(dir_path: Path) -> dict:
    """Scan a directory and return file inventory"""
    if not dir_path.exists():
        return {"exists": False, "files": [], "total_size": 0, "total_lines": 0}
    
    files = []
    total_size = 0
    total_lines = 0
    
    for f in dir_path.rglob("*.js"):
        size = f.stat().st_size
        try:
            with open(f, 'r', encoding='utf-8', errors='ignore') as file:
                lines = len(file.readlines())
        except:
            lines = 0
        
        files.append({
            "name": f.name,
            "path": str(f.relative_to(EXTRACTED_BASE)),
            "size_kb": round(size / 1024, 2),
            "lines": lines
        })
        total_size += size
        total_lines += lines
    
    return {
        "exists": True,
        "file_count": len(files),
        "total_size_kb": round(total_size / 1024, 2),
        "total_lines": total_lines,
        "files": files
    }

def read_file_sample(file_path: Path, max_chars: int = 3000) -> str:
    """Read a sample of a file"""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read(max_chars)
            if len(content) == max_chars:
                content += "\n... [TRUNCATED]"
            return content
    except:
        return "[ERROR READING FILE]"

# =============================================================================
# VERIFICATION AGENTS
# =============================================================================

def verify_cad_cam(client) -> dict:
    """Agent 1: Verify CAD/CAM extractions"""
    print("  [Agent 1] Verifying CAD/CAM engines...")
    
    # Scan directories
    cad_cam = scan_directory(EXTRACTED_BASE / "cad_cam")
    cad_complete = scan_directory(EXTRACTED_BASE / "cad_complete")
    
    # Get key file samples
    samples = {}
    key_files = [
        "cad_complete/PRISM_COMPLETE_CAD_GENERATION_ENGINE.js",
        "cad_cam/PRISM_CAM_KERNEL_COMPLETE.js",
        "cad_complete/PRISM_FEATURE_STRATEGY_COMPLETE.js"
    ]
    
    for kf in key_files:
        fp = EXTRACTED_BASE / kf
        if fp.exists():
            samples[kf] = read_file_sample(fp, 2000)
    
    # Use Claude to analyze completeness
    prompt = f"""Analyze these CAD/CAM engine extractions for completeness:

## Directory: cad_cam/
{json.dumps(cad_cam, indent=2)}

## Directory: cad_complete/
{json.dumps(cad_complete, indent=2)}

## Key File Samples:
{json.dumps(samples, indent=2)}

PROVIDE A JSON RESPONSE with this structure:
{{
  "status": "COMPLETE|PARTIAL|MISSING",
  "completeness_pct": 0-100,
  "components_found": ["list of major components found"],
  "components_missing": ["list of expected but missing components"],
  "key_capabilities": ["what this extraction enables"],
  "recommendations": ["any gaps to address"],
  "ready_for_integration": true/false
}}

ONLY output the JSON, no explanation."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        temperature=0.1,
        messages=[{"role": "user", "content": prompt}]
    )
    
    try:
        result = json.loads(response.content[0].text)
    except:
        result = {"raw_response": response.content[0].text, "parse_error": True}
    
    return {
        "agent": "CAD/CAM Verification",
        "directories_scanned": ["cad_cam", "cad_complete"],
        "inventory": {
            "cad_cam": cad_cam,
            "cad_complete": cad_complete
        },
        "analysis": result
    }

def verify_physics(client) -> dict:
    """Agent 2: Verify Physics engine extractions"""
    print("  [Agent 2] Verifying Physics engines...")
    
    # Scan directories
    physics = scan_directory(EXTRACTED_BASE / "physics")
    physics_core = scan_directory(EXTRACTED_BASE / "physics_core")
    dynamics = scan_directory(EXTRACTED_BASE / "dynamics")
    
    # Combine all physics-related
    all_physics = {"physics": physics, "physics_core": physics_core, "dynamics": dynamics}
    
    # Get samples from key files
    samples = {}
    for dir_name, inv in all_physics.items():
        if inv["exists"] and inv["files"]:
            for f in inv["files"][:2]:  # First 2 files per dir
                fp = EXTRACTED_BASE / f["path"]
                if fp.exists():
                    samples[f["path"]] = read_file_sample(fp, 1500)
    
    prompt = f"""Analyze these Physics engine extractions for completeness:

## Directories Found:
{json.dumps({k: {"file_count": v.get("file_count", 0), "total_kb": v.get("total_size_kb", 0)} for k, v in all_physics.items()}, indent=2)}

## File Samples:
{json.dumps(samples, indent=2)}

Expected Physics engines include:
- Kienzle cutting force model
- Johnson-Cook constitutive model
- Taylor tool life equation
- Chatter/vibration prediction
- Thermal modeling
- Surface finish calculations
- Chip formation models

PROVIDE A JSON RESPONSE:
{{
  "status": "COMPLETE|PARTIAL|MISSING",
  "completeness_pct": 0-100,
  "models_found": ["physics models identified"],
  "models_missing": ["expected but not found"],
  "formulas_verified": ["specific formulas found in code"],
  "recommendations": ["gaps to address"],
  "ready_for_integration": true/false
}}

ONLY output the JSON."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        temperature=0.1,
        messages=[{"role": "user", "content": prompt}]
    )
    
    try:
        result = json.loads(response.content[0].text)
    except:
        result = {"raw_response": response.content[0].text, "parse_error": True}
    
    return {
        "agent": "Physics Verification",
        "directories_scanned": list(all_physics.keys()),
        "inventory": all_physics,
        "analysis": result
    }

def verify_post_processors(client) -> dict:
    """Agent 3: Verify Post Processor extractions"""
    print("  [Agent 3] Verifying Post Processors...")
    
    # Scan post processor directories
    posts = scan_directory(EXTRACTED_BASE / "post_processors")
    controllers = scan_directory(EXTRACTED_BASE.parent / "controllers")
    
    # Get samples
    samples = {}
    if posts["exists"]:
        for f in posts["files"][:3]:
            fp = EXTRACTED_BASE / f["path"]
            if fp.exists():
                samples[f["path"]] = read_file_sample(fp, 1500)
    
    prompt = f"""Analyze Post Processor extractions for completeness:

## Post Processors Directory:
{json.dumps(posts, indent=2)}

## Controllers Directory:
{json.dumps(controllers, indent=2)}

## File Samples:
{json.dumps(samples, indent=2)}

Expected controllers include:
- FANUC (30i, 31i, 0i)
- Siemens (840D, 828D)
- HAAS
- Mazak (Mazatrol)
- Okuma (OSP)
- Heidenhain (TNC)
- Mitsubishi
- Brother

PROVIDE A JSON RESPONSE:
{{
  "status": "COMPLETE|PARTIAL|MISSING",
  "completeness_pct": 0-100,
  "controllers_found": ["controller families found"],
  "controllers_missing": ["expected but missing"],
  "features_verified": ["G-code output, M-codes, cycles, etc."],
  "recommendations": ["gaps to address"],
  "ready_for_integration": true/false
}}

ONLY output the JSON."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        temperature=0.1,
        messages=[{"role": "user", "content": prompt}]
    )
    
    try:
        result = json.loads(response.content[0].text)
    except:
        result = {"raw_response": response.content[0].text, "parse_error": True}
    
    return {
        "agent": "Post Processor Verification",
        "directories_scanned": ["post_processors", "controllers"],
        "inventory": {"posts": posts, "controllers": controllers},
        "analysis": result
    }

def create_master_index(client, other_results: list) -> dict:
    """Agent 4: Create master integration index"""
    print("  [Agent 4] Creating master integration index...")
    
    # Scan ALL engine directories
    all_dirs = {}
    for d in EXTRACTED_BASE.iterdir():
        if d.is_dir():
            all_dirs[d.name] = scan_directory(d)
    
    # Also check controllers
    controllers_dir = EXTRACTED_BASE.parent / "controllers"
    if controllers_dir.exists():
        all_dirs["../controllers"] = scan_directory(controllers_dir)
    
    # Compile summary
    summary = {
        "total_directories": len(all_dirs),
        "total_files": sum(d.get("file_count", 0) for d in all_dirs.values()),
        "total_size_kb": sum(d.get("total_size_kb", 0) for d in all_dirs.values()),
        "total_lines": sum(d.get("total_lines", 0) for d in all_dirs.values()),
        "directories": {k: {"files": v.get("file_count", 0), "kb": v.get("total_size_kb", 0)} for k, v in all_dirs.items()}
    }
    
    prompt = f"""Based on this extraction inventory, create a MASTER INTEGRATION INDEX:

## Overall Summary:
{json.dumps(summary, indent=2)}

## Other Agent Results:
{json.dumps([r.get("analysis", {}) for r in other_results], indent=2)}

Create a comprehensive integration index showing:
1. What's ready to use
2. What needs work
3. Priority order for integration
4. Dependencies between components

PROVIDE A JSON RESPONSE:
{{
  "extraction_status": "X% complete",
  "ready_components": [
    {{"name": "component", "path": "dir", "consumers": ["who uses it"]}}
  ],
  "needs_work": [
    {{"name": "component", "issue": "what's wrong", "priority": "HIGH|MED|LOW"}}
  ],
  "integration_order": ["ordered list of what to integrate first"],
  "dependencies_map": {{"component": ["depends on"]}},
  "next_actions": ["prioritized action items"]
}}

ONLY output the JSON."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=3000,
        temperature=0.1,
        messages=[{"role": "user", "content": prompt}]
    )
    
    try:
        result = json.loads(response.content[0].text)
    except:
        result = {"raw_response": response.content[0].text, "parse_error": True}
    
    return {
        "agent": "Master Index Creation",
        "directories_scanned": list(all_dirs.keys()),
        "summary": summary,
        "analysis": result
    }

# =============================================================================
# MAIN EXECUTION
# =============================================================================

def run_parallel_verification():
    """Run all 4 agents in parallel"""
    print("=" * 70)
    print("PRISM PARALLEL EXTRACTION VERIFICATION")
    print("=" * 70)
    print(f"Started: {datetime.now().isoformat()}")
    print(f"Base path: {EXTRACTED_BASE}")
    print()
    
    client = anthropic.Anthropic(api_key=API_KEY)
    
    # Phase 1: Run first 3 agents in parallel
    print("[Phase 1] Running verification agents in parallel...")
    results = {}
    
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(verify_cad_cam, client): "cad_cam",
            executor.submit(verify_physics, client): "physics",
            executor.submit(verify_post_processors, client): "post_processors"
        }
        
        for future in as_completed(futures):
            name = futures[future]
            try:
                results[name] = future.result()
                print(f"  [OK] {name} verification complete")
            except Exception as e:
                results[name] = {"error": str(e)}
                print(f"  [FAIL] {name} verification failed: {e}")
    
    # Phase 2: Run master index agent (needs other results)
    print("\n[Phase 2] Creating master integration index...")
    results["master_index"] = create_master_index(client, list(results.values()))
    print("  [OK] Master index complete")
    
    # Save results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = OUTPUT_DIR / f"verification_report_{timestamp}.json"
    
    report = {
        "generated": datetime.now().isoformat(),
        "agents_run": 4,
        "execution_mode": "parallel",
        "results": results
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n{'=' * 70}")
    print(f"VERIFICATION COMPLETE")
    print(f"Report saved: {output_file}")
    print(f"{'=' * 70}")
    
    # Print summary
    print("\n## QUICK SUMMARY ##\n")
    for name, result in results.items():
        analysis = result.get("analysis", {})
        status = analysis.get("status", "UNKNOWN")
        pct = analysis.get("completeness_pct", "?")
        ready = analysis.get("ready_for_integration", "?")
        print(f"  {name}: {status} ({pct}%) - Ready: {ready}")
    
    return report

if __name__ == "__main__":
    run_parallel_verification()
