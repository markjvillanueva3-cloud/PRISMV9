import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch
BALL_NOSE_DIAMETER = 0.75 * IN  # inches to mm
PUNCH_LENGTH = 2.0 * IN  # inches to mm
SPARK_GAP = 0.003 * IN  # total spark gap in mm

# Undersize for sinker-EDM electrode
BALL_NOSE_DIAMETER -= SPARK_GAP

# Create the ball-nose punch blank
result = (cq.Workplane("XY")
          .circle(BALL_NOSE_DIAMETER / 2)
          .extrude(PUNCH_LENGTH - BALL_NOSE_DIAMETER / 2)
          .faces("<Z").workplane(centerOption="CenterOfMass", originOffset=-BALL_NOSE_DIAMETER / 2)
          .sphere(BALL_NOSE_DIAMETER / 2, centered=(True, True, False)))

# Export the result as a STEP file
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)