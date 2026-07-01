import cadquery as cq

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in inches, converted to mm
length = 6 * IN
width = 4 * IN
thickness = 1.25 * IN
bolt_diameter = 0.375 * IN
bolt_spacing_length = 5 * IN
bolt_spacing_width = 3 * IN
spark_gap = 0.003 * IN

# Create the die plate
result = (cq.Workplane("XY")
          .rect(length, width)
          .extrude(thickness))

# Calculate bolt hole positions with spark gap adjustment
bolt_diameter_adjusted = bolt_diameter - spark_gap

# Add four corner bolt holes
result = (result.faces(">Z").workplane()
          .center(-bolt_spacing_width / 2, -bolt_spacing_length / 2)
          .hole(bolt_diameter_adjusted)
          .center(bolt_spacing_width, 0)
          .hole(bolt_diameter_adjusted)
          .center(0, bolt_spacing_length)
          .hole(bolt_diameter_adjusted)
          .center(-bolt_spacing_width, 0)
          .hole(bolt_diameter_adjusted))

# Export the result to STEP
import os
output_file = os.getenv('OUTPUT_STEP', 'out.step')
result.exportStep(output_file)