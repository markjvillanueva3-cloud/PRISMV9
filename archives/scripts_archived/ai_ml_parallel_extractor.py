#!/usr/bin/env python3
"""
PRISM AI/ML Parallel Extractor v1.0
Deploys parallel extraction for all AI/ML engines from monolith
Uses threading for concurrent searches and extractions
"""

import os
import re
import json
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

# Configuration
MONOLITH_PATH = r"C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html"
OUTPUT_DIR = r"C:\\PRISM\EXTRACTED\engines\ai_ml"
STATE_FILE = r"C:\\PRISM\SCRIPTS\ai_ml_extraction_state.json"

# AI/ML Modules to Extract (NOT YET EXTRACTED)
EXTRACTION_TARGETS = {
    # Deep Learning Architectures
    "PRISM_DEEP_LEARNING": {
        "patterns": [r"PRISM_DEEP_LEARNING\s*[=:]\s*\{", r"const\s+PRISM_DEEP_LEARNING"],
        "keywords": ["CNN", "getCNN", "getDeepNet", "convolution"],
        "category": "deep_learning",
        "priority": 1
    },
    "PRISM_LSTM_ENGINE": {
        "patterns": [r"PRISM_LSTM|LSTM_ENGINE|LSTMCell"],
        "keywords": ["LSTM", "forget_gate", "cell_state", "hidden_state"],
        "category": "sequence_models",
        "priority": 1
    },
    "PRISM_TRANSFORMER": {
        "patterns": [r"PRISM_TRANSFORMER|TRANSFORMER_|MultiHeadAttention"],
        "keywords": ["attention", "self_attention", "positional_encoding", "transformer"],
        "category": "attention",
        "priority": 1
    },
    
    # Reinforcement Learning
    "PRISM_RL_ENGINE": {
        "patterns": [r"PRISM_RL_|ReinforcementLearning|RL_ALGORITHMS"],
        "keywords": ["Q_learning", "policy_gradient", "reward", "state_action"],
        "category": "reinforcement_learning",
        "priority": 1
    },
    "PRISM_DQN": {
        "patterns": [r"PRISM_DQN|PRISM_ADVANCED_DQN|DeepQNetwork"],
        "keywords": ["DQN", "experience_replay", "target_network", "epsilon_greedy"],
        "category": "reinforcement_learning",
        "priority": 1
    },
    "PRISM_ACTOR_CRITIC": {
        "patterns": [r"PRISM_ACTOR_CRITIC|ActorCritic|A2C|A3C"],
        "keywords": ["actor", "critic", "advantage", "policy_loss", "value_loss"],
        "category": "reinforcement_learning",
        "priority": 2
    },
    "PRISM_POLICY_GRADIENT": {
        "patterns": [r"PRISM_POLICY_GRADIENT|PolicyGradient|REINFORCE"],
        "keywords": ["policy", "gradient", "log_prob", "baseline"],
        "category": "reinforcement_learning",
        "priority": 2
    },
    
    # Advanced Optimizers
    "PRISM_GENETIC_ALGORITHM": {
        "patterns": [r"PRISM_GA_ENGINE|GeneticAlgorithm|PRISM_GENETIC"],
        "keywords": ["crossover", "mutation", "selection", "fitness", "chromosome"],
        "category": "optimization",
        "priority": 2
    },
    "PRISM_SIMULATED_ANNEALING": {
        "patterns": [r"PRISM_SIMULATED_ANNEALING|SimulatedAnnealing"],
        "keywords": ["temperature", "cooling", "metropolis", "annealing"],
        "category": "optimization",
        "priority": 2
    },
    "PRISM_DIFFERENTIAL_EVOLUTION": {
        "patterns": [r"PRISM_DIFFERENTIAL_EVOLUTION|DifferentialEvolution"],
        "keywords": ["mutation_factor", "crossover_rate", "differential"],
        "category": "optimization",
        "priority": 2
    },
    
    # Attention Mechanisms
    "PRISM_ATTENTION": {
        "patterns": [r"PRISM_ATTENTION|AttentionMechanism|SelfAttention"],
        "keywords": ["query", "key", "value", "attention_weights", "softmax"],
        "category": "attention",
        "priority": 1
    },
    
    # Generative Models
    "PRISM_GAN": {
        "patterns": [r"PRISM_GAN|GenerativeAdversarial|Discriminator|Generator"],
        "keywords": ["generator", "discriminator", "adversarial", "latent"],
        "category": "generative",
        "priority": 3
    },
    "PRISM_AUTOENCODER": {
        "patterns": [r"PRISM_AUTOENCODER|Autoencoder|VAE"],
        "keywords": ["encoder", "decoder", "latent_space", "reconstruction"],
        "category": "generative",
        "priority": 3
    },
    
    # Ensemble Methods
    "PRISM_GRADIENT_BOOSTING": {
        "patterns": [r"PRISM_GRADIENT_BOOSTING|GradientBoosting|XGBoost"],
        "keywords": ["boosting", "weak_learner", "residual", "shrinkage"],
        "category": "ensemble",
        "priority": 2
    },
    
    # Signal Processing AI
    "PRISM_SIGNAL_AI": {
        "patterns": [r"PRISM_SIGNAL_AI|SignalProcessor|FFT_Neural"],
        "keywords": ["fft", "spectrum", "filter", "convolution"],
        "category": "signal",
        "priority": 3
    }
}

# Already extracted modules (skip these)
ALREADY_EXTRACTED = [
    "PRISM_ML_ALGORITHMS",
    "PRISM_NEURAL_ENGINE_ENHANCED",
    "PRISM_NEURAL_NETWORK",
    "PRISM_BAYESIAN_LEARNING",
    "PRISM_BAYESIAN_SYSTEM",
    "PRISM_BAYESIAN_TOOL_LIFE",
    "PRISM_PSO_OPTIMIZER",
    "PRISM_OPTIMIZER_ADVANCED",
    "PRISM_OPTIMIZERS_ENGINE",
    "PRISM_AI_COMPLETE_SYSTEM",
    "PRISM_AI_INTEGRATED_SYSTEM",
    "PRISM_AI_PHYSICS_ENGINE",
    "PRISM_AI_TRAINING_DATA",
    "PRISM_ML_FEATURE_RECOGNITION",
    "PRISM_ML"
]

class AIMLExtractor:
    def __init__(self):
        self.monolith_content = None
        self.monolith_lines = []
        self.results = {}
        self.lock = threading.Lock()
        self.load_state()
        
    def load_state(self):
        """Load previous extraction state"""
        if os.path.exists(STATE_FILE):
            with open(STATE_FILE, 'r') as f:
                self.state = json.load(f)
        else:
            self.state = {
                "extracted": [],
                "failed": [],
                "pending": list(EXTRACTION_TARGETS.keys()),
                "last_run": None
            }
    
    def save_state(self):
        """Save extraction state"""
        self.state["last_run"] = datetime.now().isoformat()
        with open(STATE_FILE, 'w') as f:
            json.dump(self.state, f, indent=2)
    
    def load_monolith(self):
        """Load monolith file into memory"""
        print(f"[LOAD] Reading monolith file...")
        with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
            self.monolith_content = f.read()
            self.monolith_lines = self.monolith_content.split('\n')
        print(f"[LOAD] Loaded {len(self.monolith_lines):,} lines")
        
    def search_module(self, module_name, config):
        """Search for a module in the monolith"""
        findings = {
            "module": module_name,
            "locations": [],
            "keyword_hits": {},
            "estimated_lines": 0,
            "confidence": 0
        }
        
        # Search for primary patterns
        for pattern in config["patterns"]:
            for i, line in enumerate(self.monolith_lines):
                if re.search(pattern, line, re.IGNORECASE):
                    findings["locations"].append({
                        "line": i + 1,
                        "content": line[:200],
                        "pattern": pattern
                    })
        
        # Search for keywords
        for keyword in config["keywords"]:
            count = 0
            for line in self.monolith_lines:
                if keyword.lower() in line.lower():
                    count += 1
            if count > 0:
                findings["keyword_hits"][keyword] = count
        
        # Calculate confidence
        if findings["locations"]:
            findings["confidence"] = min(1.0, len(findings["locations"]) * 0.2 + 
                                         len(findings["keyword_hits"]) * 0.1)
        
        return findings
    
    def extract_module_content(self, start_line, module_name):
        """Extract module content starting from a line number"""
        content_lines = []
        brace_count = 0
        started = False
        
        for i in range(start_line - 1, min(start_line + 5000, len(self.monolith_lines))):
            line = self.monolith_lines[i]
            
            # Track braces
            brace_count += line.count('{') - line.count('}')
            
            if '{' in line and not started:
                started = True
            
            if started:
                content_lines.append(line)
                
                # End when braces balance (and we have content)
                if brace_count <= 0 and len(content_lines) > 10:
                    break
        
        return content_lines
    
    def parallel_search(self, max_workers=4):
        """Run parallel searches for all modules"""
        print(f"\n[PARALLEL] Starting parallel search with {max_workers} workers...")
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {}
            
            for module_name, config in EXTRACTION_TARGETS.items():
                if module_name in ALREADY_EXTRACTED:
                    print(f"  [SKIP] {module_name} - already extracted")
                    continue
                    
                future = executor.submit(self.search_module, module_name, config)
                futures[future] = module_name
            
            for future in as_completed(futures):
                module_name = futures[future]
                try:
                    result = future.result()
                    with self.lock:
                        self.results[module_name] = result
                    
                    status = "✓ FOUND" if result["locations"] else "✗ NOT FOUND"
                    print(f"  [{status}] {module_name}: {len(result['locations'])} locations, "
                          f"{len(result['keyword_hits'])} keywords, "
                          f"confidence: {result['confidence']:.1%}")
                except Exception as e:
                    print(f"  [ERROR] {module_name}: {str(e)}")
    
    def generate_extraction_report(self):
        """Generate comprehensive extraction report"""
        report = {
            "timestamp": datetime.now().isoformat(),
            "monolith_lines": len(self.monolith_lines),
            "targets_searched": len(self.results),
            "modules_found": [],
            "modules_not_found": [],
            "extraction_plan": [],
            "priority_order": []
        }
        
        # Sort by priority and confidence
        sorted_results = sorted(
            self.results.items(),
            key=lambda x: (EXTRACTION_TARGETS.get(x[0], {}).get("priority", 99), 
                          -x[1]["confidence"])
        )
        
        for module_name, result in sorted_results:
            if result["locations"]:
                report["modules_found"].append({
                    "name": module_name,
                    "locations": len(result["locations"]),
                    "first_location": result["locations"][0] if result["locations"] else None,
                    "keywords_found": list(result["keyword_hits"].keys()),
                    "confidence": result["confidence"],
                    "category": EXTRACTION_TARGETS[module_name]["category"],
                    "priority": EXTRACTION_TARGETS[module_name]["priority"]
                })
                report["priority_order"].append(module_name)
            else:
                report["modules_not_found"].append(module_name)
        
        # Create extraction plan
        for module in report["modules_found"]:
            if module["confidence"] > 0.3:
                report["extraction_plan"].append({
                    "module": module["name"],
                    "start_line": module["first_location"]["line"] if module["first_location"] else None,
                    "estimated_effort": "low" if module["confidence"] > 0.7 else "medium",
                    "category": module["category"]
                })
        
        return report
    
    def run_full_extraction(self):
        """Run the complete extraction pipeline"""
        print("=" * 70)
        print("PRISM AI/ML PARALLEL EXTRACTOR v1.0")
        print("=" * 70)
        
        # Load monolith
        self.load_monolith()
        
        # Run parallel search
        self.parallel_search(max_workers=4)
        
        # Generate report
        report = self.generate_extraction_report()
        
        # Save report
        report_path = os.path.join(OUTPUT_DIR, "AI_ML_EXTRACTION_REPORT.json")
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Print summary
        print("\n" + "=" * 70)
        print("EXTRACTION SUMMARY")
        print("=" * 70)
        print(f"Modules Found:     {len(report['modules_found'])}")
        print(f"Modules Not Found: {len(report['modules_not_found'])}")
        print(f"Extraction Plan:   {len(report['extraction_plan'])} modules")
        
        print("\n[FOUND MODULES - Priority Order]")
        for m in report["modules_found"][:10]:
            print(f"  P{m['priority']}: {m['name']} ({m['category']}) - "
                  f"Line {m['first_location']['line'] if m['first_location'] else 'N/A'}, "
                  f"Conf: {m['confidence']:.0%}")
        
        print("\n[NOT FOUND]")
        for m in report["modules_not_found"]:
            print(f"  - {m}")
        
        # Save state
        self.state["extracted"] = [m["name"] for m in report["modules_found"] if m["confidence"] > 0.5]
        self.state["pending"] = report["modules_not_found"]
        self.save_state()
        
        print(f"\n[SAVED] Report: {report_path}")
        print(f"[SAVED] State: {STATE_FILE}")
        
        return report


def main():
    extractor = AIMLExtractor()
    report = extractor.run_full_extraction()
    return report


if __name__ == "__main__":
    main()
