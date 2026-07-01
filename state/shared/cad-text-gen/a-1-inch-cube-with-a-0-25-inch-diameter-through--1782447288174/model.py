import cadquery as cq
import os

IN = 25.4

# Dimensions in inches, converted to mm
cube_size_in_mm = 1 * IN
hole_diameter_in_mm = 0.25 * IN
spark_gap_per_side = 0.0015 * IN
undersized_hole_diameter_in_mm = hole_diameter_in_mm - 2 * spark_gap_per_side

# Create the cube and the hole
result = (cq.Workplane("XY")
          .rect(cube_size_in_mm, cube_size_in_mm)
          .extrude(cube_size_in_mm)
          .faces(">Z").workplane()
          .hole(undersized_hole_diameter_in_mm))

# Export the result to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)