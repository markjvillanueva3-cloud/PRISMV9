import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches, converted to mm
base_diameter_mm = 1.0 * IN
top_diameter_mm = 0.5 * IN
length_mm = 1.5 * IN

# Tapered plug creation
result = (cq.Workplane("XY")
          .circle(base_diameter_mm / 2)
          .workplane(offset=length_mm)
          .circle(top_diameter_mm / 2)
          .loft(combine=True))

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)