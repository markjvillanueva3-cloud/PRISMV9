import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # Total spark gap for EDM electrode

# Dimensions in inches, converted to mm
diameter_outer = 1.5 * IN
height_total = 0.875 * IN
diameter_bore_top = 0.5 * IN - SPARK_GAP
diameter_bore_bottom = 0.4 * IN - SPARK_GAP
height_step = 0.25 * IN

# Create the outer cylinder
result = (cq.Workplane("XY")
          .circle(diameter_outer / 2)
          .extrude(height_total))

# Create the top bore section
bore_top = (cq.Workplane("XY", origin=(0, 0, height_step))
            .circle(diameter_bore_top / 2)
            .extrude(height_step))

# Create the bottom bore section
bore_bottom = (cq.Workplane("XY", origin=(0, 0, height_step))
               .circle(diameter_bore_bottom / 2)
               .extrude(height_total - height_step))

# Combine bores and cut from outer cylinder
result = result.cut(bore_top.union(bore_bottom))

# Export the result as STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)