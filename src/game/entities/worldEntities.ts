import type { Sprite } from "pixi.js";

export type ResourceType = "wood" | "ore";

export type ResourceEntity = {
  sprite: Sprite;
  type: ResourceType;
  amount: number;
};

export type WolfEntity = {
  sprite: Sprite;
};
