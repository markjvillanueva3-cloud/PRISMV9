import cadquery as cq

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in inches
outer_diameter_in = 1.0
bore_diameter_in = 0.5
length_in = 1.25

# Convert dimensions to millimeters
outer_diameter_mm = outer_diameter_in * IN
bore_diameter_mm = bore_diameter_in * IN
length_mm = length_in * IN

# Sinker-EDM undersize for burning surfaces (0.003 inch total spark gap)
undersize_mm = 0.003 * IN

# Create the bushing
result = (
    cq.Workplane("XY")
    .circle(outer_diameter_mm / 2 - undersize_mm / 2)
    .extrude(length_mm)
    .faces(">Z").workplane()
    .circle(bore_diameter_mm / 2 + undersize_mm / 2)
    .cutThruAll()
)

# Export the result as a STEP file
import os

output_step = os.getenv('OUTPUT_STEP', 'out.step')
result.exportStep(output_step)