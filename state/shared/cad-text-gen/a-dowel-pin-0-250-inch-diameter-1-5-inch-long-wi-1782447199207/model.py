import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches
diameter_in = 0.250
length_in = 1.5
chamfer_in = 0.02

# Convert dimensions to millimeters
diameter_mm = diameter_in * IN
length_mm = length_in * IN
chamfer_mm = chamfer_in * IN

# Chamfer undersize for sinker-EDM electrode (0.003 inch total spark gap)
undersize_mm = 0.003 * IN / 2
diameter_undersized_mm = diameter_mm - 2 * undersize_mm

# Create the dowel pin with chamfers
result = (
    cq.Workplane("XY")
    .circle(diameter_undersized_mm / 2)
    .extrude(length_mm)
    .edges("|Z").chamfer(chamfer_mm)
)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)