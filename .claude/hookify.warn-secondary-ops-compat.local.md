---
name: warn-secondary-ops-compat
enabled: true
event: output
action: warn
conditions:
  - field: content
    operator: regex_match
    pattern: (incompatible|not.compatible|compatibility.*red|material.*warning)
---

**[warn-secondary-ops-compat]**
**Secondary operation material incompatibility detected.**

A secondary operation may be incompatible with the specified material. This can cause:

- Part damage or rejection (e.g., hard anodize on 2024 aluminum - poor adhesion)
- Safety hazards (e.g., certain platings on titanium - hydrogen embrittlement risk)
- Spec non-compliance (e.g., wrong passivation for aerospace stainless)

Before proceeding:

1. **Verify** the operation's material compatibility in the SecondaryOpsEngine catalog
2. **Check spec references** - MIL, ASTM, AMS specs define allowed material/process combinations
3. **Suggest alternatives** - run `sec_ops_recommend` with the material and application to find compatible options
4. **Confirm with customer** if they specified the exact process, flag the incompatibility with a DfM note
