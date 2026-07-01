import cadquery as cq

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in inches
cube_size_in = 1.0

# Convert dimensions to millimeters
cube_size_mm = cube_size_in * IN

# Create the cube
result = (cq.Workplane("XY")
          .rect(cube_size_mm, cube_size_mm)
          .extrude(cube_size_mm))

# Export the result as a STEP file
import os
output_path = os.getenv('OUTPUT_STEP', 'out.step')
result.exportStep(output_path)