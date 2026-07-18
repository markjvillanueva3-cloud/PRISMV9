import cadquery as cq
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in inches, converted to mm
plate_length = 2 * IN
plate_width = 2 * IN
plate_height = 0.5 * IN
hole_diameter = 0.25 * IN
counterbore_diameter = 0.5 * IN
counterbore_depth = 0.25 * IN

# Spark gap for sinker-EDM electrode (undersize by 0.003 inch total)
spark_gap_total = 0.003 * IN
spark_gap_per_side = spark_gap_total / 2
effective_hole_diameter = hole_diameter - spark_gap_total
effective_counterbore_diameter = counterbore_diameter - spark_gap_total

# Create the plate
result = (cq.Workplane("XY")
          .rect(plate_length, plate_width)
          .extrude(plate_height))

# Create and cut the through hole with counterbore
hole_and_counterbore = (cq.Workplane("XY", origin=(0, 0, plate_height))
                        .circle(effective_hole_diameter / 2)
                        .extrude(-counterbore_depth + spark_gap_per_side)  # Start from top face and go down
                        .faces("<Z")
                        .workplane()
                        .circle(effective_counterbore_diameter / 2)
                        .extrude(-(plate_height - counterbore_depth)))

result = result.cut(hole_and_counterbore)

# Export the result as STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)