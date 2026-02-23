#!/usr/bin/env python3
"""
PRISM Extraction Summary - Session R2.0.2 Complete
"""

import os
import json
from pathlib import Path

OUTPUT_PATH = r"C:\\PRISM\EXTRACTED"
AUDIT_PATH = r"C:\PRISM\mcp-server\audits"

def count_extracted_files():
    """Count all extracted .js files and total lines"""
    stats = {
        "categories": {},
        "total_files": 0,
        "total_lines": 0,
        "total_size": 0
    }
    
    for root, dirs, files in os.walk(OUTPUT_PATH):
        # Skip backup directories
        if 'backup' in root.lower() or '_ARCHIVE' in root:
            continue
        
        for file in files:
            if file.endswith('.js'):
                filepath = os.path.join(root, file)
                rel_dir = os.path.relpath(root, OUTPUT_PATH)
                
                if rel_dir == '.':
                    category = 'root'
                else:
                    category = rel_dir.replace('\\', '/').split('/')[0]
                
                try:
                    size = os.path.getsize(filepath)
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = len(f.readlines())
                except:
                    size = 0
                    lines = 0
                
                if category not in stats["categories"]:
                    stats["categories"][category] = {"files": 0, "lines": 0, "size": 0}
                
                stats["categories"][category]["files"] += 1
                stats["categories"][category]["lines"] += lines
                stats["categories"][category]["size"] += size
                
                stats["total_files"] += 1
                stats["total_lines"] += lines
                stats["total_size"] += size
    
    return stats

def main():
    print("=" * 70)
    print("PRISM EXTRACTION SUMMARY - Session R2.0.2 Complete")
    print("=" * 70)
    
    stats = count_extracted_files()
    
    print(f"\n{'='*70}")
    print("EXTRACTION STATISTICS")
    print(f"{'='*70}")
    print(f"\nTotal Files:  {stats['total_files']}")
    print(f"Total Lines:  {stats['total_lines']:,}")
    print(f"Total Size:   {stats['total_size']/1024/1024:.2f} MB")
    
    print(f"\n{'-'*70}")
    print("BY CATEGORY:")
    print(f"{'-'*70}")
    print(f"{'Category':<25} {'Files':>8} {'Lines':>10} {'Size (KB)':>12}")
    print("-" * 55)
    
    for cat, data in sorted(stats["categories"].items()):
        print(f"{cat:<25} {data['files']:>8} {data['lines']:>10,} {data['size']/1024:>12.1f}")
    
    # Save report
    report = {
        "session": "R2.0.2",
        "status": "COMPLETE",
        "ralphIterations": 3,
        "statistics": stats,
        "timestamp": "2026-01-31T19:10:00Z"
    }
    
    report_path = os.path.join(AUDIT_PATH, "extraction_summary_r2_0_2.json")
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n\nReport saved to: {report_path}")
    
    return stats

if __name__ == "__main__":
    main()
