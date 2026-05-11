import type { ResourceCost, UpgradeId } from "../../config/balance/upgrades";

export type UpgradeButtonState = {
  id: UpgradeId;
  group: "cart" | "warriors" | "gatherers";
  label: string;
  effect: string;
  cost: ResourceCost;
  disabled: boolean;
  disabledReason: "Недостаточно ресурсов" | "Максимум" | null;
};

export type UpgradeState = {
  phase: "running" | "resurrection" | "upgrade" | "scalingSummary" | "gameOver";
  runNumber: number;
  wood: number;
  ore: number;
  scalingSummary: {
    messages: string[];
    wolfHpBonus: number;
    wolfDamageBonus: number;
    wolfAttackSpeedBonus: number;
  };
  resurrection: {
    deadWarriors: number;
    deadGatherers: number;
    resurrectedWarriors: number;
    resurrectedGatherers: number;
    cost: ResourceCost;
    canResurrectWarrior: boolean;
    canResurrectGatherer: boolean;
    warriorDisabledReason: "Недостаточно ресурсов" | "Некого воскрешать" | null;
    gathererDisabledReason: "Недостаточно ресурсов" | "Некого воскрешать" | null;
  };
  cart: {
    hp: number;
    maxHp: number;
    armor: number;
    spikes: number;
  };
  warriors: {
    count: number;
    hp: number;
    damage: number;
    attackSpeed: number;
    regeneration: number;
  };
  gatherers: {
    count: number;
    hp: number;
    gathering: number;
    regeneration: number;
  };
  upgrades: UpgradeButtonState[];
};

export const defaultUpgradeState: UpgradeState = {
  phase: "running",
  runNumber: 1,
  wood: 0,
  ore: 0,
  scalingSummary: {
    messages: [],
    wolfHpBonus: 0,
    wolfDamageBonus: 0,
    wolfAttackSpeedBonus: 0,
  },
  cart: {
    hp: 20,
    maxHp: 20,
    armor: 0,
    spikes: 0,
  },
  resurrection: {
    deadWarriors: 0,
    deadGatherers: 0,
    resurrectedWarriors: 0,
    resurrectedGatherers: 0,
    cost: { wood: 2, ore: 2 },
    canResurrectWarrior: false,
    canResurrectGatherer: false,
    warriorDisabledReason: "Некого воскрешать",
    gathererDisabledReason: "Некого воскрешать",
  },
  warriors: {
    count: 5,
    hp: 7,
    damage: 2,
    attackSpeed: 2,
    regeneration: 1,
  },
  gatherers: {
    count: 2,
    hp: 3,
    gathering: 2,
    regeneration: 1,
  },
  upgrades: [],
};
