"""
Test file to trigger auto-hooks.
This should automatically fire:
- intel_review_cascade (code file >20 lines)
- intel_ast_complexity (Python file)
- intel_entropy_quick (code file)
"""

import os
import sys
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime


@dataclass
class TestClass:
    """Test dataclass for complexity analysis."""
    name: str
    value: int
    timestamp: datetime
    
    def process(self) -> Dict[str, Any]:
        """Process the test data."""
        result = {
            "name": self.name,
            "value": self.value * 2,
            "processed_at": datetime.now().isoformat()
        }
        
        # Add some conditional logic for complexity
        if self.value > 100:
            result["category"] = "high"
        elif self.value > 50:
            result["category"] = "medium"
        else:
            result["category"] = "low"
            
        return result


def calculate_metrics(data: List[TestClass]) -> Dict[str, float]:
    """Calculate metrics from test data."""
    if not data:
        return {"count": 0, "avg": 0.0, "max": 0.0, "min": 0.0}
    
    values = [item.value for item in data]
    return {
        "count": len(values),
        "avg": sum(values) / len(values),
        "max": max(values),
        "min": min(values),
        "total": sum(values)
    }


def main():
    """Main entry point."""
    test_data = [
        TestClass("alpha", 25, datetime.now()),
        TestClass("beta", 75, datetime.now()),
        TestClass("gamma", 150, datetime.now()),
    ]
    
    for item in test_data:
        result = item.process()
        print(f"Processed: {result}")
    
    metrics = calculate_metrics(test_data)
    print(f"Metrics: {metrics}")


if __name__ == "__main__":
    main()
