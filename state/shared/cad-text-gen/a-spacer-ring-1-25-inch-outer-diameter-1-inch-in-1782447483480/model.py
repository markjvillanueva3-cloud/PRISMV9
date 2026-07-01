import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches
outer_diameter_in = 1.25
inner_diameter_in = 1.0
height_in = 0.5

# Convert dimensions to millimeters
outer_diameter_mm = outer_diameter_in * IN
inner_diameter_mm = inner_diameter_in * IN
height_mm = height_in * IN

# Sinker-EDM undersize (0.003 inch total spark gap)
spark_gap_total_in = 0.003
spark_gap_per_side_in = spark_gap_total_in / 2
spark_gap_per_side_mm = spark_gap_per_side_in * IN

# Adjusted dimensions for EDM
outer_diameter_edm_mm = outer_diameter_mm - 2 * spark_gap_per_side_mm
inner_diameter_edm_mm = inner_diameter_mm + 2 * spark_gap_per_side_mm

# Create the spacer ring
result = (cq.Workplane("XY")
          .circle(outer_diameter_edm_mm / 2)
          .cut(cq.Workplane("XY").circle(inner_diameter_edm_mm / 2))
          .extrude(height_mm))

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)