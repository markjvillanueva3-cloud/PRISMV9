import cadquery as cq
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches, converted to mm
length = 3 * IN
width = 2 * IN
thickness = 0.75 * IN
hole_diameter = 0.375 * IN
counterbore_diameter = 0.625 * IN
counterbore_depth = 0.3 * IN

# Spark gap for sinker-EDM electrode
spark_gap = 0.003 * IN

# Adjusted dimensions for EDM
adjusted_hole_diameter = hole_diameter - spark_gap
adjusted_counterbore_diameter = counterbore_diameter - spark_gap

# Create the plate
result = (cq.Workplane("XY")
          .rect(length, width)
          .extrude(thickness))

# Create the through hole with counterbore
hole = (cq.Workplane("XY", origin=(0, 0, thickness))
        .circle(adjusted_counterbore_diameter / 2)
        .extrude(-counterbore_depth + thickness)
        .cut(cq.Workplane("XY", origin=(0, 0, thickness))
             .circle(adjusted_hole_diameter / 2)
             .extrude(-thickness)))

# Combine the plate with the hole
result = result.cut(hole)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)