#!/usr/bin/env python3
"""
PRISM Error Extractor v1.0
Session 1.3 Deliverable: Extract errors from all sources.

Extracts errors from:
- Tool call results (Desktop Commander, MCP tools, etc.)
- Python exceptions and tracebacks
- Log files and JSONL entries
- Conversation context
- CNC alarm codes and machine errors
"""
import sys
if __name__ == "__main__":
    import io
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    except:
        pass

import re
import json
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum

# Paths
PRISM_ROOT = Path("C:/PRISM")
ERROR_LOG = PRISM_ROOT / "state" / "ERROR_LOG.jsonl"
EXTRACTED_ERRORS = PRISM_ROOT / "state" / "EXTRACTED_ERRORS.jsonl"

class ErrorSource(Enum):
    """Sources of errors."""
    TOOL_RESULT = "tool_result"
    PYTHON_EXCEPTION = "python_exception"
    LOG_FILE = "log_file"
    CONVERSATION = "conversation"
    CNC_ALARM = "cnc_alarm"
    VALIDATION = "validation"
    SAFETY = "safety"
    USER_FEEDBACK = "user_feedback"

class ErrorSeverity(Enum):
    """Error severity levels."""
    CRITICAL = 5    # Safety violation, data loss risk
    HIGH = 4        # Blocks progress, requires immediate fix
    MEDIUM = 3      # Degrades quality, needs attention
    LOW = 2         # Minor issue, can continue
    INFO = 1        # Informational, for learning

@dataclass
class ExtractedError:
    """An extracted error with full context."""
    id: str
    timestamp: str
    source: ErrorSource
    severity: ErrorSeverity
    error_type: str
    message: str
    context: str
    tool_name: Optional[str] = None
    tool_params: Optional[Dict] = None
    stack_trace: Optional[str] = None
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    raw_content: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        d = asdict(self)
        d['source'] = self.source.value
        d['severity'] = self.severity.value
        return d

class ErrorExtractor:
    """Extract errors from multiple sources."""
    
    # Patterns for detecting errors in text
    ERROR_PATTERNS = [
        # Python exceptions
        (r'Traceback \(most recent call last\):', 'python_traceback'),
        (r'(\w+Error): (.+)', 'python_error'),
        (r'(\w+Exception): (.+)', 'python_exception'),
        
        # Tool errors
        (r'error["\']?\s*:\s*["\']?(.+?)["\']?[,}]', 'json_error'),
        (r'Error:\s*(.+)', 'generic_error'),
        (r'failed|failure|unable to|cannot|could not', 'failure_indicator'),
        
        # CNC/Manufacturing errors
        (r'ALARM\s*[:=]?\s*(\d+)', 'cnc_alarm'),
        (r'E[-_]?(\d{3,4})', 'error_code'),
        (r'collision|crash|overload|overheat', 'safety_keyword'),
        
        # Validation errors
        (r'S\(x\)\s*[<>=]\s*([\d.]+).*(?:BLOCK|FAIL)', 'safety_violation'),
        (r'validation\s+failed|invalid|rejected', 'validation_error'),
    ]
    
    def __init__(self):
        self._ensure_paths()
        self.extracted_count = 0
    
    def _ensure_paths(self):
        """Ensure required directories exist."""
        ERROR_LOG.parent.mkdir(parents=True, exist_ok=True)
    
    def _generate_id(self, content: str) -> str:
        """Generate unique error ID."""
        hash_part = hashlib.md5(content.encode()).hexdigest()[:8]
        return f"ERR-{datetime.now().strftime('%Y%m%d%H%M%S')}-{hash_part}"
    
    def extract_from_tool_result(self, tool_name: str, result: Any, 
                                  params: Dict = None) -> List[ExtractedError]:
        """Extract errors from tool call result."""
        errors = []
        
        # Convert to string for pattern matching
        if isinstance(result, dict):
            result_str = json.dumps(result, indent=2)
            
            # Check for explicit error field
            if 'error' in result:
                error = ExtractedError(
                    id=self._generate_id(str(result['error'])),
                    timestamp=datetime.now().isoformat(),
                    source=ErrorSource.TOOL_RESULT,
                    severity=self._classify_severity(str(result['error'])),
                    error_type="tool_error",
                    message=str(result['error']),
                    context=f"Tool: {tool_name}",
                    tool_name=tool_name,
                    tool_params=params,
                    raw_content=result_str[:500]
                )
                errors.append(error)
        else:
            result_str = str(result)
        
        # Scan for error patterns
        for pattern, error_type in self.ERROR_PATTERNS:
            matches = re.finditer(pattern, result_str, re.IGNORECASE)
            for match in matches:
                if error_type == 'failure_indicator':
                    # Get surrounding context
                    start = max(0, match.start() - 50)
                    end = min(len(result_str), match.end() + 100)
                    context = result_str[start:end]
                else:
                    context = match.group(0)
                
                error = ExtractedError(
                    id=self._generate_id(context),
                    timestamp=datetime.now().isoformat(),
                    source=ErrorSource.TOOL_RESULT,
                    severity=self._classify_severity(context),
                    error_type=error_type,
                    message=match.group(0)[:200],
                    context=f"Tool: {tool_name}, Pattern: {error_type}",
                    tool_name=tool_name,
                    tool_params=params,
                    raw_content=context[:500],
                    tags=[error_type, tool_name]
                )
                errors.append(error)
        
        return errors
    
    def extract_from_exception(self, exc: Exception, 
                               context: str = None) -> ExtractedError:
        """Extract error from Python exception."""
        import traceback
        
        stack = traceback.format_exc()
        
        # Extract file and line info
        file_path = None
        line_number = None
        tb_match = re.search(r'File "([^"]+)", line (\d+)', stack)
        if tb_match:
            file_path = tb_match.group(1)
            line_number = int(tb_match.group(2))
        
        return ExtractedError(
            id=self._generate_id(str(exc)),
            timestamp=datetime.now().isoformat(),
            source=ErrorSource.PYTHON_EXCEPTION,
            severity=ErrorSeverity.HIGH,
            error_type=type(exc).__name__,
            message=str(exc),
            context=context or "Python exception",
            stack_trace=stack,
            file_path=file_path,
            line_number=line_number,
            tags=[type(exc).__name__, 'exception']
        )
    
    def extract_from_log(self, log_path: Path, 
                         since: datetime = None) -> List[ExtractedError]:
        """Extract errors from log file."""
        errors = []
        
        if not log_path.exists():
            return errors
        
        with open(log_path, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                
                # Try parsing as JSON
                try:
                    entry = json.loads(line)
                    timestamp = entry.get('timestamp', '')
                    
                    # Check if after 'since' filter
                    if since and timestamp:
                        entry_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                        if entry_time < since:
                            continue
                    
                    # Check for error indicators
                    if entry.get('type') in ['ERROR', 'CRITICAL', 'FAILURE']:
                        error = ExtractedError(
                            id=self._generate_id(line),
                            timestamp=timestamp or datetime.now().isoformat(),
                            source=ErrorSource.LOG_FILE,
                            severity=self._map_log_severity(entry.get('type')),
                            error_type=entry.get('type', 'log_error'),
                            message=entry.get('message', line)[:200],
                            context=f"Log: {log_path.name}, Line: {line_num}",
                            file_path=str(log_path),
                            line_number=line_num,
                            raw_content=line[:500],
                            tags=['log', log_path.stem]
                        )
                        errors.append(error)
                except json.JSONDecodeError:
                    # Plain text - scan for patterns
                    for pattern, error_type in self.ERROR_PATTERNS:
                        if re.search(pattern, line, re.IGNORECASE):
                            error = ExtractedError(
                                id=self._generate_id(line),
                                timestamp=datetime.now().isoformat(),
                                source=ErrorSource.LOG_FILE,
                                severity=self._classify_severity(line),
                                error_type=error_type,
                                message=line[:200],
                                context=f"Log: {log_path.name}, Line: {line_num}",
                                file_path=str(log_path),
                                line_number=line_num,
                                raw_content=line[:500],
                                tags=['log', error_type]
                            )
                            errors.append(error)
                            break
        
        return errors
    
    def extract_from_text(self, text: str, source_name: str = "text") -> List[ExtractedError]:
        """Extract errors from arbitrary text."""
        errors = []
        lines = text.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            for pattern, error_type in self.ERROR_PATTERNS:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    error = ExtractedError(
                        id=self._generate_id(line),
                        timestamp=datetime.now().isoformat(),
                        source=ErrorSource.CONVERSATION,
                        severity=self._classify_severity(line),
                        error_type=error_type,
                        message=match.group(0)[:200],
                        context=f"Source: {source_name}, Line: {line_num}",
                        line_number=line_num,
                        raw_content=line[:500],
                        tags=[error_type, source_name]
                    )
                    errors.append(error)
        
        return errors
    
    def extract_cnc_alarm(self, alarm_code: str, controller: str = None,
                          description: str = None) -> ExtractedError:
        """Extract CNC alarm as error."""
        return ExtractedError(
            id=self._generate_id(f"CNC-{alarm_code}"),
            timestamp=datetime.now().isoformat(),
            source=ErrorSource.CNC_ALARM,
            severity=ErrorSeverity.HIGH,
            error_type="cnc_alarm",
            message=f"Alarm {alarm_code}: {description or 'Unknown'}",
            context=f"Controller: {controller or 'Unknown'}",
            tags=['cnc', 'alarm', alarm_code, controller or 'unknown']
        )
    
    def _classify_severity(self, content: str) -> ErrorSeverity:
        """Classify error severity from content."""
        content_lower = content.lower()
        
        # Critical indicators
        if any(word in content_lower for word in ['collision', 'crash', 'data loss', 'safety', 'blocked']):
            return ErrorSeverity.CRITICAL
        
        # High indicators
        if any(word in content_lower for word in ['exception', 'traceback', 'failed', 'alarm']):
            return ErrorSeverity.HIGH
        
        # Medium indicators
        if any(word in content_lower for word in ['error', 'invalid', 'warning']):
            return ErrorSeverity.MEDIUM
        
        # Low indicators
        if any(word in content_lower for word in ['notice', 'info', 'minor']):
            return ErrorSeverity.LOW
        
        return ErrorSeverity.MEDIUM
    
    def _map_log_severity(self, log_level: str) -> ErrorSeverity:
        """Map log level to severity."""
        mapping = {
            'CRITICAL': ErrorSeverity.CRITICAL,
            'ERROR': ErrorSeverity.HIGH,
            'WARNING': ErrorSeverity.MEDIUM,
            'INFO': ErrorSeverity.LOW,
            'DEBUG': ErrorSeverity.INFO
        }
        return mapping.get(log_level, ErrorSeverity.MEDIUM)
    
    def save_error(self, error: ExtractedError):
        """Save extracted error to log."""
        with open(EXTRACTED_ERRORS, 'a', encoding='utf-8') as f:
            f.write(json.dumps(error.to_dict(), sort_keys=True) + '\n')
        self.extracted_count += 1
    
    def save_errors(self, errors: List[ExtractedError]):
        """Save multiple extracted errors."""
        for error in errors:
            self.save_error(error)
    
    def get_recent_errors(self, count: int = 20) -> List[Dict]:
        """Get most recent extracted errors."""
        if not EXTRACTED_ERRORS.exists():
            return []
        
        errors = []
        with open(EXTRACTED_ERRORS, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    errors.append(json.loads(line))
                except:
                    pass
        
        return errors[-count:]


def main():
    """CLI for testing error extractor."""
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Error Extractor")
    parser.add_argument('--log', type=str, help='Extract from log file')
    parser.add_argument('--text', type=str, help='Extract from text')
    parser.add_argument('--recent', type=int, default=10, help='Show recent errors')
    
    args = parser.parse_args()
    extractor = ErrorExtractor()
    
    if args.log:
        errors = extractor.extract_from_log(Path(args.log))
        print(f"Extracted {len(errors)} errors from {args.log}")
        for e in errors[:5]:
            print(f"  [{e.severity.name}] {e.error_type}: {e.message[:50]}...")
    
    elif args.text:
        errors = extractor.extract_from_text(args.text)
        print(f"Extracted {len(errors)} errors")
        for e in errors:
            print(f"  [{e.severity.name}] {e.error_type}: {e.message[:50]}...")
    
    else:
        # Demo
        demo_text = """
        Error: File not found
        Traceback (most recent call last):
          File "test.py", line 42
        ValueError: Invalid input
        ALARM: 1234 - Spindle overload
        S(x) = 0.45 - BLOCKED
        """
        errors = extractor.extract_from_text(demo_text, "demo")
        print(f"\nExtracted {len(errors)} errors from demo:")
        for e in errors:
            print(f"  [{e.severity.name}] {e.error_type}: {e.message}")


if __name__ == "__main__":
    main()
