import cadquery as cq

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in inches
length_in = 1.0
width_in = 0.5
height_in = 0.25

# Convert dimensions to millimeters
length_mm = length_in * IN
width_mm = width_in * IN
height_mm = height_in * IN

# Spark gap for sinker-EDM electrode (0.003 inch total, 0.0015 per side)
spark_gap_per_side = 0.0015 * IN

# Undersize the dimensions by the spark gap
length_undersized_mm = length_mm - 2 * spark_gap_per_side
width_undersized_mm = width_mm - 2 * spark_gap_per_side
height_undersized_mm = height_mm - 2 * spark_gap_per_side

# Create the gauge block shape
result = (cq.Workplane("XY")
          .rect(length_undersized_mm, width_undersized_mm)
          .extrude(height_undersized_mm))

# Export to STEP file
import os
output_step_path = os.getenv('OUTPUT_STEP', 'out.step')
cq.exporters.export(result, output_step_path)