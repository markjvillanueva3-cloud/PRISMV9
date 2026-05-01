"""
PRISM Excel to JSON Converter v1.0
==================================
Converts PRISM Excel databases to JSON format.
Validates against schema, reports gaps, handles all database types.

Usage:
    py -3 C:\PRISM\scripts\integration\excel_to_json.py
    py -3 C:\PRISM\scripts\integration\excel_to_json.py --file MATERIALS.xlsx
    py -3 C:\PRISM\scripts\integration\excel_to_json.py --validate-only

Requirements:
    pip install pandas openpyxl
"""

import pandas as pd
import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

# Paths
PRISM_ROOT = Path(r"C:\PRISM")
DB_PATH = PRISM_ROOT / "data" / "databases"
EXTRACTED_PATH = PRISM_ROOT / "extracted"

# Database configurations
DATABASE_CONFIGS = {
    "materials": {
        "excel_patterns": ["*MATERIAL*.xlsx", "*material*.xlsx"],
        "json_output": "PRISM_MATERIALS_EXPORT.json",
        "required_fields": ["material_id", "name"],
        "recommended_fields": ["iso_group", "category", "kc1_1", "mc", "density"],
        "id_field": "material_id"
    },
    "machines": {
        "excel_patterns": ["*MACHINE*.xlsx", "*machine*.xlsx"],
        "json_output": "PRISM_MACHINES_EXPORT.json",
        "required_fields": ["machine_id", "manufacturer", "model"],
        "recommended_fields": ["controller", "spindle_max_rpm", "x_travel", "y_travel", "z_travel"],
        "id_field": "machine_id"
    },
    "alarms": {
        "excel_patterns": ["*ALARM*.xlsx", "*alarm*.xlsx"],
        "json_output": "PRISM_ALARMS_EXPORT.json",
        "required_fields": ["alarm_id", "code", "family"],
        "recommended_fields": ["category", "severity", "description", "causes"],
        "id_field": "alarm_id"
    },
    "tools": {
        "excel_patterns": ["*TOOL*.xlsx", "*tool*.xlsx"],
        "json_output": "PRISM_TOOLS_EXPORT.json",
        "required_fields": ["tool_id", "type"],
        "recommended_fields": ["diameter", "flutes", "material", "coating"],
        "id_field": "tool_id"
    },
    "holders": {
        "excel_patterns": ["*HOLDER*.xlsx", "*holder*.xlsx"],
        "json_output": "PRISM_HOLDERS_EXPORT.json",
        "required_fields": ["holder_id", "type"],
        "recommended_fields": ["taper", "gauge_length", "max_rpm"],
        "id_field": "holder_id"
    }
}


def find_excel_files(search_paths: List[Path] = None) -> Dict[str, List[Path]]:
    """Find Excel files matching database patterns."""
    if search_paths is None:
        search_paths = [DB_PATH, EXTRACTED_PATH, PRISM_ROOT / "data"]
    
    found = {db_type: [] for db_type in DATABASE_CONFIGS}
    
    for search_path in search_paths:
        if not search_path.exists():
            continue
        
        for db_type, config in DATABASE_CONFIGS.items():
            for pattern in config["excel_patterns"]:
                found[db_type].extend(search_path.glob(pattern))
    
    return found


def clean_value(value: Any) -> Any:
    """Clean a single value for JSON serialization."""
    if pd.isna(value):
        return None
    if isinstance(value, (pd.Timestamp, datetime)):
        return value.isoformat()
    if isinstance(value, (int, float)):
        if pd.isna(value):
            return None
        return value
    return str(value) if value is not None else None


def validate_dataframe(df: pd.DataFrame, config: Dict) -> Dict[str, Any]:
    """Validate DataFrame against configuration."""
    report = {
        "total_rows": len(df),
        "columns_found": list(df.columns),
        "required_missing": [],
        "recommended_missing": [],
        "completeness": {},
        "issues": []
    }
    
    # Check required fields
    for field in config["required_fields"]:
        if field not in df.columns:
            report["required_missing"].append(field)
            report["issues"].append(f"CRITICAL: Required field '{field}' not found")
    
    # Check recommended fields
    for field in config["recommended_fields"]:
        if field not in df.columns:
            report["recommended_missing"].append(field)
    
    # Calculate completeness per column
    for col in df.columns:
        non_null = df[col].notna().sum()
        report["completeness"][col] = {
            "filled": int(non_null),
            "total": len(df),
            "percent": round(non_null / len(df) * 100, 1) if len(df) > 0 else 0
        }
    
    # Check for duplicates in ID field
    id_field = config.get("id_field")
    if id_field and id_field in df.columns:
        duplicates = df[df.duplicated(subset=[id_field], keep=False)]
        if len(duplicates) > 0:
            report["issues"].append(f"WARNING: {len(duplicates)} duplicate IDs found")
    
    return report


def convert_excel_to_json(
    excel_path: Path,
    config: Dict,
    output_path: Optional[Path] = None,
    validate_only: bool = False
) -> Dict[str, Any]:
    """Convert a single Excel file to JSON."""
    
    result = {
        "source": str(excel_path),
        "success": False,
        "records": 0,
        "output": None,
        "validation": None,
        "errors": []
    }
    
    try:
        # Read Excel - try different sheet strategies
        try:
            # First try to read all sheets
            excel_file = pd.ExcelFile(excel_path)
            sheets = excel_file.sheet_names
            
            if len(sheets) == 1:
                df = pd.read_excel(excel_path, sheet_name=0)
            else:
                # Look for a sheet with data matching our schema
                df = None
                for sheet in sheets:
                    temp_df = pd.read_excel(excel_path, sheet_name=sheet)
                    if any(field in temp_df.columns for field in config["required_fields"]):
                        df = temp_df
                        break
                
                if df is None:
                    # Just use first sheet
                    df = pd.read_excel(excel_path, sheet_name=0)
        except Exception as e:
            result["errors"].append(f"Failed to read Excel: {e}")
            return result
        
        # Validate
        validation = validate_dataframe(df, config)
        result["validation"] = validation
        
        if validation["required_missing"]:
            result["errors"].append(f"Missing required fields: {validation['required_missing']}")
            if not validate_only:
                return result
        
        if validate_only:
            result["success"] = True
            result["records"] = len(df)
            return result
        
        # Convert to records
        records = []
        for _, row in df.iterrows():
            record = {}
            for col in df.columns:
                record[col] = clean_value(row[col])
            records.append(record)
        
        # Determine output path
        if output_path is None:
            output_path = DB_PATH / config["json_output"]
        
        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write JSON
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2, ensure_ascii=False)
        
        result["success"] = True
        result["records"] = len(records)
        result["output"] = str(output_path)
        
    except Exception as e:
        result["errors"].append(f"Conversion failed: {e}")
    
    return result


def convert_all(validate_only: bool = False) -> Dict[str, Any]:
    """Convert all found Excel databases to JSON."""
    
    print("=" * 60)
    print("PRISM Excel â†’ JSON Converter")
    print("=" * 60)
    
    # Find Excel files
    found = find_excel_files()
    
    results = {
        "timestamp": datetime.now().isoformat(),
        "databases": {},
        "summary": {
            "total_files": 0,
            "successful": 0,
            "failed": 0,
            "total_records": 0
        }
    }
    
    for db_type, files in found.items():
        if not files:
            print(f"\n[{db_type.upper()}] No Excel files found")
            continue
        
        print(f"\n[{db_type.upper()}] Found {len(files)} file(s)")
        results["databases"][db_type] = []
        
        for excel_file in files:
            print(f"  Processing: {excel_file.name}")
            
            result = convert_excel_to_json(
                excel_file,
                DATABASE_CONFIGS[db_type],
                validate_only=validate_only
            )
            
            results["databases"][db_type].append(result)
            results["summary"]["total_files"] += 1
            
            if result["success"]:
                results["summary"]["successful"] += 1
                results["summary"]["total_records"] += result["records"]
                status = "âœ“" if not validate_only else "âœ“ VALID"
                print(f"    {status} {result['records']} records")
                if result["output"]:
                    print(f"    â†’ {result['output']}")
            else:
                results["summary"]["failed"] += 1
                print(f"    âœ— FAILED: {result['errors']}")
            
            # Show validation warnings
            if result["validation"]:
                v = result["validation"]
                if v["recommended_missing"]:
                    print(f"    âš  Missing recommended: {', '.join(v['recommended_missing'][:3])}...")
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Files processed: {results['summary']['total_files']}")
    print(f"Successful: {results['summary']['successful']}")
    print(f"Failed: {results['summary']['failed']}")
    print(f"Total records: {results['summary']['total_records']}")
    
    return results


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Convert PRISM Excel databases to JSON")
    parser.add_argument("--file", "-f", help="Convert specific Excel file")
    parser.add_argument("--validate-only", "-v", action="store_true", help="Only validate, don't convert")
    parser.add_argument("--output", "-o", help="Output JSON path (for single file)")
    parser.add_argument("--type", "-t", choices=DATABASE_CONFIGS.keys(), help="Database type (for single file)")
    
    args = parser.parse_args()
    
    if args.file:
        # Single file mode
        excel_path = Path(args.file)
        if not excel_path.exists():
            print(f"Error: File not found: {excel_path}")
            sys.exit(1)
        
        db_type = args.type or "materials"  # Default to materials
        config = DATABASE_CONFIGS[db_type]
        
        output_path = Path(args.output) if args.output else None
        
        result = convert_excel_to_json(
            excel_path,
            config,
            output_path,
            validate_only=args.validate_only
        )
        
        print(json.dumps(result, indent=2))
        sys.exit(0 if result["success"] else 1)
    else:
        # Batch mode
        results = convert_all(validate_only=args.validate_only)
        sys.exit(0 if results["summary"]["failed"] == 0 else 1)


if __name__ == "__main__":
    main()


