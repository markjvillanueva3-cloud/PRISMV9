import cadquery as cq
from cadquery import exporters
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in inches, converted to mm
cube_size_in_mm = 1.0 * IN
hole_diameter_in_mm = 0.25 * IN

# Sinker-EDM spark gap offset (0.003 inch total, 0.0015 inch per side)
spark_gap_offset = 0.0015 * IN

# Create the cube
result = cq.Workplane("XY") \
    .rect(cube_size_in_mm, cube_size_in_mm) \
    .extrude(cube_size_in_mm)

# Create the hole with spark gap offset
hole_diameter_with_gap = hole_diameter_in_mm - 2 * spark_gap_offset

# Add the through hole centered on the top face
result = result.faces(">Z").workplane() \
    .hole(hole_diameter_with_gap, depth=None)

# Export the result as a STEP file
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)