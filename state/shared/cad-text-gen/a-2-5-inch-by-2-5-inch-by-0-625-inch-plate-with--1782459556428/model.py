import cadquery as cq
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in inches, converted to mm
plate_length = 2.5 * IN
plate_width = 2.5 * IN
plate_height = 0.625 * IN
hole_diameter = 0.3125 * IN
counterbore_diameter = 0.5625 * IN
counterbore_depth = 0.25 * IN

# Spark gap for sinker-EDM electrode (undersize by 0.003 inch total)
spark_gap = 0.003 * IN / 2
hole_diameter_undersized = hole_diameter - spark_gap * 2
counterbore_diameter_undersized = counterbore_diameter - spark_gap * 2

# Create the plate
result = (cq.Workplane("XY")
          .rect(plate_length, plate_width)
          .extrude(plate_height))

# Create and cut the through hole with counterbore
hole_and_counterbore = (cq.Workplane("XY", origin=(0, 0, plate_height))
                        .circle(hole_diameter_undersized / 2)
                        .extrude(-counterbore_depth + spark_gap * 2)
                        .faces("<Z")
                        .workplane()
                        .circle(counterbore_diameter_undersized / 2)
                        .extrude(-(plate_height - counterbore_depth)))

result = result.cut(hole_and_counterbore)

# Export the result as a STEP file
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)