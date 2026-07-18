import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch conversion factor

# Dimensions in inches
outer_square_side = 2.0
wall_thickness = 0.375
length = 4.0

# Convert dimensions to millimeters
outer_square_side_mm = outer_square_side * IN
inner_square_side_mm = (outer_square_side - 2 * wall_thickness) * IN
length_mm = length * IN

# Sinker-EDM undersize for burning surfaces
burning_undersize = 0.003 * IN

# Create the outer square tube
result = (cq.Workplane("XY")
          .rect(outer_square_side_mm, outer_square_side_mm)
          .extrude(length_mm))

# Create the inner square to cut out
inner_square = (cq.Workplane("XY")
                .rect(inner_square_side_mm - burning_undersize, inner_square_side_mm - burning_undersize)
                .extrude(length_mm))

# Cut out the inner square to create the tube
result = result.cut(inner_square)

# Export the result as STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)