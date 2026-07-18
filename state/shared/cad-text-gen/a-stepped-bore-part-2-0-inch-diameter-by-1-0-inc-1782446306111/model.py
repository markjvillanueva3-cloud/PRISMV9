import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # total spark gap for EDM electrode

# Dimensions in inches, converted to mm
part_diameter = 2.0 * IN
part_height = 1.0 * IN
bore_diameter_large = 1.0 * IN - SPARK_GAP
bore_depth_large = 0.6 * IN
bore_diameter_small = 0.5 * IN - SPARK_GAP
bore_depth_small = part_height - bore_depth_large

# Create the main cylinder
result = (cq.Workplane("XY")
          .circle(part_diameter / 2)
          .extrude(part_height))

# Create and cut the stepped bore
bore_large = (cq.Workplane("XY", origin=(0, 0, part_height - bore_depth_large))
              .circle(bore_diameter_large / 2)
              .extrude(-bore_depth_large))

bore_small = (cq.Workplane("XY", origin=(0, 0, part_height - bore_depth_large - bore_depth_small))
              .circle(bore_diameter_small / 2)
              .extrude(-bore_depth_small))

result = result.cut(bore_large).cut(bore_small)

# Export the result to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)