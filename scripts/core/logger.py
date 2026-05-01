# PRISM Automation Toolkit - Logging System
# Version: 1.0.0
# Created: 2026-01-23

import logging
import sys
from datetime import datetime
from pathlib import Path

# Logger instances cache
_loggers = {}

def setup_logger(name: str, log_file: str = None, level: str = 'INFO') -> logging.Logger:
    """
    Set up a logger with console and optional file output.
    
    Args:
        name: Logger name (usually module name)
        log_file: Optional log file path
        level: Logging level (DEBUG, INFO, WARNING, ERROR)
    
    Returns:
        Configured logger instance
    """
    if name in _loggers:
        return _loggers[name]
    
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper()))
    
    # Prevent duplicate handlers
    if logger.handlers:
        return logger
    
    # Console handler with color support
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_format = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(message)s',
        datefmt='%H:%M:%S'
    )
    console_handler.setFormatter(console_format)
    logger.addHandler(console_handler)
    
    # File handler if specified
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        file_handler = logging.FileHandler(log_path, encoding='utf-8')
        file_handler.setLevel(logging.DEBUG)
        file_format = logging.Formatter(
            '%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(file_format)
        logger.addHandler(file_handler)
    
    _loggers[name] = logger
    return logger


def get_logger(name: str) -> logging.Logger:
    """Get an existing logger or create a basic one."""
    if name in _loggers:
        return _loggers[name]
    return setup_logger(name)


class ValidationLogger:
    """
    Specialized logger for validation operations.
    Tracks pass/fail/warning counts and generates summary.
    """
    
    def __init__(self, name: str, log_file: str = None):
        self.logger = setup_logger(name, log_file)
        self.stats = {
            'passed': 0,
            'failed': 0,
            'warnings': 0,
            'skipped': 0,
            'total': 0
        }
        self.errors = []
        self.warnings_list = []
        self.start_time = datetime.now()
    
    def passed(self, message: str):
        """Log a passed check."""
        self.stats['passed'] += 1
        self.stats['total'] += 1
        self.logger.info(f"✓ PASS: {message}")
    
    def failed(self, message: str, details: str = None):
        """Log a failed check."""
        self.stats['failed'] += 1
        self.stats['total'] += 1
        self.errors.append({'message': message, 'details': details})
        self.logger.error(f"✗ FAIL: {message}")
        if details:
            self.logger.error(f"  └─ {details}")
    
    def warning(self, message: str, details: str = None):
        """Log a warning."""
        self.stats['warnings'] += 1
        self.warnings_list.append({'message': message, 'details': details})
        self.logger.warning(f"⚠ WARN: {message}")
        if details:
            self.logger.warning(f"  └─ {details}")
    
    def info(self, message: str):
        """Log info message."""
        self.logger.info(f"ℹ {message}")
    
    def skipped(self, message: str):
        """Log a skipped check."""
        self.stats['skipped'] += 1
        self.logger.info(f"○ SKIP: {message}")
    
    def section(self, title: str):
        """Start a new section in the log."""
        self.logger.info("")
        self.logger.info("=" * 60)
        self.logger.info(f"  {title}")
        self.logger.info("=" * 60)
    
    def subsection(self, title: str):
        """Start a subsection."""
        self.logger.info("")
        self.logger.info(f"--- {title} ---")
    
    def summary(self) -> dict:
        """Generate and log summary."""
        elapsed = datetime.now() - self.start_time
        
        self.logger.info("")
        self.logger.info("=" * 60)
        self.logger.info("  VALIDATION SUMMARY")
        self.logger.info("=" * 60)
        self.logger.info(f"  Total Checks:  {self.stats['total']}")
        self.logger.info(f"  Passed:        {self.stats['passed']} ✓")
        self.logger.info(f"  Failed:        {self.stats['failed']} ✗")
        self.logger.info(f"  Warnings:      {self.stats['warnings']} ⚠")
        self.logger.info(f"  Skipped:       {self.stats['skipped']} ○")
        self.logger.info(f"  Duration:      {elapsed.total_seconds():.2f}s")
        
        if self.stats['total'] > 0:
            pass_rate = (self.stats['passed'] / self.stats['total']) * 100
            self.logger.info(f"  Pass Rate:     {pass_rate:.1f}%")
        
        overall = "PASS" if self.stats['failed'] == 0 else "FAIL"
        self.logger.info("")
        self.logger.info(f"  OVERALL: {overall}")
        self.logger.info("=" * 60)
        
        return {
            'stats': self.stats,
            'errors': self.errors,
            'warnings': self.warnings_list,
            'elapsed_seconds': elapsed.total_seconds(),
            'overall': overall
        }


class ProgressLogger:
    """
    Logger for tracking progress of batch operations.
    """
    
    def __init__(self, name: str, total: int):
        self.logger = get_logger(name)
        self.total = total
        self.current = 0
        self.start_time = datetime.now()
    
    def update(self, item_name: str = None):
        """Update progress."""
        self.current += 1
        pct = (self.current / self.total) * 100
        
        elapsed = (datetime.now() - self.start_time).total_seconds()
        if self.current > 0:
            eta = (elapsed / self.current) * (self.total - self.current)
        else:
            eta = 0
        
        msg = f"[{self.current}/{self.total}] {pct:.1f}%"
        if item_name:
            msg += f" - {item_name}"
        if eta > 0:
            msg += f" (ETA: {eta:.0f}s)"
        
        self.logger.info(msg)
    
    def complete(self):
        """Mark as complete."""
        elapsed = (datetime.now() - self.start_time).total_seconds()
        self.logger.info(f"Completed {self.total} items in {elapsed:.2f}s")
