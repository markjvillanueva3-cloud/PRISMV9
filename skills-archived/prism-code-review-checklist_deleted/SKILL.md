---
name: prism-code-review-checklist
description: 25-point code quality checklist to run on any TypeScript file before committing — catches SRP violations, fat interfaces, concrete dependencies, and 7 anti-patterns
---
# Code Review Checklist

## When To Use
- Before committing any new or modified TypeScript file
- During prism_sp review_quality phase on code artifacts
- "Is this code ready to ship?" / "Review this engine for quality"
- When writing a new dispatcher, engine, or utility module
- NOT for: learning SOLID principles (use prism-solid-principles reference)
- NOT for: reviewing documents or skills (use prism-anti-regression-checklists)

## How To Use
Run all 25 checks against the file under review. Score each PASS/FAIL.

**SRP — Single Responsibility (5 checks):**
  1. Can the class be described without "and"? (MaterialValidator, not MaterialValidatorAndLoader)
  2. Class has < 300 lines?
  3. Constructor has < 5 dependencies?
  4. All methods relate to the same domain concept?
  5. Only one reason would cause this class to change?

**OCP — Open/Closed (5 checks):**
  6. New features added via extension (new class), not modification (editing existing)?
  7. No switch/if-else chains on type strings? (use strategy pattern instead)
  8. Extension points defined as interfaces?
  9. Algorithm selection via strategy, not conditionals?
  10. Plugin architecture where 3+ variants exist?

**LSP — Liskov Substitution (5 checks):**
  11. Subtypes honor base class contracts? (no surprise throws)
  12. No strengthened preconditions in subtypes? (subtype can't be MORE restrictive)
  13. No weakened postconditions? (subtype must deliver AT LEAST what base promises)
  14. Invariants preserved across inheritance hierarchy?
  15. Tests pass when any subtype is substituted?

**ISP — Interface Segregation (5 checks):**
  16. Interfaces have 1-6 methods? (not fat god-interfaces)
  17. No class forced to implement methods it doesn't use?
  18. Interfaces named by role (Calculable, Validatable), not implementation?
  19. Composition of small interfaces preferred over one large?
  20. Each consumer depends only on the interface it actually calls?

**DIP — Dependency Inversion (5 checks):**
  21. High-level modules depend on abstractions, not concrete classes?
  22. Interfaces defined at the high-level module, not the low-level?
  23. All dependencies explicit in constructor (no hidden `new` inside methods)?
  24. Composition root (where dependencies are wired) is separate from business logic?
  25. Testable with mocks? (can swap any dependency for a test double)

**ANTI-PATTERN SCAN** (run after checklist — instant disqualifiers):
  God Class: one class doing validation + calculation + DB + notification → FAIL, split immediately
  Rigid Hierarchy: base class with switch on type string → FAIL, use strategy pattern
  Fat Interface: interface with 10+ methods → FAIL, split into role-based interfaces
  Concrete Dependency: `new MySQLDatabase()` inside business logic → FAIL, inject via constructor
  Leaky Abstraction: interface method that exposes implementation (`findBySQL`) → FAIL, abstract it
  Anemic Domain: classes that are just data bags with no behavior → WARN, add domain methods

**VERDICT:**
  25/25 + no anti-patterns: SHIP IT
  20-24 + no critical anti-patterns: SHIP with TODOs for missed checks
  < 20 or any critical anti-pattern (God Class, Concrete Dep): FIX BEFORE SHIPPING

## What It Returns
- Score: N/25 checks passed
- Anti-pattern scan: list of detected violations with specific line references
- Verdict: SHIP / SHIP+TODO / FIX
- For each failure: which check failed, what to change, and the correct pattern to use

## Examples
- Input: "Review new ToolLifeEngine.ts — 180 lines, 3 constructor deps, implements ICalculator"
  SRP: 5/5 (single concept, small, few deps)
  OCP: 4/5 (missing: no strategy for algorithm variant selection)
  LSP: 5/5 (honors ICalculator contract)
  ISP: 5/5 (ICalculator has 3 methods)
  DIP: 5/5 (all deps injected)
  Anti-patterns: none detected
  Score: 24/25. Verdict: SHIP with TODO for algorithm strategy point.

- Input: "Review PRISMDispatcher.ts — 600 lines, validates + calculates + writes DB + sends alerts"
  SRP: 0/5 (God Class — does everything, 600 lines, describes as 'validates AND calculates AND...')
  Anti-pattern: GOD CLASS detected → instant FIX verdict
  Action: split into ValidationService, CalculationEngine, DatabaseWriter, AlertService

- Edge case: "Review a 50-line utility function (not a class)"
  Checklist still applies but some checks are N/A (no constructor, no inheritance).
  Focus on: single purpose (SRP), no concrete deps (DIP), testable with mocks.
  Score out of applicable checks only. Small utilities often score 100%.
SOURCE: Split from prism-solid-principles (30KB)
RELATED: prism-anti-regression-checklists
