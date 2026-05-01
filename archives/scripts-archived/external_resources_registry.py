#!/usr/bin/env python3
"""
PRISM External Resources Registry Builder
Catalogs all PDFs, MIT courses, and vendor data for MCP integration
"""

import os
import json
from pathlib import Path
from collections import defaultdict

RESOURCES_PATH = r"C:\\PRISM\RESOURCES"
OUTPUT_PATH = r"C:\PRISM\registries"

def scan_pdfs():
    """Scan and categorize all PDF files"""
    print("Scanning PDFs...")
    pdfs = []
    
    base_paths = [
        r"C:\\PRISM",
        r"C:\PRISM",
    ]
    
    categories = {
        "TOOLING": ["sandvik", "kennametal", "iscar", "seco", "walter", "mitsubishi", "kyocera", "sumitomo", 
                   "tungaloy", "korloy", "taegutec", "ceratizit", "dormer", "guhring", "emo", "indexable",
                   "cutting", "insert", "mill", "drill", "tap", "ream", "endmill", "carbide"],
        "TOOLHOLDING": ["big daishowa", "nte", "schunk", "haimer", "parlec", "techniks", "lyndex",
                       "holder", "collet", "chuck", "arbor", "sleeve", "adapter", "toolhold"],
        "WORKHOLDING": ["kurt", "chick", "orange", "5th axis", "jergens", "carr lane", "fixture",
                       "vise", "clamp", "workhold", "jig"],
        "MACHINES": ["mazak", "haas", "dmg", "okuma", "fanuc", "makino", "hurco", "doosan", "brother",
                    "hermle", "matsuura", "kitamura", "spinner", "robodrill", "lathe", "mill", "cnc"],
        "CONTROLLERS": ["fanuc", "siemens", "heidenhain", "mitsubishi", "okuma osp", "mazatrol",
                       "sinumerik", "tnc", "g-code", "m-code", "alarm", "parameter"],
        "MIT_COURSE": ["mit", "stanford", "lecture", "course", "homework", "quiz", "exam"],
        "MANUFACTURING": ["machining", "grinding", "forming", "casting", "heat treat", "metrology",
                         "gd&t", "tolerance", "surface", "finish"],
    }
    
    for base in base_paths:
        if not os.path.exists(base):
            continue
            
        for root, dirs, files in os.walk(base):
            for f in files:
                if f.lower().endswith('.pdf'):
                    filepath = os.path.join(root, f)
                    size = os.path.getsize(filepath)
                    
                    # Determine category
                    f_lower = f.lower()
                    path_lower = root.lower()
                    category = "OTHER"
                    
                    for cat, keywords in categories.items():
                        if any(kw in f_lower or kw in path_lower for kw in keywords):
                            category = cat
                            break
                    
                    pdfs.append({
                        "name": f,
                        "path": filepath,
                        "size": size,
                        "sizeMB": round(size / (1024*1024), 2),
                        "category": category,
                        "directory": os.path.basename(root)
                    })
    
    print(f"  Found {len(pdfs)} PDFs")
    return pdfs

def scan_mit_courses():
    """Scan MIT course directories"""
    print("Scanning MIT courses...")
    courses = []
    
    mit_base = r"C:\\PRISM\RESOURCES\MIT COURSES"
    resource_pdfs = r"C:\\PRISM\RESOURCES\RESOURCE PDFS"
    
    course_bases = [mit_base, resource_pdfs]
    
    for base in course_bases:
        if not os.path.exists(base):
            continue
            
        for item in os.listdir(base):
            item_path = os.path.join(base, item)
            if os.path.isdir(item_path):
                # Count files in course
                file_count = 0
                total_size = 0
                file_types = defaultdict(int)
                
                for root, dirs, files in os.walk(item_path):
                    for f in files:
                        file_count += 1
                        filepath = os.path.join(root, f)
                        total_size += os.path.getsize(filepath)
                        ext = os.path.splitext(f)[1].lower()
                        file_types[ext] += 1
                
                # Parse course number
                course_num = item.split('-')[0] if '-' in item else item
                
                courses.append({
                    "id": item,
                    "courseNumber": course_num,
                    "path": item_path,
                    "fileCount": file_count,
                    "sizeMB": round(total_size / (1024*1024), 2),
                    "fileTypes": dict(file_types),
                    "source": "MIT" if "MIT" in base else "OTHER"
                })
    
    print(f"  Found {len(courses)} courses")
    return courses

def categorize_pdfs(pdfs):
    """Group PDFs by category"""
    by_category = defaultdict(list)
    for pdf in pdfs:
        by_category[pdf["category"]].append(pdf)
    return dict(by_category)

def build_registry():
    """Build complete external resources registry"""
    print("=" * 70)
    print("PRISM EXTERNAL RESOURCES REGISTRY BUILDER")
    print("=" * 70)
    
    pdfs = scan_pdfs()
    courses = scan_mit_courses()
    
    # Categorize
    pdfs_by_category = categorize_pdfs(pdfs)
    
    # Build summary
    pdf_summary = {}
    total_pdf_size = 0
    for cat, items in pdfs_by_category.items():
        cat_size = sum(p["size"] for p in items)
        total_pdf_size += cat_size
        pdf_summary[cat] = {
            "count": len(items),
            "sizeMB": round(cat_size / (1024*1024), 2)
        }
    
    course_summary = {
        "totalCourses": len(courses),
        "totalFiles": sum(c["fileCount"] for c in courses),
        "totalSizeMB": round(sum(c["sizeMB"] for c in courses), 2)
    }
    
    registry = {
        "version": "1.0.0",
        "timestamp": "2026-01-31T22:30:00Z",
        "summary": {
            "totalPDFs": len(pdfs),
            "totalPDFSizeMB": round(total_pdf_size / (1024*1024), 2),
            "pdfCategories": pdf_summary,
            "courses": course_summary
        },
        "pdfs": pdfs,
        "courses": courses,
        "searchIndex": {
            "tooling": [p["name"] for p in pdfs_by_category.get("TOOLING", [])],
            "machines": [p["name"] for p in pdfs_by_category.get("MACHINES", [])],
            "controllers": [p["name"] for p in pdfs_by_category.get("CONTROLLERS", [])],
            "mitCourses": [c["id"] for c in courses if c["source"] == "MIT"]
        }
    }
    
    # Save registry
    os.makedirs(OUTPUT_PATH, exist_ok=True)
    registry_path = os.path.join(OUTPUT_PATH, "EXTERNAL_RESOURCES_REGISTRY.json")
    with open(registry_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)
    
    print("\n" + "=" * 70)
    print("EXTERNAL RESOURCES REGISTRY COMPLETE")
    print("=" * 70)
    print(f"\nPDFs: {len(pdfs)} ({round(total_pdf_size/(1024*1024), 1)} MB)")
    for cat, info in sorted(pdf_summary.items(), key=lambda x: -x[1]["count"]):
        print(f"  {cat:20} {info['count']:4} files  ({info['sizeMB']:,.1f} MB)")
    
    print(f"\nMIT Courses: {len(courses)}")
    print(f"  Total files: {course_summary['totalFiles']}")
    print(f"  Total size: {course_summary['totalSizeMB']:,.1f} MB")
    
    print(f"\nRegistry saved: {registry_path}")
    
    return registry

if __name__ == "__main__":
    build_registry()
