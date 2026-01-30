"""
PRISM JSON to DuckDB Loader v1.0
================================
Loads PRISM JSON databases into DuckDB for SQL queries.
Creates useful views for gap analysis and cross-referencing.

Usage:
    py -3 C:\PRISM\scripts\integration\json_to_duckdb.py
    py -3 C:\PRISM\scripts\integration\json_to_duckdb.py --query "SELECT * FROM materials LIMIT 10"
    py -3 C:\PRISM\scripts\integration\json_to_duckdb.py --interactive

Requirements:
    pip install duckdb
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

try:
    import duckdb
except ImportError:
    print("DuckDB not installed. Run: pip install duckdb")
    sys.exit(1)

# Paths
PRISM_ROOT = Path(r"C:\PRISM")
DB_PATH = PRISM_ROOT / "data" / "databases"
DUCKDB_PATH = DB_PATH / "PRISM.duckdb"

# JSON files to load
JSON_SOURCES = {
    "materials": [
        "PRISM_MATERIALS_EXPORT.json",
        "PRISM_MATERIALS_MASTER.json",
        "materials_master_complete.json"
    ],
    "machines": [
        "PRISM_MACHINES_EXPORT.json",
        "PRISM_MACHINES_DATABASE.json"
    ],
    "alarms": [
        "PRISM_ALARMS_EXPORT.json",
        "MASTER_ALARM_DATABASE.json"
    ],
    "tools": [
        "PRISM_TOOLS_EXPORT.json",
        "PRISM_TOOLS_DATABASE.json"
    ],
    "holders": [
        "PRISM_HOLDERS_EXPORT.json",
        "TOOL_HOLDERS_DATABASE.json"
    ],
    "skills": [
        "SKILL_TREE_REGISTRY.json"
    ],
    "agents": [
        "AGENT_REGISTRY.json"
    ],
    "formulas": [
        "FORMULA_REGISTRY.json"
    ]
}

# Views to create for analysis
ANALYSIS_VIEWS = {
    "materials_complete": """
        CREATE OR REPLACE VIEW materials_complete AS
        SELECT * FROM materials
        WHERE kc1_1 IS NOT NULL 
          AND mc IS NOT NULL
          AND density IS NOT NULL
    """,
    "materials_gaps": """
        CREATE OR REPLACE VIEW materials_gaps AS
        SELECT 
            material_id,
            name,
            CASE WHEN kc1_1 IS NULL THEN 'MISSING' ELSE 'OK' END as kienzle_status,
            CASE WHEN density IS NULL THEN 'MISSING' ELSE 'OK' END as density_status,
            CASE WHEN thermal_conductivity IS NULL THEN 'MISSING' ELSE 'OK' END as thermal_status
        FROM materials
        WHERE kc1_1 IS NULL 
           OR density IS NULL 
           OR thermal_conductivity IS NULL
    """,
    "materials_by_category": """
        CREATE OR REPLACE VIEW materials_by_category AS
        SELECT 
            COALESCE(iso_group, category, 'UNKNOWN') as group_name,
            COUNT(*) as count,
            ROUND(AVG(CASE WHEN kc1_1 IS NOT NULL THEN 1 ELSE 0 END) * 100, 1) as kienzle_pct
        FROM materials
        GROUP BY COALESCE(iso_group, category, 'UNKNOWN')
        ORDER BY count DESC
    """,
    "alarms_by_family": """
        CREATE OR REPLACE VIEW alarms_by_family AS
        SELECT 
            family,
            COUNT(*) as alarm_count,
            COUNT(DISTINCT category) as categories
        FROM alarms
        GROUP BY family
        ORDER BY alarm_count DESC
    """,
    "alarms_severity_summary": """
        CREATE OR REPLACE VIEW alarms_severity_summary AS
        SELECT 
            family,
            severity,
            COUNT(*) as count
        FROM alarms
        GROUP BY family, severity
        ORDER BY family, 
            CASE severity 
                WHEN 'CRITICAL' THEN 1 
                WHEN 'HIGH' THEN 2 
                WHEN 'MEDIUM' THEN 3 
                WHEN 'LOW' THEN 4 
                ELSE 5 
            END
    """
}


def find_json_file(table_name: str, candidates: List[str]) -> Optional[Path]:
    """Find first existing JSON file from candidates."""
    search_paths = [
        DB_PATH,
        PRISM_ROOT / "extracted",
        PRISM_ROOT / "data",
        PRISM_ROOT / "data" / "coordination"
    ]
    
    for candidate in candidates:
        for search_path in search_paths:
            full_path = search_path / candidate
            if full_path.exists():
                return full_path
    
    return None


def load_json_to_table(con: duckdb.DuckDBPyConnection, table_name: str, json_path: Path) -> Dict[str, Any]:
    """Load a JSON file into a DuckDB table."""
    result = {
        "table": table_name,
        "source": str(json_path),
        "success": False,
        "rows": 0,
        "columns": [],
        "error": None
    }
    
    try:
        # Read JSON
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        # Handle different JSON structures
        if isinstance(data, list):
            records = data
        elif isinstance(data, dict):
            # Could be {key: [...]} or {key: {nested}}
            if any(isinstance(v, list) for v in data.values()):
                # Find the list
                for key, value in data.items():
                    if isinstance(value, list) and len(value) > 0:
                        records = value
                        break
                else:
                    records = [data]
            else:
                records = [data]
        else:
            result["error"] = "Unknown JSON structure"
            return result
        
        if not records:
            result["error"] = "No records found in JSON"
            return result
        
        # Drop existing table
        con.execute(f"DROP TABLE IF EXISTS {table_name}")
        
        # Create table from JSON
        # Write to temp file for DuckDB to read (handles complex structures better)
        temp_path = DB_PATH / f"_temp_{table_name}.json"
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(records, f)
        
        con.execute(f"""
            CREATE TABLE {table_name} AS 
            SELECT * FROM read_json_auto('{str(temp_path).replace(chr(92), '/')}')
        """)
        
        # Clean up temp file
        temp_path.unlink()
        
        # Get row count and columns
        row_count = con.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]
        columns = [col[0] for col in con.execute(f"DESCRIBE {table_name}").fetchall()]
        
        result["success"] = True
        result["rows"] = row_count
        result["columns"] = columns
        
    except Exception as e:
        result["error"] = str(e)
    
    return result


def create_views(con: duckdb.DuckDBPyConnection) -> List[str]:
    """Create analysis views."""
    created = []
    
    for view_name, view_sql in ANALYSIS_VIEWS.items():
        try:
            # Check if required tables exist
            con.execute(view_sql)
            created.append(view_name)
        except Exception as e:
            # Silently skip if required tables don't exist
            pass
    
    return created


def load_all_databases() -> Dict[str, Any]:
    """Load all JSON databases into DuckDB."""
    
    print("=" * 60)
    print("PRISM JSON â†’ DuckDB Loader")
    print("=" * 60)
    
    # Ensure database directory exists
    DB_PATH.mkdir(parents=True, exist_ok=True)
    
    # Connect to DuckDB (creates file if doesn't exist)
    con = duckdb.connect(str(DUCKDB_PATH))
    
    results = {
        "timestamp": datetime.now().isoformat(),
        "database": str(DUCKDB_PATH),
        "tables": {},
        "views": [],
        "summary": {
            "tables_loaded": 0,
            "tables_failed": 0,
            "total_rows": 0
        }
    }
    
    # Load each JSON source
    for table_name, candidates in JSON_SOURCES.items():
        json_path = find_json_file(table_name, candidates)
        
        if json_path is None:
            print(f"\n[{table_name.upper()}] No JSON file found")
            continue
        
        print(f"\n[{table_name.upper()}] Loading from {json_path.name}")
        
        result = load_json_to_table(con, table_name, json_path)
        results["tables"][table_name] = result
        
        if result["success"]:
            results["summary"]["tables_loaded"] += 1
            results["summary"]["total_rows"] += result["rows"]
            print(f"  âœ“ {result['rows']} rows, {len(result['columns'])} columns")
        else:
            results["summary"]["tables_failed"] += 1
            print(f"  âœ— FAILED: {result['error']}")
    
    # Create views
    print("\n[VIEWS] Creating analysis views...")
    views = create_views(con)
    results["views"] = views
    print(f"  âœ“ Created {len(views)} views: {', '.join(views)}")
    
    # Close connection
    con.close()
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Database: {DUCKDB_PATH}")
    print(f"Tables loaded: {results['summary']['tables_loaded']}")
    print(f"Tables failed: {results['summary']['tables_failed']}")
    print(f"Total rows: {results['summary']['total_rows']}")
    print(f"Views created: {len(views)}")
    
    print("\nExample queries:")
    print("  duckdb C:\\PRISM\\data\\databases\\PRISM.duckdb")
    print("  SELECT * FROM materials LIMIT 10;")
    print("  SELECT * FROM materials_gaps;")
    print("  SELECT * FROM alarms_by_family;")
    
    return results


def run_query(query: str) -> None:
    """Run a single query against the database."""
    if not DUCKDB_PATH.exists():
        print(f"Database not found: {DUCKDB_PATH}")
        print("Run without arguments first to create database.")
        sys.exit(1)
    
    con = duckdb.connect(str(DUCKDB_PATH))
    try:
        result = con.execute(query).fetchdf()
        print(result.to_string())
    except Exception as e:
        print(f"Query error: {e}")
    finally:
        con.close()


def interactive_mode() -> None:
    """Interactive SQL shell."""
    if not DUCKDB_PATH.exists():
        print(f"Database not found: {DUCKDB_PATH}")
        sys.exit(1)
    
    print("PRISM DuckDB Interactive Shell")
    print("Type 'exit' or 'quit' to exit, 'tables' to list tables")
    print("-" * 40)
    
    con = duckdb.connect(str(DUCKDB_PATH))
    
    while True:
        try:
            query = input("prism> ").strip()
            
            if not query:
                continue
            
            if query.lower() in ("exit", "quit", "q"):
                break
            
            if query.lower() == "tables":
                query = "SHOW TABLES"
            
            result = con.execute(query).fetchdf()
            print(result.to_string())
            print()
            
        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            print(f"Error: {e}")
    
    con.close()


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Load PRISM JSON databases into DuckDB")
    parser.add_argument("--query", "-q", help="Run a single SQL query")
    parser.add_argument("--interactive", "-i", action="store_true", help="Interactive SQL shell")
    parser.add_argument("--refresh", "-r", action="store_true", help="Force reload all tables")
    
    args = parser.parse_args()
    
    if args.query:
        run_query(args.query)
    elif args.interactive:
        interactive_mode()
    else:
        load_all_databases()


if __name__ == "__main__":
    main()


