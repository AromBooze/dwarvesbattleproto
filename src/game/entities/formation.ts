export type FormationSlot = {
  sprite: "warrior" | "gatherer";
  xOffset: number;
  yOffset: number;
};

export const warriorFormation: FormationSlot[] = [
  { sprite: "warrior", xOffset: 92, yOffset: -36 },
  { sprite: "warrior", xOffset: 128, yOffset: -18 },
  { sprite: "warrior", xOffset: 108, yOffset: 16 },
  { sprite: "warrior", xOffset: 146, yOffset: 34 },
  { sprite: "warrior", xOffset: 76, yOffset: 38 },
];

export const gathererFormation: FormationSlot[] = [
  { sprite: "gatherer", xOffset: -88, yOffset: -18 },
  { sprite: "gatherer", xOffset: -112, yOffset: 28 },
];
