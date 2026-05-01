#!/usr/bin/env python3
"""
PRISM Tool Holder Database Extractor v1.0
==========================================
Extracts ALL tool holder databases from PRISM v8.89 monolith HTML file.
Targets: BIG_DAISHOWA (110 holders), HOLDER_DATABASE_UNIFIED, generic holders

Author: PRISM Manufacturing Intelligence
Date: 2026-01-26
Phase: 2A.1 - Tool Holder Extraction
"""

import re
import json
import os
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
import sys

# =============================================================================
# CONFIGURATION
# =============================================================================
MONOLITH_PATH = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html")
OUTPUT_DIR = Path(r"C:\PRISM\data\tool_holders")
STATE_DIR = Path(r"C:\PRISM\state")

# Database markers to search for
DATABASE_MARKERS = [
    ("PRISM_BIG_DAISHOWA_HOLDER_DATABASE", "big_daishowa"),
    ("HOLDER_DATABASE_UNIFIED", "unified"),
    ("PRISM_TOOL_HOLDER_DATABASE", "generic"),
    ("TOOL_HOLDER_DATABASE", "generic_v2"),
    ("collectHolders", "collector"),
]

# 120-parameter schema categories
SCHEMA_CATEGORIES = {
    "core_identification": [
        "id", "vendor", "catalog_number", "product_line", "category", 
        "subcategory", "type", "description", "model_name"
    ],
    "spindle_interface": [
        "taper_type", "taper_angle", "taper_length", "flange_diameter",
        "flange_to_gauge", "pull_stud_type", "retention_force_min",
        "retention_force_max", "spindle_bore_diameter"
    ],
    "tool_interface": [
        "collet_system", "bore_diameter_min", "bore_diameter_max",
        "collet_range", "clamping_force", "clamping_mechanism"
    ],
    "geometry": [
        "overall_length", "gauge_length", "body_diameter", "body_length",
        "nose_diameter", "nose_length", "nut_diameter", "nut_length",
        "weight_kg", "center_of_gravity"
    ],
    "collision_envelope": [
        "envelope_segments", "max_diameter_at_gauge", "clearance_angle"
    ],
    "performance": [
        "runout_tir_um", "stiffness_radial_n_um", "stiffness_axial_n_um",
        "damping_ratio", "balance_grade", "max_rpm", "recommended_rpm"
    ],
    "vibration": [
        "natural_frequency_hz", "mode_shapes", "stability_lobes",
        "chatter_suppression_factor"
    ],
    "thermal": [
        "thermal_expansion_coef", "temperature_compensation", 
        "coolant_through", "coolant_pressure_max_bar"
    ],
    "applications": [
        "operation_suitability", "material_suitability", "tool_compatibility"
    ],
    "metadata": [
        "source", "extraction_date", "confidence", "verified"
    ]
}


class ToolHolderExtractor:
    """Extracts tool holder data from PRISM monolith."""
    
    def __init__(self):
        self.monolith_content = None
        self.extracted_holders = []
        self.extraction_stats = {
            "total_found": 0,
            "by_vendor": {},
            "by_taper": {},
            "by_type": {},
            "extraction_time": None,
            "errors": []
        }
    
    def load_monolith(self) -> bool:
        """Load the monolith HTML file."""
        print(f"[INFO] Loading monolith from: {MONOLITH_PATH}")
        try:
            with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
                self.monolith_content = f.read()
            print(f"[OK] Loaded {len(self.monolith_content):,} characters")
            return True
        except Exception as e:
            print(f"[ERROR] Failed to load monolith: {e}")
            self.extraction_stats["errors"].append(str(e))
            return False
    
    def find_database_boundaries(self, marker: str) -> List[tuple]:
        """Find start and end positions of a database in the monolith."""
        boundaries = []
        # Pattern: const MARKER = { ... };
        pattern = rf'(const\s+{re.escape(marker)}\s*=\s*\{{)'
        
        for match in re.finditer(pattern, self.monolith_content):
            start = match.start()
            # Find matching closing brace
            brace_count = 0
            end = start
            in_string = False
            escape_next = False
            
            for i, char in enumerate(self.monolith_content[start:], start):
                if escape_next:
                    escape_next = False
                    continue
                if char == '\\':
                    escape_next = True
                    continue
                if char == '"' or char == "'":
                    in_string = not in_string
                    continue
                if in_string:
                    continue
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end = i + 1
                        break
                        
            if end > start:
                boundaries.append((start, end))
        
        return boundaries
    
    def extract_big_daishowa(self) -> List[Dict]:
        """Extract BIG DAISHOWA tool holder database."""
        print("\n[EXTRACT] BIG DAISHOWA Tool Holders...")
        holders = []
        
        # Search for the database starting around line 24790
        pattern = r'PRISM_BIG_DAISHOWA_HOLDER_DATABASE\s*=\s*\{([^;]*?holderCount:\s*\d+[^;]*?)\}'
        match = re.search(pattern, self.monolith_content, re.DOTALL)
        
        if not match:
            # Try alternative pattern
            pattern = r'const\s+PRISM_BIG_DAISHOWA_HOLDER_DATABASE\s*=\s*(\{[\s\S]*?\n\s*\};)'
            match = re.search(pattern, self.monolith_content)
        
        if match:
            try:
                # Extract the JavaScript object content
                js_content = match.group(0)
                print(f"[DEBUG] Found database block: {len(js_content)} chars")
                
                # Parse BCV40 taper holders
                bcv40_pattern = r'BCV40:\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}'
                bcv40_match = re.search(bcv40_pattern, js_content, re.DOTALL)
                if bcv40_match:
                    bcv40_holders = self._parse_taper_section(bcv40_match.group(1), "BT40", "BIG DAISHOWA")
                    holders.extend(bcv40_holders)
                    print(f"  [+] BCV40 (BT40): {len(bcv40_holders)} holders")
                
                # Parse BCV50 taper holders
                bcv50_pattern = r'BCV50:\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}'
                bcv50_match = re.search(bcv50_pattern, js_content, re.DOTALL)
                if bcv50_match:
                    bcv50_holders = self._parse_taper_section(bcv50_match.group(1), "BT50", "BIG DAISHOWA")
                    holders.extend(bcv50_holders)
                    print(f"  [+] BCV50 (BT50): {len(bcv50_holders)} holders")
                    
            except Exception as e:
                print(f"[ERROR] Parsing BIG DAISHOWA: {e}")
                self.extraction_stats["errors"].append(f"BIG_DAISHOWA: {e}")
        else:
            print("[WARN] BIG DAISHOWA database not found via regex, trying line search...")
            holders = self._extract_by_line_search("BIG_DAISHOWA", 24700, 26000)
        
        self.extraction_stats["by_vendor"]["BIG_DAISHOWA"] = len(holders)
        return holders
    
    def _parse_taper_section(self, content: str, taper: str, vendor: str) -> List[Dict]:
        """Parse a taper section (BCV40/BCV50) for holder entries."""
        holders = []
        
        # Pattern for individual holder entries
        holder_pattern = r'([A-Z0-9\-_]+):\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}'
        
        for match in re.finditer(holder_pattern, content, re.DOTALL):
            holder_id = match.group(1)
            holder_data = match.group(2)
            
            holder = self._create_holder_entry(holder_id, holder_data, taper, vendor)
            if holder:
                holders.append(holder)
        
        return holders
    
    def _create_holder_entry(self, holder_id: str, raw_data: str, taper: str, vendor: str) -> Optional[Dict]:
        """Create a standardized holder entry from raw data."""
        holder = {
            "id": f"{vendor.lower().replace(' ', '_')}_{taper}_{holder_id}",
            "vendor": vendor,
            "catalog_number": holder_id,
            "taper_type": taper,
            "source": "monolith_v8.89",
            "extraction_date": datetime.now(timezone.utc).isoformat(),
            "confidence": 0.85,
            "verified": False,
            "raw_data": raw_data[:500]  # Keep first 500 chars of raw for debugging
        }
        
        # Extract specific fields from raw data
        field_patterns = {
            "description": r'description:\s*["\']([^"\']+)["\']',
            "overall_length": r'(?:overallLength|length):\s*([\d.]+)',
            "gauge_length": r'gaugeLength:\s*([\d.]+)',
            "body_diameter": r'(?:bodyDiameter|diameter):\s*([\d.]+)',
            "bore_diameter_min": r'(?:boreMin|minBore):\s*([\d.]+)',
            "bore_diameter_max": r'(?:boreMax|maxBore):\s*([\d.]+)',
            "runout_tir_um": r'(?:runout|TIR):\s*([\d.]+)',
            "max_rpm": r'(?:maxRPM|rpmMax):\s*(\d+)',
            "weight_kg": r'weight:\s*([\d.]+)',
            "collet_system": r'colletSystem:\s*["\']([^"\']+)["\']',
            "type": r'type:\s*["\']([^"\']+)["\']',
        }
        
        for field, pattern in field_patterns.items():
            match = re.search(pattern, raw_data, re.IGNORECASE)
            if match:
                value = match.group(1)
                # Convert numeric strings to numbers
                if field not in ["description", "collet_system", "type"]:
                    try:
                        value = float(value) if '.' in value else int(value)
                    except:
                        pass
                holder[field] = value
        
        # Infer holder type from ID if not found
        if "type" not in holder:
            holder["type"] = self._infer_holder_type(holder_id)
        
        return holder
    
    def _infer_holder_type(self, holder_id: str) -> str:
        """Infer holder type from the catalog number."""
        id_lower = holder_id.lower()
        
        if "hmc" in id_lower or "hdc" in id_lower:
            return "milling_chuck"
        elif "mega" in id_lower:
            return "mega_precision"
        elif "er" in id_lower:
            return "er_collet_chuck"
        elif "hsk" in id_lower:
            return "hsk_adapter"
        elif "shrink" in id_lower or "sf" in id_lower:
            return "shrink_fit"
        elif "hydr" in id_lower:
            return "hydraulic"
        elif "tap" in id_lower:
            return "tap_holder"
        elif "drill" in id_lower:
            return "drill_chuck"
        else:
            return "collet_chuck"
    
    def _extract_by_line_search(self, keyword: str, start_line: int, end_line: int) -> List[Dict]:
        """Extract data by searching specific line range."""
        holders = []
        lines = self.monolith_content.split('\n')
        
        # Ensure we don't exceed bounds
        start_line = max(0, start_line)
        end_line = min(len(lines), end_line)
        
        relevant_lines = lines[start_line:end_line]
        block = '\n'.join(relevant_lines)
        
        print(f"[DEBUG] Searching lines {start_line}-{end_line} ({len(block)} chars)")
        
        # Try to extract holder patterns from this block
        # Pattern for object entries
        pattern = r'([A-Z0-9\-_]+):\s*\{\s*(?:description|name|type):'
        
        for match in re.finditer(pattern, block):
            holder_id = match.group(1)
            # Find the full object
            start = match.start()
            brace_count = 0
            end = start
            
            for i, char in enumerate(block[start:], start):
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end = i + 1
                        break
            
            if end > start:
                raw_data = block[start:end]
                holder = self._create_holder_entry(holder_id, raw_data, "UNKNOWN", keyword)
                if holder:
                    holders.append(holder)
        
        return holders
    
    def extract_unified_database(self) -> List[Dict]:
        """Extract HOLDER_DATABASE_UNIFIED if present."""
        print("\n[EXTRACT] Unified Tool Holder Database...")
        holders = []
        
        pattern = r'HOLDER_DATABASE_UNIFIED\s*=\s*\{([^;]+)\}'
        match = re.search(pattern, self.monolith_content, re.DOTALL)
        
        if match:
            content = match.group(1)
            # Parse holders from unified database
            holder_pattern = r'["\']([A-Za-z0-9\-_]+)["\']\s*:\s*\{([^}]+)\}'
            
            for h_match in re.finditer(holder_pattern, content):
                holder_id = h_match.group(1)
                holder_data = h_match.group(2)
                
                holder = self._create_holder_entry(holder_id, holder_data, "GENERIC", "UNIFIED")
                if holder:
                    holders.append(holder)
            
            print(f"  [+] Unified DB: {len(holders)} holders")
        else:
            print("  [INFO] Unified database not found")
        
        self.extraction_stats["by_vendor"]["UNIFIED"] = len(holders)
        return holders
    
    def extract_all(self) -> Dict:
        """Run full extraction pipeline."""
        start_time = datetime.now(timezone.utc)
        print("=" * 60)
        print("PRISM Tool Holder Extraction Pipeline")
        print("=" * 60)
        
        # Load monolith
        if not self.load_monolith():
            return {"error": "Failed to load monolith", "stats": self.extraction_stats}
        
        # Extract from all sources
        all_holders = []
        
        # 1. BIG DAISHOWA
        big_daishowa = self.extract_big_daishowa()
        all_holders.extend(big_daishowa)
        
        # 2. Unified database
        unified = self.extract_unified_database()
        all_holders.extend(unified)
        
        # 3. Search for other holder databases
        print("\n[EXTRACT] Searching for additional databases...")
        for marker, source_name in DATABASE_MARKERS:
            if marker not in ["PRISM_BIG_DAISHOWA_HOLDER_DATABASE", "HOLDER_DATABASE_UNIFIED"]:
                count_before = len(all_holders)
                # Search for this marker
                if marker in self.monolith_content:
                    print(f"  [+] Found {marker}, extracting...")
                    # Extract using generic method
                    additional = self._extract_generic_database(marker, source_name)
                    all_holders.extend(additional)
                    print(f"      Added {len(all_holders) - count_before} holders")
        
        # Deduplicate by catalog_number + vendor
        seen = set()
        unique_holders = []
        for holder in all_holders:
            key = f"{holder.get('vendor', '')}_{holder.get('catalog_number', '')}"
            if key not in seen:
                seen.add(key)
                unique_holders.append(holder)
        
        self.extracted_holders = unique_holders
        
        # Update stats
        self.extraction_stats["total_found"] = len(unique_holders)
        self.extraction_stats["extraction_time"] = (datetime.now(timezone.utc) - start_time).total_seconds()
        
        # Count by taper
        for holder in unique_holders:
            taper = holder.get("taper_type", "UNKNOWN")
            self.extraction_stats["by_taper"][taper] = self.extraction_stats["by_taper"].get(taper, 0) + 1
            
            htype = holder.get("type", "unknown")
            self.extraction_stats["by_type"][htype] = self.extraction_stats["by_type"].get(htype, 0) + 1
        
        print("\n" + "=" * 60)
        print("EXTRACTION COMPLETE")
        print("=" * 60)
        print(f"Total holders extracted: {len(unique_holders)}")
        print(f"Time elapsed: {self.extraction_stats['extraction_time']:.2f}s")
        print(f"\nBy Vendor: {json.dumps(self.extraction_stats['by_vendor'], indent=2)}")
        print(f"\nBy Taper: {json.dumps(self.extraction_stats['by_taper'], indent=2)}")
        print(f"\nBy Type: {json.dumps(self.extraction_stats['by_type'], indent=2)}")
        
        return {
            "holders": unique_holders,
            "stats": self.extraction_stats
        }
    
    def _extract_generic_database(self, marker: str, source_name: str) -> List[Dict]:
        """Extract holders from a generic database marker."""
        holders = []
        
        # Find the marker and extract surrounding content
        idx = self.monolith_content.find(marker)
        if idx == -1:
            return holders
        
        # Get context around the marker (10KB before and after)
        start = max(0, idx - 1000)
        end = min(len(self.monolith_content), idx + 10000)
        context = self.monolith_content[start:end]
        
        # Look for holder-like patterns
        holder_pattern = r'["\']([A-Z]{2,3}[\d]{2}[A-Za-z0-9\-_]+)["\']\s*:\s*\{([^}]+)\}'
        
        for match in re.finditer(holder_pattern, context):
            holder_id = match.group(1)
            holder_data = match.group(2)
            
            holder = self._create_holder_entry(holder_id, holder_data, "GENERIC", source_name)
            if holder:
                holders.append(holder)
        
        self.extraction_stats["by_vendor"][source_name] = len(holders)
        return holders
    
    def save_results(self):
        """Save extracted holders to JSON files."""
        print("\n[SAVE] Writing results...")
        
        # Create output directories
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        
        # Group by taper type
        by_taper = {}
        for holder in self.extracted_holders:
            taper = holder.get("taper_type", "UNKNOWN")
            if taper not in by_taper:
                by_taper[taper] = []
            by_taper[taper].append(holder)
        
        # Save each taper to its own file
        for taper, holders in by_taper.items():
            taper_dir = OUTPUT_DIR / taper
            taper_dir.mkdir(exist_ok=True)
            
            output_file = taper_dir / f"{taper}_holders.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "taper": taper,
                    "count": len(holders),
                    "extracted": datetime.now(timezone.utc).isoformat(),
                    "holders": holders
                }, f, indent=2)
            print(f"  [+] {output_file.name}: {len(holders)} holders")
        
        # Save master index
        master_index = {
            "version": "1.0.0",
            "extracted": datetime.now(timezone.utc).isoformat(),
            "source": "PRISM v8.89 monolith",
            "total_holders": len(self.extracted_holders),
            "stats": self.extraction_stats,
            "tapers": {
                taper: {
                    "count": len(holders),
                    "file": f"{taper}/{taper}_holders.json"
                }
                for taper, holders in by_taper.items()
            }
        }
        
        master_file = OUTPUT_DIR / "MASTER_INDEX.json"
        with open(master_file, 'w', encoding='utf-8') as f:
            json.dump(master_index, f, indent=2)
        print(f"  [+] MASTER_INDEX.json: {len(self.extracted_holders)} total")
        
        # Update state
        self._update_state()
        
        return master_index
    
    def _update_state(self):
        """Update CURRENT_STATE.json with extraction progress."""
        state_file = STATE_DIR / "CURRENT_STATE.json"
        
        try:
            with open(state_file, 'r', encoding='utf-8') as f:
                state = json.load(f)
        except:
            state = {}
        
        state["toolHolderExtraction"] = {
            "status": "COMPLETE",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "total_extracted": len(self.extracted_holders),
            "stats": self.extraction_stats
        }
        
        with open(state_file, 'w', encoding='utf-8') as f:
            json.dump(state, f, indent=2)
        
        print(f"  [+] Updated {state_file.name}")


def main():
    """Main entry point."""
    extractor = ToolHolderExtractor()
    
    # Run extraction
    results = extractor.extract_all()
    
    if "error" in results:
        print(f"\n[FATAL] {results['error']}")
        sys.exit(1)
    
    # Save results
    master_index = extractor.save_results()
    
    print("\n" + "=" * 60)
    print("TOOL HOLDER EXTRACTION COMPLETE")
    print("=" * 60)
    print(f"Total: {master_index['total_holders']} holders extracted")
    print(f"Output: {OUTPUT_DIR}")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
