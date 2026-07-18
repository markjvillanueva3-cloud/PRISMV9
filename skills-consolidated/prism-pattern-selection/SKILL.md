---
name: prism-pattern-selection
description: Design pattern decision tree for PRISM development — which GoF pattern solves which problem, with manufacturing-specific use cases and anti-pattern warnings
---
# Design Pattern Selection Guide

## When To Use
- Starting a new engine, dispatcher, or module and deciding on architecture
- "Should I use Factory or Builder here?" / "What pattern fits this problem?"
- Code review: checking if the chosen pattern matches the actual problem
- Refactoring: identifying which pattern would clean up existing code
- NOT for: TypeScript implementation details of specific patterns (see PRISM codebase directly)
- NOT for: hook system patterns (use prism-hook-architecture)

## How To Use
Start with your problem, not the pattern. Ask: "What am I trying to solve?"

**CREATING OBJECTS:**
  Single type with variants → Factory Method
    PRISM use: MaterialFactory creates Steel/Aluminum/Titanium from category ID
  Families of related objects → Abstract Factory
    PRISM use: ControllerFactory creates matched G-code + M-code + macro generators per CNC brand
  Complex object step-by-step → Builder
    PRISM use: CuttingParameterBuilder chains .material() .tool() .machine() .operation() .build()
  Single shared instance → Singleton (use sparingly)
    PRISM use: RegistryManager — one instance loads/caches all material/machine/tool data
  Clone existing → Prototype
    PRISM use: cloning a base material config then adjusting for heat treatment variant

**ADAPTING STRUCTURES:**
  Incompatible interface → Adapter
    PRISM use: wrapping Fanuc alarm format to match PRISM's unified AlarmCode interface
  Add behavior dynamically → Decorator
    PRISM use: SafetyDecorator wraps any calculator to add S(x) validation on output
  Simplify complex subsystem → Facade
    PRISM use: each dispatcher IS a facade — one action name hides 3-5 engine calls
  Tree structures → Composite
    PRISM use: toolpath operations — a Program contains Operations which contain Passes
  Control access → Proxy
    PRISM use: CachingProxy wraps database calls, returns cached result if fresh

**MANAGING BEHAVIOR:**
  Multiple interchangeable algorithms → Strategy
    PRISM use: ToolLifeStrategy — switch between Taylor, expanded Taylor, or Colding models
  Notify on changes → Observer
    PRISM use: hook system itself — hooks observe events and react
  Encapsulate requests → Command
    PRISM use: G-code commands — each line is a command object with execute/validate/undo
  State-dependent behavior → State
    PRISM use: CircuitBreaker states — CLOSED/OPEN/HALF_OPEN each behave differently
  Chain of handlers → Chain of Responsibility
    PRISM use: hook priority chain — each hook decides to handle, pass, or block

**ANTI-PATTERNS TO AVOID:**
  God Object: one class does everything → split into focused classes
  Golden Hammer: using Factory for everything → choose pattern for the actual problem
  Pattern Obsession: patterns for patterns' sake → only when they add real value
  Copy-Paste: duplicated logic across dispatchers → extract to shared utility
  Premature generalization: abstracting before 3+ concrete uses → start concrete, extract later

**DECISION CHECKLIST:**
  Have I identified the core problem first (not the pattern)?
  Does the pattern naturally fit, or am I forcing it?
  Will the next developer understand why this pattern was chosen?
  Could a simpler approach work? (If yes, use the simpler one.)

## What It Returns
- The right pattern name for your specific problem
- PRISM-specific use case showing where this pattern already exists in the codebase
- Anti-pattern warnings for common mistakes
- A decision path: problem → pattern → PRISM precedent

## Examples
- Input: "I need to create different calculator objects based on operation type (turning, milling, drilling)"
  Problem: creating objects by type → Factory Method
  PRISM precedent: MaterialFactory pattern — switch on category, return typed instance
  Implementation: CalculatorFactory.create('turning') returns TurningCalculator

- Input: "I want to add safety validation to every calculator without modifying each one"
  Problem: add behavior dynamically → Decorator
  PRISM precedent: SafetyDecorator wraps any ICalculator, checks S(x) on output
  Implementation: `new SafetyDecorator(turningCalc)` — same interface, adds safety check

- Edge case: "I'm not sure if I need Strategy or Factory"
  Factory: creates different OBJECTS (the thing you get back is a different class)
  Strategy: swaps ALGORITHMS (same object, different internal behavior)
  Test: "Am I switching what I create, or how I calculate?"
  Create → Factory. Calculate → Strategy. If both → Factory creates object with Strategy inside.
SOURCE: Split from prism-design-patterns (16.0KB)
RELATED: prism-hook-architecture, prism-error-taxonomy
