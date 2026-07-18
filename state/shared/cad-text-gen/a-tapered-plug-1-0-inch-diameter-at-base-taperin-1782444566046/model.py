import cadquery as cq

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches, converted to mm
base_diameter_mm = 1.0 * IN
tip_diameter_mm = 0.5 * IN
length_mm = 1.5 * IN

# Tapered plug creation
result = (cq.Workplane("XY")
          .circle(base_diameter_mm / 2)
          .workplane(offset=length_mm)
          .circle(tip_diameter_mm / 2)
          .loft(combine=True))

# Export to STEP
import os
output_path = os.getenv('OUTPUT_STEP', 'out.step')
result.exportStep(output_path)