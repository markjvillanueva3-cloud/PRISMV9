# Coating Wear Over Tool Life (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Advanced Topic - Master Level

## Description
As the tool coating wears, the effective specific cutting force increases, requiring parameter adjustment or earlier tool change.

## Model
```
kc_effective = kc_base · (1 + k_coating_wear · (VB / VB_max))
```

Where:
- VB = current wear land width
- VB_max = maximum acceptable wear land

## PRISM Implementation
- Tool wear monitoring via force trend analysis in SpeedFeedOrchestratorEngine
- Dynamic parameter adjustment or tool change recommendation

## Edge Cases
- Coating failure can cause sudden 15–25% increase in kc
- High-speed applications are more sensitive to coating wear

## JM Die Notes
- Coating wear is now one of the triggers for dynamic feed reduction in long roughing operations
- Rule: Reduce feed 10% when estimated coating wear exceeds 60%

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)