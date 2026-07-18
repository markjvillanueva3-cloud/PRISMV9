import cadquery as cq
import os

# Conversion constant
IN = 25.4

# Dimensions in inches, converted to mm
diameter = 2 * IN
height = 0.5 * IN

# Sinker-EDM spark gap (0.003 inch total, 0.0015 per side)
spark_gap = 0.003 * IN / 2

# Create the cylinder with undersized dimensions for sinker-EDM
result = (cq.Workplane("XY")
          .circle((diameter - spark_gap) / 2)
          .extrude(height))

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)