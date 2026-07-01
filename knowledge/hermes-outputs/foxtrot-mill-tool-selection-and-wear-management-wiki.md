# Tool Selection and Wear Management (FOXTROT)

**Galaxy:** FOXTROT (Mill)
**Status:** Core Strategy - Master Level

## Description
Proper tool selection and wear management are critical for cost, quality, and predictability in milling operations.

## Key Considerations
- Tool material and coating selection based on workpiece material and operation
- Wear monitoring (flank wear, crater wear, chipping)
- Tool life prediction and replacement strategies
- Cost per part optimization

## PRISM Implementation
- ToolRegistry + wear models in SpeedFeedOrchestratorEngine
- Dynamic parameter adjustment based on estimated wear

## JM Die Notes
- Tool life prediction is now within 15% of actual on most P-material jobs
- Rule: Track actual vs. predicted tool life and feed data back into OSCAR

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)