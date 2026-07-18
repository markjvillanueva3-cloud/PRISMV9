import cadquery as cq

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # Total spark gap for sinker EDM

# Dimensions in inches, converted to mm
pocket_size_in = 0.5 * IN - SPARK_GAP
pocket_height_in = 1.5 * IN
shank_diameter_in = 0.25 * IN - SPARK_GAP
shank_length_in = 1.0 * IN

# Create the pocket
result = (cq.Workplane("XY")
          .rect(pocket_size_in, pocket_size_in)
          .extrude(-pocket_height_in))

# Create the shank
shank = (cq.Workplane("XY")
         .circle(shank_diameter_in / 2)
         .extrude(shank_length_in))

# Combine the pocket and shank
result = result.union(shank.translate((0, 0, -shank_length_in)))

# Export to STEP
import os
output_path = os.getenv('OUTPUT_STEP', 'out.step')
cq.exporters.export(result, output_path)