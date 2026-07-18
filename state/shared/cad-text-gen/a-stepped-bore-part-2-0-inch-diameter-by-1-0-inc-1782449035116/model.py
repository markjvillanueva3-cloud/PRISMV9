import cadquery as cq
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # Total spark gap for EDM electrode

# Dimensions in inches, converted to mm
part_diameter = 2.0 * IN
part_height = 1.0 * IN
bore_diameter_large = 1.0 * IN - SPARK_GAP
bore_depth_large = 0.6 * IN
bore_diameter_small = 0.5 * IN - SPARK_GAP
bore_depth_small = part_height - bore_depth_large

# Create the part
result = (cq.Workplane("XY")
          .circle(part_diameter / 2)
          .extrude(part_height)
          .faces(">Z").workplane()
          .circle(bore_diameter_large / 2)
          .cutThruAll()
          .faces("<Z").workplane(offset=bore_depth_large)
          .circle(bore_diameter_small / 2)
          .cutBlind(bore_depth_small))

# Export the result to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)