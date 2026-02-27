#!/usr/bin/env python3
"""
PRISM AI/ML BATCH EXTRACTOR v2.0
Parallel extraction of all AI/ML modules from monolith
With intelligent module boundary detection
"""

import os
import re
import json
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

# Configuration
MONOLITH_PATH = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html"
OUTPUT_DIR = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\engines\ai_ml"

# Extraction targets with precise line numbers from scan
EXTRACTION_TARGETS = [
    # Priority 1 - Core AI/ML
    {"name": "PRISM_RL_ALGORITHMS", "search_start": 777000, "search_end": 780000, 
     "pattern": r"const\s+PRISM_RL_ALGORITHMS\s*=", "category": "reinforcement_learning"},
    
    {"name": "PRISM_ADVANCED_DQN", "search_start": 780000, "search_end": 785000,
     "pattern": r"const\s+PRISM_ADVANCED_DQN\s*=", "category": "reinforcement_learning"},
    
    {"name": "PRISM_ACTOR_CRITIC_ENGINE", "search_start": 777000, "search_end": 782000,
     "pattern": r"const\s+PRISM_ACTOR_CRITIC_ENGINE\s*=", "category": "reinforcement_learning"},
    
    {"name": "PRISM_POLICY_GRADIENT_ENGINE", "search_start": 777000, "search_end": 782000,
     "pattern": r"const\s+PRISM_POLICY_GRADIENT_ENGINE\s*=", "category": "reinforcement_learning"},
    
    # Priority 1 - Sequence Models  
    {"name": "PRISM_LSTM_ENGINE", "search_start": 779000, "search_end": 782000,
     "pattern": r"const\s+PRISM_LSTM_ENGINE\s*=|createLSTMCell", "category": "sequence_models"},
    
    {"name": "PRISM_RNN_ENGINE", "search_start": 779000, "search_end": 782000,
     "pattern": r"const\s+PRISM_RNN_ENGINE\s*=|RNN_HIDDEN", "category": "sequence_models"},
    
    # Priority 1 - Attention/Transformers
    {"name": "PRISM_ATTENTION_COMPLETE", "search_start": 20000, "search_end": 25000,
     "pattern": r"PRISM_ATTENTION_COMPLETE|PRISM_ATTENTION\s*=", "category": "attention"},
    
    {"name": "PRISM_TRANSFORMER_ENGINE", "search_start": 7900, "search_end": 12000,
     "pattern": r"TRANSFORMER_D_MODEL|PRISM_TRANSFORMER", "category": "attention"},
    
    # Priority 1 - Deep Learning
    {"name": "PRISM_DEEP_LEARNING", "search_start": 11500, "search_end": 15000,
     "pattern": r"const\s+PRISM_DEEP_LEARNING|PRISM_DEEP_LEARNING_PARAMS", "category": "deep_learning"},
    
    {"name": "PRISM_CNN_ENGINE", "search_start": 11500, "search_end": 15000,
     "pattern": r"getCNN|CNN_POOL_SIZE|convolution", "category": "deep_learning"},
    
    # Priority 2 - Optimization
    {"name": "PRISM_GA_ENGINE", "search_start": 19300, "search_end": 22000,
     "pattern": r"PRISM_GA_ENGINE|GeneticAlgorithm", "category": "optimization"},
    
    {"name": "PRISM_SIMULATED_ANNEALING", "search_start": 19300, "search_end": 22000,
     "pattern": r"PRISM_SIMULATED_ANNEALING", "category": "optimization"},
    
    {"name": "PRISM_DIFFERENTIAL_EVOLUTION", "search_start": 19300, "search_end": 22000,
     "pattern": r"PRISM_DIFFERENTIAL_EVOLUTION", "category": "optimization"},
    
    # Priority 2 - Ensemble
    {"name": "PRISM_GRADIENT_BOOSTING", "search_start": 7900, "search_end": 12000,
     "pattern": r"GradientBoosting|XGBoost|boosting", "category": "ensemble"},
    
    # Priority 3 - Generative
    {"name": "PRISM_AUTOENCODER", "search_start": 8000, "search_end": 12000,
     "pattern": r"Autoencoder|encoder.*decoder|VAE", "category": "generative"},
]

class BatchExtractor:
    def __init__(self):
        self.monolith_lines = []
        self.results = {}
        self.lock = threading.Lock()
        
    def load_monolith(self):
        """Load monolith into memory"""
        print("[LOAD] Reading monolith...")
        with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
            self.monolith_lines = f.read().split('\n')
        print(f"[LOAD] {len(self.monolith_lines):,} lines loaded")
        
    def find_module_boundaries(self, start_line, pattern, max_search=3000):
        """Find module start and end boundaries"""
        # Search for pattern
        module_start = None
        for i in range(start_line, min(start_line + max_search, len(self.monolith_lines))):
            if re.search(pattern, self.monolith_lines[i], re.IGNORECASE):
                module_start = i
                break
        
        if module_start is None:
            return None, None
            
        # Find module end by brace matching
        brace_count = 0
        module_end = module_start
        started = False
        
        for i in range(module_start, min(module_start + 5000, len(self.monolith_lines))):
            line = self.monolith_lines[i]
            brace_count += line.count('{') - line.count('}')
            
            if '{' in line and not started:
                started = True
                
            if started and brace_count <= 0:
                module_end = i
                break
                
        return module_start, module_end
        
    def extract_module(self, target):
        """Extract a single module"""
        name = target["name"]
        pattern = target["pattern"]
        search_start = target["search_start"]
        
        try:
            start, end = self.find_module_boundaries(search_start, pattern)
            
            if start is None:
                return {"name": name, "status": "NOT_FOUND", "lines": 0}
            
            # Extract content
            content = '\n'.join(self.monolith_lines[start:end+1])
            
            # Add header
            header = f"""// {name} - Extracted from PRISM v8.89.002
// Lines {start+1}-{end+1} ({end-start+1} lines)
// Category: {target['category']}
// Extracted: {datetime.now().isoformat()}
// Source: MIT/Stanford AI/ML Courses

"""
            full_content = header + content
            
            # Save to file
            output_path = os.path.join(OUTPUT_DIR, f"{name}.js")
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(full_content)
            
            return {
                "name": name,
                "status": "EXTRACTED",
                "start_line": start + 1,
                "end_line": end + 1,
                "lines": end - start + 1,
                "category": target["category"],
                "output_path": output_path
            }
            
        except Exception as e:
            return {"name": name, "status": "ERROR", "error": str(e)}
    
    def parallel_extract(self, max_workers=4):
        """Run parallel extraction"""
        print(f"\n[EXTRACT] Starting parallel extraction with {max_workers} workers...")
        
        extracted = []
        failed = []
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(self.extract_module, t): t["name"] for t in EXTRACTION_TARGETS}
            
            for future in as_completed(futures):
                name = futures[future]
                try:
                    result = future.result()
                    with self.lock:
                        self.results[name] = result
                    
                    if result["status"] == "EXTRACTED":
                        print(f"  [OK] {name}: {result['lines']} lines (L{result['start_line']}-{result['end_line']})")
                        extracted.append(result)
                    else:
                        print(f"  [--] {name}: {result['status']}")
                        failed.append(result)
                        
                except Exception as e:
                    print(f"  [!!] {name}: {str(e)}")
                    failed.append({"name": name, "status": "EXCEPTION", "error": str(e)})
        
        return extracted, failed
    
    def run(self):
        """Main extraction pipeline"""
        print("=" * 70)
        print("PRISM AI/ML BATCH EXTRACTOR v2.0")
        print("=" * 70)
        
        self.load_monolith()
        extracted, failed = self.parallel_extract(max_workers=6)
        
        # Summary
        print("\n" + "=" * 70)
        print("EXTRACTION SUMMARY")
        print("=" * 70)
        print(f"Extracted: {len(extracted)} modules")
        print(f"Failed:    {len(failed)} modules")
        
        total_lines = sum(r.get("lines", 0) for r in extracted)
        print(f"Total Lines: {total_lines:,}")
        
        # Save manifest
        manifest = {
            "timestamp": datetime.now().isoformat(),
            "extracted": extracted,
            "failed": failed,
            "total_lines": total_lines,
            "categories": {}
        }
        
        for r in extracted:
            cat = r.get("category", "unknown")
            if cat not in manifest["categories"]:
                manifest["categories"][cat] = []
            manifest["categories"][cat].append(r["name"])
        
        manifest_path = os.path.join(OUTPUT_DIR, "EXTRACTION_MANIFEST.json")
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        print(f"\n[SAVED] Manifest: {manifest_path}")
        
        # Print by category
        print("\n[BY CATEGORY]")
        for cat, modules in manifest["categories"].items():
            print(f"  {cat}: {', '.join(modules)}")
        
        return manifest


if __name__ == "__main__":
    extractor = BatchExtractor()
    extractor.run()
