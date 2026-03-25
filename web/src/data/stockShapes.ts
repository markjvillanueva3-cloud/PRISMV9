export interface DimensionField {
  key: string;
  label: string;
  unit: string;
  defaultMm: number;
  min: number;
  step: number;
}

export interface StockShape {
  id: string;
  label: string;
  icon: string;
  fields: DimensionField[];
}

export const STOCK_SHAPES: StockShape[] = [
  {
    id: "plate",
    label: "Plate",
    icon: "▭",
    fields: [
      { key: "length", label: "Length (X)", unit: "mm", defaultMm: 152.4, min: 1, step: 1 },
      { key: "width", label: "Width (Y)", unit: "mm", defaultMm: 101.6, min: 1, step: 1 },
      { key: "height", label: "Height (Z)", unit: "mm", defaultMm: 50.8, min: 1, step: 0.5 },
    ],
  },
  {
    id: "square",
    label: "Square",
    icon: "◻",
    fields: [
      { key: "side", label: "Side (A)", unit: "mm", defaultMm: 50.8, min: 1, step: 1 },
      { key: "length", label: "Length", unit: "mm", defaultMm: 152.4, min: 1, step: 1 },
    ],
  },
  {
    id: "round",
    label: "Round",
    icon: "○",
    fields: [
      { key: "diameter", label: "Diameter", unit: "mm", defaultMm: 50.8, min: 1, step: 0.5 },
      { key: "length", label: "Length", unit: "mm", defaultMm: 152.4, min: 1, step: 1 },
    ],
  },
  {
    id: "hex",
    label: "Hex",
    icon: "⬡",
    fields: [
      { key: "flat_to_flat", label: "Flat-to-Flat", unit: "mm", defaultMm: 38.1, min: 1, step: 0.5 },
      { key: "length", label: "Length", unit: "mm", defaultMm: 152.4, min: 1, step: 1 },
    ],
  },
  {
    id: "tube",
    label: "Tube",
    icon: "◎",
    fields: [
      { key: "od", label: "Outer Diameter", unit: "mm", defaultMm: 50.8, min: 1, step: 0.5 },
      { key: "wall", label: "Wall Thickness", unit: "mm", defaultMm: 2.54, min: 0.1, step: 0.1 },
      { key: "length", label: "Length", unit: "mm", defaultMm: 152.4, min: 1, step: 1 },
    ],
  },
  {
    id: "flat",
    label: "Flat Bar",
    icon: "▬",
    fields: [
      { key: "width", label: "Width", unit: "mm", defaultMm: 76.2, min: 1, step: 1 },
      { key: "thickness", label: "Thickness", unit: "mm", defaultMm: 12.7, min: 0.5, step: 0.5 },
      { key: "length", label: "Length", unit: "mm", defaultMm: 152.4, min: 1, step: 1 },
    ],
  },
  {
    id: "angle",
    label: "Angle",
    icon: "∟",
    fields: [
      { key: "leg1", label: "Leg 1", unit: "mm", defaultMm: 50.8, min: 1, step: 1 },
      { key: "leg2", label: "Leg 2", unit: "mm", defaultMm: 50.8, min: 1, step: 1 },
      { key: "thickness", label: "Thickness", unit: "mm", defaultMm: 6.35, min: 0.5, step: 0.5 },
      { key: "length", label: "Length", unit: "mm", defaultMm: 152.4, min: 1, step: 1 },
    ],
  },
];

export function getShapesForMode(modeShapeIds: string[]): StockShape[] {
  return STOCK_SHAPES.filter((s) => modeShapeIds.includes(s.id));
}
