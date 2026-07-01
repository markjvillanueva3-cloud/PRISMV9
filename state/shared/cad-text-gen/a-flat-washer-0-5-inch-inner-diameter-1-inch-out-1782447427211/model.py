import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch conversion factor

# Dimensions in inches
inner_diameter_in = 0.5
outer_diameter_in = 1.0
thickness_in = 0.0625

# Convert dimensions to millimeters
inner_diameter_mm = inner_diameter_in * IN
outer_diameter_mm = outer_diameter_in * IN
thickness_mm = thickness_in * IN

# Sinker EDM undersize (0.003 inch total spark gap)
undersize_mm = 0.003 * IN / 2

# Create the washer shape
result = (
    cq.Workplane("XY")
    .circle((outer_diameter_mm - undersize_mm) / 2)
    .cut(
        cq.Workplane("XY").circle((inner_diameter_mm + undersize_mm) / 2).extrude(thickness_mm)
    )
    .extrude(thickness_mm)
)

# Export the result to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)