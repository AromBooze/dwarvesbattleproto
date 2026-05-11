export type ResourceCost = {
  wood?: number;
  ore?: number;
};

export type UpgradeId =
  | "cartHp"
  | "cartArmor"
  | "cartSpikes"
  | "warriorHp"
  | "warriorDamage"
  | "warriorAttackSpeed"
  | "warriorRegeneration"
  | "hireWarrior"
  | "gathererGathering"
  | "gathererHp"
  | "gathererRegeneration"
  | "hireGatherer";

export type UpgradeDefinition = {
  id: UpgradeId;
  group: "cart" | "warriors" | "gatherers";
  label: string;
  effect: string;
  baseCost: ResourceCost;
  max?: number;
};

export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
  { id: "cartHp", group: "cart", label: "Cart HP", effect: "+1 HP", baseCost: { wood: 2 }, max: 40 },
  { id: "cartArmor", group: "cart", label: "Cart Armor", effect: "+1 armor", baseCost: { ore: 4 }, max: 4 },
  { id: "cartSpikes", group: "cart", label: "Cart Spikes", effect: "+1 spikes DPS", baseCost: { wood: 3, ore: 3 }, max: 5 },
  { id: "warriorHp", group: "warriors", label: "Warrior HP", effect: "+1 HP", baseCost: { ore: 4 } },
  { id: "warriorDamage", group: "warriors", label: "Warrior Damage", effect: "+1 damage", baseCost: { ore: 4 } },
  { id: "warriorAttackSpeed", group: "warriors", label: "Warrior Attack Speed", effect: "+1 attack/sec", baseCost: { ore: 4 } },
  { id: "warriorRegeneration", group: "warriors", label: "Warrior Regeneration", effect: "+1 regen/sec", baseCost: { ore: 6 } },
  { id: "hireWarrior", group: "warriors", label: "Hire Warrior", effect: "+1 warrior", baseCost: { ore: 8 } },
  { id: "gathererGathering", group: "gatherers", label: "Gatherer Gathering", effect: "+1 gather/sec", baseCost: { wood: 4 } },
  { id: "gathererHp", group: "gatherers", label: "Gatherer HP", effect: "+1 HP", baseCost: { wood: 4 } },
  { id: "gathererRegeneration", group: "gatherers", label: "Gatherer Regeneration", effect: "+1 regen/sec", baseCost: { wood: 6 } },
  { id: "hireGatherer", group: "gatherers", label: "Hire Gatherer", effect: "+1 gatherer", baseCost: { wood: 8 } },
];
