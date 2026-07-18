import cadquery as cq
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in inches, converted to millimeters
diameter = 1.5 * IN
height = 2.0 * IN

# Sinker-EDM spark gap (total 0.003 inch, undersize by 0.0015 inch per side)
spark_gap_per_side = 0.0015 * IN
effective_diameter = diameter - 2 * spark_gap_per_side

# Create the cylinder
result = (cq.Workplane("XY")
          .circle(effective_diameter / 2)
          .extrude(height))

# Export the result as a STEP file
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)