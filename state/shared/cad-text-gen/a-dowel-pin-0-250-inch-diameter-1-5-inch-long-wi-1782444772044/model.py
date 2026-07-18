import cadquery as cq

# Constants for unit conversion
IN = 25.4

# Dimensions in inches
diameter_in = 0.250
length_in = 1.5
chamfer_length_in = 0.02

# Convert dimensions to millimeters
diameter_mm = diameter_in * IN
length_mm = length_in * IN
chamfer_length_mm = chamfer_length_in * IN

# Chamfer undersize for sinker-EDM electrode (0.003 total spark gap)
undersize_mm = 2 * 0.0015 * IN

# Create the dowel pin with chamfers
result = (
    cq.Workplane("XY")
    .circle((diameter_mm - undersize_mm) / 2)
    .extrude(length_mm)
    .chamfer(chamfer_length_mm - undersize_mm, select=">>Z")
    .chamfer(chamfer_length_mm - undersize_mm, select="<<Z")
)

# Export the result to STEP
import os

output_step = os.getenv('OUTPUT_STEP', 'out.step')
result.exportStep(output_step)