import cadquery as cq
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # Total spark gap for EDM electrode

# Dimensions in inches, converted to mm
base_diameter = 2.5 * IN
base_thickness = 0.5 * IN
boss_diameter = 1.25 * IN
boss_height = 0.625 * IN

# Adjust dimensions for EDM spark gap
boss_diameter -= SPARK_GAP

# Create the base of the disc
result = (cq.Workplane("XY")
          .circle(base_diameter / 2)
          .extrude(base_thickness))

# Create the boss on top of the disc
boss = (cq.Workplane("XY", origin=(0, 0, base_thickness))
        .circle(boss_diameter / 2)
        .extrude(boss_height))

# Combine the base and the boss
result = result.union(boss)

# Export to STEP file
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)