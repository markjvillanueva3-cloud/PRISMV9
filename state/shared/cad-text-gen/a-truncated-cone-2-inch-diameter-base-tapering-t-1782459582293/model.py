import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches, converted to mm
base_diameter_mm = 2 * IN
top_diameter_mm = 1 * IN
height_mm = 1.5 * IN

# Sinker-EDM undersize (0.003 inch total spark gap)
undersize_mm = 0.003 * IN

# Adjusted dimensions for sinker-EDM
base_diameter_adjusted_mm = base_diameter_mm - undersize_mm
top_diameter_adjusted_mm = top_diameter_mm - undersize_mm

# Create the truncated cone
result = (cq.Workplane("XY")
          .circle(base_diameter_adjusted_mm / 2)
          .workplane(offset=height_mm)
          .circle(top_diameter_adjusted_mm / 2)
          .loft(combine=True))

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)