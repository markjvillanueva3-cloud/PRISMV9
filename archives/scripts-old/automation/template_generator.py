"""
PRISM Template Generator v1.0
=============================
Auto-generate templates for common PRISM artifacts:
- Skills
- Modules
- Databases
- Session logs
- Tests

Usage:
    py -3 C:\PRISM\scripts\automation\template_generator.py skill my-new-skill
    py -3 C:\PRISM\scripts\automation\template_generator.py module MyModule
    py -3 C:\PRISM\scripts\automation\template_generator.py database materials
    py -3 C:\PRISM\scripts\automation\template_generator.py test MyModule
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional

# Paths
PRISM_ROOT = Path(r"C:\PRISM")
SKILLS_PATH = PRISM_ROOT / "skills"
EXTRACTED_PATH = PRISM_ROOT / "extracted"
TEMPLATES_PATH = PRISM_ROOT / "scripts" / "automation" / "templates"

# ============================================================================
# SKILL TEMPLATE
# ============================================================================

SKILL_TEMPLATE = '''# {name}
## {description}
## Level {level} {category} Skill | Triggers: {triggers}

---

# 1. OVERVIEW

## 1.1 Purpose

{purpose}

## 1.2 When to Use

- Trigger 1
- Trigger 2
- Trigger 3

---

# 2. CORE CONCEPTS

## 2.1 Key Principles

1. **Principle 1**: Description
2. **Principle 2**: Description
3. **Principle 3**: Description

## 2.2 Related Skills

| Skill | Relationship |
|-------|--------------|
| skill-1 | Depends on |
| skill-2 | Complements |

---

# 3. PROCEDURES

## 3.1 Procedure Name

```
Step 1: Action
Step 2: Action
Step 3: Action
```

## 3.2 Best Practices

```
DO:
âœ“ Best practice 1
âœ“ Best practice 2

DON'T:
âœ— Anti-pattern 1
âœ— Anti-pattern 2
```

---

# 4. EXAMPLES

## 4.1 Example 1

```
Input: ...
Process: ...
Output: ...
```

---

# 5. SKILL METADATA

```yaml
skill_id: {skill_id}
version: 1.0.0
level: {level}
category: {category}
priority: {priority}

triggers:
  keywords:
    - "keyword1"
    - "keyword2"
  
  contexts:
    - Context 1
    - Context 2

activation_rule: |
  IF (condition)
  THEN activate {skill_id}
```

---

*Part of PRISM Manufacturing Intelligence v9.0*
*Created: {date}*
'''


# ============================================================================
# MODULE TEMPLATE
# ============================================================================

MODULE_TEMPLATE = '''/**
 * PRISM {module_name} Module
 * ==========================
 * {description}
 * 
 * @module {module_name}
 * @version 1.0.0
 * @author PRISM System
 * @created {date}
 * 
 * Dependencies:
 *   - PRISM_CORE
 *   - PRISM_CONSTANTS
 * 
 * Consumers:
 *   1. Consumer 1
 *   2. Consumer 2
 *   3. Consumer 3 (minimum 6 required)
 */

// ============================================================================
// IMPORTS
// ============================================================================

// import {{ PRISM_CORE }} from './PRISM_CORE.js';
// import {{ PRISM_CONSTANTS }} from './PRISM_CONSTANTS.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const MODULE_ID = '{module_id}';
const MODULE_VERSION = '1.0.0';

// ============================================================================
// TYPES (JSDoc for now, TypeScript in Stage 3+)
// ============================================================================

/**
 * @typedef {{{type_name}Config}} {type_name}Config
 * @property {{string}} id - Unique identifier
 * @property {{string}} name - Display name
 */

// ============================================================================
// MAIN CLASS
// ============================================================================

/**
 * {module_name} - {description}
 */
class {class_name} {{
    /**
     * Create a new {class_name} instance
     * @param {{Object}} config - Configuration options
     */
    constructor(config = {{}}) {{
        this.id = config.id || MODULE_ID;
        this.version = MODULE_VERSION;
        this.initialized = false;
    }}

    /**
     * Initialize the module
     * @returns {{Promise<boolean>}} Success status
     */
    async initialize() {{
        if (this.initialized) {{
            return true;
        }}
        
        try {{
            // Initialization logic here
            this.initialized = true;
            return true;
        }} catch (error) {{
            console.error(`[${{MODULE_ID}}] Initialization failed:`, error);
            return false;
        }}
    }}

    /**
     * Main processing method
     * @param {{Object}} input - Input data
     * @returns {{Object}} Processed result
     */
    process(input) {{
        if (!this.initialized) {{
            throw new Error(`${{MODULE_ID}} not initialized`);
        }}
        
        // Processing logic here
        return {{
            success: true,
            data: input
        }};
    }}

    /**
     * Validate input data
     * @param {{Object}} input - Data to validate
     * @returns {{boolean}} Validation result
     */
    validate(input) {{
        if (!input) return false;
        // Add validation logic
        return true;
    }}
}}

// ============================================================================
// EXPORTS
// ============================================================================

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {{
    module.exports = {{ {class_name}, MODULE_ID, MODULE_VERSION }};
}}

// ES6 export
export {{ {class_name}, MODULE_ID, MODULE_VERSION }};
export default {class_name};
'''


# ============================================================================
# DATABASE TEMPLATE
# ============================================================================

DATABASE_TEMPLATE = '''{
  "metadata": {
    "database_id": "{db_id}",
    "name": "{name}",
    "version": "1.0.0",
    "created": "{date}",
    "lastModified": "{date}",
    "description": "{description}",
    "schema_version": "1.0",
    "record_count": 0
  },
  "schema": {
    "required_fields": [
      "{id_field}",
      "name"
    ],
    "optional_fields": [],
    "field_types": {
      "{id_field}": "string",
      "name": "string"
    }
  },
  "records": []
}
'''


# ============================================================================
# TEST TEMPLATE
# ============================================================================

TEST_TEMPLATE = '''"""
PRISM {module_name} Tests
=========================
Unit tests for {module_name} module.

Run with:
    py -3 -m pytest {test_file} -v
    py -3 {test_file}
"""

import unittest
import json
from pathlib import Path

# Import module under test (adjust path as needed)
# from prism.modules.{module_lower} import {module_name}


class Test{module_name}Basic(unittest.TestCase):
    """Basic functionality tests."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.module = None  # Initialize module
    
    def tearDown(self):
        """Clean up after tests."""
        pass
    
    def test_initialization(self):
        """Test module initialization."""
        # self.assertIsNotNone(self.module)
        pass
    
    def test_basic_operation(self):
        """Test basic operation."""
        # result = self.module.process(input_data)
        # self.assertTrue(result['success'])
        pass


class Test{module_name}EdgeCases(unittest.TestCase):
    """Edge case tests."""
    
    def test_empty_input(self):
        """Test handling of empty input."""
        pass
    
    def test_invalid_input(self):
        """Test handling of invalid input."""
        pass
    
    def test_boundary_values(self):
        """Test boundary value handling."""
        pass


class Test{module_name}Integration(unittest.TestCase):
    """Integration tests."""
    
    def test_with_database(self):
        """Test integration with database."""
        pass
    
    def test_with_other_modules(self):
        """Test integration with other modules."""
        pass


if __name__ == '__main__':
    unittest.main()
'''


# ============================================================================
# SESSION LOG TEMPLATE
# ============================================================================

SESSION_LOG_TEMPLATE = '''# Session Log: {session_id}
## Date: {date}
## Status: IN_PROGRESS

---

## Objectives
- [ ] Objective 1
- [ ] Objective 2
- [ ] Objective 3

---

## Work Completed

### Task 1
- Description
- Files modified: 
- Outcome:

---

## Decisions Made
1. Decision 1 - Rationale

---

## Issues Encountered
- Issue 1 - Resolution

---

## Next Steps
1. Step 1
2. Step 2

---

## Files Created/Modified
| File | Action | Notes |
|------|--------|-------|
| file1.py | Created | Description |

---

## Handoff Notes
For the next session:
- Key context
- Where to resume

---

*Session duration: X minutes*
*Tool calls: X*
'''


# ============================================================================
# GENERATOR FUNCTIONS
# ============================================================================

def generate_skill(name: str, output_path: Optional[Path] = None) -> str:
    """Generate a skill template."""
    # Convert name to various formats
    skill_id = name.lower().replace(" ", "-")
    if not skill_id.startswith("prism-"):
        skill_id = f"prism-{skill_id}"
    
    display_name = name.replace("-", " ").title()
    
    content = SKILL_TEMPLATE.format(
        name=display_name,
        skill_id=skill_id,
        description="Brief description of the skill",
        level="L2",
        category="WORKFLOW",
        triggers='"trigger1", "trigger2"',
        purpose="Describe the purpose of this skill.",
        priority="MEDIUM",
        date=datetime.now().strftime("%Y-%m-%d")
    )
    
    if output_path is None:
        output_path = SKILLS_PATH / f"{skill_id}.md"
    
    return content, output_path


def generate_module(name: str, output_path: Optional[Path] = None) -> str:
    """Generate a module template."""
    # Convert name to various formats
    class_name = name.replace("-", "_").replace(" ", "_")
    if not class_name.startswith("PRISM_"):
        class_name = f"PRISM_{class_name.upper()}"
    
    module_id = class_name
    type_name = name.replace("-", "").replace(" ", "").replace("_", "")
    
    content = MODULE_TEMPLATE.format(
        module_name=name,
        module_id=module_id,
        class_name=class_name,
        type_name=type_name,
        description="Module description",
        date=datetime.now().strftime("%Y-%m-%d")
    )
    
    if output_path is None:
        output_path = EXTRACTED_PATH / "modules" / f"{class_name}.js"
    
    return content, output_path


def generate_database(name: str, output_path: Optional[Path] = None) -> str:
    """Generate a database template."""
    db_id = f"PRISM_{name.upper().replace('-', '_')}_DATABASE"
    id_field = f"{name.lower()}_id"
    
    content = DATABASE_TEMPLATE.format(
        db_id=db_id,
        name=name.title(),
        description=f"PRISM {name.title()} Database",
        id_field=id_field,
        date=datetime.now().isoformat()
    )
    
    if output_path is None:
        output_path = PRISM_ROOT / "data" / "databases" / f"{db_id}.json"
    
    return content, output_path


def generate_test(name: str, output_path: Optional[Path] = None) -> str:
    """Generate a test template."""
    module_name = name.replace("-", "_").replace(" ", "_")
    
    content = TEST_TEMPLATE.format(
        module_name=module_name,
        module_lower=module_name.lower(),
        test_file=f"test_{module_name.lower()}.py"
    )
    
    if output_path is None:
        output_path = PRISM_ROOT / "scripts" / "testing" / f"test_{module_name.lower()}.py"
    
    return content, output_path


def generate_session(session_id: str = None, output_path: Optional[Path] = None) -> str:
    """Generate a session log template."""
    if session_id is None:
        session_id = datetime.now().strftime("%Y%m%d_%H%M")
    
    content = SESSION_LOG_TEMPLATE.format(
        session_id=session_id,
        date=datetime.now().strftime("%Y-%m-%d %H:%M")
    )
    
    if output_path is None:
        output_path = PRISM_ROOT / "state" / "logs" / f"session_{session_id}.md"
    
    return content, output_path


# ============================================================================
# MAIN
# ============================================================================

GENERATORS = {
    "skill": generate_skill,
    "module": generate_module,
    "database": generate_database,
    "db": generate_database,
    "test": generate_test,
    "session": generate_session,
    "log": generate_session
}


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate PRISM templates")
    parser.add_argument("type", choices=GENERATORS.keys(), help="Template type")
    parser.add_argument("name", help="Name for the generated artifact")
    parser.add_argument("--output", "-o", help="Output file path")
    parser.add_argument("--print", "-p", action="store_true", help="Print to stdout only")
    parser.add_argument("--force", "-f", action="store_true", help="Overwrite existing files")
    
    args = parser.parse_args()
    
    generator = GENERATORS[args.type]
    output_path = Path(args.output) if args.output else None
    
    content, default_path = generator(args.name, output_path)
    output_path = output_path or default_path
    
    if args.print:
        print(content)
        return
    
    # Check if file exists
    if output_path.exists() and not args.force:
        print(f"âŒ File already exists: {output_path}")
        print("   Use --force to overwrite")
        sys.exit(1)
    
    # Ensure directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Write file
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"âœ“ Generated {args.type}: {output_path}")


if __name__ == "__main__":
    main()

