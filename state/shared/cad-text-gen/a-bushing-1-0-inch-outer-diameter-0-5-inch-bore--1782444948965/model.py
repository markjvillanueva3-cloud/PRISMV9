import cadquery as cq

# Constants for unit conversion
IN = 25.4

# Dimensions in inches, converted to mm
outer_diameter = 1.0 * IN
bore_diameter = 0.5 * IN
length = 1.25 * IN

# Sinker-EDM undersize (0.003 inch total spark gap)
spark_gap_total = 0.003 * IN
spark_gap_per_side = spark_gap_total / 2

# Adjusted dimensions for EDM
outer_diameter_edm = outer_diameter - 2 * spark_gap_per_side
bore_diameter_edm = bore_diameter + 2 * spark_gap_per_side

# Create the bushing
result = (cq.Workplane("XY")
          .circle(outer_diameter_edm / 2)
          .extrude(length)
          .faces(">Z").workplane()
          .circle(bore_diameter_edm / 2)
          .cutThruAll())

# Export to STEP file
import os
output_step = os.getenv('OUTPUT_STEP', 'out.step')
result.exportStep(output_step)