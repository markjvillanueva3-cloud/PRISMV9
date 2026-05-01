#!/usr/bin/env python3
"""
PRISM Error MCP Tools v1.0
Session 1.3 Deliverables: prism_error_log, prism_error_analyze, prism_error_learn

MCP tools for error learning pipeline.
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
    from error_extractor import ErrorExtractor, ErrorSource, ErrorSeverity
    from pattern_detector import PatternDetector
    from learning_store import LearningStore, LearningType
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent))
    from error_extractor import ErrorExtractor, ErrorSource, ErrorSeverity
    from pattern_detector import PatternDetector
    from learning_store import LearningStore, LearningType

# Paths
PRISM_ROOT = Path("C:/PRISM")
ERROR_PATTERNS = PRISM_ROOT / "state" / "PRISM_ERROR_PATTERNS.json"


class ErrorMCP:
    """MCP tools for error learning pipeline."""
    
    def __init__(self):
        self.extractor = ErrorExtractor()
        self.detector = PatternDetector()
        self.store = LearningStore()
        self._load_patterns()
    
    def _load_patterns(self):
        """Load pre-defined patterns."""
        if ERROR_PATTERNS.exists():
            try:
                self.patterns = json.loads(ERROR_PATTERNS.read_text(encoding='utf-8'))
            except:
                self.patterns = {}
    
    def prism_error_log(self, error_type: str, message: str,
                        tool_name: str = None, context: str = None,
                        severity: str = "MEDIUM", 
                        params: Dict = None) -> Dict[str, Any]:
        """
        Log an error for learning.
        
        Args:
            error_type: Type of error (e.g., "FileNotFoundError", "validation_error")
            message: Error message
            tool_name: Tool that produced the error
            context: Additional context
            severity: CRITICAL, HIGH, MEDIUM, LOW, INFO
            params: Tool parameters that caused error
            
        Returns:
            Dict with error ID and any matching patterns/fixes
        """
        # Map severity
        severity_map = {
            "CRITICAL": ErrorSeverity.CRITICAL,
            "HIGH": ErrorSeverity.HIGH,
            "MEDIUM": ErrorSeverity.MEDIUM,
            "LOW": ErrorSeverity.LOW,
            "INFO": ErrorSeverity.INFO
        }
        sev = severity_map.get(severity.upper(), ErrorSeverity.MEDIUM)
        
        # Extract error
        from error_extractor import ExtractedError
        error = ExtractedError(
            id=self.extractor._generate_id(message),
            timestamp=datetime.now().isoformat(),
            source=ErrorSource.TOOL_RESULT if tool_name else ErrorSource.CONVERSATION,
            severity=sev,
            error_type=error_type,
            message=message,
            context=context or f"Tool: {tool_name}" if tool_name else "Unknown",
            tool_name=tool_name,
            tool_params=params
        )
        
        # Save error
        self.extractor.save_error(error)
        
        # Check for matching patterns
        matches = self._find_matching_patterns(error_type, message)
        
        # Check for learned fixes
        fixes = self.store.lookup(error_type=error_type, min_confidence=0.5)
        
        result = {
            "error_id": error.id,
            "logged": True,
            "severity": severity,
            "matching_patterns": len(matches),
            "learned_fixes_available": len(fixes) > 0
        }
        
        # Add prevention if available
        if matches:
            best_match = matches[0]
            result["pattern_id"] = best_match.get("id")
            result["prevention"] = best_match.get("prevention")
            result["fix"] = best_match.get("fix")
        
        # Add learned fix if available
        if fixes:
            best_fix = fixes[0]
            result["learned_fix"] = {
                "action": best_fix.action,
                "confidence": best_fix.confidence,
                "explanation": best_fix.explanation
            }
        
        return result
    
    def prism_error_analyze(self, since_hours: int = 24,
                            detect_patterns: bool = True) -> Dict[str, Any]:
        """
        Analyze recent errors and detect patterns.
        
        Args:
            since_hours: Analyze errors from last N hours
            detect_patterns: Whether to run pattern detection
            
        Returns:
            Dict with analysis results
        """
        # Get recent errors
        recent = self.extractor.get_recent_errors(count=100)
        
        # Filter by time if needed
        if since_hours:
            cutoff = datetime.now().isoformat()
            # Simple filter - in production would parse timestamps
        
        # Count by type
        by_type = {}
        by_severity = {}
        by_tool = {}
        
        for e in recent:
            # By type
            etype = e.get('error_type', 'unknown')
            by_type[etype] = by_type.get(etype, 0) + 1
            
            # By severity
            sev = e.get('severity', 'MEDIUM')
            by_severity[sev] = by_severity.get(sev, 0) + 1
            
            # By tool
            tool = e.get('tool_name', 'unknown')
            if tool:
                by_tool[tool] = by_tool.get(tool, 0) + 1
        
        result = {
            "analyzed": len(recent),
            "by_type": by_type,
            "by_severity": by_severity,
            "by_tool": by_tool,
            "critical_count": by_severity.get(5, 0) + by_severity.get('CRITICAL', 0),
            "high_count": by_severity.get(4, 0) + by_severity.get('HIGH', 0)
        }
        
        # Run pattern detection if requested
        if detect_patterns and recent:
            patterns = self.detector.detect_all_patterns(recent)
            result["patterns_detected"] = len(patterns)
            result["pattern_summary"] = [
                {
                    "id": p.id,
                    "type": p.pattern_type.value,
                    "description": p.description[:100],
                    "confidence": p.confidence.name
                }
                for p in patterns[:5]
            ]
        
        # Add recommendations
        result["recommendations"] = self._generate_recommendations(by_type, by_tool)
        
        return result
    
    def prism_error_learn(self, error_type: str, trigger: str,
                          action: str, explanation: str,
                          learning_type: str = "fix",
                          tools: List[str] = None) -> Dict[str, Any]:
        """
        Learn from an error - add prevention or fix.
        
        Args:
            error_type: Type of error this applies to
            trigger: What triggers this (error message pattern)
            action: What to do when triggered
            explanation: Why this works
            learning_type: "fix", "prevention", "workaround"
            tools: List of applicable tools
            
        Returns:
            Dict with learning result
        """
        # Map learning type
        type_map = {
            "fix": LearningType.FIX,
            "prevention": LearningType.PREVENTION,
            "workaround": LearningType.WORKAROUND,
            "context": LearningType.CONTEXT,
            "root_cause": LearningType.ROOT_CAUSE
        }
        ltype = type_map.get(learning_type.lower(), LearningType.FIX)
        
        # Store learning
        knowledge = self.store.learn(
            error_type=error_type,
            trigger=trigger,
            action=action,
            explanation=explanation,
            learning_type=ltype,
            tools=tools,
            source="user"
        )
        
        return {
            "knowledge_id": knowledge.id,
            "learning_type": ltype.value,
            "stored": True,
            "confidence": knowledge.confidence,
            "status": knowledge.status.value,
            "message": f"Learned {ltype.value} for '{error_type}'"
        }
    
    def _find_matching_patterns(self, error_type: str, message: str) -> List[Dict]:
        """Find patterns matching the error."""
        import re
        
        matches = []
        for pattern in self.patterns.get('patterns', []):
            trigger = pattern.get('trigger', '')
            try:
                if re.search(trigger, f"{error_type} {message}", re.IGNORECASE):
                    matches.append(pattern)
            except:
                if trigger.lower() in f"{error_type} {message}".lower():
                    matches.append(pattern)
        
        # Sort by confidence
        matches.sort(key=lambda p: p.get('confidence', 0), reverse=True)
        return matches
    
    def _generate_recommendations(self, by_type: Dict, by_tool: Dict) -> List[str]:
        """Generate recommendations based on error analysis."""
        recommendations = []
        
        # Most common error type
        if by_type:
            most_common = max(by_type.items(), key=lambda x: x[1])
            if most_common[1] >= 3:
                recommendations.append(
                    f"Address frequent '{most_common[0]}' errors ({most_common[1]} occurrences)"
                )
        
        # Problematic tool
        if by_tool:
            worst_tool = max(by_tool.items(), key=lambda x: x[1])
            if worst_tool[1] >= 3:
                recommendations.append(
                    f"Review usage of '{worst_tool[0]}' tool ({worst_tool[1]} errors)"
                )
        
        # General recommendations
        if not recommendations:
            recommendations.append("No significant patterns detected. Continue monitoring.")
        
        return recommendations
    
    def validate_learning(self, knowledge_id: str, success: bool,
                          context: str = None) -> Dict[str, Any]:
        """Validate that a learned fix worked."""
        self.store.validate(knowledge_id, success, context)
        
        knowledge = self.store.knowledge.get(knowledge_id)
        if knowledge:
            return {
                "validated": True,
                "success": success,
                "new_confidence": knowledge.confidence,
                "status": knowledge.status.value
            }
        return {"validated": False, "error": "Knowledge not found"}
    
    def call(self, tool_name: str, params: Dict = None) -> Any:
        """Generic call interface for MCP integration."""
        params = params or {}
        
        if tool_name == "prism_error_log":
            return self.prism_error_log(**params)
        elif tool_name == "prism_error_analyze":
            return self.prism_error_analyze(**params)
        elif tool_name == "prism_error_learn":
            return self.prism_error_learn(**params)
        else:
            return {"error": f"Unknown tool: {tool_name}"}


def main():
    """CLI for testing."""
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Error MCP Tools")
    parser.add_argument('--log', nargs=2, metavar=('TYPE', 'MESSAGE'), help='Log error')
    parser.add_argument('--analyze', action='store_true', help='Analyze errors')
    parser.add_argument('--learn', nargs=4, metavar=('TYPE', 'TRIGGER', 'ACTION', 'EXPLAIN'),
                       help='Learn from error')
    
    args = parser.parse_args()
    mcp = ErrorMCP()
    
    if args.log:
        result = mcp.prism_error_log(args.log[0], args.log[1])
        print(json.dumps(result, indent=2))
    
    elif args.analyze:
        result = mcp.prism_error_analyze()
        print(json.dumps(result, indent=2))
    
    elif args.learn:
        result = mcp.prism_error_learn(*args.learn)
        print(json.dumps(result, indent=2))
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
