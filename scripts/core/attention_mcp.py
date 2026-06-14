#!/usr/bin/env python3
"""
PRISM Attention MCP Tools v1.0
Session 1.4 Deliverables: prism_attention_focus, prism_relevance_score

MCP tools for attention focus optimization.
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
from typing import Dict, Any, Optional, List

# Import components
try:
    from attention_scorer import AttentionScorer, ContentCategory
    from focus_optimizer import FocusOptimizer, FocusLevel, FocusedContext
    from relevance_filter import RelevanceFilter, FilterMode
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent))
    from attention_scorer import AttentionScorer, ContentCategory
    from focus_optimizer import FocusOptimizer, FocusLevel, FocusedContext
    from relevance_filter import RelevanceFilter, FilterMode

# Paths
PRISM_ROOT = Path("C:/PRISM")


class AttentionMCP:
    """MCP tools for attention focus optimization."""
    
    def __init__(self, token_budget: int = 50000):
        self.scorer = AttentionScorer()
        self.optimizer = FocusOptimizer(token_budget)
        self.filter = RelevanceFilter()
    
    def prism_attention_focus(self, task: str, content: str = None,
                               focus_level: str = "standard",
                               task_type: str = None,
                               keywords: List[str] = None) -> Dict[str, Any]:
        """
        Optimize attention focus for a task.
        
        Args:
            task: Description of current task
            content: Optional content to optimize/filter
            focus_level: minimal, focused, standard, expanded, full
            task_type: Optional task type for resource selection
                       (cutting_calculation, post_processor, error_handling,
                        session_management, material_lookup, code_generation)
            keywords: Optional explicit keywords for matching
            
        Returns:
            Dict with focus optimization results:
            - focus_level: Applied focus level
            - task: Task description used
            - content_analysis: If content provided, filtering results
            - resources: Recommended resources to load
            - token_budget: Effective token budget
            - recommendations: Optimization recommendations
        """
        # Map focus level
        try:
            level = FocusLevel(focus_level.lower())
        except ValueError:
            level = FocusLevel.STANDARD
        
        # Set task context
        self.scorer.set_task_context(task, keywords)
        self.filter.set_task_context(task, keywords)
        
        result = {
            "focus_level": level.value,
            "task": task[:100],
            "keywords_detected": len(self.scorer.current_task_keywords),
            "token_budget": self.optimizer.token_budget
        }
        
        # Analyze content if provided
        if content:
            # Get focus optimization
            focus_result = self.optimizer.optimize_for_task(task, level, content)
            
            result["content_analysis"] = {
                "total_chars": focus_result.total_chars,
                "included_chars": focus_result.included_chars,
                "excluded_chars": focus_result.excluded_chars,
                "reduction_percent": focus_result.reduction_percent,
                "estimated_tokens": focus_result.estimated_tokens,
                "tokens_saved": focus_result.tokens_saved,
                "included_segments": len(focus_result.included_segments),
                "excluded_segments": len(focus_result.excluded_segments)
            }
            
            # Apply filter to get actual filtered content
            filter_mode = {
                FocusLevel.MINIMAL: FilterMode.STRICT,
                FocusLevel.FOCUSED: FilterMode.BALANCED,
                FocusLevel.STANDARD: FilterMode.BALANCED,
                FocusLevel.EXPANDED: FilterMode.PERMISSIVE,
                FocusLevel.FULL: FilterMode.PERMISSIVE
            }.get(level, FilterMode.BALANCED)
            
            filter_result = self.filter.filter_content(content, filter_mode)
            result["filtered_content"] = filter_result.filtered_content
            result["filter_ratio"] = filter_result.filter_ratio
        
        # Get resource recommendations
        resources = self.optimizer.select_resources(task, task_type, level)
        result["recommended_resources"] = [
            {
                "id": r.resource_id,
                "name": r.resource_name,
                "relevance": r.relevance_score,
                "required": r.required,
                "tokens": r.estimated_tokens
            }
            for r in resources[:10]
        ]
        
        # Add recommendations
        result["recommendations"] = [
            f"Focus level: {level.value} - " + {
                FocusLevel.MINIMAL: "Only essential content loaded",
                FocusLevel.FOCUSED: "Task-focused content prioritized",
                FocusLevel.STANDARD: "Balanced relevance filtering",
                FocusLevel.EXPANDED: "Extended context available",
                FocusLevel.FULL: "All context loaded"
            }.get(level, "Standard filtering")
        ]
        
        if task_type:
            result["recommendations"].append(f"Task type '{task_type}' recognized")
        
        if resources:
            required_count = sum(1 for r in resources if r.required)
            result["recommendations"].append(
                f"{len(resources)} resources recommended ({required_count} required)"
            )
        
        return result
    
    def prism_relevance_score(self, content: str, task: str = None,
                               keywords: List[str] = None,
                               segment_size: int = 50,
                               min_score: float = 0.0) -> Dict[str, Any]:
        """
        Score content segments for relevance.
        
        Args:
            content: Content to score
            task: Optional task description for context
            keywords: Optional explicit keywords
            segment_size: Lines per segment (default 50)
            min_score: Minimum score to include in results (0-1)
            
        Returns:
            Dict with scoring results:
            - total_segments: Number of segments scored
            - segments: List of scored segments with details
            - summary: Category and score distribution
            - recommendations: Based on score distribution
        """
        # Set context if provided
        if task or keywords:
            self.scorer.set_task_context(task or "", keywords)
        
        # Score content
        scores = self.scorer.score_content(content, segment_size)
        
        # Filter by minimum score
        filtered_scores = [s for s in scores if s.attention_score >= min_score]
        
        # Build segment details
        segments = []
        for s in filtered_scores[:20]:  # Limit to 20 for response size
            segments.append({
                "id": s.segment_id,
                "category": s.category.value,
                "attention_score": s.attention_score,
                "keyword_score": s.keyword_score,
                "semantic_score": s.semantic_score,
                "recency_score": s.recency_score,
                "preview": s.content_preview[:80],
                "lines": f"{s.line_start}-{s.line_end}",
                "chars": s.char_count
            })
        
        # Get summary
        summary = self.scorer.get_summary(scores)
        
        # Generate recommendations
        recommendations = []
        
        if summary.get('high_attention', 0) < len(scores) * 0.2:
            recommendations.append("Low relevance content - consider setting clearer task context")
        
        if summary.get('low_attention', 0) > len(scores) * 0.5:
            recommendations.append("Majority is low-relevance - use STRICT filter mode")
        
        by_category = summary.get('by_category', {})
        if by_category.get('boilerplate', 0) > len(scores) * 0.3:
            recommendations.append("High boilerplate ratio - remove unnecessary formatting")
        
        if by_category.get('task_direct', 0) == 0:
            recommendations.append("No task-direct content found - task context may not match content")
        
        return {
            "total_segments": len(scores),
            "segments_above_threshold": len(filtered_scores),
            "segments": segments,
            "summary": {
                "by_category": by_category,
                "average_score": summary.get('average_score', 0),
                "high_attention_count": summary.get('high_attention', 0),
                "low_attention_count": summary.get('low_attention', 0),
                "total_chars": summary.get('total_chars', 0)
            },
            "recommendations": recommendations if recommendations else ["Content relevance distribution is healthy"]
        }
    
    def call(self, tool_name: str, params: Dict = None) -> Any:
        """Generic call interface for MCP integration."""
        params = params or {}
        
        if tool_name == "prism_attention_focus":
            return self.prism_attention_focus(**params)
        elif tool_name == "prism_relevance_score":
            return self.prism_relevance_score(**params)
        else:
            return {"error": f"Unknown tool: {tool_name}"}


def main():
    """CLI for testing."""
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Attention MCP Tools")
    parser.add_argument('--focus', type=str, help='Task for attention focus')
    parser.add_argument('--score', type=str, help='File to score')
    parser.add_argument('--level', type=str, default='standard', help='Focus level')
    parser.add_argument('--task-type', type=str, help='Task type')
    
    args = parser.parse_args()
    mcp = AttentionMCP()
    
    if args.focus:
        content = None
        if args.score:
            content = Path(args.score).read_text(encoding='utf-8')
        
        result = mcp.prism_attention_focus(
            task=args.focus,
            content=content,
            focus_level=args.level,
            task_type=args.task_type
        )
        print(json.dumps(result, indent=2))
    
    elif args.score:
        content = Path(args.score).read_text(encoding='utf-8')
        result = mcp.prism_relevance_score(content)
        print(json.dumps(result, indent=2))
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
