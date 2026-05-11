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
  phase: "running" | "upgrade" | "gameOver";
  wood: number;
  ore: number;
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
  wood: 0,
  ore: 0,
  cart: {
    hp: 20,
    maxHp: 20,
    armor: 0,
    spikes: 0,
  },
  warriors: {
    count: 5,
    hp: 5,
    damage: 2,
    attackSpeed: 2,
    regeneration: 0,
  },
  gatherers: {
    count: 2,
    hp: 3,
    gathering: 2,
    regeneration: 0,
  },
  upgrades: [],
};
