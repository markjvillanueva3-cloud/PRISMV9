import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # Total spark gap for sinker-EDM

# Dimensions in inches, converted to mm
outer_diameter = 25.4 / IN  # 1 inch
bore_diameter = 13.46 / IN  # 0.53 inches
length = 1.55  # inches

# Adjusting for spark gap
burned_outer_diameter = outer_diameter - SPARK_GAP
burned_bore_diameter = bore_diameter + SPARK_GAP

# Create the bushing
result = (cq.Workplane("XY")
          .circle(burned_outer_diameter / 2)
          .extrude(length)
          .faces(">Z").workplane()
          .circle(burned_bore_diameter / 2)
          .cutThruAll())

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)