#!/usr/bin/env python3
"""
PRISM Focus Optimizer v1.0
Session 1.4 Deliverable: Optimize context loading for focused attention.

Optimizes what context to load based on:
- Task requirements
- Token budget
- Relevance scores
- Resource dependencies
"""
import sys
if __name__ == "__main__":
    import io
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    except:
        pass

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple, Set
from dataclasses import dataclass, asdict, field
from enum import Enum

# Import attention scorer
try:
    from attention_scorer import AttentionScorer, AttentionScore, ContentCategory
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent))
    from attention_scorer import AttentionScorer, AttentionScore, ContentCategory

# Paths
PRISM_ROOT = Path("C:/PRISM")
FOCUS_LOG = PRISM_ROOT / "state" / "FOCUS_LOG.jsonl"
RESOURCE_REGISTRY = PRISM_ROOT / "registries" / "RESOURCE_REGISTRY.json"

class FocusLevel(Enum):
    """Levels of context focus."""
    MINIMAL = "minimal"      # Only essential for task
    FOCUSED = "focused"      # Task + immediate support
    STANDARD = "standard"    # Normal context loading
    EXPANDED = "expanded"    # Extra context for complex tasks
    FULL = "full"           # Load everything available

@dataclass
class FocusedContext:
    """Result of focus optimization."""
    focus_level: FocusLevel
    task_description: str
    
    # Selected content
    included_segments: List[str]
    excluded_segments: List[str]
    
    # Metrics
    total_chars: int
    included_chars: int
    excluded_chars: int
    reduction_percent: float
    
    # Token estimates
    estimated_tokens: int
    token_budget: int
    tokens_saved: int
    
    # Recommendations
    recommendations: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        d = asdict(self)
        d['focus_level'] = self.focus_level.value
        return d

@dataclass
class ResourceSelection:
    """A selected resource to load."""
    resource_type: str       # skill, agent, formula, etc.
    resource_id: str
    resource_name: str
    relevance_score: float
    estimated_tokens: int
    load_order: int
    required: bool = False   # Must load regardless of budget
    
    def to_dict(self) -> Dict:
        return asdict(self)

class FocusOptimizer:
    """Optimize context loading for focused attention."""
    
    # Token estimates per resource type
    TOKEN_ESTIMATES = {
        'skill': 500,
        'agent': 200,
        'formula': 100,
        'hook': 50,
        'material': 300,
        'machine': 200,
        'alarm': 100,
        'pattern': 150
    }
    
    # Focus level configurations
    FOCUS_CONFIGS = {
        FocusLevel.MINIMAL: {
            'min_score': 0.7,
            'max_resources': 5,
            'token_budget_percent': 0.3
        },
        FocusLevel.FOCUSED: {
            'min_score': 0.5,
            'max_resources': 10,
            'token_budget_percent': 0.5
        },
        FocusLevel.STANDARD: {
            'min_score': 0.3,
            'max_resources': 20,
            'token_budget_percent': 0.7
        },
        FocusLevel.EXPANDED: {
            'min_score': 0.2,
            'max_resources': 30,
            'token_budget_percent': 0.85
        },
        FocusLevel.FULL: {
            'min_score': 0.0,
            'max_resources': 100,
            'token_budget_percent': 1.0
        }
    }
    
    # Task type to required resources mapping
    TASK_REQUIREMENTS = {
        'cutting_calculation': {
            'required': ['prism-material-physics', 'prism-universal-formulas'],
            'recommended': ['prism-algorithm-selector', 'prism-manufacturing-tables']
        },
        'post_processor': {
            'required': ['prism-gcode-reference', 'prism-fanuc-programming'],
            'recommended': ['prism-siemens-programming', 'prism-heidenhain-programming']
        },
        'error_handling': {
            'required': ['prism-error-catalog', 'prism-debugging'],
            'recommended': ['prism-safety-framework', 'prism-error-recovery']
        },
        'session_management': {
            'required': ['prism-session-master', 'prism-quick-start'],
            'recommended': ['prism-state-manager', 'prism-task-continuity']
        },
        'material_lookup': {
            'required': ['prism-material-schema', 'prism-material-lookup'],
            'recommended': ['prism-material-physics', 'prism-material-validator']
        },
        'code_generation': {
            'required': ['prism-coding-patterns', 'prism-code-master'],
            'recommended': ['prism-tdd', 'prism-api-contracts']
        }
    }
    
    def __init__(self, token_budget: int = 50000):
        self._ensure_paths()
        self.scorer = AttentionScorer()
        self.token_budget = token_budget
        self.resources = self._load_resources()
    
    def _ensure_paths(self):
        """Ensure required paths exist."""
        FOCUS_LOG.parent.mkdir(parents=True, exist_ok=True)
    
    def _load_resources(self) -> Dict[str, List[Dict]]:
        """Load available resources."""
        resources = {
            'skills': [],
            'agents': [],
            'formulas': [],
            'hooks': []
        }
        
        # Try loading from registry
        if RESOURCE_REGISTRY.exists():
            try:
                data = json.loads(RESOURCE_REGISTRY.read_text(encoding='utf-8'))
                resources = data.get('resources', resources)
            except:
                pass
        
        return resources
    
    def optimize_for_task(self, task_description: str, 
                          focus_level: FocusLevel = FocusLevel.STANDARD,
                          content: str = None) -> FocusedContext:
        """
        Optimize context loading for a specific task.
        
        Args:
            task_description: What task to optimize for
            focus_level: How focused to be
            content: Optional existing content to filter
            
        Returns:
            FocusedContext with optimization results
        """
        # Set task context for scoring
        self.scorer.set_task_context(task_description)
        
        config = self.FOCUS_CONFIGS[focus_level]
        effective_budget = int(self.token_budget * config['token_budget_percent'])
        
        included_segments = []
        excluded_segments = []
        included_chars = 0
        excluded_chars = 0
        
        if content:
            # Score existing content
            scores = self.scorer.score_content(content)
            
            for score in scores:
                if score.attention_score >= config['min_score']:
                    included_segments.append(score.segment_id)
                    included_chars += score.char_count
                else:
                    excluded_segments.append(score.segment_id)
                    excluded_chars += score.char_count
        
        total_chars = included_chars + excluded_chars
        reduction_percent = (excluded_chars / max(total_chars, 1)) * 100
        
        # Estimate tokens
        estimated_tokens = included_chars // 4  # ~4 chars per token
        tokens_saved = excluded_chars // 4
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            task_description, focus_level, estimated_tokens, effective_budget
        )
        
        result = FocusedContext(
            focus_level=focus_level,
            task_description=task_description,
            included_segments=included_segments,
            excluded_segments=excluded_segments,
            total_chars=total_chars,
            included_chars=included_chars,
            excluded_chars=excluded_chars,
            reduction_percent=round(reduction_percent, 1),
            estimated_tokens=estimated_tokens,
            token_budget=effective_budget,
            tokens_saved=tokens_saved,
            recommendations=recommendations
        )
        
        # Log optimization
        self._log_optimization(result)
        
        return result
    
    def select_resources(self, task_description: str,
                        task_type: str = None,
                        focus_level: FocusLevel = FocusLevel.STANDARD) -> List[ResourceSelection]:
        """
        Select which resources to load for a task.
        
        Args:
            task_description: Description of task
            task_type: Optional task type for requirement lookup
            focus_level: How focused to be
            
        Returns:
            List of resources to load, ordered by priority
        """
        config = self.FOCUS_CONFIGS[focus_level]
        effective_budget = int(self.token_budget * config['token_budget_percent'])
        
        # Set task context
        self.scorer.set_task_context(task_description)
        
        selections = []
        tokens_used = 0
        load_order = 0
        
        # First, add required resources for task type
        if task_type and task_type in self.TASK_REQUIREMENTS:
            reqs = self.TASK_REQUIREMENTS[task_type]
            
            for resource_id in reqs.get('required', []):
                est_tokens = self.TOKEN_ESTIMATES.get('skill', 500)
                selections.append(ResourceSelection(
                    resource_type='skill',
                    resource_id=resource_id,
                    resource_name=resource_id.replace('prism-', '').replace('-', ' ').title(),
                    relevance_score=1.0,
                    estimated_tokens=est_tokens,
                    load_order=load_order,
                    required=True
                ))
                tokens_used += est_tokens
                load_order += 1
        
        # Score available skills
        skill_scores = []
        for skill in self.resources.get('skills', []):
            skill_name = skill.get('name', skill.get('id', ''))
            
            # Simple keyword scoring
            score = 0.0
            for kw in self.scorer.current_task_keywords:
                if kw in skill_name.lower():
                    score += 0.2
            score = min(1.0, score)
            
            if score >= config['min_score']:
                skill_scores.append((skill, score))
        
        # Sort by score and add within budget
        skill_scores.sort(key=lambda x: x[1], reverse=True)
        
        for skill, score in skill_scores:
            skill_id = skill.get('id', skill.get('name', ''))
            
            # Skip if already required
            if any(s.resource_id == skill_id for s in selections):
                continue
            
            est_tokens = self.TOKEN_ESTIMATES.get('skill', 500)
            
            if tokens_used + est_tokens <= effective_budget:
                if len(selections) < config['max_resources']:
                    selections.append(ResourceSelection(
                        resource_type='skill',
                        resource_id=skill_id,
                        resource_name=skill_id.replace('prism-', '').replace('-', ' ').title(),
                        relevance_score=round(score, 2),
                        estimated_tokens=est_tokens,
                        load_order=load_order,
                        required=False
                    ))
                    tokens_used += est_tokens
                    load_order += 1
        
        return selections
    
    def _generate_recommendations(self, task: str, level: FocusLevel,
                                   tokens_used: int, budget: int) -> List[str]:
        """Generate optimization recommendations."""
        recommendations = []
        
        # Budget status
        usage_percent = (tokens_used / max(budget, 1)) * 100
        
        if usage_percent > 90:
            recommendations.append(f"Context usage at {usage_percent:.0f}% - consider MINIMAL focus")
        elif usage_percent > 70:
            recommendations.append(f"Context usage at {usage_percent:.0f}% - monitor for growth")
        else:
            recommendations.append(f"Context usage healthy at {usage_percent:.0f}%")
        
        # Level-specific
        if level == FocusLevel.FULL:
            recommendations.append("Full context loading - consider FOCUSED for efficiency")
        elif level == FocusLevel.MINIMAL:
            recommendations.append("Minimal context - some features may need manual loading")
        
        # Task-specific
        task_lower = task.lower()
        if 'safety' in task_lower or 'critical' in task_lower:
            recommendations.append("Safety-critical task - ensure prism-safety-framework loaded")
        if 'calculation' in task_lower or 'physics' in task_lower:
            recommendations.append("Calculation task - ensure physics formulas available")
        
        return recommendations
    
    def _log_optimization(self, result: FocusedContext):
        """Log optimization result."""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "focus_level": result.focus_level.value,
            "task": result.task_description[:100],
            "reduction_percent": result.reduction_percent,
            "tokens_saved": result.tokens_saved
        }
        with open(FOCUS_LOG, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry, sort_keys=True) + '\n')
    
    def get_focus_statistics(self) -> Dict[str, Any]:
        """Get focus optimization statistics."""
        if not FOCUS_LOG.exists():
            return {"optimizations": 0}
        
        entries = []
        with open(FOCUS_LOG, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    entries.append(json.loads(line))
                except:
                    pass
        
        if not entries:
            return {"optimizations": 0}
        
        total_saved = sum(e.get('tokens_saved', 0) for e in entries)
        avg_reduction = sum(e.get('reduction_percent', 0) for e in entries) / len(entries)
        
        return {
            "optimizations": len(entries),
            "total_tokens_saved": total_saved,
            "average_reduction_percent": round(avg_reduction, 1),
            "most_common_level": max(set(e.get('focus_level', 'standard') for e in entries),
                                     key=lambda x: sum(1 for e in entries if e.get('focus_level') == x))
        }


def main():
    """CLI for testing."""
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Focus Optimizer")
    parser.add_argument('--task', type=str, required=True, help='Task description')
    parser.add_argument('--level', type=str, default='standard',
                       choices=['minimal', 'focused', 'standard', 'expanded', 'full'],
                       help='Focus level')
    parser.add_argument('--content', type=str, help='Content file to optimize')
    parser.add_argument('--stats', action='store_true', help='Show statistics')
    
    args = parser.parse_args()
    optimizer = FocusOptimizer()
    
    if args.stats:
        stats = optimizer.get_focus_statistics()
        print(json.dumps(stats, indent=2))
        return
    
    level = FocusLevel(args.level)
    content = None
    if args.content:
        content = Path(args.content).read_text(encoding='utf-8')
    
    result = optimizer.optimize_for_task(args.task, level, content)
    print(json.dumps(result.to_dict(), indent=2))


if __name__ == "__main__":
    main()
