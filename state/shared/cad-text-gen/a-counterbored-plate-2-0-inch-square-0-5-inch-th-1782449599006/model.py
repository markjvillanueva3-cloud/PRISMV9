import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches, converted to mm
plate_size = 2.0 * IN
plate_thickness = 0.5 * IN
hole_diameter = 0.25 * IN
counterbore_diameter = 0.5 * IN
counterbore_depth = 0.2 * IN

# Sinker EDM undersize (0.003 inch total spark gap)
undersize = 0.003 * IN

# Create the plate
result = (
    cq.Workplane("XY")
    .rect(plate_size, plate_size)
    .extrude(plate_thickness)
)

# Create the through hole with counterbore
hole = (
    cq.Workplane("XY", origin=(0, 0, plate_thickness - counterbore_depth))
    .circle((hole_diameter / 2) - (undersize / 2))
    .extrude(-counterbore_depth)
)

counterbore = (
    cq.Workplane("XY", origin=(0, 0, plate_thickness - counterbore_depth))
    .circle((counterbore_diameter / 2) - (undersize / 2))
    .extrude(-plate_thickness + counterbore_depth)
)

# Cut the hole and counterbore from the plate
result = (
    result
    .cut(hole)
    .cut(counterbore)
)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)