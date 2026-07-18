import cadquery as cq
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in inches
leg_length_in = 2.0
leg_width_in = 1.5
thickness_in = 0.25
hole_diameter_in = 0.25
spark_gap_per_side_in = 0.0015
total_spark_gap_in = spark_gap_per_side_in * 2

# Convert dimensions to millimeters
leg_length = leg_length_in * IN
leg_width = leg_width_in * IN
thickness = thickness_in * IN
hole_diameter = hole_diameter_in * IN - total_spark_gap_in

# Create the L-bracket
result = (cq.Workplane("XY")
          .rect(leg_length, leg_width)
          .extrude(thickness)
          .faces(">Z").workplane()
          .center(-leg_length / 2 + hole_diameter / 2, -leg_width / 2 + hole_diameter / 2)
          .hole(hole_diameter)
          .center(leg_length - hole_diameter, 0)
          .hole(hole_diameter)
          .workplane(offset=-thickness)
          .rect(leg_width, leg_length)
          .extrude(thickness)
          .faces(">Z").workplane()
          .center(-leg_width / 2 + hole_diameter / 2, -leg_length / 2 + hole_diameter / 2)
          .hole(hole_diameter)
          .center(leg_width - hole_diameter, 0)
          .hole(hole_diameter))

# Export the result to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)